const fs = require('fs');

const code = fs.readFileSync('src/SuperAdminDashboard.jsx', 'utf8');
const lines = code.split('\n');

console.log('=== SEARCHING FOR TABS / NAVIGATION ===');
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.includes('activeTab ===') || line.includes("activeTab === '") || line.includes('activeTab === "')) {
    console.log(`Line ${i + 1}: ${line.trim()}`);
  }
}
