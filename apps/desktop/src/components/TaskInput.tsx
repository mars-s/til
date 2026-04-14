import React, { useCallback, useEffect, useRef, useState } from "react";
import { parseTask, type ParsedTask, type Span } from "../lib/invoke";

interface TaskInputProps {
  onSubmit: (parsed: ParsedTask) => void;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  onBlur?: () => void;
}

const SPAN_COLORS: Record<string, string> = {
  Time:       "var(--sky)",
  Date:       "var(--jade)",
  Priority:   "var(--amber)",
  Duration:   "var(--violet)",
  Tag:        "var(--text-2)",
  Recurrence: "var(--text-2)",
};

function buildHighlightSegments(
  text: string,
  spans: Span[],
): Array<{ text: string; color?: string }> {
  if (spans.length === 0) return [{ text }];

  const sorted = [...spans].sort((a, b) => a.start - b.start);
  const segments: Array<{ text: string; color?: string }> = [];
  let cursor = 0;

  for (const span of sorted) {
    if (span.start > cursor) {
      segments.push({ text: text.slice(cursor, span.start) });
    }
    segments.push({
      text: text.slice(span.start, span.end),
      color: SPAN_COLORS[span.kind] ?? "var(--amber)",
    });
    cursor = span.end;
  }

  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor) });
  }

  return segments;
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function TaskInput({ onSubmit, inputRef, onBlur }: TaskInputProps) {
  const [value, setValue] = useState("");
  const [parsed, setParsed] = useState<ParsedTask | null>(null);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const internalRef = useRef<HTMLInputElement>(null);
  const ref = inputRef ?? internalRef;

  const runParse = useCallback(async (text: string) => {
    if (!text.trim()) {
      setParsed(null);
      return;
    }
    setLoading(true);
    try {
      const result = await parseTask(text);
      setParsed(result);
    } catch {
      setParsed(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runParse(value), 60);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value, runParse]);

  const handleKeyDown = useCallback(
    async (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && value.trim()) {
        const result = parsed ?? (await parseTask(value));
        onSubmit(result);
        setValue("");
        setParsed(null);
      } else if (e.key === "Escape") {
        setValue("");
        setParsed(null);
        (ref as React.RefObject<HTMLInputElement>).current?.blur();
      }
    },
    [value, parsed, onSubmit, ref],
  );

  const segments = parsed ? buildHighlightSegments(value, parsed.spans) : null;

  return (
    <div style={{ position: "relative", width: "100%" }}>
      {/* Highlight overlay */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          padding: "12px 16px",
          fontSize: 14,
          lineHeight: "24px",
          overflow: "hidden",
          whiteSpace: "pre",
          fontFamily: "var(--font-ui)",
          color: "transparent",
          zIndex: 0,
        }}
      >
        {segments
          ? segments.map((seg, i) => (
              <span
                key={i}
                style={{
                  color: seg.color ? "var(--amber)" : "var(--text-1)",
                  background: seg.color ? "color-mix(in srgb, var(--amber) 20%, transparent)" : "transparent",
                  boxShadow: seg.color ? "0 0 0 2px color-mix(in srgb, var(--amber) 20%, transparent)" : undefined,
                  borderRadius: seg.color ? "4px" : undefined,
                }}
              >
                {seg.text}
              </span>
            ))
          : value}
      </div>

      {/* Actual input */}
      <input
        ref={ref as React.RefObject<HTMLInputElement>}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={onBlur}
        placeholder="What needs doing?"
        style={{
          width: "100%",
          padding: "12px 16px",
          fontSize: 14,
          lineHeight: "24px",
          fontFamily: "var(--font-ui)",
          background: "transparent",
          border: "none",
          outline: "none",
          color: "transparent",
          caretColor: "var(--amber)",
          position: "relative",
          zIndex: 1,
          borderRadius: "var(--r-lg)",
        }}
        autoComplete="off"
        spellCheck={false}
      />

      {/* Bottom row: chips + hint */}
      {(parsed && value.trim()) || value.trim() ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 14px 10px",
            gap: 8,
          }}
        >
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {parsed?.scheduled_at && (
              <Chip label={`◷ ${formatDate(parsed.scheduled_at)}`} color="var(--sky)" />
            )}
            {parsed?.deadline_at && (
              <Chip label={`⚑ ${formatDate(parsed.deadline_at)}`} color="var(--rose)" />
            )}
            {parsed?.duration_minutes != null && (
              <Chip label={`${parsed.duration_minutes}m`} color="var(--violet)" />
            )}
            {parsed?.priority && parsed.priority !== "Medium" && (
              <Chip label={parsed.priority} color="var(--amber)" />
            )}
            {parsed?.tags.map((tag) => (
              <Chip key={tag} label={`#${tag}`} color="var(--text-2)" />
            ))}
            {loading && <Chip label="…" color="var(--text-3)" />}
          </div>

          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--text-4)",
              flexShrink: 0,
            }}
          >
            ↵ to add
          </span>
        </div>
      ) : null}
    </div>
  );
}

function Chip({ label, color }: { label: string; color: string }) {
  return (
    <span
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: 11,
        fontWeight: 400,
        color,
        background: `${color}1a`,
        padding: "2px 7px",
        borderRadius: 3,
        letterSpacing: "0.01em",
      }}
    >
      {label}
    </span>
  );
}
