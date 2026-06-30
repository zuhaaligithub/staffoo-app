import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  StyleSheet,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Toast from "react-native-toast-message";
import { ArrowLeft } from "lucide-react-native";
import { BASE_URL } from "../services/authApi";

const COLORS = {
  background: "#030508",
  surface: "#07111A",
  card: "#0D1421",
  cardBorder: "rgba(98, 97, 97, 0.83)",
  text: "#FFFFFF",
  textSecondary: "#94A3B8",
  textMuted: "#4A6080",
  danger: "#F87171",
  dangerBg: "rgba(248,88,88,0.12)",
};

export default function DeleteProfileVerification({ navigation }: any) {
  const [user, setUser] = useState<any>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const deleteQuestions = [
    { question: "What is the primary reason you are leaving our platform?" },
    { question: "How would you rate your overall experience (1-5)?" },
    { question: "Which features did you find most useful?" },
    { question: "What issues did you face while using the app?" },
    { question: "What should we improve in the future?" },
    { question: "Would you use our platform again?" },
    { question: "Would you recommend this app to others?" },
    { question: "Which alternative are you switching to (if any)?" },
  ];

  useEffect(() => {
    loadUser();
    setAnswers(Array(deleteQuestions.length).fill(""));
  }, []);

  const loadUser = async () => {
    const storedUser = await AsyncStorage.getItem("user");
    const uid = await AsyncStorage.getItem("@user_id");

    if (storedUser) setUser(JSON.parse(storedUser));
    setUserId(uid);
  };

  const handleChange = (text: string, index: number) => {
    const updated = [...answers];
    updated[index] = text;
    setAnswers(updated);
  };

  // ✅ ALL FIELDS REQUIRED VALIDATION
  const isFormValid = () => {
    return answers.every((a) => a && a.trim().length > 0);
  };

  const deleteProfile = async () => {
    try {
      setLoading(true);

      const token = await AsyncStorage.getItem("@auth_token");

      if (!token || !userId) {
        Toast.show({ type: "error", text1: "Auth failed" });
        return;
      }

      const response = await fetch(
        `${BASE_URL}/user-delete/${userId}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        Toast.show({
          type: "error",
          text1: "Delete Failed",
          text2: data?.message,
        });
        return;
      }

      await AsyncStorage.multiRemove([
        "@user_id",
        "@auth_token",
        "user",
        "profileImage",
      ]);

      Toast.show({
        type: "success",
        text1: "Account deleted successfully",
      });

      navigation.reset({
        index: 0,
        routes: [{ name: "Login" }],
      });
    } catch (err: any) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: err?.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = () => {
    if (!isFormValid()) {
      Alert.alert(
        "Required Fields",
        "Please answer all questions before deleting your account.",
      );
      return;
    }

    Alert.alert(
      "Final Confirmation",
      "This action is permanent and cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Forever",
          style: "destructive",
          onPress: deleteProfile,
        },
      ],
    );
  };

  if (!user) {
    return (
      <View style={styles.center}>
        <Text style={{ color: COLORS.text }}>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 30 }}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ArrowLeft size={22} color={COLORS.text} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Delete Account</Text>

        <View style={{ width: 22 }} />
      </View>

      {/* Warning */}
      <View style={styles.warningCard}>
        <Text style={styles.warningTitle}>⚠ Permanent Deletion</Text>
        <Text style={styles.warningText}>
          All your data will be permanently removed.
        </Text>
      </View>

      {/* Questions */}
      {deleteQuestions.map((item, index) => (
        <View key={index} style={styles.questionCard}>
          <Text style={styles.question}>
            {index + 1}. {item.question}
          </Text>

          <TextInput
            value={answers[index]}
            onChangeText={(text) => handleChange(text, index)}
            placeholder="Required answer"
            placeholderTextColor={COLORS.textMuted}
            style={styles.input}
          />
        </View>
      ))}

      {/* Button */}
      <TouchableOpacity
        disabled={loading || !isFormValid()}
        style={[
          styles.deleteButton,
          (!isFormValid() || loading) && { opacity: 0.5 },
        ]}
        onPress={handleSubmit}
      >
        <Text style={styles.deleteButtonText}>
          {loading ? "Deleting..." : "Delete Account Permanently"}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: 20,
    marginBottom: 30, // ✅ FIXED BOTTOM SPACE
    paddingTop:30,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },

  headerTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: "700",
  },

  warningCard: {
    backgroundColor: COLORS.dangerBg,
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
  },

  warningTitle: {
    color: COLORS.danger,
    fontWeight: "700",
    marginBottom: 5,
  },

  warningText: {
    color: COLORS.textSecondary,
    fontSize: 13,
  },

  questionCard: {
    backgroundColor: COLORS.card,
    padding: 15,
    borderRadius: 12,
    marginBottom: 12,
  },

  question: {
    color: COLORS.text,
    fontWeight: "600",
    marginBottom: 10,
  },

  input: {
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    padding: 12,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },

  deleteButton: {
    marginTop: 10,
    backgroundColor: COLORS.danger,
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
    marginBottom:20,
  },

  deleteButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
  },
});
