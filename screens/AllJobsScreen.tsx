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
import { ChevronLeft, Bookmark, MapPin, DollarSign, Clock, ArrowUpDown } from 'lucide-react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Dummy job data (replace with API later)
const jobs = [
  {
    id: 1,
    company: 'Google LLC',
    title: 'Lead Product Designer',
    logo: require('../assets/google-img.png'),
    salary: '$8K/month',
    location: 'Berlin, Germany',
    time: '24h',
  },
  {
    id: 2,
    company: 'Mailchimp',
    title: 'Lead Product Designer',
    logo: require('../assets/mailchimp.png'),
    salary: '$6K/month',
    location: 'United States',
    time: '36h',
  },
  {
    id: 3,
    company: 'Slack',
    title: 'Mobile Apps Designer',
    logo: require('../assets/slack.png'),
    salary: '$8K/month',
    location: 'United States',
    time: '48h',
  },
  {
    id: 4,
    company: 'Treehouse',
    title: 'Graphic Designer',
    logo: require('../assets/treehouse.png'),
    salary: '$5K/month',
    location: 'London',
    time: '3d',
  },
  {
    id: 5,
    company: 'Zapier',
    title: 'Application Designer',
    logo: require('../assets/zapier.png'),
    salary: '$6K/month',
    location: 'Dublin, Ireland',
    time: '5d',
  },
  {
    id: 6,
    company: 'Evernote',
    title: 'Lead Product Designer',
    logo: require('../assets/evernote.png'),
    salary: '$6K/month',
    location: 'Dublin, Ireland',
    time: '5d',
  },
];

type Props = { navigation: any };

export default function AllJobsScreen({ navigation }: Props) {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Fixed Header */}
      <View style={styles.header}>
        <TouchableOpacity style={
            styles.backBox
        } onPress={() => navigation.goBack()}>
          <ChevronLeft size={24} color="#121927" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>All Job</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scrollView}>
        {/* Header Info + Sort */}
        <View style={styles.topBar}>
          <Text style={styles.jobsCount}>189 Jobs Found</Text>
          <TouchableOpacity>
            <ArrowUpDown size={20} color="#2869FE" />
          </TouchableOpacity>
        </View>

        {/* Job List */}
        <View style={styles.jobList}>
          {jobs.map((job) => (
            <TouchableOpacity
              key={job.id}
              style={styles.jobCard}
              onPress={() => navigation.navigate('JobDetail')}
            >
              <View style={styles.jobInfoBox}>
                <Image source={job.logo} style={styles.jobLogo} />
                <View style={styles.jobContent}>
                  <View style={styles.jobTopRow}>
                    <View>
                      <Text style={styles.companyName}>{job.company}</Text>
                      <Text style={styles.jobTitle}>{job.title}</Text>
                    </View>
                    <Bookmark size={20} color="#121927" opacity={0.6} />
                  </View>

                  <View style={styles.jobBottomRow}>
                    <View style={styles.metaRow}>
                      <DollarSign size={16} color="#2869FE" />
                      <Text style={styles.metaText}>{job.salary}</Text>
                    </View>

                    <View style={styles.metaRow}>
                      <MapPin size={16} color="#ffc24a" />
                      <Text style={styles.metaText}>{job.location}</Text>
                    </View>

                    <View style={styles.metaRow}>
                      <Clock size={16} color="#888" />
                      <Text style={styles.timeText}>{job.time}</Text>
                    </View>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Bottom spacing for fixed button */}
        <View style={{ height: 100 }} />
      </ScrollView>

     
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop:20
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#121927',
  },
  scrollView: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  jobsCount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#121927',
  },
  jobList: {
    paddingHorizontal: 20,
  },
  jobCard: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eee',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
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
  jobInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  jobLogo: {
    width: 50,
    height: 50,
    borderRadius: 12,
    marginRight: 16,
  },
  jobContent: {
    flex: 1,
  },
  jobTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  companyName: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  jobTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#121927',
  },
  jobBottomRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    marginBottom: 4,
  },
  metaText: {
    fontSize: 13,
    color: '#444',
    marginLeft: 6,
  },
  timeText: {
    fontSize: 13,
    color: '#888',
    marginLeft: 'auto',
  },
  fixedFilterButton: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
  },
  filterButton: {
    backgroundColor: '#2869FE',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  filterButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});