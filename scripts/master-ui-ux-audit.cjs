const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const artifactDir = 'C:\\Users\\Hp\\.gemini\\antigravity\\brain\\11a5f903-cea1-47d7-a5f8-5d563651bae7';
const baseUrl = 'http://localhost:5173';

const viewports = [
  { name: 'desktop_1440', width: 1440, height: 900 },
  { name: 'laptop_1366', width: 1366, height: 768 },
  { name: 'tablet_768', width: 768, height: 1024 },
  { name: 'mobile_390', width: 390, height: 844 },
  { name: 'small_mobile_320', width: 320, height: 568 }
];

const superAdminTabs = [
  'dashboard',
  'companies',
  'users',
  'subscriptions',
  'deal_packages',
  'leads',
  'reports',
  'system_settings',
  'support_tickets',
  'audit_logs',
  'crm_overview',
  'licenses',
  'billing',
  'notifications',
  'integrations',
  'settings'
];

async function runMasterAudit() {
  console.log('========================================================================');
  console.log('🚀 APEXSALES - SALESFLOW HUB GLOBAL DESIGN SYSTEM & REGRESSION TEST');
  console.log('========================================================================\n');

  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  });

  const auditLog = {
    roles: {},
    superAdminTabs: {},
    viewports: {},
    consoleErrors: [],
    networkErrors: [],
    testSummary: { totalSuites: 25, passedSuites: 0, failedSuites: 0 }
  };

  async function createAuditedPage(width = 1440, height = 900) {
    const context = await browser.newContext({
      viewport: { width, height },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
    });
    const page = await context.newPage();

    page.on('console', msg => {
      const txt = msg.text();
      if (msg.type() === 'error' && !txt.includes('favicon') && !txt.includes('404 (Not Found)')) {
        auditLog.consoleErrors.push({ text: txt, url: page.url() });
      }
    });

    page.on('response', res => {
      if (res.status() >= 400 && !res.url().includes('favicon')) {
        auditLog.networkErrors.push({ url: res.url(), status: res.status() });
      }
    });

    return { page, context };
  }

  // Helper to extract computed font
  async function getComputedFonts(page) {
    return await page.evaluate(() => {
      const getF = (sel) => {
        const el = document.querySelector(sel);
        return el ? window.getComputedStyle(el).fontFamily : null;
      };
      return {
        body: getF('body'),
        heading: getF('h1, h2, h3, .tab-heading, .page-title'),
        button: getF('button'),
        input: getF('input, select, textarea'),
        table: getF('table, th, td'),
        sidebar: getF('.crm-app-shell aside, .sidebar-nav-item, nav')
      };
    });
  }

  function isInterFont(fontStr) {
    if (!fontStr) return true;
    const lower = fontStr.toLowerCase();
    return lower.includes('inter') && !lower.includes('plus jakarta');
  }

  // -------------------------------------------------------------------------
  // SUITES 1-4: ALL 4 ROLE AUDITS
  // -------------------------------------------------------------------------
  console.log('--- SUITE 1/25: ROLE 1: SALES EXECUTIVE ---');
  {
    const { page, context } = await createAuditedPage(1440, 900);
    const targetUrl = `${baseUrl}/?view=app&auth=demo&workspace=pipeline&pipelineView=sheet&simRole=sales_executive`;
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);

    const bodyText = await page.textContent('body');
    const hasLeads = bodyText.includes('Pipeline') || bodyText.includes('Leads');
    const hasCrownAdmin = await page.$('button[title*="Super Admin Dashboard"]');

    // Test unassigned queue redirect & URL sync
    await page.goto(`${baseUrl}/?view=app&auth=demo&workspace=pipeline&pipelineView=unassigned&simRole=sales_executive`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    const currentUrl = page.url();
    const redirectedFromUnassigned = !currentUrl.includes('pipelineView=unassigned');

    await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    const fonts = await getComputedFonts(page);
    const fontValid = isInterFont(fonts.body) && isInterFont(fonts.heading) && isInterFont(fonts.button);
    const deleteBtn = await page.$('button[title*="Delete Lead"], button:has-text("Delete Lead")');
    const deleteRestricted = !deleteBtn;

    const execScreenshot = path.join(artifactDir, 'audit_role_sales_executive.png');
    await page.screenshot({ path: execScreenshot, fullPage: false });

    const passed = hasLeads && !hasCrownAdmin && redirectedFromUnassigned && deleteRestricted && fontValid;
    auditLog.roles['sales_executive'] = { passed, hasLeads, noAdminAccess: !hasCrownAdmin, redirectedFromUnassigned, deleteRestricted, fonts };
    if (passed) auditLog.testSummary.passedSuites++; else auditLog.testSummary.failedSuites++;

    console.log(`  [Suite 1/25] Sales Executive: ${passed ? '✅ PASS' : '❌ FAIL'} | Font: ${fonts.body}`);
    await context.close();
  }

  console.log('\n--- SUITE 2/25: ROLE 2: TEAM LEADER ---');
  {
    const { page, context } = await createAuditedPage(1440, 900);
    const targetUrl = `${baseUrl}/?view=app&auth=demo&workspace=pipeline&pipelineView=analytics&simRole=team_leader`;
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);

    const bodyText = await page.textContent('body');
    const isTeamLeaderDash = bodyText.includes('Team Leader') || bodyText.includes('Team Performance');
    const hasCrownAdmin = await page.$('button[title*="Super Admin Dashboard"]');
    const fonts = await getComputedFonts(page);
    const fontValid = isInterFont(fonts.body) && isInterFont(fonts.heading);

    const tlScreenshot = path.join(artifactDir, 'audit_role_team_leader.png');
    await page.screenshot({ path: tlScreenshot, fullPage: false });

    const passed = isTeamLeaderDash && !hasCrownAdmin && fontValid;
    auditLog.roles['team_leader'] = { passed, isTeamLeaderDash, noAdminAccess: !hasCrownAdmin, fonts };
    if (passed) auditLog.testSummary.passedSuites++; else auditLog.testSummary.failedSuites++;

    console.log(`  [Suite 2/25] Team Leader: ${passed ? '✅ PASS' : '❌ FAIL'} | Font: ${fonts.body}`);
    await context.close();
  }

  console.log('\n--- SUITE 3/25: ROLE 3: SALES HEAD ---');
  {
    const { page, context } = await createAuditedPage(1440, 900);
    const targetUrl = `${baseUrl}/?view=app&auth=demo&workspace=pipeline&pipelineView=analytics&simRole=sales_head`;
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);

    const bodyText = await page.textContent('body');
    const isSalesHeadDash = bodyText.includes('Sales Head') || bodyText.includes('Revenue Intelligence');
    const hasCrownAdmin = await page.$('button[title*="Super Admin Dashboard"]');
    const fonts = await getComputedFonts(page);
    const fontValid = isInterFont(fonts.body) && isInterFont(fonts.heading);

    const shScreenshot = path.join(artifactDir, 'audit_role_sales_head.png');
    await page.screenshot({ path: shScreenshot, fullPage: false });

    const passed = isSalesHeadDash && !hasCrownAdmin && fontValid;
    auditLog.roles['sales_head'] = { passed, isSalesHeadDash, noAdminAccess: !hasCrownAdmin, fonts };
    if (passed) auditLog.testSummary.passedSuites++; else auditLog.testSummary.failedSuites++;

    console.log(`  [Suite 3/25] Sales Head: ${passed ? '✅ PASS' : '❌ FAIL'} | Font: ${fonts.body}`);
    await context.close();
  }

  console.log('\n--- SUITE 4/25: ROLE 4: SUPER ADMIN HUB ---');
  {
    const { page, context } = await createAuditedPage(1440, 900);
    const targetUrl = `${baseUrl}/?view=app&auth=demo&workspace=super_admin`;
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);

    const bodyText = await page.textContent('body');
    const isSuperAdminHub = bodyText.includes('Super Admin') || bodyText.includes('Tenant Companies') || bodyText.includes('SaaS');
    const fonts = await getComputedFonts(page);
    const fontValid = isInterFont(fonts.body) && isInterFont(fonts.heading);

    const saScreenshot = path.join(artifactDir, 'audit_role_super_admin_hub.png');
    await page.screenshot({ path: saScreenshot, fullPage: false });

    const passed = isSuperAdminHub && fontValid;
    auditLog.roles['super_admin_hub'] = { passed, isSuperAdminHub, fonts };
    if (passed) auditLog.testSummary.passedSuites++; else auditLog.testSummary.failedSuites++;

    console.log(`  [Suite 4/25] Super Admin Governance Hub: ${passed ? '✅ PASS' : '❌ FAIL'} | Font: ${fonts.body}`);
    await context.close();
  }

  // -------------------------------------------------------------------------
  // SUITES 5-20: SUPER ADMIN 16 TABS
  // -------------------------------------------------------------------------
  console.log('\n--- SUITES 5-20/25: SUPER ADMIN (16 TABS) ---');
  {
    const { page, context } = await createAuditedPage(1440, 900);

    for (let i = 0; i < superAdminTabs.length; i++) {
      const tab = superAdminTabs[i];
      const suiteIndex = 5 + i;
      const targetUrl = `${baseUrl}/?view=app&auth=demo&workspace=super_admin&saTab=${tab}`;
      await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1200);

      const bodyText = await page.textContent('body');
      const hasErrors = bodyText.includes('Something went wrong') || bodyText.includes('Error:');
      const fonts = await getComputedFonts(page);
      const fontValid = isInterFont(fonts.body) && isInterFont(fonts.heading);

      const tabScreenshot = path.join(artifactDir, `audit_sa_tab_${i+1}_${tab}.png`);
      await page.screenshot({ path: tabScreenshot, fullPage: false });

      const passed = !hasErrors && fontValid;
      auditLog.superAdminTabs[tab] = { index: i + 1, suiteIndex, passed, fonts, screenshot: tabScreenshot };
      if (passed) auditLog.testSummary.passedSuites++; else auditLog.testSummary.failedSuites++;

      console.log(`  [Suite ${suiteIndex}/25] Tab ${i+1}/16 (${tab}): ${passed ? '✅ PASS' : '❌ FAIL'} | Font: ${fonts.heading || fonts.body}`);
    }

    await context.close();
  }

  // -------------------------------------------------------------------------
  // SUITES 21-25: MULTI-VIEWPORT RESPONSIVE AUDIT (5 VIEWPORTS)
  // -------------------------------------------------------------------------
  console.log('\n--- SUITES 21-25/25: MULTI-VIEWPORT RESPONSIVE AUDIT (5 VIEWPORTS) ---');
  for (let i = 0; i < viewports.length; i++) {
    const vp = viewports[i];
    const suiteIndex = 21 + i;
    const { page, context } = await createAuditedPage(vp.width, vp.height);
    const targetUrl = `${baseUrl}/?view=app&auth=demo&workspace=pipeline&pipelineView=sheet`;
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);

    const overflowCheck = await page.evaluate(() => {
      const scrollWidth = document.documentElement.scrollWidth;
      const clientWidth = document.documentElement.clientWidth;
      return {
        scrollWidth,
        clientWidth,
        hasHorizontalOverflow: scrollWidth > clientWidth + 5
      };
    });

    const vpScreenshot = path.join(artifactDir, `audit_viewport_${vp.name}.png`);
    await page.screenshot({ path: vpScreenshot, fullPage: false });

    const passed = !overflowCheck.hasHorizontalOverflow;
    auditLog.viewports[vp.name] = {
      suiteIndex,
      width: vp.width,
      height: vp.height,
      passed,
      overflow: overflowCheck.hasHorizontalOverflow,
      scrollWidth: overflowCheck.scrollWidth,
      screenshot: vpScreenshot
    };
    if (passed) auditLog.testSummary.passedSuites++; else auditLog.testSummary.failedSuites++;

    console.log(`  [Suite ${suiteIndex}/25] Viewport ${vp.name} (${vp.width}x${vp.height}): ${passed ? '✅ PASS' : '❌ FAIL'} (Overflow: ${overflowCheck.hasHorizontalOverflow ? 'YES' : 'NONE'})`);
    await context.close();
  }

  // Total summary calculation
  console.log('\n========================================================================');
  console.log(`TOTAL SUITES EXECUTED: ${auditLog.testSummary.totalSuites}`);
  console.log(`TOTAL SUITES PASSED:   ${auditLog.testSummary.passedSuites}`);
  console.log(`TOTAL SUITES FAILED:   ${auditLog.testSummary.failedSuites}`);
  console.log(`PASS RATE:            ${Math.round((auditLog.testSummary.passedSuites / auditLog.testSummary.totalSuites) * 100)}%`);
  console.log('========================================================================\n');

  fs.writeFileSync('scripts/master_audit_results.json', JSON.stringify(auditLog, null, 2));
  await browser.close();
}

runMasterAudit().catch(err => {
  console.error('Fatal audit error:', err);
  process.exit(1);
});
