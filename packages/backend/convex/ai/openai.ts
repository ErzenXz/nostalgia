import { generateObject, generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

const CAPTION_PROMPT =
  "Describe what's happening in this photo in 1–2 short, concrete sentences. " +
  "Mention people (e.g. 'two people at a table'), place, activity, mood, or objects. " +
  "Use a warm, nostalgic tone when appropriate. Do not guess names. If unclear, say so briefly.\n\nContext: ";

export async function captionImageShort({
  imageUrl,
  hintText,
}: {
  imageUrl: string;
  hintText: string;
}): Promise<string> {
  requireEnv("OPENAI_API_KEY");
  const models = ["gpt-5-nano", "gpt-4o-mini"] as const;
  let lastErr: unknown;
  for (const modelId of models) {
    try {
      const { text } = await generateText({
        model: openai(modelId),
        temperature: 0.2,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: CAPTION_PROMPT + hintText,
              },
              { type: "image", image: imageUrl },
            ],
          },
        ],
        experimental_include: { requestBody: false, responseBody: false },
      });
      return (text ?? "").trim();
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr ?? new Error("Caption generation failed");
}

const TagsSchema = z.object({
  tags: z
    .array(z.string())
    .min(1)
    .max(24)
    .describe("Short lowercase tags, e.g. 'beach', 'birthday', 'snow'."),
});

export async function generateTags({
  captionShort,
  hintText,
}: {
  captionShort: string;
  hintText: string;
}): Promise<string[]> {
  requireEnv("OPENAI_API_KEY");
  const models = ["gpt-5-nano", "gpt-4o-mini"] as const;
  let lastErr: unknown;
  for (const modelId of models) {
    try {
      const { object } = await generateObject({
        model: openai(modelId),
        temperature: 0,
        schema: TagsSchema,
        prompt:
          "Generate up to 24 short lowercase tags for this photo. " +
          "Prefer concrete nouns and activities (e.g. beach, birthday, sunset). Avoid duplicates.\n\n" +
          `Caption: ${captionShort}\n` +
          `Context: ${hintText}`,
      });
      const normalized = (object.tags ?? [])
        .map((t) => String(t).trim().toLowerCase())
        .filter(Boolean);
      return Array.from(new Set(normalized)).slice(0, 24);
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr ?? new Error("Tag generation failed");
}
