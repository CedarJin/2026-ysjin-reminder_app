-- Preserve canceled jobs while preventing duplicate non-canceled reminders.
BEGIN;
DO $$
DECLARE constraint_name text;
BEGIN
  FOR constraint_name IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.reminder_jobs'::regclass AND contype = 'u'
      AND conkey = ARRAY[
        (SELECT attnum FROM pg_attribute WHERE attrelid = 'public.reminder_jobs'::regclass AND attname = 'participant_id'),
        (SELECT attnum FROM pg_attribute WHERE attrelid = 'public.reminder_jobs'::regclass AND attname = 'rule_id'),
        (SELECT attnum FROM pg_attribute WHERE attrelid = 'public.reminder_jobs'::regclass AND attname = 'scheduled_send_datetime'),
        (SELECT attnum FROM pg_attribute WHERE attrelid = 'public.reminder_jobs'::regclass AND attname = 'visit_datetime_snapshot')
      ]::smallint[]
  LOOP
    EXECUTE format('ALTER TABLE public.reminder_jobs DROP CONSTRAINT %I', constraint_name);
  END LOOP;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS reminder_jobs_active_schedule_unique
  ON public.reminder_jobs (participant_id, rule_id, scheduled_send_datetime, visit_datetime_snapshot)
  WHERE status <> 'canceled';
COMMIT;
