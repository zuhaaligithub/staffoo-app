import React, { useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {
  ChevronLeft,
  FileText,
  Files,
  ShieldCheck,
  CheckCircle,
  ArrowLeft,
} from 'lucide-react-native';

import CheckBox from '@react-native-community/checkbox';
import { useNavigation, useRoute } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { postJob } from '../services/authApi';
import axios from 'axios';
const BASE_URL = 'https://apis.staffoo.com.au/api';
type DayType = 'weekday' | 'fri' | 'sat' | 'sun';
type Slot = 'day' | 'night';

interface RateSlot {
  day: number;
  night: number;
}

interface RatesConfig {
  pay: Record<DayType, RateSlot>;
  charge: Record<DayType, RateSlot>;
}

interface ShiftSegment {
  label: string;
  hours: number;
  payRate: number;
  chargeRate: number;
}

interface CostBreakdown {
  chargeTotal: number;
  payTotal: number;
  guardHours: number;
  avgChargePerHour: number;
  avgPayPerHour: number;
  breakdown: Array<{
    type: string;
    hours: number;
    payRate: number;
    chargeRate: number;
    payCost: number;
    chargeCost: number;
  }>;
  segments: ShiftSegment[];
  totalShiftHours: number;
}

const STATIC_PAY_RATES: RatesConfig['pay'] = {
  weekday: { day: 25.0, night: 30.0 },
  fri: { day: 28.0, night: 33.0 },
  sat: { day: 32.0, night: 38.0 },
  sun: { day: 32.0, night: 38.0 },
};

const STATIC_RATES: RatesConfig = {
  pay: STATIC_PAY_RATES,
  charge: {
    weekday: { day: 35.0, night: 42.0 },
    fri: { day: 40.0, night: 47.0 },
    sat: { day: 45.0, night: 52.0 },
    sun: { day: 45.0, night: 52.0 },
  },
};

const SEGMENT_LABELS: Record<string, string> = {
  weekday_day: 'Mon–Thu Day (06:00–18:00)',
  weekday_night: 'Mon–Thu Night (18:00–06:00)',
  fri_day: 'Friday Day (06:00–18:00)',
  fri_night: 'Friday Night (18:00–06:00)',
  sat_day: 'Saturday Day (06:00–18:00)',
  sat_night: 'Saturday Night (18:00–06:00)',
  sun_day: 'Sunday Day (06:00–18:00)',
  sun_night: 'Sunday Night (18:00–06:00)',
};
interface ApiChargeRate {
  def_metro_mon_to_fri_day_rate: string;
  def_metro_mon_to_fri_night_rate: string;
  def_metro_sat_day_rate: string;
  def_metro_sat_night_rate: string;
  def_metro_sun_day_rate: string;
  def_metro_sun_night_rate: string;
}

interface ChargeRateItem {
  day_type: DayType;
  day_rate: number;
  night_rate: number;
}

type ChargeRateResponse = ChargeRateItem[];

function convertApiRatesToConfig(apiRates: ChargeRateResponse): RatesConfig {
  const charge: Record<DayType, RateSlot> = {
    weekday: { day: 0, night: 0 },
    fri: { day: 0, night: 0 },
    sat: { day: 0, night: 0 },
    sun: { day: 0, night: 0 },
  };
  apiRates.forEach((item) => {
    const day = item.day_type;
    if (day in charge) {
      charge[day as DayType] = {
        day: item.day_rate ?? 0,
        night: item.night_rate ?? 0,
      };
    }
  });
  return {
    pay: STATIC_PAY_RATES,
    charge,
  };
}

async function fetchChargeRates(): Promise<RatesConfig> {
  try {
    const token = await AsyncStorage.getItem('@auth_token'); // adjust key name if different
    if (!token) throw new Error('No token');

    const res = await axios.get<ChargeRateResponse>(`${BASE_URL}/get-chargerates`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });

    if (!Array.isArray(res.data)) {
      throw new Error('Unexpected response format - expected array');
    }

    return convertApiRatesToConfig(res.data);
  } catch (err) {
    console.warn('Failed to fetch charge rates, using static fallback', err);
    return STATIC_RATES;
  }
}

function getDayType(date: Date): DayType {
  const d = date.getDay();
  if (d === 0) return 'sun';
  if (d === 5) return 'fri';
  if (d === 6) return 'sat';
  return 'weekday';
}

function getSlot(hour: number): Slot {
  return hour >= 6 && hour < 18 ? 'day' : 'night';
}

function nextBoundary(t: Date): Date {
  const h = t.getHours();
  const next = new Date(t);
  next.setSeconds(0, 0);

  if (h < 6) {
    next.setHours(6, 0, 0, 0);
  } else if (h < 18) {
    next.setHours(18, 0, 0, 0);
  } else {
    next.setDate(next.getDate() + 1);
    next.setHours(0, 0, 0, 0);
  }
  return next;
}



function calculateShiftCost(
  startDate?: Date,
  startTime?: Date,
  endDate?: Date,
  endTime?: Date,
  numGuards: number = 1,
  rates: RatesConfig = STATIC_RATES
): CostBreakdown {
  if (!startDate || !startTime || !endDate || !endTime) {
    return getEmptyBreakdown();
  }
  const start = new Date(startDate);
  start.setHours(startTime.getHours(), startTime.getMinutes(), 0, 0);
  const end = new Date(endDate);
  end.setHours(endTime.getHours(), endTime.getMinutes(), 0, 0);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
    return getEmptyBreakdown();
  }
  const hoursMap = new Map<string, number>();
  const keyOrder: string[] = [];
  let t = new Date(start);
  while (t < end) {
    const boundary = nextBoundary(t);
    const segEnd = boundary < end ? boundary : end;
    const segMs = segEnd.getTime() - t.getTime();
    const segHours = segMs / 3600000;
    const dayType = getDayType(t);
    const slot = getSlot(t.getHours());
    const key = `${dayType}_${slot}`;
    if (!hoursMap.has(key)) {
      hoursMap.set(key, 0);
      keyOrder.push(key);
    }
    hoursMap.set(key, (hoursMap.get(key) || 0) + segHours);
    t = new Date(segEnd);
  }

  let paySubtotal = 0;
  let chargeSubtotal = 0;
  const breakdown: Array<{
    type: string;
    hours: number;
    payRate: number;
    chargeRate: number;
    payCost: number;
    chargeCost: number;
  }> = [];
  const segments: ShiftSegment[] = [];

  keyOrder.forEach((key) => {
    const [dayTypeStr, slotStr] = key.split('_') as [DayType, Slot];
    const hours = Math.round((hoursMap.get(key) || 0) * 100) / 100;
    if (hours <= 0) return;
    const payRate = rates.pay[dayTypeStr]?.[slotStr] ?? 0;
    const chargeRate = rates.charge[dayTypeStr]?.[slotStr] ?? 0;
    const payCost = payRate * hours * numGuards;
    const chargeCost = chargeRate * hours * numGuards;
    paySubtotal += payCost;
    chargeSubtotal += chargeCost;
    const label = SEGMENT_LABELS[key] || key;
    const guardHours = hours * numGuards;

    breakdown.push({
      type: label,
      hours: guardHours,
      payRate,
      chargeRate,
      payCost,
      chargeCost,
    });
    segments.push({ label, hours, payRate, chargeRate });
  });

  const totalShiftHours = keyOrder.reduce((sum, k) => sum + (hoursMap.get(k) || 0), 0);

  return {
    chargeTotal: chargeSubtotal,
    payTotal: paySubtotal,
    guardHours: totalShiftHours * numGuards,
    avgChargePerHour: chargeSubtotal > 0 ? chargeSubtotal / (totalShiftHours * numGuards) : 0,
    avgPayPerHour: paySubtotal > 0 ? paySubtotal / (totalShiftHours * numGuards) : 0,
    breakdown,
    segments,
    totalShiftHours: Math.round(totalShiftHours * 100) / 100,
  };
}

function getEmptyBreakdown(): CostBreakdown {
  return {
    chargeTotal: 0,
    payTotal: 0,
    guardHours: 0,
    avgChargePerHour: 0,
    avgPayPerHour: 0,
    breakdown: [],
    segments: [],
    totalShiftHours: 0,
  };
}

type RouteParams = {
  jobData?: {
    title?: string;
    category?: string;
    guardsCount?: number;
    startDate?: Date;
    startTime?: Date;
    endDate?: Date;
    endTime?: Date;
    location?: string;
    description?: string;
    lat?: number;
    lng?: number;
  };
  uploadedFileUrls?: string[];
  uploadedFileNames?: string[];
  selectedDocuments?: string[];
};

export default function ReviewConfirmScreen() {
  const navigation = useNavigation();
  const route = useRoute();

  const {
    jobData = {},
    uploadedFileUrls = [],
    uploadedFileNames = [],
    selectedDocuments = [],
  } = (route.params || {}) as RouteParams;
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rates, setRates] = useState<RatesConfig>(STATIC_RATES);
  const [ratesLoading, setRatesLoading] = useState(true);
  useEffect(() => {
    let mounted = true;
    const loadRates = async () => {
      try {
        setRatesLoading(true);
        const token = await AsyncStorage.getItem('@auth_token');
        if (!token) throw new Error('No token');
        const res = await axios.get(`${BASE_URL}/get-chargerates`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.data?.success && Array.isArray(res.data.data) && res.data.data.length > 0) {
          const item = res.data.data[0] as ApiChargeRate;
          const charge = {
            weekday: {
              day: Number(item.def_metro_mon_to_fri_day_rate),
              night: Number(item.def_metro_mon_to_fri_night_rate),
            },
            fri: {
              day: Number(item.def_metro_mon_to_fri_day_rate),
              night: Number(item.def_metro_mon_to_fri_night_rate),
            },
            sat: {
              day: Number(item.def_metro_sat_day_rate),
              night: Number(item.def_metro_sat_night_rate),
            },
            sun: {
              day: Number(item.def_metro_sun_day_rate),
              night: Number(item.def_metro_sun_night_rate),
            },
          };

          setRates({
            pay: STATIC_PAY_RATES,
            charge,
          });
          console.log('Mapped API charge rates:', charge);
        } else {
          throw new Error('Invalid rates data');
        }
      } catch (err) {
        console.warn('Rates fetch failed → fallback', err);
        setRates(STATIC_RATES);
      } finally {
        setRatesLoading(false);
      }
    };
    loadRates();
    return () => {
      mounted = false;
    };
  }, []);

  const costBreakdown = useMemo(
    () =>
      calculateShiftCost(
        jobData.startDate,
        jobData.startTime,
        jobData.endDate,
        jobData.endTime,
        jobData.guardsCount || 1,
        rates
      ),
    [jobData.startDate, jobData.startTime, jobData.endDate, jobData.endTime, jobData.guardsCount, rates]
  );

  if (!jobData || Object.keys(jobData).length === 0) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>
          Error: No job information received.{'\n'}
          Please go back and try creating the job again.
        </Text>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const getCategoryDisplay = (cat?: string) => {
    const map: Record<string, string> = {
      'event-security': 'Event Security',
      'static-security': 'Static Security Guard',
      'corporate-security': 'Corporate Security',
      'site-patrol': 'Site Patrol Security',
      others: 'Others',
    };
    return map[cat || ''] || cat || 'Not specified';
  };

  const formatDateTime = (date?: Date, time?: Date) => {
    if (!date || !time) return 'Not set';
    try {
      const combined = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
        time.getHours(),
        time.getMinutes(),
        0,
        0
      );
      return combined.toLocaleString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
    } catch {
      return 'Invalid date/time';
    }
  };

  const handleConfirm = async () => {
    if (!agreeToTerms) {
      Alert.alert('Agreement Required', 'Please agree to the Terms & Conditions.');
      return;
    }

    if (
      !jobData.startDate ||
      !jobData.startTime ||
      !jobData.endDate ||
      !jobData.endTime
    ) {
      Alert.alert(
        'Incomplete Information',
        'Start date/time or end date/time is missing. Please go back and fill them.'
      );
      return;
    }

    Alert.alert(
      'Confirm Job Posting',
      'Are you sure you want to post this job?\nOnce posted, it will be visible to available guards.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, Post Job',
          style: 'default',
          onPress: async () => {
            setIsSubmitting(true);

            try {
              const userStr = await AsyncStorage.getItem('user');
              if (!userStr) throw new Error('User session not found');

              const user = JSON.parse(userStr);
              const userId = user.id;

              const start = new Date(
                jobData.startDate!.getFullYear(),
                jobData.startDate!.getMonth(),
                jobData.startDate!.getDate(),
                jobData.startTime!.getHours(),
                jobData.startTime!.getMinutes(),
                0,
                0
              );

              const end = new Date(
                jobData.endDate!.getFullYear(),
                jobData.endDate!.getMonth(),
                jobData.endDate!.getDate(),
                jobData.endTime!.getHours(),
                jobData.endTime!.getMinutes(),
                0,
                0
              );

              const pad = (num: number) => String(num).padStart(2, '0');

              const startTimeStr = `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(
                start.getDate()
              )}T${pad(start.getHours())}:${pad(start.getMinutes())}:00`;

              const endTimeStr = `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(
                end.getDate()
              )}T${pad(end.getHours())}:${pad(end.getMinutes())}:00`;

              const payload = {
                user_id: userId,
                title: jobData.title || `${getCategoryDisplay(jobData.category)} Security Job`,
                description: jobData.description || 'No description provided',
                address: jobData.location || 'Not specified',
                coordinates: `${(jobData.lat ?? 31.5204).toFixed(8)},${(jobData.lng ?? 74.3587).toFixed(8)}`,
                state: 'Punjab',
                numberOfGuards: jobData.guardsCount || 1,
                startTime: startTimeStr,
                endTime: endTimeStr,
                is_document: selectedDocuments.length > 0,
                document_list: uploadedFileUrls,
                document_types: selectedDocuments,
                job_instruction: jobData.description || '',
              };

              const response = await postJob(payload);

              Toast.show({
                type: 'success',
                text1: 'Job Posted Successfully',
                text2: response?.message || 'Your job is now visible to guards',
                position: 'bottom',
              });

              navigation.reset({
                index: 0,
                routes: [{ name: 'Applications' as never }],
              });
            } catch (error: any) {
              const errorMsg =
                error?.response?.data?.message ||
                error?.response?.data?.error ||
                error.message ||
                'Failed to post job. Please try again.';

              Toast.show({
                type: 'error',
                text1: 'Error Posting Job',
                text2: errorMsg,
                position: 'bottom',
              });
            } finally {
              setIsSubmitting(false);
            }
          },
        },
      ]
    );
  };

  const goBack = () => navigation.goBack();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={goBack} style={styles.backBox}>
          <ChevronLeft size={28} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Review & Confirm</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          <View style={styles.cardSectionHeader}>
          <FileText size={22} color="#2563EB" />
            <Text style={styles.sectionTitle}>Job Details</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.label}>Job Title:</Text>
            <View style={styles.inputCard}>
              <Text style={styles.inputCardText}>
                {jobData.title || `${getCategoryDisplay(jobData.category)} Security Job`}
              </Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.label}>Job Category:</Text>
            <View style={styles.inputCard}>
              <Text style={styles.inputCardText}>{getCategoryDisplay(jobData.category)}</Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.label}>Number of Guards:</Text>
            <View style={styles.inputCard}>
              <Text style={styles.inputCardText}>{jobData.guardsCount || 1}</Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.label}>Start:</Text>
            <View style={styles.inputCard}>
              <Text style={styles.inputCardText}>
                {formatDateTime(jobData.startDate, jobData.startTime)}
              </Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.label}>End:</Text>
            <View style={styles.inputCard}>
              <Text style={styles.inputCardText}>
                {formatDateTime(jobData.endDate, jobData.endTime)}
              </Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.label}>Location:</Text>
            <View style={styles.inputCard}>
              <Text style={styles.inputCardText}>{jobData.location || 'Not specified'}</Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.label}>Description:</Text>
            <View style={styles.inputCard}>
              <Text style={styles.inputCardText}>
                {jobData.description || 'No description provided'}
              </Text>
            </View>
          </View>

          {uploadedFileUrls.length > 0 && (
            <View style={styles.detailRow}>
              <Text style={styles.label}>Attachments:</Text>
              <View style={styles.inputCard}>
                {uploadedFileUrls.map((url, i) => (
                  <View key={i} style={{ flexDirection: 'row', alignItems: 'center', marginTop: i === 0 ? 0 : 6 }}>
                   <Files size={18} color="#2563EB" />
                    <Text style={{ marginLeft: 8, color: '#2563EB', flexShrink: 1, fontSize: 14 }} numberOfLines={1}>
                      {uploadedFileNames[i] || url.split('/').pop() || `File ${i + 1}`}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {selectedDocuments.length > 0 && (
            <View style={styles.detailRow}>
              <Text style={styles.label}>Required Docs:</Text>
              <View style={styles.inputCard}>
                <Text style={styles.inputCardText}>
                  {selectedDocuments.map(v => v.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())).join(', ')}
                </Text>
              </View>
            </View>
          )}
        </View>

        <View style={styles.rateCard}>
          <View style={styles.rateMainHeader}>
            <Text style={styles.rateMainTitle}>Rate Breakdown</Text>
            <Text style={styles.rateMainSubtitle}>
              {costBreakdown.totalShiftHours.toFixed(2)} hrs total · {jobData.guardsCount || 1} guard
              {jobData.guardsCount !== 1 ? 's' : ''}
            </Text>
          </View>
          {ratesLoading ? (
            <View style={styles.loadingBlock}>
              <ActivityIndicator size="large" color="#2563EB" />
              <Text style={styles.loadingText}>Calculating charges...</Text>
            </View>
          ) : costBreakdown.breakdown.length === 0 ? (
            <Text style={styles.noDataText}>No breakdown available – check shift dates</Text>
          ) : (
            <>
              {costBreakdown.breakdown.map((item, index) => (
                <View key={index} style={styles.rateSegmentCard}>
                  <View style={styles.segmentHeader}>
                    <Text style={styles.segmentPeriod}>{item.type}</Text>
                  </View>
                  <View style={styles.segmentDetails}>
                    <View style={styles.segmentItem}>
                      <Text style={styles.segmentLabel}>Hours</Text>
                      <Text style={styles.segmentValue}>
                        {(item.hours).toFixed(2)} hrs
                      </Text>

                      <Text style={{ fontSize: 10, color: '#6b7280' }}>
                        ({(item.hours / (jobData.guardsCount || 1)).toFixed(2)} × {jobData.guardsCount} guards)
                      </Text>
                    </View>
                    <View style={styles.segmentItem}>
                      <Text style={styles.segmentLabel}>Charge / hr</Text>
                      <Text style={styles.segmentValue}>${item.chargeRate.toFixed(2)}</Text>
                    </View>
                    <View style={styles.segmentItem}>
                      <Text style={styles.segmentLabel}>Total</Text>
                      <Text style={[styles.segmentValue, styles.segmentTotal]}>
                        ${item.chargeCost.toFixed(2)}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}

              <View style={styles.totalsBlock}>
                <View style={styles.totalLine}>
                  <Text style={styles.totalLabel}>Subtotal (ex. GST)</Text>
                  <Text style={styles.subtotalValue}>
                    ${costBreakdown.chargeTotal.toFixed(2)}
                  </Text>
                </View>
                <View style={styles.totalLine}>
                  <Text style={styles.totalLabel}>GST (10%)</Text>
                  <Text style={styles.gstValue}>
                    ${(costBreakdown.chargeTotal * 0.10).toFixed(2)}
                  </Text>
                </View>
                <View style={styles.finalTotalLine}>
                  <Text style={styles.finalTotalLabel}>Total (inc. GST)</Text>
                  <Text style={styles.finalTotalValue}>
                    ${(costBreakdown.chargeTotal * 1.10).toFixed(2)}
                  </Text>
                </View>
              </View>
            </>
          )}
        </View>

        <View style={styles.card}>
          <View style={styles.cardSectionHeader}>
        <ShieldCheck size={22} color="#2563EB" />
            <Text style={styles.sectionTitle}>Terms & Conditions</Text>
          </View>
          <ScrollView style={styles.termsBox} nestedScrollEnabled>
            <Text style={styles.termsText}>
              Welcome to our on-demand security guard booking platform...
            </Text>
          </ScrollView>
          <View style={styles.agreeRow}>
            <CheckBox
              value={agreeToTerms}
              onValueChange={setAgreeToTerms}
              tintColors={{ true: '#2563EB', false: '#6b7280' }}
            />
            <Text style={styles.agreeText}>
              I agree to the <Text style={styles.termsLink}>Terms & Conditions</Text>.
            </Text>
          </View>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.confirmButton, (!agreeToTerms || isSubmitting) && styles.disabledButton]}
            onPress={handleConfirm}
            disabled={!agreeToTerms || isSubmitting}
          >
           {isSubmitting ? (
  <ActivityIndicator color="#fff" size="small" style={{ marginRight: 8 }} />
) : (
  <CheckCircle size={20} color="#fff" style={{ marginRight: 8 }} />
)}
            <Text style={styles.buttonText}>
              {isSubmitting ? 'Posting...' : 'Confirm & Post Job'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.editButton} onPress={goBack} disabled={isSubmitting}>
           <ArrowLeft size={20} color="#2563EB" style={{ marginRight: 8 }} />
            <Text style={styles.editButtonText}>Edit Job</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', paddingTop: 20 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#121927',
  },
  rateSmall: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  scrollContent: { padding: 16, paddingBottom: 140 },

  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    marginBottom: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 30,
    elevation: 10,
  },
  cardSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  statCard: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginHorizontal: 6,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
    alignItems: 'flex-start',
  },
  label: {
    color: '#6b7280',
    fontWeight: '500',
    flex: 1,
    marginTop: 10,
    fontSize:12
  },
  value: {
    fontWeight: '600',
    color: '#111827',
    textAlign: 'right',
    flex: 2,
  },
  backBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  rateType: { fontSize: 11, fontWeight: '600', color: '#111827' },
  rateDetail: { fontSize: 11, color: '#6b7280', marginTop: 2 },
  rateCost: { fontSize: 11, fontWeight: '600', color: '#2563EB' },
  subtotalRow: { backgroundColor: '#f8fafc' },
  boldText: { fontWeight: '700', fontSize: 15 },
  totalAmount: { color: 'white', fontSize: 24, fontWeight: 'bold' },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    gap: 12,
    flexWrap: 'wrap',
  },
  statBox: {
    flex: 1,
    minWidth: 100,
    backgroundColor: '#edeef1',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  statLabel: { color: '#6b7280', fontSize: 12 },
  statValue: { fontSize: 18, fontWeight: '700', marginTop: 4 },
  termsBox: {
    maxHeight: 260,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginVertical: 12,
  },
  termsText: { fontSize: 14, lineHeight: 22, color: '#374151' },
  termsSubtitle: { fontSize: 16, fontWeight: '600', color: '#111827', marginTop: 16, marginBottom: 6 },
  termsBullet: { fontSize: 14, color: '#374151', marginLeft: 8, marginBottom: 4 },
  agreeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingVertical: 8,
  },
  agreeText: { flex: 1, marginLeft: 12, fontSize: 15, color: '#374151' },
  termsLink: { color: '#2563EB', textDecorationLine: 'underline' },
  buttonContainer: { marginTop: 32, gap: 14, paddingBottom: 40 },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 18,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 18,
  },
  buttonText: { color: 'white', fontSize: 16, fontWeight: '600' },
  editButtonText: { color: '#2563EB', fontSize: 16, fontWeight: '600' },
  disabledButton: { opacity: 0.6 },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#f8fafc',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  rateCardWrapper: {
    borderRadius: 22,
    overflow: 'hidden',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 25,
    elevation: 12,
  },
  rateCardBody: {
    backgroundColor: '#ffffff',
    padding: 10,
    marginTop: 0
  },
  rateItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  rateColumn: {
    alignItems: 'flex-end',
    minWidth: 90,
  },
  payAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#059669',
  },
  chargeAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2563EB',
  },
  smallLabel: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 2,
  },
  emptyText: {
    textAlign: 'center',
    paddingVertical: 20,
    color: '#6b7280',
  },
  totalCol: {
    flex: 1,
    alignItems: 'center',
  },
  totalDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#e5e7eb',
  },
  totalPay: {
    fontSize: 18,
    fontWeight: '700',
    color: '#059669',
    marginTop: 4,
  },
  totalCharge: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2563EB',
    marginTop: 4,
  },
  profitBox: {
    marginTop: 14,
    backgroundColor: '#ecfdf5',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  profitLabel: {
    fontSize: 12,
    color: '#047857',
  },
  profitValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#047857',
    marginTop: 4,
  },
  inputCard: {
    flex: 2,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  inputCardText: {
    fontSize: 12,
    color: '#111827',
    fontWeight: '700'
  },
  totalSummaryBox: {
    marginTop: 10,
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  totalSubAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563EB',
  },
  totalGstAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  rateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  rateHeaderTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  guardCount: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  summaryLine: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 12,
    marginBottom: 16,
    textAlign: 'center',
  },
  rateTable: {
    marginBottom: 16,
  },
  rateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  periodText: {
    flex: 2,
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
  },
  hoursText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
    textAlign: 'center',
  },
  chargeCol: {
    flex: 1,
    alignItems: 'flex-end',
  },
  chargePerHr: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563EB',
  },
  totalsSection: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },

  subtotalAmount: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  gstAmount: {
    fontSize: 15,
    fontWeight: '500',
    color: '#6b7280',
  },
  finalTotalRow: {
    borderBottomWidth: 0,
    paddingTop: 12,
    marginTop: 4,
  },

  finalTotalAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2563EB',
  },
  avgChargeNote: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'right',
    marginTop: 12,
    fontStyle: 'italic',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 30,
  },

  rateCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    marginBottom: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 25,
    elevation: 12,
  },
  rateMainHeader: {
    marginBottom: 15,
    paddingBottom: 12,
  },
  rateMainTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
  },
  rateMainSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4b5563',
  },

  loadingBlock: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: '#64748b',
  },

  noDataText: {
    textAlign: 'center',
    paddingVertical: 30,
    fontSize: 15,
    color: '#6b7280',
    fontStyle: 'italic',
  },

  rateSegmentCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    marginBottom: 5,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  segmentHeader: {
    marginBottom: 8,
  },
  segmentPeriod: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  segmentDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  segmentItem: {
    // alignItems: 'center',
    flex: 1,
  },
  segmentLabel: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 4,
  },
  segmentValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  segmentTotal: {
    color: '#2563EB',
    fontWeight: '700',
    fontSize: 17,
  },

  totalsBlock: {
    marginTop: 10,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  totalLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  totalLabel: {
    fontSize: 15,
    color: '#4b5563',
    fontWeight: '500',
  },
  subtotalValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  gstValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6b7280',
  },
  finalTotalLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 16,
    paddingBottom: 8,
  },
  finalTotalLabel: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },
  finalTotalValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#2563EB',
  },

  chargeRateHighlight: {
    marginTop: 20,
    backgroundColor: '#eff6ff',
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#bfdbfe',
  },
  chargeRateTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e40af',
    marginBottom: 8,
  },
  chargeRateBig: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1e40af',
  },
});




// import React, { useMemo, useState, useEffect } from 'react';
// import {
//   View,
//   Text,
//   ScrollView,
//   TouchableOpacity,
//   StyleSheet,
//   Alert,
//   ActivityIndicator,
//   Modal,
//   FlatList,
//   TextInput,
// } from 'react-native';
// import {
//   ChevronLeft,
//   FileText,
//   Files,
//   ShieldCheck,
//   CheckCircle,
//   ArrowLeft,
//   CreditCard,
//   Lock,
// } from 'lucide-react-native';
// import {
//   useStripe,
//   initPaymentSheet,
//   presentPaymentSheet,
// } from '@stripe/stripe-react-native';
// import CheckBox from '@react-native-community/checkbox';
// import { useNavigation, useRoute } from '@react-navigation/native';
// import Toast from 'react-native-toast-message';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import axios from 'axios';
// import { postJob, getUserProfile } from '../services/authApi';

// const BASE_URL = 'https://apis.staffoo.com.au/api';

// interface RateSlot {
//   day: number;
//   night: number;
// }

// interface RatesConfig {
//   charge: Record<string, RateSlot>;
// }

// interface ShiftSegment {
//   label: string;
//   hours: number;
//   payRate: number;
//   chargeRate: number;
// }

// interface CostBreakdown {
//   chargeTotal: number;
//   guardHours: number;
//   breakdown: ShiftSegment[];
//   totalShiftHours: number;
// }

// type Card = {
//   card_holder_name: string;
//   card_number: string;
//   expiry_month: string;
//   expiry_year: string;
// };

// type RouteParams = {
//   jobData?: {
//     title?: string;
//     category?: string;
//     guardsCount?: number;
//     startDate?: Date;
//     startTime?: Date;
//     endDate?: Date;
//     endTime?: Date;
//     location?: string;
//     description?: string;
//     lat?: number;
//     lng?: number;
//   };
//   uploadedFileUrls?: string[];
//   uploadedFileNames?: string[];
//   selectedDocuments?: string[];
// };

// export default function ReviewConfirmScreen() {
//   const navigation = useNavigation();
//   const route = useRoute();
// const { initPaymentSheet, presentPaymentSheet } = useStripe();
//   const {
//     jobData = {},
//     uploadedFileUrls = [],
//     uploadedFileNames = [],
//     selectedDocuments = [],
//   } = (route.params || {}) as RouteParams;

//   const [agreeToTerms, setAgreeToTerms] = useState(false);
//   const [isSubmitting, setIsSubmitting] = useState(false);
//   const [rates, setRates] = useState<RatesConfig | null>(null);
//   const [ratesLoading, setRatesLoading] = useState(true);
//   const [ratesError, setRatesError] = useState<string | null>(null);

//   // Payment modal states
//   const [paymentModalVisible, setPaymentModalVisible] = useState(false);
//   const [savedCards, setSavedCards] = useState<Card[]>([]);
//   const [selectedCardIndex, setSelectedCardIndex] = useState<number | null>(null);
//   const [loadingCards, setLoadingCards] = useState(false);
//   const [paymentTab, setPaymentTab] = useState<'saved' | 'new'>('saved');
//   const SEGMENT_LABELS: Record<string, string> = {
//     weekday_day: 'Mon–Thu Day (06:00–18:00)',
//     weekday_night: 'Mon–Thu Night (18:00–06:00)',
//     fri_day: 'Friday Day (06:00–18:00)',
//     fri_night: 'Friday Night (18:00–06:00)',
//     sat_day: 'Saturday Day (06:00–18:00)',
//     sat_night: 'Saturday Night (18:00–06:00)',
//     sun_day: 'Sunday Day (06:00–18:00)',
//     sun_night: 'Sunday Night (18:00–06:00)',
//   };

//   const getCategoryDisplay = (cat?: string) => {
//     const map: Record<string, string> = {
//       'event-security': 'Event Security',
//       'static-security': 'Static Security Guard',
//       'corporate-security': 'Corporate Security',
//       'site-patrol': 'Site Patrol Security',
//       others: 'Others',
//     };
//     return map[cat || ''] || cat || 'Not specified';
//   };


//   const openStripePayment = async () => {
//   try {

//     const response = await axios.post(`${BASE_URL}/create-payment-intent`, {
//       amount: Math.round(totalIncGST * 100), // Stripe uses cents
//     });

//     const { paymentIntent, ephemeralKey, customer } = response.data;

//     const initSheet = await initPaymentSheet({
//       merchantDisplayName: "Security Job",
//       customerId: customer,
//       customerEphemeralKeySecret: ephemeralKey,
//       paymentIntentClientSecret: paymentIntent,
//       allowsDelayedPaymentMethods: true,
//     });

//     if (initSheet.error) {
//       Alert.alert("Error", initSheet.error.message);
//       return;
//     }

//     const result = await presentPaymentSheet();

//     if (result.error) {
//       Alert.alert("Payment failed", result.error.message);
//     } else {
//       handlePayAndPost(); // your existing job posting function
//     }

//   } catch (error) {
//     Alert.alert("Payment error", "Something went wrong");
//   }
// };

//   function getDayType(date: Date): 'weekday' | 'fri' | 'sat' | 'sun' {
//     const d = date.getDay();
//     if (d === 0) return 'sun';
//     if (d === 5) return 'fri';
//     if (d === 6) return 'sat';
//     return 'weekday';
//   }

//   function getSlot(hour: number): 'day' | 'night' {
//     return hour >= 6 && hour < 18 ? 'day' : 'night';
//   }

//   function nextBoundary(t: Date): Date {
//     const h = t.getHours();
//     const next = new Date(t);
//     next.setSeconds(0, 0);
//     if (h < 6) next.setHours(6, 0, 0, 0);
//     else if (h < 18) next.setHours(18, 0, 0, 0);
//     else { next.setDate(next.getDate() + 1); next.setHours(0, 0, 0, 0); }
//     return next;
//   }

//   function calculateCostBreakdown(
//     startDate: Date,
//     startTime: Date,
//     endDate: Date,
//     endTime: Date,
//     numGuards: number,
//     rates: RatesConfig
//   ): CostBreakdown {
//     const start = new Date(startDate);
//     start.setHours(startTime.getHours(), startTime.getMinutes(), 0, 0);
//     const end = new Date(endDate);
//     end.setHours(endTime.getHours(), endTime.getMinutes(), 0, 0);

//     const hoursMap = new Map<string, number>();
//     const keyOrder: string[] = [];
//     let t = new Date(start);

//     while (t < end) {
//       const boundary = nextBoundary(t);
//       const segEnd = boundary < end ? boundary : end;
//       const segHours = (segEnd.getTime() - t.getTime()) / 3600000;
//       const dayType = getDayType(t);
//       const slot = getSlot(t.getHours());
//       const key = `${dayType}_${slot}`;

//       if (!hoursMap.has(key)) { hoursMap.set(key, 0); keyOrder.push(key); }
//       hoursMap.set(key, (hoursMap.get(key) || 0) + segHours);

//       t = new Date(segEnd);
//     }

//     let chargeTotal = 0;
//     const breakdown: ShiftSegment[] = [];
//     keyOrder.forEach(key => {
//       const [dayType, slotStr] = key.split('_');
//       const slot = slotStr as 'day' | 'night';
//       const hours = hoursMap.get(key) || 0;
//       const chargeRate = rates.charge[dayType][slot] || 0;
//       const chargeCost = hours * chargeRate * numGuards;
//       chargeTotal += chargeCost;

//       breakdown.push({
//         label: SEGMENT_LABELS[key] || key, // <-- use readable text
//         hours,
//         payRate: 0,
//         chargeRate,
//       });
//     });
//     const totalShiftHours = Array.from(hoursMap.values()).reduce((a, b) => a + b, 0);
//     return { chargeTotal, guardHours: totalShiftHours * numGuards, breakdown, totalShiftHours };
//   }

//   // Fetch real charge rates
//   useEffect(() => {
//     const loadRates = async () => {
//       try {
//         setRatesLoading(true);
//         setRatesError(null);

//         const token = await AsyncStorage.getItem('@auth_token');
//         if (!token) throw new Error('No authentication token found');

//         const res = await axios.get(`${BASE_URL}/get-chargerates`, {
//           headers: {
//             Authorization: `Bearer ${token}`,
//             Accept: 'application/json',
//           },
//         });

//         if (!res.data?.success || !Array.isArray(res.data?.data) || res.data.data.length === 0) {
//           throw new Error('Invalid or empty charge rates response');
//         }

//         const item = res.data.data[0];

//         const charge = {
//           weekday: {
//             day: Number(item.def_metro_mon_to_fri_day_rate || 0),
//             night: Number(item.def_metro_mon_to_fri_night_rate || 0),
//           },
//           fri: {
//             day: Number(item.def_metro_mon_to_fri_day_rate || 0),
//             night: Number(item.def_metro_mon_to_fri_night_rate || 0),
//           },
//           sat: {
//             day: Number(item.def_metro_sat_day_rate || 0),
//             night: Number(item.def_metro_sat_night_rate || 0),
//           },
//           sun: {
//             day: Number(item.def_metro_sun_day_rate || 0),
//             night: Number(item.def_metro_sun_night_rate || 0),
//           },
//         };

//         setRates({ charge });
//       } catch (err: any) {
//         const msg = err.response?.data?.message || err.message || 'Failed to load charge rates';
//         setRatesError(msg);
//         Toast.show({ type: 'error', text1: 'Rates Error', text2: msg });
//       } finally {
//         setRatesLoading(false);
//       }
//     };

//     loadRates();
//   }, []);

//   const costBreakdown = useMemo(() => {
//     if (!rates || !jobData.startDate || !jobData.startTime || !jobData.endDate || !jobData.endTime) {
//       return { chargeTotal: 0, guardHours: 0, breakdown: [], totalShiftHours: 0 };
//     }
//     return calculateCostBreakdown(
//       jobData.startDate, jobData.startTime,
//       jobData.endDate, jobData.endTime,
//       jobData.guardsCount || 1,
//       rates
//     );
//   }, [rates, jobData]);

//   const totalIncGST = costBreakdown.chargeTotal * 1.1;

//   const openPaymentModal = () => {
//     if (!agreeToTerms) {
//       Alert.alert('Required', 'Please agree to the Terms & Conditions first.');
//       return;
//     }
//     setPaymentModalVisible(true);
//     loadSavedCards();
//   };

//   const loadSavedCards = async () => {
//     setLoadingCards(true);
//     try {
//       const userId = await getCurrentUserId();
//       if (!userId) return;

//       const profile = await getUserProfile(userId);
//       if (profile?.success && profile?.data?.customer?.bank_details) {
//         const parsed = JSON.parse(profile.data.customer.bank_details || '[]');
//         if (Array.isArray(parsed)) {
//           setSavedCards(parsed);
//           setSelectedCardIndex(parsed.length > 0 ? 0 : null);
//         }
//       }
//     } catch (err) {
//       Toast.show({ type: 'error', text1: 'Could not load saved cards' });
//     } finally {
//       setLoadingCards(false);
//     }
//   };

//   const getCurrentUserId = async () => {
//     try {
//       const userStr = await AsyncStorage.getItem('user');
//       return userStr ? JSON.parse(userStr).id : null;
//     } catch {
//       return null;
//     }
//   };

//   const handlePayAndPost = async () => {
//     if (selectedCardIndex === null) {
//       Alert.alert('Select Card', 'Please choose a payment method.');
//       return;
//     }

//     if (!agreeToTerms) {
//       Alert.alert('Agreement Required', 'Please agree to the Terms & Conditions.');
//       return;
//     }

//     if (
//       !jobData.startDate ||
//       !jobData.startTime ||
//       !jobData.endDate ||
//       !jobData.endTime
//     ) {
//       Alert.alert(
//         'Incomplete Information',
//         'Start date/time or end date/time is missing.'
//       );
//       return;
//     }

//     setIsSubmitting(true);

//     try {
//       // get logged user
//       const userStr = await AsyncStorage.getItem('user');
//       if (!userStr) throw new Error('User session not found');

//       const user = JSON.parse(userStr);
//       const userId = user.id;

//       // build start datetime
//       const start = new Date(
//         jobData.startDate.getFullYear(),
//         jobData.startDate.getMonth(),
//         jobData.startDate.getDate(),
//         jobData.startTime.getHours(),
//         jobData.startTime.getMinutes(),
//         0,
//         0
//       );

//       // build end datetime
//       const end = new Date(
//         jobData.endDate.getFullYear(),
//         jobData.endDate.getMonth(),
//         jobData.endDate.getDate(),
//         jobData.endTime.getHours(),
//         jobData.endTime.getMinutes(),
//         0,
//         0
//       );

//       const pad = (num: number) => String(num).padStart(2, '0');

//       const startTimeStr = `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(
//         start.getDate()
//       )}T${pad(start.getHours())}:${pad(start.getMinutes())}:00`;

//       const endTimeStr = `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(
//         end.getDate()
//       )}T${pad(end.getHours())}:${pad(end.getMinutes())}:00`;

//       // create payload
//       const payload = {
//         user_id: userId,
//         title: jobData.title || `${getCategoryDisplay(jobData.category)} Security Job`,
//         description: jobData.description || 'No description provided',
//         address: jobData.location || 'Not specified',
//         coordinates: `${(jobData.lat ?? 31.5204).toFixed(8)},${(jobData.lng ?? 74.3587).toFixed(8)}`,
//         state: 'Punjab',
//         numberOfGuards: jobData.guardsCount || 1,
//         startTime: startTimeStr,
//         endTime: endTimeStr,
//         is_document: selectedDocuments.length > 0,
//         document_list: uploadedFileUrls,
//         document_types: selectedDocuments,
//         job_instruction: jobData.description || '',
//       };

//       // 🔹 POST JOB API
//       const response = await postJob(payload);

//       Toast.show({
//         type: 'success',
//         text1: 'Payment successful',
//         text2: response?.message || 'Job posted successfully!',
//       });

//       navigation.reset({
//         index: 0,
//         routes: [{ name: 'Applications' as never }],
//       });

//     } catch (err: any) {
//       Toast.show({
//         type: 'error',
//         text1: 'Payment / Job Failed',
//         text2: err.response?.data?.message || err.message || 'Something went wrong',
//       });
//     } finally {
//       setIsSubmitting(false);
//       setPaymentModalVisible(false);
//     }
//   };

//   if (ratesLoading) {
//     return (
//       <View style={styles.loadingContainer}>
//         <ActivityIndicator size="large" color="#2563EB" />
//         <Text style={styles.loadingText}>Loading current pricing...</Text>
//       </View>
//     );
//   }

//   if (ratesError || !rates) {
//     return (
//       <View style={styles.errorContainer}>
//         <Text style={styles.errorText}>
//           Cannot load current rates right now:{'\n'}
//           {ratesError || 'Unknown error'}
//         </Text>
//         <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
//           <Text style={styles.backButtonText}>Go Back</Text>
//         </TouchableOpacity>
//       </View>
//     );
//   }

//   const formatDateTime = (date?: Date, time?: Date) => {
//     if (!date || !time) return 'Not set';
//     try {
//       const combined = new Date(
//         date.getFullYear(),
//         date.getMonth(),
//         date.getDate(),
//         time.getHours(),
//         time.getMinutes(),
//         0,
//         0
//       );
//       return combined.toLocaleString('en-US', {
//         weekday: 'short',
//         month: 'short',
//         day: 'numeric',
//         year: 'numeric',
//         hour: '2-digit',
//         minute: '2-digit',
//         hour12: false,
//       });
//     } catch {
//       return 'Invalid date/time';
//     }
//   };


//   return (
//     <View style={styles.container}>
//       {/* Header */}
//       <View style={styles.header}>
//         <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBox}>
//           <ChevronLeft size={28} color="#000" />
//         </TouchableOpacity>
//         <Text style={styles.headerTitle}>Review & Confirm</Text>
//         <View style={{ width: 28 }} />
//       </View>

//       <ScrollView contentContainerStyle={styles.scrollContent}>
//         <View style={styles.card}>
//           <View style={styles.cardSectionHeader}>
//             <FileText size={22} color="#2563EB" />
//             <Text style={styles.sectionTitle}>Job Details</Text>
//           </View>

//           <View style={styles.detailRow}>
//             <Text style={styles.label}>Job Title:</Text>
//             <View style={styles.inputCard}>
//               <Text style={styles.inputCardText}>
//                 {jobData.title || `${getCategoryDisplay(jobData.category)} Security Job`}
//               </Text>
//             </View>           </View>

//           <View style={styles.detailRow}>
//             <Text style={styles.label}>Job Category:</Text>
//             <View style={styles.inputCard}>
//               <Text style={styles.inputCardText}>{getCategoryDisplay(jobData.category)}</Text>
//             </View>
//           </View>

//           <View style={styles.detailRow}>
//             <Text style={styles.label}>Number of Guards:</Text>
//             <View style={styles.inputCard}>
//               <Text style={styles.inputCardText}>{jobData.guardsCount || 1}</Text>
//             </View>
//           </View>

//           <View style={styles.detailRow}>
//             <Text style={styles.label}>Start:</Text>
//             <View style={styles.inputCard}>
//               <Text style={styles.inputCardText}>
//                 {formatDateTime(jobData.startDate, jobData.startTime)}
//               </Text>
//             </View>
//           </View>

//           <View style={styles.detailRow}>
//             <Text style={styles.label}>End:</Text>             <View style={styles.inputCard}>
//               <Text style={styles.inputCardText}>
//                 {formatDateTime(jobData.endDate, jobData.endTime)}
//               </Text>
//             </View>
//           </View>

//           <View style={styles.detailRow}>
//             <Text style={styles.label}>Location:</Text>
//             <View style={styles.inputCard}>
//               <Text style={styles.inputCardText}>{jobData.location || 'Not specified'}</Text>
//             </View>
//           </View>

//           <View style={styles.detailRow}>
//             <Text style={styles.label}>Description:</Text>
//             <View style={styles.inputCard}>
//               <Text style={styles.inputCardText}>
//                 {jobData.description || 'No description provided'}
//               </Text>
//             </View>
//           </View>

//           {uploadedFileUrls.length > 0 && (
//             <View style={styles.detailRow}>
//               <Text style={styles.label}>Attachments:</Text>
//               <View style={styles.inputCard}>
//                 {uploadedFileUrls.map((url, i) => (
//                   <View key={i} style={{ flexDirection: 'row', alignItems: 'center', marginTop: i === 0 ? 0 : 6 }}>
//                     <Files size={18} color="#2563EB" />
//                     <Text style={{ marginLeft: 8, color: '#2563EB', flexShrink: 1, fontSize: 14 }} numberOfLines={1}>
//                       {uploadedFileNames[i] || url.split('/').pop() || `File ${i + 1}`}
//                     </Text>
//                   </View>
//                 ))}
//               </View>
//             </View>
//           )}

//           {selectedDocuments.length > 0 && (
//             <View style={styles.detailRow}>
//               <Text style={styles.label}>Required Docs:</Text>
//               <View style={styles.inputCard}>
//                 <Text style={styles.inputCardText}>
//                   {selectedDocuments.map(v => v.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())).join(', ')}
//                 </Text>
//               </View>
//             </View>
//           )}
//         </View>

//         <View style={styles.rateCard}>
//           <View style={styles.rateMainHeader}>
//             <Text style={styles.rateMainTitle}>Rate Breakdown</Text>
//             <Text style={styles.rateMainSubtitle}>
//               {`${costBreakdown.totalShiftHours.toFixed(2)} hrs total · ${jobData.guardsCount || 1} guard${jobData.guardsCount !== 1 ? 's' : ''}`}
//             </Text>
//           </View>
//           {ratesLoading ? (
//             <View style={styles.loadingBlock}>
//               <ActivityIndicator size="large" color="#2563EB" />
//               <Text style={styles.loadingText}>Calculating charges...</Text>
//             </View>
//           ) : costBreakdown.breakdown.length === 0 ? (
//             <Text style={styles.noDataText}>No breakdown available – check shift dates</Text>
//           ) : (
//             <>
//               {costBreakdown.breakdown.map((item, index) => (
//                 <View key={index} style={styles.rateSegmentCard}>
//                   <View style={styles.segmentHeader}>
//                     <Text style={styles.segmentPeriod}>{item.label}</Text>
//                   </View>
//                   <View style={styles.segmentDetails}>
//                     <View style={styles.segmentItem}>
//                       <Text style={styles.segmentLabel}>Hours</Text>
//                       <Text style={styles.segmentValue}>
//                         {(item.hours).toFixed(2)} hrs
//                       </Text>

//                       <Text style={{ fontSize: 10, color: '#6b7280' }}>
//                         ({(item.hours / (jobData.guardsCount || 1)).toFixed(2)} × {jobData.guardsCount} guards)
//                       </Text>
//                     </View>
//                     <View style={styles.segmentItem}>
//                       <Text style={styles.segmentLabel}>Charge / hr</Text>
//                       <Text style={styles.segmentValue}>${item.chargeRate.toFixed(2)}</Text>
//                     </View>
//                     <View style={styles.segmentItem}>
//                       <Text style={styles.segmentLabel}>Total</Text>
//                       <Text style={styles.segmentValue}>${(item.chargeRate * item.hours * (jobData.guardsCount || 1)).toFixed(2)}</Text>
//                     </View>
//                   </View>
//                 </View>
//               ))}

//               <View style={styles.totalsBlock}>
//                 <View style={styles.totalLine}>
//                   <Text style={styles.totalLabel}>Subtotal (ex. GST)</Text>
//                   <Text style={styles.subtotalValue}>
//                     ${costBreakdown.chargeTotal.toFixed(2)}
//                   </Text>
//                 </View>
//                 <View style={styles.totalLine}>
//                   <Text style={styles.totalLabel}>GST (10%)</Text>
//                   <Text style={styles.gstValue}>
//                     ${(costBreakdown.chargeTotal * 0.10).toFixed(2)}
//                   </Text>
//                 </View>
//                 <View style={styles.finalTotalLine}>
//                   <Text style={styles.finalTotalLabel}>Total (inc. GST)</Text>
//                   <Text style={styles.finalTotalValue}>
//                     ${(costBreakdown.chargeTotal * 1.10).toFixed(2)}
//                   </Text>
//                 </View>
//               </View>
//             </>
//           )}
//         </View>

//         {/* Total Amount */}
//         <View style={styles.totalPayCard}>
//           <Text style={styles.totalPayTitle}>Amount Due to Post Job</Text>
//           <Text style={styles.totalPayAmount}>${totalIncGST.toFixed(2)}</Text>
//           <Text style={styles.totalPayNote}>
//             Secure hold via Stripe • Required to publish this job
//           </Text>
//         </View>

//         {/* Agree to Terms */}
//         <View style={styles.card}>
//           <View style={styles.cardSectionHeader}>
//             <ShieldCheck size={22} color="#2563EB" />
//             <Text style={styles.sectionTitle}>Terms & Conditions</Text>
//           </View>
//           {/* Your terms text or scrollable content */}
//           <View style={styles.agreeRow}>
//             <CheckBox
//               value={agreeToTerms}
//               onValueChange={setAgreeToTerms}
//               tintColors={{ true: '#2563EB', false: '#6b7280' }}
//             />
//             <Text style={styles.agreeText}>
//               I agree to the <Text style={styles.termsLink}>Terms & Conditions</Text>.
//             </Text>
//           </View>
//         </View>

//         {/* Pay Button */}
//         <TouchableOpacity
//           style={[
//             styles.payNowButton,
//             (!agreeToTerms || isSubmitting) && styles.disabledButton,
//           ]}
//           onPress={openPaymentModal}
//           disabled={!agreeToTerms || isSubmitting}
//         >
//           <Lock size={20} color="#fff" style={{ marginRight: 10 }} />
//           <Text style={styles.payNowText}>
//             Pay ${totalIncGST.toFixed(2)} & Post Job
//           </Text>
//         </TouchableOpacity>

//         <TouchableOpacity style={styles.editButton} onPress={() => navigation.goBack()}>
//           <ArrowLeft size={20} color="#2563EB" />
//           <Text style={styles.editButtonText}>Edit Job</Text>
//         </TouchableOpacity>
//       </ScrollView>

//       {/* Payment Method Modal */}
//       <Modal
//         visible={paymentModalVisible}
//         animationType="slide"
//         transparent={true}
//         onRequestClose={() => setPaymentModalVisible(false)}
//       >
//         <View style={styles.modalOverlay}>
//           <View style={styles.paymentModalContainer}>
//             <View style={styles.modalHeader}>
//               <Text style={styles.modalTitle}>Complete Payment</Text>
//               <TouchableOpacity onPress={() => setPaymentModalVisible(false)}>
//                 <Text style={styles.closeModal}>×</Text>
//               </TouchableOpacity>
//             </View>

//             <Text style={styles.modalSubtitle}>
//               Payment hold of ${totalIncGST.toFixed(2)} required to post job
//             </Text>

//             <View style={styles.amountRow}>
//               <Text style={styles.amountLabel}>Job Posting Fee</Text>
//               <Text style={styles.amountValue}>${totalIncGST.toFixed(2)}</Text>
//             </View>

//             <View style={styles.paymentMethodTabs}>
//               <TouchableOpacity
//                 style={[styles.tab, paymentTab === 'saved' && styles.tabActive]}
//                 onPress={() => setPaymentTab('saved')}
//               >
//                 <Text style={paymentTab === 'saved' ? styles.tabTextActive : styles.tabText}>
//                   Use Saved Card
//                 </Text>
//               </TouchableOpacity>

//               <TouchableOpacity
//                 style={[styles.tab, paymentTab === 'new' && styles.tabActive]}
//                 onPress={() => setPaymentTab('new')}
//               >
//                 <Text style={paymentTab === 'new' ? styles.tabTextActive : styles.tabText}>
//                   Enter New Card
//                 </Text>
//               </TouchableOpacity>
//             </View>

//             {paymentTab === 'saved' ? (
//               loadingCards ? (
//                 <ActivityIndicator size="large" color="#2563EB" style={{ marginVertical: 40 }} />
//               ) : savedCards.length === 0 ? (
//                 <Text style={styles.noCardsText}>No saved cards found</Text>
//               ) : (
//                 <FlatList
//                   data={savedCards}
//                   keyExtractor={(_, i) => `card-${i}`}
//                   renderItem={({ item, index }) => (
//                     <TouchableOpacity
//                       style={[
//                         styles.cardItem,
//                         selectedCardIndex === index && styles.cardItemSelected,
//                       ]}
//                       onPress={() => setSelectedCardIndex(index)}
//                     >
//                       <CreditCard size={24} color="#2563EB" />
//                       <View style={styles.cardInfo}>
//                         <Text style={styles.cardHolder}>
//                           {item.card_holder_name.toUpperCase()}
//                         </Text>
//                         <Text style={styles.cardNumber}>
//                           •••• •••• •••• {item.card_number.slice(-4)}
//                         </Text>
//                         <Text style={styles.cardExpiry}>
//                           {item.expiry_month}/{item.expiry_year}
//                         </Text>
//                       </View>
//                       {selectedCardIndex === index && (
//                         <CheckCircle size={24} color="#22c55e" />
//                       )}
//                     </TouchableOpacity>
//                   )}
//                 />
//               )
//             ) : (
//               <View style={{ marginTop: 20 }}>
//                 <Text style={{ fontSize: 16, marginBottom: 10 }}>Enter Card Details</Text>

//                 <TextInput
//                   placeholder="Card Number"
//                   style={styles.input}
//                   keyboardType="numeric"
//                 />

//                 <TextInput
//                   placeholder="Card Holder Name"
//                   style={styles.input}
//                 />

//                 <TextInput
//                   placeholder="MM/YY"
//                   style={styles.input}
//                 />

//                 <TextInput
//                   placeholder="CVC"
//                   style={styles.input}
//                   keyboardType="numeric"
//                 />
//               </View>
//             )}

//             {/* <View style={styles.securityNote}>
//               <Lock size={16} color="#6b7280" />
//               <Text style={styles.securityText}>
//                 Your card details are encrypted and processed securely by Stripe. We never store full card numbers.
//               </Text>
//             </View> */}

//             <TouchableOpacity
//               style={[
//                 styles.payConfirmButton,
//                 (selectedCardIndex === null || isSubmitting) && styles.disabledButton,
//               ]}
//               onPress={openStripePayment}
//               disabled={selectedCardIndex === null || isSubmitting}
//             >
//               {isSubmitting ? (
//                 <ActivityIndicator color="#fff" />
//               ) : (
//                 <Text style={styles.payConfirmText}>
//                   Pay ${totalIncGST.toFixed(2)} & Post Job
//                 </Text>
//               )}
//             </TouchableOpacity>

//             <TouchableOpacity
//               style={styles.cancelButton}
//               onPress={() => setPaymentModalVisible(false)}
//             >
//               <Text style={styles.cancelText}>Cancel</Text>
//             </TouchableOpacity>
//           </View>
//         </View>
//       </Modal>
//     </View>
//   );
// }







// const styles = StyleSheet.create({
//   container: { flex: 1, backgroundColor: '#f8fafc', paddingTop: 20 },
//   header: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'space-between',
//     paddingHorizontal: 20,
//     paddingVertical: 16,
//   },
//   headerTitle: {
//     fontSize: 20,
//     fontWeight: '700',
//     color: '#121927',
//   },
//   rateSmall: { fontSize: 12, color: '#6b7280', marginTop: 2 },
//   scrollContent: { padding: 16, paddingBottom: 140 },
//   input: {
//     borderWidth: 1,
//     borderColor: '#d1d5db',
//     borderRadius: 8,
//     paddingHorizontal: 12,
//     paddingVertical: 12,
//     fontSize: 16,
//     backgroundColor: '#fff',
//     marginBottom: 12,
//   },
//   card: {
//     backgroundColor: '#ffffff',
//     borderRadius: 20,
//     marginBottom: 16,
//     padding: 16,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 8 },
//     shadowOpacity: 0.12,
//     shadowRadius: 30,
//     elevation: 10,
//   },
//   cardSectionHeader: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     marginBottom: 16,
//     gap: 10,
//   },
//   sectionTitle: {
//     fontSize: 20,
//     fontWeight: '700',
//     color: '#111827',
//   },
//   statCard: {
//     flex: 1,
//     backgroundColor: '#f1f5f9',
//     borderRadius: 12,
//     paddingVertical: 14,
//     alignItems: 'center',
//     marginHorizontal: 6,
//   },
//   detailRow: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     paddingVertical: 5,
//     alignItems: 'flex-start',
//   },
//   label: {
//     color: '#6b7280',
//     fontWeight: '500',
//     flex: 1,
//     marginTop: 10,
//     fontSize: 12
//   },
//   value: {
//     fontWeight: '600',
//     color: '#111827',
//     textAlign: 'right',
//     flex: 2,
//   },
//   backBox: {
//     width: 40,
//     height: 40,
//     borderRadius: 12,
//     backgroundColor: '#fff',
//     borderWidth: 1,
//     borderColor: '#e0e0e0',
//     justifyContent: 'center',
//     alignItems: 'center',
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 1 },
//     shadowOpacity: 0.08,
//     shadowRadius: 4,
//     elevation: 2,
//   },
//   rateType: { fontSize: 11, fontWeight: '600', color: '#111827' },
//   rateDetail: { fontSize: 11, color: '#6b7280', marginTop: 2 },
//   rateCost: { fontSize: 11, fontWeight: '600', color: '#2563EB' },
//   subtotalRow: { backgroundColor: '#f8fafc' },
//   boldText: { fontWeight: '700', fontSize: 15 },
//   totalAmount: { color: 'white', fontSize: 24, fontWeight: 'bold' },
//   summaryRow: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     marginTop: 16,
//     gap: 12,
//     flexWrap: 'wrap',
//   },
//   statBox: {
//     flex: 1,
//     minWidth: 100,
//     backgroundColor: '#edeef1',
//     borderRadius: 12,
//     paddingVertical: 12,
//     alignItems: 'center',
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 4 },
//     shadowOpacity: 0.08,
//     shadowRadius: 8,
//     elevation: 4,
//   },
//   statLabel: { color: '#6b7280', fontSize: 12 },
//   statValue: { fontSize: 18, fontWeight: '700', marginTop: 4 },
//   termsBox: {
//     maxHeight: 260,
//     backgroundColor: '#f8fafc',
//     borderRadius: 12,
//     padding: 16,
//     borderWidth: 1,
//     borderColor: '#e2e8f0',
//     marginVertical: 12,
//   },
//   termsText: { fontSize: 14, lineHeight: 22, color: '#374151' },
//   termsSubtitle: { fontSize: 16, fontWeight: '600', color: '#111827', marginTop: 16, marginBottom: 6 },
//   termsBullet: { fontSize: 14, color: '#374151', marginLeft: 8, marginBottom: 4 },
//   agreeRow: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     marginTop: 12,
//     paddingVertical: 8,
//   },
//   agreeText: { flex: 1, marginLeft: 12, fontSize: 15, color: '#374151' },
//   termsLink: { color: '#2563EB', textDecorationLine: 'underline' },
//   buttonContainer: { marginTop: 32, gap: 14, paddingBottom: 40 },
//   confirmButton: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'center',
//     backgroundColor: '#2563EB',
//     borderRadius: 12,
//     paddingVertical: 18,
//   },
//   editButton: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'center',
//     borderWidth: 1,
//     borderColor: '#2563EB',
//     borderRadius: 12,
//     paddingVertical: 18,
//   },
//   buttonText: { color: 'white', fontSize: 16, fontWeight: '600' },
//   editButtonText: { color: '#2563EB', fontSize: 16, fontWeight: '600' },
//   disabledButton: { opacity: 0.6 },

//   rateCardWrapper: {
//     borderRadius: 22,
//     overflow: 'hidden',
//     marginBottom: 20,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 10 },
//     shadowOpacity: 0.15,
//     shadowRadius: 25,
//     elevation: 12,
//   },
//   rateCardBody: {
//     backgroundColor: '#ffffff',
//     padding: 10,
//     marginTop: 0
//   },
//   rateItemCard: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     paddingVertical: 10,
//     borderBottomWidth: 1,
//     borderBottomColor: '#f1f5f9',
//   },
//   rateColumn: {
//     alignItems: 'flex-end',
//     minWidth: 90,
//   },
//   payAmount: {
//     fontSize: 14,
//     fontWeight: '700',
//     color: '#059669',
//   },
//   chargeAmount: {
//     fontSize: 14,
//     fontWeight: '700',
//     color: '#2563EB',
//   },
//   smallLabel: {
//     fontSize: 11,
//     color: '#9ca3af',
//     marginTop: 2,
//   },
//   emptyText: {
//     textAlign: 'center',
//     paddingVertical: 20,
//     color: '#6b7280',
//   },
//   totalCol: {
//     flex: 1,
//     alignItems: 'center',
//   },
//   totalDivider: {
//     width: 1,
//     height: 40,
//     backgroundColor: '#e5e7eb',
//   },
//   totalPay: {
//     fontSize: 18,
//     fontWeight: '700',
//     color: '#059669',
//     marginTop: 4,
//   },
//   totalCharge: {
//     fontSize: 18,
//     fontWeight: '700',
//     color: '#2563EB',
//     marginTop: 4,
//   },
//   profitBox: {
//     marginTop: 14,
//     backgroundColor: '#ecfdf5',
//     borderRadius: 12,
//     paddingVertical: 14,
//     alignItems: 'center',
//   },
//   profitLabel: {
//     fontSize: 12,
//     color: '#047857',
//   },
//   profitValue: {
//     fontSize: 20,
//     fontWeight: '700',
//     color: '#047857',
//     marginTop: 4,
//   },
//   inputCard: {
//     flex: 2,
//     backgroundColor: '#ffffff',
//     borderRadius: 10,
//     paddingVertical: 10,
//     paddingHorizontal: 12,
//     borderWidth: 1,
//     borderColor: '#d1d5db',
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.06,
//     shadowRadius: 4,
//     elevation: 2,
//   },
//   inputCardText: {
//     fontSize: 12,
//     color: '#111827',
//     fontWeight: '700'
//   },
//   totalSummaryBox: {
//     marginTop: 10,
//     backgroundColor: '#f8fafc',
//     borderRadius: 14,
//     padding: 14,
//     borderWidth: 1,
//     borderColor: '#e5e7eb',
//   },
//   totalSubAmount: {
//     fontSize: 14,
//     fontWeight: '600',
//     color: '#2563EB',
//   },
//   totalGstAmount: {
//     fontSize: 14,
//     fontWeight: '600',
//     color: '#6b7280',
//   },
//   rateHeader: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     paddingBottom: 12,
//     borderBottomWidth: 1,
//     borderBottomColor: '#e5e7eb',
//   },
//   rateHeaderTitle: {
//     fontSize: 18,
//     fontWeight: '700',
//     color: '#111827',
//   },
//   guardCount: {
//     fontSize: 14,
//     color: '#64748b',
//     fontWeight: '500',
//   },
//   summaryLine: {
//     fontSize: 13,
//     color: '#64748b',
//     marginTop: 12,
//     marginBottom: 16,
//     textAlign: 'center',
//   },
//   rateTable: {
//     marginBottom: 16,
//   },
//   rateRow: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     paddingVertical: 12,
//     borderBottomWidth: 1,
//     borderBottomColor: '#f1f5f9',
//   },
//   periodText: {
//     flex: 2,
//     fontSize: 14,
//     color: '#111827',
//     fontWeight: '500',
//   },
//   hoursText: {
//     flex: 1,
//     fontSize: 14,
//     color: '#374151',
//     textAlign: 'center',
//   },
//   chargeCol: {
//     flex: 1,
//     alignItems: 'flex-end',
//   },
//   chargePerHr: {
//     fontSize: 14,
//     fontWeight: '600',
//     color: '#2563EB',
//   },
//   totalsSection: {
//     backgroundColor: '#f8fafc',
//     borderRadius: 12,
//     padding: 16,
//     borderWidth: 1,
//     borderColor: '#e5e7eb',
//   },
//   totalRow: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     paddingVertical: 10,
//     borderBottomWidth: 1,
//     borderBottomColor: '#f1f5f9',
//   },

//   subtotalAmount: {
//     fontSize: 15,
//     fontWeight: '600',
//     color: '#111827',
//   },
//   gstAmount: {
//     fontSize: 15,
//     fontWeight: '500',
//     color: '#6b7280',
//   },
//   finalTotalRow: {
//     borderBottomWidth: 0,
//     paddingTop: 12,
//     marginTop: 4,
//   },

//   finalTotalAmount: {
//     fontSize: 18,
//     fontWeight: '700',
//     color: '#2563EB',
//   },
//   avgChargeNote: {
//     fontSize: 13,
//     color: '#64748b',
//     textAlign: 'right',
//     marginTop: 12,
//     fontStyle: 'italic',
//   },


//   rateCard: {
//     backgroundColor: '#ffffff',
//     borderRadius: 20,
//     marginBottom: 20,
//     padding: 20,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 8 },
//     shadowOpacity: 0.15,
//     shadowRadius: 25,
//     elevation: 12,
//   },
//   rateMainHeader: {
//     marginBottom: 15,
//     paddingBottom: 12,
//   },
//   rateMainTitle: {
//     fontSize: 18,
//     fontWeight: '800',
//     color: '#111827',
//     marginBottom: 4,
//   },
//   rateMainSubtitle: {
//     fontSize: 16,
//     fontWeight: '600',
//     color: '#4b5563',
//   },

//   loadingBlock: {
//     alignItems: 'center',
//     paddingVertical: 40,
//   },


//   noDataText: {
//     textAlign: 'center',
//     paddingVertical: 30,
//     fontSize: 15,
//     color: '#6b7280',
//     fontStyle: 'italic',
//   },

//   rateSegmentCard: {
//     backgroundColor: '#f8fafc',
//     borderRadius: 12,
//     padding: 12,
//     marginBottom: 5,
//     borderWidth: 1,
//     borderColor: '#e2e8f0',
//   },
//   segmentHeader: {
//     marginBottom: 8,
//   },
//   segmentPeriod: {
//     fontSize: 16,
//     fontWeight: '700',
//     color: '#111827',
//   },
//   segmentDetails: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//   },
//   segmentItem: {
//     // alignItems: 'center',
//     flex: 1,
//   },
//   segmentLabel: {
//     fontSize: 13,
//     color: '#6b7280',
//     marginBottom: 4,
//   },
//   segmentValue: {
//     fontSize: 16,
//     fontWeight: '600',
//     color: '#111827',
//   },
//   segmentTotal: {
//     color: '#2563EB',
//     fontWeight: '700',
//     fontSize: 17,
//   },

//   totalsBlock: {
//     marginTop: 10,
//     backgroundColor: '#ffffff',
//     borderRadius: 12,
//     padding: 12,
//     borderWidth: 1,
//     borderColor: '#cbd5e1',
//   },
//   totalLine: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     paddingVertical: 10,
//     borderBottomWidth: 1,
//     borderBottomColor: '#f1f5f9',
//   },
//   totalLabel: {
//     fontSize: 15,
//     color: '#4b5563',
//     fontWeight: '500',
//   },
//   subtotalValue: {
//     fontSize: 16,
//     fontWeight: '600',
//     color: '#111827',
//   },
//   gstValue: {
//     fontSize: 16,
//     fontWeight: '500',
//     color: '#6b7280',
//   },
//   finalTotalLine: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     paddingTop: 16,
//     paddingBottom: 8,
//   },
//   finalTotalLabel: {
//     fontSize: 17,
//     fontWeight: '700',
//     color: '#111827',
//   },
//   finalTotalValue: {
//     fontSize: 22,
//     fontWeight: '800',
//     color: '#2563EB',
//   },

//   chargeRateHighlight: {
//     marginTop: 20,
//     backgroundColor: '#eff6ff',
//     borderRadius: 16,
//     paddingVertical: 20,
//     paddingHorizontal: 24,
//     alignItems: 'center',
//     borderWidth: 2,
//     borderColor: '#bfdbfe',
//   },
//   chargeRateTitle: {
//     fontSize: 15,
//     fontWeight: '600',
//     color: '#1e40af',
//     marginBottom: 8,
//   },
//   chargeRateBig: {
//     fontSize: 26,
//     fontWeight: '800',
//     color: '#1e40af',
//   },

//   loadingContainer: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//     backgroundColor: '#f8fafc',
//   },
//   loadingText: {
//     marginTop: 16,
//     fontSize: 16,
//     color: '#4b5563',
//   },
//   errorContainer: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//     padding: 40,
//     backgroundColor: '#f8fafc',
//   },
//   errorText: {
//     color: '#ef4444',
//     fontSize: 18,
//     textAlign: 'center',
//     marginBottom: 24,
//   },
//   backButton: {
//     backgroundColor: '#2563EB',
//     paddingVertical: 14,
//     paddingHorizontal: 32,
//     borderRadius: 12,
//   },
//   backButtonText: {
//     color: 'white',
//     fontSize: 16,
//     fontWeight: '600',
//   },

//   totalPayCard: {
//     backgroundColor: '#ffffff',
//     borderRadius: 16,
//     padding: 20,
//     alignItems: 'center',
//     marginVertical: 16,
//     borderWidth: 2,
//     borderColor: '#bfdbfe',
//   },
//   totalPayTitle: {
//     fontSize: 16,
//     color: '#4b5563',
//     marginBottom: 8,
//   },
//   totalPayAmount: {
//     fontSize: 36,
//     fontWeight: '800',
//     color: '#1e40af',
//   },
//   totalPayNote: {
//     fontSize: 13,
//     color: '#6b7280',
//     marginTop: 12,
//     textAlign: 'center',
//   },

//   payNowButton: {
//     backgroundColor: '#16a34a',
//     borderRadius: 16,
//     paddingVertical: 18,
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'center',
//     marginTop: 24,
//   },
//   payNowText: {
//     color: '#fff',
//     fontSize: 18,
//     fontWeight: '700',
//   },

//   // Modal styles (same as before)
//   modalOverlay: {
//     flex: 1,
//     backgroundColor: 'rgba(0,0,0,0.5)',
//     justifyContent: 'flex-end',
//   },
//   paymentModalContainer: {
//     backgroundColor: '#ffffff',
//     borderTopLeftRadius: 24,
//     borderTopRightRadius: 24,
//     padding: 20,
//     maxHeight: '90%',
//   },
//   modalHeader: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     marginBottom: 7,
//   },
//   modalTitle: {
//     fontSize: 18,
//     fontWeight: '700',
//     color: '#111827',
//   },
//   closeModal: {
//     fontSize: 32,
//     color: '#9ca3af',
//     fontWeight: '300',
//   },
//   modalSubtitle: {
//     fontSize: 12,
//     color: '#4b5563',
//     marginBottom: 16,
//   },
//   amountRow: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     paddingVertical: 12,
//     borderTopWidth: 1,
//     borderBottomWidth: 1,
//     borderColor: '#e5e7eb',
//     marginBottom: 8,
//   },
//   amountLabel: {
//     fontSize: 16,
//     color: '#374151',
//   },
//   amountValue: {
//     fontSize: 18,
//     fontWeight: '700',
//     color: '#1e40af',
//   },
//   paymentMethodTabs: {
//     flexDirection: 'row',
//     marginBottom: 8,
//     borderRadius: 12,
//     overflow: 'hidden',
//     borderWidth: 1,
//     borderColor: '#d1d5db',
//   },
//   tab: {
//     flex: 1,
//     paddingVertical: 14,
//     alignItems: 'center',
//     backgroundColor: '#f8fafc',
//   },
//   tabActive: {
//     backgroundColor: '#2563eb',
//   },
//   tabText: {
//     fontSize: 15,
//     color: '#4b5563',
//     fontWeight: '600',
//   },
//   tabTextActive: {
//     color: '#ffffff',
//     fontWeight: '700',
//   },
//   noCardsText: {
//     textAlign: 'center',
//     paddingVertical: 40,
//     color: '#6b7280',
//     fontSize: 16,
//   },
//   cardItem: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     backgroundColor: '#f8fafc',
//     borderRadius: 12,
//     padding: 16,
//     marginBottom: 12,
//     borderWidth: 1,
//     borderColor: '#e5e7eb',
//   },
//   cardItemSelected: {
//     borderColor: '#2563eb',
//     borderWidth: 2,
//     backgroundColor: '#eff6ff',
//   },
//   cardInfo: {
//     marginLeft: 16,
//     flex: 1,
//   },
//   cardHolder: {
//     fontSize: 16,
//     fontWeight: '600',
//     color: '#111827',
//   },
//   cardNumber: {
//     fontSize: 15,
//     color: '#4b5563',
//     marginTop: 4,
//   },
//   cardExpiry: {
//     fontSize: 14,
//     color: '#6b7280',
//     marginTop: 2,
//   },
//   securityNote: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     marginVertical: 16,
//     padding: 12,
//     backgroundColor: '#f1f5f9',
//     borderRadius: 12,
//   },
//   securityText: {
//     marginLeft: 12,
//     fontSize: 13,
//     color: '#4b5563',
//     flex: 1,
//   },
//   payConfirmButton: {
//     backgroundColor: '#16a34a',
//     borderRadius: 16,
//     paddingVertical: 18,
//     alignItems: 'center',
//     marginTop: 12,
//   },
//   payConfirmText: {
//     color: '#fff',
//     fontSize: 18,
//     fontWeight: '700',
//   },
//   cancelButton: {
//     marginTop: 12,
//     paddingVertical: 16,
//     alignItems: 'center',
//   },
//   cancelText: {
//     color: '#ef4444',
//     fontSize: 16,
//     fontWeight: '600',
//   },
// });