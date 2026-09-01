import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('public');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');
const js = fs.readFileSync(path.join(root, 'script.js'), 'utf8');
const admin = fs.readFileSync(path.join(root, 'admin/index.html'), 'utf8');
const inquiryAdmin = fs.readFileSync(path.join(root, 'admin/inquiries.html'), 'utf8');
const projectsAdmin = fs.readFileSync(path.join(root, 'admin/projects.html'), 'utf8');
const projectsJs = fs.readFileSync(path.join(root, 'admin/projects.js'), 'utf8');
const dashboardJs = fs.readFileSync(path.join(root, 'admin/dashboard.js'), 'utf8');
const backend = fs.readFileSync(path.join(root, 'backend.js'), 'utf8');
const cms = fs.readFileSync(path.join(root, 'cms.js'), 'utf8');
const homepageAdmin = fs.readFileSync(path.join(root, 'admin/homepage.js'), 'utf8');
const workerPreview = fs.readFileSync(path.resolve('src/worker-preview.js'), 'utf8');
const worker = fs.readFileSync(path.resolve('src/worker.js'), 'utf8');
const errors = [];

for (const file of [
  'index.html','styles.css','script.js','backend.js','cms.js','brand-icons.css','mobile-focus.css',
  'admin/index.html','admin/homepage.js','admin/homepage.css','admin/dashboard.js','admin/dashboard.css',
  'admin/projects.html','admin/projects.js','admin/projects.css','admin/inquiries.html','admin/inquiries.js','admin/admin.css'
]) {
  if (!fs.existsSync(path.join(root, file))) errors.push(`Missing: public/${file}`);
}

for (const m of css.matchAll(/url\(['"]?([^)\'"?#]+)['"]?\)/g)) {
  const ref = m[1];
  if (/^(data:|https?:)/.test(ref)) continue;
  if (!fs.existsSync(path.resolve(root, ref))) errors.push(`Broken CSS asset: ${ref}`);
}

for (const token of ['langToggle','quoteForm','compareRange','wechatModal']) {
  if (!index.includes(token) || !js.includes(token)) errors.push(`Frontend wiring missing: ${token}`);
}
for (const token of ['首页内容','全部工程','homepage.js','projects.js','dashboard.js','客户询价']) {
  if (!admin.includes(token)) errors.push(`Unified admin wiring missing: ${token}`);
}
for (const token of ['/api/admin/media','/api/admin/site-content','data-upload','projectLibrary']) {
  if (!homepageAdmin.includes(token)) errors.push(`Homepage CMS admin capability missing: ${token}`);
}
for (const token of ['projectLibrary','featuredProjectIds','toggleFeatured','saveProject','cancelProject','closeProjectDialog','/api/admin/media']) {
  if (!projectsJs.includes(token)) errors.push(`Project library capability missing: ${token}`);
}
for (const token of ['data-admin-tab','data-admin-panel','KaidaProjects','KaidaHomepage']) {
  if (!dashboardJs.includes(token)) errors.push(`Unified dashboard capability missing: ${token}`);
}
if (!projectsAdmin.includes('#projects')) errors.push('Legacy project manager does not redirect to unified admin');
for (const token of ['/api/site-content','heroMedia','projectCards']) {
  if (!cms.includes(token)) errors.push(`Homepage CMS frontend wiring missing: ${token}`);
}
for (const token of ['name="photos"','name="consent"','backend.js']) {
  if (!index.includes(token)) errors.push(`Inquiry form wiring missing: ${token}`);
}
for (const token of ['/api/inquiries','ADMIN_API_TOKEN','RESEND_API_KEY','WHATSAPP_ENABLED','WECHAT_WORK_WEBHOOK_URL']) {
  if (!worker.includes(token)) errors.push(`Worker capability missing: ${token}`);
}
for (const token of ['/api/admin/media','/api/admin/site-content','CMS_MEDIA','/cms-media/']) {
  if (!workerPreview.includes(token)) errors.push(`CMS worker capability missing: ${token}`);
}
for (const token of ['客户询价','inquiries.js','管理员密钥']) {
  if (!inquiryAdmin.includes(token)) errors.push(`Inquiry admin wiring missing: ${token}`);
}
if (!backend.includes('/api/inquiries')) errors.push('Frontend does not submit to inquiry API');

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log('Kaida checks passed: bilingual frontend, mobile focus, unified admin dashboard, project library, image upload hooks, inquiry API, and protected admin pages are wired.');
