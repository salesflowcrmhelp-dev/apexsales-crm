const fs = require('fs');

const appContent = fs.readFileSync('src/App.jsx', 'utf8');

// Find activeView or currentTab or view states
console.log('--- Searching view/tab states in App.jsx ---');
const viewLines = [];
const lines = appContent.split('\n');
lines.forEach((l, idx) => {
  if (l.includes('currentView') || l.includes('activeTab') || l.includes('activeRole') || l.includes('view ===') || l.includes('currentRole')) {
    if (viewLines.length < 30) {
      viewLines.push((idx + 1) + ': ' + l.trim());
    }
  }
});
viewLines.forEach(l => console.log(l));
