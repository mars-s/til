import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { MotiView, AnimatePresence } from 'moti';
import * as Haptics from 'expo-haptics';
import LiquidGlassCard from './LiquidGlassCard';
import SpanHighlight from './SpanHighlight';
import Chip from './Chip';
import { parseTask, type ParsedTask } from '../lib/nlp';
import { Colors, Radii } from '../constants/tokens';

interface Props {
  onSubmit:  (parsed: ParsedTask) => void;
  onDismiss: () => void;
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month:  'short',
    day:    'numeric',
    hour:   'numeric',
    minute: '2-digit',
  });
}

export default function TaskInput({ onSubmit, onDismiss }: Props) {
  const [value,  setValue]  = useState('');
  const [parsed, setParsed] = useState<ParsedTask | null>(null);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef    = useRef<TextInput>(null);

  const runParse = useCallback(async (text: string) => {
    if (!text.trim()) { setParsed(null); return; }
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

  const handleChange = useCallback((text: string) => {
    setValue(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runParse(text), 80);
  }, [runParse]);

  const handleSubmit = useCallback(async () => {
    if (!value.trim()) return;
    const result = parsed ?? await parseTask(value);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onSubmit(result);
    setValue('');
    setParsed(null);
  }, [value, parsed, onSubmit]);

  const hasChips = parsed && (
    parsed.scheduled_at ||
    parsed.deadline_at  ||
    parsed.duration_minutes != null ||
    (parsed.priority !== 'Medium') ||
    parsed.tags.length > 0
  );

  return (
    <MotiView
      from={{ opacity: 0, translateY: 20 }}
      animate={{ opacity: 1, translateY: 0 }}
      exit={{ opacity: 0, translateY: 20 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
    >
      <LiquidGlassCard intensity={70}>
        {/* Input row */}
        <View style={styles.inputRow}>
          <View style={styles.textArea} pointerEvents="none">
            {/* Highlight overlay when there are spans */}
            {parsed && parsed.spans.length > 0 ? (
              <SpanHighlight text={value} spans={parsed.spans} fontSize={16} />
            ) : (
              <Text style={styles.overlayText}>{value || ''}</Text>
            )}
          </View>
          <TextInput
            ref={inputRef}
            value={value}
            onChangeText={handleChange}
            onSubmitEditing={handleSubmit}
            onBlur={onDismiss}
            placeholder="What needs doing?"
            placeholderTextColor={Colors.text3}
            returnKeyType="done"
            autoFocus
            style={styles.input}
            autoCorrect={false}
            autoCapitalize="sentences"
            blurOnSubmit={false}
          />
        </View>

        {/* Chips */}
        <AnimatePresence>
          {hasChips && (
            <MotiView
              from={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 35 }}
              style={styles.chipsRow}
            >
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
                {parsed?.scheduled_at && (
                  <Chip label={`◷ ${formatDateTime(parsed.scheduled_at)}`} color={Colors.sky} />
                )}
                {parsed?.deadline_at && (
                  <Chip label={`⚑ ${formatDateTime(parsed.deadline_at)}`} color={Colors.rose} />
                )}
                {parsed?.duration_minutes != null && (
                  <Chip label={`${parsed.duration_minutes}m`} color={Colors.violet} />
                )}
                {parsed?.priority && parsed.priority !== 'Medium' && (
                  <Chip label={parsed.priority} color={Colors.amber} />
                )}
                {parsed?.tags.map(tag => (
                  <Chip key={tag} label={`#${tag}`} color={Colors.text2} />
                ))}
                {loading && <Chip label="…" color={Colors.text3} />}
              </ScrollView>

              <TouchableOpacity onPress={handleSubmit} style={styles.returnBtn}>
                <Text style={styles.returnText}>↵</Text>
              </TouchableOpacity>
            </MotiView>
          )}
        </AnimatePresence>
      </LiquidGlassCard>
    </MotiView>
  );
}

const styles = StyleSheet.create({
  inputRow: {
    position: 'relative',
    padding:  16,
  },
  textArea: {
    position:  'absolute',
    top:       16,
    left:      16,
    right:     16,
    minHeight: 24,
    zIndex:    0,
  },
  overlayText: {
    fontSize:   16,
    lineHeight: 24,
    color:      Colors.text1,
  },
  input: {
    fontSize:   16,
    lineHeight: 24,
    color:      'transparent',  // hidden under highlight overlay
    caretColor: Colors.amber, // iOS native caret
    zIndex:     1,
    minHeight:  24,
    padding:    0,
  },
  chipsRow: {
    flexDirection:  'row',
    alignItems:     'center',
    paddingHorizontal: 12,
    paddingBottom:  12,
    gap:            8,
  },
  chipsScroll: {
    gap:         6,
    flexGrow:    0,
    paddingRight: 8,
  },
  returnBtn: {
    marginLeft:    'auto',
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  returnText: {
    fontSize: 16,
    color:    Colors.text3,
  },
});
