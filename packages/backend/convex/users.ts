import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";

function ensureNum(n: number | undefined): number {
  return typeof n === "number" && n >= 0 ? n : 0;
}

export const getByBetterAuthId = query({
  args: { betterAuthUserId: v.string() },
  returns: v.union(
    v.object({
      _id: v.id("users"),
      _creationTime: v.number(),
      email: v.string(),
      name: v.optional(v.string()),
      avatarUrl: v.optional(v.string()),
      betterAuthUserId: v.string(),
      encryptionKeyHash: v.optional(v.string()),
      aiOptIn: v.optional(v.boolean()),
      storageQuotaBytes: v.number(),
      usedStorageBytes: v.number(),
      createdAt: v.number(),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_better_auth_id", (q) =>
        q.eq("betterAuthUserId", args.betterAuthUserId),
      )
      .unique();
  },
});

export const getByEmail = query({
  args: { email: v.string() },
  returns: v.union(
    v.object({
      _id: v.id("users"),
      _creationTime: v.number(),
      email: v.string(),
      name: v.optional(v.string()),
      avatarUrl: v.optional(v.string()),
      betterAuthUserId: v.string(),
      encryptionKeyHash: v.optional(v.string()),
      aiOptIn: v.optional(v.boolean()),
      storageQuotaBytes: v.number(),
      usedStorageBytes: v.number(),
      createdAt: v.number(),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique();
  },
});

export const createOrUpdate = mutation({
  args: {
    email: v.string(),
    name: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    betterAuthUserId: v.string(),
  },
  returns: v.id("users"),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_better_auth_id", (q) =>
        q.eq("betterAuthUserId", args.betterAuthUserId),
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        name: args.name,
        avatarUrl: args.avatarUrl,
      });
      return existing._id;
    }

    return await ctx.db.insert("users", {
      email: args.email,
      name: args.name,
      avatarUrl: args.avatarUrl,
      betterAuthUserId: args.betterAuthUserId,
      storageQuotaBytes: 15 * 1024 * 1024 * 1024, // 15GB default
      usedStorageBytes: 0,
      totalPhotoCount: 0,
      processedPhotoCount: 0,
      pendingAiCount: 0,
      createdAt: Date.now(),
    });
  },
});

export const updateStorageUsage = internalMutation({
  args: {
    userId: v.id("users"),
    deltaBytes: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new ConvexError({ code: "NOT_FOUND", message: "User not found" });
    }
    await ctx.db.patch(args.userId, {
      usedStorageBytes: Math.max(0, user.usedStorageBytes + args.deltaBytes),
    });
    return null;
  },
});

export const updateEncryptionKey = mutation({
  args: {
    userId: v.id("users"),
    encryptionKeyHash: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, {
      encryptionKeyHash: args.encryptionKeyHash,
    });
    return null;
  },
});

export const getAiOptIn = query({
  args: { userId: v.id("users") },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    return user?.aiOptIn ?? false;
  },
});

export const setAiOptIn = mutation({
  args: {
    userId: v.id("users"),
    aiOptIn: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, { aiOptIn: args.aiOptIn });
    return null;
  },
});

export const getStorageStats = query({
  args: { userId: v.id("users") },
  returns: v.union(
    v.object({
      usedStorageBytes: v.number(),
      storageQuotaBytes: v.number(),
      percentUsed: v.number(),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return null;
    return {
      usedStorageBytes: user.usedStorageBytes,
      storageQuotaBytes: user.storageQuotaBytes,
      percentUsed: (user.usedStorageBytes / user.storageQuotaBytes) * 100,
    };
  },
});

// ─── AI indexing progress (scalable counts) ─────────────────

export const incrementTotalPhotoCount = internalMutation({
  args: { userId: v.id("users") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return null;
    const n = ensureNum((user as any).totalPhotoCount) + 1;
    await ctx.db.patch(args.userId, { totalPhotoCount: n });
    return null;
  },
});

export const decrementTotalPhotoCount = internalMutation({
  args: { userId: v.id("users") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return null;
    const n = Math.max(0, ensureNum((user as any).totalPhotoCount) - 1);
    await ctx.db.patch(args.userId, { totalPhotoCount: n });
    return null;
  },
});

export const incrementProcessedPhotoCount = internalMutation({
  args: { userId: v.id("users") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return null;
    const n = ensureNum((user as any).processedPhotoCount) + 1;
    await ctx.db.patch(args.userId, { processedPhotoCount: n });
    return null;
  },
});

export const decrementProcessedPhotoCount = internalMutation({
  args: { userId: v.id("users") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return null;
    const n = Math.max(0, ensureNum((user as any).processedPhotoCount) - 1);
    await ctx.db.patch(args.userId, { processedPhotoCount: n });
    return null;
  },
});

export const incrementPendingAiCount = internalMutation({
  args: { userId: v.id("users") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return null;
    const n = ensureNum((user as any).pendingAiCount) + 1;
    await ctx.db.patch(args.userId, { pendingAiCount: n });
    return null;
  },
});

export const decrementPendingAiCount = internalMutation({
  args: { userId: v.id("users") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return null;
    const n = Math.max(0, ensureNum((user as any).pendingAiCount) - 1);
    await ctx.db.patch(args.userId, { pendingAiCount: n });
    return null;
  },
});

export const getAiProgress = query({
  args: { userId: v.id("users") },
  returns: v.union(
    v.object({
      total: v.number(),
      processed: v.number(),
      pending: v.number(),
      percent: v.number(),
      isComplete: v.boolean(),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return null;
    const u = user as any;
    const total = ensureNum(u.totalPhotoCount);
    const processed = ensureNum(u.processedPhotoCount);
    const pending = ensureNum(u.pendingAiCount);
    const percent = total > 0 ? Math.round((processed / total) * 100) : 100;
    return {
      total,
      processed,
      pending,
      percent: Math.min(100, percent),
      isComplete: pending === 0,
    };
  },
});
