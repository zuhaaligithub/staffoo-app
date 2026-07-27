// import React, { useState, useEffect } from "react";
// import {
//   View,
//   Text,
//   Image,
//   TouchableOpacity,
//   StyleSheet,
//   ScrollView,
//   Platform,
//   Linking,
//   Alert,
//   PermissionsAndroid,
//   ActivityIndicator,
//   SafeAreaView,
//   StatusBar,
//   Dimensions,
// } from "react-native";
// import Geolocation from "react-native-geolocation-service";
// import BottomTab from "./BottomTab";
// import AsyncStorage from "@react-native-async-storage/async-storage";
// import axios from "axios";
// import LinearGradient from "react-native-linear-gradient";
// import {
//   BASE_URL,
//   getUserProfile,
//   getContractorStaff,
//   postGuardJobs,
// } from "../services/authApi";
// import {
//   Briefcase,
//   CalendarDays,
//   Clock,
//   FileWarning,
//   Users,
//   Timer,
//   UserCheck,
//   FileText,
//   Receipt,
//   MessageSquare,
//   ClipboardList,
//   ChevronRight,
// } from "lucide-react-native";

// const { width } = Dimensions.get("window");

// const COLORS = {
//   background: "#030508",
//   surface: "#07111A",
//   card: "#0D1421", // ← Used everywhere for cards
//   cardBorder: "rgba(98, 97, 97, 0.83)",
//   primary: "#00A99D",
//   primaryGlow: "rgba(0,169,157,0.25)",
//   primaryBorder: "rgba(0,169,157,0.25)",
//   text: "#FFFFFF",
//   textSecondary: "#94A3B8",
//   textMuted: "#4A6080",
//   success: "#34C88A",
//   danger: "#F87171",
//   warning: "#F59E0B",
//   // Same blue/purple already used for icon accents elsewhere in this app
//   // (e.g. ApplicationsScreen's detail-card icons) — reused here so the
//   // dashboard's category color-coding reads as part of the same system.
//   blue: "#4B9EF5",
//   purple: "#A78BFA",
//   heroBg1: "#0D1F2D",
//   heroBg2: "#061014",
// };

// // Per-category accent used to color-code stat cards / quick actions so
// // related things (time, schedule, people, needs-attention) are visually
// // grouped at a glance rather than every card looking identical.
// const ACCENTS = {
//   teal: { icon: COLORS.primary, tint: "rgba(0,169,157,0.16)" },
//   blue: { icon: COLORS.blue, tint: "rgba(75,158,245,0.16)" },
//   purple: { icon: COLORS.purple, tint: "rgba(167,139,250,0.16)" },
//   amber: { icon: COLORS.warning, tint: "rgba(245,166,35,0.16)" },
// } as const;

// // Same expiry-window logic as DocumentsScreen.tsx's getExpiryStatus — kept
// // as a small local copy here rather than a cross-file import, matching how
// // small helpers are already duplicated per-screen elsewhere in this app.
// const getExpiryStatus = (
//   expiryStr?: string,
// ): "expired" | "expiring_soon" | "ok" | "none" => {
//   if (!expiryStr) return "none";
//   const today = new Date();
//   today.setHours(0, 0, 0, 0);
//   const expiry = new Date(expiryStr);
//   expiry.setHours(0, 0, 0, 0);
//   const diffDays = Math.ceil(
//     (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
//   );
//   if (diffDays < 0) return "expired";
//   if (diffDays <= 30) return "expiring_soon";
//   return "ok";
// };

// export default function HomeScreen({ navigation }: any) {
//   const [sites, setSites] = useState<any[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [user, setUser] = useState<any>(null);
//   const [userType, setUserType] = useState<"customer" | "contractor" | "staff">(
//     "staff",
//   );
//   const [isActive, setIsActive] = useState<boolean>(false);
//   const [profileImage, setProfileImage] = useState<string | null>(null);
//   const [currentLocation, setCurrentLocation] = useState<{
//     latitude: number;
//     longitude: number;
//   } | null>(null);

//   // ── Dashboard stats (replaces the old static banner/category blocks) ──
//   // Each of these is backed by an endpoint already used elsewhere in the
//   // app (see the comment above fetchDashboardStats for exactly which).
//   const [availableJobsCount, setAvailableJobsCount] = useState(0);
//   const [docsExpiringCount, setDocsExpiringCount] = useState(0);
//   const [activeGuardsCount, setActiveGuardsCount] = useState(0);
//   const [pendingAssigningCount, setPendingAssigningCount] = useState(0);
//   const [statsLoading, setStatsLoading] = useState(true);

//   const formatDateMMDDYYYY = (date: Date) =>
//     `${(date.getMonth() + 1).toString().padStart(2, "0")}-${date
//       .getDate()
//       .toString()
//       .padStart(2, "0")}-${date.getFullYear()}`;

//   const currentDate = new Date();
//   const [weekStart] = useState(() => {
//     const d = new Date(currentDate);
//     d.setDate(d.getDate() - d.getDay() + (d.getDay() === 0 ? -6 : 1));
//     return d;
//   });

//   const capitalizeWords = (text: string = "") =>
//     text.replace(/\b\w/g, (char) => char.toUpperCase());

//   const calculateTotalHours = (jobRoster: any[]) => {
//     if (!jobRoster || jobRoster.length === 0) return 0;
//     return jobRoster.reduce((total, job) => {
//       if (job.start && job.end) {
//         const start = new Date(job.start);
//         const end = new Date(job.end);
//         const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
//         return total + Math.max(0, hours);
//       }
//       return total;
//     }, 0);
//   };

//   // ── Dashboard stats ──────────────────────────────────────────────────────
//   // Every number here comes from an endpoint already called elsewhere in
//   // the app — nothing new on the backend:
//   //   • availableJobsCount  → GET /jobs/available/{userId}      (same call AvailableJobsScreen makes)
//   //   • docsExpiringCount   → getUserProfile(userId).documents  (same data DocumentsScreen renders)
//   //   • activeGuardsCount   → getContractorStaff(userId)        (same call WeeklyRosterScreen makes)
//   //   • pendingAssigningCount → postGuardJobs("confirmed","today"/"week"), counting entries with no guard
//   //     (mirrors useStaffShiftsController's shiftHasAssignedGuard filter for its "Pending Assigning" tab)
//   const fetchDashboardStats = async (
//     type: "customer" | "contractor" | "staff",
//     userData: any,
//   ) => {
//     if (!userData?.id) return;
//     setStatsLoading(true);

//     try {
//       const token = await AsyncStorage.getItem("@auth_token");
//       if (!token) return;

//       if (type === "staff" || type === "contractor") {
//         try {
//           const res = await axios.get(
//             `${BASE_URL}/jobs/available/${userData.id}`,
//             { headers: { Authorization: `Bearer ${token}` } },
//           );
//           setAvailableJobsCount(res.data?.data?.jobs?.total || 0);
//         } catch (e) {
//           console.log("Dashboard: available jobs count error", e);
//         }
//       }

//       if (type === "staff") {
//         try {
//           const profileRes = await getUserProfile(userData.id);
//           const docs =
//             profileRes?.documents || profileRes?.data?.documents || [];
//           const expiringCount = docs.filter((d: any) => {
//             const status = getExpiryStatus(d.document_expiry);
//             return status === "expired" || status === "expiring_soon";
//           }).length;
//           setDocsExpiringCount(expiringCount);
//         } catch (e) {
//           console.log("Dashboard: documents summary error", e);
//         }
//       }

//       if (type === "contractor") {
//         try {
//           const staffRes = await getContractorStaff(userData.id);
//           setActiveGuardsCount(
//             Array.isArray(staffRes?.guards) ? staffRes.guards.length : 0,
//           );
//         } catch (e) {
//           console.log("Dashboard: contractor staff count error", e);
//         }

//         try {
//           const [todayRes, weekRes] = await Promise.all([
//             postGuardJobs("confirmed", "today"),
//             postGuardJobs("confirmed", "week"),
//           ]);
//           const todayJobs: any[] = Array.isArray(todayRes?.data)
//             ? todayRes.data
//             : [];
//           const weekJobs: any[] = Array.isArray(weekRes?.data)
//             ? weekRes.data
//             : [];
//           const unassigned = [...todayJobs, ...weekJobs].filter(
//             (job) => !job.guards,
//           ).length;
//           setPendingAssigningCount(unassigned);
//         } catch (e) {
//           console.log("Dashboard: pending assigning count error", e);
//         }
//       }
//     } finally {
//       setStatsLoading(false);
//     }
//   };

//   const fetchCustomerSites = async () => {
//     setLoading(true);

//     try {
//       const token = await AsyncStorage.getItem("@auth_token");
//       const userStr = await AsyncStorage.getItem("user");

//       if (!token || !userStr) {
//         setLoading(false);
//         return;
//       }

//       const userData = JSON.parse(userStr);

//       const start = formatDateMMDDYYYY(weekStart);
//       const end = formatDateMMDDYYYY(
//         new Date(weekStart.getTime() + 6 * 86400000),
//       );

//       const payload = {
//         user_id: [userData.id],
//         start,
//         end,
//         roster_id: "1",
//         page: 1,
//       };

//       console.log("Job Details Payload:", payload);

//       const res = await axios.post(`${BASE_URL}/job-details`, payload, {
//         headers: {
//           Authorization: `Bearer ${token}`,
//           "Content-Type": "application/json",
//         },
//       });

//       if (res.data?.success) {
//         setSites(res.data.data || []);
//       }
//     } catch (err) {
//       console.log("Fetch sites error:", err);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const getInitials = (name: string): string => {
//     if (!name) return "U";
//     const nameParts = name.trim().split(" ").filter(Boolean);
//     if (nameParts.length === 1) {
//       return nameParts[0].charAt(0).toUpperCase();
//     }
//     return (
//       nameParts[0].charAt(0).toUpperCase() +
//       nameParts[nameParts.length - 1].charAt(0).toUpperCase()
//     );
//   };

//   // Determine user type
//   const determineUserType = (
//     userData: any,
//   ): "customer" | "contractor" | "staff" => {
//     if (!userData) return "staff";

//     // Adjust these conditions based on your actual user object structure
//     if (
//       userData.role === "customer" ||
//       userData.user_type === "customer" ||
//       userData.type === "customer"
//     ) {
//       return "customer";
//     }
//     if (
//       userData.role === "contractor" ||
//       userData.user_type === "contractor" ||
//       userData.type === "contractor"
//     ) {
//       return "contractor";
//     }
//     // Default to staff (has staff profile)
//     if (
//       userData.staff ||
//       userData.role === "staff" ||
//       userData.user_type === "staff"
//     ) {
//       return "staff";
//     }
//     return "staff";
//   };

//   useEffect(() => {
//     fetchCustomerSites();
//   }, []);

//   useEffect(() => {
//     const loadProfileAndLocation = async () => {
//       const storedUser = await AsyncStorage.getItem("user");
//       const cachedImage = await AsyncStorage.getItem("profileImage");

//       if (storedUser) {
//         const parsedUser = JSON.parse(storedUser);
//         setUser(parsedUser);
//         setIsActive(parsedUser.is_active);

//         // Set user type
//         const type = determineUserType(parsedUser);
//         setUserType(type);

//         // Priority: Cached Image > API Data Image
//         if (cachedImage) {
//           setProfileImage(cachedImage);
//         } else if (parsedUser?.staff?.profile_image) {
//           // const BASE_IMAGE_URL = "https://apis.staffoo.com.au/storage/";
//           const BASE_IMAGE_URL = "https://apis-staging.staffoo.com.au/storage/";
//           setProfileImage(`${BASE_IMAGE_URL}${parsedUser.staff.profile_image}`);
//         }
//       }
//     };
//     loadProfileAndLocation();
//   }, []);

//   // Runs once the real user/userType are known (they start as null/"staff"
//   // defaults, so this is gated on `user` being loaded rather than on mount).
//   useEffect(() => {
//     if (!user) return;
//     fetchDashboardStats(userType, user);
//   }, [user, userType]);

//   const capitalizeName = (name: string = "") => {
//     return name
//       .toLowerCase()
//       .split(" ")
//       .filter(Boolean)
//       .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
//       .join(" ");
//   };

//   const sortedSites = [...sites].sort((siteA, siteB) => {
//     const latestA = siteA.job_roster?.length
//       ? Math.max(
//           ...siteA.job_roster.map((j: any) => new Date(j.start).getTime()),
//         )
//       : 0;
//     const latestB = siteB.job_roster?.length
//       ? Math.max(
//           ...siteB.job_roster.map((j: any) => new Date(j.start).getTime()),
//         )
//       : 0;
//     return latestB - latestA;
//   });

//   const displayedSites = sortedSites.slice(0, 2);
//   const hasMoreSites = sites.length > 2;

//   // Dynamic banner content based on user type
//   const getBannerContent = () => {
//     switch (userType) {
//       case "customer":
//         return {
//           title: "Post Jobs & Manage\nYour Workforce",
//           infoTitle: "💼 Active Opportunities",
//           infoSubtitle: "Post • Assign • Track",
//         };
//       case "contractor":
//         return {
//           title: "Manage Your Team &\nSchedule Shifts",
//           infoTitle: "👷 Crew Management",
//           infoSubtitle: "Assign • Monitor • Optimize",
//         };
//       case "staff":
//       default:
//         return {
//           title: "Discover Your Next\nOpportunity",
//           infoTitle: "💼 Jobs Available",
//           infoSubtitle: "Full Time • Part Time • Contract",
//         };
//     }
//   };

//   const bannerContent = getBannerContent();

//   // Derived purely from `sites` (already fetched above via /job-details) —
//   // no extra API calls needed for these three.
//   const thisWeekHours = calculateTotalHours(sites);
//   const upcomingShiftsCount = sites.length;
//   const activeJobsCount = new Set(
//     sites.map((s: any) => s.site?.id ?? s.site_id ?? s.id),
//   ).size;

//   if (loading) {
//     return (
//       <SafeAreaView
//         style={{
//           flex: 1,
//           justifyContent: "center",
//           alignItems: "center",
//           backgroundColor: "#030508",
//         }}
//       >
//         <ActivityIndicator size="large" color={COLORS.primary} />
//         <Text style={{ marginTop: 15, fontSize: 16, color: "#fff" }}>
//           Loading profile...
//         </Text>
//       </SafeAreaView>
//     );
//   }

//   return (
//     <SafeAreaView style={styles.container}>
//       <StatusBar barStyle="dark-content" backgroundColor="#fff" />

//       {/* Fixed Header */}
//       <View style={styles.header}>
//         <TouchableOpacity
//           style={styles.avatarBox}
//           onPress={() => navigation.navigate("ProfileSetup")}
//         >
//           {profileImage ? (
//             <Image source={{ uri: profileImage }} style={styles.avatar} />
//           ) : (
//             <View style={styles.initialsAvatar}>
//               <Text style={styles.initialsText}>
//                 {getInitials(user?.name || "User")}
//               </Text>
//             </View>
//           )}
//           <View style={styles.welcomeContent}>
//             <Text style={styles.welcomeText}>Welcome back!</Text>
//             <View style={styles.nameRow}>
//               <Text style={styles.name}>
//                 {capitalizeName(user?.name || "User Name")}
//               </Text>
//               <Image
//                 source={require("../assets/hello.png")}
//                 style={styles.helloIcon}
//               />
//             </View>
//           </View>
//         </TouchableOpacity>
//       </View>
//       <View style={{ flex: 1 }}>
//         <View style={styles.fixedTopSection}>
//           <LinearGradient
//             colors={[COLORS.heroBg1, COLORS.heroBg2]}
//             start={{ x: 0, y: 0 }}
//             end={{ x: 1, y: 1 }}
//             style={styles.heroCard}
//           >
//             <Text style={styles.heroTitle}>
//               {bannerContent.title.replace("\n", " ")}
//             </Text>
//             <Text style={styles.heroSubtitle}>
//               {userType === "customer"
//                 ? `This week · ${upcomingShiftsCount} shift${
//                     upcomingShiftsCount === 1 ? "" : "s"
//                   } across ${activeJobsCount} job${
//                     activeJobsCount === 1 ? "" : "s"
//                   }`
//                 : `This week · ${thisWeekHours} hours across ${upcomingShiftsCount} shift${
//                     upcomingShiftsCount === 1 ? "" : "s"
//                   }`}
//             </Text>
//           </LinearGradient>

//           {/* ── Stats grid — replaces the old static banner card. Every
//               number here is real, sourced from an endpoint already used
//               elsewhere in the app (see fetchDashboardStats). Each card's
//               icon badge is color-coded by category (time / schedule /
//               jobs / needs-attention) so related figures group visually. ── */}

//           <View style={styles.section}>
//             <Text style={styles.eyebrow}>Overview</Text>
//             <View style={styles.statsGrid}>
//               {userType === "staff" && (
//                 <>
//                   <View style={styles.statCard}>
//                     <View
//                       style={[
//                         styles.statIconBadge,
//                         { backgroundColor: ACCENTS.teal.tint },
//                       ]}
//                     >
//                       <Clock size={16} color={ACCENTS.teal.icon} />
//                     </View>
//                     <Text style={styles.statLabel}>This week</Text>
//                     <Text style={styles.statValue}>
//                       {thisWeekHours.toFixed(1)} hrs
//                     </Text>
//                   </View>
//                   <View style={styles.statCard}>
//                     <View
//                       style={[
//                         styles.statIconBadge,
//                         { backgroundColor: ACCENTS.blue.tint },
//                       ]}
//                     >
//                       <CalendarDays size={16} color={ACCENTS.blue.icon} />
//                     </View>
//                     <Text style={styles.statLabel}>Upcoming</Text>
//                     <Text style={styles.statValue}>
//                       {upcomingShiftsCount} shifts
//                     </Text>
//                   </View>
//                   <View style={styles.statCard}>
//                     <View
//                       style={[
//                         styles.statIconBadge,
//                         { backgroundColor: ACCENTS.purple.tint },
//                       ]}
//                     >
//                       <Briefcase size={16} color={ACCENTS.purple.icon} />
//                     </View>
//                     <Text style={styles.statLabel}>New offers</Text>
//                     <Text style={styles.statValue}>
//                       {statsLoading ? "—" : availableJobsCount}
//                     </Text>
//                   </View>
//                   <View style={styles.statCard}>
//                     <View
//                       style={[
//                         styles.statIconBadge,
//                         { backgroundColor: ACCENTS.amber.tint },
//                       ]}
//                     >
//                       <FileWarning size={16} color={ACCENTS.amber.icon} />
//                     </View>
//                     <Text style={styles.statLabel}>Docs expiring</Text>
//                     <Text style={styles.statValue}>
//                       {statsLoading ? "—" : docsExpiringCount}
//                     </Text>
//                   </View>
//                 </>
//               )}

//               {userType === "contractor" && (
//                 <>
//                   <View style={styles.statCard}>
//                     <View
//                       style={[
//                         styles.statIconBadge,
//                         { backgroundColor: ACCENTS.amber.tint },
//                       ]}
//                     >
//                       <ClipboardList size={16} color={ACCENTS.amber.icon} />
//                     </View>
//                     <Text style={styles.statLabel}>Pending assigning</Text>
//                     <Text style={styles.statValue}>
//                       {statsLoading ? "—" : pendingAssigningCount}
//                     </Text>
//                   </View>
//                   <View style={styles.statCard}>
//                     <View
//                       style={[
//                         styles.statIconBadge,
//                         { backgroundColor: ACCENTS.blue.tint },
//                       ]}
//                     >
//                       <Users size={16} color={ACCENTS.blue.icon} />
//                     </View>
//                     <Text style={styles.statLabel}>Active guards</Text>
//                     <Text style={styles.statValue}>
//                       {statsLoading ? "—" : activeGuardsCount}
//                     </Text>
//                   </View>
//                   <View style={styles.statCard}>
//                     <View
//                       style={[
//                         styles.statIconBadge,
//                         { backgroundColor: ACCENTS.blue.tint },
//                       ]}
//                     >
//                       <CalendarDays size={16} color={ACCENTS.blue.icon} />
//                     </View>
//                     <Text style={styles.statLabel}>Shifts this week</Text>
//                     <Text style={styles.statValue}>{upcomingShiftsCount}</Text>
//                   </View>
//                   <View style={styles.statCard}>
//                     <View
//                       style={[
//                         styles.statIconBadge,
//                         { backgroundColor: ACCENTS.teal.tint },
//                       ]}
//                     >
//                       <Timer size={16} color={ACCENTS.teal.icon} />
//                     </View>
//                     <Text style={styles.statLabel}>Team hours</Text>
//                     <Text style={styles.statValue}>{thisWeekHours} hours</Text>
//                   </View>
//                 </>
//               )}

//               {userType === "customer" && (
//                 <>
//                   <View style={styles.statCard}>
//                     <View
//                       style={[
//                         styles.statIconBadge,
//                         { backgroundColor: ACCENTS.purple.tint },
//                       ]}
//                     >
//                       <Briefcase size={16} color={ACCENTS.purple.icon} />
//                     </View>
//                     <Text style={styles.statLabel}>Active jobs</Text>
//                     <Text style={styles.statValue}>{activeJobsCount}</Text>
//                   </View>
//                   <View style={styles.statCard}>
//                     <View
//                       style={[
//                         styles.statIconBadge,
//                         { backgroundColor: ACCENTS.blue.tint },
//                       ]}
//                     >
//                       <CalendarDays size={16} color={ACCENTS.blue.icon} />
//                     </View>
//                     <Text style={styles.statLabel}>Upcoming shifts</Text>
//                     <Text style={styles.statValue}>{upcomingShiftsCount}</Text>
//                   </View>
//                 </>
//               )}
//             </View>

//             {/* ── Documents banner — replaces "Browse By Category". Staff
//                 only. Its color reflects severity: amber while something
//                 needs attention, a quieter neutral tone once everything's
//                 current — the color itself carries the status, not just
//                 the copy. ── */}
//             {userType === "staff" && (
//               <TouchableOpacity
//                 activeOpacity={0.85}
//                 onPress={() => navigation.navigate("Documents")}
//                 style={[
//                   styles.docsRow,
//                   !statsLoading && docsExpiringCount > 0 && styles.docsRowAlert,
//                 ]}
//               >
//                 <View
//                   style={[
//                     styles.statIconBadge,
//                     {
//                       backgroundColor:
//                         !statsLoading && docsExpiringCount > 0
//                           ? ACCENTS.amber.tint
//                           : ACCENTS.teal.tint,
//                     },
//                   ]}
//                 >
//                   <FileText
//                     size={16}
//                     color={
//                       !statsLoading && docsExpiringCount > 0
//                         ? ACCENTS.amber.icon
//                         : ACCENTS.teal.icon
//                     }
//                   />
//                 </View>
//                 <View style={{ flex: 1 }}>
//                   <Text style={styles.docsRowLabel}>Documents</Text>
//                   <Text style={styles.docsRowText}>
//                     {statsLoading
//                       ? "Checking your documents…"
//                       : docsExpiringCount > 0
//                       ? `${docsExpiringCount} document${
//                           docsExpiringCount === 1 ? "" : "s"
//                         } need attention`
//                       : "All documents up to date"}
//                   </Text>
//                 </View>
//                 <ChevronRight size={18} color={COLORS.textMuted} />
//               </TouchableOpacity>
//             )}

//             {/* ── Quick actions — every button below goes to a screen that
//                 already exists and is already reachable from elsewhere in
//                 the app (Available Jobs, Documents, Accepted Jobs, etc). ── */}
//             {/* <Text style={styles.eyebrow}>Quick actions</Text> */}
//             {/* <View style={styles.actionsGrid}>
//               {userType === "staff" && (
//                 <>
//                   <TouchableOpacity
//                     style={styles.actionButton}
//                     activeOpacity={0.85}
//                     onPress={() => navigation.navigate("StaffShifts")}
//                   >
//                     <View
//                       style={[
//                         styles.actionIconBadge,
//                         { backgroundColor: ACCENTS.purple.tint },
//                       ]}
//                     >
//                       <Briefcase size={16} color={ACCENTS.purple.icon} />
//                     </View>
//                     <Text style={styles.actionText}>Available jobs</Text>
//                   </TouchableOpacity>
//                   <TouchableOpacity
//                     style={styles.actionButton}
//                     activeOpacity={0.85}
//                     onPress={() => navigation.navigate("Documents")}
//                   >
//                     <View
//                       style={[
//                         styles.actionIconBadge,
//                         { backgroundColor: ACCENTS.teal.tint },
//                       ]}
//                     >
//                       <FileText size={16} color={ACCENTS.teal.icon} />
//                     </View>
//                     <Text style={styles.actionText}>My documents</Text>
//                   </TouchableOpacity>
//                   <TouchableOpacity
//                     style={styles.actionButton}
//                     activeOpacity={0.85}
//                     onPress={() => navigation.navigate("AcceptedJobs")}
//                   >
//                     <View
//                       style={[
//                         styles.actionIconBadge,
//                         { backgroundColor: ACCENTS.teal.tint },
//                       ]}
//                     >
//                       <UserCheck size={16} color={ACCENTS.teal.icon} />
//                     </View>
//                     <Text style={styles.actionText}>Accepted jobs</Text>
//                   </TouchableOpacity>
//                   <TouchableOpacity
//                     style={styles.actionButton}
//                     activeOpacity={0.85}
//                     onPress={() => navigation.navigate("Payslip")}
//                   >
//                     <View
//                       style={[
//                         styles.actionIconBadge,
//                         { backgroundColor: ACCENTS.blue.tint },
//                       ]}
//                     >
//                       <Receipt size={16} color={ACCENTS.blue.icon} />
//                     </View>
//                     <Text style={styles.actionText}>Payslips</Text>
//                   </TouchableOpacity>
//                 </>
//               )}

//               {userType === "contractor" && (
//                 <>
//                   <TouchableOpacity
//                     style={styles.actionButton}
//                     activeOpacity={0.85}
//                     onPress={() => navigation.navigate("StaffShifts")}
//                   >
//                     <View
//                       style={[
//                         styles.actionIconBadge,
//                         { backgroundColor: ACCENTS.amber.tint },
//                       ]}
//                     >
//                       <ClipboardList size={16} color={ACCENTS.amber.icon} />
//                     </View>
//                     <Text style={styles.actionText}>Pending assigning</Text>
//                   </TouchableOpacity>
//                   <TouchableOpacity
//                     style={styles.actionButton}
//                     activeOpacity={0.85}
//                     onPress={() => navigation.navigate("StaffManagement")}
//                   >
//                     <View
//                       style={[
//                         styles.actionIconBadge,
//                         { backgroundColor: ACCENTS.blue.tint },
//                       ]}
//                     >
//                       <Users size={16} color={ACCENTS.blue.icon} />
//                     </View>
//                     <Text style={styles.actionText}>Team management</Text>
//                   </TouchableOpacity>
//                   <TouchableOpacity
//                     style={styles.actionButton}
//                     activeOpacity={0.85}
//                     onPress={() => navigation.navigate("PaymentHistory")}
//                   >
//                     <View
//                       style={[
//                         styles.actionIconBadge,
//                         { backgroundColor: ACCENTS.teal.tint },
//                       ]}
//                     >
//                       <Receipt size={16} color={ACCENTS.teal.icon} />
//                     </View>
//                     <Text style={styles.actionText}>Payment history</Text>
//                   </TouchableOpacity>
//                   <TouchableOpacity
//                     style={styles.actionButton}
//                     activeOpacity={0.85}
//                     onPress={() => navigation.navigate("Messages")}
//                   >
//                     <View
//                       style={[
//                         styles.actionIconBadge,
//                         { backgroundColor: ACCENTS.purple.tint },
//                       ]}
//                     >
//                       <MessageSquare size={16} color={ACCENTS.purple.icon} />
//                     </View>
//                     <Text style={styles.actionText}>Messages</Text>
//                   </TouchableOpacity>
//                 </>
//               )}

//               {userType === "customer" && (
//                 <>
//                   <TouchableOpacity
//                     style={styles.actionButton}
//                     activeOpacity={0.85}
//                     onPress={() => navigation.navigate("CreateJob")}
//                   >
//                     <View
//                       style={[
//                         styles.actionIconBadge,
//                         { backgroundColor: ACCENTS.purple.tint },
//                       ]}
//                     >
//                       <Briefcase size={16} color={ACCENTS.purple.icon} />
//                     </View>
//                     <Text style={styles.actionText}>Post a job</Text>
//                   </TouchableOpacity>
//                   <TouchableOpacity
//                     style={styles.actionButton}
//                     activeOpacity={0.85}
//                     onPress={() => navigation.navigate("Applications")}
//                   >
//                     <View
//                       style={[
//                         styles.actionIconBadge,
//                         { backgroundColor: ACCENTS.blue.tint },
//                       ]}
//                     >
//                       <CalendarDays size={16} color={ACCENTS.blue.icon} />
//                     </View>
//                     <Text style={styles.actionText}>Track jobs</Text>
//                   </TouchableOpacity>
//                   <TouchableOpacity
//                     style={styles.actionButton}
//                     activeOpacity={0.85}
//                     onPress={() => navigation.navigate("PaymentHistory")}
//                   >
//                     <View
//                       style={[
//                         styles.actionIconBadge,
//                         { backgroundColor: ACCENTS.teal.tint },
//                       ]}
//                     >
//                       <Receipt size={16} color={ACCENTS.teal.icon} />
//                     </View>
//                     <Text style={styles.actionText}>Payment history</Text>
//                   </TouchableOpacity>
//                   <TouchableOpacity
//                     style={styles.actionButton}
//                     activeOpacity={0.85}
//                     onPress={() => navigation.navigate("Messages")}
//                   >
//                     <View
//                       style={[
//                         styles.actionIconBadge,
//                         { backgroundColor: ACCENTS.purple.tint },
//                       ]}
//                     >
//                       <MessageSquare size={16} color={ACCENTS.purple.icon} />
//                     </View>
//                     <Text style={styles.actionText}>Message staff</Text>
//                   </TouchableOpacity>
//                 </>
//               )}
//             </View> */}
//           </View>
//         </View>

//         <View style={[styles.section, { flex: 1 }]}>
//           <View style={styles.sectionHeader}>
//             <Text style={styles.sectionTitle}>Shifts This Week</Text>
//             {sites.length > 0 && (
//               <TouchableOpacity
//                 activeOpacity={0.7}
//                 onPress={() => navigation.navigate("Applications")}
//               >
//                 <Text style={styles.seeAll}>See All</Text>
//               </TouchableOpacity>
//             )}
//           </View>

//           {/* Fixed Height Scrollable Container */}
//           <View style={styles.shiftsWrapper}>
//             <ScrollView
//               nestedScrollEnabled={true}
//               showsVerticalScrollIndicator={false}
//               contentContainerStyle={styles.shiftsScrollContent}
//             >
//               {sites.length === 0 ? (
//                 <Text style={styles.noShiftText}>
//                   No shifts found this week.
//                 </Text>
//               ) : (
//                 sites.map((job: any) => {
//                   const status = job.job_status?.toLowerCase();

//                   const shiftDate = job.start
//                     ? new Date(job.start).toLocaleDateString("en-GB", {
//                         day: "2-digit",
//                         month: "short",
//                         year: "numeric",
//                       })
//                     : "--";

//                   const startTime =
//                     job.start?.split(" ")[1]?.slice(0, 5) || "--:--";
//                   const endTime =
//                     job.end?.split(" ")[1]?.slice(0, 5) || "--:--";

//                   return (
//                     <LinearGradient
//                       key={job.id}
//                       colors={[COLORS.heroBg1, COLORS.heroBg2]}
//                       start={{ x: 0, y: 0 }}
//                       end={{ x: 1, y: 1 }}
//                       style={styles.siteCard}
//                     >
//                       <View style={styles.siteCardInner}>
//                         {/* Same as before */}
//                         <Text style={styles.siteName}>
//                           {job.site?.site_name || "Unnamed Site"}
//                         </Text>

//                         <Text style={styles.siteAddress}>
//                           {job.site?.address ||
//                             job.guards?.address ||
//                             "No address available"}
//                         </Text>

//                         <Text style={styles.totalHours}>
//                           Total Hours: {job.hours || 0}
//                         </Text>

//                         <View style={styles.shiftRow}>
//                           <View>
//                             <Text style={styles.shiftDate}>{shiftDate}</Text>

//                             <Text style={styles.shiftTime}>
//                               {startTime} - {endTime}
//                             </Text>
//                           </View>

//                           <Text style={styles.guardName}>
//                             {job.guards?.name
//                               ? capitalizeWords(job.guards.name)
//                               : "Unassigned"}
//                           </Text>

//                           <View
//                             style={[
//                               styles.statusBadge,
//                               status === "pending"
//                                 ? { backgroundColor: "#FEE2E2" }
//                                 : status === "confirmed"
//                                 ? { backgroundColor: "#FEF3C7" }
//                                 : status === "completed"
//                                 ? { backgroundColor: "#D1FAE5" }
//                                 : { backgroundColor: "#E5E7EB" },
//                             ]}
//                           >
//                             <Text
//                               style={[
//                                 styles.statusText,
//                                 {
//                                   color:
//                                     status === "pending"
//                                       ? "#DC2626"
//                                       : status === "confirmed"
//                                       ? "#F59E0B"
//                                       : status === "completed"
//                                       ? "#16A34A"
//                                       : "#374151",
//                                 },
//                               ]}
//                             >
//                               {status || "pending"}
//                             </Text>
//                           </View>
//                         </View>
//                       </View>
//                     </LinearGradient>
//                   );
//                 })
//               )}
//             </ScrollView>
//           </View>
//         </View>
//       </View>
//     </SafeAreaView>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: COLORS.background,
//     paddingTop: 25,
//   },
//   header: {
//     flexDirection: "row",
//     justifyContent: "space-between",
//     alignItems: "center",
//     paddingHorizontal: 20,
//     paddingVertical: 10,
//   },
//   infoBox: {
//     marginTop: 16,
//     backgroundColor: COLORS.surface,
//     paddingVertical: 10,
//     paddingHorizontal: 14,
//     borderRadius: 12,
//     alignSelf: "flex-start",
//     marginBottom: 20,
//     borderWidth: 1,
//     borderColor: COLORS.cardBorder,
//   },
//   infoText: {
//     fontSize: 14,
//     fontWeight: "700",
//     color: COLORS.text,
//   },
//   infoSubText: {
//     fontSize: 12,
//     color: COLORS.textSecondary,
//     marginTop: 2,
//   },
//   avatarBox: {
//     flexDirection: "row",
//     alignItems: "center",
//   },
//   avatar: {
//     width: 48,
//     height: 48,
//     borderRadius: 24,
//     borderWidth: 2,
//     borderColor: COLORS.primary,
//   },
//   initialsAvatar: {
//     width: 48,
//     height: 48,
//     borderRadius: 24,
//     backgroundColor: COLORS.surface,
//     justifyContent: "center",
//     alignItems: "center",
//     borderWidth: 1,
//     borderColor: COLORS.primaryBorder,
//   },
//   siteCardInner: {
//     padding: 12,
//   },
//   welcomeContent: {
//     marginLeft: 12,
//   },
//   welcomeText: {
//     fontSize: 13,
//     color: COLORS.textSecondary,
//   },
//   nameRow: {
//     flexDirection: "row",
//     alignItems: "center",
//   },
//   name: {
//     fontSize: 18,
//     fontWeight: "700",
//     color: COLORS.text,
//   },
//   shiftDate: {
//     fontSize: 12,
//     color: COLORS.textSecondary,
//     marginBottom: 2,
//     fontWeight: "500",
//   },
//   helloIcon: {
//     width: 20,
//     height: 20,
//     marginLeft: 6,
//   },
//   scrollContent: {
//     flex: 1,
//   },
//   bannerContent: {
//     flex: 1,
//   },
//   banner: {
//     marginHorizontal: 15,
//     borderRadius: 18,
//     padding: 12,
//     paddingRight: 20,
//     flexDirection: "row",
//     justifyContent: "space-between",
//     backgroundColor: COLORS.card,
//     alignItems: "center",
//   },
//   bannerTitle: {
//     fontSize: 18,
//     fontWeight: "700",
//     color: COLORS.text,
//     lineHeight: 26,
//   },
//   bannerImage: {
//     width: 130,
//     height: 130,
//     resizeMode: "contain",
//   },
//   section: {
//     paddingHorizontal: 15,
//     marginVertical: 10,
//   },
//   sectionHeader: {
//     flexDirection: "row",
//     justifyContent: "space-between",
//     alignItems: "center",
//     marginBottom: 12,
//   },
//   sectionTitle: {
//     fontSize: 18,
//     fontWeight: "800",
//     color: COLORS.text,
//   },
//   shiftsScrollContainer: {
//     maxHeight: 400, // Adjust as needed
//     paddingBottom: 10,
//   },
//   seeAll: {
//     color: COLORS.primary,
//     fontWeight: "600",
//   },
//   siteCard: {
//     width: "100%",
//     borderRadius: 14,
//     marginBottom: 12,
//     overflow: "hidden",
//   },
//   siteName: {
//     fontSize: 16,
//     fontWeight: "700",
//     color: COLORS.text,
//   },
//   siteAddress: {
//     fontSize: 12,
//     color: COLORS.textSecondary,
//     marginVertical: 6,
//   },
//   totalHours: {
//     fontSize: 14,
//     fontWeight: "700",
//     color: COLORS.primary,
//     marginBottom: 10,
//   },
//   initialsText: {
//     color: COLORS.text,
//     fontSize: 20,
//     fontWeight: "700",
//   },
//   shiftRow: {
//     flexDirection: "row",
//     justifyContent: "space-between",
//     alignItems: "center",
//     paddingVertical: 10,
//     borderTopWidth: 1,
//     borderTopColor: COLORS.cardBorder,
//   },
//   shiftTime: {
//     fontSize: 13,
//     color: COLORS.text,
//     fontWeight: "500",
//   },
//   guardName: {
//     fontSize: 13,
//     color: COLORS.textSecondary,
//   },
//   statusBadge: {
//     paddingHorizontal: 10,
//     paddingVertical: 4,
//     borderRadius: 6,
//   },
//   statusText: {
//     fontSize: 11,
//     fontWeight: "600",
//     textTransform: "capitalize",
//   },
//   categoryItem: {
//     backgroundColor: COLORS.card,
//     width: 90,
//     height: 78,
//     borderRadius: 12,
//     marginRight: 10,
//     padding: 10,
//     alignItems: "center",
//     justifyContent: "center",
//     borderWidth: 1,
//     borderColor: COLORS.cardBorder,
//     shadowColor: "#000",
//     shadowOffset: { width: 0, height: 6 },
//     shadowOpacity: 0.2,
//     shadowRadius: 10,
//     elevation: 2,
//   },
//   categoryList: {
//     paddingVertical: 8,
//   },
//   categoryIcon: {
//     width: 34,
//     height: 34,
//     tintColor: COLORS.primary,
//     marginBottom: 6,
//   },
//   categoryTitle: {
//     fontSize: 10,
//     color: COLORS.text,
//     textAlign: "center",
//   },

//   // ── New dashboard hero/stats/actions (replaces old banner + categories) ──
//   heroCard: {
//     marginHorizontal: 15,
//     // marginTop: 8,
//     marginBottom: 5,
//     borderRadius: 18,
//     padding: 14,
//     borderWidth: 1,
//     borderColor: COLORS.cardBorder,
//   },
//   heroTitle: {
//     fontSize: 21,
//     fontWeight: "800",
//     color: COLORS.text,
//     letterSpacing: 0.2,
//   },
//   heroSubtitle: {
//     fontSize: 13,
//     color: COLORS.textSecondary,
//     marginTop: 6,
//   },
//   eyebrow: {
//     fontSize: 11,
//     fontWeight: "700",
//     color: COLORS.textMuted,
//     letterSpacing: 0.8,
//     textTransform: "uppercase",
//     marginBottom: 10,
//   },
//   statsGrid: {
//     flexDirection: "row",
//     flexWrap: "wrap",
//     justifyContent: "space-between",
//   },
//   statCard: {
//     width: "48.5%",
//     backgroundColor: COLORS.card,
//     borderRadius: 14,
//     borderWidth: 1,
//     borderColor: COLORS.cardBorder,
//     padding: 12,
//     marginBottom: 10,
//     gap: 4,
//     shadowColor: "#000",
//     shadowOffset: { width: 0, height: 4 },
//     shadowOpacity: 0.15,
//     shadowRadius: 8,
//     elevation: 2,
//   },
//   statIconBadge: {
//     width: 32,
//     height: 32,
//     borderRadius: 16,
//     justifyContent: "center",
//     alignItems: "center",
//     marginBottom: 2,
//   },
//   statLabel: {
//     fontSize: 12,
//     color: COLORS.textSecondary,
//     marginTop: 2,
//   },
//   statValue: {
//     fontSize: 18,
//     fontWeight: "700",
//     color: COLORS.text,
//   },
//   docsRow: {
//     flexDirection: "row",
//     alignItems: "center",
//     gap: 10,
//     backgroundColor: COLORS.surface,
//     borderRadius: 14,
//     borderWidth: 1,
//     borderColor: COLORS.cardBorder,
//     paddingVertical: 10,
//     paddingHorizontal: 12,
//     marginBottom: 16,
//   },
//   docsRowAlert: {
//     borderColor: "rgba(245,166,35,0.4)",
//     backgroundColor: "rgba(245,166,35,0.06)",
//   },
//   docsRowLabel: {
//     fontSize: 11,
//     fontWeight: "700",
//     color: COLORS.textMuted,
//     letterSpacing: 0.6,
//     textTransform: "uppercase",
//     marginBottom: 2,
//   },
//   docsRowText: {
//     fontSize: 13,
//     color: COLORS.text,
//     fontWeight: "600",
//   },
//   actionsGrid: {
//     flexDirection: "row",
//     flexWrap: "wrap",
//     justifyContent: "space-between",
//   },
//   actionButton: {
//     width: "48.5%",
//     flexDirection: "row",
//     alignItems: "center",
//     gap: 10,
//     backgroundColor: COLORS.card,
//     borderRadius: 14,
//     borderWidth: 1,
//     borderColor: COLORS.cardBorder,
//     paddingVertical: 12,
//     paddingHorizontal: 12,
//     marginBottom: 10,
//   },
//   actionIconBadge: {
//     width: 30,
//     height: 30,
//     borderRadius: 15,
//     justifyContent: "center",
//     alignItems: "center",
//   },
//   actionText: {
//     fontSize: 13,
//     fontWeight: "600",
//     color: COLORS.text,
//     flexShrink: 1,
//   },
//   fixedTopSection: {
//     backgroundColor: COLORS.background,
//   },

//   shiftsContainer: {
//     flex: 1,
//     backgroundColor: COLORS.background,
//   },

//   shiftsWrapper: {
//     flex: 1, // Let it take up all available remaining space
//     backgroundColor: COLORS.background,
//     borderRadius: 12,
//     overflow: "hidden",
//     borderWidth: 1,
//     borderColor: COLORS.cardBorder,
//     marginBottom: 20, // Add space for the bottom tab
//   },

//   shiftsScrollContent: {
//     padding: 10,
//     paddingBottom: 50,
//   },

//   noShiftText: {
//     paddingVertical: 40,
//     color: "#666",
//     textAlign: "center",
//     fontSize: 15,
//   },
// });

import React, { useState, useEffect } from "react";
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
} from "lucide-react-native";

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
  const [isActive, setIsActive] = useState<boolean>(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);

  const [availableJobsCount, setAvailableJobsCount] = useState(0);
  const [docsExpiringCount, setDocsExpiringCount] = useState(0);
  const [activeGuardsCount, setActiveGuardsCount] = useState(0);
  const [pendingAssigningCount, setPendingAssigningCount] = useState(0);
  const [statsLoading, setStatsLoading] = useState(true);

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
            {
              headers: { Authorization: `Bearer ${token}` },
            },
          );
          setAvailableJobsCount(res.data?.data?.jobs?.total || 0);
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

  if (loading) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#030508",
        }}
      >
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={{ marginTop: 15, fontSize: 16, color: "#fff" }}>
          Loading profile...
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

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
    marginHorizontal: 10,
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
});
