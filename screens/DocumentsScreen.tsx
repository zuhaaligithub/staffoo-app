// screens/DocumentsScreen.tsx
import React, { useState, useEffect } from 'react';
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
    Platform,
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
    Plus,
    Trash2,
    Check,
    Calendar,
} from 'lucide-react-native';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';

import { pick, types } from '@react-native-documents/picker';
import ImageResizer from 'react-native-image-resizer';
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios, { isCancel } from 'axios';
import { getUserProfile, uploadFile } from '../services/authApi'; // adjust path

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

export default function DocumentsScreen({ navigation }: Props) {
    const [modalVisible, setModalVisible] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [editingDocId, setEditingDocId] = useState<number | null>(null);

    const [documentType, setDocumentType] = useState('');
    const [documentNumber, setDocumentNumber] = useState('');
    const [description, setDescription] = useState('');
    const [expirationDate, setExpirationDate] = useState<Date | null>(null);
    const [showDatePicker, setShowDatePicker] = useState(false);

    const [addDocNumber, setAddDocNumber] = useState(false);
    const [setExpiration, setSetExpiration] = useState(false);

    const [selectedFile, setSelectedFile] = useState<any>(null);
    const [uploadedFilePath, setUploadedFilePath] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);

    const [documents, setDocuments] = useState<Document[]>([]);
    const [loadingDocs, setLoadingDocs] = useState(true);
    const [userId, setUserId] = useState<string | number | null>(null);

    const documentTypes = [
        'Security License',
        'Application Form',
        'Birth Certificate',
        'Casual Contract Form',
        'Citizen Ship',
        'Driver Licence',
        'Medicare',
        'Passport',
        'Other',
    ];

    const formatDocName = (name: string) => {
        if (!name) return '';
        return name
            .split('_')
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    };

    // Load user ID and documents
    useEffect(() => {
        const loadData = async () => {
            try {
                const userStr = await AsyncStorage.getItem('user');
                if (userStr) {
                    const user = JSON.parse(userStr);
                    const id = user?.id;
                    setUserId(id);

                    if (id) {
                        const profile = await getUserProfile(id);
                        console.log('Full Profile Response:', profile);

                        if (profile?.success && profile?.data?.documents) {
                            setDocuments(profile.data.documents);
                        }
                    }
                }
            } catch (err) {
                console.error('Failed to load documents:', err);
                Toast.show({ type: 'error', text1: 'Could not load documents', position: 'bottom' });
            } finally {
                setLoadingDocs(false);
            }
        };

        loadData();
    }, []);

    const handleOpenModal = (doc?: Document) => {
        if (doc) {
            setIsEditMode(true);
            setEditingDocId(doc.id);

            // 🔥 Set document type correctly (Format if snake_case)
            setDocumentType(formatDocName(doc.document_type || ''));

            // 🔥 Set number
            setDocumentNumber(doc.document_no || '');
            setAddDocNumber(!!doc.document_no);

            // 🔥 FIXED DATE (API already gives YYYY-MM-DD)
           if (doc.document_expiry) {
    // Safe parse YYYY-MM-DD (or DD-MM-YYYY if your API sends that)
    const [year, month, day] = doc.document_expiry.split('-').map(Number);
    const safeDate = new Date(year, month - 1, day);   // month is 0-indexed
    setExpirationDate(safeDate);
    setSetExpiration(true);
} else {
    setExpirationDate(null);
    setSetExpiration(false);
}

            // 🔥 File
            setUploadedFilePath(doc.file || null);
            setSelectedFile(null);
        } else {
            // Add mode reset
            setIsEditMode(false);
            setEditingDocId(null);
            setDocumentType('');
            setDocumentNumber('');
            setAddDocNumber(false);
            setSetExpiration(false);
            setExpirationDate(null);
            setSelectedFile(null);
            setUploadedFilePath(null);
        }

        setModalVisible(true);
    };

    const handleUpload = async () => {
        try {
            const result = await pick({
                type: [types.pdf, types.images, types.allFiles],
                allowMultiSelection: false,
            });

            if (!result || result.length === 0) return;

            const file = result[0];

            setSelectedFile(file);
            setUploading(true);

            let fileToUpload = file;

            // 🟢 Compress image if image type
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

            // 🟢 Upload file
            const uploaded = await uploadFile(fileToUpload);

            const filePath =
                uploaded?.url ||
                uploaded?.path ||
                uploaded?.file ||
                '';

            setUploadedFilePath(filePath);

            Toast.show({
                type: 'success',
                text1: 'File Uploaded',
                position: 'bottom',
            });

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

    const getFileName = (path?: string | null) => {
        if (!path) return '';
        return path.split('/').pop()?.substring(0, 25) + '...';
    };
    const openInBrowser = async (fileName: string) => {
        if (!fileName) {
            console.log('❌ No filename provided');
            return;
        }

        const url = `https://apis.staffoo.com.au/staff_documents/${fileName}`;

        console.log('📂 Opening URL:', url);   // 👈 VERY IMPORTANT

        try {
            await Linking.openURL(url);
        } catch (error) {
            console.log('❌ Error opening URL:', error);
        }
    };
    const handleSave = async () => {
        // Validation
        if (!documentType) {
            Toast.show({ type: 'error', text1: 'Document Type required', position: 'bottom' });
            return;
        }

        if (addDocNumber && !documentNumber.trim()) {
            Toast.show({ type: 'error', text1: 'Document Number required', position: 'bottom' });
            return;
        }

        if (setExpiration && !expirationDate) {
            Toast.show({ type: 'error', text1: 'Expiration Date required', position: 'bottom' });
            return;
        }

        if (!selectedFile && !uploadedFilePath) {
            Toast.show({ type: 'error', text1: 'Upload a file first', position: 'bottom' });
            return;
        }

        setUploading(true);

        try {
            // Determine final filename
            let fileName = selectedFile?.name || selectedFile?.fileName || 'unknown_file';

            if (uploadedFilePath) {
                fileName =
                    uploadedFilePath.split('/').pop() ||
                    uploadedFilePath.split('\\').pop() ||
                    fileName;

                console.log('[FINAL FILE NAME SENT]:', fileName);
            }

            // === REPLACE THIS BLOCK in handleSave() ===

            // Get user ID
            const userStr = await AsyncStorage.getItem('user');
            const user = userStr ? JSON.parse(userStr) : null;
            const userId = user?.id;

            if (!userId) throw new Error('User not found');

            // 🔥 SAFE YYYY-MM-DD FORMAT (No timezone issues)
            let expDate: string | undefined = undefined;

            if (setExpiration && expirationDate) {
                const year = expirationDate.getFullYear();
                const month = String(expirationDate.getMonth() + 1).padStart(2, '0');
                const day = String(expirationDate.getDate()).padStart(2, '0');
                expDate = `${year}-${month}-${day}`;   // ← YYYY-MM-DD
            }

            // Build payload
            const payload: any = {
                user_id: userId,
                no: addDocNumber,
                exp: setExpiration,
                document_no: addDocNumber ? documentNumber.trim() : undefined,
                document_expiry: expDate,           // ← Now sends YYYY-MM-DD
                file: fileName,
                document_type: documentType,
                document_name: documentType,
            };

            const token = await AsyncStorage.getItem('@auth_token');

            let endpoint = `${BASE_URL}/guard-add-documents`;
            let method: 'post' | 'put' = 'post';

            // ✅ EDIT MODE FIX — SEND ID
            if (isEditMode && editingDocId) {
                endpoint = `${BASE_URL}/guard-update-documents`;
                method = 'post';

                payload.id = editingDocId; // 🔥 IMPORTANT LINE
            }

            console.log(`[${method.toUpperCase()} DOCUMENTS] →`, endpoint, payload);

            const response = await axios({
                method,
                url: endpoint,
                data: payload,
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            console.log(`[${method.toUpperCase()} DOCUMENTS] ← Success:`, response.data);

            Toast.show({
                type: 'success',
                text1: isEditMode ? 'Document Updated' : 'Document Added',
                text2: 'Successfully saved',
                position: 'bottom',
            });

            // Refresh documents list
            if (userId) {
                const profile = await getUserProfile(userId);
                if (profile?.success && profile?.data?.documents) {
                    setDocuments(profile.data.documents);
                }
            }

            setModalVisible(false);

            // Reset form
            setDocumentType('');
            setDocumentNumber('');
            setDescription('');
            setExpirationDate(null);
            setAddDocNumber(false);
            setSetExpiration(false);
            setSelectedFile(null);
            setUploadedFilePath(null);
            setIsEditMode(false);
            setEditingDocId(null);

        } catch (err: any) {
            console.error('[SAVE ERROR]', {
                message: err.message,
                status: err.response?.status,
                response: err.response?.data,
            });

            let errorMsg =
                err?.response?.data?.message ||
                err.message ||
                'Failed to save';

            if (err.response?.status === 404) {
                errorMsg = 'Update endpoint not found – check backend route';
            }

            Toast.show({
                type: 'error',
                text1: isEditMode ? 'Update Failed' : 'Save Failed',
                text2: errorMsg,
                position: 'bottom',
                visibilityTime: 5000,
            });
        } finally {
            setUploading(false);
        }
    };

    const renderDocumentCard = ({ item }: { item: Document }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{formatDocName(item.document_name)}</Text>
                <View style={styles.cardActions}>
                    <TouchableOpacity style={styles.backBox} onPress={() => openInBrowser(item.file || '')}>
                        <Eye size={20} color="#2563EB" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.backBox} onPress={() => handleOpenModal(item)}>
                        <Pencil size={20} color="#6B7280" />
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.cardContent}>
                <View style={styles.cardRow}>
                    <Text style={styles.cardLabel}>Doc No.:</Text>
                    <Text style={styles.cardValue}>{item.document_no || '-'}</Text>
                </View>
                <View style={styles.cardRow}>
                    <Text style={styles.cardLabel}>Expiry:</Text>
                    <Text style={styles.cardValue}>{item.document_expiry || '-'}</Text>
                </View>
                <View style={styles.cardRow}>
                    <Text style={styles.cardLabel}>Type:</Text>
                    <Text style={styles.cardValue}>{formatDocName(item.document_type)}</Text>
                </View>
                {item.file && (
                    <View style={styles.cardRow}>
                        <Text style={styles.cardLabel}>File:</Text>
                        <Text style={styles.cardValue} numberOfLines={1}>
                            {getFileName(item.file || '')}
                        </Text>
                    </View>
                )}
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#fff" />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBox}>
                    <ArrowLeft size={26} color="#000" />
                </TouchableOpacity>

                <Text style={styles.headerTitle}>Documents</Text>

                {/* <TouchableOpacity style={styles.addButton} onPress={() => handleOpenModal()}>
                    <Text style={styles.addButtonText}>Add documents</Text>
                </TouchableOpacity> */}
            </View>

            {loadingDocs ? (
                <ActivityIndicator size="large" color="#2EB1E2" style={{ marginTop: 50 }} />
            ) : (
                <FlatList
                    data={documents}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderDocumentCard}
                    contentContainerStyle={{ padding: 16 }}
                    ListEmptyComponent={
                        <Text style={{ textAlign: 'center', marginTop: 40, color: '#666', fontSize: 16 }}>
                            No documents found
                        </Text>
                    }
                />
            )}

            {/* Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{isEditMode ? 'Edit Document' : 'Upload Document'}</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <X size={28} color="#000" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalBody}>
                          

                            <View style={styles.imageUploadArea}>
                                <View style={styles.imagePlaceholder}>
                                    {selectedFile ? (
                                        selectedFile.type?.startsWith('image/') ? (
                                            <Image
                                                source={{ uri: selectedFile.uri }}
                                                style={styles.previewImage}
                                                resizeMode="contain"
                                            />
                                        ) : (
                                            <View style={styles.fileIconContainer}>
                                                <FileText size={80} color="#6B7280" />
                                                <Text style={styles.fileNameText} numberOfLines={1}>
                                                    {selectedFile.name || 'File selected'}
                                                </Text>
                                            </View>
                                        )
                                    ) : uploadedFilePath ? (
                                        uploadedFilePath.match(/\.(jpg|jpeg|png|webp)$/i) ? (
                                            <Image
                                                source={{
                                                    uri: uploadedFilePath.startsWith('http')
                                                        ? uploadedFilePath
                                                        : `https://apis.staffoo.com.au/staff_documents/${uploadedFilePath}`,
                                                }}
                                                style={styles.previewImage}
                                                resizeMode="contain"
                                            />
                                        ) : (
                                            <View style={styles.fileIconContainer}>
                                                <FileText size={80} color="#6B7280" />
                                                <Text style={styles.fileNameText} numberOfLines={1}>
                                                    {getFileName(uploadedFilePath)}
                                                </Text>
                                            </View>
                                        )
                                    ) : (
                                        <Text style={styles.noImageText}>NO FILE SELECTED</Text>
                                    )}
                                </View>

                                <View style={styles.imageActions}>
                                    {/* Upload */}
                                    <TouchableOpacity
                                        style={[styles.actionBtn, { backgroundColor: '#EF4444' }]}
                                        onPress={handleUpload}
                                        disabled={uploading}
                                    >
                                        {uploading ? (
                                            <ActivityIndicator size="small" color="#fff" />
                                        ) : (
                                            <Plus size={24} color="#fff" />
                                        )}
                                    </TouchableOpacity>

                                    {/* Preview */}
                                    <TouchableOpacity
                                        style={[styles.actionBtn, { backgroundColor: '#2EB1E2' }]}
                                        onPress={() => {
                                            if (selectedFile?.uri) {
                                                Linking.openURL(selectedFile.uri);
                                            } else if (uploadedFilePath) {
                                                openInBrowser(uploadedFilePath);
                                            }
                                        }}
                                    >
                                        <Eye size={24} color="#fff" />
                                    </TouchableOpacity>

                                    {/* Delete */}
                                    <TouchableOpacity
                                        style={[styles.actionBtn, { backgroundColor: '#3B82F6' }]}
                                        onPress={() => {
                                            setSelectedFile(null);
                                            setUploadedFilePath(null);
                                        }}
                                    >
                                        <Trash2 size={24} color="#fff" />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <View style={styles.checkboxGroup}>
                                <View style={styles.checkboxRow}>
                                    <TouchableOpacity
                                        style={[
                                            styles.checkbox,
                                            addDocNumber && { backgroundColor: '#2EB1E2', borderColor: '#2EB1E2' },
                                        ]}
                                        onPress={() => setAddDocNumber(!addDocNumber)}
                                    >
                                        {addDocNumber && <Check size={16} color="#fff" />}
                                    </TouchableOpacity>
                                    <Text style={styles.checkboxLabel}>Add Document Number</Text>
                                </View>

                                {addDocNumber && (
                                    <View style={styles.inputGroup}>
                                        <Text style={styles.label}>Document Number <Text style={styles.required}>*</Text></Text>
                                        <TextInput
                                            style={styles.inputBox}
                                            placeholder="Enter document number"
                                            placeholderTextColor="#9CA3AF"
                                            value={documentNumber}
                                            onChangeText={setDocumentNumber}
                                        />
                                        {!documentNumber && <Text style={styles.errorText}>Document Number is required*</Text>}
                                    </View>
                                )}

                                <View style={styles.checkboxRow}>
                                    <TouchableOpacity
                                        style={[
                                            styles.checkbox,
                                            setExpiration && { backgroundColor: '#2EB1E2', borderColor: '#2EB1E2' },
                                        ]}
                                        onPress={() => {
                                            setSetExpiration(!setExpiration);
                                            if (!setExpiration) setShowDatePicker(true);
                                        }}
                                    >
                                        {setExpiration && <Check size={16} color="#fff" />}
                                    </TouchableOpacity>
                                    <Text style={styles.checkboxLabel}>Set Expiration date</Text>
                                </View>

                                {setExpiration && (
                                    <View style={styles.inputGroup}>
                                        <Text style={styles.label}>Expiration Date <Text style={styles.required}>*</Text></Text>
                                        <TouchableOpacity style={styles.dateButton} onPress={() => setShowDatePicker(true)}>
                                            <Text style={styles.dateText}>
                                                {expirationDate
                                                    ? expirationDate.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
                                                    : 'Select date'}
                                            </Text>
                                            <Calendar size={20} color="#666" style={{ marginLeft: 10 }} />
                                        </TouchableOpacity>

                                        {!expirationDate && <Text style={styles.errorText}>Expiration Date is required*</Text>}
                                    </View>
                                )}

                                {showDatePicker && (
                                    <DateTimePicker
                                        value={expirationDate || new Date()}
                                        mode="date"
                                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                        onChange={(event, selectedDate) => {
                                            setShowDatePicker(Platform.OS === 'ios');
                                            if (selectedDate) setExpirationDate(selectedDate);
                                        }}
                                    />
                                )}
                            </View>
                        </ScrollView>

                        <TouchableOpacity
                            style={[styles.saveButton, uploading && styles.buttonDisabled]}
                            onPress={handleSave}
                            disabled={uploading}
                        >
                            {uploading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveButtonText}>{isEditMode ? 'Update' : 'Save'}</Text>}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F3F4F6', paddingTop: 20 },
    inputBox: {
        borderWidth: 1,
        borderColor: '#D1D5DB',
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 14,
        backgroundColor: '#F9FAFB',
        color: '#111827',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        // justifyContent: 'space-between',
        paddingHorizontal: 20,
        // paddingVertical: 28,

    },
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
        // subtle shadow for "box" feel
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 2,
    },
    headerTitle: { fontSize: 22, fontWeight: '700', color: '#111827', marginLeft: 50 },
    addButton: {
        backgroundColor: '#2563EB',
        paddingVertical: 10,
        paddingHorizontal: 18,
        borderRadius: 10,
        shadowColor: '#2563EB',
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 4,
    },
    addButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
    modalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '90%',
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 6,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 22,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
        backgroundColor: '#F9FAFB',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
    },
    modalTitle: { fontSize: 20, fontWeight: '700', color: '#111827' },
    modalBody: { padding: 22 },

    inputGroup: { marginBottom: 22 },
    label: { fontSize: 15, fontWeight: '600', color: '#374151', marginBottom: 6 },
    required: { color: '#EF4444' },
    pickerWrapper: {
        borderWidth: 1,
        borderColor: '#D1D5DB',
        borderRadius: 12,
        backgroundColor: '#F9FAFB',
        overflow: 'hidden',
    },
    picker: { height: 50, color: '#111827' },
    textArea: {
        borderWidth: 1,
        borderColor: '#D1D5DB',
        borderRadius: 12,
        padding: 14,
        minHeight: 90,
        textAlignVertical: 'top',
        backgroundColor: '#F9FAFB',
        fontSize: 14,
    },
    errorText: { color: '#EF4444', fontSize: 12, marginTop: 4 },

    imageUploadArea: { marginVertical: 24, alignItems: 'center' },
    imagePlaceholder: {
        width: 240,
        height: 240,
        backgroundColor: '#E5E7EB',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 16,
        borderWidth: 2,
        borderColor: '#D1D5DB',
        borderStyle: 'dashed',
        overflow: 'hidden',
    },
    previewImage: { width: '100%', height: '100%', borderRadius: 16 },
    fileIconContainer: { alignItems: 'center', justifyContent: 'center', padding: 20 },
    fileNameText: { marginTop: 12, color: '#374151', fontSize: 14, textAlign: 'center', paddingHorizontal: 10 },
    noImageText: { color: '#9CA3AF', fontSize: 14, textAlign: 'center' },

    imageActions: { flexDirection: 'row', marginTop: 16, gap: 18 },
    actionBtn: {
        width: 52,
        height: 52,
        borderRadius: 26,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },

    checkboxGroup: { marginTop: 12, marginBottom: 28 },
    checkboxRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
    checkbox: {
        width: 26,
        height: 26,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: '#D1D5DB',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
        backgroundColor: '#fff',
    },
    checkboxLabel: { fontSize: 15, color: '#374151', fontWeight: '500' },

    dateButton: {
        borderWidth: 1,
        borderColor: '#D1D5DB',
        borderRadius: 12,
        padding: 14,
        backgroundColor: '#F9FAFB',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    dateText: { color: '#111827', fontSize: 16, flex: 1 },

    saveButton: {
        backgroundColor: '#2EB1E2',
      
        paddingVertical: 16,
        marginHorizontal: 22,
        marginBottom: 24,
        borderRadius: 14,
        alignItems: 'center',
        shadowColor: '#2EB1E2',
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 2,
    },
    saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
    buttonDisabled: { opacity: 0.6 },

    // Card styles
    card: {
        backgroundColor: '#fff',
        borderRadius: 18,
        marginBottom: 18,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 4,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    cardTitle: { fontSize: 17, fontWeight: '700', color: '#111827', flex: 1 },
    cardActions: { flexDirection: 'row', alignItems: 'center', },
    cardContent: { gap: 10 },
    cardRow: { flexDirection: 'row', justifyContent: 'space-between' },
    cardLabel: { fontSize: 14, color: '#6B7280', fontWeight: '500' },
    cardValue: { fontSize: 14, color: '#111827', textAlign: 'right', flex: 1 },
});