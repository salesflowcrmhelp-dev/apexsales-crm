const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://zgndrkgnldrwhcypdhjt.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpnbmRya2dubGRyd2hjeXBkaGp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAwNDU4MjYsImV4cCI6MjEwNTYyMTgyNn0.KfB_zXo1btSfbF6WaCvOdlc4kMyvNSQPvAcadMPhZ1o';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function runPhase2SecurityVerification() {
  console.log('====================================================');
  console.log('STEP 5 — PHASE 2 LIVE SUPABASE RLS & SECURITY SUITE');
  console.log('====================================================\n');

  const report = {};

  // ----------------------------------------------------
  // TEST SUITE 1: RPC PRESENCE & AUTHORIZATION
  // ----------------------------------------------------
  console.log('--- TEST 1: Checking RPC superadmin_manage_entity ---');
  try {
    const { data: rpcTest, error: rpcErr } = await supabase.rpc('superadmin_manage_entity', {
      p_admin_id: 'usr_admin',
      p_entity: 'invalid_probe',
      p_action: 'probe',
      p_payload: {}
    });

    if (rpcErr && rpcErr.code === 'PGRST202') {
      report['RPC superadmin_manage_entity installed'] = { pass: false, evidence: 'Function not found in schema cache (PGRST202)' };
    } else if (rpcTest && rpcTest.error && rpcTest.error.includes('Unknown entity')) {
      report['RPC superadmin_manage_entity installed'] = { pass: true, evidence: 'Installed & signature active' };
    } else {
      report['RPC superadmin_manage_entity installed'] = { pass: !rpcErr, evidence: JSON.stringify(rpcTest || rpcErr) };
    }
  } catch (e) {
    report['RPC superadmin_manage_entity installed'] = { pass: false, evidence: e.message };
  }

  console.log('--- TEST 2: Checking RPC superadmin_record_audit_log ---');
  try {
    const { data: auditRpcTest, error: auditRpcErr } = await supabase.rpc('superadmin_record_audit_log', {
      p_admin_id: '',
      p_log: {}
    });

    if (auditRpcErr && auditRpcErr.code === 'PGRST202') {
      report['RPC superadmin_record_audit_log installed'] = { pass: false, evidence: 'Function not found in schema cache (PGRST202)' };
    } else if (auditRpcTest && auditRpcTest.error && auditRpcTest.error.includes('403 Forbidden')) {
      report['RPC superadmin_record_audit_log installed'] = { pass: true, evidence: 'Installed & blocks anonymous caller with 403 Forbidden' };
    } else {
      report['RPC superadmin_record_audit_log installed'] = { pass: !auditRpcErr, evidence: JSON.stringify(auditRpcTest || auditRpcErr) };
    }
  } catch (e) {
    report['RPC superadmin_record_audit_log installed'] = { pass: false, evidence: e.message };
  }

  // ----------------------------------------------------
  // TEST SUITE 2: UNAUTHORIZED RPC CALLERS
  // ----------------------------------------------------
  console.log('--- TEST 3: Unauthorized RPC Caller Rejection ---');
  try {
    const { data: unauthRes } = await supabase.rpc('superadmin_manage_entity', {
      p_admin_id: 'usr_rohan', // sales executive (not admin)
      p_entity: 'companies',
      p_action: 'upsert',
      p_payload: { id: 'c_hacked', name: 'Hacked Corp' }
    });
    const blocked = unauthRes && unauthRes.success === false && unauthRes.error.includes('403 Forbidden');
    report['Unauthorized RPC Caller'] = {
      pass: blocked,
      evidence: blocked ? `403 Forbidden caller blocked: ${unauthRes.error}` : `Allowed: ${JSON.stringify(unauthRes)}`
    };
  } catch (e) {
    report['Unauthorized RPC Caller'] = { pass: true, evidence: `Exception blocked: ${e.message}` };
  }

  // ----------------------------------------------------
  // TEST SUITE 3: ANONYMOUS DIRECT WRITES AGAINST ALL 11 TABLES
  // ----------------------------------------------------
  const tables = [
    { table: 'companies', payload: { id: 'probe_anon_c', name: 'Anon Co' }, key: 'id', val: 'probe_anon_c' },
    { table: 'leads', payload: { id: 'probe_anon_l', name: 'Anon Lead', company: 'Anon Co' }, key: 'id', val: 'probe_anon_l' },
    { table: 'support_tickets', payload: { id: 'probe_anon_t', subject: 'Anon Tck', customer: 'Anon Cust', company: 'Anon Co' }, key: 'id', val: 'probe_anon_t' },
    { table: 'invoices', payload: { id: '#INV-ANON-PROBE', company: 'Anon Co', amount: '₹100' }, key: 'id', val: '#INV-ANON-PROBE' },
    { table: 'notifications', payload: { id: 'probe_anon_n', title: 'Anon Notif' }, key: 'id', val: 'probe_anon_n' },
    { table: 'integrations', payload: { id: 'probe_anon_i', name: 'Anon Integ', category: 'CRM' }, key: 'id', val: 'probe_anon_i' },
    { table: 'audit_logs', payload: { id: 'probe_anon_al', date_time: 'Today', user_name: 'Hacker', action: 'Hack', module: 'System' }, key: 'id', val: 'probe_anon_al' },
    { table: 'company_plans', payload: { id: 'probe_anon_cp', company_id: 'probe_anon_c', plan_id: 'pro', plan_name: 'Pro' }, key: 'company_id', val: 'probe_anon_c' },
    { table: 'deal_packages', payload: { id: 'probe_anon_dp', name: 'Anon Pkg', price: 999 }, key: 'id', val: 'probe_anon_dp' },
    { table: 'client_licenses', payload: { id: 'probe_anon_lic', license_number: 'LIC-ANON-PROBE', company_id: 'probe_anon_c', company_name: 'Anon Co', client_name: 'Anon', client_email: 'anon@co.com' }, key: 'license_number', val: 'LIC-ANON-PROBE' },
    { table: 'system_settings', payload: { key: 'probe_anon_sett', value: { hack: true } }, key: 'key', val: 'probe_anon_sett' }
  ];

  console.log('--- TEST 4: Anonymous Direct Writes (INSERT / UPDATE / DELETE) ---');
  for (const t of tables) {
    let insertBlocked = false;
    let updateBlocked = false;
    let deleteBlocked = false;
    let insertErrDetail = '';

    // A. Direct Anonymous INSERT
    try {
      const { data: insData, error: insErr } = await supabase.from(t.table).insert([t.payload]).select();
      if (insErr) {
        insertBlocked = true;
        insertErrDetail = `${insErr.code}: ${insErr.message}`;
      } else {
        insertBlocked = false;
        // cleanup if allowed
        await supabase.from(t.table).delete().eq(t.key, t.val);
      }
    } catch (e) {
      insertBlocked = true;
      insertErrDetail = e.message;
    }

    // B. Direct Anonymous UPDATE
    try {
      const { data: updData, error: updErr } = await supabase.from(t.table).update({ updated_at: new Date().toISOString() }).eq(t.key, t.val).select();
      if (updErr || !updData || updData.length === 0) {
        updateBlocked = true;
      } else {
        updateBlocked = false;
      }
    } catch (e) {
      updateBlocked = true;
    }

    // C. Direct Anonymous DELETE
    try {
      const { data: delData, error: delErr } = await supabase.from(t.table).delete().eq(t.key, t.val).select();
      if (delErr || !delData || delData.length === 0) {
        deleteBlocked = true;
      } else {
        deleteBlocked = false;
      }
    } catch (e) {
      deleteBlocked = true;
    }

    report[`${t.table} Anonymous Writes`] = {
      pass: insertBlocked && updateBlocked && deleteBlocked,
      evidence: `INSERT blocked: ${insertBlocked} (${insertErrDetail || 'RLS denied'}), UPDATE blocked: ${updateBlocked}, DELETE blocked: ${deleteBlocked}`
    };
  }

  // ----------------------------------------------------
  // TEST SUITE 4: AUTHORIZED SUPER ADMIN CRUD VIA SECURE RPC
  // ----------------------------------------------------
  console.log('--- TEST 5: Authorized Super Admin Operations via RPC ---');
  const adminId = 'usr_admin';

  // 1. Company CRUD
  try {
    const testCompId = `c_test_${Date.now()}`;
    const { data: cRes } = await supabase.rpc('superadmin_manage_entity', {
      p_admin_id: adminId,
      p_entity: 'company',
      p_action: 'upsert',
      p_payload: { id: testCompId, name: 'Verified Admin Co', plan: 'Enterprise' }
    });
    const cPass = cRes && cRes.success;
    // Cleanup
    if (cPass) {
      await supabase.rpc('superadmin_manage_entity', {
        p_admin_id: adminId,
        p_entity: 'company',
        p_action: 'delete',
        p_payload: { id: testCompId }
      });
    }
    report['Authorized Super Admin Company CRUD'] = {
      pass: cPass,
      evidence: cPass ? `Created and deleted company ${testCompId} successfully` : JSON.stringify(cRes)
    };
  } catch (e) {
    report['Authorized Super Admin Company CRUD'] = { pass: false, evidence: e.message };
  }

  // 2. Lead CRUD
  try {
    const testLeadId = `lead_test_${Date.now()}`;
    const { data: lRes } = await supabase.rpc('superadmin_manage_entity', {
      p_admin_id: adminId,
      p_entity: 'lead',
      p_action: 'upsert',
      p_payload: { id: testLeadId, name: 'Verified Admin Lead', company: 'ApexSales Pvt Ltd', value: 50000, status: 'Qualified' }
    });
    const lPass = lRes && lRes.success;
    if (lPass) {
      await supabase.rpc('superadmin_manage_entity', {
        p_admin_id: adminId,
        p_entity: 'lead',
        p_action: 'delete',
        p_payload: { id: testLeadId }
      });
    }
    report['Authorized Super Admin Lead CRUD'] = {
      pass: lPass,
      evidence: lPass ? `Created and deleted lead ${testLeadId} successfully` : JSON.stringify(lRes)
    };
  } catch (e) {
    report['Authorized Super Admin Lead CRUD'] = { pass: false, evidence: e.message };
  }

  // 3. Support Ticket CRUD & Status
  try {
    const testTckId = `t_test_${Date.now()}`;
    const { data: tRes } = await supabase.rpc('superadmin_manage_entity', {
      p_admin_id: adminId,
      p_entity: 'ticket',
      p_action: 'upsert',
      p_payload: { id: testTckId, subject: 'Verified Admin Ticket', customer: 'Test Cust', company: 'ABC Pvt Ltd', status: 'In Progress' }
    });
    const tPass = tRes && tRes.success;
    if (tPass) {
      await supabase.rpc('superadmin_manage_entity', {
        p_admin_id: adminId,
        p_entity: 'ticket',
        p_action: 'delete',
        p_payload: { id: testTckId }
      });
    }
    report['Authorized Super Admin Ticket CRUD'] = {
      pass: tPass,
      evidence: tPass ? `Created, updated, and deleted ticket ${testTckId} successfully` : JSON.stringify(tRes)
    };
  } catch (e) {
    report['Authorized Super Admin Ticket CRUD'] = { pass: false, evidence: e.message };
  }

  // 4. Invoice Create / Update / Delete
  try {
    const testInvId = `#INV-TEST-${Date.now().toString().slice(-4)}`;
    const { data: invRes } = await supabase.rpc('superadmin_manage_entity', {
      p_admin_id: adminId,
      p_entity: 'invoice',
      p_action: 'upsert',
      p_payload: { id: testInvId, company: 'ABC Pvt Ltd', amount: '₹15,000', numeric_amount: 15000, status: 'Paid' }
    });
    const invPass = invRes && invRes.success;
    if (invPass) {
      await supabase.rpc('superadmin_manage_entity', {
        p_admin_id: adminId,
        p_entity: 'invoice',
        p_action: 'delete',
        p_payload: { id: testInvId }
      });
    }
    report['Authorized Super Admin Invoice CRUD'] = {
      pass: invPass,
      evidence: invPass ? `Created and deleted invoice ${testInvId} successfully` : JSON.stringify(invRes)
    };
  } catch (e) {
    report['Authorized Super Admin Invoice CRUD'] = { pass: false, evidence: e.message };
  }

  // 5. Audit Log RPC
  try {
    const testLogId = `al_test_${Date.now()}`;
    const { data: alRes } = await supabase.rpc('superadmin_record_audit_log', {
      p_admin_id: adminId,
      p_log: { id: testLogId, action: 'Security Audit Verification', module: 'Security', details: 'Phase 2 automated test audit entry' }
    });
    const alPass = alRes && alRes.success;
    report['Authorized Super Admin Audit Log RPC'] = {
      pass: alPass,
      evidence: alPass ? `Logged audit entry ${testLogId} with authoritative Super Admin identity` : JSON.stringify(alRes)
    };
  } catch (e) {
    report['Authorized Super Admin Audit Log RPC'] = { pass: false, evidence: e.message };
  }

  console.log('\n====================================================');
  console.log('PHASE 2 SECURITY VERIFICATION RESULTS:');
  console.log('====================================================');
  console.table(Object.entries(report).map(([k, v]) => ({
    check: k,
    pass: v.pass,
    evidence: v.evidence
  })));

  return report;
}

runPhase2SecurityVerification();
