import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Radii } from '../constants/tokens';

interface Props {
  label: string;
  color: string;
}

export default function Chip({ label, color }: Props) {
  return (
    <View style={[styles.chip, { borderColor: color + '44' }]}>
      <View style={[styles.bg, { backgroundColor: color + '1a' }]} />
      <Text style={[styles.label, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection:  'row',
    alignItems:     'center',
    borderRadius:   Radii.sm,
    borderWidth:    1,
    overflow:       'hidden',
    paddingVertical:  2,
    paddingHorizontal: 7,
  },
  bg: {
    ...StyleSheet.absoluteFillObject,
  },
  label: {
    fontSize:      11,
    fontWeight:    '400',
    letterSpacing: 0.2,
  },
});
