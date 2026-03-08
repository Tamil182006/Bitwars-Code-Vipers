"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  Home,
  GitBranch,
  AlertTriangle,
  Shield,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";

const navLinks = [
  { href: "/", label: "Home", icon: Home },
  { href: "/analyze", label: "Analyze Repository", icon: GitBranch },
  { href: "/errors", label: "Error Insights", icon: AlertTriangle },
];

export default function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (pathname === "/login" || pathname === "/signup") {
    return null;
  }

  return (
    <nav className="navbar-glass fixed top-0 left-0 right-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="relative">
              <Shield
                size={26}
                className="text-cyan-400 group-hover:text-[#00FFFF] transition-colors"
                style={{ filter: "drop-shadow(0 0 8px rgba(0,255,255,0.7))" }}
              />
            </div>
            <span
              className="logo-text text-lg font-bold text-white group-hover:neon-text transition-all"
              style={{ letterSpacing: "0.08em" }}
            >
              Dev<span className="text-[#00FFFF]" style={{ textShadow: "0 0 10px rgba(0,255,255,0.8)" }}>Guardian</span>
            </span>
          </Link>

          {/* Desktop Nav - Monolab Pill Style */}
          <div className="hidden md:flex items-center gap-4">
            <div className="inline-flex rounded-full border border-cyan-500/20 bg-black/40 backdrop-blur-md p-1">
              {navLinks.map(({ href, label, icon: Icon }) => {
                const isActive = pathname === href;
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-sm transition-all duration-300 relative ${
                      isActive
                        ? "bg-[#00FFFF]/10 font-medium text-[#00FFFF]"
                        : "text-white/60 hover:text-white"
                    }`}
                  >
                    <Icon size={16} />
                    <span>{label}</span>
                    {isActive && (
                      <motion.div
                        layoutId="nav-pill"
                        className="absolute inset-0 rounded-full"
                        style={{
                          border: "1px solid rgba(0,255,255,0.4)",
                          boxShadow: "0 0 15px rgba(0,255,255,0.1)",
                        }}
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                      />
                    )}
                  </Link>
                );
              })}
            </div>

            <Link
              href="/login"
              className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium text-white/50 hover:text-red-400 hover:bg-red-400/10 border border-transparent hover:border-red-400/20 transition-all duration-300 group"
            >
              <LogOut size={16} className="group-hover:translate-x-0.5 transition-transform" />
              <span>Logout</span>
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden text-white/70 hover:text-[#00FFFF] transition-colors p-2"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <motion.div
        initial={false}
        animate={{ height: mobileOpen ? "auto" : 0, opacity: mobileOpen ? 1 : 0 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="md:hidden overflow-hidden border-t border-cyan-500/10"
      >
        <div className="flex flex-col gap-1 px-4 py-3">
          {navLinks.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? "text-[#00FFFF] bg-cyan-500/10 border border-cyan-500/20"
                    : "text-white/70 hover:text-[#00FFFF] hover:bg-cyan-500/5"
                }`}
              >
                <Icon size={16} />
                {label}
              </Link>
            );
          })}
          <Link
            href="/login"
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-white/50 hover:text-red-400 transition-all"
          >
            <LogOut size={16} />
            Logout
          </Link>
        </div>
      </motion.div>
    </nav>
  );
}
