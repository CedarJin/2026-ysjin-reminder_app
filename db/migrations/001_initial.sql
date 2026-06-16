-- Migration 001: Initial schema for clinical trial reminder system
-- This file mirrors db/schema.sql for version control and deployment.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  participant_key TEXT UNIQUE NOT NULL,
  participant_id TEXT,
  study_id TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'America/Los_Angeles',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'withdrawn', 'completed')),
  email_opt_out BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_participants_study_id ON participants(study_id);
CREATE INDEX IF NOT EXISTS idx_participants_status ON participants(status);
CREATE INDEX IF NOT EXISTS idx_participants_email ON participants(email);

CREATE TABLE IF NOT EXISTS visits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  study_id TEXT NOT NULL,
  visit_day INTEGER NOT NULL CHECK (visit_day IN (0, 90, 180)),
  visit_name TEXT NOT NULL,
  scheduled_date DATE NOT NULL,
  scheduled_time TEXT NOT NULL,
  scheduled_datetime TIMESTAMPTZ NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'America/Los_Angeles',
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('missing', 'scheduled', 'rescheduled', 'completed', 'canceled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (participant_id, visit_day)
);

CREATE INDEX IF NOT EXISTS idx_visits_participant_id ON visits(participant_id);
CREATE INDEX IF NOT EXISTS idx_visits_study_id ON visits(study_id);
CREATE INDEX IF NOT EXISTS idx_visits_scheduled_datetime ON visits(scheduled_datetime);

CREATE TABLE IF NOT EXISTS calculated_study_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  study_id TEXT NOT NULL,
  source_visit_day INTEGER NOT NULL,
  event_key TEXT NOT NULL,
  event_name TEXT NOT NULL,
  event_date DATE,
  event_time TEXT,
  event_datetime TIMESTAMPTZ,
  timezone TEXT NOT NULL DEFAULT 'America/Los_Angeles',
  calculation_rule TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (participant_id, event_key)
);

CREATE INDEX IF NOT EXISTS idx_calculated_events_participant_id ON calculated_study_events(participant_id);

CREATE TABLE IF NOT EXISTS reminder_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rule_id TEXT UNIQUE NOT NULL,
  email_name TEXT NOT NULL,
  study_id TEXT,
  phase TEXT NOT NULL,
  based_on_date TEXT NOT NULL,
  based_on_time TEXT,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('send_when_new_visit_scheduled', 'relative_to_visit_date', 'monday_of_week_after_day0')),
  offset_amount INTEGER,
  offset_unit TEXT,
  week_number INTEGER,
  fixed_send_time TEXT,
  template_id TEXT NOT NULL,
  reschedule_template_id TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reminder_rules_active ON reminder_rules(active);

CREATE TABLE IF NOT EXISTS reminder_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reminder_id TEXT UNIQUE NOT NULL,
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  study_id TEXT NOT NULL,
  visit_id UUID REFERENCES visits(id) ON DELETE SET NULL,
  phase TEXT NOT NULL,
  rule_id TEXT NOT NULL,
  email_name TEXT NOT NULL,
  template_id TEXT NOT NULL,
  scheduled_send_date DATE NOT NULL,
  scheduled_send_time TEXT NOT NULL,
  scheduled_send_datetime TIMESTAMPTZ NOT NULL,
  visit_date_snapshot DATE,
  visit_time_snapshot TEXT,
  visit_datetime_snapshot TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'pending_review', 'sent', 'failed', 'canceled', 'skipped')),
  sent_at TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  canceled_reason TEXT,
  provider_message_id TEXT,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (participant_id, rule_id, scheduled_send_datetime, visit_datetime_snapshot)
);

CREATE INDEX IF NOT EXISTS idx_reminder_jobs_participant_id ON reminder_jobs(participant_id);
CREATE INDEX IF NOT EXISTS idx_reminder_jobs_status ON reminder_jobs(status);
CREATE INDEX IF NOT EXISTS idx_reminder_jobs_scheduled_send_datetime ON reminder_jobs(scheduled_send_datetime);
CREATE INDEX IF NOT EXISTS idx_reminder_jobs_visit_id ON reminder_jobs(visit_id);

CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id TEXT UNIQUE NOT NULL,
  study_id TEXT,
  email_name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_templates_active ON email_templates(active);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  participant_id UUID REFERENCES participants(id) ON DELETE SET NULL,
  before_json JSONB,
  after_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_participant_id ON audit_logs(participant_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_participants_updated_at') THEN
    CREATE TRIGGER update_participants_updated_at
    BEFORE UPDATE ON participants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_visits_updated_at') THEN
    CREATE TRIGGER update_visits_updated_at
    BEFORE UPDATE ON visits
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_calculated_study_events_updated_at') THEN
    CREATE TRIGGER update_calculated_study_events_updated_at
    BEFORE UPDATE ON calculated_study_events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_reminder_rules_updated_at') THEN
    CREATE TRIGGER update_reminder_rules_updated_at
    BEFORE UPDATE ON reminder_rules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_reminder_jobs_updated_at') THEN
    CREATE TRIGGER update_reminder_jobs_updated_at
    BEFORE UPDATE ON reminder_jobs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_email_templates_updated_at') THEN
    CREATE TRIGGER update_email_templates_updated_at
    BEFORE UPDATE ON email_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;
