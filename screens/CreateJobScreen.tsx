// import React, { useState, useMemo, useEffect, useRef } from 'react';
// import {
//   View,
//   Text,
//   ScrollView,
//   TextInput,
//   TouchableOpacity,
//   StyleSheet,
//   Platform,
//   KeyboardAvoidingView,
//   Alert,
//   ActivityIndicator,
//   PermissionsAndroid,
//   SafeAreaView,
//   Modal,
//   StatusBar,
// } from 'react-native';
// import { useNavigation } from '@react-navigation/native';
// import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
// import DateTimePicker from '@react-native-community/datetimepicker';
// import MapView, { Marker } from 'react-native-maps';
// import type { RootStackParamList } from '../navigation/types';
// import {
//   pick,
//   types,
//   DocumentPickerResponse,
// } from '@react-native-documents/picker';
// import ImageResizer from 'react-native-image-resizer';
// import { uploadFile } from '../services/authApi';
// import Toast from 'react-native-toast-message';
// import { isCancel } from 'axios';

// import {
//   Search,
//   MapPin,
//   Calendar,
//   Clock,
//   ChevronDown,
//   CloudUpload,
//   FileCheck,
//   ArrowRight,
//   Check,
//   ChevronLeft,
//   Plus,
//   Trash2,
//   ArrowLeft,
//   AlertCircle,
// } from 'lucide-react-native';
// import { Keyboard } from 'react-native';
// import LinearGradient from 'react-native-linear-gradient';

// // ─── Default location: Sydney, Australia ────────────────────────────────────
// const DEFAULT_LOCATION = {
//   lat: -33.8688,
//   lng: 151.2093,
//   label: 'Sydney, NSW, Australia',
// };
// const BRAND_BG = '#001F3F';
// const TEXT_MUTED = '#94A3B8';
// const ACCENT_TEAL = '#5CE1D6';
// const ERROR_RED = '#EF4444';
// // ─── Constants ───────────────────────────────────────────────────────────────
// const MAX_DESCRIPTION_LENGTH = 500; // Character limit for job description

// // ─── Types ───────────────────────────────────────────────────────────────────
// type ScheduleMode = 'single' | 'range';
// type MultiDayMode = 'individual' | 'range';

// interface Shift {
//   id: string;
//   startTime: Date;
//   endTime: Date;
//   guardsCount: string;
// }

// interface DaySchedule {
//   date: Date;
//   shifts: Shift[];
// }

// interface JobFormData {
//   category: string;
//   documents: string[];
//   location: string;
//   lat: number;
//   lng: number;
//   description: string;
// }

// interface FormErrors {
//   category?: string;
//   description?: string;
//   location?: string;
//   schedule?: string;
// }

// interface PlacePrediction {
//   place_id: string;
//   description: string;
// }

// interface ImageAsset {
//   uri?: string;
//   fileName?: string;
//   fileSize?: number;
//   width?: number;
//   height?: number;
//   type?: string;
// }

// // ─── Helpers ──────────────────────────────────────────────────────────────────
// const isSameDay = (a: Date, b: Date) =>
//   a.getFullYear() === b.getFullYear() &&
//   a.getMonth() === b.getMonth() &&
//   a.getDate() === b.getDate();

// const formatDate = (d: Date) =>
//   d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });

// const formatTime = (d: Date) =>
//   d.toLocaleTimeString([], {
//     hour: '2-digit',
//     minute: '2-digit',
//     hour12: false,
//   });
// const BRAND = '#0A7C6E';
// const BRAND_DARK = '#111827';
// const ACCENT = '#3B82F6';
// const SUCCESS = '#10B981';
// const GRAY_BG = '#F8FAFC';
// const CARD_BG = '#FFFFFF';
// const BORDER = '#E2E8F0';

// const shiftDurationHours = (start: Date, end: Date): number => {
//   let diff = end.getTime() - start.getTime();
//   if (diff < 0) diff += 24 * 60 * 60 * 1000; // overnight
//   return diff > 0 ? diff / (1000 * 60 * 60) : 0;
// };

// const datesBetween = (from: Date, to: Date): Date[] => {
//   const dates: Date[] = [];
//   const cur = new Date(from);
//   cur.setHours(0, 0, 0, 0);
//   const end = new Date(to);
//   end.setHours(0, 0, 0, 0);
//   while (cur <= end) {
//     dates.push(new Date(cur));
//     cur.setDate(cur.getDate() + 1);
//   }
//   return dates;
// };

// const combineDateAndTime = (date: Date, timeSource: Date): Date => {
//   const combined = new Date(date);
//   combined.setHours(
//     timeSource.getHours(),
//     timeSource.getMinutes(),
//     timeSource.getSeconds(),
//     timeSource.getMilliseconds(),
//   );
//   return combined;
// };

// // ─── Guard auto-assignment based on TOTAL shift DURATION ─────────────────────
// // Duration 01h – 13h  → 1 guard  (kept as single shift, no split)
// // Duration 13h – 22h  → 2 guards
// // Duration > 22h      → 3 guards (also split into 3 sub-shifts)
// const autoAssignGuards = (startTime: Date, endTime?: Date): string => {
//   if (endTime) {
//     // Duration-based: used when both times are known
//     const hours = shiftDurationHours(startTime, endTime);
//     if (hours <= 13) return '1';
//     if (hours <= 22) return '2';
//     return '3';
//   }
//   // Fallback hour-based: used for split sub-shifts where only startTime is available
//   const hour = startTime.getHours();
//   if (hour >= 0 && hour < 13) return '1';
//   if (hour >= 13 && hour < 22) return '2';
//   return '3';
// };

// const splitShift = (
//   start: Date,
//   end: Date,
// ): { startTime: Date; endTime: Date }[] => {
//   const totalHours = shiftDurationHours(start, end);
//   if (totalHours <= 13) {
//     return [{ startTime: new Date(start), endTime: new Date(end) }];
//   }

//   const exactPresets: Record<number, number[]> = {
//     22: [8, 8, 6],
//     23: [8, 8, 7],
//     24: [8, 8, 8],
//   };

//   const rounded = Math.round(totalHours);
//   let chunks = exactPresets[rounded] || [];

//   if (chunks.length === 0) {
//     if (totalHours < 22) {
//       const half = Math.ceil(totalHours / 2);
//       chunks = [half, totalHours - half];
//     } else {
//       const num = Math.ceil(totalHours / 8);
//       const base = Math.floor(totalHours / num);
//       const rem = totalHours - base * num;
//       chunks = Array.from({ length: num }, (_, i) =>
//         i === num - 1 ? base + rem : base,
//       );
//     }
//   }

//   const result: { startTime: Date; endTime: Date }[] = [];
//   let current = new Date(start);

//   for (const hours of chunks) {
//     const nextEnd = new Date(current.getTime() + hours * 3600 * 1000);
//     result.push({ startTime: new Date(current), endTime: nextEnd });
//     current = nextEnd;
//   }
//   return result;
// };
// const makeDefaultShift = (): Shift => {
//   const start = new Date();
//   start.setHours(0, 0, 0, 0); // default 00:00
//   const end = new Date(start);
//   end.setHours(0, 0, 0, 0); // default 00:00
//   return {
//     id: Math.random().toString(36).slice(2),
//     startTime: start,
//     endTime: end,
//     guardsCount: '1',
//   };
// };

// const makeDaySchedule = (date: Date): DaySchedule => ({
//   date,
//   shifts: [makeDefaultShift()],
// });

// // ─── Main Component ───────────────────────────────────────────────────────────
// export default function CreateJobScreen() {
//   const navigation =
//     useNavigation<NativeStackNavigationProp<RootStackParamList>>();

//   // ── Map ───────────────────────────────────────────────────────────────────
//   const mapRef = useRef<MapView>(null);
//   const [mapReady, setMapReady] = useState(false);
//   const [mapError, setMapError] = useState(false);
//   const GOOGLE_PLACES_KEY = 'AIzaSyCS-DB39Kk-Z25C5GWymVGshXIALbjXPGY';

//   const [form, setForm] = useState<JobFormData>({
//     category: '',
//     documents: [],
//     location: '',
//     lat: DEFAULT_LOCATION.lat,
//     lng: DEFAULT_LOCATION.lng,
//     description: '',
//   });

//   const [autocompleteQuery, setAutocompleteQuery] = useState('');
//   const [suggestions, setSuggestions] = useState<PlacePrediction[]>([]);
//   const [loadingSuggestions, setLoadingSuggestions] = useState(false);

//   // ── Schedule ──────────────────────────────────────────────────────────────
//   const [scheduleMode, setScheduleMode] = useState<ScheduleMode>('single');
//   const [multiDayMode, setMultiDayMode] = useState<MultiDayMode>('individual');

//   // Single day
//   const [singleDaySchedule, setSingleDaySchedule] = useState<DaySchedule>(
//     makeDaySchedule(new Date()),
//   );

//   // Date range
//   const [rangeFrom, setRangeFrom] = useState<Date>(new Date());
//   const [rangeTo, setRangeTo] = useState<Date>(new Date());
//   const [rangeSchedules, setRangeSchedules] = useState<DaySchedule[]>(() =>
//     datesBetween(new Date(), new Date()).map(makeDaySchedule),
//   );

//   // Individual dates
//   const [individualDates, setIndividualDates] = useState<Date[]>([]);
//   const [individualSchedules, setIndividualSchedules] = useState<DaySchedule[]>(
//     [],
//   );
//   const [indCalendarMonth, setIndCalendarMonth] = useState(new Date());
//   const isToday = (d: Date) => isSameDay(d, new Date());
//   // Bulk apply
//   const [masterStartTime, setMasterStartTime] = useState<Date | null>(null);
//   const [masterEndTime, setMasterEndTime] = useState<Date | null>(null);
//   const [masterGuards, setMasterGuards] = useState<string>('');
//   const [applyToAll, setApplyToAll] = useState(false);

//   // ── Time Picker ───────────────────────────────────────────────────────────
//   const [pickerVisible, setPickerVisible] = useState(false);
//   const [pickerValue, setPickerValue] = useState<Date>(new Date());
//   const [pickerTarget, setPickerTarget] = useState<{
//     mode: 'single' | 'range' | 'master' | 'individual';
//     dayIndex: number;
//     shiftIndex: number;
//     field: 'startTime' | 'endTime';
//   } | null>(null);

//   // ── Calendar Modal (for single day & date range pickers) ──────────────────
//   const [calendarVisible, setCalendarVisible] = useState(false);
//   const [calendarTarget, setCalendarTarget] = useState<
//     'single' | 'rangeFrom' | 'rangeTo' | 'individual'
//   >('single');
//   const [calendarMonth, setCalendarMonth] = useState(new Date());

//   // ── Modals ────────────────────────────────────────────────────────────────
//   const [showDocModal, setShowDocModal] = useState(false);
//   const [showCategoryModal, setShowCategoryModal] = useState(false);
//   const [otherCategory, setOtherCategory] = useState('');
//   const [otherDocument, setOtherDocument] = useState('');

//   // ── Upload ────────────────────────────────────────────────────────────────
//   const [uploading, setUploading] = useState(false);
//   const [uploadedFilePaths, setUploadedFilePaths] = useState<string[]>([]);
//   const [selectedFiles, setSelectedFiles] = useState<
//     (ImageAsset | DocumentPickerResponse)[]
//   >([]);

//   // ── Errors ────────────────────────────────────────────────────────────────
//   const [errors, setErrors] = useState<FormErrors>({});

//   // ── Options ───────────────────────────────────────────────────────────────
//   const documentOptions = [
//     { label: 'Security License', value: 'security_license' },
//     { label: 'MISC Time License', value: 'misc_time_license' },
//     { label: 'Working With Children', value: 'working_with_children' },
//     { label: 'First Aid', value: 'first_aid' },
//     { label: 'CPR', value: 'cpr' },
//     { label: 'White Card', value: 'white_card' },
//     { label: 'Traffic Controller', value: 'traffic_controller' },
//     { label: 'Others', value: 'others' },
//   ];
//   const categoryOptions = [
//     { label: 'Event Security', value: 'event-security' },
//     { label: 'Static Security Guard', value: 'static-security' },
//     { label: 'Corporate Security', value: 'corporate-security' },
//     { label: 'Site Patrol Security', value: 'site-patrol' },
//     { label: 'Others', value: 'others' },
//   ];

//   const openIndividualDatePicker = () => {
//     setCalendarTarget('individual');
//     setCalendarVisible(true);
//   };

//   const documentTypes = form.documents
//     .map(doc => (doc === 'others' ? otherDocument.trim() : doc))
//     .filter(Boolean);

//   // ── Map init ──────────────────────────────────────────────────────────────
//   useEffect(() => {
//     const timer = setTimeout(() => setMapReady(true), 1500);
//     return () => clearTimeout(timer);
//   }, []);

//   useEffect(() => {
//     if (!mapReady || !mapRef.current) return;
//     mapRef.current.animateToRegion(
//       {
//         latitude: form.lat,
//         longitude: form.lng,
//         latitudeDelta: 0.022,
//         longitudeDelta: 0.012,
//       },
//       800,
//     );
//   }, [mapReady]);

//   // ── User location ─────────────────────────────────────────────────────────
//   useEffect(() => {
//     const getLocation = async () => {
//       let hasPermission = true;
//       if (Platform.OS === 'android') {
//         try {
//           const granted = await PermissionsAndroid.request(
//             PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
//           );
//           hasPermission = granted === PermissionsAndroid.RESULTS.GRANTED;
//         } catch {
//           hasPermission = false;
//         }
//       }
//       if (!hasPermission) return;
//       if ('geolocation' in navigator) {
//         navigator.geolocation.getCurrentPosition(
//           pos => {
//             const { latitude, longitude } = pos.coords;
//             setForm(prev => ({ ...prev, lat: latitude, lng: longitude }));
//             if (mapReady && mapRef.current) {
//               mapRef.current.animateToRegion(
//                 {
//                   latitude,
//                   longitude,
//                   latitudeDelta: 0.022,
//                   longitudeDelta: 0.012,
//                 },
//                 1000,
//               );
//             }
//           },
//           () => {},
//           { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 },
//         );
//       }
//     };
//     getLocation();
//   }, [mapReady]);

//   // ── Autocomplete ──────────────────────────────────────────────────────────
//   useEffect(() => {
//     if (autocompleteQuery.length < 3) {
//       setSuggestions([]);
//       return;
//     }
//     const timeout = setTimeout(async () => {
//       setLoadingSuggestions(true);
//       try {
//         const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
//           autocompleteQuery,
//         )}&key=${GOOGLE_PLACES_KEY}`;
//         const res = await fetch(url);
//         const json = await res.json();
//         setSuggestions(json.status === 'OK' ? json.predictions || [] : []);
//       } catch {
//         setSuggestions([]);
//       } finally {
//         setLoadingSuggestions(false);
//       }
//     }, 400);
//     return () => clearTimeout(timeout);
//   }, [autocompleteQuery]);

//   const selectSuggestion = async (prediction: PlacePrediction) => {
//     setAutocompleteQuery('');
//     setSuggestions([]);
//     setErrors(prev => ({ ...prev, location: undefined }));
//     try {
//       const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${prediction.place_id}&fields=geometry&key=${GOOGLE_PLACES_KEY}`;
//       const res = await fetch(url);
//       const json = await res.json();
//       if (json.status === 'OK' && json.result?.geometry?.location) {
//         const { lat, lng } = json.result.geometry.location;
//         setForm(prev => ({
//           ...prev,
//           location: prediction.description,
//           lat,
//           lng,
//         }));
//         if (mapReady && mapRef.current) {
//           mapRef.current.animateToRegion(
//             {
//               latitude: lat,
//               longitude: lng,
//               latitudeDelta: 0.022,
//               longitudeDelta: 0.012,
//             },
//             800,
//           );
//         }
//       }
//     } catch (err) {
//       console.error('Place details error:', err);
//     }
//   };

//   // ── Rebuild range schedules ───────────────────────────────────────────────
//   useEffect(() => {
//     if (scheduleMode !== 'range' || multiDayMode !== 'range') return;
//     const days = datesBetween(rangeFrom, rangeTo);
//     setRangeSchedules(prev =>
//       days.map(
//         date =>
//           prev.find(p => isSameDay(p.date, date)) ?? makeDaySchedule(date),
//       ),
//     );
//   }, [rangeFrom, rangeTo, scheduleMode, multiDayMode]);

//   // ── Sync individual schedules ─────────────────────────────────────────────
//   useEffect(() => {
//     if (scheduleMode !== 'range' || multiDayMode !== 'individual') return;
//     setIndividualSchedules(prev =>
//       [...individualDates]
//         .sort((a, b) => a.getTime() - b.getTime())
//         .map(
//           date =>
//             prev.find(p => isSameDay(p.date, date)) ?? makeDaySchedule(date),
//         ),
//     );
//   }, [individualDates, multiDayMode, scheduleMode]);

//   // ── Bulk apply ────────────────────────────────────────────────────────────
//   const applyMasterToAll = (
//     start: Date | null,
//     end: Date | null,
//     guards: string,
//   ) => {
//     if (!start || !end) return;

//     const buildShifts = (existing: Shift[], date: Date) => {
//       const dayStart = combineDateAndTime(date, start);
//       const dayEnd = combineDateAndTime(date, end);
//       const hours = shiftDurationHours(dayStart, dayEnd);
//       const splits = hours > 13 ? splitShift(dayStart, dayEnd) : null;

//       if (splits) {
//         return splits.map(s => {
//           const startOffset = s.startTime.getTime() - dayStart.getTime();
//           const endOffset = s.endTime.getTime() - dayStart.getTime();
//           const startTime = new Date(dayStart.getTime() + startOffset);
//           const endTime = new Date(dayStart.getTime() + endOffset);
//           return {
//             id: Math.random().toString(36).slice(2),
//             startTime,
//             endTime,
//             guardsCount: guards || autoAssignGuards(startTime, endTime),
//           };
//         });
//       }

//       return existing.map(shift => {
//         const startTime = combineDateAndTime(date, start);
//         let endTime = combineDateAndTime(date, end);
//         if (endTime <= startTime) endTime.setDate(endTime.getDate() + 1);
//         return {
//           ...shift,
//           startTime,
//           endTime,
//           guardsCount: guards || autoAssignGuards(startTime, endTime),
//         };
//       });
//     };

//     if (multiDayMode === 'individual') {
//       setIndividualSchedules(prev =>
//         prev.map(day => ({
//           ...day,
//           shifts: buildShifts(day.shifts, day.date),
//         })),
//       );
//     } else {
//       setRangeSchedules(prev =>
//         prev.map(day => ({
//           ...day,
//           shifts: buildShifts(day.shifts, day.date),
//         })),
//       );
//     }
//   };

//   const handleApplyToAllToggle = () => {
//     const newVal = !applyToAll;
//     setApplyToAll(newVal);
//     if (newVal) applyMasterToAll(masterStartTime, masterEndTime, masterGuards);
//   };

//   const onMasterGuardsChange = (val: string) => {
//     if (!/^\d*$/.test(val)) return;
//     setMasterGuards(val);
//     if (applyToAll) applyMasterToAll(masterStartTime, masterEndTime, val);
//   };

//   const openMasterTimePicker = (field: 'startTime' | 'endTime') => {
//     setPickerValue(
//       (field === 'startTime' ? masterStartTime : masterEndTime) || new Date(),
//     );
//     setPickerTarget({ mode: 'master', dayIndex: -1, shiftIndex: -1, field });
//     setPickerVisible(true);
//   };

//   const updateSingleShift = (idx: number, field: keyof Shift, value: any) =>
//     setSingleDaySchedule(prev => ({
//       ...prev,
//       shifts: prev.shifts.map((s, i) =>
//         i === idx ? { ...s, [field]: value } : s,
//       ),
//     }));

//   const addSingleShift = () =>
//     setSingleDaySchedule(prev => ({
//       ...prev,
//       shifts: [...prev.shifts, makeDefaultShift()],
//     }));

//   const removeSingleShift = (idx: number) => {
//     setSingleDaySchedule(prev => ({
//       ...prev,
//       shifts:
//         prev.shifts.length > 1
//           ? prev.shifts.filter((_, i) => i !== idx)
//           : [makeDefaultShift()], // Keep at least one shift
//     }));
//   };

//   const removeRangeShift = (di: number, si: number) => {
//     setRangeSchedules(prev => {
//       const days = [...prev];
//       days[di].shifts = days[di].shifts.filter((_, i) => i !== si);

//       // Remove day completely if no shifts left
//       return days.filter(day => day.shifts.length > 0);
//     });
//   };

//   const updateRangeShift = (
//     di: number,
//     si: number,
//     field: keyof Shift,
//     value: any,
//   ) => {
//     setApplyToAll(false);
//     setRangeSchedules(prev => {
//       const days = [...prev];
//       days[di] = {
//         ...days[di],
//         shifts: days[di].shifts.map((s, i) =>
//           i === si ? { ...s, [field]: value } : s,
//         ),
//       };
//       return days;
//     });
//   };

//   const addRangeShift = (di: number) =>
//     setRangeSchedules(prev => {
//       const days = [...prev];
//       days[di] = {
//         ...days[di],
//         shifts: [...days[di].shifts, makeDefaultShift()],
//       };
//       return days;
//     });

//   const updateIndividualShift = (
//     di: number,
//     si: number,
//     field: keyof Shift,
//     value: any,
//   ) => {
//     setApplyToAll(false);
//     setIndividualSchedules(prev => {
//       const days = [...prev];
//       days[di] = {
//         ...days[di],
//         shifts: days[di].shifts.map((s, i) =>
//           i === si ? { ...s, [field]: value } : s,
//         ),
//       };
//       return days;
//     });
//   };

//   const addIndividualShift = (di: number) =>
//     setIndividualSchedules(prev => {
//       const days = [...prev];
//       days[di] = {
//         ...days[di],
//         shifts: [...days[di].shifts, makeDefaultShift()],
//       };
//       return days;
//     });

//   const removeIndividualShift = (di: number, si: number) => {
//     setIndividualSchedules(prev => {
//       const days = [...prev];
//       days[di].shifts = days[di].shifts.filter((_, i) => i !== si);

//       // Remove day completely if no shifts left
//       return days.filter(day => day.shifts.length > 0);
//     });
//   };

//   // ── Open time picker ──────────────────────────────────────────────────────
//   const openTimePicker = (
//     mode: 'single' | 'range' | 'individual',
//     dayIndex: number,
//     shiftIndex: number,
//     field: 'startTime' | 'endTime',
//   ) => {
//     let currentVal: Date;
//     if (mode === 'single') {
//       currentVal = singleDaySchedule.shifts[shiftIndex]?.[field] ?? new Date();
//     } else if (mode === 'individual') {
//       currentVal =
//         individualSchedules[dayIndex]?.shifts[shiftIndex]?.[field] ??
//         new Date();
//     } else {
//       currentVal =
//         rangeSchedules[dayIndex]?.shifts[shiftIndex]?.[field] ?? new Date();
//     }
//     setPickerValue(currentVal);
//     setPickerTarget({ mode, dayIndex, shiftIndex, field });
//     setPickerVisible(true);
//   };

//   const applyTimeChange = (selectedDate: Date) => {
//     if (!pickerTarget) return;

//     const { mode, dayIndex, shiftIndex, field } = pickerTarget;

//     if (mode === 'master') {
//       if (field === 'startTime') setMasterStartTime(selectedDate);
//       else setMasterEndTime(selectedDate);
//       if (applyToAll)
//         applyMasterToAll(masterStartTime, masterEndTime, masterGuards);
//       return;
//     }

//     let currentShift: Shift;
//     const isSingle = mode === 'single';

//     if (isSingle) currentShift = singleDaySchedule.shifts[shiftIndex];
//     else if (mode === 'individual')
//       currentShift = individualSchedules[dayIndex].shifts[shiftIndex];
//     else currentShift = rangeSchedules[dayIndex].shifts[shiftIndex];

//     let newStart =
//       field === 'startTime'
//         ? combineDateAndTime(currentShift.startTime, selectedDate)
//         : currentShift.startTime;

//     let newEnd =
//       field === 'endTime'
//         ? combineDateAndTime(currentShift.endTime, selectedDate)
//         : currentShift.endTime;

//     if (newEnd <= newStart) {
//       newEnd = new Date(newEnd.getTime() + 24 * 60 * 60 * 1000);
//     }

//     const hours = shiftDurationHours(newStart, newEnd);

//     // AUTO SPLIT ONLY when End Time is being set AND duration > 13 hours
//     if (field === 'endTime' && hours > 13) {
//       const splits = splitShift(newStart, newEnd);

//       const newShifts = splits.map(s => ({
//         id: Math.random().toString(36).slice(2),
//         startTime: new Date(s.startTime),
//         endTime: new Date(s.endTime),
//         guardsCount: '1',
//       }));

//       // Show Toast
//       Toast.show({
//         type: 'info',
//         text1: 'Shift Split',
//         text2: `Long shift (${hours.toFixed(1)}h) split into ${
//           splits.length
//         } parts`,
//         position: 'bottom',
//         visibilityTime: 2500,
//       });

//       if (isSingle) {
//         const grouped: DaySchedule[] = [];
//         newShifts.forEach(shift => {
//           const d = new Date(shift.startTime);
//           d.setHours(0, 0, 0, 0);
//           let day = grouped.find(ds => isSameDay(ds.date, d));
//           if (!day) {
//             day = { date: d, shifts: [] };
//             grouped.push(day);
//           }
//           day.shifts.push(shift);
//         });

//         if (grouped.length > 1) {
//           setScheduleMode('range');
//           setMultiDayMode('individual');
//           setIndividualDates(grouped.map(g => g.date));
//           setIndividualSchedules(grouped);
//         } else {
//           setSingleDaySchedule(grouped[0]);
//         }
//       } else {
//         const setFn =
//           mode === 'individual' ? setIndividualSchedules : setRangeSchedules;
//         setFn((prev: DaySchedule[]) => {
//           const newList = [...prev];
//           const target = newList[dayIndex];
//           target.shifts = target.shifts.filter((_, i) => i !== shiftIndex);

//           newShifts.forEach(shift => {
//             const shiftDate = new Date(shift.startTime);
//             shiftDate.setHours(0, 0, 0, 0);
//             let idx = newList.findIndex(d => isSameDay(d.date, shiftDate));
//             if (idx === -1) {
//               newList.push({ date: shiftDate, shifts: [] });
//               idx = newList.length - 1;
//             }
//             newList[idx].shifts.push(shift);
//           });

//           return newList.sort((a, b) => a.date.getTime() - b.date.getTime());
//         });
//       }
//       return;
//     }

//     // Normal update (no split)
//     const updateValue = field === 'startTime' ? newStart : newEnd;
//     if (isSingle) {
//       updateSingleShift(shiftIndex, field, updateValue);
//     } else if (mode === 'individual') {
//       updateIndividualShift(dayIndex, shiftIndex, field, updateValue);
//     } else {
//       updateRangeShift(dayIndex, shiftIndex, field, updateValue);
//     }
//   };
//   // ── FIX: Auto-select End Time after Start Time is selected ────────────────
//   const onTimePickerChange = (_: any, selectedDate?: Date) => {
//     if (Platform.OS === 'android') {
//       setPickerVisible(false);
//       if (selectedDate) {
//         applyTimeChange(selectedDate);

//         // Auto-open End Time picker after Start Time is selected
//         if (pickerTarget?.field === 'startTime') {
//         }
//       }
//     } else {
//       if (selectedDate) setPickerValue(selectedDate);
//     }
//   };

//   // ── Calendar helpers ──────────────────────────────────────────────────────
//   const buildCalendarDays = (month: Date): (Date | null)[] => {
//     const year = month.getFullYear();
//     const m = month.getMonth();
//     const first = new Date(year, m, 1);
//     const last = new Date(year, m + 1, 0);
//     const days: (Date | null)[] = [];
//     for (let i = 0; i < first.getDay(); i++) days.push(null);
//     for (let d = 1; d <= last.getDate(); d++) days.push(new Date(year, m, d));
//     return days;
//   };

//   const calendarDays = useMemo(
//     () => buildCalendarDays(calendarMonth),
//     [calendarMonth],
//   );
//   const indCalendarDays = useMemo(
//     () => buildCalendarDays(indCalendarMonth),
//     [indCalendarMonth],
//   );

//   const isDaySelected = (d: Date) => {
//     if (calendarTarget === 'single') {
//       return isSameDay(d, singleDaySchedule.date);
//     }
//     if (calendarTarget === 'rangeFrom') {
//       return isSameDay(d, rangeFrom);
//     }
//     if (calendarTarget === 'rangeTo') {
//       return isSameDay(d, rangeTo);
//     }
//     if (calendarTarget === 'individual') {
//       // Check if this date is in the selected individualDates array
//       return individualDates.some(date => isSameDay(date, d));
//     }
//     return false;
//   };

//   const isDayInRange = (d: Date) => {
//     if (calendarTarget === 'individual') return false; // No "in-range" for individual
//     return (
//       (calendarTarget === 'rangeFrom' || calendarTarget === 'rangeTo') &&
//       d > rangeFrom &&
//       d < rangeTo
//     );
//   };
//   const onCalendarDayPress = (d: Date) => {
//     const isPast = d < new Date(new Date().setHours(0, 0, 0, 0));

//     if (isPast) return;

//     if (calendarTarget === 'single') {
//       setSingleDaySchedule(prev => ({ ...prev, date: d }));
//     } else if (calendarTarget === 'rangeFrom') {
//       setRangeFrom(d);
//       if (d > rangeTo) setRangeTo(d);
//     } else if (calendarTarget === 'rangeTo') {
//       setRangeTo(d);
//       if (d < rangeFrom) setRangeFrom(d);
//     } else if (calendarTarget === 'individual') {
//       // ← New case
//       setIndividualDates(prev => {
//         const exists = prev.find(p => isSameDay(p, d));
//         return exists
//           ? prev.filter(p => !isSameDay(p, d))
//           : [...prev, d].sort((a, b) => a.getTime() - b.getTime());
//       });
//     }

//     // Only close modal for single/range, keep open for individual to allow multiple selection
//     if (calendarTarget !== 'individual') {
//       setCalendarVisible(false);
//     }
//   };

//   // ── Individual date toggle ────────────────────────────────────────────────
//   const toggleIndividualDate = (d: Date) => {
//     const isPast = d < new Date(new Date().setHours(0, 0, 0, 0));
//     if (isPast) return;
//     setIndividualDates(prev => {
//       const exists = prev.find(p => isSameDay(p, d));
//       return exists ? prev.filter(p => !isSameDay(p, d)) : [...prev, d];
//     });
//   };

//   // ── Total man-hours ───────────────────────────────────────────────────────
//   const totalManHours = useMemo(() => {
//     const schedules =
//       scheduleMode === 'single'
//         ? [singleDaySchedule]
//         : multiDayMode === 'individual'
//         ? individualSchedules
//         : rangeSchedules;
//     return schedules.reduce(
//       (total, day) =>
//         total +
//         day.shifts.reduce((dTotal, shift) => {
//           const h = shiftDurationHours(shift.startTime, shift.endTime);
//           const g = Math.max(1, parseInt(shift.guardsCount || '1', 10));
//           return dTotal + h * g;
//         }, 0),
//       0,
//     );
//   }, [
//     scheduleMode,
//     multiDayMode,
//     singleDaySchedule,
//     rangeSchedules,
//     individualSchedules,
//   ]);

//   // ── Upload ────────────────────────────────────────────────────────────────
//   const handleUpload = async () => {
//     try {
//       const result = await pick({
//         type: [types.allFiles],
//         allowMultiSelection: true,
//       });
//       if (!result || result.length === 0) return;
//       setUploading(true);
//       const newPaths: string[] = [];
//       for (const file of result) {
//         let fileToUpload = file;
//         if (file.type?.startsWith('image/')) {
//           try {
//             const resized = await ImageResizer.createResizedImage(
//               file.uri,
//               1024,
//               1024,
//               'JPEG',
//               75,
//               0,
//             );
//             fileToUpload = {
//               ...file,
//               uri: resized.uri,
//               name: file.name || 'compressed_image.jpg',
//               type: 'image/jpeg',
//             };
//           } catch (e) {
//             console.warn('Compression failed:', e);
//           }
//         }
//         const uploaded = await uploadFile(fileToUpload);
//         const fp = uploaded?.url || uploaded?.path || uploaded?.file || '';
//         if (fp) {
//           newPaths.push(fp);
//           setSelectedFiles(prev => [...prev, file]);
//         }
//       }
//       if (newPaths.length > 0) {
//         setUploadedFilePaths(prev => [...prev, ...newPaths]);
//         Toast.show({
//           type: 'success',
//           text1: `${newPaths.length} File${
//             newPaths.length !== 1 ? 's' : ''
//           } Uploaded`,
//           position: 'bottom',
//         });
//       }
//     } catch (err: any) {
//       if (isCancel(err)) return;
//       Toast.show({
//         type: 'error',
//         text1: 'Upload Failed',
//         text2: err?.message || 'Try again',
//         position: 'bottom',
//       });
//     } finally {
//       setUploading(false);
//     }
//   };

//   // ── Validate & navigate ───────────────────────────────────────────────────
//   const validateAndNext = () => {
//     const newErrors: FormErrors = {};
//     if (!form.category) newErrors.category = 'Please select a job category';
//     if (form.category === 'others' && !otherCategory.trim())
//       newErrors.category = 'Please enter job category';
//     if (!form.description.trim())
//       newErrors.description = 'Description is required';
//     if (!form.location.trim()) newErrors.location = 'Location is required';
//     setErrors(newErrors);
//     if (Object.keys(newErrors).length > 0) {
//       Alert.alert('Incomplete Form', 'Please fill all required fields');
//       return;
//     }

//     const activeSchedules =
//       scheduleMode === 'single'
//         ? [singleDaySchedule]
//         : multiDayMode === 'individual'
//         ? individualSchedules
//         : rangeSchedules;

//     const first = activeSchedules[0];
//     const last = activeSchedules[activeSchedules.length - 1];

//     navigation.navigate('ReviewConfirm', {
//       jobData: {
//         category: form.category,
//         location: form.location || 'Not specified',
//         lat: form.lat ?? 0,
//         lng: form.lng ?? 0,
//         description: form.description || '',
//         startDate: first.date,
//         startTime: first.shifts[0]?.startTime ?? new Date(),
//         endDate: last.date,
//         endTime: last.shifts.at(-1)?.endTime ?? new Date(),
//         shifts: activeSchedules.flatMap(day =>
//           day.shifts.map(s => ({
//             date: day.date,
//             startTime: s.startTime,
//             endTime: s.endTime,
//             guardsCount: Number(s.guardsCount ?? 1),
//           })),
//         ),
//       },
//       uploadedFileUrls: uploadedFilePaths,
//       selectedDocuments: documentTypes,
//     });
//   };

//   const renderShiftRow = (
//     shift: Shift,
//     shiftIndex: number,
//     dayIndex: number,
//     mode: 'single' | 'range' | 'individual',
//     shiftsInDay: number,
//     date: Date,
//     isFirst: boolean,
//   ) => {
//     const onGuardsChange = (text: string) => {
//       if (!/^\d*$/.test(text)) return;
//       if (mode === 'single') updateSingleShift(shiftIndex, 'guardsCount', text);
//       else if (mode === 'individual')
//         updateIndividualShift(dayIndex, shiftIndex, 'guardsCount', text);
//       else updateRangeShift(dayIndex, shiftIndex, 'guardsCount', text);
//     };

//     const onDelete = () => {
//       if (mode === 'single') removeSingleShift(shiftIndex);
//       else if (mode === 'individual')
//         removeIndividualShift(dayIndex, shiftIndex);
//       else removeRangeShift(dayIndex, shiftIndex);
//     };

//     const isNextDayEnd =
//       shift.endTime.getDate() !== shift.startTime.getDate() ||
//       shift.endTime.getMonth() !== shift.startTime.getMonth();

//     return (
//       <View key={shift.id} style={{ marginBottom: 8 }}>
//         <View style={styles.shiftRow}>
//           <View style={styles.shiftDateCol}>
//             {isFirst ? (
//               <>
//                 <Text style={styles.shiftDateDay}>{date.getDate()}</Text>
//                 <Text style={styles.shiftDateMonth}>
//                   {date.toLocaleString('default', { month: 'short' })}
//                 </Text>
//               </>
//             ) : (
//               <View style={styles.shiftContinueLine} />
//             )}
//           </View>

//           <View style={styles.shiftMiddle}>
//             <TouchableOpacity
//               style={styles.shiftTimeBtn}
//               onPress={() =>
//                 openTimePicker(mode, dayIndex, shiftIndex, 'startTime')
//               }
//             >
//               <Clock size={13} color="#0A7C6E" />
//               <Text style={styles.shiftTimeTxt}>
//                 {formatTime(shift.startTime)}
//               </Text>
//             </TouchableOpacity>

//             <Text style={styles.shiftTimeSep}>→</Text>

//             <TouchableOpacity
//               style={styles.shiftTimeBtn}
//               onPress={() =>
//                 openTimePicker(mode, dayIndex, shiftIndex, 'endTime')
//               }
//             >
//               <Clock size={13} color="#64748b" />
//               <Text style={styles.shiftTimeTxt}>
//                 {formatTime(shift.endTime)}
//               </Text>
//               {isNextDayEnd && <Text style={styles.nextDayBadge}>+1d</Text>}
//             </TouchableOpacity>
//           </View>

//           <View style={styles.shiftGuardsCol}>
//             <TextInput
//               style={styles.guardsSmallInput}
//               keyboardType="numeric"
//               value={shift.guardsCount}
//               onChangeText={onGuardsChange}
//               maxLength={3}
//             />
//           </View>

//           <TouchableOpacity style={styles.shiftDeleteBtn} onPress={onDelete}>
//             <Trash2 size={18} color="#ef4444" />
//           </TouchableOpacity>
//         </View>
//       </View>
//     );
//   };

//   const renderSingleDay = () => (
//     <View>
//       <TouchableOpacity
//         style={styles.dateSelectBtn}
//         onPress={() => {
//           setCalendarTarget('single');
//           setCalendarVisible(true);
//         }}
//       >
//         <Calendar size={16} color="#0A7C6E" />
//         <Text style={styles.dateSelectTxt}>
//           {singleDaySchedule.date.toLocaleDateString('en-GB', {
//             weekday: 'short',
//             day: '2-digit',
//             month: 'short',
//             year: 'numeric',
//           })}
//         </Text>
//         <ChevronDown size={16} color="#64748b" />
//       </TouchableOpacity>

//       <View style={styles.shiftHeaderRow}>
//         <Text style={[styles.shiftHeaderTxt, { width: 44 }]}>Date</Text>
//         <Text style={[styles.shiftHeaderTxt, { flex: 2 }]}>Start → End</Text>
//         <Text style={[styles.shiftHeaderTxt, { width: 56 }]}>Guards</Text>
//         <View style={{ width: 28 }} />
//       </View>

//       {singleDaySchedule.shifts.map((shift, si) =>
//         renderShiftRow(
//           shift,
//           si,
//           0,
//           'single',
//           singleDaySchedule.shifts.length,
//           singleDaySchedule.date,
//           si === 0,
//         ),
//       )}

//       {singleDaySchedule.shifts.length > 0 && (
//         <TouchableOpacity
//           style={[styles.addShiftBtn, { marginLeft: 44, marginBottom: 4 }]}
//           onPress={addSingleShift}
//         >
//           <Plus size={15} color="#0A7C6E" />
//           <Text style={styles.addShiftTxt}>Add Shift</Text>
//         </TouchableOpacity>
//       )}
//     </View>
//   );

//   // ── Shared bulk apply UI ──────────────────────────────────────────────────
//   const renderBulkApply = () => (
//     <View style={styles.masterSettingsBox}>
//       <Text style={[styles.timeLabel, { marginBottom: 10, color: '#475569' }]}>
//         Bulk Apply Settings
//       </Text>
//       <View style={[styles.shiftRow, { paddingVertical: 0, marginBottom: 14 }]}>
//         <View style={styles.shiftMiddle}>
//           <TouchableOpacity
//             style={styles.shiftTimeBtn}
//             onPress={() => openMasterTimePicker('startTime')}
//           >
//             <Clock size={13} color={masterStartTime ? '#0A7C6E' : '#94a3b8'} />
//             <Text
//               style={[
//                 styles.shiftTimeTxt,
//                 !masterStartTime && { color: '#94a3b8' },
//               ]}
//             >
//               {masterStartTime ? formatTime(masterStartTime) : '00:00'}
//             </Text>
//           </TouchableOpacity>
//           <Text style={styles.shiftTimeSep}>→</Text>
//           <TouchableOpacity
//             style={styles.shiftTimeBtn}
//             onPress={() => openMasterTimePicker('endTime')}
//           >
//             <Clock size={13} color={masterEndTime ? '#64748b' : '#94a3b8'} />
//             <Text
//               style={[
//                 styles.shiftTimeTxt,
//                 !masterEndTime && { color: '#94a3b8' },
//               ]}
//             >
//               {masterEndTime ? formatTime(masterEndTime) : '00:00'}
//             </Text>
//           </TouchableOpacity>
//         </View>
//         <View style={styles.shiftGuardsCol}>
//           <TextInput
//             style={[styles.guardsSmallInput, { backgroundColor: '#fff' }]}
//             keyboardType="numeric"
//             value={masterGuards}
//             onChangeText={onMasterGuardsChange}
//             placeholder="-"
//             maxLength={3}
//           />
//         </View>
//       </View>
//       <TouchableOpacity
//         style={styles.sameTimeRow}
//         onPress={handleApplyToAllToggle}
//       >
//         <View style={[styles.checkbox, applyToAll && styles.checkboxSelected]}>
//           {applyToAll && <Check size={13} color="#fff" />}
//         </View>
//         <Text style={styles.sameTimeTxt}>
//           Select All (Apply same setting to all shifts)
//         </Text>
//       </TouchableOpacity>
//     </View>
//   );

//   const renderDayShiftList = (
//     schedules: DaySchedule[],
//     mode: 'range' | 'individual',
//     addFn: (di: number) => void,
//   ) => (
//     <>
//       <View style={styles.shiftHeaderRow}>
//         <Text style={[styles.shiftHeaderTxt, { width: 44 }]}>Date</Text>
//         <Text style={[styles.shiftHeaderText, { flex: 1 }]}>Start → End</Text>
//         <Text style={[styles.shiftHeaderTxt, { width: 56 }]}>Guards</Text>
//         <View style={{ width: 28 }} />
//       </View>

//       {schedules.map((day, di) => (
//         <View key={day.date.toISOString()}>
//           {day.shifts.map((shift, si) =>
//             renderShiftRow(
//               shift,
//               si,
//               di,
//               mode,
//               day.shifts.length,
//               day.date,
//               si === 0,
//             ),
//           )}

//           {/* Show Add Shift button ONLY if day has shifts */}
//           {day.shifts.length > 0 && (
//             <TouchableOpacity
//               style={[styles.addShiftBtn, { marginLeft: 44, marginBottom: 4 }]}
//               onPress={() => addFn(di)}
//             >
//               <Plus size={13} color="#0A7C6E" />
//               <Text style={[styles.addShiftTxt, { fontSize: 12 }]}>
//                 Add Shift
//               </Text>
//             </TouchableOpacity>
//           )}

//           {di < schedules.length - 1 && <View style={styles.dayDivider} />}
//         </View>
//       ))}
//     </>
//   );

//   const toggleDocument = (docValue: string) => {
//     let updated = [...form.documents];

//     if (updated.includes(docValue)) {
//       updated = updated.filter(d => d !== docValue);
//     } else {
//       updated.push(docValue);
//     }

//     setForm({ ...form, documents: updated });
//   };

//   // ── Individual dates picker ───────────────────────────────────────────────
//   const renderIndividualDates = () => (
//     <View>
//       <Text style={[styles.timeLabel, { marginBottom: 8 }]}>
//         SELECT DATES (Tap to toggle)
//       </Text>

//       <TouchableOpacity
//         style={styles.dateSelectBtn}
//         onPress={openIndividualDatePicker}
//       >
//         <Calendar size={16} color="#0A7C6E" />
//         <Text style={styles.dateSelectTxt}>Select Multiple Dates</Text>
//         <ChevronDown size={16} color="#64748b" />
//       </TouchableOpacity>

//       {individualDates.length > 0 && (
//         <>
//           <Text style={styles.multiSummary}>
//             {individualDates.length} date
//             {individualDates.length !== 1 ? 's' : ''} selected
//           </Text>

//           {renderBulkApply()}
//           {renderDayShiftList(
//             individualSchedules,
//             'individual',
//             addIndividualShift,
//           )}
//         </>
//       )}

//       {individualDates.length === 0 && (
//         <Text
//           style={{
//             color: '#94a3b8',
//             textAlign: 'center',
//             marginVertical: 20,
//             fontSize: 13,
//           }}
//         >
//           No dates selected yet. Tap "Select Multiple Dates" above.
//         </Text>
//       )}
//     </View>
//   );

//   // ── Date range content ────────────────────────────────────────────────────
//   const renderDateRangeContent = () => (
//     <View>
//       <View style={styles.rangePickerRow}>
//         <View style={{ flex: 1 }}>
//           <Text style={styles.timeLabel}>From</Text>
//           <TouchableOpacity
//             style={styles.timeButton}
//             onPress={() => {
//               setCalendarTarget('rangeFrom');
//               setCalendarVisible(true);
//             }}
//           >
//             <Calendar size={16} color="#64748b" />
//             <Text style={styles.timeButtonText}>{formatDate(rangeFrom)}</Text>
//           </TouchableOpacity>
//         </View>
//         <Text style={styles.rangeArrowTxt}>→</Text>
//         <View style={{ flex: 1 }}>
//           <Text style={styles.timeLabel}>To</Text>
//           <TouchableOpacity
//             style={styles.timeButton}
//             onPress={() => {
//               setCalendarTarget('rangeTo');
//               setCalendarVisible(true);
//             }}
//           >
//             <Calendar size={16} color="#64748b" />
//             <Text style={styles.timeButtonText}>{formatDate(rangeTo)}</Text>
//           </TouchableOpacity>
//         </View>
//       </View>

//       <Text style={styles.multiSummary}>
//         {rangeSchedules.length} day{rangeSchedules.length !== 1 ? 's' : ''}{' '}
//         selected
//       </Text>

//       {renderBulkApply()}
//       {renderDayShiftList(rangeSchedules, 'range', addRangeShift)}
//     </View>
//   );

//   // ── Multiple days wrapper (with sub-tabs) ─────────────────────────────────
//   const renderMultipleDays = () => (
//     <View>
//       {/* Sub-tabs: Individual Dates | Date Range */}
//       <View style={[styles.modeRow, { marginBottom: 16 }]}>
//         {[
//           { mode: 'individual' as MultiDayMode, label: 'Individual Dates' },
//           { mode: 'range' as MultiDayMode, label: 'Date Range' },
//         ].map(({ mode, label }) => (
//           <TouchableOpacity
//             key={mode}
//             style={[
//               styles.modeTab,
//               multiDayMode === mode && styles.modeTabActive,
//             ]}
//             onPress={() => setMultiDayMode(mode)}
//           >
//             <Text
//               style={[
//                 styles.modeTabText,
//                 multiDayMode === mode && styles.modeTabTextActive,
//               ]}
//             >
//               {label}
//             </Text>
//           </TouchableOpacity>
//         ))}
//       </View>
//       {multiDayMode === 'individual'
//         ? renderIndividualDates()
//         : renderDateRangeContent()}
//     </View>
//   );

//   // ── MAIN RENDER ───────────────────────────────────────────────────────────
//   return (
//     <SafeAreaView style={styles.container}>
//       <StatusBar barStyle="light-content" backgroundColor={BRAND_BG} />
//       <KeyboardAvoidingView
//         behavior={Platform.OS === 'ios' ? 'padding' : undefined}
//         style={{ flex: 1 }}
//       >
//         {/* Top Corporate Branding Header */}
//         <View style={styles.headerRow}>
//           {' '}
//           {/* Back Button */}
//           <TouchableOpacity
//             onPress={() => navigation.goBack()}
//             style={styles.backBtn}
//           >
//             <ArrowLeft size={20} color={ACCENT_TEAL} />
//           </TouchableOpacity>
//           {/* Title */}
//           <Text style={styles.headerTitle}>Create Job</Text>
//           {/* Right spacer (for center alignment) */}
//           <View style={{ width: 40 }} />
//         </View>

//         <ScrollView
//           contentContainerStyle={styles.scrollContent}
//           keyboardShouldPersistTaps="handled"
//         >
//           <Text style={styles.inputLabel}>Job Category *</Text>

//           <LinearGradient
//             colors={[
//               'rgba(255, 255, 255, 0.41)',
//               'rgba(255,255,255,0.35)',
//               'rgba(255, 255, 255, 0.2)',
//               'rgba(255,255,255,0.10)',
//               'rgba(255, 255, 255, 0.22)',
//             ]}
//             start={{ x: 0, y: 0 }}
//             end={{ x: 1, y: 1 }}
//             style={[
//               styles.dropdownGradient,
//               errors.category && styles.inputErrorBorder,
//             ]}
//           >
//             <TouchableOpacity
//               style={styles.dropdownTrigger}
//               activeOpacity={0.8}
//               onPress={() => {
//                 Keyboard.dismiss();
//                 setShowCategoryModal(true);
//               }}
//             >
//               <Text
//                 style={
//                   form.category
//                     ? styles.dropdownText
//                     : styles.dropdownPlaceholder
//                 }
//               >
//                 {form.category
//                   ? categoryOptions.find(o => o.value === form.category)?.label
//                   : 'Select operational class'}
//               </Text>

//               <ChevronDown size={18} color={ACCENT_TEAL} />
//             </TouchableOpacity>
//           </LinearGradient>

//           {errors.category && (
//             <View style={styles.errorRow}>
//               <AlertCircle size={12} color={ERROR_RED} />
//               <Text style={styles.errorText}>{errors.category}</Text>
//             </View>
//           )}

//           {form.category === 'others' && (
//             <TextInput
//               style={styles.textInput}
//               placeholder="Specify alternative category name"
//               placeholderTextColor={TEXT_MUTED}
//               value={otherCategory}
//               onChangeText={setOtherCategory}
//             />
//           )}

//           {/* Description Field */}
//           <View style={styles.labelRow}>
//             <Text style={styles.inputLabel}>Job Description *</Text>

//             <Text style={styles.charCounter}>
//               {form.description.length}/{MAX_DESCRIPTION_LENGTH}
//             </Text>
//           </View>

//           <LinearGradient
//             colors={[
//               'rgba(255, 255, 255, 0.41)',
//               'rgba(255,255,255,0.35)',
//               'rgba(255, 255, 255, 0.2)',
//               'rgba(255,255,255,0.10)',
//               'rgba(255, 255, 255, 0.22)',
//             ]}
//             start={{ x: 0, y: 0 }}
//             end={{ x: 1, y: 1 }}
//             style={[
//               styles.textAreaGradient,
//               errors.description && styles.inputErrorBorder,
//             ]}
//           >
//             <TextInput
//               style={styles.textAreaInput}
//               multiline
//               numberOfLines={4}
//               maxLength={MAX_DESCRIPTION_LENGTH}
//               placeholder="Describe tasks, emergency protocols, and deployment rules..."
//               placeholderTextColor={TEXT_MUTED}
//               value={form.description}
//               onChangeText={val =>
//                 setForm(prev => ({ ...prev, description: val }))
//               }
//             />
//           </LinearGradient>

//           {errors.description && (
//             <View style={styles.errorRow}>
//               <AlertCircle size={12} color={ERROR_RED} />
//               <Text style={styles.errorText}>{errors.description}</Text>
//             </View>
//           )}

//           {/* Location Card */}
//           {/* <View style={styles.sectionCard}>
//             <Text style={styles.sectionTitle}>
//               Job Location <Text style={styles.requiredIndicator}>*</Text>
//             </Text>
//             {mapReady && !mapError ? (
//               <MapView
//                 ref={mapRef}
//                 style={styles.map}
//                 initialRegion={{
//                   latitude: form.lat,
//                   longitude: form.lng,
//                   latitudeDelta: 0.022,
//                   longitudeDelta: 0.012,
//                 }}
//                 showsUserLocation
//                 showsMyLocationButton
//               >
//                 {form.lat !== 0 && form.lng !== 0 && (
//                   <Marker
//                     coordinate={{ latitude: form.lat, longitude: form.lng }}
//                     title={form.location || 'Selected Location'}
//                     pinColor="#0A7C6E"
//                     draggable
//                     onDragEnd={e => {
//                       const { latitude, longitude } = e.nativeEvent.coordinate;
//                       setForm(prev => ({
//                         ...prev,
//                         lat: latitude,
//                         lng: longitude,
//                       }));
//                     }}
//                   />
//                 )}
//               </MapView>
//             ) : (
//               <View style={styles.mapPlaceholder}>
//                 {mapError ? (
//                   <Text
//                     style={{
//                       color: '#ef4444',
//                       fontSize: 14,
//                       textAlign: 'center',
//                     }}
//                   >
//                     Map failed to load
//                   </Text>
//                 ) : (
//                   <>
//                     <ActivityIndicator size="large" color="#0A7C6E" />
//                     <Text style={{ color: '#64748b', marginTop: 12 }}>
//                       Loading map...
//                     </Text>
//                   </>
//                 )}
//               </View>
//             )}

//             <View style={styles.inputWrapper}>
//               <Search size={20} color="#64748b" style={styles.inputIcon} />
//               <TextInput
//                 style={styles.input}
//                 placeholder="Search address or place..."
//                 placeholderTextColor="#9CA3AF"
//                 value={form.location || autocompleteQuery}
//                 onChangeText={text => {
//                   setAutocompleteQuery(text);
//                   setForm(prev => ({ ...prev, location: text }));
//                   if (text.trim())
//                     setErrors(prev => ({ ...prev, location: undefined }));
//                 }}
//                 autoCorrect={false}
//                 autoCapitalize="none"
//               />
//               {form.location || autocompleteQuery ? (
//                 <TouchableOpacity
//                   onPress={() => {
//                     setAutocompleteQuery('');
//                     setSuggestions([]);
//                     setForm(prev => ({ ...prev, location: '' }));
//                   }}
//                   style={styles.clearButton}
//                 >
//                   <Text style={styles.clearText}>✕</Text>
//                 </TouchableOpacity>
//               ) : null}
//             </View>

//             {loadingSuggestions && (
//               <ActivityIndicator color="#0A7C6E" style={{ marginTop: 12 }} />
//             )}
//             {suggestions.slice(0, 5).map(item => (
//               <TouchableOpacity
//                 key={item.place_id}
//                 style={styles.suggestionItem}
//                 onPress={() => selectSuggestion(item)}
//               >
//                 <MapPin size={18} color="#64748b" style={{ marginRight: 12 }} />
//                 <Text style={styles.suggestionText} numberOfLines={1}>
//                   {item.description}
//                 </Text>
//               </TouchableOpacity>
//             ))}
//             {errors.location && (
//               <Text style={styles.errorText}>{errors.location}</Text>
//             )}
//           </View> */}

//           {/* Schedule Card */}
//           <View style={styles.sectionCard}>
//             <Text style={styles.sectionTitle}>
//               Schedule <Text style={styles.requiredIndicator}>*</Text>
//             </Text>

//             {/* Top-level tabs: Single Day | Multiple Days */}
//             <View style={styles.modeRow}>
//               {[
//                 { mode: 'single' as ScheduleMode, label: 'Single Day' },
//                 { mode: 'range' as ScheduleMode, label: 'Multiple Days' },
//               ].map(({ mode, label }) => (
//                 <TouchableOpacity
//                   key={mode}
//                   style={[
//                     styles.modeTab,
//                     scheduleMode === mode && styles.modeTabActive,
//                   ]}
//                   onPress={() => setScheduleMode(mode)}
//                 >
//                   <Text
//                     style={[
//                       styles.modeTabText,
//                       scheduleMode === mode && styles.modeTabTextActive,
//                     ]}
//                   >
//                     {label}
//                   </Text>
//                 </TouchableOpacity>
//               ))}
//             </View>

//             {scheduleMode === 'single'
//               ? renderSingleDay()
//               : renderMultipleDays()}

//             <View style={styles.durationBadge}>
//               <Text style={styles.durationBadgeText}>
//                 Total man-hours: {totalManHours.toFixed(1)}h
//               </Text>
//             </View>
//             {errors.schedule && (
//               <Text style={[styles.errorText, { marginTop: 8 }]}>
//                 {errors.schedule}
//               </Text>
//             )}
//           </View>

//           {/* Job Type */}
//           <View style={styles.sectionCard}>
//             <Text style={styles.sectionTitle}>
//               Job Type <Text style={styles.requiredIndicator}>*</Text>
//             </Text>
//             <TouchableOpacity
//               style={styles.dropdownButton}
//               onPress={() => setShowCategoryModal(true)}
//             >
//               <Text style={styles.dropdownButtonText}>
//                 {form.category
//                   ? categoryOptions.find(c => c.value === form.category)
//                       ?.label || 'Others'
//                   : 'Select job category'}
//               </Text>
//               <ChevronDown size={20} color="#64748b" />
//             </TouchableOpacity>
//             {form.category === 'others' && (
//               <TextInput
//                 style={styles.otherInput}
//                 placeholder="Enter custom job category"
//                 value={otherCategory}
//                 onChangeText={setOtherCategory}
//               />
//             )}
//             {errors.category && (
//               <Text style={styles.errorText}>{errors.category}</Text>
//             )}
//           </View>

//           {/* Required Documents - Toggle Style */}
//           <View style={styles.sectionCard}>
//             <Text style={styles.sectionTitle}>Required Documents</Text>

//             <View style={styles.toggleContainer}>
//               {/* Security License */}
//               <View style={styles.toggleRow}>
//                 <Text style={styles.toggleLabel}>Security License</Text>
//                 <TouchableOpacity
//                   style={[
//                     styles.toggleSwitch,
//                     form.documents.includes('security_license') &&
//                       styles.toggleSwitchActive,
//                   ]}
//                   onPress={() => toggleDocument('security_license')}
//                 >
//                   <Text
//                     style={[
//                       styles.toggleText,
//                       form.documents.includes('security_license') &&
//                         styles.toggleTextActive,
//                     ]}
//                   >
//                     {form.documents.includes('security_license') ? 'YES' : 'NO'}
//                   </Text>
//                 </TouchableOpacity>
//               </View>

//               {/* Working with Children */}
//               <View style={styles.toggleRow}>
//                 <Text style={styles.toggleLabel}>Working with Children</Text>
//                 <TouchableOpacity
//                   style={[
//                     styles.toggleSwitch,
//                     form.documents.includes('working_with_children') &&
//                       styles.toggleSwitchActive,
//                   ]}
//                   onPress={() => toggleDocument('working_with_children')}
//                 >
//                   <Text
//                     style={[
//                       styles.toggleText,
//                       form.documents.includes('working_with_children') &&
//                         styles.toggleTextActive,
//                     ]}
//                   >
//                     {form.documents.includes('working_with_children')
//                       ? 'YES'
//                       : 'NO'}
//                   </Text>
//                 </TouchableOpacity>
//               </View>

//               {/* White Card */}
//               <View style={styles.toggleRow}>
//                 <Text style={styles.toggleLabel}>White Card</Text>
//                 <TouchableOpacity
//                   style={[
//                     styles.toggleSwitch,
//                     form.documents.includes('white_card') &&
//                       styles.toggleSwitchActive,
//                   ]}
//                   onPress={() => toggleDocument('white_card')}
//                 >
//                   <Text
//                     style={[
//                       styles.toggleText,
//                       form.documents.includes('white_card') &&
//                         styles.toggleTextActive,
//                     ]}
//                   >
//                     {form.documents.includes('white_card') ? 'YES' : 'NO'}
//                   </Text>
//                 </TouchableOpacity>
//               </View>
//             </View>
//           </View>

//           {/* Job Description */}
//           <View style={styles.sectionCard}>
//             <Text style={styles.sectionTitle}>
//               Job Description <Text style={styles.requiredIndicator}>*</Text>
//             </Text>
//             <TextInput
//               style={styles.textarea}
//               multiline
//               numberOfLines={6}
//               placeholder="Describe the responsibilities, requirements, dress code, special instructions..."
//               placeholderTextColor="#9CA3AF"
//               value={form.description}
//               onChangeText={text => {
//                 if (text.length <= MAX_DESCRIPTION_LENGTH) {
//                   setForm(prev => ({ ...prev, description: text }));
//                   if (text.trim())
//                     setErrors(prev => ({ ...prev, description: undefined }));
//                 }
//               }}
//               textAlignVertical="top"
//               maxLength={MAX_DESCRIPTION_LENGTH}
//             />
//             <Text style={styles.characterCount}>
//               {form.description.length}/{MAX_DESCRIPTION_LENGTH}
//             </Text>
//             {errors.description && (
//               <Text style={styles.errorText}>{errors.description}</Text>
//             )}
//           </View>

//           <View style={{ height: 100 }} />
//         </ScrollView>

//         <TouchableOpacity style={styles.fab} onPress={validateAndNext}>
//           <Text style={styles.fabText}>Next</Text>
//           <ArrowRight size={20} color="#fff" style={{ marginLeft: 8 }} />
//         </TouchableOpacity>
//       </KeyboardAvoidingView>

//       {/* ── Category Modal ── */}
//       <Modal
//         visible={showCategoryModal}
//         transparent
//         animationType="fade"
//         onRequestClose={() => setShowCategoryModal(false)}
//       >
//         <TouchableOpacity
//           style={styles.modalOverlay}
//           activeOpacity={1}
//           onPress={() => setShowCategoryModal(false)}
//         >
//           <View
//             style={styles.modalContainer}
//             onStartShouldSetResponder={() => true}
//           >
//             <Text style={styles.modalTitle}>Select Job Type</Text>
//             {categoryOptions.map(item => (
//               <TouchableOpacity
//                 key={item.value}
//                 style={styles.checkboxRow}
//                 onPress={() => {
//                   setForm(prev => ({ ...prev, category: item.value }));
//                   if (item.value !== 'others') setOtherCategory('');
//                   setShowCategoryModal(false);
//                   setErrors(prev => ({ ...prev, category: undefined }));
//                 }}
//               >
//                 <View
//                   style={[
//                     styles.checkbox,
//                     form.category === item.value && styles.checkboxSelected,
//                   ]}
//                 >
//                   {form.category === item.value && (
//                     <Check size={14} color="#fff" />
//                   )}
//                 </View>
//                 <Text style={styles.checkboxLabel}>{item.label}</Text>
//               </TouchableOpacity>
//             ))}
//             <TouchableOpacity
//               style={styles.modalCloseButton}
//               onPress={() => setShowCategoryModal(false)}
//             >
//               <Text style={styles.modalCloseText}>DONE</Text>
//             </TouchableOpacity>
//           </View>
//         </TouchableOpacity>
//       </Modal>

//       {/* ── Documents Modal ── */}
//       <Modal
//         visible={showDocModal}
//         animationType="slide"
//         transparent
//         onRequestClose={() => setShowDocModal(false)}
//       >
//         <KeyboardAvoidingView
//           behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
//           style={{ flex: 1 }}
//         >
//           <View style={styles.modalOverlay}>
//             <View style={styles.modalContainer}>
//               <Text style={styles.modalTitle}>Required Documents</Text>
//               <ScrollView keyboardShouldPersistTaps="handled">
//                 {documentOptions.map(item => {
//                   const isSelected = form.documents.includes(item.value);
//                   return (
//                     <TouchableOpacity
//                       key={item.value}
//                       style={styles.checkboxRow}
//                       onPress={() => {
//                         let updated = [...form.documents];
//                         if (updated.includes(item.value)) {
//                           updated = updated.filter(d => d !== item.value);
//                           if (item.value === 'others') setOtherDocument('');
//                         } else {
//                           updated.push(item.value);
//                         }
//                         setForm({ ...form, documents: updated });
//                       }}
//                     >
//                       <View
//                         style={[
//                           styles.checkbox,
//                           isSelected && styles.checkboxSelected,
//                         ]}
//                       >
//                         {isSelected && <Check size={14} color="#fff" />}
//                       </View>
//                       <Text style={styles.checkboxLabel}>{item.label}</Text>
//                     </TouchableOpacity>
//                   );
//                 })}
//                 {form.documents.includes('others') && (
//                   <TextInput
//                     placeholder="Enter document name"
//                     placeholderTextColor="#9CA3AF"
//                     value={otherDocument}
//                     onChangeText={setOtherDocument}
//                     style={{
//                       borderWidth: 1,
//                       borderColor: '#ccc',
//                       borderRadius: 8,
//                       padding: 10,
//                       marginTop: 10,
//                     }}
//                   />
//                 )}
//               </ScrollView>
//               <TouchableOpacity
//                 style={styles.modalCloseButton}
//                 onPress={() => {
//                   Keyboard.dismiss();
//                   setShowDocModal(false);
//                 }}
//               >
//                 <Text style={styles.modalCloseText}>Done</Text>
//               </TouchableOpacity>
//             </View>
//           </View>
//         </KeyboardAvoidingView>
//       </Modal>

//       {/* ── Time Picker Modal ── */}
//       {pickerVisible && (
//         <Modal
//           visible
//           transparent
//           animationType="fade"
//           onRequestClose={() => setPickerVisible(false)}
//         >
//           <View style={styles.modalOverlay}>
//             <View style={styles.modalContainer}>
//               <Text style={styles.modalTitle}>
//                 {pickerTarget?.field === 'startTime'
//                   ? 'Start Time'
//                   : 'End Time'}
//               </Text>
//               <DateTimePicker
//                 value={pickerValue}
//                 mode="time"
//                 is24Hour
//                 display={Platform.OS === 'ios' ? 'spinner' : 'default'}
//                 onChange={onTimePickerChange}
//               />
//               {Platform.OS === 'ios' && (
//                 <TouchableOpacity
//                   style={styles.modalCloseButton}
//                   onPress={() => {
//                     applyTimeChange(pickerValue);
//                     setPickerVisible(false);
//                   }}
//                 >
//                   <Text style={styles.modalCloseText}>Done</Text>
//                 </TouchableOpacity>
//               )}
//             </View>
//           </View>
//         </Modal>
//       )}

//       {/* ── Calendar Modal ── */}
//       <Modal
//         visible={calendarVisible}
//         transparent
//         animationType="fade"
//         onRequestClose={() => setCalendarVisible(false)}
//       >
//         <TouchableOpacity
//           style={styles.modalOverlay}
//           activeOpacity={1}
//           onPress={() => setCalendarVisible(false)}
//         >
//           <View
//             style={[styles.modalContainer, { maxHeight: '85%' }]}
//             onStartShouldSetResponder={() => true}
//           >
//             <Text style={styles.modalTitle}>
//               {calendarTarget === 'single'
//                 ? 'Select Date'
//                 : calendarTarget === 'rangeFrom'
//                 ? 'Select Start Date'
//                 : calendarTarget === 'rangeTo'
//                 ? 'Select End Date'
//                 : 'Select Multiple Dates'}
//             </Text>

//             {/* Navigation */}
//             <View style={styles.calNavRow}>
//               <TouchableOpacity
//                 onPress={() =>
//                   setCalendarMonth(
//                     prev =>
//                       new Date(prev.getFullYear(), prev.getMonth() - 1, 1),
//                   )
//                 }
//               >
//                 <Text style={styles.calNavBtn}>‹</Text>
//               </TouchableOpacity>

//               <Text style={styles.calMonthLabel}>
//                 {calendarMonth.toLocaleString('default', {
//                   month: 'long',
//                   year: 'numeric',
//                 })}
//               </Text>

//               <TouchableOpacity
//                 onPress={() =>
//                   setCalendarMonth(
//                     prev =>
//                       new Date(prev.getFullYear(), prev.getMonth() + 1, 1),
//                   )
//                 }
//               >
//                 <Text style={styles.calNavBtn}>›</Text>
//               </TouchableOpacity>
//             </View>

//             {/* Week Days */}
//             <View style={styles.calWeekRow}>
//               {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
//                 <Text key={d} style={styles.calWeekDay}>
//                   {d}
//                 </Text>
//               ))}
//             </View>

//             {/* Calendar Grid */}
//             <View style={styles.calGrid}>
//               {calendarDays.map((d, i) => {
//                 if (!d)
//                   return <View key={`empty-${i}`} style={styles.calCell} />;

//                 const selected = isDaySelected(d);
//                 const inRange = isDayInRange(d);
//                 const isPast = d < new Date(new Date().setHours(0, 0, 0, 0));

//                 return (
//                   <TouchableOpacity
//                     key={d.toISOString()}
//                     style={[
//                       styles.calCell,
//                       selected && styles.calCellSelected,
//                       inRange && styles.calCellInRange,
//                       isToday(d) && !selected && styles.calCellToday,
//                       isPast && styles.calCellPast,
//                     ]}
//                     onPress={() => !isPast && onCalendarDayPress(d)}
//                     disabled={isPast}
//                   >
//                     <Text
//                       style={[
//                         styles.calCellText,
//                         selected && styles.calCellTextSelected,
//                         isPast && styles.calCellTextPast,
//                       ]}
//                     >
//                       {d.getDate()}
//                     </Text>
//                   </TouchableOpacity>
//                 );
//               })}
//             </View>

//             {/* Done Button */}
//             <TouchableOpacity
//               style={[styles.modalCloseButton, { marginTop: 20 }]}
//               onPress={() => setCalendarVisible(false)}
//             >
//               <Text style={styles.modalCloseText}>DONE</Text>
//             </TouchableOpacity>
//           </View>
//         </TouchableOpacity>
//       </Modal>
//     </SafeAreaView>
//   );
// }

// // ─── Styles ───────────────────────────────────────────────────────────────────
// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: BRAND_BG,
//   },
//   scrollContainer: {
//     paddingBottom: 40,
//   },
//   header: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     paddingHorizontal: 20,
//     paddingVertical: 14,
//     backgroundColor: '#0A7C6E',
//     marginHorizontal: 16,
//     borderRadius: 16,
//   },
//   scrollContent: { padding: 16, paddingBottom: 5 },
//   sectionCard: {
//     backgroundColor: 'white',
//     borderRadius: 20,
//     padding: 16,
//     marginBottom: 9,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 4 },
//     shadowOpacity: 0.12,
//     shadowRadius: 20,
//     elevation: 10,
//     borderWidth: 1,
//     borderColor: '#bdc8d7',
//   },
//   sectionTitle: {
//     fontSize: 15,
//     fontWeight: '700',
//     color: BRAND,
//     marginBottom: 10,
//   },
//   requiredIndicator: {
//     color: '#ef4444',
//     fontSize: 16,
//     fontWeight: '700',
//   },
//   characterCount: {
//     textAlign: 'right',
//     fontSize: 12,
//     color: '#64748b',
//     marginTop: 6,
//   },
//   subtitle: { color: '#64748b', fontSize: 13, marginBottom: 12 },
//   map: { height: 150, borderRadius: 20, marginBottom: 8 },
//   mapPlaceholder: {
//     height: 180,
//     backgroundColor: '#e2e8f0',
//     borderRadius: 12,
//     justifyContent: 'center',
//     alignItems: 'center',
//     marginBottom: 12,
//   },
//   headerSubtitle: {
//     fontSize: 13,
//     color: TEXT_MUTED,
//     marginTop: 4,
//   },
//   inputWrapper: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     backgroundColor: '#f8fafc',
//     borderRadius: 12,
//     paddingHorizontal: 12,
//     borderWidth: 1.5,
//     borderColor: '#e2e8f0',
//     minHeight: 40,
//   },
//   inputIcon: { marginRight: 8 },
//   input: { flex: 1, fontSize: 15, paddingVertical: 10, color: '#111827' },
//   clearButton: { padding: 6, marginLeft: 6 },
//   clearText: { fontSize: 16, color: '#64748b', fontWeight: '600' },

//   modeRow: {
//     flexDirection: 'row',
//     backgroundColor: '#f1f5f9',
//     borderRadius: 10,
//     padding: 3,
//     marginBottom: 16,
//     gap: 2,
//   },
//   toggleContainer: {
//     // marginTop: 8,
//     gap: 8,
//   },
//   inputLabel: {
//     fontSize: 14,
//     fontWeight: '600',
//     color: '#FFFFFF',
//     marginTop: 10,
//     marginBottom: 2,
//   },
//   labelRow: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     marginTop: 18,
//     marginBottom: 8,
//   },
//   charCounter: {
//     fontSize: 12,
//     color: TEXT_MUTED,
//   },
//   inputErrorBorder: {
//     borderColor: ERROR_RED,
//   },
//   toggleRow: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'space-between',
//     backgroundColor: '#f8fafc',
//     padding: 10,
//     borderRadius: 10,
//     borderWidth: 1,
//     borderColor: '#e2e8f0',
//   },
//   toggleLabel: {
//     fontSize: 15,
//     color: '#334155',
//     fontWeight: '500',
//   },

//   toggleSwitch: {
//     paddingHorizontal: 20,
//     paddingVertical: 6,
//     borderRadius: 20,
//     backgroundColor: '#e2e8f0',
//     minWidth: 70,
//     alignItems: 'center',
//   },
//   toggleSwitchActive: {
//     backgroundColor: '#0A7C6E',
//   },
//   dropdownTrigger: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'space-between',
//     paddingHorizontal: 16,
//     paddingVertical: 16,
//     backgroundColor: 'transparent',
//   },
//   dropdownText: {
//     fontSize: 14,
//     color: '#FFFFFF',
//     fontWeight: '500',
//   },
//   dropdownPlaceholder: {
//     fontSize: 14,
//     color: TEXT_MUTED,
//   },
//   toggleText: {
//     fontSize: 13,
//     fontWeight: '600',
//     color: '#64748b',
//   },
//   toggleTextActive: {
//     color: '#fff',
//   },
//   modeTab: {
//     flex: 1,
//     paddingVertical: 8,
//     borderRadius: 8,
//     alignItems: 'center',
//   },
//   modeTabActive: {
//     backgroundColor: '#fff',
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 1 },
//     shadowOpacity: 0.1,
//     shadowRadius: 3,
//     elevation: 2,
//   },
//   errorRow: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 6,
//     marginTop: 6,
//   },
//   modeTabText: { fontSize: 13, color: '#64748b', fontWeight: '500' },
//   modeTabTextActive: { color: '#0A7C6E', fontWeight: '700' },
//   dateSelectBtn: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 8,
//     backgroundColor: '#f0fbff',
//     paddingVertical: 10,
//     paddingHorizontal: 14,
//     borderRadius: 10,
//     borderWidth: 1,
//     borderColor: '#bae6fd',
//     marginBottom: 12,
//   },
//   dateSelectTxt: { flex: 1, fontSize: 14, color: '#0369a1', fontWeight: '600' },
//   rangePickerRow: {
//     flexDirection: 'row',
//     alignItems: 'flex-end',
//     gap: 10,
//     marginBottom: 8,
//   },
//   rangeArrowTxt: { color: '#0A7C6E', fontSize: 18, paddingBottom: 10 },
//   timeLabel: {
//     fontSize: 11,
//     fontWeight: '700',
//     color: '#64748b',
//     marginBottom: 6,
//     textTransform: 'uppercase',
//     letterSpacing: 0.5,
//   },
//   timeButton: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 8,
//     backgroundColor: '#f8fafc',
//     paddingVertical: 10,
//     paddingHorizontal: 12,
//     borderRadius: 10,
//     borderWidth: 1,
//     borderColor: '#e2e8f0',
//   },
//   timeButtonText: { fontSize: 14, color: '#111827', fontWeight: '500' },
//   multiSummary: { fontSize: 13, color: '#64748b', marginBottom: 10 },
//   masterSettingsBox: {
//     backgroundColor: '#f8fafc',
//     padding: 14,
//     borderRadius: 12,
//     borderWidth: 1,
//     borderColor: '#e2e8f0',
//     marginBottom: 16,
//   },
//   sameTimeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
//   sameTimeTxt: { fontSize: 13, color: '#374151', fontWeight: '500' },
//   shiftHeaderRow: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     paddingBottom: 6,
//     marginBottom: 2,
//     borderBottomWidth: 1,
//     borderBottomColor: '#f1f5f9',
//   },
//   shiftHeaderTxt: {
//     fontSize: 10,
//     fontWeight: '700',
//     color: '#94a3b8',
//     textTransform: 'uppercase',
//     marginLeft: 6,
//   },
//   calCellToday: {
//     backgroundColor: '#f0f9ff',
//     borderWidth: 1,
//     borderColor: '#bae6fd',
//   },
//   shiftHeaderText: {
//     fontSize: 10,
//     fontWeight: '700',
//     color: '#94a3b8',
//     textTransform: 'uppercase',
//     marginLeft: 10,
//   },
//   shiftRow: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     paddingVertical: 6,
//     gap: 4,
//   },
//   shiftDateCol: { width: 44, alignItems: 'center', justifyContent: 'center' },
//   shiftDateDay: {
//     fontSize: 16,
//     fontWeight: '800',
//     color: '#1e293b',
//     lineHeight: 18,
//   },
//   shiftDateMonth: {
//     fontSize: 10,
//     color: '#64748b',
//     fontWeight: '600',
//     textTransform: 'uppercase',
//   },
//   shiftContinueLine: {
//     width: 1,
//     height: 32,
//     backgroundColor: '#e2e8f0',
//     alignSelf: 'center',
//   },
//   shiftMiddle: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4 },
//   shiftTimeBtn: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 4,
//     backgroundColor: '#fff',
//     paddingVertical: 7,
//     paddingHorizontal: 8,
//     borderRadius: 8,
//     borderWidth: 1,
//     borderColor: '#e2e8f0',
//   },
//   shiftTimeTxt: { fontSize: 13, color: '#111827', fontWeight: '600' },
//   shiftTimeSep: { fontSize: 14, color: '#94a3b8' },
//   shiftGuardsCol: {
//     width: 56,
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 2,
//   },
//   guardsX: { fontSize: 14, color: '#64748b', fontWeight: '700' },
//   guardsSmallInput: {
//     width: 38,
//     textAlign: 'center',
//     fontSize: 16,
//     fontWeight: 'bold',
//     borderWidth: 1,
//     borderColor: '#cbd5e1',
//     borderRadius: 8,
//     paddingVertical: 5,
//     color: '#111827',
//   },
//   textAreaGradient: {
//     borderRadius: 16,
//     overflow: 'hidden',
//     marginTop: 3,
//   },
//   shiftDeleteBtn: { width: 28, alignItems: 'center', justifyContent: 'center' },
//   addShiftBtn: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 5,
//     alignSelf: 'flex-start',
//     marginTop: 6,
//     marginBottom: 4,
//     backgroundColor: '#f0fbff',
//     paddingVertical: 6,
//     paddingHorizontal: 12,
//     borderRadius: 20,
//     borderWidth: 1,
//     borderColor: '#bae6fd',
//   },
//   headerSection: {
//     backgroundColor: CARD_BG,
//     paddingVertical: 24,
//     paddingHorizontal: 16,
//     borderBottomWidth: 1,
//     borderColor: 'rgba(255,255,255,0.05)',
//   },
//   headerTitle: {
//     fontSize: 24,
//     fontWeight: '700',
//     color: '#FFFFFF',
//     letterSpacing: 0.3,
//   },
//   addShiftTxt: { color: '#0A7C6E', fontSize: 13, fontWeight: '600' },
//   dayDivider: {
//     height: 1,
//     backgroundColor: '#f1f5f9',
//     marginVertical: 8,
//     marginLeft: 44,
//   },
//   durationBadge: {
//     alignSelf: 'center',
//     backgroundColor: '#e0f5fd',
//     paddingHorizontal: 16,
//     paddingVertical: 6,
//     borderRadius: 20,
//     marginTop: 14,
//   },
//   durationBadgeText: { color: '#0A7C6E', fontWeight: '700', fontSize: 14 },
//   dropdownButton: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     backgroundColor: '#f8fafc',
//     padding: 14,
//     borderRadius: 12,
//     borderWidth: 1,
//     borderColor: '#e2e8f0',
//   },
//   dropdownButtonText: { fontSize: 15, color: '#111827', flex: 1 },
//   otherInput: {
//     marginTop: 12,
//     borderWidth: 1,
//     borderColor: '#e2e8f0',
//     borderRadius: 12,
//     padding: 14,
//     fontSize: 16,
//   },
//   textarea: {
//     minHeight: 120,
//     backgroundColor: '#f8fafc',
//     borderRadius: 12,
//     padding: 12,
//     fontSize: 15,
//     borderWidth: 1,
//     borderColor: '#e2e8f0',
//     textAlignVertical: 'top',
//   },
//   uploadButton: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'center',
//     borderWidth: 1.5,
//     borderColor: '#0A7C6E',
//     borderRadius: 12,
//     paddingVertical: 14,
//     gap: 10,
//   },
//   uploadText: { color: '#0A7C6E', fontSize: 16, fontWeight: '600' },
//   fileList: { marginTop: 12, gap: 8 },
//   fileItem: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     backgroundColor: '#f8fafc',
//     padding: 12,
//     borderRadius: 10,
//     borderWidth: 1,
//     borderColor: '#e2e8f0',
//   },
//   fileName: { flex: 1, marginLeft: 10, fontSize: 14 },
//   fab: {
//     position: 'absolute',
//     bottom: 32,
//     right: 24,
//     flexDirection: 'row',
//     alignItems: 'center',
//     backgroundColor: '#0A7C6E',
//     paddingVertical: 14,
//     paddingHorizontal: 15,
//     borderRadius: 50,
//     elevation: 8,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 4 },
//     shadowOpacity: 0.3,
//     shadowRadius: 8,
//   },
//   fabText: { color: 'white', fontSize: 17, fontWeight: 'bold' },

//   modalOverlay: {
//     flex: 1,
//     backgroundColor: 'rgba(0,0,0,0.5)',
//     justifyContent: 'center',
//     paddingHorizontal: 20,
//   },
//   modalContainer: {
//     backgroundColor: 'white',
//     borderRadius: 16,
//     padding: 18,
//     maxHeight: '80%',
//   },
//   modalTitle: { fontSize: 20, fontWeight: '600', marginBottom: 15 },
//   modalCloseButton: {
//     marginTop: 12,
//     backgroundColor: '#0A7C6E',
//     paddingVertical: 18,
//     borderRadius: 5,
//     alignItems: 'center',
//   },
//   screenTitle: {
//     fontSize: 18,
//     fontWeight: '600',
//     color: '#fff',
//   },
//   modalCloseText: { color: '#fff', fontWeight: '600', fontSize: 16 },
//   checkboxRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
//   checkbox: {
//     width: 22,
//     height: 22,
//     borderRadius: 6,
//     borderWidth: 1.5,
//     borderColor: '#0A7C6E',
//     justifyContent: 'center',
//     alignItems: 'center',
//     marginRight: 10,
//   },
//   checkboxSelected: { backgroundColor: '#0A7C6E' },
//   checkboxLabel: { fontSize: 15, color: '#1e293b' },
//   calNavRow: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'space-between',
//     marginBottom: 18,
//   },
//   calNavBtn: { fontSize: 24, color: '#0A7C6E', paddingHorizontal: 8 },
//   calMonthLabel: { fontSize: 16, fontWeight: '600', color: '#111827' },
//   calWeekRow: { flexDirection: 'row', marginBottom: 4 },
//   calWeekDay: {
//     flex: 1,
//     textAlign: 'center',
//     fontSize: 12,
//     color: '#64748b',
//     fontWeight: '600',
//   },
//   calGrid: { flexDirection: 'row', flexWrap: 'wrap' },
//   calCell: {
//     width: `${100 / 7}%`,
//     aspectRatio: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//     borderRadius: 8,
//     height: 10,
//   },
//   dropdownGradient: {
//     borderRadius: 16,
//     overflow: 'hidden',
//     marginTop: 5,
//   },
//   calCellSelected: { backgroundColor: '#0A7C6E' },
//   calCellInRange: { backgroundColor: '#bae8f8' },
//   calCellPast: { opacity: 0.3 },
//   calCellText: { fontSize: 14, color: '#111827' },
//   calCellTextSelected: { color: '#fff', fontWeight: '700' },
//   calCellTextPast: { color: '#94a3b8' },
//   errorText: { color: '#ef4444', fontSize: 13, marginTop: 6, marginLeft: 4 },
//   nextDayBadge: {
//     fontSize: 10,
//     color: '#f59e0b',
//     fontWeight: '600',
//     marginLeft: 6,
//     backgroundColor: '#fef3c7',
//     paddingHorizontal: 5,
//     paddingVertical: 1,
//     borderRadius: 4,
//   },
//   headerRow: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'space-between',
//     paddingHorizontal: 16,
//     // paddingVertical: 12,
//   },

//   backBtn: {
//     width: 40,
//     height: 40,
//     borderRadius: 20,
//     alignItems: 'center',
//     justifyContent: 'center',
//     backgroundColor: 'rgba(255,255,255,0.15)',
//   },
//   textInput: {
//     height: 50,
//     backgroundColor: CARD_BG,
//     borderRadius: 12,
//     borderWidth: 1,
//     borderColor: 'rgba(255,255,255,0.1)',
//     color: '#FFFFFF',
//     paddingHorizontal: 16,
//     fontSize: 14,
//     marginTop: 10,
//   },
//   textAreaInput: {
//     padding: 14,
//     minHeight: 110,
//     textAlignVertical: 'top',
//     backgroundColor: 'transparent',
//     color: '#ffff',
//   },
//   searchBarContainer: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     paddingHorizontal: 12,
//     paddingVertical: 14,
//     backgroundColor: 'transparent',
//   },
//   : {
//     borderRadius: 16,
//     overflow: 'hidden',
//     marginTop: 8,
//   },
//   searchIcon: {
//     marginRight: 10,
//   },
//   searchBarInput: {
//     flex: 1,
//     color: '#FFFFFF',
//     fontSize: 14,
//     height: '100%',
//   },
//   scheduleGradientCard: {
//     borderRadius: 18,
//     overflow: 'hidden',
//     marginTop: 12,
//   },
//   suggestionsContainer: {
//     backgroundColor: CARD_BG,
//     borderRadius: 12,
//     marginTop: 6,
//     borderWidth: 1,
//     borderColor: 'rgba(255,255,255,0.1)',
//     overflow: 'hidden',
//   },
//   suggestionItem: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     padding: 14,
//     borderBottomWidth: 1,
//     borderColor: 'rgba(255,255,255,0.05)',
//     gap: 10,
//   },
//   suggestionText: {
//     color: '#FFFFFF',
//     fontSize: 13,
//     flex: 1,
//   },
//   mapCardFrame: {
//     height: 160,
//     borderRadius: 14,
//     overflow: 'hidden',
//     marginTop: 12,
//     borderWidth: 1,
//     borderColor: 'rgba(255,255,255,0.1)',
//   },
//   mapInstance: {
//     ...StyleSheet.absoluteFillObject,
//   },
// });

import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  Alert,
  ActivityIndicator,
  PermissionsAndroid,
  SafeAreaView,
  Modal,
  StatusBar,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import DateTimePicker from '@react-native-community/datetimepicker';
import MapView, { Marker } from 'react-native-maps';
import type { RootStackParamList } from '../navigation/types';
import {
  pick,
  types,
  DocumentPickerResponse,
} from '@react-native-documents/picker';
import ImageResizer from 'react-native-image-resizer';
import { uploadFile } from '../services/authApi';
import Toast from 'react-native-toast-message';
import { isCancel } from 'axios';

import {
  Search,
  MapPin,
  Calendar,
  Clock,
  ChevronDown,
  CloudUpload,
  FileCheck,
  ArrowRight,
  Check,
  ChevronLeft,
  Plus,
  Trash2,
  ArrowLeft,
  AlertCircle,
  ChevronRight,
} from 'lucide-react-native';
import { Keyboard } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

const { width } = Dimensions.get('window');

// ─── Default location: Sydney, Australia ────────────────────────────────────
const DEFAULT_LOCATION = {
  lat: -33.8688,
  lng: 151.2093,
  label: 'Sydney, NSW, Australia',
};

// ─── Color Palette Constants ──────────────────────────────────────────────────
const BRAND_BG = '#001F3F'; // Deep Navy Main Background
const CARD_BG = '#0A1F3D'; // Lighter Matte Navy Surface
const CHIP_DARK = '#1F2A44'; // High-contrast Input Field/Block Element
const ACCENT_TEAL = '#5CE1D6'; // Cyber Teal Primary Branding Accent
const TEXT_MUTED = '#94A3B8'; // Cool Slate Secondary Text
const ERROR_RED = '#EF4444'; // Accessible System Error Tint

// ─── Constants ───────────────────────────────────────────────────────────────
const MAX_DESCRIPTION_LENGTH = 500;

// ─── Types ───────────────────────────────────────────────────────────────────
type ScheduleMode = 'single' | 'range';
type MultiDayMode = 'individual' | 'range';

interface Shift {
  id: string;
  startTime: Date;
  endTime: Date;
  guardsCount: string;
}

interface DaySchedule {
  date: Date;
  shifts: Shift[];
}

interface JobFormData {
  category: string;
  documents: string[];
  location: string;
  lat: number;
  lng: number;
  description: string;
}

interface FormErrors {
  category?: string;
  description?: string;
  location?: string;
  schedule?: string;
}

interface PlacePrediction {
  place_id: string;
  description: string;
}

interface ImageAsset {
  uri?: string;
  fileName?: string;
  fileSize?: number;
  width?: number;
  height?: number;
  type?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const formatDate = (d: Date) =>
  d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });

const formatTime = (d: Date) =>
  d.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

const shiftDurationHours = (start: Date, end: Date): number => {
  let diff = end.getTime() - start.getTime();
  if (diff < 0) diff += 24 * 60 * 60 * 1000; // overnight
  return diff > 0 ? diff / (1000 * 60 * 60) : 0;
};

const datesBetween = (from: Date, to: Date): Date[] => {
  const dates: Date[] = [];
  const cur = new Date(from);
  cur.setHours(0, 0, 0, 0);
  const end = new Date(to);
  end.setHours(0, 0, 0, 0);
  while (cur <= end) {
    dates.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
};

// Better version - avoid mutating and timezone issues
const combineDateAndTimeSafe = (date: Date, timeSource: Date): Date => {
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();

  const combined = new Date(
    year,
    month,
    day,
    timeSource.getHours(),
    timeSource.getMinutes(),
    0,
    0,
  );
  return combined;
};

// ─── Guard auto-assignment based on TOTAL shift DURATION ─────────────────────
const autoAssignGuards = (startTime: Date, endTime?: Date): string => {
  if (endTime) {
    const hours = shiftDurationHours(startTime, endTime);
    if (hours <= 13) return '1';
    if (hours <= 22) return '2';
    return '3';
  }
  const hour = startTime.getHours();
  if (hour >= 0 && hour < 13) return '1';
  if (hour >= 13 && hour < 22) return '2';
  return '3';
};

const splitShift = (
  start: Date,
  end: Date,
): { startTime: Date; endTime: Date }[] => {
  const totalHours = shiftDurationHours(start, end);
  if (totalHours <= 13) {
    return [{ startTime: new Date(start), endTime: new Date(end) }];
  }

  const exactPresets: Record<number, number[]> = {
    22: [8, 8, 6],
    23: [8, 8, 7],
    24: [8, 8, 8],
  };

  const rounded = Math.round(totalHours);
  let chunks = exactPresets[rounded] || [];

  if (chunks.length === 0) {
    if (totalHours < 22) {
      const half = Math.ceil(totalHours / 2);
      chunks = [half, totalHours - half];
    } else {
      const num = Math.ceil(totalHours / 8);
      const base = Math.floor(totalHours / num);
      const rem = totalHours - base * num;
      chunks = Array.from({ length: num }, (_, i) =>
        i === num - 1 ? base + rem : base,
      );
    }
  }

  const result: { startTime: Date; endTime: Date }[] = [];
  let current = new Date(start);

  for (const hours of chunks) {
    const nextEnd = new Date(current.getTime() + hours * 3600 * 1000);
    result.push({ startTime: new Date(current), endTime: nextEnd });
    current = nextEnd;
  }
  return result;
};

const makeDefaultShift = (): Shift => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setHours(0, 0, 0, 0);
  return {
    id: Math.random().toString(36).slice(2),
    startTime: start,
    endTime: end,
    guardsCount: '1',
  };
};

const makeDaySchedule = (date: Date): DaySchedule => ({
  date,
  shifts: [makeDefaultShift()],
});

// ─── Main Component ───────────────────────────────────────────────────────────
export default function CreateJobScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  // ── Map ───────────────────────────────────────────────────────────────────
  const mapRef = useRef<MapView>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState(false);
  const GOOGLE_PLACES_KEY = 'AIzaSyCS-DB39Kk-Z25C5GWymVGshXIALbjXPGY';

  const [form, setForm] = useState<JobFormData>({
    category: '',
    documents: [],
    location: '',
    lat: DEFAULT_LOCATION.lat,
    lng: DEFAULT_LOCATION.lng,
    description: '',
  });

  const [autocompleteQuery, setAutocompleteQuery] = useState('');
  const [suggestions, setSuggestions] = useState<PlacePrediction[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  // ── Schedule ──────────────────────────────────────────────────────────────
  const [scheduleMode, setScheduleMode] = useState<ScheduleMode>('single');
  const [multiDayMode, setMultiDayMode] = useState<MultiDayMode>('individual');

  const [singleDaySchedule, setSingleDaySchedule] = useState<DaySchedule>(
    makeDaySchedule(new Date()),
  );

  const [rangeFrom, setRangeFrom] = useState<Date>(new Date());
  const [rangeTo, setRangeTo] = useState<Date>(new Date());
  const [rangeSchedules, setRangeSchedules] = useState<DaySchedule[]>(() =>
    datesBetween(new Date(), new Date()).map(makeDaySchedule),
  );

  const [individualDates, setIndividualDates] = useState<Date[]>([]);
  const [individualSchedules, setIndividualSchedules] = useState<DaySchedule[]>(
    [],
  );
  const isToday = (d: Date) => isSameDay(d, new Date());

  // Bulk apply
  const [masterStartTime, setMasterStartTime] = useState<Date | null>(null);
  const [masterEndTime, setMasterEndTime] = useState<Date | null>(null);
  const [masterGuards, setMasterGuards] = useState<string>('');
  const [applyToAll, setApplyToAll] = useState(false);

  // ── Time Picker ───────────────────────────────────────────────────────────
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerValue, setPickerValue] = useState<Date>(new Date());
  const [pickerTarget, setPickerTarget] = useState<{
    mode: 'single' | 'range' | 'master' | 'individual';
    dayIndex: number;
    shiftIndex: number;
    field: 'startTime' | 'endTime';
  } | null>(null);

  // ── Calendar Modal ────────────────────────────────────────────────────────
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [calendarTarget, setCalendarTarget] = useState<
    'single' | 'rangeFrom' | 'rangeTo' | 'individual'
  >('single');
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  // ── Modals ────────────────────────────────────────────────────────────────
  const [showDocModal, setShowDocModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [otherCategory, setOtherCategory] = useState('');
  const [otherDocument, setOtherDocument] = useState('');

  // ── Upload ────────────────────────────────────────────────────────────────
  const [uploading, setUploading] = useState(false);
  const [uploadedFilePaths, setUploadedFilePaths] = useState<string[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<
    (ImageAsset | DocumentPickerResponse)[]
  >([]);

  // ── Errors ────────────────────────────────────────────────────────────────
  const [errors, setErrors] = useState<FormErrors>({});

  // ── Options ───────────────────────────────────────────────────────────────
  const documentOptions = [
    { label: 'Security License', value: 'security_license' },
    { label: 'MISC Time License', value: 'misc_time_license' },
    { label: 'Working With Children', value: 'working_with_children' },
    { label: 'First Aid', value: 'first_aid' },
    { label: 'CPR', value: 'cpr' },
    { label: 'White Card', value: 'white_card' },
    { label: 'Traffic Controller', value: 'traffic_controller' },
    { label: 'Others', value: 'others' },
  ];
  const categoryOptions = [
    { label: 'Event Security', value: 'event-security' },
    { label: 'Static Security Guard', value: 'static-security' },
    { label: 'Corporate Security', value: 'corporate-security' },
    { label: 'Site Patrol Security', value: 'site-patrol' },
    { label: 'Others', value: 'others' },
  ];

  const openIndividualDatePicker = () => {
    setCalendarTarget('individual');
    setCalendarVisible(true);
  };

  const documentTypes = form.documents
    .map(doc => (doc === 'others' ? otherDocument.trim() : doc))
    .filter(Boolean);

  // ── Map init ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const timer = setTimeout(() => setMapReady(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    mapRef.current.animateToRegion(
      {
        latitude: form.lat,
        longitude: form.lng,
        latitudeDelta: 0.022,
        longitudeDelta: 0.012,
      },
      800,
    );
  }, [mapReady]);

  // ── User location ─────────────────────────────────────────────────────────
  useEffect(() => {
    const getLocation = async () => {
      let hasPermission = true;
      if (Platform.OS === 'android') {
        try {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          );
          hasPermission = granted === PermissionsAndroid.RESULTS.GRANTED;
        } catch {
          hasPermission = false;
        }
      }
      if (!hasPermission) return;
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          pos => {
            const { latitude, longitude } = pos.coords;
            setForm(prev => ({ ...prev, lat: latitude, lng: longitude }));
            if (mapReady && mapRef.current) {
              mapRef.current.animateToRegion(
                {
                  latitude,
                  longitude,
                  latitudeDelta: 0.022,
                  longitudeDelta: 0.012,
                },
                1000,
              );
            }
          },
          () => {},
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 },
        );
      }
    };
    getLocation();
  }, [mapReady]);

  // ── Autocomplete ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (autocompleteQuery.length < 3) {
      setSuggestions([]);
      return;
    }
    const timeout = setTimeout(async () => {
      setLoadingSuggestions(true);
      try {
        const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
          autocompleteQuery,
        )}&key=${GOOGLE_PLACES_KEY}`;
        const res = await fetch(url);
        const json = await res.json();
        setSuggestions(json.status === 'OK' ? json.predictions || [] : []);
      } catch {
        setSuggestions([]);
      } finally {
        setLoadingSuggestions(false);
      }
    }, 400);
    return () => clearTimeout(timeout);
  }, [autocompleteQuery]);

  const selectSuggestion = async (prediction: PlacePrediction) => {
    setAutocompleteQuery('');
    setSuggestions([]);
    setErrors(prev => ({ ...prev, location: undefined }));
    try {
      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${prediction.place_id}&fields=geometry&key=${GOOGLE_PLACES_KEY}`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.status === 'OK' && json.result?.geometry?.location) {
        const { lat, lng } = json.result.geometry.location;
        setForm(prev => ({
          ...prev,
          location: prediction.description,
          lat,
          lng,
        }));
        if (mapReady && mapRef.current) {
          mapRef.current.animateToRegion(
            {
              latitude: lat,
              longitude: lng,
              latitudeDelta: 0.022,
              longitudeDelta: 0.012,
            },
            800,
          );
        }
      }
    } catch (err) {
      console.error('Place details error:', err);
    }
  };

  // ── Rebuild range schedules ───────────────────────────────────────────────
  useEffect(() => {
    if (scheduleMode !== 'range' || multiDayMode !== 'range') return;
    const days = datesBetween(rangeFrom, rangeTo);
    setRangeSchedules(prev =>
      days.map(
        date =>
          prev.find(p => isSameDay(p.date, date)) ?? makeDaySchedule(date),
      ),
    );
  }, [rangeFrom, rangeTo, scheduleMode, multiDayMode]);

  // ── Sync individual schedules ─────────────────────────────────────────────
  useEffect(() => {
    if (scheduleMode !== 'range' || multiDayMode !== 'individual') return;
    setIndividualSchedules(prev =>
      [...individualDates]
        .sort((a, b) => a.getTime() - b.getTime())
        .map(
          date =>
            prev.find(p => isSameDay(p.date, date)) ?? makeDaySchedule(date),
        ),
    );
  }, [individualDates, multiDayMode, scheduleMode]);

  // ── Bulk apply ────────────────────────────────────────────────────────────
  const applyMasterToAll = (
    start: Date | null,
    end: Date | null,
    guards: string,
  ) => {
    if (!start || !end) return;

    const buildShifts = (existing: Shift[], date: Date) => {
      const dayStart = combineDateAndTimeSafe(date, start);
      const dayEnd = combineDateAndTimeSafe(date, end);
      const hours = shiftDurationHours(dayStart, dayEnd);
      const splits = hours > 13 ? splitShift(dayStart, dayEnd) : null;

      if (splits) {
        return splits.map(s => {
          const startOffset = s.startTime.getTime() - dayStart.getTime();
          const endOffset = s.endTime.getTime() - dayStart.getTime();
          const startTime = new Date(dayStart.getTime() + startOffset);
          const endTime = new Date(dayStart.getTime() + endOffset);
          return {
            id: Math.random().toString(36).slice(2),
            startTime,
            endTime,
            guardsCount: guards || autoAssignGuards(startTime, endTime),
          };
        });
      }

      return existing.map(shift => {
        const startTime = combineDateAndTimeSafe(date, start);
        let endTime = combineDateAndTimeSafe(date, end);
        if (endTime <= startTime) endTime.setDate(endTime.getDate() + 1);
        return {
          ...shift,
          startTime,
          endTime,
          guardsCount: guards || autoAssignGuards(startTime, endTime),
        };
      });
    };

    if (multiDayMode === 'individual') {
      setIndividualSchedules(prev =>
        prev.map(day => ({
          ...day,
          shifts: buildShifts(day.shifts, day.date),
        })),
      );
    } else {
      setRangeSchedules(prev =>
        prev.map(day => ({
          ...day,
          shifts: buildShifts(day.shifts, day.date),
        })),
      );
    }
  };

  const handleApplyToAllToggle = () => {
    const newVal = !applyToAll;
    setApplyToAll(newVal);
    if (newVal) applyMasterToAll(masterStartTime, masterEndTime, masterGuards);
  };

  const onMasterGuardsChange = (val: string) => {
    if (!/^\d*$/.test(val)) return;
    setMasterGuards(val);
    if (applyToAll) applyMasterToAll(masterStartTime, masterEndTime, val);
  };

  const openMasterTimePicker = (field: 'startTime' | 'endTime') => {
    setPickerValue(
      (field === 'startTime' ? masterStartTime : masterEndTime) || new Date(),
    );
    setPickerTarget({ mode: 'master', dayIndex: -1, shiftIndex: -1, field });
    setPickerVisible(true);
  };

  const updateSingleShift = (idx: number, field: keyof Shift, value: any) =>
    setSingleDaySchedule(prev => ({
      ...prev,
      shifts: prev.shifts.map((s, i) =>
        i === idx ? { ...s, [field]: value } : s,
      ),
    }));

  const addSingleShift = () =>
    setSingleDaySchedule(prev => ({
      ...prev,
      shifts: [...prev.shifts, makeDefaultShift()],
    }));

  const removeSingleShift = (idx: number) => {
    setSingleDaySchedule(prev => ({
      ...prev,
      shifts:
        prev.shifts.length > 1
          ? prev.shifts.filter((_, i) => i !== idx)
          : [makeDefaultShift()],
    }));
  };

  const removeRangeShift = (di: number, si: number) => {
    setRangeSchedules(prev => {
      const days = [...prev];
      days[di].shifts = days[di].shifts.filter((_, i) => i !== si);
      return days.filter(day => day.shifts.length > 0);
    });
  };

  const updateRangeShift = (
    di: number,
    si: number,
    field: keyof Shift,
    value: any,
  ) => {
    setApplyToAll(false);
    setRangeSchedules(prev => {
      const days = [...prev];
      days[di] = {
        ...days[di],
        shifts: days[di].shifts.map((s, i) =>
          i === si ? { ...s, [field]: value } : s,
        ),
      };
      return days;
    });
  };

  const addRangeShift = (di: number) =>
    setRangeSchedules(prev => {
      const days = [...prev];
      days[di] = {
        ...days[di],
        shifts: [...days[di].shifts, makeDefaultShift()],
      };
      return days;
    });

  const updateIndividualShift = (
    di: number,
    si: number,
    field: keyof Shift,
    value: any,
  ) => {
    setApplyToAll(false);
    setIndividualSchedules(prev => {
      const days = [...prev];
      days[di] = {
        ...days[di],
        shifts: days[di].shifts.map((s, i) =>
          i === si ? { ...s, [field]: value } : s,
        ),
      };
      return days;
    });
  };

  const addIndividualShift = (di: number) =>
    setIndividualSchedules(prev => {
      const days = [...prev];
      days[di] = {
        ...days[di],
        shifts: [...days[di].shifts, makeDefaultShift()],
      };
      return days;
    });

  const removeIndividualShift = (di: number, si: number) => {
    setIndividualSchedules(prev => {
      const days = [...prev];
      days[di].shifts = days[di].shifts.filter((_, i) => i !== si);
      return days.filter(day => day.shifts.length > 0);
    });
  };

  // ── Open time picker ──────────────────────────────────────────────────────
  const openTimePicker = (
    mode: 'single' | 'range' | 'individual',
    dayIndex: number,
    shiftIndex: number,
    field: 'startTime' | 'endTime',
  ) => {
    let currentVal: Date;
    if (mode === 'single') {
      currentVal = singleDaySchedule.shifts[shiftIndex]?.[field] ?? new Date();
    } else if (mode === 'individual') {
      currentVal =
        individualSchedules[dayIndex]?.shifts[shiftIndex]?.[field] ??
        new Date();
    } else {
      currentVal =
        rangeSchedules[dayIndex]?.shifts[shiftIndex]?.[field] ?? new Date();
    }
    setPickerValue(currentVal);
    setPickerTarget({ mode, dayIndex, shiftIndex, field });
    setPickerVisible(true);
  };

  const applyTimeChange = (selectedDate: Date) => {
    if (!pickerTarget) return;

    const { mode, dayIndex, shiftIndex, field } = pickerTarget;

    if (mode === 'master') {
      if (field === 'startTime') setMasterStartTime(selectedDate);
      else setMasterEndTime(selectedDate);
      if (applyToAll)
        applyMasterToAll(masterStartTime, masterEndTime, masterGuards);
      return;
    }

    let currentShift: Shift;
    const isSingle = mode === 'single';

    if (isSingle) currentShift = singleDaySchedule.shifts[shiftIndex];
    else if (mode === 'individual')
      currentShift = individualSchedules[dayIndex].shifts[shiftIndex];
    else currentShift = rangeSchedules[dayIndex].shifts[shiftIndex];

    let newStart =
      field === 'startTime'
        ? combineDateAndTimeSafe(currentShift.startTime, selectedDate)
        : currentShift.startTime;

    let newEnd =
      field === 'endTime'
        ? combineDateAndTimeSafe(currentShift.endTime, selectedDate)
        : currentShift.endTime;

    // Force correct day if needed
    if (newEnd.getTime() < newStart.getTime()) {
      newEnd = new Date(newEnd.getTime() + 24 * 60 * 60 * 1000);
    }

    const hours = shiftDurationHours(newStart, newEnd);

    // AUTO SPLIT ONLY when End Time is being set AND duration > 13 hours
    if (field === 'endTime' && hours > 13) {
      const splits = splitShift(newStart, newEnd);

      const newShifts = splits.map(s => ({
        id: Math.random().toString(36).slice(2),
        startTime: new Date(s.startTime),
        endTime: new Date(s.endTime),
        guardsCount: '1',
      }));

      Toast.show({
        type: 'info',
        text1: 'Shift Split',
        text2: `Long shift (${hours.toFixed(1)}h) split into ${
          splits.length
        } parts`,
        position: 'bottom',
        visibilityTime: 2500,
      });

      if (isSingle) {
        const grouped: DaySchedule[] = [];
        newShifts.forEach(shift => {
          const d = new Date(shift.startTime);
          d.setHours(0, 0, 0, 0);
          let day = grouped.find(ds => isSameDay(ds.date, d));
          if (!day) {
            day = { date: d, shifts: [] };
            grouped.push(day);
          }
          day.shifts.push(shift);
        });

        if (grouped.length > 1) {
          setScheduleMode('range');
          setMultiDayMode('individual');
          setIndividualDates(grouped.map(g => g.date));
          setIndividualSchedules(grouped);
        } else {
          setSingleDaySchedule(grouped[0]);
        }
      } else {
        const setFn =
          mode === 'individual' ? setIndividualSchedules : setRangeSchedules;
        setFn((prev: DaySchedule[]) => {
          const newList = [...prev];
          const target = newList[dayIndex];
          target.shifts = target.shifts.filter((_, i) => i !== shiftIndex);

          newShifts.forEach(shift => {
            const shiftDate = new Date(shift.startTime);
            shiftDate.setHours(0, 0, 0, 0);
            let idx = newList.findIndex(d => isSameDay(d.date, shiftDate));
            if (idx === -1) {
              newList.push({ date: shiftDate, shifts: [] });
              idx = newList.length - 1;
            }
            newList[idx].shifts.push(shift);
          });

          return newList.sort((a, b) => a.date.getTime() - b.date.getTime());
        });
      }
      return;
    }

    // Normal update (no split)
    const updateValue = field === 'startTime' ? newStart : newEnd;
    if (isSingle) {
      updateSingleShift(shiftIndex, field, updateValue);
    } else if (mode === 'individual') {
      updateIndividualShift(dayIndex, shiftIndex, field, updateValue);
    } else {
      updateRangeShift(dayIndex, shiftIndex, field, updateValue);
    }
  };

  const onTimePickerChange = (_: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setPickerVisible(false);
      if (selectedDate) {
        applyTimeChange(selectedDate);
      }
    } else {
      if (selectedDate) setPickerValue(selectedDate);
    }
  };

  // ── Calendar helpers ──────────────────────────────────────────────────────
  const buildCalendarDays = (month: Date): (Date | null)[] => {
    const year = month.getFullYear();
    const m = month.getMonth();
    const first = new Date(year, m, 1);
    const last = new Date(year, m + 1, 0);
    const days: (Date | null)[] = [];
    for (let i = 0; i < first.getDay(); i++) days.push(null);
    for (let d = 1; d <= last.getDate(); d++) days.push(new Date(year, m, d));
    return days;
  };

  const calendarDays = useMemo(
    () => buildCalendarDays(calendarMonth),
    [calendarMonth],
  );

  const isDaySelected = (d: Date) => {
    if (calendarTarget === 'single') {
      return isSameDay(d, singleDaySchedule.date);
    }
    if (calendarTarget === 'rangeFrom') {
      return isSameDay(d, rangeFrom);
    }
    if (calendarTarget === 'rangeTo') {
      return isSameDay(d, rangeTo);
    }
    if (calendarTarget === 'individual') {
      return individualDates.some(date => isSameDay(date, d));
    }
    return false;
  };

  const isDayInRange = (d: Date) => {
    if (calendarTarget === 'individual') return false;
    return (
      (calendarTarget === 'rangeFrom' || calendarTarget === 'rangeTo') &&
      d > rangeFrom &&
      d < rangeTo
    );
  };

  const onCalendarDayPress = (d: Date) => {
    const isPast = d < new Date(new Date().setHours(0, 0, 0, 0));

    if (isPast) return;

    if (calendarTarget === 'single') {
      setSingleDaySchedule(prev => ({ ...prev, date: d }));
    } else if (calendarTarget === 'rangeFrom') {
      setRangeFrom(d);
      if (d > rangeTo) setRangeTo(d);
    } else if (calendarTarget === 'rangeTo') {
      setRangeTo(d);
      if (d < rangeFrom) setRangeFrom(d);
    } else if (calendarTarget === 'individual') {
      setIndividualDates(prev => {
        const exists = prev.find(p => isSameDay(p, d));
        return exists
          ? prev.filter(p => !isSameDay(p, d))
          : [...prev, d].sort((a, b) => a.getTime() - b.getTime());
      });
    }

    if (calendarTarget !== 'individual') {
      setCalendarVisible(false);
    }
  };

  // ── Total man-hours ───────────────────────────────────────────────────────
  const totalManHours = useMemo(() => {
    const schedules =
      scheduleMode === 'single'
        ? [singleDaySchedule]
        : multiDayMode === 'individual'
        ? individualSchedules
        : rangeSchedules;
    return schedules.reduce(
      (total, day) =>
        total +
        day.shifts.reduce((dTotal, shift) => {
          const h = shiftDurationHours(shift.startTime, shift.endTime);
          const g = Math.max(1, parseInt(shift.guardsCount || '1', 10));
          return dTotal + h * g;
        }, 0),
      0,
    );
  }, [
    scheduleMode,
    multiDayMode,
    singleDaySchedule,
    rangeSchedules,
    individualSchedules,
  ]);

  // ── Upload ────────────────────────────────────────────────────────────────
  const handleUpload = async () => {
    try {
      const result = await pick({
        type: [types.allFiles],
        allowMultiSelection: true,
      });
      if (!result || result.length === 0) return;
      setUploading(true);
      const newPaths: string[] = [];
      for (const file of result) {
        let fileToUpload = file;
        if (file.type?.startsWith('image/')) {
          try {
            const resized = await ImageResizer.createResizedImage(
              file.uri,
              1024,
              1024,
              'JPEG',
              75,
              0,
            );
            fileToUpload = {
              ...file,
              uri: resized.uri,
              name: file.name || 'compressed_image.jpg',
              type: 'image/jpeg',
            };
          } catch (e) {
            console.warn('Compression failed:', e);
          }
        }
        const uploaded = await uploadFile(fileToUpload);
        const fp = uploaded?.url || uploaded?.path || uploaded?.file || '';
        if (fp) {
          newPaths.push(fp);
          setSelectedFiles(prev => [...prev, file]);
        }
      }
      if (newPaths.length > 0) {
        setUploadedFilePaths(prev => [...prev, ...newPaths]);
        Toast.show({
          type: 'success',
          text1: `${newPaths.length} File${
            newPaths.length !== 1 ? 's' : ''
          } Uploaded`,
          position: 'bottom',
        });
      }
    } catch (err: any) {
      if (isCancel(err)) return;
      Toast.show({
        type: 'error',
        text1: 'Upload Failed',
        text2: err?.message || 'Try again',
        position: 'bottom',
      });
    } finally {
      setUploading(false);
    }
  };

  // ── Validate & navigate ───────────────────────────────────────────────────
  const validateAndNext = () => {
    const newErrors: FormErrors = {};
    if (!form.category) newErrors.category = 'Please select a job category';
    if (form.category === 'others' && !otherCategory.trim())
      newErrors.category = 'Please enter job category';
    if (!form.description.trim())
      newErrors.description = 'Description is required';
    if (!form.location.trim()) newErrors.location = 'Location is required';
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      Alert.alert('Incomplete Form', 'Please fill all required fields');
      return;
    }

    const activeSchedules =
      scheduleMode === 'single'
        ? [singleDaySchedule]
        : multiDayMode === 'individual'
        ? individualSchedules
        : rangeSchedules;

    const first = activeSchedules[0];
    const last = activeSchedules[activeSchedules.length - 1];

    navigation.navigate('ReviewConfirm', {
      jobData: {
        category:
          form.category === 'others' ? otherCategory.trim() : form.category,
        location: form.location || 'Not specified',
        lat: form.lat ?? DEFAULT_LOCATION.lat,
        lng: form.lng ?? DEFAULT_LOCATION.lng,
        description: form.description || '',

        // ← THESE ARE REQUIRED BY THE TYPE
        startDate: first.date,
        startTime: first.shifts[0]?.startTime ?? new Date(),
        endDate: last.date,
        endTime: last.shifts[last.shifts.length - 1]?.endTime ?? new Date(),

        // Shifts array
        shifts: activeSchedules.flatMap(day =>
          day.shifts.map(s => ({
            date: day.date,
            startTime: s.startTime,
            endTime: s.endTime,
            guardsCount: Number(s.guardsCount ?? 1),
          })),
        ),

        tasks: tasks.map(t => ({
          title: t.title || 'Untitled Task',
          startTime: t.startTime,
          endTime: t.endTime,
        })),

        // Optional but recommended
        title: `${
          form.category === 'others'
            ? otherCategory
            : categoryOptions.find(c => c.value === form.category)?.label
        }`,
        job_location_state: 'NSW', // or detect dynamically
      },
      uploadedFileUrls: uploadedFilePaths,
      selectedDocuments: documentTypes,
    });
  };

  const toggleDocument = (docValue: string) => {
    let updated = [...form.documents];

    if (updated.includes(docValue)) {
      updated = updated.filter(d => d !== docValue);
    } else {
      updated.push(docValue);
    }

    setForm({ ...form, documents: updated });
  };

  // ── Tasks Management ─────────────────────────────────────────────────────
  // ── Tasks Management ─────────────────────────────────────────────────────
  interface JobTask {
    id: string;
    startTime: Date;
    endTime: Date;
    title: string;
  }

  const [tasks, setTasks] = useState<JobTask[]>([
    {
      id: 'task-1',
      startTime: new Date(
        new Date().getFullYear(),
        new Date().getMonth(),
        new Date().getDate(),
        9,
        0,
      ), // 09:00 today
      endTime: new Date(
        new Date().getFullYear(),
        new Date().getMonth(),
        new Date().getDate(),
        17,
        0,
      ), // 17:00 today
      title: '',
    },
  ]);

  const addTask = () => {
    const newTask: JobTask = {
      id: Math.random().toString(36).slice(2),
      startTime: new Date(),
      endTime: new Date(new Date().getTime() + 8 * 60 * 60 * 1000), // +8 hours
      title: '',
    };
    setTasks(prev => [...prev, newTask]);
  };

  const removeTask = (id: string) => {
    if (tasks.length === 1) return; // Keep at least one
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  const updateTask = (id: string, field: keyof JobTask, value: any) => {
    setTasks(prev =>
      prev.map(task => (task.id === id ? { ...task, [field]: value } : task)),
    );
  };

  const openTaskTimePicker = (
    taskId: string,
    field: 'startTime' | 'endTime',
  ) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    setPickerValue(field === 'startTime' ? task.startTime : task.endTime);
    setPickerTarget({
      mode: 'task',
      dayIndex: -1,
      shiftIndex: -1,
      field,
      taskId,
    } as any);
    setPickerVisible(true);
  };
  // ── Render bulk apply UI ──────────────────────────────────────────────────
  const renderBulkApply = () => (
    <View style={styles.bulkConfigurationContainer}>
      <Text style={styles.bulkTitle}>Bulk Shift Overwrite Matrix</Text>

      <View style={styles.timeInputsRow}>
        <TouchableOpacity
          style={styles.timeSelectorBox}
          onPress={() => openMasterTimePicker('startTime')}
        >
          <Clock size={14} color={TEXT_MUTED} />
          <Text style={styles.timeSelectorValue}>
            {masterStartTime ? formatTime(masterStartTime) : 'Set Start'}
          </Text>
        </TouchableOpacity>
        <ArrowRight size={14} color={TEXT_MUTED} />
        <TouchableOpacity
          style={styles.timeSelectorBox}
          onPress={() => openMasterTimePicker('endTime')}
        >
          <Clock size={14} color={TEXT_MUTED} />
          <Text style={styles.timeSelectorValue}>
            {masterEndTime ? formatTime(masterEndTime) : 'Set End'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.guardsCounterBlock}>
        <Text style={styles.fieldLabelSub}>Master Guards Count</Text>
        <TextInput
          style={styles.guardsMiniInput}
          placeholder="Auto"
          placeholderTextColor={TEXT_MUTED}
          keyboardType="numeric"
          value={masterGuards}
          onChangeText={onMasterGuardsChange}
        />
      </View>

      <TouchableOpacity
        style={[
          styles.bulkApplyCheckboxRow,
          applyToAll && styles.bulkActiveRow,
        ]}
        onPress={handleApplyToAllToggle}
      >
        <View
          style={[styles.checkboxShell, applyToAll && styles.checkboxChecked]}
        >
          {applyToAll && <Check size={12} color={BRAND_BG} />}
        </View>
        <Text style={styles.checkboxLabel}>
          Enforce pattern parameters across layout
        </Text>
      </TouchableOpacity>
    </View>
  );

  // ── Render day shift list ─────────────────────────────────────────────────
  const renderDayShiftList = (
    schedules: DaySchedule[],
    mode: 'range' | 'individual',
    addFn: (di: number) => void,
    removeFn: (di: number, si: number) => void,
  ) => (
    <>
      {schedules.map((daySchedule, dIdx) => (
        <View key={dIdx.toString()} style={styles.nestedDayBlock}>
          <Text style={styles.nestedDayDateTitle}>
            {formatDate(daySchedule.date)}
          </Text>
          {daySchedule.shifts.map((shift, sIdx) => (
            <View key={shift.id} style={styles.nestedShiftItem}>
              <View style={styles.timeInputsRow}>
                <TouchableOpacity
                  style={styles.nestedTimeBox}
                  onPress={() => openTimePicker(mode, dIdx, sIdx, 'startTime')}
                >
                  <Text style={styles.nestedTimeText}>
                    {formatTime(shift.startTime)}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.nestedTimeBox}
                  onPress={() => openTimePicker(mode, dIdx, sIdx, 'endTime')}
                >
                  <Text style={styles.nestedTimeText}>
                    {formatTime(shift.endTime)}
                  </Text>
                </TouchableOpacity>
                <TextInput
                  style={styles.nestedGuardsInput}
                  keyboardType="numeric"
                  value={shift.guardsCount}
                  onChangeText={val =>
                    mode === 'individual'
                      ? updateIndividualShift(dIdx, sIdx, 'guardsCount', val)
                      : updateRangeShift(dIdx, sIdx, 'guardsCount', val)
                  }
                />
                <TouchableOpacity onPress={() => removeFn(dIdx, sIdx)}>
                  <Trash2 size={14} color={ERROR_RED} />
                </TouchableOpacity>
              </View>
            </View>
          ))}
          {daySchedule.shifts.length > 0 && (
            <TouchableOpacity
              style={styles.nestedAddShiftBtn}
              onPress={() => addFn(dIdx)}
            >
              <Plus size={12} color={ACCENT_TEAL} />
              <Text style={styles.nestedAddShiftText}>Add Shift</Text>
            </TouchableOpacity>
          )}
        </View>
      ))}
    </>
  );

  // ── Individual dates picker ───────────────────────────────────────────────
  const renderIndividualDates = () => (
    <View>
      <Text style={styles.fieldLabelSub}>SELECT DATES (Tap to toggle)</Text>

      <TouchableOpacity
        style={styles.customDateSelectorBtn}
        onPress={openIndividualDatePicker}
      >
        <Calendar size={16} color={ACCENT_TEAL} />
        <Text style={styles.customDateSelectBtnText}>
          {individualDates.length > 0
            ? `${individualDates.length} Dates Configured`
            : 'Select Target Dates'}
        </Text>
      </TouchableOpacity>

      {individualDates.length > 0 && (
        <>
          {renderBulkApply()}
          {renderDayShiftList(
            individualSchedules,
            'individual',
            addIndividualShift,
            removeIndividualShift,
          )}
        </>
      )}

      {individualDates.length === 0 && (
        <Text
          style={{
            color: TEXT_MUTED,
            textAlign: 'center',
            marginVertical: 20,
            fontSize: 13,
          }}
        >
          No dates selected yet. Tap "Select Target Dates" above.
        </Text>
      )}
    </View>
  );

  // ── Date range content ────────────────────────────────────────────────────
  const renderDateRangeContent = () => (
    <View>
      <View style={styles.rangePickersBlock}>
        <TouchableOpacity
          style={styles.dateRangeBox}
          onPress={() => {
            setCalendarTarget('rangeFrom');
            setCalendarVisible(true);
          }}
        >
          <Text style={styles.rangeBoxLabel}>From</Text>
          <Text style={styles.rangeBoxValue}>{formatDate(rangeFrom)}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.dateRangeBox}
          onPress={() => {
            setCalendarTarget('rangeTo');
            setCalendarVisible(true);
          }}
        >
          <Text style={styles.rangeBoxLabel}>To</Text>
          <Text style={styles.rangeBoxValue}>{formatDate(rangeTo)}</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.multiSummary}>
        {rangeSchedules.length} day{rangeSchedules.length !== 1 ? 's' : ''}{' '}
        selected
      </Text>

      {renderBulkApply()}
      {renderDayShiftList(
        rangeSchedules,
        'range',
        addRangeShift,
        removeRangeShift,
      )}
    </View>
  );

  // ── Multiple days wrapper (with sub-tabs) ─────────────────────────────────
  const renderMultipleDays = () => (
    <View>
      <Text style={styles.fieldLabelSub}>Multi-Day Distribution</Text>
      <View style={styles.segmentControlGroup}>
        <TouchableOpacity
          style={[
            styles.segmentItem,
            multiDayMode === 'range' && styles.segmentItemActive,
          ]}
          onPress={() => setMultiDayMode('range')}
        >
          <Text
            style={[
              styles.segmentItemText,
              multiDayMode === 'range' && styles.segmentItemTextActive,
            ]}
          >
            Continuous Range
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.segmentItem,
            multiDayMode === 'individual' && styles.segmentItemActive,
          ]}
          onPress={() => setMultiDayMode('individual')}
        >
          <Text
            style={[
              styles.segmentItemText,
              multiDayMode === 'individual' && styles.segmentItemTextActive,
            ]}
          >
            Specific Dates
          </Text>
        </TouchableOpacity>
      </View>
      {multiDayMode === 'individual'
        ? renderIndividualDates()
        : renderDateRangeContent()}
    </View>
  );

  // ── Single day render ─────────────────────────────────────────────────────
  const renderSingleDay = () => (
    <View>
      <View style={styles.cardHeaderRow}>
        <Text style={styles.cardHeaderTitle}>
          Shifts for {formatDate(singleDaySchedule.date)}
        </Text>
        <TouchableOpacity
          style={styles.calendarInlineBtn}
          onPress={() => {
            setCalendarTarget('single');
            setCalendarVisible(true);
          }}
        >
          <Calendar size={14} color={ACCENT_TEAL} />
          <Text style={styles.inlineBtnText}>Change Date</Text>
        </TouchableOpacity>
      </View>

      {singleDaySchedule.shifts.map((shift, sIdx) => (
        <View key={shift.id} style={styles.shiftEntryBlock}>
          <View style={styles.shiftRowTop}>
            <Text style={styles.shiftBadgeText}>Shift #{sIdx + 1}</Text>
            {singleDaySchedule.shifts.length > 1 && (
              <TouchableOpacity onPress={() => removeSingleShift(sIdx)}>
                <Trash2 size={16} color={ERROR_RED} />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.timeInputsRow}>
            <TouchableOpacity
              style={styles.timeSelectorBox}
              onPress={() => openTimePicker('single', 0, sIdx, 'startTime')}
            >
              <Clock size={14} color={TEXT_MUTED} />
              <Text style={styles.timeSelectorValue}>
                {formatTime(shift.startTime)}
              </Text>
            </TouchableOpacity>
            <ArrowRight size={14} color={TEXT_MUTED} />
            <TouchableOpacity
              style={styles.timeSelectorBox}
              onPress={() => openTimePicker('single', 0, sIdx, 'endTime')}
            >
              <Clock size={14} color={TEXT_MUTED} />
              <Text style={styles.timeSelectorValue}>
                {formatTime(shift.endTime)}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.guardsCounterBlock}>
            <Text style={styles.fieldLabelSub}>Guards Count</Text>
            <TextInput
              style={styles.guardsMiniInput}
              keyboardType="numeric"
              value={shift.guardsCount}
              onChangeText={val => updateSingleShift(sIdx, 'guardsCount', val)}
            />
          </View>
        </View>
      ))}

      <TouchableOpacity style={styles.addShiftButton} onPress={addSingleShift}>
        <Plus size={16} color={BRAND_BG} />
        <Text style={styles.addShiftBtnText}>Add Another Shift</Text>
      </TouchableOpacity>
    </View>
  );

  // ── MAIN RENDER ───────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={BRAND_BG} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        {/* Top Corporate Branding Header */}
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => navigation.navigate('Profile')}
            style={styles.backBtn}
          >
            <ArrowLeft size={20} color={ACCENT_TEAL} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Job</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          {/* Core Content Form Canvas */}
          <View style={styles.formContainer}>
            {/* Location Field */}
            <Text style={styles.inputLabel}>Operational Location *</Text>

            <LinearGradient
              colors={[
                'rgba(255, 255, 255, 0.41)',
                'rgba(255,255,255,0.35)',
                'rgba(255, 255, 255, 0.2)',
                'rgba(255,255,255,0.10)',
                'rgba(255, 255, 255, 0.22)',
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[
                styles.searchGradient,
                errors.location && styles.inputErrorBorder,
              ]}
            >
              <View style={styles.searchBarContainer}>
                <Search
                  size={18}
                  color={TEXT_MUTED}
                  style={styles.searchIcon}
                />
                <TextInput
                  style={styles.searchBarInput}
                  placeholder="Search deployment address..."
                  placeholderTextColor={TEXT_MUTED}
                  value={autocompleteQuery || form.location}
                  onChangeText={setAutocompleteQuery}
                />
              </View>
            </LinearGradient>

            {errors.location && (
              <View style={styles.errorRow}>
                <AlertCircle size={12} color={ERROR_RED} />
                <Text style={styles.errorText}>{errors.location}</Text>
              </View>
            )}

            {loadingSuggestions && (
              <ActivityIndicator
                size="small"
                color={ACCENT_TEAL}
                style={{ marginTop: 10 }}
              />
            )}

            {suggestions.length > 0 && (
              <View style={styles.suggestionsContainer}>
                {suggestions.map((item, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.suggestionItem}
                    onPress={() => selectSuggestion(item)}
                  >
                    <MapPin size={14} color={ACCENT_TEAL} />
                    <Text style={styles.suggestionText} numberOfLines={1}>
                      {item.description}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Interactive Embedded Map View */}
            <View style={styles.mapCardFrame}>
              {mapReady && !mapError ? (
                <MapView
                  ref={mapRef}
                  style={styles.mapInstance}
                  initialRegion={{
                    latitude: form.lat,
                    longitude: form.lng,
                    latitudeDelta: 0.03,
                    longitudeDelta: 0.015,
                  }}
                  showsUserLocation
                  showsMyLocationButton
                >
                  {form.lat !== 0 && form.lng !== 0 && (
                    <Marker
                      coordinate={{ latitude: form.lat, longitude: form.lng }}
                      title={form.location || 'Selected Location'}
                      pinColor="#EF4444"
                      draggable
                      onDragEnd={e => {
                        const { latitude, longitude } =
                          e.nativeEvent.coordinate;
                        setForm(prev => ({
                          ...prev,
                          lat: latitude,
                          lng: longitude,
                        }));
                      }}
                    />
                  )}
                </MapView>
              ) : (
                <View style={styles.mapPlaceholder}>
                  {mapError ? (
                    <Text
                      style={{
                        color: '#ef4444',
                        fontSize: 14,
                        textAlign: 'center',
                      }}
                    >
                      Map failed to load
                    </Text>
                  ) : (
                    <>
                      <ActivityIndicator size="large" color={ACCENT_TEAL} />
                      <Text style={{ color: '#64748b', marginTop: 12 }}>
                        Loading map...
                      </Text>
                    </>
                  )}
                </View>
              )}
            </View>

            {/* Timeline Selection */}
            <Text style={styles.inputLabel}>Schedule Configuration Mode</Text>
            <View style={styles.toggleButtonGroup}>
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  scheduleMode === 'single' && styles.toggleButtonActive,
                ]}
                onPress={() => setScheduleMode('single')}
              >
                <Text
                  style={[
                    styles.toggleButtonText,
                    scheduleMode === 'single' && styles.toggleButtonTextActive,
                  ]}
                >
                  Single Day
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  scheduleMode === 'range' && styles.toggleButtonActive,
                ]}
                onPress={() => setScheduleMode('range')}
              >
                <Text
                  style={[
                    styles.toggleButtonText,
                    scheduleMode === 'range' && styles.toggleButtonTextActive,
                  ]}
                >
                  Multiple Days
                </Text>
              </TouchableOpacity>
            </View>

            {/* Schedule Workspace Cards */}
            <LinearGradient
              colors={[
                'rgba(255, 255, 255, 0.41)',
                'rgba(255,255,255,0.35)',
                'rgba(255, 255, 255, 0.2)',
                'rgba(255,255,255,0.10)',
                'rgba(255, 255, 255, 0.22)',
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.scheduleGradientCard}
            >
              <View style={styles.scheduleDetailCard}>
                {scheduleMode === 'single'
                  ? renderSingleDay()
                  : renderMultipleDays()}
              </View>
            </LinearGradient>

            {/* ── Manage Tasks Section ── */}
            {/* <Text style={styles.inputLabel}>Manage Tasks</Text>

            <View style={styles.tasksContainer}>
              {tasks.map((task, index) => (
                <View key={task.id} style={styles.taskCard}>
              
                  <View style={styles.taskTimeRow}>
                    <TouchableOpacity
                      style={styles.taskTimeBox}
                      onPress={() => openTaskTimePicker(task.id, 'startTime')}
                    >
                      <Text style={styles.taskTimeText}>
                        {formatTime(task.startTime)}
                      </Text>
                    </TouchableOpacity>

                    <Text style={styles.taskTimeSeparator}>–</Text>

                    <TouchableOpacity
                      style={styles.taskTimeBox}
                      onPress={() => openTaskTimePicker(task.id, 'endTime')}
                    >
                      <Text style={styles.taskTimeText}>
                        {formatTime(task.endTime)}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => removeTask(task.id)}
                      style={styles.taskDeleteBtn}
                    >
                      <Trash2 size={20} color={ERROR_RED} />
                    </TouchableOpacity>
                  </View>

                 
                  <TextInput
                    style={styles.taskInput}
                    placeholder="Enter task description..."
                    placeholderTextColor={TEXT_MUTED}
                    value={task.title}
                    onChangeText={text => updateTask(task.id, 'title', text)}
                  />
                </View>
              ))}

              <TouchableOpacity style={styles.addTaskButton} onPress={addTask}>
                <Plus size={20} color="#fff" />
                <Text style={styles.addTaskText}>Add Task</Text>
              </TouchableOpacity>
            </View> */}
            {/* Category Field */}
            <Text style={styles.inputLabel}>Job Category *</Text>

            <LinearGradient
              colors={[
                'rgba(255, 255, 255, 0.41)',
                'rgba(255,255,255,0.35)',
                'rgba(255, 255, 255, 0.2)',
                'rgba(255,255,255,0.10)',
                'rgba(255, 255, 255, 0.22)',
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[
                styles.dropdownGradient,
                errors.category && styles.inputErrorBorder,
              ]}
            >
              <TouchableOpacity
                style={styles.dropdownTrigger}
                activeOpacity={0.8}
                onPress={() => {
                  Keyboard.dismiss();
                  setShowCategoryModal(true);
                }}
              >
                <Text
                  style={
                    form.category
                      ? styles.dropdownText
                      : styles.dropdownPlaceholder
                  }
                >
                  {form.category
                    ? categoryOptions.find(o => o.value === form.category)
                        ?.label
                    : 'Select operational class'}
                </Text>
                <ChevronDown size={18} color={ACCENT_TEAL} />
              </TouchableOpacity>
            </LinearGradient>

            {errors.category && (
              <View style={styles.errorRow}>
                <AlertCircle size={12} color={ERROR_RED} />
                <Text style={styles.errorText}>{errors.category}</Text>
              </View>
            )}

            {form.category === 'others' && (
              <TextInput
                style={styles.textInput}
                placeholder="Specify alternative category name"
                placeholderTextColor={TEXT_MUTED}
                value={otherCategory}
                onChangeText={setOtherCategory}
              />
            )}

            {/* Description Field */}
            <View style={styles.labelRow}>
              <Text style={styles.inputLabel}>Job Description *</Text>
              <Text style={styles.charCounter}>
                {form.description.length}/{MAX_DESCRIPTION_LENGTH}
              </Text>
            </View>

            <LinearGradient
              colors={[
                'rgba(255, 255, 255, 0.41)',
                'rgba(255,255,255,0.35)',
                'rgba(255, 255, 255, 0.2)',
                'rgba(255,255,255,0.10)',
                'rgba(255, 255, 255, 0.22)',
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[
                styles.textAreaGradient,
                errors.description && styles.inputErrorBorder,
              ]}
            >
              <TextInput
                style={styles.textAreaInput}
                multiline
                numberOfLines={4}
                maxLength={MAX_DESCRIPTION_LENGTH}
                placeholder="Describe tasks, emergency protocols, and deployment rules..."
                placeholderTextColor={TEXT_MUTED}
                value={form.description}
                onChangeText={val =>
                  setForm(prev => ({ ...prev, description: val }))
                }
              />
            </LinearGradient>

            {errors.description && (
              <View style={styles.errorRow}>
                <AlertCircle size={12} color={ERROR_RED} />
                <Text style={styles.errorText}>{errors.description}</Text>
              </View>
            )}

            {/* Required Documents - Toggle Style */}
            <Text style={styles.inputLabel}>Required Documents</Text>
            <View style={styles.toggleContainer}>
              {documentOptions.slice(0, 3).map(doc => {
                const isActive = form.documents.includes(doc.value);

                return (
                  <LinearGradient
                    key={doc.value}
                    colors={[
                      'rgba(255,255,255,0.25)',
                      'rgba(255,255,255,0.08)',
                    ]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.toggleCard}
                  >
                    <View style={styles.toggleRow}>
                      <View style={styles.toggleContent}>
                        <Text style={styles.toggleLabel}>{doc.label}</Text>
                      </View>

                      <TouchableOpacity
                        activeOpacity={0.8}
                        style={[
                          styles.toggleSwitch,
                          isActive && styles.toggleSwitchActive,
                        ]}
                        onPress={() => toggleDocument(doc.value)}
                      >
                        <View
                          style={[
                            styles.toggleKnob,
                            isActive && styles.toggleKnobActive,
                          ]}
                        />

                        <Text
                          style={[
                            styles.toggleText,
                            isActive && styles.toggleTextActive,
                          ]}
                        >
                          {isActive ? 'YES' : 'NO'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </LinearGradient>
                );
              })}
            </View>

            {/* Document Upload */}
            <Text style={styles.inputLabel}>Compliance Documents</Text>
            <TouchableOpacity
              style={styles.uploadAreaContainer}
              onPress={handleUpload}
            >
              {uploading ? (
                <ActivityIndicator size="small" color={ACCENT_TEAL} />
              ) : (
                <>
                  <CloudUpload size={28} color={ACCENT_TEAL} />
                  <Text style={styles.uploadTextTitle}>
                    Upload File Attachments
                  </Text>
                  <Text style={styles.uploadTextSubtitle}>
                    PDF, PNG, JPG up to 10MB
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {selectedFiles.length > 0 && (
              <View style={styles.fileListCard}>
                {selectedFiles.map((f: any, idx) => (
                  <View key={idx} style={styles.fileRowItem}>
                    <FileCheck size={16} color={ACCENT_TEAL} />
                    <Text style={styles.fileNameText} numberOfLines={1}>
                      {f.name || `Attachment_${idx + 1}`}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Global Cost Footprint Display Widget */}
            <View style={styles.summaryFooterMetricsCard}>
              <View style={styles.metricsColumn}>
                <Text style={styles.metricsLabel}>Estimated Total Volume</Text>
                <Text style={styles.metricsValue}>
                  {totalManHours.toFixed(1)} Man-Hours
                </Text>
              </View>
              <TouchableOpacity
                style={styles.submissionButton}
                onPress={validateAndNext}
              >
                <Text style={styles.submissionBtnText}>Continue</Text>
                <ArrowRight size={16} color={BRAND_BG} />
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Category Modal ── */}
      <Modal
        visible={showCategoryModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCategoryModal(false)}
      >
        <View style={styles.modalOverlayContainer}>
          <View style={styles.bottomSelectionSheet}>
            <Text style={styles.selectionSheetTitle}>
              Select Operational Category
            </Text>
            {categoryOptions.map(opt => (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.selectionOptionRow,
                  form.category === opt.value && styles.selectionOptionActive,
                ]}
                onPress={() => {
                  setForm(prev => ({ ...prev, category: opt.value }));
                  if (opt.value !== 'others') setOtherCategory('');
                  setShowCategoryModal(false);
                  setErrors(prev => ({ ...prev, category: undefined }));
                }}
              >
                <Text style={styles.selectionOptionText}>{opt.label}</Text>
                {form.category === opt.value && (
                  <Check size={16} color={ACCENT_TEAL} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* ── Documents Modal ── */}
      <Modal
        visible={showDocModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowDocModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <View style={styles.modalOverlayContainer}>
            <View style={styles.bottomSelectionSheet}>
              <Text style={styles.selectionSheetTitle}>Required Documents</Text>
              <ScrollView keyboardShouldPersistTaps="handled">
                {documentOptions.map(item => {
                  const isSelected = form.documents.includes(item.value);
                  return (
                    <TouchableOpacity
                      key={item.value}
                      style={styles.selectionOptionRow}
                      onPress={() => {
                        let updated = [...form.documents];
                        if (updated.includes(item.value)) {
                          updated = updated.filter(d => d !== item.value);
                          if (item.value === 'others') setOtherDocument('');
                        } else {
                          updated.push(item.value);
                        }
                        setForm({ ...form, documents: updated });
                      }}
                    >
                      <Text style={styles.selectionOptionText}>
                        {item.label}
                      </Text>
                      {isSelected && <Check size={16} color={ACCENT_TEAL} />}
                    </TouchableOpacity>
                  );
                })}
                {form.documents.includes('others') && (
                  <TextInput
                    placeholder="Enter document name"
                    placeholderTextColor={TEXT_MUTED}
                    value={otherDocument}
                    onChangeText={setOtherDocument}
                    style={styles.textInput}
                  />
                )}
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Time Picker Modal ── */}
      {pickerVisible && (
        <Modal
          visible
          transparent
          animationType="fade"
          onRequestClose={() => setPickerVisible(false)}
        >
          <View style={styles.modalOverlayContainer}>
            <View style={styles.iosPickerWrapperSheet}>
              <DateTimePicker
                value={pickerValue}
                mode="time"
                is24Hour
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={onTimePickerChange}
                textColor="#FFFFFF"
              />
              {Platform.OS === 'ios' && (
                <TouchableOpacity
                  style={styles.modalConfirmActionBtn}
                  onPress={() => {
                    applyTimeChange(pickerValue);
                    setPickerVisible(false);
                  }}
                >
                  <Text style={styles.modalConfirmActionText}>
                    Confirm Configuration
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </Modal>
      )}

      {/* ── Calendar Modal ── */}
      <Modal
        visible={calendarVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCalendarVisible(false)}
      >
        <View style={styles.modalOverlayContainer}>
          <View style={styles.calendarModalSheet}>
            <View style={styles.modalSheetTopHeaderRow}>
              <Text style={styles.modalHeaderTitle}>
                {calendarTarget === 'single'
                  ? 'Select Date'
                  : calendarTarget === 'rangeFrom'
                  ? 'Select Start Date'
                  : calendarTarget === 'rangeTo'
                  ? 'Select End Date'
                  : 'Select Multiple Dates'}
              </Text>
              <TouchableOpacity onPress={() => setCalendarVisible(false)}>
                <Text style={styles.closeModalTextLink}>Done</Text>
              </TouchableOpacity>
            </View>

            {/* Navigation */}
            <View style={styles.calNavRow}>
              <TouchableOpacity
                onPress={() =>
                  setCalendarMonth(
                    prev =>
                      new Date(prev.getFullYear(), prev.getMonth() - 1, 1),
                  )
                }
              >
                <ChevronLeft size={24} color={ACCENT_TEAL} />
              </TouchableOpacity>

              <Text style={styles.calendarMonthHeadingText}>
                {calendarMonth.toLocaleString('default', {
                  month: 'long',
                  year: 'numeric',
                })}
              </Text>

              <TouchableOpacity
                onPress={() =>
                  setCalendarMonth(
                    prev =>
                      new Date(prev.getFullYear(), prev.getMonth() + 1, 1),
                  )
                }
              >
                <ChevronRight size={24} color={ACCENT_TEAL} />
              </TouchableOpacity>
            </View>

            {/* Week Days */}
            <View style={styles.calWeekRow}>
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                <Text key={d} style={styles.calWeekDay}>
                  {d}
                </Text>
              ))}
            </View>

            {/* Calendar Grid */}
            <ScrollView style={styles.calendarDaysGridMatrixScroll}>
              <View style={styles.daysMatrixGrid}>
                {calendarDays.map((d, i) => {
                  if (!d)
                    return (
                      <View key={`empty-${i}`} style={styles.emptyGridCell} />
                    );

                  const selected = isDaySelected(d);
                  const inRange = isDayInRange(d);
                  const isPast = d < new Date(new Date().setHours(0, 0, 0, 0));

                  return (
                    <TouchableOpacity
                      key={d.toISOString()}
                      style={[
                        styles.calendarDayCell,
                        selected && styles.dayCellSelected,
                        inRange && styles.calCellInRange,
                        isToday(d) && !selected && styles.calCellToday,
                        isPast && styles.calCellPast,
                      ]}
                      onPress={() => !isPast && onCalendarDayPress(d)}
                      disabled={isPast}
                    >
                      <Text
                        style={[
                          styles.dayCellText,
                          selected && styles.dayCellTextSelected,
                          isPast && styles.calCellTextPast,
                        ]}
                      >
                        {d.getDate()}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BRAND_BG,
  },
  scrollContainer: {
    paddingBottom: 40,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    // paddingVertical: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
  },
  formContainer: {
    paddingHorizontal: 16,
    paddingTop: 5,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 18,
    marginBottom: 8,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    // marginTop: 10,
    marginBottom: 8,
  },
  charCounter: {
    fontSize: 12,
    color: TEXT_MUTED,
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: 'transparent',
  },
  dropdownText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  dropdownPlaceholder: {
    fontSize: 14,
    color: TEXT_MUTED,
  },
  textInput: {
    height: 50,
    backgroundColor: CARD_BG,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    color: '#FFFFFF',
    paddingHorizontal: 16,
    fontSize: 14,
    marginTop: 10,
  },
  textAreaInput: {
    padding: 14,
    minHeight: 110,
    textAlignVertical: 'top',
    backgroundColor: 'transparent',
    color: '#ffff',
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 14,
    backgroundColor: 'transparent',
  },
  searchGradient: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 0,
  },
  searchIcon: {
    marginRight: 10,
  },
  tasksContainer: {
    marginBottom: 20,
  },
  taskCard: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  taskTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  taskTimeBox: {
    backgroundColor: CHIP_DARK,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    flex: 1,
    alignItems: 'center',
  },
  taskTimeText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 15,
  },
  taskTimeSeparator: {
    fontSize: 20,
    color: TEXT_MUTED,
    marginHorizontal: 12,
  },
  taskDeleteBtn: {
    marginLeft: 12,
    padding: 8,
  },
  taskInput: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 14,
    color: '#FFFFFF',
    fontSize: 15,
  },
  addTaskButton: {
    backgroundColor: ACCENT_TEAL,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 50,
    gap: 8,
    marginTop: 8,
  },
  addTaskText: {
    color: BRAND_BG,
    fontWeight: '700',
    fontSize: 16,
  },
  searchBarInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    height: '100%',
  },
  scheduleGradientCard: {
    borderRadius: 18,
    overflow: 'hidden',
    marginTop: 12,
  },
  suggestionsContainer: {
    backgroundColor: CARD_BG,
    borderRadius: 12,
    marginTop: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    gap: 10,
  },
  suggestionText: {
    color: '#FFFFFF',
    fontSize: 13,
    flex: 1,
  },
  mapCardFrame: {
    height: 160,
    borderRadius: 14,
    overflow: 'hidden',
    marginTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  mapInstance: {
    ...StyleSheet.absoluteFillObject,
  },
  mapPlaceholder: {
    height: 160,
    backgroundColor: '#e2e8f0',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toggleButtonGroup: {
    flexDirection: 'row',
    backgroundColor: CARD_BG,
    borderRadius: 12,
    padding: 3,
    gap: 4,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 10,
  },
  toggleButtonActive: {
    backgroundColor: CHIP_DARK,
    borderWidth: 1,
    borderColor: 'rgba(92,225,214,0.2)',
  },
  toggleButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: TEXT_MUTED,
  },
  toggleButtonTextActive: {
    color: ACCENT_TEAL,
  },
  scheduleDetailCard: {
    borderRadius: 16,
    padding: 16,
    marginTop: 14,
    // borderWidth: 1,
    // borderColor: 'rgba(255,255,255,0.05)',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  cardHeaderTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  calendarInlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: CHIP_DARK,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  inlineBtnText: {
    fontSize: 12,
    color: ACCENT_TEAL,
    fontWeight: '600',
  },
  shiftEntryBlock: {
    backgroundColor: BRAND_BG,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  shiftRowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  shiftBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: ACCENT_TEAL,
    backgroundColor: CHIP_DARK,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  timeInputsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  timeSelectorBox: {
    flex: 1,
    height: 44,
    backgroundColor: CHIP_DARK,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  timeSelectorValue: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  guardsCounterBlock: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  fieldLabelSub: {
    fontSize: 13,
    color: TEXT_MUTED,
    fontWeight: '500',
  },
  guardsMiniInput: {
    width: 60,
    height: 36,
    backgroundColor: CHIP_DARK,
    borderRadius: 8,
    color: '#FFFFFF',
    textAlign: 'center',
    fontWeight: '700',
    fontSize: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  addShiftButton: {
    backgroundColor: ACCENT_TEAL,
    height: 44,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
  },
  addShiftBtnText: {
    color: BRAND_BG,
    fontSize: 13,
    fontWeight: '700',
  },
  segmentControlGroup: {
    flexDirection: 'row',
    backgroundColor: CHIP_DARK,
    borderRadius: 10,
    padding: 3,
    marginTop: 10,
    gap: 2,
  },
  dropdownGradient: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 0,
  },
  segmentItem: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  segmentItemActive: {
    backgroundColor: CARD_BG,
  },
  segmentItemText: {
    fontSize: 12,
    color: TEXT_MUTED,
    fontWeight: '600',
  },
  segmentItemTextActive: {
    color: '#FFFFFF',
  },
  rangePickersBlock: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 14,
  },
  dateRangeBox: {
    flex: 1,
    backgroundColor: CHIP_DARK,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  rangeBoxLabel: {
    fontSize: 11,
    color: TEXT_MUTED,
    textTransform: 'uppercase',
    fontWeight: '600',
    marginBottom: 4,
  },
  rangeBoxValue: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  customDateSelectorBtn: {
    flexDirection: 'row',
    backgroundColor: CHIP_DARK,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  customDateSelectBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  bulkConfigurationContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    marginBottom: 16,
  },
  bulkTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 10,
  },
  bulkApplyCheckboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
    padding: 12,
    borderRadius: 10,
    backgroundColor: CHIP_DARK,
  },
  bulkActiveRow: {
    borderColor: 'rgba(92,225,214,0.2)',
    borderWidth: 1,
  },
  checkboxShell: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: TEXT_MUTED,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: ACCENT_TEAL,
    borderColor: ACCENT_TEAL,
  },
  checkboxLabel: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  nestedDayBlock: {
    backgroundColor: BRAND_BG,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  nestedDayDateTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  nestedShiftItem: {
    marginBottom: 6,
  },
  nestedTimeBox: {
    flex: 2,
    height: 36,
    backgroundColor: CHIP_DARK,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nestedTimeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  nestedGuardsInput: {
    flex: 1,
    height: 36,
    backgroundColor: CHIP_DARK,
    borderRadius: 6,
    color: '#FFFFFF',
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
  },
  nestedAddShiftBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  nestedAddShiftText: {
    color: ACCENT_TEAL,
    fontSize: 12,
    fontWeight: '600',
  },
  multiSummary: { fontSize: 13, color: '#64748b', marginBottom: 10 },
  toggleContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    // marginTop: 10,
  },

  toggleCard: {
    width: '48%',
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },

  toggleRow: {
    padding: 13,
    minHeight: 90,
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,31,63,0.88)',
  },

  toggleContent: {
    gap: 6,
  },

  toggleLabel: {
    fontSize: 13,
    color: '#fff',
    fontWeight: '700',
    lineHeight: 20,
  },

  toggleDescription: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.65)',
    lineHeight: 18,
  },

  toggleSwitch: {
    height: 36,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    alignSelf: 'flex-start',
    minWidth: 78,
  },

  toggleSwitchActive: {
    backgroundColor: '#001F3F',
  },

  toggleKnob: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.5)',
    marginRight: 8,
  },

  toggleKnobActive: {
    backgroundColor: '#fff',
  },

  toggleText: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.7)',
  },

  toggleTextActive: {
    color: '#fff',
  },
  uploadAreaContainer: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: ACCENT_TEAL,
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  uploadTextTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 10,
  },
  uploadTextSubtitle: {
    fontSize: 11,
    color: TEXT_MUTED,
    marginTop: 2,
  },
  fileListCard: {
    backgroundColor: CARD_BG,
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
    gap: 8,
  },
  fileRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fileNameText: {
    color: '#FFFFFF',
    fontSize: 13,
    flex: 1,
  },
  summaryFooterMetricsCard: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    padding: 16,
    marginTop: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  metricsColumn: {
    flex: 1,
  },
  metricsLabel: {
    fontSize: 11,
    color: TEXT_MUTED,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  metricsValue: {
    fontSize: 16,
    fontWeight: '700',
    color: ACCENT_TEAL,
    marginTop: 2,
  },
  submissionButton: {
    backgroundColor: ACCENT_TEAL,
    paddingHorizontal: 18,
    height: 46,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submissionBtnText: {
    color: BRAND_BG,
    fontSize: 14,
    fontWeight: '700',
  },
  inputErrorBorder: {
    borderColor: ERROR_RED,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  errorText: {
    color: ERROR_RED,
    fontSize: 12,
    fontWeight: '500',
  },
  modalOverlayContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  bottomSelectionSheet: {
    backgroundColor: CARD_BG,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  selectionSheetTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  selectionOptionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  selectionOptionActive: {
    opacity: 0.9,
  },
  selectionOptionText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  iosPickerWrapperSheet: {
    backgroundColor: CARD_BG,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 16,
    paddingBottom: 30,
  },
  modalConfirmActionBtn: {
    backgroundColor: ACCENT_TEAL,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  modalConfirmActionText: {
    color: BRAND_BG,
    fontSize: 14,
    fontWeight: '700',
  },
  calendarModalSheet: {
    backgroundColor: CARD_BG,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '65%',
    padding: 20,
  },
  modalSheetTopHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalHeaderTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  calendarMonthHeadingText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  closeModalTextLink: {
    color: ACCENT_TEAL,
    fontSize: 14,
    fontWeight: '600',
  },
  calendarDaysGridMatrixScroll: {
    flex: 1,
  },
  calNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  calWeekRow: { flexDirection: 'row', marginBottom: 4 },
  calWeekDay: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  daysMatrixGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'flex-start',
  },
  emptyGridCell: {
    width: (width - 80) / 7,
    height: 40,
  },
  calendarDayCell: {
    width: (width - 80) / 7,
    height: 40,
    backgroundColor: CHIP_DARK,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCellSelected: {
    backgroundColor: ACCENT_TEAL,
  },
  calCellInRange: { backgroundColor: '#bae8f8' },
  calCellToday: {
    backgroundColor: '#f0f9ff',
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  calCellPast: { opacity: 0.3 },
  dayCellText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  dayCellTextSelected: {
    color: BRAND_BG,
    fontWeight: '700',
  },
  calCellTextPast: { color: '#94a3b8' },
  textAreaGradient: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 0,
  },
});
