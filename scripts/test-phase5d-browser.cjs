const { chromium } = require('playwright');

async function testPhase5dBrowser() {
  console.log('========================================================================');
  console.log('🖥️ TESTING CRM LEADS & SUPPORT TICKETS UI (PHASE 5D)');
  console.log('========================================================================\n');

  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  });
  const context = await browser.newContext();
  const page = await context.newPage();

  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error' && !msg.text().includes('favicon')) {
      consoleErrors.push(msg.text());
    }
  });

  // Set Super Admin session in storage
  await page.goto('http://localhost:5173/');
  await page.evaluate(() => {
    const adminUser = {
      id: 'usr_admin',
      name: 'Harsh Goyal',
      role: 'company_owner',
      email: 'harsh.accomation@gmail.com',
      active: true
    };
    localStorage.setItem('crm_auth_user', JSON.stringify(adminUser));
    localStorage.setItem('crm_auth_token', 'token_super_admin');
    sessionStorage.setItem('crm_auth_user', JSON.stringify(adminUser));
    sessionStorage.setItem('crm_auth_token', 'token_super_admin');
    localStorage.setItem('crm_active_workspace', 'super_admin');
  });

  // Test Super Admin Tabs
  const tabs = [
    { id: 'dashboard', name: 'Dashboard' },
    { id: 'companies', name: 'Companies' },
    { id: 'users', name: 'Users' },
    { id: 'leads', name: 'Leads' },
    { id: 'support_tickets', name: 'Support Tickets' },
    { id: 'reports', name: 'Reports' },
    { id: 'billing', name: 'Billing' },
    { id: 'settings', name: 'Settings' },
    { id: 'notifications', name: 'Notifications' },
    { id: 'audit_logs', name: 'Audit Logs' },
    { id: 'deal_packages', name: 'Deal Packages' },
    { id: 'integrations', name: 'Integrations' }
  ];

  for (const t of tabs) {
    console.log(`Navigating to tab: ${t.name}...`);
    await page.goto(`http://localhost:5173/?workspace=super_admin&saTab=${t.id}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    const content = await page.textContent('body');
    const hasCrash = content.includes('Something went wrong') || content.includes('Application Error');
    console.log(`  - Tab [${t.name}]: ${hasCrash ? '❌ CRASH DETECTED' : '✅ RENDERED OK'}`);
  }

  // Also test main pipeline app view
  console.log('\nNavigating to Main Pipeline Sheet View...');
  await page.goto('http://localhost:5173/?view=app&auth=demo&workspace=pipeline&pipelineView=sheet', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  const sheetContent = await page.textContent('body');
  const sheetOk = !sheetContent.includes('Something went wrong');
  console.log(`  - Pipeline Sheet: ${sheetOk ? '✅ RENDERED OK' : '❌ ERROR'}`);

  await browser.close();

  console.log('\n========================================================================');
  console.log(`Browser Test Complete. Console Errors: ${consoleErrors.length}`);
  console.log('========================================================================');
}

testPhase5dBrowser().catch(err => {
  console.error('Browser test failure:', err);
});
