import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vxyahrkunsmywmfrwpxl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ4eWFocmt1bnNteXdtZnJ3cHhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxMTUzNTcsImV4cCI6MjA4NTY5MTM1N30.KaTG_95m6cKqBi0prDUsw690o4g8pCpyjczHc7WeUOQ';
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data, error } = await supabase
    .from('agent_payments')
    .select('*');
  console.log(data?.length, error);
}
test();
