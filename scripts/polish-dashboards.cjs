const fs = require('fs');

console.log('--- Checking SalesHeadDashboard & TeamLeaderDashboard changes ---');

// SalesHeadDashboard
let sh = fs.readFileSync('src/SalesHeadDashboard.jsx', 'utf8');

// Normalize weights
sh = sh.replace(/fontWeight:\s*["']850["']/g, 'fontWeight: "700"');
sh = sh.replace(/fontWeight:\s*["']750["']/g, 'fontWeight: "600"');
sh = sh.replace(/fontWeight:\s*["']650["']/g, 'fontWeight: "600"');

// Elevate Page Title & Subtitle
sh = sh.replace(
  /<h1 style=\{\{\s*fontSize:\s*["']19px["'],\s*fontWeight:\s*["']700["'],\s*color:\s*["']#0f172a["'],\s*margin:\s*["']0 0 3px 0["'],\s*letterSpacing:\s*["']-0.3px["']\s*\}\}>/,
  `<h1 style={{ fontSize: "24px", fontWeight: "700", color: "#0f172a", margin: "0 0 4px 0", letterSpacing: "-0.02em", lineHeight: "1.25" }}>`
);
sh = sh.replace(
  /<p style=\{\{\s*fontSize:\s*["']13px["'],\s*color:\s*["']#64748b["'],\s*margin:\s*0\s*\}\}>/,
  `<p style={{ fontSize: "13.5px", color: "#64748b", margin: 0, fontWeight: "400", lineHeight: "1.5" }}>`
);

// Standardize Top 6 KPI Metric Values from 17px to 22px
sh = sh.replace(
  /fontSize:\s*["']17px["'],\s*fontWeight:\s*["']700["'],\s*color:\s*["']#0f172a["'],\s*margin:\s*["']6px 0 3px 0["']/g,
  `fontSize: "22px", fontWeight: "700", color: "#0f172a", margin: "6px 0 3px 0"`
);

fs.writeFileSync('src/SalesHeadDashboard.jsx', sh, 'utf8');
console.log('SalesHeadDashboard.jsx updated.');

// TeamLeaderDashboard
let tl = fs.readFileSync('src/TeamLeaderDashboard.jsx', 'utf8');

// Normalize weights
tl = tl.replace(/fontWeight:\s*["']850["']/g, 'fontWeight: "700"');
tl = tl.replace(/fontWeight:\s*["']750["']/g, 'fontWeight: "600"');
tl = tl.replace(/fontWeight:\s*["']650["']/g, 'fontWeight: "600"');

// Elevate Page Title & Subtitle
tl = tl.replace(
  /<h1 style=\{\{\s*fontSize:\s*["']19px["'],\s*fontWeight:\s*["']700["'],\s*color:\s*["']#0f172a["'],\s*margin:\s*["']0 0 3px 0["'],\s*letterSpacing:\s*["']-0.3px["']\s*\}\}>/,
  `<h1 style={{ fontSize: "24px", fontWeight: "700", color: "#0f172a", margin: "0 0 4px 0", letterSpacing: "-0.02em", lineHeight: "1.25" }}>`
);
tl = tl.replace(
  /<p style=\{\{\s*fontSize:\s*["']13px["'],\s*color:\s*["']#64748b["'],\s*margin:\s*0\s*\}\}>/,
  `<p style={{ fontSize: "13.5px", color: "#64748b", margin: 0, fontWeight: "400", lineHeight: "1.5" }}>`
);

// Standardize Top 6 KPI Metric Values from 17px to 22px
tl = tl.replace(
  /fontSize:\s*["']17px["'],\s*fontWeight:\s*["']700["'],\s*color:\s*["']#0f172a["'],\s*margin:\s*["']6px 0 3px 0["']/g,
  `fontSize: "22px", fontWeight: "700", color: "#0f172a", margin: "6px 0 3px 0"`
);
tl = tl.replace(
  /fontSize:\s*["']17px["'],\s*fontWeight:\s*["']700["'],\s*color:\s*pendingFollowUpsCount\s*>\s*0\s*\?\s*["']#dc2626["']\s*:\s*["']#0f172a["'],\s*margin:\s*["']6px 0 3px 0["']/g,
  `fontSize: "22px", fontWeight: "700", color: pendingFollowUpsCount > 0 ? "#dc2626" : "#0f172a", margin: "6px 0 3px 0"`
);

fs.writeFileSync('src/TeamLeaderDashboard.jsx', tl, 'utf8');
console.log('TeamLeaderDashboard.jsx updated.');
