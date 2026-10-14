// Serve the built static site (out/) the way GitHub Pages does, under the same base path.
//   node scripts/serve.mjs [port]      (NEXT_PUBLIC_BASE_PATH sets the base, e.g. /BIble-ed)
import { createReadStream, statSync } from "node:fs";
import { createServer } from "node:http";
import path from "node:path";

const ROOT = path.resolve("out");
const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const PORT = Number(process.argv[2] ?? process.env.PORT ?? 3000);
const TYPES = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json",
  ".svg": "image/svg+xml", ".woff2": "font/woff2", ".woff": "font/woff", ".txt": "text/plain", ".webmanifest": "application/manifest+json",
  ".png": "image/png", ".ico": "image/x-icon",
};

function file(p) {
  try {
    const s = statSync(p);
    if (s.isFile()) return p;
    if (s.isDirectory()) return file(path.join(p, "index.html"));
  } catch {}
  return null;
}

createServer((req, res) => {
  const url = new URL(req.url ?? "/", "http://localhost");
  let pathname = decodeURIComponent(url.pathname);
  if (BASE && pathname === BASE) pathname += "/";
  if (BASE && !pathname.startsWith(`${BASE}/`)) {
    res.writeHead(302, { location: `${BASE}/` }).end();
    return;
  }
  const rel = pathname.slice(BASE.length);
  const target = path.join(ROOT, rel);
  if (!target.startsWith(ROOT)) {
    res.writeHead(400).end();
    return;
  }
  if (!rel.endsWith("/") && !path.extname(rel) && file(path.join(target, "index.html"))) {
    res.writeHead(301, { location: `${pathname}/${url.search}` }).end();
    return;
  }
  const found = file(target);
  const send = found ?? path.join(ROOT, "404.html");
  res.writeHead(found ? 200 : 404, { "content-type": TYPES[path.extname(send)] ?? "application/octet-stream" });
  createReadStream(send).pipe(res);
}).listen(PORT, () => console.log(`Serving ${ROOT} at http://localhost:${PORT}${BASE}/`));
