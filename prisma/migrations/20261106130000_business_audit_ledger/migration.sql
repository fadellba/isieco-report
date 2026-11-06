-- Durable business audit ledger, deliberately outside the 18-table public domain model.
CREATE SCHEMA IF NOT EXISTS audit;

CREATE TABLE audit.evenement_metier (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actor_id UUID,
  action_code TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  dossier_id UUID,
  reason TEXT,
  correlation_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT evenement_metier_action_code_check
    CHECK (action_code ~ '^[A-Z][A-Z0-9_]{1,79}$'),
  CONSTRAINT evenement_metier_entity_type_check
    CHECK (entity_type IN ('DOSSIER', 'SIGNALEMENT', 'AFFECTATION', 'INTERVENTION', 'VERIFICATION', 'UTILISATEUR')),
  CONSTRAINT evenement_metier_metadata_object_check
    CHECK (jsonb_typeof(metadata) = 'object')
);

CREATE INDEX evenement_metier_case_timeline_idx
  ON audit.evenement_metier (dossier_id, occurred_at DESC, id DESC);
CREATE INDEX evenement_metier_entity_timeline_idx
  ON audit.evenement_metier (entity_type, entity_id, occurred_at DESC);
CREATE INDEX evenement_metier_actor_timeline_idx
  ON audit.evenement_metier (actor_id, occurred_at DESC);

ALTER TABLE audit.evenement_metier ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON SCHEMA audit FROM PUBLIC;
REVOKE ALL PRIVILEGES ON TABLE audit.evenement_metier FROM PUBLIC;

DO $lockdown$
DECLARE
  grantee TEXT;
BEGIN
  FOREACH grantee IN ARRAY ARRAY['anon', 'authenticated', 'service_role'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = grantee) THEN
      EXECUTE format('REVOKE ALL PRIVILEGES ON SCHEMA audit FROM %I', grantee);
      EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE audit.evenement_metier FROM %I', grantee);
      EXECUTE format('REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA audit FROM %I', grantee);
    END IF;
  END LOOP;
END
$lockdown$;

CREATE OR REPLACE FUNCTION audit.reject_event_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  RAISE EXCEPTION 'Business audit events are append-only.'
    USING ERRCODE = '55000';
END;
$function$;

CREATE TRIGGER evenement_metier_append_only
  BEFORE UPDATE OR DELETE ON audit.evenement_metier
  FOR EACH ROW EXECUTE FUNCTION audit.reject_event_mutation();

-- Backfill status history that is still associated with a dossier.
-- dossier_id is copied onto each event so later detachment cannot erase its timeline.
INSERT INTO audit.evenement_metier (
  occurred_at, actor_id, action_code, entity_type, entity_id, dossier_id, reason, metadata
)
SELECT
  h.date_changement,
  h.id_utilisateur,
  'STATUT_SIGNALEMENT_TRANSITION',
  'SIGNALEMENT',
  h.id_signalement,
  s.id_dossier,
  h.motif,
  jsonb_strip_nulls(jsonb_build_object(
    'previousStatus', h.ancien_statut,
    'nextStatus', h.nouveau_statut
  ))
FROM public.historique_statut_signalement h
JOIN public.signalement s ON s.id_signalement = h.id_signalement
WHERE s.id_dossier IS NOT NULL;
