"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BrainCircuit, Sparkles } from "lucide-react";
import { Reveal, SectionHeading, EASE_OUT } from "@/lib/anim";
import { useStockStore, startTicker } from "@/lib/stocks";

type Insight = { sym: string; text: string; conf: number; tag: "Bullish" | "Bearish" | "Watch" };

const TEMPLATES: ((s: { sym: string; change: number }) => Insight)[] = [
  (s) => ({
    sym: s.sym,
    text: `${s.sym} is printing a bullish divergence — volume climbing while price cools. Accumulation likely underway.`,
    conf: 82 + Math.floor(Math.random() * 14),
    tag: "Bullish",
  }),
  (s) => ({
    sym: s.sym,
    text: `${s.sym} just swept a key liquidity zone. A short-term mean reversion toward VWAP is statistically favored.`,
    conf: 74 + Math.floor(Math.random() * 16),
    tag: "Watch",
  }),
  (s) => ({
    sym: s.sym,
    text: `Momentum decay detected in ${s.sym} — RSI rolling over from overbought. Trail your stops a notch tighter.`,
    conf: 69 + Math.floor(Math.random() * 18),
    tag: "Bearish",
  }),
];

function RadarSweep() {
  const stocks = useStockStore((s) => s.stocks);
  const [blips, setBlips] = React.useState<{ x: number; y: number; hue: string; id: number }[]>([]);

  React.useEffect(() => {
    let id = 0;
    const spawn = () => {
      const up = Math.random() > 0.35;
      setBlips((b) =>
        [...b, { x: 18 + Math.random() * 64, y: 18 + Math.random() * 64, hue: up ? "var(--up)" : "var(--down)", id: id++ }].slice(-5)
      );
    };
    const iv = setInterval(spawn, 1100);
    return () => clearInterval(iv);
  }, []);

  const topMover = React.useMemo(
    () => [...stocks].sort((a, b) => Math.abs(b.change) - Math.abs(a.change))[0],
    [stocks]
  );

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[420px]">
      {/* rings */}
      {[100, 76, 52, 28].map((s, i) => (
        <motion.div
          key={s}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[var(--border)]"
          style={{ width: `${s}%`, height: `${s}%` }}
          animate={{ scale: [1, 1.02, 1], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 3, repeat: Infinity, delay: i * 0.4 }}
        />
      ))}
      {/* cross hairs */}
      <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-[var(--border)]" />
      <div className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-[var(--border)]" />
      {/* sweep */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: "conic-gradient(from 0deg, transparent 0deg, color-mix(in srgb, var(--sky) 30%, transparent) 55deg, transparent 70deg)",
          animation: "radar-sweep 3.4s linear infinite",
        }}
      />
      {/* blips */}
      <AnimatePresence>
        {blips.map((b) => (
          <motion.span
            key={b.id}
            className="absolute"
            style={{ left: `${b.x}%`, top: `${b.y}%` }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="relative block h-2.5 w-2.5">
              <span className="absolute inset-0 rounded-full" style={{ background: b.hue }} />
              <span className="absolute inset-0 rounded-full border" style={{ borderColor: b.hue, animation: "ping-soft 1.5s ease-out infinite" }} />
            </span>
          </motion.span>
        ))}
      </AnimatePresence>
      {/* core */}
      <motion.div
        className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-gradient-to-br from-[var(--sunrise)] to-[var(--rose)] text-white shadow-[0_10px_36px_-8px] shadow-[color-mix(in_srgb,var(--rose)_70%,transparent)]"
        animate={{ scale: [1, 1.08, 1] }}
        transition={{ duration: 2.2, repeat: Infinity }}
      >
        <BrainCircuit className="h-7 w-7" />
      </motion.div>
      {/* top mover chip */}
      <motion.div
        className="glass absolute -bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full px-4 py-2 shadow-soft"
        key={topMover?.sym}
        initial={{ y: 12, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        <Sparkles className="h-3.5 w-3.5 text-[var(--sunrise)]" />
        <span className="font-grotesk text-xs font-bold">Top mover: {topMover?.sym} {topMover && (topMover.change >= 0 ? "+" : "")}{topMover?.change.toFixed(2)}%</span>
      </motion.div>
    </div>
  );
}

function InsightCard({ insight }: { insight: Insight }) {
  const color = insight.tag === "Bullish" ? "var(--up)" : insight.tag === "Bearish" ? "var(--down)" : "var(--sky)";
  return (
    <motion.div
      key={insight.text}
      initial={{ opacity: 0, x: 60, rotateY: -12, filter: "blur(8px)" }}
      animate={{ opacity: 1, x: 0, rotateY: 0, filter: "blur(0px)" }}
      exit={{ opacity: 0, x: -60, rotateY: 12, filter: "blur(8px)" }}
      transition={{ duration: 0.65, ease: EASE_OUT }}
      className="glass rounded-3xl p-6 shadow-soft sm:p-7"
      data-cursor-label="AI"
    >
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 rounded-full px-3 py-1 font-grotesk text-[11px] font-bold uppercase tracking-[0.16em]" style={{ background: `color-mix(in srgb, ${color} 15%, transparent)`, color }}>
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: color, animation: "pulse-dot 1.4s ease infinite" }} />
          {insight.tag} · {insight.sym}
        </span>
        <span className="font-grotesk text-[11px] font-semibold text-muted-foreground">just now</span>
      </div>
      <p className="mt-4 text-pretty text-base leading-relaxed sm:text-lg">{insight.text}</p>
      <div className="mt-5">
        <div className="mb-1.5 flex justify-between font-grotesk text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
          <span>AI confidence</span>
          <motion.span style={{ color }}>{insight.conf}%</motion.span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-[var(--muted)]">
          <motion.div
            className="h-full rounded-full"
            style={{ background: `linear-gradient(90deg, ${color}, var(--rose))` }}
            initial={{ width: 0 }}
            animate={{ width: `${insight.conf}%` }}
            transition={{ duration: 1.1, ease: EASE_OUT, delay: 0.2 }}
          />
        </div>
      </div>
    </motion.div>
  );
}

export default function InsightsRadar() {
  const stocks = useStockStore((s) => s.stocks);
  React.useEffect(() => startTicker(), []);

  const [idx, setIdx] = React.useState(0);
  const [insight, setInsight] = React.useState<Insight | null>(null);

  const genInsight = React.useCallback(() => {
    const s = stocks[Math.floor(Math.random() * stocks.length)];
    setInsight(TEMPLATES[Math.floor(Math.random() * TEMPLATES.length)]({ sym: s.sym, change: s.change }));
  }, [stocks]);

  React.useEffect(() => {
    genInsight();
    const iv = setInterval(() => setIdx((i) => i + 1), 4200);
    return () => clearInterval(iv);
  }, [genInsight]);

  React.useEffect(() => {
    if (idx > 0) genInsight();
  }, [idx, genInsight]);

  return (
    <section id="radar" className="relative scroll-mt-24 overflow-hidden py-20 sm:py-28">
      <div aria-hidden className="orb left-[4%] top-[30%] h-80 w-80 bg-[var(--minty)] opacity-50" />
      <div className="mx-auto grid max-w-7xl items-center gap-14 px-5 sm:px-8 lg:grid-cols-2 lg:gap-10">
        <div>
          <Reveal>
            <span className="chip-label glass bg-minty/70 text-[#155c3f] dark:bg-minty/15 dark:text-minty">
              <span className="h-1.5 w-1.5 rounded-full bg-current" style={{ animation: "pulse-dot 1.6s ease infinite" }} />
              Live AI radar
            </span>
          </Reveal>
          <Reveal delay={1}>
            <h2 className="mt-5 text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
              Signals speak.
              <br />
              <span className="text-gradient">We translate.</span>
            </h2>
          </Reveal>
          <Reveal delay={2}>
            <p className="mt-5 max-w-md text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
              Our radar sweeps every candle, whisper and volume wave in real time — then hands you
              the insight in plain, calm language. No jargon storms. Just clarity.
            </p>
          </Reveal>
          <Reveal delay={3} className="mt-8">
            <div className="min-h-[240px] sm:min-h-[260px]">{insight && <InsightCard insight={insight} />}</div>
          </Reveal>
        </div>

        <Reveal delay={2} className="order-first lg:order-none">
          <RadarSweep />
        </Reveal>
      </div>
    </section>
  );
}
