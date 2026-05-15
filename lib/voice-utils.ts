import { GEMINI_VOICE_OPTIONS, GEMINI_TO_EDGE_VOICE } from "./create-form-options.js";

const VALID_GEMINI = new Set(GEMINI_VOICE_OPTIONS.map((v) => v.id));

/** Gemini TTS prebuilt voice id (e.g. Kore, Fenrir) */
export function resolveGeminiVoice(narrator: string | undefined): string {
  const raw = (narrator || "").trim();
  if (VALID_GEMINI.has(raw)) return raw;
  const fromEdge = Object.entries(GEMINI_TO_EDGE_VOICE).find(([, edge]) => edge === raw)?.[0];
  if (fromEdge && VALID_GEMINI.has(fromEdge)) return fromEdge;
  return "Kore";
}

/** Edge TTS neural voice id */
export function resolveEdgeVoice(narrator: string | undefined): string {
  const raw = (narrator || "").trim();
  if (raw.includes("-")) return raw;
  return GEMINI_TO_EDGE_VOICE[raw] ?? "en-US-JennyNeural";
}
