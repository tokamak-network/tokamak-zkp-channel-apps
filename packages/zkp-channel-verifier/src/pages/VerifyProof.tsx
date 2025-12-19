import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CheckCircle2,
  Info,
  FileText,
  ArrowLeft,
  Check,
  X,
  AlertTriangle,
} from "lucide-react";
import Layout from "@/components/Layout";

interface UploadedFile {
  name: string;
  path: string;
  content: string;
}

const VerifyProof: React.FC = () => {
  const navigate = useNavigate();
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<
    "pending" | "success" | "failure" | null
  >(null);
  const [logs, setLogs] = useState<string[]>([]);

  const handleFileUpload = async () => {
    try {
      const result = await window.electron.invoke("upload-file", { allowDirectory: true });
      if (result) {
        setUploadedFile({
          name: result.filePath.split("/").pop() || "unknown",
          path: result.filePath,
          content: result.content || "",
        });
        setVerificationResult(null);
        setLogs([]);
      }
    } catch (error: any) {
      console.error("File upload failed:", error);
      setLogs((prev) => [...prev, `❌ File upload failed: ${error.message || error}`]);
    }
  };

  const handleVerify = async () => {
    if (!uploadedFile) {
      alert("Please upload a proof file first.");
      return;
    }

    setIsVerifying(true);
    setVerificationResult("pending");
    setLogs([
      "🔍 Starting verification...",
      `📁 Proof file: ${uploadedFile.name}`,
      `📂 Path: ${uploadedFile.path}`,
    ]);

    try {
      // Execute verify-proof using tokamak-cli
      const result = await window.electron.invoke("verify-proof", {
        proofPath: uploadedFile.path,
      });

      // Add preprocess output to logs
      if (result.preprocessOutput) {
        setLogs((prev) => [...prev, "🔄 Preprocess execution:"]);
        const preprocessLines = result.preprocessOutput.split("\n").filter((line: string) => line.trim());
        setLogs((prev) => [...prev, ...preprocessLines.map((line: string) => `  > ${line}`)]);
      }

      if (result.preprocessStderr) {
        const preprocessStderrLines = result.preprocessStderr.split("\n").filter((line: string) => line.trim());
        setLogs((prev) => [...prev, ...preprocessStderrLines.map((line: string) => `  ⚠️ ${line}`)]);
      }

      // Add verify output to logs
      if (result.output) {
        setLogs((prev) => [...prev, "🔍 Verify execution:"]);
        const outputLines = result.output.split("\n").filter((line: string) => line.trim());
        setLogs((prev) => [...prev, ...outputLines.map((line: string) => `  > ${line}`)]);
      }

      if (result.stderr) {
        const stderrLines = result.stderr.split("\n").filter((line: string) => line.trim());
        setLogs((prev) => [...prev, ...stderrLines.map((line: string) => `  ⚠️ ${line}`)]);
      }

      // Check if verification result is false in stdout
      const outputLower = (result.output || "").toLowerCase().trim();
      const isVerificationFalse = outputLower.includes("false") && !outputLower.includes("true");

      if (result.success && !isVerificationFalse) {
        setLogs((prev) => [...prev, "✅ Verification completed successfully."]);
        setVerificationResult("success");
      } else {
        const errorMessage = isVerificationFalse
          ? "Proof verification failed: The proof is invalid"
          : result.error || "Verification failed";
        setLogs((prev) => [
          ...prev,
          `⚠️ ${errorMessage}`,
        ]);
        setVerificationResult("failure");
      }
    } catch (error: any) {
      setLogs((prev) => [
        ...prev,
        `❌ Verification failed: ${error.message || error}`,
      ]);
      setVerificationResult("failure");
    } finally {
      setIsVerifying(false);
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
              <CheckCircle2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Verify Proof</h1>
              <p className="text-sm text-gray-400">
                Monitor your proof verification status and results.
              </p>
            </div>
          </div>

          {/* Verification Overview */}
          <div
            className="bg-gradient-to-b from-[#1a2347] to-[#0a1930] border border-[#4fc3f7] shadow-lg shadow-[#4fc3f7]/20"
            style={{ padding: "32px", marginBottom: "48px" }}
          >
            <div
              className="flex items-center"
              style={{ gap: "12px", marginBottom: "24px" }}
            >
              <div className="bg-[#4fc3f7] p-2 rounded">
                <CheckCircle2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">
                  Verification Overview
                </h2>
                <p className="text-sm text-gray-400">
                  Current verification status and statistics
                </p>
              </div>
            </div>

            {/* Statistics Grid */}
            <div className="grid grid-cols-2" style={{ gap: "32px" }}>
              <div
                className="bg-gradient-to-b from-[#1a2347] to-[#0a1930] border border-[#4fc3f7]/30 hover:border-[#4fc3f7] transition-all hover:shadow-lg hover:shadow-[#4fc3f7]/20"
                style={{ padding: "20px" }}
              >
                <div
                  className="flex items-center justify-between"
                  style={{ marginBottom: "12px" }}
                >
                  <span className="text-sm font-medium text-gray-300">
                    Verification Status
                  </span>
                  <div className="bg-[#4fc3f7] p-2 rounded">
                    <CheckCircle2 className="w-4 h-4 text-white" />
                  </div>
                </div>
                <div className={`text-3xl font-bold ${
                  verificationResult === "success"
                    ? "text-green-400"
                    : verificationResult === "failure"
                      ? "text-yellow-400"
                      : "text-white"
                }`}>
                  {verificationResult === "success"
                    ? "Verified"
                    : verificationResult === "failure"
                      ? "Failed"
                      : "Pending"}
                </div>
              </div>

              <div
                className="bg-gradient-to-b from-[#1a2347] to-[#0a1930] border border-[#4fc3f7]/30 hover:border-[#4fc3f7] transition-all hover:shadow-lg hover:shadow-[#4fc3f7]/20"
                style={{ padding: "20px" }}
              >
                <div
                  className="flex items-center justify-between"
                  style={{ marginBottom: "12px" }}
                >
                  <span className="text-sm font-medium text-gray-300">
                    Uploaded Files
                  </span>
                  <div className="bg-[#4fc3f7] p-2 rounded">
                    <FileText className="w-4 h-4 text-white" />
                  </div>
                </div>
                <div className="text-3xl font-bold text-white">
                  {uploadedFile ? 1 : 0}
                </div>
              </div>
            </div>
          </div>

          {/* Your Information Section */}
          <div
            className="bg-gradient-to-b from-[#1a2347] to-[#0a1930] border border-[#4fc3f7] shadow-lg shadow-[#4fc3f7]/20"
            style={{ padding: "32px", marginBottom: "48px" }}
          >
            <div
              className="flex items-center"
              style={{ gap: "12px", marginBottom: "24px" }}
            >
              <div className="bg-[#4fc3f7] p-2 rounded">
                <Info className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">
                  Your Information
                </h2>
              <p className="text-sm text-gray-400">
                Upload a ZIP file containing proof.json to verify
              </p>
              </div>
            </div>

            <button
              onClick={handleFileUpload}
              className="w-full py-6 border-2 border-dashed border-[#4fc3f7]/30 hover:border-[#4fc3f7] bg-[#0a1930]/50 text-gray-300 hover:text-[#4fc3f7] transition-all flex items-center justify-center gap-3 mb-4"
            >
              <FileText className="w-6 h-6" />
              <span className="font-semibold">
                Upload Proof ZIP File
              </span>
            </button>

            {uploadedFile && (
              <div className="p-4 bg-[#0a1930]/50 border border-[#4fc3f7]/30">
                <div className="flex items-center gap-3">
                  <div className="bg-green-500 p-2 rounded">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate">
                      {uploadedFile.name}
                    </p>
                    <p className="text-gray-400 text-xs font-mono truncate">
                      {uploadedFile.path}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Available Actions */}
          <div
            className="bg-gradient-to-b from-[#1a2347] to-[#0a1930] border border-[#4fc3f7]/30"
            style={{ padding: "32px", marginBottom: "48px" }}
          >
            <div
              className="flex items-center"
              style={{ gap: "12px", marginBottom: "24px" }}
            >
              <div className="bg-[#4fc3f7]/20 p-2 rounded">
                <CheckCircle2 className="w-5 h-5 text-[#4fc3f7]" />
              </div>
              <h3 className="text-lg font-semibold text-white">
                Available Actions
              </h3>
            </div>

            <button
              onClick={handleVerify}
              disabled={!uploadedFile || isVerifying}
              className={`w-full flex items-center justify-between transition-all ${
                !uploadedFile || isVerifying
                  ? "bg-[#0a1930]/50 border border-[#4fc3f7]/20 text-gray-500 cursor-not-allowed"
                  : "bg-[#0a1930]/50 border border-[#4fc3f7]/30 hover:border-[#4fc3f7] text-white"
              }`}
              style={{ padding: "12px 16px" }}
            >
              <div className="flex items-center" style={{ gap: "12px" }}>
                <div
                  className={`p-2 rounded ${!uploadedFile || isVerifying ? "bg-gray-700" : "bg-green-500"}`}
                >
                  <Check className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <p className="font-semibold">
                    {isVerifying ? "Verifying Proof..." : "Verify Proof"}
                  </p>
                  <p className="text-xs text-gray-400">
                    Run verification on uploaded files
                  </p>
                </div>
              </div>
              {!isVerifying && uploadedFile && (
                <Check className="w-5 h-5 text-green-500" />
              )}
            </button>
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

          {/* Result Section */}
          {verificationResult && verificationResult !== "pending" && (
            <div
              className={`bg-gradient-to-b from-[#1a2347] to-[#0a1930] border-2 ${
                verificationResult === "success"
                  ? "border-green-500"
                  : "border-yellow-500"
              }`}
              style={{ padding: "40px", marginBottom: "48px" }}
            >
              <div className="flex items-start" style={{ gap: "16px" }}>
                <div
                  className={`p-3 rounded ${
                    verificationResult === "success"
                      ? "bg-green-500"
                      : "bg-yellow-500"
                  }`}
                >
                  {verificationResult === "success" ? (
                    <Check className="w-8 h-8 text-white" />
                  ) : (
                    <AlertTriangle className="w-8 h-8 text-white" />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-white mb-2">
                    {verificationResult === "success"
                      ? "Verification Successful"
                      : "Verification Failed"}
                  </h3>
                  <p
                    className={`text-sm ${
                      verificationResult === "success"
                        ? "text-green-300"
                        : "text-yellow-300"
                    }`}
                  >
                    {verificationResult === "success"
                      ? "The proof has been verified successfully. All checks passed."
                      : "The proof verification failed. The proof is invalid or does not match the expected result."}
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
                <span>
                  Upload a ZIP file containing proof.json (generated from Generate Proof)
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#4fc3f7] mt-1">•</span>
                <span>
                  Click "Verify Proof" to start the verification process using verify binary
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#4fc3f7] mt-1">•</span>
                <span>Review the execution logs and verification results</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default VerifyProof;
