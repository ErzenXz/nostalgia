import { action, internalMutation, internalQuery } from "../_generated/server";
import { v } from "convex/values";
import { api, internal } from "../_generated/api";
import { getAuthedUserId } from "../ai/auth_util";

// ─── Types ────────────────────────────────────────────────────────

type Mode = "nostalgia" | "on_this_day" | "deep_dive_year" | "serendipity";

const DAY_MS = 24 * 60 * 60 * 1000;

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
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

// ─── Mode-specific scoring weights ────────────────────────────────
// All weights within a mode sum to ~1.0 (anniversary is additive bonus)

const WEIGHTS: Record<
  Mode,
  {
    nostalgia: number;
    coherence: number;
    quality: number;
    faces: number;
    seasonal: number;
    timeOfDay: number;
    favorite: number;
    randomness: number; // injected RNG noise, mainly for serendipity
  }
> = {
  nostalgia: {
    nostalgia: 0.30,
    coherence: 0.25,
    quality: 0.15,
    faces: 0.10,
    seasonal: 0.08,
    timeOfDay: 0.04,
    favorite: 0.08,
    randomness: 0.00,
  },
  on_this_day: {
    nostalgia: 0.20, // candidates are already date-filtered
    coherence: 0.25,
    quality: 0.20,
    faces: 0.15,
    seasonal: 0.00, // irrelevant — filtered to today's date in past years
    timeOfDay: 0.08,
    favorite: 0.12,
    randomness: 0.00,
  },
  deep_dive_year: {
    nostalgia: 0.15, // candidates are year-filtered
    coherence: 0.25,
    quality: 0.20,
    faces: 0.15,
    seasonal: 0.05,
    timeOfDay: 0.08,
    favorite: 0.12,
    randomness: 0.00,
  },
  serendipity: {
    // Low coherence + high randomness = genuine surprise
    nostalgia: 0.15,
    coherence: 0.05,
    quality: 0.15,
    faces: 0.10,
    seasonal: 0.05,
    timeOfDay: 0.02,
    favorite: 0.05,
    randomness: 0.43,
  },
};

// MMR lambda: higher = more relevance, lower = more diversity
const MMR_LAMBDA: Record<Mode, number> = {
  nostalgia: 0.60,
  on_this_day: 0.70,
  deep_dive_year: 0.65,
  serendipity: 0.35, // maximise surprise — low relevance bias
};

// ─── Scoring ──────────────────────────────────────────────────────

function scorePhoto(
  photo: any,
  topic: number[] | null,
  rng: () => number,
  mode: Mode,
  now: number,
): { score: number; nostalgiaScore: number; coherence: number } {
  const w = WEIGHTS[mode];
  const t = photo.takenAt ?? photo.uploadedAt;
  const ageDays = Math.max(0, (now - t) / DAY_MS);

  const nostalgiaSig = nostalgiaSignal(ageDays);
  const qualitySig = qualitySignal(photo.aiQuality?.score);
  const faceSig = faceSignal(photo.detectedFaces);
  const favSig = photo.isFavorite ? 1.0 : 0.0;
  const rngSig = rng();

  // Coherence: requires both a topic vector and the photo's CLIP embedding
  const rawCoherence =
    topic && Array.isArray(photo.embeddingClipV2) && photo.embeddingClipV2.length > 0
      ? dot(topic, photo.embeddingClipV2 as number[])
      : 0;
  const coherenceSig = coherenceSignal(rawCoherence);

  // Seasonal & time-of-day from photo date
  const photoDate = new Date(t);
  const nowDate = new Date(now);
  const seasonalSig = seasonalSignal(photoDate.getMonth(), nowDate.getMonth());
  const timeSig = timeOfDaySignal(photoDate.getHours(), nowDate.getHours());

  const score =
    w.nostalgia * nostalgiaSig +
    w.coherence * coherenceSig +
    w.quality * qualitySig +
    w.faces * faceSig +
    w.seasonal * seasonalSig +
    w.timeOfDay * timeSig +
    w.favorite * favSig +
    w.randomness * rngSig;

  // Anniversary bonus (additive on top of weighted score):
  // If this photo was taken on the same month+day as today, in a previous year,
  // it gets a strong boost — like Instagram's "1 year ago today"
  const anniversaryBonus =
    photo.takenAt &&
    photoDate.getMonth() === nowDate.getMonth() &&
    photoDate.getDate() === nowDate.getDate() &&
    photoDate.getFullYear() < nowDate.getFullYear()
      ? 0.85
      : 0.0;

  return {
    score: score + anniversaryBonus,
    nostalgiaScore: nostalgiaSig,
    coherence: rawCoherence,
  };
}

// ─── Contextual reason strings ────────────────────────────────────

function pickReason(mode: Mode, photo: any, now: number): string {
  const t = photo.takenAt ?? photo.uploadedAt;
  const d = new Date(t);
  const nowDate = new Date(now);

  const ageMs = now - t;
  const ageDays = Math.floor(ageMs / DAY_MS);
  const ageYears = Math.round(ageMs / (365.25 * DAY_MS));

  const year = d.getFullYear();
  const month = MONTH_NAMES[d.getMonth()] ?? "";
  const loc = photo.locationName ? photo.locationName : null;

  const isAnniversary =
    photo.takenAt &&
    d.getMonth() === nowDate.getMonth() &&
    d.getDate() === nowDate.getDate() &&
    d.getFullYear() < nowDate.getFullYear();

  // Anniversary overrides everything
  if (isAnniversary) {
    if (ageYears === 1) return loc ? `One year ago in ${loc}` : "One year ago today";
    return loc ? `${ageYears} years ago in ${loc}` : `${ageYears} years ago today`;
  }

  if (mode === "on_this_day") {
    if (ageYears === 1) return loc ? `A year ago in ${loc}` : "This day last year";
    return loc ? `${ageYears} years ago in ${loc}` : `${ageYears} years ago today`;
  }

  if (mode === "deep_dive_year") {
    if (loc) return `${month} ${year} · ${loc}`;
    return `${month} ${year}`;
  }

  if (mode === "serendipity") {
    if (ageDays > 365 * 7) return loc ? `Forgotten since ${year} in ${loc}` : `A forgotten moment from ${year}`;
    if (ageDays > 365 * 3) return `Rediscovering ${year}`;
    if (ageDays > 365) return `A surprise from ${year}`;
    return "Something you haven't seen in a while";
  }

  // nostalgia mode
  if (photo.isFavorite && ageYears > 0) {
    return ageYears === 1
      ? loc ? `A favorite from last year in ${loc}` : "A favorite from last year"
      : loc ? `A favorite from ${ageYears} years ago in ${loc}` : `A favorite from ${ageYears} years ago`;
  }
  if (photo.detectedFaces && photo.detectedFaces > 0 && ageYears > 0) {
    return ageYears === 1
      ? loc ? `Faces from last year in ${loc}` : "Faces from last year"
      : loc ? `${ageYears} years ago in ${loc}` : `${ageYears} years ago`;
  }
  if (loc && ageYears > 0) {
    return ageYears === 1 ? `Last year in ${loc}` : `${ageYears} years ago in ${loc}`;
  }
  if (ageYears >= 5) return `From ${ageYears} years ago`;
  if (ageYears >= 2) return `${ageYears} years ago`;
  if (ageYears === 1) return "One year ago";
  if (ageDays > 180) return "Earlier this year";
  return "A recent memory";
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
    const mode = args.mode as Mode;
    const limit = clamp(args.limit ?? 12, 1, 60);
    const now = Date.now();
    const nowDate = new Date(now);

    // ── Load session (tracks seen photos + taste seed) ────────────
    const existing: any = await ctx.runQuery(internal.feed.nostalgia.getSession, {
      userId,
      mode,
    });

    const seed = args.seed ?? existing?.seed ?? crypto.randomUUID();
    const cursor = args.cursor ?? "0";
    const rng = rngFactory(`${seed}:${mode}:${cursor}`);

    // ── Build taste profile from recent session photos ────────────
    // We take up to 30 recently-seen photos and average their CLIP embeddings
    // to form a "topic vector" representing what the user has engaged with.
    const recentIds: string[] = (existing?.recentPhotoIds ?? []).slice(-30);
    const recentDocs = await Promise.all(
      recentIds.map((id) =>
        ctx.runQuery(api.photos.getById, { photoId: id as any }).catch(() => null),
      ),
    );
    const recentVecs: number[][] = recentDocs
      .flatMap((p: any) =>
        Array.isArray(p?.embeddingClipV2) && p.embeddingClipV2.length > 0
          ? [p.embeddingClipV2 as number[]]
          : [],
      );
    const topic = meanVec(recentVecs);

    // ── Candidate generation (mode-specific) ─────────────────────

    let candidates: any[] = [];

    if (mode === "deep_dive_year") {
      // Single year range query
      const year = args.year ?? nowDate.getFullYear() - 1;
      const start = new Date(year, 0, 1).getTime();
      const end = new Date(year + 1, 0, 1).getTime() - 1;
      candidates = await ctx.runQuery(api.photos.listByDate, {
        userId,
        startDate: start,
        endDate: end,
      }) as any[];

    } else if (mode === "on_this_day") {
      // BUG FIX: was 30 sequential awaits — now parallel via Promise.all
      const month = nowDate.getMonth();
      const day = nowDate.getDate();
      const startYear = nowDate.getFullYear() - 1;
      const endYear = Math.max(1990, nowDate.getFullYear() - 25);

      const yearQueries = Array.from(
        { length: startYear - endYear + 1 },
        (_, i) => startYear - i,
      ).map((y) => {
        const start = new Date(y, month, day).getTime();
        const end = start + DAY_MS - 1;
        return ctx.runQuery(api.photos.listByDate, {
          userId,
          startDate: start,
          endDate: end,
        }).catch(() => []) as Promise<any[]>;
      });

      const yearResults = await Promise.all(yearQueries);
      candidates = yearResults.flat();

    } else if (mode === "serendipity") {
      // Use MULTIPLE random time anchors spread across the full timeline.
      // This gives genuinely diverse, surprising results vs. a single window.
      const NUM_ANCHORS = 5;
      const minDays = 30;      // include reasonably recent photos
      const maxDays = 365 * 20; // but also very old ones

      const anchorQueries = Array.from({ length: NUM_ANCHORS }, () => {
        const u = rng();
        // Log-uniform distribution: lots of variation from 1 month to 20 years ago
        const daysAgo = Math.floor(minDays * Math.exp(Math.log(maxDays / minDays) * u));
        const target = now - daysAgo * DAY_MS;
        const windowDays = 30; // wide fixed window per anchor
        return ctx.runQuery(api.photos.listByDate, {
          userId,
          startDate: target - windowDays * DAY_MS,
          endDate: target + windowDays * DAY_MS,
        }).catch(() => []) as Promise<any[]>;
      });

      const anchorResults = await Promise.all(anchorQueries);
      candidates = anchorResults.flat();

      // Fallback: if anchors yielded very little, pull from the full library
      if (candidates.length < limit * 3) {
        const fallback = await ctx.runQuery(api.photos.listByUser, {
          userId,
          limit: 300,
        }) as any;
        candidates.push(...((fallback?.photos ?? []) as any[]));
      }

    } else {
      // nostalgia: single log-uniform random time window with adaptive widening
      const minDays = 365;
      const maxDays = 365 * 25;
      const u = rng();
      const daysAgo = Math.floor(minDays * Math.exp(Math.log(maxDays / minDays) * u));
      const target = now - daysAgo * DAY_MS;

      let windowDays = 14;
      for (let attempt = 0; attempt < 4; attempt++) {
        const start = target - windowDays * DAY_MS;
        const end = target + windowDays * DAY_MS;
        candidates = await ctx.runQuery(api.photos.listByDate, {
          userId,
          startDate: start,
          endDate: end,
        }) as any[];
        if (candidates.length >= limit * 4) break;
        windowDays *= 2;
      }

      if (candidates.length < limit * 2) {
        const fallback = await ctx.runQuery(api.photos.listByUser, {
          userId,
          limit: 400,
        }) as any;
        candidates = [...candidates, ...((fallback?.photos ?? []) as any[])];
      }
    }

    // ── Dedup + filter ────────────────────────────────────────────
    const seenSet = new Set(recentIds);
    const dedup = new Map<string, any>();
    for (const p of candidates) {
      if (!p || p.isTrashed || p.isArchived) continue;
      if (seenSet.has(p._id)) continue;
      dedup.set(p._id, p);
    }
    const pool = Array.from(dedup.values());

    // ── Split processed vs unprocessed ───────────────────────────
    // Prefer photos that have been AI-analysed (have embeddings + captions).
    const processedPool = pool.filter(
      (p) => Array.isArray(p.embeddingClipV2) && p.embeddingClipV2.length > 0,
    );
    const unprocessedPool = pool.filter(
      (p) => !Array.isArray(p.embeddingClipV2) || p.embeddingClipV2.length === 0,
    );

    // ── Score processed photos ────────────────────────────────────
    const scored = processedPool.map((p) => {
      const result = scorePhoto(p, topic, rng, mode, now);
      return { photo: p, ...result };
    });
    scored.sort((a, b) => b.score - a.score);

    // ── MMR selection for diversity ───────────────────────────────
    // Maximal Marginal Relevance: balances relevance with visual diversity.
    // Lambda controls the trade-off (high = more relevance, low = more diversity).
    const lambda = MMR_LAMBDA[mode];
    const selected: any[] = [];
    const selectedVecs: number[][] = [];
    const maxPool = Math.min(scored.length, 600);

    for (let k = 0; k < limit && k < scored.length; k++) {
      let bestIdx = -1;
      let bestVal = -Infinity;

      for (let i = 0; i < maxPool; i++) {
        const s = scored[i];
        if (!s?.photo) continue;
        if (selected.some((x) => x.photoId === s.photo._id)) continue;

        let maxSim = 0;
        const vec = Array.isArray(s.photo.embeddingClipV2)
          ? (s.photo.embeddingClipV2 as number[])
          : null;
        if (vec && selectedVecs.length > 0) {
          for (const sv of selectedVecs) {
            const sim = (dot(vec, sv) + 1) / 2; // normalise to [0,1]
            if (sim > maxSim) maxSim = sim;
          }
        }

        const mmr = lambda * s.score - (1 - lambda) * maxSim;
        if (mmr > bestVal) {
          bestVal = mmr;
          bestIdx = i;
        }
      }

      if (bestIdx === -1) break;
      const chosen = scored[bestIdx];
      if (!chosen) break;
      const p = chosen.photo;

      selected.push({
        photoId: p._id,
        takenAt: p.takenAt ?? null,
        uploadedAt: p.uploadedAt,
        mimeType: p.mimeType ?? "image/jpeg",
        reason: pickReason(mode, p, now),
        score: chosen.score,
        scoreBreakdown: {
          nostalgia: chosen.nostalgiaScore,
          coherence: chosen.coherence,
        },
        captionShort: p.captionShort ?? null,
        aiTagsV2: p.aiTagsV2 ?? null,
        locationName: p.locationName ?? null,
        detectedFaces: p.detectedFaces ?? null,
      });

      if (Array.isArray(p.embeddingClipV2)) {
        selectedVecs.push(p.embeddingClipV2 as number[]);
      }
    }

    // ── Backfill with unprocessed photos ─────────────────────────
    // When the AI-analysed pool is exhausted (or empty), fill remaining slots
    // with unprocessed photos so new uploads appear in the feed immediately.
    if (selected.length < limit && unprocessedPool.length > 0) {
      const selectedSet = new Set(selected.map((i) => i.photoId));

      // Score unprocessed photos with basic signals only (no embedding/coherence)
      const unprocessedScored = unprocessedPool
        .filter((p) => !selectedSet.has(p._id))
        .map((p) => {
          const t = p.takenAt ?? p.uploadedAt;
          const ageDays = Math.max(0, (now - t) / DAY_MS);
          const basic =
            nostalgiaSignal(ageDays) * 0.5 +
            (p.isFavorite ? 0.3 : 0) +
            rng() * 0.2;
          return { photo: p, basic };
        })
        .sort((a, b) => b.basic - a.basic);

      for (const s of unprocessedScored) {
        if (selected.length >= limit) break;
        const p = s.photo;
        selected.push({
          photoId: p._id,
          takenAt: p.takenAt ?? null,
          uploadedAt: p.uploadedAt,
          mimeType: p.mimeType ?? "image/jpeg",
          reason: pickReason(mode, p, now),
          score: s.basic,
          scoreBreakdown: { nostalgia: s.basic, coherence: 0 },
          captionShort: p.captionShort ?? null,
          aiTagsV2: p.aiTagsV2 ?? null,
          locationName: p.locationName ?? null,
          detectedFaces: p.detectedFaces ?? null,
        });
      }
    }

    // ── Update session with newly-seen photo IDs ──────────────────
    const newRecentIds = [
      ...recentIds,
      ...selected.map((i) => i.photoId),
    ].slice(-60); // keep the most recent 60 IDs

    await ctx.runMutation(internal.feed.nostalgia.upsertSession, {
      userId,
      mode,
      seed,
      recentPhotoIds: newRecentIds,
    });

    const nextCursor = String(parseInt(cursor, 10) + 1);
    return { items: selected, nextCursor };
  },
});
