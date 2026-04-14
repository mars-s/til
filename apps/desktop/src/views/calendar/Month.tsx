import { useMemo, useState } from "react";
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
import { type CalendarEvent, type Task } from "../../lib/invoke";

interface MonthViewProps {
  events: CalendarEvent[];
  tasks: Task[];
  onDayClick?: (date: Date) => void;
}

export default function MonthView({ events, tasks, onDayClick }: MonthViewProps) {
  const [current, setCurrent] = useState(() => new Date());
  const today = new Date();

  const weeks = useMemo(() => buildCalendarWeeks(current), [current]);

  const eventsOnDay = (day: Date) =>
    events.filter((ev) => isSameDay(parseISO(ev.start_at), day));

  const tasksOnDay = (day: Date) =>
    tasks.filter((t) => t.scheduled_at && isSameDay(parseISO(t.scheduled_at), day));

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Header */}
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
          onClick={() =>
            setCurrent((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))
          }
          style={{
            padding: "4px 10px",
            background: "var(--smoke)",
            border: "1px solid var(--border-2)",
            borderRadius: "var(--r-sm)",
            color: "var(--text-2)",
            fontFamily: "var(--font-ui)",
            fontSize: 12,
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "var(--ink-4)";
            (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "var(--smoke)";
            (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border-2)";
          }}
        >
          ← Prev
        </button>

        <span
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 18,
            fontStyle: "italic",
            color: "var(--text-1)",
          }}
        >
          {format(current, "MMMM yyyy")}
        </span>

        <div style={{ display: "flex", gap: 6 }}>
          <button
            onClick={() => setCurrent(new Date())}
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
            onClick={() =>
              setCurrent((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))
            }
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

      {/* Day-of-week header */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          flexShrink: 0,
          borderBottom: "1px solid var(--border)",
          background: "var(--ink-2)",
        }}
      >
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div
            key={d}
            style={{
              padding: "8px 0",
              textAlign: "center",
              fontFamily: "var(--font-ui)",
              fontSize: 11,
              color: "var(--text-3)",
              letterSpacing: "0.05em",
              textTransform: "uppercase",
            }}
          >
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div
        style={{
          flex: 1,
          display: "grid",
          gridTemplateRows: "repeat(6, 1fr)",
          overflow: "hidden",
        }}
      >
        {weeks.map((week, wi) => (
          <div
            key={wi}
            style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}
          >
            {week.map((day, di) => {
              const dayEvents = eventsOnDay(day);
              const isToday = isSameDay(day, today);
              const inMonth = isSameMonth(day, current);

              return (
                <div
                  key={di}
                  onClick={() => onDayClick?.(day)}
                  style={{
                    padding: "6px 4px",
                    cursor: "pointer",
                    borderRight: di < 6 ? "1px solid var(--border)" : undefined,
                    borderBottom: wi < 5 ? "1px solid var(--border)" : undefined,
                    background: isToday ? "rgba(232,168,66,0.04)" : "transparent",
                    minHeight: 72,
                    transition: "background 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    if (!isToday) (e.currentTarget as HTMLDivElement).style.background = "var(--ink-3)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLDivElement).style.background = isToday
                      ? "rgba(232,168,66,0.04)"
                      : "transparent";
                  }}
                >
                  {/* Day number */}
                  <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 3 }}>
                    <span
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontFamily: "var(--font-ui)",
                        fontSize: 12,
                        fontWeight: isToday ? 600 : 400,
                        background: isToday ? "var(--amber)" : "transparent",
                        color: isToday
                          ? "var(--ink)"
                          : inMonth
                          ? "var(--text-2)"
                          : "var(--text-4)",
                      }}
                    >
                      {format(day, "d")}
                    </span>
                  </div>

                  {/* Event pills */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    {dayEvents.slice(0, 3).map((ev) => {
                      const color = ev.color ?? "var(--sky)";
                      return (
                        <div
                          key={ev.id}
                          title={ev.title}
                          style={{
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            fontFamily: "var(--font-ui)",
                            fontSize: 10,
                            padding: "1px 5px",
                            borderRadius: 3,
                            background: ev.is_suggestion ? "transparent" : `${color}28`,
                            border: ev.is_suggestion ? `1px dashed ${color}` : "none",
                            color,
                          }}
                        >
                          {ev.title}
                        </div>
                      );
                    })}
                    {dayEvents.length > 3 && (
                      <div
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: 10,
                          color: "var(--text-4)",
                          paddingLeft: 4,
                        }}
                      >
                        +{dayEvents.length - 3}
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
