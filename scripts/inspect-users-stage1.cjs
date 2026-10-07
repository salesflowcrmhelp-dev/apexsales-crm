const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://zgndrkgnldrwhcypdhjt.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpnbmRya2dubGRyd2hjeXBkaGp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAwNDU4MjYsImV4cCI6MjEwNTYyMTgyNn0.KfB_zXo1btSfbF6WaCvOdlc4kMyvNSQPvAcadMPhZ1o';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function inspectUsersSchema() {
  console.log('Inspecting public.users schema and columns...');
  const { data, error } = await supabase.from('users').select('*').limit(2);
  if (error) {
    console.error('Error fetching users:', error);
    return;
  }

  if (data && data.length > 0) {
    const sample = data[0];
    console.log('Sample row columns and types:');
    Object.entries(sample).forEach(([key, val]) => {
      console.log(`  - ${key}: ${typeof val} (sample: ${Array.isArray(val) ? 'Array' : (typeof val === 'object' ? JSON.stringify(val) : String(val).slice(0, 30))})`);
    });
    console.log('\nHas auth_user_id column already?:', 'auth_user_id' in sample);
  }

  // Also check if any functions exist by testing calling them
  const funcs = ['get_auth_role', 'get_auth_company_id', 'is_super_admin'];
  for (const fn of funcs) {
    const { data: fnData, error: fnErr } = await supabase.rpc(fn);
    console.log(`Function [${fn}]:`, fnErr ? `${fnErr.code} - ${fnErr.message}` : fnData);
  }
}

inspectUsersSchema();
