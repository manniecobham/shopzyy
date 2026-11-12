const fs = require('node:fs');
const path = require('node:path');

const LANGS = ['es', 'fr', 'nl', 'de', 'it'];
const lit = String.raw`(?:'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)"|` + '`((?:[^`\\\\$]|\\\\.)*)`)';
const unescape = (s) => s.replace(/\\(['"`\\])/g, '$1').replace(/\\n/g, '\n');

function files(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (e.name !== 'i18n' && e.name !== 'node_modules') files(p, out); }
    else if (/\.tsx?$/.test(e.name)) out.push(p);
  }
  return out;
}

function keys(root = path.join(__dirname, '..', 'src')) {
  const found = new Set();
  const one = new RegExp(String.raw`\b(?:t|tr|tx)\(\s*` + lit, 'g');
  const two = new RegExp(String.raw`\btn\(\s*` + lit + String.raw`\s*,\s*` + lit, 'g');
  for (const f of files(root)) {
    const src = fs.readFileSync(f, 'utf8');
    for (const m of src.matchAll(one)) found.add(unescape(m[1] ?? m[2] ?? m[3]));
    for (const m of src.matchAll(two)) { found.add(unescape(m[1] ?? m[2] ?? m[3])); found.add(unescape(m[4] ?? m[5] ?? m[6])); }
  }
  return [...found].sort();
}

module.exports = { keys, LANGS };

if (require.main === module) {
  const all = keys();
  if (process.argv.includes('--json')) { console.log(JSON.stringify(all, null, 2)); process.exit(0); }
  console.log(`${all.length} strings`);
  for (const l of LANGS) {
    const src = fs.readFileSync(path.join(__dirname, '..', 'src', 'i18n', 'locales', `${l}.ts`), 'utf8');
    const missing = all.filter((k) => !src.includes(JSON.stringify(k)));
    console.log(`${l}: ${all.length - missing.length}/${all.length}`);
  }
}
