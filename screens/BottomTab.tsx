import React, { useState, useCallback } from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Text,
  Dimensions,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import axios from "axios";
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
import { getUserProfile, BASE_URL } from "../services/authApi";

type Props = {
  navigation: any;
  activeTab?: string;
};

export default function BottomTab({ navigation, activeTab = "Home" }: Props) {
  const [userType, setUserType] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [loading, setLoading] = useState(true);
  // "staff" covers two different people: Staffoo's own staff (account id 1)
  // and a contractor's guards (any other staff account). Only the former
  // gets the "Available Jobs" tab.
  const [isStaffooStaff, setIsStaffooStaff] = useState(false);
  // Badge count for the "Available Jobs" tab — shown for staffoo staff and
  // contractors only.
  const [availableJobsCount, setAvailableJobsCount] = useState(0);

  useFocusEffect(
    useCallback(() => {
      const loadUserData = async () => {
        try {
          setLoading(true);

          const userId = await AsyncStorage.getItem("@user_id");
          const token = await AsyncStorage.getItem("@auth_token");

          if (!userId || !token) {
            await AsyncStorage.multiRemove(["@user_id", "@auth_token", "user"]);
            navigation.reset({
              index: 0,
              routes: [{ name: "Login" }],
            });
            return;
          }

          const response = await getUserProfile(userId);

          if (
            response?.status === 401 ||
            response?.message === "Unauthenticated" ||
            response?.success === false
          ) {
            await AsyncStorage.multiRemove(["@user_id", "@auth_token", "user"]);
            Alert.alert("Session Expired", "Please login again.", [
              {
                text: "OK",
                onPress: () => {
                  navigation.reset({
                    index: 0,
                    routes: [{ name: "Login" }],
                  });
                },
              },
            ]);
            return;
          }

          let userData;

          if (response?.success && response?.data) {
            userData = response.data;
            await AsyncStorage.setItem("user", JSON.stringify(userData));
          } else {
            const cached = await AsyncStorage.getItem("user");
            if (cached) {
              userData = JSON.parse(cached);
            }
          }

          if (userData) {
            setUserType(userData.user_type ?? null);
            setIsActive(userData.is_active === true);
            setIsStaffooStaff(Number(userData.id) === 1);
          }

          // ── Available Jobs badge — only relevant for staffoo staff
          // (userData.id === 1) and contractors, since they're the only
          // ones who see the "Available Jobs" tab. Fetch is best-effort:
          // a failure here just means no badge, never a broken nav.
          const showsAvailableJobsTab =
            userData?.user_type === "contractor" ||
            (userData?.user_type === "staff" && Number(userData?.id) === 1);

          if (showsAvailableJobsTab) {
            try {
              const countRes = await axios.get(
                `${BASE_URL}/jobs/available/${userId}`,
                { headers: { Authorization: `Bearer ${token}` } },
              );
              const total = Number(countRes?.data?.data?.jobs?.total ?? 0);
              setAvailableJobsCount(Number.isFinite(total) ? total : 0);
            } catch (countErr) {
              setAvailableJobsCount(0);
            }
          } else {
            setAvailableJobsCount(0);
          }
        } catch (err) {
          await AsyncStorage.multiRemove(["@user_id", "@auth_token", "user"]);
        } finally {
          setLoading(false);
        }
      };

      loadUserData();
    }, [navigation]),
  );

  const isFullyAccessible = isActive === true;

  const canAccess = (screen: string): boolean => {
    if (screen === "Profile") return true;
    return isFullyAccessible;
  };

  const handlePress = (screen: string) => {
    if (!canAccess(screen)) {
      Alert.alert(
        "Account Not Active",
        "Your account must be active to access this section.",
        [
          {
            text: "Go to Profile",
            onPress: () => navigation.navigate("Profile"),
          },
          {
            text: "OK",
            style: "cancel",
          },
        ],
      );
      return;
    }
    navigation.navigate(screen);
  };

  const getIconColor = (screen: string) => {
    if (!canAccess(screen) && screen !== "Profile") {
      return "#cbd5e1";
    }
    return activeTab === screen ? "#0A7C6E" : "#64748b";
  };

  const getLabelStyle = (screen: string) => {
    return [
      styles.tabLabel,
      activeTab === screen && styles.activeLabel,
      !canAccess(screen) && screen !== "Profile" && styles.disabledLabel,
    ];
  };

  const renderTab = (
    screen: string,
    label: string,
    Icon: any,
    badge?: number,
  ) => (
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

        {!canAccess(screen) && screen !== "Profile" && (
          <Lock size={11} color="#ef4444" style={styles.lockIcon} />
        )}

        {!!badge && canAccess(screen) && (
          <View style={styles.tabBadge}>
            <Text style={styles.tabBadgeText}>
              {badge > 99 ? "99+" : badge}
            </Text>
          </View>
        )}
      </View>

      <Text style={getLabelStyle(screen)}>{label}</Text>
    </TouchableOpacity>
  );

  // While loading, render a placeholder with the same height/structure
  // so the layout doesn't shift when data arrives
  if (loading) {
    return (
      <View style={styles.wrapper}>
        <View style={styles.bottomTab} />
      </View>
    );
  }

  // ── Per-user-type tab configs ──────────────────────────────────────────
  // "staff" is two different people: Staffoo's own staff (isStaffooStaff,
  // account id 1) and a contractor's guards (any other staff account).
  // "AcceptedJobs" and "StaffShifts" are both registered as hidden-button
  // Tab.Screens rendering the same StaffShifts component — it reads
  // route.name to decide which section to show. "Applications" (My Jobs)
  // is likewise still registered but no longer has a visible tab button
  // for these three types — it's reached from the "Job History" box on
  // Profile instead. Customers are the one exception and keep My Jobs
  // as a bottom tab, unchanged.
  type TabConfig = {
    name: string;
    label: string;
    Icon: any;
    isAdd?: boolean;
    badge?: number;
  };

  const customerTabs: TabConfig[] = [
    { name: "Home", label: "Home", Icon: Home },
    { name: "Applications", label: "My Jobs", Icon: FileText },
    { name: "CreateJob", label: "", Icon: Plus, isAdd: true },
    { name: "Messages", label: "Messages", Icon: MessageCircle },
    { name: "Profile", label: "Profile", Icon: User },
  ];

  const staffooStaffTabs: TabConfig[] = [
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

  const contractorTabs: TabConfig[] = [
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

  const contractorGuardTabs: TabConfig[] = [
    { name: "Home", label: "Home", Icon: Home },
    { name: "AcceptedJobs", label: "Assigned Job", Icon: CheckCircle },
    { name: "Messages", label: "Messages", Icon: MessageCircle },
    { name: "Profile", label: "Profile", Icon: User },
  ];

  const tabs =
    userType === "customer"
      ? customerTabs
      : userType === "contractor"
      ? contractorTabs
      : userType === "staff" && isStaffooStaff
      ? staffooStaffTabs
      : userType === "staff"
      ? contractorGuardTabs
      : customerTabs; // fallback while userType is unrecognised

  return (
    <View style={styles.wrapper}>
      <View style={styles.bottomTab}>
        {tabs.map((tab) =>
          tab.isAdd ? (
            <TouchableOpacity
              key={tab.name}
              style={[
                styles.tabAdd,
                !isFullyAccessible && styles.tabAddDisabled,
              ]}
              onPress={() => handlePress(tab.name)}
              disabled={!isFullyAccessible}
              activeOpacity={0.9}
            >
              <Plus size={30} color="#fff" strokeWidth={2.8} />
            </TouchableOpacity>
          ) : (
            renderTab(tab.name, tab.label, tab.Icon, tab.badge)
          ),
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: "transparent",
    paddingBottom: 4,
  },

  bottomTab: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",

    height: 65,

    marginHorizontal: 10,
    borderRadius: 26,

    backgroundColor: "#ffffff",

    borderWidth: 1,
    borderColor: "#e2e8f0",

    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.08,
    shadowRadius: 12,

    elevation: 10,
  },

  tabItem: {
    alignItems: "center",
    justifyContent: "center",
    minWidth: 58,
  },

  iconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,

    justifyContent: "center",
    alignItems: "center",

    position: "relative",
  },

  activeIconWrapper: {
    backgroundColor: "#eef2ff",
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

  tabBadge: {
    position: "absolute",
    top: -2,
    right: -6,
    backgroundColor: "#ef4444",
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: "#ffffff",
  },

  tabBadgeText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "700",
  },

  tabAdd: {
    width: 60,
    height: 60,
    borderRadius: 30,

    backgroundColor: "#0A7C6E",

    justifyContent: "center",
    alignItems: "center",

    shadowColor: "#0A7C6E",
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.28,
    shadowRadius: 10,

    elevation: 12,
  },

  tabAddDisabled: {
    backgroundColor: "#94a3b8",
    shadowOpacity: 0,
    elevation: 0,
  },
});
