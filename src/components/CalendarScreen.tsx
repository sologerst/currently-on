"use client";

import { useMemo, useState } from "react";
import { CATEGORY_META } from "@/lib/categories";
import { upcomingIso, upcomingItems } from "@/lib/catalog";

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function CalendarScreen() {
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));
  const [selected, setSelected] = useState<string | null>(null);
  const items = upcomingItems();

  const cells = useMemo(() => {
    const first = startOfMonth(cursor);
    const startDow = first.getDay();
    const days = new Date(
      cursor.getFullYear(),
      cursor.getMonth() + 1,
      0,
    ).getDate();
    const grid: (number | null)[] = [
      ...Array(startDow).fill(null),
      ...Array.from({ length: days }, (_, i) => i + 1),
    ];
    return grid;
  }, [cursor]);

  const byDay = useMemo(() => {
    const map: Record<string, typeof items> = {};
    for (const item of items) {
      const iso = upcomingIso(item);
      if (!iso.startsWith(`${cursor.getFullYear()}-`)) continue;
      const month = Number(iso.slice(5, 7));
      if (month !== cursor.getMonth() + 1) continue;
      map[iso] = map[iso] || [];
      map[iso].push(item);
    }
    return map;
  }, [items, cursor]);

  const selectedIso = selected;
  const dayItems = selectedIso ? byDay[selectedIso] || [] : [];

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-[2.4rem] leading-none">Calendar</h1>
        <div className="flex items-center gap-1 rounded-full bg-[var(--surface-2)] p-1">
          <button
            type="button"
            className="pressable grid h-8 w-8 place-items-center rounded-full"
            onClick={() =>
              setCursor(
                new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1),
              )
            }
          >
            ‹
          </button>
          <span className="min-w-24 text-center font-mono text-xs">
            {cursor.toLocaleString("en", { month: "short", year: "numeric" })}
          </span>
          <button
            type="button"
            className="pressable grid h-8 w-8 place-items-center rounded-full"
            onClick={() =>
              setCursor(
                new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1),
              )
            }
          >
            ›
          </button>
        </div>
      </div>

      <div className="mt-5 rounded-[1.35rem] bg-surface p-3">
        <div className="grid grid-cols-7 gap-1 text-center font-mono text-[10px] text-muted">
          {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
            <div key={i} className="py-1">
              {d}
            </div>
          ))}
          {cells.map((day, i) => {
            if (!day) return <div key={`e-${i}`} />;
            const iso = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const dots = byDay[iso] || [];
            const active = selected === iso;
            return (
              <button
                key={iso}
                type="button"
                onClick={() => setSelected(iso)}
                className={`pressable min-h-12 rounded-2xl text-sm ${
                  active
                    ? "bg-foreground text-white"
                    : "hover:bg-[var(--surface-2)]"
                }`}
              >
                {day}
                <div className="mt-1 flex justify-center gap-0.5">
                  {dots.slice(0, 4).map((it) => (
                    <span
                      key={it.id}
                      className="h-1.5 w-1.5 rounded-full"
                      style={{
                        background: active
                          ? "#fff"
                          : CATEGORY_META[it.kind].hex,
                      }}
                    />
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <section className="mt-4 rounded-[1.35rem] bg-surface p-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
          {selectedIso || "Pick a day"}
        </p>
        {dayItems.length === 0 && (
          <p className="mt-2 text-sm text-muted">No releases this day.</p>
        )}
        <ul className="mt-2 space-y-2">
          {dayItems.map((it) => (
            <li key={it.id} className="flex items-center gap-2 text-sm">
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: CATEGORY_META[it.kind].hex }}
              />
              <span className="font-medium">{it.name}</span>
              <span className="text-muted">
                · {it.nextLabel || CATEGORY_META[it.kind].label}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
