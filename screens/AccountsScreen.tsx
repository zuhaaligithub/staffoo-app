import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChevronLeft, MoreVertical, Search } from 'lucide-react-native';
import type { RootStackParamList } from '../navigation/types';   // ← most important line
import AsyncStorage from '@react-native-async-storage/async-storage';
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
const AccountsScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const [user, setUser] = React.useState<any>(null);
  React.useEffect(() => {
    const loadUser = async () => {
      try {
        const storedUser = await AsyncStorage.getItem('user');
        if (storedUser) setUser(JSON.parse(storedUser));
      } catch (err) {
        console.log('Failed to load user', err);
      }
    };
    loadUser();
  }, []);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBox}
          onPress={() => navigation.goBack()}
        >
          <ChevronLeft size={26} color="#000" strokeWidth={2.5} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Rates</Text>
      </View>
      {user?.user_type !== 'customer' && (
        <View style={styles.card}>
          <Image
            source={require('../assets/chargeRates.png')}
            style={styles.image}
            resizeMode="cover"
          />
          <View style={styles.content}>
            <Text style={styles.title}>Charge Rates</Text>
            <Text style={styles.description}>
              The amount which is charged from the customer.
            </Text>
            <TouchableOpacity
              style={styles.button}
              onPress={() => navigation.navigate('ChargeRates')}
            >
              <Text style={styles.buttonText}>Access Now</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Pay Rates Card */}
      <View style={styles.card}>
        <Image
          source={require('../assets/payrates.png')}
          style={styles.image}
          resizeMode="cover"
        />
        <View style={styles.content}>
          <Text style={styles.title}>Pay Rates</Text>
          <Text style={styles.description}>
            The amount which is paid to the staff.
          </Text>
          <TouchableOpacity
            style={styles.button}
            onPress={() => navigation.navigate('PayRates')}
          >
            <Text style={styles.buttonText}>Access Now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

// styles unchanged...
const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#f4f6f9',
    paddingTop: 20
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    // justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 20,

  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginLeft:60
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
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

  profileHeader: {
    alignItems: 'center',
    paddingVertical: 25,
    paddingHorizontal: 20,
  },

  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 20,
    overflow: 'hidden',
    elevation: 3,
  },

  image: {
    width: '100%',
    height: 150,
  },

  content: {
    padding: 16,
  },

  title: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 6,
    color: '#1e293b',
  },

  description: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 14,
  },

  button: {
    backgroundColor: '#0f172a',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    width: 140,
  },

  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
});
export default AccountsScreen;