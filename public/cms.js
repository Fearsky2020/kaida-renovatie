(() => {
  const projectCards = Array.from(document.querySelectorAll('.project-card'));
  const heroMedia = document.querySelector('.hero-media');
  const before = document.querySelector('.compare-before');
  const after = document.querySelector('.compare-after');
  const allProjectsLink = document.querySelector('.center-actions .text-link');
  let visibleProjects = [];
  let lightbox = null;
  let activeProject = null;
  let activePhoto = 0;

  if (allProjectsLink) allProjectsLink.href = 'projects.html';

  if (!document.querySelector('link[href="project-gallery.css"]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'project-gallery.css';
    document.head.appendChild(link);
  }

  function setBg(el, url, overlay = false) {
    if (!el || !url) return;
    el.style.backgroundImage = overlay
      ? `linear-gradient(90deg,rgba(18,18,16,.76) 0%,rgba(18,18,16,.46) 38%,rgba(18,18,16,.06) 72%),url("${url}")`
      : `url("${url}")`;
  }

  function photosOf(project) {
    const images = Array.isArray(project?.images) ? project.images.filter(Boolean) : [];
    if (!images.length && project?.image) images.push(project.image);
    return images;
  }

  function applyProject(card, project, index) {
    if (!card || !project) return;
    const photos = photosOf(project);
    setBg(card.querySelector('.project-image'), photos[0] || project.image);
    const title = card.querySelector('h3');
    const meta = card.querySelector('.project-meta p');
    if (title && project.title) {
      title.removeAttribute('data-i18n');
      title.textContent = project.title;
    }
    if (meta && (project.city || project.category)) {
      meta.innerHTML = '';
      meta.append(document.createTextNode(`${project.city || ''}${project.city && project.category ? ' · ' : ''}`));
      const cat = document.createElement('span');
      cat.textContent = project.category || '';
      meta.appendChild(cat);
      if (photos.length > 1) meta.append(document.createTextNode(` · ${photos.length} 张`));
    }
    card.dataset.projectIndex = String(index);
    card.tabIndex = 0;
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', `查看 ${project.title || '工程'} 的照片`);
  }

  function ensureLightbox() {
    if (lightbox) return lightbox;
    const root = document.createElement('div');
    root.className = 'project-lightbox';
    root.hidden = true;
    root.innerHTML = `
      <div class="project-lightbox-card" role="dialog" aria-modal="true" aria-label="工程案例照片">
        <div class="project-lightbox-media">
          <button class="project-lightbox-close" type="button" aria-label="关闭">×</button>
          <button class="project-lightbox-prev" type="button" aria-label="上一张">‹</button>
          <img alt="工程照片">
          <button class="project-lightbox-next" type="button" aria-label="下一张">›</button>
        </div>
        <div class="project-lightbox-info">
          <h2></h2>
          <p class="project-lightbox-meta"></p>
          <div class="project-lightbox-desc"></div>
          <div class="project-lightbox-count"></div>
          <div class="project-lightbox-thumbs"></div>
        </div>
      </div>`;
    document.body.appendChild(root);
    root.querySelector('.project-lightbox-close').addEventListener('click', closeGallery);
    root.querySelector('.project-lightbox-prev').addEventListener('click', () => movePhoto(-1));
    root.querySelector('.project-lightbox-next').addEventListener('click', () => movePhoto(1));
    root.addEventListener('click', (event) => { if (event.target === root) closeGallery(); });
    let touchStartX = 0;
    root.querySelector('.project-lightbox-media').addEventListener('touchstart', (event) => {
      touchStartX = event.changedTouches?.[0]?.clientX || 0;
    }, { passive: true });
    root.querySelector('.project-lightbox-media').addEventListener('touchend', (event) => {
      const endX = event.changedTouches?.[0]?.clientX || 0;
      const delta = endX - touchStartX;
      if (Math.abs(delta) > 45) movePhoto(delta > 0 ? -1 : 1);
    }, { passive: true });
    lightbox = root;
    return root;
  }

  function renderActivePhoto() {
    if (!activeProject || !lightbox) return;
    const photos = photosOf(activeProject);
    if (!photos.length) return;
    activePhoto = (activePhoto + photos.length) % photos.length;
    const img = lightbox.querySelector('.project-lightbox-media img');
    img.src = photos[activePhoto];
    img.alt = `${activeProject.title || '工程'} · 照片 ${activePhoto + 1}`;
    lightbox.querySelector('.project-lightbox-count').textContent = `${activePhoto + 1} / ${photos.length}`;
    const prev = lightbox.querySelector('.project-lightbox-prev');
    const next = lightbox.querySelector('.project-lightbox-next');
    prev.hidden = photos.length < 2;
    next.hidden = photos.length < 2;
    lightbox.querySelectorAll('.project-lightbox-thumbs button').forEach((button, index) => {
      button.classList.toggle('active', index === activePhoto);
    });
  }

  function openGallery(project) {
    const photos = photosOf(project);
    if (!project || !photos.length) return;
    const root = ensureLightbox();
    activeProject = project;
    activePhoto = 0;
    root.querySelector('h2').textContent = project.title || '工程案例';
    root.querySelector('.project-lightbox-meta').textContent = [project.city, project.category].filter(Boolean).join(' · ');
    root.querySelector('.project-lightbox-desc').textContent = project.description || '';
    const thumbs = root.querySelector('.project-lightbox-thumbs');
    thumbs.innerHTML = '';
    photos.forEach((url, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.setAttribute('aria-label', `查看第 ${index + 1} 张`);
      const image = document.createElement('img');
      image.src = url;
      image.alt = '';
      button.appendChild(image);
      button.addEventListener('click', () => { activePhoto = index; renderActivePhoto(); });
      thumbs.appendChild(button);
    });
    root.hidden = false;
    document.documentElement.style.overflow = 'hidden';
    renderActivePhoto();
  }

  function closeGallery() {
    if (!lightbox) return;
    lightbox.hidden = true;
    document.documentElement.style.overflow = '';
    activeProject = null;
  }

  function movePhoto(delta) {
    if (!activeProject) return;
    activePhoto += delta;
    renderActivePhoto();
  }

  projectCards.forEach((card) => {
    card.addEventListener('click', () => {
      const project = visibleProjects[Number(card.dataset.projectIndex)];
      if (project) openGallery(project);
    });
    card.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      const project = visibleProjects[Number(card.dataset.projectIndex)];
      if (project) openGallery(project);
    });
  });

  document.addEventListener('keydown', (event) => {
    if (!lightbox || lightbox.hidden) return;
    if (event.key === 'Escape') closeGallery();
    if (event.key === 'ArrowLeft') movePhoto(-1);
    if (event.key === 'ArrowRight') movePhoto(1);
  });

  async function load() {
    try {
      const response = await fetch('/api/site-content', { headers: { Accept: 'application/json' } });
      if (!response.ok) return;
      const body = await response.json();
      const content = body.content || {};
      if (content.hero?.image) setBg(heroMedia, content.hero.image, true);
      if (content.hero?.city) {
        const city = heroMedia?.querySelector('.image-label strong');
        if (city) city.textContent = content.hero.city;
      }
      visibleProjects = (content.projects || []).slice(0, projectCards.length);
      visibleProjects.forEach((project, index) => applyProject(projectCards[index], project, index));
      if (content.beforeAfter?.before) setBg(before, content.beforeAfter.before);
      if (content.beforeAfter?.after) setBg(after, content.beforeAfter.after);
    } catch (error) {
      console.warn('CMS content unavailable', error);
    }
  }

  load();
})();
