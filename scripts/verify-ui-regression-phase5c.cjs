const { chromium } = require('playwright');

async function testUiAndRegression() {
  console.log('========================================================================');
  console.log('🖥️ PHASE 5C: UI & REGRESSION VERIFICATION (BROWSER TEST)');
  console.log('========================================================================\n');

  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  });
  const page = await browser.newPage();

  const crmUrls = [
    { name: 'Super Admin Dashboard', tab: 'dashboard', checkText: 'Executive Control' },
    { name: 'Companies (Phase 5B)', tab: 'companies', checkText: 'Companies' },
    { name: 'Users', tab: 'users', checkText: 'User' },
    { name: 'Reports', tab: 'reports', checkText: 'Report' },
    { name: 'Billing / Invoices (Phase 5B)', tab: 'billing', checkText: 'Billing' },
    { name: 'Settings (Phase 5A)', tab: 'settings', checkText: 'Settings' },
    { name: 'Notifications (Phase 5C)', tab: 'notifications', checkText: 'Stay updated with important alerts' },
    { name: 'Audit Logs (Phase 5C)', tab: 'audit_logs', checkText: 'Audit' },
    { name: 'Deal Packages (Phase 5A)', tab: 'deal_packages', checkText: 'Deal' },
    { name: 'Integrations (Phase 5A)', tab: 'integrations', checkText: 'Integrations' }
  ];

  for (const t of crmUrls) {
    const url = `http://localhost:5173/?view=app&auth=demo&workspace=super_admin&saTab=${t.tab}`;
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    const content = await page.textContent('body');
    const hasExpected = content.includes(t.checkText);
    const hasLandingRedirect = content.includes('The High-Velocity Sales CRM');
    console.log(`  - [${hasExpected && !hasLandingRedirect ? 'PASS' : 'FAIL'}] ${t.name}: Content match = ${hasExpected}, No redirect = ${!hasLandingRedirect}`);
  }

  // Deep inspection on Notifications Tab
  console.log('\n--- Deep Inspection on Notifications UI ---');
  await page.goto('http://localhost:5173/?view=app&auth=demo&workspace=super_admin&saTab=notifications', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);

  const notifHeader = await page.locator('text=Stay updated with important alerts').first().isVisible();
  console.log(`  - Notifications header visible: ${notifHeader ? 'PASS' : 'FAIL'}`);

  const allBtn = await page.locator('text=All (').first().isVisible();
  console.log(`  - "All (...)" dynamic filter button visible: ${allBtn ? 'PASS' : 'FAIL'}`);

  const unreadBtn = await page.locator('text=Unread (').first().isVisible();
  console.log(`  - "Unread (...)" dynamic filter button visible: ${unreadBtn ? 'PASS' : 'FAIL'}`);

  const readBtn = await page.locator('text=Read (').first().isVisible();
  console.log(`  - "Read (...)" dynamic filter button visible: ${readBtn ? 'PASS' : 'FAIL'}`);

  const paymentCard = await page.locator('text=Payment received').first().isVisible();
  console.log(`  - Real notification card "Payment received" visible: ${paymentCard ? 'PASS' : 'FAIL'}`);

  const ticketCard = await page.locator('text=New support ticket').first().isVisible();
  console.log(`  - Real notification card "New support ticket" visible: ${ticketCard ? 'PASS' : 'FAIL'}`);

  await browser.close();
  console.log('\n========================================================================');
  console.log('UI & REGRESSION VERIFICATION COMPLETED');
  console.log('========================================================================');
}

testUiAndRegression().catch(err => {
  console.error('Browser test failed:', err);
});
