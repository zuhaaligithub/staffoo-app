


import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Dimensions,
  Image,
  ActivityIndicator,
  FlatList,
  Linking,
} from 'react-native';
import {
  Eye,
  Pencil,
  ArrowLeft,
  X,
  FileText,
  CloudUpload,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Check,
  ExternalLink,
} from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { getUserProfile, uploadFile } from '../services/authApi';
import { launchImageLibrary } from 'react-native-image-picker';
import LinearGradient from 'react-native-linear-gradient';

const { width } = Dimensions.get('window');

const BASE_URL = 'https://apis.staffoo.com.au/api';
const FILE_BASE_URL = 'https://apis.staffoo.com.au/staff_documents/';

type Props = { navigation: any };

type Document = {
  id: number;
  document_name: string;
  document_no?: string;
  document_expiry?: string;
  file?: string;
  document_type: string;
};

const THEME = {
  background: '#0B132B',
  cardBg: '#1C2541',
  accent: '#366bf0',
  teal: '#89E7D0',
  textLight: '#FFFFFF',
  textMuted: '#6C7A89',
  border: 'rgba(255, 255, 255, 0.1)',
};

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const DOC_NO_MAX = 20;

const ALLOWED_FILE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/jpg',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const isImageFile = (fileStr?: string | null, mimeType?: string | null): boolean => {
  if (!fileStr && !mimeType) return false;
  // Check mime type first (reliable for local picker files)
  if (mimeType && mimeType.startsWith('image/')) return true;
  if (!fileStr) return false;
  // Fallback: check extension in URL/filename
  return /\.(jpg|jpeg|png|gif|webp)$/i.test(fileStr);
};

const getFileUrl = (file?: string | null): string | null => {
  if (!file) return null;
  // Already a full URL (used for local preview before upload)
  if (file.startsWith('http') || file.startsWith('file://')) return file;
  return `${FILE_BASE_URL}${file}`;
};

const LazyImage = ({ uri, style }: { uri: string; style: any }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    // Safety: If it takes more than 10 seconds, hide the loader
    const timer = setTimeout(() => setLoading(false), 10000);
    return () => clearTimeout(timer);
  }, []);

  if (error) return null;

  return (
    <View style={[style, { justifyContent: 'center', alignItems: 'center' }]}>
      <Image
        source={{ uri, cache: 'force-cache' }}
        style={[style, { position: 'absolute', top: 0, left: 0 }]}
        resizeMode="cover"
        onLoadStart={() => { setLoading(true); setError(false); }}
        onLoad={() => setLoading(false)}
        onError={() => { setLoading(false); setError(true); }}
      />
      {loading && <ActivityIndicator color={THEME.teal} size="small" />}
    </View>
  );
};

export default function DocumentsScreen({ navigation }: Props) {
  const [modalVisible, setModalVisible] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingDocId, setEditingDocId] = useState<number | null>(null);
  const [fileError, setFileError] = useState('');
  const [docNumberError, setDocNumberError] = useState('');
  const [expiryError, setExpiryError] = useState('');
  const [documentNumber, setDocumentNumber] = useState('');
  const [expirationDate, setExpirationDate] = useState<Date | null>(null);
  const [showInlineCalendar, setShowInlineCalendar] = useState(false);
  const [currentCalendarMonth, setCurrentCalendarMonth] = useState(new Date());

  const [addDocNumber, setAddDocNumber] = useState(false);
  const [setExpiration, setSetExpiration] = useState(false);

  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [uploadedFilePath, setUploadedFilePath] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [documents, setDocuments] = useState<Document[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [userId, setUserId] = useState<string | number | null>(null);

  const [originalDocName, setOriginalDocName] = useState('');
  const [originalDocType, setOriginalDocType] = useState('');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const userStr = await AsyncStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        const id = user?.id;
        setUserId(id);
        if (id) {
          const profile = await getUserProfile(id);
          if (profile?.success && profile?.data?.documents) {
            setDocuments(profile.data.documents);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load documents:', err);
    } finally {
      setLoadingDocs(false);
    }
  };

  const resetForm = () => {
    setSelectedFile(null);
    setUploadedFilePath(null);
    setDocumentNumber('');
    setExpirationDate(null);
    setAddDocNumber(false);
    setSetExpiration(false);
    setShowInlineCalendar(false);
    setCurrentCalendarMonth(new Date());
    setFileError('');
    setDocNumberError('');
    setExpiryError('');
  };

  const handleOpenModal = (doc?: Document) => {
    resetForm();

    if (doc) {
      setIsEditMode(true);
      setEditingDocId(doc.id);
      setOriginalDocName(doc.document_name || '');
      setOriginalDocType(doc.document_type || '');
      setDocumentNumber(doc.document_no?.toUpperCase() || '');
      setAddDocNumber(!!doc.document_no);

      if (doc.document_expiry) {
        const [year, month, day] = doc.document_expiry.split('-').map(Number);
        const parsedDate = new Date(year, month - 1, day);
        setExpirationDate(parsedDate);
        setSetExpiration(true);
        setCurrentCalendarMonth(parsedDate);
        setShowInlineCalendar(true);
      } else {
        setSetExpiration(false);
      }

      // Set the existing server file path for preview
      if (doc.file) {
        setUploadedFilePath(doc.file); // store just the filename; getFileUrl handles the prefix
      }
    } else {
      setIsEditMode(false);
      setEditingDocId(null);
      setAddDocNumber(true);
      setSetExpiration(true);
      setShowInlineCalendar(true);
    }
    setModalVisible(true);
  };

  // Open file in browser (PDF, DOC, image — all work with Linking)
  const openFile = async (file?: string | null) => {
    const url = getFileUrl(file);
    if (!url) return;
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        Toast.show({ type: 'error', text1: 'Cannot open file', position: 'bottom' });
      }
    } catch (error) {
      console.log('Error opening file:', error);
      Toast.show({ type: 'error', text1: 'Failed to open file', position: 'bottom' });
    }
  };

  const handleUpload = async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'mixed',
        quality: 0.8,
        selectionLimit: 1,
      });

      if (result.didCancel || !result.assets?.[0]) return;

      const asset = result.assets[0];

      if (!asset.type || !ALLOWED_FILE_TYPES.includes(asset.type)) {
        Toast.show({ type: 'error', text1: 'Unsupported file type', position: 'bottom' });
        return;
      }

      if (asset.fileSize && asset.fileSize > MAX_FILE_SIZE) {
        Toast.show({ type: 'error', text1: 'File too large (Max 5MB)', position: 'bottom' });
        return;
      }

      const file = {
        uri: asset.uri!,
        type: asset.type || 'image/jpeg',
        name: asset.fileName || `file_${Date.now()}`,
      };

      setSelectedFile(file);
      setFileError('');
      setUploading(true);

      const uploaded = await uploadFile(file);
      const filePath = uploaded?.url || uploaded?.path || uploaded?.file || '';
      setUploadedFilePath(filePath);

      Toast.show({ type: 'success', text1: 'File uploaded successfully', position: 'bottom' });
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Upload failed', position: 'bottom' });
    } finally {
      setUploading(false);
    }
  };

  const toggleExpiration = () => {
    const newValue = !setExpiration;
    setSetExpiration(newValue);
    setShowInlineCalendar(newValue);
    if (newValue) {
      const today = new Date();
      setExpirationDate(today);
      setCurrentCalendarMonth(today);
    } else {
      setExpirationDate(null);
    }
  };

  const handleSave = async () => {
    let hasError = false;
    setFileError('');
    setDocNumberError('');
    setExpiryError('');

    if (!selectedFile && !uploadedFilePath) {
      setFileError('Please upload a file');
      hasError = true;
    }
    if (!documentNumber.trim()) {
      setDocNumberError('Please fill the document number');
      hasError = true;
    }
    if (!expirationDate) {
      setExpiryError('Please select expiration date');
      hasError = true;
    }

    if (hasError) {
      Toast.show({ type: 'error', text1: 'Please fill all mandatory fields', position: 'bottom' });
      return;
    }

    if (!expirationDate) return;

    setSaving(true);

    try {
      // uploadedFilePath could be a full URL (after upload) or just a filename (existing doc)
      let fileName = '';
      if (uploadedFilePath) {
        fileName = uploadedFilePath.split('/').pop() || uploadedFilePath;
      } else if (selectedFile?.name) {
        fileName = selectedFile.name;
      } else {
        fileName = 'unknown_file';
      }

      const year = expirationDate.getFullYear();
      const month = String(expirationDate.getMonth() + 1).padStart(2, '0');
      const day = String(expirationDate.getDate()).padStart(2, '0');
      const expDate = `${year}-${month}-${day}`;

      const payload: any = {
        user_id: userId,
        no: true,
        exp: true,
        document_no: documentNumber.trim(),
        document_expiry: expDate,
        file: fileName,
        document_type: isEditMode
          ? originalDocType
          : fileName.split('.')[0].toLowerCase(),
        document_name: isEditMode
          ? originalDocName
          : fileName.split('.')[0].replace(/[-_]/g, ' ').toUpperCase(),
      };

      const token = await AsyncStorage.getItem('@auth_token');
      let endpoint = `${BASE_URL}/guard-add-documents`;

      if (isEditMode && editingDocId) {
        endpoint = `${BASE_URL}/guard-update-documents`;
        payload.id = editingDocId;
      }

      await axios.post(endpoint, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      Toast.show({
        type: 'success',
        text1: isEditMode ? 'Document Updated' : 'Document Added',
        position: 'bottom',
      });

      setModalVisible(false);
      loadData();
    } catch (err: any) {
      console.error(err);
      Toast.show({ type: 'error', text1: 'Save Failed', position: 'bottom' });
    } finally {
      setSaving(false);
    }
  };

  const calendarGrid = useMemo(() => {
    const year = currentCalendarMonth.getFullYear();
    const month = currentCalendarMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: (Date | null)[] = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
    return cells;
  }, [currentCalendarMonth]);

  const changeMonth = (direction: 'prev' | 'next') => {
    setCurrentCalendarMonth(prev => {
      const newMonth = new Date(prev);
      newMonth.setMonth(prev.getMonth() + (direction === 'next' ? 1 : -1));
      return newMonth;
    });
  };
  const getCleanFileName = (file?: string | null) => {
    if (!file) return 'No File';
    return file.split('/').pop(); // Removes directory paths
  };

  const renderModalPreview = () => {
    const fileUri = selectedFile?.uri || (uploadedFilePath ? getFileUrl(uploadedFilePath) : null);
    const fileMime = selectedFile?.type || null;
    const fileName = selectedFile?.name || uploadedFilePath?.split('/').pop() || 'Document';

    // Pass both URI and mime type for accurate detection
    const isImage = isImageFile(fileUri, fileMime);

    if (!fileUri) return null;

    if (isImage) {
      return (
        <View style={styles.imagePlaceholder}>
          <LazyImage uri={fileUri} style={styles.previewImage} />
        </View>
      );
    }

    // Non-image (PDF / DOC / DOCX) — show a clear document preview card
    return (
      <View style={styles.docPreviewCard}>
        <View style={styles.docPreviewIconWrap}>
          <FileText size={48} color={THEME.teal} />
        </View>
        <Text style={styles.docPreviewLabel} numberOfLines={2}>
          {fileName}
        </Text>
        <TouchableOpacity
          style={styles.viewDocButton}
          onPress={() => openFile(fileUri)}
          activeOpacity={0.8}
        >
          <ExternalLink size={16} color="#fff" style={{ marginRight: 6 }} />
          <Text style={styles.viewDocButtonText}>OPEN DOCUMENT</Text>
        </TouchableOpacity>
      </View>
    );
  };


  const getFileExtension = (file?: string | null): string => {
    if (!file) return '';
    const ext = file.split('.').pop()?.toUpperCase() || '';
    return ext;
  };

  const renderDocumentCard = ({ item }: { item: Document }) => {
    const ext = getFileExtension(item.file);
    const isImg = isImageFile(item.file);

    return (
      <LinearGradient colors={['#262b34', '#131823']} style={styles.cardWrapper}>
        <View style={styles.docCard}>
          <View style={styles.docTop}>
            <View style={styles.docIconBox}>
              <FileText size={24} color={THEME.teal} />
            </View>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={styles.docTitle}>
                {item.document_name?.toUpperCase() || 'DOCUMENT'}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                {!!ext && (
                  <View style={styles.fileBadge}>
                    <Text style={styles.fileBadgeText}>{ext}</Text>
                  </View>
                )}
                <Text style={styles.fileNameText} numberOfLines={1}>
                  {getCleanFileName(item.file)}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Document No</Text>
            <Text style={styles.infoValue}>{item.document_no?.toUpperCase() || 'N/A'}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Expiry</Text>
            <Text style={styles.infoValue}>{item.document_expiry || 'No expiry'}</Text>
          </View>

          {/* Image inline preview */}
          {!!item.file && isImg && (
            <LazyImage
              uri={getFileUrl(item.file)!}
              style={styles.cardImagePreview}
            />
          )}

          {/* Action Button — works for both images and docs */}
          {!!item.file && (
            <TouchableOpacity
              style={styles.cardActionBtn}
              onPress={() => openFile(item.file)}
            >
              <ExternalLink size={16} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.cardActionText}>
                {isImg ? 'VIEW IMAGE' : 'VIEW / DOWNLOAD'}
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.editBtn} onPress={() => handleOpenModal(item)}>
            <Pencil size={18} color={THEME.textMuted} />
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={THEME.background} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ArrowLeft size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Documents</Text>
      </View>

      {loadingDocs ? (
        <ActivityIndicator size="large" color={THEME.teal} style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={documents}
          keyExtractor={item => item.id.toString()}
          renderItem={renderDocumentCard}
          contentContainerStyle={{ padding: 16 }}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No documents found</Text>
          }
        />
      )}

      {/* ── Main Modal ── */}
      <Modal
        animationType="slide"
        transparent
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {isEditMode ? 'EDIT DOCUMENT' : 'UPLOAD DOCUMENT'}
              </Text>
              <TouchableOpacity
                onPress={() => { setModalVisible(false); resetForm(); }}
              >
                <X size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* ── File preview + upload ── */}
              <View style={styles.imageUploadArea}>
                {renderModalPreview()}

                <TouchableOpacity
                  style={styles.uploadTriggerButton}
                  onPress={handleUpload}
                  disabled={uploading}
                >
                  {uploading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <CloudUpload size={22} color="#fff" style={{ marginRight: 8 }} />
                      <Text style={styles.uploadTriggerText}>
                        {selectedFile || uploadedFilePath
                          ? 'REPLACE FILE'
                          : 'UPLOAD FILE (IMAGE, PDF, DOC) *'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>

                {fileError ? (
                  <Text style={styles.errorText}>{fileError}</Text>
                ) : null}
              </View>

              {/* ── Checkboxes ── */}
              <View style={styles.checkboxGroup}>
                <TouchableOpacity
                  style={styles.checkboxRow}
                  onPress={() => setAddDocNumber(!addDocNumber)}
                >
                  <View style={[styles.checkbox, addDocNumber && styles.checkboxChecked]}>
                    {addDocNumber && <Check size={14} color="#000" />}
                  </View>
                  <Text style={styles.checkboxLabel}>ADD DOCUMENT NUMBER *</Text>
                </TouchableOpacity>

                {addDocNumber && (
                  <TextInput
                    style={styles.inputBox}
                    placeholder="Enter numbers only (e.g. 65656577)"
                    placeholderTextColor={THEME.textMuted}
                    value={documentNumber}
                    keyboardType="numeric"
                    maxLength={20}
                    onChangeText={text => {
                      const value = text.replace(/[^0-9]/g, '').slice(0, DOC_NO_MAX);
                      setDocumentNumber(value);
                      if (value.trim()) setDocNumberError('');
                    }}
                  />
                )}
                {docNumberError ? (
                  <Text style={styles.errorText}>{docNumberError}</Text>
                ) : null}

                <TouchableOpacity style={styles.checkboxRow} onPress={toggleExpiration}>
                  <View style={[styles.checkbox, setExpiration && styles.checkboxChecked]}>
                    {setExpiration && <Check size={14} color="#000" />}
                  </View>
                  <Text style={styles.checkboxLabel}>SET EXPIRATION DATE *</Text>
                </TouchableOpacity>
                {expiryError ? (
                  <Text style={styles.errorText}>{expiryError}</Text>
                ) : null}

                {setExpiration && (
                  <View style={styles.dateSection}>
                    <TouchableOpacity
                      style={styles.dateButton}
                      onPress={() => setShowInlineCalendar(!showInlineCalendar)}
                    >
                      <Text style={styles.dateText}>
                        {expirationDate
                          ? expirationDate.toLocaleDateString('en-GB')
                          : 'Select Date'}
                      </Text>
                      <CalendarIcon size={20} color={THEME.teal} />
                    </TouchableOpacity>

                    {showInlineCalendar && (
                      <View style={styles.inlineCalendar}>
                        <View style={styles.calendarHeaderRow}>
                          <Text style={styles.calendarMonthHeading}>
                            {currentCalendarMonth
                              .toLocaleString('default', { month: 'long', year: 'numeric' })
                              .toUpperCase()}
                          </Text>
                          <View style={{ flexDirection: 'row', gap: 12 }}>
                            <TouchableOpacity
                              onPress={() => changeMonth('prev')}
                              style={styles.monthArrow}
                            >
                              <ChevronLeft size={20} color="#111" />
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => changeMonth('next')}
                              style={styles.monthArrow}
                            >
                              <ChevronRight size={20} color="#111" />
                            </TouchableOpacity>
                          </View>
                        </View>

                        <View style={styles.weekDaysRow}>
                          {['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'].map((d, i) => (
                            <Text key={i} style={styles.weekDayLabel}>{d}</Text>
                          ))}
                        </View>

                        <View style={styles.daysGrid}>
                          {calendarGrid.map((date, idx) => {
                            if (!date) return <View key={idx} style={styles.dayCell} />;

                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            const targetDate = new Date(date);
                            targetDate.setHours(0, 0, 0, 0);
                            const isPast = targetDate < today;
                            const isSelected =
                              expirationDate &&
                              date.toDateString() === expirationDate.toDateString();

                            return (
                              <TouchableOpacity
                                key={idx}
                                disabled={isPast}
                                style={[
                                  styles.dayCell,
                                  isSelected && styles.dayCellSelected,
                                  isPast && styles.dayCellDisabled,
                                ]}
                                onPress={() => {
                                  if (isPast) return;
                                  setExpirationDate(date);
                                  setExpiryError('');
                                  setShowInlineCalendar(false);
                                }}
                              >
                                <Text
                                  style={[
                                    styles.dayText,
                                    isSelected && styles.dayTextSelected,
                                    isPast && styles.dayTextDisabled,
                                  ]}
                                >
                                  {date.getDate()}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </View>
                    )}
                  </View>
                )}
              </View>
            </ScrollView>

            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={styles.saveButtonText}>
                  {isEditMode ? 'UPDATE' : 'SAVE'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111111',
    paddingTop: 25,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginLeft: '25%',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 50,
    color: THEME.textMuted,
    fontSize: 16,
  },

  // ── Cards ──
  cardWrapper: { borderRadius: 16, marginBottom: 14, overflow: 'hidden' },
  docCard: { padding: 16 },
  docTop: { flexDirection: 'row', alignItems: 'center' },
  docIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(137,231,208,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  docTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: 8 },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  divider: { height: 1, backgroundColor: THEME.border, marginVertical: 12 },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  infoLabel: { color: '#AAB4C0', fontSize: 13 },
  infoValue: { color: '#fff', fontWeight: '600' },

  // ── Modal ──
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#0e0e0e',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '92%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderColor: THEME.border,
  },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  modalBody: { padding: 20 },
  errorText: {
    color: '#ff4d4f',
    fontSize: 12,
    marginTop: 6,
    marginLeft: 4,
    fontWeight: '500',
  },

  // ── File preview ──
  imageUploadArea: { alignItems: 'center', marginBottom: 20 },
  imagePlaceholder: {
    width: '100%',
    height: 200,
    borderRadius: 16,
    backgroundColor: THEME.cardBg,
    overflow: 'hidden',
    marginBottom: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewImage: { width: '100%', height: '100%' },

  // ── Doc (non-image) preview card ──
  docPreviewCard: {
    width: '100%',
    borderRadius: 16,
    backgroundColor: THEME.cardBg,
    borderWidth: 1,
    borderColor: THEME.border,
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  docPreviewIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: 'rgba(137,231,208,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  docPreviewLabel: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    maxWidth: '80%',
  },


  // ── View document button (inside modal preview) ──
  viewDocButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.accent,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 4,
  },
  viewDocButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },

  uploadTriggerButton: {
    width: '100%',
    height: 56,
    backgroundColor: THEME.accent,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadTriggerText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  // ── Checkboxes ──
  checkboxGroup: { gap: 16 },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: THEME.textMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: { backgroundColor: THEME.teal, borderColor: THEME.teal },
  checkboxLabel: { color: '#fff', fontSize: 15, fontWeight: '600' },

  inputBox: {
    backgroundColor: THEME.cardBg,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 12,
    padding: 14,
    color: '#fff',
    fontSize: 15,
  },

  // ── Calendar ──
  dateSection: { marginTop: 8 },
  dateButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: THEME.cardBg,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 12,
    padding: 14,
  },
  dateText: { color: '#fff', fontSize: 15, flex: 1 },
  inlineCalendar: {
    marginTop: 12,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  calendarHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  calendarMonthHeading: { fontSize: 18, fontWeight: '700', color: '#111' },
  monthArrow: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#f1f1f1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  weekDaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  weekDayLabel: {
    color: '#666',
    fontSize: 13,
    width: (width * 0.85 - 32) / 7,
    textAlign: 'center',
  },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: {
    width: (width * 0.85 - 32) / 7,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayCellSelected: { backgroundColor: '#0A7C6E', borderRadius: 10 },
  dayCellDisabled: { backgroundColor: 'transparent' },
  dayText: { fontSize: 16, color: '#111' },
  dayTextSelected: { color: '#fff', fontWeight: '700' },
  dayTextDisabled: { color: '#ccc', textDecorationLine: 'line-through' },

  saveButton: {
    backgroundColor: '#0A7C6E',
    margin: 20,
    height: 56,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  fileBadge: {
    backgroundColor: 'rgba(137,231,208,0.15)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  fileBadgeText: {
    color: THEME.teal,
    fontSize: 10,
    fontWeight: '700',
  },
  cardImagePreview: {
    width: '100%',
    height: 120,
    borderRadius: 10,
    marginTop: 10,
    overflow: 'hidden',
  },
  fileNameText: {
    color: THEME.textMuted,
    fontSize: 12,
    marginTop: 4,
  },
  cardActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.accent,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 12,
  },
  cardActionText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
  editBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
});