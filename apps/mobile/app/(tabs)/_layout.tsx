import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Tabs } from 'expo-router';
import DynamicIslandBar from '../../components/DynamicIslandBar';
import { Colors } from '../../constants/tokens';

// Hide the default Expo tab bar and render our custom one
export default function TabLayout() {
  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: { display: 'none' },   // hidden — replaced by DynamicIslandBar
        }}
      >
        <Tabs.Screen name="tasks"    options={{ title: 'Tasks'    }} />
        <Tabs.Screen name="calendar" options={{ title: 'Calendar' }} />
        <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
      </Tabs>

      {/* Floating custom tab bar — rendered above all screens */}
      <DynamicIslandBarWrapper />
    </>
  );
}

// Wrapper to wire router state to the bar
// expo-router exposes usePathname() — we map path → tab key
import { usePathname, useRouter } from 'expo-router';

function DynamicIslandBarWrapper() {
  const pathname = usePathname();
  const router   = useRouter();

  const activeTab = pathname.includes('calendar')
    ? 'calendar'
    : pathname.includes('settings')
    ? 'settings'
    : 'tasks';

  return (
    <DynamicIslandBar
      activeTab={activeTab as 'tasks' | 'calendar' | 'settings'}
      onTabChange={(tab) => router.push(`/(tabs)/${tab}`)}
    />
  );
}
