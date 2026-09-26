"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Github, Instagram, Linkedin, Rocket, Twitter, TrendingUp, Youtube } from "lucide-react";
import { Magnetic } from "@/lib/anim";

const COLS = [
  {
    title: "Product",
    links: ["Signal Radar", "Sector Heatmap", "Watchlists", "Risk Guard", "Portfolios"],
  },
  {
    title: "Company",
    links: ["About", "Careers", "Press kit", "Contact", "Blog"],
  },
  {
    title: "Resources",
    links: ["Docs", "API", "Community", "Status", "Security"],
  },
];

const SOCIALS = [
  { icon: Twitter, label: "Twitter" },
  { icon: Linkedin, label: "LinkedIn" },
  { icon: Instagram, label: "Instagram" },
  { icon: Youtube, label: "YouTube" },
  { icon: Github, label: "GitHub" },
];

export default function Footer() {
  const [launching, setLaunching] = React.useState(false);

  const toTop = () => {
    if (launching) return;
    setLaunching(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
    setTimeout(() => setLaunching(false), 1100);
  };

  return (
    <footer className="relative mt-auto border-t border-[var(--border)] pb-10 pt-16">
      <div aria-hidden className="orb bottom-0 left-[20%] h-56 w-56 bg-[var(--skyish)] opacity-40" />
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_repeat(3,1fr)]">
          {/* brand */}
          <div>
            <a href="#top" className="group inline-flex items-center gap-2.5" data-cursor-label="Top">
              <motion.span
                className="glass flex h-10 w-10 items-center justify-center rounded-xl"
                whileHover={{ rotate: [0, -10, 10, 0], scale: 1.1 }}
              >
                <TrendingUp className="h-5 w-5 text-gradient" strokeWidth={2.6} />
              </motion.span>
              <span className="text-lg font-extrabold tracking-tight">
                Stock<span className="text-gradient">Sense</span>
              </span>
            </a>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
              Sense the market before it moves. A calmer, kinder way to read the chaos of global
              markets — built for humans, powered by AI.
            </p>
            <div className="mt-6 flex gap-2.5">
              {SOCIALS.map((s, i) => (
                <Magnetic key={s.label} strength={0.4}>
                  <motion.a
                    href="#top"
                    aria-label={s.label}
                    data-cursor-label="Follow"
                    className="glass flex h-9 w-9 items-center justify-center rounded-full text-foreground/60 transition-colors hover:text-[var(--rose)]"
                    whileHover={{ scale: 1.18, rotate: i % 2 ? 8 : -8 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <s.icon className="h-4 w-4" />
                  </motion.a>
                </Magnetic>
              ))}
            </div>
          </div>

          {/* link columns */}
          {COLS.map((c) => (
            <nav key={c.title} aria-label={c.title}>
              <h4 className="font-grotesk text-xs font-bold uppercase tracking-[0.24em] text-foreground/45">{c.title}</h4>
              <ul className="mt-4 space-y-2.5">
                {c.links.map((l) => (
                  <li key={l}>
                    <a
                      href="#top"
                      className="link-underline inline-block text-sm text-foreground/70 transition-colors hover:text-foreground"
                      data-cursor-label="Go"
                    >
                      {l}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-14 flex flex-col items-center justify-between gap-5 border-t border-[var(--border)] pt-7 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Stock Sense Labs. Markets are wild — invest gently. Not
            investment advice.
          </p>
          <div className="flex items-center gap-5">
            <span className="font-grotesk text-[10px] uppercase tracking-[0.28em] text-muted-foreground">Made with ♥ + AI</span>
            {/* rocket back-to-top */}
            <motion.button
              onClick={toTop}
              aria-label="Back to top"
              data-cursor-label="Launch"
              className="glass flex h-11 w-11 items-center justify-center overflow-hidden rounded-full shadow-soft"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              animate={launching ? { y: -80, opacity: 0, transition: { duration: 0.7, ease: "easeIn" } } : { y: 0, opacity: 1 }}
            >
              <Rocket className="h-5 w-5 text-[var(--sunrise)] transition-transform group-hover:-translate-y-0.5" style={{ transform: launching ? "rotate(-45deg)" : "rotate(0deg)" }} />
            </motion.button>
          </div>
        </div>
      </div>
    </footer>
  );
}
