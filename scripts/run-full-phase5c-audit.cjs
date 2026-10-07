const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://zgndrkgnldrwhcypdhjt.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpnbmRya2dubGRyd2hjeXBkaGp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAwNDU4MjYsImV4cCI6MjEwNTYyMTgyNn0.KfB_zXo1btSfbF6WaCvOdlc4kMyvNSQPvAcadMPhZ1o';

const anonClient = createClient(supabaseUrl, supabaseAnonKey);

async function runComprehensiveAudit() {
  console.log('========================================================================');
  console.log('🛡️ PHASE 5C COMPREHENSIVE LIVE PRODUCTION VERIFICATION');
  console.log('========================================================================\n');

  const report = [];

  // Helper to record probe
  function record(testName, expected, actual, pass, details) {
    report.push({ testName, expected, actual, pass: pass ? 'PASS' : 'FAIL', details });
    console.log(`[${pass ? 'PASS' : 'FAIL'}] ${testName}`);
    console.log(`       Expected: ${expected}`);
    console.log(`       Actual:   ${actual}`);
    console.log(`       Evidence: ${details}\n`);
  }

  // -------------------------------------------------------------------------
  // 1. ANONYMOUS HELPER FUNCTIONS
  // -------------------------------------------------------------------------
  console.log('--- 1. ANONYMOUS HELPER FUNCTIONS ---');
  const { data: roleRes, error: roleErr } = await anonClient.rpc('get_auth_role');
  record('Anonymous get_auth_role()', 'null', String(roleRes), roleRes === null, roleErr?.message || 'Returned null');

  const { data: compRes, error: compErr } = await anonClient.rpc('get_auth_company_id');
  record('Anonymous get_auth_company_id()', 'null', String(compRes), compRes === null, compErr?.message || 'Returned null');

  const { data: adminRes, error: adminErr } = await anonClient.rpc('is_super_admin');
  record('Anonymous is_super_admin()', 'false', String(adminRes), adminRes === false, adminErr?.message || 'Returned false');

  // -------------------------------------------------------------------------
  // 2. AUDIT LOGS ANONYMOUS ACCESS REJECTION
  // -------------------------------------------------------------------------
  console.log('--- 2. PUBLIC.AUDIT_LOGS ANONYMOUS ACCESS ---');
  // SELECT
  const { data: logSel, error: logSelErr } = await anonClient.from('audit_logs').select('*');
  const selBlocked = logSelErr !== null || (Array.isArray(logSel) && logSel.length === 0);
  record('audit_logs Anonymous SELECT', 'Blocked (0 rows / error)', `${logSel?.length ?? 0} rows`, selBlocked, logSelErr?.message || '0 rows returned by RLS');

  // Direct INSERT
  const { data: logIns, error: logInsErr } = await anonClient.from('audit_logs').insert({
    id: 'probe_anon_al_test',
    action: 'Exploit',
    module: 'Audit',
    details: 'Direct insert attempt'
  }).select();
  const insBlocked = logInsErr !== null;
  record('audit_logs Anonymous Direct INSERT', 'Blocked (RLS Error 42501)', logInsErr ? `Blocked: ${logInsErr.message}` : 'Allowed', insBlocked, logInsErr?.message || 'RLS denial');

  // Direct UPDATE
  const { data: logUpd, error: logUpdErr } = await anonClient.from('audit_logs').update({
    details: 'Tampered'
  }).eq('id', 'al_probe_fake').select();
  const updBlocked = logUpdErr !== null || (Array.isArray(logUpd) && logUpd.length === 0);
  record('audit_logs Anonymous Direct UPDATE', 'Blocked (0 affected / error)', `${logUpd?.length ?? 0} affected`, updBlocked, logUpdErr?.message || '0 rows affected');

  // Direct DELETE
  const { data: logDel, error: logDelErr } = await anonClient.from('audit_logs').delete().eq('id', 'al_probe_fake').select();
  const delBlocked = logDelErr !== null || (Array.isArray(logDel) && logDel.length === 0);
  record('audit_logs Anonymous Direct DELETE', 'Blocked (0 affected / error)', `${logDel?.length ?? 0} affected`, delBlocked, logDelErr?.message || '0 rows affected');

  // -------------------------------------------------------------------------
  // 3. log_system_event RPC EXECUTION CONTROL
  // -------------------------------------------------------------------------
  console.log('--- 3. RPC log_system_event ACCESS CONTROL ---');
  const { data: rpcData, error: rpcErr } = await anonClient.rpc('log_system_event', {
    p_action: 'Anon Test Event',
    p_module: 'Security Test',
    p_details: 'Unauthenticated RPC call attempt'
  });
  const rpcBlocked = rpcErr !== null && (rpcErr.code === '42501' || rpcErr.message.includes('permission denied'));
  record('log_system_event Anonymous Execution', 'Blocked (Permission Denied 42501)', rpcErr ? `Blocked: ${rpcErr.message}` : 'Allowed', rpcBlocked, rpcErr?.message || 'Denied');

  // -------------------------------------------------------------------------
  // 4. NOTIFICATIONS ANONYMOUS ACCESS REJECTION
  // -------------------------------------------------------------------------
  console.log('--- 4. PUBLIC.NOTIFICATIONS ANONYMOUS ACCESS ---');
  // SELECT
  const { data: notifSel, error: notifSelErr } = await anonClient.from('notifications').select('*');
  const notifSelBlocked = notifSelErr !== null || (Array.isArray(notifSel) && notifSel.length === 0);
  record('notifications Anonymous SELECT', 'Blocked (0 rows / error)', `${notifSel?.length ?? 0} rows`, notifSelBlocked, notifSelErr?.message || '0 rows returned by RLS');

  // Direct INSERT
  const { data: notifIns, error: notifInsErr } = await anonClient.from('notifications').insert({
    id: 'probe_anon_notif_test',
    title: 'Forged Alert',
    detail: 'Hacker alert',
    type: 'alert'
  }).select();
  const notifInsBlocked = notifInsErr !== null;
  record('notifications Anonymous Direct INSERT', 'Blocked (RLS Error 42501)', notifInsErr ? `Blocked: ${notifInsErr.message}` : 'Allowed', notifInsBlocked, notifInsErr?.message || 'RLS denial');

  // Direct UPDATE
  const { data: notifUpd, error: notifUpdErr } = await anonClient.from('notifications').update({
    title: 'Tampered Alert'
  }).eq('id', 'probe_notif_fake').select();
  const notifUpdBlocked = notifUpdErr !== null || (Array.isArray(notifUpd) && notifUpd.length === 0);
  record('notifications Anonymous Direct UPDATE', 'Blocked (0 affected / error)', `${notifUpd?.length ?? 0} affected`, notifUpdBlocked, notifUpdErr?.message || '0 rows affected');

  // Direct DELETE
  const { data: notifDel, error: notifDelErr } = await anonClient.from('notifications').delete().eq('id', 'probe_notif_fake').select();
  const notifDelBlocked = notifDelErr !== null || (Array.isArray(notifDel) && notifDel.length === 0);
  record('notifications Anonymous Direct DELETE', 'Blocked (0 affected / error)', `${notifDel?.length ?? 0} affected`, notifDelBlocked, notifDelErr?.message || '0 rows affected');

  // -------------------------------------------------------------------------
  // 5. UNTOUCHED TABLES INTEGRITY (PHASE 5D STRICTLY NOT STARTED)
  // -------------------------------------------------------------------------
  console.log('--- 5. UNTOUCHED TABLES VERIFICATION ---');
  // leads (Phase 5D untouched)
  const { count: cLeads } = await anonClient.from('leads').select('*', { count: 'exact', head: true });
  record('leads Untouched (Phase 5D NOT started)', '69 rows accessible', `${cLeads} rows`, cLeads === 69, `Exact count: ${cLeads}`);

  // support_tickets (Phase 5D untouched)
  const { count: cTix } = await anonClient.from('support_tickets').select('*', { count: 'exact', head: true });
  record('support_tickets Untouched (Phase 5D NOT started)', '5 rows accessible', `${cTix} rows`, cTix === 5, `Exact count: ${cTix}`);

  // users (auth identity baseline untouched)
  const { count: cUsers } = await anonClient.from('users').select('*', { count: 'exact', head: true });
  record('users Untouched (4 linked accounts intact)', '4 rows accessible', `${cUsers} rows`, cUsers === 4, `Exact count: ${cUsers}`);

  console.log('========================================================================');
  console.log('AUDIT COMPLETE');
  console.log('========================================================================');
}

runComprehensiveAudit().catch(err => {
  console.error('Audit run error:', err);
});
