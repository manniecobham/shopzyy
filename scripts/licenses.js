const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const rows = Object.keys(pkg.dependencies ?? {}).sort().map((name) => {
  const file = path.join(root, 'node_modules', name, 'package.json');
  if (!fs.existsSync(file)) return null;
  const p = JSON.parse(fs.readFileSync(file, 'utf8'));
  const license = typeof p.license === 'string' ? p.license : p.license?.type ?? (p.licenses ?? []).map((l) => l.type).join(' / ') ?? '';
  let repo = typeof p.repository === 'string' ? p.repository : p.repository?.url ?? p.homepage ?? '';
  repo = repo.replace(/^git\+/, '').replace(/^git:\/\//, 'https://').replace(/\.git$/, '').replace(/^github:/, 'https://github.com/');
  if (/^[\w-]+\/[\w.-]+$/.test(repo)) repo = `https://github.com/${repo}`;
  return { name, version: p.version, license: license || 'See package', repo: /^https?:/.test(repo) ? repo : '' };
}).filter(Boolean);

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Shopzyy open-source licences</title>
<meta name="description" content="The open-source software Shopzyy is built with.">
<link rel="stylesheet" href="/legal.css">
</head>
<body>
<header><div><h1>Open-source licences</h1><p>Shopzyy</p></div></header>
<main>
<p>Shopzyy is built with open-source software. We are grateful to the people who make it. Each package is used under its own licence, shown below, and its full licence text and copyright notice are in the package's repository.</p>
<table>
<tr><th>Package</th><th>Version</th><th>Licence</th></tr>
${rows.map((r) => `<tr><td>${r.repo ? `<a href="${esc(r.repo)}">${esc(r.name)}</a>` : esc(r.name)}</td><td>${esc(r.version)}</td><td>${esc(r.license)}</td></tr>`).join('\n')}
</table>
<p class="muted">The Space Grotesk typeface used on our website is licensed under the SIL Open Font Licence 1.1. This list covers the packages we use directly. Each of them may depend on further open-source packages under their own licences.</p>
<p class="muted">See also our <a href="/privacy">privacy policy</a>, <a href="/terms">terms of use</a> and <a href="/impressum">legal notice</a>.</p>
</main>
</body>
</html>
`;
fs.writeFileSync(path.join(root, 'hosting', 'licenses.html'), html);
console.log(`${rows.length} packages`);
const odd = rows.filter((r) => !/^(MIT|Apache-2\.0|ISC|BSD|0BSD|\(MIT OR|MIT AND)/i.test(r.license));
console.log('non-MIT/Apache/ISC/BSD:', odd.map((r) => `${r.name}: ${r.license}`).join(', ') || 'none');
