import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  FlatList,
  Keyboard,
  Modal,
  Platform,
  KeyboardAvoidingView,
} from "react-native";

import AsyncStorage from "@react-native-async-storage/async-storage";
import Toast from "react-native-toast-message";
import { BASE_URL, getAuthToken, getUserProfile } from "../services/authApi";
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  MapPin,
  Building2,
  FileText,
  X,
  Globe,
  Navigation,
  Edit2,
  ChevronDown,
  Calendar,
  CheckCircle,
} from "lucide-react-native";
import { Image } from "react-native";
import { launchImageLibrary } from "react-native-image-picker";
import ImageResizer from "react-native-image-resizer";
import LinearGradient from "react-native-linear-gradient";
import DateTimePicker from "@react-native-community/datetimepicker";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";

const GOOGLE_API_KEY = "AIzaSyCS-DB39Kk-Z25C5GWymVGshXIALbjXPGY";

// ─── Theme ──────────────────────────────────────────────────────────────────
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
  heroBg1: "#0e2231",
  heroBg2: "#071318",
};

const STATIC_COUNTRIES = [
  { name: "Afghanistan", code: "AFG" },
  { name: "Albania", code: "ALB" },
  { name: "Algeria", code: "DZA" },
  { name: "Argentina", code: "ARG" },
  { name: "Australia", code: "AUS" },
  { name: "Austria", code: "AUT" },
  { name: "Bangladesh", code: "BGD" },
  { name: "Belgium", code: "BEL" },
  { name: "Brazil", code: "BRA" },
  { name: "Canada", code: "CAN" },
  { name: "China", code: "CHN" },
  { name: "Colombia", code: "COL" },
  { name: "Croatia", code: "HRV" },
  { name: "Denmark", code: "DNK" },
  { name: "Egypt", code: "EGY" },
  { name: "France", code: "FRA" },
  { name: "Germany", code: "DEU" },
  { name: "Greece", code: "GRC" },
  { name: "India", code: "IND" },
  { name: "Indonesia", code: "IDN" },
  { name: "Iran", code: "IRN" },
  { name: "Iraq", code: "IRQ" },
  { name: "Ireland", code: "IRL" },
  { name: "Italy", code: "ITA" },
  { name: "Japan", code: "JPN" },
  { name: "Kenya", code: "KEN" },
  { name: "Malaysia", code: "MYS" },
  { name: "Mexico", code: "MEX" },
  { name: "Nepal", code: "NPL" },
  { name: "Netherlands", code: "NLD" },
  { name: "New Zealand", code: "NZL" },
  { name: "Nigeria", code: "NGA" },
  { name: "Norway", code: "NOR" },
  { name: "Pakistan", code: "PAK" },
  { name: "Philippines", code: "PHL" },
  { name: "Poland", code: "POL" },
  { name: "Portugal", code: "PRT" },
  { name: "Russia", code: "RUS" },
  { name: "Saudi Arabia", code: "SAU" },
  { name: "Singapore", code: "SGP" },
  { name: "South Africa", code: "ZAF" },
  { name: "South Korea", code: "KOR" },
  { name: "Spain", code: "ESP" },
  { name: "Sri Lanka", code: "LKA" },
  { name: "Sweden", code: "SWE" },
  { name: "Switzerland", code: "CHE" },
  { name: "Thailand", code: "THA" },
  { name: "Turkey", code: "TUR" },
  { name: "United Arab Emirates", code: "ARE" },
  { name: "United Kingdom", code: "GBR" },
  { name: "United States", code: "USA" },
  { name: "Vietnam", code: "VNM" },
].sort((a, b) => a.name.localeCompare(b.name));

type Props = { navigation: any };

const australianToApiDate = (dateStr: string): string => {
  if (!dateStr) return "";
  const [day, month, year] = dateStr.split("/");
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
};

const formatToAustralian = (date: Date): string => {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

const parseAustralianToDate = (dateStr: string): Date | null => {
  if (!dateStr) return null;
  const [day, month, year] = dateStr.split("/").map(Number);
  const date = new Date(year, month - 1, day);
  return isNaN(date.getTime()) ? null : date;
};

const formatABN = (value: string = "") => {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  return digits.replace(
    /^(\d{0,2})(\d{0,3})(\d{0,3})(\d{0,3}).*$/,
    (_, a, b, c, d) => [a, b, c, d].filter(Boolean).join("-"),
  );
};

const formatACN = (value: string = "") => {
  const digits = value.replace(/\D/g, "").slice(0, 9);
  return digits.replace(/^(\d{0,3})(\d{0,3})(\d{0,3}).*$/, (_, a, b, c) =>
    [a, b, c].filter(Boolean).join("-"),
  );
};

const SectionHeader = ({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) => (
  <View style={styles.sectionHeaderWrap}>
    <View style={styles.sectionHeaderBar} />
    <View>
      <Text style={styles.sectionHeaderTitle}>{title}</Text>
      {!!subtitle && (
        <Text style={styles.sectionHeaderSubtitle}>{subtitle}</Text>
      )}
    </View>
  </View>
);

const InputField = ({
  icon: Icon,
  label,
  value,
  onChange,
  editable = true,
  placeholder = "",
  keyboardType = "default",
  maxLength,
  hint,
}: any) => (
  <View style={styles.field}>
    <Text style={styles.label}>{label}</Text>
    <LinearGradient
      colors={[COLORS.card, COLORS.surface]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.inputContainer}
    >
      <View style={styles.inputIconWrap}>
        <Icon size={18} color={COLORS.primary} />
      </View>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textMuted}
        editable={editable}
        keyboardType={keyboardType}
        maxLength={maxLength}
        autoCapitalize="sentences"
        returnKeyType="done"
        onSubmitEditing={Keyboard.dismiss}
      />
    </LinearGradient>
    {!!hint && <Text style={styles.fieldHint}>{hint}</Text>}
  </View>
);

export default function ProfileSetupScreen({ navigation }: Props) {
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [gmail, setGmail] = useState("");
  const [originalGmail, setOriginalGmail] = useState("");
  const [gender, setGender] = useState<string | null>(null);
  const [userType, setUserType] = useState<string | null>(null);
  const [residentialStatus, setResidentialStatus] = useState<string | null>(
    null,
  );

  const [isControlRoomLicense, setIsControlRoomLicense] = useState(false);
  const [isStaffooStaff, setIsStaffooStaff] = useState(false);
  const [securityLicenseNo, setSecurityLicenseNo] = useState("");
  const [scrollY, setScrollY] = useState(0);
  const [companyName, setCompanyName] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [stateValue, setStateValue] = useState("");
  const [country, setCountry] = useState("");
  const [originCountry, setOriginCountry] = useState("");
  const [coordinates, setCoordinates] = useState<any>(null);
  const [acn, setAcn] = useState("");
  const [abn, setAbn] = useState("");
  const [predictions, setPredictions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [userId, setUserId] = useState<number | string | null>(null);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<any>(null);
  const [addressLayout, setAddressLayout] = useState({ y: 0, height: 0 });
  const scrollRef = useRef<any>(null);
  const addressInputRef = useRef<TextInput>(null);
  const addressFieldWrapperRef = useRef<View>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [hasTextChanges, setHasTextChanges] = useState(false);
  const [hasStateChanges, setHasStateChanges] = useState(false);
  const initialSnapshotRef = useRef<string | null>(null);
  const initialTextSnapshotRef = useRef<string | null>(null);
  const initialStateSnapshotRef = useRef<string | null>(null);
  // Staff-only: tracks whether Visa Status (residentialStatus) was changed
  // so the Save/Next button + post-save navigation can differ for staff.
  const initialVisaStatusRef = useRef<string | null>(null);
  const [hasVisaStatusChanges, setHasVisaStatusChanges] = useState(false);
  const [otp, setOtp] = useState<string>("");
  const [otpModalVisible, setOtpModalVisible] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState<boolean>(false);
  const [phoneVerifyModalVisible, setPhoneVerifyModalVisible] = useState(false);
  const [phoneVerifyStep, setPhoneVerifyStep] = useState<
    "enter_phone" | "enter_otp"
  >("enter_phone");
  const [phoneModalNumber, setPhoneModalNumber] = useState("");
  const [phoneOtp, setPhoneOtp] = useState("");
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingPhone, setIsVerifyingPhone] = useState(false);
  const [phoneOtpError, setPhoneOtpError] = useState("");
  const [showCountryModal, setShowCountryModal] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");
  const [countries] = useState(STATIC_COUNTRIES);
  const AUSTRALIAN_STATES = [
    "New South Wales",
    "Victoria",
    "Queensland",
    "Western Australia",
    "South Australia",
    "Tasmania",
    "Australian Capital Territory",
    "Northern Territory",
  ];
  const [selectedStates, setSelectedStates] = useState<string[]>([]);
  const [showStatesModal, setShowStatesModal] = useState(false);
  const countryCodeToNameFallback: Record<string, string> = {
    PAK: "Pakistan",
    AUS: "Australia",
    IND: "India",
    CAN: "Canada",
    USA: "United States",
    GBR: "United Kingdom",
    PK: "Pakistan",
    AU: "Australia",
    IN: "India",
    CA: "Canada",
    US: "United States",
    GB: "United Kingdom",
  };
  const docCategoryToFullState: Record<string, string> = {
    contractor_document: "Victoria",
    nsw_document: "New South Wales",
    qld_document: "Queensland",
    tas_document: "Tasmania",
    wa_document: "Western Australia",
    sa_document: "South Australia",
    act_document: "Australian Capital Territory",
    nt_document: "Northern Territory",
  };

  const resolveCountryName = (input: string): string => {
    if (!input) return "";
    const trimmed = input.trim();
    const byName = STATIC_COUNTRIES.find(
      (c) => c.name.toLowerCase() === trimmed.toLowerCase(),
    );
    if (byName) return byName.name;
    const byCode = STATIC_COUNTRIES.find(
      (c) => c.code.toLowerCase() === trimmed.toLowerCase(),
    );
    if (byCode) return byCode.name;
    if (countryCodeToNameFallback[trimmed.toUpperCase()])
      return countryCodeToNameFallback[trimmed.toUpperCase()];
    return trimmed;
  };
  const stateAbbrToFull: Record<string, string> = {
    VIC: "Victoria",
    NSW: "New South Wales",
    QLD: "Queensland",
    SA: "South Australia",
    WA: "Western Australia",
    TAS: "Tasmania",
    ACT: "Australian Capital Territory",
    NT: "Northern Territory",
    // Fallbacks for lowercase
    vic: "Victoria",
    nsw: "New South Wales",
    qld: "Queensland",
    sa: "South Australia",
    wa: "Western Australia",
    tas: "Tasmania",
    act: "Australian Capital Territory",
    nt: "Northern Territory",
  };

  const getFullStateName = (state?: string): string => {
    if (!state) return "";
    const trimmed = state.trim();
    return stateAbbrToFull[trimmed] || trimmed;
  };

  const fullStateToAbbr: Record<string, string> = Object.fromEntries(
    Object.entries(stateAbbrToFull)
      .filter(([abbr]) => abbr === abbr.toUpperCase())
      .map(([abbr, full]) => [full, abbr]),
  );
  const getStateAbbr = (state?: string): string => {
    if (!state) return "";
    const trimmed = state.trim();
    return fullStateToAbbr[trimmed] || trimmed;
  };
  const [showGenderModal, setShowGenderModal] = useState(false);
  const [showResidentialModal, setShowResidentialModal] = useState(false);
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempDate, setTempDate] = useState(new Date());

  const genderOptions = [
    { label: "Male", value: "male" },
    { label: "Female", value: "female" },
    { label: "Prefer not to say", value: "other" },
  ];

  const residentialOptions = [
    { label: "Student Visa", value: "student_visa" },
    { label: "Bridging Visa", value: "bridging_visa" },
    { label: "Citizen", value: "citizen" },
    { label: "Permanent Residence", value: "permanent_residence" },
    { label: "Visa Subclass 485", value: "visa_485" },
  ];

  const buildProfileSnapshot = () =>
    JSON.stringify({
      fullName: fullName.trim(),
      phoneNumber: phoneNumber.replace(/[^\d]/g, ""),
      companyName: companyName.trim(),
      registrationNumber: registrationNumber.trim(),
      acn: acn.replace(/\D/g, ""),
      abn: abn.replace(/\D/g, ""),
      address: address.trim(),
      city: city.trim(),
      stateValue: stateValue.trim(),
      country: country.trim(),
      selectedStates: [...selectedStates]
        .map((s) => getFullStateName(s).toLowerCase().trim())
        .sort(),
      gender,
      residentialStatus,
      securityLicenseNo: securityLicenseNo.trim(),
      dateOfBirth: dateOfBirth.trim(),
      originCountry: originCountry.trim(),
      isControlRoomLicense,
    });

  useEffect(() => {
    if (!fetching && initialSnapshotRef.current === null) {
      requestAnimationFrame(() => {
        initialSnapshotRef.current = buildProfileSnapshot();
        initialTextSnapshotRef.current = JSON.stringify({
          fullName: fullName.trim(),
          companyName: companyName.trim(),
          acn: acn.replace(/\D/g, ""),
          abn: abn.replace(/\D/g, ""),
          address: address.trim(),
        });
        initialStateSnapshotRef.current = JSON.stringify(
          [...selectedStates]
            .map((s) => getFullStateName(s).toLowerCase().trim())
            .sort(),
        );
        // Staff-only: remember the Visa Status as loaded from the server.
        initialVisaStatusRef.current = residentialStatus;
      });
    }
  }, [fetching]);

  useEffect(() => {
    if (fetching || initialSnapshotRef.current === null) return;
    const current = buildProfileSnapshot();
    const currentText = JSON.stringify({
      fullName: fullName.trim(),
      companyName: companyName.trim(),
      acn: acn.replace(/\D/g, ""),
      abn: abn.replace(/\D/g, ""),
      address: address.trim(),
    });
    const currentStates = JSON.stringify(
      [...selectedStates]
        .map((s) => getFullStateName(s).toLowerCase().trim())
        .sort(),
    );

    const textChanged = currentText !== initialTextSnapshotRef.current;
    const statesChanged = currentStates !== initialStateSnapshotRef.current;

    setHasTextChanges(textChanged || !!imageFile);
    setHasStateChanges(statesChanged);
    setHasChanges(textChanged || statesChanged || !!imageFile);

    // Staff-only: Visa Status changed compared to what was originally loaded.
    const visaStatusChanged =
      userType === "staff" &&
      (residentialStatus || "") !== (initialVisaStatusRef.current || "");
    setHasVisaStatusChanges(visaStatusChanged);
  }, [
    fullName,
    phoneNumber,
    companyName,
    registrationNumber,
    acn,
    abn,
    address,
    city,
    stateValue,
    country,
    selectedStates,
    gender,
    residentialStatus,
    securityLicenseNo,
    dateOfBirth,
    originCountry,
    imageFile,
    fetching,
    userType,
  ]);

  const toggleState = (state: string) => {
    setSelectedStates((prev) =>
      prev.includes(state)
        ? prev.filter((item) => item !== state)
        : [...prev, state],
    );
  };

  const handlePhoneChange = (text: string) => {
    let cleaned = text.replace(/[^\d+]/g, "");
    if (cleaned.includes("+")) {
      cleaned = "+" + cleaned.replace(/\+/g, "").replace(/^\+/, "");
    }
    if (cleaned.startsWith("+92")) {
      cleaned = "+92" + cleaned.slice(3).replace(/\D/g, "");
      if (cleaned.length > 13) cleaned = cleaned.slice(0, 13);
    } else if (cleaned.startsWith("03")) {
      cleaned = cleaned.replace(/\D/g, "");
      if (cleaned.length > 11) cleaned = cleaned.slice(0, 11);
    } else if (cleaned.startsWith("+1")) {
      cleaned = "+1" + cleaned.slice(2).replace(/\D/g, "");
      if (cleaned.length > 12) cleaned = cleaned.slice(0, 12);
    } else if (cleaned.startsWith("+61")) {
      cleaned = "+61" + cleaned.slice(3).replace(/\D/g, "");
      if (cleaned.length > 12) cleaned = cleaned.slice(0, 12);
    } else if (cleaned.startsWith("0")) {
      cleaned = cleaned.replace(/\D/g, "");
      if (cleaned.length > 10) cleaned = cleaned.slice(0, 10);
    } else if (!cleaned.startsWith("+") && cleaned.length > 0) {
      const digits = cleaned.replace(/\D/g, "");
      if (digits.length <= 10) cleaned = digits.slice(0, 10);
    } else {
      cleaned = cleaned.replace(/[^\d+]/g, "");
      if (cleaned.length > 15) cleaned = cleaned.slice(0, 15);
    }
    setPhoneNumber(cleaned);
  };

  useEffect(() => {
    const initializeProfile = async () => {
      try {
        const storedUserRaw = await AsyncStorage.getItem("user");
        if (!storedUserRaw) {
          navigation.replace("Login");
          return;
        }
        const parsedUser = JSON.parse(storedUserRaw);
        const uid = parsedUser?.id;
        setUserId(uid);

        const profileResponse = await getUserProfile(uid);
        const profile = profileResponse?.data || {};
        setIsStaffooStaff(profile?.user_id === 1);
        // const BASE_IMAGE_URL = "https://apis.staffoo.com.au/storage/";
        const BASE_IMAGE_URL = "https://apis-staging.staffoo.com.au/storage/";

        if (profile?.staff?.profile_image) {
          setProfileImage(`${BASE_IMAGE_URL}${profile.staff.profile_image}`);
        } else if (profile?.customer?.profile_image) {
          setProfileImage(`${BASE_IMAGE_URL}${profile.customer.profile_image}`);
        } else if (profile?.contractor?.profile_image) {
          setProfileImage(
            `${BASE_IMAGE_URL}${profile.contractor.profile_image}`,
          );
        }

        setUserType(profile?.user_type ?? null);
        setFullName(profile?.name ?? "");
        setGmail(profile?.email ?? "");
        setOriginalGmail(profile?.email ?? "");

        const isPhoneVerified =
          profile?.phone_verified === 1 || profile?.phone_verified === "1";
        setPhoneVerified(isPhoneVerified);

        setAddress(
          profile?.address ||
            profile?.staff?.address ||
            profile?.customer?.address ||
            profile?.contractor?.address ||
            "",
        );
        setCity(
          profile?.city ||
            profile?.staff?.city ||
            profile?.customer?.city ||
            profile?.contractor?.city ||
            "",
        );
        setStateValue(
          profile?.state ||
            profile?.staff?.state ||
            profile?.customer?.state ||
            profile?.contractor?.state ||
            "",
        );

        const residentialCountryRaw =
          profile?.country ||
          profile?.customer?.country ||
          profile?.contractor?.country ||
          profile?.staff?.country ||
          "";
        setCountry(resolveCountryName(residentialCountryRaw));

        if (profile?.user_type === "staff") {
          const originRaw = profile?.staff?.origin_country || "";
          let originName = resolveCountryName(originRaw);
          if (countries && countries.length > 0) {
            const byCode = STATIC_COUNTRIES.find(
              (c) => c.code.toLowerCase() === originRaw.trim().toLowerCase(),
            );
            const byName = STATIC_COUNTRIES.find(
              (c) => c.name.toLowerCase() === originRaw.trim().toLowerCase(),
            );
            if (byCode) originName = byCode.name;
            else if (byName) originName = byName.name;
          }
          setOriginCountry(originName);
        }

        const currentCoordinates =
          profile?.coordinates ||
          profile?.staff?.coordinates ||
          profile?.customer?.coordinates ||
          profile?.contractor?.coordinates ||
          "";

        if (currentCoordinates) {
          const parts = currentCoordinates.split(",");
          if (parts.length === 2) {
            const lat = parseFloat(parts[0]);
            const lng = parseFloat(parts[1]);
            if (!isNaN(lat) && !isNaN(lng)) {
              setCoordinates({ lat, lng });
            }
          }
        }

        if (profile?.user_type === "contractor") {
          setPhoneNumber(profile?.phone ?? "");
          setCompanyName(profile?.contractor?.company_name ?? "");
          setRegistrationNumber(profile?.contractor?.registration_number ?? "");
          setAcn(formatACN(profile?.contractor?.acn ?? ""));
          setAbn(formatABN(profile?.contractor?.abn ?? ""));

          setSecurityLicenseNo(
            profile?.contractor?.security_license_no ??
              profile?.security_license_no ??
              "",
          );

          // 1. Check for documents array in response
          const documents = profile?.documents || [];

          if (Array.isArray(documents) && documents.length > 0) {
            // Extract unique state names based on document categories present in the response
            const derivedStates = Array.from(
              new Set(
                documents
                  .map(
                    (doc: any) =>
                      docCategoryToFullState[doc?.document_category],
                  )
                  .filter(Boolean),
              ),
            );
            setSelectedStates(derivedStates);
          } else {
            const existingStates: string[] =
              profile?.contractor?.states_allowed ||
              profile?.states_allowed ||
              [];
            if (Array.isArray(existingStates) && existingStates.length > 0) {
              const mapped = existingStates
                .map((code: string) => stateAbbrToFull[code?.trim()] || code)
                .filter(Boolean);
              setSelectedStates(mapped);
            }
          }
        } else if (profile?.user_type === "staff") {
          setPhoneNumber(profile?.phone ?? "");
          setGender(profile?.staff?.gender ?? null);
          setResidentialStatus(profile?.staff?.staff_document_type ?? null);
          setSecurityLicenseNo(profile?.staff?.security_license_no ?? "");

          const crl =
            profile?.staff?.is_control_room_license ??
            profile?.is_control_room_license;
          setIsControlRoomLicense(
            crl === 1 || crl === "1" || crl === true || crl === "true",
          );

          if (profile?.staff?.date_of_birth) {
            let dob = profile.staff.date_of_birth.trim();
            if (dob.includes("-")) {
              const [year, month, day] = dob.split("-").map(Number);
              dob = `${String(day).padStart(2, "0")}/${String(month).padStart(
                2,
                "0",
              )}/${year}`;
            }
            setDateOfBirth(dob);
            const parsedDate = parseAustralianToDate(dob);
            if (parsedDate) setTempDate(parsedDate);
          }
        } else {
          setPhoneNumber(profile?.customer?.phone ?? "");
          setGender(profile?.customer?.gender ?? null);
        }
      } catch (err) {
        console.log("Profile load error:", err);
        Toast.show({ type: "error", text1: "Could not load profile" });
      } finally {
        setFetching(false);
      }
    };

    initializeProfile();
  }, [navigation]);

  useEffect(() => {
    if (fetching || initialSnapshotRef.current === null) return;
    const current = buildProfileSnapshot();
    setHasChanges(current !== initialSnapshotRef.current || !!imageFile);
  }, [
    fullName,
    phoneNumber,
    companyName,
    registrationNumber,
    acn,
    abn,
    address,
    city,
    stateValue,
    country,
    selectedStates,
    gender,
    residentialStatus,
    securityLicenseNo,
    dateOfBirth,
    originCountry,
    imageFile,
    fetching,
  ]);

  const fetchPlaces = async (text: string) => {
    if (text.length < 3) {
      setPredictions([]);
      setShowSuggestions(false);
      return;
    }

    try {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
          text,
        )}&components=country:au&key=${GOOGLE_API_KEY}`,
      );

      const json = await res.json();
      setPredictions(json.predictions || []);
      setShowSuggestions(true);
      requestAnimationFrame(() => {
        scrollRef.current?.scrollToFocusedInput?.(addressInputRef.current);
      });
    } catch (err) {
      console.log("Places API error:", err);
    }
  };

  const fetchPlaceDetails = async (placeId: string, description: string) => {
    try {
      setShowSuggestions(false);
      Keyboard.dismiss();

      requestAnimationFrame(async () => {
        const res = await fetch(
          `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&key=${GOOGLE_API_KEY}`,
        );
        const json = await res.json();
        const details = json.result;

        setAddress(description);

        let tempCity = "";
        let tempState = "";
        let tempCountry = "";

        details.address_components?.forEach((comp: any) => {
          if (comp.types.includes("locality")) tempCity = comp.long_name;
          if (comp.types.includes("administrative_area_level_1"))
            tempState = comp.long_name;
          if (comp.types.includes("country")) {
            tempCountry = comp.long_name || comp.short_name;
          }
        });

        setCity(tempCity);
        setStateValue(tempState);
        setCountry(tempCountry);

        if (details.geometry?.location) {
          setCoordinates({
            lat: details.geometry.location.lat,
            lng: details.geometry.location.lng,
          });
        }
      });
    } catch (err) {
      console.log("Place details error:", err);
    }
  };

  const validateForm = () => {
    if (!fullName.trim()) {
      Toast.show({ type: "error", text1: "Full Name is required" });
      return false;
    }
    if (!gmail.trim()) {
      Toast.show({ type: "error", text1: "Email is required" });
      return false;
    }
    if (!address.trim()) {
      Toast.show({ type: "error", text1: "Address is required" });
      return false;
    }
    if (!phoneNumber) {
      Toast.show({ type: "error", text1: "Phone Number is required" });
      return false;
    }

    const isValidPhone =
      (phoneNumber.startsWith("0") && phoneNumber.length === 10) ||
      (phoneNumber.startsWith("+61") && phoneNumber.length === 12) ||
      (phoneNumber.startsWith("61") && phoneNumber.length === 11) ||
      (phoneNumber.startsWith("04") && phoneNumber.length === 10) ||
      (phoneNumber.startsWith("03") && phoneNumber.length === 11) ||
      (phoneNumber.startsWith("+92") && phoneNumber.length === 13) ||
      (phoneNumber.startsWith("+1") && phoneNumber.length === 12) ||
      (!phoneNumber.startsWith("+") && phoneNumber.length === 10);

    // if (!isValidPhone) {
    //   Toast.show({ type: "error", text1: "Please enter a valid phone number" });
    //   return false;
    // }

    if (userType === "contractor") {
      if (!companyName.trim()) {
        Toast.show({ type: "error", text1: "Company Name is required" });
        return false;
      }
      if (!selectedStates || selectedStates.length === 0) {
        Toast.show({
          type: "error",
          text1: "Please select at least one state",
        });
        return false;
      }

      const acnDigits = acn.replace(/\D/g, "");
      if (acnDigits.length > 0 && acnDigits.length !== 9) {
        Toast.show({
          type: "error",
          text1: "ACN must be 9 digits",
        });
        return false;
      }

      const abnDigits = abn.replace(/\D/g, "");
      if (abnDigits.length > 0 && abnDigits.length !== 11) {
        Toast.show({
          type: "error",
          text1: "ABN must be 11 digits",
        });
        return false;
      }
    }

    if (userType === "staff") {
      if (isStaffooStaff) {
        if (!dateOfBirth.trim()) {
          Toast.show({
            type: "error",
            text1: "Date of Birth is required",
          });
          return false;
        }

        if (!residentialStatus) {
          Toast.show({
            type: "error",
            text1: "Visa Status is required",
          });
          return false;
        }
      }
      if (!gender) {
        Toast.show({ type: "error", text1: "Gender is required" });
        return false;
      }

      if (!securityLicenseNo?.trim()) {
        Toast.show({
          type: "error",
          text1: "Security Licence Number is required",
        });
        return false;
      }

      if (isStaffooStaff && !originCountry?.trim()) {
        Toast.show({ type: "error", text1: "Country of Birth is required" });
        return false;
      }
    }
    return true;
  };

  const pickImage = async () => {
    const result = await launchImageLibrary({
      mediaType: "photo",
      quality: 0.5,
    });

    if (!result.didCancel && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      const resizedImage = await ImageResizer.createResizedImage(
        asset.uri!,
        800,
        800,
        "JPEG",
        70,
      );
      const file = {
        uri: resizedImage.uri,
        type: asset.type || "image/jpeg",
        name: asset.fileName || `profile_${Date.now()}.jpg`,
      };
      setProfileImage(file.uri);
      setImageFile(file);
    }
  };

  const openPhoneVerifyModal = () => {
    setPhoneModalNumber(phoneNumber);
    setPhoneOtp("");
    setPhoneOtpError("");
    setPhoneVerifyStep("enter_phone");
    setPhoneVerifyModalVisible(true);
  };

  const handleSendOtp = async () => {
    if (!phoneModalNumber.trim()) {
      Toast.show({ type: "error", text1: "Please enter a phone number" });
      return;
    }
    const cleanPhone = phoneModalNumber.replace(/[^\d]/g, "");
    setIsSendingOtp(true);
    try {
      const token = await getAuthToken();
      const payload = {
        phone: cleanPhone,
        id: userId,
      };
      const response = await fetch(`${BASE_URL}/auth/resend-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      console.log("SEND OTP STATUS:", response.status);
      console.log("SEND OTP RESPONSE:", data);
      console.log("================================");

      if (response.ok && (data?.success || data?.code === 200)) {
        setPhoneOtpError("");
        setPhoneOtp("");
        setPhoneVerifyStep("enter_otp");

        Toast.show({
          type: "success",
          text1: "OTP sent successfully!",
        });
      } else {
        const msg = data?.message || data?.error || "Failed to send OTP";

        console.log("SEND OTP ERROR MESSAGE:", msg);

        Toast.show({
          type: "error",
          text1: msg,
        });
      }
    } catch (err: any) {
      console.log("SEND OTP EXCEPTION:", err);

      Toast.show({
        type: "error",
        text1: "Failed to send OTP. Please try again.",
      });
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyPhone = async () => {
    if (phoneOtp.length !== 6) {
      setPhoneOtpError("Please enter a valid 6-digit OTP.");
      return;
    }
    const cleanPhone = phoneModalNumber.replace(/[^\d]/g, "");
    setIsVerifyingPhone(true);
    setPhoneOtpError("");
    try {
      const token = await getAuthToken();

      const payload = {
        id: userId,
        otp: phoneOtp.trim(),
        phone: cleanPhone,
      };
      const response = await fetch(`${BASE_URL}/auth/verify-phone`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      console.log("VERIFY PHONE STATUS:", response.status);
      console.log("VERIFY PHONE RESPONSE:", data);
      console.log("==================================");

      if (response.ok && (data?.success || data?.code === 200)) {
        setPhoneVerified(true);
        setPhoneNumber(phoneModalNumber.trim());
        setPhoneVerifyModalVisible(false);
        setPhoneOtp("");

        Toast.show({
          type: "success",
          text1: "Phone number verified successfully!",
        });
      } else {
        const msg =
          data?.message || data?.error || "Invalid OTP. Please Try Again.";

        console.log("VERIFY PHONE ERROR MESSAGE:", msg);

        setPhoneOtpError(msg);
      }
    } catch (err: any) {
      console.log("VERIFY PHONE EXCEPTION:", err);

      setPhoneOtpError("Verification failed. Please try again.");
    } finally {
      setIsVerifyingPhone(false);
    }
  };

  const handleChangeNumberResend = () => {
    setPhoneVerifyStep("enter_phone");
    setPhoneOtp("");
    setPhoneOtpError("");
  };
  const updateUserProfile = async (
    userId: string | number,
    payload: Record<string, any>,
  ) => {
    const token = await getAuthToken();
    if (!token) throw new Error("No authentication token found");

    const endpoint = `${BASE_URL}/user-update/${userId}`;
    const formData = new FormData();

    if (payload.name !== undefined) formData.append("name", payload.name);
    if (payload.phone !== undefined) formData.append("phone", payload.phone);
    if (payload.email !== undefined) formData.append("email", payload.email);
    if (payload.email_otp !== undefined)
      formData.append("email_otp", payload.email_otp);
    if (payload.gender !== undefined && payload.gender !== null) {
      formData.append("gender", payload.gender);
    }
    if (payload.security_license_no !== undefined) {
      formData.append("security_license_no", payload.security_license_no);
    }
    if (payload.is_control_room_license !== undefined) {
      formData.append(
        "is_control_room_license",
        String(payload.is_control_room_license),
      );
    }
    if (
      payload.staff_document_type !== undefined &&
      payload.staff_document_type !== null
    ) {
      formData.append("staff_document_type", payload.staff_document_type);
    }
    if (payload.date_of_birth !== undefined) {
      formData.append("date_of_birth", payload.date_of_birth);
    }
    if (payload.origin_country !== undefined) {
      formData.append("origin_country", payload.origin_country);
    }
    if (payload.address !== undefined)
      formData.append("address", payload.address);
    if (payload.city !== undefined) formData.append("city", payload.city);
    if (payload.state !== undefined) formData.append("state", payload.state);
    if (payload.country !== undefined)
      formData.append("country", payload.country);
    if (payload.coordinates !== undefined)
      formData.append("coordinates", payload.coordinates);
    if (payload.company_name !== undefined)
      formData.append("company_name", payload.company_name);
    if (payload.registration_number !== undefined) {
      formData.append("registration_number", payload.registration_number ?? "");
    }
    if (payload.acn !== undefined && payload.acn !== null) {
      formData.append("acn", String(payload.acn).replace(/\D/g, ""));
    }
    if (payload.abn !== undefined && payload.abn !== null) {
      formData.append("abn", String(payload.abn).replace(/\D/g, ""));
    }

    if (Array.isArray(payload.states_allowed)) {
      formData.append(
        "states_allowed",
        JSON.stringify(
          payload.states_allowed.map((s: string) => String(s).toLowerCase()),
        ),
      );
    }

    if (payload.profile_image) {
      formData.append("profile_image", {
        uri: payload.profile_image.uri,
        name: payload.profile_image.name || `profile_${Date.now()}.jpg`,
        type: payload.profile_image.type || "image/jpeg",
      } as any);
    }

    console.log("[UPDATE PROFILE] Sending to:", endpoint);
    console.log(
      "[UPDATE PROFILE] Payload:",
      JSON.stringify(
        {
          ...payload,
          profile_image: payload.profile_image ? "[File]" : undefined,
        },
        null,
        2,
      ),
    );

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      body: formData,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok || data?.success === false) {
      const errorMsg =
        data?.message ||
        data?.error ||
        `Failed to update profile (${response.status})`;
      console.error("[UPDATE PROFILE] Error:", data);
      throw new Error(errorMsg);
    }

    console.log("[UPDATE PROFILE] ← Success:", data);
    return data;
  };
  const handleContinue = async () => {
    Keyboard.dismiss();
    if (!validateForm() || !userId) return;

    setLoading(true);

    try {
      const payload: any = {
        name: fullName.trim(),
        phone: phoneNumber.replace(/[^\d]/g, ""),
        email: gmail.trim().toLowerCase(),
        address: address.trim(),
        city: city.trim(),
        state: stateValue.trim(),
        country: country.trim(),
        coordinates: coordinates ? `${coordinates.lat},${coordinates.lng}` : "",
      };

      if (userType === "staff") {
        payload.gender = gender;
        payload.security_license_no = securityLicenseNo?.trim() || "";
        payload.is_control_room_license = isControlRoomLicense ? 1 : 0; // ← add this
        if (residentialStatus) payload.staff_document_type = residentialStatus;
        if (dateOfBirth)
          payload.date_of_birth = australianToApiDate(dateOfBirth);
        if (isStaffooStaff)
          payload.origin_country = originCountry?.trim() || "";
      }

      if (userType === "contractor") {
        payload.company_name = companyName.trim();
        payload.registration_number = registrationNumber.trim();
        payload.acn = acn?.trim() || null;
        payload.abn = abn?.trim() || null;
        payload.security_license_no = securityLicenseNo?.trim() || "";
        // Short-form codes, e.g. ["vic", "qld", "act"]
        payload.states_allowed = selectedStates.map((s) =>
          getStateAbbr(s).toLowerCase(),
        );
      }

      if (imageFile) {
        payload.profile_image = imageFile;
      }

      console.log(
        "🔥 FINAL PROFILE PAYLOAD:",
        JSON.stringify(payload, null, 2),
      );

      // Call API
      await updateUserProfile(userId, payload);

      Toast.show({
        type: "success",
        text1: "Profile Updated Successfully",
      });
      setOriginalGmail(gmail.trim().toLowerCase());
      if (userType === "contractor") {
        if (hasStateChanges) {
          navigation.navigate("Documents");
        } else {
          // Return to the main tabbed layout's Home screen
          navigation.navigate("MainTabs", { screen: "Profile" });
        }
      } else if (userType === "staff") {
        if (hasVisaStatusChanges) {
          // Visa Status was changed -> proceed straight to the Documents tab.
          navigation.navigate("Documents");
        } else {
          navigation.goBack();
        }
      } else {
        navigation.goBack();
      }
    } catch (err: any) {
      console.error("UPDATE ERROR:", err?.response?.data || err);
      const errorMsg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to update profile";
      Toast.show({ type: "error", text1: errorMsg });
    } finally {
      setLoading(false);
    }
  };

  const clearAddressFields = () => {
    setCity("");
    setStateValue("");
    setCountry("");
    setCoordinates(null);
  };

  const scrollToAddressField = () => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollToFocusedInput?.(addressInputRef.current);
    });
  };

  const handleVerifyAndSave = async () => {
    if (otp.length !== 6) {
      Toast.show({ type: "error", text1: "Please enter 6-digit OTP" });
      return;
    }
    setIsVerifyingOtp(true);
    try {
      const payload = {
        email: gmail.trim().toLowerCase(),
        email_otp: otp.trim(),
      };
      await updateUserProfile(userId!, payload);
      Toast.show({ type: "success", text1: "Email updated successfully!" });
      setOriginalGmail(gmail.trim().toLowerCase());
      setOtpModalVisible(false);
      setOtp("");
    } catch (err: any) {
      const errorMsg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        "Failed to verify OTP";
      Toast.show({
        type: "error",
        text1: errorMsg,
        position: "bottom",
        visibilityTime: 5000,
      });
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const isContractorFlow = userType === "contractor";
  const isStaffFlow = userType === "staff";
  const continueButtonLabel = isContractorFlow
    ? hasStateChanges
      ? "Next"
      : "Save"
    : isStaffFlow
    ? hasVisaStatusChanges
      ? "Next"
      : "Save"
    : "Save";

  if (fetching) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator
          size="large"
          color={COLORS.primary}
          style={{ marginTop: 100 }}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      <KeyboardAwareScrollView
        ref={scrollRef}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        onScroll={(e: any) => setScrollY(e.nativeEvent.contentOffset.y)}
        scrollEventThrottle={16}
        enableOnAndroid={true}
        enableAutomaticScroll={true}
        extraScrollHeight={Platform.OS === "android" ? 100 : 20}
        extraHeight={150}
        keyboardOpeningTime={0}
      >
        <LinearGradient
          colors={[COLORS.heroBg1, COLORS.heroBg2]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.headerBackBtn}
          >
            <ArrowLeft size={16} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Personal Information</Text>
          <View style={{ width: 36 }} />
        </LinearGradient>

        <TouchableOpacity
          onPress={pickImage}
          style={styles.imageContainer}
          activeOpacity={0.85}
        >
          <View style={styles.imageRing}>
            {profileImage ? (
              <Image
                source={{ uri: profileImage }}
                style={styles.profileImage}
              />
            ) : (
              <View style={styles.placeholderImage}>
                <User size={28} color={COLORS.textSecondary} />
                <Text style={styles.uploadPhotoText}>Upload Photo</Text>
              </View>
            )}
          </View>
          <View style={styles.editIcon}>
            <Edit2 size={14} color={COLORS.text} />
          </View>
        </TouchableOpacity>

        <SectionHeader
          title="Personal Details"
          subtitle="Your basic account information"
        />

        <View style={styles.card}>
          <InputField
            icon={User}
            label={
              <>
                <Text>Full Name </Text>
                <Text style={styles.required}>*</Text>
              </>
            }
            value={fullName}
            onChange={(text: string) => {
              if (text.length <= 40) setFullName(text);
            }}
            placeholder="Enter your full name"
          />

          <View style={styles.field}>
            <Text style={styles.label}>
              Phone Number <Text style={styles.required}>*</Text>
            </Text>

            <LinearGradient
              colors={[COLORS.card, COLORS.surface]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.phoneSingleContainer}
            >
              <View style={styles.inputIconWrap}>
                {/* <Phone
                  size={17}
                  color={phoneVerified ? COLORS.success : COLORS.danger}
                /> */}
                <Phone size={15} color="#28e1d5" />
              </View>

              <TextInput
                style={styles.phoneSingleInput}
                value={phoneNumber}
                onChangeText={handlePhoneChange}
                placeholder="0412 345 678"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="phone-pad"
                maxLength={15}
                editable={true}
              />

              {/* <TouchableOpacity
                style={[
                  styles.inlineActionButton,
                  phoneVerified && styles.inlineChangeButton,
                ]}
                onPress={openPhoneVerifyModal}
              >
                <Text
                  style={[
                    styles.inlineActionText,
                    phoneVerified && styles.inlineChangeText,
                  ]}
                >
                  {phoneVerified ? "Change" : "Verify"}
                </Text>
              </TouchableOpacity> */}
            </LinearGradient>
          </View>
          {/* Email (read-only) */}
          <View style={[styles.field, { marginBottom: 0 }]}>
            <Text style={styles.label}>
              Email <Text style={styles.required}>*</Text>
            </Text>
            <LinearGradient
              colors={[COLORS.card, COLORS.surface]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.inputContainer, styles.inputContainerDisabled]}
            >
              <View style={styles.inputIconWrap}>
                <Mail size={17} color="#28e1d5" />
              </View>
              <TextInput
                style={styles.input}
                value={gmail}
                editable={false}
                placeholder="yourname@gmail.com"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </LinearGradient>
          </View>
        </View>

        {userType === "contractor" && (
          <>
            <SectionHeader
              title="Company Details"
              subtitle="Business & licensing information"
            />
            <View style={styles.card}>
              <InputField
                icon={Building2}
                label={
                  <>
                    <Text>Company Name </Text>
                    <Text style={styles.required}>*</Text>
                  </>
                }
                value={companyName}
                onChange={setCompanyName}
                placeholder="Enter company name"
              />
              <InputField
                icon={FileText}
                label="ACN (Australian Company Number)"
                value={acn}
                onChange={(text: string) => setAcn(formatACN(text))}
                placeholder="123-456-789"
                keyboardType="numeric"
                maxLength={11}
              />
              <InputField
                icon={FileText}
                label="ABN (Australian Business Number)"
                value={abn}
                onChange={(text: string) => setAbn(formatABN(text))}
                placeholder="12-345-678-901"
                keyboardType="numeric"
                maxLength={14}
              />
              <View style={styles.field}>
                <Text style={styles.label}>Security Master License</Text>
                <LinearGradient
                  colors={[COLORS.card, COLORS.surface]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.inputContainer}
                >
                  <View style={styles.inputIconWrap}>
                    <FileText size={17} color={COLORS.primary} />
                  </View>
                  <TextInput
                    style={styles.input}
                    value={securityLicenseNo}
                    onChangeText={setSecurityLicenseNo}
                    placeholder="Enter Security Master License"
                    placeholderTextColor={COLORS.textMuted}
                    autoCapitalize="characters"
                  />
                </LinearGradient>
              </View>
              <View style={[styles.field, { marginBottom: 0 }]}>
                <Text style={styles.label}>
                  Select States <Text style={styles.required}>*</Text>
                </Text>

                <TouchableOpacity
                  onPress={() => setShowStatesModal(true)}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={[COLORS.card, COLORS.surface]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.inputContainer}
                  >
                    <View style={styles.inputIconWrap}>
                      <Building2 size={17} color={COLORS.primary} />
                    </View>

                    <Text style={[styles.input, { color: COLORS.textMuted }]}>
                      {selectedStates.length
                        ? `${selectedStates.length} state${
                            selectedStates.length > 1 ? "s" : ""
                          } selected`
                        : "Select Australian States"}
                    </Text>

                    <ChevronDown size={18} color={COLORS.textSecondary} />
                  </LinearGradient>
                </TouchableOpacity>

                {selectedStates.length > 0 && (
                  <View style={styles.chipsWrap}>
                    {selectedStates.map((s) => (
                      <View key={s} style={styles.stateChip}>
                        <Text style={styles.stateChipText}>{s}</Text>

                        <TouchableOpacity onPress={() => toggleState(s)}>
                          <X size={13} color={COLORS.primary} />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </View>
          </>
        )}

        {userType === "staff" && (
          <>
            <SectionHeader
              title="Staff Details"
              subtitle="Licensing, identity & eligibility"
            />
            <View style={styles.card}>
              {isStaffooStaff && (
                <TouchableOpacity
                  style={styles.field}
                  onPress={() => setShowCountryModal(true)}
                >
                  <Text style={styles.label}>
                    Country of Birth <Text style={styles.required}>*</Text>
                  </Text>
                  <LinearGradient
                    colors={[COLORS.card, COLORS.surface]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.inputContainer}
                  >
                    <View style={styles.inputIconWrap}>
                      <Globe size={17} color={COLORS.primary} />
                    </View>
                    <Text
                      style={[
                        styles.input,
                        !originCountry && { color: COLORS.textMuted },
                      ]}
                    >
                      {originCountry || "Select Country of Birth"}
                    </Text>
                    <ChevronDown size={18} color={COLORS.textSecondary} />
                  </LinearGradient>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.field}
                onPress={() => setShowGenderModal(true)}
              >
                <Text style={styles.label}>
                  Gender <Text style={styles.required}>*</Text>
                </Text>
                <LinearGradient
                  colors={[COLORS.card, COLORS.surface]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.inputContainer}
                >
                  <View style={styles.inputIconWrap}>
                    <User size={17} color={COLORS.primary} />
                  </View>
                  <Text
                    style={[
                      styles.input,
                      !gender && { color: COLORS.textMuted },
                    ]}
                  >
                    {gender
                      ? genderOptions.find((o) => o.value === gender)?.label
                      : "Select Gender"}
                  </Text>
                  <ChevronDown size={18} color={COLORS.textSecondary} />
                </LinearGradient>
              </TouchableOpacity>

              <View style={styles.field}>
                <Text style={styles.label}>
                  Security Licence Number <Text style={styles.required}>*</Text>
                </Text>
                <LinearGradient
                  colors={[COLORS.card, COLORS.surface]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.inputContainer}
                >
                  <View style={styles.inputIconWrap}>
                    <FileText size={17} color={COLORS.primary} />
                  </View>
                  <TextInput
                    style={styles.input}
                    value={securityLicenseNo}
                    onChangeText={setSecurityLicenseNo}
                    placeholder="Enter Security Licence Number"
                    placeholderTextColor={COLORS.textMuted}
                    autoCapitalize="characters"
                  />
                </LinearGradient>
              </View>

              {/* Control Room License */}
              <View style={styles.field}>
                <Text style={styles.label}>Control Room License</Text>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setIsControlRoomLicense((prev) => !prev)}
                >
                  <LinearGradient
                    colors={[COLORS.card, COLORS.surface]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[styles.inputContainer, styles.crlContainer]}
                  >
                    <Text style={styles.crlLabel}>
                      Do you have a Control Room License?
                    </Text>

                    <View
                      style={[
                        styles.crlSwitch,
                        isControlRoomLicense
                          ? styles.crlSwitchYes
                          : styles.crlSwitchNo,
                      ]}
                    >
                      {isControlRoomLicense ? (
                        <>
                          <Text style={styles.crlTextYes}>YES</Text>
                          <View style={styles.crlKnob} />
                        </>
                      ) : (
                        <>
                          <View style={styles.crlKnob} />
                          <Text style={styles.crlTextNo}>NO</Text>
                        </>
                      )}
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              </View>

              {isStaffooStaff && (
                <TouchableOpacity
                  style={styles.field}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Text style={styles.label}>
                    Date of Birth <Text style={styles.required}>*</Text>
                  </Text>
                  <LinearGradient
                    colors={[COLORS.card, COLORS.surface]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.inputContainer}
                  >
                    <View style={styles.inputIconWrap}>
                      <Calendar size={17} color={COLORS.primary} />
                    </View>
                    <Text
                      style={[
                        styles.input,
                        !dateOfBirth && { color: COLORS.textMuted },
                      ]}
                    >
                      {dateOfBirth || "DD/MM/YYYY"}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
              {showDatePicker && (
                <DateTimePicker
                  value={tempDate}
                  mode="date"
                  display="spinner"
                  onChange={(event, selectedDate) => {
                    setShowDatePicker(false);
                    if (selectedDate) {
                      setTempDate(selectedDate);
                      setDateOfBirth(formatToAustralian(selectedDate));
                    }
                  }}
                  maximumDate={new Date()}
                />
              )}

              {/* Visa Status dropdown */}
              {isStaffooStaff && (
                <TouchableOpacity
                  style={[styles.field, { marginBottom: 0 }]}
                  onPress={() => setShowResidentialModal(true)}
                >
                  <Text style={styles.label}>
                    Visa Status <Text style={styles.required}>*</Text>
                  </Text>
                  <LinearGradient
                    colors={[COLORS.card, COLORS.surface]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.inputContainer}
                  >
                    <View style={styles.inputIconWrap}>
                      <Globe size={17} color={COLORS.primary} />
                    </View>
                    <Text
                      style={[
                        styles.input,
                        !residentialStatus && { color: COLORS.textMuted },
                      ]}
                    >
                      {residentialStatus
                        ? residentialOptions.find(
                            (o) => o.value === residentialStatus,
                          )?.label
                        : "Select Visa Status"}
                    </Text>
                    <ChevronDown size={18} color={COLORS.textSecondary} />
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </View>
          </>
        )}

        {/* ── Gender Modal ── */}
        <Modal visible={showGenderModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.customModal}>
              <Text style={styles.modalTitle}>Select Gender</Text>
              <FlatList
                data={genderOptions}
                keyExtractor={(item) => item.value}
                renderItem={({ item }) => {
                  const isSelected = gender === item.value;
                  return (
                    <TouchableOpacity
                      style={[
                        styles.modalItem,
                        isSelected && styles.modalItemSelected,
                      ]}
                      onPress={() => {
                        setGender(item.value);
                        setShowGenderModal(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.modalItemText,
                          isSelected && styles.modalItemTextSelected,
                        ]}
                      >
                        {item.label}
                      </Text>
                      {isSelected && <Text style={styles.checkMark}>✓</Text>}
                    </TouchableOpacity>
                  );
                }}
              />
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setShowGenderModal(false)}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <Modal visible={showStatesModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View
              style={[
                styles.customModal,
                {
                  width: "92%",
                  maxHeight: "75%",
                },
              ]}
            >
              <Text style={styles.modalTitle}>Select Operating States</Text>

              <FlatList
                data={AUSTRALIAN_STATES}
                keyExtractor={(item) => item}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => {
                  const selected = selectedStates.includes(item);

                  return (
                    <TouchableOpacity
                      style={[
                        styles.modalItem,
                        selected && styles.modalItemSelected,
                      ]}
                      onPress={() => toggleState(item)}
                    >
                      <Text
                        style={[
                          styles.modalItemText,
                          selected && styles.modalItemTextSelected,
                        ]}
                      >
                        {item}
                      </Text>

                      <View
                        style={[
                          styles.stateCheckCircle,
                          selected && styles.stateCheckCircleSelected,
                        ]}
                      >
                        {selected && (
                          <CheckCircle size={14} color={COLORS.text} />
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                }}
              />

              <TouchableOpacity
                style={[
                  styles.continueButtonWrap,
                  {
                    marginTop: 15,
                  },
                ]}
                onPress={() => setShowStatesModal(false)}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={[COLORS.primary, "#017F76"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.continueButton}
                >
                  <Text style={styles.buttonText}>Done</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* ── Visa Status Modal ── */}
        <Modal visible={showResidentialModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.customModal}>
              <Text style={styles.modalTitle}>Select Visa Status</Text>
              <FlatList
                data={residentialOptions}
                keyExtractor={(item) => item.value}
                renderItem={({ item }) => {
                  const isSelected = residentialStatus === item.value;
                  return (
                    <TouchableOpacity
                      style={[
                        styles.modalItem,
                        isSelected && styles.modalItemSelected,
                      ]}
                      onPress={() => {
                        setResidentialStatus(item.value);
                        setShowResidentialModal(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.modalItemText,
                          isSelected && styles.modalItemTextSelected,
                        ]}
                      >
                        {item.label}
                      </Text>
                      {isSelected && <Text style={styles.checkMark}>✓</Text>}
                    </TouchableOpacity>
                  );
                }}
              />
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setShowResidentialModal(false)}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* ── Origin Country Modal ── */}
        <Modal visible={showCountryModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={[styles.customModal, { width: "92%", height: "70%" }]}>
              <Text style={styles.modalTitle}>Select Country of Birth</Text>
              <TextInput
                style={styles.searchInput}
                placeholder="Search country..."
                placeholderTextColor={COLORS.textMuted}
                value={countrySearch}
                onChangeText={setCountrySearch}
              />
              <FlatList
                data={STATIC_COUNTRIES.filter((c) =>
                  c.name.toLowerCase().includes(countrySearch.toLowerCase()),
                )}
                keyExtractor={(item) => item.code}
                style={{ flex: 1, marginBottom: 8 }}
                renderItem={({ item }) => {
                  const isSelected = originCountry === item.name;
                  return (
                    <TouchableOpacity
                      style={[
                        styles.modalItem,
                        isSelected && styles.modalItemSelected,
                      ]}
                      onPress={() => {
                        setOriginCountry(item.name);
                        setShowCountryModal(false);
                        setCountrySearch("");
                      }}
                    >
                      <Text
                        style={[
                          styles.modalItemText,
                          isSelected && styles.modalItemTextSelected,
                        ]}
                      >
                        {item.name}
                      </Text>
                      {isSelected && <Text style={styles.checkMark}>✓</Text>}
                    </TouchableOpacity>
                  );
                }}
              />
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => {
                  setShowCountryModal(false);
                  setCountrySearch("");
                }}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* ── Address section ── */}
        <SectionHeader
          title="Business Address"
          subtitle="Where you are located"
        />
        <View
          ref={addressFieldWrapperRef}
          style={[styles.card, { zIndex: 9999 }]}
          onLayout={(e) =>
            setAddressLayout({
              y: e.nativeEvent.layout.y,
              height: e.nativeEvent.layout.height,
            })
          }
        >
          <View style={[styles.field, { marginBottom: 0 }]}>
            <Text style={styles.label}>
              Business Address <Text style={styles.required}>*</Text>
            </Text>
            <LinearGradient
              colors={[COLORS.card, COLORS.surface]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.inputContainer}
            >
              <View style={styles.inputIconWrap}>
                <MapPin size={17} color={COLORS.primary} />
              </View>
              <TextInput
                ref={addressInputRef}
                style={styles.input}
                value={address}
                placeholder="Start typing your address..."
                placeholderTextColor={COLORS.textMuted}
                onFocus={scrollToAddressField}
                onChangeText={(text) => {
                  setAddress(text);
                  if (!text?.trim()) {
                    clearAddressFields();
                  }
                  fetchPlaces(text);
                }}
                autoCorrect={false}
              />

              {address.length > 0 && (
                <TouchableOpacity
                  onPress={() => {
                    setAddress("");
                    clearAddressFields();
                    setPredictions([]);
                    setShowSuggestions(false);
                    addressInputRef.current?.focus();
                  }}
                  style={{ marginLeft: 10, marginRight: 6 }}
                >
                  <X size={18} color={COLORS.textSecondary} />
                </TouchableOpacity>
              )}
            </LinearGradient>

            {/* ── Inline Suggestions List (Fixes visibility & VirtualizedList error) ── */}
            {showSuggestions && predictions.length > 0 && (
              <View style={styles.suggestionsContainer}>
                {predictions.map((item) => (
                  <TouchableOpacity
                    key={item.place_id}
                    activeOpacity={0.7}
                    onPress={() => {
                      Keyboard.dismiss();
                      fetchPlaceDetails(item.place_id, item.description);
                    }}
                    style={styles.suggestionItem}
                  >
                    <MapPin
                      size={16}
                      color={COLORS.textMuted}
                      style={{ marginRight: 8 }}
                    />
                    <Text style={styles.suggestionText}>
                      {item.description}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* City / State / Country chips */}
            {(userType === "staff" ||
              userType === "customer" ||
              userType === "contractor") &&
              (city || stateValue || country) && (
                <View style={styles.addressChipsRow}>
                  {!!city && (
                    <View style={styles.addressChip}>
                      <Text style={styles.addressChipText} numberOfLines={1}>
                        City: {city}
                      </Text>
                    </View>
                  )}
                  {!!stateValue && (
                    <View style={styles.addressChip}>
                      <Text style={styles.addressChipText} numberOfLines={1}>
                        State: {getStateAbbr(stateValue)}
                      </Text>
                    </View>
                  )}
                  {!!country && (
                    <View style={styles.addressChip}>
                      <Text style={styles.addressChipText} numberOfLines={1}>
                        Country: {country}
                      </Text>
                    </View>
                  )}
                </View>
              )}
          </View>
        </View>

        {/* Save / Next button */}
        <TouchableOpacity
          style={styles.continueButtonWrap}
          onPress={handleContinue}
          disabled={loading}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={[COLORS.primary, "#017F76"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.continueButton, loading && styles.buttonDisabled]}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.text} size="small" />
            ) : (
              <Text style={styles.buttonText}>{continueButtonLabel}</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>

        {/* Delete profile */}
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => navigation.navigate("DeleteProfileVerification")}
          activeOpacity={0.8}
        >
          <Text style={styles.deleteButtonText}>Delete Profile</Text>
        </TouchableOpacity>

        <View style={{ height: 80 }} />
      </KeyboardAwareScrollView>

      <Modal
        animationType="slide"
        transparent={true}
        visible={phoneVerifyModalVisible}
        onRequestClose={() => setPhoneVerifyModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.phoneVerifyModalContainer}>
            {/* Close button */}
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => setPhoneVerifyModalVisible(false)}
            >
              <X size={18} color={COLORS.primary} />
            </TouchableOpacity>

            <Text style={styles.phoneVerifyTitle}>
              Verify or change phone number
            </Text>

            {phoneVerifyStep === "enter_phone" ? (
              <>
                <Text style={styles.phoneVerifySubtitle}>
                  You can modify the number below before sending the
                  verification OTP.
                </Text>

                <Text style={styles.phoneVerifyLabel}>
                  Phone Number <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={styles.phoneVerifyInput}
                  value={phoneModalNumber}
                  onChangeText={setPhoneModalNumber}
                  placeholder="e.g. 0412 345 678"
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="phone-pad"
                  maxLength={15}
                  autoFocus
                />

                <View style={styles.modalButtonRow}>
                  <TouchableOpacity
                    style={styles.cancelModalBtn}
                    onPress={() => setPhoneVerifyModalVisible(false)}
                  >
                    <Text style={styles.cancelModalText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.sendOtpBtn,
                      isSendingOtp && styles.btnDisabled,
                    ]}
                    disabled={isSendingOtp}
                    onPress={handleSendOtp}
                  >
                    {isSendingOtp ? (
                      <ActivityIndicator size="small" color={COLORS.text} />
                    ) : (
                      <Text style={styles.sendOtpText}>Send OTP</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <Text style={styles.phoneVerifySubtitle}>
                  Enter the OTP sent to {phoneModalNumber}
                </Text>

                {/* Error banner */}
                {phoneOtpError ? (
                  <View style={styles.otpErrorBanner}>
                    <Text style={styles.otpErrorText}>{phoneOtpError}</Text>
                  </View>
                ) : null}

                <Text style={styles.phoneVerifyLabel}>
                  Enter OTP <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={styles.phoneOtpInput}
                  placeholder="Enter 6-digit OTP"
                  value={phoneOtp}
                  onChangeText={(t) => {
                    setPhoneOtp(t);
                    if (phoneOtpError) setPhoneOtpError("");
                  }}
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="numeric"
                  maxLength={6}
                  autoFocus
                />

                <TouchableOpacity
                  onPress={handleChangeNumberResend}
                  style={styles.resendLink}
                >
                  <Text style={styles.resendLinkText}>
                    Change number / Resend OTP
                  </Text>
                </TouchableOpacity>

                <View style={styles.modalButtonRow}>
                  <TouchableOpacity
                    style={styles.cancelModalBtn}
                    onPress={() => setPhoneVerifyModalVisible(false)}
                  >
                    <Text style={styles.cancelModalText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.verifyUpdateBtn,
                      (isVerifyingPhone || phoneOtp.length !== 6) &&
                        styles.btnDisabled,
                    ]}
                    disabled={isVerifyingPhone || phoneOtp.length !== 6}
                    onPress={handleVerifyPhone}
                  >
                    {isVerifyingPhone ? (
                      <ActivityIndicator size="small" color={COLORS.text} />
                    ) : (
                      <Text style={styles.verifyUpdateText}>
                        Verify & Update
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ─── Email OTP Modal ─────────────────────────────────────────────────── */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={otpModalVisible}
        onRequestClose={() => setOtpModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.otpModalContainer}>
            <Text style={styles.modalTitle}>Verify Email Change</Text>
            <Text style={styles.modalSubtitle}>
              Enter the OTP sent to{" "}
              <Text style={{ fontWeight: "bold", color: COLORS.text }}>
                {gmail}
              </Text>
            </Text>
            <TextInput
              style={styles.otpInput}
              placeholder="Enter 6-digit OTP"
              value={otp}
              onChangeText={setOtp}
              placeholderTextColor={COLORS.textMuted}
              keyboardType="numeric"
              maxLength={6}
              autoFocus
            />
            <View style={styles.modalButtonRow}>
              <TouchableOpacity
                style={styles.cancelModalBtn}
                onPress={() => {
                  setOtpModalVisible(false);
                  setOtp("");
                }}
              >
                <Text style={styles.cancelModalText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.verifyModalBtn,
                  isVerifyingOtp && styles.btnDisabled,
                ]}
                disabled={isVerifyingOtp || otp.length !== 6}
                onPress={handleVerifyAndSave}
              >
                {isVerifyingOtp ? (
                  <ActivityIndicator color={COLORS.text} size="small" />
                ) : (
                  <Text style={styles.verifyModalText}>Verify & Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingTop: 15,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 10,
  },

  // ─── Header ─────────────────────────────────────────────────────────────
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginHorizontal: -16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    marginBottom: 10,
  },
  headerBackBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(255,255,255,0.06)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.text,
    letterSpacing: 0.2,
  },

  // ─── Profile image ──────────────────────────────────────────────────────
  imageContainer: {
    alignSelf: "center",
    marginBottom: 22,
    position: "relative",
  },
  imageRing: {
    padding: 4,
    borderRadius: 62,
    borderWidth: 1.5,
    borderColor: COLORS.primaryBorder,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 14,
    elevation: 8,
  },
  profileImage: {
    width: 90,
    height: 90,
    borderRadius: 54,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  placeholderImage: {
    width: 90,
    height: 90,
    borderRadius: 54,
    backgroundColor: COLORS.card,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  uploadPhotoText: {
    fontSize: 9,
    color: COLORS.textSecondary,
    marginTop: 2,
    fontWeight: "600",
  },
  editIcon: {
    position: "absolute",
    bottom: 6,
    right: 6,
    backgroundColor: COLORS.primary,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: COLORS.background,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 6,
  },

  // ─── Section headers ────────────────────────────────────────────────────
  sectionHeaderWrap: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 5,
    marginTop: 4,
    gap: 10,
  },
  sectionHeaderBar: {
    width: 4,
    height: 26,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
  },
  sectionHeaderTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.text,
  },
  sectionHeaderSubtitle: {
    fontSize: 11.5,
    color: COLORS.textMuted,
    marginTop: 1,
  },

  // ─── Cards ──────────────────────────────────────────────────────────────
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    padding: 10,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 3,
  },

  field: {
    marginBottom: 8,
  },
  label: {
    fontSize: 10.5,
    fontWeight: "600",
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  fieldHint: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 5,
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    height: 42,
    paddingRight: 12,
  },
  inputContainerDisabled: {
    opacity: 0.65,
  },
  inputIconWrap: {
    width: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
  },
  required: {
    color: COLORS.danger,
    fontWeight: "700",
  },

  // ─── Phone field ────────────────────────────────────────────────────────
  phoneSingleContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    height: 48,
    paddingRight: 12,
  },
  phoneSingleInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
  },
  inlineActionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: COLORS.danger,
    borderRadius: 30,
    marginLeft: 8,
  },
  inlineChangeButton: {
    backgroundColor: "transparent",
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    paddingRight: 16,
    marginRight: 8,
  },
  inlineActionText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "700",
  },
  inlineChangeText: {
    color: COLORS.primary,
  },

  // ─── Continue / Delete buttons ──────────────────────────────────────────
  continueButtonWrap: {
    borderRadius: 16,
    marginTop: 8,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  continueButton: {
    paddingVertical: 10,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  deleteButton: {
    marginTop: 10,
    height: 45,
    borderWidth: 1,
    borderColor: COLORS.danger,
    backgroundColor: COLORS.dangerBg,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  deleteButtonText: {
    color: COLORS.danger,
    fontSize: 14,
    fontWeight: "700",
  },

  // ─── Modals (generic) ───────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "center",
    alignItems: "center",
  },
  customModal: {
    width: "85%",
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 16,
    maxHeight: "50%",
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 16,
    color: COLORS.text,
  },
  modalItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: "transparent",
  },
  modalItemSelected: {
    backgroundColor: COLORS.primaryGlow,
    borderColor: COLORS.primaryBorder,
  },
  modalItemText: {
    fontSize: 15,
    color: COLORS.text,
  },
  modalItemTextSelected: {
    color: COLORS.primary,
    fontWeight: "700",
  },
  checkMark: {
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: "700",
  },
  cancelBtn: {
    marginTop: 8,
    padding: 14,
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  cancelText: {
    color: COLORS.textSecondary,
    fontWeight: "600",
  },
  searchInput: {
    height: 46,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 12,
    paddingHorizontal: 14,
    color: COLORS.text,
    backgroundColor: COLORS.surface,
    marginBottom: 12,
  },
  stateCheckCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.textMuted,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
  },
  stateCheckCircleSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary,
  },

  // ─── OTP modal (email) ──────────────────────────────────────────────────
  otpModalContainer: {
    width: "88%",
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 22,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  modalSubtitle: {
    fontSize: 12.5,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginBottom: 18,
    lineHeight: 18,
  },
  otpInput: {
    width: "100%",
    height: 52,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 14,
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 20,
    backgroundColor: COLORS.surface,
    color: COLORS.text,
    letterSpacing: 6,
  },
  modalButtonRow: {
    flexDirection: "row",
    width: "100%",
    gap: 12,
  },
  cancelModalBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    backgroundColor: COLORS.surface,
  },
  cancelModalText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: "600",
  },
  verifyModalBtn: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    alignItems: "center",
  },
  verifyModalText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "700",
  },
  btnDisabled: {
    opacity: 0.6,
  },

  // ─── Phone Verify Modal ─────────────────────────────────────────────────
  phoneVerifyModalContainer: {
    width: "90%",
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 24,
    position: "relative",
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  closeBtn: {
    position: "absolute",
    top: 16,
    right: 16,
    zIndex: 10,
    padding: 4,
  },
  phoneVerifyTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 8,
    marginRight: 28,
  },
  phoneVerifySubtitle: {
    fontSize: 12.5,
    color: COLORS.textSecondary,
    marginBottom: 20,
    lineHeight: 19,
  },
  phoneVerifyLabel: {
    fontSize: 13.5,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 8,
  },
  phoneVerifyInput: {
    width: "100%",
    height: 52,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 16,
    color: COLORS.text,
    backgroundColor: COLORS.surface,
    marginBottom: 20,
  },
  otpErrorBanner: {
    backgroundColor: COLORS.dangerBg,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
  },
  otpErrorText: {
    color: COLORS.danger,
    fontSize: 13.5,
    fontWeight: "500",
  },
  phoneOtpInput: {
    width: "100%",
    height: 52,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.text,
    backgroundColor: COLORS.surface,
    textAlign: "center",
    letterSpacing: 8,
    marginBottom: 12,
  },
  resendLink: {
    alignSelf: "flex-end",
    marginBottom: 20,
  },
  resendLinkText: {
    fontSize: 12.5,
    color: COLORS.textSecondary,
    textDecorationLine: "underline",
  },
  sendOtpBtn: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    alignItems: "center",
  },
  sendOtpText: {
    color: COLORS.text,
    fontSize: 13.5,
    fontWeight: "700",
  },
  verifyUpdateBtn: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    alignItems: "center",
  },
  verifyUpdateText: {
    color: COLORS.text,
    fontSize: 13.5,
    fontWeight: "700",
  },

  // ─── Chips ──────────────────────────────────────────────────────────────
  chipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 8,
  },
  stateChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primaryGlow,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 6,
    marginBottom: 6,
    gap: 6,
  },
  stateChipText: {
    color: COLORS.primary,
    fontSize: 12.5,
    fontWeight: "600",
  },
  addressChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 10,
    marginHorizontal: -4,
  },
  addressChip: {
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
    backgroundColor: COLORS.primaryGlow,
    marginHorizontal: 4,
    marginBottom: 5,
  },
  addressChipText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: "600",
  },

  // ─── Suggestions ────────────────────────────────────────────────────────
  suggestionsContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    marginTop: 8,
    elevation: 5,
    zIndex: 1000,
    overflow: "hidden",
  },
  suggestionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  suggestionText: {
    fontSize: 13.5,
    color: COLORS.text,
    flex: 1,
  },

  // ─── Control Room License switch ────────────────────────────────────────
  crlContainer: {
    paddingHorizontal: 14,
  },
  crlLabel: {
    flex: 1,
    fontSize: 13,
    color: COLORS.text,
  },
  crlSwitch: {
    width: 56,
    height: 28,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 3,
  },
  crlSwitchYes: {
    backgroundColor: COLORS.primary,
    justifyContent: "space-between",
  },
  crlSwitchNo: {
    backgroundColor: COLORS.textMuted,
    justifyContent: "space-between",
  },
  crlKnob: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.text,
  },
  crlTextYes: {
    color: COLORS.text,
    fontSize: 10.5,
    fontWeight: "800",
    marginLeft: 6,
  },
  crlTextNo: {
    color: COLORS.background,
    fontSize: 10.5,
    fontWeight: "800",
    marginRight: 6,
  },
});
