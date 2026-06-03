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
//   Modal,
//   StatusBar,
// } from 'react-native';
// import { Linking, Modal as RNModal } from 'react-native';
// import {
//   Phone,
//   Building2,
//   FileText,
//   UserRound,
//   Mail,
//   Lock as LockIcon,
//   Eye,
//   EyeOff,
//   Check,
//   X,
//   Circle,
//   CheckCircle,
// } from 'lucide-react-native';

// import Toast from 'react-native-toast-message';
// import { registerUser } from '../services/authApi';
// import { GoogleSignin } from '@react-native-google-signin/google-signin';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import LinearGradient from 'react-native-linear-gradient';

// const LOGO = require('../assets/staffoo.png');

// const COLORS = {
//   // 🌿 Primary Brand
//   primary: '#89E7D0',
//   primaryDark: '#4FCBB3',

//   // 🌙 Background system
//   background: '#001F3F',
//   surface: '#0B2A4A',
//   surface2: '#12243A',

//   // ✨ Glass Cards
//   card: 'rgba(255,255,255,0.06)',
//   cardBorder: 'rgba(255,255,255,0.08)',

//   // ✍️ Text
//   text: '#FFFFFF',
//   textSecondary: 'rgba(255,255,255,0.75)',
//   textMuted: 'rgba(255,255,255,0.45)',

//   // Status
//   success: '#0A7C6E',
//   warning: '#F59E0B',
//   danger: '#EF4444',

//   border: 'rgba(255,255,255,0.08)',
// };

// const PRIVACY_POLICY_TEXT = `Staffoo: Terms of Service & Privacy Policy
// Effective Date: March 14, 2026

// Operated by: Capital Services Pty Ltd
// ABN: 48 613 317 838
// Registered Office: 21 Tanglewood Bvd, Truganina VIC 3029, Australia

// Part 1: Privacy Policy
// 1.1 Overview
// Staffoo (operated by Capital Services Pty Ltd) is committed to protecting the privacy of our customers, contractors, and staff in accordance with the Privacy Act 1988 (Cth) and the Australian Privacy Principles (APPs).

// 1.2 Information Collection & GPS Tracking
// Customer Data: We collect business details, site addresses, contact information, and service requirements.
// Workforce Data: We collect identity documents, ABNs, State-specific Security Licenses, and certifications.
// GPS Movement Tracking: To ensure site security, lone-worker safety, and proof-of-attendance, Staffoo tracks the GPS location of all staff and contractors. This tracking is active only while a user is "Clocked In" for a shift. By using the app, workforce users consent to real-time location monitoring for the duration of their work assignment.

// 1.3 Payment Security (Stripe)
// Staffoo does not store sensitive financial or credit card data. All transactions are processed via Stripe, a secure third-party gateway. Stripe handles all data in compliance with PCI-DSS standards.

// Part 2: Terms for Customers
// 2.1 Booking and Payment Holds
// Authorization: Upon job acceptance by a staff member or contractor, a payment hold (pre-authorization) will be placed on the customer’s nominated card via Stripe.
// Amount: The hold will be equal to the total value specified in the approved quotation or invoice.
// Final Charge: Funds are captured upon shift completion or as determined by the cancellation policy.

// 2.2 Cancellation & Refund Policy
// Standard Cancellation: Cancellations made more than 24 hours before the shift start time are eligible for a full release of the payment hold.
// The "1-Hour Rule": In accordance with Australian security industry standards, if a customer cancels a job within one (1) hour of the scheduled start time, a minimum charge of four (4) hours will be deducted from the held funds to compensate the assigned personnel.

// Part 3: Workforce Compliance (Staff & Contractors)
// 3.1 National Licensing & Credentials
// Valid Credentials: All personnel must hold a current and valid Security License for the specific State or Territory in which they are performing services.
// ABN Requirements: Independent contractors must maintain a valid ABN and hold any required Business or Master Licensing relevant to their jurisdiction.
// Updates: It is the individual’s responsibility to ensure licenses and First Aid certifications are kept up to date within the Staffoo app.

// 3.2 Safety and Reporting
// Personnel must comply with the Work Health and Safety (WHS) laws applicable to their location. Any incidents or hazards must be logged immediately via the Staffoo app for client transparency.

// Part 4: Code of Conduct
// Reliability: Arrive at least 10 minutes prior to shift start. Repeat lateness or "no-shows" will result in removal from the platform.
// Professionalism: High-visibility vests or specified corporate attire must be worn at all times while on duty.
// GPS Integrity: Personnel must ensure location services are enabled during shifts. Any attempt to spoof or block GPS location will result in immediate termination of the assignment.
// Sobriety: A zero-tolerance policy applies to alcohol or illegal substances.
// Confidentiality: Personnel must protect all customer site data, access codes, and internal floor plans.

// Part 5: Contact Information
// For support or administrative inquiries, please contact Capital Services Pty Ltd:
// Admin Office: 21 Tanglewood Bvd, Truganina VIC 3029
// Email: [admin@gmail.com]
// Phone: [0478916034]`;

// export default function SignUpScreen({ navigation }: { navigation: any }) {
//   const [userType, setUserType] = useState<'staff' | 'customer' | 'contractor'>(
//     'customer',
//   );
//   const [acceptedPolicy, setAcceptedPolicy] = useState(false);
//   const [showPolicyModal, setShowPolicyModal] = useState(false);

//   const fadeAnim = useRef(new Animated.Value(1)).current;
//   const { width } = useWindowDimensions();
//   const isTablet = width >= 768;
//   const [showVerifyModal, setShowVerifyModal] = useState(false);
//   const [registeredEmail, setRegisteredEmail] = useState('');
//   // Form fields
//   const [name, setName] = useState('');
//   const [email, setEmail] = useState('');
//   const [password, setPassword] = useState('');
//   const [confirmPassword, setConfirmPassword] = useState('');
//   const [phone, setPhone] = useState(''); // Optional
//   const [loading, setLoading] = useState(false);
//   const [showPassword, setShowPassword] = useState(false);
//   const [showConfirmPassword, setShowConfirmPassword] = useState(false);

//   useEffect(() => {
//     if (Platform.OS === 'android') {
//       GoogleSignin.configure({
//         webClientId:
//           '224693258602-a6q3lng2a3c8kte6p0llbu9iiduoiqtq.apps.googleusercontent.com',
//       });
//     }
//   }, []);

//   const validatePassword = (password: string) => {
//     // Minimum 8 chars, 1 letter, 1 special character
//     const passwordRegex = /^(?=.*[A-Za-z])(?=.*[\W_]).{8,}$/;

//     if (!passwordRegex.test(password)) {
//       return {
//         valid: false,
//         message:
//           'Password must contain at least 8 characters, 1 letter & 1 special character',
//       };
//     }

//     return {
//       valid: true,
//       message: '',
//     };
//   };

//   // ✅ ADD THIS HERE
//   const passwordValidation = validatePassword(password);

//   const handleUserTypeChange = (
//     newType: 'staff' | 'customer' | 'contractor',
//   ) => {
//     if (newType === userType) return;
//     setUserType(newType);

//     Animated.sequence([
//       Animated.timing(fadeAnim, {
//         toValue: 0.7,
//         duration: 100,
//         useNativeDriver: true,
//       }),
//       Animated.timing(fadeAnim, {
//         toValue: 1,
//         duration: 200,
//         useNativeDriver: true,
//       }),
//     ]).start();
//   };

//   const getDisplayName = (type: 'staff' | 'customer' | 'contractor') => {
//     if (type === 'customer') return 'Customer';
//     if (type === 'staff') return 'Staff';
//     return 'Contractor';
//   };

//   const handleSignUp = async () => {
//     if (!acceptedPolicy) {
//       return Toast.show({
//         type: 'error',
//         text1: 'Please accept the Privacy Policy & Terms',
//       });
//     }

//     if (!name.trim())
//       return Toast.show({ type: 'error', text1: 'Name is required' });
//     if (!email.trim() || !email.includes('@'))
//       return Toast.show({ type: 'error', text1: 'Valid email is required' });

//     const passwordRegex = /^(?=.*[A-Za-z])(?=.*[\W_]).{8,}$/;
//     if (!passwordRegex.test(password)) {
//       return Toast.show({
//         type: 'error',
//         text1: 'Weak Password',
//         text2:
//           'Password must contain at least 8 characters, 1 letter and 1 special character',
//       });
//     }
//     if (password !== confirmPassword)
//       return Toast.show({ type: 'error', text1: 'Passwords do not match' });

//     const payload = {
//       name: name.trim(),
//       email: email.trim().toLowerCase(),
//       password,
//       password_confirmation: confirmPassword,
//       user_type: userType,
//       phone: phone.trim() || undefined,
//     };

//     setLoading(true);
//     try {
//       const response = await registerUser(payload);

//       // ✅ Show verification modal
//       setRegisteredEmail(email.trim().toLowerCase());
//       setShowVerifyModal(true);

//       Toast.show({
//         type: 'success',
//         text1: 'Account created successfully!',
//         text2: 'Please verify your email',
//       });
//     } catch (error: any) {
//       Toast.show({
//         type: 'error',
//         text1: 'Registration failed',
//         text2: error?.message || 'Please try again later',
//       });
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleOpenGmail = async () => {
//     try {
//       if (Platform.OS === 'android') {
//         const gmailUrl = 'googlegmail://';

//         const canOpen = await Linking.canOpenURL(gmailUrl);

//         if (canOpen) {
//           await Linking.openURL(gmailUrl);
//         } else {
//           await Linking.openURL('mailto:');
//         }
//       } else {
//         // iOS
//         const gmailUrl = 'googlegmail://';

//         const canOpen = await Linking.canOpenURL(gmailUrl);

//         if (canOpen) {
//           await Linking.openURL(gmailUrl);
//         } else {
//           await Linking.openURL('message://');
//         }
//       }
//     } catch (error) {
//       Linking.openURL('mailto:');
//     }
//   };

//   const UserTypeOption = ({
//     type,
//   }: {
//     type: 'staff' | 'customer' | 'contractor';
//   }) => (
//     <TouchableOpacity
//       style={[
//         styles.radioOption,
//         userType === type && styles.radioOptionSelected,
//       ]}
//       onPress={() => handleUserTypeChange(type)}
//     >
//       {userType === type ? (
//         <CheckCircle size={16} color={COLORS.primary} />
//       ) : (
//         <Circle size={16} color={COLORS.textMuted} />
//       )}
//       <Text
//         style={[
//           styles.radioText,
//           userType === type && styles.radioTextSelected,
//         ]}
//       >
//         {getDisplayName(type)}
//       </Text>
//     </TouchableOpacity>
//   );

//   return (
//     <SafeAreaView style={styles.container}>
//       <KeyboardAvoidingView
//         style={{ flex: 1 }}
//         behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
//       >
//         <ScrollView
//           contentContainerStyle={{
//             paddingHorizontal: isTablet ? width * 0.2 : 24,
//           }}
//         >
//           <View style={styles.content}>
//             <View style={styles.logoContainer}>
//               <Image source={LOGO} style={styles.logo} resizeMode="contain" />
//               <Text style={styles.subtitle}>
//                 Create your account to get started
//               </Text>
//             </View>

//             <Animated.View style={{ opacity: fadeAnim }}>
//               {/* Name */}
//               <Text style={styles.label}>Full Name *</Text>
//               <LinearGradient
//                 colors={[
//                   'rgba(255, 255, 255, 0.42)',
//                   'rgba(255, 255, 255, 0.35)',
//                   'rgba(255, 255, 255, 0.22)',
//                   'rgba(255, 255, 255, 0.12)',
//                   'rgba(255, 255, 255, 0.25)',
//                 ]}
//                 start={{ x: 0, y: 0 }}
//                 end={{ x: 1, y: 1 }}
//                 style={styles.gradientInput}
//               >
//                 <View style={styles.inputInner}>
//                   <UserRound size={22} color={COLORS.textMuted} />
//                   <TextInput
//                     style={styles.input}
//                     placeholder="Full name"
//                     placeholderTextColor={COLORS.textMuted}
//                     value={name}
//                     onChangeText={setName}
//                   />
//                 </View>
//               </LinearGradient>

//               <Text style={styles.label}>Email Address *</Text>
//               <LinearGradient
//                 colors={[
//                   'rgba(255, 255, 255, 0.42)',
//                   'rgba(255, 255, 255, 0.35)',
//                   'rgba(255, 255, 255, 0.22)',
//                   'rgba(255, 255, 255, 0.12)',
//                   'rgba(255, 255, 255, 0.25)',
//                 ]}
//                 start={{ x: 0, y: 0 }}
//                 end={{ x: 1, y: 1 }}
//                 style={styles.gradientInput}
//               >
//                 <View style={styles.inputInner}>
//                   <Mail size={22} color={COLORS.textMuted} />
//                   <TextInput
//                     style={styles.input}
//                     placeholder="your@email.com"
//                     placeholderTextColor={COLORS.textMuted}
//                     value={email}
//                     onChangeText={setEmail}
//                     keyboardType="email-address"
//                     autoCapitalize="none"
//                   />
//                 </View>
//               </LinearGradient>
//               {/* Password */}
//               <Text style={styles.label}>Password *</Text>
//               <LinearGradient
//                 colors={[
//                   'rgba(255, 255, 255, 0.42)',
//                   'rgba(255, 255, 255, 0.35)',
//                   'rgba(255, 255, 255, 0.22)',
//                   'rgba(255, 255, 255, 0.12)',
//                   'rgba(255, 255, 255, 0.25)',
//                 ]}
//                 start={{ x: 0, y: 0 }}
//                 end={{ x: 1, y: 1 }}
//                 style={styles.gradientInput}
//               >
//                 <View style={styles.inputInner}>
//                   <LockIcon size={22} color={COLORS.textMuted} />
//                   <TextInput
//                     style={styles.input}
//                     placeholder="At least 8 characters"
//                     placeholderTextColor={COLORS.textMuted}
//                     value={password}
//                     onChangeText={setPassword}
//                     secureTextEntry={!showPassword}
//                   />
//                   <TouchableOpacity
//                     onPress={() => setShowPassword(!showPassword)}
//                   >
//                     {showPassword ? (
//                       <Eye size={22} color={COLORS.textMuted} />
//                     ) : (
//                       <EyeOff size={22} color={COLORS.textMuted} />
//                     )}
//                   </TouchableOpacity>
//                 </View>
//               </LinearGradient>

//               {password.length > 0 && !passwordValidation.valid && (
//                 <Text style={styles.passwordError}>
//                   {passwordValidation.message}
//                 </Text>
//               )}

//               {/* Confirm Password */}
//               <Text style={styles.label}>Confirm Password *</Text>
//               <LinearGradient
//                 colors={[
//                   'rgba(255, 255, 255, 0.42)',
//                   'rgba(255, 255, 255, 0.35)',
//                   'rgba(255, 255, 255, 0.22)',
//                   'rgba(255, 255, 255, 0.12)',
//                   'rgba(255, 255, 255, 0.25)',
//                 ]}
//                 start={{ x: 0, y: 0 }}
//                 end={{ x: 1, y: 1 }}
//                 style={styles.gradientInput}
//               >
//                 <View style={styles.inputInner}>
//                   <LockIcon size={22} color={COLORS.textMuted} />
//                   <TextInput
//                     style={styles.input}
//                     placeholder="Confirm password"
//                     placeholderTextColor={COLORS.textMuted}
//                     value={confirmPassword}
//                     onChangeText={setConfirmPassword}
//                     secureTextEntry={!showConfirmPassword}
//                   />
//                   <TouchableOpacity
//                     onPress={() => setShowConfirmPassword(!showConfirmPassword)}
//                   >
//                     {showConfirmPassword ? (
//                       <Eye size={22} color={COLORS.textMuted} />
//                     ) : (
//                       <EyeOff size={22} color={COLORS.textMuted} />
//                     )}
//                   </TouchableOpacity>
//                 </View>
//               </LinearGradient>

//               {/* Phone Number */}
//               <Text style={styles.label}>Phone Number (Optional)</Text>
//               <LinearGradient
//                 colors={[
//                   'rgba(255, 255, 255, 0.42)',
//                   'rgba(255, 255, 255, 0.35)',
//                   'rgba(255, 255, 255, 0.22)',
//                   'rgba(255, 255, 255, 0.12)',
//                   'rgba(255, 255, 255, 0.25)',
//                 ]}
//                 start={{ x: 0, y: 0 }}
//                 end={{ x: 1, y: 1 }}
//                 style={styles.gradientInput}
//               >
//                 <View style={styles.inputInner}>
//                   <Phone size={22} color={COLORS.textMuted} />
//                   <TextInput
//                     style={styles.input}
//                     placeholder="Phone number"
//                     placeholderTextColor={COLORS.textMuted}
//                     value={phone}
//                     onChangeText={setPhone}
//                     keyboardType="phone-pad"
//                   />
//                 </View>
//               </LinearGradient>

//               {/* User Type Selection */}
//               <Text style={styles.label}>Select Account Type</Text>
//               <View style={styles.radioContainer}>
//                 <View style={styles.radioRow}>
//                   <UserTypeOption type="customer" />
//                   <UserTypeOption type="staff" />
//                   <UserTypeOption type="contractor" />
//                 </View>
//               </View>
//             </Animated.View>

//             {/* Privacy Policy Checkbox */}
//             <TouchableOpacity
//               style={styles.policyContainer}
//               onPress={() => setAcceptedPolicy(!acceptedPolicy)}
//             >
//               <View
//                 style={[
//                   styles.checkbox,
//                   acceptedPolicy && styles.checkboxChecked,
//                 ]}
//               >
//                 {acceptedPolicy && <Check size={16} color="#fff" />}
//               </View>
//               <Text style={styles.policyText}>
//                 I accept the{' '}
//                 <Text
//                   style={styles.policyLink}
//                   onPress={e => {
//                     e.stopPropagation();
//                     setShowPolicyModal(true);
//                   }}
//                 >
//                   Privacy Policy & Terms
//                 </Text>
//               </Text>
//             </TouchableOpacity>

//             <TouchableOpacity
//               style={[
//                 styles.signUpButton,
//                 (loading || !acceptedPolicy) && styles.buttonDisabled,
//               ]}
//               onPress={handleSignUp}
//               disabled={loading || !acceptedPolicy}
//             >
//               {loading ? (
//                 <ActivityIndicator color={COLORS.background} />
//               ) : (
//                 <Text style={styles.signUpText}>Create Account</Text>
//               )}
//             </TouchableOpacity>

//             <View style={styles.footer}>
//               <Text style={styles.footerText}>Already have an account? </Text>
//               <TouchableOpacity onPress={() => navigation.navigate('Login')}>
//                 <Text style={styles.loginLink}>Login</Text>
//               </TouchableOpacity>
//             </View>
//           </View>
//         </ScrollView>
//       </KeyboardAvoidingView>

//       {/* Privacy Policy Modal */}
//       <Modal
//         visible={showPolicyModal}
//         animationType="slide"
//         presentationStyle="pageSheet"
//         onRequestClose={() => setShowPolicyModal(false)}
//       >
//         <SafeAreaView style={styles.modalContainer}>
//           <View style={styles.modalHeader}>
//             <View style={styles.headerLeft}>
//               <Image
//                 source={LOGO}
//                 style={styles.modalLogo}
//                 resizeMode="contain"
//               />
//               <View>
//                 <Text style={styles.modalTitle}>Privacy Policy & Terms</Text>
//                 <Text style={styles.modalSubtitle}>
//                   Staffoo • Legal Documents
//                 </Text>
//               </View>
//             </View>

//             <TouchableOpacity
//               onPress={() => setShowPolicyModal(false)}
//               style={styles.closeBtn}
//             >
//               <X size={18} color={COLORS.primary} />
//             </TouchableOpacity>
//           </View>

//           <ScrollView
//             style={styles.modalScroll}
//             contentContainerStyle={styles.modalScrollContent}
//           >
//             <View style={styles.policyCard}>
//               <View style={styles.highlightedInfo}>
//                 <Text style={styles.highlightText}>
//                   Effective Date: March 14, 2026
//                 </Text>
//                 <Text style={styles.highlightText}>
//                   Operated by: Capital Services Pty Ltd
//                 </Text>
//                 <Text style={styles.highlightText}>ABN: 48 613 317 838</Text>
//                 <Text style={styles.highlightText}>
//                   Registered Office: 21 Tanglewood Bvd, Truganina VIC 3029,
//                   Australia
//                 </Text>
//               </View>

//               <Text style={styles.policyBodyText}>{PRIVACY_POLICY_TEXT}</Text>
//             </View>

//             <Text style={styles.lastUpdated}>
//               Capital Services Pty Ltd • ABN 48 613 317 838
//             </Text>
//           </ScrollView>

//           <View style={styles.modalFooter}>
//             <TouchableOpacity
//               style={styles.acceptBtn}
//               onPress={() => {
//                 setAcceptedPolicy(true);
//                 setShowPolicyModal(false);
//               }}
//             >
//               <Check size={22} color="#fff" style={{ marginRight: 10 }} />
//               <Text style={styles.acceptBtnText}>
//                 I Accept the Terms & Privacy Policy
//               </Text>
//             </TouchableOpacity>
//           </View>
//         </SafeAreaView>
//       </Modal>
//       {/* Email Verification Modal */}
//       <RNModal
//         visible={showVerifyModal}
//         transparent={true}
//         animationType="fade"
//         onRequestClose={() => setShowVerifyModal(false)}
//       >
//         <View style={styles.verifyModalOverlay}>
//           <View style={styles.verifyModalContent}>
//             {/* Icon */}
//             <View style={styles.verifyIconContainer}>
//               <Mail size={48} color="#4FCBB3" strokeWidth={1.5} />
//             </View>

//             <Text style={styles.verifyTitle}>Verify your email</Text>

//             <Text style={styles.verifySubtitle}>
//               We've sent a verification link to{' '}
//               <Text style={styles.emailHighlight}>{registeredEmail}</Text>.
//             </Text>

//             <Text style={styles.verifyDescription}>
//               Please check your inbox to activate your account.
//             </Text>

//             <TouchableOpacity
//               style={styles.openGmailButton}
//               onPress={handleOpenGmail}
//             >
//               <Text style={styles.openGmailText}>📧 Open Email App</Text>
//             </TouchableOpacity>

//             <TouchableOpacity
//               style={styles.goToLoginButton}
//               onPress={() => {
//                 setShowVerifyModal(false);
//                 navigation.navigate('Login');
//               }}
//             >
//               <Text style={styles.goToLoginText}>Go to Login Page</Text>
//             </TouchableOpacity>
//           </View>
//         </View>
//       </RNModal>
//     </SafeAreaView>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: COLORS.background,
    
//     paddingTop: StatusBar.currentHeight || 15,
//   },

//   passwordError: {
//     color: COLORS.danger,
//     fontSize: 12,
//     marginTop: -10,
//     marginBottom: 12,
//     marginLeft: 4,
//   },

//   content: {
//     paddingHorizontal: 2,
//     paddingBottom: 40,
//   },

//   logoContainer: {
//     marginVertical: 24,
//     alignItems: 'center',
//   },

//   logo: {
//     width: 170,
//     height: 58,
//   },

//   subtitle: {
//     color: COLORS.textSecondary,
//     fontSize: 14,
//     marginTop: 10,
//     textAlign: 'center',
//   },

//   // ================= RADIO =================

//   radioContainer: {
//     marginBottom: 0,
//   },

//   radioRow: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     marginBottom: 14,
//     gap: 5,
//   },
//   gradientInput: {
//     width: '100%',
//     borderRadius: 12,
//     marginBottom: 16,
//   },

//   inputInner: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     paddingHorizontal: 16,
//     height: 45,
//     width: '100%',
//   },

//   input: {
//     flex: 1,
//     fontSize: 16,
//     color: COLORS.text,
//     marginLeft: 12,
//   },
//   radioOption: {
//     flex: 1,
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'center',
//     paddingVertical: 10,
//     paddingHorizontal: 2,
//     backgroundColor: COLORS.card,
//     borderWidth: 1,
//     borderColor: COLORS.border,
//     borderRadius: 14,
//     gap: 6,
//   },

//   radioOptionSelected: {
//     borderColor: COLORS.primary,
//     backgroundColor: 'rgba(137,231,208,0.12)',
//   },
//   passwordHint: {
//     color: COLORS.textMuted,
//     fontSize: 12,
//     marginTop: -8,
//     marginBottom: 14,
//     marginLeft: 4,
//     lineHeight: 18,
//   },
//   radioText: {
//     fontSize: 10,
//     fontWeight: '600',
//     color: COLORS.textSecondary,
//     textAlign: 'center',
//   },

//   radioTextSelected: {
//     color: COLORS.primary,
//     fontWeight: '700',
//   },

//   // ================= LABEL =================

//   label: {
//     fontSize: 14,
//     color: COLORS.text,
//     marginBottom: 7,
//     fontWeight: '600',
//     marginLeft: 2,
//   },

//   // ================= POLICY =================

//   policyContainer: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     marginBottom: 22,
//     paddingHorizontal: 4,
//     marginTop: 14,
//   },

//   checkbox: {
//     width: 22,
//     height: 22,
//     borderRadius: 7,
//     borderWidth: 2,
//     borderColor: COLORS.primary,
//     marginRight: 12,
//     justifyContent: 'center',
//     alignItems: 'center',
//   },

//   checkboxChecked: {
//     backgroundColor: COLORS.primary,
//   },

//   policyText: {
//     fontSize: 14.5,
//     color: COLORS.textSecondary,
//     flex: 1,
//     lineHeight: 22,
//   },

//   policyLink: {
//     color: COLORS.primary,
//     fontWeight: '700',
//   },

//   // ================= BUTTON =================

//   signUpButton: {
//     backgroundColor: COLORS.primary,
//     borderRadius: 18,
//     height: 58,
//     justifyContent: 'center',
//     alignItems: 'center',
//     marginBottom: 24,
//     shadowColor: COLORS.primary,
//     shadowOffset: {
//       width: 0,
//       height: 10,
//     },
//     shadowOpacity: 0.35,
//     shadowRadius: 14,
//     elevation: 10,
//   },

//   buttonDisabled: {
//     opacity: 0.45,
//   },

//   signUpText: {
//     color: COLORS.background,
//     fontSize: 17,
//     fontWeight: '800',
//   },

//   // ================= FOOTER =================

//   footer: {
//     flexDirection: 'row',
//     justifyContent: 'center',
//     marginBottom: 30,
//   },

//   footerText: {
//     color: COLORS.textSecondary,
//     fontSize: 14,
//   },

//   loginLink: {
//     color: COLORS.primary,
//     fontWeight: '700',
//     fontSize: 14,
//   },

//   // ================= MODAL =================

//   modalContainer: {
//     flex: 1,
//     backgroundColor: COLORS.background,
//   },

//   modalHeader: {
//     backgroundColor: COLORS.surface2,
//     paddingHorizontal: 20,
//     paddingVertical: 18,
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'space-between',
//     borderBottomWidth: 1,
//     borderBottomColor: COLORS.border,
//   },

//   headerLeft: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 14,
//   },

//   modalLogo: {
//     width: 70,
//     height: 30,
//   },

//   modalTitle: {
//     fontSize: 15,
//     fontWeight: '700',
//     color: COLORS.text,
//   },

//   modalSubtitle: {
//     fontSize: 11,
//     color: COLORS.textMuted,
//     marginTop: 2,
//   },

//   closeBtn: {
//     padding: 8,
//     borderRadius: 40,
//     backgroundColor: COLORS.card,
//     borderWidth: 1,
//     borderColor: COLORS.border,
//   },

//   modalScroll: {
//     flex: 1,
//   },

//   modalScrollContent: {
//     padding: 20,
//     paddingBottom: 40,
//   },

//   policyCard: {
//     backgroundColor: COLORS.card,
//     borderRadius: 24,
//     padding: 20,
//     borderWidth: 1,
//     borderColor: COLORS.cardBorder,
//   },

//   highlightedInfo: {
//     backgroundColor: 'rgba(137,231,208,0.12)',
//     padding: 18,
//     borderRadius: 18,
//     marginBottom: 24,
//     borderWidth: 1,
//     borderColor: 'rgba(137,231,208,0.18)',
//   },

//   highlightText: {
//     fontSize: 15,
//     color: COLORS.primary,
//     fontWeight: '600',
//     lineHeight: 24,
//     marginBottom: 6,
//   },

//   policyBodyText: {
//     fontSize: 15.5,
//     color: COLORS.textSecondary,
//     lineHeight: 28,
//     letterSpacing: 0.15,
//   },

//   lastUpdated: {
//     textAlign: 'center',
//     marginTop: 28,
//     fontSize: 13.5,
//     color: COLORS.textMuted,
//     fontWeight: '500',
//   },

//   modalFooter: {
//     paddingHorizontal: 20,
//     paddingVertical: 20,
//     backgroundColor: COLORS.surface2,
//     borderTopWidth: 1,
//     borderTopColor: COLORS.border,
//   },

//   acceptBtn: {
//     backgroundColor: COLORS.primary,
//     paddingVertical: 18,
//     borderRadius: 18,
//     alignItems: 'center',
//     flexDirection: 'row',
//     justifyContent: 'center',
//   },

//   acceptBtnText: {
//     color: COLORS.background,
//     fontSize: 17,
//     fontWeight: '800',
//   },

//   // Email Verification Modal Styles
//   verifyModalOverlay: {
//     flex: 1,
//     backgroundColor: 'rgba(0, 0, 0, 0.85)',
//     justifyContent: 'center',
//     alignItems: 'center',
//     padding: 20,
//   },

//   verifyModalContent: {
//     backgroundColor: '#FFFFFF',
//     borderRadius: 24,
//     padding: 32,
//     width: '100%',
//     maxWidth: 380,
//     alignItems: 'center',
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 10 },
//     shadowOpacity: 0.3,
//     shadowRadius: 20,
//     elevation: 20,
//   },

//   verifyIconContainer: {
//     width: 80,
//     height: 80,
//     borderRadius: 40,
//     backgroundColor: 'rgba(79, 203, 179, 0.1)',
//     justifyContent: 'center',
//     alignItems: 'center',
//     marginBottom: 24,
//   },

//   verifyTitle: {
//     fontSize: 24,
//     fontWeight: '700',
//     color: '#001F3F',
//     marginBottom: 12,
//     textAlign: 'center',
//   },

//   verifySubtitle: {
//     fontSize: 16,
//     color: '#334155',
//     textAlign: 'center',
//     marginBottom: 8,
//     lineHeight: 22,
//   },

//   verifyDescription: {
//     fontSize: 15,
//     color: '#64748B',
//     textAlign: 'center',
//     marginBottom: 32,
//     lineHeight: 22,
//   },

//   emailHighlight: {
//     color: '#4FCBB3',
//     fontWeight: '600',
//   },

//   openGmailButton: {
//     backgroundColor: '#4FCBB3',
//     width: '100%',
//     paddingVertical: 16,
//     borderRadius: 14,
//     alignItems: 'center',
//     marginBottom: 12,
//   },

//   openGmailText: {
//     color: '#001F3F',
//     fontSize: 17,
//     fontWeight: '700',
//   },

//   goToLoginButton: {
//     width: '100%',
//     paddingVertical: 16,
//     borderRadius: 14,
//     alignItems: 'center',
//     borderWidth: 1.5,
//     borderColor: '#E2E8F0',
//   },

//   goToLoginText: {
//     color: '#475569',
//     fontSize: 16,
//     fontWeight: '600',
//   },
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
} from 'react-native';
import { Linking, Modal as RNModal } from 'react-native';
import {
  Phone,
  Building2,
  FileText,
  UserRound,
  Mail,
  Lock as LockIcon,
  Eye,
  EyeOff,
  Check,
  X,
  Circle,
  CheckCircle,
} from 'lucide-react-native';

import Toast from 'react-native-toast-message';
import { registerUser } from '../services/authApi';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LinearGradient from 'react-native-linear-gradient';

const LOGO = require('../assets/staffoo.png');

const COLORS = {
  // 🌿 Primary Brand
  primary: '#89E7D0',
  primaryDark: '#4FCBB3',

  // 🌙 Background system
  background: '#001F3F',
  surface: '#0B2A4A',
  surface2: '#12243A',

  // ✨ Glass Cards
  card: 'rgba(255,255,255,0.06)',
  cardBorder: 'rgba(255,255,255,0.08)',

  // ✍️ Text
  text: '#a3a1a1',
  textSecondary: 'rgba(255, 254, 254, 0.75)',
  textMuted: 'rgba(51, 50, 50, 0.45)',

  // Status
  success: '#0A7C6E',
  warning: '#F59E0B',
  danger: '#EF4444',

  border: 'rgba(255,255,255,0.08)',
};

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
  const [userType, setUserType] = useState<'staff' | 'customer' | 'contractor'>(
    'customer',
  );
  const [acceptedPolicy, setAcceptedPolicy] = useState(false);
  const [showPolicyModal, setShowPolicyModal] = useState(false);

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState(''); // Optional
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'android') {
      GoogleSignin.configure({
        webClientId:
          '224693258602-a6q3lng2a3c8kte6p0llbu9iiduoiqtq.apps.googleusercontent.com',
      });
    }
  }, []);

  const validatePassword = (password: string) => {
    // Minimum 8 chars, 1 letter, 1 special character
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*[\W_]).{8,}$/;

    if (!passwordRegex.test(password)) {
      return {
        valid: false,
        message:
          'Password must contain at least 8 characters, 1 letter & 1 special character',
      };
    }

    return {
      valid: true,
      message: '',
    };
  };

  // ✅ ADD THIS HERE
  const passwordValidation = validatePassword(password);

  const handleUserTypeChange = (
    newType: 'staff' | 'customer' | 'contractor',
  ) => {
    if (newType === userType) return;
    setUserType(newType);

    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0.7,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const getDisplayName = (type: 'staff' | 'customer' | 'contractor') => {
    if (type === 'customer') return 'Customer';
    if (type === 'staff') return 'Staff';
    return 'Contractor';
  };

  const handleSignUp = async () => {
    if (!acceptedPolicy) {
      return Toast.show({
        type: 'error',
        text1: 'Please accept the Privacy Policy & Terms',
      });
    }

    if (!name.trim())
      return Toast.show({ type: 'error', text1: 'Name is required' });
    if (!email.trim() || !email.includes('@'))
      return Toast.show({ type: 'error', text1: 'Valid email is required' });

    const passwordRegex = /^(?=.*[A-Za-z])(?=.*[\W_]).{8,}$/;
    if (!passwordRegex.test(password)) {
      return Toast.show({
        type: 'error',
        text1: 'Weak Password',
        text2:
          'Password must contain at least 8 characters, 1 letter and 1 special character',
      });
    }
    if (password !== confirmPassword)
      return Toast.show({ type: 'error', text1: 'Passwords do not match' });

    const payload = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
      password_confirmation: confirmPassword,
      user_type: userType,
      phone: phone.trim() || undefined,
    };

    setLoading(true);
    try {
      const response = await registerUser(payload);

      // ✅ Show verification modal
      setRegisteredEmail(email.trim().toLowerCase());
      setShowVerifyModal(true);

      Toast.show({
        type: 'success',
        text1: 'Account created successfully!',
        text2: 'Please verify your email',
      });
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Registration failed',
        text2: error?.message || 'Please try again later',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenGmail = async () => {
    try {
      if (Platform.OS === 'android') {
        const gmailUrl = 'googlegmail://';

        const canOpen = await Linking.canOpenURL(gmailUrl);

        if (canOpen) {
          await Linking.openURL(gmailUrl);
        } else {
          await Linking.openURL('mailto:');
        }
      } else {
        // iOS
        const gmailUrl = 'googlegmail://';

        const canOpen = await Linking.canOpenURL(gmailUrl);

        if (canOpen) {
          await Linking.openURL(gmailUrl);
        } else {
          await Linking.openURL('message://');
        }
      }
    } catch (error) {
      Linking.openURL('mailto:');
    }
  };

  const UserTypeOption = ({
    type,
  }: {
    type: 'staff' | 'customer' | 'contractor';
  }) => (
    <TouchableOpacity
      style={[
        styles.radioOption,
        userType === type && styles.radioOptionSelected,
      ]}
      onPress={() => handleUserTypeChange(type)}
    >
      {userType === type ? (
        <CheckCircle size={16} color={COLORS.primary} />
      ) : (
        <Circle size={16} color={COLORS.textMuted} />
      )}
      <Text
        style={[
          styles.radioText,
          userType === type && styles.radioTextSelected,
        ]}
      >
        {getDisplayName(type)}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: isTablet ? width * 0.2 : 24,
          }}
        >
          <View style={styles.content}>
            <View style={styles.logoContainer}>
              <Image source={LOGO} style={styles.logo} resizeMode="contain" />
              <Text style={styles.subtitle}>
                Create your account to get started
              </Text>
            </View>

            <Animated.View style={{ opacity: fadeAnim }}>
              {/* Name */}
              <Text style={styles.label}>Full Name *</Text>
              <LinearGradient
                colors={[
                  'rgba(233, 231, 231, 0.87)',
                  'rgba(233, 231, 231, 0.87)',
                  'rgba(233, 231, 231, 0.87)',
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.gradientInput}
              >
                <View style={styles.inputInner}>
                  <UserRound size={22} color={COLORS.textMuted} />
                  <TextInput
                    style={styles.input}
                    placeholder="Full name"
                    placeholderTextColor={COLORS.textMuted}
                    value={name}
                    onChangeText={setName}
                  />
                </View>
              </LinearGradient>

              <Text style={styles.label}>Email Address *</Text>
              <LinearGradient
                colors={[
                  'rgba(233, 231, 231, 0.87)',
                  'rgba(233, 231, 231, 0.87)',
                  'rgba(233, 231, 231, 0.87)',
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.gradientInput}
              >
                <View style={styles.inputInner}>
                  <Mail size={22} color={COLORS.textMuted} />
                  <TextInput
                    style={styles.input}
                    placeholder="your@email.com"
                    placeholderTextColor={COLORS.textMuted}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
              </LinearGradient>
              {/* Password */}
              <Text style={styles.label}>Password *</Text>
             <LinearGradient
                colors={[
                  'rgba(233, 231, 231, 0.87)',
                  'rgba(233, 231, 231, 0.87)',
                  'rgba(233, 231, 231, 0.87)',
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.gradientInput}
              >
                <View style={styles.inputInner}>
                  <LockIcon size={22} color={COLORS.textMuted} />
                  <TextInput
                    style={styles.input}
                    placeholder="At least 8 characters"
                    placeholderTextColor={COLORS.textMuted}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <Eye size={22} color={COLORS.textMuted} />
                    ) : (
                      <EyeOff size={22} color={COLORS.textMuted} />
                    )}
                  </TouchableOpacity>
                </View>
              </LinearGradient>

              {password.length > 0 && !passwordValidation.valid && (
                <Text style={styles.passwordError}>
                  {passwordValidation.message}
                </Text>
              )}

              {/* Confirm Password */}
              <Text style={styles.label}>Confirm Password *</Text>
              <LinearGradient
                colors={[
                  'rgba(233, 231, 231, 0.87)',
                  'rgba(233, 231, 231, 0.87)',
                  'rgba(233, 231, 231, 0.87)',
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.gradientInput}
              >
                <View style={styles.inputInner}>
                  <LockIcon size={22} color={COLORS.textMuted} />
                  <TextInput
                    style={styles.input}
                    placeholder="Confirm password"
                    placeholderTextColor={COLORS.textMuted}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showConfirmPassword}
                  />
                  <TouchableOpacity
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <Eye size={22} color={COLORS.textMuted} />
                    ) : (
                      <EyeOff size={22} color={COLORS.textMuted} />
                    )}
                  </TouchableOpacity>
                </View>
              </LinearGradient>

              {/* Phone Number */}
              <Text style={styles.label}>Phone Number (Optional)</Text>
             <LinearGradient
                colors={[
                  'rgba(233, 231, 231, 0.87)',
                  'rgba(233, 231, 231, 0.87)',
                  'rgba(233, 231, 231, 0.87)',
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.gradientInput}
              >
                <View style={styles.inputInner}>
                  <Phone size={22} color={COLORS.textMuted} />
                  <TextInput
                    style={styles.input}
                    placeholder="Phone number"
                    placeholderTextColor={COLORS.textMuted}
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                  />
                </View>
              </LinearGradient>

              {/* User Type Selection */}
              <Text style={styles.label}>Select Account Type</Text>
              <View style={styles.radioContainer}>
                <View style={styles.radioRow}>
                  <UserTypeOption type="customer" />
                  <UserTypeOption type="staff" />
                  <UserTypeOption type="contractor" />
                </View>
              </View>
            </Animated.View>

            {/* Privacy Policy Checkbox */}
            <TouchableOpacity
              style={styles.policyContainer}
              onPress={() => setAcceptedPolicy(!acceptedPolicy)}
            >
              <View
                style={[
                  styles.checkbox,
                  acceptedPolicy && styles.checkboxChecked,
                ]}
              >
                {acceptedPolicy && <Check size={16} color="#fff" />}
              </View>
              <Text style={styles.policyText}>
                I accept the{' '}
                <Text
                  style={styles.policyLink}
                  onPress={e => {
                    e.stopPropagation();
                    setShowPolicyModal(true);
                  }}
                >
                  Privacy Policy & Terms
                </Text>
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.signUpButton,
                (loading || !acceptedPolicy) && styles.buttonDisabled,
              ]}
              onPress={handleSignUp}
              disabled={loading || !acceptedPolicy}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.background} />
              ) : (
                <Text style={styles.signUpText}>Create Account</Text>
              )}
            </TouchableOpacity>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={styles.loginLink}>Login</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Privacy Policy Modal */}
      <Modal
        visible={showPolicyModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPolicyModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <View style={styles.headerLeft}>
              <Image
                source={LOGO}
                style={styles.modalLogo}
                resizeMode="contain"
              />
              <View>
                <Text style={styles.modalTitle}>Privacy Policy & Terms</Text>
                <Text style={styles.modalSubtitle}>
                  Staffoo • Legal Documents
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => setShowPolicyModal(false)}
              style={styles.closeBtn}
            >
              <X size={18} color={COLORS.primary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.modalScroll}
            contentContainerStyle={styles.modalScrollContent}
          >
            <View style={styles.policyCard}>
              <View style={styles.highlightedInfo}>
                <Text style={styles.highlightText}>
                  Effective Date: March 14, 2026
                </Text>
                <Text style={styles.highlightText}>
                  Operated by: Capital Services Pty Ltd
                </Text>
                <Text style={styles.highlightText}>ABN: 48 613 317 838</Text>
                <Text style={styles.highlightText}>
                  Registered Office: 21 Tanglewood Bvd, Truganina VIC 3029,
                  Australia
                </Text>
              </View>

              <Text style={styles.policyBodyText}>{PRIVACY_POLICY_TEXT}</Text>
            </View>

            <Text style={styles.lastUpdated}>
              Capital Services Pty Ltd • ABN 48 613 317 838
            </Text>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.acceptBtn}
              onPress={() => {
                setAcceptedPolicy(true);
                setShowPolicyModal(false);
              }}
            >
              <Check size={22} color="#fff" style={{ marginRight: 10 }} />
              <Text style={styles.acceptBtnText}>
                I Accept the Terms & Privacy Policy
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
      {/* Email Verification Modal */}
      <RNModal
        visible={showVerifyModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowVerifyModal(false)}
      >
        <View style={styles.verifyModalOverlay}>
          <View style={styles.verifyModalContent}>
            {/* Icon */}
            <View style={styles.verifyIconContainer}>
              <Mail size={48} color="#4FCBB3" strokeWidth={1.5} />
            </View>

            <Text style={styles.verifyTitle}>Verify your email</Text>

            <Text style={styles.verifySubtitle}>
              We've sent a verification link to{' '}
              <Text style={styles.emailHighlight}>{registeredEmail}</Text>.
            </Text>

            <Text style={styles.verifyDescription}>
              Please check your inbox to activate your account.
            </Text>

            <TouchableOpacity
              style={styles.openGmailButton}
              onPress={handleOpenGmail}
            >
              <Text style={styles.openGmailText}>📧 Open Email App</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.goToLoginButton}
              onPress={() => {
                setShowVerifyModal(false);
                navigation.navigate('Login');
              }}
            >
              <Text style={styles.goToLoginText}>Go to Login Page</Text>
            </TouchableOpacity>
          </View>
        </View>
      </RNModal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // backgroundColor: COLORS.background,
    backgroundColor: '#111111',
    paddingTop: StatusBar.currentHeight || 15,
  },

  passwordError: {
    color: COLORS.danger,
    fontSize: 12,
    marginTop: -10,
    marginBottom: 12,
    marginLeft: 4,
  },

  content: {
    paddingHorizontal: 2,
    paddingBottom: 40,
  },

  logoContainer: {
    marginVertical: 24,
    alignItems: 'center',
  },

  logo: {
    width: 170,
    height: 58,
  },

  subtitle: {
    color: COLORS.textSecondary,
    fontSize: 14,
    marginTop: 10,
    textAlign: 'center',
  },

  // ================= RADIO =================

  radioContainer: {
    marginBottom: 0,
  },

  radioRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
    gap: 5,
  },
  gradientInput: {
    width: '100%',
    borderRadius: 12,
    marginBottom: 16,
  },

  inputInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 45,
    width: '100%',
  },

  input: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
    marginLeft: 12,
  },
  radioOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 2,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    gap: 6,
  },

  radioOptionSelected: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(137,231,208,0.12)',
  },
  passwordHint: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: -8,
    marginBottom: 14,
    marginLeft: 4,
    lineHeight: 18,
  },
  radioText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textAlign: 'center',
  },

  radioTextSelected: {
    color: COLORS.primary,
    fontWeight: '700',
  },

  // ================= LABEL =================

  label: {
    fontSize: 14,
    color: COLORS.text,
    marginBottom: 7,
    fontWeight: '600',
    marginLeft: 2,
  },

  // ================= POLICY =================

  policyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 22,
    paddingHorizontal: 4,
    marginTop: 14,
  },

  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: COLORS.primary,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },

  checkboxChecked: {
    backgroundColor: COLORS.primary,
  },

  policyText: {
    fontSize: 14.5,
    color: COLORS.textSecondary,
    flex: 1,
    lineHeight: 22,
  },

  policyLink: {
    color: COLORS.primary,
    fontWeight: '700',
  },

  // ================= BUTTON =================

  signUpButton: {
    backgroundColor: '#0A7C6E',
    borderRadius: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: COLORS.primary,
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.15,
    shadowRadius: 14,
    elevation: 5,
  },

  buttonDisabled: {
    opacity: 0.45,
  },

  signUpText: {
    color: '#ffff',
    fontSize: 17,
    fontWeight: '600',
  },

  // ================= FOOTER =================

  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 30,
  },

  footerText: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },

  loginLink: {
    color: COLORS.primary,
    fontWeight: '700',
    fontSize: 14,
  },

  // ================= MODAL =================

  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  modalHeader: {
    backgroundColor: COLORS.surface2,
    paddingHorizontal: 20,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },

  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },

  modalLogo: {
    width: 70,
    height: 30,
  },

  modalTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
  },

  modalSubtitle: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },

  closeBtn: {
    padding: 8,
    borderRadius: 40,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  modalScroll: {
    flex: 1,
  },

  modalScrollContent: {
    padding: 20,
    paddingBottom: 40,
  },

  policyCard: {
    backgroundColor: COLORS.card,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },

  highlightedInfo: {
    backgroundColor: 'rgba(137,231,208,0.12)',
    padding: 18,
    borderRadius: 18,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(137,231,208,0.18)',
  },

  highlightText: {
    fontSize: 15,
    color: COLORS.primary,
    fontWeight: '600',
    lineHeight: 24,
    marginBottom: 6,
  },

  policyBodyText: {
    fontSize: 15.5,
    color: COLORS.textSecondary,
    lineHeight: 28,
    letterSpacing: 0.15,
  },

  lastUpdated: {
    textAlign: 'center',
    marginTop: 28,
    fontSize: 13.5,
    color: COLORS.textMuted,
    fontWeight: '500',
  },

  modalFooter: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: COLORS.surface2,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },

  acceptBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 18,
    borderRadius: 18,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },

  acceptBtnText: {
    color: COLORS.background,
    fontSize: 17,
    fontWeight: '800',
  },

  // Email Verification Modal Styles
  verifyModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },

  verifyModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 32,
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
  },

  verifyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(79, 203, 179, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },

  verifyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#001F3F',
    marginBottom: 12,
    textAlign: 'center',
  },

  verifySubtitle: {
    fontSize: 16,
    color: '#334155',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 22,
  },

  verifyDescription: {
    fontSize: 15,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },

  emailHighlight: {
    color: '#4FCBB3',
    fontWeight: '600',
  },

  openGmailButton: {
    backgroundColor: '#4FCBB3',
    width: '100%',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 12,
  },

  openGmailText: {
    color: '#001F3F',
    fontSize: 17,
    fontWeight: '700',
  },

  goToLoginButton: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },

  goToLoginText: {
    color: '#475569',
    fontSize: 16,
    fontWeight: '600',
  },
});
