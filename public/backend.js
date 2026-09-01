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

  if (!document.querySelector('link[href="inquiry.css"]')) {
    const stylesheet = document.createElement('link');
    stylesheet.rel = 'stylesheet';
    stylesheet.href = 'inquiry.css';
    document.head.appendChild(stylesheet);
  }

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
