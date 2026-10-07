const fs = require('fs');

console.log('--- Applying Typography Polish to App.jsx and index.css ---');

// 1. index.css
let css = fs.readFileSync('src/index.css', 'utf8');
css = css.replace(/font-weight:\s*850\s*!important/g, 'font-weight: 700 !important');
css = css.replace(/font-weight:\s*850;/g, 'font-weight: 700;');
css = css.replace(/font-weight:\s*750\s*!important/g, 'font-weight: 600 !important');
css = css.replace(/font-weight:\s*750;/g, 'font-weight: 600;');
fs.writeFileSync('src/index.css', css, 'utf8');
console.log('index.css updated.');

// 2. App.jsx
let app = fs.readFileSync('src/App.jsx', 'utf8');

// Normalize synthetic font weights in App.jsx
app = app.replace(/fontWeight:\s*["']850["']/g, 'fontWeight: "700"');
app = app.replace(/fontWeight:\s*["']750["']/g, 'fontWeight: "600"');
app = app.replace(/fontWeight:\s*["']650["']/g, 'fontWeight: "600"');

// Elevate Employee Cockpit Greeting Title & Subtitle
app = app.replace(
  /<h1 style=\{\{\s*fontSize:\s*["']18px["'],\s*fontWeight:\s*["']800["'],\s*color:\s*["']#0f172a["'],\s*margin:\s*["']0 0 3px 0["'],\s*lineHeight:\s*["']1.3["'],\s*letterSpacing:\s*["']-0.2px["']\s*\}\}>/,
  `<h1 style={{ fontSize: "24px", fontWeight: "700", color: "#0f172a", margin: "0 0 4px 0", lineHeight: "1.25", letterSpacing: "-0.02em" }}>`
);
app = app.replace(
  /<p style=\{\{\s*fontSize:\s*["']13px["'],\s*color:\s*["']#64748b["'],\s*margin:\s*0,\s*padding:\s*["']0 0 4px 0["'],\s*fontWeight:\s*["']400["'],\s*lineHeight:\s*["']1.5["']\s*\}\}>/,
  `<p style={{ fontSize: "13.5px", color: "#64748b", margin: 0, padding: "0 0 4px 0", fontWeight: "400", lineHeight: "1.5" }}>`
);

fs.writeFileSync('src/App.jsx', app, 'utf8');
console.log('App.jsx updated.');
