import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  StatusBar,
} from "react-native";
import LinearGradient from "react-native-linear-gradient";
import { ChevronLeft } from "lucide-react-native";
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
  primary: "#89E7D0",
  primaryDark: "#4FCBB3",

  background: "#001F3F",
  surface2: "#12243A",

  card: "rgba(255,255,255,0.06)",
  border: "rgba(255,255,255,0.08)",

  text: "#FFFFFF",
  textSecondary: "rgba(255,255,255,0.7)",
  textMuted: "rgba(255,255,255,0.5)",

  danger: "#EF4444",
  success: "#22C55E",
};

export default function PaymentHistoryScreen({ navigation, route }: Props) {
  const { card, editIndex, onCardAdded } = route.params || {};
  const [name, setName] = useState(card?.card_holder_name || "");
  const [cardNumber, setCardNumber] = useState(card?.card_number || "");
  const [expMonth, setExpMonth] = useState(card?.expiry_month || "");
  const [expYear, setExpYear] = useState(card?.expiry_year || "");
  const [cvv, setCvv] = useState(card?.cvv || "");
  const newCard = {
    card_holder_name: name.trim(),
    card_number: cardNumber,
    expiry_month: expMonth.padStart(2, "0"),
    expiry_year: expYear,
    cvv,
  };
  const [saving, setSaving] = useState(false);

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

      // ✅ Get logged-in user
      const userStr = await AsyncStorage.getItem("user");
      if (!userStr) throw new Error("User session not found");

      const user = JSON.parse(userStr);
      const USER_ID = user.id;

      // 1️⃣ Get current cards
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

      // 2️⃣ New card
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

      // 3️⃣ Save card
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
        Alert.alert("Success", "Card added successfully");
        if (onCardAdded) onCardAdded();
        navigation.goBack();
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
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBox}
          onPress={() => navigation.goBack()}
        >
          <ChevronLeft size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Secure Payment Information</Text>
        <View style={{ width: 28 }} />
      </View>

      <Text style={styles.headersubTitle}>
        Your payment details are encrypted and securely stored.
      </Text>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Card Preview */}

        <View style={styles.previewWrapper}>
          <LinearGradient
            colors={["#0B1F3A", "#173F73", "#2457A7"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.cardPreview}
          >
            {/* Top row: Chip + VISA logo */}
            <View style={styles.topRow}>
              {/* Gold chip with shine */}
              <View style={styles.chipContainer}>
                <View style={styles.chip}>
                  <View style={styles.chipInner} />
                  <View style={styles.chipShine} />
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
                <Text style={styles.labelSmall}>CARD HOLDER</Text>
                <Text style={styles.valueText}>
                  {(name || "YOUR NAME").toUpperCase()}
                </Text>
              </View>

              <View style={styles.expirySection}>
                <Text style={styles.labelSmall}>EXPIRES</Text>
                <Text style={styles.valueText}>
                  {expMonth.padStart(2, "0") || "MM"}/
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
              {" "}
              Name On Card <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={(text) => setName(text.toUpperCase())}
              placeholder="e.g. JOHN DOE"
              autoCapitalize="characters"
              placeholderTextColor="#9ca3af"
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
              placeholderTextColor="#9ca3af"
            />
          </View>

          <View style={styles.row}>
            <View style={styles.halfField}>
              <Text style={styles.label}>
                Expiry Month <Text style={styles.required}>*</Text>
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
                placeholderTextColor="#9ca3af"
              />
            </View>

            <View style={styles.halfField}>
              <Text style={styles.label}>
                Expiry Year <Text style={styles.required}>*</Text>
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
                placeholderTextColor="#9ca3af"
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
                placeholderTextColor="#9ca3af"
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
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#111111",
    // backgroundColor: COLORS.background,
    paddingTop: 20,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginHorizontal: 16,
    marginTop: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
  },
  headersubTitle: {
    fontSize: 11,
    fontWeight: "400",
    color: COLORS.textSecondary,
    paddingHorizontal: 25,
    paddingVertical: 10,
  },

  backBox: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: "center",
    alignItems: "center",
  },

  scrollContent: {
    paddingBottom: 20,
  },
  labelRow: {
    flexDirection: "row",
    marginBottom: 9,
  },

  required: {
    color: "#EF4444",
    marginLeft: 2,
  },
  // =========================
  // CARD PREVIEW
  // =========================

  previewWrapper: {
    alignItems: "center",
    paddingHorizontal: 15,
    paddingVertical: 0,
  },

  cardPreview: {
    width: "100%",
    maxWidth: 350,
    height: 220,

    borderRadius: 18,
    // marginTop: 20,
    paddingHorizontal: 5,
    paddingVertical: 15,

    justifyContent: "space-between",
    overflow: "hidden",

    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 6,
  },

  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  chipContainer: {
    width: 48,
    height: 35,
    marginLeft: 15,
  },

  chip: {
    width: "100%",
    height: "100%",
    backgroundColor: "#D4AF37",
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#f6d365",
  },

  chipInner: {
    ...StyleSheet.absoluteFillObject,
    margin: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },

  chipShine: {
    position: "absolute",
    top: 6,
    left: 8,
    width: 30,
    height: 12,
    backgroundColor: "rgba(255,255,255,0.35)",
    borderRadius: 20,
  },

  visaLogo: {
    fontSize: 25,
    fontWeight: "900",
    color: "#fff",
    letterSpacing: 1.5,
    fontStyle: "italic",
    marginRight: 30,
    textShadowColor: "rgba(0,0,0,0.25)",
    textShadowOffset: {
      width: 0,
      height: 1,
    },
    textShadowRadius: 3,
  },

  numberContainer: {
    marginTop: 2,
    marginBottom: 0,
    marginLeft: 15,
  },

  cardNumber: {
    fontSize: 28,
    color: "#fff",
    letterSpacing: 4,

    fontFamily: Platform.OS === "ios" ? "Courier New" : "monospace",

    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: {
      width: 0,
      height: 1,
    },
    textShadowRadius: 4,
  },

  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },

  holderSection: {
    flex: 1,
    marginLeft: 15,
    marginBottom: 25,
  },

  expirySection: {
    alignItems: "flex-end",
    marginBottom: 25,
    marginRight: 15,
  },

  labelSmall: {
    fontSize: 10,
    fontWeight: "700",
    color: "rgba(255,255,255,0.72)",
    marginBottom: 5,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },

  valueText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 1,
  },

  // =========================
  // FORM
  // =========================

  form: {
    // backgroundColor: COLORS.surface2,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 22,
    paddingTop: 26,
    paddingBottom: 34,
    borderTopWidth: 1,
    borderColor: COLORS.border,
  },
  field: {
    marginBottom: 12,
  },

  label: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 9,
  },

  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,

    paddingHorizontal: 16,
    paddingVertical: 10,

    fontSize: 16,
    color: COLORS.text,

    backgroundColor: COLORS.card,
  },

  row: {
    flexDirection: "row",
    gap: 12,
  },

  halfField: {
    flex: 1,
  },

  saveButton: {
    marginTop: 24,
    backgroundColor: "#0A7C6E",
    paddingVertical: 17,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",

    shadowColor: COLORS.primaryDark,
    shadowOpacity: 0.3,
    shadowRadius: 12,
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

  previewNumber: {
    fontSize: 24,
    letterSpacing: 2,
    color: "#fff",
    fontFamily: Platform.OS === "ios" ? "Courier New" : "monospace",
  },

  previewName: {
    color: "#fff",
    fontSize: 16,
    textTransform: "uppercase",
  },

  previewExpiry: {
    color: "#fff",
    fontSize: 16,
  },
});
