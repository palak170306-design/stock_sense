"use client";

import { useState } from "react";
import { typeLabel } from "@/components/stock";
import type { DashboardData, DocumentType } from "@/lib/client/api";

type Day = DashboardData["movesLast7Days"][number];

const dayLabel = new Intl.DateTimeFormat(undefined, { weekday: "short", timeZone: "UTC" });
const fullLabel = new Intl.DateTimeFormat(undefined, { weekday: "long", month: "short", day: "numeric", timeZone: "UTC" });
const TYPES: DocumentType[] = ["RECEIPT", "DELIVERY", "INTERNAL", "ADJUSTMENT"];

/**
 * "Completed stock moves, last 7 days": one series, so one hue and no legend
 * (the title names it). It counts MOVES rather than units because products
 * use different units (pcs, ream, box) that can't be meaningfully summed.
 *
 * Built with plain HTML/CSS rather than a chart library: seven columns don't
 * justify the bundle. Mark specs: ≤24px columns, 4px rounded data-end, square
 * at the hairline baseline; value on each cap; per-column hover/focus tooltip
 * (value first, then date and per-type breakdown); a table view for keyboard,
 * screen-reader and no-hover access. Series colour is the validated reference
 * blue (#2a78d6 light / #3987e5 dark, ≥3:1 on both surfaces). Text never
 * wears the series colour.
 */
export function MovesChart({ days }: { days: Day[] }) {
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(1, ...days.map((d) => d.count));
  const total = days.reduce((s, d) => s + d.count, 0);

  return (
    <figure className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <figcaption className="mb-4 flex items-baseline justify-between gap-2">
        <span className="text-sm font-semibold">Completed stock moves, last 7 days</span>
        <span className="text-xs text-zinc-500 tabular-nums">{total} total</span>
      </figcaption>

      <div className="relative">
        {/* Plot: columns grow from a single hairline baseline. */}
        <div className="flex h-36 items-end justify-between gap-1 border-b border-zinc-200 dark:border-zinc-800" role="list">
          {days.map((d, i) => {
            const pct = (d.count / max) * 100;
            return (
              // The whole column slot is the hit target, bigger than the bar.
              <button
                key={d.date}
                type="button"
                role="listitem"
                aria-label={`${fullLabel.format(new Date(d.date))}: ${d.count} moves`}
                onPointerEnter={() => setActive(i)}
                onPointerLeave={() => setActive(null)}
                onFocus={() => setActive(i)}
                onBlur={() => setActive(null)}
                className="group relative flex h-full flex-1 cursor-default flex-col items-center justify-end outline-none"
              >
                <span className="mb-1 text-xs tabular-nums text-zinc-600 dark:text-zinc-400">{d.count > 0 ? d.count : ""}</span>
                <span
                  className="w-full max-w-6 rounded-t-[4px] bg-[#2a78d6] transition group-hover:brightness-110 group-focus-visible:ring-2 group-focus-visible:ring-zinc-400 dark:bg-[#3987e5]"
                  style={{ height: d.count > 0 ? `max(${pct}%, 2px)` : 0 }}
                />
              </button>
            );
          })}
        </div>
        <div className="mt-1 flex justify-between gap-1">
          {days.map((d) => (
            <span key={d.date} className="flex-1 text-center text-xs text-zinc-500">{dayLabel.format(new Date(d.date))}</span>
          ))}
        </div>

        {active !== null && (
          <div
            role="tooltip"
            className="pointer-events-none absolute top-0 z-10 w-40 rounded-md border border-zinc-200 bg-white p-2 text-xs shadow-md dark:border-zinc-700 dark:bg-zinc-900"
            // Outer columns: sit BESIDE the hovered column (never over it, never
            // spilling outside the card). Middle columns: centred above it.
            style={
              active <= 1
                ? { left: `${((active + 1) / days.length) * 100}%` }
                : active >= days.length - 2
                  ? { right: `${((days.length - active) / days.length) * 100}%` }
                  : { left: `${((active + 0.5) / days.length) * 100}%`, transform: "translateX(-50%)" }
            }
          >
            <p className="text-sm font-semibold tabular-nums">{days[active].count} moves</p>
            <p className="text-zinc-500">{fullLabel.format(new Date(days[active].date))}</p>
            {days[active].count > 0 && (
              <ul className="mt-1 space-y-0.5">
                {TYPES.filter((t) => days[active].byType[t]).map((t) => (
                  <li key={t} className="flex justify-between">
                    <span className="text-zinc-600 dark:text-zinc-400">{typeLabel(t)}</span>
                    <span className="tabular-nums">{days[active].byType[t]}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <details className="mt-3 text-xs">
        <summary className="cursor-pointer text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200">Show as table</summary>
        <table className="mt-2 w-full text-left">
          <thead className="text-zinc-500">
            <tr>
              <th className="py-1 font-medium">Day</th>
              {TYPES.map((t) => <th key={t} className="py-1 text-right font-medium">{typeLabel(t)}</th>)}
              <th className="py-1 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {days.map((d) => (
              <tr key={d.date} className="border-t border-zinc-100 dark:border-zinc-800">
                <td className="py-1">{fullLabel.format(new Date(d.date))}</td>
                {TYPES.map((t) => <td key={t} className="py-1 text-right tabular-nums">{d.byType[t] ?? 0}</td>)}
                <td className="py-1 text-right font-medium tabular-nums">{d.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
