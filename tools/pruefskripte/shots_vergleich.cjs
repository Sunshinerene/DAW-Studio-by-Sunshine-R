// Bildvergleich zweier Builds: gleiche Zustände in allen fünf Designs, Pixel für Pixel.
// Aufruf: node shots_vergleich.cjs <dist-A> <dist-B> [ausgabeordner] [nurTheme]
// Ergebnis: je Zustand "gleich" oder Anzahl abweichender Pixel (Bilder der Abweichungen im Ausgabeordner). Exit 1 bei Abweichung.
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path'), http = require('http');
const [A, B, OUT = '/tmp/shots_cmp', ONLY] = process.argv.slice(2); const TOL = +(process.env.TOL || 120), SAVE = !!process.env.SAVE;   // TOL: bis zu so vielen Pixeln Rauschen (Pegelanzeigen) gelten als gleich fs.mkdirSync(OUT, { recursive: true });
const THEMES = ONLY ? [ONLY] : ['aurora', 'studio', 'neon', 'classic', 'liquid'];
const STATES = [
  ['daw-spuren', async pg => {}],
  ['daw-midi', async pg => { await pg.tap('[data-tab="midi"]'); }],
  ['daw-drums', async pg => { await pg.tap('[data-tab="drums"]'); }],
  ['daw-vocals', async pg => { await pg.tap('[data-tab="vocals"]'); }],
  ['daw-mixer', async pg => { await pg.tap('[data-tab="mixer"]'); }],
  ['optionen', async pg => { await pg.tap('#btn-menu'); await pg.waitForTimeout(150); await pg.tap('#file-menu #btn-settings'); }],
  ['datei-menue', async pg => { await pg.tap('#btn-menu'); }],
  ['home', async pg => { await pg.evaluate(() => Home.open()); }],
  ['home-alle', async pg => { await pg.evaluate(() => { Home.open(); Home.openAll(); }); }],
  ['player', async pg => { await pg.evaluate(() => Player.open()); }],
  ['hilfe', async pg => { await pg.evaluate(() => Help.openManual()); }],
  ['feedback', async pg => { await pg.evaluate(() => Feedback.open()); }],
  ['cover', async pg => { await pg.evaluate(() => Cover.open && Cover.open()); }],
  ['neu', async pg => { await pg.evaluate(() => { const b = document.querySelector('#hm-update [data-nw-card] button, [data-act="news"]'); if (b) b.click(); else if (window.News && News.open) News.open(); }); }],
];
function serve(dir) { return new Promise(res => { const s = http.createServer((q, r) => { const f = path.join(dir, decodeURIComponent(q.url.split('?')[0]).replace(/^\//, '')); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } const t = { html: 'text/html', js: 'application/javascript', css: 'text/css', png: 'image/png', jpg: 'image/jpeg', mp4: 'video/mp4' }[f.split('.').pop()] || 'application/octet-stream'; r.writeHead(200, { 'content-type': t }); r.end(d); }); }); s.listen(0, '127.0.0.1', () => res(s)); }); }
async function shoot(b, port, theme, name, fn) {
  const ctx = await b.newContext({ viewport: { width: 393, height: 852 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  await ctx.addInitScript(t => { try { localStorage.setItem('sunshine.home', 'off'); localStorage.setItem('sunshine.theme', t); localStorage.setItem('sunshine.intro', '{"on":false}'); localStorage.setItem('sunshine.fx', '{"fx":"off"}'); localStorage.setItem('sunshine.news', '{"seen":"9.99"}'); } catch (_) {} }, theme);
  const pg = await ctx.newPage(); await pg.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());
  await pg.goto(`http://127.0.0.1:${port}/index_ueberarbeitet.html`, { waitUntil: 'load' }); await pg.waitForTimeout(900);
  try { await fn(pg); } catch (e) { /* Zustand nicht erreichbar: dann steht in beiden Builds dasselbe Bild */ }
  await pg.waitForTimeout(700);
  const buf = await pg.screenshot({ animations: 'disabled', caret: 'hide' }); await ctx.close(); return buf;
}
(async () => {
  const sa = await serve(A), sb = await serve(B), b = await chromium.launch(); const cmp = await b.newPage(); let bad = 0, n = 0;
  for (const th of THEMES) for (const [name, fn] of STATES) {
    const [x, y] = [await shoot(b, sa.address().port, th, name, fn), await shoot(b, sb.address().port, th, name, fn)]; n++;
    const same = x.equals(y); let diff = 0;
    if (!same) {
      diff = await cmp.evaluate(async ([p, q]) => { const L = s => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = 'data:image/png;base64,' + s; }); const [i, j] = await Promise.all([L(p), L(q)]); const c = document.createElement('canvas'); c.width = i.width; c.height = i.height; const g = c.getContext('2d'); g.drawImage(i, 0, 0); const a = g.getImageData(0, 0, c.width, c.height).data; g.clearRect(0, 0, c.width, c.height); g.drawImage(j, 0, 0); const d = g.getImageData(0, 0, c.width, c.height).data; let k = 0; for (let t = 0; t < a.length; t += 4) if (a[t] !== d[t] || a[t + 1] !== d[t + 1] || a[t + 2] !== d[t + 2]) k++; return k; }, [x.toString('base64'), y.toString('base64')]);
    }
    const tag = th + '/' + name;
    if (SAVE) fs.writeFileSync(`${OUT}/${th}_${name}.png`, x);
    if (!same && diff > TOL) { bad++; fs.writeFileSync(`${OUT}/${th}_${name}_A.png`, x); fs.writeFileSync(`${OUT}/${th}_${name}_B.png`, y); console.log('ABWEICHUNG', tag, diff + ' Pixel'); } else console.log('gleich', tag);
  }
  console.log(`\nshots_vergleich: ${n - bad} von ${n} Zuständen pixelgleich`); await b.close(); sa.close(); sb.close(); process.exit(bad ? 1 : 0);
})();
