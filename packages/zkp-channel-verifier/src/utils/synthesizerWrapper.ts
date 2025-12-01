/**
 * Synthesizer Wrapper
 *
 * Executes the SynthesizerAdapter via tsx, using the source code from Tokamak-zk-EVM.
 * The binary created by tokamak-cli --install is used to verify the environment,
 * but we execute the TypeScript source directly since the binary's CLI doesn't
 * expose synthesizeL2StateChannel.
 */

import { spawn } from "child_process";
import {
  mkdirSync,
  readFileSync,
  writeFileSync,
  existsSync,
  unlinkSync,
} from "fs";
import { resolve } from "path";
import { tmpdir } from "os";
import { BINARIES } from "./binaryConfig";

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
 * Run synthesizer using tsx to execute TypeScript source
 *
 * Verifies that the binary exists (created by tokamak-cli --install),
 * then uses tsx to run the TypeScript source directly since the binary's
 * CLI doesn't expose synthesizeL2StateChannel.
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

    // Note: We use TypeScript source directly via tsx since the binary's CLI
    // doesn't expose synthesizeL2StateChannel. The binaries are used for
    // preprocess/prove/verify steps.
    console.log("[Synthesizer] Using TypeScript source via tsx");

    // Create output directory
    mkdirSync(options.outputDir, { recursive: true });

    // Get the path to Tokamak-zk-EVM synthesizer source
    // Try multiple possible locations
    const possiblePaths = [
      // From zkp-channel-verifier to Tokamak-zk-EVM (same level)
      resolve(
        __dirname,
        "../../../../../../Tokamak-zk-EVM/packages/frontend/synthesizer/src/interface/adapters/synthesizerAdapter.ts"
      ),
      // From current working directory
      resolve(
        process.cwd(),
        "../../Tokamak-zk-EVM/packages/frontend/synthesizer/src/interface/adapters/synthesizerAdapter.ts"
      ),
      // Absolute path (common location)
      "/Users/son-yeongseong/Desktop/dev/Tokamak-zk-EVM/packages/frontend/synthesizer/src/interface/adapters/synthesizerAdapter.ts",
    ];

    let finalPath: string | null = null;
    for (const path of possiblePaths) {
      if (existsSync(path)) {
        finalPath = path;
        break;
      }
    }

    if (!finalPath) {
      throw new Error(
        `SynthesizerAdapter source not found. Tried:\n` +
          possiblePaths.map((p) => `  - ${p}`).join("\n") +
          `\nPlease ensure Tokamak-zk-EVM is available at the expected location.`
      );
    }

    console.log(`[Synthesizer] Using SynthesizerAdapter from: ${finalPath}`);

    // Extract tokamak root from finalPath for cwd
    const tokamakRoot = finalPath.replace(
      /\/packages\/frontend\/synthesizer\/src\/interface\/adapters\/synthesizerAdapter\.ts$/,
      ""
    );

    // Create a temporary TypeScript script (use .mts for ESM)
    const scriptPath = resolve(tmpdir(), `synthesizer_l2_${Date.now()}.mts`);
    const resultPath = resolve(
      tmpdir(),
      `synthesizer_result_${Date.now()}.json`
    );

    // Generate the script content (ESM format)
    // Note: SynthesizerAdapter now handles state snapshot normalization internally
    const scriptContent = `import { SynthesizerAdapter } from '${finalPath}';
import { writeFileSync } from 'fs';

async function run() {
  try {
    const options = ${JSON.stringify(options)};
    
    const adapter = new SynthesizerAdapter({ rpcUrl: options.rpcUrl });
    
    let previousState = undefined;
    if (options.previousStateJson) {
      // SynthesizerAdapter will automatically normalize the state snapshot
      // (converts bytes objects to hex strings, strings to bigints, etc.)
      previousState = JSON.parse(options.previousStateJson);
    }
    
    const result = await adapter.synthesizeL2StateChannel(
      options.channelId,
      {
        to: options.recipientAddress,
        tokenAddress: options.contractAddress,
        amount: options.amount,
        rollupBridgeAddress: options.rollupBridgeAddress,
        senderIdx: options.senderIndex || 0,
      },
      {
        previousState,
        outputPath: options.outputDir,
      }
    );
    
    const stateSnapshotJson = JSON.stringify(
      result.state,
      (_key, value) => (typeof value === 'bigint' ? value.toString() : value),
      2
    );
    
    writeFileSync('${resultPath}', JSON.stringify({
      success: true,
      outputDir: options.outputDir,
      stateSnapshot: stateSnapshotJson,
      placements: result.placementVariables.length,
      stateRoot: result.state.stateRoot,
    }, null, 2));
    
    process.exit(0);
  } catch (error: any) {
    writeFileSync('${resultPath}', JSON.stringify({
      success: false,
      error: error.message || String(error),
    }, null, 2));
    process.exit(1);
  }
}

run();
`;

    // Write the script file
    writeFileSync(scriptPath, scriptContent);

    // Execute using tsx
    return new Promise((resolvePromise) => {
      console.log("[Synthesizer] Executing via tsx:", scriptPath);

      // Use tsx with ESM support (tsx handles .mts files as ESM by default)
      const proc = spawn("npx", ["tsx", scriptPath], {
        stdio: ["pipe", "pipe", "pipe"],
        cwd: resolve(tokamakRoot, "packages/frontend/synthesizer"),
        env: {
          ...process.env,
        },
      });

      let stdout = "";
      let stderr = "";

      proc.stdout?.on("data", (data: Buffer) => {
        const text = data.toString();
        stdout += text;
        console.log("[Synthesizer] stdout:", text);
      });

      proc.stderr?.on("data", (data: Buffer) => {
        const text = data.toString();
        stderr += text;
        console.error("[Synthesizer] stderr:", text);
      });

      proc.on("close", (code: number) => {
        // Clean up script file
        try {
          if (existsSync(scriptPath)) {
            unlinkSync(scriptPath);
          }
        } catch (e) {
          // Ignore cleanup errors
        }

        // Check if result file exists (even if exit code is non-zero, it might have written an error)
        if (existsSync(resultPath)) {
          try {
            const resultData = readFileSync(resultPath, "utf-8");
            const result = JSON.parse(resultData);

            // Clean up result file
            try {
              if (existsSync(resultPath)) {
                unlinkSync(resultPath);
              }
            } catch (e) {
              // Ignore cleanup errors
            }

            if (result.success) {
              console.log("[Synthesizer] Completed successfully");
            } else {
              console.error("[Synthesizer] Synthesis failed:", result.error);
            }
            resolvePromise(result);
            return;
          } catch (e) {
            console.error("[Synthesizer] Failed to read result:", e);
          }
        }

        // If no result file or failed to read it
        console.error("[Synthesizer] Process failed with code:", code);
        console.error("[Synthesizer] stdout:", stdout);
        console.error("[Synthesizer] stderr:", stderr);
        resolvePromise({
          success: false,
          error: stderr || stdout || `Process exited with code ${code}`,
        });
      });

      proc.on("error", (error: Error) => {
        console.error("[Synthesizer] Failed to start process:", error);
        resolvePromise({
          success: false,
          error: error.message,
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
