import { TriggerClient } from '@trigger.dev/sdk';

export const triggerClient = new TriggerClient({
  id: 'clinical-trial-reminder-system',
  apiKey: process.env.TRIGGER_API_KEY,
  apiUrl: process.env.TRIGGER_API_URL,
});
