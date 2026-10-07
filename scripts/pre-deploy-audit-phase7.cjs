const { chromium } = require('playwright');

async function runPreDeployAudit() {
  console.log('====================================================');
  console.log('🔒 PHASE 7: PRODUCTION PRE-DEPLOY FINAL AUDIT');
  console.log('====================================================\n');

  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  });

  const consoleErrors = [];
  const network5xx = [];

  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  page.on('console', msg => {
    const text = msg.text();
    if (msg.type() === 'error' && !text.includes('favicon') && !text.includes('401') && !text.includes('404')) {
      consoleErrors.push(text);
      console.error('  [Browser Error]:', text);
    }
  });

  page.on('response', resp => {
    const status = resp.status();
    const url = resp.url();
    if (status >= 500) {
      network5xx.push({ status, url });
      console.error(`  [HTTP 5xx Server Error]: ${status} ${url}`);
    }
  });

  // 1. Roles & Dashboards Verification
  console.log('1. Checking Role Dashboards...');
  const roleChecks = [
    { role: 'sales_head', name: 'Sales Head Dashboard' },
    { role: 'team_leader', name: 'Team Leader Dashboard' },
    { role: 'sales_executive', name: 'Employee / Sales Executive Dashboard' },
    { role: 'company_owner', name: 'Company Owner Dashboard' }
  ];

  for (const rc of roleChecks) {
    await page.goto(`http://localhost:5173/?view=app&auth=demo&role=${rc.role}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(600);
    const content = await page.textContent('body');
    const ok = content.length > 500 && !content.includes('Something went wrong');
    console.log(`  - ${rc.name}: ${ok ? '✅ PASS' : '❌ FAIL'}`);
  }

  // 2. Critical Main CRM Workspaces
  console.log('\n2. Checking Critical Main CRM Features...');
  const crmFeatures = [
    { name: 'Pipeline Spreadsheet', url: 'http://localhost:5173/?workspace=pipeline&view=app&tab=sheet&auth=demo' },
    { name: 'Pipeline 360° (Split View)', url: 'http://localhost:5173/?workspace=pipeline&view=app&tab=split&auth=demo' },
    { name: 'Deals Hub', url: 'http://localhost:5173/?workspace=pipeline&view=app&tab=deals&auth=demo' },
    { name: 'Kanban Board', url: 'http://localhost:5173/?workspace=pipeline&view=app&tab=kanban&auth=demo' },
    { name: 'Unassigned Leads Queue', url: 'http://localhost:5173/?workspace=pipeline&view=app&tab=unassigned&auth=demo' },
    { name: 'Follow-ups & Calendar', url: 'http://localhost:5173/?workspace=calendar&view=app&auth=demo' },
    { name: 'Audit & Reports', url: 'http://localhost:5173/?workspace=reports&view=app&auth=demo' },
    { name: 'System Settings', url: 'http://localhost:5173/?workspace=settings&view=app&auth=demo' }
  ];

  for (const feat of crmFeatures) {
    await page.goto(feat.url, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(600);
    const content = await page.textContent('body');
    const ok = content.length > 500 && !content.includes('Something went wrong');
    console.log(`  - ${feat.name}: ${ok ? '✅ PASS' : '❌ FAIL'}`);
  }

  // 3. Super Admin Critical Workspaces
  console.log('\n3. Checking Super Admin Critical Features...');
  const saFeatures = [
    { name: 'Super Admin Dashboard', tab: 'dashboard' },
    { name: 'Companies Hub', tab: 'companies' },
    { name: 'User Management', tab: 'users' },
    { name: 'Subscriptions', tab: 'subscriptions' },
    { name: 'Deal Packages (Blocker Fix Check)', tab: 'deal_packages' },
    { name: 'Client Licenses', tab: 'licenses' },
    { name: 'Leads Hub', tab: 'leads' },
    { name: 'Reports & Analytics', tab: 'reports' },
    { name: 'System Settings', tab: 'system_settings' },
    { name: 'Support Tickets', tab: 'support_tickets' },
    { name: 'Audit Logs', tab: 'audit_logs' },
    { name: 'Billing & Invoices', tab: 'billing' },
    { name: 'Notifications', tab: 'notifications' },
    { name: 'Integrations', tab: 'integrations' }
  ];

  for (const saf of saFeatures) {
    await page.goto(`http://localhost:5173/?view=app&auth=demo&workspace=super_admin&saTab=${saf.tab}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(600);

    // Test page reload persistence
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(400);

    const content = await page.textContent('body');
    const ok = content.length > 500 && !content.includes('Something went wrong') && page.url().includes('super_admin');
    console.log(`  - Super Admin [${saf.name}]: ${ok ? '✅ PASS' : '❌ FAIL'}`);
  }

  await browser.close();

  console.log('\n====================================================');
  console.log(`TOTAL BROWSER CONSOLE ERRORS: ${consoleErrors.length}`);
  console.log(`TOTAL HTTP 5XX NETWORK ERRORS: ${network5xx.length}`);
  console.log('====================================================');

  return { consoleErrors, network5xx };
}

runPreDeployAudit();
