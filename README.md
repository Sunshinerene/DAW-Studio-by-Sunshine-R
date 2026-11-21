# Sunshine@R DAW Studio – Quellen

Dieser Ordner ist die **Quelle** der App. Das Ergebnis des Baus ist eine einzige Datei:
`dist/index_ueberarbeitet.html` – sie wird als `www/index.html` ins Android-Repo gelegt (Live-Update und APK-Bau
bleiben unverändert, siehe `ANLEITUNG.md` im Android-Zusatzpaket).

Stand: Version 1.49 (Dockbar-Reihenfolge). Der Bau aus Stufe 1 war Byte für Byte gleich 1.30; ab 1.31 sind die gemeinsamen Bausteine (unten) eingebaut, ab 1.32 laufen Takt und Beobachter zentral und die App ruht im Leerlauf.

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

Außerhalb von `src/`: `assets/` (Logo, Icon, Intro, `vendor/jszip`), `tests/` (69 Testdateien + `fixtures/`), `tools/` (Prüfskripte, Spessa-Bau-Kit),
`CHANGELOG.md` (oberster Abschnitt = „Was ist neu“ in der App, die Version der App wird daraus gelesen), `VORSCHAU.md`, `feedback_to.txt`.

## Gemeinsame Bausteine (`src/kern/bausteine.js`, lädt vor allen anderen Modulen)

- **`SunUtil`**: `esc` (HTML-Text), `escQ` (zusätzlich `'`), `clamp`, `say` (Toast, nie ein Fehler), `safe` (Funktion ausführen, Fehler ins Log). Module holen sich, was sie brauchen:
  `const { esc, clamp, say } = window.SunUtil;`. Absichtlich noch eigene Kopien: die reinen Rechenkerne (`*_core.js`, `sound.js`), damit sie ohne Seite testbar bleiben, der `esc` im Optionsmenü, der `say` des Assistenten (mit Log-Rückfall) und das `safe` der Startseite (mit Log-Marke).
- **`SunStore`**: Einstellungen im Browser-Speicher. `SunStore.merge(objekt, schlüssel)` lädt gespeicherte Werte in ein Standard-Objekt, `SunStore.save(schlüssel, objekt)` speichert; dazu `get/set/del/json`. Alles abgesichert (gesperrter Speicher wirft nie).
- **`SunIDB`**: alle IndexedDB-Datenbanken der App (`DEFS` = Name + Stores). `SunIDB.open('projects')`, `SunIDB.tx(schlüssel, stores, modus, fn)`, `SunIDB.req`, `SunIDB.done`. Neue Datenbanken nur hier eintragen. Ausnahme: Sicherung/Wiederherstellung in `hilfe/updater.js` öffnet Datenbanken bewusst generisch.

- **`SunTick`**: EIN gemeinsamer Taktgeber (Raster 250 ms) statt vieler `setInterval`. `SunTick.every(ms, fn, {hidden})` (läuft im Vielfachen von 250 ms; ohne `hidden` pausiert die Aufgabe im Hintergrund und holt beim Zurückkehren nach), `SunTick.rate(handle, ms)` (Takt ändern, z. B. im Leerlauf langsamer), `SunTick.stop(handle)`. Ohne Aufgaben steht der Takt still. Neue wiederkehrende Aufgaben **nicht** mit `setInterval` bauen.
- **`SunLazy`**: Bibliotheken erst bei Bedarf laden. `await SunLazy.zip()` liefert JSZip (lokale Kopie `assets/vendor/…`, sonst CDN, sonst Fehler; nach Fehlschlag ist ein neuer Versuch möglich). JSZip steht **nicht mehr** beim Start als `window.JSZip` bereit – Code muss `const JSZip = await SunLazy.zip();` aufrufen (im Leerlauf kurz nach dem Start wird sie ohnehin vorgeladen). Neue schwere Bibliotheken ebenso über `SunLazy.once(...)`. Messung: `tools/pruefskripte/audit_start.cjs <absoluter-dist-pfad> [drossel] [läufe]` (Startzeit je Skriptblock, CPU gedrosselt).
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

## Player: Laden auf Android

- **Direkter Weg (neue APK):** `SunshineMediaPlugin.cacheFile` (in `android/patch-android.cjs`) kopiert die Datei aus dem Ordner-Dialog nativ nach `cache/player/` (höchstens 2 Titel, beim Start geleert); die Seite spielt per `Capacitor.convertFileSrc` direkt davon (Bereichsabfragen = Spulen). Fehlt die Methode (alte Hülle) oder schlägt sie fehl, nutzt `load()` den alten Weg; spielt die URL nicht, gibt es genau einen Rückfall je Titel (`t.noStream`).
- **Alter Weg:** `natBlob` liest in 2-MB-Stücken über die Brücke, fragt das nächste Stück vor dem Umwandeln an (`b64buf` ohne Zeichen-Schleife), meldet Fortschritt und bricht ab, wenn ein anderer Titel gewählt wird.
- **Hintergrund-Scan** (`scan()`) wartet mit `waitQuiet()`, solange `busyLoad` > 0.
- Tests: `tests/player6_test.cjs` (Mock-Plugin mit echtem Bereichs-Server). Der Java-Teil wurde mit Stub-Klassen übersetzt und die Kopierlogik mit echten Dateien geprüft, aber nicht auf einem Gerät.

## Ebenen (z-index) und `!important`

- **Ebenen:** Alle Fenster/Leisten/Meldungen benutzen `var(--z-…)` aus der Liste ganz oben in `src/design/basis.css` (von `--z-header` 40 bis `--z-max`). **Keine neuen Zahlen ab 40 im Code**, neue Ebene = neuer Eintrag in der Liste (aufsteigend halten). Gleiche Zahl = gleiche Ebene (bei Gleichstand zählt die Reihenfolge im Dokument). Kleine Werte 0–10 innerhalb einer Komponente bleiben lokal. In Tailwind-Klassen: `z-[var(--z-dialog)]`. `tests/ebenen_test.cjs` prüft die echten Werte aller Fenster gegen `tests/fixtures/ebenen.json` (nach bewusster Änderung: `node tests/ebenen_test.cjs dist --schreiben`).
- **`!important`:** 227 Angaben in 83 Regeln (Stand 1.34), fast alle gewollt: Designs überschreiben Tailwind-Klassen (`html[data-theme=…] …`), `[hidden]`/`display:none`-Wächter, Handy-Anpassungen der Leiste, „Bewegung reduzieren“. Ein Messlauf (`tools/pruefskripte/audit_important.cjs`, 14 Zustände × 5 Designs) fand 31 Regeln, die in den getesteten Zuständen auch ohne `!important` gleich aussehen, 15 nötige und 37 in keinem Zustand sichtbare. Entfernt wurde nichts: Die „überflüssigen“ sind zum Teil Wächter, die nur in nicht getesteten Zuständen greifen. Neue `!important` nur mit Grund (Kommentar).
- **Bildvergleich:** `tools/pruefskripte/shots_vergleich.cjs <dist-alt> <dist-neu>` rendert 14 Ansichten in allen fünf Designs und vergleicht Pixel für Pixel (Rauschen bis 120 Pixel zählt als gleich). Vor jeder Änderung am Stil-Code gegen den letzten Stand laufen lassen.

## Wie der Bau funktioniert

1. `src/kern/grundgeruest.py` setzt das Grundgerüst (Basis-Seite) aus den Dateien unter `src/layout/grundgeruest/` (HTML-Teile) und den
   Skript-/Style-Blöcken zusammen. Der große Kern ist in Abschnitte geteilt (Zustand, Engine, Synthesizer, Export, Ansichten …); die
   Abschnitte werden in der Reihenfolge der Liste mit Zeilenumbruch verbunden, **die Reihenfolge nicht ändern**: alle Abschnitte teilen sich einen Gültigkeitsbereich.
2. `src/patches/build_ai.py` führt die übrigen Bau-Skripte aus (`build_clips/autosave/mix/creative/home.py`). Seit dem Aufräumen nach 1.40 stehen **alle Textersetzungen fest in den Quelldateien**
   (72 `once(...)`-Ersetzungen, die Namensersetzung „Stem DAW Studio" → „DAW Studio" und die Clips-Löschung beim Import). Die Skripte setzen nur noch **erzeugte Blöcke** ein, die vor `</head>` bzw.
   an einer Marke landen (UI2-CSS, Clips-Kern, Startseiten-Frühskript, Polish-CSS/JS, Build-Marke, Icon-Skript). Dort ist die Reihenfolge Absicht und die Einfügung per `once(h, alt, neu, name)` abgesichert (schlägt der Bau fehl, ist die Marke weg).
3. `build_polish.py` baut das Polish-Bündel (CSS + Module), liest `CHANGELOG.md`/`VORSCHAU.md` und trägt Version, Neuigkeiten und Vorschau ein.
4. `build_tw.py` berechnet Tailwind vor (Node + Playwright) und ersetzt das Laufzeit-Skript durch ein fertiges `<style>`.

## Regeln für die Weiterarbeit

- Texte direkt in der Quelldatei ändern (kein neues Patch-Skript für Textersetzungen anlegen). Nur an den Dateien in `src/` ändern, nie an `dist/`. Danach `python3 build.py` und `tests/runall.sh`.
- Pro Lieferung: Eintrag oben in `CHANGELOG.md` (`## 1.39 · 2026-11-21 · Titel`, dann `- Neu:` / `- Besser:` / `- Hinweis:`). Versionsangaben in versionsabhängigen Tests (`v114_test.cjs` u. a.) mitziehen.
- Änderungen nur an `index.html`, `CHANGELOG.md`, `VORSCHAU.md` → Live-Update genügt. Änderungen an `patch-android.cjs` oder `assets/` → neue APK nötig.
- Neue Funktion gehört in genau einen Bereich. Querbezüge zwischen Bereichen laufen über die vorhandenen Schnittstellen (`window.Home`, `TpDock`, `Player`, `Saver`, `Autosave` …).

## Noch nicht erledigt (bewusst)

- Doppelte CSS-Regeln gibt es nicht (Selektor + Inhalt identisch: 0); 53 Selektoren kommen mehrfach vor, meist bewusst (Grundstil + Design-Variante). Zusammenlegen brächte kaum Platz und Reihenfolge-Risiko.
- Nicht im Paket: der Signier-Schlüssel (`sunshine.p12`), ältere Zwischenstände (`index_before_*.html`), Screenshots und Versuchsordner. Sie werden für den Bau nicht gebraucht.

### Rundung (ab 1.37)
Alle Rundungen in Stilen laufen über Faktoren aus `src/layout/ui2/ui2.css`: `--rk` (Eckig 0,45 · Normal 1 · Extra rund 1,45), `--r-pill` und `--r-circle`. Neue Stile schreiben `border-radius:calc(16px * var(--rk,1))`, Pillen `var(--r-pill,999px)`, runde Tasten `var(--r-circle,50%)`. Punkte, Schalter und Pegel bleiben absichtlich fest. `tools/pruefskripte/audit_rundung.cjs <dist> sharp` und `audit_emoji.cjs <dist>` listen Abweichungen; `tests/rundung_test.cjs` prüft sie.

### Effekte (ab 1.38)
- Zeichner: `FxView` in `src/audio/cover_tags/cover.js` malt Rechtecke (Cover quadratisch, Dockbars breit). Gemeinsame Einstellungen (`cleanCfg`): Effekt, Stärke, Bewegung (`music`/`anim`/`static`), Farbe, Größe, Helligkeit, Transparenz, Tempo, Linienstärke. `drive()` entscheidet pro Bild, ob gezeichnet wird; „Starr“ und „Zur Musik“ ohne Musik halten die Schleife an.
- `Cover.rim(host, opts)` legt eine Zeichenfläche über eine Leiste. `src/layout/dock/dockfx.js` nutzt sie für `#bottom-nav`, `#pl-dock`, `#hm-dock` (Speicher `sunshine.dockfx`, Standard aus). `Cover.ui` ist der gemeinsame Baukasten für die Regler in den Optionen.
- Rand-Effekte (`src/design/effekte/fx.js/.css`): CSS-Animationen mit `steps()` (≈24 Bilder/s), Modi über `data-fx-mode`, Tempo über `--fx-s`, Pegel (nur „Zur Musik“) über `--fx-lvl`, Ansicht über `data-fx-view`; `.fx-h` (Startseite) und `.fx-p` (Player) markieren die Flächen.

### Layout und Leistung (ab 1.39)
- `--sx` (ui2.css, Standard 6 px) ist der gemeinsame Seitenabstand: Kopfzeile, Spurfenster, Werkzeuge, Player-Leiste und alle Dockbars nutzen ihn, damit alles gleich breit ist. Dockbars sind `bottom:0`; `html.pl-open`/`html.hm-open` sperren das Scrollen der Seite dahinter.
- `SunPerf` (`bausteine.js`): Leistungs-Wächter. Module melden Aufwendiges mit `SunPerf.heavy(fn)` und lesen `SunPerf.level()` (0 voll, 1 sparsam, 2 minimal); Auswahl in Optionen → Effekte → „Leistung“, Speicher `sunshine.perf`, Zustand als `html[data-perf]`.
- Player-Liste: `paintList()` baut nur neu, wenn sich die Titelfolge ändert, sonst werden die vorhandenen Zeilen angepasst; das Einlesen pausiert kurz nach Berührungen.

### Zentrale und Startansicht (ab 1.40)
- `src/layout/dock/zentrale.js/.css`: `Zentrale.pane(ansicht)` baut die Seite mit sechs Tasten (Startseite, DAW, Player, Feedback, Optionen, Anleitung), `Zentrale.go('home'|'daw'|'player')` wechselt die Ansicht (schließt die alte, öffnet die neue), `Zentrale.strip(host, …)` ist die wischbare Seiten-Leiste (Player-Dock nutzt eigene Markup-Variante `.pl-dk-*`, die Startseite `.zt-scroll`). `html.zt-on` blendet die alten Knöpfe aus (Player/Startseite), `html.tp-dock` die Menüpunkte im ☰-Menü – die Elemente bleiben im Dokument.
- DAW-Leiste (`tpdock.js`): vier Seiten `tp · tabs · pl · zt`. Player-Dock: `pl-dkp-ctl · snd · daw · zt`. Startseiten-Dock (`homedock.js`): `play` (nur wenn etwas läuft) · `snd` · `pl`/`daw` (die andere Seite) · `zt`; `HmDock.state()` liefert `visible` (Playbar da), `dock`, `pane`, `panes`; `HmDock.goPane(id)`.
- Startansicht: `localStorage 'sunshine.start'` = `home` | `daw` | `player`; der alte Schlüssel `sunshine.home` (`on`/`off`) wird mitgeschrieben und gilt, solange `sunshine.start` fehlt. API `Home.startView()` / `Home.setStartView(v)`. Beim Start mit „Player“ verdeckt `html.pl-pending` die DAW, bis der Player offen ist.

### Dockbars einheitlich, Rand-Seiten, Player-Kopfzeile (ab 1.41)
- Alle drei Dockbars rasten über `Zentrale.settle(scrollEl, fertig)` (`zentrale.js`) auf ganzen Seiten ein: nach 120 ms Ruhe (und nie mitten in einer Berührung) wird auf die nächste Seite gescrollt; erst dann bekommen die Seiten `inert`. Während des Wischens werden nur Punkte/Markierung nachgezogen (`paint(false)` / `mark(false)`).
- DAW-Leiste (`tpdock.js/.css`): Punkte `.td-dots2` (antippbar, `data-td-go`) statt der Pfeile (`.td-sw` per CSS ausgeblendet, im Dokument vorhanden); Transport-Seite = Positionsleiste (`HmDock.mountPane(…,'daw')`, nur die Leiste sichtbar) + echte Tasten in der Reihenfolge Loop · `#btn-td-start` · Play · Stopp · Klick.
- Rand-Effekte nach Seiten: `FX.set({sides:'b'})` (Zeichen `t r b l`, Standard `b`) setzt `html[data-fx-sides="b"]`; fehlt das Attribut, gilt das alte Aussehen. Gilt (ab 1.42) für alle `.fx-edge` – auch Leisten (`.fx-bar`) – und Dialoge (`.fx-win`); Leisten (`.fx-bar`: Kopfleiste, `#bottom-nav`, Player-Kopfzeile) behalten den vollen Rand.
- Tests: `layout3_test.cjs`. `runall.sh` zählt ab jetzt auch Abstürze (Abbruchcode ≠ 0) als Fehler.
- 1.42: `EDGE_SEL` in `fx.js` umfasst zusätzlich `.bw-lcard`, `#bw-root`, `.hm-resume`, `#hm-dock`, `.pl-lh`, `.pl-dock`. `tagWin()` markiert das erste Kind jedes Overlays mit `fixed inset-0` (und `.hm-sheet-bg`) als `.fx-win` – neue Dialoge brauchen keinen Eintrag in `WIN_IDS`. Der Dockbar-Effekt (`dockfx.js`, Canvas-Ring) bleibt eine eigene Einstellung ohne Seiten-Auswahl.
- 1.43: `window.addAudioBlobAsTrack(blob, dateiname, titel)` (`import_undo_reset.js`) legt eine einzelne Audio-Datei als neue Spur an (dekodieren → Undo-Schritt → `createTrack` → `refreshAll`). `Player.toDaw(i)` ruft es für einen Titel auf und prüft vorher mit `Health.memory()` den Speicher (Rückfrage ab Warnstufe, Ablehnung ab Hochstufe). Test: `tospur_test.cjs`.
- 1.44: MP3-Export. `src/vendor/lame.min.js` (lamejs 1.2.x, LGPL, unverändert) wird von `build_polish.py` als `<script type="text/plain" id="lame-src">` ans Seitenende gesetzt (Live-Update genügt, keine Datei in `assets/`). `SunLazy.lame()` führt den Text beim ersten Gebrauch aus. `ExportUI.encodeMp3` wandelt blockweise nach 16 Bit, schreibt ID3v2.3 über `Cover.id3`. Formate `mp3_128/192/320`. Test: `mp3_test.cjs` (ffprobe/ffmpeg).
- 1.45: Schnellwahl. In `zentrale.js` hört ein Dokument-Handler auf Wischen nach oben über `#bottom-nav`, `#pl-dock`, `#hm-dock` und dem Strich `#zt-grip`; `#zt-sheet` zeigt `Zentrale.pane(view())` direkt über der Leiste (Ebene 158, in `back.js`/`home.js`-Inert-Ausnahme eingetragen). DAW-Leiste (`tpdock.js`) hat nur noch tp/tabs/zt, Player-Dock ctl/snd/zt; die Startseite behält ihre Leisten je nach Modus. Tests: `schnellwahl_test.cjs`, angepasst: layout3/zentrale/dock6.
- 1.46: Labor (Beta). `src/layout/optionen/labor.js` (nach `icons.js` geladen) führt die Registry `Labor.register({id,title,desc,status:'beta'|'geplant',needs:'apk'})`, `Labor.isOn(id)`, `Labor.use(id,fn)`, `Labor.set`, `Labor.active`; Zustand in `sunshine.labor`. Eigene Optionen-Kategorie `lab` (optnav, Bereich `#lab-sec`), Feedback-Knopf pro Idee (Bereich „Labor“) und Zeile „Labor eingeschaltet: …“ im Feedback. Neue Ideen immer über das Labor einbauen: bei „aus“ muss alles laufen wie ohne. Test: `labor_test.cjs`.
- 1.47: Anleitung auf Stand. `help.js`: neue Rundgang-Schritte `cover`, `schnell`, `player`; neue Kapitel `zentrale`, `labor`; Mini-Rundgänge `zentrale`, `player`, `cover`, `labor`. Wer ein Feature baut, ergänzt Kapitel und Schritt gleich mit; `anleitung_aktuell_test.cjs` prüft Pflichtbegriffe, veraltete Aussagen und die „Optionen → …“-Pfade.
- 1.48: Schlaf-Timer im Player (`player.js`: `sleepSet`, Mond-Knopf `data-pl=sleep`, Ausblenden über neuen Regler `PlSound.fade` vor der Anzeige, „Nach diesem Titel“ fängt `ended` ab); Kopfzeilen-Knopf `#btn-export-wav` heißt „Export" und öffnet `ExportUI.open('master')` (direkter WAV-Weg bleibt über `__exportMix`). Neuer Test `schlaf_test.cjs`. Kopfleiste: neue Icons `fileDown` (📂 Laden), `folders` (🗂️ Projekte), `upload` (📤 Export); Export-Knopf schmal (`themes.css`).
- 1.49: Dockbar-Seitenreihenfolge links→rechts: Zentrale · Playleiste · Zusatzleiste. `tpdock.js`: `PANES=['zt','tp','tabs']`; `player.js`: `dkIds` Zentrale·Steuerung·Klang, `open()` springt auf die Steuerung; `homedock.js`: `setPanes` mit Zentrale zuerst. Tests (tpdock, layout3, zentrale) auf die neue Reihenfolge angepasst.
