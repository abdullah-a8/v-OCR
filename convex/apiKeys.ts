import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Save or update a user's encrypted API key
 */
export const saveApiKey = mutation({
  args: {
    userId: v.string(),
    encryptedApiKey: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Check if user already has an API key
    const existing = await ctx.db
      .query("user_api_keys")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .unique();

    if (existing) {
      // Update existing key
      await ctx.db.patch(existing._id, {
        encryptedApiKey: args.encryptedApiKey,
        updatedAt: now,
      });
    } else {
      // Insert new key
      await ctx.db.insert("user_api_keys", {
        userId: args.userId,
        encryptedApiKey: args.encryptedApiKey,
        createdAt: now,
        updatedAt: now,
      });
    }

    return { success: true };
  },
});

/**
 * Retrieve a user's encrypted API key
 */
export const getApiKey = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const record = await ctx.db
      .query("user_api_keys")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .unique();

    if (!record) {
      return { encryptedApiKey: null };
    }

    return { encryptedApiKey: record.encryptedApiKey };
  },
});

/**
 * Delete a user's API key
 */
export const deleteApiKey = mutation({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const record = await ctx.db
      .query("user_api_keys")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .unique();

    if (record) {
      await ctx.db.delete(record._id);
    }

    return { success: true };
  },
});

/**
 * Check if a user has an API key stored
 */
export const hasApiKey = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const record = await ctx.db
      .query("user_api_keys")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .unique();

    return { hasKey: !!record };
  },
});
