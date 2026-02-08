import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Table for storing encrypted API keys (migrated from Supabase)
  user_api_keys: defineTable({
    userId: v.string(),
    encryptedApiKey: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),
});
