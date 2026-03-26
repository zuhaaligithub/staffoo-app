// import React, { useEffect, useState } from 'react';
// import { View, TouchableOpacity, StyleSheet } from 'react-native';
// import { Home, FileText, Plus, MessageCircle, User, Calendar } from 'lucide-react-native';
// import AsyncStorage from '@react-native-async-storage/async-storage';

// type Props = {
//   navigation: any;
//   activeTab?: string;
//   isActive?: boolean;
// };

// export default function BottomTab({ navigation, activeTab, isActive = true }: Props) {
//   const [userType, setUserType] = useState<string | null>(null);

//   useEffect(() => {
//     loadUser();
//   }, []);

//   const loadUser = async () => {
//     try {
//       const userData = await AsyncStorage.getItem('user');

//       if (userData) {
//         const parsedUser = JSON.parse(userData);

//         const type =
//           parsedUser?.user_type ??
//           parsedUser?.data?.user_type ??
//           null;

//         console.log('Loaded userType:', type);

//         setUserType(type);
//       }
//     } catch (error) {
//       console.log('Error loading user:', error);
//     }
//   };

//   const handleNavigation = (screen: string) => {
//     console.log('BottomTab isActive:', isActive);

//     // Block navigation only if explicitly inactive
//     if (isActive === false && screen !== 'Profile') {
//       console.log('User inactive - navigation blocked:', screen);
//       return;
//     }

//     navigation.navigate(screen);
//   };

//   const getColor = (tabName: string) => {
//     if (isActive === false && tabName !== 'Profile') {
//       return '#c0c0c0';
//     }

//     return activeTab === tabName ? '#2869FE' : '#9CA3AF';
//   };

//  return (
//   <View style={styles.bottomTab}>

//     {/* Home */}
//     <TouchableOpacity
//       style={styles.tabItem}
//       onPress={() => handleNavigation('Main')}
//     >
//       <Home size={26} color={getColor('Home')} />
//     </TouchableOpacity>

//     {/* Applications */}
//     <TouchableOpacity
//       style={styles.tabItem}
//       onPress={() => handleNavigation('Applications')}
//     >
//       <FileText size={26} color={getColor('Applications')} />
//     </TouchableOpacity>

//     {/* Create Job (customer only) */}
//     {userType === 'customer' && (
//       <TouchableOpacity
//         style={styles.tabAdd}
//         onPress={() => handleNavigation('CreateJob')}
//       >
//         <Plus size={32} color="#fff" strokeWidth={2.5} />
//       </TouchableOpacity>
//     )}

//     {/* Staff Shifts (staff or contractor) */}
//     {(userType === 'staff' || userType === 'contractor') && (
//       <TouchableOpacity
//         style={styles.tabItem}
//         onPress={() => handleNavigation('StaffShifts')}
//       >
//         <Calendar size={26} color={getColor('StaffShifts')} />
//       </TouchableOpacity>
//     )}

//     {/* Messages */}
//     <TouchableOpacity
//       style={styles.tabItem}
//       onPress={() => handleNavigation('Messages')}
//     >
//       <MessageCircle size={26} color={getColor('Messages')} />
//     </TouchableOpacity>

//     {/* Profile */}
//     <TouchableOpacity
//       style={styles.tabItem}
//       onPress={() => handleNavigation('Profile')}
//     >
//       <User size={26} color={getColor('Profile')} />
//     </TouchableOpacity>

//   </View>
// );
// }

// const styles = StyleSheet.create({
//   bottomTab: {
//     flexDirection: 'row',
//     justifyContent: 'space-around',
//     alignItems: 'center',
//     backgroundColor: '#fff',
//     borderTopWidth: 1,
//     borderTopColor: '#f0f0f0',
//     paddingVertical: 10,
//     elevation: 8,
//     position: 'relative',
//   },

//   tabItem: {
//     alignItems: 'center',
//     padding: 10,
//     flex: 1,
//   },

//   tabAdd: {
//     width: 60,
//     height: 60,
//     borderRadius: 30,
//     backgroundColor: '#2869FE',
//     justifyContent: 'center',
//     alignItems: 'center',
//     marginTop: -30,
//     elevation: 6,
//   },
// });




import React, { useEffect, useState, useCallback } from 'react';
import { View, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { Home, FileText, Plus, MessageCircle, User, Calendar, Lock } from 'lucide-react-native';

// ── Import your API function ──
import { getUserProfile } from '../services/authApi';   // ← adjust path

type Props = {
  navigation: any;
  activeTab?: string;
};

export default function BottomTab({ navigation, activeTab = 'Main' }: Props) {

  const [userType, setUserType] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [loading, setLoading] = useState(true);           // optional – can show spinner if needed

  // ── Load from storage + API on focus ──
  useFocusEffect(
    useCallback(() => {
      const loadUserData = async () => {
        try {
          setLoading(true);

          const userId = await AsyncStorage.getItem('@user_id');
          const token = await AsyncStorage.getItem('@auth_token');

          if (!userId || !token) {
            console.log('[BottomTab] No credentials → redirect to login');
            navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
            return;
          }

          console.log('[BottomTab] Fetching fresh profile for user:', userId);

          // Call the same API as ProfileScreen
          const response = await getUserProfile(userId);

          console.log('[BottomTab] API response:', response);

          let userData;

          if (response?.success && response?.data) {
            userData = response.data;
            // Save fresh data (so next time faster + consistent)
            await AsyncStorage.setItem('user', JSON.stringify(userData));
          } else {
            // Fallback to cache if API fails
            console.log('[BottomTab] API failed, using cache');
            const cached = await AsyncStorage.getItem('user');
            if (cached) {
              userData = JSON.parse(cached);
            }
          }

          if (userData) {
            console.log('[BottomTab] is_active from API/cache:', userData.is_active);

            setUserType(userData.user_type ?? null);
            setIsActive(userData.is_active === true);   // strict boolean
          }

        } catch (err) {
          console.error('[BottomTab] Load error:', err);

          // Last resort: try cache anyway
          try {
            const cached = await AsyncStorage.getItem('user');
            if (cached) {
              const parsed = JSON.parse(cached);
              setUserType(parsed.user_type ?? null);
              setIsActive(parsed.is_active === true);
            }
          } catch (cacheErr) {
            console.error('[BottomTab] Cache fallback failed:', cacheErr);
          }
        } finally {
          setLoading(false);
        }
      };

      loadUserData();
    }, [navigation])   // navigation as dep → safe
  );

  // ── Rest of your logic stays almost the same ──

  const handlePress = (screen: string) => {
    if (!canAccess(screen)) {
      Alert.alert(
        'Account Not Active',
        'Your account must be active to access this section.',
        [
          { text: 'Go to Profile', onPress: () => navigation.navigate('Profile') },
          { text: 'OK', style: 'cancel' },
        ]
      );
      return;
    }

    navigation.navigate(screen);
  };

  const getIconColor = (screen: string) => {
    if (!canAccess(screen) && screen !== 'Profile') {
      return '#d1d5db';
    }
    return activeTab === screen ? '#2869FE' : '#6b7280';
  };

  const isFullyAccessible = isActive === true;

  const canAccess = (screen: string): boolean => {
    if (screen === 'Profile') return true;
    return isFullyAccessible;
  };

  const getAddButtonStyle = () => {
    if (!isFullyAccessible) {
      return [styles.tabAdd, styles.tabAddDisabled];
    }
    return styles.tabAdd;
  };

  // Optional: show loading state if you want
  if (loading) {
    return (
      <View style={styles.bottomTab}>
        {/* You can show a small spinner or just empty */}
      </View>
    );
  }

  return (
    <View style={styles.bottomTab}>
      {/* Home */}
      <TouchableOpacity
        style={styles.tabItem}
        onPress={() => handlePress('Main')}
        disabled={!canAccess('Main')}
      >
        <Home size={26} color={getIconColor('Main')} />
        {!canAccess('Main') && (
          <Lock size={12} color="#ef4444" style={styles.lockIcon} />
        )}
      </TouchableOpacity>

      {/* Applications */}
      <TouchableOpacity
        style={styles.tabItem}
        onPress={() => handlePress('Applications')}
        disabled={!canAccess('Applications')}
      >
        <FileText size={26} color={getIconColor('Applications')} />
        {!canAccess('Applications') && (
          <Lock size={12} color="#ef4444" style={styles.lockIcon} />
        )}
      </TouchableOpacity>

      {/* Create Job - Customer */}
      {userType === 'customer' && (
        <TouchableOpacity
          style={getAddButtonStyle()}
          onPress={() => handlePress('CreateJob')}
          disabled={!isFullyAccessible}
        >
          <Plus size={32} color="#fff" strokeWidth={2.5} />
        </TouchableOpacity>
      )}

      {/* Staff Shifts - Staff */}
      {(userType === 'staff' || userType === 'contractor') && (
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => handlePress('StaffShifts')}
          disabled={!canAccess('StaffShifts')}
        >
          <Calendar size={26} color={getIconColor('StaffShifts')} />
          {!canAccess('StaffShifts') && (
            <Lock size={12} color="#ef4444" style={styles.lockIcon} />
          )}
        </TouchableOpacity>
      )}

      {/* Messages */}
      <TouchableOpacity
        style={styles.tabItem}
        onPress={() => handlePress('Messages')}
        disabled={!canAccess('Messages')}
      >
        <MessageCircle size={26} color={getIconColor('Messages')} />
        {!canAccess('Messages') && (
          <Lock size={12} color="#ef4444" style={styles.lockIcon} />
        )}
      </TouchableOpacity>

      {/* Profile */}
      <TouchableOpacity
        style={styles.tabItem}
        onPress={() => handlePress('Profile')}
      >
        <User size={26} color={getIconColor('Profile')} />
      </TouchableOpacity>
    </View>
  );
}

// styles remain the same...

const styles = StyleSheet.create({
  bottomTab: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingVertical: 8,
    elevation: 10,
  },
  lockIcon: {
    position: 'absolute',
    top: 0,
    right: 18,


  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    position: 'relative',
  },

  tabAdd: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#2869FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -34,
    elevation: 8,
  },

  tabAddDisabled: {
    backgroundColor: '#9ca3af',
    elevation: 0,
  },

  lockBadge: {
    position: 'absolute',
    top: 2,
    right: 18,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#ef4444',
    borderWidth: 2,
    borderColor: '#fff',
  },
});