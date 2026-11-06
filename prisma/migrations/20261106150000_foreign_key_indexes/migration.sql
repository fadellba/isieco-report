-- Cover the foreign-key columns reported by Supabase's performance advisor.
-- Existing composite/unique indexes already cover their left-most FK columns; these
-- indexes cover the remaining FK columns used by joins and referential maintenance.
CREATE INDEX "affectation_competence_idx" ON public.affectation ("id_competence_equipe");
CREATE INDEX "affectation_decider_idx" ON public.affectation ("id_decideur");
CREATE INDEX "affectation_responder_idx" ON public.affectation ("repondu_par");

CREATE INDEX "competence_equipe_type_dechet_idx" ON public.competence_equipe ("id_type_dechet");
CREATE INDEX "contenu_dossier_type_dechet_idx" ON public.contenu_dossier ("id_type_dechet");
CREATE INDEX "contenu_signalement_type_dechet_idx" ON public.contenu_signalement ("id_type_dechet");
CREATE INDEX "contenu_signalement_qualifier_idx" ON public.contenu_signalement ("qualifie_par");

CREATE INDEX "demande_complement_requester_idx" ON public.demande_complement ("demande_par");
CREATE INDEX "demande_complement_responder_idx" ON public.demande_complement ("repondu_par");
CREATE INDEX "dossier_traitement_creator_idx" ON public.dossier_traitement ("cree_par");
CREATE INDEX "historique_statut_signalement_actor_idx" ON public.historique_statut_signalement ("id_utilisateur");
CREATE INDEX "intervention_author_idx" ON public.intervention ("renseigne_par");
CREATE INDEX "signalement_decision_maker_idx" ON public.signalement ("decision_par");
CREATE INDEX "utilisateur_role_attributed_by_idx" ON public.utilisateur_role ("attribue_par");
CREATE INDEX "verification_verifier_idx" ON public.verification ("id_verificateur");
