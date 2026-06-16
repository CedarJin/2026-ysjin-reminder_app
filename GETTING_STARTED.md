# Clinical Trial Reminder System — Getting Started

This guide covers everything you need to set up, configure, and run the Clinical Trial Participant Reminder System from scratch.

---

## Table of Contents

1. [What You Need Before You Start](#what-you-need-before-you-start)
2. [Quick Start Overview](#quick-start-overview)
3. [Step 1 — Clone and Install](#step-1--clone-and-install)
4. [Step 2 — Create a Supabase Project](#step-2--create-a-supabase-project)
5. [Step 3 — Initialize the Database](#step-3--initialize-the-database)
6. [Step 4 — Configure Environment Variables](#step-4--configure-environment-variables)
7. [Step 5 — Seed Reminder Rules and Email Templates](#step-5--seed-reminder-rules-and-email-templates)
8. [Step 6 — Create a Coordinator User](#step-6--create-a-coordinator-user)
9. [Step 7 — Configure Email Sending (SendGrid or SMTP)](#step-7--configure-email-sending-sendgrid-or-smtp)
10. [Step 8 — Deploy to Vercel](#step-8--deploy-to-vercel)
11. [Step 9 — Set Up Automatic Email Sending (cron-job.org)](#step-9--set-up-automatic-email-sending-cron-joborg)
12. [Step 10 — Run the Development Server](#step-10--run-the-development-server)
13. [Step 11 — Verify the System](#step-11--verify-the-system)
14. [Production Deployment Checklist](#production-deployment-checklist)
15. [Troubleshooting](#troubleshooting)

---

## What You Need Before You Start

### Required Accounts

| Service | Purpose | Free Tier Available? |
|---|---|---|
| **Supabase** | PostgreSQL database + authentication | Yes (500 MB database, 50,000 users) |
| **SendGrid** | Email sending provider | Yes (100 emails/day free) |
| **Vercel** | App hosting (production deploy) | Yes (Hobby plan, sufficient) |
| **cron-job.org** (optional) | Scheduled automatic email sending | Yes (unlimited jobs, free) |
| **GitHub** | Source code hosting | Yes (unlimited public repos) |

### Required Software

| Tool | Version | Check Command |
|---|---|---|
| **Node.js** | 20.x or later | `node -v` |
| **npm** | 10.x or later | `npm -v` |
| **Git** | Latest | `git --version` |

### Knowledge You Should Have

- Basic familiarity with Next.js and React
- How to run SQL in a PostgreSQL database (Supabase SQL Editor)
- How to create API keys in SendGrid

---

## Quick Start Overview

```bash
npm install
# Fill in .env.local with your Supabase, SendGrid credentials
# Run SQL migration in Supabase SQL Editor (db/migrations/001_initial.sql)
npx tsx db/seed/seedAll.ts
git push
# Deploy on Vercel
# Set up cron-job.org for automatic email sending
```

Then open `https://your-vercel-domain.vercel.app/login`.

---

## Step 1 — Clone and Install

### 1.1 Get the code

```bash
git clone https://github.com/CedarJin/2026-ysjin-reminder_app.git
cd 2026-ysjin-reminder_app
```

### 1.2 Install dependencies

```bash
npm install
```

This installs:
- Next.js 14, React, Tailwind CSS
- Supabase client and SSR helpers
- SendGrid mail SDK
- `date-fns` / `date-fns-tz` for timezone-aware date math
- `papaparse` and `xlsx` for spreadsheet parsing
- Vitest for testing

---

## Step 2 — Create a Supabase Project

### 2.1 Create a new project

1. Go to [https://supabase.com](https://supabase.com) and sign in.
2. Click **New Project**.
3. Give it a name (e.g. `clinical-trial-reminders`).
4. Choose a region close to your study site.
5. Set a secure database password and save it.
6. Wait for the project to finish provisioning.

### 2.2 Collect your Supabase credentials

Go to **Project Settings → API** and copy:

- `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
- `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `service_role secret` key → `SUPABASE_SERVICE_ROLE_KEY`

> ⚠️ The `service_role` key bypasses Row Level Security. Never expose it in the browser or commit it to Git.

---

## Step 3 — Initialize the Database

1. In your Supabase dashboard, go to **SQL Editor**.
2. Click **New query**.
3. Open `db/migrations/001_initial.sql` from this repository, copy the entire contents, paste it into the SQL Editor, and click **Run**.

This creates:

- `participants` — study participant records
- `visits` — scheduled study visits (Day 0, 90, 180)
- `calculated_study_events` — derived events (patternized diet start, stool windows, etc.)
- `reminder_rules` — configurable rules defining when reminders are sent
- `reminder_jobs` — individual reminder jobs (scheduled/sent/failed/canceled)
- `email_templates` — HTML-formatted email templates
- `audit_logs` — all state changes for compliance

To verify, run:

```sql
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;
```

You should see all seven tables listed.

---

## Step 4 — Configure Environment Variables

### 4.1 Copy the environment template

```bash
cp .env.local .env
```

### 4.2 Fill in `.env.local`

Open `.env.local` and replace every placeholder value with your real credentials:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Option A: SMTP (works with Gmail, school email, etc.)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Option B: SendGrid (recommended)
SENDGRID_API_KEY=your-sendgrid-api-key
SENDGRID_FROM_EMAIL=noreply@your-domain.com

# Generic from address
FROM_EMAIL=

# Email safety — keep false once deployed and tested
DISABLE_EMAIL_SENDING=true

# Application
SITE_TIMEZONE=America/Los_Angeles
```

> ⚠️ `.env.local` is already in `.gitignore` and will NOT be committed to Git. You must manually enter these environment variables in your Vercel project settings as well.

---

## Step 5 — Seed Reminder Rules and Email Templates

### 5.1 Run the seed script

```bash
npm run db:seed
```

This inserts 10 reminder rules (defining when each email fires) and 13 email templates into the database.

### 5.2 Verify the seed

In Supabase SQL Editor:

```sql
SELECT rule_id, email_name FROM reminder_rules;
SELECT template_id, email_name FROM email_templates;
```

Expected: 10 reminder rules and 13 email templates.

---

## Step 6 — Create a Coordinator User

The app requires authentication. You must create at least one coordinator user.

1. In Supabase, go to **Authentication → Users**.
2. Click **Add user**.
3. Enter the coordinator's email address and a strong password.
4. Click **Create user**.

For local development, you can disable email confirmation in **Authentication → Providers → Email**.

---

## Step 7 — Configure Email Sending (SendGrid or SMTP)

### Option A — SendGrid (Recommended)

1. Go to [https://sendgrid.com](https://sendgrid.com) and sign up.
2. In Settings → API Keys, create a new API key.
3. In Settings → Sender Authentication, verify a sender email.
4. Set in `.env.local`:
   ```
   SENDGRID_API_KEY=your-key
   SENDGRID_FROM_EMAIL=your-verified-sender@example.com
   ```

### Option B — SMTP (Free with Gmail)

1. Enable 2-Step Verification on your Gmail account.
2. Go to [https://myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords) and generate an app password.
3. Set in `.env.local`:
   ```
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-16-char-app-password
   ```

---

## Step 8 — Deploy to Vercel

1. Push code to GitHub:
   ```bash
   git add -A
   git commit -m "Initial setup"
   git push origin main
   ```

2. Go to [https://vercel.com](https://vercel.com), sign in with GitHub.

3. Click **Add New → Project**, find your repository, and import it.

4. In the project configuration, add the following **Environment Variables** (same values as your `.env.local`):

   | Variable | Required |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Yes |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes |
   | `SUPABASE_SERVICE_ROLE_KEY` | Yes |
   | `SENDGRID_API_KEY` | For SendGrid |
   | `SENDGRID_FROM_EMAIL` | For SendGrid |
   | `DISABLE_EMAIL_SENDING` | Set to `false` when ready |
   | `SITE_TIMEZONE` | Yes (default: `America/Los_Angeles`) |

5. Click **Deploy**. Vercel automatically builds and deploys the app.

6. Once deployed, go to **Settings → Environment Variables** to manage them later.

### 8.1 Configure Supabase Auth for Vercel

1. In Supabase **Authentication → Settings**:
   - Set **Site URL** to `https://your-app.vercel.app`
   - Add **Redirect URLs**: `https://your-app.vercel.app/auth/callback`
2. Click **Save**.

---

## Step 9 — Set Up Automatic Email Sending (cron-job.org)

The app includes an endpoint (`/api/reminders/process-due`) that sends all due reminder emails. To run it automatically:

1. Go to [https://cron-job.org](https://cron-job.org) and sign up (free).
2. Click **Create Cron Job**.
3. Fill in:
   - **Title**: `Process reminder emails`
   - **URL**: `https://your-app.vercel.app/api/reminders/process-due`
   - **Execution schedule**: `Every 5 minutes` (or `Every 15 minutes`)
4. Click **Create**.

> Note: The `/api/reminders/process-due` endpoint is publicly accessible (no login required) so cron-job.org can call it without authentication.

### How automatic sending works

- The cron job calls the API every N minutes.
- The API picks up all `scheduled` reminder jobs whose send time has passed (within the last 12 hours).
- Jobs overdue by more than 12 hours are NOT auto-sent — they appear with a red **overdue** badge in the UI and require manual action (Send Now button).
- Sent jobs are marked as `sent` in the database; failed jobs can be retried manually.

---

## Step 10 — Run the Development Server

### Start Next.js

```bash
npm run dev
```

The app will be available at [http://localhost:3000](http://localhost:3000).

### Run tests

```bash
npm test
```

---

## Step 11 — Verify the System

### 11.1 Log in

Open your deployed app URL (or `http://localhost:3000/login`) and sign in with the coordinator credentials created in Step 6.

### 11.2 Dashboard

The Dashboard shows:
- **Active Participants** — total count of active participants
- **Emails Today** — reminder emails sent today
- **Upcoming Visits This Week** — participants with visits scheduled this week
- **Missing Day 90/180** — participants who have Day 0 scheduled but are missing later visits
- **Failed Emails** — reminder jobs with errors
- **Recent Reschedules** — visits rescheduled in the last 7 days

### 11.3 Manage Participants

1. Go to **Participants** (top nav).
2. Click **Add Participant** to create a new participant (you'll be redirected to their detail page).
3. Use the status filter buttons to view Active, Paused, Withdrawn, or Completed participants.
4. Click **View** to open a participant's detail page.

### 11.4 Schedule Visits

On a participant's detail page:
1. Use the **Schedule Visits** forms to set Day 0, Day 90, and Day 180 dates and times.
2. If a visit is already scheduled, the form updates it (reschedule).
3. The **Study Timeline** shows the calculated events and all reminder emails.
4. The **Reminder Emails** table shows the full list of generated reminder jobs.

### 11.5 Manage Reminder Emails

In the Reminder Emails table:
- **Send Now** — immediately send a scheduled/failed reminder
- **Cancel** — cancel a pending reminder
- **Edit** — change the scheduled send date/time
- **Regenerate** — recreate all pending reminders from scratch

### 11.6 Reminders Overview

Go to **Reminders** (top nav) to see ALL reminder jobs across all participants. Filter by status (Scheduled, Overdue, Sent, Failed) and sort by any column.

### 11.7 Update Participant Info

On a participant's detail page, click **Edit Info** to change first name, last name, email, or timezone. The status dropdown next to the name allows changing participant status (Active / Paused / Withdrawn / Completed).

### 11.8 Check Overdue Reminders

If a reminder's scheduled send time has passed by more than 12 hours, it appears with a red `overdue` badge and is NOT sent automatically. Click **Send Now** to send it manually, or **Edit** to reschedule it.

### 11.9 Import Participants from a Spreadsheet

Go to `/imports` to bulk import participants from a CSV or XLSX file with columns:
- `study_id`, `first_name`, `last_name`, `email` (required)
- `scheduled_day_0_date`, `scheduled_day_0_time` (optional)
- `scheduled_day_90_date`, `scheduled_day_90_time` (optional)
- `scheduled_day_180_date`, `scheduled_day_180_time` (optional)
- `participant_id`, `timezone`, `status`, `email_opt_out`, `notes` (optional)

---

## Production Deployment Checklist

### Environment

- [ ] Use a production Supabase project (not a test one)
- [ ] Verify SendGrid sender is verified
- [ ] Set `DISABLE_EMAIL_SENDING=false` only after full QA
- [ ] Ensure `SUPABASE_SERVICE_ROLE_KEY` is never exposed to the browser

### Database

- [ ] Run `db/migrations/001_initial.sql` on the production database
- [ ] Run `npm run db:seed` against the production database

### Auth

- [ ] Configure **Site URL** and **Redirect URLs** in Supabase Auth settings to match your production domain
- [ ] Create production coordinator accounts

### Email Review

- [ ] Have the study team review all email templates before enabling real sends
- [ ] All emails include CC to study coordinators
- [ ] Verify email content formatting (bold text, paragraphs, signatures)

### Monitoring

- [ ] Set up cron-job.org for automatic email processing
- [ ] Check the Dashboard periodically for failed emails

---

## Troubleshooting

### Login does not work
- Confirm the user exists in Supabase Auth (**Authentication → Users**)
- Confirm Site URL and Redirect URLs are set correctly in Supabase Auth settings
- Check browser console for auth errors

### Emails are not sending
- Check that `DISABLE_EMAIL_SENDING` is `false`
- Verify SendGrid API key and sender verification
- Check the reminder job status — if `failed`, read the `last_error` column in the database
- Check that the participant status is `active`

### `relation "participants" does not exist`
- Run the database migration in Supabase SQL Editor

### Seed script fails
- Check that `SUPABASE_SERVICE_ROLE_KEY` is set in `.env.local`
- Make sure the database tables already exist

### Dashboard stats show 0
- Refresh the page
- Check that participants have the correct status (`active`)
- The `/api/dashboard/stats` endpoint may need time if there are many jobs

### Reminder jobs get unique constraint errors on Regenerate
- This has been fixed — jobs with the same `(rule_id, visit_id)` are skipped during regeneration
- If the error persists, run the database migration again to ensure the unique constraint exists

### Page is not responsive
- The UI uses Tailwind's responsive utilities — if on mobile, make sure you're not zoomed in
- All tables support horizontal scrolling on narrow screens
