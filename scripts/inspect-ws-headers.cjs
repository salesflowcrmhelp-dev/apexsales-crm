const fs = require('fs');

const appContent = fs.readFileSync('src/App.jsx', 'utf8');
const lines = appContent.split('\n');

const wsList = ['reports', 'tasks', 'calendar', 'settings'];
wsList.forEach(ws => {
  lines.forEach((l, idx) => {
    if (l.includes(`activeWorkspace === "${ws}"`) && (l.includes('<h1') || l.includes('<h2') || l.includes('header') || l.includes('title'))) {
      console.log(`[${ws}] Line ${idx + 1}: ${l.trim()}`);
    }
  });
});
