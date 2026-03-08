"use client";

import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";

interface FeatureCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  delay?: number;
  accentColor?: string;
}

export default function FeatureCard({
  title,
  description,
  icon: Icon,
  delay = 0,
  accentColor = "#00FFFF",
}: FeatureCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay, ease: "easeOut" }}
      whileHover={{ y: -6, scale: 1.01 }}
      className="card-glow rounded-2xl p-6 relative group cursor-pointer"
    >
      {/* Corner decorations */}
      <div
        className="absolute top-0 right-0 w-5 h-5 rounded-tr-2xl"
        style={{
          borderTop: `2px solid ${accentColor}`,
          borderRight: `2px solid ${accentColor}`,
          opacity: 0.7,
        }}
      />
      <div
        className="absolute bottom-0 left-0 w-5 h-5 rounded-bl-2xl"
        style={{
          borderBottom: `2px solid ${accentColor}`,
          borderLeft: `2px solid ${accentColor}`,
          opacity: 0.7,
        }}
      />

      {/* Background sweep on hover */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at top left, rgba(0,255,255,0.06) 0%, transparent 70%)`,
        }}
      />

      {/* Icon */}
      <motion.div
        className="mb-5 inline-flex items-center justify-center w-14 h-14 rounded-xl relative"
        style={{
          background: `rgba(0, 255, 255, 0.08)`,
          border: `1px solid rgba(0, 255, 255, 0.2)`,
        }}
        whileHover={{ rotate: [0, -5, 5, 0], scale: 1.05 }}
        transition={{ duration: 0.4 }}
      >
        <Icon
          size={26}
          style={{
            color: accentColor,
            filter: `drop-shadow(0 0 8px ${accentColor}80)`,
          }}
        />
      </motion.div>

      {/* Title */}
      <h3
        className="text-white text-xl font-semibold mb-3 group-hover:text-[#00FFFF] transition-colors duration-300"
        style={{ letterSpacing: "0.02em" }}
      >
        {title}
      </h3>

      {/* Description */}
      <p className="text-white/55 text-sm leading-relaxed">{description}</p>

      {/* Bottom accent line */}
      <div
        className="absolute bottom-0 left-0 h-[2px] w-0 group-hover:w-full transition-all duration-500"
        style={{
          background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)`,
        }}
      />
    </motion.div>
  );
}
