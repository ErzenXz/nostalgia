import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const REACTION_TYPES = v.union(
  v.literal("heart"),
  v.literal("fire"),
  v.literal("laugh"),
  v.literal("cry"),
  v.literal("wow"),
);

export const toggle = mutation({
  args: {
    mediaId: v.id("photos"),
    userId: v.id("users"),
    type: REACTION_TYPES,
  },
  returns: v.union(v.literal("added"), v.literal("removed")),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("reactions")
      .withIndex("by_media_user", (q) =>
        q.eq("mediaId", args.mediaId).eq("userId", args.userId),
      )
      .first();

    if (existing) {
      if (existing.type === args.type) {
        // Remove reaction
        await ctx.db.delete(existing._id);
        return "removed";
      } else {
        // Change reaction type
        await ctx.db.patch(existing._id, {
          type: args.type,
          createdAt: Date.now(),
        });
        return "added";
      }
    }

    await ctx.db.insert("reactions", {
      mediaId: args.mediaId,
      userId: args.userId,
      type: args.type,
      createdAt: Date.now(),
    });
    return "added";
  },
});

export const getByMedia = query({
  args: { mediaId: v.id("photos") },
  returns: v.any(),
  handler: async (ctx, args) => {
    const reactions = await ctx.db
      .query("reactions")
      .withIndex("by_media", (q) => q.eq("mediaId", args.mediaId))
      .collect();

    // Group by type
    const counts: Record<string, number> = {};
    for (const r of reactions) {
      counts[r.type] = (counts[r.type] ?? 0) + 1;
    }

    return {
      total: reactions.length,
      counts,
      reactions,
    };
  },
});

export const getUserReaction = query({
  args: {
    mediaId: v.id("photos"),
    userId: v.id("users"),
  },
  returns: v.union(v.any(), v.null()),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("reactions")
      .withIndex("by_media_user", (q) =>
        q.eq("mediaId", args.mediaId).eq("userId", args.userId),
      )
      .first();
  },
});
