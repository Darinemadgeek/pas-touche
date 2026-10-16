/* Assemble le jeu en un seul fichier HTML (CSS et JS intégrés).
   - dist/pas-touche.html : version autonome à ouvrir ou partager telle quelle.
   - dist/artifact.html   : même contenu sans <html>/<head>/<body>, pour une publication en Artifact.
   Usage : node tools/build.js */
'use strict';
var fs = require('fs'), path = require('path');
var root = path.resolve(__dirname, '..');
var read = function (p) { return fs.readFileSync(path.join(root, p), 'utf8'); };

var html = read('index.html');
var css = read('css/style.css');
var scripts = [];
html.replace(/<script src="([^"]+)"><\/script>/g, function (_, src) { scripts.push(src); });
var js = scripts.map(function (s) { return '/* ' + s + ' */\n' + read(s); }).join('\n');
if (/<\/script/i.test(js)) throw new Error('Le JS contient </script> : impossible de l\'intégrer tel quel.');

var body = html.slice(html.indexOf('<body>') + 6, html.indexOf('</body>')).replace(/\s*<script src="[^"]+"><\/script>/g, '');
var fonts = '<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n' +
  '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Lilita+One&family=Nunito:wght@700;800;900&display=swap">';
var title = '<title>Pas Touche !</title>';
// Dans le skeleton d'un Artifact, le DOM est déjà prêt quand le script s'exécute.
var boot = '\n(function(){ if (document.readyState !== "loading") document.dispatchEvent(new Event("DOMContentLoaded")); })();\n';

var dist = path.join(root, 'dist');
if (!fs.existsSync(dist)) fs.mkdirSync(dist);

var standalone = '<!doctype html>\n<html lang="fr">\n<head>\n<meta charset="utf-8">\n' +
  '<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">\n' +
  '<meta name="theme-color" content="#4f0e1c">\n' + title + '\n' + fonts + '\n<style>\n' + css + '\n</style>\n</head>\n<body>' + body +
  '<script>\n' + js + '\n</script>\n</body>\n</html>\n';
fs.writeFileSync(path.join(dist, 'pas-touche.html'), standalone);

var artifact = title + '\n' + fonts + '\n<style>\n' + css + '\n</style>\n' + body + '<script>\n' + js + boot + '</script>\n';
fs.writeFileSync(path.join(dist, 'artifact.html'), artifact);

console.log('dist/pas-touche.html ' + (standalone.length / 1024).toFixed(0) + ' Ko, dist/artifact.html ' + (artifact.length / 1024).toFixed(0) + ' Ko');
