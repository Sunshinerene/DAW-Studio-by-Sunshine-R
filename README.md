# Sunshine@R DAW Studio – Quellen

Dieser Ordner ist die **Quelle** der App. Das Ergebnis des Baus ist eine einzige Datei:
`dist/index_ueberarbeitet.html` – sie wird als `www/index.html` ins Android-Repo gelegt (Live-Update und APK-Bau
bleiben unverändert, siehe `ANLEITUNG.md` im Android-Zusatzpaket).

Stand: Version 1.30. Der Bau aus diesem Ordner ergibt **Byte für Byte** dieselbe Datei wie die ausgelieferte 1.30.

## Bauen und testen

```
python3 build.py              # erzeugt dist/index_ueberarbeitet.html und dist/assets
tests/runall.sh               # alle Regressionstests gegen dist/ (Ergebnis: tests/ergebnis.txt)
```

Voraussetzungen: Python 3, Node, Playwright mit Chromium (global installiert, `npm root -g`). Der Bau braucht Node + Playwright,
weil das Tailwind-CSS beim Bauen vorberechnet wird. Die Export-Tests brauchen `ffmpeg`/`ffprobe`, der Backup-Test `jszip`
unter `/opt/npm-tools/node_modules`. Alle Tests laufen in einem Headless-Browser ohne Netz; auf einem echten Handy und in einem
echten GitHub-Actions-Lauf sind sie nicht gelaufen.

## Die Themenbereiche (`src/`)

| Ordner | Inhalt |
|---|---|
| `kern/` | Zustand und Spuren (`dawState`), kleine Helfer, Start/Initialisierung, Zusammenbau des Grundgerüsts (`grundgeruest.py`) |
| `layout/` | Aufbau und Bedienung: Grundgerüst (HTML-Teile), Spuren-Ansicht, Piano-Roll, Drum-Sequencer, Mixer-Ansicht, Animations-Takt, Toast; `dock/` (untere Leiste, großes Fenster), `ui2/` (Transport, Bereichsfenster), `startseite/` (Startseite, Home-Dock), `optionen/` (Optionen-Navigation) |
| `design/` | Themen, Akzente, Effekte, Icons, Intro; Basis-CSS und Theme-CSS, Tailwind-Vorberechnung (`tailwind/`), Optionen-Dialog (Design-Teil) |
| `audio/` | Audio-Engine, Synthesizer, MIDI-Datei und Web-MIDI, Muster-Generator, WAV-Export; `player/` (Player, Klang-Voreinstellungen, Tags), `mixer/` (Automation, Lautheit), `export/`, `clips/`, `kreativ/` (Tonart, Beat-Slicer, Import-Assistent), `cover_tags/` |
| `plugins/` | Instrumente und FX-Rack, SoundFont (sf2), `spessa/` (Soundfont-Kern, Runner, Worklet – Datenblöcke der Seite) |
| `ki/` | Audio→MIDI (DSP), Basic Pitch, Assistent und Rechenkern |
| `projekt/` | Projektbibliothek, Import/Undo/Reset, Demo-Stems und Dateiimport, Autosave, Speicher-Sparer |
| `hilfe/` | Hilfe, „Was ist neu“, Live-Update und Updater, Selbstcheck (health), Feedback |
| `android/` | `patch-android.cjs` und `sw.js` als Referenzkopie. **Maßgeblich ist die Kopie im Android-Repo (`scripts/patch-android.cjs`)**; bei Änderung beides angleichen |
| `patches/` | Bau-Skripte (siehe unten) |

Außerhalb von `src/`: `assets/` (Logo, Icon, Intro, `vendor/jszip`), `tests/` (50 Testdateien + `fixtures/`), `tools/` (Prüfskripte, Spessa-Bau-Kit),
`CHANGELOG.md` (oberster Abschnitt = „Was ist neu“ in der App, die Version der App wird daraus gelesen), `VORSCHAU.md`, `feedback_to.txt`.

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
- Pro Lieferung: Eintrag oben in `CHANGELOG.md` (`## 1.31 · 2026-11-20 · Titel`, dann `- Neu:` / `- Besser:` / `- Hinweis:`). Versionsangaben in versionsabhängigen Tests (`v114_test.cjs` u. a.) mitziehen.
- Änderungen nur an `index.html`, `CHANGELOG.md`, `VORSCHAU.md` → Live-Update genügt. Änderungen an `patch-android.cjs` oder `assets/` → neue APK nötig.
- Neue Funktion gehört in genau einen Bereich. Querbezüge zwischen Bereichen laufen über die vorhandenen Schnittstellen (`window.Home`, `TpDock`, `Player`, `Saver`, `Autosave` …).

## Noch nicht erledigt (bewusst)

- Die Textersetzungen in `src/patches/build_*.py` sind noch nicht in die Quelldateien eingearbeitet. Sie sind jetzt wenigstens an einem Ort, geordnet und vom Bau
  geprüft. Eingearbeitet wird stückweise, sobald eine Stelle ohnehin angefasst wird (Stufe 2 ff.).
- Nicht im Paket: der Signier-Schlüssel (`sunshine.p12`), ältere Zwischenstände (`index_before_*.html`), Screenshots und Versuchsordner. Sie werden für den Bau nicht gebraucht.
