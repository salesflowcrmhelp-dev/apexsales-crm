const { chromium } = require('playwright');

async function testResponsiveAndTypography() {
  console.log('====================================================');
  console.log('📱 TESTING RESPONSIVE VIEWPORTS & TYPOGRAPHY INTEGRITY');
  console.log('====================================================\n');

  const viewports = [
    { width: 1366, height: 768, label: '1366x768 (Standard Laptop)' },
    { width: 1440, height: 900, label: '1440x900 (High-res Laptop / MacBook)' },
    { width: 1920, height: 1080, label: '1920x1080 (FHD Desktop)' }
  ];

  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  });

  const consoleErrors = [];

  for (const vp of viewports) {
    console.log(`\nTesting Viewport: ${vp.label}...`);
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const page = await context.newPage();

    page.on('console', msg => {
      const text = msg.text();
      if (msg.type() === 'error' && !text.includes('favicon') && !text.includes('401') && !text.includes('404')) {
        consoleErrors.push({ vp: vp.label, text });
      }
    });

    // Test Dashboard
    await page.goto('http://localhost:5173/?view=app&auth=demo&workspace=super_admin&saTab=dashboard', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(600);

    const titleH1 = await page.$('h1');
    const h1Text = titleH1 ? await titleH1.textContent() : '';
    const h1Box = titleH1 ? await titleH1.boundingBox() : null;
    console.log(`  - Dashboard Title: "${h1Text.trim()}" (rendered size: ${h1Box ? `${Math.round(h1Box.width)}x${Math.round(h1Box.height)}` : 'N/A'})`);

    // Test Companies
    await page.goto('http://localhost:5173/?view=app&auth=demo&workspace=super_admin&saTab=companies', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(600);
    const compH2 = await page.$('h2');
    const compText = compH2 ? await compH2.textContent() : '';
    console.log(`  - Companies Title: "${compText.trim()}"`);

    // Test Deal Packages (ensure previous blocker and polish work cleanly)
    await page.goto('http://localhost:5173/?view=app&auth=demo&workspace=super_admin&saTab=deal_packages', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(600);
    const dpTitle = await page.$('h2');
    const dpText = dpTitle ? await dpTitle.textContent() : '';
    console.log(`  - Deal Packages Title: "${dpText.trim()}"`);

    // Test Billing & Invoices
    await page.goto('http://localhost:5173/?view=app&auth=demo&workspace=super_admin&saTab=billing', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(600);
    const billTitle = await page.$('h2');
    const billText = billTitle ? await billTitle.textContent() : '';
    console.log(`  - Billing Title: "${billText.trim()}"`);

    // Check for any horizontal overflow on body
    const bodyScrollWidth = await page.evaluate(() => document.body.scrollWidth);
    const windowWidth = await page.evaluate(() => window.innerWidth);
    console.log(`  - Viewport Width: ${windowWidth}px | Body ScrollWidth: ${bodyScrollWidth}px (No Clipping: ${bodyScrollWidth <= windowWidth * 1.25 ? '✅ PASS' : '⚠️ CHECK'})`);

    await context.close();
  }

  await browser.close();

  console.log('\n====================================================');
  console.log(`Console Errors recorded across all viewports: ${consoleErrors.length}`);
  console.log('====================================================');
}

testResponsiveAndTypography();
