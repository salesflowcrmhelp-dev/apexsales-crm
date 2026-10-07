const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://zgndrkgnldrwhcypdhjt.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpnbmRya2dubGRyd2hjeXBkaGp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAwNDU4MjYsImV4cCI6MjEwNTYyMTgyNn0.KfB_zXo1btSfbF6WaCvOdlc4kMyvNSQPvAcadMPhZ1o';

// Pure anonymous client (mimicking an unauthorized external attacker)
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

async function runSecurityAudit() {
  console.log('================================================================');
  console.log('PHASE 2 SECURITY CORRECTION: LIVE SPOOFING & RLS VERIFICATION');
  console.log('================================================================\n');

  // -----------------------------------------------------------------
  // 1. VERIFY WHETHER step5-phase2-security-hardening.sql WAS EXECUTED
  // -----------------------------------------------------------------
  console.log('--- 1. VERIFY IF PHASE 2 SQL HAS BEEN EXECUTED IN SUPABASE ---');
  let phase2SqlApplied = false;
  try {
    const { data: rpcCheck, error: rpcErr } = await anonClient.rpc('superadmin_manage_entity', {
      p_admin_id: 'usr_admin',
      p_entity: 'probe',
      p_action: 'probe',
      p_payload: {}
    });
    if (rpcErr && rpcErr.code === 'PGRST202') {
      console.log('❌ superadmin_manage_entity RPC: NOT INSTALLED (PGRST202)');
      phase2SqlApplied = false;
    } else {
      console.log('✅ superadmin_manage_entity RPC: INSTALLED', rpcCheck || rpcErr);
      phase2SqlApplied = true;
    }
  } catch (e) {
    console.log('Exception checking RPC:', e.message);
  }

  // Check audit RPC
  try {
    const { data: auditRpcCheck, error: auditRpcErr } = await anonClient.rpc('superadmin_record_audit_log', {
      p_admin_id: 'usr_admin',
      p_log: {}
    });
    if (auditRpcErr && auditRpcErr.code === 'PGRST202') {
      console.log('❌ superadmin_record_audit_log RPC: NOT INSTALLED (PGRST202)');
    } else {
      console.log('✅ superadmin_record_audit_log RPC: INSTALLED', auditRpcCheck || auditRpcErr);
    }
  } catch (e) {}

  console.log(`\nPhase 2 SQL Status: ${phase2SqlApplied ? 'APPLIED' : 'NOT APPLIED YET'}\n`);

  // -----------------------------------------------------------------
  // 2. VERIFY ANONYMOUS SELECT ON ALL 11 TABLES
  // -----------------------------------------------------------------
  console.log('--- 2. ANONYMOUS SELECT RESULTS (11 TABLES) ---');
  const selectResults = {};
  for (const t of TABLES) {
    try {
      const { data, error } = await anonClient.from(t).select('*').limit(2);
      if (error) {
        selectResults[t] = `BLOCKED (${error.code}: ${error.message})`;
      } else {
        selectResults[t] = `ALLOWED (${data.length} rows returned)`;
      }
    } catch (e) {
      selectResults[t] = `ERROR: ${e.message}`;
    }
    console.log(`  Table [${t}]: ${selectResults[t]}`);
  }

  // -----------------------------------------------------------------
  // 3. VERIFY ANONYMOUS INSERT, UPDATE, DELETE ON ALL 11 TABLES
  // -----------------------------------------------------------------
  console.log('\n--- 3. ANONYMOUS WRITE RESULTS (INSERT / UPDATE / DELETE) ---');
  const writeResults = {};
  for (const t of TABLES) {
    const probeId = `probe_anon_test_${Date.now()}`;
    let insRes = 'UNKNOWN';
    let updRes = 'UNKNOWN';
    let delRes = 'UNKNOWN';

    // INSERT
    try {
      let payload = { id: probeId };
      if (t === 'companies') payload.name = 'Probe Co';
      if (t === 'leads') { payload.name = 'Probe Lead'; payload.company = 'Probe Co'; }
      if (t === 'support_tickets') { payload.subject = 'Probe'; payload.customer = 'Cust'; payload.company = 'Co'; }
      if (t === 'invoices') { payload.id = `#INV-PROBE-${Date.now().toString().slice(-4)}`; payload.company = 'Co'; }
      if (t === 'notifications') { payload.title = 'Probe'; }
      if (t === 'integrations') { payload.name = 'Probe'; payload.category = 'CRM'; }
      if (t === 'audit_logs') { payload.date_time = 'Now'; payload.user_name = 'Anon'; payload.action = 'Test'; payload.module = 'Test'; }
      if (t === 'company_plans') { payload = { id: probeId, company_id: probeId, plan_id: 'p', plan_name: 'P' }; }
      if (t === 'deal_packages') { payload.name = 'Probe'; }
      if (t === 'client_licenses') { payload = { id: probeId, license_number: `LIC-${probeId}`, company_id: 'c', company_name: 'C', client_name: 'Cl', client_email: 'c@c.com' }; }
      if (t === 'system_settings') { payload = { key: probeId, value: {} }; }

      const { data: insData, error: insErr } = await anonClient.from(t).insert([payload]).select();
      if (insErr) {
        insRes = `BLOCKED (${insErr.code})`;
      } else {
        insRes = '⚠️ ALLOWED';
        // Cleanup if allowed
        const pk = t === 'system_settings' ? 'key' : (t === 'company_plans' ? 'company_id' : (t === 'client_licenses' ? 'license_number' : 'id'));
        const pval = payload[pk];
        await anonClient.from(t).delete().eq(pk, pval);
      }
    } catch (e) {
      insRes = `BLOCKED (${e.message})`;
    }

    // UPDATE
    try {
      const { data: updData, error: updErr } = await anonClient.from(t).update({ dummy: 'val' }).eq('id', 'non_existing').select();
      if (updErr) {
        updRes = `BLOCKED (${updErr.code})`;
      } else {
        updRes = (updData && updData.length > 0) ? '⚠️ ALLOWED' : '0 rows modified';
      }
    } catch (e) {
      updRes = `BLOCKED (${e.message})`;
    }

    // DELETE
    try {
      const { data: delData, error: delErr } = await anonClient.from(t).delete().eq('id', 'non_existing').select();
      if (delErr) {
        delRes = `BLOCKED (${delErr.code})`;
      } else {
        delRes = (delData && delData.length > 0) ? '⚠️ ALLOWED' : '0 rows modified';
      }
    } catch (e) {
      delRes = `BLOCKED (${e.message})`;
    }

    writeResults[t] = { insert: insRes, update: updRes, delete: delRes };
    console.log(`  Table [${t}]: INSERT=${insRes} | UPDATE=${updRes} | DELETE=${delRes}`);
  }

  // -----------------------------------------------------------------
  // 4. SPOOFING TESTS ON superadmin_manage_user (Step 3 RPC)
  // -----------------------------------------------------------------
  console.log('\n--- 4. SPOOFING TESTS ON superadmin_manage_user ---');
  
  // Test 1: Valid Super Admin ID passed by anonymous client
  console.log('Testing: Can an unauthorized anonymous client pass p_admin_id = "usr_admin"?');
  const probeUserId = `probe_spoof_${Date.now()}`;
  try {
    const { data: spoofRes, error: spoofErr } = await anonClient.rpc('superadmin_manage_user', {
      p_admin_id: 'usr_admin', // Attacker simply sends usr_admin!
      p_action: 'create',
      p_user: {
        id: probeUserId,
        name: 'Spoofed User',
        email: 'spoofed@attacker.com',
        role: 'sales_rep',
        active: true
      }
    });

    console.log('Result for p_admin_id = "usr_admin":', spoofRes || spoofErr);

    if (spoofRes && spoofRes.success === true) {
      console.log('⚠️ CRITICAL VULNERABILITY: p_admin_id = "usr_admin" SUCCEEDED from anonymous client!');
      // Cleanup
      await anonClient.rpc('superadmin_manage_user', {
        p_admin_id: 'usr_admin',
        p_action: 'delete',
        p_user: { id: probeUserId }
      });
      console.log('Cleaned up spoofed test user.');
    } else {
      console.log('Blocked:', spoofRes || spoofErr);
    }
  } catch (e) {
    console.log('Exception in spoofing test:', e.message);
  }

  // Test 2: Normal employee ID
  console.log('\nTesting: Normal employee ID (usr_rohan)');
  try {
    const { data: empRes } = await anonClient.rpc('superadmin_manage_user', {
      p_admin_id: 'usr_rohan',
      p_action: 'create',
      p_user: { id: `probe_${Date.now()}`, name: 'Emp User' }
    });
    console.log('Result for p_admin_id = "usr_rohan":', empRes);
  } catch (e) {
    console.log('Exception:', e.message);
  }

  // Test 3: Random/non-existing ID
  console.log('\nTesting: Random/non-existing ID');
  try {
    const { data: nonExRes } = await anonClient.rpc('superadmin_manage_user', {
      p_admin_id: 'random_attacker_id_999',
      p_action: 'create',
      p_user: { id: `probe_${Date.now()}`, name: 'Random User' }
    });
    console.log('Result for random ID:', nonExRes);
  } catch (e) {
    console.log('Exception:', e.message);
  }

  // Test 4: NULL ID
  console.log('\nTesting: NULL ID');
  try {
    const { data: nullRes } = await anonClient.rpc('superadmin_manage_user', {
      p_admin_id: null,
      p_action: 'create',
      p_user: { id: `probe_${Date.now()}`, name: 'Null User' }
    });
    console.log('Result for NULL ID:', nullRes);
  } catch (e) {
    console.log('Exception:', e.message);
  }

  // Test 5: Inactive Admin ID
  console.log('\nTesting: Inactive Admin ID (if any)');
  // We can query users to see if there is an inactive user
  const { data: inactiveUsers } = await anonClient.from('users').select('id, name, role, active').eq('active', false).limit(1);
  if (inactiveUsers && inactiveUsers.length > 0) {
    const inUser = inactiveUsers[0];
    console.log(`Found inactive user: ${inUser.id} (${inUser.name}, ${inUser.role})`);
    const { data: inRes } = await anonClient.rpc('superadmin_manage_user', {
      p_admin_id: inUser.id,
      p_action: 'create',
      p_user: { id: `probe_${Date.now()}`, name: 'Inactive Test' }
    });
    console.log(`Result for inactive user [${inUser.id}]:`, inRes);
  } else {
    console.log('No inactive users found in public.users to probe.');
  }

  console.log('\n================================================================');
  console.log('SECURITY AUDIT COMPLETE');
  console.log('================================================================');
}

runSecurityAudit();
