import React, { useCallback, useMemo } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolateColor,
} from 'react-native-reanimated';
import { Colors, Radii } from '../constants/tokens';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BAR_WIDTH = SCREEN_WIDTH - 40;
const TAB_WIDTH = (BAR_WIDTH - 16) / 3;

type Tab = 'tasks' | 'calendar' | 'settings';

interface TabItem {
  key:   Tab;
  label: string;
  icon: string;
}

const TABS: TabItem[] = [
  { key: 'tasks',    label: 'Tasks',    icon: '≡' },
  { key: 'calendar', label: 'Calendar', icon: '⬜' },
  { key: 'settings', label: 'Settings', icon: '⚙' },
];

interface Props {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

// Spring config for the "liquid" feel
const SPRING_CONFIG = {
  stiffness: 250,
  damping: 25,
  mass: 0.8,
};

export default function DynamicIslandBar({ activeTab, onTabChange }: Props) {
  const insets = useSafeAreaInsets();
  
  // Marker position shared value
  const activeIndex = TABS.findIndex(t => t.key === activeTab);
  const translateX = useSharedValue(activeIndex * TAB_WIDTH);
  const markerWidth = useSharedValue(TAB_WIDTH);

  React.useEffect(() => {
    // Perform a "stretching" animation when index changes
    const targetX = activeIndex * TAB_WIDTH;
    
    // Logic to make it look "liquid":
    // 1. Marker starts at current pos
    // 2. Width expands towards target
    // 3. Pos snaps to target while width shrinks back
    
    translateX.value = withSpring(targetX, SPRING_CONFIG);
  }, [activeIndex]);

  const markerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    width: markerWidth.value,
  }));

  return (
    <View
      style={[
        styles.container,
        {
          bottom: Math.max(insets.bottom, 12) + 4,
        },
      ]}
      pointerEvents="box-none"
    >
      <BlurView
        intensity={80}
        tint="dark"
        style={styles.blur}
      >
        {/* Top edge highlight (Liquid Glass effect) */}
        <View style={styles.highlight} />
        
        <View style={styles.inner}>
          {/* Animated Background Marker */}
          <Animated.View style={[styles.marker, markerStyle]} />
          
          {TABS.map((tab, index) => {
            const isActive = activeTab === tab.key;
            return (
              <TabButton
                key={tab.key}
                tab={tab}
                isActive={isActive}
                onPress={() => onTabChange(tab.key)}
              />
            );
          })}
        </View>
      </BlurView>
    </View>
  );
}

function TabButton({ tab, isActive, onPress }: { tab: TabItem; isActive: boolean; onPress: () => void }) {
  const scale = useSharedValue(1);

  const iconStyle = useAnimatedStyle(() => ({
    color: withTiming(isActive ? Colors.amber : Colors.text3, { duration: 200 }),
    transform: [{ scale: withSpring(isActive ? 1.15 : 1, SPRING_CONFIG) }],
  }));

  const labelStyle = useAnimatedStyle(() => ({
    color: withTiming(isActive ? Colors.text1 : Colors.text3, { duration: 200 }),
    opacity: withTiming(isActive ? 1 : 0.7, { duration: 200 }),
  }));

  const handlePress = useCallback(() => {
    scale.value = withSpring(0.9, { stiffness: 400, damping: 15 }, () => {
      scale.value = withSpring(1, SPRING_CONFIG);
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  }, [onPress]);

  const animatedContainerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <TouchableOpacity
      onPress={handlePress}
      style={styles.tabButton}
      activeOpacity={1}
    >
      <Animated.View style={[styles.tabInner, animatedContainerStyle]}>
        <Animated.Text style={[styles.tabIcon, iconStyle]}>
          {tab.icon}
        </Animated.Text>
        <Animated.Text style={[styles.tabLabel, labelStyle]}>
          {tab.label}
        </Animated.Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    position:    'absolute',
    left:        20,
    right:       20,
    zIndex:      1000,
  },
  blur: {
    borderRadius: Radii.pill,
    overflow:     'hidden',
    borderWidth:  StyleSheet.hairlineWidth,
    borderColor:  'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(20, 20, 20, 0.4)',
  },
  highlight: {
    position: 'absolute',
    top: 0,
    left: 20,
    right: 20,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 1,
  },
  inner: {
    flexDirection:  'row',
    paddingVertical: 8,
    paddingHorizontal: 8,
    position: 'relative',
  },
  marker: {
    position: 'absolute',
    top: 6,
    bottom: 6,
    left: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: Radii.lg,
    zIndex: -1,
  },
  tabButton: {
    flex:           1,
    height:        44,
    alignItems:     'center',
    justifyContent: 'center',
  },
  tabInner: {
    alignItems:     'center',
    justifyContent: 'center',
    gap:            1,
  },
  tabIcon: {
    fontSize:   18,
    lineHeight: 22,
  },
  tabLabel: {
    fontSize:      10,
    fontWeight:    '600',
    letterSpacing: 0.2,
  },
});
