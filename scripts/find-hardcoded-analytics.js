import fs from 'fs';
const content = fs.readFileSync('src/SuperAdminDashboard.jsx', 'utf8');
const lines = content.split('\n');
const searchTerms = ['8,75,000', '1,248', '18,229', '14.2%', '265', '210', '144', '146'];
lines.forEach((l, i) => {
  searchTerms.forEach(term => {
    if (l.includes(term)) {
      console.log(`Line ${i + 1} [${term}]:`, l.trim().slice(0, 100));
    }
  });
});
