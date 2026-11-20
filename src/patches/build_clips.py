# ---------- Schritt 3: Clips ----------
h=once(h,'</style>\n</head>','</style>\n<script>\n'+rd('src/audio/clips/clips_core.js')+'\n</script>\n</head>','clips-head')
h=once(h,"""          const buf = dawState.buffers[tr.id];
          const node = this.channelNodes[tr.id];
          if (!buf || !node) return;

          const usable = Math.max(0.1, buf.duration - trimSec);""","""          const buf = dawState.buffers[tr.id];
          const node = this.channelNodes[tr.id];
          if (Array.isArray(tr.clips) && node) { ClipModel.schedule(this, tr, node, when, offsetSec, stopAt); return; }
          if (!buf || !node) return;

          const usable = Math.max(0.1, buf.duration - trimSec);""",'sched')
h=once(h,"""        dawState.tracks.forEach(tr => {
          const buf = dawState.buffers[tr.id];
          if (buf) longest = Math.max(longest, buf.duration - trimSec);
        });""","""        dawState.tracks.forEach(tr => {
          if (Array.isArray(tr.clips)) { longest = Math.max(longest, ClipModel.end(tr)); return; }
          const buf = dawState.buffers[tr.id];
          if (buf) longest = Math.max(longest, buf.duration - trimSec);
        });""",'content')
h=once(h,"""        dawState.tracks.forEach(tr => {
          const buf = dawState.buffers[tr.id];
          if (!buf) return;
          const usable = Math.max(0.2, buf.duration - trimSec);""","""        dawState.tracks.forEach(tr => {
          if (Array.isArray(tr.clips) && offNodes[tr.id]) { ClipModel.scheduleOffline(offCtx, tr, offNodes[tr.id].input, totalSec); return; }
          const buf = dawState.buffers[tr.id];
          if (!buf) return;
          const usable = Math.max(0.2, buf.duration - trimSec);""",'export')
h=once(h,"""        if (tr.type === 'audio' || tr.type === 'stem' || tr.type === 'mic') {
          const buf = dawState.buffers[tr.id];
          if (buf) {
            const data = buf.getChannelData(0);""","""        if (Array.isArray(tr.clips) && (tr.type === 'audio' || tr.type === 'stem' || tr.type === 'mic')) {
          ClipModel.drawLane(ctx, tr, w, h, totalSec);
        } else if (tr.type === 'audio' || tr.type === 'stem' || tr.type === 'mic') {
          const buf = dawState.buffers[tr.id];
          if (buf) {
            const data = buf.getChannelData(0);""",'draw')
h=once(h,"try { src.onended = null; src.stop(); src.disconnect(); } catch (e) {}","try { src.onended = null; src.stop(); src.disconnect(); if (src._g) src._g.disconnect(); } catch (e) {}",'stop')
h=once(h,"""<button data-edit="${tr.editTab}" data-trackid="${tr.id}" class="tr-edit-btn""","""<button type="button" data-clipedit="${tr.id}" title="Spur groß ansehen &amp; bearbeiten (Teilen, Zuschneiden, Verschieben …)" aria-label="Spur groß ansehen" style="touch-action:manipulation" class="tr-edit-btn px-1.5 py-0.5 rounded bg-amber-500/15 hover:bg-amber-500/30 text-[9px] font-bold text-amber-200 border border-amber-500/40">⤢</button>
              <button data-edit="${tr.editTab}" data-trackid="${tr.id}" class="tr-edit-btn""",'clipbtn')
h=once(h,"            dawState.buffers[micTr.id] = buf;","            dawState.buffers[micTr.id] = buf; delete micTr.clips;",'mic')
h=once(h,"            dawState.buffers[slot] = decoded;","            dawState.buffers[slot] = decoded; { const _t = dawState.tracks.find(t => t.id === slot); if (_t) delete _t.clips; }",'slot')
assert h.count("dawState.buffers[tr.id] = decoded;")==2
h=h.replace("dawState.buffers[tr.id] = decoded;","dawState.buffers[tr.id] = decoded; delete tr.clips;")

