"use client";

import { useState, useEffect } from "react";
import gsap from "gsap";
import { Download, ExternalLink, Globe, Loader2, Folder, Trash2, Archive, FolderOpen, Database, Clock, ArrowRight, Zap, Shield, FileText } from "lucide-react";

type Project = {
  siteId: string;
  hasIndex: boolean;
  previewUrl: string;
  createdAt: string;
};

export default function Home() {
  const [url, setUrl] = useState("");
  const [folderName, setFolderName] = useState("");
  const [isMirroring, setIsMirroring] = useState(false);
  const [deepCrawl, setDeepCrawl] = useState(false);
  const [progress, setProgress] = useState(0);
  const [previewSite, setPreviewSite] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [statusText, setStatusText] = useState("");
  const [history, setHistory] = useState<Project[]>([]);
  const [error, setError] = useState("");

  const fetchHistory = async () => {
    try {
      const res = await fetch("/api/history");
      const data = await res.json();
      if (data.projects) {
        setHistory(data.projects);
      }
    } catch (err) {
      console.error("Failed to fetch history", err);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleMirror = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;

    setIsMirroring(true);
    setError("");
    setProgress(10);
    setStatusText("Initializing Playwright engine...");

    // Simulated progress updates for better UX during network interception
    const t1 = setTimeout(() => { setProgress(35); setStatusText("Bypassing security & fetching DOM..."); }, 1500);
    const t2 = setTimeout(() => { setProgress(70); setStatusText("Downloading dynamic assets & stylesheets..."); }, 3500);
    const t3 = setTimeout(() => { setProgress(90); setStatusText("Compiling static mirror..."); }, 5500);

    try {
      const res = await fetch("/api/mirror", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, folderName, deepCrawl }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Failed to mirror website");

      setProgress(100);
      setStatusText("Archive secured.");
      setUrl("");
      setFolderName("");
      await fetchHistory();

    } catch (err: any) {
      setError(err.message);
      setStatusText("Mirroring failed.");
    } finally {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      setTimeout(() => setIsMirroring(false), 2000);
    }
  };

  const handlePurge = async (siteId: string) => {
    try {
      const res = await fetch("/api/purge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      alert("✨ Success: " + data.message);
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  const handleCompress = (siteId: string) => {
    window.location.href = `/api/compress?siteId=${encodeURIComponent(siteId)}`;
  };

  const handleReveal = async (siteId: string) => {
    try {
      await fetch("/api/reveal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId }),
      });
    } catch (err) {
      console.error("Failed to reveal folder", err);
    }
  };

  return (
    <div className="flex flex-col relative w-full">
      {/* Futuristic Animated Background Mesh */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[#030712]" />
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-900/20 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-cyan-900/20 blur-[120px]" />
        <div className="absolute inset-0 bg-tech-grid" />
      </div>

      {/* Global Navigation Shell */}
      <nav className="sticky top-0 z-50 w-full border-b border-white/[0.05] bg-[#030712]/60 backdrop-blur-2xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 font-display text-xl font-semibold tracking-wide text-white">
            <div className="relative flex items-center justify-center h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500 shadow-[0_0_12px_rgba(6,182,212,0.8)]"></span>
            </div>
            Oudo<span className="text-white/40">Mirrors</span>
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-400">
            <a href="#" className="hover:text-cyan-400 transition-colors">Dashboard</a>
            <a href="#" className="hover:text-cyan-400 transition-colors">Archives</a>
            <a href="#" className="hover:text-cyan-400 transition-colors">Network Status</a>
          </div>
        </div>
      </nav>

      <main className="flex-1 flex flex-col relative z-10 w-full max-w-7xl mx-auto px-6 py-20 text-center">
        {/* Hero Section */}
        <h1 className="text-5xl md:text-7xl font-display font-bold tracking-tight text-white mb-6">
          Preserve the Web.<br/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-400">Instantly.</span>
        </h1>
        
        <p className="max-w-2xl mx-auto text-lg text-slate-400 mb-12 leading-relaxed">
          High-fidelity, JavaScript-rendered web archiving powered by distributed Playwright nodes. Capture the web exactly as it looks and behaves.
        </p>

        {/* Action Form */}
        <form onSubmit={handleMirror} className="relative group max-w-3xl mx-auto w-full flex flex-col gap-4">
          <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 to-indigo-500 rounded-3xl blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
          
          <div className="relative flex flex-col sm:flex-row items-center bg-[#030712] border border-white/10 rounded-3xl p-2 pl-6 shadow-2xl transition-all focus-within:border-cyan-500/50 focus-within:shadow-[0_0_30px_rgba(6,182,212,0.15)] w-full">
            <Globe className="text-slate-500 w-6 h-6 mr-4 shrink-0" />
            <input 
              type="url" 
              required
              placeholder="Enter target URL (e.g., https://example.com)" 
              className="flex-1 bg-transparent border-none outline-none text-white placeholder-slate-600 text-base md:text-lg w-full py-4"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
            
            <div className="hidden sm:block w-px h-8 bg-white/10 mx-4"></div>
            
            <Folder className="text-slate-500 w-5 h-5 mr-3 shrink-0 hidden sm:block" />
            <input 
              type="text" 
              placeholder="Custom Folder (Optional)" 
              className="flex-1 bg-transparent border-none outline-none text-white placeholder-slate-600 text-base md:text-lg w-full py-4 hidden sm:block"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
            />

            <button 
              type="submit" 
              disabled={isMirroring}
              className="mt-4 sm:mt-0 ml-2 flex items-center justify-center gap-2 bg-white text-black px-8 py-4 rounded-2xl font-display font-semibold hover:bg-cyan-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap w-full sm:w-auto"
            >
              {isMirroring ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
              {isMirroring ? 'Archiving...' : 'Mirror Now'}
            </button>
          </div>
          
          {/* Mobile view for custom folder name */}
          <div className="sm:hidden relative flex items-center bg-[#030712]/80 border border-white/10 rounded-2xl p-2 pl-6 focus-within:border-white/20 transition-all">
            <Folder className="text-slate-500 w-5 h-5 mr-4" />
            <input 
              type="text" 
              placeholder="Custom Folder Name (Optional)" 
              className="flex-1 bg-transparent border-none outline-none text-white placeholder-slate-600 w-full py-3"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
            />
          </div>

          {/* Deep Crawl Toggle */}
          <div className="flex items-center gap-3 px-2">
            <button 
              type="button"
              onClick={() => setDeepCrawl(!deepCrawl)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${deepCrawl ? 'bg-cyan-500' : 'bg-slate-700'}`}
            >
              <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${deepCrawl ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
            <span className="text-sm font-medium text-slate-300">Deep Crawl (Follow internal links)</span>
          </div>
          
          {error && (
            <div className="mt-2 px-5 py-4 rounded-xl border w-full text-left font-medium relative z-10" style={{ backgroundColor: "rgba(239,68,68,0.1)", color: "#EF4444", borderColor: "rgba(239,68,68,0.2)" }}>
              {error}
            </div>
          )}
        </form>

        {/* Progress Display */}
        {isMirroring && (
          <div className="max-w-2xl mx-auto w-full mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500 relative z-10">
            <div className="flex justify-between text-xs text-slate-400 font-display mb-2">
              <span>{statusText}</span>
              <span className="text-cyan-400">{progress}%</span>
            </div>
            <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-cyan-500 to-indigo-500 h-1.5 rounded-full transition-all duration-300 ease-out relative"
                style={{ width: `${progress}%` }}
              >
                <div className="absolute top-0 right-0 bottom-0 left-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.2)_50%,transparent_75%,transparent_100%)] bg-[length:20px_20px] animate-[progress-bar-stripes_1s_linear_infinite]"></div>
              </div>
            </div>
          </div>
        )}

        {/* Recent Archives Grid */}
        <div className="mt-32 text-left relative z-10">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-white font-display font-semibold text-2xl flex items-center gap-3">
              <Database className="w-6 h-6 text-indigo-400" />
              Recent Mirrors
            </h2>
            <button className="text-sm text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors">
              View All <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          
          {history.length === 0 ? (
            <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-16 text-center text-slate-500">
              <Archive className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg">Your mirror archive is currently empty.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {history.map((project) => (
                <div key={project.siteId} className="bg-[#0f172a]/50 border border-white/10 rounded-3xl p-6 hover:bg-[#1e293b]/50 hover:border-white/20 transition-all group flex flex-col shadow-xl">
                  <div className="flex justify-between items-start mb-6">
                    <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl group-hover:bg-indigo-500/20 transition-colors">
                      <Archive className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-bold tracking-wider uppercase px-3 py-1.5 rounded-full border bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                      Completed
                    </span>
                  </div>
                  
                  <h3 className="text-slate-200 font-display font-semibold text-xl mb-2 truncate" title={project.siteId}>
                    {project.siteId}
                  </h3>
                  
                  <p className="text-slate-500 text-sm mb-6 flex items-center gap-2">
                    <Clock className="w-4 h-4" /> 
                    {new Date(project.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                  
                  {/* Action Buttons Grid */}
                  <div className="pt-5 border-t border-white/5 grid grid-cols-2 md:grid-cols-3 gap-3 mt-auto w-full">
                    <button 
                      onClick={() => setPreviewSite(project.previewUrl)}
                      className="flex items-center justify-center gap-2 text-sm font-medium py-3 px-2 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 rounded-xl transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" /> Preview
                    </button>
                    <a 
                      href={`/mirrors/${project.siteId}/content.md`}
                      target="_blank" 
                      rel="noreferrer"
                      className="flex items-center justify-center gap-2 text-sm font-medium py-3 px-2 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 rounded-xl transition-colors"
                      title="View Markdown"
                    >
                      <FileText className="w-4 h-4" /> MD
                    </a>
                    <button 
                      onClick={() => handleCompress(project.siteId)}
                      className="flex items-center justify-center gap-2 text-sm font-medium py-3 px-2 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white rounded-xl transition-colors"
                    >
                      <Download className="w-4 h-4" /> Zip
                    </button>
                    <button 
                      onClick={() => handlePurge(project.siteId)}
                      className="flex items-center justify-center gap-2 text-sm font-medium py-3 px-2 bg-white/5 text-slate-300 hover:bg-red-500/10 hover:text-red-400 rounded-xl transition-colors md:col-span-2 lg:col-span-1"
                      title="Purge & Clean"
                    >
                      <Trash2 className="w-4 h-4" /> Purge
                    </button>
                    <button 
                      onClick={() => handleReveal(project.siteId)}
                      className="flex items-center justify-center gap-2 text-sm font-medium py-3 px-2 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white rounded-xl transition-colors md:col-span-1 lg:col-span-2"
                      title="Reveal in Finder"
                    >
                      <FolderOpen className="w-4 h-4" /> Reveal
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* In-App Previewer Modal */}
      {previewSite && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-[#0f172a] border border-white/10 rounded-3xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-white/10 bg-[#030712] shrink-0">
              <div className="flex gap-2">
                <button onClick={() => setPreviewMode('desktop')} className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${previewMode === 'desktop' ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-400 hover:bg-white/5'}`}>Desktop</button>
                <button onClick={() => setPreviewMode('tablet')} className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${previewMode === 'tablet' ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-400 hover:bg-white/5'}`}>Tablet</button>
                <button onClick={() => setPreviewMode('mobile')} className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${previewMode === 'mobile' ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-400 hover:bg-white/5'}`}>Mobile</button>
              </div>
              <button onClick={() => setPreviewSite(null)} className="text-slate-400 hover:text-white p-2 flex items-center gap-2 text-sm font-medium">
                Close <span className="text-xl leading-none">&times;</span>
              </button>
            </div>
            <div className="flex-1 bg-[repeating-linear-gradient(45deg,#030712_25%,transparent_25%,transparent_75%,#030712_75%,#030712),repeating-linear-gradient(45deg,#030712_25%,#0f172a_25%,#0f172a_75%,#030712_75%,#030712)] bg-[length:20px_20px] bg-[position:0_0,10px_10px] flex items-center justify-center p-4 md:p-8 overflow-auto">
              <div className={`bg-white rounded-md overflow-hidden transition-all duration-500 ease-in-out shadow-2xl ring-1 ring-white/10 ${previewMode === 'desktop' ? 'w-full h-full' : previewMode === 'tablet' ? 'w-[768px] h-[1024px]' : 'w-[375px] h-[812px]'}`}>
                <iframe src={previewSite} className="w-full h-full border-0 bg-white" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
