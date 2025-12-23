/**
 * ZIP Helper
 *
 * Utilities for extracting ZIP files and reading state snapshots.
 */

import { tmpdir } from "os";
import { join } from "path";
import { mkdirSync, readFileSync, existsSync, readdirSync, statSync } from "fs";
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
 * Find the actual content directory (handles case where ZIP contains a single folder)
 * @param extractedDir - Path to the extracted directory
 * @returns Path to the directory containing JSON files
 */
export function findContentDir(extractedDir: string): string {
  try {
    console.log("[zipHelper] Finding content dir in:", extractedDir);
    const entries = readdirSync(extractedDir);
    console.log("[zipHelper] Entries in extractedDir:", entries);

    // Filter out __MACOSX and other system files
    const validEntries = entries.filter(
      (entry) => !entry.startsWith("__MACOSX") && !entry.startsWith(".")
    );
    console.log(
      "[zipHelper] Valid entries (excluding __MACOSX):",
      validEntries
    );

    // If there's exactly one valid directory entry, use that
    if (validEntries.length === 1) {
      const entryPath = join(extractedDir, validEntries[0]);
      const stat = statSync(entryPath);
      console.log(
        "[zipHelper] Single valid entry:",
        validEntries[0],
        "isDirectory:",
        stat.isDirectory()
      );
      if (stat.isDirectory()) {
        console.log("[zipHelper] Found single folder, using:", entryPath);
        return entryPath;
      }
    }

    // If there are multiple entries, try to find a directory (excluding __MACOSX)
    if (validEntries.length > 1) {
      for (const entry of validEntries) {
        const entryPath = join(extractedDir, entry);
        const stat = statSync(entryPath);
        if (stat.isDirectory()) {
          console.log(
            "[zipHelper] Found directory entry:",
            entry,
            "using:",
            entryPath
          );
          return entryPath;
        }
      }
    }

    // Otherwise, use the extracted directory directly
    console.log("[zipHelper] Using extractedDir directly:", extractedDir);
    return extractedDir;
  } catch (error) {
    console.warn("[zipHelper] Error finding content directory:", error);
    return extractedDir;
  }
}

/**
 * Read state_snapshot.json from an extracted directory
 * @param extractedDir - Path to the extracted directory (or contentDir if already found)
 * @returns Parsed state snapshot object, or null if not found
 */
export function readStateSnapshot(extractedDir: string): any | null {
  // If the path already points to a content directory (no subdirectory), use it directly
  // Otherwise, find the content directory
  const contentDir = findContentDir(extractedDir);
  const stateSnapshotPath = join(contentDir, "state_snapshot.json");

  if (!existsSync(stateSnapshotPath)) {
    console.warn("[zipHelper] state_snapshot.json not found in:", contentDir);
    return null;
  }

  try {
    const content = readFileSync(stateSnapshotPath, "utf-8");
    const snapshot = JSON.parse(content);
    console.log("[zipHelper] State snapshot loaded:", snapshot.stateRoot);
    return snapshot;
  } catch (error) {
    console.error("[zipHelper] Failed to read state_snapshot.json:", error);
    return null;
  }
}

/**
 * Read transaction-info.json from an extracted directory
 * @param extractedDir - Path to the extracted directory
 * @returns Parsed transaction info object, or null if not found
 */
export function readTransactionInfo(extractedDir: string): {
  initializedTxHash?: string;
  channelId?: string;
  l2PrivateKey?: string;
  toAddress?: string;
  tokenAmount?: string;
} | null {
  const contentDir = findContentDir(extractedDir);
  const transactionInfoPath = join(contentDir, "transaction-info.json");

  console.log("[zipHelper] Looking for transaction-info.json in:", contentDir);
  console.log("[zipHelper] Full path:", transactionInfoPath);

  if (!existsSync(transactionInfoPath)) {
    console.warn("[zipHelper] transaction-info.json not found in:", contentDir);
    // List files in contentDir for debugging
    try {
      const files = readdirSync(contentDir);
      console.log("[zipHelper] Files in contentDir:", files);
    } catch (e) {
      console.error("[zipHelper] Failed to list files:", e);
    }
    return null;
  }

  try {
    const content = readFileSync(transactionInfoPath, "utf-8");
    console.log("[zipHelper] transaction-info.json content:", content);
    const transactionInfo = JSON.parse(content);
    console.log("[zipHelper] Transaction info loaded:", transactionInfo);
    return transactionInfo;
  } catch (error) {
    console.error("[zipHelper] Failed to read transaction-info.json:", error);
    return null;
  }
}

/**
 * @deprecated Use readTransactionInfo instead
 * Read channel-info.json from an extracted directory (for backward compatibility)
 */
export function readChannelInfo(
  extractedDir: string
): { initializedTxHash?: string } | null {
  return readTransactionInfo(extractedDir);
}

/**
 * Find proof.json path in an extracted directory (recursive search)
 * @param extractedDir - Path to the extracted directory
 * @returns Path to proof.json, or null if not found
 */
export function findProofJson(extractedDir: string): string | null {
  function searchRecursive(dir: string): string | null {
    try {
      const entries = readdirSync(dir);

      for (const entry of entries) {
        const fullPath = join(dir, entry);
        const stat = statSync(fullPath);

        if (stat.isDirectory()) {
          const found = searchRecursive(fullPath);
          if (found) return found;
        } else if (entry === "proof.json") {
          console.log("[zipHelper] Found proof.json at:", fullPath);
          return fullPath;
        }
      }
    } catch (error) {
      console.error("[zipHelper] Error searching for proof.json:", error);
    }

    return null;
  }

  const proofPath = searchRecursive(extractedDir);
  if (!proofPath) {
    console.warn("[zipHelper] proof.json not found in:", extractedDir);
  }
  return proofPath;
}
