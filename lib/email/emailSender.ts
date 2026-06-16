import { Repositories } from '../repositories/types';
import { renderTemplate, validateVariables, buildVariableMapForJob } from './templateRenderer';
import { createSendGridClient } from './sendGridClient';
import { createSmtpClient } from './smtpClient';
import { logAudit } from '../services/auditLogger';

export interface SendReminderOptions {
  disableSending?: boolean;
  fromEmail?: string;
}

export async function sendReminderJob(
  repos: Repositories,
  jobId: string,
  options: SendReminderOptions = {}
): Promise<{
  success: boolean;
  status: 'sent' | 'failed' | 'skipped';
  error?: string;
  messageId?: string;
}> {
  const job = await repos.getReminderJobById(jobId);
  if (!job) {
    return { success: false, status: 'failed', error: 'Reminder job not found' };
  }

  if (job.status !== 'scheduled' && job.status !== 'pending_review') {
    return { success: false, status: 'failed', error: `Job status is ${job.status}` };
  }

  const participant = await repos.getParticipantById(job.participant_id);
  if (!participant) {
    await markJobFailed(repos, jobId, 'Participant not found');
    return { success: false, status: 'failed', error: 'Participant not found' };
  }

  if (participant.status !== 'active') {
    await markJobSkipped(repos, jobId, `Participant status is ${participant.status}`);
    return { success: false, status: 'skipped', error: `Participant status is ${participant.status}` };
  }

  if (participant.email_opt_out) {
    await markJobSkipped(repos, jobId, 'Participant opted out');
    return { success: false, status: 'skipped', error: 'Participant opted out' };
  }

  if (!participant.email) {
    await markJobSkipped(repos, jobId, 'Participant has no email');
    return { success: false, status: 'skipped', error: 'Participant has no email' };
  }

  const template = await repos.getEmailTemplateByTemplateId(job.template_id);
  if (!template) {
    await markJobSkipped(repos, jobId, `Template not found: ${job.template_id}`);
    return { success: false, status: 'skipped', error: `Template not found: ${job.template_id}` };
  }

  if (!template.active) {
    await markJobSkipped(repos, jobId, `Template inactive: ${job.template_id}`);
    return { success: false, status: 'skipped', error: `Template inactive: ${job.template_id}` };
  }

  const visits = await repos.listVisitsByParticipantId(participant.id);
  const currentVisit = visits.find((v) => v.id === job.visit_id);

  if (currentVisit && job.visit_datetime_snapshot) {
    if (currentVisit.scheduled_datetime !== job.visit_datetime_snapshot) {
      await markJobSkipped(
        repos,
        jobId,
        'Visit datetime snapshot no longer matches current visit'
      );
      return {
        success: false,
        status: 'skipped',
        error: 'Visit datetime snapshot no longer matches current visit',
      };
    }
  }

  const events = await repos.listCalculatedEventsByParticipantId(participant.id);
  const variables = buildVariableMapForJob(job, participant, visits, events);

  const { valid, missing } = validateVariables(template.body, variables);
  if (!valid) {
    await markJobSkipped(repos, jobId, `Missing template variables: ${missing.join(', ')}`);
    return {
      success: false,
      status: 'skipped',
      error: `Missing template variables: ${missing.join(', ')}`,
    };
  }

  const subject = renderTemplate(template.subject, variables);
  const body = renderTemplate(template.body, variables);

  const disableSending =
    options.disableSending || process.env.DISABLE_EMAIL_SENDING === 'true';

  let messageId: string | undefined;

  if (!disableSending) {
    const result = await sendEmailViaProvider({
      to: participant.email,
      cc: 'ysjin@health.ucdavis.edu',
      subject,
      body,
      fromEmail: options.fromEmail,
    });

    if (!result.success) {
      await markJobFailed(repos, jobId, result.error || 'Email provider failed');
      return {
        success: false,
        status: 'failed',
        error: result.error || 'Email provider failed',
      };
    }

    messageId = result.messageId;
  } else {
    messageId = `mock_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }

  const updatedJob = await repos.updateReminderJob(jobId, {
    status: 'sent',
    sent_at: new Date().toISOString(),
    provider_message_id: messageId || null,
  });

  await logAudit(repos, {
    actor: 'system',
    action: 'reminder_sent',
    entityType: 'reminder_job',
    entityId: jobId,
    participantId: participant.id,
    after: updatedJob as unknown as Record<string, unknown>,
  });

  return { success: true, status: 'sent', messageId };
}

async function sendEmailViaProvider(input: {
  to: string;
  cc?: string | string[];
  subject: string;
  body: string;
  fromEmail?: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const fromEmail = input.fromEmail || process.env.FROM_EMAIL || process.env.SENDGRID_FROM_EMAIL;

  if (!fromEmail) {
    return { success: false, error: 'No from email configured' };
  }

  // Prefer SMTP if configured
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  if (smtpHost && smtpPort && smtpUser && smtpPass) {
    const client = createSmtpClient({
      host: smtpHost,
      port: parseInt(smtpPort, 10),
      secure: process.env.SMTP_SECURE === 'true',
      user: smtpUser,
      pass: smtpPass,
    });

    return client.sendEmail({
      to: input.to,
      cc: input.cc,
      from: fromEmail,
      subject: input.subject,
      body: input.body,
    });
  }

  // Fall back to SendGrid
  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) {
    return {
      success: false,
      error: 'No email provider configured. Set SMTP_* or SENDGRID_API_KEY.',
    };
  }

  const client = createSendGridClient(apiKey);
  return client.sendEmail({
    to: input.to,
    cc: input.cc,
    from: fromEmail,
    subject: input.subject,
    body: input.body,
  });
}

async function markJobFailed(
  repos: Repositories,
  jobId: string,
  error: string
): Promise<void> {
  await repos.updateReminderJob(jobId, {
    status: 'failed',
    last_error: error,
  });

  const job = await repos.getReminderJobById(jobId);
  if (job) {
    await logAudit(repos, {
      actor: 'system',
      action: 'reminder_failed',
      entityType: 'reminder_job',
      entityId: jobId,
      participantId: job.participant_id,
      after: job as unknown as Record<string, unknown>,
    });
  }
}

async function markJobSkipped(
  repos: Repositories,
  jobId: string,
  reason: string
): Promise<void> {
  await repos.updateReminderJob(jobId, {
    status: 'skipped',
    last_error: reason,
  });

  const job = await repos.getReminderJobById(jobId);
  if (job) {
    await logAudit(repos, {
      actor: 'system',
      action: 'reminder_skipped',
      entityType: 'reminder_job',
      entityId: jobId,
      participantId: job.participant_id,
      after: job as unknown as Record<string, unknown>,
    });
  }
}
