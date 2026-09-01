#!/usr/bin/env bash
set -Eeuo pipefail

if [[ ${EUID} -eq 0 ]]; then
  cat >&2 <<'MSG'
ERROR: Do not run this setup script with sudo.
Run it as your normal Ubuntu user:
  ./setup_ubuntu.sh
The script requests sudo only for the one system-level step it needs.
MSG
  exit 1
fi

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

MIN_NODE_MAJOR=20

on_error() {
  local exit_code=$?
  local line_no=${1:-unknown}
  echo >&2
  echo "ERROR: setup stopped at line ${line_no} (exit code ${exit_code})." >&2
  echo "Read the command output immediately above this message." >&2
  echo "After correcting the problem, run this setup script again." >&2
  exit "$exit_code"
}
trap 'on_error $LINENO' ERR

section() {
  echo
  echo "============================================================"
  echo "$1"
  echo "============================================================"
}

require_project_files() {
  local missing=0
  local required=(
    "backend/server.js" "backend/db.js" "backend/package.json"
    "backend/data/sensor-readings.json"
    "frontend/package.json" "frontend/index.html" "frontend/src/App.jsx" "frontend/src/App.css"
    "frontend/src/utils/analysis.js" "frontend/src/services/api.js"
    "run_backend.sh" "run_frontend.sh"
  )
  for file in "${required[@]}"; do
    [[ -f "$file" ]] || { echo "Missing required project file: $file" >&2; missing=1; }
  done
  [[ $missing -eq 0 ]] || { echo "Run this script from the SmartFarm project root." >&2; exit 1; }
}

node_major() { node -p 'Number(process.versions.node.split(".")[0])' 2>/dev/null || echo 0; }

check_node() {
  local current_major=0
  if command -v node >/dev/null 2>&1; then
    current_major="$(node_major)"
  fi
  if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1 || [[ $current_major -lt $MIN_NODE_MAJOR ]]; then
    echo "Node.js ${MIN_NODE_MAJOR}+ not found. Installing via nvm..."
    export NVM_DIR="$HOME/.nvm"
    if [[ ! -d "$NVM_DIR" ]]; then
      curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
    fi
    # shellcheck disable=SC1091
    source "$NVM_DIR/nvm.sh"
    nvm install --lts
    nvm use --lts
  else
    echo "A supported Node.js version is already installed."
  fi
  current_major="$(node_major)"
  [[ $current_major -ge $MIN_NODE_MAJOR ]] || { echo "Node.js ${MIN_NODE_MAJOR}+ is required." >&2; exit 1; }
  echo "Node.js: $(node --version)"
  echo "npm:     $(npm --version)"
}

ensure_build_tools() {
  # better-sqlite3 ships prebuilt binaries for most platforms, so this is
  # usually a no-op. It exists only as a fallback in case no prebuilt
  # binary matches this machine, which would force a compile from source.
  if ! dpkg -s build-essential >/dev/null 2>&1 || ! command -v python3 >/dev/null 2>&1; then
    echo "Ensuring build tools are present as a fallback for native modules..."
    sudo apt-get update
    sudo apt-get install -y build-essential python3
  else
    echo "Build tools already present."
  fi
}

section "SmartFarm Crop Dashboard Setup"
echo "Project directory: $SCRIPT_DIR"
echo "Frontend: React + Vite"
echo "Backend:  Node.js + Express"
echo "Database: SQLite (better-sqlite3)"

require_project_files
command -v apt-get >/dev/null 2>&1 || { echo "This setup requires Ubuntu or another apt-based Debian system." >&2; exit 1; }

section "Step 1 of 5: Check Node.js and npm"
check_node

section "Step 2 of 5: Ensure native module build tools"
ensure_build_tools

section "Step 3 of 5: Install backend dependencies"
(cd backend && npm install)

section "Step 4 of 5: Install frontend dependencies"
(cd frontend && npm install)

section "Step 5 of 5: Validate backend, database, and frontend build"
node --check backend/server.js
echo "backend/server.js: syntax OK"

(
  cd backend
  node -e '
    const db = require("./db.js");
    const columns = db.prepare("PRAGMA table_info(crops)").all().map((c) => c.name);
    const required = ["id", "crop_name", "location", "target_min", "target_max", "normal_water", "notes", "created_at"];
    const missing = required.filter((c) => !columns.includes(c));
    if (missing.length > 0) {
      console.error("Missing expected columns:", missing.join(", "));
      process.exit(1);
    }
    console.log("crops table columns:", columns.join(", "));
  '
)
echo "smartfarm.db: schema OK"

(cd frontend && npm run build)
echo "frontend build: OK"
rm -rf frontend/dist

chmod +x setup_ubuntu.sh run_backend.sh run_frontend.sh 2>/dev/null || true

section "Setup completed successfully"
cat <<HELP
The project is ready.

Terminal 1:
  ./run_backend.sh

Terminal 2:
  ./run_frontend.sh

Browser:
  http://localhost:5173

backend/data/smartfarm.db was created automatically. Deleting it is safe --
it is rebuilt and reseeded (Tomato, Lettuce, Wheat) the next time the
backend starts. Maize is not seeded; create it through the UI. Existing
rows are never dropped by this script, unlike a full reset.
HELP