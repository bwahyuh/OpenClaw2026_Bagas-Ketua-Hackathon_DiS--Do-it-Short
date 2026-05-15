import path from "path";
import { createRequire } from "module";
import fs from "fs/promises";
import { createCanvas, loadImage } from "canvas";
import type { FaceDetector } from "@tensorflow-models/face-detection";
import ffmpeg from "fluent-ffmpeg";

const require = createRequire(import.meta.url);

export type LayoutConfig =
  | { layout: "smart_crop"; xPercent: number }
  | { layout: "podcast_split" }
  | { layout: "fit_with_padding" };

let detectorPromise: Promise<FaceDetector | null> | null = null;
let backendReady = false;

async function ensureTfBackend(): Promise<boolean> {
  if (backendReady) return true;
  try {
    const tf = await import("@tensorflow/tfjs");
    const wasm = await import("@tensorflow/tfjs-backend-wasm");
    const wasmDir = path.join(
      path.dirname(require.resolve("@tensorflow/tfjs-backend-wasm/package.json")),
      "dist",
    );
    wasm.setWasmPaths(`file://${wasmDir.replace(/\\/g, "/")}/`);
    await tf.setBackend("wasm");
    await tf.ready();
    backendReady = true;
    return true;
  } catch (err) {
    console.warn("[VISUAL AGENT] TensorFlow WASM backend failed:", err);
    return false;
  }
}

async function getDetector(): Promise<FaceDetector | null> {
  if (detectorPromise) return detectorPromise;

  detectorPromise = (async () => {
    if (!(await ensureTfBackend())) return null;
    try {
      const faceDetection = await import("@tensorflow-models/face-detection");
      return await faceDetection.createDetector(
        faceDetection.SupportedModels.MediaPipeFaceDetector,
        { runtime: "tfjs", maxFaces: 10 },
      );
    } catch (err) {
      console.warn("[VISUAL AGENT] Face detector load failed:", err);
      return null;
    }
  })();

  return detectorPromise;
}

function resetDetector() {
  detectorPromise = null;
}

/**
 * Multi-point face sampling (feat/backend-clip) to pick vertical layout.
 */
export async function detectVisualLayout(
  videoPath: string,
  startTime: number,
  endTime: number,
  workDir: string,
): Promise<LayoutConfig> {
  try {
    const detector = await getDetector();
    if (!detector) {
      return { layout: "fit_with_padding" };
    }

    const duration = endTime - startTime;
    const samplePoints = [
      startTime + duration * 0.2,
      startTime + duration * 0.5,
      startTime + duration * 0.8,
    ];

    const detections: { faces: number; xPercent: number }[] = [];
    await fs.mkdir(workDir, { recursive: true });

    for (const ts of samplePoints) {
      const screenshotPath = path.join(
        workDir,
        `scan_${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`,
      );

      await new Promise<void>((resolve, reject) => {
        ffmpeg(videoPath)
          .seekInput(ts)
          .frames(1)
          .on("end", () => resolve())
          .on("error", reject)
          .save(screenshotPath);
      });

      try {
        const img = await loadImage(screenshotPath);
        const canvas = createCanvas(img.width, img.height);
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);

        const faces = await detector.estimateFaces(canvas as unknown as HTMLCanvasElement);
        if (faces.length > 0) {
          const avgX =
            faces.reduce((sum, f) => sum + (f.box.xMin + f.box.width / 2), 0) / faces.length;
          detections.push({ faces: faces.length, xPercent: avgX / img.width });
        } else {
          detections.push({ faces: 0, xPercent: 0.5 });
        }
      } finally {
        await fs.unlink(screenshotPath).catch(() => {});
      }
    }

    if (detections.length === 0) {
      return { layout: "fit_with_padding" };
    }

    const maxFaces = Math.max(...detections.map((d) => d.faces));
    const minFaces = Math.min(...detections.map((d) => d.faces));
    const avgXPercent =
      detections.reduce((sum, d) => sum + d.xPercent, 0) / detections.length;

    if (maxFaces !== minFaces && maxFaces > 1) {
      return { layout: "fit_with_padding" };
    }
    if (maxFaces >= 2) {
      return { layout: "podcast_split" };
    }
    if (maxFaces === 1) {
      return { layout: "smart_crop", xPercent: avgXPercent };
    }
    return { layout: "fit_with_padding" };
  } catch (err) {
    resetDetector();
    console.warn("[VISUAL AGENT] Face detection unavailable, using fit_with_padding:", err);
    return { layout: "fit_with_padding" };
  }
}
