import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Platform,
  ActivityIndicator,
  Share,
} from "react-native";

import LinearGradient from "react-native-linear-gradient";
import DateTimePicker from "@react-native-community/datetimepicker";
import {
  Calendar,
  CalendarDays,
  Search,
  Users,
  MapPin,
  Info,
  ChevronRight,
  ArrowLeft,
} from "lucide-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getAuthToken } from "../services/authApi";

type Props = { navigation: any };
// ─────────────────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────────────────
const API_BASE = "https://apis-staging.staffoo.com.au/api";
// const API_BASE = "https://apis.staffoo.com.au/api";
const GET_TIMESHEET_URL = `${API_BASE}/getTimesheet`;
const GET_TIMESHEET_DETAILS_URL = `${API_BASE}/get-timesheet-details`;

// ─────────────────────────────────────────────────────────
// THEME
// ─────────────────────────────────────────────────────────
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
  info: "#5AA9E6",
  infoBg: "rgba(90,169,230,0.12)",
  heroBg1: "#0D1F2D",
  heroBg2: "#061014",
};

// ─────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────
type Job = "Regular" | "Public Holiday" | "Saturday" | "Sunday";
type JobStatus = "confirmed" | "completed" | "pending" | string;

// Row coming back from the getTimesheet summary API (one per staff/guard)
type TimesheetRow = {
  id: number | null;
  name: string | null;
  hours: number;
  morning_hours: number;
  night_hours: number;
  saturday_morning_hours: number;
  saturday_night_hours: number;
  sunday_morning_hours: number;
  sunday_night_hours: number;
  ph_morning_hours: number;
  ph_night_hours: number;
  shift_collection: number[];
};

// A single shift, expanded from get-timesheet-details
type ShiftDetail = {
  shiftId: number;
  site: string;
  customer: string;
  guard: string;
  start: Date;
  end: Date;
  total: number;
  job: Job;
  jobStatus: JobStatus;
  jobType: string;
  signIn: string;
  signOut: string;
};

type LoggedInUser = {
  id: number;
  name?: string;
  user_type?: string | null;
};

// ─────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────

// Australian date format: DD/MM/YYYY
const formatAU = (date: Date) =>
  `${date.getDate().toString().padStart(2, "0")}/${(date.getMonth() + 1)
    .toString()
    .padStart(2, "0")}/${date.getFullYear()}`;

// API expects MM-DD-YYYY (matches the sample payload: "05-05-2026" / "01-28-2027")
const formatAPIDate = (date: Date) =>
  `${(date.getMonth() + 1).toString().padStart(2, "0")}-${date
    .getDate()
    .toString()
    .padStart(2, "0")}-${date.getFullYear()}`;

const startOfDay = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);

// Parses "YYYY-MM-DD HH:mm" (or ISO) strings returned by the API into a Date
const parseAPIDateTime = (value: string | null | undefined): Date => {
  if (!value) return new Date(NaN);
  const normalized = value.includes("T") ? value : value.replace(" ", "T");
  const d = new Date(normalized);
  return isNaN(d.getTime()) ? new Date(NaN) : d;
};

const formatTime24h = (date: Date) => {
  if (isNaN(date.getTime())) return "--:--";

  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");

  return `${hours}:${minutes}`;
};

// Start of current week (Monday) → end of current week (Sunday)
const getCurrentWeekRange = () => {
  const now = new Date();
  const day = now.getDay(); // 0 = Sun, 1 = Mon, … 6 = Sat
  const diffToMonday = day === 0 ? -6 : 1 - day;

  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  return {
    from: startOfDay(monday),
    to: startOfDay(sunday),
  };
};

const { from: DEFAULT_FROM, to: DEFAULT_TO } = getCurrentWeekRange();

const jobBadgeStyle = (job: Job) => {
  switch (job) {
    case "Public Holiday":
      return { bg: COLORS.dangerBg, color: COLORS.danger };
    case "Saturday":
    case "Sunday":
      return { bg: COLORS.warningBg, color: COLORS.warning };
    default:
      return { bg: "rgba(148,163,184,0.12)", color: COLORS.textSecondary };
  }
};

const statusBadgeStyle = (status: JobStatus) => {
  switch ((status || "").toLowerCase()) {
    case "completed":
      return { bg: "rgba(52,200,138,0.12)", color: COLORS.success };
    case "confirmed":
      return { bg: COLORS.infoBg, color: COLORS.info };
    case "pending":
      return { bg: COLORS.warningBg, color: COLORS.warning };
    default:
      return { bg: "rgba(148,163,184,0.12)", color: COLORS.textSecondary };
  }
};

// Derive a display "job type" (Regular / Public Holiday / Saturday / Sunday)
// from the hour buckets returned for a shift's owning timesheet row, or —
// when unavailable per-shift — fall back to Regular.
const deriveJobFromRow = (row: TimesheetRow): Job => {
  if ((row.ph_morning_hours || 0) > 0 || (row.ph_night_hours || 0) > 0)
    return "Public Holiday";
  if (
    (row.saturday_morning_hours || 0) > 0 ||
    (row.saturday_night_hours || 0) > 0
  )
    return "Saturday";
  if ((row.sunday_morning_hours || 0) > 0 || (row.sunday_night_hours || 0) > 0)
    return "Sunday";
  return "Regular";
};

/**
 * Resolve the currently logged-in user (id + user_type).
 * Tries common AsyncStorage keys used across the app.
 * Adjust the keys if your auth layer stores them differently.
 */
const getLoggedInUser = async (): Promise<LoggedInUser | null> => {
  try {
    // Try a few common storage shapes
    const rawCandidates = await Promise.all([
      AsyncStorage.getItem("user"),
      AsyncStorage.getItem("userData"),
      AsyncStorage.getItem("currentUser"),
      AsyncStorage.getItem("@user"),
    ]);

    for (const raw of rawCandidates) {
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      const id =
        parsed?.id ??
        parsed?.user_id ??
        parsed?.userId ??
        parsed?.data?.id ??
        null;
      if (id == null) continue;
      return {
        id: Number(id),
        name: parsed?.name ?? parsed?.data?.name,
        user_type:
          parsed?.user_type ??
          parsed?.userType ??
          parsed?.type ??
          parsed?.data?.user_type ??
          null,
      };
    }

    // Fallback: separate keys
    const idOnly =
      (await AsyncStorage.getItem("user_id")) ||
      (await AsyncStorage.getItem("userId")) ||
      (await AsyncStorage.getItem("id"));
    const typeOnly =
      (await AsyncStorage.getItem("user_type")) ||
      (await AsyncStorage.getItem("userType"));

    if (idOnly) {
      return {
        id: Number(idOnly),
        user_type: typeOnly,
      };
    }
  } catch (e) {
    console.warn("Failed to read logged-in user from storage", e);
  }
  return null;
};

// ─────────────────────────────────────────────────────────
// SCREEN
// ─────────────────────────────────────────────────────────
export default function TimesheetScreen({ navigation }: Props) {
  // ── Date range state ──
  const [tempFrom, setTempFrom] = useState<Date>(DEFAULT_FROM);
  const [tempTo, setTempTo] = useState<Date>(DEFAULT_TO);
  const [appliedFrom, setAppliedFrom] = useState<Date | null>(null);
  const [appliedTo, setAppliedTo] = useState<Date | null>(null);
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);

  // ── Timesheet summary state ──
  const [hasSearched, setHasSearched] = useState(false);
  const [timesheetLoading, setTimesheetLoading] = useState(false);
  const [timesheetError, setTimesheetError] = useState<string | null>(null);
  const [timesheetRows, setTimesheetRows] = useState<TimesheetRow[]>([]);

  // ── Detailed shift breakdown state ──
  const [selectedStaffId, setSelectedStaffId] = useState<number | null>(null);
  const [staffDetailLoading, setStaffDetailLoading] = useState(false);
  const [staffDetailError, setStaffDetailError] = useState<string | null>(null);
  const [staffDetailShifts, setStaffDetailShifts] = useState<ShiftDetail[]>([]);

  const isRangeInvalid = tempTo.getTime() < tempFrom.getTime();

  // ── Date pickers ──
  const onChangeFrom = (event: any, date?: Date) => {
    if (Platform.OS === "android") setShowFromPicker(false);
    if (event?.type === "dismissed") return;
    if (date) {
      setTempFrom(date);
      if (tempTo.getTime() < date.getTime()) setTempTo(date);
    }
  };

  const onChangeTo = (event: any, date?: Date) => {
    if (Platform.OS === "android") setShowToPicker(false);
    if (event?.type === "dismissed") return;
    if (date) setTempTo(date);
  };

  const handleSearch = async () => {
    if (isRangeInvalid) return;

    setAppliedFrom(tempFrom);
    setAppliedTo(tempTo);
    setHasSearched(true);
    setSelectedStaffId(null);
    setStaffDetailShifts([]);
    setTimesheetError(null);
    setTimesheetLoading(true);
    setTimesheetRows([]);

    try {
      const token = await getAuthToken();
      if (!token) {
        throw new Error("No authentication token");
      }

      const user = await getLoggedInUser();
      if (!user?.id) {
        throw new Error("Could not resolve logged-in user id");
      }

      const isContractor =
        (user.user_type || "").toLowerCase() === "contractor";

      // contractor → contractor_ids: [loginId]
      // staff / guard → guard_ids: [loginId]
      const payload: Record<string, any> = {
        length: 0,
        pageIndex: 0,
        pageSize: 20,
        previousPageIndex: 0,
        start: formatAPIDate(tempFrom),
        end: formatAPIDate(tempTo),
      };

      if (isContractor) {
        payload.contractor_ids = [user.id];
      } else {
        payload.guard_ids = [user.id];
      }

      console.log("📤 Timesheet Search Payload:");
      console.log(JSON.stringify(payload, null, 2));
      console.log("🪪 Auth Token:", token);
      console.log("👤 Logged-in user:", user);

      const res = await fetch(GET_TIMESHEET_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (json?.success && Array.isArray(json?.data)) {
        setTimesheetRows(json.data);
      } else {
        setTimesheetError(json?.message || "Failed to load timesheet.");
      }
    } catch (err: any) {
      setTimesheetError(err?.message || "Failed to load timesheet.");
    } finally {
      setTimesheetLoading(false);
    }
  };

  // Staff rows built directly from the API response (no static data)
  const staffRows = useMemo(() => {
    return timesheetRows.map((row, idx) => ({
      key: row.id !== null ? String(row.id) : `unassigned-${idx}`,
      staffId: row.id,
      name: row.name || "Unassigned",
      totalHours: row.hours || 0,
      shiftsCount: row.shift_collection?.length || 0,
      raw: row,
    }));
  }, [timesheetRows]);

  const handleSelectStaff = async (row: (typeof staffRows)[number]) => {
    if (row.staffId === null) {
      setSelectedStaffId(null);
      setStaffDetailShifts([]);
      return;
    }

    if (selectedStaffId === row.staffId) {
      setSelectedStaffId(null);
      setStaffDetailShifts([]);
      return;
    }

    setSelectedStaffId(row.staffId);
    setStaffDetailShifts([]);
    setStaffDetailError(null);
    setStaffDetailLoading(true);

    const payload = {
      id: row.staffId,
      timesheet_id: row.staffId,
      guard_id: row.staffId,
      staff_id: row.staffId,
      shift_collection: row.raw.shift_collection || [],
    };

    try {
      const token = await getAuthToken();

      if (!token) {
        throw new Error("No authentication token");
      }
      console.log("📤 Timesheet Details Payload:");
      console.log(JSON.stringify(payload, null, 2));

      console.log("🪪 Auth Token:", token);
      const res = await fetch(GET_TIMESHEET_DETAILS_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (json?.success && Array.isArray(json?.data)) {
        const mapped: ShiftDetail[] = json.data.map((s: any) => {
          const start = parseAPIDateTime(s.start);
          const end = parseAPIDateTime(s.end);
          const activity = s.roster_activity || {};

          return {
            shiftId: s.id,
            site: s.site?.site_name || "—",
            customer: s.customer?.name || "—",
            guard: s.guards?.name || row.name,
            start,
            end,
            total: Number(s.hours) || 0,
            job: deriveJobFromRow(row.raw),
            jobStatus: s.job_status || "pending",
            jobType: s.job_type || "",
            signIn: to24h(activity.signin_time), // ← must be to24h
            signOut: to24h(activity.signout_time),
          };
        });
        console.log(
          "SIGN TIMES →",
          mapped.map((m) => ({
            id: m.shiftId,
            signIn: m.signIn,
            signOut: m.signOut,
          })),
        );
        setStaffDetailShifts(mapped);
      } else {
        setStaffDetailError(json?.message || "Failed to load shift details.");
      }
    } catch (err: any) {
      setStaffDetailError(err?.message || "Failed to load shift details.");
    } finally {
      setStaffDetailLoading(false);
    }
  };

  /** Always returns "HH:mm" — never AM/PM */
  const to24h = (value?: string | Date | null): string => {
    if (value == null || value === "") return "—";

    if (value instanceof Date) {
      if (isNaN(value.getTime())) return "—";
      return (
        String(value.getHours()).padStart(2, "0") +
        ":" +
        String(value.getMinutes()).padStart(2, "0")
      );
    }

    let str = String(value).trim();

    // Force-remove AM/PM text first
    const hasPM = /PM/i.test(str);
    const hasAM = /AM/i.test(str);
    str = str.replace(/\s*(AM|PM)/i, "").trim();

    // Find HH:MM anywhere in the string
    const match = str.match(/(\d{1,2}):(\d{2})/);
    if (!match) return "—";

    let hour = parseInt(match[1], 10);
    const min = match[2];

    if (hasPM && hour < 12) hour += 12;
    if (hasAM && hour === 12) hour = 0;

    return String(hour).padStart(2, "0") + ":" + min;
  };
  const handleExport = async () => {
    if (!hasSearched || staffRows.length === 0) {
      return;
    }

    try {
      const fromStr = appliedFrom ? formatAU(appliedFrom) : formatAU(tempFrom);
      const toStr = appliedTo ? formatAU(appliedTo) : formatAU(tempTo);

      // CSV header
      let csv =
        "Staff ID,Name,Total Hours,Morning Hours,Night Hours,Sat Morning,Sat Night,Sun Morning,Sun Night,PH Morning,PH Night,Shifts Count\n";

      timesheetRows.forEach((row) => {
        const line = [
          row.id ?? "",
          `"${(row.name || "Unassigned").replace(/"/g, '""')}"`,
          row.hours ?? 0,
          row.morning_hours ?? 0,
          row.night_hours ?? 0,
          row.saturday_morning_hours ?? 0,
          row.saturday_night_hours ?? 0,
          row.sunday_morning_hours ?? 0,
          row.sunday_night_hours ?? 0,
          row.ph_morning_hours ?? 0,
          row.ph_night_hours ?? 0,
          row.shift_collection?.length ?? 0,
        ].join(",");
        csv += line + "\n";
      });

      const fileName = `timesheet-${Date.now()}`;
      const message = `Timesheet ${fromStr} - ${toStr}\n\n${csv}`;

      // Share sheet → user can Save to Files / Downloads (same idea as the web dialog)
      await Share.share({
        title: fileName,
        message,
        // iOS can also take a url if you write a real file with RNFS
      });
    } catch (err: any) {
      console.error("Export error:", err);
    }
  };
  const selectedStaffRow = staffRows.find((s) => s.staffId === selectedStaffId);
  const totalHours = useMemo(
    () => staffRows.reduce((sum, r) => sum + (r.totalHours || 0), 0),
    [staffRows],
  );
  const headerRangeLabel = `${formatAU(tempFrom)} - ${formatAU(tempTo)}`;

  return (
    <SafeAreaView style={styles.root}>
      {/* ───────── FIXED HEADER ───────── */}
      <LinearGradient
        colors={[COLORS.heroBg1, COLORS.heroBg2]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <View style={styles.heroInner}>
          <View style={styles.headerRow}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <ArrowLeft size={18} color={COLORS.text} />
            </TouchableOpacity>

            <Text style={styles.heroTitle}>Timesheet</Text>

            {/* Keeps the title centered */}
            <View style={{ width: 40 }} />
          </View>

          <Text style={styles.heroSubtitle}>
            Filter, review, and drill into shift breakdowns
          </Text>

          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <View style={styles.statLabelRow}>
                <CalendarDays size={12} color={COLORS.textSecondary} />
                <Text style={styles.statLabel}>DATE RANGE</Text>
              </View>
              <Text style={styles.statValue} numberOfLines={1}>
                {headerRangeLabel}
              </Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <View style={styles.statLabelRow}>
                <Users size={12} color={COLORS.textSecondary} />
                <Text style={styles.statLabel}>TOTAL HOURS</Text>
              </View>
              <Text style={styles.statValue} numberOfLines={1}>
                {hasSearched ? `${totalHours.toFixed(1)} hrs` : "—"}
              </Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      {/* ───────── SCROLLABLE BODY ───────── */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* FILTER CARD */}
        <View style={styles.filterCard}>
          <View style={styles.filterRow}>
            <View style={styles.filterField}>
              <Text style={styles.filterLabel}>FROM</Text>
              <TouchableOpacity
                style={styles.dateInput}
                activeOpacity={0.8}
                onPress={() => setShowFromPicker(true)}
              >
                <Text style={styles.dateInputText}>{formatAU(tempFrom)}</Text>
                <Calendar size={16} color={COLORS.primary} />
              </TouchableOpacity>
            </View>
            <View style={styles.filterField}>
              <Text style={styles.filterLabel}>TO</Text>
              <TouchableOpacity
                style={styles.dateInput}
                activeOpacity={0.8}
                onPress={() => setShowToPicker(true)}
              >
                <Text style={styles.dateInputText}>{formatAU(tempTo)}</Text>
                <Calendar size={16} color={COLORS.primary} />
              </TouchableOpacity>
            </View>
          </View>

          {showFromPicker && (
            <View style={styles.pickerWrap}>
              <DateTimePicker
                value={tempFrom}
                textColor="#FFFFFF"
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={onChangeFrom}
              />
              {Platform.OS === "ios" && (
                <TouchableOpacity
                  style={styles.pickerDoneBtn}
                  onPress={() => setShowFromPicker(false)}
                >
                  <Text style={styles.pickerDoneText}>Done</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {showToPicker && (
            <View style={styles.pickerWrap}>
              <DateTimePicker
                value={tempTo}
                mode="date"
                textColor="#FFFFFF"
                minimumDate={tempFrom}
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={onChangeTo}
              />
              {Platform.OS === "ios" && (
                <TouchableOpacity
                  style={styles.pickerDoneBtn}
                  onPress={() => setShowToPicker(false)}
                >
                  <Text style={styles.pickerDoneText}>Done</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {isRangeInvalid && (
            <Text style={styles.errorText}>
              "To" date must be the same as or after "From" date.
            </Text>
          )}

          <View style={styles.filterActionsRow}>
            <TouchableOpacity
              style={[styles.searchBtn, isRangeInvalid && styles.btnDisabled]}
              activeOpacity={0.85}
              onPress={handleSearch}
              disabled={isRangeInvalid}
            >
              {timesheetLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Search size={15} color="#fff" />
                  <Text style={styles.searchBtnText}>Search</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.exportBtn,
                (!hasSearched || staffRows.length === 0) && styles.btnDisabled,
              ]}
              activeOpacity={0.85}
              disabled={!hasSearched || staffRows.length === 0}
              onPress={handleExport}
            >
              <Text style={styles.exportBtnText}>Export</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Nothing below this point renders until a search has been run ── */}
        {!hasSearched ? (
          <View style={styles.emptyCard}>
            <Info size={22} color={COLORS.textMuted} />
            <Text style={styles.emptyTitle}>No results yet</Text>
            <Text style={styles.emptyText}>
              Select a date range above, then tap Search to view your timesheet.
            </Text>
          </View>
        ) : (
          <>
            {timesheetLoading ? (
              <View style={styles.emptyCard}>
                <ActivityIndicator size="small" color={COLORS.primary} />
                <Text style={styles.emptyTitle}>Loading timesheet…</Text>
              </View>
            ) : timesheetError ? (
              <View style={styles.emptyCard}>
                <Info size={22} color={COLORS.danger} />
                <Text style={styles.emptyText}>{timesheetError}</Text>
              </View>
            ) : staffRows.length === 0 ? (
              <View style={styles.emptyCard}>
                <Info size={22} color={COLORS.textMuted} />
                <Text style={styles.emptyTitle}>No shifts found</Text>
                <Text style={styles.emptyText}>
                  No shifts within {formatAU(appliedFrom as Date)} -{" "}
                  {formatAU(appliedTo as Date)}. Try a different date range.
                </Text>
              </View>
            ) : (
              <View style={styles.tableCard}>
                <View style={styles.tableHeaderRow}>
                  <Text style={[styles.th, { flex: 1.1 }]}>STAFF ID</Text>
                  <Text style={[styles.th, { flex: 1.6 }]}>NAME</Text>
                  <Text style={[styles.th, { flex: 1.1, textAlign: "right" }]}>
                    HOURS
                  </Text>
                </View>

                {staffRows.map((row) => {
                  const isSelected = row.staffId === selectedStaffId;
                  return (
                    <TouchableOpacity
                      key={row.key}
                      style={[
                        styles.tableRow,
                        isSelected && styles.tableRowSelected,
                      ]}
                      activeOpacity={0.7}
                      onPress={() => handleSelectStaff(row)}
                    >
                      <Text
                        style={[styles.td, styles.tdMono, { flex: 1.1 }]}
                        numberOfLines={1}
                      >
                        {row.staffId !== null ? row.staffId : "—"}
                      </Text>
                      <View style={{ flex: 1.6 }}>
                        <Text style={styles.td} numberOfLines={1}>
                          {row.name}
                        </Text>
                        <Text style={styles.tdSub}>
                          {row.shiftsCount} shifts
                        </Text>
                      </View>
                      <View style={{ flex: 1.1, alignItems: "flex-end" }}>
                        <Text style={[styles.td, styles.tdMono]}>
                          {row.totalHours.toFixed(1)} hrs
                        </Text>
                        <ChevronRight
                          size={14}
                          color={isSelected ? COLORS.primary : COLORS.textMuted}
                        />
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* ── Nothing here renders until a staff row is tapped ── */}
            {staffRows.length > 0 && (
              <>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionHeaderText}>
                    Detailed Shift Breakdown
                    {selectedStaffRow ? (
                      <Text style={styles.sectionHeaderName}>
                        {"  ·  " + selectedStaffRow.name.toUpperCase()}
                      </Text>
                    ) : null}
                  </Text>
                </View>

                {!selectedStaffId ? (
                  <View style={styles.emptyCard}>
                    <Info size={22} color={COLORS.textMuted} />
                    <Text style={styles.emptyTitle}>Select a staff member</Text>
                    <Text style={styles.emptyText}>
                      Tap a row in the table above to view their shift-by-shift
                      breakdown.
                    </Text>
                  </View>
                ) : staffDetailLoading ? (
                  <View style={styles.emptyCard}>
                    <ActivityIndicator size="small" color={COLORS.primary} />
                    <Text style={styles.emptyTitle}>Loading shifts…</Text>
                  </View>
                ) : staffDetailError ? (
                  <View style={styles.emptyCard}>
                    <Info size={22} color={COLORS.danger} />
                    <Text style={styles.emptyTitle}>Something went wrong</Text>
                    <Text style={styles.emptyText}>{staffDetailError}</Text>
                  </View>
                ) : staffDetailShifts.length === 0 ? (
                  <View style={styles.emptyCard}>
                    <Info size={22} color={COLORS.textMuted} />
                    <Text style={styles.emptyTitle}>No shift details</Text>
                    <Text style={styles.emptyText}>
                      No shift records were returned for this staff member.
                    </Text>
                  </View>
                ) : (
                  staffDetailShifts.map((row) => {
                    const badge = jobBadgeStyle(row.job);
                    const statusBadge = statusBadgeStyle(row.jobStatus);
                    return (
                      <View key={row.shiftId} style={styles.shiftCard}>
                        {/* Header: Shift ID + Status */}
                        <View style={styles.shiftCardHeader}>
                          <Text style={styles.shiftCardId}>
                            SHIFT-{row.shiftId}
                          </Text>
                          <View
                            style={[
                              styles.jobBadge,
                              {
                                backgroundColor: statusBadgeStyle(row.jobStatus)
                                  .bg,
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.jobBadgeText,
                                {
                                  color: statusBadgeStyle(row.jobStatus).color,
                                },
                              ]}
                            >
                              {(row.jobStatus || "pending")
                                .charAt(0)
                                .toUpperCase() +
                                (row.jobStatus || "pending")
                                  .slice(1)
                                  .toLowerCase()}
                            </Text>
                          </View>
                        </View>

                        {/* Site */}
                        <View style={styles.shiftCardSiteRow}>
                          <MapPin size={12} color={COLORS.textSecondary} />
                          <Text style={styles.shiftCardSite} numberOfLines={1}>
                            {row.site}
                          </Text>
                        </View>

                        {/* Guard + Customer – clearly labeled */}
                        <View style={styles.peopleRow}>
                          <View style={styles.personBlock}>
                            <Text style={styles.personLabel}>STAFF</Text>
                            <Text style={styles.personValue} numberOfLines={1}>
                              {row.guard || "—"}
                            </Text>
                          </View>
                          <View style={styles.personDivider} />
                          <View style={styles.personBlock}>
                            <Text style={styles.personLabel}>CUSTOMER</Text>
                            <Text style={styles.personValue} numberOfLines={1}>
                              {row.customer || "—"}
                            </Text>
                          </View>
                        </View>

                        {/* {row.jobType ? (
                          <Text style={styles.shiftCardJobType}>
                            {row.jobType}
                          </Text>
                        ) : null} */}

                        {/* Start → End */}
                        <View style={styles.shiftDateRow}>
                          <View style={styles.shiftDateBlock}>
                            <Text style={styles.fieldLabel}>START</Text>
                            <Text style={styles.fieldValue}>
                              {isNaN(row.start.getTime())
                                ? "—"
                                : `${formatAU(row.start)}  ${to24h(row.start)}`}
                            </Text>
                          </View>
                          <Text style={styles.dateArrow}>→</Text>
                          <View style={styles.shiftDateBlock}>
                            <Text style={styles.fieldLabel}>END</Text>
                            <Text style={styles.fieldValue}>
                              {isNaN(row.end.getTime())
                                ? "—"
                                : `${formatAU(row.end)}  ${to24h(row.end)}`}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.divider} />

                        {/* Sign in / Sign out / Total */}
                        <View style={styles.shiftFieldsGrid}>
                          <View style={styles.shiftFieldItem}>
                            <Text style={styles.fieldLabel}>SIGN IN</Text>
                            <Text style={styles.fieldValue}>{row.signIn}</Text>
                          </View>
                          <View style={styles.shiftFieldItem}>
                            <Text style={styles.fieldLabel}>SIGN OUT</Text>
                            <Text style={styles.fieldValue}>{row.signOut}</Text>
                          </View>
                          <View style={styles.shiftFieldItem}>
                            <Text style={styles.fieldLabel}>TOTAL</Text>
                            <Text
                              style={[
                                styles.fieldValue,
                                styles.fieldValueAccent,
                              ]}
                            >
                              {row.total.toFixed(1)} hrs
                            </Text>
                          </View>
                        </View>
                      </View>
                    );
                  })
                )}
              </>
            )}
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 15,
  },

  // Hero (fixed header)
  hero: {
    paddingBottom: 15,
    alignItems: "center",
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
    borderColor: COLORS.cardBorder,

    zIndex: 10,

    paddingTop: Platform.OS === "ios" ? 5 : 26,

    paddingHorizontal: Platform.OS === "ios" ? 5 : 10,

    height: Platform.OS === "ios" ? 180 : undefined,
  },
  heroInner: {
    width: "100%",
    paddingHorizontal: 10,
    // paddingBottom: 8,
  },
  heroTitle: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 4,
  },
  heroSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginBottom: 16,
    textAlign: "center",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    paddingTop: 25,
  },
  backButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    width: "100%",
  },
  statBox: {
    flex: 1,
    gap: 4,
  },
  statLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statLabel: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.6,
  },
  statValue: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "700",
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: COLORS.cardBorder,
    marginHorizontal: 10,
  },

  // Filter card
  filterCard: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 16,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
  },
  filterRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 6,
  },
  filterField: {
    flex: 1,
  },
  filterLabel: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  dateInput: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  dateInputText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
    marginRight: 8,
  },
  pickerWrap: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    marginTop: 10,
    alignItems: "center",
    paddingBottom: Platform.OS === "ios" ? 10 : 0,
  },
  pickerDoneBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 8,
    marginTop: 4,
  },
  pickerDoneText: {
    color: COLORS.background,
    fontWeight: "800",
    fontSize: 13,
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 11,
    fontWeight: "600",
    marginTop: 8,
  },
  filterActionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 7,
  },
  searchBtn: {
    flex: 1,
    flexDirection: "row",
    gap: 6,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  searchBtnText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 14,
  },
  exportBtn: {
    flex: 1,
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  exportBtnText: {
    color: COLORS.primary,
    fontWeight: "800",
    fontSize: 14,
  },
  btnDisabled: {
    opacity: 0.4,
  },

  // Section headers
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginHorizontal: 16,
    marginTop: 15,
  },
  sectionHeaderText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "800",
  },
  sectionHeaderName: {
    color: COLORS.primary,
  },

  // Empty / instructional state
  emptyCard: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 16,
    marginHorizontal: 16,
    marginTop: 16,
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: "center",
    gap: 4,
  },
  emptyTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "700",
    marginTop: 10,
    marginBottom: 4,
  },
  emptyText: {
    color: COLORS.textMuted,
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
  },

  // Staff table
  tableCard: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 16,
    marginHorizontal: 16,
    overflow: "hidden",
    marginTop: 10,
  },
  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: COLORS.surface,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  th: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(98,97,97,0.25)",
  },
  tableRowSelected: {
    backgroundColor: COLORS.primaryGlow,
  },
  td: {
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  tdSub: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  tdMono: {
    color: COLORS.text,
    fontWeight: "700",
  },

  // Shift cards
  shiftCard: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 16,
    marginHorizontal: 16,
    marginTop: 10,
    padding: 12,
  },
  shiftCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    // marginBottom: 10,
  },
  badgeStack: {
    alignItems: "flex-end",
  },
  shiftCardId: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "800",
  },
  shiftCardSiteRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 3,
  },
  shiftCardSite: {
    color: COLORS.textSecondary,
    fontSize: 12,
    flexShrink: 1,
  },
  shiftCardGuard: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 2,
  },
  shiftCardJobType: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginBottom: 14,
  },
  shiftDateRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 14,
    marginTop: 5,
  },
  shiftDateBlock: {
    flex: 1,
  },
  dateArrow: {
    color: COLORS.textMuted,
    fontSize: 14,
    marginHorizontal: 10,
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(98,97,97,0.3)",
    marginBottom: 14,
  },
  shiftFieldsGrid: {
    flexDirection: "row",
  },
  shiftFieldItem: {
    flex: 1,
  },
  fieldLabel: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  fieldValue: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "600",
  },
  fieldValueAccent: {
    color: COLORS.primary,
    fontWeight: "800",
  },
  jobBadge: {
    alignSelf: "flex-start",
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  jobBadgeText: {
    fontSize: 10,
    fontWeight: "800",
  },
  peopleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    marginBottom: 6,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  personBlock: {
    flex: 1,
  },
  personLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.textMuted,
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  personValue: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.primary,
  },
  personDivider: {
    width: 1,
    height: 28,
    // backgroundColor: COLORS.border,
    marginHorizontal: 12,
  },
});
