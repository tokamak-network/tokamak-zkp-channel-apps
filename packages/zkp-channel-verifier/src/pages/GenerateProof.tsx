import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Zap,
  Info,
  FileText,
  Users,
  Coins,
  ArrowLeft,
  Check,
  Download,
  RefreshCw,
  Database,
} from "lucide-react";
import { ethers } from "ethers";
import { Address } from "viem";
import Layout from "@/components/Layout";
import GenerationOverview from "@/components/GenerationOverview";
import ProofGeneration from "@/components/ProofGeneration";
import {
  getChannelParticipants,
  getChannelTargetContract,
  getTokenSymbol,
  getChannelInfo,
  getChannelStateString,
  getERC20TokenInfo,
} from "@/contracts/RollupBridgeCore";
import { storage } from "@/utils/storage";
import { deriveL2AddressFromPrivateKey } from "@/utils/l2KeyUtils";

interface UploadedFile {
  name: string;
  path: string;
  content: string;
  isZip?: boolean; // true if this is a ZIP file (path points to extracted directory)
}

interface ChannelBalance {
  address: string;
  mptKey: string;
  balance: string;
}

interface ChannelState {
  stateRoot: string;
  source: string;
  participants: ChannelBalance[];
}

// Parse get-balances output
function parseGetBalancesOutput(output: string): ChannelState | null {
  try {
    const lines = output.split("\n");
    let stateRoot = "";
    let source = "";
    const participants: ChannelBalance[] = [];

    let currentParticipant: Partial<ChannelBalance> = {};

    for (const line of lines) {
      if (line.includes("State Root:")) {
        stateRoot = line.split("State Root:")[1].trim();
      } else if (line.includes("Source:")) {
        source = line.split("Source:")[1].trim();
      } else if (line.match(/^\s+\d+\.\s+0x[a-fA-F0-9]{40}/)) {
        // Participant address line (e.g., "  1. 0xF9Fa94D45C49e879E46Ea783fc133F41709f3bc7")
        if (currentParticipant.address) {
          participants.push(currentParticipant as ChannelBalance);
        }
        currentParticipant = {
          address: line.match(/0x[a-fA-F0-9]{40}/)?.[0] || "",
        };
      } else if (line.includes("L2 MPT Key:")) {
        currentParticipant.mptKey = line.split("L2 MPT Key:")[1].trim();
      } else if (line.includes("Balance:")) {
        currentParticipant.balance = line.split("Balance:")[1].trim();
      }
    }

    // Add last participant
    if (currentParticipant.address) {
      participants.push(currentParticipant as ChannelBalance);
    }

    return { stateRoot, source, participants };
  } catch (error) {
    console.error("Failed to parse get-balances output:", error);
    return null;
  }
}

const GenerateProof: React.FC = () => {
  const navigate = useNavigate();
  const [stateFile, setStateFile] = useState<UploadedFile | null>(null);
  const [l2PrivateKey, setL2PrivateKey] = useState(
    "0x0cc941e930e8dd1803e7319d1da2fffb88e37b0e99297401cabc3c679bf4885f"
  ); // L2 private key input
  const [l2Address, setL2Address] = useState(""); // Derived L2 address
  const [isDerivingAddress, setIsDerivingAddress] = useState(false);
  const [recipientAddress, setRecipientAddress] = useState(
    "0x47f831e21935601cbf9fa1467ac97a653cfe0f23"
  ); // To address (recipient)
  const [inputMode, setInputMode] = useState<"select" | "manual">("select");
  const [amount, setAmount] = useState("");
  const [selectedToken, setSelectedToken] = useState("ETH"); // 선택된 토큰 심볼 (기본값 ETH)
  const [allowedTokenAddresses, setAllowedTokenAddresses] = useState<string[]>(
    []
  ); // 채널의 allowedTokens 주소 배열
  const [tokenInfo, setTokenInfo] = useState<{
    symbol: string;
    decimals: number;
  } | null>(null); // 현재 선택된 토큰의 정보
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationComplete, setGenerationComplete] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [outputZipPath, setOutputZipPath] = useState<string | null>(null);
  const [newStateSnapshot, setNewStateSnapshot] = useState<string | null>(null); // For development: direct state_snapshot.json download

  // 온체인 데이터
  const [channelId, setChannelId] = useState<string>("1"); // 채널 ID (기본값: 3, Sepolia testnet)
  const [supportedTokens, setSupportedTokens] = useState<string[]>([
    "ETH",
    "WTON",
    "USDT",
  ]); // 기본 토큰 목록
  const [channelParticipants, setChannelParticipants] = useState<
    { address: string; label: string }[]
  >([
    {
      address: "0x1234567890123456789012345678901234567890",
      label: "Participant 1",
    },
    {
      address: "0x9876543210987654321098765432109876543210",
      label: "Participant 2",
    },
  ]);
  const [isLoadingChannelData, setIsLoadingChannelData] = useState(false);

  // Channel state
  const [channelState, setChannelState] = useState<ChannelState | null>(null);
  const [isLoadingState, setIsLoadingState] = useState(false);
  const [initialRoot, setInitialRoot] = useState<string>(""); // Channel's initial root
  const [initTx, setInitTx] = useState<string>(""); // Channel initialization transaction hash

  // Load channel state on channelId change
  useEffect(() => {
    if (!channelId) {
      setChannelState(null);
      setInitialRoot("");
      return;
    }

    let cancelled = false;

    const loadChannelState = async () => {
      setIsLoadingState(true);

      try {
        const settings = storage.getSettings();
        const rpcUrl = settings.rpcUrl;

        // Call get-balances without snapshot (on-chain initial state)
        const result = await window.electron.invoke("get-balances", {
          channelId,
          rpcUrl,
          network: "sepolia",
        });

        if (cancelled) return;

        if (result.success) {
          // Parse output to extract state root and participants
          const parsed = parseGetBalancesOutput(result.output);
          if (parsed && parsed.stateRoot) {
            setChannelState(parsed);
            setInitialRoot(parsed.stateRoot);
          }
        } else {
          console.error("Failed to load channel state:", result.error);
          setChannelState(null);
        }
      } catch (error: any) {
        if (cancelled) return;
        console.error("Failed to load channel state:", error);
        setChannelState(null);
      } finally {
        if (!cancelled) {
          setIsLoadingState(false);
        }
      }
    };

    loadChannelState();

    return () => {
      cancelled = true;
    };
  }, [channelId]);

  // Derive L2 address from L2 private key
  useEffect(() => {
    if (!l2PrivateKey || l2PrivateKey.trim() === "") {
      setL2Address("");
      return;
    }

    const deriveAddress = async () => {
      setIsDerivingAddress(true);
      try {
        const address = await deriveL2AddressFromPrivateKey(l2PrivateKey);
        if (address) {
          setL2Address(address);
        } else {
          setL2Address("");
        }
      } catch (error) {
        console.error("Failed to derive L2 address:", error);
        setL2Address("");
      } finally {
        setIsDerivingAddress(false);
      }
    };

    // Debounce the address derivation (wait 500ms after user stops typing)
    const timeoutId = setTimeout(deriveAddress, 500);
    return () => clearTimeout(timeoutId);
  }, [l2PrivateKey]);

  // 채널 데이터를 온체인에서 가져오는 함수
  const fetchChannelData = async () => {
    if (!channelId) return;

    setIsLoadingChannelData(true);
    setLogs((prev) => [
      ...prev,
      `🔍 Fetching channel data for Channel ID: ${channelId}...`,
    ]);

    try {
      const channelIdBigInt = BigInt(channelId);

      // 1. Get channel info (includes state, initial root, participant count, allowed tokens)
      const channelInfo = await getChannelInfo(channelIdBigInt);
      if (!channelInfo) {
        throw new Error("Channel not found or failed to fetch channel info");
      }

      const channelState = Number(channelInfo.state);
      const channelStateName = getChannelStateString(channelState);

      // Store initial root
      setInitialRoot(channelInfo.initialRoot);

      setLogs((prev) => [
        ...prev,
        `✅ Channel info fetched`,
        `   - State: ${channelStateName} (${channelState})`,
        `   - Participants: ${channelInfo.participantCount}`,
        `   - Initial Root: ${channelInfo.initialRoot.substring(0, 20)}...`,
        `   - Target Contract: ${channelInfo.targetContract}`,
      ]);

      // 2. Get participants list
      const participants = await getChannelParticipants(channelIdBigInt);
      if (participants.length === 0) {
        throw new Error("No participants found in channel");
      }

      // Set participants with full address as label (like onchain-channel-simulation.ts)
      setChannelParticipants(
        participants.map((addr) => ({
          address: addr,
          label: `${addr}`, // Full address as label for clarity
        }))
      );

      setLogs((prev) => [
        ...prev,
        `✅ Participants fetched: ${participants.length}`,
        ...participants.map((addr, idx) => `   ${idx + 1}. ${addr}`),
      ]);

      // 3. Get target contract (token address)
      const targetContract = channelInfo.targetContract;

      // Store token address for later use
      setAllowedTokenAddresses([targetContract]);

      // Get ERC20 token info (symbol, decimals)
      const erc20Info = await getERC20TokenInfo(targetContract as Address);
      if (erc20Info) {
        setTokenInfo(erc20Info);
        setSupportedTokens([erc20Info.symbol]);
        setSelectedToken(erc20Info.symbol);
        setLogs((prev) => [
          ...prev,
          `✅ Token info: ${erc20Info.symbol} (${erc20Info.decimals} decimals)`,
        ]);
      } else {
        // Fallback to old method if ERC20 info fetch fails
        const tokenSymbol = getTokenSymbol(targetContract);
        setSupportedTokens([tokenSymbol]);
        setSelectedToken(tokenSymbol);
      }

      setLogs((prev) => [
        ...prev,
        `✅ Supported token: ${targetContract}`,
        `✅ Channel ${channelId} data loaded successfully`,
      ]);
    } catch (error: any) {
      console.error("Failed to fetch channel data:", error);
      setLogs((prev) => [
        ...prev,
        `❌ Failed to load channel data: ${error?.message || String(error)}`,
      ]);

      // Clear participants and tokens on error
      setChannelParticipants([]);
      setSupportedTokens([]);
      setSelectedToken("");
    } finally {
      setIsLoadingChannelData(false);
    }
  };

  // 컴포넌트 마운트 시 채널 데이터 로드
  useEffect(() => {
    if (!channelId) {
      setChannelParticipants([]);
      setSupportedTokens([]);
      setSelectedToken("");
      setAllowedTokenAddresses([]);
      return;
    }

    let cancelled = false;

    const loadData = async () => {
      try {
        await fetchChannelData();
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to fetch channel data:", error);
        }
      }
    };

    loadData();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelId]);

  const handleStateUpload = async () => {
    try {
      const result = await window.electronAPI.uploadFile();
      if (result) {
        if (result.isZip) {
          // ZIP file: extracted directory path is provided
          if (!result.extractedDir) {
            throw new Error(
              "ZIP file extraction failed: extracted directory not found"
            );
          }

          // Display state_snapshot.json info if available
          let stateInfo = "";
          if (result.stateSnapshot) {
            try {
              const state = JSON.parse(result.stateSnapshot);
              stateInfo = `📄 State snapshot found: root=${state.stateRoot?.substring(0, 16)}...`;
            } catch (e) {
              stateInfo = "📄 State snapshot found (unable to parse)";
            }
          }

          // Read channel-info.json to get initializedTxHash
          let initTxHash = "";
          if (result.channelInfo) {
            try {
              const channelInfo = JSON.parse(result.channelInfo);
              if (channelInfo.initializedTxHash) {
                initTxHash = channelInfo.initializedTxHash;
                setInitTx(initTxHash);
                setLogs((prev) => [
                  ...prev,
                  `🔗 Initialization TX found: ${initTxHash.substring(0, 16)}...`,
                ]);
              }
            } catch (e) {
              console.warn("Failed to parse channel-info.json:", e);
            }
          }

          setStateFile({
            name: result.filePath.split("/").pop() || "unknown",
            path: result.extractedDir,
            content: result.stateSnapshot || "", // Store state_snapshot.json content if available
            isZip: true,
          });
          setLogs((prev) => [
            ...prev,
            `📦 ZIP file extracted to: ${result.extractedDir}`,
            stateInfo || "📄 No state_snapshot.json found in ZIP",
            initTxHash
              ? `✅ Ready to generate proof (init TX: ${initTxHash.substring(0, 16)}...)`
              : `✅ Ready to generate proof from extracted files`,
          ]);

          // Load balances from uploaded state snapshot
          if (result.stateSnapshot && channelId) {
            setIsLoadingState(true);
            setLogs((prev) => [
              ...prev,
              `🔍 Loading balances from uploaded state snapshot...`,
            ]);

            try {
              const settings = storage.getSettings();
              const rpcUrl = settings.rpcUrl;

              // Find state_snapshot.json in extracted directory
              const snapshotPath = `${result.extractedDir}/state_snapshot.json`;

              // Call get-balances with snapshot path
              const balancesResult = await window.electron.invoke(
                "get-balances",
                {
                  channelId,
                  snapshotPath,
                  rpcUrl,
                  network: "sepolia",
                }
              );

              if (balancesResult.success) {
                const parsed = parseGetBalancesOutput(balancesResult.output);
                setChannelState(parsed);
                setLogs((prev) => [
                  ...prev,
                  `✅ Loaded balances from uploaded state`,
                ]);
              } else {
                setLogs((prev) => [
                  ...prev,
                  `⚠️ Failed to load balances: ${balancesResult.error}`,
                ]);
              }
            } catch (error: any) {
              console.error("Failed to load balances from snapshot:", error);
              setLogs((prev) => [
                ...prev,
                `⚠️ Failed to load balances: ${error.message}`,
              ]);
            } finally {
              setIsLoadingState(false);
            }
          }
        } else {
          // JSON file: decode base64 content using atob (browser-compatible)
          if (!result.content) {
            throw new Error("JSON file content is missing");
          }
          const jsonContent = atob(result.content);

          setStateFile({
            name: result.filePath.split("/").pop() || "unknown",
            path: result.filePath,
            content: jsonContent, // Store as plain JSON string
            isZip: false,
          });
          setLogs((prev) => [
            ...prev,
            `📄 JSON file loaded: ${result.filePath.split("/").pop()}`,
          ]);
        }
        setGenerationComplete(false);

        console.log("File uploaded:", {
          name: result.filePath.split("/").pop(),
          isZip: result.isZip,
          extractedDir: result.extractedDir,
        });
      }
    } catch (error: any) {
      console.error("File upload failed:", error);
      setLogs((prev) => [...prev, `❌ File upload failed: ${error.message}`]);
    }
  };

  const handleGenerate = async () => {
    // Validate required fields
    if (!l2PrivateKey || !l2Address || !recipientAddress || !amount.trim()) {
      alert(
        "Please fill in all fields: L2 Private Key, Recipient Address, and Amount."
      );
      return;
    }

    // For first transfer, init-tx is required
    // TODO: Get init-tx from channel creation event or allow user input
    if (!stateFile && !initTx) {
      alert(
        "Please provide either a state file (for subsequent transfers) or set the initialization transaction hash (for first transfer).\n\nYou can find the init-tx from the channel creation transaction."
      );
      return;
    }

    setIsGenerating(true);
    setGenerationComplete(false);
    setLogs([
      "🚀 Starting L2 transfer proof generation...",
      stateFile
        ? `📁 Previous state: ${stateFile.name}`
        : `🔗 Init TX: ${initTx}`,
      `👤 Sender L2 Key: ${l2PrivateKey.slice(0, 10)}...`,
      `👤 Sender L2 Address: ${l2Address}`,
      `💳 Recipient: ${recipientAddress}`,
      `💰 Amount: ${amount} ${tokenInfo?.symbol || selectedToken}`,
    ]);

    try {
      // Get RPC URL from settings
      const settings = storage.getSettings();
      const rpcUrl = settings.rpcUrl;

      // Determine network (default to sepolia)
      const network = "sepolia";

      // Generate output directory path
      const timestamp = Date.now();
      const outputDir = `./outputs/tx-${timestamp}`;

      // Prepare l2-transfer options
      const transferOptions: {
        channelId: string;
        senderKey: string;
        recipient: string;
        amount: string;
        outputDir: string;
        rpcUrl: string;
        network: string;
        initTx?: string;
        previousState?: string;
      } = {
        channelId,
        senderKey: l2PrivateKey,
        recipient: recipientAddress,
        amount: amount.trim(), // Use natural number as-is
        outputDir,
        rpcUrl,
        network,
      };

      // Check if state_snapshot.json actually exists
      // If stateFile exists but has no content, it means state_snapshot.json was not found
      const hasStateSnapshot =
        stateFile && stateFile.content && stateFile.content.trim() !== "";

      // Add init-tx if no previous state (first transfer)
      if (!hasStateSnapshot && initTx) {
        transferOptions.initTx = initTx;
        setLogs((prev) => [...prev, `📝 Using init-tx: ${initTx}`]);
      }

      // Add previous-state if provided (subsequent transfers)
      if (hasStateSnapshot) {
        // If it's a ZIP file, path points to extracted directory
        // Otherwise, path points directly to the state_snapshot.json file
        const snapshotPath = stateFile.isZip
          ? `${stateFile.path}/state_snapshot.json`
          : stateFile.path;
        transferOptions.previousState = snapshotPath;
        setLogs((prev) => [
          ...prev,
          `📝 Using previous state: ${snapshotPath}`,
        ]);
      }

      setLogs((prev) => [...prev, `🔄 Executing synthesizer l2-transfer...`]);

      // Execute l2-transfer
      const result = await window.electron.invoke(
        "l2-transfer",
        transferOptions
      );

      if (result.success) {
        setLogs((prev) => [
          ...prev,
          "✅ L2 transfer proof generation completed!",
          `📁 Output directory: ${result.outputDir}`,
          ...result.output.split("\n").filter((line: string) => line.trim()),
        ]);

        // Store new state snapshot if available
        if (result.stateSnapshot) {
          setNewStateSnapshot(result.stateSnapshot);
          setLogs((prev) => [...prev, "✅ New state snapshot generated"]);
        }

        // Store ZIP path if available
        if (result.zipPath) {
          setOutputZipPath(result.zipPath);
          setLogs((prev) => [
            ...prev,
            `📦 ZIP file created: ${result.zipPath}`,
          ]);
        }

        setGenerationComplete(true);
      } else {
        throw new Error(result.error || "L2 transfer failed");
      }
    } catch (error: any) {
      setLogs((prev) => [
        ...prev,
        `❌ L2 transfer failed: ${error.message || error}`,
        error.stderr ? `⚠️  Error details: ${error.stderr}` : "",
      ]);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = async () => {
    if (!outputZipPath) return;

    try {
      // Read the ZIP file using IPC
      const readResult = await window.electronAPI.readFile(outputZipPath);

      if (!readResult.success || !readResult.content) {
        throw new Error(readResult.error || "Failed to read ZIP file");
      }

      // Convert base64 to Buffer
      const buffer = Buffer.from(readResult.content, "base64");

      // Save file using save dialog
      const result = await window.electronAPI.saveFile(
        `proof-output-${Date.now()}.zip`,
        buffer
      );

      if (result.success) {
        setLogs((prev) => [...prev, `✅ File saved: ${result.filePath}`]);
      }
    } catch (error: any) {
      setLogs((prev) => [...prev, `❌ File save failed: ${error.message}`]);
    }
  };

  // For development: Download state_snapshot.json directly
  const handleDownloadStateSnapshot = async () => {
    if (!newStateSnapshot) return;

    try {
      const content = Buffer.from(newStateSnapshot, "utf-8");
      const result = await window.electronAPI.saveFile(
        "state_snapshot.json",
        content
      );

      if (result.success) {
        setLogs((prev) => [
          ...prev,
          `✅ State snapshot saved: ${result.filePath}`,
        ]);
      }
    } catch (error: any) {
      setLogs((prev) => [...prev, `❌ File save failed: ${error.message}`]);
    }
  };

  return (
    <Layout>
      <div className="min-h-screen pb-20" style={{ padding: "32px" }}>
        <div className="max-w-7xl w-full mx-auto">
          {/* Header with Back Button */}
          <button
            onClick={() => navigate("/")}
            className="flex items-center text-gray-400 hover:text-[#4fc3f7] transition-colors"
            style={{ gap: "8px", marginBottom: "24px" }}
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm">Back to Menu</span>
          </button>

          <div
            className="flex items-center"
            style={{ gap: "16px", marginBottom: "48px" }}
          >
            <div className="bg-[#4fc3f7] p-3 rounded">
              <Plus className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Generate Proof</h1>
              <p className="text-sm text-gray-400">
                Create new proofs based on your channel state and transaction
                details.
              </p>
            </div>
          </div>

          {/* Channel State */}
          {channelState && (
            <div
              className="bg-gradient-to-b from-[#1a2347] to-[#0a1930] border border-[#4fc3f7] shadow-lg shadow-[#4fc3f7]/20"
              style={{ padding: "24px", marginBottom: "32px" }}
            >
              <div
                className="flex items-center"
                style={{ gap: "12px", marginBottom: "20px" }}
              >
                <div className="bg-[#4fc3f7] p-2 rounded">
                  <Database className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">
                    Channel State
                  </h2>
                  <p className="text-sm text-gray-400">{channelState.source}</p>
                </div>
              </div>

              {/* State Roots Comparison */}
              <div className="space-y-3 mb-4">
                {/* Initial Root */}
                <div className="bg-[#0a1930]/50 p-4 rounded">
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-sm text-gray-400">Initial Root:</div>
                    <div className="text-xs text-gray-500 bg-gray-700/50 px-2 py-1 rounded">
                      On-chain
                    </div>
                  </div>
                  <div className="font-mono text-xs text-gray-300 break-all">
                    {initialRoot || "Not loaded"}
                  </div>
                </div>

                {/* Current Root */}
                <div className="bg-[#0a1930]/50 p-4 rounded">
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-sm text-gray-400">Current Root:</div>
                    {channelState.stateRoot === initialRoot ? (
                      <div className="text-xs text-green-400 bg-green-500/20 px-2 py-1 rounded">
                        ✓ Initial State
                      </div>
                    ) : (
                      <div className="text-xs text-yellow-400 bg-yellow-500/20 px-2 py-1 rounded">
                        Modified
                      </div>
                    )}
                  </div>
                  <div className="font-mono text-xs text-[#4fc3f7] break-all">
                    {channelState.stateRoot}
                  </div>
                  {channelState.stateRoot === initialRoot && (
                    <div className="text-xs text-gray-500 mt-2">
                      This is the initial state with deposits only. No
                      transactions have been processed yet.
                    </div>
                  )}
                </div>
              </div>

              {/* Participants */}
              <div className="text-sm text-gray-400 mb-2">Participants:</div>
              <div className="space-y-3">
                {channelState.participants.map((participant, idx) => (
                  <div
                    key={idx}
                    className="bg-[#0a1930]/50 p-4 rounded border border-[#4fc3f7]/20"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="text-xs text-gray-500 mb-1">
                          Participant {idx + 1}
                        </div>
                        <div className="font-mono text-xs text-white break-all">
                          {participant.address}
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        <div className="text-xs text-gray-500 mb-1">
                          Balance
                        </div>
                        <div className="font-bold text-[#4fc3f7]">
                          {participant.balance}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 mt-2">
                      L2 MPT Key:
                    </div>
                    <div className="font-mono text-xs text-gray-400 break-all mt-1">
                      {participant.mptKey}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {isLoadingState && (
            <div
              className="bg-gradient-to-b from-[#1a2347] to-[#0a1930] border border-[#4fc3f7]/50 shadow-lg"
              style={{ padding: "24px", marginBottom: "32px" }}
            >
              <div
                className="flex items-center justify-center"
                style={{ gap: "12px" }}
              >
                <RefreshCw className="w-5 h-5 text-[#4fc3f7] animate-spin" />
                <span className="text-gray-300">Loading channel state...</span>
              </div>
            </div>
          )}

          {/* Generation Overview */}
          <GenerationOverview
            channelId={channelId}
            onChannelIdChange={setChannelId}
            stateFile={stateFile}
            channelParticipants={channelParticipants}
            supportedTokens={supportedTokens}
            isLoadingChannelData={isLoadingChannelData}
            onRefresh={fetchChannelData}
          />

          {/* Proof Generation */}
          <ProofGeneration
            stateFile={stateFile}
            onStateUpload={handleStateUpload}
            l2PrivateKey={l2PrivateKey}
            onL2PrivateKeyChange={setL2PrivateKey}
            l2Address={l2Address}
            isDerivingAddress={isDerivingAddress}
            recipientAddress={recipientAddress}
            onRecipientAddressChange={setRecipientAddress}
            inputMode={inputMode}
            onInputModeChange={setInputMode}
            channelParticipants={channelParticipants}
            supportedTokens={supportedTokens}
            selectedToken={selectedToken}
            onSelectedTokenChange={setSelectedToken}
            amount={amount}
            onAmountChange={setAmount}
            isGenerating={isGenerating}
            onGenerate={handleGenerate}
            tokenInfo={tokenInfo}
          />

          {/* Logs Section */}
          {logs.length > 0 && (
            <div
              className="bg-gradient-to-b from-[#1a2347] to-[#0a1930] border border-[#4fc3f7]/30"
              style={{ padding: "32px", marginBottom: "48px" }}
            >
              <h3
                className="text-lg font-semibold text-white"
                style={{ marginBottom: "16px" }}
              >
                Execution Logs
              </h3>
              <div className="bg-black/50 border border-[#4fc3f7]/20 p-4 max-h-60 overflow-y-auto font-mono text-xs">
                {logs.map((log, index) => (
                  <div key={index} className="text-gray-300 mb-1">
                    {log}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Download Section */}
          {generationComplete && outputZipPath && (
            <div
              className="bg-gradient-to-b from-[#1a2347] to-[#0a1930] border-2 border-green-500"
              style={{ padding: "40px", marginBottom: "48px" }}
            >
              <div className="flex items-start" style={{ gap: "16px" }}>
                <div className="bg-green-500 p-3 rounded">
                  <Check className="w-8 h-8 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-white mb-2">
                    Generation Complete
                  </h3>
                  <p className="text-sm text-green-300 mb-6">
                    Your proof has been successfully generated and is ready for
                    download.
                  </p>
                  <button
                    onClick={handleDownload}
                    className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white font-semibold transition-all flex items-center gap-2"
                  >
                    <Download className="w-5 h-5" />
                    Download Proof Files (ZIP)
                  </button>
                  <p className="text-gray-400 text-xs mt-4">
                    Upload this file in your browser to submit the proof
                    on-chain
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Next Steps */}
          <div
            className="bg-gradient-to-b from-[#1a2347] to-[#0a1930] border border-[#4fc3f7]/30"
            style={{ padding: "32px" }}
          >
            <h3
              className="text-lg font-semibold text-white"
              style={{ marginBottom: "16px" }}
            >
              Next Steps
            </h3>
            <ul className="space-y-2 text-sm text-gray-300">
              <li className="flex items-start gap-2">
                <span className="text-[#4fc3f7] mt-1">•</span>
                <span>Upload your state file from the channel</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#4fc3f7] mt-1">•</span>
                <span>Enter the recipient address and transfer amount</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#4fc3f7] mt-1">•</span>
                <span>
                  Click "Generate Proof" to create a new proof for the
                  transaction
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#4fc3f7] mt-1">•</span>
                <span>
                  Download the generated proof ZIP file and submit it on-chain
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default GenerateProof;
