-- Every newly created signalement must have at least one private proof photo.
-- The constraint is deferred so the API can insert the signalement and its photo
-- in one transaction, while rejecting a transaction that commits without a photo.
CREATE OR REPLACE FUNCTION public.assert_signalement_has_photo()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.signalement AS report
    WHERE report.id_signalement = NEW.id_signalement
  ) AND NOT EXISTS (
    SELECT 1
    FROM public.photo_signalement AS photo
    WHERE photo.id_signalement = NEW.id_signalement
  ) THEN
    RAISE EXCEPTION 'Un signalement doit conserver au moins une photo.'
      USING ERRCODE = '23514',
            CONSTRAINT = 'signalement_photo_required';
  END IF;

  RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER signalement_photo_required
AFTER INSERT ON public.signalement
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION public.assert_signalement_has_photo();

-- Serialize photo removals on the owning signalement before checking the deferred
-- invariant, so concurrent deletions cannot both remove the last proof.
CREATE OR REPLACE FUNCTION public.lock_signalement_before_photo_removal()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.id_signalement <> OLD.id_signalement THEN
    RAISE EXCEPTION 'Une photo de signalement ne peut pas être déplacée vers un autre signalement.'
      USING ERRCODE = '23514',
            CONSTRAINT = 'photo_signalement_owner_immutable';
  END IF;

  PERFORM 1
  FROM public.signalement
  WHERE id_signalement = OLD.id_signalement
  FOR UPDATE;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$;

CREATE TRIGGER photo_signalement_lock_owner_before_removal
BEFORE DELETE OR UPDATE ON public.photo_signalement
FOR EACH ROW
EXECUTE FUNCTION public.lock_signalement_before_photo_removal();

CREATE OR REPLACE FUNCTION public.assert_signalement_keeps_photo_after_removal()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.signalement AS report
    WHERE report.id_signalement = OLD.id_signalement
  ) AND NOT EXISTS (
    SELECT 1
    FROM public.photo_signalement AS photo
    WHERE photo.id_signalement = OLD.id_signalement
  ) THEN
    RAISE EXCEPTION 'La dernière photo d’un signalement ne peut pas être supprimée.'
      USING ERRCODE = '23514',
            CONSTRAINT = 'photo_signalement_last_photo_required';
  END IF;

  RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER photo_signalement_last_photo_required
AFTER DELETE OR UPDATE ON public.photo_signalement
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION public.assert_signalement_keeps_photo_after_removal();
