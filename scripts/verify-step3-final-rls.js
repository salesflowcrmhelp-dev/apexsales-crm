import { supabase } from '../src/lib/supabase.js';

async function runTests() {
  console.log('====================================================');
  console.log('STEP 3 FINAL LIVE SUPABASE & RLS TEST SUITE');
  console.log('====================================================\n');

  const results = {};

  // 1. Check RLS enabled on users
  try {
    // SELECT user test
    const { data: users, error: selErr } = await supabase.from('users').select('*').limit(3);
    results['User SELECT'] = selErr ? `FAIL: ${selErr.message}` : `PASS (Found ${users.length} users)`;
  } catch (e) {
    results['User SELECT'] = `FAIL: ${e.message}`;
  }

  // 2. Direct Unauthorized anonymous writes test
  try {
    const probeId = 'probe_anon_' + Date.now();
    const { error: insErr } = await supabase.from('users').insert({
      id: probeId,
      name: 'Anon Probe',
      role: 'sales_rep',
      email: 'probe@anon.com'
    });
    results['Unauthorized INSERT'] = insErr ? `PASS (Blocked: ${insErr.message})` : 'FAIL: Allowed anonymous insert';
  } catch (e) {
    results['Unauthorized INSERT'] = `PASS (Exception: ${e.message})`;
  }

  try {
    const { data: updData, error: updErr } = await supabase.from('users').update({ role: 'admin' }).eq('id', 'usr_rohan').select();
    if (updErr) {
      results['Unauthorized UPDATE'] = `PASS (Blocked: ${updErr.message})`;
    } else if (updData && updData.length === 0) {
      results['Unauthorized UPDATE'] = `PASS (Blocked: 0 rows modified)`;
    } else {
      results['Unauthorized UPDATE'] = 'FAIL: Allowed anonymous update';
    }
  } catch (e) {
    results['Unauthorized UPDATE'] = `PASS (Exception: ${e.message})`;
  }

  // 3. Test RPC existence and signature
  let rpcInstalled = false;
  try {
    const { data: rpcTest, error: rpcErr } = await supabase.rpc('superadmin_manage_user', {
      p_admin_id: 'usr_admin',
      p_action: 'invalid_action_probe',
      p_user: {}
    });

    if (rpcErr && rpcErr.code === 'PGRST202') {
      results['RPC installed'] = 'FAIL: Function superadmin_manage_user not found in schema cache';
      rpcInstalled = false;
    } else if (!rpcErr || (rpcTest && rpcTest.error && rpcTest.error.includes('Invalid management action'))) {
      results['RPC installed'] = 'PASS (Function signature active & responsive)';
      rpcInstalled = true;
    } else {
      results['RPC installed'] = `FAIL: ${rpcErr?.message || JSON.stringify(rpcTest)}`;
    }
  } catch (e) {
    results['RPC installed'] = `FAIL: ${e.message}`;
  }

  if (rpcInstalled) {
    // A. Unauthorized caller via RPC
    const { data: unauthRes } = await supabase.rpc('superadmin_manage_user', {
      p_admin_id: 'usr_rohan', // sales executive caller
      p_action: 'create',
      p_user: { id: 'probe_bad', name: 'Bad User', role: 'admin' }
    });
    results['Unauthorized RPC Call'] = (unauthRes && unauthRes.success === false && unauthRes.error.includes('403 Forbidden'))
      ? `PASS (${unauthRes.error})`
      : `FAIL: Allowed unauthorized caller: ${JSON.stringify(unauthRes)}`;

    // B. Protected usr_admin deletion
    const { data: delRootRes } = await supabase.rpc('superadmin_manage_user', {
      p_admin_id: 'usr_admin',
      p_action: 'delete',
      p_user: { id: 'usr_admin' }
    });
    results['Protected usr_admin'] = (delRootRes && delRootRes.success === false && delRootRes.error.includes('403 Forbidden'))
      ? `PASS (${delRootRes.error})`
      : `FAIL: Did not block usr_admin delete: ${JSON.stringify(delRootRes)}`;

    // C. Authorized Super Admin: CREATE User
    const testUserId = 'test_sa_' + Date.now();
    const { data: createRes } = await supabase.rpc('superadmin_manage_user', {
      p_admin_id: 'usr_admin',
      p_action: 'create',
      p_user: {
        id: testUserId,
        name: 'Automated Test User',
        email: `test_${Date.now()}@apexsales.com`,
        role: 'sales_rep',
        company: 'Apex Corporation',
        active: true,
        pin: '998877'
      }
    });
    results['User CREATE'] = (createRes && createRes.success)
      ? `PASS (Created ${createRes.id})`
      : `FAIL: ${createRes?.error || 'Failed'}`;

    // D. UPDATE User / Change Role / Change Company / Activate & Deactivate
    const { data: updateRes } = await supabase.rpc('superadmin_manage_user', {
      p_admin_id: 'usr_admin',
      p_action: 'update',
      p_user: {
        id: testUserId,
        name: 'Automated Test User Updated',
        role: 'team_leader',
        company: 'Apex Enterprise Ltd',
        active: false
      }
    });
    results['User UPDATE'] = (updateRes && updateRes.success) ? 'PASS' : `FAIL: ${updateRes?.error}`;
    results['Role change'] = (updateRes && updateRes.success && updateRes.user?.role === 'team_leader') ? 'PASS' : 'FAIL';
    results['Company change'] = (updateRes && updateRes.success && updateRes.user?.company === 'Apex Enterprise Ltd') ? 'PASS' : 'FAIL';
    results['Activate/Deactivate'] = (updateRes && updateRes.success && updateRes.user?.active === false) ? 'PASS' : 'FAIL';

    // E. Verify Persistence via Direct SELECT
    const { data: fetchUser, error: fetchErr } = await supabase.from('users').select('*').eq('id', testUserId).single();
    results['Refresh persistence'] = (fetchUser && fetchUser.role === 'team_leader' && fetchUser.active === false)
      ? 'PASS (Direct PostgreSQL query confirms persisted row)'
      : `FAIL: ${fetchErr?.message || 'Data mismatch'}`;

    // F. DELETE User
    const { data: delRes } = await supabase.rpc('superadmin_manage_user', {
      p_admin_id: 'usr_admin',
      p_action: 'delete',
      p_user: { id: testUserId }
    });
    results['Delete'] = (delRes && delRes.success) ? 'PASS (User cleaned up from DB)' : `FAIL: ${delRes?.error}`;

    // G. Verify Audit Log entry created
    const { data: auditEntries } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(5);
    const hasUserAudit = auditEntries && auditEntries.some(a => a.module === 'User Management');
    results['Audit logging'] = hasUserAudit ? 'PASS (Found User Management audit record)' : 'FAIL';
  } else {
    results['Super Admin authorization'] = 'PENDING MIGRATION';
    results['User CREATE'] = 'PENDING MIGRATION';
    results['User UPDATE'] = 'PENDING MIGRATION';
    results['Role change'] = 'PENDING MIGRATION';
    results['Company change'] = 'PENDING MIGRATION';
    results['Activate/Deactivate'] = 'PENDING MIGRATION';
    results['Delete'] = 'PENDING MIGRATION';
    results['Protected usr_admin'] = 'PENDING MIGRATION';
    results['Audit logging'] = 'PENDING MIGRATION';
    results['Refresh persistence'] = 'PENDING MIGRATION';
  }

  console.log('RESULTS SUMMARY:');
  console.table(results);
}

runTests();
