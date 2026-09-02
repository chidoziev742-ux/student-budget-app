window.__SUPABASE_CONFIG__ = {
    url: 'https://khminsrzlhmahsbytxqy.supabase.co',
    anonKey: 'sb_publishable_VZQ1RAOIOfxg5ULJsVajag_uW5bmkIv'
};

const supabaseConfig = window.__SUPABASE_CONFIG__ || {};

const supabaseUrl = supabaseConfig.url || 'https://khminsrzlhmahsbytxqy.supabase.co';
const supabaseAnonKey = supabaseConfig.anonKey || 'sb_publishable_VZQ1RAOIOfxg5ULJsVajag_uW5bmkIv';

const hasRealSupabaseConfig =
    !!supabaseConfig.url &&
    !!supabaseConfig.anonKey &&
    !supabaseConfig.url.includes('YOUR_PROJECT_REF') &&
    !supabaseConfig.anonKey.includes('YOUR_SUPABASE_ANON_KEY');

if (!hasRealSupabaseConfig) {
    console.warn('[Supabase] Using placeholder config. Add window.__SUPABASE_CONFIG__ before loading the app to enable live Supabase access.');
}

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const existingClient = window.__SUPABASE_CLIENT__;

export const supabase = existingClient || createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
    }
});

window.__SUPABASE_CLIENT__ = supabase;
window.supabase = supabase;
window.supabaseClient = supabase;

export default supabase;
