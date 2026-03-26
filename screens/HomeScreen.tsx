import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  FlatList,
  SafeAreaView,
  StatusBar,
  Dimensions,
  ImageSourcePropType,
} from 'react-native';
import {
  SlidersHorizontal,
  ArrowRight,
  MoreVertical,
  Bell,
  Menu
} from "lucide-react-native";
import { DrawerActions } from '@react-navigation/native';
import BottomTab from './BottomTab';
import { Check, Search } from 'lucide-react-native';

const { width } = Dimensions.get('window');

type Category = {
  id: string;
  title: string;
  icon: ImageSourcePropType;
};

type PopularJob = {
  id: string;
  company: string;
  role: string;
  logo: ImageSourcePropType;
  tags: string[];
  salary: string;
  bgColor: string;
};

type RecentJob = {
  id: string;
  logo: ImageSourcePropType;
  role: string;
  company: string;
  location: string;
};

const categories: Category[] = [
  { id: '1', title: 'Company', icon: require('../assets/company.png') },
  { id: '2', title: 'Full Time', icon: require('../assets/fulltime.png') },
  { id: '3', title: 'Freelance', icon: require('../assets/freelancer.png') },
  { id: '4', title: 'Part Time', icon: require('../assets/part-time.png') },
  { id: '5', title: 'Company', icon: require('../assets/company.png') },
];

const popularJobs: PopularJob[] = [
  {
    id: '1',
    company: 'Google LLC',
    role: 'Sr. UX Designer',
    logo: require('../assets/google.png'),
    tags: ['Design', 'Full Time', 'In House'],
    salary: '$195,000 / Year',
    bgColor: '#7c66ff',
  },
  {
    id: '2',
    company: 'Microsoft',
    role: 'Lead Designer',
    logo: require('../assets/microsoft.png'),
    tags: ['Design', 'Full Time', 'In House'],
    salary: '$195,000 / Year',
    bgColor: '#a55fff',
  },
  // Add more if needed
];

const recentJobs: RecentJob[] = [
  {
    id: '1',
    logo: require('../assets/apple.png'),
    role: 'Sr. Product Designer',
    company: 'Apple',
    location: 'United States',
  },
  {
    id: '2',
    logo: require('../assets/amplitude.png'),
    role: 'Sr. UI/UX Designer',
    company: 'Amplitude',
    location: 'Singapore',
  },
  {
    id: '3',
    logo: require('../assets/adobe.png'),
    role: 'Software Developer',
    company: 'Adobe',
    location: 'New York City',
  },
  // Add more if needed
];

export default function HomeScreen({ navigation }: any) {
  const [searchText, setSearchText] = useState('');
  const [isActive, setIsActive] = useState(false);


  const [user, setUser] = useState<any>(null);

  React.useEffect(() => {
    const loggedInUser = {
      user_type: "staff",
      is_active: false, // test value
    };

    setUser(loggedInUser);
    setIsActive(loggedInUser.is_active);
  }, []);


  const renderPopularJob = ({ item }: { item: PopularJob }) => (
    <TouchableOpacity
      style={[styles.popularJobCard, { backgroundColor: item.bgColor }]}
      activeOpacity={0.85}
      onPress={() => {
        console.log('Popular job tapped:', item.role);
        navigation.navigate('JobDetails');
      }}
    >
      <View style={styles.jobTop}>
        <View style={styles.jobLeft}>
          <Image source={item.logo} style={styles.jobLogo} />
          <View>
            <Text style={styles.jobCompany}>{item.company}</Text>
            <Text style={styles.jobRole}>{item.role}</Text>
          </View>
        </View>
        <View style={styles.featuredBadge}>
          <Check size={20} color="#fff" />
        </View>
      </View>

      <View style={styles.jobTags}>
        {item.tags.map((tag, idx) => (
          <View key={idx} style={styles.tag}>
            <Text style={styles.tagText}>{tag}</Text>
          </View>
        ))}
      </View>

      <View style={styles.jobBottom}>
        <Text style={styles.salary}>{item.salary}</Text>
        <TouchableOpacity
          style={styles.applyButton}
          onPress={() => {
            console.log('Apply button tapped for:', item.role);
            navigation.navigate('JobDetails');
          }}
        >
          <Text style={styles.applyText}>Apply</Text>
          <ArrowRight size={16} color="#fff" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const renderRecentJob = ({ item }: { item: RecentJob }) => (
    <TouchableOpacity
      style={styles.recentJobItem}
      onPress={() => {
        console.log('Recent job tapped:', item.role);
        navigation.navigate('JobDetails');
      }}
    >
      <Image source={item.logo} style={styles.recentLogo} />
      <View style={styles.recentContent}>
        <Text style={styles.recentRole}>{item.role}</Text>
        <View style={styles.recentInfo}>
          <Text style={styles.recentCompany}>{item.company}</Text>
          <View style={styles.dot} />
          <Text style={styles.recentLocation}>{item.location}</Text>
        </View>
      </View>
      <MoreVertical size={20} color="#999" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.avatarBox} onPress={() => navigation.navigate('ProfileSetup')}>
          <Image source={require('../assets/avt-1.jpg')} style={styles.avatar} />
          <View style={styles.welcomeContent}>
            <Text style={styles.welcomeText}>Welcome back!</Text>
            <View style={styles.nameRow}>
              <Text style={styles.name}>Hello! Smith</Text>
              <Image source={require('../assets/hello.png')} style={styles.helloIcon} />
            </View>
          </View>
        </TouchableOpacity>

        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.backBox} onPress={() => navigation.navigate('Notifications')}>
            <Bell size={24} color="#1A1528" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backBox}
            onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
          >
            <Menu size={24} color="#1A1528" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollContent}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBox}>
            <Search size={20} color="#666666" style={styles.searchIcon} />

            <TextInput
              style={styles.searchInput}
              placeholder="Search..."
              placeholderTextColor="#888888"
              value={searchText}
              onChangeText={setSearchText}
              autoCapitalize="none"
            />

            <TouchableOpacity
              style={styles.filterIcon}
              onPress={() =>
                navigation.navigate('Filter')
              }
            >
              <SlidersHorizontal size={20} color="#2869FE" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Banner */}
        <View style={styles.banner}>
          <View style={styles.bannerContent}>
            <Text style={styles.bannerTitle}>
              Let’s find a new job{'\n'}suitable for you
            </Text>
            <TouchableOpacity
              style={styles.learnMoreBtn}
              onPress={() =>
                navigation.navigate('JobDetails')
              }
            >
              <Text style={styles.learnMoreText}>Learn More</Text>
            </TouchableOpacity>
          </View>
          <Image source={require('../assets/banner-1.png')} style={styles.bannerImage} />
        </View>

        {/* Browse By Category */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Browse By Category</Text>
          <FlatList
            data={categories}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.categoryItem}
                activeOpacity={0.8}
                onPress={() => {
                  console.log('Category tapped:', item.title);
                  navigation.navigate('AllJobs')
                }}
              >
                <Image source={item.icon} style={styles.categoryIcon} />
                <Text style={styles.categoryTitle}>{item.title}</Text>
              </TouchableOpacity>
            )}
            contentContainerStyle={styles.categoryList}
          />
        </View>

        {/* Most Popular Jobs */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Most Popular</Text>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                console.log('See All - Most Popular tapped');
                navigation.navigate('AllJobs')
              }}
            >
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={popularJobs}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={item => item.id}
            renderItem={renderPopularJob}
            contentContainerStyle={styles.popularList}
          />
        </View>

        {/* Recent / More Jobs */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>More Popular Jobs</Text>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                console.log('See All - More Popular tapped');
                navigation.navigate('AllJobs')
              }}
            >
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={recentJobs}
            renderItem={renderRecentJob}
            keyExtractor={item => item.id}
            scrollEnabled={false}
          />
        </View>


      </ScrollView>

      {/* <BottomTab navigation={navigation}  activeTab="Home" /> */}
      <BottomTab
        navigation={navigation}
        activeTab="Home"
      // isActive={isActive}
      />
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
    paddingVertical: 16,
    borderBottomColor: '#f0f0f0',
  },
  avatarBox: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 50, height: 50, borderRadius: 25 },
  welcomeContent: { marginLeft: 12 },
  welcomeText: { fontSize: 13, color: '#666' },
  nameRow: { flexDirection: 'row', alignItems: 'center' },
  name: { fontSize: 18, fontWeight: '700', color: '#000' },
  helloIcon: { width: 20, height: 20, marginLeft: 6 },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  scrollContent: { flex: 1 },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },

  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 16,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#edecec',

  },

  searchIcon: {
    marginRight: 10,
  },

  searchInput: {
    flex: 1,
    height: 48,
    fontSize: 16,
    color: '#000000',              // black text – guaranteed visible
    paddingVertical: 0,
  },

  filterIcon: {
    padding: 8,
  },

  banner: {
    marginHorizontal: 20,
    marginVertical: 5,
    backgroundColor: '#00cc9a',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    overflow: 'hidden',
    marginBottom: 0,

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
    marginRight: 7,
    // subtle shadow for "box" feel
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  bannerContent: { flex: 1 },
  bannerTitle: { fontSize: 18, fontWeight: '700', color: '#fff', lineHeight: 30 },
  learnMoreBtn: {
    backgroundColor: '#018967',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 6,
    marginTop: 16,
    alignSelf: 'flex-start',
  },
  learnMoreText: { color: '#fff', fontWeight: '600' },
  bannerImage: { width: 140, height: 140, resizeMode: 'contain' },
  section: { paddingHorizontal: 20, marginVertical: 12 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#000' },
  seeAll: { color: '#2869FE', fontWeight: '600' },
  categoryItem: {
    width: 70,
    height: 70,
    borderRadius: 14,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#edecec',
    marginRight: 20,

    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingVertical: 7,
    shadowRadius: 5,

  },
  categoryList: {
    paddingRight: 0,
    marginTop: 10
  },

  categoryIcon: {
    width: 35,
    height: 35,
    resizeMode: 'contain',
    marginBottom: 5,
  },
  categoryTitle: {
    fontSize: 12,
    color: '#333',
    textAlign: 'center',
  },
  popularList: { paddingRight: 20, },
  popularJobCard: {
    width: width * 0.75,
    borderRadius: 20,
    padding: 20,
    marginRight: 20,

  },
  jobTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  jobLeft: { flexDirection: 'row', alignItems: 'center' },
  jobLogo: { width: 48, height: 48, borderRadius: 12, marginRight: 12 },
  jobCompany: { fontSize: 13, color: '#fff' },
  jobRole: { fontSize: 16, fontWeight: '700', color: '#fff' },
  featuredBadge: { backgroundColor: '#7c66ff', borderRadius: 20, padding: 4 },
  jobTags: { flexDirection: 'row', marginVertical: 16, flexWrap: 'wrap', gap: 8 },
  tag: { backgroundColor: 'rgba(255,255,255,0.3)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  tagText: { color: '#fff', fontSize: 12 },
  jobBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  salary: { fontSize: 16, fontWeight: '700', color: '#fff' },
  applyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  applyText: { color: '#fff', fontWeight: '600', marginRight: 6 },
  recentJobItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  recentLogo: { width: 50, height: 50, borderRadius: 12, marginRight: 16 },
  recentContent: { flex: 1 },
  recentRole: { fontSize: 16, fontWeight: '600', color: '#000' },
  recentInfo: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  recentCompany: { fontSize: 13, color: '#666' },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#999', marginHorizontal: 8 },
  recentLocation: { fontSize: 13, color: '#666' },
  bottomTab: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingVertical: 10,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  tabItem: { alignItems: 'center', padding: 10 },
  tabAdd: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#2869FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -30,
    elevation: 6,
    shadowColor: '#2869FE',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
});