/**
 * Test script for SynthesizerAdapter - Channel 8 with WTON
 *
 * This script tests the synthesizeL2StateChannel functionality for Channel 8:
 * 1. Fetches channel info from on-chain (Channel 8 uses WTON)
 * 2. Uses WTON token address from channel's allowedTokens
 * 3. Generates a WTON transfer proof
 *
 * Note: Channel 8 uses WTON (0x79E0d92670106c85E9067b56B8F674340dCa0Bbd) on Sepolia
 */

import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { extractZip, readStateSnapshot } from "../src/utils/zipHelper";
import { runSynthesizer } from "../src/utils/synthesizerWrapper";
import {
  SEPOLIA_RPC_URL,
  ROLLUP_BRIDGE_CORE_ADDRESS,
  WTON_ADDRESS,
  DEFAULT_CHANNEL_CONFIG,
  ROLLUP_BRIDGE_CORE_ABI,
} from "../src/constants/contracts";

// Use constants from centralized configuration
const CHANNEL_ID = DEFAULT_CHANNEL_CONFIG.CHANNEL_ID;

async function testSynthesizer() {
  console.log(
    "\n╔══════════════════════════════════════════════════════════════╗"
  );
  console.log(
    "║     Testing SynthesizerAdapter with onchain-proof-test.zip   ║"
  );
  console.log(
    "╚══════════════════════════════════════════════════════════════╝\n"
  );

  try {
    // Step 1: Extract ZIP file
    const zipPath = resolve(__dirname, "onchain-proof-test.zip");
    if (!existsSync(zipPath)) {
      throw new Error(`ZIP file not found: ${zipPath}`);
    }

    console.log("📦 Step 1: Extracting ZIP file...");
    const extractedDir = await extractZip(zipPath);
    console.log(`✅ Extracted to: ${extractedDir}\n`);

    // Step 2: Read state_snapshot.json
    console.log("📄 Step 2: Reading state_snapshot.json...");
    const previousState = readStateSnapshot(extractedDir);
    if (!previousState) {
      throw new Error("state_snapshot.json not found in ZIP");
    }

    console.log(`✅ State root: ${previousState.stateRoot}\n`);

    // Step 3: Read instance.json to get channel info (search recursively)
    console.log("📋 Step 3: Reading instance.json for channel info...");
    const { readdirSync, statSync } = require("fs");

    function findInstanceJson(dir: string): string | null {
      const instancePath = resolve(dir, "instance.json");
      if (existsSync(instancePath)) {
        return instancePath;
      }

      try {
        const entries = readdirSync(dir);
        for (const entry of entries) {
          const fullPath = resolve(dir, entry);
          try {
            if (
              statSync(fullPath).isDirectory() &&
              !entry.startsWith("__MACOSX") &&
              !entry.startsWith(".")
            ) {
              const found = findInstanceJson(fullPath);
              if (found) return found;
            }
          } catch (e) {
            // Ignore errors
          }
        }
      } catch (e) {
        // Ignore errors
      }
      return null;
    }

    const instancePath = findInstanceJson(extractedDir);
    if (!instancePath) {
      throw new Error("instance.json not found in ZIP");
    }

    const instance = JSON.parse(readFileSync(instancePath, "utf-8"));
    console.log(
      `✅ Instance loaded (a_pub_user length: ${instance.a_pub_user?.length || 0})\n`
    );

    // Step 4: Fetch channel info and participants from on-chain
    // synthesizeL2StateChannel expects L1 addresses, not L2 addresses
    console.log("📡 Step 4: Fetching channel info from on-chain...");
    const { JsonRpcProvider, Contract } = await import("ethers");
    const provider = new JsonRpcProvider(SEPOLIA_RPC_URL);
    const bridge = new Contract(
      ROLLUP_BRIDGE_CORE_ADDRESS,
      ROLLUP_BRIDGE_CORE_ABI,
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

    // Step 6: Run synthesizer
    console.log("⚙️  Step 6: Running SynthesizerAdapter...");
    const outputDir = resolve(__dirname, "../test-outputs/test-synthesizer");

    const result = await runSynthesizer({
      rpcUrl: SEPOLIA_RPC_URL,
      channelId: CHANNEL_ID,
      contractAddress: tokenAddress, // Use WTON from channel's allowedTokens
      recipientAddress: recipientAddress,
      amount: "1000000000000000000", // 1 WTON (18 decimals)
      rollupBridgeAddress: ROLLUP_BRIDGE_CORE_ADDRESS,
      senderIndex: 0,
      previousStateJson: JSON.stringify(previousState, (_key, value) =>
        typeof value === "bigint" ? value.toString() : value
      ),
      outputDir: outputDir,
    });

    if (result.success) {
      console.log("\n✅ Synthesis completed successfully!");
      console.log(`   Output directory: ${result.outputDir}`);
      console.log(`   Placements: ${result.placements}`);
      console.log(`   New state root: ${result.stateRoot}`);
      console.log(`\n📁 Files generated in: ${outputDir}`);
      console.log("   - instance.json");
      console.log("   - placementVariables.json");
      console.log("   - permutation.json");
      console.log("   - state_snapshot.json");
    } else {
      console.error("\n❌ Synthesis failed:");
      console.error(`   Error: ${result.error}`);
      process.exit(1);
    }
  } catch (error: any) {
    console.error("\n❌ Test failed:");
    console.error(`   Error: ${error.message}`);
    if (error.stack) {
      console.error(`   Stack: ${error.stack}`);
    }
    process.exit(1);
  }
}

// Run the test
testSynthesizer();
