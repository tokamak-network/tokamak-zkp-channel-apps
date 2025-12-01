import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  Menu,
  MenuItemConstructorOptions,
  shell,
  session,
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
        { name: "JSON Files", extensions: ["json"] },
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

  // ========================================================================
  // Synthesizer & Proof Generation Handlers
  // ========================================================================

  // Synthesize and prove handler (full workflow)
  // Note: Synthesizer is run as a binary, so we only run preprocess/prove/verify here
  ipcMain.handle("synthesize-and-prove", async (event, options: any) => {
    const { runProver, runVerifier, runPreprocess } = await import(
      "./synthesizer/binaryRunner"
    );
    const { resolve } = await import("path");

    try {
      const {
        synthesizerOutputDir, // Path to directory containing instance.json, placementVariables.json, permutation.json
        proveOutputDir, // Optional: where to save proof files
      } = options;

      if (!synthesizerOutputDir) {
        throw new Error("synthesizerOutputDir is required");
      }

      console.log("[synthesize-and-prove] Starting with options:", {
        synthesizerOutputDir,
        proveOutputDir,
      });

      // Verify that required Synthesizer output files exist
      const requiredFiles = [
        "instance.json",
        "placementVariables.json",
        "permutation.json",
      ];
      for (const file of requiredFiles) {
        const filePath = resolve(synthesizerOutputDir, file);
        if (!fs.existsSync(filePath)) {
          throw new Error(
            `Required Synthesizer output file not found: ${filePath}`
          );
        }
      }

      // Create prove output directory if not provided
      const finalProveOutputDir =
        proveOutputDir || resolve(synthesizerOutputDir, "..", "proof");
      fs.mkdirSync(finalProveOutputDir, { recursive: true });

      event.sender.send("synthesis-complete", {
        outputDir: synthesizerOutputDir,
      });

      // Run preprocess (one-time)
      event.sender.send("status-update", "Running preprocess...");
      const preprocessResult = await runPreprocess(
        synthesizerOutputDir,
        (data) => event.sender.send("prover-stdout", data),
        (data) => event.sender.send("prover-stderr", data)
      );

      if (!preprocessResult.success) {
        throw new Error(preprocessResult.stderr || "Preprocess failed");
      }

      // Run prover
      event.sender.send("status-update", "Generating proof...");
      const proveResult = await runProver(
        synthesizerOutputDir,
        finalProveOutputDir,
        (data) => event.sender.send("prover-stdout", data),
        (data) => event.sender.send("prover-stderr", data)
      );

      if (!proveResult.success) {
        throw new Error(proveResult.stderr || "Prove failed");
      }

      event.sender.send("prove-complete", { outputDir: finalProveOutputDir });

      // Run verifier
      event.sender.send("status-update", "Verifying proof...");
      const verifyResult = await runVerifier(
        synthesizerOutputDir,
        finalProveOutputDir,
        (data) => event.sender.send("verifier-stdout", data),
        (data) => event.sender.send("verifier-stderr", data)
      );

      if (!verifyResult.success) {
        throw new Error(verifyResult.stderr || "Verification failed");
      }

      // Check if state_snapshot.json exists (optional)
      const stateSnapshotPath = resolve(
        synthesizerOutputDir,
        "state_snapshot.json"
      );
      const hasStateSnapshot = fs.existsSync(stateSnapshotPath);

      return {
        success: true,
        verified: verifyResult.success,
        files: {
          synthesizer: {
            instance: resolve(synthesizerOutputDir, "instance.json"),
            placementVariables: resolve(
              synthesizerOutputDir,
              "placementVariables.json"
            ),
            permutation: resolve(synthesizerOutputDir, "permutation.json"),
            ...(hasStateSnapshot && { stateSnapshot: stateSnapshotPath }),
          },
          proof: resolve(finalProveOutputDir, "proof.json"),
        },
      };
    } catch (error: any) {
      console.error("[synthesize-and-prove] Error:", error);
      event.sender.send("status-update", "Error: " + error.message);
      return { success: false, error: error.message };
    }
  });

  // Run prover only (for already synthesized circuits)
  ipcMain.handle("run-prover", async (event, synthesizerOutputDir: string) => {
    const { runProver } = await import("./synthesizer/binaryRunner");
    const { resolve } = await import("path");

    const proveOutputDir = resolve(synthesizerOutputDir, "../proof");
    fs.mkdirSync(proveOutputDir, { recursive: true });

    const result = await runProver(
      synthesizerOutputDir,
      proveOutputDir,
      (data) => event.sender.send("prover-stdout", data),
      (data) => event.sender.send("prover-stderr", data)
    );

    return result;
  });

  // Run verifier only (for already generated proofs)
  ipcMain.handle(
    "run-verifier",
    async (event, synthesizerOutputDir: string, proveOutputDir: string) => {
      const { runVerifier } = await import("./synthesizer/binaryRunner");

      const result = await runVerifier(
        synthesizerOutputDir,
        proveOutputDir,
        (data) => event.sender.send("verifier-stdout", data),
        (data) => event.sender.send("verifier-stderr", data)
      );

      return result;
    }
  );

  console.log("All IPC handlers registered successfully");
}

app.whenReady().then(async () => {
  console.log("App ready, creating window...");

  // Configure session to allow external API requests
  const defaultSession = session.defaultSession;

  // Set proper headers for all requests
  defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
    const { requestHeaders } = details;

    // Add necessary headers for RPC requests
    if (
      details.url.includes("infura.io") ||
      details.url.includes("alchemy.com") ||
      details.url.includes("rpc.")
    ) {
      requestHeaders["Content-Type"] = "application/json";
      requestHeaders["Accept"] = "application/json";
      requestHeaders["Origin"] = "electron://zkp-channel-verifier";
    }

    callback({ requestHeaders });
  });

  // Don't modify response headers - let the server handle CORS
  // Adding CORS headers here causes duplicate '*, *' errors

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
