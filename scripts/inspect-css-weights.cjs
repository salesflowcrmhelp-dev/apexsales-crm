const fs = require('fs');

const css = fs.readFileSync('src/index.css', 'utf8');
const lines = css.split('\n');
lines.forEach((l, idx) => {
  if (l.includes('850') || l.includes('750') || l.includes('650')) {
    console.log((idx + 1) + ': ' + l.trim());
  }
});
