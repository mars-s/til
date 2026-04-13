import React from "react";
import { type CalendarEvent } from "../lib/invoke";

interface EventBlockProps {
  event: CalendarEvent;
  height: number;
  top: number;
  style?: React.CSSProperties;
  onClick?: (event: CalendarEvent) => void;
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

export default function EventBlock({
  event,
  height,
  top,
  style,
  onClick,
}: EventBlockProps) {
  const color = event.color ?? "var(--sky)";
  const isSuggestion = event.is_suggestion;
  const h = Math.max(height, 20);

  return (
    <div
      style={{
        position: "absolute",
        left: 2,
        right: 3,
        top,
        height: h,
        borderRadius: 6,
        overflow: "hidden",
        cursor: "pointer",
        userSelect: "none",
        background: isSuggestion ? "transparent" : `${color}28`,
        border: isSuggestion ? `1.5px dashed ${color}` : `1px solid ${color}55`,
        opacity: isSuggestion ? 0.7 : 1,
        padding: "3px 7px",
        transition: "opacity 0.12s, box-shadow 0.12s",
        ...style,
      }}
      onClick={() => onClick?.(event)}
      title={event.title}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.opacity = "1";
        (e.currentTarget as HTMLDivElement).style.boxShadow = "var(--shadow-sm)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.opacity = isSuggestion ? "0.7" : "1";
        (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-ui)",
          fontSize: 11,
          fontWeight: 500,
          color,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          lineHeight: "14px",
        }}
      >
        {event.title}
      </div>
      {h >= 32 && (
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            color,
            opacity: 0.65,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {formatTime(event.start_at)} – {formatTime(event.end_at)}
        </div>
      )}
      {isSuggestion && h >= 20 && (
        <div
          style={{
            position: "absolute",
            top: 2,
            right: 4,
            fontFamily: "var(--font-mono)",
            fontSize: 9,
            color,
            opacity: 0.55,
            letterSpacing: "0.04em",
          }}
        >
          suggest
        </div>
      )}
    </div>
  );
}
