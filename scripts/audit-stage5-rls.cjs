const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://zgndrkgnldrwhcypdhjt.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpnbmRya2dubGRyd2hjeXBkaGp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAwNDU4MjYsImV4cCI6MjEwNTYyMTgyNn0.KfB_zXo1btSfbF6WaCvOdlc4kMyvNSQPvAcadMPhZ1o';

const anonClient = createClient(supabaseUrl, supabaseAnonKey);

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

async function runRlsAudit() {
  console.log('========================================================================');
  console.log('🛡️ STAGE 5: READ-ONLY LIVE RLS SECURITY AUDIT');
  console.log('========================================================================\n');

  // 1. Test Helper Functions
  console.log('--- 1. HELPER FUNCTIONS INSPECTION ---');
  const { data: roleRes, error: roleErr } = await anonClient.rpc('get_auth_role');
  const { data: compRes, error: compErr } = await anonClient.rpc('get_auth_company_id');
  const { data: adminRes, error: adminErr } = await anonClient.rpc('is_super_admin');

  console.log(`  - public.get_auth_role():        ${JSON.stringify(roleRes)} (Error: ${roleErr?.message || 'none'})`);
  console.log(`  - public.get_auth_company_id():  ${JSON.stringify(compRes)} (Error: ${compErr?.message || 'none'})`);
  console.log(`  - public.is_super_admin():       ${JSON.stringify(adminRes)} (Error: ${adminErr?.message || 'none'})`);

  // 2. Table Accessibility Audit
  console.log('\n--- 2. ANONYMOUS OPERATIONS AUDIT (11 TABLES) ---');
  const auditReport = [];

  for (const t of TABLES) {
    // SELECT test
    const { data: selData, error: selErr } = await anonClient.from(t).select('*').limit(1);
    const anonSelect = !selErr ? 'ALLOWED' : `BLOCKED (${selErr.code})`;

    // Check schema/columns of sample row to understand tenant columns
    const tenantCols = [];
    if (selData && selData.length > 0) {
      const keys = Object.keys(selData[0]);
      if (keys.includes('company_id')) tenantCols.push('company_id');
      if (keys.includes('companyId')) tenantCols.push('companyId');
      if (keys.includes('company')) tenantCols.push('company');
      if (keys.includes('organization_id')) tenantCols.push('organization_id');
    }

    console.log(`  [${t}]`);
    console.log(`    SELECT: ${anonSelect}`);
    console.log(`    Tenant Isolation Columns: ${tenantCols.length > 0 ? tenantCols.join(', ') : 'None detected'}`);
  }

  console.log('\n========================================================================');
}

runRlsAudit();
