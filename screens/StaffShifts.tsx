import React, {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Image,
  ScrollView,
  ActivityIndicator,
  Modal,
  FlatList,
} from 'react-native';
import { ChevronDown, ChevronUp, UserCheck } from 'lucide-react-native';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  MapPin,
  FileText,
  CalendarDays,
} from 'lucide-react-native';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import BottomTab from './BottomTab';
import Toast from 'react-native-toast-message';
import {
  getUserProfile,
  getContractorStaff,
  postGuardJobs,
} from '../services/authApi';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import LinearGradient from 'react-native-linear-gradient';
const COLORS = {
  primary: '#89E7D0',
  primaryDark: '#0A7C6E',

  background: '#001F3F',
  surface: '#0A2A4D',
  surface2: '#12243A',

  card: '#FFFFFF',
  cardBorder: '#DCE6F2',

  text: '#001F3F',
  textSecondary: '#475569',
  textMuted: '#64748B',

  success: '#22C55E',
  warning: '#F59E0B',
  danger: '#EF4444',

  border: '#E2E8F0',
};

export default function StaffShifts({ navigation, route }: any) {
  const bottomSheetRef = useRef<BottomSheet>(null);
  // FIX 1: snapPoints must be memoized and stable
  const snapPoints = useMemo(() => ['60%', '70%'], []);

  const [notificationJob, setNotificationJob] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('Accepted');
  const [todayShifts, setTodayShifts] = useState<any[]>([]);
  const [weekShifts, setWeekShifts] = useState<any[]>([]);
  const [loadingToday, setLoadingToday] = useState(false);
  const [loadingWeek, setLoadingWeek] = useState(false);
  const [userType, setUserType] = useState<string>('');
  const [staffList, setStaffList] = useState<any[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<number | null>(null);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [userId, setUserId] = useState<number>(0);
  const [userDocuments, setUserDocuments] = useState<any[]>([]);
  const [userName, setUserName] = useState('');
  const [user, setUser] = useState<any>(null);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [showStaffDropdown, setShowStaffDropdown] = useState(false);
  // FIX 2: Track sheet open state separately so we control it cleanly
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userStr = await AsyncStorage.getItem('user');
        const cachedImage = await AsyncStorage.getItem('profileImage');

        if (userStr) {
          const parsedUser = JSON.parse(userStr);
          setUser(parsedUser);

          if (cachedImage) {
            setProfileImage(cachedImage);
          } else if (parsedUser?.staff?.profile_image) {
            const BASE_IMAGE_URL = 'https://apis.staffoo.com.au/storage/';
            setProfileImage(
              `${BASE_IMAGE_URL}${parsedUser.staff.profile_image}`,
            );
          }
        }
      } catch (e) {
        console.log('User load error', e);
      }
    };
    loadUser();
  }, []);

  useEffect(() => {
    const getUser = async () => {
      try {
        const userJson = await AsyncStorage.getItem('user');
        if (userJson) {
          const parsedUser = JSON.parse(userJson);
          setUserName(parsedUser?.user?.data?.name || '');
        }
      } catch (error) {
        console.log('User load error:', error);
      }
    };
    getUser();
  }, []);

  const extractJobData = (notif: any): any => {
    if (!notif) return {};

    console.log(
      '[EXTRACT DEBUG] Full notification:',
      JSON.stringify(notif, null, 2),
    );

    // 1. STAFF – deepest path
    if (notif?.additionalData?.roster?.roster?.id) {
      console.log('[EXTRACT] STAFF deep path: additionalData.roster.roster');
      return notif.additionalData.roster.roster;
    }

    // 2. STAFF – flatter
    if (notif?.additionalData?.roster?.id) {
      console.log('[EXTRACT] STAFF flat path: additionalData.roster');
      return notif.additionalData.roster;
    }

    // 3. CONTRACTOR path
    if (notif?.roster?.roster?.id) {
      console.log('[EXTRACT] CONTRACTOR path: roster.roster');
      return notif.roster.roster;
    }

    // 4. Direct job
    if (notif?.id && notif?.start) {
      console.log('[EXTRACT] Direct job path');
      return notif;
    }

    // 5. Deep search fallback
    const deepSearch = (obj: any): any => {
      if (!obj || typeof obj !== 'object') return null;
      if (obj.start && obj.end && (obj.site || obj.address)) return obj;
      for (const key in obj) {
        const found = deepSearch(obj[key]);
        if (found) return found;
      }
      return null;
    };

    const found = deepSearch(notif);
    if (found) {
      console.log('[EXTRACT] Deep search success');
      return found;
    }

    console.log('[EXTRACT] Final fallback');
    return notif;
  };

  const formatDate = (val: any) => {
    if (!val) return '—';
    const str = String(val).trim();
    if (!str) return '—';

    const [datePart] = str.split(' ');
    if (!datePart) return str;

    const parts = datePart.split('-');
    if (parts.length === 3) {
      const [y, m, d] = parts;
      return `${d.padStart(2, '0')}-${m.padStart(2, '0')}-${y}`;
    }

    return datePart || '—';
  };

  const formatTime = (val: any) => {
    if (!val) return '—';
    const str = String(val).trim();
    const parts = str.split(' ');
    const time = parts[1] || parts[0];

    if (time && time.includes(':')) {
      return time.slice(0, 5);
    }

    return '—';
  };

  useEffect(() => {
    const fetchProfile = async () => {
      setLoadingProfile(true);
      try {
        const stored = await AsyncStorage.getItem('user');
        if (!stored) return;

        const parsed = JSON.parse(stored);
        const idFromStorage = Number(parsed?.id);
        if (!idFromStorage) return;

        setUserId(idFromStorage);

        const res = await getUserProfile(idFromStorage);
        console.log('[Profile API Response]:', res);

        if (res?.success && res?.data) {
          const fresh = res.data;
          setUserDocuments(fresh.documents || []);
          const type = (fresh.user_type || '').trim().toLowerCase();
          setUserType(type);
          console.log('[Fresh user_type from API]:', type);
        } else {
          const fallback = (parsed.user_type || '').trim().toLowerCase();
          setUserType(fallback);
        }
      } catch (err) {
        console.error('[Profile Error]:', err);
        Toast.show({ type: 'error', text1: 'Failed to load profile' });

        const stored = await AsyncStorage.getItem('user');
        if (stored) {
          const parsed = JSON.parse(stored);
          setUserType((parsed.user_type || '').trim().toLowerCase());
        }
      } finally {
        setLoadingProfile(false);
      }
    };

    fetchProfile();
  }, []);

  useEffect(() => {
    if (userType !== 'contractor' || !notificationJob || !userId) return;

    const loadStaff = async () => {
      setLoadingStaff(true);
      try {
        const res = await getContractorStaff(userId);
        if (res?.guards?.length) {
          setStaffList(res.guards);
        }
      } catch (err) {
        console.error('[Staff Load Error]:', err);
      } finally {
        setLoadingStaff(false);
      }
    };

    loadStaff();
  }, [userType, notificationJob, userId]);

  // FIX 3: Removed setTimeout + expand() — let index prop control the sheet
  useEffect(() => {
    if (route?.params?.notificationJob && userType) {
      console.log(
        '[DEBUG] Setting notificationJob from route.params:',
        route.params.notificationJob,
      );
      setNotificationJob(route.params.notificationJob);
      setSheetOpen(true);
    }
  }, [route?.params?.notificationJob, userType]);

  // FIX 4: Removed setTimeout + expand() from pending notification check
  useFocusEffect(
    useCallback(() => {
      const checkPending = async () => {
        try {
          const pending = await AsyncStorage.getItem(
            '@pending_asap_notification',
          );
          if (pending && userType) {
            const job = JSON.parse(pending);
            console.log('[DEBUG] Pending notification from storage:', job);
            setNotificationJob(job);
            setSheetOpen(true);
            await AsyncStorage.removeItem('@pending_asap_notification');
          }
        } catch (err) {
          console.error('[Pending Notification Error]:', err);
        }
      };
      checkPending();
    }, [userType]),
  );

  const getInitials = (name: string): string => {
    if (!name) return 'U';
    const parts = name.trim().split(' ').filter(Boolean);
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return parts[0][0].toUpperCase() + parts[parts.length - 1][0].toUpperCase();
  };

  // FIX 5: Reset both notificationJob and sheetOpen on close
  const handleSheetClose = () => {
    setNotificationJob(null);
    setSelectedStaff(null);
    setSheetOpen(false);
  };

  const handleAccept = () => {
    if (userType === 'contractor' && !selectedStaff) {
      Toast.show({ type: 'error', text1: 'Please select a staff member' });
      return;
    }

    navigation.navigate('AsapJobDetails', {
      job: notificationJob,
      staff_id: userType === 'contractor' ? selectedStaff : undefined,
    });

    bottomSheetRef.current?.close();
    setSelectedStaff(null);
    setSheetOpen(false);
  };

  const handleDecline = () => {
    console.log('Job Declined:', notificationJob);
    bottomSheetRef.current?.close();
    setSheetOpen(false);
  };

  useFocusEffect(
    useCallback(() => {
      const fetchShifts = async () => {
        setLoadingToday(true);
        try {
          const todayRes = await postGuardJobs('confirmed', 'today');
          setTodayShifts(todayRes?.data?.today || todayRes?.data || []);
        } catch (err) {
          Toast.show({ type: 'error', text1: "Failed to load today's shifts" });
        } finally {
          setLoadingToday(false);
        }

        setLoadingWeek(true);
        try {
          const weekRes = await postGuardJobs('confirmed', 'week');
          setWeekShifts(weekRes?.data?.week || weekRes?.data || []);
        } catch (err) {
          Toast.show({ type: 'error', text1: 'Failed to load week shifts' });
        } finally {
          setLoadingWeek(false);
        }
      };

      fetchShifts();
    }, []),
  );

  const renderShiftCard = (shift: any, index: number, isToday = false) => {
    const isConfirmed = shift.job_status?.toLowerCase() === 'confirmed';
    const signinStatus = Number(shift.signin_status ?? 0);
    let onPress = () => {
      Toast.show({ type: 'info', text1: 'Action not available' });
    };

    let showButton = false;
    let buttonText = '';
    let buttonStyle: any = {};
    let textColor = '';
    let disabled = false;

    if (isToday && isConfirmed && signinStatus === 0) {
      showButton = true;
      buttonText = 'Sign In';
      buttonStyle = styles.signInButton;
      textColor = '#92400e';

      const guardUserId = shift.guard?.user_id ?? shift.user_id;
      const isUserAdmin = Number(guardUserId) === 1;
      let hasMissingDocs = false;

      if (!isUserAdmin && Number(shift.is_document) === 1) {
        hasMissingDocs =
          !userDocuments ||
          userDocuments.length === 0 ||
          userDocuments.some((doc: any) => !doc.file || !doc.document_no);
      }

      if (hasMissingDocs) {
        onPress = () => {
          Toast.show({
            type: 'error',
            text1: 'Incomplete Profile',
            text2:
              'Please add your documents first then you can sign-in into job',
          });
        };
        buttonStyle = [styles.signInButton, { opacity: 0.5 }];
      } else {
        onPress = () => navigation.navigate('SignIn', { shift });
      }
    } else if (isToday && isConfirmed && signinStatus === 1) {
      showButton = true;
      buttonText = 'Ongoing';
      buttonStyle = styles.ongoingButton;
      textColor = '#166534';
      onPress = () => navigation.navigate('Ongoing', { currentShift: shift });
    } else if (!isToday) {
      showButton = true;
      buttonText = 'Upcoming';
      buttonStyle = styles.viewButton;
      textColor = '#6b7280';
      disabled = true;
    }

    return (
      <View key={index} style={styles.shiftCard}>
        <View style={styles.rowBetween}>
          <View style={styles.rowItem}>
            <View style={styles.iconBgGrey}>
              <CalendarDays size={15} color="#334155" />
            </View>
            <Text style={styles.rowText}>
              {formatDate(shift.start) ||
                `${shift.job_start_day || '—'}-${shift.job_start_month || '—'
                }-${shift.job_start_year || '—'}`}
            </Text>
          </View>

          <View style={styles.rowItem}>
            <View style={styles.iconBgGrey}>
              <Clock size={15} color="#334155" />
            </View>
            <Text style={styles.rowText}>
              {formatTime(shift.start)} – {formatTime(shift.end)}
            </Text>
          </View>
        </View>

        <View style={styles.rowItem}>
          <View style={styles.iconBgGrey}>
            <MapPin size={15} color="#334155" />
          </View>
          <View style={styles.addressContainer}>
            <Text style={styles.addressText} numberOfLines={3}>
              {shift.site?.address || 'No address available'}
            </Text>
          </View>
        </View>

        <TouchableOpacity style={[styles.rowItem]}>
          <View style={styles.iconBgGrey}>
            <FileText size={15} color="#334155" />
          </View>
          <Text style={styles.documentText}>
            {shift.instructions_file
              ? 'Click to view instructions'
              : 'No instruction file'}
          </Text>
        </TouchableOpacity>

        <View style={[styles.rowBetween, { alignItems: 'flex-start' }]}>
          <View style={{ flex: 1, paddingRight: 16 }}>
            <Text style={styles.detailsLabel}>Instructions / Notes</Text>
            <Text style={styles.detailsValue}>
              {shift.site?.site_description || 'No site description'}
            </Text>
          </View>

          {showButton && (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={onPress}
              disabled={disabled}
              style={[
                styles.actionButton,
                buttonStyle,
                disabled && { opacity: 0.5 },
              ]}
            >
              <Text style={[styles.actionButtonText, { color: textColor }]}>
                {buttonText}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const jobData = extractJobData(notificationJob);

  useEffect(() => {
    if (notificationJob) {
      console.log('[DEBUG] notificationJob received:', notificationJob);
      console.log('[DEBUG] Extracted jobData:', jobData);
      console.log('[DEBUG] start:', jobData?.start);
      console.log('[DEBUG] end:', jobData?.end);
      console.log(
        '[DEBUG] address:',
        jobData?.site?.address || jobData?.address,
      );
    }
  }, [notificationJob]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={[COLORS.primaryDark, COLORS.primaryDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.cardTop}
        >
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.headerLeft}
              onPress={() => navigation.navigate('Profile')}
            >
              {profileImage ? (
                <Image source={{ uri: profileImage }} style={styles.avatar} />
              ) : (
                <View style={styles.initialsAvatar}>
                  <Text style={styles.initialsText}>
                    {getInitials(user?.name || 'User')}
                  </Text>
                </View>
              )}

              <View>
                <View style={styles.nameRow}>
                  <Text style={styles.greeting}>
                    {user?.name || 'User Name'} 👋
                  </Text>
                </View>
                <Text style={styles.staffName}>Welcome to Staffoo</Text>
              </View>
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* <View style={styles.tabsWrapper}>
          {[
            { label: 'Ongoing', light: '#dcfce7', dark: '#16a34a' },
            { label: 'Pending', light: '#fee2e2', dark: '#dc2626' },
            { label: 'Completed', light: '#fef3c7', dark: '#f59e0b' },
          ].map(tab => {
            const isActive = activeTab === tab.label;

            return (
              <TouchableOpacity
                key={tab.label}
                style={[
                  styles.tabItem,
                  {
                    backgroundColor: isActive ? tab.dark : tab.light,
                    transform: [{ scale: isActive ? 1.08 : 1 }],
                    ...(isActive && styles.activeShadow),
                  },
                ]}
                onPress={() => setActiveTab(tab.label)}
                activeOpacity={0.9}
              >
                <Text
                  style={{
                    color: isActive ? '#fff' : tab.dark,
                    fontWeight: isActive ? '800' : '600',
                    fontSize: isActive ? 13 : 12,
                  }}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View> */}

        {loadingToday || loadingWeek ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#10B981" />
            <Text style={styles.loadingText}>Loading shifts...</Text>
          </View>
        ) : (
          <>
            <Text style={styles.sectionHeader}>Today's Shifts</Text>
            {todayShifts.length === 0 ? (
              <Text style={styles.emptyText}>No shifts today</Text>
            ) : (
              todayShifts.map((shift, index) =>
                renderShiftCard(shift, index, true),
              )
            )}

            <Text style={styles.sectionHeader}>This Week's Shifts</Text>
            {weekShifts.length === 0 ? (
              <Text style={styles.emptyText}>No shifts this week</Text>
            ) : (
              weekShifts.map((shift, index) =>
                renderShiftCard(shift, index, false),
              )
            )}
          </>
        )}

        {!notificationJob && <View style={styles.placeholder} />}
      </ScrollView>

      {/*
        FIX 6: index is controlled by sheetOpen state only.
        No more setTimeout + expand() anywhere.
        FIX 7: BottomSheetView has flex:1 so content renders correctly in v5.
      */}
      <BottomSheet
        ref={bottomSheetRef}
        index={sheetOpen ? 0 : -1}
        snapPoints={snapPoints}
        enablePanDownToClose={true}
        onClose={handleSheetClose}
        backgroundStyle={styles.sheetBackground}
        handleIndicatorStyle={styles.sheetHandle}
        enableDynamicSizing={false}
        android_keyboardInputMode="adjustResize"
        onChange={index => {
          console.log('[BottomSheet] index changed to:', index);
          if (index === -1) {
            handleSheetClose();
          }
        }}
      >
        {/* FIX 7: flex:1 is required in @gorhom/bottom-sheet v5 */}
        <BottomSheetView style={[styles.sheetContent, { flex: 1 }]}>
          <Text style={styles.newRequest}>New Request</Text>

          <View style={styles.infoRow}>
            <Calendar size={20} color="#555" />
            <Text style={styles.infoText}>{formatDate(jobData.start)}</Text>
          </View>

          <View style={styles.infoRow}>
            <Clock size={20} color="#555" />
            <Text style={styles.infoText}>
              {formatTime(jobData.start)} – {formatTime(jobData.end)}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <MapPin size={20} color="#EF4444" />
            <Text style={styles.addressInSheet} numberOfLines={3}>
              {jobData?.site?.address ||
                jobData?.address ||
                'No address available'}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoTextt}>
              Total Hours: {jobData?.hours ?? '—'}
            </Text>
          </View>

          {userType === 'contractor' && (
            <View style={{ marginVertical: 10 }}>
              <Text style={styles.assignLabel}>Assign to Staff Member</Text>

              {loadingStaff ? (
                <ActivityIndicator size="small" color="#10B981" />
              ) : staffList.length === 0 ? (
                <Text style={{ color: '#DC2626', padding: 10 }}>
                  No staff available
                </Text>
              ) : (
                <>
                  {/* Custom Dropdown */}
                  <TouchableOpacity
                    style={styles.customDropdown}
                    onPress={() => setShowStaffDropdown(true)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.dropdownContent}>
                      <UserCheck size={20} color="#64748b" />

                      <Text style={styles.dropdownText} numberOfLines={1}>
                        {selectedStaff
                          ? staffList.find(s => s.id === selectedStaff)?.name ||
                          `Staff #${selectedStaff}`
                          : 'Select staff member'}
                      </Text>
                    </View>

                    <View style={styles.iconRight}>
                      <ChevronDown size={20} color="#64748b" />
                    </View>
                  </TouchableOpacity>

                  {/* Dropdown Modal */}
                  <Modal
                    visible={showStaffDropdown}
                    transparent
                    animationType="fade"
                    onRequestClose={() => setShowStaffDropdown(false)}
                  >
                    <View style={styles.modalOverlay}>
                      <View style={styles.dropdownModal}>
                        <Text style={styles.modalTitle}>Select Staff</Text>

                        <FlatList
                          data={staffList}
                          keyExtractor={item => item.id.toString()}
                          renderItem={({ item }) => (
                            <TouchableOpacity
                              style={styles.staffItem}
                              onPress={() => {
                                setSelectedStaff(item.id);
                                setShowStaffDropdown(false);
                              }}
                            >
                              <Text style={styles.staffNameText}>
                                {item.name || item.email || `Staff #${item.id}`}
                              </Text>
                            </TouchableOpacity>
                          )}
                        />

                        <TouchableOpacity
                          style={styles.cancelButtonModal}
                          onPress={() => setShowStaffDropdown(false)}
                        >
                          <Text style={styles.cancelText}>Cancel</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </Modal>
                </>
              )}
            </View>
          )}

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[
                styles.acceptButton,
                userType === 'contractor' &&
                !selectedStaff &&
                styles.disabledButton,
              ]}
              disabled={userType === 'contractor' && !selectedStaff}
              onPress={handleAccept}
            >
              <Text style={styles.buttonText}>ACCEPT</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.declineButton}
              onPress={handleDecline}
            >
              <Text style={styles.buttonText}>DECLINE</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                bottomSheetRef.current?.close();
                setSheetOpen(false);
              }}
            >
              <Text style={styles.buttonText}>CANCEL</Text>
            </TouchableOpacity>
          </View>
        </BottomSheetView>
      </BottomSheet>

      <BottomTab navigation={navigation} activeTab="StaffShifts" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // backgroundColor: COLORS.background,
    backgroundColor: '#111111',
    paddingTop: 40,
  },
  scrollContainer: {
    flex: 1,
  },
  pendingButton: {
    backgroundColor: COLORS.background,
  },
  signInButton: {
    backgroundColor: '#FEF3C7',
  },
  signedInButton: {
    backgroundColor: '#dcfce7',
  },
  viewButton: {
    backgroundColor: '#E2E8F0',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  nameRow: { flexDirection: 'row', alignItems: 'center' },
  welcome: {
    fontSize: 13.5,
    color: '#666',
    marginTop: 2,
  },
  tabsWrapper: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
  },
  name: { fontSize: 18, fontWeight: '700', color: '#000' },
  tabItem: {
    flex: 1,
    marginHorizontal: 6,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E9ECF5',
  },

  activeShadow: {
    elevation: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    zIndex: 10,
  },
  weekSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 30,
    marginBottom: 10,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 12,
    // marginTop: 10,
  },
  initialsAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#bee1ee',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 0,
  },
  initialsText: {
    color: '#2c7f71',
    fontSize: 18,
    fontWeight: '700',
  },
  weekButton: {
    backgroundColor: '#10B981',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
  },
  weekText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 15.5,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 10,
    marginBottom: 9,
    paddingHorizontal: 4,
    color: COLORS.primaryDark,
  },
  btn: { paddingRight: 25 },
  shiftCard: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.cardBorder,

    borderRadius: 18,
    padding: 16,
    marginBottom: 14,

    borderWidth: 1,

    shadowColor: '#0A7C6E',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  rowItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 5,
  },
  rowText: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: '500',
    alignItems: 'center',
    marginTop: 10,
  },
  iconBgGrey: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.5,
    backgroundColor: '#6EE7B7',
  },
  directionSquare: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
  },
  directionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1d4ed8',
  },
  addressText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    flex: 1,
    flexWrap: 'wrap',
    marginTop: 10,
  },
  addressContainer: {
    flex: 1,
    marginRight: 10,
  },
  documentText: {
    fontSize: 12,
    color: '#1e293b',
    fontWeight: '500',
    marginTop: 10,
  },
  detailsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 3,
  },
  detailsValue: {
    fontSize: 13,
    color: COLORS.text,
    marginTop: 5,
  },
  actionButton: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    minWidth: 90,
    alignItems: 'center',
  },
  ongoingButton: {
    backgroundColor: '#DCFCE7',
  },
  actionButtonText: {
    fontSize: 11,
    fontWeight: '700',
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 300,
    paddingVertical: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 100,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 25,
    fontSize: 12,
    color: '#777',
  },
  sheetBackground: {
    backgroundColor: '#c3e3eb',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  sheetHandle: {
    backgroundColor: '#d1d5db',
    width: 42,
    height: 5,
    borderRadius: 999,
  },
  sheetContent: {
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 44,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111',
    marginBottom: 6,
  },
  addressInSheet: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
  },
  assignLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 6,
  },
  newRequest: {
    fontSize: 20,
    color: '#10B981',
    fontWeight: '700',
    marginBottom: 15,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    gap: 16,
  },
  infoText: {
    fontSize: 14,
    color: '#111',
    fontWeight: '500',
  },
  infoTextt: {
    fontSize: 16,
    color: '#111',
    fontWeight: '700',
  },
  buttonContainer: {
    gap: 12,
    marginTop: 20,
    paddingHorizontal: 50,
  },
  acceptButton: {
    backgroundColor: COLORS.success,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  declineButton: {
    backgroundColor: COLORS.danger,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: COLORS.textMuted,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    backgroundColor: '#F9FAFB',
    overflow: 'hidden',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 20,
  },
  header: {
    height: 60,
  },
  greeting: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '700',
  },
  staffName: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ffffff30',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationText: {
    fontSize: 18,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  dropdownModal: {
    width: '85%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    maxHeight: '60%',
  },

  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E2937',
    textAlign: 'center',
    marginBottom: 16,
  },

  staffItem: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },

  staffNameText: {
    fontSize: 16,
    color: '#1E2937',
  },

  cancelButtonModal: {
    marginTop: 12,
    paddingVertical: 14,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    alignItems: 'center',
  },

  cancelText: {
    color: '#64748B',
    fontWeight: '600',
    fontSize: 16,
  },
  customDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    // marginTop: 8,
    width: '100%', // 🔥 IMPORTANT (prevents overflow)
    overflow: 'hidden', // 🔥 keeps icon inside card
  },

  dropdownContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1, // 🔥 important for text truncation
    gap: 12,
  },

  dropdownText: {
    fontSize: 15,
    color: '#1E2937',
    flexShrink: 1, // 🔥 prevents pushing icon outside
  },

  iconRight: {
    marginLeft: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
