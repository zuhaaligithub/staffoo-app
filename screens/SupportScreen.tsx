import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Pressable,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Pdf from "react-native-pdf";
import {
  Headset,
  User,
  Mail,
  Phone,
  Building2,
  Tag,
  MessageSquareText,
  MessageSquare,
  ChevronDown,
  Check,
  Send,
  CheckCircle2,
  ArrowLeft,
  X,
  FileText,
} from "lucide-react-native";
import { BASE_URL, getAuthToken } from "../services/authApi";

type UserType = "staff" | "contractor" | "customer";

const IOS_PDF_ASSETS: Record<UserType, any> = {
  staff: require("../assets/staff_policy.pdf"),
  contractor: require("../assets/contractor_policy.pdf"),
  customer: require("../assets/customer_policy.pdf"),
};

const ANDROID_ASSET_FILENAMES: Record<UserType, string> = {
  staff: "staff_policy.pdf",
  contractor: "contractor_policy.pdf",
  customer: "customer_policy.pdf",
};

function getPdfSourceForUserType(userType: UserType) {
  if (Platform.OS === "android") {
    return { uri: `bundle-assets://${ANDROID_ASSET_FILENAMES[userType]}` };
  }
  return IOS_PDF_ASSETS[userType];
}

const POLICY_TITLES: Record<UserType, string> = {
  staff: "Staff Policy & Terms",
  contractor: "Resource Partner Agreement",
  customer: "Customer Terms of Service",
};

const COLORS = {
  background: "#030508",
  surface: "#07111A",
  card: "#0D1421",
  cardBorder: "rgba(98, 97, 97, 0.83)",
  primary: "#00A99D",
  primaryGlow: "rgba(0,169,157,0.25)",
  primaryBorder: "rgba(0,169,157,0.25)",
  text: "#FFFFFF",
  textSecondary: "#94A3B8",
  textMuted: "#4A6080",
  success: "#34C88A",
  danger: "#F87171",
  dangerBg: "rgba(248,88,88,0.12)",
  warning: "#F5A623",
  warningBg: "rgba(245,166,35,0.08)",
  heroBg1: "#0D1F2D",
  heroBg2: "#061014",
};

const INQUIRY_TYPES = [
  "General",
  "Hiring Support",
  "Candidate Support",
  "Billing",
  "Technical Issue",
  "Partnership",
] as const;

type InquiryType = (typeof INQUIRY_TYPES)[number];

interface FormState {
  name: string;
  email: string;
  phone: string;
  company: string;
  inquiry_type: InquiryType;
  subject: string;
  message: string;
}

const INITIAL_STATE: FormState = {
  name: "",
  email: "",
  phone: "",
  company: "",
  inquiry_type: "General",
  subject: "",
  message: "",
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Adjust this to whatever key you already store your auth token under.
const AUTH_TOKEN_KEY = "auth_token";

export default function SupportScreen() {
  const navigation = useNavigation();

  const [form, setForm] = useState<FormState>(INITIAL_STATE);
  const [agree, setAgree] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<
    Partial<Record<keyof FormState, string>>
  >({});

  // ── User type (for policy selection) ──
  const [userType, setUserType] = useState<UserType | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [policyModalVisible, setPolicyModalVisible] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const fetchUser = async () => {
      try {
        const token = await getAuthToken();

        // Get logged-in user id from storage
        // Adjust the key / field name to match what you save at login
        const userJson = await AsyncStorage.getItem("user");
        const storedUser = userJson ? JSON.parse(userJson) : null;
        const userId = storedUser?.id ?? storedUser?.user_id;

        if (!userId) {
          console.log("No user id found in storage");
          if (isMounted) setLoadingUser(false);
          return;
        }

        const res = await fetch(`${BASE_URL}/user-edit/${userId}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        const json = await res.json();
        const rawType = json?.data?.user_type;
        const normalized = String(rawType || "")
          .toLowerCase()
          .trim();

        if (
          isMounted &&
          (normalized === "staff" ||
            normalized === "contractor" ||
            normalized === "customer")
        ) {
          setUserType(normalized as UserType);
        }
      } catch (err) {
        console.log("Failed to load user profile for policy lookup:", err);
      } finally {
        if (isMounted) setLoadingUser(false);
      }
    };

    fetchUser();
    return () => {
      isMounted = false;
    };
  }, []);

  const update = (key: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const validate = (): boolean => {
    const next: Partial<Record<keyof FormState, string>> = {};
    if (!form.name.trim()) next.name = "Full name is required";
    if (!form.email.trim()) next.email = "Email is required";
    else if (!EMAIL_REGEX.test(form.email.trim()))
      next.email = "Enter a valid email";
    if (!form.subject.trim()) next.subject = "Subject is required";
    if (!form.message.trim()) next.message = "Please tell us what you need";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  // ── Checkbox / policy modal logic ──
  const handleCheckboxPress = () => {
    // Already agreed → simple uncheck, no need to re-show the policy.
    if (agree) {
      setAgree(false);
      return;
    }

    if (loadingUser) {
      Alert.alert(
        "One moment",
        "Still loading your account details, please try again shortly.",
      );
      return;
    }

    if (!userType) {
      Alert.alert(
        "Couldn't load policy",
        "We couldn't determine your account type. Please check your connection and try again.",
      );
      return;
    }

    setPolicyModalVisible(true);
  };

  const confirmAgreeFromPolicy = () => {
    setAgree(true);
    setPolicyModalVisible(false);
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    if (!agree) {
      Alert.alert(
        "Consent required",
        "Please review and agree to the policy before sending your message.",
      );
      return;
    }

    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      company: form.company.trim(),
      inquiry_type: form.inquiry_type,
      subject: form.subject.trim(),
      message: form.message.trim(),
      source: "mobile-app-support",
      submitted_at: new Date().toISOString(),
    };

    try {
      setSubmitting(true);
      const res = await fetch(`${BASE_URL}/contact-us`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => null);
        throw new Error(
          errBody?.message || "Something went wrong. Please try again.",
        );
      }

      setSubmitted(true);
      setForm(INITIAL_STATE);
      setAgree(false);
    } catch (err: any) {
      Alert.alert(
        "Couldn't send message",
        err?.message || "Please check your connection and try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleBack = () => {
    if (navigation?.canGoBack?.()) {
      navigation.goBack();
    }
  };

  const Header = (
    <View style={styles.header}>
      <TouchableOpacity
        onPress={handleBack}
        style={styles.backBtn}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <ArrowLeft size={20} color={COLORS.text} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Support</Text>
      <View style={styles.headerSpacer} />
    </View>
  );

  if (submitted) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background }}>
        {Header}
        <View style={styles.successWrap}>
          <View style={styles.successIconRing}>
            <CheckCircle2 size={48} color={COLORS.success} />
          </View>
          <Text style={styles.successTitle}>Message Sent</Text>
          <Text style={styles.successSubtitle}>
            Thanks for reaching out — our team will review your message and get back to you soon.
          </Text>
          <TouchableOpacity
            style={styles.successBtn}
            onPress={() => setSubmitted(false)}
          >
            <Text style={styles.successBtnText}>Send Another Message</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: COLORS.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {Header}

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.heroIconWrap}>
            <Headset size={55} color={COLORS.primary} />
          </View>
          <Text style={styles.heroTitle}>Send a Message</Text>
          <Text style={styles.heroSubtitle}>
            Tell us what you need and we'll route your message to the right
            team.
          </Text>
        </View>

        {/* Form Card */}
        <View style={styles.card}>
          <Row>
            <Field
              label="Full Name"
              required
              icon={<User size={14} color={COLORS.textMuted} />}
              placeholder="Enter your full name"
              value={form.name}
              onChangeText={(v) => update("name", v)}
              error={errors.name}
              half
            />
            <Field
              label="Email Address"
              required
              icon={<Mail size={14} color={COLORS.textMuted} />}
              placeholder="you@example.com"
              value={form.email}
              onChangeText={(v) => update("email", v)}
              keyboardType="email-address"
              autoCapitalize="none"
              error={errors.email}
              half
            />
          </Row>

          <Row>
            <Field
              label="Phone Number"
              icon={<Phone size={14} color={COLORS.textMuted} />}
              placeholder="Optional"
              value={form.phone}
              onChangeText={(v) => update("phone", v)}
              keyboardType="phone-pad"
              half
            />
            <Field
              label="Company"
              icon={<Building2 size={14} color={COLORS.textMuted} />}
              placeholder="Optional"
              value={form.company}
              onChangeText={(v) => update("company", v)}
              half
            />
          </Row>

          <Row>
            <View style={[styles.fieldWrap, styles.half]}>
              <Text style={styles.label}>Inquiry Type</Text>
              <TouchableOpacity
                style={styles.inputRow}
                activeOpacity={0.8}
                onPress={() => setPickerOpen(true)}
              >
                <Tag
                  size={14}
                  color={COLORS.textMuted}
                  style={styles.inputIcon}
                />
                <Text style={styles.inputText}>{form.inquiry_type}</Text>
                <ChevronDown size={14} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            <Field
              label="Subject"
              required
              icon={<MessageSquareText size={14} color={COLORS.textMuted} />}
              placeholder="What can we help with?"
              value={form.subject}
              onChangeText={(v) => update("subject", v)}
              error={errors.subject}
              half
            />
          </Row>

          {/* Message */}
          <View style={styles.fieldWrap}>
            <Text style={styles.label}>
              Message <Text style={styles.required}>*</Text>
            </Text>
            <View
              style={[
                styles.inputRow,
                styles.textAreaRow,
                errors.message ? styles.inputError : null,
              ]}
            >
              <MessageSquare
                size={14}
                color={COLORS.textMuted}
                style={[styles.inputIcon, { marginTop: 12 }]}
              />
              <TextInput
                style={styles.textArea}
                placeholder="Please include details such as timeline, role types, or account issue context."
                placeholderTextColor={COLORS.textMuted}
                value={form.message}
                onChangeText={(v) => update("message", v)}
                multiline
                numberOfLines={5}
                textAlignVertical="top"
              />
            </View>
            {errors.message ? (
              <Text style={styles.errorText}>{errors.message}</Text>
            ) : null}
          </View>

          {/* Consent + Policy */}
          <Pressable style={styles.checkboxRow} onPress={handleCheckboxPress}>
            <View style={[styles.checkbox, agree && styles.checkboxChecked]}>
              {loadingUser ? (
                <ActivityIndicator size="small" color={COLORS.primary} />
              ) : (
                agree && (
                  <Check size={14} color="#fff" strokeWidth={3} />
                )
              )}
            </View>
            <Text style={styles.checkboxLabel}>
              I agree to be contacted regarding my request.{" "}
              {userType && (
                <Text
                  style={styles.policyLink}
                  onPress={() => setPolicyModalVisible(true)}
                >
                  View {POLICY_TITLES[userType]}
                </Text>
              )}
            </Text>
          </Pressable>

          {/* Submit */}
          <TouchableOpacity
            style={[styles.submitBtn, submitting && { opacity: 0.7 }]}
            onPress={handleSubmit}
            disabled={submitting}
            activeOpacity={0.85}
          >
            {submitting ? (
              <ActivityIndicator color={COLORS.background} />
            ) : (
              <>
                <Send size={18} color="#ffff" />
                <Text style={styles.submitBtnText}>Submit Message</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Inquiry Type Picker Modal */}
      <Modal
        visible={pickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setPickerOpen(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setPickerOpen(false)}
        >
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Inquiry Type</Text>
            <FlatList
              data={INQUIRY_TYPES}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalOption}
                  onPress={() => {
                    update("inquiry_type", item);
                    setPickerOpen(false);
                  }}
                >
                  <Text
                    style={[
                      styles.modalOptionText,
                      item === form.inquiry_type &&
                        styles.modalOptionTextActive,
                    ]}
                  >
                    {item}
                  </Text>
                  {item === form.inquiry_type && (
                    <Check size={18} color={COLORS.primary} />
                  )}
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => (
                <View style={styles.modalSeparator} />
              )}
            />
          </View>
        </Pressable>
      </Modal>
      {/* Policy PDF Modal */}
      <Modal
        visible={policyModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPolicyModalVisible(false)}
      >
        <View style={styles.policyOverlay}>
          <View style={styles.policyModalWrap}>
            {/* Header */}
            <View style={styles.policyHeader}>
              <FileText size={18} color={COLORS.primary} />
              <Text style={styles.policyHeaderTitle} numberOfLines={1}>
                {userType ? POLICY_TITLES[userType] : "Policy"}
              </Text>
              <TouchableOpacity
                onPress={() => setPolicyModalVisible(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* PDF — same source logic as PoliciesScreen */}
            <View style={styles.pdfWrap}>
              {userType ? (
                <Pdf
                  key={userType}
                  source={getPdfSourceForUserType(userType)}
                  style={styles.pdf}
                  trustAllCerts={false}
                  onLoadComplete={(numberOfPages) => {
                    console.log(
                      `Loaded ${userType} policy, pages: ${numberOfPages}`,
                    );
                  }}
                  onError={(error) => {
                    console.log("PDF Error:", error);
                  }}
                />
              ) : (
                <View style={styles.pdfFallback}>
                  <ActivityIndicator color={COLORS.primary} />
                </View>
              )}
            </View>

            {/* Agree button */}
            <TouchableOpacity
              style={styles.policyAgreeBtn}
              onPress={confirmAgreeFromPolicy}
              activeOpacity={0.85}
            >
              <Check size={16} color="#FFFFFF" strokeWidth={3} />
              <Text style={styles.policyAgreeBtnText}>I Have Read & Agree</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

// ─────────────────────────────────────────────────────────────
// Reusable pieces
// ─────────────────────────────────────────────────────────────
function Row({ children }: { children: React.ReactNode }) {
  return <View style={styles.row}>{children}</View>;
}

interface FieldProps {
  label: string;
  required?: boolean;
  icon: React.ReactNode;
  placeholder: string;
  value: string;
  onChangeText: (v: string) => void;
  keyboardType?: "default" | "email-address" | "phone-pad";
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  error?: string;
  half?: boolean;
}

function Field({
  label,
  required,
  icon,
  placeholder,
  value,
  onChangeText,
  keyboardType = "default",
  autoCapitalize = "sentences",
  error,
  half,
}: FieldProps) {
  return (
    <View style={[styles.fieldWrap, half && styles.half]}>
      <Text style={styles.label}>
        {label} {required && <Text style={styles.required}>*</Text>}
      </Text>
      <View style={[styles.inputRow, error ? styles.inputError : null]}>
        {icon}
        <TextInput
          style={[styles.inputText, styles.inputFlex]}
          placeholder={placeholder}
          placeholderTextColor={COLORS.textMuted}
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
        />
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 5,
    paddingBottom: 48,
  },

header: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  paddingHorizontal: 16,
  paddingTop: Platform.OS === "ios" ? 54 : 30, // was 18 on Android
  paddingBottom: 12,
  backgroundColor: COLORS.background,
  borderBottomWidth: 1,
  borderBottomColor: "rgba(255,255,255,0.06)",
},
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "700",
  },
  headerSpacer: {
    width: 36,
  },

  // Hero
  hero: {
    alignItems: "center",
    marginBottom: 10,
  },
  heroIconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: COLORS.primaryGlow,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 5,
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 4,
  },
  heroSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 12,
  },

  // Card
  card: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    padding: 14,
  },

  row: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 4,
  },
  half: {
    flex: 1,
  },

  fieldWrap: {
    marginBottom: 10,
  },
  label: {
    fontSize: 10,
    fontWeight: "600",
    color: COLORS.textSecondary,
    marginBottom: 5,
  },
  required: {
    color: COLORS.danger,
  },

  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 12,
    paddingHorizontal: 7,
    height: 50,
    gap: 5,
  },
  inputError: {
    borderColor: COLORS.danger,
    backgroundColor: COLORS.dangerBg,
  },
  inputIcon: {
    marginRight: 0,
  },
  inputText: {
    color: COLORS.text,
    fontSize: 10,
  },
  inputFlex: {
    flex: 1,
    height: "100%",
  },

  textAreaRow: {
    height: undefined,
    minHeight: 120,
    alignItems: "flex-start",
    paddingVertical: 12,
  },
  textArea: {
    flex: 1,
    color: COLORS.text,
    fontSize: 12,
    lineHeight: 21,
  },

  errorText: {
    color: COLORS.danger,
    fontSize: 12,
    marginTop: 6,
  },

  checkboxRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 20,
    marginTop: 2,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: COLORS.cardBorder,
    backgroundColor: COLORS.surface,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  checkboxChecked: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  checkboxLabel: {
    color: COLORS.textSecondary,
    fontSize: 13,
    flex: 1,
    lineHeight: 19,
  },
  policyLink: {
    color: COLORS.primary,
    fontWeight: "700",
    textDecorationLine: "underline",
  },

  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    height: 52,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  submitBtnText: {
    color: "#ffff",
    fontSize: 15,
    fontWeight: "700",
  },

  // Success state
  successWrap: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  successIconRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "rgba(52,200,138,0.12)",
    borderWidth: 1,
    borderColor: "rgba(52,200,138,0.3)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 21,
    marginBottom: 28,
  },
  successBtn: {
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
    backgroundColor: COLORS.primaryGlow,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  successBtnText: {
    color: COLORS.primary,
    fontWeight: "700",
    fontSize: 14,
  },

  // Inquiry Type Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(3,5,8,0.7)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    paddingTop: 16,
    paddingBottom: 32,
    paddingHorizontal: 20,
    maxHeight: "60%",
  },
  modalTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 8,
  },
  modalOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
  },
  modalOptionText: {
    color: COLORS.textSecondary,
    fontSize: 15,
  },
  modalOptionTextActive: {
    color: COLORS.primary,
    fontWeight: "700",
  },
  modalSeparator: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.06)",
  },

  // Policy PDF Modal
  policyOverlay: {
    flex: 1,
    backgroundColor: "rgba(3,5,8,0.85)",
    justifyContent: "flex-end",
  },
  policyModalWrap: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    height: "88%",
    overflow: "hidden",
  },
  policyHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  policyHeaderTitle: {
    flex: 1,
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "700",
  },

  pdfFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  policyAgreeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: COLORS.primary,
    height: 52,
    margin: 14,
    borderRadius: 14,
  },
  policyAgreeBtnText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
  },
  pdfWrap: {
    flex: 1,
    minHeight: 400,
    backgroundColor: COLORS.surface,
  },
  pdf: {
    flex: 1,
    width: "100%",
    height: "100%",
    backgroundColor: COLORS.surface,
  },
});
