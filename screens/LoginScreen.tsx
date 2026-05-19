import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Image,
  ScrollView,
  useWindowDimensions,
  ActivityIndicator,
  StatusBar,
  PermissionsAndroid,
} from 'react-native';

import { Mail, Eye, EyeOff, Lock, Check } from 'lucide-react-native';
import { PERMISSIONS, request, RESULTS } from 'react-native-permissions';
import CheckBox from '@react-native-community/checkbox';
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { loginUser } from '../services/authApi';
import { OneSignal } from 'react-native-onesignal';
import NetInfo from '@react-native-community/netinfo';

import { GoogleSignin } from '@react-native-google-signin/google-signin';

const BASE_URL = 'https://apis.staffoo.com.au/api';
const LOGO = require('../assets/staffoo.png');

type Props = { navigation: any };

export const sendNotificationTokenToServer = async (
  playerId: string,
  userId?: string,
): Promise<void> => {
  console.log('📤 sendNotificationTokenToServer called');

  try {
    const token = await AsyncStorage.getItem('@auth_token');
    if (!token) {
      console.warn('   No auth token → skipping');
      return;
    }

    const payload: any = { notification_token: playerId };
    if (userId) payload.id = userId;

    const response = await fetch(`${BASE_URL}/store-notification-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'No response body');
      throw new Error(`Server error ${response.status}: ${errorText}`);
    }

    console.log('✅ Token stored on server successfully');
  } catch (error) {
    console.error('❌ Failed to sync OneSignal token:', error);
  }
};

export default function LoginScreen({ navigation }: Props) {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const scale = (size: number) => (width / 375) * size;

  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const hasRequestedLocation = useRef(false);

  // Restore saved email if "Remember Me" was enabled
  useEffect(() => {
    (async () => {
      try {
        const savedEmail = await AsyncStorage.getItem('@saved_email');
        const savedRemember = await AsyncStorage.getItem('@remember_me');
        if (savedEmail && savedRemember === 'true') {
          setEmail(savedEmail);
          setRememberMe(true);
        }
      } catch (e) {
        console.warn('Could not restore saved credentials:', e);
      }
    })();
  }, []);

  // Configure Google Sign-In only for Android
  useEffect(() => {
    if (Platform.OS === 'android') {
      console.log('🔧 Configuring GoogleSignin for Android...');
      GoogleSignin.configure({
        webClientId:
          '224693258602-a6q3lng2a3c8kte6p0llbu9iiduoiqtq.apps.googleusercontent.com',
        offlineAccess: true,
        forceCodeForRefreshToken: true,
      });
      console.log('✅ GoogleSignin configured');
    }
  }, []);

  const requestLocationPermission = async () => {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Location Permission',
          message:
            'This app needs your location for security and shift tracking.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        },
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }

    const result = await request(PERMISSIONS.IOS.LOCATION_WHEN_IN_USE);
    return result === RESULTS.GRANTED;
  };

  const handleInputFocus = async () => {
    if (hasRequestedLocation.current) return;
    hasRequestedLocation.current = true;
    await requestLocationPermission();
  };

  // Google Login - Android Only
  const handleGoogleLogin = async () => {
    if (Platform.OS === 'ios') return;

    try {
      setLoading(true);
      console.log('🚀 [GOOGLE] Starting Google Sign-In...');

      await GoogleSignin.hasPlayServices({
        showPlayServicesUpdateDialog: true,
      });
      await GoogleSignin.signOut().catch(() => {});

      const userInfo = await GoogleSignin.signIn();
      if (userInfo.type !== 'success' || !userInfo.data) {
        throw new Error('Google sign-in failed');
      }

      const tokens = await GoogleSignin.getTokens();
      const { accessToken } = tokens;
      if (!accessToken) throw new Error('No access token');

      const response = await fetch(`${BASE_URL}/auth/google/callback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ credential: accessToken }),
      });

      if (!response.ok) throw new Error(`Server error ${response.status}`);

      const data = await response.json();
      const user = data.user;
      const token = data.token;

      if (!user?.id || !token) throw new Error('Invalid response');

      await AsyncStorage.setItem('@auth_token', token);
      await AsyncStorage.setItem('user', JSON.stringify(user));
      await AsyncStorage.setItem('@user_id', String(user.id));

      // OneSignal Setup
      try {
        const playerId = await OneSignal.User.pushSubscription.getIdAsync();
        if (playerId) {
          await sendNotificationTokenToServer(playerId, String(user.id));
          OneSignal.login(String(user.id));
        }
      } catch (e) {
        console.log('OneSignal error:', e);
      }

      Toast.show({
        type: 'success',
        text1: 'Login Successful',
        position: 'bottom',
      });

      setTimeout(() => {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Profile' }],
        });
      }, 500);
    } catch (error: any) {
      console.error('❌ Google Login Error:', error);
      Toast.show({
        type: 'error',
        text1: 'Login Failed',
        text2: error.message || 'Please try again',
        position: 'bottom',
      });
    } finally {
      setLoading(false);
    }
  };

  const redirectAfterLogin = (user: any) => {
    const type = (user.user_type || '').toLowerCase();

    if (type === 'customer') {
      navigation.reset({
        index: 0,
        routes: [{ name: 'CreateJob' }],
      });
      return;
    }

    navigation.reset({
      index: 0,
      routes: [{ name: 'Profile' }],
    });
  };

  const handleSignIn = async () => {
    if (!email.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Email Required',
        position: 'bottom',
      });
      return;
    }
    if (!password.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Password Required',
        position: 'bottom',
      });
      return;
    }

    setLoading(true);

    try {
      const netState = await NetInfo.fetch();
      if (!netState.isConnected) {
        throw new Error('No internet connection. Please try again.');
      }

      const response = await loginUser({
        email: email.trim(),
        password: password.trim(),
      });

      const user = response;
      const token = response.token;

      await AsyncStorage.setItem('@auth_token', token);
      await AsyncStorage.setItem('@user_id', String(user.id));
      const userTypeValue = user.user_type || 'staff';
      await AsyncStorage.setItem('@user_type', userTypeValue);
      await AsyncStorage.setItem('user', JSON.stringify(user));

      // OneSignal Setup
      try {
        await new Promise(r => setTimeout(r, 1200));
        const playerId = await OneSignal.User.pushSubscription.getIdAsync();
        if (playerId) {
          await sendNotificationTokenToServer(playerId, String(user.id));
          OneSignal.login(String(user.id));
        }
      } catch (e) {
        console.log('OneSignal error:', e);
      }

      Toast.show({
        type: 'success',
        text1: 'Login Successful',
        position: 'bottom',
      });

      setTimeout(() => {
        redirectAfterLogin(user);
      }, 500);
    } catch (err: any) {
      Toast.show({
        type: 'error',
        text1: 'Login Failed',
        text2: err.message || 'Please try again',
        position: 'bottom',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: isTablet ? width * 0.25 : 24,
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.logoContainer}>
            <Image
              source={LOGO}
              resizeMode="contain"
              style={{ width: width * 0.6, height: width * 0.17 }}
            />
            <Text style={[styles.subtitle, { fontSize: scale(14) }]}>
              Enter your credentials to sign in
            </Text>
          </View>

          <Text style={[styles.label, { fontSize: scale(14) }]}>Email</Text>
          <View style={styles.inputBox}>
            <Mail size={20} color="#666" />
            <TextInput
              style={[styles.input, { fontSize: scale(14) }]}
              placeholder="Type your email"
              placeholderTextColor="#aaa"
              value={email}
              onFocus={handleInputFocus}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <Text style={[styles.label, { fontSize: scale(14) }]}>Password</Text>
          <View style={styles.inputBox}>
            <Lock size={20} color="#666" />
            <TextInput
              style={[styles.input, { fontSize: scale(14) }]}
              placeholder="Type your password"
              placeholderTextColor="#aaa"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(p => !p)}>
              {showPassword ? (
                <Eye size={20} color="#666" />
              ) : (
                <EyeOff size={20} color="#666" />
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.rowBetween}>
            {/* <View style={styles.checkboxRow}>
              <CheckBox
                value={rememberMe}
                onValueChange={setRememberMe}
                tintColors={{ true: '#0A7C6E', false: '#999' }}
                boxType="square"
                style={{ width: 18, height: 18 }}
              />
              <Text style={{ fontSize: scale(13), marginLeft: 14 }}>
                Remember Me
              </Text>
            </View> */}
            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: 15,
              }}
              onPress={() => setRememberMe(!rememberMe)}
              activeOpacity={0.8}
            >
              <View
                style={[styles.checkbox, rememberMe && styles.checkboxChecked]}
              >
                {rememberMe && <Check size={16} color="#fff" />}
              </View>

              <Text style={{ fontSize: 14, marginLeft: 0, color: '#444' }}>
                Remember Me
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.signInButton, loading && { opacity: 0.7 }]}
            onPress={handleSignIn}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.signInText}>Sign In</Text>
            )}
          </TouchableOpacity>

          {/* Google Button - Android Only */}
          {Platform.OS === 'android' && (
            <TouchableOpacity
              style={styles.googleButton}
              onPress={handleGoogleLogin}
              disabled={loading}
            >
              <Image
                source={require('../assets/google-img.png')}
                style={{ width: 22, height: 22, marginRight: 10 }}
              />
              <Text style={styles.googleText}>Continue with Google</Text>
            </TouchableOpacity>
          )}

          {/* Sign Up Link */}
          <View style={styles.signupRow}>
            <Text style={{ color: '#666' }}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
              <Text style={styles.signupLink}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#eceff9',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  logoContainer: {
    marginVertical: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  subtitle: { color: '#666', fontSize: 18, marginTop: 20 },
  label: { fontWeight: '600', color: '#000', marginBottom: 6 },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    paddingHorizontal: 14,
    backgroundColor: '#f9f9f9',
    marginBottom: 16,
    height: 50,
  },
  input: { flex: 1, marginLeft: 10, color: '#333' },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  checkboxRow: { flexDirection: 'row', alignItems: 'center' },
  signInButton: {
    backgroundColor: '#0A7C6E',
    borderRadius: 12,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
  },
  signInText: { color: '#fff', fontWeight: '600' },
  divider: { flexDirection: 'row', alignItems: 'center', marginBottom: 25 },
  line: { flex: 1, height: 1, backgroundColor: '#ddd' },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 14,
    borderRadius: 10,
    marginTop: 20,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#0A7C6E',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: { backgroundColor: '#0A7C6E' },
  googleText: { fontSize: 15, fontWeight: '600' },
  signupRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingBottom: 30,
  },
  signupLink: { color: '#0A7C6E', fontWeight: '600' },
});
