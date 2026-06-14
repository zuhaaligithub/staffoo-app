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
export default function DeleteProfileVerification({ navigation }: any) {
  const [user, setUser] = useState<any>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const storedUser = await AsyncStorage.getItem("user");
      const uid = await AsyncStorage.getItem("@user_id");

      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }

      setUserId(uid);
    } catch (error) {
      console.log(error);
    }
  };

  const deleteQuestions = [
    {
      question:
        "Type your registered full name exactly as shown on your profile",
      answer: user?.name || "",
    },
    {
      question: "Type the last 4 digits of your registered phone number",
      answer: user?.phone ? user.phone.toString().slice(-4) : "",
    },
    {
      question: "Type your registered email address",
      answer: user?.email || "",
    },
    {
      question: "Type your username exactly as shown in your account",
      answer: user?.username || "",
    },
    {
      question: "Type DELETE in capital letters",
      answer: "DELETE",
    },
    {
      question: "Type: I UNDERSTAND THIS ACTION CANNOT BE UNDONE",
      answer: "I UNDERSTAND THIS ACTION CANNOT BE UNDONE",
    },
    {
      question: `To confirm, type: DELETE ${
        user?.name?.toUpperCase() || ""
      } PROFILE`,
      answer: `DELETE ${user?.name?.toUpperCase() || ""} PROFILE`,
    },
    {
      question: "Type the current year",
      answer: new Date().getFullYear().toString(),
    },
    {
      question: "Type PERMANENTLY DELETE ACCOUNT",
      answer: "PERMANENTLY DELETE ACCOUNT",
    },
    {
      question: "Type CONFIRM ACCOUNT DELETION to finalize this action",
      answer: "CONFIRM ACCOUNT DELETION",
    },
  ];

  useEffect(() => {
    setAnswers(Array(deleteQuestions.length).fill(""));
  }, [user]);

  const verifyAnswers = () => {
    for (let i = 0; i < deleteQuestions.length; i++) {
      const expected = deleteQuestions[i].answer.trim();
      const entered = answers[i]?.trim();

      if (entered !== expected) {
        Alert.alert(
          "Incorrect Answer",
          `Question ${i + 1} answer is incorrect.`,
        );
        return false;
      }
    }

    return true;
  };

  const deleteProfile = async () => {
    try {
      setLoading(true);

      const token = await AsyncStorage.getItem("@auth_token");

      if (!token || !userId) {
        Toast.show({
          type: "error",
          text1: "Authentication failed",
        });
        return;
      }

      const response = await fetch(
        `https://apis.staffoo.com.au/api/user-delete/${userId}`,
        {
          method: "GET",
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
          text2: data?.message || "Something went wrong",
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
        text1: "Profile deleted successfully",
      });

      navigation.reset({
        index: 0,
        routes: [{ name: "Login" }],
      });
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: "Delete Failed",
        text2: error?.message || "Unknown error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = () => {
    if (!verifyAnswers()) {
      return;
    }

    Alert.alert(
      "Final Warning",
      "Your profile will be permanently deleted and cannot be recovered.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
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
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 50 }}
    >
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <ArrowLeft size={22} color={COLORS.text} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Delete Profile</Text>

        <View style={{ width: 42 }} />
      </View>

      <View style={styles.warningCard}>
        <Text style={styles.warningTitle}>⚠ Permanent Account Deletion</Text>
        <Text style={styles.warningText}>
          This action is irreversible. Once your profile is deleted, all account
          data will be permanently removed.
        </Text>
      </View>
      {deleteQuestions.map((item, index) => (
        <View key={index} style={styles.questionCard}>
          <Text style={styles.question}>
            {index + 1}. {item.question}
          </Text>

          <TextInput
            value={answers[index]}
            onChangeText={(text) => {
              const updated = [...answers];
              updated[index] = text;
              setAnswers(updated);
            }}
            placeholder="Enter answer"
            placeholderTextColor={COLORS.textMuted}
            style={styles.input}
          />
        </View>
      ))}

      <TouchableOpacity
        disabled={loading}
        style={[styles.deleteButton, loading && { opacity: 0.7 }]}
        onPress={handleSubmit}
      >
        <Text style={styles.deleteButtonText}>
          {loading ? "Deleting Account..." : "Verify & Delete Profile"}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  heading: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 10,
  },
  warning: {
    color: "red",
    marginBottom: 25,
    fontSize: 15,
  },
  questionContainer: {
    marginBottom: 20,
  },

  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingHorizontal: 20,
    paddingTop: 30,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 25,
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    justifyContent: "center",
    alignItems: "center",
  },

  headerTitle: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: "700",
  },

  warningCard: {
    backgroundColor: COLORS.dangerBg,
    borderWidth: 1,
    borderColor: "rgba(248,113,113,0.3)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },

  warningTitle: {
    color: COLORS.danger,
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 8,
  },

  warningText: {
    color: COLORS.textSecondary,
    lineHeight: 22,
    fontSize: 14,
  },

  questionCard: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    padding: 16,
    marginBottom: 16,
  },

  question: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 12,
    lineHeight: 22,
  },

  input: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 12,
    color: COLORS.text,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
  },

  deleteButton: {
    backgroundColor: COLORS.danger,
    borderRadius: 16,
    paddingVertical: 16,
    marginTop: 20,
    marginBottom: 30,
    shadowColor: COLORS.danger,
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 8,
  },

  deleteButtonText: {
    color: COLORS.text,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "700",
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
  },
});
