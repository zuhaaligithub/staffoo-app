// import React, { useMemo, useState, useEffect } from "react";
// import {
//   View,
//   Text,
//   ScrollView,
//   TouchableOpacity,
//   StyleSheet,
//   Alert,
//   ActivityIndicator,
//   Modal,
//   TextInput,
//   SafeAreaView,
//   Image,
//   TouchableWithoutFeedback,
//   Platform,
// } from "react-native";
// import {
//   ChevronLeft,
//   Files,
//   ArrowLeft,
//   Lock,
//   Check,
//   X,
//   User,
//   Info,
//   Scale,
//   CreditCard,
//   Send,
// } from "lucide-react-native";
// import { useNavigation, useRoute } from "@react-navigation/native";
// import Toast from "react-native-toast-message";
// import AsyncStorage from "@react-native-async-storage/async-storage";
// import axios from "axios";
// import {
//   postJob,
//   getUserProfile,
//   holdPayment as holdPaymentAPI,
//   getAuthToken,
//   BASE_URL,
//   JobPostPayload,
// } from "../services/authApi";
// import { CardField, createPaymentMethod } from "@stripe/stripe-react-native";

// // ─── Types ────────────────────────────────────────────────────────────────────
// interface RateSlot {
//   day: number;
//   night: number;
// }

// interface RatesConfig {
//   charge: Record<string, RateSlot>;
// }

// interface ShiftSegment {
//   label: string;
//   hours: number;
//   payRate: number;
//   chargeRate: number;
// }

// interface CostBreakdown {
//   chargeTotal: number;
//   guardHours: number;
//   breakdown: ShiftSegment[];
//   totalShiftHours: number;
// }

// type PaymentPlan = "full" | "split";

// type Card = {
//   card_holder_name: string;
//   card_number: string;
//   expiry_month: string;
//   expiry_year: string;
//   payment_method_id?: string;
// };

// type JobTask = { id?: number; title?: string; completed?: boolean };

// type RouteParams = {
//   jobData?: {
//     title?: string;
//     category?: string;
//     shifts?: Array<{
//       date: Date;
//       startTime: Date;
//       endTime: Date;
//       guardsCount: number;
//     }>;
//     startDate?: Date;
//     startTime?: Date;
//     endDate?: Date;
//     endTime?: Date;
//     location?: string;
//     description?: string;
//     lat?: number;
//     lng?: number;
//     guardsCount?: number;
//     job_location_state?: string;
//     jobLocationState?: string;
//     tasks?: JobTask[];
//     jobLevel?: string | number;
//     totalManHours?: number;
//     subtotal?: number;
//     gstAmount?: number;
//     totalQuotation?: number;
//     discountAmount?: number;
//     payableNow?: number;
//     splitAmount?: number;
//     totalAmount?: number;
//     stateMatch?: boolean | null;
//   };
//   estimate?: {
//     minPrice: number;
//     maxPrice: number;
//     isSegmented: boolean;
//   };
//   uploadedFileUrls?: string[];
//   uploadedFileNames?: string[];
//   selectedDocuments?: string[];
// };

// const courierFont = Platform.select({
//   ios: "Courier New",
//   android: "monospace",
// });

// const SEGMENT_LABELS: Record<string, string> = {
//   weekday_day: "Mon–Fri (Day 06:00–18:00)",
//   weekday_night: "Mon–Fri (Night 18:00–06:00)",
//   sat_day: "Saturday (06:00–18:00)",
//   sat_night: "Saturday (18:00–06:00)",
//   sun_day: "Sunday (06:00–18:00)",
//   sun_night: "Sunday (18:00–06:00)",
//   pub_holi_day: "Public Holiday (Day 06:00–18:00)",
//   pub_holi_night: "Public Holiday (Night 18:00–06:00)",
// };

// const DAY_TYPE_LABELS: Record<string, string> = {
//   weekday: "Mon–Fri",
//   sat: "Saturday",
//   sun: "Sunday",
//   pub_holi: "Public Holiday",
// };

// function getDayType(d: Date): string {
//   const day = d.getDay();
//   if (day === 0) return "sun";
//   if (day === 6) return "sat";
//   return "weekday";
// }

// function getSlot(hour: number): "day" | "night" {
//   return hour >= 6 && hour < 18 ? "day" : "night";
// }

// function nextBoundary(t: Date): Date {
//   const h = t.getHours();
//   const n = new Date(t);
//   n.setSeconds(0, 0);
//   if (h < 6) {
//     n.setHours(6, 0, 0, 0);
//   } else if (h < 18) {
//     n.setHours(18, 0, 0, 0);
//   } else {
//     n.setDate(n.getDate() + 1);
//     n.setHours(0, 0, 0, 0);
//   }
//   return n;
// }

// function parseLocalDateTime(value: any): Date {
//   if (value instanceof Date) return new Date(value);
//   if (typeof value === "string") {
//     const match = value.match(
//       /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/,
//     );
//     if (match) {
//       const [, year, month, day, hour, minute, second] = match;
//       return new Date(
//         Number(year),
//         Number(month) - 1,
//         Number(day),
//         Number(hour),
//         Number(minute),
//         Number(second || "0"),
//         0,
//       );
//     }
//     const parsed = new Date(value);
//     return isNaN(parsed.getTime()) ? new Date() : parsed;
//   }
//   const parsed = new Date(value);
//   return isNaN(parsed.getTime()) ? new Date() : parsed;
// }

// function normalizeShift(shift: any) {
//   const start = parseLocalDateTime(shift.startTime);
//   let end = parseLocalDateTime(shift.endTime);

//   if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && end <= start) {
//     end = new Date(end.getTime() + 24 * 60 * 60 * 1000);
//   }

//   return {
//     ...shift,
//     startTime: start,
//     endTime: end,
//     guardsCount: Number(shift.guardsCount || 1),
//   };
// }

// function calcBreakdown(shiftsInput: any[], r: RatesConfig): CostBreakdown {
//   if (!shiftsInput?.length) {
//     return { chargeTotal: 0, guardHours: 0, breakdown: [], totalShiftHours: 0 };
//   }

//   const hMap = new Map<string, number>();
//   const order: string[] = [];

//   let totalGuardHours = 0;
//   let totalShiftHours = 0;

//   shiftsInput.forEach((shift) => {
//     const normalized = normalizeShift(shift);
//     const guards = Math.max(1, Number(normalized.guardsCount || 1));
//     const startDt = normalized.startTime;
//     const endDt = normalized.endTime;

//     if (
//       isNaN(startDt.getTime()) ||
//       isNaN(endDt.getTime()) ||
//       endDt <= startDt
//     ) {
//       return;
//     }

//     const shiftClockHours = (endDt.getTime() - startDt.getTime()) / 3_600_000;
//     totalShiftHours += shiftClockHours;
//     totalGuardHours += shiftClockHours * guards;

//     let cursor = new Date(startDt);
//     while (cursor < endDt) {
//       const boundary = nextBoundary(cursor);
//       const segEnd = boundary < endDt ? boundary : endDt;
//       const segHours = (segEnd.getTime() - cursor.getTime()) / 3_600_000;
//       if (segHours <= 0) break;

//       const key = `${getDayType(cursor)}_${getSlot(cursor.getHours())}`;
//       if (!hMap.has(key)) {
//         hMap.set(key, 0);
//         order.push(key);
//       }
//       hMap.set(key, (hMap.get(key) ?? 0) + segHours * guards);
//       cursor = new Date(segEnd);
//     }
//   });

//   const dayTypeOrder: string[] = [];
//   order.forEach((k) => {
//     const dayType = k.split("_").slice(0, -1).join("_");
//     if (!dayTypeOrder.includes(dayType)) dayTypeOrder.push(dayType);
//   });

//   let totalCharge = 0;
//   const bd: ShiftSegment[] = [];

//   dayTypeOrder.forEach((dayType) => {
//     const dayHours = hMap.get(`${dayType}_day`) ?? 0;
//     const nightHours = hMap.get(`${dayType}_night`) ?? 0;
//     const dayRate = r.charge[dayType]?.day ?? 0;
//     const nightRate = r.charge[dayType]?.night ?? 0;

//     if (dayRate === nightRate) {
//       const mergedHours = dayHours + nightHours;
//       if (mergedHours > 0) {
//         totalCharge += mergedHours * dayRate;
//         bd.push({
//           label: DAY_TYPE_LABELS[dayType] ?? dayType,
//           hours: mergedHours,
//           payRate: 0,
//           chargeRate: dayRate,
//         });
//       }
//       return;
//     }

//     if (dayHours > 0) {
//       totalCharge += dayHours * dayRate;
//       bd.push({
//         label: SEGMENT_LABELS[`${dayType}_day`] ?? `${dayType}_day`,
//         hours: dayHours,
//         payRate: 0,
//         chargeRate: dayRate,
//       });
//     }
//     if (nightHours > 0) {
//       totalCharge += nightHours * nightRate;
//       bd.push({
//         label: SEGMENT_LABELS[`${dayType}_night`] ?? `${dayType}_night`,
//         hours: nightHours,
//         payRate: 0,
//         chargeRate: nightRate,
//       });
//     }
//   });

//   return {
//     chargeTotal: totalCharge,
//     guardHours: totalGuardHours,
//     breakdown: bd,
//     totalShiftHours,
//   };
// }

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

// export default function ReviewConfirmScreen() {
//   const navigation = useNavigation();
//   const route = useRoute();
//   const {
//     jobData = {},
//     uploadedFileUrls = [],
//     uploadedFileNames = [],
//     selectedDocuments = [],
//     estimate,
//   } = (route.params || {}) as RouteParams;

//   const LOGO = require("../assets/staffoo.png");
//   const [showPolicyModal, setShowPolicyModal] = useState(false);
//   const [isSubmitting, setIsSubmitting] = useState(false);
//   const [rates, setRates] = useState<RatesConfig | null>(null);
//   const [ratesLoading, setRatesLoading] = useState(true);
//   const [ratesError, setRatesError] = useState<string | null>(null);
//   const [matchedRateRow, setMatchedRateRow] = useState<any>(null);
//   const [acceptedPolicy, setAcceptedPolicy] = useState(false);
//   const [selectedPlan, setSelectedPlan] = useState<PaymentPlan>("full");
//   const [paymentModalVisible, setPaymentModalVisible] = useState(false);
//   const [savedCards, setSavedCards] = useState<Card[]>([]);
//   const [selectedSavedIndex, setSelectedSavedIndex] = useState(0);
//   const [paymentTab, setPaymentTab] = useState<"saved" | "new">("saved");
//   const [cardError, setCardError] = useState("");
//   const [processing, setProcessing] = useState(false);
//   const [cardComplete, setCardComplete] = useState(false);
//   const [cardHolderName, setCardHolderName] = useState("");
//   const [nameError, setNameError] = useState("");
//   const [confirmModalVisible, setConfirmModalVisible] = useState(false);
//   const isStateNotMatched = jobData.stateMatch === false;
//   const contractorInvoice = jobData.stateMatch === true ? 1 : 0;
//   const minPrice = Number(estimate?.minPrice ?? 0);
//   const maxPrice = Number(estimate?.maxPrice ?? 0);
//   const isSegmented = !!estimate?.isSegmented;
//   const pad = (n: number) => String(n).padStart(2, "0");
//   const getCategoryDisplay = (cat?: string) => {
//     const map: Record<string, string> = {
//       "event-security": "Event Security",
//       "static-security": "Static Security Guard",
//       "corporate-security": "Corporate Security",
//       "site-patrol": "Site Patrol Security",
//       others: "Others",
//     };
//     return map[cat ?? ""] ?? cat ?? "Not specified";
//   };

//   const capitalizeAllWords = (text = "") =>
//     text
//       .split(/(\s+|\/|\(|\))/)
//       .map((part) =>
//         !part.match(/[a-zA-Z]/)
//           ? part
//           : part
//               .split(" ")
//               .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
//               .join(" "),
//       )
//       .join("");

//   const handleCardHolderName = (text: string) => {
//     const cleaned = text.replace(/[^a-zA-Z\s.-]/g, "");
//     setCardHolderName(cleaned);
//     if (cleaned.trim().length === 0) {
//       setNameError("");
//       return;
//     }
//     setNameError(cleaned.trim().length < 3 ? "Please enter valid name" : "");
//   };

//   const handleCardChange = (d: any) => {
//     setCardComplete(!!d.complete);
//     if (d.error) {
//       setCardError(d.error.message);
//     } else {
//       setCardError("");
//     }
//   };

//   const isPaymentReady = () => {
//     return cardHolderName.trim().length >= 3 && cardComplete;
//   };

//   const getPaymentMethodId = async (): Promise<{
//     id: string;
//     holderName: string;
//   } | null> => {
//     setCardError("");
//     const holderName = cardHolderName.trim();

//     if (!holderName || holderName.length < 3) {
//       setCardError("Card holder name is required.");
//       return null;
//     }
//     if (!cardComplete) {
//       setCardError("Please complete card details.");
//       return null;
//     }

//     const { paymentMethod, error } = await createPaymentMethod({
//       paymentMethodType: "Card",
//       paymentMethodData: {
//         billingDetails: { name: holderName },
//       },
//     });

//     if (error) {
//       setCardError(error.message || "Failed to create payment method");
//       return null;
//     }

//     return { id: paymentMethod!.id, holderName };
//   };

//   const getChargeAmount = (total: number) => {
//     return parseFloat(
//       (selectedPlan === "full" ? total : total * 0.5).toFixed(2),
//     );
//   };

//   const holdPayment = async (
//     pmId: string,
//     holderName: string,
//   ): Promise<string> => {
//     const user = JSON.parse((await AsyncStorage.getItem("user"))!);
//     const formattedShifts = (jobData.shifts || []).map((shift: any) => {
//       const s = new Date(shift.startTime);
//       const e = new Date(shift.endTime);
//       return {
//         start: `${s.getFullYear()}-${pad(s.getMonth() + 1)}-${pad(
//           s.getDate(),
//         )}T${pad(s.getHours())}:${pad(s.getMinutes())}`,
//         end: `${e.getFullYear()}-${pad(e.getMonth() + 1)}-${pad(
//           e.getDate(),
//         )}T${pad(e.getHours())}:${pad(e.getMinutes())}`,
//         numberOfGuards: Number(shift.guardsCount || jobData.guardsCount || 1),
//       };
//     });

//     const payload = {
//       user_id: user.id,
//       card_holder_name: holderName,
//       payment_method_id: pmId,
//       payment_option: selectedPlan,
//       charge_amount: getChargeAmount(totalIncGST),
//       shifts: formattedShifts,
//       job_level: Number(jobData.jobLevel ?? 1),
//       number_of_guards: jobData.guardsCount || 1,
//       requires_110_buffer: true,
//     };

//     const res = await holdPaymentAPI(payload);
//     if (!res?.success) throw new Error(res?.message || "Payment hold failed.");
//     return res.payment.payment_intent_id;
//   };

//   const submitJob = async (intentId: string | null) => {
//     const user = JSON.parse((await AsyncStorage.getItem("user"))!);

//     const parseLocalDate = (value: any): Date => {
//       if (!value) return new Date();
//       if (value instanceof Date) return value;

//       if (typeof value === "string") {
//         if (value.includes("T")) return new Date(value);

//         if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
//           const [y, m, d] = value.split("-").map(Number);
//           return new Date(y, m - 1, d);
//         }
//       }

//       return new Date(value);
//     };

//     const formatTime = (ds: string) => {
//       const d = new Date(ds);
//       return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
//     };

//     const getStateFromAddress = (address: string): string => {
//       if (!address) return "";

//       const upper = address.toUpperCase();

//       const pakistanMap: Record<string, string> = {
//         PUNJAB: "punjab",
//         SINDH: "sindh",
//         "KHYBER PAKHTUNKHWA": "khyber pakhtunkhwa",
//         KPK: "khyber pakhtunkhwa",
//         BALOCHISTAN: "balochistan",
//         "AZAD KASHMIR": "azad kashmir",
//         "GILGIT BALTISTAN": "gilgit baltistan",

//         LAHORE: "punjab",
//         KARACHI: "sindh",
//         ISLAMABAD: "islamabad capital territory",
//         RAWALPINDI: "punjab",
//         FAISALABAD: "punjab",
//         MULTAN: "punjab",
//         PESHAWAR: "khyber pakhtunkhwa",
//         QUETTA: "balochistan",
//       };

//       const australiaMap: Record<string, string> = {
//         VIC: "vic",
//         VICTORIA: "vic",
//         NSW: "nsw",
//         "NEW SOUTH WALES": "nsw",
//         QLD: "qld",
//         QUEENSLAND: "qld",
//         WA: "wa",
//         "WESTERN AUSTRALIA": "wa",
//         SA: "sa",
//         "SOUTH AUSTRALIA": "sa",
//         TAS: "tas",
//         TASMANIA: "tas",
//         ACT: "act",
//         NT: "nt",
//       };

//       const parts = address
//         .split(",")
//         .map((p) => p.trim())
//         .filter(Boolean);

//       for (let i = parts.length - 1; i >= 0; i--) {
//         const part = parts[i].toUpperCase();

//         for (const [key, value] of Object.entries(pakistanMap)) {
//           if (part.includes(key)) {
//             return value;
//           }
//         }

//         for (const [key, value] of Object.entries(australiaMap)) {
//           if (part.includes(key)) {
//             return value;
//           }
//         }
//       }

//       for (const [key, value] of Object.entries(pakistanMap)) {
//         if (upper.includes(key)) {
//           return value;
//         }
//       }

//       for (const [key, value] of Object.entries(australiaMap)) {
//         if (upper.includes(key)) {
//           return value;
//         }
//       }

//       if (upper.includes("PAKISTAN")) return "pakistan";
//       if (upper.includes("AUSTRALIA")) return "australia";

//       const lastPart = parts[parts.length - 1];
//       if (lastPart && lastPart.length > 2 && !/^\d+$/.test(lastPart)) {
//         return lastPart.toLowerCase();
//       }

//       return "";
//     };

//     const extractedState =
//       jobData.jobLocationState || getStateFromAddress(jobData.location || "");

//     const formattedShifts = (jobData.shifts || []).map((shift: any) => {
//       const s = parseLocalDate(shift.startTime);
//       let e = parseLocalDate(shift.endTime);

//       if (e <= s) {
//         e = new Date(e.getTime() + 24 * 60 * 60 * 1000);
//       }

//       return {
//         start: `${s.getFullYear()}-${pad(s.getMonth() + 1)}-${pad(
//           s.getDate(),
//         )}T${pad(s.getHours())}:${pad(s.getMinutes())}`,
//         end: `${e.getFullYear()}-${pad(e.getMonth() + 1)}-${pad(
//           e.getDate(),
//         )}T${pad(e.getHours())}:${pad(e.getMinutes())}`,
//         numberOfGuards: Number(shift.guardsCount || 1),
//       };
//     });

//     const filteredDocuments = (selectedDocuments || []).filter(
//       (doc: string) => {
//         const normalized = doc.toLowerCase().replace(/[_-]/g, " ").trim();
//         return normalized !== "security license";
//       },
//     );

//     const payload: JobPostPayload = {
//       user_id: user.id,
//       job_type: jobData.category || "others",
//       description: jobData.description || "No description provided",
//       address: jobData.location || "Not specified",
//       coordinates: `${jobData.lat},${jobData.lng}`,
//       state: extractedState || "open",
//       posting_type: "broadcast",
//       shifts: formattedShifts,
//       job_level: Number(jobData.jobLevel ?? 1),
//       payment_option: selectedPlan,
//       job_location_state: extractedState,
//       is_document: filteredDocuments.length > 0,
//       document_list: uploadedFileUrls || [],
//       document_types: filteredDocuments,
//       job_instruction: jobData.description || "",
//       tasks: (jobData.tasks || []).map((t: any) => ({
//         task: t.task || t.title || "",
//         task_start: t.task_start || formatTime(t.startTime),
//         task_end: t.task_end || formatTime(t.endTime),
//       })),
//       payment_intent_id: isStateNotMatched
//         ? "admin_override_no_payment"
//         : intentId,
//       contractor_invoice: contractorInvoice,
//       ...(isStateNotMatched
//         ? {
//             financials: {
//               estimated_min: parseFloat(minPrice.toFixed(2)),
//               estimated_max: parseFloat(maxPrice.toFixed(2)),
//               is_segmented: isSegmented,
//             },
//           }
//         : {
//             financials: {
//               base_total_inc_gst: parseFloat(totalIncGST.toFixed(2)),
//               discount_applied: selectedPlan === "full" ? discountAmount : 0,
//               amount_to_charge_today: parseFloat(ctaAmount.toFixed(2)),
//               balance_deferred:
//                 selectedPlan === "split"
//                   ? parseFloat((totalIncGST * 0.5).toFixed(2))
//                   : 0,
//             },
//           }),
//     };

//     console.log("[CREATE JOB PAYLOAD]", JSON.stringify(payload, null, 2));

//     return postJob(payload);
//   };

//   const handlePayment = async () => {
//     if (processing) return;
//     setProcessing(true);
//     setCardError("");
//     try {
//       const pm = await getPaymentMethodId();
//       if (!pm) {
//         setProcessing(false);
//         return;
//       }
//       const intentId = await holdPayment(pm.id, pm.holderName);
//       const response = await submitJob(intentId);
//       Toast.show({
//         type: "success",
//         text1: "Job Posted!",
//         text2: response?.message || "Job posted successfully.",
//         position: "bottom",
//       });
//       setPaymentModalVisible(false);
//       navigation.reset({
//         index: 0,
//         routes: [
//           {
//             name: "MainTabs" as const,
//             state: {
//               routes: [
//                 {
//                   name: "Applications" as const,
//                 },
//               ],
//             },
//           } as never,
//         ],
//       });
//     } catch (err: any) {
//       const msg =
//         err?.response?.data?.message || err.message || "Something went wrong.";
//       setCardError(msg);
//       Toast.show({
//         type: "error",
//         text1: "Payment Failed",
//         text2: msg,
//         position: "bottom",
//       });
//     } finally {
//       setProcessing(false);
//     }
//   };

//   const handleAcceptAndPostUnmatched = async () => {
//     if (isSubmitting) return;
//     setIsSubmitting(true);
//     try {
//       const response = await submitJob("admin_override_no_payment");
//       Toast.show({
//         type: "success",
//         text1: "Job Posted!",
//         text2: response?.message || "Job posted successfully.",
//         position: "bottom",
//       });
//       setConfirmModalVisible(false);
//       navigation.reset({
//         index: 0,
//         routes: [
//           {
//             name: "MainTabs" as const,
//             state: {
//               routes: [
//                 {
//                   name: "Applications" as const,
//                 },
//               ],
//             },
//           } as never,
//         ],
//       });
//     } catch (err: any) {
//       const msg =
//         err?.response?.data?.message || err.message || "Something went wrong.";
//       Toast.show({
//         type: "error",
//         text1: "Post Failed",
//         text2: msg,
//         position: "bottom",
//       });
//     } finally {
//       setIsSubmitting(false);
//     }
//   };

//   const handleEditDetails = () => {
//     (navigation as any).navigate("MainTabs", {
//       screen: "CreateJob",
//       params: {
//         isEdit: true,
//         jobData: jobData,
//       },
//     });
//   };

//   useEffect(() => {
//     if (isStateNotMatched) {
//       setRatesLoading(false);
//       return;
//     }

//     (async () => {
//       try {
//         const token = await getAuthToken();
//         if (!token) throw new Error("No auth token");

//         const res = await axios.get(`${BASE_URL}/get-chargerates`, {
//           headers: { Authorization: `Bearer ${token}` },
//         });

//         if (
//           !res.data?.success ||
//           !Array.isArray(res.data?.data) ||
//           res.data.data.length === 0
//         ) {
//           throw new Error("Invalid rates response");
//         }

//         const jobLevelNum = parseInt(String(jobData.jobLevel ?? "1"), 10) || 1;
//         const matched =
//           res.data.data.find(
//             (item: any) => parseInt(String(item.level), 10) === jobLevelNum,
//           ) ?? res.data.data[0];

//         const r = matched;
//         setMatchedRateRow(r);
//         const builtRates: RatesConfig = {
//           charge: {
//             weekday: {
//               day: Number(r.def_metro_mon_to_fri_day_rate || 0),
//               night: Number(r.def_metro_mon_to_fri_night_rate || 0),
//             },
//             fri: {
//               day: Number(r.def_metro_mon_to_fri_day_rate || 0),
//               night: Number(r.def_metro_mon_to_fri_night_rate || 0),
//             },
//             sat: {
//               day: Number(r.def_metro_sat_day_rate || 0),
//               night: Number(r.def_metro_sat_night_rate || 0),
//             },
//             sun: {
//               day: Number(r.def_metro_sun_day_rate || 0),
//               night: Number(r.def_metro_sun_night_rate || 0),
//             },
//             pub_holi: {
//               day: Number(r.def_metro_pub_holi_day_rate || 0),
//               night: Number(r.def_metro_pub_holi_night_rate || 0),
//             },
//           },
//         };

//         setRates(builtRates);
//       } catch (e: any) {
//         const msg =
//           e.response?.data?.message || e.message || "Failed to load rates";
//         setRatesError(msg);
//       } finally {
//         setRatesLoading(false);
//       }
//     })();
//   }, [jobData.jobLevel, isStateNotMatched]);

//   const costBreakdown = useMemo(() => {
//     const shifts = Array.isArray(jobData.shifts)
//       ? jobData.shifts.map(normalizeShift)
//       : [];

//     if (!rates || !shifts.length) {
//       return {
//         chargeTotal: 0,
//         guardHours: 0,
//         breakdown: [],
//         totalShiftHours: 0,
//       };
//     }
//     return calcBreakdown(shifts, rates);
//   }, [rates, jobData.shifts]);

//   const totalBillableHours = costBreakdown.guardHours;
//   const subtotal = costBreakdown.chargeTotal;
//   const discountAmount = parseFloat((subtotal * 0.05).toFixed(2));
//   const discountedSubtotal = parseFloat((subtotal - discountAmount).toFixed(2));
//   const gst = parseFloat((discountedSubtotal * 0.1).toFixed(2));
//   const fullPayAmount = parseFloat((discountedSubtotal + gst).toFixed(2));
//   const gstNoDiscount = parseFloat((subtotal * 0.1).toFixed(2));
//   const splitTotalIncGST = parseFloat((subtotal + gstNoDiscount).toFixed(2));
//   const splitUpfront = parseFloat((splitTotalIncGST * 0.5).toFixed(2));
//   const totalIncGST =
//     selectedPlan === "full" ? fullPayAmount : splitTotalIncGST;
//   const ctaAmount = selectedPlan === "full" ? fullPayAmount : splitUpfront;
//   const openPaymentModal = () => {
//     if (!acceptedPolicy) {
//       Alert.alert("Required", "Please agree to the Terms & Conditions first.");
//       return;
//     }

//     setPaymentModalVisible(true);
//     setCardError("");
//     setProcessing(false);
//     setCardHolderName("");
//     setCardComplete(false);
//     setNameError("");

//     (async () => {
//       try {
//         const u = await AsyncStorage.getItem("user");
//         const userId = u ? JSON.parse(u).id : null;
//         if (!userId) {
//           setPaymentTab("new");
//           return;
//         }
//         const profile = await getUserProfile(userId);
//         if (profile?.success && profile?.data?.customer?.bank_details) {
//           const parsed = JSON.parse(profile.data.customer.bank_details || "[]");
//           if (Array.isArray(parsed) && parsed.length > 0) {
//             setSavedCards(parsed);
//             setSelectedSavedIndex(0);
//             setPaymentTab("saved");
//             setCardHolderName(parsed[0].card_holder_name || "");
//           } else {
//             setSavedCards([]);
//             setPaymentTab("new");
//           }
//         } else {
//           setSavedCards([]);
//           setPaymentTab("new");
//         }
//       } catch {
//         setSavedCards([]);
//         setPaymentTab("new");
//       }
//     })();
//   };

//   const openConfirmModalUnmatched = () => {
//     if (!acceptedPolicy) {
//       Alert.alert("Required", "Please agree to the Terms & Conditions first.");
//       return;
//     }
//     setConfirmModalVisible(true);
//   };
//   const CLIENT_TERMS_META = {
//     title: "Customer / Client Terms of Service & Booking Agreement",
//     version: "3.0 (2026 Legal Release)",
//     operatedBy: "Capital Services Pty Ltd",
//     abn: "48 613 317 838",
//     registeredOffice: "21 Tanglewood Bvd, Truganina VIC 3029, Australia",
//   };
//   const CLIENT_TERMS_SECTIONS = [
//     {
//       number: "1",
//       title: "Nature of Platform & Unrestricted Subcontracting Rights",
//       body: `1.1 Technology Platform: Staffoo provides specialized Workforce Management (WFM) and Customer Relationship Management (CRM) technology enabling Clients to book, schedule, and coordinate security guarding, crowd control, and asset protection services.

// 1.2 Absolute Discretion to Fulfill via Resource Partners: The Client acknowledges and agrees that Capital Services Pty Ltd reserves the absolute right and discretion at all times to fulfill any booking requirement either directly or by engaging, assigning, or subcontracting the shift to an independent, licensed third-party security provider or staffing agency ("Resource Partner").

// 1.3 Jurisdictional & Licence Capacity Disclaimer: The existence or holding of a Master Security Licence or Labour Hire Licence by Capital Services Pty Ltd in any specific State or Territory shall not obligate Capital Services Pty Ltd to act as the principal direct service provider. In all jurisdictions and under all operational circumstances:
// • Capital Services Pty Ltd may assign bookings to an authorized, fully licensed Resource Partner.
// • Where a booking is assigned to a Resource Partner, the legal obligation for on-site security execution sits with the Resource Partner, and Staffoo acts as the technology platform and billing agent.
// • The Client shall not hold Capital Services Pty Ltd liable for exercising its commercial right to utilize Resource Partners to fulfill booking requests.`,
//     },
//     {
//       number: "2",
//       title: "Bookings, Payment Holds & Automatic Settlement",
//       body: `2.1 Payment Authorization: Upon requesting shift or roster coverage, the Client authorizes Staffoo to place an authorization hold or pre-charge on their designated payment method (processed securely via Stripe) for the full estimated booking total.

// 2.2 Escrow-Style Payment Release: Funds are held securely via the payment gateway upon shift completion. The Client is granted a twenty-four (24) hour review window post-shift to confirm digital timesheets or log an operational dispute via the Platform.

// 2.3 Automatic Confirmation: If no dispute or confirmation is lodged within twenty-four (24) hours post-shift, the shift timesheet is deemed automatically approved, and funds will be permanently released to the fulfilling provider.

// 2.4 Invoicing & Billing Agency: In instances where a Resource Partner fulfills the shift, invoices for the security guarding services are generated by or on behalf of the Resource Partner (under their Master Security Licence and ABN), with Staffoo acting as an authorized billing, collection, and technology intermediary agent.`,
//     },
//     {
//       number: "3",
//       title: "Client Workplace Health & Safety (WHS) Obligations",
//       body: `3.1 Statutory Compliance: The Client must maintain a safe work environment compliant with all applicable Commonwealth, State, and Territory Workplace Health and Safety (WHS / OHS) legislation (including model WHS laws and the Occupational Health and Safety Act 2004 (Vic)).`,
//     },
//     {
//       number: "4",
//       title: "Cancellations, Shift Modifications & Disputes",
//       body: `4.1 Minimum Notice Cancellation Fees: Cancellations made within the mandatory minimum notice window (as specified during the booking checkout flow) will attract a standardized cancellation fee to cover administrative overheads and guard mobilization costs.

// 4.2 Dispute Resolution Protocol: Operational disputes regarding guard attendance or performance must be submitted via the Platform within 24 hours post-shift, supported by time-stamped evidence. Staffoo will mediate disputes in good faith utilizing automated GPS geofencing, clock-in timestamps, and platform audit logs.`,
//     },
//     {
//       number: "5",
//       title: "Non-Solicitation & Anti-Poaching",
//       body: `5.1 Non-Circumvention Period: The Client agrees that during active platform usage and for a period of six (6) months following the completion of any booking, it will not directly or indirectly engage, employ, solicit, or contract with any Resource Partner or individual guard introduced to the Client via Staffoo, outside of the Platform.`,
//     },
//     {
//       number: "6",
//       title: "Limitation of Liability, Statutory Warranties & Indemnity",
//       body: `6.1 Australian Consumer Law (ACL): Nothing in these Terms excludes, restricts, or modifies any statutory guarantee, right, or remedy implied by Schedule 2 of the Competition and Consumer Act 2010 (Cth) that cannot be lawfully excluded.

// 6.2 Intermediary Liability Exclusion: To the maximum extent permitted by Australian law, where a booking is fulfilled by a Resource Partner, Staffoo excludes all liability for property damage, theft, personal injury, or indirect/consequential losses arising from the acts or omissions of the Resource Partner or its personnel.`,
//     },
//     {
//       number: "7",
//       title: "Governing Law & Jurisdiction",
//       body: `7.1 Governing Law: These Terms are governed by and construed in accordance with the laws of the State of Victoria, Australia. The parties submit to the exclusive jurisdiction of the courts operating in Victoria.`,
//     },
//   ];

//   const CLIENT_TERMS_INTRO = `These Customer Terms of Service ("Terms") govern the access to and use of the Staffoo web dashboard, mobile applications, and booking infrastructure (collectively, the "Platform"), operated by Capital Services Pty Ltd (ABN 48 613 317 838). By requesting, booking, or managing security personnel or workforce services through Staffoo, the user ("Client") agrees to be bound by these Terms.`;

//   if (ratesLoading)
//     return (
//       <View style={styles.loadingContainer}>
//         <ActivityIndicator size="large" color="#0A7C6E" />
//         <Text style={styles.loadingText}>Loading data…</Text>
//       </View>
//     );

//   if (!isStateNotMatched && (ratesError || !rates))
//     return (
//       <View style={styles.errorContainer}>
//         <Text style={styles.errorText}>
//           Cannot load rates:{"\n"}
//           {ratesError}
//         </Text>
//         <TouchableOpacity
//           style={styles.backButton}
//           onPress={() =>
//             (navigation as any).navigate("MainTabs", {
//               screen: "CreateJob",
//             })
//           }
//         >
//           <Text style={styles.backButtonText}>Go Back</Text>
//         </TouchableOpacity>
//       </View>
//     );

//   return (
//     <View style={styles.container}>
//       {/* Header */}
//       <View style={styles.header}>
//         <TouchableOpacity onPress={handleEditDetails}>
//           <ChevronLeft size={22} color="#fff" />
//         </TouchableOpacity>
//         <Text style={styles.headerTitle}>Review & Confirm</Text>
//         <View style={{ width: 28 }} />
//       </View>

//       <ScrollView contentContainerStyle={styles.scrollContent}>
//         <View style={styles.card}>
//           <View style={styles.cardSectionHeader}>
//             <Text style={styles.sectionTitle}>Job Details</Text>
//           </View>
//           {[
//             {
//               label: "Job Type",
//               value:
//                 jobData.title ||
//                 capitalizeAllWords(getCategoryDisplay(jobData.category)),
//             },
//             { label: "Location", value: jobData.location || "Not specified" },
//             {
//               label: "Description",
//               value: jobData.description || "No description provided",
//             },
//           ].map(({ label, value }) => (
//             <View style={styles.detailRow} key={label}>
//               <Text style={styles.label}>{label}:</Text>
//               <View style={styles.inputCard}>
//                 <Text style={styles.inputCardText}>{value}</Text>
//               </View>
//             </View>
//           ))}
//           {uploadedFileUrls.length > 0 && (
//             <View style={styles.detailRow}>
//               <Text style={styles.label}>Attachments:</Text>
//               <View style={styles.inputCard}>
//                 {uploadedFileUrls.map((url, i) => (
//                   <View
//                     key={i}
//                     style={{
//                       flexDirection: "row",
//                       alignItems: "center",
//                       marginTop: i === 0 ? 0 : 6,
//                     }}
//                   >
//                     <Files size={18} color="#0A7C6E" />
//                     <Text
//                       style={{
//                         marginLeft: 8,
//                         color: "#0A7C6E",
//                         flexShrink: 1,
//                         fontSize: 14,
//                       }}
//                       numberOfLines={1}
//                     >
//                       {uploadedFileNames[i] ||
//                         url.split("/").pop() ||
//                         `File ${i + 1}`}
//                     </Text>
//                   </View>
//                 ))}
//               </View>
//             </View>
//           )}
//         </View>

//         <View style={styles.card}>
//           <View style={styles.cardSectionHeader}>
//             <Text style={styles.sectionTitle}>Schedule Summary</Text>
//           </View>
//           <View style={styles.scheduleContainer}>
//             {jobData.shifts?.length ? (
//               jobData.shifts.map((shift: any, index: number) => {
//                 const start = new Date(shift.startTime);
//                 const end = new Date(shift.endTime);
//                 const isNextDay =
//                   end.getDate() !== start.getDate() ||
//                   end.getMonth() !== start.getMonth();
//                 return (
//                   <View key={index} style={styles.shiftChip}>
//                     <Text style={styles.shiftDate}>
//                       {start.toLocaleDateString("en-GB", {
//                         day: "2-digit",
//                         month: "short",
//                       })}
//                     </Text>
//                     <View style={styles.timeContainer}>
//                       <Text style={styles.timeText}>
//                         {start.toLocaleTimeString([], {
//                           hour: "2-digit",
//                           minute: "2-digit",
//                           hour12: false,
//                         })}
//                       </Text>
//                       <Text style={styles.arrow}>→</Text>
//                       <Text style={styles.timeText}>
//                         {end.toLocaleTimeString([], {
//                           hour: "2-digit",
//                           minute: "2-digit",
//                           hour12: false,
//                         })}
//                       </Text>
//                       {isNextDay && <Text style={styles.nextDayTag}>+1d</Text>}
//                     </View>
//                     <View style={styles.guardsBadge}>
//                       <User size={14} color="#0A7C6E" />
//                       <Text style={styles.guardsCount}>
//                         {shift.guardsCount || 1}
//                       </Text>
//                     </View>
//                   </View>
//                 );
//               })
//             ) : (
//               <Text style={styles.noShiftsText}>No shifts added</Text>
//             )}
//           </View>
//         </View>

//         {isStateNotMatched ? (
//           /* UNMATCHED STATE FLOW: Estimate UI */
//           <View style={styles.estimateCard}>
//             <View style={styles.estimateHeaderRow}>
//               <CreditCard size={20} color="#0F172A" />
//               <Text style={styles.estimateHeading}>Job Estimate</Text>
//             </View>

//             <View style={styles.infoBox}>
//               <Info size={16} color="#0A7C6E" style={{ marginTop: 1 }} />
//               <Text style={styles.infoBoxText}>
//                 No payment is required at this stage. Once the estimated range
//                 is accepted, the job will be broadcast. You will be notified
//                 when payment is required.
//               </Text>
//             </View>

//             <View style={styles.priceRangeBox}>
//               <Scale size={40} color="#0A7C6E" />
//               <Text style={styles.priceRangeTitle}>Estimated Price Range</Text>
//               <Text style={styles.priceRangeSubtitle}>
//                 {isSegmented
//                   ? "This location uses segmented day/night rates."
//                   : "This location doesn't use segmented day/night rates. The final price will fall within this range."}
//               </Text>
//               <Text style={styles.priceRangeValue}>
//                 ${minPrice.toFixed(2)} – ${maxPrice.toFixed(2)}
//               </Text>
//             </View>
//           </View>
//         ) : (
//           /* MATCHED STATE FLOW: Full Quotation Breakdown & Split Payment Options */
//           <>
//             {/* ── Rate Breakdown ─────────────────────────────────────────────── */}
//             <View style={styles.rateCard}>
//               <View style={styles.rateMainHeader}>
//                 <Text style={styles.rateMainTitle}>Quotation Breakdown</Text>
//               </View>

//               {costBreakdown.breakdown.length === 0 ? (
//                 <Text style={styles.noDataText}>
//                   No breakdown available — check shift dates and times.
//                 </Text>
//               ) : (
//                 <>
//                   {costBreakdown.breakdown.map((item, i) => (
//                     <View key={i} style={styles.rateSegmentCard}>
//                       <View style={styles.rowItem}>
//                         <Text style={styles.rowLabel}>Service</Text>
//                         <View style={styles.valueWrap}>
//                           <Text style={styles.rowValue}>{item.label}</Text>
//                         </View>
//                       </View>

//                       <View style={styles.detailsRow}>
//                         <View style={styles.detailColumn}>
//                           <Text style={styles.rowLabel}>Billable Hours</Text>
//                           <Text style={styles.detailValue}>
//                             {item.hours.toFixed(2)}
//                           </Text>
//                         </View>
//                         <View style={styles.detailColumn}>
//                           <Text style={styles.rowLabel}>Unit Price</Text>
//                           <Text style={styles.detailValue}>
//                             ${item.chargeRate.toFixed(2)}
//                           </Text>
//                         </View>
//                         <View style={styles.detailColumn}>
//                           <Text style={styles.rowLabel}>Subtotal</Text>
//                           <Text style={styles.detailValueBold}>
//                             ${(item.chargeRate * item.hours).toFixed(2)}
//                           </Text>
//                         </View>
//                       </View>
//                     </View>
//                   ))}

//                   {/* ── Receipt-style totals block (matches design mock) ────── */}
//                   <View style={styles.receiptCard}>
//                     <View style={styles.receiptRow}>
//                       <Text style={styles.receiptLabel}>Subtotal</Text>
//                       <Text style={styles.receiptValue}>
//                         ${subtotal.toFixed(2)}
//                       </Text>
//                     </View>

//                     {selectedPlan === "full" && discountAmount > 0 && (
//                       <>
//                         <View style={styles.receiptRow}>
//                           <Text style={styles.receiptDiscountLabel}>
//                             Discount (5%)
//                           </Text>
//                           <Text style={styles.receiptDiscountValue}>
//                             -${discountAmount.toFixed(2)}
//                           </Text>
//                         </View>

//                         <View style={styles.receiptDashedDivider} />

//                         <View style={styles.receiptRow}>
//                           <Text style={styles.receiptLabel}>
//                             Discounted Subtotal
//                           </Text>
//                           <Text style={styles.receiptValue}>
//                             ${discountedSubtotal.toFixed(2)}
//                           </Text>
//                         </View>
//                       </>
//                     )}

//                     <View style={styles.receiptRow}>
//                       <Text style={styles.receiptLabel}>GST</Text>
//                       <Text style={styles.receiptValue}>
//                         $
//                         {selectedPlan === "full"
//                           ? gst.toFixed(2)
//                           : gstNoDiscount.toFixed(2)}
//                       </Text>
//                     </View>

//                     {selectedPlan === "split" && (
//                       <View style={styles.receiptRow}>
//                         <Text style={styles.receiptLabel}>
//                           Split Payment (50% now)
//                         </Text>
//                         <Text style={styles.receiptValue}>
//                           ${splitUpfront.toFixed(2)}
//                         </Text>
//                       </View>
//                     )}

//                     <View style={styles.receiptDashedDivider} />

//                     <View style={styles.receiptRow}>
//                       <Text style={styles.receiptTotalLabel}>Total</Text>
//                       <Text style={styles.receiptTotalValue}>
//                         ${totalIncGST.toFixed(2)}
//                       </Text>
//                     </View>

//                     <View style={styles.receiptThickDivider} />

//                     <View style={styles.receiptDueRow}>
//                       <Text style={styles.receiptDueLabel}>Due</Text>
//                       <Text style={styles.receiptDueValue}>
//                         ${ctaAmount.toFixed(2)}
//                       </Text>
//                     </View>
//                   </View>
//                 </>
//               )}
//             </View>

//             <View style={styles.paymentOptionsCard}>
//               <View style={styles.paymentOptionsHeader}>
//                 <Text style={styles.paymentOptionsTitle}>Payment Options</Text>
//               </View>
//               <View style={styles.paymentOptionsRow}>
//                 {(["full", "split"] as PaymentPlan[]).map((plan) => (
//                   <TouchableOpacity
//                     key={plan}
//                     style={[
//                       styles.planCard,
//                       selectedPlan === plan && styles.planCardSelected,
//                     ]}
//                     onPress={() => setSelectedPlan(plan)}
//                     activeOpacity={0.85}
//                   >
//                     {selectedPlan === plan && (
//                       <View style={styles.planSelectedDot}>
//                         <Check size={10} color="#fff" />
//                       </View>
//                     )}
//                     <View style={styles.planTitleRow}>
//                       <Text
//                         style={[
//                           styles.planName,
//                           selectedPlan === plan && styles.planNameSelected,
//                         ]}
//                       >
//                         {plan === "full"
//                           ? "Pay In Full"
//                           : "Split Payment (50/50)"}
//                       </Text>
//                       {plan === "full" && (
//                         <View style={styles.saveBadge}>
//                           <Text style={styles.saveBadgeText}>Save 5%</Text>
//                         </View>
//                       )}
//                     </View>
//                     <Text style={styles.planDesc}>
//                       {plan === "full"
//                         ? "Pay the total amount now and receive an instant 5% discount on your booking."
//                         : "Pay 50% upfront to secure guards. The remaining 50% is charged upon shift completion."}
//                     </Text>
//                     <View style={styles.planAmountRow}>
//                       <Text
//                         style={[
//                           styles.planAmount,
//                           selectedPlan === plan && styles.planAmountSelected,
//                         ]}
//                       >
//                         $
//                         {plan === "full"
//                           ? fullPayAmount.toFixed(2)
//                           : splitUpfront.toFixed(2)}
//                       </Text>
//                       <Text style={styles.planAmountLabel}>
//                         {plan === "full" ? " Total" : " Upfront"}
//                       </Text>
//                     </View>
//                   </TouchableOpacity>
//                 ))}
//               </View>
//             </View>
//           </>
//         )}

//         <TouchableOpacity
//           style={styles.policyContainer}
//           onPress={() => setAcceptedPolicy(!acceptedPolicy)}
//         >
//           <View
//             style={[styles.checkbox, acceptedPolicy && styles.checkboxChecked]}
//           >
//             {acceptedPolicy && <Check size={16} color="#fff" />}
//           </View>
//           <View style={{ flex: 1 }}>
//             <Text style={styles.policyText}>
//               I agree to the{" "}
//               <Text
//                 style={styles.policyLink}
//                 onPress={(e) => {
//                   e.stopPropagation();
//                   setShowPolicyModal(true);
//                 }}
//               >
//                 Terms & Conditions
//               </Text>
//             </Text>
//             {!isStateNotMatched && (
//               <Text style={styles.noteText}>
//                 *Note: A 10% incidental authorisation hold may be applied by
//                 stripe to cover potential unplanned overtime. The hold will be
//                 released after completion of the shift.
//               </Text>
//             )}
//           </View>
//         </TouchableOpacity>

//         {isStateNotMatched ? (
//           <TouchableOpacity
//             style={[
//               styles.reviewEstimateButton,
//               (!acceptedPolicy || isSubmitting) && styles.disabledButton,
//             ]}
//             onPress={openConfirmModalUnmatched}
//             disabled={!acceptedPolicy || isSubmitting}
//           >
//             <Send size={18} color="#fff" style={{ marginRight: 10 }} />
//             <Text style={styles.reviewEstimateButtonText}>
//               Review Estimate & Post
//             </Text>
//           </TouchableOpacity>
//         ) : (
//           <TouchableOpacity
//             style={[
//               styles.payNowButton,
//               (!acceptedPolicy || isSubmitting) && styles.disabledButton,
//             ]}
//             onPress={openPaymentModal}
//             disabled={!acceptedPolicy || isSubmitting}
//           >
//             <Lock size={20} color="#fff" style={{ marginRight: 10 }} />
//             <Text style={styles.payNowText}>
//               {selectedPlan === "full"
//                 ? `Pay $${fullPayAmount.toFixed(2)} & Post Job`
//                 : `Pay $${splitUpfront.toFixed(2)} & Post Job`}
//             </Text>
//           </TouchableOpacity>
//         )}

//         <TouchableOpacity style={styles.editButton} onPress={handleEditDetails}>
//           <ArrowLeft size={20} color="#0A7C6E" />
//           <Text style={styles.editButtonText}>Edit Details</Text>
//         </TouchableOpacity>
//       </ScrollView>

//       <Modal
//         visible={showPolicyModal}
//         animationType="slide"
//         presentationStyle="pageSheet"
//         onRequestClose={() => setShowPolicyModal(false)}
//       >
//         <SafeAreaView style={styles.modalContainer}>
//           {/* ── Header ── */}
//           <View style={styles.modalHeader}>
//             <View style={styles.headerLeft}>
//               <Image
//                 source={LOGO}
//                 style={styles.modalLogo}
//                 resizeMode="contain"
//               />
//               <View>
//                 <Text style={styles.modalTitle}>Privacy Policy & Terms</Text>
//                 <Text style={styles.modalSubtitle}>
//                   Staffoo • Legal Documents
//                 </Text>
//               </View>
//             </View>

//             <TouchableOpacity
//               onPress={() => setShowPolicyModal(false)}
//               style={styles.closeBtn}
//               activeOpacity={0.7}
//             >
//               <X size={18} color={COLORS.danger} />
//             </TouchableOpacity>
//           </View>

//           <ScrollView
//             style={styles.modalScroll}
//             contentContainerStyle={styles.modalScrollContent}
//             showsVerticalScrollIndicator={false}
//           >
//             {/* Meta card */}
//             <View style={styles.highlightedInfo}>
//               <Text style={styles.metaTitle}>{CLIENT_TERMS_META.title}</Text>

//               <View style={styles.metaRow}>
//                 <Text style={styles.metaLabel}>Version</Text>
//                 <Text style={styles.metaValue}>
//                   {CLIENT_TERMS_META.version}
//                 </Text>
//               </View>
//               <View style={styles.metaRow}>
//                 <Text style={styles.metaLabel}>Operated by</Text>
//                 <Text style={styles.metaValue}>
//                   {CLIENT_TERMS_META.operatedBy}
//                 </Text>
//               </View>
//               <View style={styles.metaRow}>
//                 <Text style={styles.metaLabel}>ABN</Text>
//                 <Text style={styles.metaValue}>{CLIENT_TERMS_META.abn}</Text>
//               </View>
//               <View style={[styles.metaRow, { marginBottom: 0 }]}>
//                 <Text style={styles.metaLabel}>Registered office</Text>
//                 <Text style={styles.metaValue}>
//                   {CLIENT_TERMS_META.registeredOffice}
//                 </Text>
//               </View>
//             </View>

//             {/* Intro */}
//             <Text style={styles.policyBodyText}>{CLIENT_TERMS_INTRO}</Text>

//             {/* Sections */}
//             {CLIENT_TERMS_SECTIONS.map((section) => (
//               <View key={section.number} style={styles.termsSection}>
//                 <View style={styles.termsSectionHeader}>
//                   <View style={styles.termsNumberBadge}>
//                     <Text style={styles.termsNumberText}>{section.number}</Text>
//                   </View>
//                   <Text style={styles.termsSectionTitle}>{section.title}</Text>
//                 </View>
//                 <Text style={styles.termsSectionBody}>{section.body}</Text>
//               </View>
//             ))}

//             <Text style={styles.lastUpdated}>
//               {CLIENT_TERMS_META.operatedBy} • ABN {CLIENT_TERMS_META.abn}
//             </Text>
//           </ScrollView>

//           {/* Footer */}
//           <View style={styles.modalFooter}>
//             <TouchableOpacity
//               style={styles.acceptBtn}
//               activeOpacity={0.85}
//               onPress={() => {
//                 setAcceptedPolicy(true);
//                 setShowPolicyModal(false);
//               }}
//             >
//               <Check size={20} color="#ffff" style={{ marginRight: 10 }} />
//               <Text style={styles.acceptBtnText}>
//                 I Accept the Terms & Privacy Policy
//               </Text>
//             </TouchableOpacity>
//           </View>
//         </SafeAreaView>
//       </Modal>

//       <Modal
//         visible={confirmModalVisible}
//         transparent
//         animationType="fade"
//         onRequestClose={() => !isSubmitting && setConfirmModalVisible(false)}
//       >
//         <View style={styles.modalOverlay}>
//           <View style={styles.confirmModalCard}>
//             <View style={styles.confirmModalHeader}>
//               <Text style={styles.confirmModalTitle}>
//                 Confirm Estimated Price
//               </Text>
//               <TouchableOpacity
//                 onPress={() => !isSubmitting && setConfirmModalVisible(false)}
//                 disabled={isSubmitting}
//               >
//                 <X size={20} color="#6B7280" />
//               </TouchableOpacity>
//             </View>

//             <Text style={styles.confirmModalSubtitle}>
//               This job's final price will fall within the estimated range below.
//             </Text>

//             <View style={styles.confirmPriceBox}>
//               <Text style={styles.confirmPriceCategory}>
//                 {jobData.category || "Job"}
//               </Text>
//               <Text style={styles.confirmPriceValue}>
//                 ${minPrice.toFixed(2)} – ${maxPrice.toFixed(2)}
//               </Text>
//             </View>

//             <Text style={styles.confirmModalNote}>
//               No payment is required at this stage. Once the job is accepted,
//               the final payment invoice will be emailed to you and published in
//               the app, where you can complete the payment process.
//             </Text>

//             <View style={styles.confirmModalActions}>
//               <TouchableOpacity
//                 style={[
//                   styles.acceptPostBtn,
//                   isSubmitting && styles.disabledButton,
//                 ]}
//                 onPress={handleAcceptAndPostUnmatched}
//                 disabled={isSubmitting}
//               >
//                 {isSubmitting ? (
//                   <ActivityIndicator color="#fff" />
//                 ) : (
//                   <Text style={styles.acceptPostBtnText}>
//                     Accept Price & Post Job
//                   </Text>
//                 )}
//               </TouchableOpacity>
//             </View>
//           </View>
//         </View>
//       </Modal>

//       <Modal
//         visible={paymentModalVisible}
//         animationType="slide"
//         transparent
//         onRequestClose={() => !processing && setPaymentModalVisible(false)}
//       >
//         <TouchableWithoutFeedback
//           onPress={() => !processing && setPaymentModalVisible(false)}
//         >
//           <View style={styles.modalOverlay}>
//             <TouchableWithoutFeedback>
//               <View style={pmStyles.container}>
//                 {/* Header */}
//                 <View style={pmStyles.headerRow}>
//                   <View>
//                     <Text style={pmStyles.title}>Complete Payment</Text>
//                     <Text style={pmStyles.subtitle}>
//                       Direct payment to the service provider.
//                     </Text>
//                   </View>
//                   <View style={pmStyles.securedBadge}>
//                     <Lock size={12} color="#6366F1" />
//                     <Text style={pmStyles.securedText}>
//                       Secured By <Text style={pmStyles.stripeBlue}>Stripe</Text>
//                     </Text>
//                   </View>
//                 </View>

//                 <TouchableOpacity
//                   style={pmStyles.closeBtn}
//                   onPress={() => !processing && setPaymentModalVisible(false)}
//                   disabled={processing}
//                 >
//                   <X size={22} color="#6B7280" />
//                 </TouchableOpacity>

//                 {/* Amount Bar */}
//                 <View style={pmStyles.amountBar}>
//                   <Text style={pmStyles.amountBarTitle} numberOfLines={1}>
//                     {jobData.title ||
//                       capitalizeAllWords(
//                         getCategoryDisplay(jobData.category),
//                       ) ||
//                       "Security Service"}
//                   </Text>
//                   <Text style={pmStyles.amountBarValue}>
//                     $
//                     {(selectedPlan === "full"
//                       ? fullPayAmount
//                       : splitUpfront
//                     ).toFixed(2)}
//                   </Text>
//                 </View>

//                 <Text style={pmStyles.sectionLabel}>Payment Method</Text>

//                 {/* Tabs */}
//                 <View style={pmStyles.tabRow}>
//                   {(["saved", "new"] as const).map((tab) => (
//                     <TouchableOpacity
//                       key={tab}
//                       style={[
//                         pmStyles.tabBtn,
//                         paymentTab === tab
//                           ? pmStyles.tabBtnActive
//                           : pmStyles.tabBtnInactive,
//                       ]}
//                       onPress={() => {
//                         setPaymentTab(tab);
//                         setCardError("");
//                         if (tab === "saved" && savedCards.length > 0) {
//                           setCardHolderName(
//                             savedCards[selectedSavedIndex]?.card_holder_name ||
//                               "",
//                           );
//                         } else if (tab === "new") {
//                           setCardHolderName("");
//                           setCardComplete(false);
//                         }
//                       }}
//                     >
//                       <Text
//                         style={[
//                           pmStyles.tabLabel,
//                           paymentTab === tab
//                             ? pmStyles.tabLabelActive
//                             : pmStyles.tabLabelInactive,
//                         ]}
//                       >
//                         {tab === "saved" ? "Use Saved Card" : "Enter New Card"}
//                       </Text>
//                     </TouchableOpacity>
//                   ))}
//                 </View>

//                 {paymentTab === "saved" && (
//                   <ScrollView
//                     style={pmStyles.savedCardsScroll}
//                     contentContainerStyle={pmStyles.savedCardsContent}
//                     showsVerticalScrollIndicator={false}
//                   >
//                     {savedCards.length === 0 ? (
//                       <Text style={pmStyles.noCardsText}>
//                         No saved cards available. Please enter new card details
//                         below.
//                       </Text>
//                     ) : (
//                       <View style={pmStyles.savedCardsBox}>
//                         {savedCards.map((item, index) => (
//                           <TouchableOpacity
//                             key={index}
//                             style={[
//                               pmStyles.savedCardRow,
//                               selectedSavedIndex === index &&
//                                 pmStyles.savedCardRowSelected,
//                             ]}
//                             onPress={() => {
//                               setSelectedSavedIndex(index);
//                               setCardHolderName(item.card_holder_name || "");
//                             }}
//                           >
//                             <View
//                               style={[
//                                 pmStyles.radio,
//                                 selectedSavedIndex === index &&
//                                   pmStyles.radioActive,
//                               ]}
//                             >
//                               {selectedSavedIndex === index && (
//                                 <View style={pmStyles.radioDot} />
//                               )}
//                             </View>
//                             <View style={{ flex: 1 }}>
//                               <Text style={pmStyles.cardName}>
//                                 {item.card_holder_name?.toUpperCase()}
//                               </Text>
//                               <Text style={pmStyles.cardNumber}>
//                                 {item.card_number?.slice(0, 4)} **** ****{" "}
//                                 {item.card_number?.slice(-4)}
//                               </Text>
//                               {item.expiry_month && item.expiry_year && (
//                                 <Text style={pmStyles.cardExpiry}>
//                                   Expires {item.expiry_month}/{item.expiry_year}
//                                 </Text>
//                               )}
//                             </View>
//                           </TouchableOpacity>
//                         ))}
//                       </View>
//                     )}
//                   </ScrollView>
//                 )}

//                 <Text style={pmStyles.sectionLabel}>Card Details</Text>

//                 <TextInput
//                   placeholder="Card Holder Name"
//                   value={cardHolderName}
//                   onChangeText={handleCardHolderName}
//                   autoCapitalize="words"
//                   style={[
//                     pmStyles.input,
//                     nameError ? { borderColor: "#EF4444" } : null,
//                   ]}
//                   placeholderTextColor="#9CA3AF"
//                 />
//                 {nameError ? (
//                   <Text style={pmStyles.fieldError}>{nameError}</Text>
//                 ) : null}

//                 <CardField
//                   postalCodeEnabled={false}
//                   placeholders={{ number: "Card number", cvc: "CVC" }}
//                   cardStyle={{
//                     backgroundColor: "#FFFFFF",
//                     textColor: "#111827",
//                     borderColor: "#D1D5DB",
//                     borderWidth: 1,
//                     borderRadius: 10,
//                     fontSize: 16,
//                     placeholderColor: "#9CA3AF",
//                   }}
//                   style={pmStyles.cardField}
//                   onCardChange={handleCardChange}
//                 />

//                 {cardError ? (
//                   <Text style={pmStyles.cardErrorText}>{cardError}</Text>
//                 ) : null}

//                 <Text style={pmStyles.poweredBy}>
//                   Powered By <Text style={pmStyles.stripeBlue}>Stripe</Text>
//                 </Text>

//                 {/* Actions */}
//                 <View style={pmStyles.actionRow}>
//                   <TouchableOpacity
//                     style={[
//                       pmStyles.payBtn,
//                       (!isPaymentReady() || processing) &&
//                         pmStyles.payBtnDisabled,
//                     ]}
//                     onPress={handlePayment}
//                     disabled={!isPaymentReady() || processing}
//                   >
//                     {processing ? (
//                       <ActivityIndicator color="#fff" />
//                     ) : (
//                       <Text style={pmStyles.payBtnText}>
//                         Pay $
//                         {(selectedPlan === "full"
//                           ? fullPayAmount
//                           : splitUpfront
//                         ).toFixed(2)}
//                       </Text>
//                     )}
//                   </TouchableOpacity>

//                   <TouchableOpacity
//                     style={pmStyles.cancelBtn}
//                     onPress={() => !processing && setPaymentModalVisible(false)}
//                     disabled={processing}
//                   >
//                     <Text style={pmStyles.cancelBtnText}>Cancel</Text>
//                   </TouchableOpacity>
//                 </View>
//               </View>
//             </TouchableWithoutFeedback>
//           </View>
//         </TouchableWithoutFeedback>
//       </Modal>
//     </View>
//   );
// }

// // ─── Payment Modal Styles ─────────────────────────────────────────────────────
// const pmStyles = StyleSheet.create({
//   container: {
//     backgroundColor: "#fff",
//     borderRadius: 20,
//     padding: 12,
//     position: "relative",
//   },
//   headerRow: {
//     flexDirection: "row",
//     alignItems: "flex-start",
//     marginBottom: 4,
//   },
//   title: { fontSize: 16, fontWeight: "800", color: "#111827", marginBottom: 2 },
//   subtitle: { fontSize: 11, color: "#6B7280" },
//   securedBadge: {
//     flexDirection: "row",
//     alignItems: "center",
//     borderWidth: 1,
//     borderColor: "#E5E7EB",
//     borderRadius: 20,
//     paddingHorizontal: 7,
//     paddingVertical: 5,
//   },
//   securedText: { fontSize: 9, color: "#374151" },
//   stripeBlue: { color: "#6366F1", fontWeight: "700" },
//   closeBtn: {
//     position: "absolute",
//     top: 0,
//     right: 0,
//     padding: 14,
//     zIndex: 10,
//     backgroundColor: "#fff",
//     borderRadius: 20,
//   },
//   amountBar: {
//     backgroundColor: "#0A7C6E",
//     borderRadius: 12,
//     padding: 7,
//     flexDirection: "row",
//     justifyContent: "space-between",
//     alignItems: "center",
//     marginTop: 6,
//     marginBottom: 8,
//   },
//   amountBarTitle: {
//     color: "#fff",
//     fontSize: 12,
//     fontWeight: "600",
//     flex: 1,
//     marginRight: 8,
//   },
//   savedCardsScroll: {
//     maxHeight: 150,
//     marginBottom: 12,
//   },
//   savedCardsContent: {
//     paddingBottom: 8,
//   },
//   amountBarValue: { color: "#fff", fontSize: 15, fontWeight: "800" },
//   sectionLabel: {
//     fontSize: 14,
//     fontWeight: "700",
//     color: "#111827",
//     marginBottom: 3,
//   },
//   tabRow: { flexDirection: "row", gap: 10, marginBottom: 5 },
//   tabBtn: {
//     paddingVertical: 10,
//     paddingHorizontal: 18,
//     borderRadius: 10,
//     borderWidth: 1.5,
//   },
//   tabBtnActive: { backgroundColor: "#0A7C6E", borderColor: "#0A7C6E" },
//   tabBtnInactive: { backgroundColor: "#fff", borderColor: "#0A7C6E" },
//   tabLabel: { fontSize: 12, fontWeight: "700" },
//   tabLabelActive: { color: "#fff" },
//   tabLabelInactive: { color: "#0A7C6E" },
//   savedCardsBox: {
//     borderWidth: 1,
//     borderColor: "#E5E7EB",
//     borderRadius: 12,
//     padding: 8,
//     backgroundColor: "#F9FAFB",
//     marginBottom: 10,
//   },
//   savedCardRow: {
//     flexDirection: "row",
//     alignItems: "center",
//     backgroundColor: "#F3F4F6",
//     borderRadius: 10,
//     padding: 5,
//     marginBottom: 8,
//     borderWidth: 1.5,
//     borderColor: "#E5E7EB",
//   },
//   savedCardRowSelected: { borderColor: "#0A7C6E", backgroundColor: "#fff" },
//   radio: {
//     width: 18,
//     height: 18,
//     borderRadius: 9,
//     borderWidth: 2,
//     borderColor: "#9CA3AF",
//     marginRight: 12,
//     justifyContent: "center",
//     alignItems: "center",
//   },
//   radioActive: { borderColor: "#0A7C6E" },
//   radioDot: {
//     width: 10,
//     height: 10,
//     borderRadius: 5,
//     backgroundColor: "#0A7C6E",
//   },
//   cardName: { fontSize: 13, fontWeight: "700", color: "#111827" },
//   cardNumber: {
//     fontSize: 14,
//     color: "#374151",
//     letterSpacing: 1,
//     marginTop: 2,
//   },
//   cardExpiry: { fontSize: 11, color: "#6B7280", marginTop: 2 },
//   noCardsText: {
//     textAlign: "center",
//     color: "#9CA3AF",
//     fontSize: 12,
//     marginVertical: 14,
//   },
//   input: {
//     borderWidth: 1,
//     borderColor: "#D1D5DB",
//     borderRadius: 10,
//     padding: 10,
//     color: "#111827",
//     fontSize: 12,
//     backgroundColor: "#fff",
//     marginBottom: 5,
//   },
//   cardField: { width: "100%", height: 45, marginBottom: 6 },
//   fieldError: { color: "#EF4444", fontSize: 12, marginBottom: 8 },
//   cardErrorText: {
//     color: "#EF4444",
//     fontSize: 13,
//     textAlign: "center",
//     marginBottom: 8,
//   },
//   poweredBy: {
//     textAlign: "center",
//     fontSize: 10,
//     color: "#9CA3AF",
//     marginTop: 8,
//     marginBottom: 12,
//   },
//   actionRow: { flexDirection: "row", gap: 10, alignItems: "center" },
//   payBtn: {
//     flex: 1,
//     backgroundColor: "#0A7C6E",
//     borderRadius: 12,
//     paddingVertical: 14,
//     alignItems: "center",
//     justifyContent: "center",
//   },
//   payBtnDisabled: { backgroundColor: "#9CA3AF" },
//   payBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
//   cancelBtn: {
//     borderWidth: 1.5,
//     borderColor: "#D1D5DB",
//     borderRadius: 12,
//     paddingVertical: 14,
//     paddingHorizontal: 20,
//     alignItems: "center",
//   },
//   cancelBtnText: { color: "#374151", fontSize: 15, fontWeight: "600" },
// });

// // ─── Main Styles ──────────────────────────────────────────────────────────────
// const styles = StyleSheet.create({
//   container: { flex: 1, backgroundColor: "#030508", paddingTop: 55 },
//   header: {
//     flexDirection: "row",
//     justifyContent: "space-between",
//     alignItems: "center",
//     marginHorizontal: 16,
//   },
//   headerTitle: {
//     fontSize: 22,
//     fontWeight: "800",
//     color: "#fff",
//     letterSpacing: 0.5,
//   },
//   scrollContent: { padding: 16, paddingBottom: 100 },
//   card: {
//     backgroundColor: "#030508",
//     borderRadius: 24,
//     padding: 18,
//     marginBottom: 14,
//     borderWidth: 1,
//     borderColor: "rgba(255,255,255,0.12)",
//     shadowColor: "#000",
//     shadowOffset: { width: 0, height: 12 },
//     shadowOpacity: 0.25,
//     shadowRadius: 20,
//     elevation: 10,
//   },
//   cardSectionHeader: {
//     flexDirection: "row",
//     alignItems: "center",
//     marginBottom: 5,
//     gap: 10,
//   },
//   sectionTitle: { fontSize: 17, fontWeight: "800", color: "#fff" },
//   valueWrap: { flex: 2, alignItems: "flex-end" },
//   detailRow: {
//     flexDirection: "row",
//     alignItems: "flex-start",
//     marginBottom: 12,
//   },
//   label: {
//     color: "#dddd",
//     fontWeight: "700",
//     fontSize: 12,
//     marginBottom: 6,
//     width: 90,
//   },
//   inputCard: {
//     flex: 2,
//     backgroundColor: "#cdd4d8",
//     borderRadius: 7,
//     paddingVertical: 5,
//     paddingHorizontal: 10,
//   },
//   inputCardText: { fontSize: 12, color: "#030303", fontWeight: "700" },
//   rateCard: {
//     backgroundColor: "#030508",
//     borderRadius: 24,
//     padding: 18,
//     marginBottom: 18,
//     borderWidth: 1,
//     borderColor: "rgba(255,255,255,0.12)",
//   },
//   rowItem: {
//     flexDirection: "row",
//     justifyContent: "space-between",
//     alignItems: "flex-start",
//     marginVertical: 6,
//     width: "100%",
//     gap: 12,
//   },
//   rowLabel: { fontSize: 11, color: "#94A3B8", fontWeight: "600", flex: 1 },
//   rowValue: {
//     fontSize: 12,
//     color: "#fff",
//     fontWeight: "600",
//     textAlign: "right",
//   },
//   rateMainHeader: { marginBottom: 5, paddingBottom: 7 },
//   rateMainTitle: {
//     fontSize: 18,
//     fontWeight: "800",
//     color: "#fff",
//   },
//   rateMainSubtitle: { fontSize: 14, fontWeight: "600", color: "#76a4e0" },
//   noDataText: {
//     textAlign: "center",
//     paddingVertical: 30,
//     fontSize: 15,
//     color: "#6b7280",
//     fontStyle: "italic",
//   },
//   scheduleContainer: { gap: 10 },
//   shiftChip: {
//     flexDirection: "row",
//     alignItems: "center",
//     backgroundColor: "#e4f1f9",
//     borderRadius: 30,
//     padding: 5,
//     borderWidth: 1,
//     borderColor: "#E2E8F0",
//     marginLeft: 10,
//     paddingLeft: 20,
//     paddingRight: 10,
//   },
//   shiftDate: { fontSize: 12, fontWeight: "700", color: "#1E2937", width: 85 },
//   timeContainer: {
//     flex: 1,
//     flexDirection: "row",
//     alignItems: "center",
//     gap: 6,
//   },
//   timeText: { fontSize: 12, fontWeight: "700", color: "#0F172A" },
//   arrow: { fontSize: 16, color: "#64748B", fontWeight: "500" },
//   nextDayTag: {
//     fontSize: 11,
//     color: "#F59E0B",
//     backgroundColor: "#FEF3C7",
//     paddingHorizontal: 6,
//     paddingVertical: 2,
//     borderRadius: 4,
//     fontWeight: "600",
//     marginLeft: 4,
//   },
//   guardsBadge: {
//     flexDirection: "row",
//     alignItems: "center",
//     backgroundColor: "#EEF4FF",
//     paddingHorizontal: 8,
//     paddingVertical: 5,
//     borderRadius: 14,
//     gap: 4,
//   },
//   guardsCount: { fontSize: 12, fontWeight: "800", color: "#0A7C6E" },
//   noShiftsText: {
//     textAlign: "center",
//     color: "#94A3B8",
//     fontSize: 15,
//     padding: 20,
//   },

//   // ── Receipt-style breakdown block (matches the design mock) ──────────────
//   receiptCard: {
//     backgroundColor: "#fff",
//     borderRadius: 20,
//     padding: 20,
//     marginTop: 14,
//   },
//   receiptRow: {
//     flexDirection: "row",
//     justifyContent: "space-between",
//     alignItems: "center",
//     paddingVertical: 8,
//   },
//   receiptLabel: {
//     fontSize: 15,
//     fontWeight: "700",
//     color: "#334155",
//     fontFamily: courierFont,
//   } as any,
//   receiptValue: {
//     fontSize: 15,
//     fontWeight: "700",
//     color: "#334155",
//     fontFamily: courierFont,
//   } as any,
//   receiptDiscountLabel: {
//     fontSize: 14,
//     color: "#0A7C6E",
//     fontFamily: courierFont,
//   } as any,
//   receiptDiscountValue: {
//     fontSize: 14,
//     fontWeight: "700",
//     color: "#0A7C6E",
//     fontFamily: courierFont,
//   } as any,
//   receiptDashedDivider: {
//     borderBottomWidth: 1.5,
//     borderStyle: "dashed",
//     borderBottomColor: "#CBD5E1",
//     marginVertical: 6,
//   },
//   receiptTotalLabel: {
//     fontSize: 17,
//     fontWeight: "800",
//     color: "#0F172A",
//     fontFamily: courierFont,
//   } as any,
//   receiptTotalValue: {
//     fontSize: 17,
//     fontWeight: "800",
//     color: "#0F172A",
//     fontFamily: courierFont,
//   } as any,
//   receiptThickDivider: {
//     height: 2,
//     backgroundColor: "#0F172A",
//     marginVertical: 14,
//   },
//   receiptDueRow: {
//     flexDirection: "row",
//     justifyContent: "space-between",
//     alignItems: "center",
//   },
//   receiptDueLabel: {
//     fontSize: 18,
//     fontWeight: "800",
//     color: "#0A7C6E",
//     fontFamily: courierFont,
//   } as any,
//   receiptDueValue: {
//     fontSize: 24,
//     fontWeight: "900",
//     color: "#0A7C6E",
//     fontFamily: courierFont,
//   } as any,

//   paymentOptionsCard: {
//     backgroundColor: "#030508",
//     borderRadius: 24,
//     padding: 18,
//     marginBottom: 18,
//     borderWidth: 1,
//     borderColor: "rgba(255,255,255,0.10)",
//   },
//   paymentOptionsHeader: {
//     flexDirection: "row",
//     alignItems: "center",
//     gap: 10,
//     marginBottom: 16,
//   },
//   paymentOptionsTitle: { fontSize: 20, fontWeight: "700", color: "#fff" },
//   paymentOptionsRow: { flexDirection: "row", gap: 10 },
//   planSelectedDot: {
//     position: "absolute",
//     top: 10,
//     right: 10,
//     width: 20,
//     height: 20,
//     borderRadius: 10,
//     backgroundColor: "#0A7C6E",
//     alignItems: "center",
//     justifyContent: "center",
//   },
//   planTitleRow: {
//     flexDirection: "row",
//     alignItems: "center",
//     flexWrap: "wrap",
//     gap: 6,
//     marginBottom: 8,
//   },
//   planNameSelected: { color: "#0A7C6E" },
//   saveBadge: {
//     backgroundColor: "#16a34a",
//     paddingHorizontal: 7,
//     paddingVertical: 3,
//     borderRadius: 20,
//   },
//   saveBadgeText: { fontSize: 11, color: "#fff", fontWeight: "700" },
//   planAmountRow: {
//     flexDirection: "row",
//     alignItems: "baseline",
//     marginTop: "auto" as any,
//   },
//   planAmountLabel: { fontSize: 13, color: "#9ca3af" },
//   disabledButton: { opacity: 0.55 },
//   payNowButton: {
//     backgroundColor: "#0047FF",
//     borderRadius: 20,
//     paddingVertical: 14,
//     marginBottom: 20,
//     flexDirection: "row",
//     alignItems: "center",
//     justifyContent: "center",
//     shadowColor: "#0047FF",
//     shadowOffset: { width: 0, height: 10 },
//     shadowOpacity: 0.5,
//     shadowRadius: 20,
//     elevation: 12,
//   },
//   payNowText: { color: "#fff", fontSize: 18, fontWeight: "800" },
//   loadingContainer: {
//     flex: 1,
//     justifyContent: "center",
//     alignItems: "center",
//     backgroundColor: "#030508",
//   },
//   loadingText: { marginTop: 16, fontSize: 16, color: "#94A3B8" },
//   errorContainer: {
//     flex: 1,
//     justifyContent: "center",
//     alignItems: "center",
//     padding: 40,
//     backgroundColor: "#030508",
//   },
//   backButton: {
//     backgroundColor: "#0A7C6E",
//     paddingVertical: 14,
//     paddingHorizontal: 32,
//     borderRadius: 12,
//   },
//   backButtonText: { color: "white", fontSize: 16, fontWeight: "600" },
//   modalOverlay: {
//     flex: 1,
//     backgroundColor: "rgba(0,0,0,0.55)",
//     justifyContent: "center",
//     padding: 16,
//   },
//   policyText: { fontSize: 14, color: "#fff", flex: 1 },
//   policyLink: { color: "#0A7C6E", fontWeight: "700" },
//   noteText: { marginTop: 5, fontSize: 10, color: "#7c7a7a", lineHeight: 14 },

//   highlightText: {
//     fontSize: 15.5,
//     color: "#1e40af",
//     fontWeight: "600",
//     lineHeight: 24,
//     marginBottom: 6,
//   },

//   errorText: { color: "#EF4444", fontSize: 12, marginTop: 4, marginLeft: 4 },
//   rateSegmentCard: {
//     backgroundColor: "rgba(255,255,255,0.06)",
//     borderRadius: 18,
//     padding: 15,
//     marginBottom: 12,
//     borderWidth: 1,
//     borderColor: "rgba(255,255,255,0.08)",
//     width: "100%",
//   },
//   planCard: {
//     flex: 1,
//     backgroundColor: "rgba(255,255,255,0.06)",
//     borderRadius: 22,
//     padding: 16,
//     borderWidth: 1,
//     borderColor: "rgba(255,255,255,0.08)",
//     minHeight: 180,
//   },
//   planCardSelected: {
//     borderColor: "#89E7D0",
//     backgroundColor: "rgba(137,231,208,0.08)",
//   },
//   planName: { color: "#fff", fontSize: 16, fontWeight: "800" },
//   planDesc: { color: "#CBD5E1", fontSize: 12, lineHeight: 18 },
//   planAmount: { color: "#89E7D0", fontSize: 20, fontWeight: "900" },
//   planAmountSelected: { color: "#89E7D0" },
//   policyContainer: {
//     flexDirection: "row",
//     alignItems: "center",
//     backgroundColor: "#030508",
//     padding: 16,
//     borderRadius: 18,
//     borderWidth: 1,
//     borderColor: "rgba(255,255,255,0.08)",
//     marginBottom: 18,
//   },
//   checkbox: {
//     width: 24,
//     height: 24,
//     borderRadius: 8,
//     borderWidth: 2,
//     borderColor: "#89E7D0",
//     justifyContent: "center",
//     alignItems: "center",
//     marginRight: 12,
//   },
//   checkboxChecked: { backgroundColor: "#0A7C6E" },
//   editButton: {
//     borderWidth: 1.5,
//     borderColor: "#89E7D0",
//     borderRadius: 18,
//     paddingVertical: 16,
//     flexDirection: "row",
//     alignItems: "center",
//     justifyContent: "center",
//     backgroundColor: "rgba(255,255,255,0.05)",
//   },
//   editButtonText: { color: "#89E7D0", fontWeight: "700", fontSize: 16 },
//   detailsRow: {
//     flexDirection: "row",
//     justifyContent: "space-between",
//     paddingTop: 8,
//     borderTopWidth: 1,
//     borderTopColor: "rgba(255,255,255,0.08)",
//   },
//   detailColumn: { flex: 1 },
//   detailValue: { fontSize: 16, color: "#fff", fontWeight: "600" },
//   detailValueBold: { fontSize: 16, color: "#fff", fontWeight: "700" },

//   // Estimate UI Styles (Unmatched State)
//   estimateCard: {
//     backgroundColor: "#fff",
//     borderRadius: 18,
//     padding: 16,
//     marginBottom: 16,
//   },
//   estimateHeaderRow: {
//     flexDirection: "row",
//     alignItems: "center",
//     marginBottom: 12,
//     gap: 8,
//   },
//   estimateHeading: {
//     fontSize: 18,
//     fontWeight: "800",
//     color: "#0F172A",
//   },
//   infoBox: {
//     flexDirection: "row",
//     backgroundColor: "#E6F4F1",
//     padding: 12,
//     borderRadius: 12,
//     gap: 8,
//     marginBottom: 14,
//   },
//   infoBoxText: {
//     fontSize: 12,
//     color: "#0A7C6E",
//     flex: 1,
//     lineHeight: 18,
//   },
//   priceRangeBox: {
//     alignItems: "center",
//     backgroundColor: "#F8FAFC",
//     padding: 18,
//     borderRadius: 14,
//     borderWidth: 1,
//     borderColor: "#E2E8F0",
//   },
//   priceRangeTitle: {
//     fontSize: 16,
//     fontWeight: "700",
//     color: "#0F172A",
//     marginTop: 8,
//   },
//   priceRangeSubtitle: {
//     fontSize: 12,
//     color: "#64748B",
//     textAlign: "center",
//     marginTop: 4,
//     marginBottom: 12,
//   },
//   priceRangeValue: {
//     fontSize: 22,
//     fontWeight: "800",
//     color: "#0A7C6E",
//   },
//   reviewEstimateButton: {
//     backgroundColor: "#0047FF",
//     borderRadius: 20,
//     paddingVertical: 14,
//     marginBottom: 20,
//     flexDirection: "row",
//     alignItems: "center",
//     justifyContent: "center",
//   },
//   reviewEstimateButtonText: {
//     color: "#fff",
//     fontSize: 18,
//     fontWeight: "800",
//   },
//   confirmModalCard: {
//     backgroundColor: "#fff",
//     borderRadius: 20,
//     padding: 20,
//   },
//   confirmModalHeader: {
//     flexDirection: "row",
//     justifyContent: "space-between",
//     alignItems: "center",
//     marginBottom: 8,
//   },
//   confirmModalTitle: {
//     fontSize: 18,
//     fontWeight: "800",
//     color: "#111827",
//   },
//   confirmModalSubtitle: {
//     fontSize: 13,
//     color: "#6B7280",
//     marginBottom: 16,
//   },
//   confirmPriceBox: {
//     backgroundColor: "#F3F4F6",
//     borderRadius: 12,
//     padding: 16,
//     alignItems: "center",
//     marginBottom: 16,
//   },
//   confirmPriceCategory: {
//     fontSize: 12,
//     color: "#6B7280",
//     textTransform: "uppercase",
//     fontWeight: "700",
//   },
//   confirmPriceValue: {
//     fontSize: 22,
//     fontWeight: "800",
//     color: "#0A7C6E",
//     marginTop: 4,
//   },
//   confirmModalNote: {
//     fontSize: 12,
//     color: "#6B7280",
//     lineHeight: 18,
//     marginBottom: 20,
//   },
//   confirmModalActions: {
//     flexDirection: "row",
//   },
//   acceptPostBtn: {
//     flex: 1,
//     backgroundColor: "#0A7C6E",
//     borderRadius: 12,
//     paddingVertical: 14,
//     alignItems: "center",
//   },
//   acceptPostBtnText: {
//     color: "#fff",
//     fontSize: 16,
//     fontWeight: "700",
//   },

//   // ── Policy Modal (dark theme) ──────────────────────────────────────────────
//   modalContainer: {
//     flex: 1,
//     backgroundColor: COLORS.background, // #030508
//   },
//   modalHeader: {
//     backgroundColor: COLORS.surface, // #07111A
//     paddingHorizontal: 20,
//     paddingVertical: 16,
//     flexDirection: "row",
//     alignItems: "center",
//     justifyContent: "space-between",
//     borderBottomWidth: 1,
//     borderBottomColor: "rgba(255,255,255,0.08)",
//   },
//   headerLeft: {
//     flexDirection: "row",
//     alignItems: "center",
//     gap: 14,
//   },
//   modalLogo: {
//     width: 70,
//     height: 30,
//   },
//   modalTitle: {
//     fontSize: 15,
//     fontWeight: "700",
//     color: COLORS.text,
//   },
//   modalSubtitle: {
//     fontSize: 11,
//     color: COLORS.textSecondary,
//     marginTop: 2,
//   },
//   closeBtn: {
//     width: 36,
//     height: 36,
//     borderRadius: 18,
//     backgroundColor: COLORS.dangerBg,
//     alignItems: "center",
//     justifyContent: "center",
//   },
//   modalScroll: {
//     flex: 1,
//   },
//   modalScrollContent: {
//     padding: 20,
//     paddingBottom: 40,
//   },

//   // Meta card
//   highlightedInfo: {
//     backgroundColor: COLORS.card, // #0D1421
//     padding: 18,
//     borderRadius: 16,
//     marginBottom: 24,
//     borderWidth: 1,
//     borderColor: COLORS.primaryBorder,
//     borderLeftWidth: 4,
//     borderLeftColor: COLORS.primary,
//   },
//   metaTitle: {
//     fontSize: 15,
//     fontWeight: "800",
//     color: COLORS.primary,
//     marginBottom: 14,
//     lineHeight: 22,
//   },
//   metaRow: {
//     flexDirection: "row",
//     justifyContent: "space-between",
//     alignItems: "flex-start",
//     marginBottom: 8,
//     gap: 12,
//   },
//   metaLabel: {
//     fontSize: 12,
//     fontWeight: "700",
//     color: COLORS.textSecondary,
//     width: 110,
//     textTransform: "uppercase",
//     letterSpacing: 0.3,
//   },
//   metaValue: {
//     flex: 1,
//     fontSize: 14,
//     fontWeight: "600",
//     color: COLORS.text,
//     textAlign: "right",
//     lineHeight: 20,
//   },

//   // Body text
//   policyBodyText: {
//     fontSize: 14,
//     color: "#ffff",
//     lineHeight: 22,
//     letterSpacing: 0.15,
//     marginBottom: 8,
//   },

//   // Sections
//   termsSection: {
//     marginTop: 16,
//     backgroundColor: COLORS.card,
//     borderRadius: 14,
//     borderWidth: 1,
//     borderColor: "rgba(255,255,255,0.08)",
//     overflow: "hidden",
//   },
//   termsSectionHeader: {
//     flexDirection: "row",
//     alignItems: "center",
//     backgroundColor: "rgba(0,169,157,0.12)",
//     paddingVertical: 12,
//     paddingHorizontal: 14,
//     gap: 12,
//     borderBottomWidth: 1,
//     borderBottomColor: COLORS.primaryBorder,
//   },
//   termsNumberBadge: {
//     width: 28,
//     height: 28,
//     borderRadius: 8,
//     backgroundColor: COLORS.primary,
//     alignItems: "center",
//     justifyContent: "center",
//   },
//   termsNumberText: {
//     color: "#03211E",
//     fontSize: 14,
//     fontWeight: "800",
//   },
//   termsSectionTitle: {
//     flex: 1,
//     fontSize: 14,
//     fontWeight: "800",
//     color: COLORS.primary,
//     lineHeight: 20,
//   },
//   termsSectionBody: {
//     padding: 14,
//     fontSize: 14,
//     color: "#ffff",
//     lineHeight: 22,
//   },

//   lastUpdated: {
//     textAlign: "center",
//     marginTop: 28,
//     fontSize: 13,
//     color: COLORS.textMuted,
//     fontWeight: "500",
//   },

//   // Footer
//   modalFooter: {
//     paddingHorizontal: 20,
//     paddingVertical: 18,
//     backgroundColor: COLORS.surface,
//     borderTopWidth: 1,
//     borderTopColor: "rgba(255,255,255,0.08)",
//   },
//   acceptBtn: {
//     backgroundColor: COLORS.primary,
//     paddingVertical: 15,
//     borderRadius: 14,
//     alignItems: "center",
//     flexDirection: "row",
//     justifyContent: "center",
//     shadowColor: COLORS.primary,
//     shadowOffset: { width: 0, height: 6 },
//     shadowOpacity: 0.35,
//     shadowRadius: 12,
//     elevation: 8,
//   },
//   acceptBtnText: {
//     color: "#ffff",
//     fontSize: 15,
//     fontWeight: "800",
//   },
// });

import React, { useMemo, useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  SafeAreaView,
  Image,
  TouchableWithoutFeedback,
  Platform,
} from "react-native";
import {
  ChevronLeft,
  Files,
  ArrowLeft,
  Lock,
  Check,
  X,
  User,
  Info,
  Scale,
  CreditCard,
  Send,
} from "lucide-react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import Toast from "react-native-toast-message";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import {
  postJob,
  getUserProfile,
  holdPayment as holdPaymentAPI,
  getAuthToken,
  BASE_URL,
  JobPostPayload,
} from "../services/authApi";
import { CardField, createPaymentMethod } from "@stripe/stripe-react-native";

// ─── Types ────────────────────────────────────────────────────────────────────
interface RateSlot {
  day: number;
  night: number;
}

interface RatesConfig {
  charge: Record<string, RateSlot>;
}

interface ShiftSegment {
  label: string;
  hours: number;
  payRate: number;
  chargeRate: number;
}

interface CostBreakdown {
  chargeTotal: number;
  guardHours: number;
  breakdown: ShiftSegment[];
  totalShiftHours: number;
}

type PaymentPlan = "full" | "split";

type Card = {
  card_holder_name: string;
  card_number: string;
  expiry_month: string;
  expiry_year: string;
  payment_method_id?: string;
};

type JobTask = { id?: number; title?: string; completed?: boolean };

type RouteParams = {
  jobData?: {
    title?: string;
    category?: string;
    shifts?: Array<{
      date: Date;
      startTime: Date;
      endTime: Date;
      guardsCount: number;
    }>;
    startDate?: Date;
    startTime?: Date;
    endDate?: Date;
    endTime?: Date;
    location?: string;
    description?: string;
    lat?: number;
    lng?: number;
    guardsCount?: number;
    job_location_state?: string;
    jobLocationState?: string;
    tasks?: JobTask[];
    jobLevel?: string | number;
    totalManHours?: number;
    subtotal?: number;
    gstAmount?: number;
    totalQuotation?: number;
    discountAmount?: number;
    payableNow?: number;
    splitAmount?: number;
    totalAmount?: number;
    stateMatch?: boolean | null;
  };
  estimate?: {
    minPrice: number;
    maxPrice: number;
    isSegmented: boolean;
  };
  uploadedFileUrls?: string[];
  uploadedFileNames?: string[];
  selectedDocuments?: string[];
};

const courierFont = Platform.select({
  ios: "Courier New",
  android: "monospace",
});

const SEGMENT_LABELS: Record<string, string> = {
  weekday_day: "Mon–Fri (Day 06:00–18:00)",
  weekday_night: "Mon–Fri (Night 18:00–06:00)",
  sat_day: "Saturday (06:00–18:00)",
  sat_night: "Saturday (18:00–06:00)",
  sun_day: "Sunday (06:00–18:00)",
  sun_night: "Sunday (18:00–06:00)",
  pub_holi_day: "Public Holiday (Day 06:00–18:00)",
  pub_holi_night: "Public Holiday (Night 18:00–06:00)",
};

const DAY_TYPE_LABELS: Record<string, string> = {
  weekday: "Mon–Fri",
  sat: "Saturday",
  sun: "Sunday",
  pub_holi: "Public Holiday",
};

function getDayType(d: Date): string {
  const day = d.getDay();
  if (day === 0) return "sun";
  if (day === 6) return "sat";
  return "weekday";
}

function getSlot(hour: number): "day" | "night" {
  return hour >= 6 && hour < 18 ? "day" : "night";
}

function nextBoundary(t: Date): Date {
  const h = t.getHours();
  const n = new Date(t);
  n.setSeconds(0, 0);
  if (h < 6) {
    n.setHours(6, 0, 0, 0);
  } else if (h < 18) {
    n.setHours(18, 0, 0, 0);
  } else {
    n.setDate(n.getDate() + 1);
    n.setHours(0, 0, 0, 0);
  }
  return n;
}

function parseLocalDateTime(value: any): Date {
  if (value instanceof Date) return new Date(value);
  if (typeof value === "string") {
    const match = value.match(
      /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/,
    );
    if (match) {
      const [, year, month, day, hour, minute, second] = match;
      return new Date(
        Number(year),
        Number(month) - 1,
        Number(day),
        Number(hour),
        Number(minute),
        Number(second || "0"),
        0,
      );
    }
    const parsed = new Date(value);
    return isNaN(parsed.getTime()) ? new Date() : parsed;
  }
  const parsed = new Date(value);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
}

function normalizeShift(shift: any) {
  const start = parseLocalDateTime(shift.startTime);
  let end = parseLocalDateTime(shift.endTime);

  if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && end <= start) {
    end = new Date(end.getTime() + 24 * 60 * 60 * 1000);
  }

  return {
    ...shift,
    startTime: start,
    endTime: end,
    guardsCount: Number(shift.guardsCount || 1),
  };
}

function calcBreakdown(shiftsInput: any[], r: RatesConfig): CostBreakdown {
  if (!shiftsInput?.length) {
    return { chargeTotal: 0, guardHours: 0, breakdown: [], totalShiftHours: 0 };
  }

  const hMap = new Map<string, number>();
  const order: string[] = [];

  let totalGuardHours = 0;
  let totalShiftHours = 0;

  shiftsInput.forEach((shift) => {
    const normalized = normalizeShift(shift);
    const guards = Math.max(1, Number(normalized.guardsCount || 1));
    const startDt = normalized.startTime;
    const endDt = normalized.endTime;

    if (
      isNaN(startDt.getTime()) ||
      isNaN(endDt.getTime()) ||
      endDt <= startDt
    ) {
      return;
    }

    const shiftClockHours = (endDt.getTime() - startDt.getTime()) / 3_600_000;
    totalShiftHours += shiftClockHours;
    totalGuardHours += shiftClockHours * guards;

    let cursor = new Date(startDt);
    while (cursor < endDt) {
      const boundary = nextBoundary(cursor);
      const segEnd = boundary < endDt ? boundary : endDt;
      const segHours = (segEnd.getTime() - cursor.getTime()) / 3_600_000;
      if (segHours <= 0) break;

      const key = `${getDayType(cursor)}_${getSlot(cursor.getHours())}`;
      if (!hMap.has(key)) {
        hMap.set(key, 0);
        order.push(key);
      }
      hMap.set(key, (hMap.get(key) ?? 0) + segHours * guards);
      cursor = new Date(segEnd);
    }
  });

  const dayTypeOrder: string[] = [];
  order.forEach((k) => {
    const dayType = k.split("_").slice(0, -1).join("_");
    if (!dayTypeOrder.includes(dayType)) dayTypeOrder.push(dayType);
  });

  let totalCharge = 0;
  const bd: ShiftSegment[] = [];

  dayTypeOrder.forEach((dayType) => {
    const dayHours = hMap.get(`${dayType}_day`) ?? 0;
    const nightHours = hMap.get(`${dayType}_night`) ?? 0;
    const dayRate = r.charge[dayType]?.day ?? 0;
    const nightRate = r.charge[dayType]?.night ?? 0;

    if (dayRate === nightRate) {
      const mergedHours = dayHours + nightHours;
      if (mergedHours > 0) {
        totalCharge += mergedHours * dayRate;
        bd.push({
          label: DAY_TYPE_LABELS[dayType] ?? dayType,
          hours: mergedHours,
          payRate: 0,
          chargeRate: dayRate,
        });
      }
      return;
    }

    if (dayHours > 0) {
      totalCharge += dayHours * dayRate;
      bd.push({
        label: SEGMENT_LABELS[`${dayType}_day`] ?? `${dayType}_day`,
        hours: dayHours,
        payRate: 0,
        chargeRate: dayRate,
      });
    }
    if (nightHours > 0) {
      totalCharge += nightHours * nightRate;
      bd.push({
        label: SEGMENT_LABELS[`${dayType}_night`] ?? `${dayType}_night`,
        hours: nightHours,
        payRate: 0,
        chargeRate: nightRate,
      });
    }
  });

  return {
    chargeTotal: totalCharge,
    guardHours: totalGuardHours,
    breakdown: bd,
    totalShiftHours,
  };
}

// ─── Theme ─────────────────────────────────────────────────────────────────
// Core dark-app theme (as supplied).
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

// A handful of light-surface companions used for the "paper" style cards
// (receipts, estimate box, payment sheet) so those elements stay legible
// and coherent with the primary teal accent instead of using random grays.
const LIGHT = {
  card: "#FFFFFF",
  surface: "#F7FAFC",
  surfaceAlt: "#EDF3F5",
  border: "#E2E8F0",
  text: "#0F172A",
  textSecondary: "#5B6B7C",
  textMuted: "#94A3B8",
  warningBg: "#FDF1DC",
};

export default function ReviewConfirmScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const {
    jobData = {},
    uploadedFileUrls = [],
    uploadedFileNames = [],
    selectedDocuments = [],
    estimate,
  } = (route.params || {}) as RouteParams;

  const LOGO = require("../assets/staffoo.png");
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rates, setRates] = useState<RatesConfig | null>(null);
  const [ratesLoading, setRatesLoading] = useState(true);
  const [ratesError, setRatesError] = useState<string | null>(null);
  const [matchedRateRow, setMatchedRateRow] = useState<any>(null);
  const [acceptedPolicy, setAcceptedPolicy] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PaymentPlan>("full");
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [savedCards, setSavedCards] = useState<Card[]>([]);
  const [selectedSavedIndex, setSelectedSavedIndex] = useState(0);
  const [paymentTab, setPaymentTab] = useState<"saved" | "new">("saved");
  const [cardError, setCardError] = useState("");
  const [processing, setProcessing] = useState(false);
  const [cardComplete, setCardComplete] = useState(false);
  const [cardHolderName, setCardHolderName] = useState("");
  const [nameError, setNameError] = useState("");
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const isStateNotMatched = jobData.stateMatch === false;
  const contractorInvoice = jobData.stateMatch === true ? 1 : 0;
  const minPrice = Number(estimate?.minPrice ?? 0);
  const maxPrice = Number(estimate?.maxPrice ?? 0);
  const isSegmented = !!estimate?.isSegmented;
  const pad = (n: number) => String(n).padStart(2, "0");
  const getCategoryDisplay = (cat?: string) => {
    const map: Record<string, string> = {
      "event-security": "Event Security",
      "static-security": "Static Security Guard",
      "corporate-security": "Corporate Security",
      "site-patrol": "Site Patrol Security",
      others: "Others",
    };
    return map[cat ?? ""] ?? cat ?? "Not specified";
  };

  const capitalizeAllWords = (text = "") =>
    text
      .split(/(\s+|\/|\(|\))/)
      .map((part) =>
        !part.match(/[a-zA-Z]/)
          ? part
          : part
              .split(" ")
              .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
              .join(" "),
      )
      .join("");

  const handleCardHolderName = (text: string) => {
    const cleaned = text.replace(/[^a-zA-Z\s.-]/g, "");
    setCardHolderName(cleaned);
    if (cleaned.trim().length === 0) {
      setNameError("");
      return;
    }
    setNameError(cleaned.trim().length < 3 ? "Please enter valid name" : "");
  };

  const handleCardChange = (d: any) => {
    setCardComplete(!!d.complete);
    if (d.error) {
      setCardError(d.error.message);
    } else {
      setCardError("");
    }
  };

  const isPaymentReady = () => {
    return cardHolderName.trim().length >= 3 && cardComplete;
  };

  const getPaymentMethodId = async (): Promise<{
    id: string;
    holderName: string;
  } | null> => {
    setCardError("");
    const holderName = cardHolderName.trim();

    if (!holderName || holderName.length < 3) {
      setCardError("Card holder name is required.");
      return null;
    }
    if (!cardComplete) {
      setCardError("Please complete card details.");
      return null;
    }

    const { paymentMethod, error } = await createPaymentMethod({
      paymentMethodType: "Card",
      paymentMethodData: {
        billingDetails: { name: holderName },
      },
    });

    if (error) {
      setCardError(error.message || "Failed to create payment method");
      return null;
    }

    return { id: paymentMethod!.id, holderName };
  };

  const getChargeAmount = (total: number) => {
    return parseFloat(
      (selectedPlan === "full" ? total : total * 0.5).toFixed(2),
    );
  };

  const holdPayment = async (
    pmId: string,
    holderName: string,
  ): Promise<string> => {
    const user = JSON.parse((await AsyncStorage.getItem("user"))!);
    const formattedShifts = (jobData.shifts || []).map((shift: any) => {
      const s = new Date(shift.startTime);
      const e = new Date(shift.endTime);
      return {
        start: `${s.getFullYear()}-${pad(s.getMonth() + 1)}-${pad(
          s.getDate(),
        )}T${pad(s.getHours())}:${pad(s.getMinutes())}`,
        end: `${e.getFullYear()}-${pad(e.getMonth() + 1)}-${pad(
          e.getDate(),
        )}T${pad(e.getHours())}:${pad(e.getMinutes())}`,
        numberOfGuards: Number(shift.guardsCount || jobData.guardsCount || 1),
      };
    });

    const payload = {
      user_id: user.id,
      card_holder_name: holderName,
      payment_method_id: pmId,
      payment_option: selectedPlan,
      charge_amount: getChargeAmount(totalIncGST),
      shifts: formattedShifts,
      job_level: Number(jobData.jobLevel ?? 1),
      number_of_guards: jobData.guardsCount || 1,
      requires_110_buffer: true,
    };

    const res = await holdPaymentAPI(payload);
    if (!res?.success) throw new Error(res?.message || "Payment hold failed.");
    return res.payment.payment_intent_id;
  };

  const submitJob = async (intentId: string | null) => {
    const user = JSON.parse((await AsyncStorage.getItem("user"))!);

    const parseLocalDate = (value: any): Date => {
      if (!value) return new Date();
      if (value instanceof Date) return value;

      if (typeof value === "string") {
        if (value.includes("T")) return new Date(value);

        if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
          const [y, m, d] = value.split("-").map(Number);
          return new Date(y, m - 1, d);
        }
      }

      return new Date(value);
    };

    const formatTime = (ds: string) => {
      const d = new Date(ds);
      return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    const getStateFromAddress = (address: string): string => {
      if (!address) return "";

      const upper = address.toUpperCase();

      const pakistanMap: Record<string, string> = {
        PUNJAB: "punjab",
        SINDH: "sindh",
        "KHYBER PAKHTUNKHWA": "khyber pakhtunkhwa",
        KPK: "khyber pakhtunkhwa",
        BALOCHISTAN: "balochistan",
        "AZAD KASHMIR": "azad kashmir",
        "GILGIT BALTISTAN": "gilgit baltistan",

        LAHORE: "punjab",
        KARACHI: "sindh",
        ISLAMABAD: "islamabad capital territory",
        RAWALPINDI: "punjab",
        FAISALABAD: "punjab",
        MULTAN: "punjab",
        PESHAWAR: "khyber pakhtunkhwa",
        QUETTA: "balochistan",
      };

      const australiaMap: Record<string, string> = {
        VIC: "vic",
        VICTORIA: "vic",
        NSW: "nsw",
        "NEW SOUTH WALES": "nsw",
        QLD: "qld",
        QUEENSLAND: "qld",
        WA: "wa",
        "WESTERN AUSTRALIA": "wa",
        SA: "sa",
        "SOUTH AUSTRALIA": "sa",
        TAS: "tas",
        TASMANIA: "tas",
        ACT: "act",
        NT: "nt",
      };

      const parts = address
        .split(",")
        .map((p) => p.trim())
        .filter(Boolean);

      for (let i = parts.length - 1; i >= 0; i--) {
        const part = parts[i].toUpperCase();

        for (const [key, value] of Object.entries(pakistanMap)) {
          if (part.includes(key)) {
            return value;
          }
        }

        for (const [key, value] of Object.entries(australiaMap)) {
          if (part.includes(key)) {
            return value;
          }
        }
      }

      for (const [key, value] of Object.entries(pakistanMap)) {
        if (upper.includes(key)) {
          return value;
        }
      }

      for (const [key, value] of Object.entries(australiaMap)) {
        if (upper.includes(key)) {
          return value;
        }
      }

      if (upper.includes("PAKISTAN")) return "pakistan";
      if (upper.includes("AUSTRALIA")) return "australia";

      const lastPart = parts[parts.length - 1];
      if (lastPart && lastPart.length > 2 && !/^\d+$/.test(lastPart)) {
        return lastPart.toLowerCase();
      }

      return "";
    };

    const extractedState =
      jobData.jobLocationState || getStateFromAddress(jobData.location || "");

    const formattedShifts = (jobData.shifts || []).map((shift: any) => {
      const s = parseLocalDate(shift.startTime);
      let e = parseLocalDate(shift.endTime);

      if (e <= s) {
        e = new Date(e.getTime() + 24 * 60 * 60 * 1000);
      }

      return {
        start: `${s.getFullYear()}-${pad(s.getMonth() + 1)}-${pad(
          s.getDate(),
        )}T${pad(s.getHours())}:${pad(s.getMinutes())}`,
        end: `${e.getFullYear()}-${pad(e.getMonth() + 1)}-${pad(
          e.getDate(),
        )}T${pad(e.getHours())}:${pad(e.getMinutes())}`,
        numberOfGuards: Number(shift.guardsCount || 1),
      };
    });

    const filteredDocuments = (selectedDocuments || []).filter(
      (doc: string) => {
        const normalized = doc.toLowerCase().replace(/[_-]/g, " ").trim();
        return normalized !== "security license";
      },
    );

    const payload: JobPostPayload = {
      user_id: user.id,
      job_type: jobData.category || "others",
      description: jobData.description || "No description provided",
      address: jobData.location || "Not specified",
      coordinates: `${jobData.lat},${jobData.lng}`,
      state: extractedState || "open",
      posting_type: "broadcast",
      shifts: formattedShifts,
      job_level: Number(jobData.jobLevel ?? 1),
      payment_option: selectedPlan,
      job_location_state: extractedState,
      is_document: filteredDocuments.length > 0,
      document_list: uploadedFileUrls || [],
      document_types: filteredDocuments,
      job_instruction: jobData.description || "",
      tasks: (jobData.tasks || []).map((t: any) => ({
        task: t.task || t.title || "",
        task_start: t.task_start || formatTime(t.startTime),
        task_end: t.task_end || formatTime(t.endTime),
      })),
      payment_intent_id: isStateNotMatched
        ? "admin_override_no_payment"
        : intentId,
      contractor_invoice: contractorInvoice,
      ...(isStateNotMatched
        ? {
            financials: {
              estimated_min: parseFloat(minPrice.toFixed(2)),
              estimated_max: parseFloat(maxPrice.toFixed(2)),
              is_segmented: isSegmented,
            },
          }
        : {
            financials: {
              base_total_inc_gst: parseFloat(totalIncGST.toFixed(2)),
              discount_applied: selectedPlan === "full" ? discountAmount : 0,
              amount_to_charge_today: parseFloat(ctaAmount.toFixed(2)),
              balance_deferred:
                selectedPlan === "split"
                  ? parseFloat((totalIncGST * 0.5).toFixed(2))
                  : 0,
            },
          }),
    };

    console.log("[CREATE JOB PAYLOAD]", JSON.stringify(payload, null, 2));

    return postJob(payload);
  };

  const handlePayment = async () => {
    if (processing) return;
    setProcessing(true);
    setCardError("");
    try {
      const pm = await getPaymentMethodId();
      if (!pm) {
        setProcessing(false);
        return;
      }
      const intentId = await holdPayment(pm.id, pm.holderName);
      const response = await submitJob(intentId);
      Toast.show({
        type: "success",
        text1: "Job Posted!",
        text2: response?.message || "Job posted successfully.",
        position: "bottom",
      });
      setPaymentModalVisible(false);
      navigation.reset({
        index: 0,
        routes: [
          {
            name: "MainTabs" as const,
            state: {
              routes: [
                {
                  name: "Applications" as const,
                },
              ],
            },
          } as never,
        ],
      });
    } catch (err: any) {
      const msg =
        err?.response?.data?.message || err.message || "Something went wrong.";
      setCardError(msg);
      Toast.show({
        type: "error",
        text1: "Payment Failed",
        text2: msg,
        position: "bottom",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleAcceptAndPostUnmatched = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const response = await submitJob("admin_override_no_payment");
      Toast.show({
        type: "success",
        text1: "Job Posted!",
        text2: response?.message || "Job posted successfully.",
        position: "bottom",
      });
      setConfirmModalVisible(false);
      navigation.reset({
        index: 0,
        routes: [
          {
            name: "MainTabs" as const,
            state: {
              routes: [
                {
                  name: "Applications" as const,
                },
              ],
            },
          } as never,
        ],
      });
    } catch (err: any) {
      const msg =
        err?.response?.data?.message || err.message || "Something went wrong.";
      Toast.show({
        type: "error",
        text1: "Post Failed",
        text2: msg,
        position: "bottom",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditDetails = () => {
    (navigation as any).navigate("MainTabs", {
      screen: "CreateJob",
      params: {
        isEdit: true,
        jobData: jobData,
      },
    });
  };

  useEffect(() => {
    if (isStateNotMatched) {
      setRatesLoading(false);
      return;
    }

    (async () => {
      try {
        const token = await getAuthToken();
        if (!token) throw new Error("No auth token");

        const res = await axios.get(`${BASE_URL}/get-chargerates`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (
          !res.data?.success ||
          !Array.isArray(res.data?.data) ||
          res.data.data.length === 0
        ) {
          throw new Error("Invalid rates response");
        }

        const jobLevelNum = parseInt(String(jobData.jobLevel ?? "1"), 10) || 1;
        const matched =
          res.data.data.find(
            (item: any) => parseInt(String(item.level), 10) === jobLevelNum,
          ) ?? res.data.data[0];

        const r = matched;
        setMatchedRateRow(r);
        const builtRates: RatesConfig = {
          charge: {
            weekday: {
              day: Number(r.def_metro_mon_to_fri_day_rate || 0),
              night: Number(r.def_metro_mon_to_fri_night_rate || 0),
            },
            fri: {
              day: Number(r.def_metro_mon_to_fri_day_rate || 0),
              night: Number(r.def_metro_mon_to_fri_night_rate || 0),
            },
            sat: {
              day: Number(r.def_metro_sat_day_rate || 0),
              night: Number(r.def_metro_sat_night_rate || 0),
            },
            sun: {
              day: Number(r.def_metro_sun_day_rate || 0),
              night: Number(r.def_metro_sun_night_rate || 0),
            },
            pub_holi: {
              day: Number(r.def_metro_pub_holi_day_rate || 0),
              night: Number(r.def_metro_pub_holi_night_rate || 0),
            },
          },
        };

        setRates(builtRates);
      } catch (e: any) {
        const msg =
          e.response?.data?.message || e.message || "Failed to load rates";
        setRatesError(msg);
      } finally {
        setRatesLoading(false);
      }
    })();
  }, [jobData.jobLevel, isStateNotMatched]);

  const costBreakdown = useMemo(() => {
    const shifts = Array.isArray(jobData.shifts)
      ? jobData.shifts.map(normalizeShift)
      : [];

    if (!rates || !shifts.length) {
      return {
        chargeTotal: 0,
        guardHours: 0,
        breakdown: [],
        totalShiftHours: 0,
      };
    }
    return calcBreakdown(shifts, rates);
  }, [rates, jobData.shifts]);

  const totalBillableHours = costBreakdown.guardHours;
  const subtotal = costBreakdown.chargeTotal;
  const discountAmount = parseFloat((subtotal * 0.05).toFixed(2));
  const discountedSubtotal = parseFloat((subtotal - discountAmount).toFixed(2));
  const gst = parseFloat((discountedSubtotal * 0.1).toFixed(2));
  const fullPayAmount = parseFloat((discountedSubtotal + gst).toFixed(2));
  const gstNoDiscount = parseFloat((subtotal * 0.1).toFixed(2));
  const splitTotalIncGST = parseFloat((subtotal + gstNoDiscount).toFixed(2));
  const splitUpfront = parseFloat((splitTotalIncGST * 0.5).toFixed(2));
  const totalIncGST =
    selectedPlan === "full" ? fullPayAmount : splitTotalIncGST;
  const ctaAmount = selectedPlan === "full" ? fullPayAmount : splitUpfront;
  const openPaymentModal = () => {
    if (!acceptedPolicy) {
      Alert.alert("Required", "Please agree to the Terms & Conditions first.");
      return;
    }

    setPaymentModalVisible(true);
    setCardError("");
    setProcessing(false);
    setCardHolderName("");
    setCardComplete(false);
    setNameError("");

    (async () => {
      try {
        const u = await AsyncStorage.getItem("user");
        const userId = u ? JSON.parse(u).id : null;
        if (!userId) {
          setPaymentTab("new");
          return;
        }
        const profile = await getUserProfile(userId);
        if (profile?.success && profile?.data?.customer?.bank_details) {
          const parsed = JSON.parse(profile.data.customer.bank_details || "[]");
          if (Array.isArray(parsed) && parsed.length > 0) {
            setSavedCards(parsed);
            setSelectedSavedIndex(0);
            setPaymentTab("saved");
            setCardHolderName(parsed[0].card_holder_name || "");
          } else {
            setSavedCards([]);
            setPaymentTab("new");
          }
        } else {
          setSavedCards([]);
          setPaymentTab("new");
        }
      } catch {
        setSavedCards([]);
        setPaymentTab("new");
      }
    })();
  };

  const openConfirmModalUnmatched = () => {
    if (!acceptedPolicy) {
      Alert.alert("Required", "Please agree to the Terms & Conditions first.");
      return;
    }
    setConfirmModalVisible(true);
  };
  const CLIENT_TERMS_META = {
    title: "Customer / Client Terms of Service & Booking Agreement",
    version: "3.0 (2026 Legal Release)",
    operatedBy: "Capital Services Pty Ltd",
    abn: "48 613 317 838",
    registeredOffice: "21 Tanglewood Bvd, Truganina VIC 3029, Australia",
  };
  const CLIENT_TERMS_SECTIONS = [
    {
      number: "1",
      title: "Nature of Platform & Unrestricted Subcontracting Rights",
      body: `1.1 Technology Platform: Staffoo provides specialized Workforce Management (WFM) and Customer Relationship Management (CRM) technology enabling Clients to book, schedule, and coordinate security guarding, crowd control, and asset protection services.

1.2 Absolute Discretion to Fulfill via Resource Partners: The Client acknowledges and agrees that Capital Services Pty Ltd reserves the absolute right and discretion at all times to fulfill any booking requirement either directly or by engaging, assigning, or subcontracting the shift to an independent, licensed third-party security provider or staffing agency ("Resource Partner").

1.3 Jurisdictional & Licence Capacity Disclaimer: The existence or holding of a Master Security Licence or Labour Hire Licence by Capital Services Pty Ltd in any specific State or Territory shall not obligate Capital Services Pty Ltd to act as the principal direct service provider. In all jurisdictions and under all operational circumstances:
• Capital Services Pty Ltd may assign bookings to an authorized, fully licensed Resource Partner.
• Where a booking is assigned to a Resource Partner, the legal obligation for on-site security execution sits with the Resource Partner, and Staffoo acts as the technology platform and billing agent.
• The Client shall not hold Capital Services Pty Ltd liable for exercising its commercial right to utilize Resource Partners to fulfill booking requests.`,
    },
    {
      number: "2",
      title: "Bookings, Payment Holds & Automatic Settlement",
      body: `2.1 Payment Authorization: Upon requesting shift or roster coverage, the Client authorizes Staffoo to place an authorization hold or pre-charge on their designated payment method (processed securely via Stripe) for the full estimated booking total.

2.2 Escrow-Style Payment Release: Funds are held securely via the payment gateway upon shift completion. The Client is granted a twenty-four (24) hour review window post-shift to confirm digital timesheets or log an operational dispute via the Platform.

2.3 Automatic Confirmation: If no dispute or confirmation is lodged within twenty-four (24) hours post-shift, the shift timesheet is deemed automatically approved, and funds will be permanently released to the fulfilling provider.

2.4 Invoicing & Billing Agency: In instances where a Resource Partner fulfills the shift, invoices for the security guarding services are generated by or on behalf of the Resource Partner (under their Master Security Licence and ABN), with Staffoo acting as an authorized billing, collection, and technology intermediary agent.`,
    },
    {
      number: "3",
      title: "Client Workplace Health & Safety (WHS) Obligations",
      body: `3.1 Statutory Compliance: The Client must maintain a safe work environment compliant with all applicable Commonwealth, State, and Territory Workplace Health and Safety (WHS / OHS) legislation (including model WHS laws and the Occupational Health and Safety Act 2004 (Vic)).`,
    },
    {
      number: "4",
      title: "Cancellations, Shift Modifications & Disputes",
      body: `4.1 Minimum Notice Cancellation Fees: Cancellations made within the mandatory minimum notice window (as specified during the booking checkout flow) will attract a standardized cancellation fee to cover administrative overheads and guard mobilization costs.

4.2 Dispute Resolution Protocol: Operational disputes regarding guard attendance or performance must be submitted via the Platform within 24 hours post-shift, supported by time-stamped evidence. Staffoo will mediate disputes in good faith utilizing automated GPS geofencing, clock-in timestamps, and platform audit logs.`,
    },
    {
      number: "5",
      title: "Non-Solicitation & Anti-Poaching",
      body: `5.1 Non-Circumvention Period: The Client agrees that during active platform usage and for a period of six (6) months following the completion of any booking, it will not directly or indirectly engage, employ, solicit, or contract with any Resource Partner or individual guard introduced to the Client via Staffoo, outside of the Platform.`,
    },
    {
      number: "6",
      title: "Limitation of Liability, Statutory Warranties & Indemnity",
      body: `6.1 Australian Consumer Law (ACL): Nothing in these Terms excludes, restricts, or modifies any statutory guarantee, right, or remedy implied by Schedule 2 of the Competition and Consumer Act 2010 (Cth) that cannot be lawfully excluded.

6.2 Intermediary Liability Exclusion: To the maximum extent permitted by Australian law, where a booking is fulfilled by a Resource Partner, Staffoo excludes all liability for property damage, theft, personal injury, or indirect/consequential losses arising from the acts or omissions of the Resource Partner or its personnel.`,
    },
    {
      number: "7",
      title: "Governing Law & Jurisdiction",
      body: `7.1 Governing Law: These Terms are governed by and construed in accordance with the laws of the State of Victoria, Australia. The parties submit to the exclusive jurisdiction of the courts operating in Victoria.`,
    },
  ];

  const CLIENT_TERMS_INTRO = `These Customer Terms of Service ("Terms") govern the access to and use of the Staffoo web dashboard, mobile applications, and booking infrastructure (collectively, the "Platform"), operated by Capital Services Pty Ltd (ABN 48 613 317 838). By requesting, booking, or managing security personnel or workforce services through Staffoo, the user ("Client") agrees to be bound by these Terms.`;

  if (ratesLoading)
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading data…</Text>
      </View>
    );

  if (!isStateNotMatched && (ratesError || !rates))
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>
          Cannot load rates:{"\n"}
          {ratesError}
        </Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() =>
            (navigation as any).navigate("MainTabs", {
              screen: "CreateJob",
            })
          }
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handleEditDetails}
          style={styles.headerIconBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <ChevronLeft size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Review & Confirm</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <View style={styles.cardSectionHeader}>
            <View style={styles.sectionAccentBar} />
            <Text style={styles.sectionTitle}>Job Details</Text>
          </View>
          {[
            {
              label: "Job Type",
              value:
                jobData.title ||
                capitalizeAllWords(getCategoryDisplay(jobData.category)),
            },
            { label: "Location", value: jobData.location || "Not specified" },
            {
              label: "Description",
              value: jobData.description || "No description provided",
            },
          ].map(({ label, value }) => (
            <View style={styles.detailRow} key={label}>
              <Text style={styles.label}>{label}</Text>
              <View style={styles.inputCard}>
                <Text style={styles.inputCardText}>{value}</Text>
              </View>
            </View>
          ))}
          {uploadedFileUrls.length > 0 && (
            <View style={styles.detailRow}>
              <Text style={styles.label}>Attachments</Text>
              <View style={styles.inputCard}>
                {uploadedFileUrls.map((url, i) => (
                  <View
                    key={i}
                    style={[styles.attachmentRow, i === 0 && { marginTop: 0 }]}
                  >
                    <Files size={18} color={COLORS.primary} />
                    <Text style={styles.attachmentText} numberOfLines={1}>
                      {uploadedFileNames[i] ||
                        url.split("/").pop() ||
                        `File ${i + 1}`}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>

        <View style={styles.card}>
          <View style={styles.cardSectionHeader}>
            <View style={styles.sectionAccentBar} />
            <Text style={styles.sectionTitle}>Schedule Summary</Text>
          </View>
          <View style={styles.scheduleContainer}>
            {jobData.shifts?.length ? (
              jobData.shifts.map((shift: any, index: number) => {
                const start = new Date(shift.startTime);
                const end = new Date(shift.endTime);
                const isNextDay =
                  end.getDate() !== start.getDate() ||
                  end.getMonth() !== start.getMonth();
                return (
                  <View key={index} style={styles.shiftChip}>
                    <Text style={styles.shiftDate}>
                      {start.toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                      })}
                    </Text>
                    <View style={styles.timeContainer}>
                      <Text style={styles.timeText}>
                        {start.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: false,
                        })}
                      </Text>
                      <Text style={styles.arrow}>→</Text>
                      <Text style={styles.timeText}>
                        {end.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: false,
                        })}
                      </Text>
                      {isNextDay && <Text style={styles.nextDayTag}>+1d</Text>}
                    </View>
                    <View style={styles.guardsBadge}>
                      <User size={14} color={COLORS.primary} />
                      <Text style={styles.guardsCount}>
                        {shift.guardsCount || 1}
                      </Text>
                    </View>
                  </View>
                );
              })
            ) : (
              <Text style={styles.noShiftsText}>No shifts added</Text>
            )}
          </View>
        </View>

        {isStateNotMatched ? (
          /* UNMATCHED STATE FLOW: Estimate UI */
          <View style={styles.estimateCard}>
            <View style={styles.estimateHeaderRow}>
              <CreditCard size={20} color={LIGHT.text} />
              <Text style={styles.estimateHeading}>Job Estimate</Text>
            </View>

            <View style={styles.infoBox}>
              <Info size={16} color={COLORS.primary} style={{ marginTop: 1 }} />
              <Text style={styles.infoBoxText}>
                No payment is required at this stage. Once the estimated range
                is accepted, the job will be broadcast. You will be notified
                when payment is required.
              </Text>
            </View>

            <View style={styles.priceRangeBox}>
              <Scale size={40} color={COLORS.primary} />
              <Text style={styles.priceRangeTitle}>Estimated Price Range</Text>
              <Text style={styles.priceRangeSubtitle}>
                {isSegmented
                  ? "This location uses segmented day/night rates."
                  : "This location doesn't use segmented day/night rates. The final price will fall within this range."}
              </Text>
              <Text style={styles.priceRangeValue}>
                ${minPrice.toFixed(2)} – ${maxPrice.toFixed(2)}
              </Text>
            </View>
          </View>
        ) : (
          /* MATCHED STATE FLOW: Full Quotation Breakdown & Split Payment Options */
          <>
            {/* ── Rate Breakdown ─────────────────────────────────────────────── */}
            <View style={styles.rateCard}>
              <View style={styles.rateMainHeader}>
                <View style={styles.sectionAccentBar} />
                <Text style={styles.rateMainTitle}>Quotation Breakdown</Text>
              </View>

              {costBreakdown.breakdown.length === 0 ? (
                <Text style={styles.noDataText}>
                  No breakdown available — check shift dates and times.
                </Text>
              ) : (
                <>
                  {costBreakdown.breakdown.map((item, i) => (
                    <View key={i} style={styles.rateSegmentCard}>
                      <View style={styles.rowItem}>
                        <Text style={styles.rowLabel}>Service</Text>
                        <View style={styles.valueWrap}>
                          <Text style={styles.rowValue}>{item.label}</Text>
                        </View>
                      </View>

                      <View style={styles.detailsRow}>
                        <View style={styles.detailColumn}>
                          <Text style={styles.rowLabel}>Billable Hours</Text>
                          <Text style={styles.detailValue}>
                            {item.hours.toFixed(2)}
                          </Text>
                        </View>
                        <View style={styles.detailColumn}>
                          <Text style={styles.rowLabel}>Unit Price</Text>
                          <Text style={styles.detailValue}>
                            ${item.chargeRate.toFixed(2)}
                          </Text>
                        </View>
                        <View style={styles.detailColumn}>
                          <Text style={styles.rowLabel}>Subtotal</Text>
                          <Text style={styles.detailValueBold}>
                            ${(item.chargeRate * item.hours).toFixed(2)}
                          </Text>
                        </View>
                      </View>
                    </View>
                  ))}

                  {/* ── Receipt-style totals block ─────────────────────────── */}
                  <View style={styles.receiptCard}>
                    <View style={styles.receiptRow}>
                      <Text style={styles.receiptLabel}>Subtotal</Text>
                      <Text style={styles.receiptValue}>
                        ${subtotal.toFixed(2)}
                      </Text>
                    </View>

                    {selectedPlan === "full" && discountAmount > 0 && (
                      <>
                        <View style={styles.receiptRow}>
                          <Text style={styles.receiptDiscountLabel}>
                            Discount (5%)
                          </Text>
                          <Text style={styles.receiptDiscountValue}>
                            -${discountAmount.toFixed(2)}
                          </Text>
                        </View>

                        <View style={styles.receiptDashedDivider} />

                        <View style={styles.receiptRow}>
                          <Text style={styles.receiptLabel}>
                            Discounted Subtotal
                          </Text>
                          <Text style={styles.receiptValue}>
                            ${discountedSubtotal.toFixed(2)}
                          </Text>
                        </View>
                      </>
                    )}

                    <View style={styles.receiptRow}>
                      <Text style={styles.receiptLabel}>GST</Text>
                      <Text style={styles.receiptValue}>
                        $
                        {selectedPlan === "full"
                          ? gst.toFixed(2)
                          : gstNoDiscount.toFixed(2)}
                      </Text>
                    </View>

                    {selectedPlan === "split" && (
                      <View style={styles.receiptRow}>
                        <Text style={styles.receiptLabel}>
                          Split Payment (50% now)
                        </Text>
                        <Text style={styles.receiptValue}>
                          ${splitUpfront.toFixed(2)}
                        </Text>
                      </View>
                    )}

                    <View style={styles.receiptDashedDivider} />

                    <View style={styles.receiptRow}>
                      <Text style={styles.receiptTotalLabel}>Total</Text>
                      <Text style={styles.receiptTotalValue}>
                        ${totalIncGST.toFixed(2)}
                      </Text>
                    </View>

                    <View style={styles.receiptThickDivider} />

                    <View style={styles.receiptDueRow}>
                      <Text style={styles.receiptDueLabel}>Due Now</Text>
                      <Text style={styles.receiptDueValue}>
                        ${ctaAmount.toFixed(2)}
                      </Text>
                    </View>
                  </View>
                </>
              )}
            </View>

            <View style={styles.paymentOptionsCard}>
              <View style={styles.paymentOptionsHeader}>
                <View style={styles.sectionAccentBar} />
                <Text style={styles.paymentOptionsTitle}>Payment Options</Text>
              </View>
              <View style={styles.paymentOptionsRow}>
                {(["full", "split"] as PaymentPlan[]).map((plan) => (
                  <TouchableOpacity
                    key={plan}
                    style={[
                      styles.planCard,
                      selectedPlan === plan && styles.planCardSelected,
                    ]}
                    onPress={() => setSelectedPlan(plan)}
                    activeOpacity={0.85}
                  >
                    {selectedPlan === plan && (
                      <View style={styles.planSelectedDot}>
                        <Check size={10} color={COLORS.text} />
                      </View>
                    )}
                    <View style={styles.planTitleRow}>
                      <Text
                        style={[
                          styles.planName,
                          selectedPlan === plan && styles.planNameSelected,
                        ]}
                      >
                        {plan === "full"
                          ? "Pay In Full"
                          : "Split Payment (50/50)"}
                      </Text>
                      {plan === "full" && (
                        <View style={styles.saveBadge}>
                          <Text style={styles.saveBadgeText}>Save 5%</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.planDesc}>
                      {plan === "full"
                        ? "Pay the total amount now and receive an instant 5% discount on your booking."
                        : "Pay 50% upfront to secure guards. The remaining 50% is charged upon shift completion."}
                    </Text>
                    <View style={styles.planAmountRow}>
                      <Text
                        style={[
                          styles.planAmount,
                          selectedPlan === plan && styles.planAmountSelected,
                        ]}
                      >
                        $
                        {plan === "full"
                          ? fullPayAmount.toFixed(2)
                          : splitUpfront.toFixed(2)}
                      </Text>
                      <Text style={styles.planAmountLabel}>
                        {plan === "full" ? " Total" : " Upfront"}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </>
        )}

        <TouchableOpacity
          style={styles.policyContainer}
          onPress={() => setAcceptedPolicy(!acceptedPolicy)}
          activeOpacity={0.85}
        >
          <View
            style={[styles.checkbox, acceptedPolicy && styles.checkboxChecked]}
          >
            {acceptedPolicy && <Check size={16} color={COLORS.text} />}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.policyText}>
              I agree to the{" "}
              <Text
                style={styles.policyLink}
                onPress={(e) => {
                  e.stopPropagation();
                  setShowPolicyModal(true);
                }}
              >
                Terms & Conditions
              </Text>
            </Text>
            {!isStateNotMatched && (
              <Text style={styles.noteText}>
                *Note: A 10% incidental authorisation hold may be applied by
                Stripe to cover potential unplanned overtime. The hold will be
                released after completion of the shift.
              </Text>
            )}
          </View>
        </TouchableOpacity>

        {isStateNotMatched ? (
          <TouchableOpacity
            style={[
              styles.reviewEstimateButton,
              (!acceptedPolicy || isSubmitting) && styles.disabledButton,
            ]}
            onPress={openConfirmModalUnmatched}
            disabled={!acceptedPolicy || isSubmitting}
            activeOpacity={0.9}
          >
            <Send size={18} color={COLORS.text} style={{ marginRight: 10 }} />
            <Text style={styles.reviewEstimateButtonText}>
              Review Estimate & Post
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[
              styles.payNowButton,
              (!acceptedPolicy || isSubmitting) && styles.disabledButton,
            ]}
            onPress={openPaymentModal}
            disabled={!acceptedPolicy || isSubmitting}
            activeOpacity={0.9}
          >
            <Lock size={20} color={COLORS.text} style={{ marginRight: 10 }} />
            <Text style={styles.payNowText}>
              {selectedPlan === "full"
                ? `Pay $${fullPayAmount.toFixed(2)} & Post Job`
                : `Pay $${splitUpfront.toFixed(2)} & Post Job`}
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.editButton}
          onPress={handleEditDetails}
          activeOpacity={0.85}
        >
          <ArrowLeft size={20} color={COLORS.primary} />
          <Text style={styles.editButtonText}>Edit Details</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal
        visible={showPolicyModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPolicyModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          {/* ── Header ── */}
          <View style={styles.modalHeader}>
            <View style={styles.headerLeft}>
              <Image
                source={LOGO}
                style={styles.modalLogo}
                resizeMode="contain"
              />
              <View>
                <Text style={styles.modalTitle}>Privacy Policy & Terms</Text>
                <Text style={styles.modalSubtitle}>
                  Staffoo • Legal Documents
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => setShowPolicyModal(false)}
              style={styles.closeBtn}
              activeOpacity={0.7}
            >
              <X size={18} color={COLORS.danger} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.modalScroll}
            contentContainerStyle={styles.modalScrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Meta card */}
            <View style={styles.highlightedInfo}>
              <Text style={styles.metaTitle}>{CLIENT_TERMS_META.title}</Text>

              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Version</Text>
                <Text style={styles.metaValue}>
                  {CLIENT_TERMS_META.version}
                </Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Operated by</Text>
                <Text style={styles.metaValue}>
                  {CLIENT_TERMS_META.operatedBy}
                </Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>ABN</Text>
                <Text style={styles.metaValue}>{CLIENT_TERMS_META.abn}</Text>
              </View>
              <View style={[styles.metaRow, { marginBottom: 0 }]}>
                <Text style={styles.metaLabel}>Registered office</Text>
                <Text style={styles.metaValue}>
                  {CLIENT_TERMS_META.registeredOffice}
                </Text>
              </View>
            </View>

            {/* Intro */}
            <Text style={styles.policyBodyText}>{CLIENT_TERMS_INTRO}</Text>

            {/* Sections */}
            {CLIENT_TERMS_SECTIONS.map((section) => (
              <View key={section.number} style={styles.termsSection}>
                <View style={styles.termsSectionHeader}>
                  <View style={styles.termsNumberBadge}>
                    <Text style={styles.termsNumberText}>{section.number}</Text>
                  </View>
                  <Text style={styles.termsSectionTitle}>{section.title}</Text>
                </View>
                <Text style={styles.termsSectionBody}>{section.body}</Text>
              </View>
            ))}

            <Text style={styles.lastUpdated}>
              {CLIENT_TERMS_META.operatedBy} • ABN {CLIENT_TERMS_META.abn}
            </Text>
          </ScrollView>

          {/* Footer */}
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.acceptBtn}
              activeOpacity={0.85}
              onPress={() => {
                setAcceptedPolicy(true);
                setShowPolicyModal(false);
              }}
            >
              <Check
                size={20}
                color={COLORS.text}
                style={{ marginRight: 10 }}
              />
              <Text style={styles.acceptBtnText}>
                I Accept the Terms & Privacy Policy
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      <Modal
        visible={confirmModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => !isSubmitting && setConfirmModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.confirmModalCard}>
            <View style={styles.confirmModalHeader}>
              <Text style={styles.confirmModalTitle}>
                Confirm Estimated Price
              </Text>
              <TouchableOpacity
                onPress={() => !isSubmitting && setConfirmModalVisible(false)}
                disabled={isSubmitting}
              >
                <X size={20} color={LIGHT.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.confirmModalSubtitle}>
              This job's final price will fall within the estimated range below.
            </Text>

            <View style={styles.confirmPriceBox}>
              <Text style={styles.confirmPriceCategory}>
                {jobData.category || "Job"}
              </Text>
              <Text style={styles.confirmPriceValue}>
                ${minPrice.toFixed(2)} – ${maxPrice.toFixed(2)}
              </Text>
            </View>

            <Text style={styles.confirmModalNote}>
              No payment is required at this stage. Once the job is accepted,
              the final payment invoice will be emailed to you and published in
              the app, where you can complete the payment process.
            </Text>

            <View style={styles.confirmModalActions}>
              <TouchableOpacity
                style={[
                  styles.acceptPostBtn,
                  isSubmitting && styles.disabledButton,
                ]}
                onPress={handleAcceptAndPostUnmatched}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color={COLORS.text} />
                ) : (
                  <Text style={styles.acceptPostBtnText}>
                    Accept Price & Post Job
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={paymentModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => !processing && setPaymentModalVisible(false)}
      >
        <TouchableWithoutFeedback
          onPress={() => !processing && setPaymentModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={pmStyles.container}>
                {/* Header */}
                <View style={pmStyles.headerRow}>
                  <View>
                    <Text style={pmStyles.title}>Complete Payment</Text>
                    <Text style={pmStyles.subtitle}>
                      Direct payment to the service provider.
                    </Text>
                  </View>
                  <View style={pmStyles.securedBadge}>
                    <Lock size={12} color="#6366F1" />
                    <Text style={pmStyles.securedText}>
                      Secured By <Text style={pmStyles.stripeBlue}>Stripe</Text>
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={pmStyles.closeBtn}
                  onPress={() => !processing && setPaymentModalVisible(false)}
                  disabled={processing}
                >
                  <X size={22} color={LIGHT.textSecondary} />
                </TouchableOpacity>

                {/* Amount Bar */}
                <View style={pmStyles.amountBar}>
                  <Text style={pmStyles.amountBarTitle} numberOfLines={1}>
                    {jobData.title ||
                      capitalizeAllWords(
                        getCategoryDisplay(jobData.category),
                      ) ||
                      "Security Service"}
                  </Text>
                  <Text style={pmStyles.amountBarValue}>
                    $
                    {(selectedPlan === "full"
                      ? fullPayAmount
                      : splitUpfront
                    ).toFixed(2)}
                  </Text>
                </View>

                <Text style={pmStyles.sectionLabel}>Payment Method</Text>

                {/* Tabs */}
                <View style={pmStyles.tabRow}>
                  {(["saved", "new"] as const).map((tab) => (
                    <TouchableOpacity
                      key={tab}
                      style={[
                        pmStyles.tabBtn,
                        paymentTab === tab
                          ? pmStyles.tabBtnActive
                          : pmStyles.tabBtnInactive,
                      ]}
                      onPress={() => {
                        setPaymentTab(tab);
                        setCardError("");
                        if (tab === "saved" && savedCards.length > 0) {
                          setCardHolderName(
                            savedCards[selectedSavedIndex]?.card_holder_name ||
                              "",
                          );
                        } else if (tab === "new") {
                          setCardHolderName("");
                          setCardComplete(false);
                        }
                      }}
                    >
                      <Text
                        style={[
                          pmStyles.tabLabel,
                          paymentTab === tab
                            ? pmStyles.tabLabelActive
                            : pmStyles.tabLabelInactive,
                        ]}
                      >
                        {tab === "saved" ? "Use Saved Card" : "Enter New Card"}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {paymentTab === "saved" && (
                  <ScrollView
                    style={pmStyles.savedCardsScroll}
                    contentContainerStyle={pmStyles.savedCardsContent}
                    showsVerticalScrollIndicator={false}
                  >
                    {savedCards.length === 0 ? (
                      <Text style={pmStyles.noCardsText}>
                        No saved cards available. Please enter new card details
                        below.
                      </Text>
                    ) : (
                      <View style={pmStyles.savedCardsBox}>
                        {savedCards.map((item, index) => (
                          <TouchableOpacity
                            key={index}
                            style={[
                              pmStyles.savedCardRow,
                              selectedSavedIndex === index &&
                                pmStyles.savedCardRowSelected,
                            ]}
                            onPress={() => {
                              setSelectedSavedIndex(index);
                              setCardHolderName(item.card_holder_name || "");
                            }}
                          >
                            <View
                              style={[
                                pmStyles.radio,
                                selectedSavedIndex === index &&
                                  pmStyles.radioActive,
                              ]}
                            >
                              {selectedSavedIndex === index && (
                                <View style={pmStyles.radioDot} />
                              )}
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={pmStyles.cardName}>
                                {item.card_holder_name?.toUpperCase()}
                              </Text>
                              <Text style={pmStyles.cardNumber}>
                                {item.card_number?.slice(0, 4)} **** ****{" "}
                                {item.card_number?.slice(-4)}
                              </Text>
                              {item.expiry_month && item.expiry_year && (
                                <Text style={pmStyles.cardExpiry}>
                                  Expires {item.expiry_month}/{item.expiry_year}
                                </Text>
                              )}
                            </View>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </ScrollView>
                )}

                <Text style={pmStyles.sectionLabel}>Card Details</Text>

                <TextInput
                  placeholder="Card Holder Name"
                  value={cardHolderName}
                  onChangeText={handleCardHolderName}
                  autoCapitalize="words"
                  style={[
                    pmStyles.input,
                    nameError ? { borderColor: COLORS.danger } : null,
                  ]}
                  placeholderTextColor={LIGHT.textMuted}
                />
                {nameError ? (
                  <Text style={pmStyles.fieldError}>{nameError}</Text>
                ) : null}

                <CardField
                  postalCodeEnabled={false}
                  placeholders={{ number: "Card number", cvc: "CVC" }}
                  cardStyle={{
                    backgroundColor: LIGHT.card,
                    textColor: LIGHT.text,
                    borderColor: LIGHT.border,
                    borderWidth: 1,
                    borderRadius: 10,
                    fontSize: 16,
                    placeholderColor: LIGHT.textMuted,
                  }}
                  style={pmStyles.cardField}
                  onCardChange={handleCardChange}
                />

                {cardError ? (
                  <Text style={pmStyles.cardErrorText}>{cardError}</Text>
                ) : null}

                <Text style={pmStyles.poweredBy}>
                  Powered By <Text style={pmStyles.stripeBlue}>Stripe</Text>
                </Text>

                {/* Actions */}
                <View style={pmStyles.actionRow}>
                  <TouchableOpacity
                    style={[
                      pmStyles.payBtn,
                      (!isPaymentReady() || processing) &&
                        pmStyles.payBtnDisabled,
                    ]}
                    onPress={handlePayment}
                    disabled={!isPaymentReady() || processing}
                  >
                    {processing ? (
                      <ActivityIndicator color={COLORS.text} />
                    ) : (
                      <Text style={pmStyles.payBtnText}>
                        Pay $
                        {(selectedPlan === "full"
                          ? fullPayAmount
                          : splitUpfront
                        ).toFixed(2)}
                      </Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={pmStyles.cancelBtn}
                    onPress={() => !processing && setPaymentModalVisible(false)}
                    disabled={processing}
                  >
                    <Text style={pmStyles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

// ─── Payment Modal Styles ─────────────────────────────────────────────────────
const pmStyles = StyleSheet.create({
  container: {
    backgroundColor: LIGHT.card,
    borderRadius: 22,
    padding: 14,
    position: "relative",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 6,
    paddingRight: 30,
  },
  title: {
    fontSize: 17,
    fontWeight: "800",
    color: LIGHT.text,
    marginBottom: 2,
  },
  subtitle: { fontSize: 12, color: LIGHT.textSecondary },
  securedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: LIGHT.border,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  securedText: { fontSize: 9, color: LIGHT.textSecondary },
  stripeBlue: { color: "#6366F1", fontWeight: "700" },
  closeBtn: {
    position: "absolute",
    top: 0,
    right: 0,
    padding: 14,
    zIndex: 10,
    backgroundColor: LIGHT.card,
    borderRadius: 20,
  },
  amountBar: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    marginBottom: 10,
  },
  amountBarTitle: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
    marginRight: 8,
  },
  savedCardsScroll: {
    maxHeight: 150,
    marginBottom: 12,
  },
  savedCardsContent: {
    paddingBottom: 8,
  },
  amountBarValue: { color: COLORS.text, fontSize: 16, fontWeight: "800" },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: LIGHT.text,
    marginBottom: 6,
    marginTop: 4,
  },
  tabRow: { flexDirection: "row", gap: 10, marginBottom: 8 },
  tabBtn: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  tabBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  tabBtnInactive: { backgroundColor: LIGHT.card, borderColor: COLORS.primary },
  tabLabel: { fontSize: 12, fontWeight: "700" },
  tabLabelActive: { color: COLORS.text },
  tabLabelInactive: { color: COLORS.primary },
  savedCardsBox: {
    borderWidth: 1,
    borderColor: LIGHT.border,
    borderRadius: 12,
    padding: 8,
    backgroundColor: LIGHT.surface,
    marginBottom: 10,
  },
  savedCardRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: LIGHT.surfaceAlt,
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: LIGHT.border,
  },
  savedCardRowSelected: {
    borderColor: COLORS.primary,
    backgroundColor: LIGHT.card,
  },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: LIGHT.textMuted,
    marginRight: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  radioActive: { borderColor: COLORS.primary },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
  },
  cardName: { fontSize: 13, fontWeight: "700", color: LIGHT.text },
  cardNumber: {
    fontSize: 14,
    color: LIGHT.textSecondary,
    letterSpacing: 1,
    marginTop: 2,
  },
  cardExpiry: { fontSize: 11, color: LIGHT.textMuted, marginTop: 2 },
  noCardsText: {
    textAlign: "center",
    color: LIGHT.textMuted,
    fontSize: 12,
    marginVertical: 14,
  },
  input: {
    borderWidth: 1,
    borderColor: LIGHT.border,
    borderRadius: 10,
    padding: 12,
    color: LIGHT.text,
    fontSize: 13,
    backgroundColor: LIGHT.card,
    marginBottom: 6,
  },
  cardField: { width: "100%", height: 45, marginBottom: 6 },
  fieldError: { color: COLORS.danger, fontSize: 12, marginBottom: 8 },
  cardErrorText: {
    color: COLORS.danger,
    fontSize: 13,
    textAlign: "center",
    marginBottom: 8,
  },
  poweredBy: {
    textAlign: "center",
    fontSize: 10,
    color: LIGHT.textMuted,
    marginTop: 8,
    marginBottom: 12,
  },
  actionRow: { flexDirection: "row", gap: 10, alignItems: "center" },
  payBtn: {
    flex: 1,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  payBtnDisabled: { backgroundColor: LIGHT.textMuted },
  payBtnText: { color: COLORS.text, fontSize: 16, fontWeight: "700" },
  cancelBtn: {
    borderWidth: 1.5,
    borderColor: LIGHT.border,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  cancelBtnText: {
    color: LIGHT.textSecondary,
    fontSize: 15,
    fontWeight: "600",
  },
});

// ─── Main Styles ──────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, paddingTop: 55 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 4,
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: COLORS.text,
    letterSpacing: 0.3,
  },
  scrollContent: { padding: 16, paddingBottom: 100 },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 6,
  },
  cardSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
    gap: 10,
  },
  sectionAccentBar: {
    width: 4,
    height: 16,
    borderRadius: 2,
    backgroundColor: COLORS.primary,
  },
  sectionTitle: { fontSize: 16, fontWeight: "800", color: COLORS.text },
  valueWrap: { flex: 2, alignItems: "flex-end" },
  detailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  label: {
    color: COLORS.textSecondary,
    fontWeight: "700",
    fontSize: 12,
    marginTop: 8,
    width: 90,
  },
  inputCard: {
    flex: 2,
    backgroundColor: LIGHT.surfaceAlt,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  inputCardText: { fontSize: 13, color: LIGHT.text, fontWeight: "600" },
  attachmentRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
  },
  attachmentText: {
    marginLeft: 8,
    color: COLORS.primary,
    flexShrink: 1,
    fontSize: 13,
    fontWeight: "600",
  },
  rateCard: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  rowItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginVertical: 6,
    width: "100%",
    gap: 12,
  },
  rowLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: "600",
    flex: 1,
  },
  rowValue: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: "700",
    textAlign: "right",
  },
  rateMainHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },
  rateMainTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: COLORS.text,
  },
  rateMainSubtitle: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  noDataText: {
    textAlign: "center",
    paddingVertical: 30,
    fontSize: 14,
    color: COLORS.textSecondary,
    fontStyle: "italic",
  },
  scheduleContainer: { gap: 10 },
  shiftChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: LIGHT.surfaceAlt,
    borderRadius: 26,
    padding: 6,
    borderWidth: 1,
    borderColor: LIGHT.border,
    paddingLeft: 16,
    paddingRight: 10,
  },
  shiftDate: { fontSize: 12, fontWeight: "700", color: LIGHT.text, width: 78 },
  timeContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  timeText: { fontSize: 12, fontWeight: "700", color: LIGHT.text },
  arrow: { fontSize: 16, color: LIGHT.textSecondary, fontWeight: "500" },
  nextDayTag: {
    fontSize: 11,
    color: "#B45309",
    backgroundColor: LIGHT.warningBg,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontWeight: "700",
    marginLeft: 4,
  },
  guardsBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primaryGlow,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 14,
    gap: 4,
  },
  guardsCount: { fontSize: 12, fontWeight: "800", color: COLORS.primary },
  noShiftsText: {
    textAlign: "center",
    color: COLORS.textSecondary,
    fontSize: 14,
    padding: 20,
  },

  // ── Receipt-style breakdown block ─────────────────────────────────────────
  receiptCard: {
    backgroundColor: LIGHT.card,
    borderRadius: 18,
    padding: 20,
    marginTop: 14,
  },
  receiptRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  receiptLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: LIGHT.textSecondary,
    fontFamily: courierFont,
  } as any,
  receiptValue: {
    fontSize: 15,
    fontWeight: "700",
    color: LIGHT.text,
    fontFamily: courierFont,
  } as any,
  receiptDiscountLabel: {
    fontSize: 14,
    color: COLORS.primary,
    fontFamily: courierFont,
  } as any,
  receiptDiscountValue: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.primary,
    fontFamily: courierFont,
  } as any,
  receiptDashedDivider: {
    borderBottomWidth: 1.5,
    borderStyle: "dashed",
    borderBottomColor: LIGHT.border,
    marginVertical: 6,
  },
  receiptTotalLabel: {
    fontSize: 17,
    fontWeight: "800",
    color: LIGHT.text,
    fontFamily: courierFont,
  } as any,
  receiptTotalValue: {
    fontSize: 17,
    fontWeight: "800",
    color: LIGHT.text,
    fontFamily: courierFont,
  } as any,
  receiptThickDivider: {
    height: 2,
    backgroundColor: LIGHT.text,
    marginVertical: 14,
  },
  receiptDueRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  receiptDueLabel: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.primary,
    fontFamily: courierFont,
  } as any,
  receiptDueValue: {
    fontSize: 24,
    fontWeight: "900",
    color: COLORS.primary,
    fontFamily: courierFont,
  } as any,

  paymentOptionsCard: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  paymentOptionsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
  },
  paymentOptionsTitle: { fontSize: 18, fontWeight: "800", color: COLORS.text },
  paymentOptionsRow: { flexDirection: "row", gap: 10 },
  planSelectedDot: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  planTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 8,
  },
  planNameSelected: { color: COLORS.primary },
  saveBadge: {
    backgroundColor: COLORS.success,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 20,
  },
  saveBadgeText: { fontSize: 11, color: COLORS.text, fontWeight: "700" },
  planAmountRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginTop: "auto" as any,
  },
  planAmountLabel: { fontSize: 13, color: COLORS.textSecondary },
  disabledButton: { opacity: 0.5 },
  payNowButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 18,
    paddingVertical: 16,
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  payNowText: { color: COLORS.text, fontSize: 17, fontWeight: "800" },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
  },
  loadingText: { marginTop: 16, fontSize: 15, color: COLORS.textSecondary },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
    backgroundColor: COLORS.background,
  },
  backButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  backButtonText: { color: COLORS.text, fontSize: 16, fontWeight: "700" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    padding: 16,
  },
  policyText: { fontSize: 14, color: COLORS.text, flex: 1, lineHeight: 20 },
  policyLink: { color: COLORS.primary, fontWeight: "700" },
  noteText: {
    marginTop: 6,
    fontSize: 11,
    color: COLORS.textSecondary,
    lineHeight: 16,
  },

  highlightText: {
    fontSize: 15.5,
    color: COLORS.primary,
    fontWeight: "600",
    lineHeight: 24,
    marginBottom: 6,
  },

  errorText: {
    color: COLORS.danger,
    fontSize: 13,
    marginTop: 4,
    marginLeft: 4,
  },
  rateSegmentCard: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 16,
    padding: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    width: "100%",
  },
  planCard: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    minHeight: 180,
  },
  planCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryGlow,
  },
  planName: { color: COLORS.text, fontSize: 15, fontWeight: "800" },
  planDesc: { color: COLORS.textSecondary, fontSize: 12, lineHeight: 18 },
  planAmount: { color: COLORS.primary, fontSize: 20, fontWeight: "900" },
  planAmountSelected: { color: COLORS.primary },
  policyContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    marginBottom: 16,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  checkboxChecked: { backgroundColor: COLORS.primary },
  editButton: {
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primaryGlow,
    gap: 8,
  },
  editButtonText: { color: COLORS.primary, fontWeight: "700", fontSize: 15 },
  detailsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 10,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
  },
  detailColumn: { flex: 1 },
  detailValue: { fontSize: 15, color: COLORS.text, fontWeight: "600" },
  detailValueBold: { fontSize: 15, color: COLORS.primary, fontWeight: "800" },

  // Estimate UI Styles (Unmatched State)
  estimateCard: {
    backgroundColor: LIGHT.card,
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
  },
  estimateHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 8,
  },
  estimateHeading: {
    fontSize: 18,
    fontWeight: "800",
    color: LIGHT.text,
  },
  infoBox: {
    flexDirection: "row",
    backgroundColor: COLORS.primaryGlow,
    padding: 12,
    borderRadius: 12,
    gap: 8,
    marginBottom: 14,
  },
  infoBoxText: {
    fontSize: 12,
    color: "#046358",
    flex: 1,
    lineHeight: 18,
  },
  priceRangeBox: {
    alignItems: "center",
    backgroundColor: LIGHT.surface,
    padding: 20,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: LIGHT.border,
  },
  priceRangeTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: LIGHT.text,
    marginTop: 8,
  },
  priceRangeSubtitle: {
    fontSize: 12,
    color: LIGHT.textSecondary,
    textAlign: "center",
    marginTop: 4,
    marginBottom: 12,
    lineHeight: 17,
  },
  priceRangeValue: {
    fontSize: 24,
    fontWeight: "800",
    color: COLORS.primary,
  },
  reviewEstimateButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 18,
    paddingVertical: 16,
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  reviewEstimateButtonText: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: "800",
  },
  confirmModalCard: {
    backgroundColor: LIGHT.card,
    borderRadius: 20,
    padding: 20,
  },
  confirmModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  confirmModalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: LIGHT.text,
  },
  confirmModalSubtitle: {
    fontSize: 13,
    color: LIGHT.textSecondary,
    marginBottom: 16,
    lineHeight: 18,
  },
  confirmPriceBox: {
    backgroundColor: LIGHT.surfaceAlt,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginBottom: 16,
  },
  confirmPriceCategory: {
    fontSize: 12,
    color: LIGHT.textSecondary,
    textTransform: "uppercase",
    fontWeight: "700",
  },
  confirmPriceValue: {
    fontSize: 22,
    fontWeight: "800",
    color: COLORS.primary,
    marginTop: 4,
  },
  confirmModalNote: {
    fontSize: 12,
    color: LIGHT.textSecondary,
    lineHeight: 18,
    marginBottom: 20,
  },
  confirmModalActions: {
    flexDirection: "row",
  },
  acceptPostBtn: {
    flex: 1,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  acceptPostBtnText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "700",
  },

  // ── Policy Modal (dark theme) ──────────────────────────────────────────────
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  modalHeader: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  modalLogo: {
    width: 70,
    height: 30,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.text,
  },
  modalSubtitle: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.dangerBg,
    alignItems: "center",
    justifyContent: "center",
  },
  modalScroll: {
    flex: 1,
  },
  modalScrollContent: {
    padding: 20,
    paddingBottom: 40,
  },

  // Meta card
  highlightedInfo: {
    backgroundColor: COLORS.card,
    padding: 18,
    borderRadius: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  metaTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: COLORS.primary,
    marginBottom: 14,
    lineHeight: 22,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
    gap: 12,
  },
  metaLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.textSecondary,
    width: 110,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  metaValue: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
    textAlign: "right",
    lineHeight: 20,
  },

  // Body text
  policyBodyText: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 22,
    letterSpacing: 0.15,
    marginBottom: 8,
  },

  // Sections
  termsSection: {
    marginTop: 16,
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    overflow: "hidden",
  },
  termsSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primaryGlow,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.primaryBorder,
  },
  termsNumberBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  termsNumberText: {
    color: "#03211E",
    fontSize: 14,
    fontWeight: "800",
  },
  termsSectionTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.primary,
    lineHeight: 20,
  },
  termsSectionBody: {
    padding: 14,
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 22,
  },

  lastUpdated: {
    textAlign: "center",
    marginTop: 28,
    fontSize: 13,
    color: COLORS.textMuted,
    fontWeight: "500",
  },

  // Footer
  modalFooter: {
    paddingHorizontal: 20,
    paddingVertical: 18,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
  },
  acceptBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  acceptBtnText: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "800",
  },
});
