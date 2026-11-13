-- Publish a minimal invalidation signal after a committed business audit event.
-- The payload contains only the monotonic sequence, never entity data or personal information.
CREATE OR REPLACE FUNCTION audit.notify_command_center_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $function$
BEGIN
  IF NEW.entity_type <> 'UTILISATEUR' THEN
    PERFORM pg_catalog.pg_notify(
      'command_center_changed',
      NEW.event_sequence::text
    );
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER evenement_metier_command_center_notify
  AFTER INSERT ON audit.evenement_metier
  FOR EACH ROW
  EXECUTE FUNCTION audit.notify_command_center_change();

COMMENT ON FUNCTION audit.notify_command_center_change() IS
  'Emits a post-commit, payload-minimized invalidation for authorized command-center clients via PostgreSQL LISTEN/NOTIFY.';

REVOKE ALL PRIVILEGES ON FUNCTION audit.notify_command_center_change() FROM PUBLIC;

DO $lockdown$
DECLARE
  grantee TEXT;
BEGIN
  FOREACH grantee IN ARRAY ARRAY['anon', 'authenticated', 'service_role'] LOOP
    IF EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = grantee) THEN
      EXECUTE format(
        'REVOKE ALL PRIVILEGES ON FUNCTION audit.notify_command_center_change() FROM %I',
        grantee
      );
    END IF;
  END LOOP;
END
$lockdown$;
