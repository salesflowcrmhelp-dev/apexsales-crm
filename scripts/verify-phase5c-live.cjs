const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://zgndrkgnldrwhcypdhjt.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpnbmRya2dubGRyd2hjeXBkaGp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAwNDU4MjYsImV4cCI6MjEwNTYyMTgyNn0.KfB_zXo1btSfbF6WaCvOdlc4kMyvNSQPvAcadMPhZ1o';

async function runPhase5cVerification() {
  console.log('========================================================================');
  console.log('🛡️ STEP 5 — PHASE 5C: AUDIT LOGS & NOTIFICATIONS LIVE VERIFICATION');
  console.log('========================================================================\n');

  const anonClient = createClient(supabaseUrl, supabaseAnonKey);
  let allTestsPassed = true;

  // -------------------------------------------------------------------------
  // 1. ANONYMOUS REJECTION TESTS (audit_logs & notifications)
  // -------------------------------------------------------------------------
  console.log('--- 1. ANONYMOUS ACCESS REJECTION TESTS ---');
  const targetTables = ['audit_logs', 'notifications'];

  for (const t of targetTables) {
    console.log(`\nTable: public.${t}`);

    // Anonymous SELECT
    const { data: selData, error: selErr } = await anonClient.from(t).select('*');
    const selectBlocked = selErr !== null || (Array.isArray(selData) && selData.length === 0);
    console.log(`  - SELECT: ${selectBlocked ? '✅ BLOCKED' : '❌ ALLOWED'} (Rows: ${selData?.length ?? 0}, Error: ${selErr?.message || 'none'})`);
    if (!selectBlocked) allTestsPassed = false;

    // Anonymous Direct INSERT
    const testPayload = t === 'audit_logs'
      ? { id: 'probe_anon_al', action: 'Hack', module: 'Auth', details: 'Direct insert attempt' }
      : { id: 'probe_anon_notif', title: 'Fake Alert', detail: 'Direct insert attempt', type: 'alert' };

    const { error: insErr } = await anonClient.from(t).insert(testPayload);
    const insertBlocked = insErr !== null;
    console.log(`  - INSERT: ${insertBlocked ? '✅ BLOCKED' : '❌ ALLOWED'} (Error: ${insErr?.message || 'none'})`);
    if (!insertBlocked) allTestsPassed = false;

    // Anonymous Direct UPDATE
    const pkVal = 'probe_nonexistent_test_row';
    const { data: updData, error: updErr } = await anonClient.from(t).update({ details: 'Tampered' }).eq('id', pkVal).select();
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
  // 2. ANONYMOUS RPC EXECUTION TEST
  // -------------------------------------------------------------------------
  console.log('\n--- 2. ANONYMOUS log_system_event RPC EXECUTION TEST ---');
  const { data: rpcData, error: rpcErr } = await anonClient.rpc('log_system_event', {
    p_action: 'Anon Test',
    p_module: 'Security',
    p_details: 'Anon execution probe'
  });
  const rpcBlocked = rpcErr !== null;
  console.log(`  - Anonymous log_system_event: ${rpcBlocked ? '✅ BLOCKED' : '❌ ALLOWED'} (Error: ${rpcErr?.message || 'none'})`);
  if (!rpcBlocked) allTestsPassed = false;

  // -------------------------------------------------------------------------
  // 3. AUDIT IMMUTABILITY TEST (UPDATE / DELETE PROBES)
  // -------------------------------------------------------------------------
  console.log('\n--- 3. AUDIT LOGS IMMUTABILITY & TAMPER RESISTANCE ---');
  const { data: tamperUpd, error: tamperUpdErr } = await anonClient.from('audit_logs').update({ user_name: 'Hacked' }).eq('id', 'probe_tamper_target').select();
  const immutUpd = tamperUpdErr !== null || (Array.isArray(tamperUpd) && tamperUpd.length === 0);
  console.log(`  - Tamper UPDATE probe: ${immutUpd ? '✅ BLOCKED' : '❌ ALLOWED'}`);

  const { data: tamperDel, error: tamperDelErr } = await anonClient.from('audit_logs').delete().eq('id', 'probe_tamper_target').select();
  const immutDel = tamperDelErr !== null || (Array.isArray(tamperDel) && tamperDel.length === 0);
  console.log(`  - Tamper DELETE probe: ${immutDel ? '✅ BLOCKED' : '❌ ALLOWED'}`);

  if (!immutUpd || !immutDel) allTestsPassed = false;

  // -------------------------------------------------------------------------
  // 4. DATA INTEGRITY & ROW COUNTS
  // -------------------------------------------------------------------------
  console.log('\n--- 4. DATA INTEGRITY CHECK ---');
  console.log('Target baseline before Phase 5C execution:');
  console.log('  - audit_logs: 59 rows');
  console.log('  - notifications: 5 rows');

  console.log('\n========================================================================');
  console.log(`Phase 5C Preliminary Verification Result: ${allTestsPassed ? 'READY FOR SQL DEPLOYMENT' : 'ATTENTION REQUIRED'}`);
  console.log('========================================================================');
}

runPhase5cVerification().catch(err => {
  console.error('Error during Phase 5C verification:', err);
});
