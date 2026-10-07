const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://zgndrkgnldrwhcypdhjt.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpnbmRya2dubGRyd2hjeXBkaGp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAwNDU4MjYsImV4cCI6MjEwNTYyMTgyNn0.KfB_zXo1btSfbF6WaCvOdlc4kMyvNSQPvAcadMPhZ1o';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const TABLES = [
  'companies',
  'leads',
  'support_tickets',
  'invoices',
  'notifications',
  'integrations',
  'audit_logs',
  'company_plans',
  'deal_packages',
  'client_licenses',
  'system_settings'
];

async function inspectDiscovery() {
  console.log('==============================================');
  console.log('SUPABASE DISCOVERY: TABLES, ACCESS, AND POLICIES');
  console.log('==============================================');

  for (const table of TABLES) {
    try {
      // 1. Test SELECT
      const { data: selData, error: selErr } = await supabase.from(table).select('*').limit(1);
      
      // 2. Test direct INSERT anonymously
      const dummyId = `test_probe_${Date.now()}`;
      const probePayload = { id: dummyId };
      const { data: insData, error: insErr } = await supabase.from(table).insert([probePayload]).select();

      // If insert somehow succeeded, clean it up
      if (!insErr && insData && insData.length > 0) {
        await supabase.from(table).delete().eq('id', dummyId);
      }

      console.log(`Table: ${table}`);
      console.log(`  SELECT: ${selErr ? `BLOCKED (${selErr.code}: ${selErr.message})` : `ALLOWED (count: ${selData?.length})`}`);
      console.log(`  ANON INSERT: ${insErr ? `BLOCKED (${insErr.code}: ${insErr.message})` : `⚠️ ALLOWED (VULNERABILITY!)`}`);
    } catch (e) {
      console.log(`Table: ${table} - Exception: ${e.message}`);
    }
  }

  // Also check RPCs
  console.log('\n--- Checking RPCs ---');
  const { data: rpcRes, error: rpcErr } = await supabase.rpc('superadmin_manage_user', {
    p_admin_id: 'usr_admin',
    p_action: 'ping',
    p_user: {}
  });
  console.log('superadmin_manage_user RPC response:', rpcRes, 'Error:', rpcErr);
}

inspectDiscovery();
