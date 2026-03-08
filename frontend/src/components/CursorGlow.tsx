"use client";

import { useEffect, useRef } from "react";

export default function CursorGlow() {
  const glowRef = useRef<HTMLDivElement>(null);
  const posRef = useRef({ x: -200, y: -200 });
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const glow = glowRef.current;
    if (!glow) return;

    const handleMouseMove = (e: MouseEvent) => {
      posRef.current = { x: e.clientX, y: e.clientY };
    };

    const smoothFollow = () => {
      if (!glow) return;
      const { x, y } = posRef.current;
      glow.style.transform = `translate(${x - 200}px, ${y - 200}px)`;
      rafRef.current = requestAnimationFrame(smoothFollow);
    };

    rafRef.current = requestAnimationFrame(smoothFollow);
    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div
      ref={glowRef}
      className="fixed pointer-events-none z-10 w-[400px] h-[400px] rounded-full"
      style={{
        background:
          "radial-gradient(circle, rgba(0,255,255,0.08) 0%, rgba(0,255,255,0.03) 40%, transparent 70%)",
        willChange: "transform",
        transition: "transform 0.05s linear",
      }}
    />
  );
}
