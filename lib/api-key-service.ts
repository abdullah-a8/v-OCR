"use client";

import { supabase } from "./supabase";
import { encryptApiKey, decryptApiKey } from "./encryption";

export interface UserApiKey {
  id: string;
  user_id: string;
  encrypted_api_key: string;
  created_at: string;
  updated_at: string;
}

/**
 * Save or update a user's encrypted API key in Supabase
 */
export async function saveApiKey(
  userId: string,
  apiKey: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Encrypt the API key before storing
    const encryptedKey = await encryptApiKey(apiKey, userId);

    // Check if user already has an API key
    const { data: existing } = await supabase
      .from("user_api_keys")
      .select("id")
      .eq("user_id", userId)
      .single();

    if (existing) {
      // Update existing key
      const { error } = await supabase
        .from("user_api_keys")
        .update({ encrypted_api_key: encryptedKey })
        .eq("user_id", userId);

      if (error) throw error;
    } else {
      // Insert new key
      const { error } = await supabase
        .from("user_api_keys")
        .insert({
          user_id: userId,
          encrypted_api_key: encryptedKey,
        });

      if (error) throw error;
    }

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
 * Retrieve and decrypt a user's API key from Supabase
 */
export async function getApiKey(
  userId: string
): Promise<{ apiKey: string | null; error?: string }> {
  try {
    const { data, error } = await supabase
      .from("user_api_keys")
      .select("encrypted_api_key")
      .eq("user_id", userId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // No API key found
        return { apiKey: null };
      }
      throw error;
    }

    if (!data?.encrypted_api_key) {
      return { apiKey: null };
    }

    // Decrypt the API key
    const apiKey = await decryptApiKey(data.encrypted_api_key, userId);

    return { apiKey };
  } catch (error) {
    console.error("Error retrieving API key:", error);
    return {
      apiKey: null,
      error:
        error instanceof Error ? error.message : "Failed to retrieve API key",
    };
  }
}

/**
 * Delete a user's API key from Supabase
 */
export async function deleteApiKey(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from("user_api_keys")
      .delete()
      .eq("user_id", userId);

    if (error) throw error;

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

/**
 * Check if a user has an API key stored
 */
export async function hasApiKey(userId: string): Promise<boolean> {
  try {
    const { data } = await supabase
      .from("user_api_keys")
      .select("id")
      .eq("user_id", userId)
      .single();

    return !!data;
  } catch {
    return false;
  }
}
