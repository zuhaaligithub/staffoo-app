import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  FlatList,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { ChevronLeft, Plus, CreditCard } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const BASE_URL = 'https://apis.staffoo.com.au/api';

type Card = {
  card_holder_name: string;
  card_number: string; // clean digits from backend
  expiry_month: string;
  expiry_year: string;
};

type Props = {
  navigation: any;
};

export default function PaymentMethodsScreen({ navigation }: Props) {
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);

  const formatCardNumber = (digits: string) => {
    return (
      digits
        .replace(/\D/g, '')
        .match(/.{1,4}/g)
        ?.join(' ') || digits
    );
  };

  const fetchCards = async () => {
    try {
      setLoading(true);

      const token = await AsyncStorage.getItem('@auth_token');
      if (!token) throw new Error('No auth token');

      // ✅ Get logged-in user
      const userStr = await AsyncStorage.getItem('user');
      if (!userStr) throw new Error('User session not found');

      const user = JSON.parse(userStr);
      const USER_ID = user.id;

      const res = await axios.get(`${BASE_URL}/user-edit/${USER_ID}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.data?.success || !res.data?.data?.customer?.bank_details) {
        setCards([]);
        return;
      }

      const raw = res.data.data.customer.bank_details;
      let parsed: any[] = [];

      try {
        parsed = JSON.parse(raw);
      } catch (e) {
        console.warn('Invalid bank_details JSON');
      }

      if (Array.isArray(parsed)) {
        setCards(parsed);
      } else {
        setCards([]);
      }
    } catch (err) {
      console.error('Load cards error:', err);
      Alert.alert('Error', 'Could not load payment methods');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCards();
  }, []);

  const handleAddNew = () => {
    navigation.navigate('PaymentHistory', {
      onCardAdded: fetchCards, // refresh list
    });
  };

  const renderCard = ({ item }: { item: Card }) => {
    const last4 = item.card_number.slice(-4);
    const formatted = formatCardNumber(item.card_number);
    const shortFormatted = last4
      ? `•••• •••• •••• ${last4}`
      : '•••• •••• •••• ••••';

    return (
      <View style={styles.cardItem}>
        <CreditCard size={28} color="#2EB1E2" />
        <View style={styles.cardInfo}>
          <Text style={styles.cardName}>
            {item.card_holder_name.toUpperCase()}
          </Text>
          <Text style={styles.cardNumber}>{shortFormatted}</Text>
          <Text style={styles.expiry}>
            Expires {item.expiry_month.padStart(2, '0')}/
            {item.expiry_year.padStart(2, '0')}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ChevronLeft size={28} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.title}>Payment Methods</Text>
        <View style={{ width: 28 }} />
      </View>

      <View style={styles.content}>
        {cards.length === 0 ? (
          <Text style={styles.emptyText}>No payment methods added yet</Text>
        ) : (
          <FlatList
            data={cards}
            renderItem={renderCard}
            keyExtractor={(_, index) => `card-${index}`}
            contentContainerStyle={{ paddingBottom: 100 }}
          />
        )}

        <TouchableOpacity style={styles.addButton} onPress={handleAddNew}>
          <Plus size={20} color="#ffffff" />
          <Text style={styles.addButtonText}>Add Payment Method</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#ffffff',
  },
  title: { fontSize: 20, fontWeight: '700', color: '#111827' },
  content: { flex: 1, padding: 16 },
  emptyText: {
    textAlign: 'center',
    marginTop: 80,
    fontSize: 16,
    color: '#6b7280',
  },
  cardItem: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardInfo: { marginLeft: 16, flex: 1 },
  cardName: { fontSize: 17, fontWeight: '600', color: '#111827' },
  cardNumber: {
    fontSize: 16,
    color: '#4b5563',
    marginTop: 4,
    letterSpacing: 0.5,
  },
  expiry: { fontSize: 14, color: '#6b7280', marginTop: 4 },
  addButton: {
    position: 'absolute',
    bottom: 32,
    left: 24,
    right: 24,
    backgroundColor: '#2EB1E2',
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#2EB1E2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  addButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
