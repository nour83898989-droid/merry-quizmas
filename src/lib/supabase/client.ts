import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Only create client if URL is valid (not during build without env vars)
const isValidUrl = supabaseUrl.startsWith('http://') || supabaseUrl.startsWith('https://');

export const supabase = isValidUrl 
  ? createSupabaseClient<Database>(supabaseUrl, supabaseAnonKey)
  : null;

// Browser client
export function createClient() {
  if (!isValidUrl) {
    throw new Error('Supabase URL not configured. Please set NEXT_PUBLIC_SUPABASE_URL environment variable.');
  }
  return createSupabaseClient<Database>(supabaseUrl, supabaseAnonKey);
}

// Server-side client with service role key
export function createServerClient() {
  if (!isValidUrl) {
    throw new Error('Supabase URL not configured. Please set NEXT_PUBLIC_SUPABASE_URL environment variable.');
  }
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  return createSupabaseClient<Database>(supabaseUrl, supabaseServiceKey);
}
