import { createClient } from '@supabase/supabase-js';
import ws from 'ws';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  realtime: { transport: ws as never },
});

const reminderRules: Array<{
  rule_id: string;
  email_name: string;
  phase: string;
  based_on_date: string;
  based_on_time?: string;
  trigger_type: 'send_when_new_visit_scheduled' | 'relative_to_visit_date' | 'monday_of_week_after_day0';
  offset_amount?: number;
  offset_unit?: string;
  week_number?: number;
  fixed_send_time?: string;
  template_id: string;
  reschedule_template_id?: string;
}> = [
  {
    rule_id: 'day0_scheduling',
    email_name: 'Scheduling: In-Person Study Visit Day 0',
    phase: 'day0',
    based_on_date: 'scheduled_day_0_date',
    based_on_time: 'scheduled_day_0_time',
    trigger_type: 'send_when_new_visit_scheduled',
    template_id: 'day0_scheduling',
    reschedule_template_id: 'day0_rescheduling',
  },
  {
    rule_id: 'day0_patternized_diet',
    email_name: 'REMINDER: Patternized Diet Starts Tomorrow — Day 0',
    phase: 'day0',
    based_on_date: 'scheduled_day_0_date',
    based_on_time: 'scheduled_day_0_time',
    trigger_type: 'relative_to_visit_date',
    offset_amount: -4,
    offset_unit: 'days',
    fixed_send_time: '09:00',
    template_id: 'day0_patternized_diet',
  },
  {
    rule_id: 'day0_visit_reminder',
    email_name: 'REMINDER: Day 0 Study Visit',
    phase: 'day0',
    based_on_date: 'scheduled_day_0_date',
    based_on_time: 'scheduled_day_0_time',
    trigger_type: 'relative_to_visit_date',
    offset_amount: -1,
    offset_unit: 'days',
    fixed_send_time: '09:00',
    template_id: 'day0_visit_reminder',
  },
  {
    rule_id: 'week6_habitual_diet',
    email_name: 'REMINDER: Start Your 3-Day Habitual Diet — Week 6',
    phase: 'week6',
    based_on_date: 'scheduled_day_0_date',
    trigger_type: 'monday_of_week_after_day0',
    week_number: 6,
    fixed_send_time: '09:00',
    template_id: 'week6_habitual_diet',
  },
  {
    rule_id: 'day90_scheduling',
    email_name: 'Scheduling: In-Person Study Visit Day 90',
    phase: 'day90',
    based_on_date: 'scheduled_day_90_date',
    based_on_time: 'scheduled_day_90_time',
    trigger_type: 'send_when_new_visit_scheduled',
    template_id: 'day90_scheduling',
    reschedule_template_id: 'day90_rescheduling',
  },
  {
    rule_id: 'day90_patternized_diet',
    email_name: 'REMINDER: Patternized Diet Starts Tomorrow — Day 90',
    phase: 'day90',
    based_on_date: 'scheduled_day_90_date',
    based_on_time: 'scheduled_day_90_time',
    trigger_type: 'relative_to_visit_date',
    offset_amount: -4,
    offset_unit: 'days',
    fixed_send_time: '09:00',
    template_id: 'day90_patternized_diet',
  },
  {
    rule_id: 'day90_visit_reminder',
    email_name: 'REMINDER: Day 90 Study Visit',
    phase: 'day90',
    based_on_date: 'scheduled_day_90_date',
    based_on_time: 'scheduled_day_90_time',
    trigger_type: 'relative_to_visit_date',
    offset_amount: -1,
    offset_unit: 'days',
    fixed_send_time: '09:00',
    template_id: 'day90_visit_reminder',
  },
  {
    rule_id: 'week18_habitual_diet',
    email_name: 'REMINDER: Start Your 3-Day Habitual Diet — Week 18',
    phase: 'week18',
    based_on_date: 'scheduled_day_0_date',
    trigger_type: 'monday_of_week_after_day0',
    week_number: 18,
    fixed_send_time: '09:00',
    template_id: 'week18_habitual_diet',
  },
  {
    rule_id: 'day180_scheduling',
    email_name: 'Scheduling: In-Person Study Visit Day 180',
    phase: 'day180',
    based_on_date: 'scheduled_day_180_date',
    based_on_time: 'scheduled_day_180_time',
    trigger_type: 'relative_to_visit_date',
    offset_amount: -14,
    offset_unit: 'days',
    fixed_send_time: '09:00',
    template_id: 'day180_scheduling',
    reschedule_template_id: 'day180_rescheduling',
  },
  {
    rule_id: 'day180_visit_reminder',
    email_name: 'REMINDER: Day 180 Study Visit',
    phase: 'day180',
    based_on_date: 'scheduled_day_180_date',
    based_on_time: 'scheduled_day_180_time',
    trigger_type: 'relative_to_visit_date',
    offset_amount: -1,
    offset_unit: 'days',
    fixed_send_time: '09:00',
    template_id: 'day180_visit_reminder',
  },
];

export async function seedReminderRules() {
  const { error } = await supabase
    .from('reminder_rules')
    .upsert(reminderRules, { onConflict: 'rule_id' });

  if (error) {
    console.error('Failed to seed reminder rules:', error);
    throw error;
  }

  console.log(`Seeded ${reminderRules.length} reminder rules.`);
}

if (require.main === module) {
  seedReminderRules().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
