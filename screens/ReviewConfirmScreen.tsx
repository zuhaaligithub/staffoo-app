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

  // const submitJob = async (intentId: string | null) => {
  //   const user = JSON.parse((await AsyncStorage.getItem("user"))!);
  //   const parseLocalDate = (value: any): Date => {
  //     if (!value) return new Date();
  //     if (value instanceof Date) return value;
  //     if (typeof value === "string") {
  //       if (value.includes("T")) return new Date(value);
  //       if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
  //         const [y, m, d] = value.split("-").map(Number);
  //         return new Date(y, m - 1, d);
  //       }
  //     }
  //     return new Date(value);
  //   };
  //   const formatTime = (ds: string) => {
  //     const d = new Date(ds);
  //     return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  //   };
  //   const formattedShifts = (jobData.shifts || []).map((shift: any) => {
  //     const s = parseLocalDate(shift.startTime),
  //       e = parseLocalDate(shift.endTime);
  //     return {
  //       start: `${s.getFullYear()}-${pad(s.getMonth() + 1)}-${pad(
  //         s.getDate(),
  //       )}T${pad(s.getHours())}:${pad(s.getMinutes())}`,
  //       end: `${e.getFullYear()}-${pad(e.getMonth() + 1)}-${pad(
  //         e.getDate(),
  //       )}T${pad(e.getHours())}:${pad(e.getMinutes())}`,
  //       numberOfGuards: Number(shift.guardsCount || 1),
  //     };
  //   });
  //   const payload = {
  //     user_id: user.id,
  //     title: jobData.title || getCategoryDisplay(jobData.category),
  //     description: jobData.description || "No description provided",
  //     address: jobData.location || "Not specified",
  //     coordinates: `${jobData.lat},${jobData.lng}`,
  //     state: "open",
  //     posting_type: "broadcast",
  //     shifts: formattedShifts,
  //     job_level: Number(jobData.jobLevel ?? 1),
  //     payment_option: selectedPlan,
  //     job_location_state: extractedState,
  //     financials: {
  //       base_total_inc_gst: parseFloat(totalIncGST.toFixed(2)),
  //       discount_applied:
  //         selectedPlan === "full"
  //           ? parseFloat((totalIncGST * 0.05).toFixed(2))
  //           : 0,
  //       amount_to_charge_today: parseFloat(ctaAmount.toFixed(2)),
  //       balance_deferred:
  //         selectedPlan === "split"
  //           ? parseFloat((totalIncGST * 0.5).toFixed(2))
  //           : 0,
  //     },
  //     is_document: selectedDocuments.length > 0,
  //     document_list: uploadedFileUrls || [],
  //     document_types: selectedDocuments || [],
  //     job_instruction: jobData.description || "",
  //     tasks: (jobData.tasks || []).map((t: any) => ({
  //       task: t.task || t.title || "",
  //       task_start: t.task_start || formatTime(t.startTime),
  //       task_end: t.task_end || formatTime(t.endTime),
  //     })),
  //     payment_intent_id: intentId,
  //   };
  //   console.log("[CREATE JOB PAYLOAD]", JSON.stringify(payload, null, 2));
  //   return postJob(payload);
  // };

  // const submitJob = async (intentId: string | null) => {
  //   const user = JSON.parse((await AsyncStorage.getItem("user"))!);

  //   const parseLocalDate = (value: any): Date => {
  //     if (!value) return new Date();
  //     if (value instanceof Date) return value;

  //     if (typeof value === "string") {
  //       if (value.includes("T")) return new Date(value);

  //       if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
  //         const [y, m, d] = value.split("-").map(Number);
  //         return new Date(y, m - 1, d);
  //       }
  //     }

  //     return new Date(value);
  //   };

  //   const formatTime = (ds: string) => {
  //     const d = new Date(ds);
  //     return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  //   };

  //   const locationParts = (jobData.location || "")
  //     .split(",")
  //     .map((item: string) => item.trim());

  //   const extractedState =
  //     locationParts.length >= 2 ? locationParts[locationParts.length - 2] : "";

  //   console.log("Location:", jobData.location);
  //   console.log("Extracted State:", extractedState);

  //   const formattedShifts = (jobData.shifts || []).map((shift: any) => {
  //     const s = parseLocalDate(shift.startTime);
  //     const e = parseLocalDate(shift.endTime);

  //     return {
  //       start: `${s.getFullYear()}-${pad(s.getMonth() + 1)}-${pad(
  //         s.getDate(),
  //       )}T${pad(s.getHours())}:${pad(s.getMinutes())}`,
  //       end: `${e.getFullYear()}-${pad(e.getMonth() + 1)}-${pad(
  //         e.getDate(),
  //       )}T${pad(e.getHours())}:${pad(e.getMinutes())}`,
  //       numberOfGuards: Number(shift.guardsCount || 1),
  //     };
  //   });

  //   const payload = {
  //     user_id: user.id,
  //     job_type: jobData.category || "others",
  //     description: jobData.description || "No description provided",
  //     address: jobData.location || "Not specified",
  //     coordinates: `${jobData.lat},${jobData.lng}`,

  //     state: "open",
  //     posting_type: "broadcast",

  //     shifts: formattedShifts,

  //     job_level: Number(jobData.jobLevel ?? 1),

  //     payment_option: selectedPlan,

  //     job_location_state: extractedState,

  //     financials: {
  //       base_total_inc_gst: parseFloat(totalIncGST.toFixed(2)),
  //       discount_applied:
  //         selectedPlan === "full"
  //           ? parseFloat((totalIncGST * 0.05).toFixed(2))
  //           : 0,
  //       amount_to_charge_today: parseFloat(ctaAmount.toFixed(2)),
  //       balance_deferred:
  //         selectedPlan === "split"
  //           ? parseFloat((totalIncGST * 0.5).toFixed(2))
  //           : 0,
  //     },

  //     is_document: selectedDocuments.length > 0,
  //     document_list: uploadedFileUrls || [],
  //     document_types: selectedDocuments || [],

  //     job_instruction: jobData.description || "",

  //     tasks: (jobData.tasks || []).map((t: any) => ({
  //       task: t.task || t.title || "",
  //       task_start: t.task_start || formatTime(t.startTime),
  //       task_end: t.task_end || formatTime(t.endTime),
  //     })),

  //     payment_intent_id: intentId,
  //   };

  //   console.log("[CREATE JOB PAYLOAD]", JSON.stringify(payload, null, 2));

  //   return postJob(payload);
  // };

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

    const getStateFromAddress = (address: string) => {
      if (!address) return "";

      // Known abbreviation -> full name maps for common countries
      const AU: Record<string, string> = {
        VIC: "Victoria",
        NSW: "New South Wales",
        QLD: "Queensland",
        WA: "Western Australia",
        SA: "South Australia",
        TAS: "Tasmania",
        ACT: "Australian Capital Territory",
        NT: "Northern Territory",
      };

      const US: Record<string, string> = {
        AL: "Alabama",
        AK: "Alaska",
        AZ: "Arizona",
        AR: "Arkansas",
        CA: "California",
        CO: "Colorado",
        CT: "Connecticut",
        DE: "Delaware",
        FL: "Florida",
        GA: "Georgia",
        HI: "Hawaii",
        ID: "Idaho",
        IL: "Illinois",
        IN: "Indiana",
        IA: "Iowa",
        KS: "Kansas",
        KY: "Kentucky",
        LA: "Louisiana",
        ME: "Maine",
        MD: "Maryland",
        MA: "Massachusetts",
        MI: "Michigan",
        MN: "Minnesota",
        MS: "Mississippi",
        MO: "Missouri",
        MT: "Montana",
        NE: "Nebraska",
        NV: "Nevada",
        NH: "New Hampshire",
        NJ: "New Jersey",
        NM: "New Mexico",
        NY: "New York",
        NC: "North Carolina",
        ND: "North Dakota",
        OH: "Ohio",
        OK: "Oklahoma",
        OR: "Oregon",
        PA: "Pennsylvania",
        RI: "Rhode Island",
        SC: "South Carolina",
        SD: "South Dakota",
        TN: "Tennessee",
        TX: "Texas",
        UT: "Utah",
        VT: "Vermont",
        VA: "Virginia",
        WA: "Washington",
        WV: "West Virginia",
        WI: "Wisconsin",
        WY: "Wyoming",
      };

      const CA: Record<string, string> = {
        AB: "Alberta",
        BC: "British Columbia",
        MB: "Manitoba",
        NB: "New Brunswick",
        NL: "Newfoundland and Labrador",
        NS: "Nova Scotia",
        ON: "Ontario",
        PE: "Prince Edward Island",
        QC: "Quebec",
        SK: "Saskatchewan",
        NT: "Northwest Territories",
        NU: "Nunavut",
        YT: "Yukon",
      };

      const countryNames = [
        "Australia",
        "United States",
        "United States of America",
        "USA",
        "Canada",
        "India",
        "Pakistan",
        "United Kingdom",
        "UK",
      ];

      const parts = address
        .split(",")
        .map((p) => p.trim())
        .filter(Boolean);

      const last = parts[parts.length - 1] || "";
      const secondLast = parts[parts.length - 2] || "";

      // If last token is a recognized country, for AU/US/CA return the previous token
      // otherwise return the country itself (useful for India, Pakistan, etc.)
      const normalizedLast = last.replace(/\./g, "").trim();
      const matchedCountry = countryNames.find(
        (c) =>
          normalizedLast.toLowerCase() === c.toLowerCase() ||
          normalizedLast.toLowerCase().includes(c.toLowerCase()),
      );

      if (matchedCountry) {
        const countriesWhereStateIsSecondLast = [
          "Australia",
          "United States",
          "United States of America",
          "USA",
          "Canada",
        ];
        if (countriesWhereStateIsSecondLast.includes(matchedCountry)) {
          return secondLast;
        }
        return matchedCountry;
      }

      // Search for known abbreviations anywhere in the address tokens (reverse priority)
      const tokens = address
        .replace(/[.]/g, " ")
        .split(/[,\s]+/)
        .map((t) => t.trim())
        .filter(Boolean)
        .reverse();

      for (const t of tokens) {
        const up = t.toUpperCase();
        if (AU[up]) return AU[up];
        if (US[up]) return US[up];
        if (CA[up]) return CA[up];
      }

      // If second last looks like a region (not purely numeric) return it, otherwise fall back to last
      const maybe = secondLast || last;
      if (maybe && !/^[0-9\-]+$/.test(maybe)) return maybe;

      return "";
    };

    const extractedState = getStateFromAddress(jobData.location || "");

    console.log("Location:", jobData.location);
    console.log("Extracted State:", extractedState);

    const formattedShifts = (jobData.shifts || []).map((shift: any) => {
      const s = parseLocalDate(shift.startTime);
      const e = parseLocalDate(shift.endTime);

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
      job_type: jobData.category || "others",
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

  const PRIVACY_POLICY_TEXT = `Staffoo: Terms of Service & Privacy Policy\nEffective Date: March 14, 2026\n\nOperated by: Capital Services Pty Ltd\nABN: 48 613 317 838\nRegistered Office: 21 Tanglewood Bvd, Truganina VIC 3029, Australia\n\nPart 1: Privacy Policy\n1.1 Overview\nStaffoo (operated by Capital Services Pty Ltd) is committed to protecting the privacy of our customers, contractors, and staff in accordance with the Privacy Act 1988 (Cth) and the Australian Privacy Principles (APPs).\n\n1.2 Information Collection & GPS Tracking\nGPS Movement Tracking: Staffoo tracks the GPS location of all staff and contractors while "Clocked In". By using the app, workforce users consent to real-time location monitoring.\n\n1.3 Payment Security (Stripe)\nStaffoo does not store sensitive financial or credit card data. All transactions are processed via Stripe (PCI-DSS compliant).\n\nPart 2: Terms for Customers\n2.1 Booking and Payment Holds\nA payment hold will be placed upon job acceptance. Funds are captured upon shift completion.\n\n2.2 Cancellation & Refund Policy\nCancellations more than 24 hours before shift: full release. Within 1 hour: minimum 4-hour charge applies.\n\nPart 3: Workforce Compliance\nAll personnel must hold a current Security License for their State or Territory.\n\nPart 4: Code of Conduct\nArrive 10 minutes early. Wear specified attire. Zero tolerance for alcohol/substances. Protect all customer site data.\n\nPart 5: Contact\nAdmin Office: 21 Tanglewood Bvd, Truganina VIC 3029\nEmail: admin@staffoo.com.au | Phone: 1800782366`;

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
                    {selectedPlan === "full"
                      ? "Amount Payable"
                      : "Amount Payable"}
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
                      Direct payment to the service provider.
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
                          Select a card to view its details, then enter them
                          below.
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
