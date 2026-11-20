#!/usr/bin/env python3
# Einstieg: baut dist/index_ueberarbeitet.html aus src/ (benötigt Python 3, Node, Playwright im globalen npm-Verzeichnis).
#   python3 build.py
import os, sys, shutil
S = os.path.dirname(os.path.abspath(__file__)).replace('\\', '/') + '/'
os.chdir(S)
rd = lambda p: open(S + p, encoding='utf8', newline='').read()
g = {'__name__': '__main__', 'S': S, 'rd': rd}
exec(compile(open(S + 'src/patches/build_ai.py', encoding='utf8').read(), 'src/patches/build_ai.py', 'exec'), g)
if os.path.isdir(S + 'dist/assets'): shutil.rmtree(S + 'dist/assets')
shutil.copytree(S + 'assets', S + 'dist/assets')
print('fertig: dist/index_ueberarbeitet.html (+ dist/assets)')
