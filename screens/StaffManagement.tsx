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
} from "lucide-react-native";
import LinearGradient from "react-native-linear-gradient";
import Toast from "react-native-toast-message";
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

// STRICT: ONLY these exact document names will show the verify button
const VERIFIABLE_DOCUMENT_NAMES = [
  "visa",
  "security license",
  "security licence",
];

// ─── Display name map — same as DocumentsScreen ───────────────────────────────
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
}
interface EditStaffForm {
  name: string;
  email: string;
  phone: string;
  security_license_no: string;
  gender: string;
  residential_status: string;
  address: string;
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
};
const EMPTY_EDIT_FORM: EditStaffForm = {
  name: "",
  email: "",
  phone: "",
  security_license_no: "",
  gender: "",
  residential_status: "",
  address: "",
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

// Formats date strings (YYYY-MM-DD) or Date objects into Australian format (DD/MM/YYYY)
const formatAUDate = (dateSource?: string | Date | null): string => {
  if (!dateSource) return "—";

  if (dateSource instanceof Date) {
    const day = String(dateSource.getDate()).padStart(2, "0");
    const month = String(dateSource.getMonth() + 1).padStart(2, "0");
    const year = dateSource.getFullYear();
    return `${day}/${month}/${year}`;
  }

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
  console.log(`[VERIFY CHECK] Document: "${docName}", Verifiable: ${result}`);
  return result;
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

  // ── Online verification (Visa / Security License) ─────────────────────────
  const [verifying, setVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(false);

  // STRICT: ONLY Visa and Security License documents need online verification
  const needsVerification = selectedDocType
    ? isVerifiableDocType(selectedDocType)
    : false;

  // Lock expiry field ONLY for verifiable docs (Security License & Visa)
  // Matches DocumentsScreen: isExpiryLocked = needsVerification (always locked once verifiable)
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

  const selectPlace = (description: string, isAdd: boolean) => {
    Keyboard.dismiss();
    isAdd
      ? (setAddForm((p) => ({ ...p, address: description })),
        setShowAddSuggestions(false),
        setAddPredictions([]))
      : (setEditForm((p) => ({ ...p, address: description })),
        setShowEditSuggestions(false),
        setEditPredictions([]));
  };

  // ─── Validation ───────────────────────────────────────────────────────────

  const ausPhoneRegex = /^(?:\+?61|0)[2-478](?:[ -]?[0-9]){8}$/;

  const validateAdd = () => {
    const e: any = {};
    if (!addForm.name.trim()) e.name = "Full name is required";
    if (!addForm.email.trim()) e.email = "Email is required";
    else if (!/^\S+@\S+\.\S+$/.test(addForm.email)) e.email = "Invalid email";
    if (!addForm.password.trim()) e.password = "Password is required";
    else if (addForm.password.length < 6) e.password = "Min 6 characters";
    if (!addForm.phone.trim()) e.phone = "Phone is required";
    else if (!ausPhoneRegex.test(addForm.phone.replace(/[\s()+-]/g, "")))
      e.phone = "Must be a valid Australian phone number";
    if (!addForm.security_license_no.trim())
      e.security_license_no = "License no. required";
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
    if (!editForm.security_license_no.trim())
      e.security_license_no = "License no. required";
    if (!editForm.address.trim()) e.address = "Address is required";
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
      await axios.post(
        `${BASE_URL}/admin/create-staff`,
        { ...addForm, user_id: userId },
        { headers },
      );
      Alert.alert("Success", "Staff added successfully.");
      setShowAddModal(false);
      setAddForm(EMPTY_ADD_FORM);
      setAddErrors({});
      getStaff();
    } catch (error: any) {
      const msg =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        "";
      if (
        msg.toLowerCase().includes("email") ||
        msg.toLowerCase().includes("duplicate")
      ) {
        Alert.alert(
          "Email Already Exists",
          "Please use a different email address.",
        );
      } else {
        Alert.alert("Error", msg || "Failed to add staff.");
      }
    } finally {
      setAddLoading(false);
    }
  };

  // ─── Open edit modal ──────────────────────────────────────────────────────

  const openEditModal = (item: StaffMember) => {
    const raw = rawStaff.find((g) => g.id.toString() === item.id);
    if (!raw) return;
    const residentialStatus = raw.staff?.staff_document_type || "";
    setEditingStaffId(item.id);
    setCurrentStaffUserId(raw.id);
    setEditForm({
      name: raw.name || "",
      email: raw.email || "",
      phone: raw.staff?.phone || raw.phone || "",
      security_license_no: raw.staff?.security_license_no || "",
      gender: normalizeGender(raw.staff?.gender || raw.gender),
      residential_status: residentialStatus,
      address: raw.address || "",
    });
    setStaffDocuments(raw.documents || []);
    setResidentialStatusSaved(!!residentialStatus);
    setActiveModalTab("personal");
    setEditErrors({});
    setShowEditModal(true);
  };

  // ─── Update staff ─────────────────────────────────────────────────────────

  const updateStaff = async () => {
    if (!editingStaffId || !validateEdit()) return;
    try {
      setEditLoading(true);
      const headers = await getAuthHeaders();
      const userId = await getMyUserId();
      await axios.put(
        `${BASE_URL}/admin/update-staff/${editingStaffId}`,
        {
          name: editForm.name,
          email: editForm.email,
          phone: editForm.phone,
          security_license_no: editForm.security_license_no,
          gender: editForm.gender,
          staff_document_type: editForm.residential_status,
          address: editForm.address,
          user_id: userId,
        },
        { headers },
      );
      setResidentialStatusSaved(true);
      setEditErrors({});
      getStaff();
      Alert.alert(
        "Success",
        "Staff updated. You can now manage their documents.",
        [
          {
            text: "Go to Documents",
            onPress: () => setActiveModalTab("documents"),
          },
          {
            text: "OK",
            onPress: () => setShowEditModal(false),
          },
        ],
      );
    } catch (e: any) {
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

  const DYNAMIC_DOC_TYPES = useMemo(() => {
    const typesMap = new Map<
      string,
      { label: string; value: string; category: string }
    >();

    rawStaff.forEach((guard: any) => {
      if (Array.isArray(guard.documents)) {
        guard.documents.forEach((doc: any) => {
          const docName = doc.document_name || "";
          const normalizedKey = docName.toLowerCase().replace(/[\s_]+/g, "");
          if (docName && !typesMap.has(normalizedKey)) {
            typesMap.set(normalizedKey, {
              label: docName,
              value: docName,
              category: doc.document_category || "contractor_staff",
            });
          }
        });
      }
    });

    return Array.from(typesMap.values());
  }, [rawStaff]);

  const mergedDocList = useMemo((): Array<
    StaffDocument & {
      _reqDef?: { label: string; value: string; category: string };
    }
  > => {
    const result: Array<
      StaffDocument & {
        _reqDef?: { label: string; value: string; category: string };
      }
    > = staffDocuments.map((doc) => {
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
      const alreadyPresent = staffDocuments.some((d) => {
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

      // For verifiable docs: mark verified if both number and expiry exist
      if (isVerifiable) {
        setIsVerified(
          !!(existingDoc.document_no && existingDoc.document_expiry),
        );
      } else {
        setIsVerified(true);
      }
    } else {
      // New document
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

  // ─── Online document verification — mirrors DocumentsScreen exactly ────────

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
        // Visa verification
        const payload = {
          passport: documentNumber.trim(),
        };
        console.log("VISA VERIFY PAYLOAD:", JSON.stringify(payload, null, 2));
        response = await axios.post(`${BASE_URL}/admin/visa-check`, payload, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
      } else {
        // Security License verification — same endpoint as DocumentsScreen
        const payload = {
          document_type: selectedDocType.label,
          license_number: documentNumber.trim(),
          user_id: Number(currentStaffUserId),
        };
        console.log(
          "SEC LICENSE VERIFY PAYLOAD:",
          JSON.stringify(payload, null, 2),
        );
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

      console.log("VERIFY RESPONSE:", JSON.stringify(response?.data, null, 2));

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

      // Extract expiry from response — same field-search logic as DocumentsScreen
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
      console.log("=== VERIFY ERROR ===");
      console.log(JSON.stringify(error?.response?.data, null, 2));
      console.log("Status:", error?.response?.status);
      console.log("Message:", error?.message);

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
      // ONLY Visa & Security License must be verified online first
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

      // Refresh staff to get updated documents
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
            {/* Display name matches DocumentsScreen */}
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
          {/* Display name matches DocumentsScreen */}
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
            onChangeText={(t) => setForm((p: any) => ({ ...p, email: t }))}
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

          <FormField
            placeholder="Phone *"
            value={form.phone}
            onChangeText={(t) => setForm((p: any) => ({ ...p, phone: t }))}
          />
          {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}

          <FormField
            placeholder="Security License No *"
            value={form.security_license_no}
            onChangeText={(t) =>
              setForm((p: any) => ({ ...p, security_license_no: t }))
            }
          />
          {errors.security_license_no && (
            <Text style={styles.errorText}>{errors.security_license_no}</Text>
          )}

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
                {form.residential_status || "Residential Status *"}
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
                    onPress={() => selectPlace(pred.description, isAdd)}
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

          {/* Gender */}
          <View style={styles.genderBlock}>
            <Text style={styles.label}>Gender</Text>
            <View style={styles.genderOptions}>
              {["Male", "Female", "Other"].map((g) => (
                <TouchableOpacity
                  key={g}
                  style={[
                    styles.genderOption,
                    form.gender === g && styles.genderOptionActive,
                  ]}
                  onPress={() => setForm((p: any) => ({ ...p, gender: g }))}
                >
                  <Text
                    style={
                      form.gender === g
                        ? styles.genderOptionTextActive
                        : styles.genderOptionText
                    }
                  >
                    {g}
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
      <View style={styles.cardHeader}>
        <View style={styles.avatar}>
          <User size={24} color="#14E6C9" />
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.name}>{capitalizeWords(item.name)}</Text>
          <Text style={styles.email}>{item.email}</Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            item.status === "Pending"
              ? styles.pendingBadge
              : styles.activeBadge,
          ]}
        >
          <Text
            style={[
              styles.statusText,
              item.status === "Pending"
                ? styles.pendingText
                : styles.activeText,
            ]}
          >
            {item.status}
          </Text>
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
                      {staffDocuments.length > 0
                        ? ` (${staffDocuments.length})`
                        : ""}
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
                {/* Display name from map — same as DocumentsScreen */}
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

              {/* Document type — informational, same style as DocumentsScreen */}
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

              {/* STRICT: Show verify button ONLY for Visa and Security License */}
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
                      // Any change invalidates previous verification
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

              {/* Helper text — only while a verifiable doc isn't verified yet */}
              {needsVerification && !isVerified && (
                <Text style={docStyles.inputHelpText}>
                  Tap "Verify" to validate this document and auto-fill its
                  expiry date.
                </Text>
              )}

              {/* Expiry date — STRICTLY locked for Security License & Visa (mirrors DocumentsScreen) */}
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

              {/* Inline calendar — only for non-locked documents */}
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
        {/* Toast inside modal so it appears above modal content */}
        <Toast />
      </Modal>
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
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: COLORS.primaryGlow,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
    marginRight: 14,
  },
  userInfo: { flex: 1 },
  name: { color: COLORS.text, fontSize: 17, fontWeight: "700" },
  email: { color: COLORS.textSecondary, fontSize: 13, marginTop: 4 },
  infoRow: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  infoText: {
    color: COLORS.textSecondary,
    marginLeft: 10,
    fontSize: 14,
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
    marginTop: "auto",
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
  errorText: { color: "#F87171", fontSize: 11, marginLeft: 12, marginTop: 3 },
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
  errorText: { color: "#ff6b6b", fontSize: 12, marginTop: 4 },
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
