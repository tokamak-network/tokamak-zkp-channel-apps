import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  uploadFile: () => ipcRenderer.invoke("upload-file"),
  readFile: (filePath: string) => ipcRenderer.invoke("read-file", filePath),
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
});

// Expose generic IPC invoke for other handlers
contextBridge.exposeInMainWorld("electron", {
  invoke: (channel: string, ...args: any[]) =>
    ipcRenderer.invoke(channel, ...args),
});
