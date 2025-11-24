#!/usr/bin/env bash
set -Eeuo pipefail
IFS=$'\n\t'

# Check if required arguments are provided
if [ $# -lt 2 ]; then
    echo "Usage: $0 <transaction_hash> <rpc_url>"
    exit 1
fi

TRANSACTION_HASH="$1"
RPC_URL="$2"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOCAL="$SCRIPT_DIR/bin/synthesizer"
OUT_DIR="/tmp/tokamak-zk-evm/synthesizer/outputs"

echo "🔍 Synthesizer Debug Info:"
echo "  SCRIPT_DIR: $SCRIPT_DIR"
echo "  LOCAL: $LOCAL"
echo "  OUT_DIR: $OUT_DIR"
echo "  TRANSACTION_HASH: $TRANSACTION_HASH"
echo "  RPC_URL: $RPC_URL"

echo "🔍 Checking binary exists:"
ls -la "$LOCAL" || echo "❌ Binary not found at $LOCAL"

echo "🔍 Creating output directory:"
rm -rf "${OUT_DIR}"
mkdir -p "${OUT_DIR}"
ls -la "${OUT_DIR}" || echo "❌ Failed to create output directory"

echo "🔍 Executing synthesizer:"
exec "$LOCAL" parse -r "$RPC_URL" -t "$TRANSACTION_HASH" --output-dir "${OUT_DIR}"
