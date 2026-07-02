import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Animated,
} from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  Home,
  FileText,
  Plus,
  MessageCircle,
  User,
  Calendar,
  Lock,
} from "lucide-react-native";
import { Keyboard } from "react-native";
import HomeScreen from "./HomeScreen";
import ApplicationsScreen from "./ApplicationsScreen";
import MessageScreen from "./MessageScreen";
import ProfileScreen from "./ProfileScreen";
import StaffShifts from "./StaffShifts";
import { getUserProfile } from "../services/authApi";
import { useFocusEffect } from "@react-navigation/native";
import CreateJobScreen from "./CreateJobScreen";
import ReviewConfirmScreen from "./ReviewConfirmScreen";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Platform, Easing } from "react-native";

const Tab = createBottomTabNavigator();
const COLORS = {
  background: "#030508",
  surface: "#07111A",
  card: "#0D1421",
  cardBorder: "rgba(98, 97, 97, 0.83)",
  primary: "#00A99D",
  primaryGlow: "rgba(0,169,157,0.25)",
  primaryBorder: "rgba(0,169,157,0.25)",
  text: "#FFFFFF",
  textSecondary: "#94A3B8",
  textMuted: "#4A6080",
  success: "#34C88A",
  danger: "#F87171",
  dangerBg: "rgba(248,88,88,0.12)",
  warning: "#F5A623",
  warningBg: "rgba(245,166,35,0.08)",
  heroBg1: "#0D1F2D",
  heroBg2: "#061014",
};

function CustomTabBar({ state, navigation, userData }: any) {
  const insets = useSafeAreaInsets();

  const translateY = React.useRef(new Animated.Value(0)).current;
  const opacity = React.useRef(new Animated.Value(1)).current;
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";

    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, () => {
      setHidden(true);

      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 120,
          duration: 180,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 120,
          useNativeDriver: true,
        }),
      ]).start();
    });

    const hideSub = Keyboard.addListener(hideEvent, () => {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: 180,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setHidden(false);
      });
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const userType = userData?.user_type ?? null;
  const isActive = userData?.is_active === true;
  const isFullyAccessible = userType === "customer" ? true : isActive;

  const canAccess = (routeName: string) => {
    if (routeName === "Profile") return true;
    return isFullyAccessible;
  };

  const handlePress = (routeName: string, isFocused: boolean) => {
    if (!canAccess(routeName)) {
      Alert.alert(
        "Account Not Active",
        "Your account must be active to access this section.",
        [
          {
            text: "Go to Profile",
            onPress: () => navigation.navigate("Profile"),
          },
          { text: "OK", style: "cancel" },
        ],
      );
      return;
    }

    if (!isFocused) {
      navigation.navigate(routeName);
    }
  };

  const visibleTabs =
    userType === "customer"
      ? [
          { name: "Home", label: "Home", Icon: Home },
          { name: "Applications", label: "My Jobs", Icon: FileText },
          { name: "CreateJob", label: "Post Job", Icon: Plus, isAdd: true },
          { name: "Messages", label: "Messages", Icon: MessageCircle },
          { name: "Profile", label: "Profile", Icon: User },
        ]
      : [
          { name: "Home", label: "Home", Icon: Home },
          { name: "Applications", label: "My Jobs", Icon: FileText },
          { name: "StaffShifts", label: "Shifts", Icon: Calendar },
          { name: "Messages", label: "Messages", Icon: MessageCircle },
          { name: "Profile", label: "Profile", Icon: User },
        ];

  const currentRouteName = state.routes[state.index]?.name;

  return (
    <Animated.View
      pointerEvents={hidden ? "none" : "auto"}
      style={[
        styles.wrapper,
        {
          paddingBottom: insets.bottom,
          opacity,
          transform: [{ translateY }],
        },
      ]}
    >
      <View style={styles.bottomTab}>
        {visibleTabs.map((tab: any) => {
          const isFocused = currentRouteName === tab.name;
          const accessible = canAccess(tab.name);

          const iconColor =
            !accessible && tab.name !== "Profile"
              ? "#cbd5e1"
              : isFocused
              ? "#0A7C6E"
              : "#64748b";

          if (tab.isAdd) {
            return (
              <TouchableOpacity
                key={tab.name}
                style={[
                  styles.tabAdd,
                  !isFullyAccessible && styles.tabAddDisabled,
                ]}
                onPress={() => handlePress(tab.name, isFocused)}
              >
                <Plus size={30} color="#fff" />
              </TouchableOpacity>
            );
          }

          return (
            <TouchableOpacity
              key={tab.name}
              style={styles.tabItem}
              onPress={() => handlePress(tab.name, isFocused)}
            >
              <View
                style={[
                  styles.iconWrapper,
                  isFocused && styles.activeIconWrapper,
                ]}
              >
                <tab.Icon size={20} color={iconColor} />

                {!accessible && tab.name !== "Profile" && (
                  <Lock size={11} color="#ef4444" style={styles.lockIcon} />
                )}
              </View>

              <Text
                style={[
                  styles.tabLabel,
                  isFocused && styles.activeLabel,
                  !accessible && tab.name !== "Profile" && styles.disabledLabel,
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </Animated.View>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// MainTabs — single source of truth for user data.
// ────────────────────────────────────────────────────────────────────────────
export default function MainTabs() {
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserData = useCallback(async (showLoader: boolean) => {
    if (showLoader) setLoading(true);

    try {
      const userId = await AsyncStorage.getItem("@user_id");

      if (!userId) {
        setLoading(false);
        return;
      }

      const response = await getUserProfile(userId);

      if (response?.success && response?.data) {
        await AsyncStorage.setItem("user", JSON.stringify(response.data));
        setUserData(response.data);
      } else if (showLoader) {
        // Fresh fetch failed on initial load — fall back to cache
        // only as a last resort so the app isn't stuck blank.
        const cached = await AsyncStorage.getItem("user");
        if (cached) setUserData(JSON.parse(cached));
      }
    } catch (error) {
      console.log("Profile Error:", error);
      if (showLoader) {
        const cached = await AsyncStorage.getItem("user");
        if (cached) setUserData(JSON.parse(cached));
      }
    } finally {
      if (showLoader) setLoading(false);
    }
  }, []);

  // Always force a fresh fetch on first mount (e.g. right after login).
  useEffect(() => {
    fetchUserData(true);
  }, [fetchUserData]);

  // Quietly refresh whenever this tab stack regains focus
  // (e.g. user just activated their account and came back from Profile).
  useFocusEffect(
    useCallback(() => {
      fetchUserData(false);
    }, [fetchUserData]),
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} userData={userData} />}
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: "none" },
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Applications" component={ApplicationsScreen} />
      <Tab.Screen name="StaffShifts" component={StaffShifts} />
      <Tab.Screen name="Messages" component={MessageScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
      <Tab.Screen
        name="ReviewConfirm"
        component={ReviewConfirmScreen}
        options={{ tabBarButton: () => null }}
      />
      <Tab.Screen
        name="CreateJob"
        component={CreateJobScreen}
        options={{ tabBarButton: () => null }}
      />
    </Tab.Navigator>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Styles
// ────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  tabItem: {
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrapper: {
    width: 35,
    height: 35,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  activeIconWrapper: {
    backgroundColor: "#E6F4F1",
    borderRadius: 25,
  },
  tabLabel: {
    marginTop: 0,
    fontSize: 10,
    color: "#64748b",
    fontWeight: "500",
  },
  activeLabel: {
    color: "#0A7C6E",
    fontWeight: "700",
  },
  disabledLabel: {
    color: "#cbd5e1",
  },
  lockIcon: {
    position: "absolute",
    top: 5,
    right: 4,
  },
  tabAdd: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#0A7C6E",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#0A7C6E",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 12,
  },
  tabAddDisabled: {
    backgroundColor: "#94a3b8",
    shadowOpacity: 0,
    elevation: 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
    gap: 12,
  },
  loadingText: {
    fontSize: 15,
    color: COLORS.textSecondary,
    fontWeight: "500",
  },
  wrapper: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  bottomTab: {
    height: 60,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    backgroundColor: "#fff",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 10,
  },
});
