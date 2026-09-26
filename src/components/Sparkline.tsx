"use client";

import * as React from "react";
import { useInView } from "framer-motion";

/** Animated sparkline SVG — draws itself when scrolled into view. */
export default function Sparkline({
  data,
  up = true,
  w = 120,
  h = 36,
  strokeWidth = 2.2,
  animate = true,
  fill = true,
  className,
}: {
  data: number[];
  up?: boolean;
  w?: number;
  h?: number;
  strokeWidth?: number;
  animate?: boolean;
  fill?: boolean;
  className?: string;
}) {
  const ref = React.useRef<SVGSVGElement>(null);
  const inView = useInView(ref, { once: true, margin: "-30px" });
  const id = React.useId().replace(/[:]/g, "");

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * (w - 4) + 2;
    const y = h - 3 - ((v - min) / range) * (h - 8);
    return [x, y] as const;
  });
  const d = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const areaD = `${d} L${w - 2},${h} L2,${h} Z`;

  const color = up ? "var(--up)" : "var(--down)";

  return (
    <svg ref={ref} width={w} height={h} viewBox={`0 0 ${w} ${h}`} className={className} aria-hidden>
      <defs>
        <linearGradient id={`sg-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {fill && (
        <path
          d={areaD}
          fill={`url(#sg-${id})`}
          style={animate ? { opacity: inView ? 1 : 0, transition: "opacity 1s ease 0.5s" } : undefined}
        />
      )}
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
        style={
          animate
            ? {
                strokeDasharray: 1,
                strokeDashoffset: inView ? 0 : 1,
                transition: "stroke-dashoffset 1.6s cubic-bezier(0.22,1,0.36,1)",
              }
            : undefined
        }
      />
      {/* head dot */}
      <circle
        cx={pts[pts.length - 1][0]}
        cy={pts[pts.length - 1][1]}
        r={2.6}
        fill={color}
        style={animate ? { opacity: inView ? 1 : 0, transition: "opacity 0.4s ease 1.4s" } : undefined}
      />
    </svg>
  );
}
