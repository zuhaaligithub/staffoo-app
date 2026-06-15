import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  Alert,
  FlatList,
  StyleSheet,
  Image,
  ActivityIndicator,
} from 'react-native';
import { ArrowLeft, Award, CheckCircle, Clock } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAuthToken } from '../services/authApi';

const THEME_COLOR = '#0A7C6E';
const BASE_URL = 'https://apis.staffoo.com.au/api';

const COLORS = {
  primary: '#89E7D0',
  primaryDark: '#4FCBB3',

  background: '#001F3F',
  surface: '#0B1F3A',
  surface2: '#12243A',

  card: 'rgba(255,255,255,0.06)',
  border: 'rgba(255,255,255,0.08)',

  text: '#FFFFFF',
  textSecondary: 'rgba(255,255,255,0.7)',
  textMuted: 'rgba(255,255,255,0.5)',

  success: '#22C55E',
  warning: '#F59E0B',
  danger: '#EF4444',
};

// ✅ GLOBAL HELPER
const isCompleted = (status: string) =>
  ['completed', 'passed'].includes(status);

export default function StaffInductionScreen({
  navigation,
}: {
  navigation: any;
}) {
  const [inductions, setInductions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [user, setUser] = useState<any>(null);
  const [profileImage, setProfileImage] = useState<string | null>(null);

  const recentInduction = inductions[0];

  useEffect(() => {
    loadUserAndInductions();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadUserAndInductions();
    });
    return unsubscribe;
  }, [navigation]);

  const loadUserAndInductions = async () => {
    try {
      setLoading(true);
      setError(null);

      // ✅ Get cached values
      const cachedUserId = await AsyncStorage.getItem('@user_id');
      const cachedUser = await AsyncStorage.getItem('user');
      const token = await getAuthToken();

      // ✅ Check token
      if (!token) {
        setError('Session expired. Please login again.');
        setLoading(false);
        return;
      }

      let userId: string | null = cachedUserId || null;

      // ✅ Parse cached user
      if (cachedUser) {
        const parsedUser = JSON.parse(cachedUser);

        console.log(
          'INDUCTION USER DATA:',
          JSON.stringify(parsedUser, null, 2),
        );

        setUser(parsedUser);

        // ✅ Find user ID safely
        userId =
          userId ||
          parsedUser?.id ||
          parsedUser?.user?.id ||
          parsedUser?.staff?.id ||
          parsedUser?.contractor?.id ||
          parsedUser?.customer?.id ||
          parsedUser?.guard_id ||
          null;

        // ✅ Handle profile image by user type
        let imageUri: string | null = null;

        if (parsedUser?.user_type === 'staff') {
          imageUri = parsedUser?.staff?.profile_image;
        } else if (parsedUser?.user_type === 'contractor') {
          imageUri = parsedUser?.contractor?.profile_image;
        } else if (parsedUser?.user_type === 'customer') {
          imageUri =
            parsedUser?.customer?.profile_image || parsedUser?.profile_image;
        }

        // ✅ Set profile image
        if (imageUri) {
          const fullImage = imageUri.startsWith('http')
            ? imageUri
            : `https://apis.staffoo.com.au/storage/${imageUri}`;

          setProfileImage(fullImage);
        }
      }

      // ✅ Final validation
      if (!userId) {
        setError('User ID not found. Please login again.');
        setLoading(false);
        return;
      }

      // ✅ Fetch inductions
      await fetchInductions(userId, token);
    } catch (err) {
      console.log('LOAD INDUCTION ERROR:', err);

      setError('Failed to load data');
      setLoading(false);
    }
  };

  const fetchInductions = async (userId: string, token: string) => {
    try {
      const response = await fetch(`${BASE_URL}/get-questionnaire/${userId}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      });

      const data = await response.json();

      // ✅ Handle "no data" case safely
      if (
        !data.success ||
        !Array.isArray(data.data) ||
        data.data.length === 0
      ) {
        setInductions([]); // important
        return;
      }

      const formatted = data.data
        .sort(
          (a: any, b: any) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        )
        .map((item: any) => ({
          id: item.id,
          title: item.title,
          subtitle: item.sub_heading?.[0] || 'Mandatory',
          status: item.status || 'pending',
          questions: item.questionnaire?.length || 0,
          date: item.created_at
            ? new Date(item.created_at).toLocaleDateString('en-AU', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })
            : 'Recently Added',
          questionnaire: item.questionnaire,
          created_at: item.created_at,
        }));

      setInductions(formatted);
    } catch (err) {
      setError('Failed to load inductions');
      setInductions([]);
    } finally {
      setLoading(false);
    }
  };

  const capitalizeText = (text: string = '') => {
    return text
      .toLowerCase()
      .split(' ')
      .filter(Boolean)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const getInitials = (name: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ').filter(Boolean);
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return parts[0][0].toUpperCase() + parts[parts.length - 1][0].toUpperCase();
  };

  const handleStartInduction = (item: any) => {
    if (isCompleted(item.status)) {
      Alert.alert('Completed', 'You have already finished this induction.');
      return;
    }

    Alert.alert(
      item.title,
      `This induction contains ${item.questions} questions.\n\nReady to start?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start Now',
          onPress: () =>
            navigation.navigate('InductionQuestions', {
              inductionId: item.id,
            }),
        },
      ],
    );
  };

  const renderInductionItem = ({ item }: { item: any }) => {
    const done = isCompleted(item.status);

    return (
      <TouchableOpacity
        style={[
          styles.listCard,
          done ? styles.completedBorder : styles.pendingBorder,
        ]}
        onPress={() => handleStartInduction(item)}
      >
        {done && (
          <View style={styles.tickTopRight}>
            <CheckCircle size={22} color="#187139" fill="#22c55e" />
          </View>
        )}

        <View style={styles.iconContainer}>
          <Award size={32} color={done ? '#21954c' : THEME_COLOR} />
        </View>

        <View style={styles.listContent}>
          <Text style={styles.listTitle}>
            {capitalizeText(item.title)}
          </Text>
          <Text style={styles.listSubtitle}>
            {item.subtitle} • {item.date}
          </Text>
          <Text style={styles.questionsText}>{item.questions} Questions</Text>

          {done ? (
            <View style={styles.completedBadge}>
              <CheckCircle size={18} color="#22c55e" />
              <Text style={styles.completedText}>Completed</Text>
            </View>
          ) : (
            <View style={styles.pendingBadge}>
              <Clock size={18} color="#f59e0b" />
              <Text style={styles.pendingText}>Pending</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View
          style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
        >
          <ActivityIndicator size="large" color={THEME_COLOR} />
          <Text style={{ marginTop: 12,color: 'white' }}>Loading Inductions...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const recentDone = recentInduction
    ? isCompleted(recentInduction.status)
    : false;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* HEADER */}
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ArrowLeft size={24} color="#fff" />
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          <Text style={styles.greeting}>
            {capitalizeText(
              user?.name ||
              user?.staff?.name ||
              user?.contractor?.name ||
              user?.customer?.name ||
              'User',
            )} 👋
          </Text>

          <Text style={styles.staffName}>Staff Induction Program</Text>
        </View>

        <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
          {profileImage ? (
            <Image source={{ uri: profileImage }} style={styles.avatarSmall} />
          ) : (
            <View style={styles.initialsAvatarSmall}>
              <Text style={styles.initialsTextSmall}>
                {getInitials(
                  user?.name ||
                  user?.staff?.name ||
                  user?.contractor?.name ||
                  user?.customer?.name ||
                  'U',
                )}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {error && <Text style={{ color: 'red' }}>{error}</Text>}

        {/* RECENT CARD */}
        {recentInduction && (
          <TouchableOpacity
            style={[
              styles.recentCard,
              recentDone && styles.completedCardBorder,
            ]}
            onPress={() => handleStartInduction(recentInduction)}
          >
            <View style={styles.recentIcon}>
              <Award size={48} color={recentDone ? '#195f33' : THEME_COLOR} />
            </View>

            <View style={styles.recentContent}>
              {/* <Text style={styles.recentSubtitle}>
                {recentInduction.subtitle}
              </Text> */}
              <Text style={styles.recentTitle}>
                {capitalizeText(recentInduction.title)}
              </Text>
              <Text style={styles.recentDate}>{recentInduction.date}</Text>

              <Text style={styles.questionsCount}>
                {recentInduction.questions} Questions
              </Text>

              {/* ✅ START BUTTON / COMPLETED */}
              {!recentDone ? (
                <TouchableOpacity
                  style={styles.startButton}
                  onPress={() => handleStartInduction(recentInduction)}
                >
                  <Text style={styles.startButtonText}>Start Induction</Text>
                </TouchableOpacity>
              ) : (
                <View
                  style={{
                    flexDirection: 'row',
                    marginTop: 12,
                    alignItems: 'center',
                  }}
                >
                  <CheckCircle size={18} color="#22c55e" />
                  <Text
                    style={{
                      marginLeft: 6,
                      color: '#22c55e',
                      fontWeight: '700',
                    }}
                  >
                    Completed
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        )}

        <Text style={styles.sectionTitle}>All Inductions</Text>
        {inductions.length === 0 && !loading && (
          <View style={{ alignItems: 'center', marginTop: 40 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: '#64748b' }}>
              No Induction Found
            </Text>

          </View>
        )}
        <FlatList
          data={inductions}
          renderItem={renderInductionItem}
          keyExtractor={(item, index) => `${item.id || index}`}
          scrollEnabled={false}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

/* Styles remain the same as your original */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    // backgroundColor: COLORS.background,
    backgroundColor: '#111111',
    paddingTop: 25,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',

    paddingHorizontal: 16,
    paddingVertical: 14,

    marginHorizontal: 16,
    marginTop: 10,

    borderRadius: 18,

    // backgroundColor: COLORS.surface2,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  backBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#cedff0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: { flex: 1, marginLeft: 14 },
  greeting: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },

  staffName: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  rightProfile: { width: 44, height: 44, borderRadius: 22 },
  avatarSmall: { width: 44, height: 44, borderRadius: 22 },
  initialsAvatarSmall: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#424749',
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialsTextSmall: { color: '#fff', fontSize: 16, fontWeight: '700' },

  scrollContent: { padding: 20 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 12,
    marginTop: 10
  },
  completedCardBorder: {
    borderWidth: 1,
    borderColor: '#22c55e',
  },

  recentCard: {
    // backgroundColor: COLORS.surface,
    borderRadius: 22,
    padding: 18,
    flexDirection: 'row',

    borderWidth: 1,
    borderColor: COLORS.border,

    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  recentIcon: {
    width: 70,
    height: 70,
    borderRadius: 18,

    backgroundColor: 'rgba(137, 231, 208, 0.08)',
    borderWidth: 1,
    borderColor: COLORS.border,

    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  recentContent: { flex: 1 },
  recentSubtitle: { color: THEME_COLOR, fontSize: 15, fontWeight: '600' },
  recentTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
    marginVertical: 6,
  },
  recentDate: { color: '#64748b', fontSize: 12 },
  questionsCount: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 4,
  },
  startButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 14,
    marginTop: 12,
    alignSelf: 'flex-start',
  },

  startButtonText: {
    color: '#001F3F',
    fontWeight: '800',
    fontSize: 14,
  },

  listCard: {
    flexDirection: 'row',
    alignItems: 'center',

    backgroundColor: COLORS.card,

    padding: 14,
    borderRadius: 18,

    marginBottom: 14,

    borderWidth: 1,
    borderColor: COLORS.border,
  },
  completedBorder: {
    borderWidth: 1,
    borderColor: '#22c55e',
  },

  pendingBorder: {
    borderWidth: 1.8,
    borderColor: '#ef4444',
  },

  tickTopRight: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 10,
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 16,

    backgroundColor: 'rgba(137, 231, 208, 0.08)',
    borderWidth: 1,
    borderColor: COLORS.border,

    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  listContent: { flex: 1 },
  listTitle: { fontSize: 16, fontWeight: '700', color: '#fff' },
  listSubtitle: { fontSize: 13, color: '#64748b', marginTop: 4 },
  questionsText: {
    fontSize: 13,
    color: '#fff',
    fontWeight: '600',
    marginTop: 6,
  },


  completedText: {
    color: COLORS.success,
    fontWeight: '700',
    marginLeft: 6,
  },


  pendingText: {
    color: COLORS.warning,
    fontWeight: '700',
    marginLeft: 6,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,

    backgroundColor: 'rgba(34,197,94,0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,

    alignSelf: 'flex-start', // ✅ only content width
  },

  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,

    backgroundColor: 'rgba(245,158,11,0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,

    alignSelf: 'flex-start', // ✅ only content width
  },
});
