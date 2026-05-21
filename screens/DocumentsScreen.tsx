// // screens/DocumentsScreen.tsx
// import React, { useState, useEffect } from 'react';
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
//   Platform,
//   Image,
//   ActivityIndicator,
//   FlatList,
//   Linking,
// } from 'react-native';
// import {
//   Eye,
//   Pencil,
//   ArrowLeft,
//   X,
//   FileText,
//   Plus,
//   Trash2,
//   Check,
//   Calendar,
// } from 'lucide-react-native';
// import { Picker } from '@react-native-picker/picker';
// import DateTimePicker from '@react-native-community/datetimepicker';

// import { pick, types } from '@react-native-documents/picker';
// import ImageResizer from 'react-native-image-resizer';
// import Toast from 'react-native-toast-message';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import axios, { isCancel } from 'axios';
// import { getUserProfile, uploadFile } from '../services/authApi'; // adjust path
// import { launchImageLibrary } from 'react-native-image-picker';

// const { width } = Dimensions.get('window');

// const BASE_URL = 'https://apis.staffoo.com.au/api';
// const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
// const ALLOWED_TYPES = [
//   'image/jpeg',
//   'image/png',
//   'image/jpg',
//   'application/pdf',
// ];
// type Props = { navigation: any };

// type Document = {
//   id: number;
//   document_name: string;
//   document_no?: string;
//   document_expiry?: string;
//   file?: string;
//   document_type: string;
// };
// const COLORS = {
//   background: '#0F172A',
//   surface: '#FFFFFF',
//   primary: '#5B67F1',
//   secondary: '#7C3AED',
//   border: '#E2E8F0',
//   text: '#111827',
//   subText: '#64748B',
//   lightBg: '#F8FAFC',
// };
// export default function DocumentsScreen({ navigation }: Props) {
//   const [modalVisible, setModalVisible] = useState(false);
//   const [isEditMode, setIsEditMode] = useState(false);
//   const [editingDocId, setEditingDocId] = useState<number | null>(null);

//   const [documentType, setDocumentType] = useState('');
//   const [documentNumber, setDocumentNumber] = useState('');
//   const [description, setDescription] = useState('');
//   const [expirationDate, setExpirationDate] = useState<Date | null>(null);
//   const [showDatePicker, setShowDatePicker] = useState(false);

//   const [addDocNumber, setAddDocNumber] = useState(false);
//   const [setExpiration, setSetExpiration] = useState(false);
//   const DOCUMENT_NUMBER_MAX = 20;
//   const [selectedFile, setSelectedFile] = useState<any>(null);
//   const [uploadedFilePath, setUploadedFilePath] = useState<string | null>(null);
//   const [uploadingImage, setUploadingImage] = useState(false);
//   const [savingDocument, setSavingDocument] = useState(false);

//   const [documents, setDocuments] = useState<Document[]>([]);
//   const [loadingDocs, setLoadingDocs] = useState(true);
//   const [userId, setUserId] = useState<string | number | null>(null);

//   const documentTypes = [
//     'Security License',
//     'Application Form',
//     'Birth Certificate',
//     'Casual Contract Form',
//     'Citizen Ship',
//     'Driver Licence',
//     'Medicare',
//     'Passport',
//     'Other',
//   ];

//   const formatDocName = (name: string) => {
//     if (!name) return '';
//     return name
//       .split('_')
//       .map(word => word.charAt(0).toUpperCase() + word.slice(1))
//       .join(' ');
//   };

//   // Load user ID and documents
//   useEffect(() => {
//     const loadData = async () => {
//       try {
//         const userStr = await AsyncStorage.getItem('user');
//         if (userStr) {
//           const user = JSON.parse(userStr);
//           const id = user?.id;
//           setUserId(id);

//           if (id) {
//             const profile = await getUserProfile(id);
//             console.log('Full Profile Response:', profile);

//             if (profile?.success && profile?.data?.documents) {
//               setDocuments(profile.data.documents);
//             }
//           }
//         }
//       } catch (err) {
//         console.error('Failed to load documents:', err);
//         Toast.show({
//           type: 'error',
//           text1: 'Could not load documents',
//           position: 'bottom',
//         });
//       } finally {
//         setLoadingDocs(false);
//       }
//     };

//     loadData();
//   }, []);

//   const handleOpenModal = (doc?: Document) => {
//     if (doc) {
//       setIsEditMode(true);
//       setEditingDocId(doc.id);

//       // 🔥 Set document type correctly (Format if snake_case)
//       setDocumentType(formatDocName(doc.document_type || ''));

//       // 🔥 Set number
//       setDocumentNumber(doc.document_no || '');
//       setAddDocNumber(!!doc.document_no);

//       // 🔥 FIXED DATE (API already gives YYYY-MM-DD)
//       if (doc.document_expiry) {
//         // Safe parse YYYY-MM-DD (or DD-MM-YYYY if your API sends that)
//         const [year, month, day] = doc.document_expiry.split('-').map(Number);
//         const safeDate = new Date(year, month - 1, day); // month is 0-indexed
//         setExpirationDate(safeDate);
//         setSetExpiration(true);
//       } else {
//         setExpirationDate(null);
//         setSetExpiration(false);
//       }

//       // 🔥 File
//       setUploadedFilePath(doc.file || null);
//       setSelectedFile(null);
//     } else {
//       // Add mode reset
//       setIsEditMode(false);
//       setEditingDocId(null);
//       setDocumentType('');
//       setDocumentNumber('');
//       setAddDocNumber(false);
//       setSetExpiration(false);
//       setExpirationDate(null);
//       setSelectedFile(null);
//       setUploadedFilePath(null);
//     }

//     setModalVisible(true);
//   };

//   //   const handleUpload = async () => {
//   //     try {
//   //       const result = await pick({
//   //         type: [types.pdf, types.images, types.allFiles],
//   //         allowMultiSelection: false,
//   //       });

//   //       if (!result || result.length === 0) return;

//   //       const file = result[0];

//   //       setSelectedFile(file);
//   //       setSavingDocument(true);

//   //       let fileToUpload = file;

//   //       // 🟢 Compress image if image type
//   //       if (file.type?.startsWith('image/')) {
//   //         try {
//   //           const resized = await ImageResizer.createResizedImage(
//   //             file.uri,
//   //             1024,
//   //             1024,
//   //             'JPEG',
//   //             75,
//   //             0,
//   //           );

//   //           fileToUpload = {
//   //             ...file,
//   //             uri: resized.uri,
//   //             name: file.name || 'compressed_image.jpg',
//   //             type: 'image/jpeg',
//   //           };
//   //         } catch (e) {
//   //           console.warn('Compression failed:', e);
//   //         }
//   //       }

//   //       // 🟢 Upload file
//   //       const uploaded = await uploadFile(fileToUpload);

//   //       const filePath = uploaded?.url || uploaded?.path || uploaded?.file || '';

//   //       setUploadedFilePath(filePath);

//   //       Toast.show({
//   //         type: 'success',
//   //         text1: 'File Uploaded',
//   //         position: 'bottom',
//   //       });
//   //     } catch (err: any) {
//   //       if (isCancel(err)) return;

//   //       Toast.show({
//   //         type: 'error',
//   //         text1: 'Upload Failed',
//   //         text2: err?.message || 'Try again',
//   //         position: 'bottom',
//   //       });
//   //     } finally {
//   //       setSavingDocument(false);
//   //     }
//   //   };
//   const handleUpload = async () => {
//     try {
//       const result = await launchImageLibrary({
//         mediaType: 'photo',
//         quality: 0.7,
//         selectionLimit: 1,
//       });

//       if (result.didCancel) {
//         return;
//       }

//       const asset = result.assets?.[0];

//       if (!asset) return;

//       // FILE SIZE VALIDATION
//       if ((asset.fileSize || 0) > MAX_FILE_SIZE) {
//         Toast.show({
//           type: 'error',
//           text1: 'File too large',
//           text2: 'Maximum allowed size is 5MB',
//           position: 'bottom',
//         });
//         return;
//       }

//       // FILE TYPE VALIDATION
//       if (!ALLOWED_TYPES.includes(asset.type || '')) {
//         Toast.show({
//           type: 'error',
//           text1: 'Invalid file type',
//           text2: 'Only JPG, PNG and PDF files are allowed',
//           position: 'bottom',
//         });
//         return;
//       }

//       const file = {
//         uri: asset.uri!,
//         type: asset.type || 'image/jpeg',
//         name: asset.fileName || `image_${Date.now()}.jpg`,
//       };

//       // SHOW IMAGE IMMEDIATELY
//       setSelectedFile(file);

//       // ONLY IMAGE LOADER
//       setUploadingImage(true);

//       const uploaded = await uploadFile(file);

//       const filePath = uploaded?.url || uploaded?.path || uploaded?.file || '';

//       setUploadedFilePath(filePath);

//       Toast.show({
//         type: 'success',
//         text1: 'File Uploaded',
//         position: 'bottom',
//       });
//     } catch (err: any) {
//       Toast.show({
//         type: 'error',
//         text1: 'Upload Failed',
//         text2: err?.message || 'Try again',
//         position: 'bottom',
//       });
//     } finally {
//       setUploadingImage(false);
//     }
//   };

//   const getFileName = (path?: string | null) => {
//     if (!path) return '';
//     return path.split('/').pop()?.substring(0, 25) + '...';
//   };
//   const openInBrowser = async (fileName: string) => {
//     if (!fileName) {
//       console.log('❌ No filename provided');
//       return;
//     }

//     const url = `https://apis.staffoo.com.au/staff_documents/${fileName}`;

//     console.log('📂 Opening URL:', url); // 👈 VERY IMPORTANT

//     try {
//       await Linking.openURL(url);
//     } catch (error) {
//       console.log('❌ Error opening URL:', error);
//     }
//   };

//   const validateFile = (file: any) => {
//     const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

//     if (!file) {
//       return {
//         valid: false,
//         message: 'No file selected',
//       };
//     }

//     if (file.fileSize && file.fileSize > MAX_FILE_SIZE) {
//       return {
//         valid: false,
//         message: 'File too large (Max 5MB allowed)',
//       };
//     }

//     const allowedTypes = [
//       'image/jpeg',
//       'image/png',
//       'image/jpg',
//       'application/pdf',
//     ];

//     if (file.type && !allowedTypes.includes(file.type)) {
//       return {
//         valid: false,
//         message: 'Only JPG, PNG, PDF allowed',
//       };
//     }

//     return {
//       valid: true,
//       message: '',
//     };
//   };
//   const handleSave = async () => {
//     // 1. Validation
//     if (!documentType) {
//       Toast.show({
//         type: 'error',
//         text1: 'Document Type required',
//         position: 'bottom',
//       });
//       return;
//     }

//     if (addDocNumber && documentNumber.trim().length > DOCUMENT_NUMBER_MAX) {
//       Toast.show({
//         type: 'error',
//         text1: `Document number cannot exceed ${DOCUMENT_NUMBER_MAX} characters`,
//         position: 'bottom',
//       });
//       return;
//     }

//     if (
//       setExpiration &&
//       expirationDate &&
//       expirationDate < new Date(new Date().setHours(0, 0, 0, 0))
//     ) {
//       Toast.show({
//         type: 'error',
//         text1: 'Past dates are not allowed',
//         position: 'bottom',
//       });
//       return;
//     }

//     // 🔥 FIX CRASH: Safe file check using optional chaining (?.)
//     const hasFile =
//       (selectedFile && Object.keys(selectedFile || {}).length > 0) ||
//       (uploadedFilePath && uploadedFilePath.trim().length > 0);

//     if (!hasFile) {
//       Toast.show({
//         type: 'error',
//         text1: 'Upload a file first',
//         text2: 'Document file is required',
//         position: 'bottom',
//       });
//       return;
//     }

//     // 🔥 FIX SILENT FAILURE: Only run file validation if a NEW file was actually chosen
//     if (selectedFile && Object.keys(selectedFile).length > 0) {
//       const validation = validateFile(selectedFile);

//       if (!validation.valid) {
//         Toast.show({
//           type: 'error',
//           text1: validation.message,
//           position: 'bottom',
//         });
//         return;
//       }
//     }

//     // Move everything else into the try block safely
//     setSavingDocument(true);

//     try {
//       // Determine final filename
//       let fileName = 'unknown_file';

//       if (uploadedFilePath) {
//         fileName =
//           uploadedFilePath.split('/').pop() ||
//           uploadedFilePath.split('\\').pop() ||
//           fileName;
//       } else if (selectedFile) {
//         fileName = selectedFile.name || selectedFile.fileName || fileName;
//       }

//       console.log('[FINAL FILE NAME SENT]:', fileName);

//       // Get user ID
//       const userStr = await AsyncStorage.getItem('user');
//       const user = userStr ? JSON.parse(userStr) : null;
//       const userId = user?.id;

//       if (!userId) throw new Error('User not found');

//       // SAFE YYYY-MM-DD FORMAT
//       let expDate: string | undefined = undefined;

//       if (setExpiration && expirationDate) {
//         const year = expirationDate.getFullYear();
//         const month = String(expirationDate.getMonth() + 1).padStart(2, '0');
//         const day = String(expirationDate.getDate()).padStart(2, '0');
//         expDate = `${year}-${month}-${day}`;
//       }

//       // Build payload
//       const payload: any = {
//         user_id: userId,
//         no: addDocNumber,
//         exp: setExpiration,
//         document_no: addDocNumber ? documentNumber.trim() : undefined,
//         document_expiry: expDate,
//         file: fileName,
//         document_type: documentType,
//         document_name: documentType,
//       };

//       const token = await AsyncStorage.getItem('@auth_token');

//       let endpoint = `${BASE_URL}/guard-add-documents`;

//       // EDIT MODE FIX — SEND ID
//       if (isEditMode && editingDocId) {
//         endpoint = `${BASE_URL}/guard-update-documents`;
//         payload.id = editingDocId;
//       }

//       console.log(`[POST DOCUMENTS] →`, endpoint, payload);

//       const response = await axios({
//         method: 'post',
//         url: endpoint,
//         data: payload,
//         headers: {
//           Authorization: `Bearer ${token}`,
//           'Content-Type': 'application/json',
//         },
//       });

//       console.log(`[POST DOCUMENTS] ← Success:`, response.data);

//       Toast.show({
//         type: 'success',
//         text1: isEditMode ? 'Document Updated' : 'Document Added',
//         text2: 'Successfully saved',
//         position: 'bottom',
//       });

//       // Refresh documents list
//       if (userId) {
//         const profile = await getUserProfile(userId);
//         if (profile?.success && profile?.data?.documents) {
//           setDocuments(profile.data.documents);
//         }
//       }

//       setModalVisible(false);

//       // Reset form
//       setDocumentType('');
//       setDocumentNumber('');
//       setDescription('');
//       setExpirationDate(null);
//       setAddDocNumber(false);
//       setSetExpiration(false);
//       setSelectedFile(null);
//       setUploadedFilePath(null);
//       setIsEditMode(false);
//       setEditingDocId(null);
//     } catch (err: any) {
//       console.error('[SAVE ERROR]', {
//         message: err.message,
//         status: err.response?.status,
//         response: err.response?.data,
//       });

//       let errorMsg =
//         err?.response?.data?.message || err.message || 'Failed to save';

//       if (err.response?.status === 404) {
//         errorMsg = 'Update endpoint not found – check backend route';
//       }

//       Toast.show({
//         type: 'error',
//         text1: isEditMode ? 'Update Failed' : 'Save Failed',
//         text2: errorMsg,
//         position: 'bottom',
//         visibilityTime: 5000,
//       });
//     } finally {
//       setSavingDocument(false);
//     }
//   };
//   const renderDocumentCard = ({ item }: { item: Document }) => (
//     <View style={styles.docCard}>
//       <View style={styles.docTop}>
//         <View style={styles.docIconBox}>
//           <FileText size={24} color="#5B67F1" />
//         </View>

//         <View style={{ flex: 1, marginLeft: 14 }}>
//           <Text style={styles.docTitle}>
//             {formatDocName(item.document_name)}
//           </Text>
//         </View>

//         <View style={styles.actions}>
//           <TouchableOpacity
//             style={styles.actionBtn}
//             onPress={() => {
//               if (item.file) {
//                 openInBrowser(item.file);
//               } else {
//                 Toast.show({
//                   type: 'error',
//                   text1: 'No file available',
//                   position: 'bottom',
//                 });
//               }
//             }}
//           >
//             <Eye size={18} color="#5B67F1" />
//           </TouchableOpacity>

//           <TouchableOpacity
//             style={styles.actionBtn}
//             onPress={() => handleOpenModal(item)}
//           >
//             <Pencil size={18} color="#64748B" />
//           </TouchableOpacity>
//         </View>
//       </View>

//       <View style={styles.divider} />

//       <View style={styles.infoRow}>
//         <Text style={styles.infoLabel}>Document No</Text>
//         <Text style={styles.infoValue}>
//           {item.document_no?.toUpperCase() || 'N/A'}
//         </Text>
//       </View>

//       <View style={styles.infoRow}>
//         <Text style={styles.infoLabel}>Expiry</Text>
//         <Text style={styles.infoValue}>
//           {item.document_expiry || 'No expiry'}
//         </Text>
//       </View>

//       <View style={styles.infoRow}>
//         <Text style={styles.infoLabel}>Document Type</Text>
//         <Text style={styles.infoValue}>
//           {formatDocName(item.document_type)}
//         </Text>
//       </View>
//     </View>
//   );

//   return (
//     <SafeAreaView style={styles.container}>
//       <StatusBar barStyle="dark-content" backgroundColor="#fff" />

//       <View style={styles.header}>
//         <TouchableOpacity onPress={() => navigation.goBack()}>
//           <ArrowLeft size={24} color="#fff" />
//         </TouchableOpacity>
//         <Text style={styles.headerTitle}>Documents</Text>
//         <View style={{ width: 24 }} />
//       </View>

//       {loadingDocs ? (
//         <ActivityIndicator
//           size="large"
//           color="#0A7C6E"
//           style={{ marginTop: 50 }}
//         />
//       ) : (
//         <FlatList
//           data={documents}
//           keyExtractor={item => item.id.toString()}
//           renderItem={renderDocumentCard}
//           contentContainerStyle={{ padding: 16 }}
//           ListEmptyComponent={
//             <Text
//               style={{
//                 textAlign: 'center',
//                 marginTop: 40,
//                 color: '#666',
//                 fontSize: 16,
//               }}
//             >
//               No documents found
//             </Text>
//           }
//         />
//       )}

//       {/* Modal */}
//       <Modal
//         animationType="slide"
//         transparent={true}
//         visible={modalVisible}
//         onRequestClose={() => setModalVisible(false)}
//       >
//         <View style={styles.modalOverlay}>
//           {/* ← Add this wrapper */}
//           <View style={styles.modalContent}>
//             <View style={styles.modalHeader}>
//               <Text style={styles.modalTitle}>
//                 {isEditMode ? 'Edit Document' : 'Upload Document'}
//               </Text>
//               <TouchableOpacity
//                 onPress={() => setModalVisible(false)}
//                 hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }} // Better touch area
//               >
//                 <X size={28} color="#000" />
//               </TouchableOpacity>
//             </View>

//             <ScrollView style={styles.modalBody}>
//               <View style={styles.imageUploadArea}>
//                 <View style={styles.imagePlaceholder}>
//                   {selectedFile ? (
//                     selectedFile.type?.startsWith('image/') ? (
//                       <Image
//                         source={{ uri: selectedFile.uri }}
//                         style={styles.previewImage}
//                         resizeMode="contain"
//                       />
//                     ) : (
//                       <View style={styles.fileIconContainer}>
//                         <FileText size={80} color="#6B7280" />
//                         <Text style={styles.fileNameText} numberOfLines={1}>
//                           {selectedFile.name || 'File selected'}
//                         </Text>
//                       </View>
//                     )
//                   ) : uploadedFilePath ? (
//                     uploadedFilePath.match(/\.(jpg|jpeg|png|webp)$/i) ? (
//                       <Image
//                         source={{
//                           uri: uploadedFilePath.startsWith('http')
//                             ? uploadedFilePath
//                             : `https://apis.staffoo.com.au/staff_documents/${uploadedFilePath}`,
//                         }}
//                         style={styles.previewImage}
//                         resizeMode="contain"
//                       />
//                     ) : (
//                       <View style={styles.fileIconContainer}>
//                         <FileText size={80} color="#6B7280" />
//                         <Text style={styles.fileNameText} numberOfLines={1}>
//                           {getFileName(uploadedFilePath)}
//                         </Text>
//                       </View>
//                     )
//                   ) : (
//                     <Text style={styles.noImageText}>NO FILE SELECTED</Text>
//                   )}
//                 </View>

//                 <View style={styles.imageActions}>
//                   {/* Upload */}
//                   <TouchableOpacity
//                     style={[styles.actionBtn, { backgroundColor: '#EF4444' }]}
//                     onPress={handleUpload}
//                     disabled={savingDocument || uploadingImage}
//                   >
//                     {uploadingImage ? (
//                       <ActivityIndicator size="small" color="#fff" />
//                     ) : (
//                       <Plus size={24} color="#fff" />
//                     )}
//                   </TouchableOpacity>

//                   {/* Preview */}
//                   <TouchableOpacity
//                     style={[styles.actionBtn, { backgroundColor: '#0A7C6E' }]}
//                     onPress={() => {
//                       if (selectedFile?.uri) {
//                         Linking.openURL(selectedFile.uri);
//                       } else if (uploadedFilePath) {
//                         openInBrowser(uploadedFilePath);
//                       }
//                     }}
//                   >
//                     <Eye size={24} color="#fff" />
//                   </TouchableOpacity>

//                   {/* Delete */}
//                   {/* <TouchableOpacity
//                   style={[styles.actionBtn, { backgroundColor: '#3B82F6' }]}
//                   onPress={() => {
//                     setSelectedFile(null);
//                     setUploadedFilePath(null);

//                     Toast.show({
//                       type: 'info',
//                       text1: 'File removed',
//                       position: 'bottom',
//                     });
//                   }}
//                 >
//                   <Trash2 size={24} color="#fff" />
//                 </TouchableOpacity> */}
//                 </View>
//               </View>

//               <View style={styles.checkboxGroup}>
//                 <View style={styles.checkboxRow}>
//                   <TouchableOpacity
//                     style={[
//                       styles.checkbox,
//                       addDocNumber && {
//                         backgroundColor: '#0A7C6E',
//                         borderColor: '#0A7C6E',
//                       },
//                     ]}
//                     onPress={() => setAddDocNumber(!addDocNumber)}
//                   >
//                     {addDocNumber && <Check size={16} color="#fff" />}
//                   </TouchableOpacity>
//                   <Text style={styles.checkboxLabel}>Add Document Number</Text>
//                 </View>

//                 {addDocNumber && (
//                   <View style={styles.inputGroup}>
//                     <Text style={styles.label}>
//                       Document Number <Text style={styles.required}>*</Text>
//                     </Text>
//                     <TextInput
//                       style={styles.inputBox}
//                       placeholder="Enter document number"
//                       placeholderTextColor="#9CA3AF"
//                       value={documentNumber}
//                       maxLength={DOCUMENT_NUMBER_MAX}
//                       autoCapitalize="characters"
//                       onChangeText={text => {
//                         const formatted = text.replace(/[^a-zA-Z0-9-]/g, '');
//                         setDocumentNumber(formatted.toUpperCase());
//                       }}
//                     />
//                     {!documentNumber && (
//                       <Text style={styles.errorText}>
//                         Document Number is required*
//                       </Text>
//                     )}
//                   </View>
//                 )}

//                 <View style={styles.checkboxRow}>
//                   <TouchableOpacity
//                     style={[
//                       styles.checkbox,
//                       setExpiration && {
//                         backgroundColor: '#0A7C6E',
//                         borderColor: '#0A7C6E',
//                       },
//                     ]}
//                     onPress={() => {
//                       setSetExpiration(!setExpiration);
//                       if (!setExpiration) setShowDatePicker(true);
//                     }}
//                   >
//                     {setExpiration && <Check size={16} color="#fff" />}
//                   </TouchableOpacity>
//                   <Text style={styles.checkboxLabel}>Set Expiration date</Text>
//                 </View>

//                 {setExpiration && (
//                   <View style={styles.inputGroup}>
//                     <Text style={styles.label}>
//                       Expiration Date <Text style={styles.required}>*</Text>
//                     </Text>
//                     <TouchableOpacity
//                       style={styles.dateButton}
//                       onPress={() => setShowDatePicker(true)}
//                     >
//                       <Text style={styles.dateText}>
//                         {expirationDate
//                           ? expirationDate.toLocaleDateString('en-GB', {
//                               day: '2-digit',
//                               month: '2-digit',
//                               year: 'numeric',
//                             })
//                           : 'Select date'}
//                       </Text>
//                       <Calendar
//                         size={20}
//                         color="#666"
//                         style={{ marginLeft: 10 }}
//                       />
//                     </TouchableOpacity>

//                     {!expirationDate && (
//                       <Text style={styles.errorText}>
//                         Expiration Date is required*
//                       </Text>
//                     )}
//                   </View>
//                 )}

//                 {showDatePicker && (
//                   <DateTimePicker
//                     value={expirationDate || new Date()}
//                     minimumDate={new Date()}
//                     mode="date"
//                     display={Platform.OS === 'ios' ? 'inline' : 'default'}
//                     onChange={(event, selectedDate) => {
//                       if (Platform.OS === 'android') {
//                         setShowDatePicker(false);
//                       }

//                       if (selectedDate) {
//                         setExpirationDate(selectedDate);
//                       }
//                     }}
//                   />
//                 )}
//               </View>
//             </ScrollView>

//             <TouchableOpacity
//               style={[
//                 styles.saveButton,
//                 savingDocument && styles.buttonDisabled,
//               ]}
//               onPress={handleSave}
//               disabled={savingDocument || uploadingImage}
//             >
//               {savingDocument ? (
//                 <ActivityIndicator color="#fff" size="small" />
//               ) : (
//                 <Text style={styles.saveButtonText}>
//                   {isEditMode ? 'Update' : 'Save'}
//                 </Text>
//               )}
//             </TouchableOpacity>
//           </View>
//         </View>
//       </Modal>
//     </SafeAreaView>
//   );
// }

// const styles = StyleSheet.create({
//   container: { flex: 1, backgroundColor: '#dfe6f9', paddingTop: 20 },
//   inputBox: {
//     borderWidth: 1,
//     borderColor: '#D1D5DB',
//     borderRadius: 12,
//     paddingHorizontal: 12,
//     paddingVertical: 10,
//     fontSize: 14,
//     backgroundColor: '#F9FAFB',
//     color: '#111827',
//   },
//   header: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     paddingHorizontal: 20,
//     paddingVertical: 14,
//     backgroundColor: '#0A7C6E',
//     marginHorizontal: 16,
//     borderRadius: 16,
//     // marginBottom: 10,
//   },

//   headerTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },
//   backBox: {
//     width: 40,
//     height: 40,
//     borderRadius: 12,
//     backgroundColor: '#fff',
//     borderWidth: 1,
//     borderColor: '#e0e0e0',
//     justifyContent: 'center',
//     alignItems: 'center',
//     marginRight: 7,
//     // subtle shadow for "box" feel
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 1 },
//     shadowOpacity: 0.08,
//     shadowRadius: 4,
//     elevation: 2,
//   },

//   addButton: {
//     backgroundColor: '#0A7C6E',
//     paddingVertical: 10,
//     paddingHorizontal: 18,
//     borderRadius: 10,
//     shadowColor: '#0A7C6E',
//     shadowOpacity: 0.3,
//     shadowRadius: 6,
//     elevation: 4,
//   },
//   addButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },

//   modalOverlay: {
//     flex: 1,
//     backgroundColor: 'rgba(0, 0, 0, 0.6)', // Nice dark backdrop
//     justifyContent: 'flex-end', // Slide up from bottom
//   },

//   modalContent: {
//     backgroundColor: '#fff',
//     borderTopLeftRadius: 32,
//     borderTopRightRadius: 32,
//     maxHeight: '95%', // Reduced from 100%
//     minHeight: '60%', // Optional: prevent too small
//     paddingTop: 10,
//   },
//   modalHeader: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     padding: 22,
//     borderBottomWidth: 1,
//     borderBottomColor: '#E5E7EB',
//     backgroundColor: '#F9FAFB',
//     borderTopLeftRadius: 24,
//     borderTopRightRadius: 24,
//   },
//   modalTitle: { fontSize: 20, fontWeight: '700', color: '#111827' },
//   modalBody: { padding: 22 },

//   inputGroup: { marginBottom: 22 },
//   label: { fontSize: 15, fontWeight: '600', color: '#374151', marginBottom: 6 },
//   required: { color: '#EF4444' },
//   pickerWrapper: {
//     borderWidth: 1,
//     borderColor: '#D1D5DB',
//     borderRadius: 12,
//     backgroundColor: '#F9FAFB',
//     overflow: 'hidden',
//   },
//   picker: { height: 50, color: '#111827' },
//   textArea: {
//     borderWidth: 1,
//     borderColor: '#D1D5DB',
//     borderRadius: 12,
//     padding: 14,
//     minHeight: 90,
//     textAlignVertical: 'top',
//     backgroundColor: '#F9FAFB',
//     fontSize: 14,
//   },
//   errorText: { color: '#EF4444', fontSize: 12, marginTop: 4 },

//   imageUploadArea: { marginVertical: 24, alignItems: 'center' },
//   imagePlaceholder: {
//     width: '100%',
//     height: 220,
//     backgroundColor: '#F8FAFC',
//     justifyContent: 'center',
//     alignItems: 'center',
//     borderRadius: 24,
//     borderWidth: 2,
//     borderColor: '#CBD5E1',
//     borderStyle: 'dashed',
//     overflow: 'hidden',
//   },
//   previewImage: { width: '100%', height: '100%', borderRadius: 16 },
//   fileIconContainer: {
//     alignItems: 'center',
//     justifyContent: 'center',
//     padding: 20,
//   },
//   fileNameText: {
//     marginTop: 12,
//     color: '#374151',
//     fontSize: 14,
//     textAlign: 'center',
//     paddingHorizontal: 10,
//   },
//   noImageText: { color: '#9CA3AF', fontSize: 14, textAlign: 'center' },

//   imageActions: { flexDirection: 'row', marginTop: 16, gap: 18 },

//   checkboxGroup: { marginTop: 12, marginBottom: 28 },
//   checkboxRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
//   checkbox: {
//     width: 26,
//     height: 26,
//     borderRadius: 6,
//     borderWidth: 2,
//     borderColor: '#D1D5DB',
//     justifyContent: 'center',
//     alignItems: 'center',
//     marginRight: 14,
//     backgroundColor: '#fff',
//   },
//   checkboxLabel: { fontSize: 15, color: '#374151', fontWeight: '500' },

//   dateButton: {
//     borderWidth: 1,
//     borderColor: '#D1D5DB',
//     borderRadius: 12,
//     padding: 14,
//     backgroundColor: '#F9FAFB',
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'space-between',
//   },
//   dateText: { color: '#111827', fontSize: 16, flex: 1 },

//   buttonDisabled: { opacity: 0.6 },

//   // Card styles
//   card: {
//     backgroundColor: '#fff',
//     borderRadius: 18,
//     marginBottom: 18,
//     padding: 5,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 3 },
//     shadowOpacity: 0.08,
//     shadowRadius: 8,
//     elevation: 4,
//   },
//   cardHeader: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     marginBottom: 3,
//   },
//   cardTitle: { fontSize: 17, fontWeight: '700', color: '#111827', flex: 1 },
//   cardActions: { flexDirection: 'row', alignItems: 'center' },
//   cardContent: { gap: 10 },
//   cardRow: { flexDirection: 'row', justifyContent: 'space-between' },
//   cardLabel: { fontSize: 14, color: '#6B7280', fontWeight: '500' },
//   cardValue: { fontSize: 14, color: '#111827', textAlign: 'right', flex: 1 },
//   heroSection: {
//     paddingTop: 55,
//     paddingHorizontal: 24,
//     paddingBottom: 35,
//   },

//   topRow: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//   },

//   backButton: {
//     width: 48,
//     height: 48,
//     borderRadius: 16,
//     backgroundColor: 'rgba(255,255,255,0.1)',
//     justifyContent: 'center',
//     alignItems: 'center',
//   },

//   floatingAddBtn: {
//     width: 52,
//     height: 52,
//     borderRadius: 18,
//     backgroundColor: '#5B67F1',
//     justifyContent: 'center',
//     alignItems: 'center',
//   },

//   heroTitle: {
//     fontSize: 32,
//     fontWeight: '800',
//     color: '#fff',
//     marginTop: 28,
//   },

//   heroSubtitle: {
//     fontSize: 15,
//     color: '#CBD5E1',
//     marginTop: 8,
//   },

//   docCard: {
//     backgroundColor: '#fff',
//     marginBottom: 10,
//     borderRadius: 20,
//     padding: 16,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 4 },
//     shadowOpacity: 0.08,
//     shadowRadius: 10,
//     elevation: 4,
//   },

//   docTop: {
//     flexDirection: 'row',
//     alignItems: 'center',
//   },

//   docIconBox: {
//     width: 45,
//     height: 45,
//     borderRadius: 18,
//     backgroundColor: '#EEF2FF',
//     justifyContent: 'center',
//     alignItems: 'center',
//   },

//   docTitle: {
//     fontSize: 17,
//     fontWeight: '700',
//     color: '#111827',
//   },

//   docSubtitle: {
//     fontSize: 13,
//     color: '#64748B',
//     marginTop: 4,
//   },

//   actions: {
//     flexDirection: 'row',
//     gap: 10,
//   },

//   actionBtn: {
//     width: 42,
//     height: 42,
//     borderRadius: 14,
//     backgroundColor: '#F8FAFC',
//     justifyContent: 'center',
//     alignItems: 'center',
//   },

//   divider: {
//     height: 1,
//     backgroundColor: '#E5E7EB',
//     marginVertical: 10,
//   },

//   infoRow: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     marginBottom: 10,
//   },

//   infoLabel: {
//     color: '#64748B',
//     fontSize: 13,
//   },

//   infoValue: {
//     color: '#111827',
//     fontSize: 14,
//     fontWeight: '500',
//   },

//   saveButton: {
//     height: 58,
//     borderRadius: 18,
//     justifyContent: 'center',
//     alignItems: 'center',
//     marginHorizontal: 24,
//     backgroundColor: '#0A7C6E',
//     marginBottom: 30,
//   },

//   saveButtonText: {
//     color: '#fff',
//     fontSize: 16,
//     fontWeight: '700',
//   },
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
} from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { getUserProfile, uploadFile } from '../services/authApi';
import { launchImageLibrary } from 'react-native-image-picker';
import LinearGradient from 'react-native-linear-gradient';

const { width } = Dimensions.get('window');

const BASE_URL = 'https://apis.staffoo.com.au/api';

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

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const DOC_NO_MAX = 20;

const ALLOWED_FILE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/jpg',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

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

  useEffect(() => {
    loadData();
  }, []);

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

  // const resetForm = () => {
  //   setSelectedFile(null);
  //   setUploadedFilePath(null);
  //   setDocumentNumber('');
  //   setExpirationDate(null);
  //   setAddDocNumber(false);
  //   setSetExpiration(false);
  //   setShowInlineCalendar(false);
  //   setCurrentCalendarMonth(new Date());
  // };
  const resetForm = () => {
    setSelectedFile(null);
    setUploadedFilePath(null);
    setDocumentNumber('');
    setExpirationDate(null);
    setAddDocNumber(false);
    setSetExpiration(false);
    setShowInlineCalendar(false);
    setCurrentCalendarMonth(new Date());

    // reset validation
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
      setUploadedFilePath(doc.file || null);
    } else {
      setIsEditMode(false);
      setEditingDocId(null);
      // Automatically toggle these values to true for a cleaner user experience on new creations
      setAddDocNumber(true);
      setSetExpiration(true);
      setShowInlineCalendar(true);
    }
    setModalVisible(true);
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
        Toast.show({
          type: 'error',
          text1: 'Unsupported file type',
          position: 'bottom',
        });
        return;
      }

      if (asset.fileSize && asset.fileSize > MAX_FILE_SIZE) {
        Toast.show({
          type: 'error',
          text1: 'File too large (Max 5MB)',
          position: 'bottom',
        });
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

      Toast.show({
        type: 'success',
        text1: 'File uploaded successfully',
        position: 'bottom',
      });
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Upload failed', position: 'bottom' });
    } finally {
      setUploading(false);
    }
  };

  const openInBrowser = async (fileName: string) => {
    if (!fileName) return;
    try {
      await Linking.openURL(
        `https://apis.staffoo.com.au/staff_documents/${fileName}`,
      );
    } catch (error) {
      console.log('Error opening file:', error);
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

    // clear previous errors
    setFileError('');
    setDocNumberError('');
    setExpiryError('');

    // FILE VALIDATION
    if (!selectedFile && !uploadedFilePath) {
      setFileError('Please upload a file');
      hasError = true;
    }

    // DOCUMENT NUMBER VALIDATION
    if (!documentNumber.trim()) {
      setDocNumberError('Please fill the document number');
      hasError = true;
    }

    // EXPIRY VALIDATION
    if (!expirationDate) {
      setExpiryError('Please select expiration date');
      hasError = true;
    }

    if (hasError) {
      Toast.show({
        type: 'error',
        text1: 'Please fill all mandatory fields',
        position: 'bottom',
      });
      return;
    }

    // TypeScript safety check
    if (!expirationDate) return;

    setSaving(true);

    try {
      let fileName =
        uploadedFilePath?.split('/').pop() ||
        selectedFile?.name ||
        'unknown_file';

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

      Toast.show({
        type: 'error',
        text1: 'Save Failed',
        position: 'bottom',
      });
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

  const renderDocumentCard = ({ item }: { item: Document }) => (
    <LinearGradient
      colors={['rgba(255,255,255,0.42)', 'rgba(255,255,255,0.22)']}
      style={styles.cardWrapper}
    >
      <View style={styles.docCard}>
        <View style={styles.docTop}>
          <View style={styles.docIconBox}>
            <FileText size={24} color={THEME.teal} />
          </View>
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={styles.docTitle}>
              {item.document_name?.toUpperCase() || 'DOCUMENT'}
            </Text>
          </View>
          <View style={styles.actions}>
            {/* <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => item.file && openInBrowser(item.file)}
            >
              <Eye size={18} color={THEME.teal} />
            </TouchableOpacity> */}
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => handleOpenModal(item)}
            >
              <Pencil size={18} color={THEME.teal} />
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.divider} />
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Document No</Text>
          <Text style={styles.infoValue}>
            {item.document_no?.toUpperCase() || 'N/A'}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Expiry</Text>
          <Text style={styles.infoValue}>
            {item.document_expiry || 'No expiry'}
          </Text>
        </View>
      </View>
    </LinearGradient>
  );

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
        <ActivityIndicator
          size="large"
          color={THEME.teal}
          style={{ marginTop: 50 }}
        />
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

      {/* Main Modal */}
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
                onPress={() => {
                  setModalVisible(false);
                  resetForm();
                }}
              >
                <X size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.imageUploadArea}>
                {(selectedFile || uploadedFilePath) && (
                  <View style={styles.imagePlaceholder}>
                    {selectedFile?.type?.startsWith('image/') ||
                    uploadedFilePath?.match(/\.(jpg|jpeg|png)/i) ? (
                      <Image
                        source={{
                          uri: selectedFile
                            ? selectedFile.uri
                            : `https://apis.staffoo.com.au/staff_documents/${uploadedFilePath}`,
                        }}
                        style={styles.previewImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <FileText size={48} color={THEME.teal} />
                    )}
                  </View>
                )}

                <TouchableOpacity
                  style={styles.uploadTriggerButton}
                  onPress={handleUpload}
                  disabled={uploading}
                >
                  {uploading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <CloudUpload
                        size={22}
                        color="#fff"
                        style={{ marginRight: 8 }}
                      />
                      <Text style={styles.uploadTriggerText}>
                        UPLOAD FILE (IMAGE, PDF, DOC) *
                      </Text>
                    </>
                  )}
                </TouchableOpacity>

                {fileError ? (
                  <Text style={styles.errorText}>{fileError}</Text>
                ) : null}
              </View>

              <View style={styles.checkboxGroup}>
                <TouchableOpacity
                  style={styles.checkboxRow}
                  onPress={() => setAddDocNumber(!addDocNumber)}
                >
                  <View
                    style={[
                      styles.checkbox,
                      addDocNumber && styles.checkboxChecked,
                    ]}
                  >
                    {addDocNumber && <Check size={14} color="#000" />}
                  </View>
                  <Text style={styles.checkboxLabel}>
                    ADD DOCUMENT NUMBER *
                  </Text>
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
                      const cleaned = text.replace(/[^0-9]/g, '');
                      const value = cleaned.slice(0, DOC_NO_MAX);

                      setDocumentNumber(value);

                      if (value.trim()) {
                        setDocNumberError('');
                      }
                    }}
                  />
                )}
                {docNumberError ? (
                  <Text style={styles.errorText}>{docNumberError}</Text>
                ) : null}

                <TouchableOpacity
                  style={styles.checkboxRow}
                  onPress={toggleExpiration}
                >
                  <View
                    style={[
                      styles.checkbox,
                      setExpiration && styles.checkboxChecked,
                    ]}
                  >
                    {setExpiration && <Check size={14} color="#000" />}
                  </View>
                  <Text style={styles.checkboxLabel}>
                    SET EXPIRATION DATE *
                  </Text>
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

                    {/* Inline Calendar */}
                    {showInlineCalendar && (
                      <View style={styles.inlineCalendar}>
                        <View style={styles.calendarHeaderRow}>
                          <Text style={styles.calendarMonthHeading}>
                            {currentCalendarMonth
                              .toLocaleString('default', {
                                month: 'long',
                                year: 'numeric',
                              })
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
                          {['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'].map(
                            (d, i) => (
                              <Text key={i} style={styles.weekDayLabel}>
                                {d}
                              </Text>
                            ),
                          )}
                        </View>

                        <View style={styles.daysGrid}>
                          {calendarGrid.map((date, idx) => {
                            if (!date)
                              return <View key={idx} style={styles.dayCell} />;

                            const today = new Date();
                            today.setHours(0, 0, 0, 0);

                            const targetDate = new Date(date);
                            targetDate.setHours(0, 0, 0, 0);

                            const isPast = targetDate < today;

                            const isSelected =
                              expirationDate &&
                              date.toDateString() ===
                                expirationDate.toDateString();
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
  container: { flex: 1, backgroundColor: THEME.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderColor: THEME.border,
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

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: THEME.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '92%',
  },
  errorText: {
    color: '#ff4d4f',
    fontSize: 12,
    marginTop: 6,
    marginLeft: 4,
    fontWeight: '500',
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
    backgroundColor: THEME.teal,
    margin: 20,
    height: 56,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonText: { color: '#000', fontSize: 16, fontWeight: '700' },
});
