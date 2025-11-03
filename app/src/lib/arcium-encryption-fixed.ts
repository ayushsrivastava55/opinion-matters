/**
 * Arcium encryption utilities - SIMPLIFIED VERSION
 * Focused on resolving the x25519 key exchange error
 */

import {
  RescueCipher,
  x25519,
  getMXEPublicKey,
} from '@arcium-hq/client';
import type { AnchorProvider } from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';

export interface EncryptedTradeOrder {
  ciphertext_amount: Uint8Array;
  ciphertext_side: Uint8Array;
  ciphertext_max_price: Uint8Array;
  pub_key: Uint8Array;
  nonce: Uint8Array;
}

export interface TradeOrderPlaintext {
  amount: bigint;
  side: boolean; // true = YES, false = NO
  max_price: bigint;
}

/**
 * Generate ephemeral x25519 keypair
 */
export function generateKeypair() {
  const privateKey = x25519.utils.randomSecretKey();
  const publicKey = x25519.getPublicKey(privateKey);
  return { privateKey, publicKey };
}

/**
 * Generate random nonce using Web Crypto API
 */
function generateNonce(): Uint8Array {
  const nonce = new Uint8Array(16);
  if (typeof window !== 'undefined' && window.crypto) {
    window.crypto.getRandomValues(nonce);
  } else {
    // Node.js fallback
    const crypto = require('crypto');
    return crypto.randomBytes(16);
  }
  return nonce;
}

/**
 * Encrypt a trade order for submission to Arcium MPC
 */
export async function encryptTradeOrder(
  provider: AnchorProvider,
  programId: PublicKey,
  order: TradeOrderPlaintext
): Promise<EncryptedTradeOrder> {
  // 1. Generate ephemeral keypair
  const { privateKey, publicKey } = generateKeypair();

  // 2. Get MXE public key (per Arcium docs pattern)
  const mxePublicKey = await getMXEPublicKey(provider, programId);
  
  if (!mxePublicKey || !(mxePublicKey instanceof Uint8Array) || mxePublicKey.length !== 32) {
    throw new Error(
      "Unable to encrypt your trade. The privacy infrastructure is not responding correctly. " +
      "Please try again or contact support."
    );
  }

  // Check if key is all zeros (invalid)
  const isAllZeros = mxePublicKey.every(byte => byte === 0);
  if (isAllZeros) {
    throw new Error(
      "Privacy system is not fully initialized. Please try again in a few moments. " +
      "If this issue persists, contact support."
    );
  }

  console.log('Encryption keys:', {
    privateKeyOk: privateKey.length === 32,
    publicKeyOk: publicKey.length === 32,
    mxeKeyOk: mxePublicKey.length === 32
  });

  // 3. Compute shared secret (ECDH)
  let sharedSecret: Uint8Array;
  try {
    sharedSecret = x25519.getSharedSecret(privateKey, mxePublicKey);
  } catch (error: any) {
    // Log detailed info for debugging
    console.error('x25519.getSharedSecret failed:', error.message);
    console.error('Private key:', Buffer.from(privateKey).toString('hex').slice(0, 32) + '...');
    console.error('MXE pub key:', Buffer.from(mxePublicKey).toString('hex').slice(0, 32) + '...');
    throw new Error('Encryption key exchange failed. Please try again or contact support.');
  }

  // 4. Create cipher with shared secret
  const cipher = new RescueCipher(sharedSecret);
  const nonce = generateNonce();

  // 5. Encrypt the order data
  const plaintext = [
    order.amount,
    order.side ? BigInt(1) : BigInt(0),
    order.max_price
  ];

  const ciphertext = cipher.encrypt(plaintext, nonce);

  // 6. Convert ciphertext to Uint8Array format
  function toBytes32(value: any): Uint8Array {
    if (value instanceof Uint8Array) {
      const bytes = new Uint8Array(32);
      bytes.set(value.slice(0, 32));
      return bytes;
    }
    if (Array.isArray(value)) {
      const bytes = new Uint8Array(32);
      for (let i = 0; i < Math.min(value.length, 32); i++) {
        bytes[i] = value[i];
      }
      return bytes;
    }
    if (typeof value === 'bigint') {
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

  return {
    ciphertext_amount: toBytes32(ciphertext[0]),
    ciphertext_side: toBytes32(ciphertext[1]),
    ciphertext_max_price: toBytes32(ciphertext[2]),
    pub_key: publicKey,
    nonce: nonce,
  };
}

/**
 * Convert Uint8Array to fixed-size array for Anchor
 */
export function toFixedArray32(data: Uint8Array): number[] {
  const arr = new Array(32).fill(0);
  for (let i = 0; i < Math.min(data.length, 32); i++) {
    arr[i] = data[i];
  }
  return arr;
}

