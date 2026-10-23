-- Existing jobs remain NULL: their old appointment cannot be safely inferred.
ALTER TABLE public.reminder_jobs
  ADD COLUMN IF NOT EXISTS reschedule_variables JSONB;
