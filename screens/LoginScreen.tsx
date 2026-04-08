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
  Alert,
} from 'react-native';
import {
  Mail,
  Eye,
  EyeOff,
  ArrowLeft,
} from 'lucide-react-native';
import { PERMISSIONS, request, RESULTS } from 'react-native-permissions';
import CheckBox from '@react-native-community/checkbox';
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { loginUser } from '../services/authApi';
import { LogLevel, OneSignal } from 'react-native-onesignal';
import { Lock } from 'lucide-react-native';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
const BASE_URL = 'https://apis.staffoo.com.au/api';
const LOGO = require('../assets/staffo.png');
import NetInfo from '@react-native-community/netinfo';


type Props = { navigation: any };

export const sendNotificationTokenToServer = async (
  playerId: string,
  userId?: string
): Promise<void> => {
  console.log('📤 sendNotificationTokenToServer called');
  console.log('   Player ID:', playerId);
  console.log('   User ID:', userId || '(not provided)');

  try {
    const token = await AsyncStorage.getItem('@auth_token');
    if (!token) {
      console.warn('   No auth token → skipping');
      return;
    }
    const payload: any = {
      notification_token: playerId,
    };
    if (userId) {
      payload.id = userId;
    }
    console.log('   Sending payload:', payload);
    const response = await fetch(`${BASE_URL}/store-notification-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });
    console.log('   Response status:', response.status);
    if (!response.ok) {
      let errorText = await response.text().catch(() => 'No response body');
      console.error('   Server error:', errorText);
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


  useEffect(() => {
    console.log('🔧 Configuring GoogleSignin...');
    GoogleSignin.configure({
      webClientId: '224693258602-a6q3lng2a3c8kte6p0llbu9iiduoiqtq.apps.googleusercontent.com',
      offlineAccess: true,
      forceCodeForRefreshToken: true,
    });
    console.log('✅ GoogleSignin configured');
  }, []);

  const requestLocationPermission = async () => {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Location Permission',
          message: 'This app needs your location for security and shift tracking.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }
    const result = await request(PERMISSIONS.IOS.LOCATION_WHEN_IN_USE);
    return result === RESULTS.GRANTED;
  };

  const hasRequestedLocation = useRef(false);

  const handleInputFocus = async () => {
    if (hasRequestedLocation.current) return; 
    hasRequestedLocation.current = true;
    await requestLocationPermission();
  };

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      console.log('🚀 [GOOGLE] Starting Google Sign-In...');
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      await GoogleSignin.signOut().catch(() => { });
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
        body: JSON.stringify({
          credential: accessToken,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server error ${response.status}`);
      }
      const data = await response.json();
      console.log('✅ Callback success:', data);
      const user = data.user;
      const token = data.token;
      if (!user?.id || !token) {
        throw new Error('Invalid response');
      }
      await AsyncStorage.setItem('@auth_token', token);
      await AsyncStorage.setItem('user', JSON.stringify(user));
      await AsyncStorage.setItem('@user_id', String(user.id));
      console.log('🧪 Saved user:', user);
      console.log('🧪 Saved userId:', user.id);
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
        text2: error.message,
        position: 'bottom',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async () => {
    if (!email.trim()) {
      Toast.show({ type: 'error', text1: 'Email Required', position: 'bottom' });
      return;
    }

    if (!password.trim()) {
      Toast.show({ type: 'error', text1: 'Password Required', position: 'bottom' });
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
      const allKeys = await AsyncStorage.getAllKeys();
      console.log('AsyncStorage keys after login:', allKeys);
      console.log('✅ Login Success - Saved:');
      console.log('   • User ID   :', user.id);
      console.log('   • User Type :', userTypeValue);
      console.log('   • Token     :', token ? 'Saved' : 'Missing');
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
        navigation.reset({
          index: 0,
          routes: [{ name: 'Profile' }],
        });
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
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: isTablet ? width * 0.25 : 24 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* <View style={styles.header}>
         
            <Text style={styles.headerTitle}>Sign In</Text>
          </View> */}

          <View style={styles.logoContainer}>
            <Image source={LOGO} resizeMode="contain" style={{ width: width * 0.6, height: width * 0.17 }} />
              <Text style={[styles.subtitle, { fontSize: scale(14) }]}>Enter your credentials to sign in</Text>
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
              testID="email-input"
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
              testID="password-input"
            />
            <TouchableOpacity onPress={() => setShowPassword((p) => !p)} testID="toggle-password">
              {showPassword ? <Eye size={20} color="#666" /> : <EyeOff size={20} color="#666" />}
            </TouchableOpacity>
          </View>

          <View style={styles.rowBetween}>
            <View style={styles.checkboxRow}>
              <CheckBox
                value={rememberMe}
                onValueChange={setRememberMe}
                tintColors={{ true: '#0066ff', false: '#999' }}
              />
              <Text style={{ fontSize: scale(13) }}>Remember Me</Text>
            </View>
          
          </View>

          <TouchableOpacity
            style={[styles.signInButton, loading && { opacity: 0.7 }]}
            onPress={handleSignIn}
            disabled={loading}
            testID="signin-button"
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={[styles.signInText, { fontSize: scale(15) }]}>Sign In</Text>
            )}
          </TouchableOpacity>


          <View style={styles.divider}>
            <View style={styles.line} />
            <Text style={{ marginHorizontal: 12, color: '#888' }}>or continue with</Text>
            <View style={styles.line} />
          </View>


          <View style={styles.socialRow}>

            <TouchableOpacity style={styles.googleButton} onPress={handleGoogleLogin}>
              <Image
                source={require('../assets/google-img.png')}
                style={{ width: 22, height: 22, marginRight: 10 }}
              />
              <Text style={styles.googleText}>Continue with Google</Text>
            </TouchableOpacity>

          </View>

          {/* SIGN UP LINK */}
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
  container: { flex: 1, backgroundColor: '#fff', paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  header: { flexDirection: 'row', marginTop: 20, alignItems: 'center' },
  headerTitle: { fontSize: 25, fontWeight: '600', color: '#000', marginLeft: 50 },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  logoContainer: { marginVertical: 10, justifyContent: 'center', alignItems: 'center' },
  subtitle: { color: '#666', fontSize: 18, justifyContent: 'center', alignItems: 'center' ,marginTop: 20},
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
  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 14,
    borderRadius: 10,
    marginTop: 20,
  },

  googleText: {
    fontSize: 15,
    fontWeight: "600",
  },
  input: { flex: 1, marginLeft: 10, color: '#333' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  checkboxRow: { flexDirection: 'row', alignItems: 'center' },
  forgotText: { color: '#0066ff', fontWeight: '500' },
  signInButton: { backgroundColor: '#0066ff', borderRadius: 12, height: 52, justifyContent: 'center', alignItems: 'center', marginBottom: 30 },
  signInText: { color: '#fff', fontWeight: '600' },
  divider: { flexDirection: 'row', alignItems: 'center', marginBottom: 25 },
  line: { flex: 1, height: 1, backgroundColor: '#ddd' },
  socialRow: { flexDirection: 'row', justifyContent: 'space-evenly', marginBottom: 30 },
  socialBtn: { width: 60, height: 60, borderRadius: 16, borderWidth: 1, borderColor: '#e0e0e0', justifyContent: 'center', alignItems: 'center' },
  signupRow: { flexDirection: 'row', justifyContent: 'center', paddingBottom: 30 },
  signupLink: { color: '#0066ff', fontWeight: '600' },
});