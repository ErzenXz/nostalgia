"use node";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { internalAction } from "../_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { internal } from "../_generated/api";
import { detectFaceEmbeddings } from "./faces";
import { embedImageBytesClipV2, JINA_CLIP_MODEL } from "./jina";
import { generatePhotoMetadata } from "./openai";
import type { Id } from "../_generated/dataModel";

const LEASE_MS = 2 * 60 * 1000; // 2 minutes (must match worker_db lease)
const DEFAULT_LIMIT = 15;
const AI_PROCESSING_VERSION = 2;

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

function deriveFallbackTitle(photo: any) {
  if (photo.locationName) return `Moment in ${photo.locationName}`;
  return photo.mimeType?.startsWith("video/")
    ? "Library video moment"
    : "Library photo moment";
}

function deriveFallbackCaption(photo: any) {
  const parts = [
    photo.locationName
      ? `A moment in ${photo.locationName}`
      : "A moment from your library",
    photo.fileName ? `from ${photo.fileName}` : null,
  ].filter(Boolean);
  return parts.join(" ");
}

function deriveFallbackDescription(
  photo: any,
  caption: string,
  peopleContext: {
    totalFaces: number;
    namedPeople: string[];
    unnamedMatchedCount: number;
  },
) {
  const details = [
    caption,
    peopleContext.namedPeople.length > 0
      ? `Recognized people include ${peopleContext.namedPeople.join(", ")}.`
      : peopleContext.totalFaces > 0
        ? `${peopleContext.totalFaces} face${peopleContext.totalFaces === 1 ? "" : "s"} detected in the frame.`
        : null,
    photo.locationName
      ? `The image is associated with ${photo.locationName}.`
      : null,
  ].filter(Boolean);
  return details.join(" ");
}

function deriveFallbackPeopleSummary(peopleContext: {
  totalFaces: number;
  namedPeople: string[];
  unnamedMatchedCount: number;
}) {
  if (peopleContext.namedPeople.length > 0) {
    return `People seen: ${peopleContext.namedPeople.join(", ")}.`;
  }
  if (peopleContext.totalFaces > 0) {
    return `${peopleContext.totalFaces} face${
      peopleContext.totalFaces === 1 ? "" : "s"
    } detected.`;
  }
  return "";
}

function deriveFallbackHashtags(
  photo: any,
  caption: string,
  peopleContext: {
    totalFaces: number;
    namedPeople: string[];
  },
) {
  const seed = [
    caption,
    photo.locationName,
    photo.fileName,
    ...peopleContext.namedPeople,
    peopleContext.totalFaces > 0 ? "people" : null,
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
  ).slice(0, 5);
}

function deriveFallbackTags(
  photo: any,
  caption: string,
  peopleContext: {
    totalFaces: number;
    namedPeople: string[];
  },
) {
  const seed = [
    caption,
    photo.locationName,
    photo.fileName,
    ...peopleContext.namedPeople,
    peopleContext.totalFaces > 0 ? "people" : null,
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

function deriveFallbackSceneType(photo: any) {
  if (photo.locationName) return "place moment";
  return photo.mimeType?.startsWith("video/") ? "video scene" : "photo scene";
}

function deriveFallbackMood(peopleContext: {
  totalFaces: number;
  namedPeople: string[];
}) {
  if (peopleContext.namedPeople.length > 0 || peopleContext.totalFaces >= 2) {
    return "social";
  }
  return "quiet";
}

function deriveFallbackIndoorOutdoor() {
  return "unknown" as const;
}

function deriveFallbackActivities(
  photo: any,
  peopleContext: { totalFaces: number },
  tags: string[],
) {
  const activities = new Set<string>();
  if (peopleContext.totalFaces > 0) activities.add("people");
  if (photo.locationName) activities.add("travel");
  for (const tag of tags) {
    if (activities.size >= 8) break;
    activities.add(tag);
  }
  return Array.from(activities).slice(0, 8);
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

        const hintParts = [
          `fileName=${photo.fileName}`,
          `takenAt=${photo.takenAt ?? photo.uploadedAt}`,
          photo.locationName ? `location=${photo.locationName}` : null,
          photo.cameraModel ? `camera=${photo.cameraModel}` : null,
        ];

        let detectedFaces: { embedding: number[]; confidence: number }[] = [];
        try {
          detectedFaces = await detectFaceEmbeddings(bytes);
        } catch (error) {
          if (isTransientError(error)) {
            throw error;
          }
        }

        const peopleContext = await ctx.runQuery(
          internal.people.previewFaceMatches,
          {
            userId: photo.userId,
            faces: detectedFaces,
          },
        );
        await ctx.runMutation(internal.ai.worker_db.updateJob, {
          jobId,
          step: "tags",
          lockedUntil: Date.now() + LEASE_MS,
        });
        const hintText = [
          ...hintParts,
          peopleContext.totalFaces > 0
            ? `faceCount=${peopleContext.totalFaces}`
            : null,
          peopleContext.namedPeople.length > 0
            ? `namedPeople=${peopleContext.namedPeople.join(", ")}`
            : null,
          peopleContext.unnamedMatchedCount > 0
            ? `unnamedMatchedPeople=${peopleContext.unnamedMatchedCount}`
            : null,
        ]
          .filter(Boolean)
          .join(" ");

        // ── Step 2: Metadata ──────────────────────────────────────
        let titleShort = deriveFallbackTitle(photo);
        let captionShort = deriveFallbackCaption(photo);
        let description = deriveFallbackDescription(
          photo,
          captionShort,
          peopleContext,
        );
        let peopleSummary = deriveFallbackPeopleSummary(peopleContext);
        let visibleText = "";
        let sceneType = deriveFallbackSceneType(photo);
        let mood = deriveFallbackMood(peopleContext);
        let indoorOutdoor: "indoor" | "outdoor" | "mixed" | "unknown" =
          deriveFallbackIndoorOutdoor();
        let hashtags = deriveFallbackHashtags(
          photo,
          captionShort,
          peopleContext,
        );
        let tags = deriveFallbackTags(photo, captionShort, peopleContext);
        let activityLabels = deriveFallbackActivities(
          photo,
          peopleContext,
          tags,
        );

        try {
          const metadata = await generatePhotoMetadata({ imageUrl, hintText });
          titleShort = metadata.titleShort;
          captionShort = metadata.captionShort;
          description = metadata.description;
          peopleSummary = metadata.peopleSummary;
          visibleText = metadata.visibleText;
          sceneType = metadata.sceneType;
          mood = metadata.mood;
          indoorOutdoor = metadata.indoorOutdoor;
          activityLabels = metadata.activityLabels;
          hashtags = metadata.hashtags;
          tags = metadata.aiTagsV2;
        } catch (error) {
          if (isTransientError(error)) {
            throw error;
          }
        }

        // ── Persist results ───────────────────────────────────────
        await ctx.runMutation(internal.photos.updateAiAnalysis, {
          photoId: photo._id,
          analysisImageStorageId: photo.analysisImageStorageId,
          titleShort,
          description,
          peopleSummary: peopleSummary || undefined,
          visibleText: visibleText || undefined,
          sceneType: sceneType || undefined,
          mood: mood || undefined,
          indoorOutdoor: indoorOutdoor || undefined,
          activityLabels,
          embeddingClipV2: embedding ?? undefined,
          embeddingClipV2Dim: embedding?.length,
          embeddingClipV2Model: embedding ? JINA_CLIP_MODEL : undefined,
          captionShort,
          captionShortV: AI_PROCESSING_VERSION,
          hashtags,
          aiTagsV2: tags,
          detectedFaces: detectedFaces.length,
          aiProcessedAt: Date.now(),
          aiProcessingVersion: AI_PROCESSING_VERSION,
        });

        await ctx.runMutation(internal.people.syncPhotoFaces, {
          userId: photo.userId,
          photoId: photo._id,
          faces: detectedFaces,
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
