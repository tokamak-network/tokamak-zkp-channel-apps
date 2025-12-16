import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Settings as SettingsIcon, ArrowLeft, Save, RefreshCw, Check, AlertCircle } from "lucide-react";
import { storage, AppSettings } from "@/utils/storage";
import { createPublicClient, http, defineChain } from 'viem';
import { mainnet, sepolia } from 'viem/chains';

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<AppSettings>(storage.getSettings());
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [connectionError, setConnectionError] = useState<string>('');

  useEffect(() => {
    // 설정 로드
    setSettings(storage.getSettings());
  }, []);

  const handleSave = () => {
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      storage.saveSettings(settings);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (window.confirm('Are you sure you want to reset all settings to defaults?')) {
      storage.resetToDefaults();
      setSettings(storage.getSettings());
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }
  };

  const testRpcConnection = async () => {
    setTestingConnection(true);
    setConnectionStatus('idle');
    setConnectionError('');

    try {
      // Chain 정의
      const chain = settings.chainId === 1 ? mainnet : 
                    settings.chainId === 11155111 ? sepolia :
                    defineChain({
                      id: settings.chainId,
                      name: 'Custom Chain',
                      nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
                      rpcUrls: {
                        default: { http: [settings.rpcUrl] },
                      },
                    });

      // Custom fetch with proper headers for Electron environment
      const customFetch = (url: string, init?: RequestInit) => {
        return fetch(url, {
          ...init,
          headers: {
            ...init?.headers,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
        });
      };

      // viem client 생성 및 테스트
      const testClient = createPublicClient({
        chain,
        transport: http(settings.rpcUrl, {
          timeout: 10000, // 10초 타임아웃
          fetchOptions: {
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
          },
        }),
      });

      // 간단한 RPC 호출로 연결 테스트
      const chainId = await testClient.getChainId();
      
      console.log('RPC connection successful, chainId:', chainId);
      
      // Chain ID 일치 확인
      if (chainId !== settings.chainId) {
        setConnectionError(`Chain ID mismatch: Expected ${settings.chainId}, got ${chainId}`);
        setConnectionStatus('error');
      } else {
        setConnectionStatus('success');
      }
    } catch (error: any) {
      console.error('RPC test failed:', error);
      
      // 에러 메시지 추출
      let errorMessage = 'Connection failed';
      if (error.message) {
        if (error.message.includes('fetch')) {
          errorMessage = 'Network error: Unable to reach RPC endpoint';
        } else if (error.message.includes('timeout')) {
          errorMessage = 'Connection timeout: RPC endpoint did not respond';
        } else if (error.message.includes('Invalid URL')) {
          errorMessage = 'Invalid RPC URL format';
        } else {
          errorMessage = error.message;
        }
      }
      
      setConnectionError(errorMessage);
      setConnectionStatus('error');
    } finally {
      setTestingConnection(false);
    }
  };

  return (
    <Layout>
      <div className="min-h-screen pb-20" style={{ padding: "32px" }}>
        <div className="max-w-4xl w-full mx-auto">
          {/* Header with Back Button */}
          <button
            onClick={() => navigate("/")}
            className="flex items-center text-gray-400 hover:text-[#4fc3f7] transition-colors"
            style={{ gap: "8px", marginBottom: "24px" }}
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm">Back to Menu</span>
          </button>

          <div className="flex items-center" style={{ gap: "16px", marginBottom: "48px" }}>
            <div className="bg-[#4fc3f7] p-3 rounded">
              <SettingsIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Settings</h1>
              <p className="text-sm text-gray-400">
                Configure RPC endpoint and contract addresses
              </p>
            </div>
          </div>

          {/* Success Message */}
          {saveSuccess && (
            <div className="bg-green-500/10 border border-green-500/30 rounded flex items-center" style={{ padding: "16px", marginBottom: "24px", gap: "12px" }}>
              <Check className="w-5 h-5 text-green-500" />
              <span className="text-green-300" style={{ fontSize: "15px" }}>
                Settings saved successfully!
              </span>
            </div>
          )}

          {/* RPC Configuration */}
          <div className="bg-gradient-to-b from-[#1a2347] to-[#0a1930] border border-[#4fc3f7] shadow-lg shadow-[#4fc3f7]/20" style={{ padding: "32px", marginBottom: "24px" }}>
            <h2 className="text-lg font-bold text-white" style={{ marginBottom: "24px" }}>
              RPC Endpoint
            </h2>

            <div style={{ marginBottom: "24px" }}>
              <label className="block font-medium text-gray-300" style={{ fontSize: "16px", marginBottom: "12px" }}>
                RPC URL
              </label>
              <input
                type="text"
                value={settings.rpcUrl}
                onChange={(e) => setSettings({ ...settings, rpcUrl: e.target.value })}
                placeholder="https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY"
                className="w-full bg-[#0a1930] text-white border border-[#4fc3f7]/30 focus:border-[#4fc3f7] focus:outline-none transition-all font-mono"
                style={{ padding: "14px 16px", fontSize: "14px" }}
              />
              <div className="text-gray-400" style={{ fontSize: "13px", marginTop: "8px" }}>
                <p style={{ marginBottom: "6px" }}>Examples:</p>
                <ul className="list-disc list-inside space-y-1 text-gray-500">
                  <li>Alchemy: <code className="text-[#4fc3f7] font-mono text-xs">https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY</code></li>
                  <li>Infura: <code className="text-[#4fc3f7] font-mono text-xs">https://sepolia.infura.io/v3/YOUR_KEY</code></li>
                </ul>
              </div>
            </div>

            <div style={{ marginBottom: "24px" }}>
              <label className="block font-medium text-gray-300" style={{ fontSize: "16px", marginBottom: "12px" }}>
                Chain ID
              </label>
              <input
                type="number"
                value={settings.chainId}
                onChange={(e) => setSettings({ ...settings, chainId: parseInt(e.target.value) || 11155111 })}
                placeholder="11155111"
                className="w-full bg-[#0a1930] text-white border border-[#4fc3f7]/30 focus:border-[#4fc3f7] focus:outline-none transition-all"
                style={{ padding: "14px 16px", fontSize: "15px" }}
              />
              <p className="text-gray-400" style={{ fontSize: "14px", marginTop: "8px" }}>
                Sepolia: 11155111, Mainnet: 1
              </p>
            </div>

            {/* Test Connection Button */}
            <div>
              <div className="flex items-center" style={{ gap: "12px", marginBottom: "12px" }}>
                <button
                  onClick={testRpcConnection}
                  disabled={testingConnection}
                  className="flex items-center bg-[#4fc3f7]/20 hover:bg-[#4fc3f7]/30 text-[#4fc3f7] border border-[#4fc3f7]/30 hover:border-[#4fc3f7] rounded transition-all disabled:opacity-50"
                  style={{ padding: "10px 20px", gap: "8px", fontSize: "14px" }}
                >
                  <RefreshCw className={`w-4 h-4 ${testingConnection ? 'animate-spin' : ''}`} />
                  {testingConnection ? 'Testing...' : 'Test Connection'}
                </button>

                {connectionStatus === 'success' && (
                  <div className="flex items-center text-green-400" style={{ gap: "6px" }}>
                    <Check className="w-4 h-4" />
                    <span style={{ fontSize: "14px" }}>Connected</span>
                  </div>
                )}

                {connectionStatus === 'error' && (
                  <div className="flex items-center text-red-400" style={{ gap: "6px" }}>
                    <AlertCircle className="w-4 h-4" />
                    <span style={{ fontSize: "14px" }}>Connection Failed</span>
                  </div>
                )}
              </div>

              {/* Error Message Detail */}
              {connectionStatus === 'error' && connectionError && (
                <div className="bg-red-500/10 border border-red-500/30 rounded" style={{ padding: "12px" }}>
                  <p className="text-red-300" style={{ fontSize: "13px" }}>
                    {connectionError}
                  </p>
                </div>
              )}
            </div>
          </div>


          {/* Action Buttons */}
          <div className="flex items-center justify-between">
            <button
              onClick={handleReset}
              className="bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 hover:border-red-500 rounded transition-all"
              style={{ padding: "12px 24px", fontSize: "15px", fontWeight: "600" }}
            >
              Reset to Defaults
            </button>

            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center bg-[#4fc3f7] hover:bg-[#029bee] text-white rounded transition-all disabled:opacity-50"
              style={{ padding: "12px 32px", gap: "8px", fontSize: "15px", fontWeight: "600" }}
            >
              <Save className="w-5 h-5" />
              {isSaving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>

          {/* Info Box */}
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded" style={{ padding: "16px", marginTop: "24px" }}>
            <div className="flex items-start" style={{ gap: "12px" }}>
              <AlertCircle className="w-5 h-5 text-yellow-500" style={{ marginTop: "2px", flexShrink: 0 }} />
              <div>
                <p className="text-yellow-300" style={{ fontSize: "14px", marginBottom: "8px" }}>
                  <strong>Note:</strong> Changes will take effect immediately. Make sure to test your RPC connection before saving.
                </p>
                <p className="text-yellow-300" style={{ fontSize: "14px" }}>
                  If you're using a free RPC endpoint and encounter rate limiting, consider:
                </p>
                <ul className="text-yellow-300" style={{ fontSize: "14px", marginTop: "8px", paddingLeft: "20px" }}>
                  <li>• Getting your own API key from Infura or Alchemy</li>
                  <li>• Running your own Ethereum node</li>
                  <li>• Using a different public RPC endpoint</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Settings;

