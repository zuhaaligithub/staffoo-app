


import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Modal,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import {
  LogOut,
  User,
  FileText,
  CheckCircle,
  AlertCircle,
  CreditCard,
  Trash2,
  Wallet,
  Clock,
  BookOpen,
  ChevronRight,
  Settings,
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { launchImageLibrary } from 'react-native-image-picker';
import Toast from 'react-native-toast-message';
import { getUserProfile, logoutUser } from '../services/authApi';
import BottomTab from './BottomTab';
import { LogLevel, OneSignal } from 'react-native-onesignal';
import { sendNotificationTokenToServer } from '../screens/LoginScreen';
import { useFocusEffect } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';

const ONESIGNAL_APP_ID = '79041c59-5506-4e56-9de4-8a6619f85e1d';
const { width } = Dimensions.get('window');

type Props = {
  navigation: any;
};

type AsapJobData = {
  id?: number;
  roster_id?: number;
  temp_start?: string;
  temp_end?: string;
  address?: string;
  [key: string]: any;
};

export default function ProfileScreen({ navigation }: Props) {
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [completionPercentage, setCompletionPercentage] = useState<number>(0);
  const [isActive, setIsActive] = useState<boolean>(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [jobData, setJobData] = useState<AsapJobData | null>(null);
  const foregroundHandlerRef = useRef<((event: any) => void) | null>(null);
  const clickHandlerRef = useRef<((event: any) => void) | null>(null);
  const subscriptionChangeHandlerRef = useRef<
    ((event: any) => Promise<void>) | null
  >(null);
  const [imageFile, setImageFile] = useState<any>(null);

  const getInitials = (name: string): string => {
    if (!name) return 'U';
    const nameParts = name.trim().split(' ').filter(Boolean);
    if (nameParts.length === 1) return nameParts[0].charAt(0).toUpperCase();
    return (
      nameParts[0].charAt(0).toUpperCase() +
      nameParts[nameParts.length - 1].charAt(0).toUpperCase()
    );
  };

  useFocusEffect(
    useCallback(() => {
      const loadProfile = async () => {
        setLoading(true);
        try {
          const userId = await AsyncStorage.getItem('@user_id');
          const token = await AsyncStorage.getItem('@auth_token');
          const cachedImage = await AsyncStorage.getItem('profileImage');
          if (cachedImage) setProfileImage(cachedImage);
          if (!userId || !token) {
            navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
            return;
          }
          setUserId(userId);
          const profileResponse = await getUserProfile(userId);
          if (profileResponse?.success && profileResponse?.data) {
            const freshData = profileResponse.data;
            setUser(freshData);
            setCompletionPercentage(
              freshData.profile_completion_percentage || 0,
            );
            setIsActive(freshData.is_active || false);

            // Inside loadProfile function, after setUser(freshData)

            let imageUri = null;
            const BASE_IMAGE_URL = 'https://apis.staffoo.com.au/storage/';

            if (freshData.user_type === 'customer') {
              imageUri =
                freshData.customer?.profile_image || freshData.profile_image;
            } else if (freshData.user_type === 'staff') {
              imageUri = freshData.staff?.profile_image;
            } else if (freshData.user_type === 'contractor') {
              imageUri = freshData.contractor?.profile_image;
            }

            if (imageUri) {
              const fullUri = imageUri.startsWith('http')
                ? imageUri
                : `${BASE_IMAGE_URL}${imageUri}`;

              setProfileImage(fullUri);
              await AsyncStorage.setItem('profileImage', fullUri);
            }
            await AsyncStorage.setItem('user', JSON.stringify(freshData));
          } else {
            const cached = await AsyncStorage.getItem('user');
            if (cached) setUser(JSON.parse(cached));
          }
        } catch (err: any) {
          console.error('❌ Profile fetch error:', err);
          if (err?.status === 401) {
            await AsyncStorage.multiRemove([
              '@user_id',
              '@auth_token',
              'user',
              'profileImage',
            ]);
            navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
            return;
          }
          const cached = await AsyncStorage.getItem('user');
          if (cached) setUser(JSON.parse(cached));
        } finally {
          setLoading(false);
        }
      };
      loadProfile();
    }, []),
  );

  useEffect(() => {
    if (!userId || !user?.user_type) return;
    if (user.user_type === 'customer') return;

    let pollTimer: ReturnType<typeof setTimeout> | undefined;
    const setupOneSignal = async () => {
      OneSignal.Debug.setLogLevel(LogLevel.Verbose);
      OneSignal.initialize(ONESIGNAL_APP_ID);
      await new Promise(r => setTimeout(r, 800));
      OneSignal.Notifications.requestPermission(true);
      subscriptionChangeHandlerRef.current = async (event: any) => {
        const playerId = event.current?.id ?? null;
        if (playerId && userId) {
          const authToken = await AsyncStorage.getItem('@auth_token');
          if (authToken) await sendNotificationTokenToServer(playerId, userId);
        }
      };
      OneSignal.User.pushSubscription.addEventListener(
        'change',
        subscriptionChangeHandlerRef.current,
      );
      foregroundHandlerRef.current = (event: any) => {
        event.preventDefault();
        event.getNotification().display();
      };
      OneSignal.Notifications.addEventListener(
        'foregroundWillDisplay',
        foregroundHandlerRef.current,
      );
      clickHandlerRef.current = (event: any) => {
        const notification = event.notification;
        const additionalData = notification?.additionalData || {};
        const pageName = additionalData.page;
        if (pageName === 'asap-job-list') {
          let asapData: AsapJobData = {};
          try {
            asapData = additionalData.job_data
              ? JSON.parse(additionalData.job_data)
              : {};
          } catch (e) {
            console.warn('Failed to parse job_data:', e);
          }
          setJobData(asapData);
          setModalVisible(true);
        }
      };
      OneSignal.Notifications.addEventListener(
        'click',
        clickHandlerRef.current,
      );
      pollTimer = setTimeout(async () => {
        try {
          const playerId = await OneSignal.User.pushSubscription.getIdAsync();
          if (playerId && userId) {
            const authToken = await AsyncStorage.getItem('@auth_token');
            if (authToken)
              await sendNotificationTokenToServer(playerId, userId);
          }
        } catch (e) {
          console.warn('Poll failed:', e);
        }
      }, 5000);
    };
    setupOneSignal();
    return () => {
      if (subscriptionChangeHandlerRef.current)
        OneSignal.User.pushSubscription.removeEventListener(
          'change',
          subscriptionChangeHandlerRef.current,
        );
      if (foregroundHandlerRef.current)
        OneSignal.Notifications.removeEventListener(
          'foregroundWillDisplay',
          foregroundHandlerRef.current,
        );
      if (clickHandlerRef.current)
        OneSignal.Notifications.removeEventListener(
          'click',
          clickHandlerRef.current,
        );
      if (pollTimer) clearTimeout(pollTimer);
    };
  }, [userId, user?.user_type]);

  const pickImage = async () => {
    const result = await launchImageLibrary({
      mediaType: 'photo',
      quality: 0.7,
    });
    if (!result.didCancel && result.assets && result.assets.length > 0) {
      const imageUri = result.assets[0].uri;
      if (imageUri) {
        setProfileImage(imageUri);
        setImageFile(result.assets[0]);
        await AsyncStorage.setItem('profileImage', imageUri);
      }
    }
  };

  const getProfileSections = (userType: string | undefined) => {
    const type = userType?.toLowerCase().trim();

    const allSections = [
      {
        title: 'Personal Info',
        icon: <User size={20} color="#fff" />,
        bgColor: '#6590d9',
        route: 'ProfileSetup',
      },
      {
        title: 'Documents',
        icon: <FileText size={20} color="#fff" />,
        bgColor: '#786bd8',
        route: 'Documents',
      },
      {
        title: 'Staff Forms',
        icon: <FileText size={20} color="#fff" />,
        bgColor: '#6aa957',
        route: 'StaffForms',
      },
      {
        title: 'Induction',
        icon: <BookOpen size={20} color="#fff" />,
        bgColor: '#63b6dd',
        route: 'Induction',
      },
      {
        title: 'Test',
        icon: <Wallet size={20} color="#fff" />,
        bgColor: '#c36f3a',
        route: 'Test',
      },
      {
        title: 'Payslip',
        icon: <Wallet size={20} color="#fff" />,
        bgColor: '#c36f3a',
        route: 'Payslip',
      },
      {
        title: 'Payment History',
        icon: <Clock size={20} color="#fff" />,
        bgColor: '#26C6DA',
        route: 'JobPayment',
      },
      {
        title: 'Bank Details',
        icon: <CreditCard size={20} color="#fff" />,
        bgColor: '#8B5CF6',
        route: 'PaymentMethod',
      },
      {
        title: 'Log Out',
        icon: <LogOut size={20} color="#fff" />,
        bgColor: '#F85858',
        route: 'Logout',
        isDanger: true,
      },
      {
        title: 'Delete Profile',
        icon: <Trash2 size={20} color="#fff" />,
        bgColor: '#EF4444',
        route: 'DeleteProfile',
        isDanger: true,
      },
    ];

    if (type === 'staff') {
      return allSections.filter(s =>
        [
          'Personal Info',
          'Documents',
          'Staff Forms',
          // 'Test',
          'Induction',
          'Log Out',
          'Delete Profile',
        ].includes(s.title),
      );
    }

    if (type === 'contractor') {
      return allSections.filter(s =>
        ['Personal Info', 'Documents', 'Log Out', 'Delete Profile'].includes(
          s.title,
        ),
      );
    }

    if (type === 'customer') {
      return allSections.filter(s =>
        [
          'Personal Info',
          'Payment History',
          'Bank Details',
          'Log Out',
          'Delete Profile',
        ].includes(s.title),
      );
    }

    return allSections; // fallback
  };
  const isProfileComplete = completionPercentage === 100;

  const handleSectionPress = (route: string) => {
    if (route === 'Logout') {
      Alert.alert('Logout', 'Are you sure you want to logout?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('@auth_token');
              if (token) await logoutUser();
              await AsyncStorage.multiRemove([
                '@user_id',
                '@auth_token',
                'user',
                'profileImage',
              ]);
              Toast.show({ type: 'success', text1: 'Logged out successfully' });
              navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
            } catch (error: any) {
              await AsyncStorage.multiRemove([
                '@user_id',
                '@auth_token',
                'user',
                'profileImage',
              ]);
              navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
            }
          },
        },
      ]);
      return;
    }
    if (route === 'DeleteProfile') {
      Alert.alert(
        'Delete Profile',
        'Are you sure you want to delete your profile? This action cannot be undone.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                if (!userId) {
                  Toast.show({ type: 'error', text1: 'User ID missing' });
                  return;
                }
                const token = await AsyncStorage.getItem('@auth_token');
                if (!token) {
                  Toast.show({ type: 'error', text1: 'No auth token' });
                  return;
                }
                const response = await fetch(
                  `https://apis.staffoo.com.au/api/user-delete/${userId}`,
                  {
                    method: 'GET',
                    headers: {
                      'Content-Type': 'application/json',
                      Authorization: `Bearer ${token}`,
                    },
                  },
                );
                const data = await response.json();
                if (!response.ok || !data.success) {
                  Toast.show({
                    type: 'error',
                    text1: 'Delete failed',
                    text2: data.message || 'Something went wrong',
                  });
                  return;
                }
                await AsyncStorage.multiRemove([
                  '@user_id',
                  '@auth_token',
                  'user',
                  'profileImage',
                ]);
                Toast.show({
                  type: 'success',
                  text1: 'Profile deleted successfully',
                });
                navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
              } catch (err) {
                Toast.show({
                  type: 'error',
                  text1: 'Error deleting profile',
                  text2: err instanceof Error ? err.message : 'Unknown error',
                });
              }
            },
          },
        ],
      );
      return;
    }
    navigation.navigate(route);
  };

  const getUserTypeLabel = (type: string | undefined | null) => {
    switch (type) {
      case 'customer':
        return 'Customer Profile';

      case 'staff':
        return 'Staff Profile';

      case 'contractor':
        return 'Resource Partner Profile';

      default:
        return 'Profile';
    }
  };
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#89e7d0" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  const sections = getProfileSections(user?.user_type);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 90 }}
      >
        {/* ── Hero Header ── */}
        <View style={styles.heroSection}>
          {/* Title */}
          <View style={styles.heroTopRow}>
            <Text style={styles.heroTitle}>My Profile</Text>
          </View>

          {/* Avatar + Info */}
          <View style={styles.profileInfoContainer}>
            <TouchableOpacity style={styles.avatarWrapper} onPress={pickImage}>
              {profileImage ? (
                <Image source={{ uri: profileImage }} style={styles.avatar} />
              ) : (
                <View style={styles.initialsAvatar}>
                  <Text style={styles.initialsText}>
                    {getInitials(user?.name || 'User')}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            <View style={styles.nameSection}>
              <Text style={styles.heroName}>
                {user?.name || 'Samad Younas'}
              </Text>

              {/* Customer Profile Badge */}
              {/* {user?.user_type && (
                <View style={styles.customerBadge}>
                  <Text style={styles.customerBadgeText}>
                    {user.user_type === 'customer'
                      ? 'Customer Profile'
                      : user.user_type.charAt(0).toUpperCase() +
                        user.user_type.slice(1) +
                        ' Profile'}
                  </Text>
                </View>
              )} */}

              {user?.user_type && (
                <View style={styles.customerBadge}>
                  <Text style={styles.customerBadgeText}>
                    {getUserTypeLabel(user.user_type)}
                  </Text>
                </View>
              )}

              {/* Status Chips */}
              <View style={styles.statusRow}>
                <View style={styles.statusChip}>
                  <CheckCircle size={14} color="#34C88A" />
                  <Text style={styles.statusChipTextActive}>Active</Text>
                </View>

                <View style={styles.statusChip}>
                  <CheckCircle size={14} color="#34C88A" />
                  <Text style={styles.statusChipTextActive}>100% Complete</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Profile Completion Bar */}
          <View style={styles.completionContainer}>
            <Text style={styles.completionLabel}>Profile completion</Text>
            <Text style={styles.completionPercentage}>
              {completionPercentage}%
            </Text>
          </View>

          <View style={styles.progressBarBg}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${completionPercentage}%` },
              ]}
            />
          </View>
        </View>

        {/* ── Incomplete warning ── */}
        {!isProfileComplete && (
          <View style={styles.warningCard}>
            <AlertCircle size={20} color="#F5A623" />
            <Text style={styles.warningText}>
              Complete your profile to unlock full access —{' '}
              {completionPercentage}% done
            </Text>
          </View>
        )}

        {/* ── Grid Cards ── */}
        <View style={styles.gridContainer}>
          {sections.map((section, index) => (
            <TouchableOpacity
              key={index}
              style={styles.cardWrapper} // ← New wrapper
              onPress={() => handleSectionPress(section.route)}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={[
                  'rgba(255, 255, 255, 0.42)',
                  'rgba(255, 255, 255, 0.35)',
                  'rgba(255, 255, 255, 0.22)',
                  'rgba(255, 255, 255, 0.12)',
                  'rgba(255, 255, 255, 0.25)',
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.card}
              >
                <View style={styles.cardIconWrapper}>{section.icon}</View>
                <Text style={styles.cardLabel}>{section.title}</Text>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <BottomTab navigation={navigation} activeTab="Profile" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#001F3F',
  },

  /* ── Loading ── */
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F0F4FF',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: '#666',
    fontWeight: '500',
  },

  settingsBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  cameraChip: {
    marginTop: 8,
    backgroundColor: '#89e7d0',
    paddingHorizontal: 16,
    paddingVertical: 5,
    borderRadius: 20,
  },
  cameraChipText: { color: '#fff', fontSize: 12, fontWeight: '600' },

  heroEmail: {
    fontSize: 13,
    color: '#94A3B8',
  },

  /* Type pill */
  // typePill: {
  //   backgroundColor: 'rgba(79,142,247,0.18)',
  //   borderRadius: 20,
  //   borderWidth: 1,
  //   borderColor: 'rgba(79,142,247,0.4)',
  //   paddingHorizontal: 16,
  //   paddingVertical: 5,
  //   marginBottom: 14,
  // },
  typePill: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(137,231,208,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginBottom: 14,
  },
  typePillText: { color: '#89e7d0', fontSize: 12, fontWeight: '600' },

  statusChipText: { fontSize: 12, fontWeight: '600' },

  /* ── Warning banner ── */
  warningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FEF3C7',
    borderLeftWidth: 4,
    borderLeftColor: '#F5A623',
    marginHorizontal: 16,
    // marginTop: 16,
    marginBottom: 4,
    padding: 14,
    borderRadius: 14,
  },
  warningText: { flex: 1, fontSize: 13, color: '#92400E', fontWeight: '500' },

  heroSection: {
    backgroundColor: '#0A1F3D', // Dark blue like screenshot
    paddingTop: 20,
    paddingBottom: 28,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },

  heroTopRow: {
    marginBottom: 20,
  },

  heroTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },

  profileInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 16,
  },

  avatarWrapper: {
    alignItems: 'center',
  },

  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 3,
    borderColor: '#5CE1D6', // Teal border
  },

  initialsAvatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#1E3A5F',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#5CE1D6',
  },

  initialsText: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '700',
  },

  nameSection: {
    flex: 1,
  },

  heroName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 6,
  },

  customerBadge: {
    backgroundColor: '#1E3A5F',
    borderWidth: 1,
    borderColor: '#5CE1D6',
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 12,
  },

  customerBadgeText: {
    color: '#5CE1D6',
    fontSize: 13,
    fontWeight: '600',
  },

  statusRow: {
    flexDirection: 'row',
    gap: 10,
  },

  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1F2A44',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },

  statusChipTextActive: {
    color: '#34C88A',
    fontSize: 13,
    fontWeight: '600',
  },

  completionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingTop: 0,
    marginTop: 0,
    // paddingHorizontal: 4,
  },

  completionLabel: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '500',
  },

  completionPercentage: {
    color: '#5CE1D6',
    fontSize: 14,
    fontWeight: '600',
  },

  progressBarBg: {
    height: 8,
    backgroundColor: '#1E3A5F',
    borderRadius: 4,
    overflow: 'hidden',
  },

  progressBarFill: {
    height: '100%',
    backgroundColor: '#5CE1D6',
    borderRadius: 4,
  },

  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    // paddingHorizontal: 8,
    paddingTop: 20,

    gap: 12,
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginLeft: 14,
  },

  // New wrapper for TouchableOpacity
  cardWrapper: {
    borderRadius: 18,
    overflow: 'hidden', // Important for gradient rounding
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },

  card: {
    width: 115,
    height: 100,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 2,
    // borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },

  cardIconWrapper: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)', // Subtle inner highlight
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },

  cardLabel: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '600',
    textAlign: 'center',
    paddingHorizontal: 4,
  },
});
