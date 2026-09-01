(() => {
  const CONTACTS = {
    email: 'kailunlin0824@gmail.com',
    phoneDisplay: '06 2119 1341',
    phoneE164: '+31621191341',
    whatsappDigits: '31621191341',
    wechatId: 'linkailunLKL5566',
    wechatUrl: 'https://u.wechat.com/kCozOqTzL7Mo8-3Khw6a9nM?s=2',
  };

  function ensureStylesheet(href) {
    if (document.querySelector(`link[href="${href}"]`)) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
  }

  function ensureImageTools() {
    if (window.KaidaImage) return Promise.resolve(window.KaidaImage);
    return new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-kaida-image-tools]');
      if (existing) {
        existing.addEventListener('load', () => resolve(window.KaidaImage), { once: true });
        existing.addEventListener('error', reject, { once: true });
        return;
      }
      const script = document.createElement('script');
      script.src = 'image-tools.js';
      script.dataset.kaidaImageTools = '1';
      script.onload = () => resolve(window.KaidaImage);
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  ensureStylesheet('brand-icons.css');
  ensureStylesheet('inquiry.css');
  ensureStylesheet('mobile-focus.css');

  const brand = document.querySelector('.site-header .brand');
  if (brand) {
    brand.innerHTML = `
      <img class="brand-mark" src="assets/kaida-mark.svg" alt="" aria-hidden="true">
      <span class="brand-copy">
        <span class="brand-cn">凯达装修</span>
        <span class="brand-sub">KAIDA RENOVATIE & MAATWERK</span>
      </span>`;
  }

  const footerBrand = document.querySelector('.site-footer > div:first-child');
  if (footerBrand) {
    footerBrand.classList.add('footer-brand');
    footerBrand.innerHTML = `
      <img class="brand-mark" src="assets/kaida-mark.svg" alt="凯达装修">
      <span class="footer-brand-copy"><strong>凯达装修</strong><span>KAIDA RENOVATIE & MAATWERK</span></span>`;
  }

  const aboutIcons = [
    '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="m10 33 19-19 5 5-19 19H10z"/><path d="m27 12 3-3 9 9-3 3"/><path d="M17 28l3 3M22 23l3 3"/></svg>',
    '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="m24 6 5 9 10 2-7 8 1 11-9-5-9 5 1-11-7-8 10-2z"/><path d="m19 24 3 3 7-8"/></svg>',
    '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M24 6 9 12v11c0 10 6 16 15 20 9-4 15-10 15-20V12z"/><path d="m17 24 5 5 10-11"/></svg>',
    '<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="7" y="13" width="34" height="25" rx="4"/><path d="m16 13 3-5h10l3 5"/><circle cx="24" cy="25.5" r="7"/></svg>',
  ];
  document.querySelectorAll('.about-points article').forEach((article, index) => {
    const icon = document.createElement('span');
    icon.className = 'about-icon';
    icon.innerHTML = aboutIcons[index] || aboutIcons[0];
    article.prepend(icon);
  });

  document.querySelectorAll('a[href="https://wa.me/31600000000"]').forEach((link) => {
    link.href = `https://wa.me/${CONTACTS.whatsappDigits}`;
    link.title = `WhatsApp ${CONTACTS.phoneDisplay}`;
  });
  document.querySelectorAll('a[href="mailto:info@example.nl"]').forEach((link) => {
    link.href = `mailto:${CONTACTS.email}`;
    link.title = CONTACTS.email;
    if (link.textContent.trim() === 'Email') link.textContent = CONTACTS.email;
  });

  const contactCopy = document.querySelector('.contact-copy');
  if (contactCopy && !contactCopy.querySelector('.contact-direct')) {
    const direct = document.createElement('div');
    direct.className = 'contact-direct';
    direct.innerHTML = `
      <a href="tel:${CONTACTS.phoneE164}">电话：${CONTACTS.phoneDisplay}</a>
      <a href="mailto:${CONTACTS.email}">邮箱：${CONTACTS.email}</a>`;
    contactCopy.appendChild(direct);
  }

  const qrPlaceholder = document.querySelector('.qr-placeholder');
  if (qrPlaceholder) {
    qrPlaceholder.innerHTML = `
      <a href="${CONTACTS.wechatUrl}" target="_blank" rel="noopener" title="打开微信 / Open WeChat" style="display:block;width:100%;height:100%">
        <img src="assets/wechat-qr.svg" alt="凯达装修微信二维码" style="display:block;width:100%;height:100%;object-fit:contain">
      </a>`;
  }
  const wechatId = document.getElementById('wechatId');
  if (wechatId) wechatId.textContent = CONTACTS.wechatId;

  const serviceArea = document.querySelector('.trust-strip .trust-item:nth-child(3)');
  if (serviceArea) {
    const title = serviceArea.querySelector('strong');
    const text = serviceArea.querySelector('span');
    if (title) { title.dataset.i18n = 'trust.area.title'; title.textContent = '服务荷兰、德国、比利时'; }
    if (text) { text.dataset.i18n = 'trust.area.text'; text.textContent = '荷兰全境 · 德国 · 比利时'; }
  }
  const contactNote = document.querySelector('.contact-note');
  if (contactNote) {
    const prefix = contactNote.querySelector('[data-i18n="contact.area"]');
    if (prefix) {
      const value = document.createElement('span');
      value.dataset.i18n = 'contact.area.value';
      value.textContent = '荷兰 · 德国 · 比利时';
      contactNote.replaceChildren(prefix, document.createTextNode(' '), value);
    }
  }

  const form = document.getElementById('quoteForm');
  if (form) {
    const status = document.getElementById('formStatus');
    const submitButton = form.querySelector('button[type="submit"]');
    const photosInput = form.querySelector('input[name="photos"]');
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      const isNl = document.documentElement.lang === 'nl';
      const photos = Array.from(photosInput?.files || []);
      if (photos.length > 10) {
        status.textContent = isNl ? 'U kunt maximaal 10 foto’s uploaden.' : '最多上传 10 张现场照片。';
        return;
      }
      const rawTooLarge = photos.find((file) => file.size > 25 * 1024 * 1024);
      if (rawTooLarge) {
        status.textContent = isNl ? `Foto groter dan 25 MB: ${rawTooLarge.name}` : `单张原图不能超过 25 MB：${rawTooLarge.name}`;
        return;
      }
      submitButton.disabled = true;
      status.textContent = isNl ? 'Foto’s worden voorbereid…' : '正在处理照片…';
      try {
        let preparedPhotos = photos;
        try {
          const imageTools = await ensureImageTools();
          if (imageTools?.prepareMany && photos.length) {
            preparedPhotos = await imageTools.prepareMany(photos, (current, total) => {
              status.textContent = isNl ? `Foto ${current}/${total} voorbereiden…` : `正在处理照片 ${current}/${total}…`;
            });
          }
        } catch (error) {
          console.warn('Image tools unavailable; uploading originals', error);
        }

        status.textContent = isNl ? 'Aanvraag wordt verstuurd…' : '正在提交询价…';
        const data = new FormData(form);
        data.delete('photos');
        preparedPhotos.forEach((photo) => data.append('photos', photo, photo.name || 'photo.jpg'));
        data.set('lang', isNl ? 'nl' : 'zh');
        const response = await fetch('/api/inquiries', { method: 'POST', headers: { Accept: 'application/json' }, body: data });
        const body = await response.json().catch(() => ({}));
        if (!response.ok || !body.ok) throw new Error(body.error || `HTTP ${response.status}`);
        const shortId = String(body.inquiryId || '').slice(0, 8).toUpperCase();
        status.textContent = isNl
          ? `Ontvangen. We nemen zo snel mogelijk contact op.${shortId ? ` Referentie: ${shortId}` : ''}`
          : `已收到，我们会尽快联系您。${shortId ? ` 询价编号：${shortId}` : ''}`;
        form.reset();
      } catch (error) {
        console.error(error);
        status.textContent = isNl ? `Versturen is niet gelukt: ${error.message}` : `提交失败：${error.message}`;
      } finally {
        submitButton.disabled = false;
      }
    }, { capture: true });
  }

  window.addEventListener('load', () => {
    const script = document.createElement('script');
    script.src = 'cms.js';
    document.body.appendChild(script);
  }, { once: true });
})();
