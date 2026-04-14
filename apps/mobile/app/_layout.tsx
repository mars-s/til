import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { StatusBar } from 'react-native';
import { Colors } from '../constants/tokens';

export default function RootLayout() {
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
