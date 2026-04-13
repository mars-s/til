import React, { useCallback, useEffect, useRef, useState } from "react";
import { parseTask, type ParsedTask, type Span } from "../lib/invoke";

interface TaskInputProps {
  onSubmit: (parsed: ParsedTask) => void;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}

const SPAN_COLORS: Record<string, string> = {
  Time: "var(--span-time)",
  Date: "var(--span-date)",
  Priority: "var(--span-priority)",
  Duration: "var(--span-duration)",
  Tag: "var(--span-tag)",
  Recurrence: "var(--span-tag)",
};

function buildHighlightSegments(
  text: string,
  spans: Span[]
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
      color: SPAN_COLORS[span.kind] ?? "var(--accent)",
    });
    cursor = span.end;
  }

  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor) });
  }

  return segments;
}

export default function TaskInput({ onSubmit, inputRef }: TaskInputProps) {
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
    debounceRef.current = setTimeout(() => runParse(value), 120);
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
    [value, parsed, onSubmit, ref]
  );

  const segments = parsed ? buildHighlightSegments(value, parsed.spans) : null;

  return (
    <div className="relative w-full">
      {/* Highlight overlay */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none px-4 py-3 text-sm leading-6 overflow-hidden whitespace-pre"
        style={{ color: "transparent" }}
      >
        {segments
          ? segments.map((seg, i) => (
              <span
                key={i}
                style={{
                  color: seg.color ? seg.color : "transparent",
                  background: seg.color
                    ? `${seg.color}22`
                    : "transparent",
                  borderRadius: seg.color ? "3px" : undefined,
                  padding: seg.color ? "0 1px" : undefined,
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
        placeholder="Add a task… (e.g. 'call dentist tomorrow 3pm for 30min !high')"
        className="w-full px-4 py-3 text-sm leading-6 rounded-lg outline-none"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          color: "var(--text-primary)",
          caretColor: "var(--accent)",
          position: "relative",
          zIndex: 1,
        }}
        autoComplete="off"
        spellCheck={false}
      />

      {/* Parsed preview chips */}
      {parsed && value.trim() && (
        <div className="flex flex-wrap gap-1.5 mt-1.5 px-1">
          {parsed.scheduled_at && (
            <Chip label={`at ${formatDate(parsed.scheduled_at)}`} color="var(--span-time)" />
          )}
          {parsed.deadline_at && (
            <Chip label={`due ${formatDate(parsed.deadline_at)}`} color="var(--span-date)" />
          )}
          {parsed.duration_minutes != null && (
            <Chip label={`${parsed.duration_minutes}m`} color="var(--span-duration)" />
          )}
          {parsed.priority !== "Medium" && (
            <Chip label={parsed.priority} color="var(--span-priority)" />
          )}
          {parsed.tags.map((tag) => (
            <Chip key={tag} label={`#${tag}`} color="var(--span-tag)" />
          ))}
          {loading && <Chip label="..." color="var(--text-secondary)" />}
        </div>
      )}
    </div>
  );
}

function Chip({ label, color }: { label: string; color: string }) {
  return (
    <span
      className="px-2 py-0.5 rounded text-xs font-medium"
      style={{ background: `${color}22`, color }}
    >
      {label}
    </span>
  );
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
