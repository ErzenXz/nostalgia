"use node";

import { internalAction } from "../_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { internal } from "../_generated/api";
import { embedImageBytesClipV2 } from "./jina";
import { captionImageShort, generateTags } from "./openai";
import type { Id } from "../_generated/dataModel";

const LEASE_MS = 2 * 60 * 1000; // 2 minutes (must match worker_db lease)
const DEFAULT_LIMIT = 5;

function isRateLimitError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const anyErr = err as any;
  const status = anyErr.status ?? anyErr.statusCode;
  if (status === 429) return true;
  const msg = String(anyErr.message ?? "");
  return msg.includes("429") || msg.toLowerCase().includes("rate limit");
}

function backoffMs(retryCount: number): number {
  // Exponential backoff capped at 30 minutes.
  const base = 10_000;
  const ms = base * Math.pow(2, Math.min(10, retryCount));
  return Math.min(ms, 30 * 60 * 1000);
}

export const processPending = internalAction({
  args: { limit: v.optional(v.number()) },
  returns: v.object({
    processed: v.number(),
    succeeded: v.number(),
    failed: v.number(),
    deferred: v.number(),
  }),
  handler: async (
    ctx,
    args,
  ): Promise<{
    processed: number;
    succeeded: number;
    failed: number;
    deferred: number;
  }> => {
    const leasedIds: Id<"aiProcessingQueue">[] = await ctx.runMutation(
      internal.ai.worker_db.leasePendingJobs,
      {
        limit: args.limit ?? DEFAULT_LIMIT,
      },
    );

    let succeeded = 0;
    let failed = 0;
    let deferred = 0;

    for (const jobId of leasedIds) {
      const loaded = await ctx.runQuery(internal.ai.worker_db.loadJobAndPhoto, {
        jobId,
      });

      if (!loaded) continue;
      const { job, photo } = loaded as any;

      try {
        if (!photo) {
          throw new ConvexError({
            code: "NOT_FOUND",
            message: "Photo not found for AI processing",
          });
        }
        if (!photo.analysisImageStorageId) {
          throw new ConvexError({
            code: "BAD_REQUEST",
            message: "analysis thumbnail missing",
          });
        }

        const storageId = photo.analysisImageStorageId as any;
        const blob = await ctx.storage.get(storageId);
        if (!blob) {
          throw new ConvexError({
            code: "NOT_FOUND",
            message: "analysis thumbnail not found in storage",
          });
        }

        const imageUrl = await ctx.storage.getUrl(storageId);
        if (!imageUrl) {
          throw new ConvexError({
            code: "NOT_FOUND",
            message: "analysis thumbnail URL not available",
          });
        }

        const bytes = new Uint8Array(await blob.arrayBuffer());

        // 1) Embedding
        const embedding = await embedImageBytesClipV2(bytes);
        await ctx.runMutation(internal.ai.worker_db.updateJob, {
          jobId,
          step: "caption",
          lockedUntil: Date.now() + LEASE_MS,
          providerMeta: {
            jina: { model: "jina-clip-v2", dim: embedding.length },
          },
        });

        // 2) Caption
        const hintText = [
          `fileName=${photo.fileName}`,
          `takenAt=${photo.takenAt ?? photo.uploadedAt}`,
          photo.locationName ? `location=${photo.locationName}` : null,
          photo.cameraModel ? `camera=${photo.cameraModel}` : null,
        ]
          .filter(Boolean)
          .join(" ");

        const captionShort = await captionImageShort({ imageUrl, hintText });
        await ctx.runMutation(internal.ai.worker_db.updateJob, {
          jobId,
          step: "tags",
          lockedUntil: Date.now() + LEASE_MS,
        });

        // 3) Tags
        const tags = await generateTags({ captionShort, hintText });

        // Persist analysis on the photo.
        await ctx.runMutation(internal.photos.updateAiAnalysis, {
          photoId: photo._id,
          analysisImageStorageId: photo.analysisImageStorageId,
          embeddingClipV2: embedding,
          embeddingClipV2Dim: embedding.length,
          embeddingClipV2Model: "jina-clip-v2",
          captionShort,
          captionShortV: 1,
          aiTagsV2: tags,
          aiProcessedAt: Date.now(),
          aiProcessingVersion: 1,
        });

        await ctx.runMutation(internal.ai.worker_db.updateJob, {
          jobId,
          status: "completed",
          step: "done",
          lockedUntil: undefined,
          processedAt: Date.now(),
          error: undefined,
        });

        succeeded += 1;
      } catch (err) {
        const now = Date.now();
        const currentRetry = (job?.retryCount as number | undefined) ?? 0;
        const rateLimited = isRateLimitError(err);

        if (rateLimited) {
          deferred += 1;
          await ctx.runMutation(internal.ai.worker_db.updateJob, {
            jobId,
            status: "pending",
            step: "pending",
            lockedUntil: now + backoffMs(currentRetry),
            error: "rate_limited",
            retryCount: currentRetry + 1,
          });
        } else {
          failed += 1;
          await ctx.runMutation(internal.ai.worker_db.updateJob, {
            jobId,
            status: "failed",
            lockedUntil: undefined,
            processedAt: now,
            error: err instanceof Error ? err.message : "AI processing failed",
            retryCount: currentRetry + 1,
          });
        }
      }
    }

    return { processed: leasedIds.length, succeeded, failed, deferred };
  },
});
