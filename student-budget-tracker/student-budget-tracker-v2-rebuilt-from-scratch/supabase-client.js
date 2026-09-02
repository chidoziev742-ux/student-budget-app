import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Keep these values from the existing Student Budget Tracker Supabase project.
// For a public browser app, only the publishable/anon key belongs here. RLS must protect the tables.
export const SUPABASE_URL = 'https://khminsrzlhmahsbytxqy.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_VZQ1RAOIOfxg5ULJsVajag_uW5bmkIv';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'student-budget-v2-auth'
  }
});
