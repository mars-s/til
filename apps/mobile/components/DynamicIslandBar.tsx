import React, { useCallback, useState } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ViewStyle,
} from 'react-native';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolateColor,
  useDerivedValue,
} from 'react-native-reanimated';
import { Colors, Radii } from '../constants/tokens';

// SVG icon paths (inline — no icon library dependency)
const ICONS = {
  tasks: {
    active:   'M3 5h18M3 10h18M3 15h11',
    inactive: 'M3 5h18M3 10h18M3 15h11',
  },
  calendar: {
    active:   'M8 2v3m8-3v3M3.5 9.09h17M21 8.5V17c0 3-1.5 4-4 4H7c-2.5 0-4-1-4-4V8.5c0-3 1.5-4 4-4h10c2.5 0 4 1 4 4z',
    inactive: 'M8 2v3m8-3v3M3.5 9.09h17M21 8.5V17c0 3-1.5 4-4 4H7c-2.5 0-4-1-4-4V8.5c0-3 1.5-4 4-4h10c2.5 0 4 1 4 4z',
  },
  settings: {
    active:   'M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z',
    inactive: 'M12 15a3 3 0 100-6 3 3 0 000 6z',
  },
};

type Tab = 'tasks' | 'calendar' | 'settings';

interface TabItem {
  key:   Tab;
  label: string;
}

const TABS: TabItem[] = [
  { key: 'tasks',    label: 'Tasks'    },
  { key: 'calendar', label: 'Calendar' },
  { key: 'settings', label: 'Settings' },
];

interface Props {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  style?: ViewStyle;
}

function TabButton({ tab, isActive, onPress }: { tab: TabItem; isActive: boolean; onPress: () => void }) {
  const scale = useSharedValue(1);
  const progress = useDerivedValue(() => (isActive ? 1 : 0), [isActive]);

  const dotStyle = useAnimatedStyle(() => ({
    opacity: withSpring(isActive ? 1 : 0, { stiffness: 400, damping: 30 }),
    transform: [{ scale: withSpring(isActive ? 1 : 0.4, { stiffness: 400, damping: 30 }) }],
  }));

  const labelStyle = useAnimatedStyle(() => ({
    color: isActive ? Colors.amber : Colors.text3,
    transform: [{ scale: withSpring(isActive ? 1 : 0.97, { stiffness: 300, damping: 20 }) }],
  }));

  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = useCallback(() => {
    scale.value = withSpring(0.88, { stiffness: 600, damping: 20 }, () => {
      scale.value = withSpring(1, { stiffness: 400, damping: 20 });
    });
    Haptics.selectionAsync();
    onPress();
  }, [onPress, scale]);

  return (
    <TouchableOpacity
      onPress={handlePress}
      style={styles.tabButton}
      activeOpacity={1}
    >
      <Animated.View style={[styles.tabInner, pressStyle]}>
        {/* Icon placeholder — use text emoji or add SVG library */}
        <Animated.Text style={[styles.tabIcon, { color: isActive ? Colors.amber : Colors.text3 }]}>
          {tab.key === 'tasks' ? '≡' : tab.key === 'calendar' ? '⬜' : '⚙'}
        </Animated.Text>
        <Animated.Text style={[styles.tabLabel, labelStyle]}>
          {tab.label}
        </Animated.Text>
        {/* Active dot */}
        <Animated.View style={[styles.activeDot, dotStyle]} />
      </Animated.View>
    </TouchableOpacity>
  );
}

export default function DynamicIslandBar({ activeTab, onTabChange, style }: Props) {
  const insets = useSafeAreaInsets();

  // Extra top inset for Dynamic Island devices (≥ iPhone 14 Pro)
  // DI is roughly 59px tall; safe area top is ~59 on DI phones vs ~47 on notch phones
  const isDynamicIsland = insets.top >= 59;

  return (
    <View
      style={[
        styles.container,
        {
          bottom: Math.max(insets.bottom, 12) + 4,
        },
        style,
      ]}
      pointerEvents="box-none"
    >
      <BlurView
        intensity={75}
        tint="dark"
        style={styles.blur}
      >
        <View style={styles.inner}>
          {TABS.map((tab) => (
            <TabButton
              key={tab.key}
              tab={tab}
              isActive={activeTab === tab.key}
              onPress={() => onTabChange(tab.key)}
            />
          ))}
        </View>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position:    'absolute',
    left:        20,
    right:       20,
    zIndex:      100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation:   20,
  },
  blur: {
    borderRadius: Radii.pill,
    overflow:     'hidden',
    borderWidth:  1,
    borderColor:  Colors.border2,
  },
  inner: {
    flexDirection:  'row',
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  tabButton: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
  },
  tabInner: {
    alignItems:     'center',
    justifyContent: 'center',
    paddingVertical: 4,
    gap:            2,
  },
  tabIcon: {
    fontSize:   20,
    lineHeight: 24,
  },
  tabLabel: {
    fontSize:      10,
    fontWeight:    '500',
    letterSpacing: 0.3,
  },
  activeDot: {
    width:        4,
    height:       4,
    borderRadius: 2,
    backgroundColor: Colors.amber,
    marginTop:    2,
  },
});
