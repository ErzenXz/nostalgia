"use node";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { internalAction } from "../_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { internal } from "../_generated/api";
import { embedImageBytesClipV2, JINA_CLIP_MODEL } from "./jina";
import { captionImageShort, generateTags } from "./openai";
import type { Id } from "../_generated/dataModel";

const LEASE_MS = 2 * 60 * 1000; // 2 minutes (must match worker_db lease)
const DEFAULT_LIMIT = 15;

// A photo that has been awaiting a thumbnail for over 24 hours is considered
// permanently stuck — mark it failed so the queue drains cleanly.
const MAX_THUMBNAIL_WAIT_MS = 24 * 60 * 60 * 1000;

// Retry backoff for transient errors (rate limits, network blips)
function isRateLimitError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const anyErr = err as any;
  const status = anyErr.status ?? anyErr.statusCode;
  if (status === 429) return true;
  const msg = String(anyErr.message ?? "");
  return msg.includes("429") || msg.toLowerCase().includes("rate limit");
}

function isTransientError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const anyErr = err as any;
  const status = anyErr.status ?? anyErr.statusCode;
  if (
    typeof status === "number" &&
    [408, 409, 425, 429, 500, 502, 503, 504].includes(status)
  ) {
    return true;
  }
  const msg = String(anyErr.message ?? "").toLowerCase();
  return (
    msg.includes("rate limit") ||
    msg.includes("timed out") ||
    msg.includes("timeout") ||
    msg.includes("temporarily unavailable") ||
    msg.includes("network") ||
    msg.includes("fetch failed")
  );
}

function backoffMs(retryCount: number): number {
  const base = 10_000;
  const ms = base * Math.pow(2, Math.min(10, retryCount));
  return Math.min(ms, 30 * 60 * 1000);
}

function deriveFallbackCaption(photo: any) {
  const parts = [
    photo.locationName
      ? `Photo in ${photo.locationName}`
      : "Photo from your library",
    photo.fileName ? `(${photo.fileName})` : null,
  ].filter(Boolean);
  return parts.join(" ");
}

function deriveFallbackTags(photo: any, caption: string) {
  const seed = [
    caption,
    photo.locationName,
    photo.fileName,
    photo.mimeType?.startsWith("video/") ? "video" : "photo",
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return Array.from(
    new Set(
      seed
        .split(/[^a-z0-9]+/g)
        .map((token) => token.trim())
        .filter((token) => token.length >= 3 && token.length <= 24),
    ),
  ).slice(0, 16);
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
      { limit: args.limit ?? DEFAULT_LIMIT },
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
      const now = Date.now();

      try {
        if (!photo) {
          throw new ConvexError({
            code: "NOT_FOUND",
            message: "Photo not found for AI processing",
          });
        }

        // ── Missing analysis thumbnail: defer or abandon ──────────
        // The analysis thumbnail is uploaded separately by the client *after*
        // the photo record is created. It's perfectly normal for it to be absent
        // right after upload. Defer with short backoff instead of hard-failing.
        if (!photo.analysisImageStorageId) {
          const uploadAgeMs = now - (photo.uploadedAt ?? 0);
          if (uploadAgeMs > MAX_THUMBNAIL_WAIT_MS) {
            // Thumbnail never arrived — permanently abandon this job so the
            // pendingAiCount counter drains correctly.
            failed += 1;
            await ctx.runMutation(internal.ai.worker_db.updateJob, {
              jobId,
              status: "failed",
              lockedUntil: undefined,
              processedAt: now,
              error: "thumbnail_never_uploaded",
              retryCount: (job?.retryCount ?? 0) + 1,
            });
          } else {
            // Still within the wait window — defer for 5 minutes
            deferred += 1;
            await ctx.runMutation(internal.ai.worker_db.updateJob, {
              jobId,
              status: "pending",
              step: "pending",
              lockedUntil: now + 5 * 60 * 1000,
              error: "awaiting_thumbnail",
            });
          }
          continue;
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

        // ── Step 1: Embedding ─────────────────────────────────────
        let embedding: number[] | null = null;
        try {
          embedding = await embedImageBytesClipV2(bytes);
        } catch (error) {
          if (isTransientError(error)) {
            throw error;
          }
        }
        await ctx.runMutation(internal.ai.worker_db.updateJob, {
          jobId,
          step: "caption",
          lockedUntil: now + LEASE_MS,
          providerMeta: {
            jina: embedding
              ? { model: JINA_CLIP_MODEL, dim: embedding.length }
              : undefined,
          },
        });

        // ── Step 2: Caption ───────────────────────────────────────
        const hintText = [
          `fileName=${photo.fileName}`,
          `takenAt=${photo.takenAt ?? photo.uploadedAt}`,
          photo.locationName ? `location=${photo.locationName}` : null,
          photo.cameraModel ? `camera=${photo.cameraModel}` : null,
        ]
          .filter(Boolean)
          .join(" ");

        let captionShort = deriveFallbackCaption(photo);
        try {
          captionShort = await captionImageShort({ imageUrl, hintText });
        } catch (error) {
          if (isTransientError(error)) {
            throw error;
          }
        }
        await ctx.runMutation(internal.ai.worker_db.updateJob, {
          jobId,
          step: "tags",
          lockedUntil: Date.now() + LEASE_MS,
        });

        // ── Step 3: Tags ──────────────────────────────────────────
        let tags = deriveFallbackTags(photo, captionShort);
        try {
          tags = await generateTags({ captionShort, hintText });
        } catch (error) {
          if (isTransientError(error)) {
            throw error;
          }
        }

        // ── Persist results ───────────────────────────────────────
        await ctx.runMutation(internal.photos.updateAiAnalysis, {
          photoId: photo._id,
          analysisImageStorageId: photo.analysisImageStorageId,
          description: captionShort,
          embeddingClipV2: embedding ?? undefined,
          embeddingClipV2Dim: embedding?.length,
          embeddingClipV2Model: embedding ? JINA_CLIP_MODEL : undefined,
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
        const currentRetry = (job?.retryCount as number | undefined) ?? 0;
        const rateLimited = isRateLimitError(err);
        const transientError = isTransientError(err);

        if (rateLimited || transientError) {
          // Transient rate limit — back off and retry later
          deferred += 1;
          await ctx.runMutation(internal.ai.worker_db.updateJob, {
            jobId,
            status: "pending",
            step: "pending",
            lockedUntil: now + backoffMs(currentRetry),
            error: transientError ? "transient_ai_error" : "rate_limited",
            retryCount: currentRetry + 1,
          });
        } else {
          // Hard failure — mark failed, decrement pendingAiCount via updateJob
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
