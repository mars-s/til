import { useCallback, useEffect, useMemo, useState } from "react";
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

const HOUR_HEIGHT = 56; // px per hour
const HOURS = Array.from({ length: 24 }, (_, i) => i);

interface WeekViewProps {
  events: CalendarEvent[];
  onDayClick?: (date: Date) => void;
}

export default function WeekView({ events, onDayClick }: WeekViewProps) {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );

  const today = new Date();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      if (e.key === "ArrowLeft") setWeekStart((w) => subWeeks(w, 1));
      if (e.key === "ArrowRight") setWeekStart((w) => addWeeks(w, 1));
      if (e.key === "t") setWeekStart(startOfWeek(new Date()));

      const num = parseInt(e.key, 10);
      if (num >= 1 && num <= 7) {
        const col = document.getElementById(`week-col-${num - 1}`);
        col?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const eventsForDay = useCallback(
    (day: Date) => events.filter((ev) => isSameDay(parseISO(ev.start_at), day)),
    [events],
  );

  const weekLabel = `${format(days[0], "MMM d")} – ${format(days[6], "MMM d, yyyy")}`;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Week navigation header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 16px",
          flexShrink: 0,
          borderBottom: "1px solid var(--border)",
          background: "var(--ink-2)",
        }}
      >
        <button
          onClick={() => setWeekStart((w) => subWeeks(w, 1))}
          style={{
            padding: "4px 10px",
            background: "var(--smoke)",
            border: "1px solid var(--border-2)",
            borderRadius: "var(--r-sm)",
            color: "var(--text-2)",
            fontFamily: "var(--font-ui)",
            fontSize: 12,
            cursor: "pointer",
          }}
        >
          ← Prev
        </button>

        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            color: "var(--text-2)",
            letterSpacing: "0.02em",
          }}
        >
          {weekLabel}
        </span>

        <div style={{ display: "flex", gap: 6 }}>
          <button
            onClick={() => setWeekStart(startOfWeek(new Date()))}
            style={{
              padding: "4px 10px",
              background: "var(--smoke)",
              border: "1px solid var(--border-2)",
              borderRadius: "var(--r-sm)",
              color: "var(--amber)",
              fontFamily: "var(--font-ui)",
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            Today
          </button>
          <button
            onClick={() => setWeekStart((w) => addWeeks(w, 1))}
            style={{
              padding: "4px 10px",
              background: "var(--smoke)",
              border: "1px solid var(--border-2)",
              borderRadius: "var(--r-sm)",
              color: "var(--text-2)",
              fontFamily: "var(--font-ui)",
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            Next →
          </button>
        </div>
      </div>

      {/* Day column headers */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "52px repeat(7, 1fr)",
          flexShrink: 0,
          borderBottom: "1px solid var(--border)",
          background: "var(--ink-2)",
        }}
      >
        <div /> {/* Gutter */}
        {days.map((day, i) => {
          const isToday = isSameDay(day, today);
          return (
            <div
              key={i}
              id={`week-col-${i}`}
              style={{
                padding: "10px 0 8px",
                textAlign: "center",
                cursor: "pointer",
                borderLeft: i > 0 ? "1px solid var(--border)" : undefined,
              }}
              onClick={() => onDayClick?.(day)}
            >
              <div
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: 11,
                  color: isToday ? "var(--amber)" : "var(--text-3)",
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                  marginBottom: 4,
                }}
              >
                {format(day, "EEE")}
              </div>
              <div
                style={{
                  width: 28,
                  height: 28,
                  margin: "0 auto",
                  borderRadius: "50%",
                  background: isToday ? "var(--amber)" : "transparent",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "var(--font-ui)",
                  fontSize: 16,
                  fontWeight: isToday ? 600 : 400,
                  color: isToday ? "var(--ink)" : "var(--text-2)",
                }}
              >
                {format(day, "d")}
              </div>
            </div>
          );
        })}
      </div>

      {/* Scrollable time grid */}
      <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "52px repeat(7, 1fr)",
            minHeight: `${HOUR_HEIGHT * 24}px`,
          }}
        >
          {/* Hour labels gutter */}
          <div style={{ position: "relative" }}>
            {HOURS.map((hour) => (
              <div
                key={hour}
                style={{
                  position: "absolute",
                  right: 8,
                  top: hour * HOUR_HEIGHT - 7,
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  color: "var(--text-4)",
                  userSelect: "none",
                  textAlign: "right",
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
                style={{
                  position: "relative",
                  height: `${HOUR_HEIGHT * 24}px`,
                  borderLeft: "1px solid var(--border)",
                  background: isToday ? "rgba(232,168,66,0.025)" : "transparent",
                }}
              >
                {/* Hour lines (horizontal only) */}
                {HOURS.map((hour) => (
                  <div
                    key={hour}
                    style={{
                      position: "absolute",
                      left: 0,
                      right: 0,
                      top: hour * HOUR_HEIGHT,
                      borderTop: "1px solid rgba(255,255,255,0.04)",
                    }}
                  />
                ))}

                {/* Current time indicator */}
                {isToday && <CurrentTimeLine />}

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
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top,
        zIndex: 10,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          height: "1.5px",
          background: "var(--rose)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: -3,
          top: -3,
          width: 7,
          height: 7,
          borderRadius: "50%",
          background: "var(--rose)",
        }}
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
