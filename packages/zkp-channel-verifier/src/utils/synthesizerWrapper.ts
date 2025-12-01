/**
 * Synthesizer Wrapper
 *
 * Wraps the Synthesizer binary from Tokamak-zk-EVM to generate circuit outputs.
 * Uses the built binary executable instead of TypeScript source for production.
 */

import {
  mkdirSync,
  writeFileSync,
  readFileSync,
  unlinkSync,
  existsSync,
} from "fs";
import { resolve } from "path";
import { spawn } from "child_process";
import { tmpdir } from "os";

export interface SynthesizerOptions {
  rpcUrl: string;
  channelId: number;
  contractAddress: string;
  recipientAddress: string;
  amount: string;
  rollupBridgeAddress: string;
  senderIndex?: number;
  previousStateJson?: string;
  outputDir: string;
}

export interface SynthesizerResult {
  success: boolean;
  outputDir?: string;
  stateSnapshot?: string;
  error?: string;
  placements?: number;
  stateRoot?: string;
}

/**
 * Find synthesizer binary path
 */
function findSynthesizerBinary(): string | null {
  const tokamakRoot = resolve(__dirname, "../../../../Tokamak-zk-EVM");

  // Try dist/macOS/bin/synthesizer first (production)
  const distPaths = [
    resolve(tokamakRoot, "dist/macOS/bin/synthesizer"),
    resolve(tokamakRoot, "dist/linux/bin/synthesizer"),
    resolve(tokamakRoot, "dist/windows/bin/synthesizer.exe"),
  ];

  for (const path of distPaths) {
    if (existsSync(path)) {
      return path;
    }
  }

  // Try synthesizer package bin directory (development)
  const synthesizerBinPaths = [
    resolve(tokamakRoot, "packages/frontend/synthesizer/bin/synthesizer-final"),
    resolve(
      tokamakRoot,
      "packages/frontend/synthesizer/bin/synthesizer-macos-arm64"
    ),
    resolve(
      tokamakRoot,
      "packages/frontend/synthesizer/bin/synthesizer-macos-x64"
    ),
    resolve(
      tokamakRoot,
      "packages/frontend/synthesizer/bin/synthesizer-linux-x64"
    ),
  ];

  for (const path of synthesizerBinPaths) {
    if (existsSync(path)) {
      return path;
    }
  }

  return null;
}

/**
 * Run synthesizer to generate circuit outputs
 * Uses the built binary executable
 */
export async function runSynthesizer(
  options: SynthesizerOptions
): Promise<SynthesizerResult> {
  try {
    console.log("[Synthesizer] Starting with options:", {
      channelId: options.channelId,
      contractAddress: options.contractAddress,
      recipientAddress: options.recipientAddress,
      amount: options.amount,
      senderIndex: options.senderIndex || 0,
    });

    // Find synthesizer binary
    const binaryPath = findSynthesizerBinary();
    if (!binaryPath) {
      throw new Error(
        "Synthesizer binary not found. Please build the binary first or ensure it's in the expected location."
      );
    }

    console.log(`[Synthesizer] Using binary: ${binaryPath}`);

    // Create output directory
    mkdirSync(options.outputDir, { recursive: true });

    // Save previous state to temporary file if provided
    let previousStatePath: string | undefined = undefined;
    if (options.previousStateJson) {
      try {
        const previousState = JSON.parse(options.previousStateJson);
        previousStatePath = resolve(
          tmpdir(),
          `previous-state-${Date.now()}.json`
        );
        writeFileSync(
          previousStatePath,
          JSON.stringify(previousState, null, 2)
        );
        console.log(
          "[Synthesizer] Previous state loaded:",
          previousState.stateRoot
        );
      } catch (e) {
        console.warn("[Synthesizer] Failed to parse previousStateJson:", e);
      }
    }

    // Build command arguments
    const args = [
      "l2-state-channel",
      "--channel-id",
      options.channelId.toString(),
      "--token",
      options.contractAddress,
      "--recipient",
      options.recipientAddress,
      "--amount",
      options.amount,
      "--rollup-bridge",
      options.rollupBridgeAddress,
      "--sender-index",
      (options.senderIndex || 0).toString(),
      "--rpc-url",
      options.rpcUrl,
      "--output-dir",
      options.outputDir,
    ];

    if (previousStatePath) {
      args.push("--previous-state", previousStatePath);
    }

    // Execute binary
    return new Promise((promiseResolve) => {
      const spawnOptions: Parameters<typeof spawn>[2] = {
        stdio: ["pipe", "pipe", "pipe"],
        env: { ...process.env },
        shell: false,
      };

      const proc = spawn(binaryPath, args, spawnOptions);

      let stdout = "";
      let stderr = "";

      proc.stdout?.on("data", (data: Buffer) => {
        const text = data.toString();
        stdout += text;
        process.stdout.write(`[Synthesizer] ${text}`);
      });

      proc.stderr?.on("data", (data: Buffer) => {
        const text = data.toString();
        stderr += text;
        process.stderr.write(`[Synthesizer] ${text}`);
      });

      proc.on("close", (code: number) => {
        // Clean up previous state file
        if (previousStatePath) {
          try {
            unlinkSync(previousStatePath);
          } catch (e) {
            // Ignore cleanup errors
          }
        }

        // Read state_snapshot.json from output directory
        const stateSnapshotPath = resolve(
          options.outputDir,
          "state_snapshot.json"
        );

        if (code === 0) {
          // Success - read output files
          try {
            let stateSnapshot: string | undefined = undefined;
            if (existsSync(stateSnapshotPath)) {
              const stateContent = readFileSync(stateSnapshotPath, "utf-8");
              const state = JSON.parse(stateContent);
              stateSnapshot = JSON.stringify(state, null, 2);

              promiseResolve({
                success: true,
                outputDir: options.outputDir,
                stateSnapshot,
                stateRoot: state.stateRoot,
                placements: 0, // Will be read from instance.json if needed
              });
            } else {
              promiseResolve({
                success: true,
                outputDir: options.outputDir,
                error: "State snapshot not found in output directory",
              });
            }
          } catch (error: any) {
            promiseResolve({
              success: false,
              error: `Failed to read output: ${error.message}. stdout: ${stdout}, stderr: ${stderr}`,
            });
          }
        } else {
          // Error
          promiseResolve({
            success: false,
            error: `Synthesizer exited with code ${code}. stdout: ${stdout}, stderr: ${stderr}`,
          });
        }
      });

      proc.on("error", (error: Error) => {
        // Clean up previous state file
        if (previousStatePath) {
          try {
            unlinkSync(previousStatePath);
          } catch (e) {
            // Ignore cleanup errors
          }
        }

        promiseResolve({
          success: false,
          error: `Failed to spawn process: ${error.message}`,
        });
      });
    });
  } catch (error: any) {
    console.error("[Synthesizer] Error:", error);
    return {
      success: false,
      error: error.message || String(error),
    };
  }
}
