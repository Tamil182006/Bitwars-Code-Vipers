"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Mail, Lock, Eye, EyeOff, Loader2, AlertCircle, CheckSquare, Square } from "lucide-react";

function validateEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; general?: string }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const validate = () => {
    const newErrors: typeof errors = {};
    if (!email) newErrors.email = "Email is required";
    else if (!validateEmail(email)) newErrors.email = "Enter a valid email address";
    if (!password) newErrors.password = "Password is required";
    else if (password.length < 6) newErrors.password = "Password must be at least 6 characters";
    return newErrors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors = validate();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});
    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 1500));
    setIsLoading(false);
    setSuccess(true);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="w-full max-w-md relative"
    >
      {/* Card */}
      <div
        className="glass rounded-2xl p-8 relative overflow-hidden"
        style={{
          border: "1px solid rgba(0,255,255,0.25)",
          boxShadow: "0 0 60px rgba(0,255,255,0.08), 0 30px 60px rgba(0,0,0,0.6)",
        }}
      >
        {/* Corner accents */}
        <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-cyan-400/60 rounded-tr-2xl" />
        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-cyan-400/60 rounded-bl-2xl" />

        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
            style={{
              background: "rgba(0,255,255,0.08)",
              border: "1px solid rgba(0,255,255,0.25)",
              boxShadow: "0 0 20px rgba(0,255,255,0.2)",
            }}
          >
            <Lock
              size={28}
              style={{ color: "#00FFFF", filter: "drop-shadow(0 0 8px rgba(0,255,255,0.8))" }}
            />
          </motion.div>
          <h1
            className="text-3xl font-bold text-white mb-1 logo-text"
            style={{ letterSpacing: "0.05em" }}
          >
            Dev<span style={{ color: "#00FFFF", textShadow: "0 0 10px rgba(0,255,255,0.8)" }}>Guardian</span>
          </h1>
          <p className="text-white/50 text-sm">AI-Powered Code Intelligence Platform</p>
        </div>

        {/* General Error */}
        <AnimatePresence>
          {errors.general && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2 mb-4 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm"
            >
              <AlertCircle size={16} />
              {errors.general}
            </motion.div>
          )}
          {success && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 mb-4 px-4 py-3 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-sm"
            >
              Login successful! Redirecting...
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-sm font-medium text-white/80">
              Email
            </label>
            <div className="relative">
              <Mail
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30"
              />
              <input
                id="email"
                type="text"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
                }}
                placeholder="you@example.com"
                className={`w-full rounded-md border bg-black/40 py-2 pl-10 pr-4 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-1 transition-all ${
                  errors.email
                    ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                    : "border-cyan-500/20 focus:border-cyan-400/40 focus:ring-cyan-500/20"
                }`}
              />
            </div>
            <AnimatePresence>
              {errors.email && (
                <motion.p
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-red-400 text-xs flex items-center gap-1"
                >
                  <AlertCircle size={12} /> {errors.email}
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-sm font-medium text-white/80">
              Password
            </label>
            <div className="relative">
              <Lock
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30"
              />
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
                }}
                placeholder="Enter password"
                className={`w-full rounded-md border bg-black/40 py-2 pl-10 pr-10 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-1 transition-all ${
                  errors.password
                    ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                    : "border-cyan-500/20 focus:border-cyan-400/40 focus:ring-cyan-500/20"
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <AnimatePresence>
              {errors.password && (
                <motion.p
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-red-400 text-xs flex items-center gap-1"
                >
                  <AlertCircle size={12} /> {errors.password}
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          {/* Remember me */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setRememberMe(!rememberMe)}
              className="text-white/40 hover:text-[#00FFFF] transition-colors"
            >
              {rememberMe ? (
                <CheckSquare size={18} style={{ color: "#00FFFF" }} />
              ) : (
                <Square size={18} />
              )}
            </button>
            <span className="text-sm text-white/50">Remember me</span>
          </div>

          {/* Submit */}
          <motion.button
            type="submit"
            disabled={isLoading}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            className="btn-cyan-filled w-full py-3 rounded-xl font-semibold text-sm tracking-wider uppercase flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Authenticating...
              </>
            ) : (
              "Login"
            )}
          </motion.button>
        </form>

        {/* Footer */}
        <p className="text-center text-white/40 text-sm mt-6">
          Don&apos;t have an account?{" "}
          <Link
            href="/signup"
            className="text-[#00FFFF] hover:underline font-medium"
            style={{ textShadow: "0 0 8px rgba(0,255,255,0.5)" }}
          >
            Sign Up
          </Link>
        </p>
      </div>
    </motion.div>
  );
}
