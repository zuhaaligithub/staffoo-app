import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { ArrowLeft, Check } from "lucide-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BASE_URL } from "../services/authApi";

type UserType = "staff" | "contractor" | "customer";

const VALID_USER_TYPES: UserType[] = ["staff", "contractor", "customer"];

function resolveUserType(raw: string | null): UserType {
  const normalized = (raw || "").toLowerCase();
  return (VALID_USER_TYPES as string[]).includes(normalized)
    ? (normalized as UserType)
    : "customer";
}

/* ────────────────────────────────────────────────
   COLOR THEME
──────────────────────────────────────────────── */
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
   POLICY CONTENT
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

/* ────────────────────────────────────────────────
   COMPONENT
──────────────────────────────────────────────── */
export default function PoliciesScreen() {
  const navigation = useNavigation();

  const [userType, setUserType] = useState<UserType>("customer");
  const [isAccepted, setIsAccepted] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isCheckboxDisabled, setIsCheckboxDisabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<"success" | "error">("success");
  const [modalTitle, setModalTitle] = useState("");
  const [modalMessage, setModalMessage] = useState("");

  const showModal = (
    type: "success" | "error",
    title: string,
    message: string,
  ) => {
    setModalType(type);
    setModalTitle(title);
    setModalMessage(message);
    setModalVisible(true);
  };

  const getPolicyKey = (uid: string | null) =>
    uid ? `@policy_accepted_${uid}` : "@policy_accepted";

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const loadPolicyStatus = async () => {
        setIsLoading(true);

        try {
          const storedUserType = await AsyncStorage.getItem("@user_type");
          const resolvedUserType = resolveUserType(storedUserType);
          if (isActive) setUserType(resolvedUserType);

          const uid = await AsyncStorage.getItem("@user_id");
          const policyKey = getPolicyKey(uid);
          const locallyAccepted = await AsyncStorage.getItem(policyKey);

          if (locallyAccepted === "true") {
            if (isActive) {
              setIsAccepted(true);
              setIsCheckboxDisabled(true);
            }
            return;
          }

          const token = await AsyncStorage.getItem("@auth_token");
          if (!uid || !token) return;

          const response = await fetch(`${BASE_URL}/staff-profile/${uid}`, {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/json",
            },
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(
              data?.message ||
                `Staff profile request failed with status ${response.status}`,
            );
          }

          const isPolicyAccepted =
            data?.success === true &&
            Number(data?.data?.is_policy_accepted) === 1;

          if (isActive) {
            setIsAccepted(isPolicyAccepted);
            setIsCheckboxDisabled(isPolicyAccepted);
          }

          if (isPolicyAccepted) {
            await AsyncStorage.setItem(policyKey, "true");
          }
        } catch (error) {
          console.log("Failed to load policy status:", error);
        } finally {
          if (isActive) setIsLoading(false);
        }
      };

      loadPolicyStatus();

      return () => {
        isActive = false;
      };
    }, []),
  );

  const handleToggleCheckbox = async () => {
    if (isCheckboxDisabled || isUpdating) return;

    const newValue = !isAccepted;
    setIsAccepted(newValue);
    setIsUpdating(true);

    try {
      const uid = await AsyncStorage.getItem("@user_id");
      const token = await AsyncStorage.getItem("@auth_token");

      if (!uid) throw new Error("User session not found");

      const payload = {
        is_policy_accepted: newValue ? "yes" : "no",
      };

      const response = await fetch(`${BASE_URL}/accept-policy/${uid}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData?.message || "Request failed");
      }

      showModal(
        "success",
        "Success",
        responseData.message || "Policy accepted successfully",
      );

      if (newValue) {
        setIsCheckboxDisabled(true);
        const policyKey = getPolicyKey(uid);
        await AsyncStorage.setItem(policyKey, "true");
      }
    } catch (error) {
      console.log("Error:", error);
      setIsAccepted(!newValue);
      showModal("error", "Error", "Failed to update policy preference.");
    } finally {
      setIsUpdating(false);
    }
  };

  const policy = POLICY_CONTENT[userType];

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        >
          <ArrowLeft size={22} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.center}>
          <Text style={styles.title}>Privacy Policy</Text>
        </View>
        <View style={styles.backBtn} />
      </View>

      {/* Content Card */}
      <View style={styles.policyBox}>
        {isLoading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : (
          <>
            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Document Header */}
              <View style={styles.docHeader}>
                <Text style={styles.docBrand}>STAFFOO PLATFORM</Text>
                <Text style={styles.docTitle}>{policy.title}</Text>
                <Text style={styles.docVersion}>{policy.version}</Text>
                <Text style={styles.docIntro}>{policy.intro}</Text>
              </View>

              {/* Sections */}
              {policy.sections.map((section, sIdx) => (
                <View key={sIdx} style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <View style={styles.sectionAccent} />
                    <Text style={styles.sectionHeading}>{section.heading}</Text>
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

              {/* Footer */}
              <View style={styles.docFooter}>
                <Text style={styles.footerText}>
                  Staffoo • Capital Services Pty Ltd (ABN 48 613 317 838)
                </Text>
                <Text style={styles.footerText}>End of Document</Text>
              </View>
            </ScrollView>

            {/* Accept Checkbox */}
            <View style={styles.boxFooter}>
              <TouchableOpacity
                style={styles.checkboxRow}
                activeOpacity={0.8}
                onPress={handleToggleCheckbox}
                disabled={isUpdating || isCheckboxDisabled || isLoading}
              >
                <View
                  style={[styles.checkbox, isAccepted && styles.checkboxActive]}
                >
                  {isAccepted && (
                    <Check size={14} color="#fff" strokeWidth={3} />
                  )}
                </View>

                <View style={styles.checkboxTextContainer}>
                  <Text
                    style={[
                      styles.checkboxText,
                      isCheckboxDisabled && styles.disabledText,
                    ]}
                  >
                    I have read and agree to the Privacy Policy
                  </Text>
                </View>

                {isUpdating && (
                  <ActivityIndicator
                    size="small"
                    color={COLORS.primary}
                    style={styles.loader}
                  />
                )}
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
      {/* Custom feedback modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View
              style={[
                styles.modalIconCircle,
                {
                  backgroundColor:
                    modalType === "success"
                      ? "rgba(0,169,157,0.15)"
                      : "rgba(248,113,113,0.12)",
                },
              ]}
            >
              {modalType === "success" ? (
                <Check size={28} color={COLORS.primary} strokeWidth={2.5} />
              ) : (
                <Text style={{ fontSize: 26, color: COLORS.danger }}>!</Text>
              )}
            </View>

            <Text style={styles.modalTitle}>{modalTitle}</Text>
            <Text style={styles.modalMessage}>{modalMessage}</Text>

            <TouchableOpacity
              style={[
                styles.modalButton,
                {
                  backgroundColor:
                    modalType === "success" ? COLORS.primary : COLORS.danger,
                },
              ]}
              activeOpacity={0.85}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.modalButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

/* ────────────────────────────────────────────────
   STYLES
──────────────────────────────────────────────── */
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingTop: Platform.OS === "ios" ? 50 : 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  center: { flex: 1, alignItems: "center" },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
  },

  policyBox: {
    flex: 1,
    marginHorizontal: 16,
    marginBottom: Platform.OS === "ios" ? 34 : 20,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },

  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 10,
    paddingTop: 24,
    paddingBottom: 32,
  },

  /* Document Header */
  docHeader: {
    marginBottom: 28,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  docBrand: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.primary,
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  docTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.text,
    lineHeight: 28,
    marginBottom: 6,
  },
  docVersion: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 14,
  },
  docIntro: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },

  /* Sections */
  section: {
    marginBottom: 28,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  sectionAccent: {
    width: 4,
    height: 18,
    backgroundColor: COLORS.primary,
    borderRadius: 2,
    marginRight: 10,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.text,
    flex: 1,
  },

  item: {
    marginBottom: 16,
    paddingLeft: 14,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 4,
  },
  itemBody: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 21,
  },

  bulletRow: {
    flexDirection: "row",
    marginTop: 6,
    paddingLeft: 4,
  },
  bulletDot: {
    fontSize: 14,
    color: COLORS.primary,
    marginRight: 8,
    lineHeight: 21,
  },
  bulletText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 21,
  },

  /* Footer */
  docFooter: {
    marginTop: 12,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
  },
  footerText: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: "center",
    marginBottom: 2,
  },

  /* Checkbox Footer */
  boxFooter: {
    padding: 16,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.textMuted,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
  },
  checkboxActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  checkboxTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  checkboxText: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: "500",
  },
  disabledText: {
    color: COLORS.textMuted,
  },
  loader: {
    marginLeft: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(3,5,8,0.78)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  modalCard: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: COLORS.card,
    borderRadius: 22,
    paddingHorizontal: 22,
    paddingTop: 28,
    paddingBottom: 22,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    alignItems: "center",
  },
  modalIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.text,
    textAlign: "center",
    marginBottom: 8,
  },
  modalMessage: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 21,
    marginBottom: 24,
  },
  modalButton: {
    width: "100%",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  modalButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
});
