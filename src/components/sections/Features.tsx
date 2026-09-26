"use client";

import { motion } from "framer-motion";
import { BellRing, BrainCircuit, LayoutGrid, Radar, ShieldCheck, Wallet } from "lucide-react";
import { Reveal, SectionHeading, Tilt } from "@/lib/anim";

function MiniRadar({ color }: { color: string }) {
  return (
    <div className="relative h-16 w-16 overflow-hidden rounded-full border border-[var(--border)]">
      <div className="absolute inset-2 rounded-full border border-[var(--border)]" />
      <div className="absolute inset-4 rounded-full border border-[var(--border)]" />
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: `conic-gradient(from 0deg, transparent 0deg, ${color}55 40deg, transparent 60deg)`,
          animation: "radar-sweep 2.6s linear infinite",
        }}
      />
      <span className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ background: color }} />
      <span className="absolute left-[62%] top-[30%] h-1 w-1 rounded-full" style={{ background: color, animation: "ping-soft 1.6s ease-out infinite" }} />
    </div>
  );
}

function MiniChart({ color }: { color: string }) {
  return (
    <svg width="72" height="44" viewBox="0 0 72 44" aria-hidden>
      <motion.path
        d="M2,36 L12,28 L22,32 L32,18 L42,24 L52,10 L70,4"
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        pathLength={1}
        initial={{ strokeDasharray: 1, strokeDashoffset: 1 }}
        whileInView={{ strokeDashoffset: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 1.8, ease: "easeOut" }}
      />
      <motion.circle
        cx="70" cy="4" r="3" fill={color}
        initial={{ scale: 0 }} whileInView={{ scale: 1 }} viewport={{ once: true }}
        transition={{ delay: 1.7, type: "spring", stiffness: 300 }}
      />
    </svg>
  );
}

function MiniGrid({ color }: { color: string }) {
  return (
    <div className="grid h-11 w-16 grid-cols-4 gap-1" aria-hidden>
      {Array.from({ length: 8 }).map((_, i) => (
        <motion.span
          key={i}
          className="rounded-[4px]"
          style={{ background: color, opacity: 0.25 + (i % 4) * 0.18 }}
          animate={{ opacity: [0.25 + (i % 4) * 0.18, 0.85, 0.25 + (i % 4) * 0.18] }}
          transition={{ duration: 2.2, repeat: Infinity, delay: i * 0.24 }}
        />
      ))}
    </div>
  );
}

const FEATURES = [
  {
    icon: Radar,
    title: "AI Signal Radar",
    desc: "A 360° sweep across 120+ markets every second — our radar surfaces breakout setups before the crowd even notices the move.",
    color: "var(--sunrise)",
    visual: "radar",
    blob: "from-[#ffe0c2] to-[#ffd0e0]",
  },
  {
    icon: BrainCircuit,
    title: "Predictive Pulse",
    desc: "Deep-learning models trained on 14 years of tick data forecast volatility windows with a calm, honest confidence score.",
    color: "var(--rose)",
    visual: "chart",
    blob: "from-[#ffd0e0] to-[#e2d6ff]",
  },
  {
    icon: LayoutGrid,
    title: "Sector Heatmap",
    desc: "The whole market on one breathing canvas. Spot rotation the moment money moves from one sector into another.",
    color: "var(--sky)",
    visual: "grid",
    blob: "from-[#c9e8ff] to-[#d0f5e4]",
  },
  {
    icon: BellRing,
    title: "Whisper Alerts",
    desc: "No noise, no spam. Alerts arrive like a soft tap on the shoulder — only when price, volume and sentiment align.",
    color: "var(--lemon)",
    visual: "bell",
    blob: "from-[#ffedb0] to-[#ffe0c2]",
  },
  {
    icon: ShieldCheck,
    title: "Risk Guard",
    desc: "An invisible seatbelt for every trade. Position sizing, drawdown shields and auto-cooling when markets overheat.",
    color: "var(--up)",
    visual: "shield",
    blob: "from-[#c9f2dd] to-[#d8f0ff]",
  },
  {
    icon: Wallet,
    title: "One-tap Portfolios",
    desc: "Theme-based baskets curated by AI and rebalanced quietly while you sleep. Investing that feels almost effortless.",
    color: "var(--minty)",
    visual: "donut",
    blob: "from-[#d0f5e4] to-[#c9e8ff]",
  },
];

function FeatureVisual({ kind, color }: { kind: string; color: string }) {
  if (kind === "radar") return <MiniRadar color={color} />;
  if (kind === "chart") return <MiniChart color={color} />;
  if (kind === "grid") return <MiniGrid color={color} />;
  if (kind === "bell")
    return (
      <motion.div animate={{ rotate: [0, -14, 12, -6, 0] }} transition={{ duration: 1.4, repeat: Infinity, repeatDelay: 2.2 }}>
        <BellRing className="h-10 w-10" style={{ color }} />
      </motion.div>
    );
  if (kind === "shield")
    return (
      <motion.div animate={{ scale: [1, 1.14, 1] }} transition={{ duration: 2.4, repeat: Infinity }}>
        <ShieldCheck className="h-10 w-10" style={{ color }} />
      </motion.div>
    );
  return (
    <div className="relative h-11 w-11" aria-hidden>
      <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
        <circle cx="18" cy="18" r="15" fill="none" stroke="color-mix(in srgb, currentColor 15%, transparent)" strokeWidth="5" className="text-[var(--foreground)]" />
        <motion.circle
          cx="18" cy="18" r="15" fill="none" stroke={color} strokeWidth="5" strokeLinecap="round"
          strokeDasharray="94" initial={{ strokeDashoffset: 94 }} whileInView={{ strokeDashoffset: 26 }}
          viewport={{ once: true }} transition={{ duration: 1.6, ease: "easeOut" }}
        />
      </svg>
    </div>
  );
}

export default function Features() {
  return (
    <section id="features" className="relative mx-auto max-w-7xl scroll-mt-24 px-5 py-20 sm:px-8 sm:py-28">
      <div aria-hidden className="orb right-[12%] top-[6%] h-72 w-72 bg-[var(--skyish)] opacity-50" />
      <SectionHeading
        chip="Your unfair advantage"
        chipColor="sky"
        title="Features that feel like a"
        accent="sixth sense"
        sub="Every tool is designed to feel less like a trading terminal and more like intuition — calm, quiet and always one move ahead."
      />

      <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3" style={{ perspective: 1200 }}>
        {FEATURES.map((f, i) => (
          <Reveal key={f.title} delay={i % 3}>
            <Tilt className="group h-full" max={9}>
              <article
                className="glow-card glass relative flex h-full flex-col gap-4 rounded-3xl p-6 shadow-soft hover:shadow-[0_30px_70px_-24px_rgba(255,111,165,0.35)] sm:p-7"
                data-cursor-label="Explore"
              >
                <div className="flex items-start justify-between">
                  <motion.span
                    className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${f.blob}`}
                    whileHover={{ rotate: -8, scale: 1.1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 12 }}
                  >
                    <f.icon className="h-6 w-6" style={{ color: f.color === "var(--minty)" ? "var(--up)" : f.color }} strokeWidth={2.2} />
                  </motion.span>
                  <div className="pt-1 transition-transform duration-500 group-hover:-translate-y-1 group-hover:translate-x-1">
                    <FeatureVisual kind={f.visual} color={f.color === "var(--minty)" ? "var(--up)" : f.color} />
                  </div>
                </div>
                <h3 className="text-xl font-bold tracking-tight">{f.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
                <span className="mt-auto inline-flex items-center gap-1.5 pt-2 font-grotesk text-xs font-bold uppercase tracking-[0.18em] text-foreground/45 transition-colors group-hover:text-foreground">
                  Learn more
                  <motion.span aria-hidden className="inline-block" whileHover={{ x: 4 }}>
                    →
                  </motion.span>
                </span>
              </article>
            </Tilt>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
