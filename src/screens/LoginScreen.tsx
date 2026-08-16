import React, { useState, useRef, useEffect } from 'react';
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
  Easing,
  LayoutAnimation,
  UIManager,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Character } from '../types/character';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface LoginScreenProps {
  onLogin: (username: string, passwordEntered: string) => Promise<{ success: boolean; error?: string; username?: string; characters?: Character[] }>;
  onRegister: (username: string, passwordEntered: string) => Promise<{ success: boolean; error?: string; username?: string; characters?: Character[] }>;
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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // General animations
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const switchAnim = useRef(new Animated.Value(1)).current; // Smooth fade switch

  // Screen exit transition portal animations
  const globalPortalScale = useRef(new Animated.Value(0)).current;
  const globalPortalOpacity = useRef(new Animated.Value(0)).current;
  const formOpacity = useRef(new Animated.Value(1)).current;
  const formScale = useRef(new Animated.Value(1)).current;

  // Button 1 (ENTER PORTAL) animations
  const loginScaleAnim = useRef(new Animated.Value(1)).current;
  const loginHoverScale = useRef(new Animated.Value(1)).current;
  const loginArrowTranslate = useRef(new Animated.Value(0)).current;
  const loginPortalScale = useRef(new Animated.Value(0)).current;

  // Button 2 (SIGN UP) animations
  const regScaleAnim = useRef(new Animated.Value(1)).current;
  const regHoverScale = useRef(new Animated.Value(1)).current;
  const regArrowTranslate = useRef(new Animated.Value(0)).current;
  const regPortalScale = useRef(new Animated.Value(0)).current;

  // Shared rotation spin
  const portalRotation = useRef(new Animated.Value(0)).current;
  const spinActive = useRef(false);

  // Banner zoom-in + floating animation
  const bannerZoom    = useRef(new Animated.Value(0.3)).current;
  const bannerOpacity = useRef(new Animated.Value(0)).current;
  // Cycle values (0→1 linear) — interpolated into sine wave in JSX
  const floatYCycle   = useRef(new Animated.Value(0)).current; // Y axis, 3600ms/cycle
  const floatXCycle   = useRef(new Animated.Value(0.25)).current; // X axis, 4800ms/cycle, starts at 25% phase

  // Run on mount: zoom in, then float forever in both axes
  useEffect(() => {
    // Zoom in + fade in
    Animated.parallel([
      Animated.spring(bannerZoom, {
        toValue: 1,
        friction: 5,
        tension: 55,
        useNativeDriver: true,
      }),
      Animated.timing(bannerOpacity, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Y: single linear loop 0→1, interpolated into sine.  No sequence = no JS callback jitter.
      Animated.loop(
        Animated.timing(floatYCycle, {
          toValue: 1,
          duration: 3600,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();

      // X: different cycle length (4800ms) for Lissajous effect.
      // Starts at 0.25 so X and Y are already out of phase at t=0.
      Animated.loop(
        Animated.timing(floatXCycle, {
          toValue: 1,
          duration: 4800,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();
    });
  }, []);

  // 8-point sine approximation (sin(2πt) * amplitude):
  // inputRange  = [0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875, 1]
  // sin values  = [0, 0.707,  1,   0.707,  0, -0.707, -1,  -0.707,  0]
  const SINE_INPUT  = [0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875, 1];
  const bannerFloat = floatYCycle.interpolate({
    inputRange:  SINE_INPUT,
    outputRange: [0, -7.07, -10, -7.07, 0, 7.07, 10, 7.07, 0],
    extrapolate: 'extend',
  });
  const bannerFloatX = floatXCycle.interpolate({
    inputRange:  SINE_INPUT,
    outputRange: [0, 4.95, 7, 4.95, 0, -4.95, -7, -4.95, 0],
    extrapolate: 'extend',
  });

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

  // Login Button Hover handlers
  const handleLoginHoverIn = () => {
    Animated.parallel([
      Animated.spring(loginPortalScale, { toValue: 1, friction: 6, tension: 40, useNativeDriver: false }),
      Animated.spring(loginHoverScale, { toValue: 1.03, friction: 5, tension: 50, useNativeDriver: true }),
      Animated.spring(loginArrowTranslate, { toValue: 5, friction: 5, tension: 50, useNativeDriver: true }),
    ]).start();
    startSpin();
  };

  const handleLoginHoverOut = () => {
    if (!isLoading) {
      Animated.parallel([
        Animated.timing(loginPortalScale, { toValue: 0, duration: 250, useNativeDriver: false }),
        Animated.spring(loginHoverScale, { toValue: 1, friction: 5, tension: 50, useNativeDriver: true }),
        Animated.spring(loginArrowTranslate, { toValue: 0, friction: 5, tension: 50, useNativeDriver: true }),
      ]).start();
    }
  };

  // Register Button Hover handlers
  const handleRegHoverIn = () => {
    Animated.parallel([
      Animated.spring(regPortalScale, { toValue: 1, friction: 6, tension: 40, useNativeDriver: false }),
      Animated.spring(regHoverScale, { toValue: 1.03, friction: 5, tension: 50, useNativeDriver: true }),
      Animated.spring(regArrowTranslate, { toValue: 5, friction: 5, tension: 50, useNativeDriver: true }),
    ]).start();
    startSpin();
  };

  const handleRegHoverOut = () => {
    if (!isLoading) {
      Animated.parallel([
        Animated.timing(regPortalScale, { toValue: 0, duration: 250, useNativeDriver: false }),
        Animated.spring(regHoverScale, { toValue: 1, friction: 5, tension: 50, useNativeDriver: true }),
        Animated.spring(regArrowTranslate, { toValue: 0, friction: 5, tension: 50, useNativeDriver: true }),
      ]).start();
    }
  };

  const triggerShake = () => {
    // Collapse local portal swirls
    Animated.parallel([
      Animated.timing(loginPortalScale, { toValue: 0, duration: 150, useNativeDriver: false }),
      Animated.timing(regPortalScale, { toValue: 0, duration: 150, useNativeDriver: false }),
    ]).start();

    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 12, duration: 45, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -12, duration: 45, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 45, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 45, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6, duration: 45, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -6, duration: 45, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 45, useNativeDriver: true }),
    ]).start();
  };

  const triggerSuccessTransition = (onComplete: () => void) => {
    Animated.loop(
      Animated.timing(portalRotation, { toValue: 1, duration: 500, useNativeDriver: false })
    ).start();

    Animated.parallel([
      Animated.timing(formScale, {
        toValue: 3.5,
        duration: 950,
        easing: Easing.bezier(0.25, 1, 0.5, 1),
        useNativeDriver: true,
      }),
      Animated.timing(formOpacity, {
        toValue: 0,
        duration: 700,
        useNativeDriver: true,
      }),
      Animated.timing(globalPortalOpacity, {
        toValue: 1,
        duration: 100,
        useNativeDriver: false,
      }),
      Animated.timing(globalPortalScale, {
        toValue: 40,
        duration: 1000,
        easing: Easing.bezier(0.25, 1, 0.5, 1),
        useNativeDriver: false,
      }),
    ]).start(() => {
      onComplete();
    });
  };

  const toggleAuthMode = () => {
    // Smooth crossfade animation
    Animated.timing(switchAnim, {
      toValue: 0,
      duration: 120,
      useNativeDriver: true,
    }).start(() => {
      // Trigger native layout ease transition to animate card height expansion/shrink
      LayoutAnimation.configureNext({
        duration: 250,
        create: {
          type: LayoutAnimation.Types.easeInEaseOut,
          property: LayoutAnimation.Properties.opacity,
        },
        update: {
          type: LayoutAnimation.Types.easeInEaseOut,
        },
      });

      // Switch auth screen
      setIsRegistering(!isRegistering);
      setErrorMsg(null);
      setPassword('');
      setConfirmPassword('');
      setShowPassword(false);
      setShowConfirmPassword(false);

      // Fade back in
      Animated.timing(switchAnim, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }).start();
    });
  };

  const handleSubmit = (actionType: 'login' | 'register') => {
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

    if (actionType === 'register') {
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

    Animated.timing(fadeAnim, {
      toValue: 0.6,
      duration: 200,
      useNativeDriver: true,
    }).start();

    setTimeout(async () => {
      try {
        let result;
        if (actionType === 'register') {
          result = await onRegister(cleanUsername, cleanPassword);
        } else {
          result = await onLogin(cleanUsername, cleanPassword);
        }

        if (result.success) {
          triggerSuccessTransition(() => {
            setIsLoading(false);
            onAuthSuccess(result.username || cleanUsername, result.characters || []);
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
      {/* Global concentric screen-swallowing portals on successful entry */}
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
              { scale: Animated.multiply(globalPortalScale, 1.35) },
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
        {/* ── SINGLE card layer: all animations pure native — whole card floats ── */}
        <Animated.View style={[
          styles.innerContainer,
          {
            opacity: Animated.multiply(formOpacity, bannerOpacity),
            transform: [
              { translateX: shakeAnim },   // shake only — no Animated.add needed
              { translateX: bannerFloatX }, // float X — separate entry, composes additively
              { translateY: bannerFloat },  // float Y
              { scale: Animated.multiply(formScale, bannerZoom) },
            ],
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

          {/* Form Fields with smooth switch fade */}
          <Animated.View style={[styles.formContainer, { opacity: switchAnim }]}>
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
                  placeholder="Username"
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
                  placeholder="Password"
                  placeholderTextColor="#475569"
                  value={password}
                  onChangeText={(v) => {
                    setPassword(v);
                    setErrorMsg(null);
                  }}
                  style={styles.textInput}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  onPress={() => setShowPassword((p) => !p)}
                  style={styles.eyeBtn}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={showPassword ? '#6366F1' : '#475569'}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Confirm Password Field (Register Mode Only) */}
            {isRegistering ? (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>CONFIRM PASSWORD</Text>
                <View style={styles.inputWrapper}>
                  <MaterialCommunityIcons name="lock-check-outline" size={20} color="#64748B" style={styles.inputIcon} />
                  <TextInput
                    placeholder="Confirm Password"
                    placeholderTextColor="#475569"
                    value={confirmPassword}
                    onChangeText={(v) => {
                      setConfirmPassword(v);
                      setErrorMsg(null);
                    }}
                    style={styles.textInput}
                    secureTextEntry={!showConfirmPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    onPress={() => setShowConfirmPassword((p) => !p)}
                    style={styles.eyeBtn}
                    activeOpacity={0.7}
                  >
                    <MaterialCommunityIcons
                      name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color={showConfirmPassword ? '#2DD4BF' : '#475569'}
                    />
                  </TouchableOpacity>
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

            {/* If in Login Mode: Show main ENTER PORTAL and secondary REGISTER button */}
            {!isRegistering ? (
              <>
                {/* Button 1: ENTER PORTAL (Login Action) */}
                <Animated.View style={{ transform: [{ scale: Animated.multiply(loginScaleAnim, loginHoverScale) }], marginBottom: 12 }}>
                  <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={() => handleSubmit('login')}
                    onPressIn={() => Animated.spring(loginScaleAnim, { toValue: 0.95, useNativeDriver: true }).start()}
                    onPressOut={() => Animated.spring(loginScaleAnim, { toValue: 1, friction: 4, useNativeDriver: true }).start()}
                    disabled={isLoading}
                    style={[
                      styles.loginBtn,
                      isLoading && styles.loginBtnDisabled
                    ]}
                    {...({
                      onMouseEnter: handleLoginHoverIn,
                      onMouseLeave: handleLoginHoverOut,
                    } as any)}
                  >
                    {/* Local concentric portal layer */}
                    <Animated.View
                      style={[
                        styles.localPortalOuter,
                        styles.portalIndigoOuter,
                        { transform: [{ scale: loginPortalScale }, { rotate: spin }] }
                      ]}
                    />
                    <Animated.View
                      style={[
                        styles.localPortalInner,
                        styles.portalIndigoInner,
                        { transform: [{ scale: loginPortalScale }, { rotate: spinCounter }] }
                      ]}
                    />
                    <Animated.View
                      style={[
                        styles.localPortalCore,
                        styles.portalIndigoCore,
                        { transform: [{ scale: Animated.multiply(loginPortalScale, 0.95) }] }
                      ]}
                    />

                    {isLoading ? (
                      <ActivityIndicator size="small" color="#FFFFFF" style={{ zIndex: 5 }} />
                    ) : (
                      <View style={[styles.loginBtnContent, { zIndex: 5 }]}>
                        <Text style={styles.loginBtnText}>ENTER PORTAL</Text>
                        <Animated.View style={{ transform: [{ translateX: loginArrowTranslate }] }}>
                          <MaterialCommunityIcons name="arrow-right" size={16} color="#FFFFFF" style={styles.btnArrow} />
                        </Animated.View>
                      </View>
                    )}
                  </TouchableOpacity>
                </Animated.View>

                {/* Button 2: SIGN UP TRIGGER (Switches to registration form) */}
                <Animated.View style={{ transform: [{ scale: Animated.multiply(regScaleAnim, regHoverScale) }] }}>
                  <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={toggleAuthMode}
                    onPressIn={() => Animated.spring(regScaleAnim, { toValue: 0.95, useNativeDriver: true }).start()}
                    onPressOut={() => Animated.spring(regScaleAnim, { toValue: 1, friction: 4, useNativeDriver: true }).start()}
                    disabled={isLoading}
                    style={[
                      styles.loginBtn,
                      styles.registerBtn,
                      isLoading && styles.loginBtnDisabled
                    ]}
                    {...({
                      onMouseEnter: handleRegHoverIn,
                      onMouseLeave: handleRegHoverOut,
                    } as any)}
                  >
                    {/* Local concentric portal layer */}
                    <Animated.View
                      style={[
                        styles.localPortalOuter,
                        styles.portalTealOuter,
                        { transform: [{ scale: regPortalScale }, { rotate: spin }] }
                      ]}
                    />
                    <Animated.View
                      style={[
                        styles.localPortalInner,
                        styles.portalTealInner,
                        { transform: [{ scale: regPortalScale }, { rotate: spinCounter }] }
                      ]}
                    />
                    <Animated.View
                      style={[
                        styles.localPortalCore,
                        styles.portalTealCore,
                        { transform: [{ scale: Animated.multiply(regPortalScale, 0.95) }] }
                      ]}
                    />

                    <View style={[styles.loginBtnContent, { zIndex: 5 }]}>
                      <Text style={styles.loginBtnText}>SIGN UP</Text>
                      <Animated.View style={{ transform: [{ translateX: regArrowTranslate }] }}>
                        <MaterialCommunityIcons name="arrow-right" size={16} color="#FFFFFF" style={styles.btnArrow} />
                      </Animated.View>
                    </View>
                  </TouchableOpacity>
                </Animated.View>
              </>
            ) : (
              <>
                {/* If in Register Mode: Show main SIGN UP (register action) and secondary BACK TO SIGN IN button */}
                
                {/* Button 1: SIGN UP (Perform Registration) */}
                <Animated.View style={{ transform: [{ scale: Animated.multiply(regScaleAnim, regHoverScale) }], marginBottom: 12 }}>
                  <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={() => handleSubmit('register')}
                    onPressIn={() => Animated.spring(regScaleAnim, { toValue: 0.95, useNativeDriver: true }).start()}
                    onPressOut={() => Animated.spring(regScaleAnim, { toValue: 1, friction: 4, useNativeDriver: true }).start()}
                    disabled={isLoading}
                    style={[
                      styles.loginBtn,
                      styles.registerBtn,
                      isLoading && styles.loginBtnDisabled
                    ]}
                    {...({
                      onMouseEnter: handleRegHoverIn,
                      onMouseLeave: handleRegHoverOut,
                    } as any)}
                  >
                    {/* Local concentric portal layer */}
                    <Animated.View
                      style={[
                        styles.localPortalOuter,
                        styles.portalTealOuter,
                        { transform: [{ scale: regPortalScale }, { rotate: spin }] }
                      ]}
                    />
                    <Animated.View
                      style={[
                        styles.localPortalInner,
                        styles.portalTealInner,
                        { transform: [{ scale: regPortalScale }, { rotate: spinCounter }] }
                      ]}
                    />
                    <Animated.View
                      style={[
                        styles.localPortalCore,
                        styles.portalTealCore,
                        { transform: [{ scale: Animated.multiply(regPortalScale, 0.95) }] }
                      ]}
                    />

                    {isLoading ? (
                      <ActivityIndicator size="small" color="#FFFFFF" style={{ zIndex: 5 }} />
                    ) : (
                      <View style={[styles.loginBtnContent, { zIndex: 5 }]}>
                        <Text style={styles.loginBtnText}>SIGN UP</Text>
                        <Animated.View style={{ transform: [{ translateX: regArrowTranslate }] }}>
                          <MaterialCommunityIcons name="arrow-right" size={16} color="#FFFFFF" style={styles.btnArrow} />
                        </Animated.View>
                      </View>
                    )}
                  </TouchableOpacity>
                </Animated.View>

                {/* Button 2: BACK TO SIGN IN (Switches back to login form) */}
                <Animated.View style={{ transform: [{ scale: Animated.multiply(loginScaleAnim, loginHoverScale) }] }}>
                  <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={toggleAuthMode}
                    onPressIn={() => Animated.spring(loginScaleAnim, { toValue: 0.95, useNativeDriver: true }).start()}
                    onPressOut={() => Animated.spring(loginScaleAnim, { toValue: 1, friction: 4, useNativeDriver: true }).start()}
                    disabled={isLoading}
                    style={[
                      styles.loginBtn,
                      isLoading && styles.loginBtnDisabled
                    ]}
                    {...({
                      onMouseEnter: handleLoginHoverIn,
                      onMouseLeave: handleLoginHoverOut,
                    } as any)}
                  >
                    {/* Local concentric portal layer */}
                    <Animated.View
                      style={[
                        styles.localPortalOuter,
                        styles.portalIndigoOuter,
                        { transform: [{ scale: loginPortalScale }, { rotate: spin }] }
                      ]}
                    />
                    <Animated.View
                      style={[
                        styles.localPortalInner,
                        styles.portalIndigoInner,
                        { transform: [{ scale: loginPortalScale }, { rotate: spinCounter }] }
                      ]}
                    />
                    <Animated.View
                      style={[
                        styles.localPortalCore,
                        styles.portalIndigoCore,
                        { transform: [{ scale: Animated.multiply(loginPortalScale, 0.95) }] }
                      ]}
                    />

                    <View style={[styles.loginBtnContent, { zIndex: 5 }]}>
                      <Text style={styles.loginBtnText}>BACK TO SIGN IN</Text>
                      <Animated.View style={{ transform: [{ translateX: loginArrowTranslate }] }}>
                        <MaterialCommunityIcons name="arrow-right" size={16} color="#FFFFFF" style={styles.btnArrow} />
                      </Animated.View>
                    </View>
                  </TouchableOpacity>
                </Animated.View>
              </>
            )}

          </Animated.View>
          {/* end formContainer */}

        </Animated.View>
        {/* end card */}

      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    minHeight: Platform.OS === 'web' ? ('100vh' as any) : '100%',
    backgroundColor: '#070A10', // ultra deep dark space
  },
  scrollContainer: {
    flexGrow: 1,
    width: '100%',
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
    ...Platform.select({
      web: {
        outlineStyle: 'none',
      } as any,
    }),
  },
  eyeBtn: {
    padding: 6,
    marginLeft: 4,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      web: { cursor: 'pointer' } as any,
    }),
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
