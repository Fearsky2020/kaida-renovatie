import productionWorker from "./worker.js";

const JSON_HEADERS = { "content-type": "application/json; charset=utf-8" };
const SITE_R2_KEY = "cms/site-content.json";

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
      if (!content || typeof content !== "object" || Array.isArray(content)) {
        return json({ ok: false, error: "Invalid content" }, 400);
      }
      await saveSiteContent(env, content);
      return json({ ok: true, content });
    }

    if (url.pathname === "/api/admin/media" && request.method === "POST") {
      if (!requireAdmin(request, env)) return json({ ok: false, error: "Unauthorized" }, 401);
      return uploadCmsMedia(request, env);
    }

    if (url.pathname.startsWith("/cms-media/") && request.method === "GET") {
      return serveCmsMedia(url.pathname.slice("/cms-media/".length), env);
    }

    return productionWorker.fetch(request, env, ctx);
  },
};

async function loadSiteContent(env) {
  if (!env.MEDIA) return {};
  const object = await env.MEDIA.get(SITE_R2_KEY);
  if (!object) return {};
  try {
    const content = JSON.parse(await object.text());
    return content && typeof content === "object" && !Array.isArray(content) ? content : {};
  } catch {
    return {};
  }
}

async function saveSiteContent(env, content) {
  if (!env.MEDIA) throw new Error("Media storage is not configured");
  await env.MEDIA.put(SITE_R2_KEY, JSON.stringify(content), {
    httpMetadata: { contentType: "application/json; charset=utf-8" },
  });
}

async function uploadCmsMedia(request, env) {
  if (!env.MEDIA) return json({ ok: false, error: "图片存储尚未配置" }, 503);
  const form = await request.formData();
  const file = form.get("file");
  const slot = safeName(clean(form.get("slot"), 80) || "image");
  if (!file || typeof file !== "object" || typeof file.arrayBuffer !== "function" || !file.size) {
    return json({ ok: false, error: "请选择图片" }, 400);
  }
  if (!String(file.type || "").startsWith("image/")) {
    return json({ ok: false, error: "只支持图片文件" }, 400);
  }
  if (file.size > 10 * 1024 * 1024) {
    return json({ ok: false, error: "单张图片不能超过 10 MB" }, 400);
  }

  const ext = safeExtension(file.name, file.type);
  const key = `cms/${slot}/${crypto.randomUUID()}.${ext}`;
  await env.MEDIA.put(key, await file.arrayBuffer(), {
    httpMetadata: { contentType: file.type || "application/octet-stream" },
    customMetadata: { originalName: clean(file.name, 160), slot },
  });
  return json({ ok: true, url: `/cms-media/${encodeURIComponent(key)}`, key });
}

async function serveCmsMedia(encodedKey, env) {
  if (!env.MEDIA) return new Response("Not found", { status: 404 });
  const key = decodeURIComponent(encodedKey || "");
  if (!key.startsWith("cms/")) return new Response("Not found", { status: 404 });
  const object = await env.MEDIA.get(key);
  if (!object) return new Response("Not found", { status: 404 });
  const headers = new Headers({ "cache-control": "public, max-age=31536000, immutable" });
  object.writeHttpMetadata(headers);
  return new Response(object.body, { headers });
}

function requireAdmin(request, env) {
  if (!env.ADMIN_API_TOKEN) return false;
  return (request.headers.get("authorization") || "") === `Bearer ${env.ADMIN_API_TOKEN}`;
}

function clean(value, max = 1000) {
  return String(value ?? "").trim().slice(0, max);
}

function safeName(value) {
  return String(value || "image")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "image";
}

function safeExtension(name, type) {
  const byName = String(name || "").split(".").pop()?.toLowerCase();
  if (byName && /^[a-z0-9]{2,5}$/.test(byName)) return byName;
  return ({
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/avif": "avif",
    "image/heic": "heic",
    "image/heif": "heif",
  })[type] || "jpg";
}

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: JSON_HEADERS });
}
