/* Sunshine@R · Live-Update-Dienst (Service Worker)
   Liefert beim Start der App – falls vorhanden und passend – die per Live-Update geladene Oberfläche statt der eingebauten.
   Sicherheitsnetze: gleiche App-Hülle (build.json), höchstens 2 Startversuche ohne Bestätigung, bei jedem Zweifel die eingebaute Seite. */
const C = 'sunshine-live';
const json = o => new Response(JSON.stringify(o), { headers: { 'Content-Type': 'application/json' } });
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
async function livePage() {
  const c = await caches.open(C);
  const mr = await c.match('/__live/meta'); if (!mr) return null;
  const meta = await mr.json();
  const page = await c.match('/__live/page'); if (!page) return null;
  if (meta.status === 'bad') return null;
  let b = null;
  try { const r = await fetch('/build.json', { cache: 'no-store' }); if (r.ok) b = await r.json(); } catch (_) {}
  if (!b) return null;                                   // ohne Gegenprobe nie die Live-Seite zeigen
  if (String(b.n) !== String(meta.n) || String(b.nat) !== String(meta.nat)) {   // neue APK installiert → Live-Kopie ist veraltet
    await c.delete('/__live/page'); await c.delete('/__live/meta'); return null;
  }
  if (meta.status === 'pending') {
    meta.boots = (meta.boots || 0) + 1;
    if (meta.boots > 2) { meta.status = 'bad'; meta.why = 'start'; await c.put('/__live/meta', json(meta)); return null; }
    await c.put('/__live/meta', json(meta));
  }
  return page;
}
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET' || r.mode !== 'navigate') return;
  const u = new URL(r.url);
  if (u.origin !== self.location.origin || (u.pathname !== '/' && u.pathname !== '/index.html')) return;
  e.respondWith(livePage().then(p => p || fetch(r)).catch(() => fetch(r)));
});
