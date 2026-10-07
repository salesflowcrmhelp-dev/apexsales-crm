const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://zgndrkgnldrwhcypdhjt.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpnbmRya2dubGRyd2hjeXBkaGp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAwNDU4MjYsImV4cCI6MjEwNTYyMTgyNn0.KfB_zXo1btSfbF6WaCvOdlc4kMyvNSQPvAcadMPhZ1o';

const anonClient = createClient(supabaseUrl, supabaseAnonKey);

async function runPhase5dPreflight() {
  console.log('========================================================================');
  console.log('🔍 PART 0: PRE-FLIGHT CHECK (LEADS & SUPPORT_TICKETS)');
  console.log('========================================================================\n');

  // 1. Inspect live rows and columns for public.leads
  console.log('--- 1. public.leads LIVE SCHEMA & SAMPLES ---');
  const { data: leadsData, error: leadsErr, count: leadsCount } = await anonClient
    .from('leads')
    .select('*', { count: 'exact' });

  if (leadsErr) {
    console.error('❌ Error querying leads:', leadsErr);
  } else {
    console.log(`Live row count: ${leadsData.length} (exact count: ${leadsCount})`);
    if (leadsData.length > 0) {
      console.log('Columns:');
      const sample = leadsData[0];
      Object.keys(sample).forEach(k => {
        console.log(`  - ${k}: typeof ${typeof sample[k]} (sample: ${JSON.stringify(sample[k])})`);
      });
      // Inspect distinct owners, deal_types, statuses, companies
      const distinctOwners = [...new Set(leadsData.map(l => l.owner).filter(Boolean))];
      const distinctStatuses = [...new Set(leadsData.map(l => l.status).filter(Boolean))];
      const sampleCompanies = [...new Set(leadsData.map(l => l.company).filter(Boolean))].slice(0, 10);
      console.log(`\nDistinct owners in leads (${distinctOwners.length}):`, distinctOwners);
      console.log(`Distinct statuses in leads (${distinctStatuses.length}):`, distinctStatuses);
      console.log(`Sample client companies in leads:`, sampleCompanies);
    }
  }

  // 2. Inspect live rows and columns for public.support_tickets
  console.log('\n--- 2. public.support_tickets LIVE SCHEMA & SAMPLES ---');
  const { data: tixData, error: tixErr, count: tixCount } = await anonClient
    .from('support_tickets')
    .select('*', { count: 'exact' });

  if (tixErr) {
    console.error('❌ Error querying support_tickets:', tixErr);
  } else {
    console.log(`Live row count: ${tixData.length} (exact count: ${tixCount})`);
    if (tixData.length > 0) {
      console.log('Columns:');
      const sample = tixData[0];
      Object.keys(sample).forEach(k => {
        console.log(`  - ${k}: typeof ${typeof sample[k]} (sample: ${JSON.stringify(sample[k])})`);
      });
      console.log('\nAll 5 rows in support_tickets:');
      tixData.forEach((t, i) => {
        console.log(`  [Ticket ${i+1}]: id=${t.id}, ticket_id=${t.ticket_id}, customer=${t.customer}, company=${t.company}, priority=${t.priority}, status=${t.status}`);
      });
    }
  }

  // 3. Inspect public.users (identities, roles, names, companyIds)
  console.log('\n--- 3. public.users CATALOG & ROLE MAPPINGS ---');
  const { data: usersData, error: usersErr } = await anonClient
    .from('users')
    .select('id, name, username, email, role, active, auth_user_id, permissions');

  if (usersErr) {
    console.error('❌ Error querying users:', usersErr);
  } else {
    console.log(`Users count: ${usersData.length}`);
    usersData.forEach(u => {
      console.log(`  - [${u.id}] Name: "${u.name}" | Role: "${u.role}" | Email: "${u.email}" | auth_user_id: ${u.auth_user_id} | companyId: ${u.permissions?.companyId || u.permissions?.company_id || 'ApexSales Internal'}`);
    });
  }

  // 4. Test Helper Functions
  console.log('\n--- 4. HELPER FUNCTIONS EXECUTION TEST ---');
  const { data: roleRes, error: roleErr } = await anonClient.rpc('get_auth_role');
  const { data: compRes, error: compErr } = await anonClient.rpc('get_auth_company_id');
  const { data: adminRes, error: adminErr } = await anonClient.rpc('is_super_admin');

  console.log(`  - public.get_auth_role():        ${JSON.stringify(roleRes)} (Error: ${roleErr?.message || 'none'})`);
  console.log(`  - public.get_auth_company_id():  ${JSON.stringify(compRes)} (Error: ${compErr?.message || 'none'})`);
  console.log(`  - public.is_super_admin():       ${JSON.stringify(adminRes)} (Error: ${adminErr?.message || 'none'})`);

  console.log('\n========================================================================');
}

runPhase5dPreflight().catch(err => console.error(err));
