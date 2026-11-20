# ---------- Cover & Tags: Master-WAV-Knopf (Hauptdatei) ----------
h=once(h,"const blob = encodeWav16Bit(rendered);\n        const filename = `Sunshine-R_Stem_DAW_Pro_${dawState.bpm}BPM.wav`;",
 "let blob = encodeWav16Bit(rendered);\n        let filename = `Sunshine-R_Stem_DAW_Pro_${dawState.bpm}BPM.wav`;\n        try { if (window.Cover && Cover.hasTags()) { const _m = await Cover.exportMeta(); if (_m) blob = Cover.tagWav(blob, _m); const _fb = Cover.fileBase(); if (_fb) filename = _fb + '.wav'; } } catch (_e) { console.warn('Tags:', _e); }",'cv-masterwav')

