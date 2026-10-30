-- Business-data integrity constraints for MLD v2.13.
-- These invariants complement the relational model and are enforced by PostgreSQL
-- so they remain active regardless of which backend client submits a write.

-- Validity and lifecycle intervals.
ALTER TABLE "type_dechet"
  ADD CONSTRAINT "type_dechet_validity_period_check"
  CHECK ("date_fin_validite" IS NULL OR "date_fin_validite" >= "date_debut_validite");

ALTER TABLE "utilisateur_role"
  ADD CONSTRAINT "utilisateur_role_validity_period_check"
  CHECK ("date_fin" IS NULL OR "date_fin" >= "date_debut");

ALTER TABLE "appartenance_equipe"
  ADD CONSTRAINT "appartenance_equipe_validity_period_check"
  CHECK ("date_fin" IS NULL OR "date_fin" >= "date_debut");

ALTER TABLE "competence_equipe"
  ADD CONSTRAINT "competence_equipe_validity_period_check"
  CHECK ("date_fin" IS NULL OR "date_fin" >= "date_debut");

ALTER TABLE "rattachement_signalement"
  ADD CONSTRAINT "rattachement_signalement_validity_period_check"
  CHECK ("date_fin_rattachement" IS NULL OR "date_fin_rattachement" >= "date_debut_rattachement");

ALTER TABLE "delegation_decision_equipe"
  ADD CONSTRAINT "delegation_decision_equipe_validity_period_check"
  CHECK ("date_fin" IS NULL OR "date_fin" >= "date_debut");

ALTER TABLE "provenance_contenu_dossier"
  ADD CONSTRAINT "provenance_contenu_dossier_validity_period_check"
  CHECK ("date_fin" IS NULL OR "date_fin" >= "date_debut");

ALTER TABLE "affectation"
  ADD CONSTRAINT "affectation_validity_period_check"
  CHECK ("date_fin_affectation" IS NULL OR "date_fin_affectation" >= "date_heure_affectation");

ALTER TABLE "intervention"
  ADD CONSTRAINT "intervention_time_range_check"
  CHECK (
    "date_heure_debut" IS NULL
    OR "date_heure_fin" IS NULL
    OR "date_heure_fin" >= "date_heure_debut"
  );

ALTER TABLE "dossier_traitement"
  ADD CONSTRAINT "dossier_traitement_closure_date_check"
  CHECK ("date_cloture" IS NULL OR "date_cloture" >= "date_creation_dossier");

ALTER TABLE "disponibilite_equipe"
  ADD CONSTRAINT "disponibilite_equipe_validity_check"
  CHECK ("valide_jusqua" >= "date_mise_a_jour");

ALTER TABLE "historique_disponibilite_equipe"
  ADD CONSTRAINT "historique_disponibilite_equipe_validity_check"
  CHECK ("valide_jusqua" >= "date_mise_a_jour");

-- Geographical values must be either wholly absent or valid coordinates.
ALTER TABLE "signalement"
  ADD CONSTRAINT "signalement_coordinates_pair_check"
    CHECK (("latitude" IS NULL) = ("longitude" IS NULL)),
  ADD CONSTRAINT "signalement_latitude_range_check"
    CHECK ("latitude" IS NULL OR "latitude" BETWEEN -90 AND 90),
  ADD CONSTRAINT "signalement_longitude_range_check"
    CHECK ("longitude" IS NULL OR "longitude" BETWEEN -180 AND 180),
  ADD CONSTRAINT "signalement_location_precision_check"
    CHECK ("precision_localisation" IS NULL OR "precision_localisation" >= 0);

ALTER TABLE "dossier_traitement"
  ADD CONSTRAINT "dossier_traitement_coordinates_pair_check"
    CHECK (("latitude" IS NULL) = ("longitude" IS NULL)),
  ADD CONSTRAINT "dossier_traitement_latitude_range_check"
    CHECK ("latitude" IS NULL OR "latitude" BETWEEN -90 AND 90),
  ADD CONSTRAINT "dossier_traitement_longitude_range_check"
    CHECK ("longitude" IS NULL OR "longitude" BETWEEN -180 AND 180),
  ADD CONSTRAINT "dossier_traitement_location_precision_check"
    CHECK ("precision_localisation" IS NULL OR "precision_localisation" >= 0);

ALTER TABLE "historique_localisation_dossier"
  ADD CONSTRAINT "historique_localisation_coordinates_pair_check"
    CHECK (("latitude" IS NULL) = ("longitude" IS NULL)),
  ADD CONSTRAINT "historique_localisation_latitude_range_check"
    CHECK ("latitude" IS NULL OR "latitude" BETWEEN -90 AND 90),
  ADD CONSTRAINT "historique_localisation_longitude_range_check"
    CHECK ("longitude" IS NULL OR "longitude" BETWEEN -180 AND 180),
  ADD CONSTRAINT "historique_localisation_precision_check"
    CHECK ("precision_localisation" IS NULL OR "precision_localisation" >= 0);

-- Estimated quantities and volumes cannot be negative.
ALTER TABLE "contenu_signalement"
  ADD CONSTRAINT "contenu_signalement_estimated_quantity_check"
    CHECK ("quantite_estimee" IS NULL OR "quantite_estimee" >= 0),
  ADD CONSTRAINT "contenu_signalement_estimated_volume_check"
    CHECK ("volume_estime" IS NULL OR "volume_estime" >= 0);

ALTER TABLE "contenu_dossier"
  ADD CONSTRAINT "contenu_dossier_estimated_quantity_check"
    CHECK ("quantite_estimee" IS NULL OR "quantite_estimee" >= 0),
  ADD CONSTRAINT "contenu_dossier_legacy_quantity_check"
    CHECK ("quantite_estimee_legacy" IS NULL OR "quantite_estimee_legacy" >= 0),
  ADD CONSTRAINT "contenu_dossier_estimated_volume_check"
    CHECK ("volume_estime" IS NULL OR "volume_estime" >= 0);

ALTER TABLE "qualification_signalement"
  ADD CONSTRAINT "qualification_signalement_estimated_quantity_check"
    CHECK ("quantite_estimee" IS NULL OR "quantite_estimee" >= 0),
  ADD CONSTRAINT "qualification_signalement_legacy_quantity_check"
    CHECK ("quantite_estimee_legacy" IS NULL OR "quantite_estimee_legacy" >= 0),
  ADD CONSTRAINT "qualification_signalement_estimated_volume_check"
    CHECK ("volume_estime" IS NULL OR "volume_estime" >= 0);

-- Media retention and review metadata must be temporally coherent.
ALTER TABLE "photo_signalement"
  ADD CONSTRAINT "photo_signalement_expiration_check"
    CHECK ("date_expiration" >= "date_ajout"),
  ADD CONSTRAINT "photo_signalement_purge_after_expiration_check"
    CHECK ("media_purge_at" IS NULL OR "media_purge_at" >= "date_expiration"),
  ADD CONSTRAINT "photo_signalement_variant_metadata_check"
    CHECK (("variante_soumise_par" IS NULL) = ("date_soumission_variante" IS NULL)),
  ADD CONSTRAINT "photo_signalement_approval_metadata_check"
    CHECK (("approuve_par" IS NULL) = ("date_approbation" IS NULL));

ALTER TABLE "photo_intervention"
  ADD CONSTRAINT "photo_intervention_expiration_check"
    CHECK ("date_expiration" >= "date_ajout"),
  ADD CONSTRAINT "photo_intervention_purge_after_expiration_check"
    CHECK ("media_purge_at" IS NULL OR "media_purge_at" >= "date_expiration"),
  ADD CONSTRAINT "photo_intervention_variant_metadata_check"
    CHECK (("variante_soumise_par" IS NULL) = ("date_soumission_variante" IS NULL)),
  ADD CONSTRAINT "photo_intervention_approval_metadata_check"
    CHECK (("approuve_par" IS NULL) = ("date_approbation" IS NULL));

ALTER TABLE "affectation"
  ADD CONSTRAINT "affectation_team_response_metadata_check"
  CHECK (("repondu_par" IS NULL) = ("date_reponse_equipe" IS NULL));

-- Every business event must point to exactly one business target.
-- The two columns identifying a content target form one composite target.
ALTER TABLE "evenement_metier"
  ADD CONSTRAINT "evenement_metier_content_target_pair_check"
  CHECK (("id_dossier_contenu_cible" IS NULL) = ("id_type_dechet_contenu_cible" IS NULL)),
  ADD CONSTRAINT "evenement_metier_exactly_one_target_check"
  CHECK (
    num_nonnulls(
      "id_signalement_cible",
      "id_dossier_cible",
      "id_rattachement_cible",
      "id_affectation_cible",
      "id_intervention_cible",
      "id_verification_cible",
      "id_utilisateur_cible",
      "id_equipe_cible",
      "id_type_dechet_cible",
      "id_competence_equipe_cible",
      "id_dossier_contenu_cible"
    ) = 1
  );

-- A published photo reference must resolve to exactly one source photo.
ALTER TABLE "photo_publication"
  ADD CONSTRAINT "photo_publication_exactly_one_source_check"
  CHECK (num_nonnulls("id_photo_signalement", "id_photo_intervention") = 1);

-- One open-ended/current assignment or relationship per business key.
CREATE UNIQUE INDEX "utilisateur_role_one_open_assignment_idx"
  ON "utilisateur_role" ("id_utilisateur", "id_role")
  WHERE "date_fin" IS NULL;

CREATE UNIQUE INDEX "appartenance_equipe_one_open_membership_idx"
  ON "appartenance_equipe" ("id_utilisateur", "id_equipe")
  WHERE "date_fin" IS NULL;

CREATE UNIQUE INDEX "competence_equipe_one_open_skill_idx"
  ON "competence_equipe" ("id_equipe", "id_type_dechet")
  WHERE "date_fin" IS NULL;

CREATE UNIQUE INDEX "delegation_decision_equipe_one_open_delegation_idx"
  ON "delegation_decision_equipe" ("id_equipe", "id_utilisateur_delegue", "type_decision")
  WHERE "date_fin" IS NULL;

CREATE UNIQUE INDEX "rattachement_signalement_one_open_case_idx"
  ON "rattachement_signalement" ("id_signalement")
  WHERE "date_fin_rattachement" IS NULL;

CREATE UNIQUE INDEX "affectation_one_open_assignment_idx"
  ON "affectation" ("id_dossier", "id_type_dechet")
  WHERE "date_fin_affectation" IS NULL;
