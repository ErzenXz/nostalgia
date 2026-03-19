/* eslint-disable @typescript-eslint/no-explicit-any */

import { query } from "./_generated/server";
import { v } from "convex/values";

const SIX_HOURS_MS = 6 * 60 * 60 * 1000;

function buildMomentKey(photo: any) {
  const timestamp = photo.takenAt ?? photo.uploadedAt ?? photo._creationTime;
  const bucket = Math.floor(timestamp / SIX_HOURS_MS);
  const location = (photo.locationName ?? "unknown").toLowerCase();
  const scene = (photo.sceneType ?? "unknown").toLowerCase();
  return `${bucket}:${location}:${scene}`;
}

export const listByUser = query({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.number()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const photos = await ctx.db
      .query("photos")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(600);

    const grouped = new Map<string, any[]>();
    for (const photo of photos) {
      if (photo.isTrashed || photo.isArchived) continue;
      const key = buildMomentKey(photo);
      const existing = grouped.get(key) ?? [];
      existing.push(photo);
      grouped.set(key, existing);
    }

    return Array.from(grouped.entries())
      .map(([momentId, momentPhotos]) => {
        const sorted = [...momentPhotos].sort(
          (a, b) =>
            (a.takenAt ?? a.uploadedAt ?? a._creationTime) -
            (b.takenAt ?? b.uploadedAt ?? b._creationTime),
        );
        const cover = [...momentPhotos].sort((a, b) => {
          const aScore =
            (a.isFavorite ? 5 : 0) +
            (a.detectedFaces ?? 0) +
            ((a.aiTagsV2?.length ?? 0) > 0 ? 1 : 0);
          const bScore =
            (b.isFavorite ? 5 : 0) +
            (b.detectedFaces ?? 0) +
            ((b.aiTagsV2?.length ?? 0) > 0 ? 1 : 0);
          return bScore - aScore;
        })[0];

        return {
          momentId,
          title:
            cover?.titleShort ??
            cover?.captionShort ??
            cover?.locationName ??
            "Untitled moment",
          coverPhotoId: cover?._id ?? null,
          photoCount: momentPhotos.length,
          startAt:
            sorted[0]?.takenAt ??
            sorted[0]?.uploadedAt ??
            sorted[0]?._creationTime ??
            0,
          endAt:
            sorted[sorted.length - 1]?.takenAt ??
            sorted[sorted.length - 1]?.uploadedAt ??
            sorted[sorted.length - 1]?._creationTime ??
            0,
          locationName: cover?.locationName ?? null,
          sceneType: cover?.sceneType ?? null,
          peopleSummary: cover?.peopleSummary ?? null,
          photoIds: momentPhotos.map((photo) => photo._id),
        };
      })
      .sort((a, b) => b.startAt - a.startAt)
      .slice(0, Math.max(1, Math.min(args.limit ?? 50, 100)));
  },
});
