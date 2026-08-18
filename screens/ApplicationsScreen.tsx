import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Modal,
  Platform,
  ActivityIndicator,
  Alert,
  TextInput,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
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
  Search,
  Layers,
  CalendarDays,
} from "lucide-react-native";

import BottomTab from "./BottomTab";
import BrandLoader from "./BrandLoader";
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
  purple: "#A78BFA",
  heroBg1: "#0D1F2D",
  heroBg2: "#061014",
};

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
  // >1 means this guard belongs to a resource partner (RP) rather than
  // being directly managed — used to decide whether to show "Assigned by".
  user_id?: number;
}

interface Shift {
  signinTime?: string;
  signoutTime?: string;
  signinLocation?: string;
  signoutLocation?: string;
  signinNotes?: string;
  signoutNotes?: string;
  // Resource partner (contractor) name — who this shift was assigned by,
  // only meaningful when guardData.user_id > 1 (an RP guard).
  assignedByName?: string;
  id: number;
  siteName: string;
  address?: string;
  siteRadius?: string;
  guard: string;
  description?: string;
  documents?: string[];
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

interface Pagination {
  current_page: number;
  per_page: number;
  total: number;
  last_page: number;
  next_page_url?: string | null;
  prev_page_url?: string | null;
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

// Initials for the guard avatar bubble on each shift card.
const getInitials = (name?: string): string => {
  if (!name) return "?";
  const parts = name.trim().split(" ").filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return parts[0][0].toUpperCase() + parts[parts.length - 1][0].toUpperCase();
};

export default function WeeklyRosterScreen({ navigation }: any) {
  const [refreshing, setRefreshing] = useState(false);
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

  // ─── PAGINATION STATE ───────────────────────────────────────────────────
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  // The REAL total shift count across every page, straight from the API's
  // pagination.total. This — not shifts.length — is what should drive the
  // "Total Shifts" badge, since shifts.length only reflects how many pages
  // have been loaded into memory so far via "Load More".
  const [totalJobs, setTotalJobs] = useState(0);

  const currentDate = new Date();

  // ─── DATE RANGE STATE (replaces fixed weekStart) ───────────────────────────
  const getMonday = (d: Date) => {
    const nd = new Date(d);
    nd.setHours(0, 0, 0, 0);
    nd.setDate(nd.getDate() - nd.getDay() + (nd.getDay() === 0 ? -6 : 1));
    return nd;
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchShifts(1); // always restart from page 1
    } finally {
      setRefreshing(false);
    }
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

  // Full month name display, e.g. "13 July 2026"
  const formatDateDisplay = (date: Date) =>
    `${date.getDate().toString().padStart(2, "0")} ${date.toLocaleString(
      "default",
      { month: "long" },
    )} ${date.getFullYear()}`;

  // Number of days currently selected (inclusive)
  const rangeDayCount = useMemo(() => {
    const diff = Math.round(
      (rangeEnd.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24),
    );
    return Math.max(diff + 1, 1);
  }, [rangeStart, rangeEnd]);

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
        shiftStart:
          shift.dateStr && shift.startTime
            ? `${shift.dateStr} ${shift.startTime}`
            : shift.startTime || "N/A",
        shiftEnd:
          shift.dateStr && shift.endTime
            ? `${shift.dateStr} ${shift.endTime}`
            : shift.endTime || "N/A",
        totalHours: shift.hours || 0,
        jobStatus: shift.jobStatus || "confirmed",
        date: shift.dateStr || "",
        signinDetails: {
          signin_time: shift.signinTime || shift.startTime, // ← real sign-in
          signout_time: shift.signoutTime || shift.endTime, // ← real sign-out
          location: shift.signinLocation || shift.address || "N/A",
          signout_location: shift.signoutLocation || "N/A",

          signin_notes: shift.signinNotes || "N/A",
          signout_notes: shift.signoutNotes || "N/A",
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

  const sortShiftsDesc = (list: Shift[]) =>
    [...list].sort(
      (a, b) =>
        new Date(
          `${b.dateStr.split("/").reverse().join("-")} ${b.startTime}`,
        ).getTime() -
        new Date(
          `${a.dateStr.split("/").reverse().join("-")} ${a.startTime}`,
        ).getTime(),
    );

  const mapJobToShift = (job: any): Shift => {
    const startDate = new Date(job.start);
    const endDate = new Date(job.end);

    return {
      id: job.id,

      signinTime: job.roster_activity?.signin_time || job.start, // actual sign-in
      signoutTime: job.roster_activity?.signout_time || job.end, // actual sign-out
      signinLocation: job.roster_activity?.signin_location || job.site?.address,
      signoutLocation: job.roster_activity?.signout_location || "",
      signinNotes: job.roster_activity?.signin_notes || "",
      signoutNotes: job.roster_activity?.signout_notes || "",

      signin_lat: job.roster_activity?.signin_lat,
      signin_lng: job.roster_activity?.signin_lng,
      signout_lat: job.roster_activity?.signout_lat,
      signout_lng: job.roster_activity?.signout_lng,

      siteName: job.site?.site_name || "Unnamed Site",
      address: job.site?.address || "",
      siteRadius: job.site?.signin_radius || "",

      description: job.description || job.site?.site_description || "",

      documents: job.document_list ? JSON.parse(job.document_list) : [],

      guard: job.guards?.name || "Unassigned",
      guardData: job.guards
        ? {
            id: job.guards.id,
            name: job.guards.name,
            email: job.guards.email,
            phone: job.guards.phone,
            user_type: job.guards.user_type,
            user_id: job.guards.user_id,
          }
        : undefined,

      // Resource partner (contractor) this guard belongs to. Only actually
      // shown when guardData.user_id > 1 (see cardBottom / DetailRow below) —
      // storing it unconditionally here is harmless for everyone else.
      assignedByName: job.contractor?.name,

      customer: job.customer
        ? {
            id: job.customer.id,
            name: job.customer.name,
            email: job.customer.email,
            phone: job.customer.phone,
            user_type: job.customer.user_type,
          }
        : undefined,

      dayShort: DAYS[startDate.getDay()],

      dateStr: `${startDate.getDate().toString().padStart(2, "0")}/${(
        startDate.getMonth() + 1
      )
        .toString()
        .padStart(2, "0")}/${startDate.getFullYear()}`,

      startTime: startDate.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }),

      endTime: endDate.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }),

      tag:
        job.job_status === "confirmed"
          ? "Confirmed"
          : job.job_status === "pending"
          ? "Pending"
          : "Completed",

      jobStatus: job.job_status,
      hours: Number(job.hours || 0),
      cardBackground: "#fff",
      jobType: job.job_type,
      jobAmount: job.job_amount,
      isAsap: job.asap === 1,
      inPaysheet: job.in_paysheet,
      paymentStatus: job.payment_status,
      shiftPayable: job.shift_payable,
      createdAt: job.created_at,

      signout_location: job.roster_activity?.signout_location,
    };
  };

  // pageNum = which page to fetch. Page 1 replaces the list, any page > 1
  // (triggered by "Load More") appends to the existing list.
  const fetchShifts = async (pageNum: number = 1) => {
    try {
      if (pageNum === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      setError(null);

      const token = await AsyncStorage.getItem("@auth_token");
      if (!token) throw new Error("No token");

      const userStr = await AsyncStorage.getItem("user");
      if (!userStr) throw new Error("No user");

      const loggedInUser = JSON.parse(userStr);
      const currentUserId = loggedInUser.id;

      setUserType(loggedInUser?.user_type || null);

      const payload = {
        user_id: [currentUserId],
        page: pageNum,
        start: formatDateMMDDYYYY(rangeStart),
        end: formatDateMMDDYYYY(rangeEnd),
        roster_id: "1",
      };

      const res = await axios.post(`${BASE_URL}/job-details`, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      });

      const jobsData: any[] = Array.isArray(res.data?.data)
        ? res.data.data
        : [];

      const newShifts: Shift[] = jobsData.map(mapJobToShift);

      setShifts((prev) => {
        const combined = pageNum === 1 ? newShifts : [...prev, ...newShifts];
        const sorted = sortShiftsDesc(combined);
        setTotalHours(sorted.reduce((sum, s) => sum + s.hours, 0));
        return sorted;
      });

      // ── Pagination: current_page / last_page / total ALWAYS come from
      // the API's pagination object when present — this is the fix for
      // the "Total Shifts" badge only ever showing the loaded-so-far
      // count instead of the real total (58 in your example, even though
      // only 16 were loaded on page 1).
      const pagination: Pagination | undefined = res.data?.pagination;
      if (pagination) {
        setPage(pagination.current_page || pageNum);
        setLastPage(pagination.last_page || 1);
        setTotalJobs(pagination.total || 0);
      } else {
        // Backend didn't return pagination info — fall back to counting
        // what we actually have loaded, and assume there's no more.
        setPage(pageNum);
        setLastPage(pageNum);
        setTotalJobs((prev) =>
          pageNum === 1 ? newShifts.length : prev + newShifts.length,
        );
      }
    } catch (err: any) {
      setError(err.message || "Failed to load shifts");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    if (loadingMore || loading) return;
    if (page >= lastPage) return;
    fetchShifts(page + 1);
  };

  useEffect(() => {
    // New date range selected -> always restart from page 1
    fetchShifts(1);
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

  const formatAustralianDateTime = (dateString: string) => {
    const date = new Date(dateString.replace(" ", "T"));

    return {
      date: date.toLocaleDateString("en-AU", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
      time: date.toLocaleTimeString("en-AU", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }),
    };
  };

  // Updated status colors: pending -> danger, confirmed -> warning,
  // completed -> success. "solid" mirrors the same base color and is used
  // for the card's top strip / status dot.
  const getStatusPill = (status: string) => {
    switch (status.toLowerCase()) {
      case "pending":
        return {
          bg: "#F59E0B33", // light orange
          text: "#F59E0B",
          solid: "#F59E0B",
        };

      case "confirmed":
        return {
          bg: "#10B98133", // light green
          text: "#10B981",
          solid: "#10B981",
        };

      case "completed":
      case "complete":
        return {
          bg: "#3B82F633", // light blue
          text: "#3B82F6",
          solid: "#3B82F6",
        };

      default:
        return {
          bg: "#6B728033",
          text: "#6B7280",
          solid: "#6B7280",
        };
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

  // value is typed string on purpose — every call site below passes a
  // string (numbers are formatted/interpolated first) so a stray number
  // never gets handed to <Text> as a raw child.
  const DetailRow = ({ label, value }: { label: string; value: string }) => (
    <View style={detailStyles.row}>
      <Text style={detailStyles.rowLabel}>{label}</Text>
      <Text style={detailStyles.rowValue}>{value}</Text>
    </View>
  );

  // Whether the currently-viewed shift's guard is a resource-partner (RP)
  // guard whose "Assigned by" name we have and should show to staff users.
  const showAssignedByForShift = (shift: Shift | null) =>
    !!(
      shift &&
      shift.guardData?.user_id &&
      shift.guardData.user_id > 1 &&
      shift.assignedByName
    );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* ── FIXED TOP SECTION: hero, search, date navigator, section header ── */}
      <View style={styles.fixedHeader}>
        {/* ── Hero header ── */}
        <LinearGradient
          colors={[COLORS.heroBg1, COLORS.heroBg2]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <View style={styles.heroInner}>
            <View style={styles.heroTopRow}>
              <TouchableOpacity
                style={styles.heroBackBtn}
                onPress={() => navigation.navigate("Profile")}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <ChevronLeft size={20} color="#fff" />
              </TouchableOpacity>

              <View style={styles.liveBadge}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>LIVE</Text>
              </View>
            </View>

            <Text style={styles.heroTitle}>Job Applications and Shifts</Text>

            <Text style={styles.heroSubtitle}>
              Viewing shifts for the selected date range
            </Text>

            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <View style={styles.statLabelRow}>
                  <CalendarDays size={12} color={COLORS.textSecondary} />

                  <Text style={styles.statLabel}>DATE RANGE</Text>
                </View>

                <Text style={styles.statValue} numberOfLines={2}>
                  {rangeLabel}
                </Text>
              </View>

              <View style={styles.statDivider} />

              <View style={styles.statBox}>
                <View style={styles.statLabelRow}>
                  <Layers size={12} color={COLORS.textSecondary} />

                  <Text style={styles.statLabel}>TOTAL SHIFTS</Text>
                </View>

                <Text style={styles.statValue}>
                  {totalJobs || filteredShifts.length}
                </Text>
              </View>
            </View>
          </View>
        </LinearGradient>
        {/* ── Search ── */}
        <View style={styles.searchContainer}>
          <View style={styles.searchInputWrap}>
            <Search size={16} color={COLORS.textMuted} />
            <TextInput
              placeholder="Search by site name or job status..."
              placeholderTextColor={COLORS.textMuted}
              value={searchText}
              onChangeText={setSearchText}
              style={styles.searchInput}
            />
          </View>
        </View>

        {/* ── Date range navigator ── */}
        <View style={styles.weekNav}>
          <TouchableOpacity
            style={styles.weekArrow}
            onPress={() => navigateRange("prev")}
          >
            <ChevronLeft size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.datePill}
            onPress={() => setShowDateModal(true)}
            activeOpacity={0.85}
          >
            <Calendar
              size={16}
              color={COLORS.primary}
              style={{ marginRight: 6 }}
            />
            <Text
              style={styles.dateText}
              numberOfLines={2}
              adjustsFontSizeToFit
              minimumFontScale={0.75}
            >
              {rangeLabel}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.weekArrow}
            onPress={() => navigateRange("next")}
          >
            <ChevronRight size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* ── Section title row ── */}
        <View style={styles.sectionHeader}>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>
              {totalJobs || filteredShifts.length}{" "}
              {(totalJobs || filteredShifts.length) === 1 ? "Shift" : "Shifts"}
            </Text>
          </View>
          <View>
            {/* <Text style={styles.sectionTitle}>
              Shifts · {rangeDayCount} {rangeDayCount === 1 ? "Day" : "Days"}
            </Text> */}
            <Text style={styles.sectionSubTitle}>
              Total Hours: {totalHours.toFixed(2)}
            </Text>
          </View>
        </View>
      </View>

      {/* ── SCROLLABLE SHIFTS LIST ── */}
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary} // iOS spinner color
            colors={[COLORS.primary]} // Android spinner color
            progressBackgroundColor="#fff"
          />
        }
      >
        {loading ? (
          <View style={styles.center}>
            <BrandLoader size={64} />
            <Text style={styles.centerText}>Loading shifts…</Text>
          </View>
        ) : error ? (
          <View style={styles.center}>
            <Text style={[styles.centerText, { color: COLORS.danger }]}>
              {error}
            </Text>
          </View>
        ) : filteredShifts.length === 0 ? (
          <View style={styles.center}>
            <Text style={styles.centerText}>No shifts in this range</Text>
          </View>
        ) : (
          <View style={styles.cardList}>
            {filteredShifts.map((shift) => {
              const pill = getStatusPill(shift.jobStatus);
              const isCompleted = shift.jobStatus === "completed";
              // RP (resource-partner) guard whose "assigned by" name we
              // can show to a staff viewer. Computed once per card so the
              // JSX below stays a plain ternary (never a bare && chain
              // that could leak a raw 0/number into <View>).
              const isRpAssignment = showAssignedByForShift(shift);

              return (
                <View key={shift.id} style={styles.shiftCard}>
                  {/* Status-colored top strip */}
                  <View
                    style={[
                      styles.statusStrip,
                      { backgroundColor: pill.solid },
                    ]}
                  />

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
                        <View
                          style={[
                            styles.statusDot,
                            { backgroundColor: pill.solid },
                          ]}
                        />
                        <Text style={[styles.pillText, { color: pill.text }]}>
                          {shift.tag}
                        </Text>
                      </View>
                    </View>

                    {shift.address ? (
                      <View style={styles.addressRow}>
                        <MapPin
                          size={12}
                          color={COLORS.textSecondary}
                          style={{ marginRight: 4 }}
                        />
                        <Text style={styles.addressText} numberOfLines={1}>
                          {shift.address}
                        </Text>
                      </View>
                    ) : null}

                    <View style={styles.metaChipsRow}>
                      <View style={styles.metaChip}>
                        <CalendarDays size={11} color={COLORS.primary} />
                        <Text style={styles.metaChipText}>{shift.dateStr}</Text>
                      </View>
                      <View style={styles.metaChip}>
                        <Clock size={11} color={COLORS.primary} />
                        <Text style={styles.metaChipText}>
                          {shift.startTime} – {shift.endTime}
                        </Text>
                      </View>
                      <View style={styles.metaChip}>
                        <Timer size={11} color={COLORS.primary} />
                        <Text style={styles.metaChipText}>
                          {shift.hours} hours
                        </Text>
                      </View>
                    </View>

                    <View style={styles.cardDivider} />

                    <View style={styles.cardBottom}>
                      {/* Non-staff (contractor / customer) logins: always
                          show "Assigned to <guard>" — UNCHANGED from
                          before. Staff logins: normally blank, EXCEPT
                          when this is a resource-partner guard's shift,
                          in which case show "Assigned by <RP name>". */}
                      {userType === "staff" ? (
                        isRpAssignment ? (
                          <View style={styles.guardWrap}>
                            <View style={styles.guardAvatar}>
                              <Text style={styles.guardAvatarText}>
                                {getInitials(shift.assignedByName)}
                              </Text>
                            </View>
                            <View>
                              <Text style={styles.guardLabel}>
                                Assigned by Resource Partner
                              </Text>
                              <Text style={styles.guardName} numberOfLines={1}>
                                {toTitleCase(shift.assignedByName)}
                              </Text>
                            </View>
                          </View>
                        ) : (
                          <View style={{ flex: 1 }} />
                        )
                      ) : (
                        <View style={styles.guardWrap}>
                          <View style={styles.guardAvatar}>
                            <Text style={styles.guardAvatarText}>
                              {getInitials(shift.guard)}
                            </Text>
                          </View>
                          <View>
                            <Text style={styles.guardLabel}>Assigned to</Text>
                            <Text style={styles.guardName} numberOfLines={1}>
                              {toTitleCase(shift.guard)}
                            </Text>
                          </View>
                        </View>
                      )}

                      <TouchableOpacity
                        style={styles.viewBtn}
                        onPress={() => openShiftModal(shift)}
                        activeOpacity={0.85}
                      >
                        <Text style={styles.viewBtnText}>Details</Text>
                      </TouchableOpacity>
                    </View>

                    {isCompleted && (
                      <TouchableOpacity
                        style={styles.downloadBtn}
                        onPress={() => generateShiftPDF(shift)}
                        activeOpacity={0.85}
                      >
                        <FileText size={16} color="#fff" />
                        <Text style={styles.downloadText}>Download PDF</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })}

            {/* ─── LOAD MORE BUTTON ─────────────────────────────────────── */}
            {!searchText.trim() && page < lastPage && (
              <TouchableOpacity
                style={[
                  styles.loadMoreBtn,
                  loadingMore && styles.loadMoreBtnDisabled,
                ]}
                onPress={handleLoadMore}
                disabled={loadingMore}
                activeOpacity={0.85}
              >
                {loadingMore ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.loadMoreText}>
                    Load More ({shifts.length} of {totalJobs || shifts.length})
                  </Text>
                )}
              </TouchableOpacity>
            )}

            {!searchText.trim() && page >= lastPage && shifts.length > 0 && (
              <View style={styles.allLoadedRow}>
                <Text style={styles.allLoadedText}>
                  All {totalJobs || shifts.length} shifts loaded
                </Text>
              </View>
            )}
          </View>
        )}
        <View style={{ height: 20 }} />
      </ScrollView>

      {/* ─── DATE RANGE PICKER MODAL ────────────────────────────────────────── */}
      <Modal visible={showDateModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { width: "90%" }]}>
            <Text style={styles.modalTitle}>Select date range</Text>

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
                 textColor="#FFFFFF"
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
                 textColor="#FFFFFF"
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
                  Shift and Site Details
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
                      label="Job Type"
                      value={toTitleCase(selectedShift?.jobType) || "N/A"}
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

                    {/* Staff-only, RP-guard-only row — shows who assigned
                        this shift. Renders nothing for every other case,
                        so contractor/customer views are unaffected. */}
                    {userType === "staff" &&
                      showAssignedByForShift(selectedShift) && (
                        <DetailRow
                          label="Assigned By"
                          value={toTitleCase(selectedShift.assignedByName)}
                        />
                      )}

                    <DetailRow
                      label="Shift Time"
                      value={`${selectedShift.startTime} - ${selectedShift.endTime}`}
                    />

                    <DetailRow
                      label="Total Hours"
                      value={`${selectedShift.hours} hours`}
                    />

                    <DetailRow
                      label="Created At"
                      value={formatCreatedAt(selectedShift.createdAt)}
                    />
                    <DetailRow
                      label="Description"
                      value={
                        selectedShift.description || "No description available"
                      }
                    />

                    <DetailRow
                      label="Required Documents"
                      value={
                        selectedShift.documents?.length
                          ? selectedShift.documents
                              .map((doc: string) => {
                                const formatted = doc
                                  .replace(/_/g, " ")
                                  .replace(/\b\w/g, (c) => c.toUpperCase());

                                switch (formatted) {
                                  case "White Card":
                                    return "White Card Required";

                                  case "Working With Children":
                                    return "Working With Children Check Required";

                                  default:
                                    return formatted;
                                }
                              })
                              .join(", ")
                          : "No documents required"
                      }
                    />
                  </DetailCard>

                  {/* Customer Details */}
                  {/* {userType !== "customer" && (
                    <DetailCard
                      icon={<UserCircle size={20} color="#A78BFA" />}
                      title="Client Details"
                      iconBg="rgba(167,139,250,0.25)"
                    >
                      <DetailRow
                        label="Name"
                        value={
                          toTitleCase(selectedShift.customer?.name) || "N/A"
                        }
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
                  )} */}

                  {/* Assignment Details */}
                  {/* <DetailCard
                    icon={<ShieldCheck size={20} color="#34C88A" />}
                    title="Assignment Details"
                    iconBg="rgba(52,200,138,0.25)"
                  >
                    {userType !== "staff" && (
                      <DetailRow
                        label="Assigned To"
                        value={toTitleCase(selectedShift.guard)}
                      />
                    )}
                    <DetailRow
                      label="Job Type"
                      value={toTitleCase(selectedShift?.jobType) || "N/A"}
                    />
                    <DetailRow
                      label="Job Amount"
                      value={
                        selectedShift.jobAmount
                          ? `$${parseFloat(selectedShift.jobAmount)}`
                          : "N/A"
                      }
                    />
                  </DetailCard> */}
                </View>

                {/* Assign staff section (for contractors) */}
                {/* {selectedShift.jobStatus === "pending" && !isRestrictedUser && (
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
                        color={COLORS.primary}
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
                )} */}

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
    backgroundColor: COLORS.primary,
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
  },
  // Fixed (non-scrolling) top section: hero, search, date navigator,
  // section header. Only the shifts list below it scrolls.
  fixedHeader: {
    backgroundColor: COLORS.background,
    paddingBottom: 5,
  },
  scroll: { flex: 1 },

  hero: {
    paddingTop: Platform.OS === "ios" ? 5 : 26,
    paddingBottom: 10,
    paddingHorizontal: Platform.OS === "ios" ? 0 : 10,
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
    borderColor: COLORS.cardBorder,
     height: Platform.OS === "ios" ? 200 : undefined,
  },
  heroInner: {
    width: "100%",
    paddingHorizontal: 10,
    // paddingBottom: 8,
  },

  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  heroBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.08)",
    justifyContent: "center",
    alignItems: "center",
  },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(52,200,138,0.12)",
    borderWidth: 1,
    borderColor: "rgba(52,200,138,0.35)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.success,
  },
  liveText: {
    color: COLORS.success,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 2,
  },
  heroSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 10,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  statBox: {
    flex: 1,
    minWidth: 0,
    gap: 5,
  },
  statLabelRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  statLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: COLORS.textSecondary,
    letterSpacing: 0.6,
  },
  statValue: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.text,
    flexShrink: 1,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: COLORS.cardBorder,
    marginHorizontal: 8,
  },

  // ── Search ──
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  searchInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  searchInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: 14,
    padding: 0,
  },

  // ── Date range navigator ──
  weekNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 10,
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
    justifyContent: "center",
    backgroundColor: COLORS.card,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.primary,
    flexShrink: 1,
    flexGrow: 1,
    marginHorizontal: 8,
    minHeight: 34,
  },
  dateText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.primary,
    textAlign: "center",
    flexShrink: 1,
  },

  // ── Section header ──
  sectionHeader: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: COLORS.text,
  },
  sectionSubTitle: {
    fontSize: 12,
    fontWeight: "500",
    color: COLORS.textMuted,
    marginTop: 2,
  },
  countBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
  },
  countText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },

  cardList: {
    paddingHorizontal: 12,
    gap: 12,
    flexDirection: "column",
    marginBottom: 50,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
    marginTop: 40,
  },
  centerText: {
    marginTop: 16,
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: "center",
  },

  // ── Shift card ──
  shiftCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 4,
  },
  statusStrip: { height: 4, width: "100%" },
  siteCardInner: {
    padding: 14,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  siteName: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
    flex: 1,
    marginRight: 8,
  },
  addressRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  addressText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    flex: 1,
  },
  metaChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  metaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: COLORS.primaryGlow,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  metaChipText: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.text,
  },
  cardDivider: {
    borderTopWidth: 0.5,
    borderColor: COLORS.cardBorder,
    marginBottom: 12,
  },
  cardBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  guardWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  guardAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.primaryGlow,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
    justifyContent: "center",
    alignItems: "center",
  },
  guardAvatarText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: "700",
  },
  guardLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontWeight: "600",
  },
  guardName: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: "600",
    maxWidth: 120,
  },
  viewBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 10,
  },
  viewBtnText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  pillText: {
    fontSize: 11,
    fontWeight: "800",
  },
  downloadBtn: {
    flexDirection: "row",
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 12,
  },
  downloadText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "600",
  },
  loadMoreBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  loadMoreBtnDisabled: {
    opacity: 0.7,
  },
  loadMoreText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
  allLoadedRow: {
    alignItems: "center",
    paddingVertical: 14,
  },
  allLoadedText: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: "600",
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
