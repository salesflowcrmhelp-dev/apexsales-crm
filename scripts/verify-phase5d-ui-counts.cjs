const { chromium } = require('playwright');

async function verifyUiCounts() {
  console.log('========================================================================');
  console.log('🖥️ LIVE UI DATA & COMPONENT VERIFICATION (PHASE 5D)');
  console.log('========================================================================\n');

  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  });
  const context = await browser.newContext();
  const page = await context.newPage();

  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error' && !msg.text().includes('favicon')) {
      errors.push(msg.text());
    }
  });

  // Navigate to set session
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

  // 1. Leads Tab in Super Admin Dashboard
  console.log('--- 1. LEADS TAB IN SUPER ADMIN DASHBOARD ---');
  await page.goto('http://localhost:5173/?workspace=super_admin&saTab=leads', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);

  const leadsBody = await page.textContent('body');
  const hasLeadsHeader = leadsBody.includes('Lead') || leadsBody.includes('Pipelines');
  console.log(`  - Leads tab header found: ${hasLeadsHeader ? '✅ YES' : '❌ NO'}`);

  // Check if lead elements exist in table
  const leadRows = await page.locator('table tr, .lead-card, .crm-table-row').count();
  console.log(`  - Rendered lead row elements: ${leadRows > 0 ? '✅ ' + leadRows + ' elements' : '⚠️ None'}`);

  // 2. Support Tickets Tab in Super Admin Dashboard
  console.log('\n--- 2. SUPPORT TICKETS TAB IN SUPER ADMIN DASHBOARD ---');
  await page.goto('http://localhost:5173/?workspace=super_admin&saTab=support_tickets', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);

  const ticketsBody = await page.textContent('body');
  const hasTicketsHeader = ticketsBody.includes('Support Ticket') || ticketsBody.includes('Ticket');
  console.log(`  - Support tickets header found: ${hasTicketsHeader ? '✅ YES' : '❌ NO'}`);

  const hasSt001 = ticketsBody.includes('#ST-001') || ticketsBody.includes('ABC Pvt Ltd');
  const hasSt002 = ticketsBody.includes('#ST-002') || ticketsBody.includes('Sunrise Corp');
  console.log(`  - Ticket #ST-001 (ABC Pvt Ltd) rendered: ${hasSt001 ? '✅ YES' : '❌ NO'}`);
  console.log(`  - Ticket #ST-002 (Sunrise Corp) rendered: ${hasSt002 ? '✅ YES' : '❌ NO'}`);

  // 3. Pipeline Sheet View
  console.log('\n--- 3. MAIN CRM PIPELINE SHEET VIEW ---');
  await page.goto('http://localhost:5173/?view=app&auth=demo&workspace=pipeline&pipelineView=sheet', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  const sheetBody = await page.textContent('body');
  const sheetNoError = !sheetBody.includes('Something went wrong');
  console.log(`  - Main CRM Pipeline rendered without crash: ${sheetNoError ? '✅ YES' : '❌ NO'}`);

  await browser.close();

  console.log('\n========================================================================');
  console.log('UI Data Verification Finished. Console Errors:', errors.length);
  console.log('========================================================================');
}

verifyUiCounts().catch(err => console.error('UI verify error:', err));
