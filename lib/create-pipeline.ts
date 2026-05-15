import path from "path";
import fs from "fs/promises";
import sharp from "sharp";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import ffprobePath from "ffprobe-static";
import { EdgeTTS } from "edge-tts-universal";
import { GoogleGenAI, Type } from "@google/genai";
import type { CreateFormPayload, GeneratedScript, SceneScript, VideoProject } from "./create-types.js";
import { GEMINI_TO_EDGE_VOICE, TONE_PROMPTS } from "./create-form-options.js";
import {
  SCRIPT_MODEL,
  buildSceneImagePrompt,
  generateGeminiImageWithRef,
  generateGeminiNativeImage,
  generateGeminiTTS,
  generateImagenImage,
  generatePollinationsImage,
  writePcmBase64AsWav,
} from "./gemini-media.js";
import { getGroqApiKey, groqJsonCompletion } from "./groq-client.js";
import { updateJob, failJob, completeJob } from "./job-store.js";
import { resolveGeminiVoice, resolveEdgeVoice } from "./voice-utils.js";
import {
  prepareSubtitleTextFile,
  subtitleFilterFromTextFile,
} from "./video-subtitles.js";

if (ffmpegPath) {
  ffmpeg.setFfmpegPath(ffmpegPath);
}
if (typeof ffprobePath === "string") {
  ffmpeg.setFfprobePath(ffprobePath);
} else if (ffprobePath?.path) {
  ffmpeg.setFfprobePath(ffprobePath.path);
}

const GENERATED_DIR = path.join(process.cwd(), "generated");
const PROJECTS_DIR = path.join(process.cwd(), "projects_cache");

const STEP_LABELS = [
  "Initializing Core",
  "Generating Narrative",
  "Rendering Visuals",
  "Synthesizing Voice",
  "Assembling Video",
  "Finalizing Export",
];

function paletteForStyle(style: string): [string, string] {
  const s = style.toLowerCase();
  if (s.includes("ghibli") || s.includes("watercolor") || s.includes("pastel")) return ["#0d3b2e", "#2d6a4f"];
  if (s.includes("anime") || s.includes("retro 80s")) return ["#2d1b4e", "#e85d75"];
  if (s.includes("cyberpunk") || s.includes("neon") || s.includes("synthwave")) return ["#1a0a2e", "#3d1a78"];
  if (s.includes("horror") || s.includes("gothic") || s.includes("dark")) return ["#1c1018", "#4a1942"];
  if (s.includes("wayang")) return ["#3d2314", "#8b4513"];
  if (s.includes("cinematic") || s.includes("4k") || s.includes("unreal")) return ["#0f172a", "#1e3a5f"];
  return ["#0f172a", "#164e63"];
}

function escapeXml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function wrapText(text: string, maxChars = 42) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > maxChars && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, 4);
}

function getDimensions(aspectRatio: CreateFormPayload["aspectRatio"]) {
  if (aspectRatio === "16:9") return { width: 1920, height: 1080 };
  if (aspectRatio === "1:1") return { width: 1080, height: 1080 };
  return { width: 1080, height: 1920 };
}

function voiceFor(form: CreateFormPayload): string {
  return form.audioEngine === "gemini"
    ? resolveGeminiVoice(form.narrator)
    : resolveEdgeVoice(form.narrator);
}

function legacyForm(raw: CreateFormPayload & Record<string, unknown>): CreateFormPayload {
  const aspectRatio =
    raw.aspectRatio ||
    (raw.format as CreateFormPayload["aspectRatio"]) ||
    "9:16";
  return {
    useBuiltInGemini: raw.useBuiltInGemini !== false,
    apiEngine: String(raw.apiEngine || "gemini"),
    viralPreset: String(raw.viralPreset || raw.conceptStrategy || "custom"),
    productName: String(raw.productName || ""),
    productBenefits: String(raw.productBenefits || ""),
    productImage: (raw.productImage as string | null) ?? null,
    videoConcept: String(raw.videoConcept || "storytelling"),
    topic: String(raw.topic || raw.topicIdea || raw.videoConcept || ""),
    topicContext: String(raw.topicContext || raw.additionalDetails || ""),
    narrativeStructure: String(raw.narrativeStructure || raw.storyStructure || "Chronological"),
    scriptStyle: raw.scriptStyle === "dialog" ? "dialog" : "narration",
    duration: String(raw.duration || "60"),
    platform: String(raw.platform || "youtube_shorts"),
    aspectRatio,
    numScenes: Number(raw.numScenes) || 5,
    style: String(raw.style || raw.visualTone || "Photorealistic"),
    language: String(raw.language || "English"),
    tone: String(raw.tone || "friendly_pal"),
    colorMood: String(raw.colorMood || "Natural"),
    audioEngine: raw.audioEngine === "gemini" ? "gemini" : "edge",
    narrator: String(
      raw.narrator ||
        raw.voiceActor ||
        (raw.audioEngine === "gemini" ? "Kore" : "en-US-JennyNeural"),
    ),
    voiceSpeed: Number(raw.voiceSpeed) || 1,
    includeCTA: raw.includeCTA === true || String(raw.includeCTA) === "true",
    useThumbnail: raw.useThumbnail === true || String(raw.useThumbnail) === "true",
    ctaText: String(raw.ctaText || "Don't forget to Like & Subscribe for more!"),
    charImage: (raw.charImage as string | null) ?? null,
  };
}

function normalizeSpeed(speed: unknown): number {
  const n = typeof speed === "number" ? speed : Number(speed);
  if (!Number.isFinite(n) || n <= 0) return 1.0;
  return Math.min(2, Math.max(0.5, n));
}

function rateFor(speed: unknown) {
  const safe = normalizeSpeed(speed);
  const pct = Math.round((safe - 1) * 100);
  const clamped = Math.max(-50, Math.min(100, pct));
  const sign = clamped >= 0 ? "+" : "";
  return `${sign}${clamped}%`;
}

function normalizeForm(raw: CreateFormPayload): CreateFormPayload {
  const form = legacyForm(raw as CreateFormPayload & Record<string, unknown>);
  const numScenes = Number(form.numScenes);
  const duration = Math.min(1800, Math.max(5, parseInt(form.duration, 10) || 60));
  return {
    ...form,
    numScenes: Number.isFinite(numScenes) ? Math.min(20, Math.max(1, numScenes)) : 5,
    voiceSpeed: normalizeSpeed(form.voiceSpeed),
    duration: String(duration),
    topic: form.topic.trim(),
  };
}

function estimateAudioDurationSec(text: string, speed: number): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const wpm = 140 * speed;
  const secs = words > 0 ? (words / wpm) * 60 : 3;
  return Math.max(2.5, Math.min(secs + 0.4, 45));
}

function thumbnailColorFor(style: string) {
  const s = style.toLowerCase();
  if (s.includes("ghibli") || s.includes("anime")) return "from-pink-500/20 to-rose-500/20";
  if (s.includes("cyberpunk") || s.includes("neon")) return "from-purple-500/20 to-pink-500/20";
  if (s.includes("cinematic")) return "from-cyan-500/20 to-blue-500/20";
  return "from-emerald-500/20 to-teal-500/20";
}

function cleanJson(text: string): string {
  return text.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
}

async function generateScript(form: CreateFormPayload): Promise<GeneratedScript> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured on the server.");

  const sceneCount = form.numScenes;
  const targetSeconds = parseInt(form.duration, 10) || 60;
  const narrationHint =
    targetSeconds <= 60
      ? "- Short Content Mode: ONLY 1-2 short sentences per scene."
      : "- Long Content Mode: Write a detailed paragraph (max 5-10 sentences) per scene.";

  const styleInstruction =
    form.scriptStyle === "dialog"
      ? "SCRIPT STYLE: Dialog/Conversation. Write engaging back-and-forth dialogue between characters."
      : "SCRIPT STYLE: Voiceover Narration. Write standard professional voiceover text.";

  let nicheVisuals = "";
  if (form.viralPreset === "wayang") nicheVisuals = "Visual style: Indonesian Wayang Kulit shadow puppetry.";
  if (form.viralPreset === "bedtime_story") nicheVisuals = "Visual style: Soft dreamy watercolor, pastel night colors.";

  let continuityInstruction =
    "\nNARRATIVE & VISUAL CONTINUITY: Ensure logical flow. Keep backgrounds consistent across scenes.";
  if (form.videoConcept === "storytelling") {
    continuityInstruction +=
      "\nSTORY MODE: Single continuous story. Same characters and logical setting progression.";
  }
  if (form.viralPreset === "affiliate" && form.productName) {
    continuityInstruction += `\nAFFILIATE MODE: Product "${form.productName}" must appear consistently in visuals where relevant.`;
  }

  const affiliateBlock =
    form.viralPreset === "affiliate" && form.productName
      ? `PRODUCT MODE:\n- Product: "${form.productName}"\n- Benefits: "${form.productBenefits || ""}"\n- Framework: ${form.narrativeStructure}`
      : "";

  const toneInstruction = TONE_PROMPTS[form.tone] || "Standard narration.";
  const ctaInstruction = form.includeCTA
    ? `5. OUTRO/CTA: "${form.ctaText}"`
    : "5. OUTRO: Conclude naturally without CTA.";
  const contextBlock = form.topicContext
    ? `\nADDITIONAL CONTEXT:\n"${form.topicContext}"`
    : "";

  const motionIds =
    "zoomIn,zoomOut,panLeft,panRight,droneZoom,opticalFlowSmooth,static,pulse,breathing";

  const systemInstruction =
    "You are a professional fiction writer and video director. Respond in valid JSON only.";

  const prompt = `Task: Create JSON for a ${form.platform} video (${form.aspectRatio}).
SETTINGS:
- Topic: "${form.topic}" (${form.viralPreset})
- Mood: ${form.colorMood}
- Language: ${form.language}
- Visual style: ${form.style}
- Narrative structure: ${form.narrativeStructure}
${styleInstruction}
CRITICAL:
- Target duration: ${targetSeconds} seconds.
- Generate EXACTLY ${sceneCount} scenes.
- Video concept: ${form.videoConcept}
${narrationHint}
${nicheVisuals}
${continuityInstruction}
${contextBlock}

STRICT NARRATIVE STRUCTURE:
1. Introduction (Character & Setting)
2. Conflict Trigger
3. Climax
4. Resolution
${ctaInstruction}

${affiliateBlock}
TONE FOR NARRATION WRITING: ${toneInstruction}

CRITICAL VISUAL RULE: For EVERY scene's "visual_prompts" array, write a detailed image generation prompt in English describing the shot (characters, action, setting, lighting). Repeat exact character anchor details when the same character appears.

Choose motion_id from: [${motionIds}].

OUTPUT JSON ONLY:
{
  "marketing": { "title": "...", "description": "...", "tags": [], "hashtags": [] },
  "thumbnail_prompt": "YouTube thumbnail prompt in English...",
  "scenes": [
    { "id": 1, "narration": "...", "visual_prompts": ["Detailed shot prompt..."], "motion_id": "zoomIn" }
  ]
}`;

  let text: string | undefined;

  if (getGroqApiKey()) {
    text = await groqJsonCompletion(
      `${systemInstruction} Output ONLY valid JSON without markdown.`,
      prompt,
    );
  } else {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${SCRIPT_MODEL}:generateContent?key=${apiKey}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${systemInstruction}\n\n${prompt}` }] }],
        generationConfig: { responseMimeType: "application/json" },
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Script generation failed: ${res.status} ${errText.slice(0, 300)}`);
    }

    const data = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  }

  if (!text) throw new Error("AI returned empty script.");

  const json = JSON.parse(cleanJson(text)) as {
    marketing?: { title?: string };
    thumbnail_prompt?: string;
    scenes?: {
      narration?: string;
      visual_prompts?: string[];
      description?: string;
      motion_id?: string;
    }[];
    title?: string;
  };

  if (!json.scenes?.length) throw new Error("AI did not return valid scenes array.");

  const title =
    json.marketing?.title || json.title || form.topic || "Untitled Project";

  const scenes: SceneScript[] = json.scenes.slice(0, sceneCount).map((s) => {
    const visual_prompts = Array.isArray(s.visual_prompts)
      ? s.visual_prompts.filter(Boolean)
      : s.description
        ? [s.description]
        : [form.topic];
    return {
      narration: String(s.narration || "").trim(),
      visual_prompts,
      description: visual_prompts[0],
      motion_id: s.motion_id,
    };
  });

  return { title, thumbnail_prompt: json.thumbnail_prompt, scenes, marketing: json.marketing };
}

export type SceneImageResult =
  | { ok: true; source: "imagen" | "gemini" | "gemini_ref" | "pollinations"; model?: string }
  | { ok: false };

async function generateSceneImageFromAI(
  scene: SceneScript,
  form: CreateFormPayload,
  outPath: string,
  referenceImage?: string | null,
): Promise<SceneImageResult> {
  const visual =
    scene.visual_prompts?.[0] || scene.description || form.topic || "cinematic scene";
  const prompt = buildSceneImagePrompt(visual, form.style, form.colorMood);

  // 1. Gemini native image (works on free tier with gemini-2.5-flash-image)
  const geminiResult = await generateGeminiNativeImage(prompt);
  if (geminiResult?.buffer) {
    await sharp(geminiResult.buffer).png().toFile(outPath);
    return { ok: true, source: "gemini", model: geminiResult.model };
  }

  // 2. Gemini with character / product reference
  if (referenceImage?.startsWith("data:image")) {
    const refResult = await generateGeminiImageWithRef(prompt, referenceImage);
    if (refResult?.buffer) {
      await sharp(refResult.buffer).png().toFile(outPath);
      return { ok: true, source: "gemini_ref", model: refResult.model };
    }
  }

  // 3. Imagen 4 (paid only)
  const imagenBuf = await generateImagenImage(prompt, form.aspectRatio);
  if (imagenBuf) {
    await sharp(imagenBuf).png().toFile(outPath);
    return { ok: true, source: "imagen" };
  }

  // 4. Pollinations (free, no Gemini quota) — real images when API limits hit
  const pollBuf = await generatePollinationsImage(prompt, form.aspectRatio);
  if (pollBuf) {
    await sharp(pollBuf).png().toFile(outPath);
    return { ok: true, source: "pollinations", model: "pollinations-flux" };
  }

  return { ok: false };
}

async function renderSceneImageFallback(
  scene: SceneScript,
  index: number,
  title: string,
  form: CreateFormPayload,
  outPath: string,
  charImage?: string | null,
) {
  const { width, height } = getDimensions(form.aspectRatio);
  const [c1, c2] = paletteForStyle(form.style);
  const lines = wrapText(scene.visual_prompts?.[0] || scene.description || scene.narration);
  const narrationLines = wrapText(scene.narration, 36);
  const tspansDesc = lines
    .map((l, i) => `<tspan x="50%" dy="${i === 0 ? 0 : 38}" text-anchor="middle">${escapeXml(l)}</tspan>`)
    .join("");
  const tspansNarr = narrationLines
    .map((l, i) => `<tspan x="50%" dy="${i === 0 ? 0 : 32}" text-anchor="middle">${escapeXml(l)}</tspan>`)
    .join("");

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${c1}"/>
      <stop offset="100%" stop-color="${c2}"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#bg)"/>
  <text x="50%" y="12%" text-anchor="middle" fill="#67e8f9" font-size="28" font-family="Arial, sans-serif" font-weight="700">${escapeXml(title)}</text>
  <text x="50%" y="22%" text-anchor="middle" fill="#ffffff" font-size="52" font-family="Arial, sans-serif" font-weight="800">${escapeXml(`SCENE ${index + 1}`)}</text>
  <text x="50%" y="32%" text-anchor="middle" fill="#e2e8f0" font-size="36" font-family="Arial, sans-serif">${tspansDesc}</text>
  <rect x="8%" y="68%" width="84%" height="22%" rx="24" fill="rgba(0,0,0,0.45)"/>
  <text x="50%" y="72%" text-anchor="middle" fill="#ffffff" font-size="32" font-family="Arial, sans-serif" font-weight="600">${tspansNarr}</text>
</svg>`;

  let pipeline = sharp(Buffer.from(svg)).png();

  if (charImage?.startsWith("data:image")) {
    const base64 = charImage.split(",")[1];
    const overlay = Buffer.from(base64, "base64");
    const resized = await sharp(overlay)
      .resize(Math.round(width * 0.22), Math.round(height * 0.22), { fit: "cover" })
      .png()
      .toBuffer();
    pipeline = pipeline.composite([{ input: resized, top: Math.round(height * 0.08), left: Math.round(width * 0.06) }]);
  }

  await pipeline.toFile(outPath);
}

async function synthesizeEdgeSpeech(text: string, voice: string, speed: number, outPath: string) {
  const tts = new EdgeTTS(text, voice, { rate: rateFor(speed) });
  const result = await tts.synthesize();
  const buffer = Buffer.from(await result.audio.arrayBuffer());
  await fs.writeFile(outPath, buffer);
}

function wavToMp3(wavPath: string, mp3Path: string): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg(wavPath)
      .outputOptions(["-acodec libmp3lame", "-q:a 4"])
      .save(mp3Path)
      .on("end", () => resolve())
      .on("error", reject);
  });
}

async function synthesizeSpeech(
  text: string,
  form: CreateFormPayload,
  outPath: string,
) {
  const trimmed = text.trim() || " ";

  if (form.audioEngine === "gemini") {
    const ttsResult = await generateGeminiTTS(trimmed, voiceFor(form));
    if (ttsResult?.pcmBase64) {
      const wavPath = outPath.replace(/\.mp3$/i, ".wav");
      await writePcmBase64AsWav(ttsResult.pcmBase64, wavPath);
      const tempo = Math.min(2, Math.max(0.5, normalizeSpeed(form.voiceSpeed)));
      if (Math.abs(tempo - 1) > 0.05) {
        await new Promise<void>((resolve, reject) => {
          ffmpeg(wavPath)
            .audioFilters(`atempo=${tempo}`)
            .outputOptions(["-acodec libmp3lame", "-q:a 4"])
            .save(outPath)
            .on("end", () => resolve())
            .on("error", reject);
        });
      } else {
        await wavToMp3(wavPath, outPath);
      }
      await fs.unlink(wavPath).catch(() => {});
      return;
    }

    console.warn(
      "[TTS] All Gemini TTS models unavailable (quota or limits) — falling back to Edge TTS",
    );
    await synthesizeEdgeSpeech(
      trimmed,
      resolveEdgeVoice(form.narrator),
      form.voiceSpeed,
      outPath,
    );
    return;
  }

  await synthesizeEdgeSpeech(trimmed, resolveEdgeVoice(form.narrator), form.voiceSpeed, outPath);
}

export async function previewVoiceSample(params: {
  narrator: string;
  audioEngine: "gemini" | "edge";
  voiceSpeed: number;
  language?: string;
}): Promise<Buffer> {
  const form = normalizeForm({
    narrator: params.narrator,
    audioEngine: params.audioEngine,
    voiceSpeed: params.voiceSpeed,
    language: params.language || "English",
    topic: "preview",
  } as CreateFormPayload);

  const previews: Record<string, string> = {
    English: "Hello, this is a voice preview for your short video.",
    Japanese: "Hello, this is a voice preview for your short video.",
  };
  const text = previews[form.language] ?? previews.English;
  const tmp = path.join(GENERATED_DIR, `_preview_${Date.now()}.mp3`);
  await fs.mkdir(GENERATED_DIR, { recursive: true });
  await synthesizeSpeech(text, form, tmp);
  const buf = await fs.readFile(tmp);
  await fs.unlink(tmp).catch(() => {});
  return buf;
}

async function getAudioDuration(
  filePath: string,
  fallbackText: string,
  speed: number,
): Promise<number> {
  try {
    const duration = await new Promise<number>((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) reject(err);
        else resolve(metadata.format.duration ?? 0);
      });
    });
    if (duration > 0) return duration;
  } catch {
    /* ffprobe unavailable — use text estimate */
  }
  return estimateAudioDurationSec(fallbackText, speed);
}

async function createSceneClip(
  imagePath: string,
  audioPath: string,
  outputPath: string,
  size: { width: number; height: number },
  options?: {
    narration?: string;
    scenesDir?: string;
    sceneIndex?: number;
    burnSubtitles?: boolean;
  },
): Promise<void> {
  const burn = options?.burnSubtitles !== false;
  let subtitleFilter = "";
  if (
    burn &&
    options?.narration?.trim() &&
    options.scenesDir != null &&
    options.sceneIndex != null
  ) {
    const textFile = await prepareSubtitleTextFile(
      options.scenesDir,
      options.sceneIndex,
      options.narration,
    );
    if (textFile) {
      subtitleFilter = `,${subtitleFilterFromTextFile(textFile, size.width, size.height)}`;
    }
  }

  const vf = `scale=${size.width}:${size.height}:force_original_aspect_ratio=decrease,pad=${size.width}:${size.height}:(ow-iw)/2:(oh-ih)/2,format=yuv420p${subtitleFilter}`;

  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(imagePath)
      .inputOptions(["-loop 1"])
      .input(audioPath)
      .outputOptions([
        "-c:v libx264",
        "-tune stillimage",
        "-c:a aac",
        "-b:a 192k",
        "-pix_fmt yuv420p",
        "-shortest",
        `-vf ${vf}`,
      ])
      .save(outputPath)
      .on("end", () => resolve())
      .on("error", (err) => {
        console.error("[VIDEO] createSceneClip failed:", err);
        reject(err);
      });
  });
}

function concatClips(clipPaths: string[], listFile: string, outputPath: string): Promise<void> {
  const listContent = clipPaths.map((p) => `file '${p.replace(/\\/g, "/")}'`).join("\n");
  return fs.writeFile(listFile, listContent).then(
    () =>
      new Promise<void>((resolve, reject) => {
        ffmpeg()
          .input(listFile)
          .inputOptions(["-f concat", "-safe 0"])
          .outputOptions(["-c copy"])
          .save(outputPath)
          .on("end", () => resolve())
          .on("error", reject);
      }),
  );
}

function extractAudio(videoPath: string, audioPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .outputOptions(["-vn", "-acodec libmp3lame", "-q:a 4"])
      .save(audioPath)
      .on("end", () => resolve())
      .on("error", reject);
  });
}

async function formatFileSize(filePath: string) {
  const stat = await fs.stat(filePath);
  const mb = stat.size / (1024 * 1024);
  return `${mb.toFixed(1)}MB`;
}

export async function runCreatePipeline(jobId: string, rawForm: CreateFormPayload): Promise<VideoProject> {
  const form = normalizeForm(rawForm);
  if (!form.topic) {
    throw new Error("Topic / content idea is required.");
  }
  const projectId = `DIS-${Math.floor(1000 + Math.random() * 9000)}`;
  const workDir = path.join(GENERATED_DIR, projectId);
  const scenesDir = path.join(workDir, "scenes");

  await fs.mkdir(scenesDir, { recursive: true });

  const setStep = (step: number, progress: number) => {
    updateJob(jobId, { step, stepLabel: STEP_LABELS[step] ?? "Processing", progress });
  };

  try {
    setStep(0, 5);
    const script = await generateScript(form);
    setStep(1, 20);

    const size = getDimensions(form.aspectRatio);
    const clipPaths: string[] = [];
    const totalScenes = script.scenes.length;
    const refImage = form.charImage || form.productImage;

    if (form.useThumbnail && script.thumbnail_prompt) {
      const thumbPath = path.join(scenesDir, "thumbnail.png");
      const thumbPrompt = buildSceneImagePrompt(
        script.thumbnail_prompt,
        form.style,
        form.colorMood,
      );
      let thumbBuf: Buffer | null = null;
      const geminiThumb = await generateGeminiNativeImage(thumbPrompt);
      if (geminiThumb?.buffer) thumbBuf = geminiThumb.buffer;
      if (!thumbBuf && refImage) {
        const refThumb = await generateGeminiImageWithRef(thumbPrompt, refImage);
        if (refThumb?.buffer) thumbBuf = refThumb.buffer;
      }
      if (!thumbBuf) thumbBuf = await generateImagenImage(thumbPrompt, form.aspectRatio);
      if (thumbBuf) await sharp(thumbBuf).png().toFile(thumbPath);
    }

    for (let i = 0; i < totalScenes; i++) {
      const scene = script.scenes[i];
      const imgPath = path.join(scenesDir, `scene-${i}.png`);
      const audioPath = path.join(scenesDir, `scene-${i}.mp3`);
      const clipPath = path.join(scenesDir, `scene-${i}.mp4`);

      setStep(2, 20 + Math.round((i / totalScenes) * 30));
      const imgResult = await generateSceneImageFromAI(scene, form, imgPath, refImage);
      if (!imgResult.ok) {
        console.warn(`[CREATE] Scene ${i} AI image failed — using placeholder`);
        await renderSceneImageFallback(scene, i, script.title, form, imgPath, form.charImage);
      } else {
        console.log(`[CREATE] Scene ${i} image via ${imgResult.source}`);
      }

      setStep(3, 50 + Math.round((i / totalScenes) * 25));
      await synthesizeSpeech(scene.narration, form, audioPath);

      setStep(4, 75 + Math.round((i / totalScenes) * 15));
      await createSceneClip(imgPath, audioPath, clipPath, size, {
        narration: scene.narration,
        scenesDir,
        sceneIndex: i,
        burnSubtitles: true,
      });
      clipPaths.push(clipPath);
    }

    if (form.useThumbnail) {
      const thumbPath = path.join(scenesDir, "thumbnail.png");
      try {
        await fs.access(thumbPath);
        const silentPath = path.join(scenesDir, "thumb-silent.mp3");
        const thumbClip = path.join(scenesDir, "thumb-intro.mp4");
        await new Promise<void>((resolve, reject) => {
          ffmpeg()
            .input("anullsrc=channel_layout=mono:sample_rate=24000")
            .inputOptions(["-f lavfi"])
            .duration(2)
            .outputOptions(["-acodec libmp3lame", "-q:a 4"])
            .save(silentPath)
            .on("end", () => resolve())
            .on("error", reject);
        });
        await createSceneClip(thumbPath, silentPath, thumbClip, size, {
          burnSubtitles: false,
        });
        clipPaths.unshift(thumbClip);
      } catch {
        /* thumbnail file missing — skip intro */
      }
    }

    setStep(4, 92);
    const outputPath = path.join(workDir, "output.mp4");
    const listFile = path.join(workDir, "concat.txt");
    await concatClips(clipPaths, listFile, outputPath);

    const audioPath = path.join(workDir, "output.mp3");
    await extractAudio(outputPath, audioPath);

    setStep(5, 98);
    const fileSize = await formatFileSize(outputPath);

    const project: VideoProject = {
      id: projectId,
      title: script.title,
      timestamp: new Date().toISOString(),
      size: fileSize,
      thumbnailColor: thumbnailColorFor(form.style),
      format: form.aspectRatio,
      duration: form.duration,
      narrative: script,
      formData: form,
      videoUrl: `/api/projects/${projectId}/video`,
      audioUrl: `/api/projects/${projectId}/audio`,
      status: "ready",
    };

    await fs.writeFile(path.join(PROJECTS_DIR, `${projectId}.json`), JSON.stringify(project, null, 2));
    await fs.writeFile(path.join(workDir, "project.json"), JSON.stringify(project, null, 2));

    completeJob(jobId, projectId);
    return project;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Video generation failed";
    failJob(jobId, message);
    throw error;
  }
}

export async function getProjectById(id: string): Promise<VideoProject | null> {
  try {
    const raw = await fs.readFile(path.join(PROJECTS_DIR, `${id}.json`), "utf-8");
    return JSON.parse(raw) as VideoProject;
  } catch {
    try {
      const raw = await fs.readFile(path.join(GENERATED_DIR, id, "project.json"), "utf-8");
      return JSON.parse(raw) as VideoProject;
    } catch {
      return null;
    }
  }
}

export async function suggestTopicIdeas(
  form: Pick<CreateFormPayload, "topic" | "topicContext" | "viralPreset" | "videoConcept" | "language">,
) {
  const userPrompt = `Suggest 5 viral short-form video topic hooks for:
Preset: ${form.viralPreset}
Video concept: ${form.videoConcept}
Current topic hint: ${form.topic || "open"}
Context: ${form.topicContext || "none"}
Output language: English only (all ideas must be in English).
Content niche language setting: ${form.language}
Return JSON: { "ideas": ["...", "...", "..."] } with exactly 5 ideas.`;

  let raw: string;

  if (getGroqApiKey()) {
    raw = await groqJsonCompletion(
      "You are an expert content strategist. Respond ONLY with valid JSON.",
      userPrompt,
    );
  } else {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY or GROQ_API_KEY must be configured.");

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: SCRIPT_MODEL,
      contents: userPrompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            ideas: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: ["ideas"],
        },
      },
    });
    raw = response.text || "{}";
  }

  const parsed = JSON.parse(cleanJson(raw)) as { ideas?: string[] };
  return parsed.ideas ?? [];
}

async function persistProject(project: VideoProject) {
  await fs.writeFile(path.join(PROJECTS_DIR, `${project.id}.json`), JSON.stringify(project, null, 2));
  await fs.writeFile(
    path.join(GENERATED_DIR, project.id, "project.json"),
    JSON.stringify(project, null, 2),
  );
}

function scenePaths(projectId: string, index: number) {
  const scenesDir = path.join(GENERATED_DIR, projectId, "scenes");
  return {
    scenesDir,
    image: path.join(scenesDir, `scene-${index}.png`),
    audio: path.join(scenesDir, `scene-${index}.mp3`),
    clip: path.join(scenesDir, `scene-${index}.mp4`),
  };
}

export async function updateProjectScene(
  projectId: string,
  index: number,
  patch: { narration?: string; visual_prompt?: string },
): Promise<VideoProject> {
  const project = await getProjectById(projectId);
  if (!project) throw new Error("Project not found.");
  const scene = project.narrative.scenes[index];
  if (!scene) throw new Error("Scene not found.");

  if (patch.narration !== undefined) scene.narration = patch.narration;
  if (patch.visual_prompt !== undefined) {
    scene.visual_prompts = [patch.visual_prompt];
    scene.description = patch.visual_prompt;
  }

  await persistProject(project);
  return project;
}

export async function regenerateSceneImage(
  projectId: string,
  index: number,
): Promise<{ project: VideoProject; usedFallback: boolean; source?: string; model?: string }> {
  const project = await getProjectById(projectId);
  if (!project) throw new Error("Project not found.");
  const scene = project.narrative.scenes[index];
  if (!scene) throw new Error("Scene not found.");

  const form = project.formData;
  const { image } = scenePaths(projectId, index);
  const refImage = form.charImage || form.productImage;
  const imgResult = await generateSceneImageFromAI(scene, form, image, refImage);

  if (!imgResult.ok) {
    await renderSceneImageFallback(scene, index, project.title, form, image, form.charImage);
    const rebuilt = await rebuildProjectVideo(projectId);
    return { project: rebuilt, usedFallback: true };
  }

  const rebuilt = await rebuildProjectVideo(projectId);
  return {
    project: rebuilt,
    usedFallback: false,
    source: imgResult.source,
    model: imgResult.model,
  };
}

export async function regenerateSceneAudio(projectId: string, index: number): Promise<VideoProject> {
  const project = await getProjectById(projectId);
  if (!project) throw new Error("Project not found.");
  const scene = project.narrative.scenes[index];
  if (!scene) throw new Error("Scene not found.");

  const { audio } = scenePaths(projectId, index);
  await synthesizeSpeech(scene.narration, project.formData, audio);
  return rebuildProjectVideo(projectId);
}

export async function rebuildProjectVideo(projectId: string): Promise<VideoProject> {
  const project = await getProjectById(projectId);
  if (!project) throw new Error("Project not found.");

  const workDir = path.join(GENERATED_DIR, projectId);
  const scenesDir = path.join(workDir, "scenes");
  const form = project.formData;
  const size = getDimensions(form.aspectRatio);
  const clipPaths: string[] = [];

  if (form.useThumbnail) {
    const thumbClip = path.join(scenesDir, "thumb-intro.mp4");
    try {
      await fs.access(thumbClip);
      clipPaths.push(thumbClip);
    } catch {
      /* no thumbnail intro */
    }
  }

  for (let i = 0; i < project.narrative.scenes.length; i++) {
    const { image, audio, clip } = scenePaths(projectId, i);
    const scene = project.narrative.scenes[i];
    await createSceneClip(image, audio, clip, size, {
      narration: scene?.narration,
      scenesDir,
      sceneIndex: i,
      burnSubtitles: true,
    });
    clipPaths.push(clip);
  }

  const outputPath = path.join(workDir, "output.mp4");
  const listFile = path.join(workDir, "concat.txt");
  await concatClips(clipPaths, listFile, outputPath);

  const audioPath = path.join(workDir, "output.mp3");
  await extractAudio(outputPath, audioPath);

  project.size = await formatFileSize(outputPath);
  project.timestamp = new Date().toISOString();
  await persistProject(project);
  return project;
}
