import productionWorker from "./worker.js";

const JSON_HEADERS = { "content-type": "application/json; charset=utf-8" };
const SITE_R2_KEY = "cms/site-content.json";
const MAX_CMS_IMAGE_BYTES = 25 * 1024 * 1024;
const IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "avif", "heic", "heif"]);

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    let response;

    if (url.pathname === "/api/site-content" && request.method === "GET") {
      const content = await loadSiteContent(env);
      response = json({ ok: true, content: publicSiteContent(content) });
    } else if (url.pathname === "/api/admin/site-content" && request.method === "GET") {
      response = !requireAdmin(request, env)
        ? json({ ok: false, error: "Unauthorized" }, 401)
        : json({ ok: true, content: await loadSiteContent(env) });
    } else if (url.pathname === "/api/admin/site-content" && request.method === "PUT") {
      if (!requireAdmin(request, env)) {
        response = json({ ok: false, error: "Unauthorized" }, 401);
      } else {
        const content = await request.json().catch(() => null);
        if (!content || typeof content !== "object" || Array.isArray(content)) {
          response = json({ ok: false, error: "Invalid content" }, 400);
        } else {
          await saveSiteContent(env, content);
          response = json({ ok: true, content });
        }
      }
    } else if (url.pathname === "/api/admin/media" && request.method === "POST") {
      response = !requireAdmin(request, env)
        ? json({ ok: false, error: "Unauthorized" }, 401)
        : await uploadCmsMedia(request, env);
    } else if (url.pathname.startsWith("/cms-media/") && request.method === "GET") {
      response = await serveCmsMedia(url.pathname.slice("/cms-media/".length), env);
    } else {
      response = await productionWorker.fetch(request, env, ctx);
    }

    return hardenResponse(response, url.pathname);
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

function publicSiteContent(content) {
  const published = Array.isArray(content.projectLibrary)
    ? content.projectLibrary
        .filter((project) => project && project.published !== false)
        .map(publicProject)
    : [];
  const publishedIds = new Set(published.map((project) => project.id).filter(Boolean));
  const featuredIds = Array.isArray(content.featuredProjectIds)
    ? content.featuredProjectIds.filter((id) => publishedIds.has(id)).slice(0, 6)
    : [];
  const featured = featuredIds
    .map((id) => published.find((project) => project.id === id))
    .filter(Boolean);

  return {
    hero: content.hero && typeof content.hero === "object" ? content.hero : {},
    projects: featured.length
      ? featured
      : (Array.isArray(content.projects) ? content.projects.map(publicProject).slice(0, 6) : []),
    beforeAfter: content.beforeAfter && typeof content.beforeAfter === "object" ? content.beforeAfter : {},
    projectLibrary: published,
    featuredProjectIds: featuredIds,
  };
}

function publicProject(project) {
  const images = Array.isArray(project?.images)
    ? project.images.filter(Boolean).slice(0, 20)
    : (project?.image ? [project.image] : []);
  return {
    id: clean(project?.id, 160),
    title: clean(project?.title, 160),
    city: clean(project?.city, 120),
    category: clean(project?.category, 120),
    description: clean(project?.description, 1600),
    image: images[0] || clean(project?.image, 1000),
    images,
    createdAt: clean(project?.createdAt, 80),
  };
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

  const ext = safeExtension(file.name, file.type);
  const mime = String(file.type || "").toLowerCase();
  const looksLikeImage = mime.startsWith("image/") || ((!mime || mime === "application/octet-stream") && IMAGE_EXTENSIONS.has(ext));
  if (!looksLikeImage) {
    return json({ ok: false, error: `不支持这种图片格式：${mime || ext || "未知格式"}` }, 400);
  }
  if (file.size > MAX_CMS_IMAGE_BYTES) {
    return json({ ok: false, error: "单张原图不能超过 25 MB；手机端会自动压缩后上传" }, 400);
  }

  const key = `cms/${slot}/${crypto.randomUUID()}.${ext}`;
  await env.MEDIA.put(key, file.stream ? file.stream() : await file.arrayBuffer(), {
    httpMetadata: { contentType: mime.startsWith("image/") ? mime : contentTypeForExtension(ext) },
    customMetadata: { originalName: clean(file.name, 160), slot },
  });
  return json({ ok: true, url: `/cms-media/${encodeURIComponent(key)}`, key, size: file.size });
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

function hardenResponse(response, pathname) {
  const headers = new Headers(response.headers);
  headers.set("x-content-type-options", "nosniff");
  headers.set("referrer-policy", "strict-origin-when-cross-origin");
  headers.set("x-frame-options", "SAMEORIGIN");
  headers.set("permissions-policy", "camera=(self), microphone=(), geolocation=()");

  // The HTML shell changes with each release. Never let an edge cache keep an
  // older shell that points at stale branding or scripts after a deployment.
  if (pathname === "/" || pathname.endsWith(".html")) {
    headers.set("cache-control", "no-store, no-cache, must-revalidate");
  }

  if (pathname.startsWith("/admin")) {
    headers.set("x-robots-tag", "noindex, nofollow, noarchive");
    headers.set("cache-control", "no-store");
  }
  if (pathname.startsWith("/api/")) {
    headers.set("cache-control", "no-store");
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
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
  if (byName && IMAGE_EXTENSIONS.has(byName)) return byName === "jpeg" ? "jpg" : byName;
  return ({
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/avif": "avif",
    "image/heic": "heic",
    "image/heif": "heif",
  })[String(type || "").toLowerCase()] || "jpg";
}

function contentTypeForExtension(ext) {
  return ({ jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", avif: "image/avif", heic: "image/heic", heif: "image/heif" })[ext] || "image/jpeg";
}

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: JSON_HEADERS });
}
