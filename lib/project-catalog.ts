import path from "path";
import fs from "fs/promises";
import type { VideoProject } from "./create-types.js";

const PROJECTS_DIR = path.join(process.cwd(), "projects_cache");
const GENERATED_DIR = path.join(process.cwd(), "generated");

export type ProjectListItem = {
  id: string;
  title: string;
  timestamp: string;
  size: string;
  thumbnailColor?: string;
  hasVideo: boolean;
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function fileSizeSafe(filePath: string): Promise<number> {
  try {
    const stat = await fs.stat(filePath);
    return stat.size;
  } catch {
    return 0;
  }
}

function toListItem(project: Partial<VideoProject> & { id: string }, videoBytes: number): ProjectListItem {
  return {
    id: project.id,
    title: project.title || project.id,
    timestamp: project.timestamp || new Date().toISOString(),
    size: project.size || formatSize(videoBytes),
    thumbnailColor: project.thumbnailColor,
    hasVideo: videoBytes > 0,
  };
}

/** Merge projects_cache JSON files with generated/{id}/ folders that have output.mp4 */
export async function listAllProjects(): Promise<ProjectListItem[]> {
  const byId = new Map<string, ProjectListItem>();

  try {
    const cacheFiles = await fs.readdir(PROJECTS_DIR);
    for (const file of cacheFiles) {
      if (!file.endsWith(".json")) continue;
      try {
        const raw = await fs.readFile(path.join(PROJECTS_DIR, file), "utf-8");
        const project = JSON.parse(raw) as VideoProject;
        if (!project?.id) continue;
        const videoPath = path.join(GENERATED_DIR, project.id, "output.mp4");
        const videoBytes = await fileSizeSafe(videoPath);
        byId.set(project.id, toListItem(project, videoBytes));
      } catch {
        /* skip corrupt json */
      }
    }
  } catch {
    /* projects_cache may not exist */
  }

  try {
    const dirs = await fs.readdir(GENERATED_DIR);
    for (const dir of dirs) {
      if (!dir.startsWith("DIS-")) continue;
      const videoPath = path.join(GENERATED_DIR, dir, "output.mp4");
      const videoBytes = await fileSizeSafe(videoPath);
      if (videoBytes === 0) continue;

      if (byId.has(dir)) {
        const existing = byId.get(dir)!;
        if (!existing.hasVideo) {
          byId.set(dir, { ...existing, hasVideo: true, size: formatSize(videoBytes) });
        }
        continue;
      }

      let project: Partial<VideoProject> = { id: dir, title: dir };
      const metaPath = path.join(GENERATED_DIR, dir, "project.json");
      try {
        const raw = await fs.readFile(metaPath, "utf-8");
        project = { ...project, ...(JSON.parse(raw) as VideoProject) };
      } catch {
        const stat = await fs.stat(videoPath);
        project.timestamp = stat.mtime.toISOString();
      }

      byId.set(dir, toListItem(project, videoBytes));

      const cachePath = path.join(PROJECTS_DIR, `${dir}.json`);
      try {
        await fs.access(cachePath);
      } catch {
        await fs.mkdir(PROJECTS_DIR, { recursive: true });
        await fs.writeFile(
          cachePath,
          JSON.stringify(
            {
              ...project,
              id: dir,
              timestamp: project.timestamp || new Date().toISOString(),
              size: formatSize(videoBytes),
              status: "ready",
            },
            null,
            2,
          ),
        );
      }
    }
  } catch {
    /* generated may not exist */
  }

  return [...byId.values()]
    .filter((p) => p.hasVideo || p.title)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}
