const JSON_HEADERS = { "content-type": "application/json; charset=utf-8" };
const MAX_PHOTOS = 10;
const DEFAULT_MAX_UPLOAD_MB = 8;
const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api/")) {
      if (request.method === "OPTIONS") return new Response(null, { status: 204 });

      try {
        await ensureSchema(env);

        if (url.pathname === "/api/inquiries" && request.method === "POST") {
          return await createInquiry(request, env, ctx, url);
        }

        if (url.pathname === "/api/inquiries" && request.method === "GET") {
          requireAdmin(request, env);
          return await listInquiries(url, env);
        }

        const inquiryMatch = url.pathname.match(/^\/api\/inquiries\/([^/]+)$/);
        if (inquiryMatch && request.method === "GET") {
          requireAdmin(request, env);
          return await getInquiry(inquiryMatch[1], env);
        }

        if (inquiryMatch && request.method === "PATCH") {
          requireAdmin(request, env);
          return await updateInquiry(inquiryMatch[1], request, env);
        }

        const photoMatch = url.pathname.match(/^\/api\/inquiries\/([^/]+)\/photos\/(\d+)$/);
        if (photoMatch && request.method === "GET") {
          requireAdmin(request, env);
          return await getInquiryPhoto(photoMatch[1], Number(photoMatch[2]), env);
        }

        return json({ ok: false, error: "Not found" }, 404);
      } catch (error) {
        console.error("API error", error);
        const status = Number(error?.status) || 500;
        const message = status >= 500 ? "Server error" : String(error?.message || "Request failed");
        return json({ ok: false, error: message }, status);
      }
    }

    if (env.ASSETS) return env.ASSETS.fetch(request);
    return new Response("Not found", { status: 404 });
  },
};

async function ensureSchema(env) {
  if (!env.DB) throw httpError(503, "Database binding is not configured");

  await env.DB.exec(`
    CREATE TABLE IF NOT EXISTS inquiries (
      id TEXT PRIMARY KEY,
      created_at TEXT NOT NULL,
      name TEXT NOT NULL,
      city TEXT NOT NULL,
      contact TEXT NOT NULL,
      email TEXT,
      project_type TEXT NOT NULL,
      message TEXT,
      language TEXT NOT NULL DEFAULT 'zh',
      consent INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'new',
      photo_keys TEXT NOT NULL DEFAULT '[]',
      source TEXT,
      user_agent TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_inquiries_created_at ON inquiries(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_inquiries_status ON inquiries(status);
  `);
}

async function createInquiry(request, env, ctx, url) {
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.includes("multipart/form-data")) {
    throw httpError(415, "Form data required");
  }

  const form = await request.formData();
  const honeypot = clean(form.get("website"), 200);
  if (honeypot) return json({ ok: true }, 202);

  const name = requiredText(form.get("name"), "Name", 120);
  const city = requiredText(form.get("city"), "City", 120);
  const contact = requiredText(form.get("contact"), "Contact", 180);
  const email = optionalEmail(form.get("email"));
  const projectType = requiredText(form.get("type"), "Project type", 80);
  const message = clean(form.get("message"), 3000);
  const language = clean(form.get("lang"), 8) === "nl" ? "nl" : "zh";
  const consent = String(form.get("consent") || "") === "yes";

  if (!consent) throw httpError(400, language === "nl" ? "Toestemming is verplicht" : "请先同意资料保存与联系");

  const photos = form.getAll("photos").filter((item) => item instanceof File && item.size > 0);
  if (photos.length > MAX_PHOTOS) {
    throw httpError(400, language === "nl" ? "Maximaal 10 foto's" : "最多上传 10 张照片");
  }

  const maxUploadBytes = (Number(env.MAX_UPLOAD_MB) || DEFAULT_MAX_UPLOAD_MB) * 1024 * 1024;
  for (const photo of photos) validatePhoto(photo, maxUploadBytes, language);

  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const photoKeys = [];

  if (photos.length && !env.MEDIA) throw httpError(503, language === "nl" ? "Foto-opslag is nog niet beschikbaar" : "照片存储尚未配置");

  try {
    for (let index = 0; index < photos.length; index += 1) {
      const file = photos[index];
      const key = `inquiries/${createdAt.slice(0, 10)}/${id}/${String(index + 1).padStart(2, "0")}-${safeFileName(file.name)}`;
      await env.MEDIA.put(key, file.stream(), {
        httpMetadata: { contentType: file.type || "application/octet-stream" },
        customMetadata: { inquiryId: id, originalName: file.name },
      });
      photoKeys.push(key);
    }

    await env.DB.prepare(`
      INSERT INTO inquiries (
        id, created_at, name, city, contact, email, project_type, message,
        language, consent, status, photo_keys, source, user_agent
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', ?, ?, ?)
    `)
      .bind(
        id,
        createdAt,
        name,
        city,
        contact,
        email,
        projectType,
        message,
        language,
        1,
        JSON.stringify(photoKeys),
        url.origin,
        clean(request.headers.get("user-agent"), 500)
      )
      .run();
  } catch (error) {
    if (env.MEDIA && photoKeys.length) {
      await Promise.allSettled(photoKeys.map((key) => env.MEDIA.delete(key)));
    }
    throw error;
  }

  const inquiry = { id, createdAt, name, city, contact, email, projectType, message, language, photoCount: photoKeys.length };
  ctx.waitUntil(sendNotifications(inquiry, env, url.origin));

  return json({ ok: true, inquiryId: id }, 201);
}

async function listInquiries(url, env) {
  const limit = clampInt(url.searchParams.get("limit"), 1, 100, 50);
  const status = clean(url.searchParams.get("status"), 24);
  let query = `
    SELECT id, created_at, name, city, contact, email, project_type, message,
           language, consent, status, photo_keys
    FROM inquiries
  `;
  const params = [];
  if (status) {
    query += " WHERE status = ?";
    params.push(status);
  }
  query += " ORDER BY created_at DESC LIMIT ?";
  params.push(limit);

  const stmt = env.DB.prepare(query).bind(...params);
  const result = await stmt.all();
  const items = (result.results || []).map(serializeInquiry);
  return json({ ok: true, items });
}

async function getInquiry(id, env) {
  const row = await env.DB.prepare("SELECT * FROM inquiries WHERE id = ?").bind(id).first();
  if (!row) throw httpError(404, "Inquiry not found");
  return json({ ok: true, item: serializeInquiry(row) });
}

async function updateInquiry(id, request, env) {
  const body = await request.json().catch(() => ({}));
  const status = clean(body.status, 24);
  const allowed = new Set(["new", "contacted", "quoted", "won", "lost"]);
  if (!allowed.has(status)) throw httpError(400, "Invalid status");

  const result = await env.DB.prepare("UPDATE inquiries SET status = ? WHERE id = ?").bind(status, id).run();
  if (!result.meta?.changes) throw httpError(404, "Inquiry not found");
  return json({ ok: true, status });
}

async function getInquiryPhoto(id, index, env) {
  if (!env.MEDIA) throw httpError(503, "Media binding is not configured");
  const row = await env.DB.prepare("SELECT photo_keys FROM inquiries WHERE id = ?").bind(id).first();
  if (!row) throw httpError(404, "Inquiry not found");

  const keys = parsePhotoKeys(row.photo_keys);
  const key = keys[index];
  if (!key) throw httpError(404, "Photo not found");

  const object = await env.MEDIA.get(key);
  if (!object) throw httpError(404, "Photo not found");

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("cache-control", "private, max-age=60");
  headers.set("content-disposition", `inline; filename="${safeFileName(key.split("/").pop() || "photo")}"`);
  return new Response(object.body, { headers });
}

async function sendNotifications(inquiry, env, origin) {
  const tasks = [];
  if (env.RESEND_API_KEY && env.NOTIFY_EMAIL && env.FROM_EMAIL) {
    tasks.push(sendOwnerEmail(inquiry, env, origin));
    if (inquiry.email) tasks.push(sendCustomerEmail(inquiry, env));
  }

  if (
    env.WHATSAPP_ENABLED === "true" &&
    env.WHATSAPP_ACCESS_TOKEN &&
    env.WHATSAPP_PHONE_NUMBER_ID &&
    env.WHATSAPP_NOTIFY_TO &&
    env.WHATSAPP_TEMPLATE_NAME &&
    env.WHATSAPP_API_VERSION
  ) {
    tasks.push(sendOwnerWhatsApp(inquiry, env));
  }

  if (env.WECHAT_WORK_WEBHOOK_URL) tasks.push(sendEnterpriseWechat(inquiry, env));
  if (!tasks.length) return;

  const results = await Promise.allSettled(tasks);
  results.forEach((result) => {
    if (result.status === "rejected") console.error("Notification failed", result.reason);
  });
}

async function sendOwnerEmail(inquiry, env, origin) {
  const adminUrl = env.ADMIN_URL || `${origin}/admin/inquiries.html`;
  const subject = `新客户询价｜${inquiry.city}｜${labelProjectType(inquiry.projectType, "zh")}`;
  const html = `
    <h2>凯达装修收到新的客户询价</h2>
    <p><strong>姓名：</strong>${escapeHtml(inquiry.name)}</p>
    <p><strong>城市：</strong>${escapeHtml(inquiry.city)}</p>
    <p><strong>工程：</strong>${escapeHtml(labelProjectType(inquiry.projectType, "zh"))}</p>
    <p><strong>联系方式：</strong>${escapeHtml(inquiry.contact)}</p>
    <p><strong>邮箱：</strong>${escapeHtml(inquiry.email || "未填写")}</p>
    <p><strong>现场照片：</strong>${inquiry.photoCount} 张</p>
    <p><strong>留言：</strong><br>${escapeHtml(inquiry.message || "未填写").replace(/\n/g, "<br>")}</p>
    <p><a href="${escapeHtml(adminUrl)}">打开凯达后台查看</a></p>
    <p style="color:#777;font-size:12px">询价编号：${inquiry.id}</p>
  `;
  return resend(env, {
    from: env.FROM_EMAIL,
    to: [env.NOTIFY_EMAIL],
    subject,
    html,
  });
}

async function sendCustomerEmail(inquiry, env) {
  const isNl = inquiry.language === "nl";
  const subject = isNl ? "We hebben uw aanvraag ontvangen — Kaida" : "凯达装修已收到您的询价";
  const html = isNl
    ? `<p>Beste ${escapeHtml(inquiry.name)},</p><p>Bedankt voor uw aanvraag. We hebben uw gegevens ontvangen en nemen zo snel mogelijk contact met u op.</p><p>Project: ${escapeHtml(labelProjectType(inquiry.projectType, "nl"))}<br>Plaats: ${escapeHtml(inquiry.city)}</p><p>Met vriendelijke groet,<br>Kaida Renovatie & Maatwerk</p>`
    : `<p>${escapeHtml(inquiry.name)}，您好：</p><p>我们已经收到您的装修/定制需求，会尽快与您联系。</p><p>工程类型：${escapeHtml(labelProjectType(inquiry.projectType, "zh"))}<br>城市：${escapeHtml(inquiry.city)}</p><p>凯达装修</p>`;

  return resend(env, {
    from: env.FROM_EMAIL,
    to: [inquiry.email],
    subject,
    html,
  });
}

async function resend(env, payload) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.RESEND_API_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(`Resend ${response.status}: ${await response.text()}`);
}

async function sendOwnerWhatsApp(inquiry, env) {
  const endpoint = `https://graph.facebook.com/${env.WHATSAPP_API_VERSION}/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
  const body = {
    messaging_product: "whatsapp",
    to: env.WHATSAPP_NOTIFY_TO,
    type: "template",
    template: {
      name: env.WHATSAPP_TEMPLATE_NAME,
      language: { code: env.WHATSAPP_TEMPLATE_LANG || "zh_CN" },
      components: [
        {
          type: "body",
          parameters: [
            { type: "text", text: inquiry.name },
            { type: "text", text: inquiry.city },
            { type: "text", text: labelProjectType(inquiry.projectType, "zh") },
            { type: "text", text: inquiry.contact },
          ],
        },
      ],
    },
  };
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`WhatsApp ${response.status}: ${await response.text()}`);
}

async function sendEnterpriseWechat(inquiry, env) {
  const content = [
    "【凯达装修｜新客户询价】",
    `姓名：${inquiry.name}`,
    `城市：${inquiry.city}`,
    `工程：${labelProjectType(inquiry.projectType, "zh")}`,
    `联系：${inquiry.contact}`,
    `照片：${inquiry.photoCount} 张`,
  ].join("\n");

  const response = await fetch(env.WECHAT_WORK_WEBHOOK_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ msgtype: "text", text: { content } }),
  });
  if (!response.ok) throw new Error(`WeChat Work ${response.status}: ${await response.text()}`);
}

function requireAdmin(request, env) {
  if (!env.ADMIN_API_TOKEN) throw httpError(503, "Admin token is not configured");
  const authorization = request.headers.get("authorization") || "";
  if (authorization !== `Bearer ${env.ADMIN_API_TOKEN}`) throw httpError(401, "Unauthorized");
}

function validatePhoto(photo, maxBytes, language) {
  if (!ALLOWED_IMAGE_TYPES.has(photo.type)) {
    throw httpError(400, language === "nl" ? `Niet ondersteund bestand: ${photo.name}` : `不支持的图片格式：${photo.name}`);
  }
  if (photo.size > maxBytes) {
    const mb = Math.round(maxBytes / 1024 / 1024);
    throw httpError(400, language === "nl" ? `Foto groter dan ${mb} MB: ${photo.name}` : `单张照片不能超过 ${mb} MB：${photo.name}`);
  }
}

function serializeInquiry(row) {
  const keys = parsePhotoKeys(row.photo_keys);
  return {
    id: row.id,
    createdAt: row.created_at,
    name: row.name,
    city: row.city,
    contact: row.contact,
    email: row.email || "",
    projectType: row.project_type,
    message: row.message || "",
    language: row.language,
    consent: Boolean(row.consent),
    status: row.status,
    photoCount: keys.length,
  };
}

function parsePhotoKeys(value) {
  try {
    const parsed = JSON.parse(value || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function requiredText(value, label, maxLength) {
  const text = clean(value, maxLength);
  if (!text) throw httpError(400, `${label} is required`);
  return text;
}

function optionalEmail(value) {
  const email = clean(value, 254).toLowerCase();
  if (!email) return "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw httpError(400, "Invalid email");
  return email;
}

function clean(value, maxLength = 1000) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function safeFileName(value) {
  const name = String(value || "photo").normalize("NFKD").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
  return name.slice(0, 120) || "photo";
}

function clampInt(value, min, max, fallback) {
  const number = Number.parseInt(value, 10);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

function labelProjectType(type, language) {
  const labels = {
    renovation: { zh: "装修", nl: "Renovatie" },
    carpentry: { zh: "木工", nl: "Timmerwerk" },
    furniture: { zh: "定制家具", nl: "Maatwerk meubels" },
    wardrobe: { zh: "定制衣柜", nl: "Maatwerk kast" },
    kitchen: { zh: "厨房", nl: "Keuken" },
    other: { zh: "其他", nl: "Overig" },
  };
  return labels[type]?.[language] || type;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;",
  })[char]);
}

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: JSON_HEADERS });
}

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}
