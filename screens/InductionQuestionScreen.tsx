import React, { useEffect, useState } from 'react';
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
} from 'react-native';
import { ChevronLeft, X, Check } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRoute, useNavigation } from '@react-navigation/native';

const { width } = Dimensions.get('window');
const BASE_URL = 'https://apis.staffoo.com.au/api';

type Question = {
  id?: number;
  question: string;
  type: string;
  answer: string;
  optiona?: string | null;
  optionb?: string | null;
  optionc?: string | null;
  optiond?: string | null;
};

type InductionData = {
  id: number;
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

  // Stronger typing
  const { inductionId } = route.params as RouteParams;

  const [induction, setInduction] = useState<InductionData | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [shortAnswer, setShortAnswer] = useState<string>('');
  const [userAnswers, setUserAnswers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const currentQuestion = questions[currentIndex];
  const progress =
    questions.length > 0 ? ((currentIndex + 1) / questions.length) * 100 : 0;

  // Early return if inductionId is missing
  if (!inductionId) {
    return (
      <SafeAreaView style={styles.container}>
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20,
          }}
        >
          <Text style={{ fontSize: 18, color: 'red', textAlign: 'center' }}>
            Error: Induction ID not found
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

  useEffect(() => {
    loadUserAndFetchQuestions();
  }, [inductionId]);

  const loadUserAndFetchQuestions = async () => {
    try {
      const cachedUser = await AsyncStorage.getItem('user');
      if (cachedUser) {
        const parsedUser = JSON.parse(cachedUser);
        const uid = parsedUser?.id || parsedUser?.user?.id;
        setUserId(uid);
      }
      await fetchInductionQuestions();
    } catch (err) {
      console.error('Error loading user:', err);
      await fetchInductionQuestions();
    }
  };

  // const fetchInductionQuestions = async () => {
  //   try {
  //     setLoading(true);
  //     const token = await AsyncStorage.getItem('@auth_token');

  //     if (!token) {
  //       Alert.alert('Session Expired', 'Please login again');
  //       return;
  //     }

  //     const response = await fetch(
  //       `${BASE_URL}/get-questionnaire/${inductionId}`,
  //       {
  //         method: 'GET',
  //         headers: {
  //           Authorization: `Bearer ${token}`,
  //           Accept: 'application/json',
  //         },
  //       },
  //     );

  //     const data = await response.json();
  //     console.log('📦 API Response:', data);

  //     if (data.success && data.data && data.data.length > 0) {
  //       const inductionData =
  //         Array.isArray(data.data) && data.data.length > 0
  //           ? data.data[0]
  //           : null;
  //       if (!inductionData) {
  //         setError('Selected induction not found');
  //         return;
  //       }

  //       setInduction(inductionData);
  //       setQuestions(inductionData.questionnaire || []);

  //       // Initialize answers
  //       const initialAnswers = (inductionData.questionnaire || []).map(() => ({
  //         selectedOption: null,
  //         shortAnswer: '',
  //       }));

  //       setUserAnswers(initialAnswers);
  //     } else {
  //       setError('No questions found');
  //     }
  //   } catch (err) {
  //     console.error('❌ Fetch Error:', err);
  //     setError('Failed to load questions');
  //   } finally {
  //     setLoading(false);
  //   }
  // };
  const fetchInductionQuestions = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = await AsyncStorage.getItem('@auth_token');

      const cachedUser = await AsyncStorage.getItem('user');
      const parsedUser = cachedUser ? JSON.parse(cachedUser) : null;

      const userId =
        parsedUser?.id || parsedUser?.user?.id || parsedUser?.guard_id;

      if (!token) {
        Alert.alert('Session Expired', 'Please login again');
        return;
      }

      if (!userId) {
        setError('User ID not found');
        return;
      }

      const response = await fetch(
        `${BASE_URL}/get-questionnaire/${userId}`, // ✅ FIX HERE
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        },
      );

      const data = await response.json();
      console.log('📦 API Response:', JSON.stringify(data, null, 2));

      if (
        !data.success ||
        !Array.isArray(data.data) ||
        data.data.length === 0
      ) {
        setError('No questions found');
        setLoading(false);
        return;
      }

      const inductionData = data.data[0];

      if (!inductionData?.questionnaire?.length) {
        setError('No questionnaire found in this induction');
        setLoading(false);
        return;
      }

      setInduction(inductionData);
      setQuestions(inductionData.questionnaire);

      const initialAnswers = inductionData.questionnaire.map(() => ({
        selectedOption: null,
        shortAnswer: '',
      }));

      setUserAnswers(initialAnswers);
    } catch (err) {
      console.error('❌ Fetch Error:', err);
      setError('Failed to load questions');
    } finally {
      setLoading(false);
    }
  };
  const getOptions = (q: Question) => {
    if (
      q.type?.toLowerCase().includes('true') ||
      q.type?.toLowerCase().includes('false')
    ) {
      return [
        { label: 'True', value: '1' },
        { label: 'False', value: '2' },
      ];
    }

    const opts = [];
    if (q.optiona) opts.push({ label: q.optiona, value: '1' });
    if (q.optionb) opts.push({ label: q.optionb, value: '2' });
    if (q.optionc) opts.push({ label: q.optionc, value: '3' });
    if (q.optiond) opts.push({ label: q.optiond, value: '4' });

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
      if (question.type === 'MCQs' || question.type === 'True/False') {
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
      Alert.alert('Error', 'User ID not found');
      return;
    }

    try {
      setSubmitting(true);
      const token = await AsyncStorage.getItem('@auth_token');

      if (!token) {
        Alert.alert('Session Expired', 'Please login again');
        return;
      }

      const marks = calculateMarks();

      const submitFormData = new FormData();
      submitFormData.append('guard_id', userId);
      submitFormData.append('marks', marks.toString());
      submitFormData.append('questionnaire_id', inductionId.toString());

      console.log('====================================');
      console.log('Submitting induction questionnaire...');
      console.log('userId:', userId);
      console.log('inductionId:', inductionId);
      console.log('marks:', marks);
      console.log('====================================');

      const submitResponse = await fetch(
        `${BASE_URL}/submit-guard-questionnaire`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
          body: submitFormData,
        },
      );

      const submitData = await submitResponse.json();

      if (submitData.success) {
        const statusFormData = new FormData();
        statusFormData.append('guard_id', userId);
        statusFormData.append('id', inductionId.toString());
        // statusFormData.append('type', 'induction');

        console.log('Updating induction read status...');
        console.log('userId:', userId);
        console.log('inductionId:', inductionId);
        console.log('====================================');
        await fetch(`${BASE_URL}/update-induction-read-status`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
          body: statusFormData,
        });

        if (marks > 80) {
          Alert.alert(
            '🎉 Congratulations!',
            'Induction certificate submitted successfully!',
            [{ text: 'Done', onPress: () => navigation.goBack() }],
          );
        } else {
          Alert.alert(
            '⚠️ Not Eligible',
            'You are not eligible for the induction card. Please re-attempt the test again!',
            [{ text: 'Retry', onPress: () => navigation.goBack() }],
          );
        }
      } else {
        Alert.alert('Error', submitData.message || 'Submission failed');
      }
    } catch (err) {
      console.error('❌ Submission Error:', err);
      Alert.alert('Error', 'Failed to submit induction');
    } finally {
      setSubmitting(false);
    }
  };

  const handleNext = () => {
    if (currentQuestion.type === 'Short Question') {
      if (!shortAnswer.trim()) {
        Alert.alert('Required', 'Please enter your answer');
        return;
      }
    } else {
      if (selectedOption === null) {
        Alert.alert('Required', 'Please select an option');
        return;
      }
    }

    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);

      const nextAnswer = userAnswers[currentIndex + 1];
      setSelectedOption(nextAnswer?.selectedOption ?? null);
      setShortAnswer(nextAnswer?.shortAnswer ?? '');
    } else {
      submitInduction();
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View
          style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
        >
          <ActivityIndicator size="large" color="#0F172A" />
          <Text style={{ marginTop: 12 }}>Loading Questions...</Text>
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
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20,
          }}
        >
          <Text style={{ fontSize: 18, color: 'red', textAlign: 'center' }}>
            {error || 'No questions available'}
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

  const isShortQuestion = currentQuestion.type === 'Short Question';
  const options = !isShortQuestion ? getOptions(currentQuestion) : [];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.iconButton}
          >
            <ChevronLeft size={28} color="#1e2937" />
          </TouchableOpacity>

          <Text style={styles.questionCounter}>
            Question {currentIndex + 1} / {questions.length}
          </Text>

          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.iconButton}
          >
            <X size={28} color="#1e2937" />
          </TouchableOpacity>
        </View>

        <View style={styles.progressContainer}>
          <View style={[styles.progressBar, { width: `${progress}%` }]} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.inductionTitle}>{induction?.title}</Text>

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
                    {option.label}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Footer Button */}
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
                ? 'Finish Induction'
                : 'Next Question'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#dfe6f9' },

  header: {
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: '#cbe1e8',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    marginRight: 10,
    marginLeft: 10,
    paddingTop: 10,
  },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  iconButton: { padding: 4 },
  questionCounter: {
    color: '#1e2937',
    fontSize: 18,
    fontWeight: '700',
  },
  progressContainer: {
    height: 8,
    backgroundColor: '#e2e8f0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#0F172A',
    borderRadius: 4,
  },

  inductionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e2937',
    textAlign: 'center',
    marginVertical: 15,
  },

  scrollContent: {
    flexGrow: 1,
    padding: 20,
    paddingBottom: 100,
  },
  questionCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  questionText: {
    fontSize: 18,
    lineHeight: 28,
    color: '#1e2937',
    fontWeight: '600',
  },
  questionTypeBadge: {
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 12,
  },
  questionTypeText: {
    color: '#0284c7',
    fontSize: 12,
    fontWeight: '600',
  },

  shortAnswerContainer: {
    marginBottom: 20,
  },
  shortAnswerInput: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    color: '#1e2937',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    minHeight: 120,
    textAlignVertical: 'top',
  },

  optionsContainer: { gap: 14 },
  optionButton: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  selectedOption: {
    borderColor: '#0F172A',
    backgroundColor: '#f0f9ff',
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: { marginRight: 16 },
  emptyCheckbox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: '#94a3b8',
  },
  checkedBox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: {
    fontSize: 16.5,
    color: '#334155',
    flex: 1,
    lineHeight: 24,
  },
  selectedOptionText: {
    color: '#1e40af',
    fontWeight: '600',
  },

  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  nextButton: {
    backgroundColor: '#0F172A',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#94a3b8',
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
});
