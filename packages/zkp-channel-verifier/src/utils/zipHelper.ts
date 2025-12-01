/**
 * ZIP Helper
 *
 * Utilities for extracting ZIP files and reading state snapshots.
 */

import { tmpdir } from "os";
import { join } from "path";
import { mkdirSync, readFileSync, existsSync } from "fs";
import AdmZip from "adm-zip";

/**
 * Extract a ZIP file to a temporary directory
 * @param zipPath - Path to the ZIP file
 * @returns Path to the extracted directory
 */
export async function extractZip(zipPath: string): Promise<string> {
  const extractDir = join(tmpdir(), `zkp-extract-${Date.now()}`);
  mkdirSync(extractDir, { recursive: true });

  console.log("[zipHelper] Extracting ZIP:", zipPath);
  console.log("[zipHelper] Extract to:", extractDir);

  const zip = new AdmZip(zipPath);
  zip.extractAllTo(extractDir, true);

  console.log("[zipHelper] Extraction complete");
  return extractDir;
}

/**
 * Read state_snapshot.json from an extracted directory
 * Recursively searches for state_snapshot.json in subdirectories
 * @param extractedDir - Path to the extracted directory
 * @returns JSON string of state snapshot, or null if not found
 */
export function readStateSnapshot(extractedDir: string): string | null {
  const { readdirSync, statSync } = require("fs");

  // Recursive search function
  // First checks the root directory, then recursively searches subdirectories
  function findStateSnapshot(dir: string): string | null {
    try {
      // Check current directory first (most common case)
      const stateSnapshotPath = join(dir, "state_snapshot.json");
      if (existsSync(stateSnapshotPath)) {
        try {
          const content = readFileSync(stateSnapshotPath, "utf-8");
          console.log(
            "[zipHelper] State snapshot found at:",
            stateSnapshotPath
          );
          return content;
        } catch (error) {
          console.error(
            "[zipHelper] Failed to read state_snapshot.json:",
            error
          );
        }
      }

      // If not found in root, recursively search subdirectories
      const entries = readdirSync(dir);
      for (const entry of entries) {
        const fullPath = join(dir, entry);
        try {
          if (
            statSync(fullPath).isDirectory() &&
            !entry.startsWith("__MACOSX") &&
            !entry.startsWith(".")
          ) {
            const found = findStateSnapshot(fullPath);
            if (found) return found;
          }
        } catch (e) {
          // Ignore errors
        }
      }
    } catch (error) {
      // Ignore errors
    }

    return null;
  }

  const content = findStateSnapshot(extractedDir);
  if (!content) {
    console.warn("[zipHelper] state_snapshot.json not found in:", extractedDir);
    return null;
  }

  try {
    const snapshot = JSON.parse(content);
    console.log("[zipHelper] State snapshot loaded:", snapshot.stateRoot);
    return content; // Return as JSON string
  } catch (error) {
    console.error("[zipHelper] Failed to parse state_snapshot.json:", error);
    return null;
  }
}
