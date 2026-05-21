
import { createClient } from '@supabase/supabase-js';

// Use proxy in development and production to bypass adblockers & network firewalls
const supabaseUrl = typeof window !== 'undefined' 
  ? `${window.location.origin}/api/supabase` 
  : 'https://vxyahrkunsmywmfrwpxl.supabase.co';

const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ4eWFocmt1bnNteXdtZnJ3cHhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxMTUzNTcsImV4cCI6MjA4NTY5MTM1N30.KaTG_95m6cKqBi0prDUsw690o4g8pCpyjczHc7WeUOQ';

export const supabase = createClient(supabaseUrl, supabaseKey);
