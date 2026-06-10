// import React, { useEffect, useState } from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   FlatList,
//   TouchableOpacity,
//   SafeAreaView,
//   ActivityIndicator,
//   Alert,
//   Modal,
//   TextInput,
//   ScrollView,
//   Keyboard,
//   Platform,
// } from 'react-native';
// import {
//   MapPin,
//   Pencil,
//   Trash2,
//   User,
//   Phone,
//   ChevronDown,
//   Check,
//   ChevronLeft,
// } from 'lucide-react-native';
// import axios from './axiosInterceptor';
// import AsyncStorage from '@react-native-async-storage/async-storage';

// const COLORS = {
//   background: '#030508',
//   surface: '#07111A',
//   card: '#0D1421',
//   cardBorder: 'rgba(98, 97, 97, 0.83)',
//   primary: '#00A99D',
//   primaryGlow: 'rgba(0,169,157,0.25)',
//   primaryBorder: 'rgba(0,169,157,0.25)',
//   text: '#FFFFFF',
//   textSecondary: '#94A3B8',
//   textMuted: '#4A6080',
//   success: '#34C88A',
//   danger: '#F87171',
//   dangerBg: 'rgba(248,88,88,0.12)',
//   warning: '#F5A623',
//   warningBg: 'rgba(245,166,35,0.08)',
// };

// const BASE_URL = 'https://apis.staffoo.com.au/api';
// const GOOGLE_API_KEY = 'AIzaSyCS-DB39Kk-Z25C5GWymVGshXIALbjXPGY';

// interface StaffMember {
//   id: string;
//   name: string;
//   email: string;
//   phone: string;
//   location: string;
//   status: 'Pending' | 'Active';
// }

// interface AddStaffForm {
//   name: string;
//   email: string;
//   password: string;
//   phone: string;
//   security_license_no: string;
//   gender: string;
//   residential_status: string;
//   address: string;
// }

// interface EditStaffForm {
//   name: string;
//   email: string;
//   phone: string;
//   security_license_no: string;
//   gender: string;
//   residential_status: string;
//   address: string;
// }

// const EMPTY_ADD_FORM: AddStaffForm = {
//   name: '',
//   email: '',
//   password: '',
//   phone: '',
//   security_license_no: '',
//   gender: '',
//   residential_status: '',
//   address: '',
// };

// const EMPTY_EDIT_FORM: EditStaffForm = {
//   name: '',
//   email: '',
//   phone: '',
//   security_license_no: '',
//   gender: '',
//   residential_status: '',
//   address: '',
// };

// const residentialOptions = [
//   'Student Visa',
//   'Bridging Visa',
//   'Citizen',
//   'Permanent Residence',
//   'Visa Subclass 485',
//   'Other',
// ];

// // ── FormField OUTSIDE component to prevent keyboard dismiss on re-render ──────
// const FormField = ({
//   placeholder,
//   value,
//   onChangeText,
//   secureTextEntry = false,
// }: {
//   placeholder: string;
//   value: string;
//   onChangeText: (text: string) => void;
//   secureTextEntry?: boolean;
// }) => (
//   <TextInput
//     style={styles.input}
//     placeholder={placeholder}
//     placeholderTextColor={COLORS.textMuted}
//     value={value}
//     onChangeText={onChangeText}
//     secureTextEntry={secureTextEntry}
//     autoCorrect={false}
//     autoCapitalize="none"
//     blurOnSubmit={false}
//   />
// );

// type Props = { navigation: any };

// export default function StaffManagement({ navigation }: Props) {
//   const [editErrors, setEditErrors] = useState<any>({});
//   const [staff, setStaff] = useState<StaffMember[]>([]);
//   const [rawStaff, setRawStaff] = useState<any[]>([]); // Store raw API data for edit pre-population
//   const [loading, setLoading] = useState(false);
//   const [activeModalTab, setActiveModalTab] = useState<
//     'personal' | 'documents' | 'onboarding'
//   >('personal');
//   // Add Modal
//   const [showAddModal, setShowAddModal] = useState(false);
//   const [addForm, setAddForm] = useState<AddStaffForm>(EMPTY_ADD_FORM);
//   const [addLoading, setAddLoading] = useState(false);
//   const [addPredictions, setAddPredictions] = useState<any[]>([]);
//   const [showAddSuggestions, setShowAddSuggestions] = useState(false);
//   const [showAddResidentialDropdown, setShowAddResidentialDropdown] =
//     useState(false);
//   const [addErrors, setAddErrors] = useState<any>({});
//   // Edit Modal
//   const [showEditModal, setShowEditModal] = useState(false);
//   const [editForm, setEditForm] = useState<EditStaffForm>(EMPTY_EDIT_FORM);
//   const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
//   const [editLoading, setEditLoading] = useState(false);
//   const [editPredictions, setEditPredictions] = useState<any[]>([]);
//   const [showEditSuggestions, setShowEditSuggestions] = useState(false);
//   const [showEditResidentialDropdown, setShowEditResidentialDropdown] =
//     useState(false);

//   useEffect(() => {
//     getStaff();
//   }, []);

//   const getAuthHeaders = async () => {
//     const token = await AsyncStorage.getItem('@auth_token');
//     return { Authorization: `Bearer ${token}` };
//   };

//   const getUserId = async (): Promise<number | null> => {
//     const userData = await AsyncStorage.getItem('user');
//     if (!userData) return null;
//     const user = JSON.parse(userData);
//     return user.id;
//   };

//   const getStaff = async () => {
//     try {
//       setLoading(true);
//       const userId = await getUserId();
//       if (!userId) return;
//       const headers = await getAuthHeaders();
//       const response = await axios.get(
//         `${BASE_URL}/get-contractor-staff/${userId}`,
//         { headers },
//       );
//       const apiData = response.data?.guards || [];

//       // Save raw data for edit pre-population
//       setRawStaff(apiData);

//       const formatted: StaffMember[] = apiData.map((item: any) => ({
//         id: item.id.toString(),
//         name: item.name || 'N/A',
//         email: item.email || 'N/A',
//         phone: item.staff?.phone || item.phone || 'N/A',
//         location: item.address || 'N/A',
//         gender: item.staff?.gender || item.gender || 'N/A',
//         status: item.is_active ? 'Active' : 'Pending',
//       }));
//       setStaff(formatted);
//     } catch (error: any) {
//       console.log('getStaff error:', error?.response?.data || error.message);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const fetchPlaces = async (text: string, isAdd: boolean) => {
//     if (text.length < 3) {
//       if (isAdd) {
//         setAddPredictions([]);
//         setShowAddSuggestions(false);
//       } else {
//         setEditPredictions([]);
//         setShowEditSuggestions(false);
//       }
//       return;
//     }
//     try {
//       const res = await fetch(
//         `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
//           text,
//         )}&key=${GOOGLE_API_KEY}`,
//       );
//       const json = await res.json();
//       if (isAdd) {
//         setAddPredictions(json.predictions || []);
//         setShowAddSuggestions(true);
//       } else {
//         setEditPredictions(json.predictions || []);
//         setShowEditSuggestions(true);
//       }
//     } catch (err) {
//       console.log('Places API error:', err);
//     }
//   };

//   const selectPlace = (description: string, isAdd: boolean) => {
//     Keyboard.dismiss();
//     if (isAdd) {
//       setAddForm(prev => ({ ...prev, address: description }));
//       setShowAddSuggestions(false);
//       setAddPredictions([]);
//     } else {
//       setEditForm(prev => ({ ...prev, address: description }));
//       setShowEditSuggestions(false);
//       setEditPredictions([]);
//     }
//   };

//   const validateAddForm = () => {
//     const errors: any = {};

//     if (!addForm.name.trim()) errors.name = 'Full name is required';
//     if (!addForm.email.trim()) errors.email = 'Email is required';
//     else if (!/^\S+@\S+\.\S+$/.test(addForm.email))
//       errors.email = 'Invalid email format';

//     if (!addForm.password.trim()) errors.password = 'Password is required';
//     else if (addForm.password.length < 6)
//       errors.password = 'Password must be at least 6 characters';

//     if (!addForm.phone.trim()) errors.phone = 'Phone is required';

//     // ✅ SECURITY LICENSE REQUIRED (your request)
//     if (!addForm.security_license_no.trim())
//       errors.security_license_no = 'Security license number is required';

//     if (!addForm.residential_status)
//       errors.residential_status = 'Residential status is required';

//     if (!addForm.address.trim()) errors.address = 'Address is required';

//     setAddErrors(errors);

//     return Object.keys(errors).length === 0;
//   };

//   const addStaff = async () => {
//     if (!validateAddForm()) return;

//     try {
//       setAddLoading(true);
//       const headers = await getAuthHeaders();
//       const userId = await getUserId();

//       const payload = { ...addForm, user_id: userId };

//       await axios.post(`${BASE_URL}/admin/create-staff`, payload, { headers });

//       setShowAddModal(false);
//       setAddForm(EMPTY_ADD_FORM);
//       setAddErrors({});
//       getStaff();
//     } catch (error: any) {
//       console.log('addStaff error:', error?.response?.data || error.message);
//       Alert.alert(
//         'Error',
//         error?.response?.data?.message || 'Failed to add staff.',
//       );
//     } finally {
//       setAddLoading(false);
//     }
//   };

//   const validateEditForm = () => {
//     const errors: any = {};

//     if (!editForm.name.trim()) errors.name = 'Full name is required';

//     if (!editForm.email.trim()) {
//       errors.email = 'Email is required';
//     } else if (!/^\S+@\S+\.\S+$/.test(editForm.email)) {
//       errors.email = 'Invalid email format';
//     }

//     if (!editForm.phone.trim()) {
//       errors.phone = 'Phone is required';
//     }

//     if (!editForm.security_license_no.trim()) {
//       errors.security_license_no = 'Security license number is required';
//     }

//     if (!editForm.residential_status) {
//       errors.residential_status = 'Residential status is required';
//     }

//     if (!editForm.address.trim()) {
//       errors.address = 'Address is required';
//     }

//     setEditErrors(errors);

//     return Object.keys(errors).length === 0;
//   };
//   const normalizeGender = (g?: string) => {
//     if (!g) return '';
//     return g.charAt(0).toUpperCase() + g.slice(1).toLowerCase();
//   };
//   // Uses rawStaff to find nested staff data for pre-population
//   const openEditModal = (item: StaffMember) => {
//     const raw = rawStaff.find(g => g.id.toString() === item.id);
//     if (!raw) return;

//     setEditingStaffId(item.id);
//     setEditForm({
//       name: raw.name || '',
//       email: raw.email || '',
//       phone: raw.staff?.phone || raw.phone || '',
//       security_license_no: raw.staff?.security_license_no || '',
//       gender: normalizeGender(raw.staff?.gender || raw.gender),

//       residential_status: raw.staff?.staff_document_type || '',
//       address: raw.address || '',
//     });
//     setShowEditModal(true);
//   };

//   const updateStaff = async () => {
//     if (!editingStaffId) return;

//     if (!validateEditForm()) return; // ✅ ADD THIS

//     try {
//       setEditLoading(true);

//       const headers = await getAuthHeaders();
//       const userId = await getUserId();

//       const payload = {
//         name: editForm.name,
//         email: editForm.email,
//         phone: editForm.phone,
//         security_license_no: editForm.security_license_no,
//         gender: editForm.gender,
//         staff_document_type: editForm.residential_status,
//         address: editForm.address,
//         user_id: userId,
//       };

//       await axios.put(
//         `${BASE_URL}/admin/update-staff/${editingStaffId}`,
//         payload,
//         { headers },
//       );

//       setShowEditModal(false);
//       setEditErrors({}); // ✅ clear errors
//       getStaff();
//     } catch (error: any) {
//       Alert.alert('Error', 'Failed to update staff.');
//     } finally {
//       setEditLoading(false);
//     }
//   };
//   const capitalizeWords = (text: string = '') =>
//     text
//       .split(' ')
//       .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
//       .join(' ');
//   const deleteStaff = (id: string, name: string) => {
//     Alert.alert('Delete Staff', `Are you sure you want to delete "${name}"?`, [
//       { text: 'Cancel', style: 'cancel' },
//       {
//         text: 'Delete',
//         style: 'destructive',
//         onPress: async () => {
//           try {
//             const headers = await getAuthHeaders();
//             await axios.delete(`${BASE_URL}/admin/staff-delete/${id}`, {
//               headers,
//             });
//             getStaff();
//           } catch {
//             Alert.alert('Error', 'Failed to delete staff.');
//           }
//         },
//       },
//     ]);
//   };

//   const renderItem = ({ item }: { item: StaffMember }) => (
//     <View style={styles.card}>
//       <View style={styles.cardHeader}>
//         <View style={styles.avatar}>
//           <User size={24} color="#14E6C9" />
//         </View>
//         <View style={styles.userInfo}>
//           <Text style={styles.name}>
//             {capitalizeWords(item.name)}
//           </Text>
//           <Text style={styles.email}>{item.email}</Text>
//         </View>
//         <View
//           style={[
//             styles.statusBadge,
//             item.status === 'Pending'
//               ? styles.pendingBadge
//               : styles.activeBadge,
//           ]}
//         >
//           <Text
//             style={[
//               styles.statusText,
//               item.status === 'Pending'
//                 ? styles.pendingText
//                 : styles.activeText,
//             ]}
//           >
//             {item.status}
//           </Text>
//         </View>
//       </View>
//       <View style={styles.infoRow}>
//         <Phone size={16} color="#64748B" />
//         <Text style={styles.infoText}>{item.phone}</Text>
//       </View>
//       <View style={styles.infoRow}>
//         <MapPin size={16} color="#64748B" />
//         <Text style={styles.infoText}>{item.location}</Text>
//       </View>
//       <View style={styles.actionContainer}>
//         <TouchableOpacity
//           style={styles.editButton}
//           onPress={() => openEditModal(item)}
//         >
//           <Pencil size={18} color="#fff" />
//           <Text style={styles.actionText}>Edit</Text>
//         </TouchableOpacity>
//         <TouchableOpacity
//           style={styles.deleteButton}
//           onPress={() => deleteStaff(item.id, item.name)}
//         >
//           <Trash2 size={18} color="#fff" />
//           <Text style={styles.actionText}>Delete</Text>
//         </TouchableOpacity>
//       </View>
//     </View>
//   );

//   return (
//     <SafeAreaView style={styles.container}>
//       {/* ─── Header ─────────────────────────────────────────────────────────── */}
//       <View style={styles.header}>
//         <TouchableOpacity
//           style={styles.backButton}
//           onPress={() => navigation.goBack()}
//           hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
//         >
//           <ChevronLeft size={26} color={COLORS.text} />
//         </TouchableOpacity>
//         <View style={styles.headerCenter}>
//           <Text style={styles.title}>Staff Management</Text>
//           <Text style={styles.subtitle}>Manage all staff members</Text>
//         </View>
//         <TouchableOpacity
//           style={styles.addButton}
//           onPress={() => {
//             setAddForm(EMPTY_ADD_FORM);
//             setShowAddModal(true);
//           }}
//         >
//           <Text style={styles.addButtonText}>+ Add Staff</Text>
//         </TouchableOpacity>
//       </View>

//       {loading ? (
//         <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
//       ) : (
//         <FlatList
//           data={staff}
//           renderItem={renderItem}
//           keyExtractor={item => item.id}
//           showsVerticalScrollIndicator={false}
//           contentContainerStyle={styles.listContent}
//           ListEmptyComponent={
//             <Text style={styles.emptyText}>No staff members found.</Text>
//           }
//         />
//       )}

//       {/* ─── ADD MODAL ──────────────────────────────────────────────────────── */}
//       <Modal
//         visible={showAddModal}
//         transparent
//         animationType="slide"
//         onRequestClose={() => setShowAddModal(false)}
//       >
//         <View style={styles.modalOverlay}>
//           <View style={styles.modalCard}>
//             <View style={styles.modalHeader}>
//               <View style={styles.modalHeader}>
//                 <View style={styles.headerTabs}>
//                   <TouchableOpacity
//                     style={[
//                       styles.tab,
//                       activeModalTab === 'personal' && styles.tabActive,
//                     ]}
//                     onPress={() => setActiveModalTab('personal')}
//                   >
//                     <Text
//                       style={[
//                         styles.tabText,
//                         activeModalTab === 'personal' && styles.tabTextActive,
//                       ]}
//                     >
//                       Personal Info
//                     </Text>
//                   </TouchableOpacity>
//                   {/* <TouchableOpacity
//                     style={styles.tabButton}
//                     onPress={() => {
//                       setShowAddModal(false);
//                       navigation.navigate('Documents');
//                     }}
//                   >
//                     <Text style={styles.tabText}>Documents</Text>
//                   </TouchableOpacity> */}

//                   {/* <TouchableOpacity
//                     style={styles.tabButton}
//                     onPress={() => {
//                       setShowAddModal(false);
//                       navigation.navigate('StaffForms');
//                     }}
//                   >
//                     <Text style={styles.tabText}>Onboarding</Text>
//                   </TouchableOpacity> */}
//                 </View>

//                 <TouchableOpacity onPress={() => setShowAddModal(false)}>
//                   <Text style={styles.closeIcon}>✕</Text>
//                 </TouchableOpacity>
//               </View>
//             </View>

//             <ScrollView
//               contentContainerStyle={styles.modalBody}
//               keyboardShouldPersistTaps="never"
//               showsVerticalScrollIndicator={false}
//             >
//               <FormField
//                 placeholder="Full Name *"
//                 value={addForm.name}
//                 onChangeText={t => setAddForm(p => ({ ...p, name: t }))}
//               />
//               {addErrors.name && (
//                 <Text style={styles.errorText}>{addErrors.name}</Text>
//               )}
//               <FormField
//                 placeholder="Email *"
//                 value={addForm.email}
//                 onChangeText={t => setAddForm(p => ({ ...p, email: t }))}
//               />
//               {addErrors.email && (
//                 <Text style={styles.errorText}>{addErrors.email}</Text>
//               )}
//               <FormField
//                 placeholder="Password *"
//                 value={addForm.password}
//                 onChangeText={t => setAddForm(p => ({ ...p, password: t }))}
//                 secureTextEntry
//               />
//               {addErrors.password && (
//                 <Text style={styles.errorText}>{addErrors.password}</Text>
//               )}
//               <FormField
//                 placeholder="Phone *"
//                 value={addForm.phone}
//                 onChangeText={t => setAddForm(p => ({ ...p, phone: t }))}
//               />
//               {addErrors.phone && (
//                 <Text style={styles.errorText}>{addErrors.phone}</Text>
//               )}
//               <FormField
//                 placeholder="Security License No *"
//                 value={addForm.security_license_no}
//                 onChangeText={t =>
//                   setAddForm(p => ({ ...p, security_license_no: t }))
//                 }
//               />
//               {addErrors.security_license_no && (
//                 <Text style={styles.errorText}>
//                   {addErrors.security_license_no}
//                 </Text>
//               )}

//               {/* Residential Status Dropdown */}
//               <View
//                 style={[
//                   styles.dropdownContainer,
//                   { zIndex: showAddResidentialDropdown ? 9999 : 1 },
//                 ]}
//               >
//                 <TouchableOpacity
//                   style={styles.selectBox}
//                   activeOpacity={0.8}
//                   onPress={() =>
//                     setShowAddResidentialDropdown(!showAddResidentialDropdown)
//                   }
//                 >
//                   <Text
//                     style={{
//                       color: addForm.residential_status
//                         ? COLORS.text
//                         : COLORS.textMuted,
//                     }}
//                   >
//                     {addForm.residential_status || 'Residential Status'}
//                   </Text>
//                   <ChevronDown size={20} color={COLORS.textSecondary} />
//                 </TouchableOpacity>
//                 {addErrors.gender && (
//                   <Text style={styles.errorText}>{addErrors.gender}</Text>
//                 )}

//                 {showAddResidentialDropdown && (
//                   <View style={styles.customDropdown}>
//                     <ScrollView nestedScrollEnabled>
//                       {residentialOptions.map(item => (
//                         <TouchableOpacity
//                           key={item}
//                           style={styles.dropdownItem}
//                           onPress={() => {
//                             setAddForm(prev => ({
//                               ...prev,
//                               residential_status: item,
//                             }));
//                             setShowAddResidentialDropdown(false);
//                           }}
//                         >
//                           <Text style={styles.dropdownItemText}>{item}</Text>
//                           {addForm.residential_status === item && (
//                             <Check size={18} color={COLORS.primary} />
//                           )}
//                         </TouchableOpacity>
//                       ))}
//                     </ScrollView>
//                   </View>
//                 )}
//                 {addErrors.residential_status && (
//                   <Text style={styles.errorText}>
//                     {addErrors.residential_status}
//                   </Text>
//                 )}
//               </View>

//               {/* Address Autocomplete */}
//               <View style={styles.addressContainer}>
//                 <TextInput
//                   style={styles.input}
//                   placeholder="Start typing address..."
//                   placeholderTextColor={COLORS.textMuted}
//                   value={addForm.address}
//                   onChangeText={t => {
//                     setAddForm(p => ({ ...p, address: t }));
//                     fetchPlaces(t, true);
//                   }}
//                   autoCorrect={false}
//                 />
//                 {addErrors.address && (
//                   <Text style={styles.errorText}>{addErrors.address}</Text>
//                 )}
//                 {showAddSuggestions && addPredictions.length > 0 && (
//                   <View style={styles.suggestionsContainer}>
//                     {addPredictions.map((pred: any) => (
//                       <TouchableOpacity
//                         key={pred.place_id}
//                         style={styles.suggestionItem}
//                         onPress={() => selectPlace(pred.description, true)}
//                       >
//                         <MapPin size={16} color={COLORS.primary} />
//                         <Text style={styles.suggestionText}>
//                           {pred.description}
//                         </Text>
//                       </TouchableOpacity>
//                     ))}
//                   </View>
//                 )}
//               </View>

//               {/* Gender */}
//               <View style={styles.dropdownContainer}>
//                 <Text style={styles.label}>Gender</Text>
//                 <View style={styles.genderOptions}>
//                   {['Male', 'Female', 'Other'].map(g => (
//                     <TouchableOpacity
//                       key={g}
//                       style={[
//                         styles.genderOption,
//                         addForm.gender === g && styles.genderOptionActive,
//                       ]}
//                       onPress={() => setAddForm(p => ({ ...p, gender: g }))}
//                     >
//                       <Text
//                         style={
//                           addForm.gender === g
//                             ? styles.genderOptionTextActive
//                             : styles.genderOptionText
//                         }
//                       >
//                         {g}
//                       </Text>
//                     </TouchableOpacity>
//                   ))}
//                 </View>
//               </View>
//             </ScrollView>

//             <View style={styles.footer}>
//               <TouchableOpacity
//                 style={styles.cancelButton}
//                 onPress={() => setShowAddModal(false)}
//               >
//                 <Text style={styles.cancelText}>Cancel</Text>
//               </TouchableOpacity>
//               <TouchableOpacity
//                 style={[styles.saveButton, addLoading && styles.buttonDisabled]}
//                 onPress={addStaff}
//                 disabled={addLoading}
//               >
//                 {addLoading ? (
//                   <ActivityIndicator color="#fff" size="small" />
//                 ) : (
//                   <Text style={styles.saveText}>Save Staff</Text>
//                 )}
//               </TouchableOpacity>
//             </View>
//           </View>
//         </View>
//       </Modal>

//       {/* ─── EDIT MODAL ─────────────────────────────────────────────────────── */}
//       <Modal
//         visible={showEditModal}
//         transparent
//         animationType="slide"
//         onRequestClose={() => setShowEditModal(false)}
//       >
//         <View style={styles.modalOverlay}>
//           <View style={styles.modalCard}>
//             <View style={styles.modalHeader}>
//               <View style={styles.modalHeader}>
//                 <View style={styles.headerTabs}>
//                   <TouchableOpacity
//                     style={[
//                       styles.tab,
//                       activeModalTab === 'personal' && styles.tabActive,
//                     ]}
//                     onPress={() => setActiveModalTab('personal')}
//                   >
//                     <Text
//                       style={[
//                         styles.tabText,
//                         activeModalTab === 'personal' && styles.tabTextActive,
//                       ]}
//                     >
//                       Personal Info
//                     </Text>
//                   </TouchableOpacity>
//                   <TouchableOpacity
//                     style={styles.tabButton}
//                     onPress={() => {
//                       setShowEditModal(false); // ✅ correct
//                       navigation.navigate('Documents');
//                     }}
//                   >
//                     <Text style={styles.tabText}>Documents</Text>
//                   </TouchableOpacity>

//                   <TouchableOpacity
//                     style={styles.tabButton}
//                     onPress={() => {
//                       setShowEditModal(false); // ✅ correct
//                       navigation.navigate('StaffForms');
//                     }}
//                   >
//                     <Text style={styles.tabText}>Onboarding</Text>
//                   </TouchableOpacity>

//                   <TouchableOpacity onPress={() => setShowEditModal(false)}>
//                     <Text style={styles.closeIcon}>✕</Text>
//                   </TouchableOpacity>
//                 </View>
//               </View>
//             </View>

//             <ScrollView
//               contentContainerStyle={styles.modalBody}
//               keyboardShouldPersistTaps="never"
//               showsVerticalScrollIndicator={false}
//             >
//               <FormField
//                 placeholder="Full Name *"
//                 value={editForm.name}
//                 onChangeText={t => setEditForm(p => ({ ...p, name: t }))}
//               />
//               {editErrors.name && (
//                 <Text style={styles.errorText}>{editErrors.name}</Text>
//               )}
//               <FormField
//                 placeholder="Email *"
//                 value={editForm.email}
//                 onChangeText={t => setEditForm(p => ({ ...p, email: t }))}
//               />
//               {editErrors.email && (
//                 <Text style={styles.errorText}>{editErrors.email}</Text>
//               )}
//               <FormField
//                 placeholder="Phone"
//                 value={editForm.phone}
//                 onChangeText={t => setEditForm(p => ({ ...p, phone: t }))}
//               />
//               {editErrors.phone && (
//                 <Text style={styles.errorText}>{editErrors.phone}</Text>
//               )}
//               <FormField
//                 placeholder="Security License No"
//                 value={editForm.security_license_no}
//                 onChangeText={t =>
//                   setEditForm(p => ({ ...p, security_license_no: t }))
//                 }
//               />
//               {editErrors.security_license_no && (
//                 <Text style={styles.errorText}>
//                   {editErrors.security_license_no}
//                 </Text>
//               )}

//               {/* Residential Status Dropdown */}
//               <View
//                 style={[
//                   styles.dropdownContainer,
//                   { zIndex: showEditResidentialDropdown ? 9999 : 1 },
//                 ]}
//               >
//                 <TouchableOpacity
//                   style={styles.selectBox}
//                   activeOpacity={0.8}
//                   onPress={() =>
//                     setShowEditResidentialDropdown(!showEditResidentialDropdown)
//                   }
//                 >
//                   <Text
//                     style={{
//                       color: editForm.residential_status
//                         ? COLORS.text
//                         : COLORS.textMuted,
//                     }}
//                   >
//                     {editForm.residential_status || 'Residential Status'}
//                   </Text>
//                   <ChevronDown size={20} color={COLORS.textSecondary} />
//                 </TouchableOpacity>
//                 {editErrors.residential_status && (
//                   <Text style={styles.errorText}>
//                     {editErrors.residential_status}
//                   </Text>
//                 )}

//                 {showEditResidentialDropdown && (
//                   <View style={styles.customDropdown}>
//                     <ScrollView nestedScrollEnabled>
//                       {residentialOptions.map(opt => (
//                         <TouchableOpacity
//                           key={opt}
//                           style={styles.dropdownItem}
//                           onPress={() => {
//                             setEditForm(p => ({
//                               ...p,
//                               residential_status: opt,
//                             }));
//                             setShowEditResidentialDropdown(false);
//                           }}
//                         >
//                           <Text style={styles.dropdownItemText}>{opt}</Text>
//                           {editForm.residential_status === opt && (
//                             <Check size={18} color={COLORS.primary} />
//                           )}
//                         </TouchableOpacity>
//                       ))}
//                     </ScrollView>
//                   </View>
//                 )}
//               </View>

//               {/* Address Autocomplete */}
//               <View style={styles.addressContainer}>
//                 <TextInput
//                   style={styles.input}
//                   placeholder="Start typing address..."
//                   placeholderTextColor={COLORS.textMuted}
//                   value={editForm.address}
//                   onChangeText={t => {
//                     setEditForm(p => ({ ...p, address: t }));
//                     fetchPlaces(t, false);
//                   }}
//                   autoCorrect={false}



//                 />
//                 {editErrors.address && (
//                   <Text style={styles.errorText}>{editErrors.address}</Text>
//                 )}
//                 {showEditSuggestions && editPredictions.length > 0 && (
//                   <View style={styles.suggestionsContainer}>
//                     {editPredictions.map((pred: any) => (
//                       <TouchableOpacity
//                         key={pred.place_id}
//                         style={styles.suggestionItem}
//                         onPress={() => selectPlace(pred.description, false)}
//                       >
//                         <MapPin size={16} color={COLORS.primary} />
//                         <Text style={styles.suggestionText}>
//                           {pred.description}
//                         </Text>
//                       </TouchableOpacity>
//                     ))}
//                   </View>
//                 )}
//               </View>

//               {/* Gender */}
//               <View style={styles.dropdownContainer}>
//                 <Text style={styles.label}>Gender</Text>
//                 <View style={styles.genderOptions}>
//                   {['Male', 'Female', 'Other'].map(g => (
//                     <TouchableOpacity
//                       key={g}
//                       style={[
//                         styles.genderOption,
//                         editForm.gender === g && styles.genderOptionActive,
//                       ]}
//                       onPress={() => setEditForm(p => ({ ...p, gender: g }))}
//                     >
//                       <Text
//                         style={
//                           editForm.gender === g
//                             ? styles.genderOptionTextActive
//                             : styles.genderOptionText
//                         }
//                       >
//                         {g}
//                       </Text>
//                     </TouchableOpacity>
//                   ))}
//                 </View>
//               </View>
//             </ScrollView>

//             <View style={styles.footer}>
//               <TouchableOpacity
//                 style={styles.cancelButton}
//                 onPress={() => setShowEditModal(false)}
//               >
//                 <Text style={styles.cancelText}>Cancel</Text>
//               </TouchableOpacity>
//               <TouchableOpacity
//                 style={[
//                   styles.saveButton,
//                   editLoading && styles.buttonDisabled,
//                 ]}
//                 onPress={updateStaff}
//                 disabled={editLoading}
//               >
//                 {editLoading ? (
//                   <ActivityIndicator color="#fff" size="small" />
//                 ) : (
//                   <Text style={styles.saveText}>Update Staff</Text>
//                 )}
//               </TouchableOpacity>
//             </View>
//           </View>
//         </View>
//       </Modal>
//     </SafeAreaView>
//   );
// }

// const styles = StyleSheet.create({
//   container: { flex: 1, backgroundColor: COLORS.background, paddingTop: Platform.OS === 'android' ? 20 : 0 },

//   // ── Header ────────────────────────────────────────────────────────────────
//   header: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     marginBottom: 20,
//     paddingHorizontal: 16,
//     paddingTop: 16,
//   },
//   backButton: {
//     width: 40,
//     height: 40,
//     borderRadius: 20,
//     backgroundColor: COLORS.card,
//     borderWidth: 1,
//     borderColor: COLORS.cardBorder,
//     justifyContent: 'center',
//     alignItems: 'center',
//     marginRight: 10,
//   },
//   headerCenter: { flex: 1 },
//   title: { fontSize: 20, fontWeight: '800', color: COLORS.text },
//   subtitle: { color: COLORS.textSecondary, marginTop: 4, fontSize: 13 },
//   addButton: {
//     backgroundColor: COLORS.primary,
//     paddingHorizontal: 14,
//     paddingVertical: 12,
//     borderRadius: 14,
//     shadowColor: COLORS.primary,
//     shadowOpacity: 0.4,
//     shadowRadius: 12,
//     elevation: 8,
//   },
//   addButtonText: { color: COLORS.text, fontWeight: '700', fontSize: 13 },

//   // ── List ──────────────────────────────────────────────────────────────────
//   listContent: { paddingHorizontal: 16, paddingBottom: 30 },
//   emptyText: {
//     color: COLORS.textSecondary,
//     textAlign: 'center',
//     marginTop: 60,
//     fontSize: 15,
//   },

//   // ── Staff Card ────────────────────────────────────────────────────────────
//   card: {
//     backgroundColor: COLORS.card,
//     borderRadius: 20,
//     padding: 14,
//     marginBottom: 16,
//     borderWidth: 1,
//     borderColor: COLORS.cardBorder,
//   },
//   cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
//   avatar: {
//     width: 58,
//     height: 58,
//     borderRadius: 29,
//     backgroundColor: COLORS.primaryGlow,
//     justifyContent: 'center',
//     alignItems: 'center',
//     borderWidth: 1,
//     borderColor: COLORS.primaryBorder,
//     marginRight: 14,
//   },
//   errorText: {
//     color: '#F87171',
//     fontSize: 10,
//     width: '100%',
//     marginLeft: 4,
//     marginTop: 4,
//   },
//   userInfo: { flex: 1 },
//   name: { color: COLORS.text, fontSize: 17, fontWeight: '700' },
//   email: { color: COLORS.textSecondary, fontSize: 13, marginTop: 4 },
//   infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
//   infoText: {
//     color: COLORS.textSecondary,
//     marginLeft: 10,
//     fontSize: 14,
//     flex: 1,
//   },
//   tab: {
//     paddingVertical: 8,
//     paddingHorizontal: 14,
//     borderRadius: 20,
//   },

//   tabActive: {
//     backgroundColor: COLORS.primary,
//   },
//   statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 30 },
//   pendingBadge: {
//     backgroundColor: COLORS.warningBg,
//     borderWidth: 1,
//     borderColor: COLORS.warning,
//   },
//   activeBadge: {
//     backgroundColor: 'rgba(52,200,138,0.12)',
//     borderWidth: 1,
//     borderColor: COLORS.success,
//   },
//   statusText: { fontWeight: '700', fontSize: 12 },
//   pendingText: { color: COLORS.warning },
//   activeText: { color: COLORS.success },
//   actionContainer: { flexDirection: 'row', marginTop: 5 },
//   editButton: {
//     flex: 1,
//     backgroundColor: COLORS.primary,
//     borderRadius: 14,
//     paddingVertical: 12,
//     flexDirection: 'row',
//     justifyContent: 'center',
//     alignItems: 'center',
//     marginRight: 8,
//   },

//   deleteButton: {
//     flex: 1,
//     backgroundColor: COLORS.dangerBg,
//     borderWidth: 1,
//     borderColor: COLORS.danger,
//     borderRadius: 14,
//     paddingVertical: 12,
//     flexDirection: 'row',
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   actionText: { color: COLORS.text, fontWeight: '600', marginLeft: 6 },

//   // ── Modal ─────────────────────────────────────────────────────────────────
//   modalOverlay: {
//     flex: 1,
//     backgroundColor: 'rgba(0,0,0,0.75)',
//     justifyContent: 'center',
//     // alignItems: 'center',
//   },
//   modalCard: {
//     width: '100%',
//     maxHeight: '100%',
//     backgroundColor: COLORS.card,
//     borderTopLeftRadius: 24,
//     borderTopRightRadius: 24,
//     borderBottomLeftRadius: 24,
//     borderBottomRightRadius: 24,
//     borderWidth: 1,
//     borderColor: COLORS.cardBorder,
//     overflow: 'hidden',
//   },
//   modalHeader: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     padding: 10,
//     // borderBottomWidth: 1,
//     // borderBottomColor: COLORS.cardBorder,
//   },
//   modalTitle: { color: COLORS.text, fontSize: 18, fontWeight: '700' },
//   closeIcon: { color: COLORS.textSecondary, fontSize: 18, padding: 4 },
//   modalBody: { padding: 15, gap: 12 },
//   input: {
//     backgroundColor: '#aaa9a9',
//     borderWidth: 1,
//     borderColor: COLORS.cardBorder,
//     borderRadius: 50,
//     color: COLORS.text,
//     paddingHorizontal: 16,
//     height: 45,
//   },
//   label: { color: COLORS.textSecondary, marginBottom: 6, fontSize: 14 },

//   selectBox: {
//     backgroundColor: '#aaa9a9',
//     borderWidth: 1,
//     borderColor: COLORS.cardBorder,
//     borderRadius: 50,
//     paddingHorizontal: 16,
//     height: 45,
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'space-between',
//   },
//   genderOptions: {
//     flexDirection: 'row',
//     gap: 8,
//     marginTop: 8,
//     flexWrap: 'wrap',
//   },
//   genderOption: {
//     paddingHorizontal: 16,
//     paddingVertical: 10,
//     borderRadius: 20,
//     backgroundColor: '#aaa9a9',
//     borderWidth: 1,
//     borderColor: COLORS.cardBorder,
//   },
//   genderOptionActive: {
//     backgroundColor: COLORS.primary,
//     borderColor: COLORS.primary,
//   },
//   genderOptionText: { color: COLORS.textSecondary },
//   genderOptionTextActive: { color: '#000', fontWeight: '600' },

//   addressContainer: { marginBottom: 4 },
//   suggestionsContainer: {
//     backgroundColor: COLORS.surface,
//     borderRadius: 12,
//     marginTop: 4,
//     maxHeight: 220,
//     borderWidth: 1,
//     borderColor: COLORS.cardBorder,
//   },
//   suggestionItem: {
//     padding: 12,
//     borderBottomWidth: 1,
//     borderBottomColor: COLORS.cardBorder,
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 8,
//   },
//   suggestionText: { color: COLORS.text, flex: 1 },

//   // ── Footer ────────────────────────────────────────────────────────────────
//   footer: {
//     flexDirection: 'row',
//     justifyContent: 'flex-end',
//     padding: 20,
//     borderTopWidth: 1,
//     borderTopColor: COLORS.cardBorder,
//   },
//   cancelButton: {
//     backgroundColor: COLORS.surface,
//     paddingHorizontal: 24,
//     paddingVertical: 12,
//     borderRadius: 14,
//     marginRight: 10,
//   },
//   cancelText: { color: COLORS.textSecondary, fontWeight: '600' },
//   saveButton: {
//     backgroundColor: COLORS.primary,
//     paddingHorizontal: 30,
//     paddingVertical: 12,
//     borderRadius: 14,
//     minWidth: 100,
//     alignItems: 'center',
//   },
//   saveText: { color: COLORS.text, fontWeight: '700' },
//   buttonDisabled: { opacity: 0.6 },

//   dropdownContainer: {
//     position: 'relative',
//   },
//   customDropdown: {
//     position: 'absolute',
//     top: 52,
//     left: 0,
//     right: 0,
//     backgroundColor: COLORS.card,
//     borderRadius: 14,
//     borderWidth: 1,
//     borderColor: COLORS.cardBorder,
//     maxHeight: 220,
//     zIndex: 99999,
//     elevation: 30,
//     shadowColor: '#000',
//     shadowOpacity: 0.25,
//     shadowRadius: 8,
//     shadowOffset: { width: 0, height: 4 },
//   },
//   dropdownItem: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     paddingHorizontal: 16,
//     paddingVertical: 14,
//     borderBottomWidth: 1,
//     borderBottomColor: COLORS.cardBorder,
//   },
//   dropdownItemText: {
//     color: COLORS.text,
//     fontSize: 15,
//   },
//   headerTabs: {
//     flexDirection: 'row',
//     flex: 1,
//     justifyContent: 'center',
//     gap: 10,
//   },

//   tabButton: {
//     paddingVertical: 6,
//     paddingHorizontal: 14,
//     borderRadius: 20,
//     backgroundColor: 'rgba(255,255,255,0.08)',
//   },

//   tabButtonActive: {
//     backgroundColor: COLORS.primary,
//   },

//   tabText: {
//     fontSize: 13,
//     color: COLORS.textMuted,
//     fontWeight: '600',
//   },

//   tabTextActive: {
//     color: '#fff',
//   },



// });





import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  ScrollView,
  Keyboard,
  Platform,
  Image,
} from 'react-native';
import {
  MapPin,
  Pencil,
  Trash2,
  User,
  Phone,
  ChevronDown,
  Check,
  ChevronLeft,
  FileText,
  Upload,
  X,
} from 'lucide-react-native';
import axios from './axiosInterceptor';
import AsyncStorage from '@react-native-async-storage/async-storage';

const COLORS = {
  background: '#030508',
  surface: '#07111A',
  card: '#0D1421',
  cardBorder: 'rgba(98, 97, 97, 0.83)',
  primary: '#00A99D',
  primaryGlow: 'rgba(0,169,157,0.25)',
  primaryBorder: 'rgba(0,169,157,0.25)',
  text: '#FFFFFF',
  textSecondary: '#94A3B8',
  textMuted: '#4A6080',
  success: '#34C88A',
  danger: '#F87171',
  dangerBg: 'rgba(248,88,88,0.12)',
  warning: '#F5A623',
  warningBg: 'rgba(245,166,35,0.08)',
};

const BASE_URL = 'https://apis.staffoo.com.au/api';
const GOOGLE_API_KEY = 'AIzaSyCS-DB39Kk-Z25C5GWymVGshXIALbjXPGY';

interface StaffMember {
  id: string;
  name: string;
  email: string;
  phone: string;
  location: string;
  status: 'Pending' | 'Active';
}

interface StaffDocument {
  id: number;
  user_id: number;
  document_category: string;
  document_name: string;
  document_url?: string;
  expiry_date?: string;
  status?: string;
}

interface AddStaffForm {
  name: string;
  email: string;
  password: string;
  phone: string;
  security_license_no: string;
  gender: string;
  residential_status: string;
  address: string;
}

interface EditStaffForm {
  name: string;
  email: string;
  phone: string;
  security_license_no: string;
  gender: string;
  residential_status: string;
  address: string;
}

const EMPTY_ADD_FORM: AddStaffForm = {
  name: '',
  email: '',
  password: '',
  phone: '',
  security_license_no: '',
  gender: '',
  residential_status: '',
  address: '',
};

const EMPTY_EDIT_FORM: EditStaffForm = {
  name: '',
  email: '',
  phone: '',
  security_license_no: '',
  gender: '',
  residential_status: '',
  address: '',
};

const residentialOptions = [
  'Student Visa',
  'Bridging Visa',
  'Citizen',
  'Permanent Residence',
  'Visa Subclass 485',
  'Other',
];

// ── FormField OUTSIDE component to prevent keyboard dismiss on re-render ──────
const FormField = ({
  placeholder,
  value,
  onChangeText,
  secureTextEntry = false,
}: {
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  secureTextEntry?: boolean;
}) => (
  <TextInput
    style={styles.input}
    placeholder={placeholder}
    placeholderTextColor={COLORS.textMuted}
    value={value}
    onChangeText={onChangeText}
    secureTextEntry={secureTextEntry}
    autoCorrect={false}
    autoCapitalize="none"
    blurOnSubmit={false}
  />
);

type Props = { navigation: any };

export default function StaffManagement({ navigation }: Props) {
  const [editErrors, setEditErrors] = useState<any>({});
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [rawStaff, setRawStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeModalTab, setActiveModalTab] = useState<'personal' | 'documents' | 'onboarding'>('personal');

  // Add Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState<AddStaffForm>(EMPTY_ADD_FORM);
  const [addLoading, setAddLoading] = useState(false);
  const [addPredictions, setAddPredictions] = useState<any[]>([]);
  const [showAddSuggestions, setShowAddSuggestions] = useState(false);
  const [showAddResidentialDropdown, setShowAddResidentialDropdown] = useState(false);
  const [addErrors, setAddErrors] = useState<any>({});

  // Edit Modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState<EditStaffForm>(EMPTY_EDIT_FORM);
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editPredictions, setEditPredictions] = useState<any[]>([]);
  const [showEditSuggestions, setShowEditSuggestions] = useState(false);
  const [showEditResidentialDropdown, setShowEditResidentialDropdown] = useState(false);

  // Documents
  const [staffDocuments, setStaffDocuments] = useState<StaffDocument[]>([]);

  useEffect(() => {
    getStaff();
  }, []);

  const getAuthHeaders = async () => {
    const token = await AsyncStorage.getItem('@auth_token');
    return { Authorization: `Bearer ${token}` };
  };

  const getUserId = async (): Promise<number | null> => {
    const userData = await AsyncStorage.getItem('user');
    if (!userData) return null;
    const user = JSON.parse(userData);
    return user.id;
  };

  const getStaff = async () => {
    try {
      setLoading(true);
      const userId = await getUserId();
      if (!userId) return;
      const headers = await getAuthHeaders();
      const response = await axios.get(
        `${BASE_URL}/get-contractor-staff/${userId}`,
        { headers },
      );
      const apiData = response.data?.guards || [];
      setRawStaff(apiData);

      const formatted: StaffMember[] = apiData.map((item: any) => ({
        id: item.id.toString(),
        name: item.name || 'N/A',
        email: item.email || 'N/A',
        phone: item.staff?.phone || item.phone || 'N/A',
        location: item.address || 'N/A',
        gender: item.staff?.gender || item.gender || 'N/A',
        status: item.is_active ? 'Active' : 'Pending',
      }));
      setStaff(formatted);
    } catch (error: any) {
      console.log('getStaff error:', error?.response?.data || error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchPlaces = async (text: string, isAdd: boolean) => {
    if (text.length < 3) {
      if (isAdd) {
        setAddPredictions([]);
        setShowAddSuggestions(false);
      } else {
        setEditPredictions([]);
        setShowEditSuggestions(false);
      }
      return;
    }
    try {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(text)}&key=${GOOGLE_API_KEY}`,
      );
      const json = await res.json();
      if (isAdd) {
        setAddPredictions(json.predictions || []);
        setShowAddSuggestions(true);
      } else {
        setEditPredictions(json.predictions || []);
        setShowEditSuggestions(true);
      }
    } catch (err) {
      console.log('Places API error:', err);
    }
  };

  const selectPlace = (description: string, isAdd: boolean) => {
    Keyboard.dismiss();
    if (isAdd) {
      setAddForm(prev => ({ ...prev, address: description }));
      setShowAddSuggestions(false);
      setAddPredictions([]);
    } else {
      setEditForm(prev => ({ ...prev, address: description }));
      setShowEditSuggestions(false);
      setEditPredictions([]);
    }
  };

  const validateAddForm = () => {
    const errors: any = {};
    if (!addForm.name.trim()) errors.name = 'Full name is required';
    if (!addForm.email.trim()) errors.email = 'Email is required';
    else if (!/^\S+@\S+\.\S+$/.test(addForm.email)) errors.email = 'Invalid email format';
    if (!addForm.password.trim()) errors.password = 'Password is required';
    else if (addForm.password.length < 6) errors.password = 'Password must be at least 6 characters';
    if (!addForm.phone.trim()) errors.phone = 'Phone is required';
    if (!addForm.security_license_no.trim()) errors.security_license_no = 'Security license number is required';
    if (!addForm.residential_status) errors.residential_status = 'Residential status is required';
    if (!addForm.address.trim()) errors.address = 'Address is required';
    setAddErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const addStaff = async () => {
    if (!validateAddForm()) return;

    try {
      setAddLoading(true);

      const headers = await getAuthHeaders();
      const userId = await getUserId();

      const payload = {
        ...addForm,
        user_id: userId,
      };

      const response = await axios.post(
        `${BASE_URL}/admin/create-staff`,
        payload,
        { headers },
      );

      Alert.alert('Success', 'Staff added successfully.');

      setShowAddModal(false);
      setAddForm(EMPTY_ADD_FORM);
      setAddErrors({});
      getStaff();
    } catch (error: any) {
      console.log('addStaff error:', error?.response?.data || error.message);

      const errorData = error?.response?.data;
      const message =
        errorData?.message ||
        errorData?.error ||
        error?.message ||
        '';

      if (
        message.toLowerCase().includes('duplicate entry') ||
        message.toLowerCase().includes('email') ||
        message.toLowerCase().includes('already exists') ||
        message.toLowerCase().includes('already been taken')
      ) {
        Alert.alert(
          'Email Already Exists',
          'This email already exists. Please use a different email address.',
        );
      } else {
        Alert.alert(
          'Error',
          message || 'Failed to add staff.',
        );
      }
    } finally {
      setAddLoading(false);
    }
  };

  const validateEditForm = () => {
    const errors: any = {};
    if (!editForm.name.trim()) errors.name = 'Full name is required';
    if (!editForm.email.trim()) errors.email = 'Email is required';
    else if (!/^\S+@\S+\.\S+$/.test(editForm.email)) errors.email = 'Invalid email format';
    if (!editForm.phone.trim()) errors.phone = 'Phone is required';
    if (!editForm.security_license_no.trim()) errors.security_license_no = 'Security license number is required';
    if (!editForm.residential_status) errors.residential_status = 'Residential status is required';
    if (!editForm.address.trim()) errors.address = 'Address is required';
    setEditErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const normalizeGender = (g?: string) => {
    if (!g) return '';
    return g.charAt(0).toUpperCase() + g.slice(1).toLowerCase();
  };

  const openEditModal = (item: StaffMember) => {
    const raw = rawStaff.find(g => g.id.toString() === item.id);
    if (!raw) return;
    setEditingStaffId(item.id);
    setEditForm({
      name: raw.name || '',
      email: raw.email || '',
      phone: raw.staff?.phone || raw.phone || '',
      security_license_no: raw.staff?.security_license_no || '',
      gender: normalizeGender(raw.staff?.gender || raw.gender),
      residential_status: raw.staff?.staff_document_type || '',
      address: raw.address || '',
    });
    // Load documents from raw response
    setStaffDocuments(raw.documents || []);
    setActiveModalTab('personal');
    setShowEditModal(true);
  };

  const updateStaff = async () => {
    if (!editingStaffId) return;
    if (!validateEditForm()) return;
    try {
      setEditLoading(true);
      const headers = await getAuthHeaders();
      const userId = await getUserId();
      const payload = {
        name: editForm.name,
        email: editForm.email,
        phone: editForm.phone,
        security_license_no: editForm.security_license_no,
        gender: editForm.gender,
        staff_document_type: editForm.residential_status,
        address: editForm.address,
        user_id: userId,
      };
      await axios.put(
        `${BASE_URL}/admin/update-staff/${editingStaffId}`,
        payload,
        { headers },
      );
      setShowEditModal(false);
      setEditErrors({});
      getStaff();
    } catch (error: any) {
      console.log('updateStaff error:', error?.response?.data || error.message);
      Alert.alert('Error', error?.response?.data?.message || 'Failed to update staff.');
    } finally {
      setEditLoading(false);
    }
  };

  const capitalizeWords = (text: string = '') =>
    text
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');

  const deleteStaff = (id: string, name: string) => {
    Alert.alert('Delete Staff', `Are you sure you want to delete "${name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const headers = await getAuthHeaders();
            await axios.delete(`${BASE_URL}/admin/staff-delete/${id}`, { headers });
            getStaff();
          } catch {
            Alert.alert('Error', 'Failed to delete staff.');
          }
        },
      },
    ]);
  };

  const getDocumentStatusColor = (status?: string) => {
    if (!status) return COLORS.textMuted;
    switch (status.toLowerCase()) {
      case 'approved': return COLORS.success;
      case 'rejected': return COLORS.danger;
      case 'pending': return COLORS.warning;
      default: return COLORS.textMuted;
    }
  };

  const getDocumentStatusBg = (status?: string) => {
    if (!status) return 'rgba(74,96,128,0.15)';
    switch (status.toLowerCase()) {
      case 'approved': return 'rgba(52,200,138,0.12)';
      case 'rejected': return COLORS.dangerBg;
      case 'pending': return COLORS.warningBg;
      default: return 'rgba(74,96,128,0.15)';
    }
  };

  // ── Personal Info Form (shared between add/edit) ──────────────────────────
  const renderPersonalForm = (isAdd: boolean) => {
    const form = isAdd ? addForm : editForm;
    const setForm = isAdd
      ? (updater: any) => setAddForm(updater)
      : (updater: any) => setEditForm(updater);
    const errors = isAdd ? addErrors : editErrors;
    const predictions = isAdd ? addPredictions : editPredictions;
    const showSuggestions = isAdd ? showAddSuggestions : showEditSuggestions;
    const showResidential = isAdd ? showAddResidentialDropdown : showEditResidentialDropdown;
    const setShowResidential = isAdd ? setShowAddResidentialDropdown : setShowEditResidentialDropdown;

    return (
      <ScrollView
        contentContainerStyle={styles.modalBody}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
      >
        {/* Full Name */}
        <FormField
          placeholder="Full Name *"
          value={form.name}
          onChangeText={t => setForm((p: any) => ({ ...p, name: t }))}
        />
        {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}

        {/* Email */}
        <FormField
          placeholder="Email *"
          value={form.email}
          onChangeText={t => setForm((p: any) => ({ ...p, email: t }))}
        />
        {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}

        {/* Password (add only) */}
        {isAdd && (
          <>
            <FormField
              placeholder="Password *"
              value={(form as AddStaffForm).password}
              onChangeText={t => setForm((p: any) => ({ ...p, password: t }))}
              secureTextEntry
            />
            {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
          </>
        )}

        {/* Phone */}
        <FormField
          placeholder="Phone *"
          value={form.phone}
          onChangeText={t => setForm((p: any) => ({ ...p, phone: t }))}
        />
        {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}

        {/* Security License */}
        <FormField
          placeholder="Security License No *"
          value={form.security_license_no}
          onChangeText={t => setForm((p: any) => ({ ...p, security_license_no: t }))}
        />
        {errors.security_license_no && (
          <Text style={styles.errorText}>{errors.security_license_no}</Text>
        )}

        {/* Residential Status Dropdown */}
        <View style={styles.dropdownWrapper}>
          <TouchableOpacity
            style={styles.selectBox}
            activeOpacity={0.8}
            onPress={() => setShowResidential(!showResidential)}
          >
            <Text style={{ color: form.residential_status ? COLORS.text : COLORS.textMuted }}>
              {form.residential_status || 'Residential Status *'}
            </Text>
            <ChevronDown size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
          {errors.residential_status && (
            <Text style={styles.errorText}>{errors.residential_status}</Text>
          )}
          {showResidential && (
            <View style={styles.customDropdown}>
              <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false} style={{ maxHeight: 200 }}>
                {residentialOptions.map(item => (
                  <TouchableOpacity
                    key={item}
                    style={styles.dropdownItem}
                    onPress={() => {
                      setForm((p: any) => ({ ...p, residential_status: item }));
                      setShowResidential(false);
                    }}
                  >
                    <Text style={styles.dropdownItemText}>{item}</Text>
                    {form.residential_status === item && (
                      <Check size={18} color={COLORS.primary} />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        {/* Address Autocomplete */}
        <View style={styles.addressWrapper}>
          <TextInput
            style={styles.input}
            placeholder="Start typing address..."
            placeholderTextColor={COLORS.textMuted}
            value={form.address}
            onChangeText={t => {
              setForm((p: any) => ({ ...p, address: t }));
              fetchPlaces(t, isAdd);
            }}
            autoCorrect={false}
          />
          {errors.address && <Text style={styles.errorText}>{errors.address}</Text>}
          {showSuggestions && predictions.length > 0 && (
            <View style={styles.suggestionsBox}>
              <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false} style={{ maxHeight: 200 }}>
                {predictions.map((pred: any) => (
                  <TouchableOpacity
                    key={pred.place_id}
                    style={styles.suggestionItem}
                    onPress={() => selectPlace(pred.description, isAdd)}
                  >
                    <MapPin size={14} color={COLORS.primary} />
                    <Text style={styles.suggestionText} numberOfLines={2}>{pred.description}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        {/* Gender */}
        <View style={styles.genderBlock}>
          <Text style={styles.label}>Gender</Text>
          <View style={styles.genderOptions}>
            {['Male', 'Female', 'Other'].map(g => (
              <TouchableOpacity
                key={g}
                style={[
                  styles.genderOption,
                  form.gender === g && styles.genderOptionActive,
                ]}
                onPress={() => setForm((p: any) => ({ ...p, gender: g }))}
              >
                <Text
                  style={
                    form.gender === g
                      ? styles.genderOptionTextActive
                      : styles.genderOptionText
                  }
                >
                  {g}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    );
  };

  // ── Documents Tab ─────────────────────────────────────────────────────────
  const renderDocumentsTab = () => (
    <ScrollView
      contentContainerStyle={[styles.modalBody, { paddingBottom: 20 }]}
      showsVerticalScrollIndicator={false}
    >
      {staffDocuments.length === 0 ? (
        <View style={styles.emptyDocuments}>
          <FileText size={48} color={COLORS.textMuted} />
          <Text style={styles.emptyDocumentsTitle}>No Documents Found</Text>
          <Text style={styles.emptyDocumentsSubtitle}>
            This staff member has no uploaded documents yet.
          </Text>
        </View>
      ) : (
        staffDocuments.map((doc, index) => (
          <View key={doc.id} style={styles.documentCard}>
            <View style={styles.documentIconWrapper}>
              <FileText size={22} color={COLORS.primary} />
            </View>
            <View style={styles.documentInfo}>
              <Text style={styles.documentName}>{doc.document_name}</Text>
              <Text style={styles.documentCategory}>{doc.document_category}</Text>
              {doc.expiry_date ? (
                <Text style={styles.documentExpiry}>Expires: {doc.expiry_date}</Text>
              ) : null}
            </View>
            <View
              style={[
                styles.documentStatusBadge,
                { backgroundColor: getDocumentStatusBg(doc.status) },
              ]}
            >
              <Text
                style={[
                  styles.documentStatusText,
                  { color: getDocumentStatusColor(doc.status) },
                ]}
              >
                {doc.status ? capitalizeWords(doc.status) : 'Uploaded'}
              </Text>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );

  // ── Staff Card ─────────────────────────────────────────────────────────────
  const renderItem = ({ item }: { item: StaffMember }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.avatar}>
          <User size={24} color="#14E6C9" />
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.name}>{capitalizeWords(item.name)}</Text>
          <Text style={styles.email}>{item.email}</Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            item.status === 'Pending' ? styles.pendingBadge : styles.activeBadge,
          ]}
        >
          <Text
            style={[
              styles.statusText,
              item.status === 'Pending' ? styles.pendingText : styles.activeText,
            ]}
          >
            {item.status}
          </Text>
        </View>
      </View>
      <View style={styles.infoRow}>
        <Phone size={16} color="#64748B" />
        <Text style={styles.infoText}>{item.phone}</Text>
      </View>
      <View style={styles.infoRow}>
        <MapPin size={16} color="#64748B" />
        <Text style={styles.infoText}>{item.location}</Text>
      </View>
      <View style={styles.actionContainer}>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => openEditModal(item)}
        >
          <Pencil size={18} color="#fff" />
          <Text style={styles.actionText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => deleteStaff(item.id, item.name)}
        >
          <Trash2 size={18} color="#fff" />
          <Text style={styles.actionText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* ─── Header ───────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ChevronLeft size={26} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>Staff Management</Text>
          <Text style={styles.subtitle}>Manage all staff members</Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            setAddForm(EMPTY_ADD_FORM);
            setAddErrors({});
            setShowAddModal(true);
          }}
        >
          <Text style={styles.addButtonText}>+ Add Staff</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={staff}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No staff members found.</Text>
          }
        />
      )}

      {/* ─── ADD MODAL ──────────────────────────────────────────────────────── */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {/* Header */}
            <View style={styles.modalHeaderRow}>
              <View style={styles.headerTabs}>
                <TouchableOpacity
                  style={[styles.tab, styles.tabActive]}
                >
                  <Text style={[styles.tabText, styles.tabTextActive]}>Personal Info</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity onPress={() => setShowAddModal(false)} style={styles.closeBtn}>
                <X size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            {renderPersonalForm(true)}

            <View style={styles.footer}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowAddModal(false)}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, addLoading && styles.buttonDisabled]}
                onPress={addStaff}
                disabled={addLoading}
              >
                {addLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.saveText}>Save Staff</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ─── EDIT MODAL ─────────────────────────────────────────────────────── */}
      <Modal
        visible={showEditModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {/* Header Tabs */}
            <View style={styles.modalHeaderRow}>
              <View style={styles.headerTabs}>
                <TouchableOpacity
                  style={[styles.tab, activeModalTab === 'personal' && styles.tabActive]}
                  onPress={() => setActiveModalTab('personal')}
                >
                  <Text style={[styles.tabText, activeModalTab === 'personal' && styles.tabTextActive]}>
                    Personal Info
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.tab, activeModalTab === 'documents' && styles.tabActive]}
                  onPress={() => setActiveModalTab('documents')}
                >
                  <Text style={[styles.tabText, activeModalTab === 'documents' && styles.tabTextActive]}>
                    Documents
                    {staffDocuments.length > 0 && (
                      <Text style={styles.docBadgeText}> ({staffDocuments.length})</Text>
                    )}
                  </Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity onPress={() => setShowEditModal(false)} style={styles.closeBtn}>
                <X size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Tab Content */}
            {activeModalTab === 'personal' ? renderPersonalForm(false) : renderDocumentsTab()}

            {/* Footer — only show save button on personal tab */}
            {activeModalTab === 'personal' && (
              <View style={styles.footer}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setShowEditModal(false)}
                >
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveButton, editLoading && styles.buttonDisabled]}
                  onPress={updateStaff}
                  disabled={editLoading}
                >
                  {editLoading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.saveText}>Update Staff</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {activeModalTab === 'documents' && (
              <View style={styles.footer}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setShowEditModal(false)}
                >
                  <Text style={styles.cancelText}>Close</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingTop: Platform.OS === 'android' ? 20 : 0,
  },

  // ── Header ─────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  headerCenter: { flex: 1 },
  title: { fontSize: 20, fontWeight: '800', color: COLORS.text },
  subtitle: { color: COLORS.textSecondary, marginTop: 4, fontSize: 13 },
  addButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  addButtonText: { color: COLORS.text, fontWeight: '700', fontSize: 13 },

  // ── List ───────────────────────────────────────────────────────────────────
  listContent: { paddingHorizontal: 16, paddingBottom: 30 },
  emptyText: {
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 60,
    fontSize: 15,
  },

  // ── Staff Card ─────────────────────────────────────────────────────────────
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: COLORS.primaryGlow,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
    marginRight: 14,
  },
  userInfo: { flex: 1 },
  name: { color: COLORS.text, fontSize: 17, fontWeight: '700' },
  email: { color: COLORS.textSecondary, fontSize: 13, marginTop: 4 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  infoText: { color: COLORS.textSecondary, marginLeft: 10, fontSize: 14, flex: 1 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 30 },
  pendingBadge: {
    backgroundColor: COLORS.warningBg,
    borderWidth: 1,
    borderColor: COLORS.warning,
  },
  activeBadge: {
    backgroundColor: 'rgba(52,200,138,0.12)',
    borderWidth: 1,
    borderColor: COLORS.success,
  },
  statusText: { fontWeight: '700', fontSize: 12 },
  pendingText: { color: COLORS.warning },
  activeText: { color: COLORS.success },
  actionContainer: { flexDirection: 'row', marginTop: 5 },
  editButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  deleteButton: {
    flex: 1,
    backgroundColor: COLORS.dangerBg,
    borderWidth: 1,
    borderColor: COLORS.danger,
    borderRadius: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionText: { color: COLORS.text, fontWeight: '600', marginLeft: 6 },

  // ── Modal ──────────────────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    width: '100%',
    maxHeight: '92%',
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    overflow: 'hidden',
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  headerTabs: {
    flexDirection: 'row',
    flex: 1,
    gap: 8,
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  tabActive: {
    backgroundColor: COLORS.primary,
  },
  tabText: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#fff',
  },
  docBadgeText: {
    color: '#fff',
    fontSize: 12,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },

  // ── Modal Body ─────────────────────────────────────────────────────────────
  modalBody: {
    padding: 16,
    gap: 12,
  },

  // ── Input ──────────────────────────────────────────────────────────────────
  input: {
    backgroundColor: '#1E2D3D',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 50,
    color: COLORS.text,           // ✅ White text when typing
    paddingHorizontal: 16,
    height: 45,
  },

  errorText: {
    color: '#F87171',
    fontSize: 11,
    marginLeft: 12,
    marginTop: 3,
  },

  label: { color: COLORS.textSecondary, marginBottom: 6, fontSize: 14 },

  // ── Residential Dropdown ───────────────────────────────────────────────────
  dropdownWrapper: {
    position: 'relative',
    zIndex: 999,
  },
  selectBox: {
    backgroundColor: '#1E2D3D',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 50,
    paddingHorizontal: 16,
    height: 45,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  customDropdown: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    backgroundColor: '#0D1F2D',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    zIndex: 9999,
    elevation: 30,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  dropdownItemText: {
    color: COLORS.text,
    fontSize: 14,
  },

  // ── Address Autocomplete ───────────────────────────────────────────────────
  addressWrapper: {
    marginBottom: 4,
  },
  suggestionsBox: {
    backgroundColor: '#0D1F2D',
    borderRadius: 14,
    marginTop: 6,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 10,
  },
  suggestionItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  suggestionText: {
    color: COLORS.text,
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },

  // ── Gender ─────────────────────────────────────────────────────────────────
  genderBlock: {},
  genderOptions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
    flexWrap: 'wrap',
  },
  genderOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#1E2D3D',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  genderOptionActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  genderOptionText: { color: COLORS.textSecondary },
  genderOptionTextActive: { color: '#fff', fontWeight: '600' },

  // ── Documents Tab ──────────────────────────────────────────────────────────
  emptyDocuments: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 10,
  },
  emptyDocumentsTitle: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: '700',
    marginTop: 8,
  },
  emptyDocumentsSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  documentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0A1828',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    gap: 12,
  },
  documentIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.primaryGlow,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
  },
  documentInfo: {
    flex: 1,
  },
  documentName: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 3,
  },
  documentCategory: {
    color: COLORS.textMuted,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  documentExpiry: {
    color: COLORS.warning,
    fontSize: 11,
    marginTop: 3,
  },
  documentStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  documentStatusText: {
    fontSize: 11,
    fontWeight: '700',
  },

  // ── Footer ─────────────────────────────────────────────────────────────────
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.cardBorder,
    gap: 10,
  },
  cancelButton: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 14,
  },
  cancelText: { color: COLORS.textSecondary, fontWeight: '600' },
  saveButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 14,
    minWidth: 100,
    alignItems: 'center',
  },
  saveText: { color: COLORS.text, fontWeight: '700' },
  buttonDisabled: { opacity: 0.6 },
});