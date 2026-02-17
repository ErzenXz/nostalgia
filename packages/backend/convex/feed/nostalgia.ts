import { action, internalMutation, internalQuery } from "../_generated/server";
import { v } from "convex/values";
import { api, internal } from "../_generated/api";
import { getAuthedUserId } from "../ai/auth_util";

type Mode = "nostalgia" | "on_this_day" | "deep_dive_year" | "serendipity";

const DAY_MS = 24 * 60 * 60 * 1000;

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function hashSeed(s: string): number {
  // FNV-1a 32-bit
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
    // xorshift32
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return (x >>> 0) / 0xffffffff;
  };
}

function dot(a: number[], b: number[]) {
  let s = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) s += (a[i] ?? 0) * (b[i] ?? 0);
  return s;
}

function meanVec(vecs: number[][]): number[] | null {
  if (vecs.length === 0) return null;
  const first = vecs[0];
  if (!first) return null;
  const dim = first.length;
  const out = new Array(dim).fill(0);
  for (const v of vecs) {
    if (v.length !== dim) continue;
    for (let i = 0; i < dim; i++) out[i] += v[i];
  }
  for (let i = 0; i < dim; i++) out[i] /= vecs.length;
  return out;
}

function pickReason(mode: Mode, takenAt: number | undefined, now: number) {
  const t = takenAt ?? now;
  const d = new Date(t);
  const year = d.getFullYear();
  if (mode === "on_this_day") return `On this day in ${year}`;
  if (mode === "deep_dive_year") return `From ${year}`;
  const ageYears = Math.max(0, (now - t) / (365 * DAY_MS));
  if (ageYears >= 10) return `From ${year}`;
  if (ageYears >= 5) return `From ${year}`;
  return "A moment to revisit";
}

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
    const limit = clamp(args.limit ?? 30, 1, 60);
    const now = Date.now();

    const existing: any = await ctx.runQuery(internal.feed.nostalgia.getSession, {
      userId,
      mode,
    });

    const seed = args.seed ?? existing?.seed ?? crypto.randomUUID();
    const cursor = args.cursor ?? "0";
    const rng = rngFactory(`${seed}:${mode}:${cursor}`);

    // Build session topic from recent items.
    const recentIds: string[] = (existing?.recentPhotoIds ?? []).slice(-30);
    const recentDocs = await Promise.all(
      recentIds.map((id) =>
        ctx.runQuery(api.photos.getById, { photoId: id as any }).catch(() => null),
      ),
    );
    const recentVecs: number[][] = recentDocs
      .map((p: any) => (p?.embeddingClipV2 as unknown) ?? null)
      .filter((vec: unknown): vec is number[] => Array.isArray(vec) && vec.length > 0);
    const topic = meanVec(recentVecs);

    // Candidate generation using date windows.
    let candidates: any[] = [];
    if (mode === "deep_dive_year") {
      const year = args.year ?? new Date(now).getFullYear() - 1;
      const start = new Date(year, 0, 1).getTime();
      const end = new Date(year + 1, 0, 1).getTime() - 1;
      candidates = (await ctx.runQuery(api.photos.listByDate, {
        userId,
        startDate: start,
        endDate: end,
      })) as any[];
    } else if (mode === "on_this_day") {
      const d = new Date(now);
      const month = d.getMonth();
      const day = d.getDate();
      const out: any[] = [];
      for (let y = d.getFullYear() - 1; y >= d.getFullYear() - 30; y--) {
        const start = new Date(y, month, day).getTime();
        const end = start + DAY_MS - 1;
        const chunk = (await ctx.runQuery(api.photos.listByDate, {
          userId,
          startDate: start,
          endDate: end,
        })) as any[];
        out.push(...chunk);
        if (out.length >= limit * 20) break;
      }
      candidates = out;
    } else {
      // nostalgia / serendipity: pick a date offset from a long-tail distribution.
      const minDays = 365;
      const maxDays = 365 * 25;
      const u = rng();
      const daysAgo = Math.floor(minDays * Math.exp(Math.log(maxDays / minDays) * u));
      const target = now - daysAgo * DAY_MS;

      let windowDays = 7;
      for (let attempt = 0; attempt < 4; attempt++) {
        const start = target - windowDays * DAY_MS;
        const end = target + windowDays * DAY_MS;
        const chunk = (await ctx.runQuery(api.photos.listByDate, {
          userId,
          startDate: start,
          endDate: end,
        })) as any[];
        candidates = chunk;
        if (candidates.length >= limit * 8) break;
        windowDays *= 2;
      }

      // Fallback: recent uploads (still filtered later by nostalgia scoring).
      if (candidates.length === 0) {
        const list = await ctx.runQuery(api.photos.listByUser, {
          userId,
          limit: 500,
        });
        candidates = (list as any)?.photos ?? [];
      }
    }

    // Basic filters + dedupe.
    const seen = new Set(recentIds);
    const dedup = new Map<string, any>();
    for (const p of candidates) {
      if (!p || p.isTrashed) continue;
      if (seen.has(p._id)) continue;
      dedup.set(p._id, p);
    }

    const pool = Array.from(dedup.values());

    // Enhanced scoring with time-of-day, seasonal, face, and quality factors.
    const nowDate = new Date(now);
    const currentHour = nowDate.getHours();
    const currentMonth = nowDate.getMonth();

    const scored = pool.map((p) => {
      const t = p.takenAt ?? p.uploadedAt;
      const ageDays = Math.max(0, (now - t) / DAY_MS);

      // Base nostalgia: older photos feel more nostalgic (log scale)
      const nostalgiaScore = Math.log1p(ageDays / 365);

      // Favorite boost
      const favBoost = p.isFavorite ? 0.5 : 0;

      // Semantic coherence with recent session topic
      const coherence = topic && Array.isArray(p.embeddingClipV2) ? dot(topic, p.embeddingClipV2) : 0;

      // Tag richness bonus
      const tagBoost = Array.isArray(p.aiTagsV2) ? Math.min(0.4, p.aiTagsV2.length / 60) : 0;

      // Time-of-day relevance: sunset photos in evening, morning photos in morning
      let timeOfDayBoost = 0;
      if (p.takenAt) {
        const photoHour = new Date(p.takenAt).getHours();
        const hourDiff = Math.abs(photoHour - currentHour);
        if (hourDiff <= 2) timeOfDayBoost = 0.2;
        else if (hourDiff <= 4) timeOfDayBoost = 0.1;
      }

      // Seasonal matching: show winter photos in winter, summer in summer
      let seasonalBoost = 0;
      if (p.takenAt) {
        const photoMonth = new Date(p.takenAt).getMonth();
        const monthDiff = Math.min(
          Math.abs(photoMonth - currentMonth),
          12 - Math.abs(photoMonth - currentMonth),
        );
        if (monthDiff <= 1) seasonalBoost = 0.25;
        else if (monthDiff <= 2) seasonalBoost = 0.1;
      }

      // Face detection: photos with people are more engaging
      const faceBoost = (typeof p.detectedFaces === "number" && p.detectedFaces > 0)
        ? Math.min(0.3, p.detectedFaces * 0.15)
        : 0;

      // AI quality score
      const qualityBoost = (p.aiQuality?.score != null)
        ? (p.aiQuality.score - 0.5) * 0.4
        : 0;

      const total =
        nostalgiaScore +
        favBoost +
        0.8 * coherence +
        tagBoost +
        timeOfDayBoost +
        seasonalBoost +
        faceBoost +
        qualityBoost;

      return {
        photo: p,
        total,
        nostalgiaScore,
        coherence,
      };
    });

    scored.sort((a, b) => b.total - a.total);

    // MMR selection for diversity.
    const selected: any[] = [];
    const selectedVecs: number[][] = [];
    const lambda = 0.7;
    const maxPool = Math.min(scored.length, 500);

    for (let k = 0; k < limit && k < scored.length; k++) {
      let bestIdx = -1;
      let bestVal = -Infinity;
      for (let i = 0; i < maxPool; i++) {
        const s = scored[i];
        if (!s || !s.photo) continue;
        if (selected.some((x) => x.photoId === s.photo._id)) continue;
        let diversityPenalty = 0;
        const v = Array.isArray(s.photo.embeddingClipV2) ? (s.photo.embeddingClipV2 as number[]) : null;
        if (v && selectedVecs.length > 0) {
          let maxSim = -1;
          for (const sv of selectedVecs) maxSim = Math.max(maxSim, dot(v, sv));
          diversityPenalty = maxSim;
        }
        const mmr = lambda * s.total - (1 - lambda) * diversityPenalty;
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
        reason: pickReason(mode, p.takenAt, now),
        score: chosen.total,
        scoreBreakdown: {
          nostalgia: chosen.nostalgiaScore,
          coherence: chosen.coherence,
        },
        captionShort: p.captionShort ?? null,
        aiTagsV2: p.aiTagsV2 ?? null,
        locationName: p.locationName ?? null,
        detectedFaces: p.detectedFaces ?? null,
      });
      if (Array.isArray(p.embeddingClipV2)) selectedVecs.push(p.embeddingClipV2);
    }

    const newRecent = [...recentIds, ...selected.map((i) => i.photoId)].slice(-50);
    await ctx.runMutation(internal.feed.nostalgia.upsertSession, {
      userId,
      mode,
      seed,
      recentPhotoIds: newRecent,
    });

    const nextCursor = String(parseInt(cursor, 10) + 1);
    return { items: selected, nextCursor };
  },
});
