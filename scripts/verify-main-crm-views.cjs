const { chromium } = require('playwright');

async function testMainCrmViews() {
  console.log('====================================================');
  console.log('🚀 TESTING MAIN CRM ROLES, VIEWS & VIEWPORTS');
  console.log('====================================================\n');

  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  });

  const consoleErrors = [];
  const roles = [
    { role: 'sales_head', label: 'Sales Head' },
    { role: 'team_leader', label: 'Team Leader' },
    { role: 'sales_executive', label: 'Sales Executive' },
    { role: 'company_owner', label: 'Company Owner' }
  ];

  const views = [
    { name: 'Analytics Dashboard', query: 'workspace=pipeline&view=app&tab=analytics' },
    { name: 'Pipeline Spreadsheet', query: 'workspace=pipeline&view=app&tab=sheet' },
    { name: 'Split 360 Board', query: 'workspace=pipeline&view=app&tab=split' },
    { name: 'Deals Hub', query: 'workspace=pipeline&view=app&tab=deals' },
    { name: 'Kanban Board', query: 'workspace=pipeline&view=app&tab=kanban' },
    { name: 'Calendar', query: 'workspace=calendar&view=app' },
    { name: 'Reports', query: 'workspace=reports&view=app' },
    { name: 'Settings', query: 'workspace=settings&view=app' }
  ];

  const viewports = [
    { width: 1366, height: 768, label: '1366x768' },
    { width: 1440, height: 900, label: '1440x900' },
    { width: 1920, height: 1080, label: '1920x1080' }
  ];

  for (const vp of viewports) {
    console.log(`\n--- Testing Viewport: ${vp.label} ---`);
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const page = await context.newPage();

    page.on('console', msg => {
      const text = msg.text();
      if (msg.type() === 'error' && !text.includes('favicon') && !text.includes('401') && !text.includes('404')) {
        consoleErrors.push({ vp: vp.label, text });
        console.error('  [Browser Error]:', text);
      }
    });

    for (const r of roles) {
      console.log(`\n  Checking Role: ${r.label} on Dashboard...`);
      const url = `http://localhost:5173/?view=app&auth=demo&role=${r.role}`;
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(600);

      const bodyText = await page.textContent('body');
      const loaded = bodyText.length > 500 && !bodyText.includes('Something went wrong');
      console.log(`    - Dashboard Render: ${loaded ? '✅ PASS' : '❌ FAIL'}`);

      // Check title element
      const h1 = await page.$('h1');
      if (h1) {
        const titleText = await h1.textContent();
        const box = await h1.boundingBox();
        console.log(`    - Title: "${titleText.trim().slice(0, 40)}" (Rendered: ${box ? `${Math.round(box.width)}x${Math.round(box.height)}` : 'N/A'})`);
      }
    }

    // Test specific CRM core views on 1440x900
    if (vp.width === 1440) {
      console.log('\n  Checking Key CRM Workspaces...');
      for (const v of views) {
        const vUrl = `http://localhost:5173/?${v.query}&auth=demo`;
        await page.goto(vUrl, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(600);

        const vBody = await page.textContent('body');
        const vLoaded = vBody.length > 500 && !vBody.includes('Something went wrong');
        console.log(`    - [${v.name}]: ${vLoaded ? '✅ PASS' : '❌ FAIL'}`);
      }
    }

    await context.close();
  }

  await browser.close();

  console.log('\n====================================================');
  console.log(`TOTAL CONSOLE ERRORS RECORDED: ${consoleErrors.length}`);
  console.log('====================================================');
}

testMainCrmViews();
