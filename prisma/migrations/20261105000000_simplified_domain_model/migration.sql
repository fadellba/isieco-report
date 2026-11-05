-- Simplification réelle du modèle métier selon le MCD PFE (18 tables).
-- Les données structurantes sont migrées avant la suppression des tables secondaires.
-- Les anciennes migrations restent immuables : cette migration est additive dans l'historique Prisma.

-- 1. Historiser les transitions de statut des signalements.
CREATE TABLE "historique_statut_signalement" (
  "id_historique_statut" UUID NOT NULL,
  "id_signalement" UUID NOT NULL,
  "id_utilisateur" UUID,
  "ancien_statut" TEXT,
  "nouveau_statut" TEXT NOT NULL,
  "date_changement" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "motif" TEXT,
  CONSTRAINT "historique_statut_signalement_pkey" PRIMARY KEY ("id_historique_statut")
);

-- 2. Déplacer l'idempotence dans Signalement.
ALTER TABLE "signalement"
  ADD COLUMN "id_dossier" UUID,
  ADD COLUMN "cle_idempotence" TEXT,
  ADD COLUMN "empreinte_requete" TEXT;

WITH current_attachment AS (
  SELECT DISTINCT ON ("id_signalement")
    "id_signalement", "id_dossier"
  FROM "rattachement_signalement"
  WHERE "date_fin_rattachement" IS NULL
  ORDER BY "id_signalement", "date_debut_rattachement" DESC, "id_rattachement" DESC
)
UPDATE "signalement" s
SET "id_dossier" = r."id_dossier"
FROM current_attachment r
WHERE r."id_signalement" = s."id_signalement";

UPDATE "signalement" s
SET "cle_idempotence" = i."cle_idempotence",
    "empreinte_requete" = i."empreinte_requete"
FROM "idempotence_signalement" i
WHERE i."id_signalement" = s."id_signalement";

-- 4. Les tables héritées ne sont plus utilisées après la copie ci-dessus.
-- Les supprimer avant de remplacer les clés primaires composites qu'elles référencent.
ALTER TABLE "affectation"
  DROP CONSTRAINT IF EXISTS "affectation_id_dossier_id_type_dechet_fkey";

-- 9. Supprimer les tables secondaires qui ne font plus partie du périmètre simplifié.
DROP TABLE IF EXISTS "photo_publication" CASCADE;
DROP TABLE IF EXISTS "publication_flux" CASCADE;
DROP TABLE IF EXISTS "badge_utilisateur" CASCADE;
DROP TABLE IF EXISTS "badge" CASCADE;
DROP TABLE IF EXISTS "historique_points" CASCADE;
DROP TABLE IF EXISTS "notification" CASCADE;
DROP TABLE IF EXISTS "preferences_visibilite_citoyen" CASCADE;
DROP TABLE IF EXISTS "historique_localisation_dossier" CASCADE;
DROP TABLE IF EXISTS "historique_priorite_dossier" CASCADE;
DROP TABLE IF EXISTS "historique_disponibilite_equipe" CASCADE;
DROP TABLE IF EXISTS "disponibilite_equipe" CASCADE;
DROP TABLE IF EXISTS "delegation_decision_equipe" CASCADE;
DROP TABLE IF EXISTS "provenance_contenu_dossier" CASCADE;
DROP TABLE IF EXISTS "rattachement_signalement" CASCADE;
DROP TABLE IF EXISTS "evenement_metier" CASCADE;
DROP TABLE IF EXISTS "reponse_complement" CASCADE;
DROP TABLE IF EXISTS "qualification_signalement" CASCADE;
DROP TABLE IF EXISTS "idempotence_signalement" CASCADE;


-- 3. Fusionner QualificationSignalement dans ContenuSignalement.
ALTER TABLE "contenu_signalement"
  ADD COLUMN "id_contenu_signalement" UUID,
  ADD COLUMN "etat_qualification" TEXT NOT NULL DEFAULT 'EN_ATTENTE',
  ADD COLUMN "qualifie_par" UUID,
  ADD COLUMN "date_qualification" TIMESTAMP(3);

WITH latest_qualification AS (
  SELECT DISTINCT ON ("id_signalement", "id_type_dechet")
    "id_signalement",
    "id_type_dechet",
    "quantite_estimee",
    "volume_estime",
    "remarque",
    "qualifie_par",
    "date_qualification",
    "etat_qualification"
  FROM "qualification_signalement"
  ORDER BY "id_signalement", "id_type_dechet", "date_qualification" DESC, "id_qualification" DESC
)
INSERT INTO "contenu_signalement" (
  "id_contenu_signalement", "id_signalement", "id_type_dechet",
  "quantite_estimee", "volume_estime", "remarque",
  "etat_qualification", "qualifie_par", "date_qualification"
)
SELECT
  gen_random_uuid(), q."id_signalement", q."id_type_dechet",
  q."quantite_estimee", q."volume_estime", q."remarque",
  q."etat_qualification", q."qualifie_par", q."date_qualification"
FROM latest_qualification q
WHERE NOT EXISTS (
  SELECT 1
  FROM "contenu_signalement" c
  WHERE c."id_signalement" = q."id_signalement"
    AND c."id_type_dechet" = q."id_type_dechet"
);

WITH latest_qualification AS (
  SELECT DISTINCT ON ("id_signalement", "id_type_dechet")
    "id_signalement",
    "id_type_dechet",
    "quantite_estimee",
    "volume_estime",
    "remarque",
    "qualifie_par",
    "date_qualification",
    "etat_qualification"
  FROM "qualification_signalement"
  ORDER BY "id_signalement", "id_type_dechet", "date_qualification" DESC, "id_qualification" DESC
)
UPDATE "contenu_signalement" c
SET "quantite_estimee" = COALESCE(q."quantite_estimee", c."quantite_estimee"),
    "volume_estime" = COALESCE(q."volume_estime", c."volume_estime"),
    "remarque" = COALESCE(q."remarque", c."remarque"),
    "etat_qualification" = q."etat_qualification",
    "qualifie_par" = q."qualifie_par",
    "date_qualification" = q."date_qualification"
FROM latest_qualification q
WHERE q."id_signalement" = c."id_signalement"
  AND q."id_type_dechet" = c."id_type_dechet";

UPDATE "contenu_signalement" SET "id_contenu_signalement" = gen_random_uuid() WHERE "id_contenu_signalement" IS NULL;
ALTER TABLE "contenu_signalement" ALTER COLUMN "id_contenu_signalement" SET NOT NULL;
ALTER TABLE "contenu_signalement" DROP CONSTRAINT "contenu_signalement_pkey";
ALTER TABLE "contenu_signalement"
  ADD CONSTRAINT "contenu_signalement_pkey" PRIMARY KEY ("id_contenu_signalement");
CREATE UNIQUE INDEX "contenu_signalement_id_signalement_id_type_dechet_key"
  ON "contenu_signalement" ("id_signalement", "id_type_dechet");

-- 4. Donner un identifiant propre aux contenus de dossier et simplifier Affectation.
ALTER TABLE "contenu_dossier"
  ADD COLUMN "id_contenu_dossier" UUID;

UPDATE "contenu_dossier" SET "id_contenu_dossier" = gen_random_uuid() WHERE "id_contenu_dossier" IS NULL;
ALTER TABLE "contenu_dossier" ALTER COLUMN "id_contenu_dossier" SET NOT NULL;
ALTER TABLE "contenu_dossier" DROP CONSTRAINT "contenu_dossier_pkey";
ALTER TABLE "contenu_dossier"
  ADD CONSTRAINT "contenu_dossier_pkey" PRIMARY KEY ("id_contenu_dossier");
CREATE UNIQUE INDEX "contenu_dossier_id_dossier_id_type_dechet_key"
  ON "contenu_dossier" ("id_dossier", "id_type_dechet");

ALTER TABLE "affectation" ADD COLUMN "id_contenu_dossier" UUID;
UPDATE "affectation" a
SET "id_contenu_dossier" = c."id_contenu_dossier"
FROM "contenu_dossier" c
WHERE c."id_dossier" = a."id_dossier"
  AND c."id_type_dechet" = a."id_type_dechet";
ALTER TABLE "affectation" ALTER COLUMN "id_contenu_dossier" SET NOT NULL;

-- 5. Fusionner DemandeComplement et ReponseComplement.
ALTER TABLE "demande_complement"
  ADD COLUMN "reponse" TEXT,
  ADD COLUMN "repondu_par" UUID,
  ADD COLUMN "date_reponse" TIMESTAMP(3);

UPDATE "demande_complement" d
SET "reponse" = r."contenu",
    "repondu_par" = r."repondu_par",
    "date_reponse" = r."date_reponse"
FROM "reponse_complement" r
WHERE r."id_demande" = d."id_demande";

-- 6. Ajouter l'association directe entre Verification et Intervention.
ALTER TABLE "verification_resolution" ADD COLUMN "id_intervention" UUID;

WITH ranked_verifications AS (
  SELECT "id_verification", "id_affectation",
         ROW_NUMBER() OVER (
           PARTITION BY "id_affectation"
           ORDER BY "date_verification" DESC, "id_verification" DESC
         ) AS rn
  FROM "verification_resolution"
),
ranked_interventions AS (
  SELECT "id_intervention", "id_affectation",
         ROW_NUMBER() OVER (
           PARTITION BY "id_affectation"
           ORDER BY COALESCE("date_soumission_compte_rendu", "date_heure_fin", "date_heure_debut") DESC,
                    "id_intervention" DESC
         ) AS rn
  FROM "intervention"
)
UPDATE "verification_resolution" v
SET "id_intervention" = i."id_intervention"
FROM ranked_verifications rv
JOIN ranked_interventions i
  ON i."id_affectation" = rv."id_affectation"
 AND i.rn = rv.rn
WHERE v."id_verification" = rv."id_verification";

ALTER TABLE "verification_resolution" RENAME TO "verification";

-- 7. Migrer les changements de statut connus depuis le journal générique.
INSERT INTO "historique_statut_signalement" (
  "id_signalement", "id_utilisateur", "ancien_statut",
  "nouveau_statut", "date_changement", "motif"
)
SELECT
  e."id_signalement_cible",
  e."id_acteur",
  e."donnees_avant" ->> 'statutSignalement',
  COALESCE(e."donnees_apres" ->> 'statutSignalement', e."type_evenement"),
  e."date_enregistrement",
  e."motif"
FROM "evenement_metier" e
WHERE e."id_signalement_cible" IS NOT NULL
  AND e."type_evenement" ILIKE '%SIGNALEMENT%';

-- 8. Transformer les périodes de validité en indicateurs simples.
ALTER TABLE "type_dechet" ADD COLUMN "actif" BOOLEAN NOT NULL DEFAULT TRUE;
UPDATE "type_dechet"
SET "actif" = (
  "date_debut_validite" <= CURRENT_TIMESTAMP
  AND ("date_fin_validite" IS NULL OR "date_fin_validite" >= CURRENT_TIMESTAMP)
);

ALTER TABLE "competence_equipe" ADD COLUMN "actif" BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE "competence_equipe" ADD COLUMN "date_attribution" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
UPDATE "competence_equipe"
SET "actif" = (
  "date_debut" <= CURRENT_TIMESTAMP
  AND ("date_fin" IS NULL OR "date_fin" >= CURRENT_TIMESTAMP)
),
    "date_attribution" = "date_debut";

-- 10. Enlever les relations et colonnes géographiques non représentées dans le MCD simplifié.
ALTER TABLE "signalement" DROP CONSTRAINT IF EXISTS "signalement_id_commune_fkey";
ALTER TABLE "dossier_traitement" DROP CONSTRAINT IF EXISTS "dossier_traitement_id_commune_fkey";
ALTER TABLE "signalement" DROP COLUMN IF EXISTS "id_commune";
ALTER TABLE "dossier_traitement" DROP COLUMN IF EXISTS "id_commune";
DROP TABLE IF EXISTS "commune" CASCADE;
DROP TABLE IF EXISTS "departement" CASCADE;
DROP TABLE IF EXISTS "region" CASCADE;

-- 11. Retirer les colonnes qui appartiennent aux workflows abandonnés.
ALTER TABLE "utilisateur" DROP COLUMN IF EXISTS "reference_avatar";
ALTER TABLE "dossier_traitement" DROP COLUMN IF EXISTS "date_qualification";
ALTER TABLE "verification"
  DROP COLUMN IF EXISTS "etat_verification",
  DROP COLUMN IF EXISTS "reference_preuve";

ALTER TABLE "type_dechet"
  DROP COLUMN "orientation_specialisee",
  DROP COLUMN "date_debut_validite",
  DROP COLUMN "date_fin_validite";

ALTER TABLE "competence_equipe"
  DROP COLUMN "date_debut",
  DROP COLUMN "date_fin",
  DROP COLUMN "validee_par";

ALTER TABLE "contenu_signalement"
  DROP COLUMN IF EXISTS "quantite_estimee_legacy";

ALTER TABLE "contenu_dossier"
  DROP COLUMN IF EXISTS "quantite_estimee_legacy",
  DROP COLUMN IF EXISTS "niveau_risque_qualifie",
  DROP COLUMN IF EXISTS "qualifie_par",
  DROP COLUMN IF EXISTS "date_qualification",
  DROP COLUMN IF EXISTS "date_attente_equipe",
  DROP COLUMN IF EXISTS "motif_attente_equipe",
  DROP COLUMN IF EXISTS "date_retrait",
  DROP COLUMN IF EXISTS "retire_par",
  DROP COLUMN IF EXISTS "motif_retrait",
  DROP COLUMN IF EXISTS "origine_ajout",
  DROP COLUMN IF EXISTS "motif_ajout";

ALTER TABLE "photo_signalement"
  DROP COLUMN IF EXISTS "media_stockee_locale",
  DROP COLUMN IF EXISTS "etat_publication",
  DROP COLUMN IF EXISTS "reference_photo_publique",
  DROP COLUMN IF EXISTS "floutage_confirme",
  DROP COLUMN IF EXISTS "variante_soumise_par",
  DROP COLUMN IF EXISTS "date_soumission_variante",
  DROP COLUMN IF EXISTS "approuve_par",
  DROP COLUMN IF EXISTS "date_approbation";

ALTER TABLE "photo_intervention"
  DROP COLUMN IF EXISTS "media_stockee_locale",
  DROP COLUMN IF EXISTS "etat_publication",
  DROP COLUMN IF EXISTS "reference_photo_publique",
  DROP COLUMN IF EXISTS "floutage_confirme",
  DROP COLUMN IF EXISTS "variante_soumise_par",
  DROP COLUMN IF EXISTS "date_soumission_variante",
  DROP COLUMN IF EXISTS "approuve_par",
  DROP COLUMN IF EXISTS "date_approbation";

-- 12. Réduire les champs de liaison Affectation.
ALTER TABLE "affectation"
  DROP CONSTRAINT IF EXISTS "affectation_id_dossier_id_type_dechet_fkey",
  DROP CONSTRAINT IF EXISTS "affectation_id_competence_equipe_id_equipe_id_type_dechet_fkey";
ALTER TABLE "affectation"
  ADD CONSTRAINT "affectation_id_contenu_dossier_fkey"
  FOREIGN KEY ("id_contenu_dossier") REFERENCES "contenu_dossier"("id_contenu_dossier")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "affectation"
  ADD CONSTRAINT "affectation_id_competence_equipe_fkey"
  FOREIGN KEY ("id_competence_equipe") REFERENCES "competence_equipe"("id_competence_equipe")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "affectation"
  DROP COLUMN "id_dossier",
  DROP COLUMN "id_type_dechet";

-- 13. Lier Verification à Intervention et rendre la relation unique.
ALTER TABLE "verification"
  DROP CONSTRAINT IF EXISTS "verification_resolution_id_affectation_fkey",
  DROP COLUMN IF EXISTS "id_affectation";
ALTER TABLE "verification"
  ADD CONSTRAINT "verification_id_intervention_fkey"
  FOREIGN KEY ("id_intervention") REFERENCES "intervention"("id_intervention")
  ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE UNIQUE INDEX "verification_id_intervention_key"
  ON "verification"("id_intervention");

-- 14. Références et index du modèle simplifié.
ALTER TABLE "signalement"
  ADD CONSTRAINT "signalement_id_dossier_fkey"
  FOREIGN KEY ("id_dossier") REFERENCES "dossier_traitement"("id_dossier")
  ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "contenu_signalement"
  ADD CONSTRAINT "contenu_signalement_qualifie_par_fkey"
  FOREIGN KEY ("qualifie_par") REFERENCES "utilisateur"("id_utilisateur")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "historique_statut_signalement"
  ADD CONSTRAINT "historique_statut_signalement_id_signalement_fkey"
  FOREIGN KEY ("id_signalement") REFERENCES "signalement"("id_signalement")
  ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "historique_statut_signalement_id_utilisateur_fkey"
  FOREIGN KEY ("id_utilisateur") REFERENCES "utilisateur"("id_utilisateur")
  ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "demande_complement"
  ADD CONSTRAINT "demande_complement_repondu_par_fkey"
  FOREIGN KEY ("repondu_par") REFERENCES "utilisateur"("id_utilisateur")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE UNIQUE INDEX "competence_equipe_id_equipe_id_type_dechet_key"
  ON "competence_equipe" ("id_equipe", "id_type_dechet");
CREATE INDEX "contenu_signalement_report_qualification_idx"
  ON "contenu_signalement" ("id_signalement", "etat_qualification");
CREATE INDEX "contenu_dossier_case_content_state_idx"
  ON "contenu_dossier" ("id_dossier", "etat_contenu_dossier", "etat_prise_en_charge");
CREATE INDEX "affectation_content_closure_idx"
  ON "affectation" ("id_contenu_dossier", "date_fin_affectation");
CREATE INDEX "verification_date_idx"
  ON "verification" ("date_verification");
CREATE UNIQUE INDEX "affectation_one_open_per_content_idx"
  ON "affectation" ("id_contenu_dossier")
  WHERE "date_fin_affectation" IS NULL;

CREATE INDEX "signalement_id_dossier_statut_idx"
  ON "signalement" ("id_dossier", "statut_signalement");
CREATE INDEX "historique_statut_signalement_date_idx"
  ON "historique_statut_signalement" ("id_signalement", "date_changement");

-- Les nouvelles tables métier restent privées : pas d'accès direct via Data API Supabase.
ALTER TABLE "historique_statut_signalement" ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE "historique_statut_signalement" FROM PUBLIC;
DO $lockdown$
DECLARE
  grantee TEXT;
BEGIN
  FOREACH grantee IN ARRAY ARRAY['anon', 'authenticated', 'service_role'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = grantee) THEN
      EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public.%I FROM %I',
        'historique_statut_signalement', grantee);
    END IF;
  END LOOP;
END
$lockdown$;

-- 15. Retirer les champs historiques absents du nouveau modèle physique.
ALTER TABLE "utilisateur"
  DROP COLUMN IF EXISTS "reference_avatar";

ALTER TABLE "dossier_traitement"
  DROP COLUMN IF EXISTS "date_qualification";

ALTER TABLE "verification"
  DROP COLUMN IF EXISTS "etat_verification",
  DROP COLUMN IF EXISTS "reference_preuve";

-- UUIDs introduced for merged tables are generated by Prisma Client.
ALTER TABLE "historique_statut_signalement"
  ALTER COLUMN "id_historique_statut" DROP DEFAULT;
ALTER TABLE "contenu_signalement"
  ALTER COLUMN "id_contenu_signalement" DROP DEFAULT;
ALTER TABLE "contenu_dossier"
  ALTER COLUMN "id_contenu_dossier" DROP DEFAULT;

-- The idempotency key now lives on Signalement itself.
CREATE UNIQUE INDEX "signalement_id_utilisateur_cle_idempotence_key"
  ON "signalement" ("id_utilisateur", "cle_idempotence");
