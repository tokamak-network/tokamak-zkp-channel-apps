/**
 * Test script for SynthesizerAdapter - Channel 8 with WTON
 *
 * This script tests the l2-state-channel binary command for Channel 8:
 * 1. Extracts proof ZIP file and reads state snapshot
 * 2. Fetches channel info from on-chain (Channel 8 uses WTON)
 * 3. Executes synthesizer binary directly with CLI arguments
 * 4. Verifies output files are generated correctly
 *
 * Note: Channel 8 uses WTON (0x79E0d92670106c85E9067b56B8F674340dCa0Bbd) on Sepolia
 */

import { readFileSync, existsSync, mkdirSync } from "fs";
import { resolve } from "path";
import { spawn } from "child_process";
import { extractZip, readStateSnapshot } from "../src/utils/zipHelper";
import {
  ROLLUP_BRIDGE_CORE_ADDRESS,
  WTON_ADDRESS,
} from "../src/constants/contracts";

const ALCHEMY_KEY = "PbqCcGx1oHN7yNaFdUJUYqPEN0QSp23S";
const SEPOLIA_RPC_URL = `https://eth-sepolia.g.alchemy.com/v2/${ALCHEMY_KEY}`;
const CHANNEL_ID = 8; // Channel 8 uses WTON on Sepolia

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Find synthesizer binary path
 */
function findSynthesizerBinary(): string | null {
  // Get the directory of this test file
  const testFileDir = __dirname;

  // Try to find binary in src/binaries/bin/synthesizer (Electron app structure)
  const electronBinaryPath = resolve(
    testFileDir,
    "../src/binaries/bin/synthesizer"
  );
  if (existsSync(electronBinaryPath)) {
    console.log(`   ✅ Found binary: ${electronBinaryPath}`);
    return electronBinaryPath;
  }

  // Try workspace root paths (if running from Tokamak-zk-EVM workspace)
  const workspaceRootPaths = [
    resolve(testFileDir, "../../../../../dist/macOS/bin/synthesizer"),
    resolve(testFileDir, "../../../../../dist/linux/bin/synthesizer"),
    resolve(
      testFileDir,
      "../../../../../packages/frontend/synthesizer/bin/synthesizer-final"
    ),
    resolve(
      testFileDir,
      "../../../../../packages/frontend/synthesizer/bin/synthesizer-macos-arm64"
    ),
  ];

  for (const path of workspaceRootPaths) {
    if (existsSync(path)) {
      console.log(`   ✅ Found binary: ${path}`);
      return path;
    }
  }

  return null;
}

/**
 * Execute binary command and return result
 */
function executeBinary(
  binaryPath: string,
  args: string[],
  cwd?: string
): Promise<{
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
}> {
  return new Promise((resolve) => {
    console.log(`\n🔧 Executing: ${binaryPath} ${args.join(" ")}\n`);

    const proc = spawn(binaryPath, args, {
      cwd: cwd || process.cwd(),
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env },
      shell: false,
    });

    let stdout = "";
    let stderr = "";

    proc.stdout?.on("data", (data: Buffer) => {
      const text = data.toString();
      stdout += text;
      process.stdout.write(text);
    });

    proc.stderr?.on("data", (data: Buffer) => {
      const text = data.toString();
      stderr += text;
      process.stderr.write(text);
    });

    proc.on("close", (code: number) => {
      resolve({
        success: code === 0,
        stdout,
        stderr,
        exitCode: code || 0,
      });
    });

    proc.on("error", (error: Error) => {
      resolve({
        success: false,
        stdout,
        stderr: stderr + error.message,
        exitCode: -1,
      });
    });
  });
}

/**
 * Verify output files exist and are valid
 */
function verifyOutputFiles(outputDir: string): boolean {
  const requiredFiles = [
    "instance.json",
    "instance_description.json",
    "placementVariables.json",
    "permutation.json",
    "state_snapshot.json",
  ];

  console.log("\n📋 Verifying output files...");
  let allFilesExist = true;

  for (const file of requiredFiles) {
    const filePath = resolve(outputDir, file);
    if (existsSync(filePath)) {
      try {
        const content = readFileSync(filePath, "utf-8");
        const parsed = JSON.parse(content);
        console.log(`   ✅ ${file} (${Object.keys(parsed).length} keys)`);
      } catch (e) {
        console.log(`   ⚠️  ${file} exists but is not valid JSON`);
        allFilesExist = false;
      }
    } else {
      console.log(`   ❌ ${file} not found`);
      allFilesExist = false;
    }
  }

  return allFilesExist;
}

// ============================================================================
// MAIN TEST FUNCTION
// ============================================================================

async function testSynthesizer() {
  console.log(
    "\n╔══════════════════════════════════════════════════════════════╗"
  );
  console.log(
    "║     Testing Synthesizer Binary with onchain-proof-test.zip   ║"
  );
  console.log(
    "╚══════════════════════════════════════════════════════════════╝\n"
  );

  try {
    // Step 1: Find binary
    console.log("🔍 Step 1: Finding synthesizer binary...");
    const binaryPath = findSynthesizerBinary();

    if (!binaryPath) {
      throw new Error(
        "Synthesizer binary not found. Please ensure it exists in:\n" +
          "  - src/binaries/bin/synthesizer (Electron app)\n" +
          "  - dist/macOS/bin/synthesizer (workspace root)\n" +
          "  - packages/frontend/synthesizer/bin/ (development build)"
      );
    }

    console.log(`✅ Found binary: ${binaryPath}\n`);

    // Step 2: Extract ZIP file
    const zipPath = resolve(__dirname, "onchain-proof-test.zip");
    if (!existsSync(zipPath)) {
      throw new Error(`ZIP file not found: ${zipPath}`);
    }

    console.log("📦 Step 2: Extracting ZIP file...");
    const extractedDir = await extractZip(zipPath);
    console.log(`✅ Extracted to: ${extractedDir}\n`);

    // Step 3: Read state_snapshot.json
    console.log("📄 Step 3: Reading state_snapshot.json...");
    const previousState = readStateSnapshot(extractedDir);
    if (!previousState) {
      throw new Error("state_snapshot.json not found in ZIP");
    }

    console.log(`✅ State root: ${previousState.stateRoot}\n`);

    // Step 4: Fetch channel info and participants from on-chain
    console.log("📡 Step 4: Fetching channel info from on-chain...");
    const { JsonRpcProvider, Contract } = await import("ethers");
    const provider = new JsonRpcProvider(SEPOLIA_RPC_URL);
    const bridge = new Contract(
      ROLLUP_BRIDGE_CORE_ADDRESS,
      [
        "function getChannelInfo(uint256 channelId) view returns (address[] allowedTokens, uint8 state, uint256 participantCount, bytes32 initialRoot)",
        "function getChannelParticipants(uint256 channelId) view returns (address[])",
      ],
      provider
    );

    // Get channel info to fetch allowed tokens
    const [allowedTokens, state, participantCount, initialRoot] =
      await bridge.getChannelInfo(CHANNEL_ID);
    if (!allowedTokens || allowedTokens.length === 0) {
      throw new Error(`Channel ${CHANNEL_ID} has no allowed tokens`);
    }

    // Use the first allowed token (should be WTON for Channel 8)
    const tokenAddress = allowedTokens[0];
    console.log(`✅ Channel info fetched:`);
    console.log(`   - Allowed tokens: ${allowedTokens.length}`);
    allowedTokens.forEach((token: string, idx: number) => {
      console.log(`     ${idx + 1}. ${token}`);
    });
    console.log(`   - State: ${state}`);
    console.log(`   - Participants: ${participantCount}`);
    console.log(`   - Initial Root: ${initialRoot}\n`);

    // Get participants
    const participants = await bridge.getChannelParticipants(CHANNEL_ID);
    if (!participants || participants.length < 2) {
      throw new Error(
        `Channel ${CHANNEL_ID} does not have enough participants. Found: ${participants?.length || 0}`
      );
    }

    // Use the second participant as recipient (index 1)
    const recipientAddress = participants[1];
    console.log(`✅ Channel participants: ${participants.length}`);
    console.log(`   Sender (index 0): ${participants[0]}`);
    console.log(`   Recipient (index 1): ${recipientAddress}\n`);

    // Validate that token address matches WTON
    if (tokenAddress.toLowerCase() !== WTON_ADDRESS.toLowerCase()) {
      console.warn(
        `⚠️  Warning: Expected WTON (${WTON_ADDRESS}), but channel uses ${tokenAddress}`
      );
      console.warn(`   Proceeding with token: ${tokenAddress}\n`);
    }

    console.log("🎯 Step 5: Setting up synthesis parameters...");
    console.log(`   Channel ID: ${CHANNEL_ID}`);
    console.log(`   Token: ${tokenAddress} (WTON)`);
    console.log(`   Recipient (L1): ${recipientAddress}`);
    console.log(`   Amount: 1000000000000000000 (1 WTON, 18 decimals)\n`);

    // Step 6: Prepare output directory
    const outputDir = resolve(__dirname, "../test-outputs/test-synthesizer");
    mkdirSync(outputDir, { recursive: true });
    console.log(`📁 Output directory: ${outputDir}\n`);

    // Step 7: Execute synthesizer binary with CLI arguments
    console.log("⚙️  Step 7: Executing synthesizer binary...");

    const args = [
      "l2-state-channel",
      "--channel-id",
      CHANNEL_ID.toString(),
      "--token",
      tokenAddress,
      "--recipient",
      recipientAddress,
      "--amount",
      "1000000000000000000", // 1 WTON (18 decimals)
      "--rollup-bridge",
      ROLLUP_BRIDGE_CORE_ADDRESS,
      "--sender-index",
      "0",
      "--rpc-url",
      SEPOLIA_RPC_URL,
      "--output-dir",
      outputDir,
    ];

    // Execute binary (now with static imports, should work independently)
    const result = await executeBinary(binaryPath, args);

    if (!result.success) {
      throw new Error(
        `Binary execution failed with exit code ${result.exitCode}\n` +
          `STDERR: ${result.stderr}\n` +
          `STDOUT: ${result.stdout}`
      );
    }

    console.log("\n✅ Binary execution completed successfully!");

    // Step 8: Verify output files
    const filesValid = verifyOutputFiles(outputDir);

    if (!filesValid) {
      throw new Error("Some required output files are missing or invalid");
    }

    // Step 9: Read and display state snapshot
    const stateSnapshotPath = resolve(outputDir, "state_snapshot.json");
    if (existsSync(stateSnapshotPath)) {
      const stateSnapshot = JSON.parse(
        readFileSync(stateSnapshotPath, "utf-8")
      );
      console.log("\n📄 State Snapshot:");
      console.log(`   State Root: ${stateSnapshot.stateRoot}`);
      console.log(
        `   Storage Entries: ${stateSnapshot.storageEntries?.length || 0}`
      );
      console.log(
        `   Registered Keys: ${stateSnapshot.registeredKeys?.length || 0}`
      );
      console.log(
        `   User L2 Addresses: ${stateSnapshot.userL2Addresses?.length || 0}`
      );
    }

    console.log(
      "\n\n╔══════════════════════════════════════════════════════════════╗"
    );
    console.log(
      "║                    Test Passed!                              ║"
    );
    console.log(
      "╚══════════════════════════════════════════════════════════════╝\n"
    );
    console.log("✅ Synthesizer binary test completed successfully!");
    console.log(`📁 Output: ${outputDir}\n`);
    console.log("🎉 All files generated correctly!\n");
  } catch (error: unknown) {
    const err = error as Error;
    console.error("\n❌ Test failed:");
    console.error(`   Error: ${err.message}`);
    if (err.stack) {
      console.error(`   Stack: ${err.stack}`);
    }
    process.exit(1);
  }
}

// Run the test
testSynthesizer()
  .then(() => {
    process.exit(0);
  })
  .catch((error: unknown) => {
    const err = error as Error;
    console.error("\n❌ Test failed:");
    console.error(`   Error: ${err.message}`);
    if (err.stack) {
      console.error(`   Stack: ${err.stack}`);
    }
    process.exit(1);
  });
