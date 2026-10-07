const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://zgndrkgnldrwhcypdhjt.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpnbmRya2dubGRyd2hjeXBkaGp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAwNDU4MjYsImV4cCI6MjEwNTYyMTgyNn0.KfB_zXo1btSfbF6WaCvOdlc4kMyvNSQPvAcadMPhZ1o';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function runPhase5bPreflight() {
  console.log('========================================================================');
  console.log('🔍 PHASE 5B PREFLIGHT: BILLING, LICENSING & COMPANY TABLES');
  console.log('========================================================================\n');

  // 1. Inspect public.users permissions & company IDs
  console.log('--- 1. USERS TENANT IDENTIFIERS IN public.users ---');
  const { data: users, error: userErr } = await supabase
    .from('users')
    .select('id, name, email, role, active, auth_user_id, permissions');

  if (userErr) {
    console.error('Error fetching users:', userErr);
  } else {
    users.forEach(u => {
      const p = u.permissions || {};
      const companyId = p.companyId || p.company_id || 'NOT_SET';
      console.log(`  - [${u.id}] ${u.name} (${u.role}) | email: ${u.email}`);
      console.log(`      auth_user_id: ${u.auth_user_id}`);
      console.log(`      permissions->companyId: "${companyId}" | full permissions keys: [${Object.keys(p).join(', ')}]`);
    });
  }

  // 2. Inspect target tables schema & data
  const targetTables = ['companies', 'company_plans', 'client_licenses', 'invoices'];

  for (const t of targetTables) {
    console.log(`\n----------------------------------------`);
    console.log(`Table: public.${t}`);
    console.log(`----------------------------------------`);

    const { data, error } = await supabase.from(t).select('*');
    if (error) {
      console.error(`❌ Error querying ${t}:`, error);
      continue;
    }

    console.log(`Total live rows: ${data.length}`);
    if (data.length > 0) {
      console.log('Columns:');
      const sample = data[0];
      Object.keys(sample).forEach(k => {
        console.log(`  - ${k}: typeof ${typeof sample[k]}`);
      });

      console.log('\nRow summary / tenant keys:');
      data.forEach(r => {
        if (t === 'companies') {
          console.log(`  - id: "${r.id}" | name: "${r.name}" | plan: "${r.plan}" | status: "${r.status}"`);
        } else if (t === 'company_plans') {
          console.log(`  - id: "${r.id}" | company_id: "${r.company_id}" | company_name: "${r.company_name}" | plan_name: "${r.plan_name}"`);
        } else if (t === 'client_licenses') {
          console.log(`  - id: "${r.id}" | license_number: "${r.license_number}" | company_id: "${r.company_id}" | company_name: "${r.company_name}"`);
        } else if (t === 'invoices') {
          console.log(`  - id: "${r.id}" | company: "${r.company}" | company_id: "${r.company_id}" | amount: "${r.amount}" | status: "${r.status}"`);
        }
      });
    }
  }

  console.log('\n========================================================================');
}

runPhase5bPreflight().catch(err => console.error(err));
