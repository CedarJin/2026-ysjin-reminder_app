import { createClient } from '@supabase/supabase-js';
import ws from 'ws';
import emailTemplates from '../../templates/email_templates.json';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  realtime: { transport: ws as never },
});

export async function seedEmailTemplates() {
  const footer = (emailTemplates as { shared_footer: string }).shared_footer;

  const templates = (emailTemplates as { templates: Array<{
    template_id: string;
    email_name: string;
    subject: string;
    body: string;
  }> }).templates.map((template) => ({
    template_id: template.template_id,
    email_name: template.email_name,
    subject: template.subject,
    body: template.body.replace('{{email_signature}}', footer),
    active: true,
  }));

  const { error } = await supabase
    .from('email_templates')
    .upsert(templates, { onConflict: 'template_id' });

  if (error) {
    console.error('Failed to seed email templates:', error);
    throw error;
  }

  console.log(`Seeded ${templates.length} email templates.`);
}

if (require.main === module) {
  seedEmailTemplates().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
