#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
set -a
[ -f config/paths.env ] && source config/paths.env
set +a
export PYTHONPATH="$(pwd)/app/python:${PYTHONPATH:-}"
exec python3 -m uvicorn api.main:app --host 0.0.0.0 --port 8000 --app-dir app/python/api "$@"
