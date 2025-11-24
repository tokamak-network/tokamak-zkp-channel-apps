import type { ForgeConfig } from "@electron-forge/shared-types";
import { MakerSquirrel } from "@electron-forge/maker-squirrel";
import { MakerZIP } from "@electron-forge/maker-zip";
import { MakerDeb } from "@electron-forge/maker-deb";
import { MakerRpm } from "@electron-forge/maker-rpm";
import { MakerDMG } from "@electron-forge/maker-dmg";
import { VitePlugin } from "@electron-forge/plugin-vite";
import { FusesPlugin } from "@electron-forge/plugin-fuses";
import { FuseV1Options, FuseVersion } from "@electron/fuses";

const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
    // Platform-specific icon configuration
    ...(process.platform === "win32" && {
      icon: "src/assets/icons/favicon.ico",
    }),
    ...(process.platform === "darwin" && {
      icon: "src/assets/icons/app-icon.icns",
    }),
    // Windows-specific settings
    win32metadata: {
      CompanyName: "Tokamak Network",
      ProductName: "ZKP Channel Verifier",
      FileDescription: "ZKP Channel Verifier - Intermediate Proof Verifier",
      OriginalFilename: "zkp-channel-verifier.exe",
    },
    // Include binary files, assets, and public folder in the app package
    extraResource: ["src/binaries", "src/assets", "public"],
  },
  rebuildConfig: {},
  makers: [
    new MakerSquirrel({
      // Windows-specific configuration for Squirrel installer
      setupIcon: "src/assets/icons/favicon.ico",
    }),
    new MakerDMG(
      {
        // macOS DMG configuration
        icon: "src/assets/icons/app-icon.icns",
        format: "ULFO",
      },
      ["darwin"]
    ),
    new MakerZIP({}, ["darwin"]),
    new MakerRpm({}),
    new MakerDeb({}),
  ],
  plugins: [
    new VitePlugin({
      build: [
        {
          entry: "src/main.ts",
          config: "vite.main.config.ts",
          target: "main",
        },
        {
          entry: "src/preload.ts",
          config: "vite.preload.config.ts",
          target: "preload",
        },
      ],
      renderer: [
        {
          name: "main_window",
          config: "vite.renderer.config.ts",
        },
      ],
    }),
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
};

export default config;

