import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: { userId: v.id("users") },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("people")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();
  },
});

export const rename = mutation({
  args: {
    personId: v.id("people"),
    name: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.personId, { name: args.name });
    return null;
  },
});

export const getPhotosByPerson = query({
  args: { personId: v.id("people") },
  returns: v.any(),
  handler: async (ctx, args) => {
    const photoPeople = await ctx.db
      .query("photoPeople")
      .withIndex("by_person", (q) => q.eq("personId", args.personId))
      .collect();

    const photos = await Promise.all(
      photoPeople.map(async (pp) => {
        return await ctx.db.get(pp.photoId);
      }),
    );

    return photos.filter(Boolean);
  },
});
