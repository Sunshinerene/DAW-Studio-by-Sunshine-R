/* ===== Sunshine@R · „Was ist neu“ (Änderungsprotokoll) =====
   Die Daten stammen aus CHANGELOG.md (wird beim Bauen eingebettet). Nach einem Update erscheint auf der Startseite einmal eine Karte;
   in Optionen → Updates & Datensicherung lässt sich das Protokoll jederzeit öffnen. */
(function () {
  'use strict';
  const LOG = /*CHANGELOG*/[]/*END*/;
  const $ = id => document.getElementById(id);
  const B = window.SUNSHINE_BUILD || {};
  const V = String(B.v || (LOG[0] && LOG[0].v) || '');
  const KEY = 'sunshine.news';
  const { esc } = window.SunUtil;
  const cmp = (a, b) => { const x = String(a).split('.').map(Number), y = String(b).split('.').map(Number); for (let i = 0; i < Math.max(x.length, y.length); i++) { const d = (x[i] || 0) - (y[i] || 0); if (d) return d < 0 ? -1 : 1; } return 0; };
  let S = { seen: null }; SunStore.merge(S, KEY);
  const save = () => SunStore.save(KEY, S);
  if (S.seen === null) {   // erste Nutzung dieses Merkers: Bestandsnutzer (haben schon sunshine.*-Einstellungen) sehen die Neuerungen, frische Installationen nicht
    let had = false; try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (/^sunshine\./.test(k) && k !== KEY) { had = true; break; } } } catch (_) {}
    S.seen = had ? '0' : V; save();
  }
  const dateDe = s => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || ''); return m ? m[3] + '.' + m[2] + '.' + m[1] : ''; };
  const unseen = () => LOG.filter(e => cmp(e.v, S.seen || '0') > 0 && cmp(e.v, V || '9999') <= 0).slice(0, 3);
  function item(t) { const m = /^(Neu|Behoben|Besser|Hinweis)\s*:\s*(.*)$/.exec(t); return m ? '<li><span class="nw-tag nw-' + m[1].toLowerCase() + '">' + m[1] + '</span> ' + esc(m[2]) + '</li>' : '<li>' + esc(t) + '</li>'; }
  function entryHtml(e, cur) { return '<section class="nw-e' + (cur ? ' cur' : '') + '"><h3><span class="nw-v">Version ' + esc(e.v) + '</span>' + (cur ? '<span class="nw-now">installiert</span>' : '') + (e.date ? '<span class="nw-d">' + dateDe(e.date) + '</span>' : '') + '</h3>' + (e.title ? '<div class="nw-t">' + esc(e.title) + '</div>' : '') + '<ul>' + (e.items || []).map(item).join('') + '</ul></section>'; }
  function close() { const r = $('nw-root'); if (r) r.remove(); document.removeEventListener('keydown', onKey, true); }
  function onKey(e) { if (e.key === 'Escape') { e.stopPropagation(); close(); } }
  function markSeen() { if (V && cmp(V, S.seen || '0') > 0) { S.seen = V; save(); } }
  function open(o) {
    o = o || {}; close(); markSeen();
    const list = o.onlyNew ? unseenAll() : LOG;
    const r = document.createElement('div'); r.id = 'nw-root'; r.setAttribute('role', 'dialog'); r.setAttribute('aria-label', 'Was ist neu');
    r.innerHTML = '<div class="nw-top"><h2>Was ist neu</h2><span class="nw-sub">' + (V ? 'Version ' + esc(V) : '') + '</span><button type="button" class="nw-x" data-nw-x aria-label="Schließen">Schließen</button></div><div class="nw-body">' + (function () { try { return window.Preview ? Preview.section() : ''; } catch (_) { return ''; } })() + (list.length ? list.map(e => entryHtml(e, e.v === V)).join('') : '<p class="nw-none">Kein Änderungsprotokoll in dieser Version.</p>') + '</div>';
    r.addEventListener('click', e => { if (e.target.closest('[data-nw-x]')) close(); });
    document.body.appendChild(r); document.addEventListener('keydown', onKey, true);
    return true;
  }
  const unseenAll = () => LOG;
  function onHomeCard() {   // HTML-Schnipsel für die Startseite (leer, wenn nichts Neues)
    const u = unseen(); if (!u.length || !V) return '';
    const e = u[0];
    return '<div class="hp-new" data-nw-card><span class="tx"><b>Neu in Version ' + esc(e.v) + '</b><span class="s">' + esc(e.title || 'Das hat sich geändert') + '</span></span><button type="button" data-nw="open">Ansehen</button><button type="button" class="no" data-nw="ok">OK</button></div>';
  }
  function handle(act) { if (act === 'open') { open(); return true; } if (act === 'ok') { markSeen(); return true; } return false; }
  window.News = { list: () => LOG.slice(), current: () => LOG.find(e => e.v === V) || LOG[0] || null, version: () => V, open, close, unseen, markSeen, card: onHomeCard, handle, hasUnseen: () => unseen().length > 0, _cmp: cmp, _state: () => Object.assign({}, S), _reset: v => { S.seen = v == null ? '0' : v; save(); } };
})();
