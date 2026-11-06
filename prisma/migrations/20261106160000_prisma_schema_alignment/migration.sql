-- Align legacy object names and remove one redundant unique index so
-- the deployed PostgreSQL schema matches prisma/schema.prisma exactly.
DROP INDEX public.competence_equipe_id_competence_equipe_id_equipe_id_type_de_key;

ALTER TABLE public.verification
  RENAME CONSTRAINT verification_resolution_pkey TO verification_pkey;

ALTER TABLE public.verification
  RENAME CONSTRAINT verification_resolution_id_verificateur_fkey
  TO verification_id_verificateur_fkey;

ALTER INDEX public.signalement_id_dossier_statut_idx
  RENAME TO signalement_id_dossier_statut_signalement_idx;
