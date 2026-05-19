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
        return '#16a34a';
      case 'held':
        return '#f59e0b';
      case 'failed':
        return '#ef4444';
      default:
        return '#555';
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
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.amount}>
            ${parseFloat(item.amount || '0').toFixed(2)} {item.currency}
          </Text>

          <Text style={[styles.status, { color: getStatusColor(item.status) }]}>
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
        <TouchableOpacity
          onPress={() => navigation.goBack()}
         
        >
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
    backgroundColor: '#dfe6f9',
    paddingTop: 45,
    marginTop: 15,
  },
header: {
  flexDirection: 'row',
  alignItems: 'center',
  paddingHorizontal: 16,
  paddingVertical: 10,
  backgroundColor: '#0A7C6E',
  marginHorizontal: 16,
  borderRadius: 16,
  marginBottom: 10,
},
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginLeft: '15%',
    marginTop: 5,
  },


card: {
  backgroundColor: '#fff',
  padding: 16,
  borderRadius: 18,
  marginBottom: 14,
  borderWidth: 1,
  borderColor: '#2A3152',
  shadowColor: '#2EB1E2',
  shadowOpacity: 0.08,
  shadowRadius: 10,
},
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
amount: {
  fontSize: 18,
  fontWeight: '700',
  color: '#2EB1E2',
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
    color: '#333',
  },
  date: {
    marginTop: 10,
    fontSize: 12,
    color: '#777',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f7fb',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 80,
    fontSize: 16,
    color: '#999',
  },
  listContent: {
    padding: 16,
    paddingTop: 5,
  },
});
