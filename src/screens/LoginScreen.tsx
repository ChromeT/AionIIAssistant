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
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface LoginScreenProps {
  onLoginSuccess: (username: string, passwordEntered: string) => Promise<boolean>;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Animations
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

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

  const handleLogin = () => {
    setErrorMsg(null);

    if (!username.trim()) {
      setErrorMsg('Please enter a username');
      return;
    }
    if (!password.trim()) {
      setErrorMsg('Please enter a password');
      return;
    }

    setIsLoading(true);

    // Dynamic, playful transition: fade out slightly to simulate processing
    Animated.timing(fadeAnim, {
      toValue: 0.6,
      duration: 300,
      useNativeDriver: true,
    }).start();

    // Async login validation
    setTimeout(async () => {
      try {
        const success = await onLoginSuccess(username.trim(), password.trim());
        
        setIsLoading(false);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }).start();

        if (!success) {
          setErrorMsg('Incorrect password for this profile');
        }
      } catch (err) {
        setIsLoading(false);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }).start();
        setErrorMsg('Network connection error or timeout');
      }
    }, 1000);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <Animated.View style={[styles.innerContainer, { opacity: fadeAnim }]}>
        
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
            Manage lists, target drop dungeons, and track gear scores.
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
            <Text style={styles.inputLabel}>PROFILE USERNAME</Text>
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
            <Text style={styles.inputLabel}>SECURITY PIN / PASSWORD</Text>
            <View style={styles.inputWrapper}>
              <MaterialCommunityIcons name="lock-outline" size={20} color="#64748B" style={styles.inputIcon} />
              <TextInput
                placeholder="Enter password..."
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
            <Text style={styles.inputHelpText}>
              For new accounts, this will be set as your profile password.
            </Text>
          </View>

          {/* Remember Me Option */}
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

          {/* Sign In CTA */}
          <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={handleLogin}
              onPressIn={handlePressIn}
              onPressOut={handlePressOut}
              disabled={isLoading}
              style={[styles.loginBtn, isLoading && styles.loginBtnDisabled]}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <View style={styles.loginBtnContent}>
                  <Text style={styles.loginBtnText}>ENTER PORTAL</Text>
                  <MaterialCommunityIcons name="arrow-right" size={16} color="#FFFFFF" style={styles.btnArrow} />
                </View>
              )}
            </TouchableOpacity>
          </Animated.View>
        </View>

        {/* Footer info */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Cloud synchronization active via Firebase Firestore. Entering a new username registers a new account automatically.
          </Text>
        </View>

      </Animated.View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#070A10', // ultra deep dark space
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  innerContainer: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#111723', // glass-like dark navy
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
    marginBottom: 28,
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
    marginBottom: 18,
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
    marginBottom: 24,
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
    backgroundColor: '#4F46E5', // vibrant premium indigo
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
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
    marginTop: 1,
  },
  footer: {
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#20293A30',
  },
  footerText: {
    color: '#475569',
    fontSize: 10,
    textAlign: 'center',
    lineHeight: 14,
    fontWeight: '500',
  },
  inputHelpText: {
    color: '#64748B',
    fontSize: 9,
    marginTop: 4,
    fontWeight: '500',
  },
});
export default LoginScreen;
