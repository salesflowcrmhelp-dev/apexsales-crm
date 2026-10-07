const fs = require('fs');

const appContent = fs.readFileSync('src/App.jsx', 'utf8');

const matches = [];
const lines = appContent.split('\n');
lines.forEach((l, idx) => {
  if (l.includes('pipelineView ===') || l.includes('activeWorkspace ===')) {
    matches.push((idx + 1) + ': ' + l.trim());
  }
});
console.log('Total view branches:', matches.length);
matches.slice(0, 35).forEach(m => console.log(m));
