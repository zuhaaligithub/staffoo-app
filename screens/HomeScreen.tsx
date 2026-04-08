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

const { width } = Dimensions.get('window');

type Category = {
  id: string;
  title: string;
  icon: ImageSourcePropType;
};

const categories = [
  { id: '1', title: 'Security License', icon: require('../assets/admin.png') },
  { id: '2', title: 'MISC Time License', icon: require('../assets/it.png') },
  { id: '3', title: 'Working With Children', icon: require('../assets/developer.png') },
  { id: '4', title: 'First Aid', icon: require('../assets/data-admin.png') },
  { id: '5', title: 'CPR', icon: require('../assets/electrician.png') },
  { id: '6', title: 'White Card', icon: require('../assets/development-web.png') },
  { id: '7', title: 'Traffic Controller', icon: require('../assets/business-management.png') },
];

export default function HomeScreen({ navigation }: any) {
  const [sites, setSites] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [isActive, setIsActive] = useState<boolean>(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number } | null>(null);

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
      const end = formatDateMMDDYYYY(new Date(weekStart.getTime() + 6 * 86400000));

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
        }
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
      if (Platform.OS === 'android') {
        try {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
            {
              title: 'Location Permission',
              message: 'This app needs access to your location to show relevant jobs near you.',
              buttonNeutral: 'Ask Me Later',
              buttonNegative: 'Cancel',
              buttonPositive: 'OK',
            }
          );
          if (granted === PermissionsAndroid.RESULTS.GRANTED) {
            getCurrentLocation();
          }
        } catch (err) {
          console.warn(err);
        }
      } else {
        getCurrentLocation();
      }

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

    const getCurrentLocation = () => {
      Geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setCurrentLocation({ latitude, longitude });
          console.log('[Location] Current location:', latitude, longitude);
        },
        (error: any) => {
          console.log('[Location] Error getting location:', error.code, error.message);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
      );
    };

    loadProfileAndLocation();
  }, []);

  const sortedSites = [...sites].sort((siteA, siteB) => {
    const latestA = siteA.job_roster?.length
      ? Math.max(...siteA.job_roster.map((j: any) => new Date(j.start).getTime()))
      : 0;

    const latestB = siteB.job_roster?.length
      ? Math.max(...siteB.job_roster.map((j: any) => new Date(j.start).getTime()))
      : 0;

    return latestB - latestA;
  });

  const displayedSites = sortedSites.slice(0, 2);
  const hasMoreSites = sites.length > 2;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.avatarBox} onPress={() => navigation.navigate('ProfileSetup')}>
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
              <Text style={styles.name}>{user?.name || 'User Name'}</Text>
              <Image source={require('../assets/hello.png')} style={styles.helloIcon} />
            </View>
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollContent}>
        <View style={styles.banner}>
          <View style={styles.bannerContent}>
            <Text style={styles.bannerTitle}>
              Let’s find a new job{'\n'}suitable for you
            </Text>
            <TouchableOpacity
              style={styles.learnMoreBtn}
              onPress={() => Linking.openURL('https://app.staffoo.com.au/')}
            >
              <Text style={styles.learnMoreText}>Learn More</Text>
            </TouchableOpacity>
          </View>
          <Image source={require('../assets/banner-1.png')} style={styles.bannerImage} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Browse By Category</Text>
          <FlatList
            data={categories}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.categoryItem} activeOpacity={0.8}>
                <Image source={item.icon} style={styles.categoryIcon} />
                <Text style={styles.categoryTitle}>{item.title}</Text>
              </TouchableOpacity>
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
              const sortedJobs = [...(site.job_roster || [])].sort((a: any, b: any) => {
                const timeA = a.start ? new Date(a.start).getTime() : 0;
                const timeB = b.start ? new Date(b.start).getTime() : 0;
                return timeB - timeA;
              });

              return (
                <View key={site.id} style={styles.siteCard}>
                  <Text style={styles.siteName}>{site.site_name || 'Unnamed Site'}</Text>
                  <Text style={styles.siteAddress}>{site.address}</Text>
                  <Text style={styles.totalHours}>
                    Total Hours: {totalHours.toFixed(1)} hrs
                  </Text>
                  {sortedJobs.map((job: any) => {
                    const shiftDate = job.start
                      ? new Date(job.start).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })
                      : '--';

                    const startTime = job.start?.split(' ')[1]?.slice(0, 5) || '--:--';
                    const endTime = job.end?.split(' ')[1]?.slice(0, 5) || '--:--';

                    return (
                      <View key={job.id} style={styles.shiftRow}>
                        <View>
                          <Text style={styles.shiftDate}>{shiftDate}</Text>
                          <Text style={styles.shiftTime}>
                            {startTime} - {endTime}
                          </Text>
                        </View>

                        <Text style={styles.guardName}>
                          {job.guards?.name || 'Unassigned'}
                        </Text>

                        <View
                          style={[
                            styles.statusBadge,
                            job.job_status === 'confirmed'
                              ? { backgroundColor: '#D1FAE5' }
                              : { backgroundColor: '#FEF3C7' },
                          ]}
                        >
                          <Text style={styles.statusText}>
                            {job.job_status || 'pending'}
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
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
  container: { flex: 1, backgroundColor: '#fff', paddingTop: 20 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  avatarBox: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 50, height: 50, borderRadius: 25 },
  welcomeContent: { marginLeft: 12 },
  welcomeText: { fontSize: 13, color: '#666' },
  nameRow: { flexDirection: 'row', alignItems: 'center' },
  name: { fontSize: 18, fontWeight: '700', color: '#000' },
  helloIcon: { width: 20, height: 20, marginLeft: 6 },
  scrollContent: { flex: 1 },
  banner: {
    marginHorizontal: 20,
    marginVertical: 10,
    backgroundColor: '#c2e0eb',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bannerContent: { flex: 1 },
  bannerTitle: { fontSize: 18, fontWeight: '700', color: '#226a84', lineHeight: 28 },
  learnMoreBtn: {
    backgroundColor: '#2eb1e2',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    marginTop: 12,
    alignSelf: 'flex-start',
  },
  shiftDate: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
    fontWeight: '500',
  },
  initialsAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#2eb1e2',     
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#a8a1a1',
  },
  learnMoreText: { color: '#fff', fontWeight: '600' },
  bannerImage: { width: 130, height: 130, resizeMode: 'contain' },

  section: { paddingHorizontal: 20, marginVertical: 10 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#226a84' },
  seeAll: { color: '#2869FE', fontWeight: '600' },

  siteCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 4,
  },
  initialsText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },

  siteName: { fontSize: 16, fontWeight: '700', color: '#000' },
  siteAddress: { fontSize: 12, color: '#666', marginVertical: 4 },
  totalHours: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
    marginBottom: 10,
  },
  shiftRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  shiftTime: { fontSize: 13, color: '#111', fontWeight: '500' },
  guardName: { fontSize: 13, color: '#444' },
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
    width: 80,
    height: 78,
    borderRadius: 14,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0dddd',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,

    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  categoryList: { paddingVertical: 8 },
  categoryIcon: { width: 32, height: 32, resizeMode: 'contain', marginBottom: 6 },
  categoryTitle: { fontSize: 11, color: '#8a8989', textAlign: 'center' },
});

