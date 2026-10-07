const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://zgndrkgnldrwhcypdhjt.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpnbmRya2dubGRyd2hjeXBkaGp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAwNDU4MjYsImV4cCI6MjEwNTYyMTgyNn0.KfB_zXo1btSfbF6WaCvOdlc4kMyvNSQPvAcadMPhZ1o';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function runStage4PreCheck() {
  console.log('========================================================================');
  console.log('🔍 STAGE 4 PRE-CHECK: TEAM MEMBER PROFILES & AUTH STATUS');
  console.log('========================================================================\n');

  const targetIds = ['usr_vikram', 'usr_rohan', 'usr_1789033985345_n62j'];
  const expectedEmails = {
    'usr_vikram': 'vikram@apexsales.com',
    'usr_rohan': 'rohan@apexsales.com',
    'usr_1789033985345_n62j': 'kashish@apexsales.com'
  };

  const { data: users, error: usersErr } = await supabase
    .from('users')
    .select('id, name, username, email, role, active, auth_user_id')
    .in('id', [...targetIds, 'usr_admin']);

  if (usersErr) {
    console.error('❌ Error querying public.users:', usersErr);
    process.exit(1);
  }

  console.log('1. Target Users Verification in public.users:');
  for (const tid of targetIds) {
    const u = users.find(x => x.id === tid);
    if (!u) {
      console.log(`  ❌ ${tid}: NOT FOUND in public.users`);
      continue;
    }
    const emailMatch = u.email && u.email.toLowerCase() === expectedEmails[tid].toLowerCase();
    const isNull = u.auth_user_id === null;
    const isActive = u.active === true;
    console.log(`  - [${u.id}] Name: "${u.name}" | Role: "${u.role}"`);
    console.log(`      Email: "${u.email}" (Matches expected: ${emailMatch})`);
    console.log(`      Active: ${isActive} | auth_user_id is NULL: ${isNull} (value: ${u.auth_user_id})`);
  }

  console.log('\n2. usr_admin (Super Admin) Baseline Check:');
  const adminUser = users.find(x => x.id === 'usr_admin');
  if (adminUser) {
    console.log(`  - [${adminUser.id}] Name: "${adminUser.name}" | Role: "${adminUser.role}" | auth_user_id: ${adminUser.auth_user_id}`);
  }

  console.log('\n3. Probing Supabase Auth for existing accounts...');
  for (const tid of targetIds) {
    const email = expectedEmails[tid];
    const { error: probeErr } = await supabase.auth.signInWithPassword({
      email,
      password: 'NonExistentProbePassword98765!'
    });
    console.log(`  - ${email}: response status ${probeErr?.status || 200} - "${probeErr?.message || 'OK'}"`);
  }

  console.log('\n4. Table counts baseline:');
  const tables = ['companies', 'leads', 'support_tickets', 'invoices', 'notifications', 'integrations', 'audit_logs', 'company_plans', 'deal_packages', 'client_licenses', 'system_settings'];
  for (const t of tables) {
    const { count } = await supabase.from(t).select('*', { count: 'exact', head: true });
    console.log(`  - ${t}: ${count} rows`);
  }

  console.log('\n========================================================================');
}

runStage4PreCheck();
