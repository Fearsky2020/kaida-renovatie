const listEl = document.getElementById('inquiryList');
const emptyEl = document.getElementById('emptyState');
const summaryEl = document.getElementById('summaryText');
const connectionEl = document.getElementById('connectionText');
const statusFilter = document.getElementById('statusFilter');
const detailDialog = document.getElementById('detailDialog');
const detailBody = document.getElementById('detailBody');
const newCount = document.getElementById('newCount');

let adminToken = sessionStorage.getItem('kaidaAdminToken') || '';
let items = [];

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
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `请求失败 (${response.status})`);
  }
  return response;
}

async function loadInquiries() {
  listEl.innerHTML = '<section class="card"><p style="margin:0">正在加载询价…</p></section>';
  emptyEl.hidden = true;
  try {
    const status = statusFilter.value;
    const response = await api(`/api/inquiries?limit=100${status ? `&status=${encodeURIComponent(status)}` : ''}`);
    const body = await response.json();
    items = body.items || [];
    renderList();
    connectionEl.textContent = '已连接真实后台 · D1 数据库';
  } catch (error) {
    listEl.innerHTML = `<section class="card error-card"><strong>无法读取询价</strong><p>${escapeHtml(error.message)}</p><button class="save" id="retryAuth">重新输入密钥</button></section>`;
    summaryEl.textContent = '后台尚未连接';
    connectionEl.textContent = '如果刚部署，请先配置 ADMIN_API_TOKEN。';
    document.getElementById('retryAuth')?.addEventListener('click', () => {
      if (getToken(true)) loadInquiries();
    });
  }
}

function renderList() {
  const countNew = items.filter((item) => item.status === 'new').length;
  newCount.textContent = String(countNew);
  summaryEl.textContent = `${items.length} 条询价${countNew ? ` · ${countNew} 条待处理` : ''}`;
  listEl.innerHTML = '';
  emptyEl.hidden = items.length > 0;

  items.forEach((item) => {
    const article = document.createElement('article');
    article.className = 'card inquiry-card';
    article.innerHTML = `
      <div class="inquiry-main">
        <div class="inquiry-title-row">
          <div>
            <span class="status-pill status-${escapeHtml(item.status)}">${statusLabel(item.status)}</span>
            <h2>${escapeHtml(item.name)} <small>${escapeHtml(item.city)}</small></h2>
          </div>
          <time>${formatTime(item.createdAt)}</time>
        </div>
        <div class="inquiry-facts">
          <span><b>工程</b>${projectLabel(item.projectType)}</span>
          <span><b>联系</b>${escapeHtml(item.contact)}</span>
          <span><b>照片</b>${item.photoCount || 0} 张</span>
        </div>
        ${item.message ? `<p class="inquiry-message">${escapeHtml(item.message)}</p>` : ''}
      </div>
      <div class="inquiry-actions">
        <button class="save" data-open="${item.id}">查看详情</button>
        <select data-status="${item.id}" aria-label="更新状态">
          ${statusOptions(item.status)}
        </select>
      </div>`;
    listEl.appendChild(article);
  });

  listEl.querySelectorAll('[data-open]').forEach((button) => {
    button.addEventListener('click', () => openDetail(button.dataset.open));
  });
  listEl.querySelectorAll('[data-status]').forEach((select) => {
    select.addEventListener('change', () => changeStatus(select.dataset.status, select.value, select));
  });
}

async function changeStatus(id, status, select) {
  select.disabled = true;
  try {
    await api(`/api/inquiries/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    const item = items.find((entry) => entry.id === id);
    if (item) item.status = status;
    renderList();
  } catch (error) {
    window.alert(error.message);
  } finally {
    select.disabled = false;
  }
}

async function openDetail(id) {
  const item = items.find((entry) => entry.id === id);
  if (!item) return;

  detailBody.innerHTML = `
    <span class="status-pill status-${escapeHtml(item.status)}">${statusLabel(item.status)}</span>
    <h2>${escapeHtml(item.name)}</h2>
    <div class="detail-grid">
      <p><b>城市</b><span>${escapeHtml(item.city)}</span></p>
      <p><b>工程类型</b><span>${projectLabel(item.projectType)}</span></p>
      <p><b>电话 / WhatsApp / 微信</b><span>${escapeHtml(item.contact)}</span></p>
      <p><b>邮箱</b><span>${escapeHtml(item.email || '未填写')}</span></p>
      <p class="full"><b>客户留言</b><span>${escapeHtml(item.message || '未填写')}</span></p>
      <p class="full"><b>提交时间</b><span>${formatTime(item.createdAt)}</span></p>
    </div>
    <div class="detail-contact-actions">
      ${whatsAppLink(item.contact) ? `<a class="primary-action" href="${whatsAppLink(item.contact)}" target="_blank" rel="noopener">WhatsApp 联系</a>` : ''}
      ${item.email ? `<a class="save" href="mailto:${encodeURIComponent(item.email)}">发邮件</a>` : ''}
      <button class="save" id="copyContactBtn">复制联系方式</button>
    </div>
    <div class="photo-section">
      <h3>现场照片 <small>${item.photoCount || 0} 张</small></h3>
      <div class="admin-photo-grid" id="photoGrid"></div>
    </div>`;

  detailDialog.showModal();
  document.getElementById('copyContactBtn').addEventListener('click', async () => {
    await navigator.clipboard.writeText(item.contact);
  });
  await loadPhotos(item);
}

async function loadPhotos(item) {
  const grid = document.getElementById('photoGrid');
  if (!grid || !item.photoCount) {
    if (grid) grid.innerHTML = '<p class="muted">客户没有上传照片。</p>';
    return;
  }

  grid.innerHTML = '<p class="muted">正在加载照片…</p>';
  const images = [];
  for (let index = 0; index < item.photoCount; index += 1) {
    try {
      const response = await api(`/api/inquiries/${encodeURIComponent(item.id)}/photos/${index}`);
      const blob = await response.blob();
      images.push(URL.createObjectURL(blob));
    } catch (error) {
      console.error(error);
    }
  }
  grid.innerHTML = images.length
    ? images.map((src, index) => `<a href="${src}" target="_blank" rel="noopener"><img src="${src}" alt="客户现场照片 ${index + 1}"></a>`).join('')
    : '<p class="muted">照片暂时无法读取。</p>';
}

function statusOptions(selected) {
  return [
    ['new', '新询价'],
    ['contacted', '已联系'],
    ['quoted', '已报价'],
    ['won', '已成交'],
    ['lost', '未成交'],
  ].map(([value, label]) => `<option value="${value}"${value === selected ? ' selected' : ''}>${label}</option>`).join('');
}

function statusLabel(status) {
  return ({ new: '新询价', contacted: '已联系', quoted: '已报价', won: '已成交', lost: '未成交' })[status] || status;
}

function projectLabel(type) {
  return ({ renovation: '装修', carpentry: '木工', furniture: '定制家具', wardrobe: '定制衣柜', kitchen: '厨房', other: '其他' })[type] || escapeHtml(type || '未填写');
}

function formatTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return escapeHtml(value || '');
  return new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function whatsAppLink(contact) {
  const digits = String(contact || '').replace(/[^0-9+]/g, '').replace(/^00/, '+');
  const normalized = digits.startsWith('+') ? digits.slice(1) : digits;
  return normalized.length >= 8 ? `https://wa.me/${encodeURIComponent(normalized)}` : '';
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
}

statusFilter.addEventListener('change', loadInquiries);
document.getElementById('refreshBtn').addEventListener('click', loadInquiries);
document.getElementById('changeTokenBtn').addEventListener('click', () => {
  if (getToken(true)) loadInquiries();
});
document.getElementById('closeDialog').addEventListener('click', () => detailDialog.close());
detailDialog.addEventListener('click', (event) => {
  if (event.target === detailDialog) detailDialog.close();
});

loadInquiries();
