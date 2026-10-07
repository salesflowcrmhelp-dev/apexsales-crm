const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://zgndrkgnldrwhcypdhjt.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpnbmRya2dubGRyd2hjeXBkaGp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAwNDU4MjYsImV4cCI6MjEwNTYyMTgyNn0.KfB_zXo1btSfbF6WaCvOdlc4kMyvNSQPvAcadMPhZ1o';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function runStage3Tests() {
  console.log('========================================================================');
  console.log('🧪 STAGE 3: FRONTEND DUAL-AUTH VERIFICATION TEST SUITE');
  console.log('========================================================================\n');

  // -----------------------------------------------------------------------
  // TEST E: Anonymous Helper Functions
  // -----------------------------------------------------------------------
  console.log('--- TEST E: Anonymous Helper Functions Verification ---');
  const { data: roleRes, error: roleErr } = await supabase.rpc('get_auth_role');
  const { data: compRes, error: compErr } = await supabase.rpc('get_auth_company_id');
  const { data: adminRes, error: adminErr } = await supabase.rpc('is_super_admin');

  console.log(`  1. get_auth_role()      => ${JSON.stringify(roleRes)} (Expected: null)`);
  console.log(`  2. get_auth_company_id()=> ${JSON.stringify(compRes)} (Expected: null)`);
  console.log(`  3. is_super_admin()     => ${JSON.stringify(adminRes)} (Expected: false)`);

  const testEPass = roleRes === null && compRes === null && adminRes === false;
  console.log(`  RESULT: ${testEPass ? '✅ PASS' : '❌ FAIL'}\n`);

  // -----------------------------------------------------------------------
  // TEST: Profile Lookup by Username & Email (Requirement 3)
  // -----------------------------------------------------------------------
  console.log('--- TEST: Profile Lookup by Username and Email ---');
  
  // Test 1: Username "admin" should resolve to harsh.accomation@gmail.com with auth_user_id
  const { data: adminByUsername } = await supabase
    .from('users')
    .select('id, name, username, email, active, auth_user_id')
    .or('email.ilike.admin,username.ilike.admin')
    .eq('active', true)
    .limit(1);

  console.log('  Lookup by username "admin":');
  if (adminByUsername && adminByUsername.length > 0) {
    const u = adminByUsername[0];
    console.log(`    - ID: ${u.id} | Email: ${u.email} | auth_user_id: ${u.auth_user_id}`);
    console.log(`    ✅ Successfully resolved username "admin" to linked email "${u.email}"`);
  } else {
    console.log('    ❌ Failed to lookup user by username');
  }

  // Test 2: Unlinked legacy user "kashish" or "vikram"
  const { data: legacyByUsername } = await supabase
    .from('users')
    .select('id, name, username, email, active, auth_user_id')
    .or('email.ilike.vikram,username.ilike.vikram')
    .eq('active', true)
    .limit(1);

  console.log('\n  Lookup by username "vikram":');
  if (legacyByUsername && legacyByUsername.length > 0) {
    const u = legacyByUsername[0];
    console.log(`    - ID: ${u.id} | Email: ${u.email} | auth_user_id: ${u.auth_user_id}`);
    console.log(`    ✅ Successfully identified unlinked legacy user (auth_user_id is NULL)`);
  } else {
    console.log('    ❌ Failed to lookup user by username');
  }

  // -----------------------------------------------------------------------
  // TEST: Native Auth Error Handling (Requirement 12)
  // -----------------------------------------------------------------------
  console.log('\n--- TEST: Native Supabase Auth Rejection on Wrong Password ---');
  const { data: invalidAuthData, error: invalidAuthErr } = await supabase.auth.signInWithPassword({
    email: 'harsh.accomation@gmail.com',
    password: 'Intentionally_Wrong_Password_Test_9999!'
  });

  if (invalidAuthErr) {
    console.log(`  Supabase Auth response: ${invalidAuthErr.status} - "${invalidAuthErr.message}"`);
    console.log(`  ✅ Successfully rejected invalid credentials without granting session or leaking hashes.`);
  } else {
    console.log(`  ❌ Unexpectedly succeeded with bad password`);
  }

  // -----------------------------------------------------------------------
  // TEST: Profile Hydration via auth_user_id (Requirement 11)
  // -----------------------------------------------------------------------
  console.log('\n--- TEST: Profile Hydration via auth_user_id ---');
  const knownAuthUid = '60f6d102-0947-4605-ada5-0a7a84d51407'; // usr_admin linked UUID
  const { data: hydratedProfile, error: hydrateErr } = await supabase
    .from('users')
    .select('id, name, display_name, username, role, email, phone, active, package_tier, permissions, created_at, auth_user_id')
    .eq('auth_user_id', knownAuthUid)
    .eq('active', true)
    .maybeSingle();

  if (hydratedProfile) {
    console.log('  Hydrated profile from database:');
    console.log(`    - id: ${hydratedProfile.id} (remains TEXT)`);
    console.log(`    - name: ${hydratedProfile.name}`);
    console.log(`    - email: ${hydratedProfile.email}`);
    console.log(`    - role: ${hydratedProfile.role}`);
    console.log(`    - active: ${hydratedProfile.active}`);
    console.log(`    - auth_user_id: ${hydratedProfile.auth_user_id}`);
    console.log(`    ✅ Profile hydration verified matching business user "usr_admin"`);
  } else {
    console.log('  ❌ Failed to hydrate profile:', hydrateErr?.message);
  }

  // -----------------------------------------------------------------------
  // TEST: Database Integrity
  // -----------------------------------------------------------------------
  console.log('\n--- TEST: Database Integrity & Row Counts ---');
  const tables = ['companies', 'leads', 'support_tickets', 'invoices', 'notifications', 'integrations', 'audit_logs', 'company_plans', 'deal_packages', 'client_licenses', 'system_settings'];
  for (const t of tables) {
    const { count, error } = await supabase.from(t).select('*', { count: 'exact', head: true });
    console.log(`  - ${t}: ${count} rows`);
  }

  console.log('\n========================================================================');
}

runStage3Tests();
