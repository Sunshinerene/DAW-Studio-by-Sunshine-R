
/* ===== Sunshine@R · Design-Auswahl & Optionen ===== */
(function () {
  'use strict';
  const THEMES = [
    { id: 'aurora', name: 'Aurora Glass', desc: 'Milchglas, Sonnen-Farbverläufe, orange Akzente', meta: '#0B0E27',
      pv: { bg: 'radial-gradient(90px 60px at 100% 0,rgba(255,138,26,.55),transparent),radial-gradient(90px 70px at 0 60%,rgba(124,61,255,.5),transparent),#0B0E27', bar: 'background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.2)', play: 'background:linear-gradient(145deg,#FFD23F,#FF8A1A)', card: 'background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.16)', r: 9 } },
    { id: 'studio', name: 'Studio Matt', desc: 'Ruhig wie Hardware, Amber-LCD, kaum Glas', meta: '#14161A',
      pv: { bg: '#14161A', bar: 'background:#08090B;border:1px solid #2D323B', play: 'background:#FFB21E', card: 'background:#1E2127;border:1px solid #2D323B', r: 6 } },
    { id: 'neon', name: 'Neon Spektrum', desc: 'Schwarz mit Equalizer-Farben und Leuchten', meta: '#05060B',
      pv: { bg: 'radial-gradient(90px 60px at 0 0,rgba(25,195,255,.4),transparent),radial-gradient(90px 70px at 100% 60%,rgba(255,47,160,.35),transparent),#05060B', bar: 'background:rgba(255,255,255,.06);border:1px solid rgba(138,61,255,.6)', play: 'background:linear-gradient(120deg,#19C3FF,#8A3DFF,#FF2FA0)', card: 'background:rgba(255,255,255,.05);border:1px solid rgba(138,61,255,.5)', r: 9 } },
    { id: 'liquid', name: 'Liquid Matt', desc: 'Mattes Milchglas, weich, Pastell-Akzente', meta: '#1B1D2B',
      pv: { bg: 'radial-gradient(90px 60px at 100% 0,rgba(255,196,160,.45),transparent),radial-gradient(90px 70px at 0 60%,rgba(176,160,255,.45),transparent),#1B1D2B', bar: 'background:rgba(255,255,255,.10);border:1px solid rgba(255,255,255,.08)', play: 'background:linear-gradient(145deg,#FFD9C2,#FFB38A)', card: 'background:rgba(255,255,255,.09);border:1px solid rgba(255,255,255,.07)', r: 12 } },
    { id: 'classic', name: 'Klassisch', desc: 'Das bisherige Design', meta: '#090c12',
      pv: { bg: '#090c12', bar: 'background:#111622;border:1px solid #28334a', play: 'background:#10b981', card: 'background:#171e2e;border:1px solid #28334a', r: 6 } }
  ];
  const LS_THEME = 'sunshine.theme', LS_UI = 'sunshine.ui';
  const html = document.documentElement;
  const getTheme = () => { const t = html.getAttribute('data-theme'); return THEMES.some(x => x.id === t) ? t : 'aurora'; };
  const UI_DEFAULTS = { glass: true, glow: true, large: false, accent: null, glassK: 40, blur: null, radius: 'normal', voice: false, icons: true };
  const readUi = () => { try { return Object.assign({}, UI_DEFAULTS, JSON.parse(localStorage.getItem(LS_UI) || '{}')); } catch (_) { return Object.assign({}, UI_DEFAULTS); } };
  function applyUi(p) {
    if (typeof window.__sunUi === 'function') { window.__sunUi(p); return; }
    html.setAttribute('data-glass', p.glass ? 'on' : 'off');
    html.setAttribute('data-glow', p.glow ? 'on' : 'off');
    html.setAttribute('data-large', p.large ? '1' : '0');
  }
  const ACCENTS = [['#FF8A1A', 'Sonne'], ['#38C8FF', 'Cyan'], ['#A78BFF', 'Violett'], ['#34D399', 'Grün'], ['#FF6B8A', 'Rosa'], ['#FACC15', 'Gold'], ['#F8FAFC', 'Weiß']];
  const BLUR_DEFAULT = { aurora: 22, neon: 22, liquid: 30, studio: 0, classic: 0 };
  function applyTheme(id, persist) {
    const t = THEMES.find(x => x.id === id) || THEMES[0];
    html.setAttribute('data-theme', t.id);
    const m = document.querySelector('meta[name="theme-color"]'); if (m) m.setAttribute('content', t.meta);
    if (persist !== false) { try { localStorage.setItem(LS_THEME, t.id); } catch (_) {} }
  }
  function saveUi(p) { try { localStorage.setItem(LS_UI, JSON.stringify(p)); } catch (_) {} applyUi(p); try { document.dispatchEvent(new CustomEvent('sunshine-ui', { detail: p })); } catch (_) {} }

  function previewHtml(t) {
    const p = t.pv;
    return `<div style="background:${p.bg};border-radius:12px;padding:7px;height:62px;display:flex;flex-direction:column;gap:6px;overflow:hidden">
      <div style="${p.bar};height:22px;border-radius:${p.r + 2}px;display:flex;align-items:center;gap:5px;padding:0 5px"><i style="width:15px;height:15px;border-radius:50%;${p.play}"></i><i style="width:22px;height:8px;border-radius:4px;background:rgba(255,255,255,.3)"></i><i style="width:30px;height:8px;border-radius:4px;background:rgba(255,255,255,.18)"></i></div>
      <div style="display:flex;gap:5px"><i style="flex:1;height:22px;border-radius:${p.r}px;${p.card}"></i><i style="flex:1;height:22px;border-radius:${p.r}px;${p.card}"></i><i style="flex:1;height:22px;border-radius:${p.r}px;${p.card}"></i></div></div>`;
  }

  function openSettings() {
    document.getElementById('settings-modal')?.remove();
    const ui = readUi(), cur = getTheme();
    const spessaOk = typeof SpessaEngine === 'object' && SpessaEngine.hasBundle && SpessaEngine.hasBundle();
    const ov = document.createElement('div');
    ov.id = 'settings-modal';
    ov.className = 'fixed inset-0 z-[var(--z-dialog-3)] bg-black/80 flex items-end sm:items-center justify-center p-2 sm:p-5';
    const toggle = (key, label, hint, on) => `<label class="flex items-start gap-3 py-2 cursor-pointer"><input type="checkbox" data-ui="${key}" ${on ? 'checked' : ''} class="mt-1 w-5 h-5 shrink-0"><span class="min-w-0"><span class="block text-sm font-semibold">${label}</span><span class="block text-[11px] text-slate-400">${hint}</span></span></label>`;
    ov.innerHTML = `<div class="w-full max-w-xl max-h-[92vh] overflow-y-auto rounded-2xl border border-purple-500/40 bg-slate-950 p-4 shadow-2xl text-slate-100" role="dialog" aria-label="Optionen">
      <div class="flex items-center gap-3 mb-1"><div class="text-base font-black">⚙️ Optionen</div><button type="button" data-close class="ml-auto px-3 py-2 rounded-lg bg-slate-800 text-slate-300" aria-label="Schließen">✕</button></div>
      <div id="hp-sec"></div>
      <div class="text-[11px] font-bold uppercase tracking-wider text-slate-400 mt-3 mb-2">Design</div>
      <div id="theme-grid" class="grid grid-cols-2 gap-2.5">
        ${THEMES.map(t => `<button type="button" data-theme-id="${t.id}" aria-pressed="${t.id === cur}" class="theme-card text-left rounded-2xl p-2 border ${t.id === cur ? 'border-amber-400 ring-2 ring-amber-400/60 bg-slate-800' : 'border-slate-700 bg-slate-900'}">${previewHtml(t)}<div class="px-1 pt-2 pb-0.5"><div class="text-sm font-bold flex items-center gap-1.5">${t.name}${t.id === cur ? '<span class="text-[10px] font-mono text-amber-300">✓ aktiv</span>' : ''}</div><div class="text-[11px] text-slate-400 leading-snug">${t.desc}</div></div></button>`).join('')}
      </div>
      <div class="text-[11px] font-bold uppercase tracking-wider text-slate-400 mt-4 mb-1">Darstellung</div>
      <div class="divide-y divide-slate-800">
        ${toggle('glass', 'Glas-Effekte (Unschärfe)', 'Weiche Milchglas-Flächen. Bei Ruckeln auf älteren Geräten ausschalten.', ui.glass)}
        ${toggle('glow', 'Leuchteffekte', 'Glühende Zahlen, Buttons und Schatten.', ui.glow)}
        ${toggle('large', 'Große Bedienelemente', 'Alle Buttons mindestens 44 px hoch – leichter zu treffen.', ui.large)}
        ${toggle('icons', 'Einheitliche Linien-Icons', 'Ein durchgehender Icon-Satz in der Textfarbe des Designs statt bunter Emoji. Ausschalten = Emoji.', ui.icons)}
        <div class="py-2"><label class="block text-sm font-semibold mb-1" for="opt-dockmode">Bereiche (Editor, Drums, Vocal, Mixer)</label><select id="opt-dockmode" data-dockmode class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100"><option value="big" ${window.DockWin && DockWin.mode === 'big' ? 'selected' : ''}>Großes Fenster bei Bedarf (aufgeräumt)</option><option value="windows" ${window.DockWin && DockWin.mode === 'windows' ? 'selected' : ''}>Untereinander, einklappbar</option><option value="tabs" ${window.DockWin && DockWin.mode === 'tabs' ? 'selected' : ''}>Reiter unter den Spuren</option></select><span class="block text-[11px] text-slate-400 mt-1">Standard: Oben Spuren und Transport; Editor, Drums, Vocal und Mixer öffnen auf Tipp als eigenes großes Fenster.</span></div>
      </div>
      <div id="st-sec"></div>
      <div id="fx-sec"></div>
      <div id="dfx-sec"></div>
      <div id="ly-sec"></div>
      <div id="up-sec"></div>
      <div id="hl-sec"></div>
      <div id="sv-sec"></div>
      <div id="fb-sec"></div>
      <div id="pl-sec"></div>
      <div id="in-sec"></div>
      <div id="cv-sec"></div>
      <div id="td-sec"></div>
      <div class="text-[11px] font-bold uppercase tracking-wider text-slate-400 mt-4 mb-1">Anpassen</div>
      <div class="rounded-xl border border-slate-800 p-3 space-y-3.5">
        <div>
          <div class="flex items-center justify-between mb-1.5"><span class="text-sm font-semibold">Akzentfarbe</span><span class="text-[11px] text-slate-400">Play, Export, aktiver Tab, Regler</span></div>
          <div id="acc-row" class="flex flex-wrap items-center gap-2">
            <button type="button" data-accent-auto aria-pressed="${!ui.accent}" class="sw-dot text-[10px] font-bold text-slate-200 bg-slate-800" title="Standard des Designs" aria-label="Akzent: Standard des Designs">Auto</button>
            ${ACCENTS.map(a => `<button type="button" data-accent="${a[0]}" aria-pressed="${(ui.accent || '').toLowerCase() === a[0].toLowerCase()}" class="sw-dot" style="background:${a[0]}" title="${a[1]}" aria-label="Akzent: ${a[1]}"></button>`).join('')}
            <label class="sw-dot relative overflow-hidden cursor-pointer" title="Eigene Farbe" style="background:conic-gradient(#f43f5e,#f59e0b,#84cc16,#06b6d4,#8b5cf6,#f43f5e)"><input type="color" data-accent-custom value="${ui.accent || '#ff8a1a'}" class="absolute inset-0 opacity-0 w-full h-full cursor-pointer" aria-label="Eigene Akzentfarbe"></label>
          </div>
        </div>
        <label class="block"><div class="flex items-center justify-between"><span class="text-sm font-semibold">Transparenz der Flächen</span><span id="v-glassK" class="text-[11px] font-mono text-slate-400">${ui.glassK === 40 ? 'Standard' : Math.round(ui.glassK * 2.5) + ' %'}</span></div>
          <input type="range" data-range="glassK" min="8" max="100" step="1" value="${ui.glassK}" class="w-full daw-slider mt-1"><div class="flex justify-between text-[10px] text-slate-500"><span>klar</span><span>Standard</span><span>deckend</span></div>
          <div class="text-[10px] text-slate-500 mt-0.5">Wirkt bei den Glas-Designs (Aurora, Neon, Liquid).</div></label>
        <label class="block"><div class="flex items-center justify-between"><span class="text-sm font-semibold">Unschärfe (Glas)</span><span id="v-blur" class="text-[11px] font-mono text-slate-400">${ui.blur == null ? 'Standard' : ui.blur + ' px'}</span></div>
          <input type="range" data-range="blur" min="0" max="40" step="1" value="${ui.blur == null ? (BLUR_DEFAULT[cur] || 22) : ui.blur}" class="w-full daw-slider mt-1"></label>
        <div><div class="text-sm font-semibold mb-1.5">Rundung</div>
          <div class="grid grid-cols-3 gap-2" id="rad-row">${[['sharp', 'Eckig'], ['normal', 'Normal'], ['round', 'Extra rund']].map(r => `<button type="button" data-radius="${r[0]}" aria-pressed="${ui.radius === r[0]}" class="py-2.5 text-xs font-bold rounded-xl border ${ui.radius === r[0] ? 'border-amber-400 bg-slate-800 text-amber-200' : 'border-slate-700 bg-slate-900 text-slate-300'}">${r[1]}</button>`).join('')}</div></div>
        <button type="button" data-reset-custom class="w-full py-2.5 rounded-xl border border-slate-700 bg-slate-900 text-xs font-bold text-slate-300">Anpassungen zurücksetzen</button>
      </div>
      <div class="text-[11px] font-bold uppercase tracking-wider text-slate-400 mt-4 mb-1">KI · Audio → MIDI</div>
      <div class="rounded-xl border border-slate-800 p-3 space-y-2.5">
        <div class="flex items-start gap-2.5"><span id="bp-dot" class="mt-1.5 w-2.5 h-2.5 rounded-full shrink-0 bg-slate-500"></span><div class="min-w-0"><div class="text-sm font-semibold">Basic Pitch (Spotify) · polyphone Noten-KI</div><div id="bp-status" class="text-[11px] text-slate-400"></div></div></div>
        <div class="grid grid-cols-2 gap-2">
          <button type="button" data-bp-load class="py-2.5 rounded-xl border border-slate-700 bg-slate-900 text-xs font-bold text-slate-200">Jetzt laden (Internet)</button>
          <button type="button" data-bp-pick class="py-2.5 rounded-xl border border-slate-700 bg-slate-900 text-xs font-bold text-slate-200">Dateien wählen …</button>
        </div>
        <button type="button" data-bp-remove class="w-full py-2 rounded-xl border border-slate-800 text-[11px] font-semibold text-slate-400">Aus dem Gerätespeicher entfernen</button>
        <input type="file" id="bp-files" multiple accept=".json,.bin,application/json,application/octet-stream" hidden>
        <div class="text-[10px] leading-snug text-slate-500">Im Audio-to-MIDI-Menü „🧠 KI – Basic Pitch“ wählen. Das kleine Modell (~1 MB) wird beim ersten Einsatz automatisch geladen und danach offline genutzt. Ohne Internet: <span class="font-mono">model.json</span> + <span class="font-mono">group1-shard1of1.bin</span> (Ordner <span class="font-mono">model/</span> im Paket „@spotify/basic-pitch“) hier mit „Dateien wählen“ auswählen. Lizenz Apache-2.0.</div>
      </div>
      <div class="text-[11px] font-bold uppercase tracking-wider text-slate-400 mt-4 mb-1">Klang</div>
      <label class="flex items-start gap-3 py-2 cursor-pointer ${spessaOk ? '' : 'opacity-50'}"><input type="checkbox" data-spessa ${spessaOk && SpessaEngine.enabled ? 'checked' : ''} ${spessaOk ? '' : 'disabled'} class="mt-1 w-5 h-5 shrink-0"><span class="min-w-0"><span class="block text-sm font-semibold">SpessaSynth-Engine für SoundFonts</span><span class="block text-[11px] text-slate-400">Volle SoundFont-Unterstützung (Zonen, Filter, Drums). Aus = einfacher Ersatz-Player.</span></span></label>
      <div class="text-[11px] font-bold uppercase tracking-wider text-slate-400 mt-4 mb-1">Sicherheit</div>
      <div class="rounded-xl border border-slate-800 px-3 py-1"><label class="flex items-start gap-3 py-2 cursor-pointer"><input type="checkbox" data-autosave ${window.Autosave && Autosave.enabled() ? 'checked' : ''} class="mt-1 w-5 h-5 shrink-0"><span class="min-w-0"><span class="block text-sm font-semibold">♻️ Autosave &amp; Wiederherstellung</span><span class="block text-[11px] text-slate-400">Sichert dein Projekt automatisch im Browser. Nach einem Absturz oder Neustart fragt die App, ob sie weitermachen soll.</span><span id="as-status" class="block text-[11px] text-amber-300 mt-1">${window.Autosave ? Autosave.statusText() : ''}</span></span></label><button type="button" data-as-clear class="mb-2 w-full py-2.5 rounded-lg border border-slate-700 bg-slate-900 text-xs font-bold text-slate-200">Zwischenstand löschen</button></div>
      <div class="text-[11px] font-bold uppercase tracking-wider text-slate-400 mt-4 mb-1">Experimentell</div>
      <div class="rounded-xl border border-slate-800 px-3 py-1">${toggle('voice', '🎤 Sprachsteuerung (Test)', 'Blendet einen Mikrofon-Knopf ein: Befehle wie „Play“, „Tempo 120“, „Spur 2 stumm“ sprechen oder tippen. Löschen und Zurücksetzen sind gesperrt. Ob Sprechen geht, hängt vom Gerät ab – Tippen geht immer.', ui.voice)}</div>
      <button type="button" data-ai-settings class="mt-2 w-full py-3 rounded-xl border border-slate-700 bg-slate-900 text-sm font-bold text-slate-100">💬 Assistent einrichten (lokales Modell · Online) …</button>
      <div class="flex items-center gap-3 mt-4 pt-3 border-t border-slate-800"><img src="assets/sunshine-r-app-icon.png" alt="" class="w-10 h-10 rounded-xl" onerror="this.remove()"><div class="min-w-0"><div class="text-sm font-bold">Sunshine@R DAW Studio <span class="text-[10px] font-mono text-cyan-300">PRO</span></div><div class="text-[11px] text-slate-400">by Sunshine@R · Design wird auf diesem Gerät gespeichert.</div></div><button type="button" data-close class="ml-auto px-4 py-2.5 rounded-xl bg-cyan-500 text-slate-950 font-bold text-sm">Fertig</button></div>
    </div>`;
    document.body.appendChild(ov);
    // KI-Modell-Status live anzeigen
    const bpRender = () => {
      const el = ov.querySelector('#bp-status'), dot = ov.querySelector('#bp-dot'); if (!el) return;
      const B = window.BasicPitchAI; if (!B) { el.textContent = 'KI-Modul nicht eingebaut.'; return; }
      const s = B.state; let txt, col = 'bg-slate-500';
      if (s.status === 'ready') { txt = 'Bereit ✓ · Quelle: ' + (s.source || '?') + (s.backend ? ' · ' + s.backend : ''); col = 'bg-emerald-400'; }
      else if (s.status === 'loading') { txt = 'Lädt …'; col = 'bg-amber-400 animate-pulse'; }
      else if (s.status === 'error') { txt = 'Fehler: ' + (s.error || '').slice(0, 220); col = 'bg-rose-500'; }
      else txt = s.cached ? 'Im Gerätespeicher – wird bei Bedarf geladen.' : 'Noch nicht geladen – lädt automatisch beim ersten KI-Einsatz (~1 MB).';
      el.textContent = txt; dot.className = 'mt-1.5 w-2.5 h-2.5 rounded-full shrink-0 ' + col;
    };
    if (window.BasicPitchAI) window.BasicPitchAI.onChange(() => { if (document.body.contains(ov)) bpRender(); });
    bpRender();
    const { say } = window.SunUtil;
    ov.addEventListener('change', e => {
      if (e.target.id === 'bp-files' && e.target.files.length) {
        window.BasicPitchAI.installFiles(e.target.files).then(() => say('KI-Modell aus eigenen Dateien geladen und gespeichert.', 'success'), err => say(err.message, 'error'));
        e.target.value = '';
      }
    });
    ov.addEventListener('click', e => {
      const t = e.target;
      if (t.closest('button[data-bp-load]')) { say('KI-Modell wird geladen …', 'info'); window.BasicPitchAI.load(true).then(() => say('KI-Modell bereit.', 'success'), err => say(err.message.slice(0, 200), 'error')); return; }
      if (t.closest('button[data-bp-pick]')) { ov.querySelector('#bp-files').click(); return; }
      if (t.closest('button[data-bp-remove]')) { window.BasicPitchAI.remove().then(() => say('KI-Modell entfernt.', 'info')); return; }
      if (t.closest('button[data-ai-settings]')) { ov.remove(); if (window.SunshineAI && SunshineAI.openChatSettings) SunshineAI.openChatSettings(); return; }
      if (t === ov || t.closest('[data-close]')) { ov.remove(); return; }
      const card = t.closest('button[data-theme-id]');
      if (card) { applyTheme(card.dataset.themeId); openSettings(); const sc = document.querySelector('#settings-modal > div'); return; }
      const setAcc = v => { const p = readUi(); p.accent = v; saveUi(p); ov.querySelectorAll('#acc-row .sw-dot').forEach(b => b.setAttribute('aria-pressed', String((b.dataset.accent || '').toLowerCase() === (v || '').toLowerCase() && !!v || (b.hasAttribute('data-accent-auto') && !v)))); };
      if (t.closest('button[data-accent-auto]')) { setAcc(null); return; }
      const sw = t.closest('button[data-accent]'); if (sw) { setAcc(sw.dataset.accent); return; }
      const rb = t.closest('button[data-radius]');
      if (rb) { const p = readUi(); p.radius = rb.dataset.radius; saveUi(p); ov.querySelectorAll('#rad-row button').forEach(b => { const on = b === rb; b.setAttribute('aria-pressed', String(on)); b.className = 'py-2.5 text-xs font-bold rounded-xl border ' + (on ? 'border-amber-400 bg-slate-800 text-amber-200' : 'border-slate-700 bg-slate-900 text-slate-300'); }); return; }
      if (t.closest('button[data-reset-custom]')) { const p = readUi(); Object.assign(p, { accent: null, glassK: UI_DEFAULTS.glassK, blur: null, radius: 'normal' }); saveUi(p); openSettings(); return; }
    });
    // Live-Regler: beim Ziehen bleibt nur die bediente Zeile sichtbar, damit man die Wirkung auf der echten Oberfläche sieht
    ov.addEventListener('pointerdown', e => { const c = e.target.closest('[data-range],[data-accent-custom]'); if (c) SunPeek.on(ov, c.closest('label') || c.parentElement || c); });
    ['pointerup', 'pointercancel', 'change', 'blur'].forEach(ev => ov.addEventListener(ev, e => { if (e.target.closest && e.target.closest('[data-range],[data-accent-custom]')) SunPeek.off(ov); }, true));
    ov.addEventListener('input', e => {
      const t = e.target;
      if (t.dataset && t.dataset.range) {
        const p = readUi(), v = +t.value;
        if (t.dataset.range === 'glassK') { p.glassK = v; const l = ov.querySelector('#v-glassK'); if (l) l.textContent = v === 40 ? 'Standard' : Math.round(v * 2.5) + ' %'; }
        else if (t.dataset.range === 'blur') { p.blur = v; const l = ov.querySelector('#v-blur'); if (l) l.textContent = v + ' px'; }
        saveUi(p);
      } else if (t.dataset && 'accentCustom' in t.dataset) {
        const p = readUi(); p.accent = t.value; saveUi(p);
        ov.querySelectorAll('#acc-row .sw-dot').forEach(b => b.setAttribute('aria-pressed', 'false'));
      }
    });
    ov.addEventListener('change', e => {
      const t = e.target;
      if (t.dataset && t.dataset.ui) { const p = readUi(); p[t.dataset.ui] = t.checked; saveUi(p); }
      else if (t.dataset && 'dockmode' in t.dataset) { try { DockWin.setMode(t.value); } catch (_) {} }
      else if (t.dataset && 'spessa' in t.dataset) { try { SpessaEngine.setEnabled(t.checked); } catch (_) {} }
    });
  }

  window.SunshineTheme = { apply: applyTheme, get: getTheme, open: openSettings, themes: THEMES };
  applyUi(readUi());
  document.addEventListener('click', e => { if (e.target.closest && e.target.closest('#btn-settings')) { e.preventDefault(); try { openSettings(); } catch (err) { console.error('[Optionen]', err); if (typeof toast === 'function') toast('Optionen konnten nicht geöffnet werden: ' + err.message, 'error'); } } });
})();
