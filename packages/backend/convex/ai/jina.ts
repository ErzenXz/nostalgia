const JINA_EMBEDDINGS_URL = "https://api.jina.ai/v1/embeddings";

export type JinaEmbedding = {
  embedding: number[];
};

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

async function postJson(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${requireEnv("JINA_API_KEY")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const message =
      (json && typeof json === "object" && (json as any).detail) ||
      (json && typeof json === "object" && (json as any).error) ||
      `HTTP ${res.status}`;
    const err = new Error(`Jina embeddings failed: ${message}`);
    (err as any).status = res.status;
    throw err;
  }

  return json as any;
}

export async function embedTextClipV2(text: string): Promise<number[]> {
  const json = await postJson(JINA_EMBEDDINGS_URL, {
    model: "jina-clip-v2",
    normalized: true,
    input: [text],
  });

  const vec = json?.data?.[0]?.embedding;
  if (!Array.isArray(vec)) throw new Error("Jina returned invalid embedding");
  return vec as number[];
}

export async function embedImageBytesClipV2(bytes: Uint8Array): Promise<number[]> {
  // Jina accepts images via `bytes` (base64) in the `input` array.
  const base64 = Buffer.from(bytes).toString("base64");

  const json = await postJson(JINA_EMBEDDINGS_URL, {
    model: "jina-clip-v2",
    normalized: true,
    input: [{ bytes: base64 }],
  });

  const vec = json?.data?.[0]?.embedding;
  if (!Array.isArray(vec)) throw new Error("Jina returned invalid embedding");
  return vec as number[];
}

