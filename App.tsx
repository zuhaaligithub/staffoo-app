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

export let navigationRef: NavigationContainerRef<any> | null = null;

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

  useEffect(() => {
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const tryUpdateLocation = async () => {
      if (cancelled) return;

      const uid = await AsyncStorage.getItem("@user_id");
      const token = await AsyncStorage.getItem("@auth_token");

      // Not logged in yet → retry in 2 seconds
      if (!uid || !token) {
        retryTimer = setTimeout(tryUpdateLocation, 2000);
        return;
      }

      // Logged in → update once, then stop
      console.log("📍 Updating coordinates once after login...");
      await updateCoordinatesWithGoogle(uid);
    };

    tryUpdateLocation();

    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
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
              "📍 Sending Coordinates from app.tsx page:",
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

  // NOTE: this function only NAVIGATES to the screen that owns the pending
  // notification — it deliberately does NOT read-then-remove the
  // AsyncStorage key itself. StaffShifts.checkPendingNotification is the
  // single, module-lock-protected consumer of that key (see StaffShifts.tsx
  // — globalIsCheckingPending). If this function also removed the key here,
  // there'd be two different places racing to consume the same payload,
  // which is exactly the kind of race that caused notifications to
  // sometimes open a second, empty bottom sheet.
  //
  // It ALSO calls notifyPendingNotificationAvailable() (see
  // utils/notificationBus.ts). This is needed because navigate() only
  // produces a *focus* event when the target tab isn't already the active
  // one — if the user is already sitting on the Available/Accepted Jobs
  // tab when a notification is tapped, navigate() is a no-op and nothing
  // would otherwise tell that already-mounted screen to re-check
  // AsyncStorage. The bus directly wakes it up regardless of focus state.
  const flushPendingNotification = useCallback(async () => {
    if (flushInFlightRef.current) return;
    flushInFlightRef.current = true;

    try {
      const pending = await AsyncStorage.getItem(PENDING_ASAP_NOTIFICATION_KEY);
      if (!pending) return;

      // Logged-out guard: a notification tap (or a stale one queued from
      // before the user logged out) should never bounce someone into the
      // auth-only Available Jobs screen. If there's no auth token, this is
      // the single funnel point that actually navigates, so checking here
      // covers both a live tap and a boot/foreground re-flush. The pending
      // payload is dropped too, so nothing stale fires again after they do
      // log back in.
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

    // Read fresh from storage rather than trusting userTypeRef — that ref
    // is only ever set once, at App.tsx's first mount, and App.tsx never
    // remounts across a logout/login (navigation.reset only swaps the
    // navigator's screens). So if this device was ever logged in as a
    // customer earlier in the same app session, userTypeRef.current stays
    // stuck on "customer" forever after, silently dropping every
    // notification for whoever's actually logged in now — this one read
    // avoids that entire class of staleness bug.
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
