import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL;
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        // Custom no-op lock to bypass navigator.locks deadlock on client-side route transitions
        lock: async (_name: string, _acquireTimeout: number, fn: () => Promise<any>) => {
            return await fn();
        },
        persistSession: true,
        autoRefreshToken: true,
    }
});
