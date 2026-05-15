import type { CreateJobStatus } from "./create-types.js";

const jobs = new Map<string, CreateJobStatus>();

export function createJob(id: string): CreateJobStatus {
  const job: CreateJobStatus = {
    id,
    status: "running",
    step: 0,
    stepLabel: "Initializing Core",
    progress: 0,
  };
  jobs.set(id, job);
  return job;
}

export function updateJob(id: string, patch: Partial<CreateJobStatus>) {
  const current = jobs.get(id);
  if (!current) return;
  jobs.set(id, { ...current, ...patch });
}

export function getJob(id: string): CreateJobStatus | undefined {
  return jobs.get(id);
}

export function completeJob(id: string, projectId: string) {
  updateJob(id, {
    status: "completed",
    projectId,
    progress: 100,
    step: 5,
    stepLabel: "Complete",
  });
}

export function failJob(id: string, error: string) {
  updateJob(id, { status: "failed", error, stepLabel: "Failed" });
}
