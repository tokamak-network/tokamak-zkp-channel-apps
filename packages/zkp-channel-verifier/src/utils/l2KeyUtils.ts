import { jubjub } from "@noble/curves/misc";
import { ethers } from "ethers";
import { buildPoseidon } from "circomlibjs";

// Poseidon instance (lazily initialized)
let poseidonInstance: any = null;

/**
 * Initialize and get Poseidon hash function
 */
async function getPoseidon() {
  if (!poseidonInstance) {
    poseidonInstance = await buildPoseidon();
  }
  return poseidonInstance;
}

/**
 * Uint8Array를 hex string으로 변환
 */
function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Uint8Array를 bigint로 변환
 */
function bytesToBigInt(bytes: Uint8Array): bigint {
  return BigInt("0x" + bytesToHex(bytes));
}

/**
 * bigint를 32-byte Uint8Array로 변환
 */
function bigIntToBytes(value: bigint, length: number): Uint8Array {
  const hex = value.toString(16).padStart(length * 2, "0");
  return new Uint8Array(
    hex.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16))
  );
}

/**
 * Edwards curve public key를 L2 address로 변환 (poseidon hash 사용)
 * 
 * @param publicKeyBytes - Edwards curve public key (32 bytes compressed)
 * @returns L2 address (20 bytes)
 */
async function fromEdwardsToAddress(publicKeyBytes: Uint8Array): Promise<string> {
  const poseidon = await getPoseidon();
  
  // Convert public key bytes to bigint
  const publicKeyBigInt = bytesToBigInt(publicKeyBytes);
  
  // Hash with poseidon
  const hash = poseidon([publicKeyBigInt]);
  const hashBigInt = poseidon.F.toObject(hash);
  
  // Convert hash to hex string and take last 20 bytes as address
  const hashHex = hashBigInt.toString(16).padStart(64, "0");
  const addressHex = hashHex.slice(-40); // Last 20 bytes
  
  return "0x" + addressHex;
}

/**
 * L2 private key로 L2 address를 계산합니다
 * 
 * Steps:
 * 1. L2 private key → L2 public key (JubJub compressed, 32 bytes)
 * 2. L2 public key (32 bytes) → poseidon hash → L2 address (20 bytes)
 * 
 * @param l2PrivateKey - L2 private key (hex string)
 * @returns L2 address (hex string, 20 bytes = 0x + 40 hex chars)
 */
export async function deriveL2AddressFromPrivateKey(
  l2PrivateKey: string
): Promise<string | null> {
  try {
    const privateKeyHex = l2PrivateKey.startsWith("0x")
      ? l2PrivateKey.slice(2)
      : l2PrivateKey;

    if (privateKeyHex.length !== 64) {
      return null;
    }

    // Convert hex string to bigint
    const privateKeyBigInt = BigInt("0x" + privateKeyHex);

    // Ensure private key is within JubJub scalar field range
    const jubjubOrder = jubjub.Point.Fn.ORDER;
    const privateKeyValue = privateKeyBigInt % jubjubOrder;
    const finalPrivateKey = privateKeyValue === 0n ? 1n : privateKeyValue;

    // Generate public key from private key using JubJub curve
    const publicKeyPoint = jubjub.Point.BASE.multiply(finalPrivateKey);
    
    // Convert to compressed bytes (32 bytes)
    // This matches the on-chain logic: publicKey.toBytes()
    const publicKeyBytes = publicKeyPoint.toBytes();

    // Derive L2 address from public key using poseidon hash
    const l2Address = await fromEdwardsToAddress(publicKeyBytes);

    return l2Address;
  } catch (error) {
    console.error("Failed to derive L2 address from private key:", error);
    return null;
  }
}

/**
 * L2 private key로 MPT key를 계산합니다
 * 
 * Steps (matching on-chain logic):
 * 1. L2 private key → L2 public key (32 bytes compressed)
 * 2. L2 public key → poseidon hash → L2 address (20 bytes)
 * 3. getUserStorageKey([L2 address, slot]) → poseidon hash → MPT key (32 bytes)
 * 
 * @param l2PrivateKey - L2 private key (hex string)
 * @param slot - Storage slot (default: 0)
 * @returns MPT key (hex string, 32 bytes)
 */
export async function calculateMptKeyFromL2PrivateKey(
  l2PrivateKey: string,
  slot: number = 0
): Promise<string | null> {
  try {
    // Step 1: Derive L2 address from private key
    const l2Address = await deriveL2AddressFromPrivateKey(l2PrivateKey);
    if (!l2Address) {
      return null;
    }

    // Step 2: Calculate MPT key using getUserStorageKey logic
    // getUserStorageKey([L2 address, slot], 'TokamakL2')
    // = poseidon([L2 address as bigint, slot as bigint])
    const poseidon = await getPoseidon();
    
    // Convert L2 address (hex string) to bigint
    const l2AddressBigInt = BigInt(l2Address);
    const slotBigInt = BigInt(slot);
    
    // Hash with poseidon: poseidon([address, slot])
    const mptKeyHash = poseidon([l2AddressBigInt, slotBigInt]);
    const mptKeyBigInt = poseidon.F.toObject(mptKeyHash);
    
    // Convert to hex string (32 bytes)
    const mptKey = "0x" + mptKeyBigInt.toString(16).padStart(64, "0");

    return mptKey;
  } catch (error) {
    console.error("Failed to calculate MPT key from L2 private key:", error);
    return null;
  }
}

/**
 * L2 private key로 L2 public key를 계산합니다 (32 bytes compressed)
 * 
 * @param l2PrivateKey - L2 private key (hex string)
 * @returns L2 public key (hex string, 32 bytes compressed point)
 */
export function calculateL2PublicKeyFromPrivateKey(
  l2PrivateKey: string
): string | null {
  try {
    const privateKeyHex = l2PrivateKey.startsWith("0x")
      ? l2PrivateKey.slice(2)
      : l2PrivateKey;

    if (privateKeyHex.length !== 64) {
      return null;
    }

    // Convert hex string to bigint
    const privateKeyBigInt = BigInt("0x" + privateKeyHex);

    // Ensure private key is within JubJub scalar field range
    const jubjubOrder = jubjub.Point.Fn.ORDER;
    const privateKeyValue = privateKeyBigInt % jubjubOrder;
    const finalPrivateKey = privateKeyValue === 0n ? 1n : privateKeyValue;

    // Generate public key from private key using JubJub curve
    const publicKeyPoint = jubjub.Point.BASE.multiply(finalPrivateKey);
    
    // Convert to compressed bytes (32 bytes)
    const publicKeyBytes = publicKeyPoint.toBytes();

    // Convert to hex string
    return "0x" + bytesToHex(publicKeyBytes);
  } catch (error) {
    console.error("Failed to calculate L2 public key from private key:", error);
    return null;
  }
}
