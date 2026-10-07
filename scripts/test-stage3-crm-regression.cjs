const { chromium } = require('playwright');

async function testCrmRegression() {
  console.log('Testing CRM navigation regression with real browser...');
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  });
  const page = await browser.newPage();

  const crmUrls = [
    { name: 'CRM App Main', url: 'http://localhost:5173/?view=app&auth=demo' },
    { name: 'Super Admin Dashboard', url: 'http://localhost:5173/?view=app&auth=demo&workspace=super_admin&saTab=dashboard' },
    { name: 'Super Admin Companies', url: 'http://localhost:5173/?view=app&auth=demo&workspace=super_admin&saTab=companies' },
    { name: 'Super Admin Users', url: 'http://localhost:5173/?view=app&auth=demo&workspace=super_admin&saTab=users' },
    { name: 'Super Admin Reports', url: 'http://localhost:5173/?view=app&auth=demo&workspace=super_admin&saTab=reports' },
    { name: 'Super Admin Billing', url: 'http://localhost:5173/?view=app&auth=demo&workspace=super_admin&saTab=billing' },
    { name: 'Super Admin Settings', url: 'http://localhost:5173/?view=app&auth=demo&workspace=super_admin&saTab=settings' }
  ];

  for (const t of crmUrls) {
    await page.goto(t.url, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    const content = await page.textContent('body');
    const isLanding = content.includes('The High-Velocity Sales CRM');
    console.log(`  - ${t.name}: ${!isLanding ? '✅ Workspace Loaded (No landing redirect)' : '❌ Redirected to Landing'}`);
  }

  await browser.close();
  console.log('CRM regression tests completed.');
}

testCrmRegression();
