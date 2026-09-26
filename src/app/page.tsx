"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useUIStore } from "@/store/ui";
import Intro from "@/components/IntroOverlay";
import CustomCursor, { ScrollProgress } from "@/components/CustomCursor";
import Navbar from "@/components/Navbar";
import Hero from "@/components/sections/Hero";
import TickerMarquee from "@/components/sections/TickerMarquee";
import StatsBand from "@/components/sections/StatsBand";
import Features from "@/components/sections/Features";
import Heatmap from "@/components/sections/Heatmap";
import InsightsRadar from "@/components/sections/InsightsRadar";
import Watchlist from "@/components/sections/Watchlist";
import HowItWorks from "@/components/sections/HowItWorks";
import Testimonials from "@/components/sections/Testimonials";
import CTA from "@/components/sections/CTA";
import Footer from "@/components/sections/Footer";

export default function Home() {
  const introDone = useUIStore((s) => s.introDone);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    try {
      // returning visitor this session → skip straight to the site
      if (sessionStorage.getItem("ss_intro_done") === "1") {
        useUIStore.getState().finishIntro();
      }
    } catch {
      /* ignore */
    }
  }, []);

  const showIntro = mounted && !introDone;
  const showSite = !mounted || introDone;

  return (
    <div className="grain relative min-h-screen">
      <div className="relative flex min-h-screen flex-col">
        {showSite && (
          <>
            {/* fixed chrome lives OUTSIDE the reveal wrapper so transforms
                never hijack their fixed positioning */}
            <ScrollProgress />
            <Navbar />
            {/* cinematic entrance of the site content after the intro dive */}
            <motion.div
              initial={mounted ? { opacity: 0, scale: 1.035, filter: "blur(6px)" } : false}
              animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
              transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
              className="flex min-h-screen flex-col"
            >
              <main className="flex-1">
                <Hero />
                <TickerMarquee />
                <StatsBand />
                <Features />
                <Heatmap />
                <InsightsRadar />
                <Watchlist />
                <HowItWorks />
                <Testimonials />
                <CTA />
              </main>
              <Footer />
            </motion.div>
          </>
        )}
      </div>

      {/* cinematic intro overlay */}
      <AnimatePresence>{showIntro && <Intro key="intro" />}</AnimatePresence>

      {/* custom cinematic cursor */}
      <CustomCursor />

      {/* pre-hydration splash */}
      {!mounted && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-[var(--background)]">
          <motion.span
            className="font-grotesk text-xs font-bold uppercase tracking-[0.4em] text-foreground/40"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.6, repeat: Infinity }}
          >
            Stock Sense
          </motion.span>
        </div>
      )}
    </div>
  );
}
