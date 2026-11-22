#!/bin/sh
# Fail open when Node is not on PATH. Cursor must not block the session
# because a hook command cannot start.
if ! command -v node >/dev/null 2>&1; then
  cat >/dev/null 2>&1 || true
  printf '%s\n' '{}'
  exit 0
fi
exec node "$@"
