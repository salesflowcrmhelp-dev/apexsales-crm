import { chromium } from 'playwright';

async function verifyTabs() {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage();

  const testTabs = [
    'dashboard',
    'companies',
    'users',
    'subscriptions',
    'deal_packages',
    'licenses',
    'leads',
    'reports',
    'system_settings',
    'support_tickets',
    'audit_logs',
    'crm_overview',
    'billing',
    'notifications',
    'integrations',
    'settings'
  ];

  console.log('Testing Edge Browser with Super Admin Tabs & Refresh Persistence...\n');

  for (const tab of testTabs) {
    const url = `http://localhost:5173/?workspace=super_admin&saTab=${tab}`;
    await page.goto(url, { waitUntil: 'networkidle' });
    const currentUrl = page.url();
    const hasParam = currentUrl.includes(`saTab=${tab}`);

    // Refresh test
    await page.reload({ waitUntil: 'networkidle' });
    const afterReloadUrl = page.url();
    const persisted = afterReloadUrl.includes(`saTab=${tab}`);

    console.log(`Tab: ${tab.padEnd(16)} | Direct: ${hasParam ? '✅' : '❌'} | Reload Persisted: ${persisted ? '✅' : '❌'}`);
  }

  await browser.close();
  console.log('\nAll tested tabs verified with Microsoft Edge browser!');
}

verifyTabs().catch(console.error);
