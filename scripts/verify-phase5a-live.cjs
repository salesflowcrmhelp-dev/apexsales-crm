const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://zgndrkgnldrwhcypdhjt.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpnbmRya2dubGRyd2hjeXBkaGp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAwNDU4MjYsImV4cCI6MjEwNTYyMTgyNn0.KfB_zXo1btSfbF6WaCvOdlc4kMyvNSQPvAcadMPhZ1o';

async function runPhase5aVerification() {
  console.log('========================================================================');
  console.log('🛡️ STEP 5 — PHASE 5A: PLATFORM METADATA RLS VERIFICATION');
  console.log('========================================================================\n');

  const anonClient = createClient(supabaseUrl, supabaseAnonKey);
  const targetTables = ['deal_packages', 'system_settings', 'integrations'];
  let allPass = true;

  // -------------------------------------------------------------------------
  // 1. ANONYMOUS ACCESS VERIFICATION
  // -------------------------------------------------------------------------
  console.log('--- 1. ANONYMOUS ACCESS REJECTION TESTS ---');
  for (const t of targetTables) {
    console.log(`\nTesting table: public.${t}`);

    // Anonymous SELECT
    const { data: selData, error: selErr } = await anonClient.from(t).select('*');
    const selectBlocked = selErr !== null || (Array.isArray(selData) && selData.length === 0);
    console.log(`  - SELECT: ${selectBlocked ? '✅ BLOCKED' : '❌ ALLOWED'} (Rows: ${selData?.length ?? 0}, Error: ${selErr?.message || 'none'})`);

    // Anonymous INSERT
    const testPayload = t === 'deal_packages' 
      ? { id: 'probe_anon_test', name: 'Anon Probe', price: 100 }
      : t === 'system_settings'
      ? { key: 'probe_anon_test', value: { probe: true } }
      : { id: 'probe_anon_test', name: 'Anon Probe', category: 'Test' };

    const { error: insErr } = await anonClient.from(t).insert(testPayload);
    const insertBlocked = insErr !== null;
    console.log(`  - INSERT: ${insertBlocked ? '✅ BLOCKED' : '❌ ALLOWED'} (Error: ${insErr?.message || 'none'})`);

    // Anonymous UPDATE
    const filterCol = t === 'system_settings' ? 'key' : 'id';
    const filterVal = t === 'deal_packages' ? 'pkg_starter' : t === 'system_settings' ? 'general' : 'zoho';
    const { data: updData, error: updErr } = await anonClient.from(t).update({ updated_at: new Date().toISOString() }).eq(filterCol, filterVal).select();
    const updateBlocked = updErr !== null || (Array.isArray(updData) && updData.length === 0);
    console.log(`  - UPDATE: ${updateBlocked ? '✅ BLOCKED' : '❌ ALLOWED'} (Affected: ${updData?.length ?? 0}, Error: ${updErr?.message || 'none'})`);

    // Anonymous DELETE
    const { data: delData, error: delErr } = await anonClient.from(t).delete().eq(filterCol, 'probe_anon_test').select();
    const deleteBlocked = delErr !== null || (Array.isArray(delData) && delData.length === 0);
    console.log(`  - DELETE: ${deleteBlocked ? '✅ BLOCKED' : '❌ ALLOWED'} (Affected: ${delData?.length ?? 0}, Error: ${delErr?.message || 'none'})`);

    if (!selectBlocked || !insertBlocked || !updateBlocked || !deleteBlocked) {
      allPass = false;
    }
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
  // 3. TABLE INTEGRITY & DATA PRESERVATION CHECK
  // -------------------------------------------------------------------------
  console.log('\n--- 3. DATABASE INTEGRITY BASELINE ---');
  const allTables = [
    'deal_packages',
    'system_settings',
    'integrations',
    'companies',
    'leads',
    'support_tickets',
    'invoices',
    'notifications',
    'audit_logs',
    'company_plans',
    'client_licenses'
  ];

  for (const t of allTables) {
    const { count, error } = await anonClient.from(t).select('*', { count: 'exact', head: true });
    console.log(`  - ${t}: count probe => ${count ?? 'N/A'} (Error: ${error?.code || 'none'})`);
  }

  console.log('\n========================================================================');
  console.log(`Phase 5A Verification Script Ready.`);
  console.log('========================================================================');
}

runPhase5aVerification().catch(err => {
  console.error('Verification error:', err);
});
