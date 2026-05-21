import React, { useState, useEffect, useRef } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import RNFS from 'react-native-fs';
import {
  ChevronLeft,
  Camera as CameraIcon,
  AlertCircle,
  Footprints,
  Plus,
  Clock,
} from 'lucide-react-native';
import { launchCamera } from 'react-native-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Geolocation from 'react-native-geolocation-service';
import axios from 'axios';
import SoundPlayer from 'react-native-sound-player';
import ImageResizer from 'react-native-image-resizer';
import { SvgXml } from 'react-native-svg';
import {
  Camera,
  useCameraDevice,
  useCodeScanner,
} from 'react-native-vision-camera';

// ─── Helpers ────────────────────────────────────────────────────────────────

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
  status: 'pending' | 'started' | 'completed';
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
  const device = useCameraDevice('back');
  const codeScanner = useCodeScanner({
    codeTypes: ['qr'],
    onCodeScanned: codes => {
      if (visible) onCodeScanned(codes);
    },
  });

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide">
      <SafeAreaView style={{ flex: 1, backgroundColor: 'black' }}>
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
              { justifyContent: 'center', alignItems: 'center' },
            ]}
          >
            <Text style={{ color: 'white' }}>
              Camera not available or not linked.
            </Text>
            <TouchableOpacity
              onPress={onClose}
              style={{
                marginTop: 20,
                padding: 10,
                backgroundColor: '#3b82f6',
                borderRadius: 8,
              }}
            >
              <Text style={{ color: 'white' }}>Close</Text>
            </TouchableOpacity>
          </View>
        )}
        <View style={styles.scannerOverlay}>
          <TouchableOpacity style={styles.closeScanner} onPress={onClose}>
            <ChevronLeft color="white" size={32} />
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
  const [signoutNotes, setSignoutNotes] = useState('');

  // Break
  const [breakModalVisible, setBreakModalVisible] = useState(false);
  const [breakNote, setBreakNote] = useState('');
  const [informedTo, setInformedTo] = useState('');
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

  const BASE_URL = 'https://apis.staffoo.com.au/api';
  const RADIUS_METERS = 300;
  const POLL_INTERVAL_MS = 30000;
  const ALARM_REPEAT_INTERVAL = 15000;
  const VIBRATION_PATTERN = [600, 400, 600];

  const rosterId = currentShift?.job_roster_activities?.job_roster_id;

  // ─── QR scan callback ─────────────────────────────────────────────────
  //
  // The QR code generated by Shift A encodes a JSON string:
  //   { handover_token: "...", roster_id: 619 }
  //
  // When Shift B scans that QR we add scanner_shift_id = currentShift.id
  // (i.e. Shift B's own shift id) before sending to the API.
  //
  const onCodeScanned = (codes: any[]) => {
    if (codes.length > 0 && isScannerVisible) {
      const value = codes[0].value;
      console.log('Scanned QR raw value:', value);
      setIsScannerVisible(false);

      try {
        let scannedData: any;
        try {
          scannedData = JSON.parse(value || '{}');
        } catch {
          // If the QR value is not JSON treat it as the raw token string
          scannedData = { handover_token: value };
        }
        processScannedQR(scannedData);
      } catch (err) {
        Alert.alert('Error', 'Invalid QR code format');
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

      if (endTimeStr.includes(':')) {
        const today = new Date();
        const [hours, minutes] = endTimeStr.split(':').map(Number);
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
      Alert.alert('Error', 'No shift data received.');
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
        if (typeof rawSigninTime === 'string' && rawSigninTime.includes('-')) {
          // API sends "MM-DD-YYYY HH:mm" e.g. "05-04-2026 10:53"
          // Also handle "DD-MM-YYYY" — pick whichever candidate is a valid past date.
          const [datePart, timePart] = rawSigninTime.trim().split(' ');
          const [p1, p2, p3] = datePart.split('-'); // p3 is always the 4-digit year
          const time = timePart || '00:00';
          const now = Date.now();

          // Candidate A: treat as MM-DD-YYYY (what the API actually returns)
          const dateA = new Date(`${p3}-${p1}-${p2}T${time}:00`);
          // Candidate B: treat as DD-MM-YYYY
          const dateB = new Date(`${p3}-${p2}-${p1}T${time}:00`);

          const validPast = (d: Date) =>
            !isNaN(d.getTime()) && d.getTime() <= now;

          if (validPast(dateA) && validPast(dateB)) {
            // Both valid — choose the more recent one (least elapsed = most correct)
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
        const storedUser = await AsyncStorage.getItem('user');
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          setLoginId(parsedUser?.id);
        }
      } catch (error) {
        console.error('Error reading user from storage:', error);
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
    if (Platform.OS === 'android') {
      Vibration.vibrate(VIBRATION_PATTERN, true);
    } else {
      Vibration.vibrate();
    }
    try {
      const alarmAsset = require('../assets/tune/alarm.mp3');
      SoundPlayer.playAsset(alarmAsset);
    } catch (error) {
      console.log('[ALARM] Sound failed:', error);
    }
  };

  // ─── Proximity check ──────────────────────────────────────────────────

  useEffect(() => {
    if (!currentShift || !jobCoordinates) return;

    const requestPermission = async () => {
      if (Platform.OS === 'android') {
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

    const checkProximity = () => {
      Geolocation.getCurrentPosition(
        pos => {
          const { latitude, longitude } = pos.coords;
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
        },
        err => console.warn('[Proximity] Location error:', err),
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 },
      );
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
    return `${h.toString().padStart(2, '0')}:${m
      .toString()
      .padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const openCamera = async () => {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA,
      );
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) return;
    }

    try {
      const result = await launchCamera({
        mediaType: 'photo',
        cameraType: 'front',
        quality: 0.8,
      });

      if (result.didCancel || !result.assets?.[0].uri) return;

      const compressed = await ImageResizer.createResizedImage(
        result.assets[0].uri,
        600,
        600,
        'JPEG',
        60,
      );

      const base64Data = await RNFS.readFile(compressed.uri, 'base64');
      const cleanUri = compressed.uri.replace(/^file:\/\//, '');
      setSelfieUri(`file://${cleanUri}`);
      setSelfieBase64(`data:image/jpeg;base64,${base64Data}`);
    } catch (err) {
      console.error('Error processing image:', err);
      Alert.alert('Error', 'Failed to process image.');
    }
  };

  // ─── Tasks ────────────────────────────────────────────────────────────

  const handleStartTask = async (taskId: number) => {
    if (taskLoading !== null) return;

    Alert.alert('Start Task', 'Do you want to start this task now?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Start',
        onPress: async () => {
          try {
            setTaskLoading(taskId);
            const userJson = await AsyncStorage.getItem('user');
            if (!userJson) throw new Error('User not found');
            const user = JSON.parse(userJson);
            const guardId = user?.id;
            if (!guardId) throw new Error('Guard ID missing');

            const token = await AsyncStorage.getItem('@auth_token');
            if (!token) throw new Error('No auth token');

            const location = await new Promise<{ lat: number; lng: number }>(
              (resolve, reject) => {
                Geolocation.getCurrentPosition(
                  pos =>
                    resolve({
                      lat: pos.coords.latitude,
                      lng: pos.coords.longitude,
                    }),
                  err => reject(err),
                  {
                    enableHighAccuracy: true,
                    timeout: 15000,
                    maximumAge: 10000,
                  },
                );
              },
            );

            const now = new Date();
            const pad = (n: number) => n.toString().padStart(2, '0');
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
              location: `${location.lat},${location.lng}`,
            };

            const response = await fetch(`${BASE_URL}/start_task/${taskId}`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
                Accept: 'application/json',
              },
              body: JSON.stringify(payload),
            });

            const result = await response.json();
            if (!response.ok || !result?.success)
              throw new Error(result?.message || 'Failed to start task');

            setStartedTasks(prev => new Set([...prev, taskId]));
            Alert.alert('Success', 'Task started successfully!');
          } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to start task');
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
      Alert.alert('Missing Selfie', 'Please take a sign-out selfie first.');
      return;
    }

    Alert.alert(
      'Confirm Sign Out',
      'Are you sure you want to end this shift?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Shift',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsSigningOut(true);
              const token = await AsyncStorage.getItem('@auth_token');
              if (!token) throw new Error('Authentication token not found');

              const position = await new Promise<Geolocation.GeoPosition>(
                (resolve, reject) => {
                  Geolocation.getCurrentPosition(resolve, reject, {
                    enableHighAccuracy: true,
                    timeout: 15000,
                  });
                },
              );
              const locationStr = `${position.coords.latitude},${position.coords.longitude}`;

              const now = new Date();
              const pad = (n: number) => n.toString().padStart(2, '0');
              const signoutTime = `${pad(now.getDate())}-${pad(
                now.getMonth() + 1,
              )}-${now.getFullYear()} ${pad(now.getHours())}:${pad(
                now.getMinutes(),
              )}`;

              const payload = {
                time: signoutTime,
                location: locationStr,
                jobId: currentShift?.id.toString(),
                selfie: selfieBase64,
                notes: signoutNotes.trim() || 'No notes',
                signin_time: currentShift?.signin_time || '',
              };

              await axios.post(
                `${BASE_URL}/signout/${currentShift?.id}`,
                payload,
                {
                  headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                  },
                },
              );

              Alert.alert('Success', 'Shift ended successfully!', [
                { text: 'OK', onPress: () => navigation.goBack() },
              ]);
            } catch (error: any) {
              Alert.alert(
                'Sign Out Failed',
                error.message || 'Error signing out',
              );
            } finally {
              setIsSigningOut(false);
            }
          },
        },
      ],
    );
  };

  // ─── HANDOVER: Shift A generates QR ───────────────────────────────────
  //
  // API returns:  { roster_id, handover_token, qr_base64 }
  //
  // The QR image (SVG) is shown on Shift A's screen.
  // The QR encodes JSON: { handover_token, roster_id }
  // (The API already bakes this into the QR image.)
  //
  const handleHandoverShift = async () => {
    Alert.alert('Handover Shift', 'Generate QR Code for next staff?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Generate QR',
        onPress: async () => {
          try {
            setIsHandingOver(true);
            const token = await AsyncStorage.getItem('@auth_token');

            const response = await axios.get(
              `${BASE_URL}/roster/qr-code/${rosterId}`,
              {
                headers: { Authorization: `Bearer ${token}` },
              },
            );

            // qr_base64 from your API is actually an SVG string prefixed with
            // "data:image/png;base64," — strip that prefix and use the raw SVG.
            const rawQr: string = response.data?.qr_base64 ?? '';

            // Extract the SVG payload that follows the data-URI prefix
            const svgPayload = rawQr.includes(',')
              ? rawQr.substring(rawQr.indexOf(',') + 1)
              : rawQr;

            setQrSvgXml(svgPayload);
            setShowQR(true);
          } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to generate QR');
          } finally {
            setIsHandingOver(false);
          }
        },
      },
    ]);
  };

  // ─── HANDOVER: Shift B opens scanner ──────────────────────────────────

  const handleShakehandScan = async () => {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA,
      );
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        Alert.alert(
          'Permission Denied',
          'Camera permission is required to scan QR codes.',
        );
        return;
      }
    }
    setIsScannerVisible(true);
  };

  // ─── HANDOVER: process scanned QR on Shift B ──────────────────────────
  //
  // scannedData comes from the QR that Shift A displayed.
  // It contains: { handover_token, roster_id }
  //
  // We must send:
  //   token            = handover_token from the QR
  //   roster_id        = roster_id from the QR  (Shift A's roster)
  //   scanner_shift_id = currentShift.id        (THIS device's shift id — Shift B)
  //
  const processScannedQR = async (scannedData: any) => {
    // Support both key names the QR might use
    const handoverToken = scannedData.handover_token || scannedData.token;

    // ✅ roster_id MUST come from the scanned QR (Shift A's roster).
    // Never fall back to this device's rosterId — they are different shifts.
    const qrRosterId = scannedData.roster_id;

    // ✅ scanner_shift_id is ALWAYS this device's own shift id (Shift B).
    const scannerShiftId = currentShift?.id;

    if (!handoverToken) {
      Alert.alert('Invalid QR', 'QR code is missing the handover token.');
      return;
    }

    if (!qrRosterId) {
      Alert.alert(
        'Invalid QR',
        'QR code is missing roster_id. Ask the outgoing guard to regenerate the QR.',
      );
      return;
    }

    if (!scannerShiftId) {
      Alert.alert('Error', 'Could not determine your shift ID.');
      return;
    }

    // ── Confirm before submitting (helps catch wrong QR scans) ──
    await new Promise<void>((resolve, reject) => {
      Alert.alert(
        'Confirm Handover',
        `Are you sure you want to accept this handover?`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => reject(new Error('cancelled')),
          },
          { text: 'Confirm', onPress: () => resolve() },
        ],
      );
    }).catch(() => {
      return;
    });

    // If user pressed Cancel the function exits here because of the throw above.
    // We re-check after the await:
    if (!handoverToken) return;

    try {
      setIsScanningHandover(true);
      const authToken = await AsyncStorage.getItem('@auth_token');

      // ✅ Correct payload:
      //   token            → handover_token from Shift A's QR
      //   roster_id        → Shift A's roster id (from QR)
      //   scanner_shift_id → THIS phone's shift id (Shift B)
      const payload = {
        token: handoverToken,
        roster_id: qrRosterId,
        scanner_shift_id: scannerShiftId,
      };

      console.log('[Handover scan] payload:', payload);

      const response = await axios.post(
        `${BASE_URL}/roster/handover/scan`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
        },
      );

      if (response.data?.success) {
        Alert.alert('Success', 'Handover completed successfully!', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        throw new Error(response.data?.message || 'Handover failed');
      }
    } catch (error: any) {
      Alert.alert(
        'Handover Failed',
        error?.response?.data?.message ||
          error.message ||
          'Handover scan failed',
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
          'Break Not Allowed',
          'You can only take a break after 5 hours of your shift.',
        );
        return;
      }
      setBreakModalVisible(true);
    } else {
      handleEndBreak();
    }
  };

  //   const handleToggleBreak = (value: boolean) => {
  //   if (value) {
  //     let allowedBreak = false;
  //     let message = '';

  //     // 4 to 6 hours → after 4 hours → 10 min break
  //     if (shiftHours >= 4 && shiftHours <= 6) {
  //       if (elapsedSeconds >= 4 * 60 * 60) {
  //         allowedBreak = true;
  //       } else {
  //         message =
  //           'You can take a 10 minute break after 4 hours of your shift.';
  //       }
  //     }

  //     // 6 to 8 hours → after 5 hours → 30 min break
  //     else if (shiftHours > 6 && shiftHours <= 8) {
  //       if (elapsedSeconds >= 5 * 60 * 60) {
  //         allowedBreak = true;
  //       } else {
  //         message =
  //           'You can take a 30 minute break after 5 hours of your shift.';
  //       }
  //     }

  //     // 8 to 10 hours → after 4 hours → 30 min break
  //     else if (shiftHours > 8 && shiftHours <= 10) {
  //       if (elapsedSeconds >= 4 * 60 * 60) {
  //         allowedBreak = true;
  //       } else {
  //         message =
  //           'You can take a 30 minute break after 4 hours of your shift.';
  //       }
  //     }

  //     // 10 to 12 hours → 3 breaks every 4 hours
  //     else if (shiftHours > 10 && shiftHours <= 12) {
  //       if (elapsedSeconds >= 4 * 60 * 60) {
  //         allowedBreak = true;
  //       } else {
  //         message =
  //           'You can take breaks every 4 hours during your shift.';
  //       }
  //     }

  //     if (!allowedBreak) {
  //       Alert.alert('Break Not Allowed', message);
  //       return;
  //     }

  //     setBreakModalVisible(true);
  //   } else {
  //     handleEndBreak();
  //   }
  // };

  const submitStartBreak = async () => {
    try {
      setBreakLoading(true);
      const token = await AsyncStorage.getItem('@auth_token');
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
        Alert.alert('Success', 'Break started');
      }
    } catch {
      Alert.alert('Error', 'Could not start break');
    } finally {
      setBreakLoading(false);
    }
  };

  const handleEndBreak = async () => {
    try {
      setBreakLoading(true);
      const token = await AsyncStorage.getItem('@auth_token');
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
      Alert.alert('Success', 'Break ended');
    } catch {
      Alert.alert('Error', 'Could not end break');
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
          color="#3b82f6"
          style={{ marginTop: 100 }}
        />
      </SafeAreaView>
    );
  }

  const canSignOut = !!selfieUri && !!selfieBase64 && !isSigningOut;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ChevronLeft size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ongoing Shift</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.timerCard}>
          <Text style={styles.timerText}>{formatTime(elapsedSeconds)}</Text>

          <Text style={styles.cardTitle}>Sign In Time</Text>
          <Text style={styles.cardSubValues}>
            {currentShift?.signin_time || 'N/A'}
          </Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>Site</Text>
          <Text style={styles.infoValue}>
            {currentShift?.site?.site_name || 'Unknown Site'}
          </Text>
          <Text style={styles.infoAddress}>
            {currentShift?.site?.address || 'No address'}
          </Text>
        </View>

        <View style={styles.combinedRow}>
          <View style={styles.leftColumn}>
            <View style={styles.halfCard}>
              <View style={styles.iconCircleGreen}>
                <Clock size={14} color="#22c55e" />
              </View>
              <View>
                <Text style={styles.cardTitle}>Sign In Time</Text>
                <Text style={styles.cardSubValue}>
                  {currentShift?.signin_time || 'N/A'}
                </Text>
              </View>
            </View>
            <View style={[styles.halfCard, { marginTop: 12 }]}>
              <View style={styles.iconCircleBlue}>
                <AlertCircle size={14} color="#3b82f6" />
              </View>
              <View>
                <Text style={styles.cardTitle}>SignOut Notes</Text>
                <TextInput
                  style={{ fontSize: 11, color: '#64748b', padding: 0 }}
                  placeholder="Tap to add..."
                  value={signoutNotes}
                  onChangeText={setSignoutNotes}
                />
              </View>
            </View>
          </View>

          <View style={styles.selfieCard}>
            <TouchableOpacity
              onPress={openCamera}
              activeOpacity={0.8}
              style={{ width: '100%', alignItems: 'center' }}
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
                    <CameraIcon size={22} color="#3b82f6" />
                  </View>
                  <Text style={styles.cardTitle}>SignOut Selfie</Text>
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
                isOnBreak && { backgroundColor: '#fca5a5' },
              ]}
            >
              <Clock size={20} color={isOnBreak ? '#dc2626' : '#ef4444'} />
            </View>
            <View style={styles.breakTextContainer}>
              <Text style={styles.breakTitle}>
                {isOnBreak ? 'End Break' : 'Take a Break'}
              </Text>
              <Text style={styles.breakStatus}>
                {isOnBreak
                  ? `On break since ${breakStartTime}`
                  : 'Tap to start break'}
              </Text>
            </View>
            {breakLoading ? (
              <ActivityIndicator color="#ef4444" />
            ) : (
              <ChevronLeft
                size={20}
                color="#64748b"
                style={{ transform: [{ rotate: '180deg' }] }}
              />
            )}
          </View>
        </TouchableOpacity>

        <View style={styles.actionCard}>
          <View style={styles.actionRow}>
            <View style={styles.actionIcon}>
              <AlertCircle size={20} color="#3b82f6" />
            </View>
            <Text style={styles.actionText}>Incident Report</Text>
            <TouchableOpacity
              style={styles.plusButton}
              onPress={() =>
                navigation.navigate('CreateIncidentReport', {
                  shiftId: currentShift?.id,
                  rosterId: rosterId,
                  guardId: loginId,
                  siteId: currentShift?.site?.id,
                  siteName: currentShift?.site?.site_name,
                })
              }
            >
              <Plus size={20} color="#64748b" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.actionCard}>
          <View style={styles.actionRow}>
            <View style={styles.actionIcon}>
              <Footprints size={20} color="#3b82f6" />
            </View>
            <Text style={styles.actionText}>Foot Patrolling</Text>
            <TouchableOpacity
              style={styles.plusButton}
              onPress={() =>
                navigation.navigate('CreateFootReport', {
                  jobRoster: currentShift,
                })
              }
            >
              <Plus size={20} color="#64748b" />
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
              {currentShift.job_roster_task.map(task => (
                <View key={task.id} style={styles.taskItem}>
                  <View style={styles.taskBullet}>
                    <View
                      style={[
                        styles.bulletDot,
                        startedTasks.has(task.id) && styles.bulletStarted,
                        task.status === 'completed' && styles.bulletCompleted,
                      ]}
                    />
                  </View>
                  <View style={styles.taskContent}>
                    <Text
                      style={[
                        styles.taskText,
                        task.status === 'completed' && styles.taskCompletedText,
                      ]}
                    >
                      "{task.task}"
                    </Text>
                    <Text style={styles.taskTime}>
                      starts at {task.task_start}
                    </Text>
                    <View style={styles.taskActions}>
                      {!startedTasks.has(task.id) &&
                        task.status !== 'completed' && (
                          <TouchableOpacity
                            style={styles.startButton}
                            onPress={() => handleStartTask(task.id)}
                            disabled={taskLoading === task.id}
                          >
                            {taskLoading === task.id ? (
                              <ActivityIndicator color="#fff" size="small" />
                            ) : (
                              <Text style={styles.startButtonText}>Start</Text>
                            )}
                          </TouchableOpacity>
                        )}
                      {startedTasks.has(task.id) &&
                        task.status !== 'completed' && (
                          <Text style={styles.completedLabel}>In Progress</Text>
                        )}
                      {task.status === 'completed' && (
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
            <ActivityIndicator color="#fff" size="small" />
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
                <ActivityIndicator color="#fff" size="small" />
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
                <Text style={styles.qrNote}>Show to next staff</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      <View style={styles.bottomButtonContainer}>
        <TouchableOpacity
          style={[
            styles.endButton,
            { backgroundColor: canSignOut ? '#ef4444' : '#9ca3af' },
          ]}
          disabled={!canSignOut}
          onPress={handleSignOut}
        >
          {isSigningOut ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.endButtonText}>END SHIFT</Text>
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
              value={breakNote}
              onChangeText={setBreakNote}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Informed To..."
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
                  <ActivityIndicator color="#14b8a6" />
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
  container: { flex: 1, backgroundColor: '#dfe6f9' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#0A7C6E',
    marginHorizontal: 16,
    borderRadius: 16,
    // marginBottom: 10,
  },

  headerTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },
  scrollContent: { padding: 16, paddingBottom: 100 },
  timerCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 15,
    alignItems: 'center',
    marginBottom: 15,

    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.08,
    shadowRadius: 12,

    elevation: 5,
  },
  timerText: {
    fontSize: 38,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: 1,
  },
  infoCard: {
    padding: 16,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
    borderRadius: 16,

    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,

    elevation: 4,
  },
  infoLabel: { fontSize: 12, color: '#64748b', marginBottom: 4 },
  infoValue: { fontSize: 16, fontWeight: '600', color: '#0f172a' },
  infoAddress: { fontSize: 14, color: '#475569', marginTop: 4 },
  combinedRow: { flexDirection: 'row', marginBottom: 15, gap: 12 },
  leftColumn: { flex: 1.2 },
  halfCard: {
    flexDirection: 'row',
    alignItems: 'center',

    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
    borderRadius: 16,

    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,

    elevation: 4,
  },
  selfieCard: {
    flex: 1,

    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,

    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,

    elevation: 4,
  },
  selfieImage: { width: '100%', height: 120, borderRadius: 12 },
  iconCircleBlue: {
    width: 32,
    height: 32,

    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    backgroundColor: '#fff',
    borderRadius: 16,

    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,

    elevation: 4,
  },
  iconCircleGreen: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#dcfce7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,

    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,

    elevation: 4,
  },
  cardTitle: { fontSize: 12, fontWeight: '600', color: '#0f172a' },
  cardSubValue: { fontSize: 11, color: '#64748b', marginTop: 2 },
  cardSubValues: {
    fontSize: 11,
    padding: 5,
    color: '#64748b',
    marginTop: 5,
    height: 25,
    width: 110,
    backgroundColor: '#f1f5f9',
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#e2e8f0',

    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,

    elevation: 4,
  },
  actionRow: { flexDirection: 'row', alignItems: 'center', padding: 12 },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  actionText: { flex: 1, fontSize: 15, fontWeight: '600', color: '#0f172a' },
  plusButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  taskSectionCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 15,

    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,

    elevation: 4,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  taskSectionTitle: { fontSize: 17, fontWeight: '700', color: '#0f172a' },
  taskCount: { fontSize: 13, color: '#64748b' },
  taskItem: {
    flexDirection: 'row',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 12,
  },
  taskBullet: { marginRight: 12, marginTop: 4 },
  bulletDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#d1d5db',
  },
  bulletStarted: { backgroundColor: '#3b82f6' },
  bulletCompleted: { backgroundColor: '#10b981' },
  taskContent: { flex: 1 },
  taskText: { fontSize: 14, fontWeight: '600', color: '#0f172a' },
  taskCompletedText: { textDecorationLine: 'line-through', color: '#9ca3af' },
  taskTime: { fontSize: 12, color: '#64748b', marginTop: 2 },
  taskActions: { marginTop: 8 },
  startButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  startButtonText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  completedLabel: { fontSize: 12, color: '#10b981', fontWeight: '600' },
  shakehandButton: {
    backgroundColor: '#10b981',
    paddingVertical: 16,
    borderRadius: 18,
    alignItems: 'center',
    marginBottom: 14,

    shadowColor: '#10b981',
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.3,
    shadowRadius: 10,

    elevation: 5,
  },
  shakehandButtonText: { color: '#fff', fontWeight: '700' },
  handoverSection: {
    backgroundColor: '#fefce8',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#eab308',
  },
  handoverButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 15,
    borderRadius: 18,
    alignItems: 'center',
  },
  handoverButtonText: { color: '#fff', fontWeight: '600' },
  qrContainer: {
    alignItems: 'center',
    marginTop: 20,
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
  },
  qrNote: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 12,
    fontWeight: '600',
  },
  bottomButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  endButton: { paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  endButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  breakFullCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  onBreakFullCard: { backgroundColor: '#fee2e2', borderColor: '#fecaca' },
  breakContent: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  iconCircleRedLarge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fee2e2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  breakTextContainer: { flex: 1 },
  breakTitle: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  breakStatus: { fontSize: 12, color: '#64748b', marginTop: 2 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBox: {
    width: '85%',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalInput: {
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  modalButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  modalButton: { flex: 1, padding: 12, alignItems: 'center' },
  cancelText: { color: '#64748b', fontWeight: '600' },
  okText: { color: '#3b82f6', fontWeight: '700' },
  scannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeScanner: { position: 'absolute', top: 40, left: 20, padding: 8 },
  scannerFrame: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: '#fff',
    borderRadius: 20,
  },
  scannerText: { color: '#fff', marginTop: 20, fontWeight: '600' },
});
