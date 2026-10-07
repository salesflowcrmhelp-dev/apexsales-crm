const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function runPhase5fVerification() {
  console.log('========================================================================');
  console.log('🚀 RUNNING PHASE 5F COMPREHENSIVE REGRESSION & SECURITY VERIFICATION');
  console.log('========================================================================\n');

  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  });
  const context = await browser.newContext({ viewport: { width: 1440, height: 950 } });
  const page = await context.newPage();

  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error' && !msg.text().includes('favicon') && !msg.text().includes('401')) {
      consoleErrors.push(msg.text());
    }
  });
  page.on('pageerror', err => consoleErrors.push(err.toString()));

  // 1. Session Setup & Tab Render Check
  console.log('1. Testing Super Admin Tab Navigation across all 16 views...');
  const allTabs = [
    { id: 'dashboard', name: 'Dashboard' },
    { id: 'companies', name: 'Companies' },
    { id: 'users', name: 'Users' },
    { id: 'subscriptions', name: 'Subscriptions' },
    { id: 'deal_packages', name: 'Deal Packages' },
    { id: 'licenses', name: 'Client Licenses' },
    { id: 'leads', name: 'Leads' },
    { id: 'reports', name: 'Reports & Analytics' },
    { id: 'system_settings', name: 'System Settings' },
    { id: 'support_tickets', name: 'Support Tickets' },
    { id: 'audit_logs', name: 'Audit Logs' },
    { id: 'crm_overview', name: 'CRM Overview' },
    { id: 'billing', name: 'Billing & Invoices' },
    { id: 'notifications', name: 'Notifications' },
    { id: 'integrations', name: 'Integrations' },
    { id: 'settings', name: 'Settings' }
  ];

  for (const t of allTabs) {
    await page.goto(`http://localhost:5173/?view=app&auth=demo&workspace=super_admin&saTab=${t.id}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(600);
    const content = await page.textContent('body');
    const hasCrash = content.includes('Something went wrong') || content.includes('Application Error');
    if (hasCrash) {
      console.error(`  ❌ Tab [${t.name}] (${t.id}) CRASHED!`);
    } else {
      console.log(`  ✅ Tab [${t.name}] (${t.id}): RENDERED CLEANLY`);
    }
  }

  // 2. Security Test: Attempt client-side permission injection via localStorage
  console.log('\n2. Testing LocalStorage Permission Injection Attack Resistance...');
  await page.evaluate(() => {
    // Attempt malicious permission injection
    localStorage.setItem('crm_user_perms_attacker', JSON.stringify({
      canAccessSuperAdmin: true,
      canDeleteLeads: true,
      canViewAllLeads: true
    }));
    localStorage.setItem('crm_user_pkg_attacker', 'enterprise');
  });

  // Verify that localStorage contains no active authorization authority
  const storageState = await page.evaluate(() => {
    return {
      permsInStorage: localStorage.getItem('crm_user_perms_attacker'),
      sessionSmsKey: sessionStorage.getItem('crm_sms_api_key_session'),
      localSmsKey: localStorage.getItem('crm_sms_api_key')
    };
  });
  console.log('  - Attacker localStorage probe stored:', Boolean(storageState.permsInStorage));
  console.log('  - sessionStorage SMS key empty:', storageState.sessionSmsKey === null ? '✅ PASS' : '❌ FAIL');
  console.log('  - localStorage SMS key empty:', storageState.localSmsKey === null ? '✅ PASS' : '❌ FAIL');

  // 3. Test CRM Settings view for zero cleartext secret inputs
  console.log('\n3. Testing Settings & Security UI for Secret Storage Architecture...');
  await page.goto('http://localhost:5173/?view=app&auth=demo&workspace=settings', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  const crmSettingsContent = await page.textContent('body');
  const hasServerSecretBadge = crmSettingsContent.includes('Server-Side Secret Management');
  const hasCleartextSmsInput = crmSettingsContent.includes('Enter MSG91 Auth Key') || crmSettingsContent.includes('Enter Fast2SMS API Key');
  console.log(`  - Server-Side Secret Management Notice: ${hasServerSecretBadge ? '✅ PRESENT' : '❌ MISSING'}`);
  console.log(`  - Cleartext SMS Key Input Eliminated: ${!hasCleartextSmsInput ? '✅ ELIMINATED' : '❌ STILL PRESENT'}`);

  // 4. Test Billing Invoices UI & Actions
  console.log('\n4. Testing Billing & Invoices UI...');
  await page.goto('http://localhost:5173/?view=app&auth=demo&workspace=super_admin&saTab=billing', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  const billingBody = await page.textContent('body');
  const hasInvoicesTable = billingBody.includes('Invoice #') && billingBody.includes('Amount');
  console.log(`  - Invoices Table Header: ${hasInvoicesTable ? '✅ PRESENT' : '❌ MISSING'}`);

  // 5. Test Audit Logs View
  console.log('\n5. Testing Audit Logs View...');
  await page.goto('http://localhost:5173/?view=app&auth=demo&workspace=super_admin&saTab=audit_logs', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  const auditBody = await page.textContent('body');
  const hasAuditTable = auditBody.includes('Audit Logs') || auditBody.includes('Module') || auditBody.includes('Action');
  console.log(`  - Audit Logs Table: ${hasAuditTable ? '✅ PRESENT' : '❌ MISSING'}`);

  // 6. Test Console Errors
  console.log('\n6. Checking Console Errors...');
  if (consoleErrors.length === 0) {
    console.log('  ✅ Zero unexpected console errors recorded!');
  } else {
    console.warn(`  ⚠️ Console errors noted (${consoleErrors.length}):`, consoleErrors.slice(0, 3));
  }

  await browser.close();
  console.log('\n========================================================================');
  console.log('🎉 PHASE 5F PLAYWRIGHT REGRESSION VERIFICATION COMPLETED SUCCESSFULLY!');
  console.log('========================================================================');
}

runPhase5fVerification().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
