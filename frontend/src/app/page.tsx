"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import AnimatedBackground from "@/components/AnimatedBackground";
import CursorGlow from "@/components/CursorGlow";
import FeatureCard from "@/components/FeatureCard";
import ActivityPanel from "@/components/ActivityPanel";
import {
  GitBranch,
  Zap,
  Bot
} from "lucide-react";

const featureCards = [
  {
    title: "Codebase Analyzer",
    description:
      "Upload a repository and instantly understand file structure, architecture, and dependencies.",
    icon: GitBranch,
    delay: 0.1,
  },
  {
    title: "Error Diagnosis",
    description:
      "Paste stack traces and receive AI explanations of what went wrong and why.",
    icon: Zap,
    delay: 0.2,
  },
  {
    title: "AI Fix Suggestions",
    description:
      "Get intelligent suggestions to resolve errors automatically with confidence scores.",
    icon: Bot,
    delay: 0.3,
  },
];

const stats = [
  { value: "10K+", label: "Repos Analyzed" },
  { value: "99.8%", label: "Uptime" },
  { value: "2.3s", label: "Avg. Scan Time" },
  { value: "500+", label: "Teams Using" },
];

export default function HomePage() {
  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <AnimatedBackground />
      <CursorGlow />

      <main className="relative z-10 pt-20">
        {/* Hero Section */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="text-center"
          >
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1, duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium mb-8"
              style={{
                background: "rgba(0,255,255,0.06)",
                border: "1px solid rgba(0,255,255,0.2)",
                color: "#00FFFF",
              }}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{
                  background: "#00FFFF",
                  boxShadow: "0 0 8px rgba(0,255,255,0.8)",
                  animation: "pulse 1.5s infinite",
                }}
              />
              AI-Powered Code Intelligence Platform
            </motion.div>

            {/* Main Title */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.7 }}
              className="text-6xl sm:text-7xl lg:text-8xl font-black mb-4 logo-text tracking-tight"
            >
              <span className="text-white">Dev</span>
              <span
                style={{
                  color: "#00FFFF",
                  textShadow:
                    "0 0 30px rgba(0,255,255,0.8), 0 0 60px rgba(0,255,255,0.4)",
                }}
              >
                Guardian
              </span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.7 }}
              className="text-white/60 text-xl sm:text-2xl font-light mb-6 tracking-wide"
            >
              AI Powered Codebase Intelligence
            </motion.p>

            {/* Description */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.7 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-6 mb-10 text-white/45 text-sm"
            >
              {[
                "Understand your codebase instantly.",
                "Diagnose runtime errors faster.",
                "Get intelligent AI-powered code fixes.",
              ].map((text, i) => (
                <span key={i} className="flex items-center gap-2">
                  {i > 0 && (
                    <span
                      className="hidden sm:block w-1 h-1 rounded-full"
                      style={{ background: "rgba(0,255,255,0.4)" }}
                    />
                  )}
                  {text}
                </span>
              ))}
            </motion.div>

            {/* CTA Button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.7 }}
            >
              <Link href="/analyze">
                <button className="rounded-lg btn-cyan-filled gap-3 px-8 py-4 text-md font-medium font-semibold text-foreground transition-colors tracking-wide hover:bg-muted">
                  Start Code Analysis
                </button>
              </Link>
            </motion.div>
          </motion.div>

          {/* Stats Row */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.7 }}
            className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-20"
          >
            {stats.map(({ value, label }, i) => (
              <motion.div
                key={label}
                whileHover={{ y: -3 }}
                className="text-center p-4 rounded-xl"
                style={{
                  background: "rgba(0,255,255,0.03)",
                  border: "1px solid rgba(0,255,255,0.08)",
                }}
              >
                <p
                  className="text-3xl font-bold logo-text"
                  style={{
                    color: "#00FFFF",
                    textShadow: "0 0 15px rgba(0,255,255,0.6)",
                  }}
                >
                  {value}
                </p>
                <p className="text-white/40 text-xs mt-1 uppercase tracking-widest">
                  {label}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </section>

        {/* Feature Cards Section */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="text-center mb-10"
          >
            <h2 className="text-white text-3xl font-bold mb-2">
              Everything You Need to{" "}
              <span
                style={{
                  color: "#00FFFF",
                  textShadow: "0 0 15px rgba(0,255,255,0.6)",
                }}
              >
                Ship Faster
              </span>
            </h2>
            <p className="text-white/40 text-sm">
              Powered by advanced AI models trained on millions of codebases
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {featureCards.map((card) => (
              <FeatureCard key={card.title} {...card} />
            ))}
          </div>
        </section>

        {/* Quick Actions + Activity Panel */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 pb-20">

          {/* Activity Panel */}
          <div className="lg:col-span-2">
            <h3 className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-4">
              Recent Activity
            </h3>
            <ActivityPanel />
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-6 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span className="logo-text text-white/30 text-sm">
            Dev<span style={{ color: "rgba(0,255,255,0.5)" }}>Guardian</span>
          </span>
          <span className="text-white/20 text-xs">
            © 2026 DevGuardian. AI-Powered Code Intelligence.
          </span>
        </div>
      </footer>
    </div>
  );
}
