// Synthesizer types for zkp-channel-verifier

export interface StateSnapshot {
  stateRoot: string;
  storageEntries: Array<{ index: number; key: string; value: string }>;
  registeredKeys: string[];
  contractAddress: string;
  userL2Addresses: string[];
  userStorageSlots: bigint[];
  timestamp: number;
  userNonces: bigint[];
}

export interface PublicInstance {
  a_pub_user: string[];
  a_pub_block: string[];
  a_pub_function: string[];
}

export interface SynthesizerResult {
  instance: PublicInstance;
  placementVariables: any[];
  permutation: {
    row: number;
    col: number;
    X: number;
    Y: number;
  }[];
  state: StateSnapshot;
  metadata: {
    txHash?: string;
    blockNumber: number;
    from: string;
    to: string | null;
    contractAddress: string;
    eoaAddresses: string[];
    calldata?: string;
  };
}

export interface SynthesizeOptions {
  rpcUrl: string;
  calldata: string;
  contractAddress: string;
  publicKeyListL2: Uint8Array[];
  addressListL1: string[];
  senderL2PrvKey: Uint8Array;
  blockNumber?: number;
  userStorageSlots?: number[];
  previousState?: StateSnapshot;
  txNonce?: bigint;
  outputPath?: string;
}

export interface ProveResult {
  success: boolean;
  outputDir?: string;
  error?: string;
}

export interface VerifyResult {
  success: boolean;
  verified?: boolean;
  error?: string;
}

