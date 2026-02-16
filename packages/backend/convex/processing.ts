import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const getByStatus = query({
  args: {
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed"),
    ),
    limit: v.optional(v.number()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("aiProcessingQueue")
      .withIndex("by_status", (q) => q.eq("status", args.status))
      .take(args.limit ?? 10);
  },
});

export const updateStatus = internalMutation({
  args: {
    queueId: v.id("aiProcessingQueue"),
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed"),
    ),
    error: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const updates: Record<string, unknown> = { status: args.status };
    if (args.status === "completed" || args.status === "failed") {
      updates.processedAt = Date.now();
    }
    if (args.error) {
      updates.error = args.error;
    }
    if (args.status === "failed") {
      const item = await ctx.db.get(args.queueId);
      if (item) {
        updates.retryCount = item.retryCount + 1;
      }
    }
    await ctx.db.patch(args.queueId, updates);
    return null;
  },
});

export const getByPhotoId = query({
  args: { photoId: v.id("photos") },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("aiProcessingQueue")
      .withIndex("by_photo", (q) => q.eq("photoId", args.photoId))
      .unique();
  },
});

export const getUploadSession = query({
  args: { sessionId: v.id("uploadSessions") },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.sessionId);
  },
});

export const createUploadSession = mutation({
  args: {
    userId: v.id("users"),
    totalFiles: v.number(),
    totalBytes: v.number(),
  },
  returns: v.id("uploadSessions"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("uploadSessions", {
      userId: args.userId,
      status: "pending",
      totalFiles: args.totalFiles,
      completedFiles: 0,
      failedFiles: 0,
      totalBytes: args.totalBytes,
      uploadedBytes: 0,
      startedAt: Date.now(),
    });
  },
});

export const updateUploadSession = mutation({
  args: {
    sessionId: v.id("uploadSessions"),
    completedFiles: v.optional(v.number()),
    failedFiles: v.optional(v.number()),
    uploadedBytes: v.optional(v.number()),
    status: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("uploading"),
        v.literal("processing"),
        v.literal("completed"),
        v.literal("failed"),
      ),
    ),
    error: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { sessionId, ...updates } = args;
    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, val]) => val !== undefined),
    );
    if (args.status === "completed" || args.status === "failed") {
      (cleanUpdates as Record<string, unknown>).completedAt = Date.now();
    }
    if (Object.keys(cleanUpdates).length > 0) {
      await ctx.db.patch(sessionId, cleanUpdates);
    }
    return null;
  },
});
