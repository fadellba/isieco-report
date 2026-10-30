-- Add explicit audit targets for geographic reference records.
ALTER TABLE "evenement_metier"
  ADD COLUMN "id_region_cible" UUID,
  ADD COLUMN "id_departement_cible" UUID,
  ADD COLUMN "id_commune_cible" UUID;

ALTER TABLE "evenement_metier"
  ADD CONSTRAINT "evenement_metier_id_region_cible_fkey"
    FOREIGN KEY ("id_region_cible") REFERENCES "region"("id_region")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "evenement_metier_id_departement_cible_fkey"
    FOREIGN KEY ("id_departement_cible") REFERENCES "departement"("id_departement")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "evenement_metier_id_commune_cible_fkey"
    FOREIGN KEY ("id_commune_cible") REFERENCES "commune"("id_commune")
    ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "evenement_metier_id_region_cible_date_idx"
  ON "evenement_metier" ("id_region_cible", "date_enregistrement");
CREATE INDEX "evenement_metier_id_departement_cible_date_idx"
  ON "evenement_metier" ("id_departement_cible", "date_enregistrement");
CREATE INDEX "evenement_metier_id_commune_cible_date_idx"
  ON "evenement_metier" ("id_commune_cible", "date_enregistrement");

ALTER TABLE "evenement_metier"
  DROP CONSTRAINT "evenement_metier_exactly_one_target_check";

ALTER TABLE "evenement_metier"
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
      "id_region_cible",
      "id_departement_cible",
      "id_commune_cible",
      "id_type_dechet_cible",
      "id_competence_equipe_cible",
      "id_dossier_contenu_cible"
    ) = 1
  );
