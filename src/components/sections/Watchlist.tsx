"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight, Plus, Star } from "lucide-react";
import { SectionHeading, Reveal, EASE_OUT } from "@/lib/anim";
import { useStockStore, fmtPrice, startTicker } from "@/lib/stocks";
import Sparkline from "@/components/Sparkline";

type Tab = "all" | "gainers" | "losers";
const TABS: { id: Tab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "gainers", label: "Gainers" },
  { id: "losers", label: "Losers" },
];

function StockCard({ sym, i }: { sym: string; i: number }) {
  const stock = useStockStore((s) => s.stocks.find((x) => x.sym === sym));
  const flash = useStockStore((s) => s.flash[sym]);
  const [pinned, setPinned] = React.useState(false);
  if (!stock) return null;
  const up = stock.change >= 0;

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 36, rotateX: -14 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.3 } }}
      transition={{ delay: i * 0.05, duration: 0.7, ease: EASE_OUT }}
      className="glow-card glass group relative flex items-center gap-4 rounded-2xl p-4 shadow-soft sm:p-5"
      whileHover={{ y: -5 }}
      data-cursor-label="Trade"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="font-grotesk text-sm font-bold tracking-wide">{stock.sym}</h3>
          <span className="hidden rounded-md bg-[var(--muted)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground sm:inline">
            {stock.sector}
          </span>
        </div>
        <p className="truncate text-xs text-muted-foreground">{stock.name}</p>
        <div className="mt-2 flex items-baseline gap-2">
          <span
            className={`font-grotesk text-lg font-extrabold tabular-nums ${
              flash === "up" ? "ticker-flash-green" : flash === "down" ? "ticker-flash-red" : ""
            }`}
          >
            ₹{fmtPrice(stock.price)}
          </span>
          <span className={`flex items-center gap-0.5 font-grotesk text-xs font-bold ${up ? "text-[var(--up)]" : "text-[var(--down)]"}`}>
            {up ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
            {up ? "+" : ""}
            {stock.change.toFixed(2)}%
          </span>
        </div>
      </div>

      <div className="shrink-0 transition-transform duration-500 group-hover:scale-110">
        <Sparkline key={stock.spark.length + stock.sym} data={stock.spark} up={up} w={92} h={44} animate={false} />
      </div>

      <div className="flex shrink-0 flex-col gap-1.5">
        <motion.button
          whileTap={{ scale: 1.5, rotate: 20 }}
          onClick={() => setPinned((p) => !p)}
          aria-label={pinned ? `Unpin ${stock.sym}` : `Pin ${stock.sym}`}
          className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-[var(--muted)]"
        >
          <motion.span animate={pinned ? { scale: [1, 1.6, 1.15], rotate: [0, 25, 0] } : { scale: 1 }}>
            <Star className={`h-4 w-4 ${pinned ? "fill-[var(--sunrise)] text-[var(--sunrise)]" : "text-foreground/35"}`} />
          </motion.span>
        </motion.button>
        <motion.button
          whileHover={{ rotate: 90 }}
          whileTap={{ scale: 0.85 }}
          aria-label={`Add ${stock.sym} to portfolio`}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[var(--sunrise)] to-[var(--rose)] text-white opacity-0 shadow-md transition-opacity group-hover:opacity-100"
        >
          <Plus className="h-4 w-4" />
        </motion.button>
      </div>
    </motion.article>
  );
}

export default function Watchlist() {
  const stocks = useStockStore((s) => s.stocks);
  const [tab, setTab] = React.useState<Tab>("all");
  React.useEffect(() => startTicker(), []);

  const list = React.useMemo(() => {
    if (tab === "gainers") return [...stocks].sort((a, b) => b.change - a.change).slice(0, 6);
    if (tab === "losers") return [...stocks].sort((a, b) => a.change - b.change).slice(0, 6);
    return stocks.slice(0, 8);
  }, [stocks, tab]);

  return (
    <section id="watchlist" className="relative mx-auto max-w-7xl scroll-mt-24 px-5 py-20 sm:px-8 sm:py-28">
      <div aria-hidden className="orb right-[8%] top-[20%] h-72 w-72 bg-[var(--lemon)] opacity-60" />
      <SectionHeading
        chip="Your watchlist, alive"
        chipColor="lemon"
        title="Watch it move."
        accent="Feel it breathe."
        sub="Prices tick, sparks fly and sparklines redraw themselves in real time. Pin the ones you care about — the list reorders with a satisfying snap."
      />

      <Reveal delay={2} className="mt-12">
        {/* tabs */}
        <div className="glass mx-auto flex w-fit rounded-full p-1.5 shadow-soft">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`relative rounded-full px-5 py-2 font-grotesk text-sm font-bold transition-colors sm:px-7 ${
                tab === t.id ? "text-white" : "text-foreground/60 hover:text-foreground"
              }`}
              data-cursor-label="Filter"
            >
              {tab === t.id && (
                <motion.span
                  layoutId="watchlist-pill"
                  className="absolute inset-0 rounded-full bg-gradient-to-r from-[var(--sunrise)] to-[var(--rose)]"
                  transition={{ type: "spring", stiffness: 320, damping: 28 }}
                />
              )}
              <span className="relative z-10">{t.label}</span>
            </button>
          ))}
        </div>

        <motion.div layout className="mt-10 grid gap-4 md:grid-cols-2" style={{ perspective: 1000 }}>
          <AnimatePresence mode="popLayout">
            {list.map((s, i) => (
              <StockCard key={s.sym} sym={s.sym} i={i} />
            ))}
          </AnimatePresence>
        </motion.div>
      </Reveal>
    </section>
  );
}
