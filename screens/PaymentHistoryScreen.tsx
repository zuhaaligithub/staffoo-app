

import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Platform,
  Alert,
  ActivityIndicator,
  StatusBar,
  Modal,
} from "react-native";
import LinearGradient from "react-native-linear-gradient";
import { ChevronLeft, Lock } from "lucide-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { BASE_URL } from "../services/authApi";
import {
  buildBankDetailsFormData,
  normalizeBankDetails,
} from "../utils/paymentCards";

type Props = {
  navigation: any;
  route: any;
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
  heroBg1: "#0e2231",
  heroBg2: "#071318",
};

export default function PaymentHistoryScreen({ navigation, route }: Props) {
  const { card, editIndex, onCardAdded } = route.params || {};
  const [name, setName] = useState(card?.card_holder_name || "");
  const [cardNumber, setCardNumber] = useState(card?.card_number || "");
  const [expMonth, setExpMonth] = useState(card?.expiry_month || "");
  const [expYear, setExpYear] = useState(card?.expiry_year || "");
  const [cvv, setCvv] = useState(card?.cvv || "");
  const [saving, setSaving] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  // Format card number for display (spaces every 4 digits)
  const formatCardNumber = (text: string): string => {
    const cleaned = text.replace(/\D/g, "");
    const chunks = cleaned.match(/.{1,4}/g) || [];
    return chunks.join(" ");
  };

  const handleCardChange = (text: string) => {
    setCardNumber(formatCardNumber(text));
  };

  const formatMaskedCardNumber = (formatted: string): string => {
    if (!formatted) return "";
    // Keep spaces, replace digits with •
    return formatted.replace(/[0-9]/g, "•");
  };

  const isFormValid =
    name.trim().length >= 2 &&
    cardNumber.replace(/\D/g, "").length >= 15 &&
    expMonth.length === 2 &&
    expYear.length === 4 &&
    cvv.length >= 3;

  const handleSave = async () => {
    if (!isFormValid) {
      Alert.alert("Incomplete", "Please fill all fields correctly");
      return;
    }

    const month = parseInt(expMonth, 10);
    if (month < 1 || month > 12) {
      Alert.alert("Invalid expiry", "Month must be 01–12");
      return;
    }

    setSaving(true);

    try {
      const token = await AsyncStorage.getItem("@auth_token");
      if (!token) throw new Error("Not authenticated");

      // Get logged-in user
      const userStr = await AsyncStorage.getItem("user");
      if (!userStr) throw new Error("User session not found");

      const user = JSON.parse(userStr);
      const USER_ID = user.id;

      // 1) Get current cards
      let currentCards: any[] = [];

      try {
        const res = await axios.get(`${BASE_URL}/user-edit/${USER_ID}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.data?.success && res.data?.data?.customer?.bank_details) {
          currentCards = normalizeBankDetails(
            res.data.data.customer.bank_details,
          );
        }
      } catch (fetchErr) {
        console.warn("Could not fetch existing cards", fetchErr);
      }

      // 2) New card
      const newCard = {
        card_holder_name: name.trim(),
        card_number: cardNumber,
        expiry_month: expMonth.padStart(2, "0"),
        expiry_year: expYear.padStart(2, "0"),
      };

      let updatedCards = [...currentCards];

      if (editIndex !== undefined) {
        updatedCards[editIndex] = newCard;
      } else {
        updatedCards.push(newCard);
      }

      const formData = buildBankDetailsFormData(updatedCards);

      // 3) Save card
      const response = await axios.post(
        `${BASE_URL}/user-update/${USER_ID}`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
            Accept: "application/json",
          },
        },
      );

      if (response.data?.success) {
        setShowSuccessModal(true); // show custom modal
        if (onCardAdded) onCardAdded();
      } else {
        throw new Error(response.data?.message || "Response not successful");
      }
    } catch (err: any) {
      console.error("SAVE CARD ERROR:", err);

      Alert.alert(
        "Error",
        err.response?.data?.message || err.message || "Could not save card",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBox}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <ChevronLeft size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment Information</Text>
        <View style={{ width: 42 }} />
      </View>

      <View style={styles.subTitleRow}>
        <Lock size={12} color={COLORS.primary} />
        <Text style={styles.headersubTitle}>
          Your payment details are encrypted and securely stored
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Card Preview */}
        <View style={styles.previewWrapper}>
          <LinearGradient
               colors={["#0B1F3A", "#173F73", "#2457A7"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.cardPreview}
          >
            {/* Decorative glow accents */}
            <View style={styles.glowCircleTop} />
            <View style={styles.glowCircleBottom} />

            {/* Top row: Chip + VISA logo */}
            <View style={styles.topRow}>
              <View style={styles.chipContainer}>
                <View style={styles.chip}>
                  <View style={styles.chipInner} />
                  <View style={styles.chipLineH} />
                  <View style={styles.chipLineV} />
                </View>
              </View>

              <Text style={styles.visaLogo}>VISA</Text>
            </View>

            {/* Card number – masked with •••• groups */}
            <View style={styles.numberContainer}>
              <Text style={styles.cardNumber}>
                {formatMaskedCardNumber(cardNumber) || "•••• •••• •••• ••••"}
              </Text>
            </View>

            {/* Bottom row: Holder & Expiry */}
            <View style={styles.bottomRow}>
              <View style={styles.holderSection}>
                <Text style={styles.labelSmall}>Card Holder</Text>
                <Text style={styles.valueText} numberOfLines={1}>
                  {(name || "YOUR NAME").toUpperCase()}
                </Text>
              </View>

              <View style={styles.expirySection}>
                <Text style={styles.labelSmall}>Expires</Text>
                <Text style={styles.valueText}>
                  {expMonth ? expMonth.padStart(2, "0") : "MM"}/
                  {expYear ? expYear.slice(-2) : "YY"}
                </Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={styles.label}>
              Name on Card <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={(text) => setName(text.toUpperCase())}
              placeholder="e.g. John Doe"
              autoCapitalize="characters"
              placeholderTextColor={COLORS.textMuted}
              selectionColor={COLORS.primary}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>
              Card Number <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              value={cardNumber}
              onChangeText={handleCardChange}
              keyboardType="numeric"
              maxLength={19}
              placeholder="0000 0000 0000 0000"
              placeholderTextColor={COLORS.textMuted}
              selectionColor={COLORS.primary}
            />
          </View>

          <View style={styles.row}>
            <View style={styles.halfField}>
              <Text style={styles.label}>
                Month <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                value={expMonth}
                onChangeText={(t) =>
                  setExpMonth(t.replace(/\D/g, "").slice(0, 2))
                }
                keyboardType="numeric"
                maxLength={2}
                placeholder="MM"
                placeholderTextColor={COLORS.textMuted}
                selectionColor={COLORS.primary}
              />
            </View>

            <View style={styles.halfField}>
              <Text style={styles.label}>
                Year <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                value={expYear}
                onChangeText={(t) =>
                  setExpYear(t.replace(/\D/g, "").slice(0, 4))
                }
                keyboardType="numeric"
                maxLength={4}
                placeholder="YYYY"
                placeholderTextColor={COLORS.textMuted}
                selectionColor={COLORS.primary}
              />
            </View>

            <View style={styles.halfField}>
              <Text style={styles.label}>
                CVV <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                value={cvv}
                onChangeText={(t) => setCvv(t.replace(/\D/g, "").slice(0, 4))}
                keyboardType="numeric"
                maxLength={4}
                secureTextEntry
                placeholder="•••"
                placeholderTextColor={COLORS.textMuted}
                selectionColor={COLORS.primary}
              />
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.saveButton,
              (!isFormValid || saving) && styles.disabled,
            ]}
            disabled={!isFormValid || saving}
            onPress={handleSave}
          >
            {saving ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.saveText}>Save Card</Text>
            )}
          </TouchableOpacity>

          <View style={styles.secureFooter}>
            <Lock size={11} color={COLORS.textMuted} />
            <Text style={styles.secureFooterText}>
              256-bit SSL encrypted connection
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* ── Success Modal ── */}
      <Modal
        visible={showSuccessModal}
        transparent
        animationType="fade"
        statusBarTranslucent
      >
        <View style={styles.modalOverlay}>
          <View style={styles.successModalCard}>
            {/* Top gradient strip */}
            <LinearGradient
              colors={[COLORS.primary, "#008C82"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.successModalHeader}
            />

            {/* Floating icon */}
            <View style={styles.successIconWrap}>
              <View style={styles.successIconCircle}>
                <Text style={{ fontSize: 24, color:'#fff' }}>✓</Text>
              </View>
            </View>

            <View style={styles.successModalBody}>
              <Text style={styles.successTitle}>Card Added Successfully</Text>
              <Text style={styles.successSubtitle}>
                Your payment method has been securely saved and is ready to use.
              </Text>

              <TouchableOpacity
                style={styles.successButton}
                activeOpacity={0.85}
                onPress={() => {
                  setShowSuccessModal(false);
                  navigation.goBack();
                }}
              >
                <Text style={styles.successButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingTop: 20,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    // marginTop: 6,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.text,
    letterSpacing: 0.3,
  },
  subTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 25,
    paddingBottom: 7,
  },
  headersubTitle: {
    fontSize: 11,
    fontWeight: "500",
    color: COLORS.textSecondary,
  },

  backBox: {
    width: 35,
    height: 35,
    borderRadius: 12,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    justifyContent: "center",
    alignItems: "center",
  },

  scrollContent: {
    paddingBottom: 20,
  },

  required: {
    color: COLORS.danger,
    marginLeft: 2,
  },

  previewWrapper: {
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 4,
  },

  cardPreview: {
    width: "100%",
    maxWidth: 380,
    height: 195,

    borderRadius: 22,
    paddingHorizontal: 6,
    paddingVertical: 18,

    justifyContent: "space-between",
    overflow: "hidden",

    borderWidth: 1,
    borderColor: COLORS.primaryBorder,

    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 12,
  },

  glowCircleTop: {
    position: "absolute",
    top: -60,
    right: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: COLORS.primaryGlow,
    opacity: 0.6,
  },

  glowCircleBottom: {
    position: "absolute",
    bottom: -70,
    left: -50,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(0,169,157,0.12)",
  },

  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  chipContainer: {
    width: 46,
    height: 34,
    marginLeft: 18,
  },

  chip: {
    width: "100%",
    height: "100%",
    backgroundColor: "#D4AF37",
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#f6d365",
  },

  chipInner: {
    ...StyleSheet.absoluteFillObject,
    margin: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
  },

  chipLineH: {
    position: "absolute",
    top: "50%",
    left: 4,
    right: 4,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.35)",
  },

  chipLineV: {
    position: "absolute",
    left: "50%",
    top: 4,
    bottom: 4,
    width: 1,
    backgroundColor: "rgba(255,255,255,0.35)",
  },

  visaLogo: {
    fontSize: 24,
    fontWeight: "900",
    color: COLORS.text,
    letterSpacing: 1.5,
    fontStyle: "italic",
    marginRight: 26,
    textShadowColor: "rgba(0,0,0,0.35)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },

  numberContainer: {
    marginTop: 2,
    marginBottom: 0,
    marginLeft: 18,
  },

  cardNumber: {
    fontSize: 26,
    color: COLORS.text,
    letterSpacing: 4,
    fontFamily: Platform.OS === "ios" ? "Courier New" : "monospace",
    textShadowColor: "rgba(0,0,0,0.35)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },

  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },

  holderSection: {
    flex: 1,
    marginLeft: 18,
    marginRight: 10,
    marginBottom: 22,
  },

  expirySection: {
    alignItems: "flex-end",
    marginBottom: 22,
    marginRight: 18,
  },

  labelSmall: {
    fontSize: 9.5,
    fontWeight: "700",
    color: "rgba(255,255,255,0.6)",
    marginBottom: 5,
    letterSpacing: 1.3,
    textTransform: "uppercase",
  },

  valueText: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
    letterSpacing: 1,
  },

  form: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 15,
    paddingTop: 15,
    paddingBottom: 34,
    marginTop: 15,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderBottomWidth: 0,
  },

  field: {
    marginBottom: 10,
  },

  label: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.textSecondary,
    marginBottom: 5,
    letterSpacing: 0.2,
  },

  input: {
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 10,

    paddingHorizontal: 16,
    paddingVertical: 10,

    fontSize: 12.5,
    fontWeight: "600",
    color: COLORS.text,
    letterSpacing: 0.4,

    backgroundColor: COLORS.card,
  },

  row: {
    flexDirection: "row",
    gap: 12,
  },

  halfField: {
    flex: 1,
    marginBottom: 16,
  },

  saveButton: {
    marginTop: 10,
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",

    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },

  disabled: {
    backgroundColor: "rgba(18, 105, 95, 0.4)", // faded version
    shadowOpacity: 0,
    elevation: 0,
  },

  saveText: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: "700",
  },
  secureFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 18,
  },

  secureFooterText: {
    fontSize: 11.5,
    color: COLORS.textMuted,
    fontWeight: "500",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(3, 5, 8, 0.78)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },

  successModalCard: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: COLORS.card,
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    alignItems: "center",
  },

  successModalHeader: {
    height: 42,
    width: "100%",
  },

  successIconWrap: {
    marginTop: -36,
    alignItems: "center",
  },

  successIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 30,
    backgroundColor: COLORS.card,
    borderWidth: 3,
    borderColor: COLORS.card,
    justifyContent: "center",
    alignItems: "center",
    // inner soft circle
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },

  successModalBody: {
    paddingHorizontal: 24,
    paddingBottom: 28,
    paddingTop: 12,
    alignItems: "center",
    width: "100%",
  },

  successTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 2,
    textAlign: "center",
  },

  successSubtitle: {
    fontSize: 12.5,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 16,
    marginBottom: 15,
  },

  successButton: {
    width: "100%",
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },

  successButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});
