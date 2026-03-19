import { cronJobs } from "convex/server";
import { internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";

// Maximum number of times we'll retry a failed AI job before giving up.
const MAX_AI_RETRIES = 5;

// ─── Cron Handler: Trash Cleanup ─────────────────────────────────
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
      .take(100);

    for (const photo of trashedPhotos) {
      const albumPhotos = await ctx.db
        .query("albumPhotos")
        .withIndex("by_photo", (q) => q.eq("photoId", photo._id))
        .collect();
      for (const ap of albumPhotos) await ctx.db.delete(ap._id);

      const photoPeople = await ctx.db
        .query("photoPeople")
        .withIndex("by_photo", (q) => q.eq("photoId", photo._id))
        .collect();
      for (const pp of photoPeople) await ctx.db.delete(pp._id);

      const user = await ctx.db.get(photo.userId);
      if (user) {
        await ctx.db.patch(photo.userId, {
          usedStorageBytes: Math.max(0, user.usedStorageBytes - photo.sizeBytes),
        });
      }

      await ctx.db.delete(photo._id);
    }
  },
});

// ─── Cron Handler: On This Day Memories ──────────────────────────
export const generateOnThisDayMemories = internalMutation({
  args: {},
  returns: undefined,
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    const now = new Date();
    const todayMonth = now.getMonth();
    const todayDate = now.getDate();

    for (const user of users) {
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
        const years = [
          ...new Set(
            onThisDayPhotos.map((p) => new Date(p.takenAt!).getFullYear()),
          ),
        ].sort();
        const yearStr =
          years.length === 1
            ? `${years[0]}`
            : `${years[0]} – ${years[years.length - 1]}`;

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

// ─── Cron Handler: Retry Failed AI Jobs ──────────────────────────
//
// BUG FIX: The previous version reset failed → pending without calling
// incrementPendingAiCount, causing the progress counter to show "done"
// while jobs were still being retried.
//
// Now:
//  - Re-queued jobs call incrementPendingAiCount so the counter stays accurate.
//  - Jobs exceeding MAX_AI_RETRIES are deleted to clean up the queue.
//    (decrementPendingAiCount was already called when they first failed, so
//    we do NOT call it again here.)
export const retryFailedProcessing = internalMutation({
  args: {},
  returns: undefined,
  handler: async (ctx) => {
    const failedJobs = await ctx.db
      .query("aiProcessingQueue")
      .withIndex("by_status", (q) => q.eq("status", "failed"))
      .take(50);

    for (const job of failedJobs) {
      if (job.retryCount < MAX_AI_RETRIES) {
        // Reset to pending for another attempt
        await ctx.db.patch(job._id, {
          status: "pending",
          step: "pending",
          lockedUntil: undefined,
          retryCount: job.retryCount + 1,
          error: undefined,
        });
        // Re-increment the counter: decrementPendingAiCount was called when
        // this job first transitioned to "failed", so we need to restore it.
        await ctx.runMutation(internal.users.incrementPendingAiCount, {
          userId: job.userId,
        });
      } else {
        // Permanently abandoned — delete the record so the queue stays lean.
        // NOTE: decrementPendingAiCount was already called the last time this
        // job was marked "failed", so we must NOT call it again.
        await ctx.db.delete(job._id);
      }
    }
  },
});

// ─── Cron Handler: Recover Stuck Processing Jobs ─────────────────
//
// If a worker action crashes (Convex action timeout, deployment restart, etc.)
// a job can be left in "processing" status with an expired lockedUntil.
// leasePendingJobs already recovers these at lease-time, but this cron is an
// extra safety net that resets them so they're visible to all workers.
export const recoverStuckProcessingJobs = internalMutation({
  args: {},
  returns: undefined,
  handler: async (ctx) => {
    const now = Date.now();

    const stuckJobs = await ctx.db
      .query("aiProcessingQueue")
      .withIndex("by_status", (q) => q.eq("status", "processing"))
      .filter((q) => q.lt(q.field("lockedUntil"), now))
      .take(50);

    for (const job of stuckJobs) {
      await ctx.db.patch(job._id, {
        status: "pending",
        step: "pending",
        lockedUntil: undefined,
        // Increment retry so eventual max-retry logic still applies
        retryCount: job.retryCount + 1,
        error: "recovered_from_stuck_processing",
      });
      // No pendingAiCount change: this job was already counted as pending when
      // it was first created; we're just rescuing it back to the pending pool.
    }
  },
});

// ─── Cron Schedule ───────────────────────────────────────────────

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

// Rescue jobs stuck in "processing" state every 10 minutes
crons.interval(
  "recover stuck ai processing jobs",
  { minutes: 10 },
  internal.crons.recoverStuckProcessingJobs,
);

// Process pending AI jobs frequently (embeddings + captions + tags)
crons.interval(
  "process ai queue",
  { minutes: 1 },
  internal.ai.worker.processPending,
  {},
);

export default crons;
