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

type Props = { navigation: any };

export default function StaffManagement({ navigation }: Props) {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(false);

  // Add Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState<AddStaffForm>(EMPTY_ADD_FORM);
  const [addLoading, setAddLoading] = useState(false);
  const [addPredictions, setAddPredictions] = useState<any[]>([]);
  const [showAddSuggestions, setShowAddSuggestions] = useState(false);
  const [showAddResidentialDropdown, setShowAddResidentialDropdown] =
    useState(false);

  const [showEditResidentialDropdown, setShowEditResidentialDropdown] =
    useState(false);
  // Edit Modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState<EditStaffForm>(EMPTY_EDIT_FORM);
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editPredictions, setEditPredictions] = useState<any[]>([]);
  const [showEditSuggestions, setShowEditSuggestions] = useState(false);

  // Residential status picker — lives OUTSIDE all other modals to avoid nesting
  const [residentialPickerVisible, setResidentialPickerVisible] =
    useState(false);
  const [residentialPickerTarget, setResidentialPickerTarget] = useState<
    'add' | 'edit'
  >('add');

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
      const formatted: StaffMember[] = apiData.map((item: any) => ({
        id: item.id.toString(),
        name: item.name || 'N/A',
        email: item.email || 'N/A',

        // FIX HERE (phone is inside staff OR root fallback)
        phone: item.staff?.phone || item.phone || 'N/A',

        // FIX HERE (use address instead of city/state)
        location: item.address || 'N/A',

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
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
          text,
        )}&key=${GOOGLE_API_KEY}`,
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

  const openResidentialPicker = (target: 'add' | 'edit') => {
    setResidentialPickerTarget(target);
    setResidentialPickerVisible(true);
  };

  const selectResidentialStatus = (status: string) => {
    if (residentialPickerTarget === 'add') {
      setAddForm(p => ({ ...p, residential_status: status }));
    } else {
      setEditForm(p => ({ ...p, residential_status: status }));
    }
    setResidentialPickerVisible(false);
  };

  const addStaff = async () => {
    if (!addForm.name || !addForm.email || !addForm.password) {
      Alert.alert('Validation', 'Name, Email and Password are required.');
      return;
    }
    try {
      setAddLoading(true);
      const headers = await getAuthHeaders();
      const userId = await getUserId();
      const payload = { ...addForm, user_id: userId };
      await axios.post(`${BASE_URL}/admin/create-staff`, payload, { headers });
      setShowAddModal(false);
      setAddForm(EMPTY_ADD_FORM);
      getStaff();
    } catch (error: any) {
      console.log('addStaff error:', error?.response?.data || error.message);
      Alert.alert(
        'Error',
        error?.response?.data?.message || 'Failed to add staff.',
      );
    } finally {
      setAddLoading(false);
    }
  };

  // const openEditModal = (item: StaffMember) => {
  //   setEditingStaffId(item.id);
  //   setEditForm({
  //     name: item.name,
  //     email: item.email !== 'N/A' ? item.email : '',
  //     phone: item.phone !== 'N/A' ? item.phone : '',
  //     security_license_no: '',
  //     gender: item.phone !== 'N/A' ? item.phone : '',
  //     residential_status: '',
  //     address: item.location !== 'N/A' ? item.location : '',
  //   });
  //   setShowEditModal(true);
  // };

  const openEditModal = (item: any) => {
    setEditingStaffId(item.id);

    const staff = item.staff || {};

    setEditForm({
      name: item.name || '',
      email: item.email || '',
      phone: staff.phone || '',
      security_license_no: staff.security_license_no || '',
      gender: staff.gender || '',
      residential_status: staff.staff_document_type || '',
      address: item.address || '',
    });

    setShowEditModal(true);
  };
  const updateStaff = async () => {
    if (!editingStaffId) return;
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
        staff_document_type: editForm.residential_status, // Send as API expects
        address: editForm.address,
        user_id: userId,
      };

      await axios.put(
        `${BASE_URL}/admin/update-staff/${editingStaffId}`,
        payload,
        { headers },
      );
      setShowEditModal(false);
      getStaff(); // Refresh the list
    } catch (error: any) {
      Alert.alert('Error', 'Failed to update staff.');
    } finally {
      setEditLoading(false);
    }
  };

  const deleteStaff = (id: string, name: string) => {
    Alert.alert('Delete Staff', `Are you sure you want to delete "${name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const headers = await getAuthHeaders();
            await axios.delete(`${BASE_URL}/admin/staff-delete/${id}`, {
              headers,
            });
            getStaff();
          } catch {
            Alert.alert('Error', 'Failed to delete staff.');
          }
        },
      },
    ]);
  };

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

  const renderItem = ({ item }: { item: StaffMember }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.avatar}>
          <User size={24} color="#14E6C9" />
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.email}>{item.email}</Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            item.status === 'Pending'
              ? styles.pendingBadge
              : styles.activeBadge,
          ]}
        >
          <Text
            style={[
              styles.statusText,
              item.status === 'Pending'
                ? styles.pendingText
                : styles.activeText,
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

  // ─── Shared residential status picker (outside all modals) ──────────────────
  const ResidentialPickerModal = () => (
    <Modal
      visible={residentialPickerVisible}
      transparent
      animationType="fade"
      onRequestClose={() => setResidentialPickerVisible(false)}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => setResidentialPickerVisible(false)}
      >
        <View style={styles.residentialModalContent}>
          <Text style={styles.modalTitle}>Select Residential Status</Text>
          {residentialOptions.map(status => {
            const currentValue =
              residentialPickerTarget === 'add'
                ? addForm.residential_status
                : editForm.residential_status;
            return (
              <TouchableOpacity
                key={status}
                style={styles.optionRow}
                onPress={() => selectResidentialStatus(status)}
              >
                <Text style={styles.optionText}>{status}</Text>
                {currentValue === status && (
                  <Check size={20} color={COLORS.primary} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </TouchableOpacity>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* ─── Header ─────────────────────────────────────────────────────────── */}
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
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add New Staff</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Text style={styles.closeIcon}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              contentContainerStyle={styles.modalBody}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <FormField
                placeholder="Full Name *"
                value={addForm.name}
                onChangeText={t => setAddForm(p => ({ ...p, name: t }))}
              />
              <FormField
                placeholder="Email *"
                value={addForm.email}
                onChangeText={t => setAddForm(p => ({ ...p, email: t }))}
              />
              <View
                style={[
                  styles.dropdownContainer,
                  { zIndex: showAddResidentialDropdown ? 9999 : 1 },
                ]}
              >
                {/* <Text style={styles.label}>Residential Status</Text> */}

                <TouchableOpacity
                  style={styles.selectBox}
                  activeOpacity={0.8}
                  onPress={() =>
                    setShowAddResidentialDropdown(!showAddResidentialDropdown)
                  }
                >
                  <Text
                    style={{
                      color: addForm.residential_status
                        ? COLORS.text
                        : COLORS.textMuted,
                    }}
                  >
                    {addForm.residential_status || 'Residential Status'}
                  </Text>

                  <ChevronDown size={20} color={COLORS.textSecondary} />
                </TouchableOpacity>

                {showAddResidentialDropdown && (
                  <View style={styles.customDropdown}>
                    <ScrollView nestedScrollEnabled>
                      {residentialOptions.map(item => (
                        <TouchableOpacity
                          key={item}
                          style={styles.dropdownItem}
                          onPress={() => {
                            setAddForm(prev => ({
                              ...prev,
                              residential_status: item,
                            }));
                            setShowAddResidentialDropdown(false);
                          }}
                        >
                          <Text style={styles.dropdownItemText}>{item}</Text>

                          {addForm.residential_status === item && (
                            <Check size={18} color={COLORS.primary} />
                          )}
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>

              {/* Address Autocomplete */}
              <View style={styles.addressContainer}>
                {/* <Text style={styles.label}>Address</Text> */}
                <TextInput
                  style={styles.input}
                  placeholder="Start typing address..."
                  placeholderTextColor={COLORS.textMuted}
                  value={addForm.address}
                  onChangeText={t => {
                    setAddForm(p => ({ ...p, address: t }));
                    fetchPlaces(t, true);
                  }}
                  autoCorrect={false}
                />
                {showAddSuggestions && addPredictions.length > 0 && (
                  <View style={styles.suggestionsContainer}>
                    {addPredictions.map((pred: any) => (
                      <TouchableOpacity
                        key={pred.place_id}
                        style={styles.suggestionItem}
                        onPress={() => selectPlace(pred.description, true)}
                      >
                        <MapPin size={16} color={COLORS.primary} />
                        <Text style={styles.suggestionText}>
                          {pred.description}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
              <FormField
                placeholder="Password *"
                value={addForm.password}
                onChangeText={t => setAddForm(p => ({ ...p, password: t }))}
                secureTextEntry
              />
              <FormField
                placeholder="Phone"
                value={addForm.phone}
                onChangeText={t => setAddForm(p => ({ ...p, phone: t }))}
              />
              <FormField
                placeholder="Security License No"
                value={addForm.security_license_no}
                onChangeText={t =>
                  setAddForm(p => ({ ...p, security_license_no: t }))
                }
              />

              {/* Gender */}
              <View style={styles.dropdownContainer}>
                <Text style={styles.label}>Gender</Text>
                <View style={styles.genderOptions}>
                  {['Male', 'Female', 'Other'].map(g => (
                    <TouchableOpacity
                      key={g}
                      style={[
                        styles.genderOption,
                        addForm.gender === g && styles.genderOptionActive,
                      ]}
                      onPress={() => setAddForm(p => ({ ...p, gender: g }))}
                    >
                      <Text
                        style={
                          addForm.gender === g
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
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Staff</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <Text style={styles.closeIcon}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              contentContainerStyle={styles.modalBody}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <FormField
                placeholder="Full Name *"
                value={editForm.name}
                onChangeText={t => setEditForm(p => ({ ...p, name: t }))}
              />
              <FormField
                placeholder="Email *"
                value={editForm.email}
                onChangeText={t => setEditForm(p => ({ ...p, email: t }))}
              />
              {/* <FormField
                placeholder="Password *"
                value={addForm.password}
                onChangeText={t => setAddForm(p => ({ ...p, password: t }))}
                secureTextEntry
              /> */}
              <View
                style={[
                  styles.dropdownContainer,
                  { zIndex: showEditResidentialDropdown ? 9999 : 1 },
                ]}
              >
                <TouchableOpacity
                  style={styles.selectBox}
                  activeOpacity={0.8}
                  onPress={() =>
                    setShowEditResidentialDropdown(!showEditResidentialDropdown)
                  }
                >
                  <Text
                    style={{
                      color: editForm.residential_status
                        ? COLORS.text
                        : COLORS.textMuted,
                    }}
                  >
                    {editForm.residential_status || 'Residential Status'}
                  </Text>

                  <ChevronDown size={20} color={COLORS.textSecondary} />
                </TouchableOpacity>

                {showEditResidentialDropdown && (
                  <View style={styles.customDropdown}>
                    <ScrollView nestedScrollEnabled>
                      {residentialOptions.map(item => (
                        <TouchableOpacity
                          key={item}
                          style={styles.dropdownItem}
                          onPress={() => {
                            setEditForm(prev => ({
                              ...prev,
                              residential_status: item,
                            }));
                            setShowEditResidentialDropdown(false);
                          }}
                        >
                          <Text style={styles.dropdownItemText}>{item}</Text>

                          {editForm.residential_status === item && (
                            <Check size={18} color={COLORS.primary} />
                          )}
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>

              <View style={styles.addressContainer}>
                {/* <Text style={styles.label}>Address</Text> */}
                <TextInput
                  style={styles.input}
                  placeholder="Start typing address..."
                  placeholderTextColor={COLORS.textMuted}
                  value={editForm.address}
                  onChangeText={t => {
                    setEditForm(p => ({ ...p, address: t }));
                    fetchPlaces(t, false);
                  }}
                  autoCorrect={false}
                />
                {showEditSuggestions && editPredictions.length > 0 && (
                  <View style={styles.suggestionsContainer}>
                    {editPredictions.map((pred: any) => (
                      <TouchableOpacity
                        key={pred.place_id}
                        style={styles.suggestionItem}
                        onPress={() => selectPlace(pred.description, false)}
                      >
                        <MapPin size={16} color={COLORS.primary} />
                        <Text style={styles.suggestionText}>
                          {pred.description}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
              <FormField
                placeholder="Phone"
                value={editForm.phone}
                onChangeText={t => setEditForm(p => ({ ...p, phone: t }))}
              />
              <FormField
                placeholder="Security License No"
                value={editForm.security_license_no}
                onChangeText={t =>
                  setEditForm(p => ({ ...p, security_license_no: t }))
                }
              />

              <View style={styles.dropdownContainer}>
                <Text style={styles.label}>Gender</Text>
                <View style={styles.genderOptions}>
                  {['Male', 'Female', 'Other'].map(g => (
                    <TouchableOpacity
                      key={g}
                      style={[
                        styles.genderOption,
                        editForm.gender === g && styles.genderOptionActive,
                      ]}
                      onPress={() => setEditForm(p => ({ ...p, gender: g }))}
                    >
                      <Text
                        style={
                          editForm.gender === g
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

            <View style={styles.footer}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowEditModal(false)}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.saveButton,
                  editLoading && styles.buttonDisabled,
                ]}
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
          </View>
        </View>
      </Modal>

      <ResidentialPickerModal />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  // ── Header ────────────────────────────────────────────────────────────────
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

  // ── List ──────────────────────────────────────────────────────────────────
  listContent: { paddingHorizontal: 16, paddingBottom: 30 },
  emptyText: {
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 60,
    fontSize: 15,
  },

  // ── Staff Card ────────────────────────────────────────────────────────────
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
  infoText: {
    color: COLORS.textSecondary,
    marginLeft: 10,
    fontSize: 14,
    flex: 1,
  },
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

  modalCard: {
    width: '100%',
    maxHeight: '85%',
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  modalTitle: { color: COLORS.text, fontSize: 18, fontWeight: '700' },
  closeIcon: { color: COLORS.textSecondary, fontSize: 18, padding: 4 },
  modalBody: { padding: 20, gap: 12 },
  input: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 14,
    color: COLORS.text,
    paddingHorizontal: 16,
    height: 52,
  },
  label: { color: COLORS.textSecondary, marginBottom: 6, fontSize: 14 },

  selectBox: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
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
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  genderOptionActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  genderOptionText: { color: COLORS.textSecondary },
  genderOptionTextActive: { color: '#000', fontWeight: '600' },

  addressContainer: { marginBottom: 4 },
  suggestionsContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    marginTop: 4,
    maxHeight: 220,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  suggestionItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  suggestionText: { color: COLORS.text, flex: 1 },

  // ── Residential picker (top-level modal) ──────────────────────────────────
  residentialModalContent: {
    backgroundColor: COLORS.card,
    margin: 20,
    borderRadius: 20,
    padding: 16,
    maxHeight: '70%',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    // ADD THIS
    elevation: 100,
    zIndex: 100,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center', // Changed to center to make it look like a floating dialog
    zIndex: 99,
  },
  optionRow: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  optionText: { color: COLORS.text, fontSize: 16 },

  // ── Footer ────────────────────────────────────────────────────────────────
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.cardBorder,
  },
  cancelButton: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 14,
    marginRight: 10,
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
  dropdownContainer: {
    // marginBottom: 16,
    position: 'relative',
  },

  customDropdown: {
    position: 'absolute',
    top: 52,
    left: 0,
    right: 0,
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    maxHeight: 220,

    zIndex: 99999,
    elevation: 30,

    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 4,
    },
  },

  dropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },

  dropdownItemText: {
    color: COLORS.text,
    fontSize: 15,
  },
});
