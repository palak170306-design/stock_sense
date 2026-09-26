"use client";

import * as React from "react";
import { motion, useMotionValue, useSpring, useScroll } from "framer-motion";

/**
 * Custom cinematic cursor:
 *  - pastel glowing dot (instant) + trailing ring (spring lag)
 *  - grows over interactive elements, shows contextual label
 *  - soft particle trail dots
 *  - disabled on touch devices
 */
export default function CustomCursor() {
  const [enabled, setEnabled] = React.useState(false);
  const [label, setLabel] = React.useState<string | null>(null);
  const [hovering, setHovering] = React.useState(false);
  const [pressed, setPressed] = React.useState(false);
  const [trail, setTrail] = React.useState<{ id: number; x: number; y: number; hue: string }[]>([]);
  const trailId = React.useRef(0);

  const mx = useMotionValue(-100);
  const my = useMotionValue(-100);
  const rx = useSpring(mx, { stiffness: 350, damping: 28, mass: 0.6 });
  const ry = useSpring(my, { stiffness: 350, damping: 28, mass: 0.6 });

  React.useEffect(() => {
    const fine = window.matchMedia("(pointer: fine)").matches;
    if (!fine) return;
    setEnabled(true);
    document.documentElement.classList.add("cursor-none-desktop");

    const HUES = ["#ff8a3d", "#ff6fa5", "#38b6ff", "#2fd08c", "#ffd166"];
    let lastTrail = 0;

    const onMove = (e: PointerEvent) => {
      mx.set(e.clientX);
      my.set(e.clientY);

      const now = performance.now();
      if (now - lastTrail > 55) {
        lastTrail = now;
        const id = trailId.current++;
        setTrail((t) => [
          ...t.slice(-14),
          { id, x: e.clientX, y: e.clientY, hue: HUES[id % HUES.length] },
        ]);
        setTimeout(() => setTrail((t) => t.filter((p) => p.id !== id)), 650);
      }

      const el = (e.target as HTMLElement)?.closest("a, button, [data-cursor]");
      setHovering(!!el);
      setLabel(el?.getAttribute("data-cursor-label") ?? null);
    };
    const onDown = () => setPressed(true);
    const onUp = () => setPressed(false);

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    return () => {
      document.documentElement.classList.remove("cursor-none-desktop");
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
    };
  }, [mx, my]);

  if (!enabled) return null;

  return (
    <>
      {/* trail particles */}
      {trail.map((p) => (
        <div
          key={p.id}
          className="pointer-events-none fixed z-[95] h-1.5 w-1.5 rounded-full"
          style={{
            left: p.x - 3,
            top: p.y - 3,
            background: p.hue,
            boxShadow: `0 0 10px 2px ${p.hue}66`,
            animation: "cursor-fade 0.65s ease forwards",
          }}
        />
      ))}
      <style>{`@keyframes cursor-fade { to { opacity: 0; transform: scale(0.2) translateY(8px); } }`}</style>

      {/* trailing ring */}
      <motion.div
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 z-[96] rounded-full border-2"
        style={{
          x: rx,
          y: ry,
          translateX: "-50%",
          translateY: "-50%",
          borderColor: hovering ? "var(--rose)" : "color-mix(in srgb, var(--sunrise) 70%, transparent)",
          mixBlendMode: "multiply",
        }}
        animate={{
          width: label ? 64 : hovering ? 52 : 34,
          height: label ? 64 : hovering ? 52 : 34,
          scale: pressed ? 0.8 : 1,
          opacity: 0.85,
        }}
        transition={{ type: "spring", stiffness: 320, damping: 22 }}
      >
        {label && (
          <span className="flex h-full w-full items-center justify-center text-center font-grotesk text-[9px] font-bold uppercase tracking-[0.18em] text-[#8a2c53] dark:text-[var(--pinkish)]">
            {label}
          </span>
        )}
      </motion.div>

      {/* core dot */}
      <motion.div
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 z-[97] h-2 w-2 rounded-full"
        style={{
          x: mx,
          y: my,
          translateX: "-50%",
          translateY: "-50%",
          background: "linear-gradient(135deg, var(--sunrise), var(--rose))",
          boxShadow: "0 0 14px 3px color-mix(in srgb, var(--rose) 45%, transparent)",
        }}
        animate={{ scale: pressed ? 2.1 : hovering ? 0.5 : 1 }}
        transition={{ type: "spring", stiffness: 500, damping: 26 }}
      />
    </>
  );
}

/** Top gradient scroll-progress hairline */
export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 26, mass: 0.4 });
  return (
    <motion.div
      aria-hidden
      className="fixed inset-x-0 top-0 z-[80] h-[3px] origin-left bg-gradient-to-r from-[var(--sunrise)] via-[var(--rose)] to-[var(--sky)]"
      style={{ scaleX }}
    />
  );
}
