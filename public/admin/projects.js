(() => {
  const MAX_PROJECT_PHOTOS = 20;
  const listEl = document.getElementById('projectList');
  const countText = document.getElementById('countText');
  const dialog = document.getElementById('editorDialog');
  const formStatus = document.getElementById('formStatus');
  const photoGrid = document.getElementById('projectPhotoGrid');
  const photoCount = document.getElementById('photoCount');
  if (!listEl || !dialog) return;

  let adminToken = sessionStorage.getItem('kaidaAdminToken') || '';
  let content = { hero:{}, projects:[], beforeAfter:{}, projectLibrary:[], featuredProjectIds:[] };
  let photoItems = [];

  const fields = {
    id: document.getElementById('projectId'),
    title: document.getElementById('projectTitle'),
    city: document.getElementById('projectCity'),
    category: document.getElementById('projectCategory'),
    description: document.getElementById('projectDescription'),
    published: document.getElementById('projectPublished'),
    featured: document.getElementById('projectFeatured'),
    image: document.getElementById('projectImage'),
    camera: document.getElementById('projectCamera'),
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
    if(response.status===401){
      sessionStorage.removeItem('kaidaAdminToken');
      adminToken='';
      throw new Error('管理员密钥不正确');
    }
    const body = await response.json().catch(()=>({}));
    if(!response.ok) throw new Error(body.error||`请求失败 (${response.status})`);
    return body;
  }

  function makeId(){ return `project-${Date.now().toString(36)}-${crypto.randomUUID().slice(0,6)}`; }

  function projectImages(project){
    const list = Array.isArray(project?.images) ? project.images.filter(Boolean) : [];
    if(!list.length && project?.image) list.push(project.image);
    return list.slice(0,MAX_PROJECT_PHOTOS);
  }

  function normalize(){
    if(!Array.isArray(content.projectLibrary) || !content.projectLibrary.length){
      content.projectLibrary = (content.projects||[]).map((p,i)=>({
        id:p.id||`legacy-${i+1}`,
        title:p.title||`工程 ${i+1}`,
        city:p.city||'',
        category:p.category||'室内翻新',
        description:p.description||'',
        image:p.image||'',
        images:Array.isArray(p.images)&&p.images.length?p.images:(p.image?[p.image]:[]),
        published:true,
        createdAt:new Date(Date.now()-i*1000).toISOString(),
      }));
    }
    if(!Array.isArray(content.featuredProjectIds) || !content.featuredProjectIds.length){
      content.featuredProjectIds = content.projectLibrary.slice(0,6).map(p=>p.id);
    }
    content.projectLibrary = content.projectLibrary.map(p=>{
      const images=projectImages(p);
      return { published:p.published!==false, ...p, images, image:images[0]||p.image||'' };
    });
    syncFeaturedSnapshots();
  }

  function syncFeaturedSnapshots(){
    const selected = content.featuredProjectIds
      .map(id=>content.projectLibrary.find(p=>p.id===id))
      .filter(p=>p && p.published)
      .slice(0,6);
    content.featuredProjectIds = selected.map(p=>p.id);
    content.projects = selected.map(p=>({
      id:p.id,
      title:p.title,
      city:p.city,
      category:p.category,
      image:p.image,
      images:projectImages(p),
      description:p.description||'',
    }));
  }

  async function saveContent(){
    syncFeaturedSnapshots();
    await api('/api/admin/site-content',{method:'PUT',body:JSON.stringify(content)});
  }

  function escapeHtml(v){
    return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  function render(){
    const lib = [...content.projectLibrary].sort((a,b)=>String(b.createdAt||'').localeCompare(String(a.createdAt||'')));
    countText.textContent = `${lib.length} 个工程 · ${content.featuredProjectIds.length} 个首页精选`;
    if(!lib.length){
      listEl.innerHTML='<div class="projects-empty">还没有工程。点“新增工程”开始。</div>';
      return;
    }
    listEl.innerHTML = lib.map(p=>{
      const featured = content.featuredProjectIds.includes(p.id);
      const images = projectImages(p);
      const image = images[0]
        ? `<img src="${escapeHtml(images[0])}" alt="${escapeHtml(p.title||'工程图片')}">`
        : '<div class="project-row-placeholder">暂无图片</div>';
      return `<article class="project-row" data-id="${escapeHtml(p.id)}">
        ${image}
        <div class="project-main">
          <h2>${escapeHtml(p.title||'未命名工程')}</h2>
          <p>${escapeHtml(p.city||'未填城市')}${p.category?` · ${escapeHtml(p.category)}`:''}${images.length?` · ${images.length} 张照片`:''}</p>
          <div class="badges">${featured?'<span class="badge featured">首页精选</span>':''}${p.published===false?'<span class="badge hidden">已隐藏</span>':'<span class="badge">对外展示</span>'}</div>
        </div>
        <div class="project-actions">
          <button type="button" data-feature="${escapeHtml(p.id)}">${featured?'移出首页':'放到首页'}</button>
          <button type="button" class="primary" data-edit="${escapeHtml(p.id)}">编辑</button>
        </div>
      </article>`;
    }).join('');
    listEl.querySelectorAll('[data-edit]').forEach(b=>b.addEventListener('click',()=>openEditor(b.dataset.edit)));
    listEl.querySelectorAll('[data-feature]').forEach(b=>b.addEventListener('click',()=>toggleFeatured(b.dataset.feature)));
  }

  function releasePhotoItems(){
    photoItems.forEach(item=>{ if(item.kind==='file'&&item.preview) URL.revokeObjectURL(item.preview); });
    photoItems=[];
  }

  function renderPhotoGrid(){
    if(photoCount) photoCount.textContent=`${photoItems.length} / ${MAX_PROJECT_PHOTOS} 张`;
    if(!photoGrid) return;
    if(!photoItems.length){
      photoGrid.innerHTML='<div class="project-photo-empty">还没添加照片</div>';
      return;
    }
    photoGrid.innerHTML=photoItems.map((item,index)=>{
      const src=item.kind==='url'?item.url:item.preview;
      return `<article class="project-photo-item" data-photo-index="${index}">
        <img src="${escapeHtml(src)}" alt="工程照片 ${index+1}">
        ${index===0?'<span class="cover-badge">封面</span>':''}
        <div class="project-photo-actions">
          ${index===0?'':'<button type="button" data-cover>设封面</button>'}
          <button type="button" data-remove>删除</button>
        </div>
      </article>`;
    }).join('');
    photoGrid.querySelectorAll('[data-cover]').forEach(btn=>btn.addEventListener('click',()=>{
      const item=btn.closest('[data-photo-index]');
      const index=Number(item?.dataset.photoIndex);
      if(!Number.isInteger(index)||index<=0)return;
      const [picked]=photoItems.splice(index,1);
      photoItems.unshift(picked);
      renderPhotoGrid();
    }));
    photoGrid.querySelectorAll('[data-remove]').forEach(btn=>btn.addEventListener('click',()=>{
      const item=btn.closest('[data-photo-index]');
      const index=Number(item?.dataset.photoIndex);
      if(!Number.isInteger(index))return;
      const [removed]=photoItems.splice(index,1);
      if(removed?.kind==='file'&&removed.preview) URL.revokeObjectURL(removed.preview);
      renderPhotoGrid();
    }));
  }

  function resetForm(){
    releasePhotoItems();
    fields.id.value='';
    fields.title.value='';
    fields.city.value='';
    fields.category.value='室内翻新';
    fields.description.value='';
    fields.published.checked=true;
    fields.featured.checked=false;
    fields.image.value='';
    if(fields.camera) fields.camera.value='';
    fields.uploadStatus.textContent='一次可以选很多张，也可以之后继续追加。最多 20 张。';
    formStatus.textContent='';
    renderPhotoGrid();
    document.getElementById('deleteProject').hidden=true;
    document.getElementById('dialogTitle').textContent='新增工程';
  }

  function openEditor(id=''){
    resetForm();
    if(id){
      const p=content.projectLibrary.find(x=>x.id===id);
      if(!p) return;
      fields.id.value=p.id;
      fields.title.value=p.title||'';
      fields.city.value=p.city||'';
      fields.category.value=p.category||'室内翻新';
      fields.description.value=p.description||'';
      fields.published.checked=p.published!==false;
      fields.featured.checked=content.featuredProjectIds.includes(p.id);
      photoItems=projectImages(p).map(url=>({kind:'url',url}));
      renderPhotoGrid();
      document.getElementById('deleteProject').hidden=false;
      document.getElementById('dialogTitle').textContent='编辑工程';
    }
    dialog.showModal();
  }

  function closeEditor(){
    releasePhotoItems();
    formStatus.textContent='';
    if(dialog.open) dialog.close();
  }

  function addFiles(files, source='相册'){
    const incoming=Array.from(files||[]).filter(Boolean);
    if(!incoming.length)return;
    const room=MAX_PROJECT_PHOTOS-photoItems.length;
    if(room<=0){ fields.uploadStatus.textContent='已经有 20 张了，请先删除一些。'; return; }
    const accepted=incoming.slice(0,room);
    accepted.forEach(file=>photoItems.push({kind:'file',file,preview:URL.createObjectURL(file)}));
    fields.uploadStatus.textContent=`已从${source}加入 ${accepted.length} 张${incoming.length>accepted.length?'，超过 20 张的部分没有加入。':''}`;
    renderPhotoGrid();
    fields.image.value='';
    if(fields.camera) fields.camera.value='';
  }

  async function uploadOne(projectId,item,index,total){
    if(item.kind==='url') return item.url;
    fields.uploadStatus.textContent=`正在处理并上传第 ${index+1}/${total} 张…`;
    const prepared=await (window.KaidaImage?.prepare?.(item.file)||Promise.resolve(item.file));
    const data=new FormData();
    data.set('slot',`library-${projectId}`);
    data.set('file',prepared,prepared.name||`photo-${index+1}.jpg`);
    const result=await api('/api/admin/media',{method:'POST',body:data});
    return result.url;
  }

  async function uploadAll(projectId){
    const urls=[];
    for(let i=0;i<photoItems.length;i+=1){
      urls.push(await uploadOne(projectId,photoItems[i],i,photoItems.length));
    }
    fields.uploadStatus.textContent=`✓ ${urls.length} 张照片已永久保存`;
    return urls;
  }

  async function saveProject(){
    formStatus.textContent='';
    const title = fields.title.value.trim();
    if(!title){
      formStatus.textContent='请先写一个工程标题。';
      fields.title.focus();
      return;
    }

    formStatus.textContent='正在保存…';
    try{
      const isNew=!fields.id.value;
      const id=fields.id.value||makeId();
      let current=content.projectLibrary.find(p=>p.id===id)||{id,createdAt:new Date().toISOString(),image:'',images:[]};
      const images=await uploadAll(id);
      current={
        ...current,
        id,
        title,
        city:fields.city.value.trim(),
        category:fields.category.value,
        description:fields.description.value.trim(),
        published:fields.published.checked,
        images,
        image:images[0]||'',
      };
      if(isNew) content.projectLibrary.unshift(current);
      else content.projectLibrary=content.projectLibrary.map(p=>p.id===id?current:p);

      const wantsFeatured=fields.featured.checked;
      const hasFeatured=content.featuredProjectIds.includes(id);
      if(wantsFeatured&&!hasFeatured){
        if(content.featuredProjectIds.length>=6) throw new Error('首页已经有 6 个精选。请先把一个旧项目移出首页。');
        content.featuredProjectIds.push(id);
      }
      if(!wantsFeatured&&hasFeatured) content.featuredProjectIds=content.featuredProjectIds.filter(x=>x!==id);
      if(current.published===false) content.featuredProjectIds=content.featuredProjectIds.filter(x=>x!==id);

      await saveContent();
      render();
      closeEditor();
      window.KaidaHomepage?.reload?.();
    }catch(error){
      formStatus.textContent=`保存失败：${error.message}`;
    }
  }

  async function toggleFeatured(id){
    const featured=content.featuredProjectIds.includes(id);
    if(featured){
      content.featuredProjectIds=content.featuredProjectIds.filter(x=>x!==id);
    }else{
      const project=content.projectLibrary.find(p=>p.id===id);
      if(!project?.published){ window.alert('这个工程当前是隐藏状态，请先编辑并打开“对外展示”。'); return; }
      if(content.featuredProjectIds.length>=6){ window.alert('首页最多 6 个精选工程。请先移出一个。'); return; }
      content.featuredProjectIds.push(id);
    }
    try{
      await saveContent();
      render();
      window.KaidaHomepage?.reload?.();
    }catch(error){ window.alert(error.message); }
  }

  async function deleteCurrent(){
    const id=fields.id.value;
    if(!id) return;
    const p=content.projectLibrary.find(x=>x.id===id);
    if(!p) return;
    if(!window.confirm(`确定删除“${p.title}”吗？删除后不会再显示。`)) return;
    content.projectLibrary=content.projectLibrary.filter(x=>x.id!==id);
    content.featuredProjectIds=content.featuredProjectIds.filter(x=>x!==id);
    try{
      await saveContent();
      render();
      closeEditor();
      window.KaidaHomepage?.reload?.();
    }catch(error){ formStatus.textContent=`删除失败：${error.message}`; }
  }

  function stopStream(stream){
    try{ stream?.getTracks?.().forEach(track=>track.stop()); }catch{}
  }

  async function openCamera(){
    fields.uploadStatus.textContent='正在打开相机…';
    if(!navigator.mediaDevices?.getUserMedia){
      fields.uploadStatus.textContent='当前浏览器不支持网页相机，正在调用系统相机…';
      fields.camera?.click();
      return;
    }
    let stream;
    try{
      stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}},audio:false});
      const overlay=document.createElement('div');
      overlay.className='kaida-camera-overlay';
      overlay.innerHTML='<div class="kaida-camera-card"><video playsinline autoplay></video><div class="kaida-camera-controls"><button type="button" data-cancel>取消</button><button class="primary" type="button" data-shot>拍照</button></div></div>';
      document.body.appendChild(overlay);
      const video=overlay.querySelector('video');
      video.srcObject=stream;
      await video.play();
      const close=()=>{stopStream(stream);overlay.remove();};
      overlay.querySelector('[data-cancel]').addEventListener('click',close);
      overlay.querySelector('[data-shot]').addEventListener('click',()=>{
        const width=video.videoWidth||1280;
        const height=video.videoHeight||960;
        const canvas=document.createElement('canvas');
        canvas.width=width;canvas.height=height;
        canvas.getContext('2d').drawImage(video,0,0,width,height);
        canvas.toBlob(blob=>{
          if(blob){
            const file=new File([blob],`kaida-${Date.now()}.jpg`,{type:'image/jpeg',lastModified:Date.now()});
            addFiles([file],'相机');
          }
          close();
        },'image/jpeg',0.9);
      });
    }catch(error){
      stopStream(stream);
      console.warn('Camera API unavailable',error);
      fields.uploadStatus.textContent='这个内置浏览器没有给网页相机权限；可以直接用“从相册多选”。';
      fields.camera?.click();
    }
  }

  async function init(){
    listEl.innerHTML='<div class="projects-empty">正在读取工程案例…</div>';
    try{
      const saved=await api('/api/admin/site-content');
      content=saved.content||{};
      normalize();
      await saveContent();
      render();
    }catch(error){
      listEl.innerHTML=`<div class="projects-empty">无法读取后台：${escapeHtml(error.message)}<br><br><button type="button" id="retryProjects">重新输入管理员密钥</button></div>`;
      document.getElementById('retryProjects')?.addEventListener('click',()=>{if(getToken(true))init();});
    }
  }

  document.getElementById('addProject')?.addEventListener('click',()=>openEditor());
  document.getElementById('saveProject')?.addEventListener('click',saveProject);
  document.getElementById('deleteProject')?.addEventListener('click',deleteCurrent);
  document.getElementById('cancelProject')?.addEventListener('click',closeEditor);
  document.getElementById('closeProjectDialog')?.addEventListener('click',closeEditor);
  document.getElementById('openCamera')?.addEventListener('click',openCamera);
  dialog.addEventListener('click',(event)=>{ if(event.target===dialog) closeEditor(); });

  fields.image?.addEventListener('change',()=>addFiles(fields.image.files,'相册'));
  fields.camera?.addEventListener('change',()=>addFiles(fields.camera.files,'相机'));

  window.KaidaProjects = { reload:init };
  init();
})();
