// Prüft, ob die Einstellung „Rundung“ (Eckig / Normal / Extra rund) in ALLEN Ansichten greift.
// Aufruf: node audit_rundung.cjs <dist> [sharp|round] [theme]   → Liste der Elemente, deren Ecken nicht zur Einstellung passen
const { chromium } = require('playwright'), fs = require('fs'), path = require('path'), http = require('http');
const [DIST, MODE = 'sharp', THEME = 'aurora'] = process.argv.slice(2);
const MAXR = { sharp: +(process.env.MAXR || 12), round: 0 };   // Eckig: nichts über 14 px (Kopfleiste/Dock-Rahmen erlaubt 14); Rund: wird nur gelistet, wenn < 8 px bei großen Flächen
const VIEWS = [
  ['daw', async pg => {}], ['daw-mixer', async pg => { await pg.tap('[data-tab="mixer"]'); }],
  ['optionen', async pg => { await pg.tap('#btn-menu'); await pg.waitForTimeout(150); await pg.tap('#file-menu #btn-settings'); }],
  ['home', async pg => { await pg.evaluate(() => Home.open()); }], ['home-alle', async pg => { await pg.evaluate(() => { Home.open(); Home.openAll(); }); }],
  ['player', async pg => { await pg.evaluate(() => Player.open()); }],
  ['feedback', async pg => { await pg.evaluate(() => Feedback.open()); }], ['hilfe', async pg => { await pg.evaluate(() => Help.openManual()); }],
  ['cover', async pg => { await pg.evaluate(() => Cover.open && Cover.open()); }],
];
function serve(dir) { return new Promise(res => { const s = http.createServer((q, r) => { const f = path.join(dir, decodeURIComponent(q.url.split('?')[0]).replace(/^\//, '')); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': /\.html$/.test(f) ? 'text/html' : /\.js$/.test(f) ? 'application/javascript' : /\.png$/.test(f) ? 'image/png' : 'application/octet-stream' }); r.end(d); }); }); s.listen(0, '127.0.0.1', () => res(s)); }); }
(async () => {
  const srv = await serve(DIST), b = await chromium.launch(); const out = {};
  for (const [name, fn] of VIEWS) {
    const ctx = await b.newContext({ viewport: { width: 393, height: 852 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
    await ctx.addInitScript(([t, m]) => { try { localStorage.setItem('sunshine.home', 'off'); localStorage.setItem('sunshine.theme', t); localStorage.setItem('sunshine.ui', JSON.stringify({ radius: m })); localStorage.setItem('sunshine.news', '{"seen":"9.99"}'); localStorage.setItem('sunshine.intro', '{"on":false}'); } catch (_) {} }, [THEME, MODE]);
    const pg = await ctx.newPage(); await pg.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());
    await pg.goto(`http://127.0.0.1:${srv.address().port}/index_ueberarbeitet.html`, { waitUntil: 'load' }); await pg.waitForTimeout(900);
    try { await fn(pg); } catch (e) { console.log('Zustand nicht erreichbar:', name); }
    await pg.waitForTimeout(600);
    out[name] = await pg.evaluate(([mode, maxr]) => {
      const res = {}; const tag = e => { let s = e.tagName.toLowerCase(); if (e.id) s += '#' + e.id; const c = [...e.classList].filter(x => !/^(w-|h-|p[xytblr]?-|m[xytblr]?-|text-|bg-|border-|flex|grid|gap|items|justify|space|font|min-|max-|shrink|grow|truncate|overflow|relative|absolute|block|inline|hidden|opacity)/.test(x)).slice(0, 3); if (c.length) s += '.' + c.join('.'); return s; };
      document.querySelectorAll('body *').forEach(e => {
        const r = e.getBoundingClientRect(); if (r.width < 14 || r.height < 14) return; const cs = getComputedStyle(e); if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity === 0) return;
        if (r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) return;
        const v = parseFloat(cs.borderTopLeftRadius) || 0, bg = cs.backgroundColor !== 'rgba(0, 0, 0, 0)' || cs.backgroundImage !== 'none' || parseFloat(cs.borderTopWidth) > 0 || cs.boxShadow !== 'none';
        if (!bg) return; const top = document.elementFromPoint(Math.min(innerWidth - 1, Math.max(0, r.left + r.width / 2)), Math.min(innerHeight - 1, Math.max(0, r.top + r.height / 2))); if (!top || !(e === top || e.contains(top))) return;   // verdeckte Elemente zählen nicht
        const bad = mode === 'sharp' ? v > maxr : (v < 8 && r.width > 120 && r.height > 36);
        if (bad) { const k = tag(e) + ' · ' + Math.round(v) + 'px'; res[k] = (res[k] || 0) + 1; }
      });
      return res;
    }, [MODE, MAXR[MODE] || 0]);
    await ctx.close();
  }
  for (const [n, r] of Object.entries(out)) { const ks = Object.keys(r); console.log(`\n== ${n} (${ks.length} Typen)`); ks.sort((a, b) => r[b] - r[a]).slice(0, 40).forEach(k => console.log('  ' + String(r[k]).padStart(3) + '× ' + k)); }
  await b.close(); srv.close();
})();
