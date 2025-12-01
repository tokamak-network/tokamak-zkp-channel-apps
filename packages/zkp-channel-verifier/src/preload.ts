import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  uploadFile: () => ipcRenderer.invoke("upload-file"),
  saveFile: (fileName: string, content: string | Buffer) =>
    ipcRenderer.invoke("save-file", fileName, content),
  executeBinary: (command: string[]) =>
    ipcRenderer.invoke("execute-binary", command),
  onBinaryStdout: (callback: (data: string) => void) => {
    ipcRenderer.on("binary-stdout", (_, data) => callback(data));
  },
  onBinaryStderr: (callback: (data: string) => void) => {
    ipcRenderer.on("binary-stderr", (_, data) => callback(data));
  },

  // Proof generation workflow
  synthesizeAndProve: (options: any) =>
    ipcRenderer.invoke("synthesize-and-prove", options),

  // Real-time event listeners for proof generation
  onStatusUpdate: (callback: (status: string) => void) => {
    ipcRenderer.on("status-update", (_, status) => callback(status));
  },
  onProverStdout: (callback: (data: string) => void) => {
    ipcRenderer.on("prover-stdout", (_, data) => callback(data));
  },
  onProverStderr: (callback: (data: string) => void) => {
    ipcRenderer.on("prover-stderr", (_, data) => callback(data));
  },
  onVerifierStdout: (callback: (data: string) => void) => {
    ipcRenderer.on("verifier-stdout", (_, data) => callback(data));
  },

  // Create ZIP file from proof files
  createProofZip: (files: {
    instance: string;
    placementVariables: string;
    permutation: string;
    stateSnapshot: string;
    proof: string;
  }) => ipcRenderer.invoke("create-proof-zip", files),
});

