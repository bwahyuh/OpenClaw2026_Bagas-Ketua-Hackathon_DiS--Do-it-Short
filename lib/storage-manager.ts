import path from "path";
import fs from "fs/promises";

const GENERATED_DIR = path.join(process.cwd(), "generated");
const CLIP_CACHE_DIR = path.join(process.cwd(), "clip_cache");
const PROJECTS_DIR = path.join(process.cwd(), "projects_cache");

export type StorageEntry = {
  id: string;
  kind: "project" | "clip_job";
  label: string;
  path: string;
  sizeBytes: number;
  sizeLabel: string;
  modifiedAt: string;
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

async function dirSize(dirPath: string): Promise<{ bytes: number; mtime: Date }> {
  let bytes = 0;
  let mtime = new Date(0);
  async function walk(current: string) {
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
      } else if (entry.isFile()) {
        const stat = await fs.stat(full);
        bytes += stat.size;
        if (stat.mtime > mtime) mtime = stat.mtime;
      }
    }
  }
  try {
    await walk(dirPath);
    const rootStat = await fs.stat(dirPath);
    if (rootStat.mtime > mtime) mtime = rootStat.mtime;
  } catch {
    return { bytes: 0, mtime: new Date() };
  }
  return { bytes, mtime };
}

export async function listStorageEntries(): Promise<StorageEntry[]> {
  const items: StorageEntry[] = [];

  try {
    const projectDirs = await fs.readdir(GENERATED_DIR);
    for (const id of projectDirs) {
      if (!id.startsWith("DIS-") && !id.startsWith("_preview")) continue;
      const dirPath = path.join(GENERATED_DIR, id);
      const stat = await fs.stat(dirPath).catch(() => null);
      if (!stat?.isDirectory()) continue;
      const { bytes, mtime } = await dirSize(dirPath);
      if (bytes === 0) continue;
      items.push({
        id,
        kind: "project",
        label: id.startsWith("_preview") ? "Voice preview cache" : `Project ${id}`,
        path: dirPath,
        sizeBytes: bytes,
        sizeLabel: formatSize(bytes),
        modifiedAt: mtime.toISOString(),
      });
    }
  } catch {
    /* empty */
  }

  try {
    const clipJobs = await fs.readdir(CLIP_CACHE_DIR);
    for (const id of clipJobs) {
      const dirPath = path.join(CLIP_CACHE_DIR, id);
      const stat = await fs.stat(dirPath).catch(() => null);
      if (!stat?.isDirectory()) continue;
      const { bytes, mtime } = await dirSize(dirPath);
      if (bytes === 0) continue;
      items.push({
        id,
        kind: "clip_job",
        label: `Clip job ${id.slice(0, 8)}…`,
        path: dirPath,
        sizeBytes: bytes,
        sizeLabel: formatSize(bytes),
        modifiedAt: mtime.toISOString(),
      });
    }
  } catch {
    /* empty */
  }

  return items.sort(
    (a, b) => new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime(),
  );
}

export async function getStorageSummary(): Promise<{
  totalBytes: number;
  totalLabel: string;
  entries: StorageEntry[];
}> {
  const entries = await listStorageEntries();
  const totalBytes = entries.reduce((sum, e) => sum + e.sizeBytes, 0);
  return {
    totalBytes,
    totalLabel: formatSize(totalBytes),
    entries,
  };
}

export async function deleteStorageEntry(kind: StorageEntry["kind"], id: string): Promise<void> {
  const safeId = path.basename(id);
  if (kind === "project") {
    await fs.rm(path.join(GENERATED_DIR, safeId), { recursive: true, force: true });
    await fs.unlink(path.join(PROJECTS_DIR, `${safeId}.json`)).catch(() => {});
    return;
  }
  if (kind === "clip_job") {
    await fs.rm(path.join(CLIP_CACHE_DIR, safeId), { recursive: true, force: true });
    return;
  }
  throw new Error("Unknown storage entry type.");
}

export async function purgeAllStorage(): Promise<number> {
  const entries = await listStorageEntries();
  for (const entry of entries) {
    await deleteStorageEntry(entry.kind, entry.id);
  }
  return entries.length;
}
