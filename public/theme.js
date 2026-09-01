(() => {
  const KEY = 'kaida-theme';
  const root = document.documentElement;
  const media = window.matchMedia('(prefers-color-scheme: dark)');

  function preferredTheme() {
    const saved = localStorage.getItem(KEY);
    if (saved === 'light' || saved === 'dark') return saved;
    return media.matches ? 'dark' : 'light';
  }

  function apply(theme, remember = false) {
    root.dataset.theme = theme;
    root.style.colorScheme = theme;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#151714' : '#f5f1e9');
    document.querySelectorAll('[data-theme-toggle]').forEach(button => {
      const dark = theme === 'dark';
      button.textContent = dark ? '☀︎' : '☾';
      button.setAttribute('aria-label', dark ? '切换到浅色模式' : '切换到暗色模式');
      button.setAttribute('title', dark ? '浅色模式' : '暗色模式');
      button.setAttribute('aria-pressed', dark ? 'true' : 'false');
    });
    if (remember) localStorage.setItem(KEY, theme);
  }

  function toggle() {
    apply(root.dataset.theme === 'dark' ? 'light' : 'dark', true);
  }

  apply(preferredTheme());
  document.addEventListener('DOMContentLoaded', () => {
    apply(preferredTheme());
    document.querySelectorAll('[data-theme-toggle]').forEach(button => button.addEventListener('click', toggle));
  });
  media.addEventListener?.('change', event => {
    if (!localStorage.getItem(KEY)) apply(event.matches ? 'dark' : 'light');
  });
})();
