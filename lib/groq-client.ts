const GROQ_API = "https://api.groq.com/openai/v1/chat/completions";
export const GROQ_DEFAULT_MODEL = "llama-3.3-70b-versatile";

export function getGroqApiKey(): string | undefined {
  return process.env.GROQ_API_KEY?.trim() || undefined;
}

export async function groqJsonCompletion(
  system: string,
  user: string,
  model = process.env.GROQ_MODEL || GROQ_DEFAULT_MODEL,
): Promise<string> {
  const apiKey = getGroqApiKey();
  if (!apiKey) throw new Error("GROQ_API_KEY is not configured on the server.");

  const res = await fetch(GROQ_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.7,
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: { message?: string } };
    throw new Error(err.error?.message || `Groq API error: ${res.status}`);
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error("Groq returned empty response.");
  return text;
}
