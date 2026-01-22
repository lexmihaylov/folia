#!/usr/bin/env bash
set -euo pipefail

SERVICE_NAME="folia"
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_USER="${SUDO_USER:-$USER}"
NODE_BIN="$(command -v node || true)"

if [[ -z "$NODE_BIN" ]]; then
  echo "node not found in PATH. Install Node.js first."
  exit 1
fi

PORT="${PORT:-3000}"
MODE="${1:-standalone}"
ENV_DIR="/etc/folia"
ENV_FILE="${ENV_DIR}/folia.env"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"

if [[ "$MODE" == "standalone" ]]; then
  EXEC_START="${NODE_BIN} ${APP_DIR}/.next/standalone/server.js"
else
  EXEC_START="$(command -v npm) run start"
fi

sudo mkdir -p "$ENV_DIR"
sudo tee "$ENV_FILE" >/dev/null <<EOF
NODE_ENV=production
PORT=${PORT}
FOLIA_COOKIE_SECURE=false
EOF

sudo tee "$SERVICE_FILE" >/dev/null <<EOF
[Unit]
Description=Folia KB
After=network.target

[Service]
Type=simple
User=${APP_USER}
WorkingDirectory=${APP_DIR}
EnvironmentFile=${ENV_FILE}
ExecStart=${EXEC_START}
Restart=on-failure

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable "${SERVICE_NAME}"
sudo systemctl restart "${SERVICE_NAME}"

echo "Installed and started ${SERVICE_NAME}.service"
echo "Check status with: systemctl status ${SERVICE_NAME}"
