import React, { useState, useRef, useCallback } from "react";
import { motion } from "motion/react";
import type { VideoProject } from "@/src/types/video";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Layers,
  Loader2,
  Mic,
  Play,
  Pause,
  RefreshCw,
  ImageIcon,
  ChevronUp,
  ChevronDown,
  Film,
  Wand2,
} from "lucide-react";

interface CreateSceneEditorProps {
  project: VideoProject;
  onProjectUpdate: (project: VideoProject) => void;
  onOpenFullEditor?: () => void;
}

export function CreateSceneEditor({
  project,
  onProjectUpdate,
  onOpenFullEditor,
}: CreateSceneEditorProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [minimized, setMinimized] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  const [videoKey, setVideoKey] = useState(0);
  const [imageVersions, setImageVersions] = useState<Record<number, number>>({});
  const [sceneNotice, setSceneNotice] = useState<string | null>(null);
  const sceneAudioRef = useRef<HTMLAudioElement | null>(null);
  const saveTimers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});

  const scenes = project.narrative.scenes;

  const debouncedSave = useCallback(
    (index: number, patch: { narration?: string; visual_prompt?: string }) => {
      if (saveTimers.current[index]) clearTimeout(saveTimers.current[index]);
      saveTimers.current[index] = setTimeout(async () => {
        try {
          const res = await fetch(`/api/projects/${project.id}/scenes/${index}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(patch),
          });
          const updated = await res.json();
          if (res.ok) onProjectUpdate(updated);
        } catch {
          /* silent */
        }
      }, 600);
    },
    [project.id, onProjectUpdate],
  );

  const updateLocalScene = (
    index: number,
    patch: Partial<{ narration: string; visual_prompts: string[] }>,
  ) => {
    onProjectUpdate({
      ...project,
      narrative: {
        ...project.narrative,
        scenes: project.narrative.scenes.map((s, i) =>
          i === index
            ? { ...s, ...patch, visual_prompts: patch.visual_prompts ?? s.visual_prompts }
            : s,
        ),
      },
    });
  };

  const bumpImage = (index: number) => {
    setImageVersions((prev) => ({ ...prev, [index]: Date.now() }));
    setVideoKey((k) => k + 1);
  };

  const handleRegenImage = async (index: number) => {
    setBusy(`img-${index}`);
    setSceneNotice(null);
    try {
      const res = await fetch(
        `/api/projects/${project.id}/scenes/${index}/regenerate-image`,
        { method: "POST" },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Image regeneration failed");

      const { imageMeta, ...updatedProject } = data as VideoProject & {
        imageMeta?: { usedFallback?: boolean; source?: string | null };
      };
      onProjectUpdate(updatedProject);
      bumpImage(index);

      if (imageMeta?.usedFallback) {
        setSceneNotice(
          `Scene ${index + 1}: all image providers failed — placeholder used. Wait a minute for Gemini quota reset, or edit the visual prompt and retry.`,
        );
      } else {
        const via = imageMeta?.source ?? "gemini";
        const model = imageMeta?.model ? ` · ${imageMeta.model}` : "";
        setSceneNotice(`Scene ${index + 1}: image regenerated (${via}${model}).`);
      }
    } catch (err) {
      setSceneNotice(
        err instanceof Error ? err.message : `Scene ${index + 1}: failed to regenerate image.`,
      );
    } finally {
      setBusy(null);
    }
  };

  const handleRegenAudio = async (index: number) => {
    setBusy(`audio-${index}`);
    setSceneNotice(null);
    try {
      const res = await fetch(
        `/api/projects/${project.id}/scenes/${index}/regenerate-audio`,
        { method: "POST" },
      );
      const updated = await res.json();
      if (!res.ok) throw new Error(updated.error || "Audio regeneration failed");
      onProjectUpdate(updated);
      setVideoKey((k) => k + 1);
      setSceneNotice(`Scene ${index + 1}: voice regenerated.`);
    } catch (err) {
      setSceneNotice(
        err instanceof Error ? err.message : `Scene ${index + 1}: failed to regenerate voice.`,
      );
    } finally {
      setBusy(null);
    }
  };

  const toggleSceneAudio = (index: number) => {
    const audio = sceneAudioRef.current;
    if (!audio) return;
    if (playingIndex === index) {
      audio.pause();
      setPlayingIndex(null);
      return;
    }
    audio.src = `/api/projects/${project.id}/scenes/${index}/audio?t=${Date.now()}`;
    void audio.play();
    setPlayingIndex(index);
  };

  return (
    <motion.div className="flex flex-col gap-4 h-full">
      <div className="rounded-[24px] overflow-hidden border border-white/10 bg-black/40 aspect-video relative">
        <video
          key={videoKey}
          src={`${project.videoUrl}?t=${videoKey}`}
          className="w-full h-full object-contain"
          controls
          playsInline
        />
        <div className="absolute top-3 left-3 px-3 py-1.5 rounded-xl bg-black/50 border border-white/10 backdrop-blur-md">
          <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Preview</p>
          <p className="text-xs text-white font-bold truncate max-w-[200px]">{project.title}</p>
        </div>
      </div>

      <div className="ios-squircle glass-panel p-4 flex flex-col gap-3 flex-1 min-h-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-white/30">
            <Layers className="w-4 h-4" />
            <span className="text-[11px] font-black uppercase tracking-[0.3em]">Scene Editor</span>
          </div>
          <div className="flex items-center gap-2">
            {onOpenFullEditor && (
              <Button
                type="button"
                size="sm"
                onClick={onOpenFullEditor}
                className="h-8 rounded-lg bg-white/10 text-white text-[10px] font-bold uppercase hover:bg-white/20"
              >
                <Film className="w-3 h-3 mr-1" /> Full Editor
              </Button>
            )}
            <button
              type="button"
              onClick={() => setMinimized(!minimized)}
              className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10"
            >
              {minimized ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {sceneNotice && (
          <p
            className={cn(
              "text-[10px] px-3 py-2 rounded-xl border",
              sceneNotice.includes("failed") || sceneNotice.includes("unavailable")
                ? "text-amber-300/90 bg-amber-500/10 border-amber-400/30"
                : "text-emerald-300/90 bg-emerald-500/10 border-emerald-400/30",
            )}
          >
            {sceneNotice}
          </p>
        )}

        {!minimized && (
          <div className="flex flex-col gap-3 overflow-y-auto max-h-[min(52vh,520px)] pr-1 custom-scrollbar">
            {scenes.map((scene, idx) => (
              <div
                key={idx}
                className={cn(
                  "p-3 rounded-2xl border transition-all",
                  currentIndex === idx
                    ? "bg-cyan-500/10 border-cyan-400/40"
                    : "bg-white/[0.03] border-white/10 hover:border-white/20",
                )}
                onClick={() => setCurrentIndex(idx)}
              >
                <div className="flex gap-3 items-start">
                  <div className="w-24 h-24 shrink-0 rounded-xl overflow-hidden bg-black/50 border border-white/10 relative group">
                    <img
                      src={`/api/projects/${project.id}/scenes/${idx}/image?t=${imageVersions[idx] ?? videoKey}`}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                    {busy === `img-${idx}` && (
                      <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                        <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleRegenImage(idx);
                      }}
                      disabled={!!busy}
                      className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center gap-1 transition-opacity"
                      title="Regenerate image"
                    >
                      <RefreshCw className="w-4 h-4 text-cyan-300" />
                      <span className="text-[8px] font-bold uppercase text-white/90">Regen</span>
                    </button>
                  </div>

                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-[10px] font-black uppercase text-white/40">
                        Scene {idx + 1}
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        <Button
                          type="button"
                          size="sm"
                          disabled={!!busy}
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleRegenImage(idx);
                          }}
                          className="h-7 px-2.5 rounded-lg bg-cyan-500/15 text-cyan-300 border border-cyan-400/30 hover:bg-cyan-500/25 text-[9px] font-bold uppercase"
                        >
                          {busy === `img-${idx}` ? (
                            <Loader2 className="w-3 h-3 animate-spin mr-1" />
                          ) : (
                            <ImageIcon className="w-3 h-3 mr-1" />
                          )}
                          Regenerate Image
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          disabled={!!busy}
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleRegenAudio(idx);
                          }}
                          className="h-7 px-2.5 rounded-lg bg-purple-500/15 text-purple-300 border border-purple-400/30 hover:bg-purple-500/25 text-[9px] font-bold uppercase"
                        >
                          {busy === `audio-${idx}` ? (
                            <Loader2 className="w-3 h-3 animate-spin mr-1" />
                          ) : (
                            <Mic className="w-3 h-3 mr-1" />
                          )}
                          Regenerate Voice
                        </Button>
                      </div>
                    </div>

                    <textarea
                      value={scene.narration}
                      onChange={(e) => {
                        updateLocalScene(idx, { narration: e.target.value });
                        debouncedSave(idx, { narration: e.target.value });
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white resize-none min-h-[56px] focus:outline-none focus:ring-1 focus:ring-cyan-400/40"
                      placeholder="Narration text..."
                    />

                    <div className="rounded-xl bg-black/30 border border-white/10 p-2">
                      <label className="text-[9px] font-bold uppercase text-white/30 flex items-center gap-1 mb-1">
                        <ImageIcon className="w-3 h-3" /> Visual prompt
                      </label>
                      <textarea
                        value={scene.visual_prompts?.[0] || ""}
                        onChange={(e) => {
                          updateLocalScene(idx, { visual_prompts: [e.target.value] });
                          debouncedSave(idx, { visual_prompt: e.target.value });
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full bg-transparent text-[10px] text-white/60 italic resize-y min-h-[48px] focus:outline-none focus:ring-1 focus:ring-cyan-400/30 rounded-lg p-1"
                        placeholder="Describe the shot in English..."
                      />
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSceneAudio(idx);
                      }}
                      className={cn(
                        "text-[10px] px-2 py-1 rounded-lg flex items-center gap-1.5 border transition-colors",
                        playingIndex === idx
                          ? "bg-emerald-500/20 border-emerald-400/40 text-emerald-300"
                          : "bg-white/5 border-white/10 text-white/50 hover:text-white",
                      )}
                    >
                      {playingIndex === idx ? (
                        <Pause className="w-3 h-3" />
                      ) : (
                        <Play className="w-3 h-3" />
                      )}
                      {playingIndex === idx ? "Playing..." : "Play audio"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="text-[10px] text-white/30 text-center flex items-center justify-center gap-1">
          <Wand2 className="w-3 h-3" /> Edit prompts, then use Regenerate Image or Regenerate Voice per scene.
        </p>
      </div>

      <audio ref={sceneAudioRef} onEnded={() => setPlayingIndex(null)} className="hidden" />
    </motion.div>
  );
}
