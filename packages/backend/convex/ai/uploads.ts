import { mutation } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { getAuthedUserId } from "./auth_util";

const TOKEN_TTL_MS = 10 * 60 * 1000; // 10 minutes

export const generateAnalysisUploadUrl = mutation({
  args: { photoId: v.id("photos") },
  returns: v.object({
    uploadUrl: v.string(),
    analysisToken: v.string(),
    expiresAt: v.number(),
  }),
  handler: async (ctx, args) => {
    const userId = await getAuthedUserId(ctx);
    const photo = await ctx.db.get(args.photoId);
    if (!photo || photo.userId !== userId) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Photo not found" });
    }

    const uploadUrl = await ctx.storage.generateUploadUrl();
    const analysisToken = crypto.randomUUID();
    const expiresAt = Date.now() + TOKEN_TTL_MS;

    await ctx.db.insert("analysisUploads", {
      userId,
      photoId: args.photoId,
      token: analysisToken,
      expiresAt,
      createdAt: Date.now(),
    });

    return { uploadUrl, analysisToken, expiresAt };
  },
});

export const attachAnalysisThumbnail = mutation({
  args: {
    photoId: v.id("photos"),
    storageId: v.string(), // Convex file storage id returned by the upload endpoint
    analysisToken: v.string(),
    width: v.optional(v.number()),
    height: v.optional(v.number()),
    mimeType: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthedUserId(ctx);
    const photo = await ctx.db.get(args.photoId);
    if (!photo || photo.userId !== userId) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Photo not found" });
    }

    const tokenRow = await ctx.db
      .query("analysisUploads")
      .withIndex("by_token", (q) => q.eq("token", args.analysisToken))
      .unique();

    if (
      !tokenRow ||
      tokenRow.userId !== userId ||
      tokenRow.photoId !== args.photoId ||
      tokenRow.expiresAt < Date.now()
    ) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Invalid or expired analysis token",
      });
    }

    // One-time token.
    await ctx.db.delete(tokenRow._id);

    await ctx.db.patch(args.photoId, {
      analysisImageStorageId: args.storageId,
      // Optional: keep a human-friendly locationName updated elsewhere; width/height are for originals.
    });

    // Upsert a processing job.
    const existingJob = await ctx.db
      .query("aiProcessingQueue")
      .withIndex("by_photo", (q) => q.eq("photoId", args.photoId))
      .unique();

    const now = Date.now();
    if (existingJob) {
      await ctx.db.patch(existingJob._id, {
        kind: "photo_analysis",
        status: "pending",
        step: "pending",
        lockedUntil: undefined,
        retryCount: 0,
        error: undefined,
        providerMeta: undefined,
        processedAt: undefined,
        createdAt: existingJob.createdAt ?? now,
      });
    } else {
      await ctx.db.insert("aiProcessingQueue", {
        photoId: args.photoId,
        userId,
        kind: "photo_analysis",
        status: "pending",
        step: "pending",
        lockedUntil: undefined,
        retryCount: 0,
        error: undefined,
        providerMeta: undefined,
        createdAt: now,
      });
      await ctx.runMutation(internal.users.incrementPendingAiCount, {
        userId,
      });
    }

    return null;
  },
});

