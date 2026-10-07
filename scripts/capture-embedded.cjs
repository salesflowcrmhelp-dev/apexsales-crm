const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const artifactDir = 'C:\\Users\\Hp\\.gemini\\antigravity\\brain\\11a5f903-cea1-47d7-a5f8-5d563651bae7';

const targets = [
  {
    name: 'super_admin_embedded_workspace.png',
    url: 'http://localhost:5173/?view=app&auth=demo&workspace=super_admin'
  },
  {
    name: 'sales_cockpit_embedded_workspace.png',
    url: 'http://localhost:5173/?view=app&auth=demo&workspace=pipeline'
  }
];

for (const t of targets) {
  const outPath = path.join(artifactDir, t.name);
  console.log(`Capturing ${t.name}...`);
  spawnSync(chromePath, [
    '--headless',
    '--disable-gpu',
    '--hide-scrollbars',
    '--window-size=1600,1050',
    '--virtual-time-budget=6000',
    `--screenshot=${outPath}`,
    t.url
  ]);
  if (fs.existsSync(outPath)) {
    console.log(`✓ Saved ${t.name} (${fs.statSync(outPath).size} bytes)`);
  } else {
    console.error(`Failed to save ${t.name}`);
  }
}
