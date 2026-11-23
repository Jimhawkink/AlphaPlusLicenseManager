import { createClient } from '@supabase/supabase-js';

// Default target: New Supabase project (gcebwzpcyeltzhyqefxo)
export const DEFAULT_SUPABASE_URL =
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://gcebwzpcyeltzhyqefxo.supabase.co';

export const DEFAULT_SUPABASE_ANON_KEY =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdjZWJ3enBjeWVsdHpoeXFlZnhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQyMzgwMzEsImV4cCI6MjEwOTgxNDAzMX0.P00UQaQW9KvKKQ5dlG1O8Ciqg4M2E8_SbQOGe9tqP6Q';

export const DEFAULT_SERVICE_ROLE_KEY =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdjZWJ3enBjeWVsdHpoeXFlZnhvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5NDIzODAzMSwiZXhwIjoyMTA5ODE0MDMxfQ.m2VCkHfb-vjKdBaRTlx98iAQjwzLu8_MNRnJAeYS8bk';

// Standard client (browser / anon)
export const supabase = createClient(DEFAULT_SUPABASE_URL, DEFAULT_SERVICE_ROLE_KEY || DEFAULT_SUPABASE_ANON_KEY, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
    },
});

// Admin client with full RLS bypass privileges for license enforcement & hardware audits
export const supabaseAdmin = createClient(
    DEFAULT_SUPABASE_URL,
    DEFAULT_SERVICE_ROLE_KEY || DEFAULT_SUPABASE_ANON_KEY,
    {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
        },
    }
);
