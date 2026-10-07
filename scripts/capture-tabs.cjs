const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const artifactDir = 'C:\\Users\\Hp\\.gemini\\antigravity\\brain\\11a5f903-cea1-47d7-a5f8-5d563651bae7';

const targets = [
  {
    name: 'super_admin_tab9_crm_overview.png',
    url: 'http://localhost:5173/?view=app&auth=demo&workspace=super_admin&saTab=crm_overview'
  },
  {
    name: 'super_admin_tab1_companies.png',
    url: 'http://localhost:5173/?view=app&auth=demo&workspace=super_admin&saTab=companies'
  },
  {
    name: 'super_admin_tab5_reports.png',
    url: 'http://localhost:5173/?view=app&auth=demo&workspace=super_admin&saTab=reports'
  }
];

for (const t of targets) {
  const outPath = path.join(artifactDir, t.name);
  console.log(`Capturing ${t.name}...`);
  spawnSync(chromePath, [
    '--headless',
    '--disable-gpu',
    '--hide-scrollbars',
    '--window-size=1600,1100',
    '--virtual-time-budget=4500',
    `--screenshot=${outPath}`,
    t.url
  ]);
  if (fs.existsSync(outPath)) {
    console.log(`✓ Saved ${t.name} (${fs.statSync(outPath).size} bytes)`);
  }
}
