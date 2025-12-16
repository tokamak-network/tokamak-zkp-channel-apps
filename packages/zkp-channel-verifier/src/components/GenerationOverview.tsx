import React from "react";
import { Zap, RefreshCw, FileText, Users, Coins } from "lucide-react";

interface GenerationOverviewProps {
  channelId: string;
  onChannelIdChange: (channelId: string) => void;
  stateFile: { name: string; path: string } | null;
  channelParticipants: { address: string; label: string }[];
  supportedTokens: string[];
  isLoadingChannelData: boolean;
  onRefresh: () => void;
}

const GenerationOverview: React.FC<GenerationOverviewProps> = ({
  channelId,
  onChannelIdChange,
  stateFile,
  channelParticipants,
  supportedTokens,
  isLoadingChannelData,
  onRefresh,
}) => {
  return (
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
          onClick={onRefresh}
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
          onChange={(e) => onChannelIdChange(e.target.value)}
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
  );
};

export default GenerationOverview;
