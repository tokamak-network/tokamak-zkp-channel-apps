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
import Layout from "@/components/Layout";
import {
  getChannelParticipants,
  getChannelTargetContract,
  getTokenSymbol,
  getChannelInfo,
  getChannelStateString,
} from "@/contracts/RollupBridgeCore";
import { storage } from "@/utils/storage";
import { ethers } from "ethers";

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
  const [senderAddress, setSenderAddress] = useState(""); // From address (sender)
  const [recipientAddress, setRecipientAddress] = useState(""); // To address (recipient)
  const [inputMode, setInputMode] = useState<"select" | "manual">("select");
  const [amount, setAmount] = useState("");
  const [selectedToken, setSelectedToken] = useState("ETH"); // 선택된 토큰 심볼 (기본값 ETH)
  const [allowedTokenAddresses, setAllowedTokenAddresses] = useState<string[]>(
    []
  ); // 채널의 allowedTokens 주소 배열
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationComplete, setGenerationComplete] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  // TODO: Restore ZIP download functionality later
  // const [outputZipPath, setOutputZipPath] = useState<string | null>(null);
  const [newStateSnapshot, setNewStateSnapshot] = useState<string | null>(null); // For development: direct state_snapshot.json download

  // 온체인 데이터
  const [channelId, setChannelId] = useState<string>("3"); // 채널 ID (기본값: 3, Sepolia testnet)
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

  // Load channel state on channelId change
  useEffect(() => {
    if (!channelId) {
      setChannelState(null);
      return;
    }

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

        if (result.success) {
          // Parse output to extract state root and participants
          const parsed = parseGetBalancesOutput(result.output);
          setChannelState(parsed);
        } else {
          console.error("Failed to load channel state:", result.error);
        }
      } catch (error: any) {
        console.error("Failed to load channel state:", error);
      } finally {
        setIsLoadingState(false);
      }
    };

    loadChannelState();
  }, [channelId]);

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

      const tokenSymbol = getTokenSymbol(targetContract);
      setSupportedTokens([tokenSymbol]);
      setSelectedToken(tokenSymbol);

      setLogs((prev) => [
        ...prev,
        `✅ Supported token: ${tokenSymbol} (${targetContract})`,
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
    fetchChannelData();
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
            `✅ Ready to generate proof from extracted files`,
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
              const balancesResult = await window.electron.invoke("get-balances", {
                channelId,
                snapshotPath,
                rpcUrl,
                network: "sepolia",
              });

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
    if (!stateFile || !senderAddress || !recipientAddress || !amount.trim()) {
      alert("Please fill in all fields.");
      return;
    }

    setIsGenerating(true);
    setGenerationComplete(false);
    setLogs([
      "🚀 Starting proof generation...",
      `📁 State file: ${stateFile.name}`,
      `👤 Sender (From): ${senderAddress}`,
      `💳 Recipient (To): ${recipientAddress}`,
      `💰 Amount: ${amount} ${selectedToken}`,
    ]);

    try {
      // Setup listeners for real-time logs
      window.electronAPI.onStatusUpdate((status: string) => {
        setLogs((prev) => [...prev, `ℹ️  ${status}`]);
      });

      window.electronAPI.onProverStdout((data: string) => {
        const lines = data.trim().split("\n");
        setLogs((prev) => [
          ...prev,
          ...lines.map((line) => `[Prover] ${line}`),
        ]);
      });

      window.electronAPI.onProverStderr((data: string) => {
        const lines = data.trim().split("\n");
        setLogs((prev) => [
          ...prev,
          ...lines.map((line) => `⚠️  [Prover] ${line}`),
        ]);
      });

      window.electronAPI.onVerifierStdout((data: string) => {
        const lines = data.trim().split("\n");
        setLogs((prev) => [
          ...prev,
          ...lines.map((line) => `[Verifier] ${line}`),
        ]);
      });

      // Get RPC URL and contract address from settings
      const settings = storage.getSettings();
      const rpcUrl = settings.rpcUrl;

      // Determine contract address based on selected token from channel's allowedTokens
      if (allowedTokenAddresses.length === 0) {
        throw new Error(
          "No allowed tokens found. Please fetch channel data first."
        );
      }

      // Find token address by symbol (selectedToken is a symbol)
      const tokenSymbols = allowedTokenAddresses.map(getTokenSymbol);
      const selectedTokenIndex = tokenSymbols.indexOf(selectedToken);
      if (selectedTokenIndex === -1) {
        throw new Error(
          `Selected token "${selectedToken}" not found in channel's allowed tokens. Available: ${tokenSymbols.join(", ")}`
        );
      }

      const contractAddress = allowedTokenAddresses[selectedTokenIndex];

      // Get participant addresses
      const participantAddresses = channelParticipants.map((p) => p.address);
      if (participantAddresses.length === 0) {
        throw new Error(
          "No channel participants found. Please fetch channel data first."
        );
      }

      // Validate sender address
      if (!senderAddress) {
        throw new Error("Sender address (From) is required");
      }

      // Find sender index from selected sender address
      const senderIndex = participantAddresses.findIndex(
        (addr) => addr.toLowerCase() === senderAddress.toLowerCase()
      );
      if (senderIndex === -1) {
        throw new Error(
          `Sender address ${senderAddress} is not a participant in this channel`
        );
      }

      // Execute proof generation using SynthesizerAdapter
      // ZIP file contains state_snapshot.json which will be used as previousState
      const result = await window.electronAPI.synthesizeAndProve({
        rpcUrl,
        contractAddress,
        recipientAddress,
        amount: amount.trim(),
        channelId,
        channelParticipants: participantAddresses,
        previousStateJson: stateFile.content, // state_snapshot.json from ZIP
        senderIndex,
      });

      if (result.success && result.verified) {
      setLogs((prev) => [
        ...prev,
          "✅ Proof generation completed!",
          "✅ Verification PASSED!",
        ]);

        // Store new state snapshot for next transaction
        if (result.newStateSnapshot) {
          setNewStateSnapshot(result.newStateSnapshot);
        }

      setGenerationComplete(true);
      } else {
        throw new Error(result.error || "Verification failed");
      }
    } catch (error: any) {
      setLogs((prev) => [
        ...prev,
        `❌ Proof generation failed: ${error.message || error}`,
      ]);
    } finally {
      setIsGenerating(false);
    }
  };

  // TODO: Restore ZIP download functionality later
  // const handleDownload = async () => {
  //   if (!outputZipPath) return;

  //   try {
  //     // Read the output file and trigger save dialog
  //     const content = Buffer.from("sample proof data"); // In production, read actual file
  //     const result = await window.electronAPI.saveFile(
  //       "proof_output.zip",
  //       content
  //     );

  //     if (result.success) {
  //       setLogs((prev) => [
  //         ...prev,
  //         `✅ File saved: ${result.filePath}`,
  //       ]);
  //     }
  //   } catch (error) {
  //     setLogs((prev) => [...prev, `❌ File save failed: ${error.message}`]);
  //   }
  // };

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
              <div className="flex items-center" style={{ gap: "12px", marginBottom: "20px" }}>
                <div className="bg-[#4fc3f7] p-2 rounded">
                  <Database className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Channel State</h2>
                  <p className="text-sm text-gray-400">
                    {channelState.source}
                  </p>
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
                      This is the initial state with deposits only. No transactions have been processed yet.
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
                        <div className="text-xs text-gray-500 mb-1">Balance</div>
                        <div className="font-bold text-[#4fc3f7]">
                          {participant.balance}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 mt-2">L2 MPT Key:</div>
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
              <div className="flex items-center justify-center" style={{ gap: "12px" }}>
                <RefreshCw className="w-5 h-5 text-[#4fc3f7] animate-spin" />
                <span className="text-gray-300">Loading channel state...</span>
              </div>
            </div>
          )}

          {/* Generation Overview (통합) */}
          <div
            className="bg-gradient-to-b from-[#1a2347] to-[#0a1930] border border-[#4fc3f7] shadow-lg shadow-[#4fc3f7]/20"
            style={{ padding: "24px", marginBottom: "48px" }}
          >
            <div
              className="flex items-center justify-between"
              style={{ marginBottom: "16px" }}
            >
              <div className="flex items-center" style={{ gap: "12px" }}>
                <div className="bg-[#4fc3f7] p-2 rounded">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">
                    Generation Overview
          </h2>
                  <p className="text-sm text-gray-400">
                    Current generation status and requirements
                  </p>
                </div>
              </div>
              <button
                onClick={fetchChannelData}
                disabled={isLoadingChannelData}
                className="flex items-center bg-[#4fc3f7] hover:bg-[#029bee] text-white rounded transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ padding: "8px 16px", gap: "8px", fontSize: "14px" }}
              >
                <RefreshCw
                  className={`w-4 h-4 ${isLoadingChannelData ? "animate-spin" : ""}`}
                />
                Refresh Data
              </button>
            </div>

            {/* Channel ID Input */}
            <div style={{ marginBottom: "20px" }}>
              <label
                className="block font-medium text-gray-300"
                style={{ fontSize: "14px", marginBottom: "8px" }}
              >
                Channel ID
              </label>
              <input
                type="text"
                value={channelId}
                onChange={(e) => setChannelId(e.target.value)}
                placeholder="Enter channel ID (e.g., 8)"
                className="w-full bg-[#0a1930] text-white border border-[#4fc3f7]/30 focus:border-[#4fc3f7] focus:outline-none transition-all"
                style={{ padding: "10px 14px", fontSize: "14px" }}
              />
              <p
                className="text-gray-400"
                style={{ fontSize: "12px", marginTop: "4px" }}
              >
                Enter the on-chain channel ID to load participants and supported
                tokens
              </p>
            </div>

            {/* Statistics Grid */}
            <div className="grid grid-cols-3" style={{ gap: "20px" }}>
              <div
                className="bg-[#0a1930]/50 border border-[#4fc3f7]/20"
                style={{ padding: "16px", textAlign: "center" }}
              >
                <div
                  className="flex items-center justify-between"
                  style={{ marginBottom: "8px" }}
                >
                  <span className="text-xs font-medium text-gray-400">
                    State File
                  </span>
                  <FileText className="w-4 h-4 text-[#4fc3f7]" />
                </div>
                <div className="text-xl font-bold text-white">
                  {stateFile ? "Uploaded" : "Required"}
                </div>
              </div>

              <div
                className="bg-[#0a1930]/50 border border-[#4fc3f7]/20"
                style={{ padding: "16px", textAlign: "center" }}
              >
                <div
                  className="flex items-center justify-between"
                  style={{ marginBottom: "8px" }}
                >
                  <span className="text-xs font-medium text-gray-400">
                    Recipients
                  </span>
                  <Users className="w-4 h-4 text-[#4fc3f7]" />
                </div>
                <div className="text-xl font-bold text-white">
                  {channelParticipants.length}
                </div>
              </div>

              <div
                className="bg-[#0a1930]/50 border border-[#4fc3f7]/20"
                style={{ padding: "16px", textAlign: "center" }}
              >
                <div
                  className="flex items-center justify-between"
                  style={{ marginBottom: "8px" }}
                >
                  <span className="text-xs font-medium text-gray-400">
                    Supported Tokens
                  </span>
                  <Coins className="w-4 h-4 text-[#4fc3f7]" />
                </div>
                <div
                  className="flex flex-wrap justify-center"
                  style={{ gap: "6px", marginTop: "6px" }}
                >
                  {supportedTokens.map((token) => (
                    <div
                      key={token}
                      className="bg-[#4fc3f7]/20 border border-[#4fc3f7]/50 rounded"
                      style={{ padding: "4px 10px" }}
                    >
                      <span
                        className="text-[#4fc3f7] font-bold"
                        style={{ fontSize: "12px" }}
                      >
                        {token}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Proof Generation Section */}
          <div
            className="bg-gradient-to-b from-[#1a2347] to-[#0a1930] border border-[#4fc3f7] shadow-lg shadow-[#4fc3f7]/20"
            style={{ padding: "32px", marginBottom: "48px" }}
          >
            <div
              className="flex items-center"
              style={{ gap: "12px", marginBottom: "24px" }}
            >
              <div className="bg-[#4fc3f7] p-2 rounded">
                <Plus className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">
                  Proof Generation
                </h2>
                <p className="text-sm text-gray-400">
                  Upload state file and enter transaction details
                </p>
              </div>
            </div>

            <div
              style={{ display: "flex", flexDirection: "column", gap: "24px" }}
            >
              {/* State File Upload */}
              <div>
                <label
                  className="block font-medium text-gray-300"
                  style={{ fontSize: "16px", marginBottom: "12px" }}
                >
                  State File
                </label>
                <button
                  onClick={handleStateUpload}
                  className="w-full border-2 border-dashed border-[#4fc3f7]/30 hover:border-[#4fc3f7] bg-[#0a1930]/50 text-gray-300 hover:text-[#4fc3f7] transition-all flex items-center justify-center"
                  style={{ padding: "24px", gap: "12px" }}
                >
                  <FileText className="w-6 h-6" />
                  <span className="font-semibold" style={{ fontSize: "16px" }}>
                    {stateFile ? "Change State File" : "Upload State File"}
                  </span>
                </button>
                {stateFile && (
                  <div
                    className="bg-[#0a1930]/50 border border-[#4fc3f7]/30"
                    style={{ marginTop: "12px", padding: "16px" }}
                  >
                    <div className="flex items-center" style={{ gap: "12px" }}>
                      <div
                        className="bg-green-500 rounded"
                        style={{ padding: "8px" }}
                      >
                        <Check className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className="text-white font-medium truncate"
                          style={{ fontSize: "15px", marginBottom: "4px" }}
                        >
                          {stateFile.name}
                        </p>
                        <p
                          className="text-gray-400 font-mono truncate"
                          style={{ fontSize: "13px" }}
                        >
                          {stateFile.path}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Sender Private Key (From) */}
              <div>
                <label
                  className="block font-medium text-gray-300"
                  style={{ fontSize: "16px", marginBottom: "12px" }}
                >
                  Sender Address (From)
                </label>
                <select
                  value={senderAddress}
                  onChange={(e) => setSenderAddress(e.target.value)}
                  className="w-full bg-[#0a1930] text-white border border-[#4fc3f7]/30 focus:border-[#4fc3f7] focus:outline-none transition-all"
                  style={{ padding: "14px 16px", fontSize: "15px" }}
                >
                  <option value="">Select sender address...</option>
                  {channelParticipants.map((p, idx) => (
                    <option key={idx} value={p.address}>
                      {p.label} - {p.address}
                    </option>
                  ))}
                </select>
                <p
                  className="text-gray-400"
                  style={{ fontSize: "12px", marginTop: "8px" }}
                >
                  Select the sender address from channel participants.
                </p>
              </div>

              {/* Recipient Address (To) */}
              <div>
                <div
                  className="flex items-center justify-between"
                  style={{ marginBottom: "12px" }}
                >
                  <label
                    className="block font-medium text-gray-300"
                    style={{ fontSize: "16px" }}
                  >
                    Recipient Address (To)
                  </label>
                  <div className="flex" style={{ gap: "8px" }}>
                    <button
                      onClick={() => {
                        setInputMode("select");
                        setRecipientAddress("");
                      }}
                      className={`transition-all ${
                        inputMode === "select"
                          ? "bg-[#4fc3f7] text-white"
                          : "bg-[#0a1930] text-gray-400 border border-[#4fc3f7]/30 hover:border-[#4fc3f7]"
                      }`}
                      style={{ padding: "8px 16px", fontSize: "14px" }}
                    >
                      Select
                    </button>
                    <button
                      onClick={() => {
                        setInputMode("manual");
                        setRecipientAddress("");
                      }}
                      className={`transition-all ${
                        inputMode === "manual"
                          ? "bg-[#4fc3f7] text-white"
                          : "bg-[#0a1930] text-gray-400 border border-[#4fc3f7]/30 hover:border-[#4fc3f7]"
                      }`}
                      style={{ padding: "8px 16px", fontSize: "14px" }}
                    >
                      Manual
                    </button>
                  </div>
                </div>

                {inputMode === "select" ? (
                  <select
                    value={recipientAddress}
                    onChange={(e) => setRecipientAddress(e.target.value)}
                    className="w-full bg-[#0a1930] text-white border border-[#4fc3f7]/30 focus:border-[#4fc3f7] focus:outline-none transition-all font-mono"
                    style={{ padding: "14px 16px", fontSize: "15px" }}
                  >
                    <option value="">Select a participant...</option>
                    {channelParticipants.map((participant, index) => (
                      <option
                        key={participant.address}
                        value={participant.address}
                      >
                        Participant {index + 1}: {participant.address}
                      </option>
                    ))}
                  </select>
                ) : (
              <input
                type="text"
                value={recipientAddress}
                onChange={(e) => setRecipientAddress(e.target.value)}
                placeholder="0x..."
                    className="w-full bg-[#0a1930] text-white border border-[#4fc3f7]/30 focus:border-[#4fc3f7] focus:outline-none transition-all font-mono"
                    style={{ padding: "14px 16px", fontSize: "15px" }}
                  />
                )}
              </div>

              {/* Token Selection */}
              <div>
                <label
                  className="block font-medium text-gray-300"
                  style={{ fontSize: "16px", marginBottom: "12px" }}
                >
                  Select Token
                </label>
                <div className="flex flex-wrap" style={{ gap: "12px" }}>
                  {supportedTokens.map((token) => (
                    <button
                      key={token}
                      onClick={() => setSelectedToken(token)}
                      className={`border-2 rounded transition-all ${
                        selectedToken === token
                          ? "bg-[#4fc3f7] border-[#4fc3f7] text-white"
                          : "bg-[#0a1930] border-[#4fc3f7]/30 text-gray-400 hover:border-[#4fc3f7]"
                      }`}
                      style={{
                        padding: "12px 24px",
                        fontSize: "15px",
                        fontWeight: "600",
                      }}
                    >
                      {token}
                    </button>
                  ))}
                </div>
            </div>

              {/* Transfer Amount */}
            <div>
                <label
                  className="block font-medium text-gray-300"
                  style={{ fontSize: "16px", marginBottom: "12px" }}
                >
                  Transfer Amount
              </label>
                <div className="relative">
              <input
                type="text"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                    placeholder={
                      selectedToken === "ETH"
                        ? "e.g., 1000000000000000000 (1 ETH in wei)"
                        : selectedToken === "WTON"
                          ? "e.g., 1000000000000000000000000000 (1 WTON in ray)"
                          : "e.g., 1000000 (1 USDT in 6 decimals)"
                    }
                    className="w-full bg-[#0a1930] text-white border border-[#4fc3f7]/30 focus:border-[#4fc3f7] focus:outline-none transition-all"
                    style={{
                      padding: "14px 16px",
                      paddingRight: "80px",
                      fontSize: "15px",
                    }}
                  />
                  <div
                    className="absolute top-1/2 -translate-y-1/2 bg-[#4fc3f7]/20 rounded border border-[#4fc3f7]/30"
                    style={{ right: "12px", padding: "8px 16px" }}
                  >
                    <span
                      className="text-[#4fc3f7] font-semibold"
                      style={{ fontSize: "15px" }}
                    >
                      {selectedToken}
                    </span>
                  </div>
                </div>
                <div
                  className="bg-yellow-500/10 border border-yellow-500/30 rounded"
                  style={{ padding: "12px", marginTop: "8px" }}
                >
                  <p
                    className="text-yellow-300 flex items-start"
                    style={{ fontSize: "14px", gap: "6px" }}
                  >
                    <Info
                      className="w-4 h-4"
                      style={{ marginTop: "2px", flexShrink: 0 }}
                    />
                    <span>
                      <strong>Enter amount in smallest unit:</strong>
                      {selectedToken === "ETH" && " wei (1 ETH = 10^18 wei)"}
                      {selectedToken === "WTON" && " ray (1 WTON = 10^27 ray)"}
                      {(selectedToken === "USDT" || selectedToken === "USDC") &&
                        " 6 decimals (1 USDT = 10^6)"}
                      {selectedToken !== "ETH" &&
                        selectedToken !== "WTON" &&
                        selectedToken !== "USDT" &&
                        selectedToken !== "USDC" &&
                        " smallest unit"}
                    </span>
                  </p>
          </div>
        </div>

              {/* Generate Proof Button */}
              <div style={{ marginTop: "32px" }}>
          <button
            onClick={handleGenerate}
            disabled={
                    !stateFile ||
                    !senderAddress ||
                    !recipientAddress ||
                    !amount.trim() ||
                    isGenerating
                  }
                  className={`w-full flex items-center justify-center transition-all ${
                    !stateFile ||
                    !senderAddress ||
                    !recipientAddress ||
                    !amount.trim() ||
                    isGenerating
                      ? "bg-[#0a1930]/50 border border-[#4fc3f7]/20 text-gray-500 cursor-not-allowed"
                      : "bg-[#4fc3f7] hover:bg-[#029bee] border border-[#4fc3f7] text-white shadow-lg shadow-[#4fc3f7]/30"
                  }`}
                  style={{
                    padding: "16px 24px",
                    fontSize: "16px",
                    fontWeight: "600",
                  }}
                >
                  <div className="flex items-center" style={{ gap: "12px" }}>
                    <Plus className="w-5 h-5" />
                    <span>
                      {isGenerating ? "Generating Proof..." : "Generate Proof"}
                    </span>
                    {!isGenerating &&
                      stateFile &&
                      senderAddress &&
                      recipientAddress &&
                      amount.trim() && <Check className="w-5 h-5" />}
                  </div>
          </button>
              </div>
            </div>
        </div>

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
          {/* TODO: Restore ZIP download functionality later */}
          {/* {generationComplete && outputZipPath && (
            <div className="bg-gradient-to-b from-[#1a2347] to-[#0a1930] border-2 border-green-500" style={{ padding: "40px", marginBottom: "48px" }}>
              <div className="flex items-start" style={{ gap: "16px" }}>
              <div className="bg-green-500 p-3 rounded">
                <Check className="w-8 h-8 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-white mb-2">Generation Complete</h3>
                <p className="text-sm text-green-300 mb-6">
                  Your proof has been successfully generated and is ready for download.
            </p>
            <button
              onClick={handleDownload}
                  className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white font-semibold transition-all flex items-center gap-2"
            >
                  <Download className="w-5 h-5" />
                  Download Proof Files (ZIP)
            </button>
                <p className="text-gray-400 text-xs mt-4">
                  Upload this file in your browser to submit the proof on-chain
                </p>
              </div>
            </div>
            </div>
          )} */}

          {/* Development: Direct state_snapshot.json download */}
          {generationComplete && newStateSnapshot && (
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
                    Your proof has been successfully generated and verified.
                  </p>
                  <button
                    onClick={handleDownloadStateSnapshot}
                    className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white font-semibold transition-all flex items-center gap-2"
                  >
                    <Download className="w-5 h-5" />
                    Download State Snapshot (JSON)
                  </button>
                  <p className="text-gray-400 text-xs mt-4">
                    This state snapshot can be used as previousState for the
                    next transaction
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
