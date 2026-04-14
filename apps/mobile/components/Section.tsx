import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Radii } from '../constants/tokens';

interface Props {
  title:  string;
  count:  number;
  italic?: boolean;
  date?:  string;
}

export default function Section({ title, count, italic = false, date }: Props) {
  if (count === 0) return null;
  return (
    <View style={styles.header}>
      <Text style={[styles.title, italic && styles.italic]}>{title}</Text>
      <View style={styles.divider} />
      {date && <Text style={styles.meta}>{date}</Text>}
      <Text style={styles.count}>{count}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           10,
    marginBottom:  12,
    marginTop:     24,
  },
  title: {
    fontFamily:   'System',  // will use Instrument Serif once loaded via expo-font
    fontSize:     22,
    color:        Colors.text2,
    fontWeight:   '400',
  },
  italic: {
    fontStyle: 'italic',
    color:     Colors.text1,
  },
  divider: {
    flex:            1,
    height:          StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
    opacity:         0.5,
  },
  meta: {
    fontFamily:    'Courier',
    fontSize:      10,
    color:         Colors.text3,
    letterSpacing: 0.3,
  },
  count: {
    fontFamily:    'Courier',
    fontSize:      10,
    color:         Colors.text4,
    letterSpacing: 0.5,
  },
});
