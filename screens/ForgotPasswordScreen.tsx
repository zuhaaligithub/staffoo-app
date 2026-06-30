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
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Reset Password</Text>

      <Text style={styles.desc}>
        Enter your registered email address and we will send a reset link.
      </Text>

      <TextInput
        value={email}
        onChangeText={setEmail}
        placeholder="Enter email"
        placeholderTextColor="#888"
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
    backgroundColor: "#001F3F",
  },

  backButton: {
    position: "absolute",
    top: 50,
    left: 20,
    zIndex: 10,
  },

  backText: {
    color: "#fff",
    fontSize: 16,
  },

  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 10,
  },

  desc: {
    color: "#ccc",
    marginBottom: 20,
  },

  input: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
    color: "#000",
  },

  button: {
    backgroundColor: "#0A7C6E",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
  },

  buttonText: {
    fontWeight: "bold",
    color: "#fff",
  },
});
