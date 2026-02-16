import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";

export const list = query({
  args: { userId: v.id("users") },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("albums")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();
  },
});

export const getById = query({
  args: { albumId: v.id("albums") },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.albumId);
  },
});

export const getByShareToken = query({
  args: { shareToken: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("albums")
      .withIndex("by_share_token", (q) => q.eq("shareToken", args.shareToken))
      .unique();
  },
});

export const getPhotos = query({
  args: { albumId: v.id("albums") },
  returns: v.any(),
  handler: async (ctx, args) => {
    const albumPhotos = await ctx.db
      .query("albumPhotos")
      .withIndex("by_album", (q) => q.eq("albumId", args.albumId))
      .collect();

    const photos = await Promise.all(
      albumPhotos.map(async (ap) => {
        const photo = await ctx.db.get(ap.photoId);
        return photo ? { ...photo, order: ap.order } : null;
      }),
    );

    return photos.filter(Boolean).sort((a: any, b: any) => a.order - b.order);
  },
});

export const create = mutation({
  args: {
    userId: v.id("users"),
    name: v.string(),
    description: v.optional(v.string()),
  },
  returns: v.id("albums"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("albums", {
      userId: args.userId,
      name: args.name,
      description: args.description,
      isShared: false,
      photoCount: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    albumId: v.id("albums"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    coverPhotoId: v.optional(v.id("photos")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { albumId, ...updates } = args;
    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, val]) => val !== undefined),
    );
    if (Object.keys(cleanUpdates).length > 0) {
      await ctx.db.patch(albumId, {
        ...cleanUpdates,
        updatedAt: Date.now(),
      });
    }
    return null;
  },
});

export const addPhotos = mutation({
  args: {
    albumId: v.id("albums"),
    photoIds: v.array(v.id("photos")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const album = await ctx.db.get(args.albumId);
    if (!album) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Album not found",
      });
    }

    let currentCount = album.photoCount;
    for (const photoId of args.photoIds) {
      // Check if already in album
      const existing = await ctx.db
        .query("albumPhotos")
        .withIndex("by_album", (q) => q.eq("albumId", args.albumId))
        .filter((q) => q.eq(q.field("photoId"), photoId))
        .unique();

      if (!existing) {
        await ctx.db.insert("albumPhotos", {
          albumId: args.albumId,
          photoId,
          addedAt: Date.now(),
          order: currentCount,
        });
        currentCount++;
      }
    }

    // Set cover photo if not set
    const coverUpdate: Record<string, unknown> = {
      photoCount: currentCount,
      updatedAt: Date.now(),
    };
    if (!album.coverPhotoId && args.photoIds.length > 0) {
      coverUpdate.coverPhotoId = args.photoIds[0];
    }

    await ctx.db.patch(args.albumId, coverUpdate);
    return null;
  },
});

export const removePhoto = mutation({
  args: {
    albumId: v.id("albums"),
    photoId: v.id("photos"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const albumPhoto = await ctx.db
      .query("albumPhotos")
      .withIndex("by_album", (q) => q.eq("albumId", args.albumId))
      .filter((q) => q.eq(q.field("photoId"), args.photoId))
      .unique();

    if (albumPhoto) {
      await ctx.db.delete(albumPhoto._id);
      const album = await ctx.db.get(args.albumId);
      if (album) {
        await ctx.db.patch(args.albumId, {
          photoCount: Math.max(0, album.photoCount - 1),
          updatedAt: Date.now(),
        });
      }
    }
    return null;
  },
});

export const shareAlbum = mutation({
  args: { albumId: v.id("albums") },
  returns: v.string(),
  handler: async (ctx, args) => {
    const token = crypto.randomUUID();
    await ctx.db.patch(args.albumId, {
      isShared: true,
      shareToken: token,
      updatedAt: Date.now(),
    });
    return token;
  },
});

export const unshareAlbum = mutation({
  args: { albumId: v.id("albums") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.albumId, {
      isShared: false,
      shareToken: undefined,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const deleteAlbum = mutation({
  args: { albumId: v.id("albums") },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Remove all album-photo associations
    const albumPhotos = await ctx.db
      .query("albumPhotos")
      .withIndex("by_album", (q) => q.eq("albumId", args.albumId))
      .collect();
    for (const ap of albumPhotos) {
      await ctx.db.delete(ap._id);
    }

    // Remove shared access
    const sharedAccess = await ctx.db
      .query("sharedAlbumAccess")
      .withIndex("by_album", (q) => q.eq("albumId", args.albumId))
      .collect();
    for (const sa of sharedAccess) {
      await ctx.db.delete(sa._id);
    }

    await ctx.db.delete(args.albumId);
    return null;
  },
});
