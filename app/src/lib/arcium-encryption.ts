/**
 * Arcium encryption utilities for client-side encryption of trade orders
 * Based on the Arcium blackjack example implementation
 */

import {
  RescueCipher,
  x25519,
  getMXEPublicKey,
} from '@arcium-hq/client';
import type { AnchorProvider } from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';
import { randomBytes } from 'crypto';

export interface EncryptedTradeOrder {
  ciphertext_amount: Uint8Array;
  ciphertext_side: Uint8Array;
  ciphertext_max_price: Uint8Array;
  pub_key: Uint8Array;
  nonce: Uint8Array; // 16-byte nonce
}

export interface TradeOrderPlaintext {
  amount: bigint;
  side: boolean; // true = YES, false = NO
  max_price: bigint;
}

export interface EncryptedBatchOrder {
  ciphertext_amount: Uint8Array;
  ciphertext_side: Uint8Array;
  ciphertext_limit_price: Uint8Array;
  pub_key: Uint8Array;
  nonce: Uint8Array;
}

export interface BatchOrderPlaintext {
  amount: bigint;
  side: boolean;
  limit_price: bigint;
}

export interface EncryptedAttestation {
  ciphertext_outcome: Uint8Array;
  pub_key: Uint8Array;
  nonce: Uint8Array;
}

/**
 * Generate ephemeral x25519 keypair for encryption
 */
export function generateKeypair() {
  const privateKey = x25519.utils.randomSecretKey();
  const publicKey = x25519.getPublicKey(privateKey);

  return {
    privateKey,
    publicKey,
  };
}

/**
 * Generate a random 16-byte nonce
 */
function generateNonce(): Uint8Array {
  return randomBytes(16);
}

/**
 * Encrypt a trade order for submission to Arcium MPC
 *
 * This follows the Arcium encryption pattern:
 * 1. Generate ephemeral x25519 keypair
 * 2. Get MXE public key and compute shared secret via ECDH
 * 3. Create RescueCipher with shared secret
 * 4. Encrypt each field with a unique nonce
 */
export async function encryptTradeOrder(
  provider: AnchorProvider,
  programId: PublicKey,
  order: TradeOrderPlaintext
): Promise<EncryptedTradeOrder> {
  // Generate ephemeral keypair for this encryption
  const { privateKey, publicKey } = generateKeypair();

  console.log('Generated keypair:', {
    privateKeyLength: privateKey.length,
    publicKeyLength: publicKey.length
  });

  // Get MXE's x25519 public key (ECDH key exchange)
  let mxePublicKey: Uint8Array;
  try {
    const mxeKeyResult: any = await getMXEPublicKey(provider, programId);
    console.log('getMXEPublicKey returned:', {
      value: mxeKeyResult,
      type: typeof mxeKeyResult,
      constructor: mxeKeyResult?.constructor?.name,
      isArray: Array.isArray(mxeKeyResult),
      isUint8Array: mxeKeyResult instanceof Uint8Array,
      length: mxeKeyResult?.length
    });
    
    // Extract the actual Uint8Array - it might be wrapped or nested
    let extractedKey: Uint8Array | null = null;
    
    if (mxeKeyResult instanceof Uint8Array) {
      extractedKey = mxeKeyResult;
    } else if (Array.isArray(mxeKeyResult)) {
      if (mxeKeyResult.length > 0 && mxeKeyResult[0] instanceof Uint8Array) {
        // Wrapped in array of Uint8Arrays
        extractedKey = mxeKeyResult[0];
      } else if (mxeKeyResult.length > 0) {
        // Try converting number array to Uint8Array
        try {
          extractedKey = new Uint8Array(mxeKeyResult);
        } catch (e) {
          console.warn('Failed to convert array to Uint8Array', e);
        }
      }
    } else if (mxeKeyResult && typeof mxeKeyResult === 'object') {
      // Might be wrapped in object - check common field names
      const possibleKeys = ['publicKey', 'key', 'value', 'data'];
      for (const fieldName of possibleKeys) {
        const field = mxeKeyResult[fieldName];
        if (field instanceof Uint8Array) {
          extractedKey = field;
          break;
        }
      }
    }
    
    if (!extractedKey || extractedKey.length === 0) {
      throw new Error('MXE public key is empty or could not be extracted from result');
    }
    
    mxePublicKey = extractedKey;
    console.log('MXE public key extracted:', {
      length: mxePublicKey.length,
      type: mxePublicKey.constructor.name,
      isUint8Array: mxePublicKey instanceof Uint8Array,
      first4Bytes: Array.from(mxePublicKey.slice(0, 4))
    });
  } catch (error) {
    console.error('Failed to get MXE public key:', error);
    throw new Error(
      'Unable to encrypt your trade. The privacy system is not responding correctly. ' +
      'Please try again or contact support.'
    );
  }

  // Validate key lengths (x25519 keys should be 32 bytes)
  if (privateKey.length !== 32) {
    console.error(`Invalid private key length: ${privateKey.length}, expected 32`);
    throw new Error('Encryption key generation failed. Please try again.');
  }
  if (mxePublicKey.length !== 32) {
    console.error(`Invalid MXE public key length: ${mxePublicKey.length}, expected 32`);
    throw new Error('Privacy system key is invalid. Please contact support.');
  }

  // Compute shared secret using Diffie-Hellman
  let sharedSecret: Uint8Array;
  try {
    sharedSecret = x25519.getSharedSecret(privateKey, mxePublicKey);
    console.log('Shared secret computed:', {
      length: sharedSecret.length,
      type: sharedSecret.constructor.name
    });
  } catch (error: any) {
    console.error('Failed to compute shared secret:', error);
    console.error('Private key length:', privateKey.length, 'MXE key length:', mxePublicKey.length);
    throw new Error('Encryption key exchange failed. Please try again or contact support.');
  }

  if (!sharedSecret || sharedSecret.length === 0) {
    console.error('Shared secret is empty');
    throw new Error('Encryption failed. Please try again.');
  }

  // Create Rescue cipher with the shared secret
  const cipher = new RescueCipher(sharedSecret);

  // Generate a single random nonce (16 bytes)
  const nonce = generateNonce();

  // Prepare plaintext values as BigInt array
  const plaintext = [
    order.amount,
    order.side ? BigInt(1) : BigInt(0),
    order.max_price
  ];

  // Encrypt all values together
  const ciphertext = cipher.encrypt(plaintext, nonce);

  // Helper function to convert ciphertext element to 32-byte array
  // ciphertext elements are returned as number[] or Uint8Array
  function ciphertextToBytes32(value: any): Uint8Array {
    if (value instanceof Uint8Array) {
      // Ensure it's 32 bytes
      const bytes = new Uint8Array(32);
      bytes.set(value.slice(0, 32));
      return bytes;
    } else if (Array.isArray(value)) {
      // Convert number array to Uint8Array
      const bytes = new Uint8Array(32);
      for (let i = 0; i < Math.min(value.length, 32); i++) {
        bytes[i] = value[i];
      }
      return bytes;
    } else if (typeof value === 'bigint') {
      // Convert bigint to bytes
      const hex = value.toString(16).padStart(64, '0');
      const bytes = new Uint8Array(32);
      for (let i = 0; i < 32; i++) {
        bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
      }
      return bytes;
    }
    console.error('Unexpected ciphertext format:', typeof value);
    throw new Error('Encryption format error. Please try again.');
  }

  // Return encrypted data with properly serialized ciphertexts
  return {
    ciphertext_amount: ciphertextToBytes32(ciphertext[0]),
    ciphertext_side: ciphertextToBytes32(ciphertext[1]),
    ciphertext_max_price: ciphertextToBytes32(ciphertext[2]),
    pub_key: publicKey,
    nonce: nonce,
  };
}

/**
 * Encrypt a batch order for submission to Arcium MPC
 */
export function encryptBatchOrder(
  order: BatchOrderPlaintext,
  publicKey?: Uint8Array
): EncryptedBatchOrder {
  const keypair = publicKey ? { publicKey } : generateKeypair();
  const cipher = new RescueCipher();
  const nonce = BigInt(Date.now()) * BigInt(1000) + BigInt(Math.floor(Math.random() * 1000));

  const ciphertext_amount = cipher.encrypt(
    order.amount,
    keypair.publicKey,
    nonce
  );

  const ciphertext_side = cipher.encrypt(
    order.side ? BigInt(1) : BigInt(0),
    keypair.publicKey,
    nonce + BigInt(1)
  );

  const ciphertext_limit_price = cipher.encrypt(
    order.limit_price,
    keypair.publicKey,
    nonce + BigInt(2)
  );

  return {
    ciphertext_amount: new Uint8Array(ciphertext_amount),
    ciphertext_side: new Uint8Array(ciphertext_side),
    ciphertext_limit_price: new Uint8Array(ciphertext_limit_price),
    pub_key: keypair.publicKey,
    nonce,
  };
}

/**
 * Encrypt a resolver attestation for submission to Arcium MPC
 */
export function encryptAttestation(
  outcome: boolean,
  publicKey?: Uint8Array
): EncryptedAttestation {
  const keypair = publicKey ? { publicKey } : generateKeypair();
  const cipher = new RescueCipher();
  const nonce = BigInt(Date.now()) * BigInt(1000) + BigInt(Math.floor(Math.random() * 1000));

  const ciphertext_outcome = cipher.encrypt(
    outcome ? BigInt(1) : BigInt(0),
    keypair.publicKey,
    nonce
  );

  return {
    ciphertext_outcome: new Uint8Array(ciphertext_outcome),
    pub_key: keypair.publicKey,
    nonce,
  };
}

/**
 * Convert Uint8Array to fixed-size array for Anchor instruction
 */
export function toFixedArray32(data: Uint8Array): number[] {
  const arr = new Array(32).fill(0);
  for (let i = 0; i < Math.min(data.length, 32); i++) {
    arr[i] = data[i];
  }
  return arr;
}

/**
 * Format nonce as u128 for Anchor instruction
 */
export function formatNonceForAnchor(nonce: bigint): {
  low: bigint;
  high: bigint;
} {
  // Split into low and high 64 bits
  const low = nonce & ((BigInt(1) << BigInt(64)) - BigInt(1));
  const high = nonce >> BigInt(64);

  return { low, high };
}
