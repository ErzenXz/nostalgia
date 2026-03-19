import { internalMutation, internalQuery } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";

const LEASE_MS = 2 * 60 * 1000; // 2 minutes
const DEFAULT_LIMIT = 15;

export const leasePendingJobs = internalMutation({
  args: { limit: v.optional(v.number()) },
  returns: v.array(v.id("aiProcessingQueue")),
  handler: async (ctx, args) => {
    const limit = Math.max(1, Math.min(args.limit ?? DEFAULT_LIMIT, 30));
    const now = Date.now();

    const candidateIds = new Set<string>();
    const leaseable: { _id: any; photoId: any; userId: any; [k: string]: any }[] = [];

    // ── 1) Normal pending jobs ────────────────────────────────────
    const pendingJobs = await ctx.db
      .query("aiProcessingQueue")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .take(limit * 5);

    for (const j of pendingJobs) {
      if (leaseable.length >= limit) break;
      // Respect backoff: skip if still within lockedUntil window
      if (j.lockedUntil && j.lockedUntil > now) continue;
      if (candidateIds.has(j._id)) continue;
      candidateIds.add(j._id);
      leaseable.push(j);
    }

    // ── 2) Crash recovery: pick up expired "processing" jobs ──────
    // If a worker crashed mid-job, the job stays stuck as "processing"
    // with an expired lockedUntil. Recover these so they get retried.
    if (leaseable.length < limit) {
      const stuckJobs = await ctx.db
        .query("aiProcessingQueue")
        .withIndex("by_status", (q) => q.eq("status", "processing"))
        .filter((q) => q.lt(q.field("lockedUntil"), now))
        .take((limit - leaseable.length) * 3);

      for (const j of stuckJobs) {
        if (leaseable.length >= limit) break;
        if (candidateIds.has(j._id)) continue;
        candidateIds.add(j._id);
        leaseable.push(j);
      }
    }

    // ── Acquire leases ────────────────────────────────────────────
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
    // Only decrement on terminal outcomes — not on defer/backoff back to pending
    if (args.status === "completed" || args.status === "failed") {
      const job = await ctx.db.get(jobId);
      if (job) {
        await ctx.runMutation(internal.users.decrementPendingAiCount, {
          userId: job.userId,
        });
      }
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
