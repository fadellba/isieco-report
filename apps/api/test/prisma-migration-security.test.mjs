import assert from 'node:assert/strict';
import pg from 'pg';
import test from 'node:test';

const databaseUrl = process.env.TEST_DATABASE_URL;
const { Pool } = pg;

test(
  'Prisma migration history is isolated from Supabase Data API roles',
  { skip: !databaseUrl },
  async () => {
    const pool = new Pool({ connectionString: databaseUrl, max: 1 });

    try {
      const metadata = await pool.query(
        `SELECT relrowsecurity
         FROM pg_class
         WHERE oid = 'public."_prisma_migrations"'::regclass`,
      );

      assert.equal(
        metadata.rowCount,
        1,
        'Prisma must create its migration metadata table.',
      );
      assert.equal(
        metadata.rows[0].relrowsecurity,
        true,
        'Prisma migration metadata must have RLS enabled.',
      );

      const apiRoles = ['anon', 'authenticated', 'service_role'];
      const existingApiRoles = await pool.query(
        'SELECT rolname FROM pg_roles WHERE rolname = ANY($1::text[])',
        [apiRoles],
      );

      if (existingApiRoles.rowCount > 0) {
        const exposedMetadata = await pool.query(
          `SELECT r.rolname, p.privilege_type
           FROM pg_roles r
           CROSS JOIN (VALUES
             ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE'),
             ('TRUNCATE'), ('REFERENCES'), ('TRIGGER')
           ) AS p(privilege_type)
           WHERE r.rolname = ANY($1::text[])
             AND has_table_privilege(
               r.rolname,
               'public."_prisma_migrations"'::regclass,
               p.privilege_type
             )
           ORDER BY r.rolname, p.privilege_type`,
          [existingApiRoles.rows.map((row) => row.rolname)],
        );

        assert.deepEqual(
          exposedMetadata.rows,
          [],
          'Supabase Data API roles must not have direct privileges on Prisma migration metadata.',
        );
      }
    } finally {
      await pool.end();
    }
  },
);
