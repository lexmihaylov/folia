#!/usr/bin/env bash
set -euo pipefail

REPO="lexmihaylov/folia"
SERVICE="folia"
INSTALL_DIR="/opt/folia"
ASSET_PREFIX="folia-kb-standalone-"

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

echo "Preparing install directory..."
sudo mkdir -p "$INSTALL_DIR"

if [[ -f "${INSTALL_DIR}/folia.config.json" ]]; then
  cp "${INSTALL_DIR}/folia.config.json" "$TMP_DIR/folia.config.json"
fi
if [[ -f "${INSTALL_DIR}/credentials.json" ]]; then
  cp "${INSTALL_DIR}/credentials.json" "$TMP_DIR/credentials.json"
fi

echo "Installing release to ${INSTALL_DIR}..."
sudo rm -rf "${INSTALL_DIR:?}"/*
sudo cp -R "$TMP_DIR/release/." "$INSTALL_DIR/"

if [[ -f "$TMP_DIR/folia.config.json" ]]; then
  sudo cp "$TMP_DIR/folia.config.json" "${INSTALL_DIR}/folia.config.json"
fi
if [[ -f "$TMP_DIR/credentials.json" ]]; then
  sudo cp "$TMP_DIR/credentials.json" "${INSTALL_DIR}/credentials.json"
fi

echo "Restarting service ${SERVICE}..."
sudo systemctl restart "${SERVICE}"

echo "Update complete."
