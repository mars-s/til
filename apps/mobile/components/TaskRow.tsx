import React, { useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import { MotiView, AnimatePresence } from 'moti';
import * as Haptics from 'expo-haptics';
import { Colors, Radii, PriorityColors } from '../constants/tokens';
import type { ParsedTask } from '../lib/nlp';

// ── Types (subset matching desktop Task) ──────────────────────────────────
export interface Task {
  id:               string;
  title:            string;
  status:           'Todo' | 'InProgress' | 'Done';
  priority:         'Urgent' | 'High' | 'Medium' | 'Low';
  scheduled_at:     string | null;
  deadline_at:      string | null;
  duration_minutes: number | null;
  tags:             string[];
  description:      string | null;
  subtasks:         { title: string; completed: boolean }[];
  created_at:       string;
}

interface Props {
  task:         Task;
  onToggle:     (id: string) => void;
  onDelete:     (id: string) => void;
  onUpdateDate: (id: string, date: string | null) => void;
}

const SWIPE_THRESHOLD = 80;
const DELETE_THRESHOLD = 160;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

export default function TaskRow({ task, onToggle, onDelete }: Props) {
  const isDone = task.status === 'Done';
  const priorityColor = PriorityColors[task.priority];
  const hasSubtasks   = (task.subtasks?.length ?? 0) > 0;

  // ── Swipe gesture ─────────────────────────────────────────────────────────
  const translateX = useSharedValue(0);
  const swipeProgress = useSharedValue(0);

  const handleComplete = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onToggle(task.id);
  }, [task.id, onToggle]);

  const handleDelete = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    onDelete(task.id);
  }, [task.id, onDelete]);

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      translateX.value = e.translationX;
      swipeProgress.value = Math.abs(e.translationX) / SWIPE_THRESHOLD;
    })
    .onEnd((e) => {
      if (e.translationX > SWIPE_THRESHOLD) {
        // swipe right → complete
        translateX.value = withSpring(0, { stiffness: 400, damping: 30 });
        runOnJS(handleComplete)();
      } else if (e.translationX < -DELETE_THRESHOLD) {
        // swipe left far → delete
        translateX.value = withTiming(-400, { duration: 180 });
        runOnJS(handleDelete)();
      } else {
        translateX.value = withSpring(0, { stiffness: 400, damping: 30 });
      }
      swipeProgress.value = withSpring(0);
    });

  const rowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const jadeRevealStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [0, SWIPE_THRESHOLD], [0, 1], Extrapolate.CLAMP),
  }));

  const roseRevealStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [-DELETE_THRESHOLD, 0], [1, 0], Extrapolate.CLAMP),
  }));

  // ── Hold-to-complete arc ─────────────────────────────────────────────────
  const holdProgress = useSharedValue(0);
  const holdTimer    = useRef<ReturnType<typeof setInterval> | null>(null);
  const holdStart    = useRef(0);

  const startHold = () => {
    holdStart.current = Date.now();
    holdTimer.current = setInterval(() => {
      const elapsed  = Date.now() - holdStart.current;
      const progress = Math.min(elapsed / 400, 1);
      holdProgress.value = progress;
      if (elapsed >= 400) {
        clearInterval(holdTimer.current!);
        holdProgress.value = 0;
        runOnJS(handleComplete)();
      }
    }, 16);
  };

  const endHold = () => {
    if (holdTimer.current) { clearInterval(holdTimer.current); holdTimer.current = null; }
    const elapsed = Date.now() - holdStart.current;
    holdProgress.value = withSpring(0);
    if (elapsed < 200) onToggle(task.id);
  };

  return (
    <MotiView
      from={{ opacity: 0, translateY: 5 }}
      animate={{ opacity: 1, translateY: 0 }}
      exit={{ opacity: 0, translateY: -5, scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 400, damping: 40 }}
      style={styles.wrapper}
    >
      {/* Swipe background reveals */}
      <Animated.View style={[styles.jadeReveal, jadeRevealStyle]}>
        <Text style={styles.revealIcon}>✓</Text>
      </Animated.View>
      <Animated.View style={[styles.roseReveal, roseRevealStyle]}>
        <Text style={styles.revealIcon}>✕</Text>
      </Animated.View>

      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.row, rowStyle]}>
          {/* Priority bar */}
          <View style={[
            styles.priorityBar,
            {
              backgroundColor: isDone ? Colors.jade : priorityColor,
              opacity:         isDone ? 0.2 : 0.75,
            },
          ]} />

          {/* Checkbox */}
          <TouchableOpacity
            onPressIn={startHold}
            onPressOut={endHold}
            activeOpacity={1}
            style={styles.checkbox}
          >
            <View style={[
              styles.checkOuter,
              isDone && styles.checkDone,
            ]}>
              {isDone && <Text style={styles.checkMark}>✓</Text>}
            </View>
          </TouchableOpacity>

          {/* Title + meta */}
          <View style={styles.content}>
            <Text
              numberOfLines={1}
              style={[
                styles.title,
                isDone && styles.titleDone,
              ]}
            >
              {task.title}
            </Text>

            {/* Inline meta */}
            <View style={styles.meta}>
              {task.description && (
                <Text style={styles.metaIcon}>≡</Text>
              )}
              {hasSubtasks && (
                <Text style={styles.metaIcon}>⊡</Text>
              )}
              {task.tags.map(tag => (
                <Text key={tag} style={styles.tag}>#{tag}</Text>
              ))}
            </View>
          </View>

          {/* Date chip */}
          {task.scheduled_at && (
            <View style={styles.dateChip}>
              <Text style={[styles.dateText, isDone && { color: Colors.text4 }]}>
                {formatDate(task.scheduled_at)}
              </Text>
              <Text style={[styles.timeText, isDone && { color: Colors.text4 }]}>
                {formatTime(task.scheduled_at)}
              </Text>
            </View>
          )}
        </Animated.View>
      </GestureDetector>
    </MotiView>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position:       'relative',
    marginBottom:   2,
    borderRadius:   Radii.md,
    overflow:       'hidden',
  },
  jadeReveal: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.jade,
    alignItems:      'flex-start',
    justifyContent:  'center',
    paddingLeft:     24,
    borderRadius:    Radii.md,
  },
  roseReveal: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.rose,
    alignItems:      'flex-end',
    justifyContent:  'center',
    paddingRight:    24,
    borderRadius:    Radii.md,
  },
  revealIcon: {
    fontSize: 20,
    color:    '#fff',
    fontWeight: '600',
  },
  row: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            8,
    padding:        10,
    paddingHorizontal: 12,
    backgroundColor: Colors.ink3,
    borderRadius:   Radii.md,
    borderWidth:    1,
    borderColor:    Colors.border,
  },
  priorityBar: {
    width:        3,
    height:       16,
    borderRadius: 2,
    flexShrink:   0,
    marginRight:  2,
  },
  checkbox: {
    padding:  4,
    flexShrink: 0,
  },
  checkOuter: {
    width:        18,
    height:       18,
    borderRadius: 5,
    borderWidth:  1.5,
    borderColor:  Colors.ash,
    alignItems:   'center',
    justifyContent: 'center',
  },
  checkDone: {
    backgroundColor: Colors.jade,
    borderColor:     Colors.jade,
  },
  checkMark: {
    fontSize:   11,
    color:      Colors.ink,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    gap:  2,
  },
  title: {
    fontSize:      14,
    color:         Colors.text1,
    letterSpacing: -0.01,
  },
  titleDone: {
    textDecorationLine: 'line-through',
    color:              Colors.text3,
  },
  meta: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           6,
    flexWrap:      'wrap',
  },
  metaIcon: {
    fontSize: 11,
    color:    Colors.text4,
  },
  tag: {
    fontSize:   10,
    color:      Colors.violet,
    fontFamily: 'Courier',
  },
  dateChip: {
    alignItems:  'flex-end',
    flexShrink:  0,
  },
  dateText: {
    fontSize:   11,
    color:      Colors.sky,
    fontFamily: 'Courier',
  },
  timeText: {
    fontSize:   10,
    color:      Colors.sky,
    fontFamily: 'Courier',
    opacity:    0.7,
  },
});
