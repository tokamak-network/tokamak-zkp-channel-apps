import { createPublicClient, http, Address, defineChain } from "viem";
import { mainnet, sepolia } from "viem/chains";
import { storage } from "@/utils/storage";

// 토큰 이름 매핑 (실제 토큰 주소 → 심볼)
export const TOKEN_SYMBOLS: Record<string, string> = {
  "0x0000000000000000000000000000000000000000": "ETH",
  // 실제 WTON, USDT 등의 주소를 추가해야 함
};

// RollupBridgeCore ABI (필요한 getter 함수들만 포함)
export const ROLLUP_BRIDGE_CORE_ABI = [
  // Channel Management - Core Functions
  {
    inputs: [
      {
        components: [
          { name: "targetContract", type: "address" },
          { name: "participants", type: "address[]" },
          { name: "timeout", type: "uint256" },
        ],
        name: "params",
        type: "tuple",
      },
    ],
    name: "openChannel",
    outputs: [{ name: "channelId", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "channelId", type: "uint256" },
      { name: "pkx", type: "uint256" },
      { name: "pky", type: "uint256" },
    ],
    name: "setChannelPublicKey",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  // View Functions
  {
    inputs: [{ name: "channelId", type: "uint256" }],
    name: "getChannelState",
    outputs: [{ name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "channelId", type: "uint256" },
      { name: "participant", type: "address" },
    ],
    name: "isChannelParticipant",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "targetContract", type: "address" }],
    name: "isTargetContractAllowed",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "channelId", type: "uint256" }],
    name: "getChannelLeader",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "channelId", type: "uint256" }],
    name: "getChannelParticipants",
    outputs: [{ name: "", type: "address[]" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "channelId", type: "uint256" }],
    name: "getChannelTargetContract",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "channelId", type: "uint256" }],
    name: "getChannelTreeSize",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "channelId", type: "uint256" },
      { name: "participant", type: "address" },
    ],
    name: "getParticipantDeposit",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "channelId", type: "uint256" },
      { name: "participant", type: "address" },
    ],
    name: "getL2MptKey",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "channelId", type: "uint256" }],
    name: "getChannelTotalDeposits",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "channelId", type: "uint256" }],
    name: "getChannelPublicKey",
    outputs: [
      { name: "pkx", type: "uint256" },
      { name: "pky", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "channelId", type: "uint256" }],
    name: "isChannelPublicKeySet",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "channelId", type: "uint256" }],
    name: "getChannelTimeout",
    outputs: [
      { name: "openTimestamp", type: "uint256" },
      { name: "timeout", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "channelId", type: "uint256" }],
    name: "getLeaderBond",
    outputs: [
      { name: "bond", type: "uint256" },
      { name: "slashed", type: "bool" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "nextChannelId",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "channelId", type: "uint256" }],
    name: "getChannelInfo",
    outputs: [
      { name: "targetContract", type: "address" },
      { name: "state", type: "uint8" },
      { name: "participantCount", type: "uint256" },
      { name: "initialRoot", type: "bytes32" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "channelId", type: "uint256" },
      { name: "participant", type: "address" },
    ],
    name: "hasUserWithdrawn",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "channelId", type: "uint256" }],
    name: "isSignatureVerified",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "channelId", type: "uint256" },
      { name: "participant", type: "address" },
    ],
    name: "getWithdrawableAmount",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getTreasuryAddress",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getTotalSlashedBonds",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "channelId", type: "uint256" }],
    name: "getChannelInitialStateRoot",
    outputs: [{ name: "", type: "bytes32" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "channelId", type: "uint256" }],
    name: "getChannelFinalStateRoot",
    outputs: [{ name: "", type: "bytes32" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "owner",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "targetContract", type: "address" }],
    name: "getMaxAllowedParticipants",
    outputs: [{ name: "maxParticipants", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "targetContract", type: "address" }],
    name: "getTargetContractData",
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "contractAddress", type: "address" },
          { name: "storageSlot", type: "bytes1" },
        ],
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "targetContract", type: "address" }],
    name: "getPreAllocatedKeys",
    outputs: [{ name: "keys", type: "bytes32[]" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "targetContract", type: "address" },
      { name: "mptKey", type: "bytes32" },
    ],
    name: "getPreAllocatedLeaf",
    outputs: [
      { name: "value", type: "uint256" },
      { name: "exists", type: "bool" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "targetContract", type: "address" }],
    name: "getPreAllocatedLeavesCount",
    outputs: [{ name: "count", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "channelId", type: "uint256" }],
    name: "getChannelPreAllocatedLeavesCount",
    outputs: [{ name: "count", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  // Events
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "channelId", type: "uint256" },
      { indexed: false, name: "targetContract", type: "address" },
    ],
    name: "ChannelOpened",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "channelId", type: "uint256" },
      { indexed: false, name: "pkx", type: "uint256" },
      { indexed: false, name: "pky", type: "uint256" },
      { indexed: false, name: "signerAddr", type: "address" },
    ],
    name: "ChannelPublicKeySet",
    type: "event",
  },
] as const;

/**
 * Public client를 생성합니다 (저장된 RPC URL 사용)
 */
function createClient() {
  const settings = storage.getSettings();

  // Chain 정의 (저장된 chainId 사용)
  const chain =
    settings.chainId === 1
      ? mainnet
      : settings.chainId === 11155111
        ? sepolia
        : defineChain({
            id: settings.chainId,
            name: "Custom Chain",
            nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
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
          "Content-Type": "application/json",
          Accept: "application/json",
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
export async function getChannelParticipants(
  channelId: bigint
): Promise<Address[]> {
  try {
    const client = createClient();
    const contractAddress = getContractAddress();

    const participants = await client.readContract({
      address: contractAddress,
      abi: ROLLUP_BRIDGE_CORE_ABI,
      functionName: "getChannelParticipants",
      args: [channelId],
    });
    return participants;
  } catch (error) {
    console.error("Failed to fetch channel participants:", error);
    return [];
  }
}

/**
 * 채널의 target contract 주소를 가져옵니다
 */
export async function getChannelTargetContract(
  channelId: bigint
): Promise<Address | null> {
  try {
    const client = createClient();
    const contractAddress = getContractAddress();

    const targetContract = await client.readContract({
      address: contractAddress,
      abi: ROLLUP_BRIDGE_CORE_ABI,
      functionName: "getChannelTargetContract",
      args: [channelId],
    });
    return targetContract as Address;
  } catch (error) {
    console.error("Failed to fetch channel target contract:", error);
    return null;
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
      functionName: "getChannelInfo",
      args: [channelId],
    });
    return {
      targetContract: info[0] as Address,
      state: Number(info[1]),
      participantCount: Number(info[2]),
      initialRoot: info[3] as `0x${string}`,
    };
  } catch (error) {
    console.error("Failed to fetch channel info:", error);
    return null;
  }
}

/**
 * 토큰 주소를 심볼로 변환합니다
 */
export function getTokenSymbol(tokenAddress: string): string {
  return (
    TOKEN_SYMBOLS[tokenAddress.toLowerCase()] ||
    tokenAddress.slice(0, 6) + "..."
  );
}

/**
 * 채널 상태 enum을 문자열로 변환합니다
 */
export function getChannelStateString(state: number): string {
  const states = ["None", "Initialized", "Open", "Active", "Closing", "Closed"];
  return states[state] || "Unknown";
}

/**
 * 특정 참여자의 L2 MPT key를 가져옵니다
 * @param channelId - 채널 ID
 * @param participant - 참여자 L1 주소
 * @returns MPT key (uint256를 0x-prefixed hex string으로 변환)
 */
export async function getL2MptKey(
  channelId: bigint,
  participant: Address
): Promise<string | null> {
  try {
    const client = createClient();
    const contractAddress = getContractAddress();

    const mptKey = await client.readContract({
      address: contractAddress,
      abi: ROLLUP_BRIDGE_CORE_ABI,
      functionName: "getL2MptKey",
      args: [channelId, participant],
    });

    // uint256을 hex string으로 변환 (32 bytes = 64 hex chars)
    const mptKeyHex = "0x" + (mptKey as bigint).toString(16).padStart(64, "0");
    return mptKeyHex;
  } catch (error) {
    console.error("Failed to fetch L2 MPT key:", error);
    return null;
  }
}
