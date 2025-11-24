#!/usr/bin/env bash
set -Eeuo pipefail
IFS=$'\n\t'

# Run ./bin/verify from the current package directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOCAL="$SCRIPT_DIR/bin/verify"

export ICICLE_BACKEND_INSTALL_DIR="${SCRIPT_DIR}/backend-lib/icicle/lib/backend"
exec "$LOCAL" "$SCRIPT_DIR/resource/qap-compiler/library" "/tmp/tokamak-zk-evm/synthesizer/outputs" "$SCRIPT_DIR/resource/setup/output" "/tmp/tokamak-zk-evm/preprocess/output" "/tmp/tokamak-zk-evm/prove/output"
