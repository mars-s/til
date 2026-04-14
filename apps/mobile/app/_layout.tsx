import { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'react-native';
import { Colors } from '../constants/tokens';
import { supabase } from '../lib/supabase';
import { Session } from '@supabase/supabase-js';

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [initialized, setInitialized] = useState(false);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setInitialized(true);
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!initialized) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!session && !inAuthGroup) {
      // Not logged in and not in auth group -> redirect to login
      router.replace('/(auth)/login');
    } else if (session && inAuthGroup) {
      // Logged in and in auth group -> redirect to home
      router.replace('/(tabs)/tasks');
    }
  }, [session, initialized, segments]);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: Colors.ink }}>
      <SafeAreaProvider>
        <StatusBar barStyle="light-content" backgroundColor={Colors.ink} />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.ink } }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="(auth)/login" />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
