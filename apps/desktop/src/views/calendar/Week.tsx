import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  startOfWeek,
  addDays,
  addWeeks,
  subWeeks,
  isSameDay,
  parseISO,
  format,
  startOfDay,
} from "../../lib/dateUtils";
import EventBlock from "../../components/EventBlock";
import { type CalendarEvent } from "../../lib/invoke";

const HOUR_HEIGHT = 60; // px per hour
const HOURS = Array.from({ length: 24 }, (_, i) => i);

interface WeekViewProps {
  events: CalendarEvent[];
  onDayClick?: (date: Date) => void;
}

export default function WeekView({ events, onDayClick }: WeekViewProps) {
  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(new Date())
  );

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  const today = new Date();

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      if (e.key === "ArrowLeft") setWeekStart((w) => subWeeks(w, 1));
      if (e.key === "ArrowRight") setWeekStart((w) => addWeeks(w, 1));
      if (e.key === "t") setWeekStart(startOfWeek(new Date()));

      // 1–7 keys scroll to that day column
      const num = parseInt(e.key, 10);
      if (num >= 1 && num <= 7) {
        const col = document.getElementById(`week-col-${num - 1}`);
        col?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Get events for a specific day
  const eventsForDay = useCallback(
    (day: Date) =>
      events.filter((ev) => isSameDay(parseISO(ev.start_at), day)),
    [events]
  );

  const weekLabel = `${format(days[0], "MMM d")} – ${format(days[6], "MMM d, yyyy")}`;

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
          onClick={() => setWeekStart((w) => subWeeks(w, 1))}
        >
          ← Prev
        </button>
        <h2 className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
          {weekLabel}
        </h2>
        <div className="flex gap-2">
          <button
            className="px-3 py-1.5 rounded text-sm"
            style={{ background: "var(--surface-hover)", color: "var(--text-primary)" }}
            onClick={() => setWeekStart(startOfWeek(new Date()))}
          >
            Today
          </button>
          <button
            className="px-3 py-1.5 rounded text-sm"
            style={{ background: "var(--surface-hover)", color: "var(--text-primary)" }}
            onClick={() => setWeekStart((w) => addWeeks(w, 1))}
          >
            Next →
          </button>
        </div>
      </div>

      {/* Day headers */}
      <div
        className="grid flex-shrink-0"
        style={{
          gridTemplateColumns: "56px repeat(7, 1fr)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div /> {/* Time gutter */}
        {days.map((day, i) => {
          const isToday = isSameDay(day, today);
          return (
            <div
              key={i}
              id={`week-col-${i}`}
              className="py-2 text-center text-xs font-medium cursor-pointer"
              style={{
                color: isToday ? "var(--accent)" : "var(--text-secondary)",
                borderLeft: i > 0 ? "1px solid var(--border)" : undefined,
              }}
              onClick={() => onDayClick?.(day)}
            >
              <div>{format(day, "EEE")}</div>
              <div
                className="mt-0.5 w-6 h-6 rounded-full mx-auto flex items-center justify-center"
                style={{
                  background: isToday ? "var(--accent)" : "transparent",
                  color: isToday ? "#fff" : "inherit",
                  fontSize: "13px",
                  fontWeight: isToday ? "600" : "400",
                }}
              >
                {format(day, "d")}
              </div>
            </div>
          );
        })}
      </div>

      {/* Scrollable time grid */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <div
          className="grid"
          style={{
            gridTemplateColumns: "56px repeat(7, 1fr)",
            minHeight: `${HOUR_HEIGHT * 24}px`,
          }}
        >
          {/* Hour labels */}
          <div className="relative">
            {HOURS.map((hour) => (
              <div
                key={hour}
                className="absolute right-2 text-xs"
                style={{
                  top: hour * HOUR_HEIGHT - 7,
                  color: "var(--text-secondary)",
                  userSelect: "none",
                }}
              >
                {hour === 0 ? "" : format12(hour)}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((day, di) => {
            const dayEvents = eventsForDay(day);
            const isToday = isSameDay(day, today);
            return (
              <div
                key={di}
                className="relative"
                style={{
                  height: `${HOUR_HEIGHT * 24}px`,
                  borderLeft: "1px solid var(--border)",
                  background: isToday ? "rgba(59,130,246,0.03)" : "transparent",
                }}
              >
                {/* Hour lines */}
                {HOURS.map((hour) => (
                  <div
                    key={hour}
                    className="absolute left-0 right-0"
                    style={{
                      top: hour * HOUR_HEIGHT,
                      borderTop: "1px solid var(--border)",
                      opacity: 0.5,
                    }}
                  />
                ))}

                {/* Current time indicator */}
                {isToday && (
                  <CurrentTimeLine />
                )}

                {/* Events */}
                {dayEvents.map((ev) => {
                  const { top, height } = eventPosition(ev);
                  return (
                    <EventBlock
                      key={ev.id}
                      event={ev}
                      top={top}
                      height={height}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function CurrentTimeLine() {
  const [top, setTop] = useState(getCurrentTimeTop);

  useEffect(() => {
    const interval = setInterval(() => setTop(getCurrentTimeTop()), 60_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className="absolute left-0 right-0 z-10 pointer-events-none"
      style={{ top }}
    >
      <div
        className="absolute left-0 right-0"
        style={{ height: "2px", background: "#ef4444" }}
      />
      <div
        className="absolute -left-1 w-2 h-2 rounded-full"
        style={{ background: "#ef4444", top: "-3px" }}
      />
    </div>
  );
}

function getCurrentTimeTop(): number {
  const now = new Date();
  const minutes = now.getHours() * 60 + now.getMinutes();
  return (minutes / 60) * HOUR_HEIGHT;
}

function eventPosition(ev: CalendarEvent): { top: number; height: number } {
  const start = new Date(ev.start_at);
  const end = new Date(ev.end_at);
  const dayStart = startOfDay(start);
  const startMinutes = (start.getTime() - dayStart.getTime()) / 60_000;
  const durationMinutes = (end.getTime() - start.getTime()) / 60_000;
  return {
    top: (startMinutes / 60) * HOUR_HEIGHT,
    height: Math.max((durationMinutes / 60) * HOUR_HEIGHT, 20),
  };
}

function format12(hour: number): string {
  if (hour === 12) return "12pm";
  return hour > 12 ? `${hour - 12}pm` : `${hour}am`;
}
