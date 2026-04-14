import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Colors, Typography, Radii } from '../../constants/tokens';
import { supabase } from '../../lib/supabase';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const [user, setUser] = React.useState<any>(null);

  React.useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });
  }, []);

  const handleSignOut = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await supabase.auth.signOut();
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 20 }]}>
      <Text style={styles.title}>Settings</Text>
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* User Profile Section */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Account</Text>
          <BlurView intensity={20} tint="dark" style={styles.card}>
            <View style={styles.userRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {user?.email?.charAt(0).toUpperCase() || 'U'}
                </Text>
              </View>
              <View>
                <Text style={styles.emailText}>{user?.email || 'Not signed in'}</Text>
                <Text style={styles.subText}>Personal Account</Text>
              </View>
            </View>
          </BlurView>
        </View>

        {/* Preferences Section */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>App</Text>
          <BlurView intensity={20} tint="dark" style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Version</Text>
              <Text style={styles.rowValue}>1.0.0 (SDK 54)</Text>
            </View>
            <View style={[styles.row, styles.borderTop]}>
              <Text style={styles.rowLabel}>NLP Engine</Text>
              <Text style={styles.rowValue}>Native (On-device)</Text>
            </View>
          </BlurView>
        </View>

        {/* Danger Zone */}
        <TouchableOpacity 
          onPress={handleSignOut}
          style={styles.signOutButton}
          activeOpacity={0.7}
        >
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.ink,
  },
  title: {
    fontFamily: Typography.display.fontFamily,
    fontSize: 32,
    fontStyle: 'italic',
    color: Colors.text1,
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 120, // Space for tab bar
  },
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontFamily: Typography.mono.fontFamily,
    fontSize: 11,
    color: Colors.text4,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
    marginLeft: 8,
  },
  card: {
    borderRadius: Radii.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 16,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.ash,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: Typography.ui.fontFamily,
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text1,
  },
  emailText: {
    fontFamily: Typography.ui.fontFamily,
    fontSize: 15,
    fontWeight: '500',
    color: Colors.text1,
  },
  subText: {
    fontFamily: Typography.ui.fontFamily,
    fontSize: 12,
    color: Colors.text3,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  borderTop: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  rowLabel: {
    fontFamily: Typography.ui.fontFamily,
    fontSize: 14,
    color: Colors.text2,
  },
  rowValue: {
    fontFamily: Typography.mono.fontFamily,
    fontSize: 12,
    color: Colors.text4,
  },
  signOutButton: {
    marginTop: 12,
    height: 52,
    borderRadius: Radii.lg,
    backgroundColor: 'rgba(238, 68, 68, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(238, 68, 68, 0.15)',
  },
  signOutText: {
    fontFamily: Typography.ui.fontFamily,
    fontSize: 15,
    fontWeight: '600',
    color: Colors.rose,
  },
});
