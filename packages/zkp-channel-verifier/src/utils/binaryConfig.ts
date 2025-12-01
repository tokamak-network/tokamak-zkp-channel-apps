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
import { existsSync } from "fs";
import { app } from "electron";

// Configuration: Switch between external and local binaries
const USE_EXTERNAL_BINARIES = false;

// External binary path (Tokamak-zk-EVM)
const EXTERNAL_BINARY_ROOT = resolve(
  __dirname,
  "../../../../Tokamak-zk-EVM/dist/macOS"
);

// Local binary paths - try multiple locations
const LOCAL_BINARY_CANDIDATES = [
  resolve(__dirname, "../binaries"), // Built: .vite/build/utils/../binaries
  resolve(__dirname, "../../src/binaries"), // Built: .vite/build/utils/../../src/binaries
  resolve(__dirname, "../../../../src/binaries"), // Built: .vite/build/utils/../../../../src/binaries
  resolve(process.cwd(), "src/binaries"), // Dev: src/binaries from cwd
];

// Find the first existing binary directory
let LOCAL_BINARY_ROOT = LOCAL_BINARY_CANDIDATES[0];
for (const candidate of LOCAL_BINARY_CANDIDATES) {
  const testPath = resolve(candidate, "bin/preprocess");
  if (existsSync(testPath)) {
    LOCAL_BINARY_ROOT = candidate;
    console.log(`[BinaryConfig] Found local binaries at: ${LOCAL_BINARY_ROOT}`);
    break;
  }
}

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
};

// Resource paths
export const RESOURCES = {
  setup: resolve(BINARY_ROOT_DIR, "resource/setup/output"),
  preprocess: resolve(BINARY_ROOT_DIR, "resource/preprocess/output"),
  synthesizer: resolve(BINARY_ROOT_DIR, "resource/synthesizer/outputs"),
  prove: resolve(BINARY_ROOT_DIR, "resource/prove/output"),
  // qap-compiler library is in resource/qap-compiler/library (not subcircuits/library)
  qap: resolve(BINARY_ROOT_DIR, "resource/qap-compiler/library"),
};

// Temporary output directory (deprecated - use RESOURCES.synthesizer instead)
export const getTempDir = (prefix: string) => {
  // Use fixed synthesizer output directory instead of temp
  return RESOURCES.synthesizer;
};

console.log("[BinaryConfig] Using binaries from:", BINARY_ROOT_DIR);
console.log("[BinaryConfig] Binary paths:", BINARIES);
console.log("[BinaryConfig] Resource paths:", RESOURCES);
