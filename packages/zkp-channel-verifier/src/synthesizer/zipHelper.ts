import fs from "fs";
import path from "path";
import { app } from "electron";
// Use jszip instead of adm-zip for consistency
import JSZip from "jszip";

/**
 * Extract ZIP file containing Synthesizer output files to a temporary directory
 * @param zipPath Path to the ZIP file
 * @returns Path to the extracted directory
 */
export async function extractZip(zipPath: string): Promise<string> {
  // Read ZIP file
  const zipBuffer = fs.readFileSync(zipPath);
  const zip = await JSZip.loadAsync(zipBuffer);

  // Create temporary directory for extraction
  const tempDir = path.resolve(
    app.getPath("userData"),
    "temp",
    `extracted_${Date.now()}`
  );

  fs.mkdirSync(tempDir, { recursive: true });

  // Extract all files
  const fileNames = Object.keys(zip.files);
  let foundStateSnapshot = false;
  let stateSnapshotRelativePath: string | null = null;

  for (const fileName of fileNames) {
    const file = zip.files[fileName];
    if (!file.dir) {
      const filePath = path.resolve(tempDir, fileName);
      const dir = path.dirname(filePath);
      fs.mkdirSync(dir, { recursive: true });
      const content = await file.async("nodebuffer");
      fs.writeFileSync(filePath, content);

      // Check if this is state_snapshot.json (case-insensitive, anywhere in ZIP)
      const normalizedFileName = fileName.toLowerCase().replace(/\\/g, "/");
      if (normalizedFileName.endsWith("state_snapshot.json")) {
        foundStateSnapshot = true;
        stateSnapshotRelativePath = fileName;
      }
    }
  }

  // Note: We only check for state_snapshot.json for now.
  // Other files (instance.json, placementVariables.json, permutation.json)
  // may be added in the future but are not required at this time.
  if (!foundStateSnapshot) {
    // List all files in ZIP for debugging
    const allFiles = fileNames.filter((name) => !zip.files[name].dir);
    console.log("ZIP contents:", allFiles);

    // Clean up on error
    fs.rmSync(tempDir, { recursive: true, force: true });
    throw new Error(
      `Missing state_snapshot.json in ZIP file. Found files: ${allFiles.join(", ")}`
    );
  }

  return tempDir;
}

/**
 * Read state_snapshot.json from extracted directory
 * Searches recursively for state_snapshot.json in any subdirectory
 * @param extractedDir Path to extracted directory
 * @returns State snapshot object or null if not found
 */
export function readStateSnapshot(extractedDir: string): string | undefined {
  // First try root directory
  const stateSnapshotPath = path.resolve(extractedDir, "state_snapshot.json");
  if (fs.existsSync(stateSnapshotPath)) {
    return fs.readFileSync(stateSnapshotPath, "utf-8");
  }

  // Search recursively in subdirectories
  function findStateSnapshot(dir: string): string | null {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.resolve(dir, entry.name);

      if (
        entry.isFile() &&
        entry.name.toLowerCase() === "state_snapshot.json"
      ) {
        return fullPath;
      }

      if (entry.isDirectory()) {
        const found = findStateSnapshot(fullPath);
        if (found) {
          return found;
        }
      }
    }

    return null;
  }

  const foundPath = findStateSnapshot(extractedDir);
  if (foundPath) {
    return fs.readFileSync(foundPath, "utf-8");
  }

  return undefined;
}
