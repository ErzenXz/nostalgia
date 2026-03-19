"use node";

/* eslint-disable @typescript-eslint/no-explicit-any */

import jpeg from "jpeg-js";

type HumanModule = {
  Human: new (config: Record<string, unknown>) => any;
};

type FaceDetection = {
  embedding: number[];
  confidence: number;
};

const HUMAN_MODULE_URL = new URL(
  "../../node_modules/@vladmandic/human/dist/human.node-wasm.js",
  import.meta.url,
);
const TFJS_WASM_PATH = new URL(
  "../../node_modules/@tensorflow/tfjs-backend-wasm/dist/",
  import.meta.url,
).href;
const HUMAN_MODEL_BASE_PATH = "https://vladmandic.github.io/human/models/";

let humanPromise: Promise<any> | null = null;

async function getHuman() {
  if (!humanPromise) {
    humanPromise = (async () => {
      const humanModule = (await import(
        HUMAN_MODULE_URL.href
      )) as unknown as HumanModule;
      const human = new humanModule.Human({
        backend: "wasm",
        wasmPath: TFJS_WASM_PATH,
        modelBasePath: HUMAN_MODEL_BASE_PATH,
        debug: false,
        async: true,
        face: {
          enabled: true,
          detector: {
            rotation: true,
            return: true,
            maxDetected: 8,
            minConfidence: 0.35,
          },
          mesh: { enabled: true },
          description: { enabled: true },
          emotion: { enabled: false },
          antispoof: { enabled: false },
          liveness: { enabled: false },
          age: { enabled: false },
          gender: { enabled: false },
          iris: { enabled: false },
        },
        body: { enabled: false },
        hand: { enabled: false },
        object: { enabled: false },
        gesture: { enabled: false },
        segmentation: { enabled: false },
      });

      await human.load();
      return human;
    })();
  }

  return await humanPromise;
}

export async function detectFaceEmbeddings(
  bytes: Uint8Array,
): Promise<FaceDetection[]> {
  const human = await getHuman();
  const decoded = jpeg.decode(bytes, { useTArray: true });
  const rgb = new Uint8Array(decoded.width * decoded.height * 3);

  for (let src = 0, dst = 0; src < decoded.data.length; src += 4, dst += 3) {
    rgb[dst] = decoded.data[src] ?? 0;
    rgb[dst + 1] = decoded.data[src + 1] ?? 0;
    rgb[dst + 2] = decoded.data[src + 2] ?? 0;
  }

  const tensor = human.tf.tensor3d(
    rgb,
    [decoded.height, decoded.width, 3],
    "int32",
  );

  try {
    const result = await human.detect(tensor);
    const faces = Array.isArray(result.face) ? result.face : [];

    return faces
      .filter(
        (face: any) =>
          Array.isArray(face.embedding) &&
          face.embedding.length > 0 &&
          Array.isArray(face.box) &&
          (face.box[2] ?? 0) >= 24 &&
          (face.box[3] ?? 0) >= 24,
      )
      .map((face: any) => ({
        embedding: face.embedding as number[],
        confidence: Math.max(face.score ?? 0, face.boxScore ?? 0),
      }));
  } finally {
    human.tf.dispose(tensor);
  }
}
