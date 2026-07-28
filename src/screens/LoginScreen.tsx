import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
  Switch,
  ScrollView,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Character } from '../types/character';

interface LoginScreenProps {
  onLogin: (username: string, passwordEntered: string) => Promise<{ success: boolean; error?: string; characters?: Character[] }>;
  onRegister: (username: string, passwordEntered: string) => Promise<{ success: boolean; error?: string; characters?: Character[] }>;
  onAuthSuccess: (username: string, characters: Character[]) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, onRegister, onAuthSuccess }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Animations
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const hoverScale = useRef(new Animated.Value(1)).current;
  const arrowTranslate = useRef(new Animated.Value(0)).current;

  // Portal portal animations
  const portalScale = useRef(new Animated.Value(0)).current;
  const portalRotation = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  // Screen exit animations
  const globalPortalScale = useRef(new Animated.Value(0)).current;
  const globalPortalOpacity = useRef(new Animated.Value(0)).current;
  const formOpacity = useRef(new Animated.Value(1)).current;

  const spinActive = useRef(false);

  const startSpin = () => {
    if (spinActive.current) return;
    spinActive.current = true;
    portalRotation.setValue(0);
    Animated.loop(
      Animated.timing(portalRotation, {
        toValue: 1,
        duration: 3800,
        useNativeDriver: false,
      })
    ).start();
  };

  const spin = portalRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const spinCounter = portalRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['360deg', '0deg'],
  });

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 4,
      tension: 50,
      useNativeDriver: true,
    }).start();
  };

  const handleHoverIn = () => {
    Animated.parallel([
      Animated.spring(portalScale, {
        toValue: 1,
        friction: 6,
        tension: 40,
        useNativeDriver: false,
      }),
      Animated.spring(hoverScale, {
        toValue: 1.03,
        friction: 5,
        tension: 50,
        useNativeDriver: true,
      }),
      Animated.spring(arrowTranslate, {
        toValue: 5,
        friction: 5,
        tension: 50,
        useNativeDriver: true,
      }),
    ]).start();
    startSpin();
  };

  const handleHoverOut = () => {
    if (!isLoading) {
      Animated.parallel([
        Animated.timing(portalScale, {
          toValue: 0,
          duration: 250,
          useNativeDriver: false,
        }),
        Animated.spring(hoverScale, {
          toValue: 1,
          friction: 5,
          tension: 50,
          useNativeDriver: true,
        }),
        Animated.spring(arrowTranslate, {
          toValue: 0,
          friction: 5,
          tension: 50,
          useNativeDriver: true,
        }),
      ]).start();
    }
  };

  const triggerShake = () => {
    // Collapse local portals quickly
    Animated.timing(portalScale, {
      toValue: 0,
      duration: 150,
      useNativeDriver: false,
    }).start();

    // Shake sequence
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 12, duration: 45, useNativeDriver: false }),
      Animated.timing(shakeAnim, { toValue: -12, duration: 45, useNativeDriver: false }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 45, useNativeDriver: false }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 45, useNativeDriver: false }),
      Animated.timing(shakeAnim, { toValue: 6, duration: 45, useNativeDriver: false }),
      Animated.timing(shakeAnim, { toValue: -6, duration: 45, useNativeDriver: false }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 45, useNativeDriver: false }),
    ]).start();
  };

  const triggerSuccessTransition = (onComplete: () => void) => {
    // Spin portal super fast during entry zoom
    Animated.loop(
      Animated.timing(portalRotation, {
        toValue: 1,
        duration: 500,
        useNativeDriver: false,
      })
    ).start();

    // Parallel screen swallow
    Animated.parallel([
      Animated.timing(formOpacity, {
        toValue: 0,
        duration: 600,
        useNativeDriver: false,
      }),
      Animated.timing(globalPortalOpacity, {
        toValue: 1,
        duration: 150,
        useNativeDriver: false,
      }),
      Animated.timing(globalPortalScale, {
        toValue: 35, // swallow the screen
        duration: 950,
        useNativeDriver: false,
      }),
    ]).start(() => {
      onComplete();
    });
  };

  const toggleAuthMode = () => {
    setErrorMsg(null);
    setPassword('');
    setConfirmPassword('');
    setIsRegistering(!isRegistering);
  };

  const handleSubmit = () => {
    setErrorMsg(null);

    const cleanUsername = username.trim();
    const cleanPassword = password.trim();

    if (!cleanUsername) {
      setErrorMsg('Please enter a username');
      triggerShake();
      return;
    }
    if (!cleanPassword) {
      setErrorMsg('Please enter a password');
      triggerShake();
      return;
    }

    if (isRegistering) {
      if (cleanPassword.length < 4) {
        setErrorMsg('Password must be at least 4 characters long');
        triggerShake();
        return;
      }
      if (cleanPassword !== confirmPassword.trim()) {
        setErrorMsg('Passwords do not match');
        triggerShake();
        return;
      }
    }

    setIsLoading(true);

    // Fade animation transition
    Animated.timing(fadeAnim, {
      toValue: 0.6,
      duration: 200,
      useNativeDriver: true,
    }).start();

    setTimeout(async () => {
      try {
        let result;
        if (isRegistering) {
          result = await onRegister(cleanUsername, cleanPassword);
        } else {
          result = await onLogin(cleanUsername, cleanPassword);
        }

        if (result.success) {
          triggerSuccessTransition(() => {
            setIsLoading(false);
            onAuthSuccess(cleanUsername, result.characters || []);
          });
        } else {
          setIsLoading(false);
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }).start();
          setErrorMsg(result.error || 'Authentication failed');
          triggerShake();
        }
      } catch (err) {
        setIsLoading(false);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }).start();
        setErrorMsg('Database connection error. Check your network.');
        triggerShake();
      }
    }, 800);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      {/* Global Concentric Expanding Portals for Seamless Success Screen Transitions */}
      <Animated.View
        style={[
          styles.globalPortalOuter,
          isRegistering ? styles.globalPortalTealOuter : styles.globalPortalIndigoOuter,
          {
            opacity: globalPortalOpacity,
            transform: [
              { scale: globalPortalScale },
              { rotate: spin }
            ]
          }
        ]}
      />
      <Animated.View
        style={[
          styles.globalPortalInner,
          isRegistering ? styles.globalPortalTealInner : styles.globalPortalIndigoInner,
          {
            opacity: globalPortalOpacity,
            transform: [
              { scale: Animated.multiply(globalPortalScale, 0.75) },
              { rotate: spinCounter }
            ]
          }
        ]}
      />
      <Animated.View
        style={[
          styles.globalPortalCore,
          isRegistering ? styles.globalPortalTealCore : styles.globalPortalIndigoCore,
          {
            opacity: globalPortalOpacity,
            transform: [
              { scale: globalPortalScale }
            ]
          }
        ]}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View style={[
          styles.innerContainer, 
          { 
            opacity: formOpacity,
            transform: [
              { translateX: shakeAnim }
            ]
          }
        ]}>
          
          {/* Decorative Top Glow */}
          <View style={styles.topGlow} />

          {/* Logo and Titles */}
          <View style={styles.logoContainer}>
            <View style={styles.logoBadge}>
              <MaterialCommunityIcons name="shield-star" size={44} color="#6366F1" />
            </View>
            <Text style={styles.logoText}>AION II</Text>
            <Text style={styles.logoSub}>ASSISTANT</Text>
            <Text style={styles.logoDesc}>
              {isRegistering ? 'Register a new cloud account' : 'Sign in to access your character profile'}
            </Text>
          </View>

          {/* Form Fields */}
          <View style={styles.formContainer}>
            {errorMsg ? (
              <View style={styles.errorBox}>
                <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#EF4444" />
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            ) : null}

            {/* Username Field */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>USERNAME</Text>
              <View style={styles.inputWrapper}>
                <MaterialCommunityIcons name="account-outline" size={20} color="#64748B" style={styles.inputIcon} />
                <TextInput
                  placeholder="e.g. ChromeT or Hitomi..."
                  placeholderTextColor="#475569"
                  value={username}
                  onChangeText={(v) => {
                    setUsername(v);
                    setErrorMsg(null);
                  }}
                  style={styles.textInput}
                  autoCapitalize="none"
                />
              </View>
            </View>

            {/* Password Field */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>PASSWORD</Text>
              <View style={styles.inputWrapper}>
                <MaterialCommunityIcons name="lock-outline" size={20} color="#64748B" style={styles.inputIcon} />
                <TextInput
                  placeholder="Enter your security password..."
                  placeholderTextColor="#475569"
                  value={password}
                  onChangeText={(v) => {
                    setPassword(v);
                    setErrorMsg(null);
                  }}
                  style={styles.textInput}
                  secureTextEntry
                  autoCapitalize="none"
                />
              </View>
            </View>

            {/* Confirm Password Field (Register Mode Only) */}
            {isRegistering ? (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>CONFIRM PASSWORD</Text>
                <View style={styles.inputWrapper}>
                  <MaterialCommunityIcons name="lock-check-outline" size={20} color="#64748B" style={styles.inputIcon} />
                  <TextInput
                    placeholder="Confirm your password..."
                    placeholderTextColor="#475569"
                    value={confirmPassword}
                    onChangeText={(v) => {
                      setConfirmPassword(v);
                      setErrorMsg(null);
                    }}
                    style={styles.textInput}
                    secureTextEntry
                    autoCapitalize="none"
                  />
                </View>
              </View>
            ) : null}

            {/* Remember Me Option (Login Mode Only) */}
            {!isRegistering ? (
              <View style={styles.switchRow}>
                <View style={styles.switchTextContainer}>
                  <Text style={styles.switchLabel}>Auto-Login on Next Startup</Text>
                  <Text style={styles.switchDesc}>Keep my profile logged in on this device</Text>
                </View>
                <Switch
                  value={rememberMe}
                  onValueChange={setRememberMe}
                  trackColor={{ false: '#0F172A', true: '#4F46E5' }}
                  thumbColor={rememberMe ? '#F8FAFC' : '#94A3B8'}
                />
              </View>
            ) : null}

            {/* Submit Action Button with Swirling Portal effect */}
            <Animated.View style={{ transform: [{ scale: Animated.multiply(scaleAnim, hoverScale) }] }}>
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={handleSubmit}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                disabled={isLoading}
                style={[
                  styles.loginBtn,
                  isRegistering && styles.registerBtn,
                  isLoading && styles.loginBtnDisabled
                ]}
                {...({
                  onMouseEnter: handleHoverIn,
                  onMouseLeave: handleHoverOut,
                } as any)}
              >
                {/* Concentric Portal Swirl Layers */}
                <Animated.View
                  style={[
                    styles.localPortalOuter,
                    isRegistering ? styles.portalTealOuter : styles.portalIndigoOuter,
                    {
                      transform: [
                        { scale: portalScale },
                        { rotate: spin }
                      ]
                    }
                  ]}
                />
                <Animated.View
                  style={[
                    styles.localPortalInner,
                    isRegistering ? styles.portalTealInner : styles.portalIndigoInner,
                    {
                      transform: [
                        { scale: portalScale },
                        { rotate: spinCounter }
                      ]
                    }
                  ]}
                />
                <Animated.View
                  style={[
                    styles.localPortalCore,
                    isRegistering ? styles.portalTealCore : styles.portalIndigoCore,
                    {
                      transform: [
                        { scale: Animated.multiply(portalScale, 0.95) }
                      ]
                    }
                  ]}
                />

                {isLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" style={{ zIndex: 5 }} />
                ) : (
                  <View style={[styles.loginBtnContent, { zIndex: 5 }]}>
                    <Text style={styles.loginBtnText}>{isRegistering ? 'SIGN UP' : 'ENTER PORTAL'}</Text>
                    <Animated.View style={{ transform: [{ translateX: arrowTranslate }] }}>
                      <MaterialCommunityIcons name="arrow-right" size={16} color="#FFFFFF" style={styles.btnArrow} />
                    </Animated.View>
                  </View>
                )}
              </TouchableOpacity>
            </Animated.View>

            {/* Toggle Mode Link */}
            <TouchableOpacity onPress={toggleAuthMode} style={styles.toggleModeLink}>
              <Text style={styles.toggleModeText}>
                {isRegistering
                  ? 'Already have an account? Sign In'
                  : 'New assistant profile? Create Account (Sign Up)'}
              </Text>
            </TouchableOpacity>
          </View>

        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#070A10', // ultra deep dark space
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  innerContainer: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#111723', // glass-like navy
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#222D42',
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  topGlow: {
    position: 'absolute',
    top: -50,
    left: '25%',
    right: '25%',
    height: 60,
    backgroundColor: '#4F46E5',
    borderRadius: 30,
    opacity: 0.25,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 8,
  },
  logoBadge: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  logoText: {
    color: '#F8FAFC',
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 3,
  },
  logoSub: {
    color: '#6366F1',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 4,
    marginTop: 2,
    marginBottom: 10,
  },
  logoDesc: {
    color: '#64748B',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 12,
    fontWeight: '500',
  },
  formContainer: {
    width: '100%',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EF444415',
    borderWidth: 1,
    borderColor: '#EF444430',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
  },
  errorText: {
    color: '#F87171',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0A0E17',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#20293A',
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '600',
    paddingVertical: 14,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1E293B30',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#20293A20',
  },
  switchTextContainer: {
    flex: 1,
    marginRight: 10,
  },
  switchLabel: {
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '700',
  },
  switchDesc: {
    color: '#64748B',
    fontSize: 10,
    marginTop: 1,
    fontWeight: '500',
  },
  loginBtn: {
    backgroundColor: '#4F46E5',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
    overflow: 'hidden', // Required for local portal swirl clipping
    position: 'relative',
  },
  registerBtn: {
    backgroundColor: '#0D9488', // vibrant premium teal
    shadowColor: '#14B8A6',
  },
  loginBtnDisabled: {
    opacity: 0.6,
  },
  loginBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1,
  },
  btnArrow: {
    marginLeft: 6,
  },
  toggleModeLink: {
    marginTop: 16,
    alignItems: 'center',
    paddingVertical: 8,
  },
  toggleModeText: {
    color: '#6366F1',
    fontSize: 12,
    fontWeight: '700',
  },
  localPortalOuter: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    borderWidth: 3.5, // Thicker border
    borderStyle: 'dashed',
    opacity: 0.45, // Higher opacity
  },
  localPortalInner: {
    position: 'absolute',
    width: 200, // Distinguish inner/outer ring better
    height: 200,
    borderRadius: 100,
    borderWidth: 4.5, // Thicker dotted border
    borderStyle: 'dotted',
    opacity: 0.65, // Higher opacity
  },
  localPortalCore: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 55,
    opacity: 0.25, // Higher core opacity
  },
  portalIndigoOuter: { borderColor: '#818CF8' },
  portalIndigoInner: { borderColor: '#EEF2FF' }, // Glowing white/indigo
  portalIndigoCore: { backgroundColor: '#818CF8' },

  portalTealOuter: { borderColor: '#2DD4BF' },
  portalTealInner: { borderColor: '#F0FDFA' }, // Glowing white/teal
  portalTealCore: { backgroundColor: '#2DD4BF' },

  globalPortalOuter: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 2,
    borderStyle: 'dashed',
    zIndex: 998,
    pointerEvents: 'none',
    left: '50%',
    top: '50%',
    marginLeft: -80,
    marginTop: -80,
  },
  globalPortalInner: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3.5,
    borderStyle: 'dotted',
    zIndex: 998,
    pointerEvents: 'none',
    left: '50%',
    top: '50%',
    marginLeft: -50,
    marginTop: -50,
  },
  globalPortalCore: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    zIndex: 999,
    pointerEvents: 'none',
    left: '50%',
    top: '50%',
    marginLeft: -60,
    marginTop: -60,
  },
  globalPortalIndigoOuter: { borderColor: '#818CF8' },
  globalPortalIndigoInner: { borderColor: '#A5B4FC' },
  globalPortalIndigoCore: { backgroundColor: '#070A10' },

  globalPortalTealOuter: { borderColor: '#2DD4BF' },
  globalPortalTealInner: { borderColor: '#99F6E4' },
  globalPortalTealCore: { backgroundColor: '#070A10' },
});
export default LoginScreen;
