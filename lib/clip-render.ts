import ffmpeg from "fluent-ffmpeg";
import type { LayoutConfig } from "./visual-layout-agent.js";

function buildComplexFilter(config: LayoutConfig): string {
  if (config.layout === "podcast_split") {
    return [
      "split=2[t_raw][b_raw]",
      "[t_raw]crop=iw/2:ih:0:0,scale=1080:960:force_original_aspect_ratio=increase,crop=1080:960[t]",
      "[b_raw]crop=iw/2:ih:iw/2:0,scale=1080:960:force_original_aspect_ratio=increase,crop=1080:960[b]",
      "[t][b]vstack=inputs=2",
    ].join(";");
  }

  if (config.layout === "smart_crop") {
    const x = config.xPercent;
    const ow = "ih*9/16";
    return `crop=w=${ow}:h=ih:x='clip(iw*${x}-(${ow}/2),0,iw-${ow})',scale=1080:1920`;
  }

  return [
    "split=2[bg][fg]",
    "[bg]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=20:10[blurred]",
    "[fg]scale=1080:1920:force_original_aspect_ratio=decrease[scaled]",
    "[blurred][scaled]overlay=(main_w-overlay_w)/2:(main_h-overlay_h)/2",
  ].join(";");
}

export function renderVerticalClip(
  inputPath: string,
  outputPath: string,
  startTime: number,
  endTime: number,
  layout: LayoutConfig,
): Promise<void> {
  const duration = endTime - startTime;
  const filter = buildComplexFilter(layout);

  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .setStartTime(startTime)
      .setDuration(duration)
      .complexFilter(filter)
      .outputOptions([
        "-c:v libx264",
        "-crf 18",
        "-preset veryfast",
        "-c:a aac",
        "-b:a 192k",
        "-movflags +faststart",
      ])
      .on("end", () => resolve())
      .on("error", reject)
      .save(outputPath);
  });
}
