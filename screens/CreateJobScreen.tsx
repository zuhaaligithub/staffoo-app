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
import { BASE_URL, getAuthToken, uploadFile } from '../services/authApi';
import Toast from 'react-native-toast-message';
import axios, { isCancel } from 'axios';

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
import { RatesConfig } from '../utils/rateCalculator';

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
  const [ratesData, setRatesData] = useState<any[]>([]); // To store API response

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
  const [ratesLoading, setRatesLoading] = useState(true);
  const [ratesError, setRatesError] = useState<string | null>(null);
  const [selectedJobLevel, setSelectedJobLevel] = useState<string | null>(null);
  const [rangeFrom, setRangeFrom] = useState<Date>(new Date());
  const [rangeTo, setRangeTo] = useState<Date>(new Date());
  const [rangeSchedules, setRangeSchedules] = useState<DaySchedule[]>(() =>
    datesBetween(new Date(), new Date()).map(makeDaySchedule),
  );
  const [rates, setRates] = useState<RatesConfig | null>(null);
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

  useEffect(() => {
    (async () => {
      try {
        const token = await getAuthToken();
        const res = await axios.get(`${BASE_URL}/get-chargerates`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.data?.success) {
          setRatesData(res.data.data); // Store the array
        }
      } catch (e) {
        console.error('Failed to load rates', e);
      }
    })();
  }, []);

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
  // Add this state
  const [currentJobLevel, setCurrentJobLevel] = useState<number>(1);
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
    { label: 'White Card Required?', value: 'white_card' },
    { label: 'Working With Children Check?', value: 'working_with_children' },
  ];

  // const categoryOptions = [
  //   { label: 'Event Security', value: 'event-security' },
  //   { label: 'Static Security Guard', value: 'static-security' },
  //   { label: 'Corporate Security', value: 'corporate-security' },
  //   { label: 'Site Patrol Security', value: 'site-patrol' },
  //   { label: 'Others', value: 'others' },
  // ];

  const categoryOptions = [
    // { value: '', label: 'Select type' },
    {
      label: 'Crowd Controller (Standard Venue/Event)',
      value: 'Crowd Controller (Standard venue/event)',
    },
    {
      label: 'Static Security Guard (Gatehouse, Warehouse, Construction Site)',
      value: 'Static Security Guard (Gatehouse, warehouse, construction site)',
    },
    {
      label: 'Patrol Guard (Foot or Routine Mobile Patrol)',
      value: 'Patrol Guard (Foot or routine mobile patrol)',
    },
    {
      label: 'Concierge/Front of House Guard',
      value: 'Concierge/Front of House Guard',
    },
    {
      label: 'Security Officer - Monitoring/Control Room (Basic)',
      value: 'Security Officer - Monitoring/Control Room (Basic)',
    },
    {
      label: 'Guard with a Trained Security Dog',
      value: 'Guard with a Trained Security Dog',
    },
    {
      label: 'Armed Security Guard (Cash-in-Transit / Low-complexity)',
      value: 'Armed Security Guard (Cash-in-Transit / Low-complexity)',
    },
    {
      label: 'Control Room Operator (Advanced/Full Systems)',
      value: 'Control Room Operator (Advanced/Full Systems)',
    },
    {
      label: 'Event/Venue Supervisor (Small Team Leader)',
      value: 'Event/Venue Supervisor (Small Team Leader)',
    },
    {
      label: 'Aviation/Maritime Security Protection Officer',
      value: 'Aviation/Maritime Security Protection Officer',
    },
    {
      label: 'Senior Security Supervisor / Shift Supervisor',
      value: 'Senior Security Supervisor / Shift Supervisor',
    },
    {
      label: 'Mobile Patrol Inspector / Fleet Coordinator',
      value: 'Mobile Patrol Inspector / Fleet Coordinator',
    },
    {
      label: 'Control Room Shift Manager',
      value: 'Control Room Shift Manager',
    },
    {
      label: 'Security Operations Manager',
      value: 'Security Operations Manager',
    },
    { label: 'Regional Contract Manager', value: 'Regional Contract Manager' },
    {
      label: 'Chief Security Instructor / Compliance Auditor',
      value: 'Chief Security Instructor / Compliance Auditor',
    },
    { label: 'Others (Custom Entry)', value: 'others' },
  ];

  const openIndividualDatePicker = () => {
    setCalendarTarget('individual');
    setCalendarVisible(true);
  };

  // Always include Security License (required) even though hidden from UI
  const documentTypes = [
    'security_license', // Always required
    ...form.documents
      .map(doc => (doc === 'others' ? otherDocument.trim() : doc))
      .filter(Boolean),
  ].filter((value, index, self) => self.indexOf(value) === index); // Remove duplicates if any

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
          () => { },
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
        text2: `Long shift (${hours.toFixed(1)}h) split into ${splits.length
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
          text1: `${newPaths.length} File${newPaths.length !== 1 ? 's' : ''
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
        jobLevel: selectedJobLevel || String(currentJobLevel || 1),
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



  // Auto-calculate and highlight matching level when category changes
  useEffect(() => {
    if (!form.category) return;
    const newLevel = calculateJobLevel(form.category);
    setCurrentJobLevel(newLevel);
    // Find the matching ratesData item whose level matches and auto-highlight it
    const matchedItem = ratesData.find(
      item => String(item.level) === String(newLevel),
    );
    if (matchedItem) {
      setSelectedJobLevel(matchedItem.level);
    }
  }, [form.category, ratesData]);

  const calculateJobLevel = (title: string): number => {
    if (!title) return 1;
    const t = title.toLowerCase();

    // Mapping logic based on your category list
    if (
      t.includes('manager') ||
      t.includes('auditor') ||
      t.includes('instructor')
    )
      return 5;
    if (
      t.includes('supervisor') ||
      t.includes('patrol inspector') ||
      t.includes('coordinator')
    )
      return 4;
    if (
      t.includes('operator') ||
      t.includes('aviation') ||
      t.includes('maritime')
    )
      return 3;
    if (t.includes('dog') || t.includes('armed') || t.includes('monitoring'))
      return 2;

    return 1; // Default
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
            onPress={() => navigation.navigate('Profile')}
            style={styles.backButton}
          >
            <ArrowLeft size={22} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create New Job</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          style={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          {/* <View style={styles.sectionCard}>
            <Text style={styles.inputLabel}>
              Select Security Service Level *
            </Text>
            <View style={styles.levelContainer}>
              {ratesData.map(item => (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => setSelectedJobLevel(item.level)}
                  style={[
                    styles.levelToggle,
                    selectedJobLevel === item.level && styles.levelToggleActive,
                  ]}
                >
                  <Text
                    style={
                      selectedJobLevel === item.level
                        ? styles.textActive
                        : styles.textInactive
                    }
                  >
                    {item.title}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View> */}

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
                      Add Shift
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
              <Text style={{ color: TEXT_MUTED }}>Calculated Hours</Text>
              <Text style={{ color: '#FFF', fontWeight: '700' }}>
                {totalManHours.toFixed(1)} hrs
              </Text>
            </View>
          </View>

          {/* Task Management */}
          {/* <View style={styles.sectionCard}>
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
          </View> */}

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
          {/* <View style={styles.toggleContainer}>
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
          </View> */}

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
                    <Text style={styles.toggleLabel}>{doc.label}</Text>

                    {/* SWITCH */}
                    <TouchableOpacity
                      activeOpacity={1}
                      style={styles.toggleSwitch}
                      onPress={() => toggleDocument(doc.value)}
                    >
                      {/* YES Side */}
                      <View style={[
                        styles.toggleOption,
                        isActive && styles.toggleOptionActiveYes
                      ]}>
                        <Text style={[
                          styles.toggleText,
                          isActive && styles.toggleTextActive
                        ]}>
                          Yes
                        </Text>
                      </View>

                      {/* NO Side */}
                      <View style={[
                        styles.toggleOption,
                        !isActive && styles.toggleOptionActiveNo
                      ]}>
                        <Text style={[
                          styles.toggleText,
                          !isActive && styles.toggleTextActive
                        ]}>
                          No
                        </Text>
                      </View>
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
              onChangeText={text => {
                setForm(prev => ({
                  ...prev,
                  description: text,
                }));

                setErrors(prev => ({
                  ...prev,
                  description: text.trim().length > 0 ? '' : prev.description,
                }));
              }}
            />
            {errors.description && (
              <Text style={styles.errorText}>{errors.description}</Text>
            )}
          </View>

          {/* File Upload Framework */}
          <View style={styles.sectionCard}>
            <Text style={styles.inputLabel}>
              Upload Documents
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

              {/* Scrollable List */}
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 20 }}
              >
                {categoryOptions.map(opt => (
                  <TouchableOpacity
                    key={opt.value}
                    style={styles.sheetOptionRow}
                    onPress={() => {
                      setForm(prev => ({
                        ...prev,
                        category: opt.value,
                      }));
                      setErrors(prev => ({
                        ...prev,
                        category: undefined,
                      }));
                      setShowCategoryModal(false);
                    }}
                  >
                    <Text
                      style={{
                        color:
                          form.category === opt.value ? ACCENT_TEAL : '#FFF',
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
              </ScrollView>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Style sheets Definitions ──────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    //  backgroundColor: BRAND_BG
    backgroundColor: '#111111',
    paddingTop: 25,
  },
  header: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    // borderBottomWidth: 1,
    // borderBottomColor: '#1E293B',
  },
  backButton: { padding: 4 },
  headerTitle: { color: '#FFF', fontSize: 18, fontWeight: '700' },
  container: { flex: 1, padding: 16 },
  sectionCard: {
    // backgroundColor: CARD_BG,
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: BORDER_COLOR,

    // Stronger & Softer Shadow
    // shadowColor: '#a6cdf4',
    // shadowOffset: { width: 0, height: 6 },
    // shadowOpacity: 0.5,
    // shadowRadius: 12,

    // Android elevation
    // elevation: 18,
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
    height: 35,
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
  levelContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  levelToggle: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#334155',
    borderRadius: 8,
  },
  levelToggleActive: {
    backgroundColor: '#14E6C9', // ACCENT_TEAL
  },
  textActive: { color: '#001F3F', fontWeight: 'bold' },
  textInactive: { color: '#F1F5F9' },
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
  // bottomSheetContent: {
  //   backgroundColor: CARD_BG,
  //   borderRadius: 16,
  //   padding: 20,
  //   borderTopWidth: 1,
  //   borderTopColor: '#1E293B',
  // },

  bottomSheetContent: {
    backgroundColor: CARD_BG,
    maxHeight: '70%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
  },
  modalTitleHeader: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '800',
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



  toggleKnob: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
    position: 'absolute',
    left: 3,
  },

  toggleKnobActive: {
    left: undefined,
    right: 3, // THIS moves knob to right
  },




  toggleSwitch: {
    width: 85,
    height: 34,
    borderRadius: 50,
    backgroundColor: '#F4F5F7',
    flexDirection: 'row',
    alignItems: 'center',
    // padding: 2,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden', // <--- ADD THIS LINE
  },
  toggleOption: {
    flex: 1,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 0, // Matches the inner curvature 
  },
  toggleOptionActiveYes: {
    backgroundColor: '#1A8754', // The green color from your image
  },
  toggleOptionActiveNo: {
    backgroundColor: '#6B7280', // Dark gray for when "No" is selected
  },
  toggleText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4B5563', // Dark text for the unselected option
  },
  toggleTextActive: {
    color: '#FFFFFF', // White text for the selected option
  },

  // --- YOUR EXISTING STYLES ---
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
    borderColor: 'rgba(255,255,255,0.2)', // Assuming a fallback for BORDER_COLOR
  },
  toggleRow: {
    padding: 13,
    minHeight: 90,
    justifyContent: 'space-between',
    backgroundColor: '#1E1E1E', // Assuming a fallback for CARD_BG
    borderRadius: 12,
  },
  toggleContent: {
    gap: 6,
  },
  toggleLabel: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '700',
    lineHeight: 20,
  },
});
