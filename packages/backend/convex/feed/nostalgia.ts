/* eslint-disable @typescript-eslint/no-explicit-any */
import { action, internalMutation, internalQuery } from "../_generated/server";
import { v } from "convex/values";
import { api, internal } from "../_generated/api";
import { getAuthedUserId } from "../ai/auth_util";

// ─── Types ────────────────────────────────────────────────────────

type ScoreSignals = {
  nostalgia: number;
  coherence: number;
  freshness: number;
  novelty: number;
  quality: number;
  faces: number;
  favorite: number;
  anniversary: number;
  metadata: number;
  newUpload: number;
};

type ScoredCandidate = {
  photo: any;
  score: number;
  signals: ScoreSignals;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const HOME_MMR_LAMBDA = 0.62;
const MIN_UNSEEN_POOL = 6;
const RECENT_UPLOAD_WINDOW_DAYS = 21;

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

// ─── Maths helpers ────────────────────────────────────────────────

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rngFactory(seedStr: string) {
  let x = hashSeed(seedStr) || 1;
  return () => {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return (x >>> 0) / 0xffffffff;
  };
}

/** Cosine dot-product for unit-norm vectors */
function dot(a: number[], b: number[]) {
  let s = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) s += (a[i] ?? 0) * (b[i] ?? 0);
  return s;
}

/** Mean of a set of vectors (for building a taste profile) */
function meanVec(vecs: number[][]): number[] | null {
  if (vecs.length === 0) return null;
  const first = vecs[0];
  if (!first) return null;
  const dim = first.length;
  const out = new Array(dim).fill(0) as number[];
  for (const v of vecs) {
    if (v.length !== dim) continue;
    for (let i = 0; i < dim; i++) out[i] = (out[i] ?? 0) + (v[i] ?? 0);
  }
  for (let i = 0; i < dim; i++) {
    const cur = out[i];
    if (cur !== undefined) out[i] = cur / vecs.length;
  }
  return out;
}

// ─── Scoring signals (all normalized to [0, 1]) ───────────────────

/**
 * nostalgiaSignal: Smooth curve that increases with photo age.
 *   1 yr  → ~0.46,  2 yrs → ~0.76,  3 yrs → ~0.90,  5 yrs → ~0.98
 */
function nostalgiaSignal(ageDays: number): number {
  return Math.tanh(ageDays / (365 * 2));
}

/**
 * coherenceSignal: CLIP embeddings are unit-normalised, so dot() = cosine
 * similarity ∈ [−1, 1]. We shift it to [0, 1] so low coherence is 0.5
 * (neutral), not a penalty.
 */
function coherenceSignal(dotProduct: number): number {
  return (dotProduct + 1) / 2;
}

/** qualitySignal: direct pass-through with 0.5 fallback for unrated photos */
function qualitySignal(score: number | undefined | null): number {
  return score != null ? clamp(score, 0, 1) : 0.5;
}

/** faceSignal: photos with people score higher, saturates at ~3 faces */
function faceSignal(faces: number | undefined | null): number {
  const n = faces ?? 0;
  return Math.tanh(n * 0.5); // 1→0.46, 2→0.76, 3→0.91, 4→0.96
}

/** seasonalSignal: circular month distance */
function seasonalSignal(photoMonth: number, nowMonth: number): number {
  const diff = Math.min(
    Math.abs(photoMonth - nowMonth),
    12 - Math.abs(photoMonth - nowMonth),
  );
  if (diff === 0) return 1.0;
  if (diff === 1) return 0.6;
  if (diff === 2) return 0.3;
  return 0.0;
}

/** timeOfDaySignal: circular hour distance */
function timeOfDaySignal(photoHour: number, nowHour: number): number {
  const diff = Math.min(
    Math.abs(photoHour - nowHour),
    24 - Math.abs(photoHour - nowHour),
  );
  if (diff <= 1) return 1.0;
  if (diff <= 3) return 0.5;
  return 0.0;
}

function uploadFreshnessSignal(
  uploadedAt: number | undefined,
  now: number,
): number {
  if (!uploadedAt) return 0;
  const ageDays = Math.max(0, (now - uploadedAt) / DAY_MS);
  if (ageDays <= 1) return 1;
  if (ageDays <= 7) return 0.92;
  if (ageDays <= RECENT_UPLOAD_WINDOW_DAYS)
    return 0.92 * Math.exp(-(ageDays - 7) / 10);
  return 0.1 * Math.exp(-(ageDays - RECENT_UPLOAD_WINDOW_DAYS) / 45);
}

function anniversarySignal(
  photoTime: number | null | undefined,
  now: number,
): number {
  if (!photoTime) return 0;
  const photoDate = new Date(photoTime);
  const nowDate = new Date(now);
  return photoDate.getMonth() === nowDate.getMonth() &&
    photoDate.getDate() === nowDate.getDate() &&
    photoDate.getFullYear() < nowDate.getFullYear()
    ? 1
    : 0;
}

function metadataSignal(photo: any): number {
  const signals = [
    !!photo.locationName,
    typeof photo.captionShort === "string" &&
      photo.captionShort.trim().length > 0,
    Array.isArray(photo.aiTagsV2) && photo.aiTagsV2.length > 0,
    typeof photo.description === "string" &&
      photo.description.trim().length > 0,
  ];
  return signals.filter(Boolean).length / signals.length;
}

function noveltySignal(
  photoId: string,
  recentSeenRanks: Map<string, number>,
): number {
  const rank = recentSeenRanks.get(photoId);
  if (!rank) return 1;
  if (rank <= 6) return 0.04;
  if (rank <= 18) return 0.18;
  if (rank <= 36) return 0.4;
  return 0.65;
}

function getPhotoVector(photo: any): number[] | null {
  return Array.isArray(photo?.embeddingClipV2) &&
    photo.embeddingClipV2.length > 0
    ? (photo.embeddingClipV2 as number[])
    : null;
}

// ─── Scoring ──────────────────────────────────────────────────────

function scorePhoto(
  photo: any,
  topic: number[] | null,
  recentSeenRanks: Map<string, number>,
  now: number,
): { score: number; signals: ScoreSignals } {
  const t = photo.takenAt ?? photo.uploadedAt;
  const ageDays = Math.max(0, (now - t) / DAY_MS);

  const nostalgiaSig = nostalgiaSignal(ageDays);
  const qualitySig = qualitySignal(photo.aiQuality?.score);
  const faceSig = faceSignal(photo.detectedFaces);
  const favSig = photo.isFavorite ? 1.0 : 0.0;
  const freshnessSig = uploadFreshnessSignal(photo.uploadedAt, now);
  const noveltySig = noveltySignal(photo._id, recentSeenRanks);
  const anniversarySig = anniversarySignal(photo.takenAt ?? null, now);
  const metadataSig = metadataSignal(photo);
  const newUploadSig = freshnessSig > 0.35 && !getPhotoVector(photo) ? 1 : 0;

  // Coherence: requires both a topic vector and the photo's CLIP embedding
  const rawCoherence =
    topic && getPhotoVector(photo)
      ? dot(topic, getPhotoVector(photo) as number[])
      : 0;
  const coherenceSig = coherenceSignal(rawCoherence);

  // Seasonal & time-of-day from photo date
  const photoDate = new Date(t);
  const nowDate = new Date(now);
  const seasonalSig = seasonalSignal(photoDate.getMonth(), nowDate.getMonth());
  const timeSig = timeOfDaySignal(photoDate.getHours(), nowDate.getHours());

  const score =
    0.24 * freshnessSig +
    0.17 * nostalgiaSig +
    0.15 * coherenceSig +
    0.12 * noveltySig +
    0.1 * qualitySig +
    0.07 * faceSig +
    0.05 * favSig +
    0.04 * metadataSig +
    0.03 * seasonalSig +
    0.01 * timeSig +
    0.12 * anniversarySig +
    0.08 * newUploadSig;

  return {
    score,
    signals: {
      nostalgia: nostalgiaSig,
      coherence: coherenceSig,
      freshness: freshnessSig,
      novelty: noveltySig,
      quality: qualitySig,
      faces: faceSig,
      favorite: favSig,
      anniversary: anniversarySig,
      metadata: metadataSig,
      newUpload: newUploadSig,
    },
  };
}

// ─── Contextual reason strings ────────────────────────────────────

function pickReason(photo: any, now: number, signals: ScoreSignals): string {
  const t = photo.takenAt ?? photo.uploadedAt;
  const d = new Date(t);

  const ageMs = now - t;
  const ageDays = Math.floor(ageMs / DAY_MS);
  const ageYears = Math.round(ageMs / (365.25 * DAY_MS));

  const month = MONTH_NAMES[d.getMonth()] ?? "";
  const loc = photo.locationName ? photo.locationName : null;

  if (signals.anniversary > 0) {
    if (ageYears === 1)
      return loc ? `One year ago in ${loc}` : "One year ago today";
    return loc
      ? `${ageYears} years ago in ${loc}`
      : `${ageYears} years ago today`;
  }

  if (signals.freshness >= 0.9) {
    return "Just added";
  }

  if (signals.freshness >= 0.45) {
    return loc ? `Added recently in ${loc}` : "Added recently";
  }

  if (photo.isFavorite && ageYears > 0) {
    return ageYears === 1
      ? loc
        ? `A favorite from last year in ${loc}`
        : "A favorite from last year"
      : loc
        ? `A favorite from ${ageYears} years ago in ${loc}`
        : `A favorite from ${ageYears} years ago`;
  }

  if (photo.detectedFaces && photo.detectedFaces > 0 && ageYears > 0) {
    return ageYears === 1
      ? loc
        ? `Faces from last year in ${loc}`
        : "Faces from last year"
      : loc
        ? `${ageYears} years ago in ${loc}`
        : `${ageYears} years ago`;
  }

  if (
    signals.coherence >= 0.75 &&
    typeof photo.captionShort === "string" &&
    photo.captionShort.length > 0
  ) {
    return "Matches the moments you revisit most";
  }

  if (loc && ageYears > 0) {
    return ageYears === 1
      ? `Last year in ${loc}`
      : `${ageYears} years ago in ${loc}`;
  }
  if (loc && ageDays > 30) return `${month} in ${loc}`;
  if (ageYears >= 5) return `From ${ageYears} years ago`;
  if (ageYears >= 2) return `${ageYears} years ago`;
  if (ageYears === 1) return "One year ago";
  if (ageDays > 180) return "Earlier this year";
  return "A recent memory";
}

function selectWithMMR(
  candidates: ScoredCandidate[],
  count: number,
  selectedIds: Set<string>,
  selectedVecs: number[][],
  lambda: number,
): ScoredCandidate[] {
  const picked: ScoredCandidate[] = [];
  const maxPool = Math.min(candidates.length, 600);

  for (let k = 0; k < count; k++) {
    let bestIdx = -1;
    let bestVal = -Infinity;

    for (let i = 0; i < maxPool; i++) {
      const candidate = candidates[i];
      if (!candidate) continue;
      if (selectedIds.has(candidate.photo._id)) continue;

      let maxSim = 0;
      const vec = getPhotoVector(candidate.photo);
      if (vec && selectedVecs.length > 0) {
        for (const selectedVec of selectedVecs) {
          const sim = (dot(vec, selectedVec) + 1) / 2;
          if (sim > maxSim) maxSim = sim;
        }
      }

      const mmr = lambda * candidate.score - (1 - lambda) * maxSim;
      if (mmr > bestVal) {
        bestVal = mmr;
        bestIdx = i;
      }
    }

    if (bestIdx === -1) break;
    const chosen = candidates[bestIdx];
    if (!chosen) break;
    picked.push(chosen);
    selectedIds.add(chosen.photo._id);
    const vec = getPhotoVector(chosen.photo);
    if (vec) selectedVecs.push(vec);
  }

  return picked;
}

// ─── Feed session queries ─────────────────────────────────────────

export const getSession = internalQuery({
  args: { userId: v.id("users"), mode: v.string() },
  returns: v.union(v.any(), v.null()),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("feedSessions")
      .withIndex("by_user_mode", (q) =>
        q.eq("userId", args.userId).eq("mode", args.mode as any),
      )
      .unique();
  },
});

export const upsertSession = internalMutation({
  args: {
    userId: v.id("users"),
    mode: v.string(),
    seed: v.string(),
    recentPhotoIds: v.array(v.id("photos")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("feedSessions")
      .withIndex("by_user_mode", (q) =>
        q.eq("userId", args.userId).eq("mode", args.mode as any),
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        seed: args.seed,
        recentPhotoIds: args.recentPhotoIds,
        lastSeenAt: now,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("feedSessions", {
        userId: args.userId,
        mode: args.mode as any,
        seed: args.seed,
        lastSeenAt: now,
        recentPhotoIds: args.recentPhotoIds,
        createdAt: now,
        updatedAt: now,
      });
    }
    return null;
  },
});

// ─── Main feed action ─────────────────────────────────────────────

export const getNostalgiaFeed = action({
  args: {
    mode: v.union(
      v.literal("nostalgia"),
      v.literal("on_this_day"),
      v.literal("deep_dive_year"),
      v.literal("serendipity"),
    ),
    limit: v.optional(v.number()),
    seed: v.optional(v.string()),
    cursor: v.optional(v.string()),
    year: v.optional(v.number()),
  },
  returns: v.object({
    items: v.array(v.any()),
    nextCursor: v.union(v.string(), v.null()),
  }),
  handler: async (ctx, args) => {
    const userId = await getAuthedUserId(ctx);
    const limit = clamp(args.limit ?? 12, 1, 60);
    const now = Date.now();
    const cursor = args.cursor ?? "0";
    const cursorNumber = Number.parseInt(cursor, 10);

    // Keep one durable session regardless of which legacy mode the client asks for.
    const sessionMode = "home";
    const existing: any = await ctx.runQuery(
      internal.feed.nostalgia.getSession,
      {
        userId,
        mode: sessionMode,
      },
    );

    const seed = args.seed ?? existing?.seed ?? crypto.randomUUID();
    const rng = rngFactory(`${seed}:${cursor}`);

    // ── Build taste profile from recent session photos ────────────
    const recentIds: string[] = (existing?.recentPhotoIds ?? []).slice(-60);
    const recentDocs = await Promise.all(
      recentIds.map((id) =>
        ctx
          .runQuery(api.photos.getById, { photoId: id as any })
          .catch(() => null),
      ),
    );
    const favoriteDocs = recentDocs
      .filter((photo: any) => photo?.isFavorite)
      .slice(0, 12);
    const allPhotos = (await ctx.runQuery(api.photos.listByDate, {
      userId,
    })) as any[];

    // Blend favorite photos and recent interactions into a single taste vector.
    const topic = meanVec([
      ...recentDocs.flatMap((photo: any) => {
        const vec = getPhotoVector(photo);
        return vec ? [vec] : [];
      }),
      ...favoriteDocs.flatMap((photo: any) => {
        const vec = getPhotoVector(photo);
        return vec ? [vec, vec] : [];
      }),
    ]);

    // ── Dedup + filter ────────────────────────────────────────────
    const dedup = new Map<string, any>();
    for (const p of allPhotos) {
      if (!p || p.isTrashed || p.isArchived) continue;
      dedup.set(p._id, p);
    }
    const pool = Array.from(dedup.values());
    if (pool.length === 0) {
      return { items: [], nextCursor: null };
    }

    const recentSeenRanks = new Map<string, number>();
    recentIds.forEach((id, index) => {
      recentSeenRanks.set(id, recentIds.length - index);
    });

    const unseenPool = pool.filter((photo) => !recentSeenRanks.has(photo._id));
    const rankingPool =
      unseenPool.length >= Math.max(limit, MIN_UNSEEN_POOL) ? unseenPool : pool;

    // ── Score candidate photos with a single home-ranking algorithm ─────────
    const scored = rankingPool.map((photo) => ({
      photo,
      ...scorePhoto(photo, topic, recentSeenRanks, now),
      tieBreak: rng(),
    }));
    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return b.tieBreak - a.tieBreak;
    });

    const selectedIds = new Set<string>();
    const selectedVecs: number[][] = [];
    const recentPool = scored.filter(
      (candidate) => candidate.signals.freshness >= 0.35,
    );
    const recentTarget = Math.min(
      recentPool.length,
      Math.max(0, Math.min(4, Math.ceil(limit / 3))),
    );

    const selectedScored = [
      ...selectWithMMR(
        recentPool,
        recentTarget,
        selectedIds,
        selectedVecs,
        0.8,
      ),
      ...selectWithMMR(
        scored,
        limit - recentTarget,
        selectedIds,
        selectedVecs,
        HOME_MMR_LAMBDA,
      ),
    ].slice(0, limit);

    const selected = selectedScored.map((candidate) => {
      const photo = candidate.photo;
      return {
        photoId: photo._id,
        takenAt: photo.takenAt ?? null,
        uploadedAt: photo.uploadedAt,
        mimeType: photo.mimeType ?? "image/jpeg",
        reason: pickReason(photo, now, candidate.signals),
        score: candidate.score,
        scoreBreakdown: {
          nostalgia: candidate.signals.nostalgia,
          coherence: candidate.signals.coherence,
        },
        captionShort: photo.captionShort ?? null,
        aiTagsV2: photo.aiTagsV2 ?? null,
        locationName: photo.locationName ?? null,
        detectedFaces: photo.detectedFaces ?? null,
      };
    });

    // ── Update session with newly-seen photo IDs ──────────────────
    const newRecentIds = [
      ...recentIds,
      ...selected.map((i) => i.photoId),
    ].slice(-120);

    await ctx.runMutation(internal.feed.nostalgia.upsertSession, {
      userId,
      mode: sessionMode,
      seed,
      recentPhotoIds: newRecentIds,
    });

    const nextCursor =
      rankingPool.length > selected.length
        ? String(Number.isNaN(cursorNumber) ? 1 : cursorNumber + 1)
        : null;
    return { items: selected, nextCursor };
  },
});
