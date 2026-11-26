-- Preserve legacy TRANSMIS transitions that have no dedicated business action event.
-- Keep the legacy history row ID as the source reference so the backfill is idempotent.
-- Events for reports without a dossier remain eligible for association by the existing attach flow.
INSERT INTO audit.evenement_metier (
  occurred_at,
  actor_id,
  action_code,
  entity_type,
  entity_id,
  dossier_id,
  source_event_id,
  metadata
)
SELECT
  history.date_changement AT TIME ZONE 'UTC',
  history.id_utilisateur,
  'STATUT_SIGNALEMENT_TRANSITION',
  'SIGNALEMENT',
  history.id_signalement,
  report.id_dossier,
  history.id_historique_statut,
  jsonb_strip_nulls(jsonb_build_object(
    'previousStatus', history.ancien_statut,
    'nextStatus', history.nouveau_statut
  ))
FROM public.historique_statut_signalement AS history
JOIN public.signalement AS report
  ON report.id_signalement = history.id_signalement
WHERE history.nouveau_statut = 'TRANSMIS'
  AND NOT EXISTS (
    SELECT 1
    FROM audit.evenement_metier AS existing
    WHERE existing.source_event_id = history.id_historique_statut
      AND existing.dossier_id IS NOT DISTINCT FROM report.id_dossier
  )
ORDER BY history.date_changement ASC, history.id_historique_statut ASC
ON CONFLICT (source_event_id, dossier_id)
  WHERE source_event_id IS NOT NULL
DO NOTHING;
