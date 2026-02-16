import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const listByUser = query({
  args: { userId: v.id("users") },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("memories")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(20);
  },
});

export const getToday = query({
  args: { userId: v.id("users") },
  returns: v.any(),
  handler: async (ctx, args) => {
    const now = new Date();
    const startOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    ).getTime();
    const endOfDay = startOfDay + 24 * 60 * 60 * 1000;

    return await ctx.db
      .query("memories")
      .withIndex("by_user_date", (q) =>
        q
          .eq("userId", args.userId)
          .gte("date", startOfDay)
          .lte("date", endOfDay),
      )
      .collect();
  },
});

export const markSeen = mutation({
  args: { memoryId: v.id("memories") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.memoryId, { isSeen: true });
    return null;
  },
});

export const create = mutation({
  args: {
    userId: v.id("users"),
    title: v.string(),
    description: v.optional(v.string()),
    type: v.union(
      v.literal("on_this_day"),
      v.literal("trip"),
      v.literal("people"),
      v.literal("theme"),
      v.literal("year_review"),
    ),
    photoIds: v.array(v.id("photos")),
    date: v.number(),
  },
  returns: v.id("memories"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("memories", {
      ...args,
      isSeen: false,
      createdAt: Date.now(),
    });
  },
});
