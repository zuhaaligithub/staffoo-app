import React, { useEffect, useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Alert,
  StatusBar,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { ChevronLeft, X, Check } from "lucide-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRoute, useNavigation } from "@react-navigation/native";

const { width } = Dimensions.get("window");
const BASE_URL = "https://apis.staffoo.com.au/api";

type Question = {
  question: string;
  type: string;
  answer: string;
  optiona?: string | null;
  optionb?: string | null;
  optionc?: string | null;
  optiond?: string | null;
};

type QuestionnaireItem = {
  id: number;
  questionnaire_id: number;
  title: string;
  questionnaire: Question[];
  status?: string;
};

type RouteParams = {
  inductionId: number | string;
};

export default function InductionQuestionsScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { inductionId: routeInductionId } = route.params as RouteParams;
  const capitalizeFirstLetter = (text: string) => {
    if (!text) return "";
    return text.charAt(0).toUpperCase() + text.slice(1);
  };
  const [induction, setInduction] = useState<QuestionnaireItem | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [shortAnswer, setShortAnswer] = useState<string>("");
  const [userAnswers, setUserAnswers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [questionnaireId, setQuestionnaireId] = useState<number | null>(null);

  const currentQuestion = questions[currentIndex];
  const progress =
    questions.length > 0 ? ((currentIndex + 1) / questions.length) * 100 : 0;

  const COLORS = {
    primary: "#89E7D0",
    background: "#001F3F",
    surface2: "#12243A",
    card: "rgba(255,255,255,0.06)",
    cardBorder: "rgba(255,255,255,0.08)",
    text: "#FFFFFF",
    textSecondary: "rgba(255,255,255,0.7)",
    textMuted: "rgba(255,255,255,0.5)",
    success: "#22C55E",
    danger: "#EF4444",
    border: "rgba(255,255,255,0.08)",
  };

  useEffect(() => {
    loadUserAndFetchQuestions();
  }, [routeInductionId]);

  const loadUserAndFetchQuestions = async () => {
    try {
      setLoading(true);
      setError(null);

      const cachedUser = await AsyncStorage.getItem("user");
      if (!cachedUser) {
        setError("User session not found. Please login again.");
        return;
      }

      const parsedUser = JSON.parse(cachedUser);
      const uid =
        parsedUser?.id || parsedUser?.user?.id || parsedUser?.guard_id;

      if (!uid) {
        setError("User ID not found in session");
        return;
      }

      setUserId(uid);
      await fetchInductionQuestions(uid);
    } catch (err) {
      console.error("Error loading user:", err);
      setError("Failed to load user data");
    } finally {
      setLoading(false);
    }
  };

  const fetchInductionQuestions = async (currentUserId: string) => {
    try {
      const token = await AsyncStorage.getItem("@auth_token");
      if (!token) {
        Alert.alert("Session Expired", "Please login again");
        return;
      }

      console.log(`Fetching: ${BASE_URL}/get-questionnaire/${currentUserId}`);

      const response = await fetch(
        `${BASE_URL}/get-questionnaire/${currentUserId}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        },
      );

      const data = await response.json();
      console.log("📦 API Response:", JSON.stringify(data, null, 2));

      if (
        !data.success ||
        !Array.isArray(data.data) ||
        data.data.length === 0
      ) {
        setError("No questionnaires found");
        return;
      }

      const selectedInduction = data.data.find(
        (item: any) =>
          item.id === Number(routeInductionId) ||
          item.questionnaire_id === Number(routeInductionId),
      );

      if (!selectedInduction?.questionnaire?.length) {
        setError("Selected questionnaire not found or has no questions");
        return;
      }

      setInduction(selectedInduction);
      setQuestions(selectedInduction.questionnaire);
      setQuestionnaireId(selectedInduction.questionnaire_id); // 1

      const initialAnswers = selectedInduction.questionnaire.map(() => ({
        selectedOption: null,
        shortAnswer: "",
      }));
      setUserAnswers(initialAnswers);
    } catch (err) {
      console.error("❌ Fetch Error:", err);
      setError("Failed to load questions. Please try again.");
    }
  };

  const getOptions = (q: Question) => {
    if (
      q.type?.toLowerCase().includes("true") ||
      q.type?.toLowerCase().includes("false")
    ) {
      return [
        { label: "True", value: "1" },
        { label: "False", value: "2" },
      ];
    }
    const opts: { label: string; value: string }[] = [];
    if (q.optiona) opts.push({ label: q.optiona, value: "1" });
    if (q.optionb) opts.push({ label: q.optionb, value: "2" });
    if (q.optionc) opts.push({ label: q.optionc, value: "3" });
    if (q.optiond) opts.push({ label: q.optiond, value: "4" });
    return opts;
  };

  const handleSelect = (index: number) => {
    setSelectedOption(index);
    const updated = [...userAnswers];
    updated[currentIndex] = { ...updated[currentIndex], selectedOption: index };
    setUserAnswers(updated);
  };

  const handleShortAnswerChange = (text: string) => {
    setShortAnswer(text);
    const updated = [...userAnswers];
    updated[currentIndex] = { ...updated[currentIndex], shortAnswer: text };
    setUserAnswers(updated);
  };

  const calculateMarks = (): number => {
    let correctCount = 0;
    let totalGradedQuestions = 0;

    questions.forEach((question, index) => {
      if (question.type === "MCQs" || question.type === "True/False") {
        totalGradedQuestions++;
        const userAnswer = userAnswers[index];
        const correctAnswerIndex = parseInt(question.answer) - 1;
        if (userAnswer?.selectedOption === correctAnswerIndex) {
          correctCount++;
        }
      }
    });

    const percentage =
      totalGradedQuestions > 0
        ? (correctCount / totalGradedQuestions) * 100
        : 0;
    return Math.round(percentage);
  };

  const submitInduction = async () => {
    if (!userId) {
      Alert.alert("Error", "User ID not found");
      return;
    }

    try {
      setSubmitting(true);
      const token = await AsyncStorage.getItem("@auth_token");
      if (!token) {
        Alert.alert("Session Expired", "Please login again");
        return;
      }

      const marks = calculateMarks();

      // Submit API - Send inductionId (4) as requested
      const submitFormData = new FormData();
      submitFormData.append("guard_id", userId);
      submitFormData.append("marks", marks.toString());
      submitFormData.append("questionnaire_id", routeInductionId.toString()); // ← 4

      console.log("=== SUBMIT PAYLOAD ===", {
        guard_id: userId,
        marks: marks,
        questionnaire_id: routeInductionId,
      });

      const submitResponse = await fetch(
        `${BASE_URL}/submit-guard-questionnaire`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
          body: submitFormData,
        },
      );

      const submitData = await submitResponse.json();
      console.log(
        "=== SUBMIT RESPONSE ===",
        JSON.stringify(submitData, null, 2),
      );

      if (submitData.success) {
        // Update Status - Send real questionnaire_id (1)
        const statusFormData = new FormData();
        statusFormData.append("guard_id", userId);
        statusFormData.append("id", questionnaireId?.toString() || "1");

        console.log("=== UPDATE STATUS PAYLOAD ===", {
          guard_id: userId,
          id: questionnaireId,
        });

        const statusResponse = await fetch(
          `${BASE_URL}/update-induction-read-status`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/json",
            },
            body: statusFormData,
          },
        );

        const statusData = await statusResponse.json();
        console.log(
          "=== UPDATE STATUS RESPONSE ===",
          JSON.stringify(statusData, null, 2),
        );

        if (marks > 80) {
          Alert.alert(
            "🎉 Congratulations!",
            "Induction certificate submitted successfully!",
            [{ text: "Done", onPress: () => navigation.goBack() }],
          );
        } else {
          Alert.alert(
            "⚠️ Not Eligible",
            "You are not eligible for the induction card. Please re-attempt the test again!",
            [{ text: "Retry", onPress: () => navigation.goBack() }],
          );
        }
      } else {
        Alert.alert("Error", submitData.message || "Submission failed");
      }
    } catch (err) {
      console.error("❌ Submission Error:", err);
      Alert.alert("Error", "Failed to submit induction");
    } finally {
      setSubmitting(false);
    }
  };

  const handleNext = () => {
    if (currentQuestion.type === "Short Question") {
      if (!shortAnswer.trim()) {
        Alert.alert("Required", "Please enter your answer");
        return;
      }
    } else {
      if (selectedOption === null) {
        Alert.alert("Required", "Please select an option");
        return;
      }
    }

    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      const nextAnswer = userAnswers[currentIndex + 1];
      setSelectedOption(nextAnswer?.selectedOption ?? null);
      setShortAnswer(nextAnswer?.shortAnswer ?? "");
    } else {
      submitInduction();
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={{ marginTop: 12, color: COLORS.text }}>
            Loading Questions...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || questions.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            padding: 20,
          }}
        >
          <Text style={{ fontSize: 18, color: "red", textAlign: "center" }}>
            {error || "No questions available"}
          </Text>
          <TouchableOpacity
            style={styles.nextButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.nextButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const isShortQuestion = currentQuestion.type === "Short Question";
  const options = !isShortQuestion ? getOptions(currentQuestion) : [];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      <View style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.iconButton}
          >
            <ChevronLeft size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.questionCounter}>
            Question {currentIndex + 1} / {questions.length}
          </Text>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.iconButton}
          >
            <X size={24} color={COLORS.text} />
          </TouchableOpacity>
        </View>
        <View style={styles.progressContainer}>
          <View style={[styles.progressBar, { width: `${progress}%` }]} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.inductionTitle}>{induction?.title || ""}</Text>

        <View style={styles.questionCard}>
          <Text style={styles.questionText}>{currentQuestion.question}</Text>
          <View style={styles.questionTypeBadge}>
            <Text style={styles.questionTypeText}>{currentQuestion.type}</Text>
          </View>
        </View>

        {isShortQuestion ? (
          <View style={styles.shortAnswerContainer}>
            <TextInput
              style={styles.shortAnswerInput}
              placeholder="Type your answer here..."
              placeholderTextColor="#94a3b8"
              multiline
              numberOfLines={4}
              value={shortAnswer}
              onChangeText={handleShortAnswerChange}
            />
          </View>
        ) : (
          <View style={styles.optionsContainer}>
            {options.map((option, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.optionButton,
                  selectedOption === index && styles.selectedOption,
                ]}
                onPress={() => handleSelect(index)}
              >
                <View style={styles.optionContent}>
                  <View style={styles.checkbox}>
                    {selectedOption === index ? (
                      <View style={styles.checkedBox}>
                        <Check size={18} color="#fff" strokeWidth={3} />
                      </View>
                    ) : (
                      <View style={styles.emptyCheckbox} />
                    )}
                  </View>
                  <Text
                    style={[
                      styles.optionText,
                      selectedOption === index && styles.selectedOptionText,
                    ]}
                  >
                    {capitalizeFirstLetter(option.label)}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.nextButton,
            (isShortQuestion ? !shortAnswer.trim() : selectedOption === null) &&
              styles.disabledButton,
          ]}
          onPress={handleNext}
          disabled={
            submitting ||
            (isShortQuestion ? !shortAnswer.trim() : selectedOption === null)
          }
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.nextButtonText}>
              {currentIndex === questions.length - 1
                ? "Finish Induction"
                : "Next Question"}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#111111",
    paddingTop: 30,
  },
  header: {
    paddingBottom: 15,
    paddingHorizontal: 20,
    backgroundColor: "#12243A",
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    marginHorizontal: 10,
    paddingTop: 7,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  iconButton: { padding: 4 },
  questionCounter: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  progressContainer: {
    height: 8,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    backgroundColor: "#89E7D0",
    borderRadius: 4,
  },
  inductionTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
    marginVertical: 10,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    paddingBottom: 120,
  },
  questionCard: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 24,
    padding: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  questionText: {
    fontSize: 16,
    lineHeight: 20,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  questionTypeBadge: {
    backgroundColor: "rgba(137,231,208,0.15)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    alignSelf: "flex-start",
    marginTop: 14,
    borderWidth: 1,
    borderColor: "rgba(137,231,208,0.25)",
  },
  questionTypeText: {
    color: "#89E7D0",
    fontSize: 12,
    fontWeight: "700",
  },
  shortAnswerContainer: { marginBottom: 20 },
  shortAnswerInput: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 18,
    padding: 18,
    fontSize: 16,
    color: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    minHeight: 140,
    textAlignVertical: "top",
  },
  optionsContainer: { gap: 14 },
  optionButton: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 50,
    padding: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  selectedOption: {
    borderColor: "#89E7D0",
    backgroundColor: "rgba(137,231,208,0.12)",
  },
  optionContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  checkbox: { marginRight: 16 },
  emptyCheckbox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.5)",
  },
  checkedBox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#89E7D0",
    alignItems: "center",
    justifyContent: "center",
  },
  optionText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.7)",
    flex: 1,
    lineHeight: 24,
  },
  selectedOptionText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#12243A",
    padding: 18,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
  },
  nextButton: {
    backgroundColor: "#89E7D0",
    paddingVertical: 14,
    borderRadius: 18,
    alignItems: "center",
  },
  disabledButton: {
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  nextButtonText: {
    color: "#001F3F",
    fontSize: 18,
    fontWeight: "700",
  },
});
