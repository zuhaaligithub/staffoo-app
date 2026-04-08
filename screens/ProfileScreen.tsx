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
  Button,
  Modal,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import {
  ChevronRight,
  LogOut,
  User,
  FileText,
  CheckCircle,
  AlertCircle,
  CreditCard,
  ArrowLeft,
  Trash2,
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { launchImageLibrary } from 'react-native-image-picker';
import Toast from 'react-native-toast-message';
import { getUserProfile, logoutUser } from '../services/authApi';
import BottomTab from './BottomTab';
import { LogLevel, OneSignal } from 'react-native-onesignal';
import { sendNotificationTokenToServer } from '../screens/LoginScreen';
import { useFocusEffect } from '@react-navigation/native';

const ONESIGNAL_APP_ID = '79041c59-5506-4e56-9de4-8a6619f85e1d';

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
  // const [jobData, setJobData] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [jobData, setJobData] = useState<AsapJobData | null>(null);
  const foregroundHandlerRef = useRef<((event: any) => void) | null>(null);
  const clickHandlerRef = useRef<((event: any) => void) | null>(null);
  const subscriptionChangeHandlerRef = useRef<((event: any) => Promise<void>) | null>(null);
  const [imageFile, setImageFile] = useState<any>(null);


  const getInitials = (name: string): string => {
    if (!name) return 'U';
    const nameParts = name.trim().split(' ').filter(Boolean);
    if (nameParts.length === 1) {
      return nameParts[0].charAt(0).toUpperCase();
    }
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

          if (cachedImage) {
            setProfileImage(cachedImage);
          }

          if (!userId || !token) {
            navigation.reset({
              index: 0,
              routes: [{ name: 'Login' }],
            });
            return;
          }

          setUserId(userId);
          const profileResponse = await getUserProfile(userId);

          if (profileResponse?.success && profileResponse?.data) {
            const freshData = profileResponse.data;
            setUser(freshData);
            setCompletionPercentage(freshData.profile_completion_percentage || 0);
            setIsActive(freshData.is_active || false);

            const BASE_IMAGE_URL = 'https://apis.staffoo.com.au/storage/';

            let imageUri = null;

            // Contractor / Staff
            if (freshData.user_type === 'contractor' || freshData.user_type === 'staff') {
              imageUri = freshData.contractor?.profile_image || freshData.staff?.profile_image;
            }

            // Customer
            if (freshData.user_type === 'customer') {
              imageUri = freshData.customer?.profile_image || freshData.profile_image;
            }

            // Set profile image if exists
            if (imageUri) {
              // If already full URL, skip base URL
              const fullUri = imageUri.startsWith('http') ? imageUri : `${BASE_IMAGE_URL}${imageUri}`;
              setProfileImage(fullUri);
              await AsyncStorage.setItem('profileImage', fullUri);
            }
            await AsyncStorage.setItem('user', JSON.stringify(freshData));
          } else {
            const cached = await AsyncStorage.getItem('user');
            if (cached) {
              const parsed = JSON.parse(cached);
              setUser(parsed);
              if (!cachedImage && parsed?.staff?.profile_image) {
                const BASE_IMAGE_URL = 'https://apis.staffoo.com.au/storage/';
                setProfileImage(`${BASE_IMAGE_URL}${parsed.staff.profile_image}`);
              }
            }
          }
        } catch (err) {
          console.error('❌ Profile fetch error:', err);
        } finally {
          setLoading(false);
        }
      };

      loadProfile();
    }, [])
  );


  useEffect(() => {
    if (!userId || !user?.user_type) return;

    if (user.user_type === 'customer') {
      console.log('[OneSignal] Customer login → do not show in-app notifications');
      return;
    }

    let pollTimer: ReturnType<typeof setTimeout> | undefined;

    const setupOneSignal = async () => {
      OneSignal.Debug.setLogLevel(LogLevel.Verbose);
      OneSignal.initialize(ONESIGNAL_APP_ID);
      await new Promise((r) => setTimeout(r, 800));

      OneSignal.Notifications.requestPermission(true);

      // Subscription change (push token)
      subscriptionChangeHandlerRef.current = async (event: any) => {
        const playerId = event.current?.id ?? null;
        if (playerId && userId) {
          const authToken = await AsyncStorage.getItem('@auth_token');
          if (authToken) {
            await sendNotificationTokenToServer(playerId, userId);
          }
        }
      };
      OneSignal.User.pushSubscription.addEventListener(
        'change',
        subscriptionChangeHandlerRef.current
      );

      // Foreground display
      foregroundHandlerRef.current = (event: any) => {
        event.preventDefault();
        event.getNotification().display();
      };
      OneSignal.Notifications.addEventListener('foregroundWillDisplay', foregroundHandlerRef.current);

      // Click handler
      clickHandlerRef.current = (event: any) => {
        const notification = event.notification;
        const additionalData = notification?.additionalData || {};
        const pageName = additionalData.page;

        if (pageName === 'asap-job-list') {
          const jobDataRaw = additionalData.job_data;
          let asapData: AsapJobData = {};
          try {
            asapData = jobDataRaw ? JSON.parse(jobDataRaw) : {};
          } catch (e) {
            console.warn('Failed to parse job_data:', e);
          }

          setJobData(asapData);
          setModalVisible(true);
        }
      };
      OneSignal.Notifications.addEventListener('click', clickHandlerRef.current);

      // Poll for Player ID once
      pollTimer = setTimeout(async () => {
        try {
          const playerId = await OneSignal.User.pushSubscription.getIdAsync();
          if (playerId && userId) {
            const authToken = await AsyncStorage.getItem('@auth_token');
            if (authToken) {
              await sendNotificationTokenToServer(playerId, userId);
            }
          }
        } catch (e) {
          console.warn('Poll failed:', e);
        }
      }, 5000);
    };

    setupOneSignal();

    return () => {
      if (subscriptionChangeHandlerRef.current)
        OneSignal.User.pushSubscription.removeEventListener('change', subscriptionChangeHandlerRef.current);
      if (foregroundHandlerRef.current)
        OneSignal.Notifications.removeEventListener('foregroundWillDisplay', foregroundHandlerRef.current);
      if (clickHandlerRef.current)
        OneSignal.Notifications.removeEventListener('click', clickHandlerRef.current);
      if (pollTimer) clearTimeout(pollTimer);
    };
  }, [userId, user?.user_type]);


  const pickImage = async () => {
    const result = await launchImageLibrary({ mediaType: 'photo', quality: 0.7 });

    if (!result.didCancel && result.assets && result.assets.length > 0) {
      const imageUri = result.assets[0].uri;
      if (imageUri) {
        setProfileImage(imageUri);
        setImageFile(result.assets[0]); // store for API upload

        // Persist in AsyncStorage
        await AsyncStorage.setItem('profileImage', imageUri);
      }
    }
  };



  const getProfileSections = (userType: string | undefined, isActive: boolean) => {
    const type = userType?.toLowerCase();

    const sections = [
      { title: 'Personal Information', icon: <User size={22} color="#2146a3" />, bgColor: '#a9d8f1', route: 'ProfileSetup' },
      { title: 'Documents', icon: <FileText size={22} color="#2146a3" />, bgColor: '#a9d8f1', route: 'Documents' },
      // { title: 'Leave Management', icon: <FileText size={22} color="#2146a3" />, bgColor: '#a9d8f1', route: 'LeaveManagement' },
      { title: 'Bank Details', icon: <CreditCard size={22} color="#fff" />, bgColor: '#8B5CF6', route: 'PaymentMethod' },
      { title: 'Log out', icon: <LogOut size={22} color="#f7f1f1" />, bgColor: '#f85858', route: 'Logout', isDanger: true },
      { title: 'Delete Profile', icon: <Trash2 size={22} color="#f7f1f1" />, bgColor: '#f85858', route: 'DeleteProfile', isDanger: true },
    ];

    // ✅ STAFF / CONTRACTOR
    if (type === 'staff' || type === 'contractor') {
      return sections.filter(s => {
        // ❌ Hide Leave Management if inactive
        // if (!isActive && s.title === 'Leave Management') return false;

        return [
          'Personal Information',
          'Documents',
          // 'Leave Management',
          'Log out',
          'Delete Profile',
        ].includes(s.title);
      });
    }

    // ✅ CUSTOMER
    if (type === 'customer') {
      return sections.filter(s =>
        [
          'Personal Information',
          'Bank Details',
          'Log out',
          'Delete Profile',
        ].includes(s.title)
      );
    }

    return sections;
  };
  const isProfileComplete = completionPercentage === 100;

  const handleSectionPress = (route: string) => {
    // Special case: Logout
    if (route === 'Logout') {
      Alert.alert(
        'Logout',
        'Are you sure you want to logout?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Logout',
            style: 'destructive',
            onPress: async () => {
              try {
                const token = await AsyncStorage.getItem('@auth_token');

                // 🔥 Call API only if token exists
                if (token) {
                  await logoutUser();
                }

                // 🧹 Clear local storage
                await AsyncStorage.multiRemove([
                  '@user_id',
                  '@auth_token',
                  'user',
                  'profileImage',
                ]);

                Toast.show({
                  type: 'success',
                  text1: 'Logged out successfully',
                });

                // 🚀 Redirect to Login
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'Login' }],
                });

              } catch (error: any) {
                console.log('Logout error:', error);

                // Even if API fails → force logout locally
                await AsyncStorage.multiRemove([
                  '@user_id',
                  '@auth_token',
                  'user',
                  'profileImage',
                ]);

                navigation.reset({
                  index: 0,
                  routes: [{ name: 'Login' }],
                });
              }
            },
          },
        ]
      );

      return;
    }

    // Special case: Delete Profile → show confirmation + call API
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

                // ── ACTUAL API CALL ──
                const response = await fetch(`https://apis.staffoo.com.au/api/user-delete/${userId}`, {
                  method: 'GET',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                  },
                });

                const data = await response.json();

                if (!response.ok || !data.success) {
                  Toast.show({
                    type: 'error',
                    text1: 'Delete failed',
                    text2: data.message || 'Something went wrong',
                  });
                  return;
                }

                // Success → clean up & logout
                await AsyncStorage.multiRemove([
                  '@user_id',
                  '@auth_token',
                  'user',
                  'profileImage',
                ]);

                Toast.show({ type: 'success', text1: 'Profile deleted successfully' });

                navigation.reset({
                  index: 0,
                  routes: [{ name: 'Login' }],
                });

              } catch (err) {
                console.error('Delete profile error:', err);
                Toast.show({
                  type: 'error',
                  text1: 'Error deleting profile',
                  text2: err instanceof Error ? err.message : 'Unknown error',
                });
              }
            },
          },
        ]
      );
      return; // ← IMPORTANT: stop here – do NOT navigate
    }

    // Normal navigation for all other items
    navigation.navigate(route);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2146a3" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBox}>
          <ArrowLeft size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.profileCard}>


          <View style={styles.avatarContainer}>
            {profileImage ? (
              <Image
                source={{ uri: profileImage }}
                style={styles.avatar}
              />
            ) : (
              <View style={[styles.avatar, styles.initialsAvatar]}>
                <Text style={styles.initialsText}>
                  {getInitials(user?.name || 'User')}
                </Text>
              </View>
            )}

          </View>

          <Text style={styles.nameText}>{user?.name || 'User Name'}</Text>
          <Text style={styles.emailText}>{user?.email || 'user@email.com'}</Text>
          {user?.user_type && (

            <View style={[styles.badgee]}>
              <Text style={styles.badgeTextt}>
                {user.user_type.charAt(0).toUpperCase() + user.user_type.slice(1)} Profile
              </Text>
            </View>

          )}

          <View style={styles.badgesRow}>
            <View style={[styles.badge, { backgroundColor: isActive ? '#DCFCE7' : '#FEE2E2' }]}>
              {isActive ? <CheckCircle size={16} color="#10B981" /> : <AlertCircle size={16} color="#EF4444" />}
              <Text style={[styles.badgeText, { color: isActive ? '#10B981' : '#EF4444' }]}>
                {isActive ? 'Active' : 'Inactive'}
              </Text>
            </View>

            <View style={[styles.badge, { backgroundColor: isProfileComplete ? '#DCFCE7' : '#FEF3C7' }]}>
              {isProfileComplete ? <CheckCircle size={16} color="#10B981" /> : <AlertCircle size={16} color="#F59E0B" />}
              <Text style={[styles.badgeText, { color: isProfileComplete ? '#10B981' : '#D97706' }]}>
                {completionPercentage}% Complete
              </Text>
            </View>
          </View>

          {!isProfileComplete && (
            <View style={styles.incompleteMessage}>
              <AlertCircle size={28} color="#F59E0B" />
              <Text style={styles.incompleteTitle}>Profile Incomplete</Text>
              <Text style={styles.incompleteText}>
                Your profile is only {completionPercentage}% complete. Complete it to unlock full app access.
              </Text>
            </View>
          )}
        </View>

        <View style={styles.sectionsContainer}>
          {getProfileSections(user?.user_type, isActive).map((section, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.sectionItem, section.isDanger && styles.sectionDanger]}
              onPress={() => handleSectionPress(section.route)}
            >
              <View style={[styles.sectionIcon, { backgroundColor: section.bgColor }]}>
                {section.icon}
              </View>
              <Text style={[styles.sectionTitle, section.isDanger && { color: '#EF4444' }]}>
                {section.title}
              </Text>
              <ChevronRight size={20} color="#6B7280" />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>



      <BottomTab
        navigation={navigation}
        activeTab="Profile"
      // isActive={isActive}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 25,
  },
  header: {
    flexDirection: 'row',
    paddingHorizontal: 0,
    // marginTop: 20,
    marginLeft: 15,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    marginLeft: '26%',
  },
  backBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userTypeText: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '600',
    width: 120,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileCard: {
    // backgroundColor: '#fff',
    // margin: 16,
    paddingTop: 0,
    paddingBottom: 5,
    padding: 32,
    // borderRadius: 20,
    // shadowColor: '#000',
    // shadowOffset: { width: 0, height: 4 },
    // shadowOpacity: 0.1,
    // shadowRadius: 12,
    // elevation: 8,
    alignItems: 'center',
  },
  initialsAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    // backgroundColor: '#708d8b', 
    backgroundColor: '#2eb1e2',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  initialsText: {
    color: '#fff',
    fontSize: 25,
    fontWeight: '700',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 0,
  },
  avatar: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 4,
    borderColor: '#EFF6FF',
  },
  cameraButton: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: '#2869FE',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  cameraText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  nameText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 3,
  },
  emailText: {
    fontSize: 15,
    color: '#6B7280',
    marginBottom: 10,
  },
  badgesRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    gap: 6,
  },
  badgee: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 0,

    // paddingVertical: 6,
    // paddingHorizontal: 14,
    // borderRadius: 20,
    // gap: 6,
    marginBottom: 10,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#10B981',

  },
  badgeTextt: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2eb1e2',

  },


  incompleteMessage: {
    marginTop: 0,
    alignItems: 'center',
    padding: 14,
    backgroundColor: '#FEF3C7',
    borderRadius: 16,
    width: '100%',
  },
  incompleteTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#92400E',
    marginTop: 5,
  },
  incompleteText: {
    fontSize: 14,
    color: '#92400E',
    textAlign: 'center',
    marginVertical: 5,
  },
  sectionsContainer: {
    backgroundColor: '#fff',
    margin: 8,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  sectionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  sectionDanger: {
    borderBottomWidth: 1,
  },
  sectionIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  sectionTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },

});