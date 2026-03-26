import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Dimensions,
  Modal,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { ChevronLeft, ChevronRight, Calendar, Clock, User } from 'lucide-react-native';
import BottomTab from './BottomTab';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Toast from 'react-native-toast-message';
import { getContractorStaff } from '../services/authApi';
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BASE_URL = 'https://apis.staffoo.com.au/api';
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface Shift {
  id: number;
  siteName: string;
  guard: string;
  dayShort: string;
  dateStr: string;
  startTime: string;
  endTime: string;
  tag: string;
  jobStatus: string;
  hours: number;
  cardBackground: string;
}

export default function WeeklyRosterScreen({ navigation }: any) {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userType, setUserType] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [showDateModal, setShowDateModal] = useState(false);
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [staffList, setStaffList] = useState<{ id: number; name: string }[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState<number | null>(null);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [user, setUser] = useState<any>(null);
  const isRestrictedUser = userType === 'staff' || userType === 'customer';
  const currentDate = new Date();
  const [weekStart, setWeekStart] = useState(() => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() - d.getDay() + (d.getDay() === 0 ? -6 : 1));
    return d;
  });

  const formatDateMMDDYYYY = (date: Date) =>
    `${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}-${date.getFullYear()}`;

  const formatDateYYYYMMDD = (date: Date) => date.toISOString().split('T')[0];

  const datesYYYYMMDD = useMemo(() => {
    return Array(7).fill(0).map((_, i) => {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      return formatDateYYYYMMDD(d);
    });
  }, [weekStart]);

  const weekLabel = useMemo(() => {
    const s = weekStart;
    const e = new Date(s);
    e.setDate(e.getDate() + 6);
    return `${s.getDate()} ${s.toLocaleString('default', { month: 'short' })} – ${e.getDate()} ${e.toLocaleString('default', { month: 'short' })} ${s.getFullYear()}`;
  }, [weekStart]);

  const fetchContractorStaff = async () => {
    try {
      setLoadingStaff(true);
      if (!user?.id) return;
      const res = await getContractorStaff(user.id);
      if (res?.success && Array.isArray(res.guards)) {
        setStaffList(res.guards);
      } else {
        setStaffList([]);
        Toast.show({
          type: 'error',
          text1: 'No staff found',
          position: 'bottom',
        });
      }
    } catch (err: any) {
      Toast.show({
        type: 'error',
        text1: 'Staff load error',
        text2: err.message || 'Network issue',
        position: 'bottom',
      });
    } finally {
      setLoadingStaff(false);
    }
  };
  React.useEffect(() => {
    const fetchUser = async () => {
      const userStr = await AsyncStorage.getItem('user');
      if (userStr) {
        const loggedInUser = JSON.parse(userStr);
        setUser(loggedInUser);
        setIsActive(loggedInUser.profile_completion >= 100);
        setUserType(loggedInUser.user_type);
      }
    };
    fetchUser();
  }, []);
  const fetchShifts = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = await AsyncStorage.getItem('@auth_token');
      if (!token) throw new Error('No token');
      const userStr = await AsyncStorage.getItem('user');
      if (!userStr) throw new Error('No user');
      const user = JSON.parse(userStr);
      const currentUserId = user.id;
      setUserType(user?.user_type || null);
      const payload = {
        user_id: [currentUserId],
        state: 'Victoria',
        start: formatDateMMDDYYYY(weekStart),
        end: formatDateMMDDYYYY(new Date(weekStart.getTime() + 6 * 86400000)),
        roster_id: '1',
      };
      const res = await axios.post(`${BASE_URL}/fetch-customer-sites`, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      });
      if (!res.data?.success || !Array.isArray(res.data?.data)) {
        setError('No shifts found this week');
        setShifts([]);
        return;
      }
      const allShifts: Shift[] = [];
      res.data.data.forEach((site: any) => {
        const siteName = site.site_name || 'Unnamed Site';
        const jobs = site.job_roster || [];

        jobs.forEach((job: any) => {
          const startDateStr = job.start.split(' ')[0];
          if (!datesYYYYMMDD.includes(startDateStr)) return;
          const startTime = job.start.split(' ')[1]?.slice(0, 5) || '??:??';
          const endTime = job.end?.split(' ')[1]?.slice(0, 5) || '??:??';
          const jobDate = new Date(startDateStr);
          const dayIndex = jobDate.getDay();
          const guard = job.guards?.name || 'Unassigned';
          const status = (job.job_status || 'unknown').toLowerCase();
          let tag = 'Unknown';
          let cardBackground = '#f9fafb';
          if (status === 'pending') {
            tag = 'Pending';
            cardBackground = '#FFF3CD';
          } else if (status === 'confirmed') {
            tag = 'Confirmed';
            cardBackground = '#D1E7DD';
          } else if (status === 'completed' || status === 'complete') {
            tag = 'Completed';
            cardBackground = '#D1E7DD';
          }
          allShifts.push({
            id: job.id,
            siteName,
            guard,
            dayShort: DAYS[dayIndex],
            dateStr: `${jobDate.getDate().toString().padStart(2, '0')}/${(jobDate.getMonth() + 1).toString().padStart(2, '0')}/${jobDate.getFullYear()}`,
            startTime,
            endTime,
            tag,
            jobStatus: status,
            hours: Number(job.hours || 0),
            cardBackground,
          });
        });
      });

      allShifts.sort((a, b) => {
        const da = new Date(`${a.dateStr.split('/').reverse().join('-')} ${a.startTime}`);
        const db = new Date(`${b.dateStr.split('/').reverse().join('-')} ${b.startTime}`);
        return db.getTime() - da.getTime();
      });
      setShifts(allShifts);
    } catch (err: any) {
      setError(err.message || 'Failed to load shifts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShifts();
  }, [weekStart]);

  useEffect(() => {
    if (userType === 'contractor') {
      fetchContractorStaff();
    }
  }, [userType]);

  const navigateWeek = (dir: 'prev' | 'next') => {
    const delta = dir === 'next' ? 7 : -7;
    const newStart = new Date(weekStart);
    newStart.setDate(newStart.getDate() + delta);
    setWeekStart(newStart);
  };

  const handleAcceptJob = async () => {
    if (!selectedShift?.id || !selectedStaffId) {
      Toast.show({
        type: 'error',
        text1: 'Select staff member',
        position: 'bottom',
      });
      return;
    }
    setAccepting(true);
    try {
      const token = await AsyncStorage.getItem('@auth_token');
      if (!token) throw new Error('No token');
      const payload = { roster_id: selectedShift.id };
      const res = await axios.post(
        `${BASE_URL}/asap-jobs/accept/${selectedStaffId}`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            // Accept: 'application/json',
          },
        }
      );

      if (res.data?.success) {
        Toast.show({
          type: 'success',
          text1: 'Shift assigned',
          position: 'bottom',
        });
        const staff = staffList.find(s => s.id === selectedStaffId);
        setShifts(prev =>
          prev.map(s =>
            s.id === selectedShift.id
              ? {
                ...s,
                guard: staff?.name || s.guard,
                jobStatus: 'confirmed',
                tag: 'Confirmed',
                cardBackground: '#D1E7DD',
              }
              : s
          )
        );
      } else {
        throw new Error(res.data?.message || 'Failed');
      }
    } catch (err: any) {
      Toast.show({
        type: 'error',
        text1: 'Assign failed',
        text2: err.message || 'Try again',
        position: 'bottom',
      });
    } finally {
      setAccepting(false);
      setShowShiftModal(false);
      setSelectedShift(null);
      setSelectedStaffId(null);
    }
  };

  const getStatusPill = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending': return { bg: '#fef08a', text: '#854d0e' };
      case 'confirmed': return { bg: '#6ee7b7', text: '#065f46' };
      case 'completed': return { bg: '#34d399', text: '#064e3b' };
      default: return { bg: '#e5e7eb', text: '#374151' };
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBox} onPress={() => navigation?.goBack()}>
          <ChevronLeft size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.screenTitle}>My Job Applications</Text>
        <View style={{ width: 44 }} />
      </View>

      {/* Week selector */}
      <View style={styles.weekNav}>
        <TouchableOpacity onPress={() => navigateWeek('prev')}>
          <ChevronLeft size={26} color="#64748b" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.datePill} onPress={() => setShowDateModal(true)}>
          <Calendar size={20} color="#3b82f6" style={{ marginRight: 8 }} />
          <Text style={styles.dateText}>{weekLabel}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigateWeek('next')}>
          <ChevronRight size={26} color="#64748b" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text style={styles.centerText}>Loading shifts...</Text>
          </View>
        ) : error ? (
          <View style={styles.center}>
            <Text style={[styles.centerText, { color: '#ef4444' }]}>{error}</Text>
          </View>
        ) : shifts.length === 0 ? (
          <View style={styles.center}>
            <Text style={styles.centerText}>No shifts this week</Text>
          </View>
        ) : (
          shifts.map(shift => {
            const pill = getStatusPill(shift.jobStatus);
            return (
              <TouchableOpacity
                key={shift.id}
                style={[styles.shiftCard, { backgroundColor: shift.cardBackground }]}
                activeOpacity={0.85}
                onPress={() => {
                  setSelectedShift(shift);
                  setShowShiftModal(true);
                }}
              >
                <View style={styles.siteRow}>
                  <Text style={styles.siteName} numberOfLines={1}>
                    {shift.siteName}
                  </Text>
                </View>

                <View style={styles.timeAndStatus}>
                  <View style={styles.timeBlock}>
                    <Clock size={15} color="#475569" style={{ marginRight: 6 }} />
                    <Text style={styles.timeText}>
                      {shift.startTime} – {shift.endTime}
                    </Text>
                  </View>

                  <View style={[styles.statusPill, { backgroundColor: pill.bg }]}>
                    <Text style={[styles.pillText, { color: pill.text }]}>
                      {shift.tag}
                    </Text>
                  </View>
                </View>

                <View style={styles.bottomRow}>
                  <View style={styles.guardBlock}>
                    <User size={15} color="#64748b" style={{ marginRight: 6 }} />
                    <Text style={styles.guardName} numberOfLines={1}>
                      {shift.guard}
                    </Text>
                  </View>

                  <Text style={styles.dayInfo}>
                    {shift.dayShort} · {shift.dateStr}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      <Modal visible={showDateModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select week start</Text>
            <DateTimePicker
              value={weekStart}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(e, date) => {
                if (date) setWeekStart(date);
                setShowDateModal(false);
              }}
            />
            <TouchableOpacity style={styles.modalBtn} onPress={() => setShowDateModal(false)}>
              <Text style={styles.modalBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showShiftModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowShiftModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.detailModal}>
            <Text style={styles.modalTitle}>Shift Details</Text>
            {selectedShift && (
              <>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Site</Text>
                  <Text style={styles.detailValue}>{selectedShift.siteName}</Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Time</Text>
                  <Text style={styles.detailValue}>
                    {selectedShift.startTime} – {selectedShift.endTime}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Day</Text>
                  <Text style={styles.detailValue}>
                    {selectedShift.dayShort} {selectedShift.dateStr}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Guard</Text>
                  <Text style={styles.detailValue}>{selectedShift.guard}</Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Status</Text>
                  <View style={[styles.detailPill, { backgroundColor: getStatusPill(selectedShift.jobStatus).bg }]}>
                    <Text style={[styles.pillText, { color: getStatusPill(selectedShift.jobStatus).text }]}>
                      {selectedShift.tag}
                    </Text>
                  </View>
                </View>

                {selectedShift.jobStatus === 'pending' && !isRestrictedUser && (
                  <View style={{ marginTop: 16 }}>
                    <Text style={styles.assignLabel}>Assign to</Text>

                    {loadingStaff ? (
                      <ActivityIndicator size="small" color="#3b82f6" style={{ marginTop: 12 }} />
                    ) : staffList.length === 0 ? (
                      <Text style={styles.noStaffText}>No staff available</Text>
                    ) : (
                      <View style={styles.pickerContainer}>
                        <Picker
                          selectedValue={selectedStaffId}
                          onValueChange={(val) => setSelectedStaffId(val)}
                          style={[styles.picker, { color: selectedStaffId ? '#000' : '#aaa' }]} // black when selected, gray if placeholder
                        >
                          <Picker.Item label="Select staff..." value={null} color="#aaa" />
                          {staffList.map(s => (
                            <Picker.Item key={s.id} label={s.name} value={s.id} color="#000" />
                          ))}
                        </Picker>
                      </View>
                    )}

                    <TouchableOpacity
                      style={[
                        styles.acceptBtn,
                        (!selectedStaffId || accepting) && styles.acceptDisabled,
                      ]}
                      onPress={handleAcceptJob}
                      disabled={!selectedStaffId || accepting}
                    >
                      {accepting ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <Text style={styles.acceptText}>
                          {selectedStaffId ? 'Assign Shift' : 'Select Staff First'}
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                )}

                <TouchableOpacity
                  style={styles.closeBtn}
                  onPress={() => setShowShiftModal(false)}
                >
                  <Text style={styles.closeText}>Close</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      <BottomTab
        navigation={navigation}
        activeTab="Applications"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    paddingTop: 25,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },

  screenTitle: {
    fontSize: 21,
    fontWeight: '700',
    color: '#0f172a',
  },

  weekNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 15,
  },

  datePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#dbeafe',
    paddingTop: 10,

    shadowColor: '#dce7f9',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },

  dateText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1d4ed8',
  },

  scroll: {
    flex: 1,
  },

  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    marginTop: 80,
  },

  centerText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
  },

  shiftCard: {
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#cececf',

    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1.99,
    shadowRadius: 10,
    elevation: 6,
  },
  siteRow: {
    marginBottom: 7,
  },

  siteName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },

  timeAndStatus: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 7,
  },

  timeBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  timeText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
  },

  statusPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,

    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },

  pillText: {
    fontSize: 12,
    fontWeight: '600',
  },

  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  guardBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  guardName: {
    fontSize: 14,
    color: '#475569',
    fontWeight: '500',
  },

  dayInfo: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 28,
    width: '86%',
    alignItems: 'center',
  },

  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 24,
  },

  modalBtn: {
    marginTop: 24,
    backgroundColor: '#3b82f6',
    paddingVertical: 16,
    borderRadius: 14,
    width: '100%',
    alignItems: 'center',
  },

  modalBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  detailModal: {
    backgroundColor: '#ffffff',
    borderRadius: 26,
    padding: 28,
    width: '88%',
    maxWidth: 420,

    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 10,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },

  detailLabel: {
    fontSize: 15,
    color: '#64748b',
    fontWeight: '500',
  },

  detailValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
  },

  detailPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
  },

  assignLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 12,
  },

  pickerContainer: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 14,
    backgroundColor: '#f9fafb',
    overflow: 'hidden',
  },

  picker: {
    height: 52,
    width: '100%',
  },

  noStaffText: {
    color: '#ef4444',
    fontSize: 14,
    marginTop: 8,
  },

  acceptBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,

    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  acceptDisabled: {
    backgroundColor: '#9ca3af',
  },

  acceptText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },

  closeBtn: {
    marginTop: 24,
    backgroundColor: '#f1f5f9',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },

  closeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
  },
});