// import React, { useState, useEffect, useMemo } from 'react';
// import {
//   View,
//   Text,
//   Modal,
//   TouchableOpacity,
//   TextInput,
//   ScrollView,
//   StyleSheet,
//   SafeAreaView,
//   StatusBar,
//   Dimensions,
//   Image,
//   ActivityIndicator,
//   FlatList,
//   Linking,
// } from 'react-native';
// import {
//   Pencil,
//   ArrowLeft,
//   X,
//   FileText,
//   CloudUpload,
//   Calendar as CalendarIcon,
//   ChevronLeft,
//   ChevronRight,
//   Check,
//   ExternalLink,
//   Eye,
// } from 'lucide-react-native';
// import Toast from 'react-native-toast-message';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import axios from 'axios';
// import { getUserProfile, uploadFile } from '../services/authApi';
// import { launchImageLibrary } from 'react-native-image-picker';
// import LinearGradient from 'react-native-linear-gradient';

// const { width } = Dimensions.get('window');

// const BASE_URL = 'https://apis.staffoo.com.au/api';
// const FILE_BASE_URL = 'https://apis.staffoo.com.au/staff_documents/';

// type Props = { navigation: any };

// type Document = {
//   id: number;
//   document_name: string;
//   document_no?: string;
//   document_expiry?: string;
//   file?: string;
//   document_type: string;
// };

// const THEME = {
//   background: '#0B132B',
//   cardBg: '#1C2541',
//   accent: '#366bf0',
//   teal: '#89E7D0',
//   textLight: '#FFFFFF',
//   textMuted: '#6C7A89',
//   border: 'rgba(255, 255, 255, 0.1)',
// };

// const MAX_FILE_SIZE = 5 * 1024 * 1024;
// const DOC_NO_MAX = 20;

// const ALLOWED_FILE_TYPES = [
//   'image/jpeg',
//   'image/png',
//   'image/jpg',
//   'application/pdf',
//   'application/msword',
//   'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
// ];

// // ─── Helpers ────────────────────────────────────────────────────────────────

// const isImageFile = (fileStr?: string | null, mimeType?: string | null): boolean => {
//   if (!fileStr && !mimeType) return false;
//   if (mimeType && mimeType.startsWith('image/')) return true;
//   if (!fileStr) return false;
//   return /\.(jpg|jpeg|png|gif|webp)$/i.test(fileStr);
// };

// const getFileUrl = (file?: string | null): string | null => {
//   if (!file) return null;
//   if (file.startsWith('http') || file.startsWith('file://')) return file;
//   return `${FILE_BASE_URL}${file}`;
// };

// /** Returns 'expired' | 'expiring_soon' | 'ok' | 'none' */
// const getExpiryStatus = (expiryStr?: string): 'expired' | 'expiring_soon' | 'ok' | 'none' => {
//   if (!expiryStr) return 'none';
//   const today = new Date();
//   today.setHours(0, 0, 0, 0);
//   const expiry = new Date(expiryStr);
//   expiry.setHours(0, 0, 0, 0);
//   const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
//   if (diffDays < 0) return 'expired';
//   if (diffDays <= 30) return 'expiring_soon';
//   return 'ok';
// };

// const formatDisplayDate = (dateStr?: string): string => {
//   if (!dateStr) return '—';
//   const [year, month, day] = dateStr.split('-');
//   return `${day}/${month}/${year}`;
// };

// // ─── LazyImage ───────────────────────────────────────────────────────────────

// const LazyImage = ({ uri, style }: { uri: string; style: any }) => {
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(false);

//   useEffect(() => {
//     const timer = setTimeout(() => setLoading(false), 10000);
//     return () => clearTimeout(timer);
//   }, []);

//   if (error) return null;

//   return (
//     <View style={[style, { justifyContent: 'center', alignItems: 'center' }]}>
//       <Image
//         source={{ uri, cache: 'force-cache' }}
//         style={[style, { position: 'absolute', top: 0, left: 0 }]}
//         resizeMode="cover"
//         onLoadStart={() => { setLoading(true); setError(false); }}
//         onLoad={() => setLoading(false)}
//         onError={() => { setLoading(false); setError(true); }}
//       />
//       {loading && <ActivityIndicator color={THEME.teal} size="small" />}
//     </View>
//   );
// };

// // ─── ExpiryBadge ─────────────────────────────────────────────────────────────

// const ExpiryBadge = ({ status }: { status: 'expired' | 'expiring_soon' | 'ok' | 'none' }) => {
//   if (status === 'none' || status === 'ok') return null;
//   const isExpired = status === 'expired';
//   return (
//     <View style={[styles.badge, isExpired ? styles.badgeExpired : styles.badgeExpiringSoon]}>
//       <Text style={[styles.badgeText, isExpired ? styles.badgeTextExpired : styles.badgeTextExpiringSoon]}>
//         {isExpired ? 'Expired' : 'Expiring Soon'}
//       </Text>
//     </View>
//   );
// };

// // ─── Main Screen ─────────────────────────────────────────────────────────────

// export default function DocumentsScreen({ navigation }: Props) {
//   const [modalVisible, setModalVisible] = useState(false);
//   const [isEditMode, setIsEditMode] = useState(false);
//   const [editingDocId, setEditingDocId] = useState<number | null>(null);

//   const [fileError, setFileError] = useState('');
//   const [docNumberError, setDocNumberError] = useState('');
//   const [expiryError, setExpiryError] = useState('');

//   const [documentNumber, setDocumentNumber] = useState('');
//   const [expirationDate, setExpirationDate] = useState<Date | null>(null);
//   const [showInlineCalendar, setShowInlineCalendar] = useState(false);
//   const [currentCalendarMonth, setCurrentCalendarMonth] = useState(new Date());

//   const [selectedFile, setSelectedFile] = useState<any>(null);
//   const [uploadedFilePath, setUploadedFilePath] = useState<string | null>(null);
//   const [uploading, setUploading] = useState(false);
//   const [saving, setSaving] = useState(false);

//   const [documents, setDocuments] = useState<Document[]>([]);
//   const [loadingDocs, setLoadingDocs] = useState(true);
//   const [userId, setUserId] = useState<string | number | null>(null);

//   const [originalDocName, setOriginalDocName] = useState('');
//   const [originalDocType, setOriginalDocType] = useState('');

//   useEffect(() => { loadData(); }, []);

//   const loadData = async () => {
//     try {
//       const userStr = await AsyncStorage.getItem('user');
//       if (userStr) {
//         const user = JSON.parse(userStr);
//         const id = user?.id;
//         setUserId(id);
//         if (id) {
//           const profile = await getUserProfile(id);
//           if (profile?.success && profile?.data?.documents) {
//             setDocuments(profile.data.documents);
//           }
//         }
//       }
//     } catch (err) {
//       console.error('Failed to load documents:', err);
//     } finally {
//       setLoadingDocs(false);
//     }
//   };

//   const resetForm = () => {
//     setSelectedFile(null);
//     setUploadedFilePath(null);
//     setDocumentNumber('');
//     setExpirationDate(null);
//     setShowInlineCalendar(false);
//     setCurrentCalendarMonth(new Date());
//     setFileError('');
//     setDocNumberError('');
//     setExpiryError('');
//   };

//   const handleOpenModal = (doc?: Document) => {
//     resetForm();
//     if (doc) {
//       setIsEditMode(true);
//       setEditingDocId(doc.id);
//       setOriginalDocName(doc.document_name || '');
//       setOriginalDocType(doc.document_type || '');
//       setDocumentNumber(doc.document_no?.toUpperCase() || '');
//       if (doc.document_expiry) {
//         const [year, month, day] = doc.document_expiry.split('-').map(Number);
//         const parsedDate = new Date(year, month - 1, day);
//         setExpirationDate(parsedDate);
//         setCurrentCalendarMonth(parsedDate);
//       }
//       if (doc.file) setUploadedFilePath(doc.file);
//     } else {
//       setIsEditMode(false);
//       setEditingDocId(null);
//     }
//     setModalVisible(true);
//   };

//   const openFile = async (file?: string | null) => {
//     const url = getFileUrl(file);
//     if (!url) return;
//     try {
//       const canOpen = await Linking.canOpenURL(url);
//       if (canOpen) {
//         await Linking.openURL(url);
//       } else {
//         Toast.show({ type: 'error', text1: 'Cannot open file', position: 'bottom' });
//       }
//     } catch {
//       Toast.show({ type: 'error', text1: 'Failed to open file', position: 'bottom' });
//     }
//   };

//   const handleUpload = async () => {
//     try {
//       const result = await launchImageLibrary({
//         mediaType: 'mixed',
//         quality: 0.8,
//         selectionLimit: 1,
//       });

//       if (result.didCancel || !result.assets?.[0]) return;
//       const asset = result.assets[0];

//       if (!asset.type || !ALLOWED_FILE_TYPES.includes(asset.type)) {
//         Toast.show({ type: 'error', text1: 'Unsupported file type', position: 'bottom' });
//         return;
//       }
//       if (asset.fileSize && asset.fileSize > MAX_FILE_SIZE) {
//         Toast.show({ type: 'error', text1: 'File too large (Max 5MB)', position: 'bottom' });
//         return;
//       }

//       const file = {
//         uri: asset.uri!,
//         type: asset.type || 'image/jpeg',
//         name: asset.fileName || `file_${Date.now()}`,
//       };

//       setSelectedFile(file);
//       setFileError('');
//       setUploading(true);

//       const uploaded = await uploadFile(file);
//       const filePath = uploaded?.url || uploaded?.path || uploaded?.file || '';
//       setUploadedFilePath(filePath);
//       Toast.show({ type: 'success', text1: 'File uploaded successfully', position: 'bottom' });
//     } catch {
//       Toast.show({ type: 'error', text1: 'Upload failed', position: 'bottom' });
//     } finally {
//       setUploading(false);
//     }
//   };

//   const handleSave = async () => {
//     let hasError = false;
//     setFileError('');
//     setDocNumberError('');
//     setExpiryError('');

//     if (!selectedFile && !uploadedFilePath) {
//       setFileError('Please upload a file');
//       hasError = true;
//     }
//     if (!documentNumber.trim()) {
//       setDocNumberError('Please fill the document number');
//       hasError = true;
//     }
//     if (!expirationDate) {
//       setExpiryError('Please select expiration date');
//       hasError = true;
//     }

//     if (hasError) {
//       Toast.show({ type: 'error', text1: 'Please fill all mandatory fields', position: 'bottom' });
//       return;
//     }

//     setSaving(true);
//     try {
//       let fileName = '';
//       if (uploadedFilePath) {
//         fileName = uploadedFilePath.split('/').pop() || uploadedFilePath;
//       } else if (selectedFile?.name) {
//         fileName = selectedFile.name;
//       } else {
//         fileName = 'unknown_file';
//       }

//       const year = expirationDate!.getFullYear();
//       const month = String(expirationDate!.getMonth() + 1).padStart(2, '0');
//       const day = String(expirationDate!.getDate()).padStart(2, '0');
//       const expDate = `${year}-${month}-${day}`;

//       const payload: any = {
//         user_id: userId,
//         no: true,
//         exp: true,
//         document_no: documentNumber.trim(),
//         document_expiry: expDate,
//         file: fileName,
//         document_type: isEditMode
//           ? originalDocType
//           : fileName.split('.')[0].toLowerCase(),
//         document_name: isEditMode
//           ? originalDocName
//           : fileName.split('.')[0].replace(/[-_]/g, ' ').toUpperCase(),
//       };

//       const token = await AsyncStorage.getItem('@auth_token');
//       let endpoint = `${BASE_URL}/guard-add-documents`;
//       if (isEditMode && editingDocId) {
//         endpoint = `${BASE_URL}/guard-update-documents`;
//         payload.id = editingDocId;
//       }

//       await axios.post(endpoint, payload, {
//         headers: {
//           Authorization: `Bearer ${token}`,
//           'Content-Type': 'application/json',
//         },
//       });

//       Toast.show({
//         type: 'success',
//         text1: isEditMode ? 'Document Updated' : 'Document Added',
//         position: 'bottom',
//       });
//       setModalVisible(false);
//       loadData();
//     } catch (err) {
//       console.error(err);
//       Toast.show({ type: 'error', text1: 'Save Failed', position: 'bottom' });
//     } finally {
//       setSaving(false);
//     }
//   };

//   const calendarGrid = useMemo(() => {
//     const year = currentCalendarMonth.getFullYear();
//     const month = currentCalendarMonth.getMonth();
//     const firstDay = new Date(year, month, 1).getDay();
//     const daysInMonth = new Date(year, month + 1, 0).getDate();
//     const cells: (Date | null)[] = [];
//     for (let i = 0; i < firstDay; i++) cells.push(null);
//     for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
//     return cells;
//   }, [currentCalendarMonth]);

//   const changeMonth = (direction: 'prev' | 'next') => {
//     setCurrentCalendarMonth(prev => {
//       const newMonth = new Date(prev);
//       newMonth.setMonth(prev.getMonth() + (direction === 'next' ? 1 : -1));
//       return newMonth;
//     });
//   };

//   // ─── Modal file preview ──────────────────────────────────────────────────

//   const renderModalPreview = () => {
//     const fileUri = selectedFile?.uri || (uploadedFilePath ? getFileUrl(uploadedFilePath) : null);
//     const fileMime = selectedFile?.type || null;
//     const fileName = selectedFile?.name || uploadedFilePath?.split('/').pop() || 'Document';
//     const isImage = isImageFile(fileUri, fileMime);
//     if (!fileUri) return null;

//     if (isImage) {
//       return (
//         <View style={styles.imagePlaceholder}>
//           <LazyImage uri={fileUri} style={styles.previewImage} />
//         </View>
//       );
//     }
//     return (
//       <View style={styles.docPreviewCard}>
//         <View style={styles.docPreviewIconWrap}>
//           <FileText size={48} color={THEME.teal} />
//         </View>
//         <Text style={styles.docPreviewLabel} numberOfLines={2}>{fileName}</Text>
//         <TouchableOpacity style={styles.viewDocButton} onPress={() => openFile(fileUri)} activeOpacity={0.8}>
//           <ExternalLink size={16} color="#fff" style={{ marginRight: 6 }} />
//           <Text style={styles.viewDocButtonText}>OPEN DOCUMENT</Text>
//         </TouchableOpacity>
//       </View>
//     );
//   };

//   // ─── Table row ───────────────────────────────────────────────────────────

//   const renderRow = ({ item, index }: { item: Document; index: number }) => {
//     const status = getExpiryStatus(item.document_expiry);
//     const isEven = index % 2 === 0;

//     return (
//       <View style={[styles.tableRow, isEven ? styles.tableRowEven : styles.tableRowOdd]}>
//         {/* Document Name */}
//         <View style={styles.colName}>
//           <Text style={styles.rowDocName} numberOfLines={2}>
//             {item.document_name || '—'}
//           </Text>
//           <ExpiryBadge status={status} />
//         </View>

//         {/* Document Number */}
//         <View style={styles.colNumber}>
//           <Text style={styles.rowText} numberOfLines={1}>
//             {item.document_no || '—'}
//           </Text>
//         </View>

//         {/* Expiration Date */}
//         <View style={styles.colDate}>
//           <Text style={[
//             styles.rowText,
//             status === 'expired' && styles.rowTextExpired,
//             status === 'expiring_soon' && styles.rowTextExpiringSoon,
//           ]}>
//             {formatDisplayDate(item.document_expiry)}
//           </Text>
//         </View>

//         {/* Eye — view file */}
//         <View style={styles.colAction}>
//           <TouchableOpacity
//             style={styles.iconBtn}
//             onPress={() => openFile(item.file)}
//             disabled={!item.file}
//           >
//             <Eye size={20} color={item.file ? '#2DA58E' : THEME.textMuted} />
//           </TouchableOpacity>
//         </View>

//         {/* Pencil — edit */}
//         <View style={styles.colAction}>
//           <TouchableOpacity style={styles.iconBtn} onPress={() => handleOpenModal(item)}>
//             <Pencil size={18} color={THEME.textMuted} />
//           </TouchableOpacity>
//         </View>
//       </View>
//     );
//   };

//   // ─── Render ──────────────────────────────────────────────────────────────

//   return (
//     <SafeAreaView style={styles.container}>
//       <StatusBar barStyle="light-content" backgroundColor="#111111" />

//       {/* Header */}
//       <View style={styles.header}>
//         <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
//           <ArrowLeft size={22} color="#fff" />
//         </TouchableOpacity>
//         <Text style={styles.headerTitle}>Documents</Text>
//         <View style={{ width: 38 }} />
//       </View>

//       {/* Table header */}
//       <View style={styles.tableHead}>
//         <Text style={[styles.thText, styles.colName]}>Document Name</Text>
//         <Text style={[styles.thText, styles.colNumber]}>Doc No.</Text>
//         <Text style={[styles.thText, styles.colDate]}>Expiry</Text>
//         <Text style={[styles.thText, styles.colAction]}>File</Text>
//         <Text style={[styles.thText, styles.colAction]}>Edit</Text>
//       </View>

//       {loadingDocs ? (
//         <ActivityIndicator size="large" color={THEME.teal} style={{ marginTop: 50 }} />
//       ) : (
//         <FlatList
//           data={documents}
//           keyExtractor={item => item.id.toString()}
//           renderItem={renderRow}
//           contentContainerStyle={styles.tableBody}
//           ListEmptyComponent={
//             <Text style={styles.emptyText}>No documents found</Text>
//           }
//         />
//       )}

//       {/* ── Edit / Upload Modal ── */}
//       <Modal
//         animationType="slide"
//         transparent
//         visible={modalVisible}
//         onRequestClose={() => { setModalVisible(false); resetForm(); }}
//       >
//         <View style={styles.modalOverlay}>
//           <View style={styles.modalContent}>
//             <View style={styles.modalHeader}>
//               <Text style={styles.modalTitle}>
//                 {isEditMode ? 'EDIT DOCUMENT' : 'UPLOAD DOCUMENT'}
//               </Text>
//               <TouchableOpacity onPress={() => { setModalVisible(false); resetForm(); }}>
//                 <X size={24} color="#fff" />
//               </TouchableOpacity>
//             </View>

//             <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">

//               {/* File preview + upload button */}
//               <View style={styles.imageUploadArea}>
//                 {renderModalPreview()}

//                 <TouchableOpacity
//                   style={styles.uploadTriggerButton}
//                   onPress={handleUpload}
//                   disabled={uploading}
//                 >
//                   {uploading ? (
//                     <ActivityIndicator color="#fff" />
//                   ) : (
//                     <>
//                       <CloudUpload size={22} color="#fff" style={{ marginRight: 8 }} />
//                       <Text style={styles.uploadTriggerText}>
//                         {selectedFile || uploadedFilePath ? 'REPLACE FILE' : 'UPLOAD FILE (IMAGE, PDF, DOC) *'}
//                       </Text>
//                     </>
//                   )}
//                 </TouchableOpacity>
//                 {fileError ? <Text style={styles.errorText}>{fileError}</Text> : null}
//               </View>

//               {/* Document Number */}
//               <Text style={styles.fieldLabel}>DOCUMENT NUMBER *</Text>
//               <TextInput
//                 style={styles.inputBox}
//                 placeholder="Enter document number (e.g. 65656577)"
//                 placeholderTextColor={THEME.textMuted}
//                 value={documentNumber}
//                 keyboardType="numeric"
//                 maxLength={DOC_NO_MAX}
//                 onChangeText={text => {
//                   const value = text.replace(/[^0-9]/g, '').slice(0, DOC_NO_MAX);
//                   setDocumentNumber(value);
//                   if (value.trim()) setDocNumberError('');
//                 }}
//               />
//               {docNumberError ? <Text style={styles.errorText}>{docNumberError}</Text> : null}

//               {/* Expiration Date */}
//               <Text style={[styles.fieldLabel, { marginTop: 18 }]}>EXPIRATION DATE *</Text>
//               <TouchableOpacity
//                 style={styles.dateButton}
//                 onPress={() => setShowInlineCalendar(!showInlineCalendar)}
//               >
//                 <Text style={styles.dateText}>
//                   {expirationDate ? expirationDate.toLocaleDateString('en-GB') : 'Select Date'}
//                 </Text>
//                 <CalendarIcon size={20} color={THEME.teal} />
//               </TouchableOpacity>
//               {expiryError ? <Text style={styles.errorText}>{expiryError}</Text> : null}

//               {showInlineCalendar && (
//                 <View style={styles.inlineCalendar}>
//                   <View style={styles.calendarHeaderRow}>
//                     <Text style={styles.calendarMonthHeading}>
//                       {currentCalendarMonth
//                         .toLocaleString('default', { month: 'long', year: 'numeric' })
//                         .toUpperCase()}
//                     </Text>
//                     <View style={{ flexDirection: 'row', gap: 12 }}>
//                       <TouchableOpacity onPress={() => changeMonth('prev')} style={styles.monthArrow}>
//                         <ChevronLeft size={20} color="#111" />
//                       </TouchableOpacity>
//                       <TouchableOpacity onPress={() => changeMonth('next')} style={styles.monthArrow}>
//                         <ChevronRight size={20} color="#111" />
//                       </TouchableOpacity>
//                     </View>
//                   </View>

//                   <View style={styles.weekDaysRow}>
//                     {['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'].map((d, i) => (
//                       <Text key={i} style={styles.weekDayLabel}>{d}</Text>
//                     ))}
//                   </View>

//                   <View style={styles.daysGrid}>
//                     {calendarGrid.map((date, idx) => {
//                       if (!date) return <View key={idx} style={styles.dayCell} />;
//                       const today = new Date();
//                       today.setHours(0, 0, 0, 0);
//                       const target = new Date(date);
//                       target.setHours(0, 0, 0, 0);
//                       const isPast = target < today;
//                       const isSelected = expirationDate && date.toDateString() === expirationDate.toDateString();

//                       return (
//                         <TouchableOpacity
//                           key={idx}
//                           disabled={isPast}
//                           style={[
//                             styles.dayCell,
//                             isSelected && styles.dayCellSelected,
//                             isPast && styles.dayCellDisabled,
//                           ]}
//                           onPress={() => {
//                             if (isPast) return;
//                             setExpirationDate(date);
//                             setExpiryError('');
//                             setShowInlineCalendar(false);
//                           }}
//                         >
//                           <Text style={[
//                             styles.dayText,
//                             isSelected && styles.dayTextSelected,
//                             isPast && styles.dayTextDisabled,
//                           ]}>
//                             {date.getDate()}
//                           </Text>
//                         </TouchableOpacity>
//                       );
//                     })}
//                   </View>
//                 </View>
//               )}

//               <View style={{ height: 20 }} />
//             </ScrollView>

//             <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving}>
//               {saving ? (
//                 <ActivityIndicator color="#fff" />
//               ) : (
//                 <Text style={styles.saveButtonText}>{isEditMode ? 'UPDATE' : 'SAVE'}</Text>
//               )}
//             </TouchableOpacity>
//           </View>
//         </View>
//       </Modal>
//     </SafeAreaView>
//   );
// }

// // ─── Styles ──────────────────────────────────────────────────────────────────

// const COL_NAME_FLEX = 2.8;
// const COL_NUM_FLEX = 1.4;
// const COL_DATE_FLEX = 1.6;
// const COL_ACTION_FLEX = 0.7;

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: '#111111',
//     paddingTop: 25,
//   },

//   // ── Header ──
//   header: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'space-between',
//     paddingHorizontal: 16,
//     paddingVertical: 14,
//   },
//   backBtn: {
//     width: 38,
//     height: 38,
//     borderRadius: 10,
//     backgroundColor: 'rgba(255,255,255,0.08)',
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   headerTitle: {
//     fontSize: 20,
//     fontWeight: '700',
//     color: '#fff',
//   },

//   // ── Table ──
//   tableHead: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     backgroundColor: '#1a1f2e',
//     paddingVertical: 12,
//     paddingHorizontal: 14,
//     borderBottomWidth: 1,
//     borderColor: 'rgba(255,255,255,0.1)',
//   },
//   thText: {
//     color: '#AAB4C0',
//     fontSize: 11,
//     fontWeight: '700',
//     textTransform: 'uppercase',
//     letterSpacing: 0.5,
//   },
//   tableBody: {
//     paddingBottom: 30,
//   },
//   tableRow: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     paddingVertical: 13,
//     paddingHorizontal: 14,
//     borderBottomWidth: 1,
//     borderColor: 'rgba(255,255,255,0.05)',
//   },
//   tableRowEven: { backgroundColor: '#111111' },
//   tableRowOdd: { backgroundColor: '#161b28' },

//   // Column widths (flex)
//   colName: { flex: COL_NAME_FLEX, paddingRight: 6 },
//   colNumber: { flex: COL_NUM_FLEX, paddingRight: 4 },
//   colDate: { flex: COL_DATE_FLEX, paddingRight: 4 },
//   colAction: { flex: COL_ACTION_FLEX, alignItems: 'center' },

//   rowDocName: {
//     color: '#fff',
//     fontSize: 13,
//     fontWeight: '600',
//     lineHeight: 18,
//   },
//   rowText: {
//     color: '#ccc',
//     fontSize: 12,
//   },
//   rowTextExpired: { color: '#ff6b6b' },
//   rowTextExpiringSoon: { color: '#f0a500' },

//   iconBtn: {
//     width: 36,
//     height: 36,
//     borderRadius: 10,
//     backgroundColor: 'rgba(255,255,255,0.06)',
//     justifyContent: 'center',
//     alignItems: 'center',
//   },

//   // ── Badges ──
//   badge: {
//     alignSelf: 'flex-start',
//     marginTop: 4,
//     borderRadius: 4,
//     paddingHorizontal: 6,
//     paddingVertical: 2,
//   },
//   badgeExpired: { backgroundColor: 'rgba(255,107,107,0.18)' },
//   badgeExpiringSoon: { backgroundColor: 'rgba(240,165,0,0.18)' },
//   badgeText: { fontSize: 9, fontWeight: '700' },
//   badgeTextExpired: { color: '#ff6b6b' },
//   badgeTextExpiringSoon: { color: '#f0a500' },

//   emptyText: {
//     textAlign: 'center',
//     marginTop: 60,
//     color: THEME.textMuted,
//     fontSize: 15,
//   },

//   // ── Modal ──
//   modalOverlay: {
//     flex: 1,
//     backgroundColor: 'rgba(0,0,0,0.85)',
//     justifyContent: 'flex-end',
//   },
//   modalContent: {
//     backgroundColor: '#0e0e0e',
//     borderTopLeftRadius: 24,
//     borderTopRightRadius: 24,
//     maxHeight: '92%',
//   },
//   modalHeader: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     padding: 20,
//     borderBottomWidth: 1,
//     borderColor: THEME.border,
//   },
//   modalTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
//   modalBody: { padding: 20 },

//   fieldLabel: {
//     color: '#AAB4C0',
//     fontSize: 12,
//     fontWeight: '700',
//     letterSpacing: 0.8,
//     marginBottom: 8,
//   },

//   errorText: {
//     color: '#ff4d4f',
//     fontSize: 12,
//     marginTop: 6,
//     marginLeft: 2,
//     fontWeight: '500',
//   },

//   // ── File preview in modal ──
//   imageUploadArea: { alignItems: 'center', marginBottom: 20 },
//   imagePlaceholder: {
//     width: '100%',
//     height: 200,
//     borderRadius: 16,
//     backgroundColor: THEME.cardBg,
//     overflow: 'hidden',
//     marginBottom: 12,
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   previewImage: { width: '100%', height: '100%' },

//   docPreviewCard: {
//     width: '100%',
//     borderRadius: 16,
//     backgroundColor: THEME.cardBg,
//     borderWidth: 1,
//     borderColor: THEME.border,
//     paddingVertical: 24,
//     paddingHorizontal: 16,
//     alignItems: 'center',
//     marginBottom: 12,
//     gap: 12,
//   },
//   docPreviewIconWrap: {
//     width: 80,
//     height: 80,
//     borderRadius: 20,
//     backgroundColor: 'rgba(137,231,208,0.12)',
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   docPreviewLabel: {
//     color: '#fff',
//     fontSize: 13,
//     fontWeight: '600',
//     textAlign: 'center',
//     maxWidth: '80%',
//   },
//   viewDocButton: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     backgroundColor: THEME.accent,
//     paddingHorizontal: 16,
//     paddingVertical: 10,
//     borderRadius: 10,
//     marginTop: 4,
//   },
//   viewDocButtonText: { color: '#fff', fontWeight: '700', fontSize: 13 },

//   uploadTriggerButton: {
//     width: '100%',
//     height: 56,
//     backgroundColor: THEME.accent,
//     borderRadius: 12,
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
//   uploadTriggerText: { color: '#fff', fontWeight: '700', fontSize: 14 },

//   inputBox: {
//     backgroundColor: THEME.cardBg,
//     borderWidth: 1,
//     borderColor: THEME.border,
//     borderRadius: 12,
//     padding: 14,
//     color: '#fff',
//     fontSize: 15,
//   },

//   // ── Calendar ──
//   dateButton: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     backgroundColor: THEME.cardBg,
//     borderWidth: 1,
//     borderColor: THEME.border,
//     borderRadius: 12,
//     padding: 14,
//   },
//   dateText: { color: '#fff', fontSize: 15, flex: 1 },
//   inlineCalendar: {
//     marginTop: 12,
//     backgroundColor: '#fff',
//     borderRadius: 16,
//     padding: 16,
//     borderWidth: 1,
//     borderColor: THEME.border,
//   },
//   calendarHeaderRow: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     marginBottom: 12,
//   },
//   calendarMonthHeading: { fontSize: 16, fontWeight: '700', color: '#111' },
//   monthArrow: {
//     width: 36,
//     height: 36,
//     borderRadius: 10,
//     backgroundColor: '#f1f1f1',
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   weekDaysRow: {
//     flexDirection: 'row',
//     justifyContent: 'space-around',
//     marginBottom: 8,
//   },
//   weekDayLabel: {
//     color: '#666',
//     fontSize: 12,
//     width: (width * 0.85 - 32) / 7,
//     textAlign: 'center',
//   },
//   daysGrid: { flexDirection: 'row', flexWrap: 'wrap' },
//   dayCell: {
//     width: (width * 0.85 - 32) / 7,
//     height: 44,
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   dayCellSelected: { backgroundColor: '#0A7C6E', borderRadius: 10 },
//   dayCellDisabled: { backgroundColor: 'transparent' },
//   dayText: { fontSize: 15, color: '#111' },
//   dayTextSelected: { color: '#fff', fontWeight: '700' },
//   dayTextDisabled: { color: '#ccc', textDecorationLine: 'line-through' },

//   saveButton: {
//     backgroundColor: '#0A7C6E',
//     margin: 20,
//     height: 56,
//     borderRadius: 14,
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
// });

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
  ArrowLeft,
  X,
  FileText,
  CloudUpload,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Eye,
  Lock,
  PlusCircle,
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
  background: '#111111',
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

// ─── Helpers ─────────────────────────────────────────────────────────────────

const isImageFile = (fileStr?: string | null, mimeType?: string | null): boolean => {
  if (!fileStr && !mimeType) return false;
  if (mimeType && mimeType.startsWith('image/')) return true;
  if (!fileStr) return false;
  return /\.(jpg|jpeg|png|gif|webp)$/i.test(fileStr);
};

const getFileUrl = (file?: string | null): string | null => {
  if (!file) return null;
  if (file.startsWith('http') || file.startsWith('file://')) return file;
  return `${FILE_BASE_URL}${file}`;
};

const getExpiryStatus = (expiryStr?: string): 'expired' | 'expiring_soon' | 'ok' | 'none' => {
  if (!expiryStr) return 'none';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryStr);
  expiry.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return 'expired';
  if (diffDays <= 30) return 'expiring_soon';
  return 'ok';
};

const formatDisplayDate = (dateStr?: string): string => {
  if (!dateStr) return '—';
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
};

// ─── LazyImage ───────────────────────────────────────────────────────────────

const LazyImage = ({ uri, style }: { uri: string; style: any }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 10000);
    return () => clearTimeout(t);
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

// ─── ExpiryBadge ─────────────────────────────────────────────────────────────

const ExpiryBadge = ({ status }: { status: 'expired' | 'expiring_soon' | 'ok' | 'none' }) => {
  if (status === 'none' || status === 'ok') return null;
  const isExpired = status === 'expired';
  return (
    <View style={[styles.badge, isExpired ? styles.badgeExpired : styles.badgeExpiringSoon]}>
      <Text style={[styles.badgeText, isExpired ? styles.badgeTextExpired : styles.badgeTextExpiringSoon]}>
        {isExpired ? 'Expired' : 'Expiring Soon'}
      </Text>
    </View>
  );
};

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function DocumentsScreen({ navigation }: Props) {
  const [modalVisible, setModalVisible] = useState(false);
  const [fileError, setFileError] = useState('');
  const [docNumberError, setDocNumberError] = useState('');
  const [expiryError, setExpiryError] = useState('');

  const [selectedDocType, setSelectedDocType] = useState<{
    label: string;
    value: string;
    category: string;
  } | null>(null);

  const [documentNumber, setDocumentNumber] = useState('');
  const [expirationDate, setExpirationDate] = useState<Date | null>(null);
  const [showInlineCalendar, setShowInlineCalendar] = useState(false);
  const [currentCalendarMonth, setCurrentCalendarMonth] = useState(new Date());
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [uploadedFilePath, setUploadedFilePath] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadedDocuments, setUploadedDocuments] = useState<Document[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [userId, setUserId] = useState<string | number | null>(null);

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
            setUploadedDocuments(profile.data.documents);
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
    setShowInlineCalendar(false);
    setCurrentCalendarMonth(new Date());
    setFileError('');
    setDocNumberError('');
    setExpiryError('');
  };

  const handleOpenAddModal = (docType: { label: string; value: string; category: string }) => {
    resetForm();
    setSelectedDocType(docType);
    setModalVisible(true);
  };

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
    } catch {
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
    } catch {
      Toast.show({ type: 'error', text1: 'Upload failed', position: 'bottom' });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    let hasError = false;
    setFileError('');
    setDocNumberError('');
    setExpiryError('');

    if (!selectedFile && !uploadedFilePath) { setFileError('Please upload a file'); hasError = true; }
    if (!documentNumber.trim()) { setDocNumberError('Please fill the document number'); hasError = true; }
    if (!expirationDate) { setExpiryError('Please select expiration date'); hasError = true; }

    if (hasError) {
      Toast.show({ type: 'error', text1: 'Please fill all mandatory fields', position: 'bottom' });
      return;
    }

    setSaving(true);
    try {
      let fileName = '';
      if (uploadedFilePath) {
        fileName = uploadedFilePath.split('/').pop() || uploadedFilePath;
      } else if (selectedFile?.name) {
        fileName = selectedFile.name;
      } else {
        fileName = 'unknown_file';
      }

      const year = expirationDate!.getFullYear();
      const month = String(expirationDate!.getMonth() + 1).padStart(2, '0');
      const day = String(expirationDate!.getDate()).padStart(2, '0');
      const expDate = `${year}-${month}-${day}`;

      // Find existing doc from API list
      const existingDoc = uploadedDocuments.find(d => {
        const apiName = d.document_name?.toLowerCase().replace(/[\s_]+/g, '') || '';
        const apiType = d.document_type?.toLowerCase().replace(/[\s_]+/g, '') || '';
        const matchValue = selectedDocType!.value.toLowerCase().replace(/[\s_]+/g, '');
        return apiName === matchValue || apiType === matchValue;
      });

      const payload: any = {
        user_id: userId,
        document_no: documentNumber.trim(),
        document_expiry: expDate,
        file: fileName,
        document_category: selectedDocType!.category,
      };

      if (existingDoc) {
        payload.id = existingDoc.id;
        payload.document_name = existingDoc.document_name || selectedDocType!.value;
        payload.document_type = existingDoc.document_type || selectedDocType!.value.toLowerCase().replace(/\s+/g, '_');
        payload.exp = (existingDoc as any).exp ?? false;
        payload.no = (existingDoc as any).no ?? false;
      } else {
        payload.document_name = selectedDocType!.value;
        payload.document_type = selectedDocType!.value.toLowerCase().replace(/\s+/g, '_');
        payload.exp = false;
        payload.no = false;
      }

      const token = await AsyncStorage.getItem('@auth_token');
      await axios.post(`${BASE_URL}/guard-update-documents`, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      Toast.show({ type: 'success', text1: 'Document Saved Successfully', position: 'bottom' });
      setModalVisible(false);
      loadData();
    } catch (err) {
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
      const n = new Date(prev);
      n.setMonth(prev.getMonth() + (direction === 'next' ? 1 : -1));
      return n;
    });
  };

  // ─── Modal File Preview ───────────────────────────────────────────────────

  const renderModalPreview = () => {
    const fileUri = selectedFile?.uri || (uploadedFilePath ? getFileUrl(uploadedFilePath) : null);
    const fileMime = selectedFile?.type || null;
    const fileName = selectedFile?.name || uploadedFilePath?.split('/').pop() || 'Document';
    const isImage = isImageFile(fileUri, fileMime);
    if (!fileUri) return null;
    if (isImage) {
      return (
        <View style={styles.imagePlaceholder}>
          <LazyImage uri={fileUri} style={styles.previewImage} />
        </View>
      );
    }
    return (
      <View style={styles.docPreviewCard}>
        <View style={styles.docPreviewIconWrap}>
          <FileText size={48} color={THEME.teal} />
        </View>
        <Text style={styles.docPreviewLabel} numberOfLines={2}>{fileName}</Text>
        <TouchableOpacity style={styles.viewDocButton} onPress={() => openFile(fileUri)} activeOpacity={0.8}>
          <ExternalLink size={16} color="#fff" style={{ marginRight: 6 }} />
          <Text style={styles.viewDocButtonText}>OPEN DOCUMENT</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // ─── Card: API-driven (filled state) ─────────────────────────────────────

  const renderFilledCard = (item: Document) => {
    const status = getExpiryStatus(item.document_expiry);
    const isImg = isImageFile(item.file);
    const ext = item.file?.split('.').pop()?.toUpperCase() || '';

    return (
      <LinearGradient
        colors={['#1e2538', '#141929']}
        style={styles.cardGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.cardTopRow}>
          <View style={styles.docIconBox}>
            <FileText size={22} color={THEME.teal} />
          </View>

          <View style={{ flex: 1, marginHorizontal: 12 }}>
            <Text style={styles.cardDocName} numberOfLines={1}>
              {item.document_name || '—'}
            </Text>
            <View style={styles.cardSubRow}>
              {!!ext && (
                <View style={styles.extBadge}>
                  <Text style={styles.extBadgeText}>{ext}</Text>
                </View>
              )}
              <ExpiryBadge status={status} />
            </View>
          </View>

          <View style={styles.lockIconWrap}>
            <Lock size={16} color={THEME.textMuted} />
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Document No</Text>
          <Text style={styles.infoValue}>{item.document_no || '—'}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Expiry Date</Text>
          <Text style={[
            styles.infoValue,
            status === 'expired' && { color: '#ff6b6b' },
            status === 'expiring_soon' && { color: '#f0a500' },
          ]}>
            {formatDisplayDate(item.document_expiry)}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.viewBtn}
          onPress={() => openFile(item.file)}
          activeOpacity={0.85}
        >
          <Eye size={17} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.viewBtnText}>
            {isImg ? 'VIEW IMAGE' : 'VIEW / DOWNLOAD'}
          </Text>
        </TouchableOpacity>
      </LinearGradient>
    );
  };

  // ─── Card: API-driven (empty state) ──────────────────────────────────────

  const renderEmptyCard = (item: Document) => (
    <LinearGradient
      colors={['#171d30', '#0f1322']}
      style={[styles.cardGradient, {
        borderStyle: 'dashed',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
      }]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <View style={styles.cardTopRow}>
        <View style={[styles.docIconBox, { backgroundColor: 'rgba(255,255,255,0.03)' }]}>
          <FileText size={22} color={THEME.textMuted} />
        </View>
        <View style={{ flex: 1, marginHorizontal: 12 }}>
          <Text style={[styles.cardDocName, { color: THEME.textMuted }]}>
            {item.document_name || '—'}
          </Text>
          <Text style={{ color: '#aaa', fontSize: 11, marginTop: 2 }}>
            Add Required Document
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.addCardButton}
        onPress={() =>
          handleOpenAddModal({
            label: item.document_name,
            value: item.document_name,
            category: item.document_type,
          })
        }
        activeOpacity={0.8}
      >
        <PlusCircle size={16} color={THEME.teal} style={{ marginRight: 6 }} />
        <Text style={styles.addCardButtonText}>ADD DOCUMENT</Text>
      </TouchableOpacity>
    </LinearGradient>
  );

  // ─── FlatList renderItem ──────────────────────────────────────────────────

  const renderItem = ({ item }: { item: Document }) => {
    const isFilled = !!(item.file && item.file.trim().length > 0);
    return isFilled ? renderFilledCard(item) : renderEmptyCard(item);
  };

  // ─── Main Return ──────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#111111" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Documents</Text>
        <View style={{ width: 40 }} />
      </View>

      {loadingDocs ? (
        <ActivityIndicator size="large" color={THEME.teal} style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={uploadedDocuments}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No documents found</Text>
          }
        />
      )}

      {/* ── Upload Modal ── */}
      <Modal
        animationType="slide"
        transparent
        visible={modalVisible}
        onRequestClose={() => { setModalVisible(false); resetForm(); }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>UPLOAD DOCUMENT</Text>
              <TouchableOpacity onPress={() => { setModalVisible(false); resetForm(); }}>
                <X size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">

              {/* File upload block */}
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
                        {selectedFile || uploadedFilePath ? 'REPLACE FILE' : 'UPLOAD FILE (IMAGE, PDF, DOC) *'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
                {fileError ? <Text style={styles.errorText}>{fileError}</Text> : null}
              </View>

              {/* Locked document type */}
              <Text style={styles.fieldLabel}>DOCUMENT TYPE</Text>
              <View style={[styles.dropdownSelector, styles.dropdownSelectorDisabled]}>
                <Text style={styles.disabledDropdownText}>
                  {selectedDocType ? selectedDocType.label : ''}
                </Text>
                <Lock size={16} color={THEME.textMuted} />
              </View>
              <Text style={styles.inputHelpText}>Locked to selected document.</Text>

              {/* Expiry date */}
              <Text style={[styles.fieldLabel, { marginTop: 18 }]}>EXPIRATION DATE *</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowInlineCalendar(!showInlineCalendar)}
              >
                <Text style={styles.dateText}>
                  {expirationDate ? expirationDate.toLocaleDateString('en-GB') : 'Select Date'}
                </Text>
                <CalendarIcon size={20} color={THEME.teal} />
              </TouchableOpacity>
              {expiryError ? <Text style={styles.errorText}>{expiryError}</Text> : null}

              {showInlineCalendar && (
                <View style={styles.inlineCalendar}>
                  <View style={styles.calendarHeaderRow}>
                    <Text style={styles.calendarMonthHeading}>
                      {currentCalendarMonth
                        .toLocaleString('default', { month: 'long', year: 'numeric' })
                        .toUpperCase()}
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                      <TouchableOpacity onPress={() => changeMonth('prev')} style={styles.monthArrow}>
                        <ChevronLeft size={20} color="#111" />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => changeMonth('next')} style={styles.monthArrow}>
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
                      const target = new Date(date);
                      target.setHours(0, 0, 0, 0);
                      const isPast = target < today;
                      const isSelected =
                        expirationDate && date.toDateString() === expirationDate.toDateString();
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
                          <Text style={[
                            styles.dayText,
                            isSelected && styles.dayTextSelected,
                            isPast && styles.dayTextDisabled,
                          ]}>
                            {date.getDate()}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* Document number */}
              <Text style={[styles.fieldLabel, { marginTop: 18 }]}>DOCUMENT NUMBER *</Text>
              <TextInput
                style={styles.inputBox}
                placeholder="Enter document number"
                placeholderTextColor={THEME.textMuted}
                value={documentNumber}
                keyboardType="numeric"
                maxLength={DOC_NO_MAX}
                onChangeText={text => {
                  const value = text.replace(/[^0-9]/g, '').slice(0, DOC_NO_MAX);
                  setDocumentNumber(value);
                  if (value.trim()) setDocNumberError('');
                }}
              />
              {docNumberError ? <Text style={styles.errorText}>{docNumberError}</Text> : null}

              <View style={{ height: 20 }} />
            </ScrollView>

            <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving}>
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>SAVE DOCUMENT</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.background, paddingTop: 25 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 56,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },

  listContent: { padding: 16, paddingBottom: 40 },
  emptyText: { textAlign: 'center', marginTop: 60, color: THEME.textMuted, fontSize: 15 },

  // ── Cards ──
  cardGradient: { borderRadius: 12, padding: 16, marginBottom: 16 },
  cardTopRow: { flexDirection: 'row', alignItems: 'center' },
  docIconBox: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: 'rgba(137,231,208,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardDocName: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  cardSubRow: { flexDirection: 'row', marginTop: 4, alignItems: 'center', gap: 8 },
  extBadge: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  extBadgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  lockIconWrap: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  divider: { height: 1, backgroundColor: THEME.border, marginVertical: 12 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  infoLabel: { color: THEME.textMuted, fontSize: 13 },
  infoValue: { color: '#fff', fontSize: 13, fontWeight: '500' },
  viewBtn: {
    backgroundColor: THEME.accent,
    height: 40,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
  viewBtnText: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
  addCardButton: {
    height: 38,
    backgroundColor: 'rgba(137,231,208,0.08)',
    borderRadius: 6,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 14,
    borderWidth: 1,
    borderColor: 'rgba(137,231,208,0.2)',
  },
  addCardButtonText: { color: THEME.teal, fontSize: 12, fontWeight: 'bold' },

  // ── Badges ──
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  badgeExpired: { backgroundColor: 'rgba(255,107,107,0.15)' },
  badgeExpiringSoon: { backgroundColor: 'rgba(240,165,0,0.15)' },
  badgeText: { fontSize: 10, fontWeight: 'bold' },
  badgeTextExpired: { color: '#ff6b6b' },
  badgeTextExpiringSoon: { color: '#f0a500' },

  // ── Modal ──
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: THEME.cardBg,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '92%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  modalTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  modalBody: { padding: 16 },

  imageUploadArea: { alignItems: 'center', marginBottom: 20 },
  imagePlaceholder: {
    width: width - 64,
    height: 160,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
  },
  previewImage: { width: '100%', height: '100%' },
  uploadTriggerButton: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: THEME.border,
    borderStyle: 'dashed',
    width: '100%',
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadTriggerText: { color: '#fff', fontSize: 12, fontWeight: '600' },

  docPreviewCard: {
    width: '100%',
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  docPreviewIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(137,231,208,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  docPreviewLabel: { color: '#fff', fontSize: 13, textAlign: 'center', marginBottom: 12 },
  viewDocButton: {
    flexDirection: 'row',
    backgroundColor: THEME.accent,
    paddingHorizontal: 16,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewDocButtonText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },

  fieldLabel: { color: THEME.teal, fontSize: 11, fontWeight: 'bold', marginBottom: 6 },
  inputBox: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: THEME.border,
    height: 48,
    borderRadius: 8,
    paddingHorizontal: 12,
    color: '#fff',
    fontSize: 14,
  },
  dateButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: THEME.border,
    height: 48,
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  dateText: { color: '#fff', fontSize: 14 },
  errorText: { color: '#ff6b6b', fontSize: 12, marginTop: 4 },

  dropdownSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: THEME.border,
    height: 48,
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  dropdownSelectorDisabled: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderColor: 'rgba(255,255,255,0.05)',
  },
  disabledDropdownText: { color: '#a0aab2', fontSize: 14, fontWeight: '500' },
  inputHelpText: { color: THEME.textMuted, fontSize: 11, marginTop: 4, fontStyle: 'italic' },

  saveButton: {
    backgroundColor: THEME.accent,
    height: 54,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 16,
    borderRadius: 8,
  },
  saveButtonText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },

  // ── Calendar ──
  inlineCalendar: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
  },
  calendarHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  calendarMonthHeading: { color: '#111', fontWeight: 'bold', fontSize: 14 },
  monthArrow: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 16,
  },
  weekDaysRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 6 },
  weekDayLabel: { color: '#777', fontSize: 11, fontWeight: 'bold', width: 36, textAlign: 'center' },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: {
    width: (width - 56) / 7,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 2,
  },
  dayCellSelected: { backgroundColor: THEME.accent, borderRadius: 18 },
  dayCellDisabled: { opacity: 0.25 },
  dayText: { color: '#111', fontSize: 13, fontWeight: '500' },
  dayTextSelected: { color: '#fff', fontWeight: 'bold' },
  dayTextDisabled: { color: '#aaa' },
});