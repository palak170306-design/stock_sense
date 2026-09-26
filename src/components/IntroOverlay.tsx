"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";
import { useTheme } from "next-themes";
import { useUIStore } from "@/store/ui";
import { EASE_OUT, EASE_EXPO } from "@/lib/anim";

const IntroScene = dynamic(() => import("@/components/three/IntroScene"), { ssr: false });

/* timeline (seconds) — mirrors the 3D scene */
const T = {
  cap1: 0.5,
  cap1Out: 3.9,
  sparkCap: 4.5,
  sparkCapOut: 6.8,
  orderCap: 8.3,
  orderCapOut: 10.8,
  logo: 11.5,
  tagline: 12.7,
  dive: 14.3,
  flash: 15.35,
  end: 16.05,
};

const TICKERS = ["RELIANCE", "TCS", "HDFCBANK", "INFY", "TATAMOTORS", "SBIN", "ITC", "LT", "AXISBANK", "WIPRO", "BHARTIARTL", "ADANIENT", "MARUTI", "ZOMATO", "HINDUNILVR", "BAJFINANCE", "ASIANPAINT", "ULTRACEMCO", "SUNPHARMA", "NESTLEIND"];

const LOGO = "STOCK SENSE";

export default function Intro() {
  const finishIntro = useUIStore((s) => s.finishIntro);
  const replayRequested = useUIStore((s) => s.replayRequested);
  const { resolvedTheme } = useTheme();
  const mode: "light" | "dark" = resolvedTheme === "dark" ? "dark" : "light";

  const [flickers] = React.useState(() =>
    Array.from({ length: 22 }, (_, i) => ({
      sym: TICKERS[i % TICKERS.length],
      top: 6 + Math.random() * 82,
      left: 4 + Math.random() * 86,
      dur: 0.6 + Math.random() * 1.4,
      delay: Math.random() * 2,
      size: 9 + Math.random() * 12,
    }))
  );
  const [letterSeeds] = React.useState(() =>
    Array.from({ length: LOGO.length }, () => (Math.random() - 0.5) * 70)
  );

  const doneRef = React.useRef(false);
  const finished = React.useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    finishIntro();
  }, [finishIntro]);

  React.useEffect(() => {
    const id = setTimeout(finished, T.end * 1000);
    return () => clearTimeout(id);
  }, [finished]);

  const skip = () => finished();

  /* lock scroll while intro plays */
  React.useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return (
    <motion.div
      className="fixed inset-0 z-[100] overflow-hidden"
      data-testid="intro-overlay"
      exit={{ opacity: 0 }}
    >
      {/* 3D world */}
      <IntroScene mode={mode} />

      {/* flickering ghost ticker symbols */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        {flickers.map((f, i) => (
          <motion.span
            key={i}
            className="absolute font-grotesk font-medium tracking-[0.2em] text-foreground/25 dark:text-foreground/30"
            style={{ top: `${f.top}%`, left: `${f.left}%`, fontSize: f.size }}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.9, 0.15, 0.7, 0] }}
            transition={{ duration: f.dur, delay: f.delay, repeat: Infinity, repeatDelay: Math.random() * 1.5 }}
          >
            {f.sym}
          </motion.span>
        ))}
      </div>

      {/* ghost layer fades away as the spark ignites */}
      <motion.div
        className="pointer-events-none absolute inset-0"
        initial={{ opacity: 1 }}
        animate={{ opacity: [1, 1, 0] }}
        transition={{ delay: T.spark - 0.55, duration: 1.1, times: [0, 0.45, 1], ease: "easeInOut" }}
        style={{ background: "var(--background)" }}
      />

      {/* act captions */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <AnimatePresence>
          {[
            { a: T.cap1, o: T.cap1Out, text: "the market never sleeps." },
            { a: T.sparkCap, o: T.sparkCapOut, text: "then — a signal." },
            { a: T.orderCap, o: T.orderCapOut, text: "order emerges from chaos." },
          ].map(
            (c) =>
              true && (
                <motion.p
                  key={c.text}
                  className="absolute px-6 text-center font-grotesk text-sm font-medium uppercase tracking-[0.5em] text-foreground/70 sm:text-base"
                  initial={{ opacity: 0, y: 18, filter: "blur(8px)" }}
                  animate={{ opacity: [0, 1, 1, 0], y: [18, 0, 0, -14], filter: ["blur(8px)", "blur(0px)", "blur(0px)", "blur(8px)"] }}
                  transition={{ delay: c.a, duration: c.o - c.a, times: [0, 0.18, 0.82, 1], ease: "easeInOut" }}
                >
                  {c.text}
                </motion.p>
              )
          )}
        </AnimatePresence>
      </div>

      {/* logo assembly (ACT IV) */}
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <motion.div
          className="flex items-baseline justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: T.logo - 0.1, duration: 0.2 }}
          style={{ perspective: 800 }}
        >
          {Array.from(LOGO).map((ch, i) => (
            <motion.span
              key={i}
              className={`text-4xl font-black tracking-tight sm:text-6xl lg:text-7xl ${
                ch === " " ? "w-4 sm:w-7" : i < 5 ? "text-foreground" : "text-gradient"
              }`}
              initial={{ opacity: 0, y: 90, rotateX: -95, rotateZ: letterSeeds[i] * 0.4, scale: 1.7, filter: "blur(14px)" }}
              animate={{
                opacity: 1,
                y: 0,
                rotateX: 0,
                rotateZ: 0,
                scale: 1,
                filter: "blur(0px)",
              }}
              transition={{ delay: T.logo + i * 0.055, duration: 1, ease: EASE_OUT }}
              style={{ transformOrigin: "50% 100%", transformStyle: "preserve-3d" }}
            >
              {ch === " " ? "\u00A0" : ch}
            </motion.span>
          ))}
        </motion.div>

        <motion.p
          className="mt-4 px-6 text-center font-grotesk text-xs font-medium uppercase tracking-[0.42em] text-muted-foreground sm:text-sm"
          initial={{ opacity: 0, y: 16, letterSpacing: "0.2em" }}
          animate={{ opacity: 1, y: 0, letterSpacing: "0.42em" }}
          transition={{ delay: T.tagline, duration: 1.1, ease: EASE_OUT }}
        >
          Sense the market. Before it moves.
        </motion.p>

        {/* radar pulse under logo */}
        <motion.div
          className="relative mt-7 h-9 w-40"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: T.tagline + 0.4, duration: 0.6 }}
        >
          <div className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-r from-[var(--sunrise)] to-[var(--rose)]" />
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[var(--rose)]"
              style={{ animation: `ping-soft 2.2s ease-out ${i * 0.7}s infinite` }}
            />
          ))}
        </motion.div>
      </div>

      {/* top progress hairline */}
      <div className="absolute inset-x-0 top-0 z-10 h-[3px] bg-foreground/5">
        <motion.div
          className="h-full origin-left bg-gradient-to-r from-[var(--sunrise)] via-[var(--rose)] to-[var(--sky)]"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: T.end - 0.15, ease: "linear" }}
        />
      </div>

      {/* bottom-left status readout */}
      <motion.div
        className="absolute bottom-6 left-6 z-10 font-grotesk text-[10px] font-medium uppercase tracking-[0.3em] text-foreground/40 sm:text-xs"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.9 }}
      >
        <motion.span
          animate={{ opacity: [0.35, 1, 0.35] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-[var(--up)] align-middle"
        />
        initializing market radar
      </motion.div>

      {/* skip control */}
      <motion.button
        onClick={skip}
        data-cursor-label="Skip"
        className="glass absolute bottom-5 right-5 z-10 rounded-full px-5 py-2.5 font-grotesk text-[11px] font-semibold uppercase tracking-[0.25em] text-foreground/70 transition-colors hover:text-foreground sm:bottom-7 sm:right-7"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.1, duration: 0.6, ease: EASE_OUT }}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.94 }}
        aria-label="Skip intro"
      >
        Skip Intro →
      </motion.button>

      {/* dive zoom anticipation (ACT V) */}
      <motion.div
        className="pointer-events-none absolute inset-0"
        initial={{ scale: 1, opacity: 0 }}
        animate={{ scale: [1, 1.06], opacity: [0, 0.35] }}
        transition={{ delay: T.dive, duration: T.flash - T.dive, ease: "easeIn" }}
        style={{ backdropFilter: "blur(2px)" }}
      />

      {/* THE FLASH — cinematic transition into the website */}
      <motion.div
        className="pointer-events-none absolute inset-0 z-20"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0, 1] }}
        transition={{
          delay: T.flash - 0.55,
          duration: 0.55,
          times: [0, 0.05, 1],
          ease: EASE_EXPO,
        }}
        style={{
          background:
            mode === "light"
              ? "radial-gradient(circle at 50% 52%, #fff7e8 0%, #ffe9d2 55%, #ffd9c9 100%)"
              : "radial-gradient(circle at 50% 52%, #f2eaff 0%, #d8d4ff 40%, #0c0f16 130%)",
        }}
      />
      <motion.div
        className="pointer-events-none absolute inset-0 z-20"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0, 0.9, 1] }}
        transition={{ delay: T.flash, duration: 0.65, times: [0, 0.1, 0.7, 1] }}
        style={{ background: mode === "light" ? "#fff8ec" : "#0c0f16" }}
      />
    </motion.div>
  );
}
