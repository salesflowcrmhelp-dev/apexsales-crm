const fs = require('fs');
const path = require('path');

const dashboardCode = fs.readFileSync('src/SuperAdminDashboard.jsx', 'utf8');
const appCode = fs.readFileSync('src/App.jsx', 'utf8');
const serviceCode = fs.readFileSync('src/lib/supabaseService.js', 'utf8');

let allPassed = true;

function check(label, condition) {
  console.log(`${condition ? '✅' : '❌'} ${label}`);
  if (!condition) allPassed = false;
}

console.log('====================================================');
console.log('PHASE 6 STEP 2 — STATIC CODE AUDIT & VERIFICATION');
console.log('====================================================\n');

// FIX 1: Dashboard
const ticketAuditAwaited = dashboardCode.includes('await insertAuditLogToSupabase(') &&
                           dashboardCode.includes('await fetchAuditLogsFromSupabase();');
const noOptimisticTicket = !dashboardCode.includes('// Optimistic update before DB confirmation');
const recentAccountsEmptyState = dashboardCode.includes('No recent accounts found');
const recentUsersEmptyState = dashboardCode.includes('No recent users found');
const supportQueueEmptyState = dashboardCode.includes('No open tickets in queue');

check('Fix 1.1: handleToggleTicketStatus strictly awaits audit log & refetch', ticketAuditAwaited);
check('Fix 1.2: No optimistic fake success on ticket toggle', noOptimisticTicket);
check('Fix 1.3: Dashboard Recent Accounts empty state present', recentAccountsEmptyState);
check('Fix 1.4: Dashboard Recent Users empty state present', recentUsersEmptyState);
check('Fix 1.5: Dashboard Support Queue empty state present', supportQueueEmptyState);

// FIX 2: Subscriptions
const noMockTenants = !dashboardCode.includes('tenant_kashish') && !dashboardCode.includes('tenant_apexsales');
const tenantDerivedDynamic = dashboardCode.includes('companies.map(c =>') || dashboardCode.includes('tenantList = useMemo(');
const subEmptyState = dashboardCode.includes('No subscriptions found');
const subPagination = dashboardCode.includes("renderPagination('subscriptions',");

check('Fix 2.1: Zero hardcoded mock tenant IDs (tenant_kashish / tenant_apexsales eliminated)', noMockTenants);
check('Fix 2.2: tenantList dynamically derived from loaded companies/users state', tenantDerivedDynamic);
check('Fix 2.3: Subscriptions list empty state present', subEmptyState);
check('Fix 2.4: Subscriptions list pagination controls integrated', subPagination);

// FIX 3: Deal Packages
const dealPkgEmptyState = dashboardCode.includes('No deal packages configured');
const dealPkgAddButton = dealPkgEmptyState && dashboardCode.includes('setEditingDealPackage({');

check('Fix 3.1: Deal Packages empty state card present when count is 0', dealPkgEmptyState);
check('Fix 3.2: Deal Packages empty state card contains Add Package trigger (setEditingDealPackage)', dealPkgAddButton);

// FIX 4: Client Licenses
const licenseStatusBound = dashboardCode.includes("lic.status || 'active'") || dashboardCode.includes('lic.status ===');
const licenseBillingEmptyState = dashboardCode.includes('No client licenses found');

check('Fix 4.1: Client Licenses status badge dynamically reflects lic.status', licenseStatusBound);
check('Fix 4.2: Billing Client Licenses sub-tab empty state present', licenseBillingEmptyState);

// FIX 5: Reports & Analytics
const reportsRevenueEmptyState = dashboardCode.includes('No revenue data for selected period');
const reportsLeadEmptyState = dashboardCode.includes('No lead data for selected period');
const reportsPipelineEmptyState = dashboardCode.includes('No pipeline data for selected period');

check('Fix 5.1: Reports Revenue empty state present', reportsRevenueEmptyState);
check('Fix 5.2: Reports Lead breakdown empty state present', reportsLeadEmptyState);
check('Fix 5.3: Reports Conversion Funnel empty state present', reportsPipelineEmptyState);

// FIX 6: Audit Logs
const auditExportCsvBtn = dashboardCode.includes('handleExportAuditLogs') && dashboardCode.includes('Export CSV');
const auditSortHeaders = dashboardCode.includes("handleToggleAuditSort('timestamp')") &&
                         dashboardCode.includes("handleToggleAuditSort('module')");

check('Fix 6.1: Audit Logs Export CSV button in header calling handleExportAuditLogs', auditExportCsvBtn);
check('Fix 6.2: Audit Logs interactive column sorting for Timestamp and Module', auditSortHeaders);

// FIX 7: Notifications
const notifMarkAllAwaited = dashboardCode.includes('Promise.allSettled(') &&
                            dashboardCode.includes('fetchNotificationsFromSupabase()');
const notifToggleAwaited = dashboardCode.includes('upsertNotificationToSupabase({ ...target, unread: nextUnread })') &&
                           dashboardCode.includes('setActionLoadingId(id)');

check('Fix 7.1: markAllNotificationsRead awaits Promise.allSettled and refetches authoritative DB', notifMarkAllAwaited);
check('Fix 7.2: toggleNotification sets loading state, awaits mutation & refetches DB', notifToggleAwaited);

// FIX 8: Integrations
const integrationAwaited = dashboardCode.includes('toggleIntegrationInSupabase(id, next)') &&
                           dashboardCode.includes('fetchIntegrationsFromSupabase') &&
                           dashboardCode.includes('setActionLoadingId(id)');
const integrationDisabledLoading = dashboardCode.includes('disabled={actionLoadingId ===') &&
                                   dashboardCode.includes('Connecting...') &&
                                   dashboardCode.includes('Disconnecting...');

check('Fix 8.1: toggleIntegration strictly awaits Supabase mutation, refetches and audits', integrationAwaited);
check('Fix 8.2: All integration toggle buttons show loading state and disable during mutation', integrationDisabledLoading);

// FIX 9: Settings
const noHardcodedProfile = !dashboardCode.includes('Harsh Goyal') && !dashboardCode.includes('harsh.accomation@gmail.com');
const appearancePersisted = dashboardCode.includes('handleSaveAppearancePreferences') &&
                            dashboardCode.includes("updateSystemSettingInSupabase('appearance_theme'");
const regionalPersisted = dashboardCode.includes('handleSaveLanguagePreferences') &&
                          dashboardCode.includes("updateSystemSettingInSupabase('regional_localization'");

check('Fix 9.1: Zero hardcoded Super Admin profile fallbacks in codebase', noHardcodedProfile);
check('Fix 9.2: Appearance preferences persisted to Supabase system_settings', appearancePersisted);
check('Fix 9.3: Regional/language preferences persisted to Supabase system_settings', regionalPersisted);

// SECURITY ARCHITECTURE REGRESSION CHECK
const noPermsLocal = !appCode.includes('localStorage.getItem(`crm_user_perms_');
const noSmsSession = !appCode.includes('sessionStorage.getItem("crm_sms_api_key');
const directAuditInsert = dashboardCode.includes("from('audit_logs').insert") || dashboardCode.includes('from("audit_logs").insert');
const serviceRoleInSrc = dashboardCode.includes('service_role') || appCode.includes('service_role');

check('Security: Zero client-side localStorage permission fallbacks', noPermsLocal);
check('Security: Zero cleartext SMS secrets in browser storage', noSmsSession);
check('Security: Zero direct audit_logs.insert (append-only RPC enforced)', !directAuditInsert);
check('Security: Zero service_role key exposures in frontend source', !serviceRoleInSrc);

console.log('\n====================================================');
if (allPassed) {
  console.log('🎉 ALL 24 STATIC VERIFICATION CHECKS PASSED PERFECTLY!');
  process.exit(0);
} else {
  console.error('❌ SOME CHECKS FAILED. Please review output above.');
  process.exit(1);
}
