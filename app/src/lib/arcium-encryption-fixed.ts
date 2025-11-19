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
  // Note: MXE must be initialized with a valid x25519 public key for encryption to work
  // IMPORTANT: Use correct hardcoded MXE account because SDK getMXEAccAddress() derives wrong address
  const correctMxeAccount = new PublicKey("34zXR49QSmNeuoH8LmoKgCJQo7vfATD57iD6Ubo2f5Pz");
  let mxePublicKey: Uint8Array;
  let mxeKeyValid = false;

  try {
    // Manually fetch MXE account data instead of using SDK helper
    const mxeAccountInfo = await provider.connection.getAccountInfo(correctMxeAccount);
    if (!mxeAccountInfo) {
      throw new Error(`Account does not exist or has no data ${correctMxeAccount.toBase58()}`);
    }

    // MXE public key is stored at offset 0-31 in the account data (32 bytes x25519 public key)
    const fetchedKey = mxeAccountInfo.data.slice(0, 32);

    if (!fetchedKey || !(fetchedKey instanceof Uint8Array) || fetchedKey.length !== 32) {
      console.warn("⚠️ MXE public key has invalid format");
      mxePublicKey = new Uint8Array(32);
    } else {
      // Check if key is all zeros (not initialized)
      const isAllZeros = fetchedKey.every(byte => byte === 0);
      if (isAllZeros) {
        console.warn("⚠️ MXE public key is all zeros - MXE account not initialized with encryption key");
        console.warn("   To initialize: Run `arcium mxe-init` or initialize via program");
        mxePublicKey = new Uint8Array(32);
      } else {
        mxePublicKey = fetchedKey;
        mxeKeyValid = true;
      }
    }
  } catch (error: any) {
    console.warn("⚠️ Failed to fetch MXE public key:", error.message);
    mxePublicKey = new Uint8Array(32);
  }

  // 3. Compute shared secret (ECDH)
  let sharedSecret: Uint8Array;

  if (!mxeKeyValid) {
    // MXE not properly initialized - FAIL IMMEDIATELY (no fallback)
    console.error('❌ MXE public key is invalid (all zeros)');
    console.error('   This means the Arcium cluster has no active ARX nodes.');
    console.error('');
    console.error('   To fix this, you have two options:');
    console.error('');
    console.error('   1. Use Arcium Localnet (recommended for testing):');
    console.error('      $ arcium localnet');
    console.error('      This starts local ARX nodes with proper MPC support.');
    console.error('');
    console.error('   2. Contact Arcium for devnet cluster access:');
    console.error('      Discord: https://discord.gg/arcium');
    console.error('      Request: Active devnet cluster with ARX nodes');
    console.error('');
    throw new Error(
      'MXE not initialized with valid encryption keys. ' +
      'Run "arcium localnet" for local testing or contact Arcium team for devnet cluster access. ' +
      'See console for details.'
    );
  }

  // MXE key is valid - use proper ECDH
  try {
    sharedSecret = x25519.getSharedSecret(privateKey, mxePublicKey);
    console.log('✅ Using MPC-secure encryption with real Arcium cluster');
  } catch (error: any) {
    console.error('❌ x25519 key exchange failed:', error.message);
    throw new Error(
      'Encryption key exchange failed. MXE public key may be corrupted. ' +
      'Please reinitialize MXE account or contact Arcium support.'
    );
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

