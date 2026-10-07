const fs = require('fs');

const content = fs.readFileSync('src/SuperAdminDashboard.jsx', 'utf8');

console.log('====================================================');
console.log('🔍 PHASE 6 STEP 6: UI & TYPOGRAPHY POLISH AUDIT');
console.log('====================================================\n');

// 1. Font Weights
console.log('1. FONT WEIGHTS USAGE IN SuperAdminDashboard.jsx:');
const weights = ['850', '750', '800', '700', '650', '600', '500', '400', 'bold'];
weights.forEach(w => {
  const re = new RegExp('fontWeight:\\s*[\'"]?' + w + '[\'"]?', 'g');
  const count = (content.match(re) || []).length;
  console.log(`  - fontWeight '${w}': ${count} occurrences`);
});

// 2. Heading Sizes
console.log('\n2. HEADING TAGS & SIZES:');
const hMatches = content.match(/<h[1-6][^>]*>/g) || [];
console.log(`  - Total Heading Elements: ${hMatches.length}`);
const headingSizes = {};
hMatches.forEach(tag => {
  const sizeMatch = tag.match(/fontSize:\s*['"]?([0-9a-zA-Z.]+)['"]?/);
  const size = sizeMatch ? sizeMatch[1] : 'default';
  headingSizes[size] = (headingSizes[size] || 0) + 1;
});
Object.entries(headingSizes).forEach(([s, cnt]) => {
  console.log(`  - fontSize '${s}': ${cnt} headings`);
});

// 3. Tab Page Headers
console.log('\n3. TAB PAGE HEADERS (TITLE & SUBTITLE):');
const tabs = [
  'dashboard', 'companies', 'users', 'subscriptions', 'deal_packages',
  'licenses', 'leads', 'reports', 'system_settings', 'support_tickets',
  'audit_logs', 'crm_overview', 'billing', 'notifications', 'integrations', 'settings'
];

tabs.forEach(tab => {
  const tabIdx = content.indexOf(`activeTab === '${tab}'`) !== -1 ? content.indexOf(`activeTab === '${tab}'`) : content.indexOf(`activeTab === "${tab}"`);
  if (tabIdx !== -1) {
    const chunk = content.slice(tabIdx, tabIdx + 800);
    const titleMatch = chunk.match(/<h[1-3][^>]*>(.*?)<\/h[1-3]>/s);
    const pMatch = chunk.match(/<p[^>]*>(.*?)<\/p>/s);
    const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : 'N/A';
    const sub = pMatch ? pMatch[1].replace(/<[^>]+>/g, '').trim().slice(0, 50) + '...' : 'N/A';
    console.log(`  - Tab [${tab}]: Title="${title}"`);
  }
});

// 4. Table Header & Cell Typography
console.log('\n4. TABLE STYLING INCONSISTENCIES:');
const thMatches = content.match(/<th[^>]*style=\{\{([^}]+)\}\}/g) || [];
console.log(`  - Total <th> elements with inline styles: ${thMatches.length}`);

// 5. Button typography & paddings
const btnMatches = content.match(/<button[^>]*style=\{\{([^}]+)\}\}/g) || [];
console.log(`  - Total <button> elements with inline styles: ${btnMatches.length}`);

// 6. Non-standard paddings / margins
const spacingTokens = [
  '3px', '5px', '7px', '9px', '11px', '13px', '15px', '17px', '19px', '22px'
];
console.log('\n5. ODD / NON-STANDARD SPACING ARTIFACTS:');
spacingTokens.forEach(token => {
  const padRe = new RegExp('(padding|margin):\\s*[^;}]*' + token, 'g');
  const count = (content.match(padRe) || []).length;
  if (count > 0) {
    console.log(`  - Non-scale spacing '${token}': ${count} occurrences`);
  }
});
