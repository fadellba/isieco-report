-- ISIECO private media buckets and RLS policies.
-- Apply this file to the Supabase project with a database owner role.
-- These policies use the caller's Supabase Auth JWT; no service_role key is required.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('report-private', 'report-private', false, 10485760, array['image/jpeg', 'image/png', 'image/webp']),
  ('intervention-private', 'intervention-private', false, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
set
  name = excluded.name,
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.isieco_can_upload_report_photo(p_report_id text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.signalement s
    join public.utilisateur u on u.id_utilisateur = s.id_utilisateur
    where s.id_signalement::text = p_report_id
      and u.auth_user_id = auth.uid()
      and u.etat_compte = 'ACTIF'
      and s.statut_signalement in ('SOUMIS', 'EN_ATTENTE_COMPLEMENT', 'COMPLEMENT_REPONDU')
  );
$$;

create or replace function public.isieco_can_read_report_photo(p_report_id text, p_object_name text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.photo_signalement p
    join public.signalement s on s.id_signalement = p.id_signalement
    join public.utilisateur u on u.id_utilisateur = s.id_utilisateur
    where s.id_signalement::text = p_report_id
      and p.reference_photo = p_object_name
      and p.date_expiration > now()
      and u.etat_compte = 'ACTIF'
      and (
        u.auth_user_id = auth.uid()
        or exists (
          select 1
          from public.utilisateur_role ur
          join public.role r on r.id_role = ur.id_role
          where ur.id_utilisateur = u.id_utilisateur
            and false
        )
        or exists (
          select 1
          from public.utilisateur u_actor
          join public.utilisateur_role ur on ur.id_utilisateur = u_actor.id_utilisateur
          join public.role r on r.id_role = ur.id_role
          where u_actor.auth_user_id = auth.uid()
            and u_actor.etat_compte = 'ACTIF'
            and ur.date_debut <= now()
            and (ur.date_fin is null or ur.date_fin > now())
            and r.code_role in ('AGENT_QUALIFICATION', 'RESPONSABLE_TRAITEMENT', 'VERIFICATEUR_CLOTURE')
        )
      )
  );
$$;

create or replace function public.isieco_can_delete_unregistered_report_photo(
  p_report_id text,
  p_object_name text
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.isieco_can_upload_report_photo(p_report_id)
    and not exists (
      select 1 from public.photo_signalement p where p.reference_photo = p_object_name
    );
$$;

create or replace function public.isieco_can_upload_intervention_photo(p_intervention_id text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.intervention i
    join public.affectation a on a.id_affectation = i.id_affectation
    join public.contenu_dossier cd
      on cd.id_dossier = a.id_dossier and cd.id_type_dechet = a.id_type_dechet
    join public.dossier_traitement d on d.id_dossier = cd.id_dossier
    join public.utilisateur u on u.id_utilisateur = i.renseigne_par
    join public.appartenance_equipe ae
      on ae.id_utilisateur = u.id_utilisateur and ae.id_equipe = a.id_equipe
    where i.id_intervention::text = p_intervention_id
      and u.auth_user_id = auth.uid()
      and u.etat_compte = 'ACTIF'
      and i.statut_intervention = 'EN_COURS'
      and i.date_soumission_compte_rendu is null
      and a.etat_affectation = 'ACTIVE'
      and a.date_fin_affectation is null
      and a.decision_equipe = 'ACCEPTEE'
      and cd.etat_contenu_dossier = 'ACTIF'
      and d.statut_dossier <> 'CLOTURE'
      and ae.date_debut <= now()
      and (ae.date_fin is null or ae.date_fin > now())
  );
$$;

create or replace function public.isieco_can_read_intervention_photo(
  p_intervention_id text,
  p_object_name text
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.photo_intervention p
    join public.intervention i on i.id_intervention = p.id_intervention
    join public.affectation a on a.id_affectation = i.id_affectation
    where i.id_intervention::text = p_intervention_id
      and p.reference_photo = p_object_name
      and p.date_expiration > now()
      and (
        exists (
          select 1
          from public.utilisateur u
          join public.appartenance_equipe ae on ae.id_utilisateur = u.id_utilisateur
          where u.auth_user_id = auth.uid()
            and u.etat_compte = 'ACTIF'
            and ae.id_equipe = a.id_equipe
            and ae.date_debut <= now()
            and (ae.date_fin is null or ae.date_fin > now())
        )
        or exists (
          select 1
          from public.utilisateur u
          join public.utilisateur_role ur on ur.id_utilisateur = u.id_utilisateur
          join public.role r on r.id_role = ur.id_role
          where u.auth_user_id = auth.uid()
            and u.etat_compte = 'ACTIF'
            and ur.date_debut <= now()
            and (ur.date_fin is null or ur.date_fin > now())
            and r.code_role = 'VERIFICATEUR_CLOTURE'
            and i.statut_intervention = 'SOUMISE'
            and i.date_soumission_compte_rendu is not null
        )
        or exists (
          select 1
          from public.utilisateur u
          where u.auth_user_id = auth.uid()
            and u.etat_compte = 'ACTIF'
            and u.id_utilisateur = i.renseigne_par
        )
      )
  );
$$;

create or replace function public.isieco_can_delete_unregistered_intervention_photo(
  p_intervention_id text,
  p_object_name text
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.isieco_can_upload_intervention_photo(p_intervention_id)
    and not exists (
      select 1 from public.photo_intervention p where p.reference_photo = p_object_name
    );
$$;

revoke all on function public.isieco_can_upload_report_photo(text) from public;
revoke all on function public.isieco_can_read_report_photo(text, text) from public;
revoke all on function public.isieco_can_delete_unregistered_report_photo(text, text) from public;
revoke all on function public.isieco_can_upload_intervention_photo(text) from public;
revoke all on function public.isieco_can_read_intervention_photo(text, text) from public;
revoke all on function public.isieco_can_delete_unregistered_intervention_photo(text, text) from public;

grant execute on function public.isieco_can_upload_report_photo(text) to authenticated;
grant execute on function public.isieco_can_read_report_photo(text, text) to authenticated;
grant execute on function public.isieco_can_delete_unregistered_report_photo(text, text) to authenticated;
grant execute on function public.isieco_can_upload_intervention_photo(text) to authenticated;
grant execute on function public.isieco_can_read_intervention_photo(text, text) to authenticated;
grant execute on function public.isieco_can_delete_unregistered_intervention_photo(text, text) to authenticated;

drop policy if exists isieco_report_photo_insert on storage.objects;
create policy isieco_report_photo_insert
on storage.objects for insert to authenticated
with check (
  bucket_id = 'report-private'
  and public.isieco_can_upload_report_photo((storage.foldername(name))[1])
);

drop policy if exists isieco_report_photo_select on storage.objects;
create policy isieco_report_photo_select
on storage.objects for select to authenticated
using (
  bucket_id = 'report-private'
  and public.isieco_can_read_report_photo((storage.foldername(name))[1], name)
);

drop policy if exists isieco_report_photo_cleanup on storage.objects;
create policy isieco_report_photo_cleanup
on storage.objects for delete to authenticated
using (
  bucket_id = 'report-private'
  and public.isieco_can_delete_unregistered_report_photo((storage.foldername(name))[1], name)
);

drop policy if exists isieco_intervention_photo_insert on storage.objects;
create policy isieco_intervention_photo_insert
on storage.objects for insert to authenticated
with check (
  bucket_id = 'intervention-private'
  and public.isieco_can_upload_intervention_photo((storage.foldername(name))[1])
);

drop policy if exists isieco_intervention_photo_select on storage.objects;
create policy isieco_intervention_photo_select
on storage.objects for select to authenticated
using (
  bucket_id = 'intervention-private'
  and public.isieco_can_read_intervention_photo((storage.foldername(name))[1], name)
);

drop policy if exists isieco_intervention_photo_cleanup on storage.objects;
create policy isieco_intervention_photo_cleanup
on storage.objects for delete to authenticated
using (
  bucket_id = 'intervention-private'
  and public.isieco_can_delete_unregistered_intervention_photo((storage.foldername(name))[1], name)
);

-- No public SELECT, no object UPDATE policy, and no service_role key in clients.
