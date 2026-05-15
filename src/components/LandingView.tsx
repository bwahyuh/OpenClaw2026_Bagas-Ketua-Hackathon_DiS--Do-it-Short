import { motion, useScroll, useTransform, useSpring } from "motion/react";
import { useRef } from "react";
import { Zap, Play, Layers, Sparkles, Youtube, MousePointer2, ArrowRight, Activity, Cpu, Target, Rocket, SearchCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface NeuralNodeProps {
  icon: any;
  title: string;
  sub: string;
  desc: string;
  color: "cyan" | "emerald" | "purple";
  delay: number;
  active?: boolean;
}

function NeuralNode({ icon: Icon, title, sub, desc, color, delay, active }: NeuralNodeProps) {
  const accentColor = {
    cyan: "text-cyan-400 border-cyan-400/20 bg-cyan-400/10",
    emerald: "text-emerald-400 border-emerald-400/20 bg-emerald-400/10",
    purple: "text-purple-400 border-purple-400/20 bg-purple-400/10",
  };

  return (
    <motion.div
      initial={{ opacity: 0.3, scale: 0.9, filter: "grayscale(100%)" }}
      whileInView={{ 
        opacity: 1, 
        scale: 1.05, 
        filter: "grayscale(0%)",
        transition: { duration: 0.5 }
      }}
      viewport={{ margin: "-25% 0px -25% 0px", amount: 0.5 }}
      className="relative flex flex-col items-center group w-full lg:mb-12"
    >
      {/* Outer Halo - Glows when in center */}
      <motion.div 
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 0.2 }}
        viewport={{ margin: "-30% 0px -30% 0px" }}
        className={cn(
          "absolute inset-0 rounded-full blur-[100px] transition-colors duration-1000",
          color === "cyan" ? "bg-cyan-500" : color === "emerald" ? "bg-emerald-500" : "bg-purple-500"
        )} 
      />

      {/* Main Node */}
      <motion.div 
        whileInView={{ 
          borderColor: "rgba(255, 255, 255, 0.3)",
          backgroundColor: "rgba(255, 255, 255, 0.15)"
        }}
        viewport={{ margin: "-30% 0px -30% 0px" }}
        className={cn(
          "w-40 h-40 md:w-64 md:h-64 rounded-full glass-panel flex flex-col items-center justify-center gap-3 relative z-10 transition-all duration-700 border-white/5 shadow-2xl overflow-hidden",
          active && "border-white/20 bg-white/10"
        )}
      >
        <motion.div 
          whileInView={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
          transition={{ duration: 6, repeat: Infinity }}
          className={cn(
            "w-12 h-12 md:w-24 md:h-24 rounded-[30%] flex items-center justify-center border backdrop-blur-3xl transition-all duration-500 shadow-xl",
            accentColor[color]
          )}
        >
          <Icon className="w-6 h-6 md:w-12 md:h-12" />
        </motion.div>
        
        <div className="text-center px-4 mt-2">
          <div className="text-[10px] md:text-base font-black uppercase tracking-[0.3em] text-white leading-none mb-1">{title}</div>
          <div className="text-[8px] md:text-[11px] font-medium text-white/40 uppercase tracking-[0.2em]">{sub}</div>
        </div>

        {/* Scanbeam effect when active or centers */}
        <motion.div 
          animate={{ y: ["-100%", "200%"] }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0 w-full h-[2px] bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-none opacity-20"
        />
      </motion.div>

      {/* Floating Description */}
      <motion.div 
        className="mt-12 lg:w-[400px] text-center px-4"
        initial={{ opacity: 0.2 }}
        whileInView={{ opacity: 1, y: [10, 0] }}
        viewport={{ margin: "-30% 0px -30% 0px" }}
      >
        <p className="text-[11px] md:text-base text-white/50 leading-relaxed font-medium transition-colors duration-500 font-sans">
          {desc}
        </p>
      </motion.div>
    </motion.div>
  );
}

export function LandingView({ onGetStarted }: { onGetStarted: (view: "create" | "clip") => void }) {
  return (
    <div className="w-full relative flex flex-col items-center gap-32 md:gap-48 pb-32 font-sans">
      {/* Background Decor */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
         <div className="absolute top-[10%] left-[5%] w-64 h-64 bg-cyan-500/5 rounded-full blur-[120px]" />
         <div className="absolute top-[40%] right-[10%] w-96 h-96 bg-emerald-500/5 rounded-full blur-[150px]" />
      </div>

      {/* HERO SECTION */}
      <motion.section
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        className="min-h-[80vh] w-full flex flex-col items-center justify-center text-center px-6 pt-20"
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-3xl"
        >
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <span className="text-[10px] font-black tracking-[0.3em] text-white/70 uppercase">DiS Protocol v2.4</span>
        </motion.div>

        <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl font-black tracking-tighter text-white mb-6 leading-[0.85] uppercase break-words">
          DO IT <span className="text-white/10">SHORT.</span>
        </h1>

        <p className="text-base md:text-xl text-white/40 max-w-2xl mx-auto mb-12 font-medium leading-relaxed">
          The high-frequency neural engine for cinematic repurposing. 
          One link, total platform dominance. Turn raw content into viral ammunition.
        </p>

        <div className="flex flex-col sm:flex-row gap-5 items-center justify-center">
          <Button
            onClick={() => onGetStarted("clip")}
            className="h-14 md:h-16 px-10 md:px-12 rounded-full bg-white text-black font-black text-[10px] md:text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-cyan-500/20"
          >
            Start Clipping
            <Zap className="ml-2 w-4 h-4 fill-current" />
          </Button>
          <Button
            onClick={() => {
              const workflowSection = document.getElementById('workflow');
              workflowSection?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="h-14 md:h-16 px-8 md:px-10 rounded-full bg-white/5 border border-white/10 text-white font-black text-[10px] md:text-xs uppercase tracking-widest hover:bg-white/10 transition-colors"
          >
            The Workflow
            <MousePointer2 className="ml-2 w-4 h-4" />
          </Button>
        </div>
      </motion.section>

      {/* SECTION 1: WORKFLOW (VERTICAL CIRCUIT DESIGN) */}
      <motion.section
        id="workflow"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ amount: 0.05 }}
        transition={{ duration: 0.8 }}
        className="w-full max-w-7xl px-6 relative py-20"
      >
        <div className="mb-32 text-center px-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            className="inline-block px-5 py-1.5 rounded-full border border-cyan-500/20 bg-cyan-500/5 text-cyan-400 font-bold text-[10px] tracking-[0.5em] uppercase mb-8"
          >
            Neural Protocol
          </motion.div>
          <h2 className="text-3xl sm:text-5xl md:text-7xl lg:text-8xl xl:text-9xl font-black text-white tracking-tighter uppercase mb-8 leading-[0.8] break-words">Autonomous <br className="hidden sm:block" /> Pipeline.</h2>
          <p className="text-white/20 max-w-2xl mx-auto text-sm md:text-xl font-medium tracking-tight">
            A high-velocity circuit designed to strip noise and <span className="text-white/60">amplify pure signal</span> at the edge.
          </p>
        </div>
        
        <div className="relative max-w-4xl mx-auto px-4 flex flex-col items-center">
          {/* Node 1: Ingest */}
          <NeuralNode 
            icon={Youtube}
            title="Ingest"
            sub="Source Mapping"
            desc="Our node dissects the raw signal architecture for immediate neural decomposition. Direct mapping from multi-platform sources into the processing grid."
            color="cyan"
            delay={0}
          />

          {/* Segment 1-2 */}
          <div className="h-32 md:h-48 w-[2px] relative my-6">
             <div className="h-full w-full bg-white/5 rounded-full" />
             <motion.div 
                initial={{ scaleY: 0 }}
                whileInView={{ scaleY: 1 }}
                viewport={{ margin: "-20% 0px", once: true }}
                transition={{ duration: 1.5, ease: "easeInOut" }}
                className="absolute inset-0 bg-gradient-to-b from-cyan-400 to-emerald-400 origin-top shadow-[0_0_15px_rgba(34,211,238,0.3)]"
             />
             {/* Data Packets */}
             {[...Array(3)].map((_, i) => (
                <motion.div
                  key={i}
                  animate={{ y: ["0%", "100%"], opacity: [0, 1, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear", delay: i * 0.6 }}
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-4 rounded-full bg-cyan-400 blur-[2px]"
                />
             ))}
          </div>

          {/* Node 2: Analyze */}
          <NeuralNode 
            icon={Activity}
            title="Analyze"
            sub="Logic Extraction"
            desc="AI identifies semantic retention points and high-frequency emotional hooks. The core intelligence determines optimal truncation nodes for virality."
            color="emerald"
            delay={0.2}
          />

          {/* Segment 2-3 */}
          <div className="h-32 md:h-48 w-[2px] relative my-6">
             <div className="h-full w-full bg-white/5 rounded-full" />
             <motion.div 
                initial={{ scaleY: 0 }}
                whileInView={{ scaleY: 1 }}
                viewport={{ margin: "-20% 0px", once: true }}
                transition={{ duration: 1.5, ease: "easeInOut", delay: 0.2 }}
                className="absolute inset-0 bg-gradient-to-b from-emerald-400 to-purple-400 origin-top shadow-[0_0_15px_rgba(52,211,153,0.3)]"
             />
              {/* Data Packets */}
              {[...Array(3)].map((_, i) => (
                <motion.div
                  key={i}
                  animate={{ y: ["0%", "100%"], opacity: [0, 1, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear", delay: i * 0.6 }}
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-4 rounded-full bg-emerald-400 blur-[2px]"
                />
             ))}
          </div>

          {/* Node 3: Synthesize */}
          <NeuralNode 
            icon={Layers}
            title="Synthesize"
            sub="Neural Reframe"
            desc="OpenCV-driven subject tracking maintains perfect focus in vertical 9:16 portrait space. Subtitles and audio are synced via neural cross-correlation."
            color="purple"
            delay={0.4}
          />
        </div>
      </motion.section>

      {/* SECTION 2: WHY DIS */}
      <motion.section
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ amount: 0.3 }}
        transition={{ duration: 0.8 }}
        className="w-full max-w-7xl px-6"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-24 items-center">
            <div className="flex flex-col gap-8">
              <div>
                <span className="text-emerald-400 font-black text-[10px] tracking-[0.3em] uppercase mb-4 block">WHY PROTOCOL?</span>
                <h2 className="text-3xl sm:text-5xl lg:text-8xl font-black text-white tracking-tighter uppercase mb-6 leading-[0.8] break-words">Viral <br className="hidden sm:block" /> Efficiency.</h2>
                <p className="text-white/40 text-base md:text-xl leading-relaxed">
                  Stop wasting hours in timeline purgatory. Our engine converts master tracks into social ammunition in seconds. Focus on strategy, not editing.
                </p>
              </div>
            
            <ul className="flex flex-col gap-5">
              {[
                { icon: Target, text: "95% Higher Viewer Retention", color: "text-emerald-400" },
                { icon: Rocket, text: "12x Faster Content Velocity", color: "text-cyan-400" },
                { icon: Sparkles, text: "Automated Subtitle Synthesis", color: "text-purple-400" }
              ].map((item, i) => (
                <motion.li 
                  key={i} 
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-center gap-4 text-white font-bold tracking-tight"
                >
                  <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                    <item.icon className={cn("w-5 h-5", item.color)} />
                  </div>
                  {item.text}
                </motion.li>
              ))}
            </ul>
          </div>
          
          <div className="relative">
            <div className="glass-panel aspect-video rounded-[40px] flex items-center justify-center relative overflow-hidden group">
               <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
               <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center blur-2xl animate-pulse" />
               <Play className="w-12 h-12 text-white/40 absolute" />
            </div>
            
            {/* Stats Badge Floating */}
            <motion.div 
               animate={{ y: [0, -10, 0] }}
               transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
               className="absolute -top-6 -right-6 glass-panel p-5 rounded-2xl border-emerald-500/20"
            >
               <div className="flex items-center gap-3">
                  <Activity className="text-emerald-400 w-5 h-5" />
                  <div>
                    <div className="text-[10px] text-white/40 font-black uppercase tracking-widest">Growth</div>
                    <div className="text-sm font-black text-white">+240%</div>
                  </div>
               </div>
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* SECTION 3: TECHNOLOGY (BENTO MOSAIC DESIGN) */}
      <motion.section
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ amount: 0.2 }}
        transition={{ duration: 0.8 }}
        className="w-full max-w-7xl px-6"
      >
        <div className="text-center mb-16 md:mb-24">
          <div className="inline-block px-4 py-1 rounded-full border border-purple-500/20 bg-purple-500/5 text-purple-400 font-black text-[9px] tracking-[0.4em] uppercase mb-6">
            Core Architecture
          </div>
          <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-8xl font-black text-white tracking-tighter uppercase mb-6 leading-[0.85]">The OpenClaw Stack.</h2>
          <p className="text-white/30 max-w-xl mx-auto text-sm md:text-lg font-medium">
            Four specialized engines working in neural synchronization.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-12 md:grid-rows-2 gap-4 h-auto md:h-[600px]">
          {/* Module 1: Gemini Pro (Large) */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            className="md:col-span-8 md:row-span-1 glass-panel p-8 rounded-[40px] flex flex-col justify-between group relative overflow-hidden transition-all duration-700 hover:border-cyan-500/30"
          >
            <div className="flex justify-between items-start">
              <div className="w-12 h-12 rounded-2xl bg-cyan-400/10 border border-cyan-400/20 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-cyan-400" />
              </div>
              <div className="text-[10px] font-mono text-cyan-400/40 uppercase tracking-widest">Logic Layer v1.5</div>
            </div>
            <div className="mt-8 md:mt-0">
              <h3 className="text-2xl md:text-4xl font-black text-white uppercase tracking-tighter mb-4">Gemini Pro 1.5</h3>
              <p className="text-white/40 text-sm md:text-base max-w-md">Our high-context reasoning model identifies semantic logic points and viral potential across 1M+ tokens.</p>
            </div>
            
            {/* Visual Decoration */}
            <div className="absolute right-0 bottom-0 top-0 w-1/3 bg-gradient-to-l from-cyan-500/5 to-transparent pointer-events-none hidden md:block">
              <div className="h-full w-full opacity-10 font-mono text-[8px] p-4 text-cyan-400 overflow-hidden leading-tight rotate-3">
                {`{
                  "analysis": "semantic_match",
                  "viral_index": 0.98,
                  "segment_cadence": 12,
                  "emotion": "high_energy",
                  "logic_points": [
                    "intro_hook",
                    "value_reveal",
                    "cta_bridge"
                  ]
                }`}
              </div>
            </div>
          </motion.div>

          {/* Module 2: Whisper (Wide) */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="md:col-span-4 md:row-span-2 glass-panel p-8 rounded-[40px] flex flex-col group relative overflow-hidden transition-all duration-700 hover:border-emerald-500/30"
          >
            <div className="w-12 h-12 rounded-2xl bg-emerald-400/10 border border-emerald-400/20 flex items-center justify-center mb-12">
              <Activity className="w-6 h-6 text-emerald-400" />
            </div>
            <div className="flex-grow">
              <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-4">Whisper STT</h3>
              <p className="text-white/40 text-sm">Ultra-precise speech-to-text synthesis for automated, frame-perfect subtitles.</p>
            </div>
            
            <div className="h-32 w-full flex items-center justify-center gap-1 mt-8">
              {[...Array(12)].map((_, i) => (
                <motion.div
                  key={i}
                  animate={{ height: [20, Math.random() * 60 + 20, 20] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.1 }}
                  className="w-1.5 bg-emerald-400/40 rounded-full"
                />
              ))}
            </div>
          </motion.div>

          {/* Module 3: OpenCV (Small) */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="md:col-span-4 md:row-span-1 glass-panel p-8 rounded-[40px] transition-all duration-700 hover:border-purple-500/30 flex flex-col gap-6"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-400/10 border border-purple-400/20 flex items-center justify-center">
              <Cpu className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h3 className="text-xl font-black text-white uppercase tracking-tighter mb-2">OpenCV</h3>
              <p className="text-white/40 text-[13px] leading-tight italic">Computer vision tracking for dynamic subject focus.</p>
            </div>
          </motion.div>

          {/* Module 4: Neural Frames (Small) */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="md:col-span-4 md:row-span-1 glass-panel p-8 rounded-[40px] transition-all duration-700 hover:border-yellow-500/30 flex flex-col gap-6"
          >
            <div className="w-10 h-10 rounded-xl bg-yellow-400/10 border border-yellow-400/20 flex items-center justify-center">
              <Layers className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <h3 className="text-xl font-black text-white uppercase tracking-tighter mb-2">Neural Frames</h3>
              <p className="text-white/40 text-[13px] leading-tight italic">Advanced portrait optimization for platform compliance.</p>
            </div>
          </motion.div>
        </div>
      </motion.section>

      {/* FINAL CTA */}
      <motion.section
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ amount: 0.5 }}
        className="w-full max-w-5xl px-6"
      >
        <div className="glass-panel w-full rounded-[40px] md:rounded-[60px] p-10 md:p-20 relative overflow-hidden flex flex-col items-center text-center border-white/20 bg-white/[0.05]">
          <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/10 to-transparent pointer-none" />
          <h2 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-black text-white tracking-tighter mb-12 relative z-10 leading-[0.9] uppercase">
            DOMINATE <br/> <span className="text-white/20 italic">THE FEED.</span>
          </h2>
          <div className="flex flex-wrap justify-center gap-6 relative z-10">
            <button 
              onClick={() => onGetStarted("clip")}
              className="px-10 md:px-12 py-5 md:py-6 bg-white rounded-full text-black font-black text-xs uppercase tracking-[0.2em] shadow-[0_20px_60px_rgba(255,255,255,0.15)] hover:scale-110 active:scale-95 transition-all duration-300"
            >
              Start Protocol
            </button>
            <button 
              onClick={() => onGetStarted("create")}
              className="px-10 md:px-12 py-5 md:py-6 bg-white/5 border border-white/10 backdrop-blur-md rounded-full text-white font-black text-xs uppercase tracking-[0.2em] hover:bg-white/10 transition-all duration-300"
            >
              AI Generation
            </button>
          </div>
        </div>
      </motion.section>
    </div>
  );
}
