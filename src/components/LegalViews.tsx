import { motion } from "motion/react";
import { Shield, FileText, Mail, ArrowLeft, Lock, Eye, Scale, ShieldCheck, Globe, Send, MessageSquare, Twitter, Linkedin } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LegalViewProps {
  onBack: () => void;
}

export function PrivacyView({ onBack }: LegalViewProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="w-full max-w-4xl mx-auto px-6 py-12"
    >
      <button onClick={onBack} className="flex items-center gap-2 text-white/40 hover:text-white transition-colors mb-8 group">
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        <span className="text-xs font-bold uppercase tracking-widest">Back to Protocol</span>
      </button>

      <div className="glass-panel p-8 md:p-16 rounded-[40px] border-white/10 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Shield className="w-32 h-32 text-cyan-400" />
        </div>

        <h1 className="text-4xl md:text-6xl font-black text-white tracking-tighter uppercase mb-2">Privacy <br/> <span className="text-white/20">Protocol.</span></h1>
        <p className="text-white/40 text-xs font-mono uppercase tracking-[0.3em] mb-12">Encryption Level: Neural-Grade (AES-256-GCM)</p>

        <div className="space-y-12 text-white/70 leading-relaxed">
          <section>
            <div className="flex items-center gap-3 mb-4">
              <Lock className="w-5 h-5 text-cyan-400" />
              <h2 className="text-xl font-bold text-white uppercase tracking-tight">Data Sovereignty</h2>
            </div>
            <p>At DiS Protocol, your content is your intellectual property. We act only as the processing node. Your raw video data is processed in ephemeral memory and encrypted at rest using industry-leading protocols. We do not sell your neural patterns or metadata to third-party entities.</p>
          </section>

          <section>
            <div className="flex items-center gap-3 mb-4">
              <Eye className="w-5 h-5 text-cyan-400" />
              <h2 className="text-xl font-bold text-white uppercase tracking-tight">Information Collection</h2>
            </div>
            <p>We collect minimal telemetry required for engine optimization. This includes platform interaction metrics, processing latency, and error logs. Personally Identifiable Information (PII) is isolated and restricted to core authentication requirements.</p>
          </section>

          <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="glass-panel p-6 rounded-3xl border-white/5 bg-white/5">
              <ShieldCheck className="w-6 h-6 text-emerald-400 mb-3" />
              <h3 className="text-white font-bold mb-2">Processing Safety</h3>
              <p className="text-sm text-white/40 leading-snug">Videos analyzed by our AI agents are never used for model training without explicit opt-in nodes.</p>
            </div>
            <div className="glass-panel p-6 rounded-3xl border-white/5 bg-white/5">
              <Globe className="w-6 h-6 text-cyan-400 mb-3" />
              <h3 className="text-white font-bold mb-2">GDPR Compliance</h3>
              <p className="text-sm text-white/40 leading-snug">We respect global privacy frameworks including GDPR (EU/UK) and CCPA (California).</p>
            </div>
          </section>
        </div>

        <div className="mt-16 pt-8 border-t border-white/5 text-[10px] text-white/20 italic">
          Last Revision: May 15, 2026. Hash: 0x82f...a12c
        </div>
      </div>
    </motion.div>
  );
}

export function TermsView({ onBack }: LegalViewProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="w-full max-w-4xl mx-auto px-6 py-12"
    >
      <button onClick={onBack} className="flex items-center gap-2 text-white/40 hover:text-white transition-colors mb-8 group">
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        <span className="text-xs font-bold uppercase tracking-widest">Back to Protocol</span>
      </button>

      <div className="glass-panel p-8 md:p-16 rounded-[40px] border-white/10 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <FileText className="w-32 h-32 text-emerald-400" />
        </div>

        <h1 className="text-4xl md:text-6xl font-black text-white tracking-tighter uppercase mb-2">Terms of <br/> <span className="text-white/20">Service.</span></h1>
        <p className="text-white/40 text-xs font-mono uppercase tracking-[0.3em] mb-12">Protocol Status: Active & Binding</p>

        <div className="space-y-10 text-white/70 leading-relaxed">
          <section>
            <div className="flex items-center gap-3 mb-4">
              <Scale className="w-5 h-5 text-emerald-400" />
              <h2 className="text-xl font-bold text-white uppercase tracking-tight">Acceptance of Protocol</h2>
            </div>
            <p>By accessing the DiS Protocol engine, you agree to abide by our operational constraints. This is a technical agreement between the user and the system architecture. Unauthorized attempts to reverse-engineer our Neural Logic Layer are strictly prohibited.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white uppercase tracking-tight mb-4">Usage Parameters</h2>
            <ul className="space-y-4">
              <li className="flex gap-4">
                <span className="text-emerald-400 font-black">01</span>
                <span>You may not use the platform to generate deepfakes or misinformation intended for malicious manipulation.</span>
              </li>
              <li className="flex gap-4">
                <span className="text-emerald-400 font-black">02</span>
                <span>Each subscription tier has specific throughput limits (GPU minutes and AI token quotas).</span>
              </li>
              <li className="flex gap-4">
                <span className="text-emerald-400 font-black">03</span>
                <span>Redistribution of refined content is subject to platform-specific copyright regulations.</span>
              </li>
            </ul>
          </section>

          <div className="p-6 rounded-3xl bg-emerald-500/5 border border-emerald-500/10">
            <h3 className="text-white font-bold mb-2">Liability Node</h3>
            <p className="text-sm text-white/40 italic">DiS Protocol provides AI-assisted content optimization "as-is" without explicit warranties of viral performance or algorithmic favor.</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function ContactView({ onBack }: LegalViewProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="w-full max-w-5xl mx-auto px-6 py-12"
    >
      <button onClick={onBack} className="flex items-center gap-2 text-white/40 hover:text-white transition-colors mb-8 group">
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        <span className="text-xs font-bold uppercase tracking-widest">Back to Protocol</span>
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
        <div className="glass-panel p-8 md:p-12 rounded-[40px] flex flex-col justify-between overflow-hidden">
          <div>
            <span className="text-cyan-400 font-black text-[10px] tracking-[0.4em] uppercase mb-4 block">Communication Terminal</span>
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-black text-white tracking-tighter uppercase mb-6 leading-[0.85] break-words">Contact <br className="hidden sm:block" /> <span className="text-white/20">The Grid.</span></h1>
            <p className="text-white/40 text-sm md:text-lg font-medium leading-relaxed mb-8 max-w-md">
              Technical difficulties or enterprise inquiries? Our neural ops team is standing by.
            </p>
          </div>

          <div className="space-y-6">
            <div className="flex items-center gap-4 group cursor-pointer">
              <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-cyan-500/20 group-hover:border-cyan-500/40 transition-all">
                <Twitter className="w-5 h-5 text-white/60 group-hover:text-cyan-400" />
              </div>
              <div>
                <div className="text-[10px] text-white/20 font-black uppercase tracking-widest">Global Feed</div>
                <div className="text-white font-bold">@DiS_Protocol</div>
              </div>
            </div>
            <div className="flex items-center gap-4 group cursor-pointer">
              <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-emerald-500/20 group-hover:border-emerald-500/40 transition-all">
                <Linkedin className="w-5 h-5 text-white/60 group-hover:text-emerald-400" />
              </div>
              <div>
                <div className="text-[10px] text-white/20 font-black uppercase tracking-widest">Corporation</div>
                <div className="text-white font-bold">DiS Systems Inc.</div>
              </div>
            </div>
            <div className="flex items-center gap-4 group cursor-pointer">
              <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-purple-500/20 group-hover:border-purple-500/40 transition-all">
                <Mail className="w-5 h-5 text-white/60 group-hover:text-purple-400" />
              </div>
              <div>
                <div className="text-[10px] text-white/20 font-black uppercase tracking-widest">Support Node</div>
                <div className="text-white font-bold">ops@disprotocol.ai</div>
              </div>
            </div>
          </div>
        </div>

        <div className="glass-panel p-8 md:p-12 rounded-[40px] bg-white/[0.04]">
          <h2 className="text-2xl font-black text-white uppercase tracking-tight mb-8">Direct Transmission</h2>
          
          <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-4">Identity Signal</label>
              <input 
                type="text" 
                placeholder="Full Name" 
                className="w-full h-14 rounded-2xl bg-white/5 border border-white/10 px-6 text-white focus:outline-none focus:border-cyan-500/50 transition-colors"
                id="contact-name"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-4">Response Frequency</label>
              <input 
                type="email" 
                placeholder="Email Address" 
                className="w-full h-14 rounded-2xl bg-white/5 border border-white/10 px-6 text-white focus:outline-none focus:border-cyan-500/50 transition-colors"
                id="contact-email"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-4">Transmission Data</label>
              <textarea 
                placeholder="How can we assist your workflow?" 
                className="w-full h-32 rounded-2xl bg-white/5 border border-white/10 p-6 text-white focus:outline-none focus:border-cyan-500/50 transition-colors resize-none"
                id="contact-message"
              ></textarea>
            </div>

            <Button className="w-full h-16 rounded-2xl bg-white text-black font-black uppercase tracking-widest text-xs hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-white/5">
              Send Transmission
              <Send className="ml-2 w-4 h-4 fill-current text-black" />
            </Button>

            <div className="flex items-center justify-center gap-2 text-[10px] text-white/20 font-medium">
               <MessageSquare className="w-3 h-3" />
               Current ETA response: 2.4 Hours
            </div>
          </form>
        </div>
      </div>
    </motion.div>
  );
}
