const fs = require('fs');
const s = fs.readFileSync('server/server.js', 'utf8');
const lines = s.split('\n');
const endpoints = [];
lines.forEach((l, idx) => {
  const m = l.match(/app\.(get|post|put|delete|patch)\(['"]([^'"]+)['"]/);
  if (m) endpoints.push({ line: idx+1, method: m[1].toUpperCase(), path: m[2] });
});
console.log('Total endpoints in server.js:', endpoints.length);
endpoints.forEach(e => console.log(`  ${e.method.padEnd(6)} ${e.path} (line ${e.line})`));
