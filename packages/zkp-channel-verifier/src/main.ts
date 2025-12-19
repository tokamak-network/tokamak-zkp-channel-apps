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
import { spawn } from "node:child_process";
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
  ipcMain.handle("upload-file", async (event, options?: { allowDirectory?: boolean }) => {
    const { filePaths } = await dialog.showOpenDialog({
      properties: options?.allowDirectory ? ["openFile", "openDirectory"] : ["openFile"],
      filters: [
        { name: "ZIP Files", extensions: ["zip"] },
        { name: "JSON Files", extensions: ["json"] },
        { name: "All Files", extensions: ["*"] },
      ],
    });
    if (filePaths.length > 0) {
      const filePath = filePaths[0];
      const isZip = filePath.toLowerCase().endsWith(".zip");
      const fs = await import("fs/promises");
      const stat = await fs.stat(filePath);
      const isDirectory = stat.isDirectory();

      if (isZip) {
        // Extract ZIP file to temporary directory
        const { extractZip, readStateSnapshot, readTransactionInfo, findContentDir } = await import(
          "./utils/zipHelper"
        );
        const extractedDir = await extractZip(filePath);
        const contentDir = findContentDir(extractedDir);
        console.log("[main] Extracted dir:", extractedDir);
        console.log("[main] Content dir:", contentDir);

        // Try to read state_snapshot.json if it exists
        const stateSnapshot = readStateSnapshot(extractedDir);
        console.log("[main] State snapshot:", stateSnapshot ? "found" : "not found");

        // Try to read transaction-info.json if it exists
        const transactionInfo = readTransactionInfo(extractedDir);
        console.log("[main] Transaction info:", transactionInfo ? "found" : "not found");
        
        let finalTransactionInfo = transactionInfo;
        
        if (!transactionInfo) {
          console.log("[main] Transaction info is null. Checking contentDir directly...");
          // Try to read directly from contentDir as fallback
          const fs = await import("fs/promises");
          const path = await import("path");
          const transactionInfoPath = path.join(contentDir, "transaction-info.json");
          try {
            const exists = await fs.access(transactionInfoPath).then(() => true).catch(() => false);
            console.log("[main] transaction-info.json exists at:", transactionInfoPath, exists);
            if (exists) {
              const content = await fs.readFile(transactionInfoPath, "utf-8");
              console.log("[main] Direct read content:", content);
              // Try to parse and use it
              try {
                const parsed = JSON.parse(content);
                console.log("[main] Parsed transaction info:", parsed);
                finalTransactionInfo = parsed;
              } catch (parseError) {
                console.error("[main] Failed to parse transaction-info.json:", parseError);
              }
            }
          } catch (e) {
            console.error("[main] Error checking transaction-info.json directly:", e);
          }
        } else {
          console.log("[main] Transaction info content:", JSON.stringify(transactionInfo));
        }

        return {
          filePath,
          extractedDir: contentDir, // Return content directory (handles single folder case)
          isZip: true,
          stateSnapshot: stateSnapshot
            ? JSON.stringify(stateSnapshot)
            : undefined,
          transactionInfo: finalTransactionInfo
            ? JSON.stringify(finalTransactionInfo)
            : undefined,
          // Keep channelInfo for backward compatibility
          channelInfo: finalTransactionInfo
            ? JSON.stringify(finalTransactionInfo)
            : undefined,
        };
      } else if (isDirectory) {
        // For directories, return the path directly
        return {
          filePath,
          isZip: false,
          isDirectory: true,
        };
      } else {
        // For JSON files, return content as base64
        const content = fs.readFileSync(filePath);
        return {
          filePath,
          content: content.toString("base64"),
          isZip: false,
          isDirectory: false,
        };
      }
    }
    return null;
  });

  // Read file handler
  ipcMain.handle("read-file", async (event, filePath: string) => {
    try {
      const content = await fs.promises.readFile(filePath);
      return { success: true, content: content.toString("base64") };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // Save file handler
  ipcMain.handle(
    "save-file",
    async (event, defaultFileName: string, content: string | Buffer) => {
      const { filePath } = await dialog.showSaveDialog({
        defaultPath: defaultFileName,
        filters: [
          { name: "ZIP Files", extensions: ["zip"] },
          { name: "JSON Files", extensions: ["json"] },
          { name: "All Files", extensions: ["*"] },
        ],
      });
      if (filePath) {
        // Convert base64 string to Buffer if needed
        const buffer =
          typeof content === "string"
            ? Buffer.from(content, "base64")
            : content;
        fs.writeFileSync(filePath, buffer);
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
  // Uses binary runner and synthesizer wrapper
  ipcMain.handle("synthesize-and-prove", async (event, options: any) => {
    const { runProver, runVerifier, runPreprocess } = await import(
      "./utils/binaryRunner"
    );
    const { runSynthesizer } = await import("./utils/synthesizerWrapper");
    const { getTempDir } = await import("./utils/binaryConfig");
    const { resolve } = await import("path");

    try {
      const {
        rpcUrl,
        contractAddress,
        recipientAddress,
        amount,
        channelId,
        channelParticipants,
        previousStateJson,
        senderIndex = 0,
        synthesizerOutputDir,
        proveOutputDir,
      } = options;

      // Validate required inputs
      if (
        !rpcUrl ||
        !contractAddress ||
        !recipientAddress ||
        !amount ||
        !channelId ||
        !channelParticipants ||
        channelParticipants.length === 0
      ) {
        throw new Error(
          "Missing required inputs: rpcUrl, contractAddress, recipientAddress, amount, channelId, channelParticipants"
        );
      }

      console.log("[synthesize-and-prove] Starting with options:", {
        rpcUrl,
        contractAddress,
        recipientAddress,
        amount,
        channelId,
        channelParticipants: channelParticipants.length,
        senderIndex,
      });

      // Get RollupBridgeCore address from storage (user-configurable in Settings)
      const { storage } = await import("./utils/storage");
      const ROLLUP_BRIDGE_CORE_ADDRESS = storage.getContractAddress();

      // Create output directories
      const finalSynthesizerOutputDir =
        synthesizerOutputDir || getTempDir("synthesizer");
      const finalProveOutputDir =
        proveOutputDir || resolve(finalSynthesizerOutputDir, "..", "proof");

      fs.mkdirSync(finalSynthesizerOutputDir, { recursive: true });
      fs.mkdirSync(finalProveOutputDir, { recursive: true });

      // Validate channel ID
      const channelIdNum = parseInt(channelId, 10);
      if (isNaN(channelIdNum)) {
        throw new Error(`Invalid channel ID: ${channelId}`);
      }

      // Step 1: Run Synthesizer
      event.sender.send(
        "status-update",
        "Running Synthesizer to generate circuit..."
      );

      const synthesizerResult = await runSynthesizer({
        rpcUrl,
        channelId: channelIdNum,
        contractAddress,
        recipientAddress,
        amount,
        rollupBridgeAddress: ROLLUP_BRIDGE_CORE_ADDRESS,
        senderIndex,
        previousStateJson,
        outputDir: finalSynthesizerOutputDir,
      });

      if (!synthesizerResult.success) {
        throw new Error(synthesizerResult.error || "Synthesizer failed");
      }

      console.log("[synthesize-and-prove] Synthesizer completed:", {
        placements: synthesizerResult.placements,
        stateRoot: synthesizerResult.stateRoot,
      });

      event.sender.send("synthesis-complete", {
        outputDir: finalSynthesizerOutputDir,
      });

      // Step 2: Run preprocess (one-time)
      event.sender.send("status-update", "Running preprocess...");
      const preprocessResult = await runPreprocess(
        finalSynthesizerOutputDir,
        (data) => event.sender.send("prover-stdout", data),
        (data) => event.sender.send("prover-stderr", data)
      );

      if (!preprocessResult.success) {
        throw new Error(preprocessResult.error || "Preprocess failed");
      }

      // Step 3: Run prover
      event.sender.send("status-update", "Generating proof...");
      const proveResult = await runProver(
        finalSynthesizerOutputDir,
        finalProveOutputDir,
        (data) => event.sender.send("prover-stdout", data),
        (data) => event.sender.send("prover-stderr", data)
      );

      if (!proveResult.success) {
        throw new Error(proveResult.error || "Prove failed");
      }

      event.sender.send("prove-complete", { outputDir: finalProveOutputDir });

      // Step 4: Run verifier
      event.sender.send("status-update", "Verifying proof...");
      const verifyResult = await runVerifier(
        finalSynthesizerOutputDir,
        finalProveOutputDir,
        (data) => event.sender.send("verifier-stdout", data),
        (data) => event.sender.send("verifier-stderr", data)
      );

      if (!verifyResult.success) {
        throw new Error(verifyResult.error || "Verification failed");
      }

      return {
        success: true,
        verified: verifyResult.success,
        newStateSnapshot: synthesizerResult.stateSnapshot,
        files: {
          synthesizer: {
            instance: resolve(finalSynthesizerOutputDir, "instance.json"),
            placementVariables: resolve(
              finalSynthesizerOutputDir,
              "placementVariables.json"
            ),
            permutation: resolve(finalSynthesizerOutputDir, "permutation.json"),
            stateSnapshot: resolve(
              finalSynthesizerOutputDir,
              "state_snapshot.json"
            ),
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
    const { runProver } = await import("./utils/binaryRunner");
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
      const { runVerifier } = await import("./utils/binaryRunner");

      const result = await runVerifier(
        synthesizerOutputDir,
        proveOutputDir,
        (data) => event.sender.send("verifier-stdout", data),
        (data) => event.sender.send("verifier-stderr", data)
      );

      return result;
    }
  );

  // Get balances from on-chain or snapshot
  ipcMain.handle(
    "get-balances",
    async (
      event,
      options: {
        channelId: string;
        snapshotPath?: string;
        rpcUrl: string;
        network: string;
      }
    ) => {
      const { execFile } = await import("child_process");
      const { promisify } = await import("util");
      const execFileAsync = promisify(execFile);
      const { getBinaryPath } = await import("./utils/binaryConfig");

      try {
        const synthesizerPath = getBinaryPath("synthesizer");
        const args = [
          "get-balances",
          "--channel-id",
          options.channelId,
          "--rpc-url",
          options.rpcUrl,
        ];

        // Add network flag
        if (options.network === "sepolia") {
          args.push("--sepolia");
        }

        // Add snapshot path if provided
        if (options.snapshotPath) {
          args.push("--snapshot", options.snapshotPath);
          console.log(`[get-balances] Using snapshot file: ${options.snapshotPath}`);
          
          // Verify snapshot file exists
          const fs = await import("fs/promises");
          try {
            await fs.access(options.snapshotPath);
            console.log(`[get-balances] Snapshot file exists and is accessible`);
          } catch (e) {
            console.error(`[get-balances] Snapshot file not found or not accessible: ${options.snapshotPath}`, e);
          }
        } else {
          console.log(`[get-balances] No snapshot provided, using on-chain data only`);
        }

        console.log(`Executing get-balances:`, synthesizerPath, args.join(" "));

        // Set working directory to the binaries directory so synthesizer can find resources
        const { BINARY_ROOT_DIR } = await import("./utils/binaryConfig");

        const { stdout, stderr } = await execFileAsync(synthesizerPath, args, {
          maxBuffer: 10 * 1024 * 1024, // 10MB buffer
          cwd: BINARY_ROOT_DIR, // Set working directory to binaries root
        });

        if (stderr) {
          console.error("get-balances stderr:", stderr);
        }

        console.log("get-balances stdout:", stdout);

        return {
          success: true,
          output: stdout,
          stderr: stderr || "",
        };
      } catch (error: any) {
        console.error("get-balances error:", error);
        return {
          success: false,
          error: error.message || "Failed to get balances",
          stderr: error.stderr || "",
          stdout: error.stdout || "",
        };
      }
    }
  );

  // L2 Transfer using synthesizer
  ipcMain.handle(
    "l2-transfer",
    async (
      event,
      options: {
        channelId: string;
        initTx?: string;
        senderKey: string;
        recipient: string;
        amount: string;
        previousState?: string;
        outputDir: string;
        rpcUrl: string;
        network: string;
      }
    ) => {
      const { execFile } = await import("child_process");
      const { promisify } = await import("util");
      const execFileAsync = promisify(execFile);
      const { getBinaryPath, BINARY_ROOT_DIR } = await import("./utils/binaryConfig");
      const path = await import("path");
      const fs = await import("fs/promises");
      const os = await import("os");

      try {
        const synthesizerPath = getBinaryPath("synthesizer");
        
        // Create absolute output directory path
        const timestamp = Date.now();
        const outputDirName = `tx-${timestamp}`;
        const absoluteOutputDir = path.join(os.tmpdir(), "zkp-channel-verifier", outputDirName);
        
        // Ensure output directory exists
        await fs.mkdir(absoluteOutputDir, { recursive: true });

        const args = [
          "l2-transfer",
          "--channel-id",
          options.channelId,
          "--sender-key",
          options.senderKey,
          "--recipient",
          options.recipient,
          "--amount",
          options.amount,
          "--output",
          absoluteOutputDir,
          "--rpc-url",
          options.rpcUrl,
        ];

        // Add network flag
        if (options.network === "sepolia") {
          args.push("--sepolia");
        }

        // Add init-tx if provided (required even when using previous-state)
        if (options.initTx) {
          args.push("--init-tx", options.initTx);
        }

        // Add previous-state if provided (subsequent transfers)
        if (options.previousState) {
          args.push("--previous-state", options.previousState);
        }

        console.log(`Executing l2-transfer:`, synthesizerPath, args.join(" "));

        const { stdout, stderr } = await execFileAsync(synthesizerPath, args, {
          maxBuffer: 10 * 1024 * 1024, // 10MB buffer
          cwd: BINARY_ROOT_DIR, // Set working directory to binaries root
        });

        if (stderr) {
          console.error("l2-transfer stderr:", stderr);
        }

        console.log("l2-transfer stdout:", stdout);

        // Read state_snapshot.json if it exists
        const stateSnapshotPath = path.join(absoluteOutputDir, "state_snapshot.json");
        let stateSnapshot: string | null = null;
        try {
          const stateSnapshotContent = await fs.readFile(stateSnapshotPath, "utf-8");
          stateSnapshot = stateSnapshotContent;
        } catch (e) {
          console.warn("state_snapshot.json not found in output directory");
        }

        // Copy results to binaries/resource/synthesizer
        const { RESOURCES } = await import("./utils/binaryConfig");
        const synthesizerDir = RESOURCES.synthesizer;
        const proveDir = RESOURCES.prove;
        
        // Helper function to copy recursively
        const copyRecursive = async (src: string, dest: string) => {
          const entries = await fs.readdir(src, { withFileTypes: true });
          await fs.mkdir(dest, { recursive: true });
          
          for (const entry of entries) {
            const srcPath = path.join(src, entry.name);
            const destPath = path.join(dest, entry.name);
            
            if (entry.isDirectory()) {
              await copyRecursive(srcPath, destPath);
            } else {
              await fs.copyFile(srcPath, destPath);
            }
          }
        };

        // Helper function to clear directory
        const clearDirectory = async (dir: string) => {
          try {
            const existingFiles = await fs.readdir(dir);
            for (const file of existingFiles) {
              const filePath = path.join(dir, file);
              const stat = await fs.stat(filePath);
              if (stat.isDirectory()) {
                await fs.rm(filePath, { recursive: true, force: true });
              } else {
                await fs.unlink(filePath);
              }
            }
          } catch (e) {
            // Directory might be empty, continue
          }
        };
        
        // Clear and copy synthesizer results
        await fs.mkdir(synthesizerDir, { recursive: true });
        await clearDirectory(synthesizerDir);
        await copyRecursive(absoluteOutputDir, synthesizerDir);
        console.log(`Copied synthesizer results to: ${synthesizerDir}`);

        // Execute prove command
        let proveSuccess = false;
        let proveOutput = "";
        let proveStderr = "";
        try {
          const proveBinaryPath = getBinaryPath("prove");
          const { RESOURCES } = await import("./utils/binaryConfig");
          
          // Check if prove binary exists
          try {
            await fs.access(proveBinaryPath);
          } catch (accessError) {
            console.warn(`prove binary not found at ${proveBinaryPath}, skipping proof generation`);
            proveStderr = `prove binary not found. Please ensure prove is available at ${proveBinaryPath}`;
            // Continue without proof generation - adapter results are still available
          }
          
          if (!proveStderr) {
            // Clear and prepare prove output directory
            await fs.mkdir(proveDir, { recursive: true });
            await clearDirectory(proveDir);
            
            // Command format: ./bin/prove <qap-path> <synthesizer-output-path> <setup-path> <output-path>
            const proveArgs = [
              RESOURCES.qap,        // qap-path
              synthesizerDir,       // synthesizer-output-path
              RESOURCES.setup,      // setup-path
              proveDir,             // output-path (proof files will be written here)
            ];
            
            console.log(`Executing prove:`, proveBinaryPath, proveArgs.join(" "));
            
            const { stdout: proveStdout, stderr: proveStderrOutput } = await execFileAsync(
              proveBinaryPath,
              proveArgs,
              {
                maxBuffer: 10 * 1024 * 1024, // 10MB buffer
                cwd: BINARY_ROOT_DIR,
              }
            );
            
            proveOutput = proveStdout;
            proveStderr = proveStderrOutput || "";
            proveSuccess = true;
            
            console.log("prove stdout:", proveOutput);
            if (proveStderr) {
              console.error("prove stderr:", proveStderr);
            }
            console.log(`Proof files written to: ${proveDir}`);
          }
        } catch (proveError: any) {
          console.error("prove error:", proveError);
          proveOutput = proveError.stdout || "";
          proveStderr = proveError.stderr || proveError.message || proveStderr;
        }

        // Create ZIP file from synthesizer and prove directories
        let zipPath: string | null = null;
        try {
          const AdmZip = (await import("adm-zip")).default;
          const zipFileName = `proof-output-${timestamp}.zip`;
          zipPath = path.join(os.tmpdir(), "zkp-channel-verifier", zipFileName);
          
          // Ensure ZIP directory exists
          await fs.mkdir(path.dirname(zipPath), { recursive: true });

          const zip = new AdmZip();
          
          // Helper function to add directory to ZIP
          const addDirectoryToZip = async (dirPath: string, zipPrefix: string) => {
            try {
              const files = await fs.readdir(dirPath, { recursive: true });
              for (const file of files) {
                const filePath = path.join(dirPath, file);
                const stat = await fs.stat(filePath);
                if (stat.isFile()) {
                  const fileContent = await fs.readFile(filePath);
                  const zipEntryPath = path.join(zipPrefix, file).replace(/\\/g, "/");
                  zip.addFile(zipEntryPath, fileContent);
                }
              }
            } catch (e) {
              console.warn(`Failed to add ${zipPrefix} to ZIP:`, e);
            }
          };
          
          // Add synthesizer directory to ZIP
          await addDirectoryToZip(synthesizerDir, "synthesizer");
          
          // Add prove directory to ZIP (if it exists and has files)
          try {
            const proveFiles = await fs.readdir(proveDir, { recursive: true });
            if (proveFiles.length > 0) {
              await addDirectoryToZip(proveDir, "prove");
            }
          } catch (e) {
            console.warn("Prove directory not found or empty, skipping from ZIP");
          }

          // Write ZIP file
          zip.writeZip(zipPath);
          console.log(`ZIP file created: ${zipPath}`);
        } catch (zipError: any) {
          console.error("Failed to create ZIP file:", zipError);
          // Continue even if ZIP creation fails
        }

        return {
          success: true,
          output: stdout,
          stderr: stderr || "",
          outputDir: absoluteOutputDir,
          synthesizerOutputDir: synthesizerDir,
          proveOutputDir: proveDir,
          zipPath,
          stateSnapshot,
          proveSuccess,
          proveOutput,
          proveStderr,
        };
      } catch (error: any) {
        console.error("l2-transfer error:", error);
        return {
          success: false,
          error: error.message || "Failed to execute l2-transfer",
          stderr: error.stderr || "",
          stdout: error.stdout || "",
        };
      }
    }
  );

  // Verify Proof using tokamak-cli
  ipcMain.handle(
    "verify-proof",
    async (
      event,
      options: {
        proofPath: string; // Path to the uploaded proof ZIP file
      }
    ) => {
      const { execFile } = await import("child_process");
      const { promisify } = await import("util");
      const execFileAsync = promisify(execFile);
      const { getBinaryPath, BINARY_ROOT_DIR, RESOURCES } = await import("./utils/binaryConfig");
      const path = await import("path");
      const fs = await import("fs/promises");
        const { extractZip, findProofJson, findContentDir } = await import("./utils/zipHelper");

      try {
        const verifyBinaryPath = getBinaryPath("verify");
        
        // Verify proof path exists
        try {
          await fs.access(options.proofPath);
        } catch (e) {
          throw new Error(`Proof path does not exist: ${options.proofPath}`);
        }

        // Extract ZIP file and copy folders to resource directory
        const extractedDir = await extractZip(options.proofPath);
        const contentDir = findContentDir(extractedDir); // Handle single folder case
        
        // Helper function to copy directory recursively
        const copyRecursive = async (src: string, dest: string) => {
          const entries = await fs.readdir(src, { withFileTypes: true });
          await fs.mkdir(dest, { recursive: true });
          
          for (const entry of entries) {
            const srcPath = path.join(src, entry.name);
            const destPath = path.join(dest, entry.name);
            
            if (entry.isDirectory()) {
              await copyRecursive(srcPath, destPath);
            } else {
              await fs.copyFile(srcPath, destPath);
            }
          }
        };

        // Helper function to clear directory
        const clearDirectory = async (dir: string) => {
          try {
            const existingFiles = await fs.readdir(dir);
            for (const file of existingFiles) {
              const filePath = path.join(dir, file);
              const stat = await fs.stat(filePath);
              if (stat.isDirectory()) {
                await fs.rm(filePath, { recursive: true, force: true });
              } else {
                await fs.unlink(filePath);
              }
            }
          } catch (e) {
            // Directory might be empty, continue
          }
        };
        
        // Copy synthesizer folder if it exists (from content directory)
        const extractedSynthesizerPath = path.join(contentDir, "synthesizer");
        try {
          await fs.access(extractedSynthesizerPath);
          await clearDirectory(RESOURCES.synthesizer);
          await copyRecursive(extractedSynthesizerPath, RESOURCES.synthesizer);
          console.log(`Copied synthesizer folder to: ${RESOURCES.synthesizer}`);
        } catch (e) {
          console.warn("synthesizer folder not found in ZIP, skipping");
        }
        
        // Copy prove folder if it exists (from content directory)
        const extractedProvePath = path.join(contentDir, "prove");
        try {
          await fs.access(extractedProvePath);
          await clearDirectory(RESOURCES.prove);
          await copyRecursive(extractedProvePath, RESOURCES.prove);
          console.log(`Copied prove folder to: ${RESOURCES.prove}`);
        } catch (e) {
          throw new Error("prove folder not found in uploaded ZIP file");
        }
        
        // Verify that proof.json exists in the prove directory
        const proofJsonPath = path.join(RESOURCES.prove, "proof.json");
        try {
          await fs.access(proofJsonPath);
        } catch (e) {
          throw new Error("proof.json not found in prove folder");
        }

        // Execute preprocess first
        const preprocessBinaryPath = getBinaryPath("preprocess");
        const preprocessArgs = [
          RESOURCES.qap,              // qap-path
          RESOURCES.synthesizer,      // synthesizer-output-path
          RESOURCES.setup,            // setup-path
          RESOURCES.preprocess,       // preprocess-output-path
        ];

        console.log(`Executing preprocess:`, preprocessBinaryPath, preprocessArgs.join(" "));

        let preprocessStdout = "";
        let preprocessStderr = "";
        try {
          const preprocessResult = await execFileAsync(preprocessBinaryPath, preprocessArgs, {
            maxBuffer: 10 * 1024 * 1024, // 10MB buffer
            cwd: BINARY_ROOT_DIR,
          });
          preprocessStdout = preprocessResult.stdout || "";
          preprocessStderr = preprocessResult.stderr || "";
          console.log("preprocess stdout:", preprocessStdout);
          if (preprocessStderr) {
            console.error("preprocess stderr:", preprocessStderr);
          }
        } catch (preprocessError: any) {
          console.error("preprocess error:", preprocessError);
          preprocessStdout = preprocessError.stdout || "";
          preprocessStderr = preprocessError.stderr || preprocessError.message || "";
          // Continue with verify even if preprocess has warnings (it might already exist)
          if (preprocessStderr.includes("panic") || preprocessStderr.includes("fatal")) {
            throw new Error(`Preprocess failed: ${preprocessStderr}`);
          }
        }

        // Execute verify command: ./bin/verify <qap-path> <synthesizer-output-path> <setup-path> <preprocess-path> <proof-path>
        // Note: proof-path should be the prove directory, not the proof.json file
        const verifyArgs = [
          RESOURCES.qap,              // qap-path
          RESOURCES.synthesizer,      // synthesizer-output-path
          RESOURCES.setup,            // setup-path
          RESOURCES.preprocess,       // preprocess-path
          RESOURCES.prove,            // proof-path (directory containing proof.json)
        ];

        console.log(`Executing verify:`, verifyBinaryPath, verifyArgs.join(" "));

        const { stdout, stderr } = await execFileAsync(verifyBinaryPath, verifyArgs, {
          maxBuffer: 10 * 1024 * 1024, // 10MB buffer
          cwd: BINARY_ROOT_DIR, // Set working directory to binaries root
        });

        if (stderr) {
          console.error("verify stderr:", stderr);
        }

        console.log("verify stdout:", stdout);

        // Check if verification was successful
        // verify returns "true" or "false" in stdout
        // Also check for error messages in stderr
        const stdoutLower = stdout.toLowerCase().trim();
        const hasError = stderr.includes("error") || stderr.includes("failed") || stderr.includes("panic");
        const verificationResult = stdoutLower.includes("true") && !stdoutLower.includes("false");
        const success = !hasError && verificationResult;

        return {
          success,
          output: stdout,
          stderr: stderr || "",
          preprocessOutput: preprocessStdout,
          preprocessStderr: preprocessStderr,
        };
      } catch (error: any) {
        console.error("verify-proof error:", error);
        return {
          success: false,
          error: error.message || "Failed to verify proof",
          stderr: error.stderr || "",
          stdout: error.stdout || "",
        };
      }
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

  // Handle CORS for RPC requests
  defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const { responseHeaders } = details;

    if (
      details.url.includes("infura.io") ||
      details.url.includes("alchemy.com") ||
      details.url.includes("rpc.")
    ) {
      if (responseHeaders) {
        // Delete existing CORS headers to prevent conflicts
        delete responseHeaders["access-control-allow-origin"];
        delete responseHeaders["Access-Control-Allow-Origin"];

        // Allow all origins
        responseHeaders["Access-Control-Allow-Origin"] = ["*"];
      }
    }

    callback({ responseHeaders });
  });

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
