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
} from "react-native";

import AsyncStorage from "@react-native-async-storage/async-storage";
import Toast from "react-native-toast-message";
import {
  BASE_URL,
  getAuthToken,
  getUserProfile,
  updateUserProfile,
} from "../services/authApi";
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

const GOOGLE_API_KEY = "AIzaSyCS-DB39Kk-Z25C5GWymVGshXIALbjXPGY";

const COLORS = {
  brand: "#0A7C6E",
  brandDark: "#111111",
  brandLight: "#021d37",
  accent: "#89E7D0",
  success: "#89E7D0",
  error: "#EF4444",
  background: "#171d30",
  surface: "#121722",
  surfaceLight: "#171d30",
  textPrimary: "#E5E7EB",
  textSecondary: "#94A3B8",
  textMuted: "#64748B",
  border: "#1F2A44",
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

// ─── Date helpers ──────────────────────────────────────────────────────────────
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

// ─── InputField ────────────────────────────────────────────────────────────────
const InputField = ({
  icon: Icon,
  label,
  value,
  onChange,
  editable = true,
  placeholder = "",
  keyboardType = "default",
}: any) => (
  <View style={styles.field}>
    <Text style={styles.label}>{label}</Text>
    <LinearGradient
      colors={["#171d30", "#171d30"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.inputContainer}
    >
      <Icon size={20} color="#fff" style={styles.inputIcon} />
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="rgba(255,255,255,0.6)"
        editable={editable}
        keyboardType={keyboardType}
        autoCapitalize="sentences"
        returnKeyType="done"
        onSubmitEditing={Keyboard.dismiss}
      />
    </LinearGradient>
  </View>
);

// ─── Main Component ────────────────────────────────────────────────────────────
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
  const scrollRef = useRef<ScrollView>(null);
  const addressInputRef = useRef<TextInput>(null);

  // ─── Email OTP state ─────────────────────────────────────────────────────────
  const [otp, setOtp] = useState<string>("");
  const [otpModalVisible, setOtpModalVisible] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);

  // ─── Phone verification state ─────────────────────────────────────────────────
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

  // ─── Phone handler ──────────────────────────────────────────────────────────
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

  // ─── Load profile ───────────────────────────────────────────────────────────
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

        // const BASE_IMAGE_URL = "https://apis.staffoo.com.au/storage/";
        const BASE_IMAGE_URL = "https://staging.apis.staffoo.com.au/storage/";

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

        // ── Phone verified status ──
        // phone_verified: 1 = verified, 0 = not verified
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
          setPhoneNumber(profile?.contractor?.phone ?? "");
          setCompanyName(profile?.contractor?.company_name ?? "");
          setRegistrationNumber(profile?.contractor?.registration_number ?? "");
          setAcn(profile?.contractor?.acn ?? "");
          setAbn(profile?.contractor?.abn ?? "");
        } else if (profile?.user_type === "staff") {
          setPhoneNumber(profile?.staff?.phone ?? "");
          setGender(profile?.staff?.gender ?? null);
          setResidentialStatus(profile?.staff?.staff_document_type ?? null);
          setSecurityLicenseNo(profile?.staff?.security_license_no ?? "");

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

  // ─── Google Places ──────────────────────────────────────────────────────────
  const fetchPlaces = async (text: string) => {
    if (text.length < 3) {
      setPredictions([]);
      setShowSuggestions(false);
      return;
    }
    try {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${text}&key=${GOOGLE_API_KEY}`,
      );
      const json = await res.json();
      setPredictions(json.predictions || []);
      setShowSuggestions(true);
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

  // ─── Validation ─────────────────────────────────────────────────────────────
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
      (phoneNumber.startsWith("03") && phoneNumber.length === 11) ||
      (phoneNumber.startsWith("+92") && phoneNumber.length === 13) ||
      (phoneNumber.startsWith("+1") && phoneNumber.length === 12) ||
      (!phoneNumber.startsWith("+") && phoneNumber.length === 10);

    if (!isValidPhone) {
      Toast.show({ type: "error", text1: "Please enter a valid phone number" });
      return false;
    }

    if (userType === "contractor") {
      if (!companyName.trim()) {
        Toast.show({ type: "error", text1: "Company Name is required" });
        return false;
      }
    }

    if (userType === "staff") {
      if (!dateOfBirth.trim()) {
        Toast.show({ type: "error", text1: "Date of Birth is required" });
        return false;
      }
      if (!gender) {
        Toast.show({ type: "error", text1: "Gender is required" });
        return false;
      }
      if (!residentialStatus) {
        Toast.show({ type: "error", text1: "Residential Status is required" });
        return false;
      }
      if (!securityLicenseNo?.trim()) {
        Toast.show({
          type: "error",
          text1: "Security License Number is required",
        });
        return false;
      }
    }
    return true;
  };

  // ─── Image picker ───────────────────────────────────────────────────────────
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

  // ─── Phone Verification Handlers ─────────────────────────────────────────────
  const openPhoneVerifyModal = () => {
    setPhoneModalNumber(phoneNumber);
    setPhoneOtp("");
    setPhoneOtpError("");
    setPhoneVerifyStep("enter_phone");
    setPhoneVerifyModalVisible(true);
  };

  // ─── Send OTP ─────────────────────────────────────────────────────────────
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

  // ─── Verify Phone ─────────────────────────────────────────────────────────
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

  // ─── Save / Continue ────────────────────────────────────────────────────────
  const handleContinue = async () => {
    Keyboard.dismiss();
    if (!validateForm() || !userId) return;

    const emailChanged =
      gmail.trim().toLowerCase() !== originalGmail.trim().toLowerCase();
    setLoading(true);

    try {
      const payload: Record<string, any> = {
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
        payload.origin_country = originCountry.trim();
        payload.security_license_no = securityLicenseNo.trim();
        if (dateOfBirth?.trim()) {
          const dobApi = australianToApiDate(dateOfBirth);
          if (dobApi) payload.date_of_birth = dobApi;
        }
        payload.gender = gender;
        payload.staff_document_type = residentialStatus;
      }

      if (userType === "contractor") {
        payload.company_name = companyName.trim();
        payload.registration_number = registrationNumber.trim();
        payload.acn = acn.trim();
        payload.abn = abn.trim();
      }

      if (imageFile) {
        payload.profile_image = imageFile;
      }

      console.log(
        "🔥 FINAL PROFILE PAYLOAD:",
        JSON.stringify(payload, null, 2),
      );

      await updateUserProfile(userId, payload);

      if (emailChanged && userType === "customer") {
        setOtpModalVisible(true);
        setLoading(false);
        return;
      }

      Toast.show({ type: "success", text1: "Profile Updated Successfully" });
      setOriginalGmail(gmail.trim().toLowerCase());
      navigation.navigate("MainTabs", {
        screen: "Profile", // ← exact name used in your MainTabs
      });
    } catch (err: any) {
      console.log("UPDATE ERROR:", err?.response?.data || err);
      const errorMsg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        "Failed to update profile";
      Toast.show({ type: "error", text1: errorMsg, position: "bottom" });
    } finally {
      setLoading(false);
    }
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

  // ─── Loading state ──────────────────────────────────────────────────────────
  if (fetching) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator
          size="large"
          color="#2EB1E2"
          style={{ marginTop: 100 }}
        />
      </SafeAreaView>
    );
  }

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        onScroll={(e) => setScrollY(e.nativeEvent.contentOffset.y)}
        scrollEventThrottle={16}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <ArrowLeft size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Complete Your Profile</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Profile image */}
        <TouchableOpacity onPress={pickImage} style={styles.imageContainer}>
          {profileImage ? (
            <Image source={{ uri: profileImage }} style={styles.profileImage} />
          ) : (
            <View style={styles.placeholderImage}>
              <User size={30} color="#fff" />
              <Text style={{ fontSize: 12, color: "#fff" }}>Upload Photo</Text>
            </View>
          )}
          <View style={styles.editIcon}>
            <Edit2 size={16} color="#fff" />
          </View>
        </TouchableOpacity>

        {/* Full Name */}
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

        {/* ─── Phone Field with Verify Button ─────────────────────────────────── */}
        {/* ─── Phone Field with Verify Button ─────────────────────────────────── */}
        <View style={styles.field}>
          <View style={styles.phoneLabelRow}>
            <Text style={styles.label}>
              Phone Number <Text style={styles.required}>*</Text>
            </Text>
            {phoneVerified ? (
              <View style={styles.verifiedBadge}>
                <CheckCircle size={14} color="#0A7C6E" />
                <Text style={styles.verifiedBadgeText}>Verified</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.notVerifiedBadge}
                onPress={openPhoneVerifyModal}
                activeOpacity={0.8}
              >
                <Text style={styles.notVerifiedBadgeText}>Not Verified</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.phoneRow}>
            <LinearGradient
              colors={["#171d30", "#171d30"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[
                styles.phoneInputContainer,
                phoneVerified && styles.phoneInputVerified, // ← New style for verified state
              ]}
            >
              <Phone
                size={20}
                color={phoneVerified ? "#0A7C6E" : COLORS.error}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                value={phoneNumber}
                onChangeText={handlePhoneChange}
                placeholder="0412 345 678"
                placeholderTextColor="rgba(255,255,255,0.6)"
                keyboardType="default"
                maxLength={15}
                returnKeyType="done"
                onSubmitEditing={Keyboard.dismiss}
                editable={!phoneVerified} // ← DISABLE when verified
                selectTextOnFocus={!phoneVerified}
              />
            </LinearGradient>

            {!phoneVerified && (
              <TouchableOpacity
                style={styles.verifyNowBtn}
                onPress={openPhoneVerifyModal}
                activeOpacity={0.85}
              >
                <Text style={styles.verifyNowText}>Verify Now</Text>
              </TouchableOpacity>
            )}
          </View>

          {!phoneVerified && (
            <View style={styles.verificationWarning}>
              <Text style={styles.warningIcon}>ⓘ</Text>
              <Text style={styles.warningText}>
                Verification is required to enable full functionality.
              </Text>
            </View>
          )}
        </View>

        {/* Email (read-only) */}
        <View style={styles.field}>
          <Text style={styles.label}>
            Email <Text style={styles.required}>*</Text>
          </Text>
          <LinearGradient
            colors={["#171d30", "#171d30"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.inputContainer}
          >
            <Mail size={20} color="#fff" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={gmail}
              editable={false}
              placeholder="yourname@gmail.com"
              placeholderTextColor="#fff"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </LinearGradient>
        </View>

        {/* ── Contractor-specific fields ── */}
        {userType === "contractor" && (
          <>
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
              onChange={(text: string) => {
                const cleaned = text.replace(/\D/g, "");
                if (cleaned.length <= 9) setAcn(cleaned);
              }}
              placeholder="Enter ACN (9 digits)"
              keyboardType="numeric"
            />
            <InputField
              icon={FileText}
              label="ABN (Australian Business Number)"
              value={abn}
              onChange={(text: string) => {
                const cleaned = text.replace(/\D/g, "");
                if (cleaned.length <= 11) setAbn(cleaned);
              }}
              placeholder="Enter ABN (11 digits)"
              keyboardType="numeric"
            />
          </>
        )}

        {/* Country of Origin — staff only */}
        {userType === "staff" && (
          <TouchableOpacity
            style={styles.field}
            onPress={() => setShowCountryModal(true)}
          >
            <Text style={styles.label}>
              Country of Origin <Text style={styles.required}>*</Text>
            </Text>
            <LinearGradient
              colors={["#171d30", "#171d30"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.inputContainer}
            >
              <Globe size={20} color="#fff" style={styles.inputIcon} />
              <Text
                style={[
                  styles.input,
                  !originCountry && { color: "rgba(255,255,255,0.6)" },
                ]}
              >
                {originCountry || "Select Country of Origin"}
              </Text>
              <ChevronDown size={20} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* ── Staff-specific fields ── */}
        {userType === "staff" && (
          <>
            {/* Gender dropdown */}
            <TouchableOpacity
              style={styles.field}
              onPress={() => setShowGenderModal(true)}
            >
              <Text style={styles.label}>
                Gender <Text style={styles.required}>*</Text>
              </Text>
              <LinearGradient
                colors={["#171d30", "#171d30"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.inputContainer}
              >
                <User size={20} color="#fff" style={styles.inputIcon} />
                <Text
                  style={[
                    styles.input,
                    !gender && { color: "rgba(255,255,255,0.6)" },
                  ]}
                >
                  {gender
                    ? genderOptions.find((o) => o.value === gender)?.label
                    : "Select Gender"}
                </Text>
                <ChevronDown size={20} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>

            {/* Security License */}
            <View style={styles.field}>
              <Text style={styles.label}>
                Security License Number <Text style={styles.required}>*</Text>
              </Text>
              <LinearGradient
                colors={["#171d30", "#171d30"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.inputContainer}
              >
                <FileText size={20} color="#fff" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={securityLicenseNo}
                  onChangeText={setSecurityLicenseNo}
                  placeholder="Enter Security License Number"
                  placeholderTextColor="rgba(255,255,255,0.6)"
                  autoCapitalize="characters"
                />
              </LinearGradient>
            </View>

            {/* Date of birth */}
            <TouchableOpacity
              style={styles.field}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={styles.label}>
                Date of Birth <Text style={styles.required}>*</Text>
              </Text>
              <LinearGradient
                colors={["#171d30", "#171d30"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.inputContainer}
              >
                <Calendar size={20} color="#fff" style={styles.inputIcon} />
                <Text
                  style={[
                    styles.input,
                    !dateOfBirth && { color: "rgba(255,255,255,0.6)" },
                  ]}
                >
                  {dateOfBirth || "DD/MM/YYYY"}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

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

            {/* Residential status dropdown */}
            <TouchableOpacity
              style={styles.field}
              onPress={() => setShowResidentialModal(true)}
            >
              <Text style={styles.label}>
                Residential Status <Text style={styles.required}>*</Text>
              </Text>
              <LinearGradient
                colors={["#171d30", "#171d30"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.inputContainer}
              >
                <Globe size={20} color="#fff" style={styles.inputIcon} />
                <Text
                  style={[
                    styles.input,
                    !residentialStatus && { color: "rgba(255,255,255,0.6)" },
                  ]}
                >
                  {residentialStatus
                    ? residentialOptions.find(
                        (o) => o.value === residentialStatus,
                      )?.label
                    : "Select Residential Status"}
                </Text>
                <ChevronDown size={20} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>
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

        {/* ── Residential Status Modal ── */}
        <Modal visible={showResidentialModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.customModal}>
              <Text style={styles.modalTitle}>Select Residential Status</Text>
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
              <Text style={styles.modalTitle}>Select Country of Origin</Text>
              <TextInput
                style={styles.searchInput}
                placeholder="Search country..."
                placeholderTextColor="rgba(255,255,255,0.5)"
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
        <View
          style={styles.field}
          onLayout={(event) => {
            const { y, height } = event.nativeEvent.layout;
            setAddressLayout({ y, height });
          }}
        >
          <Text style={styles.label}>
            Address <Text style={styles.required}>*</Text>
          </Text>
          <LinearGradient
            colors={["#171d30", "#171d30"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.inputContainer}
          >
            <MapPin size={20} color="#fff" style={styles.inputIcon} />
            <TextInput
              ref={addressInputRef}
              style={styles.input}
              value={address}
              placeholder="Start typing your address..."
              placeholderTextColor="rgba(255, 255, 255, 0.96)"
              onChangeText={(text) => {
                setAddress(text);
                fetchPlaces(text);
              }}
              autoCorrect={false}
            />
            {address.length > 0 && (
              <TouchableOpacity
                onPress={() => {
                  setAddress("");
                  setPredictions([]);
                  setShowSuggestions(false);
                  addressInputRef.current?.focus();
                }}
                style={{ marginLeft: 10, marginRight: 10 }}
              >
                <X size={20} color="#fff" />
              </TouchableOpacity>
            )}
          </LinearGradient>
        </View>

        {/* City / State / Country — auto-filled */}
        {(userType === "staff" ||
          userType === "customer" ||
          userType === "contractor") && (
          <>
            <InputField
              icon={MapPin}
              label="City"
              value={city}
              onChange={() => {}}
              editable={false}
              placeholder="City will appear here"
            />
            <InputField
              icon={Building2}
              label="State"
              value={stateValue}
              onChange={() => {}}
              editable={false}
              placeholder="State will appear here"
            />
            <InputField
              icon={Globe}
              label="Country"
              value={country}
              onChange={() => {}}
              editable={false}
              placeholder="Country will appear here"
            />
          </>
        )}

        {/* Save button */}
        <TouchableOpacity
          style={[styles.continueButton, loading && styles.buttonDisabled]}
          onPress={handleContinue}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.buttonText}>Save</Text>
          )}
        </TouchableOpacity>

        {/* Delete profile */}
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => navigation.navigate("DeleteProfileVerification")}
          activeOpacity={0.8}
        >
          <Text style={styles.deleteButtonText}>Delete Profile</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Address suggestions overlay */}
      {showSuggestions && predictions.length > 0 && (
        <FlatList
          data={predictions}
          keyExtractor={(item) => item.place_id}
          keyboardShouldPersistTaps="handled"
          style={[
            styles.suggestionsList,
            {
              position: "absolute",
              top: addressLayout.y - scrollY + addressLayout.height + 30,
              left: 24,
              right: 24,
              zIndex: 9999,
            },
          ]}
          renderItem={({ item }) => (
            <TouchableOpacity
              activeOpacity={0.7}
              delayPressIn={0}
              onPress={() => {
                Keyboard.dismiss();
                fetchPlaceDetails(item.place_id, item.description);
              }}
              style={styles.suggestionItem}
            >
              <MapPin size={18} color="#666" style={{ marginRight: 8 }} />
              <Text style={styles.suggestionText}>{item.description}</Text>
            </TouchableOpacity>
          )}
        />
      )}

      {/* ─── Phone Verify Modal ────────────────────────────────────────────────── */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={phoneVerifyModalVisible}
        onRequestClose={() => setPhoneVerifyModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.phoneVerifyModalContainer}>
            {/* Close button */}
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => setPhoneVerifyModalVisible(false)}
            >
              <X size={20} color={COLORS.textPrimary} />
            </TouchableOpacity>

            <Text style={styles.phoneVerifyTitle}>
              Verify Or Change Phone Number
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
                  placeholder="Enter phone number"
                  placeholderTextColor="#9CA3AF"
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
                      <ActivityIndicator size="small" color="#fff" />
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
                  placeholderTextColor="#9CA3AF"
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
                      <ActivityIndicator size="small" color="#fff" />
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
        </View>
      </Modal>

      {/* ─── Email OTP Modal ─────────────────────────────────────────────────── */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={otpModalVisible}
        onRequestClose={() => setOtpModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.otpModalContainer}>
            <Text style={styles.modalTitle}>Verify Email Change</Text>
            <Text style={styles.modalSubtitle}>
              Enter the OTP sent to{" "}
              <Text style={{ fontWeight: "bold" }}>{gmail}</Text>
            </Text>
            <TextInput
              style={styles.otpInput}
              placeholder="Enter 6-digit OTP"
              value={otp}
              onChangeText={setOtp}
              placeholderTextColor="#9CA3AF"
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
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.verifyModalText}>Verify & Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.brandDark,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.brandDark,
    paddingTop: 25,
  },
  phoneInputVerified: {
    borderColor: "#0A7C6E",
    backgroundColor: "rgba(10, 124, 110, 0.1)",
    // Make it fully rounded when verified
    borderTopRightRadius: 50,
    borderBottomRightRadius: 50,
  },
  scrollContent: {
    paddingHorizontal: 15,
    paddingBottom: 50,
  },
  deleteButton: {
    marginTop: 12,
    marginBottom: 20,
    height: 52,
    borderWidth: 1,
    borderColor: "#EF4444",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  deleteButtonText: {
    color: "#EF4444",
    fontSize: 16,
    fontWeight: "600",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    marginHorizontal: 5,
    borderRadius: 16,
    marginBottom: 7,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  imageContainer: {
    alignSelf: "center",
    marginBottom: 5,
    position: "relative",
  },
  profileImage: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 2,
    borderColor: COLORS.brand,
  },
  placeholderImage: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: COLORS.surface,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  editIcon: {
    position: "absolute",
    bottom: 5,
    right: 5,
    backgroundColor: COLORS.brand,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
  },
  field: {
    marginBottom: 10,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textSecondary,
    marginBottom: 5,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 50,
    borderWidth: 1,
    borderColor: "#5d5c5ccc",
    height: 42,
  },
  inputIcon: {
    marginRight: 9,
    marginLeft: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  required: {
    color: COLORS.error,
    fontWeight: "700",
  },

  // ─── Phone field styles ───────────────────────────────────────────────────────
  phoneLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 5,
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(10, 124, 110, 0.15)",
    borderWidth: 1,
    borderColor: COLORS.brand,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
    gap: 4,
  },
  verifiedBadgeText: {
    fontSize: 12,
    color: COLORS.brand,
    fontWeight: "600",
  },
  notVerifiedBadge: {
    borderWidth: 1.5,
    borderColor: COLORS.error,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  notVerifiedBadgeText: {
    fontSize: 12,
    color: COLORS.error,
    fontWeight: "600",
  },
  phoneRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 0,
  },
  phoneInputContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#5d5c5ccc",
    height: 42,
    // Default: left side rounded only
    borderTopLeftRadius: 50,
    borderBottomLeftRadius: 50,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
  },
  phoneInputNotVerified: {
    borderColor: COLORS.error,
  },
  verifyNowBtn: {
    backgroundColor: COLORS.error,
    height: 42,
    paddingHorizontal: 14,
    justifyContent: "center",
    alignItems: "center",
    borderTopRightRadius: 50,
    borderBottomRightRadius: 50,
  },
  verifyNowText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
  verificationWarning: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 5,
    gap: 5,
  },
  warningIcon: {
    color: COLORS.error,
    fontSize: 13,
  },
  warningText: {
    fontSize: 12,
    color: COLORS.error,
    flex: 1,
  },

  // ─── Phone Verify Modal ───────────────────────────────────────────────────────
  phoneVerifyModalContainer: {
    width: "90%",
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    position: "relative",
  },
  closeBtn: {
    position: "absolute",
    top: 16,
    right: 16,
    zIndex: 10,
    padding: 4,
  },
  phoneVerifyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111",
    marginBottom: 8,
    marginRight: 28,
  },
  phoneVerifySubtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 20,
    lineHeight: 20,
  },
  phoneVerifyLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111",
    marginBottom: 8,
  },
  phoneVerifyInput: {
    width: "100%",
    height: 52,
    borderWidth: 1.5,
    borderColor: "#3B82F6",
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 16,
    color: "#111",
    backgroundColor: "#fff",
    marginBottom: 20,
  },
  otpErrorBanner: {
    backgroundColor: "#FEE2E2",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
  },
  otpErrorText: {
    color: "#DC2626",
    fontSize: 14,
    fontWeight: "500",
  },
  phoneOtpInput: {
    width: "100%",
    height: 52,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 15,
    fontWeight: "700",
    color: "#111",
    backgroundColor: "#fff",
    textAlign: "center",
    letterSpacing: 8,
    marginBottom: 12,
  },
  resendLink: {
    alignSelf: "flex-end",
    marginBottom: 20,
  },
  resendLinkText: {
    fontSize: 13,
    color: "#6B7280",
    textDecorationLine: "underline",
  },
  sendOtpBtn: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: COLORS.brand,
    borderRadius: 12,
    alignItems: "center",
  },
  sendOtpText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  verifyUpdateBtn: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: COLORS.brand,
    borderRadius: 12,
    alignItems: "center",
  },
  verifyUpdateText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },

  continueButton: {
    backgroundColor: "#0A7C6E",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 15,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  suggestionsList: {
    position: "absolute",
    top: 50,
    left: 24,
    right: 24,
    maxHeight: 300,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#cccccc",
  },
  suggestionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  suggestionText: {
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  customModal: {
    width: "85%",
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    maxHeight: "50%",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 16,
    color: COLORS.textPrimary,
  },
  modalItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalItemSelected: {
    backgroundColor: "rgba(10, 124, 110, 0.2)",
  },
  modalItemText: {
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  modalItemTextSelected: {
    color: COLORS.brand,
    fontWeight: "700",
  },
  checkMark: {
    fontSize: 16,
    color: COLORS.brand,
    fontWeight: "700",
  },
  cancelBtn: {
    marginTop: 12,
    padding: 14,
    alignItems: "center",
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 12,
  },
  cancelText: {
    color: COLORS.textSecondary,
    fontWeight: "600",
  },
  searchInput: {
    height: 44,
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 10,
    paddingHorizontal: 12,
    color: "#fff",
    marginBottom: 12,
  },
  otpModalContainer: {
    width: "88%",
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 22,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginBottom: 18,
  },
  otpInput: {
    width: "100%",
    height: 50,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    fontSize: 14,
    textAlign: "center",
    marginBottom: 20,
    backgroundColor: COLORS.brandDark,
    color: COLORS.textPrimary,
    letterSpacing: 5,
  },
  modalButtonRow: {
    flexDirection: "row",
    width: "100%",
    gap: 12,
  },
  cancelModalBtn: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cancelModalText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: "600",
  },
  verifyModalBtn: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: COLORS.brand,
    borderRadius: 12,
    alignItems: "center",
  },
  verifyModalText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  btnDisabled: {
    opacity: 0.6,
  },
});
