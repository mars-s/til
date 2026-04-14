import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { Colors, SpanColors } from '../constants/tokens';
import type { ParsedSpan } from '../lib/nlp';

interface Segment {
  text:  string;
  color?: string;
}

function buildSegments(text: string, spans: ParsedSpan[]): Segment[] {
  if (!spans.length) return [{ text }];

  const sorted = [...spans].sort((a, b) => a.start - b.start);
  const segs: Segment[] = [];
  let cursor = 0;

  for (const span of sorted) {
    if (span.start > cursor) {
      segs.push({ text: text.slice(cursor, span.start) });
    }
    segs.push({
      text:  text.slice(span.start, span.end),
      color: SpanColors[span.kind] ?? Colors.amber,
    });
    cursor = span.end;
  }

  if (cursor < text.length) segs.push({ text: text.slice(cursor) });
  return segs;
}

interface Props {
  text:  string;
  spans: ParsedSpan[];
  fontSize?: number;
}

export default function SpanHighlight({ text, spans, fontSize = 16 }: Props) {
  const segments = buildSegments(text, spans);

  return (
    <Text style={[styles.base, { fontSize }]} selectable={false}>
      {segments.map((seg, i) =>
        seg.color ? (
          <Text
            key={i}
            style={[
              styles.highlighted,
              {
                color:           seg.color,
                backgroundColor: seg.color + '22',  // 13% opacity
              },
            ]}
          >
            {seg.text}
          </Text>
        ) : (
          <Text key={i} style={styles.plain}>
            {seg.text}
          </Text>
        ),
      )}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: {
    fontFamily: 'System',
    color:      Colors.text1,
    lineHeight: 24,
  },
  plain: {
    color: Colors.text1,
  },
  highlighted: {
    borderRadius: 4,
    overflow:     'hidden',
    // paddingHorizontal deliberately omitted to avoid cursor shift in TextInput
  },
});
