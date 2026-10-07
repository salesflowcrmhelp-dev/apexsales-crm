const fs = require('fs');

const content = fs.readFileSync('src/SuperAdminDashboard.jsx', 'utf8');

const w850 = (content.match(/fontWeight:\s*['"]850['"]/g) || []).length;
const w750 = (content.match(/fontWeight:\s*['"]750['"]/g) || []).length;
const w650 = (content.match(/fontWeight:\s*['"]650['"]/g) || []).length;

console.log('w850 occurrences:', w850);
console.log('w750 occurrences:', w750);
console.log('w650 occurrences:', w650);

// Inspect all 16 page headers
const tabs = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'companies', label: 'Companies' },
  { key: 'users', label: 'Users' },
  { key: 'subscriptions', label: 'Subscriptions' },
  { key: 'deal_packages', label: 'Deal Packages' },
  { key: 'licenses', label: 'Client Licenses' },
  { key: 'leads', label: 'Leads' },
  { key: 'reports', label: 'Reports & Analytics' },
  { key: 'system_settings', label: 'System Settings' },
  { key: 'support_tickets', label: 'Support Tickets' },
  { key: 'audit_logs', label: 'Audit Logs' },
  { key: 'crm_overview', label: 'CRM Overview' },
  { key: 'billing', label: 'Billing & Invoices' },
  { key: 'notifications', label: 'Notifications' },
  { key: 'integrations', label: 'Integrations' },
  { key: 'settings', label: 'Settings' }
];

tabs.forEach(t => {
  const match = content.match(new RegExp(`activeTab === ['"]${t.key}['"][\\s\\S]{1,600}?<(h[1-3])[^>]*>([\\s\\S]*?)<\\/\\1>`, 'm'));
  if (match) {
    const fullTag = match[0].match(/<h[1-3][^>]*>[\s\S]*?<\/h[1-3]>/)[0];
    console.log(`\n[${t.key}]:\n  ${fullTag}`);
  } else {
    console.log(`\n[${t.key}]: NO HEADER FOUND`);
  }
});
