import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  FlatList,
  SafeAreaView,
  StatusBar,
  Dimensions,
  ImageSourcePropType,
  Platform,
  Linking,
  Alert,
  PermissionsAndroid,
} from 'react-native';
import Geolocation from 'react-native-geolocation-service';
import BottomTab from './BottomTab';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import LinearGradient from 'react-native-linear-gradient';

const { width } = Dimensions.get('window');
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
type Category = {
  id: string;
  title: string;
  icon: ImageSourcePropType;
};

const categories = [
  { id: '1', title: 'Security License', icon: require('../assets/admin.png') },
  { id: '2', title: 'MISC Time License', icon: require('../assets/it.png') },
  {
    id: '3',
    title: 'Working With Children',
    icon: require('../assets/developer.png'),
  },
  { id: '4', title: 'First Aid', icon: require('../assets/data-admin.png') },
  { id: '5', title: 'CPR', icon: require('../assets/electrician.png') },
  {
    id: '6',
    title: 'White Card',
    icon: require('../assets/development-web.png'),
  },
  {
    id: '7',
    title: 'Traffic Controller',
    icon: require('../assets/business-management.png'),
  },
];

export default function HomeScreen({ navigation }: any) {
  const [sites, setSites] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [isActive, setIsActive] = useState<boolean>(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [currentLocation, setCurrentLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  const formatDateMMDDYYYY = (date: Date) =>
    `${(date.getMonth() + 1).toString().padStart(2, '0')}-${date
      .getDate()
      .toString()
      .padStart(2, '0')}-${date.getFullYear()}`;

  const currentDate = new Date();

  const [weekStart] = useState(() => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() - d.getDay() + (d.getDay() === 0 ? -6 : 1));
    return d;
  });

  const capitalizeWords = (text: string = '') =>
    text.replace(/\b\w/g, char => char.toUpperCase());

  const calculateTotalHours = (jobRoster: any[]) => {
    if (!jobRoster || jobRoster.length === 0) return 0;

    return jobRoster.reduce((total, job) => {
      if (job.start && job.end) {
        const start = new Date(job.start);
        const end = new Date(job.end);
        const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        return total + Math.max(0, hours);
      }
      return total;
    }, 0);
  };

  const fetchCustomerSites = async () => {
    try {
      const token = await AsyncStorage.getItem('@auth_token');
      const userStr = await AsyncStorage.getItem('user');
      if (!token || !userStr) return;
      const userData = JSON.parse(userStr);
      const start = formatDateMMDDYYYY(weekStart);
      const end = formatDateMMDDYYYY(
        new Date(weekStart.getTime() + 6 * 86400000),
      );

      const payload = {
        user_id: [userData.id],
        state: 'Victoria',
        start,
        end,
        roster_id: '1',
      };

      const res = await axios.post(
        'https://apis.staffoo.com.au/api/fetch-customer-sites',
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        },
      );

      if (res.data?.success) {
        setSites(res.data.data || []);
      }
    } catch (err) {
      console.log('Fetch sites error:', err);
    }
  };

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

  useEffect(() => {
    fetchCustomerSites();
  }, []);

  useEffect(() => {
    const loadProfileAndLocation = async () => {
      // 1. Handle Location
      // if (Platform.OS === 'android') {
      //   try {
      //     const granted = await PermissionsAndroid.request(
      //       PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      //       {
      //         title: 'Location Permission',
      //         message:
      //           'This app needs access to your location to show relevant jobs near you.',
      //         buttonNeutral: 'Ask Me Later',
      //         buttonNegative: 'Cancel',
      //         buttonPositive: 'OK',
      //       },
      //     );
      //     if (granted === PermissionsAndroid.RESULTS.GRANTED) {
      //       getCurrentLocation();
      //     }
      //   } catch (err) {
      //     console.warn(err);
      //   }
      // } else {
      //   getCurrentLocation();
      // }

      // 2. Handle Profile & Image
      const storedUser = await AsyncStorage.getItem('user');
      const cachedImage = await AsyncStorage.getItem('profileImage');

      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        setIsActive(parsedUser.is_active);

        // Priority: Cached Image > API Data Image
        if (cachedImage) {
          setProfileImage(cachedImage);
        } else if (parsedUser?.staff?.profile_image) {
          const BASE_IMAGE_URL = 'https://apis.staffoo.com.au/storage/';
          setProfileImage(`${BASE_IMAGE_URL}${parsedUser.staff.profile_image}`);
        }
      }
    };

    // const getCurrentLocation = () => {
    //   Geolocation.getCurrentPosition(
    //     position => {
    //       const { latitude, longitude } = position.coords;
    //       setCurrentLocation({ latitude, longitude });
    //       console.log('[Location] Current location:', latitude, longitude);
    //     },
    //     (error: any) => {
    //       console.log(
    //         '[Location] Error getting location:',
    //         error.code,
    //         error.message,
    //       );
    //     },
    //     { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 },
    //   );
    // };

    loadProfileAndLocation();
  }, []);
  const capitalizeName = (name: string = '') => {
    return name
      .toLowerCase()
      .split(' ')
      .filter(Boolean)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const sortedSites = [...sites].sort((siteA, siteB) => {
    const latestA = siteA.job_roster?.length
      ? Math.max(
        ...siteA.job_roster.map((j: any) => new Date(j.start).getTime()),
      )
      : 0;

    const latestB = siteB.job_roster?.length
      ? Math.max(
        ...siteB.job_roster.map((j: any) => new Date(j.start).getTime()),
      )
      : 0;

    return latestB - latestA;
  });

  const displayedSites = sortedSites.slice(0, 2);
  const hasMoreSites = sites.length > 2;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.avatarBox}
          onPress={() => navigation.navigate('ProfileSetup')}
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
          <View style={styles.welcomeContent}>
            <Text style={styles.welcomeText}>Welcome back!</Text>
            <View style={styles.nameRow}>
              <Text style={styles.name}>
                {capitalizeName(user?.name || 'User Name')}
              </Text>
              <Image
                source={require('../assets/hello.png')}
                style={styles.helloIcon}
              />
            </View>
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        style={styles.scrollContent}
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
          style={styles.banner}
        >
          <View style={styles.bannerContent}>
            <Text style={styles.bannerTitle}>
              Let’s find a new job{'\n'}suitable for you
            </Text>

            {/* Static Info Box */}
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>💼 Jobs Available</Text>
              <Text style={styles.infoSubText}>
                Remote • Full Time • Part Time
              </Text>
            </View>
          </View>

          <Image
            source={require('../assets/banner-1.png')}
            style={styles.bannerImage}
          />
        </LinearGradient>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Browse By Category</Text>

          <FlatList
            data={categories}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <LinearGradient
                colors={[
                  'rgba(255,255,255,0.22)',
                  'rgba(255,255,255,0.12)',
                  'rgba(5, 2, 2, 0.06)',
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.categoryItem}
              >
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={{ alignItems: 'center' }}
                >
                  <Image source={item.icon} style={styles.categoryIcon} />
                  <Text style={styles.categoryTitle}>{item.title}</Text>
                </TouchableOpacity>
              </LinearGradient>
            )}
            contentContainerStyle={styles.categoryList}
          />
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Shifts This Week</Text>
            {hasMoreSites && (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => navigation.navigate('Applications')}
              >
                <Text style={styles.seeAll}>See All</Text>
              </TouchableOpacity>
            )}
          </View>

          {displayedSites.length === 0 ? (
            <Text style={{ paddingVertical: 20, color: '#666' }}>
              No sites found for this week.
            </Text>
          ) : (
            displayedSites.map((site: any) => {
              const totalHours = calculateTotalHours(site.job_roster || []);
              const sortedJobs = [...(site.job_roster || [])].sort(
                (a: any, b: any) => {
                  const timeA = a.start ? new Date(a.start).getTime() : 0;
                  const timeB = b.start ? new Date(b.start).getTime() : 0;

                  return timeB - timeA;
                },
              );

              return (
                <LinearGradient
                  key={site.id}
                  colors={[
                    'rgba(255,255,255,0.20)',
                    'rgba(255,255,255,0.10)',
                    'rgba(255,255,255,0.05)',
                  ]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.siteCard}
                >
                  <View style={styles.siteCardInner}>
                    <Text style={styles.siteName}>
                      {site.site_name || 'Unnamed Site'}
                    </Text>
                    <Text style={styles.siteAddress}>{site.address}</Text>
                    <Text style={styles.totalHours}>
                      Total Hours: {totalHours.toFixed(1)} hrs
                    </Text>
                    {sortedJobs.map((job: any) => {
                      const status = job.job_status?.toLowerCase();
                      const shiftDate = job.start
                        ? new Date(job.start).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })
                        : '--';

                      const startTime =
                        job.start?.split(' ')[1]?.slice(0, 5) || '--:--';
                      const endTime =
                        job.end?.split(' ')[1]?.slice(0, 5) || '--:--';

                      return (
                        <View key={job.id} style={styles.shiftRow}>
                          <View>
                            <Text style={styles.shiftDate}>{shiftDate}</Text>
                            <Text style={styles.shiftTime}>
                              {startTime} - {endTime}
                            </Text>
                          </View>

                          {/* <Text style={styles.guardName}>
                            {job.guards?.name || 'Unassigned'}
                          </Text> */}
                          <Text style={styles.guardName}>
                            {job.guards?.name
                              ? capitalizeWords(job.guards.name)
                              : 'Unassigned'}
                          </Text>

                          <View
                            style={[
                              styles.statusBadge,
                              status === 'pending'
                                ? { backgroundColor: '#FEE2E2' }
                                : status === 'confirmed'
                                  ? { backgroundColor: '#FEF3C7' }
                                  : status === 'completed'
                                    ? { backgroundColor: '#D1FAE5' }
                                    : { backgroundColor: '#E5E7EB' },
                            ]}
                          >
                            <Text
                              style={[
                                styles.statusText,
                                {
                                  color:
                                    status === 'pending'
                                      ? '#DC2626' // 🔴 red
                                      : status === 'confirmed'
                                        ? '#F59E0B' // 🟡 yellow/orange
                                        : status === 'completed'
                                          ? '#16A34A' // 🟢 green
                                          : '#374151',
                                },
                              ]}
                            >
                              {status || 'pending'}
                            </Text>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </LinearGradient>
              );
            })
          )}
        </View>
      </ScrollView>

      <BottomTab navigation={navigation} activeTab="Home" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingTop: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  infoBox: {
    marginTop: 16,
    backgroundColor: COLORS.surface,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  infoText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  infoSubText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  avatarBox: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  initialsAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
  },
  siteCardInner: {
    padding: 12,
  },
  welcomeContent: {
    marginLeft: 12
  },
  welcomeText: {
    fontSize: 13,
    color: COLORS.textSecondary
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  name: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text
  },
  helloIcon: {
    width: 20,
    height: 20,
    marginLeft: 6
  },
  scrollContent: {
    flex: 1
  },
  bannerContent: {
    flex: 1
  },
  banner: {
    marginHorizontal: 15,
    borderRadius: 18,
    padding: 12,
    paddingRight: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bannerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    lineHeight: 26,
  },
  learnMoreBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginTop: 12,
  },
  shiftDate: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 2,
    fontWeight: '500',
  },
  learnMoreText: {
    color: COLORS.text,
    fontWeight: '600'
  },
  bannerImage: {
    width: 130,
    height: 130,
    resizeMode: 'contain'
  },
  section: {
    paddingHorizontal: 15,
    marginVertical: 10
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text
  },
  seeAll: {
    color: COLORS.primary,
    fontWeight: '600'
  },
  siteCard: {
    width: '100%',
    borderRadius: 14,
    marginBottom: 12,
    overflow: 'hidden',
  },
  siteName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  siteAddress: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginVertical: 6,
  },
  totalHours: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 10,
  },
  initialsText: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: '700',
  },
  shiftRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.cardBorder,
  },
  shiftTime: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: '500'
  },
  guardName: {
    fontSize: 13,
    color: COLORS.textSecondary
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  categoryItem: {
    backgroundColor: COLORS.card,
    width: 90,
    height: 78,
    borderRadius: 12,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 2,
  },
  categoryList: {
    paddingVertical: 8
  },
  categoryIcon: {
    width: 34,
    height: 34,
    tintColor: COLORS.primary,
    marginBottom: 6,
  },
  categoryTitle: {
    fontSize: 10,
    color: COLORS.text,
    textAlign: 'center'
  },
});
