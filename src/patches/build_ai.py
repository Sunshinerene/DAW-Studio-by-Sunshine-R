import os
# S (Wurzel des Pakets) wird von build.py gesetzt
rd=lambda p:open(S+p,encoding='utf8').read()
import importlib.util as _iu
_sp=_iu.spec_from_file_location('grundgeruest',S+'src/kern/grundgeruest.py');_gm=_iu.module_from_spec(_sp);_sp.loader.exec_module(_gm)
h=_gm.zusammenbauen(rd)
def patch_theme(s):
    s=s.replace("glassK: 40, blur: null, radius: 'normal' };","glassK: 40, blur: null, radius: 'normal', voice: false };",1)
    s=s.replace("function saveUi(p) { try { localStorage.setItem(LS_UI, JSON.stringify(p)); } catch (_) {} applyUi(p); }","function saveUi(p) { try { localStorage.setItem(LS_UI, JSON.stringify(p)); } catch (_) {} applyUi(p); try { document.dispatchEvent(new CustomEvent('sunshine-ui', { detail: p })); } catch (_) {} }",1)
    s=s.replace("${toggle('large', 'Große Bedienelemente', 'Alle Buttons mindestens 44 px hoch – leichter zu treffen.', ui.large)}","${toggle('large', 'Große Bedienelemente', 'Alle Buttons mindestens 44 px hoch – leichter zu treffen.', ui.large)}\n        <div class=\"py-2\"><label class=\"block text-sm font-semibold mb-1\" for=\"opt-dockmode\">Bereiche (Editor, Drums, Vocal, Mixer)</label><select id=\"opt-dockmode\" data-dockmode class=\"w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100\"><option value=\"big\" ${window.DockWin && DockWin.mode === 'big' ? 'selected' : ''}>Großes Fenster bei Bedarf (aufgeräumt)</option><option value=\"windows\" ${window.DockWin && DockWin.mode === 'windows' ? 'selected' : ''}>Untereinander, einklappbar</option><option value=\"tabs\" ${window.DockWin && DockWin.mode === 'tabs' ? 'selected' : ''}>Reiter unter den Spuren</option></select><span class=\"block text-[11px] text-slate-400 mt-1\">Standard: Oben Spuren und Transport; Editor, Drums, Vocal und Mixer öffnen auf Tipp als eigenes großes Fenster.</span></div>",1)
    s=s.replace("else if (t.dataset && 'spessa' in t.dataset)","else if (t.dataset && 'dockmode' in t.dataset) { try { DockWin.setMode(t.value); } catch (_) {} }\n      else if (t.dataset && 'spessa' in t.dataset)",1)
    marker='<div class="flex items-center gap-3 mt-4 pt-3 border-t border-slate-800"><img src="assets/sunshine-r-app-icon.png"'
    sec='''<div class="text-[11px] font-bold uppercase tracking-wider text-slate-400 mt-4 mb-1">Sicherheit</div>
      <div class="rounded-xl border border-slate-800 px-3 py-1"><label class="flex items-start gap-3 py-2 cursor-pointer"><input type="checkbox" data-autosave ${window.Autosave && Autosave.enabled() ? 'checked' : ''} class="mt-1 w-5 h-5 shrink-0"><span class="min-w-0"><span class="block text-sm font-semibold">♻️ Autosave &amp; Wiederherstellung</span><span class="block text-[11px] text-slate-400">Sichert dein Projekt automatisch im Browser. Nach einem Absturz oder Neustart fragt die App, ob sie weitermachen soll.</span><span id="as-status" class="block text-[11px] text-amber-300 mt-1">${window.Autosave ? Autosave.statusText() : ''}</span></span></label><button type="button" data-as-clear class="mb-2 w-full py-2.5 rounded-lg border border-slate-700 bg-slate-900 text-xs font-bold text-slate-200">Zwischenstand löschen</button></div>
      <div class="text-[11px] font-bold uppercase tracking-wider text-slate-400 mt-4 mb-1">Experimentell</div>
      <div class="rounded-xl border border-slate-800 px-3 py-1">${toggle('voice', '🎤 Sprachsteuerung (Test)', 'Blendet einen Mikrofon-Knopf ein: Befehle wie „Play“, „Tempo 120“, „Spur 2 stumm“ sprechen oder tippen. Löschen und Zurücksetzen sind gesperrt. Ob Sprechen geht, hängt vom Gerät ab – Tippen geht immer.', ui.voice)}</div>
      <button type="button" data-ai-settings class="mt-2 w-full py-3 rounded-xl border border-slate-700 bg-slate-900 text-sm font-bold text-slate-100">💬 Assistent einrichten (lokales Modell · Online) …</button>
      '''
    assert marker in s
    s=s.replace(marker,sec+marker,1)
    old="if (t === ov || t.closest('[data-close]')) { ov.remove(); return; }"
    assert old in s
    s=s.replace(old,"if (t.closest('button[data-ai-settings]')) { ov.remove(); if (window.SunshineAI && SunshineAI.openChatSettings) SunshineAI.openChatSettings(); return; }\n      "+old,1)
    return s
k=h.index('/* ===== Sunshine@R · Design-Auswahl & Optionen')
h=h[:k]+patch_theme(h[k:])

# ---------- Schritt 2: Transport, Fenster ----------
def once(h,old,new,tag):
    assert h.count(old)==1,(tag,h.count(old))
    return h.replace(old,new,1)
h=once(h,'''<svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 6h12v12H6z"/></svg>
          </button>''','''<svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 6h12v12H6z"/></svg><span>Stopp</span>
          </button>''','stop')
h=once(h,'<div class="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-daw-surface border-b border-daw-border">\n        <div class="flex flex-wrap items-center gap-1.5">\n          <button data-tab="midi"','<div id="dock-tabbar" class="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-daw-surface border-b border-daw-border">\n        <div class="flex flex-wrap items-center gap-1.5">\n          <button data-tab="midi"','tabbar')
h=once(h,"if (dawState.activeTab === 'midi') drawPianoRoll();","if (dawState.activeTab === 'midi' || (window.DockWin && DockWin.isOpen('midi'))) drawPianoRoll();",'tick-midi')
h=once(h,"if (dawState.activeTab === 'mixer') {\n          dawState.tracks.forEach","if (dawState.activeTab === 'mixer' || (window.DockWin && DockWin.isOpen('mixer'))) {\n          dawState.tracks.forEach",'tick-mixer')
h=once(h,"if (dawState.activeTab === 'midi') {\n          drawPianoRoll();","if (dawState.activeTab === 'midi' || (window.DockWin && DockWin.isOpen('midi'))) {\n          drawPianoRoll();",'resize')
css=rd('src/layout/ui2/ui2.css')
h=once(h,'</head>','<style id="sunshine-ui2">\n'+css+'\n</style>\n</head>','css')
exec(open(S+'src/patches/build_clips.py',encoding='utf8').read())
exec(open(S+'src/patches/build_autosave.py',encoding='utf8').read())
exec(open(S+'src/patches/build_mem.py',encoding='utf8').read())
exec(open(S+'src/patches/build_saver.py',encoding='utf8').read())
exec(open(S+'src/patches/build_big.py',encoding='utf8').read())
exec(open(S+'src/patches/build_mix.py',encoding='utf8').read())
exec(open(S+'src/patches/build_creative.py',encoding='utf8').read())
exec(open(S+'src/patches/build_home.py',encoding='utf8').read())
exec(open(S+'src/patches/build_bg.py',encoding='utf8').read())
exec(open(S+'src/patches/build_cover.py',encoding='utf8').read())
tag='<script>\n/* ===== Sunshine@R · Design-Auswahl & Optionen ===== */'
assert tag in h
blk='<script>\n/* ===== Sunshine@R · KI-Rechenkern ===== */\n'+rd('src/ki/studioai_core.js')+'\n</script>\n<script>\n'+rd('src/ki/studioai_ui.js')+'\n</script>\n<script>\n'+rd('src/ki/studioai_assistant.js')+'\n</script>\n<script>\n'+rd('src/layout/ui2/ui2_transport.js')+'\n</script>\n<script>\n'+rd('src/layout/ui2/ui2_windows.js')+'\n</script>\n<script>\n'+'\n</script>\n<script>\n'+MIX_CORE_JS+'\n</script>\n<script>\n'+CREATIVE_CORE_JS+'\n</script>\n<script>\n'+rd('src/audio/clips/clip_editor.js')+'\n</script>\n<script>\n'+MIX_UI_JS+'\n</script>\n<script>\n'+AUTOSAVE_JS+'\n</script>\n'+('<script>\n'+CREATIVE_UI_JS+'\n</script>\n' if CREATIVE_UI_JS else '')+'<script>\n'+HOME_JS+'\n</script>\n'
h=h.replace(tag,blk+tag,1)
exec(open(S+'src/patches/build_polish.py',encoding='utf8').read())
exec(open(S+'src/patches/build_tw.py',encoding='utf8').read())
os.makedirs(S+'dist',exist_ok=True)
open(S+'dist/index_ueberarbeitet.html','w',encoding='utf8',newline='').write(h)
t=patch_theme(rd('src/design/theme.js')) if "voice: false" not in rd('src/design/theme.js') else None
print('gebaut',len(h))
