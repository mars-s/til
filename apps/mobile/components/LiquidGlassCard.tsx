import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { Colors, Radii } from '../constants/tokens';

interface Props {
  children: React.ReactNode;
  style?: ViewStyle;
  intensity?: number;
  /** Extra white top-edge highlight line to simulate light catching glass */
  glassBorder?: boolean;
}

export default function LiquidGlassCard({ children, style, intensity = 55, glassBorder = true }: Props) {
  return (
    <View style={[styles.shadow, style]}>
      <BlurView intensity={intensity} tint="dark" style={styles.blur}>
        {glassBorder && <View style={styles.topEdge} />}
        {children}
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  shadow: {
    shadowColor:   '#000',
    shadowOffset:  { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius:  16,
    elevation:     10,
    borderRadius:  Radii.lg,
  },
  blur: {
    borderRadius: Radii.lg,
    overflow:     'hidden',
    borderWidth:  1,
    borderColor:  Colors.border2,
    backgroundColor: 'rgba(8,8,8,0.55)',
  },
  topEdge: {
    position:        'absolute',
    top:             0,
    left:            12,
    right:           12,
    height:          1,
    backgroundColor: 'rgba(255,255,255,0.12)',
    zIndex:          1,
    borderRadius:    1,
  },
});
