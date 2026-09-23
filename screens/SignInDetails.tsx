

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Image,
  Alert,
  Platform,
  PermissionsAndroid,
  ActivityIndicator,
} from "react-native";
import LinearGradient from "react-native-linear-gradient";
import RNFS from "react-native-fs";
import Toast from "react-native-toast-message";
import {
  Clock,
  X,
  Check,
  Camera,
  FileText,
  MapPin,
  MapPinOff,
  AlertCircle,
  RefreshCw,
  ArrowLeft,
  RotateCcw,
  ShieldCheck,
} from "lucide-react-native";
import { launchCamera } from "react-native-image-picker";
import Geolocation from "react-native-geolocation-service";

// Import your API function (adjust path if needed)
import { signInShift } from "../services/authApi";
import ImageResizer from "react-native-image-resizer";

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
  // Derived tones used only for this screen's finer details.
  successBg: "rgba(52,200,138,0.12)",
  disabled: "#1B2531",
  disabledText: "#4A6080",
};

interface SignInDetailsProps {
  navigation: any;
  route: any;
}

export default function SignInDetails({
  navigation,
  route,
}: SignInDetailsProps) {
  const [selfieUri, setSelfieUri] = useState<string | null>(null);
  const [selfieBase64, setSelfieBase64] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [locationError, setLocationError] = useState<string>("");

  const [locationReady, setLocationReady] = useState(false);
  const [locationLoading, setLocationLoading] = useState(true);
  const [shiftStarted, setShiftStarted] = useState(false);

  const rawShift = route?.params?.shift || {};
  const shiftId =
    rawShift.id ||
    rawShift.shift_id ||
    route?.params?.shiftId ||
    route?.params?.id;

  const formatTime = (dateTime: string | undefined | null): string => {
    if (!dateTime) return "--:--";
    // Handles "17-09-2026 21:00:00" and "2026-09-17 21:00:00"
    const parts = dateTime.split(" ");
    return parts[1]?.slice(0, 5) || "--:--";
  };

  const shift = {
    startTime: formatTime(rawShift.start) || "09:00",
    endTime: formatTime(rawShift.end) || "17:00",
    break: rawShift.break || "No",

    // Title shown in the header
    event:
      rawShift.site?.site_name ||
      rawShift.event ||
      rawShift.job_title ||
      rawShift.description ||
      "Sign in to your shift",

    // Address card
    address:
      rawShift.site?.address ||
      rawShift.site?.site_name ||
      rawShift.address ||
      rawShift.location ||
      "No address provided",

    // Tasks (if you later want to show them)
    tasks:
      (Array.isArray(rawShift.job_roster_task) &&
        rawShift.job_roster_task.length > 0 &&
        rawShift.job_roster_task.map((t: any) => t.name || t).join(", ")) ||
      rawShift.tasks ||
      "No task is available",

    // Site description / notes
    notes:
      rawShift.shift_instructions ||
      rawShift.site?.description ||
      rawShift.description ||
      rawShift.notes ||
      rawShift.instructions ||
      "No site description available.",
  };

  const requestCameraPermission = async (): Promise<boolean> => {
    if (Platform.OS !== "android") return true;
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA,
        {
          title: "Camera Permission",
          message: "App needs camera access to take sign-in selfie.",
          buttonNeutral: "Ask Me Later",
          buttonNegative: "Cancel",
          buttonPositive: "OK",
        },
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
      console.warn("Camera permission error:", err);
      return false;
    }
  };

  const fetchLocation = async () => {
    setLocationLoading(true);
    setLocationError("");

    try {
      const response = await fetch(
        `https://www.googleapis.com/geolocation/v1/geolocate?key=AIzaSyCS-DB39Kk-Z25C5GWymVGshXIALbjXPGY`,
        {
          method: "POST",
        },
      );

      const data = await response.json();

      if (!data?.location) {
        throw new Error("Location not available");
      }

      const { lat, lng } = data.location;

      setLatitude(lat);
      setLongitude(lng);
      setLocationReady(true);
      setLocationLoading(false);
    } catch (error) {
      console.log("Google Location Error:", error);

      setLocationError("Unable to get your location");
      setLocationReady(false);
      setLocationLoading(false);
    }
  };

  const openCamera = async () => {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) return;

    try {
      const result = await launchCamera({
        mediaType: "photo",
        cameraType: "front",
        quality: 0.8,
      });

      if (result.didCancel || !result.assets?.[0].uri) return;

      const compressed = await ImageResizer.createResizedImage(
        result.assets[0].uri,
        600,
        600,
        "JPEG",
        60,
      );

      const base64Data = await RNFS.readFile(compressed.uri, "base64");

      setSelfieUri(compressed.uri);
      setSelfieBase64(`data:image/jpeg;base64,${base64Data}`);
    } catch (err) {
      console.error("Error processing image:", err);
      Alert.alert("Error", "Failed to process image.");
    }
  };

  const handleStartShift = async () => {
    try {
      if (!shiftId) {
        Toast.show({
          type: "error",
          text1: "Error",
          text2: "Shift ID missing",
          position: "bottom",
        });
        return;
      }

      if (!selfieBase64) {
        Toast.show({
          type: "error",
          text1: "Required",
          text2: "Please take a selfie first.",
          position: "bottom",
        });
        return;
      }

      if (!locationReady || latitude === null || longitude === null) {
        Toast.show({
          type: "error",
          text1: "Location Required",
          text2: "Waiting for valid location. Try again.",
          position: "bottom",
        });
        return;
      }

      setLoading(true);

      const now = new Date();
      const pad = (n: number) => n.toString().padStart(2, "0");
      const formatDateTime = (date: Date) =>
        `${pad(date.getDate())}-${pad(
          date.getMonth() + 1,
        )}-${date.getFullYear()} ${pad(date.getHours())}:${pad(
          date.getMinutes(),
        )}`;

      const payload = {
        time: formatDateTime(now),
        location: `${latitude},${longitude}`,
        latitude: latitude,
        longitude: longitude,
        selfie: selfieBase64,
        notes: shift.notes || "",
        signin_time: formatDateTime(now),
        tasks_photos: "",
      };

      console.log("📤 Payload:", payload);

      const response = await signInShift(shiftId, payload);

      if (!response?.success) {
        throw new Error(
          response?.message ||
            response?.error ||
            "Could not sign in. Try again.",
        );
      }

      Toast.show({
        type: "success",
        text1: "Shift Started",
        text2: "You have successfully signed in.",
        position: "bottom",
        visibilityTime: 4000,
      });

      setShiftStarted(true);
      navigation.goBack();
    } catch (err: any) {
      console.error("🔴 Sign In Error:", err);

      const backendMessage =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Could not sign in. Try again.";

      Toast.show({
        type: "error",
        text1: "Sign In Failed",
        text2: backendMessage,
        position: "bottom",
        visibilityTime: 4000,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      if (!mounted) return;
      await fetchLocation();
    };

    init();

    return () => {
      mounted = false;
    };
  }, []);

  const canStart = !!selfieUri && locationReady && !loading;

  if (!shiftId) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyStateWrap}>
          <View style={styles.emptyIconCircle}>
            <AlertCircle size={28} color={COLORS.danger} />
          </View>
          <Text style={styles.emptyTitle}>No shift details available</Text>
          <Text style={styles.emptySubtitle}>
            Go back and select a shift to sign in.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      {/* Header */}
      <LinearGradient
        colors={[COLORS.heroBg1, COLORS.heroBg2]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ArrowLeft size={18} color={COLORS.text} />
        </TouchableOpacity>

        <View style={styles.headerTextWrap}>
          <Text style={styles.headerEyebrow}>Shift sign-in</Text>
          <Text style={styles.headerTitle} numberOfLines={1}>
            Sign in to your shift
          </Text>
        </View>

        {/* Balances the back button so the title block stays visually
            centered between two equal-width elements. */}
        <View style={styles.headerSpacer} />
      </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Time Cards */}
        <View style={styles.timeRow}>
          <View style={styles.timeCard}>
            <View style={styles.timeIconCircle}>
              <Clock size={17} color={COLORS.primary} />
            </View>
            <Text style={styles.timeLabel}>SHIFT START</Text>
            <Text style={styles.timeValue}>{shift.startTime}</Text>
          </View>

          <View style={styles.timeDivider} />

          <View style={styles.timeCard}>
            <View style={styles.timeIconCircle}>
              <Clock size={17} color={COLORS.primary} />
            </View>
            <Text style={styles.timeLabel}>SHIFT END</Text>
            <Text style={styles.timeValue}>{shift.endTime}</Text>
          </View>
        </View>

        {/* Status + Notes */}
        <View style={styles.mainContentRow}>
          <View style={styles.leftPanel}>
            <View style={styles.statusPanel}>
              <View style={styles.panelIcon}>
                <ShieldCheck size={16} color={COLORS.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.panelTitle}>Status</Text>
                <Text style={styles.panelValue}>Ready to sign in</Text>
              </View>
            </View>

            <View style={styles.notesPanel}>
              <View style={styles.panelIcon}>
                <FileText size={16} color={COLORS.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.panelTitle}>Site description</Text>
                <Text style={styles.notesText} numberOfLines={4}>
                  {shift.notes || "No site description available."}
                </Text>
              </View>
            </View>
          </View>

          {/* Selfie */}
          <TouchableOpacity
            style={styles.selfiePanel}
            onPress={openCamera}
            activeOpacity={0.9}
          >
            {selfieUri ? (
              <>
                <Image
                  source={{ uri: selfieUri }}
                  style={styles.selfieImage}
                  resizeMode="cover"
                />
                <LinearGradient
                  colors={["rgba(3,5,8,0)", "rgba(3,5,8,0.75)"]}
                  style={styles.selfieOverlay}
                >
                  <View style={styles.retakeBadge}>
                    <RotateCcw size={13} color={COLORS.text} />
                    <Text style={styles.retakeBadgeText}>Retake</Text>
                  </View>
                </LinearGradient>
                <View style={styles.selfieCheck}>
                  <Check size={13} color={COLORS.background} />
                </View>
              </>
            ) : (
              <View style={styles.selfiePlaceholder}>
                <View style={styles.cameraIconContainer}>
                  <Camera size={28} color={COLORS.primary} />
                </View>
                <Text style={styles.selfieTitle}>Sign-in selfie</Text>
                <Text style={styles.selfieSubtitle}>Tap to take photo</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Location status */}
        {/* {locationLoading ? (
          <View style={[styles.statusBanner, styles.infoBanner]}>
            <ActivityIndicator size="small" color={COLORS.primary} />
            <Text style={styles.statusBannerText}>
              Getting your current location…
            </Text>
          </View>
        ) : locationReady ? (
          <View style={[styles.statusBanner, styles.successBanner]}>
            <MapPin size={15} color={COLORS.success} />
            <Text style={[styles.statusBannerText, { color: COLORS.success }]}>
              Location confirmed
            </Text>
          </View>
        ) : locationError ? (
          <View style={[styles.statusBanner, styles.errorBanner]}>
            <MapPinOff size={15} color={COLORS.danger} />
            <Text style={[styles.statusBannerText, { color: COLORS.danger }]}>
              {locationError}
            </Text>
            <TouchableOpacity
              style={styles.retryPill}
              onPress={fetchLocation}
              activeOpacity={0.8}
            >
              <RefreshCw size={12} color={COLORS.danger} />
              <Text style={styles.retryPillText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : null} */}

        {/* Address */}
        {/* Site Name */}
        <View style={styles.addressCard}>
          <View style={styles.panelIcon}>
            <ShieldCheck size={16} color={COLORS.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.panelTitle}>Site name</Text>
            <Text style={styles.addressText}>{shift.event}</Text>
          </View>
        </View>

        {/* Site Address */}
        <View style={[styles.addressCard, { marginTop: 12 }]}>
          <View style={styles.panelIcon}>
            <MapPin size={16} color={COLORS.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.panelTitle}>Site address</Text>
            <Text style={styles.addressText}>{shift.address}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Start Button */}
      <View style={styles.startButtonWrap}>
        <TouchableOpacity
          activeOpacity={0.85}
          disabled={!canStart || loading}
          onPress={handleStartShift}
        >
          {canStart ? (
            <LinearGradient
              colors={[COLORS.primary, "#00847A"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.startButton}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Check size={18} color="#fff" />
                  <Text style={styles.startButtonText}>Start shift</Text>
                </>
              )}
            </LinearGradient>
          ) : (
            <View style={[styles.startButton, styles.startButtonDisabled]}>
              {loading ? (
                <ActivityIndicator color={COLORS.disabledText} />
              ) : (
                <Text
                  style={[
                    styles.startButtonText,
                    styles.startButtonTextDisabled,
                  ]}
                >
                  {!selfieUri
                    ? "Take your selfie to continue"
                    : !locationReady
                    ? "Waiting for location…"
                    : "Start shift"}
                </Text>
              )}
            </View>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  // ── Header ──────────────────────────────────────────────────────────────
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "ios" ? 8 : 28,
    paddingBottom: 18,
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
    // borderBottomWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTextWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerEyebrow: {
    fontSize: 10.5,
    fontWeight: "700",
    color: COLORS.primary,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    marginBottom: 3,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: COLORS.text,
    textAlign: "center",
    maxWidth: 220,
  },
  headerSpacer: {
    width: 38,
    height: 38,
  },

  // ── Empty state ─────────────────────────────────────────────────────────
  emptyStateWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.dangerBg,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(248,113,113,0.3)",
  },
  emptyTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 6,
    textAlign: "center",
  },
  emptySubtitle: {
    color: COLORS.textMuted,
    fontSize: 13,
    textAlign: "center",
  },

  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 130,
  },

  // ── Time row ────────────────────────────────────────────────────────────
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    paddingVertical: 16,
    marginBottom: 12,
  },
  timeCard: {
    flex: 1,
    alignItems: "center",
  },
  timeDivider: {
    width: 1,
    height: 44,
    backgroundColor: COLORS.cardBorder,
  },
  timeIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: COLORS.primaryGlow,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  timeLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    letterSpacing: 0.8,
    marginBottom: 4,
    fontWeight: "700",
  },
  timeValue: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.text,
    letterSpacing: 0.2,
  },

  // ── Status banners ──────────────────────────────────────────────────────
  statusBanner: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    paddingVertical: 11,
    paddingHorizontal: 14,
    marginBottom: 12,
    borderWidth: 1,
    gap: 10,
  },
  infoBanner: {
    backgroundColor: COLORS.primaryGlow,
    borderColor: COLORS.primaryBorder,
  },
  successBanner: {
    backgroundColor: COLORS.successBg,
    borderColor: "rgba(52,200,138,0.3)",
  },
  errorBanner: {
    backgroundColor: COLORS.dangerBg,
    borderColor: "rgba(248,113,113,0.3)",
  },
  statusBannerText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.primary,
  },
  retryPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(248,113,113,0.15)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  retryPillText: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.danger,
  },

  // ── Main content row ────────────────────────────────────────────────────
  mainContentRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
    alignItems: "stretch",
  },
  leftPanel: {
    flex: 1,
    gap: 10,
  },
  statusPanel: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 18,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  notesPanel: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 18,
    padding: 14,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  panelIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: COLORS.primaryGlow,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
    justifyContent: "center",
    alignItems: "center",
  },
  panelTitle: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: "700",
    letterSpacing: 0.3,
    marginBottom: 3,
  },
  panelValue: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.text,
  },
  notesText: {
    fontSize: 11.5,
    color: COLORS.textSecondary,
    lineHeight: 16,
  },

  // ── Selfie ──────────────────────────────────────────────────────────────
  selfiePanel: {
    width: 158,
    height: 180, // ← fixed height
    backgroundColor: COLORS.card,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: COLORS.primaryBorder,
    borderStyle: "dashed",
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  selfiePlaceholder: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 24,
  },
  cameraIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primaryGlow,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  selfieTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.text,
    textAlign: "center",
  },
  selfieSubtitle: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 3,
    textAlign: "center",
  },
  selfieImage: {
    width: "100%",
    height: "100%",
    minHeight: 164,
  },
  selfieOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  retakeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  retakeBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.text,
  },
  selfieCheck: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: COLORS.success,
    justifyContent: "center",
    alignItems: "center",
  },

  // ── Address ─────────────────────────────────────────────────────────────
  addressCard: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    padding: 16,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  addressText: {
    fontSize: 12.5,
    fontWeight: "500",
    color: COLORS.textSecondary,
    lineHeight: 19,
  },

  // ── Start button ────────────────────────────────────────────────────────
  startButtonWrap: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === "ios" ? 28 : 18,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.cardBorder,
  },
  startButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
  },
  startButtonDisabled: {
    backgroundColor: COLORS.disabled,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  startButtonText: {
    color: "#ffff",
    fontSize: 16,
    fontWeight: "700",
  },
  startButtonTextDisabled: {
    color: COLORS.disabledText,
  },
});
