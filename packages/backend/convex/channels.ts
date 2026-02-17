import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const create = mutation({
  args: {
    userId: v.id("users"),
    name: v.string(),
    description: v.optional(v.string()),
    visibility: v.union(
      v.literal("private"),
      v.literal("family"),
      v.literal("public"),
    ),
  },
  returns: v.id("channels"),
  handler: async (ctx, args) => {
    const now = Date.now();
    const inviteCode = Math.random().toString(36).slice(2, 10);

    const channelId = await ctx.db.insert("channels", {
      ownerId: args.userId,
      name: args.name,
      description: args.description,
      visibility: args.visibility,
      inviteCode,
      memberCount: 1,
      mediaCount: 0,
      createdAt: now,
      updatedAt: now,
    });

    // Add owner as member
    await ctx.db.insert("channelMembers", {
      channelId,
      userId: args.userId,
      role: "owner",
      joinedAt: now,
    });

    return channelId;
  },
});

export const listByUser = query({
  args: { userId: v.id("users") },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    const memberships = await ctx.db
      .query("channelMembers")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    const channels = await Promise.all(
      memberships.map(async (m) => {
        const channel = await ctx.db.get(m.channelId);
        return channel ? { ...channel, role: m.role } : null;
      }),
    );

    return channels.filter(Boolean);
  },
});

export const getById = query({
  args: { channelId: v.id("channels") },
  returns: v.union(v.any(), v.null()),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.channelId);
  },
});

export const joinByInvite = mutation({
  args: {
    userId: v.id("users"),
    inviteCode: v.string(),
  },
  returns: v.union(v.id("channels"), v.null()),
  handler: async (ctx, args) => {
    const channel = await ctx.db
      .query("channels")
      .withIndex("by_invite_code", (q) => q.eq("inviteCode", args.inviteCode))
      .unique();

    if (!channel) return null;

    // Check if already a member
    const existing = await ctx.db
      .query("channelMembers")
      .withIndex("by_channel_user", (q) =>
        q.eq("channelId", channel._id).eq("userId", args.userId),
      )
      .unique();

    if (existing) return channel._id;

    await ctx.db.insert("channelMembers", {
      channelId: channel._id,
      userId: args.userId,
      role: "viewer",
      joinedAt: Date.now(),
    });

    await ctx.db.patch(channel._id, {
      memberCount: channel.memberCount + 1,
      updatedAt: Date.now(),
    });

    return channel._id;
  },
});

export const shareMedia = mutation({
  args: {
    channelId: v.id("channels"),
    photoId: v.id("photos"),
    userId: v.id("users"),
    caption: v.optional(v.string()),
  },
  returns: v.id("channelMedia"),
  handler: async (ctx, args) => {
    const mediaId = await ctx.db.insert("channelMedia", {
      channelId: args.channelId,
      photoId: args.photoId,
      sharedBy: args.userId,
      caption: args.caption,
      sharedAt: Date.now(),
    });

    const channel = await ctx.db.get(args.channelId);
    if (channel) {
      await ctx.db.patch(args.channelId, {
        mediaCount: channel.mediaCount + 1,
        updatedAt: Date.now(),
      });
    }

    return mediaId;
  },
});

export const listMedia = query({
  args: {
    channelId: v.id("channels"),
    limit: v.optional(v.number()),
  },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;
    const items = await ctx.db
      .query("channelMedia")
      .withIndex("by_channel", (q) => q.eq("channelId", args.channelId))
      .order("desc")
      .take(limit);

    return items;
  },
});

export const getMembers = query({
  args: { channelId: v.id("channels") },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    const memberships = await ctx.db
      .query("channelMembers")
      .withIndex("by_channel", (q) => q.eq("channelId", args.channelId))
      .collect();

    const members = await Promise.all(
      memberships.map(async (m) => {
        const user = await ctx.db.get(m.userId);
        return user ? { ...user, role: m.role, joinedAt: m.joinedAt } : null;
      }),
    );

    return members.filter(Boolean);
  },
});
