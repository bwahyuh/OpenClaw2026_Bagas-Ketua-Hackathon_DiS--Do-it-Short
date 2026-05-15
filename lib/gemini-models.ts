/** Model IDs aligned with Gemini Canvas — safe to import from client UI */
export const SCRIPT_MODEL = "gemini-2.5-flash-preview-09-2025";
export const IMAGEN_MODEL = "imagen-4.0-generate-001";
/** Native Gemini image gen (free tier) — NOT *-image-preview (404 on v1beta) */
export const GEMINI_IMAGE_MODEL = "gemini-2.5-flash-image";

/** Order matters — each model has its own free-tier quota bucket */
export const GEMINI_IMAGE_MODEL_CANDIDATES = [
  "gemini-3.1-flash-image-preview",
  "gemini-3-pro-image-preview",
  "gemini-2.0-flash-preview-image-generation",
  "gemini-2.5-flash-image",
] as const;

/** Models that 404 on v1beta — never call */
export const GEMINI_IMAGE_MODEL_BLOCKLIST = ["gemini-2.5-flash-image-preview"] as const;
/** Primary TTS model (legacy alias) */
export const GEMINI_TTS_MODEL = "gemini-2.5-flash-tts";

/** Tried in order when quota/limit hits one model — each may have separate free-tier buckets */
export const GEMINI_TTS_MODEL_CANDIDATES = [
  "gemini-2.5-flash-lite-preview-tts",
  "gemini-2.5-flash-tts",
  "gemini-2.5-flash-preview-tts",
  "gemini-2.5-pro-tts",
  "gemini-2.5-pro-preview-tts",
] as const;
