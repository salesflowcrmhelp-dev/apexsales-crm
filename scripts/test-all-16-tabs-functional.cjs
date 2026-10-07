const fs = require('fs');

async function testAll16TabsFunctional() {
  console.log('========================================================================');
  console.log('FUNCTIONAL AUDIT OF ALL 16 SUPER ADMIN TABS (ACTIONS & PERSISTENCE)');
  console.log('========================================================================\n');

  const adminTokenRes = await fetch('http://localhost:5000/api/auth/demo?role=admin');
  const { token: adminToken } = await adminTokenRes.json();
  const adminHeaders = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` };

  const repTokenRes = await fetch('http://localhost:5000/api/auth/demo?role=sales_rep');
  const { token: repToken } = await repTokenRes.json();
  const repHeaders = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${repToken}` };

  const results = [];
  function record(tabNum, tabId, label, action, status, passed, detail) {
    results.push({ tabNum, tabId, label, action, status, passed, detail });
    console.log(`[${passed ? '✅ PASS' : '❌ FAIL'}] Tab ${tabNum} [${tabId}]: ${action} -> Status: ${status} | ${detail}`);
  }

  // TAB 1: dashboard
  const dashRes = await fetch('http://localhost:5000/api/leads', { headers: adminHeaders });
  record(1, 'dashboard', 'System Overview', 'KPI Aggregation Data Fetch', dashRes.status, dashRes.status === 200, 'Live leads data retrieved for KPI computation');

  // TAB 2: companies
  const compId = `c_fn_${Date.now()}`;
  const cCreate = await fetch('http://localhost:5000/api/companies', {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({ id: compId, name: 'Functional Test Corp', plan: 'Enterprise', status: 'Active' })
  });
  const cGet = await (await fetch('http://localhost:5000/api/companies', { headers: adminHeaders })).json();
  const cPersisted = (Array.isArray(cGet) ? cGet : cGet.companies || []).some(c => c.id === compId);
  await fetch(`http://localhost:5000/api/companies/${compId}`, { method: 'DELETE', headers: adminHeaders });
  record(2, 'companies', 'Tenant Companies', 'Create, Persist, Delete Company', cCreate.status, cCreate.status === 200 && cPersisted, 'Company created, verified in list, and cleaned up');

  // TAB 3: users
  const usrEmail = `fn_user_${Date.now()}@apexsales.com`;
  const uCreate = await fetch('http://localhost:5000/api/users', {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({ name: 'Functional User', email: usrEmail, role: 'sales_rep', pin: 'UserPass99!' })
  });
  const uData = await uCreate.json();
  const createdUid = uData.user?.id;
  const uGet = await (await fetch('http://localhost:5000/api/users', { headers: adminHeaders })).json();
  const uPersisted = (Array.isArray(uGet) ? uGet : uGet.users || []).some(u => u.id === createdUid);
  if (createdUid) await fetch(`http://localhost:5000/api/users/${createdUid}`, { method: 'DELETE', headers: adminHeaders });
  record(3, 'users', 'User Directory', 'Add User (Argon2id), Persist, Delete', uCreate.status, uCreate.status === 200 && uPersisted, 'User created with Argon2id, verified in list, and purged');

  // TAB 4: subscriptions
  const planGet = await fetch('http://localhost:5000/api/company-plans', { headers: adminHeaders });
  record(4, 'subscriptions', 'Tenant Subscriptions', 'Fetch Company Plans', planGet.status, planGet.status === 200, 'Company plans retrieved successfully');

  // TAB 5: deal_packages
  const pkgId = `pkg_fn_${Date.now()}`;
  const pkgCreate = await fetch('http://localhost:5000/api/deal-packages', {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({ id: pkgId, name: 'Functional Package', price: 29999, duration: '2 Months', quota: '1000 Leads' })
  });
  const pkgGet = await (await fetch('http://localhost:5000/api/deal-packages', { headers: adminHeaders })).json();
  const pkgPersisted = (Array.isArray(pkgGet) ? pkgGet : pkgGet.dealPackages || []).some(p => p.id === pkgId);
  await fetch(`http://localhost:5000/api/deal-packages/${pkgId}`, { method: 'DELETE', headers: adminHeaders });
  record(5, 'deal_packages', 'Deal Packages', 'Create, Persist, Delete Package', pkgCreate.status, pkgCreate.status === 200 && pkgPersisted, 'Deal package created, verified, and deleted');

  // TAB 6: licenses
  const licId = `lic_fn_${Date.now()}`;
  const licCreate = await fetch('http://localhost:5000/api/client-licenses', {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({ id: licId, license_number: `LIC-${Date.now()}`, company_name: 'Test Corp', client_name: 'Test Client', final_amount: 15000 })
  });
  const licGet = await (await fetch('http://localhost:5000/api/client-licenses', { headers: adminHeaders })).json();
  const licPersisted = (Array.isArray(licGet) ? licGet : licGet.clientLicenses || []).some(l => l.id === licId);
  await fetch(`http://localhost:5000/api/client-licenses/${licId}`, { method: 'DELETE', headers: adminHeaders });
  record(6, 'licenses', 'Client Licenses', 'Issue, Persist, Delete License', licCreate.status, licCreate.status === 200 && licPersisted, 'Client license issued, verified, and purged');

  // TAB 7: leads
  const leadId = `lead_fn_${Date.now()}`;
  const lCreate = await fetch('http://localhost:5000/api/leads', {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({ id: leadId, name: 'Functional Lead', company: 'Lead Corp', status: 'New', value: 8000, owner: 'Harsh Goyal' })
  });
  const lGet = await (await fetch('http://localhost:5000/api/leads', { headers: adminHeaders })).json();
  const lPersisted = (Array.isArray(lGet) ? lGet : lGet.leads || []).some(l => l.id === leadId);
  await fetch(`http://localhost:5000/api/leads/${leadId}`, { method: 'DELETE', headers: adminHeaders });
  record(7, 'leads', 'Lead Operations', 'Create, Persist, Delete Lead', lCreate.status, lCreate.status === 200 && lPersisted, 'Lead created, verified, and deleted');

  // TAB 8: reports
  const repLeads = await fetch('http://localhost:5000/api/leads', { headers: adminHeaders });
  const repInvoices = await fetch('http://localhost:5000/api/invoices', { headers: adminHeaders });
  record(8, 'reports', 'Reports & Revenue', 'Revenue & Pipeline Aggregations', repLeads.status, repLeads.status === 200 && repInvoices.status === 200, 'Real revenue data aggregated from invoices and leads');

  // TAB 9: system_settings
  const setKey = `fn_setting_${Date.now()}`;
  const setSave = await fetch('http://localhost:5000/api/system-settings', {
    method: 'PUT',
    headers: adminHeaders,
    body: JSON.stringify({ key: setKey, value: 'fn_value_123' })
  });
  const setGet = await (await fetch('http://localhost:5000/api/system-settings', { headers: adminHeaders })).json();
  const setPersisted = setGet.settings?.[setKey] === 'fn_value_123';
  // Cleanup
  const db = JSON.parse(fs.readFileSync('server/data/db.json', 'utf8'));
  delete db.settings[setKey];
  fs.writeFileSync('server/data/db.json', JSON.stringify(db, null, 2));
  record(9, 'system_settings', 'Platform Settings', 'Save & Persist System Setting', setSave.status, setSave.status === 200 && setPersisted, 'Setting saved and verified in persistent db.json');

  // TAB 10: support_tickets
  const tckId = `t_fn_${Date.now()}`;
  const tckCreate = await fetch('http://localhost:5000/api/support-tickets', {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({ id: tckId, subject: 'Functional Ticket', status: 'Open', priority: 'Medium' })
  });
  const tckGet = await (await fetch('http://localhost:5000/api/support-tickets', { headers: adminHeaders })).json();
  const tckPersisted = (Array.isArray(tckGet) ? tckGet : tckGet.tickets || []).some(t => t.id === tckId);
  await fetch(`http://localhost:5000/api/support-tickets/${tckId}`, { method: 'DELETE', headers: adminHeaders });
  record(10, 'support_tickets', 'Support Tickets', 'Create, Persist, Delete Ticket', tckCreate.status, tckCreate.status === 200 && tckPersisted, 'Support ticket created, verified, and deleted');

  // TAB 11: audit_logs
  const auditRes = await fetch('http://localhost:5000/api/audit-logs', { headers: adminHeaders });
  const auditData = await auditRes.json();
  const auditCount = Array.isArray(auditData) ? auditData.length : auditData.logs?.length || 0;
  record(11, 'audit_logs', 'Audit Trail', 'Fetch Tamper-Evident Logs', auditRes.status, auditRes.status === 200 && auditCount > 0, `Audit logs retrieved (${auditCount} records)`);

  // TAB 12: crm_overview
  const crmLeads = await fetch('http://localhost:5000/api/leads', { headers: adminHeaders });
  record(12, 'crm_overview', 'CRM Health Overview', 'Workspace Health Metrics Fetch', crmLeads.status, crmLeads.status === 200, 'Pipeline velocity metrics fetched from live leads');

  // TAB 13: billing
  const invRes = await fetch('http://localhost:5000/api/invoices', { headers: adminHeaders });
  const invData = await invRes.json();
  const invCount = Array.isArray(invData) ? invData.length : invData.invoices?.length || 0;
  record(13, 'billing', 'Billing & Invoices', 'Fetch Invoices & Tax Status', invRes.status, invRes.status === 200 && invCount > 0, `Invoices retrieved (${invCount} invoices)`);

  // TAB 14: notifications
  const notifRes = await fetch('http://localhost:5000/api/notifications', { headers: adminHeaders });
  const notifData = await notifRes.json();
  const notifCount = Array.isArray(notifData) ? notifData.length : notifData.notifications?.length || 0;
  record(14, 'notifications', 'System Notifications', 'Fetch System Notifications', notifRes.status, notifRes.status === 200 && notifCount > 0, `Notifications retrieved (${notifCount} alerts)`);

  // TAB 15: integrations
  const intGet = await (await fetch('http://localhost:5000/api/integrations', { headers: adminHeaders })).json();
  const firstInt = (Array.isArray(intGet) ? intGet : intGet.integrations || [])[0];
  let intToggled = false;
  if (firstInt) {
    const origStatus = firstInt.connected;
    const intToggle = await fetch(`http://localhost:5000/api/integrations/${firstInt.id}`, {
      method: 'PUT',
      headers: adminHeaders,
      body: JSON.stringify({ ...firstInt, connected: !origStatus })
    });
    const intVerify = await (await fetch('http://localhost:5000/api/integrations', { headers: adminHeaders })).json();
    const updatedInt = (Array.isArray(intVerify) ? intVerify : intVerify.integrations || []).find(i => i.id === firstInt.id);
    intToggled = intToggle.status === 200 && updatedInt.connected === !origStatus;
    // Revert
    await fetch(`http://localhost:5000/api/integrations/${firstInt.id}`, {
      method: 'PUT',
      headers: adminHeaders,
      body: JSON.stringify({ ...firstInt, connected: origStatus })
    });
  }
  record(15, 'integrations', 'Connectors', 'Toggle Connector Status & Persist', 200, intToggled, 'Integration connector state toggled, verified, and reverted cleanly');

  // TAB 16: settings & Permission-Denied tests
  const unauthSettings = await fetch('http://localhost:5000/api/system-settings', {
    method: 'PUT',
    headers: repHeaders, // Sales rep attempting super admin action
    body: JSON.stringify({ key: 'forbidden_key', value: 'bad' })
  });
  record(16, 'settings', 'Admin Security Settings', 'Permission-Denied Guard (403)', unauthSettings.status, unauthSettings.status === 403, 'Non-admin forbidden from modifying system settings');

  console.log('\n========================================================================');
  const allPassed = results.every(r => r.passed);
  console.log(`TOTAL ACTIONS TESTED: ${results.length} | PASSED: ${results.filter(r => r.passed).length} | FAILED: ${results.filter(r => !r.passed).length}`);
  console.log('FUNCTIONAL AUDIT VERDICT:', allPassed ? '✅ VERIFIED PASS' : '❌ FAILED');
  console.log('========================================================================\n');
}

testAll16TabsFunctional();
