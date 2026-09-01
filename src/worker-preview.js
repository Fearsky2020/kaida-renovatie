import productionWorker from "./worker.js";

const JSON_HEADERS = { "content-type": "application/json; charset=utf-8" };
const CACHE_KEY = new Request("https://kaida-preview.invalid/inquiries");
const SITE_CACHE_KEY = new Request("https://kaida-preview.invalid/site-content");
const SITE_R2_KEY = "cms/site-content.json";
let memoryFallback = [];
let memorySiteContent = {};

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === "/api/site-content" && request.method === "GET") {
      return json({ ok: true, content: await loadSiteContent(env) });
    }
    if (url.pathname === "/api/admin/site-content" && request.method === "GET") {
      if (!requireAdmin(request, env)) return json({ ok: false, error: "Unauthorized" }, 401);
      return json({ ok: true, content: await loadSiteContent(env) });
    }
    if (url.pathname === "/api/admin/site-content" && request.method === "PUT") {
      if (!requireAdmin(request, env)) return json({ ok: false, error: "Unauthorized" }, 401);
      const content = await request.json().catch(() => null);
      if (!content || typeof content !== "object" || Array.isArray(content)) return json({ ok: false, error: "Invalid content" }, 400);
      await saveSiteContent(env, content);
      return json({ ok: true, content });
    }
    if (url.pathname === "/api/admin/media" && request.method === "POST") {
      if (!requireAdmin(request, env)) return json({ ok: false, error: "Unauthorized" }, 401);
      return uploadMedia(request, env);
    }
    if (url.pathname.startsWith("/cms-media/") && request.method === "GET") {
      return serveMedia(url.pathname.slice("/cms-media/".length), env);
    }

    if (env.PREVIEW_MODE === "true" && url.pathname.startsWith("/api/")) {
      if (request.method === "OPTIONS") return new Response(null, { status: 204 });
      return previewApi(request, env);
    }
    return productionWorker.fetch(request, env, ctx);
  },
};

async function loadSiteContent(env) {
  if (env.CMS_MEDIA) {
    try {
      const object = await env.CMS_MEDIA.get(SITE_R2_KEY);
      if (object) {
        const content = JSON.parse(await object.text());
        if (content && typeof content === "object") { memorySiteContent = content; return content; }
      }
    } catch (error) { console.warn("CMS R2 read failed", error); }
  }
  try {
    const cached = await caches.default.match(SITE_CACHE_KEY);
    if (cached) {
      const content = await cached.json();
      if (content && typeof content === "object") { memorySiteContent = content; return content; }
    }
  } catch (error) { console.warn("CMS cache read failed", error); }
  return memorySiteContent;
}

async function saveSiteContent(env, content) {
  memorySiteContent = content;
  const text = JSON.stringify(content);
  if (env.CMS_MEDIA) {
    await env.CMS_MEDIA.put(SITE_R2_KEY, text, { httpMetadata: { contentType: "application/json; charset=utf-8" } });
    return;
  }
  await caches.default.put(SITE_CACHE_KEY, new Response(text, {
    headers: { "content-type": "application/json", "cache-control": "public, max-age=31536000" },
  }));
}

async function uploadMedia(request, env) {
  const form = await request.formData();
  const file = form.get("file");
  const slot = safeName(clean(form.get("slot"), 80) || "image");
  if (!file || typeof file !== "object" || typeof file.arrayBuffer !== "function" || !file.size) return json({ ok: false, error: "请选择图片" }, 400);
  if (!String(file.type || "").startsWith("image/")) return json({ ok: false, error: "只支持图片文件" }, 400);
  if (file.size > 10 * 1024 * 1024) return json({ ok: false, error: "单张图片不能超过 10 MB" }, 400);

  const ext = safeExtension(file.name, file.type);
  const key = `cms/${slot}/${crypto.randomUUID()}.${ext}`;
  const bytes = await file.arrayBuffer();

  if (env.CMS_MEDIA) {
    await env.CMS_MEDIA.put(key, bytes, {
      httpMetadata: { contentType: file.type || "application/octet-stream" },
      customMetadata: { originalName: clean(file.name, 160), slot },
    });
  } else {
    const cacheRequest = new Request(`https://kaida-preview.invalid/cms-media/${encodeURIComponent(key)}`);
    await caches.default.put(cacheRequest, new Response(bytes, {
      headers: { "content-type": file.type || "application/octet-stream", "cache-control": "public, max-age=31536000" },
    }));
  }

  return json({ ok: true, url: `/cms-media/${encodeURIComponent(key)}`, key });
}

async function serveMedia(encodedKey, env) {
  const key = decodeURIComponent(encodedKey || "");
  if (!key.startsWith("cms/")) return new Response("Not found", { status: 404 });
  if (env.CMS_MEDIA) {
    const object = await env.CMS_MEDIA.get(key);
    if (!object) return new Response("Not found", { status: 404 });
    const headers = new Headers({ "cache-control": "public, max-age=31536000, immutable" });
    object.writeHttpMetadata(headers);
    return new Response(object.body, { headers });
  }
  const cached = await caches.default.match(new Request(`https://kaida-preview.invalid/cms-media/${encodeURIComponent(key)}`));
  if (cached) return cached;
  return new Response("Not found", { status: 404 });
}

async function previewApi(request, env) {
  const url = new URL(request.url);

  if (url.pathname === "/api/inquiries" && request.method === "POST") {
    const contentType = request.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) return json({ ok: false, error: "Form data required" }, 415);
    const form = await request.formData();
    if (clean(form.get("website"), 200)) return json({ ok: true, preview: true }, 202);
    const name = clean(form.get("name"), 120);
    const city = clean(form.get("city"), 120);
    const contact = clean(form.get("contact"), 180);
    const email = clean(form.get("email"), 254);
    const projectType = clean(form.get("type"), 80);
    const message = clean(form.get("message"), 3000);
    const language = clean(form.get("lang"), 8) === "nl" ? "nl" : "zh";
    const consent = String(form.get("consent") || "") === "yes";
    if (!name || !city || !contact || !projectType) return json({ ok: false, error: "Required fields missing" }, 400);
    if (!consent) return json({ ok: false, error: language === "nl" ? "Toestemming is verplicht" : "请先同意资料保存与联系" }, 400);

    const id = crypto.randomUUID();
    const item = { id, createdAt: new Date().toISOString(), name, city, contact, email, projectType, message, language, consent: true, status: "new", photoCount: 0, preview: true };
    const items = await loadInquiries();
    await saveInquiries([item, ...items.filter((entry) => entry.id !== id)]);
    return json({ ok: true, inquiryId: id, preview: true, photosStored: false }, 201);
  }

  if (url.pathname === "/api/inquiries" && request.method === "GET") {
    if (!requireAdmin(request, env)) return json({ ok: false, error: "Unauthorized" }, 401);
    let items = await loadInquiries();
    const status = clean(url.searchParams.get("status"), 24);
    if (status) items = items.filter((item) => item.status === status);
    const limit = Math.max(1, Math.min(100, Number.parseInt(url.searchParams.get("limit") || "50", 10) || 50));
    return json({ ok: true, items: items.slice(0, limit), preview: true });
  }

  const inquiryMatch = url.pathname.match(/^\/api\/inquiries\/([^/]+)$/);
  if (inquiryMatch && request.method === "GET") {
    if (!requireAdmin(request, env)) return json({ ok: false, error: "Unauthorized" }, 401);
    const items = await loadInquiries();
    const item = items.find((entry) => entry.id === inquiryMatch[1]);
    return item ? json({ ok: true, item, preview: true }) : json({ ok: false, error: "Inquiry not found" }, 404);
  }

  if (inquiryMatch && request.method === "PATCH") {
    if (!requireAdmin(request, env)) return json({ ok: false, error: "Unauthorized" }, 401);
    const body = await request.json().catch(() => ({}));
    const status = clean(body.status, 24);
    if (!["new", "contacted", "quoted", "won", "lost"].includes(status)) return json({ ok: false, error: "Invalid status" }, 400);
    const items = await loadInquiries();
    const index = items.findIndex((entry) => entry.id === inquiryMatch[1]);
    if (index < 0) return json({ ok: false, error: "Inquiry not found" }, 404);
    items[index] = { ...items[index], status };
    await saveInquiries(items);
    return json({ ok: true, status, preview: true });
  }

  if (url.pathname.includes("/photos/")) return json({ ok: false, error: "Photo storage is disabled in preview mode" }, 501);
  return json({ ok: false, error: "Not found" }, 404);
}

async function loadInquiries() {
  try {
    const cached = await caches.default.match(CACHE_KEY);
    if (cached) {
      const body = await cached.json();
      if (Array.isArray(body)) { memoryFallback = body; return body; }
    }
  } catch (error) { console.warn("Preview cache read failed", error); }
  return memoryFallback;
}

async function saveInquiries(items) {
  memoryFallback = items.slice(0, 100);
  try {
    await caches.default.put(CACHE_KEY, new Response(JSON.stringify(memoryFallback), {
      headers: { "content-type": "application/json", "cache-control": "public, max-age=3600" },
    }));
  } catch (error) { console.warn("Preview cache write failed", error); }
}

function requireAdmin(request, env) {
  if (!env.ADMIN_API_TOKEN) return false;
  return (request.headers.get("authorization") || "") === `Bearer ${env.ADMIN_API_TOKEN}`;
}
function clean(value, max = 1000) { return String(value ?? "").trim().slice(0, max); }
function safeName(value) { return String(value || "image").replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "image"; }
function safeExtension(name, type) {
  const byName = String(name || "").split(".").pop()?.toLowerCase();
  if (byName && /^[a-z0-9]{2,5}$/.test(byName)) return byName;
  return ({ "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif", "image/heic": "heic" })[type] || "jpg";
}
function json(payload, status = 200) { return new Response(JSON.stringify(payload), { status, headers: JSON_HEADERS }); }
