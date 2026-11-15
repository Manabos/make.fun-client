// Static server + /api passthrough so the browser can render live make.fun data.
import { createReadStream, statSync } from 'node:fs';
import { createServer, request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('./app', import.meta.url)));
const MIME = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8',
  '.mjs':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8',
  '.json':'application/json; charset=utf-8', '.svg':'image/svg+xml', '.png':'image/png',
  '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.webp':'image/webp', '.ico':'image/x-icon' };

const server = createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  if (url.pathname.startsWith('/proxy/')) {
    const target = 'https://make.fun' + url.pathname.slice('/proxy'.length) + url.search;
    const r = httpsRequest(target, { method: 'GET', headers: { 'user-agent':'curl/8.5.0', accept:'application/json' } }, (up) => {
      res.writeHead(up.statusCode ?? 502, { 'content-type': up.headers['content-type'] ?? 'application/json',
        'access-control-allow-origin': '*' });
      up.pipe(res);
    });
    r.on('error', (e) => { res.writeHead(502).end('proxy error: ' + e.message); });
    r.end();
    return;
  }
  let p = decodeURIComponent(url.pathname);
  if (p === '/' ) p = '/index.html';
  const file = join(root, normalize(p));
  if (!file.startsWith(root)) { res.writeHead(403).end('forbidden'); return; }
  try {
    const st = statSync(file);
    if (!st.isFile()) throw new Error('not a file');
    res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream',
      'content-length': String(st.size), 'cache-control': 'no-store' });
    createReadStream(file).pipe(res);
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain' }).end('not found');
  }
});
server.listen(8081, '127.0.0.1', () => console.log('proxy server on http://127.0.0.1:8081'));
