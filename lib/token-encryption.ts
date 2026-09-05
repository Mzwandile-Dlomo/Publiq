/**
 * Token Encryption and Decryption
 *
 * Encrypts provider access/refresh tokens at rest in the database.
 * Uses AES-256-GCM for authenticated encryption with associated data.
 *
 * Each encrypted token includes:
 * - A unique IV (initialization vector)
 * - The encrypted data
 * - An authentication tag (ensures data hasn't been tampered with)
 *
 * Exit criteria: tokens cannot be read from database backups without the encryption key.
 */

import crypto from "crypto";

const ENCRYPTION_KEY = process.env.TOKEN_ENCRYPTION_KEY
  ? Buffer.from(process.env.TOKEN_ENCRYPTION_KEY, "hex")
  : crypto.randomBytes(32); // Default for development; must be set in production

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/**
 * Encrypts a provider token (access or refresh token).
 * Returns a concatenated string of IV:encrypted:tag for storage.
 */
export function encryptToken(plaintext: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);

  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");

  const tag = cipher.getAuthTag();

  // Format: iv:encrypted:tag (all hex-encoded)
  return `${iv.toString("hex")}:${encrypted}:${tag.toString("hex")}`;
}

/**
 * Decrypts a provider token from storage.
 * Expects format: iv:encrypted:tag
 * Returns null if decryption fails (tampered data, wrong key, etc.)
 */
export function decryptToken(encrypted: string): string | null {
  try {
    const parts = encrypted.split(":");
    if (parts.length !== 3) {
      throw new Error("Invalid encrypted token format");
    }

    const iv = Buffer.from(parts[0], "hex");
    const encryptedData = parts[1];
    const tag = Buffer.from(parts[2], "hex");

    if (iv.length !== IV_LENGTH || tag.length !== AUTH_TAG_LENGTH) {
      throw new Error("Invalid IV or auth tag length");
    }

    const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(encryptedData, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (error) {
    console.error("Token decryption failed:", error);
    return null;
  }
}

/**
 * In production, ensure TOKEN_ENCRYPTION_KEY is set in .env.
 * Generate a new key with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 */
export function validateEncryptionKeySet(): boolean {
  return !!process.env.TOKEN_ENCRYPTION_KEY;
}
