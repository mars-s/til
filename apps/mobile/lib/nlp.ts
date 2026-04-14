import { requireNativeModule } from 'expo-modules-core';

// The native module interface exposed from TilNlpModule.swift
interface TilNlpNative {
  parseTask(input: string): Promise<{
    title: string;
    scheduled_at?: string;   // ISO8601
    deadline_at?:  string;
    spans: Array<{
      start: number;
      end:   number;
      kind:  'Date' | 'Time';
    }>;
  }>;
}

// Will throw if native module is not compiled (non-iOS or dev without native build)
let NativeNlp: TilNlpNative | null = null;
try {
  NativeNlp = requireNativeModule('TilNlp') as TilNlpNative;
} catch {
  NativeNlp = null;
}

export interface ParsedSpan {
  start: number;
  end:   number;
  kind:  string;
}

export interface ParsedTask {
  title:             string;
  scheduled_at?:     string;
  deadline_at?:      string;
  duration_minutes?: number;
  priority:          'Urgent' | 'High' | 'Medium' | 'Low';
  tags:              string[];
  spans:             ParsedSpan[];
}

// ── JS-side patterns (priority / duration / tags) ──────────────────────────
const PRIORITY_RE = /\b(urgent|asap|critical)\b|\bhigh\s+priority\b|\bpriority\s+high\b/i;
const LOW_RE      = /\blow\s+priority\b|\bpriority\s+low\b/i;
const HIGH_RE     = /\bhigh\s+priority\b|\bpriority\s+high\b/i;
const DURATION_RE = /\bfor\s+(\d+)\s*(min(?:utes?)?|h(?:ours?)?|hr?s?)\b/i;
const TAG_RE      = /#([a-zA-Z][a-zA-Z0-9_-]*)/g;
const DEADLINE_RE = /\bby\s+((?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|today|tomorrow|next\s+\w+)(?:\s+\d{1,2}(?::\d{2})?\s*(?:am|pm)?)?)/i;

function detectPriority(input: string): ParsedTask['priority'] {
  if (PRIORITY_RE.test(input)) return 'Urgent';
  if (HIGH_RE.test(input))     return 'High';
  if (LOW_RE.test(input))      return 'Low';
  return 'Medium';
}

function detectDuration(input: string): number | undefined {
  const m = DURATION_RE.exec(input);
  if (!m) return undefined;
  const amount = parseInt(m[1], 10);
  return m[2].startsWith('h') ? amount * 60 : amount;
}

function detectTags(input: string): string[] {
  const tags: string[] = [];
  let m: RegExpExecArray | null;
  TAG_RE.lastIndex = 0;
  while ((m = TAG_RE.exec(input)) !== null) {
    tags.push(m[1]);
  }
  return tags;
}

// Span helper: find byte offsets of JS-matched groups and add them as spans
function jsSpan(input: string, regex: RegExp, kind: string, target?: string): ParsedSpan[] {
  const spans: ParsedSpan[] = [];
  const re = new RegExp(regex.source, regex.flags.includes('g') ? regex.flags : regex.flags + 'g');
  let m: RegExpExecArray | null;
  while ((m = re.exec(input)) !== null) {
    spans.push({ start: m.index, end: m.index + m[0].length, kind });
  }
  return spans;
}

export async function parseTask(input: string): Promise<ParsedTask> {
  const trimmed = input.trim();
  if (!trimmed) {
    return { title: '', priority: 'Medium', tags: [], spans: [] };
  }

  // 1. Native Apple NLP (dates + times)
  let nativeResult = NativeNlp
    ? await NativeNlp.parseTask(trimmed).catch(() => null)
    : null;

  const baseTitle      = nativeResult?.title ?? trimmed;
  const scheduled_at   = nativeResult?.scheduled_at;
  const nativeSpans    = nativeResult?.spans ?? [];

  // 2. JS augmentation
  const priority        = detectPriority(trimmed);
  const duration_minutes = detectDuration(trimmed);
  const tags            = detectTags(trimmed);

  // 3. JS spans for priority / duration / tags (visual highlights)
  const jsSpans: ParsedSpan[] = [
    ...jsSpan(trimmed, DURATION_RE,  'Duration'),
    ...jsSpan(trimmed, TAG_RE,        'Tag'),
  ];
  if (priority !== 'Medium') {
    jsSpans.push(...jsSpan(trimmed, /\b(urgent|asap|critical|high\s+priority|low\s+priority)\b/i, 'Priority'));
  }

  // 4. Deadline detection (JS)
  let deadline_at: string | undefined;
  const deadlineMatch = DEADLINE_RE.exec(trimmed);
  if (deadlineMatch) {
    jsSpans.push({ start: deadlineMatch.index, end: deadlineMatch.index + deadlineMatch[0].length, kind: 'Date' });
    // Best-effort deadline date
    const expr = deadlineMatch[1].toLowerCase();
    const d = new Date();
    if (expr.includes('tomorrow')) d.setDate(d.getDate() + 1);
    else if (expr.includes('friday')) { const diff = (5 - d.getDay() + 7) % 7 || 7; d.setDate(d.getDate() + diff); }
    d.setHours(17, 0, 0, 0);
    deadline_at = d.toISOString();
  }

  const allSpans = [
    ...nativeSpans.map(s => ({ ...s, kind: s.kind as string })),
    ...jsSpans,
  ].sort((a, b) => a.start - b.start);

  return {
    title:            baseTitle,
    scheduled_at,
    deadline_at,
    duration_minutes,
    priority,
    tags,
    spans:            allSpans,
  };
}
