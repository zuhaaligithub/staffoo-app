import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Platform,
  ActivityIndicator,
  Alert
} from 'react-native';
import Pdf from 'react-native-pdf';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, Check } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import or define your base URL here
export const BASE_URL = 'https://apis.staffoo.com.au/api';

export default function PoliciesScreen() {
  const navigation = useNavigation();
  const [isAccepted, setIsAccepted] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const source = Platform.OS === 'android'
    ? { uri: 'bundle-assets://policies.pdf' }
    : require('../assets/policies.pdf');
  const handleToggleCheckbox = async () => {
    const newValue = !isAccepted;

    // Optimistically update UI for a snappy feel
    setIsAccepted(newValue);
    setIsUpdating(true);

    try {
      // 1. Get the user ID from AsyncStorage
      const uid = await AsyncStorage.getItem('@user_id');

      // 2. Safety check: If no ID is found, stop and revert
      if (!uid) {
        Alert.alert("Error", "User session not found. Please log in again.");
        setIsAccepted(!newValue); // Revert checkbox
        return;
      }

      // 3. Fire the API call with the dynamically fetched uid
      const response = await fetch(`${BASE_URL}/accept-policy/${uid}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          is_policy_accepted: newValue
        })
      });

      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }

      const responseData = await response.json();
      console.log('Successfully updated:', responseData);

    } catch (error) {
      console.log("API Update Error:", error);
      setIsAccepted(!newValue); // Revert the UI if it fails
      Alert.alert("Error", "Failed to update your policy preference. Please try again.");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        >
          <ArrowLeft size={22} color="#000" />
        </TouchableOpacity>
        <View style={styles.center}>
          <Text style={styles.title}>Privacy Policy</Text>
        </View>
        <View style={styles.backBtn} />
      </View>

      {/* Main Container */}
      <View style={styles.policyBox}>
        {/* PDF Section */}
        <View style={styles.pdfWrapper}>
          <Pdf
            source={source}
            style={styles.pdf}
            trustAllCerts={false}
            onError={(error) => console.log("PDF Error:", error)}
          />
        </View>

        {/* Checkbox Section */}
        <View style={styles.boxFooter}>
          <TouchableOpacity
            style={styles.checkboxRow}
            activeOpacity={0.8}
            onPress={handleToggleCheckbox}
            disabled={isUpdating}
          >
            <View style={[styles.checkbox, isAccepted && styles.checkboxActive]}>
              {isAccepted && <Check size={14} color="#fff" strokeWidth={3} />}
            </View>

            <View style={styles.checkboxTextContainer}>
              <Text style={styles.checkboxText}>
                I have read and agree to the Privacy Policy
              </Text>
            </View>

            {isUpdating && (
              <ActivityIndicator size="small" color="#1A8754" style={styles.loader} />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// ... Keep your exact same styles ...
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    paddingTop: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  center: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  policyBox: {
    flex: 1,
    marginHorizontal: 16,
    marginBottom: Platform.OS === 'ios' ? 34 : 20,
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  pdfWrapper: {
    flex: 1,
  },
  pdf: {
    flex: 1,
    width: '100%',
  },
  boxFooter: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderColor: '#E5E7EB',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  checkboxActive: {
    backgroundColor: '#1A8754',
    borderColor: '#1A8754',
  },
  checkboxTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  checkboxText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  loader: {
    marginLeft: 10,
  }
});