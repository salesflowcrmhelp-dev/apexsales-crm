const { chromium } = require('playwright');

async function testTeamMemberLogin() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  });
  const context = await browser.newContext();
  const page = await context.newPage();

  const targetResponses = [];
  page.on('response', async res => {
    const url = res.url();
    if (url.includes('deal_packages') || url.includes('system_settings') || url.includes('integrations')) {
      let body = '';
      try { body = await res.text(); } catch(e) {}
      targetResponses.push({ url, status: res.status(), body: body.slice(0, 150) });
    }
  });

  console.log('1. Navigating to login...');
  await page.goto('http://localhost:5173/?view=app&lock=true', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  console.log('2. Attempting login as kashish...');
  await page.locator('#login-email-input').fill('kashish');
  await page.locator('#login-password-input').fill('Admin@123');
  await page.locator('button[type="submit"]').click();
  await page.waitForTimeout(4000);

  const currentUrl = page.url();
  const text = await page.textContent('body');
  const loggedIn = text.includes('Kashish') || text.includes('Pipeline') || text.includes('Leads');

  console.log('Logged in successfully:', loggedIn);
  console.log('Target network requests captured:');
  targetResponses.forEach(r => {
    console.log(`  - [${r.status}] ${r.url.split('?')[0]} => ${r.body}`);
  });

  // Check localStorage for session tokens
  const storage = await page.evaluate(() => ({
    crm_auth_user: localStorage.getItem('crm_auth_user'),
    supabase_auth_token: Object.keys(localStorage).filter(k => k.includes('auth-token') || k.includes('sb-'))
  }));
  console.log('Storage info:', storage);

  await browser.close();
}

testTeamMemberLogin().catch(err => console.error(err));
