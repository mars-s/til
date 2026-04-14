// Design tokens — 1:1 with design.md CSS variables
export const Colors = {
  // ── Surfaces / Inks ────────────────────────────────────────────
  ink:    '#080808',
  ink2:   '#101010',
  ink3:   '#161616',
  ink4:   '#1e1e1e',
  smoke:  '#282828',
  ash:    '#363636',

  // ── Text hierarchy ─────────────────────────────────────────────
  text1:  '#f0e8dc',   // primary body text
  text2:  '#a89880',   // descriptions / subtitles
  text3:  '#6a6058',   // hints / inactive
  text4:  '#3d3830',   // micro-copy / dividers

  // ── Accents ────────────────────────────────────────────────────
  amber:  '#e8a842',   // brand / in-progress
  amberLight: '#f0bc64',
  jade:   '#3eb58a',   // done / dates
  rose:   '#e05555',   // urgent / errors
  sky:    '#5b9cf0',   // times / medium priority
  violet: '#9b74d4',   // durations / low priority

  // ── Borders ────────────────────────────────────────────────────
  border:   'rgba(255,255,255,0.055)',
  border2:  'rgba(255,255,255,0.09)',
} as const;

export const Radii = {
  sm:  5,
  md:  9,
  lg:  14,
  xl:  20,
  pill: 100,
} as const;

export const Typography = {
  // font families (loaded via expo-font or system fallback)
  display:  'InstrumentSerif-Italic',
  ui:       'Geist',
  mono:     'DMMonoRegular',
  // fallbacks
  displayFallback: 'Georgia',
  uiFallback:      'System',
  monoFallback:    'Courier',
} as const;

// Span kind → color mapping (same as desktop SPAN_COLORS)
export const SpanColors: Record<string, string> = {
  Time:       Colors.amber,
  Date:       Colors.amber,
  Priority:   Colors.amber,
  Duration:   Colors.amber,
  Tag:        Colors.amber,
  Recurrence: Colors.amber,
};

// Priority → color
export const PriorityColors = {
  Urgent:  Colors.rose,
  High:    Colors.sky,
  Medium:  Colors.text3,
  Low:     Colors.violet,
} as const;
