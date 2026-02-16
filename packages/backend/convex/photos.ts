import { query, mutation, action, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { ConvexError } from "convex/values";

// ─── Queries ──────────────────────────────────────────────

export const getById = query({
  args: { photoId: v.id("photos") },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.photoId);
  },
});

export const listByUser = query({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  returns: v.object({
    photos: v.any(),
    continueCursor: v.union(v.string(), v.null()),
    isDone: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;
    const results = await ctx.db
      .query("photos")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .paginate({ numItems: limit, cursor: args.cursor ?? null });

    return {
      photos: results.page.filter((p) => !p.isTrashed),
      continueCursor: results.continueCursor,
      isDone: results.isDone,
    };
  },
});

export const listByDate = query({
  args: {
    userId: v.id("users"),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const q = ctx.db
      .query("photos")
      .withIndex("by_user_date", (idx) => {
        if (args.startDate !== undefined && args.endDate !== undefined) {
          return idx
            .eq("userId", args.userId)
            .gte("takenAt", args.startDate)
            .lte("takenAt", args.endDate);
        }
        if (args.startDate !== undefined) {
          return idx.eq("userId", args.userId).gte("takenAt", args.startDate);
        }
        if (args.endDate !== undefined) {
          return idx.eq("userId", args.userId).lte("takenAt", args.endDate);
        }
        return idx.eq("userId", args.userId);
      })
      .order("desc");

    const photos = await q.collect();
    return photos.filter((p) => !p.isTrashed);
  },
});

export const listFavorites = query({
  args: { userId: v.id("users") },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("photos")
      .withIndex("by_user_favorite", (q) =>
        q.eq("userId", args.userId).eq("isFavorite", true),
      )
      .collect();
  },
});

export const listTrashed = query({
  args: { userId: v.id("users") },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("photos")
      .withIndex("by_user_trashed", (q) =>
        q.eq("userId", args.userId).eq("isTrashed", true),
      )
      .collect();
  },
});

export const listArchived = query({
  args: { userId: v.id("users") },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("photos")
      .withIndex("by_user_archived", (q) =>
        q.eq("userId", args.userId).eq("isArchived", true),
      )
      .collect();
  },
});

export const getGeotagged = query({
  args: { userId: v.id("users") },
  returns: v.any(),
  handler: async (ctx, args) => {
    const photos = await ctx.db
      .query("photos")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    return photos.filter(
      (p) =>
        p.latitude !== undefined && p.longitude !== undefined && !p.isTrashed,
    );
  },
});

export const searchByDescription = query({
  args: {
    userId: v.id("users"),
    searchQuery: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("photos")
      .withSearchIndex("search_description", (q) =>
        q.search("description", args.searchQuery).eq("userId", args.userId),
      )
      .collect();
  },
});

export const searchByEmbedding = action({
  args: {
    userId: v.id("users"),
    embedding: v.array(v.float64()),
    limit: v.optional(v.number()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const results = await ctx.vectorSearch("photos", "by_embedding", {
      vector: args.embedding,
      limit: args.limit ?? 20,
      filter: (q) => q.eq("userId", args.userId),
    });
    return results;
  },
});

// ─── Mutations ────────────────────────────────────────────

export const create = mutation({
  args: {
    userId: v.id("users"),
    storageKey: v.string(),
    thumbnailStorageKey: v.optional(v.string()),
    encryptedKey: v.optional(v.string()),
    fileName: v.string(),
    mimeType: v.string(),
    sizeBytes: v.number(),
    width: v.optional(v.number()),
    height: v.optional(v.number()),
    takenAt: v.optional(v.number()),
    cameraMake: v.optional(v.string()),
    cameraModel: v.optional(v.string()),
    focalLength: v.optional(v.string()),
    aperture: v.optional(v.string()),
    iso: v.optional(v.number()),
    exposureTime: v.optional(v.string()),
    latitude: v.optional(v.float64()),
    longitude: v.optional(v.float64()),
    altitude: v.optional(v.float64()),
    locationName: v.optional(v.string()),
    isEncrypted: v.boolean(),
    source: v.union(
      v.literal("upload"),
      v.literal("google_photos"),
      v.literal("sync"),
    ),
    externalId: v.optional(v.string()),
  },
  returns: v.id("photos"),
  handler: async (ctx, args) => {
    const photoId = await ctx.db.insert("photos", {
      ...args,
      isFavorite: false,
      isArchived: false,
      isTrashed: false,
      uploadedAt: Date.now(),
    });

    // Queue for AI processing
    await ctx.db.insert("aiProcessingQueue", {
      photoId,
      userId: args.userId,
      kind: "photo_analysis",
      status: "pending",
      step: "pending",
      lockedUntil: undefined,
      retryCount: 0,
      createdAt: Date.now(),
      providerMeta: undefined,
    });

    // Update storage usage
    await ctx.runMutation(internal.users.updateStorageUsage, {
      userId: args.userId,
      deltaBytes: args.sizeBytes,
    });

    return photoId;
  },
});

export const toggleFavorite = mutation({
  args: { photoId: v.id("photos") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const photo = await ctx.db.get(args.photoId);
    if (!photo) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Photo not found",
      });
    }
    await ctx.db.patch(args.photoId, { isFavorite: !photo.isFavorite });
    return null;
  },
});

export const archive = mutation({
  args: { photoId: v.id("photos") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.photoId, { isArchived: true });
    return null;
  },
});

export const unarchive = mutation({
  args: { photoId: v.id("photos") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.photoId, { isArchived: false });
    return null;
  },
});

export const trash = mutation({
  args: { photoId: v.id("photos") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.photoId, {
      isTrashed: true,
      trashedAt: Date.now(),
    });
    return null;
  },
});

export const restore = mutation({
  args: { photoId: v.id("photos") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.photoId, {
      isTrashed: false,
      trashedAt: undefined,
    });
    return null;
  },
});

export const deletePermanently = mutation({
  args: { photoId: v.id("photos") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const photo = await ctx.db.get(args.photoId);
    if (!photo) return null;

    // Remove from albums
    const albumPhotos = await ctx.db
      .query("albumPhotos")
      .withIndex("by_photo", (q) => q.eq("photoId", args.photoId))
      .collect();
    for (const ap of albumPhotos) {
      await ctx.db.delete(ap._id);
    }

    // Remove from people associations
    const photoPeople = await ctx.db
      .query("photoPeople")
      .withIndex("by_photo", (q) => q.eq("photoId", args.photoId))
      .collect();
    for (const pp of photoPeople) {
      await ctx.db.delete(pp._id);
    }

    // Update storage usage
    await ctx.runMutation(internal.users.updateStorageUsage, {
      userId: photo.userId,
      deltaBytes: -photo.sizeBytes,
    });

    await ctx.db.delete(args.photoId);
    return null;
  },
});

export const updateAiAnalysis = internalMutation({
  args: {
    photoId: v.id("photos"),
    description: v.optional(v.string()),
    aiTags: v.optional(v.array(v.string())),
    embedding: v.optional(v.array(v.float64())),
    embeddingClipV2: v.optional(v.array(v.float64())),
    embeddingClipV2Dim: v.optional(v.number()),
    embeddingClipV2Model: v.optional(v.string()),
    captionShort: v.optional(v.string()),
    captionShortV: v.optional(v.number()),
    aiTagsV2: v.optional(v.array(v.string())),
    aiQuality: v.optional(v.any()),
    aiSafety: v.optional(v.any()),
    aiProcessedAt: v.optional(v.number()),
    aiProcessingVersion: v.optional(v.number()),
    analysisImageStorageId: v.optional(v.string()),
    dominantColors: v.optional(v.array(v.string())),
    detectedObjects: v.optional(v.any()),
    detectedFaces: v.optional(v.number()),
    locationName: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { photoId, ...updates } = args;
    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, val]) => val !== undefined),
    );
    if (Object.keys(cleanUpdates).length > 0) {
      await ctx.db.patch(photoId, cleanUpdates);
    }
    return null;
  },
});

export const getStats = query({
  args: { userId: v.id("users") },
  returns: v.object({
    totalPhotos: v.number(),
    favorites: v.number(),
    archived: v.number(),
    trashed: v.number(),
  }),
  handler: async (ctx, args) => {
    const allPhotos = await ctx.db
      .query("photos")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    return {
      totalPhotos: allPhotos.filter((p) => !p.isTrashed).length,
      favorites: allPhotos.filter((p) => p.isFavorite && !p.isTrashed).length,
      archived: allPhotos.filter((p) => p.isArchived && !p.isTrashed).length,
      trashed: allPhotos.filter((p) => p.isTrashed).length,
    };
  },
});
