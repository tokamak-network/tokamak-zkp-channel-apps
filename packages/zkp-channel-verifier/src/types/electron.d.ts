export interface ElectronAPI {
  uploadFile: () => Promise<{
    filePath: string;
    content: string;
  } | null>;
  readFile: (filePath: string) => Promise<{
    success: boolean;
    content?: string;
    error?: string;
  }>;
  saveFile: (
    fileName: string,
    content: string | Buffer // Accept base64 string or Buffer
  ) => Promise<{ success: boolean; filePath?: string }>;
  executeBinary: (
    command: string[]
  ) => Promise<{ success: boolean; stdout: string; stderr: string }>;
  onBinaryStdout: (callback: (data: string) => void) => void;
  onBinaryStderr: (callback: (data: string) => void) => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
    electron: {
      invoke: (channel: string, ...args: any[]) => Promise<any>;
    };
  }
}
