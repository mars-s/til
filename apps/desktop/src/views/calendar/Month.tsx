import React, { useMemo, useState } from "react";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  addDays,
  isSameDay,
  isSameMonth,
  parseISO,
  format,
} from "../../lib/dateUtils";
import { type CalendarEvent } from "../../lib/invoke";

interface MonthViewProps {
  events: CalendarEvent[];
  onDayClick?: (date: Date) => void;
}

export default function MonthView({ events, onDayClick }: MonthViewProps) {
  const [current, setCurrent] = useState(() => new Date());
  const today = new Date();

  const weeks = useMemo(() => buildCalendarWeeks(current), [current]);

  const eventsOnDay = (day: Date) =>
    events.filter((ev) => isSameDay(parseISO(ev.start_at), day));

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-2 flex-shrink-0"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <button
          className="px-3 py-1.5 rounded text-sm"
          style={{ background: "var(--surface-hover)", color: "var(--text-primary)" }}
          onClick={() =>
            setCurrent((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))
          }
        >
          ← Prev
        </button>
        <h2 className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
          {format(current, "MMMM yyyy")}
        </h2>
        <div className="flex gap-2">
          <button
            className="px-3 py-1.5 rounded text-sm"
            style={{ background: "var(--surface-hover)", color: "var(--text-primary)" }}
            onClick={() => setCurrent(new Date())}
          >
            Today
          </button>
          <button
            className="px-3 py-1.5 rounded text-sm"
            style={{ background: "var(--surface-hover)", color: "var(--text-primary)" }}
            onClick={() =>
              setCurrent((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))
            }
          >
            Next →
          </button>
        </div>
      </div>

      {/* Day-of-week header */}
      <div
        className="grid grid-cols-7 flex-shrink-0"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div
            key={d}
            className="py-2 text-center text-xs font-medium"
            style={{ color: "var(--text-secondary)" }}
          >
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="flex-1 grid grid-rows-6 overflow-hidden">
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7">
            {week.map((day, di) => {
              const dayEvents = eventsOnDay(day);
              const isToday = isSameDay(day, today);
              const inMonth = isSameMonth(day, current);

              return (
                <div
                  key={di}
                  className="p-1 cursor-pointer"
                  style={{
                    borderRight: di < 6 ? "1px solid var(--border)" : undefined,
                    borderBottom: wi < 5 ? "1px solid var(--border)" : undefined,
                    background: isToday ? "rgba(59,130,246,0.05)" : "transparent",
                    minHeight: "80px",
                  }}
                  onClick={() => onDayClick?.(day)}
                >
                  {/* Day number */}
                  <div className="flex items-start justify-end">
                    <span
                      className="w-6 h-6 rounded-full flex items-center justify-center text-xs"
                      style={{
                        background: isToday ? "var(--accent)" : "transparent",
                        color: isToday
                          ? "#fff"
                          : inMonth
                          ? "var(--text-primary)"
                          : "var(--text-secondary)",
                        fontWeight: isToday ? "600" : "400",
                      }}
                    >
                      {format(day, "d")}
                    </span>
                  </div>

                  {/* Event dots */}
                  <div className="flex flex-col gap-0.5 mt-0.5">
                    {dayEvents.slice(0, 3).map((ev) => {
                      const color = ev.color ?? "var(--accent)";
                      return (
                        <div
                          key={ev.id}
                          className="truncate text-xs px-1 py-0.5 rounded"
                          style={{
                            background: ev.is_suggestion
                              ? "transparent"
                              : `${color}33`,
                            border: ev.is_suggestion
                              ? `1px dashed ${color}`
                              : "none",
                            color,
                          }}
                          title={ev.title}
                        >
                          {ev.title}
                        </div>
                      );
                    })}
                    {dayEvents.length > 3 && (
                      <div
                        className="text-xs px-1"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        +{dayEvents.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function buildCalendarWeeks(date: Date): Date[][] {
  const first = startOfMonth(date);
  const last = endOfMonth(date);
  const start = startOfWeek(first);

  const weeks: Date[][] = [];
  let current = start;

  while (current <= last || weeks.length < 6) {
    const week: Date[] = [];
    for (let i = 0; i < 7; i++) {
      week.push(new Date(current));
      current = addDays(current, 1);
    }
    weeks.push(week);
    if (weeks.length >= 6) break;
  }

  return weeks;
}
