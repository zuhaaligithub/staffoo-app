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
  StatusBar,
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
        },
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
        err.response?.data?.message || err.message || 'Could not save card',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBox}
          onPress={() => navigation.goBack()}
        >
          <ChevronLeft size={28} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Payment Method</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Card Preview */}

        <View style={styles.previewWrapper}>
          <LinearGradient
            colors={['#0B1F3A', '#173F73', '#2457A7']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
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
                  {expMonth.padStart(2, '0') || 'MM'}/
                  {expYear.padStart(2, '0') || 'YY'}
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
              placeholder="4242 4242 4242 4242"
              placeholderTextColor="#9ca3af"
            />
          </View>

          <View style={styles.row}>
            <View style={styles.halfField}>
              <Text style={styles.label}>Exp Month</Text>
              <TextInput
                style={styles.input}
                value={expMonth}
                onChangeText={t =>
                  setExpMonth(t.replace(/\D/g, '').slice(0, 2))
                }
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
            style={[
              styles.saveButton,
              (!isFormValid || saving) && styles.disabled,
            ]}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f6fb',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 8,
  },

  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: 0.3,
  },

  backBox: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',

    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },

  scrollContent: {
    paddingBottom: 40,
  },

  // =========================
  // CARD PREVIEW
  // =========================

  previewWrapper: {
    alignItems: 'center',
    paddingHorizontal: 5,
    paddingVertical: 0,
  },

  cardPreview: {
    width: '100%',
    maxWidth: 390,
    height: 240,

    borderRadius: 15,

    paddingHorizontal: 5,
    paddingVertical: 15,

    justifyContent: 'space-between',
    overflow: 'hidden',

    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.2,
    shadowRadius: 18,
    elevation: 2,
  },

  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  chipContainer: {
    width: 48,
    height: 35,
    marginLeft: 15,
  },

  chip: {
    width: '100%',
    height: '100%',
    backgroundColor: '#D4AF37',
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#f6d365',
  },

  chipInner: {
    ...StyleSheet.absoluteFillObject,
    margin: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },

  chipShine: {
    position: 'absolute',
    top: 6,
    left: 8,
    width: 30,
    height: 12,
    backgroundColor: 'rgba(255,255,255,0.35)',
    borderRadius: 20,
  },

  visaLogo: {
    fontSize: 25,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 1.5,
    fontStyle: 'italic',
    marginRight: 30,
    textShadowColor: 'rgba(0,0,0,0.25)',
    textShadowOffset: {
      width: 0,
      height: 1,
    },
    textShadowRadius: 3,
  },

  numberContainer: {
    marginTop: 2,
    marginBottom: 0,
    marginLeft: 15,
  },

  cardNumber: {
    fontSize: 28,
    color: '#fff',
    letterSpacing: 4,

    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',

    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: {
      width: 0,
      height: 1,
    },
    textShadowRadius: 4,
  },

  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },

  holderSection: {
    flex: 1,
    marginLeft: 15,
    marginBottom: 25,
  },

  expirySection: {
    alignItems: 'flex-end',
    marginBottom: 25,
    marginRight: 15,
  },

  labelSmall: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.72)',
    marginBottom: 5,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },

  valueText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 1,
  },

  // =========================
  // FORM
  // =========================

  form: {
    backgroundColor: '#fff',

    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,

    paddingHorizontal: 22,
    paddingTop: 26,
    paddingBottom: 34,

    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 5,
  },

  field: {
    marginBottom: 22,
  },

  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 9,
  },

  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',

    borderRadius: 14,

    paddingHorizontal: 16,
    paddingVertical: 15,

    fontSize: 16,
    color: '#111827',

    backgroundColor: '#F9FAFB',

    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.02,
    shadowRadius: 2,
  },

  row: {
    flexDirection: 'row',
    gap: 12,
  },

  halfField: {
    flex: 1,
  },

  // =========================
  // BUTTON
  // =========================

  saveButton: {
    marginTop: 24,

    backgroundColor: '#2EB1E2',

    paddingVertical: 17,

    borderRadius: 16,

    alignItems: 'center',
    justifyContent: 'center',

    shadowColor: '#2EB1E2',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },

  disabled: {
    backgroundColor: '#9bd8ef',
    shadowOpacity: 0,
    elevation: 0,
  },

  saveText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.4,
  },

  // =========================
  // OLD PREVIEW (OPTIONAL)
  // =========================

  previewNumber: {
    fontSize: 24,
    letterSpacing: 2,
    color: '#fff',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },

  previewName: {
    color: '#fff',
    fontSize: 16,
    textTransform: 'uppercase',
  },

  previewExpiry: {
    color: '#fff',
    fontSize: 16,
  },
});
