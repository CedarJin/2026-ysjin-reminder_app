# Clinical Trial Reminder System — Getting Started

This guide walks you through setting up, configuring, and running the Clinical Trial Participant Reminder System from scratch.

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
9. [Step 7 — Configure SMTP (Free, Recommended)](#step-7--configure-smtp-free-recommended)
10. [Step 8 — Configure SendGrid (Alternative)](#step-8--configure-sendgrid-alternative)
11. [Step 9 — Configure Trigger.dev (Optional for Local Dev)](#step-9--configure-triggerdev-optional-for-local-dev)
12. [Step 10 — Run the Development Server](#step-10--run-the-development-server)
13. [Step 11 — Verify the System](#step-11--verify-the-system)
14. [Production Deployment Checklist](#production-deployment-checklist)
15. [Troubleshooting](#troubleshooting)

---

## What You Need Before You Start

Before you begin, make sure you have the following accounts and tools ready.

### Required Accounts

| Service | Purpose | Free Tier Available? |
|---|---|---|
| **Supabase** | PostgreSQL database + authentication | Yes |
| **SendGrid** | Alternative email sender | Yes (free tier) |
| **Trigger.dev** | Background worker that polls and sends due emails | Yes |
| **Vercel** (optional) | Hosting the Next.js app | Yes |

### Required Software

| Tool | Recommended Version | Check Command |
|---|---|---|
| **Node.js** | 20.x or later (18.x works but shows deprecation warnings) | `node -v` |
| **npm** | 10.x or later | `npm -v` |
| **Git** | Latest | `git -v` |

### Knowledge You Should Have

- Basic familiarity with Next.js and React
- How to run SQL in a PostgreSQL database
- How to create API keys in SendGrid and Trigger.dev

---

## Quick Start Overview

If you already have everything ready, here is the 30-second version:

```bash
npm install
cp .env.local .env.local
cp .env.local .env.local.example   # optional backup
# fill in .env.local with your Supabase, SendGrid, and Trigger.dev credentials
npx tsx db/migrations/001_initial.sql   # run against your Supabase database
npm run db:seed
npm run dev
```

Then open [http://localhost:3000/login](http://localhost:3000/login).

The rest of this guide explains each step in detail.

---

## Step 1 — Clone and Install

### 1.1 Get the code

If you are reading this inside an already-cloned repository, you can skip this step and go straight to **1.2 Install dependencies**.

If you do not have the code yet, clone the repository:

```bash
git clone <your-repository-url>
cd clinical-trial-reminder-system
```

### 1.2 Install dependencies

Make sure you are in the project root directory, then run:

```bash
npm install
```

This installs:

- Next.js, React, Tailwind CSS
- Supabase client and SSR helpers
- SendGrid mail SDK
- Trigger.dev SDK
- `date-fns` / `date-fns-tz` for timezone-aware date math
- `papaparse` and `xlsx` for spreadsheet parsing
- Vitest for testing

---

## Step 2 — Create a Supabase Project

### 2.1 Create a new project

1. Go to [https://supabase.com](https://supabase.com) and sign in.
2. Click **New Project**.
3. Give it a name, for example `clinical-trial-reminders`.
4. Choose a region close to your study site (e.g., `West US (North California)`).
5. Set a secure database password and save it somewhere safe.
6. Wait for the project to finish provisioning.

### 2.2 Collect your Supabase credentials

Once the project is ready, go to **Project Settings → API** and copy these values:

- `Project URL` → this becomes `NEXT_PUBLIC_SUPABASE_URL`
- `anon public` API key → this becomes `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `service_role secret` API key → this becomes `SUPABASE_SERVICE_ROLE_KEY`

> ⚠️ The `service_role` key bypasses Row Level Security. Never expose it in the browser or commit it to Git.

---

## Step 3 — Initialize the Database

### 3.1 Open the Supabase SQL Editor

1. In your Supabase project dashboard, go to **SQL Editor**.
2. Click **New query**.

### 3.2 Run the initial migration

Open `db/migrations/001_initial.sql` from this repository, copy the entire contents, paste it into the SQL Editor, and click **Run**.

This creates the following tables:

- `participants`
- `visits`
- `calculated_study_events`
- `reminder_rules`
- `reminder_jobs`
- `email_templates`
- `audit_logs`

It also creates indexes, triggers for `updated_at`, and the `update_updated_at_column` helper function.

### 3.3 Verify the tables were created

Run this query in the SQL Editor:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

You should see all seven tables listed.

---

## Step 4 — Configure Environment Variables

### 4.1 Copy the environment template

```bash
cp .env.local .env.local.example
```

The `.env.local.example` file is now a backup. Edit `.env.local` directly.

### 4.2 Fill in `.env.local`

Open `.env.local` and replace every placeholder value with your real credentials.

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Email provider — choose ONE: SMTP (recommended for free) OR SendGrid

# Option A: SMTP (works with Gmail, school email, etc.)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Option B: SendGrid
SENDGRID_API_KEY=your-sendgrid-api-key
SENDGRID_FROM_EMAIL=noreply@your-domain.com

# Generic fallback from address (used by SMTP or SendGrid)
FROM_EMAIL=your-email@gmail.com

# Email safety — keep true until you are ready to send real emails
DISABLE_EMAIL_SENDING=true

# Trigger.dev
TRIGGER_API_KEY=your-trigger-api-key
TRIGGER_API_URL=https://api.trigger.dev

# Application
SITE_TIMEZONE=America/Los_Angeles
```

#### Field reference

| Variable | Where It Comes From | Required? | Notes |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project Settings → API | Yes | Public, safe for browser |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Project Settings → API | Yes | Public, safe for browser |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Project Settings → API | Yes | Server-only, keep secret |
| `SMTP_HOST` | Your email provider's SMTP settings | Only if using SMTP | e.g. `smtp.gmail.com` |
| `SMTP_PORT` | Your email provider's SMTP settings | Only if using SMTP | e.g. `587` |
| `SMTP_SECURE` | Your email provider's SMTP settings | Only if using SMTP | `false` for port 587, `true` for 465 |
| `SMTP_USER` | Your email login | Only if using SMTP | Usually your full email address |
| `SMTP_PASS` | Your email password or app password | Only if using SMTP | Never use your main password for Gmail; use an app password |
| `SENDGRID_API_KEY` | SendGrid Settings → API Keys | Only if using SendGrid | Server-only |
| `SENDGRID_FROM_EMAIL` | A verified sender in SendGrid | Only if using SendGrid | Must match a verified sender |
| `FROM_EMAIL` | The email address you want to send from | Recommended | Used as the fallback `From` address |
| `DISABLE_EMAIL_SENDING` | Set manually | Yes | Keep `true` during local development and testing |
| `TRIGGER_API_KEY` | Trigger.dev project settings | Yes, for background worker | Server-only |
| `TRIGGER_API_URL` | Trigger.dev project settings | Yes | Usually `https://api.trigger.dev` |
| `SITE_TIMEZONE` | Set manually | Yes | Default study site timezone |

---

## Step 5 — Seed Reminder Rules and Email Templates

### 5.1 Run the seed script

```bash
npm run db:seed
```

This script reads `templates/email_templates.json` and inserts:

- The 10 standard reminder rules from `SPEC.md` into `reminder_rules`
- The 13 cleaned email templates into `email_templates`

### 5.2 Verify the seed worked

In the Supabase SQL Editor, run:

```sql
SELECT rule_id, email_name FROM reminder_rules;
SELECT template_id, email_name FROM email_templates;
```

You should see 10 reminder rules and 13 email templates.

---

## Step 6 — Create a Coordinator User

The app requires authentication. You must create at least one coordinator user before logging in.

### 6.1 Create a user in Supabase Auth

1. In Supabase, go to **Authentication → Users**.
2. Click **Add user**.
3. Choose **Create new user**.
4. Enter the coordinator's email address and a strong password.
5. Click **Create user**.

### 6.2 Confirm the email address (recommended)

For local development, you can skip email confirmation. In production, you should enable email confirmation in **Authentication → Providers → Email**.

### 6.3 Test login

1. Start the dev server (see Step 10).
2. Open [http://localhost:3000/login](http://localhost:3000/login).
3. Enter the coordinator email and password.
4. You should be redirected to `/dashboard`.

---

## Step 7 — Configure SMTP (Free, Recommended)

The app supports sending emails through any SMTP server. This is the **recommended free option** because it works with Gmail, school email accounts, and most institutional email systems.

The app will use SMTP if `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, and `SMTP_PASS` are set. Otherwise it falls back to SendGrid.

### 7.1 Option A — Use a Gmail account (completely free)

1. Make sure the Gmail account has **2-Step Verification** turned on.
2. Go to [https://myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords).
3. Generate an app password for `Mail`.
4. Copy the 16-character password.
5. Fill in `.env.local`:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=xxxx xxxx xxxx xxxx
FROM_EMAIL=your-email@gmail.com
```

> ⚠️ Use the app password, not your regular Gmail password.

### 7.2 Option B — Use your school email account

1. Find your school's SMTP settings. Common values:
   - **Host**: `smtp.university.edu` or `mail.university.edu`
   - **Port**: `587` (with STARTTLS) or `465` (SSL)
   - **Username**: your full school email address
   - **Password**: your school email password or an app-specific password
2. Update `.env.local`:

```env
SMTP_HOST=smtp.university.edu
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-name@university.edu
SMTP_PASS=your-password
FROM_EMAIL=your-name@university.edu
```

> ⚠️ Some universities block third-party SMTP access. If emails fail, ask your IT department whether SMTP access is allowed, or use Option A (Gmail) instead.

### 7.3 Option C — Use any other email provider

Any provider that supports SMTP will work. Examples:

| Provider | Host | Port | Secure |
|---|---|---|---|
| Outlook / Hotmail | `smtp-mail.outlook.com` | `587` | `false` |
| Yahoo Mail | `smtp.mail.yahoo.com` | `587` | `false` |
| Zoho Mail | `smtp.zoho.com` | `587` | `false` |

### 7.4 Test SMTP without sending real emails

Keep `DISABLE_EMAIL_SENDING=true` while testing. The app will mark jobs as `sent` with a mock message ID, so you can verify the scheduling logic without actually sending emails.

When you are ready to send real emails:

```env
DISABLE_EMAIL_SENDING=false
```

Restart the app after changing this value.

---

## Step 8 — Configure SendGrid (Alternative)

If you prefer not to use SMTP, you can use SendGrid instead. SendGrid also has a free tier (100 emails per day).

### 8.1 Create a SendGrid account

1. Go to [https://sendgrid.com](https://sendgrid.com) and sign up.
2. Complete the account verification process.

### 8.2 Create an API key

1. In SendGrid, go to **Settings → API Keys**.
2. Click **Create API Key**.
3. Name it `Clinical Trial Reminders`.
4. Choose **Restricted Access** or **Full Access**.
5. Copy the key immediately — SendGrid shows it only once.
6. Paste it into `.env.local` as `SENDGRID_API_KEY`.

### 8.3 Verify a sender email

1. Go to **Settings → Sender Authentication**.
2. Choose **Single Sender Verification**.
3. Add and verify the email address you want to send from.
4. Use that email as `SENDGRID_FROM_EMAIL` in `.env.local`.

### 8.4 Switch from SMTP to SendGrid

Make sure the `SMTP_*` variables are empty or removed from `.env.local`, then set:

```env
SENDGRID_API_KEY=your-sendgrid-api-key
SENDGRID_FROM_EMAIL=your-verified-sender@example.com
FROM_EMAIL=your-verified-sender@example.com
```

---

## Step 9 — Configure Trigger.dev (Optional for Local Dev)

The background worker polls for due reminder jobs every 5 minutes and sends them.

### 8.1 Create a Trigger.dev account

1. Go to [https://trigger.dev](https://trigger.dev) and sign up.
2. Create a new project, for example `clinical-trial-reminders`.

### 8.2 Get your API key

1. In the Trigger.dev dashboard, go to your project settings.
2. Copy the **Development API Key** or **Production API Key**.
3. Paste it into `.env.local` as `TRIGGER_API_KEY`.

### 8.3 Run the Trigger.dev dev server

In a separate terminal window, run:

```bash
npx trigger.dev@latest dev
```

Or, if you installed the Trigger.dev CLI globally:

```bash
trigger dev
```

This connects your local Next.js app to Trigger.dev and starts executing the `sendReminders` job.

### 8.4 Verify the job is registered

In the Trigger.dev dashboard, you should see a job named **Send Due Reminder Emails**.

---

## Step 10 — Run the Development Server

### 10.1 Start Next.js

```bash
npm run dev
```

The app will be available at [http://localhost:3000](http://localhost:3000).

### 10.2 Start the Trigger.dev worker (optional, for email sending)

In another terminal:

```bash
npx trigger.dev@latest dev
```

### 10.3 Run tests

To make sure everything is working:

```bash
npm test
```

You should see all tests pass.

---

## Step 11 — Verify the System

### 11.1 Log in

1. Open [http://localhost:3000/login](http://localhost:3000/login).
2. Use the coordinator email and password you created in Step 6.

### 11.2 Add a participant manually

1. Go to [http://localhost:3000/participants](http://localhost:3000/participants).
2. Currently the UI shows the participant list; manual creation is available through the API or can be added to the UI later.
3. For testing, you can use the API directly:

```bash
curl -X POST http://localhost:3000/api/participants \
  -H "Content-Type: application/json" \
  -d '{
    "studyId": "STUDY-001",
    "firstName": "Alice",
    "lastName": "Smith",
    "email": "alice@example.com"
  }'
```

### 11.3 Schedule visits

1. Open the participant detail page.
2. Use the **Schedule Visits** forms to set Day 0, Day 90, and Day 180 dates and times.
3. Check the timeline to see calculated events and scheduled emails.

### 11.4 Import participants from a spreadsheet

1. Go to [http://localhost:3000/imports](http://localhost:3000/imports).
2. Upload a CSV or XLSX file with these required columns:
   - `study_id`
   - `first_name`
   - `last_name`
   - `email`
   - `scheduled_day_0_date` (YYYY-MM-DD)
   - `scheduled_day_0_time` (HH:MM)
3. Optional columns:
   - `scheduled_day_90_date`, `scheduled_day_90_time`
   - `scheduled_day_180_date`, `scheduled_day_180_time`
   - `participant_id`, `timezone`, `status`, `email_opt_out`, `notes`
4. Review the preview and confirm the import.

### 11.5 Check the reminder queue

1. Go to [http://localhost:3000/reminders](http://localhost:3000/reminders).
2. You should see scheduled reminder jobs.
3. Click **Send Now** on a scheduled job to trigger a test send.
4. Because `DISABLE_EMAIL_SENDING=true`, the job will be marked as `sent` with a mock message ID.

---

## Production Deployment Checklist

Before deploying to production, complete every item on this list.

### Environment

- [ ] Use a production Supabase project, not the local/dev one
- [ ] Use a production SMTP account or SendGrid API key
- [ ] Verify the `FROM_EMAIL` address works with your chosen provider
- [ ] Use a production Trigger.dev API key
- [ ] Set `DISABLE_EMAIL_SENDING=false` only after full QA
- [ ] Ensure `SUPABASE_SERVICE_ROLE_KEY` is never exposed to the browser
- [ ] Set `NODE_ENV=production` in your hosting platform

### Database

- [ ] Run `db/migrations/001_initial.sql` on the production database
- [ ] Run `npm run db:seed` against the production database
- [ ] Enable Row Level Security (RLS) policies if you want multi-tenant access control

### Auth

- [ ] Enable **Email Confirmations** in Supabase Auth
- [ ] Configure **Site URL** and **Redirect URLs** in Supabase Auth settings to match your production domain
- [ ] Create production coordinator accounts

### Email Review

- [ ] Have the study team review all email templates before enabling real sends
- [ ] Send test emails to internal addresses first
- [ ] Verify that no unnecessary PHI is included in emails

### Monitoring

- [ ] Set up Trigger.dev production environment
- [ ] Configure error tracking (e.g., Sentry)
- [ ] Set up logging for audit history

---

## Troubleshooting

### `Error: Missing Supabase URL or anon key environment variables`

Your `.env.local` is missing values or is not being loaded. Make sure the file is named `.env.local` and is in the project root.

### `Failed to connect to Supabase`

- Verify your `NEXT_PUBLIC_SUPABASE_URL` is correct
- Make sure your network allows outbound connections to Supabase
- Check that the Supabase project is not paused

### `relation "participants" does not exist`

You have not run the database migration. Run `db/migrations/001_initial.sql` in the Supabase SQL Editor.

### Seed script fails

- Check that `SUPABASE_SERVICE_ROLE_KEY` is set
- Make sure the database tables already exist
- Verify you have network access to Supabase

### Emails are not sending

- Check that `DISABLE_EMAIL_SENDING` is `false`
- If using **SMTP**: verify `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, and `SMTP_PASS`
- If using **Gmail**: make sure you are using an **App Password**, not your regular password
- If using **school email**: confirm with your IT department that SMTP access is allowed
- If using **SendGrid**: verify `SENDGRID_API_KEY` and `SENDGRID_FROM_EMAIL`, and make sure the sender is verified
- Check the `reminder_jobs` table for `failed` or `skipped` statuses
- Read the `last_error` column on failed jobs for specific error messages

### Trigger.dev job is not running

- Make sure `TRIGGER_API_KEY` and `TRIGGER_API_URL` are set
- Run `npx trigger.dev@latest dev` in a separate terminal
- Check the Trigger.dev dashboard for registered jobs

### Login does not work

- Confirm the user exists in Supabase Auth
- For local dev, disable **Confirm Email** in Supabase Auth settings
- Check the browser console for auth errors

### Tests fail

- Make sure you ran `npm install`
- Some tests use in-memory repositories and do not require Supabase
- Run `npx vitest run` to see detailed error output

---

## Next Steps After Setup

1. Customize the email templates in `templates/email_templates.json` if needed, then re-run `npm run db:seed`.
2. Adjust reminder rules in `db/seed/seedReminderRules.ts` if your study protocol changes.
3. Add more dashboard summary cards and filters as your team needs them.
4. Implement the full calendar grid in `app/calendar/page.tsx`.
5. Set up production hosting on Vercel or your preferred platform.

For detailed system behavior, see `SPEC.md`.
