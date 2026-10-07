const { chromium } = require('playwright');

async function probe() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('console', msg => console.log('PAGE LOG:', msg.text()));

  await page.goto('http://localhost:5173/?view=app&auth=demo&workspace=super_admin&saTab=companies', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  const res = await page.evaluate(async () => {
    // Try to access the supabase client on window or window.__supabase
    const sb = window.supabase;
    return {
      hasWindowSupabase: Boolean(sb),
      authUser: sessionStorage.getItem('crm_auth_user')
    };
  });
  console.log('Page probe result:', res);

  await browser.close();
}
probe().catch(console.error);
