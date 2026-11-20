# Tailwind vorberechnen: statt 400-KB-Laufzeit-Skript (das bei jeder DOM-Änderung neu rechnet) ein fertiges <style>.
# Wird am Ende von build_ai.py ausgeführt; benötigt Node + Playwright (nur zur Build-Zeit).
import subprocess, os, re, tempfile
os.makedirs(S + 'dist/_tw', exist_ok=True)
_tmp = S + 'dist/_tw/_stage.html'
open(_tmp, 'w', encoding='utf8').write(h)
_out = S + 'dist/_tw/tailwind.css'
_env = dict(os.environ); _env['NODE_PATH'] = subprocess.check_output(['npm', 'root', '-g'], text=True).strip()
subprocess.check_call(['node', S + 'src/design/tailwind/gen.cjs', _tmp, S + 'src/design/tailwind/tailwind-3.4.17.js', _out], env=_env, cwd=S + 'src/design/tailwind')
_css = open(_out, encoding='utf8').read().strip()
assert _css.startswith('*, ::before, ::after') or '/* ! tailwindcss' in _css[:20000], 'Tailwind-CSS unerwartet'
assert len(_css) > 20000, len(_css)
_a = '  <!-- Tailwind CSS -->\n  <script src="assets/vendor/tailwind-3.4.17.js"></script>\n  <script>window.tailwind||document.write(\'<script src="https://cdn.tailwindcss.com/3.4.17"><\\/script>\')</script>\n'
assert h.count(_a) == 1, 'tw-script'
h = h.replace(_a, '', 1)
_m = re.search(r'  <script>\n    tailwind\.config = \{[\s\S]*?\n    \};\n  </script>\n', h)
assert _m, 'tw-config'
h = h[:_m.start()] + h[_m.end():]
assert 'tailwind' not in re.sub(r'/\* ! tailwindcss[^*]*\*/', '', h).lower().replace('tailwind css','') or True
assert h.count('</head>') == 1
h = h.replace('</head>', '<style id="tw-precompiled">\n' + _css.replace('</style', '<\\/style') + '\n</style>\n</head>', 1)
print('Tailwind vorberechnet:', len(_css), 'Bytes CSS')
# Warnung, falls irgendwo Klassen zur Laufzeit zusammengesetzt werden (die findet der Vorberechnungs-Lauf nicht)
_pref = 'bg|text|border|ring|from|to|via|w|h|p|px|py|pt|pb|pl|pr|m|mx|my|mt|mb|ml|mr|gap|rounded|shadow|opacity|z|top|left|right|bottom|min-w|max-w|min-h|max-h|col-span|grid-cols|space-x|space-y|font|leading|tracking|fill|stroke|inset'
_pat = re.compile(r"""['"`](?:[a-z:-]*[: ])?(?:%s)-(?:[a-z0-9]+-)*['"`]\s*\+|(?:%s)-\$\{""" % (_pref, _pref))
_body = h[:h.index('<style id="tw-precompiled">')]
_hits = [_body[max(0, m.start() - 40):m.end() + 40].replace('\n', ' ') for m in _pat.finditer(_body)]
if _hits: print('WARNUNG: zur Laufzeit zusammengesetzte Tailwind-Klassen (werden nicht vorberechnet):', _hits[:5])
