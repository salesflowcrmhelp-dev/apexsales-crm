const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://zgndrkgnldrwhcypdhjt.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpnbmRya2dubGRyd2hjeXBkaGp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAwNDU4MjYsImV4cCI6MjEwNTYyMTgyNn0.KfB_zXo1btSfbF6WaCvOdlc4kMyvNSQPvAcadMPhZ1o';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function preCheck() {
  console.log('========================================================================');
  console.log('🔍 STAGE 2 PRE-CHECK: SUPER ADMIN STATUS');
  console.log('========================================================================\n');

  // 1. Check usr_admin in public.users
  const { data: adminUser, error: adminErr } = await supabase
    .from('users')
    .select('id, name, username, email, role, active, auth_user_id')
    .eq('id', 'usr_admin')
    .single();

  if (adminErr) {
    console.error('❌ Error reading usr_admin:', adminErr);
    return;
  }

  console.log('1. Target user in public.users:');
  console.log(`   - id: ${adminUser.id}`);
  console.log(`   - name: ${adminUser.name}`);
  console.log(`   - email: ${adminUser.email}`);
  console.log(`   - role: ${adminUser.role}`);
  console.log(`   - active: ${adminUser.active}`);
  console.log(`   - auth_user_id: ${adminUser.auth_user_id === null ? 'NULL (unlinked)' : adminUser.auth_user_id}`);

  // 2. Check if auth.users has this email by attempting a safe sign-in probe with a dummy password
  console.log('\n2. Probing Supabase Auth for existing email account...');
  const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
    email: adminUser.email,
    password: 'Probe_Checking_Existence_Only_12345!'
  });

  if (signInErr) {
    console.log(`   Supabase Auth response: ${signInErr.status || ''} - "${signInErr.message}"`);
    if (signInErr.message.includes('Invalid login credentials')) {
      console.log('   ℹ️ Note: "Invalid login credentials" indicates either:');
      console.log('      (a) The user exists in auth.users and the dummy password was rejected, OR');
      console.log('      (b) Supabase email enumeration protection is ON (standard security behavior).');
    } else if (signInErr.message.includes('Email not confirmed')) {
      console.log('   ✅ CONFIRMED: User EXISTS in auth.users (email pending confirmation).');
    } else if (signInErr.message.includes('User not found')) {
      console.log('   ❌ User DOES NOT exist in auth.users.');
    }
  } else {
    console.log('   Signed in successfully (unexpected for dummy password).');
  }

  // 3. Check helper functions for anonymous client
  console.log('\n3. Helper functions baseline check:');
  const { data: rRole } = await supabase.rpc('get_auth_role');
  const { data: rComp } = await supabase.rpc('get_auth_company_id');
  const { data: rAdm } = await supabase.rpc('is_super_admin');
  console.log(`   - get_auth_role(): ${JSON.stringify(rRole)}`);
  console.log(`   - get_auth_company_id(): ${JSON.stringify(rComp)}`);
  console.log(`   - is_super_admin(): ${JSON.stringify(rAdm)}`);

  console.log('\n========================================================================');
}

preCheck();
