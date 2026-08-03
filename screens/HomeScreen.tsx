import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Dimensions,
  Alert,
  Animated,
  Pressable,
  Modal,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import LinearGradient from "react-native-linear-gradient";
import {
  BASE_URL,
  getUserProfile,
  getContractorStaff,
  postGuardJobs,
} from "../services/authApi";
import {
  Briefcase,
  CalendarDays,
  Clock,
  FileWarning,
  Users,
  Timer,
  UserCheck,
  FileText,
  Receipt,
  MessageSquare,
  ClipboardList,
  ChevronRight,
  BellRing,
  X,
  Bell,
} from "lucide-react-native";
import BrandLoader from "./BrandLoader";

const { width } = Dimensions.get("window");

const COLORS = {
  background: "#030508",
  surface: "#07111A",
  card: "#0D1421",
  cardBorder: "rgba(98, 97, 97, 0.83)",
  primary: "#00A99D",
  text: "#FFFFFF",
  textSecondary: "#94A3B8",
  textMuted: "#4A6080",
  success: "#34C88A",
  danger: "#F87171",
  warning: "#F59E0B",
  blue: "#4B9EF5",
  purple: "#A78BFA",
  heroBg1: "#0D1F2D",
  heroBg2: "#061014",
};

const ACCENTS = {
  teal: { icon: COLORS.primary, tint: "rgba(0,169,157,0.16)" },
  blue: { icon: COLORS.blue, tint: "rgba(75,158,245,0.16)" },
  purple: { icon: COLORS.purple, tint: "rgba(167,139,250,0.16)" },
  amber: { icon: COLORS.warning, tint: "rgba(245,166,35,0.16)" },
} as const;

const getExpiryStatus = (
  expiryStr?: string,
): "expired" | "expiring_soon" | "ok" | "none" => {
  if (!expiryStr) return "none";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryStr);
  expiry.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil(
    (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (diffDays < 0) return "expired";
  if (diffDays <= 30) return "expiring_soon";
  return "ok";
};

export default function HomeScreen({ navigation }: any) {
  const [sites, setSites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [userType, setUserType] = useState<"customer" | "contractor" | "staff">(
    "staff",
  );

  const [showJobAlert, setShowJobAlert] = useState(false);
  const slideAnim = useState(new Animated.Value(-120))[0]; // for smooth slide-in
  const [isActive, setIsActive] = useState<boolean>(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);

  const [availableJobsCount, setAvailableJobsCount] = useState(0);
  const [docsExpiringCount, setDocsExpiringCount] = useState(0);
  const [activeGuardsCount, setActiveGuardsCount] = useState(0);
  const [pendingAssigningCount, setPendingAssigningCount] = useState(0);
  const [statsLoading, setStatsLoading] = useState(true);
const isStaffooStaff = Number(user?.user_id) === 1;

// Job notifications only for:
// - contractors
// - staff whose parent user_id is 1
const canSeeJobNotifications =
  userType === "contractor" || (userType === "staff" && isStaffooStaff);
  const currentDate = new Date();
  const [weekStart] = useState(() => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() - d.getDay() + (d.getDay() === 0 ? -6 : 1));
    return d;
  });

  const formatDateMMDDYYYY = (date: Date) =>
    `${(date.getMonth() + 1).toString().padStart(2, "0")}-${date
      .getDate()
      .toString()
      .padStart(2, "0")}-${date.getFullYear()}`;

  const capitalizeWords = (text: string = "") =>
    text.replace(/\b\w/g, (char) => char.toUpperCase());

  const calculateTotalHours = (jobRoster: any[]) => {
    if (!jobRoster || jobRoster.length === 0) return 0;
    return jobRoster.reduce((total, job) => {
      if (job.start && job.end) {
        const start = new Date(job.start);
        const end = new Date(job.end);
        const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        return total + Math.max(0, hours);
      }
      return total;
    }, 0);
  };

  const fetchDashboardStats = async (
    type: "customer" | "contractor" | "staff",
    userData: any,
  ) => {
    if (!userData?.id) return;
    setStatsLoading(true);
    try {
      const token = await AsyncStorage.getItem("@auth_token");
      if (!token) return;

      if (type === "staff" || type === "contractor") {
        try {
          const res = await axios.get(
            `${BASE_URL}/jobs/available/${userData.id}`,
            { headers: { Authorization: `Bearer ${token}` } },
          );

          console.log(
            "AVAILABLE JOBS RAW →",
            JSON.stringify(res.data, null, 2),
          );

          const jobs = res.data?.data?.jobs;

          // Prefer full list length when available, fall back to paginator total
          let count = 0;

          if (Array.isArray(jobs?.data)) {
            count = jobs.data.length;
          } else if (Array.isArray(jobs)) {
            count = jobs.length;
          } else if (typeof jobs?.total === "number") {
            count = jobs.total;
          } else if (typeof res.data?.data?.total === "number") {
            count = res.data.data.total;
          }

          console.log("Final availableJobsCount →", count);
          setAvailableJobsCount(count);
        } catch (e) {
          console.log("Dashboard: available jobs count error", e);
        }
      }

      if (type === "staff") {
        try {
          const profileRes = await getUserProfile(userData.id);
          const docs =
            profileRes?.documents || profileRes?.data?.documents || [];
          const expiringCount = docs.filter((d: any) => {
            const status = getExpiryStatus(d.document_expiry);
            return status === "expired" || status === "expiring_soon";
          }).length;
          setDocsExpiringCount(expiringCount);
        } catch (e) {
          console.log("Dashboard: documents summary error", e);
        }
      }

      if (type === "contractor") {
        try {
          const staffRes = await getContractorStaff(userData.id);
          setActiveGuardsCount(
            Array.isArray(staffRes?.guards) ? staffRes.guards.length : 0,
          );
        } catch (e) {
          console.log("Dashboard: contractor staff count error", e);
        }

        try {
          const [todayRes, weekRes] = await Promise.all([
            postGuardJobs("confirmed", "today"),
            postGuardJobs("confirmed", "week"),
          ]);
          const todayJobs: any[] = Array.isArray(todayRes?.data)
            ? todayRes.data
            : [];
          const weekJobs: any[] = Array.isArray(weekRes?.data)
            ? weekRes.data
            : [];
          const unassigned = [...todayJobs, ...weekJobs].filter(
            (job) => !job.guards,
          ).length;
          setPendingAssigningCount(unassigned);
        } catch (e) {
          console.log("Dashboard: pending assigning count error", e);
        }
      }
    } finally {
      setStatsLoading(false);
    }
  };

  const [prevAvailableJobsCount, setPrevAvailableJobsCount] = useState<
    number | null
  >(null);
  const hasShownJobAlertRef = useRef(false);

useEffect(() => {
  if (!canSeeJobNotifications) return; // hide alert for other staff
  if (statsLoading) return;

  if (prevAvailableJobsCount === null) {
    setPrevAvailableJobsCount(availableJobsCount);

    if (availableJobsCount > 0 && !hasShownJobAlertRef.current) {
      hasShownJobAlertRef.current = true;
      setShowJobAlert(true);
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 9,
      }).start();
    }
    return;
  }

  if (
    availableJobsCount > prevAvailableJobsCount &&
    !hasShownJobAlertRef.current
  ) {
    hasShownJobAlertRef.current = true;
    setShowJobAlert(true);
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 65,
      friction: 9,
    }).start();
  }

  setPrevAvailableJobsCount(availableJobsCount);
}, [availableJobsCount, statsLoading, canSeeJobNotifications]);
  const closeJobAlert = () => {
    Animated.timing(slideAnim, {
      toValue: -120,
      duration: 220,
      useNativeDriver: true,
    }).start(() => setShowJobAlert(false));
  };

  const goToAvailableJobs = () => {
    closeJobAlert();
    // Change "AvailableJobs" to your real screen name
    navigation.navigate("StaffShifts");
  };

  const fetchCustomerSites = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem("@auth_token");
      const userStr = await AsyncStorage.getItem("user");

      if (!token || !userStr) return;

      const userData = JSON.parse(userStr);
      const start = formatDateMMDDYYYY(weekStart);
      const end = formatDateMMDDYYYY(
        new Date(weekStart.getTime() + 6 * 86400000),
      );

      const payload = {
        user_id: [userData.id],
        start,
        end,
        roster_id: "1",
        page: 1,
      };

      const res = await axios.post(`${BASE_URL}/job-details`, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (res.data?.success) {
        setSites(res.data.data || []);
      }
    } catch (err) {
      console.log("Fetch sites error:", err);
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string): string => {
    if (!name) return "U";
    const nameParts = name.trim().split(" ").filter(Boolean);
    if (nameParts.length === 1) return nameParts[0].charAt(0).toUpperCase();
    return (
      nameParts[0].charAt(0).toUpperCase() +
      nameParts[nameParts.length - 1].charAt(0).toUpperCase()
    );
  };

  const determineUserType = (
    userData: any,
  ): "customer" | "contractor" | "staff" => {
    if (!userData) return "staff";
    if (
      userData.role === "customer" ||
      userData.user_type === "customer" ||
      userData.type === "customer"
    )
      return "customer";
    if (
      userData.role === "contractor" ||
      userData.user_type === "contractor" ||
      userData.type === "contractor"
    )
      return "contractor";
    return "staff";
  };

  const capitalizeName = (name: string = "") =>
    name
      .toLowerCase()
      .split(" ")
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");

  useEffect(() => {
    fetchCustomerSites();
  }, []);

  useEffect(() => {
    const loadProfileAndLocation = async () => {
      const storedUser = await AsyncStorage.getItem("user");
      const cachedImage = await AsyncStorage.getItem("profileImage");

      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        setIsActive(parsedUser.is_active);

        const type = determineUserType(parsedUser);
        setUserType(type);

        if (cachedImage) {
          setProfileImage(cachedImage);
        } else if (parsedUser?.staff?.profile_image) {
          // const BASE_IMAGE_URL = "https://apis-staging.staffoo.com.au/storage/";
          const BASE_IMAGE_URL = "https://apis.staffoo.com.au/storage/";
          setProfileImage(`${BASE_IMAGE_URL}${parsedUser.staff.profile_image}`);
        }
      }
    };
    loadProfileAndLocation();
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchDashboardStats(userType, user);
  }, [user, userType]);

  const getStatusStyle = (status: string) => {
    switch (status?.toLowerCase()) {
      case "pending":
        return {
          backgroundColor: "#FEF3C7", // light yellow
          color: "#D97706",
        };

      case "confirmed":
        return {
          backgroundColor: "#DCFCE7", // light green
          color: "#16A34A",
        };

      case "completed":
        return {
          backgroundColor: "#DBEAFE", // light blue
          color: "#2563EB",
        };

      default:
        return {
          backgroundColor: "#E5E7EB",
          color: "#64748B",
        };
    }
  };

  const thisWeekHours = calculateTotalHours(sites);
  const upcomingShiftsCount = sites.length;
  const activeJobsCount = new Set(
    sites.map((s: any) => s.site?.id ?? s.site_id ?? s.id),
  ).size;

  const bannerContent = {
    title:
      userType === "customer"
        ? "Post Jobs & Manage Your Workforce"
        : userType === "contractor"
        ? "Manage Your Team & Schedule Shifts"
        : "Discover Your Next Opportunity",
  };

  // if (loading) {
  //   return (
  //     <SafeAreaView
  //       style={{
  //         flex: 1,
  //         justifyContent: "center",
  //         alignItems: "center",
  //         backgroundColor: "#030508",
  //       }}
  //     >
  //       <ActivityIndicator size="large" color={COLORS.primary} />
  //       <Text style={{ marginTop: 15, fontSize: 16, color: "#fff" }}>
  //         Loading profile...
  //       </Text>
  //     </SafeAreaView>
  //   );
  // }
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <BrandLoader size={60} />

        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Fixed Header */}
      {/* Fixed Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.avatarBox}
          onPress={() => navigation.navigate("ProfileSetup")}
        >
          {profileImage ? (
            <Image source={{ uri: profileImage }} style={styles.avatar} />
          ) : (
            <View style={styles.initialsAvatar}>
              <Text style={styles.initialsText}>
                {getInitials(user?.name || "User")}
              </Text>
            </View>
          )}
          <View style={styles.welcomeContent}>
            <Text style={styles.welcomeText}>Welcome back!</Text>
            <View style={styles.nameRow}>
              <Text style={styles.name} numberOfLines={2} ellipsizeMode="tail">
                {capitalizeName(user?.name || "User Name")}
              </Text>
            </View>
          </View>
        </TouchableOpacity>

      {canSeeJobNotifications && (
  <TouchableOpacity
    style={styles.bellButton}
    activeOpacity={0.7}
    onPress={() => {
      if (availableJobsCount > 0) {
        navigation.navigate("StaffShifts");
      }
    }}
  >
    <View style={styles.bellIconWrapper}>
      {availableJobsCount > 0 ? (
        <BellRing size={22} color={COLORS.primary} />
      ) : (
        <Bell size={22} color={COLORS.textSecondary} />
      )}

      {availableJobsCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {availableJobsCount > 9 ? "9+" : availableJobsCount}
          </Text>
        </View>
      )}
    </View>
  </TouchableOpacity>
)}
      </View>

      {/* Hero Banner */}
      <LinearGradient
        colors={[COLORS.heroBg1, COLORS.heroBg2]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroCard}
      >
        <Text style={styles.heroTitle}>{bannerContent.title}</Text>
        <Text style={styles.heroSubtitle}>
          {userType === "customer"
            ? `This week · ${upcomingShiftsCount} shift${
                upcomingShiftsCount === 1 ? "" : "s"
              } across ${activeJobsCount} job${
                activeJobsCount === 1 ? "" : "s"
              }`
            : `This week · ${thisWeekHours.toFixed(
                1,
              )} hours across ${upcomingShiftsCount} shift${
                upcomingShiftsCount === 1 ? "" : "s"
              }`}
        </Text>
      </LinearGradient>

      {/* Main Scroll - Starts from Overview */}
      <ScrollView
        style={styles.mainScroll}
        contentContainerStyle={styles.mainScrollContent}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled={true}
      >
        {/* Overview Section */}
        <View style={styles.section}>
          {userType !== "customer" && userType !== "contractor" && (
            <Text style={styles.overviewText}>Overview</Text>
          )}
          <View style={styles.statsGrid}>
            {userType === "staff" && (
              <>
                <View style={styles.statCard}>
                  <View
                    style={[
                      styles.statIconBadge,
                      { backgroundColor: ACCENTS.teal.tint },
                    ]}
                  >
                    <Clock size={16} color={ACCENTS.teal.icon} />
                  </View>
                  <Text style={styles.statLabel}>This week</Text>
                  <Text style={styles.statValue}>
                    {thisWeekHours.toFixed(1)} hrs
                  </Text>
                </View>
                <View style={styles.statCard}>
                  <View
                    style={[
                      styles.statIconBadge,
                      { backgroundColor: ACCENTS.blue.tint },
                    ]}
                  >
                    <CalendarDays size={16} color={ACCENTS.blue.icon} />
                  </View>
                  <Text style={styles.statLabel}>Upcoming</Text>
                  <Text style={styles.statValue}>
                    {upcomingShiftsCount} shifts
                  </Text>
                </View>
                <View style={styles.statCard}>
                  <View
                    style={[
                      styles.statIconBadge,
                      { backgroundColor: ACCENTS.purple.tint },
                    ]}
                  >
                    <Briefcase size={16} color={ACCENTS.purple.icon} />
                  </View>
                  <Text style={styles.statLabel}>New offers</Text>
                  <Text style={styles.statValue}>
                    {statsLoading ? "—" : availableJobsCount}
                  </Text>
                </View>
                <View style={styles.statCard}>
                  <View
                    style={[
                      styles.statIconBadge,
                      { backgroundColor: ACCENTS.amber.tint },
                    ]}
                  >
                    <FileWarning size={16} color={ACCENTS.amber.icon} />
                  </View>

                  <Text style={styles.statLabel}>Documents Expiring</Text>

                  <Text style={styles.statValue}>
                    {statsLoading ? "—" : docsExpiringCount}
                  </Text>
                </View>
              </>
            )}

            {/* Add Contractor and Customer cards here if needed */}
          </View>

          {userType === "staff" && (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => navigation.navigate("Documents")}
              style={[
                styles.docsRow,
                !statsLoading && docsExpiringCount > 0 && styles.docsRowAlert,
              ]}
            >
              <View
                style={[
                  styles.statIconBadge,
                  {
                    backgroundColor:
                      !statsLoading && docsExpiringCount > 0
                        ? ACCENTS.amber.tint
                        : ACCENTS.teal.tint,
                  },
                ]}
              >
                <FileText
                  size={16}
                  color={
                    !statsLoading && docsExpiringCount > 0
                      ? ACCENTS.amber.icon
                      : ACCENTS.teal.icon
                  }
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.docsRowLabel}>Documents</Text>
                <Text style={styles.docsRowText}>
                  {statsLoading
                    ? "Checking your documents…"
                    : docsExpiringCount > 0
                    ? `${docsExpiringCount} document${
                        docsExpiringCount === 1 ? "" : "s"
                      } need attention`
                    : "All documents up to date"}
                </Text>
              </View>
              <ChevronRight size={18} color={COLORS.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Shifts Section with its own ScrollView */}
        {/* Shifts Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Shifts This Week</Text>
            {sites.length > 0 && (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => navigation.navigate("Applications")}
              >
                <Text style={styles.seeAll}>See All</Text>
              </TouchableOpacity>
            )}
          </View>

          <View
            style={[
              styles.shiftsWrapper,
              userType === "staff"
                ? styles.shiftsWrapperStaff
                : styles.shiftsWrapperFull,
            ]}
          >
            <ScrollView
              nestedScrollEnabled={true}
              showsVerticalScrollIndicator={true}
              contentContainerStyle={styles.shiftsScrollContent}
            >
              {sites.length === 0 ? (
                <Text style={styles.noShiftText}>
                  No shifts found this week.
                </Text>
              ) : (
                sites.map((job: any) => {
                  const status = job.job_status?.toLowerCase();
                  const shiftDate = job.start
                    ? new Date(job.start).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })
                    : "--";
                  const startTime =
                    job.start?.split(" ")[1]?.slice(0, 5) || "--:--";
                  const endTime =
                    job.end?.split(" ")[1]?.slice(0, 5) || "--:--";

                  return (
                    <LinearGradient
                      key={job.id}
                      colors={[COLORS.heroBg1, COLORS.heroBg2]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.siteCard}
                    >
                      <View style={styles.siteCardInner}>
                        <Text style={styles.siteName}>
                          {job.site?.site_name || "Unnamed Site"}
                        </Text>
                        <Text style={styles.siteAddress}>
                          {job.site?.address || "No address available"}
                        </Text>
                        <Text style={styles.totalHours}>
                          Total Hours: {job.hours || 0}
                        </Text>

                        <View style={styles.shiftRow}>
                          <View>
                            <Text style={styles.shiftDate}>{shiftDate}</Text>
                            <Text style={styles.shiftTime}>
                              {startTime} - {endTime}
                            </Text>
                          </View>
                          <Text
                            style={styles.guardName}
                            numberOfLines={2}
                            ellipsizeMode="tail"
                          >
                            {job.guards?.name
                              ? capitalizeWords(job.guards.name)
                              : "Unassigned"}
                          </Text>
                          <View
                            style={[
                              styles.statusBadge,
                              getStatusStyle(status || "pending"),
                            ]}
                          >
                            <Text
                              style={[
                                styles.statusText,
                                {
                                  color: getStatusStyle(status || "pending")
                                    .color,
                                },
                              ]}
                            >
                              {status || "pending"}
                            </Text>
                          </View>
                        </View>
                      </View>
                    </LinearGradient>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </ScrollView>

      {/* ========== NEW JOB NOTIFICATION POPUP ========== */}
      <Modal
        transparent
        visible={showJobAlert}
        animationType="none"
        statusBarTranslucent
      >
        <Pressable style={styles.overlay} onPress={closeJobAlert}>
          <Animated.View
            style={[
              styles.notificationCard,
              { transform: [{ translateY: slideAnim }] },
            ]}
          >
            {/* Accent bar */}
            <View style={styles.accentBar} />

            <View style={styles.notificationContent}>
              {/* Icon */}
              <View style={styles.notificationIconBox}>
                <BellRing size={24} color={COLORS.primary} />
              </View>

              {/* Text */}
              {/* <View style={{ flex: 1 }}>
                <Text style={styles.notificationTitle}>New Job Available!</Text>
                <Text style={styles.notificationMessage}>
                  A new shift is ready to cover. Tap to view details.
                </Text>
              </View> */}

              <View style={{ flex: 1 }}>
                <Text style={styles.notificationTitle}>
                  {availableJobsCount === 1
                    ? "New Job Available"
                    : `${availableJobsCount} New Jobs Available`}
                </Text>
                <Text style={styles.notificationMessage}>
                  {availableJobsCount === 1
                    ? "A new shift is waiting for you. Tap to view details."
                    : "New shifts are waiting for you. Tap to view details."}
                </Text>
              </View>

              {/* Close button */}
              <TouchableOpacity onPress={closeJobAlert} hitSlop={12}>
                <X size={18} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Action buttons */}
            <View style={styles.notificationActions}>
              <TouchableOpacity
                style={styles.btnSecondary}
                onPress={closeJobAlert}
                activeOpacity={0.8}
              >
                <Text style={styles.btnSecondaryText}>Later</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.btnPrimary}
                onPress={goToAvailableJobs}
                activeOpacity={0.85}
              >
                <Text style={styles.btnPrimaryText}>
                  {availableJobsCount === 1 ? "View Job" : "View Jobs"}
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingTop: 25,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  avatarBox: { flexDirection: "row", alignItems: "center" },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  initialsAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.surface,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  welcomeContent: { marginLeft: 12 },
  welcomeText: { fontSize: 13, color: COLORS.textSecondary },
  nameRow: { flexDirection: "row", alignItems: "center" },
  name: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
    maxWidth: width - 130,
  },
  helloIcon: { width: 20, height: 20, marginLeft: 6 },

  heroCard: {
    marginHorizontal: 15,
    // marginVertical: 10,
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  heroTitle: { fontSize: 21, fontWeight: "800", color: COLORS.text },
  heroSubtitle: { fontSize: 13, color: COLORS.textSecondary, marginTop: 6 },

  mainScroll: { flex: 1 },
  mainScrollContent: { paddingBottom: 100 },

  section: { paddingHorizontal: 15, marginBottom: 10 },
  eyebrow: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.textMuted,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  statCard: {
    width: "48.5%",
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    padding: 10,
    marginBottom: 10,
  },
  statIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },
  statLabel: { fontSize: 12, color: COLORS.textSecondary },
  statValue: { fontSize: 18, fontWeight: "700", color: COLORS.text },

  docsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    padding: 12,
    // marginTop: 10,
  },
  docsRowAlert: {
    borderColor: "rgba(245,166,35,0.4)",
    backgroundColor: "rgba(245,166,35,0.06)",
  },
  docsRowLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.textMuted,
    textTransform: "uppercase",
  },
  docsRowText: { fontSize: 13, color: COLORS.text, fontWeight: "600" },

  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 16, fontWeight: "800", color: COLORS.text },
  seeAll: { color: COLORS.primary, fontWeight: "600" },

  siteCardInner: { padding: 12 },
  siteName: { fontSize: 16, fontWeight: "700", color: COLORS.text },
  siteAddress: { fontSize: 12, color: COLORS.textSecondary, marginVertical: 6 },
  totalHours: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.primary,
    marginBottom: 10,
  },
  shiftRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.cardBorder,
  },
  shiftDate: { fontSize: 12, color: COLORS.textSecondary },
  shiftTime: { fontSize: 13, color: COLORS.text, fontWeight: "500" },
  guardName: {
    flex: 1,
    marginHorizontal: 30,
    color: COLORS.text,
    fontSize: 12,
    fontWeight: "400",
    // flexShrink: 1,
  },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  statusText: { fontSize: 11, fontWeight: "600", textTransform: "capitalize" },

  initialsText: { color: COLORS.text, fontSize: 20, fontWeight: "700" },
  noShiftText: {
    padding: 40,
    color: "#666",
    textAlign: "center",
    fontSize: 15,
  },
  overviewText: {
    fontSize: 10,
    fontWeight: "600",
    // marginBottom: 10,
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
  shiftsWrapper: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    overflow: "hidden",
    // backgroundColor: COLORS.card,
  },

  shiftsWrapperStaff: {
    maxHeight: 420, // Compact for Staff
  },

  shiftsWrapperFull: {
    maxHeight: Dimensions.get("window").height * 0.6, // ~55% of screen for Customer/Contractor
  },

  shiftsScrollContent: {
    padding: 12,
    paddingBottom: 20,
  },

  siteCard: {
    marginBottom: 12,
    borderRadius: 12,
    overflow: "hidden",
  },

  // Notification Bell
  bellButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.surface,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  bellIconWrapper: {
    position: "relative",
  },
  badge: {
    position: "absolute",
    top: -6,
    right: -8,
    backgroundColor: COLORS.danger,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: COLORS.background,
  },
  badgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
  },

  // Custom Notification Popup
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-start",
    paddingTop: 60,
    paddingHorizontal: 16,
  },
  notificationCard: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 12,
  },
  accentBar: {
    height: 4,
    backgroundColor: COLORS.primary,
  },
  notificationContent: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 16,
    gap: 12,
  },
  notificationIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(0,169,157,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 4,
  },
  notificationMessage: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  notificationActions: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  btnSecondary: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    justifyContent: "center",
    alignItems: "center",
  },
  btnSecondaryText: {
    color: COLORS.textSecondary,
    fontWeight: "600",
    fontSize: 14,
  },
  btnPrimary: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  btnPrimaryText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
});
