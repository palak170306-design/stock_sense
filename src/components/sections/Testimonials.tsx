"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Quote, Star } from "lucide-react";
import { SectionHeading, Reveal, EASE_OUT } from "@/lib/anim";

const QUOTES = [
  {
    text: "It genuinely feels like the market whispers to me now. I caught the Auto rotation two days before my trading group even noticed it.",
    name: "Ananya Sharma",
    role: "Swing trader · Pune",
    grad: "from-[#ffb27a] to-[#ff8fc0]",
  },
  {
    text: "I used to check six apps and three websites every morning. Now I open one calm dashboard and I already know where the money is flowing.",
    name: "Rohan Mehta",
    role: "Long-term investor · Mumbai",
    grad: "from-[#7cc9ff] to-[#8fe8c0]",
  },
  {
    text: "The Risk Guard alone paid for itself in a week. It silently trimmed my position the night before the dip — I almost didn't notice.",
    name: "Kavya Nair",
    role: "F&O enthusiast · Kochi",
    grad: "from-[#ffd884] to-[#ff9ec4]",
  },
  {
    text: "Beautiful, fast and eerily prescient. Watching the radar sweep and blip in real time is strangely meditative — trading de-stressed.",
    name: "Arjun Kapoor",
    role: "Quant hobbyist · Bengaluru",
    grad: "from-[#c9a8ff] to-[#7cc9ff]",
  },
];

export default function Testimonials() {
  const [idx, setIdx] = React.useState(0);
  const [dir, setDir] = React.useState(1);

  const go = (d: number) => {
    setDir(d);
    setIdx((i) => (i + d + QUOTES.length) % QUOTES.length);
  };

  React.useEffect(() => {
    const iv = setInterval(() => go(1), 5200);
    return () => clearInterval(iv);
  }, [idx]);

  const q = QUOTES[idx];

  return (
    <section className="relative overflow-hidden py-20 sm:py-28" aria-label="Testimonials">
      <div aria-hidden className="orb left-[10%] bottom-[10%] h-72 w-72 bg-[var(--pinkish)] opacity-60" />
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <SectionHeading
          chip="Wall of love"
          chipColor="rose"
          title="Traders who found their"
          accent="sixth sense"
        />

        <Reveal delay={2} className="mt-14">
          <div className="relative mx-auto max-w-3xl">
            <Quote className="absolute -top-6 left-1/2 h-12 w-12 -translate-x-1/2 text-[var(--rose)] opacity-25" aria-hidden />
            <div className="relative min-h-[300px] sm:min-h-[260px]">
              <AnimatePresence mode="wait" custom={dir}>
                <motion.figure
                  key={idx}
                  custom={dir}
                  initial={{ opacity: 0, x: dir * 80, rotateY: dir * -10, filter: "blur(8px)" }}
                  animate={{ opacity: 1, x: 0, rotateY: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, x: dir * -80, rotateY: dir * 10, filter: "blur(8px)" }}
                  transition={{ duration: 0.6, ease: EASE_OUT }}
                  className="glass flex h-full flex-col items-center rounded-[2rem] p-8 text-center shadow-soft sm:p-10"
                >
                  <blockquote className="text-pretty text-lg font-medium leading-relaxed sm:text-xl">
                    “{q.text}”
                  </blockquote>
                  <div className="mt-4 flex gap-1" aria-label="5 star rating">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <motion.span key={i} initial={{ scale: 0, rotate: -40 }} animate={{ scale: 1, rotate: 0 }} transition={{ delay: 0.25 + i * 0.07, type: "spring", stiffness: 300 }}>
                        <Star className="h-4 w-4 fill-[var(--sunrise)] text-[var(--sunrise)]" />
                      </motion.span>
                    ))}
                  </div>
                  <figcaption className="mt-5 flex items-center gap-3">
                    <motion.span
                      className={`flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br ${q.grad} font-grotesk text-sm font-bold text-white`}
                      whileHover={{ scale: 1.15, rotate: -6 }}
                    >
                      {q.name.split(" ").map((n) => n[0]).join("")}
                    </motion.span>
                    <span className="text-left">
                      <span className="block text-sm font-bold">{q.name}</span>
                      <span className="block text-xs text-muted-foreground">{q.role}</span>
                    </span>
                  </figcaption>
                </motion.figure>
              </AnimatePresence>
            </div>

            {/* controls */}
            <div className="mt-8 flex items-center justify-center gap-5">
              <motion.button onClick={() => go(-1)} aria-label="Previous testimonial" whileHover={{ scale: 1.12 }} whileTap={{ scale: 0.9 }} className="glass flex h-10 w-10 items-center justify-center rounded-full shadow-soft" data-cursor-label="Prev">
                <ChevronLeft className="h-5 w-5" />
              </motion.button>
              <div className="flex gap-2">
                {QUOTES.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setDir(i > idx ? 1 : -1);
                      setIdx(i);
                    }}
                    aria-label={`Go to testimonial ${i + 1}`}
                    className="group relative h-2.5 w-2.5"
                  >
                    <motion.span
                      className={`block h-full w-full rounded-full transition-colors ${i === idx ? "bg-gradient-to-r from-[var(--sunrise)] to-[var(--rose)]" : "bg-foreground/15 group-hover:bg-foreground/30"}`}
                      animate={{ scale: i === idx ? 1.35 : 1 }}
                    />
                  </button>
                ))}
              </div>
              <motion.button onClick={() => go(1)} aria-label="Next testimonial" whileHover={{ scale: 1.12 }} whileTap={{ scale: 0.9 }} className="glass flex h-10 w-10 items-center justify-center rounded-full shadow-soft" data-cursor-label="Next">
                <ChevronRight className="h-5 w-5" />
              </motion.button>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
