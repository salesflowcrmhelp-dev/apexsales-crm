const fs = require('fs');

const glob = (dir) => {
  let res = [];
  try {
    for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
      if (f.name === 'node_modules' || f.name === 'dist' || f.name === '.git') continue;
      const p = dir + '/' + f.name;
      if (f.isDirectory()) res = res.concat(glob(p));
      else if (p.endsWith('.js') || p.endsWith('.jsx')) res.push(p);
    }
  } catch(e){}
  return res;
};

const files = glob('src');
console.log('--- Searching for fetch(/api/ in src ---');
files.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  const lines = content.split('\n');
  lines.forEach((l, idx) => {
    if (l.includes('/api/')) {
      console.log(`${f}:${idx+1}: ${l.trim()}`);
    }
  });
});
