import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LinearGradient from 'react-native-linear-gradient';

import { getUserTransactions } from '../services/authApi';
import { ArrowLeft } from 'lucide-react-native';
const COLORS = {
  // 🌿 Primary Brand
  primary: '#89E7D0', // mint accent
  primaryDark: '#4FCBB3',

  // 🌙 Background system (clean dark navy)
  background: '#070F1E',
  surface: '#0E1A2B',
  surface2: '#12243A',

  // ✨ Card / Glass
  card: 'rgba(255,255,255,0.06)',
  cardBorder: 'rgba(255,255,255,0.08)',

  // ✍️ Text
  text: '#FFFFFF',
  textSecondary: 'rgba(255,255,255,0.7)',
  textMuted: 'rgba(255,255,255,0.5)',

  // 🔴🟡🟢 Status
  success: '#22C55E',
  warning: '#F59E0B',
  danger: '#EF4444',

  // Border
  border: 'rgba(255,255,255,0.08)',
};
interface Transaction {
  id: number;
  amount: string;
  service_fee: string;
  total_amount: string;
  status: string;
  created_at: string;
  currency: string;
  job_roster_id: string | null;
}

type Props = {
  navigation: any;
  route: any;
};

export default function JobPaymentHistory({ navigation, route }: Props) {
  const [userId, setUserId] = useState<number | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Load userId from AsyncStorage on mount
  useEffect(() => {
    loadUserId();
  }, []);
  const formatDateTime = (dateString: string) => {
    const d = new Date(dateString);

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');

    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');

    return `${year}/${month}/${day} ${hours}:${minutes}`;
  };
  const loadUserId = async () => {
    try {
      const storedId = await AsyncStorage.getItem('@user_id');
      if (storedId) {
        const parsedId = parseInt(storedId, 10);
        setUserId(parsedId);
        fetchTransactions(parsedId);
      } else {
        console.log('❌ No user_id found in storage');
        setLoading(false);
      }
    } catch (error) {
      console.error('❌ Error loading user_id:', error);
      setLoading(false);
    }
  };

  // Fetch transactions from API
  const fetchTransactions = async (id: number) => {
    try {
      setLoading(true);
      const res = await getUserTransactions(id);
      setTransactions(res?.data || []);
    } catch (error: any) {
      console.error('❌ Failed to fetch transactions:', error.message || error);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  // Pull-to-refresh handler
  const onRefresh = useCallback(async () => {
    if (!userId) return;

    try {
      setRefreshing(true);
      const res = await getUserTransactions(userId);
      setTransactions(res?.data || []);
    } catch (error) {
      console.error('❌ Refresh failed:', error);
    } finally {
      setRefreshing(false);
    }
  }, [userId]);

  // Get color based on transaction status
  const getStatusColor = (status: string): string => {
    switch (status.toLowerCase()) {
      case 'paid':
      case 'succeeded':
      case 'captured':
        return COLORS.success;

      case 'held':
      case 'processing':
      case 'requires_capture':
        return COLORS.warning;

      case 'failed':
      case 'canceled':
        return COLORS.danger;

      default:
        return COLORS.textSecondary;
    }
  };

  // Parse job roster IDs safely
  const parseRosterIds = (jobRosterId: string | null): number[] => {
    if (!jobRosterId) return [];
    try {
      const parsed = JSON.parse(jobRosterId);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  // Render each transaction card
  const renderItem = ({ item }: { item: Transaction }) => {
    const rosterIds = parseRosterIds(item.job_roster_id);

    return (
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
        style={styles.card}
      >
        <View style={styles.siteCardInner}>
          <View style={styles.rowBetween}>
            <Text style={styles.amount}>
              ${parseFloat(item.amount || '0').toFixed(2)} {item.currency}
            </Text>

            <Text
              style={[styles.status, { color: getStatusColor(item.status) }]}
            >
              {item.status.toUpperCase()}
            </Text>
          </View>

          <Text style={styles.label}>
            Service Fee: ${parseFloat(item.service_fee || '0').toFixed(2)}
          </Text>

          <Text style={styles.label}>
            Total: ${parseFloat(item.total_amount || '0').toFixed(2)}
          </Text>

          {/* {rosterIds.length > 0 && (
          <Text style={styles.label}>Jobs: {rosterIds.join(', ')}</Text>
        )} */}

          <Text style={styles.date}>{formatDateTime(item.created_at)}</Text>
        </View>
      </LinearGradient>
    );
  };

  // Calculate total spent
  const totalSpent = transactions
    .reduce((sum, t) => sum + parseFloat(t.amount || '0'), 0)
    .toFixed(2);

  // Loading state
  if (loading && transactions.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2146a3" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ArrowLeft size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment History</Text>
      </View>

      {/* TRANSACTIONS LIST */}
      <FlatList
        data={transactions}
        keyExtractor={item => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <Text style={styles.emptyText}>No transactions found yet.</Text>
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingTop: 45,
    // marginTop: 15,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.surface,
    marginHorizontal: 16,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.text,
    marginLeft: '15%',
    marginTop: 5,
  },
  siteCardInner: {
    padding: 12, // 👈 REAL CARD PADDING HERE
  },
  card: {
    // backgroundColor: COLORS.card,
    // padding: 16,
    borderRadius: 18,
    marginBottom: 14,
    // borderWidth: 1,
    // borderColor: COLORS.cardBorder,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  amount: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
  },
  status: {
    fontSize: 12,
    fontWeight: 'bold',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#f8fafc',
  },
  label: {
    marginTop: 6,
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  date: {
    marginTop: 10,
    fontSize: 12,
    color: COLORS.textMuted,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 80,
    fontSize: 16,
    color: COLORS.textMuted,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f7fb',
  },

  listContent: {
    padding: 16,
    paddingTop: 5,
  },
});
