import type { ClipJobStatus } from "./clip-types.js";

const jobs = new Map<string, ClipJobStatus>();

export function createClipJob(id: string, source?: ClipJobStatus["source"]): ClipJobStatus {
  const job: ClipJobStatus = {
    id,
    status: "running",
    step: 0,
    stepLabel: "Process Source",
    progress: 0,
    source,
  };
  jobs.set(id, job);
  return job;
}

export function updateClipJob(id: string, patch: Partial<ClipJobStatus>) {
  const current = jobs.get(id);
  if (!current) return;
  jobs.set(id, { ...current, ...patch });
}

export function getClipJob(id: string): ClipJobStatus | undefined {
  return jobs.get(id);
}

export function completeClipJob(id: string, clips: ClipJobStatus["clips"]) {
  updateClipJob(id, {
    status: "completed",
    clips,
    progress: 100,
    step: 3,
    stepLabel: "Ready for Export",
  });
}

export function failClipJob(id: string, error: string) {
  updateClipJob(id, { status: "failed", error, stepLabel: "Failed" });
}
