# Änderungsprotokoll · Sunshine@R DAW Studio
<!-- Pflege: Ganz oben einen neuen Abschnitt „## Version · Datum · Titel“ anlegen, darunter die Neuerungen als Stichpunkte.
     Der oberste Abschnitt wird (1) in die App eingebaut („Was ist neu“) und (2) bei GitHub als Release-Text veröffentlicht. -->

## 1.48 · 2026-11-21 · Schlaf-Timer und Export-Knopf
- Neu: **Schlaf-Timer im Player** – der **Mond** oben rechts in der Player-Kopfzeile. Wähle 15, 30, 45, 60 oder 90 Minuten oder **„Nach diesem Titel“**. In den letzten 20 Sekunden wird die Musik sanft leiser, dann hält der Player an. Eine kleine Zahl am Mond zeigt die Restminuten; nochmal antippen zum Ändern oder Ausschalten. Läuft auch bei gesperrtem Bildschirm.
- Neu: Der Knopf oben rechts in der DAW heißt jetzt **„Export“** und öffnet das Export-Fenster – dort wählst du **WAV, MP3 oder Opus** (und Bereich oder Stems). Der Mix ist schon vorgewählt. Dasselbe Fenster gibt es weiter im Menü.
- Besser: **Aufgeräumte Kopfleiste** – die Symbole sind jetzt eindeutig: **Laden** = Datei mit Pfeil, **Projekte** = Ordnerstapel, **Export** = Pfeil nach oben. Der Export-Knopf ist schmaler; auch bei 360 px passt alles in die Leiste.
- Besser: Rundgang und Handbuch beschreiben den neuen Export-Knopf und den Schlaf-Timer.

## 1.47 · 2026-11-21 · Anleitung auf dem neuesten Stand
- Besser: **Rundgang** – drei neue Schritte: **Cover & Tags**, **Schnellwahl** (Dockbar nach oben wischen) und der **Player**. Texte zu Menü, Optionen (jetzt sieben Kategorien) und Export (MP3) sind angepasst. Am großen Bildschirm entfällt die Schnellwahl von selbst, der Player wird dort über ☰ gezeigt.
- Neu im **Handbuch**: Kapitel **„Zentrale & Schnellwahl“** und **„Labor (Beta)“**. Dazu überarbeitet: Startseite (jetzt unter „Startseite & Projekte“), untere Leiste, Player (Dockbar mit drei Seiten, Listenfenster, eigener Ordner-Dialog in der Android-App), Export (MP3 statt „geht nicht“), Design & Effekte (Rand-Effekte mit Seiten, Voreinstellungen, Dockbar-Effekt, Leistung und Leistungs-Wächter), Feedback und Hilfe bei Problemen.
- Fix: Veraltete Aussagen im Handbuch entfernt (z. B. „MP3 kann die App nicht erzeugen“, „Ordner-Dialog folgt mit dem nächsten Update“, „Liste bleibt nur bis zum Schließen“, die alte Player-Seite in der DAW-Leiste). Die Optionen-Pfade im Text („Optionen → …“) stimmen jetzt mit den echten Kategorien überein.
- Neue Mini-Rundgänge zu „Zeig es mir“: Zentrale, Player, Cover und Labor.

## 1.46 · 2026-11-21 · Labor (Beta)
- Neu: **Labor (Beta)** unter Optionen – eine eigene Kategorie für neue Ideen zum Ausprobieren. Jede Idee ist **aus**, bis du sie einschaltest; dann ist die App wie gewohnt. Zu jeder Idee gibt es einen Knopf „Feedback zu dieser Idee“, und im Feedback steht automatisch, welche Labor-Ideen an waren.
- Neu: Im Labor steht schon der Platzhalter „Nativer Player (Android)“ als **geplant** – ein Player, der direkt in Android läuft. Er braucht später eine neue App-Version.
- Hinweis: Gefällt eine Idee, übernehmen wir sie fest oder bauen sie aus; sonst verschwindet sie wieder. Ohne eingeschaltete Idee ändert sich nichts.

## 1.45 · 2026-11-21 · Schnellwahl und aufgeräumte Dockbars
- Neu: **Schnellwahl** – wische die Dockbar (in DAW, Player und Startseite) **nach oben**, dann klappt die Zentrale mit sechs großen Tasten auf: Startseite, DAW, Player, Feedback, Optionen, Anleitung. Ein kleiner Strich über der Leiste zeigt es an (antippen geht auch). Nach unten wischen, neben das Fenster tippen, Esc oder „Zurück“ schließen sie wieder.
- Besser: **Aufgeräumte Dockbars** – die Player-Steuerung (Zufall, Zurück, Play, Weiter, Wiederholen) gibt es nur noch im Player, die DAW-Steuerung nur noch in der DAW. Die DAW-Leiste hat jetzt drei Seiten (Transport, Bereiche, Zentrale), die Player-Dockbar ebenfalls (Steuerung, Klang, Zentrale). Die Startseite zeigt weiter die Leiste dessen, was gerade läuft.
- Neu: **„by Sunshine@R“** steht jetzt auf der Startseite unter dem Logo und in den Optionen beim Namen der App.
- Hinweis: Das ist nur eine Änderung der Anordnung – alle Funktionen sind weiterhin da, nur eben dort, wo sie hingehören.

## 1.44 · 2026-11-21 · MP3-Export
- Neu: **MP3-Export** – Menü → Export → Format: **MP3 128, 192 oder 320 kbit/s**. Geht für den Mix, für Bereiche und für Einzelstems (dann liegen MP3-Dateien in der ZIP). Titel, Künstler, Album, Genre, Jahr, BPM, Tonart und Cover kommen als ID3-Tag in die Datei (Schalter „Tags & Cover einbetten“). Der Encoder steckt in der App, du brauchst kein Netz und keine Zusatzdatei.
- Besser: Das Export-Fenster zeigt beim MP3-Format die ungefähre Größe pro Minute; „Abbrechen“ wirkt jetzt auch mitten im Kodieren.
- Hinweis: MP3 ist verlustbehaftet – zum Weiterbearbeiten besser WAV nehmen. Der Encoder ist lamejs (LGPL), unverändert eingebaut und wird erst beim ersten MP3-Export gestartet.

## 1.43 · 2026-11-21 · Titel aus dem Player als Spur
- Neu: Im **Player** hat jede Zeile ein Symbol (Pfeil neben dem X): **„Als Spur in die DAW laden“**. Der Titel landet als neue Audio-Spur im Projekt, ohne Import-Dialog und ohne den Titel erst abzuspielen. Das Laden lässt sich in der DAW mit „Zurück“ rückgängig machen.
- Besser: **Speicherschutz** – lange Titel brauchen als Spur viel Arbeitsspeicher (ein 5-Minuten-Titel etwa 110 MB). Wird der Speicher knapp, fragt die App vorher nach; ist er voll, lädt sie den Titel nicht und sagt warum, statt abzustürzen.
- Besser: Anleitung → Player erklärt die neue Funktion.

## 1.42 · 2026-11-21 · Rand-Effekte wirklich überall nach Seiten
- Fix: Die gewählten **Seiten der Rand-Effekte** (Optionen → Effekte → Seiten der Fenster) gelten jetzt **überall**: auch an der Kopfleiste, an den unteren Leisten (DAW, Player, Startseite) und an der Player-Kopfzeile. Vorher behielten diese Leisten den Effekt rundherum.
- Besser: Mehr Blöcke tragen den Rand-Effekt und folgen den gewählten Seiten: die **Werkzeuge-Karte** und das große Werkzeug-Fenster in der DAW, „Letzte Sitzung fortsetzen“ auf der Startseite sowie im Player das Klang-Fenster, das Listenfenster mit „+ Dateien“ und die Dockbar.
- Fix: **Alle Dialoge** bekommen den Fenster-Rand (bisher nur einige, zum Beispiel Optionen): Projektbibliothek, Spuren-Ansicht, Import-Dialoge, Muster-Generator, SoundFont-Auswahl und die Sheets der Startseite. Bei „Oben“ leuchten sie nur oben.
- Hinweis: Der **Dockbar-Effekt** (Optionen → Effekte & Anzeige, der Ring ums Cover und um die Leisten) ist eine eigene Einstellung und läuft weiter rundherum. Wenn er an ist, ersetzt er an den Leisten den Rand-Effekt.

## 1.41 · 2026-11-21 · Dockbars einheitlich, Rand-Effekte nach Seiten
- Besser: Die Dockbars (DAW, Player, Startseite) **rasten nach dem Wischen immer auf einer ganzen Seite** ein. Bleibt sie einmal dazwischen stehen, schnappt sie nach einem Moment von selbst auf die nächste Seite.
- Besser: Die **DAW-Leiste ist jetzt gebaut wie die Dockbars im Player und auf der Startseite**: Punkte mittig unten (antippbar) statt Pfeile, gleiche Seitenbreite und gleiche Höhe. Die Transport-Seite hat – wie im Player – oben die Positionsleiste und unten die Tasten in derselben Reihenfolge: Loop · Zum Anfang · Play · Stopp · Klick.
- Neu: Optionen → Effekte → **Seiten der Fenster**: Der Rand-Effekt sitzt bei Fenstern und Karten jetzt nur noch **unten** (Standard); Oben, Rechts, Links lassen sich dazuschalten. Alle vier gewählt = wie bisher. Kopfleiste und untere Leiste behalten den vollen Rand.
- Besser: **Player-Kopfzeile** – „Player“ sitzt mittig und die Leiste folgt dem gewählten Design (Aurora, Neon, Studio, Liquid, Klassisch). „+ Dateien“ ist aus der Kopfzeile in ein eigenes Listenfenster über der Playlist gewandert (mit Titelzahl und den Aktionen Zuletzt · Ordner wählen · Liste leeren).

## 1.40 · 2026-11-21 · Eine Dockbar als Zentrale
- Neu: **Zentrale** – die letzte Seite jeder Dockbar (DAW, Player, Startseite) mit sechs großen Tasten: Startseite · DAW · Player · Feedback · Optionen · Anleitung. Von überall kommst du so überall hin; die Taste der aktuellen Ansicht ist markiert.
- Neu: Die Dockbar der **Startseite** ist jetzt wie die der DAW wischbar: Playbar (nur wenn etwas läuft) · Klang-Voreinstellungen (Techno, Bass …) · Steuerung der anderen Seite (DAW oder Player) · Zentrale. Läuft nichts, bleibt sie mit Klang und Zentrale da (Start auf der Zentrale).
- Neu: Die Dockbar im **Player** hat jetzt vier Seiten: Player-Playbar · Klang · DAW-Playbar · Zentrale. Die DAW-Leiste hat als vierte Seite die Zentrale (Pfeile und Punkte wie bisher).
- Neu: Optionen → Design & Aussehen → **Beim Start öffnen**: Startseite, DAW oder Player. Der alte Schalter „Beim Start anzeigen“ auf der Startseite funktioniert weiter.
- Aufgeräumt: Wo die Zentrale erreichbar ist, entfallen die alten Knöpfe – „Zurück“, Feedback und Optionen oben im Player; „Projekt“, Feedback, Anleitung, Optionen und Player auf der Startseite; Startseite, Player, Feedback und Optionen im ☰-Menü der DAW (am Handy mit Dockbar). Am großen Bildschirm ohne Dockbar bleibt alles wie bisher.
- Besser: Die Player-Punkte unter der Dockbar sind größer und lassen sich antippen. Gewischt wird auf den Tasten oder der freien Fläche; wer auf der Zeitleiste wischt, verschiebt die Position.
- Besser: Der Hilfe-Rundgang zeigt am Handy die Zentrale statt des ☰-Menüs.

## 1.39 · 2026-11-21 · Gleiche Breiten, feste Dockbar, ruhigerer Player
- Besser: Alle Fenster der DAW (Kopfzeile, Spuren, Werkzeuge) haben jetzt dieselbe Breite und denselben Seitenabstand. Auch Player-Leiste und Dockbars von DAW, Player und Startseite schließen mit demselben Rand ab.
- Besser: Die Dockbar sitzt fest am unteren Bildschirmrand, in der DAW, im Player und auf der Startseite, ohne Lücke darunter. Sie wird auch beim Scrollen nicht mehr mitgenommen.
- Besser: Hinter Player und Startseite scrollt die DAW-Seite nicht mehr mit. Gescrollt wird nur dort, wo der Inhalt wirklich über den Bildschirm hinausgeht.
- Besser: Auf schmalen Handys (360 px) werden in der DAW-Kopfzeile „Master WAV“ und „TAP“ nicht mehr abgeschnitten, und in der Player-Kopfzeile ist „Dateien“ wieder vollständig sichtbar.
- Besser (Player-Hänger): Die Titelliste im Player wird beim Einlesen großer Ordner nicht mehr bei jedem Schritt komplett neu gebaut, sondern nur an den geänderten Stellen aktualisiert. Das Einlesen pausiert, solange du den Player bedienst. Ob das die Hänger auf deinem Handy ganz behebt, kann ich nicht prüfen, weil ich nur in einem Server-Browser teste.
- Neu: Leistungs-Wächter. Läuft etwas Aufwendiges (Effekte, Cover-Leuchten) und die Anzeige ruckelt, schaltet die App die Effekte von selbst eine Stufe sparsamer und sagt es dir. Unter Optionen → Effekte & Anzeige → „Leistung“ kannst du zwischen „Automatisch“, „Volle Qualität“ und „Sparsam“ wählen.
- Hinweis: Die gemeinsame wischbare Dockbar mit Navigation, einer „Zentrale“-Seite (Feedback, Optionen, Wechsel zwischen DAW, Player und Startseite) und der Wahl der Startansicht folgt in 1.40; erst dann entfallen die alten Knöpfe.

## 1.38 · 2026-11-20 · Effekte für Dockbars, Ränder und Cover
- Neu: Eigener Effekt für die Dockbars (DAW, Player, Startseite). Es ist derselbe Musik-Effekt wie am Cover, aber um die ganze Leiste, und er wird getrennt vom Cover eingestellt: Optionen → Effekte & Anzeige → „Dockbar-Effekt“. Du kannst unter 14 Effekten wählen und Stärke, Bewegung, Farbe, Größe, Helligkeit, Transparenz, Tempo und Linienstärke einstellen. Mit Häkchen bestimmst du, an welchen Leisten er läuft. Standard: aus.
- Neu: Rand-Effekte haben jetzt Voreinstellungen (Ruhig, Club, Aurora, Neon-Linie, Regenbogen, Im Takt, Lauflicht, Still), vier neue Stile (Doppelstrahl, Regenbogen, Lauflinien, Rahmen) und die Bewegung „Animiert“, „Zur Musik“ oder „Starr“. Dazu kommt ein Tempo-Regler. „Zur Musik“ ruht ohne Musik und folgt dem Bass, wenn Musik läuft.
- Neu: Die Rand-Effekte wirken jetzt auch in Startseite (Karten, Knöpfe, Hinweise) und Player (Kopfzeile, Klang-Bereich), nicht nur in der DAW. Unter „Wo anzeigen“ kannst du DAW, Player und Startseite einzeln abschalten. Hat die DAW-Leiste einen eigenen Dock-Effekt, weicht ihr Rand-Effekt, damit nichts doppelt leuchtet.
- Neu: Die Cover-Effekte haben vier weitere Einstellungen: Tempo, Linienstärke, Farbe (Design, Akzent, Zweitfarbe, Regenbogen) und Bewegung (Zur Musik, Animiert, Starr).
- Besser: Die Rand-Animationen laufen in Stufen von etwa 24 Bildern pro Sekunde statt bei jedem Bild neu zu zeichnen. Das soll Rechenzeit sparen. In meinem Server-Test (ohne echte Grafikkarte) war der Unterschied nicht eindeutig messbar, ob es auf deinem Handy ruhiger läuft, musst du beurteilen. Neu ist: Es wird immer nur die Ansicht animiert, die gerade sichtbar ist (Startseite, Player oder DAW).
- Hinweis: Alle neuen Effekte sind standardmäßig aus. Wer sie nicht einschaltet, sieht dasselbe wie in 1.37. Wie flüssig es auf deinem Handy läuft, kann ich nicht messen: Ich teste nur in einem Server-Browser. Wenn etwas ruckelt, sag mir bitte, welcher Effekt und welcher Modus.

## 1.37 · 2026-11-20 · Design und Icons überall gleich
- Besser: Die Einstellung „Rundung“ (Eckig / Normal / Extra rund) gilt jetzt durchgängig. Bisher hat sie nur die Standard-Elemente der DAW verändert. Player, Startseite, Dockbars, Hilfe, Feedback, „Was ist neu“ und die Cover hatten feste Rundungen im Code. Jetzt folgen sie alle derselben Einstellung. „Eckig“ macht auch die Pillen, Karten, Tasten und runden Play-Knöpfe eckig, „Extra rund“ macht sie weicher.
- Besser: Im Modus „Normal“ sieht alles aus wie bisher. Geprüft mit einem Pixelvergleich von 14 Ansichten in allen 5 Designs gegen 1.36.
- Besser: Die Linien-Icons wirken jetzt auch an den Stellen, die vorher als Emoji stehen blieben: 👀 in „Bald in der App“, die Titel-Symbole der Großfenster (Editor, Drums, Vocal, Mixer), Feedback-Arten und -Knöpfe, „Optionen“-Titel. Pfeile und Häkchen mitten im Fließtext bleiben bewusst Zeichen.
- Hinweis: Fest bleiben absichtlich Schalter, Farbpunkte, Pegel-Balken und die Randlinie der Kopfleiste (hat eine eigene Eckig-Regel). Wo dir noch etwas rund auffällt, sag mir die Ansicht, dann ziehe ich es nach.

## 1.36 · 2026-11-20 · Feedback im Player und ruhigere Effekt-Vorschau
- Besser: Feedback ist jetzt auch im Player sichtbar. Es lag bisher eine Ebene unter dem Player, deshalb ging aus den Optionen im Player scheinbar nichts auf. Es liegt nun über Player und Optionen.
- Neu: Im Player gibt es oben einen Feedback-Knopf. In „Betrifft“ gibt es die neue Kategorie „Player & Klang“; wer Feedback aus dem Player öffnet, bekommt sie automatisch. Der Bericht enthält dann nur technische Angaben: Listenlänge, Format und Größe des aktuellen Titels, wie er geladen wurde (direkt oder ganz), Wiedergabestatus, Klangprofil und der letzte Wiedergabefehler. Keine Titel, keine Dateinamen.
- Besser: Beim Umstellen von Effekten und beim Ziehen der Design-Regler (Transparenz, Unschärfe …) wird das Optionsfenster nicht mehr halb durchsichtig. Dabei liefen Startseite und Optionen übereinander, wie auf deinen Bildern. Jetzt bleibt nur die bediente Zeile sichtbar, der Rest blendet aus und du siehst die echte Oberfläche ungestört.
- Hinweis: Die Effekt-Animationen selbst (Glühen, Aurora …) sind unverändert. Ob das Umschalten auf deinem Handy jetzt rund wirkt, kann ich nicht messen: Ich teste nur in einem Server-Browser, nicht auf einem echten Gerät. Wenn es noch hängt, sag mir genau wann (Rand-Effekt, Flächen-Effekt oder Regler), dann gehe ich gezielt dran.

## 1.35 · 2026-11-20 · Player: lange Titel laden nicht mehr ewig
- Besser: Große Titel (200 MB und mehr) aus dem Ordner-Dialog der App starten jetzt fast sofort. Mit der neuen App-Version kopiert die App die Datei selbst in den Zwischenspeicher und spielt direkt davon ab, es läuft nichts mehr stückweise über die App-Brücke und nichts liegt komplett im Arbeitsspeicher. Spulen geht sofort. Es bleiben höchstens zwei Titel im Zwischenspeicher, beim nächsten Start wird er geleert.
- Besser: Auch ohne die neue App-Version (alter Weg) ist das Laden schneller und die Bedienung bleibt flüssiger: Das Umwandeln blockiert die Oberfläche nicht mehr, das nächste Stück wird schon angefragt, der Player zeigt „Lädt … x %“, und wer einen anderen Titel antippt, bricht das Laden des vorigen ab.
- Besser: Der Hintergrund-Scan für Tags und Längen ruht, solange ein Titel lädt, und läuft beim Abspielen nur gemächlich weiter.
- Hinweis: Für den direkten Weg wird die neue APK gebraucht (Build im GitHub-Lauf, dann installieren). Bis dahin nutzt die App automatisch den verbesserten alten Weg; klappt der direkte Weg einmal nicht, fällt sie von selbst darauf zurück. Dateien, die du über „Dateien hinzufügen“ wählst, wurden schon vorher direkt abgespielt.

## 1.34 · 2026-11-20 · Aufräumen, Teil 4: Ebenen an einer Stelle
- Besser: Alle Fenster, Leisten und Meldungen, die übereinander liegen (Großfenster, Dialoge, Player, Hilfe, Feedback, Intro …), haben ihre Reihenfolge jetzt als benannte Liste an EINER Stelle statt als 23 verstreute Zahlen im Code. Neue Fenster lassen sich damit sicher einordnen.
- Besser: Das Aussehen ist unverändert – geprüft mit einem Pixelvergleich von 14 Ansichten in allen fünf Designs gegen die Vorversion (70 von 70 identisch).
- Hinweis: Die 227 `!important` im Stil-Code habe ich bewusst nicht angefasst. Sie sind fast alle gewollt (Designs überschreiben Tailwind-Klassen, versteckte Fenster, Handy-Leiste); das Entfernen brächte nur Risiko. Es ist im Handbuch für Entwickler (README) beschrieben.

## 1.33 · 2026-11-20 · Aufräumen, Teil 3: schlankerer Start
- Besser: Die ZIP-Bibliothek (für Stem-Import, Export und Datensicherung) wird nicht mehr beim Start geladen, sondern erst bei der ersten Nutzung – und sicherheitshalber einmal im Leerlauf kurz nach dem Start, damit der erste Import nicht warten muss. Der Start ist dadurch spürbar, aber nicht dramatisch schneller (im Test ca. 10 %).
- Besser: Ist die lokale Kopie der Bibliothek einmal nicht erreichbar, versucht die App es über das Netz und meldet sonst verständlich, dass das ZIP-Modul fehlt. Ein späterer Versuch ist jederzeit möglich.
- Hinweis: Sichtbar ändert sich nichts. Import, Export und Sicherung funktionieren wie bisher, Projekte und Einstellungen bleiben unverändert.

## 1.32 · 2026-11-20 · Aufräumen, Teil 2: Ruhe im Leerlauf
- Besser: Die App ist im Leerlauf deutlich ruhiger. Die Oberfläche zeichnet nicht mehr ununterbrochen 60-mal pro Sekunde, sondern nur noch, wenn wirklich etwas passiert (Wiedergabe, Aufnahme, Mixer offen oder eine Berührung). Alle wiederkehrenden Kleinaufgaben (Anzeige-Abgleich, Autosave-Wächter, Startseite, Player, Selbstcheck …) laufen über einen gemeinsamen Takt und schlafen im Hintergrund. Das spart Akku und hält das Gerät kühler.
- Besser: Die Optionsmenü-Abschnitte werden von einem gemeinsamen Beobachter bestückt statt von elf einzelnen – weniger Arbeit beim Öffnen und im Betrieb.
- Besser: Der Cover-Effekt (Leuchten/Ring) lief nach dem Stoppen der Musik weiter im Hintergrund; jetzt klingt er aus und hält an.
- Hinweis: Sichtbar ändert sich nichts außer einem etwas sparsameren Verhalten. Die Anzeige der Wiedergabezeit im Transport wird im Leerlauf in einem 0,5-Sekunden-Raster nachgeführt; beim Abspielen bleibt alles flüssig wie bisher. Projekte, Einstellungen und Autosave bleiben unverändert.

## 1.31 · 2026-11-20 · Aufräumen, Teil 1: gemeinsame Bausteine
- Besser: Aufgeräumt unter der Haube – Hilfsfunktionen, das Speichern der Einstellungen und alle Datenbank-Zugriffe (Projekte, Autosave, SoundFonts, Player, Startseite) laufen jetzt über je einen gemeinsamen Baustein statt über viele einzelne Kopien. Etwas kleiner, weniger Fehlerquellen, leichter zu erweitern.
- Besser: Ein ungenutzter Doppelgänger des Design-Auswahl-Codes ist entfernt; die Seite ist dadurch etwas kleiner.
- Hinweis: Sichtbar ändert sich nichts. Deine Projekte, Einstellungen, Autosave-Stände und SoundFonts bleiben unverändert und werden wie bisher gefunden – Namen und Aufbau der Speicher sind gleich geblieben.

## 1.30 · 2026-11-20 · Neue Startseite, niedrigere Dockbar, Klang in der Player-Dockbar
- Neu: Die Startseite passt jetzt ohne Scrollen auf den Bildschirm – sie verdichtet sich bei Bedarf selbst (Logo, Abstände, Kacheln). Cover und Equalizer sitzen weiter unten direkt über der Dockbar, der Titel steht darunter.
- Neu: Die Startseite zeigt nur die **letzten 3 Projekte**. „Alle …“ öffnet ein großes, schwebendes Fenster mit Abstand zur Startseite: alle Projekte, Suche und Sortierung. Wischen am Griff, ✕ oder Zurück schließt es.
- Neu: Die Startseite folgt dem gewählten Design (Aurora, Studio, Neon, Liquid, Klassik): Karten, Knöpfe und der große „Neues Projekt“-Knopf haben je Design Form, Farbe und Leuchten wie die untere Leiste. Hinweiskarten sind einzeilig und kompakter.
- Neu: Im Player ist die **Klang-Vorauswahl** auf eine zweite Seite der Dockbar gewandert (nach links wischen oder Punkte antippen). Nur im Player – in der DAW und auf der Startseite bleibt die Leiste wie sie ist.
- Besser: Die **Dockbar ist niedriger** (86 statt bis zu rund 120 px) und in Player, Startseite und DAW-Leiste gleich hoch. Der Titel der Startseiten-Dockbar steht unter dem Cover; die Player-Seite der DAW-Leiste zeigt „Player öffnen“, solange nichts geladen ist.
- Besser: Im Player ist der Lautstärke-Regler entfernt (die Lautstärke bleibt wie zuletzt eingestellt; am Handy regelst du sie mit den Lautstärketasten). Die Klang-Karte ist dadurch kürzer.
- Besser: Scrollbalken sind auch auf der Startseite und in der großen Projektansicht ausgeblendet.
- Hinweis: Nur `www/index.html`, `CHANGELOG.md` und `VORSCHAU.md` ändern sich – Live-Update reicht, keine neue APK nötig.

## 1.29 · 2026-11-20 · Eine Leiste für alles: Player in der DAW-Leiste, feste Player-Oberseite, ruhigere Oberfläche
- Neu: Die untere Leiste der DAW hat eine dritte Seite mit der Player-Bedienung (Zufall, Zurück, Play/Pause, Weiter, Wiederholen, Zeitleiste) – wie in der Player-Dockbar. Wischen nach links/rechts wechselt zwischen Transport, Spuren (Editor, Drums, Vocal, Mixer …) und Player. Spielt der Player, springt die Leiste von selbst zur Player-Seite; startet die DAW, zurück zum Transport.
- Neu: Die DAW-Tasten (Loop, Start, Play/Pause, Stopp, Metronom) sehen jetzt genauso aus wie die Player-Tasten – gleiche Symbole, gleiche Größen.
- Neu: Im Player ist der obere Teil mit Cover und Equalizer samt Titel fest und scrollt nicht mehr mit; er ist etwas kleiner und weiter oben. Der Rest darunter (Klang, Liste) scrollt weiter.
- Neu: Im Player gibt es oben einen Optionen-Knopf (Zahnrad). Die Optionen öffnen sich über dem Player.
- Neu: Optionen → Untere Leiste → „Tasten passend zum Leistenstil“ (standardmäßig aus): Bei Glas, Flach, Leuchtend und Dezent bekommen die Tasten in Player, Startseite und DAW-Leiste dazu passende Formen und Farben.
- Neu: Optionen → „Scrollbalken anzeigen“ (standardmäßig aus): Scrollbalken sind nun fast überall ausgeblendet; gescrollt wird wie gewohnt per Wischen oder Mausrad.
- Besser: Leuchtend-Leiste ist jetzt deckend, sodass dahinterliegende Karten nicht mehr durchscheinen. Die Mini-Leiste des Players ist ausgeblendet, solange die DAW-Leiste die Player-Seite zeigt.
- Hinweis: Die DAW-Leiste ist durch die größeren Tasten etwa 30 px höher als vorher. Nur `www/index.html`, `CHANGELOG.md` und `VORSCHAU.md` ändern sich – Live-Update reicht, keine neue APK nötig.

## 1.28 · 2026-11-19 · Android: eigener Ordner-Dialog und Zeit in der Benachrichtigung
- Neu: Android-App: Der Player hat jetzt einen eigenen Ordner-Dialog. Die Freigabe bleibt auch nach einem Neustart erhalten – beim Start sind Ordner, Liste, letzter Titel und Position von selbst wieder da, ohne dass du den Ordner erneut wählen musst. Unterordner werden mitgelesen.
- Neu: Der Verlauf „Zuletzt“ öffnet Ordner in der Android-App direkt, ohne Dialog.
- Neu: Die Musik-Benachrichtigung zeigt die laufende Zeit (vom System gezählt); in der Pause steht dort „1:23 / 3:45“. Zurück/Weiter und die Zeitleiste auf dem Sperrbildschirm gab es schon – sie funktionieren jetzt mit Titeln aus dem Ordner.
- Besser: Tags (Titel, Künstler, Album, Cover) werden bei Ordnern in der App nur aus dem Dateianfang gelesen – schnell, auch bei vielen großen Dateien. Die Länge steht, sobald ein Titel das erste Mal läuft.
- Hinweis: Das braucht **einmalig eine neue APK**: `scripts/patch-android.cjs` hat sich geändert (zusammen mit `www/index.html`, `CHANGELOG.md` und `VORSCHAU.md` hochladen). Mit der alten App läuft die neue Oberfläche ganz normal weiter und nutzt wie bisher den Datei-Dialog. Ein animierter Mini-Equalizer in der Benachrichtigung ist nicht dabei: Android kann Benachrichtigungen nicht flüssig animieren.

## 1.27 · 2026-11-19 · Startbildschirm: Dockbar für Player und DAW, Cover mit Equalizer
- Neu: Auf dem Startbildschirm erscheint unten die gleiche Dockbar wie im Player und in der DAW, sobald etwas läuft. Sie steuert genau das, was gerade spielt: beim Player Zufall, Zurück, Play/Pause, Weiter und Wiederholen – bei der DAW Loop, Anfang, Play/Pause, Stopp und Metronom. Die Zeitleiste lässt sich verschieben, ein Tipp auf den Titel öffnet den Player bzw. führt zurück ins Projekt, mit ✕ blendest du die Leiste aus.
- Neu: Das Cover des gerade laufenden Titels (aus dem Player oder dem DAW-Projekt, sonst ein passend erzeugtes) sitzt jetzt mit Effekt und Equalizer verschmolzen über der Dockbar. Die alte Hintergrund-Animation ist entfernt.
- Besser: Beim Öffnen der Startseite stoppt die DAW nicht mehr – die Musik läuft weiter und lässt sich dort steuern. Startet der Player, pausiert die DAW (und umgekehrt); die Leiste wechselt von selbst.
- Besser: Der Leistenstil aus den Optionen (Glas, Flach, Leuchtend, Dezent) gilt jetzt auch für die Dockbar der Startseite – alle drei Leisten sehen in jedem Design gleich aus.
- Besser: Der Equalizer im Player nimmt sich seine Anzeige jedes Mal beim Öffnen zurück, auch wenn die Startseite ihn zwischenzeitlich genutzt hat.
- Hinweis: Nur `www/index.html`, `CHANGELOG.md` und `VORSCHAU.md` ändern sich gegenüber 1.26 – das Live-Update reicht. Die Android-Benachrichtigung mit Zurück/Weiter und der eigene Ordner-Dialog folgen in 1.28 (neue App nötig).

## 1.26 · 2026-11-19 · Player: Dockbar, Cover mit Equalizer, letzter Stand & Ordner-Verlauf
- Neu: Der Player hat unten eine Dockbar im Stil der unteren Leiste der DAW: Zeitleiste, Zufall, Zurück, Play/Pause, Weiter und Wiederholen. Sie passt sich dem gewählten Design an (Aurora, Studio, Neon, Liquid, Klassik) und ist in Rundung und Farbe identisch mit der Leiste der DAW.
- Neu: Der Equalizer sitzt jetzt oben und verschmilzt mit dem Cover samt Effekt – die Balken wachsen hinter und unter dem Cover heraus. Klang-Auswahl und Titelliste rücken nach oben.
- Neu: Leistenstile unter Optionen → Untere Leiste: „Wie das Design“, „Glas“, „Flach“, „Leuchtend“ und „Dezent“ – wirken auf die DAW-Leiste und die Dockbar des Players.
- Neu: Der Player merkt sich den letzten Stand: Liste, zuletzt gehörter Titel (mit Tags und Cover) und Position. Nach dem Neustart ist alles sofort wieder da; ein Tipp verbindet den Ordner erneut und es geht an derselben Stelle weiter. Im Desktop-Browser merkt sich der Player den Ordner selbst und verbindet ihn ohne erneute Auswahl (der Browser fragt eventuell einmal nach der Freigabe).
- Neu: „Zuletzt“ in der Player-Liste zeigt die letzten 8 Ordner zum erneuten Öffnen.
- Besser: „Bald in der App“ bleibt nicht mehr auf alten Texten stehen. Die Datei im Repo gilt nur, wenn sie eine neuere Version nennt als die installierte App; sonst zeigt die App den beim Bauen eingebauten Text. Die Vorschau ist jetzt gegliedert in „Kommt“, „Zum Testen“ und „Idee“.
- Hinweis: Nur `www/index.html` und `CHANGELOG.md` ändern sich gegenüber 1.25 – das Live-Update reicht. Auf Android bleibt der Ordner nach dem Neustart nicht von selbst verbunden (Grenze des Browser-Dialogs); der native Ordner-Dialog folgt mit einer späteren App-Version.

## 1.25 · 2026-11-19 · Player: Klang-Voreinstellungen, Equalizer, Cover, Tags & Ordner
- Neu: Klang-Voreinstellungen im Player – Original, Mehr Bass, Techno, Klassik, Pop, Rock, Stimme, Hip-Hop, Weich und „Eigen“ mit fünf Reglern (Tiefbass, Bass, Mitten, Höhen, Brillanz). Ein Schutz-Limiter verhindert Übersteuern.
- Neu: Animierter Equalizer im Player. Jede Voreinstellung hat ihre eigene Darstellung (dicke Bass-Balken, LED-Segmente für Techno, weiche Wellen für Klassik, Punkte für Pop, Zacken für Rock, gespiegelt für Stimme, Blöcke für Hip-Hop, Aura für Weich) samt Kurve des Klangreglers. Farben, Rundung und Leuchten folgen dem gewählten Design; ein- und ausblendbar (im Player und unter Optionen → Player & Hintergrund).
- Neu: Cover im Player mit demselben Rahmen und denselben Musik-Effekten wie in der DAW. Das Bild kommt aus der Datei; fehlt es, entsteht ein passendes Cover aus Titel und Künstler.
- Neu: Tags aus den Audiodateien (Titel, Künstler, Album, Genre, Jahr, Titelnummer, Cover) – MP3, M4A, FLAC, OGG/Opus und WAV. Anzeige in Liste, Titelkarte, Mini-Leiste, Sperrbildschirm-Steuerung des Systems und Benachrichtigung.
- Neu: Button „Ordner“ im Player. Dateien werden direkt vom Gerät abgespielt, ohne sie erst in die App zu laden (Desktop-Browser: echter Ordner-Dialog mit Unterordnern; Android: Dateiauswahl, ein eigener Ordner-Dialog folgt mit dem nächsten App-Update).
- Besser: Die Mini-Leiste zeigt beim Abspielen einen kleinen Equalizer und den Künstler.
- Hinweis: Nur `www/index.html` und `CHANGELOG.md` ändern sich gegenüber 1.24 – das Live-Update reicht. Tasten Zurück/Weiter, Zeitanzeige und Mini-Equalizer in der Benachrichtigung selbst folgen in 1.26 (neue App nötig).

## 1.24 · 2026-11-19 · Cover-Effekte, Leiste im Design-Stil & Fensterbreiten
- Neu: Fünf weitere Rand-Effekte fürs Cover: Flackerlinien (Linien blitzen im Takt), Lauflinien (Striche laufen um das Bild), Blur-Rand (weicher Lichtsaum, der mit dem Bass atmet), Lichtkranz (wandernde Lichtflecke) und Aura (weiche Schichten, die nach außen schwingen). Insgesamt 14 Effekte zur Auswahl.
- Neu: Regler für Größe des Effekts, Helligkeit und Transparenz (Optionen → Design & Aussehen → Cover & Tags), mit Live-Vorschau und „Zurücksetzen“.
- Neu: „Neues Projekt“ zeigt Cover & Tags jetzt direkt unter dem Projektnamen, aufgeklappt – Bild wählen oder aus Titel und Künstler erstellen gleich beim Anlegen.
- Besser: Die untere Leiste (Transport · Spuren · Editor · Drums · Vocal · Mixer) passt sich dem gewählten Design an: Rand, Rundung, Glühen, Glas bzw. Metall-Look und Akzentfarbe von Aurora, Studio, Neon, Liquid und Klassik.
- Besser: Die Großfenster Vocal und Mixer füllen jetzt die ganze Breite (vorher blieb rechts eine Lücke); Spuren, Editor und Drums wurden mitgeprüft.
- Hinweis: Nur `www/index.html` und `CHANGELOG.md` ändern sich gegenüber 1.23 – das Live-Update reicht.

## 1.23 · 2026-11-19 · Transport in der unteren Leiste
- Neu: Am Handy liegen Play, Stopp, Loop und Klick jetzt in der unteren Leiste. Mit einem Wisch nach links (oder dem kleinen Pfeil) kommst du zu Spuren · Editor · Drums · Vocal · Mixer, mit einem Wisch zurück wieder zum Transport. Läuft die Musik, leuchtet der Pfeil auf der Bereichs-Seite.
- Besser: Oben fällt die Transport-Zeile weg – Zeitanzeige, Werkzeugleiste und alle Spuren rutschen nach oben, und das Cover bekommt mehr Platz (größere Stufen für klein / mittel / groß).
- Neu: In den Optionen (Design & Aussehen → Untere Leiste) lässt sich das abschalten; dann bleibt der Transport oben wie bisher. In Querformat und auf größeren Bildschirmen ändert sich nichts.
- Besser: Das Cover-Layout rechnete bei manchen Anordnungen im Leerlauf ständig neu (unnötige Last) – behoben.
- Hinweis: Nur `www/index.html` und `CHANGELOG.md` ändern sich gegenüber 1.22 – das Live-Update reicht.

## 1.22 · 2026-11-19 · Cover: Platz, Randeffekte & Design
- Besser: Das Cover sitzt jetzt passend in Hoch- und Querformat (oben rechts, ohne Knöpfe oder Texte zu überdecken). Die Größe passt sich dem Gerät an und lässt sich in den Optionen auf klein / mittel / groß stellen.
- Neu: Neun Randeffekte zur Auswahl (Optionen → Design & Aussehen → Cover & Tags): Pegel-Ring, Punkte, Welle, Puls, Lauflicht, Rahmen, Leuchten, Ring + Leuchten und Aus – mit Live-Vorschau und Stärke (sanft / normal / kräftig). Das Bild bleibt immer frei.
- Neu: Das Cover-Symbol folgt dem gewählten Design: Rahmen, Rundung, Leuchten und Effektfarben passen zu Aurora, Studio, Neon, Liquid und Klassik sowie zur Akzentfarbe; auch erzeugte Cover und der Platzhalter nutzen die Designfarben.
- Hinweis: Nur `www/index.html` und `CHANGELOG.md` ändern sich gegenüber 1.21 – das Live-Update reicht.

## 1.21 · 2026-11-19 · Cover & Tags
- Neu: Cover und Tags pro Projekt. Beim Anlegen (und später in den Projekt-Einstellungen) wählst du ein eigenes Bild oder lässt ein Cover aus Projektname und Künstler/Produzent erstellen – vier Stile, „Neu mischen“ für neue Varianten. Dazu Künstler/Produzent, Genre (mit Vorschlägen), Jahr, Album, Komponist, Copyright und Kommentar.
- Neu: Das Cover steht oben rechts im Kopfbereich der DAW (Antippen = bearbeiten), in der Projektliste und in der Android-Benachrichtigung. Rund um das Bild laufen Balken im Takt der Musik oder es leuchtet mit dem Bass – das Bild selbst bleibt frei. In den Optionen (Design & Aussehen → Cover & Tags) wählbar: Ring, Leuchten, beides, aus, Cover ausblenden.
- Neu: Beim Export werden Tags und Cover eingebettet – WAV (16/24 Bit) und Opus/OGG mit Titel, Künstler, Album, Genre, Jahr, Komponist, Copyright, Kommentar, BPM, Tonart und Bild; Stems-ZIP mit getaggten Dateien plus cover.jpg; MIDI mit Titel, Künstler und Copyright. Der Dateiname wird „Künstler - Projektname“. Abschaltbar im Export-Fenster; ohne Cover/Tags exportiert die App wie bisher.
- Hinweis (damals): MP3 war noch nicht enthalten. Manche Abspielprogramme zeigen Tags/Cover in WAV-Dateien nicht an, bei Opus/OGG meist schon.
- Hinweis: Nur `www/index.html` und `CHANGELOG.md` ändern sich gegenüber 1.20 – das Live-Update reicht.

## 1.20 · 2026-11-19 · Start-Intro
- Neu: Beim Öffnen der App läuft jetzt dein Intro-Video (10 Sekunden, mit Ton). „Überspringen“ oder die Zurück-Taste beendet es sofort, der Lautsprecher-Knopf schaltet den Ton um. Es läuft einmal pro App-Start, nicht bei jedem Zurückkehren in die App.
- Neu: Optionen → Design & Aussehen → „Start-Intro“: beim Start abspielen ein/aus, mit oder ohne Ton und „Intro jetzt ansehen“ – das Video lässt sich also auch bei ausgeschaltetem Start jederzeit anschauen.
- Hinweis: Das Video liegt als eigene Datei in `www/assets/` (intro.mp4 und intro-poster.jpg). Weil sich damit Dateien außerhalb der index.html ändern, braucht dieses Update eine neue APK. Startet der Ton nicht automatisch (Android-Sperre), läuft das Intro stumm und der Lautsprecher-Knopf schaltet ihn zu.

## 1.19 · 2026-11-19 · Player & Musik im Hintergrund
- Neu: Die Musik läuft jetzt auch im Hintergrund und bei gesperrtem Bildschirm weiter – für den neuen Player und für die DAW-Wiedergabe. In der Benachrichtigungsleiste und auf dem Sperrbildschirm erscheint ein Player mit Titel, Cover im Farbton deines Designs und Tasten (Zurück, Play/Pause, Weiter bzw. Stopp). Das gibt es nur in der Android-App; es braucht einmalig eine neue APK.
- Neu: Einfacher Player für reine Audiodateien – WAV, MP3, M4A, OGG, FLAC. Auch ganze ZIP-Dateien (z. B. der Suno-Download) lassen sich öffnen; die Titel darin erscheinen sortiert in der Liste und werden erst beim Abspielen entpackt. Mit Zufall, Wiederholen (aus/alle/ein Titel), Lautstärke und kleiner Leiste, wenn du den Player schließt. Erreichbar über ☰ → Player, die Startseite und die Optionen.
- Neu: Optionen → Klang → „Player & Hintergrund“: Hintergrund-Wiedergabe und Benachrichtigungs-Player lassen sich abschalten.
- Besser: Der Taktgeber der DAW läuft in einem eigenen Arbeitsthread, damit Drums und MIDI auch bei gesperrtem Bildschirm nicht ins Stocken geraten.
- Hinweis: Player und DAW spielen nie gleichzeitig – startest du das eine, hält das andere an. Die Titelliste des Players bleibt nur bis zum Schließen der App erhalten. Hält Android die App trotzdem nach längerer Zeit an, hilft in den Android-Einstellungen für die App „Akku → Nicht einschränken“.
- Hinweis: Ändert die Datei scripts/patch-android.cjs – deshalb ist diesmal eine neue APK nötig (Live-Update allein reicht nicht). Beim ersten Start fragt Android auf neueren Versionen nach der Erlaubnis für Benachrichtigungen.

## 1.18 · 2026-11-19 · Übersichtliche Optionen
- Neu: Die Optionen sind jetzt in sechs Kategorien geordnet – Design & Aussehen, Effekte & Anzeige, Klang, KI & Assistent, Leistung & Speicher, Updates & Datensicherung, Hilfe & Feedback. Beim Öffnen siehst du die Übersicht mit Kurzinfo; ein Tipp öffnet die Einstellungen der Kategorie.
- Neu: Suchfeld in den Optionen – findet Einstellungen nach Stichwort („Farbe“, „Update“, „Speicher“ …).
- Besser: Die Zurück-Leiste „‹ Optionen“ bleibt beim Scrollen oben stehen; Zurück-Taste und Esc führen erst zur Übersicht, dann schließen sie die Optionen. Nach einem Design-Wechsel bleibst du auf der Seite „Design“.
- Hinweis: Alle bisherigen Einstellungen sind unverändert vorhanden – sie liegen nur an einer geordneten Stelle. Das Update kommt über das Live-Update (nur index.html geändert).

## 1.17 · 2026-11-19 · Aufgeräumte Großansicht, Feedback & Vorschau
- Neu: Klavier/Piano Roll, Drum-Sequencer, Mixer und MIDI-Werkzeuge öffnen jetzt in einem eigenen Großansicht-Fenster, wenn du sie brauchst – das Hauptfenster bleibt übersichtlich (Spuren, Transport und Navigation bleiben immer erreichbar). Schließen mit ✕, Zurück-Taste oder Esc; ein zweiter Tipp auf den Knopf schließt ebenfalls.
- Neu: Der MIDI-Editor ist in fünf Werkzeug-Gruppen aufgeteilt (Raster, Tonart, Generator, Audio→MIDI, Klang) – es ist immer nur die Gruppe sichtbar, die du gerade brauchst. Die Auswahl wird gemerkt.
- Neu: Feedback-Funktion für Tester (Menü, Startseite und Optionen): Fehler, Ideen, Anmerkungen, Lob oder Fragen schreiben, Bereich wird automatisch erkannt. Optional werden Geräte-/Versionsangaben und das technische Fehlerprotokoll (keine Audiodaten, keine Projektinhalte) angehängt. Du siehst vorher genau, was mitgeht, und schickst es per E-Mail, Teilen, Datei oder Kopieren selbst ab – es wird nichts automatisch gesendet.
- Neu: Update-Vorschau („Bald neu“) auf der Startseite und in „Was ist neu“: ein kurzer Ausblick auf das nächste Release. Der Text wird beim Start live aus der Datei VORSCHAU.md im Repo nachgeladen (ohne neue App-Version) und lässt sich wegklicken.
- Besser: Optionen → Darstellung der Fenster: „Großansicht“ ist neu der Standard; die bisherigen Modi „Fenster“ (Ziehharmonika) und „Tabs“ bleiben wählbar. Wer bewusst Tabs gewählt hatte, behält sie.
- Besser: Der Hintergrunddienst für Live-Updates startet jetzt in der Android-App (vorher meldete die App „Der Hintergrunddienst konnte nicht starten“). Seine Dateien kommen nun wie die Seite aus der App selbst.
- Hinweis: Dieser Fix ändert die Android-Hülle – deshalb einmal die neue APK installieren. Danach können Oberflächen-Änderungen über das Live-Update kommen.
- Hinweis: Das Feedback läuft ohne Server: „Per E-Mail“ öffnet die Mail-App mit fertigem Text (Betreff „Feedback Sunshine@R DAW Studio“); Teilen, Datei und Kopieren liefern denselben Inhalt.

## 1.16 · 2026-11-19 · Speicher-Sparer, schlankere App
- Neu: Speicher-Sparer (Optionen → Speicher-Sparer, standardmäßig aus): Spuren, die gerade nicht zu hören sind (stumm oder durch Solo ausgeblendet), werden aus dem Arbeitsspeicher entladen – bei einer 4½-Minuten-Stereo-Spur sind das rund 95 MB. Wellenform, Länge und Name bleiben sichtbar; beim Einschalten, Abspielen oder Exportieren lädt die App die Spur automatisch wieder, bit-genau. Einzelne Spuren lassen sich auch von Hand entladen und laden.
- Besser: Das Design (Tailwind) wird nicht mehr beim Start im Handy berechnet, sondern liegt fertig in der App. Das spart ca. 400 KB Programmcode, Rechenzeit beim Start und bei jeder Änderung der Oberfläche. Aussehen unverändert (in 135 Ansichten Punkt für Punkt gegen die alte Version geprüft).
- Besser: Logo und App-Icon sind deutlich kleiner (Logo 2,5 MB → ca. 0,2 MB) – die App wird schneller geladen und das Paket schlanker.
- Hinweis: Wer gleichzeitig viele Spuren hört, braucht diese Spuren auch gleichzeitig im Speicher. Der Sparer entlastet vor allem beim Arrangieren und beim Abhören einzelner Stems.
- Hinweis: Diese Version ändert Dateien der App (Logo, Design). Das Update läuft deshalb über eine neue APK, nicht über das Live-Update.

## 1.15 · 2026-11-19 · Kompaktere Projekte & sparsameres Speichern
- Neu: Importierte Stems (WAV, MP3, …) werden im Projekt als Original-Datei gespeichert statt als entpackte Rohdaten. Projekte, Autosave und Sicherungen werden dadurch kleiner (16-Bit-WAV etwa die Hälfte, MP3 rund ein Zehntel).
- Besser: Beim Speichern werden die Audiodaten nicht mehr zusätzlich kopiert – das senkt die Speicherspitze, die bei vielen Spuren zum Absturz führen konnte.
- Hinweis: Aufnahmen, erzeugte oder bearbeitete Spuren und 32-Bit-Float-Dateien bleiben wie bisher als Rohdaten. Ältere Projekte bleiben lesbar und werden erst dann kompakt, wenn die Stems neu importiert werden.
- Hinweis: Beim Öffnen werden die Original-Dateien neu dekodiert – bei vielen Spuren dauert das einige Sekunden.

## 1.14 · 2026-11-19 · Updates, Sicherung & Stabilität
- Neu: „Was ist neu“ – dieses Änderungsprotokoll steckt jetzt in der App (Optionen → Updates) und erscheint nach einem Update einmal auf der Startseite.
- Neu: Beim Update-Hinweis steht jetzt, was die neue Version bringt (aus dem GitHub-Release-Text).
- Neu: Wöchentliche Sicherung – automatisch in „Dokumente/SunshineDAW/Sicherung“ (die letzten 4 bleiben), bei großen Datenmengen als Erinnerung zum Speichern.
- Neu: Live-Update der Oberfläche – kleine Änderungen kommen ohne neue APK, mit automatischem Rückfall auf die eingebaute Version, falls etwas nicht startet.
- Neu: Optionen → Stabilität & Leistung: Speicher-Anzeige mit Warnung, Fehlerprotokoll zum Kopieren, Sparmodus für schwächere Handys, Anzeige-Test.
- Der Name der App ist jetzt überall „Sunshine@R DAW Studio“.

## 1.13 · Updates & Datensicherung
- Neu: Feste App-Signatur und hochzählende Versionsnummer – neue APKs lassen sich über die installierte App einspielen, Projekte bleiben erhalten.
- Neu: „Nach Updates suchen“ in den Optionen (GitHub-Releases) mit Hinweis auf der Startseite.
- Neu: „Alles sichern“ und „Wiederherstellen“ – alle Projekte, Autosave und Einstellungen als eine ZIP-Datei.
- Neu: Gerätespeicher dauerhaft schützen.

## 1.12 · Anzeige & Effekte
- Effekte sind standardmäßig aus und wirken nur noch auf große Flächen und Ränder (kein Vollbild-Overlay mehr).
- Layout-Wächter gegen seitliche Ränder, Kamera-Abstand optional, „Anzeige prüfen“ in den Optionen.

## 1.11 · Anleitung
- Neu: Interaktiver Rundgang und Handbuch in der App (Optionen oder Startseite → Hilfe).

## 1.10 · Android-Feinschliff
- Zurück-Taste schließt Fenster und führt zur Startseite, Vollbild und Querformat randlos.
- Icons je Design vereinheitlicht, Transportleiste und Werkzeugleiste ans Design angepasst.

## 1.9 · Kreativ-Werkzeuge
- Beat-Slicer, Tonart-Erkennung mit Transponieren, Stem-Import-Assistent, Strukturmarker.

## 1.8 · Mix & Export
- Automation, LUFS-Messung mit Limiter, Spektrum.
- Export als Stems-ZIP, Loop-Bereich, komprimiert oder MIDI.

## 1.7 · Clip-Bearbeitung
- Teilen, zuschneiden, kopieren, einfügen, verschieben; Fades und Überblendungen; Mehrfachauswahl; Lücke schließen.
- Großansicht je Spur, Autosave mit Wiederherstellung.

## 1.6 · Fenster-Modus
- Editor, Drums, Vocal, Mixer und Spuren als einzeln ein- und ausklappbare Fenster.
- Einheitliche Transport-Buttons, klarere Zurück/Vor-Symbole.

## 1.5 · KI & Sprache
- KI-Assistent mit Sprachsteuerung.
- Audio-zu-MIDI per Basic-Pitch-KI.

## 1.4 · Design-Optionen
- Farbe, Transparenz, Unschärfe und Rundung einstellbar; „Vor“-Button (Redo).

## 1.3 · Neues Design
- Theme „Liquid Matt“, schwebende Navigation unten, kompaktere Spurkarten, aufgeräumtes Datei-Menü.

## 1.2 · SoundFonts
- SpessaSynth-Integration: SoundFonts laden und als Instrument nutzen.

## 1.1 · Mixer & Editor
- Mixer, Piano-Roll, Drum-Pattern und Vocal-Ansicht für Suno-Stems.

## 1.0 · Erste Fassung
- Suno-Stems laden, abspielen, mischen und exportieren.
