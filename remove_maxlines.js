const fs = require('fs');
let txt = fs.readFileSync('lib/blog-image/templates-config.ts', 'utf8');
const regex = /maxLines:\s*\d+/g;
let match;
let count = 0;
while ((match = regex.exec(txt)) !== null) {
  // Check back up to 100 characters to see if it's 'body'
  const prefix = txt.substring(Math.max(0, match.index - 150), match.index);
  if (prefix.includes("role: 'body'")) {
    const p1 = txt.substring(0, match.index);
    // remove `maxLines: X, ` or `maxLines: X `
    const p2 = txt.substring(match.index).replace(/^maxLines:\s*\d+,?\s*/, '');
    txt = p1 + p2;
    regex.lastIndex = p1.length;
    count++;
  }
}
fs.writeFileSync('lib/blog-image/templates-config.ts', txt);
console.log('Replaced count:', count);
