"use node";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { action } from "../_generated/server";
import { v } from "convex/values";
import { api } from "../_generated/api";
import { getAuthedUserId } from "./auth_util";
import { embedTextClipV2 } from "./jina";

const MONTH_NAMES = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];

function normalizeText(value: string | null | undefined) {
  return (value ?? "")
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(query: string) {
  return Array.from(
    new Set(
      normalizeText(query)
        .split(" ")
        .map((token) => token.trim())
        .filter((token) => token.length >= 2),
    ),
  );
}

function parseQueryIntent(query: string) {
  const normalized = normalizeText(query);
  const years = Array.from(
    new Set(
      (normalized.match(/\b(19|20)\d{2}\b/g) ?? []).map((value) =>
        Number.parseInt(value, 10),
      ),
    ),
  );
  const hashtags = Array.from(
    new Set(
      (query.match(/#[a-z0-9_-]+/gi) ?? []).map((value) =>
        value.toLowerCase().replace(/^#/, ""),
      ),
    ),
  );
  const wantsVideos =
    normalized.includes(" video") ||
    normalized.startsWith("video ") ||
    normalized.includes(" videos");
  const wantsPhotos =
    normalized.includes(" photo") ||
    normalized.startsWith("photo ") ||
    normalized.includes(" photos");

  return {
    normalized,
    years,
    hashtags,
    wantsVideos,
    wantsPhotos,
  };
}

function fieldMatchScore(field: string, query: string, tokens: string[]) {
  if (!field) return 0;

  let score = 0;
  if (query.length >= 3 && field.includes(query)) {
    score += field === query ? 1 : 0.7;
  }

  let tokenMatches = 0;
  for (const token of tokens) {
    if (field.includes(token)) tokenMatches += 1;
  }

  if (tokens.length > 0) {
    score += (tokenMatches / tokens.length) * 0.45;
  }

  return score;
}

function keywordScore(photo: any, query: string, tokens: string[]) {
  const fields = [
    { text: normalizeText(photo.titleShort), weight: 1.2 },
    { text: normalizeText(photo.fileName), weight: 0.9 },
    { text: normalizeText(photo.locationName), weight: 1 },
    { text: normalizeText(photo.captionShort), weight: 1.1 },
    { text: normalizeText(photo.description), weight: 0.95 },
    { text: normalizeText(photo.peopleSummary), weight: 0.8 },
    { text: normalizeText(photo.visibleText), weight: 1.05 },
    { text: normalizeText(photo.sceneType), weight: 0.7 },
    { text: normalizeText(photo.mood), weight: 0.55 },
    { text: normalizeText(photo.indoorOutdoor), weight: 0.4 },
    {
      text: normalizeText((photo.activityLabels ?? []).join(" ")),
      weight: 0.9,
    },
    { text: normalizeText((photo.hashtags ?? []).join(" ")), weight: 1.15 },
    { text: normalizeText((photo.aiTagsV2 ?? []).join(" ")), weight: 1.1 },
    { text: normalizeText((photo.aiTags ?? []).join(" ")), weight: 0.7 },
  ];

  let score = 0;
  for (const field of fields) {
    score += fieldMatchScore(field.text, query, tokens) * field.weight;
  }

  const timestamp = photo.takenAt ?? photo.uploadedAt ?? photo._creationTime;
  if (timestamp) {
    const date = new Date(timestamp);
    const year = String(date.getFullYear());
    const month = MONTH_NAMES[date.getMonth()] ?? "";
    if (query.includes(year)) score += 0.5;
    if (month && query.includes(month)) score += 0.35;
  }

  if (tokens.includes("favorite") || tokens.includes("favorites")) {
    score += photo.isFavorite ? 0.5 : 0;
  }
  if (tokens.includes("video") || tokens.includes("videos")) {
    score += photo.mimeType?.startsWith("video/") ? 0.45 : 0;
  }
  if (tokens.includes("photo") || tokens.includes("photos")) {
    score += photo.mimeType?.startsWith("image/") ? 0.15 : 0;
  }

  return score;
}

function normalizeSemanticScore(raw: number | undefined) {
  if (typeof raw !== "number" || Number.isNaN(raw)) return 0;
  return Math.max(0, Math.min(1, raw));
}

function isSearchablePhoto(photo: any) {
  return !!photo && !photo.isTrashed && !photo.isArchived;
}

export const embedText = action({
  args: { text: v.string() },
  returns: v.array(v.float64()),
  handler: async (_ctx, args): Promise<number[]> => {
    return await embedTextClipV2(args.text);
  },
});

export const semanticSearch = action({
  args: {
    query: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.any(),
  handler: async (ctx, args): Promise<any[]> => {
    const userId = await getAuthedUserId(ctx);
    const query = args.query.trim();
    if (!query) return [];

    const limit = Math.max(1, Math.min(args.limit ?? 20, 50));
    const tokens = tokenize(query);
    const intent = parseQueryIntent(query);

    const [
      allPhotos,
      descriptionMatches,
      semanticResults,
      personMatchedPhotoIds,
    ] = await Promise.all([
      ctx
        .runQuery(api.photos.listByDate, { userId })
        .catch(() => []) as Promise<any[]>,
      ctx
        .runQuery(api.photos.searchByDescription, {
          userId,
          searchQuery: query,
        })
        .catch(() => []) as Promise<any[]>,
      (async () => {
        try {
          const vector = await embedTextClipV2(query);
          return await ctx.vectorSearch("photos", "by_embedding_clip_v2", {
            vector,
            limit: Math.max(limit * 2, 24),
            filter: (q) => q.eq("userId", userId),
          });
        } catch {
          return [];
        }
      })(),
      ctx
        .runQuery(api.people.searchPhotoIdsByPersonName, {
          userId,
          searchQuery: query,
        })
        .catch(() => []) as Promise<string[]>,
    ]);

    const semanticScores = new Map<string, number>();
    for (const result of semanticResults as any[]) {
      const score = normalizeSemanticScore(result._score ?? result.score);
      semanticScores.set(
        result._id,
        Math.max(score, semanticScores.get(result._id) ?? 0),
      );
    }

    const descriptionIds = new Set(
      (descriptionMatches ?? []).map((photo: any) => photo._id),
    );
    const personMatchedIds = new Set(personMatchedPhotoIds ?? []);
    const ranked = new Map<
      string,
      { photo: any; score: number; semantic: number; lexical: number }
    >();

    for (const photo of allPhotos) {
      if (!isSearchablePhoto(photo)) continue;
      if (intent.wantsVideos && !photo.mimeType?.startsWith("video/")) continue;
      if (intent.wantsPhotos && !photo.mimeType?.startsWith("image/")) continue;
      if (
        intent.years.length > 0 &&
        !intent.years.includes(
          new Date(
            photo.takenAt ?? photo.uploadedAt ?? photo._creationTime,
          ).getFullYear(),
        )
      ) {
        continue;
      }
      if (
        intent.hashtags.length > 0 &&
        !intent.hashtags.some((tag) => (photo.hashtags ?? []).includes(tag))
      ) {
        continue;
      }

      const semantic = semanticScores.get(photo._id) ?? 0;
      const lexical = keywordScore(photo, normalizeText(query), tokens);
      const descriptionBoost = descriptionIds.has(photo._id) ? 0.55 : 0;
      const personBoost = personMatchedIds.has(photo._id) ? 0.75 : 0;

      if (
        semantic <= 0 &&
        lexical <= 0 &&
        descriptionBoost <= 0 &&
        personBoost <= 0
      ) {
        continue;
      }

      const score =
        semantic * 0.62 +
        lexical * 0.28 +
        descriptionBoost +
        personBoost +
        (photo.isFavorite ? 0.04 : 0);

      ranked.set(photo._id, {
        photo,
        score,
        semantic,
        lexical,
      });
    }

    return Array.from(ranked.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((entry) => ({
        _id: entry.photo._id,
        _score: entry.score,
        semanticScore: entry.semantic,
        lexicalScore: entry.lexical,
        photo: entry.photo,
      }));
  },
});

export const similarToPhoto = action({
  args: {
    photoId: v.id("photos"),
    limit: v.optional(v.number()),
  },
  returns: v.any(),
  handler: async (ctx, args): Promise<any[]> => {
    const userId = await getAuthedUserId(ctx);
    const limit = Math.max(1, Math.min(args.limit ?? 20, 50));

    const photo: any = await ctx.runQuery(api.photos.getById, {
      photoId: args.photoId,
    });

    if (!photo || photo.userId !== userId || !photo.embeddingClipV2) {
      return [];
    }

    const results = await ctx.vectorSearch("photos", "by_embedding_clip_v2", {
      vector: photo.embeddingClipV2,
      limit: limit + 1,
      filter: (q) => q.eq("userId", userId),
    });

    const photos: any[] = await Promise.all(
      results.map((result: any) =>
        ctx
          .runQuery(api.photos.getById, { photoId: result._id })
          .catch(() => null),
      ),
    );

    return results
      .map((result: any, index: number) => ({
        ...result,
        photo: photos[index],
      }))
      .filter(
        (result: any) =>
          result._id !== args.photoId && isSearchablePhoto(result.photo),
      )
      .slice(0, limit);
  },
});
