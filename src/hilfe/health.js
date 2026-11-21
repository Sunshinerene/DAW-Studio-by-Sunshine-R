/* ===== Sunshine@R · Stabilität & Leistung =====
   Fehlerprotokoll (zum Kopieren/Teilen), Speicher-Anzeige mit Warnung (Audio im Arbeitsspeicher), Sparmodus (weniger Rechenaufwand
   in der Darstellung), Anzeige-Test (Bilder pro Sekunde), Hinweis auf unerwartetes Ende des letzten Starts. */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const { esc, say } = window.SunUtil;
  const K_E = 'sunshine.errlog', K_P = 'sunshine.perf', K_A = 'sunshine.alive', MAXE = 40;
  const mbf = b => Math.round(b / 1048576);
  const dt = ts => { try { const d = new Date(ts), p = n => String(n).padStart(2, '0'); return p(d.getDate()) + '.' + p(d.getMonth() + 1) + '. ' + p(d.getHours()) + ':' + p(d.getMinutes()); } catch (_) { return ''; } };

  /* ---------- Fehlerprotokoll ---------- */
  let E = []; try { E = JSON.parse(localStorage.getItem(K_E) || '[]'); if (!Array.isArray(E)) E = []; } catch (_) { E = []; }
  const saveE = () => { try { localStorage.setItem(K_E, JSON.stringify(E.slice(-MAXE))); } catch (_) {} };
  const IGN = /ResizeObserver loop|^Script error\.?$|AbortError|The user aborted|NotAllowedError.*play\(\)/i;
  function addErr(e) {
    try {
      const m = String(e.m || '').slice(0, 240); if (!m || IGN.test(m)) return;
      const last = E[E.length - 1];
      if (last && last.m === m && last.s === (e.s || '')) { last.c = (last.c || 1) + 1; last.t = e.t || Date.now(); }
      else E.push({ t: e.t || Date.now(), m, s: e.s || '', c: 1 });
      if (E.length > MAXE) E = E.slice(-MAXE); saveE();
    } catch (_) {}
  }
  const early = Array.isArray(window.__errs) ? window.__errs.splice(0) : [];
  early.forEach(addErr);
  if (Array.isArray(window.__errs)) window.__errs.push = e => { addErr(e); return 0; };   // ab jetzt direkt ins Protokoll
  else {
    window.addEventListener('error', ev => addErr({ t: Date.now(), m: ev.message, s: String(ev.filename || '').split('/').pop() + ':' + ev.lineno }));
    window.addEventListener('unhandledrejection', ev => addErr({ t: Date.now(), m: 'Promise: ' + String(ev.reason && ev.reason.message || ev.reason) }));
  }
  const logMsg = (m, s) => addErr({ t: Date.now(), m: String(m), s: s || 'app' });

  /* ---------- Speicher ---------- */
  function trackName(id) { try { const t = (dawState.tracks || []).find(x => String(x.id) === String(id)); return t ? (t.name || t.label || ('Spur ' + id)) : String(id); } catch (_) { return String(id); } }
  function memory() {
    let bytes = 0, n = 0, secs = 0; const top = [];
    try { Object.keys(dawState.buffers || {}).forEach(id => { const b = dawState.buffers[id]; if (b && !b.__parked && b.length && b.numberOfChannels) { const by = b.length * b.numberOfChannels * 4; bytes += by; n++; secs += b.duration || 0; top.push({ id, name: trackName(id), bytes: by, sec: b.duration || 0 }); } }); } catch (_) {}
    top.sort((a, b) => b.bytes - a.bytes);
    const pm = performance && performance.memory ? performance.memory : null, dm = navigator.deviceMemory || 0;
    const lim = dm && dm <= 3 ? [300, 550] : [500, 900];
    const mb = bytes / 1048576, level = mb >= lim[1] ? 'high' : mb >= lim[0] ? 'warn' : 'ok';
    return { bytes, mb: Math.round(mb), tracks: n, seconds: Math.round(secs), top: top.slice(0, 4), heapUsed: pm ? pm.usedJSHeapSize : null, heapLimit: pm ? pm.jsHeapSizeLimit : null, deviceGB: dm || null, level, limits: lim };
  }
  const TIP = 'Tipp: Nicht benötigte Spuren löschen oder mehrere Stems zu einer Spur zusammenfassen, dann die App neu starten – das gibt Speicher frei.';
  let lastLevel = 'ok';
  function watch() {
    if (document.hidden) return;
    const m = memory(); try { const a = JSON.parse(localStorage.getItem(K_A) || '{}'); if (a.alive) { a.mb = m.mb; localStorage.setItem(K_A, JSON.stringify(a)); } } catch (_) {}
    const rank = { ok: 0, warn: 1, high: 2 };
    if (rank[m.level] > rank[lastLevel]) say(m.level === 'high' ? 'Sehr viel Audio im Arbeitsspeicher (≈ ' + m.mb + ' MB). Die App kann abstürzen. ' + TIP : 'Viel Audio im Arbeitsspeicher (≈ ' + m.mb + ' MB). ' + TIP, 'warn');
    lastLevel = m.level;
  }

  /* ---------- Sparmodus ---------- */
  const perfOn = () => { try { return localStorage.getItem(K_P) === '1'; } catch (_) { return false; } };
  function setPerf(on) { try { localStorage.setItem(K_P, on ? '1' : '0'); } catch (_) {} if (on) document.documentElement.setAttribute('data-perf', 'on'); else document.documentElement.removeAttribute('data-perf'); }
  if (perfOn()) document.documentElement.setAttribute('data-perf', 'on');

  /* ---------- Ende des letzten Starts ---------- */
  let prevCrash = null;
  try { const a = JSON.parse(localStorage.getItem(K_A) || 'null'); if (a && a.alive) { prevCrash = { t: a.t, mb: a.mb || 0 }; logMsg('Der letzte Start endete vermutlich unerwartet' + (a.mb ? ' (Audio im Speicher ≈ ' + a.mb + ' MB)' : '') + '.', 'start'); } } catch (_) {}
  const mark = alive => { try { localStorage.setItem(K_A, JSON.stringify({ alive, t: Date.now(), mb: alive ? memory().mb : 0 })); } catch (_) {} };
  mark(true);
  document.addEventListener('visibilitychange', () => mark(!document.hidden));
  window.addEventListener('pagehide', () => mark(false));

  /* ---------- Anzeige-Test ---------- */
  function fpsTest(ms) {
    ms = ms || 2000;
    return new Promise(res => { let n = 0, t0 = 0, last = 0, worst = 0; const f = t => { if (!t0) { t0 = t; last = t; } n++; worst = Math.max(worst, t - last); last = t; if (t - t0 < ms) requestAnimationFrame(f); else res({ fps: Math.round((n - 1) * 1000 / (t - t0)), worst: Math.round(worst) }); }; requestAnimationFrame(f); });
  }

  /* ---------- Bericht ---------- */
  function report() {
    const B = window.SUNSHINE_BUILD || {}, m = memory(), L = [];
    L.push('Sunshine@R DAW Studio · Fehlerbericht');
    L.push('Version ' + (B.v || '?') + ' · Build ' + (/^\d+$/.test(String(B.n)) ? B.n : 'Entwicklung') + ' · ' + new Date().toLocaleString('de-DE'));
    L.push('Gerät: ' + navigator.userAgent);
    L.push('Bildschirm: ' + innerWidth + '×' + innerHeight + ' @' + (devicePixelRatio || 1) + ' · Gerätespeicher: ' + (m.deviceGB ? '≈ ' + m.deviceGB + ' GB' : 'unbekannt'));
    L.push('Audio im Speicher: ≈ ' + m.mb + ' MB in ' + m.tracks + ' Puffern (' + m.seconds + ' s)' + (m.heapUsed ? ' · JS-Heap ' + mbf(m.heapUsed) + ' / ' + mbf(m.heapLimit) + ' MB' : ''));
    L.push('Sparmodus: ' + (perfOn() ? 'an' : 'aus'));
    try { if (window.Saver) { const sv = Saver.status(); L.push('Speicher-Sparer: ' + (sv.auto ? 'automatisch' : 'manuell') + ' · entladen ' + sv.parked + ' Spuren (≈ ' + sv.parkedMB + ' MB)'); } } catch (_) {}
    L.push(''); L.push('Fehler (' + E.length + '):');
    E.slice().reverse().forEach(e => L.push(dt(e.t) + (e.c > 1 ? ' ×' + e.c : '') + ' · ' + e.m + (e.s ? ' (' + e.s + ')' : '')));
    if (!E.length) L.push('– keine –');
    return L.join('\n');
  }
  async function copyText(t) {
    try { await navigator.clipboard.writeText(t); return true; } catch (_) {}
    try { const a = document.createElement('textarea'); a.value = t; a.style.cssText = 'position:fixed;left:-999px;top:0'; document.body.appendChild(a); a.select(); const ok = document.execCommand('copy'); a.remove(); return ok; } catch (_) { return false; }
  }

  /* ---------- Optionen ---------- */
  function section(ph) {
    ph.innerHTML = `<div class="text-[11px] font-bold uppercase tracking-wider text-slate-400 mt-4 mb-1">Stabilität &amp; Leistung</div>
      <div class="rounded-xl border border-slate-800 p-3 space-y-3">
        <div><div class="flex justify-between items-baseline"><span class="text-sm font-semibold">Arbeitsspeicher</span><span class="text-xs font-mono text-slate-300" data-hl-mem>…</span></div>
          <div class="text-[11px] text-slate-400" data-hl-memtxt></div></div>
        <label class="flex items-start gap-3 cursor-pointer"><input type="checkbox" data-hl-perf ${perfOn() ? 'checked' : ''} class="mt-1 w-5 h-5 shrink-0"><span class="min-w-0"><span class="block text-sm font-semibold">Sparmodus (flüssiger auf schwächeren Handys)</span><span class="block text-[11px] text-slate-400">Schaltet Unschärfe, Schatten und Animationen in der Darstellung ab. Der Klang bleibt unverändert.</span></span></label>
        <div><button type="button" data-hl-fps class="w-full py-2 text-xs font-bold rounded-xl border border-slate-700 bg-slate-900 text-slate-200">Anzeige-Test (2 Sekunden)</button><div class="hidden mt-2 text-[12px] leading-5 text-slate-300" data-hl-fpsres></div></div>
        <div class="border-t border-slate-800 pt-3"><div class="flex justify-between items-baseline"><span class="text-sm font-semibold">Fehlerprotokoll</span><span class="text-xs font-mono text-slate-300" data-hl-n></span></div>
          <div class="text-[11px] text-slate-400" data-hl-start></div>
          <div class="grid grid-cols-3 gap-2 mt-2"><button type="button" data-hl-copy class="py-2 text-xs font-bold rounded-xl border border-slate-700 bg-slate-900 text-slate-200">Kopieren</button><button type="button" data-hl-file class="py-2 text-xs font-bold rounded-xl border border-slate-700 bg-slate-900 text-slate-200">Als Datei</button><button type="button" data-hl-clear class="py-2 text-xs font-bold rounded-xl border border-slate-700 bg-slate-900 text-slate-200">Leeren</button></div>
          <div class="hidden mt-2 text-[11px] leading-4 text-slate-400 font-mono break-words" data-hl-last></div></div>
      </div>`;
    const q = s => ph.querySelector(s);
    const paint = () => {
      if (!ph.isConnected) { SunTick.stop(iv); return; }
      const m = memory(), c = { ok: 'text-emerald-300', warn: 'text-amber-300', high: 'text-rose-300' }[m.level];
      const el = q('[data-hl-mem]'); el.className = 'text-xs font-mono ' + c; el.textContent = '≈ ' + m.mb + ' MB' + (m.deviceGB ? ' · Gerät ≈ ' + m.deviceGB + ' GB' : '');
      q('[data-hl-memtxt]').innerHTML = m.tracks ? 'Audio im Speicher: ' + m.tracks + ' Puffer, ' + m.seconds + ' s' + (m.top.length ? ' · größte: ' + m.top.slice(0, 3).map(x => esc(x.name) + ' ' + mbf(x.bytes) + ' MB').join(', ') : '') + (m.level !== 'ok' ? '<br><span class="' + c + '">' + esc(TIP) + '</span>' : '') : 'Noch kein Audio geladen.';
      q('[data-hl-n]').textContent = E.length ? E.length + ' Einträge' : 'leer';
      q('[data-hl-start]').textContent = prevCrash ? 'Der vorige Start endete vermutlich unerwartet (' + dt(prevCrash.t) + ').' : 'Der vorige Start wurde sauber beendet.';
      const last = q('[data-hl-last]'); if (E.length) { last.classList.remove('hidden'); last.innerHTML = E.slice(-3).reverse().map(e => esc(dt(e.t) + (e.c > 1 ? ' ×' + e.c : '') + ' · ' + e.m)).join('<br>'); } else last.classList.add('hidden');
    };
    const iv = SunTick.every(4000, paint); paint();
    ph.addEventListener('change', e => { if (e.target.matches('[data-hl-perf]')) { setPerf(e.target.checked); say(e.target.checked ? 'Sparmodus an.' : 'Sparmodus aus.', 'info'); } });
    ph.addEventListener('click', async e => {
      const t = e.target.closest('button'); if (!t) return;
      if (t.matches('[data-hl-copy]')) say((await copyText(report())) ? 'Bericht kopiert.' : 'Kopieren nicht möglich – nutze „Als Datei“.', 'info');
      else if (t.matches('[data-hl-file]')) { try { const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, ''); const b = new Blob([report()], { type: 'text/plain' }); if (typeof saveOrShareBlob === 'function') await saveOrShareBlob(b, 'Sunshine-Fehlerbericht-' + stamp + '.txt'); } catch (err) { say('Speichern fehlgeschlagen: ' + (err && err.message || err), 'warn'); } }
      else if (t.matches('[data-hl-clear]')) { E = []; saveE(); paint(); }
      else if (t.matches('[data-hl-fps]')) { t.disabled = true; const r = q('[data-hl-fpsres]'); r.classList.remove('hidden'); r.textContent = 'Messe …'; const x = await fpsTest(2000); t.disabled = false; const v = x.fps >= 55 ? 'flüssig' : x.fps >= 40 ? 'in Ordnung' : 'ruckelig'; r.innerHTML = '<b>' + x.fps + ' Bilder/s</b> (' + v + '; längste Lücke ' + x.worst + ' ms)' + (x.fps < 45 && !perfOn() ? '<br>Tipp: Sparmodus einschalten.' : ''); }
    });
  }
  SunDOM.mount('hl-sec', ph => section(ph));
  function boot() { SunTick.every(20000, watch, { hidden: true }); setTimeout(watch, 4000); }
  window.Health = { memory, report, errors: () => E.slice(), log: logMsg, clear: () => { E = []; saveE(); }, setPerf, perfOn, fpsTest, previousCrash: () => prevCrash, watch, _tip: TIP };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
