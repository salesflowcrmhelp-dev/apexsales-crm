import { supabase } from '../src/lib/supabase.js';

async function checkUsersRLS() {
  console.log('--- Checking LIVE Supabase users table RLS & policies ---');

  // 1. SELECT test
  const { data: selectData, error: selectErr } = await supabase.from('users').select('*').limit(3);
  console.log('1. SELECT users:', selectErr ? `ERROR: ${selectErr.message}` : `SUCCESS (Retrieved ${selectData.length} records)`);

  // 2. INSERT test
  const testId = `probe_${Date.now()}`;
  const { data: insertData, error: insertErr } = await supabase.from('users').insert({
    id: testId,
    name: 'Probe Test',
    role: 'sales_rep',
    email: `probe_${Date.now()}@test.com`
  }).select();
  console.log('2. INSERT users:', insertErr ? `BLOCKED BY RLS (${insertErr.message})` : `SUCCESS (Inserted ID: ${testId})`);

  // 3. UPDATE test
  const { data: updateData, error: updateErr } = await supabase.from('users').update({
    role: 'manager'
  }).eq('id', 'usr_admin').select();
  console.log('3. UPDATE users:', updateErr ? `BLOCKED BY RLS (${updateErr.message})` : `SUCCESS (${updateData?.length || 0} rows updated)`);

  // 4. DELETE test (clean up if insert succeeded)
  if (!insertErr) {
    const { error: delErr } = await supabase.from('users').delete().eq('id', testId);
    console.log('4. DELETE users:', delErr ? `BLOCKED BY RLS (${delErr.message})` : 'SUCCESS (Cleaned up test probe)');
  } else {
    // Probe delete non-existent row to test policy
    const { error: delErr } = await supabase.from('users').delete().eq('id', testId);
    console.log('4. DELETE users:', delErr ? `BLOCKED BY RLS (${delErr.message})` : 'ALLOWED / NO ERROR');
  }

  // 5. Query system catalogue for active policies on users table if permitted
  try {
    const { data: polData, error: polErr } = await supabase
      .from('pg_policies')
      .select('*')
      .eq('tablename', 'users');
    if (!polErr && polData) {
      console.log('5. POLICIES ON users:', polData);
    } else {
      console.log('5. Direct pg_policies query restricted via PostgREST (expected for anon client).');
    }
  } catch (e) {
    console.log('5. pg_policies not exposed to anon client.');
  }
}

checkUsersRLS();
