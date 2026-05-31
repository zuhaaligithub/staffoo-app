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
//   Dimensions,
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
//   ChevronRight,
// } from 'lucide-react-native';
// import { Keyboard } from 'react-native';
// import LinearGradient from 'react-native-linear-gradient';

// const { width } = Dimensions.get('window');

// // ─── Default location: Sydney, Australia ────────────────────────────────────
// const DEFAULT_LOCATION = {
//   lat: -33.8688,
//   lng: 151.2093,
//   label: 'Sydney, NSW, Australia',
// };

// // ─── Color Palette Constants ──────────────────────────────────────────────────
// const BRAND_BG = '#001F3F';
// const CARD_BG = '#0A1F3D';
// const CHIP_DARK = '#1F2A44';
// const ACCENT_TEAL = '#5CE1D6';
// const TEXT_MUTED = '#94A3B8';
// const ERROR_RED = '#EF4444';

// // ─── Constants ───────────────────────────────────────────────────────────────
// const MAX_DESCRIPTION_LENGTH = 500;

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

// interface PickerTarget {
//   mode: 'single' | 'range' | 'master' | 'individual' | 'task';
//   dayIndex: number;
//   shiftIndex: number;
//   field: 'startTime' | 'endTime';
//   taskId?: string;
// }

// interface JobTask {
//   id: string;
//   startTime: Date;
//   endTime: Date;
//   title: string;
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

// const shiftDurationHours = (start: Date, end: Date): number => {
//   let diff = end.getTime() - start.getTime();
//   if (diff < 0) diff += 24 * 60 * 60 * 1000;
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

// const autoAssignGuards = (startTime: Date, endTime?: Date): string => {
//   if (endTime) {
//     const hours = shiftDurationHours(startTime, endTime);
//     if (hours <= 13) return '1';
//     if (hours <= 22) return '2';
//     return '3';
//   }
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
//   try {
//     const startTime = new Date();
//     startTime.setHours(9, 0, 0, 0);

//     const endTime = new Date();
//     endTime.setHours(17, 0, 0, 0);

//     // Create a more robust ID
//     const id = `shift-${Date.now()}-${Math.random().toString(36).slice(2)}`;

//     return {
//       id,
//       startTime,
//       endTime,
//       guardsCount: '1',
//     };
//   } catch (error) {
//     console.error('Error creating default shift:', error);
//     // Return a safe default
//     const now = new Date();
//     return {
//       id: `error-${Date.now()}`,
//       startTime: now,
//       endTime: new Date(now.getTime() + 8 * 60 * 60 * 1000), // 8 hours later
//       guardsCount: '1',
//     };
//   }
// };

// const makeDaySchedule = (date: Date): DaySchedule => ({
//   date,
//   shifts: [makeDefaultShift()],
// });

// class ScheduleErrorBoundary extends React.Component<
//   { onReset: () => void; children: React.ReactNode },
//   { hasError: boolean; errorMessage: string }
// > {
//   state = { hasError: false, errorMessage: '' };

//   static getDerivedStateFromError(error: any) {
//     return { hasError: true, errorMessage: error?.message || String(error) };
//   }

//   componentDidCatch(error: any) {
//     console.error('ScheduleErrorBoundary caught:', error);
//   }

//   render() {
//     if (this.state.hasError) {
//       return (
//         <View style={{ padding: 16 }}>
//           <Text
//             style={{ color: '#ef4444', fontWeight: '700', marginBottom: 12 }}
//           >
//             Schedule crashed. Tap Reset to continue.
//           </Text>
//           <Text style={{ color: '#fff', marginBottom: 12 }}>
//             {this.state.errorMessage}
//           </Text>
//           <TouchableOpacity
//             onPress={() => {
//               this.setState({ hasError: false, errorMessage: '' });
//               this.props.onReset();
//             }}
//             style={{
//               paddingVertical: 12,
//               paddingHorizontal: 16,
//               borderRadius: 12,
//               backgroundColor: '#3b82f6',
//               alignSelf: 'flex-start',
//             }}
//           >
//             <Text style={{ color: '#fff', fontWeight: '700' }}>Reset</Text>
//           </TouchableOpacity>
//         </View>
//       );
//     }
//     return this.props.children as any;
//   }
// }

// // ─── Main Component ───────────────────────────────────────────────────────────
// export default function CreateJobScreen() {
//   const navigation =
//     useNavigation<NativeStackNavigationProp<RootStackParamList>>();

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

//   const [scheduleMode, setScheduleMode] = useState<ScheduleMode>('single');
//   const [multiDayMode, setMultiDayMode] = useState<MultiDayMode>('individual');

//   const [singleDaySchedule, setSingleDaySchedule] = useState<DaySchedule>({
//     date: new Date(),
//     shifts: [makeDefaultShift()], // ← Change from [] to [makeDefaultShift()]
//   });

//   const [rangeFrom, setRangeFrom] = useState<Date>(new Date());
//   const [rangeTo, setRangeTo] = useState<Date>(new Date());
//   const [rangeSchedules, setRangeSchedules] = useState<DaySchedule[]>(() =>
//     datesBetween(new Date(), new Date()).map(makeDaySchedule),
//   );

//   const [individualDates, setIndividualDates] = useState<Date[]>([]);
//   const [individualSchedules, setIndividualSchedules] = useState<DaySchedule[]>(
//     [],
//   );
//   const isToday = (d: Date) => isSameDay(d, new Date());

//   const [masterStartTime, setMasterStartTime] = useState<Date | null>(null);
//   const [masterEndTime, setMasterEndTime] = useState<Date | null>(null);
//   const [masterGuards, setMasterGuards] = useState<string>('');
//   const [applyToAll, setApplyToAll] = useState(false);

//   const [pickerVisible, setPickerVisible] = useState(false);
//   const [pickerValue, setPickerValue] = useState<Date>(new Date());
//   const [pickerTarget, setPickerTarget] = useState<PickerTarget | null>(null);

//   const [calendarVisible, setCalendarVisible] = useState(false);
//   const [calendarTarget, setCalendarTarget] = useState<
//     'single' | 'rangeFrom' | 'rangeTo' | 'individual'
//   >('single');
//   const [calendarMonth, setCalendarMonth] = useState(new Date());

//   const safeDate = (v: any) => {
//     try {
//       if (!v) return new Date();

//       // Check if it's already a Date object
//       if (v instanceof Date) return v;

//       // Check if it's an object that might have been a Date
//       if (typeof v === 'object' && v !== null) {
//         // Check if it's an empty object (common serialization issue)
//         if (Object.keys(v).length === 0) {
//           console.warn(
//             'safeDate: Empty object detected, returning current date',
//           );
//           return new Date();
//         }

//         // Try to extract date from object if it has getTime method
//         if (typeof v.getTime === 'function') {
//           const timestamp = v.getTime();
//           if (!isNaN(timestamp)) {
//             return new Date(timestamp);
//           }
//         }

//         // Try to parse as string
//         const dateStr = JSON.stringify(v);
//         if (dateStr && dateStr !== '{}') {
//           const d = new Date(dateStr);
//           if (!isNaN(d.getTime())) return d;
//         }
//       }

//       // Try to parse as string or number
//       const d = new Date(v);
//       return isNaN(d.getTime()) ? new Date() : d;
//     } catch (error) {
//       console.warn('safeDate error:', error, 'value:', v, 'type:', typeof v);
//       return new Date();
//     }
//   };

//   const cleanupPickers = () => {
//     Keyboard.dismiss();
//     setPickerVisible(false);
//     setPickerTarget(null);
//     setCalendarVisible(false);
//   };

//   const resetSchedule = () => {
//     cleanupPickers();
//     setScheduleMode('single');
//     setMultiDayMode('individual');

//     const now = new Date();

//     setSingleDaySchedule({
//       date: now,
//       shifts: [], // ← Empty
//     });

//     setRangeFrom(now);
//     setRangeTo(now);
//     setRangeSchedules(datesBetween(now, now).map(makeDaySchedule));
//     setIndividualDates([]);
//     setIndividualSchedules([]);
//   };
//   const switchScheduleMode = (mode: ScheduleMode) => {
//     cleanupPickers();
//     setScheduleMode(mode);

//     if (mode === 'single') {
//       const now = new Date();
//       setSingleDaySchedule({
//         date: now,
//         shifts: [], // ← Empty when switching to single day
//       });
//     }
//   };
//   const switchMultiDayMode = (mode: MultiDayMode) => {
//     cleanupPickers();
//     setMultiDayMode(mode);
//   };

//   const [showDocModal, setShowDocModal] = useState(false);
//   const [showCategoryModal, setShowCategoryModal] = useState(false);
//   const [otherCategory, setOtherCategory] = useState('');
//   const [otherDocument, setOtherDocument] = useState('');

//   const [uploading, setUploading] = useState(false);
//   const [uploadedFilePaths, setUploadedFilePaths] = useState<string[]>([]);
//   const [selectedFiles, setSelectedFiles] = useState<
//     (ImageAsset | DocumentPickerResponse)[]
//   >([]);

//   const [errors, setErrors] = useState<FormErrors>({});

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

//   const [tasks, setTasks] = useState<JobTask[]>([]);

//   const addTask = () => {
//     const startTime = new Date();
//     startTime.setHours(9, 0, 0, 0);

//     const endTime = new Date();
//     endTime.setHours(17, 0, 0, 0);

//     const newTask: JobTask = {
//       id: Math.random().toString(36).slice(2),
//       startTime,
//       endTime,
//       title: '',
//     };
//     setTasks(prev => [...prev, newTask]);
//   };

//   const removeTask = (id: string) => {
//     setTasks(prev => prev.filter(t => t.id !== id));
//   };

//   const updateTask = (id: string, field: keyof JobTask, value: any) => {
//     setTasks(prev =>
//       prev.map(task => (task.id === id ? { ...task, [field]: value } : task)),
//     );
//   };

//   const openTaskTimePicker = (
//     taskId: string,
//     field: 'startTime' | 'endTime',
//   ) => {
//     const task = tasks.find(t => t.id === taskId);
//     if (!task) return;

//     setPickerValue(field === 'startTime' ? task.startTime : task.endTime);
//     setPickerTarget({
//       mode: 'task',
//       dayIndex: -1,
//       shiftIndex: -1,
//       field,
//       taskId,
//     });
//     setPickerVisible(true);
//   };

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
//     setSingleDaySchedule(prev => {
//       const shifts = Array.isArray(prev.shifts) ? prev.shifts : [];
//       if (!shifts[idx]) return prev;
//       return {
//         ...prev,
//         shifts: shifts.map((s, i) =>
//           i === idx ? { ...s, [field]: value } : s,
//         ),
//       };
//     });

//   const addSingleShift = () => {
//     console.log('Adding single shift, current state:', singleDaySchedule);
//     setSingleDaySchedule(prev => {
//       try {
//         const shifts = Array.isArray(prev.shifts) ? prev.shifts : [];
//         const newShift = makeDefaultShift();
//         console.log('Created new shift:', newShift);
//         return { ...prev, shifts: [...shifts, newShift] };
//       } catch (error) {
//         console.error('Error adding shift:', error);
//         // Return current state if there's an error
//         return prev;
//       }
//     });
//   };

//   const removeSingleShift = (idx: number) => {
//     console.log(
//       'Removing shift at index:',
//       idx,
//       'current shifts:',
//       singleDaySchedule.shifts,
//     );
//     cleanupPickers();

//     setSingleDaySchedule(prev => {
//       try {
//         const currentShifts = Array.isArray(prev.shifts)
//           ? [...prev.shifts]
//           : [];

//         // Validate index boundaries
//         if (idx < 0 || idx >= currentShifts.length) {
//           return prev;
//         }

//         // ✅ FIX: If it's the last remaining shift row, do NOT delete/filter it.
//         // Instead, just reset its values so the UI element key stays stable.
//         if (currentShifts.length === 1) {
//           const cleanDefault = makeDefaultShift();
//           return {
//             ...prev,
//             shifts: [
//               {
//                 ...currentShifts[0], // Keep the original ID to prevent layout crash!
//                 startTime: cleanDefault.startTime,
//                 endTime: cleanDefault.endTime,
//                 guardsCount: '1',
//               },
//             ],
//           };
//         }

//         // If there's more than 1 shift, it's completely safe to filter out the row
//         const newShifts = currentShifts.filter((_, i) => i !== idx);
//         return {
//           ...prev,
//           shifts: newShifts,
//         };
//       } catch (error) {
//         console.error('Error removing shift:', error);
//         return prev;
//       }
//     });
//   };
//   // ✅ FIXED: Crash protected range shift removal with deep cloning
//   const removeRangeShift = (di: number, si: number) => {
//     cleanupPickers();
//     setRangeSchedules(prev => {
//       if (!prev || !prev[di]) return prev;

//       // Create a deep copy of the array and nested shifts to prevent crashes
//       const newSchedules = prev.map((day, dayIdx) => {
//         if (dayIdx !== di) return day;
//         return {
//           ...day,
//           shifts: day.shifts
//             ? day.shifts.filter((_, shiftIdx) => shiftIdx !== si)
//             : [],
//         };
//       });

//       // Filter out days with no shifts
//       const filtered = newSchedules.filter(day => day.shifts.length > 0);

//       // If all days removed, keep at least one day with one shift safely
//       if (filtered.length === 0) {
//         return [makeDaySchedule(rangeFrom)];
//       }

//       return filtered;
//     });
//   };

//   // ✅ FIXED: Crash protected individual shift removal with deep cloning
//   const removeIndividualShift = (di: number, si: number) => {
//     cleanupPickers();
//     setIndividualSchedules(prev => {
//       if (!prev || !prev[di]) return prev;

//       // Create a deep copy of the array and nested shifts to prevent crashes
//       const newSchedules = prev.map((day, dayIdx) => {
//         if (dayIdx !== di) return day;
//         return {
//           ...day,
//           shifts: day.shifts
//             ? day.shifts.filter((_, shiftIdx) => shiftIdx !== si)
//             : [],
//         };
//       });

//       // Filter out days with no shifts
//       const filtered = newSchedules.filter(day => day.shifts.length > 0);

//       // Update individual dates to match remaining schedules safely
//       if (filtered.length < prev.length) {
//         setIndividualDates(filtered.map(d => d.date));
//       }

//       return filtered;
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
//       if (!days[di] || !days[di].shifts?.[si]) return prev;
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
//       if (!days[di]) return prev;
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
//       if (!days[di] || !days[di].shifts?.[si]) return prev;
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
//       if (!days[di]) return prev;
//       days[di] = {
//         ...days[di],
//         shifts: [...days[di].shifts, makeDefaultShift()],
//       };
//       return days;
//     });

//   const openTimePicker = (
//     mode: 'single' | 'range' | 'individual',
//     dayIndex: number,
//     shiftIndex: number,
//     field: 'startTime' | 'endTime',
//   ) => {
//     let currentVal: Date;
//     if (mode === 'single') {
//       currentVal = safeDate(singleDaySchedule.shifts?.[shiftIndex]?.[field]);
//     } else if (mode === 'individual') {
//       currentVal = safeDate(
//         individualSchedules[dayIndex]?.shifts?.[shiftIndex]?.[field],
//       );
//     } else {
//       currentVal = safeDate(
//         rangeSchedules[dayIndex]?.shifts?.[shiftIndex]?.[field],
//       );
//     }
//     setPickerValue(currentVal);
//     setPickerTarget({ mode, dayIndex, shiftIndex, field });
//     setPickerVisible(true);
//   };

//   // ✅ FIXED: Improved applyTimeChange with proper cleanup
//   // const applyTimeChange = (selectedDate: Date) => {
//   //   if (!pickerTarget) return;

//   //   const { mode, dayIndex, shiftIndex, field, taskId } = pickerTarget;

//   //   if (mode === 'master') {
//   //     if (field === 'startTime') setMasterStartTime(selectedDate);
//   //     else setMasterEndTime(selectedDate);
//   //     if (applyToAll)
//   //       applyMasterToAll(
//   //         field === 'startTime' ? selectedDate : masterStartTime,
//   //         field === 'endTime' ? selectedDate : masterEndTime,
//   //         masterGuards,
//   //       );
//   //     setPickerTarget(null); // ✅ Cleanup
//   //     return;
//   //   }

//   //   if (mode === 'task' && taskId) {
//   //     setTasks(prev =>
//   //       prev.map(task => {
//   //         if (task.id !== taskId) return task;

//   //         if (field === 'startTime') {
//   //           return { ...task, startTime: selectedDate };
//   //         } else {
//   //           return { ...task, endTime: selectedDate };
//   //         }
//   //       }),
//   //     );
//   //     setPickerTarget(null); // ✅ Cleanup
//   //     return;
//   //   }

//   //   let currentShift: Shift | undefined;
//   //   const isSingle = mode === 'single';

//   //   if (isSingle) {
//   //     currentShift = singleDaySchedule.shifts?.[shiftIndex];
//   //   } else if (mode === 'individual') {
//   //     currentShift = individualSchedules[dayIndex]?.shifts[shiftIndex];
//   //   } else {
//   //     currentShift = rangeSchedules[dayIndex]?.shifts[shiftIndex];
//   //   }

//   //   if (!currentShift) {
//   //     setPickerTarget(null); // ✅ Cleanup
//   //     return;
//   //   }

//   //   const baseStart = safeDate(currentShift.startTime);
//   //   const baseEnd = safeDate(currentShift.endTime);

//   //   let newStart =
//   //     field === 'startTime'
//   //       ? combineDateAndTime(baseStart, selectedDate)
//   //       : baseStart;

//   //   let newEnd =
//   //     field === 'endTime' ? combineDateAndTime(baseEnd, selectedDate) : baseEnd;

//   //   if (newEnd <= newStart) {
//   //     newEnd = new Date(newEnd.getTime() + 24 * 60 * 60 * 1000);
//   //   }

//   //   const hours = shiftDurationHours(newStart, newEnd);

//   //   if (field === 'endTime' && hours > 13) {
//   //     const splits = splitShift(newStart, newEnd);

//   //     const newShifts = splits.map(s => ({
//   //       id: Math.random().toString(36).slice(2),
//   //       startTime: new Date(s.startTime),
//   //       endTime: new Date(s.endTime),
//   //       guardsCount: '1',
//   //     }));

//   //     Toast.show({
//   //       type: 'info',
//   //       text1: 'Shift Split',
//   //       text2: `Long shift (${hours.toFixed(1)}h) split into ${
//   //         splits.length
//   //       } parts`,
//   //       position: 'bottom',
//   //       visibilityTime: 2500,
//   //     });

//   //     if (isSingle) {
//   //       const grouped: DaySchedule[] = [];
//   //       newShifts.forEach(shift => {
//   //         const d = new Date(shift.startTime);
//   //         d.setHours(0, 0, 0, 0);
//   //         let day = grouped.find(ds => isSameDay(ds.date, d));
//   //         if (!day) {
//   //           day = { date: d, shifts: [] };
//   //           grouped.push(day);
//   //         }
//   //         day.shifts.push(shift);
//   //       });

//   //       if (grouped.length > 1) {
//   //         setScheduleMode('range');
//   //         setMultiDayMode('individual');
//   //         setIndividualDates(grouped.map(g => g.date));
//   //         setIndividualSchedules(grouped);
//   //       } else {
//   //         setSingleDaySchedule(grouped[0]);
//   //       }
//   //     } else {
//   //       const setFn =
//   //         mode === 'individual' ? setIndividualSchedules : setRangeSchedules;
//   //       setFn((prev: DaySchedule[]) => {
//   //         const newList = [...prev];
//   //         const target = newList[dayIndex];
//   //         if (!target) return prev;

//   //         target.shifts = target.shifts.filter((_, i) => i !== shiftIndex);

//   //         newShifts.forEach(shift => {
//   //           const shiftDate = new Date(shift.startTime);
//   //           shiftDate.setHours(0, 0, 0, 0);
//   //           let idx = newList.findIndex(d => isSameDay(d.date, shiftDate));
//   //           if (idx === -1) {
//   //             newList.push({ date: shiftDate, shifts: [] });
//   //             idx = newList.length - 1;
//   //           }
//   //           newList[idx].shifts.push(shift);
//   //         });

//   //         return newList.sort((a, b) => a.date.getTime() - b.date.getTime());
//   //       });
//   //     }
//   //     setPickerTarget(null); // ✅ Cleanup
//   //     return;
//   //   }

//   //   const updateValue = field === 'startTime' ? newStart : newEnd;
//   //   if (isSingle) {
//   //     updateSingleShift(shiftIndex, field, updateValue);
//   //   } else if (mode === 'individual') {
//   //     updateIndividualShift(dayIndex, shiftIndex, field, updateValue);
//   //   } else {
//   //     updateRangeShift(dayIndex, shiftIndex, field, updateValue);
//   //   }

//   //   setPickerTarget(null); // ✅ Cleanup
//   // };

//   // ✅ FIXED: Crash protected function with safe array filtering and state mutation protection
//   const applyTimeChange = (selectedDate: Date) => {
//     if (!pickerTarget) return;

//     const { mode, dayIndex, shiftIndex, field, taskId } = pickerTarget;

//     if (mode === 'master') {
//       if (field === 'startTime') setMasterStartTime(selectedDate);
//       else setMasterEndTime(selectedDate);
//       if (applyToAll)
//         applyMasterToAll(
//           field === 'startTime' ? selectedDate : masterStartTime,
//           field === 'endTime' ? selectedDate : masterEndTime,
//           masterGuards,
//         );
//       setPickerTarget(null);
//       return;
//     }

//     if (mode === 'task' && taskId) {
//       setTasks(prev =>
//         prev.map(task => {
//           if (task.id !== taskId) return task;
//           return field === 'startTime'
//             ? { ...task, startTime: selectedDate }
//             : { ...task, endTime: selectedDate };
//         }),
//       );
//       setPickerTarget(null);
//       return;
//     }

//     let currentShift: Shift | undefined;
//     const isSingle = mode === 'single';

//     if (isSingle) {
//       currentShift = singleDaySchedule?.shifts?.[shiftIndex];
//     } else if (mode === 'individual') {
//       currentShift = individualSchedules?.[dayIndex]?.shifts?.[shiftIndex];
//     } else {
//       currentShift = rangeSchedules?.[dayIndex]?.shifts?.[shiftIndex];
//     }

//     // Safe Check: Agar shift nahi milti to safely exit karega, crash nahi hoga
//     if (!currentShift) {
//       setPickerTarget(null);
//       return;
//     }

//     const baseStart = safeDate(currentShift.startTime);
//     const baseEnd = safeDate(currentShift.endTime);

//     let newStart =
//       field === 'startTime'
//         ? combineDateAndTime(baseStart, selectedDate)
//         : baseStart;
//     let newEnd =
//       field === 'endTime' ? combineDateAndTime(baseEnd, selectedDate) : baseEnd;

//     if (newEnd <= newStart) {
//       newEnd = new Date(newEnd.getTime() + 24 * 60 * 60 * 1000);
//     }

//     const hours = shiftDurationHours(newStart, newEnd);

//     // ─── SHIFT SPLITTING & SAFE DELETION LOGIC ────────────────────────────────
//     if (field === 'endTime' && hours > 13) {
//       const splits = splitShift(newStart, newEnd);
//       const newShifts = splits.map(s => ({
//         id: Math.random().toString(36).slice(2),
//         startTime: new Date(s.startTime),
//         endTime: new Date(s.endTime),
//         guardsCount: currentShift?.guardsCount || '1', // fallback to original shift guards count
//       }));

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
//           setSingleDaySchedule(grouped[0] || { date: new Date(), shifts: [] });
//         }
//       } else {
//         const setFn =
//           mode === 'individual' ? setIndividualSchedules : setRangeSchedules;

//         setFn((prev: DaySchedule[]) => {
//           if (!prev || !prev[dayIndex]) return prev; // Safe boundary check

//           // Deep clone structure to prevent direct mutation crashes
//           const newList = prev.map(item => ({
//             ...item,
//             shifts: item.shifts ? [...item.shifts] : [],
//           }));

//           const target = newList[dayIndex];

//           // Remove the old long shift safely using filtering
//           target.shifts = target.shifts.filter((_, i) => i !== shiftIndex);

//           // Inject new split shifts safely into respective dates
//           newShifts.forEach(shift => {
//             const shiftDate = new Date(shift.startTime);
//             shiftDate.setHours(0, 0, 0, 0);

//             let idx = newList.findIndex(d => isSameDay(d.date, shiftDate));
//             if (idx === -1) {
//               newList.push({ date: shiftDate, shifts: [shift] });
//             } else {
//               newList[idx].shifts.push(shift);
//             }
//           });

//           return newList.sort((a, b) => a.date.getTime() - b.date.getTime());
//         });
//       }
//       setPickerTarget(null);
//       return;
//     }
//     // ─── END OF SPLITTING LOGIC ──────────────────────────────────────────────

//     const updateValue = field === 'startTime' ? newStart : newEnd;

//     if (isSingle) {
//       updateSingleShift(shiftIndex, field, updateValue);
//     } else if (mode === 'individual') {
//       updateIndividualShift(dayIndex, shiftIndex, field, updateValue);
//     } else {
//       updateRangeShift(dayIndex, shiftIndex, field, updateValue);
//     }

//     setPickerTarget(null);
//   };

//   const onTimePickerChange = (_: any, selectedDate?: Date) => {
//     if (Platform.OS === 'android') {
//       setPickerVisible(false);
//       if (selectedDate) {
//         applyTimeChange(selectedDate);
//       } else {
//         setPickerTarget(null); // ✅ Cleanup on cancel
//       }
//     } else {
//       if (selectedDate) setPickerValue(selectedDate);
//     }
//   };

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
//       return individualDates.some(date => isSameDay(date, d));
//     }
//     return false;
//   };

//   const isDayInRange = (d: Date) => {
//     if (calendarTarget === 'individual') return false;
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
//       setSingleDaySchedule({
//         date: d,
//         shifts: [], // ← Now starts empty, no default shift
//       });
//     } else if (calendarTarget === 'rangeFrom') {
//       setRangeFrom(d);
//       if (d > rangeTo) setRangeTo(d);
//     } else if (calendarTarget === 'rangeTo') {
//       setRangeTo(d);
//       if (d < rangeFrom) setRangeFrom(d);
//     } else if (calendarTarget === 'individual') {
//       setIndividualDates(prev => {
//         const exists = prev.find(p => isSameDay(p, d));
//         return exists
//           ? prev.filter(p => !isSameDay(p, d))
//           : [...prev, d].sort((a, b) => a.getTime() - b.getTime());
//       });
//     }

//     if (calendarTarget !== 'individual') {
//       setCalendarVisible(false);
//     }
//   };

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
//         (Array.isArray(day.shifts) ? day.shifts : []).reduce(
//           (dTotal, shift) => {
//             const h = shiftDurationHours(
//               safeDate(shift.startTime),
//               safeDate(shift.endTime),
//             );
//             const g = Math.max(
//               1,
//               parseInt(String(shift.guardsCount || '1'), 10),
//             );

//             return dTotal + h * g;
//           },
//           0,
//         ),
//       0,
//     );
//   }, [
//     scheduleMode,
//     multiDayMode,
//     singleDaySchedule,
//     rangeSchedules,
//     individualSchedules,
//   ]);

//   // ADD THIS HERE ↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓

//   // const gstPercentage = 10;
//   // const discountPercentage = 5;
//   // const hourlyRate = 45;

//   // const subtotal = totalManHours * hourlyRate;

//   // const gstAmount = subtotal * (gstPercentage / 100);

//   // const totalQuotation = subtotal + gstAmount;

//   // const discountAmount = totalQuotation * (discountPercentage / 100);

//   // const payableNow = totalQuotation - discountAmount;

//   // const splitAmount = totalQuotation / 2;

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

//   const validateAndNext = () => {
//     const newErrors: FormErrors = {};

//     if (!form.category) newErrors.category = 'Please select a job category';
//     if (form.category === 'others' && !otherCategory.trim()) {
//       newErrors.category = 'Please enter job category';
//     }
//     if (!form.description?.trim()) {
//       newErrors.description = 'Description is required';
//     }
//     if (!form.location?.trim()) {
//       newErrors.location = 'Location is required';
//     }

//     setErrors(newErrors);

//     if (Object.keys(newErrors).length > 0) {
//       Alert.alert('Incomplete Form', 'Please fill all required fields');
//       return;
//     }

//     // Get active schedules
//     const activeSchedules =
//       scheduleMode === 'single'
//         ? [singleDaySchedule]
//         : multiDayMode === 'individual'
//         ? individualSchedules
//         : rangeSchedules;

//     const first = activeSchedules[0];
//     const last = activeSchedules[activeSchedules.length - 1];

//     // === Payment Calculations (5% Discount + 50/50 Split) ===
//     const hourlyRate = 45; // You can change this later
//     const gstPercentage = 10;
//     const discountPercentage = 5; // 5% off for full payment

//     const subtotal = totalManHours * hourlyRate;
//     const gstAmount = subtotal * (gstPercentage / 100);
//     const totalQuotation = subtotal + gstAmount;

//     const discountAmount = totalQuotation * (discountPercentage / 100);
//     const payableNow = totalQuotation - discountAmount; // Full payment with 5% discount
//     const splitAmount = totalQuotation / 2; // 50% upfront for split option

//     navigation.navigate('ReviewConfirm', {
//       jobData: {
//         category:
//           form.category === 'others' ? otherCategory.trim() : form.category,

//         location: form.location || 'Not specified',

//         lat: form.lat ?? DEFAULT_LOCATION.lat,
//         lng: form.lng ?? DEFAULT_LOCATION.lng,

//         description: form.description || '',

//         startDate: first.date,
//         startTime: first.shifts[0]?.startTime ?? new Date(),

//         endDate: last.date,
//         endTime: last.shifts[last.shifts.length - 1]?.endTime ?? new Date(),

//         shifts: activeSchedules.flatMap(day =>
//           day.shifts.map(s => ({
//             date: day.date,
//             startTime: s.startTime,
//             endTime: s.endTime,
//             guardsCount: Number(s.guardsCount ?? 1),
//           })),
//         ),

//         totalManHours,

//         // Payment Calculations Passed to Review Screen
//         subtotal: parseFloat(subtotal.toFixed(2)),
//         gstAmount: parseFloat(gstAmount.toFixed(2)),
//         totalQuotation: parseFloat(totalQuotation.toFixed(2)),
//         discountAmount: parseFloat(discountAmount.toFixed(2)),
//         payableNow: parseFloat(payableNow.toFixed(2)),
//         splitAmount: parseFloat(splitAmount.toFixed(2)),
//         totalAmount: parseFloat(payableNow.toFixed(2)),

//         tasks: tasks.map(t => ({
//           title: t.title || 'Untitled Task',
//           startTime: t.startTime,
//           endTime: t.endTime,
//         })),
//       },

//       uploadedFileUrls: uploadedFilePaths,
//       selectedDocuments: documentTypes,
//     });
//   };

//   const toggleDocument = (docValue: string) => {
//     let updated = [...form.documents];

//     if (updated.includes(docValue)) {
//       updated = updated.filter(d => d !== docValue);
//     } else {
//       updated.push(docValue);
//     }

//     setForm({ ...form, documents: updated });
//   };

//   const renderBulkApply = () => (
//     <View style={styles.bulkConfigurationContainer}>
//       <Text style={styles.bulkTitle}>Bulk Shift Overwrite Matrix</Text>

//       <View style={styles.timeInputsRow}>
//         <TouchableOpacity
//           style={styles.timeSelectorBox}
//           onPress={() => openMasterTimePicker('startTime')}
//         >
//           <Clock size={14} color={TEXT_MUTED} />
//           <Text style={styles.timeSelectorValue}>
//             {masterStartTime ? formatTime(masterStartTime) : 'Set Start'}
//           </Text>
//         </TouchableOpacity>
//         <ArrowRight size={14} color={TEXT_MUTED} />
//         <TouchableOpacity
//           style={styles.timeSelectorBox}
//           onPress={() => openMasterTimePicker('endTime')}
//         >
//           <Clock size={14} color={TEXT_MUTED} />
//           <Text style={styles.timeSelectorValue}>
//             {masterEndTime ? formatTime(masterEndTime) : 'Set End'}
//           </Text>
//         </TouchableOpacity>
//       </View>

//       <View style={styles.guardsCounterBlock}>
//         <Text style={styles.fieldLabelSub}>Master Guards Count</Text>
//         <TextInput
//           style={styles.guardsMiniInput}
//           placeholder="Auto"
//           placeholderTextColor={TEXT_MUTED}
//           keyboardType="numeric"
//           value={masterGuards}
//           onChangeText={onMasterGuardsChange}
//         />
//       </View>

//       <TouchableOpacity
//         style={[
//           styles.bulkApplyCheckboxRow,
//           applyToAll && styles.bulkActiveRow,
//         ]}
//         onPress={handleApplyToAllToggle}
//       >
//         <View
//           style={[styles.checkboxShell, applyToAll && styles.checkboxChecked]}
//         >
//           {applyToAll && <Check size={12} color={BRAND_BG} />}
//         </View>
//         <Text style={styles.checkboxLabel}>
//           Enforce pattern parameters across layout
//         </Text>
//       </TouchableOpacity>
//     </View>
//   );

//   const renderDayShiftList = (
//     schedules: DaySchedule[],
//     mode: 'range' | 'individual',
//     addFn: (di: number) => void,
//     removeFn: (di: number, si: number) => void,
//   ) => (
//     <>
//       {schedules.map((daySchedule, dIdx) => (
//         <View
//           key={daySchedule.date.toISOString()}
//           style={styles.nestedDayBlock}
//         >
//           <Text style={styles.nestedDayDateTitle}>
//             {formatDate(daySchedule.date)}
//           </Text>
//           {daySchedule.shifts.map((shift, sIdx) => (
//             <View key={shift.id} style={styles.nestedShiftItem}>
//               <View style={styles.timeInputsRow}>
//                 <TouchableOpacity
//                   style={styles.nestedTimeBox}
//                   onPress={() => openTimePicker(mode, dIdx, sIdx, 'startTime')}
//                 >
//                   <Text style={styles.nestedTimeText}>
//                     {formatTime(shift.startTime)}
//                   </Text>
//                 </TouchableOpacity>
//                 <TouchableOpacity
//                   style={styles.nestedTimeBox}
//                   onPress={() => openTimePicker(mode, dIdx, sIdx, 'endTime')}
//                 >
//                   <Text style={styles.nestedTimeText}>
//                     {formatTime(shift.endTime)}
//                   </Text>
//                 </TouchableOpacity>
//                 <TextInput
//                   style={styles.nestedGuardsInput}
//                   keyboardType="numeric"
//                   value={shift.guardsCount}
//                   onChangeText={val =>
//                     mode === 'individual'
//                       ? updateIndividualShift(dIdx, sIdx, 'guardsCount', val)
//                       : updateRangeShift(dIdx, sIdx, 'guardsCount', val)
//                   }
//                 />
//                 <TouchableOpacity onPress={() => removeFn(dIdx, sIdx)}>
//                   <Trash2 size={14} color={ERROR_RED} />
//                 </TouchableOpacity>
//               </View>
//             </View>
//           ))}
//           {daySchedule.shifts.length > 0 && (
//             <TouchableOpacity
//               style={styles.nestedAddShiftBtn}
//               onPress={() => addFn(dIdx)}
//             >
//               <Plus size={12} color={ACCENT_TEAL} />
//               <Text style={styles.nestedAddShiftText}>Add Shift</Text>
//             </TouchableOpacity>
//           )}
//         </View>
//       ))}
//     </>
//   );

//   const renderIndividualDates = () => (
//     <View>
//       <Text style={styles.fieldLabelSub}>SELECT DATES (Tap to toggle)</Text>

//       <TouchableOpacity
//         style={styles.customDateSelectorBtn}
//         onPress={openIndividualDatePicker}
//       >
//         <Calendar size={16} color={ACCENT_TEAL} />
//         <Text style={styles.customDateSelectBtnText}>
//           {individualDates.length > 0
//             ? `${individualDates.length} Dates Configured`
//             : 'Select Target Dates'}
//         </Text>
//       </TouchableOpacity>

//       {individualDates.length > 0 && (
//         <>
//           {renderBulkApply()}
//           {renderDayShiftList(
//             individualSchedules,
//             'individual',
//             addIndividualShift,
//             removeIndividualShift,
//           )}
//         </>
//       )}

//       {individualDates.length === 0 && (
//         <Text
//           style={{
//             color: TEXT_MUTED,
//             textAlign: 'center',
//             marginVertical: 20,
//             fontSize: 13,
//           }}
//         >
//           No dates selected yet. Tap "Select Target Dates" above.
//         </Text>
//       )}
//     </View>
//   );

//   const renderDateRangeContent = () => (
//     <View>
//       <View style={styles.rangePickersBlock}>
//         <TouchableOpacity
//           style={styles.dateRangeBox}
//           onPress={() => {
//             setCalendarTarget('rangeFrom');
//             setCalendarVisible(true);
//           }}
//         >
//           <Text style={styles.rangeBoxLabel}>From</Text>
//           <Text style={styles.rangeBoxValue}>{formatDate(rangeFrom)}</Text>
//         </TouchableOpacity>
//         <TouchableOpacity
//           style={styles.dateRangeBox}
//           onPress={() => {
//             setCalendarTarget('rangeTo');
//             setCalendarVisible(true);
//           }}
//         >
//           <Text style={styles.rangeBoxLabel}>To</Text>
//           <Text style={styles.rangeBoxValue}>{formatDate(rangeTo)}</Text>
//         </TouchableOpacity>
//       </View>

//       <Text style={styles.multiSummary}>
//         {rangeSchedules.length} day{rangeSchedules.length !== 1 ? 's' : ''}{' '}
//         selected
//       </Text>

//       {renderBulkApply()}
//       {renderDayShiftList(
//         rangeSchedules,
//         'range',
//         addRangeShift,
//         removeRangeShift,
//       )}
//     </View>
//   );

//   const renderMultipleDays = () => (
//     <View>
//       <Text style={styles.fieldLabelSub}>Multi-Day Distribution</Text>
//       <View style={styles.segmentControlGroup}>
//         <TouchableOpacity
//           style={[
//             styles.segmentItem,
//             multiDayMode === 'range' && styles.segmentItemActive,
//           ]}
//           onPress={() => switchMultiDayMode('range')}
//         >
//           <Text
//             style={[
//               styles.segmentItemText,
//               multiDayMode === 'range' && styles.segmentItemTextActive,
//             ]}
//           >
//             Continuous Range
//           </Text>
//         </TouchableOpacity>
//         <TouchableOpacity
//           style={[
//             styles.segmentItem,
//             multiDayMode === 'individual' && styles.segmentItemActive,
//           ]}
//           onPress={() => switchMultiDayMode('individual')}
//         >
//           <Text
//             style={[
//               styles.segmentItemText,
//               multiDayMode === 'individual' && styles.segmentItemTextActive,
//             ]}
//           >
//             Specific Dates
//           </Text>
//         </TouchableOpacity>
//       </View>
//       {multiDayMode === 'individual'
//         ? renderIndividualDates()
//         : renderDateRangeContent()}
//     </View>
//   );

//   const confirmDeleteSingleShift = (shiftIndex: number) => {
//     const currentShifts = Array.isArray(singleDaySchedule.shifts)
//       ? singleDaySchedule.shifts
//       : [];

//     if (currentShifts.length === 0) return;

//     // Validate shift index
//     if (shiftIndex < 0 || shiftIndex >= currentShifts.length) {
//       console.warn(`Invalid shift index for deletion: ${shiftIndex}`);
//       return;
//     }

//     cleanupPickers();

//     Alert.alert(
//       'Delete Shift',
//       currentShifts.length === 1
//         ? 'This is the only shift. It cannot be deleted (a default shift will be kept).'
//         : 'Are you sure you want to delete this shift?',
//       [
//         { text: 'Cancel', style: 'cancel' },
//         {
//           text: 'Delete',
//           style: 'destructive',
//           onPress: () => {
//             // Double-check shift index before deletion
//             const updatedShifts = Array.isArray(singleDaySchedule.shifts)
//               ? singleDaySchedule.shifts
//               : [];
//             if (shiftIndex < 0 || shiftIndex >= updatedShifts.length) {
//               console.warn(
//                 `Shift index ${shiftIndex} invalid after alert, skipping deletion`,
//               );
//               return;
//             }
//             removeSingleShift(shiftIndex);
//           },
//         },
//       ],
//       { cancelable: true },
//     );
//   };

//   // Replace the whole renderShiftRow function with this:
//   const renderShiftRow = (
//     shift: Shift | undefined,
//     shiftIndex: number,
//     shiftsInDay: number,
//   ) => {
//     try {
//       // Add validation to prevent crashes
//       if (!shift) {
//         console.warn(`Shift at index ${shiftIndex} is undefined or null`);
//         return null;
//       }

//       // Check if singleDaySchedule is valid
//       if (!singleDaySchedule) {
//         console.error('singleDaySchedule is undefined or null');
//         return null;
//       }

//       // Additional safety check - ensure shift index is valid
//       const currentShifts = Array.isArray(singleDaySchedule.shifts)
//         ? singleDaySchedule.shifts
//         : [];
//       if (shiftIndex < 0 || shiftIndex >= currentShifts.length) {
//         console.warn(
//           `Invalid shift index: ${shiftIndex}, shifts length: ${currentShifts.length}`,
//         );
//         return null;
//       }

//       // Ensure shift has required properties
//       const safeShift = {
//         id: shift.id || `temp-${shiftIndex}-${Date.now()}`,
//         startTime: shift.startTime || new Date(),
//         endTime: shift.endTime || new Date(),
//         guardsCount: shift.guardsCount || '1',
//       };

//       const startTime = safeDate(safeShift.startTime);
//       const endTime = safeDate(safeShift.endTime);
//       const isNextDayEnd =
//         endTime.getDate() !== startTime.getDate() ||
//         endTime.getMonth() !== startTime.getMonth();

//       return (
//         <View key={String(safeShift.id)} style={{ marginBottom: 8 }}>
//           <View style={styles.shiftRow}>
//             <View style={styles.shiftDateCol}>
//               {shiftIndex === 0 ? (
//                 <>
//                   <Text style={styles.shiftDateDay}>
//                     {singleDaySchedule.date
//                       ? singleDaySchedule.date.getDate()
//                       : '?'}
//                   </Text>
//                   <Text style={styles.shiftDateMonth}>
//                     {singleDaySchedule.date
//                       ? singleDaySchedule.date.toLocaleString('default', {
//                           month: 'short',
//                         })
//                       : '???'}
//                   </Text>
//                 </>
//               ) : (
//                 <View style={styles.shiftContinueLine} />
//               )}
//             </View>

//             <View style={styles.shiftMiddle}>
//               <TouchableOpacity
//                 style={styles.shiftTimeBtn}
//                 onPress={() =>
//                   openTimePicker('single', 0, shiftIndex, 'startTime')
//                 }
//               >
//                 <Clock size={13} color="#0A7C6E" />
//                 <Text style={styles.shiftTimeTxt}>{formatTime(startTime)}</Text>
//               </TouchableOpacity>

//               <Text style={styles.shiftTimeSep}>→</Text>

//               <TouchableOpacity
//                 style={styles.shiftTimeBtn}
//                 onPress={() =>
//                   openTimePicker('single', 0, shiftIndex, 'endTime')
//                 }
//               >
//                 <Clock size={13} color="#64748b" />
//                 <Text style={styles.shiftTimeTxt}>{formatTime(endTime)}</Text>
//                 {isNextDayEnd && <Text style={styles.nextDayBadge}>+1d</Text>}
//               </TouchableOpacity>
//             </View>

//             <View style={styles.shiftGuardsCol}>
//               <TextInput
//                 style={styles.guardsSmallInput}
//                 keyboardType="numeric"
//                 value={String(safeShift.guardsCount ?? '')}
//                 onChangeText={val =>
//                   updateSingleShift(shiftIndex, 'guardsCount', val)
//                 }
//                 maxLength={3}
//               />
//             </View>

//             {shiftsInDay > 1 && (
//               <TouchableOpacity
//                 style={styles.shiftDeleteBtn}
//                 onPress={() => confirmDeleteSingleShift(shiftIndex)}
//                 activeOpacity={0.7}
//               >
//                 <Trash2 size={18} color="#ef4444" />
//               </TouchableOpacity>
//             )}
//           </View>
//         </View>
//       );
//     } catch (error) {
//       console.error('Error rendering shift row:', error, {
//         shiftIndex,
//         shiftsInDay,
//         shift,
//       });
//       return null;
//     }
//   };

//   const renderSingleDay = () => {
//     try {
//       const shifts = Array.isArray(singleDaySchedule.shifts)
//         ? singleDaySchedule.shifts
//         : [];

//       return (
//         <View>
//           <TouchableOpacity
//             style={styles.dateSelectBtn}
//             onPress={() => {
//               setCalendarTarget('single');
//               setCalendarVisible(true);
//             }}
//           >
//             <Calendar size={16} color="#0A7C6E" />
//             <Text style={styles.dateSelectTxt}>
//               {singleDaySchedule.date
//                 ? singleDaySchedule.date.toLocaleDateString('en-GB', {
//                     weekday: 'short',
//                     day: '2-digit',
//                     month: 'short',
//                     year: 'numeric',
//                   })
//                 : 'Select date'}
//             </Text>
//             <ChevronDown size={16} color="#64748b" />
//           </TouchableOpacity>

//           <View style={styles.shiftHeaderRow}>
//             <Text style={[styles.shiftHeaderTxt, { width: 44 }]}>Date</Text>
//             <Text style={[styles.shiftHeaderTxt, { flex: 2 }]}>
//               Start → End
//             </Text>
//             <Text style={[styles.shiftHeaderTxt, { width: 56 }]}>Guards</Text>
//             <View style={{ width: 28 }} />
//           </View>

//           {shifts.map((shift, idx) =>
//             renderShiftRow(shift, idx, shifts.length),
//           )}

//           {shifts.length > 0 && (
//             <TouchableOpacity
//               style={[styles.addShiftBtn, { marginLeft: 44, marginBottom: 4 }]}
//               onPress={addSingleShift}
//             >
//               <Plus size={15} color="#0A7C6E" />
//               <Text style={styles.addShiftTxt}>Add Shift</Text>
//             </TouchableOpacity>
//           )}

//           {/* Add this below it so user can add shift even if none exist */}
//           {shifts.length === 0 && (
//             <TouchableOpacity
//               style={[styles.addShiftBtn, { marginLeft: 44, marginBottom: 4 }]}
//               onPress={addSingleShift}
//             >
//               <Plus size={15} color="#0A7C6E" />
//               <Text style={styles.addShiftTxt}>Add First Shift</Text>
//             </TouchableOpacity>
//           )}
//         </View>
//       );
//     } catch (error) {
//       console.error('Error rendering single day:', error, {
//         singleDaySchedule,
//       });
//       return (
//         <View style={{ padding: 16 }}>
//           <Text style={{ color: '#ef4444' }}>
//             Error rendering schedule. Please try again.
//           </Text>
//         </View>
//       );
//     }
//   };

//   return (
//     <SafeAreaView style={styles.container}>
//       <StatusBar barStyle="light-content" backgroundColor={BRAND_BG} />
//       <KeyboardAvoidingView
//         behavior={Platform.OS === 'ios' ? 'padding' : undefined}
//         style={{ flex: 1 }}
//       >
//         <View style={styles.headerRow}>
//           <TouchableOpacity
//             onPress={() => navigation.navigate('Profile')}
//             style={styles.backBtn}
//           >
//             <ArrowLeft size={20} color={ACCENT_TEAL} />
//           </TouchableOpacity>
//           <Text style={styles.headerTitle}>Create Job</Text>
//           <View style={{ width: 40 }} />
//         </View>

//         <ScrollView
//           contentContainerStyle={styles.scrollContainer}
//           keyboardShouldPersistTaps="handled"
//           bounces={false}
//         >
//           <View style={styles.formContainer}>
//             <Text style={styles.inputLabel}>Operational Location *</Text>

//             <LinearGradient
//               colors={[
//                 'rgba(255, 255, 255, 0.41)',
//                 'rgba(255,255,255,0.35)',
//                 'rgba(255, 255, 255, 0.2)',
//                 'rgba(255,255,255,0.10)',
//                 'rgba(255, 255, 255, 0.22)',
//               ]}
//               start={{ x: 0, y: 0 }}
//               end={{ x: 1, y: 1 }}
//               style={[
//                 styles.searchGradient,
//                 errors.location && styles.inputErrorBorder,
//               ]}
//             >
//               <View style={styles.searchBarContainer}>
//                 <Search
//                   size={18}
//                   color={TEXT_MUTED}
//                   style={styles.searchIcon}
//                 />
//                 <TextInput
//                   style={styles.searchBarInput}
//                   placeholder="Search deployment address..."
//                   placeholderTextColor={TEXT_MUTED}
//                   value={autocompleteQuery || form.location}
//                   onChangeText={setAutocompleteQuery}
//                 />
//               </View>
//             </LinearGradient>

//             {errors.location && (
//               <View style={styles.errorRow}>
//                 <AlertCircle size={12} color={ERROR_RED} />
//                 <Text style={styles.errorText}>{errors.location}</Text>
//               </View>
//             )}

//             {loadingSuggestions && (
//               <ActivityIndicator
//                 size="small"
//                 color={ACCENT_TEAL}
//                 style={{ marginTop: 10 }}
//               />
//             )}

//             {suggestions.length > 0 && (
//               <View style={styles.suggestionsContainer}>
//                 {suggestions.map((item, index) => (
//                   <TouchableOpacity
//                     key={index}
//                     style={styles.suggestionItem}
//                     onPress={() => selectSuggestion(item)}
//                   >
//                     <MapPin size={14} color={ACCENT_TEAL} />
//                     <Text style={styles.suggestionText} numberOfLines={1}>
//                       {item.description}
//                     </Text>
//                   </TouchableOpacity>
//                 ))}
//               </View>
//             )}

//             <View style={styles.mapCardFrame}>
//               {mapReady && !mapError ? (
//                 <MapView
//                   ref={mapRef}
//                   style={styles.mapInstance}
//                   initialRegion={{
//                     latitude: form.lat,
//                     longitude: form.lng,
//                     latitudeDelta: 0.03,
//                     longitudeDelta: 0.015,
//                   }}
//                   showsUserLocation
//                   showsMyLocationButton
//                 >
//                   {form.lat !== 0 && form.lng !== 0 && (
//                     <Marker
//                       coordinate={{ latitude: form.lat, longitude: form.lng }}
//                       title={form.location || 'Selected Location'}
//                       pinColor="#EF4444"
//                       draggable
//                       onDragEnd={e => {
//                         const { latitude, longitude } =
//                           e.nativeEvent.coordinate;
//                         setForm(prev => ({
//                           ...prev,
//                           lat: latitude,
//                           lng: longitude,
//                         }));
//                       }}
//                     />
//                   )}
//                 </MapView>
//               ) : (
//                 <View style={styles.mapPlaceholder}>
//                   {mapError ? (
//                     <Text
//                       style={{
//                         color: '#ef4444',
//                         fontSize: 14,
//                         textAlign: 'center',
//                       }}
//                     >
//                       Map failed to load
//                     </Text>
//                   ) : (
//                     <>
//                       <ActivityIndicator size="large" color={ACCENT_TEAL} />
//                       <Text style={{ color: '#64748b', marginTop: 12 }}>
//                         Loading map...
//                       </Text>
//                     </>
//                   )}
//                 </View>
//               )}
//             </View>

//             <Text style={styles.inputLabel}>Schedule Configuration Mode</Text>
//             <View style={styles.toggleButtonGroup}>
//               <TouchableOpacity
//                 style={[
//                   styles.toggleButton,
//                   scheduleMode === 'single' && styles.toggleButtonActive,
//                 ]}
//                 onPress={() => switchScheduleMode('single')}
//               >
//                 <Text
//                   style={[
//                     styles.toggleButtonText,
//                     scheduleMode === 'single' && styles.toggleButtonTextActive,
//                   ]}
//                 >
//                   Single Day
//                 </Text>
//               </TouchableOpacity>
//               <TouchableOpacity
//                 style={[
//                   styles.toggleButton,
//                   scheduleMode === 'range' && styles.toggleButtonActive,
//                 ]}
//                 onPress={() => switchScheduleMode('range')}
//               >
//                 <Text
//                   style={[
//                     styles.toggleButtonText,
//                     scheduleMode === 'range' && styles.toggleButtonTextActive,
//                   ]}
//                 >
//                   Multiple Days
//                 </Text>
//               </TouchableOpacity>
//             </View>

//             <LinearGradient
//               colors={[
//                 'rgba(255, 255, 255, 0.41)',
//                 'rgba(255,255,255,0.35)',
//                 'rgba(255, 255, 255, 0.2)',
//                 'rgba(255,255,255,0.10)',
//                 'rgba(255, 255, 255, 0.22)',
//               ]}
//               start={{ x: 0, y: 0 }}
//               end={{ x: 1, y: 1 }}
//               style={styles.scheduleGradientCard}
//             >
//               <View style={styles.scheduleDetailCard}>
//                 <ScheduleErrorBoundary onReset={resetSchedule}>
//                   {scheduleMode === 'single'
//                     ? renderSingleDay()
//                     : renderMultipleDays()}
//                 </ScheduleErrorBoundary>
//               </View>
//             </LinearGradient>

//             <Text style={styles.inputLabel}>Manage Tasks</Text>

//             <View style={styles.tasksContainer}>
//               {tasks.map((task, index) => (
//                 <View key={task.id} style={styles.taskCard}>
//                   <View style={styles.taskTimeRow}>
//                     <TouchableOpacity
//                       style={styles.taskTimeBox}
//                       onPress={() => openTaskTimePicker(task.id, 'startTime')}
//                     >
//                       <Text style={styles.taskTimeText}>
//                         {formatTime(task.startTime)}
//                       </Text>
//                     </TouchableOpacity>

//                     <Text style={styles.taskTimeSeparator}>–</Text>

//                     <TouchableOpacity
//                       style={styles.taskTimeBox}
//                       onPress={() => openTaskTimePicker(task.id, 'endTime')}
//                     >
//                       <Text style={styles.taskTimeText}>
//                         {formatTime(task.endTime)}
//                       </Text>
//                     </TouchableOpacity>

//                     <TouchableOpacity
//                       onPress={() => removeTask(task.id)}
//                       style={styles.taskDeleteBtn}
//                     >
//                       <Trash2 size={20} color={ERROR_RED} />
//                     </TouchableOpacity>
//                   </View>

//                   <TextInput
//                     style={styles.taskInput}
//                     placeholder="Enter task description..."
//                     placeholderTextColor={TEXT_MUTED}
//                     value={task.title}
//                     onChangeText={text => updateTask(task.id, 'title', text)}
//                   />
//                 </View>
//               ))}

//               <TouchableOpacity style={styles.addTaskButton} onPress={addTask}>
//                 <Plus size={20} color="#fff" />
//                 <Text style={styles.addTaskText}>Add Task</Text>
//               </TouchableOpacity>
//             </View>

//             <Text style={styles.inputLabel}>Job Category *</Text>

//             <LinearGradient
//               colors={[
//                 'rgba(255, 255, 255, 0.41)',
//                 'rgba(255,255,255,0.35)',
//                 'rgba(255, 255, 255, 0.2)',
//                 'rgba(255,255,255,0.10)',
//                 'rgba(255, 255, 255, 0.22)',
//               ]}
//               start={{ x: 0, y: 0 }}
//               end={{ x: 1, y: 1 }}
//               style={[
//                 styles.dropdownGradient,
//                 errors.category && styles.inputErrorBorder,
//               ]}
//             >
//               <TouchableOpacity
//                 style={styles.dropdownTrigger}
//                 activeOpacity={0.8}
//                 onPress={() => {
//                   Keyboard.dismiss();
//                   setShowCategoryModal(true);
//                 }}
//               >
//                 <Text
//                   style={
//                     form.category
//                       ? styles.dropdownText
//                       : styles.dropdownPlaceholder
//                   }
//                 >
//                   {form.category
//                     ? categoryOptions.find(o => o.value === form.category)
//                         ?.label
//                     : 'Select operational class'}
//                 </Text>
//                 <ChevronDown size={18} color={ACCENT_TEAL} />
//               </TouchableOpacity>
//             </LinearGradient>

//             {errors.category && (
//               <View style={styles.errorRow}>
//                 <AlertCircle size={12} color={ERROR_RED} />
//                 <Text style={styles.errorText}>{errors.category}</Text>
//               </View>
//             )}

//             {form.category === 'others' && (
//               <TextInput
//                 style={styles.textInput}
//                 placeholder="Specify alternative category name"
//                 placeholderTextColor={TEXT_MUTED}
//                 value={otherCategory}
//                 onChangeText={setOtherCategory}
//               />
//             )}

//             <View style={styles.labelRow}>
//               <Text style={styles.inputLabel}>Job Description *</Text>
//               <Text style={styles.charCounter}>
//                 {form.description.length}/{MAX_DESCRIPTION_LENGTH}
//               </Text>
//             </View>

//             <LinearGradient
//               colors={[
//                 'rgba(255, 255, 255, 0.41)',
//                 'rgba(255,255,255,0.35)',
//                 'rgba(255, 255, 255, 0.2)',
//                 'rgba(255,255,255,0.10)',
//                 'rgba(255, 255, 255, 0.22)',
//               ]}
//               start={{ x: 0, y: 0 }}
//               end={{ x: 1, y: 1 }}
//               style={[
//                 styles.textAreaGradient,
//                 errors.description && styles.inputErrorBorder,
//               ]}
//             >
//               <TextInput
//                 style={styles.textAreaInput}
//                 multiline
//                 numberOfLines={4}
//                 maxLength={MAX_DESCRIPTION_LENGTH}
//                 placeholder="Describe tasks, emergency protocols, and deployment rules..."
//                 placeholderTextColor={TEXT_MUTED}
//                 value={form.description}
//                 onChangeText={val =>
//                   setForm(prev => ({ ...prev, description: val }))
//                 }
//               />
//             </LinearGradient>

//             {errors.description && (
//               <View style={styles.errorRow}>
//                 <AlertCircle size={12} color={ERROR_RED} />
//                 <Text style={styles.errorText}>{errors.description}</Text>
//               </View>
//             )}

//             <Text style={styles.inputLabel}>Required Documents</Text>
//             <View style={styles.toggleContainer}>
//               {documentOptions.slice(0, 3).map(doc => {
//                 const isActive = form.documents.includes(doc.value);

//                 return (
//                   <LinearGradient
//                     key={doc.value}
//                     colors={[
//                       'rgba(255,255,255,0.25)',
//                       'rgba(255,255,255,0.08)',
//                     ]}
//                     start={{ x: 0, y: 0 }}
//                     end={{ x: 1, y: 1 }}
//                     style={styles.toggleCard}
//                   >
//                     <View style={styles.toggleRow}>
//                       <View style={styles.toggleContent}>
//                         <Text style={styles.toggleLabel}>{doc.label}</Text>
//                       </View>

//                       <TouchableOpacity
//                         activeOpacity={0.8}
//                         style={[
//                           styles.toggleSwitch,
//                           isActive && styles.toggleSwitchActive,
//                         ]}
//                         onPress={() => toggleDocument(doc.value)}
//                       >
//                         <View
//                           style={[
//                             styles.toggleKnob,
//                             isActive && styles.toggleKnobActive,
//                           ]}
//                         />

//                         <Text
//                           style={[
//                             styles.toggleText,
//                             isActive && styles.toggleTextActive,
//                           ]}
//                         >
//                           {isActive ? 'YES' : 'NO'}
//                         </Text>
//                       </TouchableOpacity>
//                     </View>
//                   </LinearGradient>
//                 );
//               })}
//             </View>

//             <Text style={styles.inputLabel}>Compliance Documents</Text>
//             <TouchableOpacity
//               style={styles.uploadAreaContainer}
//               onPress={handleUpload}
//             >
//               {uploading ? (
//                 <ActivityIndicator size="small" color={ACCENT_TEAL} />
//               ) : (
//                 <>
//                   <CloudUpload size={28} color={ACCENT_TEAL} />
//                   <Text style={styles.uploadTextTitle}>
//                     Upload File Attachments
//                   </Text>
//                   <Text style={styles.uploadTextSubtitle}>
//                     PDF, PNG, JPG up to 10MB
//                   </Text>
//                 </>
//               )}
//             </TouchableOpacity>

//             {selectedFiles.length > 0 && (
//               <View style={styles.fileListCard}>
//                 {selectedFiles.map((f: any, idx) => (
//                   <View key={idx} style={styles.fileRowItem}>
//                     <FileCheck size={16} color={ACCENT_TEAL} />
//                     <Text style={styles.fileNameText} numberOfLines={1}>
//                       {f.name || `Attachment_${idx + 1}`}
//                     </Text>
//                   </View>
//                 ))}
//               </View>
//             )}

//             <View style={styles.summaryFooterMetricsCard}>
//               <View style={styles.metricsColumn}>
//                 <Text style={styles.metricsLabel}>Estimated Total Volume</Text>
//                 <Text style={styles.metricsValue}>
//                   {totalManHours.toFixed(1)} Man-Hours
//                 </Text>
//               </View>
//               <TouchableOpacity
//                 style={styles.submissionButton}
//                 onPress={validateAndNext}
//               >
//                 <Text style={styles.submissionBtnText}>Continue</Text>
//                 <ArrowRight size={16} color={BRAND_BG} />
//               </TouchableOpacity>
//             </View>
//           </View>
//         </ScrollView>
//       </KeyboardAvoidingView>

//       <Modal
//         visible={showCategoryModal}
//         transparent
//         animationType="fade"
//         onRequestClose={() => setShowCategoryModal(false)}
//       >
//         <View style={styles.modalOverlayContainer}>
//           <View style={styles.bottomSelectionSheet}>
//             <Text style={styles.selectionSheetTitle}>
//               Select Operational Category
//             </Text>
//             {categoryOptions.map(opt => (
//               <TouchableOpacity
//                 key={opt.value}
//                 style={[
//                   styles.selectionOptionRow,
//                   form.category === opt.value && styles.selectionOptionActive,
//                 ]}
//                 onPress={() => {
//                   setForm(prev => ({ ...prev, category: opt.value }));
//                   if (opt.value !== 'others') setOtherCategory('');
//                   setShowCategoryModal(false);
//                   setErrors(prev => ({ ...prev, category: undefined }));
//                 }}
//               >
//                 <Text style={styles.selectionOptionText}>{opt.label}</Text>
//                 {form.category === opt.value && (
//                   <Check size={16} color={ACCENT_TEAL} />
//                 )}
//               </TouchableOpacity>
//             ))}
//           </View>
//         </View>
//       </Modal>

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
//           <View style={styles.modalOverlayContainer}>
//             <View style={styles.bottomSelectionSheet}>
//               <Text style={styles.selectionSheetTitle}>Required Documents</Text>
//               <ScrollView keyboardShouldPersistTaps="handled">
//                 {documentOptions.map(item => {
//                   const isSelected = form.documents.includes(item.value);
//                   return (
//                     <TouchableOpacity
//                       key={item.value}
//                       style={styles.selectionOptionRow}
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
//                       <Text style={styles.selectionOptionText}>
//                         {item.label}
//                       </Text>
//                       {isSelected && <Check size={16} color={ACCENT_TEAL} />}
//                     </TouchableOpacity>
//                   );
//                 })}
//                 {form.documents.includes('others') && (
//                   <TextInput
//                     placeholder="Enter document name"
//                     placeholderTextColor={TEXT_MUTED}
//                     value={otherDocument}
//                     onChangeText={setOtherDocument}
//                     style={styles.textInput}
//                   />
//                 )}
//               </ScrollView>
//             </View>
//           </View>
//         </KeyboardAvoidingView>
//       </Modal>

//       {pickerVisible && (
//         <Modal
//           visible
//           transparent
//           animationType="fade"
//           onRequestClose={() => {
//             setPickerVisible(false);
//             setPickerTarget(null);
//           }}
//         >
//           <View style={styles.modalOverlayContainer}>
//             <View style={styles.iosPickerWrapperSheet}>
//               <DateTimePicker
//                 value={pickerValue}
//                 mode="time"
//                 is24Hour
//                 display={Platform.OS === 'ios' ? 'spinner' : 'default'}
//                 onChange={onTimePickerChange}
//                 textColor="#FFFFFF"
//               />
//               {Platform.OS === 'ios' && (
//                 <TouchableOpacity
//                   style={styles.modalConfirmActionBtn}
//                   onPress={() => {
//                     applyTimeChange(pickerValue);
//                     setPickerVisible(false);
//                   }}
//                 >
//                   <Text style={styles.modalConfirmActionText}>
//                     Confirm Configuration
//                   </Text>
//                 </TouchableOpacity>
//               )}
//             </View>
//           </View>
//         </Modal>
//       )}

//       <Modal
//         visible={calendarVisible}
//         transparent
//         animationType="fade"
//         onRequestClose={() => setCalendarVisible(false)}
//       >
//         <View style={styles.modalOverlayContainer}>
//           <View style={styles.calendarModalSheet}>
//             <View style={styles.modalSheetTopHeaderRow}>
//               <Text style={styles.modalHeaderTitle}>
//                 {calendarTarget === 'single'
//                   ? 'Select Date'
//                   : calendarTarget === 'rangeFrom'
//                   ? 'Select Start Date'
//                   : calendarTarget === 'rangeTo'
//                   ? 'Select End Date'
//                   : 'Select Multiple Dates'}
//               </Text>
//               <TouchableOpacity onPress={() => setCalendarVisible(false)}>
//                 <Text style={styles.closeModalTextLink}>Done</Text>
//               </TouchableOpacity>
//             </View>

//             <View style={styles.calNavRow}>
//               <TouchableOpacity
//                 onPress={() =>
//                   setCalendarMonth(
//                     prev =>
//                       new Date(prev.getFullYear(), prev.getMonth() - 1, 1),
//                   )
//                 }
//               >
//                 <ChevronLeft size={24} color={ACCENT_TEAL} />
//               </TouchableOpacity>

//               <Text style={styles.calendarMonthHeadingText}>
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
//                 <ChevronRight size={24} color={ACCENT_TEAL} />
//               </TouchableOpacity>
//             </View>

//             <View style={styles.calWeekRow}>
//               {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
//                 <Text key={d} style={styles.calWeekDay}>
//                   {d}
//                 </Text>
//               ))}
//             </View>

//             <ScrollView style={styles.calendarDaysGridMatrixScroll}>
//               <View style={styles.daysMatrixGrid}>
//                 {calendarDays.map((d, i) => {
//                   if (!d)
//                     return (
//                       <View key={`empty-${i}`} style={styles.emptyGridCell} />
//                     );

//                   const selected = isDaySelected(d);
//                   const inRange = isDayInRange(d);
//                   const isPast = d < new Date(new Date().setHours(0, 0, 0, 0));

//                   return (
//                     <TouchableOpacity
//                       key={d.toISOString()}
//                       style={[
//                         styles.calendarDayCell,
//                         selected && styles.dayCellSelected,
//                         inRange && styles.calCellInRange,
//                         isToday(d) && !selected && styles.calCellToday,

//                         isPast && styles.calCellPast,
//                       ]}
//                       onPress={() => !isPast && onCalendarDayPress(d)}
//                       disabled={isPast}
//                     >
//                       <Text
//                         style={[
//                           styles.dayCellText,
//                           selected && styles.dayCellTextSelected,
//                           isPast && styles.calCellTextPast,
//                         ]}
//                       >
//                         {d.getDate()}
//                       </Text>
//                     </TouchableOpacity>
//                   );
//                 })}
//               </View>
//             </ScrollView>
//           </View>
//         </View>
//       </Modal>
//     </SafeAreaView>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: BRAND_BG,
//   },
//   scrollContainer: {
//     paddingBottom: 40,
//   },
//   headerRow: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'space-between',
//     paddingHorizontal: 16,
//   },
//   backBtn: {
//     width: 40,
//     height: 40,
//     borderRadius: 20,
//     alignItems: 'center',
//     justifyContent: 'center',
//     backgroundColor: 'rgba(255,255,255,0.15)',
//   },
//   headerTitle: {
//     fontSize: 18,
//     fontWeight: '600',
//     color: '#fff',
//     textAlign: 'center',
//   },
//   formContainer: {
//     paddingHorizontal: 16,
//     paddingTop: 5,
//   },
//   inputLabel: {
//     fontSize: 14,
//     fontWeight: '600',
//     color: '#FFFFFF',
//     marginTop: 18,
//     marginBottom: 8,
//   },
//   labelRow: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     marginBottom: 8,
//   },
//   charCounter: {
//     fontSize: 12,
//     color: TEXT_MUTED,
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
//   searchGradient: {
//     borderRadius: 12,
//     overflow: 'hidden',
//     marginTop: 0,
//   },
//   searchIcon: {
//     marginRight: 10,
//   },
//   tasksContainer: {
//     marginBottom: 20,
//   },
//   taskCard: {
//     backgroundColor: CARD_BG,
//     borderRadius: 16,
//     padding: 16,
//     marginBottom: 12,
//     borderWidth: 1,
//     borderColor: 'rgba(255,255,255,0.1)',
//   },
//   taskTimeRow: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     marginBottom: 12,
//   },
//   taskTimeBox: {
//     backgroundColor: CHIP_DARK,
//     paddingHorizontal: 16,
//     paddingVertical: 10,
//     borderRadius: 10,
//     flex: 1,
//     alignItems: 'center',
//   },
//   taskTimeText: {
//     color: '#FFFFFF',
//     fontWeight: '600',
//     fontSize: 15,
//   },
//   taskTimeSeparator: {
//     fontSize: 20,
//     color: TEXT_MUTED,
//     marginHorizontal: 12,
//   },
//   taskDeleteBtn: {
//     marginLeft: 12,
//     padding: 8,
//   },
//   taskInput: {
//     backgroundColor: 'rgba(255,255,255,0.1)',
//     borderRadius: 12,
//     padding: 14,
//     color: '#FFFFFF',
//     fontSize: 15,
//   },
//   addTaskButton: {
//     backgroundColor: ACCENT_TEAL,
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'center',
//     paddingVertical: 14,
//     borderRadius: 50,
//     gap: 8,
//     marginTop: 8,
//     width: '100%',
//   },
//   addTaskText: {
//     color: BRAND_BG,
//     fontWeight: '700',
//     fontSize: 16,
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
//   mapPlaceholder: {
//     height: 160,
//     backgroundColor: '#e2e8f0',
//     borderRadius: 12,
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   toggleButtonGroup: {
//     flexDirection: 'row',
//     backgroundColor: CARD_BG,
//     borderRadius: 12,
//     padding: 3,
//     gap: 4,
//   },
//   toggleButton: {
//     flex: 1,
//     paddingVertical: 12,
//     alignItems: 'center',
//     borderRadius: 10,
//   },
//   toggleButtonActive: {
//     backgroundColor: CHIP_DARK,
//     borderWidth: 1,
//     borderColor: 'rgba(92,225,214,0.2)',
//   },
//   toggleButtonText: {
//     fontSize: 13,
//     fontWeight: '600',
//     color: TEXT_MUTED,
//   },
//   toggleButtonTextActive: {
//     color: ACCENT_TEAL,
//   },
//   scheduleDetailCard: {
//     borderRadius: 16,
//     padding: 16,
//     marginTop: 14,
//   },
//   cardHeaderRow: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     marginBottom: 14,
//   },
//   cardHeaderTitle: {
//     fontSize: 14,
//     fontWeight: '700',
//     color: '#FFFFFF',
//   },
//   calendarInlineBtn: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 6,
//     backgroundColor: CHIP_DARK,
//     paddingHorizontal: 12,
//     paddingVertical: 6,
//     borderRadius: 20,
//   },
//   inlineBtnText: {
//     fontSize: 12,
//     color: ACCENT_TEAL,
//     fontWeight: '600',
//   },
//   shiftEntryBlock: {
//     backgroundColor: BRAND_BG,
//     borderRadius: 12,
//     padding: 14,
//     marginBottom: 12,
//     borderWidth: 1,
//     borderColor: 'rgba(255,255,255,0.05)',
//   },
//   shiftRowTop: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     marginBottom: 12,
//   },
//   shiftBadgeText: {
//     fontSize: 12,
//     fontWeight: '700',
//     color: ACCENT_TEAL,
//     backgroundColor: CHIP_DARK,
//     paddingHorizontal: 8,
//     paddingVertical: 3,
//     borderRadius: 6,
//   },
//   timeInputsRow: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'space-between',
//     gap: 10,
//   },
//   timeSelectorBox: {
//     flex: 1,
//     height: 44,
//     backgroundColor: CHIP_DARK,
//     borderRadius: 10,
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'center',
//     gap: 8,
//     borderWidth: 1,
//     borderColor: 'rgba(255,255,255,0.05)',
//   },
//   timeSelectorValue: {
//     color: '#FFFFFF',
//     fontSize: 13,
//     fontWeight: '600',
//   },
//   guardsCounterBlock: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     marginTop: 12,
//     paddingTop: 12,
//     borderTopWidth: 1,
//     borderColor: 'rgba(255,255,255,0.05)',
//   },
//   fieldLabelSub: {
//     fontSize: 13,
//     color: TEXT_MUTED,
//     fontWeight: '500',
//   },
//   guardsMiniInput: {
//     width: 60,
//     height: 36,
//     backgroundColor: CHIP_DARK,
//     borderRadius: 8,
//     color: '#FFFFFF',
//     textAlign: 'center',
//     fontWeight: '700',
//     fontSize: 14,
//     borderWidth: 1,
//     borderColor: 'rgba(255,255,255,0.1)',
//   },
//   addShiftButton: {
//     backgroundColor: ACCENT_TEAL,
//     height: 44,
//     borderRadius: 12,
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'center',
//     gap: 8,
//     marginTop: 4,
//   },
//   addShiftBtnText: {
//     color: BRAND_BG,
//     fontSize: 13,
//     fontWeight: '700',
//   },
//   dateSelectBtn: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 10,
//     backgroundColor: CHIP_DARK,
//     paddingHorizontal: 14,
//     paddingVertical: 12,
//     borderRadius: 12,
//     borderWidth: 1,
//     borderColor: 'rgba(255,255,255,0.05)',
//     marginBottom: 12,
//   },
//   dateSelectTxt: {
//     flex: 1,
//     color: '#FFFFFF',
//     fontSize: 13,
//     fontWeight: '600',
//   },
//   shiftHeaderRow: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     marginBottom: 8,
//     opacity: 0.9,
//   },
//   shiftHeaderTxt: {
//     color: TEXT_MUTED,
//     fontSize: 11,
//     fontWeight: '700',
//     textTransform: 'uppercase',
//   },
//   shiftRow: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     backgroundColor: BRAND_BG,
//     borderRadius: 12,
//     paddingVertical: 10,
//     paddingHorizontal: 10,
//     borderWidth: 1,
//     borderColor: 'rgba(255,255,255,0.05)',
//   },
//   shiftDateCol: {
//     width: 44,
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
//   shiftDateDay: {
//     color: '#FFFFFF',
//     fontSize: 16,
//     fontWeight: '800',
//   },
//   shiftDateMonth: {
//     color: TEXT_MUTED,
//     fontSize: 11,
//     fontWeight: '700',
//     marginTop: 2,
//   },
//   shiftContinueLine: {
//     width: 2,
//     height: 26,
//     borderRadius: 1,
//     backgroundColor: 'rgba(255,255,255,0.12)',
//   },
//   shiftMiddle: {
//     flex: 2,
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'center',
//     gap: 8,
//   },
//   shiftTimeBtn: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 6,
//     backgroundColor: CHIP_DARK,
//     paddingVertical: 8,
//     paddingHorizontal: 10,
//     borderRadius: 10,
//     borderWidth: 1,
//     borderColor: 'rgba(255,255,255,0.05)',
//   },
//   shiftTimeTxt: {
//     color: '#FFFFFF',
//     fontSize: 12,
//     fontWeight: '700',
//   },
//   shiftTimeSep: {
//     color: TEXT_MUTED,
//     fontSize: 14,
//     fontWeight: '800',
//   },
//   nextDayBadge: {
//     marginLeft: 6,
//     color: ACCENT_TEAL,
//     fontSize: 10,
//     fontWeight: '800',
//   },
//   shiftGuardsCol: {
//     width: 56,
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
//   guardsSmallInput: {
//     width: 52,
//     height: 34,
//     backgroundColor: CHIP_DARK,
//     borderRadius: 10,
//     color: '#FFFFFF',
//     textAlign: 'center',
//     fontWeight: '800',
//     borderWidth: 1,
//     borderColor: 'rgba(255,255,255,0.1)',
//     paddingVertical: 0,
//     paddingHorizontal: 8,
//   },
//   shiftDeleteBtn: {
//     width: 28,
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
//   addShiftBtn: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 8,
//     backgroundColor: CHIP_DARK,
//     paddingVertical: 10,
//     paddingHorizontal: 12,
//     borderRadius: 12,
//     borderWidth: 1,
//     borderColor: 'rgba(255,255,255,0.05)',
//     alignSelf: 'flex-start',
//     marginTop: 10,
//   },
//   addShiftTxt: {
//     color: '#FFFFFF',
//     fontSize: 13,
//     fontWeight: '700',
//   },
//   segmentControlGroup: {
//     flexDirection: 'row',
//     backgroundColor: CHIP_DARK,
//     borderRadius: 10,
//     padding: 3,
//     marginTop: 10,
//     gap: 2,
//   },
//   dropdownGradient: {
//     borderRadius: 12,
//     overflow: 'hidden',
//     marginTop: 0,
//   },
//   segmentItem: {
//     flex: 1,
//     paddingVertical: 10,
//     alignItems: 'center',
//     borderRadius: 8,
//   },
//   segmentItemActive: {
//     backgroundColor: CARD_BG,
//   },
//   segmentItemText: {
//     fontSize: 12,
//     color: TEXT_MUTED,
//     fontWeight: '600',
//   },
//   segmentItemTextActive: {
//     color: '#FFFFFF',
//   },
//   rangePickersBlock: {
//     flexDirection: 'row',
//     gap: 12,
//     marginTop: 14,
//   },
//   dateRangeBox: {
//     flex: 1,
//     backgroundColor: CHIP_DARK,
//     borderRadius: 12,
//     padding: 12,
//     borderWidth: 1,
//     borderColor: 'rgba(255,255,255,0.05)',
//   },
//   rangeBoxLabel: {
//     fontSize: 11,
//     color: TEXT_MUTED,
//     textTransform: 'uppercase',
//     fontWeight: '600',
//     marginBottom: 4,
//   },
//   rangeBoxValue: {
//     fontSize: 14,
//     color: '#FFFFFF',
//     fontWeight: '700',
//   },
//   customDateSelectorBtn: {
//     flexDirection: 'row',
//     backgroundColor: CHIP_DARK,
//     height: 48,
//     borderRadius: 12,
//     alignItems: 'center',
//     justifyContent: 'center',
//     gap: 10,
//     marginTop: 14,
//     borderWidth: 1,
//     borderColor: 'rgba(255,255,255,0.05)',
//   },
//   customDateSelectBtnText: {
//     color: '#FFFFFF',
//     fontSize: 13,
//     fontWeight: '600',
//   },
//   bulkConfigurationContainer: {
//     marginTop: 16,
//     paddingTop: 16,
//     borderTopWidth: 1,
//     borderColor: 'rgba(255,255,255,0.05)',
//     marginBottom: 16,
//   },
//   bulkTitle: {
//     fontSize: 13,
//     fontWeight: '700',
//     color: '#FFFFFF',
//     marginBottom: 10,
//   },
//   bulkApplyCheckboxRow: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 10,
//     marginTop: 12,
//     padding: 12,
//     borderRadius: 10,
//     backgroundColor: CHIP_DARK,
//   },
//   bulkActiveRow: {
//     borderColor: 'rgba(92,225,214,0.2)',
//     borderWidth: 1,
//   },
//   checkboxShell: {
//     width: 18,
//     height: 18,
//     borderRadius: 4,
//     borderWidth: 2,
//     borderColor: TEXT_MUTED,
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
//   checkboxChecked: {
//     backgroundColor: ACCENT_TEAL,
//     borderColor: ACCENT_TEAL,
//   },
//   checkboxLabel: {
//     fontSize: 12,
//     color: '#FFFFFF',
//     fontWeight: '500',
//   },
//   nestedDayBlock: {
//     backgroundColor: BRAND_BG,
//     borderRadius: 12,
//     padding: 12,
//     marginBottom: 10,
//     borderWidth: 1,
//     borderColor: 'rgba(255,255,255,0.05)',
//   },
//   nestedDayDateTitle: {
//     fontSize: 13,
//     fontWeight: '700',
//     color: '#FFFFFF',
//     marginBottom: 8,
//   },
//   nestedShiftItem: {
//     marginBottom: 6,
//   },
//   nestedTimeBox: {
//     flex: 2,
//     height: 36,
//     backgroundColor: CHIP_DARK,
//     borderRadius: 6,
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
//   nestedTimeText: {
//     color: '#FFFFFF',
//     fontSize: 12,
//     fontWeight: '600',
//   },
//   nestedGuardsInput: {
//     flex: 1,
//     height: 36,
//     backgroundColor: CHIP_DARK,
//     borderRadius: 6,
//     color: '#FFFFFF',
//     textAlign: 'center',
//     fontSize: 12,
//     fontWeight: '700',
//   },
//   nestedAddShiftBtn: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 4,
//     marginTop: 4,
//   },
//   nestedAddShiftText: {
//     color: ACCENT_TEAL,
//     fontSize: 12,
//     fontWeight: '600',
//   },
//   multiSummary: { fontSize: 13, color: '#64748b', marginBottom: 10 },
//   toggleContainer: {
//     flexDirection: 'row',
//     flexWrap: 'wrap',
//     justifyContent: 'space-between',
//   },
//   toggleCard: {
//     width: '48%',
//     borderRadius: 14,
//     overflow: 'hidden',
//     marginBottom: 10,
//     borderWidth: 1,
//     borderColor: 'rgba(255,255,255,0.12)',
//   },
//   toggleRow: {
//     padding: 13,
//     minHeight: 90,
//     justifyContent: 'space-between',
//     backgroundColor: 'rgba(0,31,63,0.88)',
//   },
//   toggleContent: {
//     gap: 6,
//   },
//   toggleLabel: {
//     fontSize: 13,
//     color: '#fff',
//     fontWeight: '700',
//     lineHeight: 20,
//   },
//   toggleSwitch: {
//     height: 36,
//     borderRadius: 20,
//     backgroundColor: 'rgba(255,255,255,0.12)',
//     flexDirection: 'row',
//     alignItems: 'center',
//     paddingHorizontal: 6,
//     alignSelf: 'flex-start',
//     minWidth: 78,
//   },
//   toggleSwitchActive: {
//     backgroundColor: '#001F3F',
//   },
//   toggleKnob: {
//     width: 24,
//     height: 24,
//     borderRadius: 12,
//     backgroundColor: 'rgba(255,255,255,0.5)',
//     marginRight: 8,
//   },
//   toggleKnobActive: {
//     backgroundColor: '#fff',
//   },
//   toggleText: {
//     fontSize: 12,
//     fontWeight: '700',
//     color: 'rgba(255,255,255,0.7)',
//   },
//   toggleTextActive: {
//     color: '#fff',
//   },
//   uploadAreaContainer: {
//     backgroundColor: CARD_BG,
//     borderRadius: 16,
//     borderWidth: 1,
//     borderStyle: 'dashed',
//     borderColor: ACCENT_TEAL,
//     paddingVertical: 24,
//     alignItems: 'center',
//     justifyContent: 'center',
//     marginTop: 4,
//   },
//   uploadTextTitle: {
//     fontSize: 14,
//     fontWeight: '600',
//     color: '#FFFFFF',
//     marginTop: 10,
//   },
//   uploadTextSubtitle: {
//     fontSize: 11,
//     color: TEXT_MUTED,
//     marginTop: 2,
//   },
//   fileListCard: {
//     backgroundColor: CARD_BG,
//     borderRadius: 12,
//     padding: 12,
//     marginTop: 10,
//     gap: 8,
//   },
//   fileRowItem: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 8,
//   },
//   fileNameText: {
//     color: '#FFFFFF',
//     fontSize: 13,
//     flex: 1,
//   },
//   summaryFooterMetricsCard: {
//     backgroundColor: CARD_BG,
//     borderRadius: 16,
//     padding: 16,
//     marginTop: 24,
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'space-between',
//     borderWidth: 1,
//     borderColor: 'rgba(255,255,255,0.05)',
//   },
//   metricsColumn: {
//     flex: 1,
//   },
//   metricsLabel: {
//     fontSize: 11,
//     color: TEXT_MUTED,
//     textTransform: 'uppercase',
//     fontWeight: '600',
//   },
//   metricsValue: {
//     fontSize: 16,
//     fontWeight: '700',
//     color: ACCENT_TEAL,
//     marginTop: 2,
//   },
//   submissionButton: {
//     backgroundColor: ACCENT_TEAL,
//     paddingHorizontal: 18,
//     height: 46,
//     borderRadius: 12,
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'center',
//     gap: 8,
//   },
//   submissionBtnText: {
//     color: BRAND_BG,
//     fontSize: 14,
//     fontWeight: '700',
//   },
//   inputErrorBorder: {
//     borderColor: ERROR_RED,
//   },
//   errorRow: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 6,
//     marginTop: 6,
//   },
//   errorText: {
//     color: ERROR_RED,
//     fontSize: 12,
//     fontWeight: '500',
//   },
//   modalOverlayContainer: {
//     flex: 1,
//     backgroundColor: 'rgba(0,0,0,0.75)',
//     justifyContent: 'flex-end',
//   },
//   bottomSelectionSheet: {
//     backgroundColor: CARD_BG,
//     borderTopLeftRadius: 24,
//     borderTopRightRadius: 24,
//     padding: 24,
//     paddingBottom: 40,
//     maxHeight: '80%',
//   },
//   selectionSheetTitle: {
//     fontSize: 16,
//     fontWeight: '700',
//     color: '#FFFFFF',
//     marginBottom: 16,
//   },
//   selectionOptionRow: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     paddingVertical: 10,
//     borderBottomWidth: 1,
//     borderColor: 'rgba(255,255,255,0.05)',
//   },
//   selectionOptionActive: {
//     opacity: 0.9,
//   },
//   selectionOptionText: {
//     fontSize: 12,
//     color: '#FFFFFF',
//     fontWeight: '500',
//   },
//   iosPickerWrapperSheet: {
//     backgroundColor: CARD_BG,
//     borderTopLeftRadius: 24,
//     borderTopRightRadius: 24,
//     padding: 16,
//     paddingBottom: 30,
//   },
//   modalConfirmActionBtn: {
//     backgroundColor: ACCENT_TEAL,
//     height: 48,
//     borderRadius: 12,
//     alignItems: 'center',
//     justifyContent: 'center',
//     marginTop: 12,
//   },
//   modalConfirmActionText: {
//     color: BRAND_BG,
//     fontSize: 14,
//     fontWeight: '700',
//   },
//   calendarModalSheet: {
//     backgroundColor: CARD_BG,
//     borderTopLeftRadius: 24,
//     borderTopRightRadius: 24,
//     height: '65%',
//     padding: 20,
//   },
//   modalSheetTopHeaderRow: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     marginBottom: 20,
//   },
//   modalHeaderTitle: {
//     fontSize: 16,
//     fontWeight: '700',
//     color: '#FFFFFF',
//   },
//   calendarMonthHeadingText: {
//     color: '#FFFFFF',
//     fontSize: 14,
//     fontWeight: '700',
//   },
//   closeModalTextLink: {
//     color: ACCENT_TEAL,
//     fontSize: 14,
//     fontWeight: '600',
//   },
//   calendarDaysGridMatrixScroll: {
//     flex: 1,
//   },
//   calNavRow: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'space-between',
//     marginBottom: 18,
//   },
//   calWeekRow: { flexDirection: 'row', marginBottom: 4 },
//   calWeekDay: {
//     flex: 1,
//     textAlign: 'center',
//     fontSize: 12,
//     color: '#64748b',
//     fontWeight: '600',
//   },
//   daysMatrixGrid: {
//     flexDirection: 'row',
//     flexWrap: 'wrap',
//     gap: 10,
//     justifyContent: 'flex-start',
//   },
//   emptyGridCell: {
//     width: (width - 80) / 7,
//     height: 40,
//   },
//   calendarDayCell: {
//     width: (width - 80) / 7,
//     height: 40,
//     backgroundColor: CHIP_DARK,
//     borderRadius: 8,
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
//   dayCellSelected: {
//     backgroundColor: ACCENT_TEAL,
//   },
//   calCellInRange: { backgroundColor: '#bae8f8' },
//   calCellToday: {
//     backgroundColor: '#f0f9ff',
//     borderWidth: 1,
//     borderColor: '#bae6fd',
//   },
//   calCellPast: { opacity: 0.3 },
//   dayCellText: {
//     color: '#FFFFFF',
//     fontSize: 13,
//     fontWeight: '600',
//   },
//   dayCellTextSelected: {
//     color: BRAND_BG,
//     fontWeight: '700',
//   },
//   calCellTextPast: { color: '#94a3b8' },
//   textAreaGradient: {
//     borderRadius: 12,
//     overflow: 'hidden',
//     marginTop: 0,
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
const BRAND_BG = '#0F172A';
const CARD_BG = '#1E2937';
const CHIP_DARK = '#334155';
const ACCENT_TEAL = '#14E6C9';
const TEXT_PRIMARY = '#F1F5F9';
const TEXT_MUTED = '#94A3B8';
const ERROR_RED = '#FF4D67';
const BORDER_COLOR = '#475569';
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

interface PickerTarget {
  mode: 'single' | 'range' | 'master' | 'individual' | 'task';
  dayIndex: number;
  shiftIndex: number;
  field: 'startTime' | 'endTime';
  taskId?: string;
}

interface JobTask {
  id: string;
  startTime: Date;
  endTime: Date;
  title: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const isSameDay = (a: Date, b: Date) =>
  a &&
  b &&
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const formatDate = (d: Date) => {
  if (!d || isNaN(d.getTime())) return 'N/A';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
};

const formatTime = (d: Date) => {
  if (!d || isNaN(d.getTime())) return '00:00';
  return d.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
};

const shiftDurationHours = (start: Date, end: Date): number => {
  if (!start || !end || isNaN(start.getTime()) || isNaN(end.getTime()))
    return 0;
  let diff = end.getTime() - start.getTime();
  if (diff < 0) diff += 24 * 60 * 60 * 1000;
  return diff > 0 ? diff / (1000 * 60 * 60) : 0;
};

const datesBetween = (from: Date, to: Date): Date[] => {
  const dates: Date[] = [];
  if (!from || !to || isNaN(from.getTime()) || isNaN(to.getTime()))
    return dates;
  const cur = new Date(from);
  cur.setHours(0, 0, 0, 0);
  const end = new Date(to);
  end.setHours(0, 0, 0, 0);
  // Boundary safe limit to avoid accidental infinite run loops
  let safetyCounter = 0;
  while (cur <= end && safetyCounter < 100) {
    dates.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
    safetyCounter++;
  }
  return dates;
};

const combineDateAndTime = (date: Date, timeSource: Date): Date => {
  const combined = new Date(date || new Date());
  const source = new Date(timeSource || new Date());
  combined.setHours(
    source.getHours(),
    source.getMinutes(),
    source.getSeconds(),
    source.getMilliseconds(),
  );
  return combined;
};

const autoAssignGuards = (startTime: Date, endTime?: Date): string => {
  if (endTime) {
    const hours = shiftDurationHours(startTime, endTime);
    if (hours <= 13) return '1';
    if (hours <= 22) return '2';
    return '3';
  }
  const hour = startTime ? startTime.getHours() : 9;
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
  try {
    const startTime = new Date();
    startTime.setHours(9, 0, 0, 0);

    const endTime = new Date();
    endTime.setHours(17, 0, 0, 0);

    const id = `shift-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    return {
      id,
      startTime,
      endTime,
      guardsCount: '1',
    };
  } catch (error) {
    console.error('Error creating default shift:', error);
    const now = new Date();
    return {
      id: `error-${Date.now()}`,
      startTime: now,
      endTime: new Date(now.getTime() + 8 * 60 * 60 * 1000),
      guardsCount: '1',
    };
  }
};

const makeDaySchedule = (date: Date): DaySchedule => ({
  date: date || new Date(),
  shifts: [makeDefaultShift()],
});

class ScheduleErrorBoundary extends React.Component<
  { onReset: () => void; children: React.ReactNode },
  { hasError: boolean; errorMessage: string }
> {
  state = { hasError: false, errorMessage: '' };

  static getDerivedStateFromError(error: any) {
    return { hasError: true, errorMessage: error?.message || String(error) };
  }

  componentDidCatch(error: any) {
    console.error('ScheduleErrorBoundary caught:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View
          style={{
            padding: 16,
            backgroundColor: CARD_BG,
            borderRadius: 12,
            margin: 16,
          }}
        >
          <Text
            style={{ color: '#ef4444', fontWeight: '700', marginBottom: 12 }}
          >
            Schedule layout issue detected. Tap Reset to restore stability.
          </Text>
          <TouchableOpacity
            onPress={() => {
              this.setState({ hasError: false, errorMessage: '' });
              this.props.onReset();
            }}
            style={{
              paddingVertical: 12,
              paddingHorizontal: 16,
              borderRadius: 12,
              backgroundColor: '#3b82f6',
              alignSelf: 'flex-start',
            }}
          >
            <Text style={{ color: '#fff', fontWeight: '700' }}>
              Reset Schedule
            </Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function CreateJobScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

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

  const [scheduleMode, setScheduleMode] = useState<ScheduleMode>('single');
  const [multiDayMode, setMultiDayMode] = useState<MultiDayMode>('individual');

  const [singleDaySchedule, setSingleDaySchedule] = useState<DaySchedule>({
    date: new Date(),
    shifts: [makeDefaultShift()],
  });

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

  const [masterStartTime, setMasterStartTime] = useState<Date | null>(null);
  const [masterEndTime, setMasterEndTime] = useState<Date | null>(null);
  const [masterGuards, setMasterGuards] = useState<string>('');
  const [applyToAll, setApplyToAll] = useState(false);

  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerValue, setPickerValue] = useState<Date>(new Date());
  const [pickerTarget, setPickerTarget] = useState<PickerTarget | null>(null);

  const [calendarVisible, setCalendarVisible] = useState(false);
  const [calendarTarget, setCalendarTarget] = useState<
    'single' | 'rangeFrom' | 'rangeTo' | 'individual'
  >('single');
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  const safeDate = (v: any) => {
    try {
      if (!v) return new Date();
      if (v instanceof Date) return isNaN(v.getTime()) ? new Date() : v;
      if (typeof v === 'object' && v !== null) {
        if (Object.keys(v).length === 0) return new Date();
        if (typeof v.getTime === 'function') {
          const timestamp = v.getTime();
          if (!isNaN(timestamp)) return new Date(timestamp);
        }
        const dateStr = JSON.stringify(v);
        if (dateStr && dateStr !== '{}') {
          const d = new Date(v);
          if (!isNaN(d.getTime())) return d;
        }
      }
      const d = new Date(v);
      return isNaN(d.getTime()) ? new Date() : d;
    } catch (error) {
      return new Date();
    }
  };

  const cleanupPickers = () => {
    Keyboard.dismiss();
    setPickerVisible(false);
    setPickerTarget(null);
    setCalendarVisible(false);
  };

  const resetSchedule = () => {
    cleanupPickers();
    setScheduleMode('single');
    setMultiDayMode('individual');

    const now = new Date();
    setSingleDaySchedule({
      date: now,
      shifts: [makeDefaultShift()],
    });

    setRangeFrom(now);
    setRangeTo(now);
    setRangeSchedules(datesBetween(now, now).map(makeDaySchedule));
    setIndividualDates([]);
    setIndividualSchedules([]);
  };

  const switchScheduleMode = (mode: ScheduleMode) => {
    cleanupPickers();
    setScheduleMode(mode);

    if (mode === 'single') {
      const now = new Date();
      setSingleDaySchedule({
        date: now,
        shifts: [makeDefaultShift()],
      });
    }
  };

  const switchMultiDayMode = (mode: MultiDayMode) => {
    cleanupPickers();
    setMultiDayMode(mode);
  };

  const [showDocModal, setShowDocModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [otherCategory, setOtherCategory] = useState('');
  const [otherDocument, setOtherDocument] = useState('');

  const [uploading, setUploading] = useState(false);
  const [uploadedFilePaths, setUploadedFilePaths] = useState<string[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<
    (ImageAsset | DocumentPickerResponse)[]
  >([]);

  const [errors, setErrors] = useState<FormErrors>({});

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

  const [tasks, setTasks] = useState<JobTask[]>([]);

  const addTask = () => {
    const startTime = new Date();
    startTime.setHours(9, 0, 0, 0);

    const endTime = new Date();
    endTime.setHours(17, 0, 0, 0);

    const newTask: JobTask = {
      id: Math.random().toString(36).slice(2, 7),
      startTime,
      endTime,
      title: '',
    };
    setTasks(prev => [...prev, newTask]);
  };

  const removeTask = (id: string) => {
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
    });
    setPickerVisible(true);
  };

  useEffect(() => {
    const timer = setTimeout(() => setMapReady(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    try {
      mapRef.current.animateToRegion(
        {
          latitude: form.lat || DEFAULT_LOCATION.lat,
          longitude: form.lng || DEFAULT_LOCATION.lng,
          latitudeDelta: 0.022,
          longitudeDelta: 0.012,
        },
        800,
      );
    } catch (e) {
      console.warn(e);
    }
  }, [mapReady, form.lat, form.lng]);

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
      if (navigator.geolocation) {
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

  const applyMasterToAll = (
    start: Date | null,
    end: Date | null,
    guards: string,
  ) => {
    if (!start || !end) return;

    const buildShifts = (existing: Shift[], date: Date) => {
      const dayStart = combineDateAndTime(date, start);
      const dayEnd = combineDateAndTime(date, end);
      const hours = shiftDurationHours(dayStart, dayEnd);
      const splits = hours > 13 ? splitShift(dayStart, dayEnd) : null;

      if (splits) {
        return splits.map(s => {
          const startOffset = s.startTime.getTime() - dayStart.getTime();
          const endOffset = s.endTime.getTime() - dayStart.getTime();
          const startTime = new Date(dayStart.getTime() + startOffset);
          const endTime = new Date(dayStart.getTime() + endOffset);
          return {
            id: `shift-${Math.random().toString(36).slice(2, 7)}`,
            startTime,
            endTime,
            guardsCount: guards || autoAssignGuards(startTime, endTime),
          };
        });
      }

      const baseShifts =
        existing && existing.length > 0 ? existing : [makeDefaultShift()];
      return baseShifts.map(shift => {
        const startTime = combineDateAndTime(date, start);
        let endTime = combineDateAndTime(date, end);
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
    setSingleDaySchedule(prev => {
      const shifts = Array.isArray(prev.shifts) ? prev.shifts : [];
      if (!shifts[idx]) return prev;
      return {
        ...prev,
        shifts: shifts.map((s, i) =>
          i === idx ? { ...s, [field]: value } : s,
        ),
      };
    });

  const addSingleShift = () => {
    setSingleDaySchedule(prev => {
      const shifts = Array.isArray(prev.shifts) ? prev.shifts : [];
      return { ...prev, shifts: [...shifts, makeDefaultShift()] };
    });
  };

  const removeSingleShift = (idx: number) => {
    cleanupPickers();
    setSingleDaySchedule(prev => {
      const currentShifts = Array.isArray(prev.shifts) ? [...prev.shifts] : [];
      if (idx < 0 || idx >= currentShifts.length) return prev;

      if (currentShifts.length === 1) {
        const cleanDefault = makeDefaultShift();
        return {
          ...prev,
          shifts: [
            {
              ...currentShifts[0],
              startTime: cleanDefault.startTime,
              endTime: cleanDefault.endTime,
              guardsCount: '1',
            },
          ],
        };
      }
      return {
        ...prev,
        shifts: currentShifts.filter((_, i) => i !== idx),
      };
    });
  };

  const removeRangeShift = (di: number, si: number) => {
    cleanupPickers();
    setRangeSchedules(prev => {
      if (!prev || !prev[di]) return prev;
      const newSchedules = prev.map((day, dayIdx) => {
        if (dayIdx !== di) return day;
        return {
          ...day,
          shifts: day.shifts
            ? day.shifts.filter((_, shiftIdx) => shiftIdx !== si)
            : [],
        };
      });
      const filtered = newSchedules.filter(
        day => day.shifts && day.shifts.length > 0,
      );
      if (filtered.length === 0) return [makeDaySchedule(rangeFrom)];
      return filtered;
    });
  };

  const removeIndividualShift = (di: number, si: number) => {
    cleanupPickers();
    setIndividualSchedules(prev => {
      if (!prev || !prev[di]) return prev;
      const newSchedules = prev.map((day, dayIdx) => {
        if (dayIdx !== di) return day;
        return {
          ...day,
          shifts: day.shifts
            ? day.shifts.filter((_, shiftIdx) => shiftIdx !== si)
            : [],
        };
      });
      const filtered = newSchedules.filter(
        day => day.shifts && day.shifts.length > 0,
      );
      if (filtered.length < prev.length) {
        setIndividualDates(filtered.map(d => d.date));
      }
      return filtered;
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
      if (!days[di] || !days[di].shifts?.[si]) return prev;
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
      if (!days[di]) return prev;
      days[di] = {
        ...days[di],
        shifts: [...(days[di].shifts || []), makeDefaultShift()],
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
      if (!days[di] || !days[di].shifts?.[si]) return prev;
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
      if (!days[di]) return prev;
      days[di] = {
        ...days[di],
        shifts: [...(days[di].shifts || []), makeDefaultShift()],
      };
      return days;
    });

  const openTimePicker = (
    mode: 'single' | 'range' | 'individual',
    dayIndex: number,
    shiftIndex: number,
    field: 'startTime' | 'endTime',
  ) => {
    let currentVal: Date;
    if (mode === 'single') {
      currentVal = safeDate(singleDaySchedule.shifts?.[shiftIndex]?.[field]);
    } else if (mode === 'individual') {
      currentVal = safeDate(
        individualSchedules[dayIndex]?.shifts?.[shiftIndex]?.[field],
      );
    } else {
      currentVal = safeDate(
        rangeSchedules[dayIndex]?.shifts?.[shiftIndex]?.[field],
      );
    }
    setPickerValue(currentVal);
    setPickerTarget({ mode, dayIndex, shiftIndex, field });
    setPickerVisible(true);
  };

  const applyTimeChange = (selectedDate: Date) => {
    if (!pickerTarget) return;

    const { mode, dayIndex, shiftIndex, field, taskId } = pickerTarget;

    if (mode === 'master') {
      if (field === 'startTime') setMasterStartTime(selectedDate);
      else setMasterEndTime(selectedDate);
      if (applyToAll)
        applyMasterToAll(
          field === 'startTime' ? selectedDate : masterStartTime,
          field === 'endTime' ? selectedDate : masterEndTime,
          masterGuards,
        );
      setPickerTarget(null);
      return;
    }

    if (mode === 'task' && taskId) {
      setTasks(prev =>
        prev.map(task => {
          if (task.id !== taskId) return task;
          return field === 'startTime'
            ? { ...task, startTime: selectedDate }
            : { ...task, endTime: selectedDate };
        }),
      );
      setPickerTarget(null);
      return;
    }

    let currentShift: Shift | undefined;
    const isSingle = mode === 'single';

    if (isSingle) {
      currentShift = singleDaySchedule?.shifts?.[shiftIndex];
    } else if (mode === 'individual') {
      currentShift = individualSchedules?.[dayIndex]?.shifts?.[shiftIndex];
    } else {
      currentShift = rangeSchedules?.[dayIndex]?.shifts?.[shiftIndex];
    }

    if (!currentShift) {
      setPickerTarget(null);
      return;
    }

    const baseStart = safeDate(currentShift.startTime);
    const baseEnd = safeDate(currentShift.endTime);

    let newStart =
      field === 'startTime'
        ? combineDateAndTime(baseStart, selectedDate)
        : baseStart;
    let newEnd =
      field === 'endTime' ? combineDateAndTime(baseEnd, selectedDate) : baseEnd;

    if (newEnd <= newStart) {
      newEnd = new Date(newEnd.getTime() + 24 * 60 * 60 * 1000);
    }

    const hours = shiftDurationHours(newStart, newEnd);

    if (field === 'endTime' && hours > 13) {
      const splits = splitShift(newStart, newEnd);
      const newShifts = splits.map(s => ({
        id: `shift-${Math.random().toString(36).slice(2, 7)}`,
        startTime: new Date(s.startTime),
        endTime: new Date(s.endTime),
        guardsCount: currentShift?.guardsCount || '1',
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
          setSingleDaySchedule(grouped[0] || { date: new Date(), shifts: [] });
        }
      } else {
        const setFn =
          mode === 'individual' ? setIndividualSchedules : setRangeSchedules;
        setFn((prev: DaySchedule[]) => {
          if (!prev || !prev[dayIndex]) return prev;
          const newList = prev.map(item => ({
            ...item,
            shifts: item.shifts ? [...item.shifts] : [],
          }));
          const target = newList[dayIndex];
          target.shifts = target.shifts.filter((_, i) => i !== shiftIndex);

          newShifts.forEach(shift => {
            const shiftDate = new Date(shift.startTime);
            shiftDate.setHours(0, 0, 0, 0);
            let idx = newList.findIndex(d => isSameDay(d.date, shiftDate));
            if (idx === -1) {
              newList.push({ date: shiftDate, shifts: [shift] });
            } else {
              newList[idx].shifts.push(shift);
            }
          });
          return newList.sort((a, b) => a.date.getTime() - b.date.getTime());
        });
      }
      setPickerTarget(null);
      return;
    }

    const updateValue = field === 'startTime' ? newStart : newEnd;
    if (isSingle) {
      updateSingleShift(shiftIndex, field, updateValue);
    } else if (mode === 'individual') {
      updateIndividualShift(dayIndex, shiftIndex, field, updateValue);
    } else {
      updateRangeShift(dayIndex, shiftIndex, field, updateValue);
    }
    setPickerTarget(null);
  };

  const onTimePickerChange = (_: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setPickerVisible(false);
      if (selectedDate) {
        applyTimeChange(selectedDate);
      } else {
        setPickerTarget(null);
      }
    } else {
      if (selectedDate) setPickerValue(selectedDate);
    }
  };

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
    if (calendarTarget === 'single')
      return isSameDay(d, singleDaySchedule.date);
    if (calendarTarget === 'rangeFrom') return isSameDay(d, rangeFrom);
    if (calendarTarget === 'rangeTo') return isSameDay(d, rangeTo);
    if (calendarTarget === 'individual')
      return individualDates.some(date => isSameDay(date, d));
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
      setSingleDaySchedule({ date: d, shifts: [makeDefaultShift()] });
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
        (day?.shifts && Array.isArray(day.shifts) ? day.shifts : []).reduce(
          (dTotal, shift) => {
            const h = shiftDurationHours(
              safeDate(shift.startTime),
              safeDate(shift.endTime),
            );
            const g = Math.max(
              1,
              parseInt(String(shift.guardsCount || '1'), 10),
            );
            return dTotal + h * g;
          },
          0,
        ),
      0,
    );
  }, [
    scheduleMode,
    multiDayMode,
    singleDaySchedule,
    rangeSchedules,
    individualSchedules,
  ]);

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

  const validateAndNext = () => {
    const newErrors: FormErrors = {};
    if (!form.category) newErrors.category = 'Please select a job category';
    if (form.category === 'others' && !otherCategory.trim()) {
      newErrors.category = 'Please enter job category';
    }
    if (!form.description?.trim()) {
      newErrors.description = 'Description is required';
    }
    if (!form.location?.trim()) {
      newErrors.location = 'Location is required';
    }
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

    if (
      !activeSchedules ||
      activeSchedules.length === 0 ||
      !activeSchedules[0]?.shifts?.[0]
    ) {
      Alert.alert('Schedule Empty', 'Please provide a schedule configuration');
      return;
    }

    const first = activeSchedules[0];
    const last = activeSchedules[activeSchedules.length - 1];

    const hourlyRate = 45;
    const gstPercentage = 10;
    const discountPercentage = 5;
    const subtotal = totalManHours * hourlyRate;
    const gstAmount = subtotal * (gstPercentage / 100);
    const totalQuotation = subtotal + gstAmount;
    const discountAmount = totalQuotation * (discountPercentage / 100);
    const payableNow = totalQuotation - discountAmount;
    const splitAmount = totalQuotation / 2;

    navigation.navigate('ReviewConfirm', {
      jobData: {
        category:
          form.category === 'others' ? otherCategory.trim() : form.category,
        location: form.location || 'Not specified',
        lat: form.lat ?? DEFAULT_LOCATION.lat,
        lng: form.lng ?? DEFAULT_LOCATION.lng,
        description: form.description || '',
        startDate: first.date,
        startTime: first.shifts[0]?.startTime ?? new Date(),
        endDate: last.date,
        endTime: last.shifts[last.shifts.length - 1]?.endTime ?? new Date(),
        shifts: activeSchedules.flatMap(day =>
          (day?.shifts || []).map(s => ({
            date: day.date,
            startTime: s.startTime,
            endTime: s.endTime,
            guardsCount: Number(s.guardsCount || 1),
          })),
        ),
        totalManHours,
        subtotal: parseFloat(subtotal.toFixed(2)),
        gstAmount: parseFloat(gstAmount.toFixed(2)),
        totalQuotation: parseFloat(totalQuotation.toFixed(2)),
        discountAmount: parseFloat(discountAmount.toFixed(2)),
        payableNow: parseFloat(payableNow.toFixed(2)),
        splitAmount: parseFloat(splitAmount.toFixed(2)),
        totalAmount: parseFloat(payableNow.toFixed(2)),
        tasks: tasks.map(t => ({
          title: t.title || 'Untitled Task',
          startTime: t.startTime,
          endTime: t.endTime,
        })),
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
    setForm(prev => ({ ...prev, documents: updated }));
  };

  // Rendering Helper to keep the JSX section clean and safe
  const renderShiftRow = (
    shift: Shift,
    sIdx: number,
    dayIdx: number,
    mode: 'single' | 'range' | 'individual',
  ) => {
    if (!shift) return null;
    return (
      <View key={shift.id || `shift-${sIdx}`} style={styles.shiftCardRow}>
        <TouchableOpacity
          style={styles.timePickerButton}
          onPress={() => openTimePicker(mode, dayIdx, sIdx, 'startTime')}
        >
          <Clock size={16} color={ACCENT_TEAL} />
          <Text style={styles.timePickerText}>
            {formatTime(shift.startTime)}
          </Text>
        </TouchableOpacity>

        <Text style={{ color: TEXT_MUTED }}>to</Text>

        <TouchableOpacity
          style={styles.timePickerButton}
          onPress={() => openTimePicker(mode, dayIdx, sIdx, 'endTime')}
        >
          <Clock size={16} color={ACCENT_TEAL} />
          <Text style={styles.timePickerText}>{formatTime(shift.endTime)}</Text>
        </TouchableOpacity>

        <TextInput
          style={styles.guardsInput}
          keyboardType="number-pad"
          value={shift.guardsCount || '1'}
          onChangeText={val => {
            if (!/^\d*$/.test(val)) return;
            if (mode === 'single') updateSingleShift(sIdx, 'guardsCount', val);
            else if (mode === 'individual')
              updateIndividualShift(dayIdx, sIdx, 'guardsCount', val);
            else updateRangeShift(dayIdx, sIdx, 'guardsCount', val);
          }}
          placeholder="1"
          placeholderTextColor={TEXT_MUTED}
        />

        <TouchableOpacity
          onPress={() => {
            if (mode === 'single') removeSingleShift(sIdx);
            else if (mode === 'individual') removeIndividualShift(dayIdx, sIdx);
            else removeRangeShift(dayIdx, sIdx);
          }}
          style={styles.removeShiftButton}
        >
          <Trash2 size={16} color={ERROR_RED} />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={BRAND_BG} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <ArrowLeft size={22} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create New Job Requirement</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          style={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          {/* Form Fields */}

          {/* Location & Map Selection */}
          <View style={styles.sectionCard}>
            <Text style={styles.inputLabel}>Job Location *</Text>
            <View
              style={[
                styles.searchBarContainer,
                errors.location && styles.inputErrorBorder,
              ]}
            >
              <Search size={18} color={TEXT_MUTED} style={{ marginRight: 8 }} />
              <TextInput
                style={styles.searchBarInput}
                placeholder="Search job site address..."
                placeholderTextColor={TEXT_MUTED}
                value={autocompleteQuery || form.location}
                onChangeText={setAutocompleteQuery}
              />
            </View>
            {errors.location && (
              <Text style={styles.errorText}>{errors.location}</Text>
            )}

            {loadingSuggestions && (
              <ActivityIndicator color={ACCENT_TEAL} style={{ marginTop: 8 }} />
            )}
            {suggestions.map(item => (
              <TouchableOpacity
                key={item.place_id}
                style={styles.suggestionRow}
                onPress={() => selectSuggestion(item)}
              >
                <MapPin
                  size={16}
                  color={TEXT_MUTED}
                  style={{ marginRight: 8 }}
                />
                <Text style={{ color: '#FFF', flex: 1 }}>
                  {item.description}
                </Text>
              </TouchableOpacity>
            ))}

            <View style={styles.mapFrame}>
              <MapView
                ref={mapRef}
                style={StyleSheet.absoluteFillObject}
                initialRegion={{
                  latitude: form.lat,
                  longitude: form.lng,
                  latitudeDelta: 0.0922,
                  longitudeDelta: 0.0421,
                }}
                onMapReady={() => setMapReady(true)}
              >
                <Marker
                  coordinate={{ latitude: form.lat, longitude: form.lng }}
                />
              </MapView>
            </View>
          </View>

          {/* Dynamic Shift Schedule Section */}
          <ScheduleErrorBoundary onReset={resetSchedule}>
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>
                Shift Configuration Schedule
              </Text>

              <View style={styles.modeTabsRow}>
                <TouchableOpacity
                  style={[
                    styles.modeTabButton,
                    scheduleMode === 'single' && styles.modeTabActive,
                  ]}
                  onPress={() => switchScheduleMode('single')}
                >
                  <Text
                    style={[
                      styles.modeTabTxt,
                      scheduleMode === 'single' && styles.modeTabTxtActive,
                    ]}
                  >
                    Single Day
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.modeTabButton,
                    scheduleMode === 'range' && styles.modeTabActive,
                  ]}
                  onPress={() => switchScheduleMode('range')}
                >
                  <Text
                    style={[
                      styles.modeTabTxt,
                      scheduleMode === 'range' && styles.modeTabTxtActive,
                    ]}
                  >
                    Multi-Day
                  </Text>
                </TouchableOpacity>
              </View>

              {scheduleMode === 'single' ? (
                <View>
                  <TouchableOpacity
                    style={styles.calendarTriggerBtn}
                    onPress={() => {
                      setCalendarTarget('single');
                      setCalendarVisible(true);
                    }}
                  >
                    <Calendar
                      size={18}
                      color={ACCENT_TEAL}
                      style={{ marginRight: 8 }}
                    />
                    <Text style={{ color: '#FFF' }}>
                      Date: {formatDate(singleDaySchedule.date)}
                    </Text>
                  </TouchableOpacity>

                  <View style={styles.shiftHeaderRow}>
                    {/* <Text style={[styles.shiftHeaderTxt, { width: 44 }]}>Date</Text> */}
                    <Text style={[styles.shiftHeaderTxt, { flex: 2 }]}>
                      Start → End
                    </Text>
                    <Text style={[styles.shiftHeaderTxt, { width: 56 }]}>
                      Guards
                    </Text>
                    <View style={{ width: 90 }} />
                  </View>

                  {singleDaySchedule.shifts?.map((shift, sIdx) =>
                    renderShiftRow(shift, sIdx, 0, 'single'),
                  )}

                  <TouchableOpacity
                    style={styles.addShiftRowBtn}
                    onPress={addSingleShift}
                  >
                    <Plus size={16} color={ACCENT_TEAL} />
                    <Text
                      style={{
                        color: ACCENT_TEAL,
                        marginLeft: 6,
                        fontWeight: '600',
                      }}
                    >
                      Add Shift Window
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View>
                  <View style={styles.modeTabsRow}>
                    <TouchableOpacity
                      style={[
                        styles.modeTabButton,
                        multiDayMode === 'individual' && styles.modeTabActive,
                      ]}
                      onPress={() => switchMultiDayMode('individual')}
                    >
                      <Text
                        style={[
                          styles.modeTabTxt,
                          multiDayMode === 'individual' &&
                            styles.modeTabTxtActive,
                        ]}
                      >
                        Specific Dates
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.modeTabButton,
                        multiDayMode === 'range' && styles.modeTabActive,
                      ]}
                      onPress={() => switchMultiDayMode('range')}
                    >
                      <Text
                        style={[
                          styles.modeTabTxt,
                          multiDayMode === 'range' && styles.modeTabTxtActive,
                        ]}
                      >
                        Continuous Range
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {multiDayMode === 'range' ? (
                    <View
                      style={{
                        flexDirection: 'row',
                        gap: 12,
                        marginBottom: 12,
                      }}
                    >
                      <TouchableOpacity
                        style={[styles.calendarTriggerBtn, { flex: 1 }]}
                        onPress={() => {
                          setCalendarTarget('rangeFrom');
                          setCalendarVisible(true);
                        }}
                      >
                        <Calendar size={16} color={ACCENT_TEAL} />
                        <Text style={{ color: '#FFF', fontSize: 13 }}>
                          From: {formatDate(rangeFrom)}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.calendarTriggerBtn, { flex: 1 }]}
                        onPress={() => {
                          setCalendarTarget('rangeTo');
                          setCalendarVisible(true);
                        }}
                      >
                        <Calendar size={16} color={ACCENT_TEAL} />
                        <Text style={{ color: '#FFF', fontSize: 13 }}>
                          To: {formatDate(rangeTo)}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={[styles.calendarTriggerBtn, { marginBottom: 14 }]}
                      onPress={openIndividualDatePicker}
                    >
                      <Plus size={16} color={ACCENT_TEAL} />
                      <Text style={{ color: '#FFF' }}>
                        Select Calendar Multi-Dates
                      </Text>
                    </TouchableOpacity>
                  )}

                  {/* Apply to All Master Block */}
                  <View style={styles.masterConfigContainer}>
                    <Text style={styles.masterConfigTitle}>
                      Bulk Apply Time Windows to All Days
                    </Text>
                    <View
                      style={{
                        flexDirection: 'row',
                        gap: 12,
                        alignItems: 'center',
                        marginBottom: 10,
                      }}
                    >
                      <TouchableOpacity
                        style={[styles.timePickerButton, { flex: 1 }]}
                        onPress={() => openMasterTimePicker('startTime')}
                      >
                        <Text style={{ color: '#FFF' }}>
                          {masterStartTime
                            ? formatTime(masterStartTime)
                            : 'Start Time'}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.timePickerButton, { flex: 1 }]}
                        onPress={() => openMasterTimePicker('endTime')}
                      >
                        <Text style={{ color: '#FFF' }}>
                          {masterEndTime
                            ? formatTime(masterEndTime)
                            : 'End Time'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                    <TextInput
                      style={styles.masterGuardsInput}
                      placeholder="Bulk Guards Count"
                      placeholderTextColor={TEXT_MUTED}
                      keyboardType="number-pad"
                      value={masterGuards}
                      onChangeText={onMasterGuardsChange}
                    />
                    <TouchableOpacity
                      style={styles.checkboxRow}
                      onPress={handleApplyToAllToggle}
                    >
                      <View
                        style={[
                          styles.checkboxBox,
                          applyToAll && styles.checkboxChecked,
                        ]}
                      >
                        {applyToAll && <Check size={12} color="#000" />}
                      </View>
                      <Text style={{ color: '#FFF', fontSize: 13 }}>
                        Sync & apply values changes automatically
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Loops Active Schedules Safely */}
                  {(multiDayMode === 'individual'
                    ? individualSchedules
                    : rangeSchedules
                  ).map((day, dIdx) => (
                    <View
                      key={`day-${dIdx}-${day.date.getTime()}`}
                      style={styles.dayGroupContainer}
                    >
                      <Text style={styles.dayGroupHeading}>
                        {formatDate(day.date)}
                      </Text>
                      {day.shifts?.map((shift, sIdx) =>
                        renderShiftRow(shift, sIdx, dIdx, multiDayMode),
                      )}
                      <TouchableOpacity
                        style={styles.addShiftRowBtn}
                        onPress={() =>
                          multiDayMode === 'individual'
                            ? addIndividualShift(dIdx)
                            : addRangeShift(dIdx)
                        }
                      >
                        <Plus size={14} color={ACCENT_TEAL} />
                        <Text
                          style={{
                            color: ACCENT_TEAL,
                            fontSize: 13,
                            marginLeft: 4,
                          }}
                        >
                          Add Shift Window
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </ScheduleErrorBoundary>

          {/* Brief Quotation Summary Chip */}
          <View style={styles.quotationSummaryCard}>
            <View
              style={{ flexDirection: 'row', justifyContent: 'space-between' }}
            >
              <Text style={{ color: TEXT_MUTED }}>Calculated Man-Hours</Text>
              <Text style={{ color: '#FFF', fontWeight: '700' }}>
                {totalManHours.toFixed(1)} hrs
              </Text>
            </View>
          </View>

          {/* Task Management */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Add Task</Text>
            {tasks.map(task => (
              <View key={task.id} style={styles.taskContainerCard}>
                <TextInput
                  style={styles.taskInputBox}
                  placeholder="Task Description Title"
                  placeholderTextColor={TEXT_MUTED}
                  value={task.title}
                  onChangeText={val => updateTask(task.id, 'title', val)}
                />
                <View
                  style={{
                    flexDirection: 'row',
                    gap: 10,
                    marginTop: 8,
                    alignItems: 'center',
                  }}
                >
                  <TouchableOpacity
                    style={[styles.timePickerButton, { flex: 1 }]}
                    onPress={() => openTaskTimePicker(task.id, 'startTime')}
                  >
                    <Text style={{ color: '#FFF', fontSize: 13 }}>
                      {formatTime(task.startTime)}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.timePickerButton, { flex: 1 }]}
                    onPress={() => openTaskTimePicker(task.id, 'endTime')}
                  >
                    <Text style={{ color: '#FFF', fontSize: 13 }}>
                      {formatTime(task.endTime)}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => removeTask(task.id)}
                    style={styles.removeTaskBtn}
                  >
                    <Trash2 size={16} color={ERROR_RED} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
            <TouchableOpacity style={styles.addTaskRowBtn} onPress={addTask}>
              <Plus size={16} color={ACCENT_TEAL} />
              <Text style={{ color: ACCENT_TEAL, fontWeight: '600' }}>
                Add Task
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.sectionCard}>
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
                style={[
                  styles.selectBox,
                  errors.category && styles.inputErrorBorder,
                ]}
                onPress={() => setShowCategoryModal(true)}
              >
                <Text style={{ color: form.category ? '#FFF' : TEXT_MUTED }}>
                  {form.category
                    ? categoryOptions.find(o => o.value === form.category)
                        ?.label || 'Others'
                    : 'Select Category'}
                </Text>
                <ChevronDown size={18} color={ACCENT_TEAL} />
              </TouchableOpacity>
            </LinearGradient>
            {errors.category && (
              <Text style={styles.errorText}>{errors.category}</Text>
            )}

            {form.category === 'others' && (
              <TextInput
                style={[styles.inputBox, { marginTop: 10 }]}
                placeholder="Specify Job Category"
                placeholderTextColor={TEXT_MUTED}
                value={otherCategory}
                onChangeText={setOtherCategory}
              />
            )}
          </View>

          <Text style={styles.inputLabel}>Required Documents</Text>
          <View style={styles.toggleContainer}>
            {documentOptions.slice(0, 3).map(doc => {
              const isActive = form.documents.includes(doc.value);

              return (
                <LinearGradient
                  key={doc.value}
                  colors={['rgba(255,255,255,0.25)', 'rgba(255,255,255,0.08)']}
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

          {/* Job Description */}
          <View style={styles.sectionCard}>
            <View
              style={{ flexDirection: 'row', justifyContent: 'space-between' }}
            >
              <Text style={styles.inputLabel}>Detailed Description *</Text>
              <Text style={{ color: TEXT_MUTED, fontSize: 12 }}>
                {form.description.length}/{MAX_DESCRIPTION_LENGTH}
              </Text>
            </View>
            <TextInput
              style={[
                styles.textAreaBox,
                errors.description && styles.inputErrorBorder,
              ]}
              multiline
              maxLength={MAX_DESCRIPTION_LENGTH}
              placeholder="Provide responsibilities, requirements, dress code, etc."
              placeholderTextColor={TEXT_MUTED}
              value={form.description}
              onChangeText={text =>
                setForm(prev => ({ ...prev, description: text }))
              }
            />
            {errors.description && (
              <Text style={styles.errorText}>{errors.description}</Text>
            )}
          </View>

          {/* File Upload Framework */}
          <View style={styles.sectionCard}>
            <Text style={styles.inputLabel}>
              Upload Supporting Documents / Floor Plans
            </Text>
            <TouchableOpacity
              style={styles.uploadBoxFrame}
              onPress={handleUpload}
              disabled={uploading}
            >
              {uploading ? (
                <ActivityIndicator color={ACCENT_TEAL} />
              ) : (
                <>
                  <CloudUpload size={28} color={ACCENT_TEAL} />
                  <Text style={{ color: '#FFF', marginTop: 6, fontSize: 13 }}>
                    Tap to explore device files
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {selectedFiles.map((file: any, i) => (
              <View key={i} style={styles.fileRowItem}>
                <FileCheck size={16} color={ACCENT_TEAL} />
                <Text style={styles.fileRowTxt} numberOfLines={1}>
                  {file.name || 'document_file.pdf'}
                </Text>
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={styles.primaryActionButton}
            onPress={validateAndNext}
          >
            <LinearGradient
              colors={['#5CE1D6', '#2bbcb0']}
              style={styles.gradientButtonWrapper}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.primaryActionText}>
                Proceed to Quotation Review
              </Text>
              <ArrowRight size={18} color="#001F3F" />
            </LinearGradient>
          </TouchableOpacity>
          <View style={{ height: 40 }} />
        </ScrollView>

        {/* TIME PICKER MODAL CONTAINER */}
        {pickerVisible && (
          <View style={{ alignItems: 'center', paddingHorizontal: 12 }}>
            <DateTimePicker
              mode="time"
              is24Hour={true}
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              value={pickerValue}
              onChange={onTimePickerChange}
              textColor="#FFFFFF"
            />

            {Platform.OS === 'ios' && (
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'center',
                  gap: 12,
                  marginTop: 10,
                }}
              >
                <TouchableOpacity
                  onPress={() => {
                    // Apply the picked value and close picker
                    try {
                      applyTimeChange(pickerValue);
                    } catch (e) {
                      console.warn('Failed to apply time change:', e);
                    }
                    setPickerVisible(false);
                  }}
                  style={{
                    paddingVertical: 10,
                    paddingHorizontal: 16,
                    borderRadius: 10,
                    backgroundColor: ACCENT_TEAL,
                  }}
                >
                  <Text style={{ color: BRAND_BG, fontWeight: '700' }}>
                    Confirm
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    setPickerVisible(false);
                    setPickerTarget(null);
                  }}
                  style={{
                    paddingVertical: 10,
                    paddingHorizontal: 16,
                    borderRadius: 10,
                    backgroundColor: 'rgba(255,255,255,0.08)',
                  }}
                >
                  <Text style={{ color: '#fff', fontWeight: '700' }}>
                    Cancel
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* CUSTOM CALENDAR MODAL */}
        <Modal
          visible={calendarVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setCalendarVisible(false)}
        >
          <View style={styles.modalBackgroundOverlay}>
            <View style={styles.calendarModalContent}>
              <View style={styles.calNavRow}>
                <TouchableOpacity
                  onPress={() =>
                    setCalendarMonth(
                      new Date(
                        calendarMonth.setMonth(calendarMonth.getMonth() - 1),
                      ),
                    )
                  }
                >
                  <ChevronLeft size={20} color="#FFF" />
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
                      new Date(
                        calendarMonth.setMonth(calendarMonth.getMonth() + 1),
                      ),
                    )
                  }
                >
                  <ChevronRight size={20} color="#FFF" />
                </TouchableOpacity>
              </View>

              <View style={styles.calWeekRow}>
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(w => (
                  <Text key={w} style={styles.calWeekDay}>
                    {w}
                  </Text>
                ))}
              </View>

              <View style={styles.daysMatrixGrid}>
                {calendarDays.map((day, idx) => {
                  if (!day)
                    return (
                      <View key={`empty-${idx}`} style={styles.emptyGridCell} />
                    );

                  const isSelected = isDaySelected(day);
                  const inRange = isDayInRange(day);

                  // Check if the date is in the past (before today)
                  const isPast =
                    day < new Date(new Date().setHours(0, 0, 0, 0));

                  return (
                    <TouchableOpacity
                      key={`day-${idx}`}
                      style={[
                        styles.calendarDayCell,
                        isSelected && styles.dayCellSelected,
                        inRange && styles.dayCellInRange,
                        isPast && styles.dayCellDisabled, // Applies disabled styling
                      ]}
                      // If it's a past date, do nothing on press
                      onPress={() => !isPast && onCalendarDayPress(day)}
                      disabled={isPast}
                    >
                      <Text
                        style={[
                          styles.dayCellText,
                          isSelected && styles.dayCellTextSelected,
                          isPast && styles.dayCellTextDisabled, // Grey text color for past dates
                        ]}
                      >
                        {day.getDate()}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TouchableOpacity
                style={{ marginTop: 20, alignSelf: 'flex-end' }}
                onPress={() => setCalendarVisible(false)}
              >
                <Text style={styles.closeModalTextLink}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* CATEGORY SELECTOR MODAL */}
        <Modal
          visible={showCategoryModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowCategoryModal(false)}
        >
          <View style={styles.modalBackgroundOverlay}>
            <View style={styles.bottomSheetContent}>
              <Text style={styles.modalTitleHeader}>
                Select Job Position Category
              </Text>
              {categoryOptions.map(opt => (
                <TouchableOpacity
                  key={opt.value}
                  style={styles.sheetOptionRow}
                  onPress={() => {
                    setForm(prev => ({ ...prev, category: opt.value }));
                    setErrors(prev => ({ ...prev, category: undefined }));
                    setShowCategoryModal(false);
                  }}
                >
                  <Text
                    style={{
                      color: form.category === opt.value ? ACCENT_TEAL : '#FFF',
                      fontSize: 16,
                    }}
                  >
                    {opt.label}
                  </Text>
                  {form.category === opt.value && (
                    <Check size={18} color={ACCENT_TEAL} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Style sheets Definitions ──────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: BRAND_BG },
  header: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  backButton: { padding: 4 },
  headerTitle: { color: '#FFF', fontSize: 18, fontWeight: '700' },
  container: { flex: 1, padding: 16 },
  sectionCard: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: BORDER_COLOR,

    // Stronger & Softer Shadow
    shadowColor: '#a6cdf4',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,

    // Android elevation
    elevation: 18,
  },
  inputLabel: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  selectBox: {
    height: 50,
    backgroundColor: CHIP_DARK,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
  },
  inputBox: {
    height: 50,
    backgroundColor: CHIP_DARK,
    borderRadius: 10,
    color: TEXT_PRIMARY,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  textAreaBox: {
    height: 120,
    backgroundColor: CHIP_DARK,
    borderRadius: 10,
    color: TEXT_PRIMARY,
    paddingHorizontal: 14,
    paddingTop: 12,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  inputErrorBorder: { borderColor: ERROR_RED, borderWidth: 1 },
  errorText: {
    color: ERROR_RED,
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
  searchBarContainer: {
    height: 50,
    backgroundColor: CHIP_DARK,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  searchBarInput: { flex: 1, color: '#FFF' },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  dayCellDisabled: {
    backgroundColor: '#1E293B', // Darker/muted background matching your theme
    opacity: 0.35, // Blurs out the button to look disabled
  },
  dayCellTextDisabled: {
    color: '#64748B', // Muted slate grey text color
    textDecorationLine: 'line-through', // Optional: Adds a line-through look
  },
  mapFrame: {
    height: 180,
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 12,
  },
  sectionTitle: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12,
  },
  dropdownGradient: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 0,
  },
  modeTabsRow: {
    flexDirection: 'row',
    backgroundColor: CHIP_DARK,
    borderRadius: 8,
    padding: 4,
    marginBottom: 14,
  },
  modeTabButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  modeTabActive: { backgroundColor: BRAND_BG },
  modeTabTxt: { color: TEXT_MUTED, fontSize: 13, fontWeight: '600' },
  modeTabTxtActive: { color: ACCENT_TEAL },
  calendarTriggerBtn: {
    height: 46,
    backgroundColor: CHIP_DARK,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  shiftCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: CHIP_DARK,
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  timePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: BRAND_BG,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  timePickerText: { color: '#FFF', fontSize: 13, fontWeight: '600' },
  guardsInput: {
    width: 45,
    height: 36,
    backgroundColor: BRAND_BG,
    borderRadius: 6,
    color: '#FFF',
    textAlign: 'center',
    padding: 0,
  },
  removeShiftButton: { padding: 6 },
  addShiftRowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingVertical: 4,
  },
  masterConfigContainer: {
    backgroundColor: BRAND_BG,
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  masterConfigTitle: {
    color: TEXT_MUTED,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
  },
  masterGuardsInput: {
    height: 40,
    backgroundColor: CHIP_DARK,
    borderRadius: 6,
    color: '#FFF',
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  checkboxBox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: TEXT_MUTED,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: { backgroundColor: ACCENT_TEAL, borderColor: ACCENT_TEAL },
  dayGroupContainer: {
    backgroundColor: BRAND_BG,
    borderRadius: 10,
    padding: 10,
    marginTop: 12,
  },
  dayGroupHeading: { color: ACCENT_TEAL, fontSize: 13, fontWeight: '700' },
  taskContainerCard: {
    backgroundColor: CHIP_DARK,
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  taskInputBox: {
    borderBottomWidth: 1,
    borderBottomColor: BRAND_BG,
    color: '#FFF',
    paddingVertical: 4,
    fontSize: 14,
  },
  removeTaskBtn: { padding: 8 },
  addTaskRowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  uploadBoxFrame: {
    height: 90,
    borderWidth: 1,
    borderColor: ACCENT_TEAL,
    borderStyle: 'dashed',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: CHIP_DARK,
  },
  fileRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    paddingHorizontal: 4,
  },
  fileRowTxt: { color: TEXT_MUTED, fontSize: 12, flex: 1 },
  quotationSummaryCard: {
    backgroundColor: '#1E293B',
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
  },
  primaryActionButton: { height: 54, borderRadius: 12, overflow: 'hidden' },
  gradientButtonWrapper: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  primaryActionText: { color: '#001F3F', fontSize: 16, fontWeight: '700' },
  modalBackgroundOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: 20,
  },
  calendarModalContent: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  calNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  calendarMonthHeadingText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  calWeekRow: { flexDirection: 'row', marginBottom: 6 },
  calWeekDay: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    color: TEXT_MUTED,
    fontWeight: '600',
  },
  daysMatrixGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  emptyGridCell: { width: (width - 76) / 7, height: 38 },
  calendarDayCell: {
    width: (width - 76) / 7,
    height: 38,
    backgroundColor: CHIP_DARK,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCellSelected: { backgroundColor: ACCENT_TEAL },
  dayCellInRange: { backgroundColor: '#1E293B' },
  dayCellText: { color: '#FFF', fontSize: 13 },
  dayCellTextSelected: { color: '#001F3F', fontWeight: '700' },
  closeModalTextLink: { color: ACCENT_TEAL, fontSize: 14, fontWeight: '600' },
  bottomSheetContent: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
  },
  modalTitleHeader: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 14,
  },
  sheetOptionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: BRAND_BG,
  },
  modalDoneButton: {
    height: 46,
    backgroundColor: ACCENT_TEAL,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 14,
  },
  toggleContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  toggleCard: {
    width: '48%',
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  toggleRow: {
    padding: 13,
    minHeight: 90,
    justifyContent: 'space-between',
    backgroundColor: CARD_BG, // Changed from dark rgba
    borderRadius: 12,
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
  shiftHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    // marginBottom: 8,
    opacity: 0.9,
  },
  shiftHeaderTxt: {
    color: TEXT_MUTED,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
});
