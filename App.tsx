// import React, { useEffect, useRef, useState, useCallback } from "react";
// import {
//   StyleSheet,
//   StatusBar,
//   AppState,
//   AppStateStatus,
//   Platform,
//   PermissionsAndroid,
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
// import Geolocation from "@react-native-community/geolocation";
// import AppNavigator from "./navigation/AppNavigator";
// import CallOverlay from "./screens/CallOverlay";
// import { useEchoCallListener } from "./useCallManagerRN";
// import SplashScreen from "./screens/SplashScreen";
// import { notifyPendingNotificationAvailable } from "./utils/notificationBus";
// import { BASE_URL } from "./services/authApi";

// export const PENDING_ASAP_NOTIFICATION_KEY = "@pending_asap_notification";

// const ONESIGNAL_APP_ID = "79041c59-5506-4e56-9de4-8a6619f85e1d";
// const TARGET_ROUTE_NAME = "StaffShifts";
// const MAIN_TABS_ROUTE_NAME = "MainTabs";

// export let navigationRef: NavigationContainerRef<any> | null = null;

// export default function App() {
//   const STRIPE_PUBLISHABLE_KEY =
//     "pk_test_51TBYBwDb535HMVUZHtQiPJGDYYZex0gIGvFWtuKR9FRage5WxqqzkLDvKBUpq4MfPkWhgDDM7z3WZrURpwWFBkbo005rxvV6q9";

//   const [isSplashVisible, setIsSplashVisible] = useState(true);
//   const flushInFlightRef = useRef(false);
//   const userTypeRef = useRef<string | null>(null);

//   useEchoCallListener();

//   // Hide splash
//   useEffect(() => {
//     const timer = setTimeout(() => setIsSplashVisible(false), 2200);
//     return () => clearTimeout(timer);
//   }, []);

//   useEffect(() => {
//     let cancelled = false;
//     let retryTimer: ReturnType<typeof setTimeout> | null = null;
//     let periodicInterval: ReturnType<typeof setInterval> | null = null;

//     const tryUpdateLocation = async () => {
//       if (cancelled) return;

//       const uid = await AsyncStorage.getItem("@user_id");
//       const token = await AsyncStorage.getItem("@auth_token");

//       // Not logged in yet → retry in 2 seconds
//       if (!uid || !token) {
//         retryTimer = setTimeout(tryUpdateLocation, 2000);
//         return;
//       }

//       // Logged in → update immediately and start a 1-minute interval
//       console.log(
//         "📍 Updating coordinates once after login and starting 1-minute updates...",
//       );
//       await updateCoordinatesWithGoogle(uid);

//       // Clear any existing interval then start periodic updates every 60s
//       if (periodicInterval) clearInterval(periodicInterval);
//       periodicInterval = setInterval(() => {
//         updateCoordinatesWithGoogle(uid).catch((e) =>
//           console.warn("Periodic coordinate update failed:", e),
//         );
//       }, 60 * 1000);

//     };

//     tryUpdateLocation();

//     return () => {
//       cancelled = true;
//       if (retryTimer) clearTimeout(retryTimer);
//       if (periodicInterval) clearInterval(periodicInterval);
//     };
//   }, []);

//   const updateCoordinatesWithGoogle = async (uid: string) => {
//     try {
//       const token = await AsyncStorage.getItem("@auth_token");

//       if (!token || !uid) {
//         console.log("❌ Missing token or user id");
//         return;
//       }

//       // Request location permission
//       let hasPermission = true;

//       if (Platform.OS === "android") {
//         const result = await PermissionsAndroid.request(
//           PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
//         );

//         hasPermission = result === PermissionsAndroid.RESULTS.GRANTED;
//       }

//       if (!hasPermission) {
//         console.log("❌ Location permission denied");
//         return;
//       }

//       // Get current location
//       Geolocation.getCurrentPosition(
//         async (position) => {
//           try {
//             const { latitude, longitude } = position.coords;

//             const payload = {
//               current_coordinates: `${latitude},${longitude}`,
//             };

//             console.log(
//               "📍 Sending Coordinates from app.tsx page:",
//               payload.current_coordinates,
//             );

//             const response = await fetch(
//               `${BASE_URL}/update-coordinates/${uid}`,
//               {
//                 method: "POST",
//                 headers: {
//                   "Content-Type": "application/json",
//                   Authorization: `Bearer ${token}`,
//                 },
//                 body: JSON.stringify(payload),
//               },
//             );

//             const data = await response.json();

//             console.log("📍 Update Coordinate Response:", data);

//             if (response.ok && data.success) {
//               console.log("✅ Coordinates updated successfully");
//             } else {
//               console.log("❌ Update failed:", data);
//             }
//           } catch (apiError) {
//             console.error("❌ API Error:", apiError);
//           }
//         },
//         (error) => {
//           console.error("❌ Geolocation Error:", error);
//         },
//         {
//           enableHighAccuracy: false,
//           timeout: 20000,
//           maximumAge: 10000,
//         },
//       );
//     } catch (error) {
//       console.error("❌ Failed to update coordinates:", error);
//     }
//   };

//   // Load user type
//   useEffect(() => {
//     const load = async () => {
//       try {
//         const stored = await AsyncStorage.getItem("@user_type");
//         userTypeRef.current = stored;
//       } catch (err) {
//         console.warn("Error loading user type:", err);
//       }
//     };
//     load();
//   }, []);

//   const flushPendingNotification = useCallback(async () => {
//     if (flushInFlightRef.current) return;
//     flushInFlightRef.current = true;

//     try {
//       const pending = await AsyncStorage.getItem(PENDING_ASAP_NOTIFICATION_KEY);
//       if (!pending) return;

//       const token = await AsyncStorage.getItem("@auth_token");
//       if (!token) {
//         await AsyncStorage.removeItem(PENDING_ASAP_NOTIFICATION_KEY);
//         Toast.show({
//           type: "info",
//           text1: "Please login first",
//           text2: "Log in to accept this job",
//         });
//         return;
//       }

//       console.log("🧭 Navigating to StaffShifts for pending notification");

//       navigationRef?.navigate(MAIN_TABS_ROUTE_NAME, {
//         screen: TARGET_ROUTE_NAME,
//       });

//       // Directly wake up any already-mounted/focused screen too — see note
//       // above. Harmless no-op if nothing is subscribed yet.
//       notifyPendingNotificationAvailable();
//     } catch (e) {
//       console.error("flush error", e);
//     } finally {
//       flushInFlightRef.current = false;
//     }
//   }, []);

//   // ─── Handle Notification ───────────────────────────────────────
//   const handleNotificationOpen = async (notification: any) => {
//     console.log(
//       "🔴 [NOTIFICATION RECEIVED]",
//       JSON.stringify(notification, null, 2),
//     );

//     if (!notification) return;

//     const currentUserType = await AsyncStorage.getItem("@user_type");
//     userTypeRef.current = currentUserType;
//     if (currentUserType === "customer") return;

//     const additionalData = notification?.additionalData ?? {};
//     if (additionalData?.page !== "asap-job-list") return;

//     const rawRoster = additionalData?.roster?.roster ?? {};
//     if (!rawRoster?.id) return;

//     const notificationJob = {
//       additionalData: { roster: { roster: { ...rawRoster } } },
//       roster: { roster: { ...rawRoster } },
//     };

//     try {
//       await AsyncStorage.setItem(
//         PENDING_ASAP_NOTIFICATION_KEY,
//         JSON.stringify(notificationJob),
//       );
//       console.log("💾 Notification saved to storage");
//       flushPendingNotification();
//     } catch (e) {
//       console.error("Failed to save notification", e);
//     }
//   };

//   // OneSignal Setup
//   useEffect(() => {
//     OneSignal.Debug.setLogLevel(LogLevel.None);
//     OneSignal.initialize(ONESIGNAL_APP_ID);
//     OneSignal.Notifications.requestPermission(true);

//     const clickHandler = (event: any) =>
//       handleNotificationOpen(event?.notification);
//     OneSignal.Notifications.addEventListener("click", clickHandler);

//     const foregroundHandler = async (event: any) => {
//       const currentUserType = await AsyncStorage.getItem("@user_type");
//       userTypeRef.current = currentUserType;
//       if (currentUserType !== "customer")
//         event?.getNotification?.()?.display?.();
//     };
//     OneSignal.Notifications.addEventListener(
//       "foregroundWillDisplay",
//       foregroundHandler,
//     );

//     return () => {
//       OneSignal.Notifications.removeEventListener("click", clickHandler);
//       OneSignal.Notifications.removeEventListener(
//         "foregroundWillDisplay",
//         foregroundHandler,
//       );
//     };
//   }, []);

//   // AppState + Boot
//   useEffect(() => {
//     const sub = AppState.addEventListener("change", (state: AppStateStatus) => {
//       if (state === "active") flushPendingNotification();
//     });

//     const bootTimer = setTimeout(flushPendingNotification, 800);

//     return () => {
//       sub.remove();
//       clearTimeout(bootTimer);
//     };
//   }, [flushPendingNotification]);

//   if (isSplashVisible) return <SplashScreen />;

//   return (
//     <GestureHandlerRootView style={{ flex: 1 }}>
//       <StatusBar barStyle="dark-content" backgroundColor="#fff" />
//       <StripeProvider publishableKey={STRIPE_PUBLISHABLE_KEY}>
//         <NavigationContainer
//           ref={(ref) => {
//             navigationRef = ref;
//           }}
//           onReady={() => {
//             console.log("Navigation Ready");
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

import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  StyleSheet,
  StatusBar,
  AppState,
  AppStateStatus,
  Platform,
  PermissionsAndroid,
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
import Geolocation from "@react-native-community/geolocation";
import AppNavigator from "./navigation/AppNavigator";
import CallOverlay from "./screens/CallOverlay";
import { useEchoCallListener } from "./useCallManagerRN";
import SplashScreen from "./screens/SplashScreen";
import { notifyPendingNotificationAvailable } from "./utils/notificationBus";
import { BASE_URL } from "./services/authApi";

export const PENDING_ASAP_NOTIFICATION_KEY = "@pending_asap_notification";

const ONESIGNAL_APP_ID = "79041c59-5506-4e56-9de4-8a6619f85e1d";
const TARGET_ROUTE_NAME = "StaffShifts";
const MAIN_TABS_ROUTE_NAME = "MainTabs";

// How often we ping the server with the logged-in user's current coordinates
const LOCATION_UPDATE_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
// How often we retry checking "is someone logged in yet" before the first update
const LOGIN_CHECK_RETRY_MS = 2 * 1000; // 2 seconds

export let navigationRef: NavigationContainerRef<any> | null = null;

// Reads the currently logged-in user's id the same way the rest of the app does
// (the "user" AsyncStorage key holds a JSON object like { id, name, ... }).
async function getLoggedInUserId(): Promise<string | null> {
  try {
    const userStr = await AsyncStorage.getItem("user");
    if (!userStr) return null;

    const user = JSON.parse(userStr);
    const id = user?.id;
    if (id === undefined || id === null || id === "") return null;

    return String(id);
  } catch (err) {
    console.warn("⚠️ Failed to parse stored user for location updates:", err);
    return null;
  }
}

export default function App() {
  const STRIPE_PUBLISHABLE_KEY =
    "pk_test_51TBYBwDb535HMVUZHtQiPJGDYYZex0gIGvFWtuKR9FRage5WxqqzkLDvKBUpq4MfPkWhgDDM7z3WZrURpwWFBkbo005rxvV6q9";

  const [isSplashVisible, setIsSplashVisible] = useState(true);
  const flushInFlightRef = useRef(false);
  const userTypeRef = useRef<string | null>(null);

  useEchoCallListener();

  // Hide splash
  useEffect(() => {
    const timer = setTimeout(() => setIsSplashVisible(false), 2200);
    return () => clearTimeout(timer);
  }, []);

  // ─── Location updates: whoever is logged in, send their id + coords, every 5 min ───
  useEffect(() => {
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let periodicInterval: ReturnType<typeof setInterval> | null = null;

    const tryUpdateLocation = async () => {
      if (cancelled) return;

      const uid = await getLoggedInUserId();
      const token = await AsyncStorage.getItem("@auth_token");

      // Not logged in yet → retry in 2 seconds
      if (!uid || !token) {
        retryTimer = setTimeout(tryUpdateLocation, LOGIN_CHECK_RETRY_MS);
        return;
      }

      // Logged in → update immediately and start a 5-minute interval
      console.log(
        `📍 Logged-in user ${uid} found — updating coordinates now and starting 5-minute updates...`,
      );
      await updateCoordinatesWithGoogle(uid);

      // Clear any existing interval then start periodic updates every 5 minutes.
      // Each tick re-reads the logged-in user id so it always stays in sync
      // with whoever is currently logged in (in case of logout/login without app restart).
      if (periodicInterval) clearInterval(periodicInterval);
      periodicInterval = setInterval(async () => {
        const currentUid = await getLoggedInUserId();
        const currentToken = await AsyncStorage.getItem("@auth_token");

        if (!currentUid || !currentToken) {
          // User logged out — stop hammering the API until someone logs back in
          if (periodicInterval) clearInterval(periodicInterval);
          periodicInterval = null;
          tryUpdateLocation();
          return;
        }

        updateCoordinatesWithGoogle(currentUid).catch((e) =>
          console.warn("Periodic coordinate update failed:", e),
        );
      }, LOCATION_UPDATE_INTERVAL_MS);
    };

    tryUpdateLocation();

    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
      if (periodicInterval) clearInterval(periodicInterval);
    };
  }, []);

  const updateCoordinatesWithGoogle = async (uid: string) => {
    try {
      const token = await AsyncStorage.getItem("@auth_token");

      if (!token || !uid) {
        console.log("❌ Missing token or user id");
        return;
      }

      // Request location permission
      let hasPermission = true;

      if (Platform.OS === "android") {
        const result = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        );

        hasPermission = result === PermissionsAndroid.RESULTS.GRANTED;
      }

      if (!hasPermission) {
        console.log("❌ Location permission denied");
        return;
      }

      // Get current location
      Geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude } = position.coords;

            const payload = {
              current_coordinates: `${latitude},${longitude}`,
            };

            console.log(
              `📍 Sending coordinates for user ${uid}:`,
              payload.current_coordinates,
            );

            const response = await fetch(
              `${BASE_URL}/update-coordinates/${uid}`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
              },
            );

            const data = await response.json();

            console.log("📍 Update Coordinate Response:", data);

            if (response.ok && data.success) {
              console.log("✅ Coordinates updated successfully");
            } else {
              console.log("❌ Update failed:", data);
            }
          } catch (apiError) {
            console.error("❌ API Error:", apiError);
          }
        },
        (error) => {
          console.error("❌ Geolocation Error:", error);
        },
        {
          enableHighAccuracy: false,
          timeout: 20000,
          maximumAge: 10000,
        },
      );
    } catch (error) {
      console.error("❌ Failed to update coordinates:", error);
    }
  };

  // Load user type
  useEffect(() => {
    const load = async () => {
      try {
        const stored = await AsyncStorage.getItem("@user_type");
        userTypeRef.current = stored;
      } catch (err) {
        console.warn("Error loading user type:", err);
      }
    };
    load();
  }, []);

  const flushPendingNotification = useCallback(async () => {
    if (flushInFlightRef.current) return;
    flushInFlightRef.current = true;

    try {
      const pending = await AsyncStorage.getItem(PENDING_ASAP_NOTIFICATION_KEY);
      if (!pending) return;

      const token = await AsyncStorage.getItem("@auth_token");
      if (!token) {
        await AsyncStorage.removeItem(PENDING_ASAP_NOTIFICATION_KEY);
        Toast.show({
          type: "info",
          text1: "Please login first",
          text2: "Log in to accept this job",
        });
        return;
      }

      console.log("🧭 Navigating to StaffShifts for pending notification");

      navigationRef?.navigate(MAIN_TABS_ROUTE_NAME, {
        screen: TARGET_ROUTE_NAME,
      });

      // Directly wake up any already-mounted/focused screen too — see note
      // above. Harmless no-op if nothing is subscribed yet.
      notifyPendingNotificationAvailable();
    } catch (e) {
      console.error("flush error", e);
    } finally {
      flushInFlightRef.current = false;
    }
  }, []);

  // ─── Handle Notification ───────────────────────────────────────
  const handleNotificationOpen = async (notification: any) => {
    console.log(
      "🔴 [NOTIFICATION RECEIVED]",
      JSON.stringify(notification, null, 2),
    );

    if (!notification) return;

    const currentUserType = await AsyncStorage.getItem("@user_type");
    userTypeRef.current = currentUserType;
    if (currentUserType === "customer") return;

    const additionalData = notification?.additionalData ?? {};
    if (additionalData?.page !== "asap-job-list") return;

    const rawRoster = additionalData?.roster?.roster ?? {};
    if (!rawRoster?.id) return;

    const notificationJob = {
      additionalData: { roster: { roster: { ...rawRoster } } },
      roster: { roster: { ...rawRoster } },
    };

    try {
      await AsyncStorage.setItem(
        PENDING_ASAP_NOTIFICATION_KEY,
        JSON.stringify(notificationJob),
      );
      console.log("💾 Notification saved to storage");
      flushPendingNotification();
    } catch (e) {
      console.error("Failed to save notification", e);
    }
  };

  // OneSignal Setup
  useEffect(() => {
    OneSignal.Debug.setLogLevel(LogLevel.None);
    OneSignal.initialize(ONESIGNAL_APP_ID);
    OneSignal.Notifications.requestPermission(true);

    const clickHandler = (event: any) =>
      handleNotificationOpen(event?.notification);
    OneSignal.Notifications.addEventListener("click", clickHandler);

    const foregroundHandler = async (event: any) => {
      const currentUserType = await AsyncStorage.getItem("@user_type");
      userTypeRef.current = currentUserType;
      if (currentUserType !== "customer")
        event?.getNotification?.()?.display?.();
    };
    OneSignal.Notifications.addEventListener(
      "foregroundWillDisplay",
      foregroundHandler,
    );

    return () => {
      OneSignal.Notifications.removeEventListener("click", clickHandler);
      OneSignal.Notifications.removeEventListener(
        "foregroundWillDisplay",
        foregroundHandler,
      );
    };
  }, []);

  // AppState + Boot
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state: AppStateStatus) => {
      if (state === "active") flushPendingNotification();
    });

    const bootTimer = setTimeout(flushPendingNotification, 800);

    return () => {
      sub.remove();
      clearTimeout(bootTimer);
    };
  }, [flushPendingNotification]);

  if (isSplashVisible) return <SplashScreen />;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <StripeProvider publishableKey={STRIPE_PUBLISHABLE_KEY}>
        <NavigationContainer
          ref={(ref) => {
            navigationRef = ref;
          }}
          onReady={() => {
            console.log("Navigation Ready");
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
