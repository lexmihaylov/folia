#!/usr/bin/env bash
set -euo pipefail

REPO="lexmihaylov/folia"
SERVICE="folia"
INSTALL_DIR="/opt/folia"
ASSET_PREFIX="folia-kb-standalone-"
ENV_DIR="/etc/folia"
ENV_FILE="${ENV_DIR}/folia.env"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Please run as root: sudo $0"
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "node not found in PATH. Install Node.js 20+ first."
  exit 1
fi

TMP_DIR="$(mktemp -d)"
cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

echo "Fetching latest release metadata..."
API_URL="https://api.github.com/repos/${REPO}/releases/latest"
ASSET_URL="$(curl -sSL "$API_URL" | \
  awk -v prefix="$ASSET_PREFIX" -F '\"' '/browser_download_url/ {print $4}' | \
  grep "${ASSET_PREFIX}" | head -n 1)"

if [[ -z "$ASSET_URL" ]]; then
  echo "Unable to find a release asset matching ${ASSET_PREFIX}*.tar.gz"
  exit 1
fi

echo "Downloading ${ASSET_URL}..."
curl -sSL "$ASSET_URL" -o "$TMP_DIR/release.tar.gz"

echo "Extracting release..."
mkdir -p "$TMP_DIR/release"
tar -xzf "$TMP_DIR/release.tar.gz" -C "$TMP_DIR/release"

echo "Installing to ${INSTALL_DIR}..."
mkdir -p "$INSTALL_DIR"
rm -rf "${INSTALL_DIR:?}"/*
cp -R "$TMP_DIR/release/." "$INSTALL_DIR/"

if [[ ! -f "${INSTALL_DIR}/folia.config.json" ]]; then
  DEFAULT_ROOT="/data/folia"
  read -r -p "Library root path [${DEFAULT_ROOT}]: " LIB_ROOT
  LIB_ROOT="${LIB_ROOT:-$DEFAULT_ROOT}"
  cat >"${INSTALL_DIR}/folia.config.json" <<EOF
{
  "libraryRoot": "${LIB_ROOT}"
}
EOF
fi

mkdir -p "$ENV_DIR"
cat >"$ENV_FILE" <<EOF
NODE_ENV=production
PORT=3000
FOLIA_COOKIE_SECURE=false
EOF

cat >/etc/systemd/system/${SERVICE}.service <<EOF
[Unit]
Description=Folia KB
After=network.target

[Service]
Type=simple
User=${SUDO_USER:-root}
WorkingDirectory=${INSTALL_DIR}
EnvironmentFile=${ENV_FILE}
ExecStart=$(command -v node) ${INSTALL_DIR}/server.js
Restart=on-failure

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable "${SERVICE}"
systemctl restart "${SERVICE}"

echo "Installed and started ${SERVICE}.service"
echo "Edit ${INSTALL_DIR}/folia.config.json to point at your library root."
