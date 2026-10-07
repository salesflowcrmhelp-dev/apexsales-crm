const { chromium } = require('playwright');

async function testSuperAdminDashboard() {
  console.log('========================================================================');
  console.log('🖥️ TESTING SUPER ADMIN DASHBOARD TABS (PHASE 5B)');
  console.log('========================================================================\n');

  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Monitor network requests and console
  const apiRequests = [];
  page.on('response', async res => {
    const url = res.url();
    if (['companies', 'company_plans', 'client_licenses', 'invoices'].some(t => url.includes(t))) {
      let body = '';
      try { body = await res.text(); } catch(e) {}
      apiRequests.push({ url: url.split('?')[0], status: res.status(), body: body.slice(0, 100) });
    }
  });

  page.on('console', msg => {
    if (msg.text().includes('RLS') || msg.text().includes('error') || msg.text().includes('violates')) {
      console.log('Browser console:', msg.text());
    }
  });

  // Navigate to app
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

  const tabsToTest = [
    { id: 'companies', name: 'Companies', checkText: 'ABC Pvt Ltd' },
    { id: 'subscriptions', name: 'Subscriptions', checkText: 'Subscription' },
    { id: 'billing', name: 'Billing / Invoices', checkText: 'INV-' },
    { id: 'deal_packages', name: 'Deal Packages (Phase 5A)', checkText: 'Plan' },
    { id: 'integrations', name: 'Integrations (Phase 5A)', checkText: 'Zoho' },
    { id: 'system_settings', name: 'System Settings (Phase 5A)', checkText: 'Settings' }
  ];

  for (const tab of tabsToTest) {
    console.log(`Testing tab: ${tab.name} (?workspace=super_admin&saTab=${tab.id})...`);
    await page.goto(`http://localhost:5173/?workspace=super_admin&saTab=${tab.id}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    const bodyText = await page.textContent('body');
    const hasHeader = bodyText.includes('Super Admin') || bodyText.includes('ApexSales');
    const hasContent = bodyText.includes(tab.checkText);
    console.log(`  - Page Loaded: ${hasHeader} | Expected Content ("${tab.checkText}"): ${hasContent}`);
  }

  console.log('\nCaptured API requests:');
  apiRequests.forEach(r => {
    console.log(`  - [${r.status}] ${r.url} => ${r.body}`);
  });

  await browser.close();
  console.log('\n========================================================================');
}

testSuperAdminDashboard().catch(err => console.error(err));
