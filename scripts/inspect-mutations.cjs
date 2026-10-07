const fs = require('fs');

const content = fs.readFileSync('src/lib/supabaseService.js', 'utf8');
const tables = [
  'companies',
  'leads',
  'support_tickets',
  'invoices',
  'notifications',
  'integrations',
  'audit_logs',
  'company_plans',
  'deal_packages',
  'client_licenses',
  'system_settings'
];

const lines = content.split('\n');

tables.forEach(t => {
  console.log('=== Table: ' + t + ' ===');
  lines.forEach((l, idx) => {
    if (l.includes(`.from('${t}')`) || l.includes(`.from("${t}")`)) {
      const slice = lines.slice(Math.max(0, idx - 2), Math.min(lines.length, idx + 8));
      const hasWrite = slice.some(s => s.includes('.insert') || s.includes('.update') || s.includes('.delete') || s.includes('.upsert'));
      if (hasWrite) {
        console.log(`  Around Line ${idx + 1}:`);
        slice.forEach((s, sIdx) => {
          const lNum = Math.max(0, idx - 2) + sIdx + 1;
          console.log(`    ${lNum}: ${s.trim()}`);
        });
      }
    }
  });
});
