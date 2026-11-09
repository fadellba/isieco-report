-- Give audit events a deterministic insertion order when transaction timestamps tie.
BEGIN;

CREATE SEQUENCE audit.evenement_metier_event_order_seq AS BIGINT;

ALTER TABLE audit.evenement_metier
  ADD COLUMN event_order BIGINT;

-- Existing audit rows are immutable business facts. This migration only backfills
-- a deterministic ordering key, using the server timestamp and stable event ID.
ALTER TABLE audit.evenement_metier
  DISABLE TRIGGER evenement_metier_append_only;

WITH ranked_events AS (
  SELECT
    id,
    ROW_NUMBER() OVER (ORDER BY occurred_at ASC, id ASC) AS event_order
  FROM audit.evenement_metier
)
UPDATE audit.evenement_metier AS event
SET event_order = ranked_events.event_order
FROM ranked_events
WHERE event.id = ranked_events.id;

ALTER TABLE audit.evenement_metier
  ENABLE TRIGGER evenement_metier_append_only;

ALTER SEQUENCE audit.evenement_metier_event_order_seq
  OWNED BY audit.evenement_metier.event_order;

SELECT setval(
  'audit.evenement_metier_event_order_seq',
  COALESCE((SELECT MAX(event_order) FROM audit.evenement_metier), 0) + 1,
  false
);

ALTER TABLE audit.evenement_metier
  ALTER COLUMN event_order
  SET DEFAULT nextval('audit.evenement_metier_event_order_seq');

ALTER TABLE audit.evenement_metier
  ALTER COLUMN event_order SET NOT NULL;

CREATE UNIQUE INDEX evenement_metier_event_order_idx
  ON audit.evenement_metier (event_order);

DROP INDEX audit.evenement_metier_case_timeline_idx;

CREATE INDEX evenement_metier_case_timeline_idx
  ON audit.evenement_metier (dossier_id, occurred_at DESC, event_order DESC);

COMMENT ON COLUMN audit.evenement_metier.event_order IS
  'Monotonic insertion order used to break ties between business events with identical server timestamps.';

REVOKE ALL PRIVILEGES ON SEQUENCE audit.evenement_metier_event_order_seq FROM PUBLIC;

DO $lockdown$
DECLARE
  grantee TEXT;
BEGIN
  FOREACH grantee IN ARRAY ARRAY['anon', 'authenticated', 'service_role'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = grantee) THEN
      EXECUTE format(
        'REVOKE ALL PRIVILEGES ON SEQUENCE audit.evenement_metier_event_order_seq FROM %I',
        grantee
      );
    END IF;
  END LOOP;
END
$lockdown$;

COMMIT;
