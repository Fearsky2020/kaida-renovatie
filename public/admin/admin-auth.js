(() => {
  const KEY = 'kaidaAdminToken';
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
})();
