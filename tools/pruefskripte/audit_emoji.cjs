// Listet sichtbare Emoji, die trotz „Einheitliche Linien-Icons“ als Emoji erscheinen (nicht umgewandelt).
const { chromium } = require('playwright'), fs = require('fs'), path = require('path'), http = require('http');
const [DIST, THEME = 'aurora'] = process.argv.slice(2);
const VIEWS = [
  ['daw', async pg => {}], ['daw-editor', async pg => { await pg.tap('[data-tab="midi"]'); }], ['daw-drums', async pg => { await pg.tap('[data-tab="drums"]'); }], ['daw-vocals', async pg => { await pg.tap('[data-tab="vocals"]'); }], ['daw-mixer', async pg => { await pg.tap('[data-tab="mixer"]'); }],
  ['datei-menue', async pg => { await pg.tap('#btn-menu'); }],
  ['optionen', async pg => { await pg.tap('#btn-menu'); await pg.waitForTimeout(150); await pg.tap('#file-menu #btn-settings'); }],
  ['home', async pg => { await pg.evaluate(() => Home.open()); }], ['home-alle', async pg => { await pg.evaluate(() => { Home.open(); Home.openAll(); }); }],
  ['player', async pg => { await pg.evaluate(() => Player.open()); }],
  ['feedback', async pg => { await pg.evaluate(() => Feedback.open()); }], ['hilfe', async pg => { await pg.evaluate(() => Help.openManual()); }], ['neu', async pg => { await pg.evaluate(() => News.open()); }],
];
function serve(dir) { return new Promise(res => { const s = http.createServer((q, r) => { const f = path.join(dir, decodeURIComponent(q.url.split('?')[0]).replace(/^\//, '')); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': /\.html$/.test(f) ? 'text/html' : /\.js$/.test(f) ? 'application/javascript' : 'application/octet-stream' }); r.end(d); }); }); s.listen(0, '127.0.0.1', () => res(s)); }); }
(async () => {
  const srv = await serve(DIST), b = await chromium.launch();
  for (const [name, fn] of VIEWS) {
    const ctx = await b.newContext({ viewport: { width: 393, height: 852 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
    await ctx.addInitScript(t => { try { localStorage.setItem('sunshine.home', 'off'); localStorage.setItem('sunshine.theme', t); localStorage.setItem('sunshine.news', '{"seen":"9.99"}'); localStorage.setItem('sunshine.intro', '{"on":false}'); } catch (_) {} }, THEME);
    const pg = await ctx.newPage(); await pg.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());
    await pg.goto(`http://127.0.0.1:${srv.address().port}/index_ueberarbeitet.html`, { waitUntil: 'load' }); await pg.waitForTimeout(900);
    try { await fn(pg); } catch (e) { console.log('Zustand nicht erreichbar:', name); }
    await pg.waitForTimeout(500);
    const r = await pg.evaluate(() => {
      const EM = /[\u{1F300}-\u{1FAFF}]|[☀-➿]|[⬀-⯿]|[←-⇿]|[⌀-⏿]/u; const res = {};
      const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      for (let n = w.nextNode(); n; n = w.nextNode()) {
        const t = n.nodeValue; if (!EM.test(t)) continue; const p = n.parentElement; if (!p || p.closest('.ic-e,script,style,option,svg')) continue;
        const r = p.getBoundingClientRect(); const cs = getComputedStyle(p); if (r.width < 4 || r.height < 4 || cs.visibility === 'hidden' || cs.display === 'none') continue;
        const top = document.elementFromPoint(Math.min(innerWidth - 1, Math.max(0, r.left + r.width / 2)), Math.min(innerHeight - 1, Math.max(0, r.top + r.height / 2))); if (!top || !(p === top || p.contains(top) || top.contains(p))) continue;
        const m = EM.exec(t)[0]; const k = m + '  in  ' + p.tagName.toLowerCase() + (p.id ? '#' + p.id : '') + (p.className && typeof p.className === 'string' ? '.' + p.className.split(' ').slice(0, 2).join('.') : '') + '  «' + t.trim().slice(0, 28) + '»'; res[k] = (res[k] || 0) + 1;
      }
      return res;
    });
    const ks = Object.keys(r); console.log(`\n== ${name} (${ks.length})`); ks.slice(0, 30).forEach(k => console.log('  ' + r[k] + '× ' + k));
    await ctx.close();
  }
  await b.close(); srv.close();
})();
