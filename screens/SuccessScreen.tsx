// screens/SuccessScreen.tsx
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  StatusBar,
} from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg'; // for checkmark icon

interface SuccessScreenProps {
  onBackToHome: () => void;
  onSeeAppliedJobs: () => void;
  // You can pass jobTitle or other data if needed
}

const SuccessScreen: React.FC<SuccessScreenProps> = ({
  onBackToHome,
  onSeeAppliedJobs,
}) => {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBackToHome} style={styles.backButton}>
          {/* Back arrow SVG */}
          <Svg width={8} height={14} viewBox="0 0 8 14" fill="none">
            <Path
              d="M6.88986 12.2951L1.60986 7.00008L6.88986 1.70508"
              stroke="#121927"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Success</Text>
        <View style={{ width: 24 }} /> {/* Placeholder for balance */}
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.successContainer}>
          {/* Green circle with white checkmark */}
          <View style={styles.checkCircle}>
            <Svg width={120} height={120} viewBox="0 0 120 120">
              {/* Green background circle */}
              <Circle cx="60" cy="60" r="60" fill="#4CAF50" />
              {/* White checkmark */}
              <Path
                d="M38 62 L52 76 L82 46"
                stroke="white"
                strokeWidth="8"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </Svg>
          </View>

          {/* Text content */}
          <Text style={styles.title}>You’ve Applied</Text>
          <Text style={styles.subtitle}>
            You have successfully applied to this job vacancy.
          </Text>

          {/* Buttons */}
          <View style={styles.buttonGroup}>
            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              onPress={onBackToHome}
            >
              <Text style={styles.buttonText}>Back To Home</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={onSeeAppliedJobs}
              // disabled style — you can make it actually disabled if needed
            >
              <Text style={[styles.buttonText, styles.secondaryText]}>
                See Applied Job
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#121927',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  successContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircle: {
    marginBottom: 32,
    // Optional shadow for depth
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#121927',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 48,
  },
  buttonGroup: {
    width: '100%',
    gap: 16,
  },
  button: {
    width: '100%',
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: '#3B82F6', // blue
  },
  secondaryButton: {
    backgroundColor: '#DBEAFE', // light blue / disabled look
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  buttonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
  },
  secondaryText: {
    color: '#3B82F6',
  },
});

export default SuccessScreen;