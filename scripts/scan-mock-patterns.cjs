const fs = require('fs');

const files = ['src/SuperAdminDashboard.jsx', 'src/lib/supabaseService.js'];
const patterns = [
  'tenant_kashish',
  'tenant_apexsales',
  'crm_user_perms_',
  'crm_user_pkg_',
  'service_role',
  'localStorage.getItem("crm_role")',
  'localStorage.getItem("userRole")'
];

console.log('====================================================');
console.log('MOCK & HARDCODED DATA SCANNER');
console.log('====================================================');

let totalMatches = 0;
patterns.forEach(pat => {
  let count = 0;
  files.forEach(f => {
    const c = fs.readFileSync(f, 'utf8');
    const matches = c.split(pat).length - 1;
    count += matches;
  });
  console.log(`${pat}: ${count} matches`);
  totalMatches += count;
});

console.log('====================================================');
console.log(`TOTAL DISALLOWED MOCK PATTERNS: ${totalMatches}`);
