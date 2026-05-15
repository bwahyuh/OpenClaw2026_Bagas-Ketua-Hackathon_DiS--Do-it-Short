import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Lock, Mail, ArrowRight, User, ShieldCheck, Cpu, ArrowLeft, Terminal, Activity, Zap, Server, Database, Key } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function AuthView({ onLogin, onBack }: { onLogin: () => void, onBack: () => void }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email && password && (isLogin || name)) {
      setIsLoading(true);
      // Simulate network delay for effect
      setTimeout(() => {
        localStorage.setItem("dis_auth", "true");
        localStorage.setItem("dis_auth_email", email);
        if (!isLogin && name) {
          localStorage.setItem("dis_auth_name", name);
        } else {
          // If login and no name is set previously, we could set a default or use the part before @
          const existingName = localStorage.getItem("dis_auth_name");
          if (!existingName) {
            const defaultName = email.split('@')[0];
            localStorage.setItem("dis_auth_name", defaultName);
          }
        }
        setIsLoading(false);
        onLogin();
      }, 1500);
    }
  };

  return (
    <div className="w-full min-h-[85vh] flex flex-col lg:flex-row items-center justify-center lg:justify-between gap-12 lg:gap-24 relative animate-in fade-in slide-in-from-bottom-8 duration-1000 mt-4 md:mt-8 pb-10">
      <Button 
        variant="ghost" 
        onClick={onBack}
        className="absolute -top-4 md:-top-10 left-0 hover:bg-white/5 text-white/40 hover:text-white transition-all flex items-center gap-2 rounded-full px-4 z-50"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </Button>

      {/* LEFT SIDE - CREATIVE SECTION (Hidden on mobile) */}
      <div className="hidden lg:flex flex-1 flex-col justify-center relative w-full h-full min-h-[600px] rounded-[40px] bg-white/[0.02] border border-white/[0.05] p-12 overflow-hidden backdrop-blur-md group">
        
        {/* Interactive glow effect tracking mouse */}
        <div 
          className="pointer-events-none absolute -inset-px rounded-[40px] opacity-0 group-hover:opacity-100 transition duration-300"
          style={{
            background: `radial-gradient(600px circle at ${mousePosition.x - 200}px ${mousePosition.y - 100}px, rgba(34,211,238,0.06), transparent 40%)`
          }}
        />

        {/* Floating background elements */}
        <motion.div 
          animate={{ y: [0, -20, 0], opacity: [0.1, 0.2, 0.1] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[20%] right-[10%] w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px]" 
        />
        <motion.div 
          animate={{ y: [0, 20, 0], opacity: [0.1, 0.3, 0.1] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute bottom-[10%] left-[20%] w-72 h-72 bg-cyan-500/10 rounded-full blur-[100px]" 
        />

        <div className="relative z-10 w-full max-w-lg mx-auto">
          <motion.div 
            initial={{opacity: 0, y: 20}} 
            animate={{opacity: 1, y: 0}} 
            transition={{duration: 0.8, delay: 0.2}}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-black tracking-widest uppercase mb-6 shadow-[0_0_15px_rgba(34,211,238,0.2)]">
              <Activity className="w-3 h-3" /> System Terminal Online
            </div>
            
            <h2 className="text-[2.75rem] font-black text-white tracking-tighter leading-[1.1] mb-6">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-white/50">WELCOME TO</span><br />
              DiS PROTOCOL
            </h2>
            
            <p className="text-white/40 font-medium text-base md:text-lg leading-relaxed mb-12">
              Access your private neural grid. Military-grade quantum encryption is active. All synapses are synchronized to the database in real-time.
            </p>
          </motion.div>

          <div className="grid grid-cols-2 gap-4">
            {[
              { icon: Server, color: "text-indigo-400", title: "Node Gateway", desc: "Full Decentralization" },
              { icon: Zap, color: "text-yellow-400", title: "Low Latency", desc: "< 12ms Response Time" },
              { icon: Database, color: "text-emerald-400", title: "AI Storage", desc: "Dynamic Capacity" },
              { icon: Key, color: "text-rose-400", title: "Layered Crypto", desc: "AES-256 Secured" }
            ].map((feature, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 + (idx * 0.1) }}
                className="bg-white/[0.03] border border-white/[0.05] rounded-2xl p-5 hover:bg-white/[0.05] transition-colors"
              >
                <feature.icon className={cn("w-6 h-6 mb-3", feature.color)} />
                <h3 className="text-white font-bold text-sm tracking-wide mb-1">{feature.title}</h3>
                <p className="text-white/30 text-xs font-medium">{feature.desc}</p>
              </motion.div>
            ))}
          </div>

          {/* Code snippet decoration */}
          <motion.div 
             initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1, duration: 1 }}
             className="mt-8 p-4 bg-black/40 border border-white/5 rounded-xl font-mono text-[10px] text-emerald-400/60 flex flex-col gap-1 overflow-hidden"
          >
             <div className="flex gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-red-500/50" />
                <div className="w-2 h-2 rounded-full bg-yellow-500/50" />
                <div className="w-2 h-2 rounded-full bg-green-500/50" />
             </div>
             <p>[OK] Initializing boot sequence...</p>
             <p>[OK] Loading neural models (100%)</p>
             <p>[OK] Connecting to main grid...</p>
             <p className="text-cyan-400/80 animate-pulse">Waiting for user authentication_</p>
          </motion.div>
        </div>
      </div>

      {/* RIGHT SIDE - AUTH CARD */}
      <div className="w-full lg:w-[420px] shrink-0 flex flex-col gap-8 relative z-10 mx-auto lg:mx-0 mt-8 lg:mt-0">
        <div className="flex flex-col items-center lg:items-start text-center lg:text-left gap-4">
          <div className="w-16 h-16 rounded-3xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shadow-[0_0_40px_rgba(34,211,238,0.15)] mb-2">
            <Cpu className="w-8 h-8 text-cyan-400" />
          </div>
          <div className="flex flex-col gap-1">
            <h1 className="text-3xl font-black text-white tracking-tight uppercase">
              {isLogin ? "Grid Access" : "Initialize Node"}
            </h1>
            <p className="text-white/40 text-sm font-medium tracking-wide">
              {isLogin ? "Authenticate neural profile to continue" : "Register new identity into the protocol"}
            </p>
          </div>
        </div>

        <div className="glass-panel p-6 md:p-8 rounded-[32px] ios-squircle border-white/10 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none group-hover:opacity-[0.05] transition-opacity duration-1000">
            <ShieldCheck size={200} />
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5 relative z-10">
            <AnimatePresence mode="popLayout">
              {!isLogin && (
                <motion.div
                  initial={{ opacity: 0, height: 0, scale: 0.9 }}
                  animate={{ opacity: 1, height: "auto", scale: 1 }}
                  exit={{ opacity: 0, height: 0, scale: 0.9 }}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  className="flex flex-col gap-2"
                >
                  <label className="text-[10px] text-white/30 font-black uppercase tracking-widest pl-1">Identity</label>
                  <div className="relative flex items-center">
                    <User className="absolute left-4 w-4 h-4 text-white/20" />
                    <input 
                      type="text"
                      required={!isLogin}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 text-white text-sm font-medium placeholder:text-white/20 focus:outline-none focus:bg-white/10 focus:border-cyan-500/50 transition-all"
                      placeholder="Full Name"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex flex-col gap-2">
              <label className="text-[10px] text-white/30 font-black uppercase tracking-widest pl-1">Neural Email</label>
              <div className="relative flex items-center">
                <Mail className="absolute left-4 w-4 h-4 text-white/20" />
                <input 
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 text-white text-sm font-medium placeholder:text-white/20 focus:outline-none focus:bg-white/10 focus:border-cyan-500/50 transition-all"
                  placeholder="access@protocol.com"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between pl-1 pr-2">
                <label className="text-[10px] text-white/30 font-black uppercase tracking-widest">Access Key</label>
                {isLogin && (
                  <button type="button" className="text-[10px] text-cyan-400/60 font-bold hover:text-cyan-400 transition-colors">
                    Forgot Key?
                  </button>
                )}
              </div>
              <div className="relative flex items-center">
                <Lock className="absolute left-4 w-4 h-4 text-white/20" />
                <input 
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 text-white text-sm font-medium placeholder:text-white/20 focus:outline-none focus:bg-white/10 focus:border-cyan-500/50 transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <Button 
              type="submit" 
              disabled={isLoading}
              className={cn(
                "w-full h-14 mt-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all",
                "bg-gradient-to-r from-cyan-500 to-indigo-500 text-white shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40 hover:scale-[1.02] active:scale-95",
                isLoading && "opacity-50 cursor-not-allowed scale-100 hover:scale-100"
              )}
            >
              <span className="flex items-center justify-center gap-2">
                {isLoading ? (
                  <>
                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
                      <Cpu className="w-4 h-4" />
                    </motion.div>
                    Synchronizing...
                  </>
                ) : (
                  <>
                    {isLogin ? "Enter System" : "Authorize New Node"}
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </span>
            </Button>
          </form>

          <div className="mt-8 pt-6 border-t border-white/5 flex flex-col items-center gap-3">
            <p className="text-white/30 text-xs font-medium">
              {isLogin ? "Don't have a neural identity?" : "Already have an identity?"}
            </p>
            <Button 
              variant="outline"
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="h-10 rounded-xl bg-transparent border-white/10 text-white/60 font-bold text-xs uppercase tracking-widest hover:bg-white/5 hover:text-white transition-all w-full"
            >
              {isLogin ? "Register New Node" : "Back to Login"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
