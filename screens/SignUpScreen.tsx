// import React, { useState, useRef, useEffect } from 'react';
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
//   ActivityIndicator,
//   ScrollView,
//   Animated,
//   useWindowDimensions,
//   StatusBar,
// } from 'react-native';
// // At the top of your file (import once)
// import {
//   ArrowLeft,
//   Phone,
//   Building,
//   FileText,
//   User,
//   Mail,
//   Lock,
//   Eye,
//   EyeOff,
//   Building2,
//   UserRound,
//   LockIcon,
// } from 'lucide-react-native';
// import Toast from 'react-native-toast-message';
// import { registerUser } from '../services/authApi'; // adjust path if needed
// import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import { LogLevel, OneSignal } from 'react-native-onesignal';
// import { sendNotificationTokenToServer } from './LoginScreen';

// const LOGO = require('../assets/staffo.png');

// export default function SignUpScreen({ navigation }: { navigation: any }) {
//   const [userType, setUserType] = useState<'staff' | 'customer' | 'contractor'>('staff');

//   const fadeAnim = useRef(new Animated.Value(1)).current;
//   const slideAnim = useRef(new Animated.Value(0)).current;

//   const { width } = useWindowDimensions();
//   const isTablet = width >= 768;

//   // Form fields
//   const [name, setName] = useState('');
//   const [email, setEmail] = useState('');
//   const [password, setPassword] = useState('');
//   const [confirmPassword, setConfirmPassword] = useState('');
//   const [phone, setPhone] = useState('');
//   const [companyName, setCompanyName] = useState('');
//   const [registration, setRegistration] = useState('');

//   const [loading, setLoading] = useState(false);
//   const [showPassword, setShowPassword] = useState(false);
//   const [showConfirmPassword, setShowConfirmPassword] = useState(false);
//   const BASE_URL = 'https://apis.staffoo.com.au/api';
//   const userTypeRef = useRef(userType);


//   useEffect(() => {
//     userTypeRef.current = userType;
//   }, [userType]);

//   useEffect(() => {
//     GoogleSignin.configure({
//       webClientId: '224693258602-a6q3lng2a3c8kte6p0llbu9iiduoiqtq.apps.googleusercontent.com',
//       offlineAccess: true,
//       forceCodeForRefreshToken: true,
//     });
//   }, []);



//   const handleGoogleLogin = async () => {
//     try {
//       setLoading(true);

//       await GoogleSignin.hasPlayServices();
//       await GoogleSignin.signOut().catch(() => { });

//       const userInfo = await GoogleSignin.signIn();

//       if (userInfo.type !== 'success') {
//         throw new Error('Google cancelled');
//       }

//       const { accessToken } = await GoogleSignin.getTokens();

//       // ✅ CREATE PAYLOAD OBJECT
//       const payload = {
//         credential: accessToken,
//         user_type: userTypeRef.current,
//       };

//       // ✅ LOG FULL PAYLOAD (VERY CLEAR)
//       console.log('🔥 GOOGLE CALLBACK PAYLOAD:', JSON.stringify(payload, null, 2));

//       const callbackRes = await fetch(`${BASE_URL}/auth/google/callback`, {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify(payload),
//       });

//       const data = await callbackRes.json();

//       console.log('✅ API Response:', data);

//       const user = data.user;
//       const token = data.token;

//       await AsyncStorage.setItem('@auth_token', token);
//       await AsyncStorage.setItem('user', JSON.stringify(user));
//       await AsyncStorage.setItem('@user_id', String(user.id));

//       Toast.show({ type: 'success', text1: 'Login Successful' });

//       navigation.reset({
//         index: 0,
//         routes: [{ name: 'Profile' }],
//       });

//     } catch (err: any) {
//       console.log('❌ Google error:', err);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const animateTabChange = () => {
//     Animated.sequence([
//       Animated.parallel([
//         Animated.timing(fadeAnim, { toValue: 0, duration: 140, useNativeDriver: true }),
//         Animated.timing(slideAnim, { toValue: 20, duration: 140, useNativeDriver: true }),
//       ]),
//       Animated.parallel([
//         Animated.timing(fadeAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
//         Animated.timing(slideAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
//       ]),
//     ]).start();
//   };

//   const handleUserTypeChange = (newType: 'staff' | 'customer' | 'contractor') => {
//     if (newType === userType) return;
//     setUserType(newType);
//     animateTabChange();
//   };

//   const getDisplayName = (type: string) => {
//     if (type === 'contractor') return 'Sub Contractor';
//     return type.charAt(0).toUpperCase() + type.slice(1);
//   };

//   const handleSignUp = async () => {
//     if (!name.trim()) return Toast.show({ type: 'error', text1: 'Name is required' });
//     if (!email.trim() || !email.includes('@')) return Toast.show({ type: 'error', text1: 'Valid email is required' });
//     if (password.length < 6) return Toast.show({ type: 'error', text1: 'Password must be at least 6 characters' });
//     if (password !== confirmPassword) return Toast.show({ type: 'error', text1: 'Passwords do not match' });

//     const payload: any = {
//       name: name.trim(),
//       email: email.trim(),
//       password,
//       password_confirmation: confirmPassword
//     };

//     // if (userType === 'staff' || userType === 'customer') {
//     //   if (!phone.trim()) return Toast.show({ type: 'error', text1: 'Phone is required' });
//     //   payload.phone = phone.trim();
//     // }

//     if (userType === 'contractor') {
//       if (!companyName.trim()) return Toast.show({ type: 'error', text1: 'Company name is required' });
//       if (!registration.trim()) return Toast.show({ type: 'error', text1: 'Registration number is required' });
//       payload.company_name = companyName.trim();
//       payload.registration_number = registration.trim();
//     }

//     setLoading(true);

//     try {
//       await registerUser({ user_type: userType, ...payload });
//       Toast.show({
//         type: 'success',
//         text1: 'Account created successfully!',
//         onHide: () => navigation.navigate('Login')
//       });
//     } catch (error: any) {
//       Toast.show({
//         type: 'error',
//         text1: 'Registration failed',
//         text2: error?.message || 'Please try again'
//       });
//     } finally {
//       setLoading(false);
//     }
//   };

//   const renderExtraFields = () => {
//     if (userType === 'staff' || userType === 'customer') {
//       return (
//         <View>
//           <Text style={styles.label}>Phone</Text>
//           <View style={styles.inputWrapper}>
//             <Phone size={22} color="#666" />
//             <TextInput
//               style={styles.input}
//               placeholder="657657656756"
//               value={phone}
//               placeholderTextColor="#9CA3AF"
//               onChangeText={setPhone}
//               keyboardType="phone-pad"
//               maxLength={20}
//             />
//           </View>
//         </View>
//       );
//     }

//     if (userType === 'contractor') {
//       return (
//         <View>
//           <Text style={styles.label}>Company Name *</Text>
//           <View style={styles.inputWrapper}>

//             <Building2 size={22} color="#666" />
//             <TextInput
//               style={styles.input}
//               placeholder="Company name"
//               placeholderTextColor="#9CA3AF"
//               value={companyName}
//               onChangeText={setCompanyName}
//             />
//           </View>

//           <Text style={styles.label}>Registration Number *</Text>
//           <View style={styles.inputWrapper}>
//             <FileText size={22} color="#666" />
//             <TextInput
//               style={styles.input}
//               placeholder="REG-12345 or NTN number"
//               value={registration}
//               placeholderTextColor="#9CA3AF"
//               onChangeText={setRegistration}
//               autoCapitalize="characters"
//             />
//           </View>
//         </View>
//       );
//     }

//     return <View />;
//   };

//   return (
//     <SafeAreaView style={styles.container}>
//       <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
//         <ScrollView
//           contentContainerStyle={{
//             paddingHorizontal: isTablet ? width * 0.2 : 24
//           }}
//           showsVerticalScrollIndicator={false}
//         >
//           {/* <View style={styles.header}>
//             <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
//               <ArrowLeft size={24} color="#000" />
//             </TouchableOpacity>
//             <Text style={styles.headerTitle}>Sign Up</Text>
//             <View style={{ width: 44 }} />
//           </View> */}






//           <View style={styles.content}>
//             <View style={styles.logoContainer}>
//               <Image source={LOGO} style={styles.logo} resizeMode="contain" />
//                 <Text style={styles.subtitle}>Create your account to get started</Text>
//             </View>



//             <View style={styles.segmentContainer}>
//               {(['staff', 'customer', 'contractor'] as const).map((type) => (
//                 <TouchableOpacity
//                   key={type}
//                   style={[styles.segment, userType === type && styles.segmentActive]}
//                   onPress={() => handleUserTypeChange(type)}
//                 >
//                   <Text style={[styles.segmentText, userType === type && styles.segmentTextActive]}>
//                     {getDisplayName(type)}
//                   </Text>
//                 </TouchableOpacity>
//               ))}
//             </View>

//             <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
//               {/* Common fields */}
//               <Text style={styles.label}>Name *</Text>
//               <View style={styles.inputWrapper}>
//                 <UserRound size={22} color="#666" />
//                 <TextInput
//                   style={styles.input}
//                   placeholder="Full name"
//                   placeholderTextColor="#9CA3AF"
//                   value={name}
//                   onChangeText={setName}
//                   autoCapitalize="words"
//                 />
//               </View>

//               <Text style={styles.label}>Email *</Text>
//               <View style={styles.inputWrapper}>
//                 <Mail size={22} color="#666" />
//                 <TextInput
//                   style={styles.input}
//                   placeholder="your@email.com"
//                   placeholderTextColor="#9CA3AF"
//                   value={email}
//                   onChangeText={setEmail}
//                   keyboardType="email-address"
//                   autoCapitalize="none"
//                 />
//               </View>

//               <Text style={styles.label}>Password *</Text>
//               <View style={styles.inputWrapper}>
//                 <LockIcon size={22} color="#666" />
//                 <TextInput
//                   style={styles.input}
//                   placeholder="At least 6 characters"
//                   value={password}
//                   placeholderTextColor="#9CA3AF"
//                   onChangeText={setPassword}
//                   secureTextEntry={!showPassword}
//                   autoCapitalize="none"
//                 />
//                 <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
//                   {showPassword ? (
//                     <Eye size={22} color="#666" />
//                   ) : (
//                     <EyeOff size={22} color="#666" />
//                   )}
//                 </TouchableOpacity>
//               </View>

//               <Text style={styles.label}>Confirm Password *</Text>
//               <View style={styles.inputWrapper}>
//                 <LockIcon size={22} color="#666" />
//                 <TextInput
//                   style={styles.input}
//                   placeholder="Confirm password"
//                   value={confirmPassword}
//                   placeholderTextColor="#9CA3AF"
//                   onChangeText={setConfirmPassword}
//                   secureTextEntry={!showConfirmPassword}
//                   autoCapitalize="none"
//                 />
//                 <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
//                   {showConfirmPassword ? (
//                     <Eye size={22} color="#666" />
//                   ) : (
//                     <EyeOff size={22} color="#666" />
//                   )}
//                 </TouchableOpacity>
//               </View>

//               {/* Conditional extra fields */}
//               {renderExtraFields()}
//             </Animated.View>

//             <TouchableOpacity
//               style={[styles.signUpButton, loading && styles.buttonDisabled]}
//               onPress={handleSignUp}
//               disabled={loading}
//             >
//               {loading ? (
//                 <ActivityIndicator color="#fff" size="small" />
//               ) : (
//                 <Text style={styles.signUpText}>Sign Up</Text>
//               )}
//             </TouchableOpacity>

//             <View style={styles.divider}>
//               <View style={styles.line} />
//               <Text style={{ marginHorizontal: 12, color: '#888' }}>or continue with</Text>
//               <View style={styles.line} />
//             </View>
//             <Text style={{
//               textAlign: 'center',
//               color: '#666',
//               fontSize: 13,
//               marginBottom: 0,
//               marginTop: 10
//             }}>
//               Please choose your account type (Staff, Customer, or Contractor) before continuing with Google
//             </Text>
//             <View style={styles.socialRow}>


//               <TouchableOpacity style={styles.googleButton} onPress={handleGoogleLogin}>
//                 <Image
//                   source={require('../assets/google-img.png')}
//                   style={{ width: 22, height: 22, marginRight: 10 }}
//                 />
//                 <Text style={styles.googleText}>
//                   Sign Up as {getDisplayName(userType)} with Google
//                 </Text>
//               </TouchableOpacity>

//             </View>

//             <View style={styles.footer}>
//               <Text style={styles.footerText}>Already have an account? </Text>
//               <TouchableOpacity onPress={() => navigation.navigate('Login')}>
//                 <Text style={styles.loginLink}>Login</Text>
//               </TouchableOpacity>
//             </View>
//           </View>
//         </ScrollView>
//       </KeyboardAvoidingView>
//     </SafeAreaView>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: '#fff',
//     paddingTop: 15
//     // paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
//   },
//   header: {
//     flexDirection: 'row',
//     paddingHorizontal: 0,
//     marginTop: 20,
//   },

//   googleText: {
//     fontSize: 15,
//     fontWeight: "600",
//   },
//   headerTitle: {
//     fontSize: 20,
//     fontWeight: '600',
//     color: '#000',
//     marginLeft: '26%', // space after back button
//   },
//   googleButton: {
//     flexDirection: "row",
//     alignItems: "center",
//     justifyContent: "center",
//     borderWidth: 1,
//     borderColor: "#ddd",
//     padding: 14,
//     paddingTop:5,
//     paddingBottom:5,
//     borderRadius: 10,
//     marginTop: 15,
//   },
//   backButton: {
//     width: 44,
//     height: 44,
//     borderRadius: 12,
//     borderWidth: 1,
//     borderColor: '#e0e0e0',
//     justifyContent: 'center',
//     alignItems: 'center'
//   },
//   content: { paddingHorizontal: 4 },
//    logoContainer: { marginVertical: 10, justifyContent: 'center', alignItems: 'center' },
//   subtitle: { color: '#666', fontSize: 14, justifyContent: 'center', alignItems: 'center' ,marginTop: 5, marginBottom:10},
//   logo: { width: 160, height: 52 },

//   segmentContainer: {
//     flexDirection: 'row',
//     backgroundColor: '#f1f5f9',
//     borderRadius: 14,
//     padding: 5,
//     marginBottom: 14
//   },
//   segment: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 10 },
//   segmentActive: {
//     backgroundColor: '#fff',
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.1,
//     shadowRadius: 4,
//     elevation: 3
//   },
//   divider: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
//   line: { flex: 1, height: 1, backgroundColor: '#ddd' },
//   socialRow: { flexDirection: 'row', justifyContent: 'space-evenly', marginBottom: 30 },
//   socialBtn: { width: 60, height: 60, borderRadius: 16, borderWidth: 1, borderColor: '#e0e0e0', justifyContent: 'center', alignItems: 'center' },
//   segmentText: { fontSize: 12, fontWeight: '600', color: '#64748b' },
//   segmentTextActive: { color: '#0066ff', fontWeight: '700' },
//   label: { fontSize: 14, color: '#444', marginBottom: 2, fontWeight: '500' },
//   inputWrapper: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     borderWidth: 1,
//     borderColor: '#e0e0e0',
//     borderRadius: 12,
//     paddingHorizontal: 16,
//     height: 45,
//     backgroundColor: '#fafafa',
//     marginBottom: 20
//   },
//   input: { flex: 1, fontSize: 16, color: '#000', marginLeft: 10 },
//   signUpButton: {
//     backgroundColor: '#0066ff',
//     borderRadius: 14,
//     height: 50,
//     justifyContent: 'center',
//     alignItems: 'center',
//     marginTop: 2,
//     marginBottom: 15
//   },
//   buttonDisabled: { opacity: 0.7 },
//   signUpText: { color: '#fff', fontSize: 17, fontWeight: '700' },
//   footer: { flexDirection: 'row', justifyContent: 'center', paddingTop: 0, marginBottom: 20 },
//   footerText: { color: '#666', fontSize: 14 },
//   loginLink: { color: '#0066ff', fontWeight: '700', fontSize: 14 },
// });



import React, { useState, useRef, useEffect } from 'react';
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
  ActivityIndicator,
  ScrollView,
  Animated,
  useWindowDimensions,
  Modal,
  StatusBar,
  Linking,
} from 'react-native';

import {
  ArrowLeft,
  Phone,
  Building2,
  FileText,
  UserRound,
  Mail,
  LockIcon,
  Eye,
  EyeOff,
  Check,
} from 'lucide-react-native';

import Toast from 'react-native-toast-message';
import { registerUser } from '../services/authApi';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LogLevel, OneSignal } from 'react-native-onesignal';
import { sendNotificationTokenToServer } from './LoginScreen';

const LOGO = require('../assets/staffo.png');

const PRIVACY_POLICY_TEXT = `Staffoo: Terms of Service & Privacy Policy
Effective Date: March 14, 2026

Operated by: Capital Services Pty Ltd
ABN: 48 613 317 838
Registered Office: 21 Tanglewood Bvd, Truganina VIC 3029, Australia

Part 1: Privacy Policy
1.1 Overview
Staffoo (operated by Capital Services Pty Ltd) is committed to protecting the privacy of our customers, contractors, and staff in accordance with the Privacy Act 1988 (Cth) and the Australian Privacy Principles (APPs).

1.2 Information Collection & GPS Tracking
Customer Data: We collect business details, site addresses, contact information, and service requirements.
Workforce Data: We collect identity documents, ABNs, State-specific Security Licenses, and certifications.
GPS Movement Tracking: To ensure site security, lone-worker safety, and proof-of-attendance, Staffoo tracks the GPS location of all staff and contractors. This tracking is active only while a user is "Clocked In" for a shift. By using the app, workforce users consent to real-time location monitoring for the duration of their work assignment.

1.3 Payment Security (Stripe)
Staffoo does not store sensitive financial or credit card data. All transactions are processed via Stripe, a secure third-party gateway. Stripe handles all data in compliance with PCI-DSS standards.

Part 2: Terms for Customers
2.1 Booking and Payment Holds
Authorization: Upon job acceptance by a staff member or contractor, a payment hold (pre-authorization) will be placed on the customer’s nominated card via Stripe.
Amount: The hold will be equal to the total value specified in the approved quotation or invoice.
Final Charge: Funds are captured upon shift completion or as determined by the cancellation policy.

2.2 Cancellation & Refund Policy
Standard Cancellation: Cancellations made more than 24 hours before the shift start time are eligible for a full release of the payment hold.
The "1-Hour Rule": In accordance with Australian security industry standards, if a customer cancels a job within one (1) hour of the scheduled start time, a minimum charge of four (4) hours will be deducted from the held funds to compensate the assigned personnel.

Part 3: Workforce Compliance (Staff & Contractors)
3.1 National Licensing & Credentials
Valid Credentials: All personnel must hold a current and valid Security License for the specific State or Territory in which they are performing services.
ABN Requirements: Independent contractors must maintain a valid ABN and hold any required Business or Master Licensing relevant to their jurisdiction.
Updates: It is the individual’s responsibility to ensure licenses and First Aid certifications are kept up to date within the Staffoo app.

3.2 Safety and Reporting
Personnel must comply with the Work Health and Safety (WHS) laws applicable to their location. Any incidents or hazards must be logged immediately via the Staffoo app for client transparency.

Part 4: Code of Conduct
Reliability: Arrive at least 10 minutes prior to shift start. Repeat lateness or "no-shows" will result in removal from the platform.
Professionalism: High-visibility vests or specified corporate attire must be worn at all times while on duty.
GPS Integrity: Personnel must ensure location services are enabled during shifts. Any attempt to spoof or block GPS location will result in immediate termination of the assignment.
Sobriety: A zero-tolerance policy applies to alcohol or illegal substances.
Confidentiality: Personnel must protect all customer site data, access codes, and internal floor plans.

Part 5: Contact Information
For support or administrative inquiries, please contact Capital Services Pty Ltd:
Admin Office: 21 Tanglewood Bvd, Truganina VIC 3029
Email: [admin@gmail.com]
Phone: [0478916034]`;

export default function SignUpScreen({ navigation }: { navigation: any }) {
  const [userType, setUserType] = useState<'staff' | 'customer' | 'contractor'>('staff');
  const [acceptedPolicy, setAcceptedPolicy] = useState(false);
  const [showPolicyModal, setShowPolicyModal] = useState(false);

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [registration, setRegistration] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const BASE_URL = 'https://apis.staffoo.com.au/api';
  const userTypeRef = useRef(userType);

  useEffect(() => {
    userTypeRef.current = userType;
  }, [userType]);

  useEffect(() => {
    GoogleSignin.configure({
      webClientId: '224693258602-a6q3lng2a3c8kte6p0llbu9iiduoiqtq.apps.googleusercontent.com',
      offlineAccess: true,
      forceCodeForRefreshToken: true,
    });
  }, []);

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      await GoogleSignin.hasPlayServices();
      await GoogleSignin.signOut().catch(() => { });
      const userInfo = await GoogleSignin.signIn();
      if (userInfo.type !== 'success') {
        throw new Error('Google cancelled');
      }
      const { accessToken } = await GoogleSignin.getTokens();

      const payload = {
        credential: accessToken,
        user_type: userTypeRef.current,
      };

      console.log('🔥 GOOGLE CALLBACK PAYLOAD:', JSON.stringify(payload, null, 2));

      const callbackRes = await fetch(`${BASE_URL}/auth/google/callback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await callbackRes.json();
      console.log('✅ API Response:', data);

      const user = data.user;
      const token = data.token;

      await AsyncStorage.setItem('@auth_token', token);
      await AsyncStorage.setItem('user', JSON.stringify(user));
      await AsyncStorage.setItem('@user_id', String(user.id));

      Toast.show({ type: 'success', text1: 'Login Successful' });
      navigation.reset({ index: 0, routes: [{ name: 'Profile' }] });
    } catch (err: any) {
      console.log('❌ Google error:', err);
      Toast.show({ type: 'error', text1: 'Google Sign Up failed', text2: err.message });
    } finally {
      setLoading(false);
    }
  };

  const animateTabChange = () => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 0, duration: 140, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 20, duration: 140, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
      ]),
    ]).start();
  };

  const handleUserTypeChange = (newType: 'staff' | 'customer' | 'contractor') => {
    if (newType === userType) return;
    setUserType(newType);
    animateTabChange();
  };

  const getDisplayName = (type: string) => {
    if (type === 'contractor') return 'Sub Contractor';
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  const handleSignUp = async () => {
    if (!acceptedPolicy) {
      return Toast.show({
        type: 'error',
        text1: 'Please accept the Privacy Policy & Terms',
      });
    }

    if (!name.trim()) return Toast.show({ type: 'error', text1: 'Name is required' });
    if (!email.trim() || !email.includes('@')) return Toast.show({ type: 'error', text1: 'Valid email is required' });
    if (password.length < 6) return Toast.show({ type: 'error', text1: 'Password must be at least 6 characters' });
    if (password !== confirmPassword) return Toast.show({ type: 'error', text1: 'Passwords do not match' });

    const payload: any = {
      name: name.trim(),
      email: email.trim(),
      password,
      password_confirmation: confirmPassword,
    };

    if (userType === 'contractor') {
      if (!companyName.trim()) return Toast.show({ type: 'error', text1: 'Company name is required' });
      if (!registration.trim()) return Toast.show({ type: 'error', text1: 'Registration number is required' });
      payload.company_name = companyName.trim();
      payload.registration_number = registration.trim();
    } else {
      if (!phone.trim()) return Toast.show({ type: 'error', text1: 'Phone is required' });
      payload.phone = phone.trim();
    }

    setLoading(true);
    try {
      await registerUser({ user_type: userType, ...payload });
      Toast.show({
        type: 'success',
        text1: 'Account created successfully!',
        onHide: () => navigation.navigate('Login'),
      });
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Registration failed',
        text2: error?.message || 'Please try again',
      });
    } finally {
      setLoading(false);
    }
  };

  const renderExtraFields = () => {
    if (userType === 'staff' || userType === 'customer') {
      return (
        <View>
          <Text style={styles.label}>Phone *</Text>
          <View style={styles.inputWrapper}>
            <Phone size={22} color="#666" />
            <TextInput
              style={styles.input}
              placeholder="Enter phone number"
              value={phone}
              placeholderTextColor="#9CA3AF"
              onChangeText={setPhone}
              keyboardType="phone-pad"
              maxLength={20}
            />
          </View>
        </View>
      );
    }

    if (userType === 'contractor') {
      return (
        <View>
          <Text style={styles.label}>Company Name *</Text>
          <View style={styles.inputWrapper}>
            <Building2 size={22} color="#666" />
            <TextInput
              style={styles.input}
              placeholder="Company name"
              placeholderTextColor="#9CA3AF"
              value={companyName}
              onChangeText={setCompanyName}
            />
          </View>
          <Text style={styles.label}>Registration Number *</Text>
          <View style={styles.inputWrapper}>
            <FileText size={22} color="#666" />
            <TextInput
              style={styles.input}
              placeholder="REG-12345 or NTN number"
              value={registration}
              placeholderTextColor="#9CA3AF"
              onChangeText={setRegistration}
              autoCapitalize="characters"
            />
          </View>
        </View>
      );
    }
    return <View />;
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: isTablet ? width * 0.2 : 24 }}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            <View style={styles.logoContainer}>
              <Image source={LOGO} style={styles.logo} resizeMode="contain" />
              <Text style={styles.subtitle}>Create your account to get started</Text>
            </View>

            <View style={styles.segmentContainer}>
              {(['staff', 'customer', 'contractor'] as const).map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[styles.segment, userType === type && styles.segmentActive]}
                  onPress={() => handleUserTypeChange(type)}
                >
                  <Text style={[styles.segmentText, userType === type && styles.segmentTextActive]}>
                    {getDisplayName(type)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
              <Text style={styles.label}>Name *</Text>
              <View style={styles.inputWrapper}>
                <UserRound size={22} color="#666" />
                <TextInput
                  style={styles.input}
                  placeholder="Full name"
                  placeholderTextColor="#9CA3AF"
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                />
              </View>

              <Text style={styles.label}>Email *</Text>
              <View style={styles.inputWrapper}>
                <Mail size={22} color="#666" />
                <TextInput
                  style={styles.input}
                  placeholder="your@email.com"
                  placeholderTextColor="#9CA3AF"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <Text style={styles.label}>Password *</Text>
              <View style={styles.inputWrapper}>
                <LockIcon size={22} color="#666" />
                <TextInput
                  style={styles.input}
                  placeholder="At least 6 characters"
                  value={password}
                  placeholderTextColor="#9CA3AF"
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  {showPassword ? <Eye size={22} color="#666" /> : <EyeOff size={22} color="#666" />}
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>Confirm Password *</Text>
              <View style={styles.inputWrapper}>
                <LockIcon size={22} color="#666" />
                <TextInput
                  style={styles.input}
                  placeholder="Confirm password"
                  value={confirmPassword}
                  placeholderTextColor="#9CA3AF"
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                  {showConfirmPassword ? <Eye size={22} color="#666" /> : <EyeOff size={22} color="#666" />}
                </TouchableOpacity>
              </View>

              {renderExtraFields()}
            </Animated.View>

            {/* Privacy Policy Checkbox */}
            <TouchableOpacity
              style={styles.policyContainer}
              onPress={() => setAcceptedPolicy(!acceptedPolicy)}
              activeOpacity={0.8}
            >
              <View style={[styles.checkbox, acceptedPolicy && styles.checkboxChecked]}>
                {acceptedPolicy && <Check size={16} color="#fff" />}
              </View>

              <Text style={styles.policyText}>
                I accept the{' '}
                <Text
                  style={styles.policyLink}
                  onPress={(e) => {
                    e.stopPropagation();
                    setShowPolicyModal(true);
                  }}
                >
                  Privacy Policy
                </Text>
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.signUpButton, (loading || !acceptedPolicy) && styles.buttonDisabled]}
              onPress={handleSignUp}
              disabled={loading || !acceptedPolicy}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.signUpText}>Sign Up</Text>
              )}
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={styles.line} />
              <Text style={{ marginHorizontal: 12, color: '#888' }}>or continue with</Text>
              <View style={styles.line} />
            </View>

            <Text style={styles.googleNote}>
              Please choose your account type (Staff, Customer, or Contractor) before continuing with Google
            </Text>

            <View style={styles.socialRow}>
              <TouchableOpacity style={styles.googleButton} onPress={handleGoogleLogin} disabled={loading}>
                <Image
                  source={require('../assets/google-img.png')}
                  style={{ width: 22, height: 22, marginRight: 10 }}
                />
                <Text style={styles.googleText}>
                  Sign Up as {getDisplayName(userType)} with Google
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={styles.loginLink}>Login</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ==================== Beautiful Privacy Policy Modal ==================== */}
      <Modal
        visible={showPolicyModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPolicyModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          {/* Header with Logo */}
          <View style={styles.modalHeader}>
            <View style={styles.logoHeaderContainer}>
              <Image
                source={LOGO}
                style={styles.modalLogo}
                resizeMode="contain"
              />
              {/* <Text style={styles.modalHeaderTitle}>Staffoo</Text> */}
            </View>

            <TouchableOpacity
              style={styles.closeButtonContainer}
              onPress={() => setShowPolicyModal(false)}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Title */}
          <View style={styles.modalTitleContainer}>
            <Text style={styles.modalMainTitle}>
              Privacy Policy & Terms of Service
            </Text>
            <Text style={styles.modalSubtitle}>
              Effective Date: March 14, 2026
            </Text>
          </View>

          {/* Policy Content */}
          <ScrollView
            style={styles.modalScrollView}
            showsVerticalScrollIndicator={true}
            contentContainerStyle={styles.modalContentContainer}
          >
            <Text style={styles.policyFullText}>
              {PRIVACY_POLICY_TEXT}
            </Text>
          </ScrollView>

          {/* Bottom Bar */}
          <View style={styles.modalBottomBar}>
            <TouchableOpacity
              style={styles.acceptButton}
              onPress={() => {
                setAcceptedPolicy(true);
                setShowPolicyModal(false);
              }}
            >
              <Text style={styles.acceptButtonText}>I Accept</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 15,
  },
  content: {
    paddingHorizontal: 4,
  },
  logoContainer: {
    marginVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 160,
    height: 52,
  },
  subtitle: {
    color: '#666',
    fontSize: 14,
    marginTop: 5,
    marginBottom: 10,
  },
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 14,
    padding: 5,
    marginBottom: 14,
  },
  segment: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 10,
  },
  segmentActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  segmentText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  segmentTextActive: {
    color: '#0066ff',
    fontWeight: '700',
  },
  label: {
    fontSize: 14,
    color: '#444',
    marginBottom: 2,
    fontWeight: '500',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 45,
    backgroundColor: '#fafafa',
    marginBottom: 20,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#000',
    marginLeft: 10,
  },
  signUpButton: {
    backgroundColor: '#0066ff',
    borderRadius: 14,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
    marginBottom: 15,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  signUpText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  policyContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 16,
    paddingHorizontal: 4,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 2,
    borderColor: '#0066ff',
    borderRadius: 6,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  checkboxChecked: {
    backgroundColor: '#0066ff',
  },
  policyText: {
    fontSize: 14,
    color: '#444',
    flex: 1,
    lineHeight: 20,
  },
  policyLink: {
    color: '#0066ff',
    textDecorationLine: 'underline',
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: '#ddd',
  },
  googleNote: {
    textAlign: 'center',
    color: '#666',
    fontSize: 13,
    marginBottom: 10,
    marginTop: 10,
  },
  socialRow: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    marginBottom: 30,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 14,
    paddingTop: 5,
    paddingBottom: 5,
    borderRadius: 10,
    marginTop: 15,
    flex: 1,
  },
  googleText: {
    fontSize: 15,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingTop: 0,
    marginBottom: 20,
  },
  footerText: {
    color: '#666',
    fontSize: 14,
  },
  loginLink: {
    color: '#0066ff',
    fontWeight: '700',
    fontSize: 14,
  },


  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  closeButton: {
    fontSize: 18,
    color: '#0066ff',
  },
  modalContent: {
    padding: 20,
    flex: 1,
  },


  // Add these new styles at the bottom of your styles object
  modalContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f1f1',
    backgroundColor: '#fff',
  },
  logoHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalLogo: {
    width: 150,
    height: 55,
  },
  modalHeaderTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0066ff',
    marginLeft: 8,
  },
  closeButtonContainer: {
    width: 25,
    height: 25,
    borderRadius: 18,
    backgroundColor: '#f24444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '600',
  },
  modalTitleContainer: {
    paddingHorizontal: 40,
    paddingVertical: 20,
    backgroundColor: '#dbebfb',
    borderBottomWidth: 1,
    // padding:40,
    borderBottomColor: '#eeeeee',
  },
  modalMainTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 4,
  },
  modalScrollView: {
    flex: 1,
  },
  modalContentContainer: {
    padding: 24,
    paddingBottom: 100,
  },
  policyFullText: {
    fontSize: 15.5,
    lineHeight: 26,
    color: '#374151',
    textAlign: 'justify',
  },
  modalBottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 10,
  },
  acceptButton: {
    backgroundColor: '#0066ff',
    borderRadius: 14,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  acceptButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
});