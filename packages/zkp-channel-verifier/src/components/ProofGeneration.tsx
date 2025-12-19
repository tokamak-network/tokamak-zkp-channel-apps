import React from "react";
import { Plus, Check, RefreshCw } from "lucide-react";

interface ProofGenerationProps {
  stateFile: { name: string; path: string } | null;
  l2PrivateKey: string;
  onL2PrivateKeyChange: (key: string) => void;
  l2Address: string;
  isDerivingAddress: boolean;
  recipientAddress: string;
  onRecipientAddressChange: (address: string) => void;
  supportedTokens: string[];
  selectedToken: string;
  onSelectedTokenChange: (token: string) => void;
  amount: string;
  onAmountChange: (amount: string) => void;
  isGenerating: boolean;
  onGenerate: () => void;
  transactionInfoLoaded: boolean;
}

const ProofGeneration: React.FC<ProofGenerationProps> = ({
  stateFile,
  l2PrivateKey,
  onL2PrivateKeyChange,
  l2Address,
  isDerivingAddress,
  recipientAddress,
  onRecipientAddressChange,
  supportedTokens,
  selectedToken,
  onSelectedTokenChange,
  amount,
  onAmountChange,
  isGenerating,
  onGenerate,
  transactionInfoLoaded,
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
            Transaction details loaded from state file
          </p>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
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
            placeholder="Upload state file to load private key"
            readOnly={true}
            disabled={true}
            className="w-full bg-[#0a1930] text-white border border-[#4fc3f7]/30 focus:border-[#4fc3f7] focus:outline-none transition-all font-mono opacity-70 cursor-not-allowed"
            style={{ padding: "14px 16px", fontSize: "15px" }}
          />
          <p
            className="text-gray-400"
            style={{ fontSize: "12px", marginTop: "8px" }}
          >
            {transactionInfoLoaded
              ? "Loaded from transaction-info.json"
              : "Please upload a state file (ZIP) containing transaction-info.json"}
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
            placeholder="Upload state file to load recipient address"
            readOnly={true}
            disabled={true}
            className="w-full bg-[#0a1930] text-white border border-[#4fc3f7]/30 focus:border-[#4fc3f7] focus:outline-none transition-all font-mono opacity-70 cursor-not-allowed"
            style={{ padding: "14px 16px", fontSize: "15px" }}
          />
          <p
            className="text-gray-400"
            style={{ fontSize: "12px", marginTop: "8px" }}
          >
            {transactionInfoLoaded
              ? "Loaded from transaction-info.json"
              : "Please upload a state file (ZIP) containing transaction-info.json"}
          </p>
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
              placeholder="Upload state file to load amount"
              readOnly={true}
              disabled={true}
              className="w-full bg-[#0a1930] text-white border border-[#4fc3f7]/30 focus:border-[#4fc3f7] focus:outline-none transition-all opacity-70 cursor-not-allowed"
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
          <p
            className="text-gray-400"
            style={{ fontSize: "12px", marginTop: "8px" }}
          >
            {transactionInfoLoaded
              ? "Loaded from transaction-info.json"
              : "Please upload a state file (ZIP) containing transaction-info.json"}
          </p>
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
