import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import test from 'node:test';

const databaseUrl = process.env.TEST_DATABASE_URL;
const { Pool } = pg;

test('PostgreSQL enforces MLD v2.13 integrity constraints', { skip: !databaseUrl }, async () => {
  const pool = new Pool({ connectionString: databaseUrl, max: 1 });
  const client = await pool.connect();
  const userId = randomUUID();
  const authUserId = randomUUID();
  const reportId = randomUUID();
  const typeId = randomUUID();
  const publicationId = randomUUID();
  const regionId = randomUUID();
  const teamId = randomUUID();

  async function expectSqlState(statement, values, expectedCode) {
    await client.query('SAVEPOINT invariant_probe');
    try {
      await assert.rejects(
        client.query(statement, values),
        (error) => error && error.code === expectedCode,
      );
    } finally {
      await client.query('ROLLBACK TO SAVEPOINT invariant_probe');
      await client.query('RELEASE SAVEPOINT invariant_probe');
    }
  }

  const expectCheckViolation = (statement, values) =>
    expectSqlState(statement, values, '23514');
  const expectUniqueViolation = (statement, values) =>
    expectSqlState(statement, values, '23505');

  try {
    await client.query('BEGIN');

    await client.query(
      `INSERT INTO utilisateur (id_utilisateur, auth_user_id, nom, email)
       VALUES ($1, $2, 'Integration test', $3)`,
      [userId, authUserId, `db-invariants-${userId}@example.test`],
    );

    const role = await client.query(
      'SELECT id_role FROM role WHERE code_role = $1',
      ['CITOYEN'],
    );
    assert.equal(role.rowCount, 1, 'The baseline migration must seed the CITOYEN role.');

    const roleStart = new Date('2026-10-10T00:00:00.000Z');
    await client.query(
      'INSERT INTO utilisateur_role (id_utilisateur, id_role, date_debut) VALUES ($1, $2, $3)',
      [userId, role.rows[0].id_role, roleStart],
    );
    await expectUniqueViolation(
      'INSERT INTO utilisateur_role (id_utilisateur, id_role, date_debut) VALUES ($1, $2, $3)',
      [userId, role.rows[0].id_role, new Date('2026-10-11T00:00:00.000Z')],
    );

    await expectCheckViolation(
      `INSERT INTO utilisateur_role (id_utilisateur, id_role, date_debut, date_fin)
       VALUES ($1, $2, TIMESTAMP '2026-10-10 00:00:00', TIMESTAMP '2026-10-09 00:00:00')`,
      [userId, role.rows[0].id_role],
    );

    await client.query(
      `INSERT INTO signalement
        (id_signalement, id_utilisateur, statut_signalement)
       VALUES ($1, $2, 'BROUILLON')`,
      [reportId, userId],
    );

    await expectCheckViolation(
      `INSERT INTO signalement
        (id_signalement, id_utilisateur, statut_signalement, latitude, longitude)
       VALUES ($1, $2, 'BROUILLON', 91, 10)`,
      [randomUUID(), userId],
    );

    await expectCheckViolation(
      `INSERT INTO signalement
        (id_signalement, id_utilisateur, statut_signalement, latitude)
       VALUES ($1, $2, 'BROUILLON', 10)`,
      [randomUUID(), userId],
    );

    await client.query(
      `INSERT INTO type_dechet
        (id_type_dechet, code_type, libelle, orientation_specialisee, date_debut_validite)
       VALUES ($1, $2, 'Type de test', false, TIMESTAMP '2026-01-01 00:00:00')`,
      [typeId, `TEST-${typeId}`],
    );

    await expectCheckViolation(
      `INSERT INTO contenu_signalement
        (id_signalement, id_type_dechet, quantite_estimee)
       VALUES ($1, $2, -0.001)`,
      [reportId, typeId],
    );

    await expectCheckViolation(
      `INSERT INTO photo_signalement
        (id_photo_signalement, reference_photo, date_ajout, id_signalement,
         date_expiration, media_stockee_locale, etat_publication, floutage_confirme)
       VALUES ($1, 'private/test.jpg', TIMESTAMP '2026-10-10 00:00:00', $2,
               TIMESTAMP '2026-10-09 00:00:00', false, 'PRIVEE', false)`,
      [randomUUID(), reportId],
    );

    await client.query(
      `INSERT INTO region (id_region, code_region, nom_region, actif)
       VALUES ($1, $2, 'Region integrity test', true)`,
      [regionId, `REG-${regionId}`],
    );
    await client.query(
      `INSERT INTO equipe (id_equipe, nom_equipe, etat_equipe)
       VALUES ($1, 'Team integrity test', 'ACTIVE')`,
      [teamId],
    );

    await expectCheckViolation(
      `INSERT INTO evenement_metier
        (id_evenement, type_evenement, date_enregistrement, origine, version_schema)
       VALUES ($1, 'TEST', CURRENT_TIMESTAMP, 'TEST', 1)`,
      [randomUUID()],
    );

    await client.query(
      `INSERT INTO evenement_metier
        (id_evenement, type_evenement, date_enregistrement, origine, version_schema, id_region_cible)
       VALUES ($1, 'REFERENTIEL_REGION_CREE', CURRENT_TIMESTAMP, 'API', 1, $2)`,
      [randomUUID(), regionId],
    );

    await expectCheckViolation(
      `INSERT INTO evenement_metier
        (id_evenement, type_evenement, date_enregistrement, origine, version_schema,
         id_region_cible, id_equipe_cible)
       VALUES ($1, 'INVALID_MULTI_TARGET', CURRENT_TIMESTAMP, 'TEST', 1, $2, $3)`,
      [randomUUID(), regionId, teamId],
    );

    await client.query(
      `INSERT INTO publication_flux
        (id_publication, cree_par, date_creation, etat_publication)
       VALUES ($1, $2, CURRENT_TIMESTAMP, 'BROUILLON')`,
      [publicationId, userId],
    );

    await expectCheckViolation(
      `INSERT INTO photo_publication
        (id_photo_publication, id_publication, role_photo, date_ajout)
       VALUES ($1, $2, 'AVANT', CURRENT_TIMESTAMP)`,
      [randomUUID(), publicationId],
    );

    const expectedIndexes = [
      'utilisateur_role_one_open_assignment_idx',
      'appartenance_equipe_one_open_membership_idx',
      'competence_equipe_one_open_skill_idx',
      'delegation_decision_equipe_one_open_delegation_idx',
      'rattachement_signalement_one_open_case_idx',
      'affectation_one_open_assignment_idx',
    ];
    const indexes = await client.query(
      'SELECT indexname FROM pg_indexes WHERE schemaname = current_schema() AND indexname = ANY($1::text[])',
      [expectedIndexes],
    );
    assert.deepEqual(
      new Set(indexes.rows.map((row) => row.indexname)),
      new Set(expectedIndexes),
      'All active-period partial unique indexes must be installed.',
    );

    const businessTables = [
      'utilisateur', 'role', 'utilisateur_role', 'preferences_visibilite_citoyen',
      'badge', 'badge_utilisateur', 'historique_points', 'notification',
      'type_dechet', 'equipe', 'appartenance_equipe', 'competence_equipe',
      'region', 'departement', 'commune', 'delegation_decision_equipe',
      'disponibilite_equipe', 'historique_disponibilite_equipe', 'signalement',
      'photo_signalement', 'contenu_signalement', 'demande_complement',
      'reponse_complement', 'qualification_signalement', 'idempotence_signalement',
      'dossier_traitement', 'rattachement_signalement', 'contenu_dossier',
      'provenance_contenu_dossier', 'affectation', 'intervention',
      'photo_intervention', 'verification_resolution', 'historique_localisation_dossier',
      'historique_priorite_dossier', 'evenement_metier', 'publication_flux',
      'photo_publication',
    ];
    const rlsTables = await client.query(
      `SELECT c.relname, c.relrowsecurity
       FROM pg_class c
       JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE n.nspname = 'public'
         AND c.relkind IN ('r', 'p')
         AND c.relname = ANY($1::text[])`,
      [businessTables],
    );
    assert.equal(
      rlsTables.rowCount,
      businessTables.length,
      'All 38 MLD business tables must exist after migrations.',
    );
    assert.ok(
      rlsTables.rows.every((row) => row.relrowsecurity),
      'Row-level security must be enabled on every business table.',
    );

    const apiRoles = ['anon', 'authenticated', 'service_role'];
    const existingApiRoles = await client.query(
      'SELECT rolname FROM pg_roles WHERE rolname = ANY($1::text[])',
      [apiRoles],
    );
    if (existingApiRoles.rowCount > 0) {
      const exposedTables = await client.query(
        `SELECT r.rolname, c.relname, p.privilege_type
         FROM pg_roles r
         CROSS JOIN pg_class c
         JOIN pg_namespace n ON n.oid = c.relnamespace
         CROSS JOIN (VALUES ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE')) AS p(privilege_type)
         WHERE r.rolname = ANY($1::text[])
           AND n.nspname = 'public'
           AND c.relkind IN ('r', 'p')
           AND c.relname = ANY($2::text[])
           AND has_table_privilege(r.rolname, c.oid, p.privilege_type)
         ORDER BY r.rolname, c.relname, p.privilege_type`,
        [existingApiRoles.rows.map((row) => row.rolname), businessTables],
      );
      assert.deepEqual(
        exposedTables.rows,
        [],
        'Supabase Data API roles must not have direct privileges on business tables.',
      );
    }

    const unsafeDefaults = await client.query(
      `SELECT d.defaclobjtype, x.privilege_type,
              CASE WHEN x.grantee = 0 THEN 'PUBLIC' ELSE r.rolname END AS grantee
       FROM pg_default_acl d
       CROSS JOIN LATERAL aclexplode(d.defaclacl) x
       LEFT JOIN pg_roles r ON r.oid = x.grantee
       WHERE d.defaclrole = (SELECT oid FROM pg_roles WHERE rolname = current_user)
         AND d.defaclnamespace = 'public'::regnamespace
         AND (
           r.rolname = ANY($1::text[])
           OR (x.grantee = 0 AND d.defaclobjtype IN ('r', 'S', 'f'))
         )
       ORDER BY d.defaclobjtype, grantee, x.privilege_type`,
      [apiRoles],
    );
    assert.deepEqual(
      unsafeDefaults.rows,
      [],
      'Future public tables, sequences and functions must not inherit API-role or PUBLIC access.',
    );
  } finally {
    await client.query('ROLLBACK');
    client.release();
    await pool.end();
  }
});
