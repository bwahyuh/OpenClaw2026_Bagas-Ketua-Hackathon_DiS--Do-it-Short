import { existsSync } from "fs";
import fs from "fs/promises";
import path from "path";

function wrapNarration(text: string, maxChars = 40, maxLines = 3): string {
  const words = text.trim().replace(/\s+/g, " ").split(" ");
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
  return lines.slice(0, maxLines).join("\n");
}

/** Write scene narration to a temp file for ffmpeg drawtext textfile= */
export async function prepareSubtitleTextFile(
  scenesDir: string,
  sceneIndex: number,
  narration: string,
): Promise<string | null> {
  const body = wrapNarration(narration);
  if (!body) return null;
  const filePath = path.join(scenesDir, `subtitle-${sceneIndex}.txt`);
  await fs.writeFile(filePath, body, "utf8");
  return filePath;
}

function fontFileForFfmpeg(): string {
  const candidates =
    process.platform === "win32"
      ? ["C:/Windows/Fonts/arialbd.ttf", "C:/Windows/Fonts/Arial.ttf"]
      : process.platform === "darwin"
        ? [
            "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
            "/Library/Fonts/Arial.ttf",
          ]
        : [
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
            "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
          ];

  for (const p of candidates) {
    if (existsSync(p)) {
      const escaped = p.replace(/\\/g, "/").replace(/:/g, "\\:");
      return `fontfile=${escaped}:`;
    }
  }
  return "";
}

/** ffmpeg drawtext filter — TikTok-style bottom caption box */
export function subtitleFilterFromTextFile(
  textFilePath: string,
  videoWidth: number,
  videoHeight: number,
): string {
  const escaped = textFilePath.replace(/\\/g, "/").replace(/:/g, "\\:");
  const fontSize = Math.max(26, Math.round(videoWidth * 0.042));
  const y = Math.round(videoHeight * 0.72);
  const font = fontFileForFfmpeg();
  return `${font}drawtext=textfile='${escaped}':fontsize=${fontSize}:fontcolor=white:borderw=2:bordercolor=black@0.9:x=(w-text_w)/2:y=${y}:box=1:boxcolor=black@0.55:boxborderw=14:line_spacing=10`;
}
