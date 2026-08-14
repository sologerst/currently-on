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
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl">Calendar</h1>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() =>
              setCursor(
                new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1),
              )
            }
          >
            ‹
          </button>
          <span className="font-mono text-sm">
            {cursor.toLocaleString("en", { month: "short", year: "numeric" })}
          </span>
          <button
            type="button"
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
      <div className="mt-4 grid grid-cols-7 gap-1 text-center font-mono text-[10px] text-black/40">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <div key={i}>{d}</div>
        ))}
        {cells.map((day, i) => {
          if (!day) return <div key={`e-${i}`} />;
          const iso = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const dots = byDay[iso] || [];
          return (
            <button
              key={iso}
              type="button"
              onClick={() => setSelected(iso)}
              className={`min-h-12 rounded-xl border text-sm ${selected === iso ? "border-black/30" : "border-transparent"}`}
            >
              {day}
              <div className="mt-1 flex justify-center gap-0.5">
                {dots.slice(0, 4).map((it) => (
                  <span
                    key={it.id}
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ background: CATEGORY_META[it.kind].hex }}
                  />
                ))}
              </div>
            </button>
          );
        })}
      </div>
      <section className="mt-4 rounded-2xl border border-black/8 bg-[#F6F7F9] p-3">
        <p className="font-mono text-[10px] uppercase text-black/40">
          {selectedIso || "Pick a day"}
        </p>
        {dayItems.length === 0 && (
          <p className="text-sm text-black/45">No releases this day.</p>
        )}
        {dayItems.map((it) => (
          <p key={it.id} className="text-sm">
            <span style={{ color: CATEGORY_META[it.kind].hex }}>●</span>{" "}
            {it.name} · {it.nextLabel || CATEGORY_META[it.kind].label}
          </p>
        ))}
      </section>
    </div>
  );
}
