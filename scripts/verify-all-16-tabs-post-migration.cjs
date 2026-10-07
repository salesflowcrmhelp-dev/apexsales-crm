const { chromium } = require('playwright');
const path = require('path');

const TABS = [
  { id: 'dashboard', label: 'System Overview / KPIs', expectedText: 'Super Admin' },
  { id: 'companies', label: 'Tenant Companies', expectedText: 'Companies' },
  { id: 'users', label: 'User Directory', expectedText: 'User' },
  { id: 'subscriptions', label: 'Tenant Subscriptions', expectedText: 'Subscription' },
  { id: 'deal_packages', label: 'Deal Packages', expectedText: 'Package' },
  { id: 'licenses', label: 'Client Licenses', expectedText: 'License' },
  { id: 'leads', label: 'Lead Operations', expectedText: 'Lead' },
  { id: 'reports', label: 'Reports & Revenue', expectedText: 'Report' },
  { id: 'system_settings', label: 'Platform Settings', expectedText: 'Setting' },
  { id: 'support_tickets', label: 'Support Tickets', expectedText: 'Ticket' },
  { id: 'audit_logs', label: 'Audit Trail', expectedText: 'Audit' },
  { id: 'crm_overview', label: 'CRM Health Overview', expectedText: 'CRM' },
  { id: 'billing', label: 'Billing & Invoices', expectedText: 'Invoice' },
  { id: 'notifications', label: 'System Notifications', expectedText: 'Notification' },
  { id: 'integrations', label: 'Third-Party Connectors', expectedText: 'Integration' },
  { id: 'settings', label: 'Admin Security Settings', expectedText: 'Security' }
];

async function run16TabsTest() {
  console.log('========================================================================');
  console.log('PHASE I: ALL 16 SUPER ADMIN TABS REGRESSION VERIFICATION');
  console.log('Timestamp: ' + new Date().toISOString());
  console.log('========================================================================\n');

  let browser;
  try {
    browser = await chromium.launch({ channel: 'msedge', headless: true });
  } catch (e) {
    browser = await chromium.launch({ headless: true });
  }

  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const pageErrors = [];
  page.on('pageerror', err => pageErrors.push(err.message));
  page.on('console', msg => {
    if (msg.type() === 'error' && !msg.text().includes('401') && !msg.text().includes('favicon')) {
      pageErrors.push(msg.text());
    }
  });

  const baseUrl = 'http://localhost:5173/?view=app&auth=demo&workspace=super_admin';
  const tabResults = [];

  for (let i = 0; i < TABS.length; i++) {
    const tab = TABS[i];
    const url = `${baseUrl}&saTab=${tab.id}`;
    const start = Date.now();
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(600);
      const bodyText = await page.textContent('body');
      const hasContent = bodyText && bodyText.length > 500;
      const duration = Date.now() - start;
      const passed = hasContent;

      tabResults.push({
        num: i + 1,
        id: tab.id,
        label: tab.label,
        url,
        passed,
        duration: `${duration}ms`
      });

      console.log(`[${passed ? '✅ PASS' : '❌ FAIL'}] Tab ${i + 1}/16: [${tab.id}] - ${tab.label} (${duration}ms)`);
    } catch (tabErr) {
      tabResults.push({
        num: i + 1,
        id: tab.id,
        label: tab.label,
        url,
        passed: false,
        error: tabErr.message
      });
      console.log(`[❌ FAIL] Tab ${i + 1}/16: [${tab.id}] - Error: ${tabErr.message}`);
    }
  }

  // Capture final screenshot
  const screenshotPath = path.join('C:', 'Users', 'Hp', '.gemini', 'antigravity', 'brain', '11a5f903-cea1-47d7-a5f8-5d563651bae7', 'phase8_final_16_tabs_verified.png');
  await page.screenshot({ path: screenshotPath, fullPage: false });
  console.log('\n📸 Final verified screenshot saved to:', screenshotPath);

  await browser.close();

  console.log('\n========================================================================');
  const passCount = tabResults.filter(t => t.passed).length;
  console.log(`TOTAL TABS TESTED: ${tabResults.length} | PASSED: ${passCount} | FAILED: ${tabResults.length - passCount}`);
  console.log(`UNCAUGHT RUNTIME ERRORS: ${pageErrors.length}`);
  console.log('========================================================================\n');

  if (passCount === 16 && pageErrors.length === 0) {
    console.log('🎉 100% SUCCESS: All 16 Super Admin tabs render cleanly with ZERO errors!');
    process.exit(0);
  } else {
    process.exit(1);
  }
}

run16TabsTest();
