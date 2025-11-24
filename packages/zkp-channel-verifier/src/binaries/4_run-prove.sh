#!/usr/bin/env bash
set -Eeuo pipefail
IFS=$'\n\t'

# Run ./bin/prove from the current package directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOCAL_PROVE="$SCRIPT_DIR/bin/prove"

export ICICLE_BACKEND_INSTALL_DIR="${SCRIPT_DIR}/backend-lib/icicle/lib/backend"
exec "$LOCAL_PROVE" "$SCRIPT_DIR/resource/qap-compiler/library" "/tmp/tokamak-zk-evm/synthesizer/outputs" "$SCRIPT_DIR/resource/setup/output" "/tmp/tokamak-zk-evm/prove/output"
