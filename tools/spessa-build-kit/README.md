# SpessaSynth-Build-Kit für Sunshine@R DAW (SF3-Unterstützung)

Dieses Kit baut das SpessaSynth-Bundle neu – diesmal mit den echten Paketen
`fflate` und `stb-vorbis`. Danach kann die DAW **.sf3-SoundFonts** (komprimiert, Ogg Vorbis) laden.
Ohne das Kit funktioniert alles weiter, nur eben ohne SF3.

## Was du brauchst (einmalig, auf einem PC/Mac mit Internet)
- **Node.js** (Version 18 oder neuer): https://nodejs.org – „LTS“ herunterladen und installieren.
- Die Datei `spessasynth_core-master.zip` (hast du schon).
- Deine aktuelle `index_ueberarbeitet.html`.

## Ordner vorbereiten
1. Lege diesen Ordner `spessa-build-kit` neben deine `index_ueberarbeitet.html`.
2. Entpacke `spessasynth_core-master.zip` **in** den Ordner `spessa-build-kit`, sodass dort der Ordner
   `spessasynth_core-master` liegt (darin `src`, `package.json` …).

```
mein-projekt/
├─ index_ueberarbeitet.html
├─ assets/
└─ spessa-build-kit/
   ├─ build.mjs, inject.mjs, entry.ts, build.bat, build.sh …
   └─ spessasynth_core-master/      <- entpacktes ZIP
```

## Variante 1: ein Befehl
- **Windows:** Doppelklick auf `build.bat`, oder in der Eingabeaufforderung im Kit-Ordner:
  `build.bat ..\index_ueberarbeitet.html`
- **Mac/Linux:** im Terminal im Kit-Ordner: `bash build.sh ../index_ueberarbeitet.html`

Das Skript installiert `fflate` und `stb-vorbis`, baut das Bundle und setzt es in deine HTML ein.
Deine alte Datei bleibt als `index_ueberarbeitet.html.bak` erhalten.

## Variante 2: Schritt für Schritt
```
cd spessa-build-kit
npm install                              # holt fflate + stb-vorbis
npx --yes bun build.mjs                  # erzeugt out/spessa.bundle.js
node inject.mjs ../index_ueberarbeitet.html
```
Im Build-Log muss stehen: `stb-vorbis: echtes Paket (SF3 an)` und am Ende `SF3-Unterstützung: AN`.
Steht dort „Platzhalter (SF3 aus)“, wurde `stb-vorbis` nicht installiert (prüfe, ob `node_modules/stb-vorbis` existiert).

## Danach in der App
Neue HTML in die App kopieren (wie bisher). Im SoundFont-Dialog „📂 SoundFont laden (.sf2 / .sf3)“ wählen.
Eine .sf3 wird nur von der SpessaSynth-Engine abgespielt (Haken „SpessaSynth-Engine“ muss an sein);
der einfache Ersatz-Player kann kein SF3.

## Hinweise
- Die Dateigröße der HTML wächst durch den Vorbis-Decoder etwas (grob +100–300 KB).
- Lizenz: SpessaSynth steht unter Apache-2.0 (`LICENSE-SpessaSynth.txt`, ist auch in der HTML enthalten).
  `fflate` (MIT) und `stb-vorbis` haben eigene Lizenzen – bitte bei Weitergabe der App beachten.
- Dieses Kit wurde mit Platzhalter-Paketen getestet (Build, Einsetzen, Erkennung von „SF3 an/aus“ in der App).
  Das Dekodieren einer echten SF3-Datei konnte ich ohne Internet nicht testen. Falls es damit Probleme gibt:
  Meldung/Fehlertext schicken, dann passe ich es an.
- Fehler „Ordner 'spessasynth_core-master' fehlt“: ZIP-Inhalt liegt eine Ebene zu tief oder an falscher Stelle.
- Fehler bei `npx bun`: alternativ `npm install -g bun` und dann `bun build.mjs`.
