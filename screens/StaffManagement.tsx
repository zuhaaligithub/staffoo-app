

import React, {
  useEffect,
  useState,
  useMemo,
  useRef,
  useCallback,
} from "react";
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
  Mail,
  Search,
  CalendarIcon,
} from "lucide-react-native";
import LinearGradient from "react-native-linear-gradient";
import Toast, { BaseToast, ErrorToast } from "react-native-toast-message";
import { launchImageLibrary } from "react-native-image-picker";
import axios from "./axiosInterceptor";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BASE_URL, uploadFile } from "../services/authApi";
// const Base_Url = "https://apis-staging.staffoo.com.au";
const Base_Url = "https://apis.staffoo.com.au";
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

const GOOGLE_API_KEY = "AIzaSyCS-DB39Kk-Z25C5GWymVGshXIALbjXPGY";
// const FILE_BASE_URL = "https://apis-staging.staffoo.com.au/staff_documents/";
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

const VERIFIABLE_DOCUMENT_NAMES = ["visa", "security license"];

const ALLOWED_DOC_NAMES: string[] = [
  "passport",
  "visa",
  "driver license front",
  "driver license back",

  "security license",

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

const DOCUMENT_DISPLAY_NAME: Record<string, string> = {
  passport: "Passport",
  visa: "Visa",
  "driver license front": "Driver Licence (Front)",
  "driver license back": "Driver Licence (Back)",

  "security license": "Security Licence",

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

const THEME = {
  background: "#030508",

  accent: "#366bf0",
  teal: "#89E7D0",
  textLight: "#FFFFFF",
  textMuted: "#6C7A89",
  border: "rgba(255, 255, 255, 0.1)",

  tealDark: "#0077b6",
  bgDark: "#141929",
  cardBg: "#1e2538",

  textMain: "#ffffff",

  error: "#ff6b6b",
  success: "#2ec4b6",
};

interface StaffMember {
  id: string;
  name: string;
  email: string;
  phone: string;
  location: string;
  status: "Inactive" | "Active";
  profileImage: string | null;
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
  address: string;
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
  address: string;
  password?: string;
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
  address: "",
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
  address: "",
  password: undefined,
  city: undefined,
  state: undefined,
  country: undefined,
  coordinates: undefined,
};

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

const formatAUDate = (dateSource?: string | Date | null): string => {
  if (!dateSource) return "—";
  if (dateSource instanceof Date) {
    return `${String(dateSource.getDate()).padStart(2, "0")}/${String(
      dateSource.getMonth() + 1,
    ).padStart(2, "0")}/${dateSource.getFullYear()}`;
  }
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateSource)) return dateSource;
  const [year, month, day] = dateSource.split("-");
  if (!year || !month || !day) return dateSource;
  return `${day}/${month}/${year}`;
};

const parseApiExpiryDate = (value: string): Date | null => {
  if (!value) return null;
  const ddmmyyyy = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (ddmmyyyy) {
    const [, dd, mm, yyyy] = ddmmyyyy;
    const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
    return isNaN(d.getTime()) ? null : d;
  }
  const yyyymmdd = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (yyyymmdd) {
    const [, yyyy, mm, dd] = yyyymmdd;
    const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
    return isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
};

const isVerifiableDocType = (opts: {
  label?: string | null;
  value?: string | null;
  category?: string | null;
}): boolean => {
  const docName = (opts.label || opts.value || "").toLowerCase().trim();
  return VERIFIABLE_DOCUMENT_NAMES.some(
    (keyword) => docName === keyword || docName.includes(keyword),
  );
};

const extractAddressComponents = (
  components: any[],
): { city: string; state: string; country: string; countryCode: string } => {
  let city = "",
    state = "",
    country = "",
    countryCode = "";
  components.forEach((component: any) => {
    const types: string[] = component.types || [];
    if (
      types.includes("locality") ||
      types.includes("postal_town") ||
      types.includes("sublocality_level_1")
    ) {
      if (!city) city = component.long_name;
    }
    if (types.includes("administrative_area_level_1"))
      state = component.short_name.toLowerCase();
    if (types.includes("country")) {
      country = component.long_name;
      countryCode = component.short_name;
    }
  });
  return { city, state, country, countryCode };
};

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
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [rawStaff, setRawStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState<AddStaffForm>(EMPTY_ADD_FORM);
  const [addLoading, setAddLoading] = useState(false);
  const [addPredictions, setAddPredictions] = useState<any[]>([]);
  const [showAddSuggestions, setShowAddSuggestions] = useState(false);
  const [addErrors, setAddErrors] = useState<any>({});

  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState<EditStaffForm>(EMPTY_EDIT_FORM);
  const [editErrors, setEditErrors] = useState<any>({});
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editPredictions, setEditPredictions] = useState<any[]>([]);
  const [showEditSuggestions, setShowEditSuggestions] = useState(false);
  const [activeModalTab, setActiveModalTab] = useState<
    "personal" | "documents" | "onboarding"
  >("personal");

  const [staffDocuments, setStaffDocuments] = useState<StaffDocument[]>([]);
  const [currentStaffUserId, setCurrentStaffUserId] = useState<number | null>(
    null,
  );

  // NOTE: docModalVisible no longer drives a second native <Modal>. It now
  // toggles an in-place overlay rendered INSIDE the Edit Staff modal (see
  // JSX below). Presenting two native Modals at once is what caused the
  // iOS-only freeze and "Add Document" silently failing to open — iOS
  // native modal presentation doesn't reliably support a second modal
  // stacking on top of one that's already up. Only one native <Modal> is
  // ever visible at a time now.
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
  const [verifying, setVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(false);

  const needsVerification = selectedDocType
    ? isVerifiableDocType(selectedDocType)
    : false;
  const isExpiryLocked = needsVerification;

  useEffect(() => {
    getStaff();
  }, []);

  const getAuthHeaders = async () => {
    const token = await AsyncStorage.getItem("@auth_token");
    return { Authorization: `Bearer ${token}` };
  };

  const getMyUserId = async (): Promise<number | null> => {
    const userData = await AsyncStorage.getItem("user");
    if (!userData) return null;
    return JSON.parse(userData).id;
  };

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
          status: item.is_active ? "Active" : "Inactive",

          profileImage:
            getProfileImage(
              item?.staff?.profile_image || item?.profile_image,
            ) || null,
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

  const fetchPlaces = async (text: string, isAdd: boolean) => {
    if (text.length < 3) {
      isAdd
        ? (setAddPredictions([]), setShowAddSuggestions(false))
        : (setEditPredictions([]), setShowEditSuggestions(false));
      return;
    }

    try {
      const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
        text,
      )}&components=country:au&types=address&language=en&key=${GOOGLE_API_KEY}`;

      const res = await fetch(url);
      const json = await res.json();

      if (isAdd) {
        setAddPredictions(json.predictions || []);
        setShowAddSuggestions(true);
      } else {
        setEditPredictions(json.predictions || []);
        setShowEditSuggestions(true);
      }
    } catch (err) {
      console.error("Google Places Error:", err);
      isAdd
        ? (setAddPredictions([]), setShowAddSuggestions(false))
        : (setEditPredictions([]), setShowEditSuggestions(false));
    }
  };

  const selectPlace = async (
    description: string,
    placeId: string,
    isAdd: boolean,
  ) => {
    Keyboard.dismiss();

    if (isAdd) {
      setAddForm((p) => ({ ...p, address: description }));
      setShowAddSuggestions(false);
      setAddPredictions([]);
    } else {
      setEditForm((p) => ({ ...p, address: description }));
      setShowEditSuggestions(false);
      setEditPredictions([]);
    }

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
          coordinates: coordinates || p.coordinates,
        }));
      } else {
        setEditForm((p) => ({
          ...p,
          city: city || p.city,
          state: state || p.state,
          country: country || p.country,
          coordinates: coordinates || p.coordinates,
        }));
      }
    } catch (err) {
      console.log("Place details error:", err);
    }
  };

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
    setEditErrors(e);
    return Object.keys(e).length === 0;
  };

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
        security_license_no: addForm.security_license_no,
        gender: addForm.gender,
        address: addForm.address,
        user_id: userId,
      };
      if (addForm.city) payload.city = addForm.city;
      if (addForm.state) payload.state = addForm.state;
      if (addForm.country) payload.country = addForm.country;
      if (addForm.coordinates) payload.coordinates = addForm.coordinates;
      await axios.post(`${BASE_URL}/admin/create-staff`, payload, { headers });
      Toast.show({
        type: "success",
        text1: "Staff Added Successfully",
        position: "top",
      });
      setShowAddModal(false);
      setAddForm(EMPTY_ADD_FORM);
      setAddErrors({});
      getStaff();
    } catch (e: any) {
      const errorData = e?.response?.data;
      const newErrors: any = {};
      if (errorData?.errors?.email)
        newErrors.email = errorData.errors.email[0] || "Email already taken";
      else if (errorData?.message) newErrors.email = errorData.message;
      else newErrors.email = "Failed to add staff. Please try again.";
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

  const clearPersonalInfo = (isAdd: boolean) => {
    if (isAdd) {
      setAddForm((p) => ({
        ...p,
        address: "",
        city: undefined,
        state: undefined,
        country: undefined,
      }));
      setAddPredictions([]);
      setShowAddSuggestions(false);
    } else {
      setEditForm((p) => ({
        ...p,
        address: "",
        city: undefined,
        state: undefined,
        country: undefined,
      }));
      setEditPredictions([]);
      setShowEditSuggestions(false);
    }
  };
  const getProfileImage = (path?: string | null): string | undefined => {
    console.log("Received path:", path);

    if (!path) {
      console.log("No profile image found");
      return undefined;
    }

    if (path.startsWith("http")) {
      console.log("Full URL:", path);
      return path;
    }

    const imageUrl = `${Base_Url}/storage/${path}`;

    console.log("Generated Image URL:", imageUrl);

    return imageUrl;
  };
  const openEditModal = (item: StaffMember) => {
    const raw = rawStaff.find((g) => g.id.toString() === item.id);
    if (!raw) return;
    setEditingStaffId(item.id);
    setCurrentStaffUserId(raw.id);
    setEditForm({
      name: raw.name || "",
      email: raw.email || "",
      phone: raw.staff?.phone || raw.phone || "",
      security_license_no: raw.staff?.security_license_no || "",
      gender: normalizeGender(raw.staff?.gender || raw.gender),
      address: raw.address || "",
      password: undefined,
      city: raw.city || "",
      state: raw.state || "",
      country: raw.country || "",
      coordinates: raw.coordinates || raw.current_coordinates || "",
    });
    setStaffDocuments(raw.documents || []);
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
      if (editForm.city) payload.city = editForm.city;
      if (editForm.state) payload.state = editForm.state;
      if (editForm.country) payload.country = editForm.country;
      if (editForm.coordinates) payload.coordinates = editForm.coordinates;
      if (editForm.password?.trim()) payload.password = editForm.password;
      await axios.put(
        `${BASE_URL}/admin/update-staff/${editingStaffId}`,
        payload,
        { headers },
      );
      getStaff();
      const refreshResponse = await axios.get(
        `${BASE_URL}/get-contractor-staff/${userId}`,
        { headers },
      );
      const apiData = refreshResponse.data?.guards || [];
      setRawStaff(apiData);
      const thisStaff = apiData.find((g: any) => g.id === currentStaffUserId);
      if (thisStaff) setStaffDocuments(thisStaff.documents || []);
      setEditErrors({});
      Alert.alert("Success", "Staff updated successfully.", [
        { text: "OK", onPress: () => setShowEditModal(false) },
        {
          text: "Go to Documents",
          onPress: () => setActiveModalTab("documents"),
        },
      ]);
    } catch (e: any) {
      Alert.alert(
        "Error",
        e?.response?.data?.message || "Failed to update staff.",
      );
    } finally {
      setEditLoading(false);
    }
  };

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

  const DYNAMIC_DOC_TYPES = useMemo(() => {
    const typesMap = new Map<
      string,
      { label: string; value: string; category: string }
    >();
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
  }, [staffDocuments]);

  const mergedDocList = useMemo(() => {
    const filteredDocs = staffDocuments.filter((doc) =>
      isAllowedDocument(doc.document_name || doc.document_type),
    );
    const result: any[] = filteredDocs.map((doc) => {
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
          position: "top",
        });
    } catch {
      Toast.show({
        type: "error",
        text1: "Failed to open file",
        position: "top",
      });
    }
  };

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

  // Single place that closes the document editor and clears its form.
  // Using this everywhere (instead of separately calling
  // setDocModalVisible(false) + resetDocForm()) guarantees the overlay
  // and its state can never get out of sync with each other.
  const closeDocModal = () => {
    setDocModalVisible(false);
    resetDocForm();
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
      setIsVerified(
        isVerifiable
          ? !!(existingDoc.document_no && existingDoc.document_expiry)
          : true,
      );
    } else {
      setIsVerified(!isVerifiable);
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
          position: "top",
        });
        return;
      }
      if (asset.fileSize && asset.fileSize > MAX_FILE_SIZE) {
        Toast.show({
          type: "error",
          text1: "File too large (max 5MB)",
          position: "top",
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
        position: "top",
      });
    } catch {
      Toast.show({ type: "error", text1: "Upload failed", position: "bottom" });
    } finally {
      setUploading(false);
    }
  };

  const handleVerifyDocument = async () => {
    if (!selectedDocType) {
      Toast.show({
        type: "error",
        text1: "Please select document type",
        position: "top",
      });
      return;
    }
    if (!documentNumber.trim()) {
      setDocNumberError("Please enter document number");
      return;
    }

    const userState = editForm.state;

    if (!userState) {
      Toast.show({
        type: "error",
        text1: "State is required",
        text2: "Please add your State in Profile first",
        position: "top",
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
        response = await axios.post(
          `${BASE_URL}/admin/visa-check`,
          { passport: documentNumber.trim() },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          },
        );
      } else {
        const verificationPayload = {
          document_type: selectedDocType.label,
          license_number: documentNumber.trim(),
          state: userState,
        };

        console.log(
          "Sending Document Verification Payload:",
          verificationPayload,
        );

        response = await axios.post(
          `${Api_Url}/documents-online-verification-staffoo`,
          verificationPayload,
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
          text1: data?.message || "Verification failed",
          position: "top",
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
            text1: data?.message || "Document verified",
            position: "top",
          });
          return;
        }
      }

      setIsVerified(false);
      setExpirationDate(null);
      setExpiryError("Could not parse expiry date from verification");
      Toast.show({
        type: "error",
        text1: "Verification failed to parse expiry",
        position: "top",
      });
    } catch (error: any) {
      setIsVerified(false);
      setExpirationDate(null);
      Toast.show({
        type: "error",
        text1:
          error?.response?.data?.message ||
          error?.message ||
          "Verification failed",
        position: "top",
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
          position: "top",
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
        position: "top",
      });
      return;
    }
    setSaving(true);
    try {
      let fileName = "";
      if (uploadedFilePath) {
        fileName = uploadedFilePath.split("/").pop() || uploadedFilePath;
      } else if (selectedFile?.name) {
        fileName = selectedFile.name;
      }

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
        position: "top",
      });

      closeDocModal();

      await refreshStaffListAndStatus();
    } catch (err) {
      console.error(err);
      Toast.show({ type: "error", text1: "Save failed", position: "bottom" });
    } finally {
      setSaving(false);
    }
  };

  // Add near other helper functions
  const refreshStaffListAndStatus = async () => {
    try {
      const userId = await getMyUserId();
      const headers = await getAuthHeaders();

      const response = await axios.get(
        `${BASE_URL}/get-contractor-staff/${userId}`,
        { headers },
      );

      const apiData = response.data?.guards || [];

      // Update raw data
      setRawStaff(apiData);

      // Update main staff list with fresh is_active status
      const updatedStaff = apiData.map((item: any) => ({
        id: item.id.toString(),
        name: item.name || "N/A",
        email: item.email || "N/A",
        phone: item.staff?.phone || item.phone || "N/A",
        location: item.address || "N/A",
        status: item.is_active ? "Active" : "Inactive",
        profileImage:
          getProfileImage(item?.staff?.profile_image || item?.profile_image) ||
          null,
      }));

      setStaff(updatedStaff);

      // Also update documents for currently open edit modal
      const thisStaff = apiData.find((g: any) => g.id === currentStaffUserId);
      if (thisStaff) {
        setStaffDocuments(thisStaff.documents || []);
      }
    } catch (e) {
      console.log("Full refresh failed:", e);
    }
  };

  const refreshOnlyCurrentStaff = async () => {
    if (!currentStaffUserId) return;

    try {
      const userId = await getMyUserId();
      const headers = await getAuthHeaders();

      const response = await axios.get(
        `${BASE_URL}/get-contractor-staff/${userId}`,
        { headers },
      );

      const apiData = response.data?.guards || [];
      setRawStaff((prev) => {
        // Merge new data without full replace if possible
        const updated = [...prev];
        const index = updated.findIndex((g) => g.id === currentStaffUserId);
        if (index !== -1) {
          updated[index] =
            apiData.find((g: any) => g.id === currentStaffUserId) ||
            updated[index];
        }
        return updated;
      });

      const thisStaff = apiData.find((g: any) => g.id === currentStaffUserId);
      if (thisStaff) {
        setStaffDocuments(thisStaff.documents || []);
      }
    } catch (e) {
      console.log("Refresh failed", e);
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

  const renderFilledCard = (
    item: StaffDocument,
    docTypeDef: { label: string; value: string; category: string },
  ) => {
    const status = getExpiryStatus(item.document_expiry);
    const isImg = isImageFile(item.file);
    const ext = item.file?.split(".").pop()?.toUpperCase() || "";
    return (
      <LinearGradient
        colors={["#171d30", "#0f1322"]}
        style={[
          styles.cardGradientWrapper,
          {
            borderStyle: "dashed",
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.08)",
          },
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.cardInnerContainer}>
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
        </View>
      </LinearGradient>
    );
  };

  const renderEmptyCard = (
    item: StaffDocument,
    docTypeDef: { label: string; value: string; category: string },
  ) => (
    <LinearGradient
      colors={["#171d30", "#0f1322"]}
      style={[
        styles.cardGradientWrapper,
        {
          borderStyle: "dashed",
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.08)",
        },
      ]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <View style={styles.cardInnerContainer}>
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
      </View>
    </LinearGradient>
  );

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
        mergedDocList.map((doc, index) => {
          const docTypeDef = doc._reqDef || {
            label: doc.document_name,
            value: doc.document_name,
            category: doc.document_category,
          };
          const isFilled = !!(doc.file && doc.file.trim().length > 0);

          const uniqueKey =
            doc.id && doc.id !== -1
              ? doc.id.toString()
              : `doc-${index}-${doc.document_name}`;

          return (
            <React.Fragment key={uniqueKey}>
              {isFilled
                ? renderFilledCard(doc, docTypeDef)
                : renderEmptyCard(doc, docTypeDef)}
            </React.Fragment>
          );
        })
      )}
    </ScrollView>
  );

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

  const renderPersonalForm = (isAdd: boolean) => {
    const form = isAdd ? addForm : editForm;
    const setForm = isAdd
      ? (u: any) => setAddForm(u)
      : (u: any) => setEditForm(u);
    const errors = isAdd ? addErrors : editErrors;
    const predictions = isAdd ? addPredictions : editPredictions;
    const showSuggestions = isAdd ? showAddSuggestions : showEditSuggestions;

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
              if (errors.email)
                setAddErrors((prev: any) => ({ ...prev, email: "" }));
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

          <FormField
            placeholder="Phone *"
            value={form.phone}
            onChangeText={(t) => setForm((p: any) => ({ ...p, phone: t }))}
          />
          {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}

          <FormField
            placeholder="Security Licence No"
            value={form.security_license_no || ""}
            onChangeText={(t) =>
              setForm((p: any) => ({ ...p, security_license_no: t }))
            }
          />

          {/* Address autocomplete */}
          <View>
            <View style={{ position: "relative", justifyContent: "center" }}>
              <TextInput
                style={[styles.input, { paddingRight: 40 }]}
                placeholder="Start typing address... *"
                placeholderTextColor={COLORS.textMuted}
                value={form.address}
                onChangeText={(t) => {
                  setForm((p: any) => ({ ...p, address: t }));
                  fetchPlaces(t, isAdd);
                }}
                autoCorrect={false}
              />
              {!!form.address && (
                <TouchableOpacity
                  onPress={() => clearPersonalInfo(isAdd)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  style={{ position: "absolute", right: 14 }}
                >
                  <X size={18} color={COLORS.textMuted} />
                </TouchableOpacity>
              )}
            </View>
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

          {/* Gender */}
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

  const renderItem = ({ item }: { item: StaffMember }) => (
    <View style={styles.card}>
      {/* ── Corner status ribbon — absolutely positioned outside the flex
          row so a long/wrapped name can never push it out of place. ── */}
      <View style={styles.ribbonWrap} pointerEvents="none">
        <View
          style={[
            styles.ribbonFoldLeft,
            item.status === "Active"
              ? styles.ribbonFoldActive
              : styles.ribbonFoldInactive,
          ]}
        />
        <View
          style={[
            styles.ribbonBand,
            item.status === "Active"
              ? styles.ribbonBandActive
              : styles.ribbonBandInactive,
          ]}
        >
          <Text style={styles.ribbonText}>{item.status}</Text>
        </View>
        <View
          style={[
            styles.ribbonFoldRight,
            item.status === "Active"
              ? styles.ribbonFoldActive
              : styles.ribbonFoldInactive,
          ]}
        />
      </View>

      <View style={styles.topRow}>
        {item.profileImage ? (
          <Image
            source={{ uri: item.profileImage! }}
            style={styles.profileImage}
          />
        ) : (
          <View style={styles.profileAvatar}>
            <Text style={styles.profileAvatarText}>
              {item.name.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}

        <View style={styles.nameWrap}>
          <Text style={styles.name}>{capitalizeWords(item.name)}</Text>
        </View>
      </View>

      <View style={styles.infoRow}>
        <Mail size={16} color="#64748B" />
        <Text style={styles.infoText}>{item.email}</Text>
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

  return (
    <SafeAreaView style={styles.container}>
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

      {/* ADD MODAL */}
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

      {/* EDIT MODAL — the document editor now renders INSIDE this same
          Modal as an absolute-fill overlay (see docModalVisible block
          below) instead of a second native <Modal>. This is the fix for
          the iOS-only freeze / "Add Document" not opening: iOS does not
          reliably support presenting a second native modal on top of one
          that's already up, so we never do that anymore. */}
      <Modal
        visible={showEditModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowEditModal(false);
          closeDocModal();
        }}
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
                  </Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setShowEditModal(false);
                  closeDocModal();
                }}
                style={styles.closeBtn}
              >
                <X size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
            {renderEditModalBody()}
            <View style={styles.footer}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowEditModal(false);
                  closeDocModal();
                }}
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

            {/* ── Document editor overlay — replaces the old standalone
                <Modal visible={docModalVisible}>. Rendered in-place inside
                the Edit Staff modal so only ONE native Modal is ever
                presented at a time. This fixes the iOS-only freeze and
                "Add Document" silently failing to open. ── */}
            {docModalVisible && (
              <View style={docStyles.docOverlay}>
                <View style={docStyles.modalHeader}>
                  <Text style={docStyles.modalTitle}>
                    {getDisplayName(
                      selectedDocType?.label || selectedDocType?.value,
                    )}
                  </Text>
                  <TouchableOpacity onPress={closeDocModal}>
                    <X size={24} color="#fff" />
                  </TouchableOpacity>
                </View>

                <ScrollView
                  style={docStyles.modalBody}
                  keyboardShouldPersistTaps="handled"
                >
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
                          const f = t.toUpperCase();
                          setDocumentNumber(f);
                          if (f.trim()) setDocNumberError("");
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
                      if (!isExpiryLocked)
                        setShowInlineCalendar(!showInlineCalendar);
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
                        {["SU", "MO", "TU", "WE", "TH", "FR", "SA"].map(
                          (d, i) => (
                            <Text key={i} style={docStyles.weekDayLabel}>
                              {d}
                            </Text>
                          ),
                        )}
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
                            date.toDateString() ===
                              expirationDate.toDateString();
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

                <Toast />
              </View>
            )}
          </View>
        </View>
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
        position="top"
        topOffset={70}
        visibilityTime={5000}
        autoHide
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

  // ── Staff card — position:relative + overflow:hidden so the absolutely
  // positioned corner ribbon is clipped neatly to the card's rounded edge
  // and can never be pushed around by a long/wrapped name. ──
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    position: "relative",
    overflow: "hidden",
  },
  cardHeader: { flexDirection: "row", alignItems: "center" },
  userInfo: { flex: 1 },

  // ── Name row: avatar + wrapping name. No spacer/badge in this row
  // anymore — the ribbon lives outside it, so nothing here can push
  // anything off the card. paddingRight keeps wrapped text clear of the
  // ribbon's corner. ──
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 10,
    gap: 10,
    paddingRight: 56,
  },
  nameWrap: {
    flex: 1,
  },
  name: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "700",
    marginTop: 10,
    // no numberOfLines/ellipsizeMode — long names wrap onto extra lines
    // instead of truncating or overflowing the card.
  },
  email: { color: COLORS.text, fontSize: 14, marginLeft: 10 },
  infoRow: { flexDirection: "row", alignItems: "center", marginBottom: 7 },
  infoText: {
    color: COLORS.textSecondary,
    marginLeft: 10,
    fontSize: 12,
    flex: 1,
  },

  // ── Corner status ribbon — pinned to the top-right corner of the card
  // with position:"absolute", completely outside the flex row above, so
  // it can never be pushed out of place by a long name. Rotated 40° and
  // clipped by the card's overflow:"hidden" for a folded-ribbon look,
  // with small triangular "fold" flaps at each end for the 3D effect. ──
  ribbonWrap: {
    position: "absolute",
    top: 14,
    right: -38,
    width: 150,
    height: 26,
    flexDirection: "row",
    alignItems: "center",
    transform: [{ rotate: "42deg" }],
    zIndex: 10,
  },
  ribbonBand: {
    flex: 1,
    height: 26,
    justifyContent: "center",
    alignItems: "center",
  },
  ribbonBandActive: {
    backgroundColor: COLORS.success,
  },
  ribbonBandInactive: {
    backgroundColor: COLORS.danger,
  },
  ribbonText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  // Small folded-corner triangles at each end of the band — a darker
  // shade gives the illusion the ribbon tucks under itself, like a
  // real paper/fabric ribbon.
  ribbonFoldLeft: {
    width: 0,
    height: 0,
    borderTopWidth: 13,
    borderBottomWidth: 13,
    borderRightWidth: 7,
    borderTopColor: "transparent",
    borderBottomColor: "transparent",
  },
  ribbonFoldRight: {
    width: 0,
    height: 0,
    borderTopWidth: 13,
    borderBottomWidth: 13,
    borderLeftWidth: 7,
    borderTopColor: "transparent",
    borderBottomColor: "transparent",
  },
  ribbonFoldActive: {
    borderRightColor: "#1E8A63",
    borderLeftColor: "#1E8A63",
  },
  ribbonFoldInactive: {
    borderRightColor: "#B33E3E",
    borderLeftColor: "#B33E3E",
  },
  cardGradientWrapper: {
    borderRadius: 12,
    marginBottom: 16,
    marginHorizontal: 4,
    overflow: "hidden",
  },

  // Inner container handling correct iOS padding
  cardInnerContainer: {
    padding: 16,
    width: "100%",
  },

  statusText: { fontWeight: "700", fontSize: 12 },
  activeText: { color: COLORS.success },
  inactiveText: { color: COLORS.danger },
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
  autoFillChipText: { color: COLORS.primary, fontSize: 11, fontWeight: "600" },
  genderBlock: {},
  genderOptions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
    flexWrap: "wrap",
  },
  profileImage: {
    width: 42,
    height: 42,
    borderRadius: 21,
    resizeMode: "cover",
  },
  profileAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  profileAvatarText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
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
  // ── Document editor overlay — fills the Edit Staff modal's card so it
  // behaves visually like the old standalone Modal did, but is just a
  // normal View. No second native Modal is ever presented, which is what
  // fixes the iOS-only freeze / Add Document not opening. ──
  docOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#0D1421",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    zIndex: 999,
    elevation: 20,
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

  cardGradientWrapper: {
    borderRadius: 12,
    marginBottom: 16,
    marginHorizontal: 4,
    overflow: "hidden",
  },

  // Inner container handling correct iOS padding
  cardInnerContainer: {
    padding: 16,
    width: "100%",
  },

  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  infoLabel: {
    color: THEME.textMuted,
    fontSize: 13,
    flex: 1,
  },
  infoValue: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "500",
    textAlign: "right",
    flex: 1,
  },

  cardActionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
    width: "100%",
  },
  viewBtn: {
    backgroundColor: THEME.accent,
    height: 40,
    borderRadius: 8,
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  editBtn: {
    height: 40,
    borderRadius: 8,
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(137,231,208,0.08)",
    borderWidth: 1,
    borderColor: "rgba(137,231,208,0.25)",
  },
});
