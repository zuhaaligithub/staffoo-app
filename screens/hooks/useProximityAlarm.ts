// import { useEffect, useRef } from 'react';
// import { Alert, Platform } from 'react-native';
// import Geolocation from 'react-native-geolocation-service';
// // import Sound from 'react-native-sound';
// import { Vibration } from 'react-native';

// // Haversine distance in meters
// const getDistanceMeters = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
//   if (isNaN(lat1) || isNaN(lon1) || isNaN(lat2) || isNaN(lon2)) return Infinity;
//   const R = 6371000; // Earth radius (meters)
//   const dLat = ((lat2 - lat1) * Math.PI) / 180;
//   const dLon = ((lon2 - lon1) * Math.PI) / 180;
//   const a =
//     Math.sin(dLat / 2) ** 2 +
//     Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
//     Math.sin(dLon / 2) ** 2;
//   const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
//   return R * c;
// };

// const RADIUS_METERS = 300;
// const POLL_INTERVAL_MS = 30000; // 30s – balance battery vs responsiveness
// const VIBRATION_PATTERN = [600, 400, 600]; // vibrate-pause-vibrate

// const useProximityAlarm = ({
//   jobLat,       // job location latitude (number | null)
//   jobLng,       // job location longitude (number | null)
//   isShiftActive, // true when shift is ongoing (start → end)
// }: {
//   jobLat: number | null;
//   jobLng: number | null;
//   isShiftActive: boolean;
// }) => {
//   const soundRef = useRef<Sound | null>(null);
//   const intervalRef = useRef<NodeJS.Timeout | null>(null);
//   const hasTriggeredRef = useRef(false); // one trigger per proximity session

//   // Load sound once
//   useEffect(() => {
//     Sound.setCategory('Playback'); // Important for iOS

//     soundRef.current = new Sound('alarm.mp3', Sound.MAIN_BUNDLE, (error) => {
//       if (error) {
//         console.error('Alarm load failed:', error);
//         return;
//       }
//       console.log('Proximity alarm sound loaded');
//     });

//     return () => {
//       soundRef.current?.release();
//     };
//   }, []);

//   useEffect(() => {
//     if (!isShiftActive || jobLat === null || jobLng === null) {
//       stopPolling();
//       hasTriggeredRef.current = false;
//       return;
//     }

//     const requestPermissionsAndStart = async () => {
//       let granted = true;

//       if (Platform.OS === 'android') {
//         const auth = await Geolocation.requestAuthorization('whenInUse');
//         granted = auth === 'granted';
//       }
//       // iOS uses Info.plist keys – no runtime request needed for whenInUse

//       if (!granted) {
//         Alert.alert('Permission Required', 'Location access needed for proximity alerts during shift.');
//         return;
//       }

//       startPolling();
//     };

//     requestPermissionsAndStart();

//     return () => stopPolling();
//   }, [isShiftActive, jobLat, jobLng]);

//   const startPolling = () => {
//     stopPolling();

//     checkProximity(); // immediate check on shift start

//     intervalRef.current = setInterval(checkProximity, POLL_INTERVAL_MS);
//   };

//   const stopPolling = () => {
//     if (intervalRef.current) {
//       clearInterval(intervalRef.current);
//       intervalRef.current = null;
//     }
//   };

//   const checkProximity = () => {
//     Geolocation.getCurrentPosition(
//       (pos) => {
//         const { latitude, longitude } = pos.coords;
//         const distance = getDistanceMeters(latitude, longitude, jobLat!, jobLng!);

//         console.log(`[Shift Proximity] Distance: ${distance.toFixed(0)} m`);

//         if (distance <= RADIUS_METERS && !hasTriggeredRef.current) {
//           triggerAlarm();
//           hasTriggeredRef.current = true;
//         } else if (distance > RADIUS_METERS + 100) {
//           hasTriggeredRef.current = false; // reset for next approach
//         }
//       },
//       (err) => {
//         console.warn('[Proximity Check] Location error:', err);
//       },
//       {
//         enableHighAccuracy: true,
//         timeout: 15000,
//         maximumAge: 10000,
//         distanceFilter: 30, // update only if moved ~30m
//       }
//     );
//   };

//   const triggerAlarm = () => {
//     // Vibration (works on both platforms)
//     Vibration.vibrate(VIBRATION_PATTERN);

//     // Play sound
//     if (soundRef.current?.isLoaded()) {
//       soundRef.current.setVolume(1.0);
//       soundRef.current.play((success) => {
//         if (!success) console.warn('Alarm sound failed to play');
//       });
//     } else {
//       console.warn('Alarm sound not ready yet');
//     }

//     // Optional visible alert (for foreground)
//     Alert.alert(
//       'Proximity Alert',
//       'You are now within 300 meters of the job location!',
//       [{ text: 'OK' }]
//     );
//   };

//   return null; // Hook – no UI
// };

// export default useProximityAlarm;