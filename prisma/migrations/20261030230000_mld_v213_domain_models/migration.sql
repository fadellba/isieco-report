-- AlterTable
ALTER TABLE "role" ALTER COLUMN "id_role" DROP DEFAULT;

-- AlterTable
ALTER TABLE "utilisateur" ALTER COLUMN "id_utilisateur" DROP DEFAULT;

-- CreateTable
CREATE TABLE "type_dechet" (
    "id_type_dechet" UUID NOT NULL,
    "code_type" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "description" TEXT,
    "orientation_specialisee" BOOLEAN NOT NULL,
    "date_debut_validite" TIMESTAMP(3) NOT NULL,
    "date_fin_validite" TIMESTAMP(3),

    CONSTRAINT "type_dechet_pkey" PRIMARY KEY ("id_type_dechet")
);

-- CreateTable
CREATE TABLE "equipe" (
    "id_equipe" UUID NOT NULL,
    "nom_equipe" TEXT NOT NULL,
    "description" TEXT,
    "etat_equipe" TEXT NOT NULL,

    CONSTRAINT "equipe_pkey" PRIMARY KEY ("id_equipe")
);

-- CreateTable
CREATE TABLE "appartenance_equipe" (
    "id_utilisateur" UUID NOT NULL,
    "id_equipe" UUID NOT NULL,
    "date_debut" TIMESTAMP(3) NOT NULL,
    "date_fin" TIMESTAMP(3),
    "fonction" TEXT NOT NULL,

    CONSTRAINT "appartenance_equipe_pkey" PRIMARY KEY ("id_utilisateur","id_equipe","date_debut")
);

-- CreateTable
CREATE TABLE "competence_equipe" (
    "id_competence_equipe" UUID NOT NULL,
    "id_equipe" UUID NOT NULL,
    "id_type_dechet" UUID NOT NULL,
    "date_debut" TIMESTAMP(3) NOT NULL,
    "date_fin" TIMESTAMP(3),
    "commentaire" TEXT,
    "validee_par" UUID,

    CONSTRAINT "competence_equipe_pkey" PRIMARY KEY ("id_competence_equipe")
);

-- CreateTable
CREATE TABLE "signalement" (
    "id_signalement" UUID NOT NULL,
    "id_utilisateur" UUID NOT NULL,
    "date_constat" TIMESTAMP(3),
    "date_soumission" TIMESTAMP(3),
    "description" TEXT,
    "id_commune" UUID,
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "precision_localisation" DECIMAL(9,2),
    "description_localisation" TEXT,
    "statut_signalement" TEXT NOT NULL,
    "decision_par" UUID,
    "date_decision" TIMESTAMP(3),
    "motif_decision" TEXT,

    CONSTRAINT "signalement_pkey" PRIMARY KEY ("id_signalement")
);

-- CreateTable
CREATE TABLE "photo_signalement" (
    "id_photo_signalement" UUID NOT NULL,
    "reference_photo" TEXT NOT NULL,
    "description" TEXT,
    "date_ajout" TIMESTAMP(3) NOT NULL,
    "id_signalement" UUID NOT NULL,
    "date_expiration" TIMESTAMP(3) NOT NULL,
    "media_purge_at" TIMESTAMP(3),
    "media_stockee_locale" BOOLEAN NOT NULL,
    "etat_publication" TEXT NOT NULL,
    "reference_photo_publique" TEXT,
    "floutage_confirme" BOOLEAN NOT NULL,
    "variante_soumise_par" UUID,
    "date_soumission_variante" TIMESTAMP(3),
    "approuve_par" UUID,
    "date_approbation" TIMESTAMP(3),

    CONSTRAINT "photo_signalement_pkey" PRIMARY KEY ("id_photo_signalement")
);

-- CreateTable
CREATE TABLE "contenu_signalement" (
    "id_signalement" UUID NOT NULL,
    "id_type_dechet" UUID NOT NULL,
    "quantite_estimee" DECIMAL(12,3),
    "volume_estime" DECIMAL(12,3),
    "remarque" TEXT,

    CONSTRAINT "contenu_signalement_pkey" PRIMARY KEY ("id_signalement","id_type_dechet")
);

-- CreateTable
CREATE TABLE "dossier_traitement" (
    "id_dossier" UUID NOT NULL,
    "reference_dossier" TEXT NOT NULL,
    "description_synthese" TEXT NOT NULL,
    "date_creation_dossier" TIMESTAMP(3) NOT NULL,
    "statut_dossier" TEXT NOT NULL,
    "priorite" TEXT NOT NULL,
    "date_qualification" TIMESTAMP(3),
    "id_commune" UUID,
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "precision_localisation" DECIMAL(9,2),
    "description_localisation" TEXT,
    "date_cloture" TIMESTAMP(3),
    "cree_par" UUID NOT NULL,

    CONSTRAINT "dossier_traitement_pkey" PRIMARY KEY ("id_dossier")
);

-- CreateTable
CREATE TABLE "rattachement_signalement" (
    "id_rattachement" UUID NOT NULL,
    "id_signalement" UUID NOT NULL,
    "id_dossier" UUID NOT NULL,
    "date_debut_rattachement" TIMESTAMP(3) NOT NULL,
    "date_fin_rattachement" TIMESTAMP(3),
    "type_rattachement" TEXT NOT NULL,
    "motif" TEXT,
    "id_acteur" UUID NOT NULL,

    CONSTRAINT "rattachement_signalement_pkey" PRIMARY KEY ("id_rattachement")
);

-- CreateTable
CREATE TABLE "contenu_dossier" (
    "id_dossier" UUID NOT NULL,
    "id_type_dechet" UUID NOT NULL,
    "quantite_estimee" DECIMAL(12,3),
    "unite_quantite" TEXT,
    "quantite_estimee_legacy" DECIMAL(12,3),
    "volume_estime" DECIMAL(12,3),
    "niveau_risque_qualifie" TEXT,
    "remarque" TEXT,
    "qualifie_par" UUID,
    "date_qualification" TIMESTAMP(3),
    "etat_contenu_dossier" TEXT NOT NULL,
    "etat_prise_en_charge" TEXT NOT NULL,
    "date_attente_equipe" TIMESTAMP(3),
    "motif_attente_equipe" TEXT,
    "date_retrait" TIMESTAMP(3),
    "retire_par" UUID,
    "motif_retrait" TEXT,
    "origine_ajout" TEXT NOT NULL,
    "motif_ajout" TEXT,

    CONSTRAINT "contenu_dossier_pkey" PRIMARY KEY ("id_dossier","id_type_dechet")
);

-- CreateTable
CREATE TABLE "affectation" (
    "id_affectation" UUID NOT NULL,
    "id_dossier" UUID NOT NULL,
    "id_type_dechet" UUID NOT NULL,
    "id_equipe" UUID NOT NULL,
    "id_competence_equipe" UUID NOT NULL,
    "date_heure_affectation" TIMESTAMP(3) NOT NULL,
    "id_decideur" UUID NOT NULL,
    "etat_affectation" TEXT NOT NULL,
    "motif" TEXT,
    "observation" TEXT,
    "date_fin_affectation" TIMESTAMP(3),
    "decision_equipe" TEXT NOT NULL,
    "repondu_par" UUID,
    "date_reponse_equipe" TIMESTAMP(3),
    "motif_refus_equipe" TEXT,
    "reference_operation_unique" TEXT,

    CONSTRAINT "affectation_pkey" PRIMARY KEY ("id_affectation")
);

-- CreateTable
CREATE TABLE "intervention" (
    "id_intervention" UUID NOT NULL,
    "id_affectation" UUID NOT NULL,
    "date_heure_debut" TIMESTAMP(3),
    "date_heure_fin" TIMESTAMP(3),
    "date_soumission_compte_rendu" TIMESTAMP(3),
    "statut_intervention" TEXT NOT NULL,
    "resultat_intervention" TEXT,
    "compte_rendu" TEXT,
    "motif_exception" TEXT,
    "renseigne_par" UUID NOT NULL,

    CONSTRAINT "intervention_pkey" PRIMARY KEY ("id_intervention")
);

-- CreateTable
CREATE TABLE "photo_intervention" (
    "id_photo_intervention" UUID NOT NULL,
    "id_intervention" UUID NOT NULL,
    "reference_photo" TEXT NOT NULL,
    "contexte_photo" TEXT NOT NULL,
    "description" TEXT,
    "date_ajout" TIMESTAMP(3) NOT NULL,
    "date_expiration" TIMESTAMP(3) NOT NULL,
    "media_purge_at" TIMESTAMP(3),
    "media_stockee_locale" BOOLEAN NOT NULL,
    "etat_publication" TEXT NOT NULL,
    "reference_photo_publique" TEXT,
    "floutage_confirme" BOOLEAN NOT NULL,
    "variante_soumise_par" UUID,
    "date_soumission_variante" TIMESTAMP(3),
    "approuve_par" UUID,
    "date_approbation" TIMESTAMP(3),

    CONSTRAINT "photo_intervention_pkey" PRIMARY KEY ("id_photo_intervention")
);

-- CreateTable
CREATE TABLE "verification_resolution" (
    "id_verification" UUID NOT NULL,
    "id_affectation" UUID NOT NULL,
    "id_verificateur" UUID NOT NULL,
    "date_verification" TIMESTAMP(3) NOT NULL,
    "resultat_verification" TEXT NOT NULL,
    "etat_verification" TEXT NOT NULL,
    "motif" TEXT,
    "reference_preuve" TEXT,

    CONSTRAINT "verification_resolution_pkey" PRIMARY KEY ("id_verification")
);

-- CreateTable
CREATE TABLE "evenement_metier" (
    "id_evenement" UUID NOT NULL,
    "type_evenement" TEXT NOT NULL,
    "date_evenement" TIMESTAMP(3),
    "date_enregistrement" TIMESTAMP(3) NOT NULL,
    "origine" TEXT NOT NULL,
    "id_acteur" UUID,
    "id_signalement_cible" UUID,
    "id_dossier_cible" UUID,
    "id_rattachement_cible" UUID,
    "id_affectation_cible" UUID,
    "id_intervention_cible" UUID,
    "id_verification_cible" UUID,
    "id_utilisateur_cible" UUID,
    "id_equipe_cible" UUID,
    "id_type_dechet_cible" UUID,
    "id_competence_equipe_cible" UUID,
    "id_dossier_contenu_cible" UUID,
    "id_type_dechet_contenu_cible" UUID,
    "id_evenement_corrige" UUID,
    "donnees_avant" JSONB,
    "donnees_apres" JSONB,
    "destinataire_externe" TEXT,
    "motif" TEXT,
    "correlation_id" UUID,
    "reference_operation_unique" TEXT,
    "version_schema" INTEGER NOT NULL,

    CONSTRAINT "evenement_metier_pkey" PRIMARY KEY ("id_evenement")
);

-- CreateTable
CREATE TABLE "demande_complement" (
    "id_demande" UUID NOT NULL,
    "id_signalement" UUID NOT NULL,
    "demande_par" UUID NOT NULL,
    "date_demande" TIMESTAMP(3) NOT NULL,
    "motif" TEXT NOT NULL,
    "etat_demande" TEXT NOT NULL,

    CONSTRAINT "demande_complement_pkey" PRIMARY KEY ("id_demande")
);

-- CreateTable
CREATE TABLE "reponse_complement" (
    "id_reponse" UUID NOT NULL,
    "id_demande" UUID NOT NULL,
    "repondu_par" UUID NOT NULL,
    "date_reponse" TIMESTAMP(3) NOT NULL,
    "contenu" TEXT NOT NULL,

    CONSTRAINT "reponse_complement_pkey" PRIMARY KEY ("id_reponse")
);

-- CreateTable
CREATE TABLE "qualification_signalement" (
    "id_qualification" UUID NOT NULL,
    "id_signalement" UUID NOT NULL,
    "id_type_dechet" UUID NOT NULL,
    "quantite_estimee" DECIMAL(12,3),
    "unite_quantite" TEXT,
    "quantite_estimee_legacy" DECIMAL(12,3),
    "volume_estime" DECIMAL(12,3),
    "remarque" TEXT,
    "qualifie_par" UUID NOT NULL,
    "date_qualification" TIMESTAMP(3) NOT NULL,
    "etat_qualification" TEXT NOT NULL,
    "motif_retrait" TEXT,

    CONSTRAINT "qualification_signalement_pkey" PRIMARY KEY ("id_qualification")
);

-- CreateTable
CREATE TABLE "provenance_contenu_dossier" (
    "id_dossier" UUID NOT NULL,
    "id_type_dechet" UUID NOT NULL,
    "id_qualification" UUID NOT NULL,
    "date_debut" TIMESTAMP(3) NOT NULL,
    "id_signalement" UUID NOT NULL,
    "id_rattachement" UUID NOT NULL,
    "ajoute_par" UUID NOT NULL,
    "date_fin" TIMESTAMP(3),
    "motif" TEXT,

    CONSTRAINT "provenance_contenu_dossier_pkey" PRIMARY KEY ("id_dossier","id_type_dechet","id_qualification","date_debut")
);

-- CreateTable
CREATE TABLE "idempotence_signalement" (
    "id_utilisateur" UUID NOT NULL,
    "cle_idempotence" TEXT NOT NULL,
    "empreinte_requete" TEXT NOT NULL,
    "id_signalement" UUID NOT NULL,
    "date_creation" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "idempotence_signalement_pkey" PRIMARY KEY ("id_utilisateur","cle_idempotence")
);

-- CreateTable
CREATE TABLE "region" (
    "id_region" UUID NOT NULL,
    "code_region" TEXT,
    "nom_region" TEXT NOT NULL,
    "actif" BOOLEAN NOT NULL,

    CONSTRAINT "region_pkey" PRIMARY KEY ("id_region")
);

-- CreateTable
CREATE TABLE "departement" (
    "id_departement" UUID NOT NULL,
    "id_region" UUID NOT NULL,
    "code_departement" TEXT,
    "nom_departement" TEXT NOT NULL,
    "actif" BOOLEAN NOT NULL,

    CONSTRAINT "departement_pkey" PRIMARY KEY ("id_departement")
);

-- CreateTable
CREATE TABLE "commune" (
    "id_commune" UUID NOT NULL,
    "id_departement" UUID NOT NULL,
    "code_commune" TEXT,
    "nom_commune" TEXT NOT NULL,
    "actif" BOOLEAN NOT NULL,

    CONSTRAINT "commune_pkey" PRIMARY KEY ("id_commune")
);

-- CreateTable
CREATE TABLE "delegation_decision_equipe" (
    "id_delegation" UUID NOT NULL,
    "id_equipe" UUID NOT NULL,
    "id_utilisateur_delegue" UUID NOT NULL,
    "date_debut_appartenance" TIMESTAMP(3) NOT NULL,
    "type_decision" TEXT NOT NULL,
    "delegue_par" UUID NOT NULL,
    "date_debut" TIMESTAMP(3) NOT NULL,
    "date_fin" TIMESTAMP(3),
    "motif" TEXT,

    CONSTRAINT "delegation_decision_equipe_pkey" PRIMARY KEY ("id_delegation")
);

-- CreateTable
CREATE TABLE "disponibilite_equipe" (
    "id_equipe" UUID NOT NULL,
    "etat_disponibilite" TEXT NOT NULL,
    "mise_a_jour_par" UUID NOT NULL,
    "date_mise_a_jour" TIMESTAMP(3) NOT NULL,
    "valide_jusqua" TIMESTAMP(3) NOT NULL,
    "commentaire" TEXT,

    CONSTRAINT "disponibilite_equipe_pkey" PRIMARY KEY ("id_equipe")
);

-- CreateTable
CREATE TABLE "historique_disponibilite_equipe" (
    "id_historique" UUID NOT NULL,
    "id_equipe" UUID NOT NULL,
    "etat_disponibilite" TEXT NOT NULL,
    "mise_a_jour_par" UUID NOT NULL,
    "date_mise_a_jour" TIMESTAMP(3) NOT NULL,
    "valide_jusqua" TIMESTAMP(3) NOT NULL,
    "commentaire" TEXT,

    CONSTRAINT "historique_disponibilite_equipe_pkey" PRIMARY KEY ("id_historique")
);

-- CreateTable
CREATE TABLE "historique_localisation_dossier" (
    "id_historique" UUID NOT NULL,
    "id_dossier" UUID NOT NULL,
    "id_commune" UUID,
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "precision_localisation" DECIMAL(9,2),
    "description_localisation" TEXT,
    "modifie_par" UUID NOT NULL,
    "date_modification" TIMESTAMP(3) NOT NULL,
    "motif" TEXT,

    CONSTRAINT "historique_localisation_dossier_pkey" PRIMARY KEY ("id_historique")
);

-- CreateTable
CREATE TABLE "historique_priorite_dossier" (
    "id_historique" UUID NOT NULL,
    "id_dossier" UUID NOT NULL,
    "priorite" TEXT NOT NULL,
    "definie_par" UUID NOT NULL,
    "date_definition" TIMESTAMP(3) NOT NULL,
    "justification" TEXT NOT NULL,

    CONSTRAINT "historique_priorite_dossier_pkey" PRIMARY KEY ("id_historique")
);

-- CreateTable
CREATE TABLE "historique_points" (
    "id_point" UUID NOT NULL,
    "id_utilisateur" UUID NOT NULL,
    "id_signalement" UUID,
    "points" INTEGER NOT NULL,
    "date_attribution" TIMESTAMP(3) NOT NULL,
    "motif" TEXT NOT NULL,
    "type_mouvement" TEXT NOT NULL,
    "id_point_origine" UUID,

    CONSTRAINT "historique_points_pkey" PRIMARY KEY ("id_point")
);

-- CreateTable
CREATE TABLE "notification" (
    "id_notification" UUID NOT NULL,
    "id_utilisateur" UUID NOT NULL,
    "titre" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "lu" BOOLEAN NOT NULL,
    "date_creation" TIMESTAMP(3) NOT NULL,
    "lien_cible" TEXT,

    CONSTRAINT "notification_pkey" PRIMARY KEY ("id_notification")
);

-- CreateTable
CREATE TABLE "preferences_visibilite_citoyen" (
    "id_utilisateur" UUID NOT NULL,
    "afficher_avatar" BOOLEAN NOT NULL,
    "afficher_nom_public" BOOLEAN NOT NULL,
    "nom_public" TEXT,
    "afficher_points" BOOLEAN NOT NULL,
    "afficher_rang" BOOLEAN NOT NULL,
    "afficher_badges" BOOLEAN NOT NULL,
    "participer_classement" BOOLEAN NOT NULL,

    CONSTRAINT "preferences_visibilite_citoyen_pkey" PRIMARY KEY ("id_utilisateur")
);

-- CreateTable
CREATE TABLE "badge" (
    "id_badge" UUID NOT NULL,
    "code_badge" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "description" TEXT,
    "actif" BOOLEAN NOT NULL,

    CONSTRAINT "badge_pkey" PRIMARY KEY ("id_badge")
);

-- CreateTable
CREATE TABLE "badge_utilisateur" (
    "id_utilisateur" UUID NOT NULL,
    "id_badge" UUID NOT NULL,
    "date_attribution" TIMESTAMP(3) NOT NULL,
    "attribue_par" UUID,
    "motif" TEXT,

    CONSTRAINT "badge_utilisateur_pkey" PRIMARY KEY ("id_utilisateur","id_badge","date_attribution")
);

-- CreateTable
CREATE TABLE "publication_flux" (
    "id_publication" UUID NOT NULL,
    "id_signalement" UUID,
    "id_dossier" UUID,
    "cree_par" UUID NOT NULL,
    "date_creation" TIMESTAMP(3) NOT NULL,
    "etat_publication" TEXT NOT NULL,
    "approuve_par" UUID,
    "date_approbation" TIMESTAMP(3),
    "date_publication" TIMESTAMP(3),
    "motif_decision" TEXT,

    CONSTRAINT "publication_flux_pkey" PRIMARY KEY ("id_publication")
);

-- CreateTable
CREATE TABLE "photo_publication" (
    "id_photo_publication" UUID NOT NULL,
    "id_publication" UUID NOT NULL,
    "id_photo_signalement" UUID,
    "id_photo_intervention" UUID,
    "role_photo" TEXT NOT NULL,
    "date_ajout" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "photo_publication_pkey" PRIMARY KEY ("id_photo_publication")
);

-- CreateIndex
CREATE UNIQUE INDEX "type_dechet_code_type_key" ON "type_dechet"("code_type");

-- CreateIndex
CREATE INDEX "appartenance_equipe_id_equipe_date_fin_idx" ON "appartenance_equipe"("id_equipe", "date_fin");

-- CreateIndex
CREATE INDEX "competence_equipe_id_equipe_date_fin_idx" ON "competence_equipe"("id_equipe", "date_fin");

-- CreateIndex
CREATE UNIQUE INDEX "competence_equipe_id_equipe_id_type_dechet_date_debut_key" ON "competence_equipe"("id_equipe", "id_type_dechet", "date_debut");

-- CreateIndex
CREATE UNIQUE INDEX "competence_equipe_id_competence_equipe_id_equipe_id_type_de_key" ON "competence_equipe"("id_competence_equipe", "id_equipe", "id_type_dechet");

-- CreateIndex
CREATE INDEX "signalement_id_utilisateur_date_soumission_idx" ON "signalement"("id_utilisateur", "date_soumission");

-- CreateIndex
CREATE INDEX "signalement_id_commune_statut_signalement_idx" ON "signalement"("id_commune", "statut_signalement");

-- CreateIndex
CREATE INDEX "photo_signalement_id_signalement_date_ajout_idx" ON "photo_signalement"("id_signalement", "date_ajout");

-- CreateIndex
CREATE INDEX "photo_signalement_date_expiration_media_purge_at_idx" ON "photo_signalement"("date_expiration", "media_purge_at");

-- CreateIndex
CREATE UNIQUE INDEX "dossier_traitement_reference_dossier_key" ON "dossier_traitement"("reference_dossier");

-- CreateIndex
CREATE INDEX "dossier_traitement_statut_dossier_priorite_idx" ON "dossier_traitement"("statut_dossier", "priorite");

-- CreateIndex
CREATE INDEX "dossier_traitement_id_commune_date_creation_dossier_idx" ON "dossier_traitement"("id_commune", "date_creation_dossier");

-- CreateIndex
CREATE INDEX "rattachement_signalement_id_signalement_date_fin_rattacheme_idx" ON "rattachement_signalement"("id_signalement", "date_fin_rattachement");

-- CreateIndex
CREATE INDEX "rattachement_signalement_id_dossier_date_debut_rattachement_idx" ON "rattachement_signalement"("id_dossier", "date_debut_rattachement");

-- CreateIndex
CREATE UNIQUE INDEX "affectation_reference_operation_unique_key" ON "affectation"("reference_operation_unique");

-- CreateIndex
CREATE INDEX "affectation_id_dossier_id_type_dechet_date_fin_affectation_idx" ON "affectation"("id_dossier", "id_type_dechet", "date_fin_affectation");

-- CreateIndex
CREATE INDEX "affectation_id_equipe_etat_affectation_idx" ON "affectation"("id_equipe", "etat_affectation");

-- CreateIndex
CREATE INDEX "intervention_id_affectation_statut_intervention_idx" ON "intervention"("id_affectation", "statut_intervention");

-- CreateIndex
CREATE INDEX "photo_intervention_id_intervention_date_ajout_idx" ON "photo_intervention"("id_intervention", "date_ajout");

-- CreateIndex
CREATE INDEX "photo_intervention_date_expiration_media_purge_at_idx" ON "photo_intervention"("date_expiration", "media_purge_at");

-- CreateIndex
CREATE INDEX "verification_resolution_id_affectation_etat_verification_idx" ON "verification_resolution"("id_affectation", "etat_verification");

-- CreateIndex
CREATE UNIQUE INDEX "evenement_metier_reference_operation_unique_key" ON "evenement_metier"("reference_operation_unique");

-- CreateIndex
CREATE INDEX "evenement_metier_type_evenement_date_enregistrement_idx" ON "evenement_metier"("type_evenement", "date_enregistrement");

-- CreateIndex
CREATE INDEX "evenement_metier_id_dossier_cible_date_enregistrement_idx" ON "evenement_metier"("id_dossier_cible", "date_enregistrement");

-- CreateIndex
CREATE INDEX "evenement_metier_correlation_id_idx" ON "evenement_metier"("correlation_id");

-- CreateIndex
CREATE INDEX "demande_complement_id_signalement_etat_demande_idx" ON "demande_complement"("id_signalement", "etat_demande");

-- CreateIndex
CREATE UNIQUE INDEX "reponse_complement_id_demande_key" ON "reponse_complement"("id_demande");

-- CreateIndex
CREATE INDEX "qualification_signalement_id_signalement_date_qualification_idx" ON "qualification_signalement"("id_signalement", "date_qualification");

-- CreateIndex
CREATE UNIQUE INDEX "qualification_signalement_id_qualification_id_signalement_i_key" ON "qualification_signalement"("id_qualification", "id_signalement", "id_type_dechet");

-- CreateIndex
CREATE INDEX "provenance_contenu_dossier_id_signalement_id_rattachement_idx" ON "provenance_contenu_dossier"("id_signalement", "id_rattachement");

-- CreateIndex
CREATE UNIQUE INDEX "idempotence_signalement_id_signalement_key" ON "idempotence_signalement"("id_signalement");

-- CreateIndex
CREATE UNIQUE INDEX "region_code_region_key" ON "region"("code_region");

-- CreateIndex
CREATE UNIQUE INDEX "region_nom_region_key" ON "region"("nom_region");

-- CreateIndex
CREATE UNIQUE INDEX "departement_id_departement_id_region_key" ON "departement"("id_departement", "id_region");

-- CreateIndex
CREATE UNIQUE INDEX "departement_id_region_code_departement_key" ON "departement"("id_region", "code_departement");

-- CreateIndex
CREATE UNIQUE INDEX "departement_id_region_nom_departement_key" ON "departement"("id_region", "nom_departement");

-- CreateIndex
CREATE UNIQUE INDEX "commune_id_commune_id_departement_key" ON "commune"("id_commune", "id_departement");

-- CreateIndex
CREATE UNIQUE INDEX "commune_id_departement_code_commune_key" ON "commune"("id_departement", "code_commune");

-- CreateIndex
CREATE UNIQUE INDEX "commune_id_departement_nom_commune_key" ON "commune"("id_departement", "nom_commune");

-- CreateIndex
CREATE INDEX "delegation_decision_equipe_id_utilisateur_delegue_date_fin_idx" ON "delegation_decision_equipe"("id_utilisateur_delegue", "date_fin");

-- CreateIndex
CREATE UNIQUE INDEX "delegation_decision_equipe_id_equipe_id_utilisateur_delegue_key" ON "delegation_decision_equipe"("id_equipe", "id_utilisateur_delegue", "type_decision", "date_debut");

-- CreateIndex
CREATE INDEX "historique_disponibilite_equipe_id_equipe_date_mise_a_jour_idx" ON "historique_disponibilite_equipe"("id_equipe", "date_mise_a_jour");

-- CreateIndex
CREATE INDEX "historique_localisation_dossier_id_dossier_date_modificatio_idx" ON "historique_localisation_dossier"("id_dossier", "date_modification");

-- CreateIndex
CREATE INDEX "historique_priorite_dossier_id_dossier_date_definition_idx" ON "historique_priorite_dossier"("id_dossier", "date_definition");

-- CreateIndex
CREATE INDEX "historique_points_id_utilisateur_date_attribution_idx" ON "historique_points"("id_utilisateur", "date_attribution");

-- CreateIndex
CREATE INDEX "notification_id_utilisateur_lu_date_creation_idx" ON "notification"("id_utilisateur", "lu", "date_creation");

-- CreateIndex
CREATE UNIQUE INDEX "badge_code_badge_key" ON "badge"("code_badge");

-- CreateIndex
CREATE INDEX "publication_flux_etat_publication_date_creation_idx" ON "publication_flux"("etat_publication", "date_creation");

-- CreateIndex
CREATE UNIQUE INDEX "photo_publication_id_publication_id_photo_signalement_key" ON "photo_publication"("id_publication", "id_photo_signalement");

-- CreateIndex
CREATE UNIQUE INDEX "photo_publication_id_publication_id_photo_intervention_key" ON "photo_publication"("id_publication", "id_photo_intervention");

-- AddForeignKey
ALTER TABLE "appartenance_equipe" ADD CONSTRAINT "appartenance_equipe_id_utilisateur_fkey" FOREIGN KEY ("id_utilisateur") REFERENCES "utilisateur"("id_utilisateur") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appartenance_equipe" ADD CONSTRAINT "appartenance_equipe_id_equipe_fkey" FOREIGN KEY ("id_equipe") REFERENCES "equipe"("id_equipe") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competence_equipe" ADD CONSTRAINT "competence_equipe_id_equipe_fkey" FOREIGN KEY ("id_equipe") REFERENCES "equipe"("id_equipe") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competence_equipe" ADD CONSTRAINT "competence_equipe_id_type_dechet_fkey" FOREIGN KEY ("id_type_dechet") REFERENCES "type_dechet"("id_type_dechet") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competence_equipe" ADD CONSTRAINT "competence_equipe_validee_par_fkey" FOREIGN KEY ("validee_par") REFERENCES "utilisateur"("id_utilisateur") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "signalement" ADD CONSTRAINT "signalement_id_utilisateur_fkey" FOREIGN KEY ("id_utilisateur") REFERENCES "utilisateur"("id_utilisateur") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "signalement" ADD CONSTRAINT "signalement_id_commune_fkey" FOREIGN KEY ("id_commune") REFERENCES "commune"("id_commune") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "signalement" ADD CONSTRAINT "signalement_decision_par_fkey" FOREIGN KEY ("decision_par") REFERENCES "utilisateur"("id_utilisateur") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "photo_signalement" ADD CONSTRAINT "photo_signalement_id_signalement_fkey" FOREIGN KEY ("id_signalement") REFERENCES "signalement"("id_signalement") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "photo_signalement" ADD CONSTRAINT "photo_signalement_variante_soumise_par_fkey" FOREIGN KEY ("variante_soumise_par") REFERENCES "utilisateur"("id_utilisateur") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "photo_signalement" ADD CONSTRAINT "photo_signalement_approuve_par_fkey" FOREIGN KEY ("approuve_par") REFERENCES "utilisateur"("id_utilisateur") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contenu_signalement" ADD CONSTRAINT "contenu_signalement_id_signalement_fkey" FOREIGN KEY ("id_signalement") REFERENCES "signalement"("id_signalement") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contenu_signalement" ADD CONSTRAINT "contenu_signalement_id_type_dechet_fkey" FOREIGN KEY ("id_type_dechet") REFERENCES "type_dechet"("id_type_dechet") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dossier_traitement" ADD CONSTRAINT "dossier_traitement_id_commune_fkey" FOREIGN KEY ("id_commune") REFERENCES "commune"("id_commune") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dossier_traitement" ADD CONSTRAINT "dossier_traitement_cree_par_fkey" FOREIGN KEY ("cree_par") REFERENCES "utilisateur"("id_utilisateur") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rattachement_signalement" ADD CONSTRAINT "rattachement_signalement_id_signalement_fkey" FOREIGN KEY ("id_signalement") REFERENCES "signalement"("id_signalement") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rattachement_signalement" ADD CONSTRAINT "rattachement_signalement_id_dossier_fkey" FOREIGN KEY ("id_dossier") REFERENCES "dossier_traitement"("id_dossier") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rattachement_signalement" ADD CONSTRAINT "rattachement_signalement_id_acteur_fkey" FOREIGN KEY ("id_acteur") REFERENCES "utilisateur"("id_utilisateur") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contenu_dossier" ADD CONSTRAINT "contenu_dossier_id_dossier_fkey" FOREIGN KEY ("id_dossier") REFERENCES "dossier_traitement"("id_dossier") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contenu_dossier" ADD CONSTRAINT "contenu_dossier_id_type_dechet_fkey" FOREIGN KEY ("id_type_dechet") REFERENCES "type_dechet"("id_type_dechet") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contenu_dossier" ADD CONSTRAINT "contenu_dossier_qualifie_par_fkey" FOREIGN KEY ("qualifie_par") REFERENCES "utilisateur"("id_utilisateur") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contenu_dossier" ADD CONSTRAINT "contenu_dossier_retire_par_fkey" FOREIGN KEY ("retire_par") REFERENCES "utilisateur"("id_utilisateur") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affectation" ADD CONSTRAINT "affectation_id_dossier_id_type_dechet_fkey" FOREIGN KEY ("id_dossier", "id_type_dechet") REFERENCES "contenu_dossier"("id_dossier", "id_type_dechet") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affectation" ADD CONSTRAINT "affectation_id_equipe_fkey" FOREIGN KEY ("id_equipe") REFERENCES "equipe"("id_equipe") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affectation" ADD CONSTRAINT "affectation_id_competence_equipe_id_equipe_id_type_dechet_fkey" FOREIGN KEY ("id_competence_equipe", "id_equipe", "id_type_dechet") REFERENCES "competence_equipe"("id_competence_equipe", "id_equipe", "id_type_dechet") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affectation" ADD CONSTRAINT "affectation_id_decideur_fkey" FOREIGN KEY ("id_decideur") REFERENCES "utilisateur"("id_utilisateur") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affectation" ADD CONSTRAINT "affectation_repondu_par_fkey" FOREIGN KEY ("repondu_par") REFERENCES "utilisateur"("id_utilisateur") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intervention" ADD CONSTRAINT "intervention_id_affectation_fkey" FOREIGN KEY ("id_affectation") REFERENCES "affectation"("id_affectation") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intervention" ADD CONSTRAINT "intervention_renseigne_par_fkey" FOREIGN KEY ("renseigne_par") REFERENCES "utilisateur"("id_utilisateur") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "photo_intervention" ADD CONSTRAINT "photo_intervention_id_intervention_fkey" FOREIGN KEY ("id_intervention") REFERENCES "intervention"("id_intervention") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "photo_intervention" ADD CONSTRAINT "photo_intervention_variante_soumise_par_fkey" FOREIGN KEY ("variante_soumise_par") REFERENCES "utilisateur"("id_utilisateur") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "photo_intervention" ADD CONSTRAINT "photo_intervention_approuve_par_fkey" FOREIGN KEY ("approuve_par") REFERENCES "utilisateur"("id_utilisateur") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification_resolution" ADD CONSTRAINT "verification_resolution_id_affectation_fkey" FOREIGN KEY ("id_affectation") REFERENCES "affectation"("id_affectation") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification_resolution" ADD CONSTRAINT "verification_resolution_id_verificateur_fkey" FOREIGN KEY ("id_verificateur") REFERENCES "utilisateur"("id_utilisateur") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evenement_metier" ADD CONSTRAINT "evenement_metier_id_acteur_fkey" FOREIGN KEY ("id_acteur") REFERENCES "utilisateur"("id_utilisateur") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evenement_metier" ADD CONSTRAINT "evenement_metier_id_signalement_cible_fkey" FOREIGN KEY ("id_signalement_cible") REFERENCES "signalement"("id_signalement") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evenement_metier" ADD CONSTRAINT "evenement_metier_id_dossier_cible_fkey" FOREIGN KEY ("id_dossier_cible") REFERENCES "dossier_traitement"("id_dossier") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evenement_metier" ADD CONSTRAINT "evenement_metier_id_rattachement_cible_fkey" FOREIGN KEY ("id_rattachement_cible") REFERENCES "rattachement_signalement"("id_rattachement") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evenement_metier" ADD CONSTRAINT "evenement_metier_id_affectation_cible_fkey" FOREIGN KEY ("id_affectation_cible") REFERENCES "affectation"("id_affectation") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evenement_metier" ADD CONSTRAINT "evenement_metier_id_intervention_cible_fkey" FOREIGN KEY ("id_intervention_cible") REFERENCES "intervention"("id_intervention") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evenement_metier" ADD CONSTRAINT "evenement_metier_id_verification_cible_fkey" FOREIGN KEY ("id_verification_cible") REFERENCES "verification_resolution"("id_verification") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evenement_metier" ADD CONSTRAINT "evenement_metier_id_utilisateur_cible_fkey" FOREIGN KEY ("id_utilisateur_cible") REFERENCES "utilisateur"("id_utilisateur") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evenement_metier" ADD CONSTRAINT "evenement_metier_id_equipe_cible_fkey" FOREIGN KEY ("id_equipe_cible") REFERENCES "equipe"("id_equipe") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evenement_metier" ADD CONSTRAINT "evenement_metier_id_type_dechet_cible_fkey" FOREIGN KEY ("id_type_dechet_cible") REFERENCES "type_dechet"("id_type_dechet") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evenement_metier" ADD CONSTRAINT "evenement_metier_id_competence_equipe_cible_fkey" FOREIGN KEY ("id_competence_equipe_cible") REFERENCES "competence_equipe"("id_competence_equipe") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evenement_metier" ADD CONSTRAINT "evenement_metier_id_dossier_contenu_cible_id_type_dechet_c_fkey" FOREIGN KEY ("id_dossier_contenu_cible", "id_type_dechet_contenu_cible") REFERENCES "contenu_dossier"("id_dossier", "id_type_dechet") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evenement_metier" ADD CONSTRAINT "evenement_metier_id_evenement_corrige_fkey" FOREIGN KEY ("id_evenement_corrige") REFERENCES "evenement_metier"("id_evenement") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "demande_complement" ADD CONSTRAINT "demande_complement_id_signalement_fkey" FOREIGN KEY ("id_signalement") REFERENCES "signalement"("id_signalement") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "demande_complement" ADD CONSTRAINT "demande_complement_demande_par_fkey" FOREIGN KEY ("demande_par") REFERENCES "utilisateur"("id_utilisateur") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reponse_complement" ADD CONSTRAINT "reponse_complement_id_demande_fkey" FOREIGN KEY ("id_demande") REFERENCES "demande_complement"("id_demande") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reponse_complement" ADD CONSTRAINT "reponse_complement_repondu_par_fkey" FOREIGN KEY ("repondu_par") REFERENCES "utilisateur"("id_utilisateur") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qualification_signalement" ADD CONSTRAINT "qualification_signalement_id_signalement_fkey" FOREIGN KEY ("id_signalement") REFERENCES "signalement"("id_signalement") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qualification_signalement" ADD CONSTRAINT "qualification_signalement_id_type_dechet_fkey" FOREIGN KEY ("id_type_dechet") REFERENCES "type_dechet"("id_type_dechet") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qualification_signalement" ADD CONSTRAINT "qualification_signalement_qualifie_par_fkey" FOREIGN KEY ("qualifie_par") REFERENCES "utilisateur"("id_utilisateur") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provenance_contenu_dossier" ADD CONSTRAINT "provenance_contenu_dossier_id_dossier_id_type_dechet_fkey" FOREIGN KEY ("id_dossier", "id_type_dechet") REFERENCES "contenu_dossier"("id_dossier", "id_type_dechet") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provenance_contenu_dossier" ADD CONSTRAINT "provenance_contenu_dossier_id_qualification_id_signalement_fkey" FOREIGN KEY ("id_qualification", "id_signalement", "id_type_dechet") REFERENCES "qualification_signalement"("id_qualification", "id_signalement", "id_type_dechet") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provenance_contenu_dossier" ADD CONSTRAINT "provenance_contenu_dossier_id_signalement_fkey" FOREIGN KEY ("id_signalement") REFERENCES "signalement"("id_signalement") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provenance_contenu_dossier" ADD CONSTRAINT "provenance_contenu_dossier_id_rattachement_fkey" FOREIGN KEY ("id_rattachement") REFERENCES "rattachement_signalement"("id_rattachement") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provenance_contenu_dossier" ADD CONSTRAINT "provenance_contenu_dossier_ajoute_par_fkey" FOREIGN KEY ("ajoute_par") REFERENCES "utilisateur"("id_utilisateur") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "idempotence_signalement" ADD CONSTRAINT "idempotence_signalement_id_utilisateur_fkey" FOREIGN KEY ("id_utilisateur") REFERENCES "utilisateur"("id_utilisateur") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "idempotence_signalement" ADD CONSTRAINT "idempotence_signalement_id_signalement_fkey" FOREIGN KEY ("id_signalement") REFERENCES "signalement"("id_signalement") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "departement" ADD CONSTRAINT "departement_id_region_fkey" FOREIGN KEY ("id_region") REFERENCES "region"("id_region") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commune" ADD CONSTRAINT "commune_id_departement_fkey" FOREIGN KEY ("id_departement") REFERENCES "departement"("id_departement") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delegation_decision_equipe" ADD CONSTRAINT "delegation_decision_equipe_id_equipe_fkey" FOREIGN KEY ("id_equipe") REFERENCES "equipe"("id_equipe") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delegation_decision_equipe" ADD CONSTRAINT "delegation_decision_equipe_id_utilisateur_delegue_fkey" FOREIGN KEY ("id_utilisateur_delegue") REFERENCES "utilisateur"("id_utilisateur") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delegation_decision_equipe" ADD CONSTRAINT "delegation_decision_equipe_delegue_par_fkey" FOREIGN KEY ("delegue_par") REFERENCES "utilisateur"("id_utilisateur") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disponibilite_equipe" ADD CONSTRAINT "disponibilite_equipe_id_equipe_fkey" FOREIGN KEY ("id_equipe") REFERENCES "equipe"("id_equipe") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disponibilite_equipe" ADD CONSTRAINT "disponibilite_equipe_mise_a_jour_par_fkey" FOREIGN KEY ("mise_a_jour_par") REFERENCES "utilisateur"("id_utilisateur") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historique_disponibilite_equipe" ADD CONSTRAINT "historique_disponibilite_equipe_id_equipe_fkey" FOREIGN KEY ("id_equipe") REFERENCES "equipe"("id_equipe") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historique_disponibilite_equipe" ADD CONSTRAINT "historique_disponibilite_equipe_mise_a_jour_par_fkey" FOREIGN KEY ("mise_a_jour_par") REFERENCES "utilisateur"("id_utilisateur") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historique_localisation_dossier" ADD CONSTRAINT "historique_localisation_dossier_id_dossier_fkey" FOREIGN KEY ("id_dossier") REFERENCES "dossier_traitement"("id_dossier") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historique_localisation_dossier" ADD CONSTRAINT "historique_localisation_dossier_id_commune_fkey" FOREIGN KEY ("id_commune") REFERENCES "commune"("id_commune") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historique_localisation_dossier" ADD CONSTRAINT "historique_localisation_dossier_modifie_par_fkey" FOREIGN KEY ("modifie_par") REFERENCES "utilisateur"("id_utilisateur") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historique_priorite_dossier" ADD CONSTRAINT "historique_priorite_dossier_id_dossier_fkey" FOREIGN KEY ("id_dossier") REFERENCES "dossier_traitement"("id_dossier") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historique_priorite_dossier" ADD CONSTRAINT "historique_priorite_dossier_definie_par_fkey" FOREIGN KEY ("definie_par") REFERENCES "utilisateur"("id_utilisateur") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historique_points" ADD CONSTRAINT "historique_points_id_utilisateur_fkey" FOREIGN KEY ("id_utilisateur") REFERENCES "utilisateur"("id_utilisateur") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historique_points" ADD CONSTRAINT "historique_points_id_signalement_fkey" FOREIGN KEY ("id_signalement") REFERENCES "signalement"("id_signalement") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historique_points" ADD CONSTRAINT "historique_points_id_point_origine_fkey" FOREIGN KEY ("id_point_origine") REFERENCES "historique_points"("id_point") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification" ADD CONSTRAINT "notification_id_utilisateur_fkey" FOREIGN KEY ("id_utilisateur") REFERENCES "utilisateur"("id_utilisateur") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "preferences_visibilite_citoyen" ADD CONSTRAINT "preferences_visibilite_citoyen_id_utilisateur_fkey" FOREIGN KEY ("id_utilisateur") REFERENCES "utilisateur"("id_utilisateur") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "badge_utilisateur" ADD CONSTRAINT "badge_utilisateur_id_utilisateur_fkey" FOREIGN KEY ("id_utilisateur") REFERENCES "utilisateur"("id_utilisateur") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "badge_utilisateur" ADD CONSTRAINT "badge_utilisateur_id_badge_fkey" FOREIGN KEY ("id_badge") REFERENCES "badge"("id_badge") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "badge_utilisateur" ADD CONSTRAINT "badge_utilisateur_attribue_par_fkey" FOREIGN KEY ("attribue_par") REFERENCES "utilisateur"("id_utilisateur") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publication_flux" ADD CONSTRAINT "publication_flux_id_signalement_fkey" FOREIGN KEY ("id_signalement") REFERENCES "signalement"("id_signalement") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publication_flux" ADD CONSTRAINT "publication_flux_id_dossier_fkey" FOREIGN KEY ("id_dossier") REFERENCES "dossier_traitement"("id_dossier") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publication_flux" ADD CONSTRAINT "publication_flux_cree_par_fkey" FOREIGN KEY ("cree_par") REFERENCES "utilisateur"("id_utilisateur") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publication_flux" ADD CONSTRAINT "publication_flux_approuve_par_fkey" FOREIGN KEY ("approuve_par") REFERENCES "utilisateur"("id_utilisateur") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "photo_publication" ADD CONSTRAINT "photo_publication_id_publication_fkey" FOREIGN KEY ("id_publication") REFERENCES "publication_flux"("id_publication") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "photo_publication" ADD CONSTRAINT "photo_publication_id_photo_signalement_fkey" FOREIGN KEY ("id_photo_signalement") REFERENCES "photo_signalement"("id_photo_signalement") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "photo_publication" ADD CONSTRAINT "photo_publication_id_photo_intervention_fkey" FOREIGN KEY ("id_photo_intervention") REFERENCES "photo_intervention"("id_photo_intervention") ON DELETE RESTRICT ON UPDATE CASCADE;
