import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    email: v.string(),
    passwordHash: v.optional(v.string()),
    appleUserId: v.optional(v.string()),
    userMetadataJson: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_email", ["email"])
    .index("by_apple_user_id", ["appleUserId"]),

  sessions: defineTable({
    token: v.string(),
    userId: v.id("users"),
    createdAt: v.number(),
    expiresAt: v.number(),
  })
    .index("by_token", ["token"])
    .index("by_user_id", ["userId"]),

  userStates: defineTable({
    userId: v.id("users"),
    emailAccountsJson: v.string(),
    historyJson: v.string(),
    userProfileJson: v.string(),
    categoriesJson: v.string(),
    darkMode: v.boolean(),
    updatedAt: v.number(),
  }).index("by_user_id", ["userId"]),
});
