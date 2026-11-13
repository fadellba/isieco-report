import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import test from 'node:test';

const databaseUrl = process.env.TEST_DATABASE_URL;
const { Pool } = pg;

test('PostgreSQL enforces the simplified 18-table PFE domain model', { skip: !databaseUrl }, async () => {
  const pool = new Pool({ connectionString: databaseUrl, max: 1 });
  const client = await pool.connect();
  const userId = randomUUID();
  const authUserId = randomUUID();
  const reportId = randomUUID();
  const dossierId = randomUUID();
  const typeId = randomUUID();
  const teamId = randomUUID();
  const competenceId = randomUUID();
  const contentId = randomUUID();
  const assignmentId = randomUUID();
  const interventionId = randomUUID();

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

  try {
    await client.query('BEGIN');
    await client.query(
      `INSERT INTO utilisateur (id_utilisateur, auth_user_id, nom, email)
       VALUES ($1, $2, 'Integration test', $3)`,
      [userId, authUserId, `pfe-model-${userId}@example.test`],
    );

    const citizen = await client.query(
      'SELECT id_role FROM role WHERE code_role = $1',
      ['CITOYEN'],
    );
    assert.equal(citizen.rowCount, 1, 'The initial migration must seed the citizen role.');

    await client.query(
      `INSERT INTO type_dechet (id_type_dechet, code_type, libelle, actif)
       VALUES ($1, $2, 'Plastique', true)`,
      [typeId, `PLASTIQUE-${typeId}`],
    );
    await client.query(
      `INSERT INTO equipe (id_equipe, nom_equipe, etat_equipe)
       VALUES ($1, 'Equipe test', 'ACTIVE')`,
      [teamId],
    );
    await client.query(
      `INSERT INTO competence_equipe
        (id_competence_equipe, id_equipe, id_type_dechet, actif)
       VALUES ($1, $2, $3, true)`,
      [competenceId, teamId, typeId],
    );

    await expectSqlState(
      `INSERT INTO competence_equipe
        (id_competence_equipe, id_equipe, id_type_dechet, actif)
       VALUES ($1, $2, $3, true)`,
      [randomUUID(), teamId, typeId],
      '23505',
    );

    await client.query(
      `INSERT INTO dossier_traitement
        (id_dossier, reference_dossier, description_synthese, date_creation_dossier,
         statut_dossier, priorite, cree_par)
       VALUES ($1, $2, 'Dossier de test', CURRENT_TIMESTAMP, 'OUVERT', 'NORMALE', $3)`,
      [dossierId, `DOS-${dossierId}`, userId],
    );

    await client.query(
      `INSERT INTO signalement
        (id_signalement, id_utilisateur, id_dossier, statut_signalement,
         cle_idempotence, empreinte_requete)
       VALUES ($1, $2, $3, 'SOUMIS', 'integration-key-1', 'fingerprint')`,
      [reportId, userId, dossierId],
    );

    await expectSqlState(
      `INSERT INTO signalement
        (id_signalement, id_utilisateur, statut_signalement, latitude)
       VALUES ($1, $2, 'SOUMIS', 10)`,
      [randomUUID(), userId],
      '23514',
    );

    await expectSqlState(
      `INSERT INTO contenu_signalement
        (id_contenu_signalement, id_signalement, id_type_dechet, quantite_estimee)
       VALUES ($1, $2, $3, -0.001)`,
      [randomUUID(), reportId, typeId],
      '23514',
    );

    await client.query(
      `INSERT INTO contenu_signalement
        (id_contenu_signalement, id_signalement, id_type_dechet, quantite_estimee, etat_qualification)
       VALUES ($1, $2, $3, 2.5, 'RETENU')`,
      [randomUUID(), reportId, typeId],
    );

    await client.query(
      `INSERT INTO historique_statut_signalement
        (id_historique_statut, id_signalement, id_utilisateur, ancien_statut, nouveau_statut)
       VALUES ($1, $2, $3, NULL, 'SOUMIS')`,
      [randomUUID(), reportId, userId],
    );

    await client.query(
      `INSERT INTO contenu_dossier
        (id_contenu_dossier, id_dossier, id_type_dechet, etat_contenu_dossier, etat_prise_en_charge)
       VALUES ($1, $2, $3, 'ACTIF', 'EN_ATTENTE')`,
      [contentId, dossierId, typeId],
    );

    await client.query(
      `INSERT INTO affectation
        (id_affectation, id_contenu_dossier, id_equipe, id_competence_equipe,
         date_heure_affectation, id_decideur, etat_affectation, decision_equipe)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, $5, 'ACTIVE', 'EN_ATTENTE')`,
      [assignmentId, contentId, teamId, competenceId, userId],
    );

    await expectSqlState(
      `INSERT INTO affectation
        (id_affectation, id_contenu_dossier, id_equipe, id_competence_equipe,
         date_heure_affectation, id_decideur, etat_affectation, decision_equipe)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, $5, 'ACTIVE', 'EN_ATTENTE')`,
      [randomUUID(), contentId, teamId, competenceId, userId],
      '23505',
    );

    await client.query(
      `INSERT INTO intervention
        (id_intervention, id_affectation, statut_intervention, renseigne_par)
       VALUES ($1, $2, 'EN_COURS', $3)`,
      [interventionId, assignmentId, userId],
    );
    await client.query(
      `INSERT INTO verification
        (id_verification, id_intervention, id_verificateur, date_verification, resultat_verification)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP, 'A_REPRENDRE')`,
      [randomUUID(), interventionId, userId],
    );

    await expectSqlState(
      `INSERT INTO verification
        (id_verification, id_intervention, id_verificateur, date_verification, resultat_verification)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP, 'CONFORME')`,
      [randomUUID(), interventionId, userId],
      '23505',
    );

    const requiredTables = [
      'utilisateur', 'role', 'utilisateur_role', 'type_dechet', 'equipe',
      'appartenance_equipe', 'competence_equipe', 'dossier_traitement',
      'signalement', 'photo_signalement', 'contenu_signalement',
      'historique_statut_signalement', 'demande_complement', 'contenu_dossier',
      'affectation', 'intervention', 'photo_intervention', 'verification',
    ];
    const tableState = await client.query(
      `SELECT c.relname, c.relrowsecurity
       FROM pg_class c
       JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE n.nspname = 'public'
         AND c.relkind IN ('r', 'p')
         AND c.relname = ANY($1::text[])`,
      [requiredTables],
    );
    assert.equal(tableState.rowCount, 18, 'All 18 simplified business tables must exist.');
    assert.ok(tableState.rows.every((row) => row.relrowsecurity), 'RLS must be enabled for all 18 business tables.');

    const removedTables = [
      'evenement_metier', 'qualification_signalement', 'reponse_complement',
      'idempotence_signalement', 'rattachement_signalement', 'provenance_contenu_dossier',
      'disponibilite_equipe', 'delegation_decision_equipe', 'historique_points',
      'badge', 'badge_utilisateur', 'notification', 'publication_flux',
      'photo_publication', 'region', 'departement', 'commune',
      'historique_priorite_dossier', 'historique_localisation_dossier',
      'historique_disponibilite_equipe',
    ];
    const oldTables = await client.query(
      `SELECT tablename FROM pg_tables
       WHERE schemaname = 'public' AND tablename = ANY($1::text[])`,
      [removedTables],
    );
    assert.deepEqual(oldTables.rows, [], 'Out-of-scope tables must not remain after simplification.');

    const directForeignKeys = await client.query(
      `SELECT conname
       FROM pg_constraint
       WHERE conrelid IN ('public.signalement'::regclass, 'public.verification'::regclass)
         AND contype = 'f'`,
    );
    assert.ok(directForeignKeys.rows.some((row) => row.conname.includes('signalement_id_dossier')));
    assert.ok(directForeignKeys.rows.some((row) => row.conname.includes('verification_id_intervention')));
  } finally {
    await client.query('ROLLBACK');
    client.release();
    await pool.end();
  }
});

test('business audit ledger is private and append-only', { skip: !databaseUrl }, async () => {
  const pool = new Pool({ connectionString: databaseUrl, max: 1 });
  const client = await pool.connect();
  const eventId = randomUUID();
  const entityId = randomUUID();

  try {
    await client.query('BEGIN');
    const table = await client.query(
      `SELECT relrowsecurity
       FROM pg_class
       WHERE oid = 'audit.evenement_metier'::regclass`,
    );
    assert.equal(table.rows[0]?.relrowsecurity, true, 'RLS must be enabled on the audit ledger.');

    const access = await client.query(
      `SELECT
         has_schema_privilege('anon', 'audit', 'USAGE') AS anon_usage,
         has_schema_privilege('authenticated', 'audit', 'USAGE') AS authenticated_usage,
         has_schema_privilege('service_role', 'audit', 'USAGE') AS service_usage`,
    );
    assert.deepEqual(access.rows[0], {
      anon_usage: false,
      authenticated_usage: false,
      service_usage: false,
    });


    const sourceReportEventId = randomUUID();
    const sourceLegacyHistoryId = randomUUID();
    const sourceReportId = randomUUID();
    const firstDossierId = randomUUID();
    const secondDossierId = randomUUID();

    await client.query(
      `INSERT INTO audit.evenement_metier
        (id, action_code, entity_type, entity_id, source_event_id, metadata)
       VALUES ($1, 'STATUT_SIGNALEMENT_TRANSITION', 'SIGNALEMENT', $2, $3, '{"nextStatus":"QUALIFIE"}'::jsonb)`,
      [sourceReportEventId, sourceReportId, sourceLegacyHistoryId],
    );

    const associateReportEvents = `
      INSERT INTO audit.evenement_metier (
        occurred_at, actor_id, action_code, entity_type, entity_id,
        dossier_id, reason, correlation_id, source_event_id, metadata
      )
      SELECT
        source.occurred_at, source.actor_id, source.action_code, source.entity_type,
        source.entity_id, $2, source.reason, source.correlation_id, source.id, source.metadata
      FROM audit.evenement_metier AS source
      WHERE source.entity_type = 'SIGNALEMENT'
        AND source.entity_id = $1
        AND source.dossier_id IS NULL
      ON CONFLICT (source_event_id, dossier_id)
        WHERE source_event_id IS NOT NULL
      DO NOTHING
    `;

    await client.query(associateReportEvents, [sourceReportId, firstDossierId]);
    await client.query(associateReportEvents, [sourceReportId, firstDossierId]);
    await client.query(associateReportEvents, [sourceReportId, secondDossierId]);

    const copiedEvents = await client.query(
      `SELECT dossier_id, source_event_id, metadata
       FROM audit.evenement_metier
       WHERE source_event_id = $1
       ORDER BY dossier_id`,
      [sourceReportEventId],
    );
    assert.equal(copiedEvents.rowCount, 2, 'The same report event is copied once per dossier.');
    assert.deepEqual(
      copiedEvents.rows.map((row) => row.dossier_id).sort(),
      [firstDossierId, secondDossierId].sort(),
    );
    assert.ok(copiedEvents.rows.every((row) => row.metadata.nextStatus === 'QUALIFIE'));
    assert.ok(copiedEvents.rows.every((row) => row.source_event_id === sourceReportEventId));

    await client.query(
      `INSERT INTO audit.evenement_metier (id, action_code, entity_type, entity_id, metadata)
       VALUES ($1, 'TEST_AUDIT_EVENT', 'DOSSIER', $2, '{"priority":"NORMALE"}'::jsonb)`,
      [eventId, entityId],
    );

    await client.query('SAVEPOINT audit_update_probe');
    await assert.rejects(
      client.query('UPDATE audit.evenement_metier SET action_code = $1 WHERE id = $2', ['TAMPERED', eventId]),
      (error) => error?.code === '55000',
    );
    await client.query('ROLLBACK TO SAVEPOINT audit_update_probe');
    await client.query('RELEASE SAVEPOINT audit_update_probe');

    await client.query('SAVEPOINT audit_delete_probe');
    await assert.rejects(
      client.query('DELETE FROM audit.evenement_metier WHERE id = $1', [eventId]),
      (error) => error?.code === '55000',
    );
    await client.query('ROLLBACK TO SAVEPOINT audit_delete_probe');
    await client.query('RELEASE SAVEPOINT audit_delete_probe');

    await client.query('SAVEPOINT audit_truncate_probe');
    await assert.rejects(
      client.query('TRUNCATE audit.evenement_metier'),
      (error) => error?.code === '55000',
    );
    await client.query('ROLLBACK TO SAVEPOINT audit_truncate_probe');
    await client.query('RELEASE SAVEPOINT audit_truncate_probe');
  } finally {
    await client.query('ROLLBACK');
    client.release();
    await pool.end();
  }
});


test('business audit preserves same-transaction event order when copied to a dossier', { skip: !databaseUrl }, async () => {
  const pool = new Pool({ connectionString: databaseUrl, max: 1 });
  const client = await pool.connect();
  const reportId = randomUUID();
  const dossierId = randomUUID();

  try {
    await client.query('BEGIN');
    const sameTimestamp = new Date('2026-11-05T12:00:00.000Z');
    await client.query(
      `INSERT INTO audit.evenement_metier
        (occurred_at, action_code, entity_type, entity_id, metadata)
       VALUES
        ($1, 'SIGNALEMENT_SOUMIS', 'SIGNALEMENT', $2, '{}'::jsonb),
        ($1, 'SIGNALEMENT_QUALIFIE', 'SIGNALEMENT', $2, '{}'::jsonb)`,
      [sameTimestamp, reportId],
    );

    const sourceEvents = await client.query(
      `SELECT action_code, event_order
         FROM audit.evenement_metier
        WHERE entity_type = 'SIGNALEMENT'
          AND entity_id = $1
          AND dossier_id IS NULL
        ORDER BY occurred_at ASC, event_order ASC`,
      [reportId],
    );
    assert.deepEqual(
      sourceEvents.rows.map((row) => row.action_code),
      ['SIGNALEMENT_SOUMIS', 'SIGNALEMENT_QUALIFIE'],
    );
    assert.ok(
      BigInt(sourceEvents.rows[0].event_order) < BigInt(sourceEvents.rows[1].event_order),
      'The sequence must preserve insertion order for source events sharing a transaction timestamp.',
    );

    await client.query(
      `INSERT INTO audit.evenement_metier (
         occurred_at, actor_id, action_code, entity_type, entity_id,
         dossier_id, reason, correlation_id, source_event_id, metadata
       )
       SELECT
         source.occurred_at, source.actor_id, source.action_code, source.entity_type,
         source.entity_id, $2, source.reason, source.correlation_id, source.id, source.metadata
       FROM audit.evenement_metier AS source
       WHERE source.entity_type = 'SIGNALEMENT'
         AND source.entity_id = $1
         AND source.dossier_id IS NULL
       ORDER BY source.occurred_at ASC, source.event_order ASC
       ON CONFLICT (source_event_id, dossier_id)
         WHERE source_event_id IS NOT NULL
       DO NOTHING`,
      [reportId, dossierId],
    );

    const copiedEvents = await client.query(
      `SELECT action_code, event_order
         FROM audit.evenement_metier
        WHERE dossier_id = $1
          AND entity_type = 'SIGNALEMENT'
          AND entity_id = $2
          AND source_event_id IS NOT NULL
        ORDER BY occurred_at ASC, event_order ASC`,
      [dossierId, reportId],
    );
    assert.deepEqual(
      copiedEvents.rows.map((row) => row.action_code),
      ['SIGNALEMENT_SOUMIS', 'SIGNALEMENT_QUALIFIE'],
    );
    assert.ok(
      BigInt(copiedEvents.rows[0].event_order) < BigInt(copiedEvents.rows[1].event_order),
      'Copied history must retain the source event order.',
    );
    await client.query('ROLLBACK');
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch {}
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
});
