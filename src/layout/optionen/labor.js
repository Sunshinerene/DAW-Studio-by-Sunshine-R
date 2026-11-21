/* ===== Sunshine@R · Labor (Beta) – neue Ideen zum Ausprobieren, erst nach dem Einschalten aktiv =====
   Optionen → „Labor (Beta)“. Jede Idee ist einzeln einschaltbar (Standard: aus) und hat einen Feedback-Knopf.
   Gefällt sie, wird sie fest in die App übernommen oder ausgebaut; sonst verschwindet sie wieder.
   Für Bausteine:  Labor.register({ id, title, desc, needs: '' | 'apk', status: 'beta' | 'geplant', onChange(on) })
                   Labor.isOn(id)      – ist die Idee eingeschaltet?
                   Labor.use(id, fn)   – fn(on) sofort und bei jeder Änderung
   Alles, was im Labor steckt, muss bei „aus“ genau so laufen wie ohne Labor. */
(function () {
  'use strict';
  const KEY = 'sunshine.labor';
  const st = { on: {} }; try { SunStore.merge(st, KEY); } catch (_) {}
  if (!st.on || typeof st.on !== 'object') st.on = {};
  const save = () => { try { SunStore.save(KEY, st); } catch (_) {} };
  const defs = [], subs = {};
  const esc = SunUtil.esc;
  const guard = f => { try { return f(); } catch (e) { try { console.error('[Labor]', e); } catch (_) {} } };
  const def = id => defs.find(d => d.id === id) || null;
  const isOn = id => { const d = def(id); return !!d && d.status === 'beta' && st.on[id] === true; };
  const active = () => defs.filter(d => isOn(d.id)).map(d => d.id);

  function notify(id) {
    const on = isOn(id), d = def(id);
    (subs[id] || []).forEach(f => guard(() => f(on)));
    if (d && d.onChange) guard(() => d.onChange(on));
    try { document.dispatchEvent(new CustomEvent('sunshine-labor', { detail: { id, on, active: active() } })); } catch (_) {}
  }
  function register(d) {
    if (!d || !d.id || !d.title || def(d.id)) return false;
    const x = Object.assign({ status: 'beta', needs: '', desc: '' }, d); defs.push(x);
    if (x.status === 'beta' && st.on[x.id] === true) setTimeout(() => notify(x.id), 0);   /* war beim letzten Mal an → Baustein darf starten */
    paintAll(); return true;
  }
  function use(id, fn) { (subs[id] = subs[id] || []).push(fn); if (isOn(id)) guard(() => fn(true)); }
  function set(id, on) {
    const d = def(id); if (!d || d.status !== 'beta') return false;
    on = !!on; if (isOn(id) === on) return true;
    if (on) st.on[id] = true; else delete st.on[id];
    save(); notify(id); paintAll(); return true;
  }
  function allOff() { defs.forEach(d => { if (isOn(d.id)) set(d.id, false); }); }

  /* ---------- Oberfläche (Optionen → Labor) ---------- */
  const hosts = new Set();
  function card(d) {
    const geplant = d.status !== 'beta', on = isOn(d.id);
    const badge = geplant ? '<span class="text-[10px] font-mono text-amber-300">GEPLANT</span>' : '<span class="text-[10px] font-mono text-cyan-300">BETA</span>';
    const apk = d.needs === 'apk' ? 'Braucht die neue App-Version (APK), nicht nur das Live-Update.' : '';
    const note = geplant ? ('Noch nicht verfügbar – sag uns, ob du es haben möchtest. ' + apk).trim() : apk;
    return '<div class="rounded-xl border border-slate-800 p-3 space-y-2" data-lab-card="' + esc(d.id) + '">' +
      '<label class="flex items-start gap-3 cursor-pointer"><input type="checkbox" data-lab-tg="' + esc(d.id) + '" class="mt-1 w-5 h-5 shrink-0"' + (on ? ' checked' : '') + (geplant ? ' disabled' : '') + '>' +
      '<span class="min-w-0"><span class="block text-sm font-semibold">' + esc(d.title) + ' ' + badge + '</span><span class="block text-[11px] text-slate-400">' + esc(d.desc) + '</span></span></label>' +
      (note ? '<div class="text-[11px] leading-4 text-slate-400">' + esc(note) + '</div>' : '') +
      '<button type="button" data-lab-fb="' + esc(d.id) + '" class="w-full py-2 text-xs font-bold rounded-xl border border-slate-700 bg-slate-900 text-slate-200">💬 Feedback zu dieser Idee</button></div>';
  }
  function paint(ph) {
    if (!ph.isConnected) return false;
    const n = active().length;
    ph.innerHTML = '<div class="text-[11px] font-bold uppercase tracking-wider text-slate-400 mt-4 mb-1">Labor (Beta)</div>' +
      '<div class="space-y-2"><div class="text-[11px] leading-4 text-slate-400">Neue Ideen zum Ausprobieren. Alles ist <b>aus</b>, bis du es einschaltest – dann ist die App wie gewohnt. Probiere eine Idee aus und schick uns danach <b>Feedback</b>: Gefällt sie, übernehmen wir sie fest oder bauen sie aus; sonst fliegt sie wieder raus. Ideen im Labor können Fehler haben – ausschalten genügt, dann ist alles wie vorher.</div>' +
      (defs.length ? defs.map(card).join('') : '<div class="rounded-xl border border-slate-800 p-3 text-[11px] text-slate-400">Gerade keine Ideen im Labor.</div>') +
      (n ? '<button type="button" data-lab-off class="w-full py-2 text-xs font-bold rounded-xl border border-slate-700 bg-slate-900 text-slate-200">Alle ' + n + ' Labor-Ideen ausschalten</button>' : '') + '</div>';
    return true;
  }
  function paintAll() { hosts.forEach(ph => { if (!paint(ph)) hosts.delete(ph); }); }
  function feedback(id) {
    const d = def(id); if (!d) return;
    try { if (window.Feedback) Feedback.open({ cat: d.status === 'beta' ? 'note' : 'idea', area: 'Labor', text: 'Labor · ' + d.title + (d.status === 'beta' ? (isOn(id) ? ' (eingeschaltet)' : ' (aus)') : ' (geplant)') + ':\n' }); } catch (_) {}
  }
  function section(ph) {
    hosts.add(ph); paint(ph);
    ph.addEventListener('change', e => { const t = e.target.closest && e.target.closest('[data-lab-tg]'); if (t) set(t.dataset.labTg, t.checked); });
    ph.addEventListener('click', e => {
      const f = e.target.closest && e.target.closest('[data-lab-fb]'); if (f) { feedback(f.dataset.labFb); return; }
      if (e.target.closest && e.target.closest('[data-lab-off]')) allOff();
    });
  }
  SunDOM.mount('lab-sec', ph => section(ph));

  /* Platzhalter: kommt später, braucht die neue App-Version (nativer Dienst für Hintergrund-Wiedergabe und große Dateien) */
  register({ id: 'native-player', title: 'Nativer Player (Android)', status: 'geplant', needs: 'apk', desc: 'Ein Player, der direkt in Android läuft – für zuverlässige Wiedergabe bei ausgeschaltetem Bildschirm und sehr große Dateien.' });

  window.Labor = { register, use, isOn, set, active, list: () => defs.map(d => ({ id: d.id, title: d.title, status: d.status, on: isOn(d.id) })), allOff };
})();
