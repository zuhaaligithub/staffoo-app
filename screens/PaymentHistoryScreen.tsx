import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { ChevronLeft } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const BASE_URL = 'https://apis.staffoo.com.au/api';

type Props = {
  navigation: any;
  route: any;
};

export default function PaymentHistoryScreen({ navigation, route }: Props) {
  const { onCardAdded } = route.params || {};

  const [name, setName] = useState('');
  const [cardNumber, setCardNumber] = useState(''); // formatted with spaces
  const [expMonth, setExpMonth] = useState('');
  const [expYear, setExpYear] = useState('');
  const [cvv, setCvv] = useState('');
  const [saving, setSaving] = useState(false);

  // Format card number for display (spaces every 4 digits)
  const formatCardNumber = (text: string): string => {
    const cleaned = text.replace(/\D/g, '');
    const chunks = cleaned.match(/.{1,4}/g) || [];
    return chunks.join(' ');
  };

  const handleCardChange = (text: string) => {
    setCardNumber(formatCardNumber(text));
  };

const formatMaskedCardNumber = (formatted: string): string => {
  if (!formatted) return '';

  // Keep spaces, replace digits with •
  return formatted.replace(/[0-9]/g, '•');
};

  const isFormValid =
    name.trim().length >= 2 &&
    cardNumber.replace(/\D/g, '').length >= 15 &&
    expMonth.length === 2 &&
    expYear.length === 2 &&
    cvv.length >= 3;

  const handleSave = async () => {
  if (!isFormValid) {
    Alert.alert('Incomplete', 'Please fill all fields correctly');
    return;
  }

  const month = parseInt(expMonth, 10);
  if (month < 1 || month > 12) {
    Alert.alert('Invalid expiry', 'Month must be 01–12');
    return;
  }

  setSaving(true);

  try {
    const token = await AsyncStorage.getItem('@auth_token');
    if (!token) throw new Error('Not authenticated');

    // ✅ Get logged-in user
    const userStr = await AsyncStorage.getItem('user');
    if (!userStr) throw new Error('User session not found');

    const user = JSON.parse(userStr);
    const USER_ID = user.id;

    // 1️⃣ Get current cards
    let currentCards: any[] = [];

    try {
      const res = await axios.get(`${BASE_URL}/user-edit/${USER_ID}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data?.success && res.data?.data?.customer?.bank_details) {
        currentCards = JSON.parse(res.data.data.customer.bank_details) || [];
      }
    } catch (fetchErr) {
      console.warn('Could not fetch existing cards', fetchErr);
    }

    // 2️⃣ New card
    const newCard = {
      card_holder_name: name.trim(),
      card_number: cardNumber,
      expiry_month: expMonth.padStart(2, '0'),
      expiry_year: expYear.padStart(2, '0'),
    };

    const updatedCards = [...currentCards, newCard];

    const payload = {
      bank_details: JSON.stringify(updatedCards),
    };

    console.log('Payload:', payload);

    // 3️⃣ Save card
    const response = await axios.post(
      `${BASE_URL}/user-update/${USER_ID}`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      }
    );

    if (response.data?.success) {
      Alert.alert('Success', 'Card added successfully');
      if (onCardAdded) onCardAdded();
      navigation.goBack();
    } else {
      throw new Error(response.data?.message || 'Response not successful');
    }

  } catch (err: any) {
    console.error('SAVE CARD ERROR:', err);

    Alert.alert(
      'Error',
      err.response?.data?.message || err.message || 'Could not save card'
    );
  } finally {
    setSaving(false);
  }
};

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <ChevronLeft size={28} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add Payment Method</Text>
          <View style={{ width: 28 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Card Preview */}
       

<View style={styles.previewWrapper}>
  <LinearGradient
    colors={['#0f3460', '#1e5799', '#2a5298']} // deeper blue tones, more realistic
    start={{ x: 0.0, y: 0.0 }}
    end={{ x: 1.0, y: 1.0 }}
    style={styles.cardPreview}
  >
    {/* Top row: Chip + VISA logo */}
    <View style={styles.topRow}>
      {/* Gold chip with shine */}
      <View style={styles.chipContainer}>
        <View style={styles.chip}>
          <View style={styles.chipInner} />
          <View style={styles.chipShine} />
        </View>
      </View>

      <Text style={styles.visaLogo}>VISA</Text>
    </View>

    {/* Card number – masked with •••• groups */}
    <View style={styles.numberContainer}>
      <Text style={styles.cardNumber}>
        {formatMaskedCardNumber(cardNumber) || '•••• •••• •••• ••••'}
      </Text>
    </View>

    {/* Bottom row: Holder & Expiry */}
    <View style={styles.bottomRow}>
      <View style={styles.holderSection}>
        <Text style={styles.labelSmall}>CARD HOLDER</Text>
        <Text style={styles.valueText}>
          {(name || 'YOUR NAME').toUpperCase()}
        </Text>
      </View>

      <View style={styles.expirySection}>
        <Text style={styles.labelSmall}>EXPIRES</Text>
        <Text style={styles.valueText}>
          {expMonth.padStart(2, '0') || 'MM'}/{expYear.padStart(2, '0') || 'YY'}
        </Text>
      </View>
    </View>
  </LinearGradient>
</View>
          {/* Form */}
          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={styles.label}>Name on Card</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="e.g. John Doe"
                autoCapitalize="words"
                placeholderTextColor="#9ca3af"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Card Number</Text>
              <TextInput
                style={styles.input}
                value={cardNumber}
                onChangeText={handleCardChange}
                keyboardType="numeric"
                maxLength={19}
                placeholder="4354 6557 7677 4444"
                placeholderTextColor="#9ca3af"
              />
            </View>

            <View style={styles.row}>
              <View style={styles.halfField}>
                <Text style={styles.label}>Exp Month</Text>
                <TextInput
                  style={styles.input}
                  value={expMonth}
                  onChangeText={t => setExpMonth(t.replace(/\D/g, '').slice(0, 2))}
                  keyboardType="numeric"
                  maxLength={2}
                  placeholder="MM"
                  placeholderTextColor="#9ca3af"
                />
              </View>

              <View style={styles.halfField}>
                <Text style={styles.label}>Exp Year</Text>
                <TextInput
                  style={styles.input}
                  value={expYear}
                  onChangeText={t => setExpYear(t.replace(/\D/g, '').slice(0, 2))}
                  keyboardType="numeric"
                  maxLength={2}
                  placeholder="YY"
                  placeholderTextColor="#9ca3af"
                />
              </View>

              <View style={styles.halfField}>
                <Text style={styles.label}>CVV</Text>
                <TextInput
                  style={styles.input}
                  value={cvv}
                  onChangeText={t => setCvv(t.replace(/\D/g, '').slice(0, 4))}
                  keyboardType="numeric"
                  maxLength={4}
                  secureTextEntry
                  placeholder="•••"
                  placeholderTextColor="#9ca3af"
                />
              </View>
            </View>

            <TouchableOpacity
              style={[styles.saveButton, (!isFormValid || saving) && styles.disabled]}
              disabled={!isFormValid || saving}
              onPress={handleSave}
            >
              {saving ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.saveText}>Save Card</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#111827' },
  scrollContent: { padding: 20, paddingBottom: 40 },

  
  previewNumber: {
    fontSize: 24,
    letterSpacing: 2,
    color: '#fff',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },

  previewName: { color: '#fff', fontSize: 16, textTransform: 'uppercase' },
  previewExpiry: { color: '#fff', fontSize: 16 },
  form: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  field: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    backgroundColor: '#fafafa',
  },
  row: { flexDirection: 'row', gap: 12 },
  halfField: { flex: 1 },
  saveButton: {
    backgroundColor: '#2EB1E2',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  disabled: { backgroundColor: '#93c5fd' },
  saveText: { color: '#fff', fontSize: 16, fontWeight: '600' },



  previewWrapper: {
    alignItems: 'center',
    marginBottom: 32,
    paddingHorizontal: 10,
  },

  cardPreview: {
    width: 340,
    height: 220,               // slightly taller for better proportions
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingVertical: 20,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 14,
  },

  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  chipContainer: {
    width: 50,
    height: 38,
  },

  chip: {
    width: '100%',
    height: '100%',
    backgroundColor: '#FFD700', // gold
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#E6C200',
  },

  chipInner: {
    ...StyleSheet.absoluteFillObject,
    top: 5,
    left: 7,
    right: 7,
    bottom: 5,
    backgroundColor: '#F4C430',
    borderRadius: 6,
  },

  chipShine: {
    position: 'absolute',
    top: 8,
    left: 10,
    width: 24,
    height: 14,
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderRadius: 12,
  },

  visaLogo: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    letterSpacing: 2,
    fontStyle: 'italic',        // classic VISA italic style
  },

  numberContainer: {
    flex: 1,
    justifyContent: 'center',
  },

  cardNumber: {
    fontSize: 26,
    letterSpacing: 3.5,
    color: '#ffffff',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    fontWeight: '500',
  },

  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },

  holderSection: {
    flex: 1,
  },

  expirySection: {
    alignItems: 'flex-end',
  },

  labelSmall: {
    fontSize: 10,
    fontWeight: '600',
    color: '#c3d7ff',
    marginBottom: 4,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },

  valueText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#ffffff',
    letterSpacing: 1.2,
  },

  


});