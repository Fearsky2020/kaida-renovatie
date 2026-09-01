(() => {
  const KEY = 'kaidaAdminToken';
  const THEME_KEY = 'kaida-theme';
  const originalSetItem = Storage.prototype.setItem;
  const originalRemoveItem = Storage.prototype.removeItem;

  try {
    const remembered = localStorage.getItem(KEY);
    if (remembered && !sessionStorage.getItem(KEY)) {
      originalSetItem.call(sessionStorage, KEY, remembered);
    }
  } catch {}

  Storage.prototype.setItem = function(key, value) {
    originalSetItem.call(this, key, value);
    if (this === sessionStorage && key === KEY) {
      try { originalSetItem.call(localStorage, KEY, value); } catch {}
    }
  };

  Storage.prototype.removeItem = function(key) {
    originalRemoveItem.call(this, key);
    if (this === sessionStorage && key === KEY) {
      try { originalRemoveItem.call(localStorage, KEY); } catch {}
    }
  };

  const media = window.matchMedia('(prefers-color-scheme: dark)');
  let rememberedTheme = null;
  try { rememberedTheme = localStorage.getItem(THEME_KEY); } catch {}

  function applyTheme(theme, persist = false) {
    const normalized = theme === 'dark' ? 'dark' : 'light';
    document.documentElement.dataset.theme = normalized;
    document.documentElement.style.colorScheme = normalized;
    if (persist) {
      try { localStorage.setItem(THEME_KEY, normalized); } catch {}
      rememberedTheme = normalized;
    }
    document.querySelectorAll('.admin-theme-toggle').forEach((button) => {
      const dark = normalized === 'dark';
      button.innerHTML = `<span class="theme-icon">${dark ? '☀️' : '🌙'}</span><span class="theme-label">${dark ? '亮色' : '暗色'}</span>`;
      button.setAttribute('aria-label', dark ? '切换到亮色模式' : '切换到暗色模式');
      button.title = dark ? '切换到亮色模式' : '切换到暗色模式';
    });
  }

  function currentTheme() {
    return document.documentElement.dataset.theme || (media.matches ? 'dark' : 'light');
  }

  applyTheme(rememberedTheme || (media.matches ? 'dark' : 'light'));

  function mountThemeToggle() {
    if (document.querySelector('.admin-theme-toggle')) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'admin-theme-toggle';
    button.addEventListener('click', () => applyTheme(currentTheme() === 'dark' ? 'light' : 'dark', true));

    const dashboardActions = document.querySelector('.top-actions');
    const inquiryHeader = document.querySelector('.admin-inquiries-page main > header');
    if (dashboardActions) {
      dashboardActions.prepend(button);
    } else if (inquiryHeader) {
      inquiryHeader.appendChild(button);
    } else {
      document.body.appendChild(button);
    }
    applyTheme(currentTheme());
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountThemeToggle, { once: true });
  } else {
    mountThemeToggle();
  }

  media.addEventListener?.('change', (event) => {
    if (!rememberedTheme) applyTheme(event.matches ? 'dark' : 'light');
  });
})();
