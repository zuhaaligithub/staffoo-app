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
  Camera,
  FileText,
  MapPin,
  AlertCircle,
  ChevronLeft,
  ArrowLeft,
} from "lucide-react-native";
import { launchCamera } from "react-native-image-picker";
import Geolocation from "react-native-geolocation-service";

// Import your API function (adjust path if needed)
import { signInShift } from "../services/authApi";
import ImageResizer from "react-native-image-resizer";

const COLORS = {
  primary: "#89E7D0",
  primaryDark: "#4FCBB3",
  background: "#001F3F",
  surface: "#12243A",
  card: "rgba(255,255,255,0.06)",
  cardBorder: "rgba(255,255,255,0.08)",
  text: "#FFFFFF",
  textSecondary: "rgba(255,255,255,0.7)",
  textMuted: "rgba(255,255,255,0.5)",
  success: "#22C55E",
  warning: "#F59E0B",
  danger: "#EF4444",
  border: "rgba(255,255,255,0.08)",
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

  // ── Added Explicit Coordinate States ────────────────────────
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

  // Format time helper
  const formatTime = (isoString: string | undefined | null): string => {
    if (!isoString) return "--:--";
    const parts = isoString.split(" ");
    return parts[1]?.slice(0, 5) || "--:--";
  };

  const shift = {
    startTime: formatTime(rawShift.start) || "09:00",
    endTime: formatTime(rawShift.end) || "17:00",
    break: rawShift.break || "No",
    event: rawShift.event || rawShift.job_title || "Security Duty",
    address:
      rawShift.site?.address ||
      rawShift.address ||
      rawShift.location ||
      "No address provided",
    tasks: rawShift.tasks || "No task is available",
    notes:
      rawShift.shift_instructions ||
      rawShift.notes ||
      rawShift.instructions ||
      rawShift.site_description ||
      
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

  const requestLocationPermission = async (): Promise<boolean> => {
    try {
      if (Platform.OS === "android") {
        const hasFinePermission = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        );

        if (hasFinePermission) {
          return true;
        }

        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: "Location Permission",
            message: "This app needs access to your location.",
            buttonPositive: "OK",
            buttonNegative: "Cancel",
          },
        );

        return granted === PermissionsAndroid.RESULTS.GRANTED;
      }

      const auth = await Geolocation.requestAuthorization("whenInUse");
      return auth === "granted";
    } catch (error) {
      console.log("Permission Error:", error);
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

      setLocationError("Unable to get location (network-based)");
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

      // ── Passing explicit coordinates in the payload ───────────────
      const payload = {
        time: formatDateTime(now),
        location: `${latitude},${longitude}`, // kept for backwards compatibility
        latitude: latitude, // exact latitude
        longitude: longitude, // exact longitude
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
        <Text
          style={{
            padding: 40,
            textAlign: "center",
            color: "red",
            fontSize: 16,
          }}
        >
          Error: No shift information received.
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#111111" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ArrowLeft size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Sign In Details</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.mainCard}>
          {/* Time Row */}
          <View style={styles.timeRow}>
            <LinearGradient
              colors={[
                "rgba(255, 255, 255, 0.42)",
                "rgba(255, 255, 255, 0.35)",
                "rgba(255, 255, 255, 0.22)",
                "rgba(255, 255, 255, 0.12)",
                "rgba(255, 255, 255, 0.25)",
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.timeCard}
            >
              <View style={styles.siteCardInner}>
                <View style={styles.iconCircle}>
                  <Clock size={20} color="#3b82f6" />
                </View>
                <Text style={styles.timeLabel}>Start Time</Text>
                <Text style={styles.timeValue}>{shift.startTime}</Text>
              </View>
            </LinearGradient>
            <LinearGradient
              colors={[
                "rgba(255, 255, 255, 0.42)",
                "rgba(255, 255, 255, 0.35)",
                "rgba(255, 255, 255, 0.22)",
                "rgba(255, 255, 255, 0.12)",
                "rgba(255, 255, 255, 0.25)",
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.timeCard}
            >
              <View style={styles.siteCardInner}>
                <View style={styles.iconCircle}>
                  <Clock size={20} color="#3b82f6" />
                </View>
                <Text style={styles.timeLabel}>End Time</Text>
                <Text style={styles.timeValue}>{shift.endTime}</Text>
              </View>
            </LinearGradient>
          </View>

          {/* Break + Notes + Selfie */}
          <View style={styles.combinedRow}>
            <View style={styles.leftColumn}>
              <LinearGradient
                colors={[
                  "rgba(255, 255, 255, 0.42)",
                  "rgba(255, 255, 255, 0.35)",
                  "rgba(255, 255, 255, 0.22)",
                  "rgba(255, 255, 255, 0.12)",
                  "rgba(255, 255, 255, 0.25)",
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.halfCardcontainer}
              >
                <View style={styles.halfCard}>
                  <View style={styles.smallIconCircle}>
                    <X size={18} color="#3b82f6" />
                  </View>
                  <View>
                    <Text style={styles.smallTitle}>Shift Status</Text>
                    <Text style={styles.smallValue}>Sign In</Text>
                  </View>
                </View>
              </LinearGradient>

              <LinearGradient
                colors={[
                  "rgba(255, 255, 255, 0.42)",
                  "rgba(255, 255, 255, 0.35)",
                  "rgba(255, 255, 255, 0.22)",
                  "rgba(255, 255, 255, 0.12)",
                  "rgba(255, 255, 255, 0.25)",
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.Cardcontainer}
              >
                <View style={[styles.halfCard]}>
                  <View style={styles.smallIconCircle}>
                    <FileText size={18} color="#3b82f6" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.smallTitle}>Sign in Notes</Text>
                    <Text style={[styles.smallValue, { marginTop: 4 }]}>
                      {shift.notes || "Not added yet"}
                    </Text>
                  </View>
                </View>
              </LinearGradient>
            </View>

            {/* Selfie Card */}
            <View style={styles.rightColumn}>
              <LinearGradient
                colors={[
                  "rgba(255, 255, 255, 0.42)",
                  "rgba(255, 255, 255, 0.35)",
                  "rgba(255, 255, 255, 0.22)",
                  "rgba(255, 255, 255, 0.12)",
                  "rgba(255, 255, 255, 0.25)",
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.halfCardcontainer}
              >
                <View style={styles.selfieCard}>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={openCamera}
                    style={{
                      alignItems: "center",
                      flex: 1,
                      justifyContent: "center",
                    }}
                  >
                    {selfieUri ? (
                      <Image
                        source={{ uri: selfieUri }}
                        style={styles.selfieImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <>
                        <View style={styles.selfieIconCircle}>
                          <Camera size={20} color="#3b82f6" />
                        </View>
                        <Text style={styles.smallTitle}>SignIn Selfie</Text>
                        <Text
                          style={{
                            fontSize: 12,
                            color: "#3b82f6",
                            marginTop: 4,
                          }}
                        >
                          Tap to take photo
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </LinearGradient>
            </View>
          </View>
          <View style={styles.statusBadge}>
            <View style={styles.dot} />
            <Text style={styles.statusText}>Ready to Sign In</Text>
          </View>

          {/* ── Updated Location Banner showing exact Lat/Lng ── */}
          <View style={styles.locationBanner}>
            {locationLoading ? (
              <ActivityIndicator size="small" color="#3b82f6" />
            ) : (
              <MapPin size={16} color={locationReady ? "#10b981" : "#ef4444"} />
            )}
            <Text
              style={[
                styles.locationText,
                {
                  color: locationReady
                    ? "#10b981"
                    : locationLoading
                    ? "#3b82f6"
                    : "#ef4444",
                },
              ]}
            >
              {locationLoading
                ? "Fetching location..."
                : locationReady
                ? `Lat: ${latitude?.toFixed(5)}, Lng: ${longitude?.toFixed(5)}`
                : locationError}
            </Text>
          </View>

          {/* Event */}
          {/* <View style={styles.fieldCard}>
            <View style={styles.fieldIcon}>
              <FileText size={20} color="#3b82f6" />
            </View>
            <View style={styles.fieldContent}>
              <Text style={styles.fieldLabel}>Event</Text>
              <Text style={styles.fieldValue}>{shift.event}</Text>
            </View>
          </View> */}

          {/* Address */}
          <View style={styles.fieldCard}>
            <View style={styles.fieldIcon}>
              <MapPin size={20} color="#3b82f6" />
            </View>
            <View style={styles.fieldContent}>
              <Text style={styles.addressText}>{shift.address}</Text>
            </View>
          </View>

          {/* Tasks */}
          {/* <View style={styles.fieldCard}>
            <View style={styles.fieldIcon}>
              <AlertCircle size={20} color="#3b82f6" />
            </View>
            <View style={styles.fieldContent}>
              <Text style={styles.fieldLabel}>Tasks</Text>
              <Text style={styles.fieldValue}>{shift.tasks}</Text>
            </View>
          </View> */}

          {/* Notes */}
          {shift.notes ? (
            <View style={styles.fieldCard}>
              <View style={styles.fieldIcon}>
                <FileText size={20} color="#3b82f6" />
              </View>
              <View style={styles.fieldContent}>
                <Text style={styles.fieldLabel}>Notes</Text>
                <Text style={styles.fieldValue}>{shift.notes}</Text>
              </View>
            </View>
          ) : null}
        </View>
      </ScrollView>

      {/* Start Button */}
      <TouchableOpacity
        style={[
          styles.startButton,
          { backgroundColor: canStart ? "#10b981" : "#9ca3af" },
        ]}
        activeOpacity={0.8}
        disabled={!canStart || loading}
        onPress={handleStartShift}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.startButtonText}>
            {selfieUri
              ? locationReady
                ? "START SHIFT"
                : "Waiting for location..."
              : "Take Selfie First"}
          </Text>
        )}
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#111111",
    paddingTop: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingVertical: 14,
    marginHorizontal: 16,
    borderRadius: 16,
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
  },
  screenTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#dcfce7",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    marginBottom: 14,
  },
  siteCardInner: {
    padding: 12,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#22c55e",
    marginRight: 8,
  },
  statusText: {
    color: "#15803d",
    fontWeight: "700",
    fontSize: 12,
  },
  backBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: {
    padding: 14,
    paddingBottom: 140,
  },
  mainCard: {
    borderRadius: 28,
  },
  timeRow: {
    flexDirection: "row",
    marginBottom: 10,
  },
  timeCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 24,
    alignItems: "center",
    marginHorizontal: 5,
  },
  timeLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  timeValue: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.text,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#dbeafe",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  halfCardcontainer: {
    borderRadius: 18,
  },
  Cardcontainer: { borderRadius: 18, marginTop: 10 },
  combinedRow: {
    flexDirection: "row",
    marginBottom: 14,
    gap: 10,
  },
  leftColumn: {
    flex: 1,
  },
  rightColumn: {
    width: 140,
  },
  halfCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderRadius: 18,
    padding: 12,
  },
  smallIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 22,
    backgroundColor: "#dbeafe",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 9,
  },
  smallTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#fff",
  },
  smallValue: {
    fontSize: 11,
    fontWeight: "600",
    color: "#fff",
  },
  selfieCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: "#dbeafe",
    borderStyle: "dashed",
    padding: 12,
    overflow: "hidden",
    minHeight: 140,
  },
  selfieIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#e2e8f0",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  selfieImage: {
    width: "100%",
    height: "100%",
    borderRadius: 18,
  },
  locationBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderRadius: 18,
    padding: 14,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  locationText: {
    fontSize: 13,
    flex: 1,
    color: COLORS.textSecondary,
    marginLeft: 8,
  },
  fieldCard: {
    flexDirection: "row",
    backgroundColor: COLORS.card,
    borderRadius: 22,
    padding: 16,
    marginBottom: 14,
    alignItems: "flex-start",
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 4,
    color: COLORS.text,
  },
  fieldValue: {
    fontSize: 11,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  fieldIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#e0ecff",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  fieldContent: {
    flex: 1,
  },
  addressText: {
    fontSize: 12,
    color: "#0ea5a4",
    fontWeight: "600",
    lineHeight: 15,
  },
  startButton: {
    position: "absolute",
    bottom: 28,
    left: 16,
    right: 16,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    backgroundColor: COLORS.primaryDark,
  },
  startButtonText: {
    color: "#ffffff",
    fontSize: 17,
    fontWeight: "700",
  },
});
