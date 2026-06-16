# Clinical Trial Participant Reminder System — SPEC.md

## 1. Purpose

Build a clinical trial participant reminder system for study coordinators.

The app helps automatically manage participant reminder emails based on each participant’s scheduled Day 0, Day 90, and Day 180 study visits.

Each participant is subscribed to a study-specific reminder sequence. The app calculates reminder timing, visit-related study dates, patternized diet start dates, stool sample collection windows, last bite times, habitual diet reminders, reschedule emails, and email jobs.

This system should support:

- Spreadsheet import
- Manual participant entry
- Manual visit scheduling
- Manual visit rescheduling
- Automatic reminder job generation
- Automatic calculated study variables
- Email template rendering
- Reminder queue monitoring
- Reschedule detection
- Duplicate prevention
- Visual coordinator dashboard
- Calendar view
- Audit log

This is a reminder and scheduling support system only. It should not make clinical decisions.

---

## 2. Product Mental Model

Do not build this as a simple email automation script.

Build this as a participant timeline and reminder subscription system.

Core model:

```text
Participant
  → Visits
    → Calculated study events
      → Reminder jobs
        → Emails
```

Each participant has a study journey:

```text
Day 0 phase
→ Week 6 habitual diet
→ Day 90 phase
→ Week 18 habitual diet
→ Day 180 phase
```

The app should help study coordinators answer these questions quickly:

```text
Who needs attention today?
Who has an upcoming visit?
Who is missing Day 90 or Day 180 scheduling?
Which emails are scheduled today?
Which emails failed?
Which participants were recently rescheduled?
Which reminders are based on outdated visit times?
Which participants have incomplete study timelines?
```

---

## 3. Users

Primary user:

```text
Study coordinator
```

The coordinator should be able to:

- Import participants from spreadsheet
- Add participants manually
- Edit participant information
- Add Day 0, Day 90, and Day 180 visit dates and times
- Reschedule visits
- Preview calculated study dates
- Preview upcoming emails
- Send or schedule emails
- Pause reminders
- Resume reminders
- Cancel future reminders
- Retry failed emails
- Review participant email history
- Review audit logs

---

## 4. Spreadsheet Input

The current spreadsheet contains these columns:

| Column | Required | Description |
|---|---:|---|
| `study_id` | Yes | Study/protocol ID |
| `first_name` | Yes | Participant first name |
| `last_name` | Yes | Participant last name |
| `email` | Yes | Participant email address |
| `scheduled_day_0_date` | Yes | Day 0 visit date |
| `scheduled_day_0_time` | Yes | Day 0 visit time |

Recommended future optional columns:

| Column | Required | Description |
|---|---:|---|
| `participant_id` | Recommended | Stable unique participant ID |
| `timezone` | Recommended | Example: `America/Los_Angeles` |
| `scheduled_day_90_date` | Optional | Day 90 visit date |
| `scheduled_day_90_time` | Optional | Day 90 visit time |
| `scheduled_day_180_date` | Optional | Day 180 visit date |
| `scheduled_day_180_time` | Optional | Day 180 visit time |
| `status` | Optional | active, paused, withdrawn, completed |
| `email_opt_out` | Optional | true/false |
| `notes` | Optional | Internal coordinator notes |

If `participant_id` is missing, use:

```text
participant_key = study_id + email
```

If `timezone` is missing, use the study site’s default timezone.

Default timezone for MVP:

```text
America/Los_Angeles
```

---

## 5. Manual Data Entry

The app should not require spreadsheet upload every time.

Study coordinators must be able to manually:

- Add a new participant
- Edit participant name
- Edit participant email
- Add Day 0 visit date and time
- Add Day 90 visit date and time
- Add Day 180 visit date and time
- Reschedule Day 0
- Reschedule Day 90
- Reschedule Day 180
- Cancel a visit
- Pause participant reminders
- Resume participant reminders
- Manually resend an email
- Add internal notes
- Mark participant as completed
- Mark participant as withdrawn

Important implementation rule:

```text
Spreadsheet import and manual editing must both call the same backend scheduling and rescheduling services.
```

This prevents different behavior between imported data and manually entered data.

---

## 6. Core Participant Reminder Sequence

Each participant can receive up to 10 standard emails:

1. `Scheduling: In-Person Study Visit Day 0`
2. `REMINDER: Patternized Diet Starts Tomorrow — Day 0`
3. `REMINDER: Day 0 Study Visit`
4. `REMINDER: Start Your 3-Day Habitual Diet — Week 6`
5. `Scheduling: In-Person Study Visit Day 90`
6. `REMINDER: Patternized Diet Starts Tomorrow — Day 90`
7. `REMINDER: Day 90 Study Visit`
8. `REMINDER: Start Your 3-Day Habitual Diet — Week 18`
9. `Scheduling: In-Person Study Visit Day 180`
10. `REMINDER: Day 180 Study Visit`

Important sequencing:

```text
Week 6 habitual diet reminder is based on Day 0.

Week 18 habitual diet reminder occurs after Day 90 and before Day 180.
It is calculated as Week 18 after Day 0, but the dashboard should display it as part of the post-Day-90 / pre-Day-180 phase.
```

---

## 7. Visit Date and Time Model

Day 0, Day 90, and Day 180 should store date and time separately for input and display.

The backend should also create a combined datetime for calculations.

### Day 0

```text
scheduled_day_0_date
scheduled_day_0_time
scheduled_day_0_datetime = scheduled_day_0_date + scheduled_day_0_time + timezone
```

### Day 90

```text
scheduled_day_90_date
scheduled_day_90_time
scheduled_day_90_datetime = scheduled_day_90_date + scheduled_day_90_time + timezone
```

### Day 180

```text
scheduled_day_180_date
scheduled_day_180_time
scheduled_day_180_datetime = scheduled_day_180_date + scheduled_day_180_time + timezone
```

The app should preserve the original date and time fields because email templates need them separately.

---

## 8. Automatically Calculated Study Variables

The system must automatically calculate study-specific dates and times for email templates and dashboard display.

---

### 8.1 Day 0 Calculated Variables

Based on:

```text
scheduled_day_0_date
scheduled_day_0_time
scheduled_day_0_datetime
```

Calculate:

```text
day0_patternized_diet_start_date = scheduled_day_0_date - 3 days

day0_stool_sample_window_start = scheduled_day_0_datetime - 1 day
day0_stool_sample_window_end = scheduled_day_0_datetime

day0_last_bite_datetime = scheduled_day_0_datetime - 12 hours
```

Template variables:

```text
{{day0_visit_date}}
{{day0_visit_time}}

{{day0_patternized_diet_start_date}}

{{day0_stool_sample_window_start_date}}
{{day0_stool_sample_window_start_time}}
{{day0_stool_sample_window_end_date}}
{{day0_stool_sample_window_end_time}}

{{day0_last_bite_date}}
{{day0_last_bite_time}}
```

Use cases:

- Day 0 scheduling email includes when to start the 3-day patternized diet.
- Day 0 scheduling email includes stool sample collection window.
- Day 0 visit reminder includes the participant’s last bite time.

---

### 8.2 Day 90 Calculated Variables

Based on:

```text
scheduled_day_90_date
scheduled_day_90_time
scheduled_day_90_datetime
```

Calculate:

```text
day90_patternized_diet_start_date = scheduled_day_90_date - 3 days

day90_stool_sample_window_start = scheduled_day_90_datetime - 1 day
day90_stool_sample_window_end = scheduled_day_90_datetime

day90_last_bite_datetime = scheduled_day_90_datetime - 12 hours
```

Template variables:

```text
{{day90_visit_date}}
{{day90_visit_time}}

{{day90_patternized_diet_start_date}}

{{day90_stool_sample_window_start_date}}
{{day90_stool_sample_window_start_time}}
{{day90_stool_sample_window_end_date}}
{{day90_stool_sample_window_end_time}}

{{day90_last_bite_date}}
{{day90_last_bite_time}}
```

Use cases:

- Day 90 scheduling email includes when to start the 3-day patternized diet.
- Day 90 scheduling email includes stool sample collection window.
- Day 90 visit reminder includes the participant’s last bite time.

---

### 8.3 Day 180 Calculated Variables

Based on:

```text
scheduled_day_180_date
scheduled_day_180_time
scheduled_day_180_datetime
```

Calculate:

```text
day180_last_bite_datetime = scheduled_day_180_datetime - 12 hours
```

Template variables:

```text
{{day180_visit_date}}
{{day180_visit_time}}

{{day180_last_bite_date}}
{{day180_last_bite_time}}
```

If Day 180 later needs patternized diet or stool sample variables, the system should support adding those through configuration rather than hard-coding new logic.

---

### 8.4 Week 6 Calculated Variables

Based on Day 0:

```text
week6_target_date = scheduled_day_0_date + 6 weeks
week6_send_date = Monday of that week
week6_send_time = 09:00
```

Template variables:

```text
{{week6_habitual_diet_start_date}}
{{week6_habitual_diet_start_time}}
```

Default assumption:

```text
week6_habitual_diet_start_date = week6_send_date
week6_habitual_diet_start_time = 09:00
```

---

### 8.5 Week 18 Calculated Variables

Based on Day 0:

```text
week18_target_date = scheduled_day_0_date + 18 weeks
week18_send_date = Monday of that week
week18_send_time = 09:00
```

Template variables:

```text
{{week18_habitual_diet_start_date}}
{{week18_habitual_diet_start_time}}
```

Default assumption:

```text
week18_habitual_diet_start_date = week18_send_date
week18_habitual_diet_start_time = 09:00
```

Validation:

```text
If Day 90 exists:
  week18_send_date should be after scheduled_day_90_date.

If Day 180 exists:
  week18_send_date should be before scheduled_day_180_date.
```

If Day 90 or Day 180 is missing, still calculate Week 18 based on Day 0, but show a dashboard warning that the sequence cannot be fully validated.

---

## 9. Email Schedule

---

### Email 1: Scheduling — In-Person Study Visit Day 0

| Field | Value |
|---|---|
| Email name | `Scheduling: In-Person Study Visit Day 0` |
| Trigger | New Day 0 visit scheduled |
| Based on | Day 0 date and time |
| Send time | Immediately after coordinator confirms schedule |
| Template | `day0_scheduling` |
| Reschedule template | `day0_rescheduling` |

This email should include:

```text
{{first_name}}
{{day0_visit_date}}
{{day0_visit_time}}
{{day0_patternized_diet_start_date}}
{{day0_stool_sample_window_start_date}}
{{day0_stool_sample_window_start_time}}
{{day0_stool_sample_window_end_date}}
{{day0_stool_sample_window_end_time}}
```

If Day 0 is rescheduled after this email has already been sent, send a Day 0 reschedule email.

---

### Email 2: Reminder — Patternized Diet Starts Tomorrow, Day 0

| Field | Value |
|---|---|
| Email name | `REMINDER: Patternized Diet Starts Tomorrow — Day 0` |
| Trigger | Scheduled relative to Day 0 |
| Send time | 4 days before Day 0 visit date |
| Default time | 9:00 AM local study/site time |
| Template | `day0_patternized_diet` |

Reasoning:

```text
Patternized diet starts 3 days before Day 0.
This reminder should be sent 1 day before the diet starts.
Therefore send 4 days before Day 0.
```

Template should include:

```text
{{first_name}}
{{day0_visit_date}}
{{day0_patternized_diet_start_date}}
```

---

### Email 3: Reminder — Day 0 Study Visit

| Field | Value |
|---|---|
| Email name | `REMINDER: Day 0 Study Visit` |
| Trigger | Scheduled relative to Day 0 |
| Send time | 1 day before Day 0 visit date |
| Default time | 9:00 AM local study/site time |
| Template | `day0_visit_reminder` |

This email should include:

```text
{{first_name}}
{{day0_visit_date}}
{{day0_visit_time}}
{{day0_last_bite_date}}
{{day0_last_bite_time}}
```

The last bite time is:

```text
scheduled_day_0_datetime - 12 hours
```

---

### Email 4: Reminder — Start Your 3-Day Habitual Diet, Week 6

| Field | Value |
|---|---|
| Email name | `REMINDER: Start Your 3-Day Habitual Diet — Week 6` |
| Trigger | Based on Day 0 |
| Send time | Monday of Week 6 after Day 0 |
| Default time | 9:00 AM local study/site time |
| Template | `week6_habitual_diet` |

Calculation:

```text
week6_target_date = scheduled_day_0_date + 6 weeks
week6_send_date = Monday of that week
week6_send_time = 09:00
```

Template should include:

```text
{{first_name}}
{{week6_habitual_diet_start_date}}
{{week6_habitual_diet_start_time}}
```

---

### Email 5: Scheduling — In-Person Study Visit Day 90

| Field | Value |
|---|---|
| Email name | `Scheduling: In-Person Study Visit Day 90` |
| Trigger | New Day 90 visit scheduled |
| Based on | Day 90 date and time |
| Send time | Immediately after coordinator confirms schedule |
| Template | `day90_scheduling` |
| Reschedule template | `day90_rescheduling` |

This email should include:

```text
{{first_name}}
{{day90_visit_date}}
{{day90_visit_time}}
{{day90_patternized_diet_start_date}}
{{day90_stool_sample_window_start_date}}
{{day90_stool_sample_window_start_time}}
{{day90_stool_sample_window_end_date}}
{{day90_stool_sample_window_end_time}}
```

If Day 90 is rescheduled after this email has already been sent, send a Day 90 reschedule email.

---

### Email 6: Reminder — Patternized Diet Starts Tomorrow, Day 90

| Field | Value |
|---|---|
| Email name | `REMINDER: Patternized Diet Starts Tomorrow — Day 90` |
| Trigger | Scheduled relative to Day 90 |
| Send time | 4 days before Day 90 visit date |
| Default time | 9:00 AM local study/site time |
| Template | `day90_patternized_diet` |

Reasoning:

```text
Patternized diet starts 3 days before Day 90.
This reminder should be sent 1 day before the diet starts.
Therefore send 4 days before Day 90.
```

Template should include:

```text
{{first_name}}
{{day90_visit_date}}
{{day90_patternized_diet_start_date}}
```

---

### Email 7: Reminder — Day 90 Study Visit

| Field | Value |
|---|---|
| Email name | `REMINDER: Day 90 Study Visit` |
| Trigger | Scheduled relative to Day 90 |
| Send time | 1 day before Day 90 visit date |
| Default time | 9:00 AM local study/site time |
| Template | `day90_visit_reminder` |

This email should include:

```text
{{first_name}}
{{day90_visit_date}}
{{day90_visit_time}}
{{day90_last_bite_date}}
{{day90_last_bite_time}}
```

The last bite time is:

```text
scheduled_day_90_datetime - 12 hours
```

---

### Email 8: Reminder — Start Your 3-Day Habitual Diet, Week 18

| Field | Value |
|---|---|
| Email name | `REMINDER: Start Your 3-Day Habitual Diet — Week 18` |
| Trigger | Based on Day 0, displayed after Day 90 and before Day 180 |
| Send time | Monday of Week 18 after Day 0 |
| Default time | 9:00 AM local study/site time |
| Template | `week18_habitual_diet` |

Calculation:

```text
week18_target_date = scheduled_day_0_date + 18 weeks
week18_send_date = Monday of that week
week18_send_time = 09:00
```

Validation:

```text
week18_send_date should occur after Day 90 if Day 90 exists.
week18_send_date should occur before Day 180 if Day 180 exists.
```

Template should include:

```text
{{first_name}}
{{week18_habitual_diet_start_date}}
{{week18_habitual_diet_start_time}}
```

---

### Email 9: Scheduling — In-Person Study Visit Day 180

| Field | Value |
|---|---|
| Email name | `Scheduling: In-Person Study Visit Day 180` |
| Trigger | Scheduled relative to Day 180 |
| Based on | Day 180 date and time |
| Send time | 2 weeks before scheduled Day 180 visit |
| Default time | 9:00 AM local study/site time |
| Template | `day180_scheduling` |
| Reschedule template | `day180_rescheduling` |

The Day 180 scheduling email is not sent immediately when the Day 180 date is entered.

It should be scheduled for:

```text
scheduled_day_180_date - 14 days at 09:00
```

If Day 180 is rescheduled after this email has already been sent, send a Day 180 reschedule email.

---

### Email 10: Reminder — Day 180 Study Visit

| Field | Value |
|---|---|
| Email name | `REMINDER: Day 180 Study Visit` |
| Trigger | Scheduled relative to Day 180 |
| Send time | 1 day before Day 180 visit date |
| Default time | 9:00 AM local study/site time |
| Template | `day180_visit_reminder` |

This email should include:

```text
{{first_name}}
{{day180_visit_date}}
{{day180_visit_time}}
{{day180_last_bite_date}}
{{day180_last_bite_time}}
```

The last bite time is:

```text
scheduled_day_180_datetime - 12 hours
```

---

## 10. Reminder Rule Configuration

The system should define reminder rules as configuration, not as scattered hard-coded logic.

Example configuration:

```yaml
reminder_rules:
  - rule_id: day0_scheduling
    email_name: "Scheduling: In-Person Study Visit Day 0"
    phase: day0
    based_on_date: scheduled_day_0_date
    based_on_time: scheduled_day_0_time
    trigger_type: send_when_new_visit_scheduled
    template_id: day0_scheduling
    reschedule_template_id: day0_rescheduling

  - rule_id: day0_patternized_diet
    email_name: "REMINDER: Patternized Diet Starts Tomorrow — Day 0"
    phase: day0
    based_on_date: scheduled_day_0_date
    based_on_time: scheduled_day_0_time
    trigger_type: relative_to_visit_date
    offset_amount: -4
    offset_unit: days
    fixed_send_time: "09:00"
    template_id: day0_patternized_diet

  - rule_id: day0_visit_reminder
    email_name: "REMINDER: Day 0 Study Visit"
    phase: day0
    based_on_date: scheduled_day_0_date
    based_on_time: scheduled_day_0_time
    trigger_type: relative_to_visit_date
    offset_amount: -1
    offset_unit: days
    fixed_send_time: "09:00"
    template_id: day0_visit_reminder

  - rule_id: week6_habitual_diet
    email_name: "REMINDER: Start Your 3-Day Habitual Diet — Week 6"
    phase: week6
    based_on_date: scheduled_day_0_date
    trigger_type: monday_of_week_after_day0
    week_number: 6
    fixed_send_time: "09:00"
    template_id: week6_habitual_diet

  - rule_id: day90_scheduling
    email_name: "Scheduling: In-Person Study Visit Day 90"
    phase: day90
    based_on_date: scheduled_day_90_date
    based_on_time: scheduled_day_90_time
    trigger_type: send_when_new_visit_scheduled
    template_id: day90_scheduling
    reschedule_template_id: day90_rescheduling

  - rule_id: day90_patternized_diet
    email_name: "REMINDER: Patternized Diet Starts Tomorrow — Day 90"
    phase: day90
    based_on_date: scheduled_day_90_date
    based_on_time: scheduled_day_90_time
    trigger_type: relative_to_visit_date
    offset_amount: -4
    offset_unit: days
    fixed_send_time: "09:00"
    template_id: day90_patternized_diet

  - rule_id: day90_visit_reminder
    email_name: "REMINDER: Day 90 Study Visit"
    phase: day90
    based_on_date: scheduled_day_90_date
    based_on_time: scheduled_day_90_time
    trigger_type: relative_to_visit_date
    offset_amount: -1
    offset_unit: days
    fixed_send_time: "09:00"
    template_id: day90_visit_reminder

  - rule_id: week18_habitual_diet
    email_name: "REMINDER: Start Your 3-Day Habitual Diet — Week 18"
    phase: week18
    based_on_date: scheduled_day_0_date
    trigger_type: monday_of_week_after_day0
    week_number: 18
    must_be_after_phase: day90
    must_be_before_phase: day180
    fixed_send_time: "09:00"
    template_id: week18_habitual_diet

  - rule_id: day180_scheduling
    email_name: "Scheduling: In-Person Study Visit Day 180"
    phase: day180
    based_on_date: scheduled_day_180_date
    based_on_time: scheduled_day_180_time
    trigger_type: relative_to_visit_date
    offset_amount: -14
    offset_unit: days
    fixed_send_time: "09:00"
    template_id: day180_scheduling
    reschedule_template_id: day180_rescheduling

  - rule_id: day180_visit_reminder
    email_name: "REMINDER: Day 180 Study Visit"
    phase: day180
    based_on_date: scheduled_day_180_date
    based_on_time: scheduled_day_180_time
    trigger_type: relative_to_visit_date
    offset_amount: -1
    offset_unit: days
    fixed_send_time: "09:00"
    template_id: day180_visit_reminder
```

Allowed trigger types:

```text
send_when_new_visit_scheduled
relative_to_visit_date
monday_of_week_after_day0
```

---

## 11. Reschedule Logic

A visit is considered rescheduled when:

```text
previous visit date/time exists
AND new visit date/time exists
AND new visit date/time is different
```

When a visit is rescheduled:

1. Update the visit date and time.
2. Recalculate all dependent study variables.
3. Cancel future unsent reminder jobs based on the old visit date/time.
4. Create replacement reminder jobs based on the new visit date/time.
5. Keep already sent reminders as `sent`.
6. If the scheduling email for that visit was already sent, create a reschedule email.
7. Add an audit log entry.

Dependent variables by phase:

```text
Day 0 reschedule recalculates:
- Day 0 patternized diet start date
- Day 0 stool sample window
- Day 0 last bite time
- Week 6 habitual diet reminder
- Week 18 habitual diet reminder, because Week 18 is based on Day 0

Day 90 reschedule recalculates:
- Day 90 patternized diet start date
- Day 90 stool sample window
- Day 90 last bite time
- Week 18 validation status

Day 180 reschedule recalculates:
- Day 180 scheduling email
- Day 180 visit reminder
- Day 180 last bite time
- Week 18 validation status
```

---

## 12. Reschedule Email Rule

Send a reschedule email when:

```text
visit date/time changed
AND original scheduling email for that visit was already sent
```

Do not send a reschedule email if the original scheduling email was never sent.

For Day 0:

```text
If day0_scheduling was already sent,
send day0_rescheduling when Day 0 changes.
```

For Day 90:

```text
If day90_scheduling was already sent,
send day90_rescheduling when Day 90 changes.
```

For Day 180:

```text
If day180_scheduling was already sent,
send day180_rescheduling when Day 180 changes.
```

Reschedule email templates should support:

```text
{{old_visit_date}}
{{old_visit_time}}

{{new_visit_date}}
{{new_visit_time}}

{{new_patternized_diet_start_date}}

{{new_stool_sample_window_start_date}}
{{new_stool_sample_window_start_time}}
{{new_stool_sample_window_end_date}}
{{new_stool_sample_window_end_time}}

{{new_last_bite_date}}
{{new_last_bite_time}}
```

---

## 13. Reminder Job Statuses

Each reminder email should be represented as a `reminder_job`.

Allowed statuses:

| Status | Meaning |
|---|---|
| `scheduled` | Waiting to be sent |
| `pending_review` | Waiting for coordinator approval |
| `sent` | Successfully sent |
| `failed` | Email provider failed |
| `canceled` | Canceled because visit was rescheduled, canceled, or participant became inactive |
| `skipped` | Skipped because of invalid data, opt-out, outdated snapshot, or missing template variable |

Every reminder job should store a snapshot of the visit date/time it was based on.

This is required to prevent outdated reminder emails from being sent after a visit changes.

---

## 14. Data Model

### 14.1 participants

```text
participants
- id
- participant_key
- participant_id
- study_id
- first_name
- last_name
- email
- timezone
- status
- email_opt_out
- notes
- created_at
- updated_at
```

Allowed participant statuses:

```text
active
paused
withdrawn
completed
```

---

### 14.2 visits

```text
visits
- id
- participant_id
- study_id
- visit_day
- visit_name
- scheduled_date
- scheduled_time
- scheduled_datetime
- timezone
- status
- created_at
- updated_at
```

Allowed `visit_day` values:

```text
0
90
180
```

Allowed visit statuses:

```text
missing
scheduled
rescheduled
completed
canceled
```

---

### 14.3 calculated_study_events

This table stores calculated values used in email templates and dashboard display.

```text
calculated_study_events
- id
- participant_id
- study_id
- source_visit_day
- event_key
- event_name
- event_date
- event_time
- event_datetime
- timezone
- calculation_rule
- created_at
- updated_at
```

Examples of `event_key`:

```text
day0_patternized_diet_start
day0_stool_sample_window_start
day0_stool_sample_window_end
day0_last_bite

day90_patternized_diet_start
day90_stool_sample_window_start
day90_stool_sample_window_end
day90_last_bite

day180_last_bite

week6_habitual_diet_start
week18_habitual_diet_start
```

---

### 14.4 reminder_rules

```text
reminder_rules
- id
- rule_id
- email_name
- study_id
- phase
- based_on_date
- based_on_time
- trigger_type
- offset_amount
- offset_unit
- week_number
- fixed_send_time
- template_id
- reschedule_template_id
- active
- created_at
- updated_at
```

---

### 14.5 reminder_jobs

```text
reminder_jobs
- id
- reminder_id
- participant_id
- study_id
- visit_id
- phase
- rule_id
- email_name
- template_id
- scheduled_send_date
- scheduled_send_time
- scheduled_send_datetime
- visit_date_snapshot
- visit_time_snapshot
- visit_datetime_snapshot
- status
- sent_at
- canceled_at
- canceled_reason
- provider_message_id
- last_error
- created_at
- updated_at
```

Recommended unique constraint:

```text
participant_id + rule_id + scheduled_send_datetime + visit_datetime_snapshot
```

This helps prevent accidental duplicate jobs.

---

### 14.6 email_templates

```text
email_templates
- id
- template_id
- study_id
- email_name
- subject
- body
- active
- version
- created_at
- updated_at
```

---

### 14.7 audit_logs

```text
audit_logs
- id
- actor
- action
- entity_type
- entity_id
- participant_id
- before_json
- after_json
- created_at
```

Important audit actions:

```text
participant_created
participant_updated
participant_paused
participant_resumed
participant_withdrawn
participant_completed

visit_scheduled
visit_rescheduled
visit_canceled
visit_completed

manual_visit_added
manual_visit_updated

spreadsheet_imported
spreadsheet_import_confirmed

calculated_event_created
calculated_event_updated

reminder_job_created
reminder_job_canceled
reminder_sent
reminder_failed
reminder_skipped

reschedule_email_created
manual_resend
template_updated
```

---

## 15. Email Template Variables

All templates should support:

```text
{{first_name}}
{{last_name}}
{{study_id}}
{{email}}
{{timezone}}
```

Day 0 variables:

```text
{{day0_visit_date}}
{{day0_visit_time}}

{{day0_patternized_diet_start_date}}

{{day0_stool_sample_window_start_date}}
{{day0_stool_sample_window_start_time}}
{{day0_stool_sample_window_end_date}}
{{day0_stool_sample_window_end_time}}

{{day0_last_bite_date}}
{{day0_last_bite_time}}
```

Day 90 variables:

```text
{{day90_visit_date}}
{{day90_visit_time}}

{{day90_patternized_diet_start_date}}

{{day90_stool_sample_window_start_date}}
{{day90_stool_sample_window_start_time}}
{{day90_stool_sample_window_end_date}}
{{day90_stool_sample_window_end_time}}

{{day90_last_bite_date}}
{{day90_last_bite_time}}
```

Day 180 variables:

```text
{{day180_visit_date}}
{{day180_visit_time}}

{{day180_last_bite_date}}
{{day180_last_bite_time}}
```

Habitual diet variables:

```text
{{week6_habitual_diet_start_date}}
{{week6_habitual_diet_start_time}}

{{week18_habitual_diet_start_date}}
{{week18_habitual_diet_start_time}}
```

Reschedule variables:

```text
{{old_visit_date}}
{{old_visit_time}}

{{new_visit_date}}
{{new_visit_time}}

{{new_patternized_diet_start_date}}

{{new_stool_sample_window_start_date}}
{{new_stool_sample_window_start_time}}
{{new_stool_sample_window_end_date}}
{{new_stool_sample_window_end_time}}

{{new_last_bite_date}}
{{new_last_bite_time}}
```

The app must block sending if any required template variable is missing.

---

## 16. Template List

The app should support these templates:

```text
day0_scheduling
day0_rescheduling
day0_patternized_diet
day0_visit_reminder

week6_habitual_diet

day90_scheduling
day90_rescheduling
day90_patternized_diet
day90_visit_reminder

week18_habitual_diet

day180_scheduling
day180_rescheduling
day180_visit_reminder
```

Although there are 10 standard participant emails, there should also be reschedule templates for Day 0, Day 90, and Day 180.

---

## 17. Example Email Template Skeletons

### 17.1 Day 0 Scheduling Email

Subject:

```text
Your Day 0 Study Visit Has Been Scheduled
```

Body:

```text
Hi {{first_name}},

Your Day 0 in-person study visit has been scheduled for:

Date: {{day0_visit_date}}
Time: {{day0_visit_time}}

Please start your 3-day patternized diet on:

{{day0_patternized_diet_start_date}}

Your stool sample collection window is:

Start: {{day0_stool_sample_window_start_date}} at {{day0_stool_sample_window_start_time}}
End: {{day0_stool_sample_window_end_date}} at {{day0_stool_sample_window_end_time}}

Please contact the study team if you need to reschedule.

Thank you,
Study Team
```

---

### 17.2 Day 0 Visit Reminder

Subject:

```text
Reminder: Your Day 0 Study Visit Is Tomorrow
```

Body:

```text
Hi {{first_name}},

This is a reminder that your Day 0 study visit is scheduled for:

Date: {{day0_visit_date}}
Time: {{day0_visit_time}}

Your last bite should be no later than:

{{day0_last_bite_date}} at {{day0_last_bite_time}}

Please contact the study team if you have questions.

Thank you,
Study Team
```

---

### 17.3 Day 90 Scheduling Email

Subject:

```text
Your Day 90 Study Visit Has Been Scheduled
```

Body:

```text
Hi {{first_name}},

Your Day 90 in-person study visit has been scheduled for:

Date: {{day90_visit_date}}
Time: {{day90_visit_time}}

Please start your 3-day patternized diet on:

{{day90_patternized_diet_start_date}}

Your stool sample collection window is:

Start: {{day90_stool_sample_window_start_date}} at {{day90_stool_sample_window_start_time}}
End: {{day90_stool_sample_window_end_date}} at {{day90_stool_sample_window_end_time}}

Please contact the study team if you need to reschedule.

Thank you,
Study Team
```

---

### 17.4 Day 90 Visit Reminder

Subject:

```text
Reminder: Your Day 90 Study Visit Is Tomorrow
```

Body:

```text
Hi {{first_name}},

This is a reminder that your Day 90 study visit is scheduled for:

Date: {{day90_visit_date}}
Time: {{day90_visit_time}}

Your last bite should be no later than:

{{day90_last_bite_date}} at {{day90_last_bite_time}}

Please contact the study team if you have questions.

Thank you,
Study Team
```

---

### 17.5 Day 180 Visit Reminder

Subject:

```text
Reminder: Your Day 180 Study Visit Is Tomorrow
```

Body:

```text
Hi {{first_name}},

This is a reminder that your Day 180 study visit is scheduled for:

Date: {{day180_visit_date}}
Time: {{day180_visit_time}}

Your last bite should be no later than:

{{day180_last_bite_date}} at {{day180_last_bite_time}}

Please contact the study team if you have questions.

Thank you,
Study Team
```

---

## 18. Import Behavior

When a spreadsheet is uploaded:

1. Parse rows.
2. Validate required columns.
3. Validate date and time separately.
4. Combine date and time using timezone.
5. Create or update participants.
6. Create or update visits.
7. Detect new visits.
8. Detect rescheduled visits.
9. Recalculate study events.
10. Create reminder jobs.
11. Cancel old future reminder jobs if visits changed.
12. Create reschedule emails if needed.
13. Show preview summary.
14. Coordinator confirms import.
15. Apply changes.
16. Write audit logs.

Import preview should show:

```text
New participants
Updated participants

New Day 0 visits
Updated Day 0 visits
Rescheduled Day 0 visits

New Day 90 visits
Updated Day 90 visits
Rescheduled Day 90 visits

New Day 180 visits
Updated Day 180 visits
Rescheduled Day 180 visits

Calculated study events created
Calculated study events updated

Reminder jobs created
Reminder jobs canceled

Immediate emails to send
Reschedule emails to send

Rows with errors
Rows with warnings
```

Invalid rows should not crash the app.

Invalid rows should appear in an import error report.

---

## 19. Manual Add / Edit Behavior

When a coordinator manually adds or edits a participant or visit, the app should show a preview before saving.

Example preview:

```text
This change will:

- Update Day 90 visit to Aug 12, 2026 at 9:30 AM
- Recalculate Day 90 patternized diet start date
- Recalculate Day 90 stool sample window
- Recalculate Day 90 last bite time
- Cancel 2 old unsent Day 90 reminder jobs
- Create 3 new Day 90 reminder jobs
- Send 1 Day 90 reschedule email because the original scheduling email was already sent
```

The coordinator should confirm before changes are applied.

Manual changes should create audit logs.

---

## 20. Sending Logic

A background worker should regularly find due reminder jobs.

Before sending, check:

```text
participant.status == active
participant.email_opt_out == false
participant.email exists
reminder_job.status == scheduled
scheduled_send_datetime <= current_time
template exists
template is active
template renders with no missing variables
```

For visit-related reminders, also check:

```text
visit.status == scheduled or rescheduled
visit_datetime_snapshot still matches the current visit datetime
```

If all checks pass:

1. Send email.
2. Mark reminder job as `sent`.
3. Save `sent_at`.
4. Save email provider message ID if available.
5. Add audit log entry.

If checks fail:

- Mark as `skipped` or `failed`.
- Save reason.
- Add audit log entry.

If snapshot no longer matches current visit datetime:

```text
Cancel or skip the reminder because it is based on an outdated visit time.
```

---

## 21. Duplicate Prevention

Before creating a reminder job, check for an existing equivalent job.

Equivalent means:

```text
same participant
same rule_id
same scheduled_send_datetime
same visit_datetime_snapshot
status is not canceled
```

Before sending:

```text
reminder_job.status must equal scheduled
```

Never send the same reminder job twice.

Already sent emails must stay in history.

Do not delete sent reminder jobs.

---

## 22. Dashboard Requirements

The dashboard should be designed for study coordinators.

Goal:

```text
A coordinator should be able to understand each participant’s current study status at a glance.
```

---

### 22.1 Main Dashboard Summary Cards

Show clickable visual summary cards:

```text
Total active participants
Emails scheduled today
Upcoming visits this week
Participants missing Day 90 schedule
Participants missing Day 180 schedule
Failed emails
Recent reschedules
Participants needing attention
```

Clicking a card should filter the participant table.

Example:

```text
Click “Missing Day 90 schedule”
→ show only active participants with no Day 90 date/time.
```

---

### 22.2 Participant Overview Table

Recommended columns:

| Column | Description |
|---|---|
| Participant | First name, last name, email |
| Study ID | Study/protocol ID |
| Current phase | Day 0, Week 6, Day 90, Week 18, Day 180, completed |
| Day 0 | Date/time + status badge |
| Week 6 | Habitual diet reminder status |
| Day 90 | Date/time + status badge |
| Week 18 | Habitual diet reminder status |
| Day 180 | Date/time + status badge |
| Next email | Next scheduled email name and time |
| Next action | What coordinator should do next |
| Alerts | Missing schedule, failed email, invalid data, reschedule needed |
| Actions | View, edit, reschedule, pause |

Visual indicators:

```text
green = completed or sent
blue = scheduled or upcoming
yellow = missing data or needs attention
red = failed email or invalid data
gray = not applicable or not scheduled yet
purple = rescheduled
```

---

### 22.3 Participant Detail Page

Each participant should have a detail page containing:

1. Participant information card
2. Visual study timeline
3. Visit schedule section
4. Calculated study events section
5. Reminder jobs section
6. Email history
7. Audit log
8. Manual actions

The page should clearly separate:

```text
Actual visit dates/times entered by coordinator
Calculated study dates/times generated by app
Reminder emails scheduled by app
Emails already sent
```

---

### 22.4 Participant Timeline UI

The timeline should show:

```text
Day 0
  - Visit scheduled
  - Patternized diet start
  - Stool sample window
  - Last bite time
  - Emails sent / scheduled

Week 6
  - Habitual diet reminder

Day 90
  - Visit scheduled
  - Patternized diet start
  - Stool sample window
  - Last bite time
  - Emails sent / scheduled

Week 18
  - Habitual diet reminder

Day 180
  - Visit scheduled
  - Last bite time
  - Emails sent / scheduled
```

Each timeline item should show:

```text
date
time
status
related email
sent/scheduled/canceled state
```

Example Day 90 phase card:

```text
Day 90
Visit: Aug 12, 2026 at 9:30 AM

Patternized diet starts: Aug 9, 2026
Stool sample window: Aug 11, 9:30 AM → Aug 12, 9:30 AM
Last bite: Aug 11, 9:30 PM

Emails:
✓ Scheduling email sent
⏰ Diet reminder scheduled
⏰ Visit reminder scheduled

Actions:
Edit visit | Reschedule | Preview emails
```

---

### 22.5 Calendar View

The app should include a calendar view showing:

```text
Upcoming Day 0 visits
Upcoming Day 90 visits
Upcoming Day 180 visits
Patternized diet start dates
Stool sample windows
Last bite times
Emails scheduled to send
```

Filters:

```text
Study ID
Participant
Visit day
Email type
Event type
Date range
Status
```

---

### 22.6 Reminder Queue View

The reminder queue should show:

```text
Scheduled reminders
Due today
Sent reminders
Failed reminders
Canceled reminders
Skipped reminders
Pending review reminders
```

Columns:

```text
Participant
Email name
Phase
Scheduled send date
Scheduled send time
Visit date
Visit time
Status
Last error
Actions
```

Actions:

```text
Preview email
Send now
Cancel
Reschedule
Mark as reviewed
Retry failed email
```

---

## 23. Current Phase Logic

The app should calculate participant current phase.

Basic rules:

```text
If Day 0 is missing:
  current_phase = "Needs Day 0 schedule"

If Day 0 exists and today is before Day 0:
  current_phase = "Pre-Day 0"

If today is after Day 0 and before Week 6:
  current_phase = "Post-Day 0"

If today is around Week 6:
  current_phase = "Week 6"

If after Week 6 and Day 90 is missing:
  current_phase = "Needs Day 90 schedule"

If Day 90 exists and today is before Day 90:
  current_phase = "Pre-Day 90"

If today is after Day 90 and before Week 18:
  current_phase = "Post-Day 90"

If today is around Week 18:
  current_phase = "Week 18"

If after Week 18 and Day 180 is missing:
  current_phase = "Needs Day 180 schedule"

If Day 180 exists and today is before Day 180:
  current_phase = "Pre-Day 180"

If today is after Day 180:
  current_phase = "Post-Day 180 / Completed pending review"
```

The current phase should be shown on the dashboard.

---

## 24. Alerts and Warnings

The dashboard should show alerts for:

```text
Missing Day 0 date or time
Missing Day 90 date or time
Missing Day 180 date or time
Invalid email
Participant opted out
Participant paused
Failed email
Outdated reminder snapshot
Week 18 not between Day 90 and Day 180
Visit date/time in the past
Reminder send time in the past
Template missing required variable
```

Each alert should have a suggested action.

Examples:

```text
Missing Day 90 schedule → Add Day 90 visit
Failed email → Retry or edit email
Week 18 validation warning → Review Day 90 and Day 180 dates
Outdated reminder snapshot → Cancel outdated reminder
```

---

## 25. Core Algorithms

### 25.1 Combine Date and Time

```text
function combineDateAndTime(date, time, timezone):
  validate date exists
  validate time exists
  return timezone-aware datetime
```

---

### 25.2 Calculate Day 0 Study Events

```text
function calculateDay0Events(day0Date, day0Time, timezone):
  day0Datetime = combineDateAndTime(day0Date, day0Time, timezone)

  return:
    day0_patternized_diet_start_date = day0Date - 3 days
    day0_stool_sample_window_start = day0Datetime - 1 day
    day0_stool_sample_window_end = day0Datetime
    day0_last_bite_datetime = day0Datetime - 12 hours
```

---

### 25.3 Calculate Day 90 Study Events

```text
function calculateDay90Events(day90Date, day90Time, timezone):
  day90Datetime = combineDateAndTime(day90Date, day90Time, timezone)

  return:
    day90_patternized_diet_start_date = day90Date - 3 days
    day90_stool_sample_window_start = day90Datetime - 1 day
    day90_stool_sample_window_end = day90Datetime
    day90_last_bite_datetime = day90Datetime - 12 hours
```

---

### 25.4 Calculate Day 180 Study Events

```text
function calculateDay180Events(day180Date, day180Time, timezone):
  day180Datetime = combineDateAndTime(day180Date, day180Time, timezone)

  return:
    day180_last_bite_datetime = day180Datetime - 12 hours
```

---

### 25.5 Calculate Week 6

```text
function calculateWeek6(day0Date, timezone):
  targetDate = day0Date + 6 weeks
  sendDate = Monday of targetDate's week
  sendTime = 09:00
  return timezone-aware datetime
```

---

### 25.6 Calculate Week 18

```text
function calculateWeek18(day0Date, day90Date, day180Date, timezone):
  targetDate = day0Date + 18 weeks
  sendDate = Monday of targetDate's week
  sendTime = 09:00

  warnings = []

  if day90Date exists and sendDate <= day90Date:
    warnings.add("Week 18 reminder is not after Day 90")

  if day180Date exists and sendDate >= day180Date:
    warnings.add("Week 18 reminder is not before Day 180")

  return:
    sendDatetime
    warnings
```

---

### 25.7 Generate Reminder Jobs

```text
function generateReminderJobs(participant, visits, rules):
  for each active rule:
    if required date/time is missing:
      skip rule

    calculate scheduled_send_datetime

    if scheduled_send_datetime is in the past:
      mark as skipped or flag for coordinator review

    create reminder job if no equivalent active job exists

    store visit date/time snapshot on reminder job
```

---

### 25.8 Reschedule Detection

```text
function detectReschedule(previousVisit, newVisit):
  if previousVisit.datetime is empty and newVisit.datetime exists:
    return "new_visit"

  if previousVisit.datetime exists and newVisit.datetime exists:
    if previousVisit.datetime != newVisit.datetime:
      return "rescheduled"

  if previousVisit.datetime == newVisit.datetime:
    return "unchanged"

  if previousVisit.datetime exists and newVisit.datetime is empty:
    return "removed_or_canceled"
```

---

### 25.9 Apply Reschedule

```text
function applyReschedule(participant, visit, oldDatetime, newDatetime):
  update visit

  recalculate study events

  find future unsent reminder jobs where:
    participant matches
    visit matches
    status is scheduled or pending_review
    visit_datetime_snapshot == oldDatetime

  mark those jobs as canceled
  canceled_reason = "visit_rescheduled"

  create new reminder jobs using newDatetime

  if scheduling email for that visit was already sent:
    create reschedule email job

  write audit log
```

---

## 26. MVP Scope

The MVP should include:

```text
Participant creation
Spreadsheet import
Manual participant entry
Manual Day 0 visit entry
Manual Day 90 visit entry
Manual Day 180 visit entry
Separate date/time fields
Calculated study events
Reminder job generation
Reminder queue
Template rendering
Preview emails
Reschedule detection
Reschedule email creation
Duplicate prevention
Basic dashboard
Participant detail page
Audit log
```

MVP can postpone:

```text
Complex role-based permissions
SMS reminders
Participant portal
E-consent
Advanced analytics
Complex multi-study customization
Advanced calendar integrations
```

---

## 27. Recommended Tech Stack

Suggested stack:

```text
Frontend:
- Next.js
- React
- Tailwind CSS

Backend:
- Next.js API routes or FastAPI

Database:
- PostgreSQL or Supabase

Job scheduling:
- Trigger.dev, Inngest, Celery, or cron worker

Email:
- SendGrid, AWS SES, Mailgun, or Gmail API for prototype only

Spreadsheet parsing:
- CSV/XLSX parser

Hosting:
- Vercel + Supabase + Trigger.dev
```

Recommended MVP stack:

```text
Next.js + Supabase + Trigger.dev + SendGrid
```

---

## 28. Suggested File Structure

```text
/app
  /dashboard
  /participants
  /participants/[id]
  /calendar
  /imports
  /reminders
  /templates
  /settings

/components
  DashboardSummaryCards.tsx
  ParticipantOverviewTable.tsx
  ParticipantTimeline.tsx
  StudyPhaseBadge.tsx
  ReminderStatusBadge.tsx
  VisitDateTimeForm.tsx
  ReschedulePreview.tsx
  ReminderQueueTable.tsx
  StudyCalendar.tsx
  EmailPreview.tsx
  AlertBadge.tsx

/lib
  importSpreadsheet.ts
  validateParticipantRow.ts
  participantService.ts
  visitService.ts
  calculatedStudyEvents.ts
  reminderRules.ts
  reminderScheduler.ts
  rescheduleDetector.ts
  emailRenderer.ts
  emailSender.ts
  auditLogger.ts
  timezone.ts
  dashboardQueries.ts
  currentPhase.ts
  alerts.ts

/db
  schema.sql
  migrations
  seedReminderRules.ts
  seedEmailTemplates.ts

/tests
  dateTimeInput.test.ts
  calculatedStudyEvents.test.ts
  importSpreadsheet.test.ts
  reminderScheduler.test.ts
  rescheduleDetector.test.ts
  emailRenderer.test.ts
  duplicatePrevention.test.ts
  manualEntry.test.ts
  dashboard.test.ts
  currentPhase.test.ts
```

---

## 29. Recommended Implementation Order

Build the app in this order:

1. Database schema
2. Participant model
3. Visit model with separate date/time fields
4. Date/time calculation utilities
5. Calculated study events service
6. Reminder rules config
7. Reminder job generator
8. Reschedule detector
9. Duplicate prevention
10. Email template renderer
11. Spreadsheet import
12. Manual participant and visit forms
13. Reschedule preview
14. Dashboard summary cards
15. Participant overview table
16. Participant timeline
17. Reminder queue
18. Email sending integration
19. Audit log
20. Tests

Do not start with email sending.

Start with:

```text
participant → visit → calculated events → reminder jobs
```

Then add email sending after all scheduling and rescheduling tests pass.

---

## 30. Required Tests

### 30.1 Date and Time Input

```text
Accepts separate Day 0 date and Day 0 time
Accepts separate Day 90 date and Day 90 time
Accepts separate Day 180 date and Day 180 time
Combines date and time correctly with timezone
Rejects missing date when time exists
Rejects missing time when date exists
Rejects invalid date format
Rejects invalid time format
```

---

### 30.2 Calculated Study Variables

```text
Calculates Day 0 patternized diet start date as Day 0 date minus 3 days
Calculates Day 0 stool sample window as Day 0 datetime minus 1 day through Day 0 datetime
Calculates Day 0 last bite time as Day 0 datetime minus 12 hours

Calculates Day 90 patternized diet start date as Day 90 date minus 3 days
Calculates Day 90 stool sample window as Day 90 datetime minus 1 day through Day 90 datetime
Calculates Day 90 last bite time as Day 90 datetime minus 12 hours

Calculates Day 180 last bite time as Day 180 datetime minus 12 hours

Calculates Week 6 habitual diet reminder on Monday of Week 6 after Day 0
Calculates Week 18 habitual diet reminder on Monday of Week 18 after Day 0
Validates Week 18 occurs after Day 90 if Day 90 exists
Validates Week 18 occurs before Day 180 if Day 180 exists
```

---

### 30.3 Reminder Schedule

```text
Creates Day 0 scheduling email immediately after Day 0 is scheduled
Creates Day 0 patternized diet reminder 4 days before Day 0
Creates Day 0 visit reminder 1 day before Day 0

Creates Week 6 habitual diet reminder on Monday of Week 6 after Day 0

Creates Day 90 scheduling email immediately after Day 90 is scheduled
Creates Day 90 patternized diet reminder 4 days before Day 90
Creates Day 90 visit reminder 1 day before Day 90

Creates Week 18 habitual diet reminder on Monday of Week 18 after Day 0

Creates Day 180 scheduling email 14 days before Day 180
Creates Day 180 visit reminder 1 day before Day 180
```

---

### 30.4 Manual Entry

```text
Coordinator can manually add a participant
Coordinator can manually edit participant name
Coordinator can manually edit participant email
Coordinator can manually add Day 0 visit
Coordinator can manually add Day 90 visit
Coordinator can manually add Day 180 visit
Manual visit edits trigger the same reschedule logic as spreadsheet import
Manual changes create audit logs
```

---

### 30.5 Rescheduling

```text
Detects Day 0 reschedule
Cancels old unsent Day 0 reminders
Recalculates Day 0 patternized diet, stool sample window, and last bite
Recalculates Week 6 and Week 18 if Day 0 changes
Creates Day 0 reschedule email if scheduling email was already sent

Detects Day 90 reschedule
Cancels old unsent Day 90 reminders
Recalculates Day 90 patternized diet, stool sample window, and last bite
Revalidates Week 18 sequence
Creates Day 90 reschedule email if scheduling email was already sent

Detects Day 180 reschedule
Cancels old unsent Day 180 reminders
Recalculates Day 180 last bite
Revalidates Week 18 sequence
Creates Day 180 reschedule email if scheduling email was already sent
```

---

### 30.6 Duplicate Prevention

```text
Does not create duplicate reminder jobs
Does not send same reminder job twice
Allows new reminder jobs after visit reschedule
Keeps old sent reminders in history
Cancels outdated unsent reminders
Blocks outdated snapshot emails from sending
```

---

### 30.7 Email Rendering

```text
Renders participant first name
Renders Day 0 visit date
Renders Day 0 visit time
Renders Day 0 patternized diet start date
Renders Day 0 stool sample window
Renders Day 0 last bite time

Renders Day 90 visit date
Renders Day 90 visit time
Renders Day 90 patternized diet start date
Renders Day 90 stool sample window
Renders Day 90 last bite time

Renders Day 180 visit date
Renders Day 180 visit time
Renders Day 180 last bite time

Blocks email if required variable is missing
Uses reschedule variables correctly
```

---

### 30.8 Dashboard

```text
Dashboard shows participant current phase
Dashboard shows next scheduled email
Dashboard flags missing Day 90
Dashboard flags missing Day 180
Dashboard flags failed email
Dashboard flags outdated reminder snapshot
Dashboard flags Week 18 validation issue
Dashboard shows visual participant timeline
Dashboard supports manual edit actions
Dashboard supports filtering by alert
```

---

## 31. Security, Privacy, and Compliance Requirements

The app should minimize sensitive information.

Requirements:

```text
Do not include unnecessary PHI in reminder emails.
Do not expose participant data publicly.
Require authentication for coordinator dashboard.
Keep audit logs for all reminder actions.
Track who imported data.
Track who edited templates.
Track who manually sent or resent emails.
Track who rescheduled visits.
Do not hard-code email credentials.
Store secrets in environment variables.
Do not send emails with missing variables.
Do not send emails to opted-out participants.
```

Email content should be reviewed and approved by the study team before sending to real participants.

Add a footer or disclaimer if required by the study workflow.

---

## 32. Definition of Done

The app is working when:

```text
Coordinator can upload a spreadsheet.
Coordinator can manually add and edit participant data.
Day 0, Day 90, and Day 180 date/time are stored separately.
The app correctly combines date and time for calculations.
The app calculates patternized diet start dates.
The app calculates stool sample collection windows.
The app calculates last bite times.
The app creates all 10 standard emails when enough visit data exists.
Week 6 is based on Day 0.
Week 18 is shown as post-Day-90 / pre-Day-180 phase.
The dashboard clearly shows each participant’s current status.
The dashboard flags missing schedules and failed emails.
The app cancels old unsent reminders when visits are rescheduled.
The app sends reschedule emails when required.
The app does not send duplicate emails.
The app keeps audit history.
The app blocks outdated snapshot emails.
All core tests pass.
```

---

## 33. Vibe Coding Prompt

Use this prompt to start implementation:

```text
Please build this app according to SPEC.md.

Do not build this as a simple email automation script. Build it as a participant timeline and reminder subscription system.

Start with the database schema, participant model, visit model, calculated study events, reminder job generation, and tests.

Important rules:
- Store visit date and visit time separately.
- Combine date and time only for calculations.
- Manual edits and spreadsheet imports must use the same backend logic.
- Do not send real emails until scheduling, rescheduling, duplicate prevention, and email rendering tests pass.
- Use visit snapshots to prevent outdated emails from sending.
- Keep an audit log for every important action.
- Never delete sent email history.
```

---

## 34. AI Coding Agent Instructions

When implementing this app:

1. Treat the app as a participant reminder subscription system.
2. Store visit date and visit time separately.
3. Combine date and time only for calculations.
4. Put all calculated study variables in a dedicated service.
5. Do not hard-code calculated dates inside templates.
6. Templates should only consume variables.
7. Manual edits and spreadsheet imports must use the same backend logic.
8. Never delete sent email history.
9. Cancel outdated unsent reminders when a visit changes.
10. Use visit snapshots to prevent outdated emails from sending.
11. Show coordinator a preview before applying major schedule changes.
12. Make the dashboard visual and coordinator-friendly.
13. Do not send real emails until scheduling, rescheduling, and duplicate-prevention tests pass.
14. Keep an audit log for every important action.
15. Use environment variables for all secrets.
16. Do not include unnecessary PHI in emails.
17. Block email sending if required variables are missing.
18. Block email sending if participant is opted out.
19. Make reminder rules configurable.
20. Prioritize correctness and auditability over UI polish.