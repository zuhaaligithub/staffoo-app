import React, { useState, useCallback } from 'react';
import { View, TouchableOpacity, StyleSheet, Alert, Text } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import {
  Home,
  FileText,
  Plus,
  MessageCircle,
  User,
  Calendar,
  Lock,
} from 'lucide-react-native';
import { getUserProfile } from '../services/authApi';

type Props = {
  navigation: any;
  activeTab?: string;
};

export default function BottomTab({ navigation, activeTab = 'Home' }: Props) {
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

            navigation.reset({
              index: 0,
              routes: [{ name: 'Login' }],
            });

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

            if (cached) {
              userData = JSON.parse(cached);
            }
          }

          if (userData) {
            setUserType(userData.user_type ?? null);
            setIsActive(userData.is_active === true);
          }
        } catch (err) {
          await AsyncStorage.multiRemove(['@user_id', '@auth_token', 'user']);
        } finally {
          setLoading(false);
        }
      };

      loadUserData();
    }, [navigation]),
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
          {
            text: 'Go to Profile',
            onPress: () => navigation.navigate('Profile'),
          },
          {
            text: 'OK',
            style: 'cancel',
          },
        ],
      );

      return;
    }

    navigation.navigate(screen);
  };

  const getIconColor = (screen: string) => {
    if (!canAccess(screen) && screen !== 'Profile') {
      return '#cbd5e1';
    }

    return activeTab === screen ? '#001F3F' : '#64748b';
  };

  const getLabelStyle = (screen: string) => {
    return [
      styles.tabLabel,
      activeTab === screen && styles.activeLabel,
      !canAccess(screen) && screen !== 'Profile' && styles.disabledLabel,
    ];
  };

  const renderTab = (screen: string, label: string, Icon: any) => (
    <TouchableOpacity
      key={screen}
      style={styles.tabItem}
      onPress={() => handlePress(screen)}
      disabled={!canAccess(screen)}
      activeOpacity={0.8}
    >
      <View
        style={[
          styles.iconWrapper,
          activeTab === screen && styles.activeIconWrapper,
        ]}
      >
        <Icon size={22} color={getIconColor(screen)} />

        {!canAccess(screen) && screen !== 'Profile' && (
          <Lock size={11} color="#ef4444" style={styles.lockIcon} />
        )}
      </View>

      <Text style={getLabelStyle(screen)}>{label}</Text>
    </TouchableOpacity>
  );

  if (loading) {
    return <View style={styles.bottomTab} />;
  }

  return (
    <View style={styles.wrapper}>
      <View style={styles.bottomTab}>
        {renderTab('Home', 'Home', Home)}

        {renderTab('Applications', 'Applications', FileText)}

        {userType === 'customer' && (
          <TouchableOpacity
            style={[styles.tabAdd, !isFullyAccessible && styles.tabAddDisabled]}
            onPress={() => handlePress('CreateJob')}
            disabled={!isFullyAccessible}
            activeOpacity={0.9}
          >
            <Plus size={30} color="#fff" strokeWidth={2.8} />
          </TouchableOpacity>
        )}

        {(userType === 'staff' || userType === 'contractor') &&
          renderTab('StaffShifts', 'Shifts', Calendar)}

        {renderTab('Messages', 'Messages', MessageCircle)}

        {renderTab('Profile', 'Profile', User)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: 'transparent',
    paddingBottom: 4,
  },

  bottomTab: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',

    height: 65,

    marginHorizontal: 10,
    borderRadius: 26,

    backgroundColor: '#ffffff',

    borderWidth: 1,
    borderColor: '#e2e8f0',

    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.08,
    shadowRadius: 12,

    elevation: 10,
  },

  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 58,
  },

  iconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,

    justifyContent: 'center',
    alignItems: 'center',

    position: 'relative',
  },

  activeIconWrapper: {
    backgroundColor: '#eef2ff',
  },

  tabLabel: {
    marginTop: 0,
    fontSize: 10,
    color: '#64748b',
    fontWeight: '500',
  },

  activeLabel: {
    color: '#001F3F',
    fontWeight: '700',
  },

  disabledLabel: {
    color: '#cbd5e1',
  },

  lockIcon: {
    position: 'absolute',
    top: 5,
    right: 4,
  },

  tabAdd: {
    width: 60,
    height: 60,
    borderRadius: 30,

    backgroundColor: '#001F3F',

    justifyContent: 'center',
    alignItems: 'center',

  

    shadowColor: '#001F3F',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.28,
    shadowRadius: 10,

    elevation: 12,
  },

  tabAddDisabled: {
    backgroundColor: '#94a3b8',
    shadowOpacity: 0,
    elevation: 0,
  },
});
