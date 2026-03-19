/* eslint-disable @typescript-eslint/no-explicit-any */

import {
  query,
  mutation,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";

const PERSON_MATCH_THRESHOLD = 0.54;

function dot(a: number[], b: number[]) {
  let sum = 0;
  const length = Math.min(a.length, b.length);
  for (let index = 0; index < length; index += 1) {
    sum += (a[index] ?? 0) * (b[index] ?? 0);
  }
  return sum;
}

function magnitude(a: number[]) {
  return Math.sqrt(dot(a, a));
}

function cosineSimilarity(a: number[], b: number[]) {
  const denom = magnitude(a) * magnitude(b);
  if (!denom) return 0;
  return dot(a, b) / denom;
}

function normalizeEmbedding(values: number[]) {
  const length = magnitude(values);
  if (!length) return values;
  return values.map((value) => value / length);
}

function mergeEmbedding(
  current: number[] | undefined,
  next: number[],
  weight: number,
) {
  if (!current || current.length === 0) return normalizeEmbedding(next);
  const merged = current.map(
    (value, index) => value * weight + (next[index] ?? 0),
  );
  return normalizeEmbedding(merged);
}

async function clearPhotoAssociations(ctx: any, photoId: Id<"photos">) {
  const existingLinks = await ctx.db
    .query("photoPeople")
    .withIndex("by_photo", (q: any) => q.eq("photoId", photoId))
    .collect();

  for (const link of existingLinks) {
    await ctx.db.delete(link._id);
  }

  const affectedPersonIds = Array.from(
    new Set(existingLinks.map((link: any) => link.personId)),
  );

  for (const personId of affectedPersonIds) {
    const person = await ctx.db.get(personId);
    if (!person) continue;

    const remainingLinks = await ctx.db
      .query("photoPeople")
      .withIndex("by_person", (q: any) => q.eq("personId", personId))
      .collect();

    if (remainingLinks.length === 0) {
      await ctx.db.delete(personId);
      continue;
    }

    const nextCoverPhotoId =
      person.coverPhotoId === photoId
        ? remainingLinks[0]?.photoId
        : person.coverPhotoId;

    await ctx.db.patch(personId, {
      photoCount: remainingLinks.length,
      coverPhotoId: nextCoverPhotoId,
    });
  }
}

export const list = query({
  args: { userId: v.id("users") },
  returns: v.any(),
  handler: async (ctx, args) => {
    const people = await ctx.db
      .query("people")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();

    return people.sort((a, b) => {
      if (b.photoCount !== a.photoCount) return b.photoCount - a.photoCount;
      return b.createdAt - a.createdAt;
    });
  },
});

export const rename = mutation({
  args: {
    personId: v.id("people"),
    name: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.personId, { name: args.name });
    return null;
  },
});

export const merge = mutation({
  args: {
    sourcePersonId: v.id("people"),
    targetPersonId: v.id("people"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    if (args.sourcePersonId === args.targetPersonId) return null;

    const source = await ctx.db.get(args.sourcePersonId);
    const target = await ctx.db.get(args.targetPersonId);
    if (!source || !target || source.userId !== target.userId) return null;

    const sourceLinks = await ctx.db
      .query("photoPeople")
      .withIndex("by_person", (q) => q.eq("personId", args.sourcePersonId))
      .collect();
    const targetLinks = await ctx.db
      .query("photoPeople")
      .withIndex("by_person", (q) => q.eq("personId", args.targetPersonId))
      .collect();

    const targetPhotoIds = new Set(
      targetLinks.map((link) => String(link.photoId)),
    );
    for (const link of sourceLinks) {
      if (targetPhotoIds.has(String(link.photoId))) {
        await ctx.db.delete(link._id);
        continue;
      }
      await ctx.db.patch(link._id, { personId: args.targetPersonId });
    }

    const mergedEmbedding = mergeEmbedding(
      target.faceEmbedding as number[] | undefined,
      (source.faceEmbedding as number[] | undefined) ?? [],
      Math.max(1, target.photoCount),
    );

    const finalLinks = await ctx.db
      .query("photoPeople")
      .withIndex("by_person", (q) => q.eq("personId", args.targetPersonId))
      .collect();

    await ctx.db.patch(args.targetPersonId, {
      faceEmbedding: mergedEmbedding,
      photoCount: finalLinks.length,
      coverPhotoId: target.coverPhotoId ?? source.coverPhotoId,
      name: target.name ?? source.name,
    });
    await ctx.db.delete(args.sourcePersonId);
    return null;
  },
});

export const detachPhoto = mutation({
  args: {
    personId: v.id("people"),
    photoId: v.id("photos"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const links = await ctx.db
      .query("photoPeople")
      .withIndex("by_photo", (q) => q.eq("photoId", args.photoId))
      .collect();

    for (const link of links) {
      if (link.personId === args.personId) {
        await ctx.db.delete(link._id);
      }
    }

    const remaining = await ctx.db
      .query("photoPeople")
      .withIndex("by_person", (q) => q.eq("personId", args.personId))
      .collect();

    if (remaining.length === 0) {
      await ctx.db.delete(args.personId);
      return null;
    }

    const person = await ctx.db.get(args.personId);
    if (!person) return null;

    await ctx.db.patch(args.personId, {
      photoCount: remaining.length,
      coverPhotoId:
        person.coverPhotoId === args.photoId
          ? remaining[0]?.photoId
          : person.coverPhotoId,
    });
    return null;
  },
});

export const getPhotosByPerson = query({
  args: { personId: v.id("people") },
  returns: v.any(),
  handler: async (ctx, args) => {
    const photoPeople = await ctx.db
      .query("photoPeople")
      .withIndex("by_person", (q) => q.eq("personId", args.personId))
      .collect();

    const photos = await Promise.all(
      photoPeople.map(async (pp) => {
        return await ctx.db.get(pp.photoId);
      }),
    );

    return photos.filter(Boolean);
  },
});

export const getCooccurrenceByPerson = query({
  args: { personId: v.id("people") },
  returns: v.any(),
  handler: async (ctx, args) => {
    const links = await ctx.db
      .query("photoPeople")
      .withIndex("by_person", (q) => q.eq("personId", args.personId))
      .collect();

    const counts = new Map<string, number>();
    for (const link of links) {
      const coLinks = await ctx.db
        .query("photoPeople")
        .withIndex("by_photo", (q) => q.eq("photoId", link.photoId))
        .collect();
      for (const coLink of coLinks) {
        if (coLink.personId === args.personId) continue;
        counts.set(
          String(coLink.personId),
          (counts.get(String(coLink.personId)) ?? 0) + 1,
        );
      }
    }

    const rows = await Promise.all(
      Array.from(counts.entries()).map(async ([personId, count]) => ({
        person: await ctx.db.get(personId as Id<"people">),
        count,
      })),
    );

    return rows.filter((row) => !!row.person).sort((a, b) => b.count - a.count);
  },
});

export const searchPhotoIdsByPersonName = query({
  args: {
    userId: v.id("users"),
    searchQuery: v.string(),
  },
  returns: v.array(v.id("photos")),
  handler: async (ctx, args) => {
    const query = args.searchQuery.trim().toLowerCase();
    if (!query) return [];

    const people = await ctx.db
      .query("people")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    const matchingPeople = people.filter((person) =>
      (person.name ?? "").trim().toLowerCase().includes(query),
    );

    const photoIds = new Set<Id<"photos">>();
    for (const person of matchingPeople) {
      const links = await ctx.db
        .query("photoPeople")
        .withIndex("by_person", (q) => q.eq("personId", person._id))
        .collect();
      for (const link of links) {
        photoIds.add(link.photoId);
      }
    }

    return Array.from(photoIds);
  },
});

export const getNamesByPhotoIds = query({
  args: { photoIds: v.array(v.id("photos")) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const rows = await Promise.all(
      args.photoIds.map(async (photoId) => {
        const links = await ctx.db
          .query("photoPeople")
          .withIndex("by_photo", (q) => q.eq("photoId", photoId))
          .collect();

        const people = await Promise.all(
          links.map(async (link) => await ctx.db.get(link.personId)),
        );

        return {
          photoId,
          names: people.map((person) => person?.name?.trim()).filter(Boolean),
        };
      }),
    );

    return rows;
  },
});

export const syncPhotoFaces = internalMutation({
  args: {
    userId: v.id("users"),
    photoId: v.id("photos"),
    faces: v.array(
      v.object({
        embedding: v.array(v.float64()),
        confidence: v.float64(),
      }),
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await clearPhotoAssociations(ctx, args.photoId);

    const currentPeople = (await ctx.db
      .query("people")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect()) as any[];

    const usedPersonIds = new Set<string>();

    for (const face of args.faces) {
      const normalizedEmbedding = normalizeEmbedding(face.embedding);
      let bestPerson: any = null;
      let bestSimilarity = 0;

      for (const person of currentPeople) {
        if (usedPersonIds.has(String(person._id))) continue;
        if (
          !Array.isArray(person.faceEmbedding) ||
          person.faceEmbedding.length === 0
        )
          continue;

        const similarity = cosineSimilarity(
          normalizedEmbedding,
          person.faceEmbedding as number[],
        );
        if (similarity > bestSimilarity) {
          bestSimilarity = similarity;
          bestPerson = person;
        }
      }

      if (bestPerson && bestSimilarity >= PERSON_MATCH_THRESHOLD) {
        const updatedEmbedding = mergeEmbedding(
          bestPerson.faceEmbedding as number[] | undefined,
          normalizedEmbedding,
          Math.max(1, bestPerson.photoCount),
        );

        await ctx.db.patch(bestPerson._id, {
          faceEmbedding: updatedEmbedding,
          photoCount: bestPerson.photoCount + 1,
          coverPhotoId: bestPerson.coverPhotoId ?? args.photoId,
        });

        await ctx.db.insert("photoPeople", {
          photoId: args.photoId,
          personId: bestPerson._id,
          confidence: Math.max(face.confidence, bestSimilarity),
        });

        bestPerson.photoCount += 1;
        bestPerson.faceEmbedding = updatedEmbedding;
        usedPersonIds.add(String(bestPerson._id));
        continue;
      }

      const personId: Id<"people"> = await ctx.db.insert("people", {
        userId: args.userId,
        name: undefined,
        faceEmbedding: normalizedEmbedding,
        photoCount: 1,
        coverPhotoId: args.photoId,
        createdAt: Date.now(),
      });

      await ctx.db.insert("photoPeople", {
        photoId: args.photoId,
        personId,
        confidence: face.confidence,
      });

      currentPeople.push({
        _id: personId,
        userId: args.userId,
        faceEmbedding: normalizedEmbedding,
        photoCount: 1,
        coverPhotoId: args.photoId,
        createdAt: Date.now(),
      });
      usedPersonIds.add(String(personId));
    }

    return null;
  },
});

export const removePhotoAssociations = internalMutation({
  args: { photoId: v.id("photos") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await clearPhotoAssociations(ctx, args.photoId);
    return null;
  },
});

export const previewFaceMatches = internalQuery({
  args: {
    userId: v.id("users"),
    faces: v.array(
      v.object({
        embedding: v.array(v.float64()),
        confidence: v.float64(),
      }),
    ),
  },
  returns: v.object({
    totalFaces: v.number(),
    namedPeople: v.array(v.string()),
    unnamedMatchedCount: v.number(),
  }),
  handler: async (ctx, args) => {
    const people = await ctx.db
      .query("people")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    const usedPersonIds = new Set<string>();
    const namedPeople = new Set<string>();
    let unnamedMatchedCount = 0;

    for (const face of args.faces) {
      const normalizedEmbedding = normalizeEmbedding(face.embedding);
      let bestPerson: any = null;
      let bestSimilarity = 0;

      for (const person of people) {
        if (usedPersonIds.has(String(person._id))) continue;
        if (
          !Array.isArray(person.faceEmbedding) ||
          person.faceEmbedding.length === 0
        ) {
          continue;
        }

        const similarity = cosineSimilarity(
          normalizedEmbedding,
          person.faceEmbedding as number[],
        );
        if (similarity > bestSimilarity) {
          bestSimilarity = similarity;
          bestPerson = person;
        }
      }

      if (!bestPerson || bestSimilarity < PERSON_MATCH_THRESHOLD) continue;

      usedPersonIds.add(String(bestPerson._id));
      if (bestPerson.name?.trim()) {
        namedPeople.add(bestPerson.name.trim());
      } else {
        unnamedMatchedCount += 1;
      }
    }

    return {
      totalFaces: args.faces.length,
      namedPeople: Array.from(namedPeople),
      unnamedMatchedCount,
    };
  },
});
