import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  Alert,
  ActivityIndicator,
  PermissionsAndroid,
  SafeAreaView,
  Modal,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import MapView, { Marker } from 'react-native-maps';
import type { RootStackParamList } from '../navigation/types';
import { pick, types, DocumentPickerResponse } from '@react-native-documents/picker';
import ImageResizer from 'react-native-image-resizer';
import { uploadFile } from '../services/authApi';
import Toast from 'react-native-toast-message';
import { isCancel } from 'axios';

import {
  Search,
  MapPin,
  Calendar,
  Clock,
  ChevronDown,
  CloudUpload,
  FileCheck,
  ArrowRight,
  Check,
  ChevronLeft,
} from 'lucide-react-native';

interface JobFormData {
  category: string;
  documents: string[];
  guardsCount: string;
  location: string;
  lat: number;
  lng: number;
  description: string;
  startDate: Date;
  startTime: Date;
  endDate: Date;
  endTime: Date;
}

interface FormErrors extends Partial<Record<keyof JobFormData, string>> {
  schedule?: string;
  // you can add more custom error keys later, e.g. documentsCount?: string;
}

interface PlacePrediction {
  place_id: string;
  description: string;
}

interface ImageAsset {
  uri?: string;
  fileName?: string;
  fileSize?: number;
  width?: number;
  height?: number;
  type?: string;
}
export default function CreateJobScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [form, setForm] = useState<JobFormData>({
    category: '',
    documents: [],
    guardsCount: '1',
    location: '',
    lat: 31.5204,
    lng: 74.3587,
    description: '',
    startDate: new Date(),
    startTime: new Date(),
    endDate: new Date(),
    endTime: new Date(new Date().setHours(new Date().getHours() + 8, 0, 0)),
  });
  const [otherCategory, setOtherCategory] = useState("");
  const [autocompleteQuery, setAutocompleteQuery] = useState('');
  const [suggestions, setSuggestions] = useState<PlacePrediction[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [showDocModal, setShowDocModal] = useState(false);
  const [showStartDate, setShowStartDate] = useState(false);
  const [showStartTime, setShowStartTime] = useState(false);
  const [showEndDate, setShowEndDate] = useState(false);
  const [showEndTime, setShowEndTime] = useState(false);
  const [otherDocument, setOtherDocument] = useState("");

  const [uploading, setUploading] = useState(false);
  const [uploadedFilePaths, setUploadedFilePaths] = useState<string[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<(ImageAsset | DocumentPickerResponse)[]>([]);
  const [touched, setTouched] = useState<Partial<Record<keyof JobFormData, boolean>>>({});
  const [errors, setErrors] = useState<FormErrors>({});

  const documentOptions = [
    { label: "Security License", value: "security_license" },
    { label: "MISC Time License", value: "misc_time_license" },
    { label: "Working With Children", value: "working_with_children" },
    { label: "First Aid", value: "first_aid" },
    { label: "CPR", value: "cpr" },
    { label: "White Card", value: "white_card" },
    { label: "Traffic Controller", value: "traffic_controller" },
    { label: "Others", value: "others" },
  ];
  const documentTypes = form.documents.map((doc) =>
    doc === "others" ? otherDocument.trim() : doc
  ).filter(Boolean);

  const mapRef = useRef<MapView>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState(false);
  const GOOGLE_PLACES_KEY = 'AIzaSyCS-DB39Kk-Z25C5GWymVGshXIALbjXPGY';

  useEffect(() => {
    const timer = setTimeout(() => setMapReady(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const getCurrentLocation = async () => {
      let hasPermission = true;
      if (Platform.OS === 'android') {
        try {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
          );
          hasPermission = granted === PermissionsAndroid.RESULTS.GRANTED;
        } catch (err) {
          console.warn('Permission error:', err);
          hasPermission = false;
        }
      }
      if (!hasPermission) {
        Alert.alert('Location Permission', 'Location access denied. Using default location (Lahore).', [{ text: 'OK' }]);
        return;
      }
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            setForm((prev) => ({ ...prev, lat: latitude, lng: longitude }));
            if (mapReady && mapRef.current) {
              mapRef.current.animateToRegion(
                { latitude, longitude, latitudeDelta: 0.022, longitudeDelta: 0.012 },
                1000
              );
            }
          },
          (error) => console.warn('Geolocation error:', error),
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
        );
      }
    };

    getCurrentLocation();
  }, [mapReady]);

  useEffect(() => {
    if (autocompleteQuery.length < 3) {
      setSuggestions([]);
      return;
    }
    const timeout = setTimeout(async () => {
      setLoadingSuggestions(true);
      try {
        const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
          autocompleteQuery
        )}&key=${GOOGLE_PLACES_KEY}&components=country:pk`;

        const res = await fetch(url);
        const json = await res.json();

        if (json.status === 'OK') {
          setSuggestions(json.predictions || []);
        } else {
          setSuggestions([]);
        }
      } catch (err) {
        setSuggestions([]);
      } finally {
        setLoadingSuggestions(false);
      }
    }, 400);

    return () => clearTimeout(timeout);
  }, [autocompleteQuery]);

  const selectSuggestion = async (prediction: PlacePrediction) => {

    setAutocompleteQuery(prediction.description);
    setSuggestions([]); // dropdown hide

    setErrors(prev => ({ ...prev, location: undefined }));



    try {
      const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${prediction.place_id}&fields=geometry&key=${GOOGLE_PLACES_KEY}`;
      const res = await fetch(detailsUrl);
      const json = await res.json();

      if (json.status === 'OK' && json.result?.geometry?.location) {
        const { lat, lng } = json.result.geometry.location;
        setForm((prev) => ({ ...prev, location: prediction.description, lat, lng }));

        if (mapReady && mapRef.current) {
          mapRef.current.animateToRegion(
            { latitude: lat, longitude: lng, latitudeDelta: 0.022, longitudeDelta: 0.012 },
            800
          );
        }
      }
    } catch (err) {
      console.error('Place details error:', err);
    }

  };
  const toggleDocument = (value: string) => {
    let updatedDocs = [...form.documents];
    if (updatedDocs.includes(value)) {
      updatedDocs = updatedDocs.filter(d => d !== value);
      if (value === "others") {
        setOtherDocument("");
      }
    } else {
      updatedDocs.push(value);
    }
    setForm({ ...form, documents: updatedDocs });
  };

  const handleUpload = async () => {
    try {
      const result = await pick({
        type: [types.allFiles],
        allowMultiSelection: true,
      });
      if (!result || result.length === 0) return;
      setUploading(true);
      const newPaths: string[] = [];
      const newFiles: (ImageAsset | DocumentPickerResponse)[] = [];
      for (const file of result) {
        let fileToUpload = file;
        if (file.type?.startsWith('image/')) {
          try {
            const resized = await ImageResizer.createResizedImage(
              file.uri,
              1024,
              1024,
              'JPEG',
              75,
              0
            );
            fileToUpload = {
              ...file,
              uri: resized.uri,
              name: file.name || 'compressed_image.jpg',
              type: 'image/jpeg',
            };
          } catch (e) {
            console.warn('Compression failed:', e);
          }
        }
        const uploaded = await uploadFile(fileToUpload);
        const filePath = uploaded?.url || uploaded?.path || uploaded?.file || '';
        if (filePath) {
          newPaths.push(filePath);
          newFiles.push(file);
        }
      }

      if (newPaths.length > 0) {
        setUploadedFilePaths((prev) => [...prev, ...newPaths]);
        setSelectedFiles((prev) => [...prev, ...newFiles]);
        Toast.show({
          type: 'success',
          text1: `${newPaths.length} File${newPaths.length !== 1 ? 's' : ''} Uploaded`,
          position: 'bottom',
        });
      }
    } catch (err: any) {
      if (isCancel(err)) return;
      Toast.show({
        type: 'error',
        text1: 'Upload Failed',
        text2: err?.message || 'Try again',
        position: 'bottom',
      });
    } finally {
      setUploading(false);
    }
  };





const shiftDurationHours = useMemo(() => {
  const start = new Date(form.startDate);
  start.setHours(form.startTime.getHours(), form.startTime.getMinutes(), 0, 0);

  const end = new Date(form.endDate);
  end.setHours(form.endTime.getHours(), form.endTime.getMinutes(), 0, 0);

  if (end <= start) return 0;

  return (end.getTime() - start.getTime()) / (1000 * 60 * 60);
}, [form.startDate, form.startTime, form.endDate, form.endTime]);

const shiftDurationText = shiftDurationHours.toFixed(2);

// 2. Then use them in effects / render
useEffect(() => {
  let scheduleError: string | undefined;

  if (shiftDurationHours > 0) {
    if (shiftDurationHours < 4) {
      scheduleError = 'Minimum shift duration is 4 hours';
    } else if (shiftDurationHours > 12) {
      scheduleError = 'Maximum shift duration is 12 hours';
    }
  }

  setErrors((prev) => ({
    ...prev,
    schedule: scheduleError,
  }));
}, [shiftDurationHours]);



  const guardsCountNum = Math.max(1, parseInt(form.guardsCount || '1', 10));
  const totalManHoursText = (shiftDurationHours * guardsCountNum).toFixed(2);

  const validateAndNext = () => {
    const newErrors: FormErrors = {};
    if (!form.category) newErrors.category = 'Please select a job category';
    if (form.category === "others" && !otherCategory.trim()) {
      newErrors.category = "Please enter job category";
    }
    if (!form.description.trim()) newErrors.description = 'Description is required';
    if (!form.location.trim()) newErrors.location = 'Location is required';
    if (parseInt(form.guardsCount || '0', 10) < 1) newErrors.guardsCount = 'At least 1 guard required';

    const hours = shiftDurationHours;

    if (hours < 4) {
      newErrors.schedule = 'Minimum shift duration is 4 hours';
    }
    if (hours > 12) {
      newErrors.schedule = 'Maximum shift duration is 12 hours';
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      Alert.alert('Incomplete Form', 'Please fill all required fields');
      return;
    }
    navigation.navigate('ReviewConfirm', {
      jobData: {
        category: form.category,
        guardsCount: parseInt(form.guardsCount, 10),
        location: form.location || 'Not specified',
        lat: form.lat,
        lng: form.lng,
        description: form.description,
        startDate: form.startDate,
        startTime: form.startTime,
        endDate: form.endDate,
        endTime: form.endTime,
      },
      uploadedFileUrls: uploadedFilePaths,

      selectedDocuments: documentTypes,
    });
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBox} onPress={() => navigation.goBack()}>
            <ChevronLeft size={28} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Job</Text>
          <View style={{ width: 28 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Job Location</Text>
            {mapReady && !mapError ? (
              <MapView
                ref={mapRef}
                style={styles.map}
                initialRegion={{
                  latitude: form.lat,
                  longitude: form.lng,
                  latitudeDelta: 0.022,
                  longitudeDelta: 0.012,
                }}
                showsUserLocation
                showsMyLocationButton
              >
                <Marker
                  coordinate={{ latitude: form.lat, longitude: form.lng }}
                  title={form.location || 'Current / Selected Location'}
                  pinColor="#2563EB"
                  draggable
                  onDragEnd={(e) => {
                    const { latitude, longitude } = e.nativeEvent.coordinate;
                    setForm((prev) => ({ ...prev, lat: latitude, lng: longitude }));
                  }}
                />
              </MapView>
            ) : (
              <View style={styles.mapPlaceholder}>
                {mapError ? (
                  <Text style={{ color: '#ef4444', fontSize: 14, textAlign: 'center' }}>
                    Map failed to load
                  </Text>
                ) : (
                  <>
                    <ActivityIndicator size="large" color="#2563EB" />
                    <Text style={{ color: '#64748b', marginTop: 12 }}>Loading map...</Text>
                  </>
                )}
              </View>
            )}

            <View style={styles.inputWrapper}>
              <Search size={20} color="#64748b" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Search address or place..."
                placeholderTextColor="#9CA3AF"
                value={autocompleteQuery}
                onChangeText={(text) => {
                  setAutocompleteQuery(text);

                  if (text.trim()) {
                    setErrors(prev => ({ ...prev, location: undefined }));
                  }
                }}
                autoCorrect={false}
                autoCapitalize="none"
              />
            </View>

            {loadingSuggestions && <ActivityIndicator color="#2563EB" style={{ marginTop: 12 }} />}

            {suggestions.slice(0, 5).map((item) => (
              <TouchableOpacity key={item.place_id} style={styles.suggestionItem} onPress={() => selectSuggestion(item)}>
                <MapPin size={18} color="#64748b" style={{ marginRight: 12 }} />
                <Text style={styles.suggestionText} numberOfLines={1}>
                  {item.description}
                </Text>
              </TouchableOpacity>
            ))}

            {errors.location && <Text style={styles.errorText}>{errors.location}</Text>}
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Schedule</Text>

            <View style={styles.timeGroup}>
              <Text style={styles.timeLabel}>Start Time</Text>
              <View style={styles.timeRow}>
                <TouchableOpacity style={styles.timeButton} onPress={() => setShowStartDate(true)}>
                  <Text>{form.startDate.toLocaleDateString('en-GB')}</Text>
                  <Calendar size={20} color="#64748b" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.timeButton} onPress={() => setShowStartTime(true)}>
                  <Text>{form.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}</Text>
                  <Clock size={20} color="#64748b" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.timeGroup}>
              <Text style={styles.timeLabel}>End Time</Text>
              <View style={styles.timeRow}>
                <TouchableOpacity style={styles.timeButton} onPress={() => setShowEndDate(true)}>
                  <Text>{form.endDate.toLocaleDateString('en-GB')}</Text>
                  <Calendar size={20} color="#64748b" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.timeButton} onPress={() => setShowEndTime(true)}>
                  <Text>{form.endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}</Text>
                  <Clock size={20} color="#64748b" />
                </TouchableOpacity>
              </View>
            </View>

            <Text style={styles.totalHoursText}>
              Shift duration: {shiftDurationText} hours
            </Text>
            {/* <Text style={[styles.totalHoursText, { marginTop: 8, fontWeight: '600' }]}>
    Total guard-hours: {totalManHoursText} ({shiftDurationText} × {guardsCountNum})
  </Text> */}
            {errors.schedule && (
              <Text style={[styles.errorText, { marginTop: 8, fontSize: 14 }]}>
                {errors.schedule}
              </Text>
            )}
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Job Type</Text>

            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={form.category}
                onValueChange={(value) => {
                  setForm(prev => ({ ...prev, category: value }));

                  setErrors(prev => ({ ...prev, category: undefined }));

                  if (value !== "others") {
                    setOtherCategory("");
                  }
                }}
                style={styles.picker}
                dropdownIconColor="#64748b"
              >
                <Picker.Item label="Select job category" value="" color="#94a3b8" />
                <Picker.Item label="Event Security" value="event-security" />
                <Picker.Item label="Static Security Guard" value="static-security" />
                <Picker.Item label="Corporate Security" value="corporate-security" />
                <Picker.Item label="Site Patrol Security" value="site-patrol" />
                <Picker.Item label="Others" value="others" />
              </Picker>
            </View>

            {form.category === "others" && (
              <TextInput
                style={[
                  styles.input,
                  {
                    marginTop: 12,
                    borderWidth: 1,
                    borderColor: '#e2e8f0',
                    borderRadius: 10,
                    backgroundColor: '#fff',
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    fontSize: 16,
                  },
                ]}
                placeholder="Enter custom job category"
                placeholderTextColor="#9CA3AF"
                value={otherCategory}
                onChangeText={setOtherCategory}
              />
            )}

            {errors.category && (
              <Text style={styles.errorText}>{errors.category}</Text>
            )}
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Required Documents</Text>
            <TouchableOpacity style={styles.dropdownButton} onPress={() => setShowDocModal(true)}>
              <Text style={styles.dropdownButtonText}>
                {form.documents.length > 0
                  ? form.documents
                    .map(doc => doc === "others" ? otherDocument : doc)
                    .filter(Boolean)
                    .join(", ")
                  : 'Select required documents'}
              </Text>
              <ChevronDown size={20} color="#64748b" />
            </TouchableOpacity>
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Job Description</Text>
            <TextInput
              style={styles.textarea}
              multiline
              numberOfLines={6}
              placeholder="Describe the responsibilities, requirements, dress code, special instructions..."
              placeholderTextColor="#9CA3AF"
              value={form.description}
              onChangeText={(text) => {
                setForm(prev => ({ ...prev, description: text }));

                if (text.trim()) {
                  setErrors(prev => ({ ...prev, description: undefined }));
                }
              }}
              textAlignVertical="top"
            />
            {errors.description && <Text style={styles.errorText}>{errors.description}</Text>}
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Attachments (optional)</Text>
            <Text style={styles.subtitle}>You can select multiple files/images</Text>

            <TouchableOpacity style={styles.uploadButton} onPress={handleUpload} disabled={uploading}>
              {uploading ? (
                <ActivityIndicator color="#2563EB" />
              ) : (
                <>
                  <CloudUpload size={20} color="#2563EB" />
                  <Text style={styles.uploadText}>Upload Files</Text>
                </>
              )}
            </TouchableOpacity>

            {uploadedFilePaths.length > 0 && (
              <View style={styles.fileList}>
                {uploadedFilePaths.map((path, index) => (
                  <View key={index} style={styles.fileItem}>
                    <FileCheck size={20} color="#2563EB" />
                    <Text style={styles.fileName} numberOfLines={1}>
                      {path.split('/').pop() || `File ${index + 1}`}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          <View style={styles.sectionCard}>
            <View style={styles.guardsRow}>
              <Text style={styles.label}>Number of Guards</Text>
              <TextInput
                style={styles.guardsInput}
                keyboardType="numeric"
                value={form.guardsCount}
                onChangeText={(text) => {
                  if (/^\d*$/.test(text)) {
                    setForm(prev => ({ ...prev, guardsCount: text }));

                    if (parseInt(text || "0", 10) >= 1) {
                      setErrors(prev => ({ ...prev, guardsCount: undefined }));
                    }
                  }
                }}
              />
            </View>

            {errors.guardsCount && <Text style={styles.errorText}>{errors.guardsCount}</Text>}

            <Text style={styles.totalHoursBottom}>
              Total guard hours:{' '}
              <Text style={{ fontWeight: 'bold', color: '#2563EB' }}>
                {totalManHoursText}
              </Text>
              {' '}({shiftDurationText} h × {guardsCountNum} guards)
            </Text>

            {/* Optional: duplicate the schedule error here if you want double visibility */}
            {errors.schedule && (
              <Text style={[styles.errorText, { textAlign: 'center', marginTop: 8 }]}>
                {errors.schedule}
              </Text>
            )}
          </View>

          <View style={{ height: 140 }} />
        </ScrollView>

        <TouchableOpacity style={styles.fab} onPress={validateAndNext}>
          <Text style={styles.fabText}>Next</Text>
          <ArrowRight size={20} color="#fff" style={{ marginLeft: 8 }} />
        </TouchableOpacity>

        {showStartDate && (
          <DateTimePicker
            value={form.startDate}
            mode="date"
            onChange={(e, date) => {
              setShowStartDate(false);
              if (date) setForm((p) => ({ ...p, startDate: date }));
            }}
          />
        )}
        {showStartTime && (
          <DateTimePicker
            value={form.startTime}
            mode="time"
            onChange={(e, time) => {
              setShowStartTime(false);
              if (time) setForm((p) => ({ ...p, startTime: time }));
            }}
          />
        )}
        {showEndDate && (
          <DateTimePicker
            value={form.endDate}
            mode="date"
            onChange={(e, date) => {
              setShowEndDate(false);
              if (date) setForm((p) => ({ ...p, endDate: date }));
            }}
          />
        )}
        {showEndTime && (
          <DateTimePicker
            value={form.endTime}
            mode="time"
            onChange={(e, time) => {
              setShowEndTime(false);
              if (time) setForm((p) => ({ ...p, endTime: time }));
            }}
          />
        )}
      </KeyboardAvoidingView>

      <Modal visible={showDocModal} animationType="slide" transparent onRequestClose={() => setShowDocModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Required Documents</Text>
            <ScrollView>
              {documentOptions.map((item) => {
                const isSelected = form.documents.includes(item.value);

                return (
                  <TouchableOpacity
                    key={item.value}
                    style={styles.checkboxRow}
                    onPress={() => toggleDocument(item.value)}
                  >
                    <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                      {isSelected && <Check size={16} color="#fff" />}
                    </View>
                    <Text style={styles.checkboxLabel}>{item.label}</Text>
                  </TouchableOpacity>
                );
              })}

              {form.documents.includes("others") && (
                <TextInput
                  placeholder="Enter document name"
                  placeholderTextColor="#9CA3AF"
                  value={otherDocument}
                  onChangeText={setOtherDocument}
                  style={{
                    borderWidth: 1,
                    borderColor: "#ccc",
                    borderRadius: 8,
                    padding: 10,
                    marginTop: 10,
                  }}
                />
              )}
            </ScrollView>

            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => {
                let updatedDocs = [...form.documents];
                setForm({ ...form, documents: updatedDocs });
                setShowDocModal(false);
              }}
            >
              <Text style={styles.modalCloseText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', paddingTop: 20 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,

  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#121927',
  },
  scrollContent: { padding: 16, paddingBottom: 180 },

  sectionCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 12 },
  subtitle: { color: '#64748b', fontSize: 13, marginBottom: 12 },

  checkboxRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#2563EB',

    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  checkboxSelected: { backgroundColor: '#2563EB' },
  checkboxLabel: { fontSize: 15, color: '#1e293b' },

  dropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  dropdownButtonText: { fontSize: 15, color: '#111827', flex: 1 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', paddingHorizontal: 20 },
  modalContainer: { backgroundColor: 'white', borderRadius: 16, padding: 16, maxHeight: '80%' },
  modalTitle: { fontSize: 18, fontWeight: '600', marginBottom: 12 },
  modalCloseButton: {
    marginTop: 12,
    backgroundColor: '#2563EB',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalCloseText: { color: '#fff', fontWeight: '600', fontSize: 16 },

  map: { height: 220, borderRadius: 12, marginBottom: 12 },
  mapPlaceholder: { height: 220, backgroundColor: '#e2e8f0', borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  backBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 7,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  inputIcon: { marginRight: 8 },
  // input: { flex: 1, fontSize: 16, paddingVertical: 12 },
  suggestionItem: { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  suggestionText: { flex: 1, fontSize: 15 },
  timeGroup: { marginBottom: 20 },
  timeLabel: { fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 8 },
  timeRow: { flexDirection: 'row', gap: 12 },
  timeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    overflow: 'hidden'
  },

  input: {
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff'
  },
  // pickerWrapper: {
  //   flexDirection: 'row',
  //   alignItems: 'center',
  //   backgroundColor: '#f8fafc',
  //   borderRadius: 12,
  //   borderWidth: 1,
  //   borderColor: '#e2e8f0',
  //   overflow: 'hidden',
  // },
  pickerIcon: { marginLeft: 12, marginRight: 8 },
  picker: { flex: 1, height: 50, color: '#111827' },
  textarea: {
    minHeight: 120,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    textAlignVertical: 'top',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 14,
    gap: 10,
  },
  uploadText: { color: '#2563EB', fontSize: 16, fontWeight: '600' },
  fileList: { marginTop: 12, gap: 8 },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  fileName: { flex: 1, marginLeft: 10, fontSize: 14 },
  guardsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  label: { fontSize: 15, color: '#64748b', fontWeight: '500' },
  guardsInput: {
    width: 100,
    textAlign: 'center',
    fontSize: 22,
    fontWeight: 'bold',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingVertical: 8,
  },
  totalHoursText: { fontSize: 15, color: '#475569', textAlign: 'center', marginTop: 8 },
  totalHoursBottom: { fontSize: 16, color: '#475569', marginTop: 12 },
  fab: {
    position: 'absolute',
    bottom: 32,
    right: 24,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 50,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  fabText: { color: 'white', fontSize: 17, fontWeight: 'bold' },
  errorText: { color: '#ef4444', fontSize: 13, marginTop: 6, marginLeft: 4 },
});