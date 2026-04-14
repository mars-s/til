import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Dimensions } from 'react-native';
import { Colors, Typography, Shadows, Radii } from '../../constants/tokens';
import { supabase } from '../../lib/supabase';
import { BlurView } from 'expo-blur';
import { MotiView } from 'moti';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';

const { width } = Dimensions.get('window');

WebBrowser.maybeCompleteAuthSession();

function LogoMark({ size = 48 }: { size?: number }) {
  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      {/* Outer diamond stroke */}
      <View 
        style={{ 
          width: size * 0.8, 
          height: size * 0.8, 
          borderWidth: 1.5, 
          borderColor: Colors.amber, 
          transform: [{ rotate: '45deg' }] 
        }} 
      />
      {/* Top half fill */}
      <View 
        style={{ 
          position: 'absolute',
          top: size * 0.1,
          width: size * 0.8,
          height: size * 0.4,
          backgroundColor: Colors.amber,
          opacity: 0.85,
          transform: [{ rotate: '45deg' }],
          zIndex: -1,
        }} 
      />
    </View>
  );
}

export default function LoginScreen() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const redirectUri = AuthSession.makeRedirectUri({
        scheme: 'til',
        path: 'google-auth',
      });

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUri,
          skipBrowserRedirect: false,
        },
      });

      if (error) throw error;
    } catch (e: any) {
      setError(e.message || 'An error occurred during sign in');
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Radial amber glow */}
      <View style={styles.glowContainer}>
        <View style={styles.glow} />
      </View>

      <MotiView 
        from={{ opacity: 0, translateY: 20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 800 }}
        style={styles.cardWrapper}
      >
        <BlurView intensity={30} tint="dark" style={styles.card}>
          <View style={styles.logoSection}>
            <LogoMark size={64} />
            <Text style={styles.wordmark}>til</Text>
          </View>

          <View style={styles.taglineSection}>
            <Text style={styles.tagline}>Your tasks. Your time.</Text>
            <Text style={styles.description}>
              Capture tasks with natural language, schedule them on your calendar, and stay focused on what matters.
            </Text>
          </View>

          <View style={styles.actionSection}>
            <TouchableOpacity 
              style={[styles.button, (loading) && styles.buttonDisabled]} 
              onPress={handleGoogleSignIn}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color={Colors.ink} size="small" />
              ) : (
                <View style={styles.buttonContent}>
                  <View style={styles.googleIcon}>
                    <Text style={{ color: '#fff', fontSize: 10, fontWeight: '900' }}>G</Text>
                  </View>
                  <Text style={styles.buttonText}>Sign in with Google</Text>
                </View>
              )}
            </TouchableOpacity>

            {error && <Text style={styles.errorText}>{error}</Text>}
          </View>

          <Text style={styles.footerText}>Your data is encrypted and private</Text>
        </BlurView>
      </MotiView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowContainer: {
    position: 'absolute',
    top: '20%',
    width: '100%',
    alignItems: 'center',
  },
  glow: {
    width: width * 1.5,
    height: width * 1.2,
    backgroundColor: 'rgba(232, 168, 66, 0.08)',
    borderRadius: width,
    transform: [{ scaleX: 1.5 }],
  },
  cardWrapper: {
    width: '90%',
    maxWidth: 400,
    borderRadius: Radii.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    ...Shadows.lg,
  },
  card: {
    paddingVertical: 48,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 32,
    gap: 12,
  },
  wordmark: {
    fontFamily: Typography.display.fontFamily,
    fontSize: 42,
    fontStyle: 'italic',
    color: Colors.text1,
    letterSpacing: -1,
  },
  taglineSection: {
    alignItems: 'center',
    textAlign: 'center',
    marginBottom: 40,
    gap: 12,
  },
  tagline: {
    fontFamily: Typography.ui.fontFamily,
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text1,
    textAlign: 'center',
  },
  description: {
    fontFamily: Typography.ui.fontFamily,
    fontSize: 14,
    color: Colors.text2,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 10,
  },
  actionSection: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 24,
    gap: 12,
  },
  button: {
    width: '100%',
    height: 48,
    backgroundColor: Colors.amber,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    backgroundColor: 'rgba(232, 168, 66, 0.4)',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  googleIcon: {
    width: 20,
    height: 20,
    backgroundColor: '#4285F4',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontFamily: Typography.ui.fontFamily,
    fontSize: 15,
    fontWeight: '600',
    color: Colors.ink,
  },
  errorText: {
    color: Colors.rose,
    fontSize: 12,
    textAlign: 'center',
    fontFamily: Typography.mono.fontFamily,
  },
  footerText: {
    fontFamily: Typography.mono.fontFamily,
    fontSize: 11,
    color: Colors.text4,
    textAlign: 'center',
  },
});
