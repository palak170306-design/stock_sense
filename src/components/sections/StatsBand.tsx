"use client";

import { motion } from "framer-motion";
import { Activity, Globe2, Radio, ShieldCheck } from "lucide-react";
import { CountUp, Reveal } from "@/lib/anim";

const STATS = [
  { icon: Radio, value: 52, suffix: "K+", label: "Traders sensing daily", color: "var(--sunrise)", decimals: 0 },
  { icon: Activity, value: 2.4, suffix: "Cr+", label: "Signals parsed every day", color: "var(--rose)", decimals: 1, prefix: "₹" },
  { icon: Globe2, value: 120, suffix: "+", label: "Markets under our radar", color: "var(--sky)", decimals: 0 },
  { icon: ShieldCheck, value: 99.98, suffix: "%", label: "Uptime you can trust", color: "var(--up)", decimals: 2 },
];

export default function StatsBand() {
  return (
    <section className="relative mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-24" aria-label="Platform statistics">
      <div className="grid grid-cols-2 gap-x-6 gap-y-12 lg:grid-cols-4">
        {STATS.map((s, i) => (
          <Reveal key={s.label} delay={i} className="relative text-center">
            <motion.div
              className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl"
              style={{ background: `color-mix(in srgb, ${s.color} 16%, transparent)` }}
              whileHover={{ rotate: [0, -8, 8, 0], scale: 1.12 }}
              transition={{ duration: 0.5 }}
            >
              <s.icon className="h-6 w-6" style={{ color: s.color }} />
            </motion.div>
            <p className="font-grotesk text-4xl font-extrabold tabular-nums tracking-tight sm:text-5xl">
              <CountUp to={s.value} suffix={s.suffix} decimals={s.decimals} prefix={s.prefix} />
            </p>
            <p className="mt-2 text-sm text-muted-foreground">{s.label}</p>
            {i < STATS.length - 1 && (
              <motion.span
                aria-hidden
                className="absolute -right-3 top-1/2 hidden h-14 w-px -translate-y-1/2 bg-gradient-to-b from-transparent via-[var(--border)] to-transparent lg:block"
              />
            )}
          </Reveal>
        ))}
      </div>
    </section>
  );
}
