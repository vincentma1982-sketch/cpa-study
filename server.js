#!/usr/bin/env node
// CPA 学习站开发服务器：纯静态托管，支持 --host/--port 参数转发
const http = require('http');
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
let host = '127.0.0.1';
let port = 7100;
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--host' || a === '-H') host = args[++i];
  else if (a === '--port' || a === '-p') port = parseInt(args[++i], 10);
  else if (a.startsWith('--host=')) host = a.slice(7);
  else if (a.startsWith('--port=')) port = parseInt(a.slice(7), 10);
}

const root = __dirname;
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2'
};

http.createServer((req, res) => {
  let p = decodeURIComponent((req.url || '/').split('?')[0]);
  if (p === '/') p = '/index.html';
  const file = path.normalize(path.join(root, p));
  if (!file.startsWith(root)) { res.writeHead(403); return res.end('Forbidden'); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-cache'
    });
    res.end(data);
  });
}).listen(port, host, () => {
  console.log(`CPA 备考学习站已启动: http://${host}:${port}`);
});
