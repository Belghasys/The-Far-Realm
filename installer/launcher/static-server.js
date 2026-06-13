// Tiny zero-dependency static file server with SPA fallback.
// The game uses react-router BrowserRouter, so any unknown path must serve
// index.html (otherwise deep links / refreshes 404). Binds to 127.0.0.1 only.
const http = require('http');
const fs = require('fs');
const path = require('path');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.map': 'application/json; charset=utf-8'
};

function serveClient(rootDir) {
  return new Promise((resolve, reject) => {
    const indexPath = path.join(rootDir, 'index.html');

    const server = http.createServer((req, res) => {
      // Strip query string, decode, and prevent path traversal.
      const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
      let filePath = path.join(rootDir, urlPath);
      if (!filePath.startsWith(rootDir)) {
        res.writeHead(403).end('Forbidden');
        return;
      }

      fs.stat(filePath, (err, stat) => {
        if (!err && stat.isDirectory()) filePath = path.join(filePath, 'index.html');

        fs.readFile(filePath, (err2, data) => {
          if (err2) {
            // SPA fallback: serve index.html for unknown non-file routes.
            fs.readFile(indexPath, (err3, html) => {
              if (err3) {
                res.writeHead(404).end('Not found');
              } else {
                res.writeHead(200, { 'Content-Type': MIME['.html'] }).end(html);
              }
            });
            return;
          }
          const ext = path.extname(filePath).toLowerCase();
          res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' }).end(data);
        });
      });
    });

    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port }));
  });
}

module.exports = { serveClient };
