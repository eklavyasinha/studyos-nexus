#!/bin/sh
# Convenience launcher. Never installs packages or changes global settings.
set -eu
cd "$(dirname "$0")"
if [ -x .tools/node/bin/node ]; then
  PATH="$PWD/.tools/node/bin:$PATH"
  export PATH
fi
if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
  printf '\nStudyOS Nexus needs Node.js 22+ and npm. Install Node, then run npm ci.\n' >&2
  exit 1
fi
if [ ! -d node_modules ]; then
  printf '\nDependencies are not installed. Run npm ci in this folder first.\n' >&2
  exit 1
fi
exec npm run dev
