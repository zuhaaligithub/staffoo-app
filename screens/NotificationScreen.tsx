import { ArrowLeft, MoreVertical, Search } from 'lucide-react-native';
import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Platform,
  ImageSourcePropType,
  FlatList,
} from 'react-native';

// ────────────────────────────────────────────────
// Type for each notification item
// ────────────────────────────────────────────────

type NotificationItem = {
  id: string;
  icon: ImageSourcePropType;
  title: string;
  company: string;
  message: string;
  time: string;
};

// ────────────────────────────────────────────────
// Sample data
// ────────────────────────────────────────────────

const notifications: NotificationItem[] = [
  {
    id: '1',
    icon: require('../assets/google-img.png'),
    title: 'Product Design',
    company: 'Google LLC',
    message: 'Congratulations, your application on Google has been accepted',
    time: '5 mins ago',
  },
  {
    id: '2',
    icon: require('../assets/slack.png'),
    title: 'Apps Design',
    company: 'Slack',
    message: 'New job available on Slack (position - Mobile Apps Designer)',
    time: '30 mins ago',
  },
  {
    id: '3',
    icon: require('../assets/zapier.png'),
    title: 'UI/UX Design',
    company: 'Zapier',
    message: 'New job available on Zapier (position - Application Designer)',
    time: '10 hr ago',
  },
  {
    id: '4',
    icon: require('../assets/google-img.png'),
    title: 'Product Design',
    company: 'Google LLC',
    message: 'A strong interview strategy can boost your chances of success',
    time: '18 hr ago',
  },
  {
    id: '5',
    icon: require('../assets/treehouse.png'),
    title: 'UX Researcher',
    company: 'Treehouse',
    message: 'Congratulations, your application on Google has been accepted',
    time: '1 day ago',
  },
  {
    id: '6',
    icon: require('../assets/microsoft-img.png'),
    title: 'Product Design',
    company: 'Microsoft',
    message: 'Congratulations, your application on Microsoft has been accepted',
    time: '1 week ago',
  },
];

type Props = {
  navigation: any;
};

export default function NotificationScreen({ navigation }: Props) {
  const renderNotification = ({ item }: { item: NotificationItem }) => (
    <TouchableOpacity
      style={styles.notificationItem}
      onPress={() => navigation.navigate('JobDetail')}
    >
      {/* Icon with fixed box, border, shadow */}
      <View style={styles.iconBox}>
        <Image source={item.icon} style={styles.notiIcon} />
      </View>

      <View style={styles.notiContent}>
        <View style={styles.notiTitleRow}>
          <Text style={styles.notiTitle}>
            {item.title} <Text style={styles.dot}>•</Text>{' '}
            <Text style={styles.notiCompany}>{item.company}</Text>
          </Text>
        </View>

        <Text style={styles.notiMessage} numberOfLines={2}>
          {item.message}
        </Text>

        <Text style={styles.notiTime}>{item.time}</Text>
      </View>

      <TouchableOpacity style={styles.moreButton}>
     <MoreVertical size={20} color="#121927" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBox} onPress={() => navigation.goBack()}>
       <ArrowLeft size={24} color="#121927" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Notification</Text>

        <TouchableOpacity>
         <Search size={24} color="#121927" />
        </TouchableOpacity>
      </View>

      {/* Notification List */}
      <ScrollView contentContainerStyle={styles.listContainer}>
        <FlatList
          data={notifications}
          renderItem={renderNotification}
          keyExtractor={item => item.id}
          scrollEnabled={false}
          ItemSeparatorComponent={() => <View  />}
        />
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
    paddingVertical: Platform.OS === 'ios' ? 50 : 16,
    
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
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#121927',
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  notificationItem: {
    flexDirection: 'row',
    paddingVertical: 16,
    alignItems: 'flex-start',
  },
  iconBox: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#edecec',
    marginRight: 20,
    alignItems: 'center',
    justifyContent: 'center',
   
  },
  notiIcon: {
    width: 30,
    height: 30,
    borderRadius: 12,
    resizeMode: 'contain',
  },
  notiContent: {
    flex: 1,
  },
  notiTitleRow: {
    marginBottom: 4,
  },
  notiTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#121927',
  },
  dot: {
    color: '#999',
    fontSize: 12,
    marginHorizontal: 4,
  },
  notiCompany: {
    fontSize: 13,
    color: '#666',
  },
  notiMessage: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
    marginBottom: 4,
  },
  notiTime: {
    fontSize: 12,
    color: '#888',
  },
  moreButton: {
    padding: 8,
  },
  separator: {
    height: 1,
    backgroundColor: '#f0f0f0',
  },
});