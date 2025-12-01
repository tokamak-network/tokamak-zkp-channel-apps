import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  uploadFile: () => ipcRenderer.invoke("upload-file"),
  saveFile: (fileName: string, content: Buffer) =>
    ipcRenderer.invoke("save-file", fileName, content),
  executeBinary: (command: string[]) =>
    ipcRenderer.invoke("execute-binary", command),
  onBinaryStdout: (callback: (data: string) => void) => {
    ipcRenderer.on("binary-stdout", (_, data) => callback(data));
  },
  onBinaryStderr: (callback: (data: string) => void) => {
    ipcRenderer.on("binary-stderr", (_, data) => callback(data));
  },

  // Synthesizer & Proof Generation APIs
  synthesizeAndProve: (options: any) =>
    ipcRenderer.invoke("synthesize-and-prove", options),
  runProver: (synthesizerOutputDir: string) =>
    ipcRenderer.invoke("run-prover", synthesizerOutputDir),
  runVerifier: (synthesizerOutputDir: string, proveOutputDir: string) =>
    ipcRenderer.invoke("run-verifier", synthesizerOutputDir, proveOutputDir),

  // Event listeners for proof generation
  onSynthesisComplete: (callback: (data: any) => void) => {
    ipcRenderer.on("synthesis-complete", (_, data) => callback(data));
  },
  onProveComplete: (callback: (data: any) => void) => {
    ipcRenderer.on("prove-complete", (_, data) => callback(data));
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
  onVerifierStderr: (callback: (data: string) => void) => {
    ipcRenderer.on("verifier-stderr", (_, data) => callback(data));
  },
  onStatusUpdate: (callback: (status: string) => void) => {
    ipcRenderer.on("status-update", (_, status) => callback(status));
  },
});
