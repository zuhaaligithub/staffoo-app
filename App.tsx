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
import { StripeProvider } from '@stripe/stripe-react-native';
import { STRIPE_PUBLISHABLE_KEY } from '@env';

import AppNavigator from './navigation/AppNavigator';
import CallOverlay from './screens/CallOverlay';
import { useEchoCallListener } from './useCallManagerRN';

const ONESIGNAL_APP_ID = '79041c59-5506-4e56-9de4-8a6619f85e1d';
const PENDING_ASAP_NOTIFICATION_KEY = '@pending_asap_notification';

export let navigationRef: NavigationContainerRef<any> | null = null;

export default function App() {
  useEchoCallListener();
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
      OneSignal.Notifications.addEventListener(
        'foregroundWillDisplay',
        handleForeground,
      );
    };

    initOneSignal();

    return () => {
      if (clickHandlerRef.current)
        OneSignal.Notifications.removeEventListener(
          'click',
          clickHandlerRef.current,
        );

      if (foregroundHandlerRef.current)
        OneSignal.Notifications.removeEventListener(
          'foregroundWillDisplay',
          foregroundHandlerRef.current,
        );
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
        roster: {
          roster: { ...rawRoster },
          distance: rosterWrapper.distance ?? null,
        },
      },
      roster: { roster: { ...rawRoster } },
      distance: rosterWrapper.distance ?? null,
    };

    if (navigationRef?.isReady()) {
      navigationRef.navigate('StaffShifts', { notificationJob });
    } else {
      await AsyncStorage.setItem(
        PENDING_ASAP_NOTIFICATION_KEY,
        JSON.stringify(notificationJob),
      );
    }
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <StripeProvider
        publishableKey={STRIPE_PUBLISHABLE_KEY}
        merchantIdentifier="merchant.identifier"
        urlScheme="your-url-scheme"
      >
        <NavigationContainer
          ref={ref => {
            navigationRef = ref;
          }}
        >
          <AppNavigator />
        </NavigationContainer>
      </StripeProvider>
      <CallOverlay />
      <Toast />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({});
