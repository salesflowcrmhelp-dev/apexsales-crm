const fs = require('fs');

const appContent = fs.readFileSync('src/App.jsx', 'utf8');

// Find activeWorkspace, currentRole, userRole, workspace state definitions
const lines = appContent.split('\n');
const matches = [];
lines.forEach((l, idx) => {
  if (
    l.includes('const [activeTab') ||
    l.includes('const [activeRole') ||
    l.includes('const [currentRole') ||
    l.includes('const [userRole') ||
    l.includes('const [activeWorkspace') ||
    l.includes('const [activeView') ||
    l.includes('SalesHeadDashboard') ||
    l.includes('TeamLeaderDashboard')
  ) {
    matches.push((idx + 1) + ': ' + l.trim());
  }
});
matches.slice(0, 40).forEach(m => console.log(m));
