/* ===== Sunshine@R · Live-Update der Oberfläche =====
   Lädt eine neue Version der Web-Oberfläche (index.html) direkt von GitHub und speichert sie im Cache-Speicher der App.
   Der Service Worker (sw.js, vom Build in die App gelegt) liefert sie beim nächsten Start aus. Kein neues APK nötig.
   Gilt nur, wenn die App-Hülle unverändert ist (Prüfsumme „nat“); sonst bleibt es beim normalen APK-Update.
   Sicherheitsnetze: Prüfsumme der geladenen Datei, „pending → ok“-Bestätigung nach erfolgreichem Start, Rückfall auf die eingebaute Version. */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const { esc, say } = window.SunUtil;
  const B = window.SUNSHINE_BUILD || {};
  const NAT = /^[0-9a-f]{6,}$/.test(String(B.nat || '')) ? String(B.nat) : '';
  const VER = String(B.v || '');
  const C = 'sunshine-live', KEY = 'sunshine.live';
  const TOK = n => '__BUILD_' + n + '__';   // absichtlich zusammengesetzt: der Build ersetzt die Platzhalter im ganzen Text – dieser Code darf sie nicht als Ganzes enthalten
  let L = { on: true, bad: null }; SunStore.merge(L, KEY);
  const saveL = () => SunStore.save(KEY, L);
  const U = () => window.Update;
  const cmp = (a, b) => { try { return window.News._cmp(a, b); } catch (_) { return String(a) === String(b) ? 0 : 1; } };
  const dateDe = ts => { try { return new Date(ts).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }); } catch (_) { return ''; } };

  function why() {   // warum Live-Updates auf diesem Gerät nicht gehen (leer = möglich)
    if (!NAT || !U() || !U().repo()) return 'Entwicklungsversion – Live-Updates gibt es nur in der gebauten App.';
    if (!(window.isSecureContext && /^https?:$/.test(location.protocol))) return 'Diese Umgebung erlaubt keinen Hintergrunddienst.';
    if (!('serviceWorker' in navigator) || !window.caches) return 'Dieses Gerät unterstützt keinen Hintergrunddienst (Service Worker).';
    if (!(window.crypto && crypto.subtle)) return 'Prüfsummen-Funktion fehlt.';
    if (L.swFail) return 'Der Hintergrunddienst läuft in dieser App nicht (' + L.swFail + ').';
    if (swErr) return 'Der Hintergrunddienst konnte nicht starten (' + swErr + ').';
    return '';
  }
  const supported = () => !why();
  async function cache() { return caches.open(C); }
  async function readMeta() { try { const r = await (await cache()).match('/__live/meta'); return r ? await r.json() : null; } catch (_) { return null; } }
  async function writeMeta(m) { const c = await cache(); await c.put('/__live/meta', new Response(JSON.stringify(m), { headers: { 'Content-Type': 'application/json' } })); }
  async function clear() { try { const c = await cache(); await c.delete('/__live/page'); await c.delete('/__live/meta'); } catch (_) {} }
  let regP = null, swErr = '';
  function ensureSW() {
    if (regP) return regP;
    regP = (async () => {
      const t = new Promise((_, rej) => setTimeout(() => rej(new Error('Der Hintergrunddienst startet nicht.')), 6000));
      const go = (async () => { let reg = await navigator.serviceWorker.getRegistration(); if (!reg) reg = await navigator.serviceWorker.register('sw.js'); await navigator.serviceWorker.ready; return reg; })();
      return Promise.race([go, t]);
    })().catch(e => { regP = null; throw e; });
    return regP;
  }

  /* Gibt es für diese Release ein passendes Live-Update? */
  function offer(l) {
    if (!l) return { kind: 'none' };
    const lv = l.live; if (!lv || !lv.v || !lv.sha || !lv.path) return { kind: 'none', why: 'kein Live-Paket in dieser Release' };
    if (!L.on) return { kind: 'none', why: 'aus' };
    const w = why(); if (w) return { kind: 'none', why: w };
    if (String(lv.nat) !== NAT) return { kind: 'apk', why: 'Die App-Hülle hat sich geändert – dafür wird eine neue APK gebraucht.', v: lv.v };
    if (L.bad && L.bad.v === lv.v) return { kind: 'none', why: 'Diese Version ließ sich auf diesem Gerät nicht starten und wird übersprungen.' };
    if (cmp(lv.v, VER) <= 0) return { kind: 'none', why: 'aktuell' };
    if (L.ready === lv.v) return { kind: 'ready', v: lv.v };
    return { kind: 'live', v: lv.v, live: lv };
  }

  async function download(l, o) {
    o = o || {}; const prog = o.onProgress || (() => {});
    const of = offer(l); if (of.kind !== 'live' && of.kind !== 'ready') throw new Error(of.why || 'Kein Live-Update verfügbar.');
    const lv = l.live, repo = U().repo();
    prog('Hintergrunddienst prüfen …'); await ensureSW();
    prog('Lade Oberfläche ' + lv.v + ' …');
    const url = 'https://raw.githubusercontent.com/' + repo + '/' + encodeURIComponent(lv.sha) + '/' + lv.path.split('/').map(encodeURIComponent).join('/');
    let r; try { r = await fetch(url, { cache: 'no-store' }); } catch (e) { throw new Error('Keine Verbindung zu GitHub.'); }
    if (!r.ok) throw new Error('Download fehlgeschlagen (Fehler ' + r.status + '). Das Repository muss öffentlich sein.');
    const buf = await r.arrayBuffer();
    prog('Prüfe Datei …');
    if (lv.h) { const d = new Uint8Array(await crypto.subtle.digest('SHA-256', buf)); const hex = Array.from(d, b => b.toString(16).padStart(2, '0')).join(''); if (hex !== String(lv.h).toLowerCase()) throw new Error('Prüfsumme stimmt nicht – die Datei wurde verworfen.'); }
    let txt = new TextDecoder('utf-8').decode(buf);
    if (!/<html[\s>]/i.test(txt) || !/<\/html>\s*$/i.test(txt) || txt.indexOf('SUNSHINE_BUILD') < 0 || txt.indexOf(TOK('N')) < 0) throw new Error('Die Datei sieht nicht wie die App-Oberfläche aus – verworfen.');
    const mv = /SUNSHINE_BUILD\s*=\s*\{[^}]*\bv\s*:\s*'([^']*)'/.exec(txt); if (!mv || mv[1] !== lv.v) throw new Error('Versionsangabe in der Datei passt nicht zur Release – verworfen.');
    const rep = (s, k, v) => s.split(k).join(String(v));
    txt = rep(txt, TOK('N'), B.n); txt = rep(txt, TOK('REPO'), B.repo); txt = rep(txt, TOK('TIME'), (l.published || '').slice(0, 10) || B.time || ''); txt = rep(txt, TOK('NATIVE'), NAT);
    prog('Speichern …');
    const c = await cache();
    await c.delete('/__live/meta');
    await c.put('/__live/page', new Response(txt, { headers: { 'Content-Type': 'text/html; charset=utf-8' } }));
    await writeMeta({ v: lv.v, n: String(B.n), nat: NAT, sha: lv.sha, h: lv.h || '', ts: Date.now(), status: 'pending', boots: 0, miss: 0, size: buf.byteLength });
    L.bad = null; L.ready = lv.v; saveL();
    return { ok: true, v: lv.v, size: buf.byteLength };
  }
  const restart = () => { try { location.reload(); } catch (_) {} };
  async function reset(o) { await clear(); L.bad = null; L.ready = null; saveL(); if (!o || o.reload !== false) restart(); return true; }
  function setOn(on) { L.on = !!on; saveL(); if (!on) clear(); }

  /* Beim Start: war es die Live-Seite? Dann prüfen und bestätigen – sonst zurück auf die eingebaute Version. */
  async function health() {
    try {
      if (!supported()) { window.__sunshineBoot = 1; return; }
      const m = await readMeta(); if (!m) { if (L.ready) { L.ready = null; saveL(); } window.__sunshineBoot = 1; return; }
      if (m.status === 'pending') {
        if (String(m.v) !== VER) {   // Service Worker hat die Live-Seite nicht ausgeliefert
          m.miss = (m.miss || 0) + 1;
          if (m.miss >= 2) { await clear(); L.ready = null; L.bad = { v: m.v, why: 'sw' }; L.swFail = 'er liefert die neue Oberfläche nicht aus'; saveL(); say('Live-Update geht auf diesem Gerät nicht – die App bleibt bei der eingebauten Version.', 'warn'); }
          else await writeMeta(m);
          window.__sunshineBoot = 1; return;
        }
        const ready = typeof dawState !== 'undefined' && typeof audioEngine !== 'undefined' && !!window.Home && !!$('btn-menu');
        const wv = /; wv\)/.test(navigator.userAgent), bridge = !wv || !!window.Capacitor;
        if (ready && bridge) { m.status = 'ok'; m.boots = 0; L.ready = null; saveL(); await writeMeta(m); window.__sunshineBoot = 1; say('Oberfläche aktualisiert: Version ' + m.v, 'success'); }
        else { m.status = 'bad'; m.why = ready ? 'bridge' : 'start'; await writeMeta(m); L.bad = { v: m.v, why: m.why }; L.ready = null; saveL(); window.__sunshineBoot = 1; restart(); }
        return;
      }
      window.__sunshineBoot = 1;
    } catch (_) { window.__sunshineBoot = 1; }
  }
  async function info() {
    const m = supported() ? await readMeta() : null;
    return { supported: supported(), why: why(), on: L.on, version: VER, meta: m, bad: L.bad, live: !!(m && m.status === 'ok' && String(m.v) === VER) };
  }
  function mount(ph) {
    ph.innerHTML = `<div class="flex justify-between items-baseline"><span class="text-sm font-semibold">Oberfläche</span><span class="text-xs font-mono text-slate-300" data-lv-ver>…</span></div>
      <label class="flex items-start gap-3 mt-2 cursor-pointer"><input type="checkbox" data-lv-on ${L.on ? 'checked' : ''} class="mt-1 w-5 h-5 shrink-0"><span class="min-w-0"><span class="block text-sm font-semibold">Live-Updates der Oberfläche</span><span class="block text-[11px] text-slate-400">Kleine Änderungen ohne neue APK. Du wirst gefragt, bevor etwas geladen wird. Startet eine neue Oberfläche nicht, springt die App selbst auf die eingebaute Version zurück.</span></span></label>
      <div data-lv-note class="hidden mt-1 text-[11px] text-amber-300"></div>
      <button type="button" data-lv-reset class="hidden mt-2 w-full py-2 text-xs font-bold rounded-xl border border-slate-700 bg-slate-900 text-slate-200">Auf eingebaute Version zurücksetzen</button>`;
    const paint = async () => {
      const i = await info(), ver = ph.querySelector('[data-lv-ver]'), note = ph.querySelector('[data-lv-note]'), rs = ph.querySelector('[data-lv-reset]');
      ver.textContent = (VER ? 'Version ' + VER : '–') + (i.live ? ' · Live (' + dateDe(i.meta.ts) + ')' : ' · eingebaut');
      const msg = !i.supported ? i.why : (i.meta && i.meta.status === 'pending' ? 'Version ' + i.meta.v + ' ist geladen und startet beim nächsten Öffnen der App.' : (i.bad ? 'Version ' + i.bad.v + ' wurde übersprungen (' + ({ sw: 'Hintergrunddienst', bridge: 'Android-Brücke fehlt', start: 'Start fehlgeschlagen', boot: 'Start fehlgeschlagen' }[i.bad.why] || i.bad.why) + ').' : ''));
      note.textContent = msg; note.classList.toggle('hidden', !msg);
      rs.classList.toggle('hidden', !(i.meta || i.bad));
    };
    paint();
    ph.addEventListener('change', e => { if (e.target.matches('[data-lv-on]')) { setOn(e.target.checked); paint(); } });
    ph.addEventListener('click', async e => { if (e.target.closest('[data-lv-reset]')) { await reset(); } });
    return paint;
  }
  async function boot() {
    if (L.on && supported()) { try { await ensureSW(); } catch (e) { swErr = String(e && e.message || e).slice(0, 60); } }
    setTimeout(health, 2500);
  }
  window.Live = { supported, why, offer, download, restart, reset, setOn, info, mount, health, _state: () => Object.assign({}, L), _readMeta: readMeta, _writeMeta: writeMeta, _clear: clear };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
