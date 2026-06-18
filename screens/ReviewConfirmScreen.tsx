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
//   FlatList,
//   TextInput,
//   SafeAreaView,
//   Image,
//   TouchableWithoutFeedback,
//   Platform,
// } from "react-native";
// import {
//   ChevronLeft,
//   FileText,
//   Files,
//   ShieldCheck,
//   CheckCircle,
//   ArrowLeft,
//   CreditCard,
//   Lock,
//   Check,
//   X,
//   DollarSign,
//   Zap,
//   Split,
//   Users,
//   User,
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
// } from "../services/authApi";
// import { CardField, createPaymentMethod } from "@stripe/stripe-react-native";

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

// type JobTask = {
//   id?: number;
//   title?: string;
//   completed?: boolean;
// };

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
//     tasks?: JobTask[];

//     jobLevel?: string | number;

//     // ✅ Financial values coming from CreateJobScreen
//     totalManHours?: number;
//     subtotal?: number;
//     gstAmount?: number;
//     totalQuotation?: number;
//     discountAmount?: number;
//     payableNow?: number;
//     splitAmount?: number;
//     totalAmount?: number;
//   };

//   uploadedFileUrls?: string[];
//   uploadedFileNames?: string[];
//   selectedDocuments?: string[];
// };
// const courierFont = Platform.select({
//   ios: "Courier New",
//   android: "monospace",
// });
// const COLORS = {
//   primary: "#001F3F", // deep navy
//   secondary: "#003566", // rich blue
//   accent: "#0A7C6E", // teal
//   accentLight: "#DFF7F3",
//   success: "#16A34A",
//   warning: "#F59E0B",

//   background: "#F4F7FB",
//   card: "#FFFFFF",

//   text: "#0F172A",
//   textSoft: "#64748B",

//   border: "#D6E0EA",

//   lightBlue: "#EEF5FF",
//   softCard: "#F8FBFF",
// };
// export default function ReviewConfirmScreen() {
//   const navigation = useNavigation();
//   const route = useRoute();

//   const {
//     jobData = {},
//     uploadedFileUrls = [],
//     uploadedFileNames = [],
//     selectedDocuments = [],
//   } = (route.params || {}) as RouteParams;

//   // Extract financial values with fallbacks
//   const subtotalFromCreate = Number(jobData.subtotal || 0);
//   const gstFromCreate = Number(jobData.gstAmount || 0);
//   const totalQuotationFromCreate = Number(jobData.totalQuotation || 0);
//   const discountFromCreate = Number(jobData.discountAmount || 0);
//   const payableNowFromCreate = Number(jobData.payableNow || 0);
//   const splitAmountFromCreate = Number(jobData.splitAmount || 0);

//   const PRIVACY_POLICY_TEXT = `Staffoo: Terms of Service & Privacy Policy
// Effective Date: March 14, 2026

// Operated by: Capital Services Pty Ltd
// ABN: 48 613 317 838
// Registered Office: 21 Tanglewood Bvd, Truganina VIC 3029, Australia

// Part 1: Privacy Policy
// 1.1 Overview
// Staffoo (operated by Capital Services Pty Ltd) is committed to protecting the privacy of our customers, contractors, and staff in accordance with the Privacy Act 1988 (Cth) and the Australian Privacy Principles (APPs).

// 1.2 Information Collection & GPS Tracking
// Customer Data: We collect business details, site addresses, contact information, and service requirements.
// Workforce Data: We collect identity documents, ABNs, State-specific Security Licenses, and certifications.
// GPS Movement Tracking: To ensure site security, lone-worker safety, and proof-of-attendance, Staffoo tracks the GPS location of all staff and contractors. This tracking is active only while a user is "Clocked In" for a shift. By using the app, workforce users consent to real-time location monitoring for the duration of their work assignment.

// 1.3 Payment Security (Stripe)
// Staffoo does not store sensitive financial or credit card data. All transactions are processed via Stripe, a secure third-party gateway. Stripe handles all data in compliance with PCI-DSS standards.

// Part 2: Terms for Customers
// 2.1 Booking and Payment Holds
// Authorization: Upon job acceptance by a staff member or contractor, a payment hold (pre-authorization) will be placed on the customer’s nominated card via Stripe.
// Amount: The hold will be equal to the total value specified in the approved quotation or invoice.
// Final Charge: Funds are captured upon shift completion or as determined by the cancellation policy.

// 2.2 Cancellation & Refund Policy
// Standard Cancellation: Cancellations made more than 24 hours before the shift start time are eligible for a full release of the payment hold.
// The "1-Hour Rule": In accordance with Australian security industry standards, if a customer cancels a job within one (1) hour of the scheduled start time, a minimum charge of four (4) hours will be deducted from the held funds to compensate the assigned personnel.

// Part 3: Workforce Compliance (Staff & Contractors)
// 3.1 National Licensing & Credentials
// Valid Credentials: All personnel must hold a current and valid Security License for the specific State or Territory in which they are performing services.
// ABN Requirements: Independent contractors must maintain a valid ABN and hold any required Business or Master Licensing relevant to their jurisdiction.
// Updates: It is the individual’s responsibility to ensure licenses and First Aid certifications are kept up to date within the Staffoo app.

// 3.2 Safety and Reporting
// Personnel must comply with the Work Health and Safety (WHS) laws applicable to their location. Any incidents or hazards must be logged immediately via the Staffoo app for client transparency.

// Part 4: Code of Conduct
// Reliability: Arrive at least 10 minutes prior to shift start. Repeat lateness or "no-shows" will result in removal from the platform.
// Professionalism: High-visibility vests or specified corporate attire must be worn at all times while on duty.
// GPS Integrity: Personnel must ensure location services are enabled during shifts. Any attempt to spoof or block GPS location will result in immediate termination of the assignment.
// Sobriety: A zero-tolerance policy applies to alcohol or illegal substances.
// Confidentiality: Personnel must protect all customer site data, access codes, and internal floor plans.

// Part 5: Contact Information
// For support or administrative inquiries, please contact Capital Services Pty Ltd:
// Admin Office: 21 Tanglewood Bvd, Truganina VIC 3029
// Email: [staffoo.com.au]
// Phone: [1800782366]`;

//   const [showPolicyModal, setShowPolicyModal] = useState(false);
//   const [isSubmitting, setIsSubmitting] = useState(false);
//   const [rates, setRates] = useState<RatesConfig | null>(null);
//   const [ratesLoading, setRatesLoading] = useState(true);
//   const [ratesError, setRatesError] = useState<string | null>(null);
//   const BASE_URL = "https://apis.staffoo.com.au/api";
//   const [acceptedPolicy, setAcceptedPolicy] = useState(false);
//   const [selectedPlan, setSelectedPlan] = useState<PaymentPlan>("full");

//   const [paymentModalVisible, setPaymentModalVisible] = useState(false);
//   const [savedCards, setSavedCards] = useState<Card[]>([]);
//   const [selectedSavedIndex, setSelectedSavedIndex] = useState(0);
//   const [paymentTab, setPaymentTab] = useState<"saved" | "new">("saved");
//   const [cardError, setCardError] = useState("");
//   const [processing, setProcessing] = useState(false);
//   const [cardComplete, setCardComplete] = useState(false);
//   // const [cardHolder, setCardHolder] = useState('');
//   const extractedState = jobData.location?.split(",").pop()?.trim() || "";
//   const LOGO = require("../assets/staffoo.png");
//   const SEGMENT_LABELS: Record<string, string> = {
//     weekday_day: "Mon–Fri Day (06:00–18:00)",
//     weekday_night: "Mon–Fri Night (18:00–06:00)",
//     fri_day: "Friday Day (06:00–18:00)",
//     fri_night: "Friday Night (18:00–06:00)",
//     sat_day: "Saturday Day (06:00–18:00)",
//     sat_night: "Saturday Night (18:00–06:00)",
//     sun_day: "Sunday Day (06:00–18:00)",
//     sun_night: "Sunday Night (18:00–06:00)",
//     pub_holi_day: "Public Holiday Day (06:00–18:00)",
//     pub_holi_night: "Public Holiday Night (18:00–06:00)",
//   };

//   const getCategoryDisplay = (cat?: string) => {
//     const map: Record<string, string> = {
//       "event-security": "Event Security",
//       "static-security": "Static Security Guard",
//       "corporate-security": "Corporate Security",
//       "site-patrol": "Site Patrol Security",
//       others: "Others",
//     };
//     return map[cat || ""] || cat || "Not specified";
//   };

//   const pad = (n: number) => String(n).padStart(2, "0");

//   // FIXED: Reading from precise Dates directly supplied by updated CreateJobScreen
//   const buildTimes = () => {
//     const s = new Date(jobData.startTime as Date);
//     const e = new Date(jobData.endTime as Date);
//     const fmt = (d: Date, sec = false) =>
//       `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
//         d.getHours(),
//       )}:${pad(d.getMinutes())}${sec ? ":00" : ""}`;
//     return {
//       startStr: fmt(s),
//       endStr: fmt(e),
//       startStrSec: fmt(s, true),
//       endStrSec: fmt(e, true),
//     };
//   };

//   const [cardHolderName, setCardHolderName] = useState("");
//   const [nameError, setNameError] = useState("");
//   const [manualCardNumber, setManualCardNumber] = useState("");
//   const [manualCardError, setManualCardError] = useState("");

//   const handleCardHolderName = (text: string) => {
//     // Allow only letters, spaces, dot and hyphen
//     const cleanedText = text.replace(/[^a-zA-Z\s.-]/g, "");

//     setCardHolderName(cleanedText);

//     // Don't show error while typing
//     if (cleanedText.trim().length === 0) {
//       setNameError("");
//       return;
//     }

//     // Validate only when enough text entered
//     if (cleanedText.trim().length < 3) {
//       setNameError("Please enter valid name");
//     } else {
//       setNameError("");
//     }
//   };

//   const getPaymentMethodId = async (): Promise<{
//     id: string;
//     holderName: string;
//   } | null> => {
//     setCardError("");
//     if (paymentTab === "saved") {
//       const card = savedCards[selectedSavedIndex];
//       if (!card?.payment_method_id) {
//         setCardError("Selected card has no payment method ID.");
//         return null;
//       }
//       return { id: card.payment_method_id, holderName: card.card_holder_name };
//     }
//     if (!cardHolderName.trim()) {
//       setCardError("Card holder name is required.");
//       return null;
//     }
//     if (!cardComplete) {
//       setCardError("Please enter complete card details.");
//       return null;
//     }

//     try {
//       const { paymentMethod, error } = await createPaymentMethod({
//         paymentMethodType: "Card",
//         paymentMethodData: { billingDetails: { name: cardHolderName.trim() } },
//       });
//       if (error) {
//         setCardError(error.message || "Failed to create payment method");
//         return null;
//       }
//       if (!paymentMethod) {
//         setCardError("No payment method returned.");
//         return null;
//       }
//       return { id: paymentMethod.id, holderName: cardHolderName.trim() };
//     } catch (err: any) {
//       setCardError(err.message || "Stripe error");
//       return null;
//     }
//   };

//   const getChargeAmount = (total: number): number => {
//     if (selectedPlan === "full") return parseFloat((total * 0.95).toFixed(2));
//     return parseFloat((total * 0.5).toFixed(2));
//   };

//   const holdPayment = async (
//     pmId: string,
//     holderName: string,
//   ): Promise<string> => {
//     const user = JSON.parse((await AsyncStorage.getItem("user"))!);

//     // Format shifts exactly like the successful payload
//     const formattedShifts = (jobData.shifts || []).map((shift: any) => {
//       const start = new Date(shift.startTime);
//       const end = new Date(shift.endTime);

//       return {
//         start: `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(
//           start.getDate(),
//         )}T${pad(start.getHours())}:${pad(start.getMinutes())}`,
//         end: `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(
//           end.getDate(),
//         )}T${pad(end.getHours())}:${pad(end.getMinutes())}`,
//         numberOfGuards: Number(shift.guardsCount || jobData.guardsCount || 1),
//       };
//     });

//     const chargeAmount = getChargeAmount(totalIncGST);

//     const payload = {
//       user_id: user.id,
//       card_holder_name: holderName,
//       payment_method_id: pmId,
//       payment_option: selectedPlan, // 'full' or 'split'
//       charge_amount: chargeAmount,
//       shifts: formattedShifts, // ← This is the key addition
//       job_level: Number(jobData.jobLevel ?? 1),
//       // You can keep these if the backend still needs them as fallback:
//       // start: formattedShifts[0]?.start,
//       // end: formattedShifts[formattedShifts.length - 1]?.end,
//       number_of_guards: jobData.guardsCount || 1,
//       requires_110_buffer: true, // as seen in your log
//     };

//     console.log("[HOLD PAYMENT PAYLOAD]", JSON.stringify(payload, null, 2));

//     const res = await holdPaymentAPI(payload);
//     if (!res?.success) throw new Error(res?.message || "Payment hold failed.");
//     return res.payment.payment_intent_id;
//   };
//   const submitJob = async (intentId: string | null) => {
//     const user = JSON.parse((await AsyncStorage.getItem("user"))!);

//     const parseLocalDate = (value: any): Date => {
//       if (!value) return new Date();

//       if (value instanceof Date) return value;

//       // ISO string
//       if (typeof value === "string") {
//         if (value.includes("T")) {
//           return new Date(value); // Let JS parse ISO properly
//         }
//         // YYYY-MM-DD format
//         if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
//           const [year, month, day] = value.split("-").map(Number);
//           return new Date(year, month - 1, day);
//         }
//       }

//       return new Date(value);
//     };

//     const formatTime = (dateStr: string) => {
//       const d = new Date(dateStr);
//       return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
//     };

//     // Format shifts exactly like backend expects (FIXED)
//     const formattedShifts = (jobData.shifts || []).map((shift: any) => {
//       const start = parseLocalDate(shift.startTime);
//       const end = parseLocalDate(shift.endTime);

//       return {
//         start: `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(
//           start.getDate(),
//         )}T${pad(start.getHours())}:${pad(start.getMinutes())}`,
//         end: `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(
//           end.getDate(),
//         )}T${pad(end.getHours())}:${pad(end.getMinutes())}`,
//         numberOfGuards: Number(shift.guardsCount || 1),
//       };
//     });

//     const payload = {
//       user_id: user.id,

//       title: jobData.title || `${getCategoryDisplay(jobData.category)}`,

//       description: jobData.description || "No description provided",

//       address: jobData.location || "Not specified",

//       coordinates: `${jobData.lat},${jobData.lng}`,

//       state: "open",

//       shifts: formattedShifts,

//       job_level: Number(jobData.jobLevel ?? 1),

//       payment_option: selectedPlan,

//       // job_location_state: jobData.job_location_state || 'punjab',
//       job_location_state: extractedState,

//       financials: {
//         base_total_inc_gst: parseFloat(totalIncGST.toFixed(2)),

//         discount_applied:
//           selectedPlan === "full"
//             ? parseFloat((totalIncGST * 0.05).toFixed(2))
//             : 0,

//         amount_to_charge_today: parseFloat(ctaAmount.toFixed(2)),

//         balance_deferred:
//           selectedPlan === "split"
//             ? parseFloat((totalIncGST * 0.5).toFixed(2))
//             : 0,
//       },

//       is_document: selectedDocuments.length > 0,

//       document_list: uploadedFileUrls || [],

//       document_types: selectedDocuments || [],

//       job_instruction: jobData.description || "",

//       tasks: (jobData.tasks || []).map((t: any) => ({
//         task: t.task || t.title || "",
//         task_start: t.task_start || formatTime(t.startTime),
//         task_end: t.task_end || formatTime(t.endTime),
//       })),

//       payment_intent_id: intentId,
//     };

//     console.log("[CREATE JOB PAYLOAD]", JSON.stringify(payload, null, 2));

//     return postJob(payload);
//   };
//   // const submitJob = async (intentId: string | null) => {
//   //   const user = JSON.parse((await AsyncStorage.getItem('user'))!);

//   //   // Format the shifts array exactly as the backend expects
//   //   const formattedShifts = (jobData.shifts || []).map((shift: any) => {
//   //     const start = new Date(shift.startTime);
//   //     const end = new Date(shift.endTime);

//   //     return {
//   //       start: `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(
//   //         start.getDate(),
//   //       )}T${pad(start.getHours())}:${pad(start.getMinutes())}`,
//   //       end: `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(
//   //         end.getDate(),
//   //       )}T${pad(end.getHours())}:${pad(end.getMinutes())}`,
//   //       numberOfGuards: Number(shift.guardsCount || jobData.guardsCount || 1),
//   //     };
//   //   });

//   //   // Also build legacy startTime / endTime for backward compatibility
//   //   const { startStrSec, endStrSec } = buildTimes();

//   //   return postJob({
//   //     user_id: user.id,

//   //     job_type: jobData.title || `${getCategoryDisplay(jobData.category)}`,
//   //     description: jobData.description || 'No description provided',
//   //     address: jobData.location || 'Not specified',
//   //     coordinates: `${(jobData.lat ?? -33.8688).toFixed(8)},${(
//   //       jobData.lng ?? 151.2093
//   //     ).toFixed(8)}`,
//   //     state: 'NSW',
//   //     numberOfGuards: jobData.guardsCount || 1,
//   //     financials: {
//   //       base_total_inc_gst: parseFloat(totalIncGST.toFixed(2)),
//   //       discount_applied: parseFloat((totalIncGST * 0.05).toFixed(2)), // 5% discount for full pay
//   //       amount_to_charge_today: parseFloat(ctaAmount.toFixed(2)),
//   //       balance_deferred:
//   //         selectedPlan === 'split'
//   //           ? parseFloat((totalIncGST * 0.5).toFixed(2))
//   //           : 0,
//   //     },
//   //     // Legacy fields (keep these)
//   //     startTime: startStrSec,
//   //     endTime: endStrSec,

//   //     // New field - this is what you want for multiple shifts
//   //     shifts: formattedShifts,

//   //     is_document: selectedDocuments.length > 0,
//   //     document_list: uploadedFileUrls,
//   //     document_types: selectedDocuments,
//   //     job_instruction: jobData.description || '',
//   //     payment_intent_id: intentId,
//   //     payment_option: selectedPlan, // 'full' or 'split'
//   //   } as any); // Temporary type assertion until you update the interface
//   // };

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
//         routes: [{ name: "Applications" as never }],
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

//   const isPaymentReady = () => {
//     if (paymentTab === "saved") {
//       if (savedCards.length === 0) return false;
//       // require a valid manual card number (12-19 digits) and a holder name
//       const digits = manualCardNumber.replace(/\s+/g, "");
//       return (
//         digits.length >= 12 &&
//         digits.length <= 19 &&
//         cardHolderName.trim().length >= 3
//       );
//     }

//     return !!(cardHolderName.trim().length >= 3 && cardComplete);
//   };

//   function getDayType(d: Date): string {
//     const day = d.getDay();
//     if (day === 0) return "sun";
//     if (day === 5) return "fri";
//     if (day === 6) return "sat";
//     return "weekday";
//   }

//   function getSlot(h: number): "day" | "night" {
//     return h >= 6 && h < 18 ? "day" : "night";
//   }

//   function nextBoundary(t: Date): Date {
//     const h = t.getHours();
//     const n = new Date(t);
//     n.setSeconds(0, 0);
//     if (h < 6) n.setHours(6, 0, 0, 0);
//     else if (h < 18) n.setHours(18, 0, 0, 0);
//     else {
//       n.setDate(n.getDate() + 1);
//       n.setHours(0, 0, 0, 0);
//     }
//     return n;
//   }

//   function calcBreakdown(
//     shiftsInput: Array<{
//       date: Date;
//       startTime: Date;
//       endTime: Date;
//       guardsCount: number;
//     }>,
//     r: RatesConfig,
//   ): CostBreakdown {
//     if (!shiftsInput || shiftsInput.length === 0) {
//       return {
//         chargeTotal: 0,
//         guardHours: 0,
//         breakdown: [],
//         totalShiftHours: 0,
//       };
//     }

//     const hMap = new Map<string, number>();
//     const order: string[] = [];
//     let totalCharge = 0;
//     let totalGuardHours = 0;
//     let totalShiftHours = 0;
//     const bd: ShiftSegment[] = [];

//     shiftsInput.forEach((shift) => {
//       const guards = Math.max(1, shift.guardsCount || 1);
//       const start = new Date(shift.startTime);
//       const end = new Date(shift.endTime);

//       let t = new Date(start);
//       while (t < end) {
//         const b = nextBoundary(t);
//         const segmentEnd = b < end ? b : end;

//         const hoursSeg =
//           (segmentEnd.getTime() - t.getTime()) / (1000 * 60 * 60);
//         if (hoursSeg <= 0) break;

//         const key = `${getDayType(t)}_${getSlot(t.getHours())}`;

//         if (!hMap.has(key)) {
//           hMap.set(key, 0);
//           order.push(key);
//         }

//         hMap.set(key, (hMap.get(key) || 0) + hoursSeg * guards);

//         t = new Date(segmentEnd);
//       }

//       const shiftHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
//       totalShiftHours += shiftHours;
//       totalGuardHours += shiftHours * guards;
//     });

//     // Build breakdown
//     order.forEach((k) => {
//       const totalHrsForRate = hMap.get(k) || 0;
//       const [dt, sl] = k.split("_");
//       const rateSlot = r.charge[dt]?.[sl as "day" | "night"] || 0;

//       totalCharge += totalHrsForRate * rateSlot;

//       bd.push({
//         label: SEGMENT_LABELS[k] || k,
//         hours: totalHrsForRate,
//         payRate: 0,
//         chargeRate: rateSlot,
//       });
//     });

//     return {
//       chargeTotal: totalCharge,
//       guardHours: totalGuardHours,
//       breakdown: bd,
//       totalShiftHours: totalShiftHours,
//     };
//   }

//   useEffect(() => {
//     (async () => {
//       try {
//         const token = await getAuthToken();
//         if (!token) throw new Error("No auth token");
//         const res = await axios.get(`${BASE_URL}/get-chargerates`, {
//           headers: { Authorization: `Bearer ${token}` },
//         });
//         if (!res.data?.success || !res.data?.data?.length)
//           throw new Error("Invalid rates response");

//         // Pick the rate entry matching the job level passed from CreateJobScreen.
//         // Fall back to the first entry if no match is found.
//         const jobLevelStr = String(jobData.jobLevel ?? "1");
//         const matched =
//           res.data.data.find(
//             (item: any) => String(item.level) === jobLevelStr,
//           ) ?? res.data.data[0];

//         const i = matched;
//         setRates({
//           charge: {
//             weekday: {
//               day: Number(i.def_metro_mon_to_fri_day_rate || 0),
//               night: Number(i.def_metro_mon_to_fri_night_rate || 0),
//             },
//             fri: {
//               day: Number(i.def_metro_mon_to_fri_day_rate || 0),
//               night: Number(i.def_metro_mon_to_fri_night_rate || 0),
//             },
//             sat: {
//               day: Number(i.def_metro_sat_day_rate || 0),
//               night: Number(i.def_metro_sat_night_rate || 0),
//             },
//             sun: {
//               day: Number(i.def_metro_sun_day_rate || 0),
//               night: Number(i.def_metro_sun_night_rate || 0),
//             },
//             pub_holi: {
//               day: Number(i.def_metro_pub_holi_day_rate || 0),
//               night: Number(i.def_metro_pub_holi_night_rate || 0),
//             },
//           },
//         });
//       } catch (e: any) {
//         setRatesError(
//           e.response?.data?.message || e.message || "Failed to load rates",
//         );
//       } finally {
//         setRatesLoading(false);
//       }
//     })();
//   }, []);

//   const costBreakdown = useMemo(() => {
//     if (!rates || !jobData.shifts || jobData.shifts.length === 0)
//       return {
//         chargeTotal: 0,
//         guardHours: 0,
//         breakdown: [],
//         totalShiftHours: 0,
//       };
//     return calcBreakdown(jobData.shifts, rates);
//   }, [rates, jobData.shifts]);

//   const subtotal = costBreakdown.chargeTotal;
//   const gst = subtotal * 0.1;
//   const totalIncGST = subtotal * 1.1;
//   const fullPayAmount = parseFloat((totalIncGST * 0.95).toFixed(2));
//   const splitUpfront = parseFloat((totalIncGST * 0.5).toFixed(2));

//   const fmtDT = (date?: Date, time?: Date) => {
//     if (!date || !time) return "Not set";
//     try {
//       return new Date(
//         date.getFullYear(),
//         date.getMonth(),
//         date.getDate(),
//         time.getHours(),
//         time.getMinutes(),
//       ).toLocaleString("en-AU", {
//         weekday: "short",
//         month: "short",
//         day: "numeric",
//         year: "numeric",
//         hour: "2-digit",
//         minute: "2-digit",
//         hour12: false,
//       });
//     } catch {
//       return "Invalid date";
//     }
//   };
//   const capitalizeAllWords = (text = "") =>
//     text
//       .split(/(\s+|\/|\(|\))/) // keep separators like space, /, ()
//       .map((part) => {
//         if (!part.match(/[a-zA-Z]/)) return part; // keep symbols as-is

//         return part
//           .split(" ")
//           .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
//           .join(" ");
//       })
//       .join("");
//   const openPaymentModal = () => {
//     if (!acceptedPolicy) {
//       Alert.alert("Required", "Please agree to the Terms & Conditions first.");
//       return;
//     }

//     setPaymentModalVisible(true);
//     setCardError("");
//     setProcessing(false);
//     setCardHolderName(""); // Reset name

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
//             setCardHolderName(parsed[0].card_holder_name || ""); // Auto fill first card
//           } else {
//             setSavedCards([]);
//             setPaymentTab("new");
//           }
//         } else {
//           setSavedCards([]);
//           setPaymentTab("new");
//         }
//       } catch (err) {
//         console.log("Load saved cards error:", err);
//         setSavedCards([]);
//         setPaymentTab("new");
//       }
//     })();
//   };
//   if (ratesLoading)
//     return (
//       <View style={styles.loadingContainer}>
//         <ActivityIndicator size="large" color="#0A7C6E" />
//         <Text style={styles.loadingText}>Loading Current Pricing...</Text>
//       </View>
//     );
//   if (ratesError || !rates)
//     return (
//       <View style={styles.errorContainer}>
//         <Text style={styles.errorText}>
//           Cannot load rates:{"\n"}
//           {ratesError}
//         </Text>
//         <TouchableOpacity
//           style={styles.backButton}
//           onPress={() => navigation.goBack()}
//         >
//           <Text style={styles.backButtonText}>Go Back</Text>
//         </TouchableOpacity>
//       </View>
//     );

//   // === Use values from CreateJobScreen (preferred) with fallback ===
//   const displaySubtotal =
//     subtotalFromCreate > 0 ? subtotalFromCreate : subtotal;
//   const displayGST = gstFromCreate > 0 ? gstFromCreate : gst;
//   const displayTotal = totalIncGST;
//   const displayDiscount =
//     discountFromCreate > 0 ? discountFromCreate : displayTotal * 0.05;
//   const displayPayableNow =
//     payableNowFromCreate > 0 ? payableNowFromCreate : fullPayAmount;
//   const displaySplit =
//     splitAmountFromCreate > 0 ? splitAmountFromCreate : splitUpfront;

//   // Final CTA values for payment
//   const ctaAmount = selectedPlan === "full" ? displayPayableNow : displaySplit;
//   const ctaLabel =
//     selectedPlan === "full"
//       ? `Pay $${displayPayableNow.toFixed(2)} (5% Off)`
//       : `Pay $${displaySplit.toFixed(2)} Upfront`;

//   return (
//     <View style={styles.container}>
//       <View style={styles.header}>
//         <TouchableOpacity onPress={() => navigation.goBack()}>
//           <ChevronLeft size={28} color="#fff" />
//         </TouchableOpacity>
//         <Text style={styles.headerTitle}>Review & Confirm</Text>
//         <View style={{ width: 28 }} />
//       </View>

//       <ScrollView contentContainerStyle={styles.scrollContent}>
//         <View style={styles.card}>
//           <View style={styles.cardSectionHeader}>
//             {/* <FileText size={22} color="#0A7C6E" /> */}
//             <Text style={styles.sectionTitle}>Job Details</Text>
//           </View>
//           {[
//             {
//               label: "Job Title",
//               value:
//                 jobData.title ||
//                 capitalizeAllWords(getCategoryDisplay(jobData.category)),
//             },
//             // {
//             //   label: 'Job Category',
//             //   value: getCategoryDisplay(jobData.category),
//             // },
//             // FIXED: Displaying proper aggregate Maximum Guard Count
//             // {
//             //   label: 'Max Guards Req.',
//             //   value: String(jobData.guardsCount || 1),
//             // },
//             // {
//             //   label: 'Start',
//             //   value: fmtDT(jobData.startDate, jobData.startTime),
//             // },
//             // { label: 'End', value: fmtDT(jobData.endDate, jobData.endTime) },
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

//         {/* Schedule Summary */}
//         <View style={styles.card}>
//           <View style={styles.cardSectionHeader}>
//             <Text style={styles.sectionTitle}>Schedule Summary</Text>
//           </View>

//           <View style={styles.scheduleContainer}>
//             {jobData.shifts && jobData.shifts.length > 0 ? (
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

//         {/* ==================== RATE BREAKDOWN ==================== */}
//         <View style={styles.rateCard}>
//           <View style={styles.rateMainHeader}>
//             <Text style={styles.rateMainTitle}>Quotation Breakdown</Text>
//             <Text style={styles.rateMainSubtitle}>
//               {`${costBreakdown.totalShiftHours.toFixed(
//                 2,
//               )} Total Billable Hours`}
//             </Text>
//           </View>

//           {costBreakdown.breakdown.length === 0 ? (
//             <Text style={styles.noDataText}>
//               No breakdown available – check shift dates
//             </Text>
//           ) : (
//             <>
//               {costBreakdown.breakdown.map((item, i) => (
//                 <View key={i} style={styles.rateSegmentCard}>
//                   <View style={styles.detailRow}>
//                     <Text style={styles.rowLabel}>DESCRIPTION</Text>
//                     <View style={styles.valueWrap}>
//                       <Text style={styles.rowValue}>
//                         {capitalizeAllWords(
//                           getCategoryDisplay(jobData.category),
//                         )}
//                       </Text>
//                     </View>
//                   </View>

//                   {/* Rate Type */}
//                   <View style={styles.rowItem}>
//                     <Text style={styles.rowLabel}>RATE TYPE</Text>

//                     <View style={styles.valueWrap}>
//                       <Text style={styles.rowValue}>
//                         {item.label || "Mon-Fri (Day 06:00-18:00)"}
//                       </Text>
//                     </View>
//                   </View>

//                   {/* Hours | Unit Price | Subtotal (Second Row) */}
//                   <View style={styles.detailsRow}>
//                     <View style={styles.detailColumn}>
//                       <Text style={styles.rowLabel}>BILLABLE HOURS</Text>
//                       <Text style={styles.detailValue}>
//                         {item.hours.toFixed(2)}
//                       </Text>
//                     </View>

//                     <View style={styles.detailColumn}>
//                       <Text style={styles.rowLabel}>UNIT PRICE</Text>
//                       <Text style={styles.detailValue}>
//                         ${item.chargeRate.toFixed(2)}
//                       </Text>
//                     </View>

//                     <View style={styles.detailColumn}>
//                       <Text style={styles.rowLabel}>SUBTOTAL</Text>
//                       <Text style={styles.detailValueBold}>
//                         ${(item.chargeRate * item.hours).toFixed(2)}
//                       </Text>
//                     </View>
//                   </View>
//                 </View>
//               ))}

//               {/* ==================== TOTALS SECTION ==================== */}
//               <View style={styles.totalsBlock}>
//                 {/* Subtotal (WITH LINE) */}
//                 <View style={[styles.totalLine, styles.totalLineNoBorder]}>
//                   <Text style={styles.totalLabel}>Subtotal (Ex GST)</Text>
//                   <Text style={styles.subtotalValue}>
//                     ${subtotal.toFixed(2)}
//                   </Text>
//                 </View>

//                 {/* GST (NO LINE) */}
//                 <View style={[styles.totalLine]}>
//                   <Text style={styles.totalLabel}>GST (10%)</Text>
//                   <Text style={styles.gstValue}>${gst.toFixed(2)}</Text>
//                 </View>

//                 {/* Quote Total (NO LINE) */}
//                 <View style={[styles.totalLine, styles.totalLineNoBorder]}>
//                   <Text style={styles.quoteTotal}>Quote Total</Text>
//                   <Text style={styles.quoteTotalvalue}>
//                     ${totalIncGST.toFixed(2)}
//                   </Text>
//                 </View>

//                 {/* Dynamic Discount (WITH LINE) */}
//                 {selectedPlan === "full" && (
//                   <View style={styles.totalLine}>
//                     <Text style={styles.totalLabel}>
//                       Pay In Full Discount (5%)
//                     </Text>
//                     <Text style={{ color: "#16A34A", fontWeight: "700" }}>
//                       -${(displayTotal * 0.05).toFixed(2)}
//                     </Text>
//                   </View>
//                 )}

//                 {selectedPlan === "split" && (
//                   <View style={styles.totalLine}>
//                     <Text style={styles.totalLabel}>Split Payment (50%)</Text>
//                     <Text style={{ color: "#64748B", fontWeight: "600" }}>
//                       ${splitUpfront.toFixed(2)}
//                     </Text>
//                   </View>
//                 )}

//                 {/* Final Payable (NO LINE by default unless you want) */}
//                 <View style={[styles.finalTotalLine]}>
//                   <Text style={styles.finalTotalLabel}>
//                     {selectedPlan === "full" ? "Amount Payable" : "Payable Now"}
//                   </Text>
//                   <Text style={[styles.finalTotalValue, { color: "#0A7C6E" }]}>
//                     {selectedPlan === "full"
//                       ? `$${fullPayAmount.toFixed(2)}`
//                       : `$${splitUpfront.toFixed(2)}`}
//                   </Text>
//                 </View>
//               </View>
//             </>
//           )}
//         </View>
//         <View style={styles.paymentOptionsCard}>
//           <View style={styles.paymentOptionsHeader}>
//             {/* <DollarSign size={20} color="#0A7C6E" /> */}
//             <Text style={styles.paymentOptionsTitle}>Payment Options</Text>
//           </View>
//           <View style={styles.paymentOptionsRow}>
//             <TouchableOpacity
//               style={[
//                 styles.planCard,
//                 selectedPlan === "full" && styles.planCardSelected,
//               ]}
//               onPress={() => setSelectedPlan("full")}
//               activeOpacity={0.85}
//             >
//               {selectedPlan === "full" && (
//                 <View style={styles.planSelectedDot}>
//                   <Check size={10} color="#fff" />
//                 </View>
//               )}
//               <View style={styles.planTitleRow}>
//                 <Text
//                   style={[
//                     styles.planName,
//                     selectedPlan === "full" && styles.planNameSelected,
//                   ]}
//                 >
//                   Pay In Full
//                 </Text>
//                 <View style={styles.saveBadge}>
//                   <Text style={styles.saveBadgeText}>Save 5%</Text>
//                 </View>
//               </View>
//               <Text style={styles.planDesc}>
//                 Pay the total amount now and receive an instant 5% discount on
//                 your booking.
//               </Text>
//               <View style={styles.planAmountRow}>
//                 <Text
//                   style={[
//                     styles.planAmount,
//                     selectedPlan === "full" && styles.planAmountSelected,
//                   ]}
//                 >
//                   ${fullPayAmount.toFixed(2)}
//                 </Text>
//                 <Text style={styles.planAmountLabel}> Total</Text>
//               </View>
//             </TouchableOpacity>
//             <TouchableOpacity
//               style={[
//                 styles.planCard,
//                 selectedPlan === "split" && styles.planCardSelected,
//               ]}
//               onPress={() => setSelectedPlan("split")}
//               activeOpacity={0.85}
//             >
//               {selectedPlan === "split" && (
//                 <View style={styles.planSelectedDot}>
//                   <Check size={10} color="#fff" />
//                 </View>
//               )}
//               <View style={styles.planTitleRow}>
//                 <Text
//                   style={[
//                     styles.planName,
//                     selectedPlan === "split" && styles.planNameSelected,
//                   ]}
//                 >
//                   Split Payment (50/50)
//                 </Text>
//               </View>
//               <Text style={styles.planDesc}>
//                 Pay 50% upfront to secure guards. The remaining 50% is charged
//                 upon shift completion.
//               </Text>
//               <View style={styles.planAmountRow}>
//                 <Text
//                   style={[
//                     styles.planAmount,
//                     selectedPlan === "split" && styles.planAmountSelected,
//                   ]}
//                 >
//                   ${splitUpfront.toFixed(2)}
//                 </Text>
//                 <Text style={styles.planAmountLabel}> Upfront</Text>
//               </View>
//             </TouchableOpacity>
//           </View>
//         </View>

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
//               I Agree To The{" "}
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

//             <Text style={styles.noteText}>
//               *Note: A 10% Incidental Authorisation Hold May Be Applied By
//               Stripe To Cover Potential Unplanned Overtime. The Hold Will Be
//               Released After Completion Of The Shift.
//             </Text>
//           </View>
//         </TouchableOpacity>

//         {/* <TouchableOpacity
//           style={[
//             styles.payNowButton,
//             (!acceptedPolicy || isSubmitting) && styles.disabledButton,
//           ]}
//           onPress={openPaymentModal}
//           disabled={!acceptedPolicy || isSubmitting}
//         >
//           <Lock size={20} color="#fff" style={{ marginRight: 10 }} />
//           <Text style={styles.payNowText}>{ctaLabel} & Post Job</Text>
//         </TouchableOpacity> */}

//         <TouchableOpacity
//           style={[
//             styles.payNowButton,
//             (!acceptedPolicy || isSubmitting) && styles.disabledButton,
//           ]}
//           onPress={openPaymentModal}
//           disabled={!acceptedPolicy || isSubmitting}
//         >
//           <Lock size={20} color="#fff" style={{ marginRight: 10 }} />

//           <Text style={styles.payNowText}>
//             {selectedPlan === "full"
//               ? `Pay $${fullPayAmount.toFixed(2)} & Post Job`
//               : `Pay $${splitUpfront.toFixed(2)} & Post Job`}
//           </Text>
//         </TouchableOpacity>

//         <TouchableOpacity
//           style={styles.editButton}
//           onPress={() => navigation.goBack()}
//         >
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
//             >
//               <X size={18} color="#b72f0d" />
//             </TouchableOpacity>
//           </View>

//           <ScrollView
//             style={styles.modalScroll}
//             contentContainerStyle={styles.modalScrollContent}
//           >
//             <View style={styles.policyCard}>
//               <View style={styles.highlightedInfo}>
//                 <Text style={styles.highlightText}>
//                   Effective Date: March 14, 2026
//                 </Text>
//                 <Text style={styles.highlightText}>
//                   Operated by: Capital Services Pty Ltd
//                 </Text>
//                 <Text style={styles.highlightText}>ABN: 48 613 317 838</Text>
//                 <Text style={styles.highlightText}>
//                   Registered Office: 21 Tanglewood Bvd, Truganina VIC 3029,
//                   Australia
//                 </Text>
//               </View>

//               <Text style={styles.policyBodyText}>{PRIVACY_POLICY_TEXT}</Text>
//             </View>

//             <Text style={styles.lastUpdated}>
//               Capital Services Pty Ltd • ABN 48 613 317 838
//             </Text>
//           </ScrollView>

//           <View style={styles.modalFooter}>
//             <TouchableOpacity
//               style={styles.acceptBtn}
//               onPress={() => {
//                 setAcceptedPolicy(true);
//                 setShowPolicyModal(false);
//               }}
//             >
//               <Check size={22} color="#fff" style={{ marginRight: 10 }} />
//               <Text style={styles.acceptBtnText}>
//                 I Accept the Terms & Privacy Policy
//               </Text>
//             </TouchableOpacity>
//           </View>
//         </SafeAreaView>
//       </Modal>

//       {/* <Modal
//         visible={paymentModalVisible}
//         animationType="slide"
//         transparent
//         onRequestClose={() => !processing && setPaymentModalVisible(false)}
//       >
//         <TouchableWithoutFeedback
//           onPress={() => {
//             if (!processing) setPaymentModalVisible(false);
//           }}
//         >
//           <View style={styles.modalOverlay}>
//             <TouchableWithoutFeedback>
//               <View style={styles.paymentModalContainer}>
//                 <TouchableOpacity
//                   style={styles.closeButton}
//                   onPress={() => !processing && setPaymentModalVisible(false)}
//                   disabled={processing}
//                 >
//                   <Text style={styles.closeText}>×</Text>
//                 </TouchableOpacity>
//                 <Text style={styles.pmTitle}>Stripe Payment</Text>
//                 <Text style={styles.pmSubtitle}>
//                   {selectedPlan === "full"
//                     ? "Pay in full with a 5% discount applied."
//                     : "50% now to secure guards. Balance due after completion."}
//                 </Text>

//                 {paymentTab === "saved" && savedCards.length > 0 && (
//                   <FlatList
//                     data={savedCards}
//                     keyExtractor={(_, i) => `card-${i}`}
//                     style={styles.savedCardsList}
//                     renderItem={({ item, index }) => (
//                       <TouchableOpacity
//                         style={[
//                           styles.savedCardItem,
//                           selectedSavedIndex === index &&
//                             styles.savedCardSelected,
//                         ]}
//                         onPress={() => setSelectedSavedIndex(index)}
//                         disabled={processing}
//                       >
//                         <CreditCard size={24} color="#6366F1" />

//                         <View style={styles.cardInfo}>
//                           <Text style={styles.cardHolder}>
//                             {item.card_holder_name}
//                           </Text>

//                           <Text style={styles.cardLast4}>
//                             •••• {item.card_number.slice(-4)}
//                           </Text>
//                         </View>

//                         {selectedSavedIndex === index && (
//                           <CheckCircle size={24} color="#22c55e" />
//                         )}
//                       </TouchableOpacity>
//                     )}
//                   />
//                 )}

//                 {paymentTab === "new" && (
//                   <View style={styles.newCardForm}>
//                     <TextInput
//                       placeholder="Card Holder Name"
//                       value={cardHolderName}
//                       onChangeText={handleCardHolderName}
//                       autoCapitalize="words"
//                       keyboardType="default"
//                       style={[
//                         styles.input,
//                         nameError ? { borderColor: "red" } : null,
//                       ]}
//                     />

//                     {nameError ? (
//                       <Text style={styles.errorText}>{nameError}</Text>
//                     ) : null}

//                     <CardField
//                       postalCodeEnabled={false}
//                       placeholders={{
//                         number: "4242 4242 4242 4242",
//                         expiration: "MM/YY",
//                         cvc: "CVC",
//                       }}
//                       cardStyle={{
//                         backgroundColor: "#FFFFFF",
//                         textColor: "#111827",
//                         borderColor: "#D1D5DB",
//                         borderWidth: 1,
//                         borderRadius: 10,
//                         fontSize: 16,
//                         placeholderColor: "#9CA3AF",
//                       }}
//                       style={{
//                         width: "100%",
//                         height: 50,
//                         marginVertical: 12,
//                       }}
//                       onCardChange={(cardDetails: any) => {
//                         setCardComplete(cardDetails.complete);

//                         if (cardDetails?.error) {
//                           setCardError(cardDetails.error?.message || "");
//                         } else {
//                           setCardError("");
//                         }
//                       }}
//                     />
//                   </View>
//                 )}

//                 {cardError ? (
//                   <Text style={styles.errorTextSmall}>{cardError}</Text>
//                 ) : null}

//                 <TouchableOpacity
//                   style={[
//                     styles.payButton,
//                     (!isPaymentReady() || processing) && styles.disabledButton,
//                   ]}
//                   onPress={handlePayment}
//                   disabled={!isPaymentReady() || processing}
//                 >
//                   {processing ? (
//                     <ActivityIndicator color="#fff" />
//                   ) : (
//                     <Text style={styles.payButtonText}>
//                       Pay $
//                       {(selectedPlan === "full"
//                         ? fullPayAmount
//                         : splitUpfront
//                       ).toFixed(2)}
//                     </Text>
//                   )}
//                 </TouchableOpacity>

//                 <TouchableOpacity
//                   style={styles.cancelButton}
//                   onPress={() => !processing && setPaymentModalVisible(false)}
//                   disabled={processing}
//                 >
//                   <Text style={styles.cancelText}>Cancel</Text>
//                 </TouchableOpacity>
//               </View>
//             </TouchableWithoutFeedback>
//           </View>
//         </TouchableWithoutFeedback>
//       </Modal> */}

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
//               <View style={styles.paymentModalContainer}>
//                 <View style={styles.paymentHeader}>
//                   <Text style={styles.pmTitle}>Complete Payment</Text>
//                   <TouchableOpacity
//                     onPress={() => !processing && setPaymentModalVisible(false)}
//                     disabled={processing}
//                   >
//                     <Text style={styles.closeText}>✕</Text>
//                   </TouchableOpacity>
//                 </View>

//                 {/* Tab Selection */}
//                 <View style={styles.tabContainer}>
//                   <TouchableOpacity
//                     style={[
//                       styles.tabButton,
//                       paymentTab === "saved" && styles.tabButtonActive,
//                     ]}
//                     onPress={() => {
//                       setPaymentTab("saved");
//                       setCardError("");
//                     }}
//                   >
//                     <Text
//                       style={[
//                         styles.tabText,
//                         paymentTab === "saved" && styles.tabTextActive,
//                       ]}
//                     >
//                       Use Saved Card
//                     </Text>
//                   </TouchableOpacity>
//                   <TouchableOpacity
//                     style={[
//                       styles.tabButton,
//                       paymentTab === "new" && styles.tabButtonActive,
//                     ]}
//                     onPress={() => {
//                       setPaymentTab("new");
//                       setCardHolderName(""); // Clear field for manual entry
//                       setManualCardNumber("");
//                       setCardError("");
//                     }}
//                   >
//                     <Text
//                       style={[
//                         styles.tabText,
//                         paymentTab === "new" && styles.tabTextActive,
//                       ]}
//                     >
//                       Enter New Card
//                     </Text>
//                   </TouchableOpacity>
//                 </View>

//                 {/* Tab Content */}
//                 {paymentTab === "saved" ? (
//                   <View style={styles.savedCardsSection}>
//                     {savedCards.length > 0 ? (
//                       savedCards.map((item, index) => (
//                         <TouchableOpacity
//                           key={index}
//                           style={[
//                             styles.savedCardItem,
//                             selectedSavedIndex === index &&
//                               styles.savedCardSelected,
//                           ]}
//                           onPress={() => {
//                             setSelectedSavedIndex(index);
//                             // Prefill holder name for verification when selecting a saved card
//                             setCardHolderName(item.card_holder_name || "");
//                             setCardError("");
//                           }}
//                         >
//                           <View style={styles.cardInfo}>
//                             <Text style={styles.cardHolder}>
//                               {item.card_holder_name}
//                             </Text>
//                             <Text style={styles.cardLast4}>
//                               •••• {item.card_number?.slice(-4)}
//                             </Text>
//                           </View>
//                         </TouchableOpacity>
//                       ))
//                     ) : (
//                       <Text style={styles.noSavedCardText}>
//                         No saved cards found.
//                       </Text>
//                     )}
//                   </View>
//                 ) : (
//                   <View style={styles.newCardForm}>
//                     <TextInput
//                       placeholder="Card Holder Name"
//                       value={cardHolderName}
//                       onChangeText={handleCardHolderName}
//                       autoCapitalize="words"
//                       style={[
//                         styles.input,
//                         nameError && { borderColor: "red" },
//                       ]}
//                     />
//                     {nameError ? (
//                       <Text style={styles.errorText}>{nameError}</Text>
//                     ) : null}
//                     <CardField
//                       postalCodeEnabled={false}
//                       cardStyle={{
//                         backgroundColor: "#FFFFFF",
//                         textColor: "#111827",
//                         borderColor: "#D1D5DB",
//                         borderWidth: 1,
//                         borderRadius: 10,
//                         fontSize: 16,
//                       }}
//                       style={{ width: "100%", height: 50, marginVertical: 12 }}
//                       onCardChange={(details: any) => {
//                         setCardComplete(details.complete);
//                         setCardError(
//                           details.error ? details.error.message : "",
//                         );
//                       }}
//                     />
//                   </View>
//                 )}

//                 {/* Additional inputs for saved card verification */}
//                 {paymentTab === "saved" && savedCards.length > 0 && (
//                   <View style={{ marginTop: 12 }}>
//                     <TextInput
//                       placeholder="Card Holder Name"
//                       value={cardHolderName}
//                       onChangeText={handleCardHolderName}
//                       autoCapitalize="words"
//                       style={[
//                         styles.input,
//                         nameError && { borderColor: "red" },
//                       ]}
//                     />
//                     {nameError ? (
//                       <Text style={styles.errorText}>{nameError}</Text>
//                     ) : null}

//                      <CardField
//                       postalCodeEnabled={false}
//                       cardStyle={{
//                         backgroundColor: "#FFFFFF",
//                         textColor: "#111827",
//                         borderColor: "#D1D5DB",
//                         borderWidth: 1,
//                         borderRadius: 10,
//                         fontSize: 16,
//                       }}
//                       style={{ width: "100%", height: 50, marginVertical: 12 }}
//                       onCardChange={(details: any) => {
//                         setCardComplete(details.complete);
//                         setCardError(
//                           details.error ? details.error.message : "",
//                         );
//                       }}
//                     />
//                     {manualCardError ? (
//                       <Text style={styles.errorText}>{manualCardError}</Text>
//                     ) : null}
//                   </View>
//                 )}

//                 {cardError ? (
//                   <Text style={styles.errorTextSmall}>{cardError}</Text>
//                 ) : null}

//                 <TouchableOpacity
//                   style={[
//                     styles.payButton,
//                     (!isPaymentReady() || processing) && styles.disabledButton,
//                   ]}
//                   onPress={handlePayment}
//                   disabled={!isPaymentReady() || processing}
//                 >
//                   {processing ? (
//                     <ActivityIndicator color="#fff" />
//                   ) : (
//                     <Text style={styles.payButtonText}>
//                       Pay ${ctaAmount.toFixed(2)}
//                     </Text>
//                   )}
//                 </TouchableOpacity>
//               </View>
//             </TouchableWithoutFeedback>
//           </View>
//         </TouchableWithoutFeedback>
//       </Modal>
//     </View>
//   );
// }

// // Ensure you retain your `styles` object correctly here at the bottom of ReviewConfirmScreen.tsx as in your original.
// const styles = StyleSheet.create({
//   safeArea: {
//     flex: 1,
//     //  backgroundColor: BRAND_BG
//     backgroundColor: "#111111",
//   },
//   container: {
//     flex: 1,
//     // backgroundColor: '#001F3F',
//     backgroundColor: "#111111",
//     paddingTop: 55,
//   },
//   header: {
//     flexDirection: "row",
//     justifyContent: "space-between",
//     alignItems: "center",
//     marginHorizontal: 16,
//     // paddingVertical: 25,
//   },

//   headerTitle: {
//     fontSize: 22,
//     fontWeight: "800",
//     color: "#fff",
//     letterSpacing: 0.5,
//   },
//   scrollContent: { padding: 16, paddingBottom: 100 },
//   card: {
//     backgroundColor: "#111111",

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
//     marginBottom: 16,
//     gap: 10,
//   },
//   sectionTitle: {
//     fontSize: 20,
//     fontWeight: "800",
//     color: "#fff",
//   },
//   valueWrap: {
//     flex: 2,
//     alignItems: "flex-end",
//   },

//   detailRow: {
//     flexDirection: "row",
//     alignItems: "flex-start",
//     marginBottom: 12,
//   },
//   label: {
//     color: "#89E7D0",
//     fontWeight: "700",
//     fontSize: 13,
//     marginBottom: 6,
//     width: 90,
//   },

//   inputCard: {
//     flex: 2,
//     backgroundColor: "#e4f1f9",
//     borderRadius: 10,
//     paddingVertical: 8,
//     paddingHorizontal: 20,
//     // borderWidth: 1,
//     // borderColor: '#ccd0e0',
//     // shadowColor: '#506776',
//     // shadowOffset: { width: 0, height: 8 },
//     // shadowOpacity: 0.15,
//     // shadowRadius: 25,
//     // elevation: 12,
//   },
//   inputCardText: { fontSize: 12, color: "#030303", fontWeight: "700" },
//   rateCard: {
//     backgroundColor: "#111111",

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

//   paymentHeader: {
//     flexDirection: "row",
//     justifyContent: "space-between",
//     alignItems: "center",
//     marginBottom: 8,
//   },
//   rowLabel: {
//     fontSize: 10,
//     color: "#94A3B8",
//     fontWeight: "600",
//     flex: 1,
//   },

//   rowValue: {
//     fontSize: 12,
//     color: "#fff",
//     fontWeight: "600",

//     textAlign: "right",
//     // flexShrink: 1,
//   },

//   rowValueBold: {
//     fontSize: 12,
//     color: "#fff",
//     fontWeight: "700",
//   },
//   rateMainHeader: { marginBottom: 5, paddingBottom: 7 },
//   rateMainTitle: {
//     fontSize: 18,
//     fontWeight: "800",
//     color: "#fff",
//     marginBottom: 4,
//   },
//   rateMainSubtitle: { fontSize: 16, fontWeight: "600", color: "#76a4e0" },
//   noDataText: {
//     textAlign: "center",
//     paddingVertical: 30,
//     fontSize: 15,
//     color: "#6b7280",
//     fontStyle: "italic",
//   },

//   segmentDetails: { flexDirection: "row", justifyContent: "space-between" },
//   segmentItem: { flex: 1 },

//   scheduleContainer: {
//     gap: 10,
//     // marginTop: 8,
//   },
//   verifySection: {
//     marginVertical: 16,
//   },

//   verifyTitle: {
//     fontSize: 15,
//     fontWeight: "600",
//     color: "#374151",
//     marginBottom: 10,
//   },
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

//   shiftDate: {
//     fontSize: 12,
//     fontWeight: "700",
//     color: "#1E2937",
//     width: 85,
//   },

//   timeContainer: {
//     flex: 1,
//     flexDirection: "row",
//     alignItems: "center",
//     gap: 6,
//   },

//   timeText: {
//     fontSize: 12,
//     fontWeight: "700",
//     color: "#0F172A",
//   },

//   arrow: {
//     fontSize: 16,
//     color: "#64748B",
//     fontWeight: "500",
//   },

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
//   radioCircle: {
//     width: 20,
//     height: 20,
//     borderRadius: 10,
//     borderWidth: 2,
//     borderColor: "#0F766E",
//     marginRight: 12,
//     justifyContent: "center",
//     alignItems: "center",
//   },

//   radioInner: {
//     width: 10,
//     height: 10,
//     borderRadius: 5,
//     backgroundColor: "#0F766E",
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

//   guardsCount: {
//     fontSize: 12,
//     fontWeight: "800",
//     color: "#0A7C6E",
//   },
//   noteText: {
//     marginTop: 5,
//     fontSize: 10,
//     color: "#7c7a7a",
//     lineHeight: 14,
//   },
//   guardsLabel: {
//     fontSize: 10,
//     color: "#64748B",
//     marginTop: -2,
//   },

//   noShiftsText: {
//     textAlign: "center",
//     color: "#94A3B8",
//     fontSize: 15,
//     padding: 20,
//   },
//   totalLine: {
//     flexDirection: "row",
//     justifyContent: "space-between",
//     paddingVertical: 10,
//     borderBottomWidth: 1,
//     borderBottomColor: "#f1f5f9",
//   },

//   totalLineNoBorder: {
//     borderBottomWidth: 0,
//   },

//   totalLineBorder: {
//     borderBottomWidth: 1,
//     borderBottomColor: "#f1f5f9",
//   },

//   finalTotalLine: {
//     flexDirection: "row",
//     justifyContent: "space-between",
//     paddingTop: 16,
//     paddingBottom: 8,
//   },

//   paymentOptionsCard: {
//     backgroundColor: "#111111",

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
//     marginTop: "auto",
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

//   payNowText: {
//     color: "#fff",
//     fontSize: 18,
//     fontWeight: "800",
//   },
//   loadingContainer: {
//     flex: 1,
//     justifyContent: "center",
//     alignItems: "center",
//     backgroundColor: "#f8fafc",
//   },
//   loadingText: { marginTop: 16, fontSize: 16, color: "#4b5563" },
//   errorContainer: {
//     flex: 1,
//     justifyContent: "center",
//     alignItems: "center",
//     padding: 40,
//     backgroundColor: "#f8fafc",
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
//   paymentModalContainer: {
//     backgroundColor: "#fff",
//     borderRadius: 20,
//     padding: 24,
//   },
//   closeButton: { position: "absolute", top: 14, right: 20, zIndex: 1 },
//   closeText: { fontSize: 32, color: "#6B7280", fontWeight: "300" },
//   pmTitle: {
//     fontSize: 20,
//     fontWeight: "700",
//     color: "#111827",
//     marginBottom: 4,
//   },
//   pmSubtitle: { fontSize: 13, color: "#6b7280", marginBottom: 16 },

//   savedCardsList: { maxHeight: 240, marginBottom: 16 },
//   savedCardItem: {
//     flexDirection: "row",
//     alignItems: "center",
//     padding: 16,
//     backgroundColor: "#F8FAFC",
//     borderRadius: 12,
//     marginBottom: 10,
//     borderWidth: 1,
//     borderColor: "#E5E7EB",
//   },
//   savedCardSelected: { borderColor: "#6366F1", backgroundColor: "#EFF6FF" },
//   cardInfo: { marginLeft: 14, flex: 1 },
//   cardHolder: { fontSize: 16, fontWeight: "600", color: "#1F2937" },
//   cardLast4: { fontSize: 15, color: "#6B7280", marginTop: 2 },
//   newCardForm: { marginBottom: 0 },
//   input: {
//     borderWidth: 1,
//     borderColor: "#D1D5DB",
//     borderRadius: 10,
//     padding: 14,
//     color: "#111827",
//     fontSize: 16,
//     backgroundColor: "#fff",
//     marginBottom: 0,
//   },
//   errorTextSmall: {
//     color: "#EF4444",
//     fontSize: 13,
//     marginBottom: 12,
//     textAlign: "center",
//   },
//   payButton: {
//     backgroundColor: "#16A34A",
//     paddingVertical: 18,
//     borderRadius: 16,
//     alignItems: "center",
//     marginTop: 8,
//   },
//   payButtonText: { color: "#fff", fontSize: 18, fontWeight: "700" },
//   cancelButton: { marginTop: 16, paddingVertical: 16, alignItems: "center" },
//   cancelText: { color: "#EF4444", fontSize: 16, fontWeight: "600" },

//   policyText: { fontSize: 14, color: "#ffff", flex: 1 },
//   policyLink: { color: "#0A7C6E", fontWeight: "700" },

//   modalContainer: { flex: 1, backgroundColor: "#f8fafc" },
//   modalHeader: {
//     backgroundColor: "#ffffff",
//     paddingHorizontal: 20,
//     paddingVertical: 18,
//     flexDirection: "row",
//     alignItems: "center",
//     justifyContent: "space-between",
//     borderBottomWidth: 1,
//     borderBottomColor: "#e2e8f0",
//     shadowColor: "#000",
//     shadowOffset: { width: 0, height: 3 },
//     shadowOpacity: 0.08,
//     shadowRadius: 8,
//     elevation: 5,
//   },
//   headerLeft: { flexDirection: "row", alignItems: "center", gap: 14 },
//   modalLogo: { width: 70, height: 30 },
//   modalTitle: { fontSize: 14, fontWeight: "700", color: "#0f172a" },
//   modalSubtitle: { fontSize: 10, color: "#64748b", marginTop: 2 },
//   closeBtn: { padding: 5, borderRadius: 30, backgroundColor: "#f1f5f9" },

//   modalScroll: { flex: 1 },
//   modalScrollContent: { padding: 20, paddingBottom: 40 },

//   policyCard: {},
//   highlightedInfo: {
//     backgroundColor: "#e0f2fe",
//     padding: 18,
//     borderRadius: 16,
//     marginBottom: 24,
//     borderLeftWidth: 5,
//     borderLeftColor: "#3b82f6",
//   },
//   highlightText: {
//     fontSize: 15.5,
//     color: "#1e40af",
//     fontWeight: "600",
//     lineHeight: 24,
//     marginBottom: 6,
//   },
//   policyBodyText: {
//     fontSize: 16,
//     color: "#1e2937",
//     lineHeight: 26,
//     letterSpacing: 0.15,
//   },
//   lastUpdated: {
//     textAlign: "center",
//     marginTop: 28,
//     fontSize: 13.5,
//     color: "#94a3b8",
//     fontWeight: "500",
//   },
//   modalFooter: {
//     paddingHorizontal: 20,
//     paddingVertical: 20,
//     backgroundColor: "#ffffff",
//     borderTopWidth: 1,
//     borderTopColor: "#e2e8f0",
//   },
//   acceptBtn: {
//     backgroundColor: "#001F3F",
//     paddingVertical: 18,
//     borderRadius: 16,
//     alignItems: "center",
//     flexDirection: "row",
//     justifyContent: "center",
//     shadowColor: "#2e4b69",
//     shadowOffset: { width: 0, height: 8 },
//     shadowOpacity: 0.35,
//     shadowRadius: 12,
//     elevation: 10,
//   },
//   acceptBtnText: { color: "#fff", fontSize: 17.5, fontWeight: "700" },
//   errorText: {
//     color: "#EF4444",
//     fontSize: 12,
//     marginTop: 4,
//     marginLeft: 4,
//   },
//   rateSegmentCard: {
//     backgroundColor: "rgba(255,255,255,0.06)",
//     borderRadius: 18,
//     padding: 15,
//     marginBottom: 12,
//     borderWidth: 1,
//     borderColor: "rgba(255,255,255,0.08)",

//     width: "100%",
//   },
//   segmentPeriod: {
//     color: "#89E7D0",
//     fontWeight: "800",
//     fontSize: 15,
//     marginBottom: 12,
//   },

//   segmentLabel: {
//     color: "#94A3B8",
//     fontSize: 12,
//   },

//   segmentValue: {
//     color: "#fff",
//     fontSize: 15,
//     fontWeight: "700",
//   },

//   totalsBlock: {
//     marginTop: 14,

//     backgroundColor: "rgba(255,255,255,0.05)",

//     borderRadius: 20,
//     padding: 16,

//     borderWidth: 1,
//     borderColor: "rgba(255,255,255,0.08)",
//   },

//   totalLabel: {
//     color: "#CBD5E1",
//     fontSize: 14,
//     fontFamily: courierFont,
//     includeFontPadding: false,
//   },

//   totalGST: {
//     color: "#CBD5E1",
//     fontSize: 15,
//   },
//   quoteTotal: {
//     color: "#CBD5E1",
//     fontSize: 14,
//     fontWeight: "700",
//     fontFamily: courierFont,
//     includeFontPadding: false,
//   },

//   quoteTotalvalue: {
//     color: "#CBD5E1",
//     fontSize: 14,
//     fontWeight: "700",
//     fontFamily: courierFont,
//     includeFontPadding: false,
//   },

//   subtotalValue: {
//     color: "#fff",
//     fontWeight: "700",
//     fontFamily: courierFont,
//     includeFontPadding: false,
//   },

//   gstValue: {
//     color: "#CBD5E1",
//     fontWeight: "700",
//     fontFamily: courierFont,
//     includeFontPadding: false,
//   },

//   finalTotalLabel: {
//     color: "#89E7D0",
//     fontSize: 17,
//     fontWeight: "800",
//     fontFamily: courierFont,
//     includeFontPadding: false,
//   },

//   finalTotalValue: {
//     color: "#fff",
//     fontSize: 20,
//     fontWeight: "900",
//     fontFamily: courierFont,
//     includeFontPadding: false,
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

//   planName: {
//     color: "#fff",
//     fontSize: 16,
//     fontWeight: "800",
//   },

//   planDesc: {
//     color: "#CBD5E1",
//     fontSize: 12,
//     lineHeight: 18,
//   },

//   planAmount: {
//     color: "#89E7D0",
//     fontSize: 20,
//     fontWeight: "900",
//   },

//   planAmountSelected: {
//     color: "#89E7D0",
//   },
//   policyContainer: {
//     flexDirection: "row",
//     alignItems: "center",

//     backgroundColor: "#111111",

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

//   checkboxChecked: {
//     backgroundColor: "#0A7C6E",
//   },
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

//   editButtonText: {
//     color: "#89E7D0",
//     fontWeight: "700",
//     fontSize: 16,
//   },

//   descriptionRow: {
//     marginBottom: 12,
//   },
//   segmentDescription: {
//     fontSize: 16,
//     fontWeight: "700",
//     color: "#fff",
//     marginBottom: 4,
//   },
//   segmentRateType: {
//     fontSize: 14,
//     color: "#89E7D0",
//     fontWeight: "600",
//   },

//   detailsRow: {
//     flexDirection: "row",
//     justifyContent: "space-between",
//     paddingTop: 8,
//     borderTopWidth: 1,
//     borderTopColor: "rgba(255,255,255,0.08)",
//   },
//   detailColumn: {
//     // alignItems: 'center',
//     flex: 1,
//   },
//   detailLabel: {
//     fontSize: 9,
//     color: "#94A3B8",
//     marginBottom: 4,
//     textAlign: "center",
//   },
//   detailValue: {
//     fontSize: 16,
//     color: "#fff",
//     fontWeight: "600",
//   },
//   detailValueBold: {
//     fontSize: 16,
//     color: "#fff",
//     fontWeight: "700",
//   },

//   quoteTotalLine: {
//     borderBottomWidth: 1,
//     borderBottomColor: "#89E7D0",
//     paddingBottom: 12,
//     marginBottom: 8,
//   },

//   tabContainer: {
//     flexDirection: "row",
//     marginVertical: 16,
//     backgroundColor: "#f1f5f9",
//     borderRadius: 12,
//     padding: 4,
//   },
//   tabButton: {
//     flex: 1,
//     paddingVertical: 12,
//     alignItems: "center",
//     borderRadius: 10,
//   },
//   tabButtonActive: {
//     backgroundColor: "#fff",
//     shadowColor: "#000",
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.1,
//     shadowRadius: 4,
//     elevation: 3,
//   },
//   tabText: {
//     fontSize: 15,
//     fontWeight: "600",
//     color: "#64748B",
//   },
//   tabTextActive: {
//     color: "#0A7C6E",
//   },

//   savedCardsSection: {
//     marginBottom: 16,
//   },
//   noSavedCardText: {
//     textAlign: "center",
//     color: "#94A3B8",
//     fontSize: 15,
//     marginVertical: 30,
//   },

//   amountBar: {
//     backgroundColor: "#0A7C6E",
//     padding: 16,
//     borderRadius: 12,
//     marginVertical: 12,
//     flexDirection: "row",
//     justifyContent: "space-between",
//     alignItems: "center",
//   },
//   jobTitleText: {
//     color: "#fff",
//     fontSize: 16,
//     fontWeight: "600",
//   },
//   amountText: {
//     color: "#fff",
//     fontSize: 20,
//     fontWeight: "700",
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
  };
  uploadedFileUrls?: string[];
  uploadedFileNames?: string[];
  selectedDocuments?: string[];
};

const courierFont = Platform.select({
  ios: "Courier New",
  android: "monospace",
});

// ─── Human-readable labels for each rate segment ─────────────────────────────
const SEGMENT_LABELS: Record<string, string> = {
  weekday_day: "Mon–Thu Day (06:00–18:00)",
  weekday_night: "Mon–Thu Night (18:00–06:00)",
  fri_day: "Friday Day (06:00–18:00)",
  fri_night: "Friday Night (18:00–06:00)",
  sat_day: "Saturday Day (06:00–18:00)",
  sat_night: "Saturday Night (18:00–06:00)",
  sun_day: "Sunday Day (06:00–18:00)",
  sun_night: "Sunday Night (18:00–06:00)",
  pub_holi_day: "Public Holiday Day (06:00–18:00)",
  pub_holi_night: "Public Holiday Night (18:00–06:00)",
};

function getDayType(d: Date): string {
  const day = d.getDay();
  if (day === 0) return "sun";
  if (day === 5) return "fri";
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
    n.setHours(6, 0, 0, 0);
  }
  return n;
}

function calcBreakdown(shiftsInput: any[], r: RatesConfig): CostBreakdown {
  if (!shiftsInput?.length) {
    return { chargeTotal: 0, guardHours: 0, breakdown: [], totalShiftHours: 0 };
  }

  const hMap = new Map<string, number>();
  const order: string[] = [];

  let totalCharge = 0;
  let totalGuardHours = 0;
  let totalShiftHours = 0;

  shiftsInput.forEach((shift) => {
    const guards = Math.max(1, Number(shift.guardsCount || 1));
    const startDt = new Date(shift.startTime);
    const endDt = new Date(shift.endTime);

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

  const bd: ShiftSegment[] = [];
  order.forEach((k) => {
    const guardHrs = hMap.get(k) ?? 0;
    const [dayType, slotType] = k.split("_") as [string, "day" | "night"];
    const rate = r.charge[dayType]?.[slotType] ?? 0;
    totalCharge += guardHrs * rate;
    bd.push({
      label: SEGMENT_LABELS[k] ?? k,
      hours: guardHrs,
      payRate: 0,
      chargeRate: rate,
    });
  });

  return {
    chargeTotal: totalCharge,
    guardHours: totalGuardHours,
    breakdown: bd,
    totalShiftHours,
  };
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function ReviewConfirmScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const {
    jobData = {},
    uploadedFileUrls = [],
    uploadedFileNames = [],
    selectedDocuments = [],
  } = (route.params || {}) as RouteParams;

  const BASE_URL = "https://apis.staffoo.com.au/api";
  const LOGO = require("../assets/staffoo.png");

  // ── state ──
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rates, setRates] = useState<RatesConfig | null>(null);
  const [ratesLoading, setRatesLoading] = useState(true);
  const [ratesError, setRatesError] = useState<string | null>(null);
  const [acceptedPolicy, setAcceptedPolicy] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PaymentPlan>("full");
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [savedCards, setSavedCards] = useState<Card[]>([]);
  const [selectedSavedIndex, setSelectedSavedIndex] = useState(0);
  const [paymentTab, setPaymentTab] = useState<"saved" | "new">("saved");
  const [cardError, setCardError] = useState("");
  const [processing, setProcessing] = useState(false);
  // cardComplete is only used for NEW card entry
  const [cardComplete, setCardComplete] = useState(false);
  const [cardHolderName, setCardHolderName] = useState("");
  const [nameError, setNameError] = useState("");

  const extractedState = jobData.location?.split(",").pop()?.trim() ?? "";

  // ── helpers ──
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

  // ─── FIX: isPaymentReady ─────────────────────────────────────────────────
  // Saved card: only need a valid payment_method_id — NO card re-entry required.
  // New card:   need holder name (≥3 chars) + complete card fields.
  // ────────────────────────────────────────────────────────────────────────────
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

  const getChargeAmount = (total: number) =>
    parseFloat(
      (selectedPlan === "full" ? total * 0.95 : total * 0.5).toFixed(2),
    );

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
    const formattedShifts = (jobData.shifts || []).map((shift: any) => {
      const s = parseLocalDate(shift.startTime),
        e = parseLocalDate(shift.endTime);
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
    const payload = {
      user_id: user.id,
      title: jobData.title || getCategoryDisplay(jobData.category),
      description: jobData.description || "No description provided",
      address: jobData.location || "Not specified",
      coordinates: `${jobData.lat},${jobData.lng}`,
      state: "open",
      posting_type: "broadcast",
      shifts: formattedShifts,
      job_level: Number(jobData.jobLevel ?? 1),
      payment_option: selectedPlan,
      job_location_state: extractedState,
      financials: {
        base_total_inc_gst: parseFloat(totalIncGST.toFixed(2)),
        discount_applied:
          selectedPlan === "full"
            ? parseFloat((totalIncGST * 0.05).toFixed(2))
            : 0,
        amount_to_charge_today: parseFloat(ctaAmount.toFixed(2)),
        balance_deferred:
          selectedPlan === "split"
            ? parseFloat((totalIncGST * 0.5).toFixed(2))
            : 0,
      },
      is_document: selectedDocuments.length > 0,
      document_list: uploadedFileUrls || [],
      document_types: selectedDocuments || [],
      job_instruction: jobData.description || "",
      tasks: (jobData.tasks || []).map((t: any) => ({
        task: t.task || t.title || "",
        task_start: t.task_start || formatTime(t.startTime),
        task_end: t.task_end || formatTime(t.endTime),
      })),
      payment_intent_id: intentId,
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
        routes: [{ name: "Applications" as never }],
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

  // ─── Fetch rates ──────────────────────────────────────────────────────────
  useEffect(() => {
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

        const jobLevelStr = String(jobData.jobLevel ?? "1");
        const matched =
          res.data.data.find(
            (item: any) => String(item.level) === jobLevelStr,
          ) ?? res.data.data[0];

        const r = matched;
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
        console.error("[RATES] error:", msg);
        setRatesError(msg);
      } finally {
        setRatesLoading(false);
      }
    })();
  }, []);

  const costBreakdown = useMemo(() => {
    if (!rates || !jobData.shifts?.length) {
      return {
        chargeTotal: 0,
        guardHours: 0,
        breakdown: [],
        totalShiftHours: 0,
      };
    }
    return calcBreakdown(jobData.shifts, rates);
  }, [rates, jobData.shifts]);

  const subtotal = costBreakdown.chargeTotal;
  const gst = subtotal * 0.1;
  const totalIncGST = subtotal * 1.1;
  const fullPayAmount = parseFloat((totalIncGST * 0.95).toFixed(2));
  const splitUpfront = parseFloat((totalIncGST * 0.5).toFixed(2));
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

  const PRIVACY_POLICY_TEXT = `Staffoo: Terms of Service & Privacy Policy\nEffective Date: March 14, 2026\n\nOperated by: Capital Services Pty Ltd\nABN: 48 613 317 838\nRegistered Office: 21 Tanglewood Bvd, Truganina VIC 3029, Australia\n\nPart 1: Privacy Policy\n1.1 Overview\nStaffoo (operated by Capital Services Pty Ltd) is committed to protecting the privacy of our customers, contractors, and staff in accordance with the Privacy Act 1988 (Cth) and the Australian Privacy Principles (APPs).\n\n1.2 Information Collection & GPS Tracking\nGPS Movement Tracking: Staffoo tracks the GPS location of all staff and contractors while "Clocked In". By using the app, workforce users consent to real-time location monitoring.\n\n1.3 Payment Security (Stripe)\nStaffoo does not store sensitive financial or credit card data. All transactions are processed via Stripe (PCI-DSS compliant).\n\nPart 2: Terms for Customers\n2.1 Booking and Payment Holds\nA payment hold will be placed upon job acceptance. Funds are captured upon shift completion.\n\n2.2 Cancellation & Refund Policy\nCancellations more than 24 hours before shift: full release. Within 1 hour: minimum 4-hour charge applies.\n\nPart 3: Workforce Compliance\nAll personnel must hold a current Security License for their State or Territory.\n\nPart 4: Code of Conduct\nArrive 10 minutes early. Wear specified attire. Zero tolerance for alcohol/substances. Protect all customer site data.\n\nPart 5: Contact\nAdmin Office: 21 Tanglewood Bvd, Truganina VIC 3029\nEmail: staffoo.com.au | Phone: 1800782366`;

  // ── loading / error guards ──
  if (ratesLoading)
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0A7C6E" />
        <Text style={styles.loadingText}>Loading data…</Text>
      </View>
    );

  if (ratesError || !rates)
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>
          Cannot load rates:{"\n"}
          {ratesError}
        </Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );

  // ── render ──
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ChevronLeft size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Review & Confirm</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* ── Job Level Badge ─────────────────────────────────────────────── */}
        <View style={styles.levelBadgeRow}>
          <View style={styles.levelBadge}>
            <Text style={styles.levelBadgeText}>
              Security Level {jobData.jobLevel ?? 1}
            </Text>
          </View>
          <Text style={styles.levelBadgeDesc}>
            {getCategoryDisplay(jobData.category)}
          </Text>
        </View>

        {/* ── Job Details ─────────────────────────────────────────────────── */}
        <View style={styles.card}>
          <View style={styles.cardSectionHeader}>
            <Text style={styles.sectionTitle}>Job Details</Text>
          </View>
          {[
            {
              label: "Job Title",
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
              <Text style={styles.label}>{label}:</Text>
              <View style={styles.inputCard}>
                <Text style={styles.inputCardText}>{value}</Text>
              </View>
            </View>
          ))}
          {uploadedFileUrls.length > 0 && (
            <View style={styles.detailRow}>
              <Text style={styles.label}>Attachments:</Text>
              <View style={styles.inputCard}>
                {uploadedFileUrls.map((url, i) => (
                  <View
                    key={i}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      marginTop: i === 0 ? 0 : 6,
                    }}
                  >
                    <Files size={18} color="#0A7C6E" />
                    <Text
                      style={{
                        marginLeft: 8,
                        color: "#0A7C6E",
                        flexShrink: 1,
                        fontSize: 14,
                      }}
                      numberOfLines={1}
                    >
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

        {/* ── Schedule Summary ─────────────────────────────────────────────── */}
        <View style={styles.card}>
          <View style={styles.cardSectionHeader}>
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
                      <User size={14} color="#0A7C6E" />
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

        {/* ── Rate Breakdown ───────────────────────────────────────────────── */}
        <View style={styles.rateCard}>
          <View style={styles.rateMainHeader}>
            <Text style={styles.rateMainTitle}>Quotation Breakdown</Text>
            <Text style={styles.rateMainSubtitle}>
              {costBreakdown.totalShiftHours.toFixed(2)} Total Billable Hours
            </Text>
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
                    <Text style={styles.rowLabel}>Rate Type</Text>
                    <View style={styles.valueWrap}>
                      <Text style={styles.rowValue}>{item.label}</Text>
                    </View>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.rowLabel}>Description</Text>
                    <View style={styles.valueWrap}>
                      <Text style={styles.rowValue}>
                        {capitalizeAllWords(
                          getCategoryDisplay(jobData.category),
                        )}
                      </Text>
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

              {/* Totals block */}
              <View style={styles.totalsBlock}>
                <View style={[styles.totalLine, styles.totalLineNoBorder]}>
                  <Text style={styles.totalLabel}>Subtotal (Ex GST)</Text>
                  <Text style={styles.subtotalValue}>
                    ${subtotal.toFixed(2)}
                  </Text>
                </View>
                <View style={styles.totalLine}>
                  <Text style={styles.totalLabel}>GST (10%)</Text>
                  <Text style={styles.gstValue}>${gst.toFixed(2)}</Text>
                </View>
                <View style={[styles.totalLine, styles.totalLineNoBorder]}>
                  <Text style={styles.quoteTotal}>Quote Total</Text>
                  <Text style={styles.quoteTotalvalue}>
                    ${totalIncGST.toFixed(2)}
                  </Text>
                </View>

                {selectedPlan === "full" && (
                  <View style={styles.totalLine}>
                    <Text style={styles.totalLabel}>
                      Pay In Full Discount (5%)
                    </Text>
                    <Text style={{ color: "#16A34A", fontWeight: "700" }}>
                      -${(totalIncGST * 0.05).toFixed(2)}
                    </Text>
                  </View>
                )}
                {selectedPlan === "split" && (
                  <View style={styles.totalLine}>
                    <Text style={styles.totalLabel}>
                      Split Payment (50% now)
                    </Text>
                    <Text style={{ color: "#64748B", fontWeight: "600" }}>
                      ${splitUpfront.toFixed(2)}
                    </Text>
                  </View>
                )}

                <View style={styles.finalTotalLine}>
                  <Text style={styles.finalTotalLabel}>
                    {selectedPlan === "full" ? "Amount Payable" : "Payable Now"}
                  </Text>
                  <Text style={[styles.finalTotalValue, { color: "#0A7C6E" }]}>
                    {selectedPlan === "full"
                      ? `$${fullPayAmount.toFixed(2)}`
                      : `$${splitUpfront.toFixed(2)}`}
                  </Text>
                </View>
              </View>
            </>
          )}
        </View>

        {/* ── Payment Options ──────────────────────────────────────────────── */}
        <View style={styles.paymentOptionsCard}>
          <View style={styles.paymentOptionsHeader}>
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
                    <Check size={10} color="#fff" />
                  </View>
                )}
                <View style={styles.planTitleRow}>
                  <Text
                    style={[
                      styles.planName,
                      selectedPlan === plan && styles.planNameSelected,
                    ]}
                  >
                    {plan === "full" ? "Pay In Full" : "Split Payment (50/50)"}
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

        {/* ── Terms ───────────────────────────────────────────────────────── */}
        <TouchableOpacity
          style={styles.policyContainer}
          onPress={() => setAcceptedPolicy(!acceptedPolicy)}
        >
          <View
            style={[styles.checkbox, acceptedPolicy && styles.checkboxChecked]}
          >
            {acceptedPolicy && <Check size={16} color="#fff" />}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.policyText}>
              I Agree To The{" "}
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
            <Text style={styles.noteText}>
              *Note: A 10% incidental authorisation hold may be applied by
              stripe to cover potential unplanned overtime. The hold will be
              released after completion of the shift.
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.payNowButton,
            (!acceptedPolicy || isSubmitting) && styles.disabledButton,
          ]}
          onPress={openPaymentModal}
          disabled={!acceptedPolicy || isSubmitting}
        >
          <Lock size={20} color="#fff" style={{ marginRight: 10 }} />
          <Text style={styles.payNowText}>
            {selectedPlan === "full"
              ? `Pay $${fullPayAmount.toFixed(2)} & Post Job`
              : `Pay $${splitUpfront.toFixed(2)} & Post Job`}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.editButton}
          onPress={() => navigation.goBack()}
        >
          <ArrowLeft size={20} color="#0A7C6E" />
          <Text style={styles.editButtonText}>Edit Details</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* ── Privacy Policy Modal ─────────────────────────────────────────── */}
      <Modal
        visible={showPolicyModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPolicyModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
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
            >
              <X size={18} color="#b72f0d" />
            </TouchableOpacity>
          </View>
          <ScrollView
            style={styles.modalScroll}
            contentContainerStyle={styles.modalScrollContent}
          >
            <View style={styles.highlightedInfo}>
              <Text style={styles.highlightText}>
                Effective Date: March 14, 2026
              </Text>
              <Text style={styles.highlightText}>
                Operated by: Capital Services Pty Ltd
              </Text>
              <Text style={styles.highlightText}>ABN: 48 613 317 838</Text>
              <Text style={styles.highlightText}>
                Registered Office: 21 Tanglewood Bvd, Truganina VIC 3029,
                Australia
              </Text>
            </View>
            <Text style={styles.policyBodyText}>{PRIVACY_POLICY_TEXT}</Text>
            <Text style={styles.lastUpdated}>
              Capital Services Pty Ltd • ABN 48 613 317 838
            </Text>
          </ScrollView>
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.acceptBtn}
              onPress={() => {
                setAcceptedPolicy(true);
                setShowPolicyModal(false);
              }}
            >
              <Check size={22} color="#fff" style={{ marginRight: 10 }} />
              <Text style={styles.acceptBtnText}>
                I Accept the Terms & Privacy Policy
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
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
                {/* Header & Amount Bar (unchanged) */}
                <View style={pmStyles.headerRow}>
                  <View>
                    <Text style={pmStyles.title}>Complete Payment</Text>
                    <Text style={pmStyles.subtitle}>
                      Direct Payment To The Service Provider.
                    </Text>
                  </View>
                  <View style={pmStyles.securedBadge}>
                    <Lock size={12} color="#6366F1" />
                    <Text style={pmStyles.securedText}>
                      {" "}
                      Secured By <Text style={pmStyles.stripeBlue}>Stripe</Text>
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={pmStyles.closeBtn}
                  onPress={() => !processing && setPaymentModalVisible(false)}
                  disabled={processing}
                >
                  <X size={22} color="#6B7280" />
                </TouchableOpacity>

                <View style={pmStyles.amountBar}>
                  <Text style={pmStyles.amountBarTitle} numberOfLines={1}>
                    {jobData.title ||
                      capitalizeAllWords(
                        getCategoryDisplay(jobData.category),
                      ) ||
                      "Security Service"}{" "}
                    — Level {jobData.jobLevel ?? 1}
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

                {/* Saved Cards - Display Only */}
                {paymentTab === "saved" && (
                  <>
                    {savedCards.length === 0 ? (
                      <Text style={pmStyles.noCardsText}>
                        No saved cards available. Please enter new card details
                        below.
                      </Text>
                    ) : (
                      <View style={pmStyles.savedCardsBox}>
                        <Text style={pmStyles.savedCardsHint}>
                          Select a card for reference (you must re-enter card
                          details for security)
                        </Text>
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
                                {item.card_number
                                  ?.replace(/(.{4})/g, "$1 ")
                                  .trim()}
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
                  </>
                )}

                {/* Card Details - Always Required */}
                <Text style={pmStyles.sectionLabel}>Card Details</Text>
                <TextInput
                  placeholder="Card Holder Name"
                  value={cardHolderName}
                  onChangeText={handleCardHolderName}
                  autoCapitalize="words"
                  style={[
                    pmStyles.input,
                    nameError ? { borderColor: "#EF4444" } : null,
                  ]}
                  placeholderTextColor="#9CA3AF"
                />
                {nameError ? (
                  <Text style={pmStyles.fieldError}>{nameError}</Text>
                ) : null}

                <CardField
                  postalCodeEnabled={false}
                  placeholders={{ number: "Card number", cvc: "CVC" }}
                  cardStyle={{
                    backgroundColor: "#FFFFFF",
                    textColor: "#111827",
                    borderColor: "#D1D5DB",
                    borderWidth: 1,
                    borderRadius: 10,
                    fontSize: 16,
                    placeholderColor: "#9CA3AF",
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
                      <ActivityIndicator color="#fff" />
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
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 12,
    position: "relative",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 4,
  },
  title: { fontSize: 16, fontWeight: "800", color: "#111827", marginBottom: 2 },
  subtitle: { fontSize: 11, color: "#6B7280" },
  securedBadge: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 20,
    paddingHorizontal: 7,
    paddingVertical: 5,
  },
  securedText: { fontSize: 9, color: "#374151" },
  stripeBlue: { color: "#6366F1", fontWeight: "700" },
  closeBtn: {
    position: "absolute",
    top: 0,
    right: 0,
    padding: 14,
    zIndex: 10,
    backgroundColor: "#fff",
    borderRadius: 20,
  },
  amountBar: {
    backgroundColor: "#0A7C6E",
    borderRadius: 12,
    padding: 7,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 6,
    marginBottom: 8,
  },
  amountBarTitle: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
    flex: 1,
    marginRight: 8,
  },
  amountBarValue: { color: "#fff", fontSize: 15, fontWeight: "800" },
  sectionLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 5,
    marginTop: 4,
  },
  tabRow: { flexDirection: "row", gap: 10, marginBottom: 14 },
  tabBtn: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  tabBtnActive: { backgroundColor: "#0A7C6E", borderColor: "#0A7C6E" },
  tabBtnInactive: { backgroundColor: "#fff", borderColor: "#0A7C6E" },
  tabLabel: { fontSize: 12, fontWeight: "700" },
  tabLabelActive: { color: "#fff" },
  tabLabelInactive: { color: "#0A7C6E" },
  savedCardsBox: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 8,
    backgroundColor: "#F9FAFB",
    marginBottom: 12,
  },
  savedCardsHint: { fontSize: 12, color: "#6B7280", marginBottom: 8 },
  savedCardRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
  },
  savedCardRowSelected: { borderColor: "#0A7C6E", backgroundColor: "#fff" },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: "#9CA3AF",
    marginRight: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  radioActive: { borderColor: "#0A7C6E" },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#0A7C6E",
  },
  cardName: { fontSize: 13, fontWeight: "700", color: "#111827" },
  cardNumber: {
    fontSize: 14,
    color: "#374151",
    letterSpacing: 1,
    marginTop: 2,
  },
  cardExpiry: { fontSize: 11, color: "#6B7280", marginTop: 2 },
  selectedCheckBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#0A7C6E",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  noCardsText: {
    textAlign: "center",
    color: "#9CA3AF",
    fontSize: 12,
    marginVertical: 14,
  },
  input: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 10,
    padding: 10,
    color: "#111827",
    fontSize: 12,
    backgroundColor: "#fff",
    marginBottom: 5,
  },
  cardField: { width: "100%", height: 45, marginBottom: 6 },
  fieldError: { color: "#EF4444", fontSize: 12, marginBottom: 8 },
  cardErrorText: {
    color: "#EF4444",
    fontSize: 13,
    textAlign: "center",
    marginBottom: 8,
  },
  poweredBy: {
    textAlign: "center",
    fontSize: 10,
    color: "#9CA3AF",
    marginTop: 8,
    marginBottom: 12,
  },
  actionRow: { flexDirection: "row", gap: 10, alignItems: "center" },
  payBtn: {
    flex: 1,
    backgroundColor: "#0A7C6E",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  payBtnDisabled: { backgroundColor: "#9CA3AF" },
  payBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  cancelBtn: {
    borderWidth: 1.5,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  cancelBtnText: { color: "#374151", fontSize: 15, fontWeight: "600" },
});

// ─── Main Styles ──────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#111111", paddingTop: 55 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginHorizontal: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 0.5,
  },
  scrollContent: { padding: 16, paddingBottom: 100 },
  levelBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
    gap: 10,
  },
  levelBadge: {
    backgroundColor: "#0A7C6E",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  levelBadgeText: { color: "#fff", fontWeight: "800", fontSize: 13 },
  levelBadgeDesc: {
    color: "#94A3B8",
    fontSize: 13,
    fontWeight: "500",
    flex: 1,
  },
  levelRateBadge: {
    backgroundColor: "rgba(20,230,201,0.12)",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: "flex-start",
    marginTop: 6,
  },
  levelRateBadgeText: { color: "#14E6C9", fontSize: 11, fontWeight: "700" },
  card: {
    backgroundColor: "#111111",
    borderRadius: 24,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  cardSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 10,
  },
  sectionTitle: { fontSize: 20, fontWeight: "800", color: "#fff" },
  valueWrap: { flex: 2, alignItems: "flex-end" },
  detailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  label: {
    color: "#89E7D0",
    fontWeight: "700",
    fontSize: 13,
    marginBottom: 6,
    width: 90,
  },
  inputCard: {
    flex: 2,
    backgroundColor: "#e4f1f9",
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
  inputCardText: { fontSize: 12, color: "#030303", fontWeight: "700" },
  rateCard: {
    backgroundColor: "#111111",
    borderRadius: 24,
    padding: 18,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  rowItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginVertical: 6,
    width: "100%",
    gap: 12,
  },
  rowLabel: { fontSize: 10, color: "#94A3B8", fontWeight: "600", flex: 1 },
  rowValue: {
    fontSize: 12,
    color: "#fff",
    fontWeight: "600",
    textAlign: "right",
  },
  rateMainHeader: { marginBottom: 5, paddingBottom: 7 },
  rateMainTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#fff",
    marginBottom: 4,
  },
  rateMainSubtitle: { fontSize: 14, fontWeight: "600", color: "#76a4e0" },
  noDataText: {
    textAlign: "center",
    paddingVertical: 30,
    fontSize: 15,
    color: "#6b7280",
    fontStyle: "italic",
  },
  scheduleContainer: { gap: 10 },
  shiftChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e4f1f9",
    borderRadius: 30,
    padding: 5,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginLeft: 10,
    paddingLeft: 20,
    paddingRight: 10,
  },
  shiftDate: { fontSize: 12, fontWeight: "700", color: "#1E2937", width: 85 },
  timeContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  timeText: { fontSize: 12, fontWeight: "700", color: "#0F172A" },
  arrow: { fontSize: 16, color: "#64748B", fontWeight: "500" },
  nextDayTag: {
    fontSize: 11,
    color: "#F59E0B",
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontWeight: "600",
    marginLeft: 4,
  },
  guardsBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EEF4FF",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 14,
    gap: 4,
  },
  guardsCount: { fontSize: 12, fontWeight: "800", color: "#0A7C6E" },
  noShiftsText: {
    textAlign: "center",
    color: "#94A3B8",
    fontSize: 15,
    padding: 20,
  },
  totalLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  totalLineNoBorder: { borderBottomWidth: 0 },
  finalTotalLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 16,
    paddingBottom: 8,
  },
  paymentOptionsCard: {
    backgroundColor: "#111111",
    borderRadius: 24,
    padding: 18,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  paymentOptionsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
  },
  paymentOptionsTitle: { fontSize: 20, fontWeight: "700", color: "#fff" },
  paymentOptionsRow: { flexDirection: "row", gap: 10 },
  planSelectedDot: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#0A7C6E",
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
  planNameSelected: { color: "#0A7C6E" },
  saveBadge: {
    backgroundColor: "#16a34a",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 20,
  },
  saveBadgeText: { fontSize: 11, color: "#fff", fontWeight: "700" },
  planAmountRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginTop: "auto" as any,
  },
  planAmountLabel: { fontSize: 13, color: "#9ca3af" },
  disabledButton: { opacity: 0.55 },
  payNowButton: {
    backgroundColor: "#0047FF",
    borderRadius: 20,
    paddingVertical: 14,
    marginBottom: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0047FF",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 12,
  },
  payNowText: { color: "#fff", fontSize: 18, fontWeight: "800" },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#111111",
  },
  loadingText: { marginTop: 16, fontSize: 16, color: "#94A3B8" },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
    backgroundColor: "#111111",
  },
  backButton: {
    backgroundColor: "#0A7C6E",
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  backButtonText: { color: "white", fontSize: 16, fontWeight: "600" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    padding: 10,
  },
  policyText: { fontSize: 14, color: "#fff", flex: 1 },
  policyLink: { color: "#0A7C6E", fontWeight: "700" },
  noteText: { marginTop: 5, fontSize: 10, color: "#7c7a7a", lineHeight: 14 },
  modalContainer: { flex: 1, backgroundColor: "#f8fafc" },
  modalHeader: {
    backgroundColor: "#ffffff",
    paddingHorizontal: 20,
    paddingVertical: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 14 },
  modalLogo: { width: 70, height: 30 },
  modalTitle: { fontSize: 14, fontWeight: "700", color: "#0f172a" },
  modalSubtitle: { fontSize: 10, color: "#64748b", marginTop: 2 },
  closeBtn: { padding: 5, borderRadius: 30, backgroundColor: "#f1f5f9" },
  modalScroll: { flex: 1 },
  modalScrollContent: { padding: 20, paddingBottom: 40 },
  highlightedInfo: {
    backgroundColor: "#e0f2fe",
    padding: 18,
    borderRadius: 16,
    marginBottom: 24,
    borderLeftWidth: 5,
    borderLeftColor: "#3b82f6",
  },
  highlightText: {
    fontSize: 15.5,
    color: "#1e40af",
    fontWeight: "600",
    lineHeight: 24,
    marginBottom: 6,
  },
  policyBodyText: {
    fontSize: 16,
    color: "#1e2937",
    lineHeight: 26,
    letterSpacing: 0.15,
  },
  lastUpdated: {
    textAlign: "center",
    marginTop: 28,
    fontSize: 13.5,
    color: "#94a3b8",
    fontWeight: "500",
  },
  modalFooter: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
  acceptBtn: {
    backgroundColor: "#001F3F",
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
  },
  acceptBtnText: { color: "#fff", fontSize: 17.5, fontWeight: "700" },
  errorText: { color: "#EF4444", fontSize: 12, marginTop: 4, marginLeft: 4 },
  rateSegmentCard: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 18,
    padding: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    width: "100%",
  },
  totalsBlock: {
    marginTop: 14,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  totalLabel: {
    color: "#CBD5E1",
    fontSize: 14,
    fontFamily: courierFont,
    includeFontPadding: false,
  } as any,
  quoteTotal: {
    color: "#CBD5E1",
    fontSize: 14,
    fontWeight: "700",
    fontFamily: courierFont,
    includeFontPadding: false,
  } as any,
  quoteTotalvalue: {
    color: "#CBD5E1",
    fontSize: 14,
    fontWeight: "700",
    fontFamily: courierFont,
    includeFontPadding: false,
  } as any,
  subtotalValue: {
    color: "#fff",
    fontWeight: "700",
    fontFamily: courierFont,
    includeFontPadding: false,
  } as any,
  gstValue: {
    color: "#CBD5E1",
    fontWeight: "700",
    fontFamily: courierFont,
    includeFontPadding: false,
  } as any,
  finalTotalLabel: {
    color: "#89E7D0",
    fontSize: 17,
    fontWeight: "800",
    fontFamily: courierFont,
    includeFontPadding: false,
  } as any,
  finalTotalValue: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "900",
    fontFamily: courierFont,
    includeFontPadding: false,
  } as any,
  planCard: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    minHeight: 180,
  },
  planCardSelected: {
    borderColor: "#89E7D0",
    backgroundColor: "rgba(137,231,208,0.08)",
  },
  planName: { color: "#fff", fontSize: 16, fontWeight: "800" },
  planDesc: { color: "#CBD5E1", fontSize: 12, lineHeight: 18 },
  planAmount: { color: "#89E7D0", fontSize: 20, fontWeight: "900" },
  planAmountSelected: { color: "#89E7D0" },
  policyContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#111111",
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    marginBottom: 18,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#89E7D0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  checkboxChecked: { backgroundColor: "#0A7C6E" },
  editButton: {
    borderWidth: 1.5,
    borderColor: "#89E7D0",
    borderRadius: 18,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  editButtonText: { color: "#89E7D0", fontWeight: "700", fontSize: 16 },
  detailsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
  },
  detailColumn: { flex: 1 },
  detailValue: { fontSize: 16, color: "#fff", fontWeight: "600" },
  detailValueBold: { fontSize: 16, color: "#fff", fontWeight: "700" },
});
