import { createClient } from '@supabase/supabase-js';

// Use the same Supabase credentials as the hotel app
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://nlmyjnhpcfmcbppgkjwd.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5sbXlqbmhwY2ZtY2JwcGdrand3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzE3NTQ0NDUsImV4cCI6MjA0NzMzMDQ0NX0.TbrADwITPMWMYv-X8jL-BM7MSeGRmzWe71qGPdPJN_E';

export const supabase = createClient(supabaseUrl, supabaseKey);
