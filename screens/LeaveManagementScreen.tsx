

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Modal,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { ChevronLeft, Plus, Calendar, XCircle } from 'lucide-react-native';
import BottomTab from './BottomTab';
import { getLeaveDetails, postWithAuth, getContractor, getContractors } from '../services/authApi';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';

type Props = { navigation: any };

type Guard = {
  id: number;
  name: string;
};

export default function LeaveManagementScreen({ navigation }: Props) {
  const [userId, setUserId] = useState<string | null>(null);
  const [userType, setUserType] = useState<string | null>(null);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'Pending' | 'Approved'>('Pending');
  const [loading, setLoading] = useState(true);

  // Modal states
  const [modalVisible, setModalVisible] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isSelectingStart, setIsSelectingStart] = useState(true);

  // Guards for Contractor
  const [guards, setGuards] = useState<Guard[]>([]);
  const [selectedGuardId, setSelectedGuardId] = useState<number | undefined>(undefined);
  const [loadingGuards, setLoadingGuards] = useState(false);

  const [form, setForm] = useState({
    reason: 'annual',
    startDate: '',
    endDate: '',
    startDateObj: new Date(),
    endDateObj: new Date(),
  });

  // Load User Data
  useEffect(() => {
    const loadUserData = async () => {
      const id = await AsyncStorage.getItem('@user_id');
      let type = await AsyncStorage.getItem('@user_type');
      if (!type) type = await AsyncStorage.getItem('@role');

      if (id) setUserId(id);
      if (type) setUserType(type.toLowerCase().trim());
    };
    loadUserData();
  }, []);

  // Fetch Leaves
  useEffect(() => {
    if (userId) fetchLeaves();
  }, [userId]);

  const fetchLeaves = async () => {
    try {
      const res = await getLeaveDetails(userId!);
      setLeaves(res?.data || []);
    } catch (e) {
      console.log('❌ Leave fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  const filteredLeaves = leaves.filter(
    (item) => item.status?.toLowerCase() === activeTab.toLowerCase()
  );

  const isContractor = userType === 'contractor' || userType === 'contractors';

  const fetchGuards = async () => {
    if (!userId || !isContractor) return;

    setLoadingGuards(true);
    try {
      const res = await getContractors(userId);   // Pass userId here
      if (res.success && Array.isArray(res.guards)) {
        setGuards(res.guards);
        if (res.guards.length > 0) {
          setSelectedGuardId(res.guards[0].id);
        }
      } else {
        Alert.alert('Error', res.message || 'Failed to load staff list');
      }
    } catch (error: any) {
      console.error('Error fetching guards:', error);
      Alert.alert('Error', error.message || 'Failed to load staff list');
    } finally {
      setLoadingGuards(false);
    }
  };

  const openModal = () => {
    setModalVisible(true);
    setSelectedGuardId(undefined);
    if (isContractor) {
      fetchGuards();
    }
  };

  // Approve Leave
  const approveLeave = async (leaveId: number) => {
    Alert.alert('Approve Leave', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Approve',
        onPress: async () => {
          try {
            await postWithAuth('https://apis.staffoo.com.au/api/approveLeave', { id: leaveId });
            Alert.alert('Success', 'Leave approved successfully!');
            fetchLeaves();
          } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to approve');
          }
        },
      },
    ]);
  };

  // Action on Approved Leave (Red X Button)
  const actionOnApproved = async (leaveId: number) => {
    Alert.alert('Action', 'Perform action on this approved leave?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Proceed',
        style: 'destructive',
        onPress: async () => {
          try {
            await postWithAuth('https://apis.staffoo.com.au/api/approveLeave', { id: leaveId });
            Alert.alert('Success', 'Action completed!');
            fetchLeaves();
          } catch (error: any) {
            Alert.alert('Error', error.message || 'Action failed');
          }
        },
      },
    ]);
  };

  // Date Picker
  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const formattedDate = selectedDate.toISOString().split('T')[0];
      if (isSelectingStart) {
        setForm((prev) => ({ ...prev, startDate: formattedDate, startDateObj: selectedDate }));
      } else {
        if (selectedDate < form.startDateObj) {
          Alert.alert('Invalid', 'End date cannot be before start date');
          return;
        }
        setForm((prev) => ({ ...prev, endDate: formattedDate, endDateObj: selectedDate }));
      }
    }
  };

  // Submit Leave
  const submitLeave = async () => {
    if (!form.startDate || !form.endDate) {
      Alert.alert('Error', 'Please select both start and end dates');
      return;
    }

    let guardId = parseInt(userId || '0');
    if (isContractor) {
      if (!selectedGuardId) {
        Alert.alert('Error', 'Please select a staff member');
        return;
      }
      guardId = selectedGuardId;
    }

    const payload = {
      admin_id: parseInt(userId || '0'),
      guard_id: guardId,
      reason: form.reason,
      date: `${form.startDate} - ${form.endDate}`,
    };

    try {
      await postWithAuth('https://apis.staffoo.com.au/api/addAdminLeaveRequest', payload);
      Alert.alert('Success', 'Leave request submitted successfully!');
      setModalVisible(false);
      setForm({
        reason: 'annual',
        startDate: '',
        endDate: '',
        startDateObj: new Date(),
        endDateObj: new Date(),
      });
      setSelectedGuardId(undefined);
      fetchLeaves();
    } catch (error: any) {
      Alert.alert('Failed', error.message || 'Submission failed');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBox} onPress={() => navigation.goBack()}>
          <ChevronLeft size={26} color="#000" strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Leave Management</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openModal}>
          <Plus size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.tabs}>
        {['Pending', 'Approved'].map((tab) => (
          <TouchableOpacity
            key={tab}
            onPress={() => setActiveTab(tab as 'Pending' | 'Approved')}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
          >
            <Text style={{ color: activeTab === tab ? '#fff' : '#374151', fontWeight: '600' }}>
              {tab} Leaves
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.listContent}>
        {loading ? (
          <Text style={styles.empty}>Loading...</Text>
        ) : filteredLeaves.length === 0 ? (
          <Text style={styles.empty}>No {activeTab.toLowerCase()} leaves found</Text>
        ) : (
          filteredLeaves.map((item) => (
            <View key={item.id} style={styles.card}>

              <View style={styles.infoRow}><Text style={styles.name}>{item.guardss?.name || 'Staff'}</Text><Text style={styles.value}>{item.guardss?.email}</Text></View>
              <View style={styles.infoRow}><Text style={styles.label}>Reason</Text><Text style={styles.value}>{item.reason}</Text></View>
              <View style={styles.infoRow}><Text style={styles.label}>Start Date</Text><Text style={styles.value}>{item.start_date}</Text></View>
              <View style={styles.infoRow}><Text style={styles.label}>End Date</Text><Text style={styles.value}>{item.end_date}</Text></View>
              <View style={styles.infoRow}><Text style={styles.label}>Days</Text><Text style={styles.value}>{item.days}</Text></View>

              <View style={styles.footer}>
                {!isContractor && item.status?.toLowerCase() === 'pending' && (
                  <Text style={styles.footerText}>● Pending Approval</Text>
                )}

                {isContractor && item.status?.toLowerCase() === 'pending' && (
                  <TouchableOpacity style={styles.approveBtn} onPress={() => approveLeave(item.id)}>
                    <Text style={styles.approveBtnText}>Approve Leave</Text>
                  </TouchableOpacity>
                )}

                {isContractor && item.status?.toLowerCase() === 'approved' && (
                  <TouchableOpacity style={styles.actionBtn} onPress={() => actionOnApproved(item.id)}>
                    <XCircle size={32} color="#EF4444" strokeWidth={3} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <BottomTab navigation={navigation} activeTab="Leaves" />

      {/* Modal */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalBg}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>New Leave Request</Text>

            {isContractor && (
              <>
                <Text style={styles.modalLabel}>Select Staff</Text>
                <View style={styles.pickerContainer}>
                  {loadingGuards ? (
                    <ActivityIndicator size="small" color="#3B82F6" style={{ padding: 15 }} />
                  ) : guards.length === 0 ? (
                    <Text style={{ padding: 15, color: '#9CA3AF' }}>No staff found</Text>
                  ) : (
                    <Picker
                      selectedValue={selectedGuardId}
                      onValueChange={(value: number) => setSelectedGuardId(value)}
                      style={styles.picker}
                    >
                      <Picker.Item label="Select Staff" value={undefined} />
                      {guards.map((guard) => (
                        <Picker.Item
                          key={guard.id}
                          label={guard.name}
                          value={guard.id}
                        />
                      ))}
                    </Picker>
                  )}
                </View>
              </>
            )}

            <Text style={styles.modalLabel}>Reason</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={form.reason}
                onValueChange={(value) => setForm((prev) => ({ ...prev, reason: value }))}
                style={styles.picker}
              >
                <Picker.Item label="Annual Leave" value="annual" />
                <Picker.Item label="Sick Leave" value="sick" />
                <Picker.Item label="Unpaid Leave" value="unpaid" />
              </Picker>
            </View>

            <Text style={styles.modalLabel}>Select Dates</Text>

            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => { setIsSelectingStart(true); setShowDatePicker(true); }}
            >
              <Calendar size={20} color="#6B7280" />
              <Text style={styles.dateButtonText}>
                Start Date: {form.startDate || 'Select'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => {
                if (!form.startDate) {
                  Alert.alert('Please select Start Date first');
                  return;
                }
                setIsSelectingStart(false);
                setShowDatePicker(true);
              }}
            >
              <Calendar size={20} color="#6B7280" />
              <Text style={styles.dateButtonText}>
                End Date: {form.endDate || 'Select'}
              </Text>
            </TouchableOpacity>

            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitBtn} onPress={submitLeave}>
                <Text style={styles.submitText}>Submit Request</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {showDatePicker && (
        <DateTimePicker
          value={isSelectingStart ? form.startDateObj : form.endDateObj}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onDateChange}
          minimumDate={new Date()}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,

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
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#111827' },
  addBtn: { backgroundColor: '#3B82F6', padding: 10, borderRadius: 999 },

  tabs: { flexDirection: 'row', paddingHorizontal: 16, marginVertical: 8 },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    backgroundColor: '#E5E7EB',
    borderRadius: 20,
    marginRight: 10,
  },
  activeTab: { backgroundColor: '#2869FE' },

  scrollView: { flex: 1 },
  listContent: { padding: 16, paddingBottom: 100 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 5,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  name: { fontSize: 18, fontWeight: '700', color: '#111827' },
  email: { fontSize: 14, color: '#6B7280', marginTop: 2 },

  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  pending: { backgroundColor: '#FEF3C7' },
  approved: { backgroundColor: '#D1FAE5' },
  statusText: { fontWeight: '600', fontSize: 13 },

  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, },
  label: { color: '#6B7280', fontSize: 15 },
  value: { fontWeight: '600', color: '#111827', fontSize: 15 },

  footer: { marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F3F4F6', alignItems: 'center' },
  footerText: { color: '#D97706', fontWeight: '600' },

  approveBtn: {
    backgroundColor: '#3B82F6',
    paddingVertical: 14,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
  },
  approveBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },

  actionBtn: {
    width: 55,
    height: 55,
    borderRadius: 30,
    borderWidth: 2.5,
    borderColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },

  empty: { textAlign: 'center', marginTop: 100, fontSize: 16, color: '#9CA3AF' },

  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
    minHeight: 480,
  },
  modalTitle: { fontSize: 22, fontWeight: '700', textAlign: 'center', marginBottom: 20 },
  modalLabel: { fontSize: 16, fontWeight: '600', marginBottom: 8, color: '#374151' },

  pickerContainer: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    marginBottom: 20,
    backgroundColor: '#F9FAFB',
  },
  picker: { height: 55, color: '#374151' },

  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 15,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  dateButtonText: { marginLeft: 12, fontSize: 16, color: '#374151' },

  modalBtns: { flexDirection: 'row', marginTop: 30, gap: 12 },
  cancelBtn: { flex: 1, padding: 16, alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: 10 },
  cancelText: { color: '#6B7280', fontWeight: '600' },
  submitBtn: { flex: 1, padding: 16, alignItems: 'center', backgroundColor: '#3B82F6', borderRadius: 10 },
  submitText: { color: '#fff', fontWeight: '700' },
});

