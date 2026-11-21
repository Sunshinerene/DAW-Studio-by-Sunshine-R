/* ===== Sunshine@R · Feedback für Tester & Update-Vorschau =====
   Feedback: Kategorie + Text (+ Geräte-/Versionsangaben und Fehlerprotokoll) → E-Mail, Teilen, Datei oder Kopieren. Es gibt keinen Server:
   nichts wird automatisch gesendet, die Tester sehen vor dem Senden genau, was mitgeht.
   Vorschau („Bald in der App“): Text aus VORSCHAU.md – eingebaut beim Bauen und, wenn online, live aus dem GitHub-Repo nachgeladen. */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const B = window.SUNSHINE_BUILD || {};
  const MAIL = '/*FEEDBACK_TO*/';
  const EMBED = /*PREVIEW*/{ "title": "", "items": [], "kinds": [] }/*END*/;
  const REPO = /^[\w.-]+\/[\w.-]+$/.test(String(B.repo || '')) ? B.repo : '';
  const { esc, say } = window.SunUtil;
  const jget = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? d : v; } catch (_) { return d; } };
  const jset = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) {} };
  const hash = s => { let h = 5381; s = String(s); for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return String(h >>> 0); };

  /* ================================================================ Vorschau */
  const KP = 'sunshine.preview';
  let PS = Object.assign({ seen: '', live: null, t: 0 }, jget(KP, {}));
  const savePS = () => jset(KP, PS);
  const kindOf = h => /test/i.test(h) ? 'test' : /idee|vielleicht|sp[äa]ter|denkbar/i.test(h) ? 'idee' : 'bald';
  function parseMd(md) {
    const out = { title: '', items: [], kinds: [] }; let got = false, kind = 'bald';
    String(md || '').split(/\r?\n/).forEach(ln => {
      const t = ln.trim(); if (!t || /^<!--/.test(t) || /^-->/.test(t)) return;
      const h = /^(#{1,4})\s+(.*\S)\s*$/.exec(t); if (h) { if (/^Vorschau$/i.test(h[2])) return; if (!got && h[1].length <= 2) { out.title = h[2].replace(/^Vorschau\s*[:·-]\s*/i, ''); got = true; } else if (got) kind = kindOf(h[2]); return; }
      const li = /^[-*]\s+(.*\S)\s*$/.exec(t); if (li) { out.items.push(li[1].replace(/\*\*(.*?)\*\*/g, '$1')); out.kinds.push(kind); }
    });
    return out;
  }
  const vkey = v => (String(v || '').match(/\d+/g) || []).slice(0, 3).map(Number);
  const vnewer = (a, b) => { const x = vkey(a), y = vkey(b); for (let i = 0; i < 3; i++) { const p = x[i] || 0, q = y[i] || 0; if (p !== q) return p > q; } return false; };
  const appV = () => { try { return (window.SUNSHINE_BUILD && SUNSHINE_BUILD.v) || ''; } catch (_) { return ''; } };
  /* Die Datei im Repo wird nur genutzt, wenn sie eine NEUERE Version nennt als die installierte App – sonst steht dort alter Text, den niemand mehr pflegt. */
  function liveUsable(d) {
    if (!d || !Array.isArray(d.items) || !d.items.length) return !!(d && Array.isArray(d.items));   // leere Datei im Repo = bewusst keine Vorschau
    const m = /\d+(?:\.\d+)+/.exec(d.title || ''); if (!m || !appV()) return true; return vnewer(m[0], appV());
  }
  const preview = () => { const d = liveUsable(PS.live) ? PS.live : EMBED; const it = (d.items || []).map(String); return { title: String(d.title || ''), items: it.slice(0, 14), kinds: it.map((_, i) => (d.kinds && d.kinds[i]) || 'bald').slice(0, 14) }; };
  const pvHash = () => { const p = preview(); return p.items.length ? hash(p.title + '|' + p.items.join('|')) : ''; };
  async function fetchLive(force) {
    if (!REPO || navigator.onLine === false) return { ok: false, why: 'offline/kein Repo' };
    if (!force && PS.t && Date.now() - PS.t < 6 * 3600e3) return { ok: true, cached: true };
    for (const br of ['main', 'master']) {
      try {
        const c = new AbortController(), to = setTimeout(() => c.abort(), 7000);
        const r = await fetch('https://raw.githubusercontent.com/' + REPO + '/' + br + '/VORSCHAU.md', { cache: 'no-store', signal: c.signal }); clearTimeout(to);
        if (r.ok) { PS.live = parseMd(await r.text()); PS.t = Date.now(); savePS(); return { ok: true, branch: br }; }
      } catch (_) {}
    }
    return { ok: false, why: 'nicht erreichbar' };
  }
  function pvCard() {
    const p = preview(); if (!p.items.length) return ''; const h = pvHash(); if (PS.seen === h) return '';
    return '<div class="hp-new" data-pv-card><span class="tx"><b>👀 Bald in der App' + (p.title ? ' · ' + esc(p.title) : '') + '</b>' + p.items.slice(0, 3).map((t, i) => '<span class="s">• ' + (p.kinds[i] === 'test' ? '<em>Test:</em> ' : p.kinds[i] === 'idee' ? '<em>Idee:</em> ' : '') + esc(t) + '</span>').join('') + (p.items.length > 3 ? '<span class="s">… und mehr</span>' : '') + '</span><button type="button" data-pv="more">Mehr</button><button type="button" class="no" data-pv="no">Ausblenden</button></div>';
  }
  function pvSection() {
    const p = preview(); if (!p.items.length) return '';
    return '<section class="nw-e pv"><h3><span class="nw-v">👀 Bald in der App</span></h3>' + (p.title ? '<p class="nw-pt">' + esc(p.title) + '</p>' : '') + '<ul>' + p.items.map((t, i) => { const k = p.kinds[i] || 'bald'; return '<li><span class="nw-tag nw-' + (k === 'bald' ? 'neu' : k === 'test' ? 'bes' : 'hin') + '">' + (k === 'bald' ? 'Kommt' : k === 'test' ? 'Zum Testen' : 'Idee') + '</span> ' + esc(t) + '</li>'; }).join('') + '</ul></section>';
  }
  function pvAct(a) {
    if (a === 'no') { PS.seen = pvHash(); savePS(); }
    else if (a === 'more') { try { News.open(); } catch (_) {} }
  }

  /* ================================================================ Feedback */
  const KF = 'sunshine.feedback';
  let FS = Object.assign({ cat: 'bug', text: '', area: 'auto', contact: '', dev: true, log: true }, jget(KF, {}));
  const saveFS = () => jset(KF, FS);
  const CATS = [['bug', '🐞', 'Fehler'], ['idea', '💡', 'Idee'], ['note', '💬', 'Anmerkung'], ['love', '❤️', 'Lob'], ['ask', '❓', 'Frage']];
  const AREAS = [['auto', 'automatisch erkennen'], ['Startseite', 'Startseite'], ['Player', 'Player & Klang'], ['Spuren', 'Spuren / Arrangement'], ['MIDI-Editor', 'MIDI-Editor & Piano Roll'], ['Drums', 'Drums & FX'], ['Vocal', 'Vocal & Mikrofon'], ['Mixer', 'Mixer & Master'], ['Export', 'Export / Speichern'], ['Update', 'Update & Sicherung'], ['Design', 'Design & Bedienung'], ['Labor', 'Labor (Beta-Ideen)'], ['Sonstiges', 'Sonstiges']];
  function areaAuto() {
    try { const w = window.BigWin && BigWin.current(); if (w) return { midi: 'MIDI-Editor', drums: 'Drums', vocals: 'Vocal', mixer: 'Mixer' }[w] || w; } catch (_) {}
    try { if (window.Player && Player.isOpen && Player.isOpen()) return 'Player'; } catch (_) {}
    try { if (window.Home && Home.isOpen && Home.isOpen()) return 'Startseite'; } catch (_) {}
    return 'Spuren';
  }
  function deviceLines() {
    const m = (() => { try { return Health.memory(); } catch (_) { return null; } })();
    const L = [];
    L.push('Version ' + (B.v || '?') + ' · Build ' + (/^\d+$/.test(String(B.n)) ? B.n : 'Entwicklung') + ' · ' + new Date().toLocaleString('de-DE'));
    L.push('Gerät: ' + navigator.userAgent);
    L.push('Bildschirm: ' + innerWidth + '×' + innerHeight + ' @' + (devicePixelRatio || 1) + (m && m.deviceGB ? ' · Gerätespeicher ≈ ' + m.deviceGB + ' GB' : ''));
    try { L.push('Projekt: ' + (dawState.tracks || []).length + ' Spuren, Audio im Speicher ≈ ' + (m ? m.mb : '?') + ' MB'); } catch (_) {}
    return L;
  }
  function compose(o) {
    o = o || FS; const cat = CATS.find(c => c[0] === o.cat) || CATS[0]; const area = o.area === 'auto' ? areaAuto() : o.area;
    const L = ['Sunshine@R DAW Studio – Feedback', 'Art: ' + cat[1] + ' ' + cat[2], 'Bereich: ' + area, 'Version: ' + (B.v || '?'), '', String(o.text || '').trim() || '(kein Text)'];
    try { const a = window.Labor ? Labor.active() : []; if (a.length) L.push('', 'Labor eingeschaltet: ' + a.join(', ')); } catch (_) {}
    if (o.contact && o.contact.trim()) { L.push('', 'Rückmeldung an: ' + o.contact.trim()); }
    if (area === 'Player') { L.push('', '--- Player ---'); try { Player.report().forEach(x => L.push(x)); } catch (_) { L.push('– keine Angaben –'); } }
    if (o.dev) { L.push('', '--- Geräte- und Versionsangaben ---'); deviceLines().forEach(x => L.push(x)); }
    if (o.log) {
      let errs = []; try { errs = Health.errors(); } catch (_) {}
      L.push('', '--- Fehlerprotokoll (' + errs.length + ') ---');
      if (!errs.length) L.push('– keine –'); else errs.slice(-12).reverse().forEach(e => { let d = ''; try { const x = new Date(e.t), p = n => String(n).padStart(2, '0'); d = p(x.getDate()) + '.' + p(x.getMonth() + 1) + '. ' + p(x.getHours()) + ':' + p(x.getMinutes()); } catch (_) {} L.push(d + (e.c > 1 ? ' ×' + e.c : '') + ' · ' + e.m + (e.s ? ' (' + e.s + ')' : '')); });
    }
    return L.join('\n');
  }
  const subject = () => 'Feedback Sunshine@R DAW Studio';
  function mailtoUrl() {
    let body = compose(); const head = 'mailto:' + encodeURIComponent(MAIL).replace(/%40/g, '@') + '?subject=' + encodeURIComponent(subject()) + '&body=';
    const room = 1700 - head.length; let cut = false;
    while (encodeURIComponent(body).length > room && body.length > 200) { body = body.slice(0, Math.floor(body.length * 0.85)); cut = true; }
    if (cut) body += '\n[… gekürzt – der vollständige Bericht kommt über „Teilen“ oder „Als Datei“]';
    return { url: head + encodeURIComponent(body), cut };
  }
  async function copyText(t) {
    try { await navigator.clipboard.writeText(t); return true; } catch (_) {}
    try { const a = document.createElement('textarea'); a.value = t; a.style.cssText = 'position:fixed;left:-999px;top:0'; document.body.appendChild(a); a.select(); const ok = document.execCommand('copy'); a.remove(); return ok; } catch (_) { return false; }
  }
  async function shareText() {
    const text = compose(), title = subject(), cap = window.Capacitor;
    try { if (cap && cap.Plugins && cap.Plugins.Share && typeof cap.Plugins.Share.share === 'function') { await cap.Plugins.Share.share({ title, text, dialogTitle: 'Feedback senden' }); return true; } } catch (e) { if (/cancel/i.test(String(e && e.message))) return false; }
    try { if (navigator.share) { await navigator.share({ title, text }); return true; } } catch (e) { if (e && e.name === 'AbortError') return false; }
    return (await copyText(text)) ? 'copied' : false;
  }
  async function shareFile() {
    const blob = new Blob([compose()], { type: 'text/plain' }); const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '');
    if (typeof saveOrShareBlob === 'function') { await saveOrShareBlob(blob, 'sunshine-feedback-' + stamp + '.txt'); return true; }
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'sunshine-feedback-' + stamp + '.txt'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); return true;
  }

  function close() { const r = $('fb-root'); if (r) r.remove(); document.removeEventListener('keydown', onKey, true); }
  function onKey(e) { if (e.key === 'Escape') { e.stopPropagation(); close(); } }
  function open(pre) {
    close(); if (pre && typeof pre === 'object') { if (pre.cat) FS.cat = pre.cat; if (pre.text != null) FS.text = pre.text; }
    FS.area = (pre && pre.area) || 'auto';   /* jede neue Meldung erkennt den Bereich neu (aus dem Player: Player) */
    const r = document.createElement('div'); r.id = 'fb-root'; r.setAttribute('role', 'dialog'); r.setAttribute('aria-modal', 'true'); r.setAttribute('aria-label', 'Feedback');
    const hasMail = !!MAIL;
    r.innerHTML = `<div class="fb-top"><h2>💬 Feedback</h2><button type="button" class="fb-x" data-fb="close">Schließen</button></div>
      <div class="fb-body"><p class="fb-lead">Was ist dir aufgefallen? Fehler, Ideen, Wünsche – alles hilft. Es wird <b>nichts automatisch gesendet</b>: Du siehst unten genau, was mitgeht, und schickst es selbst ab.</p>
      <div class="fb-cats" role="radiogroup" aria-label="Art">${CATS.map(c => `<button type="button" role="radio" data-cat="${c[0]}" aria-checked="${FS.cat === c[0]}"><span>${c[1]}</span>${c[2]}</button>`).join('')}</div>
      <label class="fb-l" for="fb-text">Beschreibung</label>
      <textarea id="fb-text" rows="6" placeholder="Bei Fehlern: Was hast du gemacht, was ist passiert, was hast du erwartet?">${esc(FS.text)}</textarea>
      <label class="fb-l" for="fb-area">Betrifft</label>
      <select id="fb-area">${AREAS.map(a => `<option value="${esc(a[0])}" ${FS.area === a[0] ? 'selected' : ''}>${esc(a[0] === 'auto' ? 'Automatisch erkennen (' + areaAuto() + ')' : a[1])}</option>`).join('')}</select>
      <label class="fb-l" for="fb-contact">Rückmeldung an (freiwillig)</label>
      <input id="fb-contact" type="text" inputmode="email" autocomplete="off" placeholder="Name oder E-Mail, falls wir nachfragen dürfen" value="${esc(FS.contact)}">
      <label class="fb-ck"><input type="checkbox" id="fb-dev" ${FS.dev ? 'checked' : ''}><span>Geräte- und Versionsangaben mitschicken <small>(Version, Handy-Modell/Browser, Bildschirm, Speicher)</small></span></label>
      <label class="fb-ck"><input type="checkbox" id="fb-log" ${FS.log ? 'checked' : ''}><span>Fehlerprotokoll mitschicken <small>(nur technische Fehlermeldungen, keine Audiodaten, keine Projektinhalte)</small></span></label>
      <details class="fb-pv"><summary>Das wird gesendet – ansehen</summary><pre id="fb-pre"></pre></details>
      <div class="fb-send"><button type="button" class="fb-main" data-fb="mail" ${hasMail ? '' : 'data-nomail="1"'}>✉ Per E-Mail</button><button type="button" data-fb="share">↗ Teilen</button><button type="button" data-fb="file">📄 Als Datei</button><button type="button" data-fb="copy">⎘ Kopieren</button></div>
      <p class="fb-note" id="fb-note">${hasMail ? 'E-Mail: Deine Mail-App öffnet sich mit fertigem Text. Lange Berichte werden dort gekürzt – „Teilen“ oder „Als Datei“ schickt alles.' : 'In dieser Version ist noch keine Empfänger-Adresse hinterlegt: nutze „Teilen“ (z. B. WhatsApp/E-Mail), „Als Datei“ oder „Kopieren“.'}</p>
      <button type="button" class="fb-clear" data-fb="clear">Eingabe leeren</button></div>`;
    document.body.appendChild(r); document.addEventListener('keydown', onKey, true);
    const q = s => r.querySelector(s), upd = () => { FS.text = q('#fb-text').value; FS.area = q('#fb-area').value; FS.contact = q('#fb-contact').value; FS.dev = q('#fb-dev').checked; FS.log = q('#fb-log').checked; saveFS(); q('#fb-pre').textContent = compose(); };
    r.addEventListener('input', upd); r.addEventListener('change', upd); upd();
    r.addEventListener('click', async e => {
      const c = e.target.closest('[data-cat]'); if (c) { FS.cat = c.dataset.cat; r.querySelectorAll('[data-cat]').forEach(b => b.setAttribute('aria-checked', String(b === c))); if (FS.cat === 'bug') { q('#fb-log').checked = true; } upd(); return; }
      const b = e.target.closest('[data-fb]'); if (!b) return; const a = b.dataset.fb; upd();
      if (a === 'close') { close(); return; }
      if (a === 'clear') { FS.text = ''; q('#fb-text').value = ''; upd(); return; }
      if (String(FS.text).trim().length < 5 && a !== 'copy') { say('Bitte erst kurz beschreiben, worum es geht.', 'warn'); q('#fb-text').focus(); return; }
      if (a === 'mail') {
        if (!MAIL) { say('Keine Empfänger-Adresse hinterlegt – bitte „Teilen“ oder „Als Datei“ nutzen.', 'warn'); return; }
        const m = mailtoUrl(); const x = document.createElement('a'); x.href = m.url; document.body.appendChild(x); x.click(); x.remove();
        q('#fb-note').textContent = m.cut ? 'Mail-App geöffnet (Text gekürzt). Den vollständigen Bericht bitte zusätzlich über „Als Datei“ senden.' : 'Mail-App geöffnet. Danke dir! Tippe dort auf Senden.';
      } else if (a === 'share') { const r2 = await shareText(); say(r2 === 'copied' ? 'Teilen nicht möglich – Text wurde kopiert.' : r2 ? 'Danke für dein Feedback!' : 'Abgebrochen.', r2 ? 'success' : 'info'); }
      else if (a === 'file') { try { await shareFile(); say('Bericht erstellt.', 'success'); } catch (err) { say('Datei konnte nicht erstellt werden: ' + (err && err.message), 'error'); } }
      else if (a === 'copy') say((await copyText(compose())) ? 'Kopiert – jetzt in eine Nachricht einfügen.' : 'Kopieren nicht möglich.', 'info');
    });
    setTimeout(() => { try { q('#fb-text').focus(); } catch (_) {} }, 60);
    return true;
  }

  /* ================================================================ Einbau: Menü, Optionen */
  function menuItem() {
    const menu = $('file-menu'); if (!menu || $('btn-feedback')) return;
    const b = document.createElement('button'); b.id = 'btn-feedback'; b.type = 'button'; b.className = 'fm-item'; b.setAttribute('role', 'menuitem'); b.innerHTML = '<span>💬</span><span>Feedback senden</span>';
    b.addEventListener('click', () => { try { menu.hidden = true; } catch (_) {} open(); });
    const a = $('btn-chat') || $('btn-assistant'); if (a && a.parentNode === menu) a.after(b); else menu.appendChild(b);
  }
  function section(ph) {
    const p = preview();
    ph.innerHTML = `<div class="text-[11px] font-bold uppercase tracking-wider text-slate-400 mt-4 mb-1">Feedback &amp; Vorschau</div>
      <div class="rounded-xl border border-slate-800 p-3 space-y-2">
        <div class="text-[11px] leading-4 text-slate-400">Fehler gefunden, Idee oder Wunsch? Schick es direkt aus der App – mit Version und (wenn du willst) Fehlerprotokoll.</div>
        <div class="grid grid-cols-2 gap-2"><button type="button" data-fb-open class="py-2 text-xs font-bold rounded-xl border border-slate-700 bg-slate-900 text-slate-200">💬 Feedback senden</button><button type="button" data-fb-prev class="py-2 text-xs font-bold rounded-xl border border-slate-700 bg-slate-900 text-slate-200">👀 Was kommt als Nächstes?</button></div>
        <div class="text-[11px] text-slate-500" data-fb-pvs>${p.items.length ? esc(p.items.length + ' Punkt(e) in der Vorschau' + (p.title ? ': ' + p.title : '')) : 'Aktuell keine Vorschau veröffentlicht.'}</div>
      </div>`;
    ph.addEventListener('click', async e => {
      if (e.target.closest('[data-fb-open]')) open();
      else if (e.target.closest('[data-fb-prev]')) { const t = e.target.closest('[data-fb-prev]'); t.disabled = true; await fetchLive(true); t.disabled = false; try { News.open(); } catch (_) {} }
    });
  }
  SunDOM.mount('fb-sec', ph => section(ph)); SunDOM.on('#file-menu', () => menuItem());
  function boot() {
    menuItem(); let tries = 0; const iv = SunTick.every(500, () => { menuItem(); if ($('btn-feedback') || ++tries > 20) SunTick.stop(iv); }, { hidden: true });
    setTimeout(() => { fetchLive(false).then(r => { try { const h = $('hm-update'); if (r.ok && !r.cached && h && window.Home && Home.isOpen && Home.isOpen() && window.Update) Update.onHome(h); } catch (_) {} }); }, 5000);
    document.addEventListener('click', e => { const x = e.target.closest && e.target.closest('#hm-fb'); if (x) open(); });
  }
  window.Feedback = { open, close, compose, subject, mailtoUrl, state: () => Object.assign({}, FS), mail: () => MAIL, _cats: CATS };
  window.Preview = { card: pvCard, section: pvSection, act: pvAct, data: preview, fetch: fetchLive, parse: parseMd, hash: pvHash, _state: () => Object.assign({}, PS) };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
