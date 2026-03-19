import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

const REQUEST_TIMEOUT_MS = 45_000;
const PRIMARY_MODEL = "gpt-5.4-nano";
const FALLBACK_MODEL = "gpt-5-nano";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env var: ${name}`);
  return value;
}

function uniqueModelIds(ids: string[]) {
  return Array.from(new Set(ids.filter(Boolean)));
}

async function withTimeout<T>(
  promise: Promise<T>,
  label: string,
  timeoutMs = REQUEST_TIMEOUT_MS,
): Promise<T> {
  return await Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out`)), timeoutMs),
    ),
  ]);
}

function normalizeHashtag(value: string) {
  return String(value)
    .trim()
    .replace(/^#+/, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\s/g, "");
}

const PhotoMetadataSchema = z.object({
  titleShort: z
    .string()
    .min(4)
    .max(64)
    .describe("A short, human-sounding photo title of roughly 4 to 8 words."),
  captionShort: z
    .string()
    .min(4)
    .max(120)
    .describe("One compact line for cards and compact UI."),
  description: z
    .string()
    .min(16)
    .max(700)
    .describe(
      "A richer factual description in 2 to 4 sentences, warm but grounded.",
    ),
  peopleSummary: z
    .string()
    .min(0)
    .max(160)
    .describe(
      "Short factual summary of who appears, using renamed people only if explicitly provided.",
    ),
  visibleText: z
    .string()
    .min(0)
    .max(240)
    .describe(
      "Any clearly visible text worth indexing, or empty string if none is clearly legible.",
    ),
  sceneType: z
    .string()
    .min(2)
    .max(48)
    .describe(
      "Short scene label such as beach, dinner table, city street, concert.",
    ),
  mood: z
    .string()
    .min(2)
    .max(32)
    .describe(
      "Short grounded mood label such as calm, celebratory, cozy, energetic.",
    ),
  indoorOutdoor: z
    .enum(["indoor", "outdoor", "mixed", "unknown"])
    .describe("Whether the photo appears indoor, outdoor, mixed, or unknown."),
  activityLabels: z
    .array(z.string())
    .min(1)
    .max(8)
    .describe(
      "Concrete activity or event labels such as dining, hiking, birthday, sightseeing.",
    ),
  hashtags: z
    .array(z.string())
    .min(1)
    .max(5)
    .describe("Up to 5 short TikTok-style hashtags without leading #."),
  aiTagsV2: z
    .array(z.string())
    .min(5)
    .max(24)
    .describe(
      "Broader semantic tags for search and ranking. Lowercase, concrete, and diverse.",
    ),
});

export type GeneratedPhotoMetadata = z.infer<typeof PhotoMetadataSchema>;

export async function generatePhotoMetadata({
  imageUrl,
  hintText,
}: {
  imageUrl: string;
  hintText: string;
}): Promise<GeneratedPhotoMetadata> {
  requireEnv("OPENAI_API_KEY");

  const models = uniqueModelIds([PRIMARY_MODEL, FALLBACK_MODEL]);

  let lastError: unknown;

  for (const modelId of models) {
    try {
      const { object } = await withTimeout(
        generateObject({
          model: openai(modelId),
          temperature: 0.35,
          schema: PhotoMetadataSchema,
          schemaName: "photo_metadata",
          schemaDescription:
            "Structured metadata for an uploaded personal photo, including title, caption, description, hashtags, and semantic tags.",
          messages: [
            {
              role: "system",
              content:
                "You generate metadata for personal photo libraries. Be warm but factual. " +
                "Never invent facts, names, or locations. If people are named in the context, only use those exact names. " +
                "If no names are supplied, refer to people generically. Prefer grounded specifics about setting, activity, visual details, clothing, mood, and time cues. " +
                "When a real location is present in the context, incorporate it naturally in the description and hashtags. " +
                "Hashtags should feel social and concise, but still reflect real content in the photo.",
            },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text:
                    "Generate structured metadata for this photo.\n\n" +
                    "Requirements:\n" +
                    "- titleShort: 4-8 words, memorable but factual.\n" +
                    "- captionShort: one compact line.\n" +
                    "- description: 2-4 sentences, richer and more detailed than the caption.\n" +
                    "- hashtags: max 5, lowercase, no leading #.\n" +
                    "- aiTagsV2: broader semantic tags for search.\n" +
                    "- Use renamed people only if explicitly present in the context.\n" +
                    "- If there are unnamed faces, refer generically to people count or presence.\n" +
                    "- Do not guess exact relationships, identities, or private facts.\n\n" +
                    `Context: ${hintText}`,
                },
                { type: "image", image: imageUrl },
              ],
            },
          ],
        }),
        `Photo metadata generation on ${modelId}`,
      );

      const hashtags = Array.from(
        new Set((object.hashtags ?? []).map(normalizeHashtag).filter(Boolean)),
      ).slice(0, 5);

      const aiTagsV2 = Array.from(
        new Set(
          (object.aiTagsV2 ?? [])
            .map((tag) => String(tag).trim().toLowerCase())
            .filter(Boolean),
        ),
      ).slice(0, 24);

      if (
        !object.titleShort?.trim() ||
        !object.captionShort?.trim() ||
        !object.description?.trim() ||
        object.sceneType == null ||
        object.mood == null ||
        object.indoorOutdoor == null ||
        (object.activityLabels ?? []).length === 0 ||
        hashtags.length === 0 ||
        aiTagsV2.length === 0
      ) {
        throw new Error(
          `Photo metadata generation on ${modelId} returned incomplete data`,
        );
      }

      return {
        titleShort: object.titleShort.trim(),
        captionShort: object.captionShort.trim(),
        description: object.description.trim(),
        peopleSummary: object.peopleSummary?.trim() ?? "",
        visibleText: object.visibleText?.trim() ?? "",
        sceneType: object.sceneType.trim(),
        mood: object.mood.trim(),
        indoorOutdoor: object.indoorOutdoor,
        activityLabels: Array.from(
          new Set(
            (object.activityLabels ?? [])
              .map((value) => String(value).trim().toLowerCase())
              .filter(Boolean),
          ),
        ).slice(0, 8),
        hashtags,
        aiTagsV2,
      };
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError ?? new Error("Photo metadata generation failed");
}
