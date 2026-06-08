// import React, { useState, useEffect, useRef } from 'react';
// import {
//   View,
//   Text,
//   TextInput,
//   TouchableOpacity,
//   StyleSheet,
//   SafeAreaView,
//   KeyboardAvoidingView,
//   Platform,
//   Image,
//   ScrollView,
//   useWindowDimensions,
//   ActivityIndicator,
//   StatusBar,
//   PermissionsAndroid,
// } from 'react-native';

// import { Mail, Eye, EyeOff, Lock, Check } from 'lucide-react-native';
// import { PERMISSIONS, request, RESULTS } from 'react-native-permissions';
// import CheckBox from '@react-native-community/checkbox';
// import Toast from 'react-native-toast-message';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import { loginUser } from '../services/authApi';
// import { OneSignal } from 'react-native-onesignal';
// import NetInfo from '@react-native-community/netinfo';
// import { GoogleSignin } from '@react-native-google-signin/google-signin';
// import LinearGradient from 'react-native-linear-gradient';

// const BASE_URL = 'https://apis.staffoo.com.au/api';
// const LOGO = require('../assets/staffoo.png');

// const COLORS = {
//   primary: '#89E7D0',
//   primaryDark: '#4FCBB3',
//   background: '#001F3F',
//   surface: '#0B2A4A',
//   surface2: '#12243A',
//   card: 'rgba(255,255,255,0.06)',
//   border: 'rgba(255,255,255,0.08)',
//   text: '#FFFFFF',
//   textSecondary: 'rgba(255,255,255,0.75)',
//   textMuted: 'rgba(255,255,255,0.45)',
// };

// type Props = { navigation: any };

// export const sendNotificationTokenToServer = async (
//   playerId: string,
//   userId?: string,
// ): Promise<void> => {
//   console.log('📤 sendNotificationTokenToServer called');
//   try {
//     const token = await AsyncStorage.getItem('@auth_token');
//     if (!token) return;

//     const payload: any = { notification_token: playerId };
//     if (userId) payload.id = userId;

//     const response = await fetch(`${BASE_URL}/store-notification-token`, {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json',
//         Authorization: `Bearer ${token}`,
//         Accept: 'application/json',
//       },
//       body: JSON.stringify(payload),
//     });

//     if (!response.ok) throw new Error(`Server error ${response.status}`);
//     console.log('✅ Token stored on server successfully');
//   } catch (error) {
//     console.error('❌ Failed to sync OneSignal token:', error);
//   }
// };

// export default function LoginScreen({ navigation }: Props) {
//   const { width } = useWindowDimensions();
//   const isTablet = width >= 768;
//   const scale = (size: number) => (width / 375) * size;

//   const [loading, setLoading] = useState(false);
//   const [email, setEmail] = useState('');
//   const [password, setPassword] = useState('');
//   const [showPassword, setShowPassword] = useState(false);
//   const [rememberMe, setRememberMe] = useState(false);

//   const hasRequestedLocation = useRef(false);

//   useEffect(() => {
//     (async () => {
//       try {
//         const savedEmail = await AsyncStorage.getItem('@saved_email');
//         const savedRemember = await AsyncStorage.getItem('@remember_me');
//         if (savedEmail && savedRemember === 'true') {
//           setEmail(savedEmail);
//           setRememberMe(true);
//         }
//       } catch (e) {
//         console.warn('Could not restore saved credentials:', e);
//       }
//     })();
//   }, []);

//   useEffect(() => {
//     if (Platform.OS === 'android') {
//       GoogleSignin.configure({
//         webClientId:
//           '224693258602-a6q3lng2a3c8kte6p0llbu9iiduoiqtq.apps.googleusercontent.com',
//         offlineAccess: true,
//         forceCodeForRefreshToken: true,
//       });
//     }
//   }, []);

//   const requestLocationPermission = async () => {
//     if (Platform.OS === 'android') {
//       const granted = await PermissionsAndroid.request(
//         PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
//         {
//           title: 'Location Permission',
//           message:
//             'This app needs your location for security and shift tracking.',
//           buttonNeutral: 'Ask Me Later',
//           buttonNegative: 'Cancel',
//           buttonPositive: 'OK',
//         },
//       );
//       return granted === PermissionsAndroid.RESULTS.GRANTED;
//     }

//     const result = await request(PERMISSIONS.IOS.LOCATION_WHEN_IN_USE);
//     return result === RESULTS.GRANTED;
//   };

//   const handleInputFocus = async () => {
//     if (hasRequestedLocation.current) return;
//     hasRequestedLocation.current = true;
//     await requestLocationPermission();
//   };

//   const handleGoogleLogin = async () => {
//     if (Platform.OS === 'ios') return;
//     // ... (your existing Google login logic remains unchanged)
//     try {
//       setLoading(true);
//       await GoogleSignin.hasPlayServices({
//         showPlayServicesUpdateDialog: true,
//       });
//       await GoogleSignin.signOut().catch(() => {});

//       const userInfo = await GoogleSignin.signIn();
//       if (userInfo.type !== 'success' || !userInfo.data) {
//         throw new Error('Google sign-in failed');
//       }

//       const tokens = await GoogleSignin.getTokens();
//       const { accessToken } = tokens;
//       if (!accessToken) throw new Error('No access token');

//       const response = await fetch(`${BASE_URL}/auth/google/callback`, {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//           Accept: 'application/json',
//         },
//         body: JSON.stringify({ credential: accessToken }),
//       });

//       if (!response.ok) throw new Error(`Server error ${response.status}`);

//       const data = await response.json();
//       const user = data.user;
//       const token = data.token;

//       await AsyncStorage.setItem('@auth_token', token);
//       await AsyncStorage.setItem('user', JSON.stringify(user));
//       await AsyncStorage.setItem('@user_id', String(user.id));

//       const playerId = await OneSignal.User.pushSubscription.getIdAsync();
//       if (playerId) {
//         await sendNotificationTokenToServer(playerId, String(user.id));
//         OneSignal.login(String(user.id));
//       }

//       Toast.show({
//         type: 'success',
//         text1: 'Login Successful',
//         position: 'bottom',
//       });

//       setTimeout(() => {
//         navigation.reset({ index: 0, routes: [{ name: 'Profile' }] });
//       }, 500);
//     } catch (error: any) {
//       Toast.show({
//         type: 'error',
//         text1: 'Login Failed',
//         text2: error.message || 'Please try again',
//       });
//     } finally {
//       setLoading(false);
//     }
//   };

//   const redirectAfterLogin = (user: any) => {
//     const type = (user.user_type || '').toLowerCase();
//     if (type === 'customer') {
//       navigation.reset({ index: 0, routes: [{ name: 'CreateJob' }] });
//     } else {
//       navigation.reset({ index: 0, routes: [{ name: 'Profile' }] });
//     }
//   };

//   const handleSignIn = async () => {
//     if (!email.trim())
//       return Toast.show({ type: 'error', text1: 'Email Required' });
//     if (!password.trim())
//       return Toast.show({ type: 'error', text1: 'Password Required' });

//     setLoading(true);
//     try {
//       const netState = await NetInfo.fetch();
//       if (!netState.isConnected) throw new Error('No internet connection.');

//       const response = await loginUser({
//         email: email.trim(),
//         password: password.trim(),
//       });
//       const user = response;
//       const token = response.token;

//       await AsyncStorage.setItem('@auth_token', token);
//       await AsyncStorage.setItem('@user_id', String(user.id));
//       await AsyncStorage.setItem('@user_type', user.user_type || 'staff');
//       await AsyncStorage.setItem('user', JSON.stringify(user));

//       const playerId = await OneSignal.User.pushSubscription.getIdAsync();
//       if (playerId) {
//         await sendNotificationTokenToServer(playerId, String(user.id));
//         OneSignal.login(String(user.id));
//       }

//       Toast.show({ type: 'success', text1: 'Login Successful' });

//       setTimeout(() => redirectAfterLogin(user), 500);
//     } catch (err: any) {
//       Toast.show({
//         type: 'error',
//         text1: 'Login Failed',
//         text2: err.message || 'Please try again',
//       });
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <SafeAreaView style={styles.container}>
//       <KeyboardAvoidingView
//         style={{ flex: 1 }}
//         behavior={Platform.OS === 'ios' ? 'padding' : undefined}
//       >
//         <ScrollView
//           contentContainerStyle={{
//             paddingHorizontal: isTablet ? width * 0.25 : 24,
//           }}
//           showsVerticalScrollIndicator={false}
//           keyboardShouldPersistTaps="handled"
//         >
//           <View style={styles.logoContainer}>
//             <Image
//               source={LOGO}
//               resizeMode="contain"
//               style={{ width: width * 0.6, height: width * 0.17 }}
//             />
//             <Text style={[styles.subtitle, { fontSize: scale(14) }]}>
//               Enter your credentials to sign in
//             </Text>
//           </View>

//           <Text style={[styles.label, { fontSize: scale(14) }]}>Email</Text>
//           <LinearGradient
//             colors={[
//               'rgba(255, 255, 255, 0.42)',
//               'rgba(255, 255, 255, 0.35)',
//               'rgba(255, 255, 255, 0.22)',
//               'rgba(255, 255, 255, 0.12)',
//               'rgba(255, 255, 255, 0.25)',
//             ]}
//             start={{ x: 0, y: 0 }}
//             end={{ x: 1, y: 1 }}
//             style={styles.gradientInput}
//           >
//             <View style={styles.inputInner}>
//               <Mail size={22} color={COLORS.textMuted} />
//               <TextInput
//                 style={styles.input}
//                 placeholder="Type your email"
//                 placeholderTextColor={COLORS.textMuted}
//                 value={email}
//                 onFocus={handleInputFocus}
//                 onChangeText={setEmail}
//                 keyboardType="email-address"
//                 autoCapitalize="none"
//                 autoCorrect={false}
//               />
//             </View>
//           </LinearGradient>

//           <Text style={[styles.label, { fontSize: scale(14) }]}>Password</Text>
//           <LinearGradient
//             colors={[
//               'rgba(255, 255, 255, 0.42)',
//               'rgba(255, 255, 255, 0.35)',
//               'rgba(255, 255, 255, 0.22)',
//               'rgba(255, 255, 255, 0.12)',
//               'rgba(255, 255, 255, 0.25)',
//             ]}
//             start={{ x: 0, y: 0 }}
//             end={{ x: 1, y: 1 }}
//             style={styles.gradientInput}
//           >
//             <View style={styles.inputInner}>
//               <Lock size={22} color={COLORS.textMuted} />
//               <TextInput
//                 style={styles.input}
//                 placeholder="Type your password"
//                 placeholderTextColor={COLORS.textMuted}
//                 value={password}
//                 onChangeText={setPassword}
//                 secureTextEntry={!showPassword}
//               />
//               <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
//                 {showPassword ? (
//                   <Eye size={22} color={COLORS.textMuted} />
//                 ) : (
//                   <EyeOff size={22} color={COLORS.textMuted} />
//                 )}
//               </TouchableOpacity>
//             </View>
//           </LinearGradient>

//           <TouchableOpacity
//             style={{
//               flexDirection: 'row',
//               alignItems: 'center',
//               marginVertical: 15,
//             }}
//             onPress={() => setRememberMe(!rememberMe)}
//           >
//             <View
//               style={[styles.checkbox, rememberMe && styles.checkboxChecked]}
//             >
//               {rememberMe && <Check size={16} color="#fff" />}
//             </View>
//             <Text style={{ fontSize: 14, marginLeft: 8, color: '#fff' }}>
//               Remember Me
//             </Text>
//           </TouchableOpacity>

//           <TouchableOpacity
//             style={[styles.signInButton, loading && { opacity: 0.7 }]}
//             onPress={handleSignIn}
//             disabled={loading}
//           >
//             {loading ? (
//               <ActivityIndicator color="#fff" />
//             ) : (
//               <Text style={styles.signInText}>Sign In</Text>
//             )}
//           </TouchableOpacity>

//           {Platform.OS === 'android' && (
//             <TouchableOpacity
//               style={styles.googleButton}
//               onPress={handleGoogleLogin}
//               disabled={loading}
//             >
//               <Image
//                 source={require('../assets/google-img.png')}
//                 style={{ width: 22, height: 22, marginRight: 10 }}
//               />
//               <Text style={styles.googleText}>Continue with Google</Text>
//             </TouchableOpacity>
//           )}

//           <View style={styles.signupRow}>
//             <Text style={{ color: '#fff' }}>Don't have an account? </Text>
//             <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
//               <Text style={styles.signupLink}>Sign Up</Text>
//             </TouchableOpacity>
//           </View>
//         </ScrollView>
//       </KeyboardAvoidingView>
//     </SafeAreaView>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: COLORS.background,
//     paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
//   },
//   logoContainer: {
//     marginVertical: 40,
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   subtitle: {
//     color: COLORS.textSecondary,
//     marginTop: 20,
//     textAlign: 'center',
//   },
//   label: {
//     fontWeight: '600',
//     color: COLORS.text,
//     marginBottom: 7,
//   },
//   gradientInput: {
//     borderRadius: 12,
//     marginBottom: 16,
//   },
//   inputInner: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     paddingHorizontal: 16,
//     height: 52,
//   },
//   input: {
//     flex: 1,
//     marginLeft: 12,
//     fontSize: 16,
//     color: COLORS.text,
//   },
//   checkbox: {
//     width: 20,
//     height: 20,
//     borderRadius: 6,
//     borderWidth: 2,
//     borderColor: COLORS.primary,
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   checkboxChecked: {
//     backgroundColor: COLORS.primary,
//   },
//   signInButton: {
//     backgroundColor: COLORS.primary,
//     borderRadius: 12,
//     height: 52,
//     justifyContent: 'center',
//     alignItems: 'center',
//     marginVertical: 10,
//   },
//   signInText: {
//     color: COLORS.background,
//     fontWeight: '800',
//     fontSize: 16,
//   },
//   googleButton: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'center',
//     borderWidth: 1,
//     borderColor: COLORS.border,
//     backgroundColor: COLORS.card,
//     padding: 14,
//     borderRadius: 12,
//     marginTop: 10,
//   },
//   googleText: {
//     fontSize: 15,
//     fontWeight: '600',
//     color: COLORS.text,
//   },
//   signupRow: {
//     flexDirection: 'row',
//     justifyContent: 'center',
//     marginTop: 30,
//     paddingBottom: 30,
//   },
//   signupLink: {
//     color: COLORS.primary,
//     fontWeight: '600',
//   },
// });

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
import LinearGradient from 'react-native-linear-gradient';

const BASE_URL = 'https://apis.staffoo.com.au/api';
const LOGO = require('../assets/staffoo.png');

const COLORS = {
  primary: '#89E7D0',
  primaryDark: '#4FCBB3',
  background: '#001F3F',
  surface: '#0B2A4A',
  surface2: '#12243A',
  card: 'rgba(255,255,255,0.06)',
  border: 'rgba(255,255,255,0.08)',
  text: '#FFFFFF',
  textSecondary: 'rgba(255,255,255,0.75)',
  textMuted: 'rgba(255,255,255,0.45)',
};

type Props = { navigation: any };

export const sendNotificationTokenToServer = async (
  playerId: string,
  userId?: string,
): Promise<void> => {
  console.log('📤 sendNotificationTokenToServer called');
  try {
    const token = await AsyncStorage.getItem('@auth_token');
    if (!token) return;

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

    if (!response.ok) throw new Error(`Server error ${response.status}`);
    console.log('✅ Token stored on server successfully');
  } catch (error) {
    console.error('❌ Failed to sync OneSignal token:', error);
  }
};

export default function LoginScreen({ navigation }: Props) {
  const { width } = useWindowDimensions();

  const isTablet = width >= 768;
  const scale = (size: number) => (width / 375) * size;
  const [forgotLoading, setForgotLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const hasRequestedLocation = useRef(false);

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
    if (Platform.OS === 'android') {
      GoogleSignin.configure({
        webClientId:
          '224693258602-a6q3lng2a3c8kte6p0llbu9iiduoiqtq.apps.googleusercontent.com',
        offlineAccess: true,
        forceCodeForRefreshToken: true,
      });
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

  const handleGoogleLogin = async () => {
    if (Platform.OS === 'ios') return;
    // ... (your existing Google login logic remains unchanged)
    try {
      setLoading(true);
      await GoogleSignin.hasPlayServices({
        showPlayServicesUpdateDialog: true,
      });
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
        body: JSON.stringify({ credential: accessToken }),
      });

      if (!response.ok) throw new Error(`Server error ${response.status}`);

      const data = await response.json();
      const user = data.user;
      const token = data.token;

      await AsyncStorage.setItem('@auth_token', token);
      await AsyncStorage.setItem('user', JSON.stringify(user));
      await AsyncStorage.setItem('@user_id', String(user.id));

      const playerId = await OneSignal.User.pushSubscription.getIdAsync();
      if (playerId) {
        await sendNotificationTokenToServer(playerId, String(user.id));
        OneSignal.login(String(user.id));
      }

      Toast.show({
        type: 'success',
        text1: 'Login Successful',
        position: 'bottom',
      });

      setTimeout(() => {
        navigation.reset({ index: 0, routes: [{ name: 'Profile' }] });
      }, 500);
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Login Failed',
        text2: error.message || 'Please try again',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      return Toast.show({
        type: 'error',
        text1: 'Enter your email first',
      });
    }

    setForgotLoading(true);

    try {
      const response = await fetch(`${BASE_URL}/auth/password-reset-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          email: email.trim(),
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData?.message || 'Request failed');
      }

      Toast.show({
        type: 'success',
        text1: 'Reset link sent',
        text2: 'Check your email inbox',
      });
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Failed',
        text2: error.message || 'Try again later',
      });
    } finally {
      setForgotLoading(false);
    }
  };

  const redirectAfterLogin = (user: any) => {
    const type = (user.user_type || '').toLowerCase();
    if (type === 'customer') {
      navigation.reset({ index: 0, routes: [{ name: 'CreateJob' }] });
    } else {
      navigation.reset({ index: 0, routes: [{ name: 'Profile' }] });
    }
  };

  const handleSignIn = async () => {
    if (!email.trim())
      return Toast.show({ type: 'error', text1: 'Email Required' });
    if (!password.trim())
      return Toast.show({ type: 'error', text1: 'Password Required' });

    setLoading(true);
    try {
      const netState = await NetInfo.fetch();
      if (!netState.isConnected) throw new Error('No internet connection.');

      const response = await loginUser({
        email: email.trim(),
        password: password.trim(),
      });
      const user = response;
      const token = response.token;

      await AsyncStorage.setItem('@auth_token', token);
      await AsyncStorage.setItem('@user_id', String(user.id));
      await AsyncStorage.setItem('@user_type', user.user_type || 'staff');
      await AsyncStorage.setItem('user', JSON.stringify(user));

      const playerId = await OneSignal.User.pushSubscription.getIdAsync();
      if (playerId) {
        await sendNotificationTokenToServer(playerId, String(user.id));
        OneSignal.login(String(user.id));
      }

      Toast.show({ type: 'success', text1: 'Login Successful' });

      setTimeout(() => redirectAfterLogin(user), 500);
    } catch (err: any) {
      Toast.show({
        type: 'error',
        text1: 'Login Failed',
        text2: err.message || 'Please try again',
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
          <View style={styles.inputContainer}>
            <View style={styles.inputInner}>
              <Mail size={22} color="#6B7280" />
              <TextInput
                style={[styles.input, { color: '#111827' }]}
                placeholder="Type your email"
                placeholderTextColor="#797777"
                value={email}
                onFocus={handleInputFocus}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>

          <Text style={[styles.label, { fontSize: scale(14) }]}>Password</Text>
          <View style={styles.inputContainer}>
            <View style={styles.inputInner}>
              <Lock size={22} color="#6B7280" />
              <TextInput
                style={[styles.input, { color: '#111827' }]}
                placeholder="Type your password"
                placeholderTextColor="#797777"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                {showPassword ? (
                  <Eye size={22} color="#6B7280" />
                ) : (
                  <EyeOff size={22} color="#6B7280" />
                )}
              </TouchableOpacity>
            </View>
          </View>
          <TouchableOpacity
            onPress={() => navigation.navigate('ForgotPassword', { email })}
            style={{ alignSelf: 'flex-end', marginBottom: 10 }}
          >
            <Text style={{ color: '#89E7D0', fontSize: 13, fontWeight: '600' }}>
              Forgot password?
            </Text>
          </TouchableOpacity>
          {/* <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginVertical: 7,
            }}
            onPress={() => setRememberMe(!rememberMe)}
          >
            <View
              style={[styles.checkbox, rememberMe && styles.checkboxChecked]}
            >
              {rememberMe && <Check size={16} color="#fff" />}
            </View>
            <Text style={{ fontSize: 14, marginLeft: 8, color: '#fff' }}>
              Remember Me
            </Text>
          </TouchableOpacity> */}

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

          {/* {Platform.OS === 'android' && (
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
          )} */}

          <View style={styles.signupRow}>
            <Text style={{ color: '#fff' }}>Don't have an account? </Text>
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
    // backgroundColor: COLORS.background,
    backgroundColor: '#111111',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  logoContainer: {
    marginVertical: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  subtitle: {
    color: COLORS.textSecondary,
    marginTop: 20,
    textAlign: 'center',
  },
  label: {
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 7,
  },
  gradientInput: {
    borderRadius: 12,
    marginBottom: 16,
  },
  inputInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 42,
  },
  input: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: COLORS.text,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: COLORS.primary,
  },
  signInButton: {
    backgroundColor: '#0A7C6E',
    borderRadius: 50,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 10,
  },
  signInText: {
    color: '#ffff',
    fontWeight: '800',
    fontSize: 16,
  },
  inputContainer: {
    backgroundColor: '#cacaca',
    borderRadius: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
    padding: 14,
    borderRadius: 12,
    marginTop: 10,
  },
  googleText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  signupRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 30,
    paddingBottom: 30,
  },
  signupLink: {
    color: COLORS.primary,
    fontWeight: '600',
  },
});
