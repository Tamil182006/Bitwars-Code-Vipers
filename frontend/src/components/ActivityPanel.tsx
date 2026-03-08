"use client";

import { motion } from "framer-motion";
import { AlertTriangle, CheckCircle, AlertCircle, Clock } from "lucide-react";

const activities = [
  {
    id: 1,
    repo: "repo-auth-service",
    detail: "Detected 3 critical errors",
    status: "error",
    time: "2 min ago",
  },
  {
    id: 2,
    repo: "payment-gateway",
    detail: "Dependency conflict detected",
    status: "warning",
    time: "15 min ago",
  },
  {
    id: 3,
    repo: "inventory-system",
    detail: "No major issues",
    status: "success",
    time: "1 hr ago",
  },
  {
    id: 4,
    repo: "user-microservice",
    detail: "2 security vulnerabilities",
    status: "error",
    time: "3 hr ago",
  },
  {
    id: 5,
    repo: "api-gateway",
    detail: "Analysis complete",
    status: "success",
    time: "5 hr ago",
  },
];

const statusConfig = {
  error: {
    icon: AlertTriangle,
    color: "#ef4444",
    bg: "rgba(239, 68, 68, 0.08)",
    border: "rgba(239, 68, 68, 0.2)",
    dot: "#ef4444",
  },
  warning: {
    icon: AlertCircle,
    color: "#f97316",
    bg: "rgba(249, 115, 22, 0.08)",
    border: "rgba(249, 115, 22, 0.2)",
    dot: "#f97316",
  },
  success: {
    icon: CheckCircle,
    color: "#00FFFF",
    bg: "rgba(0, 255, 255, 0.05)",
    border: "rgba(0, 255, 255, 0.15)",
    dot: "#00FFFF",
  },
};

export default function ActivityPanel() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.5 }}
      className="glass rounded-2xl p-6 relative overflow-hidden"
      style={{
        border: "1px solid rgba(0,255,255,0.12)",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <div
            className="status-dot"
            style={{ background: "#00FFFF", boxShadow: "0 0 8px rgba(0,255,255,0.8)" }}
          />
          <h3 className="text-white font-semibold text-sm uppercase tracking-widest">
            Recent Scans
          </h3>
        </div>
        <span className="text-white/30 text-xs flex items-center gap-1">
          <Clock size={12} />
          Live
        </span>
      </div>

      {/* Activity List */}
      <div className="space-y-3">
        {activities.map((item, i) => {
          const cfg = statusConfig[item.status as keyof typeof statusConfig];
          const Icon = cfg.icon;

          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 + i * 0.1, duration: 0.4 }}
              className="activity-item flex items-center gap-3 pl-3 pr-3 py-3 rounded-r-xl group cursor-pointer"
              style={{
                borderLeft: `2px solid ${cfg.border}`,
              }}
              whileHover={{
                borderLeftColor: cfg.color,
                background: cfg.bg,
                x: 4,
              }}
            >
              <div
                className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}
              >
                <Icon size={14} style={{ color: cfg.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className="text-white text-sm font-mono font-medium truncate group-hover:text-[#00FFFF] transition-colors"
                  style={{ transition: "color 0.2s" }}
                >
                  {item.repo}
                </p>
                <p className="text-white/40 text-xs truncate">{item.detail}</p>
              </div>
              <span className="text-white/25 text-xs flex-shrink-0">{item.time}</span>
            </motion.div>
          );
        })}
      </div>

      {/* View all */}
      <button className="w-full mt-4 py-2 rounded-xl text-xs text-white/30 hover:text-[#00FFFF] border border-white/5 hover:border-cyan-500/20 transition-all duration-300">
        View All Activity →
      </button>
    </motion.div>
  );
}
