#!/bin/zsh
set -e
cd "${0:A:h}"
# Prefer the bundled runtime if installed; otherwise use Node.js from PATH.
WATCHLIST_NODE_DIR="$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin"
if [[ -x "$WATCHLIST_NODE_DIR/node" ]]; then export PATH="$WATCHLIST_NODE_DIR:$PATH"; fi
if ! command -v node >/dev/null 2>&1; then
  print 'Install Node.js 24, then open this file again.'
  read -r '?Press Enter to close.'
  exit 1
fi
if curl --silent --fail --max-time 2 http://127.0.0.1:4317/api/health 2>/dev/null | /usr/bin/grep -q '"application":"watch-list"'; then
  open http://127.0.0.1:4317/
  exit 0
fi
if [[ ! -d node_modules ]]; then npm ci; fi
npm run build
(sleep 3; open http://127.0.0.1:4317/) &
npm start
