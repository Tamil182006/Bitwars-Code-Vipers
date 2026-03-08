"use client";

import { useState, useRef, useEffect } from "react";
import SidebarLayout from "@/components/SidebarLayout";
import { Loader2, Github, TerminalSquare, Search, FileCode2, User, Bot, AlertTriangle, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

const API = "http://localhost:8000";

type ChatMessage = {
  id: string;
  role: "system" | "user" | "ai";
  content: string | React.ReactNode;
};

type RepoSession = {
  id: string;
  repoUrl: string;
  title: string;
  createdAt: string;
  messages: ChatMessage[];
  status: "idle" | "ingesting" | "ready" | "error";
  ingestData?: any;
};

export default function AnalyzePage() {
  const [sessions, setSessions] = useState<RepoSession[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [repoInput, setRepoInput] = useState("");
  const [queryInput, setQueryInput] = useState("");
  const [isQuerying, setIsQuerying] = useState(false);
  const pollRef = useRef<any>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const activeSession = sessions.find((s) => s.id === activeId);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeSession?.messages, activeSession?.status]);

  // Cleanup polling
  useEffect(() => {
    return () => clearInterval(pollRef.current);
  }, []);

  const handleNewSession = () => {
    setActiveId(null);
    setRepoInput("");
  };

  const handleDelete = (id: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== id));
    if (activeId === id) setActiveId(null);
  };

  const handleRename = (id: string, newTitle: string) => {
    if (!newTitle || !newTitle.trim()) return;
    setSessions((prev) => 
      prev.map((s) => s.id === id ? { ...s, title: newTitle.trim() } : s)
    );
  };

  const handleFetch = (id: string) => {
    setSessions((prev) => 
      prev.map((s) => {
        if (s.id !== id) return s;
        // Mock a re-fetch by simply re-adding a system message
        const fetchMessage: ChatMessage = {
          id: Date.now().toString(),
          role: "system",
          content: <span className="text-cyan-400 font-mono text-xs">Repository updates fetched successfully.</span>
        };
        return { ...s, messages: [...s.messages, fetchMessage] };
      })
    );
  };

  const handleIngest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoInput.trim()) return;

    try {
      let urlObj;
      try {
        urlObj = new URL(repoInput);
      } catch (e) {
        urlObj = { pathname: `/${repoInput}` };
      }
      
      const title = urlObj.pathname.slice(1) || repoInput;
      const newSession: RepoSession = {
        id: Date.now().toString(),
        repoUrl: repoInput,
        title,
        createdAt: new Date().toISOString(),
        messages: [],
        status: "ingesting",
      };

      setSessions((prev) => [newSession, ...prev]);
      setActiveId(newSession.id);
      setRepoInput("");

      setSessions((prev) => [newSession, ...prev]);
      setActiveId(newSession.id);
      setRepoInput("");

      // 1) Start Ingestion on Backend
      const res = await fetch(`${API}/api/repo/ingest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo_url: newSession.repoUrl }),
      });
      
      if (!res.ok) throw new Error("Failed to start ingestion");

      // 2) Poll Status
      pollRef.current = setInterval(async () => {
        try {
          const statusRes = await fetch(`${API}/api/repo/status`);
          const statusData = await statusRes.json();

          setSessions((prev) =>
            prev.map((s) => {
              if (s.id !== newSession.id) return s;
              
              const updatedSession = { ...s, ingestData: statusData };
              
              if (statusData.status === "ready") {
                clearInterval(pollRef.current);
                const summaryMessage: ChatMessage = {
                  id: Date.now().toString(),
                  role: "system",
                  content: (
                    <div className="flex flex-col gap-3 w-full">
                      <span className="text-cyan-400 font-medium border border-cyan-900/50 bg-cyan-950/20 px-3 py-1.5 rounded-md inline-block w-fit">
                        Repository Analyzed Successfully
                      </span>
                      <div className="text-sm text-white/80 bg-[#0a0a0a] border border-[#222] p-4 rounded-lg font-mono leading-relaxed">
                        <p className="mb-2 text-cyan-500/80 font-bold">/// REPOSITORY SUMMARY ///</p>
                        <p><strong>Status:</strong> Ready for questions.</p>
                        <p><strong>Total Files:</strong> {statusData.total_files || "?"}</p>
                        <p><strong>Total Chunks:</strong> {statusData.total_chunks || "?"}</p>
                        <p className="mt-2 text-white/50 text-xs">The vector database is populated. You can now paste an error or ask general questions about the codebase.</p>
                      </div>
                    </div>
                  )
                };
                return { ...updatedSession, status: "ready", messages: [summaryMessage] };
              } else if (statusData.status.startsWith("error") || statusData.status === "failed") {
                 clearInterval(pollRef.current);
                 return { ...updatedSession, status: "error" };
              }
              return updatedSession;
            })
          );
        } catch (err) {
          console.error("Polling error", err);
        }
      }, 1500);

    } catch (err: any) {
      alert(err.message || "Failed to connect to backend");
    }
  };

  const handleQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!queryInput.trim() || !activeSession || activeSession.status !== "ready") return;

    const queryText = queryInput;
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: queryText,
    };

    setSessions((prev) =>
      prev.map((s) =>
        s.id === activeSession.id
          ? { ...s, messages: [...s.messages, userMessage] }
          : s
      )
    );
    setQueryInput("");
    setIsQuerying(true);

    setIsQuerying(true);

    try {
      // Smart detection: Is it an error or a natural language question?
      const isError = /error|exception|traceback|line\s\d+/i.test(queryText);
      const endpoint = isError ? "/api/debug/analyze" : "/api/debug/query";
      const bodyPayload = isError ? { error_text: queryText } : { query: queryText };

      // Call Backend
      const res = await fetch(`${API}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyPayload),
      });

      if (!res.ok) throw new Error("Backend request failed");
      const data = await res.json();

      const aiText = isError ? data.explanation : data.answer;
      const relevantFiles = data.relevant_files || [];

      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "ai",
        content: (
          <div className="space-y-4">
            {/* Show parsed error metadata if it exists */}
            {isError && data.error_info && (data.error_info.error_type || data.error_info.error_message) && (
              <div className="bg-red-950/20 border border-red-900/30 rounded-lg p-3 mb-4">
                <div className="flex items-center gap-2 text-red-400 mb-2 pb-2 border-b border-red-900/40">
                  <AlertTriangle size={14} />
                  <span className="text-xs font-bold uppercase tracking-wider">Error Parsed</span>
                </div>
                <div className="text-xs font-mono text-red-200/70 space-y-1">
                  <p><strong className="text-red-300">Type:</strong> {data.error_info.error_type || "Unknown Error"}</p>
                  <p><strong className="text-red-300">Message:</strong> {data.error_info.error_message || "No specific message extracted"}</p>
                  {data.error_info.files_mentioned?.length > 0 && (
                     <p><strong className="text-red-300">Files:</strong> {data.error_info.files_mentioned.join(", ")}</p>
                  )}
                </div>
              </div>
            )}
            
            <div className="text-sm text-white/90 leading-relaxed font-sans prose prose-invert max-w-none prose-a:text-cyan-400">
              <ReactMarkdown 
                remarkPlugins={[remarkGfm]}
                components={{
                  code({node, inline, className, children, ...props}: any) {
                    const match = /language-(\w+)/.exec(className || '')
                    return !inline && match ? (
                      <div className="rounded-md overflow-hidden border border-[#333] my-4">
                        <div className="bg-[#111] px-3 py-1 text-xs text-white/50 border-b border-[#333] font-mono">
                          {match[1]}
                        </div>
                        <SyntaxHighlighter
                          {...props}
                          style={vscDarkPlus as any}
                          language={match[1]}
                          PreTag="div"
                          customStyle={{ margin: 0, padding: '1rem', background: '#0a0a0a' }}
                        >
                          {String(children).replace(/\n$/, '')}
                        </SyntaxHighlighter>
                      </div>
                    ) : (
                      <code {...props} className="bg-cyan-950/30 text-cyan-400 px-1.5 py-0.5 rounded font-mono text-[0.85em]">
                        {children}
                      </code>
                    )
                  }
                }}
              >
                {aiText || "No response generated."}
              </ReactMarkdown>
            </div>
            
            {relevantFiles.length > 0 && (
              <div className="mt-4 border border-cyan-900/30 bg-black/40 rounded-lg overflow-hidden">
                 <div className="bg-[#111] px-3 py-2 text-xs font-mono text-white/50 border-b border-cyan-900/30 flex items-center justify-between">
                   <span>Relevant Context Sources</span>
                   <span>{relevantFiles.length} matched files</span>
                 </div>
                 <div className="p-2 space-y-1">
                   {relevantFiles.map((file: any, index: number) => (
                     <div key={index} className="text-xs font-mono text-cyan-500/80 px-2 py-1 flex items-center gap-2">
                        <ArrowRight size={12} className="opacity-50" />
                        <span className="truncate">{file.path}</span>
                        <span className="opacity-40 ml-auto flex-shrink-0">Score: {file.score ? file.score.toFixed(2) : "N/A"}</span>
                     </div>
                   ))}
                 </div>
              </div>
            )}
          </div>
        )
      };

      setSessions((prev) =>
        prev.map((s) =>
          s.id === activeSession.id
            ? { ...s, messages: [...s.messages, aiMessage] }
            : s
        )
      );
    } catch (err: any) {
      // Handle API errors gracefully in the chat
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "system",
        content: <span className="text-red-400 font-mono text-xs">Error communicating with backend: {err.message}</span>
      };
      setSessions((prev) =>
        prev.map((s) => s.id === activeSession.id ? { ...s, messages: [...s.messages, errorMessage] } : s)
      );
    } finally {
      setIsQuerying(false);
    }
  };

  return (
    <SidebarLayout 
      type="analyze"
      activeItemId={activeId}
      historyItems={sessions.map(s => ({ id: s.id, title: s.title, createdAt: s.createdAt }))}
      onSelect={setActiveId}
      onNew={handleNewSession}
      onDelete={handleDelete}
      onRename={handleRename}
      onFetch={handleFetch}
    >
      {!activeSession ? (
        // --- NEW SESSION VIEW ---
        <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-12 relative overflow-hidden backdrop-blur-md">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-2xl text-center space-y-8 relative z-10"
          >
            <div className="w-16 h-16 mx-auto rounded-2xl bg-black border border-[#222] flex items-center justify-center text-white/80 shadow-[0_0_40px_rgba(255,255,255,0.03)]">
              <TerminalSquare size={32} />
            </div>
            
            <div>
              <h1 className="text-3xl font-medium text-white mb-3 tracking-tight">Analyze Codebase</h1>
              <p className="text-white/40 text-sm">Paste a GitHub repository URL to index it and start asking questions.</p>
            </div>

            <form onSubmit={handleIngest} className="relative mt-8 group max-w-xl mx-auto">
              <div className="absolute inset-0 bg-cyan-500/5 rounded-xl blur-xl group-hover:bg-cyan-500/10 transition-colors pointer-events-none" />
              <div className="relative flex items-center bg-black border border-[#222] group-hover:border-[#333] transition-colors rounded-xl overflow-hidden shadow-2xl">
                <Github size={20} className="absolute left-4 text-white/30" />
                <input
                  type="url"
                  required
                  placeholder="https://github.com/facebook/react"
                  value={repoInput}
                  onChange={(e) => setRepoInput(e.target.value)}
                  className="w-full py-4 pl-12 pr-32 bg-transparent text-sm text-white placeholder:text-white/20 focus:outline-none font-mono"
                />
                <button
                  type="submit"
                  disabled={!repoInput.trim()}
                  className="absolute right-2 px-4 py-2 bg-white text-black font-medium text-sm rounded-lg hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Analyze
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      ) : (
        // --- CHAT INTERFACE VIEW ---
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#050505]">
          {/* Main Chat Area */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            <div className="max-w-3xl mx-auto space-y-6">
              
              <div className="text-center py-6 border-b border-[#111] mb-8 relative flex flex-col items-center">
                 <h2 className="text-lg font-mono text-white/80 flex items-center justify-center gap-2">
                   <Github size={18} /> {activeSession.title}
                 </h2>
                 <p className="text-xs text-white/30 mt-2 font-mono">{activeSession.repoUrl}</p>
              </div>

              {/* Ingestion Status Loading Block (if not ready) */}
              {activeSession.status === "ingesting" && (
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-lg bg-[#111] border border-[#222] flex items-center justify-center flex-shrink-0">
                    <TerminalSquare size={16} className="text-white/50" />
                  </div>
                  <div className="flex-1 pt-1">
                    <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-4 font-mono text-xs max-w-lg">
                      <div className="flex items-center gap-3 text-cyan-500/70 mb-2">
                        <Loader2 size={14} className="animate-spin" />
                        Initializing Agent Pipeline...
                      </div>
                      <div className="text-white/40 space-y-1">
                        <p>[{activeSession.ingestData?.status || "starting"}] {activeSession.ingestData?.message || "Preparing..."}</p>
                        {activeSession.ingestData?.total_chunks > 0 && (
                           <p className="text-cyan-600/50">Processing {activeSession.ingestData.total_chunks} chunk(s) across {activeSession.ingestData.total_files} file(s)...</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Chat Messages */}
              {activeSession.messages.map((msg) => (
                <div key={msg.id} className={`flex gap-4 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    msg.role === "user" 
                      ? "bg-[#222] border border-[#333]" 
                      : msg.role === "system"
                        ? "bg-[#111] border border-[#222]"
                        : "bg-cyan-950/30 border border-cyan-900/40"
                  }`}>
                    {msg.role === "user" ? <User size={16} className="text-white/70" /> : 
                     msg.role === "system" ? <TerminalSquare size={16} className="text-white/50" /> : 
                     <Bot size={16} className="text-cyan-500" />}
                  </div>
                  <div className={`flex-1 flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[85%] ${
                      msg.role === "user" 
                        ? "bg-[#1f1f1f] text-white/90 px-4 py-2.5 rounded-2xl rounded-tr-sm text-sm" 
                        : "pt-1"
                    }`}>
                      {msg.content}
                    </div>
                  </div>
                </div>
              ))}
              
              {isQuerying && (
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-lg bg-cyan-950/30 border border-cyan-900/40 flex items-center justify-center flex-shrink-0">
                    <Bot size={16} className="text-cyan-500" />
                  </div>
                  <div className="flex-1 pt-2">
                    <Loader2 size={16} className="animate-spin text-cyan-600/50" />
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>
          </div>

          {/* Sticky Input Area */}
          <div className="flex-shrink-0 flex justify-center bg-[#050505] border-t border-[#111] p-4 sm:p-6 z-10 w-full relative">
            <div className="max-w-3xl w-full">
              <form onSubmit={handleQuery} className="relative flex items-center">
                <textarea
                  rows={2}
                  placeholder={activeSession.status === "ready" ? "Ask about the codebase or paste an error..." : "Waiting for indexing..."}
                  disabled={activeSession.status !== "ready" || isQuerying}
                  value={queryInput}
                  onChange={(e) => setQueryInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleQuery(e as any);
                    }
                  }}
                  className="w-full bg-[#111] border border-[#222] py-4 pl-4 pr-14 rounded-xl text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#444] disabled:opacity-50 transition-colors shadow-2xl resize-none"
                />
                <button
                  type="submit"
                  disabled={!queryInput.trim() || activeSession.status !== "ready" || isQuerying}
                  className="absolute right-3 bottom-3 p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white disabled:opacity-30 transition-colors"
                >
                  <ArrowRight size={18} />
                </button>
              </form>
              <p className="text-center text-[10px] text-white/20 mt-3 font-mono">DevGuardian AI can make mistakes. Verify code suggestions.</p>
            </div>
          </div>
        </div>
      )}
    </SidebarLayout>
  );
}
