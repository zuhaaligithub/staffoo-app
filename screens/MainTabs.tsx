import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  ActivityIndicator,
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
import HomeScreen from "./HomeScreen";
import ApplicationsScreen from "./ApplicationsScreen";
import MessageScreen from "./MessageScreen";
import ProfileScreen from "./ProfileScreen";
import StaffShifts from "./StaffShifts";
import { getUserProfile } from "../services/authApi";
import { useFocusEffect } from "@react-navigation/native";
import CreateJobScreen from "./CreateJobScreen";
import ReviewConfirmScreen from "./ReviewConfirmScreen";

type UserType = "staff" | "contractor" | "customer" | null;

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
function CustomTabBar({ state, navigation }: any) {
  // 1. Initialize from cache immediately to avoid empty states
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Derive values from state instead of keeping separate state variables
  const userType = userData?.user_type ?? null;
  const isActive = userData?.is_active === true;
  const isFullyAccessible = userType === "customer" ? true : isActive;

  useFocusEffect(
    useCallback(() => {
      let mounted = true;

      const loadUserData = async () => {
        // Load cache instantly
        const cached = await AsyncStorage.getItem("user");
        if (cached && mounted) {
          setUserData(JSON.parse(cached));
          setLoading(false); // We have enough to show UI
        }

        // Fetch fresh data
        const userId = await AsyncStorage.getItem("@user_id");
        if (!userId) return;

        try {
          const response = await getUserProfile(userId);
          if (response?.success && response?.data && mounted) {
            await AsyncStorage.setItem("user", JSON.stringify(response.data));
            setUserData(response.data);
          }
        } catch (error) {
          console.log("Profile Error:", error);
        }
      };

      loadUserData();
      return () => {
        mounted = false;
      };
    }, []),
  );

  // 2. Hide tab bar or show skeleton until initial load
  if (loading && !userData) {
    return null; // Or return a simple empty view to prevent flicker
  }

  const canAccess = (routeName: string) => {
    if (routeName === "Profile") return true;
    return isFullyAccessible;
  };

  const handlePress = (routeName: string, isFocused: boolean) => {
    if (routeName === "CreateJob" || routeName === "ReviewConfirm") {
      if (!isFullyAccessible) {
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
    }

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
    <View style={styles.wrapper}>
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
    </View>
  );
}

export default function MainTabs() {
  const [loading, setLoading] = useState(true);
  const [initialData, setInitialData] = useState(null);

  useEffect(() => {
    // Initial fetch to get user before rendering tabs
    const init = async () => {
      const cached = await AsyncStorage.getItem("user");
      if (cached) setInitialData(JSON.parse(cached));

      const userId = await AsyncStorage.getItem("@user_id");
      if (userId) {
        const response = await getUserProfile(userId);
        if (response?.success) {
          await AsyncStorage.setItem("user", JSON.stringify(response.data));
          setInitialData(response.data);
        }
      }
      setLoading(false);
    };
    init();
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading data...</Text>
      </View>
    );
  }
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        lazy: false,
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
  wrapper: {
    backgroundColor: "transparent",
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  bottomTab: {
    height: 60,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    backgroundColor: "#fff",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 8,
    borderTopWidth: 1,
    borderColor: "#E5E7EB",
  },
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
});
