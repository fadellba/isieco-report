-- Deterministic, synthetic legacy records used only by the CI migration rehearsal.
-- No production or staging data is copied into this fixture.
BEGIN;

INSERT INTO public.utilisateur (
  id_utilisateur, auth_user_id, nom, prenom, email, telephone, date_inscription, etat_compte
) VALUES
  ('00000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'Citoyen', 'Test', 'citoyen@example.invalid', NULL, '2026-01-01', 'ACTIF'),
  ('00000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', 'Agent', 'Terrain', 'agent@example.invalid', NULL, '2026-01-01', 'ACTIF'),
  ('00000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000003', 'Verificateur', 'Test', 'verificateur@example.invalid', NULL, '2026-01-01', 'ACTIF');

INSERT INTO public.utilisateur_role (
  id_utilisateur, id_role, date_debut, date_fin, attribue_par, motif
)
SELECT '00000000-0000-4000-8000-000000000001', id_role, '2026-01-01', NULL,
       '00000000-0000-4000-8000-000000000002', 'fixture'
FROM public.role WHERE code_role = 'CITOYEN';

INSERT INTO public.utilisateur_role (
  id_utilisateur, id_role, date_debut, date_fin, attribue_par, motif
)
SELECT '00000000-0000-4000-8000-000000000002', id_role, '2026-01-01', NULL,
       '00000000-0000-4000-8000-000000000003', 'fixture'
FROM public.role WHERE code_role = 'AGENT_TERRAIN';

INSERT INTO public.utilisateur_role (
  id_utilisateur, id_role, date_debut, date_fin, attribue_par, motif
)
SELECT '00000000-0000-4000-8000-000000000003', id_role, '2026-01-01', NULL,
       '00000000-0000-4000-8000-000000000002', 'fixture'
FROM public.role WHERE code_role = 'VERIFICATEUR_CLOTURE';

INSERT INTO public.type_dechet (
  id_type_dechet, code_type, libelle, description, orientation_specialisee,
  date_debut_validite, date_fin_validite
) VALUES
  ('00000000-0000-4000-8000-000000000031', 'FIX_ACTIVE', 'Déchet actif', 'Catégorie active de test', FALSE, '2020-01-01', NULL),
  ('00000000-0000-4000-8000-000000000032', 'FIX_EXPIRED', 'Déchet expiré', 'Catégorie expirée de test', FALSE, '2020-01-01', '2020-12-31');

INSERT INTO public.equipe (id_equipe, nom_equipe, description, etat_equipe)
VALUES ('00000000-0000-4000-8000-000000000041', 'Equipe de rehearsal', 'Fixture synthétique', 'ACTIVE');

INSERT INTO public.appartenance_equipe (
  id_utilisateur, id_equipe, date_debut, date_fin, fonction
) VALUES (
  '00000000-0000-4000-8000-000000000002',
  '00000000-0000-4000-8000-000000000041',
  '2026-01-01', NULL, 'AGENT_TERRAIN'
);

INSERT INTO public.competence_equipe (
  id_competence_equipe, id_equipe, id_type_dechet, date_debut, date_fin, commentaire, validee_par
) VALUES
  ('00000000-0000-4000-8000-000000000051', '00000000-0000-4000-8000-000000000041', '00000000-0000-4000-8000-000000000031', '2026-01-01', NULL, 'Compétence active', '00000000-0000-4000-8000-000000000003'),
  ('00000000-0000-4000-8000-000000000052', '00000000-0000-4000-8000-000000000041', '00000000-0000-4000-8000-000000000032', '2020-01-01', '2020-12-31', 'Compétence expirée', '00000000-0000-4000-8000-000000000003');

INSERT INTO public.dossier_traitement (
  id_dossier, reference_dossier, description_synthese, date_creation_dossier,
  statut_dossier, priorite, date_qualification, id_commune, latitude, longitude,
  precision_localisation, description_localisation, date_cloture, cree_par
) VALUES
  ('00000000-0000-4000-8000-000000000021', 'FIX-DOSSIER-OLD', 'Ancien dossier', '2026-10-01', 'CLOTURE', 'NORMALE', NULL, NULL, NULL, NULL, NULL, 'Zone test ancienne', '2026-10-10', '00000000-0000-4000-8000-000000000002'),
  ('00000000-0000-4000-8000-000000000022', 'FIX-DOSSIER-CURRENT', 'Dossier actif', '2026-11-01', 'EN_COURS', 'HAUTE', NULL, NULL, 14.716700, -17.467700, 10, 'Zone test courante', NULL, '00000000-0000-4000-8000-000000000002');

INSERT INTO public.signalement (
  id_signalement, id_utilisateur, date_constat, date_soumission, description,
  id_commune, latitude, longitude, precision_localisation, description_localisation,
  statut_signalement, decision_par, date_decision, motif_decision
) VALUES
  (
    '00000000-0000-4000-8000-000000000011',
    '00000000-0000-4000-8000-000000000001',
    '2026-10-31', '2026-11-01', 'Signalement synthétique de migration',
    NULL, 14.716700, -17.467700, 10, 'A proximité de la zone test',
    'EN_COURS', '00000000-0000-4000-8000-000000000002', '2026-11-05', 'Pris en charge'
  ),
  (
    '00000000-0000-4000-8000-000000000012',
    '00000000-0000-4000-8000-000000000001',
    '2026-11-02', '2026-11-03', 'Signalement sans contenu déclaré préalable',
    NULL, NULL, NULL, NULL, NULL,
    'SOUMIS', NULL, NULL, NULL
  );

INSERT INTO public.photo_signalement (
  id_photo_signalement, reference_photo, description, date_ajout, id_signalement,
  date_expiration, media_purge_at, media_stockee_locale, etat_publication,
  reference_photo_publique, floutage_confirme, variante_soumise_par,
  date_soumission_variante, approuve_par, date_approbation
) VALUES (
  '00000000-0000-4000-8000-000000000061', 'storage/report-fixture.jpg', 'Photo fixture',
  '2026-11-01', '00000000-0000-4000-8000-000000000011',
  '2027-11-01', NULL, FALSE, 'EN_ATTENTE', NULL, FALSE, NULL, NULL, NULL, NULL
);

INSERT INTO public.contenu_signalement (
  id_signalement, id_type_dechet, quantite_estimee, volume_estime, remarque
) VALUES (
  '00000000-0000-4000-8000-000000000011',
  '00000000-0000-4000-8000-000000000031',
  2.000, 1.500, 'Valeur initiale avant qualification'
);

INSERT INTO public.qualification_signalement (
  id_qualification, id_signalement, id_type_dechet, quantite_estimee,
  unite_quantite, quantite_estimee_legacy, volume_estime, remarque,
  qualifie_par, date_qualification, etat_qualification, motif_retrait
) VALUES
  ('00000000-0000-4000-8000-000000000071', '00000000-0000-4000-8000-000000000011', '00000000-0000-4000-8000-000000000031', 5.000, 'KG', NULL, 2.000, 'Ancienne qualification', '00000000-0000-4000-8000-000000000002', '2026-11-02', 'A_CONFIRMER', NULL),
  ('00000000-0000-4000-8000-000000000072', '00000000-0000-4000-8000-000000000011', '00000000-0000-4000-8000-000000000031', 12.500, 'KG', NULL, 4.200, 'Qualification la plus recente', '00000000-0000-4000-8000-000000000002', '2026-11-04', 'CONFIRME', NULL),
  ('00000000-0000-4000-8000-000000000073', '00000000-0000-4000-8000-000000000012', '00000000-0000-4000-8000-000000000031', 1.250, 'KG', NULL, 0.500, 'Qualification sans contenu initial', '00000000-0000-4000-8000-000000000002', '2026-11-03', 'CONFIRME', NULL);

INSERT INTO public.rattachement_signalement (
  id_rattachement, id_signalement, id_dossier, date_debut_rattachement,
  date_fin_rattachement, type_rattachement, motif, id_acteur
) VALUES
  ('00000000-0000-4000-8000-000000000081', '00000000-0000-4000-8000-000000000011', '00000000-0000-4000-8000-000000000021', '2026-11-01', '2026-11-02', 'MANUEL', 'Rattachement terminé', '00000000-0000-4000-8000-000000000002'),
  ('00000000-0000-4000-8000-000000000082', '00000000-0000-4000-8000-000000000011', '00000000-0000-4000-8000-000000000022', '2026-11-03', NULL, 'MANUEL', 'Rattachement courant', '00000000-0000-4000-8000-000000000002');

INSERT INTO public.idempotence_signalement (
  id_utilisateur, cle_idempotence, empreinte_requete, id_signalement, date_creation
) VALUES (
  '00000000-0000-4000-8000-000000000001', 'fixture-report-key',
  'sha256:fixture-report-payload', '00000000-0000-4000-8000-000000000011', '2026-11-01'
);

INSERT INTO public.contenu_dossier (
  id_dossier, id_type_dechet, quantite_estimee, unite_quantite,
  quantite_estimee_legacy, volume_estime, niveau_risque_qualifie, remarque,
  qualifie_par, date_qualification, etat_contenu_dossier, etat_prise_en_charge,
  date_attente_equipe, motif_attente_equipe, date_retrait, retire_par,
  motif_retrait, origine_ajout, motif_ajout
) VALUES (
  '00000000-0000-4000-8000-000000000022',
  '00000000-0000-4000-8000-000000000031',
  12.500, 'KG', NULL, 4.200, 'FAIBLE', 'Contenu de dossier fixture',
  '00000000-0000-4000-8000-000000000002', '2026-11-04',
  'QUALIFIE', 'NON_AFFECTE', NULL, NULL, NULL, NULL, NULL,
  'SIGNALEMENT', 'Import fixture'
), (
  '00000000-0000-4000-8000-000000000021',
  '00000000-0000-4000-8000-000000000031',
  2.000, 'KG', NULL, 1.000, 'Ancien contenu de dossier',
  '00000000-0000-4000-8000-000000000002', '2026-10-02',
  'QUALIFIE', 'NON_AFFECTE', NULL, NULL, NULL, NULL, NULL,
  'MANUEL', 'Contenu associé à une affectation terminée'
);

INSERT INTO public.affectation (
  id_affectation, id_dossier, id_type_dechet, id_equipe, id_competence_equipe,
  date_heure_affectation, id_decideur, etat_affectation, motif, observation,
  date_fin_affectation, decision_equipe, repondu_par, date_reponse_equipe,
  motif_refus_equipe, reference_operation_unique
) VALUES (
  '00000000-0000-4000-8000-000000000091',
  '00000000-0000-4000-8000-000000000022',
  '00000000-0000-4000-8000-000000000031',
  '00000000-0000-4000-8000-000000000041',
  '00000000-0000-4000-8000-000000000051',
  '2026-11-01', '00000000-0000-4000-8000-000000000002',
  'ACCEPTEE', 'Affectation fixture', 'Equipe de rehearsal',
  NULL, 'ACCEPTEE', '00000000-0000-4000-8000-000000000002',
  '2026-11-01', NULL, 'fixture-assignment-operation'
);

INSERT INTO public.intervention (
  id_intervention, id_affectation, date_heure_debut, date_heure_fin,
  date_soumission_compte_rendu, statut_intervention, resultat_intervention,
  compte_rendu, motif_exception, renseigne_par
) VALUES
  ('00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000091', '2026-11-01 08:00', '2026-11-01 10:00', '2026-11-02 09:00', 'TERMINEE', 'PARTIEL', 'Compte rendu ancien', NULL, '00000000-0000-4000-8000-000000000002'),
  ('00000000-0000-4000-8000-000000000102', '00000000-0000-4000-8000-000000000091', '2026-11-04 08:00', '2026-11-04 12:00', '2026-11-05 09:00', 'TERMINEE', 'TERMINE', 'Compte rendu le plus recent', NULL, '00000000-0000-4000-8000-000000000002');

INSERT INTO public.photo_intervention (
  id_photo_intervention, id_intervention, reference_photo, contexte_photo,
  description, date_ajout, date_expiration, media_purge_at,
  media_stockee_locale, etat_publication, reference_photo_publique,
  floutage_confirme, variante_soumise_par, date_soumission_variante,
  approuve_par, date_approbation
) VALUES (
  '00000000-0000-4000-8000-000000000111',
  '00000000-0000-4000-8000-000000000102',
  'storage/intervention-fixture.jpg', 'APRES', 'Photo intervention fixture',
  '2026-11-05', '2027-11-05', NULL, FALSE, 'EN_ATTENTE', NULL,
  FALSE, NULL, NULL, NULL, NULL
);

INSERT INTO public.verification_resolution (
  id_verification, id_affectation, id_verificateur, date_verification,
  resultat_verification, etat_verification, motif, reference_preuve
) VALUES
  ('00000000-0000-4000-8000-000000000121', '00000000-0000-4000-8000-000000000091', '00000000-0000-4000-8000-000000000003', '2026-11-03', 'A_REPRENDRE', 'TERMINEE', 'Verification ancienne', 'proof-old'),
  ('00000000-0000-4000-8000-000000000122', '00000000-0000-4000-8000-000000000091', '00000000-0000-4000-8000-000000000003', '2026-11-05 10:00', 'CONFORME', 'TERMINEE', 'Verification la plus recente', 'proof-current'),
  ('00000000-0000-4000-8000-000000000123', '00000000-0000-4000-8000-000000000092', '00000000-0000-4000-8000-000000000003', '2026-10-06', 'CONFORME', 'TERMINEE', 'Verification sans intervention correspondante', 'proof-orphan');

INSERT INTO public.demande_complement (
  id_demande, id_signalement, demande_par, date_demande, motif, etat_demande
) VALUES (
  '00000000-0000-4000-8000-000000000131',
  '00000000-0000-4000-8000-000000000011',
  '00000000-0000-4000-8000-000000000002',
  '2026-11-02', 'Préciser la quantité', 'REPONDUE'
);

INSERT INTO public.reponse_complement (
  id_reponse, id_demande, repondu_par, date_reponse, contenu
) VALUES (
  '00000000-0000-4000-8000-000000000132',
  '00000000-0000-4000-8000-000000000131',
  '00000000-0000-4000-8000-000000000001',
  '2026-11-03', 'La quantité est estimée à 12,5 kg.'
);

INSERT INTO public.evenement_metier (
  id_evenement, type_evenement, date_evenement, date_enregistrement, origine,
  id_acteur, id_signalement_cible, donnees_avant, donnees_apres, motif, version_schema
) VALUES
  (
    '00000000-0000-4000-8000-000000000141', 'SIGNALEMENT_SOUMIS',
    '2026-11-01', '2026-11-01', 'API',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000011',
    NULL, NULL, 'Soumission initiale', 1
  ),
  (
    '00000000-0000-4000-8000-000000000142', 'SIGNALEMENT_STATUT_MODIFIE',
    '2026-11-04', '2026-11-04', 'API',
    '00000000-0000-4000-8000-000000000002',
    '00000000-0000-4000-8000-000000000011',
    '{"statutSignalement":"SOUMIS"}'::jsonb,
    '{"statutSignalement":"EN_COURS"}'::jsonb,
    'Prise en charge', 1
  ),
  (
    '00000000-0000-4000-8000-000000000143', 'PHOTO_SIGNALEMENT_AJOUTEE',
    '2026-11-01', '2026-11-01', 'API',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000011',
    NULL, NULL, 'Ajout photo sans changement de statut', 1
  );

COMMIT;
