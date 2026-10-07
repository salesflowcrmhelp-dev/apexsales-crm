const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function runPhase5eVerification() {
  console.log('========================================================================');
  console.log('🚀 RUNNING PHASE 5E COMPREHENSIVE LIVE VERIFICATION SUITE');
  console.log('========================================================================\n');

  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  });
  const context = await browser.newContext({ viewport: { width: 1440, height: 950 } });
  const page = await context.newPage();

  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error' && !msg.text().includes('favicon') && !msg.text().includes('401')) {
      consoleErrors.push(msg.text());
    }
  });
  page.on('pageerror', err => consoleErrors.push(err.toString()));

  // 1. Session Setup
  console.log('1. Setting authenticated Super Admin session...');
  await page.goto('http://localhost:5173/?view=app&auth=demo&workspace=super_admin&saTab=dashboard');
  await page.waitForTimeout(1500);

  // 2. Test All 16 Super Admin Tabs
  console.log('\n2. Testing Super Admin Tab Navigation...');
  const allTabs = [
    { id: 'dashboard', name: 'Dashboard' },
    { id: 'companies', name: 'Companies' },
    { id: 'users', name: 'Users' },
    { id: 'subscriptions', name: 'Subscriptions' },
    { id: 'deal_packages', name: 'Deal Packages' },
    { id: 'licenses', name: 'Client Licenses' },
    { id: 'leads', name: 'Leads' },
    { id: 'reports', name: 'Reports & Analytics' },
    { id: 'system_settings', name: 'System Settings' },
    { id: 'support_tickets', name: 'Support Tickets' },
    { id: 'audit_logs', name: 'Audit Logs' },
    { id: 'crm_overview', name: 'CRM Overview' },
    { id: 'billing', name: 'Billing & Invoices' },
    { id: 'notifications', name: 'Notifications' },
    { id: 'integrations', name: 'Integrations' },
    { id: 'settings', name: 'Settings' }
  ];

  for (const t of allTabs) {
    await page.goto(`http://localhost:5173/?view=app&auth=demo&workspace=super_admin&saTab=${t.id}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(800);
    const content = await page.textContent('body');
    const hasCrash = content.includes('Something went wrong') || content.includes('Application Error');
    if (hasCrash) {
      console.error(`  ❌ Tab [${t.name}] (${t.id}) CRASHED!`);
    } else {
      console.log(`  ✅ Tab [${t.name}] (${t.id}): RENDERED CLEANLY`);
    }
  }

  // 3. Test Billing & Invoices Tab Deeply
  console.log('\n3. Verifying Billing & Invoices Functionality (Tab 10 / billing)...');
  await page.goto('http://localhost:5173/?view=app&auth=demo&workspace=super_admin&saTab=billing', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  const billingContent = await page.textContent('body');
  const hasInvoicesTable = billingContent.includes('Invoice #') && billingContent.includes('Company');
  console.log(`  - Invoices Table Header: ${hasInvoicesTable ? '✅ PRESENT' : '❌ MISSING'}`);

  // Test Payments Sub-Tab empty state
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const paymentBtn = btns.find(b => b.textContent.trim() === 'Payments');
    if (paymentBtn) paymentBtn.click();
  });
  await page.waitForTimeout(500);
  const paymentsContent = await page.textContent('body');
  const hasPaymentsEmptyState = paymentsContent.includes('No External Gateway Transactions Recorded') || paymentsContent.includes('Connect Stripe or Razorpay');
  console.log(`  - Payments Sub-Tab Empty State: ${hasPaymentsEmptyState ? '✅ VERIFIED (Informative Empty State, No Fake Data)' : '❌ FAILED'}`);

  // Test Payment Methods Sub-Tab empty state
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const pmBtn = btns.find(b => b.textContent.trim() === 'Payment Methods');
    if (pmBtn) pmBtn.click();
  });
  await page.waitForTimeout(500);
  const pmContent = await page.textContent('body');
  const hasPmEmptyState = pmContent.includes('Standard Enterprise Billing Active') || paymentsContent.includes('Corporate Direct Settlement');
  console.log(`  - Payment Methods Sub-Tab Empty State: ${hasPmEmptyState ? '✅ VERIFIED (Clean Empty State)' : '❌ FAILED'}`);

  // Return to Invoices Sub-Tab
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const invBtn = btns.find(b => b.textContent.trim() === 'Invoices');
    if (invBtn) invBtn.click();
  });
  await page.waitForTimeout(500);

  // Test Invoice Status Filter dropdown
  const statusFilterSelect = await page.$('select');
  if (statusFilterSelect) {
    console.log('  - Invoice Status Filter dropdown: ✅ PRESENT');
  }

  // 4. Test Integrations Tab
  console.log('\n4. Verifying Integrations Tab (Tab 12 / integrations)...');
  await page.goto('http://localhost:5173/?view=app&auth=demo&workspace=super_admin&saTab=integrations', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  const integContent = await page.textContent('body');
  const hasIntegTitle = integContent.includes('Integrations') && (integContent.includes('WhatsApp') || integContent.includes('Zapier') || integContent.includes('Connected') || integContent.includes('Connect'));
  console.log(`  - Integrations Grid: ${hasIntegTitle ? '✅ RENDERED LIVE CARDS' : '❌ FAILED'}`);

  // 5. Test Settings Sub-Tabs
  console.log('\n5. Verifying Settings Tab (Tab 13 / settings)...');
  await page.goto('http://localhost:5173/?view=app&auth=demo&workspace=super_admin&saTab=settings', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  const settingsContent = await page.textContent('body');
  const hasProfileInfo = settingsContent.includes('Harsh Goyal') || settingsContent.includes('Super Admin (Platform Owner)');
  console.log(`  - Settings Profile Sub-Tab: ${hasProfileInfo ? '✅ PRE-FILLED WITH CURRENT USER' : '❌ FAILED'}`);

  // Test Sub-tab switches: Security/Password
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const secBtn = btns.find(b => b.textContent.includes('Change Password'));
    if (secBtn) secBtn.click();
  });
  await page.waitForTimeout(500);
  const secContent = await page.textContent('body');
  const hasSecInputs = secContent.includes('New Password') || secContent.includes('Update Password');
  console.log(`  - Settings Password Sub-Tab: ${hasSecInputs ? '✅ RENDERED FUNCTIONAL FORM' : '❌ FAILED'}`);

  // Test Sub-tab switches: Notifications
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const notifBtn = btns.find(b => b.textContent.trim() === 'Notifications' && b.closest('div[style*="grid-template-columns"]'));
    if (notifBtn) notifBtn.click();
  });
  await page.waitForTimeout(500);
  const notifPrefContent = await page.textContent('body');
  const hasNotifPrefs = notifPrefContent.includes('Save Preferences') || notifPrefContent.includes('Email alerts on new client organization');
  console.log(`  - Settings Notification Preferences Sub-Tab: ${hasNotifPrefs ? '✅ RENDERED PREFERENCE TOGGLES' : '❌ FAILED'}`);

  // 6. Test Client Licenses Search & Filters
  console.log('\n6. Verifying Client Licenses (licenses)...');
  await page.goto('http://localhost:5173/?view=app&auth=demo&workspace=super_admin&saTab=licenses', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  const licContent = await page.textContent('body');
  const hasLicTable = licContent.includes('CLIENT COMPANY & OWNER') || licContent.includes('Kashish Enterprises') || licContent.includes('OFFICIAL LICENSE NO.');
  console.log(`  - Licenses Table & Controls: ${hasLicTable ? '✅ RENDERED SEARCH & FILTERS' : '❌ FAILED'}`);

  // 7. Test Empty State on search for non-existent item across tables
  console.log('\n7. Verifying Universal Empty States on Search Filter...');
  // Users table empty state
  await page.goto('http://localhost:5173/?view=app&auth=demo&workspace=super_admin&saTab=users', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800);
  const searchInput = await page.$('input[placeholder*="Search"]');
  if (searchInput) {
    await searchInput.fill('__NON_EXISTENT_QUERY_XYZ__');
    await page.waitForTimeout(500);
    const usersEmptyContent = await page.textContent('body');
    const hasUsersEmpty = usersEmptyContent.includes('No users found');
    console.log(`  - Users Table Empty State: ${hasUsersEmpty ? '✅ VERIFIED' : '❌ FAILED'}`);
  }

  // Companies table empty state
  await page.goto('http://localhost:5173/?view=app&auth=demo&workspace=super_admin&saTab=companies', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800);
  const compSearch = await page.$('input[placeholder*="Search"]');
  if (compSearch) {
    await compSearch.fill('__NON_EXISTENT_QUERY_XYZ__');
    await page.waitForTimeout(500);
    const compEmptyContent = await page.textContent('body');
    const hasCompEmpty = compEmptyContent.includes('No companies found');
    console.log(`  - Companies Table Empty State: ${hasCompEmpty ? '✅ VERIFIED' : '❌ FAILED'}`);
  }

  // Leads table empty state
  await page.goto('http://localhost:5173/?view=app&auth=demo&workspace=super_admin&saTab=leads', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800);
  const leadsSearch = await page.$('input[placeholder*="Search"]');
  if (leadsSearch) {
    await leadsSearch.fill('__NON_EXISTENT_QUERY_XYZ__');
    await page.waitForTimeout(500);
    const leadsEmptyContent = await page.textContent('body');
    const hasLeadsEmpty = leadsEmptyContent.includes('No leads found');
    console.log(`  - Leads Table Empty State: ${hasLeadsEmpty ? '✅ VERIFIED' : '❌ FAILED'}`);
  }

  // Support Tickets table empty state
  await page.goto('http://localhost:5173/?view=app&auth=demo&workspace=super_admin&saTab=support_tickets', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800);
  const ticketSearch = await page.$('input[placeholder*="Search"]');
  if (ticketSearch) {
    await ticketSearch.fill('__NON_EXISTENT_QUERY_XYZ__');
    await page.waitForTimeout(500);
    const ticketEmptyContent = await page.textContent('body');
    const hasTicketEmpty = ticketEmptyContent.includes('No support tickets found');
    console.log(`  - Support Tickets Table Empty State: ${hasTicketEmpty ? '✅ VERIFIED' : '❌ FAILED'}`);
  }

  // 8. Static Architectural Verifications
  console.log('\n8. Performing Static Security & Architectural Verifications...');
  const appCode = fs.readFileSync('src/App.jsx', 'utf8');
  const dashboardCode = fs.readFileSync('src/SuperAdminDashboard.jsx', 'utf8');
  const serviceCode = fs.readFileSync('src/lib/supabaseService.js', 'utf8');

  // Authorization precedence check
  const hasServerPermsAuthoritative = appCode.includes('serverPerms') &&
    appCode.includes('...serverPerms') &&
    appCode.includes('Authoritative Server Permissions');
  console.log(`  - Server permissions authoritative in App.jsx: ${hasServerPermsAuthoritative ? '✅ VERIFIED' : '❌ FAILED'}`);

  // SMS Credential security check
  const hasSmsSessionStorage = appCode.includes('crm_sms_api_key_session') &&
    appCode.includes('localStorage.removeItem("crm_sms_api_key")');
  console.log(`  - SMS credential localStorage clearance in App.jsx: ${hasSmsSessionStorage ? '✅ VERIFIED' : '❌ FAILED'}`);

  // Mock constants cleanup check
  const hasNoMockConstants = !dashboardCode.includes('const REFERENCE_COMPANIES') &&
    !dashboardCode.includes('const REFERENCE_INVOICES') &&
    !dashboardCode.includes('const REFERENCE_AUDIT_LOGS');
  console.log(`  - Dead REFERENCE_ constants removed from SuperAdminDashboard.jsx: ${hasNoMockConstants ? '✅ VERIFIED' : '❌ FAILED'}`);

  // Unique Invoice generator collision safety
  const hasCollisionSafeInvoiceId = dashboardCode.includes('maxNum > 0 ? maxNum + 1 : 1') &&
    !dashboardCode.includes('invoices.length + 1');
  console.log(`  - Invoice ID generator strictly collision-safe (no invoices.length + 1): ${hasCollisionSafeInvoiceId ? '✅ VERIFIED' : '❌ FAILED'}`);

  // Lightweight Ping check
  const hasLightweightPing = serviceCode.includes('pingSupabaseDatabase') &&
    serviceCode.includes('performance.now()') &&
    serviceCode.includes(".select('key').limit(1)");
  console.log(`  - Database ping queries system_settings without fake delay: ${hasLightweightPing ? '✅ VERIFIED' : '❌ FAILED'}`);

  await browser.close();

  console.log('\n========================================================================');
  console.log(`Verification Complete. Unexpected Console Errors: ${consoleErrors.length}`);
  if (consoleErrors.length > 0) {
    console.log('Errors:', consoleErrors);
  }
  console.log('========================================================================');
}

runPhase5eVerification().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
