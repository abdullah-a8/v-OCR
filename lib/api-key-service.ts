"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { encryptApiKey, decryptApiKey } from "./encryption";

export interface UserApiKey {
  id: string;
  user_id: string;
  encrypted_api_key: string;
  created_at: string;
  updated_at: string;
}

/**
 * Hook to get the save API key mutation
 */
export function useSaveApiKeyMutation() {
  return useMutation(api.apiKeys.saveApiKey);
}

/**
 * Hook to get the delete API key mutation
 */
export function useDeleteApiKeyMutation() {
  return useMutation(api.apiKeys.deleteApiKey);
}

/**
 * Hook to check if user has an API key
 */
export function useHasApiKey(userId: string | undefined) {
  return useQuery(
    api.apiKeys.hasApiKey,
    userId ? { userId } : "skip"
  );
}

/**
 * Hook to get encrypted API key
 */
export function useGetApiKey(userId: string | undefined) {
  return useQuery(
    api.apiKeys.getApiKey,
    userId ? { userId } : "skip"
  );
}

/**
 * Save or update a user's encrypted API key
 */
export async function saveApiKey(
  userId: string,
  apiKey: string,
  saveMutation: ReturnType<typeof useSaveApiKeyMutation>
): Promise<{ success: boolean; error?: string }> {
  try {
    // Encrypt the API key before storing
    const encryptedKey = await encryptApiKey(apiKey, userId);

    await saveMutation({
      userId,
      encryptedApiKey: encryptedKey,
    });

    return { success: true };
  } catch (error) {
    console.error("Error saving API key:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to save API key",
    };
  }
}

/**
 * Retrieve and decrypt a user's API key
 */
export async function getApiKeyDecrypted(
  userId: string,
  encryptedApiKey: string | null | undefined
): Promise<{ apiKey: string | null; error?: string }> {
  try {
    if (!encryptedApiKey) {
      return { apiKey: null };
    }

    // Decrypt the API key
    const apiKey = await decryptApiKey(encryptedApiKey, userId);

    return { apiKey };
  } catch (error) {
    console.error("Error decrypting API key:", error);
    return {
      apiKey: null,
      error:
        error instanceof Error ? error.message : "Failed to retrieve API key",
    };
  }
}

/**
 * Delete a user's API key
 */
export async function deleteApiKey(
  userId: string,
  deleteMutation: ReturnType<typeof useDeleteApiKeyMutation>
): Promise<{ success: boolean; error?: string }> {
  try {
    await deleteMutation({ userId });

    return { success: true };
  } catch (error) {
    console.error("Error deleting API key:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to delete API key",
    };
  }
}
