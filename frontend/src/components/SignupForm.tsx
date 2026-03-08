"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, Lock, Eye, EyeOff, User, Loader2, AlertCircle, CheckCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

function validateEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

interface FormErrors {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  general?: string;
}

export default function SignupForm() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const { signup } = useAuth();
  const router = useRouter();

  const update = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const validate = (): FormErrors => {
    const e: FormErrors = {};
    if (!form.name.trim()) e.name = "Name is required";
    if (!form.email) e.email = "Email is required";
    else if (!validateEmail(form.email)) e.email = "Enter a valid email address";
    if (!form.password) e.password = "Password is required";
    else if (form.password.length < 8) e.password = "Password must be at least 8 characters";
    if (!form.confirmPassword) e.confirmPassword = "Please confirm your password";
    else if (form.password !== form.confirmPassword) e.confirmPassword = "Passwords do not match";
    return e;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setIsLoading(true);

    try {
      const success = await signup(form.name, form.email, form.password);
      if (success) {
        setSuccess(true);
        setTimeout(() => {
          router.push('/login');
        }, 1000);
      } else {
        setErrors({ general: "Registration failed. Email may already be in use." });
      }
    } catch (error) {
      setErrors({ general: "An error occurred. Please try again." });
    } finally {
      setIsLoading(false);
    }
  };

  const passwordStrength = () => {
    if (!form.password) return 0;
    let score = 0;
    if (form.password.length >= 8) score++;
    if (/[A-Z]/.test(form.password)) score++;
    if (/[0-9]/.test(form.password)) score++;
    if (/[^A-Za-z0-9]/.test(form.password)) score++;
    return score;
  };

  const strength = passwordStrength();
  const strengthColors = ["", "#ef4444", "#f97316", "#eab308", "#00FFFF"];
  const strengthLabels = ["", "Weak", "Fair", "Good", "Strong"];

  const fields = [
    {
      key: "name" as const,
      label: "Name",
      type: "text",
      placeholder: "John Doe",
      icon: User,
    },
    {
      key: "email" as const,
      label: "Email",
      type: "email",
      placeholder: "you@example.com",
      icon: Mail,
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="w-full max-w-md"
    >
      <div
        className="glass rounded-2xl p-8 relative overflow-hidden"
        style={{
          border: "1px solid rgba(0,255,255,0.25)",
          boxShadow: "0 0 60px rgba(0,255,255,0.08), 0 30px 60px rgba(0,0,0,0.6)",
        }}
      >
        <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-cyan-400/60 rounded-tr-2xl" />
        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-cyan-400/60 rounded-bl-2xl" />

        {/* Header */}
        <div className="text-center mb-7">
          <h1 className="text-2xl font-bold text-white mb-1 logo-text" style={{ letterSpacing: "0.04em" }}>
            Create Your{" "}
            <span style={{ color: "#00FFFF", textShadow: "0 0 10px rgba(0,255,255,0.8)" }}>
              DevGuardian
            </span>{" "}
            Account
          </h1>
          <p className="text-white/40 text-sm">Join the future of code intelligence</p>
        </div>

        <AnimatePresence>
          {success && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 mb-4 px-4 py-3 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-sm"
            >
              <CheckCircle size={16} />
              Account created! Redirecting to login...
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSubmit} className="space-y-4">
          {fields.map(({ key, label, type, placeholder, icon: Icon }) => (
            <div key={key} className="flex flex-col gap-1.5">
              <label htmlFor={key} className="text-sm font-medium text-white/80">
                {label}
              </label>
              <div className="relative">
                <Icon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                <input
                  id={key}
                  type={type}
                  value={form[key]}
                  onChange={(e) => update(key, e.target.value)}
                  placeholder={placeholder}
                  className={`w-full rounded-md border bg-black/40 py-2 pl-10 pr-4 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-1 transition-all ${errors[key]
                    ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                    : "border-cyan-500/20 focus:border-cyan-400/40 focus:ring-cyan-500/20"
                    }`}
                />
              </div>
              {key === "name" && !errors.name && (
                <p className="text-xs text-white/40">
                  Your username must be 3-20 characters long.
                </p>
              )}
              <AnimatePresence>
                {errors[key] && (
                  <motion.p
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="text-red-400 text-xs flex items-center gap-1"
                  >
                    <AlertCircle size={12} /> {errors[key]}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          ))}

          {/* Password */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-sm font-medium text-white/80">
              Password
            </label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={(e) => update("password", e.target.value)}
                placeholder="Enter password"
                className={`w-full rounded-md border bg-black/40 py-2 pl-10 pr-10 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-1 transition-all ${errors.password
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
            {/* Strength bar */}
            {form.password && (
              <div className="mt-1">
                <div className="flex gap-1">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="h-1 flex-1 rounded-full transition-all duration-300"
                      style={{
                        background: i <= strength ? strengthColors[strength] : "rgba(255,255,255,0.1)",
                      }}
                    />
                  ))}
                </div>
                <p className="text-xs mt-1" style={{ color: strengthColors[strength] }}>
                  {strengthLabels[strength]}
                </p>
              </div>
            )}
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

          {/* Confirm Password */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="confirmPassword" className="text-sm font-medium text-white/80">
              Confirm Password
            </label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
              <input
                id="confirmPassword"
                type={showConfirm ? "text" : "password"}
                value={form.confirmPassword}
                onChange={(e) => update("confirmPassword", e.target.value)}
                placeholder="Re-enter password"
                className={`w-full rounded-md border bg-black/40 py-2 pl-10 pr-10 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-1 transition-all ${errors.confirmPassword
                  ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                  : "border-cyan-500/20 focus:border-cyan-400/40 focus:ring-cyan-500/20"
                  }`}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
              >
                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <AnimatePresence>
              {errors.confirmPassword && (
                <motion.p
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-red-400 text-xs flex items-center gap-1"
                >
                  <AlertCircle size={12} /> {errors.confirmPassword}
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          <motion.button
            type="submit"
            disabled={isLoading}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            className="btn-cyan-filled w-full py-3 rounded-xl font-semibold text-sm tracking-wider uppercase flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
          >
            {isLoading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Creating Account...
              </>
            ) : (
              "Sign Up"
            )}
          </motion.button>
        </form>

        <p className="text-center text-white/40 text-sm mt-5">
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-[#00FFFF] hover:underline font-medium"
            style={{ textShadow: "0 0 8px rgba(0,255,255,0.5)" }}
          >
            Login
          </Link>
        </p>
      </div>
    </motion.div>
  );
}
