




// import React, { useEffect, useRef, useState } from 'react';
// import { StyleSheet, StatusBar } from 'react-native';
// import { GestureHandlerRootView } from 'react-native-gesture-handler';
// import {
//   NavigationContainer,
//   NavigationContainerRef,
// } from '@react-navigation/native';
// import Toast from 'react-native-toast-message';
// import { LogLevel, OneSignal } from 'react-native-onesignal';
// import AsyncStorage from '@react-native-async-storage/async-storage';


// import AppNavigator from './navigation/AppNavigator';

// // const ONESIGNAL_APP_ID = "940cf8ed-4206-43a0-b542-cb93cc11e58e";
// const ONESIGNAL_APP_ID = "79041c59-5506-4e56-9de4-8a6619f85e1d";
// const PENDING_ASAP_NOTIFICATION_KEY = '@pending_asap_notification';

// export let navigationRef: NavigationContainerRef<any> | null = null;

// export default function App() {

//   const userTypeRef = useRef<string | null>(null);

//   const clickHandlerRef = useRef<any>(null);
//   const foregroundHandlerRef = useRef<any>(null);

//   // Load user type
//   useEffect(() => {
//     const loadUserType = async () => {
//       const stored = await AsyncStorage.getItem('@user_type');
//       userTypeRef.current = stored;
//     };

//     loadUserType();
//   }, []);

//   // ─── Notification Navigation ───
//   const handleNotificationOpen = async (notification: any) => {

//     if (!notification) return;

//     if (userTypeRef.current === 'customer') {
//       console.log('[Notification] Ignored for customer');
//       return;
//     }

//     const additionalData = notification?.additionalData ?? {};
//     const pageName = additionalData?.page;

//     if (pageName !== 'asap-job-list') return;

//     const rosterWrapper = additionalData?.roster ?? {};
//     const rawRoster = rosterWrapper?.roster ?? {};

//     if (!rawRoster?.id) return;

//     const notificationJob = {
//       additionalData: {
//         roster: {
//           roster: { ...rawRoster },
//           distance: rosterWrapper.distance ?? null,
//           radius: rosterWrapper.radius ?? null,
//         },
//       },
//       roster: {
//         roster: { ...rawRoster },
//       },
//       distance: rosterWrapper.distance ?? null,
//     };

//     if (navigationRef?.isReady()) {
//       navigationRef.navigate('StaffShifts', { notificationJob });
//     } else {
//       await AsyncStorage.setItem(
//         PENDING_ASAP_NOTIFICATION_KEY,
//         JSON.stringify(notificationJob)
//       );
//     }
//   };

//   // ─── OneSignal Setup ───
//   useEffect(() => {

//     const init = async () => {

//       OneSignal.Debug.setLogLevel(LogLevel.None);
//       OneSignal.initialize(ONESIGNAL_APP_ID);
//       OneSignal.Notifications.requestPermission(true);

//       // click handler
//       const handleClick = (event: any) => {
//         const notif = event?.notification ?? null;
//         if (notif) handleNotificationOpen(notif);
//       };

//       clickHandlerRef.current = handleClick;
//       OneSignal.Notifications.addEventListener('click', handleClick);

//       // foreground
//       const handleForeground = (event: any) => {
//         if (userTypeRef.current === 'customer') {
//           event.preventDefault();
//           return;
//         }

//         const notif = event?.getNotification?.();
//         notif?.display();
//       };

//       foregroundHandlerRef.current = handleForeground;

//       OneSignal.Notifications.addEventListener(
//         'foregroundWillDisplay',
//         handleForeground
//       );
//     };

//     init();

//     return () => {

//       if (clickHandlerRef.current)
//         OneSignal.Notifications.removeEventListener(
//           'click',
//           clickHandlerRef.current
//         );

//       if (foregroundHandlerRef.current)
//         OneSignal.Notifications.removeEventListener(
//           'foregroundWillDisplay',
//           foregroundHandlerRef.current
//         );
//     };

//   }, []);

//   return (
  
//       <GestureHandlerRootView style={{ flex: 1 }}>
//         <StatusBar barStyle="dark-content" backgroundColor="#fff" />

//         <NavigationContainer
//           ref={(ref) => {
//             navigationRef = ref;
//           }}
//         >
//           <AppNavigator />
//         </NavigationContainer>

//         <Toast />
//       </GestureHandlerRootView>
   
//   );
// }

// const styles = StyleSheet.create({});






import React, { useEffect, useRef } from 'react';
import { StyleSheet, StatusBar, Alert, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  NavigationContainer,
  NavigationContainerRef,
} from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import { LogLevel, OneSignal } from 'react-native-onesignal';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PERMISSIONS, request, RESULTS } from 'react-native-permissions';

import AppNavigator from './navigation/AppNavigator';

const ONESIGNAL_APP_ID = "79041c59-5506-4e56-9de4-8a6619f85e1d";
const PENDING_ASAP_NOTIFICATION_KEY = '@pending_asap_notification';

export let navigationRef: NavigationContainerRef<any> | null = null;

export default function App() {
  const userTypeRef = useRef<string | null>(null);

  const clickHandlerRef = useRef<any>(null);
  const foregroundHandlerRef = useRef<any>(null);

  // ─── Load user type and request location if needed ───
  useEffect(() => {
    const loadUserTypeAndRequestPermission = async () => {
      try {
        const stored = await AsyncStorage.getItem('@user_type');
        userTypeRef.current = stored;

        if (stored === 'staff' || stored === 'contractor') {
          requestBackgroundLocationPermission();
        }
      } catch (err) {
        console.warn('Error loading user type:', err);
      }
    };

    loadUserTypeAndRequestPermission();
  }, []);

  // ==================== Prominent Disclosure + Location Permission ====================
  const requestBackgroundLocationPermission = async () => {
    const userType = userTypeRef.current;
    if (!userType) return;

    Alert.alert(
      "Background Location Access Required",
      "Staffoo collects location data to send you real-time notifications about nearby 'ASAP' jobs and shifts within your preferred radius.\n\n" +
      "This works even when the app is in the background or closed.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Continue",
          onPress: async () => {
            try {
              if (Platform.OS === 'android') {
                // Request foreground first
                const foreground = await request(PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION);
                if (foreground !== RESULTS.GRANTED) {
                  console.log("❌ Foreground location denied");
                  return;
                }

                // Then request background
                const bg = await request(PERMISSIONS.ANDROID.ACCESS_BACKGROUND_LOCATION);
                if (bg === RESULTS.GRANTED) {
                  console.log(`✅ Background location granted for ${userType}`);
                } else {
                  console.log("❌ Background location denied");
                }

              } else {
                // iOS: WhenInUse first
                const whenInUse = await request(PERMISSIONS.IOS.LOCATION_WHEN_IN_USE);
                if (whenInUse !== RESULTS.GRANTED) {
                  console.log("❌ iOS WhenInUse location denied");
                  return;
                }

                // Then Always
                const always = await request(PERMISSIONS.IOS.LOCATION_ALWAYS);
                if (always === RESULTS.GRANTED) {
                  console.log(`✅ iOS Background location granted for ${userType}`);
                } else {
                  console.log("❌ iOS Background location denied");
                }
              }
            } catch (err) {
              console.warn("Permission request error:", err);
            }
          },
        },
      ]
    );
  };

  // ─── OneSignal Setup ───
  useEffect(() => {
    const initOneSignal = async () => {
      OneSignal.Debug.setLogLevel(LogLevel.None);
      OneSignal.initialize(ONESIGNAL_APP_ID);
      OneSignal.Notifications.requestPermission(true);

      // Click handler
      const handleClick = (event: any) => {
        const notif = event?.notification ?? null;
        if (notif) handleNotificationOpen(notif);
      };

      clickHandlerRef.current = handleClick;
      OneSignal.Notifications.addEventListener('click', handleClick);

      // Foreground handler
      const handleForeground = (event: any) => {
        if (userTypeRef.current === 'customer') {
          event.preventDefault();
          return;
        }
        const notif = event?.getNotification?.();
        notif?.display();
      };

      foregroundHandlerRef.current = handleForeground;
      OneSignal.Notifications.addEventListener('foregroundWillDisplay', handleForeground);
    };

    initOneSignal();

    return () => {
      if (clickHandlerRef.current)
        OneSignal.Notifications.removeEventListener('click', clickHandlerRef.current);

      if (foregroundHandlerRef.current)
        OneSignal.Notifications.removeEventListener('foregroundWillDisplay', foregroundHandlerRef.current);
    };
  }, []);

  // ─── Notification open handler ───
  const handleNotificationOpen = async (notification: any) => {
    if (!notification) return;

    if (userTypeRef.current === 'customer') {
      console.log('[Notification] Ignored for customer');
      return;
    }

    const additionalData = notification?.additionalData ?? {};
    const pageName = additionalData?.page;

    if (pageName !== 'asap-job-list') return;

    const rosterWrapper = additionalData?.roster ?? {};
    const rawRoster = rosterWrapper?.roster ?? {};

    if (!rawRoster?.id) return;

    const notificationJob = {
      additionalData: {
        roster: { roster: { ...rawRoster }, distance: rosterWrapper.distance ?? null },
      },
      roster: { roster: { ...rawRoster } },
      distance: rosterWrapper.distance ?? null,
    };

    if (navigationRef?.isReady()) {
      navigationRef.navigate('StaffShifts', { notificationJob });
    } else {
      await AsyncStorage.setItem(PENDING_ASAP_NOTIFICATION_KEY, JSON.stringify(notificationJob));
    }
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <NavigationContainer ref={(ref) => { navigationRef = ref; }}>
        <AppNavigator />
      </NavigationContainer>

      <Toast />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({});