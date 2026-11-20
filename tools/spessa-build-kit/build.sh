#!/usr/bin/env bash
# Linux / macOS: alles in einem Rutsch.   Aufruf:  ./build.sh ../index_ueberarbeitet.html
set -e
cd "$(dirname "$0")"
HTML="${1:-../index_ueberarbeitet.html}"
npm install --no-audit --no-fund
npx --yes bun build.mjs
node inject.mjs "$HTML"
