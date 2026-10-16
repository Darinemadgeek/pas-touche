/* Petit serveur statique pour tester le jeu en local : node tools/serve.js [port] */
'use strict';
var http = require('http'), fs = require('fs'), path = require('path');
var root = path.resolve(__dirname, '..'), port = +process.env.PORT || +process.argv[2] || 8765;
var types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png' };
var shotDir = process.env.SHOT_DIR;
http.createServer(function (req, res) {
  var p = decodeURIComponent(req.url.split('?')[0]);
  // Développement : POST /__shot?name=x enregistre une capture PNG (data URL) dans SHOT_DIR.
  if (req.method === 'POST' && p === '/__shot' && shotDir) {
    var body = '';
    req.on('data', function (c) { body += c; });
    req.on('end', function () {
      var name = (req.url.split('name=')[1] || 'shot').replace(/[^a-z0-9_-]/gi, '');
      fs.writeFileSync(path.join(shotDir, name + '.png'), Buffer.from(body.split(',')[1], 'base64'));
      res.writeHead(200); res.end('ok');
    });
    return;
  }
  if (p === '/') p = '/index.html';
  var file = path.join(root, p);
  if (file.indexOf(root) !== 0) { res.writeHead(403); return res.end(); }
  fs.readFile(file, function (err, data) {
    if (err) { res.writeHead(404); return res.end('404'); }
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(data);
  });
}).listen(port, function () { console.log('Pas Touche ! sur http://localhost:' + port); });
