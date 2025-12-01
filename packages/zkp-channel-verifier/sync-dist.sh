#!/usr/bin/env bash
set -Eeuo pipefail

# Sync Tokamak-zk-EVM dist to zkp-channel-verifier binaries
SOURCE_DIR="$HOME/Desktop/dev/Tokamak-zk-EVM/dist/macOS"
TARGET_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/src/binaries"

echo "🔍 Syncing dist from Tokamak-zk-EVM..."
echo "   Source: $SOURCE_DIR"
echo "   Target: $TARGET_DIR"

if [ ! -d "$SOURCE_DIR" ]; then
  echo "❌ Source directory not found: $SOURCE_DIR"
  echo "   Please run packaging script in Tokamak-zk-EVM first:"
  echo "   cd ~/Desktop/dev/Tokamak-zk-EVM && ./scripts/packaging.sh --macos"
  exit 1
fi

# Create target directory
mkdir -p "$TARGET_DIR"

# Sync bin/
echo "[*] Syncing bin/..."
rsync -av --delete "$SOURCE_DIR/bin/" "$TARGET_DIR/bin/"

# Sync backend-lib/
echo "[*] Syncing backend-lib/..."
rsync -av --delete "$SOURCE_DIR/backend-lib/" "$TARGET_DIR/backend-lib/"

# Sync resource/
echo "[*] Syncing resource/..."
rsync -av --delete "$SOURCE_DIR/resource/" "$TARGET_DIR/resource/"

# Copy run scripts (optional, for reference)
echo "[*] Copying run scripts..."
cp -f "$SOURCE_DIR"/*.sh "$TARGET_DIR/" 2>/dev/null || true

echo "✅ Sync completed!"
echo ""
echo "📦 Synced files:"
echo "   - bin/ ($(ls -1 "$TARGET_DIR/bin" | wc -l | xargs) binaries)"
echo "   - backend-lib/icicle/"
echo "   - resource/qap-compiler/"
echo "   - resource/setup/"

