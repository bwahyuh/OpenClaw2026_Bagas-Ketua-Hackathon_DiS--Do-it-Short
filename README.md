# DiS Protocol — Do It Short
> *One topic. One link. Agents handle the rest.*

---

## Inspiration

Short-form video is where attention lives—but making it still feels like running a small studio alone: write a hook, storyboard scenes, generate visuals, record voiceover, add captions, reframe for TikTok/Reels, and hope nothing breaks mid-export. We built **DiS Protocol (Do It Short)** because we wanted that entire chain to feel like working with a team of AI agents, not clicking through a fragile wizard.

The spark came from two everyday creator pains we kept seeing:
1. *"I have a topic but no time to produce"*
2. *"I have a long YouTube video but no time to find the clips."*

Hackathons like OpenClaw pushed us to think beyond single API calls—toward specialized agents (script, visual, voice, caption, clip intelligence) coordinated behind one calm interface. We also took cues from high-polish canvas workflows (scene-by-scene control, glass UI, viral presets) and asked: **What if export-ready shorts were the default, and human creativity only shows up where it actually matters?**

---

## What It Does

DiS is a **multi-agent short-video studio** with two core modes:

### 🎬 Create
Choose a viral preset (storytelling, affiliate, kids, education, horror, and more), platform, aspect ratio, visual style, tone, and narrator. Autonomous agents then produce a full project:

- Structured script with marketing metadata
- Per-scene narration and image prompts
- AI-generated scene art (with optional character/product reference for consistency)
- Synthesized voice
- Burned-in captions
- Stitched MP4

After generation, the **Scene Editor** lets you regenerate image or voice per scene, edit narration and visual prompts, and rebuild the final video without starting over.

### ✂️ Clip
Paste a YouTube link. Agents:
- Ingest the source & transcribe speech
- Rank the top three **40–60 second segments** with viral scores and reasoning
- Detect faces for smart vertical layout
- Export reframed **9:16 clips** ready for Shorts/Reels/TikTok

> From the outside it should feel mature and parallel—one intent in, publishable shorts out—not a visible "Step 1 of 7" factory line.

---

## How We Built It

**Frontend:** React 19 + Vite, Motion for UI, Tailwind/shadcn-style glass components. Views include Landing, Create (with viral ideas modal), Create Scene Editor, Clip, Projects, Editor, and Settings.

**Backend:** Express (`tsx server.ts`) orchestrates jobs, serves assets, and persists projects under `generated/` and `projects/`.

### Agent-Style Pipelines (Server-Side)

| Agent Role | Responsibility |
|---|---|
| **Script / Strategy** | JSON script: scenes, narration, visual prompts, thumbnail, tags |
| **Visual** | Multi-provider image gen with rotation + reference images |
| **Voice** | Gemini TTS with model rotation; Edge TTS fallback |
| **Caption** | FFmpeg drawtext burn-in from scene narration |
| **Clip Intelligence** | Whisper transcript → LLM ranks hooks → FFmpeg vertical render |
| **Layout** | TensorFlow.js + MediaPipe face detection for crop strategy |

**Resilience layer:** When one model hits quota or 404, the orchestrator tries the next candidate (images, TTS) or falls back to Pollinations / Edge TTS so the user still gets a real output—not a dead pipeline.

**Media stack:** FFmpeg for assembly/concat/subtitles/clips, Sharp for images, yt-dlp for YouTube ingest.

**Primary APIs:** Google Gemini (`@google/genai`), optional Groq (Llama 3.3 70B for script/ranking, Whisper for transcription).

### Clip Ranking Constraint

Each recommended segment must satisfy:

$$40 \leq t_{end} - t_{start} \leq 60 \text{ (seconds)}$$

Each recommended segment should be a complete narrative arc, not a mid-sentence cut.

---

## Challenges We Ran Into

- **API quotas and model availability** — Gemini image and TTS models hit free-tier limits quickly. Early builds stopped at the first failure; we had to implement rotation, discovery via `ListModels`, and fallbacks (Pollinations for images, Edge TTS for voice).

- **Wrong or deprecated model IDs** — e.g. `gemini-2.5-flash-image-preview` returning 404. We maintained blocklists and candidate lists aligned with what actually works on `v1beta`.

- **Imagen on free accounts** — Imagen 4 required a paid plan; the pipeline had to skip gracefully instead of blocking generation.

- **"Images work, captions don't"** — Scene clips were image + audio only; narration existed for TTS but never appeared on video. Fixing it meant a dedicated caption path (text files + FFmpeg burn-in) on create and rebuild/regen flows.

- **Regenerate felt broken** — Users saw placeholders when all image providers failed; improving the same fallback chain for per-scene regen was essential for trust in the Scene Editor.

- **Clip pipeline dependencies** — yt-dlp/FFmpeg paths on Windows, long downloads, and transcript size limits for LLM ranking all required defensive error messages and truncation.

- **UX vs. automation** — Letting users stay on Create with a scene editor (instead of auto-jumping to a generic editor) while still feeling "agent-complete" took several iterations.

---

## Accomplishments We're Proud Of

- A dual-mode product (generate from scratch and repurpose long video) in one cohesive DiS experience—not two disconnected demos.
- Agent orchestration with real failover so generation usually completes even when a single model is down or quota-blocked.
- Scene-level control after automation: edit copy, regen image/voice, rebuild final MP4 without rerunning the entire project.
- Face-aware vertical clipping for repurposed content—not just center crop.
- End-to-end export: captioned scene clips, concatenated output, project library, storage visibility in Settings.
- A polished, English-first UI (viral ideas, voice preview, glass iOS-style scene editor) that matches the ambition of the backend.

---

## What We Learned

- **Short-form video is an orchestration problem**, not a single-model prompt. Reliability comes from small specialized steps with clear JSON contracts between them.
- **Fallbacks are a feature, not an embarrassment**—creators care that something ships today.
- **Captions and audio are half the product**; beautiful frames without readable subtitles feel unfinished on TikTok/Reels.
- **Reference images materially improve continuity** for affiliate and character-driven stories—but only if the visual agent path consistently uses them.
- **Perceived parallelism matters**: even when some work is sequential on the server, the product narrative should feel like agents collaborating, not a loading bar through a script.
- **Platform reality** (Windows paths, yt-dlp installs, FFmpeg filters) is as important as picking the newest Gemini model name.

---

## What's Next for DiS

- **True parallel agent execution** — script, thumbnail, and scene batch generation with shared memory for character/style bible.
- **Editor subtitle styles wired to export** (cinematic, popup, karaoke) instead of UI-only toggles.
- **Motion Agent** — apply `motion_id` (zoom, pan, Ken Burns) in FFmpeg or canvas compositing per scene.
- **Clip Agent v2** — auto-post hooks, A/B title variants, and platform-specific aspect exports in one job.
- **OpenClaw-native orchestration** — deeper integration with the OpenClaw agent runtime for tool calling, memory, and multi-session projects.
- **Collaboration** — shared projects, brand kits, and template libraries for teams and agencies.
- **Analytics loop** — optional feedback from published performance to tune hook-ranking prompts over time.

---

*DiS Protocol — Do It Short. One topic. One link. Agents handle the rest.*