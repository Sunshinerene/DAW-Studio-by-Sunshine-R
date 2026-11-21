// Misst die Startzeit je Skriptblock (Parsen + Ausführen) mit gedrosselter CPU (Handy-Näherung).
// Aufruf: node audit_start.cjs <absoluter-dist-pfad> [drossel=4] [läufe=3]
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path');
(async () => {
  const dist = process.argv[2], thr = +(process.argv[3] || 4), runs = +(process.argv[4] || 3);
  let h = fs.readFileSync(path.join(dist, 'index_ueberarbeitet.html'), 'utf8');
  const names = []; let i = 0;
  h = h.replace(/<script([^>]*)>([\s\S]*?)<\/script>/g, (m, a, body) => {
    if (/type="text\/plain"|application\/json/.test(a)) return m;
    const mk = '<script>(window.__t=window.__t||[]).push(performance.now());</script>';
    if (/src=/.test(a)) { names.push('extern ' + (a.match(/src="([^"]+)"/) || [, '?'])[1].slice(-40)); return m + mk; }
    if (!body.trim()) return m;
    const first = (body.match(/\/\*+\s*([^\n]*)/) || [, body.trim().slice(0, 50)])[1].replace(/=+/g, '').trim().slice(0, 70);
    names.push(first); return m + mk;
  });
  h = h.replace('<head>', '<head><script>window.__t0=performance.now();(window.__t=window.__t||[]);</script>');
  const tmp = path.join(dist, '_start_probe.html'); fs.writeFileSync(tmp, h);
  const b = await chromium.launch(); const sums = new Array(names.length).fill(0); const tot = []; const rdy = [];
  for (let r = 0; r < runs; r++) {
    const ctx = await b.newContext({ viewport: { width: 393, height: 852 }, isMobile: true, hasTouch: true });
    await ctx.addInitScript(() => { try { localStorage.setItem('sunshine.home', 'off'); localStorage.setItem('sunshine.intro', '{"on":false}'); } catch (e) {} });
    const pg = await ctx.newPage(); const cdp = await ctx.newCDPSession(pg); await cdp.send('Emulation.setCPUThrottlingRate', { rate: thr });
    await pg.route(/cdnjs|googleapis|gstatic/, rt => rt.abort());
    await pg.goto('file://' + tmp, { waitUntil: 'load' }); await pg.waitForTimeout(1500);
    const t = await pg.evaluate(() => ({ t: window.__t, t0: window.__t0, load: performance.getEntriesByType('navigation')[0].loadEventEnd }));
    let prev = t.t0; t.t.forEach((v, k) => { if (names[k] !== undefined) sums[k] += v - prev; prev = v; });
    tot.push(prev - t.t0); rdy.push(t.load); await ctx.close();
  }
  await b.close(); fs.unlinkSync(tmp);
  const rows = names.map((n, k) => [n, sums[k] / runs]).sort((a, b) => b[1] - a[1]);
  console.log('Drossel ' + thr + 'x, Mittel aus ' + runs + ' Läufen');
  console.log('Summe Skriptblöcke: ' + (tot.reduce((a, b) => a + b, 0) / runs).toFixed(0) + ' ms · load-Ereignis: ' + (rdy.reduce((a, b) => a + b, 0) / runs).toFixed(0) + ' ms');
  rows.slice(0, 22).forEach(([n, ms]) => console.log(ms.toFixed(0).padStart(6) + ' ms  ' + n));
})();
