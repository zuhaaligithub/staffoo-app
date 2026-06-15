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
import { getUserProfile, updateUserProfile } from "../services/authApi";
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
type Props = { navigation: any };

export default function ProfileSetupScreen({ navigation }: Props) {
  // ==================== ALL HOOKS MUST BE HERE (TOP) ====================
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [gmail, setGmail] = useState("");
  const [originalGmail, setOriginalGmail] = useState("");
  const [gender, setGender] = useState<string | null>(null);
  const [userType, setUserType] = useState<string | null>(null);
  const [residentialStatus, setResidentialStatus] = useState<string | null>(
    null,
  );

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
  const [securityLicenseNo, setSecurityLicenseNo] = useState("");
  const [scrollY, setScrollY] = useState(0);
  const [companyName, setCompanyName] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [stateValue, setStateValue] = useState("");
  const [country, setCountry] = useState("");
  const [coordinates, setCoordinates] = useState<any>(null);
  const [acn, setAcn] = useState(""); // ← NEW
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

  const [otp, setOtp] = useState<string>("");
  const [otpModalVisible, setOtpModalVisible] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [originCountry, setOriginCountry] = useState("");
  // Custom Dropdown States
  const [showGenderModal, setShowGenderModal] = useState(false);
  const [showResidentialModal, setShowResidentialModal] = useState(false);
  const [dateOfBirth, setDateOfBirth] = useState(""); // Now stores DD/MM/YYYY
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempDate, setTempDate] = useState(new Date());
  const genderOptions = [
    { label: "Male", value: "male" },
    { label: "Female", value: "female" },
    { label: "Prefer Not To Say", value: "other" },
  ];

  const residentialOptions = [
    { label: "Student Visa", value: "student_visa" },
    { label: "Bridging Visa", value: "bridging_visa" },
    { label: "Citizen", value: "citizen" },
    { label: "Permanent Residence", value: "permanent_residence" },
    { label: "Visa Subclass 485", value: "visa_485" },
  ];

  const getCountryCode = (countryName: string) => {
    const countryMap: Record<string, string> = {
      Pakistan: "PAK",
      Australia: "AUS",
      India: "IND",
      Canada: "CAN",
      "United States": "USA",
      "United Kingdom": "GBR",
      Germany: "DEU",
      France: "FRA",
      China: "CHN",
      Japan: "JPN",
      // add more as needed
    };

    return countryMap[countryName] || countryName;
  };
  const handlePhoneChange = (text: string) => {
    // keep only digits and one +
    let cleaned = text.replace(/[^\d+]/g, "");

    // allow only one + at beginning
    if (cleaned.includes("+")) {
      cleaned = "+" + cleaned.replace(/\+/g, "").replace(/^\+/, "");
    }

    // =========================
    // PAKISTAN
    // =========================

    // +92xxxxxxxxxx
    if (cleaned.startsWith("+92")) {
      cleaned = "+92" + cleaned.slice(3).replace(/\D/g, "");

      // total length = 13
      if (cleaned.length > 13) {
        cleaned = cleaned.slice(0, 13);
      }
    }

    // 03xxxxxxxxx
    else if (cleaned.startsWith("03")) {
      cleaned = cleaned.replace(/\D/g, "");

      // total length = 11
      if (cleaned.length > 11) {
        cleaned = cleaned.slice(0, 11);
      }
    } else if (cleaned.startsWith("+1")) {
      cleaned = "+1" + cleaned.slice(2).replace(/\D/g, "");

      // +1 + 10 digits = 12 chars total
      if (cleaned.length > 12) {
        cleaned = cleaned.slice(0, 12);
      }
    }

    // US/Canada local (10 digits)
    else if (!cleaned.startsWith("+") && cleaned.length > 0) {
      const digits = cleaned.replace(/\D/g, "");

      // if 10 digits, assume US/Canada format
      if (digits.length <= 10) {
        cleaned = digits.slice(0, 10);
      }
    }

    // =========================
    // AUSTRALIA
    // =========================

    // +61xxxxxxxxx
    else if (cleaned.startsWith("+61")) {
      cleaned = "+61" + cleaned.slice(3).replace(/\D/g, "");

      // total length = 12
      if (cleaned.length > 12) {
        cleaned = cleaned.slice(0, 12);
      }
    }

    // 04xxxxxxxx
    else if (cleaned.startsWith("0")) {
      cleaned = cleaned.replace(/\D/g, "");

      // total length = 10
      if (cleaned.length > 10) {
        cleaned = cleaned.slice(0, 10);
      }
    }

    // OTHER COUNTRIES
    else {
      // allow max 15 digits international standard
      cleaned = cleaned.replace(/[^\d+]/g, "");

      if (cleaned.length > 15) {
        cleaned = cleaned.slice(0, 15);
      }
    }

    setPhoneNumber(cleaned);
  };

  // Optional: Add this for better UX (formatting with spaces)
  const formatPhoneForDisplay = (num: string): string => {
    if (!num) return "";

    // Australia +61
    if (num.startsWith("+61")) {
      return num.replace(/(\+61)(\d{3})(\d{3})(\d{3})/, "$1 $2 $3 $4").trim();
    }

    // Australia local
    if (num.startsWith("0") && num.length <= 10) {
      return num.replace(/(\d{4})(\d{3})(\d{3})/, "$1 $2 $3").trim();
    }

    // Pakistan +92
    if (num.startsWith("+92")) {
      return num.replace(/(\+92)(\d{3})(\d{7})/, "$1 $2 $3").trim();
    }

    // Pakistan local
    if (num.startsWith("03")) {
      return num.replace(/(\d{4})(\d{7})/, "$1 $2").trim();
    }

    return num;
  };

  // useEffect must also be at top level
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

        const BASE_IMAGE_URL = "https://apis.staffoo.com.au/storage/";
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

        // 🔥 Get address from root OR nested objects (staff, customer, contractor)
        const currentAddress =
          profile?.address ||
          profile?.staff?.address ||
          profile?.customer?.address ||
          profile?.contractor?.address ||
          "";
        const currentCity =
          profile?.city ||
          profile?.staff?.city ||
          profile?.customer?.city ||
          profile?.contractor?.city ||
          "";
        const currentState =
          profile?.state ||
          profile?.staff?.state ||
          profile?.customer?.state ||
          profile?.contractor?.state ||
          "";
        const currentCountry =
          profile?.country ||
          profile?.staff?.country ||
          profile?.customer?.country ||
          profile?.contractor?.country ||
          "";

        setAddress(currentAddress);
        setCity(currentCity);
        setStateValue(currentState);
        setCountry(currentCountry);

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
          setAcn(profile?.contractor?.acn ?? ""); // ← NEW
          setAbn(profile?.contractor?.abn ?? "");
        } else if (profile?.user_type === "staff") {
          setPhoneNumber(profile?.staff?.phone ?? "");
          setGender(profile?.staff?.gender ?? null);
          setResidentialStatus(profile?.staff?.staff_document_type ?? null);
          // ✅ FIXED DATE LOADING
          if (profile?.staff?.date_of_birth) {
            let dob = profile.staff.date_of_birth.trim();

            // Handle both YYYY-MM-DD and DD/MM/YYYY
            if (dob.includes("-")) {
              const [year, month, day] = dob.split("-").map(Number);
              dob = `${String(day).padStart(2, "0")}/${String(month).padStart(
                2,
                "0",
              )}/${year}`;
            }

            setDateOfBirth(dob);

            const parsedDate = parseAustralianToDate(dob);
            if (parsedDate) {
              setTempDate(parsedDate);
            }
          }
          setSecurityLicenseNo(
            profile?.staff?.security_license_no ??
              // profile?.documents?.find(
              //   (doc: any) => doc.document_name === 'Security License',
              // )?.document_no ??
              "",
          );
        } else {
          setPhoneNumber(profile?.customer?.phone ?? "");
          setGender(profile?.customer?.gender ?? null);
        }
      } catch (err) {
        Toast.show({ type: "error", text1: "Could not load profile" });
      } finally {
        setFetching(false);
      }
    };

    initializeProfile();
  }, [navigation]);

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

      // 🔥 IMPORTANT: delay state sync until tap finishes
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
          if (comp.types.includes("country")) tempCountry = comp.long_name;
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

    // if (!securityLicenseNo.trim()) {
    //   Toast.show({
    //     type: 'error',
    //     text1: 'Security License No is required',
    //   });
    //   return false;
    // }

    const isValidPhone =
      // Australia
      (phoneNumber.startsWith("0") && phoneNumber.length === 10) ||
      (phoneNumber.startsWith("+61") && phoneNumber.length === 12) ||
      // Pakistan
      (phoneNumber.startsWith("03") && phoneNumber.length === 11) ||
      (phoneNumber.startsWith("+92") && phoneNumber.length === 13) ||
      // US / Canada
      (phoneNumber.startsWith("+1") && phoneNumber.length === 12) ||
      (!phoneNumber.startsWith("+") && phoneNumber.length === 10);
    if (!isValidPhone) {
      Toast.show({
        type: "error",
        text1: "Please enter a valid phone number",
      });
      return false;
    }

    if (userType === "contractor") {
      if (!companyName.trim()) {
        Toast.show({ type: "error", text1: "Company Name is required" });
        return false;
      }
      // if (!registrationNumber.trim()) {
      //   Toast.show({ type: 'error', text1: 'Registration Number is required' });
      //   return false;
      // }
    }
    if (userType === "staff") {
      if (!dateOfBirth.trim()) {
        Toast.show({
          type: "error",
          text1: "Date of Birth is required",
        });
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
    }
    return true;
  };

  const pickImage = async () => {
    const result = await launchImageLibrary({
      mediaType: "photo",
      quality: 0.5, // reduce quality
    });

    if (!result.didCancel && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];

      // Resize image to reduce size
      const resizedImage = await ImageResizer.createResizedImage(
        asset.uri!,
        800, // maxWidth
        800, // maxHeight
        "JPEG",
        70, // compression 0-100
      );

      const file = {
        uri: resizedImage.uri,
        type: asset.type || "image/jpeg",
        name: asset.fileName || `profile_${Date.now()}.jpg`,
      };

      setProfileImage(file.uri); // for preview
      setImageFile(file); // for API
    }
  };
  const handleContinue = async () => {
    Keyboard.dismiss();
    if (!validateForm() || !userId) return;

    const emailChanged =
      gmail.trim().toLowerCase() !== originalGmail.trim().toLowerCase();

    setLoading(true);

    try {
      const payload: Record<string, any> = {
        name: fullName.trim(),
        phone: phoneNumber.trim(),
        email: gmail.trim().toLowerCase(),
        address: address.trim(),
        city: city.trim(),
        state: stateValue.trim(),

        origin_country: getCountryCode(country.trim()),
        coordinates: coordinates ? `${coordinates.lat},${coordinates.lng}` : "",
      };

      // ✅ FIXED: DOB only added if valid
      if (userType === "staff" && dateOfBirth?.trim()) {
        const dobApi = australianToApiDate(dateOfBirth);
        if (dobApi) {
          payload.date_of_birth = dobApi;
        }
      }

      // Profile image
      if (imageFile) {
        payload.profile_image = imageFile;
      }

      // Contractor fields
      if (userType === "contractor") {
        payload.company_name = companyName.trim();
        payload.registration_number = registrationNumber.trim();
        payload.acn = acn.trim();
        payload.abn = abn.trim();
      }

      // Staff fields
      else if (userType === "staff") {
        payload.gender = gender;
        payload.staff_document_type = residentialStatus;
      }

      console.log("🔥 FINAL PROFILE PAYLOAD:", payload);

      await updateUserProfile(userId, payload);

      // Email OTP flow
      if (emailChanged && userType === "customer") {
        setOtpModalVisible(true);
        setLoading(false);
        return;
      }

      Toast.show({
        type: "success",
        text1: "Profile Updated Successfully",
      });

      setOriginalGmail(gmail.trim().toLowerCase());
      navigation.navigate("Profile");
    } catch (err: any) {
      console.log("Update Error:", err?.response?.data || err);

      const errorMsg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        "Failed to update profile";

      Toast.show({
        type: "error",
        text1: errorMsg,
        position: "bottom",
      });
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

      Toast.show({
        type: "success",
        text1: "Email updated successfully!",
      });

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
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <ArrowLeft size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Complete Your Profile</Text>
          <View style={{ width: 24 }} />
        </View>
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

        <InputField
          icon={User}
          label={
            <>
              Full Name <Text style={styles.required}>*</Text>
            </>
          }
          value={fullName}
          onChange={(text: string) => {
            if (text.length <= 40) {
              setFullName(text);
            }
          }}
          placeholder="Enter your full name"
        />

        <InputField
          icon={Phone}
          label={
            <>
              Phone Number <Text style={styles.required}>*</Text>
            </>
          }
          value={phoneNumber}
          onChange={handlePhoneChange}
          placeholder="0412 345 678"
          keyboardType="default"
          maxLength={15}
        />

        {/* Email */}
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
            {/* <TextInput
              style={styles.input}
              value={gmail}
              onChangeText={setGmail}
              placeholder="yourname@gmail.com"
              placeholderTextColor="#fff"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            /> */}
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

        {userType === "contractor" && (
          <>
            <InputField
              icon={Building2}
              // label="Company Name *"
              label={
                <>
                  Company Name <Text style={styles.required}>*</Text>
                </>
              }
              value={companyName}
              onChange={setCompanyName}
              placeholder="Enter company name"
            />
            {/* <InputField
              icon={FileText}
              label={
                <>
                  Registration Number <Text style={styles.required}>*</Text>
                </>
              }
              value={registrationNumber}
              onChange={setRegistrationNumber}
              placeholder="Enter registration number"
            /> */}

            <InputField
              icon={FileText}
              label="ACN (Australian Company Number)"
              value={acn}
              onChange={(text: string) => {
                const cleaned = text.replace(/\D/g, ""); // only digits
                if (cleaned.length <= 9) {
                  setAcn(cleaned);
                }
              }}
              placeholder="Enter ACN (9 digits)"
              keyboardType="numeric"
            />

            <InputField
              icon={FileText}
              label="ABN (Australian Business Number)"
              value={abn}
              onChange={(text: string) => {
                const cleaned = text.replace(/\D/g, ""); // only digits
                if (cleaned.length <= 11) {
                  setAbn(cleaned);
                }
              }}
              placeholder="Enter ABN (11 digits)"
              keyboardType="numeric"
            />
          </>
        )}

        {userType === "staff" && (
          <>
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

            {/* Native Date Picker */}
            {showDatePicker && (
              <DateTimePicker
                value={tempDate}
                mode="date"
                display="spinner" // Use "calendar" on newer iOS if preferred
                onChange={(event, selectedDate) => {
                  setShowDatePicker(false);
                  if (selectedDate) {
                    setTempDate(selectedDate);
                    const formatted = formatToAustralian(selectedDate);
                    setDateOfBirth(formatted);
                  }
                }}
                maximumDate={new Date()} // Prevent future dates
              />
            )}

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
                style={styles.gradientInput}
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

            {/* <InputField
              icon={FileText}
              label={
                <>
                  Security License No. <Text style={styles.required}>*</Text>
                </>
              }
              value={securityLicenseNo}
              onChange={setSecurityLicenseNo}
              placeholder="Enter Security License No."
            /> */}
          </>
        )}

        <Modal visible={showGenderModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.customModal}>
              <Text style={styles.modalTitle}>Select Gender</Text>
              <FlatList
                data={genderOptions}
                keyExtractor={(item) => item.value}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.modalItem}
                    onPress={() => {
                      setGender(item.value);
                      setShowGenderModal(false);
                    }}
                  >
                    <Text style={styles.modalItemText}>{item.label}</Text>
                  </TouchableOpacity>
                )}
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

        <Modal visible={showResidentialModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.customModal}>
              <Text style={styles.modalTitle}>Select Residential Status</Text>
              <FlatList
                data={residentialOptions}
                keyExtractor={(item) => item.value}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.modalItem}
                    onPress={() => {
                      setResidentialStatus(item.value);
                      setShowResidentialModal(false);
                    }}
                  >
                    <Text style={styles.modalItemText}>{item.label}</Text>
                  </TouchableOpacity>
                )}
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
              placeholderTextColor="rgba(255,255,255,0.6)"
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

        <InputField
          icon={Building2}
          label="City"
          value={city}
          onChange={() => {}}
          editable={false}
          placeholder="City will appear here"
        />

        <InputField
          icon={Globe}
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

        <InputField
          icon={Navigation}
          label="Coordinates"
          value={
            coordinates &&
            typeof coordinates.lat === "number" &&
            typeof coordinates.lng === "number"
              ? `${coordinates.lat.toFixed(6)}, ${coordinates.lng.toFixed(6)}`
              : ""
          }
          onChange={() => {}}
          editable={false}
          placeholder="Coordinates will appear here"
        />

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

        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => navigation.navigate("DeleteProfileVerification")}
          activeOpacity={0.8}
        >
          <Text style={styles.deleteButtonText}>Delete Profile</Text>
        </TouchableOpacity>
      </ScrollView>

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

const InputField = ({
  icon: Icon,
  label,
  value,
  onChange,
  editable = true,
  placeholder = "",
  keyboardType = "default",
  gradient = true,
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
        returnKeyType="done" // 👈 Adds a "Done" button to keyboard
        onSubmitEditing={Keyboard.dismiss}
      />
    </LinearGradient>
  </View>
);

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.brandDark,
  },

  container: {
    flex: 1,
    backgroundColor: COLORS.brandDark,
    // width: '100%',
    paddingTop: 25,
  },

  scrollContent: {
    paddingHorizontal: 15,
    paddingBottom: 50,
  },

  gradientInput: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    height: 47,
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
    // backgroundColor: COLORS.surface,
    marginHorizontal: 5,
    borderRadius: 16,
    marginBottom: 7,
    // borderWidth: 1,
    // borderColor: COLORS.border,
  },

  screenTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.textPrimary,
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
    // borderColor: COLORS.border,
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
    // zIndex: 1000,
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
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },

  modalItemText: {
    fontSize: 16,
    color: COLORS.textPrimary,
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
    color: COLORS.brandDark,
    fontSize: 12,
    fontWeight: "700",
  },

  btnDisabled: {
    opacity: 0.6,
  },
});
