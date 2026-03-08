import Link from "next/link";
import { Plus, MessageSquare, History, FileCode2, AlertCircle, MoreVertical, Edit2, RefreshCw, Trash2 } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";

interface SidebarLayoutProps {
  children: React.ReactNode;
  activeItemId: string | null;
  historyItems: Array<{ id: string; title: string; createdAt: string }>;
  onSelect: (id: string) => void;
  onNew: () => void;
  type: "analyze" | "errors";
  onDelete?: (id: string) => void;
  onRename?: (id: string, newTitle: string) => void;
  onFetch?: (id: string) => void;
}

function SidebarItem({ 
  item, 
  isActive, 
  type, 
  onSelect, 
  onDelete, 
  onRename, 
  onFetch 
}: { 
  item: any, 
  isActive: boolean, 
  type: string,
  onSelect: (id: string) => void,
  onDelete?: (id: string) => void,
  onRename?: (id: string, newTitle: string) => void,
  onFetch?: (id: string) => void
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(item.title);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isRenaming && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isRenaming]);

  useEffect(() => {
    setRenameValue(item.title);
  }, [item.title]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleRenameSubmit = () => {
    if (isRenaming) {
      setIsRenaming(false);
      const newTitle = renameValue.trim();
      if (newTitle !== "" && newTitle !== item.title) {
        if (onRename) onRename(item.id, newTitle);
      } else {
        setRenameValue(item.title); // revert
      }
    }
  };

  return (
    <div 
      className={`w-full flex items-center justify-between gap-2 px-2 py-1.5 min-h-10 rounded-lg text-sm transition-all group ${
        isActive
          ? "bg-[#112222] border border-cyan-900/40 text-cyan-50 shadow-[0_0_15px_rgba(0,255,255,0.03)]"
          : "text-white/50 hover:bg-[#111] hover:text-white/80 border border-transparent"
      }`}
    >
      <button 
        onClick={() => onSelect(item.id)}
        className="flex items-center gap-3 flex-1 overflow-hidden h-full py-1 text-left"
      >
        {type === "analyze" ? (
          <FileCode2 size={16} className={`flex-shrink-0 ${isActive ? "text-cyan-500" : "opacity-40 group-hover:opacity-100"}`} />
        ) : (
          <AlertCircle size={16} className={`flex-shrink-0 ${isActive ? "text-red-500" : "opacity-40 group-hover:opacity-100"}`} />
        )}
        {isRenaming ? (
          <input
            ref={inputRef}
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onBlur={handleRenameSubmit}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleRenameSubmit();
              if (e.key === "Escape") {
                setIsRenaming(false);
                setRenameValue(item.title);
              }
            }}
            onClick={(e) => e.stopPropagation()}
            className="w-full bg-black/60 border border-cyan-900/50 rounded px-1.5 py-0.5 text-xs font-mono text-cyan-50 focus:outline-none focus:border-cyan-500/50"
          />
        ) : (
          <span className="truncate text-xs font-mono">{item.title}</span>
        )}
      </button>

      <div ref={dropdownRef} className="relative flex-shrink-0">
        <button
          onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen) }}
          className={`p-1.5 rounded-md transition-colors ${
            isOpen ? "bg-[#222] text-white" : "text-white/30 hover:bg-[#222] hover:text-white/80 opacity-0 group-hover:opacity-100"
          }`}
        >
          <MoreVertical size={14} />
        </button>
        {isOpen && (
          <div className="absolute right-0 top-full z-50 mt-1 w-36 rounded-md border border-[#222] bg-[#0a0a0a] py-1 shadow-xl">
            {onRename && (
              <button 
                onClick={(e) => { e.stopPropagation(); setIsOpen(false); setIsRenaming(true); }}
                className="w-full px-3 py-1.5 flex items-center gap-2 text-left text-xs text-white/80 hover:bg-[#111] hover:text-white transition-colors"
              >
                <Edit2 size={12} /> Rename
              </button>
            )}
            {onFetch && type === "analyze" && (
              <button 
                onClick={(e) => { e.stopPropagation(); setIsOpen(false); onFetch(item.id); }}
                className="w-full px-3 py-1.5 flex items-center gap-2 text-left text-xs text-cyan-400 hover:bg-cyan-950/30 transition-colors"
              >
                <RefreshCw size={12} /> Fetch Update
              </button>
            )}
            {(onRename || onFetch) && <div className="my-1 border-t border-[#222]"></div>}
            {onDelete && (
              <button 
                onClick={(e) => { e.stopPropagation(); setIsOpen(false); onDelete(item.id); }}
                className="w-full px-3 py-1.5 flex items-center gap-2 text-left text-xs text-red-500 hover:bg-red-950/30 transition-colors"
              >
                <Trash2 size={12} /> Delete
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function SidebarLayout({
  children,
  activeItemId,
  historyItems,
  onSelect,
  onNew,
  type,
  onDelete,
  onRename,
  onFetch
}: SidebarLayoutProps) {
  const pathname = usePathname();

  return (
    <div className="flex h-[calc(100vh-64px)] w-full mt-16 bg-[#0a0a0a]">
      {/* Sidebar */}
      <aside className="w-64 flex flex-col border-r border-[#1a1a1a] bg-black">
        {/* Header / New Button */}
        <div className="p-4 border-b border-[#1a1a1a]">
          <button
            onClick={onNew}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-[#111] border border-[#222] hover:bg-[#1a1a1a] hover:border-cyan-900/40 text-sm font-medium text-white/90 transition-all font-mono"
          >
            <Plus size={16} className="text-cyan-400" />
            <span className="flex-1 text-left">
              New {type === "analyze" ? "Repository" : "Error"}
            </span>
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          <div className="text-xs font-semibold text-white/30 uppercase tracking-wider mb-2 px-2 flex items-center gap-2">
            <History size={12} /> Recent
          </div>

          {historyItems.length === 0 ? (
            <div className="px-2 py-4 text-xs text-center text-white/20 italic font-mono">
              No recent activity
            </div>
          ) : (
            historyItems.map((item) => (
              <SidebarItem 
                key={item.id}
                item={item}
                isActive={activeItemId === item.id}
                type={type}
                onSelect={onSelect}
                onDelete={onDelete}
                onRename={onRename}
                onFetch={onFetch}
              />
            ))
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#0a0a0a] relative">
        {children}
      </main>
    </div>
  );
}
