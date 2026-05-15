import path from "path";
import fs from "fs/promises";
import os from "os";
import { execFile } from "child_process";
import { promisify } from "util";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import ffprobePath from "ffprobe-static";
import { groqJsonCompletion, getGroqApiKey } from "./groq-client.js";
import { extractYouTubeVideoId } from "./youtube.js";
import { updateClipJob, completeClipJob, failClipJob } from "./clip-job-store.js";
import { detectVisualLayout } from "./visual-layout-agent.js";
import { renderVerticalClip } from "./clip-render.js";
import type { ClipRunPayload, RankedClip } from "./clip-types.js";

const execFileAsync = promisify(execFile);

const CLIP_CACHE_DIR = path.join(process.cwd(), "clip_cache");
const CLIP_COUNT = 3;
const CLIP_MIN_SEC = 40;
const CLIP_MAX_SEC = 60;

const STEP_LABELS = [
  "Process Source",
  "AI Hook Detection",
  "Final Configuration",
  "Ready for Export",
];

if (ffmpegPath) ffmpeg.setFfmpegPath(ffmpegPath);
if (typeof ffprobePath === "string") {
  ffmpeg.setFfprobePath(ffprobePath);
} else if (ffprobePath?.path) {
  ffmpeg.setFfprobePath(ffprobePath.path);
}

type WhisperSegment = { start: number; end: number; text: string };

async function wingetYtDlpPaths(): Promise<string[]> {
  const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), "AppData", "Local");
  const packagesRoot = path.join(localAppData, "Microsoft", "WinGet", "Packages");
  const paths: string[] = [];

  try {
    const entries = await fs.readdir(packagesRoot);
    for (const entry of entries) {
      if (!entry.toLowerCase().startsWith("yt-dlp.yt-dlp")) continue;
      paths.push(path.join(packagesRoot, entry, "yt-dlp.exe"));
    }
  } catch {
    /* WinGet packages folder may not exist */
  }

  return paths;
}

async function verifyYtDlp(binary: string): Promise<boolean> {
  try {
    await execFileAsync(binary, ["--version"], { timeout: 8_000 });
    return true;
  } catch {
    return false;
  }
}

async function findYtDlp(): Promise<string> {
  const fromEnv = process.env.YT_DLP_PATH?.trim();
  if (fromEnv && (await verifyYtDlp(fromEnv))) return fromEnv;

  const candidates = [
    ...(await wingetYtDlpPaths()),
    "yt-dlp",
    "yt-dlp.exe",
    "youtube-dl",
    "youtube-dl.exe",
  ];

  for (const bin of candidates) {
    if (await verifyYtDlp(bin)) return bin;
  }

  throw new Error(
    "yt-dlp is not on PATH. After winget install, restart the terminal and run: npm run dev. Or set YT_DLP_PATH in .env to the full path of yt-dlp.exe.",
  );
}

async function wingetFfmpegDir(): Promise<string | undefined> {
  const fromEnv = process.env.FFMPEG_PATH?.trim();
  if (fromEnv) {
    const dir = path.dirname(fromEnv);
    try {
      await fs.access(fromEnv);
      return dir;
    } catch {
      /* fall through */
    }
  }

  const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), "AppData", "Local");
  const packagesRoot = path.join(localAppData, "Microsoft", "WinGet", "Packages");

  try {
    const entries = await fs.readdir(packagesRoot);
    for (const entry of entries) {
      if (!entry.toLowerCase().startsWith("yt-dlp.ffmpeg")) continue;
      const binDir = path.join(
        packagesRoot,
        entry,
        "ffmpeg-N-124279-g0f6ba39122-win64-gpl",
        "bin",
      );
      try {
        await fs.access(path.join(binDir, "ffmpeg.exe"));
        return binDir;
      } catch {
        /* folder name may differ between versions — search one level */
        const pkgDir = path.join(packagesRoot, entry);
        const subdirs = await fs.readdir(pkgDir);
        for (const sub of subdirs) {
          if (!sub.toLowerCase().startsWith("ffmpeg-")) continue;
          const candidate = path.join(pkgDir, sub, "bin");
          try {
            await fs.access(path.join(candidate, "ffmpeg.exe"));
            return candidate;
          } catch {
            /* next */
          }
        }
      }
    }
  } catch {
    /* ignore */
  }

  return undefined;
}

const VIDEO_EXTENSIONS = new Set([".mp4", ".webm", ".mkv", ".mov", ".m4v"]);

async function resolveDownloadedVideo(outDir: string): Promise<string> {
  const files = await fs.readdir(outDir);
  const preferExact = ["source.mp4", "source.mkv", "source.webm"];
  for (const name of preferExact) {
    if (files.includes(name)) return path.join(outDir, name);
  }

  const candidates: { name: string; size: number }[] = [];
  for (const name of files) {
    if (!name.toLowerCase().startsWith("source.")) continue;
    if (name.endsWith(".part") || name.endsWith(".ytdl")) continue;
    const ext = path.extname(name).toLowerCase();
    if (!VIDEO_EXTENSIONS.has(ext)) continue;
    const stat = await fs.stat(path.join(outDir, name));
    candidates.push({ name, size: stat.size });
  }

  candidates.sort((a, b) => b.size - a.size);
  if (candidates.length > 0) {
    return path.join(outDir, candidates[0].name);
  }

  throw new Error(
    `Download finished but no video file was found in cache. Files seen: ${files.join(", ") || "(empty)"}. ` +
      "Install FFmpeg for yt-dlp: winget install yt-dlp.FFmpeg",
  );
}

async function downloadYouTubeVideo(url: string, outDir: string): Promise<string> {
  const ytDlp = await findYtDlp();
  const absOutDir = path.resolve(outDir);
  await fs.mkdir(absOutDir, { recursive: true });

  // yt-dlp on Windows is more reliable with forward slashes in -o
  const outputTemplate = path.join(absOutDir, "source.%(ext)s").replace(/\\/g, "/");

  const args = [
    url,
    "-f",
    "bv*[height<=1080]+ba/b[height<=1080]/best",
    "--merge-output-format",
    "mp4",
    "--no-playlist",
    "--no-overwrites",
    "-o",
    outputTemplate,
  ];

  const ffmpegDir = await wingetFfmpegDir();
  if (ffmpegDir) {
    args.push("--ffmpeg-location", ffmpegDir.replace(/\\/g, "/"));
  }

  await execFileAsync(ytDlp, args, {
    timeout: 600_000,
    maxBuffer: 10 * 1024 * 1024,
  });

  return resolveDownloadedVideo(absOutDir);
}

function extractAudio(videoPath: string, audioPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .outputOptions(["-vn", "-acodec libmp3lame", "-ar 16000", "-ac 1", "-q:a 5"])
      .save(audioPath)
      .on("end", () => resolve())
      .on("error", reject);
  });
}

async function transcribeWithGroq(audioPath: string): Promise<WhisperSegment[]> {
  const apiKey = getGroqApiKey();
  if (!apiKey) throw new Error("GROQ_API_KEY is not configured on the server.");

  const buffer = await fs.readFile(audioPath);
  const form = new FormData();
  form.append("file", new Blob([buffer], { type: "audio/mpeg" }), "audio.mp3");
  form.append("model", process.env.GROQ_WHISPER_MODEL || "whisper-large-v3-turbo");
  form.append("response_format", "verbose_json");
  form.append("timestamp_granularities[]", "segment");

  const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
    throw new Error(err.error?.message || `Groq transcription failed (${res.status}).`);
  }

  const data = (await res.json()) as {
    segments?: { start: number; end: number; text: string }[];
    text?: string;
  };

  if (data.segments?.length) {
    return data.segments.map((s) => ({
      start: s.start,
      end: s.end,
      text: s.text.trim(),
    }));
  }

  if (data.text) {
    return [{ start: 0, end: 60, text: data.text.trim() }];
  }

  throw new Error("Transcription returned no segments.");
}

function buildTranscriptContext(segments: WhisperSegment[], maxChars = 12_000): string {
  const lines = segments.map(
    (s) => `[${s.start.toFixed(1)}s - ${s.end.toFixed(1)}s] ${s.text}`,
  );
  let joined = lines.join("\n");
  if (joined.length > maxChars) {
    joined = joined.slice(0, maxChars) + "\n...(truncated)";
  }
  return joined;
}

type RankCandidate = {
  rank: number;
  score: number;
  title: string;
  hook: string;
  reason?: string;
  comparisonBrief?: string;
  startSec: number;
  endSec: number;
  durationSec: number;
};

async function rankViralClips(
  segments: WhisperSegment[],
  sourceTitle: string,
  isAsmr: boolean,
): Promise<RankCandidate[]> {
  const videoEnd = segments.length ? segments[segments.length - 1].end : 180;

  const limitedSegments = segments.slice(0, 250).map((s) => ({
    s: parseFloat(s.start.toFixed(2)),
    e: parseFloat(s.end.toFixed(2)),
    t: s.text,
  }));

  const transcriptBlock = isAsmr
    ? "INFO: Video detected as ASMR/cinematic (minimal speech). Pick 3 varied visual segments with strong aesthetic flow."
    : `TRANSCRIPT (s=start, e=end, t=text): ${JSON.stringify(limitedSegments)}`;

  const raw = await groqJsonCompletion(
    `You are a Senior Video Editor & Viral Strategist. Pick exactly 3 clips (40-60 seconds each) with complete narrative arcs.

STRICT DURATION: Each clip MUST be 40-60 seconds (end_time - start_time). Combine consecutive segments to reach duration.

Return JSON only:
{
  "recommended_clips": [
    {
      "rank": 1,
      "start_time": 10.0,
      "end_time": 55.0,
      "headline": "Title",
      "viral_score": 95,
      "reason": "Why viral",
      "comparison_brief": "Why rank 1 beats 2 and 3"
    },
    { "rank": 2, "start_time": 0, "end_time": 0, "headline": "", "viral_score": 0, "reason": "" },
    { "rank": 3, "start_time": 0, "end_time": 0, "headline": "", "viral_score": 0, "reason": "" }
  ]
}

Rules: exactly 3 clips; ranks 1-3; viral_score 0-100; start_time >= 0; end_time <= ${videoEnd.toFixed(1)}; no mid-sentence cutoffs.`,
    `Source: ${sourceTitle}\n${transcriptBlock}`,
  );

  const parsed = JSON.parse(raw) as {
    recommended_clips?: {
      rank?: number;
      start_time?: number;
      end_time?: number;
      headline?: string;
      viral_score?: number;
      reason?: string;
      comparison_brief?: string;
    }[];
  };

  let clips = (parsed.recommended_clips || [])
    .map((c, i) => normalizeClipCandidate(c, i, videoEnd))
    .filter((c) => c.endSec > c.startSec)
    .sort((a, b) => a.rank - b.rank)
    .slice(0, CLIP_COUNT);

  if (clips.length < CLIP_COUNT) {
    clips = buildFallbackClips(segments, videoEnd);
  }

  return clips;
}

function normalizeClipCandidate(
  c: {
    rank?: number;
    start_time?: number;
    end_time?: number;
    headline?: string;
    viral_score?: number;
    reason?: string;
    comparison_brief?: string;
  },
  index: number,
  videoEnd: number,
): RankCandidate {
  const startSec = Math.max(0, Number(c.start_time) || 0);
  let endSec = Number(c.end_time) || startSec + CLIP_MIN_SEC;
  if (endSec <= startSec) endSec = startSec + CLIP_MIN_SEC;
  const dur = endSec - startSec;
  if (dur < CLIP_MIN_SEC) endSec = Math.min(startSec + CLIP_MIN_SEC, videoEnd);
  if (dur > CLIP_MAX_SEC) endSec = startSec + CLIP_MAX_SEC;
  if (endSec > videoEnd) endSec = videoEnd;

  return {
    rank: Number(c.rank) || index + 1,
    score: Math.min(100, Math.max(0, Number(c.viral_score) || 70)),
    title: (c.headline || `Clip ${index + 1}`).slice(0, 100),
    hook: (c.reason || c.headline || "Viral moment").slice(0, 200),
    reason: c.reason?.slice(0, 400),
    comparisonBrief: c.comparison_brief?.slice(0, 500),
    startSec,
    endSec,
    durationSec: Math.round((endSec - startSec) * 10) / 10,
  };
}

function buildFallbackClips(segments: WhisperSegment[], videoEnd: number): RankCandidate[] {
  const chunk = Math.min(CLIP_MAX_SEC, Math.max(CLIP_MIN_SEC, videoEnd / CLIP_COUNT));
  return Array.from({ length: CLIP_COUNT }, (_, i) => {
    const startSec = Math.min(i * chunk, Math.max(0, videoEnd - chunk));
    const endSec = Math.min(startSec + chunk, videoEnd);
    return {
      rank: i + 1,
      score: 80 - i * 5,
      title: `Highlight ${i + 1}`,
      hook: segments[Math.floor((segments.length * (i + 0.5)) / CLIP_COUNT)]?.text?.slice(0, 120) || "Best moment",
      reason: "Auto-selected segment",
      startSec,
      endSec,
      durationSec: Math.round((endSec - startSec) * 10) / 10,
    };
  });
}

export async function runClipPipeline(jobId: string, payload: ClipRunPayload): Promise<void> {
  const videoId =
    payload.videoId || extractYouTubeVideoId(payload.youtubeUrl) || undefined;
  const canonicalUrl =
    payload.youtubeUrl.trim() ||
    (videoId ? `https://www.youtube.com/watch?v=${videoId}` : "");

  if (!canonicalUrl) {
    failClipJob(jobId, "YouTube URL is required.");
    return;
  }

  const workDir = path.join(CLIP_CACHE_DIR, jobId);
  await fs.mkdir(workDir, { recursive: true });

  const setStep = (step: number, progress: number) => {
    updateClipJob(jobId, {
      step,
      stepLabel: STEP_LABELS[step] ?? "Processing",
      progress,
    });
  };

  try {
    setStep(0, 10);
    const sourcePath = await downloadYouTubeVideo(canonicalUrl, workDir);
    setStep(0, 35);

    const audioPath = path.join(workDir, "audio.mp3");
    await extractAudio(sourcePath, audioPath);
    setStep(1, 50);

    const segments = await transcribeWithGroq(audioPath);
    const fullText = segments.map((s) => s.text).join(" ").trim();
    const isAsmr = fullText.length < 20;
    setStep(1, 70);

    const sourceTitle = payload.title || "YouTube source";
    const ranked = await rankViralClips(segments, sourceTitle, isAsmr);
    setStep(2, 80);

    const scanDir = path.join(workDir, "frames");
    const exported: RankedClip[] = [];

    for (let i = 0; i < ranked.length; i++) {
      const clip = ranked[i];
      const filename = `clip_${clip.rank}.mp4`;
      const outPath = path.join(workDir, filename);

      const layout = await detectVisualLayout(
        sourcePath,
        clip.startSec,
        clip.endSec,
        scanDir,
      );
      await renderVerticalClip(sourcePath, outPath, clip.startSec, clip.endSec, layout);

      exported.push({
        ...clip,
        filename,
        previewUrl: `/api/clip/jobs/${jobId}/clips/${encodeURIComponent(filename)}`,
        layout: layout.layout,
      });
      setStep(2, 80 + Math.round(((i + 1) / ranked.length) * 15));
    }

    exported.sort((a, b) => b.score - a.score);
    exported.forEach((c, i) => {
      c.rank = i + 1;
    });

    setStep(3, 100);
    completeClipJob(jobId, exported);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Clip pipeline failed.";
    console.error("[CLIP PIPELINE]", err);
    failClipJob(jobId, message);
  }
}

export function getClipFilePath(jobId: string, filename: string): string {
  const safe = path.basename(filename);
  return path.join(CLIP_CACHE_DIR, jobId, safe);
}
