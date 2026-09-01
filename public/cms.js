(() => {
  const projectCards = Array.from(document.querySelectorAll('.project-card'));
  const heroMedia = document.querySelector('.hero-media');
  const before = document.querySelector('.compare-before');
  const after = document.querySelector('.compare-after');

  function setBg(el, url, overlay = false) {
    if (!el || !url) return;
    el.style.backgroundImage = overlay
      ? `linear-gradient(90deg,rgba(18,18,16,.76) 0%,rgba(18,18,16,.46) 38%,rgba(18,18,16,.06) 72%),url("${url}")`
      : `url("${url}")`;
  }

  function applyProject(card, project) {
    if (!card || !project) return;
    setBg(card.querySelector('.project-image'), project.image);
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
    }
  }

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
      (content.projects || []).slice(0, projectCards.length).forEach((project, index) => applyProject(projectCards[index], project));
      if (content.beforeAfter?.before) setBg(before, content.beforeAfter.before);
      if (content.beforeAfter?.after) setBg(after, content.beforeAfter.after);
    } catch (error) {
      console.warn('CMS content unavailable', error);
    }
  }

  load();
})();
