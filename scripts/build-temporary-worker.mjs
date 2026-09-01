import fs from 'node:fs';
import path from 'node:path';

const publicDir = path.resolve('public');
const output = path.resolve('src/worker-temporary-generated.js');

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
};

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

const assets = {};
for (const file of walk(publicDir)) {
  const rel = path.relative(publicDir, file).split(path.sep).join('/');
  const urlPath = '/' + rel;
  const ext = path.extname(file).toLowerCase();
  assets[urlPath] = {
    type: mime[ext] || 'application/octet-stream',
    body: fs.readFileSync(file).toString('base64'),
  };
}

const source = `import apiWorker from "./worker.js";

const ASSETS = ${JSON.stringify(assets)};

function decodeBase64(value) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function assetResponse(pathname, method) {
  let key = pathname;
  if (key === "/") key = "/index.html";
  if (key === "/admin" || key === "/admin/") key = "/admin/index.html";
  const asset = ASSETS[key];
  if (!asset) return null;
  const headers = new Headers({
    "content-type": asset.type,
    "x-content-type-options": "nosniff",
  });
  if (key.endsWith(".html")) headers.set("cache-control", "no-cache");
  else headers.set("cache-control", "public, max-age=300");
  return new Response(method === "HEAD" ? null : decodeBase64(asset.body), { status: 200, headers });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) return apiWorker.fetch(request, env, ctx);

    if (request.method === "GET" || request.method === "HEAD") {
      const direct = assetResponse(url.pathname, request.method);
      if (direct) return direct;

      const accept = request.headers.get("accept") || "";
      if (accept.includes("text/html")) return assetResponse("/index.html", request.method);
    }

    return new Response("Not found", { status: 404 });
  },
};
`;

fs.writeFileSync(output, source);
const sizeKb = Math.round(fs.statSync(output).size / 1024);
console.log(`Temporary Worker generated with ${Object.keys(assets).length} assets (${sizeKb} KB).`);
