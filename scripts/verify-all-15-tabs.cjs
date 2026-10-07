const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const errors = [];
  page.on('pageerror', err => errors.push(err.message));
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  const baseUrl = 'http://localhost:5173/?view=app&auth=demo&workspace=super_admin';
  const tabs = [
    'dashboard', 'companies', 'users', 'subscriptions', 'deal_packages',
    'licenses', 'leads', 'reports', 'support_tickets', 'audit_logs',
    'crm_overview', 'billing', 'notifications', 'integrations', 'settings'
  ];

  console.log('Testing regression navigation across all 15 tabs...');
  for (const tab of tabs) {
    await page.goto(`${baseUrl}&saTab=${tab}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(600);
    console.log(`Tab: ${tab} - Loaded OK`);
  }

  await browser.close();
  const realErrors = errors.filter(e => !e.includes('401') && !e.includes('favicon'));
  console.log('Total non-401 errors:', realErrors.length);
  if (realErrors.length > 0) {
    console.log('Errors:', realErrors);
    process.exit(1);
  } else {
    console.log('✅ All 15 Super Admin tabs load cleanly with 0 React crashes!');
    process.exit(0);
  }
})();
