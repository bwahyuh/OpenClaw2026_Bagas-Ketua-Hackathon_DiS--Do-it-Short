# DiS Protocol — Setup Guide

This guide will get **DiS: Do It Short** running on your local machine (Windows/macOS/Linux).  
No extra files needed — copy this into your README if you want.

---

## Requirements

| Tool | Version | Required? |
|---|---|---|
| **Node.js** | 18+ (20 LTS recommended) | Yes |
| **npm** | 9+ | Yes |
| **FFmpeg** | Auto-bundled via `ffmpeg-static` | Yes (bundled) |
| **yt-dlp** | Latest | Yes, for Clip feature |
| **Google Gemini API key** | — | Yes (Create: image gen + TTS; script fallback) |
| **Groq API key** | — | Highly recommended (script, Clip + Whisper) |

---

## 1. Clone & Install

```bash
git clone <repo-url>
cd OpenclawHackaton-DiS
npm install
```

---

## 2. Environment Variables

Create a `.env` file in the project root (you can copy from `.env.example`, then replace all keys with your own — **never commit keys to Git**).

```env
# Required for image generation, TTS, and script fallback
GEMINI_API_KEY=your_gemini_api_key_here

# Recommended: faster scripts, viral ideas, and the full Clip pipeline
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=llama-3.3-70b-versatile
GROQ_WHISPER_MODEL=whisper-large-v3-turbo

# Optional — only if yt-dlp is not found on PATH (common on Windows)
# YT_DLP_PATH=C:\path\to\yt-dlp.exe

# Optional — only if using a system FFmpeg manually
# FFMPEG_PATH=C:\path\to\ffmpeg.exe
```

> **API Priority:**
> - **Create (script & viral ideas):** uses Groq if `GROQ_API_KEY` is set; falls back to Gemini otherwise.
> - **Create (images & voice):** Gemini (+ Pollinations fallback for images, Edge TTS fallback for voice).
> - **Clip:** requires Groq for Whisper transcription and viral segment ranking.

`.env.local` is also read and will override `.env`.

---

## 3. Install yt-dlp (for Clip)

**Windows (winget)**
```bash
winget install yt-dlp
```
After installing, close and reopen your terminal, then verify:
```bash
yt-dlp --version
```
If it's still not recognized, set the full path in `.env`:
```env
YT_DLP_PATH=C:\Users\<YOU>\AppData\Local\Microsoft\WinGet\Packages\yt-dlp.yt-dlp_...\yt-dlp.exe
```

**macOS**
```bash
brew install yt-dlp
```

**Linux**
```bash
sudo apt install yt-dlp
# or: pip install -U yt-dlp
```

---

## 4. Run Development Server

```bash
npm run dev
```

Server + Vite run together at: **http://localhost:3000**

You should see something like this in your terminal:
```
[SYSTEM] Command Center online at http://localhost:3000
```

---

## 5. Production Build (Optional)

```bash
npm run build
npm start
```

Set `NODE_ENV=production` so Express serves the `dist/` folder instead of the Vite dev middleware.

---

## 6. Quick Usage

1. Open **http://localhost:3000**
2. Sign in via the app's dummy auth (stored in `localStorage`)
3. **Create** — enter a topic, preset, and style → Generate → edit per scene in the Scene Editor
4. **Clip** — paste a YouTube URL → enter your Groq API key as the access token (same as `GROQ_API_KEY` on the server) → process clips

---

## 7. Auto-Generated Folders

| Folder | Contents |
|---|---|
| `generated/` | Video projects (`DIS-xxxx/`), scene assets, `output.mp4` |
| `projects_cache/` | Project metadata JSON |
| `clip_cache/` | YouTube downloads & clip outputs |

> These can be cleared from **Settings → Storage** inside the app.

---

## 8. Troubleshooting

| Issue | Fix |
|---|---|
| `GEMINI_API_KEY is not configured` | Add `GEMINI_API_KEY` to `.env`, restart `npm run dev` |
| Placeholder images / generation failed | Check Gemini quota; pipeline will try other models + Pollinations |
| Voice generation failed | Gemini TTS quota hit → auto-fallback to Edge TTS |
| Clip: `yt-dlp is not on PATH` | Install yt-dlp or set `YT_DLP_PATH` in `.env` |
| Clip: transcription failed | Make sure `GROQ_API_KEY` is valid |
| Imagen not working | Expected on free tier; pipeline skips Imagen gracefully |
| `.env` changes not applying | Stop the server (`Ctrl+C`), run `npm run dev` again |

---

## 9. npm Scripts

| Command | Description |
|---|---|
| `npm run dev` | Dev server (Express + Vite) on port 3000 |
| `npm run build` | Build frontend + bundle server |
| `npm start` | Run production build (`dist/server.cjs`) |
| `npm run lint` | Type check (`tsc --noEmit`) |

---

## 10. Where to Get API Keys

- **Gemini:** [Google AI Studio](https://aistudio.google.com)
- **Groq:** [Groq Console](https://console.groq.com)

---

## ⚡ Quick Start

```bash
npm install
cp .env.example .env   # then fill in your keys
winget install yt-dlp  # Windows only, for Clip
npm run dev
# open http://localhost:3000
```
