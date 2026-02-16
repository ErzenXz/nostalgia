"use node";

import { action } from "../_generated/server";
import { v } from "convex/values";
import { api } from "../_generated/api";
import { getAuthedUserId } from "./auth_util";
import { embedTextClipV2 } from "./jina";

export const embedText = action({
  args: { text: v.string() },
  returns: v.array(v.float64()),
  handler: async (_ctx, args): Promise<number[]> => {
    return await embedTextClipV2(args.text);
  },
});

export const semanticSearch = action({
  args: {
    query: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.any(),
  handler: async (ctx, args): Promise<any[]> => {
    const userId = await getAuthedUserId(ctx);
    const limit = Math.max(1, Math.min(args.limit ?? 20, 50));

    const vector = await embedTextClipV2(args.query);
    const results: any[] = await ctx.vectorSearch("photos", "by_embedding_clip_v2", {
      vector,
      limit,
      filter: (q) => q.eq("userId", userId),
    });

    // Hydrate photo docs (best-effort).
    const photos: any[] = await Promise.all(
      results.map((r: any) =>
        ctx.runQuery(api.photos.getById, { photoId: r._id }).catch(() => null),
      ),
    );

    return results.map((r: any, i: number) => ({
      ...r,
      photo: photos[i],
    }));
  },
});

export const similarToPhoto = action({
  args: {
    photoId: v.id("photos"),
    limit: v.optional(v.number()),
  },
  returns: v.any(),
  handler: async (ctx, args): Promise<any[]> => {
    const userId = await getAuthedUserId(ctx);
    const limit = Math.max(1, Math.min(args.limit ?? 20, 50));

    const photo: any = await ctx.runQuery(api.photos.getById, {
      photoId: args.photoId,
    });

    if (!photo || photo.userId !== userId || !photo.embeddingClipV2) {
      return [];
    }

    const results = await ctx.vectorSearch("photos", "by_embedding_clip_v2", {
      vector: photo.embeddingClipV2,
      limit,
      filter: (q) => q.eq("userId", userId),
    });

    const photos: any[] = await Promise.all(
      results.map((r: any) =>
        ctx.runQuery(api.photos.getById, { photoId: r._id }).catch(() => null),
      ),
    );

    return results.map((r: any, i: number) => ({
      ...r,
      photo: photos[i],
    }));
  },
});
