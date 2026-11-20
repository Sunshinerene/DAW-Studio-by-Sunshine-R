# ---------- Großansicht-Fenster: Anbindung an die untere Leiste ----------
h=once(h,"const goTo = el => { if (!el) return;","const goTo = el => { if (!el || document.documentElement.getAttribute('data-dock') === 'big') return;",'bw-goto')
