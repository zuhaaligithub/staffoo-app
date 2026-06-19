// import React, {
//   useState,
//   useRef,
//   useEffect,
//   useMemo,
//   useCallback,
// } from "react";
// import {
//   View,
//   Text,
//   TouchableOpacity,
//   StyleSheet,
//   SafeAreaView,
//   StatusBar,
//   Image,
//   ScrollView,
//   ActivityIndicator,
//   Modal,
//   FlatList,
//   RefreshControl,
// } from "react-native";
// import {
//   ChevronDown,
//   UserCheck,
//   CheckCircle,
//   XCircle,
//   Briefcase,
// } from "lucide-react-native";
// import {
//   Calendar,
//   Clock,
//   MapPin,
//   FileText,
//   CalendarDays,
// } from "lucide-react-native";
// import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
// import BottomTab from "./BottomTab";
// import Toast from "react-native-toast-message";
// import {
//   getUserProfile,
//   getContractorStaff,
//   postGuardJobs,
// } from "../services/authApi";
// import { useFocusEffect } from "@react-navigation/native";
// import AsyncStorage from "@react-native-async-storage/async-storage";
// import LinearGradient from "react-native-linear-gradient";
// import axios from "axios";

// const BASE_URL = "https://apis.staffoo.com.au/api";

// // ─── Design System ─────────────────────────────────────────────────────────────

// const COLORS = {
//   background: "#030508",
//   surface: "#07111A",
//   card: "#0D1421",
//   cardBorder: "rgba(98, 97, 97, 0.83)",
//   primary: "#00A99D",
//   primaryGlow: "rgba(0,169,157,0.25)",
//   primaryBorder: "rgba(0,169,157,0.25)",
//   text: "#FFFFFF",
//   textSecondary: "#94A3B8",
//   textMuted: "#4A6080",
//   success: "#34C88A",
//   danger: "#F87171",
//   dangerBg: "rgba(248,88,88,0.12)",
//   warning: "#F5A623",
//   warningBg: "rgba(245,166,35,0.08)",
//   heroBg1: "#0D1F2D",
//   heroBg2: "#061014",
// };

// // ─── Types ─────────────────────────────────────────────────────────────────────

// type AvailableJob = {
//   id: number;
//   title: string;
//   siteName: string;
//   location: string;
//   address: string;
//   date: string;
//   startTime: string;
//   endTime: string;
//   rate: string;
//   status?: string;
//   raw: any;
// };

// type Props = { navigation: any; route: any };

// // ─── Helpers ───────────────────────────────────────────────────────────────────

// const formatDate = (val: any): string => {
//   if (!val) return "—";
//   const clean = String(val).split("T")[0].split(" ")[0];
//   const parts = clean.includes("-") ? clean.split("-") : clean.split("/");
//   if (parts.length !== 3) return "—";
//   let [y, m, d] = parts;
//   if (y.length === 4) {
//     return `${d.padStart(2, "0")}/${m.padStart(2, "0")}/${y}`;
//   }
//   return `${y.padStart(2, "0")}/${m.padStart(2, "0")}/${d}`;
// };

// const formatTime = (val: any): string => {
//   if (!val) return "—";
//   const str = String(val).trim();
//   const parts = str.split(" ");
//   const time = parts[1] || parts[0];
//   if (time && time.includes(":")) return time.slice(0, 5);
//   return "—";
// };

// const capitalizeName = (name: string = ""): string =>
//   name
//     .toLowerCase()
//     .split(" ")
//     .filter(Boolean)
//     .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
//     .join(" ");

// const getInitials = (name: string): string => {
//   if (!name) return "U";
//   const parts = name.trim().split(" ").filter(Boolean);
//   if (parts.length === 1) return parts[0][0].toUpperCase();
//   return parts[0][0].toUpperCase() + parts[parts.length - 1][0].toUpperCase();
// };

// const shapeJobForDetails = (raw: any) => {
//   if (raw?.start && raw?.end) return raw;
//   const roster = raw?.roster?.roster || raw?.roster || raw || {};
//   if (roster?.start && roster?.end) return roster;
//   return {
//     id: raw?.id,
//     start: raw?.start_time || raw?.start || null,
//     end: raw?.end_time || raw?.end || null,
//     hours: raw?.total_hours || raw?.hours || null,
//     site: {
//       site_name: raw?.site_name || raw?.site?.site_name || "N/A",
//       address: raw?.site_address || raw?.address || raw?.site?.address || "N/A",
//       coordinates: raw?.coordinates || raw?.site?.coordinates || null,
//     },
//   };
// };

// // ─── Component ─────────────────────────────────────────────────────────────────

// export default function StaffShifts({ navigation, route }: Props) {
//   const bottomSheetRef = useRef<BottomSheet>(null);
//   const snapPoints = useMemo(() => ["75%", "85%"], []);

//   const [activeTab, setActiveTab] = useState<"New" | "Accepted">("Accepted");

//   const [availableJobs, setAvailableJobs] = useState<AvailableJob[]>([]);
//   const [loadingAvailable, setLoadingAvailable] = useState(false);

//   const [todayShifts, setTodayShifts] = useState<any[]>([]);
//   const [weekShifts, setWeekShifts] = useState<any[]>([]);
//   const [loadingToday, setLoadingToday] = useState(false);
//   const [loadingWeek, setLoadingWeek] = useState(false);

//   const [userType, setUserType] = useState<string>("");
//   const [userId, setUserId] = useState<number>(0);
//   const [userDocuments, setUserDocuments] = useState<any[]>([]);
//   const [user, setUser] = useState<any>(null);
//   const [profileImage, setProfileImage] = useState<string | null>(null);
//   const [loadingProfile, setLoadingProfile] = useState(true);

//   const [notificationJob, setNotificationJob] = useState<any>(null);
//   const [sheetOpen, setSheetOpen] = useState(false);
//   const [staffList, setStaffList] = useState<any[]>([]);
//   const [selectedStaff, setSelectedStaff] = useState<number | null>(null);
//   const [loadingStaff, setLoadingStaff] = useState(false);
//   const [showStaffDropdown, setShowStaffDropdown] = useState(false);

//   // ─── Load user from storage ─────────────────────────────────────────────────

//   useEffect(() => {
//     const loadUser = async () => {
//       try {
//         const userStr = await AsyncStorage.getItem("user");
//         const cachedImage = await AsyncStorage.getItem("profileImage");
//         if (userStr) {
//           const parsedUser = JSON.parse(userStr);
//           setUser(parsedUser);
//           if (cachedImage) {
//             setProfileImage(cachedImage);
//           } else if (parsedUser?.staff?.profile_image) {
//             setProfileImage(
//               `https://apis.staffoo.com.au/storage/${parsedUser.staff.profile_image}`,
//             );
//           }
//         }
//       } catch (e) {
//         console.log("User load error", e);
//       }
//     };
//     loadUser();
//   }, []);

//   // ─── Fetch profile ──────────────────────────────────────────────────────────

//   useEffect(() => {
//     const fetchProfile = async () => {
//       setLoadingProfile(true);
//       try {
//         const stored = await AsyncStorage.getItem("user");
//         if (!stored) return;
//         const parsed = JSON.parse(stored);
//         const idFromStorage = Number(parsed?.id);
//         if (!idFromStorage) return;
//         setUserId(idFromStorage);

//         const res = await getUserProfile(idFromStorage);
//         if (res?.success && res?.data) {
//           setUserDocuments(res.data.documents || []);
//           setUserType((res.data.user_type || "").trim().toLowerCase());
//         } else {
//           setUserType((parsed.user_type || "").trim().toLowerCase());
//         }
//       } catch (err) {
//         console.error("[Profile Error]:", err);
//         const stored = await AsyncStorage.getItem("user");
//         if (stored) {
//           const parsed = JSON.parse(stored);
//           setUserType((parsed.user_type || "").trim().toLowerCase());
//         }
//       } finally {
//         setLoadingProfile(false);
//       }
//     };
//     fetchProfile();
//   }, []);

//   // ─── Fetch available jobs ───────────────────────────────────────────────────

//   const fetchAvailableJobs = async () => {
//     try {
//       setLoadingAvailable(true);
//       const token = await AsyncStorage.getItem("@auth_token");

//       const response = await axios.get(`${BASE_URL}/jobs/available`, {
//         headers: { Authorization: `Bearer ${token}` },
//       });

//       let apiJobs: any[] = [];
//       if (
//         response.data?.data?.jobs?.data &&
//         Array.isArray(response.data.data.jobs.data)
//       ) {
//         apiJobs = response.data.data.jobs.data;
//       } else if (
//         response.data?.jobs?.data &&
//         Array.isArray(response.data.jobs.data)
//       ) {
//         apiJobs = response.data.jobs.data;
//       } else if (Array.isArray(response.data?.data)) {
//         apiJobs = response.data.data;
//       } else if (Array.isArray(response.data)) {
//         apiJobs = response.data;
//       }

//       const formatted: AvailableJob[] = apiJobs.map((job: any) => {
//         let formattedDate = "TBD";
//         if (job.start_time || job.start) {
//           const d = new Date(job.start_time || job.start);
//           formattedDate = `${String(d.getDate()).padStart(2, "0")}/${String(
//             d.getMonth() + 1,
//           ).padStart(2, "0")}/${d.getFullYear()}`;
//         }

//         const startRaw = job.start_time || job.start;
//         const endRaw = job.end_time || job.end;

//         const startTime = startRaw
//           ? new Date(startRaw).toLocaleTimeString("en-AU", {
//               hour: "2-digit",
//               minute: "2-digit",
//               hour12: false,
//             })
//           : "TBD";

//         const endTime = endRaw
//           ? new Date(endRaw).toLocaleTimeString("en-AU", {
//               hour: "2-digit",
//               minute: "2-digit",
//               hour12: false,
//             })
//           : "TBD";

//         return {
//           id: job.id,
//           title: job.title || "Security Guard Shift",
//           siteName: job.site_name || job.site?.site_name || "N/A",
//           location: job.state ? job.state.toUpperCase() : "N/A",
//           address:
//             job.site_address ||
//             job.address ||
//             job.site?.address ||
//             "Address not available",
//           date: formattedDate,
//           startTime,
//           endTime,
//           rate: job.hourly_rate ? `$${job.hourly_rate}/hour` : "$32.50/hour",
//           status: job.job_status
//             ? job.job_status.charAt(0).toUpperCase() + job.job_status.slice(1)
//             : undefined,
//           raw: job,
//         };
//       });

//       setAvailableJobs(formatted);
//     } catch (error: any) {
//       console.error(
//         "Available jobs error:",
//         error?.response?.data || error.message,
//       );
//       Toast.show({
//         type: "error",
//         text1: "Failed to load available jobs",
//         text2: "Pull down to retry",
//       });
//     } finally {
//       setLoadingAvailable(false);
//     }
//   };

//   // ─── Fetch accepted shifts ──────────────────────────────────────────────────

//   const fetchAcceptedShifts = useCallback(async () => {
//     setLoadingToday(true);
//     try {
//       const todayRes = await postGuardJobs("confirmed", "today");
//       setTodayShifts(todayRes?.data?.today || todayRes?.data || []);
//     } catch {
//       Toast.show({ type: "error", text1: "Failed to load today's shifts" });
//     } finally {
//       setLoadingToday(false);
//     }

//     setLoadingWeek(true);
//     try {
//       const weekRes = await postGuardJobs("confirmed", "week");
//       setWeekShifts(weekRes?.data?.week || weekRes?.data || []);
//     } catch {
//       Toast.show({ type: "error", text1: "Failed to load week shifts" });
//     } finally {
//       setLoadingWeek(false);
//     }
//   }, []);

//   useFocusEffect(
//     useCallback(() => {
//       fetchAcceptedShifts();
//       fetchAvailableJobs();
//     }, [fetchAcceptedShifts]),
//   );

//   // ─── ASAP notification bottom sheet ────────────────────────────────────────

//   const extractJobData = (notif: any): any => {
//     if (!notif) return {};
//     if (notif?.additionalData?.roster?.roster?.id)
//       return notif.additionalData.roster.roster;
//     if (notif?.additionalData?.roster?.id) return notif.additionalData.roster;
//     if (notif?.roster?.roster?.id) return notif.roster.roster;
//     if (notif?.id && notif?.start) return notif;
//     const deepSearch = (obj: any): any => {
//       if (!obj || typeof obj !== "object") return null;
//       if (obj.start && obj.end && (obj.site || obj.address)) return obj;
//       for (const key in obj) {
//         const found = deepSearch(obj[key]);
//         if (found) return found;
//       }
//       return null;
//     };
//     return deepSearch(notif) || notif;
//   };

//   useEffect(() => {

//     if (route?.params?.notificationJob && userType) {
//       setNotificationJob(route.params.notificationJob);
//       setSheetOpen(true);
//     }
//   }, [route?.params?.notificationJob, userType]);

//   useFocusEffect(
//     useCallback(() => {
//       const checkPending = async () => {
//         try {
//           const pending = await AsyncStorage.getItem(
//             "@pending_asap_notification",
//           );
//           if (pending && userType) {
//             const job = JSON.parse(pending);
//             setNotificationJob(job);
//             setSheetOpen(true);
//             await AsyncStorage.removeItem("@pending_asap_notification");
//           }
//         } catch (err) {
//           console.error("[Pending Notification Error]:", err);
//         }
//       };
//       checkPending();
//     }, [userType]),
//   );

//   useEffect(() => {
//     if (userType !== "contractor" || !notificationJob || !userId) return;
//     const loadStaff = async () => {
//       setLoadingStaff(true);
//       try {
//         const res = await getContractorStaff(userId);
//         if (res?.guards?.length) setStaffList(res.guards);
//       } catch (err) {
//         console.error("[Staff Load Error]:", err);
//       } finally {
//         setLoadingStaff(false);
//       }
//     };
//     loadStaff();
//   }, [userType, notificationJob, userId]);

//   const handleSheetClose = () => {
//     setNotificationJob(null);
//     setSelectedStaff(null);
//     setSheetOpen(false);
//   };

//   const handleAcceptNotification = () => {
//     if (userType === "contractor" && !selectedStaff) {
//       Toast.show({ type: "error", text1: "Please select a staff member" });
//       return;
//     }
//     navigation.navigate("AsapJobDetails", {
//       job: notificationJob,
//       staff_id: userType === "contractor" ? selectedStaff : undefined,
//     });
//     bottomSheetRef.current?.close();
//     setSelectedStaff(null);
//     setSheetOpen(false);
//   };

//   const handleDeclineNotification = () => {
//     bottomSheetRef.current?.close();
//     setSheetOpen(false);
//   };

//   // ─── New tab handlers ───────────────────────────────────────────────────────

//   const handleAcceptJob = (job: AvailableJob) => {
//     const shaped = shapeJobForDetails(job.raw);
//     navigation.navigate("AsapJobDetails", {
//       job: shaped,
//       availableJobId: job.id,
//       onJobAccepted: () => {
//         setAvailableJobs((prev) => prev.filter((j) => j.id !== job.id));
//         fetchAcceptedShifts();
//         setActiveTab("Accepted");
//       },
//     });
//   };

//   const handleRejectJob = (job: AvailableJob) => {
//     setAvailableJobs((prev) => prev.filter((j) => j.id !== job.id));
//     Toast.show({ type: "info", text1: "Job Skipped", position: "top" });
//   };

//   useFocusEffect(
//     useCallback(() => {
//       if (route?.params?.jobAccepted) {
//         const acceptedId = route.params.jobAccepted;
//         setAvailableJobs((prev) => prev.filter((j) => j.id !== acceptedId));
//         fetchAcceptedShifts();
//         setActiveTab("Accepted");
//         navigation.setParams({ jobAccepted: undefined });
//       }
//     }, [route?.params?.jobAccepted]),
//   );

//   // ─── Render: Available job card ─────────────────────────────────────────────

//   const renderAvailableCard = ({ item }: { item: AvailableJob }) => (
//     <View style={styles.shiftCard}>
//       {/* Header row */}
//       <View style={cardStyles.headerRow}>
//         <View style={cardStyles.siteIconWrap}>
//           <Briefcase size={14} color={COLORS.primary} />
//         </View>
//         <Text style={cardStyles.siteNameText} numberOfLines={1}>
//           {item.siteName}
//         </Text>
//         {item.status ? (
//           <View style={cardStyles.statusBadge}>
//             <Text style={cardStyles.statusBadgeText}>{item.status}</Text>
//           </View>
//         ) : null}
//       </View>

//       {/* Divider */}
//       <View style={cardStyles.divider} />

//       {/* Rate pill */}
//       {/* <View style={cardStyles.ratePill}>
//         <Text style={cardStyles.rateText}>{item.rate}</Text>
//       </View> */}

//       {/* Info rows */}
//       <View style={styles.rowItem}>
//         <View style={styles.iconBgGrey}>
//           <MapPin size={14} color={COLORS.primary} />
//         </View>
//         <Text style={styles.rowText}>{item.location}</Text>
//       </View>

//       <View style={styles.rowItem}>
//         <View style={styles.iconBgGrey}>
//           <CalendarDays size={14} color={COLORS.primary} />
//         </View>
//         <Text style={styles.rowText}>
//           {item.date}
//           {"   "}
//           <Text style={{ color: COLORS.primary, fontWeight: "700" }}>
//             {item.startTime} – {item.endTime}
//           </Text>
//         </Text>
//       </View>

//       <View style={styles.rowItem}>
//         <View style={styles.iconBgGrey}>
//           <FileText size={14} color={COLORS.primary} />
//         </View>
//         <Text style={[styles.addressText]} numberOfLines={2}>
//           {item.address}
//         </Text>
//       </View>

//       {/* Action buttons — only Accept, no Skip */}
//       <TouchableOpacity
//         style={cardStyles.acceptjobButton}
//         onPress={() => handleAcceptJob(item)}
//         activeOpacity={0.8}
//       >
//         <CheckCircle size={16} color="#fff" />
//         <Text style={cardStyles.acceptjobText}>ACCEPT JOB</Text>
//       </TouchableOpacity>
//     </View>
//   );

//   // ─── Render: Accepted shift card ────────────────────────────────────────────

//   const renderShiftCard = (shift: any, index: number, isToday = false) => {
//     const isConfirmed = shift.job_status?.toLowerCase() === "confirmed";
//     const signinStatus = Number(shift.signin_status ?? 0);
//     let onPress = () =>
//       Toast.show({ type: "info", text1: "Action not available" });
//     let showButton = false;
//     let buttonText = "";
//     let buttonVariant: "signIn" | "ongoing" | "upcoming" = "upcoming";
//     let disabled = false;

//     if (isToday && isConfirmed && signinStatus === 0) {
//       showButton = true;
//       buttonText = "Sign In";
//       buttonVariant = "signIn";

//       const guardUserId = shift.guard?.user_id ?? shift.user_id;
//       const isUserAdmin = Number(guardUserId) === 1;
//       let hasMissingDocs = false;

//       if (!isUserAdmin && Number(shift.is_document) === 1) {
//         hasMissingDocs =
//           !userDocuments ||
//           userDocuments.length === 0 ||
//           userDocuments.some((doc: any) => !doc.file || !doc.document_no);
//       }

//       if (hasMissingDocs) {
//         onPress = () =>
//           Toast.show({
//             type: "error",
//             text1: "Incomplete Profile",
//             text2: "Please add your documents first then you can sign-in",
//           });
//         disabled = true;
//       } else {
//         onPress = () => navigation.navigate("SignIn", { shift });
//       }
//     } else if (isToday && isConfirmed && signinStatus === 1) {
//       showButton = true;
//       buttonText = "Ongoing";
//       buttonVariant = "ongoing";
//       onPress = () => navigation.navigate("Ongoing", { currentShift: shift });
//     } else if (!isToday) {
//       showButton = true;
//       buttonText = "Upcoming";
//       buttonVariant = "upcoming";
//       disabled = true;
//     }

//     const actionBtnStyle =
//       buttonVariant === "signIn"
//         ? styles.signInButton
//         : buttonVariant === "ongoing"
//         ? styles.ongoingButton
//         : styles.viewButton;

//     const actionTextColor =
//       buttonVariant === "signIn"
//         ? "#92400e"
//         : buttonVariant === "ongoing"
//         ? COLORS.success
//         : COLORS.textMuted;

//     return (
//       <View key={index} style={styles.shiftCard}>
//         {/* Date + Time row */}
//         <View style={styles.rowBetween}>
//           <View style={styles.rowItem}>
//             <View style={styles.iconBgGrey}>
//               <CalendarDays size={14} color={COLORS.primary} />
//             </View>
//             <Text style={styles.rowText}>
//               {formatDate(shift.start) ||
//                 `${String(shift.job_start_day || "—").padStart(
//                   2,
//                   "0",
//                 )}/${String(shift.job_start_month || "—").padStart(2, "0")}/${
//                   shift.job_start_year || "—"
//                 }`}
//             </Text>
//           </View>

//           <View style={styles.rowItem}>
//             <View style={styles.iconBgGrey}>
//               <Clock size={14} color={COLORS.primary} />
//             </View>
//             <Text style={styles.rowText}>
//               {formatTime(shift.start)} – {formatTime(shift.end)}
//             </Text>
//           </View>
//         </View>

//         {/* Address */}
//         <View style={styles.rowItem}>
//           <View style={styles.iconBgGrey}>
//             <MapPin size={14} color={COLORS.primary} />
//           </View>
//           <View style={styles.addressContainer}>
//             <Text style={styles.addressText} numberOfLines={3}>
//               {shift.site?.address || "No address available"}
//             </Text>
//           </View>
//         </View>

//         {/* Instructions file */}
//         <TouchableOpacity style={styles.rowItem}>
//           <View style={styles.iconBgGrey}>
//             <FileText size={14} color={COLORS.primary} />
//           </View>
//           <Text style={styles.documentText}>
//             {shift.instructions_file
//               ? "Click to view instructions"
//               : "No instruction file"}
//           </Text>
//         </TouchableOpacity>

//         {/* Notes + Action button */}
//         <View style={[styles.rowBetween, { alignItems: "flex-start" }]}>
//           <View style={{ flex: 1, paddingRight: 16 }}>
//             <Text style={styles.detailsLabel}>Instructions / Notes</Text>
//             <Text style={styles.detailsValue}>
//               {shift.site?.site_description || "No site description"}
//             </Text>
//           </View>

//           {showButton && (
//             <TouchableOpacity
//               activeOpacity={0.8}
//               onPress={onPress}
//               disabled={disabled}
//               style={[
//                 styles.actionButton,
//                 actionBtnStyle,
//                 disabled && { opacity: 0.5 },
//               ]}
//             >
//               <Text
//                 style={[styles.actionButtonText, { color: actionTextColor }]}
//               >
//                 {buttonText}
//               </Text>
//             </TouchableOpacity>
//           )}
//         </View>
//       </View>
//     );
//   };

//   // ─── Render tab contents ────────────────────────────────────────────────────

//   const renderNewTab = () => {
//     if (loadingAvailable) {
//       return (
//         <View style={styles.loadingContainer}>
//           <ActivityIndicator size="large" color={COLORS.primary} />
//           <Text style={styles.loadingText}>Loading available jobs…</Text>
//         </View>
//       );
//     }

//     if (availableJobs.length === 0) {
//       return (
//         <View style={cardStyles.emptyContainer}>
//           <View style={cardStyles.emptyIconWrap}>
//             <Briefcase size={36} color={COLORS.primary} />
//           </View>
//           <Text style={cardStyles.emptyText}>No available jobs right now</Text>
//           <Text style={cardStyles.emptySubText}>Pull down to refresh</Text>
//         </View>
//       );
//     }

//     return (
//       <FlatList
//         data={availableJobs}
//         keyExtractor={(item) => item.id.toString()}
//         renderItem={renderAvailableCard}
//         contentContainerStyle={{ paddingBottom: 30 }}
//         scrollEnabled={false}
//         showsVerticalScrollIndicator={false}
//       />
//     );
//   };

//   const renderAcceptedTab = () => {
//     if (loadingToday || loadingWeek) {
//       return (
//         <View style={styles.loadingContainer}>
//           <ActivityIndicator size="large" color={COLORS.primary} />
//           <Text style={styles.loadingText}>Loading Shifts…</Text>
//         </View>
//       );
//     }

//     return (
//       <>
//         <Text style={styles.sectionHeader}>Today's Shifts</Text>
//         {todayShifts.length === 0 ? (
//           <View style={styles.emptyBlock}>
//             <Text style={styles.emptyText}>No shifts today</Text>
//           </View>
//         ) : (
//           todayShifts.map((shift, index) => renderShiftCard(shift, index, true))
//         )}

//         <Text style={styles.sectionHeader}>This Week's Shifts</Text>
//         {weekShifts.length === 0 ? (
//           <View style={styles.emptyBlock}>
//             <Text style={styles.emptyText}>No shifts this week</Text>
//           </View>
//         ) : (
//           weekShifts.map((shift, index) => renderShiftCard(shift, index, false))
//         )}
//       </>
//     );
//   };

//   // ─── Main render ────────────────────────────────────────────────────────────

//   const jobData = extractJobData(notificationJob);
//   const isRefreshing =
//     activeTab === "New" ? loadingAvailable : loadingToday || loadingWeek;

//   const onRefresh = () => {
//     if (activeTab === "New") fetchAvailableJobs();
//     else fetchAcceptedShifts();
//   };

//   return (
//     <SafeAreaView style={styles.container}>
//       <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

//       {/* ── Header (fixed) ── */}
//       <LinearGradient
//         colors={[COLORS.heroBg1, COLORS.heroBg2]}
//         start={{ x: 0, y: 0 }}
//         end={{ x: 1, y: 1 }}
//         style={styles.headerGradient}
//       >
//         <TouchableOpacity
//           style={styles.headerLeft}
//           onPress={() => navigation.navigate("Profile")}
//           activeOpacity={0.85}
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
//           <View>
//             <Text style={styles.greeting}>
//               {capitalizeName(user?.name || "User Name")} 👋
//             </Text>
//             <Text style={styles.staffName}>Welcome to Staffoo</Text>
//           </View>
//         </TouchableOpacity>
//       </LinearGradient>

//       {/* ── Tab bar (fixed) ── */}
//       <View style={tabStyles.tabBar}>
//         {(["Accepted", "New"] as const).map((tab) => {
//           const isActive = activeTab === tab;
//           const badge =
//             tab === "New" && availableJobs.length > 0
//               ? availableJobs.length
//               : null;
//           return (
//             <TouchableOpacity
//               key={tab}
//               style={[tabStyles.tab, isActive && tabStyles.tabActive]}
//               onPress={() => setActiveTab(tab)}
//               activeOpacity={0.85}
//             >
//               <View style={tabStyles.tabInner}>
//                 <Text
//                   style={[
//                     tabStyles.tabText,
//                     isActive && tabStyles.tabTextActive,
//                   ]}
//                 >
//                   {tab}
//                 </Text>
//                 {badge !== null && (
//                   <View style={tabStyles.badge}>
//                     <Text style={tabStyles.badgeText}>{badge}</Text>
//                   </View>
//                 )}
//               </View>
//             </TouchableOpacity>
//           );
//         })}
//       </View>

//       <ScrollView
//         style={styles.scrollContainer}
//         contentContainerStyle={styles.scrollContent}
//         showsVerticalScrollIndicator={false}
//         refreshControl={
//           <RefreshControl
//             refreshing={isRefreshing}
//             onRefresh={onRefresh}
//             tintColor={COLORS.primary}
//             colors={[COLORS.primary]}
//           />
//         }
//       >
//         {/* ── Tab content ── */}
//         {activeTab === "New" ? renderNewTab() : renderAcceptedTab()}

//         {!notificationJob && <View style={styles.placeholder} />}
//       </ScrollView>

//       {/* ── ASAP notification bottom sheet ── */}
//       <BottomSheet
//         ref={bottomSheetRef}
//         index={sheetOpen ? 0 : -1}
//         snapPoints={snapPoints}
//         enablePanDownToClose
//         onClose={handleSheetClose}
//         backgroundStyle={styles.sheetBackground}
//         handleIndicatorStyle={styles.sheetHandle}
//         enableDynamicSizing={false}
//         android_keyboardInputMode="adjustResize"
//         onChange={(index) => {
//           if (index === -1) handleSheetClose();
//         }}
//       >
//         <BottomSheetView style={[styles.sheetContent, { flex: 1 }]}>
//           <Text style={styles.newRequest}>🔔 New Job Request</Text>

//           <View style={styles.infoRow}>
//             <Calendar size={18} color={COLORS.primary} />
//             <Text style={styles.infoText}>{formatDate(jobData.start)}</Text>
//           </View>

//           <View style={styles.infoRow}>
//             <Clock size={18} color={COLORS.primary} />
//             <Text style={styles.infoText}>
//               {formatTime(jobData.start)} – {formatTime(jobData.end)}
//             </Text>
//           </View>

//           <View style={styles.infoRow}>
//             <MapPin size={18} color={COLORS.danger} />
//             <Text style={styles.addressInSheet} numberOfLines={4}>
//               {jobData?.site?.address ||
//                 jobData?.address ||
//                 "No address available"}
//             </Text>
//           </View>

//           <View style={styles.infoRow}>
//             <Clock size={18} color={COLORS.textSecondary} />
//             <Text style={styles.infoTextt}>
//               Total Hours: {jobData?.hours ?? "—"}
//             </Text>
//           </View>

//           {userType === "contractor" && (
//             <View style={{ marginVertical: 10 }}>
//               <Text style={styles.assignLabel}>Assign to Staff Member</Text>
//               {loadingStaff ? (
//                 <ActivityIndicator size="small" color={COLORS.primary} />
//               ) : staffList.length === 0 ? (
//                 <Text style={{ color: COLORS.danger, padding: 10 }}>
//                   No staff available
//                 </Text>
//               ) : (
//                 <>
//                   <TouchableOpacity
//                     style={styles.customDropdown}
//                     onPress={() => setShowStaffDropdown(true)}
//                     activeOpacity={0.8}
//                   >
//                     <View style={styles.dropdownContent}>
//                       <UserCheck size={18} color={COLORS.primary} />
//                       <Text style={styles.dropdownText} numberOfLines={1}>
//                         {selectedStaff
//                           ? staffList.find((s) => s.id === selectedStaff)
//                               ?.name || `Staff #${selectedStaff}`
//                           : "Select staff member"}
//                       </Text>
//                     </View>
//                     <View style={styles.iconRight}>
//                       <ChevronDown size={18} color={COLORS.textMuted} />
//                     </View>
//                   </TouchableOpacity>

//                   <Modal
//                     visible={showStaffDropdown}
//                     transparent
//                     animationType="fade"
//                     onRequestClose={() => setShowStaffDropdown(false)}
//                   >
//                     <View style={styles.modalOverlay}>
//                       <View style={styles.dropdownModal}>
//                         <Text style={styles.modalTitle}>Select Staff</Text>
//                         <FlatList
//                           data={staffList}
//                           keyExtractor={(item) => item.id.toString()}
//                           renderItem={({ item }) => (
//                             <TouchableOpacity
//                               style={styles.staffItem}
//                               onPress={() => {
//                                 setSelectedStaff(item.id);
//                                 setShowStaffDropdown(false);
//                               }}
//                             >
//                               <Text style={styles.staffNameText}>
//                                 {item.name || item.email || `Staff #${item.id}`}
//                               </Text>
//                             </TouchableOpacity>
//                           )}
//                         />
//                         <TouchableOpacity
//                           style={styles.cancelButtonModal}
//                           onPress={() => setShowStaffDropdown(false)}
//                         >
//                           <Text style={styles.cancelText}>Cancel</Text>
//                         </TouchableOpacity>
//                       </View>
//                     </View>
//                   </Modal>
//                 </>
//               )}
//             </View>
//           )}

//           {/* Sheet action buttons */}
//           <View style={styles.buttonContainer}>
//             <TouchableOpacity
//               style={[
//                 styles.acceptButton,
//                 userType === "contractor" &&
//                   !selectedStaff &&
//                   styles.disabledButton,
//               ]}
//               disabled={userType === "contractor" && !selectedStaff}
//               onPress={handleAcceptNotification}
//             >
//               <CheckCircle size={16} color="#fff" />
//               <Text style={styles.buttonText}>ACCEPT</Text>
//             </TouchableOpacity>

//             <TouchableOpacity
//               style={styles.declineButton}
//               onPress={handleDeclineNotification}
//             >
//               <XCircle size={16} color="#fff" />
//               <Text style={styles.buttonText}>DECLINE</Text>
//             </TouchableOpacity>
//           </View>
//         </BottomSheetView>
//       </BottomSheet>

//       <BottomTab navigation={navigation} activeTab="StaffShifts" />
//     </SafeAreaView>
//   );
// }

// // ─── Tab bar styles ───────────────────────────────────────────────────────────

// const tabStyles = StyleSheet.create({
//   tabBar: {
//     flexDirection: "row",
//     backgroundColor: COLORS.surface,
//     borderRadius: 14,
//     marginVertical: 14,
//     padding: 4,
//     borderWidth: 1,
//     borderColor: COLORS.cardBorder,
//   },
//   tab: {
//     flex: 1,
//     paddingVertical: 11,
//     borderRadius: 11,
//     alignItems: "center",
//     justifyContent: "center",
//   },
//   // tabActive: {
//   //   backgroundColor: COLORS.card,
//   //   shadowColor: COLORS.primary,
//   //   shadowOffset: { width: 0, height: 2 },
//   //   shadowOpacity: 0.2,
//   //   shadowRadius: 6,
//   //   elevation: 3,
//   // },
//   tabActive: {
//     backgroundColor: "#ccc",
//     shadowColor: COLORS.primary,
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.2,
//     shadowRadius: 6,
//     elevation: 3,
//   },
//   tabInner: {
//     flexDirection: "row",
//     alignItems: "center",
//     gap: 6,
//   },
//   tabText: {
//     fontSize: 14,
//     fontWeight: "600",
//     color: COLORS.textMuted,
//   },
//   tabTextActive: {
//     color: COLORS.primary,
//   },
//   badge: {
//     backgroundColor: COLORS.primary,
//     borderRadius: 10,
//     minWidth: 20,
//     height: 20,
//     justifyContent: "center",
//     alignItems: "center",
//     paddingHorizontal: 5,
//   },
//   badgeText: {
//     color: "#fff",
//     fontSize: 11,
//     fontWeight: "700",
//   },
// });

// // ─── Available job card styles ────────────────────────────────────────────────

// const cardStyles = StyleSheet.create({
//   headerRow: {
//     flexDirection: "row",
//     alignItems: "center",
//     marginBottom: 10,
//     gap: 8,
//   },
//   siteIconWrap: {
//     width: 28,
//     height: 28,
//     borderRadius: 8,
//     backgroundColor: COLORS.primaryGlow,
//     justifyContent: "center",
//     alignItems: "center",
//   },
//   siteNameText: {
//     fontSize: 15,
//     color: COLORS.text,
//     fontWeight: "700",
//     flex: 1,
//   },
//   statusBadge: {
//     backgroundColor: COLORS.warningBg,
//     borderRadius: 20,
//     paddingHorizontal: 10,
//     paddingVertical: 4,
//     borderWidth: 1,
//     borderColor: COLORS.warning,
//   },
//   statusBadgeText: {
//     color: COLORS.warning,
//     fontSize: 10,
//     fontWeight: "700",
//   },
//   divider: {
//     height: 1,
//     backgroundColor: COLORS.cardBorder,
//     marginBottom: 10,
//   },
//   ratePill: {
//     alignSelf: "flex-start",
//     backgroundColor: COLORS.primaryGlow,
//     borderRadius: 20,
//     paddingHorizontal: 12,
//     paddingVertical: 4,
//     marginBottom: 10,
//     borderWidth: 1,
//     borderColor: COLORS.primaryBorder,
//   },
//   rateText: {
//     color: COLORS.primary,
//     fontSize: 12,
//     fontWeight: "700",
//   },
//   acceptButton: {
//     backgroundColor: COLORS.success,
//     paddingVertical: 13,
//     borderRadius: 12,
//     alignItems: "center",
//     flexDirection: "row",
//     justifyContent: "center",
//     gap: 8,
//     marginTop: 14,
//   },
//   acceptText: {
//     color: "#fff",
//     fontWeight: "700",
//     fontSize: 13,
//     letterSpacing: 0.5,
//   },
//   acceptjobButton: {
//     backgroundColor: COLORS.success,
//     paddingVertical: 10,
//     borderRadius: 12,
//     alignItems: "center",
//     flexDirection: "row",
//     justifyContent: "center",
//     gap: 8,
//     marginTop: 5,
//     width: "40%",

//     alignSelf: "center", // 👈 add this
//   },
//   acceptjobText: {
//     color: "#fff",
//     fontWeight: "700",
//     fontSize: 10,
//     letterSpacing: 0.5,
//   },
//   emptyContainer: {
//     paddingVertical: 60,
//     alignItems: "center",
//   },
//   emptyIconWrap: {
//     width: 80,
//     height: 80,
//     borderRadius: 40,
//     backgroundColor: COLORS.primaryGlow,
//     justifyContent: "center",
//     alignItems: "center",
//     marginBottom: 16,
//   },
//   emptyText: {
//     color: COLORS.textSecondary,
//     fontSize: 17,
//     fontWeight: "600",
//     textAlign: "center",
//   },
//   emptySubText: {
//     color: COLORS.textMuted,
//     fontSize: 13,
//     marginTop: 6,
//     textAlign: "center",
//   },
// });

// // ─── Main styles ──────────────────────────────────────────────────────────────

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: COLORS.background,
//     paddingTop: 40,
//     paddingHorizontal: 16,
//   },
//   scrollContainer: { flex: 1 },
//   scrollContent: {
//     // paddingHorizontal: 16,
//     paddingBottom: 100,
//   },

//   // ── Header ──
//   headerGradient: {
//     borderRadius: 16,
//     padding: 16,
//     marginBottom: 4,
//     borderWidth: 1,
//     borderColor: COLORS.cardBorder,
//   },
//   headerLeft: {
//     flexDirection: "row",
//     alignItems: "center",
//     gap: 14,
//   },
//   avatar: {
//     width: 52,
//     height: 52,
//     borderRadius: 26,
//     borderWidth: 2,
//     borderColor: COLORS.primaryBorder,
//   },
//   initialsAvatar: {
//     width: 50,
//     height: 50,
//     borderRadius: 25,
//     backgroundColor: COLORS.primaryGlow,
//     justifyContent: "center",
//     alignItems: "center",
//     borderWidth: 2,
//     borderColor: COLORS.primaryBorder,
//   },
//   initialsText: { color: COLORS.primary, fontSize: 18, fontWeight: "700" },
//   greeting: { fontSize: 16, color: COLORS.text, fontWeight: "700" },
//   staffName: {
//     fontSize: 13,
//     color: COLORS.textSecondary,
//     fontWeight: "400",
//     marginTop: 2,
//   },

//   // ── Section headers ──
//   sectionHeader: {
//     fontSize: 16,
//     fontWeight: "700",
//     marginTop: 12,
//     marginBottom: 10,
//     paddingHorizontal: 2,
//     color: COLORS.primary,
//     letterSpacing: 0.3,
//   },

//   // ── Shift card ──
//   shiftCard: {
//     backgroundColor: COLORS.card,
//     borderColor: COLORS.cardBorder,
//     borderRadius: 16,
//     padding: 16,
//     marginBottom: 14,
//     borderWidth: 1,
//     shadowColor: COLORS.primary,
//     shadowOffset: { width: 0, height: 4 },
//     shadowOpacity: 0.08,
//     shadowRadius: 10,
//     elevation: 4,
//   },
//   rowBetween: {
//     flexDirection: "row",
//     alignItems: "center",
//     justifyContent: "space-between",
//     marginBottom: 2,
//   },
//   rowItem: {
//     flexDirection: "row",
//     alignItems: "flex-start",
//     gap: 8,
//     marginBottom: 5,
//   },
//   rowText: {
//     fontSize: 13,
//     color: COLORS.text,
//     fontWeight: "500",
//     marginTop: 8,
//   },
//   iconBgGrey: {
//     width: 36,
//     height: 36,
//     borderRadius: 10,
//     backgroundColor: COLORS.primaryGlow,
//     justifyContent: "center",
//     alignItems: "center",
//   },
//   addressText: {
//     fontSize: 11,
//     color: "#ccc",
//     flex: 1,
//     flexWrap: "wrap",
//     marginTop: 5,
//   },
//   addressContainer: { flex: 1, marginRight: 15 },
//   documentText: {
//     fontSize: 12,
//     color: COLORS.textMuted,
//     fontWeight: "500",
//     marginTop: 10,
//   },
//   detailsLabel: {
//     fontSize: 12,
//     fontWeight: "600",
//     color: COLORS.textMuted,
//     marginBottom: 3,
//   },
//   detailsValue: { fontSize: 13, color: COLORS.textSecondary, marginTop: 3 },

//   // ── Action buttons in shift cards ──
//   actionButton: {
//     paddingHorizontal: 16,
//     paddingVertical: 10,
//     borderRadius: 10,
//     minWidth: 88,
//     alignItems: "center",
//   },
//   signInButton: {
//     backgroundColor: "rgba(245,166,35,0.15)",
//     borderWidth: 1,
//     borderColor: COLORS.warning,
//   },
//   ongoingButton: {
//     backgroundColor: "rgba(52,200,138,0.12)",
//     borderWidth: 1,
//     borderColor: COLORS.success,
//   },
//   viewButton: {
//     backgroundColor: COLORS.surface,
//     borderWidth: 1,
//     borderColor: COLORS.cardBorder,
//   },
//   actionButtonText: { fontSize: 11, fontWeight: "700" },

//   // ── Loading / empty ──
//   loadingContainer: {
//     flex: 1,
//     justifyContent: "center",
//     alignItems: "center",
//     marginTop: 80,
//   },
//   loadingText: { marginTop: 16, fontSize: 14, color: COLORS.textSecondary },
//   emptyBlock: {
//     paddingVertical: 20,
//     alignItems: "center",
//   },
//   emptyText: {
//     textAlign: "center",
//     fontSize: 13,
//     color: COLORS.textMuted,
//   },
//   placeholder: {
//     flex: 1,
//     justifyContent: "center",
//     alignItems: "center",
//     minHeight: 200,
//     paddingVertical: 40,
//   },
//   disabledButton: { opacity: 0.45 },

//   // ── Bottom sheet ──
//   sheetBackground: {
//     backgroundColor: COLORS.surface,
//     borderTopLeftRadius: 24,
//     borderTopRightRadius: 24,
//     borderWidth: 1,
//     borderColor: COLORS.cardBorder,
//   },
//   sheetHandle: {
//     backgroundColor: COLORS.textMuted,
//     width: 40,
//     height: 4,
//     borderRadius: 999,
//   },
//   sheetContent: {
//     paddingHorizontal: 22,
//     paddingTop: 10,
//     paddingBottom: 44,
//   },
//   newRequest: {
//     fontSize: 19,
//     color: COLORS.primary,
//     fontWeight: "700",
//     marginBottom: 16,
//   },
//   infoRow: {
//     flexDirection: "row",
//     alignItems: "center",
//     marginBottom: 14,
//     gap: 14,
//     backgroundColor: COLORS.card,
//     padding: 12,
//     borderRadius: 12,
//     borderWidth: 1,
//     borderColor: COLORS.cardBorder,
//   },
//   infoText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: "500" },
//   infoTextt: { fontSize: 14, color: COLORS.text, fontWeight: "700" },
//   addressInSheet: {
//     fontSize: 13,
//     fontWeight: "500",
//     color: COLORS.textSecondary,
//     flex: 1,
//   },
//   assignLabel: {
//     fontSize: 13,
//     fontWeight: "600",
//     color: COLORS.textSecondary,
//     marginBottom: 8,
//   },
//   buttonContainer: {
//     flexDirection: "row",
//     gap: 10,
//     marginTop: 10,
//   },
//   acceptButton: {
//     flex: 1,
//     backgroundColor: COLORS.success,
//     paddingVertical: 14,
//     borderRadius: 14,
//     alignItems: "center",
//     flexDirection: "row",
//     justifyContent: "center",
//     gap: 8,
//   },
//   declineButton: {
//     flex: 1,
//     backgroundColor: COLORS.dangerBg,
//     paddingVertical: 14,
//     borderRadius: 14,
//     alignItems: "center",
//     flexDirection: "row",
//     justifyContent: "center",
//     gap: 8,
//     borderWidth: 1,
//     borderColor: COLORS.danger,
//   },
//   buttonText: { color: "white", fontSize: 13, fontWeight: "700" },

//   // ── Staff dropdown ──
//   customDropdown: {
//     flexDirection: "row",
//     alignItems: "center",
//     justifyContent: "space-between",
//     backgroundColor: COLORS.card,
//     borderWidth: 1,
//     borderColor: COLORS.cardBorder,
//     borderRadius: 12,
//     paddingHorizontal: 16,
//     paddingVertical: 14,
//     width: "100%",
//     overflow: "hidden",
//   },
//   dropdownContent: {
//     flexDirection: "row",
//     alignItems: "center",
//     flex: 1,
//     gap: 12,
//   },
//   dropdownText: { fontSize: 14, color: COLORS.text, flexShrink: 1 },
//   iconRight: {
//     marginLeft: 10,
//     justifyContent: "center",
//     alignItems: "center",
//   },
//   modalOverlay: {
//     flex: 1,
//     backgroundColor: "rgba(0,0,0,0.65)",
//     justifyContent: "center",
//     alignItems: "center",
//   },
//   dropdownModal: {
//     width: "85%",
//     backgroundColor: COLORS.card,
//     borderRadius: 16,
//     padding: 16,
//     maxHeight: "60%",
//     borderWidth: 1,
//     borderColor: COLORS.cardBorder,
//   },
//   modalTitle: {
//     fontSize: 17,
//     fontWeight: "700",
//     color: COLORS.text,
//     textAlign: "center",
//     marginBottom: 16,
//   },
//   staffItem: {
//     paddingVertical: 14,
//     paddingHorizontal: 16,
//     borderBottomWidth: 1,
//     borderBottomColor: COLORS.cardBorder,
//   },
//   staffNameText: { fontSize: 15, color: COLORS.text },
//   cancelButtonModal: {
//     marginTop: 12,
//     paddingVertical: 14,
//     backgroundColor: COLORS.surface,
//     borderRadius: 12,
//     alignItems: "center",
//     borderWidth: 1,
//     borderColor: COLORS.cardBorder,
//   },
//   cancelText: { color: COLORS.textSecondary, fontWeight: "600", fontSize: 15 },
// });

import React, {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Image,
  ScrollView,
  ActivityIndicator,
  Modal,
  FlatList,
  RefreshControl,
} from "react-native";
import {
  ChevronDown,
  UserCheck,
  CheckCircle,
  XCircle,
  Briefcase,
} from "lucide-react-native";
import {
  Calendar,
  Clock,
  MapPin,
  FileText,
  CalendarDays,
} from "lucide-react-native";
import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import BottomTab from "./BottomTab";
import Toast from "react-native-toast-message";
import {
  getUserProfile,
  getContractorStaff,
  postGuardJobs,
} from "../services/authApi";
import { useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import LinearGradient from "react-native-linear-gradient";
import axios from "axios";

const BASE_URL = "https://apis.staffoo.com.au/api";

// ─── Design System ─────────────────────────────────────────────────────────────

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

// ─── Types ─────────────────────────────────────────────────────────────────────

type AvailableJob = {
  id: number;
  title: string;
  siteName: string;
  location: string;
  address: string;
  date: string;
  startTime: string;
  endTime: string;
  rate: string;
  status?: string;
  raw: any;
};

type Props = { navigation: any; route: any };

// ─── Helpers ───────────────────────────────────────────────────────────────────

const formatDate = (val: any): string => {
  if (!val) return "—";
  const clean = String(val).split("T")[0].split(" ")[0];
  const parts = clean.includes("-") ? clean.split("-") : clean.split("/");
  if (parts.length !== 3) return "—";
  let [y, m, d] = parts;
  if (y.length === 4) {
    return `${d.padStart(2, "0")}/${m.padStart(2, "0")}/${y}`;
  }
  return `${y.padStart(2, "0")}/${m.padStart(2, "0")}/${d}`;
};

const formatTime = (val: any): string => {
  if (!val) return "—";
  const str = String(val).trim();
  const parts = str.split(" ");
  const time = parts[1] || parts[0];
  if (time && time.includes(":")) return time.slice(0, 5);
  return "—";
};

const capitalizeName = (name: string = ""): string =>
  name
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

const getInitials = (name: string): string => {
  if (!name) return "U";
  const parts = name.trim().split(" ").filter(Boolean);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return parts[0][0].toUpperCase() + parts[parts.length - 1][0].toUpperCase();
};

const shapeJobForDetails = (raw: any) => {
  if (raw?.start && raw?.end) return raw;
  const roster = raw?.roster?.roster || raw?.roster || raw || {};
  if (roster?.start && roster?.end) return roster;
  return {
    id: raw?.id,
    start: raw?.start_time || raw?.start || null,
    end: raw?.end_time || raw?.end || null,
    hours: raw?.total_hours || raw?.hours || null,
    site: {
      site_name: raw?.site_name || raw?.site?.site_name || "N/A",
      address: raw?.site_address || raw?.address || raw?.site?.address || "N/A",
      coordinates: raw?.coordinates || raw?.site?.coordinates || null,
    },
  };
};

// ─── Component ─────────────────────────────────────────────────────────────────

export default function StaffShifts({ navigation, route }: Props) {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ["75%", "85%"], []);
  const isAppReadyRef = useRef(false);
  const [activeTab, setActiveTab] = useState<"New" | "Accepted">("Accepted");

  const [availableJobs, setAvailableJobs] = useState<AvailableJob[]>([]);
  const [loadingAvailable, setLoadingAvailable] = useState(false);

  const [todayShifts, setTodayShifts] = useState<any[]>([]);
  const [weekShifts, setWeekShifts] = useState<any[]>([]);
  const [loadingToday, setLoadingToday] = useState(false);
  const [loadingWeek, setLoadingWeek] = useState(false);

  const [userType, setUserType] = useState<string>("");
  const [userId, setUserId] = useState<number>(0);
  const [userDocuments, setUserDocuments] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  const [notificationJob, setNotificationJob] = useState<any>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<number | null>(null);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [showStaffDropdown, setShowStaffDropdown] = useState(false);

  // ─── Load user from storage ─────────────────────────────────────────────────

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userStr = await AsyncStorage.getItem("user");
        const cachedImage = await AsyncStorage.getItem("profileImage");
        if (userStr) {
          const parsedUser = JSON.parse(userStr);
          setUser(parsedUser);
          if (cachedImage) {
            setProfileImage(cachedImage);
          } else if (parsedUser?.staff?.profile_image) {
            setProfileImage(
              `https://apis.staffoo.com.au/storage/${parsedUser.staff.profile_image}`,
            );
          }
        }
      } catch (e) {
        console.log("User load error", e);
      }
    };
    loadUser();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      isAppReadyRef.current = true;
    }, 800); // small delay ensures navigation + sheet mounted

    return () => clearTimeout(timer);
  }, []);

  const openBottomSheet = (job: any) => {
    setNotificationJob(job);

    // IMPORTANT: delay opening sheet until UI is ready
    setTimeout(() => {
      setSheetOpen(true);
      bottomSheetRef.current?.snapToIndex(0);
    }, 300);
  };

  // ─── Fetch profile ──────────────────────────────────────────────────────────

  useEffect(() => {
    const fetchProfile = async () => {
      setLoadingProfile(true);
      try {
        const stored = await AsyncStorage.getItem("user");
        if (!stored) return;
        const parsed = JSON.parse(stored);
        const idFromStorage = Number(parsed?.id);
        if (!idFromStorage) return;
        setUserId(idFromStorage);

        const res = await getUserProfile(idFromStorage);
        if (res?.success && res?.data) {
          setUserDocuments(res.data.documents || []);
          setUserType((res.data.user_type || "").trim().toLowerCase());
        } else {
          setUserType((parsed.user_type || "").trim().toLowerCase());
        }
      } catch (err) {
        console.error("[Profile Error]:", err);
        const stored = await AsyncStorage.getItem("user");
        if (stored) {
          const parsed = JSON.parse(stored);
          setUserType((parsed.user_type || "").trim().toLowerCase());
        }
      } finally {
        setLoadingProfile(false);
      }
    };
    fetchProfile();
  }, []);

  // ─── Fetch available jobs ───────────────────────────────────────────────────

  const fetchAvailableJobs = async () => {
    try {
      setLoadingAvailable(true);
      const token = await AsyncStorage.getItem("@auth_token");

      const response = await axios.get(`${BASE_URL}/jobs/available`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      let apiJobs: any[] = [];
      if (
        response.data?.data?.jobs?.data &&
        Array.isArray(response.data.data.jobs.data)
      ) {
        apiJobs = response.data.data.jobs.data;
      } else if (
        response.data?.jobs?.data &&
        Array.isArray(response.data.jobs.data)
      ) {
        apiJobs = response.data.jobs.data;
      } else if (Array.isArray(response.data?.data)) {
        apiJobs = response.data.data;
      } else if (Array.isArray(response.data)) {
        apiJobs = response.data;
      }

      const formatted: AvailableJob[] = apiJobs.map((job: any) => {
        let formattedDate = "TBD";
        if (job.start_time || job.start) {
          const d = new Date(job.start_time || job.start);
          formattedDate = `${String(d.getDate()).padStart(2, "0")}/${String(
            d.getMonth() + 1,
          ).padStart(2, "0")}/${d.getFullYear()}`;
        }

        const startRaw = job.start_time || job.start;
        const endRaw = job.end_time || job.end;

        const startTime = startRaw
          ? new Date(startRaw).toLocaleTimeString("en-AU", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            })
          : "TBD";

        const endTime = endRaw
          ? new Date(endRaw).toLocaleTimeString("en-AU", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            })
          : "TBD";

        return {
          id: job.id,
          title: job.title || "Security Guard Shift",
          siteName: job.site_name || job.site?.site_name || "N/A",
          location: job.state ? job.state.toUpperCase() : "N/A",
          address:
            job.site_address ||
            job.address ||
            job.site?.address ||
            "Address not available",
          date: formattedDate,
          startTime,
          endTime,
          rate: job.hourly_rate ? `$${job.hourly_rate}/hour` : "$32.50/hour",
          status: job.job_status
            ? job.job_status.charAt(0).toUpperCase() + job.job_status.slice(1)
            : undefined,
          raw: job,
        };
      });

      setAvailableJobs(formatted);
    } catch (error: any) {
      console.error(
        "Available jobs error:",
        error?.response?.data || error.message,
      );
      Toast.show({
        type: "error",
        text1: "Failed to load available jobs",
        text2: "Pull down to retry",
      });
    } finally {
      setLoadingAvailable(false);
    }
  };
  useEffect(() => {
    if (sheetOpen) {
      bottomSheetRef.current?.expand();
      bottomSheetRef.current?.snapToIndex(0);
    }
  }, [sheetOpen]);

  // ─── Fetch accepted shifts ──────────────────────────────────────────────────

  const fetchAcceptedShifts = useCallback(async () => {
    setLoadingToday(true);
    try {
      const todayRes = await postGuardJobs("confirmed", "today");
      setTodayShifts(todayRes?.data?.today || todayRes?.data || []);
    } catch {
      Toast.show({ type: "error", text1: "Failed to load today's shifts" });
    } finally {
      setLoadingToday(false);
    }

    setLoadingWeek(true);
    try {
      const weekRes = await postGuardJobs("confirmed", "week");
      setWeekShifts(weekRes?.data?.week || weekRes?.data || []);
    } catch {
      Toast.show({ type: "error", text1: "Failed to load week shifts" });
    } finally {
      setLoadingWeek(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchAcceptedShifts();
      fetchAvailableJobs();
    }, [fetchAcceptedShifts]),
  );

  // ─── ASAP notification bottom sheet ────────────────────────────────────────

  const extractJobData = (notif: any): any => {
    if (!notif) return {};
    if (notif?.additionalData?.roster?.roster?.id)
      return notif.additionalData.roster.roster;
    if (notif?.additionalData?.roster?.id) return notif.additionalData.roster;
    if (notif?.roster?.roster?.id) return notif.roster.roster;
    if (notif?.id && notif?.start) return notif;
    const deepSearch = (obj: any): any => {
      if (!obj || typeof obj !== "object") return null;
      if (obj.start && obj.end && (obj.site || obj.address)) return obj;
      for (const key in obj) {
        const found = deepSearch(obj[key]);
        if (found) return found;
      }
      return null;
    };
    return deepSearch(notif) || notif;
  };

  useEffect(() => {
    if (route?.params?.notificationJob && userType) {
      setNotificationJob(route.params.notificationJob);
      setSheetOpen(true);
    }
  }, [route?.params?.notificationJob, userType]);

  useFocusEffect(
    useCallback(() => {
      const checkPending = async () => {
        try {
          const pending = await AsyncStorage.getItem(
            "@pending_asap_notification",
          );
          if (pending && userType) {
            const job = JSON.parse(pending);
            if (isAppReadyRef.current) {
              openBottomSheet(job);
            } else {
              setTimeout(() => {
                openBottomSheet(job);
              }, 1200);
            }
            await AsyncStorage.removeItem("@pending_asap_notification");
          }
        } catch (err) {
          console.error("[Pending Notification Error]:", err);
        }
      };
      checkPending();
    }, [userType]),
  );

  useEffect(() => {
    if (userType !== "contractor" || !notificationJob || !userId) return;
    const loadStaff = async () => {
      setLoadingStaff(true);
      try {
        const res = await getContractorStaff(userId);
        if (res?.guards?.length) setStaffList(res.guards);
      } catch (err) {
        console.error("[Staff Load Error]:", err);
      } finally {
        setLoadingStaff(false);
      }
    };
    loadStaff();
  }, [userType, notificationJob, userId]);

  const handleSheetClose = () => {
    setNotificationJob(null);
    setSelectedStaff(null);
    setSheetOpen(false);
  };

  const handleAcceptNotification = () => {
    if (userType === "contractor" && !selectedStaff) {
      Toast.show({ type: "error", text1: "Please select a staff member" });
      return;
    }
    navigation.navigate("AsapJobDetails", {
      job: notificationJob,
      staff_id: userType === "contractor" ? selectedStaff : undefined,
    });
    bottomSheetRef.current?.close();
    setSelectedStaff(null);
    setSheetOpen(false);
  };

  const handleDeclineNotification = () => {
    bottomSheetRef.current?.close();
    setSheetOpen(false);
  };

  // ─── New tab handlers ───────────────────────────────────────────────────────

  const handleAcceptJob = (job: AvailableJob) => {
    const shaped = shapeJobForDetails(job.raw);
    navigation.navigate("AsapJobDetails", {
      job: shaped,
      availableJobId: job.id,
      onJobAccepted: () => {
        setAvailableJobs((prev) => prev.filter((j) => j.id !== job.id));
        fetchAcceptedShifts();
        setActiveTab("Accepted");
      },
    });
  };

  const handleRejectJob = (job: AvailableJob) => {
    setAvailableJobs((prev) => prev.filter((j) => j.id !== job.id));
    Toast.show({ type: "info", text1: "Job Skipped", position: "top" });
  };

  useFocusEffect(
    useCallback(() => {
      if (route?.params?.jobAccepted) {
        const acceptedId = route.params.jobAccepted;
        setAvailableJobs((prev) => prev.filter((j) => j.id !== acceptedId));
        fetchAcceptedShifts();
        setActiveTab("Accepted");
        navigation.setParams({ jobAccepted: undefined });
      }
    }, [route?.params?.jobAccepted]),
  );

  // ─── Render: Available job card ─────────────────────────────────────────────

  const renderAvailableCard = ({ item }: { item: AvailableJob }) => (
    <View style={styles.shiftCard}>
      {/* Header row */}
      <View style={cardStyles.headerRow}>
        <View style={cardStyles.siteIconWrap}>
          <Briefcase size={14} color={COLORS.primary} />
        </View>
        <Text style={cardStyles.siteNameText} numberOfLines={1}>
          {item.siteName}
        </Text>
        {item.status ? (
          <View style={cardStyles.statusBadge}>
            <Text style={cardStyles.statusBadgeText}>{item.status}</Text>
          </View>
        ) : null}
      </View>

      {/* Divider */}
      <View style={cardStyles.divider} />

      {/* Rate pill */}
      {/* <View style={cardStyles.ratePill}>
        <Text style={cardStyles.rateText}>{item.rate}</Text>
      </View> */}

      {/* Info rows */}
      <View style={styles.rowItem}>
        <View style={styles.iconBgGrey}>
          <MapPin size={14} color={COLORS.primary} />
        </View>
        <Text style={styles.rowText}>{item.location}</Text>
      </View>

      <View style={styles.rowItem}>
        <View style={styles.iconBgGrey}>
          <CalendarDays size={14} color={COLORS.primary} />
        </View>
        <Text style={styles.rowText}>
          {item.date}
          {"   "}
          <Text style={{ color: COLORS.primary, fontWeight: "700" }}>
            {item.startTime} – {item.endTime}
          </Text>
        </Text>
      </View>

      <View style={styles.rowItem}>
        <View style={styles.iconBgGrey}>
          <FileText size={14} color={COLORS.primary} />
        </View>
        <Text style={[styles.addressText]} numberOfLines={2}>
          {item.address}
        </Text>
      </View>

      {/* Action buttons — only Accept, no Skip */}
      <TouchableOpacity
        style={cardStyles.acceptjobButton}
        onPress={() => handleAcceptJob(item)}
        activeOpacity={0.8}
      >
        <CheckCircle size={16} color="#fff" />
        <Text style={cardStyles.acceptjobText}>ACCEPT JOB</Text>
      </TouchableOpacity>
    </View>
  );

  // ─── Render: Accepted shift card ────────────────────────────────────────────

  const renderShiftCard = (shift: any, index: number, isToday = false) => {
    const isConfirmed = shift.job_status?.toLowerCase() === "confirmed";
    const signinStatus = Number(shift.signin_status ?? 0);
    let onPress = () =>
      Toast.show({ type: "info", text1: "Action not available" });
    let showButton = false;
    let buttonText = "";
    let buttonVariant: "signIn" | "ongoing" | "upcoming" = "upcoming";
    let disabled = false;

    if (isToday && isConfirmed && signinStatus === 0) {
      showButton = true;
      buttonText = "Sign In";
      buttonVariant = "signIn";

      const guardUserId = shift.guard?.user_id ?? shift.user_id;
      const isUserAdmin = Number(guardUserId) === 1;
      let hasMissingDocs = false;

      if (!isUserAdmin && Number(shift.is_document) === 1) {
        hasMissingDocs =
          !userDocuments ||
          userDocuments.length === 0 ||
          userDocuments.some((doc: any) => !doc.file || !doc.document_no);
      }

      if (hasMissingDocs) {
        onPress = () =>
          Toast.show({
            type: "error",
            text1: "Incomplete Profile",
            text2: "Please add your documents first then you can sign-in",
          });
        disabled = true;
      } else {
        onPress = () => navigation.navigate("SignIn", { shift });
      }
    } else if (isToday && isConfirmed && signinStatus === 1) {
      showButton = true;
      buttonText = "Ongoing";
      buttonVariant = "ongoing";
      onPress = () => navigation.navigate("Ongoing", { currentShift: shift });
    } else if (!isToday) {
      showButton = true;
      buttonText = "Upcoming";
      buttonVariant = "upcoming";
      disabled = true;
    }

    const actionBtnStyle =
      buttonVariant === "signIn"
        ? styles.signInButton
        : buttonVariant === "ongoing"
        ? styles.ongoingButton
        : styles.viewButton;

    const actionTextColor =
      buttonVariant === "signIn"
        ? "#92400e"
        : buttonVariant === "ongoing"
        ? COLORS.success
        : COLORS.textMuted;

    return (
      <View key={index} style={styles.shiftCard}>
        {/* Date + Time row */}
        <View style={styles.rowBetween}>
          <View style={styles.rowItem}>
            <View style={styles.iconBgGrey}>
              <CalendarDays size={14} color={COLORS.primary} />
            </View>
            <Text style={styles.rowText}>
              {formatDate(shift.start) ||
                `${String(shift.job_start_day || "—").padStart(
                  2,
                  "0",
                )}/${String(shift.job_start_month || "—").padStart(2, "0")}/${
                  shift.job_start_year || "—"
                }`}
            </Text>
          </View>

          <View style={styles.rowItem}>
            <View style={styles.iconBgGrey}>
              <Clock size={14} color={COLORS.primary} />
            </View>
            <Text style={styles.rowText}>
              {formatTime(shift.start)} – {formatTime(shift.end)}
            </Text>
          </View>
        </View>

        {/* Address */}
        <View style={styles.rowItem}>
          <View style={styles.iconBgGrey}>
            <MapPin size={14} color={COLORS.primary} />
          </View>
          <View style={styles.addressContainer}>
            <Text style={styles.addressText} numberOfLines={3}>
              {shift.site?.address || "No address available"}
            </Text>
          </View>
        </View>

        {/* Instructions file */}
        <TouchableOpacity style={styles.rowItem}>
          <View style={styles.iconBgGrey}>
            <FileText size={14} color={COLORS.primary} />
          </View>
          <Text style={styles.documentText}>
            {shift.instructions_file
              ? "Click to view instructions"
              : "No instruction file"}
          </Text>
        </TouchableOpacity>

        {/* Notes + Action button */}
        <View style={[styles.rowBetween, { alignItems: "flex-start" }]}>
          <View style={{ flex: 1, paddingRight: 16 }}>
            <Text style={styles.detailsLabel}>Instructions / Notes</Text>
            <Text style={styles.detailsValue}>
              {shift.site?.site_description || "No site description"}
            </Text>
          </View>

          {showButton && (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={onPress}
              disabled={disabled}
              style={[
                styles.actionButton,
                actionBtnStyle,
                disabled && { opacity: 0.5 },
              ]}
            >
              <Text
                style={[styles.actionButtonText, { color: actionTextColor }]}
              >
                {buttonText}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  // ─── Render tab contents ────────────────────────────────────────────────────

  const renderNewTab = () => {
    if (loadingAvailable) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading available jobs…</Text>
        </View>
      );
    }

    if (availableJobs.length === 0) {
      return (
        <View style={cardStyles.emptyContainer}>
          <View style={cardStyles.emptyIconWrap}>
            <Briefcase size={36} color={COLORS.primary} />
          </View>
          <Text style={cardStyles.emptyText}>No available jobs right now</Text>
          <Text style={cardStyles.emptySubText}>Pull down to refresh</Text>
        </View>
      );
    }

    return (
      <FlatList
        data={availableJobs}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderAvailableCard}
        contentContainerStyle={{ paddingBottom: 30 }}
        scrollEnabled={false}
        showsVerticalScrollIndicator={false}
      />
    );
  };

  const renderAcceptedTab = () => {
    if (loadingToday || loadingWeek) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading Shifts…</Text>
        </View>
      );
    }

    return (
      <>
        <Text style={styles.sectionHeader}>Today's Shifts</Text>
        {todayShifts.length === 0 ? (
          <View style={styles.emptyBlock}>
            <Text style={styles.emptyText}>No shifts today</Text>
          </View>
        ) : (
          todayShifts.map((shift, index) => renderShiftCard(shift, index, true))
        )}

        <Text style={styles.sectionHeader}>This Week's Shifts</Text>
        {weekShifts.length === 0 ? (
          <View style={styles.emptyBlock}>
            <Text style={styles.emptyText}>No shifts this week</Text>
          </View>
        ) : (
          weekShifts.map((shift, index) => renderShiftCard(shift, index, false))
        )}
      </>
    );
  };

  // ─── Main render ────────────────────────────────────────────────────────────

  const jobData = extractJobData(notificationJob);
  const isRefreshing =
    activeTab === "New" ? loadingAvailable : loadingToday || loadingWeek;

  const onRefresh = () => {
    if (activeTab === "New") fetchAvailableJobs();
    else fetchAcceptedShifts();
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      {/* ── Header (fixed) ── */}
      <LinearGradient
        colors={[COLORS.heroBg1, COLORS.heroBg2]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <TouchableOpacity
          style={styles.headerLeft}
          onPress={() => navigation.navigate("Profile")}
          activeOpacity={0.85}
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
          <View>
            <Text style={styles.greeting}>
              {capitalizeName(user?.name || "User Name")} 👋
            </Text>
            <Text style={styles.staffName}>Welcome to Staffoo</Text>
          </View>
        </TouchableOpacity>
      </LinearGradient>

      {/* ── Tab bar (fixed) ── */}
      <View style={tabStyles.tabBar}>
        {(["Accepted", "New"] as const).map((tab) => {
          const isActive = activeTab === tab;
          const badge =
            tab === "New" && availableJobs.length > 0
              ? availableJobs.length
              : null;
          return (
            <TouchableOpacity
              key={tab}
              style={[tabStyles.tab, isActive && tabStyles.tabActive]}
              onPress={() => setActiveTab(tab)}
              activeOpacity={0.85}
            >
              <View style={tabStyles.tabInner}>
                <Text
                  style={[
                    tabStyles.tabText,
                    isActive && tabStyles.tabTextActive,
                  ]}
                >
                  {tab}
                </Text>
                {badge !== null && (
                  <View style={tabStyles.badge}>
                    <Text style={tabStyles.badgeText}>{badge}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
      >
        {/* ── Tab content ── */}
        {activeTab === "New" ? renderNewTab() : renderAcceptedTab()}

        {!notificationJob && <View style={styles.placeholder} />}
      </ScrollView>

      {/* ── ASAP notification bottom sheet ── */}
      <BottomSheet
        ref={bottomSheetRef}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose
        onClose={handleSheetClose}
        backgroundStyle={styles.sheetBackground}
        handleIndicatorStyle={styles.sheetHandle}
        enableDynamicSizing={false}
        android_keyboardInputMode="adjustResize"
        onChange={(index) => {
          if (index === -1) handleSheetClose();
        }}
      >
        <BottomSheetView style={[styles.sheetContent, { flex: 1 }]}>
          <Text style={styles.newRequest}>🔔 New Job Request</Text>

          <View style={styles.infoRow}>
            <Calendar size={18} color={COLORS.primary} />
            <Text style={styles.infoText}>{formatDate(jobData.start)}</Text>
          </View>

          <View style={styles.infoRow}>
            <Clock size={18} color={COLORS.primary} />
            <Text style={styles.infoText}>
              {formatTime(jobData.start)} – {formatTime(jobData.end)}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <MapPin size={18} color={COLORS.danger} />
            <Text style={styles.addressInSheet} numberOfLines={4}>
              {jobData?.site?.address ||
                jobData?.address ||
                "No address available"}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Clock size={18} color={COLORS.textSecondary} />
            <Text style={styles.infoTextt}>
              Total Hours: {jobData?.hours ?? "—"}
            </Text>
          </View>

          {userType === "contractor" && (
            <View style={{ marginVertical: 10 }}>
              <Text style={styles.assignLabel}>Assign to Staff Member</Text>
              {loadingStaff ? (
                <ActivityIndicator size="small" color={COLORS.primary} />
              ) : staffList.length === 0 ? (
                <Text style={{ color: COLORS.danger, padding: 10 }}>
                  No staff available
                </Text>
              ) : (
                <>
                  <TouchableOpacity
                    style={styles.customDropdown}
                    onPress={() => setShowStaffDropdown(true)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.dropdownContent}>
                      <UserCheck size={18} color={COLORS.primary} />
                      <Text style={styles.dropdownText} numberOfLines={1}>
                        {selectedStaff
                          ? staffList.find((s) => s.id === selectedStaff)
                              ?.name || `Staff #${selectedStaff}`
                          : "Select staff member"}
                      </Text>
                    </View>
                    <View style={styles.iconRight}>
                      <ChevronDown size={18} color={COLORS.textMuted} />
                    </View>
                  </TouchableOpacity>

                  <Modal
                    visible={showStaffDropdown}
                    transparent
                    animationType="fade"
                    onRequestClose={() => setShowStaffDropdown(false)}
                  >
                    <View style={styles.modalOverlay}>
                      <View style={styles.dropdownModal}>
                        <Text style={styles.modalTitle}>Select Staff</Text>
                        <FlatList
                          data={staffList}
                          keyExtractor={(item) => item.id.toString()}
                          renderItem={({ item }) => (
                            <TouchableOpacity
                              style={styles.staffItem}
                              onPress={() => {
                                setSelectedStaff(item.id);
                                setShowStaffDropdown(false);
                              }}
                            >
                              <Text style={styles.staffNameText}>
                                {item.name || item.email || `Staff #${item.id}`}
                              </Text>
                            </TouchableOpacity>
                          )}
                        />
                        <TouchableOpacity
                          style={styles.cancelButtonModal}
                          onPress={() => setShowStaffDropdown(false)}
                        >
                          <Text style={styles.cancelText}>Cancel</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </Modal>
                </>
              )}
            </View>
          )}

          {/* Sheet action buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[
                styles.acceptButton,
                userType === "contractor" &&
                  !selectedStaff &&
                  styles.disabledButton,
              ]}
              disabled={userType === "contractor" && !selectedStaff}
              onPress={handleAcceptNotification}
            >
              <CheckCircle size={16} color="#fff" />
              <Text style={styles.buttonText}>ACCEPT</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.declineButton}
              onPress={handleDeclineNotification}
            >
              <XCircle size={16} color="#fff" />
              <Text style={styles.buttonText}>DECLINE</Text>
            </TouchableOpacity>
          </View>
        </BottomSheetView>
      </BottomSheet>

      <BottomTab navigation={navigation} activeTab="StaffShifts" />
    </SafeAreaView>
  );
}

// ─── Tab bar styles ───────────────────────────────────────────────────────────

const tabStyles = StyleSheet.create({
  tabBar: {
    flexDirection: "row",
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    marginVertical: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  tab: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  // tabActive: {
  //   backgroundColor: COLORS.card,
  //   shadowColor: COLORS.primary,
  //   shadowOffset: { width: 0, height: 2 },
  //   shadowOpacity: 0.2,
  //   shadowRadius: 6,
  //   elevation: 3,
  // },
  tabActive: {
    backgroundColor: "#ccc",
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  tabInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textMuted,
  },
  tabTextActive: {
    color: COLORS.primary,
  },
  badge: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 5,
  },
  badgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
});

// ─── Available job card styles ────────────────────────────────────────────────

const cardStyles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    gap: 8,
  },
  siteIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: COLORS.primaryGlow,
    justifyContent: "center",
    alignItems: "center",
  },
  siteNameText: {
    fontSize: 15,
    color: COLORS.text,
    fontWeight: "700",
    flex: 1,
  },
  statusBadge: {
    backgroundColor: COLORS.warningBg,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: COLORS.warning,
  },
  statusBadgeText: {
    color: COLORS.warning,
    fontSize: 10,
    fontWeight: "700",
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.cardBorder,
    marginBottom: 10,
  },
  ratePill: {
    alignSelf: "flex-start",
    backgroundColor: COLORS.primaryGlow,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
  },
  rateText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: "700",
  },
  acceptButton: {
    backgroundColor: COLORS.success,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginTop: 14,
  },
  acceptText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 13,
    letterSpacing: 0.5,
  },
  acceptjobButton: {
    backgroundColor: COLORS.success,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginTop: 5,
    width: "40%",

    alignSelf: "center", // 👈 add this
  },
  acceptjobText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 10,
    letterSpacing: 0.5,
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: "center",
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primaryGlow,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: 17,
    fontWeight: "600",
    textAlign: "center",
  },
  emptySubText: {
    color: COLORS.textMuted,
    fontSize: 13,
    marginTop: 6,
    textAlign: "center",
  },
});

// ─── Main styles ──────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingTop: 40,
    paddingHorizontal: 16,
  },
  scrollContainer: { flex: 1 },
  scrollContent: {
    // paddingHorizontal: 16,
    paddingBottom: 100,
  },

  // ── Header ──
  headerGradient: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: COLORS.primaryBorder,
  },
  initialsAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.primaryGlow,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: COLORS.primaryBorder,
  },
  initialsText: { color: COLORS.primary, fontSize: 18, fontWeight: "700" },
  greeting: { fontSize: 16, color: COLORS.text, fontWeight: "700" },
  staffName: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: "400",
    marginTop: 2,
  },

  // ── Section headers ──
  sectionHeader: {
    fontSize: 16,
    fontWeight: "700",
    marginTop: 12,
    marginBottom: 10,
    paddingHorizontal: 2,
    color: COLORS.primary,
    letterSpacing: 0.3,
  },

  // ── Shift card ──
  shiftCard: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.cardBorder,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  rowItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 5,
  },
  rowText: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: "500",
    marginTop: 8,
  },
  iconBgGrey: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.primaryGlow,
    justifyContent: "center",
    alignItems: "center",
  },
  addressText: {
    fontSize: 11,
    color: "#ccc",
    flex: 1,
    flexWrap: "wrap",
    marginTop: 5,
  },
  addressContainer: { flex: 1, marginRight: 15 },
  documentText: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: "500",
    marginTop: 10,
  },
  detailsLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textMuted,
    marginBottom: 3,
  },
  detailsValue: { fontSize: 13, color: COLORS.textSecondary, marginTop: 3 },

  // ── Action buttons in shift cards ──
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    minWidth: 88,
    alignItems: "center",
  },
  signInButton: {
    backgroundColor: "rgba(245,166,35,0.15)",
    borderWidth: 1,
    borderColor: COLORS.warning,
  },
  ongoingButton: {
    backgroundColor: "rgba(52,200,138,0.12)",
    borderWidth: 1,
    borderColor: COLORS.success,
  },
  viewButton: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  actionButtonText: { fontSize: 11, fontWeight: "700" },

  // ── Loading / empty ──
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 80,
  },
  loadingText: { marginTop: 16, fontSize: 14, color: COLORS.textSecondary },
  emptyBlock: {
    paddingVertical: 20,
    alignItems: "center",
  },
  emptyText: {
    textAlign: "center",
    fontSize: 13,
    color: COLORS.textMuted,
  },
  placeholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    minHeight: 200,
    paddingVertical: 40,
  },
  disabledButton: { opacity: 0.45 },

  // ── Bottom sheet ──
  sheetBackground: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  sheetHandle: {
    backgroundColor: COLORS.textMuted,
    width: 40,
    height: 4,
    borderRadius: 999,
  },
  sheetContent: {
    paddingHorizontal: 22,
    paddingTop: 10,
    paddingBottom: 44,
  },
  newRequest: {
    fontSize: 19,
    color: COLORS.primary,
    fontWeight: "700",
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
    gap: 14,
    backgroundColor: COLORS.card,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  infoText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: "500" },
  infoTextt: { fontSize: 14, color: COLORS.text, fontWeight: "700" },
  addressInSheet: {
    fontSize: 13,
    fontWeight: "500",
    color: COLORS.textSecondary,
    flex: 1,
  },
  assignLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  buttonContainer: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
  },
  acceptButton: {
    flex: 1,
    backgroundColor: COLORS.success,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  declineButton: {
    flex: 1,
    backgroundColor: COLORS.dangerBg,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.danger,
  },
  buttonText: { color: "white", fontSize: 13, fontWeight: "700" },

  // ── Staff dropdown ──
  customDropdown: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    width: "100%",
    overflow: "hidden",
  },
  dropdownContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  dropdownText: { fontSize: 14, color: COLORS.text, flexShrink: 1 },
  iconRight: {
    marginLeft: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "center",
    alignItems: "center",
  },
  dropdownModal: {
    width: "85%",
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    maxHeight: "60%",
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: COLORS.text,
    textAlign: "center",
    marginBottom: 16,
  },
  staffItem: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  staffNameText: { fontSize: 15, color: COLORS.text },
  cancelButtonModal: {
    marginTop: 12,
    paddingVertical: 14,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  cancelText: { color: COLORS.textSecondary, fontWeight: "600", fontSize: 15 },
});
