import { createClient } from '@supabase/supabase-js';
import { Database } from './schema';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase URL or anon key environment variables');
}

export const supabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey);

export function getServiceRoleClient() {
  if (!supabaseServiceRoleKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
  }
  return createClient<Database>(supabaseUrl, supabaseServiceRoleKey);
}
