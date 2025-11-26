import React from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, Plus, Info, Settings } from "lucide-react";
import Layout from "@/components/Layout";

const MainMenu: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Layout>
      <div className="p-4 pb-20 flex justify-center">
        <div className="max-w-7xl w-full" style={{ marginTop: "40px" }}>
          {/* Settings Button - Top Right */}
          <div className="flex justify-end" style={{ marginBottom: "24px" }}>
            <button
              onClick={() => navigate("/settings")}
              className="flex items-center bg-[#1a2347] hover:bg-[#4fc3f7]/20 border border-[#4fc3f7]/30 hover:border-[#4fc3f7] text-gray-300 hover:text-[#4fc3f7] rounded transition-all"
              style={{ padding: "10px 20px", gap: "8px" }}
            >
              <Settings className="w-5 h-5" />
              <span style={{ fontSize: "15px", fontWeight: "500" }}>
                Settings
              </span>
            </button>
          </div>

          {/* Welcome Header */}
          <div style={{ marginBottom: "64px" }}>
            <div className="text-center">
              <h2
                className="text-white font-bold"
                style={{ fontSize: "48px", marginBottom: "16px" }}
              >
                Tokamak ZKP Channels Apps
              </h2>
              <p className="text-gray-300" style={{ fontSize: "20px" }}>
                Manage your proofs
              </p>
            </div>
          </div>

          {/* Action Cards */}
          <div
            className="bg-gradient-to-b from-[#1a2347] to-[#0a1930] border border-[#4fc3f7] shadow-lg shadow-[#4fc3f7]/20"
            style={{ marginBottom: "48px", padding: "48px" }}
          >
            <div
              className="grid grid-cols-1 md:grid-cols-2"
              style={{ gap: "48px" }}
            >
              {/* Generate Proof Card */}
              <button
                onClick={() => navigate("/generate")}
                className="bg-gradient-to-b from-[#1a2347] to-[#0a1930] border border-[#4fc3f7]/30 hover:border-[#4fc3f7] transition-all hover:shadow-lg hover:shadow-[#4fc3f7]/20 cursor-pointer group text-left"
                style={{ padding: "32px" }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "24px",
                  }}
                >
                  <span
                    className="font-medium text-gray-300"
                    style={{ fontSize: "24px" }}
                  >
                    Generate Proof
                  </span>
                  <div
                    className="bg-[#4fc3f7] rounded group-hover:bg-[#029bee] transition-all"
                    style={{ padding: "16px" }}
                  >
                    <Plus
                      style={{ width: "32px", height: "32px" }}
                      className="text-white"
                    />
                  </div>
                </div>
                <div className="text-gray-400" style={{ fontSize: "16px" }}>
                  Create new proof based on latest channel state
                </div>
              </button>

              {/* Verify Proof Card */}
              <button
                onClick={() => navigate("/verify")}
                className="bg-gradient-to-b from-[#1a2347] to-[#0a1930] border border-[#4fc3f7]/30 hover:border-[#4fc3f7] transition-all hover:shadow-lg hover:shadow-[#4fc3f7]/20 cursor-pointer group text-left"
                style={{ padding: "32px" }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "24px",
                  }}
                >
                  <span
                    className="font-medium text-gray-300"
                    style={{ fontSize: "24px" }}
                  >
                    Verify Proof
                  </span>
                  <div
                    className="bg-[#4fc3f7] rounded group-hover:bg-[#029bee] transition-all"
                    style={{ padding: "16px" }}
                  >
                    <CheckCircle2
                      style={{ width: "32px", height: "32px" }}
                      className="text-white"
                    />
                  </div>
                </div>
                <div className="text-gray-400" style={{ fontSize: "16px" }}>
                  Verify intermediate proof with EVM state files
                </div>
              </button>
            </div>
          </div>

          {/* System Overview Section */}
          <div
            className="bg-gradient-to-b from-[#1a2347] to-[#0a1930] border border-[#4fc3f7] shadow-lg shadow-[#4fc3f7]/20"
            style={{ padding: "48px", marginBottom: "64px" }}
          >
            <div style={{ marginBottom: "24px", textAlign: "center" }}>
              <h3
                className="font-semibold text-white"
                style={{ fontSize: "20px" }}
              >
                System Overview
              </h3>
            </div>

            {/* System Status Grid */}
            <div
              className="grid grid-cols-1 md:grid-cols-3"
              style={{ gap: "24px" }}
            >
              <div
                className="bg-[#0a1930]/50 border border-[#4fc3f7]/20"
                style={{ padding: "24px", textAlign: "center" }}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "12px",
                  }}
                >
                  <div
                    style={{
                      width: "12px",
                      height: "12px",
                      backgroundColor: "#22c55e",
                      borderRadius: "50%",
                    }}
                    className="animate-pulse"
                  ></div>
                  <span
                    className="font-medium text-gray-400"
                    style={{ fontSize: "14px" }}
                  >
                    System Status
                  </span>
                  <div
                    className="text-white"
                    style={{ fontSize: "18px", fontWeight: "600" }}
                  >
                    Online
                  </div>
                </div>
              </div>

              <div
                className="bg-[#0a1930]/50 border border-[#4fc3f7]/20"
                style={{ padding: "24px", textAlign: "center" }}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "12px",
                  }}
                >
                  <Info
                    style={{ width: "16px", height: "16px" }}
                    className="text-[#4fc3f7]"
                  />
                  <span
                    className="font-medium text-gray-400"
                    style={{ fontSize: "14px" }}
                  >
                    App Version
                  </span>
                  <div
                    className="text-[#4fc3f7]"
                    style={{ fontSize: "18px", fontWeight: "600" }}
                  >
                    v1.0.0
                  </div>
                </div>
              </div>

              <div
                className="bg-[#0a1930]/50 border border-[#4fc3f7]/20"
                style={{ padding: "24px", textAlign: "center" }}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "12px",
                  }}
                >
                  <Info
                    style={{ width: "16px", height: "16px" }}
                    className="text-[#4fc3f7]"
                  />
                  <span
                    className="font-medium text-gray-400"
                    style={{ fontSize: "14px" }}
                  >
                    ZK-EVM Version
                  </span>
                  <div
                    className="text-[#4fc3f7]"
                    style={{ fontSize: "18px", fontWeight: "600" }}
                  >
                    v0.1.0
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default MainMenu;
