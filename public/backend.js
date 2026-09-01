(() => {
  const CONTACTS = {
    email: 'kailunlin0824@gmail.com',
    phoneLocal: '0621191341',
    phoneDisplay: '06 2119 1341',
    phoneE164: '+31621191341',
    whatsappDigits: '31621191341',
    wechatId: 'linkailunLKL5566',
    wechatName: 'KaiLun / 凯伦',
    wechatArea: 'Rotterdam / 鹿特丹',
    wechatUrl: 'https://u.wechat.com/kCozOqTzL7Mo8-3Khw6a9nM?s=2',
  };

  function ensureStylesheet(href) {
    if (document.querySelector(`link[href="${href}"]`)) return;
    const stylesheet = document.createElement('link');
    stylesheet.rel = 'stylesheet';
    stylesheet.href = href;
    document.head.appendChild(stylesheet);
  }

  ensureStylesheet('brand-icons.css');

  // Apply the compact copper K/house identity to the real header and footer.
  const brand = document.querySelector('.site-header .brand');
  if (brand) {
    const cn = brand.querySelector('.brand-cn')?.textContent || '凯达装修';
    const sub = brand.querySelector('.brand-sub')?.textContent || 'KAIDA RENOVATIE & MAATWERK';
    brand.innerHTML = `
      <img class="brand-mark" src="assets/kaida-mark.svg" alt="" aria-hidden="true">
      <span class="brand-copy">
        <span class="brand-cn">${cn}</span>
        <span class="brand-sub">${sub}</span>
      </span>`;
  }

  const footerBrand = document.querySelector('.site-footer > div:first-child');
  if (footerBrand) {
    footerBrand.classList.add('footer-brand');
    footerBrand.innerHTML = `
      <img class="brand-mark" src="assets/kaida-mark.svg" alt="凯达装修">
      <span class="footer-brand-copy">
        <strong>凯达装修</strong>
        <span>KAIDA RENOVATIE & MAATWERK</span>
      </span>`;
  }

  const iconSvg = {
    renovation: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M7 22 24 8l17 14"/><path d="M11 20v20h26V20"/><path d="M17 40V29h14v11"/><path d="M19 17h10"/></svg>',
    carpentry: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="m10 11 27 27"/><path d="m34 8 6 6-9 9-6-6z"/><path d="M8 35 31 12"/><path d="m7 34 7 7 5-5-7-7z"/><path d="m33 7 3-3 8 8-3 3"/></svg>',
    furniture: '<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="10" y="8" width="28" height="32" rx="1"/><path d="M10 27h28M24 8v19M14 32h8M28 32h6M14 40v3M34 40v3"/></svg>',
    wardrobe: '<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="10" y="7" width="28" height="34" rx="1"/><path d="M24 7v34M20 24h1M27 24h1"/></svg>',
    kitchen: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M6 20h36v20H6zM6 30h36M18 20v20M32 20v20"/><path d="M9 12h8v8M31 12h8v8M12 30v4M23 30v4M36 30v4"/><path d="M11 9v3M35 9v3"/></svg>',
  };

  document.querySelectorAll('.service-item').forEach((item, index) => {
    const keys = ['renovation', 'carpentry', 'furniture', 'wardrobe', 'kitchen'];
    const oldNumber = item.querySelector(':scope > span');
    if (!oldNumber) return;
    const icon = document.createElement('span');
    icon.className = 'service-icon';
    icon.innerHTML = iconSvg[keys[index]] || iconSvg.renovation;
    oldNumber.replaceWith(icon);
  });

  const aboutIcons = [
    '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="m10 33 19-19 5 5-19 19H10z"/><path d="m27 12 3-3 9 9-3 3M10 38l6-1-5-5z"/><path d="M17 28l3 3M22 23l3 3"/></svg>',
    '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="m24 6 5 9 10 2-7 8 1 11-9-5-9 5 1-11-7-8 10-2z"/><path d="m19 24 3 3 7-8"/></svg>',
    '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M24 6 9 12v11c0 10 6 16 15 20 9-4 15-10 15-20V12z"/><path d="m17 24 5 5 10-11"/></svg>',
    '<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="7" y="13" width="34" height="25" rx="4"/><path d="m16 13 3-5h10l3 5"/><circle cx="24" cy="25.5" r="7"/><path d="M36 18h.01"/></svg>',
  ];
  document.querySelectorAll('.about-points article').forEach((article, index) => {
    if (article.querySelector('.about-icon')) return;
    const icon = document.createElement('span');
    icon.className = 'about-icon';
    icon.innerHTML = aboutIcons[index] || aboutIcons[0];
    article.prepend(icon);
  });

  const metaDescription = document.querySelector('meta[name="description"]');
  if (metaDescription) {
    metaDescription.content = '凯达装修 — 服务荷兰全境、德国和比利时的室内装修、木工、定制家具、衣柜与厨房工程。微信 / WhatsApp 快速咨询。';
  }

  // Turn the old city-only service-area copy into bilingual NL/DE/BE coverage.
  const serviceItem = document.querySelector('.trust-strip .trust-item:nth-child(3)');
  if (serviceItem) {
    const title = serviceItem.querySelector('strong');
    const text = serviceItem.querySelector('span');
    if (title) {
      title.dataset.i18n = 'trust.area.title';
      title.textContent = '服务荷兰、德国、比利时';
    }
    if (text) {
      text.dataset.i18n = 'trust.area.text';
      text.textContent = '荷兰全境 · 德国 · 比利时';
    }
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

  document.querySelectorAll('a[href="https://wa.me/31600000000"]').forEach((link) => {
    link.href = `https://wa.me/${CONTACTS.whatsappDigits}`;
    link.title = `WhatsApp ${CONTACTS.phoneDisplay}`;
  });

  document.querySelectorAll('a[href="mailto:info@example.nl"]').forEach((link) => {
    link.href = `mailto:${CONTACTS.email}`;
    link.title = CONTACTS.email;
    if (link.textContent.trim() === 'Email') link.textContent = CONTACTS.email;
  });

  const qrPlaceholder = document.querySelector('.qr-placeholder');
  if (qrPlaceholder) {
    qrPlaceholder.innerHTML = '';
    const qrLink = document.createElement('a');
    qrLink.href = CONTACTS.wechatUrl;
    qrLink.target = '_blank';
    qrLink.rel = 'noopener';
    qrLink.title = '打开微信 / Open WeChat';
    qrLink.style.display = 'block';
    qrLink.style.width = '100%';
    qrLink.style.height = '100%';

    const qrImage = document.createElement('img');
    qrImage.src = 'assets/wechat-qr.svg';
    qrImage.alt = '凯达装修 KaiLun 微信二维码';
    qrImage.loading = 'eager';
    qrImage.style.display = 'block';
    qrImage.style.width = '100%';
    qrImage.style.height = '100%';
    qrImage.style.objectFit = 'contain';

    qrLink.appendChild(qrImage);
    qrPlaceholder.appendChild(qrLink);
  }

  const wechatId = document.getElementById('wechatId');
  if (wechatId) {
    wechatId.textContent = CONTACTS.wechatId;
    wechatId.title = `${CONTACTS.wechatName} · ${CONTACTS.wechatArea}`;
  }

  const form = document.getElementById('quoteForm');
  if (!form) return;

  ensureStylesheet('inquiry.css');

  const status = document.getElementById('formStatus');
  const submitButton = form.querySelector('button[type="submit"]');
  const photosInput = form.querySelector('input[name="photos"]');
  const MAX_PHOTOS = 10;
  const MAX_MB = 8;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();

    const isNl = document.documentElement.lang === 'nl';
    const photos = Array.from(photosInput?.files || []);
    if (photos.length > MAX_PHOTOS) {
      status.textContent = isNl ? 'U kunt maximaal 10 foto’s uploaden.' : '最多上传 10 张现场照片。';
      return;
    }
    const tooLarge = photos.find((file) => file.size > MAX_MB * 1024 * 1024);
    if (tooLarge) {
      status.textContent = isNl ? `Foto groter dan ${MAX_MB} MB: ${tooLarge.name}` : `单张照片不能超过 ${MAX_MB} MB：${tooLarge.name}`;
      return;
    }

    submitButton.disabled = true;
    submitButton.setAttribute('aria-busy', 'true');
    status.textContent = isNl ? 'Aanvraag wordt verstuurd…' : '正在提交询价…';

    try {
      const data = new FormData(form);
      data.set('lang', isNl ? 'nl' : 'zh');
      const response = await fetch('/api/inquiries', {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: data,
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || !body.ok) throw new Error(body.error || `HTTP ${response.status}`);

      const shortId = String(body.inquiryId || '').slice(0, 8).toUpperCase();
      status.textContent = isNl
        ? `Ontvangen. We nemen zo snel mogelijk contact met u op.${shortId ? ` Referentie: ${shortId}` : ''}`
        : `已收到，我们会尽快联系您。${shortId ? ` 询价编号：${shortId}` : ''}`;
      form.reset();
    } catch (error) {
      console.error(error);
      status.textContent = isNl
        ? 'Versturen is niet gelukt. Probeer het opnieuw of neem contact op via WhatsApp.'
        : '提交失败，请稍后再试，或直接通过微信 / WhatsApp 联系我们。';
    } finally {
      submitButton.disabled = false;
      submitButton.removeAttribute('aria-busy');
    }
  }, { capture: true });
})();
