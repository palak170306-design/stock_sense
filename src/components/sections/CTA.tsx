"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { ArrowRight, CandlestickChart, Radar, TrendingUp } from "lucide-react";
import { Magnetic, Reveal, SplitLetters } from "@/lib/anim";

export default function CTA() {
  return (
    <section id="cta" className="relative scroll-mt-24 px-5 py-20 sm:px-8 sm:py-28">
      <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[2.5rem] p-[1.5px]">
        {/* animated gradient border */}
        <div
          aria-hidden
          className="absolute inset-0 rounded-[2.5rem]"
          style={{
            background: "linear-gradient(120deg, var(--sunrise), var(--rose), var(--sky), var(--sunrise))",
            backgroundSize: "300% 300%",
            animation: "gradient-pan 6s ease infinite",
          }}
        />
        <div className="relative overflow-hidden rounded-[calc(2.5rem-1.5px)] bg-[var(--background)] px-6 py-16 text-center sm:px-12 sm:py-20">
          {/* drifting blobs */}
          <div aria-hidden className="absolute -left-20 -top-24 h-72 w-72 bg-[var(--lemon)] opacity-70 blur-3xl" style={{ animation: "blob-drift 9s ease-in-out infinite" }} />
          <div aria-hidden className="absolute -bottom-24 -right-16 h-80 w-80 bg-[var(--pinkish)] opacity-70 blur-3xl" style={{ animation: "blob-drift 11s ease-in-out infinite reverse" }} />
          <div aria-hidden className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 bg-[var(--skyish)] opacity-40 blur-3xl" style={{ animation: "blob-drift 13s ease-in-out infinite" }} />

          {/* orbiting icons */}
          <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 h-[340px] w-[340px] -translate-x-1/2 -translate-y-1/2 sm:h-[440px] sm:w-[440px]" style={{ animation: "orbit 22s linear infinite" }}>
            {[
              { Icon: CandlestickChart, angle: 0 },
              { Icon: Radar, angle: 120 },
              { Icon: TrendingUp, angle: 240 },
            ].map(({ Icon, angle }, i) => (
              <span
                key={i}
                className="glass absolute left-1/2 top-1/2 flex h-12 w-12 items-center justify-center rounded-2xl shadow-soft"
                style={{
                  transform: `rotate(${angle}deg) translateX(min(46vw, 380px)) rotate(-${angle}deg) translate(-50%, -50%)`,
                  animation: `orbit 22s linear infinite reverse`,
                }}
              >
                <Icon className="h-5 w-5 text-[var(--rose)]" />
              </span>
            ))}
          </div>

          <div className="relative">
            <Reveal>
              <span className="chip-label glass text-foreground/70">Free 30-day radar pass</span>
            </Reveal>
            <h2 className="mx-auto mt-6 max-w-3xl text-4xl font-black leading-[1.04] tracking-tight sm:text-6xl">
              <span className="block">
                <SplitLetters text="Ready to feel the" delay={0.1} />
              </span>
              <span className="block">
                <SplitLetters text="market sense you?" delay={0.5} stagger={0.05} gradient />
              </span>
            </h2>
            <Reveal delay={2}>
              <p className="mx-auto mt-5 max-w-xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
                Join 52,000+ traders who stopped drowning in charts and started feeling the market.
                Your first signal is closer than you think.
              </p>
            </Reveal>
            <Reveal delay={3}>
              <div className="mt-9 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Magnetic strength={0.3}>
                  <a
                    href="#top"
                    data-cursor-label="Now"
                    className="btn-shine group flex items-center gap-2.5 rounded-full bg-gradient-to-r from-[var(--sunrise)] to-[var(--rose)] px-9 py-4 text-base font-bold text-white shadow-[0_18px_50px_-12px] shadow-[color-mix(in_srgb,var(--rose)_70%,transparent)] transition-transform hover:scale-[1.04] active:scale-95"
                  >
                    Start sensing free
                    <ArrowRight className="h-4.5 w-4.5 transition-transform duration-300 group-hover:translate-x-1.5" />
                  </a>
                </Magnetic>
                <Magnetic strength={0.3}>
                  <button className="glass rounded-full px-8 py-4 text-base font-semibold transition-transform hover:scale-[1.04] active:scale-95" data-cursor-label="Book">
                    Book a live demo
                  </button>
                </Magnetic>
              </div>
              <p className="mt-5 font-grotesk text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                No card needed · Cancel anytime · SEBI-compliant data
              </p>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
