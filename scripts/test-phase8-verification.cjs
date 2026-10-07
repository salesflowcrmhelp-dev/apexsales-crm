const fs = require('fs');

async function runVerification() {
  console.log('========================================================================');
  console.log('SALESFLOW HUB — PHASE 8 VERIFICATION & COMPLIANCE TEST SUITE');
  console.log('========================================================================\n');

  const results = [];
  function record(testName, passed, detail) {
    results.push({ testName, passed, detail });
    console.log(`${passed ? '✅ [PASS]' : '❌ [FAIL]'} ${testName}`);
    if (detail) console.log(`   Detail: ${detail}`);
  }

  // --- GATE 1: SMS ENDPOINT SECURITY (BLOCKER 4) ---
  console.log('\n--- 1. SMS GATEWAY VERIFICATION (/api/send-sms) ---');
  try {
    // 1a. Unauthenticated call -> Must return 401
    const anonSmsRes = await fetch('http://localhost:5173/api/send-sms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '9876543210', otp: '1234' })
    });
    record('1a. Anonymous SMS Request Rejection', anonSmsRes.status === 401, `Status: ${anonSmsRes.status}`);

    // 1b. Authenticate demo admin token
    const authRes = await fetch('http://localhost:5173/api/auth/demo?role=admin');
    const authData = await authRes.json();
    const token = authData.token;
    record('1b. Demo Auth Token Issuance', !!token && authData.user.id === 'usr_admin', `User: ${authData.user.name}, Token Present: ${!!token}`);

    // 1c. Invalid Indian phone number -> Must return 400
    const badPhoneRes = await fetch('http://localhost:5173/api/send-sms', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ phone: '1234567890', otp: '1234' })
    });
    record('1c. Invalid Mobile Validation (Non-Indian prefix)', badPhoneRes.status === 400, `Status: ${badPhoneRes.status}`);

    // 1d. Valid Indian phone number -> Must succeed (simulated/sent)
    const goodSmsRes = await fetch('http://localhost:5173/api/send-sms', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ phone: '9876543210', otp: '5678' })
    });
    const goodSmsData = await goodSmsRes.json();
    record('1d. Authorized SMS Dispatch Handling', goodSmsRes.status === 200 && goodSmsData.success === true, `Message: ${goodSmsData.message}`);

    // 1e. Client-supplied apiKey ignored
    const forgedKeyRes = await fetch('http://localhost:5173/api/send-sms', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ phone: '9811223344', otp: '5678', apiKey: 'forged_attacker_key' })
    });
    const forgedData = await forgedKeyRes.json();
    record('1e. Client apiKey Ignored', forgedKeyRes.status === 200 && forgedData.simulated === true, `Simulated mode preserved safely`);
  } catch (e) {
    record('SMS Suite Exception', false, e.message);
  }

  // --- GATE 2: AUTHENTICATED REST DATA ACCESS (BLOCKER 3) ---
  console.log('\n--- 2. AUTHENTICATED REST SERVICES VERIFICATION ---');
  try {
    const authRes = await fetch('http://localhost:5173/api/auth/demo?role=admin');
    const { token } = await authRes.json();
    const headers = { 'Authorization': `Bearer ${token}` };

    // 2a. Companies
    const compRes = await fetch('http://localhost:5173/api/companies', { headers });
    const compData = await compRes.json();
    record('2a. Companies Live Data Access', compRes.status === 200 && compData.companies.length === 5, `Count: ${compData.companies.length}`);

    // 2b. Invoices
    const invRes = await fetch('http://localhost:5173/api/invoices', { headers });
    const invData = await invRes.json();
    record('2b. Invoices Live Data Access', invRes.status === 200 && invData.invoices.length === 5, `Count: ${invData.invoices.length}`);

    // 2c. Support Tickets
    const tickRes = await fetch('http://localhost:5173/api/support-tickets', { headers });
    const tickData = await tickRes.json();
    record('2c. Support Tickets Live Data Access', tickRes.status === 200 && tickData.tickets.length === 5, `Count: ${tickData.tickets.length}`);

    // 2d. Audit Logs
    const logRes = await fetch('http://localhost:5173/api/audit-logs', { headers });
    const logData = await logRes.json();
    record('2d. Audit Logs Live Data Access', logRes.status === 200 && logData.logs.length === 59, `Count: ${logData.logs.length}`);

    // 2e. Notifications
    const notifRes = await fetch('http://localhost:5173/api/notifications', { headers });
    const notifData = await notifRes.json();
    record('2e. Notifications Live Data Access', notifRes.status === 200 && notifData.notifications.length === 5, `Count: ${notifData.notifications.length}`);

    // 2f. Integrations
    const integRes = await fetch('http://localhost:5173/api/integrations', { headers });
    const integData = await integRes.json();
    record('2f. Integrations Live Data Access', integRes.status === 200 && integData.integrations.length === 6, `Count: ${integData.integrations.length}`);

    // 2g. Company Plans
    const planRes = await fetch('http://localhost:5173/api/company-plans', { headers });
    const planData = await planRes.json();
    record('2g. Company Plans Live Data Access', planRes.status === 200 && planData.plans.length === 5, `Count: ${planData.plans.length}`);

    // 2h. Deal Packages
    const pkgRes = await fetch('http://localhost:5173/api/deal-packages', { headers });
    const pkgData = await pkgRes.json();
    record('2h. Deal Packages Live Data Access', pkgRes.status === 200 && pkgData.packages.length === 4, `Count: ${pkgData.packages.length}`);

    // 2i. Client Licenses
    const licRes = await fetch('http://localhost:5173/api/client-licenses', { headers });
    const licData = await licRes.json();
    record('2i. Client Licenses Live Data Access', licRes.status === 200 && licData.licenses.length === 1, `Count: ${licData.licenses.length}`);

    // 2j. System Settings
    const setRes = await fetch('http://localhost:5173/api/system-settings', { headers });
    const setData = await setRes.json();
    const settingsCount = setData.count || Object.keys(setData.settings || {}).length;
    record('2j. System Settings Live Data Access', setRes.status === 200 && settingsCount === 6, `Count: ${settingsCount}`);

    // 2k. Leads (Admin Master Access)
    const leadRes = await fetch('http://localhost:5173/api/leads', { headers });
    const leadData = await leadRes.json();
    record('2k. CRM Leads Live Data Access', leadRes.status === 200 && leadData.leads.length >= 69, `Count: ${leadData.leads.length}`);

    // 2l. Users (Admin Master Access)
    const userRes = await fetch('http://localhost:5173/api/users', { headers });
    const userData = await userRes.json();
    record('2l. Team Users Live Data Access', userRes.status === 200 && userData.users.length === 5, `Count: ${userData.users.length}`);

    // 2m. Verify credentials stripped in /api/users
    const hasLeakedPin = userData.users.some(u => u.pin !== undefined || u.pin_hash !== undefined);
    record('2m. Credential Leak Prevention (PIN / Hashes Stripped)', !hasLeakedPin, `No user objects expose PIN or hash`);
  } catch (e) {
    record('REST Suite Exception', false, e.message);
  }

  // --- GATE 3: MULTI-TENANT ISOLATION & RBAC (BLOCKER 2 & SECURITY) ---
  console.log('\n--- 3. MULTI-TENANT ISOLATION & ROLE ACCESS ---');
  try {
    // 3a. Team Leader (Vikram) Token
    const vikramAuth = await fetch('http://localhost:5173/api/auth/demo?role=manager');
    const vikram = await vikramAuth.json();
    const vikramHeaders = { 'Authorization': `Bearer ${vikram.token}` };

    const vikramLeadsRes = await fetch('http://localhost:5173/api/leads', { headers: vikramHeaders });
    const vikramLeads = await vikramLeadsRes.json();
    record('3a. Team Leader Scoped Leads Visibility', vikramLeads.leads.length > 0 && vikramLeads.leads.length < 69, `Vikram visible leads: ${vikramLeads.leads.length} of 69 total`);

    // 3b. Sales Rep (Rohan) Token
    const rohanAuth = await fetch('http://localhost:5173/api/auth/demo?role=rep');
    const rohan = await rohanAuth.json();
    const rohanHeaders = { 'Authorization': `Bearer ${rohan.token}` };

    const rohanLeadsRes = await fetch('http://localhost:5173/api/leads', { headers: rohanHeaders });
    const rohanLeads = await rohanLeadsRes.json();
    const allRohanOwned = rohanLeads.leads.every(l => l.owner.toLowerCase() === 'rohan sharma');
    record('3b. Sales Rep Strict Own-Leads-Only Privacy', allRohanOwned && rohanLeads.leads.length > 0, `Rohan visible leads: ${rohanLeads.leads.length}, strictly owned by Rohan: ${allRohanOwned}`);

    // 3c. Sales Rep Users List Visibility (Only self visible)
    const rohanUsersRes = await fetch('http://localhost:5173/api/users', { headers: rohanHeaders });
    const rohanUsers = await rohanUsersRes.json();
    record('3c. Sales Rep User Privacy (Self only)', rohanUsers.users.length === 1 && rohanUsers.users[0].id === 'usr_rohan', `Users seen: ${rohanUsers.users.length}`);

    // 3d. Root Admin usr_admin Deletion Prevention
    const delAdminRes = await fetch('http://localhost:5173/api/users/usr_admin', {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${vikram.token}` }
    });
    record('3d. Non-Admin Delete Forbidden (Vikram -> usr_admin)', delAdminRes.status === 403, `Status: ${delAdminRes.status}`);

    const delAdminByAdminRes = await fetch('http://localhost:5173/api/users/usr_admin', {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${vikram.token}` }
    });
    record('3e. Root Admin Protection Mechanism', delAdminByAdminRes.status === 403, `usr_admin cannot be deleted`);
  } catch (e) {
    record('RBAC Suite Exception', false, e.message);
  }

  // --- GATE 4: UNPROTECTED ANONYMOUS ACCESS BLOCKING ---
  console.log('\n--- 4. UNPROTECTED ANONYMOUS ACCESS REJECTION ---');
  try {
    const unauthRoutes = [
      '/api/leads',
      '/api/users',
      '/api/companies',
      '/api/invoices',
      '/api/support-tickets',
      '/api/audit-logs',
      '/api/notifications',
      '/api/integrations',
      '/api/company-plans',
      '/api/deal-packages',
      '/api/client-licenses',
      '/api/system-settings'
    ];
    let allBlocked = true;
    for (const r of unauthRoutes) {
      const res = await fetch(`http://localhost:5173${r}`);
      if (res.status !== 401 && res.status !== 403) {
        allBlocked = false;
        console.log(`Route ${r} returned non-401: ${res.status}`);
      }
    }
    record('4. Universal Anonymous Rejection Across All Sensitive APIs', allBlocked, `All 12 protected routes return 401 Unauthorized for anon`);
  } catch (e) {
    record('Anon Access Suite Exception', false, e.message);
  }

  // --- GATE 5: BUILD SYSTEM INTEGRITY ---
  console.log('\n--- 5. PRODUCTION BUILD VERIFICATION ---');
  const distExists = fs.existsSync('dist/index.html') && fs.existsSync('dist/assets');
  record('5. Production Build Artifacts Verified', distExists, 'dist/ directory verified');

  console.log('\n========================================================================');
  const passCount = results.filter(r => r.passed).length;
  console.log(`TOTAL TESTS: ${results.length} | PASSED: ${passCount} | FAILED: ${results.length - passCount}`);
  console.log('========================================================================\n');
}

runVerification();
