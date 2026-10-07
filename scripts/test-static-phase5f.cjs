const fs = require('fs');
const path = require('path');

const appCode = fs.readFileSync('src/App.jsx', 'utf8');
const dashboardCode = fs.readFileSync('src/SuperAdminDashboard.jsx', 'utf8');
const serviceCode = fs.readFileSync('src/lib/supabaseService.js', 'utf8');

let allPassed = true;

function check(label, condition) {
  console.log(`${condition ? '✅' : '❌'} ${label}`);
  if (!condition) allPassed = false;
}

console.log('====================================================');
console.log('PHASE 5F STATIC SECURITY & ARCHITECTURE VERIFICATION');
console.log('====================================================\n');

// 1. Authorization Source Hardening
const noPermsGet = !appCode.includes('localStorage.getItem(`crm_user_perms_') && 
                    !appCode.includes('localStorage.getItem("crm_user_perms_');
const noPkgGet = !appCode.includes('localStorage.getItem(`crm_user_pkg_') && 
                  !appCode.includes('localStorage.getItem("crm_user_pkg_');
const noPermsSet = !appCode.includes('localStorage.setItem(`crm_user_perms_') && 
                    !appCode.includes('localStorage.setItem("crm_user_perms_');
const noPkgSet = !appCode.includes('localStorage.setItem(`crm_user_pkg_') && 
                  !appCode.includes('localStorage.setItem("crm_user_pkg_');
const hasPurge = appCode.includes('localStorage.removeItem(`crm_user_perms_') &&
                 appCode.includes('localStorage.removeItem(`crm_user_pkg_');

check('1.1 Zero localStorage permission reads (no getItem for perms)', noPermsGet);
check('1.2 Zero localStorage package reads (no getItem for pkg)', noPkgGet);
check('1.3 Zero localStorage permission writes (no setItem for perms)', noPermsSet);
check('1.4 Zero localStorage package writes (no setItem for pkg)', noPkgSet);
check('1.5 Proactive legacy client storage purge in place', hasPurge);

// 2. SMS Secret Storage Hardening
const noSmsKeyInSession = !appCode.includes('sessionStorage.setItem("crm_sms_api_key') &&
                          !appCode.includes('sessionStorage.getItem("crm_sms_api_key');
const noSmsKeyInLocal = !appCode.includes('localStorage.setItem("crm_sms_api_key') &&
                        !appCode.includes('localStorage.getItem("crm_sms_api_key');
const noMsg91InSession = !appCode.includes('sessionStorage.setItem("crm_msg91_template_id') &&
                         !appCode.includes('sessionStorage.getItem("crm_msg91_template_id');
const noMsg91InLocal = !appCode.includes('localStorage.setItem("crm_msg91_template_id') &&
                       !appCode.includes('localStorage.getItem("crm_msg91_template_id');
const noClientSmsSecretInOtp = !appCode.includes('apiKey: cleanKey') && !appCode.includes('fast2sms_key: smsApiKey');
const hasSmsPurge = appCode.includes('sessionStorage.removeItem("crm_sms_api_key_session")') &&
                    appCode.includes('localStorage.removeItem("crm_sms_api_key")');

check('2.1 Zero SMS key storage in sessionStorage', noSmsKeyInSession);
check('2.2 Zero SMS key storage in localStorage', noSmsKeyInLocal);
check('2.3 Zero MSG91 template storage in sessionStorage', noMsg91InSession);
check('2.4 Zero MSG91 template storage in localStorage', noMsg91InLocal);
check('2.5 handleSendOtp sends zero client-side secrets', noClientSmsSecretInOtp);
check('2.6 Proactive browser secret purge executed on startup', hasSmsPurge);

// 3. Invoice Mutation Consistency
const deleteHasConfirmation = dashboardCode.includes('window.confirm(`Are you sure you want to delete invoice');
const deleteAwaited = dashboardCode.includes('const res = await deleteInvoiceFromSupabase(invoiceId);');
const deleteErrorHandled = dashboardCode.includes('if (res && res.success === false)') &&
                           dashboardCode.includes('showToast(`Failed to delete invoice:');
const deleteRefetchesDb = dashboardCode.includes('await fetchInvoicesFromSupabase()');
const saveAwaited = dashboardCode.includes('const res = await upsertInvoiceToSupabase(invObj);') &&
                    dashboardCode.includes('if (res && res.success === false)');

check('3.1 Invoice delete requests explicit user confirmation', deleteHasConfirmation);
check('3.2 Invoice delete awaits Supabase mutation before UI change', deleteAwaited);
check('3.3 Invoice delete handles failure without removing invoice from UI', deleteErrorHandled);
check('3.4 Invoice delete refetches authoritative list from Supabase on success', deleteRefetchesDb);
check('3.5 Invoice create strictly awaits Supabase and handles failure', saveAwaited);

// 4. Audit Logging & Security Checks
let hasDirectAuditInsert = false;
let hasServiceRoleInSrc = false;

function scanDir(dir) {
  const files = fs.readdirSync(dir);
  for (const f of files) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) {
      if (f !== 'node_modules' && f !== '.git') scanDir(full);
    } else if (f.endsWith('.js') || f.endsWith('.jsx') || f.endsWith('.ts')) {
      const content = fs.readFileSync(full, 'utf8');
      if (content.includes("from('audit_logs').insert") || content.includes('from("audit_logs").insert')) {
        hasDirectAuditInsert = true;
      }
      if (content.includes('service_role') && !full.includes('test') && !full.includes('script')) {
        hasServiceRoleInSrc = true;
      }
    }
  }
}
scanDir('src');

const auditUsesRpc = serviceCode.includes("supabase.rpc('log_system_event'");

check('4.1 Zero direct audit_logs.insert in frontend source', !hasDirectAuditInsert);
check('4.2 Audit logs go strictly through log_system_event RPC', auditUsesRpc);
check('4.3 Zero service_role secret exposure in src/', !hasServiceRoleInSrc);

console.log('\n====================================================');
if (allPassed) {
  console.log('🎉 ALL PHASE 5F CHECKS PASSED PERFECTLY!');
} else {
  console.error('❌ SOME CHECKS FAILED!');
  process.exit(1);
}
