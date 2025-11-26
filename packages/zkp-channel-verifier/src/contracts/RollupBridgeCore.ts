import { createPublicClient, http, Address, defineChain } from 'viem';
import { mainnet, sepolia } from 'viem/chains';
import { storage } from '@/utils/storage';

// 토큰 이름 매핑 (실제 토큰 주소 → 심볼)
export const TOKEN_SYMBOLS: Record<string, string> = {
  '0x0000000000000000000000000000000000000000': 'ETH',
  // 실제 WTON, USDT 등의 주소를 추가해야 함
};

// RollupBridgeCore ABI (필요한 getter 함수들만 포함)
export const ROLLUP_BRIDGE_CORE_ABI = [
  {
    inputs: [{ name: 'channelId', type: 'uint256' }],
    name: 'getChannelParticipants',
    outputs: [{ name: '', type: 'address[]' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'channelId', type: 'uint256' }],
    name: 'getChannelAllowedTokens',
    outputs: [{ name: '', type: 'address[]' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'channelId', type: 'uint256' }],
    name: 'getChannelInfo',
    outputs: [
      { name: 'allowedTokens', type: 'address[]' },
      { name: 'state', type: 'uint8' },
      { name: 'participantCount', type: 'uint256' },
      { name: 'initialRoot', type: 'bytes32' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'channelId', type: 'uint256' }],
    name: 'getChannelState',
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

/**
 * Public client를 생성합니다 (저장된 RPC URL 사용)
 */
function createClient() {
  const settings = storage.getSettings();
  
  // Chain 정의 (저장된 chainId 사용)
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
  
  return createPublicClient({
    chain,
    transport: http(settings.rpcUrl, {
      timeout: 30000,
      fetchOptions: {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      },
    }),
  });
}

/**
 * 현재 설정된 컨트랙트 주소를 가져옵니다
 */
function getContractAddress(): Address {
  return storage.getContractAddress() as Address;
}

/**
 * 채널의 참여자 목록을 가져옵니다
 */
export async function getChannelParticipants(channelId: bigint): Promise<Address[]> {
  try {
    const client = createClient();
    const contractAddress = getContractAddress();
    
    const participants = await client.readContract({
      address: contractAddress,
      abi: ROLLUP_BRIDGE_CORE_ABI,
      functionName: 'getChannelParticipants',
      args: [channelId],
    });
    return participants;
  } catch (error) {
    console.error('Failed to fetch channel participants:', error);
    return [];
  }
}

/**
 * 채널에서 허용된 토큰 목록을 가져옵니다
 */
export async function getChannelAllowedTokens(channelId: bigint): Promise<Address[]> {
  try {
    const client = createClient();
    const contractAddress = getContractAddress();
    
    const tokens = await client.readContract({
      address: contractAddress,
      abi: ROLLUP_BRIDGE_CORE_ABI,
      functionName: 'getChannelAllowedTokens',
      args: [channelId],
    });
    return tokens;
  } catch (error) {
    console.error('Failed to fetch channel allowed tokens:', error);
    return [];
  }
}

/**
 * 채널의 종합 정보를 가져옵니다
 */
export async function getChannelInfo(channelId: bigint) {
  try {
    const client = createClient();
    const contractAddress = getContractAddress();
    
    const info = await client.readContract({
      address: contractAddress,
      abi: ROLLUP_BRIDGE_CORE_ABI,
      functionName: 'getChannelInfo',
      args: [channelId],
    });
    return {
      allowedTokens: info[0],
      state: info[1],
      participantCount: info[2],
      initialRoot: info[3],
    };
  } catch (error) {
    console.error('Failed to fetch channel info:', error);
    return null;
  }
}

/**
 * 토큰 주소를 심볼로 변환합니다
 */
export function getTokenSymbol(tokenAddress: string): string {
  return TOKEN_SYMBOLS[tokenAddress.toLowerCase()] || tokenAddress.slice(0, 6) + '...';
}

/**
 * 채널 상태 enum을 문자열로 변환합니다
 */
export function getChannelStateString(state: number): string {
  const states = ['None', 'Initialized', 'Open', 'Active', 'Closing', 'Closed'];
  return states[state] || 'Unknown';
}

