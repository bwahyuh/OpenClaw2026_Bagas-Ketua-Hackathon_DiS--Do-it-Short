import { useState, useRef, useEffect } from "react";
import type { VideoProject } from "@/src/types/video";
import { motion } from "motion/react";
import { 
  Play, 
  Pause, 
  ArrowLeft, 
  Download, 
  Save, 
  Upload, 
  Music, 
  Type, 
  Wand2, 
  Sparkles, 
  Palette, 
  Film,
  Dices,
  Layers,
  ChevronRight,
  Maximize2,
  Volume2,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface EditorViewProps {
  project: VideoProject | null;
  onBack: () => void;
}

export function EditorView({ project, onBack }: EditorViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState([0]);
  const [duration, setDuration] = useState(60);
  const [isExporting, setIsExporting] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const videoSrc = project?.videoUrl ?? null;

  const [editorState, setEditorState] = useState({
    showSubtitles: true,
    overlayTitle: false,
    subtitleStyle: "cinematic",
    subtitleAnimation: "popup",
    motionFx: "none",
    fontFamily: "sf",
    toneColor: "#10b981",
    gradingMode: "Standard",
    atmosphere: "none",
    vfxParticles: "none",
    transitionSpeed: 0.4,
    transitionLogic: "crossfade",
    proWatermark: true
  });

  const handleStateChange = (field: string, value: any) => {
    setEditorState(prev => ({ ...prev, [field]: value }));
  };

  useEffect(() => {
    setIsPlaying(false);
    setProgress([0]);
  }, [project?.id]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      void video.play();
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video || !video.duration) return;
    setProgress([Math.floor(video.currentTime)]);
    setDuration(Math.floor(video.duration));
  };

  const handleSeek = (value: number[]) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = value[0];
    setProgress(value);
  };

  const handleExport = async (type: "MP3" | "MP4") => {
    if (!project) return;
    setIsExporting(type);
    try {
      const url =
        type === "MP4"
          ? `/api/projects/${project.id}/download`
          : `/api/projects/${project.id}/audio`;
      const a = document.createElement("a");
      a.href = url;
      a.download =
        type === "MP4"
          ? `${project.title.replace(/[^\w\-]+/g, "_")}.mp4`
          : `${project.title.replace(/[^\w\-]+/g, "_")}.mp3`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } finally {
      setTimeout(() => setIsExporting(null), 1200);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const handleSave = async () => {
    if (!project) return;
    setSaveMessage(null);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...project,
          editorState,
          timestamp: new Date().toISOString(),
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      setSaveMessage("Project saved to directory.");
    } catch {
      setSaveMessage("Could not save project.");
    }
  };

  return (
    <div className="w-full max-w-[1400px] mx-auto px-4 pb-20 animate-in fade-in duration-1000">
      <div className="grid grid-cols-12 gap-6 lg:gap-8 pt-4">
        
        {/* LEFT COLUMN: The Canvas & Actions */}
        <div className="col-span-12 lg:col-span-7 flex flex-col gap-6 lg:gap-8">
          
          {/* Back Button - iOS Glass Style */}
          <div className="flex items-center">
            <Button 
              onClick={onBack}
              className="h-10 md:h-12 px-5 md:px-6 ios-squircle bg-white/5 backdrop-blur-xl border border-white/10 text-white font-bold text-[10px] md:text-[11px] uppercase tracking-widest hover:bg-white/10 transition-all flex items-center gap-2 md:gap-3 group active:scale-95"
            >
              <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
              Back to Home
            </Button>
          </div>

          {/* Video Player Widget */}
          <div className="ios-squircle glass-panel aspect-[9/16] w-full max-w-[400px] lg:max-w-[450px] mx-auto relative overflow-hidden group/video flex items-center justify-center bg-black/40 shadow-2xl">
             {videoSrc ? (
               <video
                 ref={videoRef}
                 src={videoSrc}
                 className="absolute inset-0 w-full h-full object-cover"
                 playsInline
                 onTimeUpdate={handleTimeUpdate}
                 onLoadedMetadata={handleTimeUpdate}
                 onEnded={() => setIsPlaying(false)}
               />
             ) : (
               <>
                 <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-500/5 to-emerald-500/10 pointer-events-none" />
                 <Film className="w-16 h-16 text-white/20" />
                 <p className="absolute bottom-6 text-[10px] text-white/40 uppercase tracking-widest">No video loaded</p>
               </>
             )}
             {project?.title && (
               <div className="absolute top-4 left-4 right-4 z-10 px-3 py-1.5 rounded-lg bg-black/50 border border-white/10 text-[10px] font-black text-white uppercase tracking-wider truncate">
                 {project.title}
               </div>
             )}
             
             {/* Glass Controls Overlay */}
             <div className="absolute bottom-6 md:bottom-8 left-1/2 -translate-x-1/2 w-[90%] md:w-[85%] bg-white/10 backdrop-blur-3xl border border-white/10 rounded-2xl md:rounded-3xl p-4 md:p-6 flex flex-col gap-4 md:gap-6 opacity-0 group-hover/video:opacity-100 transition-all duration-500 translate-y-4 group-hover/video:translate-y-0">
                <div className="flex items-center gap-3 md:gap-4">
                   <button 
                     onClick={togglePlay}
                     disabled={!videoSrc}
                     className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-white flex items-center justify-center hover:scale-110 active:scale-90 transition-all shrink-0 disabled:opacity-40"
                   >
                     {isPlaying ? <Pause className="w-4 h-4 md:w-5 md:h-5 text-black fill-black" /> : <Play className="w-4 h-4 md:w-5 md:h-5 text-black fill-black ml-0.5" />}
                   </button>
                   
                   <div className="flex-1 flex flex-col gap-1.5 md:gap-2">
                      <Slider 
                        value={progress} 
                        onValueChange={handleSeek} 
                        max={duration || 60} 
                        step={1}
                        className="py-1 cursor-pointer" 
                        disabled={!videoSrc}
                      />
                      <div className="flex justify-between items-center text-[9px] md:text-[10px] font-black text-white/40 tracking-widest uppercase">
                         <span>{formatTime(progress[0])}</span>
                         <span>{formatTime(duration)}</span>
                      </div>
                   </div>

                   <button className="w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center text-white/40 hover:text-white transition-colors">
                      <Maximize2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                   </button>
                </div>
             </div>
          </div>

          {/* Global Action Buttons */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4 max-w-[450px] mx-auto w-full">
             <Button variant="outline" className="ios-squircle h-14 md:h-16 bg-white/5 border-white/10 text-white/60 font-bold text-[10px] md:text-[11px] uppercase tracking-widest flex flex-col gap-1 hover:bg-white/10 transition-all">
                <Upload className="w-3.5 h-3.5 mb-0.5" />
                Import
             </Button>
             <Button onClick={handleSave} disabled={!project} variant="outline" className="ios-squircle h-14 md:h-16 bg-white/5 border-white/10 text-white/60 font-bold text-[10px] md:text-[11px] uppercase tracking-widest flex flex-col gap-1 hover:bg-white/10 transition-all">
                <Save className="w-3.5 h-3.5 mb-0.5" />
                Save
             </Button>
             <Button 
               onClick={() => handleExport('MP3')}
               variant="outline" 
               disabled={!!isExporting || !project}
               className="ios-squircle h-14 md:h-16 bg-white/5 border-white/10 text-white font-bold text-[10px] md:text-[11px] uppercase tracking-widest flex flex-col gap-1 hover:bg-white/10 transition-all cursor-pointer disabled:opacity-40"
             >
                {isExporting === 'MP3' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                ) : (
                  <Music className="w-3.5 h-3.5 mb-0.5 text-cyan-400" />
                )}
                {isExporting === 'MP3' ? 'Saving...' : 'MP3'}
             </Button>
             <Button 
               onClick={() => handleExport('MP4')}
               disabled={!!isExporting || !project}
               className="ios-squircle h-14 md:h-16 bg-white/10 backdrop-blur-xl border border-white/20 text-white font-bold text-[10px] md:text-[11px] uppercase tracking-widest flex flex-col gap-1 hover:bg-white/20 transition-all shadow-xl cursor-pointer disabled:opacity-40"
             >
                {isExporting === 'MP4' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                ) : (
                  <Download className="w-3.5 h-3.5 mb-0.5 text-emerald-400" />
                )}
                {isExporting === 'MP4' ? 'Rendering...' : 'MP4'}
             </Button>
          </div>
        </div>

        {/* RIGHT COLUMN: The Editor Controls */}
        <div className="col-span-12 lg:col-span-5 flex flex-col gap-4 mb-10 lg:mb-0">
           <div className="flex items-center gap-2 px-2 mt-4 lg:mt-0">
              <div className="w-1 h-3.5 bg-emerald-500 rounded-full" />
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 leading-none">
                 Visual, Subtitle, & Audio
              </h2>
           </div>

           <div className="flex flex-col gap-3 md:gap-4">
              
              {/* Widget 1: Typography & Subtitles */}
              <div className="ios-squircle glass-panel p-4 md:p-5 flex flex-col gap-4 md:gap-5">
                 <div className="flex items-center gap-2 text-white/30 mb-1">
                    <Type className="w-3.5 h-3.5" />
                    <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest">Typography Systems</span>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center justify-between">
                       <Label className="text-[11px] md:text-[12px] font-bold text-white">Subtitles</Label>
                       <Switch 
                         checked={editorState.showSubtitles}
                         onCheckedChange={(v) => handleStateChange("showSubtitles", v)}
                       />
                    </div>
                    <div className="flex items-center justify-between">
                       <Label className="text-[11px] md:text-[12px] font-bold text-white">Overlay Title</Label>
                       <Switch 
                         checked={editorState.overlayTitle}
                         onCheckedChange={(v) => handleStateChange("overlayTitle", v)}
                       />
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                       <Label className="text-[9px] uppercase tracking-widest text-white/20 pl-1">Style</Label>
                       <Select 
                         value={editorState.subtitleStyle}
                         onValueChange={(v) => handleStateChange("subtitleStyle", v)}
                       >
                          <SelectTrigger className="h-8 md:h-9 bg-white/5 border-none rounded-lg px-3 text-[11px] md:text-[12px] font-bold text-white">
                             <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                             <SelectItem value="cinematic">Cinematic</SelectItem>
                             <SelectItem value="minimalist">Minimalist</SelectItem>
                             <SelectItem value="glow">Neon Glow</SelectItem>
                          </SelectContent>
                       </Select>
                    </div>
                    <div className="space-y-1.5">
                       <Label className="text-[9px] uppercase tracking-widest text-white/20 pl-1">Animation</Label>
                       <Select 
                         value={editorState.subtitleAnimation}
                         onValueChange={(v) => handleStateChange("subtitleAnimation", v)}
                       >
                          <SelectTrigger className="h-8 md:h-9 bg-white/5 border-none rounded-lg px-3 text-[11px] md:text-[12px] font-bold text-white">
                             <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                             <SelectItem value="popup">Pop-up</SelectItem>
                             <SelectItem value="typewriter">Typewriter</SelectItem>
                             <SelectItem value="slide">Slide</SelectItem>
                          </SelectContent>
                       </Select>
                    </div>
                 </div>

                 <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 items-end">
                    <div className="space-y-1.5">
                       <Label className="text-[9px] uppercase tracking-widest text-white/20 pl-1">FX</Label>
                       <Select 
                         value={editorState.motionFx}
                         onValueChange={(v) => handleStateChange("motionFx", v)}
                       >
                          <SelectTrigger className="h-8 md:h-9 bg-white/5 border-none rounded-lg px-3 text-[11px] md:text-[12px] font-bold text-white">
                             <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                             <SelectItem value="none">None</SelectItem>
                             <SelectItem value="shake">Shake</SelectItem>
                             <SelectItem value="float">Float</SelectItem>
                          </SelectContent>
                       </Select>
                    </div>
                    <div className="space-y-1.5">
                       <Label className="text-[9px] uppercase tracking-widest text-white/20 pl-1">Font</Label>
                       <Select 
                         value={editorState.fontFamily}
                         onValueChange={(v) => handleStateChange("fontFamily", v)}
                       >
                          <SelectTrigger className="h-8 md:h-9 bg-white/5 border-none rounded-lg px-3 text-[11px] md:text-[12px] font-bold text-white">
                             <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                             <SelectItem value="sf">SF Pro</SelectItem>
                             <SelectItem value="bebas">Bebas</SelectItem>
                             <SelectItem value="mona">Mona</SelectItem>
                          </SelectContent>
                       </Select>
                    </div>
                    <div className="space-y-1.5 col-span-2 sm:col-span-1">
                       <Label className="text-[9px] uppercase tracking-widest text-white/20 pl-1">Tone</Label>
                       <div className="h-8 md:h-9 bg-white/5 border-none rounded-lg flex items-center justify-center p-1.5">
                          <div 
                            className="w-full h-full rounded-md bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)] cursor-pointer hover:scale-105 transition-transform" 
                            style={{ backgroundColor: editorState.toneColor }}
                          />
                       </div>
                    </div>
                 </div>
              </div>

              {/* Widget 2: Optics, Grading & VFX */}
              <div className="ios-squircle glass-panel p-4 md:p-5 flex flex-col gap-4 md:gap-5">
                 <div className="flex items-center gap-2 text-white/30 mb-1">
                    <Wand2 className="w-3.5 h-3.5" />
                    <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest">Synthetic Optics</span>
                 </div>

                 <div className="space-y-3">
                    <Label className="text-[9px] uppercase tracking-widest text-white/20 pl-1">Atmosphere Grading</Label>
                    <div className="grid grid-cols-4 gap-1.5">
                       {['Std', 'Warm', 'Cool', 'Vntg'].map((mode) => (
                         <button 
                           key={mode}
                           onClick={() => handleStateChange("gradingMode", mode === 'Std' ? 'Standard' : mode === 'Vntg' ? 'Vintage' : mode)}
                           className={cn(
                             "h-7 md:h-8 text-[9px] md:text-[10px] font-black tracking-tighter rounded-lg border transition-all uppercase",
                             (editorState.gradingMode.startsWith(mode) || (mode === 'Std' && editorState.gradingMode === 'Standard') || (mode === 'Vntg' && editorState.gradingMode === 'Vintage'))
                               ? "bg-white text-black border-white" 
                               : "bg-white/5 border-white/5 text-white/40 hover:bg-white/10"
                           )}
                         >
                           {mode}
                         </button>
                       ))}
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                       <Label className="text-[9px] uppercase tracking-widest text-white/20 pl-1">Optics</Label>
                       <Select 
                         value={editorState.atmosphere}
                         onValueChange={(v) => handleStateChange("atmosphere", v)}
                       >
                          <SelectTrigger className="h-8 md:h-9 bg-white/5 border-none rounded-lg px-3 text-[11px] md:text-[12px] font-bold text-white">
                             <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                             <SelectItem value="none">Clear</SelectItem>
                             <SelectItem value="mist">Mist</SelectItem>
                             <SelectItem value="bloom">Bloom</SelectItem>
                          </SelectContent>
                       </Select>
                    </div>
                    <div className="space-y-1.5">
                       <Label className="text-[9px] uppercase tracking-widest text-white/20 pl-1">Texture</Label>
                       <Select 
                         value={editorState.vfxParticles}
                         onValueChange={(v) => handleStateChange("vfxParticles", v)}
                       >
                          <SelectTrigger className="h-8 md:h-9 bg-white/5 border-none rounded-lg px-3 text-[11px] md:text-[12px] font-bold text-white">
                             <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                             <SelectItem value="none">None</SelectItem>
                             <SelectItem value="dust">Dust</SelectItem>
                             <SelectItem value="grain">Grain</SelectItem>
                          </SelectContent>
                       </Select>
                    </div>
                 </div>

                 <div className="space-y-4 pt-1">
                    <div className="flex justify-between items-center text-[8px] md:text-[9px] uppercase tracking-widest text-white/20 px-1">
                       <span>Motion Blur</span>
                       <span className="text-white font-black">{editorState.transitionSpeed}s</span>
                    </div>
                    <Slider 
                      value={[editorState.transitionSpeed]} 
                      onValueChange={(v) => handleStateChange("transitionSpeed", v[0])}
                      max={1} 
                      step={0.1} 
                      className="py-1 cursor-pointer" 
                    />
                    
                    <div className="space-y-1.5">
                       <Label className="text-[9px] uppercase tracking-widest text-white/20 pl-1">Transition Logic</Label>
                       <Select 
                         value={editorState.transitionLogic}
                         onValueChange={(v) => handleStateChange("transitionLogic", v)}
                       >
                          <SelectTrigger className="h-8 md:h-9 bg-white/5 border-none rounded-lg px-3 text-[11px] md:text-[12px] font-bold text-white">
                             <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                             <SelectItem value="crossfade">Crossfade</SelectItem>
                             <SelectItem value="glitch">Glitch</SelectItem>
                             <SelectItem value="zoom">Zoom</SelectItem>
                          </SelectContent>
                       </Select>
                    </div>
                 </div>
              </div>

              {/* Widget 3: Audio & Security */}
              <div className="ios-squircle glass-panel p-4 md:p-5 flex flex-col gap-4 md:gap-5">
                 <div className="flex items-center gap-2 text-white/30 mb-1">
                    <Music className="w-3.5 h-3.5" />
                    <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest">Audio Intelligence</span>
                 </div>

                 <div className="grid grid-cols-2 gap-4 items-center">
                    <div className="space-y-1.5">
                       <Label className="text-[9px] uppercase tracking-widest text-white/20 pl-1">Music Score</Label>
                       <div className="border border-dashed border-white/10 rounded-xl p-3 md:p-4 flex flex-col items-center justify-center gap-2 bg-white/[0.01] hover:bg-white/[0.03] transition-all cursor-pointer group/upload min-h-[50px] md:min-h-[60px]">
                          <Music className="w-3.5 h-3.5 text-white/20 group-hover/upload:text-white/60" />
                          <span className="text-[8px] md:text-[9px] font-bold text-white/20 group-hover/upload:text-white/40 uppercase tracking-tighter">Upload Score</span>
                       </div>
                    </div>
                    <div className="flex items-center justify-between h-full pt-4">
                       <div className="flex flex-col gap-0.5">
                          <Label className="text-[11px] md:text-[12px] font-bold text-white">Watermark</Label>
                          <p className="text-[8px] text-white/30 uppercase tracking-tight font-black">Branding</p>
                       </div>
                       <Switch 
                         checked={editorState.proWatermark}
                         onCheckedChange={(v) => handleStateChange("proWatermark", v)}
                       />
                    </div>
                 </div>
              </div>

           </div>
        </div>

      </div>
    </div>
  );
}
