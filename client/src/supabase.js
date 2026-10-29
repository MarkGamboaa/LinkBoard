import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase Auth is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
}

export const supabase = createClient(
  supabaseUrl || 'http://127.0.0.1:54321',
  supabaseAnonKey || 'missing-supabase-anon-key',
);

export const normalizeAuthUser = (user) => user ? ({
  ...user,
  uid: user.id,
  displayName: user.user_metadata?.display_name || '',
  photoURL: user.user_metadata?.avatar_url || null,
}) : null;
