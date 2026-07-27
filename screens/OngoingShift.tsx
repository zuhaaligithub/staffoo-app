import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Image,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
  PermissionsAndroid,
  Vibration,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import RNFS from "react-native-fs";
import {
  ChevronLeft,
  Camera as CameraIcon,
  AlertCircle,
  Footprints,
  Plus,
  Clock,
} from "lucide-react-native";
import { launchCamera } from "react-native-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Geolocation from "react-native-geolocation-service";
import axios from "axios";
import SoundPlayer from "react-native-sound-player";
import ImageResizer from "react-native-image-resizer";
import { SvgXml } from "react-native-svg";
import {
  Camera,
  useCameraDevice,
  useCodeScanner,
} from "react-native-vision-camera";
import { BASE_URL } from "../services/authApi";

// ─── Helpers ────────────────────────────────────────────────────────────────
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

const getDistanceMeters = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number => {
  if (isNaN(lat1) || isNaN(lon1) || isNaN(lat2) || isNaN(lon2)) return Infinity;
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// ─── Interfaces ─────────────────────────────────────────────────────────────

interface Task {
  id: number;
  job_roster_id: number;
  task: string;
  task_start: string;
  task_end: string;
  status: "pending" | "started" | "completed";
  start_time?: string | null;
  end_time?: string | null;
  note?: string | null;
}

interface Shift {
  id: number;
  guard_id: number;
  shift_end_time?: string;
  job_roster_activities?: {
    job_roster_id: number;
  };
  site?: {
    id: number;
    site_name: string;
    address?: string;
    lat?: number;
    lng?: number;
    longitude?: number;
  };
  lat?: number;
  lng?: number;
  latitude?: number;
  longitude?: number;
  signin_time?: string | null;
  signinTime?: string | null;
  signed_in_at?: string | null;
  job_roster_task?: Task[];
  start?: string;
  end?: string;
}

// ─── QR Scanner Component ──────────────────────────────────────────────

function QRScannerModal({
  visible,
  onClose,
  onCodeScanned,
}: {
  visible: boolean;
  onClose: () => void;
  onCodeScanned: (codes: any[]) => void;
}) {
  const device = useCameraDevice("back");
  const codeScanner = useCodeScanner({
    codeTypes: ["qr"],
    onCodeScanned: (codes) => {
      if (visible) onCodeScanned(codes);
    },
  });

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: "black" }}>
        {device ? (
          <Camera
            style={StyleSheet.absoluteFill}
            device={device}
            isActive={visible}
            codeScanner={codeScanner}
          />
        ) : (
          <View
            style={[
              StyleSheet.absoluteFill,
              { justifyContent: "center", alignItems: "center" },
            ]}
          >
            <Text style={{ color: "white" }}>
              Camera not available or not linked.
            </Text>
            <TouchableOpacity
              onPress={onClose}
              style={{
                marginTop: 20,
                padding: 10,
                backgroundColor: COLORS.primary,
                borderRadius: 8,
              }}
            >
              <Text style={{ color: COLORS.text }}>Close</Text>
            </TouchableOpacity>
          </View>
        )}
        <View style={styles.scannerOverlay}>
          <TouchableOpacity style={styles.closeScanner} onPress={onClose}>
            <ChevronLeft color={COLORS.text} size={32} />
          </TouchableOpacity>
          <View style={styles.scannerFrame} />
          <Text style={styles.scannerText}>Align QR Code within the frame</Text>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function OngoingShift({
  navigation,
  route,
}: {
  navigation: any;
  route: any;
}) {
  // Timer
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [shiftStartTime, setShiftStartTime] = useState<Date | null>(null);

  // Selfie
  const [selfieUri, setSelfieUri] = useState<string | null>(null);
  const [selfieBase64, setSelfieBase64] = useState<string | null>(null);

  // Shift
  const [currentShift, setCurrentShift] = useState<Shift | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loginId, setLoginId] = useState<number | null>(null);

  // Sign-out
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [signoutNotes, setSignoutNotes] = useState("");

  // Break
  const [breakModalVisible, setBreakModalVisible] = useState(false);
  const [breakNote, setBreakNote] = useState("");
  const [informedTo, setInformedTo] = useState("");
  const [isOnBreak, setIsOnBreak] = useState(false);
  const [breakLoading, setBreakLoading] = useState(false);
  const [breakStartTime, setBreakStartTime] = useState<string | null>(null);

  // Tasks
  const [startedTasks, setStartedTasks] = useState<Set<number>>(new Set());
  const [taskLoading, setTaskLoading] = useState<number | null>(null);
  const [remainingMinutes, setRemainingMinutes] = useState<number>(999);

  // QR / Handover
  const [isScannerVisible, setIsScannerVisible] = useState(false);
  const [isScanningHandover, setIsScanningHandover] = useState(false);

  // ── NEW: store the SVG string returned by the API so we can render it ──
  const [qrSvgXml, setQrSvgXml] = useState<string | null>(null);
  const [showQR, setShowQR] = useState(false);
  const [isHandingOver, setIsHandingOver] = useState(false);

  // Proximity / Alarm
  const [jobCoordinates, setJobCoordinates] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [alarmInterval, setAlarmInterval] = useState<NodeJS.Timeout | null>(
    null,
  );
  const hasAlarmedRef = useRef(false);
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const RADIUS_METERS = 300;
  const POLL_INTERVAL_MS = 30000;
  const ALARM_REPEAT_INTERVAL = 15000;
  const VIBRATION_PATTERN = [600, 400, 600];

  const rosterId = currentShift?.job_roster_activities?.job_roster_id;

  // ─── QR scan callback ─────────────────────────────────────────────────
  const onCodeScanned = (codes: any[]) => {
    if (codes.length > 0 && isScannerVisible) {
      const value = codes[0].value;
      console.log("Scanned QR raw value:", value);
      setIsScannerVisible(false);

      try {
        let scannedData: any;
        try {
          scannedData = JSON.parse(value || "{}");
        } catch {
          scannedData = { handover_token: value };
        }
        processScannedQR(scannedData);
      } catch (err) {
        Alert.alert("Error", "Invalid QR code format");
      }
    }
  };

  // ─── Remaining minutes until shift end ────────────────────────────────

  useEffect(() => {
    if (!currentShift) return;

    const endTimeStr = currentShift.shift_end_time || currentShift.end;

    if (!endTimeStr) {
      setRemainingMinutes(999);
      return;
    }

    const interval = setInterval(() => {
      const now = new Date();
      let shiftEndDate: Date;

      if (endTimeStr.includes(":")) {
        const today = new Date();
        const [hours, minutes] = endTimeStr.split(":").map(Number);
        shiftEndDate = new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate(),
          hours,
          minutes,
        );
      } else {
        shiftEndDate = new Date(endTimeStr);
      }

      if (isNaN(shiftEndDate.getTime())) {
        setRemainingMinutes(999);
        return;
      }

      const diffMs = shiftEndDate.getTime() - now.getTime();
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      setRemainingMinutes(diffMinutes > 0 ? diffMinutes : 0);
    }, 1000);

    return () => clearInterval(interval);
  }, [currentShift]);

  // ─── Load shift from params ────────────────────────────────────────────

  useEffect(() => {
    const shiftFromParams = route.params?.currentShift;
    if (!shiftFromParams) {
      Alert.alert("Error", "No shift data received.");
      return;
    }

    setCurrentShift(shiftFromParams);

    const rawSigninTime =
      shiftFromParams.signin_time ||
      shiftFromParams.signinTime ||
      shiftFromParams.signed_in_at;

    let startDate: Date;

    if (rawSigninTime) {
      try {
        if (typeof rawSigninTime === "string" && rawSigninTime.includes("-")) {
          const [datePart, timePart] = rawSigninTime.trim().split(" ");
          const [p1, p2, p3] = datePart.split("-");
          const time = timePart || "00:00";
          const now = Date.now();

          const dateA = new Date(`${p3}-${p1}-${p2}T${time}:00`);
          const dateB = new Date(`${p3}-${p2}-${p1}T${time}:00`);

          const validPast = (d: Date) =>
            !isNaN(d.getTime()) && d.getTime() <= now;

          if (validPast(dateA) && validPast(dateB)) {
            startDate = dateA.getTime() > dateB.getTime() ? dateA : dateB;
          } else if (validPast(dateA)) {
            startDate = dateA;
          } else if (validPast(dateB)) {
            startDate = dateB;
          } else {
            startDate = new Date();
          }
        } else {
          startDate = new Date(rawSigninTime);
        }
      } catch {
        startDate = new Date();
      }
    } else {
      startDate = new Date();
    }

    if (isNaN(startDate.getTime())) {
      startDate = new Date();
    }

    setShiftStartTime(startDate);

    const diffMs = Date.now() - startDate.getTime();
    setElapsedSeconds(Math.max(0, Math.floor(diffMs / 1000)));

    const lat =
      shiftFromParams.site?.lat ||
      shiftFromParams.lat ||
      shiftFromParams.latitude;
    const lng =
      shiftFromParams.site?.lng ||
      shiftFromParams.site?.longitude ||
      shiftFromParams.lng ||
      shiftFromParams.longitude;

    if (lat && lng) {
      setJobCoordinates({ lat: Number(lat), lng: Number(lng) });
    }

    setIsLoading(false);
  }, [route.params]);

  // ─── Load user from storage ────────────────────────────────────────────

  useEffect(() => {
    const getUserFromStorage = async () => {
      try {
        const storedUser = await AsyncStorage.getItem("user");
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          setLoginId(parsedUser?.id);
        }
      } catch (error) {
        console.error("Error reading user from storage:", error);
      }
    };
    getUserFromStorage();
  }, []);

  // ─── Timer tick ───────────────────────────────────────────────────────

  useEffect(() => {
    if (!shiftStartTime) return;

    const interval = setInterval(() => {
      const diffMs = Date.now() - shiftStartTime.getTime();
      setElapsedSeconds(Math.floor(diffMs / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [shiftStartTime]);

  // ─── Alarm helpers ────────────────────────────────────────────────────

  const triggerAlarm = () => {
    if (!jobCoordinates) return;
    if (Platform.OS === "android") {
      Vibration.vibrate(VIBRATION_PATTERN, true);
    } else {
      Vibration.vibrate();
    }
    try {
      const alarmAsset = require("../assets/tune/alarm.mp3");
      SoundPlayer.playAsset(alarmAsset);
    } catch (error) {
      console.log("[ALARM] Sound failed:", error);
    }
  };

  // ─── Proximity check ──────────────────────────────────────────────────

  useEffect(() => {
    if (!currentShift || !jobCoordinates) return;

    const requestPermission = async () => {
      if (Platform.OS === "android") {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      }
      return true;
    };

    const startRepeatingAlarm = () => {
      if (alarmInterval) return;
      triggerAlarm();
      const interval = setInterval(() => {
        triggerAlarm();
      }, ALARM_REPEAT_INTERVAL);
      setAlarmInterval(interval);
    };

    const localStopAlarm = () => {
      if (alarmInterval) {
        clearInterval(alarmInterval);
        setAlarmInterval(null);
      }
      hasAlarmedRef.current = false;
      Vibration.cancel();
      try {
        SoundPlayer.stop();
      } catch (_) {}
    };

    const getGoogleLocation = async () => {
      try {
        const response = await fetch(
          `https://www.googleapis.com/geolocation/v1/geolocate?key=AIzaSyCS-DB39Kk-Z25C5GWymVGshXIALbjXPGY`,
          {
            method: "POST",
          },
        );

        const data = await response.json();

        if (!data.location) throw new Error("Location not found");

        return {
          latitude: data.location.lat,
          longitude: data.location.lng,
        };
      } catch (error) {
        throw error;
      }
    };

    const checkProximity = async () => {
      try {
        const { latitude, longitude } = await getGoogleLocation();

        const distance = getDistanceMeters(
          latitude,
          longitude,
          jobCoordinates.lat,
          jobCoordinates.lng,
        );

        if (distance > RADIUS_METERS) {
          if (!hasAlarmedRef.current) {
            startRepeatingAlarm();
            hasAlarmedRef.current = true;
          }
        } else {
          localStopAlarm();
        }
      } catch (err) {
        console.warn("[Google Location Error]", err);
      }
    };

    const startChecking = async () => {
      if (!(await requestPermission())) return;
      checkProximity();
      checkIntervalRef.current = setInterval(checkProximity, POLL_INTERVAL_MS);
    };

    startChecking();

    return () => {
      if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
      localStopAlarm();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentShift, jobCoordinates]);

  // ─── Helpers ──────────────────────────────────────────────────────────

  const formatTime = (seconds: number) => {
    const totalSeconds = Math.max(0, seconds);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h.toString().padStart(2, "0")}:${m
      .toString()
      .padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const openCamera = async () => {
    if (Platform.OS === "android") {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA,
      );
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) return;
    }

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
      const cleanUri = compressed.uri.replace(/^file:\/\//, "");
      setSelfieUri(`file://${cleanUri}`);
      setSelfieBase64(`data:image/jpeg;base64,${base64Data}`);
    } catch (err) {
      console.error("Error processing image:", err);
      Alert.alert("Error", "Failed to process image.");
    }
  };

  // ─── Tasks ────────────────────────────────────────────────────────────

  const handleStartTask = async (taskId: number) => {
    if (taskLoading !== null) return;

    Alert.alert("Start Task", "Do you want to start this task now?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Start",
        onPress: async () => {
          try {
            setTaskLoading(taskId);

            const userJson = await AsyncStorage.getItem("user");
            if (!userJson) throw new Error("User not found");

            const user = JSON.parse(userJson);
            const guardId = user?.id;
            if (!guardId) throw new Error("Guard ID missing");

            const token = await AsyncStorage.getItem("@auth_token");
            if (!token) throw new Error("No auth token");

            // ✅ Removed Geolocation, using stored shift/site coordinates
            const locationStr = jobCoordinates
              ? `${jobCoordinates.lat},${jobCoordinates.lng}`
              : "0,0";

            const now = new Date();
            const pad = (n: number) => n.toString().padStart(2, "0");

            const startTime = `${pad(now.getDate())}-${pad(
              now.getMonth() + 1,
            )}-${now.getFullYear()} ${pad(now.getHours())}:${pad(
              now.getMinutes(),
            )}`;

            const payload = {
              roster_id: rosterId,
              guard_id: guardId,
              task_id: taskId,
              start_time: startTime,
              location: locationStr,
            };

            const response = await fetch(`${BASE_URL}/start_task/${taskId}`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
                Accept: "application/json",
              },
              body: JSON.stringify(payload),
            });

            const result = await response.json();

            if (!response.ok || !result?.success) {
              throw new Error(result?.message || "Failed to start task");
            }

            setStartedTasks((prev) => new Set([...prev, taskId]));
            Alert.alert("Success", "Task started successfully!");
          } catch (error: any) {
            Alert.alert("Error", error.message || "Failed to start task");
          } finally {
            setTaskLoading(null);
          }
        },
      },
    ]);
  };

  // ─── Sign Out ─────────────────────────────────────────────────────────

  const handleSignOut = async () => {
    if (!selfieUri || !selfieBase64) {
      Alert.alert("Missing Selfie", "Please take a sign-out selfie first.");
      return;
    }

    Alert.alert(
      "Confirm Sign Out",
      "Are you sure you want to end this shift?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "End Shift",
          style: "destructive",
          onPress: async () => {
            try {
              setIsSigningOut(true);

              const token = await AsyncStorage.getItem("@auth_token");
              if (!token) throw new Error("Authentication token not found");

              // ✅ Use already stored job coordinates instead of Geolocation
              const locationStr = jobCoordinates
                ? `${jobCoordinates.lat},${jobCoordinates.lng}`
                : "0,0";

              const now = new Date();
              const pad = (n: number) => n.toString().padStart(2, "0");

              const signoutTime = `${pad(now.getDate())}-${pad(
                now.getMonth() + 1,
              )}-${now.getFullYear()} ${pad(now.getHours())}:${pad(
                now.getMinutes(),
              )}`;

              const payload = {
                time: signoutTime,
                location: locationStr,
                jobId: currentShift?.id?.toString(),
                selfie: selfieBase64,
                notes: signoutNotes.trim() || "No notes",
                signin_time: currentShift?.signin_time || "",
              };

              await axios.post(
                `${BASE_URL}/signout/${currentShift?.id}`,
                payload,
                {
                  headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                  },
                },
              );

              Alert.alert("Success", "Shift ended successfully!", [
                { text: "OK", onPress: () => navigation.goBack() },
              ]);
            } catch (error: any) {
              Alert.alert(
                "Sign Out Failed",
                error.message || "Error signing out",
              );
            } finally {
              setIsSigningOut(false);
            }
          },
        },
      ],
    );
  };
  const formatAustralianDateTime = (dateTime: string | null | undefined) => {
    if (!dateTime) return "-";

    try {
      // Handle "07-20-2026 12:41" format
      if (dateTime.includes("-")) {
        const [datePart, timePart] = dateTime.split(" ");

        if (datePart) {
          const [month, day, year] = datePart.split("-").map(Number);

          const formattedDate = `${String(day).padStart(2, "0")}-${String(
            month,
          ).padStart(2, "0")}-${year}`;

          let formattedTime = timePart || "00:00";

          // If time is already HH:mm, keep it
          if (timePart && timePart.includes(":")) {
            formattedTime = timePart;
          } else {
            // Try to parse with new Date for AM/PM cases
            const tempDate = new Date(
              `${month}-${day}-${year} ${timePart || ""}`,
            );
            if (!isNaN(tempDate.getTime())) {
              const h = String(tempDate.getHours()).padStart(2, "0");
              const m = String(tempDate.getMinutes()).padStart(2, "0");
              formattedTime = `${h}:${m}`;
            }
          }

          return `${formattedDate} ${formattedTime}`;
        }
      }

      // Fallback
      const date = new Date(dateTime);
      if (!isNaN(date.getTime())) {
        const day = String(date.getDate()).padStart(2, "0");
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const year = date.getFullYear();
        const hours = String(date.getHours()).padStart(2, "0");
        const minutes = String(date.getMinutes()).padStart(2, "0");
        return `${day}-${month}-${year} ${hours}:${minutes}`;
      }

      return dateTime;
    } catch (e) {
      // console.log("Date format error:", e);
      return dateTime || "-";
    }
  };
  // ─── HANDOVER ──────────────────────────────────────────────────────────

  const handleHandoverShift = async () => {
    Alert.alert("Handover Shift", "Generate QR Code for next staff?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Generate QR",
        onPress: async () => {
          try {
            setIsHandingOver(true);
            const token = await AsyncStorage.getItem("@auth_token");

            const response = await axios.get(
              `${BASE_URL}/roster/qr-code/${rosterId}`,
              {
                headers: { Authorization: `Bearer ${token}` },
              },
            );

            const rawQr: string = response.data?.qr_base64 ?? "";
            const svgPayload = rawQr.includes(",")
              ? rawQr.substring(rawQr.indexOf(",") + 1)
              : rawQr;

            setQrSvgXml(svgPayload);
            setShowQR(true);
          } catch (error: any) {
            Alert.alert("Error", error.message || "Failed to generate QR");
          } finally {
            setIsHandingOver(false);
          }
        },
      },
    ]);
  };

  const handleShakehandScan = async () => {
    if (Platform.OS === "android") {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA,
      );
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        Alert.alert(
          "Permission Denied",
          "Camera permission is required to scan QR codes.",
        );
        return;
      }
    }
    setIsScannerVisible(true);
  };

  const processScannedQR = async (scannedData: any) => {
    const handoverToken = scannedData.handover_token || scannedData.token;
    const qrRosterId = scannedData.roster_id;
    const scannerShiftId = currentShift?.id;

    if (!handoverToken) {
      Alert.alert("Invalid QR", "QR code is missing the handover token.");
      return;
    }

    if (!qrRosterId) {
      Alert.alert(
        "Invalid QR",
        "QR code is missing roster_id. Ask the outgoing guard to regenerate the QR.",
      );
      return;
    }

    if (!scannerShiftId) {
      Alert.alert("Error", "Could not determine your shift ID.");
      return;
    }

    await new Promise<void>((resolve, reject) => {
      Alert.alert(
        "Confirm Handover",
        `Are you sure you want to accept this handover?`,
        [
          {
            text: "Cancel",
            style: "cancel",
            onPress: () => reject(new Error("cancelled")),
          },
          { text: "Confirm", onPress: () => resolve() },
        ],
      );
    }).catch(() => {
      return;
    });

    if (!handoverToken) return;

    try {
      setIsScanningHandover(true);
      const authToken = await AsyncStorage.getItem("@auth_token");

      const payload = {
        token: handoverToken,
        roster_id: qrRosterId,
        scanner_shift_id: scannerShiftId,
      };

      const response = await axios.post(
        `${BASE_URL}/roster/handover/scan`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (response.data?.success) {
        Alert.alert("Success", "Handover completed successfully!", [
          { text: "OK", onPress: () => navigation.goBack() },
        ]);
      } else {
        throw new Error(response.data?.message || "Handover failed");
      }
    } catch (error: any) {
      Alert.alert(
        "Handover Failed",
        error?.response?.data?.message ||
          error.message ||
          "Handover scan failed",
      );
    } finally {
      setIsScanningHandover(false);
    }
  };

  // ─── Break Functions ────────────────────────────────────────────────────

  const handleToggleBreak = (value: boolean) => {
    if (value) {
      if (elapsedSeconds < 18000) {
        Alert.alert(
          "Break Not Allowed",
          "You can only take a break after 5 hours of your shift.",
        );
        return;
      }
      setBreakModalVisible(true);
    } else {
      handleEndBreak();
    }
  };

  const submitStartBreak = async () => {
    try {
      setBreakLoading(true);
      const token = await AsyncStorage.getItem("@auth_token");
      const response = await axios.post(
        `${BASE_URL}/break/${loginId}`,
        {
          roster_id: rosterId,
          notes: breakNote.trim(),
          inform: informedTo.trim(),
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (response.status === 200) {
        setBreakStartTime(new Date().toTimeString().slice(0, 5));
        setIsOnBreak(true);
        setBreakModalVisible(false);
        Alert.alert("Success", "Break started");
      }
    } catch {
      Alert.alert("Error", "Could not start break");
    } finally {
      setBreakLoading(false);
    }
  };

  const handleEndBreak = async () => {
    try {
      setBreakLoading(true);
      const token = await AsyncStorage.getItem("@auth_token");
      await axios.post(
        `${BASE_URL}/end_break/${loginId}`,
        {
          roster_id: rosterId,
          notes: breakNote.trim(),
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      setIsOnBreak(false);
      Alert.alert("Success", "Break ended");
    } catch {
      Alert.alert("Error", "Could not end break");
    } finally {
      setBreakLoading(false);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────

  if (isLoading) {
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

  const canSignOut = !!selfieUri && !!selfieBase64 && !isSigningOut;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ChevronLeft size={28} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ongoing Shift</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.timerCard}>
          <Text style={styles.timerText}>{formatTime(elapsedSeconds)}</Text>

          <Text style={styles.cardTitle}>Sign-in Time</Text>
          <Text style={styles.cardSubValues}>
            {formatAustralianDateTime(currentShift?.signin_time) || "N/A"}
          </Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>Site</Text>
          <Text style={styles.infoValue}>
            {currentShift?.site?.site_name || "Unknown Site"}
          </Text>
          <Text style={styles.infoAddress}>
            {currentShift?.site?.address || "No address"}
          </Text>
        </View>

        <View style={styles.combinedRow}>
          <View style={styles.leftColumn}>
            <View style={styles.halfCard}>
              <View style={styles.iconCircleGreen}>
                <Clock size={14} color={COLORS.success} />
              </View>
              <View>
                <Text style={styles.cardTitle}>Sign-in Time</Text>
                <Text style={styles.cardSubValue}>
                  {/* {currentShift?.signin_time || "N/A"} */}
                  {formatAustralianDateTime(currentShift?.signin_time) || "N/A"}
                </Text>
              </View>
            </View>
            {/* <View style={[styles.halfCard, { marginTop: 12 }]}>
              <View style={styles.iconCircleBlue}>
                <AlertCircle size={14} color={COLORS.primary} />
              </View>
              <View>
                <Text style={styles.cardTitle}>Sign-out Notes</Text>
                <TextInput
                  style={{ fontSize: 10, color: COLORS.text, padding: 0 }}
                  placeholder="Add any notes (optional)"
                  placeholderTextColor={COLORS.textSecondary}
                  value={signoutNotes}
                  onChangeText={setSignoutNotes}
                />
              </View>
            </View> */}

            <View style={[styles.halfCard, { marginTop: 12 }]}>
              <View style={styles.iconCircleBlue}>
                <AlertCircle size={14} color={COLORS.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>Sign-out Notes</Text>
                <TextInput
                  style={{ fontSize: 10, color: COLORS.text, padding: 0 }}
                  placeholder="Add any notes (optional)"
                  placeholderTextColor={COLORS.textSecondary}
                  value={signoutNotes}
                  onChangeText={setSignoutNotes}
                  multiline
                  numberOfLines={5} // ← Increased to 5 lines
                  textAlignVertical="top"
                />
              </View>
            </View>
          </View>

          <View style={styles.selfieCard}>
            <TouchableOpacity
              onPress={openCamera}
              activeOpacity={0.8}
              style={{ width: "100%", alignItems: "center" }}
            >
              {selfieUri ? (
                <Image
                  source={{ uri: selfieUri }}
                  style={styles.selfieImage}
                  resizeMode="cover"
                />
              ) : (
                <>
                  <View style={styles.iconCircleBlue}>
                    <CameraIcon size={22} color={COLORS.primary} />
                  </View>
                  <Text style={styles.cardTitle}>Sign-out Selfie</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.breakFullCard, isOnBreak && styles.onBreakFullCard]}
          onPress={() => handleToggleBreak(!isOnBreak)}
          disabled={breakLoading}
        >
          <View style={styles.breakContent}>
            <View
              style={[
                styles.iconCircleRedLarge,
                isOnBreak && { backgroundColor: COLORS.dangerBg },
              ]}
            >
              <Clock size={20} color={COLORS.danger} />
            </View>
            <View style={styles.breakTextContainer}>
              <Text style={styles.breakTitle}>
                {isOnBreak ? "End Break" : "Take a Break"}
              </Text>
              <Text style={styles.breakStatus}>
                {isOnBreak
                  ? `On break since ${breakStartTime}`
                  : "Tap to start your break"}
              </Text>
            </View>
            {breakLoading ? (
              <ActivityIndicator color={COLORS.danger} />
            ) : (
              <ChevronLeft
                size={20}
                color={COLORS.textSecondary}
                style={{ transform: [{ rotate: "180deg" }] }}
              />
            )}
          </View>
        </TouchableOpacity>

        <View style={styles.actionCard}>
          <View style={styles.actionRow}>
            <View style={styles.actionIcon}>
              <AlertCircle size={20} color={COLORS.primary} />
            </View>
            <Text style={styles.actionText}>Incident Report</Text>
            <TouchableOpacity
              style={styles.plusButton}
              onPress={() =>
                navigation.navigate("CreateIncidentReport", {
                  shiftId: currentShift?.id,
                  rosterId: rosterId,
                  guardId: loginId,
                  siteId: currentShift?.site?.id,
                  siteName: currentShift?.site?.site_name,
                })
              }
            >
              <Plus size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.actionCard}>
          <View style={styles.actionRow}>
            <View style={styles.actionIcon}>
              <Footprints size={20} color={COLORS.primary} />
            </View>
            <Text style={styles.actionText}>Foot Patrolling</Text>
            <TouchableOpacity
              style={styles.plusButton}
              onPress={() =>
                navigation.navigate("CreateFootReport", {
                  jobRoster: currentShift,
                })
              }
            >
              <Plus size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {currentShift?.job_roster_task &&
          currentShift.job_roster_task.length > 0 && (
            <View style={styles.taskSectionCard}>
              <View style={styles.taskHeader}>
                <Text style={styles.taskSectionTitle}>Tasks</Text>
                <Text style={styles.taskCount}>
                  {currentShift.job_roster_task.length} tasks
                </Text>
              </View>
              {currentShift.job_roster_task.map((task) => (
                <View key={task.id} style={styles.taskItem}>
                  <View style={styles.taskBullet}>
                    <View
                      style={[
                        styles.bulletDot,
                        startedTasks.has(task.id) && styles.bulletStarted,
                        task.status === "completed" && styles.bulletCompleted,
                      ]}
                    />
                  </View>
                  <View style={styles.taskContent}>
                    <Text
                      style={[
                        styles.taskText,
                        task.status === "completed" && styles.taskCompletedText,
                      ]}
                    >
                      "{task.task}"
                    </Text>
                    <Text style={styles.taskTime}>
                      starts at {task.task_start}
                    </Text>
                    <View style={styles.taskActions}>
                      {!startedTasks.has(task.id) &&
                        task.status !== "completed" && (
                          <TouchableOpacity
                            style={styles.startButton}
                            onPress={() => handleStartTask(task.id)}
                            disabled={taskLoading === task.id}
                          >
                            {taskLoading === task.id ? (
                              <ActivityIndicator
                                color={COLORS.text}
                                size="small"
                              />
                            ) : (
                              <Text style={styles.startButtonText}>Start</Text>
                            )}
                          </TouchableOpacity>
                        )}
                      {startedTasks.has(task.id) &&
                        task.status !== "completed" && (
                          <Text style={styles.completedLabel}>In Progress</Text>
                        )}
                      {task.status === "completed" && (
                        <Text style={styles.completedLabel}>Completed</Text>
                      )}
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}

        {/* ── Scan QR (Shift B: incoming guard scans Shift A's QR) ── */}
        <TouchableOpacity
          style={styles.shakehandButton}
          onPress={handleShakehandScan}
          disabled={isScanningHandover}
        >
          {isScanningHandover ? (
            <ActivityIndicator color={COLORS.text} size="small" />
          ) : (
            <Text style={styles.shakehandButtonText}>SCAN QR CODE</Text>
          )}
        </TouchableOpacity>

        {/* ── Generate Handover QR (Shift A: outgoing guard shows QR) ── */}
        {remainingMinutes <= 10 && remainingMinutes > 0 && (
          <View style={styles.handoverSection}>
            <TouchableOpacity
              style={styles.handoverButton}
              onPress={handleHandoverShift}
              disabled={isHandingOver}
            >
              {isHandingOver ? (
                <ActivityIndicator color={COLORS.text} size="small" />
              ) : (
                <Text style={styles.handoverButtonText}>
                  GENERATE HANDOVER QR
                </Text>
              )}
            </TouchableOpacity>

            {/* Render the SVG QR code returned by the API */}
            {showQR && qrSvgXml && (
              <View style={styles.qrContainer}>
                <SvgXml xml={qrSvgXml} width="200" height="200" />
                <Text style={styles.qrNote}>
                  Show this QR code to the next staff.
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      <View style={styles.bottomButtonContainer}>
        <TouchableOpacity
          style={[
            styles.endButton,
            { backgroundColor: canSignOut ? COLORS.danger : COLORS.textMuted },
          ]}
          disabled={!canSignOut}
          onPress={handleSignOut}
        >
          {isSigningOut ? (
            <ActivityIndicator color={COLORS.text} size="small" />
          ) : (
            <Text style={styles.endButtonText}>
              Take selfie first to end shift
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <QRScannerModal
        visible={isScannerVisible}
        onClose={() => setIsScannerVisible(false)}
        onCodeScanned={onCodeScanned}
      />

      <Modal visible={breakModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Start Break</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Notes..."
              placeholderTextColor={COLORS.textSecondary}
              value={breakNote}
              onChangeText={setBreakNote}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Informed To..."
              placeholderTextColor={COLORS.textSecondary}
              value={informedTo}
              onChangeText={setInformedTo}
            />
            <View style={styles.modalButtonRow}>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => setBreakModalVisible(false)}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={submitStartBreak}
                disabled={breakLoading}
              >
                {breakLoading ? (
                  <ActivityIndicator color={COLORS.primary} />
                ) : (
                  <Text style={styles.okText}>Start</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: COLORS.surface,
    marginHorizontal: 16,
    borderRadius: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.text,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  timerCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 15,
    alignItems: "center",
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 5,
  },
  timerText: {
    fontSize: 38,
    fontWeight: "800",
    color: COLORS.text,
    letterSpacing: 1,
  },
  infoCard: {
    padding: 16,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4,
  },
  infoLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
  },
  infoAddress: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  combinedRow: {
    flexDirection: "row",
    marginBottom: 15,
    gap: 12,
  },
  leftColumn: {
    flex: 1.2,
  },
  halfCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4,
  },
  selfieCard: {
    flex: 1,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4,
  },
  selfieImage: {
    width: "100%",
    height: 120,
    borderRadius: 12,
  },
  iconCircleBlue: {
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
    backgroundColor: COLORS.primaryGlow,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4,
  },
  iconCircleGreen: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(52, 200, 138, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4,
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.text,
  },
  cardSubValue: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  cardSubValues: {
    fontSize: 11,
    padding: 5,
    color: COLORS.textSecondary,
    marginTop: 5,
    height: 25,
    // width: 110,
    backgroundColor: COLORS.surface,
    borderRadius: 6,

    alignItems: "center",
    justifyContent: "center",
  },
  actionCard: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: COLORS.primaryGlow,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  actionText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.text,
  },
  plusButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surface,
    justifyContent: "center",
    alignItems: "center",
  },
  taskSectionCard: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4,
  },
  taskHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  taskSectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: COLORS.text,
  },
  taskCount: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  taskItem: {
    flexDirection: "row",
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
    paddingBottom: 12,
  },
  taskBullet: {
    marginRight: 12,
    marginTop: 4,
  },
  bulletDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.textMuted,
  },
  bulletStarted: {
    backgroundColor: COLORS.primary,
  },
  bulletCompleted: {
    backgroundColor: COLORS.success,
  },
  taskContent: {
    flex: 1,
  },
  taskText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
  },
  taskCompletedText: {
    textDecorationLine: "line-through",
    color: COLORS.textSecondary,
  },
  taskTime: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  taskActions: {
    marginTop: 8,
  },
  startButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 999,
    alignSelf: "flex-start",
  },
  startButtonText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: "600",
  },
  completedLabel: {
    fontSize: 12,
    color: COLORS.success,
    fontWeight: "600",
  },
  shakehandButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 18,
    alignItems: "center",
    marginBottom: 14,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  shakehandButtonText: {
    color: COLORS.text,
    fontWeight: "700",
  },
  handoverSection: {
    backgroundColor: COLORS.warningBg,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.warning,
  },
  handoverButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 15,
    borderRadius: 18,
    alignItems: "center",
  },
  handoverButtonText: {
    color: COLORS.text,
    fontWeight: "600",
  },
  qrContainer: {
    alignItems: "center",
    marginTop: 20,
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 20,
  },
  qrNote: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 12,
    fontWeight: "600",
  },
  bottomButtonContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.cardBorder,
  },
  endButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  endButtonText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "700",
  },
  breakFullCard: {
    flexDirection: "row",
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  onBreakFullCard: {
    backgroundColor: COLORS.dangerBg,
    borderColor: COLORS.danger,
  },
  breakContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  iconCircleRedLarge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.dangerBg,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  breakTextContainer: {
    flex: 1,
  },
  breakTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.text,
  },
  breakStatus: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalBox: {
    width: "85%",
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 16,
    textAlign: "center",
    color: COLORS.text,
  },
  modalInput: {
    backgroundColor: COLORS.card,
    color: COLORS.text,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  modalButtonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    alignItems: "center",
  },
  cancelText: {
    color: COLORS.textSecondary,
    fontWeight: "600",
  },
  okText: {
    color: COLORS.primary,
    fontWeight: "700",
  },
  scannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  closeScanner: {
    position: "absolute",
    top: 40,
    left: 20,
    padding: 8,
  },
  scannerFrame: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: "#fff",
    borderRadius: 20,
  },
  scannerText: {
    color: "#fff",
    marginTop: 20,
    fontWeight: "600",
  },
});
