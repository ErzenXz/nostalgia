import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const create = mutation({
  args: {
    mediaId: v.id("photos"),
    userId: v.id("users"),
    text: v.string(),
  },
  returns: v.id("comments"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("comments", {
      mediaId: args.mediaId,
      userId: args.userId,
      text: args.text,
      createdAt: Date.now(),
    });
  },
});

export const listByMedia = query({
  args: {
    mediaId: v.id("photos"),
    limit: v.optional(v.number()),
  },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;
    const comments = await ctx.db
      .query("comments")
      .withIndex("by_media", (q) => q.eq("mediaId", args.mediaId))
      .order("asc")
      .take(limit);

    // Hydrate user info
    const hydrated = await Promise.all(
      comments.map(async (c) => {
        const user = await ctx.db.get(c.userId);
        return {
          ...c,
          userName: user?.name ?? "Unknown",
          userAvatar: user?.avatarUrl,
        };
      }),
    );

    return hydrated;
  },
});

export const remove = mutation({
  args: {
    commentId: v.id("comments"),
    userId: v.id("users"),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const comment = await ctx.db.get(args.commentId);
    if (!comment || comment.userId !== args.userId) return false;
    await ctx.db.delete(args.commentId);
    return true;
  },
});

export const update = mutation({
  args: {
    commentId: v.id("comments"),
    userId: v.id("users"),
    text: v.string(),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const comment = await ctx.db.get(args.commentId);
    if (!comment || comment.userId !== args.userId) return false;
    await ctx.db.patch(args.commentId, {
      text: args.text,
      updatedAt: Date.now(),
    });
    return true;
  },
});
