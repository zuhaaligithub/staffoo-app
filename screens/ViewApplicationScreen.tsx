import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Dimensions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {
  ChevronLeft,
  Home,
  MapPin,
  DollarSign,
  CheckCircle2,
  Users,
  Trophy,
} from 'lucide-react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type Props = {
  navigation: any;
};

export default function ViewApplicationScreen({ navigation }: Props) {
  const job = {
    title: 'Lead Product Designer',
    company: 'Google LLC',
    logo: require('../assets/google-img.png'),
    salary: '$8K/month',
    location: 'Berlin, Germany',
  };

  // Timeline: newest at TOP
  const timeline = [
    {
      title: 'Offer letter',
      date: 'Not yet',
      time: '',
      status: 'pending',
    },
    {
      title: 'Team matching',
      date: '19/09/22',
      time: '02:00 PM',
      status: 'completed',
    },
    {
      title: 'Final HR interview',
      date: '14/09/22',
      time: '04:00 PM',
      status: 'completed',
    },
    {
      title: 'Technical interview',
      date: '04/09/22',
      time: '10:00 AM',
      status: 'completed',
    },
    {
      title: 'Screening interview',
      date: '20/08/22',
      time: '10:00 AM',
      status: 'completed',
    },
    {
      title: 'Reviewed by Google team',
      date: '05/08/22',
      time: '10:00 AM',
      status: 'completed',
    },
    {
      title: 'Application submitted',
      date: '01/08/22',
      time: '08:00 PM',
      status: 'completed',
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Purple Gradient Header */}
      <LinearGradient
        colors={['#7B5EFF', '#A78BFA']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <ChevronLeft size={24} color="#fff" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Applied Job</Text>

          <TouchableOpacity onPress={() => navigation.navigate('Main', { screen: 'Home' })}>
            <Home size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Job Card */}
        <View style={styles.jobCard}>
          <View style={styles.jobRow}>
            <View style={styles.iconBox}>
              <Image source={job.logo} style={styles.jobLogo} />
            </View>
            <View style={styles.jobInfo}>
              <Text style={styles.jobTitle}>{job.title}</Text>
              <View style={styles.companyRow}>
                <Text style={styles.companyName}>{job.company}</Text>
              </View>
              <View style={styles.metaRow}>
                <View style={styles.metaItem}>
                  <DollarSign size={16} color="#2869FE" />
                  <Text style={styles.metaText}>{job.salary}</Text>
                </View>
                <View style={styles.metaItem}>
                  <MapPin size={16} color="#FF9500" />
                  <Text style={styles.metaText}>{job.location}</Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      </LinearGradient>

      <ScrollView style={styles.scrollView}>
        {/* Track Application */}
        <View style={styles.timelineSection}>
          <Text style={styles.timelineTitle}>Track Application</Text>

          <View style={styles.timelineCard}>
            {timeline.map((stage, index) => (
              <View key={index} style={styles.timelineItem}>
                {/* Icon column */}
                <View style={styles.iconColumn}>
                  {stage.status === 'completed' ? (
                    <View style={styles.completedIconWrapper}>
                      <CheckCircle2
                        size={19}
                        color="#fff"
                        fill="#34C759"
                        strokeWidth={3}
                      />
                    </View>
                  ) : (
                    <Trophy size={32} color="#2869FE" />
                  )}

                  {index < timeline.length - 1 && (
                    <View
                      style={[
                        styles.verticalLine,
                        {
                          backgroundColor:
                            stage.status === 'completed' ? '#34C759' : '#E0E0E0',
                        },
                      ]}
                    />
                  )}
                </View>

                {/* Content */}
                <View style={styles.contentColumn}>
                  <Text
                    style={[
                      styles.stageTitle,
                      stage.status === 'pending' && { color: '#8E8E93' },
                    ]}
                  >
                    {stage.title}
                  </Text>

                  <View style={styles.dateRow}>
                    <Text style={styles.dateText}>{stage.date}</Text>
                    {stage.time ? (
                      <>
                        <Text style={styles.dot}> • </Text>
                        <Text style={styles.timeText}>{stage.time}</Text>
                      </>
                    ) : null}
                  </View>
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FF',
   
  },
  headerGradient: {
    paddingTop: StatusBar.currentHeight || 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
     paddingTop:15,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#F8F9FF',
  },
  jobCard: {
    backgroundColor: '#fff',
    // marginHorizontal: 10,
    marginTop: 0,
    borderRadius: 20,
    padding: 10,
    shadowColor: '#000',
    
  },
  jobRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    width: 60,
    height: 60,
    borderRadius: 16,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#edecec',
    marginRight: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  jobLogo: {
    width: 40,
    height: 40,
    borderRadius: 10,
  },
  jobInfo: {
    flex: 1,
  },
  jobTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  companyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  companyName: {
    fontSize: 14,
    color: '#6B7280',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 14,
    color: '#4B5563',
    marginLeft: 6,
  },
  timelineSection: {
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 40,
    backgroundColor: '#F8F9FF',
  },
  timelineTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 16,
  },
  timelineCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    padding: 20,
    paddingTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 5,
  },
  timeline: {
    paddingLeft: 14,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 32,
    alignItems: 'flex-start',
  },
  iconColumn: {
    width: 48,
    alignItems: 'center',
    position: 'relative',
  },
  verticalLine: {
    position: 'absolute',
    top: 25,
    bottom: -60,
    width: 2,
    left: 23,
  },
  contentColumn: {
    flex: 1,
    paddingTop: 4,
  },
  stageTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 14,
    color: '#6B7280',
  },
  timeText: {
    fontSize: 14,
    color: '#6B7280',
  },
  dot: {
    fontSize: 14,
    color: '#9CA3AF',
    marginHorizontal: 6,
  },

  // New style for green circle + white background + green filled tick
  completedIconWrapper: {
    width: 20,
    height: 20,
    borderRadius: 10, // 50%
    borderWidth: 2.5,
    borderColor: '#34C759', // bright green
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});