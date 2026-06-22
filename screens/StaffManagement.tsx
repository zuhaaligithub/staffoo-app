import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  ScrollView,
  Keyboard,
  Platform,
  KeyboardAvoidingView,
  Image,
  Linking,
  Dimensions,
} from "react-native";
import {
  MapPin,
  Pencil,
  Trash2,
  User,
  Phone,
  ChevronDown,
  Check,
  ChevronLeft,
  ChevronRight,
  FileText,
  CloudUpload,
  X,
  Eye,
  Lock,
  PlusCircle,
  ExternalLink,
  Calendar as CalendarIcon,
  Mail,
} from "lucide-react-native";
import LinearGradient from "react-native-linear-gradient";
import Toast, { BaseToast, ErrorToast } from "react-native-toast-message";
import { launchImageLibrary } from "react-native-image-picker";
import axios from "./axiosInterceptor";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { uploadFile } from "../services/authApi";

const { width } = Dimensions.get("window");

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
};

const BASE_URL = "https://apis.staffoo.com.au/api";
const GOOGLE_API_KEY = "AIzaSyCS-DB39Kk-Z25C5GWymVGshXIALbjXPGY";
const FILE_BASE_URL = "https://apis.staffoo.com.au/staff_documents/";
const Api_Url = "https://apis.thescouts.com.au/api";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const DOC_NO_MAX = 20;
const ALLOWED_FILE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/jpg",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
// Fetch country list dynamically instead of a large static list
const [countries, setCountries] = useState<
  Array<{ name: string; code: string }>
>([]);
const [countriesLoading, setCountriesLoading] = useState(false);

useEffect(() => {
  let mounted = true;
  const fetchCountries = async () => {
    try {
      setCountriesLoading(true);
      const res = await fetch(
        "https://restcountries.com/v3.1/all?fields=name,cca3,cca2",
      );
      const json = await res.json();
      const list = (json || [])
        .map((c: any) => ({
          name: c.name?.common || "",
          code: c.cca3 || c.cca2 || "",
        }))
        .filter((c: any) => c.name && c.code)
        .sort((a: any, b: any) => a.name.localeCompare(b.name));
      if (mounted) setCountries(list);
    } catch (err) {
      console.warn("Failed to load countries", err);
    } finally {
      if (mounted) setCountriesLoading(false);
    }
  };
  fetchCountries();
  return () => {
    mounted = false;
  };
}, []);

// STRICT: ONLY these exact document names will show the verify button
const VERIFIABLE_DOCUMENT_NAMES = [
  "visa",
  "security license",
  "security licence",
];

// ─── ALLOWED DOCUMENT TYPES — only these appear in the documents tab ──────────
const ALLOWED_DOC_NAMES: string[] = [
  "passport",
  "visa",
  "driver license front",
  "driver license back",
  "driver licence front",
  "driver licence back",
  "security license",
  "security licence",
  "working with children",
  "working with children check",
  "wwcc",
  "employment application form",
  "application form",
  "tfn declaration",
  "superannuation form",
  "first aid",
  "first aid certificate",
  "cpr",
  "cpr certificate",
  "vaccination",
  "vaccination certificate",
  "citizen ship",
  "medicare",
  "birth certificate",
  "white card",
  "police check",
];

// ─── Residential status → snake_case map ─────────────────────────────────────
const RESIDENTIAL_STATUS_MAP: Record<string, string> = {
  "Student Visa": "student_visa",
  "Bridging Visa": "bridging_visa",
  Citizen: "citizen",
  "Permanent Residence": "permanent_residence",
  "Visa Subclass 485": "visa_subclass_485",
  Other: "other",
};

// Reverse map: snake_case → display label
const RESIDENTIAL_STATUS_REVERSE: Record<string, string> = Object.fromEntries(
  Object.entries(RESIDENTIAL_STATUS_MAP).map(([k, v]) => [v, k]),
);

// ─── Display name map ─────────────────────────────────────────────────────────
const DOCUMENT_DISPLAY_NAME: Record<string, string> = {
  passport: "Passport",
  visa: "Visa",
  "driver license front": "Driver Licence (Front)",
  "driver license back": "Driver Licence (Back)",
  "driver licence front": "Driver Licence (Front)",
  "driver licence back": "Driver Licence (Back)",
  "security license": "Security Licence",
  "security licence": "Security Licence",
  "working with children": "Working With Children Check (WWCC)",
  "working with children check": "Working With Children Check (WWCC)",
  wwcc: "Working With Children Check (WWCC)",
  "employment application form": "Employment Application Form",
  "application form": "Employment Application Form",
  "tfn declaration": "TFN Declaration",
  "superannuation form": "Superannuation Form",
  "first aid": "First Aid Certificate",
  "first aid certificate": "First Aid Certificate",
  cpr: "CPR Certificate",
  "cpr certificate": "CPR Certificate",
  vaccination: "Vaccination Certificate",
  "vaccination certificate": "Vaccination Certificate",
  "citizen ship": "Citizen Ship",
  medicare: "Medicare",
  "birth certificate": "Birth Certificate",
  "white card": "White Card",
  "police check": "Police Check",
};

const getDisplayName = (docName?: string): string => {
  if (!docName) return "Unknown Document";
  let key = docName.toLowerCase().trim();
  key = key.replace(/check \(wwcc\)/i, "working with children");
  key = key.replace(/certificate/i, "").trim();
  key = key.replace(/\s+/g, " ");
  return DOCUMENT_DISPLAY_NAME[key] || docName;
};

// ─── Helper: check if a document name is in the allowed list ─────────────────
const isAllowedDocument = (docName?: string): boolean => {
  if (!docName) return false;
  const key = docName
    .toLowerCase()
    .replace(/[\s_]+/g, " ")
    .trim();
  return ALLOWED_DOC_NAMES.some((allowed) => {
    const a = allowed.replace(/[\s_]+/g, " ").trim();
    return key === a || key.includes(a) || a.includes(key);
  });
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface StaffMember {
  id: string;
  name: string;
  email: string;
  phone: string;
  location: string;
  status: "Pending" | "Active";
}

interface StaffDocument {
  id: number;
  user_id: number;
  document_category: string;
  document_name: string;
  document_type?: string;
  document_no?: string;
  document_expiry?: string;
  file?: string;
  exp?: boolean;
  no?: boolean;
}

interface AddStaffForm {
  name: string;
  email: string;
  password: string;
  phone: string;
  security_license_no: string;
  gender: string;
  residential_status: string;
  address: string;
  date_of_birth?: string; // DD/MM/YYYY for payload
  origin_country?: string;
  city?: string;
  state?: string;
  country?: string;
  coordinates?: string;
}

interface EditStaffForm {
  name: string;
  email: string;
  phone: string;
  security_license_no: string;
  gender: string;
  residential_status: string;
  address: string;
  password?: string;
  date_of_birth?: string; // DD/MM/YYYY for payload
  origin_country?: string;
  city?: string;
  state?: string;
  country?: string;
  coordinates?: string;
}

const EMPTY_ADD_FORM: AddStaffForm = {
  name: "",
  email: "",
  password: "",
  phone: "",
  security_license_no: "",
  gender: "",
  residential_status: "",
  address: "",
  date_of_birth: undefined,
  origin_country: undefined,
  city: undefined,
  state: undefined,
  country: undefined,
  coordinates: undefined,
};

const EMPTY_EDIT_FORM: EditStaffForm = {
  name: "",
  email: "",
  phone: "",
  security_license_no: "",
  gender: "",
  residential_status: "",
  address: "",
  password: undefined,
  date_of_birth: undefined,
  origin_country: undefined,
  city: undefined,
  state: undefined,
  country: undefined,
  coordinates: undefined,
};

const residentialOptions = [
  "Student Visa",
  "Bridging Visa",
  "Citizen",
  "Permanent Residence",
  "Visa Subclass 485",
  "Other",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const isImageFile = (
  fileStr?: string | null,
  mimeType?: string | null,
): boolean => {
  if (!fileStr && !mimeType) return false;
  if (mimeType && mimeType.startsWith("image/")) return true;
  if (!fileStr) return false;
  return /\.(jpg|jpeg|png|gif|webp)$/i.test(fileStr);
};

const getFileUrl = (file?: string | null): string | null => {
  if (!file) return null;
  if (file.startsWith("http") || file.startsWith("file://")) return file;
  return `${FILE_BASE_URL}${file}`;
};

const getExpiryStatus = (
  expiryStr?: string,
): "expired" | "expiring_soon" | "ok" | "none" => {
  if (!expiryStr) return "none";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryStr);
  expiry.setHours(0, 0, 0, 0);
  const diff = Math.ceil((expiry.getTime() - today.getTime()) / 86400000);
  if (diff < 0) return "expired";
  if (diff <= 30) return "expiring_soon";
  return "ok";
};

// Formats date strings (YYYY-MM-DD or DD/MM/YYYY) or Date objects into Australian format (DD/MM/YYYY)
const formatAUDate = (dateSource?: string | Date | null): string => {
  if (!dateSource) return "—";

  if (dateSource instanceof Date) {
    const day = String(dateSource.getDate()).padStart(2, "0");
    const month = String(dateSource.getMonth() + 1).padStart(2, "0");
    const year = dateSource.getFullYear();
    return `${day}/${month}/${year}`;
  }

  // Already DD/MM/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateSource)) return dateSource;

  const [year, month, day] = dateSource.split("-");
  if (!year || !month || !day) return dateSource;
  return `${day}/${month}/${year}`;
};

// Parses an expiry date that may come back as DD/MM/YYYY or YYYY-MM-DD
const parseApiExpiryDate = (value: string): Date | null => {
  if (!value) return null;

  // DD/MM/YYYY
  const ddmmyyyy = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (ddmmyyyy) {
    const [, dd, mm, yyyy] = ddmmyyyy;
    const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
    return isNaN(d.getTime()) ? null : d;
  }

  // YYYY-MM-DD
  const yyyymmdd = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (yyyymmdd) {
    const [, yyyy, mm, dd] = yyyymmdd;
    const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
    return isNaN(d.getTime()) ? null : d;
  }

  // Fallback
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
};

// STRICT CHECK: ONLY returns true for documents named "Visa" or "Security License"
const isVerifiableDocType = (opts: {
  label?: string | null;
  value?: string | null;
  category?: string | null;
}): boolean => {
  const docName = (opts.label || opts.value || "").toLowerCase().trim();
  const result = VERIFIABLE_DOCUMENT_NAMES.some(
    (keyword) => docName === keyword || docName.includes(keyword),
  );
  return result;
};

// ─── Google Places: extract address components ────────────────────────────────
const extractAddressComponents = (
  components: any[],
): {
  city: string;
  state: string;
  country: string;
  countryCode: string;
} => {
  let city = "";
  let state = "";
  let country = "";
  let countryCode = "";

  components.forEach((component: any) => {
    const types: string[] = component.types || [];
    if (
      types.includes("locality") ||
      types.includes("postal_town") ||
      types.includes("sublocality_level_1")
    ) {
      if (!city) city = component.long_name;
    }
    if (types.includes("administrative_area_level_1")) {
      state = component.short_name.toLowerCase();
    }
    if (types.includes("country")) {
      country = component.long_name;
      countryCode = component.short_name; // e.g. "AU", "NZ"
    }
  });

  return { city, state, country, countryCode };
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const LazyImage = ({ uri, style }: { uri: string; style: any }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 10000);
    return () => clearTimeout(t);
  }, []);
  if (error) return null;
  return (
    <View style={[style, { justifyContent: "center", alignItems: "center" }]}>
      <Image
        source={{ uri, cache: "force-cache" }}
        style={[style, { position: "absolute", top: 0, left: 0 }]}
        resizeMode="cover"
        onLoadStart={() => {
          setLoading(true);
          setError(false);
        }}
        onLoad={() => setLoading(false)}
        onError={() => {
          setLoading(false);
          setError(true);
        }}
      />
      {loading && <ActivityIndicator color={COLORS.primary} size="small" />}
    </View>
  );
};

const ExpiryBadge = ({
  status,
}: {
  status: "expired" | "expiring_soon" | "ok" | "none";
}) => {
  if (status === "none" || status === "ok") return null;
  const isExpired = status === "expired";
  return (
    <View
      style={[
        docStyles.badge,
        isExpired ? docStyles.badgeExpired : docStyles.badgeExpiringSoon,
      ]}
    >
      <Text
        style={[
          docStyles.badgeText,
          isExpired
            ? docStyles.badgeTextExpired
            : docStyles.badgeTextExpiringSoon,
        ]}
      >
        {isExpired ? "Expired" : "Expiring Soon"}
      </Text>
    </View>
  );
};

const FormField = ({
  placeholder,
  value,
  onChangeText,
  secureTextEntry = false,
}: {
  placeholder: string;
  value: string;
  onChangeText: (t: string) => void;
  secureTextEntry?: boolean;
}) => (
  <TextInput
    style={styles.input}
    placeholder={placeholder}
    placeholderTextColor={COLORS.textMuted}
    value={value}
    onChangeText={onChangeText}
    secureTextEntry={secureTextEntry}
    autoCorrect={false}
    autoCapitalize="none"
    blurOnSubmit={false}
  />
);

type Props = { navigation: any };

export default function StaffManagement({ navigation }: Props) {
  // Add these states
  const [countrySearch, setCountrySearch] = useState("");

  // ── Staff list ────────────────────────────────────────────────────────────
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [rawStaff, setRawStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [residentialStatusSaved, setResidentialStatusSaved] = useState(false);

  // ── Add modal ─────────────────────────────────────────────────────────────
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState<AddStaffForm>(EMPTY_ADD_FORM);
  const [addLoading, setAddLoading] = useState(false);
  const [addPredictions, setAddPredictions] = useState<any[]>([]);
  const [showAddSuggestions, setShowAddSuggestions] = useState(false);
  const [showAddResidentialDropdown, setShowAddResidentialDropdown] =
    useState(false);
  const [addErrors, setAddErrors] = useState<any>({});

  // ── Edit modal ────────────────────────────────────────────────────────────
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState<EditStaffForm>(EMPTY_EDIT_FORM);
  const [editErrors, setEditErrors] = useState<any>({});
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editPredictions, setEditPredictions] = useState<any[]>([]);
  const [showEditSuggestions, setShowEditSuggestions] = useState(false);
  const [showEditResidentialDropdown, setShowEditResidentialDropdown] =
    useState(false);
  const [activeModalTab, setActiveModalTab] = useState<
    "personal" | "documents" | "onboarding"
  >("personal");

  // ── Documents tab ─────────────────────────────────────────────────────────
  const [staffDocuments, setStaffDocuments] = useState<StaffDocument[]>([]);
  const [currentStaffUserId, setCurrentStaffUserId] = useState<number | null>(
    null,
  );

  // ── DOB Calendar (Add) ────────────────────────────────────────────────────
  const [showAddDobCalendar, setShowAddDobCalendar] = useState(false);
  const [addDobCalendarMonth, setAddDobCalendarMonth] = useState(
    new Date(2000, 0, 1),
  );
  const [addDobSelected, setAddDobSelected] = useState<Date | null>(null);

  // ── DOB Calendar (Edit) ───────────────────────────────────────────────────
  const [showEditDobCalendar, setShowEditDobCalendar] = useState(false);
  const [editDobCalendarMonth, setEditDobCalendarMonth] = useState(
    new Date(2000, 0, 1),
  );
  const [editDobSelected, setEditDobSelected] = useState<Date | null>(null);

  // ── Document upload modal ─────────────────────────────────────────────────
  const [docModalVisible, setDocModalVisible] = useState(false);
  const [selectedDocType, setSelectedDocType] = useState<{
    label: string;
    value: string;
    category: string;
  } | null>(null);
  const [documentNumber, setDocumentNumber] = useState("");
  const [expirationDate, setExpirationDate] = useState<Date | null>(null);
  const [showInlineCalendar, setShowInlineCalendar] = useState(false);
  const [currentCalendarMonth, setCurrentCalendarMonth] = useState(new Date());
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [uploadedFilePath, setUploadedFilePath] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fileError, setFileError] = useState("");
  const [docNumberError, setDocNumberError] = useState("");
  const [expiryError, setExpiryError] = useState("");
  // ── Country Dropdown States ───────────────────────────────────────────────
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [showEditCountryDropdown, setShowEditCountryDropdown] = useState(false);
  // ── Online verification (Visa / Security License) ─────────────────────────
  const [verifying, setVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(false);

  const needsVerification = selectedDocType
    ? isVerifiableDocType(selectedDocType)
    : false;

  const isExpiryLocked = needsVerification;

  useEffect(() => {
    getStaff();
  }, []);

  // ─── Auth helpers ─────────────────────────────────────────────────────────

  const getAuthHeaders = async () => {
    const token = await AsyncStorage.getItem("@auth_token");
    return { Authorization: `Bearer ${token}` };
  };

  const getMyUserId = async (): Promise<number | null> => {
    const userData = await AsyncStorage.getItem("user");
    if (!userData) return null;
    return JSON.parse(userData).id;
  };

  // ─── Staff CRUD ───────────────────────────────────────────────────────────

  const getStaff = async () => {
    try {
      setLoading(true);
      const userId = await getMyUserId();
      if (!userId) return;
      const headers = await getAuthHeaders();
      const response = await axios.get(
        `${BASE_URL}/get-contractor-staff/${userId}`,
        { headers },
      );
      const apiData = response.data?.guards || [];
      setRawStaff(apiData);
      setStaff(
        apiData.map((item: any) => ({
          id: item.id.toString(),
          name: item.name || "N/A",
          email: item.email || "N/A",
          phone: item.staff?.phone || item.phone || "N/A",
          location: item.address || "N/A",
          status: item.is_active ? "Active" : "Pending",
        })),
      );
    } catch (e: any) {
      console.log("getStaff error:", e?.response?.data || e.message);
    } finally {
      setLoading(false);
    }
  };

  const capitalizeWords = (text = "") =>
    text
      .split(" ")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ");

  const normalizeGender = (g?: string) =>
    g ? g.charAt(0).toUpperCase() + g.slice(1).toLowerCase() : "";

  // ─── Address autocomplete ─────────────────────────────────────────────────

  const fetchPlaces = async (text: string, isAdd: boolean) => {
    if (text.length < 3) {
      isAdd
        ? (setAddPredictions([]), setShowAddSuggestions(false))
        : (setEditPredictions([]), setShowEditSuggestions(false));
      return;
    }
    try {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
          text,
        )}&key=${GOOGLE_API_KEY}`,
      );
      const json = await res.json();
      isAdd
        ? (setAddPredictions(json.predictions || []),
          setShowAddSuggestions(true))
        : (setEditPredictions(json.predictions || []),
          setShowEditSuggestions(true));
    } catch {}
  };

  // ─── Select place + auto-fill country, city, state, coordinates ──────────

  const selectPlace = async (
    description: string,
    placeId: string,
    isAdd: boolean,
  ) => {
    Keyboard.dismiss();

    // Update address immediately
    if (isAdd) {
      setAddForm((p) => ({ ...p, address: description }));
      setShowAddSuggestions(false);
      setAddPredictions([]);
    } else {
      setEditForm((p) => ({ ...p, address: description }));
      setShowEditSuggestions(false);
      setEditPredictions([]);
    }

    // Fetch place details for components + coordinates
    try {
      const detailRes = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=address_components,geometry&key=${GOOGLE_API_KEY}`,
      );
      const detailJson = await detailRes.json();
      const result = detailJson?.result;
      if (!result) return;

      const { city, state, country, countryCode } = extractAddressComponents(
        result.address_components || [],
      );

      const lat = result.geometry?.location?.lat;
      const lng = result.geometry?.location?.lng;
      const coordinates = lat && lng ? `${lat},${lng}` : undefined;

      if (isAdd) {
        setAddForm((p) => ({
          ...p,
          city: city || p.city,
          state: state || p.state,
          country: country || p.country,
          // origin_country: countryCode || p.origin_country,
          coordinates: coordinates || p.coordinates,
        }));
      } else {
        setEditForm((p) => ({
          ...p,
          city: city || p.city,
          state: state || p.state,
          country: country || p.country,
          origin_country: countryCode || p.origin_country,
          coordinates: coordinates || p.coordinates,
        }));
      }
    } catch (err) {
      console.log("Place details error:", err);
    }
  };

  // ─── DOB Calendar helpers ─────────────────────────────────────────────────

  const buildDobCalendarGrid = (month: Date): (Date | null)[] => {
    const year = month.getFullYear();
    const mo = month.getMonth();
    const firstDay = new Date(year, mo, 1).getDay();
    const daysInMonth = new Date(year, mo + 1, 0).getDate();
    const cells: (Date | null)[] = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, mo, d));
    return cells;
  };

  const changeDobMonth = (dir: "prev" | "next", isAdd: boolean) => {
    if (isAdd) {
      setAddDobCalendarMonth((prev) => {
        const n = new Date(prev);
        n.setMonth(prev.getMonth() + (dir === "next" ? 1 : -1));
        return n;
      });
    } else {
      setEditDobCalendarMonth((prev) => {
        const n = new Date(prev);
        n.setMonth(prev.getMonth() + (dir === "next" ? 1 : -1));
        return n;
      });
    }
  };

  // ─── Validation ───────────────────────────────────────────────────────────

  const ausPhoneRegex = /^(?:\+?61|0)[2-478](?:[ -]?[0-9]){8}$/;

  const validateAdd = () => {
    const e: any = {};

    if (!addForm.name.trim()) e.name = "Full name is required";
    if (!addForm.email.trim()) e.email = "Email is required";
    else if (!/^\S+@\S+\.\S+$/.test(addForm.email)) e.email = "Invalid email";

    if (!addForm.password.trim()) e.password = "Password is required";
    else if (addForm.password.length < 8) e.password = "Min 8 characters";

    if (!addForm.phone.trim()) e.phone = "Phone is required";
    else if (!ausPhoneRegex.test(addForm.phone.replace(/[\s()+-]/g, "")))
      e.phone = "Must be a valid Australian phone number";

    if (!addForm.address.trim()) e.address = "Address is required";

    // NEW: Mandatory fields
    if (!addForm.date_of_birth) e.date_of_birth = "Date of Birth is required";
    if (!addForm.origin_country?.trim())
      e.origin_country = "Country of Origin is required";

    setAddErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateEdit = () => {
    const e: any = {};

    if (!editForm.name.trim()) e.name = "Full name is required";
    if (!editForm.email.trim()) e.email = "Email is required";
    else if (!/^\S+@\S+\.\S+$/.test(editForm.email)) e.email = "Invalid email";

    if (!editForm.phone.trim()) e.phone = "Phone is required";
    else if (!ausPhoneRegex.test(editForm.phone.replace(/[\s()+-]/g, "")))
      e.phone = "Must be a valid Australian phone number";

    if (!editForm.address.trim()) e.address = "Address is required";

    // NEW: Mandatory fields
    if (!editForm.date_of_birth) e.date_of_birth = "Date of Birth is required";
    if (!editForm.origin_country?.trim())
      e.origin_country = "Country of Origin is required";

    setEditErrors(e);
    return Object.keys(e).length === 0;
  };

  // ─── Add staff ────────────────────────────────────────────────────────────
  const addStaff = async () => {
    if (!validateAdd()) return;

    try {
      setAddLoading(true);
      const headers = await getAuthHeaders();
      const userId = await getMyUserId();

      const payload: any = {
        name: addForm.name,
        email: addForm.email,
        password: addForm.password,
        phone: addForm.phone,
        gender: addForm.gender,
        address: addForm.address,
        user_id: userId,
      };

      if (addForm.residential_status) {
        payload.staff_document_type =
          RESIDENTIAL_STATUS_MAP[addForm.residential_status] ||
          addForm.residential_status.toLowerCase().replace(/\s+/g, "_");
      }

      if (addForm.date_of_birth) {
        payload.date_of_birth = addForm.date_of_birth;
      }

      if (addForm.origin_country)
        payload.origin_country = addForm.origin_country;
      if (addForm.city) payload.city = addForm.city;
      if (addForm.state) payload.state = addForm.state;
      if (addForm.country) payload.country = addForm.country;
      if (addForm.coordinates) payload.coordinates = addForm.coordinates;

      console.log("🚀 Payload:", JSON.stringify(payload, null, 2));

      await axios.post(`${BASE_URL}/admin/create-staff`, payload, { headers });

      Toast.show({
        type: "success",
        text1: "Staff Added Successfully",
        position: "bottom",
      });

      setShowAddModal(false);
      setAddForm(EMPTY_ADD_FORM);
      setAddDobSelected(null);
      setAddErrors({});
      getStaff();
    } catch (e: any) {
      console.log("API ERROR:", e?.response?.data);

      const errorData = e?.response?.data;
      const newErrors: any = {};

      if (errorData?.errors?.email) {
        newErrors.email = errorData.errors.email[0] || "Email already taken";
      } else if (errorData?.message) {
        newErrors.email = errorData.message; // fallback
      } else {
        newErrors.email = "Failed to add staff. Please try again.";
      }

      setAddErrors(newErrors);

      Toast.show({
        type: "error",
        text1: "Validation Error",
        text2: newErrors.email,
        position: "top",
      });
    } finally {
      setAddLoading(false);
    }
  };

  // ─── Open edit modal ──────────────────────────────────────────────────────

  const openEditModal = (item: StaffMember) => {
    const raw = rawStaff.find((g) => g.id.toString() === item.id);
    if (!raw) return;

    // residential_status: API may return snake_case, convert back to display label
    const rawResidential =
      raw.staff?.staff_document_type || raw.staff_document_type || "";
    const residentialDisplay =
      RESIDENTIAL_STATUS_REVERSE[rawResidential] || rawResidential;

    // DOB handling
    const rawDob = raw.staff?.date_of_birth || raw.staff?.dob || raw.dob || "";
    let dobDisplay = "";
    let dobDate: Date | null = null;

    if (rawDob) {
      dobDate = parseApiExpiryDate(rawDob);
      dobDisplay = dobDate ? formatAUDate(dobDate) : "";
    }

    setEditingStaffId(item.id);
    setCurrentStaffUserId(raw.id);
    setEditDobSelected(dobDate);

    // Set calendar to selected DOB if exists, otherwise current month
    if (dobDate) {
      setEditDobCalendarMonth(dobDate);
    } else {
      setEditDobCalendarMonth(new Date()); // Current month/year
    }

    setEditForm({
      name: raw.name || "",
      email: raw.email || "",
      phone: raw.staff?.phone || raw.phone || "",
      security_license_no: raw.staff?.security_license_no || "",
      gender: normalizeGender(raw.staff?.gender || raw.gender),
      residential_status: residentialDisplay,
      address: raw.address || "",
      password: undefined,
      date_of_birth: dobDisplay || undefined,

      origin_country:
        raw.staff?.origin_country || raw.origin_country || raw.country || "",
      city: raw.city || "",
      state: raw.state || "",
      country: raw.country || "",
      coordinates: raw.coordinates || raw.current_coordinates || "",
    });

    setStaffDocuments(raw.documents || []);
    setResidentialStatusSaved(!!rawResidential);
    setActiveModalTab("personal");
    setEditErrors({});
    setShowEditModal(true);
  };

  const updateStaff = async () => {
    if (!editingStaffId || !validateEdit()) return;

    try {
      setEditLoading(true);
      const headers = await getAuthHeaders();
      const userId = await getMyUserId();

      const payload: any = {
        name: editForm.name,
        email: editForm.email,
        phone: editForm.phone,
        security_license_no: editForm.security_license_no,
        gender: editForm.gender,
        address: editForm.address,
        user_id: userId,
      };

      // ─── Add Conditional Fields ─────────────────────────────────────
      if (editForm.residential_status) {
        payload.staff_document_type =
          RESIDENTIAL_STATUS_MAP[editForm.residential_status] ||
          editForm.residential_status.toLowerCase().replace(/\s+/g, "_");
      }

      if (editForm.date_of_birth) {
        payload.date_of_birth = editForm.date_of_birth;
      }

      if (editForm.origin_country) {
        payload.origin_country = editForm.origin_country;
      }
      if (editForm.city) {
        payload.city = editForm.city;
      }
      if (editForm.state) {
        payload.state = editForm.state;
      }
      if (editForm.country) {
        payload.country = editForm.country;
      }
      if (editForm.coordinates) {
        payload.coordinates = editForm.coordinates;
      }

      if (editForm.password?.trim()) {
        payload.password = editForm.password;
      }

      // ─── Log AFTER all fields are added ─────────────────────────────
      console.log("====================================");
      console.log("UPDATE STAFF PAYLOAD (FINAL)");
      console.log(JSON.stringify(payload, null, 2));
      console.log("====================================");

      await axios.put(
        `${BASE_URL}/admin/update-staff/${editingStaffId}`,
        payload,
        { headers },
      );

      console.log("✅ Staff updated successfully");

      // Refresh data
      const refreshResponse = await axios.get(
        `${BASE_URL}/get-contractor-staff/${userId}`,
        { headers },
      );

      const apiData = refreshResponse.data?.guards || [];
      setRawStaff(apiData);

      const thisStaff = apiData.find((g: any) => g.id === currentStaffUserId);
      if (thisStaff) {
        setStaffDocuments(thisStaff.documents || []);
      }

      setResidentialStatusSaved(true);
      setEditErrors({});

      Alert.alert("Success", "Staff updated successfully.", [
        { text: "OK", onPress: () => setShowEditModal(false) },
        {
          text: "Go to Documents",
          onPress: () => setActiveModalTab("documents"),
        },
      ]);
    } catch (e: any) {
      console.log("❌ Update staff error:", e?.response?.data || e.message);
      Alert.alert(
        "Error",
        e?.response?.data?.message || "Failed to update staff.",
      );
    } finally {
      setEditLoading(false);
    }
  };
  // ─── Delete staff ─────────────────────────────────────────────────────────

  const deleteStaff = (id: string, name: string) => {
    Alert.alert("Delete Staff", `Delete "${name}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            const headers = await getAuthHeaders();
            await axios.delete(`${BASE_URL}/admin/staff-delete/${id}`, {
              headers,
            });
            getStaff();
          } catch {
            Alert.alert("Error", "Failed to delete staff.");
          }
        },
      },
    ]);
  };

  // ─── Dynamic Document Definitions & Merged List ───────────────────────────

  // Replace the current DYNAMIC_DOC_TYPES with this:
  const DYNAMIC_DOC_TYPES = useMemo(() => {
    const typesMap = new Map<
      string,
      { label: string; value: string; category: string }
    >();

    // Only use documents from the CURRENT staff
    if (Array.isArray(staffDocuments)) {
      staffDocuments.forEach((doc: any) => {
        const docName = doc.document_name || "";
        const normalizedKey = docName.toLowerCase().replace(/[\s_]+/g, "");

        if (
          docName &&
          !typesMap.has(normalizedKey) &&
          isAllowedDocument(docName)
        ) {
          typesMap.set(normalizedKey, {
            label: docName,
            value: docName,
            category: doc.document_category || "contractor_staff",
          });
        }
      });
    }

    return Array.from(typesMap.values());
  }, [staffDocuments]); // ← changed dependency

  const mergedDocList = useMemo((): Array<
    StaffDocument & {
      _reqDef?: { label: string; value: string; category: string };
    }
  > => {
    // Only include documents that are in the allowed list
    const filteredDocs = staffDocuments.filter((doc) =>
      isAllowedDocument(doc.document_name || doc.document_type),
    );

    const result: Array<
      StaffDocument & {
        _reqDef?: { label: string; value: string; category: string };
      }
    > = filteredDocs.map((doc) => {
      const reqDef = DYNAMIC_DOC_TYPES.find((r) => {
        const rVal = r.value.toLowerCase().replace(/[\s_]+/g, "");
        const dName = (doc.document_name || "")
          .toLowerCase()
          .replace(/[\s_]+/g, "");
        const dType = (doc.document_type || "")
          .toLowerCase()
          .replace(/[\s_]+/g, "");
        return dName === rVal || dType === rVal;
      });
      return { ...doc, _reqDef: reqDef };
    });

    DYNAMIC_DOC_TYPES.forEach((req) => {
      const alreadyPresent = filteredDocs.some((d) => {
        const rVal = req.value.toLowerCase().replace(/[\s_]+/g, "");
        const dName = (d.document_name || "")
          .toLowerCase()
          .replace(/[\s_]+/g, "");
        const dType = (d.document_type || "")
          .toLowerCase()
          .replace(/[\s_]+/g, "");
        return dName === rVal || dType === rVal;
      });

      if (!alreadyPresent) {
        result.push({
          id: -1,
          user_id: currentStaffUserId || 0,
          document_category: req.category,
          document_name: req.value,
          document_type: req.value.toLowerCase().replace(/\s+/g, "_"),
          _reqDef: req,
        } as StaffDocument & {
          _reqDef: { label: string; value: string; category: string };
        });
      }
    });

    return result;
  }, [staffDocuments, DYNAMIC_DOC_TYPES, currentStaffUserId]);

  const openFile = async (file?: string | null) => {
    const url = getFileUrl(file);
    if (!url) return;
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) await Linking.openURL(url);
      else
        Toast.show({
          type: "error",
          text1: "Cannot open file",
          position: "bottom",
        });
    } catch {
      Toast.show({
        type: "error",
        text1: "Failed to open file",
        position: "bottom",
      });
    }
  };

  // ─── Document upload modal ────────────────────────────────────────────────

  const resetDocForm = () => {
    setSelectedFile(null);
    setUploadedFilePath(null);
    setDocumentNumber("");
    setExpirationDate(null);
    setShowInlineCalendar(false);
    setCurrentCalendarMonth(new Date());
    setFileError("");
    setDocNumberError("");
    setExpiryError("");
    setVerifying(false);
    setIsVerified(false);
  };

  const openDocModal = (
    docType: { label: string; value: string; category: string },
    existingDoc?: StaffDocument,
  ) => {
    resetDocForm();
    setSelectedDocType(docType);

    const isVerifiable = isVerifiableDocType(docType);

    if (existingDoc && existingDoc.id !== -1) {
      setDocumentNumber(existingDoc.document_no || "");

      if (existingDoc.document_expiry) {
        const parsed = parseApiExpiryDate(existingDoc.document_expiry);
        if (parsed) {
          setExpirationDate(parsed);
          setCurrentCalendarMonth(parsed);
        }
      }

      if (existingDoc.file) setUploadedFilePath(existingDoc.file);

      if (isVerifiable) {
        setIsVerified(
          !!(existingDoc.document_no && existingDoc.document_expiry),
        );
      } else {
        setIsVerified(true);
      }
    } else {
      if (isVerifiable) {
        setIsVerified(false);
        setExpirationDate(null);
      } else {
        setIsVerified(true);
      }
    }

    setDocModalVisible(true);
  };

  const handleUpload = async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: "mixed",
        quality: 0.8,
        selectionLimit: 1,
      });
      if (result.didCancel || !result.assets?.[0]) return;
      const asset = result.assets[0];
      if (!asset.type || !ALLOWED_FILE_TYPES.includes(asset.type)) {
        Toast.show({
          type: "error",
          text1: "Unsupported file type",
          position: "bottom",
        });
        return;
      }
      if (asset.fileSize && asset.fileSize > MAX_FILE_SIZE) {
        Toast.show({
          type: "error",
          text1: "File too large (max 5MB)",
          position: "bottom",
        });
        return;
      }
      const file = {
        uri: asset.uri!,
        type: asset.type || "image/jpeg",
        name: asset.fileName || `file_${Date.now()}`,
      };
      setSelectedFile(file);
      setFileError("");
      setUploading(true);
      const uploaded = await uploadFile(file);
      const filePath = uploaded?.url || uploaded?.path || uploaded?.file || "";
      setUploadedFilePath(filePath);
      Toast.show({
        type: "success",
        text1: "File uploaded",
        position: "bottom",
      });
    } catch {
      Toast.show({ type: "error", text1: "Upload failed", position: "bottom" });
    } finally {
      setUploading(false);
    }
  };

  // ─── Online document verification ────────────────────────────────────────

  const handleVerifyDocument = async () => {
    if (!selectedDocType) {
      Toast.show({
        type: "error",
        text1: "Please select document type",
        position: "bottom",
      });
      return;
    }

    if (!documentNumber.trim()) {
      setDocNumberError("Please enter document number");
      Toast.show({
        type: "error",
        text1: "Please enter document number",
        position: "bottom",
      });
      return;
    }

    try {
      setVerifying(true);
      setExpiryError("");
      const token = await AsyncStorage.getItem("@auth_token");

      const docNameLower = (
        selectedDocType.label ||
        selectedDocType.value ||
        ""
      )
        .toLowerCase()
        .trim();
      const isVisa = docNameLower.includes("visa");

      let response;

      if (isVisa) {
        const payload = { passport: documentNumber.trim() };
        response = await axios.post(`${BASE_URL}/admin/visa-check`, payload, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
      } else {
        const payload = {
          document_type: selectedDocType.label,
          license_number: documentNumber.trim(),
          user_id: Number(currentStaffUserId),
        };
        response = await axios.post(
          `${Api_Url}/documents-online-verification-staffoo`,
          payload,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          },
        );
      }

      const data = response?.data;

      if (data?.success === false) {
        setIsVerified(false);
        setExpirationDate(null);
        Toast.show({
          type: "error",
          text1: data?.message || "Document verification failed",
          position: "bottom",
        });
        return;
      }

      const expiryRaw =
        data?.expiry ||
        data?.expiry_date ||
        data?.document_expiry ||
        data?.data?.expiry ||
        data?.data?.expiry_date ||
        data?.data?.document_expiry;

      if (expiryRaw) {
        const dateObj = parseApiExpiryDate(expiryRaw);
        if (dateObj) {
          setExpirationDate(dateObj);
          setCurrentCalendarMonth(dateObj);
          setIsVerified(true);
          setShowInlineCalendar(false);
          Toast.show({
            type: "success",
            text1: data?.message || "Document verified successfully",
            position: "bottom",
          });
          return;
        }
      }

      setIsVerified(false);
      setExpirationDate(null);
      setExpiryError("Could not process expiration date from verification");
      Toast.show({
        type: "error",
        text1: "Verification failed to parse expiry date",
        position: "bottom",
      });
    } catch (error: any) {
      setIsVerified(false);
      setExpirationDate(null);
      Toast.show({
        type: "error",
        text1:
          error?.response?.data?.message ||
          error?.message ||
          "Document verification failed",
        position: "bottom",
      });
    } finally {
      setVerifying(false);
    }
  };

  const handleSaveDoc = async () => {
    let hasError = false;
    setFileError("");
    setDocNumberError("");
    setExpiryError("");

    if (!selectedFile && !uploadedFilePath) {
      setFileError("Please upload a file");
      hasError = true;
    }
    if (!documentNumber.trim()) {
      setDocNumberError("Please enter document number");
      hasError = true;
    }

    if (needsVerification) {
      if (!isVerified || !expirationDate) {
        Toast.show({
          type: "error",
          text1: "Please verify document first",
          position: "bottom",
        });
        return;
      }
    } else if (!expirationDate) {
      setExpiryError("Please select expiration date");
      hasError = true;
    }

    if (hasError) {
      Toast.show({
        type: "error",
        text1: "Please fill all mandatory fields",
        position: "bottom",
      });
      return;
    }

    setSaving(true);
    try {
      let fileName = "";
      if (uploadedFilePath)
        fileName = uploadedFilePath.split("/").pop() || uploadedFilePath;
      else if (selectedFile?.name) fileName = selectedFile.name;
      else fileName = "unknown_file";

      const y = expirationDate!.getFullYear();
      const m = String(expirationDate!.getMonth() + 1).padStart(2, "0");
      const d = String(expirationDate!.getDate()).padStart(2, "0");
      const expDate = `${y}-${m}-${d}`;

      const existingDoc = staffDocuments.find((doc) => {
        const n = (doc.document_name || "")
          .toLowerCase()
          .replace(/[\s_]+/g, "");
        const t = (doc.document_type || "")
          .toLowerCase()
          .replace(/[\s_]+/g, "");
        const v = selectedDocType!.value.toLowerCase().replace(/[\s_]+/g, "");
        return n === v || t === v;
      });

      const payload: any = {
        user_id: currentStaffUserId,
        document_no: documentNumber.trim(),
        document_expiry: expDate,
        file: fileName,
        document_category: selectedDocType!.category,
      };

      if (existingDoc) {
        payload.id = existingDoc.id;
        payload.document_name =
          existingDoc.document_name || selectedDocType!.value;
        payload.document_type =
          existingDoc.document_type ||
          selectedDocType!.value.toLowerCase().replace(/\s+/g, "_");
        payload.exp = existingDoc.exp ?? false;
        payload.no = existingDoc.no ?? false;
      } else {
        payload.document_name = selectedDocType!.value;
        payload.document_type = selectedDocType!.value
          .toLowerCase()
          .replace(/\s+/g, "_");
        payload.exp = false;
        payload.no = false;
      }

      const token = await AsyncStorage.getItem("@auth_token");
      await axios.post(`${BASE_URL}/guard-update-documents`, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      Toast.show({
        type: "success",
        text1: "Document saved successfully",
        position: "bottom",
      });
      setDocModalVisible(false);

      const userId = await getMyUserId();
      const headers = await getAuthHeaders();
      const response = await axios.get(
        `${BASE_URL}/get-contractor-staff/${userId}`,
        { headers },
      );
      const apiData = response.data?.guards || [];
      setRawStaff(apiData);
      const thisStaff = apiData.find((g: any) => g.id === currentStaffUserId);
      if (thisStaff) setStaffDocuments(thisStaff.documents || []);
    } catch (err) {
      console.error(err);
      Toast.show({ type: "error", text1: "Save failed", position: "bottom" });
    } finally {
      setSaving(false);
    }
  };

  const calendarGrid = useMemo(() => {
    const year = currentCalendarMonth.getFullYear();
    const month = currentCalendarMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: (Date | null)[] = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
    return cells;
  }, [currentCalendarMonth]);

  const changeMonth = (dir: "prev" | "next") => {
    setCurrentCalendarMonth((prev) => {
      const n = new Date(prev);
      n.setMonth(prev.getMonth() + (dir === "next" ? 1 : -1));
      return n;
    });
  };

  // ─── Render: modal file preview ───────────────────────────────────────────

  const renderModalPreview = () => {
    const fileUri =
      selectedFile?.uri ||
      (uploadedFilePath ? getFileUrl(uploadedFilePath) : null);
    const fileMime = selectedFile?.type || null;
    const fileName =
      selectedFile?.name || uploadedFilePath?.split("/").pop() || "Document";
    const isImg = isImageFile(fileUri, fileMime);
    if (!fileUri) return null;
    if (isImg) {
      return (
        <View style={docStyles.imagePlaceholder}>
          <LazyImage uri={fileUri} style={docStyles.previewImage} />
        </View>
      );
    }
    return (
      <View style={docStyles.docPreviewCard}>
        <View style={docStyles.docPreviewIconWrap}>
          <FileText size={48} color={COLORS.primary} />
        </View>
        <Text style={docStyles.docPreviewLabel} numberOfLines={2}>
          {fileName}
        </Text>
        <TouchableOpacity
          style={docStyles.viewDocButton}
          onPress={() => openFile(fileUri)}
        >
          <ExternalLink size={16} color="#fff" style={{ marginRight: 6 }} />
          <Text style={docStyles.viewDocButtonText}>OPEN DOCUMENT</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // ─── Render: filled document card ─────────────────────────────────────────

  const renderFilledCard = (
    item: StaffDocument,
    docTypeDef: { label: string; value: string; category: string },
  ) => {
    const status = getExpiryStatus(item.document_expiry);
    const isImg = isImageFile(item.file);
    const ext = item.file?.split(".").pop()?.toUpperCase() || "";
    return (
      <LinearGradient
        key={item.id}
        colors={["#1e2538", "#141929"]}
        style={docStyles.cardGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={docStyles.cardTopRow}>
          <View style={docStyles.docIconBox}>
            <FileText size={22} color={COLORS.primary} />
          </View>
          <View style={{ flex: 1, marginHorizontal: 12 }}>
            <Text style={docStyles.cardDocName} numberOfLines={1}>
              {getDisplayName(item.document_name)}
            </Text>
            <View style={docStyles.cardSubRow}>
              {!!ext && (
                <View style={docStyles.extBadge}>
                  <Text style={docStyles.extBadgeText}>{ext}</Text>
                </View>
              )}
              <ExpiryBadge status={status} />
            </View>
          </View>
          <TouchableOpacity
            style={docStyles.editDocBtn}
            onPress={() => openDocModal(docTypeDef, item)}
          >
            <Pencil size={15} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        <View style={docStyles.divider} />

        <View style={docStyles.infoRow}>
          <Text style={docStyles.infoLabel}>Document Number</Text>
          <Text style={docStyles.infoValue}>{item.document_no || "—"}</Text>
        </View>
        <View style={docStyles.infoRow}>
          <Text style={docStyles.infoLabel}>Expiration Date</Text>
          <Text
            style={[
              docStyles.infoValue,
              status === "expired" && { color: "#ff6b6b" },
              status === "expiring_soon" && { color: "#f0a500" },
            ]}
          >
            {formatAUDate(item.document_expiry)}
          </Text>
        </View>

        <TouchableOpacity
          style={docStyles.viewBtn}
          onPress={() => openFile(item.file)}
        >
          <Eye size={17} color="#fff" style={{ marginRight: 8 }} />
          <Text style={docStyles.viewBtnText}>
            {isImg ? "VIEW IMAGE" : "VIEW / DOWNLOAD"}
          </Text>
        </TouchableOpacity>
      </LinearGradient>
    );
  };

  // ─── Render: empty document card ──────────────────────────────────────────

  const renderEmptyCard = (
    item: StaffDocument,
    docTypeDef: { label: string; value: string; category: string },
  ) => (
    <LinearGradient
      key={`empty-${item.document_name}`}
      colors={["#171d30", "#0f1322"]}
      style={[
        docStyles.cardGradient,
        {
          borderStyle: "dashed",
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.08)",
        },
      ]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <View style={docStyles.cardTopRow}>
        <View
          style={[
            docStyles.docIconBox,
            { backgroundColor: "rgba(255,255,255,0.03)" },
          ]}
        >
          <FileText size={22} color={COLORS.textMuted} />
        </View>
        <View style={{ flex: 1, marginHorizontal: 12 }}>
          <Text style={[docStyles.cardDocName, { color: COLORS.textMuted }]}>
            {getDisplayName(item.document_name)}
          </Text>
          <Text style={{ color: "#aaa", fontSize: 11, marginTop: 2 }}>
            Add Required Document
          </Text>
        </View>
      </View>
      <TouchableOpacity
        style={docStyles.addCardButton}
        onPress={() => openDocModal(docTypeDef)}
      >
        <PlusCircle
          size={16}
          color={COLORS.primary}
          style={{ marginRight: 6 }}
        />
        <Text style={docStyles.addCardButtonText}>ADD DOCUMENT</Text>
      </TouchableOpacity>
    </LinearGradient>
  );

  // ─── Render: documents tab ────────────────────────────────────────────────

  const renderDocumentsTab = () => (
    <ScrollView
      contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
      showsVerticalScrollIndicator={false}
    >
      {mergedDocList.length === 0 ? (
        <Text
          style={{
            color: COLORS.textMuted,
            textAlign: "center",
            marginTop: 40,
          }}
        >
          No documents found for this staff member.
        </Text>
      ) : (
        mergedDocList.map((doc) => {
          const docTypeDef = doc._reqDef || {
            label: doc.document_name,
            value: doc.document_name,
            category: doc.document_category,
          };
          const isFilled = !!(doc.file && doc.file.trim().length > 0);
          return isFilled
            ? renderFilledCard(doc, docTypeDef)
            : renderEmptyCard(doc, docTypeDef);
        })
      )}
    </ScrollView>
  );

  // ─── Render: edit modal body ──────────────────────────────────────────────

  const renderEditModalBody = () => {
    switch (activeModalTab) {
      case "personal":
        return renderPersonalForm(false);
      case "documents":
        return renderDocumentsTab();
      default:
        return renderPersonalForm(false);
    }
  };

  // ─── Render: DOB inline calendar ─────────────────────────────────────────

  const renderDobCalendar = (isAdd: boolean) => {
    const calMonth = isAdd ? addDobCalendarMonth : editDobCalendarMonth;
    const selectedDob = isAdd ? addDobSelected : editDobSelected;
    const grid = buildDobCalendarGrid(calMonth);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return (
      <View style={dobCalStyles.inlineCalendar}>
        <View style={dobCalStyles.calendarHeaderRow}>
          <Text style={dobCalStyles.calendarMonthHeading}>
            {calMonth
              .toLocaleString("default", { month: "long", year: "numeric" })
              .toUpperCase()}
          </Text>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <TouchableOpacity
              onPress={() => changeDobMonth("prev", isAdd)}
              style={dobCalStyles.monthArrow}
            >
              <ChevronLeft size={20} color="#111" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => changeDobMonth("next", isAdd)}
              style={dobCalStyles.monthArrow}
            >
              <ChevronRight size={20} color="#111" />
            </TouchableOpacity>
          </View>
        </View>
        <View style={dobCalStyles.weekDaysRow}>
          {["SU", "MO", "TU", "WE", "TH", "FR", "SA"].map((d, i) => (
            <Text key={i} style={dobCalStyles.weekDayLabel}>
              {d}
            </Text>
          ))}
        </View>
        <View style={dobCalStyles.daysGrid}>
          {grid.map((date, idx) => {
            if (!date) return <View key={idx} style={dobCalStyles.dayCell} />;
            // DOB must be in the past
            const isFuture = date > today;
            const isSelected =
              selectedDob && date.toDateString() === selectedDob.toDateString();
            return (
              <TouchableOpacity
                key={idx}
                disabled={isFuture}
                style={[
                  dobCalStyles.dayCell,
                  isSelected && dobCalStyles.dayCellSelected,
                  isFuture && dobCalStyles.dayCellDisabled,
                ]}
                onPress={() => {
                  if (isFuture) return;
                  const formatted = formatAUDate(date); // DD/MM/YYYY
                  if (isAdd) {
                    setAddDobSelected(date);
                    setAddForm((p) => ({ ...p, date_of_birth: formatted }));
                    setShowAddDobCalendar(false);
                  } else {
                    setEditDobSelected(date);
                    setEditForm((p) => ({ ...p, date_of_birth: formatted }));
                    setShowEditDobCalendar(false);
                  }
                }}
              >
                <Text
                  style={[
                    dobCalStyles.dayText,
                    isSelected && dobCalStyles.dayTextSelected,
                    isFuture && dobCalStyles.dayTextDisabled,
                  ]}
                >
                  {date.getDate()}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  // ─── Render: personal info form ───────────────────────────────────────────

  const renderPersonalForm = (isAdd: boolean) => {
    const form = isAdd ? addForm : editForm;
    const setForm = isAdd
      ? (u: any) => setAddForm(u)
      : (u: any) => setEditForm(u);
    const errors = isAdd ? addErrors : editErrors;
    const predictions = isAdd ? addPredictions : editPredictions;
    const showSuggestions = isAdd ? showAddSuggestions : showEditSuggestions;
    const showResidential = isAdd
      ? showAddResidentialDropdown
      : showEditResidentialDropdown;
    const setShowResidential = isAdd
      ? setShowAddResidentialDropdown
      : setShowEditResidentialDropdown;
    const showDobCal = isAdd ? showAddDobCalendar : showEditDobCalendar;
    const setShowDobCal = isAdd
      ? setShowAddDobCalendar
      : setShowEditDobCalendar;

    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={80}
      >
        <ScrollView
          contentContainerStyle={styles.modalBody}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled
        >
          <FormField
            placeholder="Full Name *"
            value={form.name}
            onChangeText={(t) => setForm((p: any) => ({ ...p, name: t }))}
          />
          {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}

          <FormField
            placeholder="Email *"
            value={form.email}
            onChangeText={(t) => {
              setForm((p: any) => ({ ...p, email: t }));
              // Clear error when user starts typing
              if (errors.email) {
                setAddErrors((prev: any) => ({ ...prev, email: "" }));
              }
            }}
          />
          {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
          {isAdd && (
            <>
              <FormField
                placeholder="Password *"
                value={(form as AddStaffForm).password}
                onChangeText={(t) =>
                  setForm((p: any) => ({ ...p, password: t }))
                }
                secureTextEntry
              />
              {errors.password && (
                <Text style={styles.errorText}>{errors.password}</Text>
              )}
            </>
          )}

          {!isAdd && (
            <FormField
              placeholder="New Password (optional)"
              value={(form as EditStaffForm).password || ""}
              onChangeText={(t) => setForm((p: any) => ({ ...p, password: t }))}
              secureTextEntry
            />
          )}

          <TouchableOpacity
            style={styles.selectBox}
            activeOpacity={0.8}
            onPress={() => {
              Keyboard.dismiss();
              setShowDobCal(!showDobCal);
            }}
          >
            <Text
              style={{
                color: form.date_of_birth ? COLORS.text : COLORS.textMuted,
                fontSize: 14,
              }}
            >
              {form.date_of_birth || "Date of Birth *"}
            </Text>
            <CalendarIcon size={20} color={COLORS.primary} />
          </TouchableOpacity>
          {errors.date_of_birth && (
            <Text style={styles.errorText}>{errors.date_of_birth}</Text>
          )}
          {showDobCal && renderDobCalendar(isAdd)}

          <FormField
            placeholder="Phone *"
            value={form.phone}
            onChangeText={(t) => setForm((p: any) => ({ ...p, phone: t }))}
          />
          {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}

          {/* Residential Status — inline dropdown */}
          <View>
            <TouchableOpacity
              style={styles.selectBox}
              activeOpacity={0.8}
              onPress={() => {
                Keyboard.dismiss();
                setShowResidential(!showResidential);
              }}
            >
              <Text
                style={{
                  color: form.residential_status
                    ? COLORS.text
                    : COLORS.textMuted,
                  fontSize: 14,
                }}
              >
                {form.residential_status || "Residential Status"}
              </Text>
              <ChevronDown size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
            {errors.residential_status && (
              <Text style={styles.errorText}>{errors.residential_status}</Text>
            )}
            {showResidential && (
              <View style={styles.inlineDropdown}>
                {residentialOptions.map((item) => (
                  <TouchableOpacity
                    key={item}
                    style={styles.dropdownItem}
                    onPress={() => {
                      setForm((p: any) => ({ ...p, residential_status: item }));
                      setShowResidential(false);
                    }}
                  >
                    <Text style={styles.dropdownItemText}>{item}</Text>
                    {form.residential_status === item && (
                      <Check size={18} color={COLORS.primary} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <View>
            <TouchableOpacity
              style={styles.selectBox}
              activeOpacity={0.8}
              onPress={() => {
                Keyboard.dismiss();
                const setDropdown = isAdd
                  ? setShowCountryDropdown
                  : setShowEditCountryDropdown;
                setDropdown((prev: boolean) => !prev);
              }}
            >
              <Text
                style={{
                  color: form.origin_country ? COLORS.text : COLORS.textMuted,
                  fontSize: 14,
                }}
              >
                {form.origin_country || "Country of Origin *"}
              </Text>
              <ChevronDown size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
            {errors.origin_country && (
              <Text style={styles.errorText}>{errors.origin_country}</Text>
            )}

            {/* Dropdown List */}
            {(isAdd ? showCountryDropdown : showEditCountryDropdown) && (
              <View style={styles.inlineDropdown}>
                <ScrollView style={{ maxHeight: 250 }} nestedScrollEnabled>
                  {(countries || []).map((country) => (
                    <TouchableOpacity
                      key={country.code}
                      style={styles.dropdownItem}
                      onPress={() => {
                        setForm((p: any) => ({
                          ...p,
                          origin_country: country.name,
                        }));
                        // Close dropdown
                        if (isAdd) setShowCountryDropdown(false);
                        else setShowEditCountryDropdown(false);
                      }}
                    >
                      <Text style={styles.dropdownItemText}>
                        {country.name}
                      </Text>
                      {form.origin_country === country.name && (
                        <Check size={18} color={COLORS.primary} />
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          {/* Address autocomplete */}
          <View>
            <TextInput
              style={styles.input}
              placeholder="Start typing address... *"
              placeholderTextColor={COLORS.textMuted}
              value={form.address}
              onChangeText={(t) => {
                setForm((p: any) => ({ ...p, address: t }));
                fetchPlaces(t, isAdd);
              }}
              autoCorrect={false}
            />
            {errors.address && (
              <Text style={styles.errorText}>{errors.address}</Text>
            )}
            {showSuggestions && predictions.length > 0 && (
              <View style={styles.suggestionsBox}>
                {predictions.map((pred: any) => (
                  <TouchableOpacity
                    key={pred.place_id}
                    style={styles.suggestionItem}
                    onPress={() =>
                      selectPlace(pred.description, pred.place_id, isAdd)
                    }
                  >
                    <MapPin size={14} color={COLORS.primary} />
                    <Text style={styles.suggestionText} numberOfLines={2}>
                      {pred.description}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
          {/* ── Coordinates (Read-only, auto-filled from address) ── */}
          <View>
            <View
              style={[styles.selectBox, { backgroundColor: COLORS.surface }]}
            >
              <Text
                style={{
                  color: form.coordinates ? COLORS.text : COLORS.textMuted,
                  fontSize: 14,
                  flex: 1,
                }}
              >
                {form.coordinates || "Will be auto-filled from address"}
              </Text>
            </View>
          </View>

          {/* Auto-filled fields display (read-only hint) */}
          {(form as any).city || (form as any).country ? (
            <View style={styles.autoFillRow}>
              {(form as any).city ? (
                <View style={styles.autoFillChip}>
                  <Text style={styles.autoFillChipText}>
                    City: {(form as any).city}
                  </Text>
                </View>
              ) : null}
              {(form as any).state ? (
                <View style={styles.autoFillChip}>
                  <Text style={styles.autoFillChipText}>
                    State: {(form as any).state?.toUpperCase()}
                  </Text>
                </View>
              ) : null}
              {(form as any).country ? (
                <View style={styles.autoFillChip}>
                  <Text style={styles.autoFillChipText}>
                    Country: {(form as any).country}
                  </Text>
                </View>
              ) : null}
            </View>
          ) : null}

          <View style={styles.genderBlock}>
            <Text style={styles.label}>Gender</Text>
            <View style={styles.genderOptions}>
              {[
                { label: "Male", value: "male" },
                { label: "Female", value: "female" },
                { label: "Prefer not to say", value: "other" },
              ].map((g) => (
                <TouchableOpacity
                  key={g.value}
                  style={[
                    styles.genderOption,
                    form.gender?.toLowerCase() === g.value &&
                      styles.genderOptionActive,
                  ]}
                  onPress={() =>
                    setForm((p: any) => ({ ...p, gender: g.value }))
                  }
                >
                  <Text
                    style={
                      form.gender?.toLowerCase() === g.value
                        ? styles.genderOptionTextActive
                        : styles.genderOptionText
                    }
                  >
                    {g.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={{ height: 20 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    );
  };

  // ─── Render: staff card ───────────────────────────────────────────────────

  const renderItem = ({ item }: { item: StaffMember }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}></View>
      <View style={styles.userInfo}>
        <View style={styles.infoRow}>
          <User size={16} color="#64748B" />
          <Text style={styles.name}>{capitalizeWords(item.name)}</Text>
        </View>
        <View style={styles.infoRow}>
          <Mail size={16} color="#64748B" />
          <Text style={styles.email}>{item.email}</Text>
        </View>
      </View>
      <View style={styles.infoRow}>
        <Phone size={16} color="#64748B" />
        <Text style={styles.infoText}>{item.phone}</Text>
      </View>
      <View style={styles.infoRow}>
        <MapPin size={16} color="#64748B" />
        <Text style={styles.infoText}>{item.location}</Text>
      </View>
      <View style={styles.actionContainer}>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => openEditModal(item)}
        >
          <Pencil size={18} color="#fff" />
          <Text style={styles.actionText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => deleteStaff(item.id, item.name)}
        >
          <Trash2 size={18} color="#fff" />
          <Text style={styles.actionText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // ─── Main return ──────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ChevronLeft size={26} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>Staff Management</Text>
          <Text style={styles.subtitle}>Manage all staff members</Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            setAddForm(EMPTY_ADD_FORM);
            setAddErrors({});
            setAddDobSelected(null);
            setAddDobCalendarMonth(new Date());
            setShowAddModal(true);
          }}
        >
          <Text style={styles.addButtonText}>+ Add Staff</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={staff}
          renderItem={renderItem}
          keyExtractor={(i) => i.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No staff members found.</Text>
          }
        />
      )}

      {/* ── ADD MODAL ─────────────────────────────────────────────────────── */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <View style={styles.headerTabs}>
                <View style={[styles.tab, styles.tabActive]}>
                  <Text style={[styles.tabText, styles.tabTextActive]}>
                    Personal Information
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setShowAddModal(false)}
                style={styles.closeBtn}
              >
                <X size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
            {renderPersonalForm(true)}
            <View style={styles.footer}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowAddModal(false)}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, addLoading && styles.buttonDisabled]}
                onPress={addStaff}
                disabled={addLoading}
              >
                {addLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.saveText}>Save Staff</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── EDIT MODAL ────────────────────────────────────────────────────── */}
      <Modal
        visible={showEditModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <View style={styles.headerTabs}>
                <TouchableOpacity
                  style={[
                    styles.tab,
                    activeModalTab === "personal" && styles.tabActive,
                  ]}
                  onPress={() => setActiveModalTab("personal")}
                >
                  <Text
                    style={[
                      styles.tabText,
                      activeModalTab === "personal" && styles.tabTextActive,
                    ]}
                  >
                    Personal Information
                  </Text>
                </TouchableOpacity>
                {residentialStatusSaved && (
                  <TouchableOpacity
                    style={[
                      styles.tab,
                      activeModalTab === "documents" && styles.tabActive,
                    ]}
                    onPress={() => setActiveModalTab("documents")}
                  >
                    <Text
                      style={[
                        styles.tabText,
                        activeModalTab === "documents" && styles.tabTextActive,
                      ]}
                    >
                      Documents
                      {/* {staffDocuments.length > 0
                        ? ` (${staffDocuments.length})`
                        : ""} */}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
              <TouchableOpacity
                onPress={() => setShowEditModal(false)}
                style={styles.closeBtn}
              >
                <X size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            {renderEditModalBody()}

            <View style={styles.footer}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowEditModal(false)}
              >
                <Text style={styles.cancelText}>
                  {activeModalTab !== "personal" ? "Close" : "Cancel"}
                </Text>
              </TouchableOpacity>
              {activeModalTab === "personal" && (
                <TouchableOpacity
                  style={[
                    styles.saveButton,
                    editLoading && styles.buttonDisabled,
                  ]}
                  onPress={updateStaff}
                  disabled={editLoading}
                >
                  {editLoading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.saveText}>Update Staff</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* ── DOCUMENT UPLOAD MODAL ─────────────────────────────────────────── */}
      <Modal
        visible={docModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setDocModalVisible(false);
          resetDocForm();
        }}
      >
        <View style={docStyles.modalOverlay}>
          <View style={docStyles.modalContent}>
            <View style={docStyles.modalHeader}>
              <Text style={docStyles.modalTitle}>
                {getDisplayName(
                  selectedDocType?.label || selectedDocType?.value,
                )}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setDocModalVisible(false);
                  resetDocForm();
                }}
              >
                <X size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={docStyles.modalBody}
              keyboardShouldPersistTaps="handled"
            >
              {/* File upload */}
              <View style={docStyles.imageUploadArea}>
                {renderModalPreview()}
                <TouchableOpacity
                  style={docStyles.uploadTriggerButton}
                  onPress={handleUpload}
                  disabled={uploading}
                >
                  {uploading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <CloudUpload
                        size={22}
                        color="#fff"
                        style={{ marginRight: 8 }}
                      />
                      <Text style={docStyles.uploadTriggerText}>
                        {selectedFile || uploadedFilePath
                          ? "REPLACE FILE"
                          : "UPLOAD FILE (IMAGE / PDF / DOC) *"}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
                {fileError ? (
                  <Text style={docStyles.errorText}>{fileError}</Text>
                ) : null}
              </View>

              {/* Document type */}
              <Text style={docStyles.fieldLabel}>DOCUMENT TYPE</Text>
              <View style={docStyles.dropdownSelector}>
                <Text style={docStyles.dropdownText}>
                  {selectedDocType
                    ? getDisplayName(
                        selectedDocType.label || selectedDocType.value,
                      )
                    : ""}
                </Text>
              </View>

              {/* Document number */}
              <Text style={[docStyles.fieldLabel, { marginTop: 18 }]}>
                DOCUMENT NUMBER *
              </Text>

              {needsVerification ? (
                <View style={{ flexDirection: "row" }}>
                  <TextInput
                    style={[
                      docStyles.inputBox,
                      {
                        flex: 1,
                        borderTopRightRadius: 0,
                        borderBottomRightRadius: 0,
                      },
                    ]}
                    placeholder="Enter document number"
                    placeholderTextColor={COLORS.textMuted}
                    value={documentNumber}
                    maxLength={DOC_NO_MAX}
                    autoCapitalize="characters"
                    onChangeText={(t) => {
                      const formatted = t.toUpperCase();
                      setDocumentNumber(formatted);
                      if (formatted.trim()) setDocNumberError("");
                      setIsVerified(false);
                      setExpirationDate(null);
                      setExpiryError("");
                    }}
                  />
                  <TouchableOpacity
                    style={docStyles.verifyButton}
                    disabled={verifying}
                    onPress={handleVerifyDocument}
                  >
                    {verifying ? (
                      <ActivityIndicator color={COLORS.primary} />
                    ) : (
                      <Text style={docStyles.verifyButtonText}>Verify</Text>
                    )}
                  </TouchableOpacity>
                </View>
              ) : (
                <TextInput
                  style={docStyles.inputBox}
                  placeholder="Enter document number"
                  placeholderTextColor={COLORS.textMuted}
                  value={documentNumber}
                  maxLength={DOC_NO_MAX}
                  autoCapitalize="characters"
                  onChangeText={(t) => {
                    setDocumentNumber(t.toUpperCase());
                    if (t.trim()) setDocNumberError("");
                  }}
                />
              )}
              {docNumberError ? (
                <Text style={docStyles.errorText}>{docNumberError}</Text>
              ) : null}

              {needsVerification && !isVerified && (
                <Text style={docStyles.inputHelpText}>
                  Tap "Verify" to validate this document and auto-fill its
                  expiry date.
                </Text>
              )}

              {/* Expiry date */}
              <Text style={[docStyles.fieldLabel, { marginTop: 18 }]}>
                EXPIRATION DATE *
              </Text>

              <TouchableOpacity
                style={[
                  docStyles.dateButton,
                  isExpiryLocked && docStyles.dateButtonDisabled,
                ]}
                activeOpacity={isExpiryLocked ? 1 : 0.8}
                disabled={isExpiryLocked}
                onPress={() => {
                  if (!isExpiryLocked) {
                    setShowInlineCalendar(!showInlineCalendar);
                  }
                }}
              >
                <Text
                  style={[
                    docStyles.dateText,
                    { color: expirationDate ? "#fff" : COLORS.textMuted },
                  ]}
                >
                  {expirationDate
                    ? formatAUDate(expirationDate)
                    : needsVerification
                    ? "Verify document to auto-fill expiry date"
                    : "Tap to select expiry date"}
                </Text>
                {isExpiryLocked ? (
                  <Lock size={16} color={COLORS.textMuted} />
                ) : (
                  <CalendarIcon size={20} color={COLORS.primary} />
                )}
              </TouchableOpacity>

              {isExpiryLocked && (
                <Text style={docStyles.inputHelpText}>
                  Auto-filled from verification — cannot be edited manually.
                </Text>
              )}

              {expiryError ? (
                <Text style={docStyles.errorText}>{expiryError}</Text>
              ) : null}

              {/* Inline calendar for expiry */}
              {showInlineCalendar && !isExpiryLocked && (
                <View style={docStyles.inlineCalendar}>
                  <View style={docStyles.calendarHeaderRow}>
                    <Text style={docStyles.calendarMonthHeading}>
                      {currentCalendarMonth
                        .toLocaleString("default", {
                          month: "long",
                          year: "numeric",
                        })
                        .toUpperCase()}
                    </Text>
                    <View style={{ flexDirection: "row", gap: 12 }}>
                      <TouchableOpacity
                        onPress={() => changeMonth("prev")}
                        style={docStyles.monthArrow}
                      >
                        <ChevronLeft size={20} color="#111" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => changeMonth("next")}
                        style={docStyles.monthArrow}
                      >
                        <ChevronRight size={20} color="#111" />
                      </TouchableOpacity>
                    </View>
                  </View>
                  <View style={docStyles.weekDaysRow}>
                    {["SU", "MO", "TU", "WE", "TH", "FR", "SA"].map((d, i) => (
                      <Text key={i} style={docStyles.weekDayLabel}>
                        {d}
                      </Text>
                    ))}
                  </View>
                  <View style={docStyles.daysGrid}>
                    {calendarGrid.map((date, idx) => {
                      if (!date)
                        return <View key={idx} style={docStyles.dayCell} />;
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      const target = new Date(date);
                      target.setHours(0, 0, 0, 0);
                      const isPast = target < today;
                      const isSelected =
                        expirationDate &&
                        date.toDateString() === expirationDate.toDateString();
                      return (
                        <TouchableOpacity
                          key={idx}
                          disabled={isPast}
                          style={[
                            docStyles.dayCell,
                            isSelected && docStyles.dayCellSelected,
                            isPast && docStyles.dayCellDisabled,
                          ]}
                          onPress={() => {
                            if (isPast) return;
                            setExpirationDate(date);
                            setExpiryError("");
                            setShowInlineCalendar(false);
                          }}
                        >
                          <Text
                            style={[
                              docStyles.dayText,
                              isSelected && docStyles.dayTextSelected,
                              isPast && docStyles.dayTextDisabled,
                            ]}
                          >
                            {date.getDate()}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}

              <View style={{ height: 30 }} />
            </ScrollView>

            <TouchableOpacity
              style={docStyles.saveButton}
              onPress={handleSaveDoc}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={docStyles.saveButtonText}>SAVE DOCUMENT</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
        <Toast />
      </Modal>
      <Toast
        config={{
          success: (props) => (
            <BaseToast
              {...props}
              style={{ borderLeftColor: COLORS.success, borderLeftWidth: 7 }}
              contentContainerStyle={{
                paddingHorizontal: 15,
                backgroundColor: "#1e2937",
              }}
              text1Style={{ fontSize: 16, fontWeight: "700", color: "#fff" }}
              text2Style={{ fontSize: 14, color: "#e2e8f0" }}
            />
          ),
          error: (props) => (
            <ErrorToast
              {...props}
              style={{ borderLeftColor: COLORS.danger, borderLeftWidth: 7 }}
              contentContainerStyle={{
                paddingHorizontal: 15,
                backgroundColor: "#1e2937",
              }}
              text1Style={{ fontSize: 16, fontWeight: "700", color: "#fff" }}
              text2Style={{ fontSize: 14, color: "#e2e8f0" }}
            />
          ),
        }}
        position="top" // Changed to top - better visibility over modal
        topOffset={70}
        visibilityTime={5000}
        autoHide={true}
      />
    </SafeAreaView>
  );
}

// ─── Staff Management Styles ──────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingTop: Platform.OS === "android" ? 20 : 0,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  headerCenter: { flex: 1 },
  title: { fontSize: 20, fontWeight: "800", color: COLORS.text },
  subtitle: { color: COLORS.textSecondary, marginTop: 4, fontSize: 13 },
  addButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  addButtonText: { color: COLORS.text, fontWeight: "700", fontSize: 13 },
  listContent: { paddingHorizontal: 16, paddingBottom: 30 },
  emptyText: {
    color: COLORS.textSecondary,
    textAlign: "center",
    marginTop: 60,
    fontSize: 15,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  cardHeader: { flexDirection: "row", alignItems: "center" },
  userInfo: { flex: 1 },
  name: { color: COLORS.text, fontSize: 17, fontWeight: "700", marginLeft: 10 },
  email: { color: COLORS.text, fontSize: 14, marginLeft: 10 },
  infoRow: { flexDirection: "row", alignItems: "center", marginBottom: 7 },
  infoText: {
    color: COLORS.textSecondary,
    marginLeft: 10,
    fontSize: 12,
    flex: 1,
  },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 30 },
  pendingBadge: {
    backgroundColor: COLORS.warningBg,
    borderWidth: 1,
    borderColor: COLORS.warning,
  },
  activeBadge: {
    backgroundColor: "rgba(52,200,138,0.12)",
    borderWidth: 1,
    borderColor: COLORS.success,
  },
  statusText: { fontWeight: "700", fontSize: 12 },
  pendingText: { color: COLORS.warning },
  activeText: { color: COLORS.success },
  actionContainer: { flexDirection: "row", marginTop: 5 },
  editButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 12,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  deleteButton: {
    flex: 1,
    backgroundColor: COLORS.dangerBg,
    borderWidth: 1,
    borderColor: COLORS.danger,
    borderRadius: 14,
    paddingVertical: 12,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  actionText: { color: COLORS.text, fontWeight: "600", marginLeft: 6 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "flex-end",
  },
  modalCard: {
    width: "100%",
    maxHeight: "92%",
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    overflow: "hidden",
    flex: 1,
  },
  modalHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  headerTabs: { flexDirection: "row", flex: 1, gap: 8 },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 11,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  tabActive: { backgroundColor: COLORS.primary },
  tabText: { fontSize: 13, color: COLORS.textMuted, fontWeight: "600" },
  tabTextActive: { color: "#fff" },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.06)",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  modalBody: { padding: 16, gap: 12 },
  input: {
    backgroundColor: "#1E2D3D",
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 50,
    color: COLORS.text,
    paddingHorizontal: 16,
    height: 45,
  },
  errorText: { color: "#F87171", fontSize: 11, marginLeft: 10, marginTop: 3 },
  label: { color: COLORS.textSecondary, marginBottom: 6, fontSize: 14 },
  selectBox: {
    backgroundColor: "#1E2D3D",
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 50,
    paddingHorizontal: 16,
    height: 45,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  inlineDropdown: {
    backgroundColor: "#0D1F2D",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    marginTop: 6,
    overflow: "hidden",
  },
  dropdownItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  dropdownItemText: { color: COLORS.text, fontSize: 14 },
  suggestionsBox: {
    backgroundColor: "#0D1F2D",
    borderRadius: 14,
    marginTop: 6,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    overflow: "hidden",
    elevation: 10,
  },
  suggestionItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  suggestionText: { color: COLORS.text, flex: 1, fontSize: 13, lineHeight: 18 },
  autoFillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 2,
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  autoFillChip: {
    backgroundColor: "rgba(0,169,157,0.1)",
    borderWidth: 1,
    borderColor: "rgba(0,169,157,0.3)",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  autoFillChipText: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: "600",
  },
  genderBlock: {},
  genderOptions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
    flexWrap: "wrap",
  },
  genderOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "#1E2D3D",
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  genderOptionActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  genderOptionText: { color: COLORS.textSecondary },
  genderOptionTextActive: { color: "#fff", fontWeight: "600" },
  footer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.cardBorder,
    gap: 10,
  },
  cancelButton: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 14,
  },
  cancelText: { color: COLORS.textSecondary, fontWeight: "600" },
  saveButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 14,
    minWidth: 100,
    alignItems: "center",
  },
  saveText: { color: COLORS.text, fontWeight: "700" },
  buttonDisabled: { opacity: 0.6 },
});

// ─── DOB Calendar Styles ──────────────────────────────────────────────────────

const dobCalStyles = StyleSheet.create({
  inlineCalendar: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    marginTop: 8,
    marginBottom: 4,
  },
  calendarHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  calendarMonthHeading: { color: "#111", fontWeight: "bold", fontSize: 14 },
  monthArrow: {
    width: 34,
    height: 34,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
    borderRadius: 17,
  },
  weekDaysRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 6,
  },
  weekDayLabel: {
    color: "#777",
    fontSize: 11,
    fontWeight: "bold",
    width: (width - 80) / 7,
    textAlign: "center",
  },
  daysGrid: { flexDirection: "row", flexWrap: "wrap" },
  dayCell: {
    width: (width - 80) / 7,
    height: 38,
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 2,
  },
  dayCellSelected: { backgroundColor: COLORS.primary, borderRadius: 19 },
  dayCellDisabled: { opacity: 0.25 },
  dayText: { color: "#111", fontSize: 13, fontWeight: "500" },
  dayTextSelected: { color: "#fff", fontWeight: "bold" },
  dayTextDisabled: { color: "#aaa" },
});

// ─── Document Tab / Modal Styles ──────────────────────────────────────────────

const docStyles = StyleSheet.create({
  cardGradient: { borderRadius: 14, padding: 16, marginBottom: 14 },
  cardTopRow: { flexDirection: "row", alignItems: "center" },
  docIconBox: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: "rgba(0,169,157,0.12)",
    justifyContent: "center",
    alignItems: "center",
  },
  cardDocName: { color: "#fff", fontSize: 15, fontWeight: "bold" },
  cardSubRow: {
    flexDirection: "row",
    marginTop: 4,
    alignItems: "center",
    gap: 8,
  },
  extBadge: {
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  extBadgeText: { color: "#fff", fontSize: 10, fontWeight: "bold" },
  editDocBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "rgba(0,169,157,0.12)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(0,169,157,0.25)",
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
    marginVertical: 12,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  infoLabel: { color: "#6C7A89", fontSize: 13 },
  infoValue: { color: "#fff", fontSize: 13, fontWeight: "500" },
  viewBtn: {
    backgroundColor: "#366bf0",
    height: 40,
    borderRadius: 8,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 12,
  },
  viewBtnText: { color: "#fff", fontSize: 13, fontWeight: "bold" },
  addCardButton: {
    height: 38,
    backgroundColor: "rgba(0,169,157,0.08)",
    borderRadius: 6,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 14,
    borderWidth: 1,
    borderColor: "rgba(0,169,157,0.25)",
  },
  addCardButtonText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: "bold",
  },
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  badgeExpired: { backgroundColor: "rgba(255,107,107,0.15)" },
  badgeExpiringSoon: { backgroundColor: "rgba(240,165,0,0.15)" },
  badgeText: { fontSize: 10, fontWeight: "bold" },
  badgeTextExpired: { color: "#ff6b6b" },
  badgeTextExpiringSoon: { color: "#f0a500" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#0D1421",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "94%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  modalTitle: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  modalBody: { padding: 16 },
  imageUploadArea: { alignItems: "center", marginBottom: 20 },
  imagePlaceholder: {
    width: "100%",
    height: 180,
    backgroundColor: "#1C2541",
    borderRadius: 14,
    overflow: "hidden",
    marginBottom: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  previewImage: { width: "100%", height: "100%" },
  uploadTriggerButton: {
    width: "100%",
    height: 52,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  uploadTriggerText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  docPreviewCard: {
    width: "100%",
    borderRadius: 14,
    backgroundColor: "#1C2541",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: "center",
    marginBottom: 12,
    gap: 12,
  },
  docPreviewIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: "rgba(0,169,157,0.12)",
    justifyContent: "center",
    alignItems: "center",
  },
  docPreviewLabel: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
    maxWidth: "80%",
  },
  viewDocButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#366bf0",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 4,
  },
  viewDocButtonText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  fieldLabel: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: "bold",
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  inputBox: {
    backgroundColor: "#1C2541",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 10,
    padding: 14,
    color: "#fff",
    fontSize: 14,
  },
  verifyButton: {
    width: 110,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderLeftWidth: 0,
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
    backgroundColor: "#1C2541",
  },
  verifyButtonText: { color: COLORS.primary, fontWeight: "bold", fontSize: 14 },
  dateButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#1C2541",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    height: 50,
    borderRadius: 10,
    paddingHorizontal: 14,
  },
  dateButtonDisabled: {
    backgroundColor: "rgba(255,255,255,0.02)",
    borderColor: "rgba(255,255,255,0.05)",
  },
  dateText: { color: "#fff", fontSize: 14, flex: 1 },
  errorText: { color: "#ff6b6b", fontSize: 12 },
  dropdownSelector: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#1C2541",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    height: 50,
    borderRadius: 10,
    paddingHorizontal: 14,
  },
  dropdownText: { color: "#fff", fontSize: 14, fontWeight: "500" },
  inputHelpText: {
    color: "#6C7A89",
    fontSize: 11,
    marginTop: 4,
    fontStyle: "italic",
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    height: 54,
    justifyContent: "center",
    alignItems: "center",
    margin: 16,
    borderRadius: 12,
  },
  saveButtonText: { color: "#fff", fontSize: 15, fontWeight: "bold" },
  inlineCalendar: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    marginTop: 10,
  },
  calendarHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  calendarMonthHeading: { color: "#111", fontWeight: "bold", fontSize: 14 },
  monthArrow: {
    width: 34,
    height: 34,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
    borderRadius: 17,
  },
  weekDaysRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 6,
  },
  weekDayLabel: {
    color: "#777",
    fontSize: 11,
    fontWeight: "bold",
    width: (width - 80) / 7,
    textAlign: "center",
  },
  daysGrid: { flexDirection: "row", flexWrap: "wrap" },
  dayCell: {
    width: (width - 80) / 7,
    height: 38,
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 2,
  },
  dayCellSelected: { backgroundColor: COLORS.primary, borderRadius: 19 },
  dayCellDisabled: { opacity: 0.25 },
  dayText: { color: "#111", fontSize: 13, fontWeight: "500" },
  dayTextSelected: { color: "#fff", fontWeight: "bold" },
  dayTextDisabled: { color: "#aaa" },
});
