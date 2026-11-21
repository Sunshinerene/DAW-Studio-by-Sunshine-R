// Prüft je CSS-Regel mit !important, ob die Regel ohne !important in allen getesteten Zuständen/Designs dasselbe Ergebnis liefert.
// Aufruf: node audit_important.cjs <dist> [ausgabe.json]      (Zustände wie in shots_vergleich.cjs; nur Regeln ohne :hover/:active/:focus)
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path'), http = require('http');
const [DIST, OUT = '/tmp/important.json'] = process.argv.slice(2);
const THEMES = ['aurora', 'studio', 'neon', 'classic', 'liquid'];
const STATES = [
  ['spuren', async pg => {}], ['midi', async pg => { await pg.tap('[data-tab="midi"]'); }], ['drums', async pg => { await pg.tap('[data-tab="drums"]'); }],
  ['vocals', async pg => { await pg.tap('[data-tab="vocals"]'); }], ['mixer', async pg => { await pg.tap('[data-tab="mixer"]'); }],
  ['optionen', async pg => { await pg.tap('#btn-menu'); await pg.waitForTimeout(150); await pg.tap('#file-menu #btn-settings'); }],
  ['menue', async pg => { await pg.tap('#btn-menu'); }], ['home', async pg => { await pg.evaluate(() => Home.open()); }],
  ['home-alle', async pg => { await pg.evaluate(() => { Home.open(); Home.openAll(); }); }], ['player', async pg => { await pg.evaluate(() => Player.open()); }],
  ['hilfe', async pg => { await pg.evaluate(() => Help.openManual()); }], ['feedback', async pg => { await pg.evaluate(() => Feedback.open()); }],
  ['cover', async pg => { await pg.evaluate(() => Cover.open && Cover.open()); }],
];
const PROBE = () => {
  const SKIP = /:hover|:active|:focus|:target|:checked|:disabled|::-webkit|::selection|::placeholder|::-moz|:fullscreen|::backdrop/;
  const res = {};
  const all = [];
  const walk = (rules, ctx, sh) => { for (let i = 0; i < rules.length; i++) { const r = rules[i];
    if (r.type === 1) all.push({ r, ctx, parent: rules, i });
    else if (r.type === 4) { if (matchMedia(r.conditionText).matches) walk(r.cssRules, ctx + '@media ' + r.conditionText, sh); }
    else if (r.type === 12) { if (CSS.supports(r.conditionText)) walk(r.cssRules, ctx + '@supports ' + r.conditionText, sh); } } };
  for (const sh of document.styleSheets) { const n = sh.ownerNode; if (!n || n.id === 'tw-precompiled') continue; try { walk(sh.cssRules, '', sh); } catch (_) {} }
  const snap = (els, pseudo) => els.map(e => { const cs = getComputedStyle(e, pseudo || null); let s = ''; for (let k = 0; k < cs.length; k++) { const p = cs[k]; s += p + ':' + cs.getPropertyValue(p) + ';'; } return s; });
  for (const { r, ctx, parent, i } of all) {
    if (!/!important/.test(r.cssText) || SKIP.test(r.selectorText)) continue;
    const key = ctx + '|' + r.selectorText; const parts = r.selectorText.split(',').map(s => s.trim());
    let els = [], pseudo = null; let bad = false;
    for (const p of parts) { const m = p.match(/^(.*?)(::?(?:before|after))$/); const base = m ? m[1] || '*' : p; try { document.querySelectorAll(base).forEach(e => { if (els.length < 40) els.push([e, m ? m[2].replace(/^:+/, '::') : null]); }); } catch (_) { bad = true; } }
    if (bad) continue; const n = els.length; if (!n) { res[key] = res[key] || { n: 0, ch: false, txt: r.cssText.slice(0, 80) }; continue; }
    const before = els.map(([e, ps]) => snap([e], ps)[0]);
    const orig = r.cssText; const body = orig.slice(orig.indexOf('{') + 1, orig.lastIndexOf('}')).replace(/\s*!important/g, '');
    const wasSheet = parent; const old = parent[i]; let ok = true;
    const par = old.parentRule || old.parentStyleSheet; const sheetOrRule = par;
    try { sheetOrRule.deleteRule(i); sheetOrRule.insertRule(r.selectorText + '{' + body + '}', i); } catch (e) { ok = false; }
    let ch = false; if (ok) { const after = els.map(([e, ps]) => snap([e], ps)[0]); ch = after.some((a, k) => a !== before[k]); try { sheetOrRule.deleteRule(i); sheetOrRule.insertRule(orig, i); } catch (e) { res.__fehler = (res.__fehler || 0) + 1; } }
    const cur = res[key] || { n: 0, ch: false, txt: orig.slice(0, 80) }; cur.n = Math.max(cur.n, n); cur.ch = cur.ch || ch; if (!ok) cur.err = true; res[key] = cur;
  }
  return res;
};
function serve(dir) { return new Promise(res => { const s = http.createServer((q, r) => { const f = path.join(dir, decodeURIComponent(q.url.split('?')[0]).replace(/^\//, '')); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } const t = { html: 'text/html', js: 'application/javascript', css: 'text/css', png: 'image/png', jpg: 'image/jpeg', mp4: 'video/mp4' }[f.split('.').pop()] || 'application/octet-stream'; r.writeHead(200, { 'content-type': t }); r.end(d); }); }); s.listen(0, '127.0.0.1', () => res(s)); }); }
(async () => {
  const srv = await serve(DIST), b = await chromium.launch(); const agg = {};
  for (const th of THEMES) for (const [name, fn] of STATES) {
    const ctx = await b.newContext({ viewport: { width: 393, height: 852 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
    await ctx.addInitScript(t => { try { localStorage.setItem('sunshine.home', 'off'); localStorage.setItem('sunshine.theme', t); localStorage.setItem('sunshine.intro', '{"on":false}'); localStorage.setItem('sunshine.fx', '{"fx":"off"}'); localStorage.setItem('sunshine.news', '{"seen":"9.99"}'); } catch (_) {} }, th);
    const pg = await ctx.newPage(); await pg.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());
    await pg.goto(`http://127.0.0.1:${srv.address().port}/index_ueberarbeitet.html`, { waitUntil: 'load' }); await pg.waitForTimeout(800);
    try { await fn(pg); } catch (_) {} await pg.waitForTimeout(500);
    const r = await pg.evaluate(PROBE);
    for (const [k, v] of Object.entries(r)) { if (k === '__fehler') continue; const a = agg[k] = agg[k] || { n: 0, ch: false, txt: v.txt, zustaende: 0 }; a.n = Math.max(a.n, v.n); a.ch = a.ch || v.ch; if (v.n) a.zustaende++; }
    await ctx.close(); process.stdout.write('.');
  }
  fs.writeFileSync(OUT, JSON.stringify(agg, null, 1)); const v = Object.entries(agg);
  const redundant = v.filter(([k, a]) => a.n > 0 && !a.ch), needed = v.filter(([k, a]) => a.ch), untested = v.filter(([k, a]) => a.n === 0);
  console.log(`\nRegeln mit !important: ${v.length} · ohne !important gleich: ${redundant.length} · nötig (Ergebnis ändert sich): ${needed.length} · in keinem Zustand sichtbar (ungeprüft): ${untested.length}`);
  await b.close(); srv.close();
})();
