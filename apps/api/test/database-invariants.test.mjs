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
