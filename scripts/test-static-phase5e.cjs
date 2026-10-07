const fs = require('fs');

const appCode = fs.readFileSync('src/App.jsx', 'utf8');
const dashboardCode = fs.readFileSync('src/SuperAdminDashboard.jsx', 'utf8');
const serviceCode = fs.readFileSync('src/lib/supabaseService.js', 'utf8');

const hasServerPerms = appCode.includes('serverPerms') && 
  appCode.includes('...serverPerms') && 
  appCode.includes('Authoritative Server Permissions');

const hasSms = appCode.includes('crm_sms_api_key_session') && 
  appCode.includes('localStorage.removeItem("crm_sms_api_key")');

const hasNoMocks = !dashboardCode.includes('const REFERENCE_COMPANIES') && 
  !dashboardCode.includes('const REFERENCE_INVOICES') &&
  !dashboardCode.includes('const REFERENCE_AUDIT_LOGS');

const hasSafeInv = dashboardCode.includes('maxNum > 0 ? maxNum + 1 : 1') && 
  !dashboardCode.includes('invoices.length + 1');

const hasLightPing = serviceCode.includes('pingSupabaseDatabase') && 
  serviceCode.includes('performance.now()') && 
  serviceCode.includes(".select('key').limit(1)");

console.log('1. Server Perms Authoritative:', hasServerPerms ? '✅ PASS' : '❌ FAIL');
console.log('2. SMS Session Storage & LS Cleanup:', hasSms ? '✅ PASS' : '❌ FAIL');
console.log('3. Mocks Cleaned (Zero REFERENCE_):', hasNoMocks ? '✅ PASS' : '❌ FAIL');
console.log('4. Safe Invoice ID Generator:', hasSafeInv ? '✅ PASS' : '❌ FAIL');
console.log('5. Lightweight DB Ping (Zero fake delay):', hasLightPing ? '✅ PASS' : '❌ FAIL');
