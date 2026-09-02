

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Animated,
  Platform,
  Keyboard,
  Modal,
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
  CheckCircle,
  Lock,
} from "lucide-react-native";
import HomeScreen from "./HomeScreen";
import ApplicationsScreen from "./ApplicationsScreen";
import MessageScreen from "./MessageScreen";
import ProfileScreen from "./ProfileScreen";
import AvailableJobsScreen from "./AvailableJobsScreen";
import AcceptedJobsScreen from "./AcceptedJobsScreen";
import { BASE_URL, getUserProfile } from "../services/authApi";
import { useFocusEffect, useRoute } from "@react-navigation/native";
import CreateJobScreen from "./CreateJobScreen";
import ReviewConfirmScreen from "./ReviewConfirmScreen";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import axios from "axios";
import BrandLoader from "./BrandLoader";

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

function CustomTabBar({
  state,
  navigation,
  userData,
  availableJobsCount,
}: any) {
  const insets = useSafeAreaInsets();
  const translateY = React.useRef(new Animated.Value(0)).current;
  const opacity = React.useRef(new Animated.Value(1)).current;
  const [hidden, setHidden] = useState(false);

  // Custom locked modal state
  const [lockedModalVisible, setLockedModalVisible] = useState(false);
  const [lockedModalTitle, setLockedModalTitle] =
    useState("Account Not Active");
  const [lockedModalMessage, setLockedModalMessage] = useState("");

  // Keyboard handling
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
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start(() => setHidden(false));
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const userType = userData?.user_type ?? null;
  const isStaffooStaff = Number(userData?.user_id) === 1;
  const isActive = userData?.is_active === true;
  const isFullyAccessible = userType === "customer" ? true : isActive;

  const canAccess = (routeName: string) => {
    if (routeName === "Profile") return true;
    return isFullyAccessible;
  };

  const handlePress = (routeName: string, isFocused: boolean) => {
    if (!canAccess(routeName)) {
      setLockedModalTitle("Account Not Active");
      setLockedModalMessage(
        "Your account must be active to access this section. Please complete your profile and required documents first.",
      );
      setLockedModalVisible(true);
      return;
    }
    if (!isFocused) navigation.navigate(routeName);
  };

  const customerTabs = [
    { name: "Home", label: "Home", Icon: Home },
    { name: "Applications", label: "My Jobs", Icon: FileText },
    { name: "CreateJob", label: "", Icon: Plus, isAdd: true },
    { name: "Messages", label: "Messages", Icon: MessageCircle },
    { name: "Profile", label: "Profile", Icon: User },
  ];

  const staffooStaffTabs = [
    { name: "Home", label: "Home", Icon: Home },
    { name: "AcceptedJobs", label: "Accepted Job", Icon: CheckCircle },
    {
      name: "StaffShifts",
      label: "Available Jobs",
      badge: availableJobsCount,
      Icon: Calendar,
    },
    { name: "Messages", label: "Messages", Icon: MessageCircle },
    { name: "Profile", label: "Profile", Icon: User },
  ];

  const contractorTabs = [
    { name: "Home", label: "Home", Icon: Home },
    { name: "AcceptedJobs", label: "Accepted Jobs", Icon: CheckCircle },
    {
      name: "StaffShifts",
      label: "Available Jobs",
      badge: availableJobsCount,
      Icon: Calendar,
    },
    { name: "Messages", label: "Messages", Icon: MessageCircle },
    { name: "Profile", label: "Profile", Icon: User },
  ];

  const contractorGuardTabs = [
    { name: "Home", label: "Home", Icon: Home },
    { name: "AcceptedJobs", label: "Assigned Job", Icon: CheckCircle },
    { name: "Messages", label: "Messages", Icon: MessageCircle },
    { name: "Profile", label: "Profile", Icon: User },
  ];

  const visibleTabs =
    userType === "customer"
      ? customerTabs
      : userType === "contractor"
      ? contractorTabs
      : userType === "staff" && isStaffooStaff
      ? staffooStaffTabs
      : userType === "staff"
      ? contractorGuardTabs
      : customerTabs;

  const currentRouteName = state.routes[state.index]?.name;

  return (
    <>
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
                <View key={tab.name} style={styles.addButtonContainer}>
                  <TouchableOpacity
                    style={styles.floatingAddButton}
                    onPress={() => handlePress(tab.name, isFocused)}
                    activeOpacity={0.9}
                  >
                    <View style={styles.floatingInner}>
                      <Plus size={32} color="#fff" strokeWidth={2.8} />
                    </View>
                  </TouchableOpacity>
                </View>
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

                  {tab.badge > 0 && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>
                        {tab.badge > 99 ? "99+" : tab.badge}
                      </Text>
                    </View>
                  )}

                  {!accessible && tab.name !== "Profile" && (
                    <Lock size={11} color="#ef4444" style={styles.lockIcon} />
                  )}
                </View>
                <Text
                  style={[styles.tabLabel, isFocused && styles.activeLabel]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </Animated.View>

      {/* Custom Account Not Active Modal */}
      <Modal
        visible={lockedModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLockedModalVisible(false)}
      >
        <View style={styles.lockedModalOverlay}>
          <View style={styles.lockedModalCard}>
            {/* Top accent – primary teal */}
            <View
              style={[
                styles.lockedModalAccent,
                { backgroundColor: COLORS.primary },
              ]}
            />

            {/* Icon */}
            <View style={styles.lockedModalIconWrap}>
              <View
                style={[
                  styles.lockedModalIconCircle,
                  { backgroundColor: "rgba(0,169,157,0.12)" },
                ]}
              >
                <Lock size={28} color={COLORS.primary} />
              </View>
            </View>

            {/* Title */}
            <Text style={styles.lockedModalTitle}>{lockedModalTitle}</Text>

            {/* Message */}
            <Text style={styles.lockedModalMessage}>{lockedModalMessage}</Text>

            {/* Button */}
            <TouchableOpacity
              activeOpacity={0.85}
              style={[
                styles.lockedModalBtn,
                { backgroundColor: COLORS.primary },
              ]}
              onPress={() => setLockedModalVisible(false)}
            >
              <Text style={[styles.lockedModalBtnText, { color: "#03211E" }]}>
                Got it
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

export default function MainTabs() {
  const route = useRoute<any>();
  const [availableJobsCount, setAvailableJobsCount] = useState(0);
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchAvailableJobsCount = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem("@auth_token");
      const userId = await AsyncStorage.getItem("@user_id");
      if (!token || !userId) return;

      const response = await axios.get(`${BASE_URL}/jobs/available/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const jobsPaginator = response.data?.data?.jobs;
      if (jobsPaginator) {
        setAvailableJobsCount(Number(jobsPaginator.total) || 0);
      }
    } catch (error) {
      console.log("Available Jobs Count Error:", error);
    }
  }, []);

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

  useEffect(() => {
    fetchUserData(true);
    fetchAvailableJobsCount();

    const interval = setInterval(() => {
      fetchAvailableJobsCount();
    }, 20 * 1000);

    return () => clearInterval(interval);
  }, [fetchUserData, fetchAvailableJobsCount]);

  useFocusEffect(
    useCallback(() => {
      fetchUserData(false);
      fetchAvailableJobsCount();
    }, [fetchUserData, fetchAvailableJobsCount]),
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <BrandLoader size={60} />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  const userType = userData?.user_type ?? null;
  const isActive = userData?.is_active === true;
  const isFullyAccessible = userType === "customer" ? true : isActive;

  const initialTab =
    route.params?.screen || (isFullyAccessible ? "Home" : "Profile");

  return (
    <Tab.Navigator
      initialRouteName={initialTab}
      tabBar={(props) => (
        <CustomTabBar
          {...props}
          userData={userData}
          availableJobsCount={availableJobsCount}
        />
      )}
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: "none" },
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Applications" component={ApplicationsScreen} />
      <Tab.Screen name="StaffShifts" component={AvailableJobsScreen} />
      <Tab.Screen
        name="AcceptedJobs"
        component={AcceptedJobsScreen}
        options={{ tabBarButton: () => null }}
      />
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

const styles = StyleSheet.create({
  iconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 24,
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
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 12,
    position: "relative",
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#EF4444",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: "#fff",
  },
  badgeText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "700",
  },
  tabItem: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  addButtonContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    zIndex: 10,
  },
  floatingAddButton: {
    position: "absolute",
    bottom: -14,
    alignSelf: "center",
  },
  floatingInner: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#0A7C6E",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#0A7C6E",
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
    borderWidth: 4,
    borderColor: "#fff",
  },

  // Custom Account Not Active Modal
  lockedModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  lockedModalCard: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: "#fff",
    borderRadius: 20,
    overflow: "hidden",
    paddingBottom: 24,
    elevation: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
  },
  lockedModalAccent: {
    height: 5,
  },
  lockedModalIconWrap: {
    alignItems: "center",
    marginTop: 28,
    marginBottom: 12,
  },
  lockedModalIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    justifyContent: "center",
    alignItems: "center",
  },
  lockedModalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
    marginBottom: 10,
    paddingHorizontal: 24,
  },
  lockedModalMessage: {
    fontSize: 15,
    lineHeight: 22,
    color: "#6B7280",
    textAlign: "center",
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  lockedModalBtn: {
    marginHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  lockedModalBtnText: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
});
