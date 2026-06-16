# Clinical Trial Participant Reminder System

An automated reminder and scheduling system for clinical trial coordinators. Built for the Zivkovic Lab Goji Berry Study at UC Davis.

---

## Overview

This system manages study participant timelines, sends automated email reminders for study visits and dietary protocols, and provides coordinators with a dashboard to track participant progress. It replaces manual email reminders with a reliable, auditable automated workflow.

**Live App:** [https://2026-ysjin-reminder-app.vercel.app](https://2026-ysjin-reminder-app.vercel.app)

---

## Key Features

### Participant Management
- Create and manage study participants with study IDs, contact info, and timezone settings
- Filter and sort participants by status (Active / Paused / Withdrawn / Completed)
- Bulk import participants from CSV or XLSX spreadsheets
- Each participant has a dedicated detail page for full timeline management

### Visit Scheduling
- Schedule Day 0, Day 90, and Day 180 study visits
- Update existing visits (rescheduling is automatically tracked)
- Calculated events (patternized diet start, stool collection windows, last bite times) are derived automatically from visit dates

### Automated Email Reminders
10 reminder rules fire automatically based on visit schedules:

| Email Type | When It Sends | Content |
|---|---|---|
| Scheduling Confirmation | 10 minutes after scheduling | Visit date/time, diet instructions, stool collection window |
| Patternized Diet Reminder | 4 days before visit | Reminder to start the 3-day patternized diet |
| Visit Reminder | 1 day before visit | Visit time, fasting instructions, what to bring |
| Habitual Diet (1st) | Monday of Week 6 | Start 3-day habitual diet record |
| Habitual Diet (2nd) | Monday of Week 18 | Start 3-day habitual diet record |

- Scheduling emails are automatically sent 10 minutes after scheduling (not immediately)
- Emails are formatted with **bold text** for important instructions
- All emails include CC to study coordinators
- Visit reminders are automatically sent the day before

### Email Template Customization
- 13 customizable email templates stored in the database
- Templates use variable placeholders (e.g. `{{first_name}}`, `{{day0_visit_date}}`)
- Bold formatting, paragraphs, and signatures are rendered as HTML
- All emails include: `[Study-Reminder]` prefix, body formatting, coordinator contact, and privacy notice

### Dashboard & Monitoring
- Real-time dashboard with summary statistics
- Active participant count, emails sent today, upcoming visits
- Failed email tracking with manual retry
- Overdue email detection (past-due by more than 12 hours)
- Full audit log of all schedule changes and email sends

### Participant-Level Reminder Management
- View all generated reminder jobs for each participant
- **Send Now** — immediately send a pending or failed reminder
- **Cancel** — stop a pending reminder from sending
- **Edit** — change the scheduled send time
- **Regenerate** — recreate all pending reminders (skips already-sent ones)

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Vercel (Hosting)                      │
│  ┌────────────────────────────────────────────────────┐ │
│  │           Next.js 14 App (React / TypeScript)       │ │
│  │  ┌─────────┐ ┌──────────┐ ┌───────────────────┐   │ │
│  │  │Dashboard│ │Participant│ │ Reminder Engine   │   │ │
│  │  │  Pages  │ │  Pages   │ │ (CRON + Send Now)  │   │ │
│  │  └─────────┘ └──────────┘ └───────────────────┘   │ │
│  └────────────────────────────────────────────────────┘ │
│                          │                               │
│                          ▼                               │
│              ┌─────────────────────┐                    │
│              │   API Routes        │                    │
│              │  /api/participants  │                    │
│              │  /api/visits        │                    │
│              │  /api/reminders     │                    │
│              │  /api/dashboard     │                    │
│              └─────────────────────┘                    │
└──────────────────────┬──────────────────────────────────┘
                       │
            ┌──────────▼──────────┐
            │     Supabase        │
            │  (PostgreSQL + Auth) │
            │                     │
            │  Tables:            │
            │  • participants     │
            │  • visits           │
            │  • reminder_jobs    │
            │  • email_templates  │
            │  • audit_logs       │
            └─────────────────────┘
                       │
            ┌──────────▼──────────┐
            │     SendGrid        │
            │  (Email Delivery)   │
            └─────────────────────┘
                       │
            ┌──────────▼──────────┐
            │   cron-job.org      │
            │ (Every 5-15 min)    │
            │ Processes due       │
            │ reminder jobs       │
            └─────────────────────┘
```

**Key design decisions:**

- **Security**: All database operations go through server-side API routes using the Supabase service role key. The anonymous key is never used for data access. Row-Level Security is enabled but bypassed by the service key — access control is handled by Next.js middleware (session-based auth).
- **Email sending**: Prefers SMTP if configured; falls back to SendGrid. Both providers support CC and HTML-formatted emails.
- **Automatic vs. manual**: Reminder jobs due within 12 hours are auto-sent by the cron trigger. Jobs overdue by more than 12 hours get a visual warning and require manual approval.
- **Duplicate prevention**: Regenerating reminders skips rules that already have a sent job matching the current visit schedule, preventing duplicate emails.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 14 (App Router), React 18, Tailwind CSS |
| **Backend** | Next.js API Routes (Node.js 20) |
| **Database** | Supabase (PostgreSQL) |
| **Auth** | Supabase SSR (email/password) |
| **Email** | SendGrid (primary), Nodemailer/SMTP (fallback) |
| **Hosting** | Vercel (serverless functions) |
| **Scheduling** | cron-job.org (external cron) |
| **Testing** | Vitest |

---

## For Study Coordinators

### Getting Access

1. The system administrator creates your account in Supabase Auth.
2. You will receive login credentials (email + temporary password).
3. Go to [https://2026-ysjin-reminder-app.vercel.app/login](https://2026-ysjin-reminder-app.vercel.app/login) and sign in.

### Daily Use

- **Dashboard** — check the overview when you start your day. Look for overdue items in red.
- **Participants** — view, add, filter, and manage all study participants.
- **Schedule Visits** — when a new participant is enrolled, schedule their Day 0 visit on their detail page. The system automatically generates all necessary reminders.
- **Reminders** — review all pending and sent reminders across participants. Use this page to find failed or overdue emails.
- **Rescheduling** — if a participant needs to change their visit date, use the schedule form again on their detail page. The system detects it as a reschedule and sends an updated notification.

### Important Notes

- Emails are sent with **CC to study coordinators** so you can monitor all participant communications.
- Patternized diet and habitual diet emails are CC'd to a subset of the team; scheduling and rescheduling emails go to the full coordinator team.
- If a participant withdraws, set their status to `Withdrawn` — the system will stop sending reminders automatically.
- Test participants (study IDs starting with `test`) are excluded from dashboard statistics but still visible in the participant list.

---

## For Developers

See [GETTING_STARTED.md](./GETTING_STARTED.md) for full setup and deployment instructions.

### Quick Local Start

```bash
npm install
# Configure .env.local
npm run dev
```

### Database Management

- Migration: `db/migrations/001_initial.sql` — run in Supabase SQL Editor
- Seed rules: `npm run db:seed` — inserts reminder rules and email templates
- Email templates: `templates/email_templates.json` — edit and re-seed after changes

### Project Structure

```
├── app/
│   ├── api/              # API routes
│   ├── dashboard/        # Dashboard page
│   ├── participants/     # Participant list + detail
│   ├── reminders/        # Cross-participant reminders view
│   └── imports/          # Spreadsheet import
├── components/
│   ├── dashboard/        # SummaryCards, ParticipantTable
│   └── participants/     # Timeline, ReminderJobsPanel, VisitForm
├── lib/
│   ├── email/            # Sending (SMTP, SendGrid), templates, rendering
│   ├── services/         # Business logic (visits, reminders, scheduler)
│   └── repositories/     # Data access (Supabase, in-memory)
├── db/
│   ├── migrations/       # SQL schema
│   ├── seed/             # Seed scripts
│   └── schema.sql        # Full schema reference
├── templates/            # Email template JSON
└── jobs/                 # Trigger.dev job definitions
```

---

## License

Internal use — Zivkovic Lab, Department of Nutrition, University of California, Davis.
