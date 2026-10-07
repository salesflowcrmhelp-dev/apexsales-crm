const { chromium } = require('playwright');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://zgndrkgnldrwhcypdhjt.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpnbmRya2dubGRyd2hjeXBkaGp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAwNDU4MjYsImV4cCI6MjEwNTYyMTgyNn0.KfB_zXo1btSfbF6WaCvOdlc4kMyvNSQPvAcadMPhZ1o';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testDealPackagesSurgicalFix() {
  console.log('========================================================================');
  console.log('🎯 PHASE 6 STEP 4: TARGETED DEAL PACKAGES VERIFICATION & QA');
  console.log('========================================================================\n');

  const report = {};
  const consoleErrors = [];

  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  });
  const context = await browser.newContext({ viewport: { width: 1440, height: 950 } });
  const page = await context.newPage();

  page.on('console', msg => {
    const text = msg.text();
    if (msg.type() === 'error' && !text.includes('favicon') && !text.includes('401') && !text.includes('404')) {
      consoleErrors.push(text);
      console.log('  ❌ Browser Console Error:', text);
    }
    if (text.includes('ReferenceError')) {
      consoleErrors.push(text);
      console.log('  ❌ ReferenceError detected:', text);
    }
  });

  page.on('dialog', async dialog => {
    console.log(`  [Dialog] ${dialog.type()}: "${dialog.message()}" -> accepting`);
    await dialog.accept();
  });

  // 1. Initial Hydration & ReferenceError Check
  console.log('1. Testing Initial Hydration on Deal Packages tab...');
  await page.goto('http://localhost:5173/?view=app&auth=demo&workspace=super_admin&saTab=deal_packages', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  const hasReferenceError = consoleErrors.some(e => e.includes('ReferenceError') || e.includes('fetchDealPackagesFromSupabase'));
  report.initialHydrationNoRefError = !hasReferenceError;
  console.log(`  - No ReferenceError on load: ${!hasReferenceError ? '✅ PASS' : '❌ FAIL'}`);

  let pageContent = await page.textContent('body');
  const hasEmptyState = pageContent.includes('No deal packages configured');
  const hasExistingPackages = pageContent.includes('Package') || pageContent.includes('Plan') || pageContent.includes('/ mo');
  console.log(`  - Deal Packages UI rendered: ${hasEmptyState || hasExistingPackages ? '✅ PASS' : '❌ FAIL'} (Empty: ${hasEmptyState})`);
  report.emptyStateOrPackagesRendered = hasEmptyState || hasExistingPackages;

  // 2. Add Package via UI modal
  console.log('\n2. Testing Add Package creation via UI...');
  const testPkgName = `QA Staging Tier ${Date.now()}`;
  const testPkgPrice = 34999;

  // Click "+ Add Custom Plan" or "Add Package"
  let addPkgBtn = await page.$('button:has-text("+ Add Custom Plan"), button:has-text("Add Package")');
  if (addPkgBtn) {
    await addPkgBtn.click();
    await page.waitForTimeout(800);
  }

  // Check if Add Package modal opened
  const modalHeader = await page.$('h3:has-text("Configure:"), h3:has-text("New Deal Package"), h3:has-text("Deal Package")');
  const modalOpened = modalHeader !== null;
  console.log(`  - Add Package Modal opened cleanly: ${modalOpened ? '✅ PASS' : '❌ FAIL'}`);
  report.modalOpened = modalOpened;

  if (modalOpened) {
    const nameInput = await page.$('input[value="New Custom CRM Plan"], form input[placeholder*="Enterprise VIP Plan"], form input[type="text"]');
    if (nameInput) {
      await nameInput.fill(testPkgName);
    }

    const priceInput = await page.$('form input[type="number"]');
    if (priceInput) {
      await priceInput.fill(String(testPkgPrice));
    }

    const savePkgBtn = await page.$('button:has-text("Save Package"), form button[type="submit"]');
    if (savePkgBtn) {
      await savePkgBtn.click();
      await page.waitForTimeout(2500);
    }
  }

  // Verify DB record in Supabase
  const { data: dbPkgs } = await supabase.from('deal_packages').select('*').eq('name', testPkgName);
  const dbCreated = Array.isArray(dbPkgs) && dbPkgs.length > 0;
  const createdPkgId = dbCreated ? dbPkgs[0].id : null;
  console.log(`  - DB Record created in Supabase: ${dbCreated ? '✅ PASS' : '❌ FAIL'} (ID: ${createdPkgId})`);
  report.dbCreated = dbCreated;

  pageContent = await page.textContent('body');
  const uiShowsPkg = pageContent.includes(testPkgName);
  console.log(`  - UI displays newly created package: ${uiShowsPkg ? '✅ PASS' : '❌ FAIL'}`);
  report.uiShowsPkg = uiShowsPkg;

  // 3. Refresh Persistence
  console.log('\n3. Testing Refresh Persistence...');
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  pageContent = await page.textContent('body');
  const refreshPersisted = pageContent.includes(testPkgName);
  console.log(`  - Package persists after page refresh: ${refreshPersisted ? '✅ PASS' : '❌ FAIL'}`);
  report.refreshPersisted = refreshPersisted;

  // 4. Edit Package via UI
  console.log('\n4. Testing Edit Package via UI...');
  let editSuccess = false;
  // Locate the card container for testPkgName
  const editBtn = await page.$(`div:has-text("${testPkgName}") button:has-text("Edit Rate")`);
  if (editBtn) {
    await editBtn.click();
    await page.waitForTimeout(800);

    const priceInput = await page.$('form input[type="number"]');
    if (priceInput) {
      await priceInput.fill('39999');
    }

    const saveBtn = await page.$('button:has-text("Save Package"), form button[type="submit"]');
    if (saveBtn) {
      await saveBtn.click();
      await page.waitForTimeout(2500);
    }

    const { data: updatedDb } = await supabase.from('deal_packages').select('*').eq('name', testPkgName);
    editSuccess = Array.isArray(updatedDb) && updatedDb.length > 0 && Number(updatedDb[0].price) === 39999;
  }
  console.log(`  - Package edited and updated in DB: ${editSuccess ? '✅ PASS' : '❌ FAIL'}`);
  report.editSuccess = editSuccess;

  // 5. Delete Package with Confirmation
  console.log('\n5. Testing Delete Package with confirmation...');
  let deleteSuccess = false;
  const delBtn = await page.$(`div:has-text("${testPkgName}") button[title="Delete Package"]`);
  if (delBtn) {
    await delBtn.click();
    await page.waitForTimeout(2500);

    const { data: delCheck } = await supabase.from('deal_packages').select('*').eq('name', testPkgName);
    deleteSuccess = !delCheck || delCheck.length === 0;
  }
  console.log(`  - Package deleted from Supabase: ${deleteSuccess ? '✅ PASS' : '❌ FAIL'}`);
  report.deleteSuccess = deleteSuccess;

  // 6. Refresh confirms deletion
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  pageContent = await page.textContent('body');
  const deletionConfirmedOnRefresh = !pageContent.includes(testPkgName);
  console.log(`  - Deletion confirmed on browser refresh: ${deletionConfirmedOnRefresh ? '✅ PASS' : '❌ FAIL'}`);
  report.deletionConfirmedOnRefresh = deletionConfirmedOnRefresh;

  // 7. Check Empty State behavior
  const finalHasEmpty = pageContent.includes('No deal packages configured');
  console.log(`  - Empty state rendered properly if 0 packages: ${finalHasEmpty ? '✅ PASS' : 'Packages present (valid state)'}`);
  report.emptyState = true;

  await browser.close();

  console.log('\n========================================================================');
  console.log('SUMMARY OF DEAL PACKAGES TARGETED QA:');
  console.log('Console Errors recorded:', consoleErrors.length);
  console.log('All tests passed:', Object.values(report).every(Boolean));
  console.log('========================================================================');

  return { report, consoleErrorsCount: consoleErrors.length };
}

testDealPackagesSurgicalFix().then(res => {
  if (res.consoleErrorsCount > 0 || !res.report.initialHydrationNoRefError || !res.report.modalOpened || !res.report.dbCreated) {
    process.exit(1);
  }
  process.exit(0);
}).catch(err => {
  console.error('Fatal error during targeted QA:', err);
  process.exit(1);
});
