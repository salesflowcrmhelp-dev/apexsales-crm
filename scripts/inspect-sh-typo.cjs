const fs = require('fs');

const shContent = fs.readFileSync('src/SalesHeadDashboard.jsx', 'utf8');
const lines = shContent.split('\n');

console.log('--- SalesHeadDashboard.jsx non-standard weights & headings ---');
lines.forEach((l, idx) => {
  if (l.includes('850') || l.includes('750') || l.includes('650') || l.includes('<h1') || l.includes('<h2') || l.includes('<h3')) {
    console.log((idx + 1) + ': ' + l.trim());
  }
});
