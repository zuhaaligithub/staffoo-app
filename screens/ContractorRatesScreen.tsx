// import React, { useState, useEffect, useCallback } from "react";
// import {
//   View,
//   Text,
//   ScrollView,
//   StyleSheet,
//   TouchableOpacity,
//   ActivityIndicator,
//   SafeAreaView,
//   StatusBar,
//   RefreshControl,
//   Platform,
//   Modal,
//   TextInput,
//   KeyboardAvoidingView,
// } from "react-native";
// import { CommonActions, useNavigation } from "@react-navigation/native";
// import LinearGradient from "react-native-linear-gradient";
// import {
//   ChevronLeft,
//   Clock,
//   Send,
//   X,
//   Plus,
//   MapPin,
//   Copy,
//   CheckCircle2,
//   Circle,
//   AlertCircle,
//   Shield,
//   Zap,
//   History as HistoryIcon,
//   Eye,
//   XCircle,
// } from "lucide-react-native";
// import AsyncStorage from "@react-native-async-storage/async-storage";
// import axios from "axios";
// import { BASE_URL } from "../services/authApi";
// import Toast from "react-native-toast-message";

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

// const STATE_FULL_NAME: Record<string, string> = {
//   vic: "Victoria",
//   qld: "Queensland",
//   nsw: "New South Wales",
//   sa: "South Australia",
//   wa: "Western Australia",
//   tas: "Tasmania",
//   act: "Australian Capital Territory",
//   nt: "Northern Territory",
//   punjab: "Punjab",
// };

// type RateRow = {
//   label: string;
//   time: string;
//   metro: string | number;
//   regional: string | number;
// };

// type RateFormShape = {
//   metro_mon_fri_day: string;
//   reg_mon_fri_day: string;
//   metro_mon_fri_night: string;
//   reg_mon_fri_night: string;
//   metro_sat: string;
//   reg_sat: string;
//   metro_sun: string;
//   reg_sun: string;
//   metro_pub: string;
//   reg_pub: string;
// };

// type HistoryStatus = "pending" | "approved" | "rejected";
// type TopTab = "active" | "history";

// const emptyRateForm = (): RateFormShape => ({
//   metro_mon_fri_day: "",
//   reg_mon_fri_day: "",
//   metro_mon_fri_night: "",
//   reg_mon_fri_night: "",
//   metro_sat: "",
//   reg_sat: "",
//   metro_sun: "",
//   reg_sun: "",
//   metro_pub: "",
//   reg_pub: "",
// });

// export default function ContractorRatesScreen() {
//   const navigation = useNavigation();

//   // ----- Core / auth -----
//   const [loading, setLoading] = useState(true);
//   const [refreshing, setRefreshing] = useState(false);
//   const [ratesList, setRatesList] = useState<any[]>([]);
//   const [userProfile, setUserProfile] = useState<any>(null);
//   const [userId, setUserId] = useState<number | string | null>(null);
//   const [authToken, setAuthToken] = useState<string | null>(null);

//   // ----- Top tabs (Active Rates / Request History) -----
//   const [topTab, setTopTab] = useState<TopTab>("active");

//   // ----- Request history -----
//   const [historyStatusTab, setHistoryStatusTab] =
//     useState<HistoryStatus>("pending");
//   const [historyLoading, setHistoryLoading] = useState(false);
//   const [historyList, setHistoryList] = useState<any[]>([]);
//   const [viewModalVisible, setViewModalVisible] = useState(false);
//   const [viewModalData, setViewModalData] = useState<any>(null);

//   // ----- Request rate update modal -----
//   const [modalVisible, setModalVisible] = useState(false);
//   const [submitting, setSubmitting] = useState(false);
//   const [adminNotes, setAdminNotes] = useState("");
//   const [selectedStates, setSelectedStates] = useState<string[]>([]);
//   const [activeStateTab, setActiveStateTab] = useState<string>("");
//   const [stateRates, setStateRates] = useState<Record<string, RateFormShape>>(
//     {},
//   );

//   // =========================================================
//   // Fetch: Active rates + profile
//   // =========================================================
//   const fetchRates = useCallback(async () => {
//     try {
//       const userStr = await AsyncStorage.getItem("user");
//       if (!userStr) throw new Error("User not found");

//       const user = JSON.parse(userStr);
//       const uid = user?.id;
//       if (!uid) throw new Error("User ID not found");

//       const token = await AsyncStorage.getItem("@auth_token");
//       if (!token) throw new Error("No token");

//       setUserId(uid);
//       setAuthToken(token);

//       const profileRes = await axios.get(`${BASE_URL}/user-edit/${uid}`, {
//         headers: {
//           Authorization: `Bearer ${token}`,
//           Accept: "application/json",
//         },
//       });
//       setUserProfile(profileRes.data?.data);

//       const res = await axios.get(`${BASE_URL}/get-contractor-rates/${uid}`, {
//         headers: {
//           Authorization: `Bearer ${token}`,
//           Accept: "application/json",
//         },
//       });

//       const list = res.data?.data;
//       const rates = Array.isArray(list) ? list : [];
//       setRatesList(rates);
//     } catch (err: any) {
//       console.error("get-contractor-rates error:", err);
//       Toast.show({
//         type: "error",
//         text1: "Failed to load rates",
//         text2: err?.response?.data?.message || err.message,
//         position: "top",
//       });
//       setRatesList([]);
//     } finally {
//       setLoading(false);
//       setRefreshing(false);
//     }
//   }, []);

//   useEffect(() => {
//     fetchRates();
//   }, [fetchRates]);

//   const onRefresh = useCallback(() => {
//     setRefreshing(true);
//     // Always refresh active rates so Active Rates stays in sync
//     fetchRates();
//     if (topTab === "history") {
//       fetchHistory(historyStatusTab);
//     }
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [fetchRates, topTab, historyStatusTab]);

//   // =========================================================
//   // Fetch: Request history (pending / approved / rejected)
//   // =========================================================
//   const fetchHistory = useCallback(
//     async (status: HistoryStatus) => {
//       try {
//         setHistoryLoading(true);

//         let uid = userId;
//         let token = authToken;

//         if (!uid || !token) {
//           const userStr = await AsyncStorage.getItem("user");
//           const t = await AsyncStorage.getItem("@auth_token");
//           if (userStr) uid = JSON.parse(userStr)?.id;
//           token = t;
//           if (uid) setUserId(uid);
//           if (token) setAuthToken(token);
//         }

//         if (!uid || !token) throw new Error("Authentication error");

//         const res = await axios.get(`${BASE_URL}/charge-rate-requests`, {
//           params: { status, user_id: uid },
//           headers: {
//             Authorization: `Bearer ${token}`,
//             Accept: "application/json",
//           },
//         });

//         const list = res.data?.data;
//         setHistoryList(Array.isArray(list) ? list : []);
//       } catch (err: any) {
//         console.error("charge-rate-requests error:", err);
//         Toast.show({
//           type: "error",
//           text1: "Failed to load request history",
//           text2: err?.response?.data?.message || err.message,
//           position: "top",
//         });
//         setHistoryList([]);
//       } finally {
//         setHistoryLoading(false);
//       }
//     },
//     [userId, authToken],
//   );

//   const handleTopTabPress = (tab: TopTab) => {
//     setTopTab(tab);
//     if (tab === "history") {
//       setHistoryStatusTab("pending");
//       fetchHistory("pending");
//     }
//   };

//   const handleHistoryStatusPress = (status: HistoryStatus) => {
//     setHistoryStatusTab(status);
//     fetchHistory(status);
//   };

//   // =========================================================
//   // Helpers
//   // =========================================================
//   const formatMoney = (val: any) => {
//     if (val === undefined || val === null || val === "") return "—";
//     const num = parseFloat(String(val));
//     if (isNaN(num)) return "—";
//     return `$${num.toFixed(2)}`;
//   };

//   const getStateLabel = (code: string) => {
//     if (!code) return "—";
//     const key = code.toLowerCase().trim();
//     return STATE_FULL_NAME[key] || key.toUpperCase();
//   };

//   const formatDate = (value: any) => {
//     if (!value) return "—";
//     const d = new Date(value);
//     if (isNaN(d.getTime())) return String(value);
//     return d.toLocaleDateString("en-AU", {
//       day: "numeric",
//       month: "short",
//       year: "numeric",
//     });
//   };

//   // Build the 5 display rows (Mon-Fri Day/Night, Sat, Sun, Pub Holiday) for any single rate record
//   const buildRowsForRate = (rate: any): RateRow[] => {
//     if (!rate) return [];
//     return [
//       {
//         label: "Mon–Fri Day",
//         time: "06:00 – 18:00",
//         metro: rate.def_metro_mon_to_fri_day_rate,
//         regional: rate.def_reg_mon_to_fri_day_rate,
//       },
//       {
//         label: "Mon–Fri Night",
//         time: "18:00 – 06:00",
//         metro: rate.def_metro_mon_to_fri_night_rate,
//         regional: rate.def_reg_mon_to_fri_night_rate,
//       },
//       {
//         label: "Saturday",
//         time: "All day",
//         metro: rate.def_metro_sat_day_rate,
//         regional: rate.def_reg_sat_day_rate,
//       },
//       {
//         label: "Sunday",
//         time: "All day",
//         metro: rate.def_metro_sun_day_rate,
//         regional: rate.def_reg_sun_day_rate,
//       },
//       {
//         label: "Public Holiday",
//         time: "All day",
//         metro: rate.def_metro_pub_holi_day_rate,
//         regional: rate.def_reg_pub_holi_day_rate,
//       },
//     ];
//   };

//   const sortedRatesList = [...ratesList].sort((a, b) =>
//     getStateLabel(String(a.state || "")).localeCompare(
//       getStateLabel(String(b.state || "")),
//     ),
//   );

//   const getAllowedStateCodes = (): string[] => {
//     if (!userProfile) return [];

//     if (userProfile.states_allowed) {
//       try {
//         const parsed = JSON.parse(userProfile.states_allowed);
//         if (Array.isArray(parsed) && parsed.length > 0) {
//           return parsed
//             .map((code: string) => String(code).toLowerCase().trim())
//             .filter(Boolean);
//         }
//       } catch {
//         const code = String(userProfile.states_allowed).toLowerCase().trim();
//         if (code) return [code];
//       }
//     }

//     if (userProfile.state) {
//       const code = String(userProfile.state).toLowerCase().trim();
//       if (code) return [code];
//     }

//     return [];
//   };

//   const hasRatesForState = useCallback(
//     (code: string) => {
//       return ratesList.some(
//         (r) => String(r.state || "").toLowerCase() === code.toLowerCase(),
//       );
//     },
//     [ratesList],
//   );

//   const allowedCodesForBadge = getAllowedStateCodes();
//   const missingStatesCount = allowedCodesForBadge.filter(
//     (c) => !hasRatesForState(c),
//   ).length;

//   // =========================================================
//   // Request modal — state selection is now explicit.
//   // Only states the user actually checks end up in the payload,
//   // so previously-approved states are never silently resubmitted.
//   // =========================================================
//   const openRequestModal = (preferredState?: string) => {
//     const codes = getAllowedStateCodes();
//     if (codes.length === 0) {
//       Toast.show({
//         type: "error",
//         text1: "No state assigned",
//         text2: "Contact your admin to assign a state before requesting rates.",
//         position: "top",
//       });
//       return;
//     }

//     let defaultSelected: string[];

//     if (preferredState) {
//       const code = preferredState.toLowerCase();
//       if (!codes.includes(code)) {
//         Toast.show({
//           type: "error",
//           text1: "State not allowed",
//           text2: "This state is not assigned to your profile.",
//           position: "top",
//         });
//         return;
//       }
//       defaultSelected = [code];
//     } else {
//       // Only pre-select states that don't have active rates yet.
//       // If every state already has rates, start with nothing selected
//       // so the user has to explicitly pick which state(s) to update.
//       defaultSelected = codes.filter((c) => !hasRatesForState(c));
//     }

//     // Build a form entry for every allowed state (pre-filled with existing
//     // values where available) so checking a box later always has data ready,
//     // but only the checked ones are ever included in the submit payload.
//     const initialRates: Record<string, RateFormShape> = {};
//     codes.forEach((code) => {
//       const existing = ratesList.find(
//         (r) => String(r.state || "").toLowerCase() === code,
//       );

//       if (existing) {
//         initialRates[code] = {
//           metro_mon_fri_day: String(
//             existing.def_metro_mon_to_fri_day_rate ?? "",
//           ),
//           reg_mon_fri_day: String(existing.def_reg_mon_to_fri_day_rate ?? ""),
//           metro_mon_fri_night: String(
//             existing.def_metro_mon_to_fri_night_rate ?? "",
//           ),
//           reg_mon_fri_night: String(
//             existing.def_reg_mon_to_fri_night_rate ?? "",
//           ),
//           metro_sat: String(existing.def_metro_sat_day_rate ?? ""),
//           reg_sat: String(existing.def_reg_sat_day_rate ?? ""),
//           metro_sun: String(existing.def_metro_sun_day_rate ?? ""),
//           reg_sun: String(existing.def_reg_sun_day_rate ?? ""),
//           metro_pub: String(existing.def_metro_pub_holi_day_rate ?? ""),
//           reg_pub: String(existing.def_reg_pub_holi_day_rate ?? ""),
//         };
//       } else {
//         initialRates[code] = emptyRateForm();
//       }
//     });

//     setStateRates(initialRates);
//     setSelectedStates(defaultSelected);
//     setActiveStateTab(defaultSelected[0] || "");
//     setAdminNotes("");
//     setModalVisible(true);
//   };

//   // Toggling a chip adds/removes that state from the payload selection.
//   // Checking a state also makes it the active tab being edited.
//   const toggleStateInclusion = (code: string) => {
//     setSelectedStates((prev) => {
//       const included = prev.includes(code);
//       const next = included ? prev.filter((c) => c !== code) : [...prev, code];

//       if (included) {
//         // was removed — if it was the active tab, move to next available
//         setActiveStateTab((current) =>
//           current === code ? next[0] || "" : current,
//         );
//       } else {
//         setActiveStateTab(code);
//       }

//       return next;
//     });
//   };

//   const updateStateField = (field: keyof RateFormShape, value: string) => {
//     if (!activeStateTab) return;
//     setStateRates((prev) => ({
//       ...prev,
//       [activeStateTab]: {
//         ...(prev[activeStateTab] || emptyRateForm()),
//         [field]: value,
//       },
//     }));
//   };

//   const applyToAllStates = () => {
//     if (!activeStateTab || selectedStates.length <= 1) return;
//     setStateRates((prev) => {
//       const source = prev[activeStateTab] || emptyRateForm();
//       const updated: Record<string, RateFormShape> = { ...prev };
//       selectedStates.forEach((s) => {
//         updated[s] = { ...source };
//       });
//       return updated;
//     });
//     Toast.show({
//       type: "success",
//       text1: "Applied to selected states",
//       text2: `Rates from ${getStateLabel(
//         activeStateTab,
//       )} copied to all selected states.`,
//       position: "top",
//     });
//   };

//   const handleRequestSubmit = async () => {
//     try {
//       if (selectedStates.length === 0) {
//         Toast.show({
//           type: "error",
//           text1: "No state selected",
//           text2: "Select at least one state to submit a rate request.",
//           position: "top",
//         });
//         return;
//       }

//       setSubmitting(true);

//       const token = authToken || (await AsyncStorage.getItem("@auth_token"));
//       const userStr = await AsyncStorage.getItem("user");
//       if (!userStr || !token) throw new Error("Authentication error");

//       const user = JSON.parse(userStr);

//       const toNum = (v: string) => {
//         const n = parseFloat(v);
//         return isNaN(n) ? 0 : n;
//       };

//       // Only iterate selectedStates — states that were merely pre-loaded
//       // into stateRates but never checked are never sent.
//       const rates = selectedStates.map((stateCode) => {
//         const r = stateRates[stateCode] || emptyRateForm();
//         return {
//           title: `${getStateLabel(stateCode)} My Charge Rates`,
//           state: stateCode,
//           def_metro_mon_to_fri_day_rate: toNum(r.metro_mon_fri_day),
//           def_reg_mon_to_fri_day_rate: toNum(r.reg_mon_fri_day),
//           def_metro_mon_to_fri_night_rate: toNum(r.metro_mon_fri_night),
//           def_reg_mon_to_fri_night_rate: toNum(r.reg_mon_fri_night),
//           def_metro_sat_day_rate: toNum(r.metro_sat),
//           def_reg_sat_day_rate: toNum(r.reg_sat),
//           def_metro_sat_night_rate: toNum(r.metro_sat),
//           def_reg_sat_night_rate: toNum(r.reg_sat),
//           def_metro_sun_day_rate: toNum(r.metro_sun),
//           def_reg_sun_day_rate: toNum(r.reg_sun),
//           def_metro_sun_night_rate: toNum(r.metro_sun),
//           def_reg_sun_night_rate: toNum(r.reg_sun),
//           def_metro_pub_holi_day_rate: toNum(r.metro_pub),
//           def_reg_pub_holi_day_rate: toNum(r.reg_pub),
//           def_metro_pub_holi_night_rate: toNum(r.metro_pub),
//           def_reg_pub_holi_night_rate: toNum(r.reg_pub),
//         };
//       });

//       const payload = {
//         user_id: user?.id,
//         rates,
//         notes: adminNotes,
//       };

//       console.log(
//         "📤 request-charge-rate payload:",
//         JSON.stringify(payload, null, 2),
//       );

//       await axios.post(`${BASE_URL}/request-charge-rate`, payload, {
//         headers: {
//           Authorization: `Bearer ${token}`,
//           Accept: "application/json",
//           "Content-Type": "application/json",
//         },
//       });

//       Toast.show({
//         type: "success",
//         text1: "Request Submitted",
//         text2: "Your rate update request has been sent for admin review.",
//         position: "top",
//       });

//       setModalVisible(false);
//       fetchRates();
//       if (topTab === "history") {
//         fetchHistory(historyStatusTab);
//       }
//     } catch (err: any) {
//       console.log("❌ request-charge-rate error:", err?.response?.data || err);

//       const apiMessage =
//         err?.response?.data?.message ||
//         err?.response?.data?.errors?.state?.[0] ||
//         err?.response?.data?.errors?.rates?.[0] ||
//         err?.message ||
//         "Something went wrong";

//       Toast.show({
//         type: "error",
//         text1: "Submission Failed",
//         text2: apiMessage,
//         position: "top",
//       });
//     } finally {
//       setSubmitting(false);
//     }
//   };

//   const handleBackPress = () => {
//     const allowedStates = getAllowedStateCodes();

//     const allStatesHaveRates =
//       allowedStates.length > 0 &&
//       allowedStates.every((state) => hasRatesForState(state));

//     if (allStatesHaveRates) {
//       navigation.dispatch(
//         CommonActions.navigate({
//           name: "MainTabs",
//           params: {
//             screen: "Profile",
//           },
//         }),
//       );

//       return;
//     }

//     // If some states still don't have rates,
//     // continue back to Documents.
//     navigation.goBack();
//   };

//   const activeRates = stateRates[activeStateTab] || emptyRateForm();
//   const allowedCodesForModal = getAllowedStateCodes();

//   const openViewModal = (item: any) => {
//     setViewModalData(item);
//     setViewModalVisible(true);
//   };

//   const statusPillColors = (status: string) => {
//     const s = (status || "").toLowerCase();
//     if (s === "approved")
//       return { color: COLORS.success, bg: "rgba(52,200,138,0.12)" };
//     if (s === "rejected") return { color: COLORS.danger, bg: COLORS.dangerBg };
//     return { color: COLORS.warning, bg: COLORS.warningBg };
//   };

//   // Shared RefreshControl instance so pull-to-refresh behaves identically
//   // whichever ScrollView (empty state or rates list) is currently mounted.
//   const refreshControl = (
//     <RefreshControl
//       refreshing={refreshing}
//       onRefresh={onRefresh}
//       tintColor={COLORS.primary}
//       colors={[COLORS.primary]}
//     />
//   );

//   return (
//     <SafeAreaView style={styles.safe}>
//       <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

//       <LinearGradient
//         colors={[COLORS.heroBg1, COLORS.heroBg2]}
//         start={{ x: 0, y: 0 }}
//         end={{ x: 1, y: 1 }}
//         style={styles.header}
//       >
//         <View style={styles.heroInner}>
//           <View style={styles.headerRow}>
//             <TouchableOpacity
//               onPress={handleBackPress}
//               style={styles.backBtn}
//               hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
//             >
//               <ChevronLeft size={16} color="#fff" />
//             </TouchableOpacity>

//             <Text style={styles.headerTitle}>My Charge Rates</Text>

//             {!loading && (
//               <TouchableOpacity
//                 style={styles.headerStateBtn}
//                 onPress={() => openRequestModal()}
//                 activeOpacity={0.85}
//               >
//                 <Send size={13} color="#fff" style={{ marginRight: 6 }} />
//                 <Text style={styles.headerStateBtnText}>
//                   {missingStatesCount > 0
//                     ? "Request Rate Update"
//                     : "Manage States"}
//                 </Text>
//                 {missingStatesCount > 0 && (
//                   <View style={styles.headerStateBadge}>
//                     <Text style={styles.headerStateBadgeText}>
//                       {missingStatesCount}
//                     </Text>
//                   </View>
//                 )}
//               </TouchableOpacity>
//             )}
//           </View>

//           <Text style={styles.headerSub}>
//             View your approved charge rates by state, including metro and
//             regional rates.
//           </Text>
//         </View>
//       </LinearGradient>

//       {/* Top segmented tabs: Active Rates / Request History */}
//       <View style={styles.topTabsRow}>
//         <TouchableOpacity
//           style={[
//             styles.topTabBtn,
//             topTab === "active" && styles.topTabBtnActive,
//           ]}
//           onPress={() => handleTopTabPress("active")}
//           activeOpacity={0.85}
//         >
//           <Zap
//             size={14}
//             color={topTab === "active" ? COLORS.primary : COLORS.textSecondary}
//             style={{ marginRight: 6 }}
//           />
//           <Text
//             style={[
//               styles.topTabBtnText,
//               topTab === "active" && styles.topTabBtnTextActive,
//             ]}
//           >
//             Active Rates
//           </Text>
//         </TouchableOpacity>

//         <TouchableOpacity
//           style={[
//             styles.topTabBtn,
//             topTab === "history" && styles.topTabBtnActive,
//           ]}
//           onPress={() => handleTopTabPress("history")}
//           activeOpacity={0.85}
//         >
//           <HistoryIcon
//             size={14}
//             color={topTab === "history" ? COLORS.primary : COLORS.textSecondary}
//             style={{ marginRight: 6 }}
//           />
//           <Text
//             style={[
//               styles.topTabBtnText,
//               topTab === "history" && styles.topTabBtnTextActive,
//             ]}
//           >
//             Archived History
//           </Text>
//         </TouchableOpacity>
//       </View>

//       {topTab === "active" ? (
//         loading ? (
//           <View style={styles.center}>
//             <ActivityIndicator size="large" color={COLORS.primary} />
//             <Text style={styles.loadingText}>Loading rates…</Text>
//           </View>
//         ) : ratesList.length === 0 ? (
//           // Wrapped in a ScrollView (with flexGrow so it still centers) so
//           // RefreshControl has something scrollable to attach to — plain
//           // Views never fire onRefresh, which is why pull-to-refresh didn't
//           // work on this screen before.
//           <ScrollView
//             contentContainerStyle={styles.emptyStateContainer}
//             refreshControl={refreshControl}
//           >
//             <View style={styles.emptyStateCard}>
//               <View style={styles.emptyIcon}>
//                 <Clock size={28} color={COLORS.primary} />
//               </View>

//               <Text style={styles.emptyTitle}>No Rates Assigned Yet</Text>

//               <View style={styles.infoBox}>
//                 <View style={styles.infoDot} />

//                 <Text style={styles.infoText}>
//                   You currently do not have any active rates assigned to your
//                   profile. Please request charge rates for states you selected
//                   in profile section.
//                 </Text>
//               </View>

//               <TouchableOpacity
//                 style={styles.emptyRequestButton}
//                 onPress={() => openRequestModal()}
//                 activeOpacity={0.85}
//               >
//                 <Plus size={18} color="#fff" />
//                 <Text style={styles.emptyRequestButtonText}>
//                   Request Charge Rates
//                 </Text>
//               </TouchableOpacity>
//             </View>
//           </ScrollView>
//         ) : (
//           <ScrollView
//             style={styles.scroll}
//             contentContainerStyle={{ paddingBottom: 40 }}
//             refreshControl={refreshControl}
//           >
//             {/* Rates Tables — one card per state that has rates */}
//             {sortedRatesList.map((rate) => {
//               const stateCode = String(rate.state || "").toLowerCase();
//               const rows = buildRowsForRate(rate);
//               return (
//                 <View
//                   key={String(rate.id ?? stateCode)}
//                   style={styles.tableCard}
//                 >
//                   <View style={styles.tableHeader}>
//                     <View style={styles.tableHeaderLeft}>
//                       <View style={styles.clockIcon}>
//                         <MapPin size={16} color={COLORS.primary} />
//                       </View>

//                       <View style={{ flex: 1 }}>
//                         <Text style={styles.tableTitle}>
//                           {getStateLabel(stateCode)}
//                         </Text>
//                         <Text style={styles.tableSub} numberOfLines={1}>
//                           Metro vs Regional, by time slot
//                         </Text>
//                       </View>

//                       {rate.status ? (
//                         <View
//                           style={[
//                             styles.stateStatusPill,
//                             rate.status === "active"
//                               ? styles.stateStatusPillActive
//                               : styles.stateStatusPillPending,
//                           ]}
//                         >
//                           <Text
//                             style={[
//                               styles.stateStatusPillText,
//                               {
//                                 color:
//                                   rate.status === "active"
//                                     ? COLORS.success
//                                     : COLORS.warning,
//                               },
//                             ]}
//                           >
//                             {String(rate.status).charAt(0).toUpperCase() +
//                               String(rate.status).slice(1)}
//                           </Text>
//                         </View>
//                       ) : null}
//                     </View>
//                   </View>

//                   {/* colHeader + rate rows */}
//                   <View style={styles.colHeader}>
//                     <Text style={[styles.colHeaderText, { flex: 1.4 }]}>
//                       Time Slot
//                     </Text>
//                     <Text
//                       style={[
//                         styles.colHeaderText,
//                         { width: 90, textAlign: "right" },
//                       ]}
//                     >
//                       METRO
//                     </Text>
//                     <Text
//                       style={[
//                         styles.colHeaderText,
//                         { width: 90, textAlign: "right" },
//                       ]}
//                     >
//                       REGIONAL
//                     </Text>
//                   </View>

//                   {rows.map((row, idx) => (
//                     <View
//                       key={`${stateCode}-${row.label}-${idx}`}
//                       style={[
//                         styles.rateRow,
//                         idx === rows.length - 1 && { borderBottomWidth: 0 },
//                       ]}
//                     >
//                       <View style={{ flex: 1.4 }}>
//                         <Text style={styles.rateLabel}>{row.label}</Text>
//                         <Text style={styles.rateTime}>{row.time}</Text>
//                       </View>
//                       <Text style={[styles.rateValue, { width: 90 }]}>
//                         {formatMoney(row.metro)}
//                       </Text>
//                       <Text style={[styles.rateValue, { width: 90 }]}>
//                         {formatMoney(row.regional)}
//                       </Text>
//                     </View>
//                   ))}
//                 </View>
//               );
//             })}
//           </ScrollView>
//         )
//       ) : (
//         // ===================== REQUEST HISTORY TAB =====================
//         <View style={{ flex: 1 }}>
//           <View style={styles.historyStatusRow}>
//             {(["pending", "approved", "rejected"] as HistoryStatus[]).map(
//               (status) => {
//                 const active = historyStatusTab === status;
//                 const Icon =
//                   status === "pending"
//                     ? Clock
//                     : status === "approved"
//                     ? CheckCircle2
//                     : XCircle;
//                 return (
//                   <TouchableOpacity
//                     key={status}
//                     style={[
//                       styles.historyStatusBtn,
//                       active && styles.historyStatusBtnActive,
//                     ]}
//                     onPress={() => handleHistoryStatusPress(status)}
//                     activeOpacity={0.85}
//                   >
//                     <Icon
//                       size={13}
//                       color={active ? COLORS.primary : COLORS.textSecondary}
//                       style={{ marginRight: 6 }}
//                     />
//                     <Text
//                       style={[
//                         styles.historyStatusBtnText,
//                         active && styles.historyStatusBtnTextActive,
//                       ]}
//                     >
//                       {status.charAt(0).toUpperCase() + status.slice(1)}
//                     </Text>
//                   </TouchableOpacity>
//                 );
//               },
//             )}
//           </View>

//           {historyLoading ? (
//             <View style={styles.center}>
//               <ActivityIndicator size="large" color={COLORS.primary} />
//               <Text style={styles.loadingText}>Loading requests…</Text>
//             </View>
//           ) : historyList.length === 0 ? (
//             <ScrollView
//               contentContainerStyle={styles.emptyStateContainer}
//               refreshControl={refreshControl}
//             >
//               <View style={styles.emptyStateCard}>
//                 <View style={styles.emptyIcon}>
//                   <HistoryIcon size={28} color={COLORS.primary} />
//                 </View>
//                 <Text style={styles.emptyTitle}>
//                   No {historyStatusTab} requests
//                 </Text>
//                 <Text style={styles.emptyDescription}>
//                   {historyStatusTab === "pending"
//                     ? "You don't have any rate requests waiting for review."
//                     : `You don't have any ${historyStatusTab} rate requests yet.`}
//                 </Text>
//               </View>
//             </ScrollView>
//           ) : (
//             <ScrollView
//               style={styles.scroll}
//               contentContainerStyle={{ paddingBottom: 40 }}
//               refreshControl={refreshControl}
//             >
//               {historyList.map((item, idx) => {
//                 const stateCode = String(item.state || "").toLowerCase();
//                 const submitted =
//                   item.created_at ||
//                   item.submitted_at ||
//                   item.date ||
//                   item.updated_at;
//                 const note = item.notes ?? item.admin_note ?? item.admin_notes;
//                 const pill = statusPillColors(item.status || historyStatusTab);

//                 return (
//                   <View
//                     key={String(item.id ?? `${stateCode}-${idx}`)}
//                     style={styles.historyRowCard}
//                   >
//                     <View style={styles.historyRowTop}>
//                       <View style={{ flex: 1 }}>
//                         <Text style={styles.historyRowState}>
//                           {getStateLabel(stateCode)}
//                         </Text>
//                         <Text style={styles.historyRowDate}>
//                           Submitted {formatDate(submitted)}
//                         </Text>
//                       </View>

//                       <View
//                         style={[
//                           styles.stateStatusPill,
//                           { backgroundColor: pill.bg },
//                         ]}
//                       >
//                         <Text
//                           style={[
//                             styles.stateStatusPillText,
//                             { color: pill.color },
//                           ]}
//                         >
//                           {(item.status || historyStatusTab)
//                             .charAt(0)
//                             .toUpperCase() +
//                             (item.status || historyStatusTab).slice(1)}
//                         </Text>
//                       </View>
//                     </View>

//                     {note ? (
//                       <Text style={styles.historyRowNote} numberOfLines={2}>
//                         {note}
//                       </Text>
//                     ) : null}

//                     <TouchableOpacity
//                       style={styles.historyViewBtn}
//                       onPress={() => openViewModal(item)}
//                       activeOpacity={0.85}
//                     >
//                       <Eye
//                         size={13}
//                         color={COLORS.primary}
//                         style={{ marginRight: 6 }}
//                       />
//                       <Text style={styles.historyViewBtnText}>View</Text>
//                     </TouchableOpacity>
//                   </View>
//                 );
//               })}
//             </ScrollView>
//           )}
//         </View>
//       )}

//       {/* ===================== Request Rate Update Modal ===================== */}
//       <Modal
//         visible={modalVisible}
//         animationType="slide"
//         transparent
//         onRequestClose={() => setModalVisible(false)}
//       >
//         <KeyboardAvoidingBase>
//           <View style={styles.modalOverlay}>
//             <View style={styles.modalContent}>
//               <View style={styles.modalHeader}>
//                 <View style={{ flex: 1, paddingRight: 12 }}>
//                   <Text style={styles.modalTitle}>Request Rate Update</Text>
//                   <Text style={styles.modalSubtitle}>
//                     Submit your proposed charge rates for admin review &
//                     approval.
//                   </Text>
//                 </View>
//                 <TouchableOpacity
//                   onPress={() => setModalVisible(false)}
//                   style={styles.closeBtn}
//                 >
//                   <X size={20} color={COLORS.textSecondary} />
//                 </TouchableOpacity>
//               </View>

//               <ScrollView
//                 style={styles.modalScroll}
//                 contentContainerStyle={{ paddingBottom: 20 }}
//                 showsVerticalScrollIndicator={false}
//               >
//                 {/* State selector — checkbox chips. Only checked states are
//                     included in the submit payload. */}
//                 <View style={styles.stateSelectCard}>
//                   <View style={styles.stateSelectHeader}>
//                     <View style={styles.stateSelectHeaderLeft}>
//                       <MapPin size={16} color={COLORS.primary} />
//                       <Text style={styles.stateSelectTitle}>
//                         Select State(s) to Request
//                       </Text>
//                     </View>

//                     {selectedStates.length > 1 && (
//                       <TouchableOpacity
//                         style={styles.applyAllBtn}
//                         onPress={applyToAllStates}
//                       >
//                         <Copy
//                           size={13}
//                           color={COLORS.primary}
//                           style={{ marginRight: 6 }}
//                         />
//                         <Text style={styles.applyAllBtnText}>
//                           Apply to Selected
//                         </Text>
//                       </TouchableOpacity>
//                     )}
//                   </View>

//                   <View style={styles.stateTabsRow}>
//                     {allowedCodesForModal.map((code) => {
//                       const included = selectedStates.includes(code);
//                       const active = code === activeStateTab && included;
//                       const hasRates = hasRatesForState(code);
//                       return (
//                         <TouchableOpacity
//                           key={code}
//                           style={[
//                             styles.stateTab,
//                             active && styles.stateTabActive,
//                             !included && styles.stateTabUnselected,
//                           ]}
//                           onPress={() => toggleStateInclusion(code)}
//                         >
//                           {included ? (
//                             <CheckCircle2
//                               size={13}
//                               color={COLORS.primary}
//                               style={{ marginRight: 6 }}
//                             />
//                           ) : (
//                             <Circle
//                               size={13}
//                               color={COLORS.textMuted}
//                               style={{ marginRight: 6 }}
//                             />
//                           )}
//                           <Text
//                             style={[
//                               styles.stateTabText,
//                               active && styles.stateTabTextActive,
//                               !included && { color: COLORS.textMuted },
//                             ]}
//                           >
//                             {getStateLabel(code)}
//                           </Text>

//                           {hasRates ? (
//                             <View
//                               style={[
//                                 styles.stateStatusBadge,
//                                 styles.stateStatusBadgeSuccess,
//                               ]}
//                             >
//                               <CheckCircle2 size={10} color={COLORS.success} />
//                               <Text
//                                 style={[
//                                   styles.stateStatusBadgeText,
//                                   { color: COLORS.success },
//                                 ]}
//                               >
//                                 Has rates
//                               </Text>
//                             </View>
//                           ) : (
//                             <View
//                               style={[
//                                 styles.stateStatusBadge,
//                                 styles.stateStatusBadgeWarning,
//                               ]}
//                             >
//                               <AlertCircle size={10} color={COLORS.warning} />
//                               <Text
//                                 style={[
//                                   styles.stateStatusBadgeText,
//                                   { color: COLORS.warning },
//                                 ]}
//                               >
//                                 No rates
//                               </Text>
//                             </View>
//                           )}
//                         </TouchableOpacity>
//                       );
//                     })}
//                   </View>

//                   <Text style={styles.editingStateNote}>
//                     {activeStateTab
//                       ? `You are currently editing rates for ${getStateLabel(
//                           activeStateTab,
//                         )}`
//                       : "Select at least one state above to begin"}
//                   </Text>
//                 </View>

//                 {/* Rate Input Blocks — only shown once a state is active */}
//                 {activeStateTab ? (
//                   <View style={styles.formRatesContainer}>
//                     <View style={styles.rateCardFull}>
//                       <RateInputCard
//                         title="Mon–Fri Day"
//                         time="06:00–18:00"
//                         metroValue={activeRates.metro_mon_fri_day}
//                         regValue={activeRates.reg_mon_fri_day}
//                         onMetroChange={(v) =>
//                           updateStateField("metro_mon_fri_day", v)
//                         }
//                         onRegChange={(v) =>
//                           updateStateField("reg_mon_fri_day", v)
//                         }
//                       />
//                     </View>

//                     <View style={styles.rateCardFull}>
//                       <RateInputCard
//                         title="Mon–Fri Night"
//                         time="18:00–06:00"
//                         metroValue={activeRates.metro_mon_fri_night}
//                         regValue={activeRates.reg_mon_fri_night}
//                         onMetroChange={(v) =>
//                           updateStateField("metro_mon_fri_night", v)
//                         }
//                         onRegChange={(v) =>
//                           updateStateField("reg_mon_fri_night", v)
//                         }
//                       />
//                     </View>

//                     <View style={styles.rateCardFull}>
//                       <RateInputCard
//                         title="Saturday"
//                         time="All day"
//                         metroValue={activeRates.metro_sat}
//                         regValue={activeRates.reg_sat}
//                         onMetroChange={(v) => updateStateField("metro_sat", v)}
//                         onRegChange={(v) => updateStateField("reg_sat", v)}
//                       />
//                     </View>

//                     <View style={styles.rateCardFull}>
//                       <RateInputCard
//                         title="Sunday"
//                         time="All day"
//                         metroValue={activeRates.metro_sun}
//                         regValue={activeRates.reg_sun}
//                         onMetroChange={(v) => updateStateField("metro_sun", v)}
//                         onRegChange={(v) => updateStateField("reg_sun", v)}
//                       />
//                     </View>

//                     <View style={styles.rateCardFull}>
//                       <RateInputCard
//                         title="Public Holiday"
//                         time="All day"
//                         metroValue={activeRates.metro_pub}
//                         regValue={activeRates.reg_pub}
//                         onMetroChange={(v) => updateStateField("metro_pub", v)}
//                         onRegChange={(v) => updateStateField("reg_pub", v)}
//                       />
//                     </View>
//                   </View>
//                 ) : null}

//                 {/* Notes */}
//                 <View style={styles.formSection}>
//                   <Text style={styles.formSectionTitle}>
//                     Notes for Admin (Optional)
//                   </Text>
//                   <TextInput
//                     style={styles.textArea}
//                     placeholder="Tell the admin why you're requesting these rate changes..."
//                     placeholderTextColor={COLORS.textMuted}
//                     multiline
//                     numberOfLines={4}
//                     value={adminNotes}
//                     onChangeText={setAdminNotes}
//                   />
//                 </View>
//               </ScrollView>

//               {/* Modal Footer */}
//               <View style={styles.modalFooter}>
//                 <View style={styles.modalFooterRow}>
//                   <View style={styles.modalFooterNoteRow}>
//                     <Shield
//                       size={14}
//                       color={COLORS.textMuted}
//                       style={{ marginRight: 6 }}
//                     />
//                     <Text style={styles.modalFooterNote}>
//                       Your request will be reviewed by the Staffoo admin team.
//                     </Text>
//                   </View>

//                   <TouchableOpacity
//                     style={[
//                       styles.submitBtnModal,
//                       selectedStates.length === 0 && { opacity: 0.5 },
//                     ]}
//                     onPress={handleRequestSubmit}
//                     disabled={submitting || selectedStates.length === 0}
//                   >
//                     {submitting ? (
//                       <ActivityIndicator size="small" color="#fff" />
//                     ) : (
//                       <>
//                         <Send
//                           size={16}
//                           color="#fff"
//                           style={{ marginRight: 6 }}
//                         />
//                         <Text style={styles.submitBtnText}>
//                           Save and Submit
//                         </Text>
//                       </>
//                     )}
//                   </TouchableOpacity>
//                 </View>
//               </View>
//             </View>
//           </View>
//         </KeyboardAvoidingBase>
//       </Modal>

//       {/* ===================== View Requested Rates Modal ===================== */}
//       <Modal
//         visible={viewModalVisible}
//         animationType="fade"
//         transparent
//         onRequestClose={() => setViewModalVisible(false)}
//       >
//         <View style={styles.viewModalOverlay}>
//           <View style={styles.viewModalCard}>
//             <LinearGradient
//               colors={[COLORS.heroBg1, COLORS.primary]}
//               start={{ x: 0, y: 0 }}
//               end={{ x: 1, y: 1 }}
//               style={styles.viewModalHeader}
//             >
//               <Text style={styles.viewModalTitle} numberOfLines={1}>
//                 Requested Rates —{" "}
//                 {getStateLabel(String(viewModalData?.state || ""))}
//               </Text>
//               <TouchableOpacity
//                 onPress={() => setViewModalVisible(false)}
//                 style={styles.viewModalCloseBtn}
//               >
//                 <X size={18} color="#fff" />
//               </TouchableOpacity>
//             </LinearGradient>

//             <ScrollView
//               style={styles.viewModalBody}
//               showsVerticalScrollIndicator={false}
//             >
//               <View style={styles.viewModalMetaRow}>
//                 {(() => {
//                   const pill = statusPillColors(
//                     viewModalData?.status || historyStatusTab,
//                   );
//                   const label = String(
//                     viewModalData?.status || historyStatusTab,
//                   );
//                   return (
//                     <View
//                       style={[
//                         styles.viewModalStatusPill,
//                         { backgroundColor: pill.bg },
//                       ]}
//                     >
//                       <CheckCircle2 size={12} color={pill.color} />
//                       <Text
//                         style={[
//                           styles.viewModalStatusPillText,
//                           { color: pill.color },
//                         ]}
//                       >
//                         {label.charAt(0).toUpperCase() + label.slice(1)}
//                       </Text>
//                     </View>
//                   );
//                 })()}
//                 <Text style={styles.viewModalSubmittedText}>
//                   Submitted on{" "}
//                   {formatDate(
//                     viewModalData?.created_at ||
//                       viewModalData?.submitted_at ||
//                       viewModalData?.date,
//                   )}
//                 </Text>
//               </View>

//               {(viewModalData?.notes ||
//                 viewModalData?.admin_note ||
//                 viewModalData?.admin_notes) && (
//                 <View style={styles.viewModalNoteBox}>
//                   <Text style={styles.viewModalNoteLabel}>Admin Note</Text>
//                   <Text style={styles.viewModalNoteText}>
//                     {viewModalData?.notes ||
//                       viewModalData?.admin_note ||
//                       viewModalData?.admin_notes}
//                   </Text>
//                 </View>
//               )}

//               <View style={styles.viewModalTable}>
//                 <View style={styles.viewModalTableHeaderRow}>
//                   <Text
//                     style={[styles.viewModalTableHeaderText, { flex: 1.4 }]}
//                   >
//                     Time Slot
//                   </Text>
//                   <Text
//                     style={[
//                       styles.viewModalTableHeaderText,
//                       { width: 90, textAlign: "right" },
//                     ]}
//                   >
//                     Metro ($)
//                   </Text>
//                   <Text
//                     style={[
//                       styles.viewModalTableHeaderText,
//                       { width: 90, textAlign: "right" },
//                     ]}
//                   >
//                     Regional ($)
//                   </Text>
//                 </View>

//                 {buildRowsForRate(viewModalData).map((row, idx, arr) => (
//                   <View
//                     key={`${row.label}-${idx}`}
//                     style={[
//                       styles.viewModalTableRow,
//                       idx === arr.length - 1 && { borderBottomWidth: 0 },
//                     ]}
//                   >
//                     <View style={{ flex: 1.4 }}>
//                       <Text style={styles.viewModalRowLabel}>{row.label}</Text>
//                       <Text style={styles.viewModalRowTime}>{row.time}</Text>
//                     </View>
//                     <Text style={[styles.viewModalRowValueDark, { width: 90 }]}>
//                       {formatMoney(row.metro)}
//                     </Text>
//                     <Text style={[styles.viewModalRowValueTeal, { width: 90 }]}>
//                       {formatMoney(row.regional)}
//                     </Text>
//                   </View>
//                 ))}
//               </View>
//             </ScrollView>
//           </View>
//         </View>
//       </Modal>
//     </SafeAreaView>
//   );
// }

// function KeyboardAvoidingBase({ children }: { children: React.ReactNode }) {
//   if (Platform.OS === "ios") {
//     return (
//       <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
//         {children}
//       </KeyboardAvoidingView>
//     );
//   }
//   return <View style={{ flex: 1 }}>{children}</View>;
// }

// type RateInputCardProps = {
//   title: string;
//   time: string;
//   metroValue: string;
//   regValue: string;
//   onMetroChange: (v: string) => void;
//   onRegChange: (v: string) => void;
// };

// function RateInputCard({
//   title,
//   time,
//   metroValue,
//   regValue,
//   onMetroChange,
//   onRegChange,
// }: RateInputCardProps) {
//   return (
//     <View style={styles.rateInputCard}>
//       <View style={styles.rateCardHeader}>
//         <Text style={styles.rateCardTitle}>{title}</Text>
//         <Text style={styles.rateCardTime}>{time}</Text>
//       </View>

//       <View style={styles.rateInputsRow}>
//         <View style={styles.rateInputBox}>
//           <Text style={styles.subInputLabel}>METRO</Text>
//           <TextInput
//             style={styles.textInputRate}
//             placeholder="$ 0.00"
//             placeholderTextColor={COLORS.textMuted}
//             keyboardType="numeric"
//             value={metroValue}
//             onChangeText={onMetroChange}
//           />
//         </View>

//         <View style={styles.rateInputBox}>
//           <Text style={styles.subInputLabel}>REGIONAL</Text>
//           <TextInput
//             style={styles.textInputRate}
//             placeholder="$ 0.00"
//             placeholderTextColor={COLORS.textMuted}
//             keyboardType="numeric"
//             value={regValue}
//             onChangeText={onRegChange}
//           />
//         </View>
//       </View>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   safe: {
//     flex: 1,
//     backgroundColor: COLORS.background,
//     paddingTop: 20,
//   },
//   header: {
//     paddingTop: Platform.OS === "ios" ? 5 : 26,
//     paddingBottom: 15,
//     paddingHorizontal: Platform.OS === "ios" ? 5 : 10,
//     borderBottomLeftRadius: 24,
//     borderBottomRightRadius: 24,
//   },
//   heroInner: {
//     width: "100%",
//     paddingHorizontal: 10,
//     paddingBottom: Platform.OS === "ios" ? 20 : 5,
//     paddingTop: Platform.OS === "ios" ? 5 : 10,
//   },

//   headerTitleRow: {
//     flexDirection: "row",
//     alignItems: "center",
//     gap: 8,
//     marginBottom: 6,
//   },

//   center: {
//     flex: 1,
//     alignItems: "center",
//     justifyContent: "center",
//     gap: 12,
//   },
//   loadingText: {
//     color: COLORS.textSecondary,
//     fontSize: 14,
//   },
//   scroll: {
//     flex: 1,
//   },

//   // ---- Top tabs ----
//   topTabsRow: {
//     flexDirection: "row",
//     marginHorizontal: 16,
//     marginTop: 14,
//     backgroundColor: COLORS.surface,
//     borderRadius: 14,
//     padding: 4,
//     gap: 4,
//     borderWidth: 1,
//     borderColor: COLORS.cardBorder,
//   },
//   topTabBtn: {
//     flex: 1,
//     flexDirection: "row",
//     alignItems: "center",
//     justifyContent: "center",
//     paddingVertical: 10,
//     borderRadius: 10,
//   },
//   topTabBtnActive: {
//     backgroundColor: COLORS.card,
//     borderWidth: 1,
//     borderColor: COLORS.primaryBorder,
//   },
//   topTabBtnText: {
//     fontSize: 12,
//     fontWeight: "700",
//     color: COLORS.textSecondary,
//   },
//   topTabBtnTextActive: {
//     color: COLORS.primary,
//   },

//   // ---- Request history sub-tabs ----
//   historyStatusRow: {
//     flexDirection: "row",
//     marginHorizontal: 16,
//     marginTop: 14,
//     marginBottom: 4,
//     backgroundColor: COLORS.surface,
//     borderRadius: 14,
//     padding: 4,
//     gap: 4,
//     borderWidth: 1,
//     borderColor: COLORS.cardBorder,
//   },
//   historyStatusBtn: {
//     flex: 1,
//     flexDirection: "row",
//     alignItems: "center",
//     justifyContent: "center",
//     paddingVertical: 9,
//     borderRadius: 10,
//   },
//   historyStatusBtnActive: {
//     backgroundColor: COLORS.card,
//     borderWidth: 1,
//     borderColor: COLORS.primaryBorder,
//   },
//   historyStatusBtnText: {
//     fontSize: 11,
//     fontWeight: "700",
//     color: COLORS.textSecondary,
//   },
//   historyStatusBtnTextActive: {
//     color: COLORS.primary,
//   },

//   historyRowCard: {
//     marginHorizontal: 16,
//     marginTop: 12,
//     backgroundColor: COLORS.card,
//     borderRadius: 16,
//     borderWidth: 1,
//     borderColor: COLORS.cardBorder,
//     padding: 14,
//   },
//   historyRowTop: {
//     flexDirection: "row",
//     alignItems: "flex-start",
//     justifyContent: "space-between",
//   },
//   historyRowState: {
//     fontSize: 15,
//     fontWeight: "700",
//     color: COLORS.text,
//   },
//   historyRowDate: {
//     fontSize: 12,
//     color: COLORS.textSecondary,
//     marginTop: 2,
//   },
//   historyRowNote: {
//     fontSize: 12,
//     color: COLORS.textSecondary,
//     marginTop: 10,
//     lineHeight: 17,
//   },
//   historyViewBtn: {
//     flexDirection: "row",
//     alignItems: "center",
//     alignSelf: "flex-start",
//     marginTop: 12,
//     borderWidth: 1,
//     borderColor: COLORS.primaryBorder,
//     borderRadius: 20,
//     paddingHorizontal: 12,
//     paddingVertical: 7,
//   },
//   historyViewBtnText: {
//     color: COLORS.primary,
//     fontSize: 12,
//     fontWeight: "700",
//   },

//   tableCard: {
//     marginHorizontal: 16,
//     marginTop: 16,
//     backgroundColor: COLORS.card,
//     borderRadius: 16,
//     borderWidth: 1,
//     borderColor: COLORS.cardBorder,
//     overflow: "hidden",
//   },

//   clockIcon: {
//     width: 36,
//     height: 36,
//     borderRadius: 10,
//     backgroundColor: COLORS.primaryGlow,
//     alignItems: "center",
//     justifyContent: "center",
//   },
//   tableTitle: {
//     fontSize: 15,
//     fontWeight: "700",
//     color: COLORS.text,
//   },

//   colHeader: {
//     flexDirection: "row",
//     paddingHorizontal: 16,
//     paddingVertical: 10,
//     backgroundColor: COLORS.surface,
//     borderBottomWidth: 1,
//     borderBottomColor: COLORS.cardBorder,
//   },
//   colHeaderText: {
//     fontSize: 11,
//     fontWeight: "700",
//     color: COLORS.textMuted,
//     letterSpacing: 0.5,
//   },
//   rateRow: {
//     flexDirection: "row",
//     alignItems: "center",
//     paddingHorizontal: 16,
//     paddingVertical: 14,
//     borderBottomWidth: 1,
//     borderBottomColor: COLORS.cardBorder,
//   },
//   rateLabel: {
//     fontSize: 14,
//     fontWeight: "600",
//     color: COLORS.text,
//   },
//   rateTime: {
//     fontSize: 12,
//     color: COLORS.textSecondary,
//     marginTop: 2,
//   },
//   rateValue: {
//     fontSize: 14,
//     fontWeight: "700",
//     color: COLORS.primary,
//     textAlign: "right",
//   },

//   // Modal
//   modalOverlay: {
//     flex: 1,
//     backgroundColor: "rgba(0,0,0,0.8)",
//     justifyContent: "flex-end",
//   },
//   modalContent: {
//     backgroundColor: COLORS.background,
//     borderTopLeftRadius: 24,
//     borderTopRightRadius: 24,
//     height: "90%",
//     borderWidth: 1,
//     borderColor: COLORS.cardBorder,
//     overflow: "hidden",
//   },
//   modalHeader: {
//     flexDirection: "row",
//     justifyContent: "space-between",
//     alignItems: "flex-start",
//     padding: 20,
//     borderBottomWidth: 1,
//     borderBottomColor: COLORS.cardBorder,
//   },
//   modalTitle: {
//     fontSize: 18,
//     fontWeight: "800",
//     color: COLORS.text,
//     marginBottom: 4,
//   },
//   modalSubtitle: {
//     fontSize: 12,
//     color: COLORS.textSecondary,
//   },
//   closeBtn: {
//     width: 32,
//     height: 32,
//     borderRadius: 8,
//     backgroundColor: COLORS.surface,
//     alignItems: "center",
//     justifyContent: "center",
//   },
//   modalScroll: {
//     flex: 1,
//     padding: 16,
//   },
//   stateSelectCard: {
//     backgroundColor: COLORS.card,
//     borderRadius: 14,
//     padding: 14,
//     borderWidth: 1,
//     borderColor: COLORS.cardBorder,
//     marginBottom: 16,
//   },
//   stateSelectHeader: {
//     flexDirection: "row",
//     justifyContent: "space-between",
//     alignItems: "center",
//     marginBottom: 12,
//     flexWrap: "wrap",
//     gap: 8,
//   },
//   stateSelectHeaderLeft: {
//     flexDirection: "row",
//     alignItems: "center",
//     gap: 8,
//   },
//   stateSelectTitle: {
//     fontSize: 11,
//     fontWeight: "700",
//     color: COLORS.text,
//   },
//   applyAllBtn: {
//     flexDirection: "row",
//     alignItems: "center",
//     borderWidth: 1,
//     borderColor: COLORS.primaryBorder,
//     borderRadius: 20,
//     paddingHorizontal: 12,
//     paddingVertical: 6,
//   },
//   applyAllBtnText: {
//     color: COLORS.primary,
//     fontSize: 11,
//     fontWeight: "700",
//   },
//   stateTabsRow: {
//     flexDirection: "row",
//     flexWrap: "wrap",
//     backgroundColor: COLORS.surface,
//     borderRadius: 12,
//     padding: 4,
//     gap: 4,
//   },
//   stateTab: {
//     flexDirection: "row",
//     alignItems: "center",
//     justifyContent: "center",
//     flexGrow: 1,
//     paddingVertical: 10,
//     paddingHorizontal: 10,
//     borderRadius: 10,
//     flexWrap: "wrap",
//     gap: 6,
//   },
//   stateTabActive: {
//     backgroundColor: COLORS.card,
//     borderWidth: 1,
//     borderColor: COLORS.primaryBorder,
//   },
//   stateTabUnselected: {
//     opacity: 0.55,
//   },
//   stateTabText: {
//     fontSize: 11,
//     fontWeight: "700",
//     color: COLORS.textSecondary,
//   },
//   stateTabTextActive: {
//     color: COLORS.primary,
//   },
//   stateStatusBadge: {
//     flexDirection: "row",
//     alignItems: "center",
//     borderRadius: 20,
//     paddingHorizontal: 8,
//     paddingVertical: 3,
//     gap: 4,
//   },
//   stateStatusBadgeSuccess: {
//     backgroundColor: "rgba(52,200,138,0.12)",
//   },
//   stateStatusBadgeWarning: {
//     backgroundColor: COLORS.warningBg,
//   },
//   stateStatusBadgeText: {
//     fontSize: 9,
//     fontWeight: "700",
//   },
//   editingStateNote: {
//     fontSize: 11,
//     color: COLORS.textSecondary,
//     textAlign: "center",
//     marginTop: 10,
//   },
//   formSection: {
//     backgroundColor: COLORS.card,
//     borderRadius: 14,
//     padding: 14,
//     borderWidth: 1,
//     borderColor: COLORS.cardBorder,
//     marginBottom: 16,
//   },
//   formSectionTitle: {
//     fontSize: 12,
//     fontWeight: "700",
//     color: COLORS.textSecondary,
//     marginBottom: 10,
//     letterSpacing: 0.5,
//   },
//   textArea: {
//     backgroundColor: COLORS.surface,
//     borderWidth: 1,
//     borderColor: COLORS.cardBorder,
//     borderRadius: 10,
//     padding: 12,
//     color: COLORS.text,
//     fontSize: 13,
//     textAlignVertical: "top",
//     minHeight: 80,
//   },

//   modalFooterButtons: {
//     flexDirection: "row",
//     gap: 10,
//   },
//   cancelBtnModal: {
//     flex: 1,
//     paddingVertical: 12,
//     borderRadius: 12,
//     backgroundColor: COLORS.surface,
//     alignItems: "center",
//     justifyContent: "center",
//     borderWidth: 1,
//     borderColor: COLORS.cardBorder,
//   },
//   cancelBtnText: {
//     color: COLORS.textSecondary,
//     fontSize: 14,
//     fontWeight: "600",
//   },

//   formRatesContainer: {
//     marginBottom: 16,
//   },
//   rateCardFull: {
//     width: "100%",
//     marginBottom: 10,
//   },
//   rateInputCard: {
//     backgroundColor: COLORS.card,
//     borderRadius: 14,
//     padding: 12,
//     borderWidth: 1,
//     borderColor: COLORS.cardBorder,
//   },
//   rateCardHeader: {
//     flexDirection: "row",
//     justifyContent: "space-between",
//     alignItems: "center",
//     marginBottom: 10,
//   },
//   rateCardTitle: {
//     fontSize: 13,
//     fontWeight: "700",
//     color: COLORS.text,
//     flexShrink: 1,
//   },
//   rateCardTime: {
//     fontSize: 10,
//     color: COLORS.textSecondary,
//     marginLeft: 4,
//   },
//   rateInputsRow: {
//     flexDirection: "row",
//     gap: 8,
//   },
//   rateInputBox: {
//     flex: 1,
//     backgroundColor: COLORS.surface,
//     borderRadius: 10,
//     borderWidth: 1,
//     borderColor: COLORS.cardBorder,
//     padding: 8,
//   },
//   subInputLabel: {
//     fontSize: 9,
//     fontWeight: "700",
//     color: COLORS.textMuted,
//     marginBottom: 4,
//   },
//   textInputRate: {
//     color: COLORS.text,
//     fontSize: 13,
//     fontWeight: "700",
//     padding: 0,
//   },
//   headerContent: {
//     paddingTop: 4,
//     paddingBottom: 4,
//   },

//   headerBadge: {
//     alignSelf: "flex-start",
//     flexDirection: "row",
//     alignItems: "center",
//     backgroundColor: "rgba(0,169,157,0.12)",
//     borderWidth: 1,
//     borderColor: "rgba(0,169,157,0.22)",
//     borderRadius: 20,
//     paddingHorizontal: 10,
//     paddingVertical: 6,
//     marginBottom: 10,
//   },

//   liveDot: {
//     width: 7,
//     height: 7,
//     borderRadius: 4,
//     backgroundColor: COLORS.primary,
//     marginRight: 7,
//   },

//   headerLabel: {
//     color: COLORS.primary,
//     fontSize: 10,
//     fontWeight: "800",
//     letterSpacing: 1.1,
//   },

//   headerTop: {
//     flexDirection: "row",
//     justifyContent: "space-between",
//     alignItems: "center",
//     marginBottom: 20,
//   },

//   emptyStateContainer: {
//     flexGrow: 1,
//     alignItems: "center",
//     justifyContent: "center",
//     paddingHorizontal: 20,
//   },

//   emptyStateCard: {
//     width: "100%",
//     maxWidth: 420,
//     backgroundColor: COLORS.card,
//     borderRadius: 22,
//     borderWidth: 1,
//     borderColor: COLORS.cardBorder,
//     paddingHorizontal: 22,
//     paddingVertical: 28,
//     alignItems: "center",
//   },

//   emptyIcon: {
//     width: 64,
//     height: 64,
//     borderRadius: 20,
//     backgroundColor: COLORS.primaryGlow,
//     borderWidth: 1,
//     borderColor: COLORS.primaryBorder,
//     alignItems: "center",
//     justifyContent: "center",
//     marginBottom: 18,
//   },

//   emptyTitle: {
//     color: COLORS.text,
//     fontSize: 19,
//     fontWeight: "800",
//     textAlign: "center",
//     marginBottom: 8,
//   },

//   emptyDescription: {
//     color: COLORS.textSecondary,
//     fontSize: 13,
//     lineHeight: 20,
//     textAlign: "center",
//     maxWidth: 330,
//   },

//   infoBox: {
//     width: "100%",
//     flexDirection: "row",
//     alignItems: "flex-start",
//     backgroundColor: COLORS.surface,
//     borderWidth: 1,
//     borderColor: COLORS.cardBorder,
//     borderRadius: 14,
//     padding: 13,
//     marginTop: 20,
//     marginBottom: 20,
//   },

//   infoDot: {
//     width: 7,
//     height: 7,
//     borderRadius: 4,
//     backgroundColor: COLORS.primary,
//     marginTop: 6,
//     marginRight: 10,
//   },

//   infoText: {
//     flex: 1,
//     color: COLORS.textSecondary,
//     fontSize: 12,
//     lineHeight: 18,
//   },

//   emptyRequestButton: {
//     width: "100%",
//     flexDirection: "row",
//     alignItems: "center",
//     justifyContent: "center",
//     backgroundColor: COLORS.primary,
//     borderRadius: 14,
//     paddingVertical: 14,
//   },

//   emptyRequestButtonText: {
//     color: "#fff",
//     fontSize: 14,
//     fontWeight: "800",
//     marginLeft: 7,
//   },
//   headerRow: {
//     flexDirection: "row",
//     alignItems: "center",
//     marginBottom: 8,
//   },

//   backBtn: {
//     width: 27,
//     height: 27,
//     borderRadius: 7,
//     backgroundColor: "rgba(255,255,255,0.08)",
//     borderWidth: 1,
//     borderColor: "rgba(255,255,255,0.08)",
//     alignItems: "center",
//     justifyContent: "center",
//     marginRight: 12,
//   },

//   headerTitle: {
//     flex: 1,
//     color: COLORS.text,
//     fontSize: 18,
//     fontWeight: "800",
//   },

//   headerStateBtn: {
//     flexDirection: "row",
//     alignItems: "center",
//     backgroundColor: COLORS.primary,
//     paddingHorizontal: 12,
//     paddingVertical: 8,
//     borderRadius: 20,
//     marginLeft: 8,
//   },
//   headerStateBtnText: {
//     color: "#fff",
//     fontSize: 12,
//     fontWeight: "700",
//   },
//   headerStateBadge: {
//     marginLeft: 6,
//     minWidth: 16,
//     height: 16,
//     borderRadius: 8,
//     backgroundColor: "rgba(255,255,255,0.9)",
//     alignItems: "center",
//     justifyContent: "center",
//     paddingHorizontal: 4,
//   },
//   headerStateBadgeText: {
//     color: COLORS.primary,
//     fontSize: 9,
//     fontWeight: "800",
//   },

//   headerSub: {
//     color: COLORS.textSecondary,
//     fontSize: 12,
//   },
//   tableHeader: {
//     padding: 16,
//     borderBottomWidth: 1,
//     borderBottomColor: COLORS.cardBorder,
//   },
//   tableHeaderLeft: {
//     flexDirection: "row",
//     alignItems: "center",
//     gap: 12,
//   },
//   stateStatusPill: {
//     paddingHorizontal: 10,
//     paddingVertical: 5,
//     borderRadius: 20,
//   },
//   stateStatusPillActive: {
//     backgroundColor: "rgba(52,200,138,0.12)",
//   },
//   stateStatusPillPending: {
//     backgroundColor: COLORS.warningBg,
//   },
//   stateStatusPillText: {
//     fontSize: 10,
//     fontWeight: "700",
//   },
//   tableSub: {
//     fontSize: 12,
//     color: COLORS.textSecondary,
//     marginTop: 4,
//   },
//   modalFooter: {
//     padding: 16,
//     backgroundColor: COLORS.card,
//     borderTopWidth: 1,
//     borderTopColor: COLORS.cardBorder,
//   },
//   modalFooterRow: {
//     flexDirection: "row",
//     alignItems: "center",
//     justifyContent: "space-between",
//     gap: 12,
//   },

//   submitBtnModal: {
//     flexDirection: "row",
//     paddingHorizontal: 18,
//     paddingVertical: 12,
//     borderRadius: 24,
//     backgroundColor: COLORS.primary,
//     alignItems: "center",
//     justifyContent: "center",
//   },
//   submitBtnText: {
//     color: "#fff",
//     fontSize: 14,
//     fontWeight: "700",
//   },
//   modalFooterNoteRow: {
//     flex: 1,
//     flexDirection: "row",
//     alignItems: "center",
//   },
//   modalFooterNote: {
//     flex: 1,
//     fontSize: 11,
//     color: "#727272",
//     lineHeight: 16,
//   },

//   // ---- View Requested Rates modal ----
//   viewModalOverlay: {
//     flex: 1,
//     backgroundColor: "rgba(0,0,0,0.75)",
//     alignItems: "center",
//     justifyContent: "center",
//     padding: 20,
//   },
//   viewModalCard: {
//     width: "100%",
//     maxWidth: 480,
//     maxHeight: "85%",
//     backgroundColor: "#F4F6F8",
//     borderRadius: 20,
//     overflow: "hidden",
//   },
//   viewModalHeader: {
//     flexDirection: "row",
//     alignItems: "center",
//     justifyContent: "space-between",
//     paddingHorizontal: 18,
//     paddingVertical: 18,
//   },
//   viewModalTitle: {
//     flex: 1,
//     color: "#fff",
//     fontSize: 17,
//     fontWeight: "800",
//     marginRight: 10,
//   },
//   viewModalCloseBtn: {
//     width: 30,
//     height: 30,
//     borderRadius: 15,
//     backgroundColor: "rgba(255,255,255,0.18)",
//     alignItems: "center",
//     justifyContent: "center",
//   },
//   viewModalBody: {
//     padding: 18,
//   },
//   viewModalMetaRow: {
//     flexDirection: "row",
//     alignItems: "center",
//     gap: 10,
//     marginBottom: 16,
//     flexWrap: "wrap",
//   },
//   viewModalStatusPill: {
//     flexDirection: "row",
//     alignItems: "center",
//     gap: 5,
//     paddingHorizontal: 10,
//     paddingVertical: 5,
//     borderRadius: 20,
//   },
//   viewModalStatusPillText: {
//     fontSize: 11,
//     fontWeight: "700",
//   },
//   viewModalSubmittedText: {
//     fontSize: 12,
//     color: "#5B6B7A",
//   },
//   viewModalNoteBox: {
//     backgroundColor: "#E9EDF1",
//     borderRadius: 12,
//     padding: 12,
//     marginBottom: 16,
//   },
//   viewModalNoteLabel: {
//     fontSize: 12,
//     fontWeight: "800",
//     color: "#1F2A33",
//     marginBottom: 2,
//   },
//   viewModalNoteText: {
//     fontSize: 12,
//     color: "#5B6B7A",
//   },
//   viewModalTable: {
//     backgroundColor: "#fff",
//     borderRadius: 14,
//     borderWidth: 1,
//     borderColor: "#E3E7EB",
//     overflow: "hidden",
//   },
//   viewModalTableHeaderRow: {
//     flexDirection: "row",
//     paddingHorizontal: 14,
//     paddingVertical: 10,
//     borderBottomWidth: 1,
//     borderBottomColor: "#E3E7EB",
//   },
//   viewModalTableHeaderText: {
//     fontSize: 11,
//     fontWeight: "700",
//     color: "#8895A2",
//     letterSpacing: 0.4,
//   },
//   viewModalTableRow: {
//     flexDirection: "row",
//     alignItems: "center",
//     paddingHorizontal: 14,
//     paddingVertical: 14,
//     borderBottomWidth: 1,
//     borderBottomColor: "#E3E7EB",
//   },
//   viewModalRowLabel: {
//     fontSize: 14,
//     fontWeight: "700",
//     color: "#1F2A33",
//   },
//   viewModalRowTime: {
//     fontSize: 11,
//     color: "#8895A2",
//     marginTop: 2,
//   },
//   viewModalRowValueDark: {
//     fontSize: 14,
//     fontWeight: "700",
//     color: "#1F2A33",
//     textAlign: "right",
//   },
//   viewModalRowValueTeal: {
//     fontSize: 14,
//     fontWeight: "700",
//     color: COLORS.primary,
//     textAlign: "right",
//   },
// });

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  RefreshControl,
  Platform,
  Modal,
  TextInput,
  KeyboardAvoidingView,
} from "react-native";
import { CommonActions, useNavigation } from "@react-navigation/native";
import LinearGradient from "react-native-linear-gradient";
import {
  ChevronLeft,
  Clock,
  Send,
  X,
  Plus,
  MapPin,
  Copy,
  CheckCircle2,
  Circle,
  AlertCircle,
  Shield,
  Zap,
  History as HistoryIcon,
  Eye,
  XCircle,
  RotateCcw,
} from "lucide-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { BASE_URL } from "../services/authApi";
import Toast from "react-native-toast-message";

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

const STATE_FULL_NAME: Record<string, string> = {
  vic: "Victoria",
  qld: "Queensland",
  nsw: "New South Wales",
  sa: "South Australia",
  wa: "Western Australia",
  tas: "Tasmania",
  act: "Australian Capital Territory",
  nt: "Northern Territory",
  punjab: "Punjab",
};

type RateRow = {
  label: string;
  time: string;
  metro: string | number;
  regional: string | number;
};

type RateFormShape = {
  metro_mon_fri_day: string;
  reg_mon_fri_day: string;
  metro_mon_fri_night: string;
  reg_mon_fri_night: string;
  metro_sat: string;
  reg_sat: string;
  metro_sun: string;
  reg_sun: string;
  metro_pub: string;
  reg_pub: string;
};

type HistoryStatus = "pending" | "approved" | "rejected";
type TopTab = "active" | "history";

const emptyRateForm = (): RateFormShape => ({
  metro_mon_fri_day: "",
  reg_mon_fri_day: "",
  metro_mon_fri_night: "",
  reg_mon_fri_night: "",
  metro_sat: "",
  reg_sat: "",
  metro_sun: "",
  reg_sun: "",
  metro_pub: "",
  reg_pub: "",
});

// Map a raw def_* rate record (active rate OR a past request) into the
// editable form shape used by the request modal.
const mapRecordToRateForm = (record: any): RateFormShape => ({
  metro_mon_fri_day: String(record?.def_metro_mon_to_fri_day_rate ?? ""),
  reg_mon_fri_day: String(record?.def_reg_mon_to_fri_day_rate ?? ""),
  metro_mon_fri_night: String(record?.def_metro_mon_to_fri_night_rate ?? ""),
  reg_mon_fri_night: String(record?.def_reg_mon_to_fri_night_rate ?? ""),
  metro_sat: String(record?.def_metro_sat_day_rate ?? ""),
  reg_sat: String(record?.def_reg_sat_day_rate ?? ""),
  metro_sun: String(record?.def_metro_sun_day_rate ?? ""),
  reg_sun: String(record?.def_reg_sun_day_rate ?? ""),
  metro_pub: String(record?.def_metro_pub_holi_day_rate ?? ""),
  reg_pub: String(record?.def_reg_pub_holi_day_rate ?? ""),
});

export default function ContractorRatesScreen() {
  const navigation = useNavigation();

  // ----- Core / auth -----
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [ratesList, setRatesList] = useState<any[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [userId, setUserId] = useState<number | string | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);

  // ----- Top tabs (Active Rates / Request History) -----
  const [topTab, setTopTab] = useState<TopTab>("active");

  // ----- Request history (single merged list — no status sub-tabs) -----
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [viewModalData, setViewModalData] = useState<any>(null);

  // ----- Request rate update modal -----
  const [modalVisible, setModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");
  const [selectedStates, setSelectedStates] = useState<string[]>([]);
  const [activeStateTab, setActiveStateTab] = useState<string>("");
  const [stateRates, setStateRates] = useState<Record<string, RateFormShape>>(
    {},
  );

  // =========================================================
  // Fetch: Active rates + profile
  // =========================================================
  const fetchRates = useCallback(async () => {
    try {
      const userStr = await AsyncStorage.getItem("user");
      if (!userStr) throw new Error("User not found");

      const user = JSON.parse(userStr);
      const uid = user?.id;
      if (!uid) throw new Error("User ID not found");

      const token = await AsyncStorage.getItem("@auth_token");
      if (!token) throw new Error("No token");

      setUserId(uid);
      setAuthToken(token);

      const profileRes = await axios.get(`${BASE_URL}/user-edit/${uid}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });
      setUserProfile(profileRes.data?.data);

      const res = await axios.get(`${BASE_URL}/get-contractor-rates/${uid}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      const list = res.data?.data;
      const rates = Array.isArray(list) ? list : [];
      setRatesList(rates);
    } catch (err: any) {
      console.error("get-contractor-rates error:", err);
      Toast.show({
        type: "error",
        text1: "Failed to load rates",
        text2: err?.response?.data?.message || err.message,
        position: "top",
      });
      setRatesList([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchRates();
  }, [fetchRates]);

  // =========================================================
  // Fetch: Request history — merges pending + approved + rejected
  // into a single list, since the UI no longer has status tabs.
  // =========================================================
  // const fetchHistory = useCallback(async () => {
  //   try {
  //     setHistoryLoading(true);

  //     let uid = userId;
  //     let token = authToken;

  //     if (!uid || !token) {
  //       const userStr = await AsyncStorage.getItem("user");
  //       const t = await AsyncStorage.getItem("@auth_token");
  //       if (userStr) uid = JSON.parse(userStr)?.id;
  //       token = t;
  //       if (uid) setUserId(uid);
  //       if (token) setAuthToken(token);
  //     }

  //     if (!uid || !token) throw new Error("Authentication error");

  //     const headers = {
  //       Authorization: `Bearer ${token}`,
  //       Accept: "application/json",
  //     };

  //     const statuses: HistoryStatus[] = ["pending", "approved", "rejected"];

  //     const results = await Promise.all(
  //       statuses.map((status) =>
  //         axios
  //           .get(`${BASE_URL}/charge-rate-requests`, {
  //             params: { status, user_id: uid },
  //             headers,
  //           })
  //           .then((res) => {
  //             const list = res.data?.data;
  //             const arr = Array.isArray(list) ? list : [];
  //             // make sure every item carries its status even if the API
  //             // response itself doesn't echo it back
  //             return arr.map((item: any) => ({
  //               ...item,
  //               status: item.status || status,
  //             }));
  //           })
  //           .catch((err) => {
  //             console.error(`charge-rate-requests (${status}) error:`, err);
  //             return [];
  //           }),
  //       ),
  //     );

  //     const merged = results.flat();

  //     // newest first
  //     merged.sort((a: any, b: any) => {
  //       const da = new Date(
  //         a.created_at || a.submitted_at || a.date || 0,
  //       ).getTime();
  //       const db = new Date(
  //         b.created_at || b.submitted_at || b.date || 0,
  //       ).getTime();
  //       return db - da;
  //     });

  //     setHistoryList(merged);
  //   } catch (err: any) {
  //     console.error("charge-rate-requests error:", err);
  //     Toast.show({
  //       type: "error",
  //       text1: "Failed to load request history",
  //       text2: err?.response?.data?.message || err.message,
  //       position: "top",
  //     });
  //     setHistoryList([]);
  //   } finally {
  //     setHistoryLoading(false);
  //   }
  // }, [userId, authToken]);

  const fetchHistory = useCallback(async () => {
    try {
      setHistoryLoading(true);

      let uid = userId;
      let token = authToken;

      if (!uid || !token) {
        const userStr = await AsyncStorage.getItem("user");
        const t = await AsyncStorage.getItem("@auth_token");

        if (userStr) {
          uid = JSON.parse(userStr)?.id;
        }

        token = t;

        if (uid) setUserId(uid);
        if (token) setAuthToken(token);
      }

      if (!uid || !token) {
        throw new Error("Authentication error");
      }

      const headers = {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      };

      // Single API call — no status parameter
      const res = await axios.get(`${BASE_URL}/charge-rate-requests`, {
        params: {
          user_id: uid,
        },
        headers,
      });

      const list = res.data?.data;
      const merged = Array.isArray(list) ? list : [];

      // Newest first
      merged.sort((a: any, b: any) => {
        const da = new Date(
          a.created_at || a.submitted_at || a.date || 0,
        ).getTime();

        const db = new Date(
          b.created_at || b.submitted_at || b.date || 0,
        ).getTime();

        return db - da;
      });

      setHistoryList(merged);
    } catch (err: any) {
      console.error("charge-rate-requests error:", err);

      Toast.show({
        type: "error",
        text1: "Failed to load request history",
        text2: err?.response?.data?.message || err.message,
        position: "top",
      });

      setHistoryList([]);
    } finally {
      setHistoryLoading(false);
    }
  }, [userId, authToken]);

  const handleTopTabPress = (tab: TopTab) => {
    setTopTab(tab);
    if (tab === "history") {
      fetchHistory();
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchRates();
    if (topTab === "history") {
      fetchHistory();
    }
    setRefreshing(false);
  }, [fetchRates, fetchHistory, topTab]);

  // =========================================================
  // Helpers
  // =========================================================
  const formatMoney = (val: any) => {
    if (val === undefined || val === null || val === "") return "—";
    const num = parseFloat(String(val));
    if (isNaN(num)) return "—";
    return `$${num.toFixed(2)}`;
  };

  const getStateLabel = (code: string) => {
    if (!code) return "—";
    const key = code.toLowerCase().trim();
    return STATE_FULL_NAME[key] || key.toUpperCase();
  };

  const formatDate = (value: any) => {
    if (!value) return "—";
    const d = new Date(value);
    if (isNaN(d.getTime())) return String(value);
    return d.toLocaleDateString("en-AU", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  // Build the 5 display rows (Mon-Fri Day/Night, Sat, Sun, Pub Holiday) for any single rate record
  const buildRowsForRate = (rate: any): RateRow[] => {
    if (!rate) return [];
    return [
      {
        label: "Mon–Fri Day",
        time: "06:00 – 18:00",
        metro: rate.def_metro_mon_to_fri_day_rate,
        regional: rate.def_reg_mon_to_fri_day_rate,
      },
      {
        label: "Mon–Fri Night",
        time: "18:00 – 06:00",
        metro: rate.def_metro_mon_to_fri_night_rate,
        regional: rate.def_reg_mon_to_fri_night_rate,
      },
      {
        label: "Saturday",
        time: "All day",
        metro: rate.def_metro_sat_day_rate,
        regional: rate.def_reg_sat_day_rate,
      },
      {
        label: "Sunday",
        time: "All day",
        metro: rate.def_metro_sun_day_rate,
        regional: rate.def_reg_sun_day_rate,
      },
      {
        label: "Public Holiday",
        time: "All day",
        metro: rate.def_metro_pub_holi_day_rate,
        regional: rate.def_reg_pub_holi_day_rate,
      },
    ];
  };

  const sortedRatesList = [...ratesList].sort((a, b) =>
    getStateLabel(String(a.state || "")).localeCompare(
      getStateLabel(String(b.state || "")),
    ),
  );

  const getAllowedStateCodes = (): string[] => {
    if (!userProfile) return [];

    if (userProfile.states_allowed) {
      try {
        const parsed = JSON.parse(userProfile.states_allowed);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed
            .map((code: string) => String(code).toLowerCase().trim())
            .filter(Boolean);
        }
      } catch {
        const code = String(userProfile.states_allowed).toLowerCase().trim();
        if (code) return [code];
      }
    }

    if (userProfile.state) {
      const code = String(userProfile.state).toLowerCase().trim();
      if (code) return [code];
    }

    return [];
  };

  const hasRatesForState = useCallback(
    (code: string) => {
      return ratesList.some(
        (r) => String(r.state || "").toLowerCase() === code.toLowerCase(),
      );
    },
    [ratesList],
  );

  const allowedCodesForBadge = getAllowedStateCodes();
  const missingStatesCount = allowedCodesForBadge.filter(
    (c) => !hasRatesForState(c),
  ).length;

  // Build a stateRates map covering every allowed state, pre-filled from
  // the currently active rate for that state (if any). Used as the base
  // for both the generic "Request Rate Update" flow and the resubmit flow.
  const buildInitialRatesForCodes = (
    codes: string[],
  ): Record<string, RateFormShape> => {
    const initial: Record<string, RateFormShape> = {};
    codes.forEach((code) => {
      const existing = ratesList.find(
        (r) => String(r.state || "").toLowerCase() === code,
      );
      initial[code] = existing
        ? mapRecordToRateForm(existing)
        : emptyRateForm();
    });
    return initial;
  };

  // =========================================================
  // Request modal — state selection is explicit.
  // Only states the user actually checks end up in the payload,
  // so previously-approved states are never silently resubmitted.
  // =========================================================
  const openRequestModal = (preferredState?: string) => {
    const codes = getAllowedStateCodes();
    if (codes.length === 0) {
      Toast.show({
        type: "error",
        text1: "No state assigned",
        text2: "Contact your admin to assign a state before requesting rates.",
        position: "top",
      });
      return;
    }

    let defaultSelected: string[];

    if (preferredState) {
      const code = preferredState.toLowerCase();
      if (!codes.includes(code)) {
        Toast.show({
          type: "error",
          text1: "State not allowed",
          text2: "This state is not assigned to your profile.",
          position: "top",
        });
        return;
      }
      defaultSelected = [code];
    } else {
      // Only pre-select states that don't have active rates yet.
      // If every state already has rates, start with nothing selected
      // so the user has to explicitly pick which state(s) to update.
      defaultSelected = codes.filter((c) => !hasRatesForState(c));
    }

    setStateRates(buildInitialRatesForCodes(codes));
    setSelectedStates(defaultSelected);
    setActiveStateTab(defaultSelected[0] || "");
    setAdminNotes("");
    setModalVisible(true);
  };

  // Opens the same request modal, pre-filled from a rejected request's own
  // rates (not the current active rates), so the contractor edits and
  // resubmits exactly what was rejected for that one state.
  const openResubmitModal = (item: any) => {
    const code = String(item?.state || "").toLowerCase();
    if (!code) return;

    const allowed = getAllowedStateCodes();
    const codes = allowed.includes(code) ? allowed : [...allowed, code];

    const initialRates = buildInitialRatesForCodes(codes);
    initialRates[code] = mapRecordToRateForm(item);

    setStateRates(initialRates);
    setSelectedStates([code]);
    setActiveStateTab(code);
    setAdminNotes(item?.notes ?? item?.admin_note ?? item?.admin_notes ?? "");
    setModalVisible(true);
  };

  // Toggling a chip adds/removes that state from the payload selection.
  // Checking a state also makes it the active tab being edited.
  const toggleStateInclusion = (code: string) => {
    setSelectedStates((prev) => {
      const included = prev.includes(code);
      const next = included ? prev.filter((c) => c !== code) : [...prev, code];

      if (included) {
        // was removed — if it was the active tab, move to next available
        setActiveStateTab((current) =>
          current === code ? next[0] || "" : current,
        );
      } else {
        setActiveStateTab(code);
      }

      return next;
    });
  };

  const updateStateField = (field: keyof RateFormShape, value: string) => {
    if (!activeStateTab) return;
    setStateRates((prev) => ({
      ...prev,
      [activeStateTab]: {
        ...(prev[activeStateTab] || emptyRateForm()),
        [field]: value,
      },
    }));
  };

  const applyToAllStates = () => {
    if (!activeStateTab || selectedStates.length <= 1) return;
    setStateRates((prev) => {
      const source = prev[activeStateTab] || emptyRateForm();
      const updated: Record<string, RateFormShape> = { ...prev };
      selectedStates.forEach((s) => {
        updated[s] = { ...source };
      });
      return updated;
    });
    Toast.show({
      type: "success",
      text1: "Applied to selected states",
      text2: `Rates from ${getStateLabel(
        activeStateTab,
      )} copied to all selected states.`,
      position: "top",
    });
  };

  const handleRequestSubmit = async () => {
    try {
      if (selectedStates.length === 0) {
        Toast.show({
          type: "error",
          text1: "No state selected",
          text2: "Select at least one state to submit a rate request.",
          position: "top",
        });
        return;
      }

      setSubmitting(true);

      const token = authToken || (await AsyncStorage.getItem("@auth_token"));
      const userStr = await AsyncStorage.getItem("user");
      if (!userStr || !token) throw new Error("Authentication error");

      const user = JSON.parse(userStr);

      const toNum = (v: string) => {
        const n = parseFloat(v);
        return isNaN(n) ? 0 : n;
      };

      // Only iterate selectedStates — states that were merely pre-loaded
      // into stateRates but never checked are never sent.
      const rates = selectedStates.map((stateCode) => {
        const r = stateRates[stateCode] || emptyRateForm();
        return {
          title: `${getStateLabel(stateCode)} My Charge Rates`,
          state: stateCode,
          def_metro_mon_to_fri_day_rate: toNum(r.metro_mon_fri_day),
          def_reg_mon_to_fri_day_rate: toNum(r.reg_mon_fri_day),
          def_metro_mon_to_fri_night_rate: toNum(r.metro_mon_fri_night),
          def_reg_mon_to_fri_night_rate: toNum(r.reg_mon_fri_night),
          def_metro_sat_day_rate: toNum(r.metro_sat),
          def_reg_sat_day_rate: toNum(r.reg_sat),
          def_metro_sat_night_rate: toNum(r.metro_sat),
          def_reg_sat_night_rate: toNum(r.reg_sat),
          def_metro_sun_day_rate: toNum(r.metro_sun),
          def_reg_sun_day_rate: toNum(r.reg_sun),
          def_metro_sun_night_rate: toNum(r.metro_sun),
          def_reg_sun_night_rate: toNum(r.reg_sun),
          def_metro_pub_holi_day_rate: toNum(r.metro_pub),
          def_reg_pub_holi_day_rate: toNum(r.reg_pub),
          def_metro_pub_holi_night_rate: toNum(r.metro_pub),
          def_reg_pub_holi_night_rate: toNum(r.reg_pub),
        };
      });

      const payload = {
        user_id: user?.id,
        rates,
        notes: adminNotes,
      };

      console.log(
        "📤 request-charge-rate payload:",
        JSON.stringify(payload, null, 2),
      );

      await axios.post(`${BASE_URL}/request-charge-rate`, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      });

      Toast.show({
        type: "success",
        text1: "Request Submitted",
        text2: "Your rate update request has been sent for admin review.",
        position: "top",
      });

      setModalVisible(false);
      fetchRates();
      if (topTab === "history") {
        fetchHistory();
      }
    } catch (err: any) {
      console.log("❌ request-charge-rate error:", err?.response?.data || err);

      const apiMessage =
        err?.response?.data?.message ||
        err?.response?.data?.errors?.state?.[0] ||
        err?.response?.data?.errors?.rates?.[0] ||
        err?.message ||
        "Something went wrong";

      Toast.show({
        type: "error",
        text1: "Submission Failed",
        text2: apiMessage,
        position: "top",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleBackPress = () => {
    const allowedStates = getAllowedStateCodes();

    const allStatesHaveRates =
      allowedStates.length > 0 &&
      allowedStates.every((state) => hasRatesForState(state));

    if (allStatesHaveRates) {
      navigation.dispatch(
        CommonActions.navigate({
          name: "MainTabs",
          params: {
            screen: "Profile",
          },
        }),
      );

      return;
    }

    // If some states still don't have rates,
    // continue back to Documents.
    navigation.goBack();
  };

  const activeRates = stateRates[activeStateTab] || emptyRateForm();
  const allowedCodesForModal = getAllowedStateCodes();

  const openViewModal = (item: any) => {
    setViewModalData(item);
    setViewModalVisible(true);
  };

  const statusPillColors = (status: string) => {
    const s = (status || "").toLowerCase();
    if (s === "approved")
      return { color: COLORS.success, bg: "rgba(52,200,138,0.12)" };
    if (s === "rejected") return { color: COLORS.danger, bg: COLORS.dangerBg };
    return { color: COLORS.warning, bg: COLORS.warningBg };
  };

  const statusIcon = (status: string) => {
    const s = (status || "").toLowerCase();
    if (s === "approved") return CheckCircle2;
    if (s === "rejected") return XCircle;
    return Clock;
  };

  // Shared RefreshControl instance so pull-to-refresh behaves identically
  // whichever ScrollView (empty state or rates list) is currently mounted.
  const refreshControl = (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      tintColor={COLORS.primary}
      colors={[COLORS.primary]}
    />
  );

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      <LinearGradient
        colors={[COLORS.heroBg1, COLORS.heroBg2]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.heroInner}>
          <View style={styles.headerRow}>
            <TouchableOpacity
              onPress={handleBackPress}
              style={styles.backBtn}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <ChevronLeft size={16} color="#fff" />
            </TouchableOpacity>

            <Text style={styles.headerTitle}>My Charge Rates</Text>

            {!loading && (
              <TouchableOpacity
                style={styles.headerStateBtn}
                onPress={() => openRequestModal()}
                activeOpacity={0.85}
              >
                <Send size={13} color="#fff" style={{ marginRight: 6 }} />
                <Text style={styles.headerStateBtnText}>
                  {missingStatesCount > 0
                    ? "Request Rate Update"
                    : "Manage States"}
                </Text>
                {missingStatesCount > 0 && (
                  <View style={styles.headerStateBadge}>
                    <Text style={styles.headerStateBadgeText}>
                      {missingStatesCount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            )}
          </View>

          <Text style={styles.headerSub}>
            View your approved charge rates by state, including metro and
            regional rates.
          </Text>
        </View>
      </LinearGradient>

      {/* Top segmented tabs: Active Rates / Request History */}
      <View style={styles.topTabsRow}>
        <TouchableOpacity
          style={[
            styles.topTabBtn,
            topTab === "active" && styles.topTabBtnActive,
          ]}
          onPress={() => handleTopTabPress("active")}
          activeOpacity={0.85}
        >
          <Zap
            size={14}
            color={topTab === "active" ? COLORS.primary : COLORS.textSecondary}
            style={{ marginRight: 6 }}
          />
          <Text
            style={[
              styles.topTabBtnText,
              topTab === "active" && styles.topTabBtnTextActive,
            ]}
          >
            Active Rates
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.topTabBtn,
            topTab === "history" && styles.topTabBtnActive,
          ]}
          onPress={() => handleTopTabPress("history")}
          activeOpacity={0.85}
        >
          <HistoryIcon
            size={14}
            color={topTab === "history" ? COLORS.primary : COLORS.textSecondary}
            style={{ marginRight: 6 }}
          />
          <Text
            style={[
              styles.topTabBtnText,
              topTab === "history" && styles.topTabBtnTextActive,
            ]}
          >
            Archived History
          </Text>
        </TouchableOpacity>
      </View>

      {topTab === "active" ? (
        loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Loading rates…</Text>
          </View>
        ) : ratesList.length === 0 ? (
          // Wrapped in a ScrollView (with flexGrow so it still centers) so
          // RefreshControl has something scrollable to attach to — plain
          // Views never fire onRefresh, which is why pull-to-refresh didn't
          // work on this screen before.
          <ScrollView
            contentContainerStyle={styles.emptyStateContainer}
            refreshControl={refreshControl}
          >
            <View style={styles.emptyStateCard}>
              <View style={styles.emptyIcon}>
                <Clock size={28} color={COLORS.primary} />
              </View>

              <Text style={styles.emptyTitle}>No Rates Assigned Yet</Text>

              <View style={styles.infoBox}>
                <View style={styles.infoDot} />

                <Text style={styles.infoText}>
                  You currently do not have any active rates assigned to your
                  profile. Please request charge rates for states you selected
                  in profile section.
                </Text>
              </View>

              <TouchableOpacity
                style={styles.emptyRequestButton}
                onPress={() => openRequestModal()}
                activeOpacity={0.85}
              >
                <Plus size={18} color="#fff" />
                <Text style={styles.emptyRequestButtonText}>
                  Request Charge Rates
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        ) : (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={{ paddingBottom: 40 }}
            refreshControl={refreshControl}
          >
            {/* Rates Tables — one card per state that has rates */}
            {sortedRatesList.map((rate) => {
              const stateCode = String(rate.state || "").toLowerCase();
              const rows = buildRowsForRate(rate);
              return (
                <View
                  key={String(rate.id ?? stateCode)}
                  style={styles.tableCard}
                >
                  <View style={styles.tableHeader}>
                    <View style={styles.tableHeaderLeft}>
                      <View style={styles.clockIcon}>
                        <MapPin size={16} color={COLORS.primary} />
                      </View>

                      <View style={{ flex: 1 }}>
                        <Text style={styles.tableTitle}>
                          {getStateLabel(stateCode)}
                        </Text>
                        <Text style={styles.tableSub} numberOfLines={1}>
                          Metro vs Regional, by time slot
                        </Text>
                      </View>

                      {rate.status ? (
                        <View
                          style={[
                            styles.stateStatusPill,
                            rate.status === "active"
                              ? styles.stateStatusPillActive
                              : styles.stateStatusPillPending,
                          ]}
                        >
                          <Text
                            style={[
                              styles.stateStatusPillText,
                              {
                                color:
                                  rate.status === "active"
                                    ? COLORS.success
                                    : COLORS.warning,
                              },
                            ]}
                          >
                            {String(rate.status).charAt(0).toUpperCase() +
                              String(rate.status).slice(1)}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  </View>

                  {/* colHeader + rate rows */}
                  <View style={styles.colHeader}>
                    <Text style={[styles.colHeaderText, { flex: 1.4 }]}>
                      Time Slot
                    </Text>
                    <Text
                      style={[
                        styles.colHeaderText,
                        { width: 90, textAlign: "right" },
                      ]}
                    >
                      METRO
                    </Text>
                    <Text
                      style={[
                        styles.colHeaderText,
                        { width: 90, textAlign: "right" },
                      ]}
                    >
                      REGIONAL
                    </Text>
                  </View>

                  {rows.map((row, idx) => (
                    <View
                      key={`${stateCode}-${row.label}-${idx}`}
                      style={[
                        styles.rateRow,
                        idx === rows.length - 1 && { borderBottomWidth: 0 },
                      ]}
                    >
                      <View style={{ flex: 1.4 }}>
                        <Text style={styles.rateLabel}>{row.label}</Text>
                        <Text style={styles.rateTime}>{row.time}</Text>
                      </View>
                      <Text style={[styles.rateValue, { width: 90 }]}>
                        {formatMoney(row.metro)}
                      </Text>
                      <Text style={[styles.rateValue, { width: 90 }]}>
                        {formatMoney(row.regional)}
                      </Text>
                    </View>
                  ))}
                </View>
              );
            })}
          </ScrollView>
        )
      ) : (
        // ===================== REQUEST / ARCHIVED HISTORY TAB =====================
        // No status sub-tabs — every request (pending / approved / rejected)
        // is shown as one card with its own status badge. Rejected cards
        // additionally get a "Resubmit" button.
        <View style={{ flex: 1 }}>
          {historyLoading ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.loadingText}>Loading requests…</Text>
            </View>
          ) : historyList.length === 0 ? (
            <ScrollView
              contentContainerStyle={styles.emptyStateContainer}
              refreshControl={refreshControl}
            >
              <View style={styles.emptyStateCard}>
                <View style={styles.emptyIcon}>
                  <HistoryIcon size={28} color={COLORS.primary} />
                </View>
                <Text style={styles.emptyTitle}>No Requests Yet</Text>
                <Text style={styles.emptyDescription}>
                  Your rate update requests will appear here once you submit
                  one.
                </Text>
              </View>
            </ScrollView>
          ) : (
            <ScrollView
              style={styles.scroll}
              contentContainerStyle={{ paddingTop: 12, paddingBottom: 40 }}
              refreshControl={refreshControl}
            >
              {historyList.map((item, idx) => {
                const stateCode = String(item.state || "").toLowerCase();
                const submitted =
                  item.created_at ||
                  item.submitted_at ||
                  item.date ||
                  item.updated_at;
                const note = item.notes ?? item.admin_note ?? item.admin_notes;
                const status = String(item.status || "pending").toLowerCase();
                const pill = statusPillColors(status);
                const StatusIcon = statusIcon(status);
                const isRejected = status === "rejected";

                return (
                  <View
                    key={String(item.id ?? `${stateCode}-${idx}`)}
                    style={styles.historyRowCard}
                  >
                    <View style={styles.historyRowTop}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.historyRowState}>
                          {getStateLabel(stateCode)}
                        </Text>
                        <Text style={styles.historyRowDate}>
                          Submitted {formatDate(submitted)}
                        </Text>
                      </View>

                      <View
                        style={[
                          styles.stateStatusPill,
                          styles.stateStatusPillRow,
                          { backgroundColor: pill.bg },
                        ]}
                      >
                        <StatusIcon size={11} color={pill.color} />
                        <Text
                          style={[
                            styles.stateStatusPillText,
                            { color: pill.color, marginLeft: 4 },
                          ]}
                        >
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </Text>
                      </View>
                    </View>

                    {note ? (
                      <Text style={styles.historyRowNote} numberOfLines={2}>
                        {note}
                      </Text>
                    ) : null}

                    <View style={styles.historyRowActions}>
                      <TouchableOpacity
                        style={styles.historyViewBtn}
                        onPress={() => openViewModal(item)}
                        activeOpacity={0.85}
                      >
                        <Eye
                          size={13}
                          color={COLORS.primary}
                          style={{ marginRight: 6 }}
                        />
                        <Text style={styles.historyViewBtnText}>View</Text>
                      </TouchableOpacity>

                      {isRejected && (
                        <TouchableOpacity
                          style={styles.historyResubmitBtn}
                          onPress={() => openResubmitModal(item)}
                          activeOpacity={0.85}
                        >
                          <RotateCcw
                            size={13}
                            color="#fff"
                            style={{ marginRight: 6 }}
                          />
                          <Text style={styles.historyResubmitBtnText}>
                            Resubmit
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          )}
        </View>
      )}

      {/* ===================== Request Rate Update Modal ===================== */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingBase>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={styles.modalTitle}>Request Rate Update</Text>
                  <Text style={styles.modalSubtitle}>
                    Submit your proposed charge rates for admin review &
                    approval.
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setModalVisible(false)}
                  style={styles.closeBtn}
                >
                  <X size={20} color={COLORS.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.modalScroll}
                contentContainerStyle={{ paddingBottom: 20 }}
                showsVerticalScrollIndicator={false}
              >
                {/* State selector — checkbox chips. Only checked states are
                    included in the submit payload. */}
                <View style={styles.stateSelectCard}>
                  <View style={styles.stateSelectHeader}>
                    <View style={styles.stateSelectHeaderLeft}>
                      <MapPin size={16} color={COLORS.primary} />
                      <Text style={styles.stateSelectTitle}>
                        Select State(s) to Request
                      </Text>
                    </View>

                    {selectedStates.length > 1 && (
                      <TouchableOpacity
                        style={styles.applyAllBtn}
                        onPress={applyToAllStates}
                      >
                        <Copy
                          size={13}
                          color={COLORS.primary}
                          style={{ marginRight: 6 }}
                        />
                        <Text style={styles.applyAllBtnText}>
                          Apply to Selected
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  <View style={styles.stateTabsRow}>
                    {allowedCodesForModal.map((code) => {
                      const included = selectedStates.includes(code);
                      const active = code === activeStateTab && included;
                      const hasRates = hasRatesForState(code);
                      return (
                        <TouchableOpacity
                          key={code}
                          style={[
                            styles.stateTab,
                            active && styles.stateTabActive,
                            !included && styles.stateTabUnselected,
                          ]}
                          onPress={() => toggleStateInclusion(code)}
                        >
                          {included ? (
                            <CheckCircle2
                              size={13}
                              color={COLORS.primary}
                              style={{ marginRight: 6 }}
                            />
                          ) : (
                            <Circle
                              size={13}
                              color={COLORS.textMuted}
                              style={{ marginRight: 6 }}
                            />
                          )}
                          <Text
                            style={[
                              styles.stateTabText,
                              active && styles.stateTabTextActive,
                              !included && { color: COLORS.textMuted },
                            ]}
                          >
                            {getStateLabel(code)}
                          </Text>

                          {hasRates ? (
                            <View
                              style={[
                                styles.stateStatusBadge,
                                styles.stateStatusBadgeSuccess,
                              ]}
                            >
                              <CheckCircle2 size={10} color={COLORS.success} />
                              <Text
                                style={[
                                  styles.stateStatusBadgeText,
                                  { color: COLORS.success },
                                ]}
                              >
                                Has rates
                              </Text>
                            </View>
                          ) : (
                            <View
                              style={[
                                styles.stateStatusBadge,
                                styles.stateStatusBadgeWarning,
                              ]}
                            >
                              <AlertCircle size={10} color={COLORS.warning} />
                              <Text
                                style={[
                                  styles.stateStatusBadgeText,
                                  { color: COLORS.warning },
                                ]}
                              >
                                No rates
                              </Text>
                            </View>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <Text style={styles.editingStateNote}>
                    {activeStateTab
                      ? `You are currently editing rates for ${getStateLabel(
                          activeStateTab,
                        )}`
                      : "Select at least one state above to begin"}
                  </Text>
                </View>

                {/* Rate Input Blocks — only shown once a state is active */}
                {activeStateTab ? (
                  <View style={styles.formRatesContainer}>
                    <View style={styles.rateCardFull}>
                      <RateInputCard
                        title="Mon–Fri Day"
                        time="06:00–18:00"
                        metroValue={activeRates.metro_mon_fri_day}
                        regValue={activeRates.reg_mon_fri_day}
                        onMetroChange={(v) =>
                          updateStateField("metro_mon_fri_day", v)
                        }
                        onRegChange={(v) =>
                          updateStateField("reg_mon_fri_day", v)
                        }
                      />
                    </View>

                    <View style={styles.rateCardFull}>
                      <RateInputCard
                        title="Mon–Fri Night"
                        time="18:00–06:00"
                        metroValue={activeRates.metro_mon_fri_night}
                        regValue={activeRates.reg_mon_fri_night}
                        onMetroChange={(v) =>
                          updateStateField("metro_mon_fri_night", v)
                        }
                        onRegChange={(v) =>
                          updateStateField("reg_mon_fri_night", v)
                        }
                      />
                    </View>

                    <View style={styles.rateCardFull}>
                      <RateInputCard
                        title="Saturday"
                        time="All day"
                        metroValue={activeRates.metro_sat}
                        regValue={activeRates.reg_sat}
                        onMetroChange={(v) => updateStateField("metro_sat", v)}
                        onRegChange={(v) => updateStateField("reg_sat", v)}
                      />
                    </View>

                    <View style={styles.rateCardFull}>
                      <RateInputCard
                        title="Sunday"
                        time="All day"
                        metroValue={activeRates.metro_sun}
                        regValue={activeRates.reg_sun}
                        onMetroChange={(v) => updateStateField("metro_sun", v)}
                        onRegChange={(v) => updateStateField("reg_sun", v)}
                      />
                    </View>

                    <View style={styles.rateCardFull}>
                      <RateInputCard
                        title="Public Holiday"
                        time="All day"
                        metroValue={activeRates.metro_pub}
                        regValue={activeRates.reg_pub}
                        onMetroChange={(v) => updateStateField("metro_pub", v)}
                        onRegChange={(v) => updateStateField("reg_pub", v)}
                      />
                    </View>
                  </View>
                ) : null}

                {/* Notes */}
                <View style={styles.formSection}>
                  <Text style={styles.formSectionTitle}>
                    Notes for Admin (Optional)
                  </Text>
                  <TextInput
                    style={styles.textArea}
                    placeholder="Tell the admin why you're requesting these rate changes..."
                    placeholderTextColor={COLORS.textMuted}
                    multiline
                    numberOfLines={4}
                    value={adminNotes}
                    onChangeText={setAdminNotes}
                  />
                </View>
              </ScrollView>

              {/* Modal Footer */}
              <View style={styles.modalFooter}>
                <View style={styles.modalFooterRow}>
                  <View style={styles.modalFooterNoteRow}>
                    <Shield
                      size={14}
                      color={COLORS.textMuted}
                      style={{ marginRight: 6 }}
                    />
                    <Text style={styles.modalFooterNote}>
                      Your request will be reviewed by the Staffoo admin team.
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.submitBtnModal,
                      selectedStates.length === 0 && { opacity: 0.5 },
                    ]}
                    onPress={handleRequestSubmit}
                    disabled={submitting || selectedStates.length === 0}
                  >
                    {submitting ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Send
                          size={16}
                          color="#fff"
                          style={{ marginRight: 6 }}
                        />
                        <Text style={styles.submitBtnText}>
                          Save and Submit
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </KeyboardAvoidingBase>
      </Modal>

      <Modal
        visible={viewModalVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setViewModalVisible(false)}
      >
        <View style={styles.viewModalOverlay}>
          <View style={styles.viewModalCard}>
            {/* Fixed header — does not scroll */}
            <LinearGradient
              colors={[COLORS.heroBg1, COLORS.primary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.viewModalHeader}
            >
              <Text style={styles.viewModalTitle} numberOfLines={1}>
                Requested Rates —{" "}
                {getStateLabel(String(viewModalData?.state || ""))}
              </Text>
              <TouchableOpacity
                onPress={() => setViewModalVisible(false)}
                style={styles.viewModalCloseBtn}
              >
                <X size={18} color="#fff" />
              </TouchableOpacity>
            </LinearGradient>

            {/* Only this area scrolls */}
            <ScrollView
              style={styles.viewModalBody}
              contentContainerStyle={styles.viewModalBodyContent}
              showsVerticalScrollIndicator={false}
              bounces={false}
              nestedScrollEnabled
            >
              <View style={styles.viewModalMetaRow}>
                {(() => {
                  const status = String(
                    viewModalData?.status || "pending",
                  ).toLowerCase();
                  const pill = statusPillColors(status);
                  return (
                    <View
                      style={[
                        styles.viewModalStatusPill,
                        { backgroundColor: pill.bg },
                      ]}
                    >
                      <CheckCircle2 size={12} color={pill.color} />
                      <Text
                        style={[
                          styles.viewModalStatusPillText,
                          { color: pill.color },
                        ]}
                      >
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </Text>
                    </View>
                  );
                })()}
                <Text style={styles.viewModalSubmittedText}>
                  Submitted on{" "}
                  {formatDate(
                    viewModalData?.created_at ||
                      viewModalData?.submitted_at ||
                      viewModalData?.date,
                  )}
                </Text>
              </View>

              {(viewModalData?.notes ||
                viewModalData?.admin_note ||
                viewModalData?.admin_notes) && (
                <View style={styles.viewModalNoteBox}>
                  <Text style={styles.viewModalNoteLabel}>Admin Note</Text>
                  <Text style={styles.viewModalNoteText}>
                    {viewModalData?.notes ||
                      viewModalData?.admin_note ||
                      viewModalData?.admin_notes}
                  </Text>
                </View>
              )}

              <View style={styles.viewModalTable}>
                <View style={styles.viewModalTableHeaderRow}>
                  <Text
                    style={[styles.viewModalTableHeaderText, { flex: 1.4 }]}
                  >
                    Time Slot
                  </Text>
                  <Text
                    style={[
                      styles.viewModalTableHeaderText,
                      { width: 90, textAlign: "right" },
                    ]}
                  >
                    Metro ($)
                  </Text>
                  <Text
                    style={[
                      styles.viewModalTableHeaderText,
                      { width: 90, textAlign: "right" },
                    ]}
                  >
                    Regional ($)
                  </Text>
                </View>

                {buildRowsForRate(viewModalData).map((row, idx, arr) => (
                  <View
                    key={`${row.label}-${idx}`}
                    style={[
                      styles.viewModalTableRow,
                      idx === arr.length - 1 && { borderBottomWidth: 0 },
                    ]}
                  >
                    <View style={{ flex: 1.4 }}>
                      <Text style={styles.viewModalRowLabel}>{row.label}</Text>
                      <Text style={styles.viewModalRowTime}>{row.time}</Text>
                    </View>
                    <Text style={[styles.viewModalRowValueDark, { width: 90 }]}>
                      {formatMoney(row.metro)}
                    </Text>
                    <Text style={[styles.viewModalRowValueTeal, { width: 90 }]}>
                      {formatMoney(row.regional)}
                    </Text>
                  </View>
                ))}
              </View>

              {String(viewModalData?.status || "").toLowerCase() ===
                "rejected" && (
                <TouchableOpacity
                  style={styles.viewModalResubmitBtn}
                  onPress={() => {
                    setViewModalVisible(false);
                    openResubmitModal(viewModalData);
                  }}
                  activeOpacity={0.85}
                >
                  <RotateCcw
                    size={15}
                    color="#fff"
                    style={{ marginRight: 8 }}
                  />
                  <Text style={styles.viewModalResubmitBtnText}>
                    Resubmit This Request
                  </Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function KeyboardAvoidingBase({ children }: { children: React.ReactNode }) {
  if (Platform.OS === "ios") {
    return (
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        {children}
      </KeyboardAvoidingView>
    );
  }
  return <View style={{ flex: 1 }}>{children}</View>;
}

type RateInputCardProps = {
  title: string;
  time: string;
  metroValue: string;
  regValue: string;
  onMetroChange: (v: string) => void;
  onRegChange: (v: string) => void;
};

function RateInputCard({
  title,
  time,
  metroValue,
  regValue,
  onMetroChange,
  onRegChange,
}: RateInputCardProps) {
  return (
    <View style={styles.rateInputCard}>
      <View style={styles.rateCardHeader}>
        <Text style={styles.rateCardTitle}>{title}</Text>
        <Text style={styles.rateCardTime}>{time}</Text>
      </View>

      <View style={styles.rateInputsRow}>
        <View style={styles.rateInputBox}>
          <Text style={styles.subInputLabel}>METRO</Text>
          <TextInput
            style={styles.textInputRate}
            placeholder="$ 0.00"
            placeholderTextColor={COLORS.textMuted}
            keyboardType="numeric"
            value={metroValue}
            onChangeText={onMetroChange}
          />
        </View>

        <View style={styles.rateInputBox}>
          <Text style={styles.subInputLabel}>REGIONAL</Text>
          <TextInput
            style={styles.textInputRate}
            placeholder="$ 0.00"
            placeholderTextColor={COLORS.textMuted}
            keyboardType="numeric"
            value={regValue}
            onChangeText={onRegChange}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingTop: 20,
  },
  header: {
    paddingTop: Platform.OS === "ios" ? 5 : 26,
    paddingBottom: 15,
    paddingHorizontal: Platform.OS === "ios" ? 5 : 10,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  heroInner: {
    width: "100%",
    paddingHorizontal: 10,
    paddingBottom: Platform.OS === "ios" ? 20 : 5,
    paddingTop: Platform.OS === "ios" ? 5 : 10,
  },

  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  scroll: {
    flex: 1,
  },

  // ---- Top tabs ----
  topTabsRow: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginTop: 14,
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 4,
    gap: 4,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  topTabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 10,
  },
  topTabBtnActive: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
  },
  topTabBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.textSecondary,
  },
  topTabBtnTextActive: {
    color: COLORS.primary,
  },

  historyRowCard: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    padding: 14,
  },
  historyRowTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  historyRowState: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.text,
  },
  historyRowDate: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  historyRowNote: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 10,
    lineHeight: 17,
  },
  historyRowActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  historyViewBtn: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  historyViewBtnText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: "700",
  },
  historyResubmitBtn: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: COLORS.danger,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  historyResubmitBtnText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },

  tableCard: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    overflow: "hidden",
  },

  clockIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.primaryGlow,
    alignItems: "center",
    justifyContent: "center",
  },
  tableTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.text,
  },

  colHeader: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  colHeaderText: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.textMuted,
    letterSpacing: 0.5,
  },
  rateRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  rateLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
  },
  rateTime: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  rateValue: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.primary,
    textAlign: "right",
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: "90%",
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: COLORS.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  modalScroll: {
    flex: 1,
    padding: 16,
  },
  stateSelectCard: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    marginBottom: 16,
  },
  stateSelectHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    flexWrap: "wrap",
    gap: 8,
  },
  stateSelectHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  stateSelectTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.text,
  },
  applyAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  applyAllBtnText: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: "700",
  },
  stateTabsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  stateTab: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexGrow: 1,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 10,
    flexWrap: "wrap",
    gap: 6,
  },
  stateTabActive: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
  },
  stateTabUnselected: {
    opacity: 0.55,
  },
  stateTabText: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.textSecondary,
  },
  stateTabTextActive: {
    color: COLORS.primary,
  },
  stateStatusBadge: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
    gap: 4,
  },
  stateStatusBadgeSuccess: {
    backgroundColor: "rgba(52,200,138,0.12)",
  },
  stateStatusBadgeWarning: {
    backgroundColor: COLORS.warningBg,
  },
  stateStatusBadgeText: {
    fontSize: 9,
    fontWeight: "700",
  },
  editingStateNote: {
    fontSize: 11,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginTop: 10,
  },
  formSection: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    marginBottom: 16,
  },
  formSectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.textSecondary,
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  textArea: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 10,
    padding: 12,
    color: COLORS.text,
    fontSize: 13,
    textAlignVertical: "top",
    minHeight: 80,
  },

  modalFooterButtons: {
    flexDirection: "row",
    gap: 10,
  },
  cancelBtnModal: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  cancelBtnText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: "600",
  },

  formRatesContainer: {
    marginBottom: 16,
  },
  rateCardFull: {
    width: "100%",
    marginBottom: 10,
  },
  rateInputCard: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  rateCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  rateCardTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.text,
    flexShrink: 1,
  },
  rateCardTime: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginLeft: 4,
  },
  rateInputsRow: {
    flexDirection: "row",
    gap: 8,
  },
  rateInputBox: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    padding: 8,
  },
  subInputLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: COLORS.textMuted,
    marginBottom: 4,
  },
  textInputRate: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "700",
    padding: 0,
  },
  headerContent: {
    paddingTop: 4,
    paddingBottom: 4,
  },

  headerBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,169,157,0.12)",
    borderWidth: 1,
    borderColor: "rgba(0,169,157,0.22)",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 10,
  },

  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
    marginRight: 7,
  },

  headerLabel: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.1,
  },

  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },

  emptyStateContainer: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },

  emptyStateCard: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: COLORS.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    paddingHorizontal: 22,
    paddingVertical: 28,
    alignItems: "center",
  },

  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: COLORS.primaryGlow,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },

  emptyTitle: {
    color: COLORS.text,
    fontSize: 19,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 8,
  },

  emptyDescription: {
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
    maxWidth: 330,
  },

  infoBox: {
    width: "100%",
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 14,
    padding: 13,
    marginTop: 20,
    marginBottom: 20,
  },

  infoDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
    marginTop: 6,
    marginRight: 10,
  },

  infoText: {
    flex: 1,
    color: COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },

  emptyRequestButton: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 14,
  },

  emptyRequestButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800",
    marginLeft: 7,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },

  backBtn: {
    width: 27,
    height: 27,
    borderRadius: 7,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  headerTitle: {
    flex: 1,
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "800",
  },

  headerStateBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginLeft: 8,
  },
  headerStateBtnText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  headerStateBadge: {
    marginLeft: 6,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.9)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  headerStateBadgeText: {
    color: COLORS.primary,
    fontSize: 9,
    fontWeight: "800",
  },

  headerSub: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  tableHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  tableHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  stateStatusPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  stateStatusPillRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  stateStatusPillActive: {
    backgroundColor: "rgba(52,200,138,0.12)",
  },
  stateStatusPillPending: {
    backgroundColor: COLORS.warningBg,
  },
  stateStatusPillText: {
    fontSize: 10,
    fontWeight: "700",
  },
  tableSub: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  modalFooter: {
    padding: 16,
    backgroundColor: COLORS.card,
    borderTopWidth: 1,
    borderTopColor: COLORS.cardBorder,
  },
  modalFooterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },

  submitBtnModal: {
    flexDirection: "row",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  submitBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  modalFooterNoteRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  modalFooterNote: {
    flex: 1,
    fontSize: 11,
    color: "#727272",
    lineHeight: 16,
  },

  viewModalTitle: {
    flex: 1,
    color: "#fff",
    fontSize: 17,
    fontWeight: "800",
    marginRight: 10,
  },
  viewModalCloseBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },

  viewModalMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
    flexWrap: "wrap",
  },
  viewModalStatusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  viewModalStatusPillText: {
    fontSize: 11,
    fontWeight: "700",
  },
  viewModalSubmittedText: {
    fontSize: 12,
    color: "#5B6B7A",
  },
  viewModalNoteBox: {
    backgroundColor: "#E9EDF1",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  viewModalNoteLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: "#1F2A33",
    marginBottom: 2,
  },
  viewModalNoteText: {
    fontSize: 12,
    color: "#5B6B7A",
  },
  viewModalTable: {
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E3E7EB",
    overflow: "hidden",
  },
  viewModalTableHeaderRow: {
    flexDirection: "row",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#E3E7EB",
  },
  viewModalTableHeaderText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#8895A2",
    letterSpacing: 0.4,
  },
  viewModalTableRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#E3E7EB",
  },
  viewModalRowLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1F2A33",
  },
  viewModalRowTime: {
    fontSize: 11,
    color: "#8895A2",
    marginTop: 2,
  },
  viewModalRowValueDark: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1F2A33",
    textAlign: "right",
  },
  viewModalRowValueTeal: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.primary,
    textAlign: "right",
  },
  viewModalResubmitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.danger,
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 16,
    marginBottom: 4,
  },
  viewModalResubmitBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800",
  },

  viewModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  viewModalCard: {
    width: "100%",
    maxWidth: 480,
    maxHeight: "85%",
    backgroundColor: "#F4F6F8",
    borderRadius: 20,
    overflow: "hidden",
    // Important: column layout so ScrollView can take remaining height
    flexDirection: "column",
  },
  viewModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 18,
    // Header stays fixed; do not put flex:1 here
  },
  viewModalBody: {
    // Lets the list scroll inside the maxHeight card
    flexGrow: 1,
    flexShrink: 1,
  },
  viewModalBodyContent: {
    padding: 18,
    paddingBottom: 24,
  },
});
