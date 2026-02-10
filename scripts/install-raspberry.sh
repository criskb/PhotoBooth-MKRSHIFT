#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is required. Install Node.js 20+ and re-run this script."
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "npm is required. Install Node.js 20+ and re-run this script."
  exit 1
fi

echo "Detected Node: $(node -v)"
echo "Detected npm: $(npm -v)"

echo "Installing root dependencies..."
cd "$ROOT_DIR"
npm install

echo "Installing js_app dependencies..."
cd "$ROOT_DIR/js_app"
npm install

echo "Raspberry Pi install complete. Start with: npm run start"
