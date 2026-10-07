const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://zgndrkgnldrwhcypdhjt.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpnbmRya2dubGRyd2hjeXBkaGp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAwNDU4MjYsImV4cCI6MjEwNTYyMTgyNn0.KfB_zXo1btSfbF6WaCvOdlc4kMyvNSQPvAcadMPhZ1o';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function runLiveVerification() {
  console.log('========================================================================');
  console.log('🔍 LIVE SUPABASE VERIFICATION: STAGE 1 MIGRATION STATUS');
  console.log('========================================================================\n');

  // 1. Check public.users rows and columns
  const { data: users, error: usersErr } = await supabase.from('users').select('*');
  if (usersErr) {
    console.error('❌ Failed to query public.users:', usersErr);
    return;
  }

  console.log(`📊 public.users Total Records: ${users.length}`);
  console.log('\nUsers breakdown:');
  users.forEach((u, i) => {
    console.log(`  [${i + 1}] ID: ${u.id} | Name: ${u.name} | Role: ${u.role} | Active: ${u.active}`);
    console.log(`      Email: ${u.email || '(null)'} | PIN: ${u.pin ? 'PRESENT' : '(null)'} | pin_hash: ${u.pin_hash ? 'HASHED' : '(null)'}`);
    console.log(`      Permissions keys: ${u.permissions ? Object.keys(u.permissions).join(', ') : 'none'}`);
    console.log(`      auth_user_id: ${u.auth_user_id !== undefined ? u.auth_user_id : 'COLUMN_NOT_FOUND'}`);
  });

  // 2. Test auth_user_id column specifically
  const { data: authColData, error: authColErr } = await supabase.from('users').select('auth_user_id');
  const authColExists = !authColErr;
  console.log('\n----------------------------------------');
  console.log(`Column public.users.auth_user_id exists: ${authColExists}`);
  if (authColErr) {
    console.log(`   Error: ${authColErr.code} - ${authColErr.message}`);
  } else {
    console.log(`   Values:`, authColData.map(r => r.auth_user_id));
    const allNull = authColData.every(r => r.auth_user_id === null);
    console.log(`   All auth_user_id values are NULL: ${allNull}`);
  }

  // 3. Test RPC functions
  console.log('\n----------------------------------------');
  console.log('Testing RPC Helper Functions:');
  const funcs = ['get_auth_role', 'get_auth_company_id', 'is_super_admin'];
  const funcStatus = {};

  for (const fn of funcs) {
    const { data: fnData, error: fnErr } = await supabase.rpc(fn);
    if (fnErr && fnErr.code === 'PGRST202') {
      funcStatus[fn] = { exists: false, error: 'Function not found in schema cache' };
      console.log(`   ❌ ${fn}(): NOT FOUND (${fnErr.message})`);
    } else if (fnErr) {
      funcStatus[fn] = { exists: true, error: fnErr.message };
      console.log(`   ⚠️ ${fn}(): EXISTS (returned error: ${fnErr.message})`);
    } else {
      funcStatus[fn] = { exists: true, result: fnData };
      console.log(`   ✅ ${fn}(): EXISTS (result: ${JSON.stringify(fnData)})`);
    }
  }

  // 4. Test RLS and table counts across business tables
  console.log('\n----------------------------------------');
  console.log('Testing Core Business Tables Status:');
  const tables = ['companies', 'leads', 'support_tickets', 'invoices', 'notifications', 'integrations', 'audit_logs', 'company_plans', 'deal_packages', 'client_licenses', 'system_settings'];
  for (const t of tables) {
    const { count, error } = await supabase.from(t).select('*', { count: 'exact', head: true });
    if (error) {
      console.log(`   ${t}: ERROR (${error.message})`);
    } else {
      console.log(`   ${t}: ${count} rows (RLS / access intact)`);
    }
  }

  console.log('\n========================================================================');
}

runLiveVerification();
