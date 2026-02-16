import { internalMutation, internalQuery } from "../_generated/server";
import { v } from "convex/values";

const LEASE_MS = 2 * 60 * 1000; // 2 minutes
const DEFAULT_LIMIT = 5;

export const leasePendingJobs = internalMutation({
  args: { limit: v.optional(v.number()) },
  returns: v.array(v.id("aiProcessingQueue")),
  handler: async (ctx, args) => {
    const limit = Math.max(1, Math.min(args.limit ?? DEFAULT_LIMIT, 25));
    const now = Date.now();

    const pending = await ctx.db
      .query("aiProcessingQueue")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .take(limit * 3);

    const leaseable = pending
      .filter((j) => !j.lockedUntil || j.lockedUntil <= now)
      .slice(0, limit);

    for (const job of leaseable) {
      await ctx.db.patch(job._id, {
        status: "processing",
        step: "embedding",
        lockedUntil: now + LEASE_MS,
        error: undefined,
        providerMeta: undefined,
      });
    }

    return leaseable.map((j) => j._id);
  },
});

export const updateJob = internalMutation({
  args: {
    jobId: v.id("aiProcessingQueue"),
    status: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("processing"),
        v.literal("completed"),
        v.literal("failed"),
      ),
    ),
    step: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("embedding"),
        v.literal("caption"),
        v.literal("tags"),
        v.literal("done"),
      ),
    ),
    lockedUntil: v.optional(v.number()),
    error: v.optional(v.string()),
    providerMeta: v.optional(v.any()),
    processedAt: v.optional(v.number()),
    retryCount: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { jobId, ...updates } = args;
    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, val]) => val !== undefined),
    );
    if (Object.keys(cleanUpdates).length > 0) {
      await ctx.db.patch(jobId, cleanUpdates);
    }
    return null;
  },
});

export const loadJobAndPhoto = internalQuery({
  args: { jobId: v.id("aiProcessingQueue") },
  returns: v.union(
    v.object({
      job: v.any(),
      photo: v.union(v.any(), v.null()),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job) return null;
    const photo = await ctx.db.get(job.photoId);
    return { job, photo: photo ?? null };
  },
});

