import React, { useState, useRef, ChangeEvent, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import type { VideoProject } from "@/src/types/video";
import type { CreateFormPayload, AudioEngine } from "@/lib/create-types";
import {
  DEFAULT_CREATE_FORM,
  GEMINI_VOICE_OPTIONS,
  EDGE_VOICE_OPTIONS,
  VIRAL_PRESET_OPTIONS,
  VIDEO_CONCEPT_OPTIONS,
  VISUAL_STYLE_OPTIONS,
  LANGUAGE_OPTIONS,
  PLATFORM_OPTIONS,
  structureOptionsFor,
  TONE_OPTIONS,
  COLOR_MOOD_OPTIONS,
} from "@/lib/create-form-options";
import {
  SCRIPT_MODEL,
  IMAGEN_MODEL,
  GEMINI_TTS_MODEL,
  GEMINI_IMAGE_MODEL,
} from "@/lib/gemini-models";
import {
  Wand2,
  Loader2,
  Lightbulb,
  Key,
  Info,
  Clock,
  UserCheck,
  User,
  X,
  Upload,
  Mic,
  AlignLeft,
  MessageCircle,
  ShoppingBag,
  Sparkles,
  Film,
  Palette,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { GlassSelect } from "@/components/GlassSelect";
import { CreateSceneEditor } from "./CreateSceneEditor";

interface CreateViewProps {
  onGenerate?: (project: VideoProject) => void;
  onOpenEditor?: (project: VideoProject) => void;
}

const field =
  "w-full h-10 bg-white/5 border-none rounded-xl px-4 text-[12px] font-bold text-white placeholder:text-white/20 focus-visible:bg-white/10 focus-visible:ring-1 focus-visible:ring-white/20 outline-none transition-all appearance-none cursor-pointer";
const fieldArea =
  "w-full min-h-[72px] bg-white/5 border-none rounded-2xl px-4 py-3 text-[13px] font-medium text-white placeholder:text-white/15 resize-none focus-visible:bg-white/10 outline-none transition-all";
const label = "text-[9px] uppercase tracking-widest text-white/20 pl-1 block mb-1.5";
const labelSm = "text-[9px] uppercase tracking-widest text-white/20 pl-1 block mb-1.5";
const sectionTitle = "text-[11px] font-black uppercase tracking-[0.3em] text-white/30";
const insetPanel = "rounded-[28px] bg-white/[0.02] border border-white/5 p-4";
const iconBtn =
  "w-10 h-10 shrink-0 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center hover:bg-white/20 active:scale-95 transition-all text-white";

function SectionHeader({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-2 text-white/30 mb-3">
      <Icon className="w-3.5 h-3.5" />
      <span className={sectionTitle}>{title}</span>
    </div>
  );
}

const loadingSteps = [
  { title: "Initializing Core", desc: "Booting synthetic vision engine" },
  { title: "Generating Narrative", desc: "Writing script & visual prompts" },
  { title: "Visual Synthesis", desc: "Imagen 4 — scene images" },
  { title: "Voice Synthesis", desc: "Gemini TTS / Edge voiceover" },
  { title: "Assembling Video", desc: "FFmpeg assembling MP4" },
  { title: "Finalizing Export", desc: "Saving project to editor" },
];

export function CreateView({ onGenerate, onOpenEditor }: CreateViewProps) {
  const [form, setForm] = useState<CreateFormPayload>({ ...DEFAULT_CREATE_FORM });
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [jobProgress, setJobProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [showIdeaModal, setShowIdeaModal] = useState(false);
  const [generatedIdeas, setGeneratedIdeas] = useState<string[]>([]);
  const [generatedProject, setGeneratedProject] = useState<VideoProject | null>(null);
  const [isPlayingVoice, setIsPlayingVoice] = useState(false);
  const [configMinimized, setConfigMinimized] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const charFileRef = useRef<HTMLInputElement>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  const voiceOptions = form.audioEngine === "edge" ? EDGE_VOICE_OPTIONS : GEMINI_VOICE_OPTIONS;
  const structures = useMemo(() => structureOptionsFor(form.viralPreset), [form.viralPreset]);
  const viralGroups = useMemo(
    () =>
      [...new Set(VIRAL_PRESET_OPTIONS.map((o) => o.group))].map((group) => ({
        label: group,
        options: VIRAL_PRESET_OPTIONS.filter((o) => o.group === group).map((o) => ({
          value: o.value,
          label: o.label,
        })),
      })),
    [],
  );
  const videoConceptGroups = useMemo(
    () =>
      [...new Set(VIDEO_CONCEPT_OPTIONS.map((o) => o.group))].map((group) => ({
        label: group,
        options: VIDEO_CONCEPT_OPTIONS.filter((o) => o.group === group).map((o) => ({
          value: o.value,
          label: o.label,
        })),
      })),
    [],
  );
  const voiceGroups = useMemo(
    () =>
      (["Women", "Men", "Kids"] as const).map((cat) => ({
        label: cat,
        options: voiceOptions
          .filter((v) => v.category === cat)
          .map((v) => ({ value: v.id, label: v.label })),
      })),
    [voiceOptions],
  );

  const patch = <K extends keyof CreateFormPayload>(key: K, value: CreateFormPayload[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const pollJob = async (jobId: string): Promise<VideoProject> => {
    while (true) {
      await new Promise((r) => setTimeout(r, 1200));
      const res = await fetch(`/api/create/jobs/${jobId}`);
      const job = await res.json();
      if (!res.ok) throw new Error(job.error || "Failed to read job status");
      setLoadingStep(job.step ?? 0);
      setJobProgress(job.progress ?? 0);
      if (job.status === "completed" && job.projectId) {
        const projectRes = await fetch(`/api/projects/${job.projectId}`);
        const project = await projectRes.json();
        if (!projectRes.ok) throw new Error(project.error || "Failed to load project");
        return project as VideoProject;
      }
      if (job.status === "failed") throw new Error(job.error || "Video generation failed");
    }
  };

  const handleOpenViralIdeas = async () => {
    setShowIdeaModal(true);
    setIsSuggesting(true);
    setGeneratedIdeas([]);
    setError(null);
    try {
      const res = await fetch("/api/create/suggest-topics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: form.topic,
          topicContext: form.topicContext,
          viralPreset: form.viralPreset,
          videoConcept: form.videoConcept,
          language: form.language,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not load viral ideas");
      setGeneratedIdeas(Array.isArray(data.ideas) ? data.ideas : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Viral ideas failed to load");
      setGeneratedIdeas([]);
    } finally {
      setIsSuggesting(false);
    }
  };

  const selectViralIdea = (idea: string) => {
    patch("topic", idea);
    setShowIdeaModal(false);
  };

  const handleTestVoice = async () => {
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      URL.revokeObjectURL(previewAudioRef.current.src);
    }
    setIsPlayingVoice(true);
    setError(null);
    try {
      const res = await fetch("/api/create/preview-voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          narrator: form.narrator,
          audioEngine: form.audioEngine,
          voiceSpeed: form.voiceSpeed,
          language: form.language,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Voice preview failed");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      previewAudioRef.current = audio;
      audio.onended = () => {
        setIsPlayingVoice(false);
        URL.revokeObjectURL(url);
      };
      await audio.play();
    } catch (err) {
      setIsPlayingVoice(false);
      setError(err instanceof Error ? err.message : "Voice preview failed");
    }
  };

  const handleGenerate = async () => {
    if (!form.topic.trim()) {
      setError("Topic / content idea is required.");
      return;
    }
    setIsLoading(true);
    setLoadingStep(0);
    setJobProgress(0);
    setError(null);
    try {
      const res = await fetch("/api/create/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          numScenes: Math.min(Math.max(Number(form.numScenes) || 5, 1), 20),
          voiceSpeed: Number(form.voiceSpeed) > 0 ? Number(form.voiceSpeed) : 1,
        }),
      });
      const start = await res.json();
      if (!res.ok) throw new Error(start.error || "Failed to start generation");
      const project = await pollJob(start.jobId);
      setGeneratedProject(project);
      setConfigMinimized(true);
      onGenerate?.(project);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCharUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => patch("charImage", reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleProductImage = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => patch("productImage", reader.result as string);
    reader.readAsDataURL(file);
  };

  const setAudioEngine = (engine: AudioEngine) => {
    const defaultVoice = engine === "edge" ? "en-US-JennyNeural" : "Kore";
    setForm((prev) => ({ ...prev, audioEngine: engine, narrator: defaultVoice }));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-[1500px] mx-auto px-4 pb-20"
    >
      <div className="flex flex-col gap-2 mb-8 pt-2">
        <div className="flex items-center gap-3">
          <motion.div className="w-10 h-10 ios-squircle glass-panel flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 text-white" />
          </motion.div>
          <div>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white">Create</h1>
            <p className="text-white/40 text-sm md:text-base font-medium tracking-tight">
              Design narrative, visuals, and voice — then generate to the editor
            </p>
          </div>
        </div>
      </div>

      <motion.div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT: Configuration form */}
        <motion.div className="lg:col-span-5">
          <motion.div className="ios-squircle glass-panel overflow-hidden">
            <button
              type="button"
              onClick={() => setConfigMinimized(!configMinimized)}
              className="w-full flex items-center justify-between px-6 py-4 border-b border-white/10 hover:bg-white/[0.03] transition-colors"
            >
              <span className="text-sm font-bold text-white flex items-center gap-2">
                <Wand2 className="w-4 h-4 text-cyan-400" /> Video Configuration
              </span>
              {configMinimized ? <ChevronDown className="w-4 h-4 text-white/40" /> : <ChevronUp className="w-4 h-4 text-white/40" />}
            </button>

            <AnimatePresence initial={false}>
              {!configMinimized && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="p-6 space-y-5 max-h-[calc(100vh-220px)] overflow-y-auto custom-scrollbar"
                >
                  {/* API */}
                  <div className={cn(insetPanel, "space-y-3")}>
                    <SectionHeader icon={Key} title="API Integration" />
                    <motion.div className="flex items-center justify-between gap-3 rounded-2xl bg-white/5 border border-white/10 px-4 py-3">
                      <span className="text-[11px] font-bold text-white/80 leading-snug">
                        Use built-in server keys (.env)
                      </span>
                      <Switch
                        checked={form.useBuiltInGemini}
                        onCheckedChange={(v) => patch("useBuiltInGemini", v)}
                      />
                    </motion.div>
                    <p className="text-[9px] text-white/30 flex items-center gap-1 pl-1 leading-relaxed">
                      <Info className="w-3 h-3 text-cyan-400/70 shrink-0" />
                      Script: Groq (preferred) or {SCRIPT_MODEL} · Images: {GEMINI_IMAGE_MODEL} · Voice: multi Gemini TTS
                    </p>
                  </div>

                  {/* Viral preset */}
                  <div>
                    <label className={label}>Concept & Strategy</label>
                    <GlassSelect
                      value={form.viralPreset}
                      onValueChange={(preset) => {
                        const opts = structureOptionsFor(preset);
                        setForm((prev) => ({
                          ...prev,
                          viralPreset: preset,
                          narrativeStructure: opts[0] ?? prev.narrativeStructure,
                        }));
                      }}
                      groups={viralGroups}
                      placeholder="Choose preset"
                    />
                  </div>

                  {/* Affiliate */}
                  {form.viralPreset === "affiliate" && (
                    <motion.div className={cn(insetPanel, "border-cyan-500/20 bg-cyan-500/[0.04] space-y-3")}>
                      <SectionHeader icon={ShoppingBag} title="Affiliate Product Details" />
                      <div className="space-y-3">
                        <div>
                          <label className={labelSm}>Product Name</label>
                          <input
                            value={form.productName || ""}
                            onChange={(e) => patch("productName", e.target.value)}
                            className={cn(field, "px-3 py-2")}
                            placeholder="e.g. 5-in-1 non-stick pan"
                          />
                        </div>
                        <div>
                          <label className={labelSm}>Benefits / USP</label>
                          <textarea
                            value={form.productBenefits || ""}
                            onChange={(e) => patch("productBenefits", e.target.value)}
                            className={fieldArea}
                            placeholder="Less oil, easy to clean..."
                          />
                        </div>
                        <div>
                          <label className={labelSm}>Product Photo</label>
                          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleProductImage} />
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="w-16 h-16 rounded-2xl border border-dashed border-white/15 bg-white/[0.02] overflow-hidden flex items-center justify-center hover:bg-white/5 transition-colors"
                          >
                            {form.productImage ? (
                              <img src={form.productImage} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <ShoppingBag className="w-6 h-6 text-white/30" />
                            )}
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Video concept */}
                  <div>
                    <label className={label}>Video Concept</label>
                    <GlassSelect
                      value={form.videoConcept}
                      onValueChange={(v) => patch("videoConcept", v)}
                      groups={videoConceptGroups}
                      placeholder="Choose concept"
                    />
                  </div>

                  {/* Topic */}
                  <div>
                    <label className={label}>Topic / Content Idea</label>
                    <div className="flex gap-2">
                      <input
                        value={form.topic}
                        onChange={(e) => patch("topic", e.target.value)}
                        className={cn(field, "px-4 py-3 flex-1")}
                        placeholder="e.g. surprising facts about cats..."
                      />
                      <button
                        type="button"
                        onClick={() => void handleOpenViralIdeas()}
                        disabled={isSuggesting && showIdeaModal}
                        className={cn(iconBtn, "text-yellow-400 hover:text-yellow-300")}
                        title="Viral topic ideas"
                      >
                        {isSuggesting && showIdeaModal ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <Lightbulb className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className={labelSm}>Extra Topic Context (Optional)</label>
                    <textarea
                      value={form.topicContext}
                      onChange={(e) => patch("topicContext", e.target.value)}
                      className={fieldArea}
                      placeholder="Emphasize emotion, casual tone, mention person X..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={cn(labelSm, "flex items-center gap-1")}>
                        <AlignLeft className="w-3 h-3" /> Story Structure
                      </label>
                      <GlassSelect
                        value={form.narrativeStructure}
                        onValueChange={(v) => patch("narrativeStructure", v)}
                        options={structures.map((s) => ({ value: s, label: s }))}
                        placeholder="Structure"
                        className="text-xs"
                      />
                    </div>
                    <div>
                      <label className={cn(labelSm, "flex items-center gap-1")}>
                        <MessageCircle className="w-3 h-3" /> Script Style
                      </label>
                      <GlassSelect
                        value={form.scriptStyle}
                        onValueChange={(v) => patch("scriptStyle", v as CreateFormPayload["scriptStyle"])}
                        options={[
                          { value: "narration", label: "Voiceover Narration" },
                          { value: "dialog", label: "Dialog / Conversation" },
                        ]}
                        placeholder="Style"
                        className="text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={label}>
                        Duration (seconds) <span className="text-[10px] lowercase font-normal text-white/30">(max 1800)</span>
                      </label>
                      <input
                        type="number"
                        min={5}
                        max={1800}
                        value={form.duration}
                        onChange={(e) => patch("duration", e.target.value)}
                        className={cn(field, "px-4 py-2.5")}
                        placeholder="60"
                      />
                    </div>
                    <div>
                      <label className={label}>Platform Format</label>
                      <GlassSelect
                        value={form.platform}
                        onValueChange={(v) => {
                          const p = PLATFORM_OPTIONS.find((o) => o.value === v);
                          setForm((prev) => ({
                            ...prev,
                            platform: v,
                            aspectRatio: p?.aspectRatio ?? prev.aspectRatio,
                          }));
                        }}
                        options={PLATFORM_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
                        placeholder="Platform"
                      />
                    </div>
                  </div>

                  <div className={cn(insetPanel, "space-y-4")}>
                    <SectionHeader icon={Clock} title="Scenes & Character" />
                    <motion.div>
                    <label className={label}>Number of Scenes</label>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={form.numScenes}
                      onChange={(e) => patch("numScenes", parseInt(e.target.value, 10) || 5)}
                      className={cn(field, "px-4 py-2.5 mb-4")}
                      placeholder="5"
                    />

                    <label className={cn(label, "text-emerald-400/80 font-black")}>Character Consistency</label>
                    <input ref={charFileRef} type="file" accept="image/*" className="hidden" onChange={handleCharUpload} />
                    {form.charImage ? (
                      <div className="flex items-center gap-3 bg-white/5 p-2 rounded-lg border border-white/10 mb-2">
                        <img src={form.charImage} alt="" className="w-10 h-10 rounded-full object-cover" />
                        <span className="text-xs text-white flex-1">Reference character active</span>
                        <button type="button" onClick={() => patch("charImage", null)} className="text-red-400 p-1">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => charFileRef.current?.click()}
                      className="w-full py-3 border border-dashed border-white/15 rounded-2xl text-[10px] font-bold text-white/30 uppercase tracking-widest hover:text-white/60 hover:bg-white/[0.03] flex items-center justify-center gap-2 transition-all"
                    >
                      <Upload className="w-3 h-3" /> Add Consistent Character
                    </button>
                    </motion.div>
                  </div>

                  <motion.div className={cn(insetPanel, "space-y-4")}>
                    <SectionHeader icon={Palette} title="Tone, Style & Language" />
                    <motion.div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                      <motion.div>
                        <label className={labelSm}>Visual Style</label>
                        <GlassSelect
                          value={form.style}
                          onValueChange={(v) => patch("style", v)}
                          options={VISUAL_STYLE_OPTIONS.map((s) => ({ value: s, label: s }))}
                          placeholder="Style"
                          className="text-xs"
                        />
                      </motion.div>
                      <motion.div>
                        <label className={labelSm}>Language</label>
                        <GlassSelect
                          value={form.language}
                          onValueChange={(v) => patch("language", v)}
                          options={LANGUAGE_OPTIONS.map((lang) => ({ value: lang, label: lang }))}
                          placeholder="Language"
                          className="text-xs"
                        />
                      </motion.div>
                      <motion.div>
                        <label className={labelSm}>Narration Tone</label>
                        <GlassSelect
                          value={form.tone}
                          onValueChange={(v) => patch("tone", v)}
                          options={TONE_OPTIONS.map((t) => ({ value: t.value, label: t.label }))}
                          placeholder="Tone"
                          className="text-xs"
                        />
                      </motion.div>
                      <motion.div>
                        <label className={labelSm}>Color Mood</label>
                        <GlassSelect
                          value={form.colorMood}
                          onValueChange={(v) => patch("colorMood", v)}
                          options={COLOR_MOOD_OPTIONS.map((m) => ({ value: m, label: m }))}
                          placeholder="Mood"
                          className="text-xs"
                        />
                      </motion.div>
                    </motion.div>

                    <motion.div className="flex items-center justify-between mb-2">
                      <label className={labelSm}>Voice Narrator</label>
                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input
                            type="radio"
                            checked={form.audioEngine === "gemini"}
                            onChange={() => setAudioEngine("gemini")}
                            className="accent-cyan-400 w-3 h-3"
                          />
                          <span className="text-[10px] text-white/70 font-bold">Gemini Voice</span>
                        </label>
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input
                            type="radio"
                            checked={form.audioEngine === "edge"}
                            onChange={() => setAudioEngine("edge")}
                            className="accent-cyan-400 w-3 h-3"
                          />
                          <span className="text-[10px] text-white/70 font-bold">Audio CT (Edge)</span>
                        </label>
                      </div>
                    </motion.div>

                    <motion.div className="flex gap-2 items-center">
                      <GlassSelect
                        value={form.narrator}
                        onValueChange={(v) => patch("narrator", v)}
                        groups={voiceGroups}
                        placeholder="Voice"
                        className="flex-1 text-xs"
                      />
                      <button
                        type="button"
                        onClick={handleTestVoice}
                        disabled={isPlayingVoice}
                        className={cn(
                          "px-3 py-2 rounded-lg border text-xs font-bold shrink-0",
                          isPlayingVoice
                            ? "bg-cyan-500/20 border-cyan-400/50 text-cyan-300"
                            : "bg-white/10 border-white/10 text-white/70",
                        )}
                      >
                        {isPlayingVoice ? "Playing..." : "Test"}
                      </button>
                    </motion.div>

                    <div className="mt-3 rounded-2xl bg-white/[0.03] p-3 border border-white/10">
                      <div className="flex justify-between items-center mb-3">
                        <label className="text-[10px] uppercase tracking-widest text-white/30 flex items-center gap-1">
                          <Mic className="w-3 h-3" /> Speech Speed
                        </label>
                        <span className="text-[10px] font-mono text-cyan-400">{form.voiceSpeed}x</span>
                      </div>
                      <Slider
                        min={0.5}
                        max={1.5}
                        step={0.1}
                        value={[form.voiceSpeed]}
                        onValueChange={(v) => patch("voiceSpeed", Array.isArray(v) ? v[0] : v)}
                        className="w-full"
                      />
                    </div>
                  </motion.div>

                  <div className={cn(insetPanel, "space-y-3")}>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs text-white/70 font-bold">Include CTA (Like/Subscribe)</span>
                      <Switch checked={form.includeCTA} onCheckedChange={(v) => patch("includeCTA", v)} />
                    </div>
                    {form.includeCTA && (
                      <input
                        value={form.ctaText}
                        onChange={(e) => patch("ctaText", e.target.value)}
                        className={cn(field, "text-xs")}
                        placeholder="CTA text..."
                      />
                    )}
                    <div className="flex items-center justify-between gap-3 border-t border-white/10 pt-3">
                      <span className="text-xs text-white/70 font-bold leading-snug">
                        Use Thumbnail as First Scene
                      </span>
                      <Switch checked={form.useThumbnail} onCheckedChange={(v) => patch("useThumbnail", v)} />
                    </div>
                  </div>

                  {error && (
                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-xs">
                      {error}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleGenerate}
                    disabled={isLoading}
                    className={cn(
                      "w-full py-4 rounded-[24px] font-black text-sm uppercase tracking-widest shadow-lg transition-all",
                      isLoading
                        ? "bg-white/10 text-white/40 cursor-not-allowed"
                        : "bg-gradient-to-br from-cyan-400 via-emerald-400 to-emerald-600 text-black hover:opacity-95 active:scale-[0.99]",
                    )}
                  >
                    {isLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        {loadingSteps[loadingStep]?.title ?? "Processing..."}
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        <Wand2 className="w-5 h-5" /> GENERATE VIDEO
                      </span>
                    )}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>

        {/* RIGHT: Status / preview panel */}
        <div className="lg:col-span-7">
          <div className="ios-squircle glass-panel p-6 md:p-8 min-h-[360px] flex flex-col">
            {generatedProject && !isLoading ? (
              <CreateSceneEditor
                project={generatedProject}
                onProjectUpdate={setGeneratedProject}
                onOpenFullEditor={() => onOpenEditor?.(generatedProject)}
              />
            ) : (
              <>
            <div className="flex items-center gap-2 mb-6">
              <Film className="w-4 h-4 text-cyan-400" />
              <span className={sectionTitle}>Pipeline Status</span>
            </div>

            {isLoading ? (
              <div className="flex-1 flex flex-col justify-center gap-4">
                <motion.div className="flex justify-between text-xs text-white/40">
                  <span>{loadingSteps[loadingStep]?.title}</span>
                  <span className="text-cyan-400 font-mono">{jobProgress}%</span>
                </motion.div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-cyan-400 via-emerald-400 to-emerald-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${jobProgress}%` }}
                    transition={{ duration: 0.4 }}
                  />
                </div>
                <p className="text-[11px] text-white/40 text-center">{loadingSteps[loadingStep]?.desc}</p>
                <div className="grid grid-cols-2 gap-2 mt-4">
                  {loadingSteps.map((step, i) => (
                    <div
                      key={step.title}
                      className={cn(
                        "px-3 py-2 rounded-lg text-[10px] font-bold border",
                        i <= loadingStep
                          ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-300"
                          : "border-white/10 bg-white/[0.03] text-white/30",
                      )}
                    >
                      {step.title}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center gap-4 py-8">
                <div className="w-20 h-20 ios-squircle glass-panel flex items-center justify-center">
                  <User className="w-10 h-10 text-cyan-400/50" />
                </div>
                <div>
                  <p className="text-white font-bold text-sm mb-1">Ready to Generate</p>
                  <p className="text-white/40 text-xs max-w-sm mx-auto leading-relaxed">
                    Fill in the form on the left, then click <strong className="text-cyan-400">GENERATE VIDEO</strong>.
                    After generation you can review and edit each scene on the right.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2 w-full max-w-md text-left text-[10px] text-white/40">
                  <div className="bg-white/5 p-3 rounded-lg border border-white/10">
                    <span className="text-white/40 block mb-1">Format</span>
                    <span className="text-white font-bold">{form.aspectRatio}</span>
                  </div>
                  <div className="bg-white/5 p-3 rounded-lg border border-white/10">
                    <span className="text-white/40 block mb-1">Scene</span>
                    <span className="text-white font-bold">{form.numScenes}</span>
                  </div>
                  <div className="bg-white/5 p-3 rounded-lg border border-white/10">
                    <span className="text-white/40 block mb-1">Style</span>
                    <span className="text-white font-bold line-clamp-2">{form.style}</span>
                  </div>
                  <div className="bg-white/5 p-3 rounded-lg border border-white/10">
                    <span className="text-white/40 block mb-1">Language</span>
                    <span className="text-white font-bold">{form.language}</span>
                  </div>
                </div>
              </div>
            )}
              </>
            )}
          </div>
        </div>
      </motion.div>

      {showIdeaModal && (
        <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="ios-squircle glass-panel w-full max-w-md overflow-hidden border border-white/10 shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-yellow-400" />
                Viral Topic Ideas
              </h3>
              <button
                type="button"
                onClick={() => setShowIdeaModal(false)}
                className="p-1.5 rounded-full text-white/40 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-3 max-h-[60vh] overflow-y-auto custom-scrollbar">
              {isSuggesting && generatedIdeas.length === 0 ? (
                <div className="py-10 flex flex-col items-center gap-3 text-white/40">
                  <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
                  <p className="text-sm">Finding viral hooks...</p>
                </div>
              ) : generatedIdeas.length === 0 ? (
                <p className="text-center text-white/40 text-sm py-6">
                  No ideas returned. Try again or add more context.
                </p>
              ) : (
                <motion.div className="space-y-2 p-1">
                  {generatedIdeas.map((idea, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => selectViralIdea(idea)}
                      className="w-full text-left p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-cyan-400/50 hover:bg-cyan-500/10 transition-all group"
                    >
                      <div className="flex gap-3">
                        <span className="text-cyan-400 font-mono text-sm font-bold opacity-60">
                          {String(idx + 1).padStart(2, "0")}
                        </span>
                        <p className="text-sm text-white/90 font-medium leading-relaxed">{idea}</p>
                      </div>
                    </button>
                  ))}
                </motion.div>
              )}
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
