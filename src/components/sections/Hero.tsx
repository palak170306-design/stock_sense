"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowDownRight, ArrowUpRight, ChevronDown, Play, Sparkles as SparklesIcon } from "lucide-react";
import { Magnetic, SplitLetters, EASE_OUT } from "@/lib/anim";
import { useUIStore } from "@/store/ui";
import { useStockStore, fmtPrice, startTicker } from "@/lib/stocks";
import Sparkline from "@/components/Sparkline";

const HeroScene = dynamic(() => import("@/components/three/HeroScene"), { ssr: false });

function TickerChip({ sym, className, delay }: { sym: string; className: string; delay: number }) {
  const stock = useStockStore((s) => s.stocks.find((x) => x.sym === sym));
  const flash = useStockStore((s) => s.flash[sym]);
  if (!stock) return null;
  const up = stock.change >= 0;
  return (
    <motion.div
      className={`glass absolute z-10 hidden items-center gap-2.5 rounded-2xl px-3.5 py-2.5 shadow-soft md:flex ${className}`}
      initial={{ opacity: 0, y: 40, scale: 0.8 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, duration: 1, ease: EASE_OUT }}
      style={{ animation: `floaty ${5 + delay}s ease-in-out ${delay}s infinite` }}
    >
      <div className="text-left">
        <p className="font-grotesk text-[11px] font-bold tracking-wide">{stock.sym}</p>
        <p className={`font-grotesk text-[13px] font-semibold tabular-nums ${flash === "up" ? "ticker-flash-green" : flash === "down" ? "ticker-flash-red" : ""}`}>
          ₹{fmtPrice(stock.price)}
        </p>
      </div>
      <Sparkline data={stock.spark} up={up} w={64} h={26} animate={false} />
      <span className={`flex items-center gap-0.5 font-grotesk text-[11px] font-bold ${up ? "text-[var(--up)]" : "text-[var(--down)]"}`}>
        {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
        {Math.abs(stock.change).toFixed(2)}%
      </span>
    </motion.div>
  );
}

export default function Hero() {
  const introDone = useUIStore((s) => s.introDone);
  const replayIntro = useUIStore((s) => s.replayIntro);
  const heroRef = React.useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const contentY = useTransform(scrollYProgress, [0, 1], [0, 180]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.75], [1, 0]);
  const sceneScale = useTransform(scrollYProgress, [0, 1], [1, 1.25]);
  const sceneOpacity = useTransform(scrollYProgress, [0, 0.9], [1, 0.15]);

  React.useEffect(() => startTicker(), []);

  const anim = (delay: number) => ({
    initial: { opacity: 0, y: 44, filter: "blur(8px)" },
    animate: introDone ? { opacity: 1, y: 0, filter: "blur(0px)" } : {},
    transition: { delay, duration: 1, ease: EASE_OUT },
  });

  return (
    <section ref={heroRef} id="top" className="relative flex min-h-[100svh] items-center justify-center overflow-hidden">
      {/* ambient gradient orbs */}
      <div aria-hidden className="orb left-[8%] top-[16%] h-72 w-72 bg-[var(--lemon)] opacity-60" />
      <div aria-hidden className="orb right-[6%] top-[58%] h-80 w-80 bg-[var(--pinkish)] opacity-70" style={{ animationDelay: "1.4s" }} />
      <div aria-hidden className="orb bottom-[4%] left-[38%] h-64 w-64 bg-[var(--skyish)] opacity-60" style={{ animationDelay: "2.6s" }} />

      {/* 3D candle world (continuation of the intro dive) */}
      <motion.div className="absolute inset-0" style={{ scale: sceneScale, opacity: sceneOpacity }}>
        <HeroScene />
      </motion.div>

      {/* soft vignette for readability */}
      <div aria-hidden className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,var(--background)_92%)] opacity-80" />

      {/* floating ticker chips */}
      <TickerChip sym="RELIANCE" className="left-[7%] top-[24%] xl:flex" delay={0.9} />
      <TickerChip sym="TATAMOTORS" className="right-[6%] top-[30%]" delay={1.15} />
      <TickerChip sym="ZOMATO" className="bottom-[22%] left-[12%]" delay={1.4} />
      <TickerChip sym="HDFCBANK" className="bottom-[30%] right-[13%] xl:flex" delay={1.65} />

      {/* main content */}
      <motion.div style={{ y: contentY, opacity: contentOpacity }} className="relative z-10 mx-auto max-w-5xl px-5 pt-24 text-center sm:px-8">
        <motion.div {...anim(0.05)} className="mb-7 flex justify-center">
          <span className="chip-label glass text-foreground/75">
            <span className="relative flex h-2 w-2">
              <span className="absolute h-full w-full rounded-full bg-[var(--up)]" style={{ animation: "ping-soft 1.8s ease-out infinite" }} />
              <span className="h-2 w-2 rounded-full bg-[var(--up)]" />
            </span>
            AI Market Radar · Live
          </span>
        </motion.div>

        <h1 className="text-[13vw] font-black leading-[0.98] tracking-tight sm:text-7xl lg:text-8xl" style={{ perspective: 900 }}>
          <span className="block">
            <SplitLetters text="SENSE THE" delay={0.35} stagger={0.045} play={introDone} />
          </span>
          <span className="block">
            <SplitLetters text="MARKET" delay={0.8} stagger={0.06} gradient play={introDone} />
          </span>
        </h1>

        <motion.p {...anim(1.25)} className="mx-auto mt-6 max-w-xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
          Stock Sense reads the noise so you don't have to — AI-powered signals, sector heatmaps
          and live market intuition, all in one calm, cinematic dashboard.
        </motion.p>

        <motion.div {...anim(1.45)} className="mt-9 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Magnetic strength={0.28}>
            <a
              href="#features"
              data-cursor-label="Let's go"
              className="btn-shine group flex h-13 items-center gap-2 rounded-full bg-gradient-to-r from-[var(--sunrise)] via-[var(--rose)] to-[var(--sunrise)] bg-[length:200%_auto] px-8 py-3.5 text-base font-bold text-white shadow-[0_16px_40px_-12px] shadow-[color-mix(in_srgb,var(--rose)_65%,transparent)] transition-[background-position] duration-500 hover:bg-right"
            >
              <SparklesIcon className="h-4.5 w-4.5 transition-transform duration-500 group-hover:rotate-180" />
              Start Sensing — Free
            </a>
          </Magnetic>
          <Magnetic strength={0.28}>
            <button
              onClick={replayIntro}
              data-cursor-label="Replay"
              className="glass group flex items-center gap-2.5 rounded-full px-7 py-3.5 text-base font-semibold transition-transform hover:scale-[1.04] active:scale-95"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-r from-[var(--sunrise)] to-[var(--rose)] text-white transition-transform duration-500 group-hover:scale-110">
                <Play className="ml-0.5 h-3 w-3 fill-current" />
              </span>
              Watch the intro film
            </button>
          </Magnetic>
        </motion.div>

        <motion.div {...anim(1.65)} className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 font-grotesk text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
          <span>✦ SEBI-aware insights</span>
          <span>✦ 120+ markets</span>
          <span>✦ Bank-grade security</span>
        </motion.div>
      </motion.div>

      {/* scroll indicator */}
      <motion.a
        href="#features"
        className="absolute bottom-7 left-1/2 z-10 -translate-x-1/2"
        initial={{ opacity: 0 }}
        animate={introDone ? { opacity: 1 } : {}}
        transition={{ delay: 2.3, duration: 0.8 }}
        aria-label="Scroll down"
      >
        <motion.div animate={{ y: [0, 8, 0] }} transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }} className="flex flex-col items-center gap-1.5">
          <span className="font-grotesk text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground">Scroll</span>
          <span className="flex h-9 w-6 items-start justify-center rounded-full border-2 border-foreground/25 p-1.5">
            <span className="h-1.5 w-1 rounded-full bg-gradient-to-b from-[var(--sunrise)] to-[var(--rose)]" style={{ animation: "wheel-dot 1.8s ease infinite" }} />
          </span>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </motion.div>
      </motion.a>
    </section>
  );
}
