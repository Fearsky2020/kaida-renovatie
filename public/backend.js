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
  };

  document.querySelectorAll('a[href="https://wa.me/31600000000"]').forEach((link) => {
    link.href = `https://wa.me/${CONTACTS.whatsappDigits}`;
    link.title = `WhatsApp ${CONTACTS.phoneDisplay}`;
  });

  document.querySelectorAll('a[href="mailto:info@example.nl"]').forEach((link) => {
    link.href = `mailto:${CONTACTS.email}`;
    link.title = CONTACTS.email;
    if (link.textContent.trim() === 'Email') link.textContent = CONTACTS.email;
  });

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
