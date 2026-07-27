import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import Toast from "react-native-toast-message";
import axios from "axios";
import { BASE_URL } from "../services/authApi";
import { ArrowLeft } from "lucide-react-native";
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
export default function ForgotPasswordScreen({ route, navigation }: any) {
  const prefilledEmail = route?.params?.email || "";

  const [email, setEmail] = useState(prefilledEmail);
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    if (!email.trim()) {
      Toast.show({ type: "error", text1: "Email required" });
      return;
    }

    try {
      setLoading(true);

      await axios.post(`${BASE_URL}/password-reset-email`, {
        email: email.trim(),
      });

      Toast.show({
        type: "success",
        text1: "Reset link sent",
        text2: "Check your email inbox",
      });

      navigation.goBack();
    } catch (err: any) {
      Toast.show({
        type: "error",
        text1: "Failed",
        text2: err?.response?.data?.message || "Try again",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigation.navigate("Login"); // or navigation.goBack();
  };

  return (
    <View style={styles.container}>
      {/* Back Button */}
      <TouchableOpacity style={styles.backButton} onPress={handleBack}>
        <ArrowLeft size={22} color={COLORS.text} />
        <Text style={styles.backText}> Back</Text>
      </TouchableOpacity>

      <View style={styles.card}>
        <Text style={styles.title}>Reset Password</Text>

        <Text style={styles.desc}>
          Enter your registered email address and we'll send you a password
          reset link.
        </Text>

        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="Enter email"
          placeholderTextColor={COLORS.textMuted}
          style={styles.input}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <TouchableOpacity
          style={styles.button}
          onPress={handleReset}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Send Reset Link</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingHorizontal: 14,
    justifyContent: "center",
  },

  backButton: {
    position: "absolute",
    top: 55,
    left: 20,
    flexDirection: "row",
    alignItems: "center",
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 22,
    padding: 15,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },

  backText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "600",
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 10,
  },

  desc: {
    color: COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 22,
    marginBottom: 28,
  },

  input: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    paddingHorizontal: 18,
    paddingVertical: 12,
    color: COLORS.text,
    fontSize: 15,
    marginBottom: 18,
  },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    height: 50,
    justifyContent: "center",
    alignItems: "center",

    shadowColor: COLORS.primary,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 6,
    },
    elevation: 6,
  },

  buttonText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "700",
  },
});
