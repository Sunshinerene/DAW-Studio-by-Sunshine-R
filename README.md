# Sunshine@R DAW Studio – Quellen

Dieser Ordner ist die **Quelle** der App. Das Ergebnis des Baus ist eine einzige Datei:
`dist/index_ueberarbeitet.html` – sie wird als `www/index.html` ins Android-Repo gelegt (Live-Update und APK-Bau
bleiben unverändert, siehe `ANLEITUNG.md` im Android-Zusatzpaket).

Stand: Version 1.32 (Aufräumen, Teil 2). Der Bau aus Stufe 1 war Byte für Byte gleich 1.30; ab 1.31 sind die gemeinsamen Bausteine (unten) eingebaut, ab 1.32 laufen Takt und Beobachter zentral und die App ruht im Leerlauf.

## Bauen und testen

```
python3 build.py              # erzeugt dist/index_ueberarbeitet.html und dist/assets
tests/runall.sh               # alle Regressionstests gegen dist/ (Ergebnis: tests/ergebnis.txt)
node tests/kompat_test.cjs dist <ordner-mit-alter-index_ueberarbeitet.html>   # Daten der alten Version in der neuen lesen (einmalig pro Umbau)
```

Voraussetzungen: Python 3, Node, Playwright mit Chromium (global installiert, `npm root -g`). Der Bau braucht Node + Playwright,
weil das Tailwind-CSS beim Bauen vorberechnet wird. Die Export-Tests brauchen `ffmpeg`/`ffprobe`, der Backup-Test `jszip`
unter `/opt/npm-tools/node_modules`. Alle Tests laufen in einem Headless-Browser ohne Netz; auf einem echten Handy und in einem
echten GitHub-Actions-Lauf sind sie nicht gelaufen.

## Die Themenbereiche (`src/`)

| Ordner | Inhalt |
|---|---|
| `kern/` | Gemeinsame Bausteine (`bausteine.js`), Zustand und Spuren (`dawState`), kleine Helfer, Start/Initialisierung, Zusammenbau des Grundgerüsts (`grundgeruest.py`) |
| `layout/` | Aufbau und Bedienung: Grundgerüst (HTML-Teile), Spuren-Ansicht, Piano-Roll, Drum-Sequencer, Mixer-Ansicht, Animations-Takt, Toast; `dock/` (untere Leiste, großes Fenster), `ui2/` (Transport, Bereichsfenster), `startseite/` (Startseite, Home-Dock), `optionen/` (Optionen-Navigation) |
| `design/` | Themen, Akzente, Effekte, Icons, Intro; Basis-CSS und Theme-CSS, Tailwind-Vorberechnung (`tailwind/`), Optionen-Dialog (Design-Teil) |
| `audio/` | Audio-Engine, Synthesizer, MIDI-Datei und Web-MIDI, Muster-Generator, WAV-Export; `player/` (Player, Klang-Voreinstellungen, Tags), `mixer/` (Automation, Lautheit), `export/`, `clips/`, `kreativ/` (Tonart, Beat-Slicer, Import-Assistent), `cover_tags/` |
| `plugins/` | Instrumente und FX-Rack, SoundFont (sf2), `spessa/` (Soundfont-Kern, Runner, Worklet – Datenblöcke der Seite) |
| `ki/` | Audio→MIDI (DSP), Basic Pitch, Assistent und Rechenkern |
| `projekt/` | Projektbibliothek, Import/Undo/Reset, Demo-Stems und Dateiimport, Autosave, Speicher-Sparer |
| `hilfe/` | Hilfe, „Was ist neu“, Live-Update und Updater, Selbstcheck (health), Feedback |
| `android/` | `patch-android.cjs` und `sw.js` als Referenzkopie. **Maßgeblich ist die Kopie im Android-Repo (`scripts/patch-android.cjs`)**; bei Änderung beides angleichen |
| `patches/` | Bau-Skripte (siehe unten) |

Außerhalb von `src/`: `assets/` (Logo, Icon, Intro, `vendor/jszip`), `tests/` (53 Testdateien + `fixtures/`), `tools/` (Prüfskripte, Spessa-Bau-Kit),
`CHANGELOG.md` (oberster Abschnitt = „Was ist neu“ in der App, die Version der App wird daraus gelesen), `VORSCHAU.md`, `feedback_to.txt`.

## Gemeinsame Bausteine (`src/kern/bausteine.js`, lädt vor allen anderen Modulen)

- **`SunUtil`**: `esc` (HTML-Text), `escQ` (zusätzlich `'`), `clamp`, `say` (Toast, nie ein Fehler), `safe` (Funktion ausführen, Fehler ins Log). Module holen sich, was sie brauchen:
  `const { esc, clamp, say } = window.SunUtil;`. Absichtlich noch eigene Kopien: die reinen Rechenkerne (`*_core.js`, `sound.js`), damit sie ohne Seite testbar bleiben, der `esc` im Optionsmenü, der `say` des Assistenten (mit Log-Rückfall) und das `safe` der Startseite (mit Log-Marke).
- **`SunStore`**: Einstellungen im Browser-Speicher. `SunStore.merge(objekt, schlüssel)` lädt gespeicherte Werte in ein Standard-Objekt, `SunStore.save(schlüssel, objekt)` speichert; dazu `get/set/del/json`. Alles abgesichert (gesperrter Speicher wirft nie).
- **`SunIDB`**: alle IndexedDB-Datenbanken der App (`DEFS` = Name + Stores). `SunIDB.open('projects')`, `SunIDB.tx(schlüssel, stores, modus, fn)`, `SunIDB.req`, `SunIDB.done`. Neue Datenbanken nur hier eintragen. Ausnahme: Sicherung/Wiederherstellung in `hilfe/updater.js` öffnet Datenbanken bewusst generisch.

- **`SunTick`**: EIN gemeinsamer Taktgeber (Raster 250 ms) statt vieler `setInterval`. `SunTick.every(ms, fn, {hidden})` (läuft im Vielfachen von 250 ms; ohne `hidden` pausiert die Aufgabe im Hintergrund und holt beim Zurückkehren nach), `SunTick.rate(handle, ms)` (Takt ändern, z. B. im Leerlauf langsamer), `SunTick.stop(handle)`. Ohne Aufgaben steht der Takt still. Neue wiederkehrende Aufgaben **nicht** mit `setInterval` bauen.
- **`SunDOM`**: EIN Beobachter für „Element erscheint“. `SunDOM.mount(id, fn)` (je Element einmal, z. B. Optionsmenü-Abschnitte) und `SunDOM.on(selektor, fn)`.
- **Leerlauf der Zeichenschleife** (`layout/animation_loop.js`): Die Oberfläche zeichnet nur bei Wiedergabe, Aufnahme oder offenem Mixer sowie nach Berührung/Taste; sonst ruht `requestAnimationFrame`. Wer künftig etwas Dauerhaftes animiert, muss dafür sorgen, dass es sich selbst beendet (Beispiel: Pulse im Cover-Effekt verfallen nach 0,7 s). `tests/takt_test.cjs` prüft Ruhe, Wiederanlauf und die Zahl der Timer/Beobachter; `tools/pruefskripte/audit_wakeups.cjs <absoluter-dist-pfad> [hidden|home]` misst Aufwachen pro Sekunde.

**Namen bleiben stabil.** Schlüssel und Datenbanknamen wurden NICHT umbenannt: Eine Umbenennung brächte nur Optik, aber das Risiko, dass Nutzer ihre Daten „verlieren“. `tests/kompat_test.cjs` prüft das mit echten Daten der alten Version.

| Datenbank | Stores | Zweck |
|---|---|---|
| `SunshineRStemStudioProjects` | `projects` | Projektbibliothek |
| `SunshineHome` | `idx` | Index der Startseite |
| `SunshineAutosave` | `meta`, `buf` | Autosave |
| `sunshine-soundfonts` | `meta`, `data` | importierte SoundFonts |
| `sunshine-player` | `kv` | Player-Sitzung, Ordner-Verlauf |
| `SunshineStemCache` | `stems` | Zwischenablage beim Import |

Schlüssel im Browser-Speicher (alle mit Präfix `sunshine.`): `ui`, `theme`, `tpdock`, `layout`, `fx`, `intro`, `home`, `news`, `help`, `live`, `update`, `feedback`, `preview`, `player`, `player.pos`, `assistant`, `autosave`, `saver`, `cover`, `cover.last`, `dock`, `midigroup`, `optnav`, `perf`, `alive`, `errlog`, `bp.cached`, `spessa.enabled`.

## Wie der Bau funktioniert

1. `src/kern/grundgeruest.py` setzt das Grundgerüst (Basis-Seite) aus den Dateien unter `src/layout/grundgeruest/` (HTML-Teile) und den
   Skript-/Style-Blöcken zusammen. Der große Kern ist in Abschnitte geteilt (Zustand, Engine, Synthesizer, Export, Ansichten …); die
   Abschnitte werden in der Reihenfolge der Liste mit Zeilenumbruch verbunden, **die Reihenfolge nicht ändern**: alle Abschnitte teilen sich einen Gültigkeitsbereich.
2. `src/patches/build_ai.py` führt die übrigen Bau-Skripte aus (`build_*.py`). Sie ersetzen gezielt Textstellen im Grundgerüst (`once(h, alt, neu, name)`;
   schlägt der Bau fehl, ist die Stelle nicht mehr vorhanden) und setzen die Module (CSS/JS aus den Bereichs-Ordnern) ein.
3. `build_polish.py` baut das Polish-Bündel (CSS + Module), liest `CHANGELOG.md`/`VORSCHAU.md` und trägt Version, Neuigkeiten und Vorschau ein.
4. `build_tw.py` berechnet Tailwind vor (Node + Playwright) und ersetzt das Laufzeit-Skript durch ein fertiges `<style>`.

## Regeln für die Weiterarbeit

- Nur an den Dateien in `src/` ändern, nie an `dist/`. Danach `python3 build.py` und `tests/runall.sh`.
- Pro Lieferung: Eintrag oben in `CHANGELOG.md` (`## 1.32 · 2026-11-20 · Titel`, dann `- Neu:` / `- Besser:` / `- Hinweis:`). Versionsangaben in versionsabhängigen Tests (`v114_test.cjs` u. a.) mitziehen.
- Änderungen nur an `index.html`, `CHANGELOG.md`, `VORSCHAU.md` → Live-Update genügt. Änderungen an `patch-android.cjs` oder `assets/` → neue APK nötig.
- Neue Funktion gehört in genau einen Bereich. Querbezüge zwischen Bereichen laufen über die vorhandenen Schnittstellen (`window.Home`, `TpDock`, `Player`, `Saver`, `Autosave` …).

## Noch nicht erledigt (bewusst)

- Die Textersetzungen in `src/patches/build_*.py` sind größtenteils noch nicht in die Quelldateien eingearbeitet (eingearbeitet ist bisher nur der Patch für den Optionen-Block, 1.31). Sie sind an einem Ort, geordnet und vom Bau geprüft; der Rest wird stückweise eingearbeitet, sobald eine Stelle ohnehin angefasst wird.
- Noch nicht vereinheitlicht: z-index-Werte (25 verschiedene) und doppelte CSS-Regeln – das kommt mit Stufe 5, weil es das Aussehen berührt und mit Screenshots geprüft werden muss.
- Nicht im Paket: der Signier-Schlüssel (`sunshine.p12`), ältere Zwischenstände (`index_before_*.html`), Screenshots und Versuchsordner. Sie werden für den Bau nicht gebraucht.
