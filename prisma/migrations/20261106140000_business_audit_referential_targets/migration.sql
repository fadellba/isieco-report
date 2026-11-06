-- Expand the append-only business ledger to represent referential mutations precisely.
ALTER TABLE audit.evenement_metier
  DROP CONSTRAINT evenement_metier_entity_type_check;

ALTER TABLE audit.evenement_metier
  ADD CONSTRAINT evenement_metier_entity_type_check
  CHECK (
    entity_type IN (
      'DOSSIER',
      'SIGNALEMENT',
      'AFFECTATION',
      'INTERVENTION',
      'VERIFICATION',
      'UTILISATEUR',
      'REFERENTIEL',
      'EQUIPE',
      'APPARTENANCE',
      'COMPETENCE'
    )
  );
