// import React, { useEffect, useState, useCallback } from 'react';
// import { View, TouchableOpacity, StyleSheet, Alert } from 'react-native';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import { useFocusEffect } from '@react-navigation/native';
// import { Home, FileText, Plus, MessageCircle, User, Calendar, Lock } from 'lucide-react-native';
// import { getUserProfile } from '../services/authApi';
// type Props = {
//   navigation: any;
//   activeTab?: string;
// };
// export default function BottomTab({ navigation, activeTab = 'Main' }: Props) {
//   const [userType, setUserType] = useState<string | null>(null);
//   const [isActive, setIsActive] = useState(false);
//   const [loading, setLoading] = useState(true);


//   useFocusEffect(
//     useCallback(() => {
//       const loadUserData = async () => {
//         try {
//           setLoading(true);

//           const userId = await AsyncStorage.getItem('@user_id');
//           const token = await AsyncStorage.getItem('@auth_token');

//           // 🔴 If no credentials → force login
//           if (!userId || !token) {
//             console.log('[BottomTab] No credentials → redirect to login');

//             await AsyncStorage.multiRemove([
//               '@user_id',
//               '@auth_token',
//               'user',
//             ]);

//             navigation.reset({
//               index: 0,
//               routes: [{ name: 'Login' }],
//             });
//             return;
//           }

//           console.log('[BottomTab] Fetching fresh profile for user:', userId);

//           const response = await getUserProfile(userId);

//           console.log('[BottomTab] API response:', response);

//           // 🔴 Handle session expired / unauthenticated
//           if (
//             response?.status === 401 ||
//             response?.message === 'Unauthenticated' ||
//             response?.success === false
//           ) {
//             console.log('[BottomTab] Session expired or invalid token');

//             await AsyncStorage.multiRemove([
//               '@user_id',
//               '@auth_token',
//               'user',
//             ]);

//             Alert.alert(
//               'Session Expired',
//               'Please login again.',
//               [
//                 {
//                   text: 'OK',
//                   onPress: () => {
//                     navigation.reset({
//                       index: 0,
//                       routes: [{ name: 'Login' }],
//                     });
//                   },
//                 },
//               ]
//             );

//             return;
//           }

//           let userData;

//           // ✅ Success case
//           if (response?.success && response?.data) {
//             userData = response.data;
//             await AsyncStorage.setItem('user', JSON.stringify(userData));
//           } else {
//             // 🟡 fallback to cache
//             console.log('[BottomTab] API failed, using cache');
//             const cached = await AsyncStorage.getItem('user');
//             if (cached) {
//               userData = JSON.parse(cached);
//             }
//           }

//           // ✅ Set state
//           if (userData) {
//             console.log('[BottomTab] is_active:', userData.is_active);

//             setUserType(userData.user_type ?? null);
//             setIsActive(userData.is_active === true);
//           }

//         }
//         catch (err: any) {
//           console.error('[BottomTab] Load error:', err);

//           const isSessionExpired =
//             err?.response?.status === 401 ||
//             err?.message?.toLowerCase().includes('session expired') ||
//             err?.message?.toLowerCase().includes('unauthenticated');

//           if (isSessionExpired) {
//             console.log('[BottomTab] Force logout بسبب expired session');

//             await AsyncStorage.multiRemove([
//               '@user_id',
//               '@auth_token',
//               'user',
//             ]);

//             Alert.alert(
//               'Session Expired',
//               'Your session has expired. Please login again.',
//               [
//                 {
//                   text: 'OK',
//                   onPress: () => {
//                     navigation.reset({
//                       index: 0,
//                       routes: [{ name: 'Login' }],
//                     });
//                   },
//                 },
//               ]
//             );

//             return;
//           }

//           // 🟡 fallback cache
//           try {
//             const cached = await AsyncStorage.getItem('user');
//             if (cached) {
//               const parsed = JSON.parse(cached);
//               setUserType(parsed.user_type ?? null);
//               setIsActive(parsed.is_active === true);
//             }
//           } catch (cacheErr) {
//             console.error('[BottomTab] Cache fallback failed:', cacheErr);
//           }
//         } finally {
//           setLoading(false);
//         }
//       };

//       loadUserData();
//     }, [navigation])
//   );
//   const handlePress = (screen: string) => {
//     if (!canAccess(screen)) {
//       Alert.alert(
//         'Account Not Active',
//         'Your account must be active to access this section.',
//         [
//           { text: 'Go to Profile', onPress: () => navigation.navigate('Profile') },
//           { text: 'OK', style: 'cancel' },
//         ]
//       );
//       return;
//     }

//     navigation.navigate(screen);
//   };

//   const getIconColor = (screen: string) => {
//     if (!canAccess(screen) && screen !== 'Profile') {
//       return '#d1d5db';
//     }
//     return activeTab === screen ? '#2869FE' : '#6b7280';
//   };

//   const isFullyAccessible = isActive === true;

//   const canAccess = (screen: string): boolean => {
//     if (screen === 'Profile') return true;
//     return isFullyAccessible;
//   };

//   const getAddButtonStyle = () => {
//     if (!isFullyAccessible) {
//       return [styles.tabAdd, styles.tabAddDisabled];
//     }
//     return styles.tabAdd;
//   };
//   if (loading) {
//     return (
//       <View style={styles.bottomTab}>
//       </View>
//     );
//   }

//   return (
//     <View style={styles.bottomTab}>
//       <TouchableOpacity
//         style={styles.tabItem}
//         onPress={() => handlePress('Home')}
//         disabled={!canAccess('Home')}
//       >
//         <Home size={26} color={getIconColor('Home')} />
//         {!canAccess('Home') && (
//           <Lock size={12} color="#ef4444" style={styles.lockIcon} />
//         )}
//       </TouchableOpacity>
//       <TouchableOpacity
//         style={styles.tabItem}
//         onPress={() => handlePress('Applications')}
//         disabled={!canAccess('Applications')}
//       >
//         <FileText size={26} color={getIconColor('Applications')} />
//         {!canAccess('Applications') && (
//           <Lock size={12} color="#ef4444" style={styles.lockIcon} />
//         )}
//       </TouchableOpacity>
//       {userType === 'customer' && (
//         <TouchableOpacity
//           style={getAddButtonStyle()}
//           onPress={() => handlePress('CreateJob')}
//           disabled={!isFullyAccessible}
//         >
//           <Plus size={32} color="#fff" strokeWidth={2.5} />
//         </TouchableOpacity>
//       )}
//       {(userType === 'staff' || userType === 'contractor') && (
//         <TouchableOpacity
//           style={styles.tabItem}
//           onPress={() => handlePress('StaffShifts')}
//           disabled={!canAccess('StaffShifts')}
//         >
//           <Calendar size={26} color={getIconColor('StaffShifts')} />
//           {!canAccess('StaffShifts') && (
//             <Lock size={12} color="#ef4444" style={styles.lockIcon} />
//           )}
//         </TouchableOpacity>
//       )}

//       <TouchableOpacity
//         style={styles.tabItem}
//         onPress={() => handlePress('Messages')}
//         disabled={!canAccess('Messages')}
//       >
//         <MessageCircle size={26} color={getIconColor('Messages')} />
//         {!canAccess('Messages') && (
//           <Lock size={12} color="#ef4444" style={styles.lockIcon} />
//         )}
//       </TouchableOpacity>

//       <TouchableOpacity
//         style={styles.tabItem}
//         onPress={() => handlePress('Profile')}
//       >
//         <User size={26} color={getIconColor('Profile')} />
//       </TouchableOpacity>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   bottomTab: {
//     flexDirection: 'row',
//     justifyContent: 'space-around',
//     alignItems: 'center',
//     backgroundColor: '#fff',
//     borderTopWidth: 1,
//     borderTopColor: '#f0f0f0',
//     paddingVertical: 8,
//     elevation: 10,
//   },
//   lockIcon: {
//     position: 'absolute',
//     top: 0,
//     right: 18,


//   },
//   tabItem: {
//     alignItems: 'center',
//     justifyContent: 'center',
//     flex: 1,
//     position: 'relative',
//   },

//   tabAdd: {
//     width: 60,
//     height: 60,
//     borderRadius: 30,
//     backgroundColor: '#2869FE',
//     justifyContent: 'center',
//     alignItems: 'center',
//     marginTop: -34,
//     elevation: 8,
//   },

//   tabAddDisabled: {
//     backgroundColor: '#9ca3af',
//     elevation: 0,
//   },

//   lockBadge: {
//     position: 'absolute',
//     top: 2,
//     right: 18,
//     width: 14,
//     height: 14,
//     borderRadius: 7,
//     backgroundColor: '#ef4444',
//     borderWidth: 2,
//     borderColor: '#fff',
//   },
// });


import React, { useEffect, useState, useCallback } from 'react';
import { View, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { Home, FileText, Plus, MessageCircle, User, Calendar, Lock } from 'lucide-react-native';
import { getUserProfile } from '../services/authApi';

type Props = {
  navigation: any;
  activeTab?: string;
};

export default function BottomTab({ navigation, activeTab = 'Main' }: Props) {
  const [userType, setUserType] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      const loadUserData = async () => {
        try {
          setLoading(true);

          const userId = await AsyncStorage.getItem('@user_id');
          const token = await AsyncStorage.getItem('@auth_token');

          if (!userId || !token) {
            await AsyncStorage.multiRemove(['@user_id', '@auth_token', 'user']);
            navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
            return;
          }

          const response = await getUserProfile(userId);

          if (
            response?.status === 401 ||
            response?.message === 'Unauthenticated' ||
            response?.success === false
          ) {
            await AsyncStorage.multiRemove(['@user_id', '@auth_token', 'user']);
            Alert.alert('Session Expired', 'Please login again.', [
              {
                text: 'OK',
                onPress: () => {
                  navigation.reset({
                    index: 0,
                    routes: [{ name: 'Login' }],
                  });
                },
              },
            ]);
            return;
          }

          let userData;

          if (response?.success && response?.data) {
            userData = response.data;
            await AsyncStorage.setItem('user', JSON.stringify(userData));
          } else {
            const cached = await AsyncStorage.getItem('user');
            if (cached) userData = JSON.parse(cached);
          }

          if (userData) {
            setUserType(userData.user_type ?? null);
            setIsActive(userData.is_active === true);
          }
        } catch (err: any) {
          const cached = await AsyncStorage.getItem('user');
          if (cached) {
            const parsed = JSON.parse(cached);
            setUserType(parsed.user_type ?? null);
            setIsActive(parsed.is_active === true);
          }
        } finally {
          setLoading(false);
        }
      };

      loadUserData();
    }, [navigation])
  );

  const isFullyAccessible = isActive === true;

  const canAccess = (screen: string): boolean => {
    if (screen === 'Profile') return true;
    return isFullyAccessible;
  };

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
    if (!canAccess(screen) && screen !== 'Profile') return '#d1d5db';
    return activeTab === screen ? '#2869FE' : '#6b7280';
  };

  if (loading) {
    return <View style={styles.bottomTab} />;
  }

  return (
    <View style={styles.wrapper}>
      <View style={styles.bottomTab}>

        {/* Home */}
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => handlePress('Home')}
          disabled={!canAccess('Home')}
        >
          <Home size={26} color={getIconColor('Home')} />
          {!canAccess('Home') && <Lock size={12} color="#ef4444" style={styles.lockIcon} />}
        </TouchableOpacity>

        {/* Applications */}
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => handlePress('Applications')}
          disabled={!canAccess('Applications')}
        >
          <FileText size={26} color={getIconColor('Applications')} />
          {!canAccess('Applications') && <Lock size={12} color="#ef4444" style={styles.lockIcon} />}
        </TouchableOpacity>

        {/* Center FAB */}
        {userType === 'customer' && (
          <TouchableOpacity
            style={[styles.tabAdd, !isFullyAccessible && styles.tabAddDisabled]}
            onPress={() => handlePress('CreateJob')}
            disabled={!isFullyAccessible}
          >
            <Plus size={32} color="#fff" strokeWidth={2.5} />
          </TouchableOpacity>
        )}

        {/* Staff Shifts */}
        {(userType === 'staff' || userType === 'contractor') && (
          <TouchableOpacity
            style={styles.tabItem}
            onPress={() => handlePress('StaffShifts')}
            disabled={!canAccess('StaffShifts')}
          >
            <Calendar size={26} color={getIconColor('StaffShifts')} />
            {!canAccess('StaffShifts') && <Lock size={12} color="#ef4444" style={styles.lockIcon} />}
          </TouchableOpacity>
        )}

        {/* Messages */}
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => handlePress('Messages')}
          disabled={!canAccess('Messages')}
        >
          <MessageCircle size={26} color={getIconColor('Messages')} />
          {!canAccess('Messages') && <Lock size={12} color="#ef4444" style={styles.lockIcon} />}
        </TouchableOpacity>

        {/* Profile */}
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => handlePress('Profile')}
        >
          <User size={26} color={getIconColor('Profile')} />
        </TouchableOpacity>

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    // backgroundColor: '#ffffff',
  },

bottomTab: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    height: 58,               // set explicit height
    backgroundColor: '#eff6fd',
    marginHorizontal: 10,
    marginBottom: 7,
    borderRadius: 25,
    // paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#bfc0c2',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 25,
  },

tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    // flex: 1,  ← remove this
    paddingHorizontal: 12,
},

  tabAdd: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#2869FE',

    justifyContent: 'center',
    alignItems: 'center',

    marginTop: -40,

    shadowColor: '#2869FE',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,

    elevation: 12,
  },

  tabAddDisabled: {
    backgroundColor: '#9ca3af',
    elevation: 0,
  },

  lockIcon: {
    position: 'absolute',
    top: 0,
    right: 18,
  },
});