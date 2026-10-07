const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://zgndrkgnldrwhcypdhjt.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpnbmRya2dubGRyd2hjeXBkaGp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAwNDU4MjYsImV4cCI6MjEwNTYyMTgyNn0.KfB_zXo1btSfbF6WaCvOdlc4kMyvNSQPvAcadMPhZ1o';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testAnonymousWrites() {
  console.log('Testing valid anonymous writes against all 11 tables...\n');

  const testCases = [
    {
      table: 'companies',
      payload: { id: 'test_probe_comp', name: 'Probe Company' },
      cleanupField: 'id',
      cleanupVal: 'test_probe_comp'
    },
    {
      table: 'leads',
      payload: { id: 'test_probe_lead', name: 'Probe Lead', company: 'Probe Co' },
      cleanupField: 'id',
      cleanupVal: 'test_probe_lead'
    },
    {
      table: 'support_tickets',
      payload: { id: 'test_probe_ticket', subject: 'Probe Subject', company: 'Probe Co', status: 'Open', priority: 'Low' },
      cleanupField: 'id',
      cleanupVal: 'test_probe_ticket'
    },
    {
      table: 'invoices',
      payload: { id: '#INV-TEST-PROBE', company: 'Probe Co', amount: '100', status: 'Pending' },
      cleanupField: 'id',
      cleanupVal: '#INV-TEST-PROBE'
    },
    {
      table: 'notifications',
      payload: { id: 'test_probe_notif', title: 'Probe Notif', message: 'Probe Message', type: 'info' },
      cleanupField: 'id',
      cleanupVal: 'test_probe_notif'
    },
    {
      table: 'integrations',
      payload: { id: 'test_probe_integ', name: 'Probe Integ', category: 'CRM', status: 'Active' },
      cleanupField: 'id',
      cleanupVal: 'test_probe_integ'
    },
    {
      table: 'audit_logs',
      payload: { id: 'test_probe_audit', date_time: '28 Sep 2026', user_name: 'Hacker', action: 'Hack', module: 'System', details: 'Direct insert test' },
      cleanupField: 'id',
      cleanupVal: 'test_probe_audit'
    },
    {
      table: 'company_plans',
      payload: { company_id: 'test_probe_cplan', plan: 'starter', status: 'active' },
      cleanupField: 'company_id',
      cleanupVal: 'test_probe_cplan'
    },
    {
      table: 'deal_packages',
      payload: { id: 'test_probe_dp', name: 'Probe Package', price: '₹999', tier: 'starter' },
      cleanupField: 'id',
      cleanupVal: 'test_probe_dp'
    },
    {
      table: 'client_licenses',
      payload: { id: 'test_probe_lic', company_id: 'test_comp', company_name: 'Probe Co', license_number: 'LIC-TEST-PROBE' },
      cleanupField: 'id',
      cleanupVal: 'test_probe_lic'
    },
    {
      table: 'system_settings',
      payload: { key: 'test_probe_key', value: 'probe_val' },
      cleanupField: 'key',
      cleanupVal: 'test_probe_key'
    }
  ];

  for (const tc of testCases) {
    try {
      // 1. Insert
      const { data: insData, error: insErr } = await supabase.from(tc.table).insert([tc.payload]).select();
      if (insErr) {
        console.log(`❌ ${tc.table} INSERT: BLOCKED (${insErr.code}: ${insErr.message})`);
      } else {
        console.log(`⚠️ ${tc.table} INSERT: ALLOWED (VULNERABILITY!) Rows: ${insData?.length}`);
        
        // 2. Update test
        const updateField = Object.keys(tc.payload)[1];
        const updateVal = 'Updated Probe';
        const { data: updData, error: updErr } = await supabase
          .from(tc.table)
          .update({ [updateField]: updateVal })
          .eq(tc.cleanupField, tc.cleanupVal)
          .select();
        
        console.log(`   ${tc.table} UPDATE: ${updErr ? `BLOCKED (${updErr.code})` : `⚠️ ALLOWED`}`);

        // Cleanup
        const { error: delErr } = await supabase.from(tc.table).delete().eq(tc.cleanupField, tc.cleanupVal);
        console.log(`   ${tc.table} DELETE: ${delErr ? `BLOCKED (${delErr.code})` : `⚠️ ALLOWED`}`);
      }
    } catch (e) {
      console.log(`Exception on ${tc.table}: ${e.message}`);
    }
  }
}

testAnonymousWrites();
