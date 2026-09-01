import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('public');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');
const js = fs.readFileSync(path.join(root, 'script.js'), 'utf8');
const admin = fs.readFileSync(path.join(root, 'admin/index.html'), 'utf8');
const errors = [];

for (const file of ['index.html','styles.css','script.js','admin/index.html','admin/admin.css']) {
  if (!fs.existsSync(path.join(root,file))) errors.push(`Missing: public/${file}`);
}
for (const m of css.matchAll(/url\(['"]?([^)\'"?#]+)['"]?\)/g)) {
  const ref = m[1];
  if (/^(data:|https?:)/.test(ref)) continue;
  if (!fs.existsSync(path.resolve(root, ref))) errors.push(`Broken CSS asset: ${ref}`);
}
for (const token of ['langToggle','quoteForm','compareRange','wechatModal']) {
  if (!index.includes(token) || !js.includes(token)) errors.push(`Frontend wiring missing: ${token}`);
}
for (const token of ['projectStory','videoInput','publishBtn']) {
  if (!admin.includes(token)) errors.push(`Admin wiring missing: ${token}`);
}
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log('Kaida checks passed: frontend assets, bilingual UI wiring, compare widget, inquiry demo, and admin prototype are present.');
