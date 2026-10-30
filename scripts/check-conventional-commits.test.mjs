import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

const checkerPath = new URL('./check-conventional-commits.mjs', import.meta.url);

test('accepts Conventional Commit subjects', () => {
  const directory = mkdtempSync(join(tmpdir(), 'isieco-commits-'));
  const subjectsPath = join(directory, 'subjects.txt');
  writeFileSync(
    subjectsPath,
    ['feat(reports): create report', 'fix(auth): reject expired tokens', 'chore!: remove legacy config'].join('\n'),
  );

  try {
    const result = spawnSync(process.execPath, [checkerPath.pathname, subjectsPath], {
      encoding: 'utf8',
    });
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /Validated 3 Conventional Commit subject\(s\)/u);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('rejects commit subjects without a Conventional Commit type', () => {
  const directory = mkdtempSync(join(tmpdir(), 'isieco-commits-'));
  const subjectsPath = join(directory, 'subjects.txt');
  writeFileSync(subjectsPath, 'initial commit\n');

  try {
    const result = spawnSync(process.execPath, [checkerPath.pathname, subjectsPath], {
      encoding: 'utf8',
    });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Invalid commit subject/u);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
