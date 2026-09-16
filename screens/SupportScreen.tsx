

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

/* ────────────────────────────────────────────────
   POLICY CONTENT (same as PoliciesScreen)
──────────────────────────────────────────────── */
const POLICY_CONTENT: Record<
  UserType,
  {
    title: string;
    version: string;
    intro: string;
    sections: {
      heading: string;
      items: { title?: string; body: string; bullets?: string[] }[];
    }[];
  }
> = {
  staff: {
    title: "App User Terms & Conditions",
    version: "Version 3.1 (2026 Legal Release)",
    intro:
      "Operated by Capital Services Pty Ltd (ABN 48 613 317 838). These terms apply to individual security guards and workforce personnel using the Staffoo mobile application.",
    sections: [
      {
        heading: "1. Account Security & Verification",
        items: [
          {
            title: "1.1 Intended Use",
            body: "The Staffoo mobile application is intended for use by individual security guards and workforce personnel (“Users”).",
          },
          {
            title: "1.2 Credential Integrity",
            body: "Users are required to log into their own individual account using their assigned credentials. Sharing logins, passwords, or devices with any other individual is strictly prohibited and constitutes a major security breach.",
          },
          {
            title: "1.3 Statutory Licensing",
            body: "Users must upload genuine, accurate, and unexpired licensing (e.g. State Security Licence, First Aid, RSA) and identity documents. Falsifying credentials is a breach of these terms, a violation of state security industry laws, and will result in immediate termination of access and mandatory reporting to state police or regulatory bodies.",
          },
        ],
      },
      {
        heading: "2. Employment Status",
        items: [
          {
            title: "2.1 Independence",
            body: "Accessing the Staffoo app does not create an employment or contractor relationship between the User and Capital Services Pty Ltd, unless the User is operating in a jurisdiction where Capital Services Pty Ltd acts as the licensed Principal Contractor and has executed a direct employment contract with the User.",
          },
          {
            title: "2.2 Resource Partner Engagement",
            body: "In all other instances, the User is employed or engaged exclusively by their respective Resource Partner, who remains solely responsible for payroll, entitlements, and workers’ compensation under the Fair Work Act 2009.",
          },
        ],
      },
      {
        heading: "3. Operational Standards & Uniforms",
        items: [
          {
            title: "3.1 Mandatory Uniform Code",
            body: "Unless explicitly instructed otherwise by a specific client site brief, Users must adhere to the standard security uniform code (black and white). This includes a clean white or black collared security shirt, black trousers, and enclosed black safety footwear. High-visibility (hi-vis) vests must be worn where mandated by site safety protocols.",
          },
          {
            title: "3.2 Professionalism",
            body: "Users must use the platform and conduct themselves on-site responsibly, professionally, and in full compliance with the private security code of conduct applicable in their state.",
          },
        ],
      },
      {
        heading: "4. Geofencing, Location Data & Timesheets",
        items: [
          {
            title: "4.1 Location Tracking & Consent",
            body: "The Staffoo platform utilizes location-based services to verify site attendance and ensure workplace safety. By clocking into a shift, the User explicitly consents to the app capturing GPS location coordinates during active shift hours.",
          },
          {
            title: "4.2 Device Tampering",
            body: "Users must not use GPS-spoofing software, VPNs, jailbroken devices, or location-masking tools to falsify their geographical data.",
          },
          {
            title: "4.3 Timesheet Accuracy",
            body: "Shift timesheets must accurately reflect the exact hours physically worked on-site. Deliberate time-theft or manipulation of the check-in/check-out system will result in permanent removal from the Staffoo network and forfeiture of disputed payments.",
          },
        ],
      },
      {
        heading: "5. Prohibited Conduct, Performance & App Termination",
        items: [
          {
            title: "5.1 Unlawful Acts",
            body: "Staffoo strictly prohibits any unlawful acts, including harassing or stalking other users, hacking or interfering with the app’s infrastructure, infecting the app with viruses, or circumventing the platform’s computer security systems. Users must not impersonate any person or misrepresent their association with any security firm or client site.",
          },
          {
            title: "5.2 Immediate Termination for Non-Compliance",
            body: "Staffoo reserves the right to suspend or permanently terminate a User’s access to the application and network without notice. Immediate closure of app usage will apply in the event of:",
            bullets: [
              "Verified client complaints regarding the User’s conduct, professionalism, or standard of service.",
              "Failure to follow proper site instructions, Standard Operating Procedures (SOPs), or Workplace Health and Safety (WHS) guidelines.",
              "Negligent performance of duties, abandoning a security post, or arriving on-site out of uniform.",
            ],
          },
        ],
      },
    ],
  },

  contractor: {
    title: "Resource Partner & Subcontractor Agreement",
    version: "Version 3.0 (2026 Legal Release)",
    intro:
      "This Agreement governs the commercial and operational relationship between Capital Services Pty Ltd (ABN 48 613 317 838, trading as “Staffoo”) and independent licensed security providers, vendors, and staffing agencies (“Resource Partner”) accepting shift allocations and providing security personnel through the Staffoo platform.",
    sections: [
      {
        heading: "1. Licensing, Statutory Warranties & Compliance",
        items: [
          {
            title: "1.1 Corporate Licensing & Registration",
            body: "The Resource Partner warrants that it holds and maintains at all times all necessary Master Security Licences, Labour Hire Licences (where mandated by state legislation, including Victoria, Queensland, and South Australia), and corporate registrations required to legally supply security personnel in all operating jurisdictions.",
          },
          {
            title: "1.2 Personnel Qualifications & VEVO Verification",
            body: "The Resource Partner warrants that all guards assigned to Staffoo shifts possess valid, current individual security licences, valid First Aid/CPR certifications, Responsible Service of Alcohol (RSA, where applicable), and legal Australian working rights verified via VEVO.",
          },
        ],
      },
      {
        heading: "2. Operational Standards, Uniforms & Shift Punctuality",
        items: [
          {
            title: "2.1 Standard Uniform & Presentation Requirements",
            body: "The Resource Partner must ensure that all deployed personnel arrive on site wearing a neat, professional standard black security uniform (black trousers, black collared security shirt or blazer, and clean black safety footwear). Personnel must wear a high-visibility (hi-vis) safety vest where required by site safety protocols, client briefs, or WHS laws.",
          },
          {
            title: "2.2 Mandatory 15-Minute Early Arrival",
            body: "To ensure proper site handover, safety briefings, and timely clock-in, the Resource Partner must ensure that all personnel arrive on site at least fifteen (15) minutes prior to the scheduled shift start time.",
          },
          {
            title: "2.3 App Usage & Attendance Logging",
            body: "All time, attendance, site check-ins, break logging, and duress checks must be completed exclusively through the Staffoo mobile application. Unauthorized sub-subcontracting or secondary outsourcing of assigned shifts is strictly prohibited.",
          },
        ],
      },
      {
        heading: "3. Employment Obligations, Fair Work & WHS Compliance",
        items: [
          {
            title: "3.1 Direct Employment Relationship",
            body: "The Resource Partner acknowledges that it is the sole employer or principal contractor of all personnel deployed. No employment, agency, or joint-venture relationship exists between Staffoo and the Resource Partner’s personnel.",
          },
          {
            title: "3.2 Modern Award & Fatigue Management",
            body: "The Resource Partner warrants strict compliance with the Security Services Industry Award 2020 [MA000016], the Fair Work Act 2009 (Cth), Superannuation Guarantee laws, and state Workers’ Compensation laws. This includes paying mandatory minimum hourly rates, penalty rates, and enforcing fatigue limits (including mandatory minimum 8-to-10 hour breaks between shifts).",
          },
        ],
      },
      {
        heading:
          "4. Client Deductions, Negligence Liability & Financial Set-Off",
        items: [
          {
            title: "4.1 Liability for Negligence & Client Deductions",
            body: "If a Client reduces, deducts, or refuses payment for shift hours due to late arrival, abandonment, uniform non-compliance, misconduct, breach of site instructions, or negligence by the Resource Partner or its personnel, the Resource Partner shall be held fully responsible for all resulting financial losses, damages, and administrative costs suffered by Staffoo.",
          },
          {
            title: "4.2 Right of Recovery & Set-Off",
            body: "The Resource Partner expressly authorizes Staffoo to deduct, withhold, or set off the amount of any client payment deductions or loss claims directly from current or future funds held in the Resource Partner’s Stripe account or pending payout ledger.",
          },
        ],
      },
      {
        heading: "5. Platform Fees, Automated Deductions & Insurance",
        items: [
          {
            title: "5.1 Platform Service Fee",
            body: "In consideration for access to the Staffoo marketplace, WFM tools, and automated billing engine, the Resource Partner agrees to pay Staffoo the agreed Platform Service Fee per shift.",
          },
          {
            title: "5.2 Automated Stripe Payout Deductions",
            body: "The Resource Partner authorizes Staffoo and its payment gateway provider (Stripe) to automatically deduct the Platform Service Fee from captured client funds upon job completion before remitting the net balance to the Resource Partner’s bank account.",
          },
        ],
      },
      {
        heading: "6. Mandatory Insurance Requirements",
        items: [
          {
            title: "6.1 Required Policies",
            body: "The Resource Partner must maintain at all times:",
            bullets: [
              "Public & Products Liability Insurance: Minimum coverage of $10,000,000 per claim (or $20,000,000 where specified by site brief).",
              "Workers’ Compensation Insurance: Statutory coverage for all employees in accordance with relevant state laws.",
            ],
          },
        ],
      },
      {
        heading: "7. Governing Law",
        items: [
          {
            body: "This Agreement is governed by the laws of the State of Victoria, Australia. Both parties submit to the exclusive jurisdiction of the courts operating in Victoria.",
          },
        ],
      },
    ],
  },

  customer: {
    title: "Customer / Client Terms of Service & Booking Agreement",
    version: "Version 3.0 (2026 Legal Release)",
    intro:
      "These Customer Terms of Service (“Terms”) govern the access to and use of the Staffoo web dashboard, mobile applications, and booking infrastructure (collectively, the “Platform”), operated by Capital Services Pty Ltd (ABN 48 613 317 838). By requesting, booking, or managing security personnel or workforce services through Staffoo, the user (“Client”) agrees to be bound by these Terms.",
    sections: [
      {
        heading: "1. Nature of Platform & Unrestricted Subcontracting Rights",
        items: [
          {
            title: "1.1 Technology Platform",
            body: "Staffoo provides specialized Workforce Management (WFM) and Customer Relationship Management (CRM) technology enabling Clients to book, schedule, and coordinate security guarding, crowd control, and asset protection services.",
          },
          {
            title: "1.2 Absolute Discretion to Fulfill via Resource Partners",
            body: "The Client acknowledges and agrees that Capital Services Pty Ltd reserves the absolute right and discretion at all times to fulfill any booking requirement either directly or by engaging, assigning, or subcontracting the shift to an independent, licensed third-party security provider or staffing agency (“Resource Partner”).",
          },
          {
            title: "1.3 Jurisdictional & Licence Capacity Disclaimer",
            body: "The existence or holding of a Master Security Licence or Labour Hire Licence by Capital Services Pty Ltd in any specific State or Territory shall not obligate Capital Services Pty Ltd to act as the principal direct service provider. In all jurisdictions and under all operational circumstances:",
            bullets: [
              "Capital Services Pty Ltd may assign bookings to an authorized, fully licensed Resource Partner.",
              "Where a booking is assigned to a Resource Partner, the legal obligation for on-site security execution sits with the Resource Partner, and Staffoo acts as the technology platform and billing agent.",
              "The Client shall not hold Capital Services Pty Ltd liable for exercising its commercial right to utilize Resource Partners to fulfill booking requests.",
            ],
          },
        ],
      },
      {
        heading: "2. Bookings, Payment Holds & Automatic Settlement",
        items: [
          {
            title: "2.1 Payment Authorization",
            body: "Upon requesting shift or roster coverage, the Client authorizes Staffoo to place an authorization hold or pre-charge on their designated payment method (processed securely via Stripe) for the full estimated booking total.",
          },
          {
            title: "2.2 Escrow-Style Payment Release",
            body: "Funds are held securely via the payment gateway upon shift completion. The Client is granted a twenty-four (24) hour review window post-shift to confirm digital timesheets or log an operational dispute via the Platform.",
          },
          {
            title: "2.3 Automatic Confirmation",
            body: "If no dispute or confirmation is lodged within twenty-four (24) hours post-shift, the shift timesheet is deemed automatically approved, and funds will be permanently released to the fulfilling provider.",
          },
          {
            title: "2.4 Invoicing & Billing Agency",
            body: "In instances where a Resource Partner fulfills the shift, invoices for the security guarding services are generated by or on behalf of the Resource Partner (under their Master Security Licence and ABN), with Staffoo acting as an authorized billing, collection, and technology intermediary agent.",
          },
        ],
      },
      {
        heading: "3. Client Workplace Health & Safety (WHS) Obligations",
        items: [
          {
            title: "3.1 Statutory Compliance",
            body: "The Client must maintain a safe work environment compliant with all applicable Commonwealth, State, and Territory Workplace Health and Safety (WHS / OHS) legislation (including model WHS laws and the Occupational Health and Safety Act 2004 (Vic)).",
          },
        ],
      },
      {
        heading: "4. Cancellations, Shift Modifications & Disputes",
        items: [
          {
            title: "4.1 Minimum Notice Cancellation Fees",
            body: "Cancellations made within the mandatory minimum notice window (as specified during the booking checkout flow) will attract a standardized cancellation fee to cover administrative overheads and guard mobilization costs.",
          },
          {
            title: "4.2 Dispute Resolution Protocol",
            body: "Operational disputes regarding guard attendance or performance must be submitted via the Platform within 24 hours post-shift, supported by time-stamped evidence. Staffoo will mediate disputes in good faith utilizing automated GPS geofencing, clock-in timestamps, and platform audit logs.",
          },
        ],
      },
      {
        heading: "5. Non-Solicitation & Anti-Poaching",
        items: [
          {
            title: "5.1 Non-Circumvention Period",
            body: "The Client agrees that during active platform usage and for a period of six (6) months following the completion of any booking, it will not directly or indirectly engage, employ, solicit, or contract with any Resource Partner or individual guard introduced to the Client via Staffoo, outside of the Platform.",
          },
        ],
      },
      {
        heading: "6. Limitation of Liability, Statutory Warranties & Indemnity",
        items: [
          {
            title: "6.1 Australian Consumer Law (ACL)",
            body: "Nothing in these Terms excludes, restricts, or modifies any statutory guarantee, right, or remedy implied by Schedule 2 of the Competition and Consumer Act 2010 (Cth) that cannot be lawfully excluded.",
          },
          {
            title: "6.2 Intermediary Liability Exclusion",
            body: "To the maximum extent permitted by Australian law, where a booking is fulfilled by a Resource Partner, Staffoo excludes all liability for property damage, theft, personal injury, or indirect/consequential losses arising from the acts or omissions of the Resource Partner or its personnel.",
          },
        ],
      },
      {
        heading: "7. Governing Law & Jurisdiction",
        items: [
          {
            title: "7.1 Governing Law",
            body: "These Terms are governed by and construed in accordance with the laws of the State of Victoria, Australia. The parties submit to the exclusive jurisdiction of the courts operating in Victoria.",
          },
        ],
      },
    ],
  },
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

  const [userType, setUserType] = useState<UserType | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [policyModalVisible, setPolicyModalVisible] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const fetchUser = async () => {
      try {
        const token = await getAuthToken();

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

  const handleCheckboxPress = () => {
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
            Thanks for reaching out — our team will review your message and get
            back to you soon.
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

  const policy = userType ? POLICY_CONTENT[userType] : null;

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
                agree && <Check size={14} color="#fff" strokeWidth={3} />
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

      {/* Custom Policy Modal (no PDF) */}
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

            {/* Custom Policy Content */}
            <ScrollView
              style={styles.policyScroll}
              contentContainerStyle={styles.policyScrollContent}
              showsVerticalScrollIndicator={false}
            >
              {policy ? (
                <>
                  <View style={styles.docHeader}>
                    <Text style={styles.docBrand}>STAFFOO PLATFORM</Text>
                    <Text style={styles.docTitle}>{policy.title}</Text>
                    <Text style={styles.docVersion}>{policy.version}</Text>
                    <Text style={styles.docIntro}>{policy.intro}</Text>
                  </View>

                  {policy.sections.map((section, sIdx) => (
                    <View key={sIdx} style={styles.section}>
                      <View style={styles.sectionHeader}>
                        <View style={styles.sectionAccent} />
                        <Text style={styles.sectionHeading}>
                          {section.heading}
                        </Text>
                      </View>

                      {section.items.map((item, iIdx) => (
                        <View key={iIdx} style={styles.item}>
                          {item.title ? (
                            <Text style={styles.itemTitle}>{item.title}</Text>
                          ) : null}
                          <Text style={styles.itemBody}>{item.body}</Text>

                          {item.bullets?.map((bullet, bIdx) => (
                            <View key={bIdx} style={styles.bulletRow}>
                              <Text style={styles.bulletDot}>•</Text>
                              <Text style={styles.bulletText}>{bullet}</Text>
                            </View>
                          ))}
                        </View>
                      ))}
                    </View>
                  ))}

                  <View style={styles.docFooter}>
                    <Text style={styles.footerText}>
                      Staffoo • Capital Services Pty Ltd (ABN 48 613 317 838)
                    </Text>
                    <Text style={styles.footerText}>End of Document</Text>
                  </View>
                </>
              ) : (
                <View style={styles.pdfFallback}>
                  <ActivityIndicator color={COLORS.primary} />
                </View>
              )}
            </ScrollView>

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
    paddingTop: Platform.OS === "ios" ? 54 : 30,
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

  // Policy Modal
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

  policyScroll: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  policyScrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 32,
  },

  docHeader: {
    marginBottom: 24,
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  docBrand: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.primary,
    letterSpacing: 1.1,
    marginBottom: 6,
  },
  docTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
    lineHeight: 26,
    marginBottom: 6,
  },
  docVersion: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 12,
  },
  docIntro: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },

  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionAccent: {
    width: 4,
    height: 16,
    backgroundColor: COLORS.primary,
    borderRadius: 2,
    marginRight: 10,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.text,
    flex: 1,
  },

  item: {
    marginBottom: 14,
    paddingLeft: 14,
  },
  itemTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 4,
  },
  itemBody: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },

  bulletRow: {
    flexDirection: "row",
    marginTop: 6,
    paddingLeft: 4,
  },
  bulletDot: {
    fontSize: 13,
    color: COLORS.primary,
    marginRight: 8,
    lineHeight: 20,
  },
  bulletText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },

  docFooter: {
    marginTop: 8,
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
  },
  footerText: {
    fontSize: 11,
    color: COLORS.textMuted,
    textAlign: "center",
    marginBottom: 2,
  },

  pdfFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 200,
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
});
