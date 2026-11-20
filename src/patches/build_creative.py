# ---------- Schritt 5: Kreativ (Tonart, Transponieren, Beat-Slicer, Import-Assistent, Marker) ----------
CREATIVE_CORE_JS=rd('src/audio/kreativ/creative_core.js')
import os
CREATIVE_UI_JS=rd('src/audio/kreativ/creative_ui.js') if os.path.exists(S+'src/audio/kreativ/creative_ui.js') else ''
h=once(h,"      masterTrimDb: 0,\n      limiterDb: -1,\n","      masterTrimDb: 0,\n      limiterDb: -1,\n      markers: [],\n",'cr-state')
h=once(h,"    trim: dawState.startOffsetMs,\n    sub: $('status-subtitle').textContent\n  });","    trim: dawState.startOffsetMs,\n    mk: JSON.parse(JSON.stringify(dawState.markers || [])),\n    sub: $('status-subtitle').textContent\n  });",'cr-snap')
h=once(h,"dawState.stepVelocities = s.vel; dawState.startOffsetMs = s.trim;","dawState.stepVelocities = s.vel; dawState.startOffsetMs = s.trim; if (s.mk) dawState.markers = s.mk;",'cr-restore')
h=once(h,"    let ok = 0, midi = 0; const failed = [];\n    for (const { i, target } of sel) {","    let ok = 0, midi = 0; const failed = [], newIds = [];\n    for (const { i, target } of sel) {",'cr-imp1')
h=once(h,"dawState.buffers[tr.id] = decoded; delete tr.clips;\n        tr.mute = false;\n        ok++;","dawState.buffers[tr.id] = decoded; delete tr.clips;\n        tr.mute = false;\n        newIds.push(tr.id);\n        ok++;",'cr-imp2')
h=once(h,"    if (failed.length) toast(`Importfehler (${failed.length}): ${failed[0].slice(0, 150)}`, 'error');\n  }","    if (failed.length) toast(`Importfehler (${failed.length}): ${failed[0].slice(0, 150)}`, 'error');\n    try { if (ok > 0 && window.__afterImport) window.__afterImport({ ok, midi, ids: newIds, mode }); } catch (e) { console.warn(e); }\n  }",'cr-imp3')
h=once(h,"menu.style.top = Math.max(0, r.bottom + 6) + 'px'; menu.style.right = '12px'; };","menu.style.top = Math.max(0, r.bottom + 6) + 'px'; menu.style.right = '12px'; menu.style.maxHeight = Math.max(160, window.innerHeight - r.bottom - 18) + 'px'; menu.style.overflowY = 'auto'; menu.style.overscrollBehavior = 'contain'; };",'cr-menuscroll')
