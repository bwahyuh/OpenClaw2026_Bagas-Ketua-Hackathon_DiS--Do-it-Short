export type AudioEngine = "gemini" | "edge";
export type ScriptStyle = "narration" | "dialog";
export type AspectRatio = "9:16" | "16:9" | "1:1";

export type CreateFormPayload = {
  useBuiltInGemini: boolean;
  apiEngine: string;
  viralPreset: string;
  productName?: string;
  productBenefits?: string;
  productImage?: string | null;
  videoConcept: string;
  topic: string;
  topicContext: string;
  narrativeStructure: string;
  scriptStyle: ScriptStyle;
  duration: string;
  platform: string;
  aspectRatio: AspectRatio;
  numScenes: number;
  style: string;
  language: string;
  tone: string;
  colorMood: string;
  audioEngine: AudioEngine;
  narrator: string;
  voiceSpeed: number;
  includeCTA: boolean;
  useThumbnail: boolean;
  ctaText: string;
  charImage?: string | null;
};

export type SceneScript = {
  narration: string;
  /** Primary visual direction for Imagen (Gemini Canvas: visual_prompts[0]) */
  visual_prompts: string[];
  description?: string;
  motion_id?: string;
};

export type GeneratedScript = {
  title: string;
  thumbnail_prompt?: string;
  scenes: SceneScript[];
  marketing?: {
    title?: string;
    description?: string;
    tags?: string[];
    hashtags?: string[];
  };
};

export type CreateJobStatus = {
  id: string;
  status: "running" | "completed" | "failed";
  step: number;
  stepLabel: string;
  progress: number;
  projectId?: string;
  error?: string;
};

export type VideoProject = {
  id: string;
  title: string;
  timestamp: string;
  size: string;
  thumbnailColor?: string;
  format: string;
  duration: string;
  narrative: GeneratedScript;
  formData: CreateFormPayload;
  videoUrl: string;
  audioUrl?: string;
  status: "ready" | "processing" | "failed";
};
