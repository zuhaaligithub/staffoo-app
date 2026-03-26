



import React, { useState, useEffect, useRef } from 'react';
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
    ActivityIndicator,
    Switch,
    TextInput,
    Modal,

    PermissionsAndroid,
    Vibration,
} from 'react-native';


import {
    ChevronLeft,
    X,
    Camera,
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

import { Platform } from 'react-native';


const getDistanceMeters = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    if (isNaN(lat1) || isNaN(lon1) || isNaN(lat2) || isNaN(lon2)) return Infinity;
    const R = 6371000; // Earth radius in meters
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

interface Site {
    id: number;
    site_name: string;
    address?: string;
    lat?: number;          // ← add
    lng?: number;          // ← add (or longitude)
}


interface Shift {
    id: number;
    guard_id: number;
    job_roster_activities?: {
        job_roster_id: number;
    };
    site?: {
        id: number;
        site_name: string;
        address?: string;
    };
    signin_time?: string | null;
    job_roster_task?: Task[];
}

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
    // ... other fields you might use later
}

export default function OngoingShift({ navigation, route }: { navigation: any; route: any }) {
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [selfie, setSelfie] = useState<string | null>(null);
    const [currentShift, setCurrentShift] = useState<Shift | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [loginId, setLoginId] = useState<number | null>(null);
    const [breakModalVisible, setBreakModalVisible] = useState(false);
    const [isSigningOut, setIsSigningOut] = useState(false);
    const [signoutNotes, setSignoutNotes] = useState('');
    const [breakNote, setBreakNote] = useState('');
    const [informedTo, setInformedTo] = useState('');
    const [isOnBreak, setIsOnBreak] = useState(false);
    const [breakLoading, setBreakLoading] = useState(false);
    const [breakStartTime, setBreakStartTime] = useState<string | null>(null);
    const [breakEndTime, setBreakEndTime] = useState<string | null>(null);
    const [startedTasks, setStartedTasks] = useState<Set<number>>(new Set());
    const rosterId = currentShift?.job_roster_activities?.job_roster_id;
    const BASE_URL = 'https://apis.staffoo.com.au/api';
    const [taskLoading, setTaskLoading] = useState<number | null>(null);

    const POLL_INTERVAL_MS = 30000; // 30 seconds
    const VIBRATION_PATTERN = [600, 400, 600];
    const [jobCoordinates, setJobCoordinates] = useState<{ lat: number; lng: number } | null>(null);
    const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [isWithinRadius, setIsWithinRadius] = useState(false);


    // ... (imports and other parts remain the same)

    const RADIUS_METERS = 300;
    const HYSTERESIS_METERS = 0;     // prevents flapping near boundary
    const ALARM_REPEAT_INTERVAL = 15000; // 15 seconds

    // Add these states for repeating alarm
    const [alarmInterval, setAlarmInterval] = useState<NodeJS.Timeout | null>(null);
    const hasAlarmedRef = useRef(false);
    const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // ... (other states remain the same)

    useEffect(() => {
        // Parse coordinates from shift (your existing code - good)
        const shiftFromParams = route.params?.currentShift;
        if (shiftFromParams) {
            setCurrentShift(shiftFromParams);

            if (shiftFromParams.site?.coordinates) {
                try {
                    const [latStr, lngStr] = shiftFromParams.site.coordinates.split(',');
                    const lat = parseFloat(latStr.trim());
                    const lng = parseFloat(lngStr.trim());

                    if (!isNaN(lat) && !isNaN(lng)) {
                        setJobCoordinates({ lat, lng });
                        console.log('[PROXIMITY] Real site coordinates loaded:', { lat, lng });
                    } else {
                        throw new Error('Invalid coordinates');
                    }
                } catch (err) {
                    console.error('[PROXIMITY] Coordinate parse failed:', err);
                    Alert.alert('Warning', 'Invalid site coordinates – proximity alerts disabled.');
                }
            } else {
                console.warn('[PROXIMITY] No coordinates in site data');
                Alert.alert('Missing Location', 'Site coordinates not available. Alerts disabled.');
            }

            // sign-in time parsing...
            // ...
            setIsLoading(false);
        } else {
            Alert.alert('Error', 'No shift data received.');
        }
    }, [route.params]);

    const stopRepeatingAlarm = () => {
  if (alarmInterval) {
    clearInterval(alarmInterval);
    setAlarmInterval(null);
  }
  hasAlarmedRef.current = false;

  // Force stop vibration immediately
  Vibration.cancel();

  // Force stop sound
  try {
    SoundPlayer.stop();
    // SoundPlayer.unmount();  // only if you used addEventListener before – otherwise optional
    console.log('[ALARM] Sound & Vibration forcefully stopped');
  } catch (err) {
    console.log('[ALARM] Stop failed:', err);
  }
};

    useEffect(() => {
        console.log('[PROXIMITY DEBUG] Shift loaded:', !!currentShift);
        console.log('[PROXIMITY DEBUG] Job coords:', jobCoordinates);

        if (!currentShift || !jobCoordinates) {
            console.log('[PROXIMITY DEBUG] Missing shift or coords → skipping proximity check');
            return;
        }

        const requestPermission = async () => {
            if (Platform.OS === 'android') {
                const granted = await PermissionsAndroid.request(
                    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
                );
                if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
                    Alert.alert('Permission Denied', 'Location access needed for alerts.');
                    return false;
                }
            }
            return true;
        };

       

        const startRepeatingAlarm = () => {
            if (alarmInterval) return; // already running

            triggerAlarm(); // immediate first alarm

            const interval = setInterval(() => {
                triggerAlarm();
                console.log('[ALARM] Repeating – still outside');
            }, ALARM_REPEAT_INTERVAL);

            setAlarmInterval(interval);
        };

        const stopRepeatingAlarm = () => {
            if (alarmInterval) {
                clearInterval(alarmInterval);
                setAlarmInterval(null);
            }
            hasAlarmedRef.current = false;

            // Force stop vibration immediately
            Vibration.cancel();

            // Force stop sound
            try {
                SoundPlayer.stop();
                // SoundPlayer.unmount();  // only if you used addEventListener before – otherwise optional
                console.log('[ALARM] Sound & Vibration forcefully stopped');
            } catch (err) {
                console.log('[ALARM] Stop failed:', err);
            }
        };

        const checkProximity = () => {
            Geolocation.getCurrentPosition(
                (pos) => {
                    const { latitude, longitude } = pos.coords;
                    setCurrentLocation({ lat: latitude, lng: longitude });

                    const distance = getDistanceMeters(
                        latitude,
                        longitude,
                        jobCoordinates.lat,
                        jobCoordinates.lng
                    );

                    console.log(`[Proximity] Distance: ${distance.toFixed(0)} m (radius: ${RADIUS_METERS}m)`);

                    if (distance > RADIUS_METERS + HYSTERESIS_METERS) {
                        // OUTSIDE → start alarm if not already
                        if (!hasAlarmedRef.current) {
                            startRepeatingAlarm();
                            hasAlarmedRef.current = true;
                        }
                    } else if (distance <= RADIUS_METERS - HYSTERESIS_METERS) {
                        // INSIDE → stop alarm
                        stopRepeatingAlarm();
                    }
                    // between (RADIUS - hysteresis) and (RADIUS + hysteresis) → keep previous state (no change)

                    setIsWithinRadius(distance <= RADIUS_METERS);
                },
                (err) => console.warn('[Proximity] Location error:', err),
                {
                    enableHighAccuracy: true,
                    timeout: 15000,
                    maximumAge: 10000,
                    distanceFilter: 30,
                }
            );
        };

        const startChecking = async () => {
            if (!(await requestPermission())) return;

            checkProximity(); // immediate check
            checkIntervalRef.current = setInterval(checkProximity, POLL_INTERVAL_MS);
        };

        startChecking();

        // Cleanup
        return () => {
            if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
            stopRepeatingAlarm();
        };
    }, [currentShift, jobCoordinates]);

    // ... rest of your component (handleStartTask, handleSignOut, render, etc.) remains unchanged
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

    // ─── Timer ───
    useEffect(() => {
        const interval = setInterval(() => {
            setElapsedSeconds((prev) => prev + 1);
        }, 1000);
        return () => clearInterval(interval);
    }, []);




    const formatTime = (seconds: number) => {
        if (seconds < 0) seconds = 0;
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${h.toString().padStart(2, '0')}:${m
            .toString()
            .padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const openCamera = async () => {
        const result = await launchCamera({
            mediaType: 'photo',
            cameraType: 'front',
            quality: 0.7,
        });
        if (result.assets && result.assets.length > 0) {
            setSelfie(result.assets[0].uri || null);
        }
    };
    const handleToggleBreak = (value: boolean) => {
        if (value) {
            setBreakModalVisible(true);
        } else {
            handleEndBreak();
        }
    };

useEffect(() => {
  return () => {
    console.log('[OngoingShift] Component unmounting → cleaning up alarm');
    stopRepeatingAlarm();
    if (checkIntervalRef.current) {
      clearInterval(checkIntervalRef.current);
      checkIntervalRef.current = null;
    }
    Vibration.cancel(); // extra safety
  };
}, []); // empty deps → runs only on unmount


const triggerAlarm = () => {
  if (!jobCoordinates) return;
  console.log('[ALARM] Triggered – user is OUTSIDE radius');

  // Vibration – limit duration on Android
  if (Platform.OS === 'android') {
    Vibration.vibrate(VIBRATION_PATTERN, true); // loop = true
    // But we already limit overall in stop
  } else {
    Vibration.vibrate();
  }

  // Sound – play once per trigger (your repeating interval calls this)
  try {
    const alarmAsset = require('../assets/tune/alarm.mp3');
    SoundPlayer.playAsset(alarmAsset);
  } catch (error) {
    console.log('[ALARM] Sound failed:', error);
  }
};

    useEffect(() => {
        const requestLocationPermission = async () => {
            if (Platform.OS === 'android') {
                const granted = await PermissionsAndroid.request(
                    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
                    {
                        title: 'Location Permission',
                        message: 'This app needs access to your location to start tasks.',
                        buttonNeutral: 'Ask Me Later',
                        buttonNegative: 'Cancel',
                        buttonPositive: 'OK',
                    }
                );
                return granted === PermissionsAndroid.RESULTS.GRANTED;
            }
            return true;
        };

        requestLocationPermission();
    }, []);



    const handleStartTask = async (taskId: number) => {
        if (taskLoading !== null) return; // prevent double tap

        Alert.alert(
            'Start Task',
            'Do you want to start this task now?',
            [
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
                            const location = await new Promise<{ lat: number; lng: number }>((resolve, reject) => {
                                Geolocation.getCurrentPosition(
                                    (pos) => {
                                        resolve({
                                            lat: pos.coords.latitude,
                                            lng: pos.coords.longitude,
                                        });
                                    },
                                    (err) => reject(err),
                                    { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
                                );
                            });

                            const now = new Date();
                            const pad = (n: number) => n.toString().padStart(2, '0');
                            const startTime = `${pad(now.getDate())}-${pad(now.getMonth() + 1)}-${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
                            const payload = {
                                roster_id: rosterId,
                                guard_id: guardId,
                                task_id: taskId,
                                start_time: startTime,
                                location: `${location.lat},${location.lng}`,
                            };

                            console.log('[START TASK REQUEST]', {
                                url: `${BASE_URL}/start_task/${taskId}`,
                                payload,
                            });

                            const response = await fetch(`${BASE_URL}/start_task/${taskId}`, {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    Authorization: `Bearer ${token}`,
                                    Accept: 'application/json',
                                },
                                body: JSON.stringify(payload),
                            });

                            const text = await response.text();
                            let result;
                            try {
                                result = JSON.parse(text);
                            } catch {
                                throw new Error('Invalid server response');
                            }

                            console.log('[START TASK RESPONSE]', result);

                            if (!response.ok || !result?.success) {
                                throw new Error(result?.message || `HTTP ${response.status}`);
                            }
                            setStartedTasks((prev) => new Set([...prev, taskId]));
                            Alert.alert(
                                'Success',
                                result.message || 'Task started successfully!',
                                [
                                    {
                                        text: 'OK',
                                        onPress: () => {
                                            navigation.goBack();
                                        },
                                    },
                                ]
                            );

                        } catch (error: any) {
                            console.error('START TASK ERROR:', error);
                            Alert.alert(
                                'Error',
                                error.message || 'Failed to start task. Please try again.'
                            );
                        } finally {
                            setTaskLoading(null);
                        }
                    },
                },
            ]
        );
    };


    const handleSignOut = async () => {
        if (!selfie) {
            Alert.alert('Missing Selfie', 'Please take a sign-out selfie first.');
            return;
        }

        if (!currentShift?.id) {
            Alert.alert('Error', 'No active shift ID found.');
            return;
        }

        if (!loginId) {
            Alert.alert('Error', 'User ID not found in storage.');
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

                            // 1. Get current location (fallback if denied)
                            let locationStr = 'unknown';
                            try {
                                const position = await new Promise<Geolocation.GeoPosition>((resolve, reject) => {
                                    Geolocation.getCurrentPosition(resolve, reject, {
                                        enableHighAccuracy: true,
                                        timeout: 15000,
                                        maximumAge: 10000,
                                    });
                                });
                                locationStr = `${position.coords.latitude},${position.coords.longitude}`;
                            } catch (locErr) {
                                console.warn('Location not available:', locErr);
                            }

                            // 2. Current sign-out time (format: DD-MM-YYYY HH:MM)
                            const now = new Date();
                            const pad = (n: number) => n.toString().padStart(2, '0');
                            const signoutTime = `${pad(now.getDate())}-${pad(now.getMonth() + 1)}-${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}`;

                            // 3. Prepare FormData payload (multipart/form-data)
                            const formData = new FormData();

                            // All fields from your list - dynamically filled
                            formData.append('authorization', `Bearer ${token}`); // optional - usually in header, but added here if backend expects it
                            formData.append('time', signoutTime);                           // 2. sign-out time
                            formData.append('location', locationStr);                       // 3. current coordinates
                            formData.append('jobId', currentShift.id.toString());           // 4. shift/job ID
                            formData.append('selfie', {
                                uri: selfie,
                                type: 'image/jpeg',
                                name: `signout_selfie_${Date.now()}.jpg`,
                            } as any);                                                      // 5. selfie image (base64 URI works too, but file is better)
                            formData.append('notes', signoutNotes.trim() || 'No notes');    // 6. notes from input
                            formData.append('signin_time', currentShift.signin_time || ''); // 7. original sign-in time
                            formData.append('tasks_photos', '');                            // 8. empty for now (extend later with task photos array)

                            // ────────────────────────────────────────────────
                            // Log the EXACT payload being sent (very useful for debugging)
                            // ────────────────────────────────────────────────
                            console.log('╔═══════════════════════════════════════════════╗');
                            console.log('║          SIGN-OUT PAYLOAD (FormData)          ║');
                            console.log('╠═══════════════════════════════════════════════╣');
                            console.log('║ Endpoint: ', `${BASE_URL}/signout/${currentShift.id}`);
                            console.log('║ Authorization (header): ', `Bearer ${token.substring(0, 10)}...`);
                            console.log('║ time: ', signoutTime);
                            console.log('║ location: ', locationStr);
                            console.log('║ jobId: ', currentShift.id);
                            console.log('║ selfie: ', selfie.substring(0, 50) + '... (base64 image)');
                            console.log('║ notes: ', signoutNotes.trim() || '(empty)');
                            console.log('║ signin_time: ', currentShift.signin_time || '(not set)');
                            console.log('║ tasks_photos: ', '(empty for now)');
                            console.log('╚═══════════════════════════════════════════════╝');

                            // ────────────────────────────────────────────────
                            // Send the request
                            // ────────────────────────────────────────────────
                            const response = await axios.post(
                                `${BASE_URL}/signout/${currentShift.id}`,
                                formData,
                                {
                                    headers: {
                                        Authorization: `Bearer ${token}`,
                                        'Content-Type': 'multipart/form-data',
                                    },
                                    timeout: 60000, // 60 seconds for image upload
                                }
                            );

                            console.log('SIGN-OUT RESPONSE SUCCESS:', response.data);

                           Alert.alert('Success', response.data?.message || 'Shift ended successfully!', [
  {
    text: 'OK',
    onPress: () => {
      stopRepeatingAlarm();           // ← Add this
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
        checkIntervalRef.current = null;
      }
      navigation.goBack();            // or wherever you navigate after sign-out
      // Optionally: navigation.navigate('SomeHomeScreen');
    },
  },
]);

                        } catch (error: any) {
                            console.error('SIGN-OUT FAILED:', error);

                            let errorMsg = 'Failed to sign out. Please try again.';

                            if (error.response) {
                                console.log('Server response error:', error.response.data);
                                errorMsg = error.response.data?.message || `Server error (${error.response.status})`;
                            } else if (error.request) {
                                errorMsg = 'No response from server. Check internet connection.';
                            } else {
                                errorMsg = error.message || 'Unknown error';
                            }

                            Alert.alert('Sign Out Failed', errorMsg);
                        } finally {
                            setIsSigningOut(false);
                        }
                    },
                },
            ]
        );
    };

    const handleCompleteTask = (taskId: number) => {
        Alert.alert(
            'Complete Task',
            'Mark this task as completed?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Complete',
                    onPress: () => {

                        Alert.alert('Completed', 'Task marked as complete.');
                    }
                }
            ]
        );
    };
    const submitStartBreak = async () => {
        if (!loginId) {
            Alert.alert('Error', 'Login ID not found');
            return;
        }
        if (!rosterId || !breakNote.trim() || !informedTo.trim()) {
            Alert.alert('Missing fields', 'Please fill both Note and Informed To');
            return;
        }

        try {
            setBreakLoading(true);
            const token = await AsyncStorage.getItem('@auth_token');
            if (!token) {
                Alert.alert('Error', 'Authentication token not found');
                return;
            }
            const payload = {
                roster_id: rosterId,
                notes: breakNote.trim(),
                inform: informedTo.trim(),
            };
            const response = await fetch(
                `https://apis.staffoo.com.au/api/break/${loginId}`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify(payload),
                }
            );

            const responseText = await response.text();
            console.log("START BREAK RAW RESPONSE:", responseText);

            let result;

            try {
                result = JSON.parse(responseText);
                console.log("START BREAK JSON:", result);
            } catch (error) {
                console.error("Response is not JSON:", responseText);
                Alert.alert("Server Error", "Invalid server response.");
                return;
            }

            if (!response.ok) {
                throw new Error(result?.message || `HTTP ${response.status}`);
            }
            const now = new Date();
            const formattedTime = now.toTimeString().slice(0, 5);
            setBreakStartTime(formattedTime);
            setBreakEndTime(null);
            setIsOnBreak(true);
            setBreakModalVisible(false);
            const breakData = {
                roster_id: rosterId,
                breakStartTime: formattedTime,
                breakNote: breakNote.trim(),
                informedTo: informedTo.trim(),
                isOnBreak: true,
            };
            await AsyncStorage.setItem('@current_break', JSON.stringify(breakData));

            Alert.alert('Success', 'Break started');
        } catch (error) {
            console.error('START BREAK ERROR:', error);
            Alert.alert('Error', 'Could not start break.');
        } finally {
            setBreakLoading(false);
        }
    };

    const handleEndBreak = async () => {
        if (!loginId) {
            Alert.alert('Error', 'Login ID not found');
            return;
        }
        if (!breakNote.trim()) {
            Alert.alert('Error', 'Please fill break notes.');
            return;
        }

        const payload = {
            roster_id: rosterId,
            notes: breakNote.trim(),
        };

        try {
            setBreakLoading(true);
            const token = await AsyncStorage.getItem('@auth_token');
            if (!token) {
                Alert.alert('Error', 'Authentication token not found');
                return;
            }

            const response = await fetch(
                `https://apis.staffoo.com.au/api/end_break/${loginId}`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify(payload),
                }
            );

            const responseText = await response.text();
            let result;
            try {
                result = JSON.parse(responseText);
            } catch {
                console.error('Response not JSON:', responseText);
                Alert.alert('Error', 'Server returned invalid response.');
                return;
            }

            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const now = new Date();
            const formattedTime = now.toTimeString().slice(0, 5);

            setBreakEndTime(formattedTime);
            setIsOnBreak(false);

            // Clear break info from AsyncStorage
            await AsyncStorage.removeItem('@current_break');

            Alert.alert('Success', 'Break ended');
        } catch (error) {
            console.error('END BREAK ERROR:', error);
            Alert.alert('Error', 'Could not end break.');
        } finally {
            setBreakLoading(false);
        }
    };

    if (isLoading) {
        return (
            <SafeAreaView style={styles.container}>
                <ActivityIndicator size="large" color="#3b82f6" style={{ marginTop: 100 }} />
            </SafeAreaView>
        );
    }

    if (!currentShift) {
        return (
            <SafeAreaView style={styles.container}>
                <Text style={{ padding: 40, textAlign: 'center', color: 'red' }}>
                    No active shift found. Please go back.
                </Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <ChevronLeft size={28} color="#0f172a" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Ongoing Shift</Text>
                <View style={{ width: 28 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Timer */}
                <View style={styles.timerCard}>
                    <Text style={styles.timerText}>{formatTime(elapsedSeconds)}</Text>
                    <Text style={styles.durationText}>Elapsed Time</Text>
                </View>

                {/* Site Info */}
                <View style={styles.infoCard}>
                    <Text style={styles.infoLabel}>Site</Text>
                    <Text style={styles.infoValue}>
                        {currentShift.site?.site_name || 'Unknown Site'}
                    </Text>
                    <Text style={styles.infoAddress}>
                        {currentShift.site?.address || 'No address available'}
                    </Text>
                </View>
                <View style={styles.combinedRow}>
                    <View style={styles.leftColumn}>
                        <View style={styles.halfCard}>
                            <View style={styles.iconCircleGreen}>
                                <Clock size={14} color="#22c55e" />
                            </View>
                            <View>
                                <Text style={styles.cardTitle}>Shift Status</Text>
                                <Text style={styles.cardSubValue}>Ongoing</Text>
                            </View>
                        </View>

                        <View style={[styles.halfCard, { marginTop: 12 }]}>
                            <View style={styles.iconCircleBlue}>
                                <AlertCircle size={14} color="#3b82f6" />
                            </View>
                            <View>
                                <Text style={styles.cardTitle}>SignOut Notes</Text>
                                <Text style={styles.cardSubValue}>Not added yet</Text>
                            </View>
                        </View>
                    </View>

                    {/* Right - Selfie */}
                    <View style={styles.selfieCard}>
                        <TouchableOpacity onPress={openCamera} activeOpacity={0.8}>
                            {selfie ? (
                                <Image source={{ uri: selfie }} style={styles.selfieImage} />
                            ) : (
                                <>
                                    <View style={styles.iconCircleBlue}>
                                        <Camera size={22} color="#3b82f6" />
                                    </View>
                                    <Text style={styles.cardTitle}>SignOut Selfie</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Incident Report */}
                <View style={styles.actionCard}>
                    <View style={styles.actionRow}>
                        <View style={styles.actionIcon}>
                            <AlertCircle size={20} color="#3b82f6" />
                        </View>
                        <Text style={styles.actionText}>Incident Report</Text>
                        <TouchableOpacity
                            style={styles.plusButton}
                            onPress={() => {

                                navigation.navigate('CreateIncidentReport', {
                                    shiftId: currentShift.id,
                                    guardId: currentShift.guard_id,
                                    rosterId: currentShift.job_roster_activities?.job_roster_id,
                                    siteId: currentShift.site?.id,
                                    siteName: currentShift.site?.site_name,
                                });
                            }}
                        >
                            <Plus size={20} color="#64748b" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Foot Patrolling */}
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

                {currentShift.job_roster_task && currentShift.job_roster_task.length > 0 && (
                    <View style={styles.taskSectionCard}>
                        <View style={styles.taskHeader}>
                            <Text style={styles.taskSectionTitle}>Tasks</Text>
                            <Text style={styles.taskCount}>
                                {currentShift.job_roster_task.length} task
                                {currentShift.job_roster_task.length !== 1 ? 's' : ''}
                            </Text>
                        </View>

                        {currentShift.job_roster_task.map((task) => {
                            const isStarted = startedTasks.has(task.id);
                            const isCompleted = task.status === 'completed'; // adjust based on your real status field

                            return (
                                <View key={task.id} style={styles.taskItem}>
                                    <View style={styles.taskBullet}>
                                        <View style={[
                                            styles.bulletDot,
                                            isStarted && styles.bulletStarted,
                                            isCompleted && styles.bulletCompleted,
                                        ]} />
                                    </View>

                                    <View style={styles.taskContent}>
                                        <Text style={[
                                            styles.taskText,
                                            isCompleted && styles.taskCompletedText,
                                        ]}>
                                            "{task.task}"
                                        </Text>

                                        <Text style={styles.taskTime}>
                                            starts at {new Date(task.task_start).toLocaleTimeString([], {
                                                hour: '2-digit',
                                                minute: '2-digit',
                                                hour12: true
                                            })}
                                        </Text>

                                        <View style={styles.taskActions}>
                                            {!isStarted && !isCompleted && (
                                                <TouchableOpacity
                                                    style={styles.startButton}
                                                    onPress={() => handleStartTask(task.id)}
                                                >
                                                    <Text style={styles.startButtonText}>Start</Text>
                                                </TouchableOpacity>
                                            )}

                                            {isStarted && !isCompleted && (
                                                <TouchableOpacity
                                                    style={styles.completeButton}
                                                    onPress={() => handleCompleteTask(task.id)}
                                                >
                                                    <Text style={styles.completeButtonText}>Mark as complete</Text>
                                                </TouchableOpacity>
                                            )}

                                            {isCompleted && (
                                                <Text style={styles.completedLabel}>Completed</Text>
                                            )}
                                        </View>
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                )}

                {/* <View
                    style={[
                        styles.breakFullCard,
                        isOnBreak && styles.onBreakFullCard,
                        breakLoading && styles.disabledCard,
                    ]}
                >
                    <View style={styles.breakContent}>
                        <View style={styles.iconCircleRedLarge}>
                            <X size={20} color="#ef4444" />
                        </View>
                        <View style={styles.breakTextContainer}>
                            <Text style={styles.breakTitle}>Break Status</Text>
                            <Text style={[styles.breakStatus, isOnBreak && { color: '#ef4444' }]}>
                                {isOnBreak ? 'On Break' : 'Not on Break'}
                            </Text>

                            {isOnBreak || breakStartTime ? (
                                <View style={{ marginTop: 6 }}>
                                    <Text style={styles.cardSubValue}>
                                        Break Start: {breakStartTime || '-'}
                                    </Text>
                                    <Text style={styles.cardSubValue}>
                                        Break End: {breakEndTime || '-'}
                                    </Text>
                                    <Text style={styles.cardSubValue}>
                                        Informed To: {informedTo || '-'}
                                    </Text>
                                    <Text style={styles.cardSubValue}>
                                        Notes: {breakNote || '-'}
                                    </Text>
                                </View>
                            ) : null}
                        </View>
                        <Switch
                            value={isOnBreak}
                            onValueChange={(value) => handleToggleBreak(value)}
                            disabled={breakLoading}
                            trackColor={{ false: '#e2e8f0', true: '#fecaca' }}
                            thumbColor={isOnBreak ? '#ef4444' : '#f1f5f9'}
                        />
                    </View>
                </View> */}




            </ScrollView>

            <TouchableOpacity
                style={[
                    styles.endButton,
                    {
                        backgroundColor: selfie && !isSigningOut ? '#ef4444' : '#9ca3af',
                    },
                ]}
                disabled={!selfie || isSigningOut}
                onPress={handleSignOut}
            >
                {isSigningOut ? (
                    <ActivityIndicator color="#fff" size="small" />
                ) : (
                    <Text style={styles.endButtonText}>END SHIFT</Text>
                )}
            </TouchableOpacity>

            {/* Break Modal */}
            {/* <Modal transparent visible={breakModalVisible} animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalBox}>
                        <Text style={styles.modalTitle}>Start Break</Text>
                        <TextInput
                            placeholder="Note"
                            placeholderTextColor="#94a3b8"
                            style={styles.modalInput}
                            value={breakNote}
                            onChangeText={setBreakNote}
                            multiline
                        />
                        <TextInput
                            placeholder="Informed To"
                            placeholderTextColor="#94a3b8"
                            style={styles.modalInput}
                            value={informedTo}
                            onChangeText={setInformedTo}
                        />
                        <View style={styles.modalButtonRow}>
                            <TouchableOpacity
                                style={styles.modalButton}
                                onPress={() => {
                                    setBreakModalVisible(false);
                                    setBreakNote('');
                                    setInformedTo('');
                                    setIsOnBreak(false);
                                }}
                            >
                                <Text style={styles.cancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <View style={styles.divider} />
                            <TouchableOpacity
                                style={styles.modalButton}
                                onPress={submitStartBreak}
                                disabled={breakLoading}
                            >
                                <Text style={styles.okText}>
                                    {breakLoading ? 'Starting...' : 'Start Break'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal> */}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc', paddingTop: 20 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 10,
    },
    headerTitle: { fontSize: 20, fontWeight: '700', color: '#0f172a' },
    scrollContent: { padding: 16, paddingBottom: 150 },

    timerCard: {
        backgroundColor: '#ffffff',
        borderRadius: 20,
        paddingVertical: 15,
        paddingHorizontal: 20,
        alignItems: 'center',
        marginBottom: 15,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    timerText: { fontSize: 28, fontWeight: '700', color: '#0f172a' },
    durationText: { fontSize: 14, color: '#16a34a', marginTop: 3 },

    infoCard: {
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: 12,
        marginBottom: 7,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    infoLabel: { fontSize: 12, color: '#64748b', marginBottom: 4 },
    infoValue: { fontSize: 14, fontWeight: '600', color: '#0f172a' },
    infoAddress: { fontSize: 12, color: '#475569', marginTop: 4 },

    combinedRow: { flexDirection: 'row', marginBottom: 15, gap: 12 },
    leftColumn: { flex: 1 },
    halfCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ffffff',
        borderRadius: 18,
        padding: 10,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },

    selfieCard: {
        flex: 1,
        backgroundColor: '#ffffff',
        borderRadius: 18,
        padding: 12,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        justifyContent: 'center',
        alignItems: 'center',
    },
    selfieImage: { width: 140, height: 140, borderRadius: 14 },

    iconCircleRed: {
        width: 30,
        height: 30,
        borderRadius: 28,
        backgroundColor: '#fee2e2',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    iconCircleBlue: {
        width: 30,
        height: 30,
        borderRadius: 28,
        backgroundColor: '#eff6ff',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    breakFullCard: {
        backgroundColor: '#ffffff',
        borderRadius: 18,
        padding: 12,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        marginBottom: 18,
    },
    onBreakFullCard: {
        backgroundColor: '#fee2e2',
        borderColor: '#fecaca',
    },
    breakContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconCircleRedLarge: {
        width: 30,
        height: 30,
        borderRadius: 28,
        backgroundColor: '#fee2e2',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    breakTextContainer: {
        flex: 1,
    },
    breakTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#0f172a',
    },
    breakStatus: {
        fontSize: 11,
        fontWeight: '600',
        color: '#1e293b',
        marginTop: 4,
    },
    iconCircleGreen: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#dcfce7',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },

    actionCard: {
        backgroundColor: '#ffffff',
        borderRadius: 14,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    actionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
    },
    actionIcon: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: '#eff6ff',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    actionText: { flex: 1, fontSize: 16, fontWeight: '600', color: '#0f172a' },
    plusButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#f1f5f9',
        justifyContent: 'center',
        alignItems: 'center',
    },

    endButton: {
        position: 'absolute',
        bottom: 24,
        left: 16,
        right: 16,
        paddingVertical: 16,
        borderRadius: 14,
        alignItems: 'center',
    },
    endButtonText: { color: '#ffffff', fontSize: 17, fontWeight: '700' },

    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalBox: {
        width: '85%',
        backgroundColor: '#ffffff',
        borderRadius: 20,
        paddingTop: 20,
        overflow: 'hidden',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
        textAlign: 'center',
        marginBottom: 16,
        color: '#0f172a',
    },
    modalInput: {
        backgroundColor: '#f1f5f9',
        marginHorizontal: 16,
        marginBottom: 14,
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 14,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    modalButtonRow: {
        flexDirection: 'row',
        borderTopWidth: 1,
        borderColor: '#e2e8f0',
        marginTop: 10,
    },
    modalButton: {
        flex: 1,
        paddingVertical: 16,
        alignItems: 'center',
    },
    divider: {
        width: 1,
        backgroundColor: '#e2e8f0',
    },
    cancelText: {
        color: '#14b8a6',
        fontWeight: '600',
        fontSize: 16,
    },
    okText: {
        color: '#14b8a6',
        fontWeight: '700',
        fontSize: 16,
    },

    disabledCard: {
        opacity: 0.6,
    },
    cardTitle: { fontSize: 12, fontWeight: '600', color: '#0f172a' },
    cardValue: { fontSize: 14, fontWeight: '600', color: '#1e293b' },
    cardSubValue: { fontSize: 11, color: '#64748b', marginTop: 4 },
    taskSectionCard: {
        backgroundColor: '#ffffff',
        borderRadius: 18,
        padding: 16,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        marginBottom: 24,
    },
    taskHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    taskSectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#0f172a',
    },
    taskCount: {
        fontSize: 14,
        color: '#64748b',
        fontWeight: '500',
    },
    taskItem: {
        flexDirection: 'row',
        marginBottom: 16,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    taskBullet: {
        width: 24,
        alignItems: 'center',
        marginRight: 12,
    },
    bulletDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#d1d5db',
        marginTop: 6,
    },
    bulletStarted: {
        backgroundColor: '#3b82f6',
    },
    bulletCompleted: {
        backgroundColor: '#10b981',
    },
    taskContent: {
        flex: 1,
    },
    taskText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#0f172a',
        marginBottom: 4,
    },
    taskCompletedText: {
        textDecorationLine: 'line-through',
        color: '#9ca3af',
    },
    taskTime: {
        fontSize: 13,
        color: '#64748b',
        marginBottom: 8,
    },
    taskActions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    startButton: {
        backgroundColor: '#3b82f6',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 12,
    },
    startButtonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 14,
    },
    completeButton: {
        backgroundColor: '#10b981',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 12,
    },
    completeButtonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 14,
    },
    completedLabel: {
        fontSize: 14,
        color: '#10b981',
        fontWeight: '600',
    },
});
