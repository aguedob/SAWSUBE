#!/usr/bin/env bash
# Samsung Frame Manager — Linux/Mac start script
set -e
cd "$(dirname "$0")"

MODE="prod"
if [ "${1:-}" = "--dev" ]; then
  MODE="dev"
fi

PYTHON_BIN="${PYTHON_BIN:-}"

find_python() {
  for candidate in "$@"; do
    if [ -n "$candidate" ] && command -v "$candidate" >/dev/null 2>&1; then
      if "$candidate" -c 'import sys; raise SystemExit(0 if sys.version_info >= (3, 11) else 1)' >/dev/null 2>&1; then
        printf '%s\n' "$candidate"
        return 0
      fi
    fi
  done
  return 1
}

if [ -z "$PYTHON_BIN" ]; then
  PYTHON_BIN="$(find_python python3 python python3.13 python3.12 python3.11 2>/dev/null || true)"
fi

if [ -z "$PYTHON_BIN" ]; then
  for candidate in \
    /opt/homebrew/bin/python3 \
    /usr/local/bin/python3 \
    /opt/homebrew/bin/python3.13 \
    /opt/homebrew/bin/python3.12 \
    /opt/homebrew/bin/python3.11 \
    /usr/local/bin/python3.13 \
    /usr/local/bin/python3.12 \
    /usr/local/bin/python3.11 \
    /Library/Frameworks/Python.framework/Versions/3.13/bin/python3 \
    /Library/Frameworks/Python.framework/Versions/3.12/bin/python3 \
    /Library/Frameworks/Python.framework/Versions/3.11/bin/python3
  do
    if [ -x "$candidate" ] && "$candidate" -c 'import sys; raise SystemExit(0 if sys.version_info >= (3, 11) else 1)' >/dev/null 2>&1; then
      PYTHON_BIN="$candidate"
      break
    fi
  done
fi

if [ -z "$PYTHON_BIN" ]; then
  echo "Python 3.11+ is required."
  echo "Set PYTHON_BIN=/path/to/python3.11+ if it is installed outside your PATH."
  exit 1
fi

if [ ! -d .venv ]; then
  echo "Creating venv with $("$PYTHON_BIN" -V 2>&1)..."
  "$PYTHON_BIN" -m venv .venv
fi
# shellcheck disable=SC1091
source .venv/bin/activate

if ! python -c 'import sys; raise SystemExit(0 if sys.version_info >= (3, 11) else 1)'; then
  echo ".venv is using an older Python: $(python -V 2>&1)"
  echo "Remove .venv and re-run this script after installing Python 3.11+."
  exit 1
fi

echo "Installing backend deps..."
pip install --upgrade pip >/dev/null
pip install -r backend/requirements.txt

if [ ! -f .env ]; then
  cp .env.example .env
  echo "Created .env from template — edit and re-run if needed."
fi

# Load nvm if available (Linux/Mac, no system Node installed)
if ! command -v node >/dev/null 2>&1; then
  export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
  # shellcheck disable=SC1091
  [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
fi

if [ "$MODE" = "dev" ] && ! command -v node >/dev/null 2>&1; then
  echo "Node.js is required for --dev mode."
  echo "Install Node.js or nvm, then re-run ./start.sh --dev"
  exit 1
fi

# ── Instance check ────────────────────────────────────────────────────────
EXISTING=$(pgrep -f 'python.*backend\.main|uvicorn.*backend\.main' 2>/dev/null | tr '\n' ' ')
if [ -n "$EXISTING" ]; then
  echo ""
  echo "⚠  SAWSUBE is already running (PID: $EXISTING)"
  echo "   [k] Kill existing instance and start fresh"
  echo "   [e] Exit without starting another"
  printf "   Choice [k/e]: "
  read -r choice
  case "$choice" in
    k|K)
      echo "Stopping PID(s): $EXISTING"
      # shellcheck disable=SC2086
      kill $EXISTING 2>/dev/null || true
      sleep 2
      ;;
    *)
      echo "Exiting — existing instance left running."
      exit 0
      ;;
  esac
fi

if [ "$MODE" = "dev" ]; then
  echo "Installing frontend deps..."
  (cd frontend && npm install)

  echo "Starting SAWSUBE backend in reload mode on http://localhost:8000"
  python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload &
  BACKEND_PID=$!

  cleanup() {
    kill "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true
  }
  trap cleanup EXIT INT TERM

  echo "Starting Vite dev server on http://localhost:5173"
  (
    cd frontend
    npm run dev -- --host 0.0.0.0
  ) &
  FRONTEND_PID=$!

  wait "$BACKEND_PID" "$FRONTEND_PID"
  exit $?
fi

if command -v node >/dev/null 2>&1; then
  if [ ! -d frontend/dist ]; then
    echo "Building frontend..."
    (cd frontend && npm install && npm run build)
  fi
else
  echo "Node.js not found — frontend will not be served. API only."
  echo "  Install Node.js or nvm to enable the UI: https://github.com/nvm-sh/nvm"
fi

echo "Starting Frame Manager on http://localhost:8000"
exec python -m backend.main
