(() => {
  const projectCards = Array.from(document.querySelectorAll('.project-card'));
  const heroMedia = document.querySelector('.hero-media');
  const before = document.querySelector('.compare-before');
  const after = document.querySelector('.compare-after');
  const allProjectsLink = document.querySelector('.center-actions .text-link');
  const langToggle = document.getElementById('langToggle');
  const LANG_KEY = 'kaida-lang';
  let visibleProjects = [];
  let lightbox = null;
  let activeProject = null;
  let activePhoto = 0;

  const categoryNl = {
    '全屋定制': 'Interieur op maat',
    '室内翻新': 'Interieurrenovatie',
    '餐馆装修': 'Restaurantverbouwing',
    '花园翻新': 'Tuinrenovatie',
    '橱柜定制': 'Maatwerk kasten',
    '卫浴翻新': 'Badkamer & toilet',
    '厕所 淋浴房': 'Badkamer & toilet',
    '厕所/淋浴房': 'Badkamer & toilet'
  };

  function currentLang() {
    return langToggle?.textContent?.trim() === '中文' ? 'nl' : 'zh';
  }

  function hasCjk(value) {
    return /[\u3400-\u9fff]/.test(String(value || ''));
  }

  function categoryText(project) {
    const category = project?.category || '';
    if (currentLang() !== 'nl') return category;
    return project?.categoryNl || categoryNl[category] || (hasCjk(category) ? 'Renovatieproject' : category);
  }

  function titleText(project) {
    const title = project?.title || '';
    if (currentLang() !== 'nl') return title || '工程案例';
    if (project?.titleNl) return project.titleNl;
    if (title && !hasCjk(title)) return title;
    const type = categoryText(project) || 'Renovatieproject';
    return project?.city ? `${type} · ${project.city}` : type;
  }

  function descriptionText(project) {
    const description = project?.description || '';
    if (currentLang() !== 'nl') return description;
    if (project?.descriptionNl) return project.descriptionNl;
    return hasCjk(description) ? '' : description;
  }

  function syncProjectLink() {
    if (allProjectsLink) allProjectsLink.href = `projects.html?lang=${currentLang()}`;
  }

  function syncLocaleExtras() {
    const nl = currentLang() === 'nl';
    try { localStorage.setItem(LANG_KEY, nl ? 'nl' : 'zh'); } catch {}
    syncProjectLink();

    const brandTitle = document.querySelector('.site-header .brand-cn');
    if (brandTitle) brandTitle.textContent = nl ? 'KAIDA RENOVATIE' : '凯达装修';
    const footerTitle = document.querySelector('.site-footer .footer-brand-copy strong');
    if (footerTitle) footerTitle.textContent = nl ? 'KAIDA RENOVATIE' : '凯达装修';

    const trustItems = document.querySelectorAll('.trust-strip .trust-item');
    if (trustItems[0]) {
      const strong = trustItems[0].querySelector('strong');
      const span = trustItems[0].querySelector('span');
      if (strong) strong.textContent = nl ? 'Woning & bedrijfsruimte' : '住宅与商业空间';
      if (span) span.textContent = nl ? 'Maatwerk · renovatie · uitvoering' : '定制 · 翻新 · 施工';
    }
    if (trustItems[1]) {
      const strong = trustItems[1].querySelector('strong');
      const span = trustItems[1].querySelector('span');
      if (strong) strong.textContent = nl ? 'Van inmeten tot montage' : '从测量到安装';
      if (span) span.textContent = nl ? 'Eén duidelijk traject, één team' : '一套流程完成，沟通更清楚';
    }

    const directLinks = document.querySelectorAll('.contact-direct a');
    if (directLinks[0]) directLinks[0].textContent = nl ? 'Telefoon: +31 6 2119 1341' : '电话：+31 6 2119 1341';
    if (directLinks[1]) directLinks[1].textContent = nl ? 'E-mail: kailunlin0824@gmail.com' : '邮箱：kailunlin0824@gmail.com';

    const privacyLink = document.querySelector('.footer-links a[href="privacy.html"]');
    if (privacyLink) privacyLink.textContent = nl ? 'Privacy' : '隐私说明';

    const consent = document.querySelector('#quoteForm .consent span');
    if (consent) {
      consent.innerHTML = nl
        ? 'Ik geef toestemming om mijn gegevens te bewaren en contact met mij op te nemen. <a href="privacy.html" target="_blank" rel="noopener">Privacy</a>'
        : '我同意凯达装修保存这些资料并联系我。 <a href="privacy.html" target="_blank" rel="noopener">隐私说明</a>';
    }

    document.querySelectorAll('.brand-mark').forEach((img) => {
      img.src = 'assets/kaida-mark.svg?v=20260901-2245';
    });

    visibleProjects.forEach((project, index) => applyProject(projectCards[index], project, index));
    if (lightbox && !lightbox.hidden && activeProject) renderLightboxText();
  }

  function mountThemeToggle() {
    const actions = document.querySelector('.header-actions');
    if (!actions || actions.querySelector('[data-theme-toggle]')) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'theme-toggle';
    button.dataset.themeToggle = '';
    button.setAttribute('aria-label', '切换明暗模式');
    actions.insertBefore(button, langToggle || actions.firstChild);

    if (!document.querySelector('script[data-kaida-theme]')) {
      const script = document.createElement('script');
      script.src = 'theme.js?v=20260901-2245';
      script.dataset.kaidaTheme = '1';
      document.body.appendChild(script);
    }
  }

  try {
    const savedLang = localStorage.getItem(LANG_KEY);
    if (savedLang === 'nl' && currentLang() !== 'nl') langToggle?.click();
  } catch {}

  langToggle?.addEventListener('click', () => setTimeout(syncLocaleExtras, 0));
  mountThemeToggle();
  syncLocaleExtras();

  if (!document.querySelector('link[href="project-gallery.css"]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'project-gallery.css?v=20260901-2230';
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
    if (title) {
      title.removeAttribute('data-i18n');
      title.textContent = titleText(project);
    }
    if (meta) {
      meta.innerHTML = '';
      const category = categoryText(project);
      meta.append(document.createTextNode(`${project.city || ''}${project.city && category ? ' · ' : ''}`));
      const cat = document.createElement('span');
      cat.textContent = category;
      meta.appendChild(cat);
      if (photos.length > 1) {
        meta.append(document.createTextNode(currentLang() === 'nl' ? ` · ${photos.length} foto’s` : ` · ${photos.length} 张`));
      }
    }
    card.dataset.projectIndex = String(index);
    card.tabIndex = 0;
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', currentLang() === 'nl' ? `Bekijk foto's van ${titleText(project)}` : `查看 ${titleText(project)} 的照片`);
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

  function renderLightboxText() {
    if (!activeProject || !lightbox) return;
    lightbox.querySelector('h2').textContent = titleText(activeProject);
    lightbox.querySelector('.project-lightbox-meta').textContent = [activeProject.city, categoryText(activeProject)].filter(Boolean).join(' · ');
    lightbox.querySelector('.project-lightbox-desc').textContent = descriptionText(activeProject);
    lightbox.querySelector('.project-lightbox-desc').hidden = !descriptionText(activeProject);
  }

  function renderActivePhoto() {
    if (!activeProject || !lightbox) return;
    const photos = photosOf(activeProject);
    if (!photos.length) return;
    activePhoto = (activePhoto + photos.length) % photos.length;
    const img = lightbox.querySelector('.project-lightbox-media img');
    img.src = photos[activePhoto];
    img.alt = currentLang() === 'nl' ? `${titleText(activeProject)} · foto ${activePhoto + 1}` : `${titleText(activeProject)} · 照片 ${activePhoto + 1}`;
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
    renderLightboxText();
    const thumbs = root.querySelector('.project-lightbox-thumbs');
    thumbs.innerHTML = '';
    photos.forEach((url, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.setAttribute('aria-label', currentLang() === 'nl' ? `Bekijk foto ${index + 1}` : `查看第 ${index + 1} 张`);
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
