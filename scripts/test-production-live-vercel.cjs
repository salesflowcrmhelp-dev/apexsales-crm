const BASE_URL = 'https://apexsales-crm.vercel.app';

async function runProductionSmokeTests() {
  console.log('========================================================================');
  console.log('APEXSALES — SALESFLOW HUB v2.4.0');
  console.log('LIVE VERCEL PRODUCTION SMOKE TEST & POST-DEPLOYMENT VERIFICATION');
  console.log('Target URL:', BASE_URL);
  console.log('Timestamp:', new Date().toISOString());
  console.log('========================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, detail = '') {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      if (detail) console.log(`   Detail: ${detail}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName}`);
      if (detail) console.error(`   Detail: ${detail}`);
      failed++;
    }
  }

  // --- SECTION 1: ROUTING & ASSET INTEGRITY ---
  console.log('--- 1. ROUTING & SPA COMPATIBILITY ---');
  try {
    const rootRes = await fetch(`${BASE_URL}/`);
    const rootText = await rootRes.text();
    assert(rootRes.status === 200 && rootText.includes('<!doctype html>'), '1a. Root URL Serves SPA Frontend', `Status: ${rootRes.status}, Size: ${rootText.length}`);

    const crmDeepLink = await fetch(`${BASE_URL}/crm`);
    const crmText = await crmDeepLink.text();
    assert(crmDeepLink.status === 200 && crmText.includes('<!doctype html>'), '1b. Deep Link /crm Rewritten to index.html', `Status: ${crmDeepLink.status}`);

    const adminDeepLink = await fetch(`${BASE_URL}/admin/companies`);
    const adminText = await adminDeepLink.text();
    assert(adminDeepLink.status === 200 && adminText.includes('<!doctype html>'), '1c. Deep Link /admin/companies Rewritten to index.html', `Status: ${adminDeepLink.status}`);
  } catch (err) {
    assert(false, '1. Routing & SPA Tests', err.message);
  }

  // --- SECTION 2: SECURITY & UNAUTHORIZED ACCESS GUARDS ---
  console.log('\n--- 2. SECURITY & UNAUTHORIZED GUARDS ---');
  try {
    const anonCompanies = await fetch(`${BASE_URL}/api/companies`);
    assert(anonCompanies.status === 401, '2a. Unauthorized GET /api/companies Blocked (401)', `Status: ${anonCompanies.status}`);

    const anonLeads = await fetch(`${BASE_URL}/api/leads`);
    assert(anonLeads.status === 401, '2b. Unauthorized GET /api/leads Blocked (401)', `Status: ${anonLeads.status}`);

    const anonUsers = await fetch(`${BASE_URL}/api/users`);
    assert(anonUsers.status === 401, '2c. Unauthorized GET /api/users Blocked (401)', `Status: ${anonUsers.status}`);

    const anonSettings = await fetch(`${BASE_URL}/api/system-settings`);
    assert(anonSettings.status === 401, '2d. Unauthorized GET /api/system-settings Blocked (401)', `Status: ${anonSettings.status}`);

    const anonAudit = await fetch(`${BASE_URL}/api/audit-logs`);
    assert(anonAudit.status === 401, '2e. Unauthorized GET /api/audit-logs Blocked (401)', `Status: ${anonAudit.status}`);
  } catch (err) {
    assert(false, '2. Security Guard Tests', err.message);
  }

  // --- SECTION 3: AUTHENTICATION & SESSION PERSISTENCE ---
  console.log('\n--- 3. AUTHENTICATION & ROLE-BASED ACCESS ---');
  let adminToken = '';
  let repToken = '';
  try {
    const adminAuth = await fetch(`${BASE_URL}/api/auth/demo?role=admin`);
    const adminData = await adminAuth.json();
    adminToken = adminData.token;
    assert(adminAuth.status === 200 && !!adminToken, '3a. Super Admin Session Token Issued', `User: ${adminData.user?.name}, Role: ${adminData.user?.role}`);

    const repAuth = await fetch(`${BASE_URL}/api/auth/demo?role=sales_rep`);
    const repData = await repAuth.json();
    repToken = repData.token;
    assert(repAuth.status === 200 && !!repToken, '3b. Sales Rep Session Token Issued', `User: ${repData.user?.name}, Role: ${repData.user?.role}`);

    // Verify Rep cannot modify system settings (403)
    const forbiddenRes = await fetch(`${BASE_URL}/api/system-settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${repToken}` },
      body: JSON.stringify({ key: 'test', value: 'forbidden' })
    });
    assert(forbiddenRes.status === 403, '3c. Sales Rep Blocked from Admin Settings (403)', `Status: ${forbiddenRes.status}`);
  } catch (err) {
    assert(false, '3. Authentication Tests', err.message);
  }

  // --- SECTION 4: CRM OPERATIONS WITH AUTHORITATIVE DATA ---
  console.log('\n--- 4. CRM OPERATIONS & DATA INTEGRITY ---');
  const adminHeaders = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` };
  let testLeadId = '';
  try {
    const leadsRes = await fetch(`${BASE_URL}/api/leads`, { headers: adminHeaders });
    const leadsData = await leadsRes.json();
    const leadsCount = leadsData.leads ? leadsData.leads.length : (Array.isArray(leadsData) ? leadsData.length : 0);
    assert(leadsRes.status === 200 && leadsCount >= 69, '4a. Authoritative Business Leads Accessible', `Leads Count: ${leadsCount}`);

    // Lead creation
    const newLead = {
      name: 'Production Smoke Lead',
      company: 'Apexsales Test Corp',
      phone: '9899001122',
      email: 'smoke.test@apexsales.com',
      dealValue: 75000,
      stage: 'Prospect',
      leadScoreCategory: 'Hot'
    };
    const createRes = await fetch(`${BASE_URL}/api/leads`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify(newLead)
    });
    const createData = await createRes.json();
    testLeadId = createData.lead?.id || createData.id;
    assert(createRes.status === 200 && !!testLeadId, '4b. Lead Creation Operational', `Lead ID: ${testLeadId}`);

    // Lead editing / stage update
    const updateRes = await fetch(`${BASE_URL}/api/leads/${encodeURIComponent(testLeadId)}`, {
      method: 'PUT',
      headers: adminHeaders,
      body: JSON.stringify({ stage: 'Proposal Sent', notes: 'Verified via production smoke test' })
    });
    assert(updateRes.status === 200, '4c. Lead Update Operational', `Status: ${updateRes.status}`);

    // Cleanup smoke lead
    const delRes = await fetch(`${BASE_URL}/api/leads/${encodeURIComponent(testLeadId)}`, {
      method: 'DELETE',
      headers: adminHeaders
    });
    assert(delRes.status === 200, '4d. Lead Deletion / Cleanup Operational', `Status: ${delRes.status}`);
  } catch (err) {
    assert(false, '4. CRM Operations Tests', err.message);
  }

  // --- SECTION 5: ALL 16 SUPER ADMIN TABS VERIFICATION ---
  console.log('\n--- 5. ALL 16 SUPER ADMIN TABS VERIFICATION ---');
  const tabs = [
    { num: 1, id: 'dashboard', name: 'System Overview', url: `${BASE_URL}/api/leads`, check: (d) => !!d },
    { num: 2, id: 'companies', name: 'Tenant Companies', url: `${BASE_URL}/api/companies`, check: (d) => (d.companies || d.data || d).length >= 5 },
    { num: 3, id: 'users', name: 'User Directory', url: `${BASE_URL}/api/users`, check: (d) => (d.users || d).length >= 5 },
    { num: 4, id: 'subscriptions', name: 'Company Plans', url: `${BASE_URL}/api/company-plans`, check: (d) => (d.plans || d.data || d).length >= 5 },
    { num: 5, id: 'deal_packages', name: 'Deal Packages', url: `${BASE_URL}/api/deal-packages`, check: (d) => (d.packages || d.data || d).length >= 4 },
    { num: 6, id: 'licenses', name: 'Client Licenses', url: `${BASE_URL}/api/client-licenses`, check: (d) => (d.licenses || d.data || d).length >= 1 },
    { num: 7, id: 'leads', name: 'Lead Operations', url: `${BASE_URL}/api/leads`, check: (d) => (d.leads || d).length >= 69 },
    { num: 8, id: 'reports', name: 'Revenue Reports', url: `${BASE_URL}/api/invoices`, check: (d) => (d.invoices || d.data || d).length >= 5 },
    { num: 9, id: 'system_settings', name: 'System Settings', url: `${BASE_URL}/api/system-settings`, check: (d) => !!d },
    { num: 10, id: 'support_tickets', name: 'Support Tickets', url: `${BASE_URL}/api/support-tickets`, check: (d) => (d.tickets || d.data || d).length >= 5 },
    { num: 11, id: 'audit_logs', name: 'Audit Trail', url: `${BASE_URL}/api/audit-logs`, check: (d) => (d.logs || d.auditLogs || d.data || d).length >= 50 },
    { num: 12, id: 'crm_overview', name: 'CRM Velocity & Health', url: `${BASE_URL}/api/leads`, check: (d) => !!d },
    { num: 13, id: 'billing', name: 'Billing & Invoices', url: `${BASE_URL}/api/invoices`, check: (d) => (d.invoices || d.data || d).length >= 5 },
    { num: 14, id: 'notifications', name: 'System Notifications', url: `${BASE_URL}/api/notifications`, check: (d) => (d.notifications || d.data || d).length >= 5 },
    { num: 15, id: 'integrations', name: 'Connectors & Integrations', url: `${BASE_URL}/api/integrations`, check: (d) => (d.integrations || d.data || d).length >= 6 },
    { num: 16, id: 'settings', name: 'Admin Security Guards', url: `${BASE_URL}/api/system-settings`, check: (d) => !!d }
  ];

  for (const tab of tabs) {
    try {
      const res = await fetch(tab.url, { headers: adminHeaders });
      const data = await res.json();
      const ok = res.status === 200 && tab.check(data);
      assert(ok, `Tab ${tab.num} [${tab.id}] - ${tab.name}`, `Status: ${res.status}`);
    } catch (err) {
      assert(false, `Tab ${tab.num} [${tab.id}] - ${tab.name}`, err.message);
    }
  }

  // --- SECTION 6: RESEND SERVERLESS GATEWAY ---
  console.log('\n--- 6. RESEND SERVERLESS INVITATION GATEWAY ---');
  try {
    const inviteRes = await fetch(`${BASE_URL}/api/send-invite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        toEmail: '', // intentionally empty to verify input validation
        recipientName: 'Test'
      })
    });
    assert(inviteRes.status === 400, '6a. Serverless Gateway Input Validation (400 on empty email)', `Status: ${inviteRes.status}`);
  } catch (err) {
    assert(false, '6. Resend Gateway', err.message);
  }

  console.log('\n========================================================================');
  console.log(`TOTAL PRODUCTION TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  if (failed === 0) {
    console.log('PRODUCTION VERDICT: ✅ PRODUCTION LIVE — VERIFIED (100% PASS)');
  } else {
    console.log('PRODUCTION VERDICT: ❌ PRODUCTION LIVE — VERIFICATION FAILED');
  }
  console.log('========================================================================');
}

runProductionSmokeTests().catch(err => console.error(err));
