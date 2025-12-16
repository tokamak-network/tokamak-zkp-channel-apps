import React from "react";
import { Plus, FileText, Check, Info, RefreshCw } from "lucide-react";

interface ProofGenerationProps {
  stateFile: { name: string; path: string } | null;
  onStateUpload: () => void;
  l2PrivateKey: string;
  onL2PrivateKeyChange: (key: string) => void;
  l2Address: string;
  isDerivingAddress: boolean;
  recipientAddress: string;
  onRecipientAddressChange: (address: string) => void;
  inputMode: "select" | "manual";
  onInputModeChange: (mode: "select" | "manual") => void;
  channelParticipants: { address: string; label: string }[];
  supportedTokens: string[];
  selectedToken: string;
  onSelectedTokenChange: (token: string) => void;
  amount: string;
  onAmountChange: (amount: string) => void;
  isGenerating: boolean;
  onGenerate: () => void;
  tokenInfo: { symbol: string; decimals: number } | null;
}

const ProofGeneration: React.FC<ProofGenerationProps> = ({
  stateFile,
  onStateUpload,
  l2PrivateKey,
  onL2PrivateKeyChange,
  l2Address,
  isDerivingAddress,
  recipientAddress,
  onRecipientAddressChange,
  inputMode,
  onInputModeChange,
  channelParticipants,
  supportedTokens,
  selectedToken,
  onSelectedTokenChange,
  amount,
  onAmountChange,
  isGenerating,
  onGenerate,
  tokenInfo,
}) => {
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
            Upload state file and enter transaction details
          </p>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        {/* State File Upload */}
        <div>
          <label
            className="block font-medium text-gray-300"
            style={{ fontSize: "16px", marginBottom: "12px" }}
          >
            State File
          </label>
          <button
            onClick={onStateUpload}
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

        {/* Sender L2 Private Key (From) */}
        <div>
          <label
            className="block font-medium text-gray-300"
            style={{ fontSize: "16px", marginBottom: "12px" }}
          >
            Sender L2 Private Key (From)
          </label>
          <input
            type="text"
            value={l2PrivateKey}
            onChange={(e) => onL2PrivateKeyChange(e.target.value)}
            placeholder="0x..."
            className="w-full bg-[#0a1930] text-white border border-[#4fc3f7]/30 focus:border-[#4fc3f7] focus:outline-none transition-all font-mono"
            style={{ padding: "14px 16px", fontSize: "15px" }}
          />
          <p
            className="text-gray-400"
            style={{ fontSize: "12px", marginTop: "8px" }}
          >
            Enter your L2 private key to derive the sender address.
          </p>

          {/* Derived L2 Address Display */}
          {isDerivingAddress && (
            <div
              className="bg-[#0a1930]/50 border border-[#4fc3f7]/20 flex items-center"
              style={{
                marginTop: "12px",
                padding: "12px 16px",
                gap: "8px",
              }}
            >
              <RefreshCw className="w-4 h-4 text-[#4fc3f7] animate-spin" />
              <span className="text-gray-400 text-sm">
                Deriving L2 address...
              </span>
            </div>
          )}
          {!isDerivingAddress && l2Address && (
            <div
              className="bg-[#0a1930]/50 border border-[#4fc3f7]/20"
              style={{ marginTop: "12px", padding: "12px 16px" }}
            >
              <div className="text-xs text-gray-500 mb-1">L2 Address:</div>
              <div className="font-mono text-sm text-[#4fc3f7] break-all">
                {l2Address}
              </div>
            </div>
          )}
        </div>

        {/* Recipient Address (To) */}
        <div>
          <label
            className="block font-medium text-gray-300"
            style={{ fontSize: "16px", marginBottom: "12px" }}
          >
            Recipient L2 Address (To)
          </label>
          <input
            type="text"
            value={recipientAddress}
            onChange={(e) => onRecipientAddressChange(e.target.value)}
            placeholder="0x... (Enter L2 address)"
            className="w-full bg-[#0a1930] text-white border border-[#4fc3f7]/30 focus:border-[#4fc3f7] focus:outline-none transition-all font-mono"
            style={{ padding: "14px 16px", fontSize: "15px" }}
          />
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
                onClick={() => onSelectedTokenChange(token)}
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
              onChange={(e) => onAmountChange(e.target.value)}
              placeholder={
                tokenInfo
                  ? `e.g., 1 (1 ${tokenInfo.symbol})`
                  : "e.g., 1 (1 token)"
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
                <strong>Enter amount as a natural number:</strong>
                {tokenInfo ? ` e.g., 1 for 1 ${tokenInfo.symbol}` : " e.g., 1"}
              </span>
            </p>
          </div>
        </div>

        {/* Generate Proof Button */}
        <div style={{ marginTop: "32px" }}>
          <button
            onClick={onGenerate}
            disabled={
              !stateFile ||
              !l2Address ||
              !recipientAddress ||
              !amount.trim() ||
              isGenerating
            }
            className={`w-full flex items-center justify-center transition-all ${
              !stateFile ||
              !l2Address ||
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
                l2Address &&
                recipientAddress &&
                amount.trim() && <Check className="w-5 h-5" />}
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProofGeneration;
