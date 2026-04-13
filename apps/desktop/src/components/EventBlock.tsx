import React from "react";
import { type CalendarEvent } from "../lib/invoke";

interface EventBlockProps {
  event: CalendarEvent;
  /** Height in pixels (calculated by caller from duration) */
  height: number;
  /** Top offset in pixels (calculated by caller from start time) */
  top: number;
  /** Width/left are managed by the column layout in the parent */
  style?: React.CSSProperties;
  onClick?: (event: CalendarEvent) => void;
}

export default function EventBlock({
  event,
  height,
  top,
  style,
  onClick,
}: EventBlockProps) {
  const color = event.color ?? "var(--accent)";
  const isSuggestion = event.is_suggestion;

  return (
    <div
      className="absolute left-0 right-1 rounded overflow-hidden cursor-pointer text-xs select-none"
      style={{
        top,
        height: Math.max(height, 20),
        background: isSuggestion ? "transparent" : `${color}33`,
        border: isSuggestion ? `2px dashed ${color}` : `1px solid ${color}`,
        color,
        padding: "2px 6px",
        ...style,
      }}
      onClick={() => onClick?.(event)}
      title={event.title}
    >
      <div className="font-medium truncate leading-4">{event.title}</div>
      {height >= 32 && (
        <div className="opacity-70 truncate" style={{ fontSize: "10px" }}>
          {formatTime(event.start_at)} – {formatTime(event.end_at)}
        </div>
      )}
      {isSuggestion && height >= 20 && (
        <div
          className="absolute top-0.5 right-1 text-xs opacity-60"
          style={{ fontSize: "9px" }}
        >
          suggest
        </div>
      )}
    </div>
  );
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}
