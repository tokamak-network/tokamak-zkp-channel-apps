export interface ElectronAPI {
  uploadFile: () => Promise<{
    filePath: string;
    content?: string;
    extractedDir?: string;
    isZip?: boolean;
    stateSnapshot?: string;
  } | null>;
  saveFile: (
    fileName: string,
    content: string | Buffer // Accept base64 string or Buffer
  ) => Promise<{ success: boolean; filePath?: string }>;
  executeBinary: (
    command: string[]
  ) => Promise<{ success: boolean; stdout: string; stderr: string }>;
  onBinaryStdout: (callback: (data: string) => void) => void;
  onBinaryStderr: (callback: (data: string) => void) => void;

  // Proof generation workflow
  synthesizeAndProve: (options: {
    rpcUrl: string;
    contractAddress: string;
    recipientAddress: string;
    amount: string;
    channelId: string;
    channelParticipants: string[];
    previousStateJson?: string;
    senderIndex?: number;
  }) => Promise<{
    success: boolean;
    verified?: boolean;
    newStateSnapshot?: string;
    error?: string;
  }>;

  // Real-time event listeners
  onStatusUpdate: (callback: (status: string) => void) => void;
  onProverStdout: (callback: (data: string) => void) => void;
  onProverStderr: (callback: (data: string) => void) => void;
  onVerifierStdout: (callback: (data: string) => void) => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

