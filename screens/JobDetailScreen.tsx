import React, { useState } from 'react';
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
import { ChevronLeft, Bookmark, MapPin, Star, Globe, Building2, Calendar, Users, DollarSign } from 'lucide-react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
type Props = { navigation: any };
export default function JobDetailScreen({ navigation }: Props) {
  const [activeTab, setActiveTab] = useState('desc');

  const tabs = [
    { id: 'desc', label: 'Job Description' },
    { id: 'company', label: 'Company' },
    { id: 'review', label: 'Review' },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'desc':
        return (
          <View style={styles.tabContent}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>About The Role</Text>
              <Text style={styles.description}>
                We are looking for a senior UX Designer. They say no man is an island, and this holds particularly true of this role. As a UX Designer, you’ll be part of the team that manages Go Pay - Southeast Asia’s largest payment application.
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Requirement Skill For The Role</Text>
              <View style={styles.skillList}>
                <Text style={styles.skillItem}>• Create information architecture and UX strategy</Text>
                <Text style={styles.skillItem}>• Develop UI mockups and prototypes that clearly illustrate how sites function and look like</Text>
                <Text style={styles.skillItem}>• Fluent English communication skills are a must.</Text>
                <Text style={styles.skillItem}>• Have a good communication skill</Text>
                <Text style={styles.skillItem}>• Ability to browse lots of apps & web is a must</Text>
              </View>
            </View>
          </View>
        );

      case 'company':
        return (
          <View style={styles.tabContent}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>About this Company</Text>
              <Text style={styles.description}>
                Google is an American multi-national technology company focusing on search engine technology, computer software, quantum computing, online advertising, e-commerce, cloud computing, artificial intelligence, and consumer electronics.
              </Text>
            </View>

            <View style={styles.companyInfoList}>
              <View style={styles.companyInfoItem}>
                <Globe size={20} color="#4CAF50" />
                <View style={styles.companyInfoContent}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.companyInfoLabel}>Website</Text>
                  </View>
                  <Text style={styles.companyInfoValue}>www.google.com</Text>
                </View>
              </View>

              <View style={styles.companyInfoItem}>
                <Building2 size={20} color="#FF9800" />
                <View style={styles.companyInfoContent}>
                  <Text style={styles.companyInfoLabel}>Headquarters</Text>
                  <Text style={styles.companyInfoValue}>California, USA</Text>
                </View>
              </View>

              <View style={styles.companyInfoItem}>
                <Calendar size={20} color="#00BCD4" />
                <View style={styles.companyInfoContent}>
                  <Text style={styles.companyInfoLabel}>Founded</Text>
                  <Text style={styles.companyInfoValue}>September 4, 1998</Text>
                </View>
              </View>

              <View style={styles.companyInfoItem}>
                <Users size={20} color="#E91E63" />
                <View style={styles.companyInfoContent}>
                  <Text style={styles.companyInfoLabel}>Size</Text>
                  <Text style={styles.companyInfoValue}>100,000 Employee</Text>
                </View>
              </View>

              <View style={styles.companyInfoItem}>
                <DollarSign size={20} color="#9C27B0" />
                <View style={styles.companyInfoContent}>
                  <Text style={styles.companyInfoLabel}>Revenue</Text>
                  <Text style={styles.companyInfoValue}>$25,000 Billion</Text>
                </View>
              </View>
            </View>
          </View>
        );

      case 'review':
        return (
          <View style={styles.tabContent}>
            <View style={styles.reviewSummary}>
              <View style={styles.ratingLeft}>
                <Text style={styles.ratingScore}>4.6</Text>
                <Text style={styles.ratingTotal}>/5</Text>
                <Text style={styles.reviewCount}>Based on 10K+ Reviews</Text>
                <View style={styles.starRow}>
                  {Array(5).fill(0).map((_, i) => (
                    <Star key={i} size={16} color="#FFD700" fill="#FFD700" />
                  ))}
                </View>
              </View>

              <View style={styles.ratingBars}>
                {[
                  { label: '5 Star', percent: 100 },
                  { label: '4 Star', percent: 60 },
                  { label: '3 Star', percent: 30 },
                  { label: '2 Star', percent: 20 },
                  { label: '1 Star', percent: 10 },
                ].map((item, index) => (
                  <View key={index} style={styles.ratingBar}>
                    <Text style={styles.barLabel}>{item.label}</Text>
                    <View style={styles.barTrack}>
                      <View style={[styles.barFill, { width: `${item.percent}%` }]} />
                    </View>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.reviewSort}>
              <Text style={styles.reviewSortTitle}>Employee Reviews</Text>
              <View style={styles.sortDropdown}>
                <Text style={styles.sortText}>Most Recent</Text>
                {/* You can replace with real Picker component later */}
              </View>
            </View>

            <View style={styles.reviewList}>
              {/* Example review - repeat or map from data */}
              <View style={styles.reviewItem}>
                <View style={styles.reviewHeader}>
                  <View style={styles.reviewerInfo}>
                    <Image
                      source={{ uri: 'https://randomuser.me/api/portraits/men/32.jpg' }}
                      style={styles.reviewerAvatar}
                    />
                    <View>
                      <Text style={styles.reviewerName}>Atif Aslam</Text>
                      <Text style={styles.reviewTime}>10 min ago</Text>
                    </View>
                  </View>
                  <View style={styles.stars}>
                    {Array(5).fill(0).map((_, i) => (
                      <Star key={i} size={14} color="#FFD700" fill="#FFD700" />
                    ))}
                  </View>
                </View>
                <Text style={styles.reviewText}>
                  “Google is a fantastic multinational company. It focusing on search engine technology, web application software, quantum computing. I love this company”
                </Text>
              </View>

              {/* Add more review items as needed */}
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Fixed Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBox} onPress={() => navigation.goBack()}>
          <ChevronLeft size={24} color="#121927" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Details</Text>
        <TouchableOpacity style={styles.backBox}>
          <Bookmark size={24} color="#121927" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView}>
        {/* Job Card */}
        <View style={styles.jobCard}>
          <View style={styles.jobTop}>
            <Image
              source={require('../assets/google.png')} // ← your asset
              style={styles.companyLogo}
            />
            <View style={styles.jobInfo}>
              <Text style={styles.jobTitle}>Senior UX Designer</Text>
              <View style={styles.jobLocation}>
                <MapPin size={16} color="white" />
                <Text style={styles.locationText}>Berlin, Germany</Text>
              </View>
            </View>
          </View>

          <View style={styles.tagContainer}>
            <View style={styles.tag}>
              <Text style={styles.tagText}>Design</Text>
            </View>
            <View style={styles.tag}>
              <Text style={styles.tagText}>Full Time</Text>
            </View>
            <View style={styles.tag}>
              <Text style={styles.tagText}>In House</Text>
            </View>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabBar}>
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.id}
              style={[
                styles.tabItem,
                activeTab === tab.id && styles.tabItemActive,
              ]}
              onPress={() => setActiveTab(tab.id)}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === tab.id && styles.tabTextActive,
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tab Content */}
        {renderTabContent()}
      </ScrollView>

      {/* Fixed Apply Button */}
      <View style={styles.fixedButtonContainer}>
        <TouchableOpacity style={styles.applyButton}>
          <Text style={styles.applyButtonText}>Apply This Job</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 20
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
  jobCard: {
    backgroundColor: '#7c66ff',
    margin: 20,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#eee',
  },
  jobTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  companyLogo: {
    width: 64,
    height: 64,
    borderRadius: 12,
    marginRight: 16,
  },
  jobInfo: {
    flex: 1,
  },
  jobTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: 'white',
    marginBottom: 6,
  },
  jobLocation: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    fontSize: 14,
    color: 'white',
    marginLeft: 6,
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
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
  tag: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
  },
  tagText: {
    fontSize: 13,
    color: '#555',
    fontWeight: '500',
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  tabItem: {
    paddingVertical: 12,
    marginRight: 28,
  },
  tabItemActive: {
    borderBottomWidth: 3,
    borderBottomColor: '#2869FE',
  },
  tabText: {
    fontSize: 15,
    color: '#777',
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#2869FE',
    fontWeight: '700',
  },
  tabContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#121927',
    marginBottom: 12,
  },
  description: {
    fontSize: 15,
    lineHeight: 24,
    color: '#444',
  },
  skillList: {
    marginTop: 8,
  },
  skillItem: {
    fontSize: 15,
    color: '#444',
    lineHeight: 24,
    marginBottom: 8,
  },
  companyInfoList: {
    marginTop: 12,
  },
  companyInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16, // spacing between rows
  },
  companyInfoContent: {
    flexDirection: 'row',
    justifyContent: 'space-between', // pushes label left, value right
    alignItems: 'center',
    marginLeft: 12,
    flex: 1, // makes it take remaining width
  },
  companyInfoLabel: {
    fontSize: 14,
    color: '#666',
    flex: 1, // allows wrapping if needed
  },
  companyInfoValue: {
    fontSize: 15,
    color: '#121927',
    fontWeight: '500',
  },
  reviewSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 28,
  },
  ratingLeft: {
    alignItems: 'center',
  },
  ratingScore: {
    fontSize: 30,
    fontWeight: '700',
    color: '#121927',
  },
  ratingTotal: {
    fontSize: 20,
    color: '#666',
  },
  reviewCount: {
    fontSize: 13,
    color: '#888',
    marginTop: 8,
  },
  starRow: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 4,
  },
  ratingBars: {
    flex: 1,
    paddingLeft: 24,
  },
  ratingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  barLabel: {
    width: 70,
    fontSize: 13,
    color: '#666',
  },
  barTrack: {
    flex: 1,
    height: 8,
    backgroundColor: '#eee',
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: '#2869FE',
  },
  reviewSort: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  reviewSortTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#121927',
  },
  sortDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  sortText: {
    fontSize: 14,
    color: '#666',
  },
  reviewList: {
    marginBottom: 120,
  },
  reviewItem: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eee',
    marginBottom: 16,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  reviewerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reviewerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
  },
  reviewerName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#121927',
  },
  reviewTime: {
    fontSize: 12,
    color: '#888',
  },
  stars: {
    flexDirection: 'row',
    gap: 2,
  },
  reviewText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#444',
  },
  fixedButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: 30,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  applyButton: {
    backgroundColor: '#2869FE',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});