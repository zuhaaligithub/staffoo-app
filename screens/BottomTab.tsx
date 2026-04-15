

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
         
            await AsyncStorage.multiRemove(['@user_id', '@auth_token', 'user']);
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
    return activeTab === screen ? '#2EB1E2' : '#6b7280';
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
    backgroundColor: '#2EB1E2',

    justifyContent: 'center',
    alignItems: 'center',

    marginTop: -40,

    shadowColor: '#2EB1E2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,

    elevation: 2,
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