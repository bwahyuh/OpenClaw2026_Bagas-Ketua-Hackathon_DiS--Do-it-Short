import { useState, useLayoutEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import { SideNav, NavTab } from "./components/SideNav";
import { LandingView } from "./components/LandingView";
import { AuthView } from "./components/AuthView";
import { CreateView } from "./components/CreateView";
import { ClipView } from "./components/ClipView";
import { EditorView } from "./components/EditorView";
import { ProjectsView } from "./components/ProjectsView";
import { SettingsView } from "./components/SettingsView";
import { PrivacyView, TermsView, ContactView } from "./components/LegalViews";
import { cn } from "@/lib/utils";
import type { VideoProject } from "@/src/types/video";

type Engine = "landing" | "auth" | "create" | "clip" | "editor" | "privacy" | "terms" | "contact";

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem("dis_auth") === "true";
  });

  const [activeTab, setActiveTab] = useState<NavTab>("home");
  const [view, setView] = useState<Engine>(() => {
    return isAuthenticated ? "clip" : "landing";
  });
  const [lastView, setLastView] = useState<Engine>("landing");
  const [pendingView, setPendingView] = useState<Engine>("clip");
  const [editorProject, setEditorProject] = useState<VideoProject | null>(null);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  };

  useLayoutEffect(() => {
    scrollToTop();
  }, [activeTab, view]);

  const handleViewChange = (next: Engine) => {
    setView(next);
    scrollToTop();
  };

  const handleLegalClick = (newView: Engine) => {
    if (view !== "privacy" && view !== "terms" && view !== "contact") {
      setLastView(view);
    }
    setView(newView);
    scrollToTop();
  };

  const handleBackFromLegal = () => {
    setView(lastView);
    scrollToTop();
  };

  const handleTabChange = (tab: NavTab) => {
    setActiveTab(tab);
    scrollToTop();
    if (view === "privacy" || view === "terms" || view === "contact") {
      setView(lastView === "landing" ? "clip" : lastView);
    }
  };

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
    handleViewChange(pendingView);
  };

  const handleLogout = () => {
    localStorage.removeItem("dis_auth");
    localStorage.removeItem("dis_auth_email");
    localStorage.removeItem("dis_auth_name");
    setIsAuthenticated(false);
    setActiveTab("home");
    setEditorProject(null);
    handleViewChange("landing");
  };

  const handleGetStarted = (v: "create" | "clip") => {
    setLastView("landing");
    if (isAuthenticated) {
      handleViewChange(v);
    } else {
      setPendingView(v);
      handleViewChange("auth");
    }
  };

  const isLegalView = view === "privacy" || view === "terms" || view === "contact";
  const showSideNav =
    view !== "landing" && view !== "auth" && (lastView !== "landing" || !isLegalView);

  return (
    <motion.div className="min-h-screen relative font-sans overflow-x-hidden">
      <div className="fixed inset-0 bg-black -z-50" />

      <motion.div className="aurora-blur top-[-20%] left-[-10%] w-[80%] h-[80%] bg-cyan-600/30 font-sans" />
      <motion.div className="aurora-blur bottom-[-30%] right-[-10%] w-[70%] h-[70%] bg-emerald-600/30" />
      <motion.div className="aurora-blur top-[10%] right-[5%] w-[40%] h-[40%] bg-cyan-400/10" />

      <AnimatePresence>
        {showSideNav && <SideNav activeTab={activeTab} onTabChange={handleTabChange} />}
      </AnimatePresence>

      <main
        className={cn(
          "px-6 md:pr-8 pt-6 pb-28 md:pb-10 md:py-10 min-h-screen flex flex-col items-center transition-all duration-1000 w-full",
          view === "landing" || view === "auth" || isLegalView
            ? "max-w-full md:pl-6"
            : "max-w-[1500px] mx-auto md:pl-24",
          activeTab === "home" && view === "editor" && "max-w-full",
          activeTab === "projects" && "md:pl-24",
        )}
      >
        <AnimatePresence>
          {activeTab === "home" && (view === "create" || view === "clip") && !isLegalView && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.9 }}
              className="mt-6 mb-12 flex flex-col items-center gap-4"
            >
              <motion.div className="p-1 bg-white/5 backdrop-blur-2xl border border-white/10 rounded-full relative flex items-center h-12 w-[340px]">
                <motion.div
                  layoutId="ios-thumb"
                  className="absolute inset-y-1 bg-white/10 border border-white/20 rounded-full shadow-xl"
                  animate={{
                    left: view === "create" ? "4px" : "calc(50% + 2px)",
                    width: "calc(50% - 6px)",
                  }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
                <button
                  onClick={() => handleViewChange("create")}
                  className={cn(
                    "relative z-10 flex-1 px-6 py-2 text-[13px] font-semibold tracking-tight transition-all duration-500",
                    view === "create" ? "text-white" : "text-white/40 hover:text-white/60",
                  )}
                >
                  Create
                </button>
                <button
                  onClick={() => handleViewChange("clip")}
                  className={cn(
                    "relative z-10 flex-1 px-6 py-2 text-[13px] font-semibold tracking-tight transition-all duration-500",
                    view === "clip" ? "text-white" : "text-white/40 hover:text-white/80",
                  )}
                >
                  Clip
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div className="w-full flex-grow">
          <AnimatePresence mode="wait">
            {isLegalView ? (
              <motion.div
                key={view}
                initial={{ opacity: 0, scale: 0.98, filter: "blur(20px)" }}
                animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                exit={{ opacity: 0, scale: 1.02, filter: "blur(20px)" }}
                transition={{ duration: 0.8, ease: [0.32, 0.72, 0, 1] }}
                className="w-full"
              >
                {view === "privacy" && <PrivacyView onBack={handleBackFromLegal} />}
                {view === "terms" && <TermsView onBack={handleBackFromLegal} />}
                {view === "contact" && <ContactView onBack={handleBackFromLegal} />}
              </motion.div>
            ) : activeTab === "home" ? (
              <motion.div
                key={view}
                initial={{ opacity: 0, scale: 0.98, filter: "blur(20px)" }}
                animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                exit={{ opacity: 0, scale: 1.02, filter: "blur(20px)" }}
                transition={{ duration: 0.8, ease: [0.32, 0.72, 0, 1] }}
                className="w-full"
              >
                {view === "landing" && <LandingView onGetStarted={handleGetStarted} />}
                {view === "auth" && (
                  <AuthView onLogin={handleLoginSuccess} onBack={() => handleViewChange("landing")} />
                )}
                {view === "clip" && <ClipView />}
                {view === "create" && (
                  <CreateView
                    onGenerate={(project) => {
                      setEditorProject(project);
                    }}
                    onOpenEditor={(project) => {
                      setEditorProject(project);
                      handleViewChange("editor");
                    }}
                  />
                )}
                {view === "editor" && (
                  <EditorView
                    project={editorProject}
                    onBack={() => handleViewChange("create")}
                  />
                )}
              </motion.div>
            ) : activeTab === "projects" ? (
              <motion.div
                key="projects"
                initial={{ opacity: 0, y: 20, filter: "blur(20px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: 20, filter: "blur(20px)" }}
                transition={{ duration: 0.6 }}
              >
                <ProjectsView
                  onCreateClick={() => {
                    setActiveTab("home");
                    handleViewChange("create");
                  }}
                  onOpenProject={async (projectId) => {
                    try {
                      const res = await fetch(`/api/projects/${projectId}`);
                      const project = await res.json();
                      if (res.ok) {
                        setEditorProject(project as VideoProject);
                        setActiveTab("home");
                        handleViewChange("editor");
                      }
                    } catch {
                      /* ignore */
                    }
                  }}
                />
              </motion.div>
            ) : (
              <motion.div
                key="settings"
                initial={{ opacity: 0, y: 20, filter: "blur(20px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: 20, filter: "blur(20px)" }}
                transition={{ duration: 0.6 }}
              >
                <SettingsView onLogout={handleLogout} />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <footer
          className={cn(
            "mt-auto py-10 flex flex-col items-center gap-3 text-center transition-opacity duration-500",
            isLegalView ? "opacity-100" : "opacity-20",
            activeTab !== "home" && view !== "privacy" && view !== "terms" && view !== "contact" && "hidden",
          )}
        >
          <motion.div className="flex gap-4 text-[9px] font-bold tracking-widest text-white uppercase">
            <button
              onClick={() => handleLegalClick("privacy")}
              className="hover:text-cyan-400 transition-colors cursor-pointer"
            >
              Privacy
            </button>
            <span className="text-white/20">•</span>
            <button
              onClick={() => handleLegalClick("terms")}
              className="hover:text-cyan-400 transition-colors cursor-pointer"
            >
              Terms
            </button>
            <span className="text-white/20">•</span>
            <button
              onClick={() => handleLegalClick("contact")}
              className="hover:text-cyan-400 transition-colors cursor-pointer"
            >
              Contact
            </button>
          </motion.div>
          <p className="text-[8px] font-black tracking-[0.3em] uppercase text-white/40">
            DiS PROTOCOL &copy; 2026
          </p>
        </footer>
      </main>
    </motion.div>
  );
}
