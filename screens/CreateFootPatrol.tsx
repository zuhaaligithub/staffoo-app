import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TextInput,
  Image,
  Alert,
  Platform,
} from 'react-native';
import {
  ChevronLeft,
  ChevronDown,
  Calendar,
  FileText,
  Camera,
  PenTool,
  X,
  UploadCloud,
} from 'lucide-react-native';
import { launchCamera, launchImageLibrary, CameraOptions, ImagePickerResponse } from 'react-native-image-picker';
import SignatureScreen from 'react-native-signature-canvas';
import RNFS from 'react-native-fs';
import ImageResizer from 'react-native-image-resizer';
import { getAuthToken } from '../services/authApi';
import axios from 'axios';
import { OPENAI_API_KEY } from './config/aiConfig';

interface PhotoItem {
  uri: string;
  timestamp: string;
}

export default function CreateFootPatrol({ navigation, route }: { navigation: any; route: any }) {

  let siteId: string | number;
  let siteName: string;
  let guardId: string | number;
  let rosterId: string | number;
  if (route.params?.jobRoster) {
    const job = route.params.jobRoster;
    siteId = job?.site?.id;
    siteName = job?.site?.site_name || 'Unknown Site';
    guardId = job?.guard_id;
    rosterId = job?.id;
  } else {
    siteId = route.params?.siteId;
    siteName = route.params?.siteName || 'Unknown Site';
    guardId = route.params?.guardId;
    rosterId = route.params?.rosterId;
  }

  if (!siteId) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 }}>
          <Text style={{ fontSize: 18, color: '#ef4444', textAlign: 'center' }}>
            Missing required site or roster information.{'\n'}Go back and try again.
          </Text>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{ marginTop: 24, paddingVertical: 14, paddingHorizontal: 32, backgroundColor: '#3b82f6', borderRadius: 12 }}
          >
            <Text style={{ color: '#fff', fontWeight: '600', fontSize: 16 }}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const [incidentDateTime] = useState(
    new Date().toLocaleString('en-AU', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  );

  const [day, monthStr, year] = incidentDateTime.split(', ')[0].split(' ');
  const monthMap: { [key: string]: string } = {
    Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
    Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12',
  };
  const month = monthMap[monthStr] || '01';
  const formattedDate = `${day.padStart(2, '0')}/${month}/${year}`;
  const formattedTime = incidentDateTime.split(', ')[1].trim();

  const [expanded, setExpanded] = useState<string | null>(null);
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [patrollingDetails, setPatrollingDetails] = useState<string>('');
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const signatureRef = useRef<any>(null);

  const toggleSection = (section: string) => {
    setExpanded(expanded === section ? null : section);
  };

  const pickImage = () => {
    if (photos.length >= 6) {
      Alert.alert('Limit reached', 'You can upload up to 6 photos.');
      return;
    }

    const options: CameraOptions = {
      mediaType: 'photo',
      quality: 0.7,
      includeBase64: false,
    };

    Alert.alert('Add Photo', 'Choose source', [
      { text: 'Camera', onPress: () => launchCamera(options, handleImage) },
      // { text: 'Gallery', onPress: () => launchImageLibrary(options, handleImage) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const resizeAndConvertToBase64 = async (
    originalUri: string,
    maxWidth: number = 600,
    maxHeight: number = 600,
    quality: number = 50,
  ): Promise<string> => {
    try {
      console.log('[resize] Starting (aggressive mode) for uri:', originalUri);

      const resized = await ImageResizer.createResizedImage(
        originalUri,
        maxWidth,
        maxHeight,
        'JPEG',
        quality,
        0,
        undefined,
        false,
        { mode: 'cover' }
      );
      console.log('[resize] Resized uri:', resized.uri);
      const base64Content = await RNFS.readFile(resized.uri, 'base64');
      const dataUri = `data:image/jpeg;base64,${base64Content}`;
      const sizeKB = Math.round(dataUri.length * 3 / 4 / 1024);
      console.log('[resize] Success - aggressive compression');
      console.log('[resize] Final size ≈', sizeKB, 'KB (target < 200 KB)');

      return dataUri;
    } catch (error: any) {
      console.error('[resize] Failed:', error);
      throw error;
    }
  };

  const correctText = async (text: string, instruction: string) => {
    if (!text?.trim()) {
      Alert.alert("No text", "Please enter some incident details first.");
      return;
    }
    try {
      const payload = {
        model: "gpt-4o-mini",                 
        messages: [
          {
            role: "system",
            content: "You are a professional security report editor. " +
              "Be concise, factual, formal. Never invent new information."
          },
          {
            role: "user",
            content: `${instruction}:\n\n${text}`  
          }
        ],
        temperature: 0.4,                      
        max_tokens: 300,                       
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0
      };

      console.log("Sending OpenAI payload:", JSON.stringify(payload, null, 2));

      const response = await axios.post(
        "https://api.openai.com/v1/chat/completions",
        payload,                                  
        {
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${OPENAI_API_KEY}`
          },
          timeout: 20000                        
        }
      );

      const correctedText = response.data.choices?.[0]?.message?.content?.trim();

      if (!correctedText) {
        throw new Error("No correction received from OpenAI");
      }

      setPatrollingDetails(correctedText);
      console.log("AI corrected text:", correctedText);

    } catch (error: any) {
      console.error("OpenAI request failed:", error);

      let errorMessage = "AI text correction failed. Please try again.";

      if (error.response) {
        const status = error.response.status;
        const errData = error.response.data?.error;

        if (status === 401) {
          errorMessage = "Invalid or expired OpenAI API key. Please check your API key.";
        } else if (status === 429) {
          errorMessage = "Rate limit exceeded. Please wait a moment and try again.";
        } else if (status === 400 && errData?.code === "invalid_api_key") {
          errorMessage = "Incorrect API key. Generate a new one from OpenAI dashboard.";
        } else if (errData?.message) {
          errorMessage = errData.message;
        }
      }

      Alert.alert("AI Error", errorMessage);
    }
  };


  const handleImage = async (response: ImagePickerResponse) => {
    if (response.didCancel) return;
    if (response.errorCode) {
      Alert.alert('Error', response.errorMessage || 'Failed to pick image');
      return;
    }

    const asset = response.assets?.[0];
    if (!asset?.uri) return;

    console.log('[handleImage] Selected image uri:', asset.uri);

    try {
      const base64DataUri = await resizeAndConvertToBase64(
        asset.uri,
        600,   
        600,
        50      
      );

      const timestamp = new Date().toLocaleString('en-AU', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
      setPhotos((prev: PhotoItem[]) => {
        const newPhotos = [...prev, { uri: asset.uri!, timestamp }];
        console.log(`[handleImage] Added photo. Total now: ${newPhotos.length}`);
        return newPhotos;
      });
    } catch (err: any) {
      console.error('[handleImage] Processing failed:', err.message || err);
      Alert.alert('Error', 'Failed to process image.\nTry a smaller photo.');
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };
  const submitReport = async () => {
    if (!patrollingDetails.trim()) {
      return Alert.alert('Required', 'Please enter patrolling details.');
    }
    if (!signatureData) {
      return Alert.alert('Required', 'Please provide staff signature.');
    }
    if (photos.length > 2) {
      Alert.alert('Too many photos', 'Server limit is low — please use max 2 photos for now.');
      return;
    }
    try {
      console.log('═══════ FOOT PATROL SUBMISSION START ═══════');
      console.log(`Photos count: ${photos.length}`);
      console.log(`Signature present: ${!!signatureData ? 'Yes' : 'No'}`);
      const photoPayload = await Promise.all(
        photos.map(async (photo, index) => {
          try {
            console.log(`\n[PHOTO ${index + 1}/${photos.length}]`);
            console.log('   • Original URI:', photo.uri);
            const resized = await ImageResizer.createResizedImage(
              photo.uri,
              480,
              480,
              'JPEG',
              45,
              0
            );
            const base64 = await RNFS.readFile(resized.uri, 'base64');
            const fullBase64Uri = `data:image/jpeg;base64,${base64}`;
            const sizeKB = Math.round(fullBase64Uri.length * 3 / 4 / 1024);
            console.log('   → SUCCESS (compressed)');
            console.log(`      • Size after resize: ${sizeKB} KB`);
            console.log(`      • Starts with: ${fullBase64Uri.substring(0, 80)}...`);

            return {
              imgPath: fullBase64Uri,
              timestamp: photo.timestamp,
            };
          } catch (err: any) {
            console.error(`   → FAILED:`, err.message || err);
            return null;
          }
        })
      );

      const validPhotos = photoPayload.filter(p => p !== null);
      const estimatedPhotoSize = validPhotos.reduce((sum, p) => sum + (p.imgPath.length * 3 / 4 / 1024), 0);
      const signatureSize = signatureData ? signatureData.length * 3 / 4 / 1024 : 0;
      const totalApproxKB = estimatedPhotoSize + signatureSize + 100; 
      if (totalApproxKB > 800) { 
        Alert.alert('Payload too large', `Total estimated size ~${Math.round(totalApproxKB)} KB — server rejects it.\nRemove some photos or try lower quality.`);
        return;
      }
      console.log(`\nTotal estimated payload size: ~${Math.round(totalApproxKB)} KB (should pass)`);
      const payload = {
        guard_id: guardId,
        roster_id: rosterId,
        date: formattedDate,
        time: formattedTime,
        site_name: siteName,
        patrolling_detail: patrollingDetails.trim(),
        photo: JSON.stringify(validPhotos), 
        signature: signatureData,
      };
      const debugPayload = {
        ...payload,
        photo: validPhotos.length ? `${validPhotos.length} photos (stringified, base64 hidden)` : '[]',
        signature: signatureData ? `[BASE64 - ~${Math.round(signatureSize)} KB]` : 'MISSING',
      };
      console.log('\n========== PAYLOAD PREVIEW ==========');
      console.log('Note: photo sent as JSON string (fixes json_decode error)');
      console.log(JSON.stringify(debugPayload, null, 2));
      console.log('=====================================');
      const token = await getAuthToken();
      if (!token) throw new Error('No authentication token found');
      const response = await fetch(
        `https://apis.staffoo.com.au/api/add-foot-patrol-report/${siteId}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            Accept: 'application/json'
          },
          body: JSON.stringify(payload),
        }
      );

      let result;
      try {
        result = await response.json();
      } catch {
        result = { message: 'No JSON response' };
      }

      console.log('\n========== API RESPONSE ==========');
      console.log('Status:', response.status);
      console.log(JSON.stringify(result, null, 2));
      console.log('==================================');

      if (response.ok) {
        Alert.alert('Success', 'Foot Patrolling Report submitted successfully!');
        navigation.goBack();
      } else {
        let msg = result.message || `Server error (${response.status})`;
        if (response.status === 413) {
          msg = '413 Payload Too Large — even after compression. Try 0–1 photo or ask backend to increase limit.';
        }
        Alert.alert('Error', msg);
      }
    } catch (error: any) {
      console.error('Submit failed:', error);
      Alert.alert('Failed', error.message || 'Check connection / permissions');
    }
  };
  const handleSaveSignature = () => {
    signatureRef.current?.readSignature();
  };

  const handleClearSignature = () => {
    signatureRef.current?.clearSignature();
    setSignatureData(null);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ChevronLeft size={28} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Foot Patrolling</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <TouchableOpacity style={styles.fieldCard} onPress={() => toggleSection('date')}>
          <View style={styles.iconCircle}>
            <Calendar size={22} color="#3b82f6" />
          </View>
          <View style={styles.fieldContent}>
            <Text style={styles.fieldLabel}>Patrolling Date/Time</Text>
          </View>
          <ChevronDown size={20} color="#64748b" />
        </TouchableOpacity>

        {expanded === 'date' && (
          <View style={styles.expandedContent}>
            <Text style={styles.fieldValue}>{formattedDate} {formattedTime}</Text>
          </View>
        )}

        <TouchableOpacity style={styles.fieldCard} onPress={() => toggleSection('details')}>
          <View style={styles.iconCircle}>
            <FileText size={22} color="#3b82f6" />
          </View>
          <View style={styles.fieldContent}>
            <Text style={styles.fieldLabel}>Foot Patrolling Details</Text>
            <Text style={styles.fieldValuePlaceholder}>
              {patrollingDetails || 'Tap to write'}
            </Text>
          </View>
          <ChevronDown size={20} color="#64748b" />
        </TouchableOpacity>

        {expanded === 'details' && (
          <View style={styles.expandedContent}>
            <TextInput
              style={styles.textArea}
              multiline
              placeholder="Enter patrolling details here..."
                     placeholderTextColor="#9CA3AF"
              value={patrollingDetails}
              onChangeText={setPatrollingDetails}
            />
            <View style={styles.aiButtons}>
              <TouchableOpacity
                style={styles.spellBtn}
                onPress={() =>
                  correctText(
                    patrollingDetails,
                    "Correct this"
                  )
                }
              >
                <Text style={styles.btnText}>Spell check only</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.aiBtn}
                onPress={() =>
                  correctText(
                    patrollingDetails,
                    "Change this text to more professional and detailed text with correct grammar and spellings:"
                  )
                }
              >
                <Text style={styles.btnText}>Change with AI</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <TouchableOpacity style={styles.fieldCard} onPress={() => toggleSection('photos')}>
          <View style={styles.iconCircle}>
            <Camera size={22} color="#3b82f6" />
          </View>
          <View style={styles.fieldContent}>
            <Text style={styles.fieldLabel}>Photos</Text>
            <Text style={styles.fieldValue}>{photos.length} added</Text>
          </View>
          <ChevronDown size={20} color="#64748b" />
        </TouchableOpacity>

        {expanded === 'photos' && (
          <View style={styles.expandedContent}>
            <View style={styles.photoGrid}>
              {photos.map((photo, i) => (
                <View key={i} style={styles.photoItem}>
                  <TouchableOpacity style={styles.removePhotoBtn} onPress={() => removePhoto(i)}>
                    <X size={18} color="#ef4444" />
                  </TouchableOpacity>
                  <Image source={{ uri: photo.uri }} style={styles.photo} />
                  <Text style={styles.timestamp}>{photo.timestamp}</Text>
                </View>
              ))}
            </View>

            <TouchableOpacity style={styles.uploadArea} onPress={pickImage}>
              <UploadCloud size={40} color="#64748b" />
              <Text style={styles.uploadText}>Upload Photo</Text>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity style={styles.fieldCard} onPress={() => toggleSection('signature')}>
          <View style={styles.iconCircle}>
            <PenTool size={22} color="#3b82f6" />
          </View>
          <View style={styles.fieldContent}>
            <Text style={styles.fieldLabel}>Staff Signature <Text style={styles.required}>*</Text></Text>

          </View>

          <ChevronDown size={20} color="#64748b" style={{ transform: [{ rotate: expanded === 'signature' ? '180deg' : '0deg' }] }} />

        </TouchableOpacity>

        {expanded === 'signature' && (
          <View style={styles.cardContent}>
            <View style={{ height: 300, backgroundColor: '#fff' }}>
              <SignatureScreen
                ref={signatureRef}
                onOK={(sig: string) => {
                  setSignatureData(sig);
                  console.log('Signature OK - length:', sig.length);
                }}
                autoClear={false}
                descriptionText="Sign here"
                clearText="Clear"
                confirmText="OK"
                androidLayerType="software"
                nestedScrollEnabled={true}
                style={{ flex: 1 }}
              />
            </View>

            <View style={styles.signatureButtons}>
              <TouchableOpacity style={styles.clearBtn} onPress={handleClearSignature}>
                <Text style={styles.btnTextWhite}>Clear</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveSignature}>
                <Text style={styles.btnTextWhite}>Save</Text>
              </TouchableOpacity>
            </View>

            {signatureData && (
              <Image source={{ uri: signatureData }} style={styles.signaturePreview} resizeMode="contain" />
            )}
          </View>
        )}
      </ScrollView>

      <View style={styles.bottomButtons}>
        <TouchableOpacity style={styles.submitButton} onPress={submitReport}>
          <Text style={styles.submitText}>Submit Report</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.goBack()}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', paddingTop: 20 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#0f172a' },
  scrollContent: { padding: 16, paddingBottom: 140 },

  fieldCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  fieldContent: { flex: 1 },
  fieldLabel: { fontSize: 15, fontWeight: '600', color: '#0f172a' },
  fieldValue: { fontSize: 15, color: '#475569' },
  fieldValuePlaceholder: { fontSize: 15, color: '#94a3b8' },

  expandedContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
    fontSize: 15,
    marginBottom: 12,
  },
  aiButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    gap: 12,
  },
  spellBtn: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: '#fee2e2',
    borderRadius: 12,
    alignItems: 'center',
  },
  aiBtn: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    alignItems: 'center',
  },
  btnText: { fontSize: 13, fontWeight: '600', color: '#1e40af' },

  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  photoItem: { width: '30%', position: 'relative' },
  photo: { width: '100%', height: 100, borderRadius: 12 },
  removePhotoBtn: {
    position: 'absolute',
    top: -10,
    right: -10,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 4,
    zIndex: 1,
  },
  timestamp: { fontSize: 11, color: '#64748b', textAlign: 'center', marginTop: 4 },
  uploadArea: {
    alignItems: 'center',
    paddingVertical: 32,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    borderStyle: 'dashed',
    borderRadius: 12,
  },
  uploadText: { marginTop: 12, color: '#64748b', fontWeight: '500' },

  sectionHeader: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  cardTitle: { flex: 1, fontSize: 16, fontWeight: '700', marginLeft: 12, color: '#0f172a' },
  cardContent: {
    backgroundColor: '#fff',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },

  signatureButtons: { flexDirection: 'row', gap: 12, marginTop: 12 },
  clearBtn: { flex: 1, backgroundColor: '#ef4444', paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  saveBtn: { flex: 1, backgroundColor: '#10b981', paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  btnTextWhite: { color: 'white', fontWeight: '600', fontSize: 15 },
  signaturePreview: { width: '100%', height: 120, marginTop: 12, borderRadius: 8 },

  bottomButtons: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    flexDirection: 'row',
    gap: 12,
  },
  submitButton: {
    flex: 1,
    backgroundColor: '#000000',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
  cancelButton: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#6b7280',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelText: { color: '#6b7280', fontSize: 16, fontWeight: '700' },

  required: { color: '#ef4444', fontWeight: 'bold' },
});