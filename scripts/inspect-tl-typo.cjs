const fs = require('fs');

const tlContent = fs.readFileSync('src/TeamLeaderDashboard.jsx', 'utf8');
const lines = tlContent.split('\n');

console.log('--- TeamLeaderDashboard.jsx non-standard weights & headings ---');
lines.forEach((l, idx) => {
  if (l.includes('850') || l.includes('750') || l.includes('650') || l.includes('<h1') || l.includes('<h2') || l.includes('<h3')) {
    console.log((idx + 1) + ': ' + l.trim());
  }
});
