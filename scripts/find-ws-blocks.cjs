const fs = require('fs');

const appContent = fs.readFileSync('src/App.jsx', 'utf8');
const lines = appContent.split('\n');

lines.forEach((l, idx) => {
  if (l.includes('activeWorkspace === "reports"') || l.includes('activeWorkspace === "tasks"') || l.includes('activeWorkspace === "settings"')) {
    console.log((idx + 1) + ': ' + l.trim());
  }
});
