const fs = require('fs');

const appContent = fs.readFileSync('src/App.jsx', 'utf8');
const lines = appContent.split('\n');

console.log('--- App.jsx non-standard weights (850, 750, 650) samples ---');
const found = [];
lines.forEach((l, idx) => {
  if (l.includes('850') || l.includes('750') || l.includes('650')) {
    if (l.includes('fontWeight') || l.includes('font-weight')) {
      found.push((idx + 1) + ': ' + l.trim());
    }
  }
});
console.log('Total non-standard weight lines in App.jsx:', found.length);
found.slice(0, 30).forEach(f => console.log(f));
if (found.length > 30) {
  console.log('--- sample middle ---');
  found.slice(30, 60).forEach(f => console.log(f));
}
