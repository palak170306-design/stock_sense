"use client";

import { create } from "zustand";

export type Stock = {
  sym: string;
  name: string;
  price: number;
  base: number;
  change: number; // % from open
  sector: string;
  spark: number[];
};

/* deterministic PRNG so server & client render identical sparklines */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const hashStr = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

const seedSpark = (up: boolean, sym = "x", n = 22) => {
  const rnd = mulberry32(hashStr(sym) + (up ? 7 : 13));
  return Array.from({ length: n }, (_, i) => {
    const drift = (up ? 1 : -1) * i * (0.4 + rnd() * 0.5);
    return Math.sin(i * 0.7) * 2 + drift + rnd() * 1.6;
  });
};

const mk = (sym: string, name: string, price: number, change: number, sector: string): Stock => ({
  sym,
  name,
  price,
  base: price,
  change,
  sector,
  spark: seedSpark(change >= 0, sym),
});

export const STOCKS: Stock[] = [
  mk("RELIANCE", "Reliance Industries", 2941.5, 1.42, "Energy"),
  mk("TCS", "Tata Consultancy", 3876.2, -0.68, "IT"),
  mk("HDFCBANK", "HDFC Bank", 1684.9, 0.94, "Banking"),
  mk("INFY", "Infosys", 1512.3, 2.18, "IT"),
  mk("TATAMOTORS", "Tata Motors", 962.7, 3.05, "Auto"),
  mk("SBIN", "State Bank of India", 786.4, -1.12, "Banking"),
  mk("ITC", "ITC Limited", 465.8, 0.36, "FMCG"),
  mk("LT", "Larsen & Toubro", 3489.1, 1.77, "Infra"),
  mk("AXISBANK", "Axis Bank", 1148.6, -0.44, "Banking"),
  mk("SUNPHARMA", "Sun Pharmaceutical", 1732.0, 0.81, "Pharma"),
  mk("BAJFINANCE", "Bajaj Finance", 6894.5, -2.06, "NBFC"),
  mk("ASIANPAINT", "Asian Paints", 2918.3, 1.12, "Paints"),
  mk("MARUTI", "Maruti Suzuki", 12480.9, 0.58, "Auto"),
  mk("ZOMATO", "Zomato Ltd.", 248.6, 4.32, "Consumer"),
  mk("ADANIENT", "Adani Enterprises", 3120.7, -1.64, "Conglomerate"),
  mk("WIPRO", "Wipro Ltd.", 538.2, 0.19, "IT"),
];

export const SECTORS = [
  { name: "IT", change: 1.24 },
  { name: "Banking", change: 0.62 },
  { name: "Auto", change: 2.31 },
  { name: "Pharma", change: -0.47 },
  { name: "Energy", change: 1.05 },
  { name: "FMCG", change: -0.22 },
  { name: "Metals", change: 1.87 },
  { name: "Realty", change: -1.12 },
];

type Flash = "up" | "down" | undefined;

type StockStore = {
  stocks: Stock[];
  flash: Record<string, Flash>;
  tick: () => void;
};

export const useStockStore = create<StockStore>((set) => ({
  stocks: STOCKS,
  flash: {},
  tick: () => {
    set((s) => {
      const flash: Record<string, Flash> = {};
      const stocks = s.stocks.map((st) => {
        const willMove = Math.random() < 0.55;
        if (!willMove) return st;
        const delta = (Math.random() - 0.48) * 0.0035 * st.price;
        const price = +(st.price + delta).toFixed(2);
        const change = +(st.change + (delta / st.price) * 100).toFixed(2);
        flash[st.sym] = delta >= 0 ? "up" : "down";
        const spark = [...st.spark.slice(1), st.spark[st.spark.length - 1] + (delta / st.price) * 120];
        return { ...st, price, change, spark };
      });
      return { stocks, flash };
    });
    setTimeout(() => set({ flash: {} }), 900);
  },
}));

let started = false;
export function startTicker() {
  if (started || typeof window === "undefined") return;
  started = true;
  const store = useStockStore.getState();
  setInterval(() => store.tick(), 1600);
}

export const fmtPrice = (n: number) =>
  n >= 1000 ? n.toLocaleString("en-IN", { maximumFractionDigits: 1 }) : n.toFixed(2);
