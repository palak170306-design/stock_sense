"use client";

import * as React from "react";
import { motion, useScroll, useSpring, useTransform } from "framer-motion";
import { Radar, Wallet, Zap } from "lucide-react";
import { SectionHeading, Reveal } from "@/lib/anim";

const STEPS = [
  {
    icon: Wallet,
    num: "01",
    title: "Connect quietly",
    desc: "Link your broker or start paper-trading in under two minutes. No forms longer than a haiku, no credit card ambushes.",
    color: "var(--sunrise)",
    side: "left" as const,
  },
  {
    icon: Radar,
    num: "02",
    title: "Let the radar listen",
    desc: "Our AI reads every tick, whisper and volume wave across 120+ markets — compressing an ocean of noise into a few calm signals.",
    color: "var(--rose)",
    side: "right" as const,
  },
  {
    icon: Zap,
    num: "03",
    title: "Act before the crowd",
    desc: "When price, volume and sentiment align, you feel it first. One tap to act, with Risk Guard quietly watching your back.",
    color: "var(--sky)",
    side: "left" as const,
  },
];

export default function HowItWorks() {
  const ref = React.useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.75", "end 0.6"] });
  const lineScale = useSpring(scrollYProgress, { stiffness: 90, damping: 24 });
  const glowY = useTransform(lineScale, (v) => `${v * 100}%`);

  return (
    <section id="journey" className="relative scroll-mt-24 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <SectionHeading
          chip="The journey"
          chipColor="rose"
          title="From noise to signal in"
          accent="three moves"
          sub="Scroll and watch the path light up — this is how Stock Sense rewires the way you experience markets."
        />

        <div ref={ref} className="relative mt-20">
          {/* the glowing path */}
          <div className="absolute left-5 top-0 h-full w-px bg-[var(--border)] sm:left-1/2" aria-hidden>
            <motion.div
              className="h-full w-full origin-top bg-gradient-to-b from-[var(--sunrise)] via-[var(--rose)] to-[var(--sky)]"
              style={{ scaleY: lineScale }}
            />
            <motion.div
              className="absolute left-1/2 h-4 w-4 -translate-x-1/2 rounded-full"
              style={{
                top: glowY,
                background: "radial-gradient(circle, var(--rose) 0%, transparent 70%)",
                boxShadow: "0 0 24px 8px color-mix(in srgb, var(--rose) 40%, transparent)",
              }}
            />
          </div>

          <div className="space-y-16 sm:space-y-24">
            {STEPS.map((s, i) => (
              <div key={s.num} className={`relative flex ${s.side === "right" ? "sm:justify-end" : "sm:justify-start"}`}>
                {/* node */}
                <motion.div
                  className="glass absolute left-5 top-1 z-10 flex h-11 w-11 -translate-x-1/2 items-center justify-center rounded-full shadow-soft sm:left-1/2 sm:top-1/2 sm:-translate-y-1/2"
                  whileInView={{ scale: [0, 1.25, 1], rotate: [0, 20, 0] }}
                  viewport={{ once: true, margin: "-120px" }}
                  transition={{ duration: 0.7 }}
                  style={{ background: `color-mix(in srgb, ${s.color} 14%, var(--glass))` }}
                >
                  <s.icon className="h-5 w-5" style={{ color: s.color }} />
                </motion.div>

                <Reveal className="ml-14 w-full sm:ml-0 sm:w-[calc(50%-3.5rem)]">
                  <motion.article
                    className="glow-card glass rounded-3xl p-6 shadow-soft sm:p-8"
                    whileHover={{ y: -6 }}
                    data-cursor-label="Nice"
                  >
                    <span className="font-grotesk text-5xl font-black opacity-[0.12]">{s.num}</span>
                    <h3 className="-mt-4 text-2xl font-bold tracking-tight">{s.title}</h3>
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">{s.desc}</p>
                  </motion.article>
                </Reveal>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
