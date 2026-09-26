"use client";

import * as React from "react";
import {
  motion,
  useInView,
  useMotionValue,
  useSpring,
  useTransform,
  type Variants,
} from "framer-motion";

/* ================= shared easing ================= */
export const EASE_OUT = [0.22, 1, 0.36, 1] as const;
export const EASE_EXPO = [0.87, 0, 0.13, 1] as const;

/* ================= Magnetic wrapper =================
   Element gravitates toward the cursor inside its padding
   radius, then springs back. */
export function Magnetic({
  children,
  strength = 0.35,
  className,
}: {
  children: React.ReactNode;
  strength?: number;
  className?: string;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 180, damping: 14, mass: 0.4 });
  const sy = useSpring(y, { stiffness: 180, damping: 14, mass: 0.4 });

  const onMove = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    x.set((e.clientX - (r.left + r.width / 2)) * strength);
    y.set((e.clientY - (r.top + r.height / 2)) * strength);
  };
  const onLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      ref={ref}
      className={`magnetic inline-block ${className ?? ""}`}
      style={{ x: sx, y: sy }}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
    >
      {children}
    </motion.div>
  );
}

/* ================= 3D Tilt card =================
   Mouse-tracked rotateX/rotateY + moving glare. */
export function Tilt({
  children,
  className,
  max = 10,
  glare = true,
}: {
  children: React.ReactNode;
  className?: string;
  max?: number;
  glare?: boolean;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const rx = useSpring(0, { stiffness: 220, damping: 18 });
  const ry = useSpring(0, { stiffness: 220, damping: 18 });
  const gx = useMotionValue(50);
  const gy = useMotionValue(50);
  const glareBg = useTransform(
    [gx, gy],
    ([px, py]) =>
      `radial-gradient(circle at ${px}% ${py}%, rgba(255,255,255,0.35), transparent 55%)`
  );

  const onMove = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    ry.set((px - 0.5) * max * 2);
    rx.set(-(py - 0.5) * max * 2);
    gx.set(px * 100);
    gy.set(py * 100);
  };
  const onLeave = () => {
    rx.set(0);
    ry.set(0);
  };

  return (
    <motion.div
      ref={ref}
      className={`relative [transform-style:preserve-3d] ${className ?? ""}`}
      style={{ rotateX: rx, rotateY: ry, perspective: 900 }}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
    >
      {children}
      {glare && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{ background: glareBg }}
        />
      )}
    </motion.div>
  );
}

/* ================= Reveal on scroll ================= */
export const revealVariants: Variants = {
  hidden: { opacity: 0, y: 46, filter: "blur(10px)" },
  show: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.9, ease: EASE_OUT, delay: i * 0.09 },
  }),
};

export function Reveal({
  children,
  className,
  delay = 0,
  once = true,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  once?: boolean;
}) {
  return (
    <motion.div
      className={className}
      variants={revealVariants}
      custom={delay}
      initial="hidden"
      whileInView="show"
      viewport={{ once, margin: "-80px" }}
    >
      {children}
    </motion.div>
  );
}

/* ================= Split-letter headline ================= */
export function SplitLetters({
  text,
  className,
  letterClassName,
  delay = 0,
  stagger = 0.035,
  play,
  gradient = false,
}: {
  text: string;
  className?: string;
  letterClassName?: string;
  delay?: number;
  stagger?: number;
  /** when provided: controlled mode (true = reveal). when omitted: reveal on scroll into view */
  play?: boolean;
  /** paint a continuous gradient across letters (per-letter clip — survives transforms) */
  gradient?: boolean;
}) {
  const letters = React.useMemo(() => Array.from(text), [text]);
  const controlled = play !== undefined;
  const n = Math.max(letters.length - 1, 1);
  return (
    <span className={`inline-block ${className ?? ""}`} aria-label={text} role="text">
      {letters.map((ch, i) => (
        <motion.span
          key={i}
          aria-hidden
          className={`inline-block will-change-transform ${letterClassName ?? ""}`}
          initial={{ opacity: 0, y: "0.9em", rotateX: -80, filter: "blur(6px)" }}
          {...(controlled
            ? { animate: play ? { opacity: 1, y: 0, rotateX: 0, filter: "blur(0px)" } : {} }
            : {
                whileInView: { opacity: 1, y: 0, rotateX: 0, filter: "blur(0px)" },
                viewport: { once: true, margin: "-60px" },
              })}
          transition={{
            duration: 0.8,
            ease: EASE_OUT,
            delay: controlled && play ? delay + i * stagger : i * stagger,
          }}
          style={{
            transformOrigin: "50% 100%",
            ...(gradient && ch !== " "
              ? {
                  backgroundImage:
                    "linear-gradient(100deg, #FF8A3D 0%, #FF6FA5 38%, #38B6FF 72%, #2FD08C 100%)",
                  backgroundSize: `${letters.length * 110}% 100%`,
                  backgroundPosition: `${(i / n) * 100}% 0`,
                  WebkitBackgroundClip: "text" as const,
                  backgroundClip: "text" as const,
                  color: "transparent",
                }
              : {}),
          }}
        >
          {ch === " " ? "\u00A0" : ch}
        </motion.span>
      ))}
    </span>
  );
}

/* ================= Count-up number ================= */
export function CountUp({
  to,
  suffix = "",
  prefix = "",
  decimals = 0,
  duration = 1.8,
  className,
}: {
  to: number;
  suffix?: string;
  prefix?: string;
  decimals?: number;
  duration?: number;
  className?: string;
}) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const [val, setVal] = React.useState(0);

  React.useEffect(() => {
    if (!inView) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / (duration * 1000), 1);
      const eased = 1 - Math.pow(1 - p, 4);
      setVal(to * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, to, duration]);

  return (
    <span ref={ref} className={className}>
      {prefix}
      {val.toFixed(decimals)}
      {suffix}
    </span>
  );
}

/* ================= Section heading kit ================= */
export function SectionHeading({
  chip,
  chipColor = "rose",
  title,
  accent,
  after,
  sub,
}: {
  chip: string;
  chipColor?: "rose" | "sky" | "lemon" | "mint";
  title: string;
  accent?: string;
  after?: string;
  sub?: string;
}) {
  const chipStyles: Record<string, string> = {
    rose: "bg-pinkish/60 text-[#8a2c53] dark:bg-pinkish/15 dark:text-pinkish",
    sky: "bg-skyish/60 text-[#1b4e72] dark:bg-skyish/15 dark:text-skyish",
    lemon: "bg-lemon/70 text-[#7a5410] dark:bg-lemon/15 dark:text-lemon",
    mint: "bg-minty/70 text-[#155c3f] dark:bg-minty/15 dark:text-minty",
  };
  return (
    <div className="mx-auto max-w-3xl text-center">
      <Reveal>
        <span className={`chip-label glass ${chipStyles[chipColor]}`}>
          <span className="h-1.5 w-1.5 rounded-full bg-current" style={{ animation: "pulse-dot 1.6s ease infinite" }} />
          {chip}
        </span>
      </Reveal>
      <Reveal delay={1}>
        <h2 className="mt-5 text-balance text-4xl font-extrabold leading-[1.06] tracking-tight sm:text-5xl lg:text-6xl">
          {title} {accent && <span className="text-gradient">{accent}</span>} {after}
        </h2>
      </Reveal>
      {sub && (
        <Reveal delay={2}>
          <p className="mx-auto mt-5 max-w-xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
            {sub}
          </p>
        </Reveal>
      )}
    </div>
  );
}
