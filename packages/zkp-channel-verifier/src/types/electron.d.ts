export interface SynthesizeAndProveOptions {
  synthesizerOutputDir: string; // Path to directory containing instance.json, placementVariables.json, permutation.json
  proveOutputDir?: string; // Optional: where to save proof files
}

export interface SynthesizeAndProveResult {
  success: boolean;
  verified?: boolean;
  newStateSnapshot?: string; // JSON string of new state for next transaction
  files?: {
    synthesizer: {
      instance: string;
      placementVariables: string;
      permutation: string;
      stateSnapshot: string;
    };
    proof: string;
  };
  error?: string;
}

export interface ElectronAPI {
  uploadFile: () => Promise<{
    filePath: string;
    content?: string; // For JSON files
    extractedDir?: string; // For ZIP files
    stateSnapshot?: string; // JSON string of state_snapshot.json from ZIP
    isZip: boolean;
  } | null>;
  saveFile: (
    fileName: string,
    content: Buffer
  ) => Promise<{ success: boolean; filePath?: string }>;
  executeBinary: (
    command: string[]
  ) => Promise<{ success: boolean; stdout: string; stderr: string }>;
  onBinaryStdout: (callback: (data: string) => void) => void;
  onBinaryStderr: (callback: (data: string) => void) => void;

  // Synthesizer & Proof Generation APIs
  synthesizeAndProve: (
    options: SynthesizeAndProveOptions
  ) => Promise<SynthesizeAndProveResult>;
  runProver: (
    synthesizerOutputDir: string
  ) => Promise<{ success: boolean; outputDir?: string; error?: string }>;
  runVerifier: (
    synthesizerOutputDir: string,
    proveOutputDir: string
  ) => Promise<{ success: boolean; verified?: boolean; error?: string }>;

  // Event listeners
  onSynthesisComplete: (callback: (data: any) => void) => void;
  onProveComplete: (callback: (data: any) => void) => void;
  onProverStdout: (callback: (data: string) => void) => void;
  onProverStderr: (callback: (data: string) => void) => void;
  onVerifierStdout: (callback: (data: string) => void) => void;
  onVerifierStderr: (callback: (data: string) => void) => void;
  onStatusUpdate: (callback: (status: string) => void) => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
