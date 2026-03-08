"use client";

import AnimatedBackground from "@/components/AnimatedBackground";
import LoginForm from "@/components/LoginForm";
import Link from "next/link";
import { Home } from "lucide-react";
import { motion } from "framer-motion";

export default function LoginPage() {
  return (
    <main className="relative min-h-screen flex items-center justify-center p-4">
      <AnimatedBackground />
      <div className="absolute top-6 left-6 z-30">
        <Link href="/">
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center justify-center w-10 h-10 rounded-full bg-black/40 border border-cyan-500/20 backdrop-blur-sm text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 transition-colors"
          >
            <Home size={20} />
          </motion.div>
        </Link>
      </div>
      <div className="relative z-20">
        <LoginForm />
      </div>
    </main>
  );
}
