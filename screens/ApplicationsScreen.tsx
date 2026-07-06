// import React, { useState, useEffect, useMemo } from "react";
// import {
//   View,
//   Text,
//   ScrollView,
//   TouchableOpacity,
//   StyleSheet,
//   SafeAreaView,
//   Dimensions,
//   Modal,
//   Platform,
//   ActivityIndicator,
//   Alert,
//   TextInput,
// } from "react-native";
// import { Picker } from "@react-native-picker/picker";
// import DateTimePicker from "@react-native-community/datetimepicker";
// import FileViewer from "react-native-file-viewer";
// import {
//   ChevronLeft,
//   ChevronRight,
//   Calendar,
//   Clock,
//   User,
//   MapPin,
//   FileText,
//   Building2,
//   Timer,
//   UserCircle,
//   ShieldCheck,
// } from "lucide-react-native";

// import BottomTab from "./BottomTab";
// import AsyncStorage from "@react-native-async-storage/async-storage";
// import axios from "axios";
// import Toast from "react-native-toast-message";
// import { getContractorStaff, BASE_URL } from "../services/authApi";
// import PDFGenerator from "./utils/PDFGenerator";
// import LinearGradient from "react-native-linear-gradient";

// const { width: SCREEN_WIDTH } = Dimensions.get("window");
// const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
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

// interface Customer {
//   id: number;
//   name: string;
//   email: string;
//   phone: string;
//   user_type: string;
// }

// interface Guard {
//   id: number;
//   name: string;
//   email: string;
//   phone: string;
//   user_type: string;
// }

// interface Shift {
//   id: number;
//   siteName: string;
//   address?: string;
//   siteRadius?: string;
//   guard: string;
//   guardData?: Guard;
//   dayShort: string;
//   dateStr: string;
//   startTime: string;
//   endTime: string;
//   tag: string;
//   jobStatus: string;
//   hours: number;
//   cardBackground: string;
//   jobType?: string;
//   jobAmount?: string;
//   isAsap?: boolean;
//   inPaysheet?: number;
//   paymentStatus?: string;
//   shiftPayable?: string;
//   createdAt?: string;
//   customer?: Customer;

//   signin_lat?: number;
//   signin_lng?: number;
//   signout_lat?: number;
//   signout_lng?: number;
//   signout_location?: string;
// }

// export default function WeeklyRosterScreen({ navigation }: any) {
//   const [shifts, setShifts] = useState<Shift[]>([]);
//   const [generatingPDF, setGeneratingPDF] = useState(false);
//   const [totalHours, setTotalHours] = useState(0);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState<string | null>(null);
//   const [userType, setUserType] = useState<string | null>(null);
//   const [isActive, setIsActive] = useState(false);
//   const [showDateModal, setShowDateModal] = useState(false);
//   const [showShiftModal, setShowShiftModal] = useState(false);
//   const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
//   const [shiftIndex, setShiftIndex] = useState(0);
//   const [accepting, setAccepting] = useState(false);
//   const [staffList, setStaffList] = useState<{ id: number; name: string }[]>(
//     [],
//   );
//   const [searchText, setSearchText] = useState("");
//   const [selectedStaffId, setSelectedStaffId] = useState<number | null>(null);
//   const [loadingStaff, setLoadingStaff] = useState(false);
//   const [user, setUser] = useState<any>(null);
//   const isRestrictedUser = userType === "staff" || userType === "customer";

//   const currentDate = new Date();
//   const [weekStart, setWeekStart] = useState(() => {
//     const d = new Date(currentDate);
//     d.setDate(d.getDate() - d.getDay() + (d.getDay() === 0 ? -6 : 1));
//     return d;
//   });

//   const formatDateMMDDYYYY = (date: Date) =>
//     `${(date.getMonth() + 1).toString().padStart(2, "0")}-${date
//       .getDate()
//       .toString()
//       .padStart(2, "0")}-${date.getFullYear()}`;

//   const formatDateYYYYMMDD = (date: Date) => date.toISOString().split("T")[0];

//   const datesYYYYMMDD = useMemo(() => {
//     return Array(7)
//       .fill(0)
//       .map((_, i) => {
//         const d = new Date(weekStart);
//         d.setDate(d.getDate() + i);
//         return formatDateYYYYMMDD(d);
//       });
//   }, [weekStart]);

//   const weekLabel = useMemo(() => {
//     const s = weekStart;
//     const e = new Date(s);
//     e.setDate(e.getDate() + 6);
//     return `${s.getDate()} ${s.toLocaleString("default", {
//       month: "short",
//     })} – ${e.getDate()} ${e.toLocaleString("default", {
//       month: "short",
//     })} ${s.getFullYear()}`;
//   }, [weekStart]);

//   const filteredShifts = useMemo(() => {
//     if (!searchText.trim()) return shifts;
//     const q = searchText.toLowerCase().trim();
//     return shifts.filter((item) => {
//       return (
//         item.siteName?.toLowerCase().includes(q) ||
//         item.address?.toLowerCase().includes(q) ||
//         item.jobStatus?.toLowerCase().includes(q)
//       );
//     });
//   }, [searchText, shifts]);

//   const generateShiftPDF = async (shift: Shift) => {
//     if (generatingPDF) return;
//     setGeneratingPDF(true);

//     try {
//       const reportData = {
//         siteName: shift.siteName || "N/A",
//         siteAddress: shift.address || "N/A",
//         guardName: shift.guard || "N/A",
//         shiftStart: shift.startTime || "N/A",
//         shiftEnd: shift.endTime || "N/A",
//         totalHours: shift.hours || 0,
//         jobStatus: shift.jobStatus || "confirmed",
//         date: shift.dateStr || "",
//         signinDetails: {
//           signin_time: shift.startTime,
//           signout_time: shift.endTime,
//           location: shift.address || "N/A",
//           signin_notes: "Shift completed as per roster",
//           signout_notes: "",
//         },
//       };

//       // Generate PDF
//       const filePath = await PDFGenerator.generateShiftReportPDF(reportData);

//       if (!filePath || !filePath.endsWith(".pdf")) {
//         throw new Error("PDF file path not returned");
//       }

//       // Success Alert with Open Option
//       Alert.alert(
//         "✅ PDF Generated Successfully",
//         `File saved as:\n${filePath.split("/").pop()}`,
//         [
//           {
//             text: "Open PDF",
//             onPress: async () => {
//               try {
//                 await FileViewer.open(filePath, { showOpenWithDialog: true });
//               } catch (err: any) {
//                 console.error("Open PDF Error:", err);
//                 Alert.alert(
//                   "Cannot Open PDF",
//                   "No PDF viewer found. You can open it from Downloads/Files app.",
//                 );
//               }
//             },
//           },
//           { text: "OK" },
//         ],
//       );

//       Toast.show({
//         type: "success",
//         text1: "PDF Saved Successfully",
//         text2: "Check Downloads / Files folder",
//         position: "bottom",
//       });
//     } catch (error: any) {
//       console.error("PDF Generation Error:", error);
//       Alert.alert("PDF Error", error.message || "Failed to generate PDF");
//       Toast.show({
//         type: "error",
//         text1: "PDF Generation Failed",
//         text2: error.message || "Please try again",
//         position: "bottom",
//       });
//     } finally {
//       setGeneratingPDF(false);
//     }
//   };

//   const fetchContractorStaff = async () => {
//     try {
//       setLoadingStaff(true);
//       if (!user?.id) return;
//       const res = await getContractorStaff(user.id);
//       if (res?.success && Array.isArray(res.guards)) {
//         setStaffList(res.guards);
//       } else {
//         setStaffList([]);
//         Toast.show({
//           type: "error",
//           text1: "No staff found",
//           position: "bottom",
//         });
//       }
//     } catch (err: any) {
//       Toast.show({
//         type: "error",
//         text1: "Staff load error",
//         text2: err.message || "Network issue",
//         position: "bottom",
//       });
//     } finally {
//       setLoadingStaff(false);
//     }
//   };

//   React.useEffect(() => {
//     const fetchUser = async () => {
//       const userStr = await AsyncStorage.getItem("user");
//       if (userStr) {
//         const loggedInUser = JSON.parse(userStr);
//         setUser(loggedInUser);
//         setIsActive(loggedInUser.profile_completion >= 100);
//         setUserType(loggedInUser.user_type);
//       }
//     };
//     fetchUser();
//   }, []);

//   const fetchShifts = async () => {
//     try {
//       setLoading(true);
//       setError(null);

//       const token = await AsyncStorage.getItem("@auth_token");
//       if (!token) throw new Error("No token");

//       const userStr = await AsyncStorage.getItem("user");
//       if (!userStr) throw new Error("No user");

//       const user = JSON.parse(userStr);
//       const currentUserId = user.id;

//       setUserType(user?.user_type || null);

//       const payload = {
//         user_id: [currentUserId],
//         state: "Victoria",
//         start: formatDateMMDDYYYY(weekStart),
//         end: formatDateMMDDYYYY(
//           new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000),
//         ),
//         roster_id: "1",
//       };

//       const res = await axios.post(
//         `${BASE_URL}/fetch-customer-sites`,
//         payload,
//         {
//           headers: {
//             Authorization: `Bearer ${token}`,
//             "Content-Type": "application/json",
//             Accept: "application/json",
//           },
//         },
//       );

//       if (!res.data?.success || !Array.isArray(res.data?.data)) {
//         setError(null);
//         setShifts([]);
//         return;
//       }

//       const allShifts: Shift[] = [];

//       res.data.data.forEach((site: any) => {
//         const siteName = site.site_name || "Unnamed Site";
//         const address = site.address || site.site_address || "";
//         const siteRadius = site.signin_radius || "";
//         const jobs = site.job_roster || [];

//         jobs.forEach((job: any) => {
//           console.log(
//             "JOB DEBUG =>",
//             job.id,
//             "job_type:",
//             job.job_type,
//             "site:",
//             siteName,
//           );

//           const startDateStr = job.start?.split(" ")[0];

//           if (!startDateStr || !datesYYYYMMDD.includes(startDateStr)) {
//             return;
//           }

//           const startTime = job.start?.split(" ")[1]?.slice(0, 5) || "??:??";

//           const endTime = job.end?.split(" ")[1]?.slice(0, 5) || "??:??";

//           const jobDate = new Date(startDateStr);
//           const dayIndex = jobDate.getDay();

//           const status = (job.job_status || "unknown").toLowerCase();

//           let tag = "Unknown";
//           let cardBackground = "#fff";

//           if (status === "pending") {
//             tag = "Pending";
//           } else if (status === "confirmed") {
//             tag = "Confirmed";
//           } else if (status === "completed" || status === "complete") {
//             tag = "Completed";
//           }

//           const customerData: Customer | undefined = job.customer
//             ? {
//                 id: job.customer.id,
//                 name: job.customer.name || "",
//                 email: job.customer.email || "",
//                 phone: job.customer.phone || "",
//                 user_type: job.customer.user_type || "",
//               }
//             : undefined;

//           const guardData: Guard | undefined = job.guards
//             ? {
//                 id: job.guards.id,
//                 name: job.guards.name || "",
//                 email: job.guards.email || "",
//                 phone: job.guards.phone || "",
//                 user_type: job.guards.user_type || "",
//               }
//             : undefined;

//           const jobType =
//             job.job_type || job.jobType || job.type || site.job_type || "";

//           allShifts.push({
//             id: job.id,
//             siteName,
//             address,
//             siteRadius,

//             guard: job.guards?.name || "Unassigned",
//             guardData,

//             dayShort: DAYS[dayIndex],

//             dateStr: `${jobDate.getDate().toString().padStart(2, "0")}/${(
//               jobDate.getMonth() + 1
//             )
//               .toString()
//               .padStart(2, "0")}/${jobDate.getFullYear()}`,

//             startTime,
//             endTime,

//             tag,
//             jobStatus: status,

//             hours: Number(job.hours || 0),

//             cardBackground,

//             jobType,

//             jobAmount: job.job_amount || "0",

//             isAsap: job.asap === 1,

//             inPaysheet: job.in_paysheet,

//             paymentStatus: job.payment_status || "",

//             shiftPayable: job.shift_payable || "",

//             createdAt: job.created_at || "",

//             customer: customerData,
//           });
//         });
//       });

//       console.log(
//         "SHIFT TYPES =>",
//         allShifts.map((s) => ({
//           id: s.id,
//           site: s.siteName,
//           jobType: s.jobType,
//         })),
//       );

//       allShifts.sort((a, b) => {
//         const da = new Date(
//           `${a.dateStr.split("/").reverse().join("-")} ${a.startTime}`,
//         );

//         const db = new Date(
//           `${b.dateStr.split("/").reverse().join("-")} ${b.startTime}`,
//         );

//         return db.getTime() - da.getTime();
//       });

//       setShifts(allShifts);
//     } catch (err: any) {
//       setError(err.message || "Failed to load shifts");
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     fetchShifts();
//   }, [weekStart]);

//   useEffect(() => {
//     if (userType === "contractor") {
//       fetchContractorStaff();
//     }
//   }, [userType]);

//   const navigateWeek = (dir: "prev" | "next") => {
//     const delta = dir === "next" ? 7 : -7;
//     const newStart = new Date(weekStart);
//     newStart.setDate(newStart.getDate() + delta);
//     setWeekStart(newStart);
//   };

//   const openShiftModal = (shift: Shift) => {
//     if (!shift) return;

//     const idx = shifts.findIndex((s) => s.id === shift.id);
//     setShiftIndex(idx >= 0 ? idx : 0);
//     setSelectedShift(shift);
//     setShowShiftModal(true);

//     // Debug log (remove after testing)
//     console.log(
//       "Opening modal for shift:",
//       shift.id,
//       shift.siteName,
//       "jobType:",
//       shift.jobType,
//     );
//   };

//   const toTitleCase = (text?: string) => {
//     if (text === null || text === undefined) return "";
//     const str = String(text).trim();
//     if (!str) return "";
//     return str
//       .toLowerCase()
//       .replace(/[_\-]+/g, " ")
//       .split(/\s+/)
//       .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
//       .join(" ");
//   };

//   const navigateShift = (dir: "prev" | "next") => {
//     const next = dir === "next" ? shiftIndex + 1 : shiftIndex - 1;
//     if (next < 0 || next >= shifts.length) return;
//     setShiftIndex(next);
//     setSelectedShift(shifts[next]);
//     setSelectedStaffId(null);
//   };

//   const handleAcceptJob = async () => {
//     if (!selectedShift?.id || !selectedStaffId) {
//       Toast.show({
//         type: "error",
//         text1: "Select staff member",
//         position: "bottom",
//       });
//       return;
//     }
//     setAccepting(true);
//     try {
//       const token = await AsyncStorage.getItem("@auth_token");
//       if (!token) throw new Error("No token");
//       const payload = { roster_id: selectedShift.id };
//       const res = await axios.post(
//         `${BASE_URL}/asap-jobs/accept/${selectedStaffId}`,
//         payload,
//         {
//           headers: {
//             Authorization: `Bearer ${token}`,
//             "Content-Type": "application/json",
//           },
//         },
//       );

//       if (res.data?.success) {
//         Toast.show({
//           type: "success",
//           text1: "Shift assigned",
//           position: "bottom",
//         });
//         const staff = staffList.find((s) => s.id === selectedStaffId);
//         setShifts((prev) =>
//           prev.map((s) =>
//             s.id === selectedShift.id
//               ? {
//                   ...s,
//                   guard: staff?.name || s.guard,
//                   jobStatus: "confirmed",
//                   tag: "Confirmed",
//                   cardBackground: "#ffffff",
//                 }
//               : s,
//           ),
//         );
//         setSelectedShift((prev) =>
//           prev
//             ? {
//                 ...prev,
//                 guard: staff?.name || prev.guard,
//                 jobStatus: "confirmed",
//                 tag: "Confirmed",
//               }
//             : prev,
//         );
//       } else {
//         throw new Error(res.data?.message || "Failed");
//       }
//     } catch (err: any) {
//       Toast.show({
//         type: "error",
//         text1: "Assign failed",
//         text2: err.message || "Try again",
//         position: "bottom",
//       });
//     } finally {
//       setAccepting(false);
//       setSelectedStaffId(null);
//     }
//   };

//   const getStatusPill = (status: string) => {
//     switch (status.toLowerCase()) {
//       case "pending":
//         return { bg: COLORS.danger + "33", text: COLORS.danger };
//       case "confirmed":
//         return { bg: COLORS.warning + "33", text: COLORS.warning };
//       case "completed":
//       case "complete":
//         return { bg: COLORS.success + "33", text: COLORS.success };
//       default:
//         return { bg: COLORS.textMuted, text: COLORS.textMuted };
//     }
//   };

//   const formatCreatedAt = (dateStr?: string) => {
//     if (!dateStr) return "N/A";
//     try {
//       const d = new Date(dateStr);
//       const mm = (d.getMonth() + 1).toString().padStart(2, "0");
//       const dd = d.getDate().toString().padStart(2, "0");
//       const yyyy = d.getFullYear();
//       const hh = d.getHours().toString().padStart(2, "0");
//       const min = d.getMinutes().toString().padStart(2, "0");
//       return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
//     } catch {
//       return dateStr;
//     }
//   };

//   // ─── DETAIL CARD COMPONENT ───────────────────────────────────────────────────
//   const DetailCard = ({
//     icon,
//     title,
//     iconBg,
//     children,
//   }: {
//     icon: React.ReactNode;
//     title: string;
//     iconBg: string;
//     children: React.ReactNode;
//   }) => (
//     <View style={detailStyles.card}>
//       <View style={detailStyles.cardHeader}>
//         <View style={[detailStyles.iconCircle, { backgroundColor: iconBg }]}>
//           {icon}
//         </View>
//         <Text style={detailStyles.cardTitle}>{title}</Text>
//       </View>
//       <View style={detailStyles.divider} />
//       {children}
//     </View>
//   );

//   const DetailRow = ({ label, value }: { label: string; value: string }) => (
//     <View style={detailStyles.row}>
//       <Text style={detailStyles.rowLabel}>{label}</Text>
//       <Text style={detailStyles.rowValue}>{value}</Text>
//     </View>
//   );

//   return (
//     <SafeAreaView style={styles.container}>
//       {/* Header */}
//       <View style={styles.header}>
//         <TouchableOpacity onPress={() => navigation.navigate("Profile")}>
//           <ChevronLeft size={22} color="#fff" />
//         </TouchableOpacity>
//         <Text style={styles.screenTitle}>Job Applications & Shifts</Text>
//         <View style={{ width: 40 }} />
//       </View>

//       <View style={styles.searchContainer}>
//         <TextInput
//           placeholder="Search by site name or job status..."
//           placeholderTextColor="#94A3B8"
//           value={searchText}
//           onChangeText={setSearchText}
//           style={styles.searchInput}
//         />
//       </View>

//       {/* Week selector */}
//       <View style={styles.weekNav}>
//         <TouchableOpacity
//           style={styles.weekArrow}
//           onPress={() => navigateWeek("prev")}
//         >
//           <ChevronLeft size={20} color="#64748b" />
//         </TouchableOpacity>
//         <TouchableOpacity
//           style={styles.datePill}
//           onPress={() => setShowDateModal(true)}
//         >
//           <Calendar size={16} color="#0A7C6E" style={{ marginRight: 6 }} />
//           <Text style={styles.dateText}>{weekLabel}</Text>
//         </TouchableOpacity>
//         <TouchableOpacity
//           style={styles.weekArrow}
//           onPress={() => navigateWeek("next")}
//         >
//           <ChevronRight size={20} color="#64748b" />
//         </TouchableOpacity>
//       </View>

//       {/* Section label */}
//       <View style={styles.sectionHeader}>
//         <Text style={styles.sectionTitle}>Shifts This Week</Text>
//       </View>

//       <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
//         {loading ? (
//           <View style={styles.center}>
//             <ActivityIndicator size="large" color="#0A7C6E" />
//             <Text style={styles.centerText}>Loading Shifts...</Text>
//           </View>
//         ) : error ? (
//           <View style={styles.center}>
//             <Text style={[styles.centerText, { color: "#ef4444" }]}>
//               {error}
//             </Text>
//           </View>
//         ) : shifts.length === 0 ? (
//           <View style={styles.center}>
//             <Text style={styles.centerText}>No shifts this week</Text>
//           </View>
//         ) : (
//           <View style={styles.cardList}>
//             {filteredShifts.map((shift) => {
//               const pill = getStatusPill(shift.jobStatus);
//               const isCompleted = shift.jobStatus === "completed";
//               return (
//                 <LinearGradient
//                   key={shift.id}
//                   colors={[
//                     "rgba(128, 128, 128, 0.17)",
//                     "rgba(128, 128, 128, 0.17)",
//                     "rgba(128, 128, 128, 0.17)",
//                   ]}
//                   start={{ x: 0, y: 0 }}
//                   end={{ x: 1, y: 1 }}
//                   style={styles.shiftCard}
//                 >
//                   <View style={styles.siteCardInner}>
//                     <View style={styles.cardTop}>
//                       <Text style={styles.siteName} numberOfLines={1}>
//                         {shift.siteName}
//                       </Text>
//                       <View
//                         style={[
//                           styles.statusPill,
//                           { backgroundColor: pill.bg },
//                         ]}
//                       >
//                         <Text style={[styles.pillText, { color: pill.text }]}>
//                           {shift.tag}
//                         </Text>
//                       </View>
//                     </View>

//                     {shift.address ? (
//                       <View style={styles.addressRow}>
//                         <MapPin
//                           size={12}
//                           color="#fff"
//                           style={{ marginRight: 4 }}
//                         />
//                         <Text style={styles.addressText} numberOfLines={1}>
//                           {shift.address}
//                         </Text>
//                       </View>
//                     ) : null}

//                     <Text style={styles.hoursText}>
//                       Total Hours: {shift.hours.toFixed(1)} hrs
//                     </Text>

//                     <View style={styles.cardDivider} />

//                     <View style={styles.cardBottom}>
//                       <View style={styles.cardMeta}>
//                         <Text style={styles.cardDate}>{shift.dateStr}</Text>
//                         <View style={styles.timeRow}>
//                           <Clock
//                             size={13}
//                             color="#fff"
//                             style={{ marginRight: 4 }}
//                           />
//                           <Text style={styles.cardTime}>
//                             {shift.startTime} – {shift.endTime}
//                           </Text>
//                         </View>
//                       </View>

//                       <View style={styles.cardRight}>
//                         <View style={styles.guardRow}>
//                           <User
//                             size={12}
//                             color="#94a3b8"
//                             style={{ marginRight: 4 }}
//                           />
//                           <Text style={styles.guardName} numberOfLines={1}>
//                             {toTitleCase(shift.guard)}
//                           </Text>
//                         </View>
//                         <TouchableOpacity
//                           style={styles.viewBtn}
//                           onPress={() => openShiftModal(shift)}
//                           activeOpacity={0.8}
//                         >
//                           <Text style={styles.viewBtnText}>View</Text>
//                         </TouchableOpacity>
//                       </View>
//                     </View>

//                     {isCompleted && (
//                       <TouchableOpacity
//                         style={styles.downloadBtn}
//                         onPress={() => generateShiftPDF(shift)}
//                       >
//                         <FileText size={18} color="#fff" />
//                         <Text style={styles.downloadText}>Download PDF</Text>
//                       </TouchableOpacity>
//                     )}
//                   </View>
//                 </LinearGradient>
//               );
//             })}
//           </View>
//         )}
//         <View style={{ height: 20 }} />
//       </ScrollView>

//       {/* Date picker modal */}
//       <Modal visible={showDateModal} transparent animationType="fade">
//         <View style={styles.modalOverlay}>
//           <View style={styles.modalContent}>
//             <Text style={styles.modalTitle}>Select week start</Text>
//             <DateTimePicker
//               value={weekStart}
//               mode="date"
//               display={Platform.OS === "ios" ? "spinner" : "default"}
//               onChange={(e, date) => {
//                 if (date) setWeekStart(date);
//                 setShowDateModal(false);
//               }}
//             />
//             <TouchableOpacity
//               style={styles.modalBtn}
//               onPress={() => setShowDateModal(false)}
//             >
//               <Text style={styles.modalBtnText}>Done</Text>
//             </TouchableOpacity>
//           </View>
//         </View>
//       </Modal>

//       {/* ─── SHIFT DETAIL MODAL ─────────────────────────────────────────────────── */}
//       <Modal
//         visible={showShiftModal}
//         transparent
//         animationType="slide"
//         onRequestClose={() => setShowShiftModal(false)}
//         statusBarTranslucent
//       >
//         <View style={styles.sheetOverlay}>
//           <TouchableOpacity
//             style={styles.sheetBackdrop}
//             onPress={() => setShowShiftModal(false)}
//             activeOpacity={1}
//           />

//           <View
//             style={[styles.sheetModal, { minHeight: "88%", maxHeight: "95%" }]}
//           >
//             {/* Header */}
//             <View style={detailStyles.modalHeader}>
//               <View style={detailStyles.modalHeaderLeft}>
//                 <ShieldCheck size={24} color="#fff" />
//                 <Text style={detailStyles.modalHeaderTitle}>
//                   Shift & Site Details
//                 </Text>
//               </View>
//               <TouchableOpacity
//                 style={detailStyles.closeCircle}
//                 onPress={() => setShowShiftModal(false)}
//               >
//                 <Text style={detailStyles.closeX}>✕</Text>
//               </TouchableOpacity>
//             </View>

//             {!selectedShift ? (
//               <View
//                 style={{
//                   flex: 1,
//                   justifyContent: "center",
//                   alignItems: "center",
//                 }}
//               >
//                 <Text style={{ color: "#fff", fontSize: 16 }}>
//                   No shift data available
//                 </Text>
//               </View>
//             ) : (
//               <ScrollView
//                 style={{ flex: 1 }}
//                 contentContainerStyle={detailStyles.scrollContent}
//                 showsVerticalScrollIndicator={false}
//               >
//                 <View style={detailStyles.cardsContainer}>
//                   {/* Site Information */}
//                   <DetailCard
//                     icon={<Building2 size={20} color="#4B9EF5" />}
//                     title="Site Information"
//                     iconBg="rgba(75,158,245,0.25)"
//                   >
//                     <DetailRow
//                       label="Site Name"
//                       value={toTitleCase(selectedShift.siteName)}
//                     />
//                     <DetailRow
//                       label="Address"
//                       value={selectedShift.address || "N/A"}
//                     />
//                     <DetailRow
//                       label="Radius"
//                       value={
//                         selectedShift.siteRadius
//                           ? `${selectedShift.siteRadius}m`
//                           : "N/A"
//                       }
//                     />
//                   </DetailCard>

//                   {/* Shift Information */}
//                   <DetailCard
//                     icon={<Timer size={20} color="#F5A623" />}
//                     title="Shift Information"
//                     iconBg="rgba(245,166,35,0.25)"
//                   >
//                     <DetailRow
//                       label="Status"
//                       value={toTitleCase(selectedShift.tag)}
//                     />
//                     <DetailRow
//                       label="Total Hours"
//                       value={selectedShift.hours.toFixed(1)}
//                     />
//                     <DetailRow
//                       label="Payable"
//                       value={
//                         selectedShift.shiftPayable
//                           ? toTitleCase(selectedShift.shiftPayable)
//                           : "N/A"
//                       }
//                     />
//                     <DetailRow
//                       label="Created At"
//                       value={formatCreatedAt(selectedShift.createdAt)}
//                     />
//                   </DetailCard>

//                   {/* Customer Details */}
//                   <DetailCard
//                     icon={<UserCircle size={20} color="#A78BFA" />}
//                     title="Client Details"
//                     iconBg="rgba(167,139,250,0.25)"
//                   >
//                     <DetailRow
//                       label="Name"
//                       value={toTitleCase(selectedShift.customer?.name) || "N/A"}
//                     />
//                     <DetailRow
//                       label="Email"
//                       value={selectedShift.customer?.email || "N/A"}
//                     />
//                     <DetailRow
//                       label="Phone"
//                       value={selectedShift.customer?.phone || "N/A"}
//                     />
//                     {/* <DetailRow
//                       label="Client Type"
//                       value={
//                         toTitleCase(selectedShift.customer?.user_type) || "N/A"
//                       }
//                     /> */}
//                   </DetailCard>

//                   {/* Assignment Details */}
//                   <DetailCard
//                     icon={<ShieldCheck size={20} color="#34C88A" />}
//                     title="Assignment Details"
//                     iconBg="rgba(52,200,138,0.25)"
//                   >
//                     <DetailRow
//                       label="Assigned To"
//                       value={toTitleCase(selectedShift.guard)}
//                     />
//                     <DetailRow
//                       label="Job Type"
//                       value={toTitleCase(selectedShift?.jobType) || "N/A"}
//                     />
//                     {/* <DetailRow
//                       label="ASAP Shift"
//                       value={selectedShift.isAsap ? "Yes" : "No"}
//                     /> */}
//                     <DetailRow
//                       label="Job Amount"
//                       value={
//                         selectedShift.jobAmount
//                           ? `$${parseFloat(selectedShift.jobAmount).toFixed(2)}`
//                           : "N/A"
//                       }
//                     />
//                   </DetailCard>
//                 </View>

//                 {/* Assign staff section (for contractors) */}
//                 {selectedShift.jobStatus === "pending" && !isRestrictedUser && (
//                   <View
//                     style={[
//                       styles.assignSection,
//                       { marginHorizontal: 16, marginTop: 16 },
//                     ]}
//                   >
//                     <Text style={styles.assignLabel}>Assign to staff</Text>
//                     {loadingStaff ? (
//                       <ActivityIndicator
//                         size="small"
//                         color="#0A7C6E"
//                         style={{ marginTop: 12 }}
//                       />
//                     ) : staffList.length === 0 ? (
//                       <Text style={styles.noStaffText}>No staff available</Text>
//                     ) : (
//                       <View style={styles.pickerContainer}>
//                         <Picker
//                           selectedValue={selectedStaffId}
//                           onValueChange={(val) => setSelectedStaffId(val)}
//                           style={styles.picker}
//                         >
//                           <Picker.Item
//                             label="Select staff..."
//                             value={null}
//                             color="#aaa"
//                           />
//                           {staffList.map((s) => (
//                             <Picker.Item
//                               key={s.id}
//                               label={s.name}
//                               value={s.id}
//                               color="#000"
//                             />
//                           ))}
//                         </Picker>
//                       </View>
//                     )}

//                     <TouchableOpacity
//                       style={[
//                         styles.acceptBtn,
//                         (!selectedStaffId || accepting) &&
//                           styles.acceptDisabled,
//                       ]}
//                       onPress={handleAcceptJob}
//                       disabled={!selectedStaffId || accepting}
//                     >
//                       {accepting ? (
//                         <ActivityIndicator color="#fff" size="small" />
//                       ) : (
//                         <Text style={styles.acceptText}>
//                           {selectedStaffId
//                             ? "Assign Shift"
//                             : "Select Staff First"}
//                         </Text>
//                       )}
//                     </TouchableOpacity>
//                   </View>
//                 )}

//                 {/* Close Button */}
//                 <TouchableOpacity
//                   style={[
//                     styles.closeBtn,
//                     { marginHorizontal: 16, marginTop: 20, marginBottom: 30 },
//                   ]}
//                   onPress={() => setShowShiftModal(false)}
//                 >
//                   <Text style={styles.closeText}>Close</Text>
//                 </TouchableOpacity>
//               </ScrollView>
//             )}
//           </View>
//         </View>
//       </Modal>
//       {/* <BottomTab navigation={navigation} activeTab="Applications" /> */}
//     </SafeAreaView>
//   );
// }

// // ─── DETAIL MODAL STYLES ────────────────────────────────────────────────────────
// const detailStyles = StyleSheet.create({
//   modalHeader: {
//     backgroundColor: "#00A99D",
//     flexDirection: "row",
//     alignItems: "center",
//     justifyContent: "space-between",
//     paddingHorizontal: 20,
//     paddingVertical: 12,
//     borderTopLeftRadius: 24,
//     borderTopRightRadius: 24,
//   },
//   modalHeaderLeft: {
//     flexDirection: "row",
//     alignItems: "center",
//     gap: 12,
//   },
//   modalHeaderTitle: {
//     fontSize: 17,
//     fontWeight: "700",
//     color: "#fff",
//   },
//   closeCircle: {
//     width: 25,
//     height: 25,
//     borderRadius: 16,
//     backgroundColor: "rgba(255,255,255,0.25)",
//     justifyContent: "center",
//     alignItems: "center",
//   },
//   closeX: {
//     color: "#fff",
//     fontSize: 14,
//     fontWeight: "700",
//   },

//   scrollContent: {
//     paddingBottom: 20,
//   },

//   /* Full Width Cards */
//   cardsContainer: {
//     paddingHorizontal: 16,
//     paddingTop: 10,
//     gap: 12,
//   },

//   card: {
//     backgroundColor: "#1E2937",
//     borderRadius: 18,
//     padding: 12,
//     borderWidth: 1,
//     borderColor: "#334155",
//     width: "100%", // Full Width
//     shadowColor: "#000",
//     shadowOffset: { width: 0, height: 4 },
//     shadowOpacity: 0.15,
//     shadowRadius: 12,
//     elevation: 6,
//   },

//   cardHeader: {
//     flexDirection: "row",
//     alignItems: "center",
//     marginBottom: 5,
//     gap: 10,
//   },

//   iconCircle: {
//     width: 35,
//     height: 35,
//     borderRadius: 17.5,
//     justifyContent: "center",
//     alignItems: "center",
//   },

//   cardTitle: {
//     fontSize: 14,
//     fontWeight: "700",
//     color: "#E2E8F0",
//     flex: 1,
//   },

//   divider: {
//     height: 1,
//     backgroundColor: "#334155",
//     marginBottom: 8,
//   },

//   row: {
//     flexDirection: "row",
//     justifyContent: "space-between",
//     alignItems: "center",
//     paddingVertical: 7,
//     borderBottomWidth: 1,
//     borderBottomColor: "#334155",
//   },

//   rowLabel: {
//     fontSize: 11,
//     color: "#94A3B8",
//     fontWeight: "500",
//   },

//   rowValue: {
//     fontSize: 12,
//     fontWeight: "600",
//     color: "#F1F5F9",
//     textAlign: "right",
//     flex: 1,
//   },
// });

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: COLORS.background,
//     paddingTop: 20,
//   },
//   header: {
//     flexDirection: "row",
//     justifyContent: "space-between",
//     alignItems: "center",
//     paddingHorizontal: 20,
//     paddingVertical: 14,
//   },
//   screenTitle: {
//     fontSize: 18,
//     fontWeight: "600",
//     color: COLORS.text,
//   },
//   downloadBtn: {
//     flexDirection: "row",
//     backgroundColor: COLORS.primary,
//     paddingHorizontal: 12,
//     paddingVertical: 8,
//     borderRadius: 10,
//     width: 135,
//     alignItems: "center",
//     gap: 2,
//     marginTop: 10,
//   },
//   searchContainer: {
//     paddingHorizontal: 16,
//     paddingVertical: 10,
//   },
//   searchInput: {
//     backgroundColor: COLORS.card,
//     borderWidth: 1,
//     borderColor: COLORS.cardBorder,
//     borderRadius: 12,
//     paddingHorizontal: 14,
//     paddingVertical: 10,
//     color: COLORS.text,
//     fontSize: 14,
//   },
//   downloadText: {
//     color: COLORS.text,
//     fontSize: 13,
//     fontWeight: "600",
//   },
//   siteCardInner: {
//     padding: 12,
//   },
//   weekNav: {
//     flexDirection: "row",
//     alignItems: "center",
//     justifyContent: "space-between",
//     paddingHorizontal: 60,
//     paddingVertical: 10,
//   },
//   weekArrow: {
//     width: 34,
//     height: 34,
//     borderRadius: 10,
//     backgroundColor: COLORS.card,
//     borderWidth: 1,
//     borderColor: COLORS.cardBorder,
//     justifyContent: "center",
//     alignItems: "center",
//   },
//   datePill: {
//     flexDirection: "row",
//     alignItems: "center",
//     backgroundColor: COLORS.card,
//     paddingHorizontal: 16,
//     paddingVertical: 8,
//     borderRadius: 999,
//     borderWidth: 1,
//     borderColor: COLORS.primary,
//   },
//   dateText: {
//     fontSize: 13,
//     fontWeight: "600",
//     color: COLORS.primary,
//   },
//   sectionHeader: {
//     paddingHorizontal: 16,
//     paddingTop: 14,
//     paddingBottom: 8,
//   },
//   sectionTitle: {
//     fontSize: 17,
//     fontWeight: "700",
//     color: COLORS.primary,
//   },
//   scroll: { flex: 1 },
//   cardList: {
//     paddingHorizontal: 12,
//     gap: 10,
//     flexDirection: "column",
//     // paddingBottom: 20,
//     marginBottom: 50,
//   },
//   center: {
//     flex: 1,
//     justifyContent: "center",
//     alignItems: "center",
//     padding: 40,
//     marginTop: 80,
//   },
//   centerText: {
//     marginTop: 16,
//     fontSize: 15,
//     color: COLORS.textSecondary,
//     textAlign: "center",
//   },
//   shiftCard: {
//     backgroundColor: COLORS.card,
//     borderRadius: 14,
//     marginBottom: 10,
//     borderWidth: 1,
//     borderColor: COLORS.cardBorder,
//   },
//   cardTop: {
//     flexDirection: "row",
//     alignItems: "center",
//     justifyContent: "space-between",
//     marginBottom: 4,
//   },
//   siteName: {
//     fontSize: 15,
//     fontWeight: "600",
//     color: COLORS.text,
//     flex: 1,
//     marginRight: 8,
//   },
//   addressRow: {
//     flexDirection: "row",
//     alignItems: "center",
//     marginBottom: 6,
//   },
//   addressText: {
//     fontSize: 12,
//     color: COLORS.textSecondary,
//     flex: 1,
//   },
//   hoursText: {
//     fontSize: 12,
//     fontWeight: "600",
//     color: COLORS.primary,
//     marginBottom: 10,
//   },
//   cardDivider: {
//     borderTopWidth: 0.5,
//     borderColor: COLORS.cardBorder,
//     marginBottom: 10,
//   },
//   cardBottom: {
//     flexDirection: "row",
//     alignItems: "center",
//     justifyContent: "space-between",
//   },
//   cardMeta: {
//     flexDirection: "column",
//     gap: 3,
//   },
//   cardDate: {
//     fontSize: 12,
//     color: COLORS.textMuted,
//   },
//   timeRow: {
//     flexDirection: "row",
//     alignItems: "center",
//   },
//   cardTime: {
//     fontSize: 13,
//     fontWeight: "600",
//     color: COLORS.text,
//   },
//   cardRight: {
//     alignItems: "flex-end",
//     gap: 6,
//   },
//   guardRow: {
//     flexDirection: "row",
//     alignItems: "center",
//   },
//   guardName: {
//     fontSize: 12,
//     color: COLORS.textSecondary,
//     maxWidth: 120,
//   },
//   viewBtn: {
//     backgroundColor: COLORS.primary,
//     paddingHorizontal: 16,
//     paddingVertical: 6,
//     borderRadius: 8,
//   },
//   viewBtnText: {
//     color: "#fff",
//     fontSize: 12,
//     fontWeight: "700",
//   },
//   statusPill: {
//     paddingHorizontal: 12,
//     paddingVertical: 4,
//     borderRadius: 999,
//   },
//   pillText: {
//     fontSize: 11,
//     fontWeight: "800",
//   },
//   modalOverlay: {
//     flex: 1,
//     backgroundColor: "rgba(0,0,0,0.6)",
//     justifyContent: "center",
//     alignItems: "center",
//   },
//   modalContent: {
//     backgroundColor: COLORS.surface,
//     borderRadius: 20,
//     padding: 24,
//     width: "86%",
//     alignItems: "center",
//     borderWidth: 1,
//     borderColor: COLORS.cardBorder,
//   },
//   modalTitle: {
//     fontSize: 18,
//     fontWeight: "600",
//     color: COLORS.text,
//     marginBottom: 20,
//   },
//   modalBtn: {
//     marginTop: 20,
//     backgroundColor: COLORS.primary,
//     paddingVertical: 14,
//     borderRadius: 12,
//     width: "100%",
//     alignItems: "center",
//   },
//   modalBtnText: {
//     color: COLORS.text,
//     fontSize: 15,
//     fontWeight: "600",
//   },
//   sheetOverlay: {
//     flex: 1,
//     backgroundColor: "rgba(0,0,0,0.7)",
//     justifyContent: "flex-end",
//   },
//   sheetModal: {
//     backgroundColor: "#0F172A",
//     borderTopLeftRadius: 20,
//     borderTopRightRadius: 20,
//     minHeight: "75%",
//     maxHeight: "92%",
//   },
//   sheetBackdrop: {
//     ...StyleSheet.absoluteFillObject,
//     backgroundColor: "rgba(0,0,0,0.6)",
//   },

//   assignSection: {
//     marginBottom: 16,
//   },
//   assignLabel: {
//     fontSize: 14,
//     fontWeight: "600",
//     color: "#1E293B",
//     marginBottom: 10,
//   },
//   pickerContainer: {
//     borderWidth: 0.5,
//     borderColor: "#CBD5E1",
//     borderRadius: 12,
//     backgroundColor: "#fff",
//     overflow: "hidden",
//     marginBottom: 12,
//   },
//   picker: {
//     height: 50,
//     width: "100%",
//     color: "#1E293B",
//   },
//   noStaffText: {
//     color: COLORS.danger,
//     fontSize: 13,
//     marginTop: 8,
//   },
//   acceptBtn: {
//     backgroundColor: COLORS.primary,
//     borderRadius: 14,
//     paddingVertical: 14,
//     alignItems: "center",
//     elevation: 3,
//     shadowColor: COLORS.primary,
//     shadowOffset: { width: 0, height: 4 },
//     shadowOpacity: 0.3,
//     shadowRadius: 6,
//   },
//   acceptDisabled: {
//     backgroundColor: COLORS.textMuted,
//     shadowOpacity: 0,
//     elevation: 0,
//   },
//   acceptText: {
//     color: COLORS.text,
//     fontSize: 15,
//     fontWeight: "600",
//   },
//   closeBtn: {
//     backgroundColor: "#fff",
//     borderWidth: 1,
//     borderColor: "#E2E8F0",
//     paddingVertical: 14,
//     borderRadius: 14,
//     alignItems: "center",
//   },
//   closeText: {
//     fontSize: 15,
//     fontWeight: "600",
//     color: "#1E293B",
//   },
// });

import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Dimensions,
  Modal,
  Platform,
  ActivityIndicator,
  Alert,
  TextInput,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import FileViewer from "react-native-file-viewer";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  User,
  MapPin,
  FileText,
  Building2,
  Timer,
  UserCircle,
  ShieldCheck,
} from "lucide-react-native";

import BottomTab from "./BottomTab";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import Toast from "react-native-toast-message";
import { getContractorStaff, BASE_URL } from "../services/authApi";
import PDFGenerator from "./utils/PDFGenerator";
import LinearGradient from "react-native-linear-gradient";
import { useFocusEffect } from "@react-navigation/native";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
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

// Quick-select presets for the date range picker
// const RANGE_PRESETS: { label: string; days: number }[] = [
//   { label: "1 Week", days: 7 },
//   { label: "20 Days", days: 20 },
//   { label: "1 Month", days: 30 },
// ];

interface Customer {
  id: number;
  name: string;
  email: string;
  phone: string;
  user_type: string;
}

interface Guard {
  id: number;
  name: string;
  email: string;
  phone: string;
  user_type: string;
}

interface Shift {
  id: number;
  siteName: string;
  address?: string;
  siteRadius?: string;
  guard: string;
  guardData?: Guard;
  dayShort: string;
  dateStr: string;
  startTime: string;
  endTime: string;
  tag: string;
  jobStatus: string;
  hours: number;
  cardBackground: string;
  jobType?: string;
  jobAmount?: string;
  isAsap?: boolean;
  inPaysheet?: number;
  paymentStatus?: string;
  shiftPayable?: string;
  createdAt?: string;
  customer?: Customer;

  signin_lat?: number;
  signin_lng?: number;
  signout_lat?: number;
  signout_lng?: number;
  signout_location?: string;
}
const STORAGE_KEYS = {
  rangeStart: "@weekly_roster_range_start",
  rangeEnd: "@weekly_roster_range_end",
  searchText: "@weekly_roster_search_text",
};

const loadPersistedRange = async (): Promise<{
  start: Date;
  end: Date;
} | null> => {
  try {
    const [startStr, endStr] = await Promise.all([
      AsyncStorage.getItem(STORAGE_KEYS.rangeStart),
      AsyncStorage.getItem(STORAGE_KEYS.rangeEnd),
    ]);

    if (startStr && endStr) {
      const start = new Date(startStr);
      const end = new Date(endStr);
      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
        return { start, end };
      }
    }
  } catch (e) {
    console.log("Failed to load persisted range");
  }
  return null;
};

export default function WeeklyRosterScreen({ navigation }: any) {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [totalHours, setTotalHours] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userType, setUserType] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [showDateModal, setShowDateModal] = useState(false);
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [shiftIndex, setShiftIndex] = useState(0);
  const [accepting, setAccepting] = useState(false);
  const [staffList, setStaffList] = useState<{ id: number; name: string }[]>(
    [],
  );
  const [searchText, setSearchText] = useState("");
  const [selectedStaffId, setSelectedStaffId] = useState<number | null>(null);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [user, setUser] = useState<any>(null);
  const isRestrictedUser = userType === "staff" || userType === "customer";

  const currentDate = new Date();

  // ─── DATE RANGE STATE (replaces fixed weekStart) ───────────────────────────
  const getMonday = (d: Date) => {
    const nd = new Date(d);
    nd.setHours(0, 0, 0, 0);
    nd.setDate(nd.getDate() - nd.getDay() + (nd.getDay() === 0 ? -6 : 1));
    return nd;
  };

  const [rangeStart, setRangeStart] = useState<Date>(() =>
    getMonday(currentDate),
  );
  const [rangeEnd, setRangeEnd] = useState<Date>(() => {
    const d = getMonday(currentDate);
    d.setDate(d.getDate() + 6);
    return d;
  });

  // Temp values used inside the date modal before the user hits "Apply"
  const [tempStart, setTempStart] = useState<Date>(rangeStart);
  const [tempEnd, setTempEnd] = useState<Date>(rangeEnd);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  useEffect(() => {
    if (showDateModal) {
      setTempStart(rangeStart);
      setTempEnd(rangeEnd);
    }
  }, [showDateModal]);

  const formatDateMMDDYYYY = (date: Date) =>
    `${(date.getMonth() + 1).toString().padStart(2, "0")}-${date
      .getDate()
      .toString()
      .padStart(2, "0")}-${date.getFullYear()}`;

  const formatDateYYYYMMDD = (date: Date) => {
    const y = date.getFullYear();
    const m = (date.getMonth() + 1).toString().padStart(2, "0");
    const d = date.getDate().toString().padStart(2, "0");
    return `${y}-${m}-${d}`;
  };
  useFocusEffect(
    React.useCallback(() => {
      const now = new Date();
      const monday = getMonday(now);
      const sunday = new Date(monday);
      sunday.setDate(sunday.getDate() + 6);

      setRangeStart(monday);
      setRangeEnd(sunday);
      setSearchText(""); // Clear search
      setSelectedStaffId(null);

      // Optional: clear any temp values
      setTempStart(monday);
      setTempEnd(sunday);
    }, []),
  );

  // Save search text
  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEYS.searchText, searchText);
  }, [searchText]);

  // Save date range
  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEYS.rangeStart, rangeStart.toISOString());
    AsyncStorage.setItem(STORAGE_KEYS.rangeEnd, rangeEnd.toISOString());
  }, [rangeStart, rangeEnd]);
  useEffect(() => {
    const loadFilters = async () => {
      const persisted = await loadPersistedRange();
      if (persisted) {
        setRangeStart(persisted.start);
        setRangeEnd(persisted.end);
      }

      const savedSearch = await AsyncStorage.getItem(STORAGE_KEYS.searchText);
      if (savedSearch !== null) {
        setSearchText(savedSearch);
      }
    };

    loadFilters();
  }, []);
  const formatDateDisplay = (date: Date) =>
    `${date.getDate().toString().padStart(2, "0")} ${date.toLocaleString(
      "default",
      { month: "short" },
    )} ${date.getFullYear()}`;

  // Number of days currently selected (inclusive)
  const rangeDayCount = useMemo(() => {
    const diff = Math.round(
      (rangeEnd.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24),
    );
    return Math.max(diff + 1, 1);
  }, [rangeStart, rangeEnd]);

  // All the yyyy-mm-dd strings inside the selected range (inclusive)
  const datesYYYYMMDD = useMemo(() => {
    const list: string[] = [];
    const cursor = new Date(rangeStart);
    for (let i = 0; i < rangeDayCount; i++) {
      list.push(formatDateYYYYMMDD(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    return list;
  }, [rangeStart, rangeDayCount]);

  const rangeLabel = useMemo(() => {
    return `${formatDateDisplay(rangeStart)} – ${formatDateDisplay(rangeEnd)}`;
  }, [rangeStart, rangeEnd]);

  const filteredShifts = useMemo(() => {
    if (!searchText.trim()) return shifts;
    const q = searchText.toLowerCase().trim();
    return shifts.filter((item) => {
      return (
        item.siteName?.toLowerCase().includes(q) ||
        item.address?.toLowerCase().includes(q) ||
        item.jobStatus?.toLowerCase().includes(q)
      );
    });
  }, [searchText, shifts]);

  const generateShiftPDF = async (shift: Shift) => {
    if (generatingPDF) return;
    setGeneratingPDF(true);

    try {
      const reportData = {
        siteName: shift.siteName || "N/A",
        siteAddress: shift.address || "N/A",
        guardName: shift.guard || "N/A",
        shiftStart: shift.startTime || "N/A",
        shiftEnd: shift.endTime || "N/A",
        totalHours: shift.hours || 0,
        jobStatus: shift.jobStatus || "confirmed",
        date: shift.dateStr || "",
        signinDetails: {
          signin_time: shift.startTime,
          signout_time: shift.endTime,
          location: shift.address || "N/A",
          signin_notes: "Shift completed as per roster",
          signout_notes: "",
        },
      };

      // Generate PDF
      const filePath = await PDFGenerator.generateShiftReportPDF(reportData);

      if (!filePath || !filePath.endsWith(".pdf")) {
        throw new Error("PDF file path not returned");
      }

      // Success Alert with Open Option
      Alert.alert(
        "✅ PDF Generated Successfully",
        `File saved as:\n${filePath.split("/").pop()}`,
        [
          {
            text: "Open PDF",
            onPress: async () => {
              try {
                await FileViewer.open(filePath, { showOpenWithDialog: true });
              } catch (err: any) {
                console.error("Open PDF Error:", err);
                Alert.alert(
                  "Cannot Open PDF",
                  "No PDF viewer found. You can open it from Downloads/Files app.",
                );
              }
            },
          },
          { text: "OK" },
        ],
      );

      Toast.show({
        type: "success",
        text1: "PDF Saved Successfully",
        text2: "Check Downloads / Files folder",
        position: "bottom",
      });
    } catch (error: any) {
      console.error("PDF Generation Error:", error);
      Alert.alert("PDF Error", error.message || "Failed to generate PDF");
      Toast.show({
        type: "error",
        text1: "PDF Generation Failed",
        text2: error.message || "Please try again",
        position: "bottom",
      });
    } finally {
      setGeneratingPDF(false);
    }
  };

  const fetchContractorStaff = async () => {
    try {
      setLoadingStaff(true);
      if (!user?.id) return;
      const res = await getContractorStaff(user.id);
      if (res?.success && Array.isArray(res.guards)) {
        setStaffList(res.guards);
      } else {
        setStaffList([]);
        Toast.show({
          type: "error",
          text1: "No staff found",
          position: "bottom",
        });
      }
    } catch (err: any) {
      Toast.show({
        type: "error",
        text1: "Staff load error",
        text2: err.message || "Network issue",
        position: "bottom",
      });
    } finally {
      setLoadingStaff(false);
    }
  };

  React.useEffect(() => {
    const fetchUser = async () => {
      const userStr = await AsyncStorage.getItem("user");
      if (userStr) {
        const loggedInUser = JSON.parse(userStr);
        setUser(loggedInUser);
        setIsActive(loggedInUser.profile_completion >= 100);
        setUserType(loggedInUser.user_type);
      }
    };
    fetchUser();
  }, []);

  const fetchShifts = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = await AsyncStorage.getItem("@auth_token");
      if (!token) throw new Error("No token");

      const userStr = await AsyncStorage.getItem("user");
      if (!userStr) throw new Error("No user");

      const user = JSON.parse(userStr);
      const currentUserId = user.id;

      setUserType(user?.user_type || null);

      const payload = {
        user_id: [currentUserId],
        state: "Victoria",
        start: formatDateMMDDYYYY(rangeStart),
        end: formatDateMMDDYYYY(rangeEnd),
        roster_id: "1",
      };

      const res = await axios.post(
        `${BASE_URL}/fetch-customer-sites`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
        },
      );

      if (!res.data?.success || !Array.isArray(res.data?.data)) {
        setError(null);
        setShifts([]);
        setTotalHours(0);
        return;
      }

      // Use the range set the API already computes so it matches
      // whatever range (week / 20 days / month / custom) was requested.
      if (typeof res.data.total_hours === "number") {
        setTotalHours(res.data.total_hours);
      }

      const rangeDateSet = new Set(datesYYYYMMDD);
      const allShifts: Shift[] = [];

      res.data.data.forEach((site: any) => {
        const siteName = site.site_name || "Unnamed Site";
        const address = site.address || site.site_address || "";
        const siteRadius = site.signin_radius || "";
        const jobs = site.job_roster || [];

        jobs.forEach((job: any) => {
          const startDateStr = job.start?.split(" ")[0];

          if (!startDateStr || !rangeDateSet.has(startDateStr)) {
            return;
          }

          const startTime = job.start?.split(" ")[1]?.slice(0, 5) || "??:??";
          const endTime = job.end?.split(" ")[1]?.slice(0, 5) || "??:??";

          const jobDate = new Date(startDateStr);
          const dayIndex = jobDate.getDay();

          const status = (job.job_status || "unknown").toLowerCase();

          let tag = "Unknown";
          let cardBackground = "#fff";

          if (status === "pending") {
            tag = "Pending";
          } else if (status === "confirmed") {
            tag = "Confirmed";
          } else if (status === "completed" || status === "complete") {
            tag = "Completed";
          }

          const customerData: Customer | undefined = job.customer
            ? {
                id: job.customer.id,
                name: job.customer.name || "",
                email: job.customer.email || "",
                phone: job.customer.phone || "",
                user_type: job.customer.user_type || "",
              }
            : undefined;

          const guardData: Guard | undefined = job.guards
            ? {
                id: job.guards.id,
                name: job.guards.name || "",
                email: job.guards.email || "",
                phone: job.guards.phone || "",
                user_type: job.guards.user_type || "",
              }
            : undefined;

          const jobType =
            job.job_type || job.jobType || job.type || site.job_type || "";

          allShifts.push({
            id: job.id,
            siteName,
            address,
            siteRadius,

            guard: job.guards?.name || "Unassigned",
            guardData,

            dayShort: DAYS[dayIndex],

            dateStr: `${jobDate.getDate().toString().padStart(2, "0")}/${(
              jobDate.getMonth() + 1
            )
              .toString()
              .padStart(2, "0")}/${jobDate.getFullYear()}`,

            startTime,
            endTime,

            tag,
            jobStatus: status,

            hours: Number(job.hours || 0),

            cardBackground,

            jobType,

            jobAmount: job.job_amount || "0",

            isAsap: job.asap === 1,

            inPaysheet: job.in_paysheet,

            paymentStatus: job.payment_status || "",

            shiftPayable: job.shift_payable || "",

            createdAt: job.created_at || "",

            customer: customerData,
          });
        });
      });

      allShifts.sort((a, b) => {
        const da = new Date(
          `${a.dateStr.split("/").reverse().join("-")} ${a.startTime}`,
        );

        const db = new Date(
          `${b.dateStr.split("/").reverse().join("-")} ${b.startTime}`,
        );

        return db.getTime() - da.getTime();
      });

      setShifts(allShifts);
    } catch (err: any) {
      setError(err.message || "Failed to load shifts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShifts();
  }, [rangeStart, rangeEnd]);

  useEffect(() => {
    if (userType === "contractor") {
      fetchContractorStaff();
    }
  }, [userType]);

  // Shifts the whole range forward/back by however many days are
  // currently selected, so a 20-day range moves 20 days at a time.
  const navigateRange = (dir: "prev" | "next") => {
    const delta = (dir === "next" ? 1 : -1) * rangeDayCount;
    const newStart = new Date(rangeStart);
    newStart.setDate(newStart.getDate() + delta);
    const newEnd = new Date(rangeEnd);
    newEnd.setDate(newEnd.getDate() + delta);
    setRangeStart(newStart);
    setRangeEnd(newEnd);
  };

  const applyPreset = (days: number) => {
    const start = new Date(tempStart);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + (days - 1));
    setTempStart(start);
    setTempEnd(end);
  };

  const confirmRange = () => {
    if (tempEnd.getTime() < tempStart.getTime()) {
      Toast.show({
        type: "error",
        text1: "Invalid range",
        text2: "End date must be after start date",
        position: "bottom",
      });
      return;
    }
    setRangeStart(tempStart);
    setRangeEnd(tempEnd);
    setShowDateModal(false);
  };

  const openShiftModal = (shift: Shift) => {
    if (!shift) return;

    const idx = shifts.findIndex((s) => s.id === shift.id);
    setShiftIndex(idx >= 0 ? idx : 0);
    setSelectedShift(shift);
    setShowShiftModal(true);
  };

  const toTitleCase = (text?: string) => {
    if (text === null || text === undefined) return "";
    const str = String(text).trim();
    if (!str) return "";
    return str
      .toLowerCase()
      .replace(/[_\-]+/g, " ")
      .split(/\s+/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const navigateShift = (dir: "prev" | "next") => {
    const next = dir === "next" ? shiftIndex + 1 : shiftIndex - 1;
    if (next < 0 || next >= shifts.length) return;
    setShiftIndex(next);
    setSelectedShift(shifts[next]);
    setSelectedStaffId(null);
  };

  const handleAcceptJob = async () => {
    if (!selectedShift?.id || !selectedStaffId) {
      Toast.show({
        type: "error",
        text1: "Select staff member",
        position: "bottom",
      });
      return;
    }
    setAccepting(true);
    try {
      const token = await AsyncStorage.getItem("@auth_token");
      if (!token) throw new Error("No token");
      const payload = { roster_id: selectedShift.id };
      const res = await axios.post(
        `${BASE_URL}/asap-jobs/accept/${selectedStaffId}`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (res.data?.success) {
        Toast.show({
          type: "success",
          text1: "Shift assigned",
          position: "bottom",
        });
        const staff = staffList.find((s) => s.id === selectedStaffId);
        setShifts((prev) =>
          prev.map((s) =>
            s.id === selectedShift.id
              ? {
                  ...s,
                  guard: staff?.name || s.guard,
                  jobStatus: "confirmed",
                  tag: "Confirmed",
                  cardBackground: "#ffffff",
                }
              : s,
          ),
        );
        setSelectedShift((prev) =>
          prev
            ? {
                ...prev,
                guard: staff?.name || prev.guard,
                jobStatus: "confirmed",
                tag: "Confirmed",
              }
            : prev,
        );
      } else {
        throw new Error(res.data?.message || "Failed");
      }
    } catch (err: any) {
      Toast.show({
        type: "error",
        text1: "Assign failed",
        text2: err.message || "Try again",
        position: "bottom",
      });
    } finally {
      setAccepting(false);
      setSelectedStaffId(null);
    }
  };

  const getStatusPill = (status: string) => {
    switch (status.toLowerCase()) {
      case "pending":
        return { bg: COLORS.danger + "33", text: COLORS.danger };
      case "confirmed":
        return { bg: COLORS.warning + "33", text: COLORS.warning };
      case "completed":
      case "complete":
        return { bg: COLORS.success + "33", text: COLORS.success };
      default:
        return { bg: COLORS.textMuted, text: COLORS.textMuted };
    }
  };

  const formatCreatedAt = (dateStr?: string) => {
    if (!dateStr) return "N/A";
    try {
      const d = new Date(dateStr);
      const mm = (d.getMonth() + 1).toString().padStart(2, "0");
      const dd = d.getDate().toString().padStart(2, "0");
      const yyyy = d.getFullYear();
      const hh = d.getHours().toString().padStart(2, "0");
      const min = d.getMinutes().toString().padStart(2, "0");
      return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
    } catch {
      return dateStr;
    }
  };

  // ─── DETAIL CARD COMPONENT ───────────────────────────────────────────────────
  const DetailCard = ({
    icon,
    title,
    iconBg,
    children,
  }: {
    icon: React.ReactNode;
    title: string;
    iconBg: string;
    children: React.ReactNode;
  }) => (
    <View style={detailStyles.card}>
      <View style={detailStyles.cardHeader}>
        <View style={[detailStyles.iconCircle, { backgroundColor: iconBg }]}>
          {icon}
        </View>
        <Text style={detailStyles.cardTitle}>{title}</Text>
      </View>
      <View style={detailStyles.divider} />
      {children}
    </View>
  );

  const DetailRow = ({ label, value }: { label: string; value: string }) => (
    <View style={detailStyles.row}>
      <Text style={detailStyles.rowLabel}>{label}</Text>
      <Text style={detailStyles.rowValue}>{value}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.navigate("Profile")}>
          <ChevronLeft size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.screenTitle}>Job Applications & Shifts</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          placeholder="Search by site name or job status..."
          placeholderTextColor="#94A3B8"
          value={searchText}
          onChangeText={setSearchText}
          style={styles.searchInput}
        />
      </View>

      {/* Date range selector */}
      <View style={styles.weekNav}>
        <TouchableOpacity
          style={styles.weekArrow}
          onPress={() => navigateRange("prev")}
        >
          <ChevronLeft size={20} color="#64748b" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.datePill}
          onPress={() => setShowDateModal(true)}
        >
          <Calendar size={16} color="#0A7C6E" style={{ marginRight: 6 }} />
          <Text style={styles.dateText} numberOfLines={1}>
            {rangeLabel}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.weekArrow}
          onPress={() => navigateRange("next")}
        >
          <ChevronRight size={20} color="#64748b" />
        </TouchableOpacity>
      </View>

      {/* Section label */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>
          Shifts ({rangeDayCount} {rangeDayCount === 1 ? "Day" : "Days"})
        </Text>
        <Text style={styles.sectionSubTitle}>
          Total Hours: {totalHours.toFixed(1)} hrs
        </Text>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#0A7C6E" />
            <Text style={styles.centerText}>Loading Shifts...</Text>
          </View>
        ) : error ? (
          <View style={styles.center}>
            <Text style={[styles.centerText, { color: "#ef4444" }]}>
              {error}
            </Text>
          </View>
        ) : shifts.length === 0 ? (
          <View style={styles.center}>
            <Text style={styles.centerText}>No shifts in this range</Text>
          </View>
        ) : (
          <View style={styles.cardList}>
            {filteredShifts.map((shift) => {
              const pill = getStatusPill(shift.jobStatus);
              const isCompleted = shift.jobStatus === "completed";
              return (
                <LinearGradient
                  key={shift.id}
                  colors={[
                    "rgba(128, 128, 128, 0.17)",
                    "rgba(128, 128, 128, 0.17)",
                    "rgba(128, 128, 128, 0.17)",
                  ]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.shiftCard}
                >
                  <View style={styles.siteCardInner}>
                    <View style={styles.cardTop}>
                      <Text style={styles.siteName} numberOfLines={1}>
                        {shift.siteName}
                      </Text>
                      <View
                        style={[
                          styles.statusPill,
                          { backgroundColor: pill.bg },
                        ]}
                      >
                        <Text style={[styles.pillText, { color: pill.text }]}>
                          {shift.tag}
                        </Text>
                      </View>
                    </View>

                    {shift.address ? (
                      <View style={styles.addressRow}>
                        <MapPin
                          size={12}
                          color="#fff"
                          style={{ marginRight: 4 }}
                        />
                        <Text style={styles.addressText} numberOfLines={1}>
                          {shift.address}
                        </Text>
                      </View>
                    ) : null}

                    <Text style={styles.hoursText}>
                      Total Hours: {shift.hours.toFixed(1)} hrs
                    </Text>

                    <View style={styles.cardDivider} />

                    <View style={styles.cardBottom}>
                      <View style={styles.cardMeta}>
                        <Text style={styles.cardDate}>{shift.dateStr}</Text>
                        <View style={styles.timeRow}>
                          <Clock
                            size={13}
                            color="#fff"
                            style={{ marginRight: 4 }}
                          />
                          <Text style={styles.cardTime}>
                            {shift.startTime} – {shift.endTime}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.cardRight}>
                        <View style={styles.guardRow}>
                          <User
                            size={12}
                            color="#94a3b8"
                            style={{ marginRight: 4 }}
                          />
                          <Text style={styles.guardName} numberOfLines={1}>
                            {toTitleCase(shift.guard)}
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={styles.viewBtn}
                          onPress={() => openShiftModal(shift)}
                          activeOpacity={0.8}
                        >
                          <Text style={styles.viewBtnText}>View</Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    {isCompleted && (
                      <TouchableOpacity
                        style={styles.downloadBtn}
                        onPress={() => generateShiftPDF(shift)}
                      >
                        <FileText size={18} color="#fff" />
                        <Text style={styles.downloadText}>Download PDF</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </LinearGradient>
              );
            })}
          </View>
        )}
        <View style={{ height: 20 }} />
      </ScrollView>

      {/* ─── DATE RANGE PICKER MODAL ────────────────────────────────────────── */}
      <Modal visible={showDateModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { width: "90%" }]}>
            <Text style={styles.modalTitle}>Select date range</Text>

            {/* Quick presets */}
            {/* <View style={styles.presetRow}>
              {RANGE_PRESETS.map((p) => (
                <TouchableOpacity
                  key={p.label}
                  style={styles.presetChip}
                  onPress={() => applyPreset(p.days)}
                >
                  <Text style={styles.presetChipText}>{p.label}</Text>
                </TouchableOpacity>
              ))}
            </View> */}

            {/* Start date */}
            <Text style={styles.pickerLabel}>Start Date</Text>
            <TouchableOpacity
              style={styles.dateInputBtn}
              onPress={() => setShowStartPicker(true)}
            >
              <Calendar size={16} color={COLORS.primary} />
              <Text style={styles.dateInputText}>
                {formatDateDisplay(tempStart)}
              </Text>
            </TouchableOpacity>
            {showStartPicker && (
              <DateTimePicker
                value={tempStart}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={(e, date) => {
                  setShowStartPicker(Platform.OS === "ios");
                  if (date) {
                    setTempStart(date);
                    // Keep end date valid if it's now before start
                    if (tempEnd.getTime() < date.getTime()) {
                      setTempEnd(date);
                    }
                  }
                }}
              />
            )}

            {/* End date */}
            <Text style={[styles.pickerLabel, { marginTop: 14 }]}>
              End Date
            </Text>
            <TouchableOpacity
              style={styles.dateInputBtn}
              onPress={() => setShowEndPicker(true)}
            >
              <Calendar size={16} color={COLORS.primary} />
              <Text style={styles.dateInputText}>
                {formatDateDisplay(tempEnd)}
              </Text>
            </TouchableOpacity>
            {showEndPicker && (
              <DateTimePicker
                value={tempEnd}
                mode="date"
                minimumDate={tempStart}
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={(e, date) => {
                  setShowEndPicker(Platform.OS === "ios");
                  if (date) setTempEnd(date);
                }}
              />
            )}

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnGhost]}
                onPress={() => setShowDateModal(false)}
              >
                <Text style={[styles.modalBtnText, { color: COLORS.text }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { flex: 1, marginLeft: 10 }]}
                onPress={confirmRange}
              >
                <Text style={styles.modalBtnText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ─── SHIFT DETAIL MODAL ─────────────────────────────────────────────────── */}
      <Modal
        visible={showShiftModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowShiftModal(false)}
        statusBarTranslucent
      >
        <View style={styles.sheetOverlay}>
          <TouchableOpacity
            style={styles.sheetBackdrop}
            onPress={() => setShowShiftModal(false)}
            activeOpacity={1}
          />

          <View
            style={[styles.sheetModal, { minHeight: "88%", maxHeight: "95%" }]}
          >
            {/* Header */}
            <View style={detailStyles.modalHeader}>
              <View style={detailStyles.modalHeaderLeft}>
                <ShieldCheck size={24} color="#fff" />
                <Text style={detailStyles.modalHeaderTitle}>
                  Shift & Site Details
                </Text>
              </View>
              <TouchableOpacity
                style={detailStyles.closeCircle}
                onPress={() => setShowShiftModal(false)}
              >
                <Text style={detailStyles.closeX}>✕</Text>
              </TouchableOpacity>
            </View>

            {!selectedShift ? (
              <View
                style={{
                  flex: 1,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Text style={{ color: "#fff", fontSize: 16 }}>
                  No shift data available
                </Text>
              </View>
            ) : (
              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={detailStyles.scrollContent}
                showsVerticalScrollIndicator={false}
              >
                <View style={detailStyles.cardsContainer}>
                  {/* Site Information */}
                  <DetailCard
                    icon={<Building2 size={20} color="#4B9EF5" />}
                    title="Site Information"
                    iconBg="rgba(75,158,245,0.25)"
                  >
                    <DetailRow
                      label="Site Name"
                      value={toTitleCase(selectedShift.siteName)}
                    />
                    <DetailRow
                      label="Address"
                      value={selectedShift.address || "N/A"}
                    />
                    <DetailRow
                      label="Radius"
                      value={
                        selectedShift.siteRadius
                          ? `${selectedShift.siteRadius}m`
                          : "N/A"
                      }
                    />
                  </DetailCard>

                  {/* Shift Information */}
                  <DetailCard
                    icon={<Timer size={20} color="#F5A623" />}
                    title="Shift Information"
                    iconBg="rgba(245,166,35,0.25)"
                  >
                    <DetailRow
                      label="Status"
                      value={toTitleCase(selectedShift.tag)}
                    />
                    <DetailRow
                      label="Total Hours"
                      value={selectedShift.hours.toFixed(1)}
                    />
                    <DetailRow
                      label="Payable"
                      value={
                        selectedShift.shiftPayable
                          ? toTitleCase(selectedShift.shiftPayable)
                          : "N/A"
                      }
                    />
                    <DetailRow
                      label="Created At"
                      value={formatCreatedAt(selectedShift.createdAt)}
                    />
                  </DetailCard>

                  {/* Customer Details */}
                  <DetailCard
                    icon={<UserCircle size={20} color="#A78BFA" />}
                    title="Client Details"
                    iconBg="rgba(167,139,250,0.25)"
                  >
                    <DetailRow
                      label="Name"
                      value={toTitleCase(selectedShift.customer?.name) || "N/A"}
                    />
                    <DetailRow
                      label="Email"
                      value={selectedShift.customer?.email || "N/A"}
                    />
                    <DetailRow
                      label="Phone"
                      value={selectedShift.customer?.phone || "N/A"}
                    />
                  </DetailCard>

                  {/* Assignment Details */}
                  <DetailCard
                    icon={<ShieldCheck size={20} color="#34C88A" />}
                    title="Assignment Details"
                    iconBg="rgba(52,200,138,0.25)"
                  >
                    <DetailRow
                      label="Assigned To"
                      value={toTitleCase(selectedShift.guard)}
                    />
                    <DetailRow
                      label="Job Type"
                      value={toTitleCase(selectedShift?.jobType) || "N/A"}
                    />
                    <DetailRow
                      label="Job Amount"
                      value={
                        selectedShift.jobAmount
                          ? `$${parseFloat(selectedShift.jobAmount).toFixed(2)}`
                          : "N/A"
                      }
                    />
                  </DetailCard>
                </View>

                {/* Assign staff section (for contractors) */}
                {selectedShift.jobStatus === "pending" && !isRestrictedUser && (
                  <View
                    style={[
                      styles.assignSection,
                      { marginHorizontal: 16, marginTop: 16 },
                    ]}
                  >
                    <Text style={styles.assignLabel}>Assign to staff</Text>
                    {loadingStaff ? (
                      <ActivityIndicator
                        size="small"
                        color="#0A7C6E"
                        style={{ marginTop: 12 }}
                      />
                    ) : staffList.length === 0 ? (
                      <Text style={styles.noStaffText}>No staff available</Text>
                    ) : (
                      <View style={styles.pickerContainer}>
                        <Picker
                          selectedValue={selectedStaffId}
                          onValueChange={(val) => setSelectedStaffId(val)}
                          style={styles.picker}
                        >
                          <Picker.Item
                            label="Select staff..."
                            value={null}
                            color="#aaa"
                          />
                          {staffList.map((s) => (
                            <Picker.Item
                              key={s.id}
                              label={s.name}
                              value={s.id}
                              color="#000"
                            />
                          ))}
                        </Picker>
                      </View>
                    )}

                    <TouchableOpacity
                      style={[
                        styles.acceptBtn,
                        (!selectedStaffId || accepting) &&
                          styles.acceptDisabled,
                      ]}
                      onPress={handleAcceptJob}
                      disabled={!selectedStaffId || accepting}
                    >
                      {accepting ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <Text style={styles.acceptText}>
                          {selectedStaffId
                            ? "Assign Shift"
                            : "Select Staff First"}
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                )}

                {/* Close Button */}
                <TouchableOpacity
                  style={[
                    styles.closeBtn,
                    { marginHorizontal: 16, marginTop: 20, marginBottom: 30 },
                  ]}
                  onPress={() => setShowShiftModal(false)}
                >
                  <Text style={styles.closeText}>Close</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
      {/* <BottomTab navigation={navigation} activeTab="Applications" /> */}
    </SafeAreaView>
  );
}

// ─── DETAIL MODAL STYLES ────────────────────────────────────────────────────────
const detailStyles = StyleSheet.create({
  modalHeader: {
    backgroundColor: "#00A99D",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  modalHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  modalHeaderTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#fff",
  },
  closeCircle: {
    width: 25,
    height: 25,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.25)",
    justifyContent: "center",
    alignItems: "center",
  },
  closeX: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },

  scrollContent: {
    paddingBottom: 20,
  },

  /* Full Width Cards */
  cardsContainer: {
    paddingHorizontal: 16,
    paddingTop: 10,
    gap: 12,
  },

  card: {
    backgroundColor: "#1E2937",
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: "#334155",
    width: "100%", // Full Width
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },

  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 5,
    gap: 10,
  },

  iconCircle: {
    width: 35,
    height: 35,
    borderRadius: 17.5,
    justifyContent: "center",
    alignItems: "center",
  },

  cardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#E2E8F0",
    flex: 1,
  },

  divider: {
    height: 1,
    backgroundColor: "#334155",
    marginBottom: 8,
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: "#334155",
  },

  rowLabel: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "500",
  },

  rowValue: {
    fontSize: 12,
    fontWeight: "600",
    color: "#F1F5F9",
    textAlign: "right",
    flex: 1,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingTop: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  screenTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.text,
  },
  downloadBtn: {
    flexDirection: "row",
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    width: 135,
    alignItems: "center",
    gap: 2,
    marginTop: 10,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  searchInput: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: COLORS.text,
    fontSize: 14,
  },
  downloadText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "600",
  },
  siteCardInner: {
    padding: 12,
  },
  weekNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  weekArrow: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    justifyContent: "center",
    alignItems: "center",
  },
  datePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.primary,
    flexShrink: 1,
    marginHorizontal: 8,
  },
  dateText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.primary,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: COLORS.primary,
  },
  sectionSubTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  scroll: { flex: 1 },
  cardList: {
    paddingHorizontal: 12,
    gap: 10,
    flexDirection: "column",
    marginBottom: 50,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
    marginTop: 80,
  },
  centerText: {
    marginTop: 16,
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: "center",
  },
  shiftCard: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  siteName: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.text,
    flex: 1,
    marginRight: 8,
  },
  addressRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  addressText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    flex: 1,
  },
  hoursText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.primary,
    marginBottom: 10,
  },
  cardDivider: {
    borderTopWidth: 0.5,
    borderColor: COLORS.cardBorder,
    marginBottom: 10,
  },
  cardBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardMeta: {
    flexDirection: "column",
    gap: 3,
  },
  cardDate: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  cardTime: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.text,
  },
  cardRight: {
    alignItems: "flex-end",
    gap: 6,
  },
  guardRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  guardName: {
    fontSize: 12,
    color: COLORS.textSecondary,
    maxWidth: 120,
  },
  viewBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 8,
  },
  viewBtnText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  statusPill: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
  },
  pillText: {
    fontSize: 11,
    fontWeight: "800",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 24,
    width: "86%",
    alignItems: "stretch",
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 16,
    textAlign: "center",
  },
  presetRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 18,
    justifyContent: "center",
  },
  presetChip: {
    borderWidth: 1,
    borderColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: COLORS.primaryGlow,
  },
  presetChipText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: "700",
  },
  pickerLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  dateInputBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  dateInputText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "600",
  },
  modalBtnRow: {
    flexDirection: "row",
    marginTop: 22,
  },
  modalBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  modalBtnGhost: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    paddingHorizontal: 20,
  },
  modalBtnText: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "600",
  },
  sheetOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  sheetModal: {
    backgroundColor: "#0F172A",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    minHeight: "75%",
    maxHeight: "92%",
  },
  sheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
  },

  assignSection: {
    marginBottom: 16,
  },
  assignLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: 10,
  },
  pickerContainer: {
    borderWidth: 0.5,
    borderColor: "#CBD5E1",
    borderRadius: 12,
    backgroundColor: "#fff",
    overflow: "hidden",
    marginBottom: 12,
  },
  picker: {
    height: 50,
    width: "100%",
    color: "#1E293B",
  },
  noStaffText: {
    color: COLORS.danger,
    fontSize: 13,
    marginTop: 8,
  },
  acceptBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    elevation: 3,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  acceptDisabled: {
    backgroundColor: COLORS.textMuted,
    shadowOpacity: 0,
    elevation: 0,
  },
  acceptText: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "600",
  },
  closeBtn: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  closeText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1E293B",
  },
});
