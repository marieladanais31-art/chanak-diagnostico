// Servidor local de desarrollo: sirve los archivos estáticos y enruta /api/* a las funciones de Vercel.
// Uso: node tools-dev-server.js [puerto]
const http = require('http'); const fs = require('fs'); const path = require('path'); const url = require('url');
const PORT = Number(process.argv[2]) || 8788;
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.css': 'text/css' };
http.createServer((req, res) => {
  const u = url.parse(req.url, true);
  if (u.pathname.startsWith('/api/')) {
    const file = path.join(__dirname, u.pathname.replace(/\/+$/, '') + '.js');
    if (!fs.existsSync(file) || path.basename(file).startsWith('_')) { res.writeHead(404); return res.end('not found'); }
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => {
      req.query = u.query; req.body = body ? (() => { try { return JSON.parse(body); } catch { return body; } })() : undefined;
      res.status = (c) => { res.statusCode = c; return res; };
      res.json = (o) => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(o)); };
      delete require.cache[require.resolve(file)];
      try { require(file)(req, res); } catch (e) { res.statusCode = 500; res.end(String(e)); }
    });
    return;
  }
  let p = u.pathname === '/' ? '/index.html' : u.pathname;
  const f = path.join(__dirname, p);
  if (!f.startsWith(__dirname) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end('not found'); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
}).listen(PORT, () => console.log('http://localhost:' + PORT));
