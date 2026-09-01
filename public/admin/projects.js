const listEl = document.getElementById('projectList');
const countText = document.getElementById('countText');
const dialog = document.getElementById('editorDialog');
const formStatus = document.getElementById('formStatus');
let adminToken = sessionStorage.getItem('kaidaAdminToken') || '';
let content = { hero:{}, projects:[], beforeAfter:{}, projectLibrary:[], featuredProjectIds:[] };

const fields = {
  id: document.getElementById('projectId'),
  title: document.getElementById('projectTitle'),
  city: document.getElementById('projectCity'),
  category: document.getElementById('projectCategory'),
  description: document.getElementById('projectDescription'),
  published: document.getElementById('projectPublished'),
  featured: document.getElementById('projectFeatured'),
  image: document.getElementById('projectImage'),
  preview: document.getElementById('projectPreview'),
  uploadStatus: document.getElementById('uploadStatus'),
};

function getToken(force=false){
  if(!adminToken || force){
    const entered = window.prompt('请输入凯达后台管理员密钥');
    if(!entered) return false;
    adminToken = entered.trim();
    sessionStorage.setItem('kaidaAdminToken', adminToken);
  }
  return true;
}
async function api(path, options={}){
  if(!getToken()) throw new Error('未输入管理员密钥');
  const headers = new Headers(options.headers||{});
  headers.set('Authorization',`Bearer ${adminToken}`);
  headers.set('Accept','application/json');
  if(options.body && !(options.body instanceof FormData)) headers.set('Content-Type','application/json');
  const response = await fetch(path,{...options,headers});
  if(response.status===401){ sessionStorage.removeItem('kaidaAdminToken'); adminToken=''; throw new Error('管理员密钥不正确'); }
  const body = await response.json().catch(()=>({}));
  if(!response.ok) throw new Error(body.error||`请求失败 (${response.status})`);
  return body;
}
function makeId(){ return `project-${Date.now().toString(36)}-${crypto.randomUUID().slice(0,6)}`; }
function normalize(){
  if(!Array.isArray(content.projectLibrary) || !content.projectLibrary.length){
    content.projectLibrary = (content.projects||[]).map((p,i)=>({ id:p.id||`legacy-${i+1}`, title:p.title||`工程 ${i+1}`, city:p.city||'', category:p.category||'室内翻新', description:p.description||'', image:p.image||'', published:true, createdAt:new Date(Date.now()-i*1000).toISOString() }));
  }
  if(!Array.isArray(content.featuredProjectIds) || !content.featuredProjectIds.length){
    content.featuredProjectIds = content.projectLibrary.slice(0,6).map(p=>p.id);
  }
  content.projectLibrary = content.projectLibrary.map(p=>({ published:p.published!==false, ...p }));
  syncFeaturedSnapshots();
}
function syncFeaturedSnapshots(){
  const selected = content.featuredProjectIds
    .map(id=>content.projectLibrary.find(p=>p.id===id))
    .filter(p=>p && p.published)
    .slice(0,6);
  content.featuredProjectIds = selected.map(p=>p.id);
  content.projects = selected.map(p=>({ id:p.id, title:p.title, city:p.city, category:p.category, image:p.image, description:p.description||'' }));
}
async function saveContent(){
  syncFeaturedSnapshots();
  await api('/api/admin/site-content',{method:'PUT',body:JSON.stringify(content)});
}
function escapeHtml(v){ return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function render(){
  const lib = [...content.projectLibrary].sort((a,b)=>String(b.createdAt||'').localeCompare(String(a.createdAt||'')));
  countText.textContent = `${lib.length} 个工程 · ${content.featuredProjectIds.length} 个首页精选`;
  if(!lib.length){ listEl.innerHTML='<div class="empty">还没有工程。点右上角“新增工程”开始。</div>'; return; }
  listEl.innerHTML = lib.map(p=>{
    const featured = content.featuredProjectIds.includes(p.id);
    return `<article class="project-row" data-id="${escapeHtml(p.id)}">
      <img src="${escapeHtml(p.image||'')}" alt="${escapeHtml(p.title||'工程图片')}">
      <div class="project-main"><h2>${escapeHtml(p.title||'未命名工程')}</h2><p>${escapeHtml(p.city||'未填城市')}${p.category?` · ${escapeHtml(p.category)}`:''}</p><div class="badges">${featured?'<span class="badge featured">首页精选</span>':''}${p.published===false?'<span class="badge hidden">已隐藏</span>':'<span class="badge">对外展示</span>'}</div></div>
      <div class="actions"><button data-feature="${escapeHtml(p.id)}">${featured?'移出首页':'放到首页'}</button><button class="primary" data-edit="${escapeHtml(p.id)}">编辑</button></div>
    </article>`;
  }).join('');
  listEl.querySelectorAll('[data-edit]').forEach(b=>b.addEventListener('click',()=>openEditor(b.dataset.edit)));
  listEl.querySelectorAll('[data-feature]').forEach(b=>b.addEventListener('click',()=>toggleFeatured(b.dataset.feature)));
}
function resetForm(){
  fields.id.value=''; fields.title.value=''; fields.city.value=''; fields.category.value='室内翻新'; fields.description.value=''; fields.published.checked=true; fields.featured.checked=false; fields.image.value=''; fields.preview.removeAttribute('src'); fields.uploadStatus.textContent=''; formStatus.textContent=''; document.getElementById('deleteProject').hidden=true; document.getElementById('dialogTitle').textContent='新增工程';
}
function openEditor(id=''){
  resetForm();
  if(id){
    const p=content.projectLibrary.find(x=>x.id===id); if(!p) return;
    fields.id.value=p.id; fields.title.value=p.title||''; fields.city.value=p.city||''; fields.category.value=p.category||'室内翻新'; fields.description.value=p.description||''; fields.published.checked=p.published!==false; fields.featured.checked=content.featuredProjectIds.includes(p.id); if(p.image) fields.preview.src=p.image; document.getElementById('deleteProject').hidden=false; document.getElementById('dialogTitle').textContent='编辑工程';
  }
  dialog.showModal();
}
async function uploadImageFor(projectId,file){
  if(!file) return '';
  fields.uploadStatus.textContent='正在上传图片…';
  const data=new FormData(); data.set('slot',`library-${projectId}`); data.set('file',file);
  const result=await api('/api/admin/media',{method:'POST',body:data});
  fields.uploadStatus.textContent='✓ 图片已上传';
  return result.url;
}
async function saveProject(){
  formStatus.textContent='正在保存…';
  try{
    const isNew=!fields.id.value;
    const id=fields.id.value||makeId();
    let current=content.projectLibrary.find(p=>p.id===id)||{id,createdAt:new Date().toISOString(),image:''};
    let image=current.image||'';
    if(fields.image.files?.[0]) image=await uploadImageFor(id,fields.image.files[0]);
    if(!fields.title.value.trim()) throw new Error('请填写工程标题');
    current={...current,id,title:fields.title.value.trim(),city:fields.city.value.trim(),category:fields.category.value,description:fields.description.value.trim(),published:fields.published.checked,image};
    if(isNew) content.projectLibrary.unshift(current); else content.projectLibrary=content.projectLibrary.map(p=>p.id===id?current:p);
    const wantsFeatured=fields.featured.checked;
    const hasFeatured=content.featuredProjectIds.includes(id);
    if(wantsFeatured&&!hasFeatured){
      if(content.featuredProjectIds.length>=6) throw new Error('首页最多 6 个精选工程。请先把一个旧项目移出首页。');
      content.featuredProjectIds.push(id);
    }
    if(!wantsFeatured&&hasFeatured) content.featuredProjectIds=content.featuredProjectIds.filter(x=>x!==id);
    if(current.published===false) content.featuredProjectIds=content.featuredProjectIds.filter(x=>x!==id);
    await saveContent(); render(); dialog.close();
  }catch(error){ formStatus.textContent=`保存失败：${error.message}`; }
}
async function toggleFeatured(id){
  const featured=content.featuredProjectIds.includes(id);
  if(featured) content.featuredProjectIds=content.featuredProjectIds.filter(x=>x!==id);
  else{
    const project=content.projectLibrary.find(p=>p.id===id); if(!project?.published){ window.alert('这个工程当前是隐藏状态，请先编辑并打开“对外展示”。'); return; }
    if(content.featuredProjectIds.length>=6){ window.alert('首页最多 6 个精选工程。请先移出一个。'); return; }
    content.featuredProjectIds.push(id);
  }
  try{ await saveContent(); render(); }catch(error){ window.alert(error.message); }
}
async function deleteCurrent(){
  const id=fields.id.value; if(!id) return;
  const p=content.projectLibrary.find(x=>x.id===id); if(!p) return;
  if(!window.confirm(`确定删除“${p.title}”吗？删除后不会再显示。`)) return;
  content.projectLibrary=content.projectLibrary.filter(x=>x.id!==id);
  content.featuredProjectIds=content.featuredProjectIds.filter(x=>x!==id);
  try{ await saveContent(); render(); dialog.close(); }catch(error){ formStatus.textContent=`删除失败：${error.message}`; }
}
async function init(){
  listEl.innerHTML='<div class="empty">正在读取工程案例…</div>';
  try{
    const saved=await api('/api/admin/site-content'); content=saved.content||{}; normalize(); await saveContent(); render();
  }catch(error){ listEl.innerHTML=`<div class="empty">无法读取后台：${escapeHtml(error.message)}<br><br><button id="retry">重新输入管理员密钥</button></div>`; document.getElementById('retry')?.addEventListener('click',()=>{if(getToken(true))init();}); }
}
document.getElementById('addProject').addEventListener('click',()=>openEditor());
document.getElementById('saveProject').addEventListener('click',saveProject);
document.getElementById('deleteProject').addEventListener('click',deleteCurrent);
fields.image.addEventListener('change',()=>{const file=fields.image.files?.[0];if(!file)return;fields.preview.src=URL.createObjectURL(file);});
init();