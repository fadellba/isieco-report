-- Socle identités métier et habilitations. Les identifiants et sessions restent
-- gérés par Supabase Auth ; auth_user_id référence auth.users(id) sans recopier
-- les secrets d'authentification.

CREATE TABLE "utilisateur" (
    "id_utilisateur" UUID NOT NULL DEFAULT gen_random_uuid(),
    "auth_user_id" UUID NOT NULL,
    "nom" TEXT NOT NULL,
    "prenom" TEXT,
    "reference_avatar" TEXT,
    "email" TEXT NOT NULL,
    "telephone" TEXT,
    "date_inscription" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "etat_compte" TEXT NOT NULL DEFAULT 'ACTIF',
    CONSTRAINT "utilisateur_pkey" PRIMARY KEY ("id_utilisateur")
);

CREATE TABLE "role" (
    "id_role" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code_role" TEXT NOT NULL,
    "libelle_role" TEXT NOT NULL,
    "description" TEXT,
    CONSTRAINT "role_pkey" PRIMARY KEY ("id_role")
);

CREATE TABLE "utilisateur_role" (
    "id_utilisateur" UUID NOT NULL,
    "id_role" UUID NOT NULL,
    "date_debut" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "date_fin" TIMESTAMP(3),
    "attribue_par" UUID,
    "motif" TEXT,
    CONSTRAINT "utilisateur_role_pkey" PRIMARY KEY ("id_utilisateur", "id_role", "date_debut")
);

CREATE UNIQUE INDEX "utilisateur_auth_user_id_key" ON "utilisateur"("auth_user_id");
CREATE UNIQUE INDEX "utilisateur_email_key" ON "utilisateur"("email");
CREATE UNIQUE INDEX "role_code_role_key" ON "role"("code_role");
CREATE INDEX "utilisateur_role_id_role_date_fin_idx" ON "utilisateur_role"("id_role", "date_fin");

ALTER TABLE "utilisateur_role"
  ADD CONSTRAINT "utilisateur_role_id_utilisateur_fkey"
  FOREIGN KEY ("id_utilisateur") REFERENCES "utilisateur"("id_utilisateur")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "utilisateur_role"
  ADD CONSTRAINT "utilisateur_role_id_role_fkey"
  FOREIGN KEY ("id_role") REFERENCES "role"("id_role")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "utilisateur_role"
  ADD CONSTRAINT "utilisateur_role_attribue_par_fkey"
  FOREIGN KEY ("attribue_par") REFERENCES "utilisateur"("id_utilisateur")
  ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "role" ("code_role", "libelle_role", "description") VALUES
  ('CITOYEN', 'Citoyen', 'Dépose et suit ses signalements.'),
  ('AGENT_QUALIFICATION', 'Agent de qualification', 'Analyse et qualifie les signalements.'),
  ('RESPONSABLE_TRAITEMENT', 'Responsable de traitement', 'Pilote le traitement des dossiers.'),
  ('RESPONSABLE_AFFECTATION', 'Responsable d’affectation', 'Affecte les interventions aux équipes.'),
  ('AGENT_TERRAIN', 'Agent de terrain', 'Exécute et documente les interventions.'),
  ('VERIFICATEUR_CLOTURE', 'Vérificateur / responsable de clôture', 'Vérifie les résultats et autorise la clôture.'),
  ('GESTIONNAIRE_REFERENTIEL', 'Gestionnaire de référentiel', 'Administre les référentiels métier.'),
  ('ADMINISTRATEUR_COMPTES', 'Administrateur des comptes', 'Gère les comptes et les habilitations.')
ON CONFLICT ("code_role") DO NOTHING;
