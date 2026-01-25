#!/usr/bin/env bash
set -euo pipefail

SERVICE="folia"
INSTALL_DIR="/opt/folia"
ENV_DIR="/etc/folia"
ENV_FILE="${ENV_DIR}/folia.env"
SERVICE_FILE="/etc/systemd/system/${SERVICE}.service"
PURGE_INSTALL_DIR="false"

usage() {
  cat <<EOF
Usage: sudo ./scripts/uninstall.sh [--purge]

Removes the systemd service and environment file for Folia.
Use --purge to also delete ${INSTALL_DIR}.
EOF
}

if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  usage
  exit 0
fi

if [[ "${1:-}" == "--purge" ]]; then
  PURGE_INSTALL_DIR="true"
elif [[ -n "${1:-}" ]]; then
  echo "Unknown option: ${1}"
  usage
  exit 1
fi

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Please run as root: sudo $0"
  exit 1
fi

if systemctl is-active --quiet "${SERVICE}"; then
  systemctl stop "${SERVICE}"
fi

if systemctl is-enabled --quiet "${SERVICE}"; then
  systemctl disable "${SERVICE}"
fi

if [[ -f "${SERVICE_FILE}" ]]; then
  rm -f "${SERVICE_FILE}"
  systemctl daemon-reload
fi

if [[ -f "${ENV_FILE}" ]]; then
  rm -f "${ENV_FILE}"
fi

if [[ -d "${ENV_DIR}" ]]; then
  rmdir "${ENV_DIR}" 2>/dev/null || true
fi

if [[ "${PURGE_INSTALL_DIR}" == "true" && -d "${INSTALL_DIR}" ]]; then
  rm -rf "${INSTALL_DIR:?}"
fi

echo "Uninstall complete."
echo "Library data is not removed."
