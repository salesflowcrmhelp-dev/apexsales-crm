const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://zgndrkgnldrwhcypdhjt.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpnbmRya2dubGRyd2hjeXBkaGp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAwNDU4MjYsImV4cCI6MjEwNTYyMTgyNn0.KfB_zXo1btSfbF6WaCvOdlc4kMyvNSQPvAcadMPhZ1o';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function inspectAll() {
  const tables = [
    'users',
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

  console.log('=== LIVE SUPABASE TABLES AUDIT ===');
  for (const table of tables) {
    try {
      const { data, error, count } = await supabase.from(table).select('*', { count: 'exact' });
      if (error) {
        console.log(`Table [${table}]: ERROR ${error.code} - ${error.message}`);
      } else {
        console.log(`Table [${table}]: OK (count: ${count})`);
        if (data && data.length > 0) {
          console.log(`   Columns (${Object.keys(data[0]).length}): ${Object.keys(data[0]).join(', ')}`);
        } else {
          console.log(`   (empty table)`);
        }
      }
    } catch (err) {
      console.log(`Table [${table}]: EXCEPTION ${err.message}`);
    }
  }

  // Also test write permissions to see if anon can insert/update/delete on these tables (RLS check!)
  console.log('\n=== RLS WRITE PERMISSION PROBE (ANON ROLE) ===');
  const writeTestTables = ['companies', 'leads', 'support_tickets', 'invoices', 'notifications', 'integrations', 'audit_logs', 'company_plans', 'deal_packages', 'client_licenses', 'system_settings'];
  
  for (const table of writeTestTables) {
    try {
      // Attempt a harmless insert with invalid / test dummy id
      const dummyId = 'probe_test_' + Date.now();
      const { data, error } = await supabase.from(table).insert({ id: dummyId });
      if (error) {
        console.log(`Write probe [${table}]: BLOCKED/FAILED (${error.code}: ${error.message})`);
      } else {
        console.log(`Write probe [${table}]: ALLOWED (UNRESTRICTED / NO RLS BLOCK!)`);
        // Clean up immediately
        await supabase.from(table).delete().eq('id', dummyId);
      }
    } catch (err) {
      console.log(`Write probe [${table}]: EXCEPTION ${err.message}`);
    }
  }
}

inspectAll();
