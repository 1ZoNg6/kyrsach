import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
console.log(supabaseUrl);
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
console.log(supabaseAnonKey);

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
    },
    global: {
        headers: {
            'X-Client-Info': 'task-management-app'
        }
    }
});