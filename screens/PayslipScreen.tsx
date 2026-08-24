import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  FileText,
  Download,
  ArrowLeft,
  AlertCircle,
} from 'lucide-react-native';
import { BASE_URL } from '../services/authApi';



type Payslip = {
  id: number;
  guard_name?: string;
  name?: string;
  start_date: string;
  end_date: string;
  file_url: string;
  status?: number;
};

type Props = {
  navigation: any;
};

export default function PayslipScreen({ navigation }: Props) {
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPayslips();
  }, []);

  const fetchPayslips = async () => {
    try {
      const token = await AsyncStorage.getItem('@auth_token');
      const userId = await AsyncStorage.getItem('@user_id');

      if (!userId) {
        setPayslips([]);
        return;
      }

      const response = await fetch(`${BASE_URL}/get-specific-guard-payslips`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ user_id: userId }),
      });

      const data = await response.json();

      if (data?.status === true) {
        setPayslips(data.data || []);
      } else {
        setPayslips([]);
      }
    } catch (error) {
      console.log('Payslip fetch error:', error);
      setPayslips([]);
    } finally {
      setLoading(false);
    }
  };

  const downloadSlip = (url: string) => {
    if (!url) {
      Alert.alert('Error', 'File URL is not available');
      return;
    }
    Linking.openURL(url).catch(err => {
      console.error('Error opening PDF:', err);
      Alert.alert('Error', 'Could not open the payslip PDF');
    });
  };

  const getStatusColor = (status?: number) => {
    switch (status) {
      case 1:
        return '#4CAF50'; // green - completed
      case 2:
        return '#FF9800'; // orange - pending
      default:
        return '#F44336'; // red
    }
  };

  const renderItem = ({ item }: { item: Payslip }) => {
    const statusColor = getStatusColor(item.status);

    return (
      <View style={[styles.card, { borderLeftColor: statusColor }]}>
        <View style={styles.iconContainer}>
          <FileText size={28} color="#666" />
        </View>

        <View style={styles.details}>
          <Text style={styles.name}>
            {item.guard_name || item.name || 'Payslip'}
          </Text>
          <Text style={styles.date}>
            {item.start_date} to {item.end_date}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.downloadButton}
          onPress={() => downloadSlip(item.file_url)}
        >
          <Download size={20} color="#fff" />
          {/* <Text style={styles.downloadText}>Download PDF</Text> */}
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4FACFE" />
        <Text style={styles.loadingText}>Loading payslips...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ArrowLeft size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pay Slips</Text>
        <View style={{ width: 50 }} />
      </View>

      <View>
        {payslips.length === 0 ? (
          <View style={styles.noDataContainer}>
            <AlertCircle size={52} color="#bbb" />
            <Text style={styles.noDataText}>No Pay Slips Available</Text>
          </View>
        ) : (
          <FlatList
            data={payslips}
            keyExtractor={item => item.id.toString()}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#dfe6f9', paddingTop: 20 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 14,
    backgroundColor: '#0A7C6E',
    marginHorizontal: 16,
    borderRadius: 16,
    marginBottom: 10,
  },

  screenTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  backButton: { padding: 6 },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  listContent: { padding: 15 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eefafd',
    padding: 16,
    marginVertical: 8,
    borderRadius: 16,
    borderLeftWidth: 5,
    elevation: 3,
    marginTop: 5,
    borderWidth: 1,
    borderColor: '#f1eeee',
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    borderWidth: 1,
    borderColor: '#f4f1f1',
  },
  details: { flex: 1 },
  name: {
    fontSize: 15.5,
    fontWeight: '700',
    color: '#111',
  },
  date: {
    fontSize: 12.8,
    color: '#666',
    marginTop: 4,
  },
  downloadButton: {
    backgroundColor: '#0F172A',
    paddingVertical: 11,
    paddingHorizontal: 18,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  downloadText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13.5,
    marginLeft: 8,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: { marginTop: 12, color: '#666', fontSize: 16 },
  noDataContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noDataText: {
    marginTop: 16,
    fontSize: 16.5,
    color: '#888',
    fontWeight: '500',
  },
});
