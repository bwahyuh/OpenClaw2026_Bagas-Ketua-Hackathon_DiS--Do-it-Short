export type ClipJobStatus = {
  id: string;
  status: "running" | "completed" | "failed";
  step: number;
  stepLabel: string;
  progress: number;
  error?: string;
  source?: {
    videoId: string;
    title: string;
    author?: string;
    thumbnailUrl?: string;
  };
  clips?: RankedClip[];
};

export type RankedClip = {
  rank: number;
  score: number;
  title: string;
  hook: string;
  reason?: string;
  comparisonBrief?: string;
  startSec: number;
  endSec: number;
  durationSec: number;
  filename: string;
  previewUrl: string;
  layout?: string;
};

export type ClipRunPayload = {
  youtubeUrl: string;
  videoId?: string;
  title?: string;
  author?: string;
  thumbnailUrl?: string;
};
