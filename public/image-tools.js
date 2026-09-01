(() => {
  const MB = 1024 * 1024;

  function loadImage(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      const done = () => URL.revokeObjectURL(url);
      img.onload = () => { done(); resolve(img); };
      img.onerror = () => { done(); reject(new Error('浏览器无法读取这张图片')); };
      img.src = url;
    });
  }

  function canvasBlob(canvas, type, quality) {
    return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
  }

  async function prepare(file, options = {}) {
    if (!file) return file;
    const maxEdge = Number(options.maxEdge) || 2400;
    const targetBytes = Number(options.targetBytes) || 4 * MB;
    const quality = Number(options.quality) || 0.86;
    const name = String(file.name || 'photo');
    const type = String(file.type || '').toLowerCase();
    const heicLike = /image\/(heic|heif)/.test(type) || /\.(heic|heif)$/i.test(name);
    const webReady = /image\/(jpeg|jpg|png|webp|avif)/.test(type);

    // Ordinary web-ready photos under 4 MB do not need any work.
    if (webReady && !heicLike && file.size <= targetBytes) return file;

    try {
      const img = await loadImage(file);
      const width = img.naturalWidth || img.width;
      const height = img.naturalHeight || img.height;
      if (!width || !height) return file;

      const scale = Math.min(1, maxEdge / Math.max(width, height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(width * scale));
      canvas.height = Math.max(1, Math.round(height * scale));
      const ctx = canvas.getContext('2d', { alpha: false });
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      let blob = await canvasBlob(canvas, 'image/jpeg', quality);
      if (!blob) return file;
      if (blob.size > targetBytes) {
        blob = await canvasBlob(canvas, 'image/jpeg', 0.74) || blob;
      }

      const base = name.replace(/\.[^.]+$/, '').slice(0, 120) || 'photo';
      return new File([blob], `${base}.jpg`, {
        type: 'image/jpeg',
        lastModified: Date.now(),
      });
    } catch (error) {
      console.warn('Kaida image optimisation skipped', error);
      return file;
    }
  }

  async function prepareMany(files, onProgress) {
    const output = [];
    const input = Array.from(files || []);
    for (let i = 0; i < input.length; i += 1) {
      if (typeof onProgress === 'function') onProgress(i + 1, input.length);
      output.push(await prepare(input[i]));
    }
    return output;
  }

  function formatBytes(bytes) {
    const value = Number(bytes) || 0;
    if (value < MB) return `${Math.max(1, Math.round(value / 1024))} KB`;
    return `${(value / MB).toFixed(1)} MB`;
  }

  window.KaidaImage = { prepare, prepareMany, formatBytes };
})();
