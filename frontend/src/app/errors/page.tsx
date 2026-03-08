"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import SidebarLayout from "@/components/SidebarLayout";
import { Loader2, TerminalSquare, AlertTriangle, User, Bot, FileCode2, ChevronRight, Bug } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useAuth } from "@/contexts/AuthContext";
import { globalStore } from "@/lib/store";

const API = "http://localhost:8000";

type ChatMessage = {
  id: string;
  role: "system" | "user" | "ai";
  content: string | React.ReactNode;
};

type ErrorSession = {
  id: string;
  title: string;
  createdAt: string;
  messages: ChatMessage[];
  status: "idle" | "analyzing" | "ready";
};

export default function ErrorsPage() {
  const [sessions, setSessions] = useState<ErrorSession[]>(globalStore.errorSessions || []);
  const [activeId, setActiveId] = useState<string | null>(globalStore.errorActiveId || null);
  const [errorInput, setErrorInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  const { token, user, isLoading } = useAuth();
  const router = useRouter();

  const activeSession = sessions.find((s) => s.id === activeId);

  const getHeaders = () => ({
    "Content-Type": "application/json",
    ...(token ? { "Authorization": `Bearer ${token}` } : {}),
  });

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  // Persist to global store on change
  useEffect(() => {
    globalStore.errorSessions = sessions;
    globalStore.errorActiveId = activeId;
  }, [sessions, activeId]);

  // Auto-scroll chat (must be before conditional returns)
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeSession?.messages, activeSession?.status]);

  // Show loading while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-cyan-400" />
      </div>
    );
  }

  // Don't render if not authenticated
  if (!user) {
    return null;
  }

  const handleNewSession = () => {
    setActiveId(null);
    setErrorInput("");
  };

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!errorInput.trim()) return;

    // Create a short title from the first line of the error
    let title = errorInput.split("\n")[0].trim().substring(0, 40);
    if (title.length === 40) title += "...";

    const newSession: ErrorSession = {
      id: Date.now().toString(),
      title,
      createdAt: new Date().toISOString(),
      messages: [],
      status: "analyzing",
    };

    setSessions((prev) => [newSession, ...prev]);
    setActiveId(newSession.id);

    // The user's trace is essentially their first message
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: (
        <pre className="text-xs font-mono text-white/70 whitespace-pre-wrap leading-relaxed">
          {errorInput}
        </pre>
      ),
    };

    setSessions((prev) =>
      prev.map((s) =>
        s.id === newSession.id ? { ...s, messages: [userMessage] } : s
      )
    );

    const traceToAnalyze = errorInput;
    setErrorInput("");

    try {
      const res = await fetch(`${API}/api/debug/analyze`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ error_text: traceToAnalyze }),
      });
      const data = await res.json();

      let aiContent;
      if (!res.ok || data.error) {
        aiContent = <span className="text-red-400 font-mono text-sm">{data.detail || data.error || "Analysis failed"}</span>;
      } else {
        aiContent = (
          <div className="space-y-6 w-full">
            {/* Error Type/Info Header */}
            {data?.error_info && (data.error_info.error_type || data.error_info.error_message) && (
              <div className="border border-red-900/30 bg-red-950/10 rounded-lg p-3">
                <div className="flex items-center gap-2 text-red-400 mb-2 pb-2 border-b border-red-900/40">
                  <AlertTriangle size={14} />
                  <span className="text-xs font-bold uppercase tracking-wider">Error Successfully Parsed</span>
                </div>
                <div className="text-red-300 font-bold text-sm mb-1">Type: {data.error_info.error_type || "Unknown Error"}</div>
                <div className="font-mono text-xs text-white/60">Message: {data.error_info.error_message || "No specific message extracted"}</div>
                {data.error_info.files_mentioned?.length > 0 && (
                  <div className="font-mono text-xs text-white/50 mt-1">Files found: {data.error_info.files_mentioned.join(", ")}</div>
                )}
                {data.error_info.variables_traced?.length > 0 && (
                  <div className="font-mono text-xs text-orange-400/70 mt-1">🔍 Variables traced: {data.error_info.variables_traced.join(", ")}</div>
                )}
              </div>
            )}

            {/* Explanation & Fix */}
            <div>
              <div className="text-sm font-semibold text-white/90 mb-2 flex items-center gap-2">
                <AlertTriangle size={15} className="text-yellow-500" /> Root Cause & Solution
              </div>
              <div className="text-sm text-white/80 leading-relaxed font-sans prose prose-invert max-w-none prose-a:text-cyan-400">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    code({ node, inline, className, children, ...props }: any) {
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
                  {data.explanation}
                </ReactMarkdown>
              </div>
            </div>

            {/* Relevant Files */}
            {data.relevant_files && data.relevant_files.length > 0 && (
              <div className="mt-4 border border-[#222] bg-[#0a0a0a] rounded-lg overflow-hidden">
                <div className="bg-[#111] px-3 py-2 text-xs font-mono text-white/50 border-b border-[#222] flex items-center gap-2">
                  <FileCode2 size={14} /> Implicated Files
                </div>
                <div className="p-2 space-y-1">
                  {data.relevant_files.map((f: any, i: number) => (
                    <div key={i} className="text-xs font-mono text-white/70 px-2 py-1 flex items-center gap-2">
                      <ChevronRight size={12} className="opacity-50 text-red-400" />
                      <span className="truncate">{f.path}</span>
                      <span className="opacity-40 ml-auto flex-shrink-0">L{f.start_line}-{f.end_line}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      }

      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "ai",
        content: aiContent,
      };

      setSessions((prev) =>
        prev.map((s) =>
          s.id === newSession.id
            ? { ...s, status: "ready", messages: [...s.messages, aiMessage] }
            : s
        )
      );
    } catch (err: any) {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "ai",
        content: <span className="text-red-400">Connection error: {err.message}</span>,
      };
      setSessions((prev) =>
        prev.map((s) =>
          s.id === newSession.id
            ? { ...s, status: "ready", messages: [...s.messages, errorMessage] }
            : s
        )
      );
    }
  };

  return (
    <SidebarLayout
      type="errors"
      activeItemId={activeId}
      historyItems={sessions.map(s => ({ id: s.id, title: s.title, createdAt: s.createdAt }))}
      onSelect={setActiveId}
      onNew={handleNewSession}
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
              <Bug size={32} />
            </div>

            <div>
              <h1 className="text-3xl font-medium text-white mb-3 tracking-tight">Debug Error Trace</h1>
              <p className="text-white/40 text-sm">Paste an exact stack trace or error log to instantly diagnose the root cause.</p>
            </div>

            <form onSubmit={handleAnalyze} className="relative mt-8 group max-w-2xl mx-auto w-full">
              <div className="absolute inset-0 bg-red-500/5 rounded-xl blur-xl group-hover:bg-red-500/10 transition-colors pointer-events-none" />
              <div className="relative flex flex-col bg-black border border-[#222] group-hover:border-[#333] transition-colors rounded-xl overflow-hidden shadow-2xl">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-[#222] bg-[#0a0a0a]">
                  <TerminalSquare size={14} className="text-white/30" />
                  <span className="text-xs font-mono text-white/30 uppercase tracking-widest">Stack Trace</span>
                </div>
                <textarea
                  required
                  placeholder={"TypeError: Cannot read properties of undefined (reading 'map')\n    at UserList (components/UserList.tsx:24:18)\n    at renderWithHooks (react-dom.development.js:16305:18)"}
                  value={errorInput}
                  onChange={(e) => setErrorInput(e.target.value)}
                  className="w-full h-48 p-4 bg-transparent text-sm text-white/80 placeholder:text-white/20 focus:outline-none font-mono resize-y"
                />
                <div className="p-3 bg-[#0a0a0a] border-t border-[#222] flex justify-end">
                  <button
                    type="submit"
                    disabled={!errorInput.trim()}
                    className="px-6 py-2.5 bg-white text-black font-medium text-sm rounded-lg hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                  >
                    Analyze Logs
                  </button>
                </div>
              </div>
            </form>
          </motion.div>
        </div>
      ) : (
        // --- CHAT INTERFACE VIEW ---
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#050505]">
          {/* Main Chat Area */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 pb-12">
            <div className="max-w-4xl mx-auto space-y-6">

              <div className="text-center py-6 border-b border-[#111] mb-8">
                <h2 className="text-lg font-mono text-white/80 flex items-center justify-center gap-2">
                  <AlertTriangle size={18} className="text-red-500/70" /> {activeSession.title}
                </h2>
                <p className="text-xs text-white/30 mt-2 font-mono">DevGuardian Debug Session</p>
              </div>

              {/* Chat Messages */}
              {activeSession.messages.map((msg) => (
                <div key={msg.id} className={`flex gap-4 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-1 ${msg.role === "user"
                      ? "bg-[#222] border border-[#333]"
                      : "bg-[#111] border border-[#222]"
                    }`}>
                    {msg.role === "user" ? <User size={16} className="text-white/70" /> :
                      <Bot size={16} className="text-white/50" />}
                  </div>
                  <div className={`flex-1 flex max-w-[85%] ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`${msg.role === "user"
                        ? "bg-[#1f1f1f] border border-[#333] px-4 py-3 rounded-2xl rounded-tr-sm text-sm overflow-x-auto w-full"
                        : "pt-1 w-full"
                      }`}>
                      {msg.content}
                    </div>
                  </div>
                </div>
              ))}

              {activeSession.status === "analyzing" && (
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-lg bg-[#111] border border-[#222] flex items-center justify-center flex-shrink-0 mt-1">
                    <Bot size={16} className="text-white/50" />
                  </div>
                  <div className="flex-1 pt-2">
                    <div className="flex items-center gap-3 text-white/40 text-sm font-mono">
                      <Loader2 size={14} className="animate-spin" />
                      Deconstructing stack trace and searching codebase...
                    </div>
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>
          </div>
        </div>
      )}
    </SidebarLayout>
  );
}
