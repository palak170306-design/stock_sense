"use client";

import * as React from "react";
import { motion, useAnimationFrame, useScroll, useSpring, useTransform, useVelocity } from "framer-motion";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { useStockStore, fmtPrice, startTicker } from "@/lib/stocks";

function TapeItem({ sym }: { sym: string }) {
  const stock = useStockStore((s) => s.stocks.find((x) => x.sym === sym));
  const flash = useStockStore((s) => s.flash[sym]);
  if (!stock) return null;
  const up = stock.change >= 0;
  return (
    <div className="mx-5 flex items-center gap-2.5" data-cursor-label="Live">
      <span className="font-grotesk text-sm font-bold tracking-wide">{stock.sym}</span>
      <span
        className={`font-grotesk text-sm font-semibold tabular-nums transition-colors ${
          flash === "up" ? "text-[var(--up)]" : flash === "down" ? "text-[var(--down)]" : "text-foreground/75"
        }`}
      >
        ₹{fmtPrice(stock.price)}
      </span>
      <span
        className={`flex items-center gap-0.5 rounded-full px-2 py-0.5 font-grotesk text-[11px] font-bold ${
          up ? "bg-[color-mix(in_srgb,var(--up)_16%,transparent)] text-[var(--up)]" : "bg-[color-mix(in_srgb,var(--down)_16%,transparent)] text-[var(--down)]"
        }`}
      >
        {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
        {Math.abs(stock.change).toFixed(2)}%
      </span>
      <span className="ml-3 h-1 w-1 rounded-full bg-foreground/15" />
    </div>
  );
}

function Tape({ syms, dir }: { syms: string[]; dir: 1 | -1 }) {
  const baseX = React.useRef(0);
  const ref = React.useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll();
  const scrollVelocity = useVelocity(scrollY);
  const smoothV = useSpring(scrollVelocity, { stiffness: 90, damping: 40 });
  const velocityFactor = useTransform(smoothV, (v) => Math.min(Math.max(v / 900, -3), 3));

  useAnimationFrame((_, delta) => {
    // always accumulate forward; direction emerges from the offset formula
    let move = delta / 0.055;
    const vf = Math.min(Math.abs(velocityFactor.get()), 3);
    move += move * vf; // scrolling speeds the tape up
    baseX.current += move;
    const x = ((baseX.current % 50) + 50) % 50; // wrap into [0, 50)
    const offset = dir === 1 ? -x : x - 50; // left-flowing or right-flowing, both seamless
    if (ref.current) {
      ref.current.style.transform = `translateX(${offset}%)`;
    }
  });

  const doubled = [...syms, ...syms];
  return (
    <div className="flex overflow-hidden py-2">
      <div ref={ref} className="marquee-track">
        {doubled.map((s, i) => (
          <TapeItem key={`${s}-${i}`} sym={s} />
        ))}
      </div>
    </div>
  );
}

export default function TickerMarquee() {
  const stocks = useStockStore((s) => s.stocks);
  React.useEffect(() => startTicker(), []);
  const syms1 = stocks.filter((_, i) => i % 2 === 0).map((s) => s.sym);
  const syms2 = stocks.filter((_, i) => i % 2 === 1).map((s) => s.sym);

  return (
    <motion.section
      aria-label="Live market tape"
      className="relative z-10 -rotate-[0.6deg]"
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.9 }}
    >
      <div className="glass border-y border-[var(--glass-border)] shadow-soft">
        <Tape syms={syms1} dir={1} />
        <div className="h-px bg-[var(--border)]" />
        <Tape syms={syms2} dir={-1} />
      </div>
    </motion.section>
  );
}
