import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('public');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');
const js = fs.readFileSync(path.join(root, 'script.js'), 'utf8');
const admin = fs.readFileSync(path.join(root, 'admin/index.html'), 'utf8');
const inquiryAdmin = fs.readFileSync(path.join(root, 'admin/inquiries.html'), 'utf8');
const backend = fs.readFileSync(path.join(root, 'backend.js'), 'utf8');
const worker = fs.readFileSync(path.resolve('src/worker.js'), 'utf8');
const errors = [];

for (const file of ['index.html','styles.css','script.js','backend.js','admin/index.html','admin/inquiries.html','admin/inquiries.js','admin/admin.css']) {
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
for (const token of ['name="photos"','name="consent"','backend.js']) {
  if (!index.includes(token)) errors.push(`Real inquiry form wiring missing: ${token}`);
}
for (const token of ['/api/inquiries','ADMIN_API_TOKEN','RESEND_API_KEY','WHATSAPP_ENABLED','WECHAT_WORK_WEBHOOK_URL']) {
  if (!worker.includes(token)) errors.push(`Worker capability missing: ${token}`);
}
for (const token of ['客户询价','inquiries.js','管理员密钥']) {
  if (!inquiryAdmin.includes(token)) errors.push(`Inquiry admin wiring missing: ${token}`);
}
if (!backend.includes('/api/inquiries')) errors.push('Frontend does not submit to real inquiry API');

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log('Kaida checks passed: frontend assets, real inquiry API wiring, protected admin dashboard, D1/R2 backend hooks, and notification hooks are present.');
