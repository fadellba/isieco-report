-- Normalize the identity sequence for audit rows that existed when event_sequence was introduced.
-- The original causal order of legacy events with identical timestamps cannot be recovered;
-- assign a stable, reproducible order using the server timestamp and immutable event ID.
BEGIN;

ALTER TABLE audit.evenement_metier
  DISABLE TRIGGER evenement_metier_append_only;

-- Move all existing values above the current range first. This avoids transient
-- collisions with the UNIQUE(event_sequence) constraint while the values are reordered.
WITH ranked_events AS (
  SELECT
    id,
    ROW_NUMBER() OVER (ORDER BY occurred_at ASC, id ASC) AS deterministic_sequence
  FROM audit.evenement_metier
),
sequence_offset AS (
  SELECT COALESCE(MAX(event_sequence), 0) + COUNT(*) + 1 AS offset_value
  FROM audit.evenement_metier
)
UPDATE audit.evenement_metier AS event
SET event_sequence = ranked_events.deterministic_sequence + sequence_offset.offset_value
FROM ranked_events, sequence_offset
WHERE event.id = ranked_events.id;

-- The original range is now vacant, so a deterministic ranking can be applied
-- without colliding with any row that has not yet been updated.
WITH ranked_events AS (
  SELECT
    id,
    ROW_NUMBER() OVER (ORDER BY occurred_at ASC, id ASC) AS deterministic_sequence
  FROM audit.evenement_metier
)
UPDATE audit.evenement_metier AS event
SET event_sequence = ranked_events.deterministic_sequence
FROM ranked_events
WHERE event.id = ranked_events.id;

ALTER TABLE audit.evenement_metier
  ENABLE TRIGGER evenement_metier_append_only;

-- Continue new writes after the normalized range.
SELECT setval(
  'audit.evenement_metier_event_sequence_seq',
  COALESCE((SELECT MAX(event_sequence) FROM audit.evenement_metier), 0) + 1,
  false
);

COMMIT;
