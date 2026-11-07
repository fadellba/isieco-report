import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promises as fs } from 'node:fs';

const require = createRequire(new URL('../apps/api/package.json', import.meta.url));
const { createClient } = require('@supabase/supabase-js');

const PROJECT_REF = 'mlhbdautaxufubaybzyt';
const SOURCE_BUCKET = 'isieco-private-media';
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://' + PROJECT_REF + '.supabase.co';
const SECRET_KEY = process.env.STAGING_SUPABASE_SECRET_KEY || '';
const RUN_ID = (process.env.GITHUB_RUN_ID || 'manual-' + Date.now()).replace(/[^A-Za-z0-9-]/gu, '-');
const RESTORE_BUCKET = ('restore-check-' + RUN_ID).slice(0, 63);
const BACKUP_DIR = join(process.env.RUNNER_TEMP || tmpdir(), 'isieco-storage-restore-' + RUN_ID);
const PAGE_SIZE = 100;
const MAX_OBJECTS = 5000;
const MAX_DEPTH = 12;
const MAX_OBJECT_BYTES = 10 * 1024 * 1024;

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function safeError(error) {
  const message = error instanceof Error ? error.message : String(error);
  return message
    .replace(/postgres(?:ql)?:\/\/[^\s"']+/giu, '[database URL redacted]')
    .replace(/sb_(?:secret|publishable|anon)_[A-Za-z0-9._-]+/gu, '[Supabase key redacted]')
    .slice(0, 500);
}

async function enumerateObjects(storage) {
  const files = [];

  async function walk(prefix, depth) {
    if (depth > MAX_DEPTH) {
      throw new Error('Storage directory depth exceeds the restore-drill safety limit.');
    }

    for (let offset = 0; ; offset += PAGE_SIZE) {
      const result = await storage.list(prefix, {
        limit: PAGE_SIZE,
        offset,
        sortBy: { column: 'name', order: 'asc' },
      });
      if (result.error) {
        throw new Error('Unable to enumerate source Storage objects: ' + result.error.message);
      }

      const entries = result.data || [];
      for (const entry of entries) {
        const objectPath = prefix ? prefix + '/' + entry.name : entry.name;
        if (entry.id == null) {
          await walk(objectPath, depth + 1);
        } else {
          files.push({
            path: objectPath,
            contentType: entry.metadata?.mimetype || entry.metadata?.contentType || 'application/octet-stream',
          });
          if (files.length > MAX_OBJECTS) {
            throw new Error('Storage restore drill is limited to ' + MAX_OBJECTS + ' objects.');
          }
        }
      }
      if (entries.length < PAGE_SIZE) break;
    }
  }

  await walk('', 0);
  return files.sort((left, right) => left.path.localeCompare(right.path));
}

async function removeObjectPaths(storage, paths) {
  for (let offset = 0; offset < paths.length; offset += 1000) {
    const result = await storage.remove(paths.slice(offset, offset + 1000));
    if (result.error) {
      throw new Error('Unable to remove residual temporary Storage objects: ' + result.error.message);
    }
  }
}

async function cleanupTemporaryBucket(supabase, bucketId) {
  if (!/^restore-check-\d+$/u.test(bucketId)) {
    throw new Error('Refusing to clean a bucket outside the reserved restore-drill namespace.');
  }

  const storage = supabase.storage.from(bucketId);
  const emptied = await supabase.storage.emptyBucket(bucketId);
  if (emptied.error) {
    process.stderr.write('Temporary bucket empty warning: ' + safeError(emptied.error) + '\n');
  }

  let lastDeleteError = null;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const remaining = await enumerateObjects(storage);
    if (remaining.length > 0) {
      await removeObjectPaths(storage, remaining.map((file) => file.path));
    }

    const deleted = await supabase.storage.deleteBucket(bucketId);
    if (!deleted.error) return;
    else {
      lastDeleteError = new Error(deleted.error.message);
      if (!/not empty|bucket.*empty/iu.test(deleted.error.message)) {
        throw new Error('Unable to delete temporary restore bucket: ' + deleted.error.message);
      }
    }

    if (attempt < 4) {
      await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
    }
  }

  throw new Error(
    'Temporary restore bucket cleanup did not converge: ' +
    (lastDeleteError?.message || 'bucket still exists'),
  );
}

async function cleanupStaleRestoreBuckets(supabase) {
  const listed = await supabase.storage.listBuckets();
  if (listed.error) {
    throw new Error('Unable to inspect temporary restore buckets: ' + listed.error.message);
  }

  const stale = (listed.data || []).filter((bucket) => /^restore-check-\d+$/u.test(bucket.id));
  for (const bucket of stale) {
    if (bucket.public !== false) {
      throw new Error('Refusing to clean a restore-drill bucket that is not private.');
    }
    await cleanupTemporaryBucket(supabase, bucket.id);
    process.stdout.write('Cleaned stale private restore-drill bucket ' + bucket.id + '.\n');
  }
}

async function run() {
  if (!SECRET_KEY) throw new Error('Missing staging server-side Supabase key.');
  if (SECRET_KEY.startsWith('sb_') && !SECRET_KEY.startsWith('sb_secret_')) {
    throw new Error('The Storage restore drill requires a server-side secret key.');
  }
  if (!SECRET_KEY.startsWith('sb_secret_')) {
    const parts = SECRET_KEY.split('.');
    if (parts.length !== 3) throw new Error('The Storage key is not a recognized service-role credential.');
    const claims = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    if (claims.role !== 'service_role') throw new Error('The Storage key is not a service-role credential.');
  }

  const sourceUrl = new URL(SUPABASE_URL);
  if (sourceUrl.protocol !== 'https:' || sourceUrl.hostname !== PROJECT_REF + '.supabase.co') {
    throw new Error('Source target is not the approved staging Supabase project.');
  }
  if (!/^[A-Za-z0-9-]{1,63}$/u.test(RESTORE_BUCKET)) {
    throw new Error('Temporary bucket name is invalid.');
  }

  const supabase = createClient(SUPABASE_URL, SECRET_KEY, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
  let temporaryBucketCreated = false;
  let primaryError = null;
  let objectCount = 0;
  let totalBytes = 0;

  try {
    await cleanupStaleRestoreBuckets(supabase);

    const listedBuckets = await supabase.storage.listBuckets();
    if (listedBuckets.error) throw new Error('Unable to inspect Storage buckets: ' + listedBuckets.error.message);
    const sourceBucket = (listedBuckets.data || []).find((bucket) => bucket.id === SOURCE_BUCKET);
    if (!sourceBucket) throw new Error('The approved source Storage bucket does not exist.');
    if (sourceBucket.public !== false) throw new Error('The source Storage bucket must remain private.');

    const files = await enumerateObjects(supabase.storage.from(SOURCE_BUCKET));
    if (files.length === 0) {
      throw new Error('No source Storage objects exist; an actual object restoration cannot be verified.');
    }

    await fs.rm(BACKUP_DIR, { recursive: true, force: true });
    await fs.mkdir(BACKUP_DIR, { recursive: true, mode: 0o700 });
    const manifest = [];

    for (let index = 0; index < files.length; index += 1) {
      const file = files[index];
      const downloaded = await supabase.storage.from(SOURCE_BUCKET).download(file.path);
      if (downloaded.error || !downloaded.data) {
        throw new Error('Unable to download a source object: ' + (downloaded.error?.message || 'empty response'));
      }
      const bytes = Buffer.from(await downloaded.data.arrayBuffer());
      if (bytes.length > MAX_OBJECT_BYTES) {
        throw new Error('A source object exceeds the configured 10 MiB bucket limit.');
      }

      const backupFile = 'object-' + String(index + 1).padStart(5, '0') + '.bin';
      await fs.writeFile(join(BACKUP_DIR, backupFile), bytes, { mode: 0o600 });
      manifest.push({
        path: file.path,
        backupFile,
        contentType: file.contentType,
        bytes: bytes.length,
        sha256: sha256(bytes),
      });
      totalBytes += bytes.length;
    }

    await fs.writeFile(
      join(BACKUP_DIR, 'manifest.json'),
      JSON.stringify({ projectRef: PROJECT_REF, bucket: SOURCE_BUCKET, files: manifest }, null, 2),
      { mode: 0o600 },
    );
    objectCount = manifest.length;

    const created = await supabase.storage.createBucket(RESTORE_BUCKET, {
      public: false,
      fileSizeLimit: MAX_OBJECT_BYTES,
    });
    if (created.error) throw new Error('Unable to create the isolated private restore bucket: ' + created.error.message);
    temporaryBucketCreated = true;

    const verifyBucketList = await supabase.storage.listBuckets();
    if (verifyBucketList.error) throw new Error('Unable to verify temporary restore bucket: ' + verifyBucketList.error.message);
    const verifyBucket = (verifyBucketList.data || []).find((bucket) => bucket.id === RESTORE_BUCKET);
    if (!verifyBucket || verifyBucket.public !== false) {
      throw new Error('The temporary restore bucket is missing or is not private.');
    }

    for (const file of manifest) {
      const bytes = await fs.readFile(join(BACKUP_DIR, file.backupFile));
      if (sha256(bytes) !== file.sha256) throw new Error('A local backup object failed SHA-256 verification.');

      const uploaded = await supabase.storage.from(RESTORE_BUCKET).upload(file.path, bytes, {
        contentType: file.contentType,
        cacheControl: '60',
        upsert: false,
      });
      if (uploaded.error) throw new Error('Unable to upload object into isolated restore bucket: ' + uploaded.error.message);

      const downloaded = await supabase.storage.from(RESTORE_BUCKET).download(file.path);
      if (downloaded.error || !downloaded.data) {
        throw new Error('Unable to read back restored object: ' + (downloaded.error?.message || 'empty response'));
      }
      const restoredBytes = Buffer.from(await downloaded.data.arrayBuffer());
      if (restoredBytes.length !== file.bytes || sha256(restoredBytes) !== file.sha256) {
        throw new Error('A restored object failed byte-count or SHA-256 verification.');
      }
    }
  } catch (error) {
    primaryError = error;
  } finally {
    if (temporaryBucketCreated) {
      try {
        await cleanupTemporaryBucket(supabase, RESTORE_BUCKET);
      } catch (cleanupError) {
        if (!primaryError) primaryError = cleanupError;
        else process.stderr.write('Temporary bucket cleanup warning: ' + safeError(cleanupError) + '\n');
      }
    }
    await fs.rm(BACKUP_DIR, { recursive: true, force: true }).catch(() => undefined);
  }

  if (primaryError) throw primaryError;
  process.stdout.write(
    'STORAGE_RESTORE_DRILL=SUCCESS objects=' + objectCount +
    ' bytes=' + totalBytes + '; isolated private bucket removed.\n',
  );
}

run().catch((error) => {
  process.stderr.write('STORAGE_RESTORE_DRILL=FAILURE: ' + safeError(error) + '\n');
  process.exitCode = 1;
});
