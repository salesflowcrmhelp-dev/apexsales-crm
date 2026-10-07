const { chromium } = require('playwright');

async function testTabs() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  });
  const context = await browser.newContext();
  const page = await context.newPage();

  // 1. Leads Tab
  console.log('Testing Leads Tab (?view=app&auth=demo&workspace=super_admin&saTab=leads)...');
  await page.goto('http://localhost:5173/?view=app&auth=demo&workspace=super_admin&saTab=leads', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  const leadsText = await page.textContent('body');
  console.log('  - Leads Tab contains "Lead Management":', leadsText.includes('Lead Management'));
  console.log('  - Leads Tab contains "Total Leads":', leadsText.includes('Total Leads'));
  console.log('  - Leads Tab contains "+ Add Lead":', leadsText.includes('+ Add Lead'));

  // 2. Support Tickets Tab
  console.log('\nTesting Support Tickets Tab (?view=app&auth=demo&workspace=super_admin&saTab=support_tickets)...');
  await page.goto('http://localhost:5173/?view=app&auth=demo&workspace=super_admin&saTab=support_tickets', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  const ticketsText = await page.textContent('body');
  console.log('  - Tickets Tab contains "Support Tickets":', ticketsText.includes('Support Tickets'));
  console.log('  - Tickets Tab contains "#ST-001":', ticketsText.includes('#ST-001'));
  console.log('  - Tickets Tab contains "ABC Pvt Ltd":', ticketsText.includes('ABC Pvt Ltd'));
  console.log('  - Tickets Tab contains "Sunrise Corp":', ticketsText.includes('Sunrise Corp'));
  console.log('  - Tickets Tab contains "+ New Ticket":', ticketsText.includes('+ New Ticket'));

  await browser.close();
}

testTabs().catch(err => console.error(err));
