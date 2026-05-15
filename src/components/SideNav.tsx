import { motion } from "motion/react";
import { Settings, FolderOpen, Home } from "lucide-react";
import { cn } from "@/lib/utils";

export type NavTab = "home" | "projects" | "settings";

const items = [
  { id: "home", label: "Home", icon: Home },
  { id: "projects", label: "Projects", icon: FolderOpen },
  { id: "settings", label: "Settings", icon: Settings },
];

interface SideNavProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
}

export function SideNav({ activeTab, onTabChange }: SideNavProps) {
  return (
    <div className="fixed bottom-6 left-0 right-0 md:top-0 md:left-0 md:right-auto md:bottom-auto md:h-screen z-50 px-6 md:p-6 flex items-center justify-center md:justify-start pointer-events-none">
      <motion.nav 
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 100, damping: 20 }}
        className="glass-panel w-full max-w-[400px] md:w-20 h-16 md:h-fit py-0 md:py-8 rounded-full flex md:flex-col items-center justify-around md:justify-center gap-0 md:gap-12 shadow-[0_20px_40px_rgba(0,0,0,0.5)] md:shadow-[40px_0_80px_rgba(0,0,0,0.5)] overflow-hidden pointer-events-auto"
      >
        <div className="hidden md:flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-[0_0_20px_rgba(255,255,255,0.3)]">
             <span className="font-extrabold text-[18px] tracking-tighter text-black">D</span>
          </div>
          <span className="font-bold text-[10px] tracking-widest text-white/40 uppercase">DiS</span>
        </div>
        
        <div className="flex md:flex-col items-center justify-around w-full md:w-auto gap-2 md:gap-8 px-4 md:px-0">
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id as NavTab)}
              className={cn(
                "flex flex-col items-center gap-1 md:gap-2 transition-all duration-300 relative group py-2 md:py-0",
                activeTab === item.id ? "text-white" : "text-white/40 hover:text-white/80"
              )}
            >
              {activeTab === item.id && (
                <motion.div 
                  layoutId="nav-active"
                  className="absolute inset-x-[-12px] md:inset-x-[-16px] inset-y-[-4px] md:inset-y-[-10px] bg-white/5 border border-white/10 rounded-xl md:rounded-2xl -z-10"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              <item.icon className="w-5 h-5 md:w-5 md:h-5" />
              <span className="text-[9px] md:hidden font-bold tracking-widest uppercase">{item.label}</span>
              <span className="hidden md:block text-[9px] font-bold tracking-widest uppercase opacity-0 group-hover:opacity-100 transition-opacity absolute left-14 bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 whitespace-nowrap pointer-events-none">
                {item.label}
              </span>
            </button>
          ))}
        </div>

        <div className="hidden md:block mt-auto opacity-20 hover:opacity-100 transition-opacity cursor-help">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        </div>
      </motion.nav>
    </div>
  );
}
