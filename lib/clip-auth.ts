import { getGroqApiKey } from "./groq-client.js";

/** Validate Groq API key (Clip "Access Token") */
export async function validateClipAccessToken(token: string): Promise<{ valid: boolean; message: string }> {
  const trimmed = token.trim();
  if (!trimmed) {
    return { valid: false, message: "Token is required." };
  }

  const serverKey = getGroqApiKey();
  if (serverKey && trimmed === serverKey) {
    return { valid: true, message: "Server Groq key accepted." };
  }

  if (!trimmed.startsWith("gsk_")) {
    return { valid: false, message: "Groq API keys usually start with gsk_" };
  }

  try {
    const res = await fetch("https://api.groq.com/openai/v1/models", {
      headers: { Authorization: `Bearer ${trimmed}` },
      signal: AbortSignal.timeout(10_000),
    });

    if (res.ok) {
      return { valid: true, message: "Groq API key is valid." };
    }

    const err = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
    return {
      valid: false,
      message: err.error?.message || `Groq rejected this key (HTTP ${res.status}).`,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not reach Groq API.";
    return { valid: false, message: msg };
  }
}
