"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Flame } from "lucide-react";
import { Reveal, SectionHeading } from "@/lib/anim";

type Tile = { name: string; change: number; top: string; span: string };

const BASE: Tile[] = [
  { name: "Auto", change: 2.31, top: "TATAMOTORS ▲", span: "sm:col-span-3 sm:row-span-2" },
  { name: "IT", change: 1.24, top: "INFY ▲", span: "sm:col-span-2" },
  { name: "Metals", change: 1.87, top: "TATASTEEL ▲", span: "sm:col-span-2" },
  { name: "Banking", change: 0.62, top: "HDFCBANK ▲", span: "sm:col-span-2 sm:row-span-2" },
  { name: "Energy", change: 1.05, top: "RELIANCE ▲", span: "sm:col-span-3" },
  { name: "Pharma", change: -0.47, top: "SUNPHARMA ▼", span: "sm:col-span-2" },
  { name: "FMCG", change: -0.22, top: "ITC ▼", span: "sm:col-span-2" },
  { name: "Realty", change: -1.12, top: "DLF ▼", span: "sm:col-span-2" },
];

function tileStyle(change: number) {
  const mag = Math.min(Math.abs(change) / 3, 1);
  if (change >= 0) {
    return {
      background: `color-mix(in srgb, var(--up) ${8 + mag * 26}%, transparent)`,
      borderColor: `color-mix(in srgb, var(--up) ${20 + mag * 30}%, transparent)`,
    };
  }
  return {
    background: `color-mix(in srgb, var(--down) ${8 + mag * 26}%, transparent)`,
    borderColor: `color-mix(in srgb, var(--down) ${20 + mag * 30}%, transparent)`,
  };
}

export default function Heatmap() {
  const [tiles, setTiles] = React.useState(BASE);

  /* gentle live drift so the map breathes */
  React.useEffect(() => {
    const id = setInterval(() => {
      setTiles((prev) =>
        prev.map((t) => ({
          ...t,
          change: +(t.change + (Math.random() - 0.5) * 0.16).toFixed(2),
        }))
      );
    }, 2200);
    return () => clearInterval(id);
  }, []);

  return (
    <section id="markets" className="relative scroll-mt-24 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <SectionHeading
          chip="Live sector map"
          chipColor="mint"
          title="The market on one"
          accent="breathing canvas"
          sub="Tiles glow hotter as money rushes in and cool down as it leaves. Hover a tile to feel the pulse of the sector."
        />

        <Reveal delay={2} className="mt-14">
          <div className="grid auto-rows-[90px] grid-cols-2 gap-3 sm:grid-cols-6" style={{ perspective: 1000 }}>
            {tiles.map((t, i) => {
              const up = t.change >= 0;
              return (
                <motion.div
                  key={t.name}
                  className={`group relative flex cursor-pointer flex-col justify-between overflow-hidden rounded-2xl border p-4 backdrop-blur-sm ${t.span}`}
                  style={tileStyle(t.change)}
                  initial={{ opacity: 0, scale: 0.82, rotateX: -18 }}
                  whileInView={{ opacity: 1, scale: 1, rotateX: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ delay: i * 0.06, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                  whileHover={{ scale: 1.045, zIndex: 5, transition: { duration: 0.25 } }}
                  data-cursor-label={up ? "Hot" : "Cool"}
                >
                  {/* heat shimmer */}
                  <div
                    aria-hidden
                    className="absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                    style={{
                      background: `radial-gradient(circle at 50% 100%, ${
                        up ? "color-mix(in srgb, var(--up) 22%, transparent)" : "color-mix(in srgb, var(--down) 22%, transparent)"
                      }, transparent 70%)`,
                    }}
                  />
                  <div className="flex items-start justify-between">
                    <span className="text-sm font-bold tracking-tight sm:text-base">{t.name}</span>
                    {Math.abs(t.change) > 1.6 && (
                      <motion.span animate={{ scale: [1, 1.25, 1], rotate: [0, 8, 0] }} transition={{ duration: 1.6, repeat: Infinity }}>
                        <Flame className="h-4 w-4" style={{ color: up ? "var(--up)" : "var(--down)" }} />
                      </motion.span>
                    )}
                  </div>
                  <div>
                    <motion.span
                      key={t.change}
                      initial={{ opacity: 0.4, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`font-grotesk text-xl font-extrabold tabular-nums sm:text-2xl ${up ? "text-[var(--up)]" : "text-[var(--down)]"}`}
                    >
                      {up ? "+" : ""}
                      {t.change.toFixed(2)}%
                    </motion.span>
                    <p className="mt-0.5 font-grotesk text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground/45">
                      {t.top}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
