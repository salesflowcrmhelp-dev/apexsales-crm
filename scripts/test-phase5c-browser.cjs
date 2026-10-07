const { chromium } = require('playwright');

async function testNotificationsAndAuditTabs() {
  console.log('========================================================================');
  console.log('🖥️ TESTING NOTIFICATIONS & AUDIT LOGS IN SUPER ADMIN DASHBOARD');
  console.log('========================================================================\n');

  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  });
  const context = await browser.newContext();
  const page = await context.newPage();

  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  page.on('pageerror', err => {
    consoleErrors.push(err.message);
  });

  // Navigate to local dev server
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

  // Test Tab 11: Notifications
  console.log('Testing Tab 11: Notifications (?workspace=super_admin&saTab=notifications)...');
  await page.goto('http://localhost:5173/?workspace=super_admin&saTab=notifications', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  const notifHeader = await page.locator('text=Stay updated with important alerts and activities').first().isVisible();
  console.log(`  - Notifications header visible: ${notifHeader ? '✅ YES' : '❌ NO'}`);

  const allFilterBtn = await page.locator('text=All (5)').first().isVisible();
  console.log(`  - "All (5)" filter button visible: ${allFilterBtn ? '✅ YES' : '❌ NO'}`);

  const item1Visible = await page.locator('text=Payment received').first().isVisible();
  console.log(`  - Notification "Payment received" visible: ${item1Visible ? '✅ YES' : '❌ NO'}`);

  const item5Visible = await page.locator('text=New support ticket').first().isVisible();
  console.log(`  - Notification "New support ticket" visible: ${item5Visible ? '✅ YES' : '❌ NO'}`);

  // Test Tab 8: Audit Logs
  console.log('\nTesting Tab 8: Audit Logs (?workspace=super_admin&saTab=audit_logs)...');
  await page.goto('http://localhost:5173/?workspace=super_admin&saTab=audit_logs', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  const auditHeader = await page.locator('text=Track administrative actions').first().isVisible();
  console.log(`  - Audit Logs header visible: ${auditHeader ? '✅ YES' : '❌ NO'}`);

  console.log('\nConsole Errors:', consoleErrors.length === 0 ? '✅ None' : consoleErrors);

  await browser.close();
  console.log('\n========================================================================');
  console.log('UI VERIFICATION COMPLETED');
  console.log('========================================================================');
}

testNotificationsAndAuditTabs().catch(err => {
  console.error('Error running browser test:', err);
});
