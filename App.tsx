// import React, { useEffect, useRef, useCallback } from "react";
// import {
//   StyleSheet,
//   StatusBar,
//   Platform,
//   AppState,
//   AppStateStatus,
// } from "react-native";
// import { GestureHandlerRootView } from "react-native-gesture-handler";
// import {
//   NavigationContainer,
//   NavigationContainerRef,
// } from "@react-navigation/native";
// import Toast from "react-native-toast-message";
// import { LogLevel, OneSignal } from "react-native-onesignal";
// import AsyncStorage from "@react-native-async-storage/async-storage";
// import { StripeProvider } from "@stripe/stripe-react-native";
// // import { STRIPE_PUBLISHABLE_KEY } from '@env';

// import AppNavigator from "./navigation/AppNavigator";
// import CallOverlay from "./screens/CallOverlay";
// import { useEchoCallListener } from "./useCallManagerRN";

// const ONESIGNAL_APP_ID = "79041c59-5506-4e56-9de4-8a6619f85e1d";
// const PENDING_ASAP_NOTIFICATION_KEY = "@pending_asap_notification";
// const TARGET_ROUTE_NAME = "StaffShifts";

// export let navigationRef: NavigationContainerRef<any> | null = null;

// export default function App() {
//   const STRIPE_PUBLISHABLE_KEY =
//     "pk_test_51TBYBwDb535HMVUZHtQiPJGDYYZex0gIGvFWtuKR9FRage5WxqqzkLDvKBUpq4MfPkWhgDDM7z3WZrURpwWFBkbo005rxvV6q9";
//   useEchoCallListener();
//   const userTypeRef = useRef<string | null>(null);

//   const clickHandlerRef = useRef<any>(null);
//   const foregroundHandlerRef = useRef<any>(null);

//   // Guards against multiple concurrent flush loops running at once.
//   const flushInFlightRef = useRef(false);

//   // ─── Load user type and request location if needed ───
//   useEffect(() => {
//     const loadUserTypeAndRequestPermission = async () => {
//       try {
//         const stored = await AsyncStorage.getItem("@user_type");
//         userTypeRef.current = stored;

//         if (stored === "staff" || stored === "contractor") {
//           requestBackgroundLocationPermission();
//         }
//       } catch (err) {
//         console.warn("Error loading user type:", err);
//       }
//     };

//     loadUserTypeAndRequestPermission();
//   }, []);

//   // ==================== Prominent Disclosure + Location Permission ====================
//   const requestBackgroundLocationPermission = async () => {
//     const userType = userTypeRef.current;
//     if (!userType) return;
//   };

//   const flushPendingNotification = useCallback(async () => {
//     if (flushInFlightRef.current) return;
//     flushInFlightRef.current = true;

//     try {
//       const maxAttempts = 20; // ~10s total worst case (20 * 500ms)

//       for (let attempt = 0; attempt < maxAttempts; attempt++) {
//         const pending = await AsyncStorage.getItem(
//           PENDING_ASAP_NOTIFICATION_KEY,
//         );
//         if (!pending) return; // nothing waiting — done

//         if (navigationRef?.isReady()) {
//           let notificationJob: any = null;
//           try {
//             notificationJob = JSON.parse(pending);
//           } catch (e) {
//             console.log("[Notification] Corrupt pending payload, dropping", e);
//             await AsyncStorage.removeItem(PENDING_ASAP_NOTIFICATION_KEY);
//             return;
//           }

//           navigationRef.navigate(TARGET_ROUTE_NAME, { notificationJob });

//           // Give the navigator a beat to settle, then confirm the
//           // navigation actually stuck (an auth/splash flow finishing at
//           // the same moment can reset it right back).
//           await new Promise((resolve) => setTimeout(resolve, 400));
//           const current = navigationRef?.getCurrentRoute?.();

//           if (current?.name === TARGET_ROUTE_NAME) {
//             await AsyncStorage.removeItem(PENDING_ASAP_NOTIFICATION_KEY);
//             return;
//           }
//           // Otherwise fall through and retry — something else took over
//           // the navigator (splash → main reset, auth redirect, etc).
//         }

//         await new Promise((resolve) => setTimeout(resolve, 500));
//       }

//       console.log(
//         "[Notification] Gave up delivering pending notification after retries",
//       );
//     } catch (e) {
//       console.log("[Notification] flushPendingNotification error:", e);
//     } finally {
//       flushInFlightRef.current = false;
//     }
//   }, []);

//   // ─── OneSignal Setup ───
//   useEffect(() => {
//     const initOneSignal = async () => {
//       OneSignal.Debug.setLogLevel(LogLevel.None);
//       OneSignal.initialize(ONESIGNAL_APP_ID);
//       OneSignal.Notifications.requestPermission(true);

//       // Click handler — fires for foreground taps, background taps, AND
//       // taps that launch the app from a killed state.
//       const handleClick = (event: any) => {
//         const notif = event?.notification ?? null;
//         if (notif) handleNotificationOpen(notif);
//       };

//       clickHandlerRef.current = handleClick;
//       OneSignal.Notifications.addEventListener("click", handleClick);

//       // Foreground handler
//       const handleForeground = (event: any) => {
//         if (userTypeRef.current === "customer") {
//           event.preventDefault();
//           return;
//         }
//         const notif = event?.getNotification?.();
//         notif?.display();
//       };

//       foregroundHandlerRef.current = handleForeground;
//       OneSignal.Notifications.addEventListener(
//         "foregroundWillDisplay",
//         handleForeground,
//       );
//     };

//     initOneSignal();

//     return () => {
//       if (clickHandlerRef.current)
//         OneSignal.Notifications.removeEventListener(
//           "click",
//           clickHandlerRef.current,
//         );

//       if (foregroundHandlerRef.current)
//         OneSignal.Notifications.removeEventListener(
//           "foregroundWillDisplay",
//           foregroundHandlerRef.current,
//         );
//     };
//   }, []);

//   useEffect(() => {
//     const sub = AppState.addEventListener("change", (state: AppStateStatus) => {
//       if (state === "active") {
//         flushPendingNotification();
//       }
//     });

//     const bootTimer = setTimeout(() => {
//       flushPendingNotification();
//     }, 1000);

//     return () => {
//       sub.remove();
//       clearTimeout(bootTimer);
//     };
//   }, [flushPendingNotification]);

//   // ─── Notification open handler ───
//   const handleNotificationOpen = async (notification: any) => {
//     if (!notification) return;

//     if (userTypeRef.current === "customer") {
//       console.log("[Notification] Ignored for customer");
//       return;
//     }

//     const additionalData = notification?.additionalData ?? {};
//     const pageName = additionalData?.page;

//     if (pageName !== "asap-job-list") return;

//     const rosterWrapper = additionalData?.roster ?? {};
//     const rawRoster = rosterWrapper?.roster ?? {};

//     if (!rawRoster?.id) return;

//     const notificationJob = {
//       additionalData: {
//         roster: {
//           roster: { ...rawRoster },
//           distance: rosterWrapper.distance ?? null,
//         },
//       },
//       roster: { roster: { ...rawRoster } },
//       distance: rosterWrapper.distance ?? null,
//     };

//     // Always persist first, then let flushPendingNotification own the
//     // actual navigation (with retry+verify). We deliberately do NOT try to
//     // navigate directly here even if navigationRef looks "ready" — that
//     // direct-navigate-if-ready shortcut was the source of the race
//     // condition where a splash/auth reset silently wiped out the
//     // navigation right after it happened.
//     try {
//       await AsyncStorage.setItem(
//         PENDING_ASAP_NOTIFICATION_KEY,
//         JSON.stringify(notificationJob),
//       );
//     } catch (e) {
//       console.log("[Notification] Failed to persist pending notification:", e);
//       return;
//     }

//     flushPendingNotification();
//   };

//   return (
//     <GestureHandlerRootView style={{ flex: 1 }}>
//       <StatusBar barStyle="dark-content" backgroundColor="#fff" />

//       <StripeProvider
//         publishableKey={STRIPE_PUBLISHABLE_KEY}
//         merchantIdentifier="merchant.identifier"
//         urlScheme="your-url-scheme"
//       >
//         <NavigationContainer
//           ref={(ref) => {
//             navigationRef = ref;
//           }}
//           onReady={() => {
//             flushPendingNotification();
//           }}
//         >
//           <AppNavigator />
//         </NavigationContainer>
//       </StripeProvider>
//       <CallOverlay />
//       <Toast />
//     </GestureHandlerRootView>
//   );
// }

// const styles = StyleSheet.create({});

import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  StyleSheet,
  StatusBar,
  Platform,
  AppState,
  AppStateStatus,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
  NavigationContainer,
  NavigationContainerRef,
} from "@react-navigation/native";
import Toast from "react-native-toast-message";
import { LogLevel, OneSignal } from "react-native-onesignal";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { StripeProvider } from "@stripe/stripe-react-native";

import AppNavigator from "./navigation/AppNavigator";
import CallOverlay from "./screens/CallOverlay";
import { useEchoCallListener } from "./useCallManagerRN";
import SplashScreen from "./screens/SplashScreen"; // Import Splash Screen

const ONESIGNAL_APP_ID = "79041c59-5506-4e56-9de4-8a6619f85e1d";
const PENDING_ASAP_NOTIFICATION_KEY = "@pending_asap_notification";
const TARGET_ROUTE_NAME = "StaffShifts";
const MAIN_TABS_ROUTE_NAME = "MainTabs";

export let navigationRef: NavigationContainerRef<any> | null = null;

export default function App() {
  const STRIPE_PUBLISHABLE_KEY =
    "pk_test_51TBYBwDb535HMVUZHtQiPJGDYYZex0gIGvFWtuKR9FRage5WxqqzkLDvKBUpq4MfPkWhgDDM7z3WZrURpwWFBkbo005rxvV6q9";

  const [isSplashVisible, setIsSplashVisible] = useState(true);

  useEchoCallListener();

  const userTypeRef = useRef<string | null>(null);
  const clickHandlerRef = useRef<any>(null);
  const foregroundHandlerRef = useRef<any>(null);
  const flushInFlightRef = useRef(false);

  // Hide splash screen after some time
  useEffect(() => {
    const hideSplashTimer = setTimeout(() => {
      setIsSplashVisible(false);
    }, 2200); // Show splash for 2.2 seconds

    return () => clearTimeout(hideSplashTimer);
  }, []);

  // Load user type
  useEffect(() => {
    const loadUserTypeAndRequestPermission = async () => {
      try {
        const stored = await AsyncStorage.getItem("@user_type");
        userTypeRef.current = stored;
        if (stored === "staff" || stored === "contractor") {
          requestBackgroundLocationPermission();
        }
      } catch (err) {
        console.warn("Error loading user type:", err);
      }
    };
    loadUserTypeAndRequestPermission();
  }, []);

  const requestBackgroundLocationPermission = async () => {
    const userType = userTypeRef.current;
    if (!userType) return;
  };

  const flushPendingNotification = useCallback(async () => {
    if (flushInFlightRef.current) return;
    flushInFlightRef.current = true;
    try {
      const maxAttempts = 20;
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const pending = await AsyncStorage.getItem(
          PENDING_ASAP_NOTIFICATION_KEY,
        );
        if (!pending) return;

        if (navigationRef?.isReady()) {
          let notificationJob: any = null;
          try {
            notificationJob = JSON.parse(pending);
          } catch (e) {
            console.log("[Notification] Corrupt pending payload, dropping", e);
            await AsyncStorage.removeItem(PENDING_ASAP_NOTIFICATION_KEY);
            return;
          }

          navigationRef.navigate(MAIN_TABS_ROUTE_NAME, {
            screen: TARGET_ROUTE_NAME,
            params: { notificationJob },
          });
          await new Promise((resolve) => setTimeout(resolve, 400));

          const current = navigationRef?.getCurrentRoute?.();
          const currentParams = current?.params as
            | { screen?: string }
            | undefined;
          const isOnStaffShifts =
            current?.name === TARGET_ROUTE_NAME ||
            (current?.name === MAIN_TABS_ROUTE_NAME &&
              currentParams?.screen === TARGET_ROUTE_NAME);

          if (isOnStaffShifts) {
            await AsyncStorage.removeItem(PENDING_ASAP_NOTIFICATION_KEY);
            return;
          }
        }
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
      console.log(
        "[Notification] Gave up delivering pending notification after retries",
      );
    } catch (e) {
      console.log("[Notification] flushPendingNotification error:", e);
    } finally {
      flushInFlightRef.current = false;
    }
  }, []);

  // OneSignal Setup
  useEffect(() => {
    const initOneSignal = async () => {
      OneSignal.Debug.setLogLevel(LogLevel.None);
      OneSignal.initialize(ONESIGNAL_APP_ID);
      OneSignal.Notifications.requestPermission(true);

      const handleClick = (event: any) => {
        const notif = event?.notification ?? null;
        if (notif) handleNotificationOpen(notif);
      };
      clickHandlerRef.current = handleClick;
      OneSignal.Notifications.addEventListener("click", handleClick);

      const handleForeground = (event: any) => {
        if (userTypeRef.current === "customer") {
          event.preventDefault();
          return;
        }
        const notif = event?.getNotification?.();
        notif?.display();
      };
      foregroundHandlerRef.current = handleForeground;
      OneSignal.Notifications.addEventListener(
        "foregroundWillDisplay",
        handleForeground,
      );
    };

    initOneSignal();

    return () => {
      if (clickHandlerRef.current) {
        OneSignal.Notifications.removeEventListener(
          "click",
          clickHandlerRef.current,
        );
      }
      if (foregroundHandlerRef.current) {
        OneSignal.Notifications.removeEventListener(
          "foregroundWillDisplay",
          foregroundHandlerRef.current,
        );
      }
    };
  }, []);

  // AppState listener + boot flush
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state: AppStateStatus) => {
      if (state === "active") {
        flushPendingNotification();
      }
    });

    const bootTimer = setTimeout(() => {
      flushPendingNotification();
    }, 1000);

    return () => {
      sub.remove();
      clearTimeout(bootTimer);
    };
  }, [flushPendingNotification]);

  const handleNotificationOpen = async (notification: any) => {
    if (!notification) return;
    if (userTypeRef.current === "customer") {
      console.log("[Notification] Ignored for customer");
      return;
    }

    const additionalData = notification?.additionalData ?? {};
    const pageName = additionalData?.page;
    if (pageName !== "asap-job-list") return;

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

    try {
      await AsyncStorage.setItem(
        PENDING_ASAP_NOTIFICATION_KEY,
        JSON.stringify(notificationJob),
      );
    } catch (e) {
      console.log("[Notification] Failed to persist pending notification:", e);
      return;
    }

    flushPendingNotification();
  };

  // Show Splash Screen
  if (isSplashVisible) {
    return <SplashScreen />;
  }

  // Main App
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <StripeProvider
        publishableKey={STRIPE_PUBLISHABLE_KEY}
        merchantIdentifier="merchant.identifier"
        urlScheme="your-url-scheme"
      >
        <NavigationContainer
          ref={(ref) => {
            navigationRef = ref;
          }}
          onReady={() => {
            flushPendingNotification();
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
