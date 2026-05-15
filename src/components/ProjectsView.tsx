import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Search,
  List,
  Grid,
  RefreshCcw,
  MoreVertical,
  Film,
  Plus,
  Hash,
  Loader2,
  Clock,
  ArrowRight,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface Project {
  id: string;
  title: string;
  timestamp: string;
  size: string;
  thumbnailColor?: string;
  hasVideo?: boolean;
}

interface ProjectsViewProps {
  onCreateClick: () => void;
  onOpenProject?: (projectId: string) => void;
}

const THUMBNAIL_GRADIENTS: Record<string, string> = {
  "from-cyan-500/20 to-blue-500/20": "from-cyan-500/40 to-blue-500/40",
  "from-purple-500/20 to-pink-500/20": "from-purple-500/40 to-pink-500/40",
  "from-emerald-500/20 to-teal-500/20": "from-emerald-500/40 to-teal-500/40",
};

function getThumbnailClass(thumbnailColor?: string) {
  if (thumbnailColor && THUMBNAIL_GRADIENTS[thumbnailColor]) {
    return THUMBNAIL_GRADIENTS[thumbnailColor];
  }
  return "from-cyan-500/40 via-blue-500/25 to-emerald-500/40";
}

export function ProjectsView({ onCreateClick, onOpenProject }: ProjectsViewProps) {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [isSyncing, setIsSyncing] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchProjects = async () => {
    try {
      setFetchError(null);
      const response = await fetch("/api/projects");
      const data = await response.json();
      if (!response.ok) {
        throw new Error(typeof data?.error === "string" ? data.error : "Failed to fetch projects");
      }
      setProjects(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to fetch projects:", error);
      setProjects([]);
      setFetchError(error instanceof Error ? error.message : "Failed to fetch projects");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const filteredProjects = projects
    .filter(
      (p) =>
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.id.toLowerCase().includes(searchQuery.toLowerCase()),
    )
    .sort((a, b) => {
      if (sortBy === "newest") return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      if (sortBy === "oldest") return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
      return 0;
    });

  const handleSync = async () => {
    setIsSyncing(true);
    await fetchProjects();
    await new Promise((r) => setTimeout(r, 800));
    setIsSyncing(false);
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    return `${days} days ago`;
  };

  const hasProjects = projects.length > 0;
  const hasVisibleProjects = filteredProjects.length > 0;

  return (
    <motion.div className="w-full max-w-[1400px] mx-auto px-4 pb-24 md:pb-20">
      <div className="flex flex-col gap-8 md:gap-12 pt-4">
        <motion.div className="flex flex-col gap-2">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-white">Projects</h1>
          <p className="text-white/40 text-sm md:text-lg font-medium tracking-tight">
            Your synthetic visual library, synced and ready.
          </p>
        </motion.div>

        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-4 w-full">
          <div className="ios-squircle glass-panel p-1.5 md:p-2 flex flex-col md:flex-row items-stretch md:items-center gap-3 md:gap-4 flex-1">
            <div className="flex-1 relative flex items-center bg-white/5 border border-white/5 rounded-2xl px-3 md:px-4">
              <Search className="w-4 h-4 text-white/20" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search projects by ID or title..."
                className="bg-transparent border-none text-[12px] md:text-[13px] font-bold text-white placeholder:text-white/20 h-9 md:h-10 w-full focus-visible:ring-0"
              />
            </div>

            <div className="flex items-center justify-between md:justify-start gap-2 h-10 px-1 md:px-2">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="bg-transparent border-none text-[10px] md:text-[11px] font-black uppercase tracking-widest text-white/60 w-28 md:w-32 focus:ring-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Recent</SelectItem>
                  <SelectItem value="oldest">Ancient</SelectItem>
                </SelectContent>
              </Select>
              <div className="hidden md:block w-px h-4 bg-white/10 mx-1" />
              <motion.div className="flex bg-black/20 p-1 rounded-xl">
                <button type="button" onClick={() => setViewMode("grid")} className={cn("p-1.5 rounded-lg", viewMode === "grid" ? "bg-white/10 text-white" : "text-white/20")}>
                  <Grid size={14} />
                </button>
                <button type="button" onClick={() => setViewMode("list")} className={cn("p-1.5 rounded-lg", viewMode === "list" ? "bg-white/10 text-white" : "text-white/20")}>
                  <List size={14} />
                </button>
              </motion.div>
            </div>
          </div>

          <Button onClick={handleSync} disabled={isSyncing || loading} className="h-12 lg:h-14 lg:px-8 ios-squircle bg-white/5 border border-white/10 text-white font-black text-[10px] uppercase tracking-[0.2em]">
            {isSyncing ? <Loader2 className="w-4 h-4 animate-spin text-emerald-400" /> : <RefreshCcw className="w-3.5 h-3.5 text-emerald-400" />}
            {isSyncing ? "Refreshing..." : "Sync Directory"}
          </Button>
        </div>

        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div key="loading" className="min-h-[400px] flex flex-col items-center justify-center gap-4">
              <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
              <p className="text-white/20 font-black text-[10px] uppercase tracking-[0.3em]">Accessing Directory...</p>
            </motion.div>
          ) : fetchError ? (
            <motion.div key="error" className="ios-squircle glass-panel min-h-[400px] flex flex-col items-center justify-center gap-4 px-6 text-center">
              <p className="text-red-400/80 text-sm">{fetchError}</p>
              <Button onClick={handleSync}>Retry Sync</Button>
            </motion.div>
          ) : !hasProjects ? (
            <motion.div key="empty" className="ios-squircle glass-panel min-h-[400px] flex flex-col items-center justify-center gap-6 px-6 text-center">
              <Film className="w-10 h-10 text-white/30" />
              <h3 className="text-xl font-bold text-white uppercase">System Empty</h3>
              <Button onClick={onCreateClick} className="rounded-full bg-white text-black font-black text-[10px] uppercase px-8 h-12">Initiate New Session</Button>
            </motion.div>
          ) : !hasVisibleProjects ? (
            <motion.div key="no-results" className="ios-squircle glass-panel min-h-[200px] flex flex-col items-center justify-center gap-3 px-6">
              <p className="text-white/50 text-sm">No projects match your search.</p>
              <Button variant="ghost" onClick={() => setSearchQuery("")}>Clear search</Button>
            </motion.div>
          ) : (
            <motion.div key="content" className={cn("grid gap-4 md:gap-6 w-full", viewMode === "grid" ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" : "grid-cols-1")}>
              {filteredProjects.map((project, idx) => (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className={cn("ios-squircle glass-panel p-2 group/card flex flex-col overflow-hidden", viewMode === "list" && "md:flex-row md:gap-4")}
                >
                  <div className={cn("relative overflow-hidden flex-shrink-0 bg-black/40", viewMode === "grid" ? "aspect-video w-full" : "w-full md:w-56 aspect-video")}>
                    {project.hasVideo !== false ? (
                      <video
                        src={`/api/projects/${project.id}/video`}
                        className="absolute inset-0 w-full h-full object-cover opacity-90"
                        muted
                        playsInline
                        preload="metadata"
                      />
                    ) : (
                      <div className={cn("absolute inset-0 bg-gradient-to-br", getThumbnailClass(project.thumbnailColor))} />
                    )}
                    <div className="absolute top-3 left-3 px-2 py-1 bg-black/40 rounded-lg border border-white/10 text-[9px] font-black text-white/60 flex items-center gap-1">
                      <Hash className="w-2.5 h-2.5" />{project.id.replace("DIS-", "")}
                    </div>
                  </div>
                  <div className="p-4 flex flex-col justify-between flex-1 gap-3">
                    <div>
                      <h4 className="text-[15px] font-black text-white line-clamp-2 uppercase group-hover/card:text-cyan-400">{project.title}</h4>
                      <div className="mt-2 flex flex-wrap gap-3 text-[9px] font-bold text-white/30 uppercase">
                        <span>{project.id}</span>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatDate(project.timestamp)}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-white/5 gap-2">
                      <span className="text-[10px] font-black text-white/40 uppercase">{project.size}</span>
                      {onOpenProject && project.hasVideo !== false && (
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => onOpenProject(project.id)}
                          className="h-8 rounded-lg bg-white/10 text-white text-[10px] font-bold uppercase hover:bg-white/20"
                        >
                          Open
                          <ArrowRight className="w-3 h-3 ml-1" />
                        </Button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
