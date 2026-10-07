const fs = require('fs');

let code = fs.readFileSync('src/SuperAdminDashboard.jsx', 'utf8');

// 1. Replace artificial font weights with standard typographic scale weights
// 850 -> 700 (standard bold)
// 750 -> 600 (standard semibold)
// 650 -> 600 (standard semibold)
code = code.replace(/fontWeight:\s*['"]850['"]/g, "fontWeight: '700'");
code = code.replace(/fontWeight:\s*['"]750['"]/g, "fontWeight: '600'");
code = code.replace(/fontWeight:\s*['"]650['"]/g, "fontWeight: '600'");

// 2. Standardize tab page titles to consistent 24px and subtitles to 13.5px
// Dashboard
code = code.replace(
  /<h1 style=\{\{\s*fontSize:\s*['"]20px['"],\s*fontWeight:\s*['"]700['"],\s*color:\s*['"]#0f172a['"],\s*margin:\s*['"]0 0 3px 0['"],\s*letterSpacing:\s*['"]-0.3px['"]\s*\}\}>/,
  `<h1 style={{ fontSize: '24px', fontWeight: '700', color: '#0f172a', margin: '0 0 4px 0', letterSpacing: '-0.02em', lineHeight: '1.25' }}>`
);
code = code.replace(
  /<p style=\{\{\s*fontSize:\s*['"]13px['"],\s*color:\s*['"]#64748b['"],\s*margin:\s*0,\s*fontWeight:\s*['"]500['"]\s*\}\}>/,
  `<p style={{ fontSize: '13.5px', color: '#64748b', margin: 0, fontWeight: '400', lineHeight: '1.5' }}>`
);

// Other tab page titles (fontSize: '18px', fontWeight: '800' -> fontSize: '24px', fontWeight: '700')
const pageTitles = [
  'Company Management',
  'User Management',
  'Subscription Management &amp; Company Plans',
  'Deal Packages &amp; Pricing Tiers',
  'Lead Management',
  'Reports & Analytics',
  'System Settings',
  'Support Tickets',
  'Audit Logs',
  'CRM Overview',
  'Billing &amp; Invoices',
  'Notifications',
  'Integrations',
  'Settings'
];

pageTitles.forEach(title => {
  const re = new RegExp(`<h2 style=\\{\\{\\s*fontSize:\\s*['"]18px['"],\\s*fontWeight:\\s*['"]800['"],\\s*color:\\s*['"]#0f172a['"],\\s*margin:\\s*['"]0 0 4px 0['"]\\s*\\}\\}>\\s*${title}\\s*<\\/h2>`);
  code = code.replace(re, `<h2 style={{ fontSize: '24px', fontWeight: '700', color: '#0f172a', margin: '0 0 4px 0', letterSpacing: '-0.02em', lineHeight: '1.25' }}>${title}</h2>`);
});

// Deal Packages header icon title
code = code.replace(
  /<h2 style=\{\{\s*fontSize:\s*['"]18px['"],\s*fontWeight:\s*['"]800['"],\s*color:\s*['"]#0f172a['"],\s*margin:\s*['"]0 0 4px 0['"]\s*\}\}>\s*💼 Client CRM Sales Packages &amp; Pricing Plans\s*<\/h2>/,
  `<h2 style={{ fontSize: '24px', fontWeight: '700', color: '#0f172a', margin: '0 0 4px 0', letterSpacing: '-0.02em', lineHeight: '1.25' }}>💼 Client CRM Sales Packages &amp; Pricing Plans</h2>`
);

// Client Licenses header
code = code.replace(
  /<h2 style=\{\{\s*fontSize:\s*['"]18px['"],\s*fontWeight:\s*['"]800['"],\s*color:\s*['"]#0f172a['"],\s*margin:\s*0\s*\}\}>\s*📜 B2B Client Licensing &amp; Tax Invoicing Hub\s*<\/h2>/,
  `<h2 style={{ fontSize: '24px', fontWeight: '700', color: '#0f172a', margin: 0, letterSpacing: '-0.02em', lineHeight: '1.25' }}>📜 B2B Client Licensing &amp; Tax Invoicing Hub</h2>`
);

// Subtitles: fontSize: '12.5px' -> '13.5px' for tab headers
code = code.replace(
  /<p style=\{\{\s*fontSize:\s*['"]12.5px['"],\s*color:\s*['"]#64748b['"],\s*margin:\s*0\s*\}\}>/g,
  `<p style={{ fontSize: '13.5px', color: '#64748b', margin: 0, fontWeight: '400', lineHeight: '1.5' }}>`
);

// Header containers: marginBottom: '18px' -> '20px'
code = code.replace(
  /marginBottom:\s*['"]18px['"],\s*flexWrap:\s*['"]wrap['"],\s*gap:\s*['"]12px['"]/g,
  `marginBottom: '20px', flexWrap: 'wrap', gap: '12px'`
);

console.log('Changes prepared.');
const newW850 = (code.match(/fontWeight:\s*['"]850['"]/g) || []).length;
const newW750 = (code.match(/fontWeight:\s*['"]750['"]/g) || []).length;
const newW650 = (code.match(/fontWeight:\s*['"]650['"]/g) || []).length;
console.log('Remaining 850:', newW850);
console.log('Remaining 750:', newW750);
console.log('Remaining 650:', newW650);

const h2_24 = (code.match(/fontSize:\s*['"]24px['"]/g) || []).length;
console.log('24px page headings count:', h2_24);

fs.writeFileSync('src/SuperAdminDashboard.jsx', code, 'utf8');
console.log('Successfully written polished code to src/SuperAdminDashboard.jsx');
