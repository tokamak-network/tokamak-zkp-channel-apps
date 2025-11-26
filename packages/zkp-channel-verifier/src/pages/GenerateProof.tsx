import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Plus, Zap, Info, FileText, Users, Coins, AlertTriangle, ArrowLeft, Check, Download, RefreshCw } from "lucide-react";
import { getChannelParticipants, getChannelAllowedTokens, getTokenSymbol } from "@/contracts/RollupBridgeCore";

interface UploadedFile {
  name: string;
  path: string;
  content: string;
}

const GenerateProof: React.FC = () => {
  const navigate = useNavigate();
  const [stateFile, setStateFile] = useState<UploadedFile | null>(null);
  const [recipientAddress, setRecipientAddress] = useState("");
  const [inputMode, setInputMode] = useState<"select" | "manual">("select");
  const [amount, setAmount] = useState("");
  const [selectedToken, setSelectedToken] = useState("ETH"); // 선택된 토큰 (기본값 ETH)
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationComplete, setGenerationComplete] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [outputZipPath, setOutputZipPath] = useState<string | null>(null);

  // 온체인 데이터
  const [channelId, setChannelId] = useState<string>("1"); // 채널 ID (설정이나 입력으로 받아야 함)
  const [supportedTokens, setSupportedTokens] = useState<string[]>(["ETH", "WTON", "USDT"]); // 기본 토큰 목록
  const [channelParticipants, setChannelParticipants] = useState<{ address: string; label: string }[]>([
    { address: "0x1234567890123456789012345678901234567890", label: "Participant 1" },
    { address: "0x9876543210987654321098765432109876543210", label: "Participant 2" },
  ]);
  const [isLoadingChannelData, setIsLoadingChannelData] = useState(false);

  // 채널 데이터를 온체인에서 가져오는 함수
  const fetchChannelData = async () => {
    if (!channelId) return;
    
    setIsLoadingChannelData(true);
    try {
      const channelIdBigInt = BigInt(channelId);
      
      // 참여자 목록 가져오기
      const participants = await getChannelParticipants(channelIdBigInt);
      setChannelParticipants(
        participants.map((addr, index) => ({
          address: addr,
          label: `Participant ${index + 1}`,
        }))
      );

      // 허용된 토큰 목록 가져오기
      const tokens = await getChannelAllowedTokens(channelIdBigInt);
      const tokenSymbols = tokens.map(getTokenSymbol);
      setSupportedTokens(tokenSymbols);
      
      // 첫 번째 토큰을 기본 선택
      if (tokenSymbols.length > 0 && !selectedToken) {
        setSelectedToken(tokenSymbols[0]);
      }

      setLogs(prev => [
        ...prev,
        `✅ Channel ${channelId} data loaded`,
        `👥 ${participants.length} participants`,
        `🪙 ${tokenSymbols.length} supported tokens`,
      ]);
    } catch (error) {
      console.error('Failed to fetch channel data:', error);
      setLogs(prev => [
        ...prev,
        `❌ Failed to load channel data: ${error.message}`,
      ]);
      // Fallback to demo data
      setSupportedTokens(["ETH", "WTON", "USDT"]);
      setChannelParticipants([
        { address: "0x1234567890123456789012345678901234567890", label: "Participant 1" },
        { address: "0x9876543210987654321098765432109876543210", label: "Participant 2" },
        { address: "0xabcdef1234567890abcdef1234567890abcdef12", label: "Participant 3" },
      ]);
      if (!selectedToken) setSelectedToken("ETH");
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
        setStateFile({
          name: result.filePath.split("/").pop() || "unknown",
          path: result.filePath,
          content: result.content,
        });
        setGenerationComplete(false);
        setLogs([]);
      }
    } catch (error) {
      console.error("File upload failed:", error);
      setLogs((prev) => [
        ...prev,
        `❌ File upload failed: ${error.message}`,
      ]);
    }
  };

  const handleGenerate = async () => {
    if (!stateFile || !recipientAddress || !amount) {
      alert("Please fill in all fields.");
      return;
    }

    setIsGenerating(true);
    setGenerationComplete(false);
    setLogs([
      "🚀 Starting proof generation...",
      `📁 State file: ${stateFile.name}`,
      `💳 Recipient: ${recipientAddress}`,
      `💰 Amount: ${amount} ${selectedToken}`,
    ]);

    try {
      // Setup stdout/stderr listeners
      window.electronAPI.onBinaryStdout((data: string) => {
        setLogs((prev) => [...prev, `> ${data.trim()}`]);
      });

      window.electronAPI.onBinaryStderr((data: string) => {
        setLogs((prev) => [...prev, `⚠️ ${data.trim()}`]);
      });

      // Execute proof generation binary (placeholder command)
      // 실제로는 src/binaries/4_run-prove.sh 등을 실행
      const result = await window.electronAPI.executeBinary([
        "bash",
        "-c",
        `echo "Generating proof..." && sleep 3 && echo "Proof generation complete" && exit 0`,
      ]);

      setLogs((prev) => [
        ...prev,
        "✅ Proof generation completed.",
        "📦 Compressing result files...",
      ]);

      // Simulate creating output zip
      setOutputZipPath("/tmp/proof_output.zip");
      setLogs((prev) => [...prev, "✅ Compression complete! File is ready for download."]);
      setGenerationComplete(true);
    } catch (error) {
      setLogs((prev) => [
        ...prev,
        `❌ Proof generation failed: ${error.message}`,
      ]);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = async () => {
    if (!outputZipPath) return;

    try {
      // Read the output file and trigger save dialog
      const content = Buffer.from("sample proof data"); // In production, read actual file
      const result = await window.electronAPI.saveFile(
        "proof_output.zip",
        content
      );

      if (result.success) {
        setLogs((prev) => [
          ...prev,
          `✅ File saved: ${result.filePath}`,
        ]);
      }
    } catch (error) {
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

          <div className="flex items-center" style={{ gap: "16px", marginBottom: "48px" }}>
            <div className="bg-[#4fc3f7] p-3 rounded">
              <Plus className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">
                Generate Proof
              </h1>
              <p className="text-sm text-gray-400">
                Create new proofs based on your channel state and transaction details.
              </p>
            </div>
          </div>

          {/* Generation Overview (통합) */}
          <div className="bg-gradient-to-b from-[#1a2347] to-[#0a1930] border border-[#4fc3f7] shadow-lg shadow-[#4fc3f7]/20" style={{ padding: "24px", marginBottom: "48px" }}>
            <div className="flex items-center justify-between" style={{ marginBottom: "16px" }}>
              <div className="flex items-center" style={{ gap: "12px" }}>
                <div className="bg-[#4fc3f7] p-2 rounded">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Generation Overview</h2>
                  <p className="text-sm text-gray-400">Current generation status and requirements</p>
                </div>
              </div>
              <button
                onClick={fetchChannelData}
                disabled={isLoadingChannelData}
                className="flex items-center bg-[#4fc3f7] hover:bg-[#029bee] text-white rounded transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ padding: "8px 16px", gap: "8px", fontSize: "14px" }}
              >
                <RefreshCw className={`w-4 h-4 ${isLoadingChannelData ? 'animate-spin' : ''}`} />
                Refresh Data
              </button>
            </div>

            {/* Channel ID Input */}
            <div style={{ marginBottom: "20px" }}>
              <label className="block font-medium text-gray-300" style={{ fontSize: "14px", marginBottom: "8px" }}>
                Channel ID
              </label>
              <input
                type="text"
                value={channelId}
                onChange={(e) => setChannelId(e.target.value)}
                placeholder="Enter channel ID (e.g., 1)"
                className="w-full bg-[#0a1930] text-white border border-[#4fc3f7]/30 focus:border-[#4fc3f7] focus:outline-none transition-all"
                style={{ padding: "10px 14px", fontSize: "14px" }}
              />
              <p className="text-gray-400" style={{ fontSize: "12px", marginTop: "4px" }}>
                Enter the on-chain channel ID to load participants and supported tokens
              </p>
            </div>

            {/* Statistics Grid */}
            <div className="grid grid-cols-3" style={{ gap: "20px" }}>
              <div className="bg-[#0a1930]/50 border border-[#4fc3f7]/20" style={{ padding: "16px", textAlign: "center" }}>
                <div className="flex items-center justify-between" style={{ marginBottom: "8px" }}>
                  <span className="text-xs font-medium text-gray-400">State File</span>
                  <FileText className="w-4 h-4 text-[#4fc3f7]" />
                </div>
                <div className="text-xl font-bold text-white">
                  {stateFile ? "Uploaded" : "Required"}
                </div>
              </div>

              <div className="bg-[#0a1930]/50 border border-[#4fc3f7]/20" style={{ padding: "16px", textAlign: "center" }}>
                <div className="flex items-center justify-between" style={{ marginBottom: "8px" }}>
                  <span className="text-xs font-medium text-gray-400">Recipients</span>
                  <Users className="w-4 h-4 text-[#4fc3f7]" />
                </div>
                <div className="text-xl font-bold text-white">{channelParticipants.length}</div>
              </div>

              <div className="bg-[#0a1930]/50 border border-[#4fc3f7]/20" style={{ padding: "16px", textAlign: "center" }}>
                <div className="flex items-center justify-between" style={{ marginBottom: "8px" }}>
                  <span className="text-xs font-medium text-gray-400">Supported Tokens</span>
                  <Coins className="w-4 h-4 text-[#4fc3f7]" />
                </div>
                <div className="flex flex-wrap justify-center" style={{ gap: "6px", marginTop: "6px" }}>
                  {supportedTokens.map((token) => (
                    <div
                      key={token}
                      className="bg-[#4fc3f7]/20 border border-[#4fc3f7]/50 rounded"
                      style={{ padding: "4px 10px" }}
                    >
                      <span className="text-[#4fc3f7] font-bold" style={{ fontSize: "12px" }}>
                        {token}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Proof Generation Section */}
          <div className="bg-gradient-to-b from-[#1a2347] to-[#0a1930] border border-[#4fc3f7] shadow-lg shadow-[#4fc3f7]/20" style={{ padding: "32px", marginBottom: "48px" }}>
            <div className="flex items-center" style={{ gap: "12px", marginBottom: "24px" }}>
            <div className="bg-[#4fc3f7] p-2 rounded">
              <Plus className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Proof Generation</h2>
              <p className="text-sm text-gray-400">Upload state file and enter transaction details</p>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            {/* State File Upload */}
            <div>
              <label className="block font-medium text-gray-300" style={{ fontSize: "16px", marginBottom: "12px" }}>State File</label>
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
                <div className="bg-[#0a1930]/50 border border-[#4fc3f7]/30" style={{ marginTop: "12px", padding: "16px" }}>
                  <div className="flex items-center" style={{ gap: "12px" }}>
                    <div className="bg-green-500 rounded" style={{ padding: "8px" }}>
                      <Check className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium truncate" style={{ fontSize: "15px", marginBottom: "4px" }}>{stateFile.name}</p>
                      <p className="text-gray-400 font-mono truncate" style={{ fontSize: "13px" }}>{stateFile.path}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Recipient Address */}
            <div>
              <div className="flex items-center justify-between" style={{ marginBottom: "12px" }}>
                <label className="block font-medium text-gray-300" style={{ fontSize: "16px" }}>Recipient Address</label>
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
                  className="w-full bg-[#0a1930] text-white border border-[#4fc3f7]/30 focus:border-[#4fc3f7] focus:outline-none transition-all"
                  style={{ padding: "14px 16px", fontSize: "15px" }}
                >
                  <option value="">Select a participant...</option>
                  {channelParticipants.map((participant) => (
                    <option key={participant.address} value={participant.address}>
                      {participant.label} - {participant.address.slice(0, 10)}...{participant.address.slice(-8)}
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
              <label className="block font-medium text-gray-300" style={{ fontSize: "16px", marginBottom: "12px" }}>Select Token</label>
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
                    style={{ padding: "12px 24px", fontSize: "15px", fontWeight: "600" }}
                  >
                    {token}
                  </button>
                ))}
              </div>
            </div>

            {/* Transfer Amount */}
            <div>
              <label className="block font-medium text-gray-300" style={{ fontSize: "16px", marginBottom: "12px" }}>Transfer Amount</label>
              <div className="relative">
              <input
                type="text"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                  placeholder={
                    selectedToken === "ETH" ? "e.g., 1000000000000000000 (1 ETH in wei)" :
                    selectedToken === "WTON" ? "e.g., 1000000000000000000000000000 (1 WTON in ray)" :
                    "e.g., 1000000 (1 USDT in 6 decimals)"
                  }
                  className="w-full bg-[#0a1930] text-white border border-[#4fc3f7]/30 focus:border-[#4fc3f7] focus:outline-none transition-all"
                  style={{ padding: "14px 16px", paddingRight: "80px", fontSize: "15px" }}
                />
                <div className="absolute top-1/2 -translate-y-1/2 bg-[#4fc3f7]/20 rounded border border-[#4fc3f7]/30" style={{ right: "12px", padding: "8px 16px" }}>
                  <span className="text-[#4fc3f7] font-semibold" style={{ fontSize: "15px" }}>{selectedToken}</span>
                </div>
              </div>
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded" style={{ padding: "12px", marginTop: "8px" }}>
                <p className="text-yellow-300 flex items-start" style={{ fontSize: "14px", gap: "6px" }}>
                  <Info className="w-4 h-4" style={{ marginTop: "2px", flexShrink: 0 }} />
                  <span>
                    <strong>Enter amount in smallest unit:</strong>
                    {selectedToken === "ETH" && " wei (1 ETH = 10^18 wei)"}
                    {selectedToken === "WTON" && " ray (1 WTON = 10^27 ray)"}
                    {(selectedToken === "USDT" || selectedToken === "USDC") && " 6 decimals (1 USDT = 10^6)"}
                    {selectedToken !== "ETH" && selectedToken !== "WTON" && selectedToken !== "USDT" && selectedToken !== "USDC" && " smallest unit"}
                  </span>
                </p>
              </div>
            </div>

            {/* Generate Proof Button */}
            <div style={{ marginTop: "32px" }}>
              <button
                onClick={handleGenerate}
                disabled={!stateFile || !recipientAddress || !amount || isGenerating}
                className={`w-full flex items-center justify-center transition-all ${
                  !stateFile || !recipientAddress || !amount || isGenerating
                    ? "bg-[#0a1930]/50 border border-[#4fc3f7]/20 text-gray-500 cursor-not-allowed"
                    : "bg-[#4fc3f7] hover:bg-[#029bee] border border-[#4fc3f7] text-white shadow-lg shadow-[#4fc3f7]/30"
                }`}
                style={{ padding: "16px 24px", fontSize: "16px", fontWeight: "600" }}
              >
                <div className="flex items-center" style={{ gap: "12px" }}>
                  <Plus className="w-5 h-5" />
                  <span>{isGenerating ? "Generating Proof..." : "Generate Proof"}</span>
                  {!isGenerating && stateFile && recipientAddress && amount && (
                    <Check className="w-5 h-5" />
                  )}
                </div>
              </button>
            </div>
          </div>
        </div>

          {/* Logs Section */}
          {logs.length > 0 && (
            <div className="bg-gradient-to-b from-[#1a2347] to-[#0a1930] border border-[#4fc3f7]/30" style={{ padding: "32px", marginBottom: "48px" }}>
              <h3 className="text-lg font-semibold text-white" style={{ marginBottom: "16px" }}>Execution Logs</h3>
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
          )}

          {/* Next Steps */}
          <div className="bg-gradient-to-b from-[#1a2347] to-[#0a1930] border border-[#4fc3f7]/30" style={{ padding: "32px" }}>
            <h3 className="text-lg font-semibold text-white" style={{ marginBottom: "16px" }}>Next Steps</h3>
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
              <span>Click "Generate Proof" to create a new proof for the transaction</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#4fc3f7] mt-1">•</span>
              <span>Download the generated proof ZIP file and submit it on-chain</span>
            </li>
          </ul>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default GenerateProof;

