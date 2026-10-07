import fs from 'fs';
const content = fs.readFileSync('src/SuperAdminDashboard.jsx', 'utf8');
const lines = content.split('\n');
lines.forEach((l, i) => {
  if (l.includes("activeTab === 'users'")) {
    console.log(i + 1, l);
    console.log(lines.slice(i, i + 80).join('\n'));
  }
});
