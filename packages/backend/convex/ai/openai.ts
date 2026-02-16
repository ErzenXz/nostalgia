import { generateObject, generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

export async function captionImageShort({
  imageUrl,
  hintText,
}: {
  imageUrl: string;
  hintText: string;
}): Promise<string> {
  // Fail fast at call time (Convex codegen/analyze shouldn't require secrets).
  requireEnv("OPENAI_API_KEY");
  const { text } = await generateText({
    model: openai("gpt-5-nano"),
    temperature: 0,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text:
              "Write 1-2 short sentences describing what's happening in the photo. " +
              "Be concrete. Avoid guessing names. If unsure, say so.\n\n" +
              `Context: ${hintText}`,
          },
          { type: "image", image: imageUrl },
        ],
      },
    ],
    // Avoid retaining large request/response bodies (image URLs or base64) in memory.
    experimental_include: { requestBody: false, responseBody: false },
  });

  return text.trim();
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
  const { object } = await generateObject({
    model: openai("gpt-5-nano"),
    temperature: 0,
    schema: TagsSchema,
    prompt:
      "Generate up to 24 short lowercase tags for this photo. " +
      "Prefer concrete nouns and activities. Avoid duplicates.\n\n" +
      `Caption: ${captionShort}\n` +
      `Context: ${hintText}`,
  });

  const normalized = object.tags
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);

  return Array.from(new Set(normalized)).slice(0, 24);
}
