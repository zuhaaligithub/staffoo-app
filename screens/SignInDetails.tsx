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
} from "lucide-react-native";
import { launchCamera } from "react-native-image-picker";
import Geolocation from "react-native-geolocation-service";

// Import your API function (adjust path if needed)
import { signInShift } from "../services/authApi";
import ImageResizer from "react-native-image-resizer";

const COLORS = {
  background: "#030508",
  surface: "#0A121C",
  card: "#0F1A28",
  cardAlt: "#0D1621",
  cardBorder: "rgba(255,255,255,0.06)",
  cardBorderStrong: "rgba(255,255,255,0.10)",
  primary: "#00C2B2",
  primaryDark: "#00A99D",
  primaryGlow: "rgba(0,194,178,0.16)",
  primaryBorder: "rgba(0,194,178,0.35)",
  text: "#FFFFFF",
  textSecondary: "#9AAABC",
  textMuted: "#5C6E85",
  success: "#34D399",
  successBg: "rgba(52,211,153,0.12)",
  danger: "#F87171",
  dangerBg: "rgba(248,113,113,0.12)",
  warning: "#FBBF24",
  warningBg: "rgba(251,191,36,0.10)",
  disabled: "#26313F",
  disabledText: "#5C6E85",
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

  const formatTime = (isoString: string | undefined | null): string => {
    if (!isoString) return "--:--";
    const parts = isoString.split(" ");
    return parts[1]?.slice(0, 5) || "--:--";
  };

  const shift = {
    startTime: formatTime(rawShift.start) || "09:00",
    endTime: formatTime(rawShift.end) || "17:00",
    break: rawShift.break || "No",
    event: rawShift.event || rawShift.job_title || "",
    address:
      rawShift.site?.address ||
      rawShift.address ||
      rawShift.location ||
      "No address provided",
    tasks: rawShift.tasks || "No task is available",
    notes:
      rawShift.shift_instructions ||
      rawShift.site?.description ||
      rawShift.notes ||
      rawShift.instructions ||
      rawShift.description ||
      "",
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
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <ArrowLeft size={18} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.headerTextWrap}>
          <Text style={styles.headerTitle}>Shift Sign-in</Text>
          <Text style={styles.headerSubtitle}>{shift.event}</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Time Cards */}
        <View style={styles.timeRow}>
          <View style={styles.timeCard}>
            <View style={styles.timeIconCircle}>
              <Clock size={18} color={COLORS.primary} />
            </View>
            <Text style={styles.timeLabel}>SHIFT START</Text>
            <Text style={styles.timeValue}>{shift.startTime}</Text>
          </View>

          <View style={styles.timeDivider} />

          <View style={styles.timeCard}>
            <View style={styles.timeIconCircle}>
              <Clock size={18} color={COLORS.primary} />
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
                <AlertCircle size={17} color={COLORS.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.panelTitle}>Status</Text>
                <Text style={styles.panelValue}>Ready to Sign-in</Text>
              </View>
            </View>

            <View style={styles.notesPanel}>
              <View style={styles.panelIcon}>
                <FileText size={17} color={COLORS.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.panelTitle}>Site Description</Text>
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
                <View style={styles.selfieOverlay}>
                  <View style={styles.retakeBadge}>
                    <RotateCcw size={13} color={COLORS.text} />
                    <Text style={styles.retakeBadgeText}>Retake</Text>
                  </View>
                </View>
                <View style={styles.selfieCheck}>
                  <Check size={13} color={COLORS.background} />
                </View>
              </>
            ) : (
              <View style={styles.selfiePlaceholder}>
                <View style={styles.cameraIconContainer}>
                  <Camera size={30} color={COLORS.primary} />
                </View>
                <Text style={styles.selfieTitle}>Sign-In Selfie</Text>
                <Text style={styles.selfieSubtitle}>Tap to take photo</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Address */}
        <View style={styles.addressCard}>
          <View style={styles.panelIcon}>
            <MapPin size={17} color={COLORS.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.panelTitle}>Site Address</Text>
            <Text style={styles.addressText}>{shift.address}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Start Button */}
      <View style={styles.startButtonWrap}>
        <TouchableOpacity
          style={[styles.startButton, !canStart && styles.startButtonDisabled]}
          activeOpacity={0.85}
          disabled={!canStart || loading}
          onPress={handleStartShift}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.background} />
          ) : (
            <>
              {canStart && <Check size={18} color={COLORS.background} />}
              <Text
                style={[
                  styles.startButtonText,
                  !canStart && styles.startButtonTextDisabled,
                ]}
              >
                {!selfieUri
                  ? "Take your selfie to continue"
                  : !locationReady
                  ? "Waiting for location…"
                  : "Start Shift"}
              </Text>
            </>
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
    paddingTop: 25,
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 30,
    paddingBottom: 14,
    // paddingVertical: 20,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTextWrap: {
    flex: 1,
    marginLeft: 80,
    marginTop: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
  },
  headerSubtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  headerSpacer: {
    width: 38,
  },

  // Empty state
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
    paddingBottom: 130,
  },

  // Time row
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    paddingVertical: 10,
    marginBottom: 10,
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
    borderRadius: 18,
    backgroundColor: COLORS.primaryGlow,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  timeLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    letterSpacing: 0.8,
    marginBottom: 4,
    fontWeight: "600",
  },
  timeValue: {
    fontSize: 17,
    fontWeight: "700",
    color: COLORS.text,
  },

  // Status banners
  statusBanner: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    paddingVertical: 5,
    paddingHorizontal: 14,
    marginBottom: 10,
    borderWidth: 1,
    gap: 10,
  },
  infoBanner: {
    backgroundColor: COLORS.primaryGlow,
    borderColor: COLORS.primaryBorder,
  },
  successBanner: {
    backgroundColor: COLORS.successBg,
    borderColor: "rgba(52,211,153,0.3)",
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

  // Main content row
  mainContentRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 14,
  },
  leftPanel: {
    flex: 1,
    gap: 10,
  },
  statusPanel: {
    // height: 72,
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
    // height: 92,
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
    borderRadius: 12,
    backgroundColor: COLORS.primaryGlow,
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
    fontWeight: "600",
    color: COLORS.text,
  },
  notesText: {
    fontSize: 11.5,
    color: COLORS.textSecondary,
    lineHeight: 16,
  },

  // Selfie
  selfiePanel: {
    width: 158,
    height: 164,
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
    paddingHorizontal: 12,
  },
  cameraIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primaryGlow,
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
  },
  selfieOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: 8,
    alignItems: "center",
    backgroundColor: "rgba(3,5,8,0.55)",
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

  // Address
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

  // Start button
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
    backgroundColor: COLORS.primary,
  },
  startButtonDisabled: {
    backgroundColor: COLORS.disabled,
  },
  startButtonText: {
    color: COLORS.background,
    fontSize: 16,
    fontWeight: "700",
  },
  startButtonTextDisabled: {
    color: COLORS.disabledText,
  },
});
