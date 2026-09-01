import productionWorker from "./worker.js";

const JSON_HEADERS = { "content-type": "application/json; charset=utf-8" };
const CACHE_KEY = new Request("https://kaida-preview.invalid/inquiries");
let memoryFallback = [];

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (env.PREVIEW_MODE === "true" && url.pathname.startsWith("/api/")) {
      if (request.method === "OPTIONS") return new Response(null, { status: 204 });
      return previewApi(request, env);
    }
    return productionWorker.fetch(request, env, ctx);
  },
};

async function previewApi(request, env) {
  const url = new URL(request.url);

  if (url.pathname === "/api/inquiries" && request.method === "POST") {
    const contentType = request.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return json({ ok: false, error: "Form data required" }, 415);
    }

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

    if (!name || !city || !contact || !projectType) {
      return json({ ok: false, error: "Required fields missing" }, 400);
    }
    if (!consent) {
      return json({
        ok: false,
        error: language === "nl" ? "Toestemming is verplicht" : "请先同意资料保存与联系",
      }, 400);
    }

    const id = crypto.randomUUID();
    const item = {
      id,
      createdAt: new Date().toISOString(),
      name,
      city,
      contact,
      email,
      projectType,
      message,
      language,
      consent: true,
      status: "new",
      photoCount: 0,
      preview: true,
    };

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
    if (!["new", "contacted", "quoted", "won", "lost"].includes(status)) {
      return json({ ok: false, error: "Invalid status" }, 400);
    }

    const items = await loadInquiries();
    const index = items.findIndex((entry) => entry.id === inquiryMatch[1]);
    if (index < 0) return json({ ok: false, error: "Inquiry not found" }, 404);
    items[index] = { ...items[index], status };
    await saveInquiries(items);
    return json({ ok: true, status, preview: true });
  }

  if (url.pathname.includes("/photos/")) {
    return json({ ok: false, error: "Photo storage is disabled in preview mode" }, 501);
  }

  return json({ ok: false, error: "Not found" }, 404);
}

async function loadInquiries() {
  try {
    const cached = await caches.default.match(CACHE_KEY);
    if (cached) {
      const body = await cached.json();
      if (Array.isArray(body)) {
        memoryFallback = body;
        return body;
      }
    }
  } catch (error) {
    console.warn("Preview cache read failed", error);
  }
  return memoryFallback;
}

async function saveInquiries(items) {
  memoryFallback = items.slice(0, 100);
  try {
    await caches.default.put(CACHE_KEY, new Response(JSON.stringify(memoryFallback), {
      headers: {
        "content-type": "application/json",
        "cache-control": "public, max-age=3600",
      },
    }));
  } catch (error) {
    console.warn("Preview cache write failed", error);
  }
}

function requireAdmin(request, env) {
  if (!env.ADMIN_API_TOKEN) return false;
  return (request.headers.get("authorization") || "") === `Bearer ${env.ADMIN_API_TOKEN}`;
}

function clean(value, max = 1000) {
  return String(value ?? "").trim().slice(0, max);
}

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: JSON_HEADERS });
}
