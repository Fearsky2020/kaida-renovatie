(() => {
  const tabs = Array.from(document.querySelectorAll('[data-admin-tab]'));
  const panels = Array.from(document.querySelectorAll('[data-admin-panel]'));
  const saveBar = document.getElementById('homepageSaveBar');

  function show(name, updateHash = true) {
    tabs.forEach((tab) => tab.classList.toggle('active', tab.dataset.adminTab === name));
    panels.forEach((panel) => {
      const active = panel.dataset.adminPanel === name;
      panel.hidden = !active;
      panel.classList.toggle('active', active);
    });
    if (saveBar) saveBar.hidden = name !== 'home';

    if (name === 'projects') window.KaidaProjects?.reload?.();
    if (name === 'home') window.KaidaHomepage?.reload?.();

    if (updateHash) history.replaceState(null, '', name === 'projects' ? '#projects' : '#home');
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  tabs.forEach((tab) => tab.addEventListener('click', () => show(tab.dataset.adminTab)));
  show(location.hash === '#projects' ? 'projects' : 'home', false);
})();
