import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Platform,
} from "react-native";
import LinearGradient from "react-native-linear-gradient";
import DateTimePicker from "@react-native-community/datetimepicker";
import {
  Calendar,
  CalendarDays,
  Search,
  Users,
  Clock,
  MapPin,
  Info,
  ChevronRight,
} from "lucide-react-native";

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
  heroBg1: "#0D1F2D",
  heroBg2: "#061014",
};

// ─────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────
type Job = "Regular" | "Public Holiday" | "Saturday" | "Sunday" | "Overtime";

type StaffMember = {
  staffId: string;
  name: string;
};

type ShiftRow = {
  shiftId: string;
  staffId: string;
  site: string;
  customer: string;
  guard: string;
  start: Date;
  end: Date;
  total: number;
  job: Job;
  signIn: string;
  signOut: string;
};

// ─────────────────────────────────────────────────────────
// STATIC DATA
// ─────────────────────────────────────────────────────────
const STAFF_DATA: StaffMember[] = [
  { staffId: "SEF001", name: "Chandok Vandana" },
  { staffId: "SEF002", name: "Priya Sharma" },
  { staffId: "SEF003", name: "Amir Khan" },
  { staffId: "SEF004", name: "Ravi Patel" },
];

const SHIFT_DATA: ShiftRow[] = [
  {
    shiftId: "SHFT-001",
    staffId: "SEF001",
    site: "Hive Mend",
    customer: "Spdidry",
    guard: "Chandok Vandana",
    start: new Date(2026, 4, 4),
    end: new Date(2026, 4, 5),
    total: 12.0,
    job: "Regular",
    signIn: "08:00 AM",
    signOut: "08:00 PM",
  },
  {
    shiftId: "SHFT-002",
    staffId: "SEF001",
    site: "Main Gate",
    customer: "Spdidry",
    guard: "Chandok Vandana",
    start: new Date(2026, 4, 6),
    end: new Date(2026, 4, 7),
    total: 11.5,
    job: "Regular",
    signIn: "07:30 AM",
    signOut: "07:00 PM",
  },
  {
    shiftId: "SHFT-003",
    staffId: "SEF001",
    site: "Hive Mend",
    customer: "Spdidry",
    guard: "Chandok Vandana",
    start: new Date(2026, 4, 11),
    end: new Date(2026, 4, 12),
    total: 12.0,
    job: "Public Holiday",
    signIn: "08:00 AM",
    signOut: "08:00 PM",
  },
  {
    shiftId: "SHFT-004",
    staffId: "SEF001",
    site: "West Wing",
    customer: "Spdidry",
    guard: "Chandok Vandana",
    start: new Date(2026, 4, 13),
    end: new Date(2026, 4, 14),
    total: 8.0,
    job: "Regular",
    signIn: "09:00 AM",
    signOut: "05:00 PM",
  },
  {
    shiftId: "SHFT-005",
    staffId: "SEF001",
    site: "Hive Mend",
    customer: "Spdidry",
    guard: "Chandok Vandana",
    start: new Date(2026, 4, 18),
    end: new Date(2026, 4, 19),
    total: 12.0,
    job: "Saturday",
    signIn: "08:00 AM",
    signOut: "08:00 PM",
  },
  {
    shiftId: "SHFT-006",
    staffId: "SEF002",
    site: "North Dock",
    customer: "Spdidry",
    guard: "Priya Sharma",
    start: new Date(2026, 4, 5),
    end: new Date(2026, 4, 6),
    total: 10.0,
    job: "Regular",
    signIn: "08:00 AM",
    signOut: "06:00 PM",
  },
  {
    shiftId: "SHFT-007",
    staffId: "SEF002",
    site: "North Dock",
    customer: "Spdidry",
    guard: "Priya Sharma",
    start: new Date(2026, 4, 20),
    end: new Date(2026, 4, 21),
    total: 9.5,
    job: "Sunday",
    signIn: "08:00 AM",
    signOut: "05:30 PM",
  },
  {
    shiftId: "SHFT-008",
    staffId: "SEF003",
    site: "Main Gate",
    customer: "Spdidry",
    guard: "Amir Khan",
    start: new Date(2026, 4, 7),
    end: new Date(2026, 4, 8),
    total: 11.0,
    job: "Overtime",
    signIn: "07:00 AM",
    signOut: "06:00 PM",
  },
  {
    shiftId: "SHFT-009",
    staffId: "SEF004",
    site: "West Wing",
    customer: "Spdidry",
    guard: "Ravi Patel",
    start: new Date(2026, 4, 9),
    end: new Date(2026, 4, 10),
    total: 9.0,
    job: "Regular",
    signIn: "08:00 AM",
    signOut: "05:00 PM",
  },
];

// ─────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────

// Australian date format: DD/MM/YYYY
const formatAU = (date: Date) =>
  `${date.getDate().toString().padStart(2, "0")}/${(date.getMonth() + 1)
    .toString()
    .padStart(2, "0")}/${date.getFullYear()}`;

// Full readable Australian format, e.g. "04 May 2026"
const formatAULong = (date: Date) =>
  `${date.getDate().toString().padStart(2, "0")} ${date.toLocaleString(
    "en-AU",
    { month: "long" },
  )} ${date.getFullYear()}`;

const startOfDay = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);

const endOfDay = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

const jobBadgeStyle = (job: Job) => {
  switch (job) {
    case "Public Holiday":
      return { bg: COLORS.dangerBg, color: COLORS.danger };
    case "Saturday":
    case "Sunday":
      return { bg: COLORS.warningBg, color: COLORS.warning };
    case "Overtime":
      return { bg: COLORS.primaryGlow, color: COLORS.primary };
    default:
      return { bg: "rgba(148,163,184,0.12)", color: COLORS.textSecondary };
  }
};

// Default picker values shown before the user has searched anything
const DEFAULT_FROM = new Date(2026, 4, 1);
const DEFAULT_TO = new Date(2026, 4, 20);

// ─────────────────────────────────────────────────────────
// SCREEN
// ─────────────────────────────────────────────────────────
export default function TimesheetScreen() {
  // Values currently sitting in the date pickers (not applied yet)
  const [tempFrom, setTempFrom] = useState<Date>(DEFAULT_FROM);
  const [tempTo, setTempTo] = useState<Date>(DEFAULT_TO);

  // Values actually applied to the results — only set once "Search" is pressed
  const [appliedFrom, setAppliedFrom] = useState<Date | null>(null);
  const [appliedTo, setAppliedTo] = useState<Date | null>(null);

  // Nothing below the filter renders until this is true
  const [hasSearched, setHasSearched] = useState(false);

  // Nothing in the "Detailed Shift Breakdown" renders until a staff row is tapped
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);

  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);

  const isRangeInvalid = tempTo.getTime() < tempFrom.getTime();

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

  const handleSearch = () => {
    if (isRangeInvalid) return;
    setAppliedFrom(tempFrom);
    setAppliedTo(tempTo);
    setHasSearched(true);
    // Collapse any previously opened staff breakdown on a fresh search
    setSelectedStaffId(null);
  };

  // Shifts that fall inside the applied date range
  const shiftsInRange = useMemo(() => {
    if (!hasSearched || !appliedFrom || !appliedTo) return [];
    const from = startOfDay(appliedFrom);
    const to = endOfDay(appliedTo);
    return SHIFT_DATA.filter(
      (s) =>
        s.start.getTime() >= from.getTime() &&
        s.start.getTime() <= to.getTime(),
    );
  }, [hasSearched, appliedFrom, appliedTo]);

  // Staff rows built only from shifts that fall in range, hours/shift counts recomputed live
  const staffRows = useMemo(() => {
    return STAFF_DATA.map((staff) => {
      const staffShifts = shiftsInRange.filter(
        (s) => s.staffId === staff.staffId,
      );
      const totalHours = staffShifts.reduce((sum, s) => sum + s.total, 0);
      return { ...staff, totalHours, shiftsCount: staffShifts.length };
    }).filter((s) => s.shiftsCount > 0);
  }, [shiftsInRange]);

  const selectedStaff = staffRows.find((s) => s.staffId === selectedStaffId);

  const selectedStaffShifts = useMemo(() => {
    if (!selectedStaffId) return [];
    return shiftsInRange
      .filter((s) => s.staffId === selectedStaffId)
      .sort((a, b) => a.start.getTime() - b.start.getTime());
  }, [shiftsInRange, selectedStaffId]);

  const heroRangeLabel =
    appliedFrom && appliedTo
      ? `${formatAU(appliedFrom)} - ${formatAU(appliedTo)}`
      : "Not selected yet";

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* HERO */}
        <LinearGradient
          colors={[COLORS.heroBg1, COLORS.heroBg2]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          
          <Text style={styles.heroTitle}>Time Sheet</Text>
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
                {heroRangeLabel}
              </Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <View style={styles.statLabelRow}>
                <Users size={12} color={COLORS.textSecondary} />
                <Text style={styles.statLabel}>STAFF COUNT</Text>
              </View>
              <Text style={styles.statValue}>{STAFF_DATA.length}</Text>
            </View>
          </View>
        </LinearGradient>

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
              <Search size={15} color={COLORS.background} />
              <Text style={styles.searchBtnText}>Search</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.exportBtn, !hasSearched && styles.btnDisabled]}
              activeOpacity={0.85}
              disabled={!hasSearched}
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
              Pick a "From" and "To" date above, then tap Search to view staff
              timesheets.
            </Text>
          </View>
        ) : (
          <>
            {/* STAFF TABLE */}
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionHeaderText}>Staff</Text>
              <Text style={styles.sectionHeaderCount}>
                {staffRows.length}{" "}
                {staffRows.length === 1 ? "result" : "results"}
              </Text>
            </View>

            {staffRows.length === 0 ? (
              <View style={styles.emptyCard}>
                <Info size={22} color={COLORS.textMuted} />
                <Text style={styles.emptyTitle}>No shifts found</Text>
                <Text style={styles.emptyText}>
                  No staff have shifts within {formatAU(appliedFrom as Date)} -{" "}
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
                      key={row.staffId}
                      style={[
                        styles.tableRow,
                        isSelected && styles.tableRowSelected,
                      ]}
                      activeOpacity={0.7}
                      onPress={() =>
                        setSelectedStaffId(isSelected ? null : row.staffId)
                      }
                    >
                      <Text
                        style={[styles.td, styles.tdMono, { flex: 1.1 }]}
                        numberOfLines={1}
                      >
                        {row.staffId}
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
                    {selectedStaff ? (
                      <Text style={styles.sectionHeaderName}>
                        {"  ·  " + selectedStaff.name.toUpperCase()}
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
                ) : (
                  selectedStaffShifts.map((row) => {
                    const badge = jobBadgeStyle(row.job);
                    return (
                      <View key={row.shiftId} style={styles.shiftCard}>
                        <View style={styles.shiftCardHeader}>
                          <View>
                            <Text style={styles.shiftCardId}>
                              {row.shiftId}
                            </Text>
                            <View style={styles.shiftCardSiteRow}>
                              <MapPin size={11} color={COLORS.textSecondary} />
                              <Text style={styles.shiftCardSite}>
                                {row.site} · {row.customer}
                              </Text>
                            </View>
                          </View>
                          <View
                            style={[
                              styles.jobBadge,
                              { backgroundColor: badge.bg },
                            ]}
                          >
                            <Text
                              style={[
                                styles.jobBadgeText,
                                { color: badge.color },
                              ]}
                            >
                              {row.job}
                            </Text>
                          </View>
                        </View>

                        <Text style={styles.shiftCardGuard}>{row.guard}</Text>

                        <View style={styles.shiftDateRow}>
                          <View style={styles.shiftDateBlock}>
                            <Text style={styles.fieldLabel}>START</Text>
                            <Text style={styles.fieldValue}>
                              {formatAU(row.start)}
                            </Text>
                          </View>
                          <Text style={styles.dateArrow}>→</Text>
                          <View style={styles.shiftDateBlock}>
                            <Text style={styles.fieldLabel}>END</Text>
                            <Text style={styles.fieldValue}>
                              {formatAU(row.end)}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.divider} />

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
    paddingBottom: 24,
  },

  // Hero
  hero: {
    paddingTop: Platform.OS === "ios" ? 24 : 32,
    paddingHorizontal: 20,
    paddingBottom: 24,
    alignItems: "center",
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
    borderColor: COLORS.cardBorder,
  },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(52,200,138,0.12)",
    borderWidth: 1,
    borderColor: "rgba(52,200,138,0.35)",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 16,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.success,
  },
  liveText: {
    color: COLORS.success,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
  },
  heroTitle: {
    color: COLORS.text,
    fontSize: 30,
    fontWeight: "800",
    marginBottom: 6,
  },
  heroSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 13,
    marginBottom: 20,
    textAlign: "center",
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 16,
    paddingVertical: 14,
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
    fontSize: 14,
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
    marginTop: 14,
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
    color: COLORS.background,
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
    marginTop: 24,
    marginBottom: 10,
  },
  sectionHeaderText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "800",
  },
  sectionHeaderName: {
    color: COLORS.primary,
  },
  sectionHeaderCount: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: "600",
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
    marginTop: 12,
    padding: 16,
  },
  shiftCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
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
  },
  shiftCardGuard: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: "700",
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
});
