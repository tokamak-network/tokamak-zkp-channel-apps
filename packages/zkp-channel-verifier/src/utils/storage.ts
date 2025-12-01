// 설정 저장을 위한 유틸리티
// electron-store를 사용하여 영구 저장

export interface AppSettings {
  rpcUrl: string;
  contractAddress: string;
  chainId: number;
}

const DEFAULT_SETTINGS: AppSettings = {
  rpcUrl: 'https://eth-sepolia.g.alchemy.com/v2/PbqCcGx1oHN7yNaFdUJUYqPEN0QSp23S', // Alchemy RPC (Tokamak zk-EVM 권장)
  contractAddress: '0x780ad1b236390C42479b62F066F5cEeAa4c77ad6', // RollupBridge Proxy (Sepolia testnet)
  chainId: 11155111, // Sepolia
};

// LocalStorage를 사용한 설정 관리 (Electron 환경에서 electron-store로 교체 가능)
export const storage = {
  getSettings(): AppSettings {
    try {
      const stored = localStorage.getItem('zkp-channel-settings');
      if (stored) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
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
      
      localStorage.setItem('zkp-channel-settings', JSON.stringify(updated));
    } catch (error) {
      console.error('Failed to save settings:', error);
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
    localStorage.removeItem('zkp-channel-settings');
  },
};

