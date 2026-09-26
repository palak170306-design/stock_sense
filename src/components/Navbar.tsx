"use client";

import * as React from "react";
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "framer-motion";
import { useTheme } from "next-themes";
import { Menu, X, RotateCcw, TrendingUp, Moon, Sun } from "lucide-react";
import { Magnetic, EASE_OUT } from "@/lib/anim";
import { useUIStore } from "@/store/ui";

const LINKS = [
  { label: "Features", href: "#features" },
  { label: "Markets", href: "#markets" },
  { label: "Radar", href: "#radar" },
  { label: "Watchlist", href: "#watchlist" },
  { label: "Journey", href: "#journey" },
];

function RollingLink({ label, href }: { label: string; href: string }) {
  return (
    <a href={href} className="roll-link text-sm font-semibold text-foreground/70 transition-colors hover:text-foreground" data-cursor-label="Go">
      <span className="roll-inner">
        <span>{label}</span>
        <span className="text-gradient">{label}</span>
      </span>
    </a>
  );
}

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  const isDark = mounted && theme === "dark";
  return (
    <Magnetic strength={0.25}>
      <button
        onClick={() => setTheme(isDark ? "light" : "dark")}
        aria-label="Toggle dark mode"
        data-cursor-label={isDark ? "Light" : "Dark"}
        className="glass relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-full transition-transform hover:scale-105 active:scale-95"
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={isDark ? "moon" : "sun"}
            initial={{ y: 18, rotate: -120, opacity: 0 }}
            animate={{ y: 0, rotate: 0, opacity: 1 }}
            exit={{ y: -18, rotate: 120, opacity: 0 }}
            transition={{ duration: 0.45, ease: EASE_OUT }}
            className="block"
          >
            {isDark ? <Moon className="h-[18px] w-[18px] text-[var(--lemon)]" /> : <Sun className="h-[18px] w-[18px] text-[var(--sunrise)]" />}
          </motion.span>
        </AnimatePresence>
      </button>
    </Magnetic>
  );
}

export default function Navbar() {
  const [scrolled, setScrolled] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const { scrollY } = useScroll();
  const replayIntro = useUIStore((s) => s.replayIntro);

  useMotionValueEvent(scrollY, "change", (v) => setScrolled(v > 40));

  React.useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <motion.header
        className="fixed inset-x-0 top-0 z-[70]"
        initial={{ y: -90, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.25, duration: 0.9, ease: EASE_OUT }}
      >
        <div
          className={`mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 transition-all duration-500 sm:px-6 ${
            scrolled ? "py-2.5" : "py-4"
          }`}
        >
          {/* logo */}
          <a href="#top" className="group flex items-center gap-2.5" aria-label="Stock Sense home" data-cursor-label="Home">
            <motion.span
              className="glass flex h-10 w-10 items-center justify-center rounded-xl"
              whileHover={{ rotate: [0, -10, 10, 0], scale: 1.1 }}
              transition={{ duration: 0.5 }}
            >
              <TrendingUp className="h-5 w-5 text-gradient" strokeWidth={2.6} />
            </motion.span>
            <span className="text-lg font-extrabold tracking-tight">
              Stock<span className="text-gradient">Sense</span>
            </span>
          </a>

          {/* desktop links */}
          <nav
            className={`glass hidden items-center gap-7 rounded-full px-7 py-2.5 transition-all duration-500 lg:flex ${
              scrolled ? "shadow-soft" : ""
            }`}
            aria-label="Primary"
          >
            {LINKS.map((l) => (
              <RollingLink key={l.label} {...l} />
            ))}
          </nav>

          <div className="flex items-center gap-2.5">
            <button
              onClick={replayIntro}
              data-cursor-label="Replay"
              className="glass hidden h-10 items-center gap-2 rounded-full px-4 font-grotesk text-[11px] font-bold uppercase tracking-[0.16em] text-foreground/70 transition-all hover:scale-[1.04] hover:text-foreground active:scale-95 md:flex"
              aria-label="Replay intro animation"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Replay Intro
            </button>
            <ThemeToggle />
            <Magnetic strength={0.3} className="hidden sm:inline-block">
              <a
                href="#cta"
                data-cursor-label="Go"
                className="btn-shine inline-flex h-10 items-center rounded-full bg-gradient-to-r from-[var(--sunrise)] to-[var(--rose)] px-5 text-sm font-bold text-white shadow-[0_8px_24px_-8px] shadow-[color-mix(in_srgb,var(--rose)_60%,transparent)] transition-transform hover:scale-[1.04] active:scale-95"
              >
                Get Started
              </a>
            </Magnetic>
            {/* mobile burger */}
            <button
              onClick={() => setOpen(true)}
              className="glass flex h-10 w-10 items-center justify-center rounded-full lg:hidden"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </motion.header>

      {/* mobile fullscreen menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-[85] flex flex-col bg-[var(--background)]/85 backdrop-blur-2xl lg:hidden"
            initial={{ clipPath: "circle(0% at 92% 6%)", opacity: 0.4 }}
            animate={{ clipPath: "circle(140% at 92% 6%)", opacity: 1 }}
            exit={{ clipPath: "circle(0% at 92% 6%)", opacity: 0.4 }}
            transition={{ duration: 0.65, ease: EASE_OUT }}
          >
            <div className="flex items-center justify-between px-5 py-4">
              <span className="text-lg font-extrabold">
                Stock<span className="text-gradient">Sense</span>
              </span>
              <button onClick={() => setOpen(false)} className="glass flex h-10 w-10 items-center justify-center rounded-full" aria-label="Close menu">
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex flex-1 flex-col items-start justify-center gap-2 px-8" aria-label="Mobile">
              {LINKS.map((l, i) => (
                <motion.a
                  key={l.label}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="py-2 text-4xl font-extrabold tracking-tight text-foreground/85 active:text-gradient"
                  initial={{ opacity: 0, x: -40 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 + i * 0.07, duration: 0.6, ease: EASE_OUT }}
                >
                  <span className="mr-3 font-grotesk text-sm text-[var(--rose)]">0{i + 1}</span>
                  {l.label}
                </motion.a>
              ))}
              <motion.button
                onClick={() => {
                  setOpen(false);
                  replayIntro();
                }}
                className="mt-6 flex items-center gap-2 rounded-full border border-[var(--border)] px-5 py-3 font-grotesk text-xs font-bold uppercase tracking-[0.2em]"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.55 }}
              >
                <RotateCcw className="h-4 w-4" /> Replay Intro
              </motion.button>
            </nav>
            <motion.div
              className="px-8 pb-10"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <a
                href="#cta"
                onClick={() => setOpen(false)}
                className="flex h-12 w-full items-center justify-center rounded-full bg-gradient-to-r from-[var(--sunrise)] to-[var(--rose)] text-base font-bold text-white"
              >
                Get Started — It's Free
              </a>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
