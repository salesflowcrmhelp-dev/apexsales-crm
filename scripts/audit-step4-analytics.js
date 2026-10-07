import fs from 'fs';

const content = fs.readFileSync('src/SuperAdminDashboard.jsx', 'utf8');
const lines = content.split('\n');

console.log('=== Step 4 Analytics Audit ===\n');

// 1. Find Tab Sections
lines.forEach((l, i) => {
  if (l.includes("activeTab === 'dashboard'") || 
      l.includes("activeTab === 'reports'") || 
      l.includes("activeTab === 'crm_overview'") ||
      l.includes("TAB 1:") ||
      l.includes("TAB 5:") ||
      l.includes("TAB 9:")) {
    console.log(`Line ${i + 1}: ${l.trim()}`);
  }
});
