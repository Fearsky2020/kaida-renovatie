const statusEl = document.getElementById('globalStatus');
const root = document.getElementById('editorRoot');
let adminToken = sessionStorage.getItem('kaidaAdminToken') || '';
let content = { hero: {}, projects: [], beforeAfter: {} };

const defaultProjects = [
  { title: '定制电视柜与储物系统', city: 'Den Haag', category: '全屋定制' },
  { title: '入墙定制衣柜', city: 'Rijswijk', category: '橱柜定制' },
  { title: '厨房改造', city: 'Delft', category: '橱柜定制 / 翻新' },
  { title: '整屋木作与收纳', city: 'Rotterdam', category: '全屋定制' },
  { title: '空间翻新与细节施工', city: 'Zoetermeer', category: '室内翻新' },
  { title: '客厅整体改造', city: 'Utrecht', category: '室内翻新' },
];

function getToken(force = false) {
  if (!adminToken || force) {
    const entered = window.prompt('请输入凯达后台管理员密钥');
    if (!entered) return false;
    adminToken = entered.trim();
    sessionStorage.setItem('kaidaAdminToken', adminToken);
  }
  return true;
}

async function api(path, options = {}) {
  if (!getToken()) throw new Error('未输入管理员密钥');
  const headers = new Headers(options.headers || {});
  headers.set('Authorization', `Bearer ${adminToken}`);
  headers.set('Accept', 'application/json');
  if (options.body && !(options.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  const response = await fetch(path, { ...options, headers });
  if (response.status === 401) {
    sessionStorage.removeItem('kaidaAdminToken');
    adminToken = '';
    throw new Error('管理员密钥不正确');
  }
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || `请求失败 (${response.status})`);
  return body;
}

async function cssImage(file) {
  try {
    const text = await fetch(`../${file}`).then(r => r.text());
    const match = text.match(/url\(['"]?([^'")]+)['"]?\)/);
    return match?.[1] || '';
  } catch {
    return '';
  }
}

async function defaults() {
  const [hero, p1, p2, p3, p4, p5, p6, before, after] = await Promise.all([
    cssImage('img-hero.css'),
    cssImage('img-p2.css'),
    cssImage('img-p1.css'),
    cssImage('img-p3.css'),
    cssImage('img-p4.css'),
    cssImage('img-p5.css'),
    cssImage('img-p6.css'),
    cssImage('img-before.css'),
    cssImage('img-after.css'),
  ]);
  return {
    hero: { image: hero, city: 'Den Haag' },
    projects: defaultProjects.map((item, index) => ({ ...item, image: [p1,p2,p3,p4,p5,p6][index] })),
    beforeAfter: { before, after },
  };
}

function mergeContent(base, saved) {
  return {
    ...saved,
    hero: { ...base.hero, ...(saved.hero || {}) },
    projects: base.projects.map((project, index) => ({ ...project, ...(saved.projects?.[index] || {}) })),
    beforeAfter: { ...base.beforeAfter, ...(saved.beforeAfter || {}) },
  };
}

function imageCard({ slot, title, image, extra = '' }) {
  return `
    <article class="editor-card ${slot === 'hero' ? 'hero-editor' : 'project-editor'}" data-slot="${slot}">
      <div class="image-panel"><img src="${escapeAttr(image)}" alt="${escapeAttr(title)}"></div>
      <div class="edit-panel">
        <h3>${title}</h3>
        ${extra}
        <label class="upload-btn">选择新图片<input type="file" accept="image/*" data-upload="${slot}"></label>
        <p class="upload-status" data-upload-status="${slot}"></p>
      </div>
    </article>`;
}

function render() {
  const projects = content.projects.map((project, index) => imageCard({
    slot: `project-${index}`,
    title: `精品工程 ${index + 1}`,
    image: project.image,
    extra: `
      <label class="field">工程标题<input data-field="projects.${index}.title" value="${escapeAttr(project.title || '')}"></label>
      <label class="field">城市<input data-field="projects.${index}.city" value="${escapeAttr(project.city || '')}"></label>
      <label class="field">分类<input data-field="projects.${index}.category" value="${escapeAttr(project.category || '')}"></label>`,
  })).join('');

  root.innerHTML = `
    <section class="section">
      <div class="section-head"><div><h2>首页大图</h2><p>网站一打开最显眼的那张图。</p></div></div>
      ${imageCard({
        slot: 'hero',
        title: '首页主图',
        image: content.hero.image,
        extra: `<label class="field">图片角标城市<input data-field="hero.city" value="${escapeAttr(content.hero.city || '')}"></label>`,
      })}
    </section>

    <section class="section">
      <div class="section-head"><div><h2>6 个精品工程</h2><p>这里只改当前首页的 6 个。要增加更多工程或重新挑精选，点页面上方“全部工程”。</p></div></div>
      <div class="project-edit-grid">${projects}</div>
    </section>

    <section class="section">
      <div class="section-head"><div><h2>改造前 / 后</h2><p>电脑端展示；手机端为了简洁会自动隐藏这一块。</p></div></div>
      <div class="compare-edit-grid">
        <article class="editor-card compare-editor" data-slot="before">
          <div class="image-panel"><img src="${escapeAttr(content.beforeAfter.before)}" alt="改造前"></div>
          <div class="edit-panel"><h3>改造前</h3><label class="upload-btn">选择新图片<input type="file" accept="image/*" data-upload="before"></label><p class="upload-status" data-upload-status="before"></p></div>
        </article>
        <article class="editor-card compare-editor" data-slot="after">
          <div class="image-panel"><img src="${escapeAttr(content.beforeAfter.after)}" alt="改造后"></div>
          <div class="edit-panel"><h3>改造后</h3><label class="upload-btn">选择新图片<input type="file" accept="image/*" data-upload="after"></label><p class="upload-status" data-upload-status="after"></p></div>
        </article>
      </div>
    </section>`;

  root.querySelectorAll('[data-field]').forEach((input) => input.addEventListener('input', () => setField(input.dataset.field, input.value)));
  root.querySelectorAll('[data-upload]').forEach((input) => input.addEventListener('change', () => uploadImage(input.dataset.upload, input.files?.[0])));
}

function setField(path, value) {
  const parts = path.split('.');
  if (parts[0] === 'hero') content.hero[parts[1]] = value;
  if (parts[0] === 'projects') content.projects[Number(parts[1])][parts[2]] = value;
  statusEl.textContent = '文字有修改，记得点保存';
}

function syncProjectLibrary() {
  if (!Array.isArray(content.projectLibrary)) return;
  content.projects.forEach((project) => {
    if (!project?.id) return;
    const index = content.projectLibrary.findIndex((item) => item.id === project.id);
    if (index < 0) return;
    content.projectLibrary[index] = {
      ...content.projectLibrary[index],
      title: project.title,
      city: project.city,
      category: project.category,
      image: project.image,
    };
  });
}

async function uploadImage(slot, file) {
  if (!file) return;
  const card = root.querySelector(`[data-slot="${slot}"]`);
  const img = card?.querySelector('img');
  const status = root.querySelector(`[data-upload-status="${slot}"]`);
  const localUrl = URL.createObjectURL(file);
  if (img) img.src = localUrl;
  if (status) status.textContent = '正在上传…';
  card?.classList.add('loading');

  try {
    const data = new FormData();
    data.set('slot', slot);
    data.set('file', file);
    const result = await api('/api/admin/media', { method: 'POST', body: data });
    if (slot === 'hero') content.hero.image = result.url;
    else if (slot === 'before') content.beforeAfter.before = result.url;
    else if (slot === 'after') content.beforeAfter.after = result.url;
    else if (slot.startsWith('project-')) content.projects[Number(slot.split('-')[1])].image = result.url;
    await saveContent(false);
    if (img) img.src = result.url;
    if (status) status.textContent = '✓ 已换好，网站已更新';
    statusEl.textContent = '图片已自动保存';
  } catch (error) {
    if (status) status.textContent = `上传失败：${error.message}`;
    statusEl.textContent = '上传失败';
  } finally {
    card?.classList.remove('loading');
    URL.revokeObjectURL(localUrl);
  }
}

async function saveContent(showMessage = true) {
  syncProjectLibrary();
  await api('/api/admin/site-content', { method: 'PUT', body: JSON.stringify(content) });
  if (showMessage) statusEl.textContent = '✓ 已保存，网站已更新';
}

function escapeAttr(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

async function init() {
  root.innerHTML = '<p>正在读取网站内容…</p>';
  try {
    const base = await defaults();
    const saved = await api('/api/admin/site-content');
    content = mergeContent(base, saved.content || {});
    render();
  } catch (error) {
    root.innerHTML = `<div class="tip">无法打开后台：${escapeAttr(error.message)}。<button id="retryToken">重新输入管理员密钥</button></div>`;
    document.getElementById('retryToken')?.addEventListener('click', () => { if (getToken(true)) init(); });
  }
}

document.getElementById('saveAll').addEventListener('click', async () => {
  statusEl.textContent = '正在保存…';
  try {
    await saveContent(true);
    window.KaidaProjects?.reload?.();
  } catch (error) {
    statusEl.textContent = `保存失败：${error.message}`;
  }
});
document.getElementById('changeToken').addEventListener('click', () => {
  if (getToken(true)) {
    init();
    window.KaidaProjects?.reload?.();
  }
});

window.KaidaHomepage = { reload: init };
init();
