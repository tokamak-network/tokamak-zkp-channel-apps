/**
 * Contract Addresses and Configuration Constants
 *
 * Centralized constants for contract addresses, RPC URLs, and ABIs.
 * All addresses are for the Sepolia testnet by default.
 */

// ============================================================================
// Network Configuration
// ============================================================================

export const NETWORK_CONFIG = {
  SEPOLIA: {
    CHAIN_ID: 11155111,
    RPC_URL:
      "https://eth-sepolia.g.alchemy.com/v2/PbqCcGx1oHN7yNaFdUJUYqPEN0QSp23S",
    NAME: "Sepolia Testnet",
  },
  MAINNET: {
    CHAIN_ID: 1,
    RPC_URL: "https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY_HERE",
    NAME: "Ethereum Mainnet",
  },
} as const;

// Default network
export const DEFAULT_NETWORK = NETWORK_CONFIG.SEPOLIA;
export const SEPOLIA_RPC_URL = NETWORK_CONFIG.SEPOLIA.RPC_URL;

// ============================================================================
// Contract Addresses - Sepolia Testnet
// ============================================================================

export const CONTRACT_ADDRESSES = {
  // Modular Contract addresses - Updated for new architecture
  ROLLUP_BRIDGE_CORE: "0x68862886384846d53bbba89aa4f64f4789dda089",
  ROLLUP_BRIDGE_DEPOSIT_MANAGER: "0xD5E8B17058809B9491F99D35B67A089A2618f5fB",
  ROLLUP_BRIDGE_PROOF_MANAGER: "0xF0396B7547C7447FBb14A127D3751425893322fc",
  ROLLUP_BRIDGE_WITHDRAW_MANAGER: "0xAf833c7109DB3BfDAc54a98EA7b123CFDE51d777",
  ROLLUP_BRIDGE_ADMIN_MANAGER: "0x1c38A6739bDb55f357fcd1aF258E0359ed77c662",

  // Token addresses
  TON: "0xa30fe40285B8f5c0457DbC3B7C8A280373c40044", // TON token address
  WTON: "0x79E0d92670106c85E9067b56B8F674340dCa0Bbd", // WTON token address
} as const;

// Legacy alias for backward compatibility
export const ROLLUP_BRIDGE_CORE_ADDRESS = CONTRACT_ADDRESSES.ROLLUP_BRIDGE_CORE;
export const DEPOSIT_MANAGER_ADDRESS =
  CONTRACT_ADDRESSES.ROLLUP_BRIDGE_DEPOSIT_MANAGER;
export const PROOF_MANAGER_ADDRESS =
  CONTRACT_ADDRESSES.ROLLUP_BRIDGE_PROOF_MANAGER;
export const WITHDRAW_MANAGER_ADDRESS =
  CONTRACT_ADDRESSES.ROLLUP_BRIDGE_WITHDRAW_MANAGER;
export const ADMIN_MANAGER_ADDRESS =
  CONTRACT_ADDRESSES.ROLLUP_BRIDGE_ADMIN_MANAGER;
export const TON_ADDRESS = CONTRACT_ADDRESSES.TON;
export const WTON_ADDRESS = CONTRACT_ADDRESSES.WTON;

// ============================================================================
// Contract ABIs (Minimal - for read-only functions)
// ============================================================================

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
];

// ============================================================================
// Default Channel Configuration
// ============================================================================

export const DEFAULT_CHANNEL_CONFIG = {
  CHANNEL_ID: 3, // Default channel for testing
  SLOT: 0, // Default storage slot for ERC20 balance
} as const;
