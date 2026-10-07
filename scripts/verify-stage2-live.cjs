const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://zgndrkgnldrwhcypdhjt.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpnbmRya2dubGRyd2hjeXBkaGp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAwNDU4MjYsImV4cCI6MjEwNTYyMTgyNn0.KfB_zXo1btSfbF6WaCvOdlc4kMyvNSQPvAcadMPhZ1o';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function runStage2LiveVerification() {
  console.log('========================================================================');
  console.log('🔍 STAGE 2: LIVE SUPABASE LINK VERIFICATION');
  console.log('========================================================================\n');

  // 1. Check all users in public.users
  const { data: users, error: usersErr } = await supabase
    .from('users')
    .select('id, name, username, email, role, active, auth_user_id');

  if (usersErr) {
    console.error('❌ Error reading public.users:', usersErr);
    process.exit(1);
  }

  console.log(`1. Total public.users records: ${users.length}`);

  const adminUser = users.find(u => u.id === 'usr_admin');
  const otherUsers = users.filter(u => u.id !== 'usr_admin');

  // 2. Check usr_admin
  console.log('\n2. usr_admin Record Details:');
  console.log(`   - ID: ${adminUser.id}`);
  console.log(`   - Name: ${adminUser.name}`);
  console.log(`   - Email: ${adminUser.email}`);
  console.log(`   - Role: ${adminUser.role}`);
  console.log(`   - Active: ${adminUser.active}`);
  console.log(`   - auth_user_id: ${adminUser.auth_user_id}`);

  const isAdminNotNull = adminUser.auth_user_id !== null && adminUser.auth_user_id !== undefined;
  console.log(`   ✅ auth_user_id is NOT NULL: ${isAdminNotNull}`);

  const isAdminRoleOwner = adminUser.role === 'company_owner';
  console.log(`   ✅ role is company_owner: ${isAdminRoleOwner}`);

  const isAdminActive = adminUser.active === true;
  console.log(`   ✅ active is true: ${isAdminActive}`);

  // 3. Check other users
  console.log('\n3. Other Users Link Status (Must be NULL):');
  let allOtherNull = true;
  otherUsers.forEach(u => {
    const isNull = u.auth_user_id === null;
    if (!isNull) allOtherNull = false;
    console.log(`   - ${u.id} (${u.name}, ${u.role}): auth_user_id = ${u.auth_user_id}`);
  });
  console.log(`   ✅ All other 3 users have auth_user_id = NULL: ${allOtherNull}`);

  // 4. Verify helper functions exist and callable
  console.log('\n4. Stage 1 Helper Functions Verification:');
  const funcs = ['get_auth_role', 'get_auth_company_id', 'is_super_admin'];
  for (const fn of funcs) {
    const { data: res, error: err } = await supabase.rpc(fn);
    if (err) {
      console.log(`   ❌ Function ${fn}: ERROR (${err.message})`);
    } else {
      console.log(`   ✅ Function ${fn}: EXISTS (anonymous result: ${JSON.stringify(res)})`);
    }
  }

  // 5. Verify core business tables
  console.log('\n5. Core Business Tables Verification:');
  const tables = ['companies', 'leads', 'support_tickets', 'invoices', 'notifications', 'integrations', 'audit_logs', 'company_plans', 'deal_packages', 'client_licenses', 'system_settings'];
  for (const t of tables) {
    const { count, error } = await supabase.from(t).select('*', { count: 'exact', head: true });
    if (error) {
      console.log(`   ❌ Table ${t}: ERROR (${error.message})`);
    } else {
      console.log(`   ✅ Table ${t}: ${count} rows (intact)`);
    }
  }

  console.log('\n========================================================================');
}

runStage2LiveVerification();
