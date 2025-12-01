/**
 * ZIP Helper
 * 
 * Utilities for extracting ZIP files and reading state snapshots.
 */

import { tmpdir } from 'os';
import { join } from 'path';
import { mkdirSync, readFileSync, existsSync } from 'fs';
import AdmZip from 'adm-zip';

/**
 * Extract a ZIP file to a temporary directory
 * @param zipPath - Path to the ZIP file
 * @returns Path to the extracted directory
 */
export async function extractZip(zipPath: string): Promise<string> {
  const extractDir = join(tmpdir(), `zkp-extract-${Date.now()}`);
  mkdirSync(extractDir, { recursive: true });

  console.log('[zipHelper] Extracting ZIP:', zipPath);
  console.log('[zipHelper] Extract to:', extractDir);

  const zip = new AdmZip(zipPath);
  zip.extractAllTo(extractDir, true);

  console.log('[zipHelper] Extraction complete');
  return extractDir;
}

/**
 * Read state_snapshot.json from an extracted directory
 * @param extractedDir - Path to the extracted directory
 * @returns Parsed state snapshot object, or null if not found
 */
export function readStateSnapshot(extractedDir: string): any | null {
  const stateSnapshotPath = join(extractedDir, 'state_snapshot.json');

  if (!existsSync(stateSnapshotPath)) {
    console.warn('[zipHelper] state_snapshot.json not found in:', extractedDir);
    return null;
  }

  try {
    const content = readFileSync(stateSnapshotPath, 'utf-8');
    const snapshot = JSON.parse(content);
    console.log('[zipHelper] State snapshot loaded:', snapshot.stateRoot);
    return snapshot;
  } catch (error) {
    console.error('[zipHelper] Failed to read state_snapshot.json:', error);
    return null;
  }
}
