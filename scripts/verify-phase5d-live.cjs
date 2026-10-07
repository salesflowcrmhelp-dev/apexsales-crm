const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://zgndrkgnldrwhcypdhjt.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpnbmRya2dubGRyd2hjeXBkaGp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAwNDU4MjYsImV4cCI6MjEwNTYyMTgyNn0.KfB_zXo1btSfbF6WaCvOdlc4kMyvNSQPvAcadMPhZ1o';

const anonClient = createClient(supabaseUrl, supabaseAnonKey);

async function runPhase5dVerification() {
  console.log('========================================================================');
  console.log('🛡️ STEP 5 — PHASE 5D: LEADS & SUPPORT_TICKETS LIVE VERIFICATION');
  console.log('========================================================================\n');

  let allTestsPassed = true;
  const targetTables = ['leads', 'support_tickets'];

  // -------------------------------------------------------------------------
  // 1. ANONYMOUS ACCESS REJECTION TESTS
  // -------------------------------------------------------------------------
  console.log('--- 1. ANONYMOUS ACCESS REJECTION TESTS ---');

  for (const t of targetTables) {
    console.log(`\nTable: public.${t}`);

    // Anonymous SELECT
    const { data: selData, error: selErr } = await anonClient.from(t).select('*');
    const selectBlocked = selErr !== null || (Array.isArray(selData) && selData.length === 0);
    console.log(`  - SELECT: ${selectBlocked ? '✅ BLOCKED' : '❌ ALLOWED'} (Rows: ${selData?.length ?? 0}, Error: ${selErr?.message || 'none'})`);
    if (!selectBlocked) allTestsPassed = false;

    // Anonymous Direct INSERT
    const testPayload = t === 'leads'
      ? { id: 'probe_anon_lead_verify', name: 'Hacker Lead', company: 'Exploit Corp', status: 'New', owner: 'Harsh Goyal' }
      : { id: 'probe_anon_tix_verify', ticket_id: '#ST-VERIFY', subject: 'Exploit Ticket', customer: 'Anon Attacker', company: 'ABC Pvt Ltd', priority: 'High', status: 'Open' };

    const { data: insData, error: insErr } = await anonClient.from(t).insert(testPayload).select();
    const insertBlocked = insErr !== null;
    console.log(`  - INSERT: ${insertBlocked ? '✅ BLOCKED' : '❌ ALLOWED'} (Error: ${insErr?.message || 'none'})`);
    if (!insertBlocked) allTestsPassed = false;

    // Anonymous Direct UPDATE
    const pkVal = t === 'leads' ? 'probe_anon_lead' : 'probe_anon_tix';
    const { data: updData, error: updErr } = await anonClient.from(t).update({ status: 'Compromised' }).eq('id', pkVal).select();
    const updateBlocked = updErr !== null || (Array.isArray(updData) && updData.length === 0);
    console.log(`  - UPDATE: ${updateBlocked ? '✅ BLOCKED' : '❌ ALLOWED'} (Affected: ${updData?.length ?? 0}, Error: ${updErr?.message || 'none'})`);
    if (!updateBlocked) allTestsPassed = false;

    // Anonymous Direct DELETE
    const { data: delData, error: delErr } = await anonClient.from(t).delete().eq('id', pkVal).select();
    const deleteBlocked = delErr !== null || (Array.isArray(delData) && delData.length === 0);
    console.log(`  - DELETE: ${deleteBlocked ? '✅ BLOCKED' : '❌ ALLOWED'} (Affected: ${delData?.length ?? 0}, Error: ${delErr?.message || 'none'})`);
    if (!deleteBlocked) allTestsPassed = false;
  }

  // -------------------------------------------------------------------------
  // 2. HELPER FUNCTIONS RE-CHECK (ANONYMOUS)
  // -------------------------------------------------------------------------
  console.log('\n--- 2. ANONYMOUS HELPER FUNCTIONS ---');
  const { data: roleRes } = await anonClient.rpc('get_auth_role');
  const { data: compRes } = await anonClient.rpc('get_auth_company_id');
  const { data: adminRes } = await anonClient.rpc('is_super_admin');
  console.log(`  - get_auth_role():        ${roleRes} (Expected: null)`);
  console.log(`  - get_auth_company_id():  ${compRes} (Expected: null)`);
  console.log(`  - is_super_admin():       ${adminRes} (Expected: false)`);

  // -------------------------------------------------------------------------
  // 3. AUDIT LOGS IMMUTABILITY RE-VERIFICATION
  // -------------------------------------------------------------------------
  console.log('\n--- 3. AUDIT LOG IMMUTABILITY & RPC INTEGRITY ---');
  const { data: rpcRes, error: rpcErr } = await anonClient.rpc('log_system_event', {
    p_action: 'Probe',
    p_module: 'Security',
    p_details: 'Anon test probe'
  });
  const rpcBlocked = rpcErr !== null;
  console.log(`  - Anonymous log_system_event RPC: ${rpcBlocked ? '✅ BLOCKED' : '❌ ALLOWED'} (Error: ${rpcErr?.message || 'none'})`);
  if (!rpcBlocked) allTestsPassed = false;

  const { error: alInsErr } = await anonClient.from('audit_logs').insert({ id: 'probe_anon_al', action: 'Hack' });
  const alInsBlocked = alInsErr !== null;
  console.log(`  - Direct audit_logs INSERT: ${alInsBlocked ? '✅ BLOCKED' : '❌ ALLOWED'} (Error: ${alInsErr?.message || 'none'})`);
  if (!alInsBlocked) allTestsPassed = false;

  // -------------------------------------------------------------------------
  // 4. DATABASE INTEGRITY & TABLE STATUS
  // -------------------------------------------------------------------------
  console.log('\n--- 4. PRODUCTION DATABASE TABLE STATUS ---');
  const tables = [
    'deal_packages',
    'system_settings',
    'integrations',
    'companies',
    'company_plans',
    'client_licenses',
    'invoices',
    'audit_logs',
    'notifications',
    'leads',
    'support_tickets',
    'users'
  ];

  for (const t of tables) {
    const { count, error } = await anonClient.from(t).select('*', { count: 'exact', head: true });
    console.log(`  - public.${t.padEnd(16)}: ${count !== null ? count + ' rows' : 'RLS Protected (0 rows leak)'} (Error: ${error?.code || 'none'})`);
  }

  console.log('\n========================================================================');
  console.log(`Phase 5D Status: ${allTestsPassed ? 'ALL SECURITY GATES PASSED' : 'SECURITY GATES PENDING SQL DEPLOYMENT'}`);
  console.log('========================================================================');
}

runPhase5dVerification().catch(err => {
  console.error('Phase 5D verification error:', err);
});
