import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/tokens';

export default function CalendarScreen() {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.container, { paddingTop: insets.top + 24 }]}>
      <Text style={styles.title}>Calendar</Text>
      <Text style={styles.subtitle}>Coming soon — week view with Google Calendar sync</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex:           1,
    backgroundColor: Colors.ink,
    alignItems:     'center',
    paddingHorizontal: 24,
    gap:            10,
  },
  title: {
    fontFamily: 'serif',
    fontStyle:  'italic',
    fontSize:   28,
    color:      Colors.text1,
  },
  subtitle: {
    fontSize: 14,
    color:    Colors.text3,
    textAlign: 'center',
  },
});
