const { chromium } = require('playwright');
const path = require('path');
const artifactDir = 'C:\\Users\\Hp\\.gemini\\antigravity\\brain\\11a5f903-cea1-47d7-a5f8-5d563651bae7';

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 950 } });

  await page.goto('http://localhost:5173/?view=app&auth=demo&workspace=super_admin&saTab=settings', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // Click within the 2-column settings layout left menu
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const notifBtn = btns.find(b => b.textContent.trim() === 'Notifications' && b.closest('div[style*="grid-template-columns"]'));
    if (notifBtn) notifBtn.click();
  });
  await page.waitForTimeout(500);

  const shotPath = path.join(artifactDir, 'phase5e_verified_settings_notifications_subnav.png');
  await page.screenshot({ path: shotPath });
  console.log('Saved screenshot:', shotPath);
  await browser.close();
})();
