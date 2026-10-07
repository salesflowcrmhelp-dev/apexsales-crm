const fs = require('fs');

console.log('====================================================');
console.log('🔍 PHASE 6 STEP 7: MAIN CRM UI & TYPOGRAPHY AUDIT');
console.log('====================================================\n');

const files = [
  { name: 'App.jsx', path: 'src/App.jsx' },
  { name: 'SalesHeadDashboard.jsx', path: 'src/SalesHeadDashboard.jsx' },
  { name: 'TeamLeaderDashboard.jsx', path: 'src/TeamLeaderDashboard.jsx' },
  { name: 'index.css', path: 'src/index.css' }
];

// 1. Non-standard font weights in Main CRM files
console.log('1. NON-STANDARD FONT WEIGHTS (850, 750, 650):');
files.forEach(f => {
  const content = fs.readFileSync(f.path, 'utf8');
  const w850 = (content.match(/fontWeight:\s*['"]850['"]|font-weight:\s*850/g) || []).length;
  const w750 = (content.match(/fontWeight:\s*['"]750['"]|font-weight:\s*750/g) || []).length;
  const w650 = (content.match(/fontWeight:\s*['"]650['"]|font-weight:\s*650/g) || []).length;
  console.log(`  - [${f.name}]: 850=${w850}, 750=${w750}, 650=${w650}`);
});

// 2. Roles and Workspaces in App.jsx
console.log('\n2. WORKSPACES & VIEWS IN App.jsx:');
const appContent = fs.readFileSync('src/App.jsx', 'utf8');
const workspaceMatches = appContent.match(/workspace\s*===\s*['"]([^'"]+)['"]/g) || [];
const uniqueWorkspaces = [...new Set(workspaceMatches.map(m => m.replace(/workspace\s*===\s*['"]/, '').replace(/['"]/, '')))];
console.log('  Unique workspaces in App.jsx:', uniqueWorkspaces);

const roleMatches = appContent.match(/role\s*===\s*['"]([^'"]+)['"]/g) || [];
const uniqueRoles = [...new Set(roleMatches.map(m => m.replace(/role\s*===\s*['"]/, '').replace(/['"]/, '')))];
console.log('  Unique roles in App.jsx:', uniqueRoles);

// 3. Page title tags (h1, h2, h3) in SalesHeadDashboard and TeamLeaderDashboard
console.log('\n3. HEADINGS IN SalesHeadDashboard.jsx:');
const shContent = fs.readFileSync('src/SalesHeadDashboard.jsx', 'utf8');
const shHeadings = shContent.match(/<h[1-4][^>]*>[\s\S]*?<\/h[1-4]>/g) || [];
shHeadings.slice(0, 15).forEach(h => console.log('  - ' + h.replace(/\n\s*/g, ' ').slice(0, 90)));

console.log('\n4. HEADINGS IN TeamLeaderDashboard.jsx:');
const tlContent = fs.readFileSync('src/TeamLeaderDashboard.jsx', 'utf8');
const tlHeadings = tlContent.match(/<h[1-4][^>]*>[\s\S]*?<\/h[1-4]>/g) || [];
tlHeadings.slice(0, 15).forEach(h => console.log('  - ' + h.replace(/\n\s*/g, ' ').slice(0, 90)));
