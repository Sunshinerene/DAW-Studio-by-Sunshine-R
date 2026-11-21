#!/bin/bash
# Alle Regressionstests gegen dist/ (zuerst: python3 build.py). Ergebnis: tests/ergebnis.txt, je Test ein Log in dist/_logs/
# Voraussetzungen: Node, Playwright (global installiert: NODE_PATH wird gesetzt), ffmpeg/ffprobe (nur Export-Tests), jszip unter /opt/npm-tools/node_modules (nur Backup-Test).
cd "$(dirname "$0")"
export NODE_PATH=$(npm root -g)
mkdir -p ../dist/_shots ../dist/_logs
cp fixtures/test.sf2 fixtures/test3.sf2 ../dist/
: > ergebnis.txt
for f in $(ls *_test.cjs | grep -v -E "^(nav_test|logo_test|sf3_test)\.cjs$"); do
  timeout 400 node $f ../dist > ../dist/_logs/$f.log 2>&1; ec=$?
  p=$(grep -c "^PASS" ../dist/_logs/$f.log); fl=$(grep -c "^FAIL" ../dist/_logs/$f.log)
  echo "$f exit=$ec pass=$p fail=$fl" >> ergebnis.txt
done
echo FERTIG >> ergebnis.txt
# Grün heißt: Abbruchcode 0 UND keine FAIL-Zeile (ein Absturz mitten im Test zählt als Fehler)
grep -c "exit=0 .*fail=0" ergebnis.txt | sed 's/^/Dateien ohne Fehler: /'; grep -v "exit=0 .*fail=0" ergebnis.txt | grep -v FERTIG
