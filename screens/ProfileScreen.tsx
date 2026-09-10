import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Modal,
  Alert,
  Dimensions,
  Platform,
} from "react-native";
import {
  LogOut,
  User,
  FileText,
  CreditCard,
  Wallet,
  Clock,
  BookOpen,
  Shield,
  Briefcase,
  MapPin,
  Users,
  ClipboardList,
  DollarSign,
  X,
  Lock,
  Headphones,
} from "lucide-react-native";
import DeviceInfo from "react-native-device-info";
import Geolocation from "@react-native-community/geolocation";
import { PermissionsAndroid } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { launchImageLibrary } from "react-native-image-picker";
import Toast from "react-native-toast-message";
import { BASE_URL, getUserProfile, logoutUser } from "../services/authApi";
import BottomTab from "./BottomTab";
import { LogLevel, OneSignal } from "react-native-onesignal";
import { sendNotificationTokenToServer } from "../screens/LoginScreen";
import { useFocusEffect } from "@react-navigation/native";
import LinearGradient from "react-native-linear-gradient";
import BrandLoader from "./BrandLoader";

const ONESIGNAL_APP_ID = "79041c59-5506-4e56-9de4-8a6619f85e1d";

type Props = {
  navigation: any;
};

type AsapJobData = {
  id?: number;
  roster_id?: number;
  temp_start?: string;
  temp_end?: string;
  address?: string;
  [key: string]: any;
};
const { width } = Dimensions.get("window");

const isSmall = width < 375;
const isTablet = width >= 768;
const isSmallMobile = width < 375;
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

export default function ProfileScreen({ navigation }: Props) {
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [completionPercentage, setCompletionPercentage] = useState<number>(0);
  const [isActive, setIsActive] = useState<boolean>(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [jobData, setJobData] = useState<AsapJobData | null>(null);
  const [chargeRatePopupVisible, setChargeRatePopupVisible] = useState(false);
  const foregroundHandlerRef = useRef<((event: any) => void) | null>(null);
  const clickHandlerRef = useRef<((event: any) => void) | null>(null);
  const subscriptionChangeHandlerRef = useRef<
    ((event: any) => Promise<void>) | null
  >(null);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [lockedModalVisible, setLockedModalVisible] = useState(false);
  const [lockedModalTitle, setLockedModalTitle] = useState("Section Locked");
  const [lockedModalMessage, setLockedModalMessage] = useState("");
  const hasLoadedOnceRef = useRef(false);
  const hasShownChargeRatePopupRef = useRef(false);
  const hasClosedChargeRatePopupRef = useRef(false);
  const [imageFile, setImageFile] = useState<any>(null);
  const GOOGLE_API_KEY = "AIzaSyCS-DB39Kk-Z25C5GWymVGshXIALbjXPGY";
  const getInitials = (name: string): string => {
    if (!name) return "U";
    const parts = name.trim().split(" ").filter(Boolean);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (
      parts[0].charAt(0).toUpperCase() +
      parts[parts.length - 1].charAt(0).toUpperCase()
    );
  };
  const hasUpdatedRef = useRef(false);

  const applyProfileData = useCallback((freshData: any) => {
    if (!freshData) return;
    setUser(freshData);
    setCompletionPercentage(freshData.profile_completion_percentage || 0);
    setIsActive(freshData.is_active === true);
    let imageUri = null;
    const BASE_IMAGE_URL = "https://apis-staging.staffoo.com.au/storage/";
    // const BASE_IMAGE_URL = "https://apis.staffoo.com.au/storage/";

    if (freshData.user_type === "customer") {
      imageUri = freshData.customer?.profile_image || freshData.profile_image;
    } else if (freshData.user_type === "staff") {
      imageUri = freshData.staff?.profile_image;
    } else if (freshData.user_type === "contractor") {
      imageUri = freshData.contractor?.profile_image;
    }

    if (imageUri) {
      const fullUri = imageUri.startsWith("http")
        ? imageUri
        : `${BASE_IMAGE_URL}${imageUri}`;
      setProfileImage(fullUri);
      AsyncStorage.setItem("profileImage", fullUri).catch(() => {});
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      let isFirstLoad = !hasLoadedOnceRef.current;

      const loadProfile = async () => {
        try {
          const uid = await AsyncStorage.getItem("@user_id");
          const token = await AsyncStorage.getItem("@auth_token");

          if (!uid || !token) {
            navigation.reset({ index: 0, routes: [{ name: "Login" }] });
            return;
          }

          setUserId(uid);
          if (isFirstLoad) {
            const cached = await AsyncStorage.getItem("user");
            if (cached && mounted) {
              applyProfileData(JSON.parse(cached));
              setLoading(false);
              hasLoadedOnceRef.current = true;
            }
          }

          console.log("🔹 getUserProfile called with ID:", uid);
          const profileResponse = await getUserProfile(uid);

          if (profileResponse?.success && profileResponse?.data && mounted) {
            const freshData = profileResponse.data;
            applyProfileData(freshData);
            await AsyncStorage.setItem("user", JSON.stringify(freshData));

            const isInactive =
              freshData?.is_active === false || freshData?.is_active === 0;

            // ── Check AsyncStorage to see if it was already shown/closed before ──
            const hasSeenPopup = await AsyncStorage.getItem(
              `@popup_shown_${uid}`,
            );

            const shouldShowChargeRatePopup =
              freshData?.user_type === "contractor" &&
              isInactive &&
              hasSeenPopup !== "true"; // Only true if it hasn't been flagged in storage

            if (mounted && shouldShowChargeRatePopup) {
              // Immediately flag in AsyncStorage so it never triggers again
              await AsyncStorage.setItem(`@popup_shown_${uid}`, "true");
              setChargeRatePopupVisible(true);
            }

            if (isFirstLoad) {
              updateCoordinatesWithGoogle(uid);
            }
          }
        } catch (err: any) {
          console.error("❌ Profile fetch error:", err);
        } finally {
          if (mounted) {
            setLoading(false);
            hasLoadedOnceRef.current = true;
          }
        }
      };

      loadProfile();

      return () => {
        mounted = false;
      };
    }, [navigation, applyProfileData]), // Important: stable dependencies
  );

  useEffect(() => {
    if (!userId || !user?.user_type || user.user_type === "customer") return;
    let pollTimer: ReturnType<typeof setTimeout> | undefined;
    const setupOneSignal = async () => {
      OneSignal.Debug.setLogLevel(LogLevel.Verbose);
      OneSignal.initialize(ONESIGNAL_APP_ID);
      await new Promise((r) => setTimeout(r, 800));
      OneSignal.Notifications.requestPermission(true);

      subscriptionChangeHandlerRef.current = async (event: any) => {
        const playerId = event.current?.id ?? null;
        if (playerId && userId) {
          const authToken = await AsyncStorage.getItem("@auth_token");
          if (authToken) await sendNotificationTokenToServer(playerId, userId);
        }
      };
      OneSignal.User.pushSubscription.addEventListener(
        "change",
        subscriptionChangeHandlerRef.current,
      );

      foregroundHandlerRef.current = (event: any) => {
        event.preventDefault();
        event.getNotification().display();
      };
      OneSignal.Notifications.addEventListener(
        "foregroundWillDisplay",
        foregroundHandlerRef.current,
      );

      clickHandlerRef.current = (event: any) => {
        const notification = event.notification;
        const additionalData = notification?.additionalData || {};
        const pageName = additionalData.page;
        if (pageName === "asap-job-list") {
          let asapData: AsapJobData = {};
          try {
            asapData = additionalData.job_data
              ? JSON.parse(additionalData.job_data)
              : {};
          } catch (e) {
            console.warn("Failed to parse job_data:", e);
          }
          setJobData(asapData);
          setModalVisible(true);
        }
      };
      OneSignal.Notifications.addEventListener(
        "click",
        clickHandlerRef.current,
      );

      pollTimer = setTimeout(async () => {
        try {
          const playerId = await OneSignal.User.pushSubscription.getIdAsync();
          if (playerId && userId) {
            const authToken = await AsyncStorage.getItem("@auth_token");
            if (authToken)
              await sendNotificationTokenToServer(playerId, userId);
          }
        } catch (e) {
          console.warn("Poll failed:", e);
        }
      }, 5000);
    };

    setupOneSignal();

    return () => {
      if (subscriptionChangeHandlerRef.current)
        OneSignal.User.pushSubscription.removeEventListener(
          "change",
          subscriptionChangeHandlerRef.current,
        );
      if (foregroundHandlerRef.current)
        OneSignal.Notifications.removeEventListener(
          "foregroundWillDisplay",
          foregroundHandlerRef.current,
        );
      if (clickHandlerRef.current)
        OneSignal.Notifications.removeEventListener(
          "click",
          clickHandlerRef.current,
        );
      if (pollTimer) clearTimeout(pollTimer);
    };
  }, [userId, user?.user_type]);

  const updateCoordinatesWithGoogle = async (uid: string) => {
    try {
      const token = await AsyncStorage.getItem("@auth_token");
      if (!token || !uid) {
        console.log("❌ Missing token or user id");
        return;
      }
      let hasPermission = true;
      if (Platform.OS === "android") {
        const result = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        );

        hasPermission = result === PermissionsAndroid.RESULTS.GRANTED;
      }
      if (!hasPermission) {
        console.log("❌ Location permission denied");
        return;
      }

      Geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude } = position.coords;
            const payload = {
              current_coordinates: `${latitude},${longitude}`,
            };
            console.log("📍 Sending Coordinates:", payload.current_coordinates);
            const response = await fetch(
              `${BASE_URL}/update-coordinates/${uid}`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
              },
            );
            const data = await response.json();
            console.log("📍 Update Coordinate Response:", data);
            if (response.ok && data.success) {
              console.log("✅ Coordinates updated successfully");
            } else {
              console.log("❌ Update failed:", data);
            }
          } catch (apiError) {
            console.error("❌ API Error:", apiError);
          }
        },
        (error) => {
          console.error("❌ Geolocation Error:", error);
        },
        {
          enableHighAccuracy: false,
          timeout: 20000,
          maximumAge: 10000,
        },
      );
    } catch (error) {
      console.error("❌ Failed to update coordinates:", error);
    }
  };

  updateCoordinatesWithGoogle.isRunning = false;
  updateCoordinatesWithGoogle.hasShownError = false;

  useEffect(() => {
    if (!userId) return;

    let interval: NodeJS.Timeout | null = null;

    const updateLocation = async () => {
      if ((updateCoordinatesWithGoogle as any).isRunning) {
        console.log("⏭️ Location update already in progress");
        return;
      }
      console.log("📍 Updating coordinates...");
      await updateCoordinatesWithGoogle(userId);
    };
    updateLocation();
    interval = setInterval(() => {
      updateLocation();
    }, 10 * 60 * 1000);
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [userId]);

  const parseStatesAllowed = (raw: unknown): string[] => {
    if (!raw) return [];
    if (Array.isArray(raw))
      return raw.map((s) => String(s).toLowerCase().trim());
    if (typeof raw === "string") {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed))
          return parsed.map((s) => String(s).toLowerCase().trim());
      } catch {
        return raw
          .split(",")
          .map((s) => String(s).toLowerCase().trim())
          .filter(Boolean);
      }
    }
    return [];
  };

  const STATE_TO_CATEGORY: Record<string, string> = {
    vic: "contractor_document",
    nsw: "nsw_document",
    qld: "qld_document",
    tas: "tas_document",
    wa: "wa_document",
    sa: "sa_document",
    act: "act_document",
    nt: "nt_document",
  };

  const hasCompletedStateDocuments = () => {
    if (!user) return false;

    const allowed = parseStatesAllowed(user?.states_allowed);
    if (!allowed || allowed.length === 0) return false;

    const docs: any[] = Array.isArray(user.documents) ? user.documents : [];

    for (const code of allowed) {
      const category = STATE_TO_CATEGORY[code];
      if (!category) return false;

      const docsForCategory = docs.filter(
        (d) =>
          String(d.document_category || "").toLowerCase() ===
          String(category).toLowerCase(),
      );

      if (docsForCategory.length === 0) return false;

      const everyHasFile = docsForCategory.every(
        (d) => !!(d.file && String(d.file).trim().length > 0),
      );
      if (!everyHasFile) return false;
    }

    return true;
  };

  const getProfileSections = (userType: string | undefined) => {
    const type = userType?.toLowerCase().trim();
    const targetUserId = Number(user?.user_id);
    const isSuperStaff = targetUserId === 1;

    const allSections = [
      {
        title: "Personal Information",
        icon: <User size={20} color="#6590D9" />,
        iconBg: "rgba(101,144,217,0.15)",
        route: "ProfileSetup",
      },
      {
        title: "Documents",
        icon: <FileText size={20} color="#786BD8" />,
        iconBg: "rgba(120,107,216,0.15)",
        route: "Documents",
      },
      {
        title: "Verification Forms",
        icon: <FileText size={20} color="#6AA957" />,
        iconBg: "rgba(106,169,87,0.15)",
        route: "StaffForms",
      },
      {
        title: "Privacy Policy",
        icon: <Shield size={20} color="#10B981" />,
        iconBg: "rgba(16,185,129,0.15)",
        route: "Policies",
      },
      {
        title: "Support",
        icon: <Headphones size={20} color="#38BDF8" />,
        iconBg: "rgba(56,189,248,0.15)",
        route: "Support",
      },
      {
        title: "Induction",
        icon: <BookOpen size={20} color="#63B6DD" />,
        iconBg: "rgba(99,182,221,0.15)",
        route: "Induction",
      },
      {
        title: "Payslip",
        icon: <Wallet size={20} color="#F59E0B" />,
        iconBg: "rgba(245,158,11,0.15)",
        route: "Payslip",
      },
      {
        title: "Job History",
        icon: <Briefcase size={20} color="#00A99D" />,
        iconBg: "rgba(0,169,157,0.15)",
        route: "Applications",
      },
      {
        title: "Staff Management",
        icon: <Users size={20} color="#F59E0B" />,
        iconBg: "rgba(245,158,11,0.15)",
        route: "StaffManagement",
      },
      {
        title: "Payment History",
        icon: <Clock size={20} color="#26C6DA" />,
        iconBg: "rgba(38,198,218,0.15)",
        route: "JobPayment",
      },
      {
        title: "Manage Cards",
        icon: <CreditCard size={20} color="#A78BFA" />,
        iconBg: "rgba(167,139,250,0.15)",
        route: "PaymentMethod",
      },
      {
        title: "Timesheet",
        icon: <ClipboardList size={20} color="#3B82F6" />,
        iconBg: "rgba(59,130,246,0.15)",
        route: "Timesheet",
      },
      {
        title: "My Rates",
        icon: <DollarSign size={20} color="#10B981" />,
        iconBg: "rgba(16,185,129,0.15)",
        route: "ContractorRates",
      },
      {
        title: "Log Out",
        icon: <LogOut size={20} color={COLORS.danger} />,
        iconBg: COLORS.dangerBg,
        route: "Logout",
        isDanger: true,
      },
    ];

    const parseStatesAllowed = (raw: unknown): string[] => {
      if (!raw) return [];
      if (Array.isArray(raw))
        return raw.map((s) => String(s).toLowerCase().trim());
      if (typeof raw === "string") {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed))
            return parsed.map((s) => String(s).toLowerCase().trim());
        } catch {
          return raw
            .split(",")
            .map((s) => String(s).toLowerCase().trim())
            .filter(Boolean);
        }
      }
      return [];
    };

    const STATE_TO_CATEGORY: Record<string, string> = {
      vic: "contractor_document",
      nsw: "nsw_document",
      qld: "qld_document",
      tas: "tas_document",
      wa: "wa_document",
      sa: "sa_document",
      act: "act_document",
      nt: "nt_document",
    };

    const hasCompletedStateDocuments = (): boolean => {
      if (!user) return false;
      const allowed = parseStatesAllowed(user?.states_allowed);
      if (!allowed || allowed.length === 0) return false;

      const docs: any[] = Array.isArray(user.documents) ? user.documents : [];

      for (const code of allowed) {
        const category = STATE_TO_CATEGORY[code];
        if (!category) return false;

        const docsForCategory = docs.filter(
          (d) =>
            String(d.document_category || "").toLowerCase() ===
            String(category).toLowerCase(),
        );

        if (docsForCategory.length === 0) return false;

        const everyHasFile = docsForCategory.every(
          (d) => !!(d.file && String(d.file).trim().length > 0),
        );
        if (!everyHasFile) return false;
      }
      return true;
    };

    const hasCompletedPersonalInfo = (): boolean => {
      if (!user) return false;

      const type = (user.user_type || "").toLowerCase().trim();
      const staff = user.staff || {};

      // ── Common fields ──
      const hasName = !!(user.name && String(user.name).trim());
      const hasPhone = !!(user.phone || staff.phone);
      const hasEmail = !!(user.email && String(user.email).trim());
      const hasAddress = !!(user.address && String(user.address).trim());
      const hasState = !!(user.state && String(user.state).trim());

      if (type === "staff") {
        // Country of birth
        const hasCountryOfBirth = !!(
          staff.origin_country || user.origin_country
        );

        // Gender
        const hasGender = !!(staff.gender || user.gender);

        // Date of birth
        const hasDob = !!(
          staff.date_of_birth ||
          staff.dob ||
          user.date_of_birth
        );

        // Security licence number  ← correct key from your payload
        const hasSecurityLicense = !!(
          staff.security_license_no ||
          staff.security_license_number ||
          staff.license_number ||
          user.security_license_no
        );

        // Visa  ← correct key from your payload
        const hasVisa = !!(
          staff.staff_document_type ||
          staff.visa ||
          staff.visa_type ||
          user.staff_document_type
        );

        const isComplete =
          hasName &&
          hasPhone &&
          hasEmail &&
          hasAddress &&
          hasState &&
          hasCountryOfBirth &&
          hasGender &&
          hasDob &&
          hasSecurityLicense &&
          hasVisa;

        // Keep this log until everything is green
        if (!isComplete) {
          console.log("🔒 Missing fields for unlock:", {
            hasName,
            hasPhone,
            hasEmail,
            hasAddress,
            hasState,
            hasCountryOfBirth,
            hasGender,
            hasDob,
            hasSecurityLicense,
            hasVisa,
            staffKeys: Object.keys(staff),
          });
        }

        return isComplete;
      }

      // Contractor / customer
      const hasCity = !!(user.city && String(user.city).trim());
      return hasName && hasPhone && hasEmail && hasAddress && hasCity;
    };

    const hasCompletedStaffDocuments = (): boolean => {
      if (!user) return false;
      if ((user.user_type || "").toLowerCase().trim() !== "staff") return true;

      const docs: any[] = Array.isArray(user.documents) ? user.documents : [];
      if (docs.length === 0) return false;

      const visaType =
        user?.staff?.staff_document_type || user?.staff_document_type || null;

      // Prefer docs matching current visa category
      const relevant = visaType
        ? docs.filter(
            (d) =>
              String(d.document_category || "").toLowerCase() ===
              String(visaType).toLowerCase(),
          )
        : docs;

      if (relevant.length === 0) return false;

      // Every listed doc must have a file
      return relevant.every(
        (d) => !!(d.file && String(d.file).trim().length > 0),
      );
    };
    const isLocked = (title: string): boolean => {
      if (isActive) return false;

      if (title === "Personal Information" || title === "Log Out") {
        return false;
      }

      if (title === "Documents") {
        return !hasCompletedPersonalInfo();
      }

      // Verification Forms → only when document points ≥ 100
      if (title === "Verification Forms") {
        return !hasCompletedPersonalInfo() || !hasEnoughDocumentPoints();
      }

      if (type === "staff") {
        return true;
      }

      if (type === "contractor") {
        if (title === "My Rates") {
          return !hasCompletedStateDocuments();
        }
        return true;
      }

      return true;
    };

    // ── Filter sections by user type ──
    let filtered: typeof allSections = [];

    if (type === "staff") {
      const staffTabs = [
        "Personal Information",
        "Documents",
        "Timesheet",
        "Privacy Policy",

        "Job History",
        "Support",
        "Log Out",
      ];

      if (isSuperStaff) {
        staffTabs.splice(2, 0, "Verification Forms");
        staffTabs.splice(2, 0, "Induction");
      }

      filtered = allSections.filter((s) => staffTabs.includes(s.title));
    } else if (type === "contractor") {
      const contractorOrder = [
        "Personal Information",
        "Documents",
        "My Rates",
        "Privacy Policy",
        "Support",
        "Staff Management",
        "Job History",
        "Timesheet",
        "Log Out",
      ];

      filtered = contractorOrder
        .map((title) => allSections.find((s) => s.title === title))
        .filter(Boolean) as typeof allSections;
    } else if (type === "customer") {
      filtered = allSections.filter((s) =>
        [
          "Personal Information",
          "Payment History",
          "Manage Cards",
          "Privacy Policy",
          "Support",
          "Log Out",
        ].includes(s.title),
      );
    } else {
      filtered = allSections;
    }

    return filtered.map((s) => ({
      ...s,
      locked: isLocked(s.title),
    }));
  };

  const isProfileComplete = hasCompletedStateDocuments();

  const handleSectionPress = (
    route: string,
    locked?: boolean,
    title?: string,
  ) => {
    if (locked) {
      let message =
        "This section is locked until your account is activated or required steps are completed.";

      if (title === "Documents") {
        message =
          "Please complete and save your Personal Information first to unlock Documents.";
      } else if (title === "Verification Forms") {
        const pts = getStaffDocumentPoints(user);
        const hasExpired = (user?.documents || []).some(
          (d: any) =>
            !!(d.file && String(d.file).trim()) &&
            isDocumentExpired(d.document_expiry),
        );

        message = hasExpired
          ? `Some documents have expired. Please update them in Documents. Current valid points: ${pts}/100.`
          : `Upload enough required documents to reach 100 points before Verification Forms. Current: ${pts}/100.`;
      } else if (title === "My Rates") {
        message =
          "Please upload the required documents for your licensed states to unlock My Rates.";
      }

      setLockedModalTitle("Section Locked");
      setLockedModalMessage(message);
      setLockedModalVisible(true);
      return;
    }

    if (route === "Logout") {
      setLogoutModalVisible(true); // ← open custom modal
      return;
    }

    if (route === "DeleteProfile") {
      navigation.navigate("DeleteProfileVerification");
      return;
    }

    navigation.navigate(route);
  };

  const DOCUMENT_POINTS: Record<string, number> = {
    passport: 70,
    citizen_ship: 70,
    citizenship: 70,
    medicare: 25,
    birth_certificate: 25,
    security_license: 40,
    driver_license_front: 70,
    driver_license_back: 0,
    working_with_children: 0,
    first_aid: 0,
    cpr: 0,
    visa: 0,
    rsa: 0,
  };

  /** Normalize "Passport" / "Driver License Front" → "passport" / "driver_license_front" */
  const normalizeDocKey = (name: string): string =>
    String(name || "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "");

  /** Returns true when the document has a past expiry date */
  const isDocumentExpired = (expiry?: string | null): boolean => {
    if (!expiry || !String(expiry).trim()) return false;
    const d = new Date(expiry);
    if (Number.isNaN(d.getTime())) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return d < today;
  };

  const getStaffDocumentPoints = (userData: any): number => {
    const docs: any[] = Array.isArray(userData?.documents)
      ? userData.documents
      : [];

    let total = 0;
    const counted = new Set<string>();

    for (const d of docs) {
      const hasFile = !!(d.file && String(d.file).trim().length > 0);
      if (!hasFile) continue;

      // NEW: skip expired documents
      if (isDocumentExpired(d.document_expiry)) continue;

      const key = normalizeDocKey(d.document_name || d.document_type || "");
      if (!key || counted.has(key)) continue;

      const points = DOCUMENT_POINTS[key] ?? 0;
      if (points > 0) {
        total += points;
        counted.add(key);
      }
    }

    return total;
  };

  const hasEnoughDocumentPoints = (): boolean => {
    if (!user) return false;
    return getStaffDocumentPoints(user) >= 100;
  };

  const performLogout = async () => {
    setLogoutModalVisible(false);
    try {
      const token = await AsyncStorage.getItem("@auth_token");
      if (token) await logoutUser();

      await AsyncStorage.multiRemove([
        "@user_id",
        "@auth_token",
        "user",
        "profileImage",
      ]);

      Toast.show({
        type: "success",
        text1: "Logged out successfully",
      });

      navigation.reset({
        index: 0,
        routes: [{ name: "Login" }],
      });
    } catch {
      await AsyncStorage.multiRemove([
        "@user_id",
        "@auth_token",
        "user",
        "profileImage",
      ]);

      navigation.reset({
        index: 0,
        routes: [{ name: "Login" }],
      });
    }
  };

  const getFormattedLocation = (data: any) => {
    if (!data.address) return "Location not set";
    const placeName = data.address.split(",")[0].trim();
    const city = data.city ? data.city.trim() : "";
    const country = data.country ? data.country.trim() : "";

    if (city && country) {
      return `${placeName}, ${city}, ${country}`;
    }
    return placeName;
  };

  const capitalizeName = (name: string = "") => {
    return name
      .toLowerCase()
      .split(" ")
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const getUserTypeLabel = (type: string | undefined | null) => {
    switch (type) {
      case "customer":
        return "Customer Profile";
      case "staff":
        return "Staff Profile";
      case "contractor":
        return "Resource Partner Profile";
      default:
        return "Profile";
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <BrandLoader size={60} />

        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  const sections = getProfileSections(user?.user_type);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* ── Hero Header ── */}
        <LinearGradient
          colors={[COLORS.heroBg1, COLORS.heroBg2]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.heroSection}
        >
          <View style={styles.innercontainer}>
            <View style={styles.heroTopRow}>
              <Text style={styles.heroTitle}>My Profile</Text>
            </View>
            <View style={styles.profileInfoContainer}>
              <TouchableOpacity
                style={styles.avatarWrapper}
                activeOpacity={0.85}
              >
                {profileImage ? (
                  <Image source={{ uri: profileImage }} style={styles.avatar} />
                ) : (
                  <LinearGradient
                    colors={["#0D3B38", "#1A5C55"]}
                    style={styles.initialsAvatar}
                  >
                    <Text style={styles.initialsText}>
                      {getInitials(user?.name || "User")}
                    </Text>
                  </LinearGradient>
                )}
              </TouchableOpacity>

              <View style={styles.nameSection}>
                <Text style={styles.greeting}>
                  {capitalizeName(user?.name || "User")}
                </Text>

                {!!user?.email && (
                  <Text style={styles.emailText}>{user.email}</Text>
                )}

                <View style={styles.statusRow}>
                  {user?.user_type !== "customer" && (
                    <View
                      style={[
                        styles.statusChip,
                        {
                          borderColor: isActive
                            ? "rgba(52,200,138,0.25)"
                            : "rgba(248,113,113,0.25)",
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.statusDot,
                          {
                            backgroundColor: isActive
                              ? COLORS.success
                              : COLORS.danger,
                          },
                        ]}
                      />
                      <Text
                        style={[
                          styles.statusChipText,
                          {
                            color: isActive ? COLORS.success : COLORS.danger,
                            marginLeft: 6,
                          },
                        ]}
                      >
                        {isActive ? "Active" : "Inactive"}
                      </Text>
                    </View>
                  )}
                  {user?.address ? (
                    <View style={styles.addressChip}>
                      <MapPin size={12} color={COLORS.textSecondary} />
                      <Text
                        numberOfLines={1}
                        ellipsizeMode="tail"
                        style={styles.addressText}
                      >
                        {getFormattedLocation(user)}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>
            </View>

            {user?.user_type === "customer" && (
              <Text style={styles.infoTextBottom}>
                Keep your profile information up to date to ensure it stays
                accurate and complete.
              </Text>
            )}
            {user?.user_type !== "customer" && (
              <View style={styles.progressSection}>
                <View style={styles.progressLabelRow}>
                  <Text style={styles.progressLabel}>Profile Completion</Text>
                  <Text style={styles.progressValue}>
                    {completionPercentage}%
                  </Text>
                </View>

                <View style={styles.progressBarBg}>
                  <LinearGradient
                    colors={[COLORS.primary, "#34D1C5"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[
                      styles.progressBarFill,
                      { width: `${completionPercentage}%` as any },
                    ]}
                  />
                </View>
              </View>
            )}
          </View>
        </LinearGradient>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Account Settings</Text>
        </View>

        <View style={styles.gridContainer}>
          {sections.map((section, index) => (
            <TouchableOpacity
              key={index}
              onPress={() =>
                handleSectionPress(section.route, section.locked, section.title)
              }
              activeOpacity={0.75}
              style={styles.cardWrapper}
            >
              <View
                style={[
                  styles.card,
                  section.isDanger && styles.cardDanger,
                  section.locked && styles.cardLocked, // optional style
                ]}
              >
                <View style={styles.cardHighlight} />
                <View style={styles.cardShimmer} />

                <View
                  style={[
                    styles.cardIconWrapper,
                    { backgroundColor: section.iconBg },
                  ]}
                >
                  {section.icon}
                  {section.locked && (
                    <View style={styles.lockBadge}>
                      <Lock size={12} color="#fff" />
                    </View>
                  )}
                </View>

                <Text
                  style={[
                    styles.cardLabel,
                    section.isDanger && styles.cardLabelDanger,
                    section.locked && styles.cardLabelLocked,
                  ]}
                >
                  {section.title}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <Modal
        visible={chargeRatePopupVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          hasClosedChargeRatePopupRef.current = true; // Mark as closed
          setChargeRatePopupVisible(false);
        }}
      >
        <View style={styles.chargeModalOverlay}>
          <View style={styles.reqModalCard}>
            {/* Header */}
            <View style={styles.reqModalHeader}>
              <Text style={styles.reqModalHeaderTitle}>
                Complete Your Profile Requirements
              </Text>
              <TouchableOpacity
                onPress={() => {
                  hasClosedChargeRatePopupRef.current = true; // Mark as closed
                  setChargeRatePopupVisible(false);
                }}
                style={styles.chargeModalCloseBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={18} color="#fff" />
              </TouchableOpacity>
            </View>

            <View style={styles.reqModalBody}>
              <View style={styles.reqStepRow}>
                <View style={styles.reqStepLeft}>
                  <View style={[styles.reqStepCircle, styles.reqStepCircle1]}>
                    <Text style={styles.reqStepNumber}>1</Text>
                  </View>
                  <View style={styles.reqStepLine} />
                </View>
                <View style={styles.reqStepContent}>
                  <Text style={styles.reqStepTitle}>
                    Select Your States Licensed
                  </Text>
                  <Text style={styles.reqStepDesc}>
                    Select the states where you currently hold a valid Security
                    Master License.
                  </Text>
                </View>
              </View>

              <View style={styles.reqStepRow}>
                <View style={styles.reqStepLeft}>
                  <View style={[styles.reqStepCircle, styles.reqStepCircle2]}>
                    <Text style={styles.reqStepNumber}>2</Text>
                  </View>
                  <View style={styles.reqStepLine} />
                </View>
                <View style={styles.reqStepContent}>
                  <Text style={styles.reqStepTitle}>
                    Upload Required Documents
                  </Text>
                  <Text style={styles.reqStepDesc}>
                    Add the required license and supporting documents for each
                    state you selected.
                  </Text>
                </View>
              </View>

              <View style={[styles.reqStepRow, { marginBottom: 0 }]}>
                <View style={styles.reqStepLeft}>
                  <View style={[styles.reqStepCircle, styles.reqStepCircle3]}>
                    <Text style={styles.reqStepNumber}>3</Text>
                  </View>
                </View>
                <View style={styles.reqStepContent}>
                  <Text style={styles.reqStepTitle}>Request Charge Rates</Text>
                  <Text style={styles.reqStepDesc}>
                    Once your states and documents are complete, request the
                    charge rates applicable to your selected states.
                  </Text>
                </View>
              </View>

              <View style={styles.reqInfoBox}>
                <View style={styles.reqInfoIcon}>
                  <Text style={styles.reqInfoIconText}>i</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.reqInfoTitle}>Why is this required?</Text>
                  <Text style={styles.reqInfoDesc}>
                    Your charge rates are based on the states where you are
                    licensed and verified. Completing all three steps ensures
                    your profile is ready to operate in those states.
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Beautiful Locked Section Modal ── */}
      {/* ── Locked Section Modal (teal theme) ── */}
      <Modal
        visible={lockedModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLockedModalVisible(false)}
      >
        <View style={styles.lockedModalOverlay}>
          <View style={styles.lockedModalCard}>
            {/* Top accent – primary teal */}
            <View
              style={[
                styles.lockedModalAccent,
                { backgroundColor: COLORS.primary },
              ]}
            />

            {/* Icon */}
            <View style={styles.lockedModalIconWrap}>
              <View
                style={[
                  styles.lockedModalIconCircle,
                  { backgroundColor: "rgba(0,169,157,0.12)" },
                ]}
              >
                <Lock size={28} color={COLORS.primary} />
              </View>
            </View>

            {/* Title */}
            <Text style={styles.lockedModalTitle}>{lockedModalTitle}</Text>

            {/* Message */}
            <Text style={styles.lockedModalMessage}>{lockedModalMessage}</Text>

            {/* Button */}
            <TouchableOpacity
              activeOpacity={0.85}
              style={[
                styles.lockedModalBtn,
                { backgroundColor: COLORS.primary },
              ]}
              onPress={() => setLockedModalVisible(false)}
            >
              <Text style={[styles.lockedModalBtnText, { color: "#fff" }]}>
                Got it
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      {/* ── Beautiful Logout Confirmation Modal ── */}
      {/* ── Logout Confirmation Modal (red) ── */}
      <Modal
        visible={logoutModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLogoutModalVisible(false)}
      >
        <View style={styles.lockedModalOverlay}>
          <View style={styles.lockedModalCard}>
            {/* Top accent – danger red */}
            <View
              style={[styles.lockedModalAccent, { backgroundColor: "#EF4444" }]}
            />

            {/* Icon */}
            <View style={styles.lockedModalIconWrap}>
              <View
                style={[
                  styles.lockedModalIconCircle,
                  { backgroundColor: "#FEE2E2" },
                ]}
              >
                <LogOut size={28} color="#EF4444" />
              </View>
            </View>

            {/* Title */}
            <Text style={styles.lockedModalTitle}>Log Out</Text>

            {/* Message */}
            <Text style={styles.lockedModalMessage}>
              Are you sure you want to log out of your account?
            </Text>

            {/* Buttons */}
            <View style={styles.logoutBtnRow}>
              <TouchableOpacity
                activeOpacity={0.85}
                style={styles.logoutCancelBtn}
                onPress={() => setLogoutModalVisible(false)}
              >
                <Text style={styles.logoutCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.85}
                style={styles.logoutConfirmBtn}
                onPress={performLogout}
              >
                <Text style={styles.logoutConfirmText}>Log Out</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const CARD_WIDTH = (width - 36) / 3;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#030508",
  },
  container: {
    flex: 1,
    backgroundColor: "#030508",
    paddingTop: 20,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
    gap: 12,
  },
  loadingText: {
    fontSize: 15,
    color: COLORS.textSecondary,
    fontWeight: "500",
  },
  innercontainer: {
    padding: 20,
  },
  heroSection: {
    paddingBottom: 10,
    borderBottomWidth: 1,
    // borderBottomColor: COLORS.primaryBorder,
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
  },
  greeting: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
    textTransform: "capitalize",
    letterSpacing: 0.3,
    marginBottom: 4,
  },

  heroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 22,
  },

  heroTitle: {
    fontSize: 26,
    fontWeight: "700",
    color: COLORS.text,
    letterSpacing: 0.3,
  },

  settingsBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(0,169,157,0.1)",
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
    justifyContent: "center",
    alignItems: "center",
  },

  profileInfoContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 22,
  },

  avatarWrapper: {
    alignItems: "center",
  },

  avatar: {
    width: 86,
    height: 86,
    borderRadius: 43,
    borderWidth: 2.5,
    borderColor: COLORS.primary,
  },
  infoTextBottom: {
    fontSize: 12,
    color: "#cbcfd8",
    fontWeight: 800,
  },

  initialsAvatar: {
    width: 86,
    height: 86,
    borderRadius: 43,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2.5,
    borderColor: COLORS.primary,
  },

  initialsText: {
    color: COLORS.primary,
    fontSize: 28,
    fontWeight: "700",
  },
  infoText: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 8,
    lineHeight: 18,
  },
  editBadge: {
    marginTop: 6,
    backgroundColor: "rgba(0,169,157,0.15)",
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  editBadgeText: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: "600",
  },

  nameSection: {
    flex: 1,
  },

  heroName: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 8,
  },

  typeBadge: {
    backgroundColor: "rgba(0,169,157,0.1)",
    borderWidth: 1,
    borderColor: "rgba(0,169,157,0.28)",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    alignSelf: "flex-start",
    marginBottom: 10,
  },
  typeBadgeText: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.3,
  },

  emailText: {
    fontSize: 13,
    color: "#94A3B8",
    marginTop: 2,
    marginBottom: 6,
  },
  cardLocked: {
    opacity: 0.55,
  },
  cardLabelLocked: {
    color: "#94A3B8",
  },
  lockBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "#EF4444",
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#fff",
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusChipText: {
    fontSize: 10,
    fontWeight: "600",
  },

  progressSection: {
    marginTop: 4,
  },
  progressLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  progressLabel: {
    color: "#e3e3e3e4",
    fontSize: 12,
    fontWeight: "600",
  },
  progressValue: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: "600",
  },
  progressBarBg: {
    height: 5,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 10,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 10,
  },

  warningCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: COLORS.warningBg,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.warning,
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 2,
    padding: 12,
    borderRadius: 0,
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
  },
  warningText: {
    flex: 1,
    fontSize: 12.5,
    color: "#D4931C",
    fontWeight: "500",
    lineHeight: 18,
  },

  sectionHeader: {
    paddingHorizontal: 16,
    paddingTop: 22,
    paddingBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#ffff",
    letterSpacing: 0.8,
    // textTransform: "uppercase",
  },

  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    // justifyContent: "space-between",
    paddingHorizontal: 12,
    gap: 5,
  },

  cardDanger: {
    borderColor: "rgba(119, 120, 118, 0.79)",
  },

  cardShimmer: {
    position: "absolute",
    top: 0,
    left: 20,
    right: 20,
    height: 1,
    backgroundColor: "rgba(0,169,157,0.2)",
  },

  cardIconWrapper: {
    width: 42,
    height: 42,
    borderRadius: 13,
    justifyContent: "center",
    alignItems: "center",
  },

  cardLabel: {
    color: "#CBD5E1",
    fontSize: 10.5,
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 15,
    marginTop: 8,
  },

  cardLabelDanger: {
    color: COLORS.danger,
  },

  statusChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    backgroundColor: "rgba(255,255,255,0.04)",
  },

  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "nowrap",
    marginTop: 8,
    gap: 8,
  },
  addressChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 5,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(31, 231, 145, 0.15)",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  addressText: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginLeft: 4,
    flexShrink: 1,
  },

  cardWrapper: {
    borderRadius: 20,
    marginBottom: 5,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    // elevation: 12,
  },

  card: {
    width: CARD_WIDTH,
    height: 100,
    backgroundColor: COLORS.card,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "rgba(0, 169, 157, 0.35)",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    overflow: "hidden",
  },

  // Top prominent highlight
  cardHighlight: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: COLORS.primary,
    opacity: 0.9,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.7,
    shadowRadius: 6,
  },

  // Subtle inner shine
  cardInnerGlow: {
    position: "absolute",
    top: 12,
    left: 12,
    right: 12,
    height: 22,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 12,
  },

  // ── Charge Rates Missing popup styles ──
  chargeModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  chargeModalCard: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: COLORS.card,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  chargeModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  chargeModalHeaderTitle: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: "700",
  },
  chargeModalCloseBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  chargeModalBody: {
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 22,
    alignItems: "center",
  },
  chargeModalIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 16,
    backgroundColor: COLORS.warningBg,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  chargeModalTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 8,
  },
  chargeModalDesc: {
    color: COLORS.textSecondary,
    fontSize: 13,
    textAlign: "center",
    lineHeight: 19,
    marginBottom: 22,
  },
  chargeModalBtnRow: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
  },
  chargeModalCloseTextBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  chargeModalCloseTextBtnText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: "600",
  },
  chargeModalPrimaryBtn: {
    flex: 1.4,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  chargeModalPrimaryBtnText: {
    color: "#03211E",
    fontSize: 13.5,
    fontWeight: "700",
  },

  reqModalCard: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    overflow: "hidden",
  },
  reqModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#0B1C2D",
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  reqModalHeaderTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    flex: 1,
    paddingRight: 8,
  },
  reqModalBody: {
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 20,
  },
  reqStepRow: {
    flexDirection: "row",
    marginBottom: 4,
  },
  reqStepLeft: {
    width: 36,
    alignItems: "center",
  },
  reqStepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  reqStepCircle1: {
    backgroundColor: "#D1FAE5",
  },
  reqStepCircle2: {
    backgroundColor: "#FEF3C7",
  },
  reqStepCircle3: {
    backgroundColor: "#EDE9FE",
  },
  reqStepNumber: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1E293B",
  },
  reqStepLine: {
    width: 2,
    flex: 1,
    backgroundColor: "#E2E8F0",
    marginVertical: 4,
    minHeight: 28,
  },
  reqStepContent: {
    flex: 1,
    paddingLeft: 12,
    paddingBottom: 18,
  },
  reqStepTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 4,
  },
  reqStepDesc: {
    fontSize: 13,
    color: "#64748B",
    lineHeight: 19,
  },
  reqInfoBox: {
    flexDirection: "row",
    backgroundColor: "#F0FDFA",
    borderRadius: 12,
    padding: 14,
    marginTop: 8,
    marginBottom: 20,
    gap: 10,
    borderWidth: 1,
    borderColor: "#CCFBF1",
  },
  reqInfoIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  reqInfoIconText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  reqInfoTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 4,
  },
  reqInfoDesc: {
    fontSize: 12,
    color: "#475569",
    lineHeight: 18,
  },

  // ── Shared modal base ──
  lockedModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  lockedModalCard: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: "#fff",
    borderRadius: 20,
    overflow: "hidden",
    paddingBottom: 24,
    elevation: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
  },
  lockedModalAccent: {
    height: 5,
    // color set inline
  },
  lockedModalIconWrap: {
    alignItems: "center",
    marginTop: 28,
    marginBottom: 12,
  },
  lockedModalIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    justifyContent: "center",
    alignItems: "center",
  },
  lockedModalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
    marginBottom: 10,
    paddingHorizontal: 24,
  },
  lockedModalMessage: {
    fontSize: 15,
    lineHeight: 22,
    color: "#6B7280",
    textAlign: "center",
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  lockedModalBtn: {
    marginHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  lockedModalBtnText: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.3,
  },

  // ── Logout specific (red) ──
  logoutBtnRow: {
    flexDirection: "row",
    marginHorizontal: 24,
    gap: 12,
  },
  logoutCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
  },
  logoutCancelText: {
    color: "#374151",
    fontSize: 15,
    fontWeight: "600",
  },
  logoutConfirmBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "#EF4444",
    alignItems: "center",
  },
  logoutConfirmText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
});
