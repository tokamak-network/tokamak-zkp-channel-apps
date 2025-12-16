/**
 * Binary Path Configuration
 *
 * This file centralizes all binary paths for the ZKP Channel Verifier.
 * Currently points to Tokamak-zk-EVM/dist/macOS binaries.
 *
 * To switch to local binaries:
 * 1. Copy binaries from Tokamak-zk-EVM/dist/macOS to src/binaries/
 * 2. Update BINARY_ROOT_DIR to point to local binaries
 */

import { resolve } from "path";
import { app } from "electron";

// Configuration: Switch between external and local binaries
const USE_EXTERNAL_BINARIES = false;

// External binary path (Tokamak-zk-EVM)
const EXTERNAL_BINARY_ROOT = resolve(
  __dirname,
  "../../../../Tokamak-zk-EVM/dist/macOS"
);

// Local binary path (zkp-channel-verifier)
// In development: __dirname is .vite/build, so binaries are at ./binaries
const LOCAL_BINARY_ROOT = resolve(__dirname, "./binaries");

// Select binary root based on configuration
export const BINARY_ROOT_DIR = USE_EXTERNAL_BINARIES
  ? EXTERNAL_BINARY_ROOT
  : LOCAL_BINARY_ROOT;

// Binary paths
export const BINARIES = {
  preprocess: resolve(BINARY_ROOT_DIR, "bin/preprocess"),
  prove: resolve(BINARY_ROOT_DIR, "bin/prove"),
  verify: resolve(BINARY_ROOT_DIR, "bin/verify"),
  trustedSetup: resolve(BINARY_ROOT_DIR, "bin/trusted-setup"),
  synthesizer: resolve(BINARY_ROOT_DIR, "bin/synthesizer"),
  tokamakCli: resolve(BINARY_ROOT_DIR, "bin/tokamak-cli"),
};

// Helper function to get binary path by name
export function getBinaryPath(name: keyof typeof BINARIES): string {
  return BINARIES[name];
}

// Resource paths
export const RESOURCES = {
  setup: resolve(BINARY_ROOT_DIR, "resource/setup/output"),
  preprocess: resolve(BINARY_ROOT_DIR, "resource/preprocess/output"),
  qap: resolve(BINARY_ROOT_DIR, "resource/qap-compiler/library"),
  synthesizer: resolve(BINARY_ROOT_DIR, "resource/synthesizer/output"),
};

// Temporary output directory
export const getTempDir = (prefix: string) => {
  return resolve(app.getPath("userData"), "temp", `${prefix}_${Date.now()}`);
};

console.log("[BinaryConfig] Using binaries from:", BINARY_ROOT_DIR);
console.log("[BinaryConfig] Binary paths:", BINARIES);
console.log("[BinaryConfig] Resource paths:", RESOURCES);
