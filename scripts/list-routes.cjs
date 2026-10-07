const fs = require('fs');
const content = fs.readFileSync('server/server.js', 'utf8');
const regex = /app\.(get|post|put|delete|patch)\(\s*['"]([^'"]+)['"]/g;
let match;
const routes = [];
while ((match = regex.exec(content)) !== null) {
  routes.push({ method: match[1].toUpperCase(), path: match[2] });
}
console.log(JSON.stringify(routes, null, 2));
