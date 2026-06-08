

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
  Platform,
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
  Shield,
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

// ─── Brand Palette (matches Staffoo portal) ───────────────────────────────────
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
    const parts = name.trim().split(' ').filter(Boolean);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (
      parts[0].charAt(0).toUpperCase() +
      parts[parts.length - 1].charAt(0).toUpperCase()
    );
  };

  useFocusEffect(
    useCallback(() => {
      const loadProfile = async () => {
        setLoading(true);
        try {
          const uid = await AsyncStorage.getItem('@user_id');
          const token = await AsyncStorage.getItem('@auth_token');
          const cachedImage = await AsyncStorage.getItem('profileImage');
          if (cachedImage) setProfileImage(cachedImage);
          if (!uid || !token) {
            navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
            return;
          }
          setUserId(uid);
          const profileResponse = await getUserProfile(uid);
          if (profileResponse?.success && profileResponse?.data) {
            const freshData = profileResponse.data;
            setUser(freshData);
            setCompletionPercentage(
              freshData.profile_completion_percentage || 0,
            );
            setIsActive(freshData.is_active || false);

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
    if (!userId || !user?.user_type || user.user_type === 'customer') return;

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
      quality: 0.8,
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
        icon: <User size={20} color="#6590D9" />,
        iconBg: 'rgba(101,144,217,0.15)',
        route: 'ProfileSetup',
      },
      {
        title: 'Documents',
        icon: <FileText size={20} color="#786BD8" />,
        iconBg: 'rgba(120,107,216,0.15)',
        route: 'Documents',
      },
      {
        title: 'Staff Forms',
        icon: <FileText size={20} color="#6AA957" />,
        iconBg: 'rgba(106,169,87,0.15)',
        route: 'StaffForms',
      },
      {
        title: 'Privacy Policy',
        icon: <Shield size={20} color="#10B981" />,
        iconBg: 'rgba(16,185,129,0.15)',
        route: 'Policies',
      },
      {
        title: 'Induction',
        icon: <BookOpen size={20} color="#63B6DD" />,
        iconBg: 'rgba(99,182,221,0.15)',
        route: 'Induction',
      },
      {
        title: 'Payslip',
        icon: <Wallet size={20} color="#F59E0B" />,
        iconBg: 'rgba(245,158,11,0.15)',
        route: 'Payslip',
      },
      {
        title: 'Staff Management',
        icon: <Wallet size={20} color="#F59E0B" />,
        iconBg: 'rgba(245,158,11,0.15)',
        route: 'StaffManagement',
      },
      {
        title: 'Payment History',
        icon: <Clock size={20} color="#26C6DA" />,
        iconBg: 'rgba(38,198,218,0.15)',
        route: 'JobPayment',
      },
      {
        title: 'Bank Details',
        icon: <CreditCard size={20} color="#A78BFA" />,
        iconBg: 'rgba(167,139,250,0.15)',
        route: 'PaymentMethod',
      },
      {
        title: 'Log Out',
        icon: <LogOut size={20} color={COLORS.danger} />,
        iconBg: COLORS.dangerBg,
        route: 'Logout',
        isDanger: true,
      },
      {
        title: 'Delete Profile',
        icon: <Trash2 size={20} color={COLORS.danger} />,
        iconBg: COLORS.dangerBg,
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
          'Induction',
          'Privacy Policy',
          'Log Out',
          'Delete Profile',
        ].includes(s.title),
      );
    }
    if (type === 'contractor') {
      return allSections.filter(s =>
        [
          'Personal Info',
          'Documents',
          'Staff Management',
          'Privacy Policy',
          'Log Out',
          'Delete Profile',
        ].includes(s.title),
      );
    }
    if (type === 'customer') {
      return allSections.filter(s =>
        [
          'Personal Info',
          'Payment History',
          'Bank Details',
          'Privacy Policy',
          'Log Out',
          'Delete Profile',
        ].includes(s.title),
      );
    }
    return allSections;
  };

  const isProfileComplete = completionPercentage === 100;

  const handleSectionPress = (route: string) => {
    if (route === 'Logout') {
      Alert.alert('Log Out', 'Are you sure you want to log out?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
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
            } catch {
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
      navigation.navigate('DeleteProfileVerification');
      return;
    }

    navigation.navigate(route);
  };

  const capitalizeName = (name: string = '') => {
    return name
      .toLowerCase()
      .split(' ')
      .filter(Boolean)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
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
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  const sections = getProfileSections(user?.user_type);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* ── Hero Header ── */}
        <LinearGradient
          colors={[COLORS.heroBg1, COLORS.heroBg2]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.heroSection}
        >
          {/* Top Row */}
          <View style={styles.innercontainer}>
            <View style={styles.heroTopRow}>
              <Text style={styles.heroTitle}>My Profile</Text>
              <TouchableOpacity
                style={styles.settingsBtn}
                onPress={() => navigation.navigate('ProfileSetup')}
              >
                <Settings size={18} color={COLORS.primary} />
              </TouchableOpacity>
            </View>

            {/* Avatar + Info */}
            <View style={styles.profileInfoContainer}>
              <TouchableOpacity
                style={styles.avatarWrapper}
                onPress={pickImage}
                activeOpacity={0.85}
              >
                {profileImage ? (
                  <Image source={{ uri: profileImage }} style={styles.avatar} />
                ) : (
                  <LinearGradient
                    colors={['#0D3B38', '#1A5C55']}
                    style={styles.initialsAvatar}
                  >
                    <Text style={styles.initialsText}>
                      {getInitials(user?.name || 'User')}
                    </Text>
                  </LinearGradient>
                )}
              </TouchableOpacity>

              <View style={styles.nameSection}>
                <Text style={styles.greeting}>
                  {capitalizeName(
                    user?.name ||
                    user?.staff?.name ||
                    user?.contractor?.name ||
                    user?.customer?.name ||
                    'User',
                  )}{' '}
                  👋
                </Text>

                {/* {user?.user_type && (
                  <View style={styles.typeBadge}>
                    <Text style={styles.typeBadgeText}>
                      {getUserTypeLabel(user.user_type)}
                    </Text>
                  </View>
                )} */}

                <View style={styles.statusRow}>
                  <View
                    style={[
                      styles.statusChip,
                      {
                        borderColor: user?.is_active
                          ? 'rgba(52,200,138,0.25)'
                          : 'rgba(248,113,113,0.25)',
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.statusDot,
                        {
                          backgroundColor: user?.is_active
                            ? COLORS.success
                            : COLORS.danger,
                        },
                      ]}
                    />
                    <Text
                      style={[
                        styles.statusChipText,
                        {
                          color: user?.is_active
                            ? COLORS.success
                            : COLORS.danger,
                        },
                      ]}
                    >
                      {user?.is_active ? 'Active' : 'Inactive'}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.statusChip,
                      { borderColor: 'rgba(96,165,250,0.25)' },
                    ]}
                  >
                    <View
                      style={[styles.statusDot, { backgroundColor: '#60A5FA' }]}
                    />
                    <Text style={[styles.statusChipText, { color: '#60A5FA' }]}>
                      {completionPercentage}% Done
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Progress Bar */}
            <View style={styles.progressSection}>
              <View style={styles.progressLabelRow}>
                <Text style={styles.progressLabel}>Profile completion</Text>
                <Text style={styles.progressValue}>
                  {completionPercentage}%
                </Text>
              </View>
              <View style={styles.progressBarBg}>
                <LinearGradient
                  colors={[COLORS.primary, '#34D1C5']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[
                    styles.progressBarFill,
                    { width: `${completionPercentage}%` as any },
                  ]}
                />
              </View>
            </View>
          </View>
        </LinearGradient>

        {/* ── Incomplete Warning ── */}
        {!isProfileComplete && (
          <View style={styles.warningCard}>
            <AlertCircle size={16} color={COLORS.warning} />
            <Text style={styles.warningText}>
              Complete your profile to unlock full access —{' '}
              {completionPercentage}% done
            </Text>
          </View>
        )}

        {/* ── Section Grid ── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Account Settings</Text>
        </View>

        <View style={styles.gridContainer}>
          {sections.map((section, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => handleSectionPress(section.route)}
              activeOpacity={0.75}
              style={styles.cardWrapper}
            >
              <View
                style={[styles.card, section.isDanger && styles.cardDanger]}
              >
                {/* Top shimmer line */}
                <View style={styles.cardShimmer} />

                <View
                  style={[
                    styles.cardIconWrapper,
                    { backgroundColor: section.iconBg },
                  ]}
                >
                  {section.icon}
                </View>
                <Text
                  style={[
                    styles.cardLabel,
                    section.isDanger && styles.cardLabelDanger,
                  ]}
                >
                  {section.title}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <BottomTab navigation={navigation} activeTab="Profile" />
    </SafeAreaView>
  );
}

const CARD_WIDTH = (width - 48) / 3;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    //  backgroundColor: BRAND_BG
    backgroundColor: '#111111',

  },
  container: {
    flex: 1,
    backgroundColor: '#111111',
    paddingTop: 20,
  },

  /* ── Loading ── */
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    gap: 12,
  },
  loadingText: {
    fontSize: 15,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  innercontainer: {
    padding: 20,
  },
  /* ── Hero ── */
  heroSection: {
    // paddingTop: 20,
    paddingBottom: 28,
    // paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.primaryBorder,
  },
  greeting: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    textTransform: 'capitalize',
    letterSpacing: 0.3,
    marginBottom: 4,
  },

  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 22,
    // padding:20
  },

  heroTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: COLORS.text,
    letterSpacing: 0.3,
  },

  settingsBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(0,169,157,0.1)',
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },

  profileInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 22,
  },

  avatarWrapper: {
    alignItems: 'center',
  },

  avatar: {
    width: 86,
    height: 86,
    borderRadius: 43,
    borderWidth: 2.5,
    borderColor: COLORS.primary,
  },

  initialsAvatar: {
    width: 86,
    height: 86,
    borderRadius: 43,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2.5,
    borderColor: COLORS.primary,
  },

  initialsText: {
    color: COLORS.primary,
    fontSize: 28,
    fontWeight: '700',
  },

  editBadge: {
    marginTop: 6,
    backgroundColor: 'rgba(0,169,157,0.15)',
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  editBadgeText: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '600',
  },

  nameSection: {
    flex: 1,
  },

  heroName: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },

  typeBadge: {
    backgroundColor: 'rgba(0,169,157,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0,169,157,0.28)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  typeBadgeText: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  statusRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusChipText: {
    fontSize: 12,
    fontWeight: '600',
  },

  /* ── Progress ── */
  progressSection: {
    marginTop: 4,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressLabel: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '500',
  },
  progressValue: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  progressBarBg: {
    height: 5,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 10,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 10,
  },

  /* ── Warning ── */
  warningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.warningBg,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.warning,
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 2,
    padding: 12,
    borderRadius: 0,
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
  },
  warningText: {
    flex: 1,
    fontSize: 12.5,
    color: '#D4931C',
    fontWeight: '500',
    lineHeight: 18,
  },

  /* ── Section Header ── */
  sectionHeader: {
    paddingHorizontal: 16,
    paddingTop: 22,
    paddingBottom: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffff',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },

  /* ── Grid ── */
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    gap: 12,
  },

  cardWrapper: {
    borderRadius: 16,
    overflow: 'hidden',
  },

  card: {
    width: CARD_WIDTH,
    height: 96,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
    gap: 8,
    overflow: 'hidden',
  },

  cardDanger: {
    borderColor: 'rgba(119, 120, 118, 0.79)',
  },

  // Subtle top highlight line
  cardShimmer: {
    position: 'absolute',
    top: 0,
    left: 20,
    right: 20,
    height: 1,
    backgroundColor: 'rgba(0,169,157,0.2)',
  },

  cardIconWrapper: {
    width: 42,
    height: 42,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },

  cardLabel: {
    color: '#CBD5E1',
    fontSize: 11.5,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 15,
  },

  cardLabelDanger: {
    color: COLORS.danger,
  },
});
