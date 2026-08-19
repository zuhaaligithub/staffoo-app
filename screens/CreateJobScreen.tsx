

import React, {
  useState,
  useMemo,
  useEffect,
  useRef,
  useCallback,
} from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  Alert,
  ActivityIndicator,
  PermissionsAndroid,
  SafeAreaView,
  Modal,
  StatusBar,
  Dimensions,
  Pressable,
  UIManager,
  findNodeHandle,
} from "react-native";
import {
  useFocusEffect,
  useNavigation,
  useRoute,
} from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import DateTimePicker from "@react-native-community/datetimepicker";
import MapView, { Marker } from "react-native-maps";
import type { RootStackParamList } from "../navigation/types";
import {
  pick,
  types,
  DocumentPickerResponse,
} from "@react-native-documents/picker";
import ImageResizer from "react-native-image-resizer";
import { BASE_URL, getAuthToken, uploadFile } from "../services/authApi";
import Toast from "react-native-toast-message";
import axios, { isCancel } from "axios";

import {
  Search,
  MapPin,
  Calendar,
  Clock,
  ChevronDown,
  CloudUpload,
  FileCheck,
  ArrowRight,
  Check,
  ChevronLeft,
  Plus,
  Trash2,
  ArrowLeft,
  ChevronRight,
  X,
} from "lucide-react-native";
import { Keyboard } from "react-native";
import LinearGradient from "react-native-linear-gradient";
import { RatesConfig } from "../utils/rateCalculator";

const { width } = Dimensions.get("window");

const DEFAULT_LOCATION = {
  lat: -33.8688,
  lng: 151.2093,
  label: "Sydney, NSW, Australia",
};

const BRAND_BG = "#0F172A";
const CARD_BG = "#1E2937";
const CHIP_DARK = "#334155";
const ACCENT_TEAL = "#14E6C9";
const TEXT_PRIMARY = "#F1F5F9";
const TEXT_MUTED = "#94A3B8";
const ERROR_RED = "#FF4D67";
const BORDER_COLOR = "#475569";
const MAX_DESCRIPTION_LENGTH = 500;

// Number of columns to render in the calendar day-grid.
const CAL_COLUMNS = 7;
const CAL_CELL_WIDTH_PERCENT = 100 / CAL_COLUMNS;

type ScheduleMode = "single" | "range";
type MultiDayMode = "individual" | "range";

interface Shift {
  id: string;
  startTime: Date;
  endTime: Date;
  guardsCount: string;
}

interface DaySchedule {
  date: Date;
  shifts: Shift[];
}

interface JobFormData {
  category: string;
  documents: string[];
  location: string;
  lat: number;
  lng: number;
  description: string;
}

interface FormErrors {
  category?: string;
  description?: string;
  location?: string;
  schedule?: string;
}

interface PlacePrediction {
  place_id: string;
  description: string;
}

interface ImageAsset {
  uri?: string;
  fileName?: string;
  fileSize?: number;
  width?: number;
  height?: number;
  type?: string;
}

interface PickerTarget {
  mode: "single" | "range" | "master" | "individual" | "task";
  dayIndex: number;
  shiftIndex: number;
  field: "startTime" | "endTime";
  taskId?: string;
}

interface JobTask {
  id: string;
  startTime: Date;
  endTime: Date;
  title: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const isSameDay = (a: Date, b: Date) =>
  a &&
  b &&
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const formatDate = (d: Date) => {
  if (!d || isNaN(d.getTime())) return "N/A";
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
};

const formatTime = (d: Date) => {
  if (!d || isNaN(d.getTime())) return "00:00";
  return d.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
};

const shiftDurationHours = (start: Date, end: Date): number => {
  if (!start || !end || isNaN(start.getTime()) || isNaN(end.getTime()))
    return 0;
  let diff = end.getTime() - start.getTime();
  if (diff < 0) diff += 24 * 60 * 60 * 1000;
  return diff > 0 ? diff / (1000 * 60 * 60) : 0;
};

const datesBetween = (from: Date, to: Date): Date[] => {
  const dates: Date[] = [];
  if (!from || !to || isNaN(from.getTime()) || isNaN(to.getTime()))
    return dates;
  const cur = new Date(from);
  cur.setHours(0, 0, 0, 0);
  const end = new Date(to);
  end.setHours(0, 0, 0, 0);
  let safetyCounter = 0;
  while (cur <= end && safetyCounter < 100) {
    dates.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
    safetyCounter++;
  }
  return dates;
};

/**
 * Takes the CALENDAR DATE from `anchorDate` and the TIME from `timePicker`.
 * This ensures the resulting Date always has the correct calendar date (16th, 17th, 18th…)
 * regardless of what date is stored inside the timePicker value.
 */
const combineDateAndTime = (anchorDate: Date, timePicker: Date): Date => {
  const anchor =
    anchorDate instanceof Date && !isNaN(anchorDate.getTime())
      ? anchorDate
      : new Date();
  const picker =
    timePicker instanceof Date && !isNaN(timePicker.getTime())
      ? timePicker
      : new Date();

  // Always take year/month/day from the ANCHOR (the DaySchedule.date)
  const result = new Date(
    anchor.getFullYear(),
    anchor.getMonth(),
    anchor.getDate(),
    picker.getHours(),
    picker.getMinutes(),
    0,
    0,
  );
  return result;
};

const autoAssignGuards = (startTime: Date, endTime?: Date): string => {
  if (endTime) {
    const hours = shiftDurationHours(startTime, endTime);
    if (hours <= 13) return "1";
    if (hours <= 22) return "2";
    return "3";
  }
  const hour = startTime ? startTime.getHours() : 9;
  if (hour >= 0 && hour < 13) return "1";
  if (hour >= 13 && hour < 22) return "2";
  return "3";
};

const splitShift = (
  start: Date,
  end: Date,
): { startTime: Date; endTime: Date }[] => {
  const totalHours = shiftDurationHours(start, end);
  if (totalHours <= 13) {
    return [{ startTime: new Date(start), endTime: new Date(end) }];
  }

  const exactPresets: Record<number, number[]> = {
    22: [8, 8, 6],
    23: [8, 8, 7],
    24: [8, 8, 8],
  };

  const rounded = Math.round(totalHours);
  let chunks = exactPresets[rounded] || [];

  if (chunks.length === 0) {
    if (totalHours < 22) {
      const half = Math.ceil(totalHours / 2);
      chunks = [half, totalHours - half];
    } else {
      const num = Math.ceil(totalHours / 8);
      const base = Math.floor(totalHours / num);
      const rem = totalHours - base * num;
      chunks = Array.from({ length: num }, (_, i) =>
        i === num - 1 ? base + rem : base,
      );
    }
  }

  const result: { startTime: Date; endTime: Date }[] = [];
  let current = new Date(start);

  for (const hours of chunks) {
    const nextEnd = new Date(current.getTime() + hours * 3600 * 1000);
    result.push({ startTime: new Date(current), endTime: nextEnd });
    current = nextEnd;
  }
  return result;
};

/**
 * makeDefaultShift accepts the parent day's date so startTime/endTime
 * are always anchored to the correct calendar date (not today's date).
 */
const makeDefaultShift = (anchorDate?: Date): Shift => {
  try {
    const base =
      anchorDate instanceof Date && !isNaN(anchorDate.getTime())
        ? anchorDate
        : new Date();

    const startTime = new Date(
      base.getFullYear(),
      base.getMonth(),
      base.getDate(),
      9,
      0,
      0,
      0,
    );
    const endTime = new Date(
      base.getFullYear(),
      base.getMonth(),
      base.getDate(),
      17,
      0,
      0,
      0,
    );
    const id = `shift-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    return { id, startTime, endTime, guardsCount: "1" };
  } catch (error) {
    console.error("Error creating default shift:", error);
    const now = new Date();
    return {
      id: `error-${Date.now()}`,
      startTime: now,
      endTime: new Date(now.getTime() + 8 * 60 * 60 * 1000),
      guardsCount: "1",
    };
  }
};

/**
 * makeDaySchedule passes the date into makeDefaultShift so its
 * inner Date objects carry the correct calendar date from the start.
 */
const makeDaySchedule = (date: Date): DaySchedule => ({
  date: date || new Date(),
  shifts: [makeDefaultShift(date)],
});

const safeDate = (v: any): Date => {
  try {
    if (!v) return new Date();
    if (v instanceof Date) return isNaN(v.getTime()) ? new Date() : v;
    const d = new Date(v);
    return isNaN(d.getTime()) ? new Date() : d;
  } catch {
    return new Date();
  }
};

// ─── Error Boundary ───────────────────────────────────────────────────────────
class ScheduleErrorBoundary extends React.Component<
  { onReset: () => void; children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any) {
    console.error("ScheduleErrorBoundary caught:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View
          style={{
            padding: 16,
            backgroundColor: CARD_BG,
            borderRadius: 12,
            margin: 16,
          }}
        >
          <Text
            style={{ color: "#ef4444", fontWeight: "700", marginBottom: 12 }}
          >
            Schedule layout issue detected. Tap Reset to restore stability.
          </Text>
          <TouchableOpacity
            onPress={() => {
              this.setState({ hasError: false });
              this.props.onReset();
            }}
            style={{
              paddingVertical: 12,
              paddingHorizontal: 16,
              borderRadius: 12,
              backgroundColor: "#3b82f6",
              alignSelf: "flex-start",
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "700" }}>
              Reset Schedule
            </Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}
type CreateJobRouteParams = {
  isEdit?: boolean;
  jobData?: any;
};

// ─── Main Component ───────────────────────────────────────────────────────────
export default function CreateJobScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [ratesData, setRatesData] = useState<any[]>([]);

  const mapRef = useRef<MapView>(null);
  const [mapReady, setMapReady] = useState(false);
  const GOOGLE_PLACES_KEY = "AIzaSyCS-DB39Kk-Z25C5GWymVGshXIALbjXPGY";

  // ── Refs used to fix the "Description field jumps to top on Android" bug ──
  const scrollViewRef = useRef<ScrollView>(null);
  const descriptionInputRef = useRef<TextInput>(null);
  const scrollOffsetY = useRef(0);

  const [form, setForm] = useState<JobFormData>({
    category: "",
    documents: [],
    location: "",
    lat: DEFAULT_LOCATION.lat,
    lng: DEFAULT_LOCATION.lng,
    description: "",
  });

  const [autocompleteQuery, setAutocompleteQuery] = useState("");
  const [suggestions, setSuggestions] = useState<PlacePrediction[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  // ── State-match / shift-splitting control ──────────────────────────────
  // Set by the /check-state API (called after the user picks a location).
  //  - true  → job location state is one of the user's allowed states.
  //            ReviewConfirmScreen renders the ORIGINAL flow: fetch charge
  //            rates itself, show the full quotation breakdown, collect
  //            payment via Stripe immediately. No estimate is calculated
  //            here and /calculate-job-amount is never called.
  //  - false → job location state does NOT match. ReviewConfirmScreen
  //            renders the NEW broadcast/estimate flow (no payment
  //            collected now, admin payment override + contractor
  //            invoice). We DO call /calculate-job-amount here to get the
  //            estimated price range to show on that screen.
  //  - null  → not yet checked (no location selected, or the check-state
  //            call failed). Treated the same as `true` (default/
  //            restricted behaviour) everywhere in this screen.
  const [locationStateCode, setLocationStateCode] = useState<string>("");
  const [stateMatch, setStateMatch] = useState<boolean | null>(null);
  const [userAllowedStates, setUserAllowedStates] = useState<string[]>([]);
  const [calculatingQuote, setCalculatingQuote] = useState(false);

  // Returns true when shifts should be auto-split/validated (default —
  // state matched or not yet checked). Returns false only when the
  // check-state API explicitly reported no match.
  const canSplitShifts = () => stateMatch !== false;

  const [scheduleMode, setScheduleMode] = useState<ScheduleMode>("single");
  const [multiDayMode, setMultiDayMode] = useState<MultiDayMode>("individual");

  const [singleDaySchedule, setSingleDaySchedule] = useState<DaySchedule>(
    () => {
      const today = new Date();
      return makeDaySchedule(today);
    },
  );

  const [selectedJobLevel, setSelectedJobLevel] = useState<string | null>(null);
  const [rangeFrom, setRangeFrom] = useState<Date>(new Date());
  const [rangeTo, setRangeTo] = useState<Date>(new Date());
  const [rangeSchedules, setRangeSchedules] = useState<DaySchedule[]>(() => {
    const today = new Date();
    return [makeDaySchedule(today)];
  });
  const [individualDates, setIndividualDates] = useState<Date[]>([]);
  const [individualSchedules, setIndividualSchedules] = useState<DaySchedule[]>(
    [],
  );

  const [masterStartTime, setMasterStartTime] = useState<Date | null>(null);
  const [masterEndTime, setMasterEndTime] = useState<Date | null>(null);
  const [masterGuards, setMasterGuards] = useState<string>("");
  const [applyToAll, setApplyToAll] = useState(false);

  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerValue, setPickerValue] = useState<Date>(new Date());
  const [pickerTarget, setPickerTarget] = useState<PickerTarget | null>(null);

  const [calendarVisible, setCalendarVisible] = useState(false);
  const [calendarTarget, setCalendarTarget] = useState<
    "single" | "rangeFrom" | "rangeTo" | "individual"
  >("single");
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  const cleanupPickers = () => {
    Keyboard.dismiss();
    setPickerVisible(false);
    setPickerTarget(null);
    setCalendarVisible(false);
  };

  const resetSchedule = () => {
    cleanupPickers();
    setScheduleMode("single");
    setMultiDayMode("individual");
    const now = new Date();
    setSingleDaySchedule(makeDaySchedule(now));
    setRangeFrom(now);
    setRangeTo(now);
    setRangeSchedules([makeDaySchedule(now)]);
    setIndividualDates([]);
    setIndividualSchedules([]);
  };

  useEffect(() => {
    (async () => {
      try {
        const token = await getAuthToken();
        const res = await axios.get(`${BASE_URL}/get-chargerates`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.data?.success) setRatesData(res.data.data);
      } catch (e) {
        console.error("Failed to load rates", e);
      }
    })();
  }, []);

  const switchScheduleMode = (mode: ScheduleMode) => {
    cleanupPickers();
    setScheduleMode(mode);

    if (mode === "single") {
      setSingleDaySchedule(makeDaySchedule(new Date()));
    } else {
      if (multiDayMode === "range" && rangeSchedules.length === 0) {
        setRangeSchedules([makeDaySchedule(new Date())]);
      } else if (
        multiDayMode === "individual" &&
        individualSchedules.length === 0
      ) {
        const today = new Date();
        setIndividualDates([today]);
        setIndividualSchedules([makeDaySchedule(today)]);
      }
    }
  };

  const switchMultiDayMode = (mode: MultiDayMode) => {
    cleanupPickers();
    setMultiDayMode(mode);

    if (mode === "range") {
      setIndividualDates([]);
      setIndividualSchedules([]);

      if (rangeSchedules.length === 0) {
        const today = new Date();
        setRangeFrom(today);
        setRangeTo(today);
        setRangeSchedules([makeDaySchedule(today)]);
      }
    } else if (mode === "individual") {
      setRangeSchedules([]);

      if (individualSchedules.length === 0) {
        const today = new Date();
        setIndividualDates([today]);
        setIndividualSchedules([makeDaySchedule(today)]);
      }
    }
  };

  const [currentJobLevel, setCurrentJobLevel] = useState<number>(1);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [otherCategory, setOtherCategory] = useState("");
  const [otherDocument, setOtherDocument] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadedFilePaths, setUploadedFilePaths] = useState<string[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<
    (ImageAsset | DocumentPickerResponse)[]
  >([]);
  const [errors, setErrors] = useState<FormErrors>({});

  const documentOptions = [
    { label: "White Card Required?", value: "white_card" },
    {
      label: "Working With Children Check Required?",
      value: "working_with_children",
    },
  ];

  const categoryOptions = [
    {
      label: "Crowd Controller (Standard Venue/Event)",
      value: "Crowd Controller (Standard venue/event)",
    },
    {
      label: "Static Security Guard (Gatehouse, Warehouse, Construction Site)",
      value: "Static Security Guard (Gatehouse, warehouse, construction site)",
    },
    {
      label: "Patrol Guard (Foot or Routine Mobile Patrol)",
      value: "Patrol Guard (Foot or routine mobile patrol)",
    },
    {
      label: "Concierge/Front of House Guard",
      value: "Concierge/Front of House Guard",
    },
    {
      label: "Security Officer - Monitoring/Control Room (Basic)",
      value: "Security Officer - Monitoring/Control Room (Basic)",
    },
    {
      label: "Guard with a Trained Security Dog",
      value: "Guard with a Trained Security Dog",
    },
    {
      label: "Armed Security Guard (Cash-in-Transit / Low-Complexity)",
      value: "Armed Security Guard (Cash-in-Transit / Low-Complexity)",
    },
    {
      label: "Control Room Operator (Advanced/Full Systems)",
      value: "Control Room Operator (Advanced/Full Systems)",
    },
    {
      label: "Event/Venue Supervisor (Small Team Leader)",
      value: "Event/Venue Supervisor (Small Team Leader)",
    },
    {
      label: "Aviation/Maritime Security Protection Officer",
      value: "Aviation/Maritime Security Protection Officer",
    },
    {
      label: "Senior Security Supervisor / Shift Supervisor",
      value: "Senior Security Supervisor / Shift Supervisor",
    },
    {
      label: "Mobile Patrol Inspector / Fleet Coordinator",
      value: "Mobile Patrol Inspector / Fleet Coordinator",
    },
    {
      label: "Control Room Shift Manager",
      value: "Control Room Shift Manager",
    },
    {
      label: "Security Operations Manager",
      value: "Security Operations Manager",
    },
    { label: "Regional Contract Manager", value: "Regional Contract Manager" },
    {
      label: "Chief Security Instructor / Compliance Auditor",
      value: "Chief Security Instructor / Compliance Auditor",
    },
    { label: "Others (Custom Entry)", value: "others" },
  ];

  const openIndividualDatePicker = () => {
    setCalendarTarget("individual");
    setCalendarVisible(true);
  };

  const documentTypes = [
    "security_license",
    ...form.documents
      .map((doc) => (doc === "others" ? otherDocument.trim() : doc))
      .filter(Boolean),
  ].filter((value, index, self) => self.indexOf(value) === index);

  const [tasks, setTasks] = useState<JobTask[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => setMapReady(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    try {
      mapRef.current.animateToRegion(
        {
          latitude: form.lat || DEFAULT_LOCATION.lat,
          longitude: form.lng || DEFAULT_LOCATION.lng,
          latitudeDelta: 0.022,
          longitudeDelta: 0.012,
        },
        800,
      );
    } catch (e) {
      console.warn(e);
    }
  }, [mapReady, form.lat, form.lng]);

  useEffect(() => {
    const getLocation = async () => {
      let hasPermission = true;
      if (Platform.OS === "android") {
        try {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          );
          hasPermission = granted === PermissionsAndroid.RESULTS.GRANTED;
        } catch {
          hasPermission = false;
        }
      }
      if (!hasPermission) return;
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const { latitude, longitude } = pos.coords;
            setForm((prev) => ({ ...prev, lat: latitude, lng: longitude }));
            if (mapReady && mapRef.current) {
              mapRef.current.animateToRegion(
                {
                  latitude,
                  longitude,
                  latitudeDelta: 0.022,
                  longitudeDelta: 0.012,
                },
                1000,
              );
            }
          },
          () => {},
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 },
        );
      }
    };
    getLocation();
  }, [mapReady]);

  const route = useRoute();
  const { isEdit = false, jobData: editData } = (route.params ||
    {}) as CreateJobRouteParams;

  const resetForm = useCallback(() => {
    const today = new Date();

    setForm({
      category: "",
      documents: [],
      location: "",
      lat: DEFAULT_LOCATION.lat,
      lng: DEFAULT_LOCATION.lng,
      description: "",
    });

    setOtherCategory("");
    setOtherDocument("");
    setUploadedFilePaths([]);
    setSelectedFiles([]);
    setTasks([]);
    setErrors({});

    setScheduleMode("single");
    setMultiDayMode("individual");

    setSingleDaySchedule(makeDaySchedule(today));
    setRangeFrom(today);
    setRangeTo(today);
    setRangeSchedules([makeDaySchedule(today)]);
    setIndividualDates([]);
    setIndividualSchedules([]);

    setMasterStartTime(null);
    setMasterEndTime(null);
    setMasterGuards("");
    setApplyToAll(false);

    setAutocompleteQuery("");
    setSuggestions([]);

    setLocationStateCode("");
    setStateMatch(null);
    setUserAllowedStates([]);
  }, []);

  // Reset form only on fresh navigation (not when editing from ReviewConfirm)
  useFocusEffect(
    useCallback(() => {
      if (!isEdit) {
        resetForm();
      }
      // If isEdit is true → keep the data passed from ReviewConfirm
    }, [isEdit, resetForm]),
  );



  useEffect(() => {
    if (autocompleteQuery.length < 3) {
      setSuggestions([]);
      return;
    }

    const timeout = setTimeout(async () => {
      setLoadingSuggestions(true);

      try {
        const url =
          `https://maps.googleapis.com/maps/api/place/autocomplete/json` +
          `?input=${encodeURIComponent(autocompleteQuery)}` +
          `&types=address` + 
          `&components=country:au` + 
          `&language=en` +
          `&key=${GOOGLE_PLACES_KEY}`;

        const res = await fetch(url);
        const json = await res.json();

        if (json.status === "OK") {
          setSuggestions(json.predictions || []);
        } else {
          console.warn("Places status:", json.status, json.error_message);
          setSuggestions([]);
        }
      } catch (err) {
        console.error("Autocomplete error:", err);
        setSuggestions([]);
      } finally {
        setLoadingSuggestions(false);
      }
    }, 400);

    return () => clearTimeout(timeout);
  }, [autocompleteQuery]);

  const selectSuggestion = async (prediction: PlacePrediction) => {
    setAutocompleteQuery("");
    setSuggestions([]);
    setErrors((prev) => ({ ...prev, location: undefined }));

    try {
      // Request address_components so we can extract the state
      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${prediction.place_id}&fields=geometry,address_components,formatted_address&key=${GOOGLE_PLACES_KEY}`;

      const res = await fetch(url);
      const json = await res.json();

      if (json.status === "OK" && json.result) {
        const { lat, lng } = json.result.geometry.location;
        const address = json.result.formatted_address || prediction.description;

        // Extract Australian state code (administrative_area_level_1)
        let stateCode = "";
        const components = json.result.address_components || [];

        const stateComponent = components.find((c: any) =>
          c.types.includes("administrative_area_level_1"),
        );

        if (stateComponent) {
          // Google usually returns "VIC", "QLD", "NSW", etc.
          stateCode = stateComponent.short_name.toLowerCase(); // → "vic", "qld", ...
        }

        setLocationStateCode(stateCode);

        setForm((prev) => ({
          ...prev,
          location: address,
          lat,
          lng,
        }));

        // Animate map
        if (mapReady && mapRef.current) {
          mapRef.current.animateToRegion(
            {
              latitude: lat,
              longitude: lng,
              latitudeDelta: 0.022,
              longitudeDelta: 0.012,
            },
            800,
          );
        }

        // ── Call your check-state API ──────────────────────────────
        if (stateCode) {
          await callCheckState(stateCode);
        } else {
          console.warn("Could not extract state from address");
          setStateMatch(null);
          setUserAllowedStates([]);
        }
      }
    } catch (err) {
      console.error("Place details error:", err);
    }
  };

  const callCheckState = async (state: string) => {
    try {
      const token = await getAuthToken();

      const payload = { state };

      console.log("Sending payload to check-state:", payload);

      const res = await axios.post(`${BASE_URL}/check-state`, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      console.log("check-state response:", res.data);

      // Expected shape:
      // { state_match: true, message: "...", user_id: 1, user_states: ["vic"] }
      const match = !!res.data?.state_match;
      setStateMatch(match);
      setUserAllowedStates(
        Array.isArray(res.data?.user_states) ? res.data.user_states : [],
      );
    } catch (error) {
      console.error("check-state API error:", error);
      // Fail safe: unknown state-match status keeps the default
      // (restricted / splitting) behaviour rather than silently
      // removing restrictions on an API error.
      setStateMatch(null);
      setUserAllowedStates([]);
    }
  };

  // When range dates change, preserve existing shifts for matching days
  // and create properly-dated new DaySchedules for new days.
  useEffect(() => {
    if (scheduleMode !== "range" || multiDayMode !== "range") return;
    const days = datesBetween(rangeFrom, rangeTo);
    setRangeSchedules((prev) =>
      days.map((date) => {
        const existing = prev.find((p) => isSameDay(p.date, date));
        if (existing) {
          return {
            ...existing,
            date: date,
            shifts: existing.shifts.map((s) => ({
              ...s,
              startTime: combineDateAndTime(date, s.startTime),
              endTime: combineDateAndTime(date, s.endTime),
            })),
          };
        }
        return makeDaySchedule(date);
      }),
    );
  }, [rangeFrom, rangeTo, scheduleMode, multiDayMode]);

  // Same anchor-date correction for individual mode
  useEffect(() => {
    if (scheduleMode !== "range" || multiDayMode !== "individual") return;
    setIndividualSchedules((prev) =>
      [...individualDates]
        .sort((a, b) => a.getTime() - b.getTime())
        .map((date) => {
          const existing = prev.find((p) => isSameDay(p.date, date));
          if (existing) {
            return {
              ...existing,
              date: date,
              shifts: existing.shifts.map((s) => ({
                ...s,
                startTime: combineDateAndTime(date, s.startTime),
                endTime: combineDateAndTime(date, s.endTime),
              })),
            };
          }
          return makeDaySchedule(date);
        }),
    );
  }, [individualDates, multiDayMode, scheduleMode]);

  const applyMasterToAll = (
    start: Date | null,
    end: Date | null,
    guards: string,
  ) => {
    if (!start || !end) return;

    const buildShifts = (date: Date): Shift[] => {
      const dayStart = combineDateAndTime(date, start);
      let dayEnd = combineDateAndTime(date, end);
      if (dayEnd <= dayStart)
        dayEnd = new Date(dayEnd.getTime() + 24 * 60 * 60 * 1000);
      const hours = shiftDurationHours(dayStart, dayEnd);

      if (canSplitShifts() && hours > 13) {
        const splits = splitShift(dayStart, dayEnd);
        return splits.map((s) => ({
          id: `shift-${Math.random().toString(36).slice(2, 7)}`,
          startTime: new Date(s.startTime),
          endTime: new Date(s.endTime),
          guardsCount: guards || autoAssignGuards(s.startTime, s.endTime),
        }));
      }
      return [
        {
          id: `shift-${Math.random().toString(36).slice(2, 7)}`,
          startTime: dayStart,
          endTime: dayEnd,
          guardsCount: guards || autoAssignGuards(dayStart, dayEnd),
        },
      ];
    };

    if (multiDayMode === "individual") {
      setIndividualSchedules((prev) =>
        prev.map((day) => ({ ...day, shifts: buildShifts(day.date) })),
      );
    } else {
      setRangeSchedules((prev) =>
        prev.map((day) => ({ ...day, shifts: buildShifts(day.date) })),
      );
    }
  };

  const handleApplyToAllToggle = () => {
    const newVal = !applyToAll;
    setApplyToAll(newVal);
    if (newVal) applyMasterToAll(masterStartTime, masterEndTime, masterGuards);
  };

  const onMasterGuardsChange = (val: string) => {
    if (!/^\d*$/.test(val)) return;
    setMasterGuards(val);
    if (applyToAll) applyMasterToAll(masterStartTime, masterEndTime, val);
  };

  const openMasterTimePicker = (field: "startTime" | "endTime") => {
    setPickerValue(
      (field === "startTime" ? masterStartTime : masterEndTime) || new Date(),
    );
    setPickerTarget({ mode: "master", dayIndex: -1, shiftIndex: -1, field });
    setPickerVisible(true);
  };

  const updateSingleShift = (idx: number, field: keyof Shift, value: any) =>
    setSingleDaySchedule((prev) => {
      const shifts = Array.isArray(prev.shifts) ? prev.shifts : [];
      if (!shifts[idx]) return prev;
      return {
        ...prev,
        shifts: shifts.map((s, i) =>
          i === idx ? { ...s, [field]: value } : s,
        ),
      };
    });

  const addSingleShift = () =>
    setSingleDaySchedule((prev) => ({
      ...prev,
      shifts: [...(prev.shifts || []), makeDefaultShift(prev.date)],
    }));

  const removeSingleShift = (idx: number) => {
    cleanupPickers();
    setSingleDaySchedule((prev) => {
      const currentShifts = Array.isArray(prev.shifts) ? [...prev.shifts] : [];
      if (idx < 0 || idx >= currentShifts.length) return prev;
      if (currentShifts.length === 1) {
        const d = makeDefaultShift(prev.date);
        return {
          ...prev,
          shifts: [
            {
              ...currentShifts[0],
              startTime: d.startTime,
              endTime: d.endTime,
              guardsCount: "1",
            },
          ],
        };
      }
      return { ...prev, shifts: currentShifts.filter((_, i) => i !== idx) };
    });
  };

  const removeRangeShift = (di: number, si: number) => {
    cleanupPickers();
    setRangeSchedules((prev) => {
      if (!prev || !prev[di]) return prev;
      const updated = prev.map((day, dayIdx) => {
        if (dayIdx !== di) return day;
        return {
          ...day,
          shifts: day.shifts ? day.shifts.filter((_, i) => i !== si) : [],
        };
      });
      const filtered = updated.filter(
        (day) => day.shifts && day.shifts.length > 0,
      );
      return filtered.length === 0 ? [makeDaySchedule(rangeFrom)] : filtered;
    });
  };

  const removeIndividualShift = (di: number, si: number) => {
    cleanupPickers();
    setIndividualSchedules((prev) => {
      if (!prev || !prev[di]) return prev;
      const updated = prev.map((day, dayIdx) => {
        if (dayIdx !== di) return day;
        return {
          ...day,
          shifts: day.shifts ? day.shifts.filter((_, i) => i !== si) : [],
        };
      });
      const filtered = updated.filter(
        (day) => day.shifts && day.shifts.length > 0,
      );
      if (filtered.length < prev.length)
        setIndividualDates(filtered.map((d) => d.date));
      return filtered;
    });
  };

  const updateRangeShift = (
    di: number,
    si: number,
    field: keyof Shift,
    value: any,
  ) => {
    setApplyToAll(false);
    setRangeSchedules((prev) => {
      const days = [...prev];
      if (!days[di] || !days[di].shifts?.[si]) return prev;
      days[di] = {
        ...days[di],
        shifts: days[di].shifts.map((s, i) =>
          i === si ? { ...s, [field]: value } : s,
        ),
      };
      return days;
    });
  };

  const addRangeShift = (di: number) =>
    setRangeSchedules((prev) => {
      const days = [...prev];
      if (!days[di]) return prev;
      days[di] = {
        ...days[di],
        shifts: [...(days[di].shifts || []), makeDefaultShift(days[di].date)],
      };
      return days;
    });

  const updateIndividualShift = (
    di: number,
    si: number,
    field: keyof Shift,
    value: any,
  ) => {
    setApplyToAll(false);
    setIndividualSchedules((prev) => {
      const days = [...prev];
      if (!days[di] || !days[di].shifts?.[si]) return prev;
      days[di] = {
        ...days[di],
        shifts: days[di].shifts.map((s, i) =>
          i === si ? { ...s, [field]: value } : s,
        ),
      };
      return days;
    });
  };

  const addIndividualShift = (di: number) =>
    setIndividualSchedules((prev) => {
      const days = [...prev];
      if (!days[di]) return prev;
      days[di] = {
        ...days[di],
        shifts: [...(days[di].shifts || []), makeDefaultShift(days[di].date)],
      };
      return days;
    });

  const openTimePicker = (
    mode: "single" | "range" | "individual",
    dayIndex: number,
    shiftIndex: number,
    field: "startTime" | "endTime",
  ) => {
    let currentVal: Date;
    if (mode === "single") {
      currentVal = safeDate(singleDaySchedule.shifts?.[shiftIndex]?.[field]);
    } else if (mode === "individual") {
      currentVal = safeDate(
        individualSchedules[dayIndex]?.shifts?.[shiftIndex]?.[field],
      );
    } else {
      currentVal = safeDate(
        rangeSchedules[dayIndex]?.shifts?.[shiftIndex]?.[field],
      );
    }
    setPickerValue(currentVal);
    setPickerTarget({ mode, dayIndex, shiftIndex, field });
    setPickerVisible(true);
  };

  const applyTimeChange = (selectedDate: Date) => {
    if (!pickerTarget) return;
    const { mode, dayIndex, shiftIndex, field, taskId } = pickerTarget;

    if (mode === "master") {
      if (field === "startTime") setMasterStartTime(selectedDate);
      else setMasterEndTime(selectedDate);
      if (applyToAll)
        applyMasterToAll(
          field === "startTime" ? selectedDate : masterStartTime,
          field === "endTime" ? selectedDate : masterEndTime,
          masterGuards,
        );
      setPickerTarget(null);
      return;
    }

    if (mode === "task" && taskId) {
      setTasks((prev) =>
        prev.map((task) => {
          if (task.id !== taskId) return task;
          return field === "startTime"
            ? { ...task, startTime: selectedDate }
            : { ...task, endTime: selectedDate };
        }),
      );
      setPickerTarget(null);
      return;
    }

    const isSingle = mode === "single";

    let dayAnchorDate: Date;
    let currentShift: Shift | undefined;

    if (isSingle) {
      dayAnchorDate = safeDate(singleDaySchedule.date);
      currentShift = singleDaySchedule?.shifts?.[shiftIndex];
    } else if (mode === "individual") {
      dayAnchorDate = safeDate(individualSchedules?.[dayIndex]?.date);
      currentShift = individualSchedules?.[dayIndex]?.shifts?.[shiftIndex];
    } else {
      dayAnchorDate = safeDate(rangeSchedules?.[dayIndex]?.date);
      currentShift = rangeSchedules?.[dayIndex]?.shifts?.[shiftIndex];
    }

    if (!currentShift) {
      setPickerTarget(null);
      return;
    }

    let newStart =
      field === "startTime"
        ? combineDateAndTime(dayAnchorDate, selectedDate)
        : combineDateAndTime(dayAnchorDate, currentShift.startTime);

    let newEnd =
      field === "endTime"
        ? combineDateAndTime(dayAnchorDate, selectedDate)
        : combineDateAndTime(dayAnchorDate, currentShift.endTime);

    if (newEnd <= newStart) {
      newEnd = new Date(newEnd.getTime() + 24 * 60 * 60 * 1000);
    }

    const hours = shiftDurationHours(newStart, newEnd);

    // ── SPLIT LOGIC (skipped entirely when the job's state doesn't match
    // the user's allowed states — any shift length is then accepted as-is) ──
    if (canSplitShifts() && field === "endTime" && hours > 13) {
      const splits = splitShift(newStart, newEnd);
      const newShifts: Shift[] = splits.map((s) => ({
        id: `shift-${Math.random().toString(36).slice(2, 7)}`,
        startTime: new Date(s.startTime),
        endTime: new Date(s.endTime),
        guardsCount: currentShift?.guardsCount || "1",
      }));

      Toast.show({
        type: "info",
        text1: "Shift Split",
        text2: `Long shift (${hours.toFixed(1)}h) split into ${
          splits.length
        } parts`,
        position: "bottom",
        visibilityTime: 2500,
      });

      if (isSingle) {
        const grouped: DaySchedule[] = [];
        newShifts.forEach((shift) => {
          const d = new Date(
            shift.startTime.getFullYear(),
            shift.startTime.getMonth(),
            shift.startTime.getDate(),
          );
          let bucket = grouped.find((ds) => isSameDay(ds.date, d));
          if (!bucket) {
            bucket = { date: d, shifts: [] };
            grouped.push(bucket);
          }
          bucket.shifts.push(shift);
        });

        if (grouped.length > 1) {
          setScheduleMode("range");
          setMultiDayMode("individual");
          setIndividualDates(grouped.map((g) => g.date));
          setIndividualSchedules(grouped);
        } else {
          setSingleDaySchedule(
            grouped[0] || { date: dayAnchorDate, shifts: [] },
          );
        }
      } else {
        const setFn =
          mode === "individual" ? setIndividualSchedules : setRangeSchedules;

        setFn((prev: DaySchedule[]) => {
          if (!prev || !prev[dayIndex]) return prev;

          const newList: DaySchedule[] = prev.map((item) => ({
            ...item,
            date: new Date(item.date),
            shifts: item.shifts.map((s) => ({ ...s })),
          }));

          newList[dayIndex] = {
            ...newList[dayIndex],
            shifts: newList[dayIndex].shifts.filter((_, i) => i !== shiftIndex),
          };

          newShifts.forEach((shift) => {
            const shiftDay = new Date(
              shift.startTime.getFullYear(),
              shift.startTime.getMonth(),
              shift.startTime.getDate(),
            );
            const existingIdx = newList.findIndex((d) =>
              isSameDay(d.date, shiftDay),
            );
            if (existingIdx !== -1) {
              newList[existingIdx] = {
                ...newList[existingIdx],
                shifts: [...newList[existingIdx].shifts, shift],
              };
            } else {
              newList.push({ date: shiftDay, shifts: [shift] });
            }
          });

          return newList
            .filter((day) => day.shifts.length > 0)
            .sort((a, b) => a.date.getTime() - b.date.getTime());
        });
      }

      setPickerTarget(null);
      return;
    }

    // ── NORMAL UPDATE (no split) ──────────────────────────────────────────────
    const updateValue = field === "startTime" ? newStart : newEnd;
    if (isSingle) {
      updateSingleShift(shiftIndex, field, updateValue);
    } else if (mode === "individual") {
      updateIndividualShift(dayIndex, shiftIndex, field, updateValue);
    } else {
      updateRangeShift(dayIndex, shiftIndex, field, updateValue);
    }
    setPickerTarget(null);
  };

  const onTimePickerChange = (_: any, selectedDate?: Date) => {
    if (!selectedDate) {
      if (Platform.OS === "android") setPickerTarget(null);
      return;
    }

    setPickerValue(selectedDate);

    if (Platform.OS === "android") {
      setPickerVisible(false);
      applyTimeChange(selectedDate);
    }
  };
  const buildCalendarDays = (month: Date): (Date | null)[] => {
    const year = month.getFullYear();
    const m = month.getMonth();
    const first = new Date(year, m, 1);
    const last = new Date(year, m + 1, 0);
    const days: (Date | null)[] = [];
    for (let i = 0; i < first.getDay(); i++) days.push(null);
    for (let d = 1; d <= last.getDate(); d++) days.push(new Date(year, m, d));
    return days;
  };

  const calendarDays = useMemo(
    () => buildCalendarDays(calendarMonth),
    [calendarMonth],
  );

  const isDaySelected = (d: Date) => {
    if (calendarTarget === "single") {
      return isSameDay(d, singleDaySchedule.date);
    }

    if (calendarTarget === "rangeFrom") {
      return isSameDay(d, rangeFrom);
    }

    if (calendarTarget === "rangeTo") {
      return isSameDay(d, rangeTo);
    }

    if (calendarTarget === "individual") {
      return individualDates.some((date) => isSameDay(date, d));
    }

    return false;
  };

  const isDayInRange = (d: Date) => {
    if (calendarTarget !== "rangeFrom" && calendarTarget !== "rangeTo") {
      return false;
    }

    const from = new Date(
      rangeFrom.getFullYear(),
      rangeFrom.getMonth(),
      rangeFrom.getDate(),
    );
    const to = new Date(
      rangeTo.getFullYear(),
      rangeTo.getMonth(),
      rangeTo.getDate(),
    );
    const current = new Date(d.getFullYear(), d.getMonth(), d.getDate());

    return current >= from && current <= to;
  };

  const onCalendarDayPress = (d: Date) => {
    const isPast = d < new Date(new Date().setHours(0, 0, 0, 0));
    if (isPast) return;

    const cleanDate = new Date(
      d.getFullYear(),
      d.getMonth(),
      d.getDate(),
      0,
      0,
      0,
      0,
    );

    if (calendarTarget === "single") {
      setSingleDaySchedule(makeDaySchedule(cleanDate));
    } else if (calendarTarget === "rangeFrom") {
      setRangeFrom(cleanDate);
      if (cleanDate > rangeTo) setRangeTo(cleanDate);
    } else if (calendarTarget === "rangeTo") {
      setRangeTo(cleanDate);
      if (cleanDate < rangeFrom) setRangeFrom(cleanDate);
    } else if (calendarTarget === "individual") {
      setIndividualDates((prev) => {
        const exists = prev.find((p) => isSameDay(p, cleanDate));
        return exists
          ? prev.filter((p) => !isSameDay(p, cleanDate))
          : [...prev, cleanDate].sort((a, b) => a.getTime() - b.getTime());
      });
    }

    if (calendarTarget !== "individual") {
      setCalendarVisible(false);
    }
  };

  const totalManHours = useMemo(() => {
    const schedules =
      scheduleMode === "single"
        ? [singleDaySchedule]
        : multiDayMode === "individual"
        ? individualSchedules
        : rangeSchedules;
    return schedules.reduce(
      (total, day) =>
        total +
        (day?.shifts && Array.isArray(day.shifts) ? day.shifts : []).reduce(
          (dTotal, shift) => {
            const h = shiftDurationHours(
              safeDate(shift.startTime),
              safeDate(shift.endTime),
            );
            const g = Math.max(
              1,
              parseInt(String(shift.guardsCount || "1"), 10),
            );
            return dTotal + h * g;
          },
          0,
        ),
      0,
    );
  }, [
    scheduleMode,
    multiDayMode,
    singleDaySchedule,
    rangeSchedules,
    individualSchedules,
  ]);

  const handleUpload = async () => {
    try {
      const [file] = await pick({
        type: [types.images, types.pdf],
      });

      if (!file) return;

      setUploading(true);

      let fileToUpload = file;

      if (file.type?.startsWith("image/")) {
        try {
          const resized = await ImageResizer.createResizedImage(
            file.uri,
            1024,
            1024,
            "JPEG",
            75,
            0,
          );

          fileToUpload = {
            ...file,
            uri: resized.uri,
            name: file.name || `image_${Date.now()}.jpg`,
            type: "image/jpeg",
          };
        } catch (e) {
          console.warn("Image compression failed:", e);
        }
      }

      const uploaded = await uploadFile(fileToUpload);
      const fp = uploaded?.url || uploaded?.path || uploaded?.file || "";

      if (fp) {
        setSelectedFiles([file]);
        setUploadedFilePaths([fp]);

        Toast.show({
          type: "success",
          text1: "File Uploaded",
          text2: `${file.name || "Document"} added successfully`,
          position: "bottom",
        });
      }
    } catch (err: any) {
      if (isCancel(err)) return;

      Toast.show({
        type: "error",
        text1: "Upload Failed",
        text2: "Only Images and PDF files are allowed",
        position: "bottom",
      });
    } finally {
      setUploading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // Proceed to Quotation: validates the form, then — ONLY when the
  // job's location state does NOT match one of the user's allowed
  // states (stateMatch === false) — calls the dynamic
  // /calculate-job-amount API to get a price estimate. When the state
  // DOES match (stateMatch === true, or hasn't been checked / is null),
  // no estimate call is made at all: ReviewConfirmScreen fetches its own
  // charge rates and runs the original quotation + payment flow.
  // ─────────────────────────────────────────────────────────────
  const validateAndNext = async () => {
    const newErrors: FormErrors = {};

    if (!form.category) {
      newErrors.category = "Please select a job category";
    } else if (form.category === "others" && !otherCategory.trim()) {
      newErrors.category = "Please enter job category";
    }

    if (!form.description?.trim()) {
      newErrors.description = "Description is required";
    }
    if (!form.location?.trim()) {
      newErrors.location = "Location is required";
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      Alert.alert("Incomplete Form", "Please fill all required fields");
      return;
    }

    const activeSchedules =
      scheduleMode === "single"
        ? [singleDaySchedule]
        : multiDayMode === "individual"
        ? individualSchedules
        : rangeSchedules;

    // ─────────────────────────────────────────────────────────────
    // SHIFT DURATION VALIDATION - Minimum 4 Hours
    // Only enforced when the job's state matches the user's allowed
    // states (or hasn't been checked yet). When it does NOT match, any
    // shift length is allowed.
    // ─────────────────────────────────────────────────────────────
    if (canSplitShifts()) {
      let hasInvalidShift = false;

      activeSchedules.forEach((day) => {
        if (!day?.shifts || day.shifts.length === 0) return;

        day.shifts.forEach((shift) => {
          const hours = shiftDurationHours(
            safeDate(shift.startTime),
            safeDate(shift.endTime),
          );

          if (hours < 4) {
            hasInvalidShift = true;
          }
        });
      });

      if (hasInvalidShift) {
        Alert.alert(
          "Minimum 4 Hours Required",
          "Each shift must be at least 4 hours long.",
          [{ text: "OK" }],
        );
        return;
      }
    }

    const first = activeSchedules[0];
    const last = activeSchedules[activeSchedules.length - 1];

    const normalizedShifts = activeSchedules.flatMap((day) =>
      (day?.shifts || []).map((s) => ({
        date: day.date,
        startTime: s.startTime,
        endTime: s.endTime,
        guardsCount: Number(s.guardsCount || 1),
      })),
    );

    if (normalizedShifts.length === 0) {
      Alert.alert("Schedule Required", "Please add at least one shift.");
      return;
    }

    // ── State matches (or hasn't been checked) → go straight to
    // ReviewConfirmScreen. That screen fetches its own charge rates and
    // runs the original quotation + Stripe payment flow. No estimate API
    // call is made here in that case. ──────────────────────────────────
    if (stateMatch !== false) {
      navigation.navigate("ReviewConfirm", {
        jobData: {
          category:
            form.category === "others" ? otherCategory.trim() : form.category,
          location: form.location || "Not specified",
          lat: form.lat ?? DEFAULT_LOCATION.lat,
          lng: form.lng ?? DEFAULT_LOCATION.lng,
          description: form.description || "",
          startDate: first.date,
          startTime: first.shifts[0]?.startTime ?? new Date(),
          endDate: last.date,
          endTime: last.shifts[last.shifts.length - 1]?.endTime ?? new Date(),
          shifts: normalizedShifts,
          totalManHours,
          jobLevel: selectedJobLevel || String(currentJobLevel || 1),
          jobLocationState: locationStateCode || "",
          stateMatch: stateMatch,
          tasks: tasks.map((t) => ({
            title: t.title || "Untitled Task",
            startTime: t.startTime,
            endTime: t.endTime,
          })),
        } as any,
        uploadedFileUrls: uploadedFilePaths,
        selectedDocuments: documentTypes,
      } as any);
      return;
    }

    // ── State does NOT match → get an estimated price range, then go to
    // ReviewConfirmScreen's broadcast/estimate flow. ────────────────────
    const pad2 = (n: number) => String(n).padStart(2, "0");
    const formatApiDateTime = (d: Date) =>
      `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(
        d.getHours(),
      )}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;

    const shiftsPayload = normalizedShifts.map((s) => ({
      start_time: formatApiDateTime(safeDate(s.startTime)),
      end_time: formatApiDateTime(safeDate(s.endTime)),
      number_of_guards: Number(s.guardsCount || 1),
    }));

    setCalculatingQuote(true);
    try {
      const token = await getAuthToken();

      const res = await axios.post(
        `${BASE_URL}/calculate-job-amount`,
        {
          shifts: shiftsPayload,
          state: locationStateCode || "",
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      const resPayload = res.data?.data || res.data || {};
      const minPrice = Number(
        resPayload.min_amount ?? resPayload.min_price ?? resPayload.min ?? 0,
      );
      const maxPrice = Number(
        resPayload.max_amount ?? resPayload.max_price ?? resPayload.max ?? 0,
      );
      const isSegmented = !!(
        resPayload.is_segmented ??
        resPayload.segmented ??
        false
      );

      navigation.navigate("ReviewConfirm", {
        jobData: {
          category:
            form.category === "others" ? otherCategory.trim() : form.category,
          location: form.location || "Not specified",
          lat: form.lat ?? DEFAULT_LOCATION.lat,
          lng: form.lng ?? DEFAULT_LOCATION.lng,
          description: form.description || "",
          startDate: first.date,
          startTime: first.shifts[0]?.startTime ?? new Date(),
          endDate: last.date,
          endTime: last.shifts[last.shifts.length - 1]?.endTime ?? new Date(),
          shifts: normalizedShifts,
          totalManHours,
          jobLevel: selectedJobLevel || String(currentJobLevel || 1),
          jobLocationState: locationStateCode || "",
          stateMatch: stateMatch,
          tasks: tasks.map((t) => ({
            title: t.title || "Untitled Task",
            startTime: t.startTime,
            endTime: t.endTime,
          })),
        } as any,
        estimate: {
          minPrice,
          maxPrice,
          isSegmented,
        },
        uploadedFileUrls: uploadedFilePaths,
        selectedDocuments: documentTypes,
      } as any);
    } catch (err: any) {
      console.error("calculate-job-amount error:", err);
      const msg =
        err?.response?.data?.message ||
        err.message ||
        "Failed to calculate job estimate. Please try again.";
      Alert.alert("Estimate Failed", msg);
    } finally {
      setCalculatingQuote(false);
    }
  };

  useEffect(() => {
    if (!form.category) return;
    const newLevel = calculateJobLevel(form.category);
    setCurrentJobLevel(newLevel);
    const matchedItem = ratesData.find(
      (item) => String(item.level) === String(newLevel),
    );
    if (matchedItem) setSelectedJobLevel(matchedItem.level);
  }, [form.category, ratesData]);

  const calculateJobLevel = (title: string): number => {
    if (!title) return 1;

    const t = title.toLowerCase();

    if (
      t.includes("operations manager") ||
      t.includes("regional contract") ||
      t.includes("chief security") ||
      t.includes("compliance auditor")
    ) {
      return 5;
    }

    if (
      t.includes("senior security") ||
      t.includes("shift supervisor") ||
      t.includes("mobile patrol inspector") ||
      t.includes("fleet coordinator") ||
      t.includes("shift manager")
    ) {
      return 4;
    }

    if (
      t.includes("control room operator") ||
      t.includes("venue supervisor") ||
      t.includes("aviation") ||
      t.includes("maritime")
    ) {
      return 3;
    }

    if (
      t.includes("monitoring") ||
      t.includes("control room (basic)") ||
      t.includes("dog") ||
      t.includes("armed") ||
      t.includes("cash-in-transit") ||
      t.includes("cash in transit")
    ) {
      return 2;
    }

    return 1;
  };
  const handleGoBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate("MainTabs" as never);
    }
  };
  const toggleDocument = (docValue: string) => {
    setForm((prev) => {
      const updated = prev.documents.includes(docValue)
        ? prev.documents.filter((d) => d !== docValue)
        : [...prev.documents, docValue];
      return { ...prev, documents: updated };
    });
  };

  const scrollDescriptionIntoView = useCallback(() => {
    const scroller = scrollViewRef.current;
    const input = descriptionInputRef.current;
    if (!scroller || !input) return;

    const scrollerHandle = findNodeHandle(scroller);
    const inputHandle = findNodeHandle(input);
    if (!scrollerHandle || !inputHandle) return;

    UIManager.measureLayout(
      inputHandle,
      scrollerHandle,
      () => {},
      (_x: number, y: number) => {
        scroller.scrollTo({ y: Math.max(y - 24, 0), animated: true });
      },
    );
  }, []);

  const handleDescriptionFocus = useCallback(() => {
    setTimeout(scrollDescriptionIntoView, Platform.OS === "android" ? 250 : 50);
  }, [scrollDescriptionIntoView]);

  const renderShiftRow = (
    shift: Shift,
    sIdx: number,
    dayIdx: number,
    mode: "single" | "range" | "individual",
  ) => {
    if (!shift) return null;
    return (
      <View key={shift.id || `shift-${sIdx}`} style={styles.shiftCardRow}>
        <TouchableOpacity
          style={styles.timePickerButton}
          onPress={() => openTimePicker(mode, dayIdx, sIdx, "startTime")}
        >
          <Clock size={16} color={ACCENT_TEAL} />
          <Text style={styles.timePickerText}>
            {formatTime(shift.startTime)}
          </Text>
        </TouchableOpacity>

        <Text style={{ color: TEXT_MUTED }}>to</Text>

        <TouchableOpacity
          style={styles.timePickerButton}
          onPress={() => openTimePicker(mode, dayIdx, sIdx, "endTime")}
        >
          <Clock size={16} color={ACCENT_TEAL} />
          <Text style={styles.timePickerText}>{formatTime(shift.endTime)}</Text>
        </TouchableOpacity>

        <TextInput
          style={styles.guardsInput}
          keyboardType="number-pad"
          value={shift.guardsCount || "1"}
          onChangeText={(val) => {
            if (!/^\d*$/.test(val)) return;
            if (mode === "single") updateSingleShift(sIdx, "guardsCount", val);
            else if (mode === "individual")
              updateIndividualShift(dayIdx, sIdx, "guardsCount", val);
            else updateRangeShift(dayIdx, sIdx, "guardsCount", val);
          }}
          placeholder="1"
          placeholderTextColor={TEXT_MUTED}
        />

        <TouchableOpacity
          onPress={() => {
            if (mode === "single") removeSingleShift(sIdx);
            else if (mode === "individual") removeIndividualShift(dayIdx, sIdx);
            else removeRangeShift(dayIdx, sIdx);
          }}
          style={styles.removeShiftButton}
        >
          <Trash2 size={16} color={ERROR_RED} />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={BRAND_BG} />

      <View style={styles.header}>
        <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
          <ArrowLeft size={22} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create New Job</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 0}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.container}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          removeClippedSubviews={false}
          scrollEventThrottle={16}
          onScroll={(e) => {
            scrollOffsetY.current = e.nativeEvent.contentOffset.y;
          }}
          contentContainerStyle={{ paddingBottom: 120 }}
        >
          {/* Job Location */}
          <View style={styles.sectionCard}>
            <Text style={styles.inputLabel}>Job Location *</Text>

            <View
              style={[
                styles.searchBarContainer,
                errors.location && styles.inputErrorBorder,
              ]}
            >
              <Search size={18} color={TEXT_MUTED} style={{ marginRight: 8 }} />

              <TextInput
                style={styles.searchBarInput}
                placeholder="Search job site address..."
                placeholderTextColor={TEXT_MUTED}
                value={autocompleteQuery || form.location}
                onChangeText={setAutocompleteQuery}
              />

              {(form.location || autocompleteQuery) && (
                <TouchableOpacity
                  onPress={() => {
                    setAutocompleteQuery("");
                    setForm((prev) => ({
                      ...prev,
                      location: "",
                      lat: DEFAULT_LOCATION.lat,
                      lng: DEFAULT_LOCATION.lng,
                    }));
                    setSuggestions([]);
                    setLocationStateCode("");
                    setStateMatch(null);
                    setUserAllowedStates([]);
                  }}
                  style={{ padding: 4 }}
                >
                  <X size={18} color={TEXT_MUTED} />
                </TouchableOpacity>
              )}
            </View>

            {errors.location && (
              <Text style={styles.errorText}>{errors.location}</Text>
            )}

            {loadingSuggestions && (
              <ActivityIndicator color={ACCENT_TEAL} style={{ marginTop: 8 }} />
            )}

            {suggestions.map((item) => (
              <TouchableOpacity
                key={item.place_id}
                style={styles.suggestionRow}
                onPress={() => selectSuggestion(item)}
              >
                <MapPin
                  size={16}
                  color={TEXT_MUTED}
                  style={{ marginRight: 8 }}
                />
                <Text style={{ color: "#FFF", flex: 1 }}>
                  {item.description}
                </Text>
              </TouchableOpacity>
            ))}

            <View style={styles.mapFrame}>
              <MapView
                ref={mapRef}
                style={StyleSheet.absoluteFillObject}
                initialRegion={{
                  latitude: form.lat,
                  longitude: form.lng,
                  latitudeDelta: 0.0922,
                  longitudeDelta: 0.0421,
                }}
                onMapReady={() => setMapReady(true)}
              >
                <Marker
                  coordinate={{ latitude: form.lat, longitude: form.lng }}
                />
              </MapView>
            </View>
          </View>

          {/* Shift Schedule */}
          <ScheduleErrorBoundary onReset={resetSchedule}>
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Shift Timing</Text>

              <View style={styles.modeTabsRow}>
                <TouchableOpacity
                  style={[
                    styles.modeTabButton,
                    scheduleMode === "single" && styles.modeTabActive,
                  ]}
                  onPress={() => switchScheduleMode("single")}
                >
                  <Text
                    style={[
                      styles.modeTabTxt,
                      scheduleMode === "single" && styles.modeTabTxtActive,
                    ]}
                  >
                    Single Day
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.modeTabButton,
                    scheduleMode === "range" && styles.modeTabActive,
                  ]}
                  onPress={() => switchScheduleMode("range")}
                >
                  <Text
                    style={[
                      styles.modeTabTxt,
                      scheduleMode === "range" && styles.modeTabTxtActive,
                    ]}
                  >
                    Multiple Days
                  </Text>
                </TouchableOpacity>
              </View>

              {scheduleMode === "single" ? (
                <View>
                  <TouchableOpacity
                    style={styles.calendarTriggerBtn}
                    onPress={() => {
                      setCalendarTarget("single");
                      setCalendarVisible(true);
                    }}
                  >
                    <Calendar
                      size={18}
                      color={ACCENT_TEAL}
                      style={{ marginRight: 8 }}
                    />
                    <Text style={{ color: "#FFF" }}>
                      Date: {formatDate(singleDaySchedule.date)}
                    </Text>
                  </TouchableOpacity>

                  <View style={styles.shiftHeaderRow}>
                    <Text style={[styles.shiftHeaderTxt, { flex: 2 }]}>
                      Start → End
                    </Text>
                    <Text style={[styles.shiftHeaderTxt, { width: 56 }]}>
                      Guards
                    </Text>
                    <View style={{ width: 90 }} />
                  </View>

                  {singleDaySchedule.shifts?.map((shift, sIdx) =>
                    renderShiftRow(shift, sIdx, 0, "single"),
                  )}

                  <TouchableOpacity
                    style={styles.addShiftRowBtn}
                    onPress={addSingleShift}
                  >
                    <Plus size={16} color={ACCENT_TEAL} />
                    <Text
                      style={{
                        color: ACCENT_TEAL,
                        marginLeft: 6,
                        fontWeight: "600",
                      }}
                    >
                      Add Shift
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View>
                  <View style={styles.modeTabsRow}>
                    <TouchableOpacity
                      style={[
                        styles.modeTabButton,
                        multiDayMode === "individual" && styles.modeTabActive,
                      ]}
                      onPress={() => switchMultiDayMode("individual")}
                    >
                      <Text
                        style={[
                          styles.modeTabTxt,
                          multiDayMode === "individual" &&
                            styles.modeTabTxtActive,
                        ]}
                      >
                        Individual Dates
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.modeTabButton,
                        multiDayMode === "range" && styles.modeTabActive,
                      ]}
                      onPress={() => switchMultiDayMode("range")}
                    >
                      <Text
                        style={[
                          styles.modeTabTxt,
                          multiDayMode === "range" && styles.modeTabTxtActive,
                        ]}
                      >
                        Date Range
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {multiDayMode === "range" ? (
                    <View
                      style={{
                        flexDirection: "row",
                        gap: 12,
                        marginBottom: 12,
                      }}
                    >
                      <TouchableOpacity
                        style={[styles.calendarTriggerBtn, { flex: 1 }]}
                        onPress={() => {
                          setCalendarTarget("rangeFrom");
                          setCalendarVisible(true);
                        }}
                      >
                        <Calendar size={16} color={ACCENT_TEAL} />
                        <Text style={{ color: "#FFF", fontSize: 13 }}>
                          From: {formatDate(rangeFrom)}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.calendarTriggerBtn, { flex: 1 }]}
                        onPress={() => {
                          setCalendarTarget("rangeTo");
                          setCalendarVisible(true);
                        }}
                      >
                        <Calendar size={16} color={ACCENT_TEAL} />
                        <Text style={{ color: "#FFF", fontSize: 13 }}>
                          To: {formatDate(rangeTo)}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={[styles.calendarTriggerBtn, { marginBottom: 14 }]}
                      onPress={openIndividualDatePicker}
                    >
                      <Plus size={16} color={ACCENT_TEAL} />
                      <Text style={{ color: "#FFF" }}>
                        Click Dates To Select/Deselect
                      </Text>
                    </TouchableOpacity>
                  )}

                  <View style={styles.masterConfigContainer}>
                    <Text style={styles.masterConfigTitle}>
                      FAST FILL: APPLIES AUTOMATICALLY TO ALL DATES
                    </Text>

                    <View style={styles.masterRow}>
                      <TouchableOpacity
                        style={styles.checkboxRow}
                        onPress={handleApplyToAllToggle}
                      >
                        <View
                          style={[
                            styles.checkboxBox,
                            applyToAll && styles.checkboxChecked,
                          ]}
                        >
                          {applyToAll && <Check size={12} color="#000" />}
                        </View>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.timePickerButtonFlex}
                        onPress={() => openMasterTimePicker("startTime")}
                      >
                        <Text style={{ color: "#FFF" }}>
                          {masterStartTime
                            ? formatTime(masterStartTime)
                            : "Start"}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.timePickerButtonFlex}
                        onPress={() => openMasterTimePicker("endTime")}
                      >
                        <Text style={{ color: "#FFF" }}>
                          {masterEndTime ? formatTime(masterEndTime) : "End"}
                        </Text>
                      </TouchableOpacity>

                      <TextInput
                        style={styles.masterGuardsInputFlex}
                        placeholder="Guards"
                        placeholderTextColor={TEXT_MUTED}
                        keyboardType="number-pad"
                        value={masterGuards}
                        onChangeText={onMasterGuardsChange}
                      />
                    </View>
                  </View>

                  {(multiDayMode === "individual"
                    ? individualSchedules
                    : rangeSchedules
                  ).map((day, dIdx) => (
                    <View
                      key={`day-${dIdx}-${day.date.getTime()}`}
                      style={styles.dayGroupContainer}
                    >
                      <Text style={styles.dayGroupHeading}>
                        {formatDate(day.date)}
                      </Text>
                      {day.shifts?.map((shift, sIdx) =>
                        renderShiftRow(shift, sIdx, dIdx, multiDayMode),
                      )}
                      <TouchableOpacity
                        style={styles.addShiftRowBtn}
                        onPress={() =>
                          multiDayMode === "individual"
                            ? addIndividualShift(dIdx)
                            : addRangeShift(dIdx)
                        }
                      >
                        <Plus size={14} color={ACCENT_TEAL} />
                        <Text
                          style={{
                            color: ACCENT_TEAL,
                            fontSize: 13,
                            marginLeft: 4,
                          }}
                        >
                          Add Shift
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </ScheduleErrorBoundary>

          {/* Hours Summary */}
          <View style={styles.quotationSummaryCard}>
            <View
              style={{ flexDirection: "row", justifyContent: "space-between" }}
            >
              <Text style={{ color: TEXT_MUTED }}>Calculated Hours</Text>
              <Text style={{ color: "#FFF", fontWeight: "700" }}>
                {totalManHours} Hours
              </Text>
            </View>
          </View>

          {/* Category */}
          <View style={styles.sectionCard}>
            <Text style={styles.inputLabel}>Job Category *</Text>

            <LinearGradient
              colors={[
                "rgba(255,255,255,0.41)",
                "rgba(255,255,255,0.35)",
                "rgba(255,255,255,0.2)",
                "rgba(255,255,255,0.10)",
                "rgba(255,255,255,0.22)",
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.dropdownGradient}
            >
              <TouchableOpacity
                style={[
                  styles.selectBox,
                  errors.category && styles.inputErrorBorder,
                ]}
                onPress={() => setShowCategoryModal(true)}
              >
                <Text
                  style={{
                    color: form.category ? "#FFF" : TEXT_MUTED,
                    flex: 1,
                  }}
                >
                  {form.category
                    ? categoryOptions.find((o) => o.value === form.category)
                        ?.label || "Others"
                    : "Select Category"}
                </Text>
                <ChevronDown size={18} color={ACCENT_TEAL} />
              </TouchableOpacity>
            </LinearGradient>

            {errors.category && (
              <Text style={styles.errorText}>{errors.category}</Text>
            )}

            {form.category === "others" && (
              <TextInput
                style={[styles.inputBox, { marginTop: 10 }]}
                placeholder="Specify Job Category"
                placeholderTextColor={TEXT_MUTED}
                value={otherCategory}
                onChangeText={setOtherCategory}
              />
            )}
          </View>

          {/* Documents */}
          <View style={styles.sectionCard}>
            <Text style={styles.inputLabel}>Required Documents</Text>
            <View style={styles.toggleContainer}>
              {documentOptions.slice(0, 3).map((doc) => {
                const isActive = form.documents.includes(doc.value);
                return (
                  <LinearGradient
                    key={doc.value}
                    colors={[
                      "rgba(255,255,255,0.41)",
                      "rgba(255,255,255,0.35)",
                      "rgba(255,255,255,0.2)",
                      "rgba(255,255,255,0.10)",
                      "rgba(255,255,255,0.22)",
                    ]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.toggleCard}
                  >
                    <View style={styles.toggleRow}>
                      <Text style={styles.toggleLabel}>{doc.label}</Text>
                      <TouchableOpacity
                        activeOpacity={1}
                        style={styles.toggleSwitch}
                        onPress={() => toggleDocument(doc.value)}
                      >
                        <View
                          style={[
                            styles.toggleOption,
                            isActive && styles.toggleOptionActiveYes,
                          ]}
                        >
                          <Text
                            style={[
                              styles.toggleText,
                              isActive && styles.toggleTextActive,
                            ]}
                          >
                            Yes
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.toggleOption,
                            !isActive && styles.toggleOptionActiveNo,
                          ]}
                        >
                          <Text
                            style={[
                              styles.toggleText,
                              !isActive && styles.toggleTextActive,
                            ]}
                          >
                            No
                          </Text>
                        </View>
                      </TouchableOpacity>
                    </View>
                  </LinearGradient>
                );
              })}
            </View>
          </View>

          {/* Description */}
          <View style={styles.sectionCard}>
            <View
              style={{ flexDirection: "row", justifyContent: "space-between" }}
            >
              <Text style={styles.inputLabel}>Detailed Description *</Text>
              <Text style={{ color: TEXT_MUTED, fontSize: 12 }}>
                {form.description.length}/{MAX_DESCRIPTION_LENGTH}
              </Text>
            </View>

            <TextInput
              ref={descriptionInputRef}
              style={[
                styles.textAreaBox,
                errors.description && styles.inputErrorBorder,
              ]}
              multiline
              numberOfLines={4}
              maxLength={MAX_DESCRIPTION_LENGTH}
              placeholder="Provide responsibilities, requirements, dress code, etc."
              placeholderTextColor={TEXT_MUTED}
              value={form.description}
              onFocus={handleDescriptionFocus}
              onChangeText={(text) => {
                setForm((prev) => ({ ...prev, description: text }));
                setErrors((prev) => ({
                  ...prev,
                  description: text.trim().length > 0 ? "" : prev.description,
                }));
              }}
            />

            {errors.description && (
              <Text style={styles.errorText}>{errors.description}</Text>
            )}
          </View>

          {/* File Upload */}
          <View style={styles.sectionCard}>
            <Text style={styles.inputLabel}>Upload Documents</Text>
            <TouchableOpacity
              style={styles.uploadBoxFrame}
              onPress={handleUpload}
              disabled={uploading}
            >
              {uploading ? (
                <ActivityIndicator color={ACCENT_TEAL} />
              ) : (
                <>
                  <CloudUpload size={28} color={ACCENT_TEAL} />
                  <Text style={{ color: "#FFF", marginTop: 6, fontSize: 13 }}>
                    Upload files here
                  </Text>
                </>
              )}
            </TouchableOpacity>
            {selectedFiles.map((file: any, i) => (
              <View key={i} style={styles.fileRowItem}>
                <FileCheck size={16} color={ACCENT_TEAL} />
                <Text style={styles.fileRowTxt} numberOfLines={1}>
                  {file.name || "document_file.pdf"}
                </Text>
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={[
              styles.primaryActionButton,
              calculatingQuote && { opacity: 0.7 },
            ]}
            onPress={validateAndNext}
            disabled={calculatingQuote}
          >
            <LinearGradient
              colors={["#5CE1D6", "#2bbcb0"]}
              style={styles.gradientButtonWrapper}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {calculatingQuote ? (
                <ActivityIndicator color="#001F3F" />
              ) : (
                <>
                  <Text style={styles.primaryActionText}>
                    Proceed to Quotation Review
                  </Text>
                  <ArrowRight size={18} color="#001F3F" />
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Time Picker */}
      {pickerVisible && (
        <View style={{ alignItems: "center", paddingHorizontal: 12 }}>
          <DateTimePicker
            mode="time"
            is24Hour={true}
            display={Platform.OS === "ios" ? "spinner" : "default"}
            value={pickerValue}
            onChange={onTimePickerChange}
            textColor="#FFFFFF"
          />
          {Platform.OS === "ios" && (
            <View
              style={{
                flexDirection: "row",
                justifyContent: "center",
                gap: 12,
                marginTop: 10,
              }}
            >
              <TouchableOpacity
                onPress={() => {
                  try {
                    applyTimeChange(pickerValue);
                  } catch (e) {
                    console.warn(e);
                  }
                  setPickerVisible(false);
                }}
                style={{
                  paddingVertical: 10,
                  paddingHorizontal: 16,
                  borderRadius: 10,
                  backgroundColor: ACCENT_TEAL,
                }}
              >
                <Text style={{ color: BRAND_BG, fontWeight: "700" }}>
                  Confirm
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setPickerVisible(false);
                  setPickerTarget(null);
                }}
                style={{
                  paddingVertical: 10,
                  paddingHorizontal: 16,
                  borderRadius: 10,
                  backgroundColor: "rgba(255,255,255,0.08)",
                }}
              >
                <Text style={{ color: "#fff", fontWeight: "700" }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
      {pickerVisible && Platform.OS === "ios" && (
        <Modal
          transparent={true}
          animationType="slide"
          visible={pickerVisible}
          onRequestClose={() => setPickerVisible(false)}
        >
          <TouchableOpacity
            style={styles.modalBackgroundOverlay}
            activeOpacity={1}
            onPress={() => setPickerVisible(false)}
          >
            <View
              style={[
                styles.bottomSheetContent,
                { backgroundColor: CARD_BG, paddingBottom: 30 },
              ]}
              onStartShouldSetResponder={() => true}
            >
              <Text style={styles.modalTitleHeader}>Select Time</Text>

              <DateTimePicker
                mode="time"
                is24Hour={true}
                display="spinner"
                value={pickerValue}
                onChange={onTimePickerChange}
                textColor="#FFFFFF"
                style={{ height: 180 }}
              />

              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  gap: 12,
                  marginTop: 15,
                }}
              >
                <TouchableOpacity
                  onPress={() => {
                    setPickerVisible(false);
                    setPickerTarget(null);
                  }}
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    borderRadius: 10,
                    backgroundColor: CHIP_DARK,
                    alignItems: "center",
                  }}
                >
                  <Text style={{ color: "#FFF", fontWeight: "600" }}>
                    Cancel
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    applyTimeChange(pickerValue);
                    setPickerVisible(false);
                  }}
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    borderRadius: 10,
                    backgroundColor: ACCENT_TEAL,
                    alignItems: "center",
                  }}
                >
                  <Text style={{ color: BRAND_BG, fontWeight: "700" }}>
                    Confirm
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </Modal>
      )}
      {/* Calendar Modal */}
      <Modal
        visible={calendarVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCalendarVisible(false)}
      >
        <View style={styles.modalBackgroundOverlay}>
          <View style={styles.calendarModalContent}>
            <View style={styles.calNavRow}>
              <TouchableOpacity
                onPress={() =>
                  setCalendarMonth(
                    new Date(
                      calendarMonth.getFullYear(),
                      calendarMonth.getMonth() - 1,
                      1,
                    ),
                  )
                }
              >
                <ChevronLeft size={20} color="#FFF" />
              </TouchableOpacity>
              <Text style={styles.calendarMonthHeadingText}>
                {calendarMonth.toLocaleString("default", {
                  month: "long",
                  year: "numeric",
                })}
              </Text>
              <TouchableOpacity
                onPress={() =>
                  setCalendarMonth(
                    new Date(
                      calendarMonth.getFullYear(),
                      calendarMonth.getMonth() + 1,
                      1,
                    ),
                  )
                }
              >
                <ChevronRight size={20} color="#FFF" />
              </TouchableOpacity>
            </View>
            <View style={styles.calWeekRow}>
              {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((w) => (
                <Text key={w} style={styles.calWeekDay}>
                  {w}
                </Text>
              ))}
            </View>
            <View style={styles.daysMatrixGrid}>
              {calendarDays.map((day, idx) => {
                if (!day)
                  return (
                    <View key={`empty-${idx}`} style={styles.emptyGridCell} />
                  );
                const isSelected = isDaySelected(day);
                const inRange = isDayInRange(day);
                const isHighlighted = isSelected || inRange;
                const isPast = day < new Date(new Date().setHours(0, 0, 0, 0));
                return (
                  <TouchableOpacity
                    key={`day-${idx}`}
                    style={[
                      styles.calendarDayCell,
                      isHighlighted && styles.dayCellSelected,
                      isPast && styles.dayCellDisabled,
                    ]}
                    onPress={() => !isPast && onCalendarDayPress(day)}
                    disabled={isPast}
                  >
                    <Text
                      style={[
                        styles.dayCellText,
                        isHighlighted && styles.dayCellTextSelected,
                        isPast && styles.dayCellTextDisabled,
                      ]}
                    >
                      {day.getDate()}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <TouchableOpacity
              style={{ marginTop: 20, alignSelf: "flex-end" }}
              onPress={() => setCalendarVisible(false)}
            >
              <Text style={styles.closeModalTextLink}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showCategoryModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCategoryModal(false)}
      >
        <Pressable
          style={styles.modalBackgroundOverlay}
          onPress={() => setShowCategoryModal(false)}
        >
          <Pressable
            style={styles.bottomSheetContent}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={styles.modalTitleHeader}>
              Select Job Position Category
            </Text>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 20 }}
            >
              {categoryOptions.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={styles.sheetOptionRow}
                  onPress={() => {
                    setForm((prev) => ({ ...prev, category: opt.value }));
                    setErrors((prev) => ({ ...prev, category: undefined }));
                    setShowCategoryModal(false);
                  }}
                >
                  <Text
                    style={{
                      color: form.category === opt.value ? ACCENT_TEAL : "#FFF",
                      fontSize: 16,
                    }}
                  >
                    {opt.label}
                  </Text>

                  {form.category === opt.value && (
                    <Check size={18} color={ACCENT_TEAL} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#030508", paddingTop: 25 },
  header: {
    height: 60,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  backButton: { padding: 4 },
  headerTitle: { color: "#FFF", fontSize: 18, fontWeight: "700" },
  container: { flex: 1, padding: 16 },
  sectionCard: {
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  inputLabel: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  selectBox: {
    height: 50,
    backgroundColor: CHIP_DARK,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
  },
  inputBox: {
    height: 50,
    backgroundColor: CHIP_DARK,
    borderRadius: 10,
    color: TEXT_PRIMARY,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  textAreaBox: {
    height: 120,
    backgroundColor: CHIP_DARK,
    borderRadius: 10,
    color: TEXT_PRIMARY,
    paddingHorizontal: 14,
    paddingTop: 12,
    textAlignVertical: "top",
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  inputErrorBorder: { borderColor: ERROR_RED, borderWidth: 1 },
  errorText: {
    color: ERROR_RED,
    fontSize: 12,
    marginTop: 4,
    fontWeight: "500",
  },
  searchBarContainer: {
    height: 40,
    backgroundColor: CHIP_DARK,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
  },
  searchBarInput: { flex: 1, color: "#FFF" },
  suggestionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#1E293B",
  },
  dayCellDisabled: { backgroundColor: "#1E293B", opacity: 0.35 },
  dayCellTextDisabled: { color: "#64748B", textDecorationLine: "line-through" },
  mapFrame: {
    height: 180,
    borderRadius: 12,
    overflow: "hidden",
    marginTop: 12,
  },
  sectionTitle: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 12,
  },
  dropdownGradient: { borderRadius: 12, overflow: "hidden", marginTop: 0 },
  modeTabsRow: {
    flexDirection: "row",
    backgroundColor: CHIP_DARK,
    borderRadius: 8,
    padding: 4,
    marginBottom: 14,
  },
  modeTabButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 6,
  },
  modeTabActive: { backgroundColor: BRAND_BG },
  modeTabTxt: { color: TEXT_MUTED, fontSize: 13, fontWeight: "600" },
  modeTabTxtActive: { color: ACCENT_TEAL },
  calendarTriggerBtn: {
    height: 46,
    backgroundColor: CHIP_DARK,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    gap: 8,
  },
  shiftCardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: CHIP_DARK,
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  timePickerButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: BRAND_BG,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  timePickerText: { color: "#FFF", fontSize: 13, fontWeight: "600" },
  guardsInput: {
    width: 45,
    height: 36,
    backgroundColor: BRAND_BG,
    borderRadius: 6,
    color: "#FFF",
    textAlign: "center",
    padding: 0,
  },
  removeShiftButton: { padding: 6 },
  addShiftRowBtn: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    paddingVertical: 4,
  },
  masterConfigContainer: {
    backgroundColor: BRAND_BG,
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  masterConfigTitle: {
    color: TEXT_MUTED,
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 8,
  },
  dayGroupContainer: {
    backgroundColor: BRAND_BG,
    borderRadius: 10,
    padding: 10,
    marginTop: 12,
  },
  dayGroupHeading: {
    color: ACCENT_TEAL,
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 4,
  },
  uploadBoxFrame: {
    height: 90,
    borderWidth: 1,
    borderColor: ACCENT_TEAL,
    borderStyle: "dashed",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: CHIP_DARK,
  },
  fileRowItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
    paddingHorizontal: 4,
  },
  fileRowTxt: { color: TEXT_MUTED, fontSize: 12, flex: 1 },
  quotationSummaryCard: {
    backgroundColor: "#1E293B",
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
  },
  primaryActionButton: {
    height: 54,
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 50,
  },
  gradientButtonWrapper: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  primaryActionText: { color: "#001F3F", fontSize: 16, fontWeight: "700" },
  modalBackgroundOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    padding: 20,
  },
  calendarModalContent: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#1E293B",
  },
  calNavRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  calendarMonthHeadingText: { color: "#FFF", fontSize: 15, fontWeight: "700" },
  calWeekRow: { flexDirection: "row", marginBottom: 6 },
  calWeekDay: {
    flex: 1,
    textAlign: "center",
    fontSize: 12,
    color: TEXT_MUTED,
    fontWeight: "600",
  },
  daysMatrixGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  emptyGridCell: {
    width: `${CAL_CELL_WIDTH_PERCENT}%`,
    height: 38,
  },
  calendarDayCell: {
    width: `${CAL_CELL_WIDTH_PERCENT}%`,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  dayCellSelected: { backgroundColor: ACCENT_TEAL, borderRadius: 6 },
  dayCellText: { color: "#FFF", fontSize: 13 },
  dayCellTextSelected: { color: "#001F3F", fontWeight: "700" },
  closeModalTextLink: { color: ACCENT_TEAL, fontSize: 14, fontWeight: "600" },
  bottomSheetContent: {
    backgroundColor: CARD_BG,
    maxHeight: "70%",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#1E293B",
  },
  modalTitleHeader: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 14,
  },
  sheetOptionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: BRAND_BG,
  },
  shiftHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    opacity: 0.9,
  },
  shiftHeaderTxt: {
    color: TEXT_MUTED,
    fontSize: 11,
    fontWeight: "700",
  },
  toggleSwitch: {
    width: 65,
    height: 30,
    borderRadius: 50,
    backgroundColor: "#F4F5F7",
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    overflow: "hidden",
  },
  toggleOption: {
    flex: 1,
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 0,
  },
  toggleOptionActiveYes: { backgroundColor: "#1A8754" },
  toggleOptionActiveNo: { backgroundColor: "#6B7280" },
  toggleText: { fontSize: 12, fontWeight: "700", color: "#4B5563" },
  toggleTextActive: { color: "#FFFFFF" },
  toggleContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  toggleCard: {
    width: "48%",
    borderRadius: 14,
    overflow: "hidden",
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  toggleRow: {
    padding: 13,
    minHeight: 100,
    justifyContent: "space-between",
    backgroundColor: CHIP_DARK,
    borderRadius: 12,
  },
  toggleLabel: {
    fontSize: 10,
    color: "#fff",
    fontWeight: "700",
    lineHeight: 20,
  },
  masterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  timePickerButtonFlex: {
    flex: 1,
    height: 40,
    backgroundColor: CHIP_DARK,
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  masterGuardsInputFlex: {
    flex: 1,
    height: 40,
    backgroundColor: CHIP_DARK,
    borderRadius: 6,
    color: "#FFF",
    paddingHorizontal: 10,
  },
  checkboxRow: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxBox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: TEXT_MUTED,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxChecked: {
    backgroundColor: ACCENT_TEAL,
    borderColor: ACCENT_TEAL,
  },
});
