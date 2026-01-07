"use client";

/**
 * Client-side encryption utilities using Web Crypto API
 * Used to encrypt/decrypt API keys before storing in Supabase
 */

// Derive an encryption key from the user's session
async function deriveKey(userId: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(userId),
    { name: "PBKDF2" },
    false,
    ["deriveBits", "deriveKey"]
  );

  // Use a fixed salt (in production, this could be stored per-user)
  const salt = encoder.encode("vOCR-encryption-salt-v1");

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

/**
 * Encrypt an API key using AES-GCM
 * @param apiKey - The plaintext API key to encrypt
 * @param userId - The user ID to derive the encryption key from
 * @returns Base64-encoded encrypted data with IV prepended
 */
export async function encryptApiKey(
  apiKey: string,
  userId: string
): Promise<string> {
  try {
    const key = await deriveKey(userId);
    const encoder = new TextEncoder();
    const data = encoder.encode(apiKey);

    // Generate a random initialization vector
    const iv = crypto.getRandomValues(new Uint8Array(12));

    // Encrypt the data
    const encryptedData = await crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv: iv,
      },
      key,
      data
    );

    // Combine IV and encrypted data
    const combined = new Uint8Array(iv.length + encryptedData.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encryptedData), iv.length);

    // Convert to base64 for storage
    return btoa(String.fromCharCode(...combined));
  } catch (error) {
    console.error("Encryption error:", error);
    throw new Error("Failed to encrypt API key");
  }
}

/**
 * Decrypt an encrypted API key using AES-GCM
 * @param encryptedData - Base64-encoded encrypted data with IV prepended
 * @param userId - The user ID to derive the decryption key from
 * @returns The decrypted plaintext API key
 */
export async function decryptApiKey(
  encryptedData: string,
  userId: string
): Promise<string> {
  try {
    const key = await deriveKey(userId);

    // Decode from base64
    const combined = Uint8Array.from(atob(encryptedData), (c) => c.charCodeAt(0));

    // Extract IV and encrypted data
    const iv = combined.slice(0, 12);
    const data = combined.slice(12);

    // Decrypt the data
    const decryptedData = await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: iv,
      },
      key,
      data
    );

    // Convert back to string
    const decoder = new TextDecoder();
    return decoder.decode(decryptedData);
  } catch (error) {
    console.error("Decryption error:", error);
    throw new Error("Failed to decrypt API key");
  }
}

/**
 * Mask an API key for display purposes
 * @param apiKey - The API key to mask
 * @returns Masked API key (e.g., "sk-••••••••••••1234")
 */
export function maskApiKey(apiKey: string): string {
  if (!apiKey || apiKey.length < 8) {
    return "••••••••";
  }

  const visibleStart = apiKey.substring(0, 3);
  const visibleEnd = apiKey.substring(apiKey.length - 4);
  const maskedMiddle = "•".repeat(12);

  return `${visibleStart}${maskedMiddle}${visibleEnd}`;
}

/**
 * Validate DeepInfra API key format
 * @param apiKey - The API key to validate
 * @returns True if the API key format is valid
 */
export function validateApiKeyFormat(apiKey: string): boolean {
  // DeepInfra API keys are alphanumeric tokens with a minimum length
  // They don't follow a specific prefix pattern
  return (
    apiKey.length >= 20 &&
    /^[A-Za-z0-9_\-]+$/.test(apiKey)
  );
}
