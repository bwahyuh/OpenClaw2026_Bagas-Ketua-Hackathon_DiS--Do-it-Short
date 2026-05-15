import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Youtube,
  Zap,
  CheckCircle2,
  ArrowRight,
  Loader2,
  XCircle,
  Download,
  Sparkles,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const WORKFLOW_STEPS = [
  "Process Source",
  "AI Hook Detection",
  "Final Configuration",
  "Ready for Export",
];

type YouTubeData = {
  title: string;
  author: string;
  thumbnailUrl: string;
  videoId: string;
  authorUrl?: string;
};

type RankedClip = {
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
  previewUrl?: string;
  layout?: string;
};

type ClipJob = {
  id: string;
  status: "running" | "completed" | "failed";
  step: number;
  stepLabel: string;
  progress: number;
  error?: string;
  clips?: RankedClip[];
};

function workflowFromJob(job: ClipJob | null, isProcessing: boolean) {
  return WORKFLOW_STEPS.map((label, idx) => {
    if (!job && !isProcessing) {
      return { label, status: idx === 0 ? "active" : "pending", progress: 0 };
    }
    if (job?.status === "failed") {
      const failedAt = job.step;
      if (idx < failedAt) return { label, status: "active" as const, progress: 100 };
      if (idx === failedAt) return { label, status: "active" as const, progress: 0 };
      return { label, status: "pending" as const, progress: 0 };
    }
    const current = job?.step ?? 0;
    if (idx < current) return { label, status: "active" as const, progress: 100 };
    if (idx === current) {
      const done = job?.status === "completed" && idx === WORKFLOW_STEPS.length - 1;
      return {
        label,
        status: "active" as const,
        progress: done ? 100 : Math.max(job?.progress ?? 0, isProcessing ? 5 : 0),
      };
    }
    return { label, status: "pending" as const, progress: 0 };
  });
}

export function ClipView() {
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [youtubeStatus, setYoutubeStatus] = useState<"idle" | "validating" | "valid" | "invalid">("idle");
  const [youtubeData, setYoutubeData] = useState<YouTubeData | null>(null);
  const [error, setError] = useState("");

  const [isProcessing, setIsProcessing] = useState(false);
  const [job, setJob] = useState<ClipJob | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const workflowStatus = workflowFromJob(job, isProcessing);
  const rankedClips = job?.clips ?? [];

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const handleAnalyzeVideo = async () => {
    if (!youtubeUrl) return;
    setYoutubeStatus("validating");
    setYoutubeData(null);
    setError("");
    setJob(null);
    try {
      const res = await fetch(`/api/youtube-info?url=${encodeURIComponent(youtubeUrl)}`);
      let data: {
        valid?: boolean;
        error?: string;
        title?: string;
        author?: string;
        thumbnailUrl?: string;
        videoId?: string;
        authorUrl?: string;
      } = {};
      try {
        data = await res.json();
      } catch {
        setYoutubeStatus("invalid");
        setError(
          res.status === 404
            ? "API not found. Run npm run dev and open http://localhost:3000."
            : "Invalid server response. Is the backend running?",
        );
        return;
      }
      if (res.ok && data.valid) {
        setYoutubeData({
          title: data.title!,
          author: data.author!,
          thumbnailUrl: data.thumbnailUrl!,
          videoId: data.videoId!,
          authorUrl: data.authorUrl,
        });
        setYoutubeStatus("valid");
      } else {
        setYoutubeStatus("invalid");
        setError(data.error || "Video analysis failed.");
      }
    } catch (e) {
      setYoutubeStatus("invalid");
      setError(e instanceof Error ? e.message : "Cannot reach server. Start with: npm run dev");
    }
  };

  const pollJob = (jobId: string) => {
    if (pollRef.current) clearInterval(pollRef.current);

    const fetchJob = async () => {
      try {
        const res = await fetch(`/api/clip/jobs/${jobId}`);
        if (!res.ok) return;
        const data = (await res.json()) as ClipJob;
        setJob(data);

        if (data.status === "completed" || data.status === "failed") {
          setIsProcessing(false);
          if (pollRef.current) clearInterval(pollRef.current);
          if (data.status === "failed") {
            setError(data.error || "Clip engine failed.");
          }
        }
      } catch {
        /* keep polling */
      }
    };

    void fetchJob();
    pollRef.current = setInterval(fetchJob, 1500);
  };

  const handleRunEngine = async () => {
    if (youtubeStatus !== "valid" || !youtubeData || isProcessing) return;

    setIsProcessing(true);
    setError("");
    setJob(null);

    try {
      const res = await fetch("/api/clip/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          youtubeUrl,
          videoId: youtubeData.videoId,
          title: youtubeData.title,
          author: youtubeData.author,
          thumbnailUrl: youtubeData.thumbnailUrl,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setIsProcessing(false);
        setError((data as { error?: string }).error || "Failed to start clip engine.");
        return;
      }

      const jobId = (data as { jobId?: string }).jobId;
      if (!jobId) {
        setIsProcessing(false);
        setError("Server did not return a job id.");
        return;
      }

      setJob({
        id: jobId,
        status: "running",
        step: 0,
        stepLabel: WORKFLOW_STEPS[0],
        progress: 5,
      });
      pollJob(jobId);
    } catch (e) {
      setIsProcessing(false);
      setError(e instanceof Error ? e.message : "Cannot reach server.");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-[1200px] mx-auto px-4"
    >
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 text-center"
      >
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white mb-2">
          Clip Engine
        </h1>
        <p className="text-white/40 text-sm font-medium">
          AI ranks your top 3 viral clips (40–60s each) with MediaPipe smart crop and inline preview.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-12 gap-6"
      >
        <div className="col-span-12 lg:col-span-8 ios-squircle glass-panel p-6 md:p-10 flex flex-col justify-between min-h-[280px] md:min-h-[340px] relative overflow-hidden group">
          <motion.div
            className="absolute top-0 right-0 p-8 opacity-5"
            animate={{ rotate: [0, 5, 0] }}
            transition={{ duration: 8, repeat: Infinity }}
          >
            <Youtube size={120} className="w-20 h-20 md:w-32 md:h-32" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="relative z-10"
          >
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white mb-2">
              Ingest Engine
            </h2>
            <p className="text-white/40 text-[13px] font-medium">
              Paste a YouTube URL to download and analyze viral moments.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="relative z-10 mt-8 md:mt-12"
          >
            <div className="relative flex flex-col md:flex-row items-stretch md:items-center bg-white/5 border border-white/10 rounded-2xl p-2 focus-within:bg-white/10 transition-all duration-500 gap-2">
              <Input
                value={youtubeUrl}
                onChange={(e) => {
                  setYoutubeUrl(e.target.value);
                  if (youtubeStatus !== "idle") setYoutubeStatus("idle");
                }}
                className="bg-transparent border-none text-lg md:text-xl font-medium text-white placeholder:text-white/10 focus-visible:ring-0 h-12 md:h-14 pl-2 md:pl-4"
                placeholder="Paste YouTube URL..."
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAnalyzeVideo();
                }}
              />
              <Button
                onClick={handleAnalyzeVideo}
                disabled={!youtubeUrl || youtubeStatus === "validating"}
                className="h-12 md:h-14 px-8 rounded-xl bg-white text-black font-bold tracking-tight hover:bg-white/90 transition-colors disabled:opacity-50"
              >
                {youtubeStatus === "validating" ? (
                  <Loader2 className="animate-spin w-5 h-5" />
                ) : (
                  <span className="flex items-center">
                    Analyze
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </span>
                )}
              </Button>
            </div>

            <AnimatePresence>
              {youtubeStatus === "invalid" && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mt-4 flex items-center gap-2 text-destructive font-medium text-sm pl-4"
                >
                  <XCircle className="w-4 h-4" />
                  <span>{error || "Invalid YouTube URL or video unavailable."}</span>
                </motion.div>
              )}
              {youtubeStatus === "valid" && youtubeData && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mt-4 flex flex-col md:flex-row gap-6 p-4 bg-white/5 border border-white/10 rounded-2xl items-stretch md:items-center w-full"
                >
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    className="relative aspect-video w-full md:w-64 rounded-xl overflow-hidden border border-white/10 bg-black"
                  >
                    <iframe
                      src={`https://www.youtube.com/embed/${youtubeData.videoId}`}
                      className="absolute inset-0 w-full h-full"
                      allowFullScreen
                      title="YouTube Video Preview"
                    />
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex flex-col flex-grow"
                  >
                    <span className="text-white font-bold text-lg leading-tight mb-1">
                      {youtubeData.title}
                    </span>
                    <a
                      href={youtubeData.authorUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-white/50 text-sm font-medium mb-4 hover:text-white/80 transition-colors inline-flex items-center gap-1"
                    >
                      {youtubeData.author}
                      <ArrowRight className="w-3 h-3 -rotate-45" />
                    </a>
                    <motion.div className="flex items-center gap-2 text-emerald-500 font-bold text-[10px] uppercase tracking-widest">
                      <CheckCircle2 className="w-3 h-3" />
                      Source Verified
                    </motion.div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>

        <div className="col-span-12 lg:col-span-4 ios-squircle glass-panel p-6 md:p-8 flex flex-col gap-6 md:gap-8 min-h-[280px] md:min-h-[340px]">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="flex items-center justify-between"
          >
            <h3 className="text-sm font-bold tracking-tight text-white/60 uppercase">
              Protocol Workflow
            </h3>
            <Zap className="w-4 h-4 text-white/20" />
          </motion.div>

          <div className="flex flex-col gap-5 md:gap-6">
            {workflowStatus.map((item, idx) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + idx * 0.1 }}
                className="relative flex items-center gap-4 group"
              >
                <motion.div
                  className="relative flex flex-col items-center"
                  animate={item.status === "active" && item.progress < 100 ? { scale: [1, 1.05, 1] } : {}}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <div
                    className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-500",
                      item.status === "active"
                        ? "border-white bg-white/10 shadow-[0_0_15px_rgba(255,255,255,0.2)]"
                        : "border-white/10 bg-transparent",
                    )}
                  >
                    {item.progress === 100 ? (
                      <CheckCircle2 className="w-5 h-5 text-white" />
                    ) : item.status === "active" && isProcessing ? (
                      <Loader2 className="w-4 h-4 text-white animate-spin" />
                    ) : (
                      <span
                        className={cn(
                          "text-[11px] font-bold",
                          item.status === "active" ? "text-white" : "text-white/20",
                        )}
                      >
                        {idx + 1}
                      </span>
                    )}
                  </div>
                  {idx !== workflowStatus.length - 1 && (
                    <div
                      className={cn(
                        "w-[2px] h-6 mt-1 transition-colors",
                        item.progress === 100 ? "bg-white/40" : "bg-white/10",
                      )}
                    />
                  )}
                </motion.div>
                <motion.div className="flex flex-col">
                  <span
                    className={cn(
                      "text-[13px] font-bold tracking-tight transition-colors duration-500",
                      item.status === "active" ? "text-white" : "text-white/30",
                    )}
                  >
                    {item.label}
                  </span>
                  {item.status === "active" && item.progress < 100 && isProcessing && (
                    <span className="text-[11px] text-white/40 font-medium italic">
                      {job?.progress != null ? `${job.progress}%` : "Running…"}
                    </span>
                  )}
                  {item.progress === 100 && (
                    <span className="text-[11px] text-emerald-500 font-medium">Complete</span>
                  )}
                </motion.div>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="col-span-12 lg:col-span-4 ios-squircle glass-panel p-8 flex flex-col gap-4 justify-center">
          <h3 className="text-sm font-bold tracking-tight text-white/60 uppercase">Output</h3>
          <p className="text-white/50 text-sm leading-relaxed">
            All clips are exported as <span className="text-white font-semibold">9:16 vertical</span>{" "}
            (1080×1920). Ranking uses Groq from your server <code className="text-white/70">.env</code>.
          </p>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2 text-emerald-500/90 text-xs font-bold uppercase tracking-widest"
          >
            <Sparkles className="w-3 h-3" />
            Server API from .env
          </motion.div>
        </div>

        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="col-span-12 lg:col-span-8"
        >
          <Button
            onClick={handleRunEngine}
            disabled={youtubeStatus !== "valid" || isProcessing}
            className="w-full ios-squircle bg-white text-black font-extrabold text-base tracking-tighter hover:bg-white/90 transition-all duration-500 flex flex-col gap-2 items-center justify-center p-10 group shadow-[0_20px_40px_rgba(255,255,255,0.1)] disabled:opacity-50 disabled:grayscale"
          >
            <div
              className={cn(
                "w-14 h-14 rounded-full bg-black flex items-center justify-center mb-2 transition-all duration-500",
                isProcessing ? "animate-pulse" : "group-hover:rotate-12",
              )}
            >
              {isProcessing ? (
                <Loader2 className="w-7 h-7 text-white animate-spin" />
              ) : (
                <Zap className="w-7 h-7 text-white fill-white" />
              )}
            </div>
            <span className="uppercase text-[12px] tracking-[0.2em] opacity-40">
              {isProcessing ? "Executing protocols" : "Initialize system"}
            </span>
            {isProcessing ? "PROCESSING…" : "RUN ENGINE"}
          </Button>
        </motion.div>

        <AnimatePresence>
          {(error && (job?.status === "failed" || !isProcessing)) && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="col-span-12 flex items-center gap-2 text-destructive text-sm font-medium px-2"
            >
              <XCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {rankedClips.length > 0 && job?.status === "completed" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="col-span-12 ios-squircle glass-panel p-6 md:p-8"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold text-white">Top 3 ranked clips</h3>
                  <p className="text-white/40 text-xs mt-1">
                    Sorted by viral score · MediaPipe smart crop
                  </p>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-500 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                  Ready
                </span>
              </div>
              <motion.div className="grid gap-5 lg:grid-cols-3">
                {[...rankedClips]
                  .sort((a, b) => a.rank - b.rank)
                  .map((clip) => {
                    const previewSrc =
                      clip.previewUrl ||
                      `/api/clip/jobs/${job.id}/clips/${encodeURIComponent(clip.filename)}`;
                    const downloadSrc = `${previewSrc}?download=1`;
                    return (
                      <motion.div
                        key={clip.filename}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={cn(
                          "ios-squircle rounded-2xl border flex flex-col overflow-hidden bg-white/5 backdrop-blur-xl",
                          clip.rank === 1
                            ? "border-emerald-500/30 shadow-[0_0_30px_rgba(16,185,129,0.08)]"
                            : "border-white/10",
                        )}
                      >
                        <motion.div className="relative aspect-[9/16] max-h-[420px] bg-black/60">
                          <video
                            src={previewSrc}
                            controls
                            playsInline
                            preload="metadata"
                            className="absolute inset-0 w-full h-full object-contain"
                          />
                          <motion.div className="absolute top-3 left-3 flex items-center gap-2">
                            <span
                              className={cn(
                                "px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest",
                                clip.rank === 1
                                  ? "bg-emerald-500 text-black"
                                  : "bg-white/15 text-white backdrop-blur-md",
                              )}
                            >
                              Rank #{clip.rank}
                            </span>
                            <span className="px-2 py-1 rounded-lg text-[10px] font-bold bg-black/50 text-emerald-400 backdrop-blur-md">
                              {clip.score}
                            </span>
                          </motion.div>
                        </motion.div>

                        <motion.div className="p-4 flex flex-col gap-2 flex-1">
                          <p className="text-white font-bold leading-snug">{clip.title}</p>
                          <p className="text-white/50 text-xs line-clamp-2">{clip.hook}</p>
                          <p className="text-[10px] text-white/30 font-mono">
                            {clip.startSec.toFixed(0)}s – {clip.endSec.toFixed(0)}s · {clip.durationSec}s
                            {clip.layout ? ` · ${clip.layout.replace(/_/g, " ")}` : ""}
                          </p>
                          {clip.reason && (
                            <p className="text-xs text-white/40">{clip.reason}</p>
                          )}
                          {clip.rank === 1 && clip.comparisonBrief && (
                            <p className="text-xs text-emerald-400/80 italic border-t border-white/10 pt-2 mt-1">
                              {clip.comparisonBrief}
                            </p>
                          )}
                          <a href={downloadSrc} download className="mt-auto pt-2 block">
                            <Button
                              type="button"
                              variant="secondary"
                              className="w-full h-10 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs"
                            >
                              <Download className="w-3.5 h-3.5 mr-2" />
                              Download
                            </Button>
                          </a>
                        </motion.div>
                      </motion.div>
                    );
                  })}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
