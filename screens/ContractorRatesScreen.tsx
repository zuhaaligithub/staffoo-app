import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
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
  ChevronRight,
  Clock,
  Send,
  X,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Shield,
  Zap,
  History as HistoryIcon,
  Eye,
  XCircle,
  RotateCcw,
  LogOut,
  FolderOpen,
  Pencil,
  Save,
} from "lucide-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { BASE_URL } from "../services/authApi";
import Toast from "react-native-toast-message";

const COLORS = {
  background: "#030508",
  surface: "#07111A",
  card: "#0D1421",
  cardAlt: "#0A121C",
  cardBorder: "rgba(148, 163, 184, 0.14)",
  primary: "#00A99D",
  primaryDark: "#00877E",
  primaryGlow: "rgba(0,169,157,0.18)",
  primaryBorder: "rgba(0,169,157,0.3)",
  text: "#FFFFFF",
  textSecondary: "#94A3B8",
  textMuted: "#5B7086",
  success: "#34C88A",
  successBg: "rgba(52,200,138,0.12)",
  successBorder: "rgba(52,200,138,0.35)",
  danger: "#F87171",
  dangerBg: "rgba(248,88,88,0.12)",
  dangerBorder: "rgba(248,88,88,0.35)",
  warning: "#F5A623",
  warningBg: "rgba(245,166,35,0.12)",
  warningBorder: "rgba(245,166,35,0.35)",
  info: "#5B9DFF",
  infoBg: "rgba(91,157,255,0.12)",
  infoBorder: "rgba(91,157,255,0.3)",
  heroBg1: "#0D1F2D",
  heroBg2: "#061014",
};

const CARD_SHADOW = {
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.28,
  shadowRadius: 10,
  elevation: 4,
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

type RateFieldKey =
  | "metro_mon_fri_day"
  | "reg_mon_fri_day"
  | "metro_mon_fri_night"
  | "reg_mon_fri_night"
  | "metro_sat"
  | "reg_sat"
  | "metro_sun"
  | "reg_sun"
  | "metro_pub"
  | "reg_pub";

type RateFormShape = Record<RateFieldKey, string>;

type TopTab = "active" | "history";

// A state's rate can be in one of these places at any time
type StateRateStatus = "active" | "pending" | "draft" | "rejected" | "missing";

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

// A field counts as "filled" only if it holds a valid, non-negative number.
const isFieldFilled = (value: string) => {
  if (value === undefined || value === null || value.trim() === "")
    return false;
  const n = parseFloat(value);
  return !isNaN(n) && n >= 0;
};

const getMissingFields = (form: RateFormShape): RateFieldKey[] =>
  (Object.keys(form) as RateFieldKey[]).filter(
    (key) => !isFieldFilled(form[key]),
  );

const isRateFormComplete = (form: RateFormShape) =>
  getMissingFields(form).length === 0;

// Deep-clones a { stateCode: RateFormShape } map so a later edit to the
// "current" map never mutates the "original" snapshot taken at modal-open.
const cloneRatesMap = (
  map: Record<string, RateFormShape>,
): Record<string, RateFormShape> => {
  const clone: Record<string, RateFormShape> = {};
  Object.keys(map).forEach((key) => {
    clone[key] = { ...map[key] };
  });
  return clone;
};

// Compares two rate forms field-by-field, treating blank/invalid values as
// "no value" so "" and "0" don't get flagged as different from each other
// incorrectly, while a real numeric change (including new -> filled) does.
const areRatesEqual = (a: RateFormShape, b: RateFormShape) =>
  (Object.keys(a) as RateFieldKey[]).every((key) => {
    const av = isFieldFilled(a[key]) ? parseFloat(a[key]) : null;
    const bv = isFieldFilled(b[key]) ? parseFloat(b[key]) : null;
    return av === bv;
  });

export default function ContractorRatesScreen() {
  const navigation = useNavigation();
  const [showFinishCTA, setShowFinishCTA] = useState(false);
  const completeToastShownRef = useRef(false);

  // ----- Core / auth -----
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [ratesList, setRatesList] = useState<any[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [userId, setUserId] = useState<number | string | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [finishedThisSession, setFinishedThisSession] = useState(false);
  const finishedHydratedRef = useRef(false);

  // ----- Top tabs (Active Rates / Request History) -----
  const [topTab, setTopTab] = useState<TopTab>("active");

  // ----- Which state's card is shown in the Active Rates tab -----
  const [selectedStateTab, setSelectedStateTab] = useState<string | null>(null);

  // ----- Request history (single merged list — no status sub-tabs) -----
  // Start true so first paint never treats empty historyList as "missing"
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [viewModalData, setViewModalData] = useState<any>(null);

  // ----- Request rate update modal (step wizard) -----
  const [modalVisible, setModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [savingExit, setSavingExit] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");
  const [wizardStates, setWizardStates] = useState<string[]>([]);
  const [wizardIndex, setWizardIndex] = useState(0);
  const [stateRates, setStateRates] = useState<Record<string, RateFormShape>>(
    {},
  );
  // Snapshot of what each wizard state's rates (and status) looked like the
  // moment the modal opened — used to work out which states the user
  // actually changed, so the payload never re-sends an untouched approved
  // rate.
  const [originalStateRates, setOriginalStateRates] = useState<
    Record<string, RateFormShape>
  >({});
  const [originalStateStatuses, setOriginalStateStatuses] = useState<
    Record<string, StateRateStatus>
  >({});
  const [isSubmitMode, setIsSubmitMode] = useState(false);
  const [submitModeItem, setSubmitModeItem] = useState<any>(null);
  const [modalMode, setModalMode] = useState<"request" | "update" | "draft">(
    "request",
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
      return { uid, token };
    } catch (err: any) {
      console.error("get-contractor-rates error:", err);
      Toast.show({
        type: "error",
        text1: "Failed to load rates",
        text2: err?.response?.data?.message || err.message,
        position: "top",
      });
      setRatesList([]);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // =========================================================
  // Fetch: Request history — a single call returns every status
  // (draft / pending / approved / rejected) in one list. We load
  // this eagerly (not just when the History tab opens) because the
  // Active Rates tab needs it to know which states are drafts.
  // =========================================================
  const fetchHistory = useCallback(
    async (overrideUid?: number | string, overrideToken?: string) => {
      try {
        setHistoryLoading(true);

        let uid = overrideUid || userId;
        let token = overrideToken || authToken;

        if (!uid || !token) {
          const userStr = await AsyncStorage.getItem("user");
          const t = await AsyncStorage.getItem("@auth_token");

          if (userStr) uid = JSON.parse(userStr)?.id;
          token = t;

          if (uid) setUserId(uid);
          if (token) setAuthToken(token);
        }

        if (!uid || !token) throw new Error("Authentication error");

        const headers = {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        };

        const res = await axios.get(`${BASE_URL}/charge-rate-requests`, {
          params: { user_id: uid },
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
    },
    [userId, authToken],
  );

  useEffect(() => {
    (async () => {
      const finishedFlag = await AsyncStorage.getItem(
        "@contractor_rates_finished",
      );
      if (finishedFlag === "true") {
        setFinishedThisSession(true);
      }
      finishedHydratedRef.current = true; // ← allow future persists

      const res = await fetchRates();
      if (res) {
        fetchHistory(res.uid, res.token);
      } else {
        fetchHistory();
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTopTabPress = (tab: TopTab) => {
    setTopTab(tab);
    if (tab === "history") {
      fetchHistory();
    }
  };

  useEffect(() => {
    if (!finishedHydratedRef.current) return; // don't overwrite on first paint
    AsyncStorage.setItem(
      "@contractor_rates_finished",
      finishedThisSession ? "true" : "false",
    );
  }, [finishedThisSession]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([fetchRates(), fetchHistory()]);
    } finally {
      setRefreshing(false);
    }
  }, [fetchRates, fetchHistory]);

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

  const sortedRatesList = useMemo(
    () =>
      [...ratesList].sort((a, b) =>
        getStateLabel(String(a.state || "")).localeCompare(
          getStateLabel(String(b.state || "")),
        ),
      ),
    [ratesList],
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

  const getActiveRateForState = useCallback(
    (code: string) =>
      ratesList.find(
        (r) => String(r.state || "").toLowerCase() === code.toLowerCase(),
      ),
    [ratesList],
  );

  const hasRatesForState = useCallback(
    (code: string) => !!getActiveRateForState(code),
    [getActiveRateForState],
  );

  // Most recent history record for a state (drafts / pending / rejected)
  const getLatestHistoryForState = useCallback(
    (code: string) =>
      historyList.find(
        (r) => String(r.state || "").toLowerCase() === code.toLowerCase(),
      ),
    [historyList],
  );

  const getStateRateStatus = useCallback(
    (code: string): StateRateStatus => {
      // NOTE: We intentionally do NOT short-circuit to "missing" just
      // because ratesList (approved rates) is empty — a contractor can
      // have zero approved rates while still having a draft/pending/
      // rejected request in historyList for a given state, and that must
      // still be reflected accurately per-state below.
      const activeRate = getActiveRateForState(code);
      if (!activeRate) {
        const latest = getLatestHistoryForState(code);
        if (!latest) return "missing";

        // If you only want true unsubmitted drafts to show as 'draft',
        // ensure it's explicitly marked as a draft/unsubmitted AND there's no active history
        if (Number(latest.is_submitted) === 0) return "draft";

        const s = String(latest.status || "pending").toLowerCase();
        if (s === "rejected") return "rejected";
        return "pending";
      }

      return "active";
    },
    [ratesList, getLatestHistoryForState, getActiveRateForState],
  );
  const allowedCodesForBadge = getAllowedStateCodes();

  // States that still need attention (not fully active yet) — used for the
  // status chips row, which shows Missing / Draft / Pending / Rejected.
  const attentionStates = allowedCodesForBadge.filter(
    (c) => getStateRateStatus(c) !== "active",
  );
  const missingStatesCount = attentionStates.length;
  const allStatesComplete =
    allowedCodesForBadge.length > 0 && missingStatesCount === 0;

  // Sort tabs: missing first, then draft / pending / rejected, then active.
  const STATUS_TAB_ORDER: Record<StateRateStatus, number> = {
    missing: 0,
    draft: 1,
    pending: 2,
    rejected: 3,
    active: 4,
  };
  const sortedStateTabs = useMemo(
    () =>
      [...allowedCodesForBadge].sort((a, b) => {
        const orderA = STATUS_TAB_ORDER[getStateRateStatus(a)] ?? 99;
        const orderB = STATUS_TAB_ORDER[getStateRateStatus(b)] ?? 99;
        if (orderA !== orderB) return orderA - orderB;
        return getStateLabel(a).localeCompare(getStateLabel(b));
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allowedCodesForBadge.join(","), ratesList, historyList],
  );

  const missingStates = useMemo(
    () =>
      allowedCodesForBadge.filter((c) => getStateRateStatus(c) === "missing"),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allowedCodesForBadge.join(","), ratesList, historyList],
  );

  const hasMissingRates = missingStates.length > 0;

  // Badge meta for every status including Active (green tick)
  const STATUS_BADGE_META: Record<
    StateRateStatus,
    { label: string; color: string; bg: string }
  > = {
    missing: { label: "Missing", color: "#fff", bg: COLORS.danger },
    draft: { label: "Draft", color: "#fff", bg: COLORS.textMuted },
    pending: { label: "Pending", color: "#fff", bg: COLORS.warning },
    rejected: { label: "Rejected", color: "#fff", bg: COLORS.danger },
    active: { label: "Active", color: "#fff", bg: COLORS.success },
  };

  // ---------------------------------------------------------------
  // Keep the selected state tab valid: default to the first state
  // that still needs attention (missing first), or the first allowed
  // state if everything is active. Purely derived from live API data.
  // ---------------------------------------------------------------
  useEffect(() => {
    if (allowedCodesForBadge.length === 0) {
      if (selectedStateTab !== null) setSelectedStateTab(null);
      return;
    }
    const stillValid =
      !!selectedStateTab && allowedCodesForBadge.includes(selectedStateTab);
    if (!stillValid) {
      const firstMissing = sortedStateTabs.find(
        (c) => getStateRateStatus(c) === "missing",
      );
      setSelectedStateTab(
        firstMissing ||
          attentionStates[0] ||
          sortedStateTabs[0] ||
          allowedCodesForBadge[0],
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    allowedCodesForBadge.join(","),
    attentionStates.join(","),
    sortedStateTabs.join(","),
  ]);

  const buildInitialRatesForCodes = (
    codes: string[],
  ): Record<string, RateFormShape> => {
    const initial: Record<string, RateFormShape> = {};
    codes.forEach((code) => {
      // 1) Prefer active/approved rate
      const active = getActiveRateForState(code);
      if (active) {
        initial[code] = mapRecordToRateForm(active);
        return;
      }

      // 2) Otherwise use the latest history item (including rejected)
      const latest = getLatestHistoryForState(code);
      if (latest) {
        initial[code] = mapRecordToRateForm(latest);
        return;
      }

      // 3) Truly missing → empty
      initial[code] = emptyRateForm();
    });
    return initial;
  };

  // =========================================================
  // Request modal (step wizard)
  //
  // wizardStates holds the ordered list of states being filled in this
  // session. The user moves forward one state at a time; "Next State" is
  // disabled until the current state's 10 fields are valid. On the last
  // state, Save & Exit / Save & Submit replace the Next button.
  // =========================================================
  const openRequestModal = () => {
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

    // Show every state assigned to this contractor — including ones that
    // already have an approved rate — so the user can review or update any
    // of them from a single place. Only whichever states actually change
    // end up in the submit payload (see getChangedWizardStates).
    const order = codes;

    const initial = buildInitialRatesForCodes(order);

    // Truly missing states always start with blank fields.
    order.forEach((code) => {
      if (getStateRateStatus(code) === "missing") {
        initial[code] = emptyRateForm();
      }
    });

    const statuses: Record<string, StateRateStatus> = {};
    order.forEach((code) => {
      statuses[code] = getStateRateStatus(code);
    });

    setStateRates(initial);
    setOriginalStateRates(cloneRatesMap(initial));
    setOriginalStateStatuses(statuses);
    setWizardStates(order);

    // Default to the first state that still needs attention, if any —
    // otherwise just start at the first state in the list.
    const firstAttentionIndex = order.findIndex(
      (c) => statuses[c] !== "active",
    );
    setWizardIndex(firstAttentionIndex >= 0 ? firstAttentionIndex : 0);

    setAdminNotes("");
    setModalMode("request");
    setModalVisible(true);
  };

  // Opens the wizard for a single state — used by "Continue Draft" and
  // "Resubmit" actions. If the state is truly missing, force empty fields.
  const openSingleStateModal = (code: string, clearRates = false) => {
    const normalized = code.toLowerCase();

    // If this is a truly missing state, always start with empty fields
    if (!clearRates && getStateRateStatus(normalized) === "missing") {
      clearRates = true;
    }

    const status = getStateRateStatus(normalized);
    const isDraft = status === "draft";

    // Include the clicked state + all other states that need attention
    // This way user can update multiple states in one session
    const allCodes = getAllowedStateCodes();
    const attentionStates = allCodes.filter(
      (c) => getStateRateStatus(c) !== "active",
    );

    // Put the clicked state first, then other attention states
    const statesToEdit = attentionStates.includes(normalized)
      ? [normalized, ...attentionStates.filter((c) => c !== normalized)]
      : [normalized, ...attentionStates];

    const initial = buildInitialRatesForCodes(statesToEdit);
    if (clearRates) initial[normalized] = emptyRateForm();

    const statuses: Record<string, StateRateStatus> = {};
    statesToEdit.forEach((code) => {
      statuses[code] = getStateRateStatus(code);
    });

    setStateRates(initial);
    setOriginalStateRates(cloneRatesMap(initial));
    setOriginalStateStatuses(statuses);
    setWizardStates(statesToEdit);

    // Start with the clicked state
    const startIndex = statesToEdit.findIndex((c) => c === normalized);
    setWizardIndex(Math.max(0, startIndex));

    setAdminNotes("");
    setModalMode(isDraft ? "draft" : "update");
    setModalVisible(true);
  };

  const openResubmitModal = (item: any) => {
    const code = String(item?.state || "").toLowerCase();
    if (!code) return;

    // Prefill with the rejected request's rates (do NOT clear)
    openSingleStateModal(code, false);
  };
  // Opens modal in submit-only mode (only shows Save & Submit, no draft option)
  const openSubmitModal = (item: any) => {
    const code = String(item?.state || "").toLowerCase();
    if (!code) return;

    // Use mapRecordToRateForm(item) to correctly prefill the existing saved rates from the draft history item!
    const initial = {
      [code]: mapRecordToRateForm(item),
    };

    setStateRates(initial);
    setOriginalStateRates(cloneRatesMap(initial));
    setOriginalStateStatuses({ [code]: getStateRateStatus(code) });
    setWizardStates([code]);
    setWizardIndex(0);
    setAdminNotes("");
    setIsSubmitMode(true);
    setSubmitModeItem(item);
    setModalVisible(true);
  };

  const activeWizardState = wizardStates[wizardIndex] || "";
  const isLastWizardState = wizardIndex === wizardStates.length - 1;
  const activeRates = stateRates[activeWizardState] || emptyRateForm();
  const activeStateComplete = isRateFormComplete(activeRates);

  const updateStateField = (field: RateFieldKey, value: string) => {
    if (!activeWizardState) return;
    setStateRates((prev) => ({
      ...prev,
      [activeWizardState]: {
        ...(prev[activeWizardState] || emptyRateForm()),
        [field]: value,
      },
    }));
  };

  const goToWizardState = (index: number) => {
    // Only allow jumping to a state already reached (or the current one)
    if (index > wizardIndex) return;
    setWizardIndex(index);
  };

  const handleNextState = () => {
    if (!activeStateComplete) return;
    setWizardIndex((i) => Math.min(i + 1, wizardStates.length - 1));
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setIsSubmitMode(false);
    setSubmitModeItem(null);
    setOriginalStateRates({});
    setOriginalStateStatuses({});
    setModalMode("request");
  };

  // Which wizard states actually changed compared to the snapshot taken
  // when the modal opened. A state that already had an approved rate and
  // was left untouched is excluded; every other state (missing/draft/
  // pending/rejected, or an approved state the user edited) is included.
  const getChangedWizardStates = () =>
    wizardStates.filter((code) => {
      const wasApproved = originalStateStatuses[code] === "active";
      if (!wasApproved) return true;
      const original = originalStateRates[code] || emptyRateForm();
      const current = stateRates[code] || emptyRateForm();
      return !areRatesEqual(original, current);
    });

  // =========================================================
  // Shared submit — hits the same `request-charge-rate` endpoint for
  // both "Save & Exit" and "Save and Submit". The only difference is
  // the `is_submitted` flag: 0 = draft (no field-completeness check),
  // 1 = final submission (requires every changed state's fields filled).
  // The payload only ever contains states the user actually changed in
  // this session — an untouched approved rate is never re-sent.
  // Nothing about the rates is ever cached on-device — every screen
  // re-derives state purely from the latest API responses.
  // =========================================================
  const submitRatesRequest = async (isSubmitted: 0 | 1) => {
    if (wizardStates.length === 0) {
      Toast.show({
        type: "error",
        text1: "No state selected",
        text2: "Select at least one state to continue.",
        position: "top",
      });
      return;
    }

    const changedStates = getChangedWizardStates();

    if (changedStates.length === 0) {
      Toast.show({
        type: "error",
        text1: "No changes to save",
        text2: "Update at least one state's rates before continuing.",
        position: "top",
      });
      return;
    }

    // A full submission requires every changed state's fields to be filled.
    // Saving & exiting is allowed to go out with blank/partial rates.
    const allComplete = changedStates.every((code) =>
      isRateFormComplete(stateRates[code] || emptyRateForm()),
    );
    if (isSubmitted === 1 && !allComplete) {
      Toast.show({
        type: "error",
        text1: "Incomplete information",
        text2:
          "Please complete every field for each updated state before submitting.",
        position: "top",
      });
      return;
    }

    const setBusy = isSubmitted === 1 ? setSubmitting : setSavingExit;

    try {
      setBusy(true);

      const token = authToken || (await AsyncStorage.getItem("@auth_token"));
      const userStr = await AsyncStorage.getItem("user");

      if (!userStr || !token) throw new Error("Authentication error");

      const user = JSON.parse(userStr);

      const toNum = (v: string) => {
        const n = parseFloat(v);
        return isNaN(n) ? 0 : n;
      };

      // Only the states that actually changed go into the payload.
      const rates = changedStates.map((stateCode) => {
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

      // is_submitted: 0 → Save & Exit (draft), 1 → Save and Submit (active review)
      const payload = {
        user_id: user?.id,
        rates,
        notes: adminNotes,
        is_submitted: isSubmitted,
      };

      await axios.post(`${BASE_URL}/request-charge-rate`, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      });

      if (isSubmitted === 1) {
        Toast.show({
          type: "success",
          text1: "Request Submitted",
          text2: "Your rate update request has been sent for admin review.",
          position: "top",
        });
      } else {
        Toast.show({
          type: "info",
          text1: "Progress saved",
          text2:
            "Your draft has been saved. Reopen this screen anytime to finish and submit.",
          position: "top",
        });
      }

      const closedWizardStates = wizardStates;

      setModalVisible(false);
      setStateRates({});
      setOriginalStateRates({});
      setOriginalStateStatuses({});
      setWizardStates([]);
      setWizardIndex(0);
      setAdminNotes("");
      setIsSubmitMode(false);
      setSubmitModeItem(null);
      // Reset the finished flag so if rates become complete again, user can finish
      setFinishedThisSession(false);

      // Refetch from the API — this is the single source of truth for
      // whether a state is active / draft / pending / rejected.
      await Promise.all([fetchRates(), fetchHistory()]);

      // Keep the just-edited state selected/visible so the user
      // immediately sees the card they saved or submitted.
      if (closedWizardStates.length === 1) {
        setSelectedStateTab(closedWizardStates[0]);
      }

      // A full submission moves the contractor straight to the archive
      // so they can see the request they just sent for review.
      if (isSubmitted === 1) {
        setTopTab("history");
      } else {
        setTopTab("active");
      }
    } catch (err: any) {
      const apiMessage =
        err?.response?.data?.message ||
        err?.response?.data?.errors?.state?.[0] ||
        err?.response?.data?.errors?.rates?.[0] ||
        err?.message ||
        "Something went wrong";

      Toast.show({
        type: "error",
        text1: isSubmitted === 1 ? "Submission Failed" : "Save Failed",
        text2: apiMessage,
        position: "top",
      });
    } finally {
      setBusy(false);
    }
  };

  // Save & Exit → is_submitted: 0 in the payload.
  const handleSaveAndExit = () => submitRatesRequest(0);
  // Save and Submit → is_submitted: 1 in the payload.
  const handleRequestSubmit = () => submitRatesRequest(1);

  // Always allow back — no incomplete-rates gate.
  const handleBackPress = () => {
    navigation.dispatch(
      CommonActions.navigate({
        name: "MainTabs",
        params: { screen: "Profile" },
      }),
    );
  };

  // ---------------------------------------------------------------
  // Finish CTA — derived entirely from live API data (ratesList +
  // historyList) on every render. No AsyncStorage / on-device flag
  // is used to remember this; it is purely a function of the current
  // API state, so it always reflects reality even across devices.
  // ---------------------------------------------------------------
  const wasCompleteRef = useRef<boolean | null>(null);

  useEffect(() => {
    if (loading || historyLoading) {
      setShowFinishCTA(false);
      return;
    }

    const hasAllowedStates = allowedCodesForBadge.length > 0;
    const hasRateRecords = ratesList.length > 0;
    const ratesFullyComplete =
      hasAllowedStates && hasRateRecords && allStatesComplete;

    if (!ratesFullyComplete) {
      setFinishedThisSession(false);
      setShowFinishCTA(false);
      wasCompleteRef.current = false;
      completeToastShownRef.current = false;
      return;
    }

    if (finishedThisSession) {
      setShowFinishCTA(false);
      wasCompleteRef.current = true;
      return;
    }

    setShowFinishCTA(ratesFullyComplete);

    // Rates just became complete this session → nudge the user with a
    // toast and make sure they're looking at the Active Rates tab.
    if (wasCompleteRef.current === false && !completeToastShownRef.current) {
      completeToastShownRef.current = true;
      setTopTab("active");
      Toast.show({
        type: "info",
        text1: "Rates complete",
        text2: "Please click on Finish to activate your profile.",
        position: "top",
        visibilityTime: 5000,
      });
    }

    wasCompleteRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    loading,
    historyLoading,
    allStatesComplete,
    allowedCodesForBadge.length,
    ratesList.length,
    finishedThisSession,
  ]);

  const handleFinishPress = () => {
    setFinishedThisSession(true); // triggers persist after hydration
    setShowFinishCTA(false);
    navigation.dispatch(
      CommonActions.navigate({
        name: "MainTabs",
        params: { screen: "Profile" },
      }),
    );
  };

  const openViewModal = (item: any) => {
    setViewModalData(item);
    setViewModalVisible(true);
  };

  const getDisplayStatus = (item: any): StateRateStatus => {
    if (Number(item?.is_submitted) === 0) return "draft";
    const s = String(item?.status || "pending").toLowerCase();
    if (s === "approved") return "active";
    if (s === "rejected") return "rejected";
    return "pending";
  };

  const statusPillColors = (status: StateRateStatus) => {
    if (status === "active")
      return { color: COLORS.success, bg: COLORS.successBg };
    if (status === "rejected")
      return { color: COLORS.danger, bg: COLORS.dangerBg };
    if (status === "draft")
      return { color: COLORS.textMuted, bg: COLORS.cardAlt };
    return { color: COLORS.warning, bg: COLORS.warningBg };
  };

  const statusIcon = (status: StateRateStatus) => {
    if (status === "active") return CheckCircle2;
    if (status === "rejected") return XCircle;
    if (status === "draft") return Save;
    return Clock;
  };

  const statusLabel = (status: StateRateStatus) => {
    if (status === "active") return "Approved";
    if (status === "rejected") return "Rejected";
    if (status === "draft") return "Draft";
    return "Pending";
  };

  const refreshControl = (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      tintColor={COLORS.primary}
      colors={[COLORS.primary]}
    />
  );

  const requestButtonLabel =
    missingStatesCount > 0 ? "Request Rates" : "Update Rates";

  // =========================================================
  // Single-state card for the Active Rates tab — shows whichever
  // state is currently selected in the tab bar.
  //  - active:  full approved rate table.
  //  - draft / pending / rejected: the rates the contractor entered are
  //    shown (never hidden behind a generic placeholder), clearly marked
  //    as not yet approved so it's never confused with an active rate.
  //  - missing: empty state with a CTA to request rates.
  // =========================================================
  const renderSelectedStateCard = () => {
    if (!selectedStateTab) return null;

    const status = getStateRateStatus(selectedStateTab);
    const stateLabel = getStateLabel(selectedStateTab);

    // Strictly enforce that 'active' cards only render if an active rate record exists from the API
    if (status === "active") {
      const rate = getActiveRateForState(selectedStateTab);
      if (!rate) {
        // Fallback if data is empty
        return renderMissingCard(selectedStateTab, stateLabel);
      }
      const rows = buildRowsForRate(rate);
      return (
        <View style={styles.tableCard}>
          <View style={styles.tableHeader}>
            <View style={styles.tableHeaderLeft}>
              <View style={styles.clockIcon}>
                <Clock size={18} color={COLORS.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.tableTitle}>{stateLabel} Rates</Text>
                <Text style={styles.tableSub}>Approved charge rates</Text>
              </View>
              <View
                style={[styles.stateStatusPill, styles.stateStatusPillActive]}
              >
                <Text
                  style={[
                    styles.stateStatusPillText,
                    { color: COLORS.success },
                  ]}
                >
                  Active
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.colHeader}>
            <Text style={[styles.colHeaderText, { flex: 1.4 }]}>Time Slot</Text>
            <Text
              style={[styles.colHeaderText, { width: 90, textAlign: "right" }]}
            >
              Metro
            </Text>
            <Text
              style={[styles.colHeaderText, { width: 90, textAlign: "right" }]}
            >
              Regional
            </Text>
          </View>

          {rows.map((row, idx, arr) => (
            <View
              key={row.label}
              style={[
                styles.rateRow,
                idx % 2 === 1 && styles.rateRowAlt,
                idx === arr.length - 1 && { borderBottomWidth: 0 },
              ]}
            >
              <View style={{ flex: 1.4 }}>
                <Text style={styles.rateLabel}>{row.label}</Text>
                <Text style={styles.rateTime}>{row.time}</Text>
              </View>
              <Text style={[styles.rateValue, { width: 90 }]}>
                {formatMoney(row.metro)}
              </Text>
              <Text
                style={[styles.rateValue, { width: 90, color: COLORS.info }]}
              >
                {formatMoney(row.regional)}
              </Text>
            </View>
          ))}

          <TouchableOpacity
            style={styles.updateRatesBtn}
            onPress={() => openSingleStateModal(selectedStateTab)}
            activeOpacity={0.85}
          >
            <Pencil size={14} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.updateRatesBtnText}>Update Rates</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // Draft / Pending / Rejected: the contractor has already entered rates
    // for this state, they just haven't been approved yet. Show what was
    // actually entered instead of a generic "Draft Saved" placeholder, and
    // never present this with the "Active" styling.
    if (status === "draft" || status === "pending" || status === "rejected") {
      const record = getLatestHistoryForState(selectedStateTab);
      const rows = buildRowsForRate(record);
      const hasRateValues = rows.some(
        (row) =>
          isFieldFilled(String(row.metro ?? "")) ||
          isFieldFilled(String(row.regional ?? "")),
      );

      const meta =
        status === "rejected"
          ? { label: "Rejected", color: COLORS.danger, bg: COLORS.dangerBg }
          : status === "pending"
          ? { label: "Pending", color: COLORS.warning, bg: COLORS.warningBg }
          : { label: "Draft", color: COLORS.textMuted, bg: COLORS.cardAlt };

      const noteText =
        status === "rejected"
          ? "This request was rejected by the admin team. Please review and resubmit."
          : status === "pending"
          ? "Your request is currently awaiting review by the admin team."
          : "You have an unsubmitted draft. Continue editing to submit it for review.";

      return (
        <View style={styles.tableCard}>
          <View style={styles.tableHeader}>
            <View style={styles.tableHeaderLeft}>
              <View style={[styles.clockIcon, { backgroundColor: meta.bg }]}>
                <Clock size={18} color={meta.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.tableTitle}>{stateLabel} Rates</Text>
                <Text style={styles.tableSub}>
                  Rates added but not approved yet
                </Text>
              </View>
              <View
                style={[styles.stateStatusPill, { backgroundColor: meta.bg }]}
              >
                <Text
                  style={[styles.stateStatusPillText, { color: meta.color }]}
                >
                  {meta.label}
                </Text>
              </View>
            </View>
          </View>

          {hasRateValues && (
            <>
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
                  Metro
                </Text>
                <Text
                  style={[
                    styles.colHeaderText,
                    { width: 90, textAlign: "right" },
                  ]}
                >
                  Regional
                </Text>
              </View>

              {rows.map((row, idx, arr) => (
                <View
                  key={row.label}
                  style={[
                    styles.rateRow,
                    idx % 2 === 1 && styles.rateRowAlt,
                    idx === arr.length - 1 && { borderBottomWidth: 0 },
                  ]}
                >
                  <View style={{ flex: 1.4 }}>
                    <Text style={styles.rateLabel}>{row.label}</Text>
                    <Text style={styles.rateTime}>{row.time}</Text>
                  </View>
                  <Text style={[styles.rateValue, { width: 90 }]}>
                    {formatMoney(row.metro)}
                  </Text>
                  <Text
                    style={[
                      styles.rateValue,
                      { width: 90, color: COLORS.info },
                    ]}
                  >
                    {formatMoney(row.regional)}
                  </Text>
                </View>
              ))}
            </>
          )}

          <View style={styles.stateCardPendingNote}>
            <Clock
              size={14}
              color={COLORS.textSecondary}
              style={{ marginRight: 6 }}
            />
            <Text style={styles.stateCardPendingNoteText}>{noteText}</Text>
          </View>

          {(status === "draft" || status === "rejected") && (
            <View style={styles.stateCardActionRow}>
              <TouchableOpacity
                style={styles.stateCardActionBtn}
                onPress={() =>
                  status === "draft"
                    ? openSingleStateModal(selectedStateTab)
                    : openResubmitModal(record)
                }
                activeOpacity={0.85}
              >
                {status === "draft" ? (
                  <Pencil size={15} color="#fff" style={{ marginRight: 8 }} />
                ) : (
                  <RotateCcw
                    size={15}
                    color="#fff"
                    style={{ marginRight: 8 }}
                  />
                )}
                <Text style={styles.stateCardActionBtnText}>
                  {status === "draft" ? "Continue Draft" : "Resubmit"}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      );
    }

    // Truly missing — no rate has ever been entered for this state.
    return renderMissingCard(selectedStateTab, stateLabel);
  };

  const renderMissingCard = (stateCode: string, stateLabel: string) => {
    return (
      <View style={styles.emptyStateCardInline}>
        <View style={styles.emptyIconWrap}>
          <FolderOpen size={36} color={COLORS.textMuted} />
        </View>
        <Text style={styles.emptyTitle}>No Rates Assigned</Text>
        <Text style={styles.emptyDescription}>
          You currently do not have any active rates assigned for {stateLabel}.
          Please submit a request.
        </Text>
        <TouchableOpacity
          style={styles.emptyRequestButton}
          onPress={() => openRequestModal()}
          activeOpacity={0.85}
        >
          <Send size={15} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.emptyRequestButtonText}>Request Rate Update</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      {/* ───────────────── Header ───────────────── */}
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
          </View>

          <Text style={styles.headerSub}>
            View your approved charge rates by state, including metro and
            regional rates.
          </Text>

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
                size={13}
                color={
                  topTab === "active" ? COLORS.primary : COLORS.textSecondary
                }
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
                size={13}
                color={
                  topTab === "history" ? COLORS.primary : COLORS.textSecondary
                }
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
        </View>
      </LinearGradient>

      {/* ───────────────── Body ───────────────── */}
      {loading || historyLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading rates...</Text>
        </View>
      ) : (
        <>
          {/* Missing rates alert */}
          {hasMissingRates && topTab === "active" && (
            <View
              style={{
                flexDirection: "row",
                alignItems: "flex-start",
                marginHorizontal: 16,
                marginTop: 14,
                backgroundColor: COLORS.dangerBg,
                borderWidth: 1,
                borderColor: COLORS.dangerBorder,
                borderRadius: 14,
                paddingVertical: 12,
                paddingHorizontal: 14,
                gap: 10,
              }}
            >
              <AlertCircle
                size={18}
                color={COLORS.danger}
                style={{ marginTop: 1 }}
              />
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "700",
                    color: COLORS.text,
                    marginBottom: 2,
                  }}
                >
                  {missingStates.length === 1
                    ? "1 state has no rates"
                    : `${missingStates.length} states have no rates`}
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    color: COLORS.textSecondary,
                    lineHeight: 17,
                  }}
                >
                  {missingStates.map((c) => getStateLabel(c)).join(", ")} —
                  please fill the rates for{" "}
                  {missingStates.length === 1 ? "this state" : "these states"}.
                </Text>
              </View>
            </View>
          )}

          {/* State chips */}
          {topTab === "active" && allowedCodesForBadge.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.stateChipsRow}
              contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}
            >
              {sortedStateTabs.map((code) => {
                const status = getStateRateStatus(code);
                const isSelected = code === selectedStateTab;
                const meta = STATUS_BADGE_META[status];
                const isActiveStatus = status === "active";
                return (
                  <View key={code} style={styles.stateChipWrapper}>
                    <TouchableOpacity
                      style={[
                        styles.stateChip,
                        isSelected && styles.stateChipSelected,
                      ]}
                      activeOpacity={0.85}
                      onPress={() => setSelectedStateTab(code)}
                    >
                      <MapPin
                        size={13}
                        color={
                          isSelected ? COLORS.primary : COLORS.textSecondary
                        }
                      />
                      <Text
                        style={[
                          styles.stateChipText,
                          isSelected && styles.stateChipTextSelected,
                        ]}
                      >
                        {getStateLabel(code)}
                      </Text>
                    </TouchableOpacity>
                    {meta && (
                      <View
                        style={[
                          styles.stateChipBadgeAbsolute,
                          {
                            backgroundColor: meta.bg,
                            flexDirection: "row",
                            alignItems: "center",
                          },
                        ]}
                      >
                        {isActiveStatus ? (
                          <CheckCircle2
                            size={10}
                            color="#fff"
                            style={{ marginRight: 3 }}
                          />
                        ) : null}
                        <Text style={styles.stateChipBadgeText}>
                          {meta.label}
                        </Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </ScrollView>
          )}

          {/* Finish CTA */}
          {showFinishCTA && topTab === "active" && (
            <View style={styles.completionBanner}>
              <View style={styles.completionBannerLeft}>
                <CheckCircle2 size={18} color={COLORS.success} />
                <Text style={styles.completionBannerText}>
                  All required charge rates are set. Click Finish to activate
                  your profile.
                </Text>
              </View>
              <TouchableOpacity
                style={styles.finishBtn}
                onPress={handleFinishPress}
                activeOpacity={0.85}
              >
                <Text style={styles.finishBtnText}>Finish</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Main scroll content */}
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={{ paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={COLORS.primary}
                colors={[COLORS.primary]}
              />
            }
          >
            {/* ══════════ Active Rates tab ══════════ */}
            {topTab === "active" && (
              <>
                {allowedCodesForBadge.length === 0 ? (
                  <View style={styles.emptyStateCardInline}>
                    <View style={styles.emptyIconWrap}>
                      <FolderOpen size={28} color={COLORS.textMuted} />
                    </View>
                    <Text style={styles.emptyTitle}>No states assigned</Text>
                    <Text style={styles.emptyDescription}>
                      Contact your admin to assign a state before requesting
                      rates.
                    </Text>
                  </View>
                ) : selectedStateTab ? (
                  (() => {
                    const status = getStateRateStatus(selectedStateTab);
                    const activeRate = getActiveRateForState(selectedStateTab);
                    const latest = getLatestHistoryForState(selectedStateTab);
                    const rows =
                      status === "active" && activeRate
                        ? buildRowsForRate(activeRate)
                        : latest
                        ? buildRowsForRate(latest)
                        : [];

                    if (status === "missing") {
                      return (
                        <View style={styles.emptyStateCardInline}>
                          <View style={styles.emptyIconWrap}>
                            <FolderOpen size={28} color={COLORS.textMuted} />
                          </View>
                          <Text style={styles.emptyTitle}>No rates yet</Text>
                          <Text style={styles.emptyDescription}>
                            {getStateLabel(selectedStateTab)} has no charge
                            rates. Please add them to continue.
                          </Text>
                          <TouchableOpacity
                            style={styles.emptyRequestButton}
                            onPress={() =>
                              openSingleStateModal(selectedStateTab, true)
                            }
                            activeOpacity={0.85}
                          >
                            <Send
                              size={15}
                              color="#fff"
                              style={{ marginRight: 8 }}
                            />
                            <Text style={styles.emptyRequestButtonText}>
                              Add Rates
                            </Text>
                          </TouchableOpacity>
                        </View>
                      );
                    }

                    return (
                      <View style={styles.tableCard}>
                        <View style={styles.tableHeader}>
                          <View style={styles.tableHeaderLeft}>
                            <View style={styles.clockIcon}>
                              <Clock size={18} color={COLORS.primary} />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.tableTitle}>
                                {getStateLabel(selectedStateTab)}
                              </Text>
                              <Text style={styles.tableSub}>
                                {status === "active"
                                  ? "Approved charge rates"
                                  : status === "draft"
                                  ? "Draft — not yet submitted"
                                  : status === "pending"
                                  ? "Pending admin review"
                                  : "Rejected — please resubmit"}
                              </Text>
                            </View>
                            <View
                              style={[
                                styles.stateStatusPill,
                                {
                                  backgroundColor:
                                    STATUS_BADGE_META[status]?.bg ||
                                    COLORS.textMuted,
                                },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.stateStatusPillText,
                                  { color: "#fff" },
                                ]}
                              >
                                {STATUS_BADGE_META[status]?.label || status}
                              </Text>
                            </View>
                          </View>
                        </View>

                        <View style={styles.colHeader}>
                          <Text style={[styles.colHeaderText, { flex: 1.4 }]}>
                            TIME SLOT
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
                            key={`${row.label}-${idx}`}
                            style={[
                              styles.rateRow,
                              idx % 2 === 1 && styles.rateRowAlt,
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

                        {status === "active" && (
                          <TouchableOpacity
                            style={styles.updateRatesBtn}
                            onPress={() =>
                              openSingleStateModal(selectedStateTab, false)
                            }
                            activeOpacity={0.85}
                          >
                            <Pencil
                              size={15}
                              color="#fff"
                              style={{ marginRight: 8 }}
                            />
                            <Text style={styles.updateRatesBtnText}>
                              Update Rates
                            </Text>
                          </TouchableOpacity>
                        )}

                        {status === "draft" && latest && (
                          <View style={styles.stateCardActionRow}>
                            <TouchableOpacity
                              style={styles.stateCardActionBtn}
                              onPress={() => openSubmitModal(latest)}
                              activeOpacity={0.85}
                            >
                              <Send
                                size={15}
                                color="#fff"
                                style={{ marginRight: 8 }}
                              />
                              <Text style={styles.stateCardActionBtnText}>
                                Continue & Submit
                              </Text>
                            </TouchableOpacity>
                          </View>
                        )}

                        {status === "rejected" && latest && (
                          <View style={styles.stateCardActionRow}>
                            <TouchableOpacity
                              style={styles.stateCardActionBtn}
                              onPress={() => openResubmitModal(latest)}
                              activeOpacity={0.85}
                            >
                              <RotateCcw
                                size={15}
                                color="#fff"
                                style={{ marginRight: 8 }}
                              />
                              <Text style={styles.stateCardActionBtnText}>
                                Resubmit
                              </Text>
                            </TouchableOpacity>
                          </View>
                        )}

                        {status === "pending" && (
                          <View style={styles.stateCardPendingNote}>
                            <Clock
                              size={16}
                              color={COLORS.warning}
                              style={{ marginRight: 8 }}
                            />
                            <Text style={styles.stateCardPendingNoteText}>
                              Your rate request is under review by the admin
                              team.
                            </Text>
                          </View>
                        )}
                      </View>
                    );
                  })()
                ) : null}
              </>
            )}

            {/* ══════════ History tab ══════════ */}
            {topTab === "history" && (
              <>
                {historyList.length === 0 ? (
                  <View style={styles.emptyStateCardInline}>
                    <View style={styles.emptyIconWrap}>
                      <HistoryIcon size={28} color={COLORS.textMuted} />
                    </View>
                    <Text style={styles.emptyTitle}>No history yet</Text>
                    <Text style={styles.emptyDescription}>
                      Rate requests you submit will appear here.
                    </Text>
                  </View>
                ) : (
                  historyList.map((item, index) => {
                    const status = getDisplayStatus(item);
                    const pill = statusPillColors(status);
                    const Icon = statusIcon(status);
                    return (
                      <View
                        key={item.id || `${item.state}-${index}`}
                        style={styles.historyRowCard}
                      >
                        <View style={styles.historyRowTop}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.historyRowState}>
                              {getStateLabel(String(item.state || ""))}
                            </Text>
                            <Text style={styles.historyRowDate}>
                              {formatDate(
                                item.created_at ||
                                  item.submitted_at ||
                                  item.date,
                              )}
                            </Text>
                          </View>
                          <View
                            style={[
                              styles.stateStatusPill,
                              { backgroundColor: pill.bg },
                            ]}
                          >
                            <View style={styles.stateStatusPillRow}>
                              <Icon
                                size={12}
                                color={pill.color}
                                style={{ marginRight: 4 }}
                              />
                              <Text
                                style={[
                                  styles.stateStatusPillText,
                                  { color: pill.color },
                                ]}
                              >
                                {statusLabel(status)}
                              </Text>
                            </View>
                          </View>
                        </View>

                        {(item.notes ||
                          item.admin_note ||
                          item.admin_notes) && (
                          <Text style={styles.historyRowNote} numberOfLines={2}>
                            {item.notes || item.admin_note || item.admin_notes}
                          </Text>
                        )}

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

                          {status === "rejected" && (
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

                          {status === "draft" && (
                            <TouchableOpacity
                              style={styles.historyEditBtn}
                              onPress={() => openSubmitModal(item)}
                              activeOpacity={0.85}
                            >
                              <Send
                                size={13}
                                color="#fff"
                                style={{ marginRight: 6 }}
                              />
                              <Text style={styles.historyEditBtnText}>
                                Submit
                              </Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    );
                  })
                )}
              </>
            )}
          </ScrollView>
        </>
      )}

      {/* ───────────────── Request / Update Rates Modal ───────────────── */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={handleCloseModal}
      >
        <KeyboardAvoidingBase>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <LinearGradient
                colors={[COLORS.heroBg1, COLORS.primary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.modalHeader}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalTitle}>
                    {modalMode === "draft"
                      ? "Continue Draft"
                      : modalMode === "update"
                      ? "Update Rates"
                      : "Request Charge Rates"}
                  </Text>
                  <Text style={styles.modalSubtitle}>
                    Step {wizardIndex + 1} of {wizardStates.length || 1}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={handleCloseModal}
                  style={styles.closeBtn}
                >
                  <X size={18} color="#fff" />
                </TouchableOpacity>
              </LinearGradient>

              <ScrollView
                style={styles.modalScroll}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.stateSelectCard}>
                  <View style={styles.stateSelectHeader}>
                    <View style={styles.stateSelectHeaderLeft}>
                      <MapPin size={14} color={COLORS.primary} />
                      <Text style={styles.stateSelectTitle}>SELECT STATE</Text>
                    </View>
                  </View>

                  {wizardStates.length > 0 && (
                    <View style={styles.stateSegmentRow}>
                      {wizardStates.map((code, i) => {
                        const isActive = i === wizardIndex;
                        const isReached = i <= wizardIndex;
                        return (
                          <TouchableOpacity
                            key={code}
                            style={[
                              styles.stateSegment,
                              isActive && styles.stateSegmentActive,
                              !isReached && styles.stateSegmentDisabled,
                            ]}
                            disabled={!isReached}
                            onPress={() => goToWizardState(i)}
                            activeOpacity={0.85}
                          >
                            <MapPin
                              size={13}
                              color={
                                isActive ? COLORS.primary : COLORS.textMuted
                              }
                              style={{ marginRight: 6 }}
                            />
                            <Text
                              style={[
                                styles.stateSegmentText,
                                isActive && styles.stateSegmentTextActive,
                              ]}
                            >
                              {getStateLabel(code)}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}

                  <Text style={styles.editingStateNote}>
                    {activeWizardState
                      ? `You are currently editing rates for ${getStateLabel(
                          activeWizardState,
                        )}`
                      : "Select a state to begin"}
                  </Text>
                </View>

                {activeWizardState ? (
                  <View style={styles.formRatesContainer}>
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
                    <RateInputCard
                      title="Saturday"
                      time="All day"
                      metroValue={activeRates.metro_sat}
                      regValue={activeRates.reg_sat}
                      onMetroChange={(v) => updateStateField("metro_sat", v)}
                      onRegChange={(v) => updateStateField("reg_sat", v)}
                    />
                    <RateInputCard
                      title="Sunday"
                      time="All day"
                      metroValue={activeRates.metro_sun}
                      regValue={activeRates.reg_sun}
                      onMetroChange={(v) => updateStateField("metro_sun", v)}
                      onRegChange={(v) => updateStateField("reg_sun", v)}
                    />
                    <RateInputCard
                      title="Public Holiday"
                      time="All day"
                      metroValue={activeRates.metro_pub}
                      regValue={activeRates.reg_pub}
                      onMetroChange={(v) => updateStateField("metro_pub", v)}
                      onRegChange={(v) => updateStateField("reg_pub", v)}
                    />
                  </View>
                ) : null}

                {isLastWizardState && (
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
                )}
              </ScrollView>

              <View style={styles.modalFooter}>
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

                {isLastWizardState ? (
                  <View style={styles.modalFooterButtonsRow}>
                    {!isSubmitMode && (
                      <TouchableOpacity
                        style={styles.saveExitBtn}
                        onPress={handleSaveAndExit}
                        activeOpacity={0.85}
                        disabled={savingExit || submitting}
                      >
                        {savingExit ? (
                          <ActivityIndicator
                            size="small"
                            color={COLORS.textSecondary}
                          />
                        ) : (
                          <>
                            <LogOut
                              size={15}
                              color={COLORS.textSecondary}
                              style={{ marginRight: 6 }}
                            />
                            <Text style={styles.saveExitBtnText}>
                              Save & Exit
                            </Text>
                          </>
                        )}
                      </TouchableOpacity>
                    )}

                    <TouchableOpacity
                      style={[
                        styles.submitBtnModal,
                        !activeStateComplete && { opacity: 0.5 },
                        isSubmitMode && styles.submitBtnModalFull,
                      ]}
                      onPress={handleRequestSubmit}
                      disabled={
                        submitting || savingExit || !activeStateComplete
                      }
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
                ) : (
                  <TouchableOpacity
                    style={[
                      styles.nextStateBtn,
                      !activeStateComplete && { opacity: 0.5 },
                    ]}
                    onPress={handleNextState}
                    disabled={!activeStateComplete}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.nextStateBtnText}>Next State</Text>
                    <ChevronRight
                      size={17}
                      color="#fff"
                      style={{ marginLeft: 4 }}
                    />
                  </TouchableOpacity>
                )}

                {!activeStateComplete && (
                  <Text style={styles.footerIncompleteHint}>
                    Fill in every field above to continue.
                  </Text>
                )}
              </View>
            </View>
          </View>
        </KeyboardAvoidingBase>
      </Modal>

      {/* ───────────────── View Request Modal ───────────────── */}
      <Modal
        visible={viewModalVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setViewModalVisible(false)}
      >
        <View style={styles.viewModalOverlay}>
          <View style={styles.viewModalCard}>
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

            <ScrollView
              style={styles.viewModalBody}
              contentContainerStyle={styles.viewModalBodyContent}
              showsVerticalScrollIndicator={false}
              bounces={false}
              nestedScrollEnabled
            >
              <View style={styles.viewModalMetaRow}>
                {(() => {
                  const status = viewModalData
                    ? getDisplayStatus(viewModalData)
                    : "pending";
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
                        {statusLabel(status)}
                      </Text>
                    </View>
                  );
                })()}
                <Text style={styles.viewModalSubmittedText}>
                  {viewModalData && Number(viewModalData.is_submitted) === 0
                    ? "Saved"
                    : "Submitted"}{" "}
                  on{" "}
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

              {viewModalData &&
                getDisplayStatus(viewModalData) === "rejected" && (
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

              {viewModalData && getDisplayStatus(viewModalData) === "draft" && (
                <TouchableOpacity
                  style={styles.viewModalResubmitBtn}
                  onPress={() => {
                    setViewModalVisible(false);
                    openSubmitModal(viewModalData);
                  }}
                  activeOpacity={0.85}
                >
                  <Send size={15} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.viewModalResubmitBtnText}>Submit</Text>
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
  const metroMissing = !isFieldFilled(metroValue);
  const regMissing = !isFieldFilled(regValue);

  return (
    <View style={styles.rateInputCard}>
      <View style={styles.rateCardHeader}>
        <Text style={styles.rateCardTitle}>{title}</Text>
        <Text style={styles.rateCardTime}>{time}</Text>
      </View>

      <View style={styles.rateInputsRow}>
        <View
          style={[
            styles.rateInputBox,
            metroMissing && styles.rateInputBoxMissing,
          ]}
        >
          <Text style={styles.subInputLabel}>METRO</Text>
          <View style={styles.rateInputWithPrefix}>
            <Text style={styles.rateInputPrefix}>$</Text>
            <TextInput
              style={styles.textInputRate}
              placeholder="0.00"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="numeric"
              value={metroValue}
              onChangeText={onMetroChange}
            />
          </View>
        </View>

        <View
          style={[
            styles.rateInputBox,
            regMissing && styles.rateInputBoxMissing,
          ]}
        >
          <Text style={styles.subInputLabel}>REGIONAL</Text>
          <View style={styles.rateInputWithPrefix}>
            <Text style={styles.rateInputPrefix}>$</Text>
            <TextInput
              style={styles.textInputRate}
              placeholder="0.00"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="numeric"
              value={regValue}
              onChangeText={onRegChange}
            />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingTop: Platform.OS === "ios" ? 8 : 30,
    paddingBottom: 18,
    paddingHorizontal: 10,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  heroInner: {
    width: "100%",
    paddingHorizontal: 10,
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

  // ---- Completion banner / Finish ----
  completionBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 16,
    marginTop: 14,
    backgroundColor: COLORS.successBg,
    borderWidth: 1,
    borderColor: COLORS.successBorder,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 10,
  },
  completionBannerLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  completionBannerText: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: "600",
    color: COLORS.text,
    lineHeight: 18,
  },
  finishBtn: {
    backgroundColor: COLORS.success,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  finishBtnText: {
    color: "#fff",
    fontSize: 12.5,
    fontWeight: "800",
  },

  // ---- Top tabs (segmented, inside hero) ----
  topTabsRow: {
    flexDirection: "row",
    marginTop: 14,
    alignSelf: "flex-end",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 14,
    padding: 4,
    gap: 4,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  topTabBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  topTabBtnActive: {
    backgroundColor: COLORS.card,
  },
  topTabBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.textSecondary,
  },
  topTabBtnTextActive: {
    color: COLORS.primary,
  },

  // ---- State tab bar (Active Rates tab) ----
  stateChipsRow: {
    marginTop: 12,
    maxHeight: 46,
  },

  historyRowCard: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    padding: 14,
    ...CARD_SHADOW,
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
    flexWrap: "wrap",
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
  historyEditBtn: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  historyEditBtnText: {
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
    ...CARD_SHADOW,
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
    fontSize: 15.5,
    fontWeight: "800",
    color: COLORS.text,
    letterSpacing: 0.2,
  },

  colHeader: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: COLORS.cardAlt,
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
  rateRowAlt: {
    backgroundColor: COLORS.cardAlt,
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

  // ---- Update Rates button in active card ----
  updateRatesBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 16,
    marginVertical: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
  },
  updateRatesBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },

  // ---- Draft / Pending / Rejected card action row ----
  stateCardActionRow: {
    flexDirection: "row",
    padding: 14,
  },
  stateCardActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 12,
  },
  stateCardActionBtnText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
  stateCardPendingNote: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
  },
  stateCardPendingNoteText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 17,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(8,14,20,0.6)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: "90%",
    borderWidth: 1.5,
    borderColor: "#dddd",
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#fff",
    marginBottom: 2,
  },
  modalSubtitle: {
    fontSize: 12,
    color: "rgba(255,255,255,0.7)",
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.15)",
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
    marginBottom: 14,
    ...CARD_SHADOW,
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
    letterSpacing: 0.3,
  },

  editingStateNote: {
    fontSize: 11.5,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginTop: 12,
  },

  formSection: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    marginBottom: 16,
    ...CARD_SHADOW,
  },
  formSectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.textSecondary,
    marginBottom: 10,
    letterSpacing: 0.4,
  },
  textArea: {
    backgroundColor: COLORS.cardAlt,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 10,
    padding: 12,
    color: COLORS.text,
    fontSize: 13,
    textAlignVertical: "top",
    minHeight: 80,
  },

  formRatesContainer: {
    marginBottom: 4,
    gap: 10,
  },
  rateInputCard: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    ...CARD_SHADOW,
  },
  rateCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  rateCardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.text,
    flexShrink: 1,
  },
  rateCardTime: {
    fontSize: 10.5,
    color: COLORS.textMuted,
    marginLeft: 4,
    backgroundColor: COLORS.cardAlt,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    overflow: "hidden",
  },
  rateInputsRow: {
    flexDirection: "row",
    gap: 10,
  },
  rateInputBox: {
    flex: 1,
    backgroundColor: COLORS.cardAlt,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    padding: 10,
  },
  rateInputBoxMissing: {
    borderColor: COLORS.dangerBorder,
  },
  subInputLabel: {
    fontSize: 9.5,
    fontWeight: "800",
    color: COLORS.textMuted,
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  rateInputWithPrefix: {
    flexDirection: "row",
    alignItems: "center",
  },
  rateInputPrefix: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.textMuted,
    marginRight: 3,
  },
  textInputRate: {
    flex: 1,
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "700",
    padding: 0,
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
    paddingVertical: 30,
    alignItems: "center",
    ...CARD_SHADOW,
  },

  emptyStateCardInline: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: COLORS.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    paddingHorizontal: 22,
    paddingVertical: 30,
    alignItems: "center",
    ...CARD_SHADOW,
  },

  emptyIconWrap: {
    width: 74,
    height: 74,
    borderRadius: 20,
    backgroundColor: COLORS.cardAlt,
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
    marginBottom: 22,
  },

  emptyRequestButton: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 15,
  },

  emptyRequestButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800",
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
    color: "#fff",
    fontSize: 18,
    fontWeight: "800",
  },

  headerSub: {
    color: "rgba(255,255,255,0.6)",
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
    backgroundColor: COLORS.successBg,
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
  modalFooterNoteRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  modalFooterNote: {
    flex: 1,
    fontSize: 11,
    color: COLORS.textMuted,
    lineHeight: 16,
  },
  modalFooterButtonsRow: {
    flexDirection: "row",
    gap: 10,
  },
  saveExitBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 13,
    borderRadius: 24,
    backgroundColor: COLORS.cardAlt,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  saveExitBtnText: {
    color: COLORS.textSecondary,
    fontSize: 13.5,
    fontWeight: "700",
  },
  submitBtnModal: {
    flex: 1.3,
    flexDirection: "row",
    paddingHorizontal: 18,
    paddingVertical: 13,
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
  submitBtnModalFull: {
    flex: 1,
  },
  nextStateBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
    borderRadius: 24,
    paddingVertical: 14,
  },
  nextStateBtnText: {
    color: "#fff",
    fontSize: 14.5,
    fontWeight: "800",
  },
  footerIncompleteHint: {
    fontSize: 11,
    color: COLORS.warning,
    marginTop: 10,
    textAlign: "center",
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
    color: COLORS.textSecondary,
  },
  viewModalNoteBox: {
    backgroundColor: COLORS.cardAlt,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  viewModalNoteLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 2,
  },
  viewModalNoteText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  viewModalTable: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    overflow: "hidden",
  },
  viewModalTableHeaderRow: {
    flexDirection: "row",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
    backgroundColor: COLORS.cardAlt,
  },
  viewModalTableHeaderText: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.textMuted,
    letterSpacing: 0.4,
  },
  viewModalTableRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  viewModalRowLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.text,
  },
  viewModalRowTime: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  viewModalRowValueDark: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.text,
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
    backgroundColor: COLORS.primary,
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
    backgroundColor: "rgba(8,14,20,0.6)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  viewModalCard: {
    width: "100%",
    maxWidth: 480,
    maxHeight: "85%",
    backgroundColor: COLORS.background,
    borderRadius: 20,
    overflow: "hidden",
    flexDirection: "column",
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  viewModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  viewModalBody: {
    flexGrow: 1,
    flexShrink: 1,
  },
  viewModalBodyContent: {
    padding: 18,
    paddingBottom: 24,
  },
  stateChipWrapper: {
    position: "relative",
    marginTop: 8,
    marginBottom: 4,
  },
  stateChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 11,
    gap: 6,
    ...CARD_SHADOW,
  },
  stateChipSelected: {
    borderColor: COLORS.primaryBorder,
    backgroundColor: COLORS.primaryGlow,
  },
  stateChipText: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.text,
  },
  stateChipTextSelected: {
    color: COLORS.primary,
  },
  stateChipBadgeAbsolute: {
    position: "absolute",
    top: -8,
    right: -4,
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
    zIndex: 10,
    borderWidth: 1,
    borderColor: COLORS.background,
  },
  stateChipBadgeText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "800",
  },

  stateSegmentRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    width: "100%",
    backgroundColor: COLORS.cardAlt,
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },

  stateSegment: {
    width: "31.8%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 9,
  },

  stateSegmentActive: {
    backgroundColor: COLORS.card,
    ...CARD_SHADOW,
  },

  stateSegmentDisabled: {
    opacity: 0.45,
  },

  stateSegmentText: {
    flexShrink: 1,
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.textMuted,
    textAlign: "center",
  },

  stateSegmentTextActive: {
    color: COLORS.primary,
  },
});
