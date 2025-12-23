import React from "react";
import { Plus, Check, ArrowRight, User, Wallet } from "lucide-react";

interface ProofGenerationProps {
  synthesizerOutputFile: { name: string; path: string } | null;
  onSynthesizerOutputUpload: () => void;
  isGenerating: boolean;
  onGenerate: () => void;
  // Transaction info from uploaded ZIP
  signature?: string;
  recipientAddress?: string;
  amount?: string;
  selectedToken?: string;
  channelId?: string;
  senderAddress?: string; // From channel-info.json or derived
}

const ProofGeneration: React.FC<ProofGenerationProps> = ({
  synthesizerOutputFile,
  onSynthesizerOutputUpload,
  isGenerating,
  onGenerate,
  signature = "",
  recipientAddress = "",
  amount = "",
  selectedToken = "",
  channelId = "",
  senderAddress = "",
}) => {
  // Truncate address for display
  const truncateAddress = (address: string) => {
    if (!address || address.length < 10) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const hasTransactionInfo = signature && recipientAddress && amount;

  return (
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
          <h2 className="text-lg font-bold text-white">Proof Generation</h2>
          <p className="text-sm text-gray-400">
            Upload Synthesizer output ZIP file to generate proof
          </p>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        {/* Synthesizer Output ZIP Upload */}
        <div>
          <label
            className="block font-medium text-gray-300"
            style={{ fontSize: "16px", marginBottom: "12px" }}
          >
            Synthesizer Output ZIP File
          </label>
          <div className="flex items-center gap-4">
            <button
              onClick={onSynthesizerOutputUpload}
              className="bg-[#4fc3f7] hover:bg-[#029bee] border border-[#4fc3f7] text-white transition-all"
              style={{
                padding: "12px 24px",
                fontSize: "15px",
                fontWeight: "600",
                borderRadius: "4px",
              }}
            >
              Upload ZIP File
            </button>
            {synthesizerOutputFile && (
              <div className="flex-1 bg-[#0a1930] border border-[#4fc3f7]/30 rounded p-3">
                <div className="text-sm text-gray-300 font-mono">
                  {synthesizerOutputFile.name}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {synthesizerOutputFile.path}
                </div>
              </div>
            )}
          </div>
          <p
            className="text-gray-400"
            style={{ fontSize: "12px", marginTop: "8px" }}
          >
            {synthesizerOutputFile
              ? "✅ Synthesizer output ZIP file uploaded"
              : "Please upload a ZIP file containing Synthesizer output files (instance.json, placementVariables.json, etc.)"}
          </p>
        </div>

        {/* Transaction Info Display (from uploaded ZIP) */}
        {hasTransactionInfo && (
          <div
            className="bg-[#0a1930]/50 border border-[#4fc3f7]/30 rounded"
            style={{ padding: "20px" }}
          >
            <h3
              className="text-white font-semibold"
              style={{ fontSize: "15px", marginBottom: "16px" }}
            >
              Transaction Details
            </h3>

            {/* Transfer Visualization */}
            <div
              className="flex items-center justify-center"
              style={{ gap: "16px", marginBottom: "20px" }}
            >
              {/* Sender */}
              <div className="flex flex-col items-center">
                <div className="bg-[#4fc3f7]/20 p-3 rounded-full mb-2">
                  <User className="w-6 h-6 text-[#4fc3f7]" />
                </div>
                <span className="text-xs text-gray-400">Sender</span>
                <span className="text-sm text-white font-mono">
                  {senderAddress
                    ? truncateAddress(senderAddress)
                    : "From Signature"}
                </span>
              </div>

              {/* Arrow with Amount */}
              <div className="flex flex-col items-center">
                <div className="flex items-center gap-2 bg-green-500/20 px-4 py-2 rounded-full">
                  <span className="text-green-400 font-bold">
                    {amount} {selectedToken || "ETH"}
                  </span>
                  <ArrowRight className="w-4 h-4 text-green-400" />
                </div>
              </div>

              {/* Recipient */}
              <div className="flex flex-col items-center">
                <div className="bg-[#4fc3f7]/20 p-3 rounded-full mb-2">
                  <Wallet className="w-6 h-6 text-[#4fc3f7]" />
                </div>
                <span className="text-xs text-gray-400">Recipient</span>
                <span className="text-sm text-white font-mono">
                  {truncateAddress(recipientAddress)}
                </span>
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-4">
              {channelId && (
                <div className="bg-[#0a1930] p-3 rounded">
                  <span className="text-xs text-gray-400 block">
                    Channel ID
                  </span>
                  <span className="text-sm text-white font-mono">
                    {channelId}
                  </span>
                </div>
              )}
              <div className="bg-[#0a1930] p-3 rounded">
                <span className="text-xs text-gray-400 block">Recipient</span>
                <span
                  className="text-sm text-white font-mono break-all"
                  style={{ fontSize: "12px" }}
                >
                  {recipientAddress}
                </span>
              </div>
              {signature && (
                <div className="bg-[#0a1930] p-3 rounded col-span-2">
                  <span className="text-xs text-gray-400 block">Signature</span>
                  <span
                    className="text-sm text-white font-mono break-all"
                    style={{ fontSize: "11px" }}
                  >
                    {signature.slice(0, 40)}...{signature.slice(-20)}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Generate Proof Button */}
        <div style={{ marginTop: "16px" }}>
          <button
            onClick={onGenerate}
            disabled={!synthesizerOutputFile || isGenerating}
            className={`w-full flex items-center justify-center transition-all ${
              !synthesizerOutputFile || isGenerating
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
              {!isGenerating && synthesizerOutputFile && (
                <Check className="w-5 h-5" />
              )}
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProofGeneration;
