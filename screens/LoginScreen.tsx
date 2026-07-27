import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Image,
  ScrollView,
  useWindowDimensions,
  ActivityIndicator,
  StatusBar,
  PermissionsAndroid,
  Modal,
} from "react-native";

import { Mail, Eye, EyeOff, Lock, Check } from "lucide-react-native";
import { PERMISSIONS, request, RESULTS } from "react-native-permissions";
import CheckBox from "@react-native-community/checkbox";
import Toast from "react-native-toast-message";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BASE_URL, loginUser } from "../services/authApi";
import { OneSignal } from "react-native-onesignal";
import NetInfo from "@react-native-community/netinfo";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import LinearGradient from "react-native-linear-gradient";

const LOGO = require("../assets/staffoo.png");

const COLORS = {
  background: "#030508",
  surface: "#07111A",
  card: "#0D1421",

  cardBorder: "rgba(98,97,97,0.35)",

  primary: "#00A99D",
  primaryDark: "#007E76",
  primaryGlow: "rgba(0,169,157,0.25)",

  text: "#FFFFFF",
  textSecondary: "#B7C4D4",
  textMuted: "#738295",

  success: "#34C88A",
  danger: "#F87171",

  heroBg1: "#0D1F2D",
  heroBg2: "#061014",
};

type Props = { navigation: any };

export const sendNotificationTokenToServer = async (
  playerId: string,
  userId?: string,
): Promise<void> => {
  console.log("📤 sendNotificationTokenToServer called");
  try {
    const token = await AsyncStorage.getItem("@auth_token");
    if (!token) return;

    const payload: any = { notification_token: playerId };
    if (userId) payload.id = userId;
    console.log("📦 Payload being sent:", payload);
    console.log("📦 Payload JSON:", JSON.stringify(payload, null, 2));
    const response = await fetch(`${BASE_URL}/store-notification-token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) throw new Error(`Server error ${response.status}`);
    console.log("✅ Token stored on server successfully");
  } catch (error) {
    console.error("❌ Failed to sync OneSignal token:", error);
  }
};

export default function LoginScreen({ navigation }: Props) {
  const { width } = useWindowDimensions();
  const [navigationLoading, setNavigationLoading] = useState(false);
  const isTablet = width >= 768;
  const scale = (size: number) => (width / 375) * size;
  const [forgotLoading, setForgotLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const hasRequestedLocation = useRef(false);
  const [showAccountTypeModal, setShowAccountTypeModal] = useState(false);
  const [googleCredential, setGoogleCredential] = useState("");
  const [selectedAccountType, setSelectedAccountType] = useState<
    "customer" | "staff" | "contractor" | null
  >(null);

  useEffect(() => {
    (async () => {
      try {
        const savedEmail = await AsyncStorage.getItem("@saved_email");
        const savedRemember = await AsyncStorage.getItem("@remember_me");
        if (savedEmail && savedRemember === "true") {
          setEmail(savedEmail);
          setRememberMe(true);
        }
      } catch (e) {
        console.warn("Could not restore saved credentials:", e);
      }
    })();
  }, []);

  useEffect(() => {
    if (Platform.OS === "android") {
      GoogleSignin.configure({
        webClientId:
          "224693258602-a6q3lng2a3c8kte6p0llbu9iiduoiqtq.apps.googleusercontent.com",
        offlineAccess: true,
        forceCodeForRefreshToken: true,
      });
    }
  }, []);

  // Location permission is requested once, on mount — NOT tied to a
  // TextInput's onFocus. Requesting it on focus was popping a native
  // system dialog the instant the keyboard opened, which steals focus
  // and immediately closes the keyboard again (the "shows then hides"
  // flicker). A short delay lets the screen finish its entrance
  // animation first so the dialog doesn't appear mid-transition.
  useEffect(() => {
    const timer = setTimeout(() => {
      requestLocationPermission();
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  // const requestLocationPermission = async () => {
  //   if (Platform.OS === "android") {
  //     const granted = await PermissionsAndroid.request(
  //       PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
  //       {
  //         title: "Location Permission",
  //         message:
  //           "This app needs your location for security and shift tracking.",
  //         buttonNeutral: "Ask Me Later",
  //         buttonNegative: "Cancel",
  //         buttonPositive: "OK",
  //       },
  //     );
  //     return granted === PermissionsAndroid.RESULTS.GRANTED;
  //   }

  //   const result = await request(PERMISSIONS.IOS.LOCATION_WHEN_IN_USE);
  //   return result === RESULTS.GRANTED;
  // };

  const requestLocationPermission = async () => {
    if (hasRequestedLocation.current) return true;
    hasRequestedLocation.current = true;

    const message = Platform.select({
      android:
        "Staffoo collects location data to find and display available shifts near you, " +
        "track your attendance during shifts, and verify your presence at job sites. " +
        "This data is collected even when the app is closed or not in use.",
      ios:
        "Staffoo collects location data to find and display available shifts near you, " +
        "track your attendance during shifts, and verify your presence at job sites.",
    });

    if (Platform.OS === "android") {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: "Staffoo Needs Location Access",
          message: message!,
          buttonNeutral: "Ask Me Later",
          buttonNegative: "Deny",
          buttonPositive: "Allow",
        },
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } else {
      // iOS
      const result = await request(PERMISSIONS.IOS.LOCATION_WHEN_IN_USE);
      // If you need background location too, request BACKGROUND too
      return result === RESULTS.GRANTED;
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);

      const netState = await NetInfo.fetch();
      if (!netState.isConnected) {
        throw new Error("No internet connection. Please check your network.");
      }

      console.log("🌐 Network connected. BASE_URL:", BASE_URL);

      await GoogleSignin.hasPlayServices({
        showPlayServicesUpdateDialog: true,
      });
      await GoogleSignin.signOut().catch(() => {});

      const userInfo = await GoogleSignin.signIn();

      if (userInfo.type !== "success" || !userInfo.data) {
        throw new Error("Google sign-in failed");
      }

      const tokens = await GoogleSignin.getTokens();
      const credential = tokens.accessToken;

      if (!credential) {
        throw new Error("Failed to get Google credential");
      }

      console.log("✅ Google credential received");
      setGoogleCredential(credential);

      console.log("📤 Checking user with backend...");

      const response = await fetch(`${BASE_URL}/auth/google/callback`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ credential }),
      });

      console.log("📥 Response Status:", response.status);

      let data: any = {};
      try {
        data = await response.json();
      } catch (e) {
        console.log("Could not parse JSON response");
      }

      console.log("📥 Response Data:", JSON.stringify(data, null, 2));

      // === SUCCESS: Existing User ===
      if (response.ok && data.success && data.user && data.token) {
        const user = data.user;

        await AsyncStorage.multiSet([
          ["@auth_token", data.token],
          ["user", JSON.stringify(user)],
          ["@user_id", String(user.id)],
          ["@user_type", user.user_type],
        ]);

        try {
          const playerId = await OneSignal.User.pushSubscription.getIdAsync();
          if (playerId) {
            await sendNotificationTokenToServer(playerId, String(user.id));
            OneSignal.login(String(user.id));
          }
        } catch (e) {
          console.log("OneSignal Error:", e);
        }

        Toast.show({
          type: "success",
          text1: "Login Successful",
          text2: `Welcome ${user.name || user.email}`,
          position: "bottom",
        });

        setTimeout(() => redirectAfterLogin(user), 500);
        return;
      }

      // === NEW USER: Show Account Type Modal ===
      if (
        data.needs_account_type ||
        response.status === 401 ||
        response.status === 404 ||
        response.status === 422 ||
        data.message?.toLowerCase().includes("user not found") ||
        data.message?.toLowerCase().includes("not found")
      ) {
        console.log("🆕 New user detected → Showing account type modal");
        setShowAccountTypeModal(true);
        return;
      }

      // === Other Errors ===
      throw new Error(data.message || "Google login failed");
    } catch (error: any) {
      console.error("❌ Google Login Error:", error.message);

      Toast.show({
        type: "error",
        text1: "Google Login Failed",
        text2: error.message || "Please try again",
        position: "bottom",
      });
    } finally {
      setLoading(false);
    }
  };
  const completeGoogleLogin = async () => {
    if (!selectedAccountType) {
      return Toast.show({
        type: "error",
        text1: "Please select account type",
        position: "bottom",
      });
    }

    try {
      setLoading(true);

      const netState = await NetInfo.fetch();
      if (!netState.isConnected) {
        throw new Error("No internet connection.");
      }

      const payload = {
        credential: googleCredential,
        user_type: selectedAccountType,
      };

      console.log(
        "📤 Creating account with payload:",
        JSON.stringify(payload, null, 2),
      );

      const response = await fetch(`${BASE_URL}/auth/google/callback`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });

      console.log("📥 Create Account Response Status:", response.status);

      const data = await response.json().catch(() => ({}));
      console.log("📥 Create Account Response:", JSON.stringify(data, null, 2));

      if (!response.ok || !data.success) {
        throw new Error(data?.message || "Failed to create account");
      }

      const user = data.user;
      const token = data.token;

      if (!user?.id || !token) {
        throw new Error("Invalid server response");
      }

      await AsyncStorage.multiSet([
        ["@auth_token", token],
        ["user", JSON.stringify(user)],
        ["@user_id", String(user.id)],
        ["@user_type", user.user_type || selectedAccountType],
      ]);

      // OneSignal setup
      try {
        const playerId = await OneSignal.User.pushSubscription.getIdAsync();
        if (playerId) {
          await sendNotificationTokenToServer(playerId, String(user.id));
          OneSignal.login(String(user.id));
        }
      } catch (e) {
        console.log("OneSignal Error:", e);
      }

      setShowAccountTypeModal(false);

      Toast.show({
        type: "success",
        text1: "Account Created Successfully",
        text2: `Welcome ${user.name || user.email}`,
        position: "bottom",
      });

      // ←←← UPDATED NAVIGATION LOGIC
      setTimeout(() => {
        const isClient =
          selectedAccountType === "customer" ||
          user.user_type?.toLowerCase() === "customer";

        if (isClient) {
          navigation.reset({
            index: 0,
            routes: [
              {
                name: "MainTabs",
                params: { screen: "CreateJob" },
              },
            ],
          });
        } else {
          navigation.reset({
            index: 0,
            routes: [
              {
                name: "MainTabs",
                params: { screen: "Profile" },
              },
            ],
          });
        }
      }, 600);
    } catch (error: any) {
      console.error("❌ Complete Google Login Error:", error);

      Toast.show({
        type: "error",
        text1: "Account Creation Failed",
        text2: error.message || "Please try again",
        position: "bottom",
      });
    } finally {
      setLoading(false);
    }
  };
  // const handleGoogleLogin = async () => {
  //   try {
  //     setLoading(true);

  //     console.log("🚀 [GOOGLE] Starting Google Sign-In...");

  //     await GoogleSignin.hasPlayServices({
  //       showPlayServicesUpdateDialog: true,
  //     });

  //     await GoogleSignin.signOut().catch(() => {});

  //     const userInfo = await GoogleSignin.signIn();

  //     if (userInfo.type !== "success" || !userInfo.data) {
  //       throw new Error("Google sign-in failed");
  //     }

  //     const tokens = await GoogleSignin.getTokens();

  //     const credential = tokens.accessToken;

  //     if (!credential) {
  //       throw new Error("Failed to get Google credential");
  //     }

  //     console.log("✅ Google credential received");

  //     // Save credential in case we need it for account creation
  //     setGoogleCredential(credential);

  //     // FIRST CHECK IF USER ALREADY EXISTS
  //     const response = await fetch(`${BASE_URL}/auth/google/callback`, {
  //       method: "POST",
  //       headers: {
  //         "Content-Type": "application/json",
  //         Accept: "application/json",
  //       },
  //       body: JSON.stringify({
  //         credential,
  //       }),
  //     });

  //     const data = await response.json();

  //     console.log("📥 Google Response:", data);

  //     // Existing user -> Login directly
  //     if (response.ok && data.success && data.user && data.token) {
  //       const user = data.user;

  //       await AsyncStorage.multiSet([
  //         ["@auth_token", data.token],
  //         ["user", JSON.stringify(user)],
  //         ["@user_id", String(user.id)],
  //         ["@user_type", user.user_type],
  //       ]);

  //       try {
  //         const playerId = await OneSignal.User.pushSubscription.getIdAsync();

  //         if (playerId) {
  //           await sendNotificationTokenToServer(playerId, String(user.id));
  //           OneSignal.login(String(user.id));
  //         }
  //       } catch (e) {
  //         console.log("OneSignal Error:", e);
  //       }

  //       Toast.show({
  //         type: "success",
  //         text1: "Login Successful",
  //         text2: `Welcome ${user.name || user.email}`,
  //         position: "bottom",
  //       });

  //       setTimeout(() => {
  //         redirectAfterLogin(user);
  //       }, 500);

  //       return;
  //     }

  //     // New user -> Open account type modal
  //     if (
  //       data.needs_account_type ||
  //       response.status === 404 ||
  //       response.status === 422
  //     ) {
  //       setShowAccountTypeModal(true);
  //       return;
  //     }

  //     throw new Error(data.message || "Google login failed");
  //   } catch (error: any) {
  //     console.error("❌ Google Login Error:", error);

  //     Toast.show({
  //       type: "error",
  //       text1: "Google Login Failed",
  //       text2: error.message || "Please try again",
  //       position: "bottom",
  //     });
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  // const completeGoogleLogin = async () => {
  //   if (!selectedAccountType) {
  //     return Toast.show({
  //       type: "error",
  //       text1: "Please select account type",
  //       position: "bottom",
  //     });
  //   }

  //   try {
  //     setLoading(true);

  //     const payload = {
  //       credential: googleCredential,
  //       user_type: selectedAccountType,
  //     };

  //     console.log(
  //       "📤 Sending Google Payload:",
  //       JSON.stringify(payload, null, 2),
  //     );

  //     const response = await fetch(`${BASE_URL}/auth/google/callback`, {
  //       method: "POST",
  //       headers: {
  //         "Content-Type": "application/json",
  //         Accept: "application/json",
  //       },
  //       body: JSON.stringify(payload),
  //     });

  //     const data = await response.json();

  //     console.log(
  //       "📥 Google Callback Response:",
  //       JSON.stringify(data, null, 2),
  //     );

  //     if (!response.ok) {
  //       throw new Error(data?.message || "Login failed");
  //     }

  //     if (!data.success) {
  //       throw new Error(data?.message || "Login failed");
  //     }

  //     const user = data.user;
  //     const token = data.token;

  //     if (!user?.id || !token) {
  //       throw new Error("Invalid server response");
  //     }

  //     await AsyncStorage.multiSet([
  //       ["@auth_token", token],
  //       ["user", JSON.stringify(user)],
  //       ["@user_id", String(user.id)],
  //       ["@user_type", user.user_type || selectedAccountType],
  //     ]);

  //     try {
  //       const playerId = await OneSignal.User.pushSubscription.getIdAsync();

  //       if (playerId) {
  //         await sendNotificationTokenToServer(playerId, String(user.id));

  //         OneSignal.login(String(user.id));
  //       }
  //     } catch (e) {
  //       console.log("OneSignal Error:", e);
  //     }

  //     setShowAccountTypeModal(false);

  //     Toast.show({
  //       type: "success",
  //       text1: "Login Successful",
  //       text2: `Welcome ${user.name || user.email}`,
  //       position: "bottom",
  //     });

  //     setTimeout(() => {
  //       navigation.navigate("MainTabs", {
  //         screen: "Profile",
  //       });
  //     }, 500);
  //   } catch (error: any) {
  //     console.error("❌ Google Callback Error:", error);

  //     Toast.show({
  //       type: "error",
  //       text1: "Login Failed",
  //       text2: error.message || "Please try again",
  //       position: "bottom",
  //     });
  //   } finally {
  //     setLoading(false);
  //   }
  // };
  const handleForgotPassword = async () => {
    if (!email.trim()) {
      return Toast.show({
        type: "error",
        text1: "Enter your email first",
      });
    }

    setForgotLoading(true);

    try {
      const response = await fetch(`${BASE_URL}/auth/password-reset-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData?.message || "Request failed");
      }

      Toast.show({
        type: "success",
        text1: "Reset link sent",
        text2: "Check your email inbox",
      });
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: "Failed",
        text2: error.message || "Try again later",
      });
    } finally {
      setForgotLoading(false);
    }
  };

  // const redirectAfterLogin = (user: any) => {
  //   const type = (user.user_type || "").toLowerCase();

  //   setNavigationLoading(true);

  //   setTimeout(() => {
  //     if (type === "customer") {
  //       navigation.reset({
  //         index: 0,
  //         routes: [
  //           {
  //             name: "MainTabs",
  //             params: {
  //               screen: "CreateJob",
  //             },
  //           },
  //         ],
  //       });
  //     } else {
  //       navigation.reset({
  //         index: 0,
  //         routes: [
  //           {
  //             name: "MainTabs",
  //             params: {
  //               screen: "Profile",
  //             },
  //           },
  //         ],
  //       });
  //     }

  //     setTimeout(() => {
  //       setNavigationLoading(false);
  //     }, 2000);
  //   }, 100);
  // };

  // const handleSignIn = async () => {
  //   if (!email.trim()) {
  //     Toast.show({
  //       type: "error",
  //       text1: "Email Required",
  //       position: "bottom",
  //     });
  //     return;
  //   }

  //   if (!password.trim()) {
  //     Toast.show({
  //       type: "error",
  //       text1: "Password Required",
  //       position: "bottom",
  //     });
  //     return;
  //   }

  //   setLoading(true);

  //   try {
  //     const netState = await NetInfo.fetch();
  //     if (!netState.isConnected) {
  //       throw new Error("No internet connection. Please try again.");
  //     }

  //     const response = await loginUser({
  //       email: email.trim(),
  //       password: password.trim(),
  //     });
  //     const user = response;
  //     const token = response.token;
  //     await AsyncStorage.setItem("@auth_token", token);
  //     await AsyncStorage.setItem("@user_id", String(user.id));
  //     const userTypeValue = user.user_type || "staff";
  //     await AsyncStorage.setItem("@user_type", userTypeValue);
  //     await AsyncStorage.setItem("user", JSON.stringify(user));
  //     const allKeys = await AsyncStorage.getAllKeys();
  //     console.log("AsyncStorage keys after login:", allKeys);
  //     console.log("✅ Login Success - Saved:");
  //     console.log("   • User ID   :", user.id);
  //     console.log("   • User Type :", userTypeValue);
  //     console.log("   • Token     :", token ? "Saved" : "Missing");
  //     try {
  //       await new Promise((r) => setTimeout(r, 1200));
  //       const playerId = await OneSignal.User.pushSubscription.getIdAsync();
  //       if (playerId) {
  //         await sendNotificationTokenToServer(playerId, String(user.id));
  //         OneSignal.login(String(user.id));
  //       }
  //     } catch (e) {
  //       console.log("OneSignal error:", e);
  //     }

  //     Toast.show({
  //       type: "success",
  //       text1: "Login Successful",
  //       position: "bottom",
  //     });

  //     setTimeout(() => redirectAfterLogin(user), 500);
  //   } catch (err: any) {
  //     Toast.show({
  //       type: "error",
  //       text1: "Login Failed",
  //       text2: err.message || "Please try again",
  //       position: "bottom",
  //     });
  //   } finally {
  //     setLoading(false);
  //   }
  // };
  const handleSignIn = async () => {
    if (!email.trim()) {
      return Toast.show({
        type: "error",
        text1: "Email Required",
        position: "bottom",
      });
    }
    if (!password.trim()) {
      return Toast.show({
        type: "error",
        text1: "Password Required",
        position: "bottom",
      });
    }

    setLoading(true);

    try {
      const netState = await NetInfo.fetch();
      if (!netState.isConnected) {
        throw new Error("No internet connection. Please try again.");
      }

      const response = await loginUser({
        email: email.trim(),
        password: password.trim(),
      });

      const user = response;
      const token = response.token;

      // ── Check for Admin BEFORE saving data ──
      if (user.user_type?.toLowerCase() === "admin") {
        Toast.show({
          type: "error",
          text1: "Admin Access Denied",
          text2: "Please login through the Admin Portal",
          position: "top",
          visibilityTime: 5000,
        });

        // Do NOT save admin credentials
        return;
      }

      // ── Normal User Flow ──
      await AsyncStorage.multiSet([
        ["@auth_token", token],
        ["@user_id", String(user.id)],
        ["@user_type", user.user_type || "staff"],
        ["user", JSON.stringify(user)],
      ]);

      // OneSignal setup
      try {
        const playerId = await OneSignal.User.pushSubscription.getIdAsync();
        if (playerId) {
          await sendNotificationTokenToServer(playerId, String(user.id));
          OneSignal.login(String(user.id));
        }
      } catch (e) {
        console.log("OneSignal error:", e);
      }

      Toast.show({
        type: "success",
        text1: "Login Successful",
        position: "top",
      });

      setTimeout(() => redirectAfterLogin(user), 600);
    } catch (err: any) {
      Toast.show({
        type: "error",
        text1: "Login Failed",
        text2: err.message || "Please try again",
        position: "top",
      });
    } finally {
      setLoading(false);
    }
  };

  const redirectAfterLogin = (user: any) => {
    const type = (user.user_type || "").toLowerCase();

    if (type === "customer") {
      navigation.reset({
        index: 0,
        routes: [{ name: "MainTabs", params: { screen: "CreateJob" } }],
      });
    } else {
      navigation.reset({
        index: 0,
        routes: [{ name: "MainTabs", params: { screen: "Profile" } }],
      });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      {/* ── Decorative background artifacts — purely visual, same palette,
          sit behind everything and never intercept touches. ── */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View style={styles.orbTopRight}>
          <LinearGradient
            colors={[COLORS.primaryGlow, "transparent"]}
            start={{ x: 0.25, y: 0.15 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        </View>
        <View style={styles.orbBottomLeft}>
          <LinearGradient
            colors={[COLORS.primaryGlow, "transparent"]}
            start={{ x: 0.7, y: 0.8 }}
            end={{ x: 0, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </View>
        <View style={styles.ringOutline} />
        <View style={styles.dotAccent1} />
        <View style={styles.dotAccent2} />
        <View style={styles.dotAccent3} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: isTablet ? width * 0.25 : 24,
            paddingBottom: 24,
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.logoContainer}>
            <View style={styles.logoGlow} pointerEvents="none" />
            <Image
              source={LOGO}
              resizeMode="contain"
              style={{ width: width * 0.6, height: width * 0.17 }}
            />
            <Text style={[styles.subtitle, { fontSize: scale(14) }]}>
              Sign in to access your account securely.
            </Text>
          </View>

          <View style={styles.formCard}>
            <Text style={[styles.label, { fontSize: scale(12) }]}>
              Email Address <Text style={{ color: "red" }}>*</Text>
            </Text>
            <View
              style={[
                styles.inputContainer,
                emailFocused && styles.inputContainerFocused,
              ]}
            >
              <View style={styles.inputInner}>
                <View style={styles.inputIconBadge}>
                  <Mail size={16} color={COLORS.primary} />
                </View>
                <TextInput
                  style={[styles.input, { color: COLORS.text }]}
                  placeholder="name@example.com"
                  placeholderTextColor={COLORS.textMuted}
                  value={email}
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setEmailFocused(false)}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            <Text style={[styles.label, { fontSize: scale(12) }]}>
              Password <Text style={{ color: "red" }}>*</Text>
            </Text>
            <View
              style={[
                styles.inputContainer,
                passwordFocused && styles.inputContainerFocused,
              ]}
            >
              <View style={styles.inputInner}>
                <View style={styles.inputIconBadge}>
                  <Lock size={16} color={COLORS.primary} />
                </View>
                <TextInput
                  style={[styles.input, { color: COLORS.text }]}
                  placeholder="Password"
                  placeholderTextColor={COLORS.textMuted}
                  value={password}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  {showPassword ? (
                    <Eye size={22} color="#6B7280" />
                  ) : (
                    <EyeOff size={22} color="#6B7280" />
                  )}
                </TouchableOpacity>
              </View>
            </View>
            <TouchableOpacity
              onPress={() => navigation.navigate("ForgotPassword", { email })}
              style={{ alignSelf: "flex-end", marginBottom: 5 }}
            >
              <Text
                style={{ color: "#89E7D0", fontSize: 13, fontWeight: "600" }}
              >
                Forgot password?
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.signInButton, loading && { opacity: 0.7 }]}
              onPress={handleSignIn}
              disabled={loading}
              activeOpacity={0.88}
            >
              <LinearGradient
                colors={[COLORS.primary, COLORS.primaryDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.signInGradient}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.signInText}>Sign in</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.orContainer}>
              <View style={styles.orLine} />
              <Text style={styles.orText}>OR</Text>
              <View style={styles.orLine} />
            </View>

            {Platform.OS === "android" && (
              <TouchableOpacity
                style={styles.googleButton}
                onPress={handleGoogleLogin}
                disabled={loading}
                activeOpacity={0.85}
              >
                <View style={styles.googleIconBadge}>
                  <Image
                    source={require("../assets/google-img.png")}
                    style={{ width: 18, height: 18 }}
                  />
                </View>
                <Text style={styles.googleText}>Continue with Google</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.signupRow}>
            <Text style={{ color: "#fff" }}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate("SignUp")}>
              <Text style={styles.signupLink}>Sign up</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={showAccountTypeModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAccountTypeModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowAccountTypeModal(false)}
        >
          <TouchableOpacity
            style={styles.modalContainer}
            activeOpacity={1}
            onPress={() => {}}
          >
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowAccountTypeModal(false)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>

            <Text style={styles.modalTitle}>Complete your setup</Text>

            <Text style={styles.modalDescription}>
              It looks like you don't have an account yet. Please select your
              account type to securely create your profile and continue.
            </Text>

            <Text style={styles.accountTypeLabel}>
              Account Type <Text style={{ color: "#E53935" }}>*</Text>
            </Text>

            <View style={styles.accountTypeRow}>
              <TouchableOpacity
                style={[
                  styles.accountTypeBtn,
                  selectedAccountType === "customer" &&
                    styles.accountTypeBtnActive,
                ]}
                onPress={() => setSelectedAccountType("customer")}
              >
                <Text
                  style={[
                    styles.accountTypeText,
                    selectedAccountType === "customer" &&
                      styles.accountTypeTextActive,
                  ]}
                >
                  Client
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.accountTypeBtn,
                  selectedAccountType === "staff" &&
                    styles.accountTypeBtnActive,
                ]}
                onPress={() => setSelectedAccountType("staff")}
              >
                <Text
                  style={[
                    styles.accountTypeText,
                    selectedAccountType === "staff" &&
                      styles.accountTypeTextActive,
                  ]}
                >
                  Staff
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.accountTypeBtn,
                  selectedAccountType === "contractor" &&
                    styles.accountTypeBtnActive,
                ]}
                onPress={() => setSelectedAccountType("contractor")}
              >
                <Text
                  style={[
                    styles.accountTypeText,
                    selectedAccountType === "contractor" &&
                      styles.accountTypeTextActive,
                  ]}
                >
                  Resource Partner
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.createAccountBtn, loading && { opacity: 0.7 }]}
              onPress={completeGoogleLogin}
              disabled={loading}
            >
              {loading ? (
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <ActivityIndicator color="#fff" size="small" />
                  <Text
                    style={[styles.createAccountBtnText, { marginLeft: 10 }]}
                  >
                    Creating Account...
                  </Text>
                </View>
              ) : (
                <Text style={styles.createAccountBtnText}>
                  Create Account & Login
                </Text>
              )}
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // backgroundColor: COLORS.background,
    backgroundColor: "#030508",
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
    position: "relative",
    overflow: "hidden",
  },

  // ── Decorative background artifacts (same palette, purely visual) ──
  orbTopRight: {
    position: "absolute",
    top: -90,
    right: -70,
    width: 260,
    height: 260,
    borderRadius: 130,
    overflow: "hidden",
  },
  orbBottomLeft: {
    position: "absolute",
    bottom: -110,
    left: -90,
    width: 300,
    height: 300,
    borderRadius: 150,
    overflow: "hidden",
  },
  ringOutline: {
    position: "absolute",
    top: "36%",
    right: -46,
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 1,
    borderColor: "rgba(0,169,157,0.18)",
  },
  dotAccent1: {
    position: "absolute",
    top: 90,
    left: 28,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.primary,
    opacity: 0.45,
  },
  dotAccent2: {
    position: "absolute",
    top: 160,
    left: 60,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.primary,
    opacity: 0.3,
  },
  dotAccent3: {
    position: "absolute",
    bottom: 140,
    right: 40,
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: COLORS.primary,
    opacity: 0.35,
  },

  logoContainer: {
    marginVertical: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  logoGlow: {
    position: "absolute",
    top: -30,
    alignSelf: "center",
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: COLORS.primaryGlow,
    opacity: 0.35,
  },
  subtitle: {
    color: COLORS.textSecondary,
    marginTop: 10,
    textAlign: "center",
  },

  // ── Floating card that groups the whole form ──
  formCard: {
    backgroundColor: COLORS.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    padding: 20,
    paddingTop: 24,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },

  label: {
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 5,
  },
  gradientInput: {
    borderRadius: 12,
    marginBottom: 16,
  },
  inputInner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    height: 47,
  },
  inputIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: COLORS.primaryGlow,
    justifyContent: "center",
    alignItems: "center",
  },
  input: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: COLORS.text,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  orContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 5,
  },

  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.cardBorder,
  },

  orText: {
    marginHorizontal: 10,
    color: COLORS.textMuted,
    fontSize: 14,
    fontWeight: "500",
  },
  checkboxChecked: {
    backgroundColor: COLORS.primary,
  },
  signInButton: {
    borderRadius: 50,
    height: 52,
    marginVertical: 10,
    overflow: "hidden",
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  signInGradient: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  signInText: {
    color: "#ffff",
    fontWeight: "800",
    fontSize: 16,
  },
  inputContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    marginBottom: 18,
  },
  inputContainerFocused: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.heroBg1,
  },
  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 14,
    paddingVertical: 14,
    backgroundColor: COLORS.surface,
    marginTop: 4,
  },
  googleIconBadge: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  googleText: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.text,
  },
  signupRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 24,
    paddingBottom: 30,
  },
  signupLink: {
    color: COLORS.primary,
    fontWeight: "600",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 0,
  },

  modalContainer: {
    width: "95%",
    maxWidth: 650,
    backgroundColor: "#fff",
    borderRadius: 24,

    paddingHorizontal: 25,
    paddingVertical: 25,
    paddingTop: 20,
    paddingBottom: 20,
  },

  closeButton: {
    position: "absolute",
    right: 14,
    top: 14,
    zIndex: 99,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F1F1F1",
    justifyContent: "center",
    alignItems: "center",
  },

  closeText: {
    fontSize: 16,
    color: "#555",
    fontWeight: "700",
  },

  modalTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#202124",
    marginBottom: 5,
  },

  modalDescription: {
    fontSize: 12,
    color: "#666",
    lineHeight: 20,
    marginBottom: 20,
  },

  accountTypeLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
    marginBottom: 10,
  },

  accountTypeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 10,
  },

  accountTypeBtn: {
    borderWidth: 1,
    borderColor: "#D8D8D8",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginRight: 10,
    // marginBottom: 10,
    backgroundColor: "#fff",
  },

  accountTypeBtnActive: {
    backgroundColor: "#3E8E7C",
    borderColor: "#3E8E7C",
  },

  accountTypeText: {
    fontSize: 14,
    color: "#555",
    fontWeight: "500",
  },

  accountTypeTextActive: {
    color: "#fff",
  },

  createAccountBtn: {
    backgroundColor: "#3E8E7C",
    borderRadius: 10,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
  },

  createAccountBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
});
