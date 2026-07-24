'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const host = '127.0.0.1';
const port = 4173;
const docsRoot = path.resolve(__dirname, '..', 'docs');
const mimeTypes = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
  ['.png', 'image/png'],
  ['.webp', 'image/webp'],
  ['.ico', 'image/x-icon']
]);

function send(response, status, body = '') {
  response.writeHead(status, {
    'Content-Type': 'text/plain; charset=utf-8',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'Cache-Control': 'no-store'
  });
  response.end(body);
}

function insideDocs(candidate) {
  const relative = path.relative(docsRoot, candidate);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}

const server = http.createServer((request, response) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.setHeader('Allow', 'GET, HEAD');
    send(response, 405, 'Método não permitido.');
    return;
  }

  let pathname;
  try { pathname = decodeURIComponent(new URL(request.url, `http://${host}:${port}`).pathname); }
  catch (_) { send(response, 400, 'Caminho inválido.'); return; }

  if (pathname.includes('\0') || (pathname !== '/docs' && !pathname.startsWith('/docs/'))) {
    send(response, 404, 'Não encontrado.');
    return;
  }

  const relativeUrl = pathname === '/docs' || pathname === '/docs/' ? 'index.html' : pathname.slice('/docs/'.length);
  const candidate = path.resolve(docsRoot, relativeUrl.replaceAll('/', path.sep));
  const extension = path.extname(candidate).toLowerCase();
  if (!insideDocs(candidate) || !mimeTypes.has(extension)) {
    send(response, 404, 'Não encontrado.');
    return;
  }

  fs.realpath(candidate, (realPathError, realPath) => {
    if (realPathError || !insideDocs(realPath)) { send(response, 404, 'Não encontrado.'); return; }
    fs.stat(realPath, (statError, stats) => {
      if (statError || !stats.isFile()) { send(response, 404, 'Não encontrado.'); return; }
      response.writeHead(200, {
        'Content-Type': mimeTypes.get(extension),
        'Content-Length': stats.size,
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'no-referrer',
        'Cache-Control': 'no-store'
      });
      if (request.method === 'HEAD') response.end();
      else fs.createReadStream(realPath).on('error', () => response.destroy()).pipe(response);
    });
  });
});

server.on('clientError', (_, socket) => socket.end('HTTP/1.1 400 Bad Request\r\n\r\n'));
server.listen(port, host, () => process.stdout.write(`SW test server: http://${host}:${port}/docs/index.html\n`));

function shutdown() { server.close(() => process.exit(0)); }
process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
