import express from "express";
import path from "path";
import fs from "fs/promises";
import { randomUUID } from "crypto";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { Agent } from "./lib/dis-agent.js";
import { createJob, getJob } from "./lib/job-store.js";
import {
  runCreatePipeline,
  getProjectById,
  suggestTopicIdeas,
  previewVoiceSample,
  updateProjectScene,
  regenerateSceneImage,
  regenerateSceneAudio,
  rebuildProjectVideo,
} from "./lib/create-pipeline.js";
import type { CreateFormPayload } from "./lib/create-types.js";
import { fetchYouTubeVideoInfo } from "./lib/youtube.js";
import { validateClipAccessToken } from "./lib/clip-auth.js";
import { createClipJob, getClipJob } from "./lib/clip-job-store.js";
import { runClipPipeline, getClipFilePath } from "./lib/clip-pipeline.js";
import type { ClipRunPayload } from "./lib/clip-types.js";
import { listAllProjects } from "./lib/project-catalog.js";
import {
  getStorageSummary,
  deleteStorageEntry,
  purgeAllStorage,
} from "./lib/storage-manager.js";

// TACTICAL SETUP: Load environment variables (.env, .env.local)
dotenv.config();
dotenv.config({ path: ".env.local" });

const PROJECTS_DIR = path.join(process.cwd(), "projects_cache");
const GENERATED_DIR = path.join(process.cwd(), "generated");

async function ensureProjectsDir() {
  try {
    await fs.mkdir(PROJECTS_DIR, { recursive: true });
    await fs.mkdir(GENERATED_DIR, { recursive: true });

    const files = await fs.readdir(PROJECTS_DIR);
    if (files.length === 0) {
      const dummyProjects = [
        {
          id: "DIS-001",
          title: "Spatial Computing Recap",
          timestamp: new Date().toISOString(),
          size: "128MB",
          thumbnailColor: "from-cyan-500/20 to-blue-500/20",
        },
        {
          id: "DIS-002",
          title: "Cyberpunk Cinematic Hook",
          timestamp: new Date(Date.now() - 86400000).toISOString(),
          size: "450MB",
          thumbnailColor: "from-purple-500/20 to-pink-500/20",
        },
        {
          id: "DIS-003",
          title: "Ghibli Style Travel Vlog",
          timestamp: new Date(Date.now() - 259200000).toISOString(),
          size: "89MB",
          thumbnailColor: "from-emerald-500/20 to-teal-500/20",
        },
      ];

      for (const project of dummyProjects) {
        await fs.writeFile(
          path.join(PROJECTS_DIR, `${project.id}.json`),
          JSON.stringify(project, null, 2),
        );
      }
    }
  } catch (err) {
    console.error("Error setting up projects directory:", err);
  }
}

async function startServer() {
  await ensureProjectsDir();
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "15mb" }));

  // --- Clip backend (ingest / token verify) ---
  app.get("/api/youtube-info", async (req, res) => {
    try {
      const url = String(req.query.url || "").trim();
      if (!url) {
        return res.status(400).json({ valid: false, error: "YouTube URL is required." });
      }
      const info = await fetchYouTubeVideoInfo(url);
      res.json(info);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to analyze YouTube URL.";
      res.status(400).json({ valid: false, error: message });
    }
  });

  app.post("/api/clip/run", (req, res) => {
    const body = req.body as ClipRunPayload;
    const youtubeUrl = String(body?.youtubeUrl || "").trim();
    if (!youtubeUrl) {
      return res.status(400).json({ error: "YouTube URL is required." });
    }
    if (!process.env.GROQ_API_KEY?.trim()) {
      return res.status(503).json({
        error: "GROQ_API_KEY is not set on the server. Add it to .env and restart npm run dev.",
      });
    }

    const jobId = randomUUID();
    createClipJob(jobId, {
      videoId: body.videoId || "",
      title: body.title || "YouTube source",
      author: body.author,
      thumbnailUrl: body.thumbnailUrl,
    });

    runClipPipeline(jobId, body).catch((err) => {
      console.error("[CLIP RUN]", err);
    });

    res.json({ jobId });
  });

  app.get("/api/clip/jobs/:jobId", (req, res) => {
    const job = getClipJob(req.params.jobId);
    if (!job) return res.status(404).json({ error: "Job not found." });
    res.json(job);
  });

  app.get("/api/clip/jobs/:jobId/clips/:filename", async (req, res) => {
    const filePath = getClipFilePath(req.params.jobId, req.params.filename);
    try {
      await fs.access(filePath);
      const safeName = path.basename(filePath);
      const asDownload = req.query.download === "1" || req.query.download === "true";
      res.setHeader("Content-Type", "video/mp4");
      if (asDownload) {
        res.download(filePath, safeName);
      } else {
        res.sendFile(filePath);
      }
    } catch {
      res.status(404).json({ error: "Clip file not found." });
    }
  });

  app.post("/api/validate-token", async (req, res) => {
    try {
      const token = String(req.body?.token || "").trim();
      const result = await validateClipAccessToken(token);
      if (result.valid) {
        res.json({ valid: true, message: result.message });
      } else {
        res.status(401).json({ valid: false, message: result.message });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Token validation failed.";
      res.status(500).json({ valid: false, message });
    }
  });

  // [MISSION CRITICAL] OPENCLAW AI AGENT ROUTE
  app.post("/api/agent/repurpose", async (req, res) => {
    try {
      const { youtubeUrl } = req.body;

      if (!youtubeUrl) {
        return res.status(400).json({ error: "Source protocol (YouTube URL) is required." });
      }

      console.log(`[INGEST ENGINE] Initiating protocol for: ${youtubeUrl}`);

      const tools = [
        {
          name: "download_youtube",
          description: "Downloads a YouTube video given a URL",
          execute: async (url: string) => {
            console.log(`[Agent Tool] Executing yt-dlp for ${url}...`);
            // TODO: wire up child_process yt-dlp.exe
            return { status: "success", filePath: "./temp/video.mp4" };
          },
        },
        {
          name: "transcribe_video",
          description: "Transcribes audio from a video file to find viral hooks",
          execute: async (filePath: string) => {
            console.log(`[Agent Tool] Transcribing audio from ${filePath}...`);
            // TODO: wire up Whisper model
            return { status: "success", transcript: "Dummy hook detected." };
          },
        },
      ];

      const agent = new Agent({
        llm: "gemini-2.5-flash",
        apiKey: process.env.GEMINI_API_KEY,
        systemPrompt:
          "You are DiS, an autonomous Video Producer Agent. Your mission is to process a given YouTube URL by downloading it and then transcribing it to find a viral hook. Think step by step and use your tools.",
        tools,
      });

      console.log("[AGENT] Autonomous loop started...");
      const result = await agent.run(`Please process this video and find a hook: ${youtubeUrl}`);

      res.json({
        success: true,
        message: "Protocol Complete",
        agentResult: result,
      });
    } catch (error) {
      console.error("[AGENT SYSTEM FAILURE]:", error);
      res.status(500).json({ error: "Agent protocol encountered a critical error." });
    }
  });

  app.get("/api/projects", async (_req, res) => {
    try {
      const projects = await listAllProjects();
      res.json(projects);
    } catch (err) {
      console.error("[PROJECTS]", err);
      res.status(500).json({ error: "Failed to fetch projects" });
    }
  });

  app.get("/api/storage", async (_req, res) => {
    try {
      const summary = await getStorageSummary();
      res.json(summary);
    } catch (err) {
      console.error("[STORAGE]", err);
      res.status(500).json({ error: "Failed to read storage" });
    }
  });

  app.delete("/api/storage/:kind/:id", async (req, res) => {
    try {
      const kind = req.params.kind as "project" | "clip_job";
      if (kind !== "project" && kind !== "clip_job") {
        return res.status(400).json({ error: "Invalid storage kind." });
      }
      await deleteStorageEntry(kind, req.params.id);
      res.json({ ok: true });
    } catch (err) {
      console.error("[STORAGE DELETE]", err);
      res.status(500).json({ error: "Failed to delete storage entry" });
    }
  });

  app.post("/api/storage/purge", async (_req, res) => {
    try {
      const removed = await purgeAllStorage();
      res.json({ ok: true, removed });
    } catch (err) {
      console.error("[STORAGE PURGE]", err);
      res.status(500).json({ error: "Failed to purge storage" });
    }
  });

  app.post("/api/create/generate", (req, res) => {
    const form = req.body as CreateFormPayload;
    const topic = (form?.topic || (form as { topicIdea?: string })?.topicIdea || "").trim();
    if (!topic) {
      return res.status(400).json({ error: "Topic / content idea is required." });
    }

    const jobId = randomUUID();
    createJob(jobId);
    runCreatePipeline(jobId, form).catch((err) => {
      console.error("[CREATE PIPELINE]", err);
    });

    res.json({ jobId });
  });

  app.get("/api/create/jobs/:jobId", (req, res) => {
    const job = getJob(req.params.jobId);
    if (!job) return res.status(404).json({ error: "Job not found." });
    res.json(job);
  });

  app.post("/api/create/suggest-topics", async (req, res) => {
    try {
      const ideas = await suggestTopicIdeas(req.body);
      res.json({ ideas });
    } catch (error) {
      console.error("[SUGGEST TOPICS]", error);
      res.status(500).json({ error: "Failed to generate topic ideas." });
    }
  });

  app.post("/api/create/preview-voice", async (req, res) => {
    try {
      const { narrator, audioEngine, voiceSpeed, language } = req.body;
      if (!narrator) {
        return res.status(400).json({ error: "Narrator is required." });
      }
      const audio = await previewVoiceSample({
        narrator,
        audioEngine: audioEngine === "gemini" ? "gemini" : "edge",
        voiceSpeed: Number(voiceSpeed) || 1,
        language,
      });
      res.setHeader("Content-Type", "audio/mpeg");
      res.send(audio);
    } catch (error) {
      console.error("[PREVIEW VOICE]", error);
      const message =
        error instanceof Error ? error.message : "Voice preview failed.";
      res.status(500).json({ error: message });
    }
  });

  app.get("/api/projects/:id", async (req, res) => {
    const project = await getProjectById(req.params.id);
    if (!project) return res.status(404).json({ error: "Project not found." });
    res.json(project);
  });

  app.get("/api/projects/:id/video", async (req, res) => {
    const videoPath = path.join(GENERATED_DIR, req.params.id, "output.mp4");
    try {
      await fs.access(videoPath);
      res.sendFile(videoPath);
    } catch {
      res.status(404).json({ error: "Video not found." });
    }
  });

  app.get("/api/projects/:id/audio", async (req, res) => {
    const audioPath = path.join(GENERATED_DIR, req.params.id, "output.mp3");
    try {
      await fs.access(audioPath);
      res.sendFile(audioPath);
    } catch {
      res.status(404).json({ error: "Audio not found." });
    }
  });

  app.get("/api/projects/:id/scenes/:index/image", async (req, res) => {
    const imagePath = path.join(
      GENERATED_DIR,
      req.params.id,
      "scenes",
      `scene-${req.params.index}.png`,
    );
    try {
      await fs.access(imagePath);
      res.sendFile(imagePath);
    } catch {
      res.status(404).json({ error: "Scene image not found." });
    }
  });

  app.get("/api/projects/:id/scenes/:index/audio", async (req, res) => {
    const audioPath = path.join(
      GENERATED_DIR,
      req.params.id,
      "scenes",
      `scene-${req.params.index}.mp3`,
    );
    try {
      await fs.access(audioPath);
      res.sendFile(audioPath);
    } catch {
      res.status(404).json({ error: "Scene audio not found." });
    }
  });

  app.patch("/api/projects/:id/scenes/:index", async (req, res) => {
    try {
      const index = parseInt(req.params.index, 10);
      if (!Number.isFinite(index) || index < 0) {
        return res.status(400).json({ error: "Invalid scene index." });
      }
      const project = await updateProjectScene(req.params.id, index, {
        narration: req.body.narration,
        visual_prompt: req.body.visual_prompt,
      });
      res.json(project);
    } catch (error) {
      console.error("[SCENE UPDATE]", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to update scene.",
      });
    }
  });

  app.post("/api/projects/:id/scenes/:index/regenerate-image", async (req, res) => {
    try {
      const index = parseInt(req.params.index, 10);
      if (!Number.isFinite(index) || index < 0) {
        return res.status(400).json({ error: "Invalid scene index." });
      }
      const result = await regenerateSceneImage(req.params.id, index);
      res.json({
        ...result.project,
        imageMeta: {
          usedFallback: result.usedFallback,
          source: result.source ?? null,
          model: result.model ?? null,
        },
      });
    } catch (error) {
      console.error("[SCENE REGEN IMAGE]", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to regenerate image.",
      });
    }
  });

  app.post("/api/projects/:id/scenes/:index/regenerate-audio", async (req, res) => {
    try {
      const index = parseInt(req.params.index, 10);
      if (!Number.isFinite(index) || index < 0) {
        return res.status(400).json({ error: "Invalid scene index." });
      }
      const project = await regenerateSceneAudio(req.params.id, index);
      res.json(project);
    } catch (error) {
      console.error("[SCENE REGEN AUDIO]", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to regenerate audio.",
      });
    }
  });

  app.post("/api/projects/:id/rebuild", async (req, res) => {
    try {
      const project = await rebuildProjectVideo(req.params.id);
      res.json(project);
    } catch (error) {
      console.error("[PROJECT REBUILD]", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to rebuild video.",
      });
    }
  });

  app.get("/api/projects/:id/download", async (req, res) => {
    const project = await getProjectById(req.params.id);
    const videoPath = path.join(GENERATED_DIR, req.params.id, "output.mp4");
    try {
      await fs.access(videoPath);
      const filename = `${(project?.title || req.params.id).replace(/[^\w\-]+/g, "_")}.mp4`;
      res.download(videoPath, filename);
    } catch {
      res.status(404).json({ error: "Video not ready for download." });
    }
  });

  app.post("/api/projects", async (req, res) => {
    try {
      const project = req.body;
      if (!project.id) project.id = `DIS-${Math.floor(1000 + Math.random() * 9000)}`;
      if (!project.timestamp) project.timestamp = new Date().toISOString();

      await fs.writeFile(
        path.join(PROJECTS_DIR, `${project.id}.json`),
        JSON.stringify(project, null, 2),
      );

      res.json(project);
    } catch {
      res.status(500).json({ error: "Failed to save project" });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[SYSTEM] Command Center online at http://localhost:${PORT}`);
  });
}

startServer();
