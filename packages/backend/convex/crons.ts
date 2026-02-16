import { cronJobs } from "convex/server";
import { internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";

// ─── Cron Handler: Trash Cleanup ─────────────────────────
// Permanently delete photos that have been in the trash for 30+ days
export const cleanupTrashedPhotos = internalMutation({
  args: {},
  returns: undefined,
  handler: async (ctx) => {
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

    const trashedPhotos = await ctx.db
      .query("photos")
      .filter((q) =>
        q.and(
          q.eq(q.field("isTrashed"), true),
          q.lt(q.field("trashedAt"), thirtyDaysAgo),
        ),
      )
      .take(100); // Process in batches to avoid timeouts

    for (const photo of trashedPhotos) {
      // Remove from albums
      const albumPhotos = await ctx.db
        .query("albumPhotos")
        .withIndex("by_photo", (q) => q.eq("photoId", photo._id))
        .collect();
      for (const ap of albumPhotos) {
        await ctx.db.delete(ap._id);
      }

      // Remove people associations
      const photoPeople = await ctx.db
        .query("photoPeople")
        .withIndex("by_photo", (q) => q.eq("photoId", photo._id))
        .collect();
      for (const pp of photoPeople) {
        await ctx.db.delete(pp._id);
      }

      // Update storage usage
      const user = await ctx.db.get(photo.userId);
      if (user) {
        await ctx.db.patch(photo.userId, {
          usedStorageBytes: Math.max(
            0,
            user.usedStorageBytes - photo.sizeBytes,
          ),
        });
      }

      // Delete the photo record (MinIO object cleanup would be handled separately)
      await ctx.db.delete(photo._id);
    }
  },
});

// ─── Cron Handler: On This Day Memories ──────────────────
// Generate "On This Day" memories for all users
export const generateOnThisDayMemories = internalMutation({
  args: {},
  returns: undefined,
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    const now = new Date();
    const todayMonth = now.getMonth();
    const todayDate = now.getDate();

    for (const user of users) {
      // Look for photos taken on this day in previous years
      const allPhotos = await ctx.db
        .query("photos")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .collect();

      const onThisDayPhotos = allPhotos.filter((photo) => {
        if (!photo.takenAt || photo.isTrashed) return false;
        const photoDate = new Date(photo.takenAt);
        return (
          photoDate.getMonth() === todayMonth &&
          photoDate.getDate() === todayDate &&
          photoDate.getFullYear() < now.getFullYear()
        );
      });

      if (onThisDayPhotos.length > 0) {
        // Group by year
        const years = [
          ...new Set(
            onThisDayPhotos.map((p) => new Date(p.takenAt!).getFullYear()),
          ),
        ].sort();
        const yearStr =
          years.length === 1
            ? `${years[0]}`
            : `${years[0]} - ${years[years.length - 1]}`;

        await ctx.db.insert("memories", {
          userId: user._id,
          title: `On This Day (${yearStr})`,
          description: `${onThisDayPhotos.length} photo${onThisDayPhotos.length > 1 ? "s" : ""} from ${todayMonth + 1}/${todayDate}`,
          type: "on_this_day",
          photoIds: onThisDayPhotos.slice(0, 20).map((p) => p._id),
          date: Date.now(),
          isSeen: false,
          createdAt: Date.now(),
        });
      }
    }
  },
});

// ─── Cron Handler: Retry Failed AI Processing ────────────
export const retryFailedProcessing = internalMutation({
  args: {},
  returns: undefined,
  handler: async (ctx) => {
    const failedJobs = await ctx.db
      .query("aiProcessingQueue")
      .withIndex("by_status", (q) => q.eq("status", "failed"))
      .take(50);

    for (const job of failedJobs) {
      if (job.retryCount < 3) {
        await ctx.db.patch(job._id, {
          status: "pending",
          step: "pending",
          lockedUntil: undefined,
          retryCount: job.retryCount + 1,
          error: undefined,
        });
      }
    }
  },
});

// ─── Cron Schedule ───────────────────────────────────────

const crons = cronJobs();

// Permanently delete photos in trash for 30+ days (every 6 hours)
crons.interval(
  "cleanup trashed photos",
  { hours: 6 },
  internal.crons.cleanupTrashedPhotos,
);

// Generate "On This Day" memories daily at 6am UTC
crons.daily(
  "generate on-this-day memories",
  { hourUTC: 6, minuteUTC: 0 },
  internal.crons.generateOnThisDayMemories,
);

// Retry failed AI processing jobs every hour
crons.interval(
  "retry failed ai processing",
  { hours: 1 },
  internal.crons.retryFailedProcessing,
);

// Process pending AI jobs frequently (embeddings + captions + tags).
crons.interval(
  "process ai queue",
  { minutes: 1 },
  internal.ai.worker.processPending,
  { limit: 5 },
);

export default crons;
