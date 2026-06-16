import { seedReminderRules } from './seedReminderRules';
import { seedEmailTemplates } from './seedEmailTemplates';

async function seedAll() {
  await seedReminderRules();
  await seedEmailTemplates();
  console.log('All seeds completed.');
}

seedAll().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
