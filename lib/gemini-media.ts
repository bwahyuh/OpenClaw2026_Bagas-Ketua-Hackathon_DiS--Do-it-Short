import fs from "fs/promises";
import {
  SCRIPT_MODEL,
  IMAGEN_MODEL,
  GEMINI_IMAGE_MODEL,
  GEMINI_IMAGE_MODEL_CANDIDATES,
  GEMINI_IMAGE_MODEL_BLOCKLIST,
  GEMINI_TTS_MODEL,
  GEMINI_TTS_MODEL_CANDIDATES,
} from "./gemini-models.js";

export {
  SCRIPT_MODEL,
  IMAGEN_MODEL,
  GEMINI_IMAGE_MODEL,
  GEMINI_IMAGE_MODEL_CANDIDATES,
  GEMINI_TTS_MODEL,
  GEMINI_TTS_MODEL_CANDIDATES,
};

const GEMINI_API = "https://generativelanguage.googleapis.com/v1beta";

function getApiKey(): string {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not configured on the server.");
  return key;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Write 16-bit PCM WAV (mono) — matches Gemini Canvas client encoding */
export function pcmBase64ToWavBuffer(base64: string, sampleRate = 24000): Buffer {
  const binary = Buffer.from(base64, "base64");
  const numSamples = Math.floor(binary.length / 2);
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + numSamples * 2, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(numSamples * 2, 40);
  return Buffer.concat([header, binary]);
}

export async function writePcmBase64AsWav(
  base64: string,
  outPath: string,
  sampleRate = 24000,
): Promise<void> {
  const wav = pcmBase64ToWavBuffer(base64, sampleRate);
  await fs.writeFile(outPath, wav);
}

let imagenPaidPlanOnly = false;
let cachedImageModelIds: string[] | null = null;

function isImagenPaidPlanError(message: string): boolean {
  return /paid plan|only available on paid|billing|upgrade your account/i.test(message);
}

function isModelNotFoundError(message: string): boolean {
  return /not found|404|not supported for generateContent/i.test(message);
}

/** List image-capable Gemini models from the API */
export async function discoverGeminiImageModels(): Promise<string[]> {
  if (cachedImageModelIds?.length) return cachedImageModelIds;

  const apiKey = getApiKey();
  const discovered: string[] = [];

  try {
    const res = await fetch(`${GEMINI_API}/models?key=${apiKey}`);
    if (res.ok) {
      const data = (await res.json()) as {
        models?: { name?: string; supportedGenerationMethods?: string[] }[];
      };
      for (const m of data.models ?? []) {
        const id = m.name?.replace(/^models\//, "") ?? "";
        if (!id) continue;
        const methods = m.supportedGenerationMethods ?? [];
        const isImageModel =
          /image|imagen/i.test(id) &&
          !/embedding|vision-only/i.test(id) &&
          (methods.includes("generateContent") || methods.includes("predict") || /image/i.test(id));
        if (isImageModel && !/^imagen-/i.test(id)) {
          discovered.push(id);
        }
      }
    }
  } catch (e) {
    console.warn("[IMAGE] Could not list Gemini models:", e);
  }

  const block = new Set(GEMINI_IMAGE_MODEL_BLOCKLIST);
  const merged = [...GEMINI_IMAGE_MODEL_CANDIDATES, ...discovered, GEMINI_IMAGE_MODEL];
  const unique = [...new Set(merged.filter((id) => id && !/^imagen-/i.test(id) && !block.has(id)))];
  const rank = (id: string) => {
    const i = GEMINI_IMAGE_MODEL_CANDIDATES.indexOf(id as (typeof GEMINI_IMAGE_MODEL_CANDIDATES)[number]);
    return i === -1 ? 100 : i;
  };
  cachedImageModelIds = unique.sort((a, b) => rank(a) - rank(b));
  if (discovered.length) {
    console.log(`[IMAGE] Gemini image models: ${cachedImageModelIds.join(", ")}`);
  }
  return cachedImageModelIds;
}

async function requestGeminiImageContent(
  modelId: string,
  parts: { text?: string; inlineData?: { mimeType: string; data: string } }[],
): Promise<Buffer> {
  const apiKey = getApiKey();
  const url = `${GEMINI_API}/models/${modelId}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: { responseModalities: ["IMAGE"] },
    }),
  });

  const data = (await res.json().catch(() => ({}))) as {
    error?: { message?: string };
    candidates?: { content?: { parts?: { inlineData?: { data?: string } }[] } }[];
  };

  if (!res.ok) {
    throw new Error(data.error?.message || `Gemini image HTTP ${res.status}`);
  }
  if (data.error?.message) throw new Error(data.error.message);

  const b64 = data.candidates?.[0]?.content?.parts?.find((p) => p.inlineData)?.inlineData?.data;
  if (b64) return Buffer.from(b64, "base64");
  throw new Error("No image data in Gemini response");
}

export type GeminiImageResult = { buffer: Buffer; model: string } | null;

/** Try all available Gemini image models (text-to-image) */
export async function generateGeminiNativeImage(prompt: string): Promise<GeminiImageResult> {
  const models = await discoverGeminiImageModels();

  for (const modelId of models) {
    try {
      const buffer = await requestGeminiImageContent(modelId, [{ text: prompt }]);
      console.log(`[IMAGE] Success with model: ${modelId}`);
      return { buffer, model: modelId };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn(`[IMAGE] ${modelId} failed:`, msg.slice(0, 160));
      if (isModelNotFoundError(msg)) continue;
      // Try next model — free tier quotas are often per-model
      if (/quota|rate.?limit|429|RESOURCE_EXHAUSTED/i.test(msg)) continue;
    }
  }
  return null;
}

/** Free fallback when all Gemini image models are exhausted (no API key) */
export async function generatePollinationsImage(
  prompt: string,
  aspectRatio: string,
): Promise<Buffer | null> {
  const ar = imagenAspectRatio(aspectRatio);
  const size =
    ar === "16:9"
      ? { width: 1280, height: 720 }
      : ar === "1:1"
        ? { width: 1024, height: 1024 }
        : { width: 720, height: 1280 };

  const encoded = encodeURIComponent(prompt.slice(0, 800));
  const url = `https://image.pollinations.ai/prompt/${encoded}?width=${size.width}&height=${size.height}&nologo=true&enhance=true`;

  try {
    console.log("[IMAGE] Trying Pollinations fallback...");
    const res = await fetch(url, { signal: AbortSignal.timeout(180_000) });
    if (!res.ok) {
      console.warn(`[IMAGE] Pollinations HTTP ${res.status}`);
      return null;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 1000) return null;
    console.log("[IMAGE] Pollinations fallback succeeded");
    return buf;
  } catch (e) {
    console.warn("[IMAGE] Pollinations failed:", e);
    return null;
  }
}

/** Gemini image with reference — character / product consistency */
export async function generateGeminiImageWithRef(
  prompt: string,
  referenceBase64: string,
  mimeType = "image/png",
): Promise<GeminiImageResult> {
  const refData = referenceBase64.replace(/^data:image\/\w+;base64,/, "");
  const models = await discoverGeminiImageModels();

  for (const modelId of models) {
    try {
      const buffer = await requestGeminiImageContent(modelId, [
        { text: prompt },
        { inlineData: { mimeType, data: refData } },
      ]);
      console.log(`[IMAGE] Ref image success with model: ${modelId}`);
      return { buffer, model: modelId };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn(`[IMAGE] ${modelId} (ref) failed:`, msg.slice(0, 120));
      if (isModelNotFoundError(msg)) continue;
    }
  }
  return null;
}

/**
 * Imagen 4 — paid plans only; skipped after first "upgrade" error
 */
export async function generateImagenImage(
  prompt: string,
  aspectRatio: string,
  retries = 1,
): Promise<Buffer | null> {
  if (imagenPaidPlanOnly) return null;

  const apiKey = getApiKey();
  for (let i = 0; i < retries; i++) {
    try {
      const url = `${GEMINI_API}/models/${IMAGEN_MODEL}:predict?key=${apiKey}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instances: [{ prompt: prompt.trim() }],
          parameters: {
            sampleCount: 1,
            aspectRatio: imagenAspectRatio(aspectRatio),
          },
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        if (isImagenPaidPlanError(errText)) {
          imagenPaidPlanOnly = true;
          console.warn("[IMAGE] Imagen requires a paid plan — skipping Imagen for this session");
          return null;
        }
        throw new Error(`Imagen HTTP ${res.status}: ${errText.slice(0, 200)}`);
      }

      const data = (await res.json()) as {
        predictions?: { bytesBase64Encoded?: string }[];
      };
      const b64 = data.predictions?.[0]?.bytesBase64Encoded;
      if (b64) return Buffer.from(b64, "base64");
      throw new Error("No image data in Imagen response");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (isImagenPaidPlanError(msg)) {
        imagenPaidPlanOnly = true;
        console.warn("[IMAGE] Imagen requires a paid plan — skipping Imagen for this session");
        return null;
      }
      console.warn(`Imagen attempt ${i + 1}/${retries} failed:`, msg.slice(0, 120));
      if (i === retries - 1) return null;
      await sleep(1500);
    }
  }
  return null;
}

let cachedTtsModelIds: string[] | null = null;

function isQuotaOrRateLimitError(message: string): boolean {
  return /quota|rate.?limit|429|RESOURCE_EXHAUSTED|exceeded your current/i.test(message);
}

/** List TTS-capable models from the API, merged with known candidates */
export async function discoverGeminiTtsModels(): Promise<string[]> {
  if (cachedTtsModelIds?.length) return cachedTtsModelIds;

  const apiKey = getApiKey();
  const discovered: string[] = [];

  try {
    const res = await fetch(`${GEMINI_API}/models?key=${apiKey}`);
    if (res.ok) {
      const data = (await res.json()) as {
        models?: { name?: string; supportedGenerationMethods?: string[] }[];
      };
      for (const m of data.models ?? []) {
        const id = m.name?.replace(/^models\//, "") ?? "";
        if (!id) continue;
        const methods = m.supportedGenerationMethods ?? [];
        const looksLikeTts =
          /tts/i.test(id) ||
          (methods.includes("generateContent") && /tts|speech|audio/i.test(id));
        if (looksLikeTts) discovered.push(id);
      }
    }
  } catch (e) {
    console.warn("[TTS] Could not list Gemini models:", e);
  }

  const merged = [
    ...discovered,
    ...GEMINI_TTS_MODEL_CANDIDATES,
    GEMINI_TTS_MODEL,
  ];
  cachedTtsModelIds = [...new Set(merged)];
  if (discovered.length) {
    console.log(`[TTS] Available Gemini TTS models: ${cachedTtsModelIds.join(", ")}`);
  }
  return cachedTtsModelIds;
}

async function requestGeminiTtsOnce(
  modelId: string,
  text: string,
  voiceName: string,
): Promise<string> {
  const apiKey = getApiKey();
  const url = `${GEMINI_API}/models/${modelId}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text }] }],
      generationConfig: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceName || "Kore" } },
        },
      },
    }),
  });

  const errBody = (await res.json().catch(() => ({}))) as {
    error?: { message?: string };
    candidates?: { content?: { parts?: { inlineData?: { data?: string } }[] } }[];
  };

  if (!res.ok) {
    const msg = errBody.error?.message || `Gemini TTS failed (HTTP ${res.status})`;
    throw new Error(msg);
  }
  if (errBody.error?.message) throw new Error(errBody.error.message);

  const b64 = errBody.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (b64) return b64;
  throw new Error("No audio in TTS response");
}

export type GeminiTtsResult = { pcmBase64: string; model: string } | null;

/**
 * Try every available Gemini TTS model until one succeeds.
 * Rotates models when a model hits quota (free tier is often per-model).
 */
export async function generateGeminiTTS(
  text: string,
  voiceName: string,
  retriesPerModel = 1,
): Promise<GeminiTtsResult> {
  const models = await discoverGeminiTtsModels();

  for (const modelId of models) {
    for (let attempt = 0; attempt < retriesPerModel; attempt++) {
      try {
        const pcmBase64 = await requestGeminiTtsOnce(modelId, text, voiceName);
        console.log(`[TTS] Success with model: ${modelId}`);
        return { pcmBase64, model: modelId };
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.warn(`[TTS] ${modelId} attempt ${attempt + 1} failed:`, msg);

        if (isQuotaOrRateLimitError(msg)) {
          break;
        }
        if (attempt < retriesPerModel - 1) await sleep(1000);
      }
    }
  }

  return null;
}

export function buildSceneImagePrompt(
  visualPrompt: string,
  style: string,
  colorMood?: string,
): string {
  const mood =
    colorMood && colorMood !== "Natural" ? `, ${colorMood} color grading` : "";
  return `${visualPrompt.trim()}, ${style || "Photorealistic"}, masterpiece, highly detailed, 8k${mood}`;
}

/** Map UI aspect ratio to Imagen API values */
export function imagenAspectRatio(aspectRatio: string): string {
  if (aspectRatio === "16:9" || aspectRatio === "9:16" || aspectRatio === "1:1") {
    return aspectRatio;
  }
  return "9:16";
}
