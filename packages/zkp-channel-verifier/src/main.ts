import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  Menu,
  MenuItemConstructorOptions,
  shell,
} from "electron";

declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string;
declare const MAIN_WINDOW_VITE_NAME: string;
import path from "node:path";
import fs from "node:fs";
import { exec, spawn } from "node:child_process";
import started from "electron-squirrel-startup";

if (started) {
  app.quit();
}

// Disable Electron Safe Storage to prevent keychain access prompts
app.commandLine.appendSwitch(
  "disable-features",
  "ElectronSerialChooser,SafeStorage,PasswordManager,AutofillManager"
);

process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = "true";
process.env.ELECTRON_DISABLE_SAFE_STORAGE = "true";

if (process.platform === "darwin") {
  app.commandLine.appendSwitch(
    "disable-features",
    "SafeStorage,KeychainAccess,PasswordManager"
  );
  app.commandLine.appendSwitch("disable-background-timer-throttling");
  app.commandLine.appendSwitch("disable-renderer-backgrounding");

  const originalSafeStorage = require("electron").safeStorage;
  if (originalSafeStorage) {
    originalSafeStorage.isEncryptionAvailable = () => false;
  }
}

const createWindow = () => {
  const width = 1200;
  const height = 910;

  const mainWindow = new BrowserWindow({
    width,
    height,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`)
    );
  }

  mainWindow.webContents.openDevTools();

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.webContents.on("will-navigate", (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);
    if (parsedUrl.origin !== new URL(mainWindow.webContents.getURL()).origin) {
      event.preventDefault();
      shell.openExternal(navigationUrl);
    }
  });

  createMenu();
};

function createMenu(): void {
  const isMac = process.platform === "darwin";

  const template: MenuItemConstructorOptions[] = [
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: "about" as const },
              { type: "separator" as const },
              { role: "services" as const },
              { type: "separator" as const },
              { role: "hide" as const },
              { role: "hideOthers" as const },
              { role: "unhide" as const },
              { type: "separator" as const },
              { role: "quit" as const },
            ] as MenuItemConstructorOptions[],
          },
        ]
      : []),
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "delete" },
        { type: "separator" },
        { role: "selectAll" },
      ],
    },
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "forceReload" },
        { role: "toggleDevTools" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

function setupIpcHandlers() {
  console.log("Setting up IPC handlers...");

  // File upload handler
  ipcMain.handle("upload-file", async () => {
    const { filePaths } = await dialog.showOpenDialog({
      properties: ["openFile"],
      filters: [
        { name: "ZIP Files", extensions: ["zip"] },
        { name: "All Files", extensions: ["*"] },
      ],
    });
    if (filePaths.length > 0) {
      const content = fs.readFileSync(filePaths[0]);
      return { filePath: filePaths[0], content: content.toString("base64") };
    }
    return null;
  });

  // Save file handler
  ipcMain.handle(
    "save-file",
    async (event, defaultFileName: string, content: Buffer) => {
      const { filePath } = await dialog.showSaveDialog({
        defaultPath: defaultFileName,
        filters: [{ name: "ZIP Files", extensions: ["zip"] }],
      });
      if (filePath) {
        fs.writeFileSync(filePath, content);
        return { success: true, filePath };
      }
      return { success: false };
    }
  );

  // Execute binary command handler (for verify and prove operations)
  ipcMain.handle("execute-binary", async (event, command: string[]) => {
    return new Promise((resolve, reject) => {
      const proc = spawn(command[0], command.slice(1), {
        stdio: ["pipe", "pipe", "pipe"],
      });

      let stdout = "";
      let stderr = "";

      proc.stdout?.on("data", (data: Buffer) => {
        stdout += data.toString();
        event.sender.send("binary-stdout", data.toString());
      });

      proc.stderr?.on("data", (data: Buffer) => {
        stderr += data.toString();
        event.sender.send("binary-stderr", data.toString());
      });

      proc.on("close", (code: number) => {
        if (code === 0) {
          resolve({ success: true, stdout, stderr });
        } else {
          reject(new Error(`Process exited with code ${code}: ${stderr}`));
        }
      });

      proc.on("error", (error: Error) => {
        reject(error);
      });
    });
  });

  console.log("All IPC handlers registered successfully");
}

app.whenReady().then(async () => {
  console.log("App ready, creating window...");
  setupIpcHandlers();
  createWindow();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on("before-quit", async () => {
  console.log("App is quitting...");
  BrowserWindow.getAllWindows().forEach((window) => {
    window.destroy();
  });
});

