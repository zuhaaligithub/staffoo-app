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
  Alert,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  User,
  MapPin,
  FileText,
} from 'lucide-react-native';

import * as RNHTMLtoPDF from 'react-native-html-to-pdf';
import FileViewer from 'react-native-file-viewer';
import RNFS from 'react-native-fs';
import BottomTab from './BottomTab';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Toast from 'react-native-toast-message';
import { getContractorStaff } from '../services/authApi';
import PDFGenerator from './utils/PDFGenerator';
import LinearGradient from 'react-native-linear-gradient';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BASE_URL = 'https://apis.staffoo.com.au/api';
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
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
  heroBg1: '#0D1F2D',
  heroBg2: '#061014',
};
interface Shift {
  id: number;
  siteName: string;
  address?: string;
  guard: string;
  dayShort: string;
  dateStr: string;
  startTime: string;
  endTime: string;
  tag: string;
  jobStatus: string;
  hours: number;
  cardBackground: string;

  signin_lat?: number;
  signin_lng?: number;
  signout_lat?: number;
  signout_lng?: number;
  signout_location?: string;
}
export default function WeeklyRosterScreen({ navigation }: any) {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [totalHours, setTotalHours] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userType, setUserType] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [showDateModal, setShowDateModal] = useState(false);
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [shiftIndex, setShiftIndex] = useState(0);
  const [accepting, setAccepting] = useState(false);
  const [staffList, setStaffList] = useState<{ id: number; name: string }[]>(
    [],
  );

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
    `${(date.getMonth() + 1).toString().padStart(2, '0')}-${date
      .getDate()
      .toString()
      .padStart(2, '0')}-${date.getFullYear()}`;

  const formatDateYYYYMMDD = (date: Date) => date.toISOString().split('T')[0];

  const datesYYYYMMDD = useMemo(() => {
    return Array(7)
      .fill(0)
      .map((_, i) => {
        const d = new Date(weekStart);
        d.setDate(d.getDate() + i);
        return formatDateYYYYMMDD(d);
      });
  }, [weekStart]);

  const weekLabel = useMemo(() => {
    const s = weekStart;
    const e = new Date(s);
    e.setDate(e.getDate() + 6);
    return `${s.getDate()} ${s.toLocaleString('default', {
      month: 'short',
    })} – ${e.getDate()} ${e.toLocaleString('default', {
      month: 'short',
    })} ${s.getFullYear()}`;
  }, [weekStart]);

  const generateShiftPDF = async (shift: Shift) => {
    if (generatingPDF) return;

    setGeneratingPDF(true);
    try {
      const reportData = {
        siteName: shift.siteName,
        siteAddress: shift.address || '',
        guardName: shift.guard,
        shiftStart: shift.startTime,
        shiftEnd: shift.endTime,
        totalHours: shift.hours,
        jobStatus: shift.jobStatus || 'confirmed',
        signinDetails: {
          signin_time: shift.startTime,
          signout_time: shift.endTime,
          location: shift.address || 'N/A',
          signin_notes: 'Shift completed as per roster',
          signout_notes: '',
        },
      };

      const filePath = await PDFGenerator.generateShiftReportPDF(reportData);

      Alert.alert('Success', 'Shift Report PDF generated successfully!', [
        { text: 'OK' },
        {
          text: 'Open PDF',
          onPress: () => {
            // Optional: Open the PDF using FileViewer
            // import FileViewer from 'react-native-file-viewer';
            // FileViewer.open(filePath).catch(err => console.log(err));
          },
        },
      ]);

      Toast.show({
        type: 'success',
        text1: 'PDF Generated',
        text2: 'Check your Documents folder',
        position: 'bottom',
      });
    } catch (error: any) {
      console.error('PDF Generation Error:', error);
      Alert.alert('Error', 'Failed to generate PDF. Please try again.');
      Toast.show({
        type: 'error',
        text1: 'PDF Generation Failed',
        text2: error.message || 'Unknown error',
        position: 'bottom',
      });
    } finally {
      setGeneratingPDF(false);
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'confirmed':
        return { bg: '#DCFCE7', text: '#166534' };
      case 'completed':
        return { bg: '#DBEAFE', text: '#1E40AF' };
      default:
        return { bg: '#F1F5F9', text: '#475569' };
    }
  };
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

      const res = await axios.post(
        `${BASE_URL}/fetch-customer-sites`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
        },
      );

      if (!res.data?.success || !Array.isArray(res.data?.data)) {
        setError('No shifts found this week');
        setShifts([]);
        return;
      }

      const allShifts: Shift[] = [];
      res.data.data.forEach((site: any) => {
        const siteName = site.site_name || 'Unnamed Site';
        const address = site.address || site.site_address || '';
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
          let cardBackground = '#ffffff';
          if (status === 'pending') {
            tag = 'Pending';
            cardBackground = '#ffffff';
          } else if (status === 'confirmed') {
            tag = 'Confirmed';
            cardBackground = '#ffffff';
          } else if (status === 'completed' || status === 'complete') {
            tag = 'Completed';
            cardBackground = '#ffffff';
          }

          allShifts.push({
            id: job.id,
            siteName,
            address,
            guard,
            dayShort: DAYS[dayIndex],
            dateStr: `${jobDate.getDate().toString().padStart(2, '0')}/${(
              jobDate.getMonth() + 1
            )
              .toString()
              .padStart(2, '0')}/${jobDate.getFullYear()}`,
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
        const da = new Date(
          `${a.dateStr.split('/').reverse().join('-')} ${a.startTime}`,
        );
        const db = new Date(
          `${b.dateStr.split('/').reverse().join('-')} ${b.startTime}`,
        );
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

  const openShiftModal = (shift: Shift) => {
    const idx = shifts.findIndex(s => s.id === shift.id);
    setShiftIndex(idx >= 0 ? idx : 0);
    setSelectedShift(shift);
    setShowShiftModal(true);
  };

  const navigateShift = (dir: 'prev' | 'next') => {
    const next = dir === 'next' ? shiftIndex + 1 : shiftIndex - 1;
    if (next < 0 || next >= shifts.length) return;
    setShiftIndex(next);
    setSelectedShift(shifts[next]);
    setSelectedStaffId(null);
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
          },
        },
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
                cardBackground: '#ffffff',
              }
              : s,
          ),
        );
        setSelectedShift(prev =>
          prev
            ? {
              ...prev,
              guard: staff?.name || prev.guard,
              jobStatus: 'confirmed',
              tag: 'Confirmed',
            }
            : prev,
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
      setSelectedStaffId(null);
    }
  };

  const getStatusPill = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return { bg: COLORS.danger + '33', text: COLORS.danger };

      case 'confirmed':
        return { bg: COLORS.warning + '33', text: COLORS.warning };

      case 'completed':
      case 'complete':
        return { bg: COLORS.success + '33', text: COLORS.success };

      default:
        return { bg: COLORS.textMuted, text: COLORS.textMuted };
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation?.goBack()}>
          <ChevronLeft size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.screenTitle}>My Job Applications</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Week selector */}
      <View style={styles.weekNav}>
        <TouchableOpacity
          style={styles.weekArrow}
          onPress={() => navigateWeek('prev')}
        >
          <ChevronLeft size={20} color="#64748b" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.datePill}
          onPress={() => setShowDateModal(true)}
        >
          <Calendar size={16} color="#0A7C6E" style={{ marginRight: 6 }} />
          <Text style={styles.dateText}>{weekLabel}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.weekArrow}
          onPress={() => navigateWeek('next')}
        >
          <ChevronRight size={20} color="#64748b" />
        </TouchableOpacity>
      </View>

      {/* Section label */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Shifts This Week</Text>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#0A7C6E" />
            <Text style={styles.centerText}>Loading shifts...</Text>
          </View>
        ) : error ? (
          <View style={styles.center}>
            <Text style={[styles.centerText, { color: '#ef4444' }]}>
              {error}
            </Text>
          </View>
        ) : shifts.length === 0 ? (
          <View style={styles.center}>
            <Text style={styles.centerText}>No shifts this week</Text>
          </View>
        ) : (
          <View style={styles.cardList}>
            {shifts.map(shift => {
              const pill = getStatusPill(shift.jobStatus);
              const isConfirmed = shift.jobStatus === 'completed';
              return (
                <LinearGradient
                  key={shift.id}
                  colors={[
                    'rgba(128, 128, 128, 0.17)',
                    'rgba(128, 128, 128, 0.17)',
                    'rgba(128, 128, 128, 0.17)',
                    // 'rgba(255, 255, 255, 0.35)',
                    // 'rgba(255, 255, 255, 0.22)',
                    // 'rgba(255, 255, 255, 0.12)',
                    // 'rgba(255, 255, 255, 0.25)',
                  ]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.shiftCard}
                >
                  {/* <View key={shift.id} style={styles.shiftCard}> */}
                  {/* Top row: site name + status badge */}
                  <View style={styles.siteCardInner}>
                    <View style={styles.cardTop}>
                      <Text style={styles.siteName} numberOfLines={1}>
                        {shift.siteName}
                      </Text>
                      <View
                        style={[
                          styles.statusPill,
                          { backgroundColor: pill.bg },
                        ]}
                      >
                        <Text style={[styles.pillText, { color: pill.text }]}>
                          {shift.tag}
                        </Text>
                      </View>
                    </View>

                    {/* Address */}
                    {shift.address ? (
                      <View style={styles.addressRow}>
                        <MapPin
                          size={12}
                          color="#fff"
                          style={{ marginRight: 4 }}
                        />
                        <Text style={styles.addressText} numberOfLines={1}>
                          {shift.address}
                        </Text>
                      </View>
                    ) : null}

                    {/* Hours */}
                    <Text style={styles.hoursText}>
                      Total Hours: {shift.hours.toFixed(1)} hrs
                    </Text>

                    <View style={styles.cardDivider} />

                    {/* Bottom row */}
                    <View style={styles.cardBottom}>
                      <View style={styles.cardMeta}>
                        <Text style={styles.cardDate}>{shift.dateStr}</Text>
                        <View style={styles.timeRow}>
                          <Clock
                            size={13}
                            color="#fff"
                            style={{ marginRight: 4 }}
                          />
                          <Text style={styles.cardTime}>
                            {shift.startTime} – {shift.endTime}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.cardRight}>
                        <View style={styles.guardRow}>
                          <User
                            size={12}
                            color="#94a3b8"
                            style={{ marginRight: 4 }}
                          />
                          <Text style={styles.guardName} numberOfLines={1}>
                            {shift.guard}
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={styles.viewBtn}
                          onPress={() => openShiftModal(shift)}
                          activeOpacity={0.8}
                        >
                          <Text style={styles.viewBtnText}>View</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                    {isConfirmed && (
                      <TouchableOpacity
                        style={styles.downloadBtn}
                        onPress={() => generateShiftPDF(shift)}
                      >
                        <FileText size={18} color="#fff" />
                        <Text style={styles.downloadText}>Download PDF</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </LinearGradient>
              );
            })}
          </View>
        )}
        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Date picker modal */}
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
            <TouchableOpacity
              style={styles.modalBtn}
              onPress={() => setShowDateModal(false)}
            >
              <Text style={styles.modalBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Shift detail modal */}
      <Modal
        visible={showShiftModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowShiftModal(false)}
      >
        <View style={styles.sheetOverlay}>
          <TouchableOpacity
            style={styles.sheetBackdrop}
            onPress={() => setShowShiftModal(false)}
          />
          <View style={styles.sheetModal}>
            {/* Handle */}
            <View style={styles.sheetHandle} />

            <Text style={styles.sheetTitle}>SHIFT DETAILS</Text>

            {selectedShift && (
              <>
                {/* Site + badge */}
                <View style={styles.sheetSiteRow}>
                  <Text style={styles.sheetSiteName} numberOfLines={2}>
                    {selectedShift.siteName}
                  </Text>
                  {/* <View style={[styles.statusPill, { backgroundColor: getStatusPill(selectedShift.jobStatus).bg, marginLeft: 8 }]}>
                    <Text style={[styles.pillText, { color: getStatusPill(selectedShift.jobStatus).text }]}>{selectedShift.tag}</Text>
                  </View> */}
                </View>

                {selectedShift.address ? (
                  <View style={styles.sheetAddressRow}>
                    <MapPin
                      size={13}
                      color="#94a3b8"
                      style={{ marginRight: 5 }}
                    />
                    <Text style={styles.sheetAddressText}>
                      {selectedShift.address}
                    </Text>
                  </View>
                ) : null}

                {/* Detail rows */}
                <View style={styles.sheetRows}>
                  <View style={styles.sheetRow}>
                    <Text style={styles.sheetLabel}>Date</Text>
                    <Text style={styles.sheetValue}>
                      {selectedShift.dayShort}, {selectedShift.dateStr}
                    </Text>
                  </View>
                  <View style={styles.sheetRow}>
                    <Text style={styles.sheetLabel}>Time</Text>
                    <Text style={styles.sheetValue}>
                      {selectedShift.startTime} – {selectedShift.endTime}
                    </Text>
                  </View>
                  <View style={styles.sheetRow}>
                    <Text style={styles.sheetLabel}>Total hours</Text>
                    <Text
                      style={[
                        styles.sheetValue,
                        { color: '#0A7C6E', fontWeight: '600' },
                      ]}
                    >
                      {selectedShift.hours.toFixed(1)} hrs
                    </Text>
                  </View>
                  <View style={styles.sheetRow}>
                    <Text style={styles.sheetLabel}>Guard</Text>
                    <Text style={styles.sheetValue}>{selectedShift.guard}</Text>
                  </View>
                  <View style={[styles.sheetRow, { borderBottomWidth: 0 }]}>
                    <Text style={styles.sheetLabel}>Status</Text>
                    <View
                      style={[
                        styles.statusPill,
                        {
                          backgroundColor: getStatusPill(
                            selectedShift.jobStatus,
                          ).bg,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.pillText,
                          {
                            color: getStatusPill(selectedShift.jobStatus).text,
                          },
                        ]}
                      >
                        {selectedShift.tag}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Assign staff (contractor only, pending shifts) */}
                {selectedShift.jobStatus === 'pending' && !isRestrictedUser && (
                  <View style={styles.assignSection}>
                    <Text style={styles.assignLabel}>Assign to staff</Text>
                    {loadingStaff ? (
                      <ActivityIndicator
                        size="small"
                        color="#0A7C6E"
                        style={{ marginTop: 12 }}
                      />
                    ) : staffList.length === 0 ? (
                      <Text style={styles.noStaffText}>No staff available</Text>
                    ) : (
                      <View style={styles.pickerContainer}>
                        <Picker
                          selectedValue={selectedStaffId}
                          onValueChange={val => setSelectedStaffId(val)}
                          style={styles.picker}
                        >
                          <Picker.Item
                            label="Select staff..."
                            value={null}
                            color="#aaa"
                          />
                          {staffList.map(s => (
                            <Picker.Item
                              key={s.id}
                              label={s.name}
                              value={s.id}
                              color="#000"
                            />
                          ))}
                        </Picker>
                      </View>
                    )}

                    <TouchableOpacity
                      style={[
                        styles.acceptBtn,
                        (!selectedStaffId || accepting) &&
                        styles.acceptDisabled,
                      ]}
                      onPress={handleAcceptJob}
                      disabled={!selectedStaffId || accepting}
                    >
                      {accepting ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <Text style={styles.acceptText}>
                          {selectedStaffId
                            ? 'Assign Shift'
                            : 'Select Staff First'}
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                )}

                {/* Prev / Next navigation */}
                {/* <View style={styles.sheetNavRow}>
                  <TouchableOpacity
                    style={[styles.sheetNavBtn, shiftIndex === 0 && styles.sheetNavDisabled]}
                    onPress={() => navigateShift('prev')}
                    disabled={shiftIndex === 0}
                  >
                    <ChevronLeft size={18} color={shiftIndex === 0 ? '#cbd5e1' : '#64748b'} />
                    <Text style={[styles.sheetNavText, shiftIndex === 0 && { color: '#cbd5e1' }]}>Prev</Text>
                  </TouchableOpacity>

                  <Text style={styles.sheetCounter}>{shiftIndex + 1} of {shifts.length}</Text>

                  <TouchableOpacity
                    style={[styles.sheetNavBtn, shiftIndex === shifts.length - 1 && styles.sheetNavDisabled]}
                    onPress={() => navigateShift('next')}
                    disabled={shiftIndex === shifts.length - 1}
                  >
                    <Text style={[styles.sheetNavText, shiftIndex === shifts.length - 1 && { color: '#cbd5e1' }]}>Next</Text>
                    <ChevronRight size={18} color={shiftIndex === shifts.length - 1 ? '#cbd5e1' : '#64748b'} />
                  </TouchableOpacity>
                </View> */}

                {/* Close */}
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

      <BottomTab navigation={navigation} activeTab="Applications" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingTop: 20,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },

  screenTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  downloadBtn: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    width: 135,
    alignItems: 'center',
    gap: 2,
  },
  downloadText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '600'
  },
  siteCardInner: {
    padding: 12,
  },
  /* Week nav */
  weekNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 60,
    paddingVertical: 10,
  },
  weekArrow: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  datePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  dateText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },

  /* Section header */
  sectionHeader: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.primary,
  },

  scroll: { flex: 1 },

  cardList: {
    paddingHorizontal: 12,
    gap: 10,
    flexDirection: 'column',
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
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },

  shiftCard: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  siteName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
    marginRight: 8,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  addressText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    flex: 1,
  },
  hoursText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 10,
  },
  cardDivider: {
    borderTopWidth: 0.5,
    borderColor: COLORS.cardBorder,
    marginBottom: 10,
  },
  cardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardMeta: {
    flexDirection: 'column',
    gap: 3,
  },
  cardDate: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardTime: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
  },
  cardRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  guardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  guardName: {
    fontSize: 12,
    color: COLORS.textSecondary,
    maxWidth: 120,
  },
  viewBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 8,
  },
  viewBtnText: {
    color: COLORS.background, // Used background color so text pops against the primary button
    fontSize: 12,
    fontWeight: '700',
  },

  statusPill: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
  },
  pillText: {
    fontSize: 11,
    fontWeight: '800',
  },

  /* Date picker modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 24,
    width: '86%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 20,
  },
  modalBtn: {
    marginTop: 20,
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  modalBtnText: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '600',
  },

  /* Shift detail bottom sheet */
  sheetOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheetModal: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    borderTopWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: COLORS.cardBorder,
    borderRadius: 999,
    alignSelf: 'center',
    marginBottom: 20,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.primary,
    marginBottom: 14,
    justifyContent: 'center',
    alignSelf: 'center',
    alignContent: 'center',
  },
  sheetSiteRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  sheetSiteName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
  },
  sheetAddressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  sheetAddressText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    flex: 1,
  },
  sheetRows: {
    borderTopWidth: 0.5,
    borderColor: COLORS.cardBorder,
    marginBottom: 16,
  },
  sheetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 13,
    borderBottomWidth: 0.5,
    borderColor: COLORS.cardBorder,
  },
  sheetLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  sheetValue: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
  },

  /* Assign section */
  assignSection: {
    marginBottom: 16,
  },
  assignLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 10,
  },
  pickerContainer: {
    borderWidth: 0.5,
    borderColor: COLORS.cardBorder,
    borderRadius: 12,
    backgroundColor: COLORS.card,
    overflow: 'hidden',
    marginBottom: 12,
  },
  picker: {
    height: 50,
    width: '100%',
    color: COLORS.text, // Ensures picker text is visible in dark mode
  },
  noStaffText: {
    color: COLORS.danger,
    fontSize: 13,
    marginTop: 8,
  },
  acceptBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    elevation: 3,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  acceptDisabled: {
    backgroundColor: COLORS.textMuted,
    shadowOpacity: 0,
    elevation: 0,
  },
  acceptText: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '600',
  },

  /* Prev/Next nav */
  sheetNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    paddingHorizontal: 4,
  },
  sheetNavBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: COLORS.card,
    borderWidth: 0.5,
    borderColor: COLORS.cardBorder,
  },
  sheetNavDisabled: {
    backgroundColor: COLORS.background,
    borderColor: COLORS.cardBorder,
  },
  sheetNavText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  sheetCounter: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontWeight: '500',
  },

  /* Close button */
  closeBtn: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  closeText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
});
