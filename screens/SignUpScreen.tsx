import React, { useState, useRef, useEffect } from "react";
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
} from "react-native";
import { Linking, Modal as RNModal } from "react-native";
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
} from "lucide-react-native";

import Toast from "react-native-toast-message";
import { registerUser } from "../services/authApi";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import AsyncStorage from "@react-native-async-storage/async-storage";
import LinearGradient from "react-native-linear-gradient";

const LOGO = require("../assets/staffoo.png");


const COLORS = {
  background: "#030508",
  surface: "#07111A",
  card: "#0D1421",

  cardBorder: "rgba(98,97,97,0.35)",

  primary: "#00A99D",
  primaryDark: "#007E76",
  primaryGlow: "rgba(0,169,157,0.25)",

  text: "#FFFFFF",
  textSecondary: "#B7C4D4",
  textMuted: "#738295",
  danger: "#F87171",

  success: "#0A7C6E",
  warning: "#F59E0B",

  heroBg1: "#0D1F2D",
  heroBg2: "#061014",

  surface2: "#12243A",
  border: "rgba(255,255,255,0.08)",
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
Workforce Data: We collect identity documents, ABNs, State-specific Security Licences, and certifications.
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
Valid Credentials: All personnel must hold a current and valid Security Licence for the specific State or Territory in which they are performing services.
ABN Requirements: Independent contractors must maintain a valid ABN and hold any required Business or Master Licensing relevant to their jurisdiction.
Updates: It is the individual’s responsibility to ensure licences and First Aid certifications are kept up to date within the Staffoo app.

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
Email: [admin@staffoo.com.au]
Phone: [1800782366]`;

export default function SignUpScreen({ navigation }: { navigation: any }) {


  const [userType, setUserType] = useState<
    "staff" | "customer" | "contractor" | null
  >(null);
  const [acceptedPolicy, setAcceptedPolicy] = useState(false);
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const scale = (size: number) => (width / 375) * size;
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phone, setPhone] = useState(""); // Optional
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [nameFocused, setNameFocused] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [confirmFocused, setConfirmFocused] = useState(false);
  const [phoneFocused, setPhoneFocused] = useState(false);

  useEffect(() => {
    if (Platform.OS === "android") {
      GoogleSignin.configure({
        webClientId:
          "224693258602-a6q3lng2a3c8kte6p0llbu9iiduoiqtq.apps.googleusercontent.com",
      });
    }
  }, []);

  const validatePassword = (password: string) => {
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*[\W_]).{8,}$/;
    if (!passwordRegex.test(password)) {
      return {
        valid: false,
        message:
          "Password must contain at least 8 characters, 1 letter & 1 special character",
      };
    }

    return {
      valid: true,
      message: "",
    };
  };

  const passwordValidation = validatePassword(password);

  const handleUserTypeChange = (
    newType: "staff" | "customer" | "contractor",
  ) => {
    if (newType === userType) return;

    setUserType(newType);
  };

  const getDisplayName = (type: "staff" | "customer" | "contractor") => {
    if (type === "customer") return "Client";
    if (type === "staff") return "Staff";
    return "Resource Partner";
  };

  const handleSignUp = async () => {
    if (!acceptedPolicy) {
      return Toast.show({
        type: "error",
        text1: "Please accept the Privacy Policy & Terms",
      });
    }

    if (!name.trim())
      return Toast.show({ type: "error", text1: "Name is required" });
    if (!email.trim() || !email.includes("@"))
      return Toast.show({ type: "error", text1: "Valid email is required" });

    const passwordRegex = /^(?=.*[A-Za-z])(?=.*[\W_]).{8,}$/;
    if (!passwordRegex.test(password)) {
      return Toast.show({
        type: "error",
        text1: "Weak Password",
        text2:
          "Password must contain at least 8 characters, 1 letter and 1 special character",
      });
    }
    if (password !== confirmPassword)
      return Toast.show({ type: "error", text1: "Passwords do not match" });
    if (!userType) {
      return Toast.show({
        type: "error",
        text1: "Please select account type",
      });
    }

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
        type: "success",
        text1: "Account created successfully!",
        text2: "Please verify your Email",
      });
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: "Registration failed",
        text2: error?.message || "Please try again later",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenGmail = async () => {
    try {
      if (Platform.OS === "android") {
        await Linking.openURL("android-app://com.google.android.gm");
      } else {
        const url = "googlegmail://";
        const supported = await Linking.canOpenURL(url);
        if (supported) {
          await Linking.openURL(url);
        } else {
          await Linking.openURL("message://");
        }
      }
    } catch (error) {
      console.log("Failed to open Gmail app:", error);
    }
  };

  const UserTypeOption = ({
    type,
  }: {
    type: "staff" | "customer" | "contractor";
  }) => {
    const isSelected = userType === type;
    const label = getDisplayName(type);

    return (
      <TouchableOpacity
        style={[styles.radioOption, isSelected && styles.radioOptionSelected]}
        onPress={() => handleUserTypeChange(type)}
        activeOpacity={0.85}
      >
        <View style={styles.radioIconWrapper}>
          {isSelected ? (
            <CheckCircle size={18} color={COLORS.primary} />
          ) : (
            <Circle size={18} color={COLORS.textMuted} />
          )}
        </View>

        <Text
          style={[styles.radioText, isSelected && styles.radioTextSelected]}
        >
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View style={styles.orbTopRight}>
          <LinearGradient
            colors={[COLORS.primaryGlow, "transparent"]}
            start={{ x: 0.25, y: 0.15 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        </View>
        <View style={styles.orbBottomLeft}>
          <LinearGradient
            colors={[COLORS.primaryGlow, "transparent"]}
            start={{ x: 0.7, y: 0.8 }}
            end={{ x: 0, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </View>
        <View style={styles.ringOutline} />
        <View style={styles.dotAccent1} />
        <View style={styles.dotAccent2} />
        <View style={styles.dotAccent3} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: isTablet ? width * 0.25 : 24,
            paddingBottom: 24,
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.logoContainer}>
            <View style={styles.logoGlow} pointerEvents="none" />
            <Image
              source={LOGO}
              resizeMode="contain"
              style={{ width: width * 0.6, height: width * 0.17 }}
            />
            <Text style={[styles.subtitle, { fontSize: scale(14) }]}>
              Create your account to get started.
            </Text>
          </View>

          <Animated.View style={[styles.formCard, { opacity: fadeAnim }]}>
            {/* Name */}
            <Text style={[styles.label, { fontSize: scale(12) }]}>
              Full Name <Text style={{ color: "red" }}>*</Text>
            </Text>
            <View
              style={[
                styles.inputContainer,
                nameFocused && styles.inputContainerFocused,
              ]}
            >
              <View style={styles.inputInner}>
                <View style={styles.inputIconBadge}>
                  <UserRound size={16} color={COLORS.primary} />
                </View>
                <TextInput
                  style={[styles.input, { color: COLORS.text }]}
                  placeholder="Full name"
                  placeholderTextColor={COLORS.textMuted}
                  value={name}
                  onFocus={() => setNameFocused(true)}
                  onBlur={() => setNameFocused(false)}
                  onChangeText={setName}
                />
              </View>
            </View>

            {/* Email */}
            <Text style={[styles.label, { fontSize: scale(12) }]}>
              Email Address <Text style={{ color: "red" }}>*</Text>
            </Text>
            <View
              style={[
                styles.inputContainer,
                emailFocused && styles.inputContainerFocused,
              ]}
            >
              <View style={styles.inputInner}>
                <View style={styles.inputIconBadge}>
                  <Mail size={16} color={COLORS.primary} />
                </View>
                <TextInput
                  style={[styles.input, { color: COLORS.text }]}
                  placeholder="your@email.com"
                  placeholderTextColor={COLORS.textMuted}
                  value={email}
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setEmailFocused(false)}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>

            {/* Password */}
            <Text style={[styles.label, { fontSize: scale(12) }]}>
              Password <Text style={{ color: "red" }}>*</Text>
            </Text>
            <View
              style={[
                styles.inputContainer,
                passwordFocused && styles.inputContainerFocused,
              ]}
            >
              <View style={styles.inputInner}>
                <View style={styles.inputIconBadge}>
                  <LockIcon size={16} color={COLORS.primary} />
                </View>
                <TextInput
                  style={[styles.input, { color: COLORS.text }]}
                  placeholder="At least 8 characters"
                  placeholderTextColor={COLORS.textMuted}
                  value={password}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  {showPassword ? (
                    <Eye size={22} color="#6B7280" />
                  ) : (
                    <EyeOff size={22} color="#6B7280" />
                  )}
                </TouchableOpacity>
              </View>
            </View>
            {password.length > 0 && !passwordValidation.valid && (
              <Text style={styles.passwordError}>
                {passwordValidation.message}
              </Text>
            )}

            {/* Confirm Password */}
            <Text style={[styles.label, { fontSize: scale(12) }]}>
              Confirm Password <Text style={{ color: "red" }}>*</Text>
            </Text>
            <View
              style={[
                styles.inputContainer,
                confirmFocused && styles.inputContainerFocused,
              ]}
            >
              <View style={styles.inputInner}>
                <View style={styles.inputIconBadge}>
                  <LockIcon size={16} color={COLORS.primary} />
                </View>
                <TextInput
                  style={[styles.input, { color: COLORS.text }]}
                  placeholder="Confirm password"
                  placeholderTextColor={COLORS.textMuted}
                  value={confirmPassword}
                  onFocus={() => setConfirmFocused(true)}
                  onBlur={() => setConfirmFocused(false)}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  {showConfirmPassword ? (
                    <Eye size={22} color="#6B7280" />
                  ) : (
                    <EyeOff size={22} color="#6B7280" />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Phone */}
            <Text style={[styles.label, { fontSize: scale(12) }]}>
              Phone Number (Optional)
            </Text>
            <View
              style={[
                styles.inputContainer,
                phoneFocused && styles.inputContainerFocused,
              ]}
            >
              <View style={styles.inputInner}>
                <View style={styles.inputIconBadge}>
                  <Phone size={16} color={COLORS.primary} />
                </View>
                <TextInput
                  style={[styles.input, { color: COLORS.text }]}
                  placeholder="Phone number"
                  placeholderTextColor={COLORS.textMuted}
                  value={phone}
                  onFocus={() => setPhoneFocused(true)}
                  onBlur={() => setPhoneFocused(false)}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            {/* Account Type */}
            <Text style={[styles.label, { fontSize: scale(12) }]}>
              Account Type <Text style={{ color: "red" }}>*</Text>
            </Text>
            <View style={styles.radioContainer}>
              <View style={styles.radioRow}>
                <UserTypeOption type="customer" />
                <UserTypeOption type="staff" />
                <UserTypeOption type="contractor" />
              </View>
            </View>

            {/* Privacy Policy */}
            <TouchableOpacity
              style={styles.policyContainer}
              onPress={() => setAcceptedPolicy(!acceptedPolicy)}
              activeOpacity={0.85}
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
                I accept the{" "}
                <Text
                  style={styles.policyLink}
                  onPress={(e) => {
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
                (loading || !acceptedPolicy) && { opacity: 0.7 },
              ]}
              onPress={handleSignUp}
              disabled={loading || !acceptedPolicy}
              activeOpacity={0.88}
            >
              <LinearGradient
                colors={[COLORS.primary, COLORS.primaryDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.signUpGradient}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.signUpText}>Create Account</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>

          <View style={styles.footer}>
            <Text style={{ color: "#fff" }}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate("Login")}>
              <Text style={styles.loginLink}>Login</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Privacy Policy Modal — unchanged */}
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

      {/* Email Verification Modal — unchanged */}
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

            <Text style={styles.verifyTitle}>Verify your email address</Text>

            <Text style={styles.verifySubtitle}>
              We've sent a verification link to{" "}
              <Text style={styles.emailHighlight}>{registeredEmail}</Text>.
            </Text>

            <Text style={styles.verifyDescription}>
              Please check your inbox to activate your account.
            </Text>

            {/* <TouchableOpacity
              style={styles.openGmailButton}
              onPress={handleOpenGmail}
            >
              <Text style={styles.openGmailText}>📧 Open Email</Text>
            </TouchableOpacity> */}

            <TouchableOpacity
              style={styles.goToLoginButton}
              onPress={() => {
                setShowVerifyModal(false);
                navigation.navigate("Login");
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
    backgroundColor: COLORS.background,
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
    position: "relative",
    overflow: "hidden",
  },


  orbTopRight: {
    position: "absolute",
    top: -90,
    right: -70,
    width: 260,
    height: 260,
    borderRadius: 130,
    overflow: "hidden",
  },
  orbBottomLeft: {
    position: "absolute",
    bottom: -110,
    left: -90,
    width: 300,
    height: 300,
    borderRadius: 150,
    overflow: "hidden",
  },
  ringOutline: {
    position: "absolute",
    top: "36%",
    right: -46,
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 1,
    borderColor: "rgba(0,169,157,0.18)",
  },
  dotAccent1: {
    position: "absolute",
    top: 90,
    left: 28,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.primary,
    opacity: 0.45,
  },
  dotAccent2: {
    position: "absolute",
    top: 160,
    left: 60,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.primary,
    opacity: 0.3,
  },
  dotAccent3: {
    position: "absolute",
    bottom: 140,
    right: 40,
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: COLORS.primary,
    opacity: 0.35,
  },

  logoContainer: {
    marginVertical: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  logoGlow: {
    position: "absolute",
    top: -30,
    alignSelf: "center",
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: COLORS.primaryGlow,
    opacity: 0.35,
  },
  subtitle: {
    color: COLORS.textSecondary,
    marginTop: 10,
    textAlign: "center",
  },

  // ── Floating card that groups the whole form, matching LoginScreen ──
  formCard: {
    backgroundColor: COLORS.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    padding: 20,
    paddingTop: 24,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },

  label: {
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 5,
  },
  inputContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    marginBottom: 16,
  },
  inputContainerFocused: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.heroBg1,
  },
  inputInner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    height: 47,
  },
  inputIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: COLORS.primaryGlow,
    justifyContent: "center",
    alignItems: "center",
  },
  input: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: COLORS.text,
  },
  passwordError: {
    color: COLORS.danger,
    fontSize: 12,
    marginTop: -10,
    marginBottom: 12,
    marginLeft: 4,
  },

  // ── Account type tiles — same card language as the inputs, stacked
  // icon-over-label so longer labels ("Resource Partner") wrap cleanly. ──
  radioContainer: { marginBottom: 18 },
  radioRow: { flexDirection: "row", gap: 10 },
  radioOption: {
    flex: 1,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 6,
    minHeight: 76,
  },
  radioOptionSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.heroBg1,
  },
  radioIconWrapper: { alignItems: "center", justifyContent: "center" },
  radioText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: "600",
    textAlign: "center",
    minHeight: 34, // reserve space for 2 lines
    lineHeight: 16,
  },
  radioTextSelected: {
    color: COLORS.primary,
    fontWeight: "800",
  },

  // ── Privacy policy row ──
  policyContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: COLORS.primary,
    marginRight: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxChecked: { backgroundColor: COLORS.primary },
  policyText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    flex: 1,
    lineHeight: 19,
  },
  policyLink: {
    color: COLORS.primary,
    fontWeight: "700",
  },

  signUpButton: {
    borderRadius: 50,
    height: 52,
    overflow: "hidden",
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  signUpGradient: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  signUpText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 16,
  },

  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 24,
    paddingBottom: 30,
  },
  loginLink: {
    color: COLORS.primary,
    fontWeight: "600",
  },

  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  modalHeader: {
    backgroundColor: COLORS.surface2,
    paddingHorizontal: 20,
    paddingVertical: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },

  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },

  modalLogo: {
    width: 70,
    height: 30,
  },

  modalTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#ffff",
  },

  modalSubtitle: {
    fontSize: 11,
    color: "#ffff",
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
    backgroundColor: "rgba(137,231,208,0.12)",
    padding: 18,
    borderRadius: 18,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "rgba(137,231,208,0.18)",
  },

  highlightText: {
    fontSize: 15,
    color: "#fff",
    fontWeight: "600",
    lineHeight: 24,
    marginBottom: 6,
  },

  policyBodyText: {
    fontSize: 15.5,
    color: "#fff",
    lineHeight: 28,
    letterSpacing: 0.15,
  },

  lastUpdated: {
    textAlign: "center",
    marginTop: 28,
    fontSize: 13.5,
    color: "#cccc",
    fontWeight: "500",
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
    paddingVertical: 14,
    borderRadius: 18,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
  },

  acceptBtnText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "800",
  },

  // Email Verification Modal Styles
  verifyModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.85)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },

  verifyModalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 32,
    width: "100%",
    maxWidth: 380,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
  },

  verifyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(79, 203, 179, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },

  verifyTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#001F3F",
    marginBottom: 12,
    textAlign: "center",
  },

  verifySubtitle: {
    fontSize: 16,
    color: "#334155",
    textAlign: "center",
    marginBottom: 8,
    lineHeight: 22,
  },

  verifyDescription: {
    fontSize: 15,
    color: "#64748B",
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 22,
  },

  emailHighlight: {
    color: "#4FCBB3",
    fontWeight: "600",
  },

  openGmailButton: {
    backgroundColor: "#4FCBB3",
    width: "100%",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    marginBottom: 12,
  },

  openGmailText: {
    color: "#001F3F",
    fontSize: 17,
    fontWeight: "700",
  },

  goToLoginButton: {
    width: "100%",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
  },

  goToLoginText: {
    color: "#475569",
    fontSize: 16,
    fontWeight: "600",
  },
});
