// 설정 저장을 위한 유틸리티
// electron-store를 사용하여 영구 저장

import {
  SEPOLIA_RPC_URL,
  ROLLUP_BRIDGE_CORE_ADDRESS,
  NETWORK_CONFIG,
} from "../constants/contracts";

export interface AppSettings {
  rpcUrl: string;
  contractAddress: string;
  chainId: number;
}

const DEFAULT_SETTINGS: AppSettings = {
  rpcUrl: SEPOLIA_RPC_URL,
  contractAddress: ROLLUP_BRIDGE_CORE_ADDRESS,
  chainId: NETWORK_CONFIG.SEPOLIA.CHAIN_ID,
};

// LocalStorage를 사용한 설정 관리 (Electron 환경에서 electron-store로 교체 가능)
export const storage = {
  getSettings(): AppSettings {
    try {
      const stored = localStorage.getItem("zkp-channel-settings");
      if (stored) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.error("Failed to load settings:", error);
    }
    return DEFAULT_SETTINGS;
  },

  saveSettings(settings: Partial<AppSettings>): void {
    try {
      const current = this.getSettings();
      const updated = { ...current, ...settings };

      // Trim RPC URL to remove any leading/trailing whitespace
      if (updated.rpcUrl) {
        updated.rpcUrl = updated.rpcUrl.trim();
      }

      localStorage.setItem("zkp-channel-settings", JSON.stringify(updated));
    } catch (error) {
      console.error("Failed to save settings:", error);
    }
  },

  getRpcUrl(): string {
    return this.getSettings().rpcUrl;
  },

  setRpcUrl(url: string): void {
    this.saveSettings({ rpcUrl: url });
  },

  getContractAddress(): string {
    return this.getSettings().contractAddress;
  },

  setContractAddress(address: string): void {
    this.saveSettings({ contractAddress: address });
  },

  getChainId(): number {
    return this.getSettings().chainId;
  },

  setChainId(chainId: number): void {
    this.saveSettings({ chainId });
  },

  resetToDefaults(): void {
    localStorage.removeItem("zkp-channel-settings");
  },
};
