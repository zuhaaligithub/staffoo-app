import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Alert,
  Platform,
} from 'react-native';
import { pick } from '@react-native-documents/picker'; 
type Props = { navigation: any };
const ApplyJobScreen = ({ navigation }: Props)=> {
  const [fullName, setFullName] = useState('');
  const [portfolio, setPortfolio] = useState('');
  const [cvFile, setCvFile] = useState<any>(null); 
  const [motivationLetter, setMotivationLetter] = useState('');

  const pickCV = async () => {
    try {
      const [file] = await pick({
        type: [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'image/jpeg',
          'image/png',
        ],
        copyTo: 'cachesDirectory', 
        multiple: false,
      });

      setCvFile(file);
      Alert.alert('Success', `Selected: ${file.name}`);
    } catch (err: any) {
      if (err?.code === 'DOCUMENT_PICKER_CANCELED') {
        return;
      }
      console.error('Document pick error:', err);
      Alert.alert('Error', 'Could not pick document');
    }
  };

  const handleSubmit = () => {
    navigation.navigate('Success');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.headerTitle}>Apply for this Job</Text>

        {/* Full Name */}
        <View style={styles.field}>
          <Text style={styles.label}>Full Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Type your full name"
            value={fullName}
            onChangeText={setFullName}
            autoCapitalize="words"
          />
        </View>

        {/* Portfolio */}
        <View style={styles.field}>
          <Text style={styles.label}>Website, Blog, or Portfolio</Text>
          <TextInput
            style={styles.input}
            placeholder="Type your portfolio address (URL)"
            value={portfolio}
            onChangeText={setPortfolio}
            keyboardType="url"
            autoCapitalize="none"
          />
        </View>

        {/* CV Upload */}
        <View style={styles.field}>
          <Text style={styles.label}>Upload CV</Text>
          <TouchableOpacity
            style={styles.uploadBox}
            onPress={pickCV}
            activeOpacity={0.75}
          >
            <View style={styles.uploadContent}>
              <Text style={styles.uploadTextSmall}>Format: DOC, PDF, JPG</Text>
              <Text style={styles.uploadButtonText}>
                {cvFile ? 'Change File' : 'Browse Files'}
              </Text>
              {cvFile && (
                <Text style={styles.fileName}>
                  {cvFile.name} • {(cvFile.size / 1024 / 1024).toFixed(1)} MB
                </Text>
              )}
            </View>
          </TouchableOpacity>
        </View>

        {/* Motivational Letter */}
        <View style={styles.field}>
          <Text style={styles.label}>Motivational Letter</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Write something..."
            value={motivationLetter}
            onChangeText={setMotivationLetter}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
          />
        </View>

        {/* Spacer for fixed button */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Fixed bottom button */}
      <View style={styles.fixedButtonContainer}>
        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
          <Text style={styles.submitButtonText}>Apply This Job</Text>
        </TouchableOpacity>
      </View>
      
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 20,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 140,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 28,
    textAlign: 'center',
  },
  field: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    color: '#111',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    backgroundColor: '#f9fafb',
  },
  textArea: {
    minHeight: 140,
    paddingTop: 14,
  },
  uploadBox: {
    borderWidth: 1.5,
    borderColor: '#d1d5db',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  uploadContent: {
    alignItems: 'center',
  },
  uploadTextSmall: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 8,
  },
  uploadButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3b82f6',
  },
  fileName: {
    marginTop: 8,
    fontSize: 13,
    color: '#4b5563',
  },
  fixedButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  submitButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
});

export default ApplyJobScreen;