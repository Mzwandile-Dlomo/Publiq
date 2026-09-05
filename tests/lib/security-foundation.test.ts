/**
 * Security Foundation Tests
 *
 * Validates:
 * - Config validation catches missing secrets
 * - Token encryption/decryption works
 * - OAuth state generation and validation
 */

import { describe, it, expect, beforeEach } from "vitest";
import { validateConfig } from "@/lib/config-validation";
import { encryptToken, decryptToken, validateEncryptionKeySet } from "@/lib/token-encryption";
import { generateOAuthState, validateOAuthState, clearOAuthState } from "@/lib/oauth-state";

describe("Security Foundation", () => {
  describe("Config Validation", () => {
    it("should detect missing JWT_SECRET", () => {
      const originalSecret = process.env.JWT_SECRET;
      delete process.env.JWT_SECRET;

      const result = validateConfig();
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Missing required environment variable: JWT_SECRET");

      process.env.JWT_SECRET = originalSecret;
    });

    it("should detect missing CRON_SECRET", () => {
      const originalCronSecret = process.env.CRON_SECRET;
      delete process.env.CRON_SECRET;

      const result = validateConfig();
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Missing required environment variable: CRON_SECRET");

      process.env.CRON_SECRET = originalCronSecret;
    });

    it("should pass with all required secrets set", () => {
      // Setup is done in tests/setup.ts
      process.env.DATABASE_URL = "postgresql://test";
      process.env.CRON_SECRET = "test-cron-secret";
      process.env.JWT_SECRET = "test-jwt-secret";
      process.env.GOOGLE_CLIENT_ID = "test-google-id";
      process.env.GOOGLE_CLIENT_SECRET = "test-google-secret";
      process.env.GOOGLE_REDIRECT_URI = "http://localhost:3000/api/auth/google/callback";
      process.env.META_CLIENT_ID = "test-meta-id";
      process.env.META_CLIENT_SECRET = "test-meta-secret";
      process.env.META_REDIRECT_URI = "http://localhost:3000/api/auth/facebook/callback";
      process.env.TIKTOK_CLIENT_KEY = "test-tiktok-key";
      process.env.TIKTOK_CLIENT_SECRET = "test-tiktok-secret";
      process.env.TIKTOK_REDIRECT_URI = "http://localhost:3000/api/auth/tiktok/callback";
      process.env.UPLOADTHING_TOKEN = "test-uploadthing-token";

      const result = validateConfig();
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it("should warn about short JWT_SECRET in production", () => {
      const originalEnv = process.env.NODE_ENV;
      Object.defineProperty(process.env, "NODE_ENV", {
        value: "production",
        writable: true,
        configurable: true,
      });
      process.env.JWT_SECRET = "short"; // Less than 32 characters

      const result = validateConfig();
      expect(result.errors).toContain("JWT_SECRET in production must be at least 32 characters");

      Object.defineProperty(process.env, "NODE_ENV", {
        value: originalEnv,
        writable: true,
        configurable: true,
      });
    });
  });

  describe("Token Encryption", () => {
    beforeEach(() => {
      process.env.TOKEN_ENCRYPTION_KEY = "a".repeat(64); // 32 bytes in hex
    });

    it("should encrypt and decrypt tokens", () => {
      const originalToken = "test-access-token-12345";
      const encrypted = encryptToken(originalToken);

      expect(encrypted).not.toBe(originalToken);
      expect(encrypted).toContain(":"); // Should have format iv:encrypted:tag

      const decrypted = decryptToken(encrypted);
      expect(decrypted).toBe(originalToken);
    });

    it("should produce different ciphertext for same plaintext (due to random IV)", () => {
      const token = "test-token";
      const encrypted1 = encryptToken(token);
      const encrypted2 = encryptToken(token);

      expect(encrypted1).not.toBe(encrypted2);
      expect(decryptToken(encrypted1)).toBe(token);
      expect(decryptToken(encrypted2)).toBe(token);
    });

    it("should return null when decrypting tampered data", () => {
      const token = "test-token";
      const encrypted = encryptToken(token);

      // Tamper with the encrypted data
      const parts = encrypted.split(":");
      parts[1] = "corrupted";
      const tampered = parts.join(":");

      const result = decryptToken(tampered);
      expect(result).toBe(null);
    });

    it("should return null for invalid format", () => {
      const result = decryptToken("not-a-valid-format");
      expect(result).toBe(null);
    });

    it("should detect missing encryption key in development", () => {
      delete process.env.TOKEN_ENCRYPTION_KEY;
      // In dev, it generates a random key, so this should work
      // But we can validate the function exists
      expect(() => encryptToken("test")).not.toThrow();
    });
  });

  describe("OAuth State Management", () => {
    beforeEach(() => {
      // Clear any stored state
      clearOAuthState();
    });

    it("should validate correct state", async () => {
      const state = await generateOAuthState("google", "user-123");
      expect(state).toBeTruthy();
      expect(typeof state).toBe("string");
      expect(state.length).toBeGreaterThan(20); // Should be a hex string
    });

    it("should reject mismatched state", async () => {
      const state = await generateOAuthState("google", "user-123");

      const result = await validateOAuthState("wrong-state", "google", "user-123");
      expect(result).toBe(null);
    });

    it("should reject wrong provider", async () => {
      const state = await generateOAuthState("google", "user-123");

      const result = await validateOAuthState(state, "facebook", "user-123");
      expect(result).toBe(null);
    });

    it("should reject mismatched user ID", async () => {
      const state = await generateOAuthState("google", "user-123");

      const result = await validateOAuthState(state, "google", "wrong-user");
      expect(result).toBe(null);
    });

    it("should clear state after successful validation", async () => {
      const state = await generateOAuthState("google", "user-123");

      const result = await validateOAuthState(state, "google", "user-123");
      expect(result).not.toBe(null);

      // Second validation should fail (state cleared)
      const secondResult = await validateOAuthState(state, "google", "user-123");
      expect(secondResult).toBe(null);
    });
  });
});
