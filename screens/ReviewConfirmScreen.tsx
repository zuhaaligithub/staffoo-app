import React, { useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
  TextInput,
  SafeAreaView,
  Image,
  TouchableWithoutFeedback,
} from 'react-native';
import {
  ChevronLeft,
  FileText,
  Files,
  ShieldCheck,
  CheckCircle,
  ArrowLeft,
  CreditCard,
  Lock,
  Check,
  X,
  DollarSign,
  Zap,
  Split,
  Users,
  User,
} from 'lucide-react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import {
  postJob,
  getUserProfile,
  holdPayment as holdPaymentAPI,
  getAuthToken,
} from '../services/authApi';
import { CardField, createPaymentMethod } from '@stripe/stripe-react-native';

interface RateSlot {
  day: number;
  night: number;
}
interface RatesConfig {
  charge: Record<string, RateSlot>;
}
interface ShiftSegment {
  label: string;
  hours: number;
  payRate: number;
  chargeRate: number;
}
interface CostBreakdown {
  chargeTotal: number;
  guardHours: number;
  breakdown: ShiftSegment[];
  totalShiftHours: number;
}
type PaymentPlan = 'full' | 'split';
type Card = {
  card_holder_name: string;
  card_number: string;
  expiry_month: string;
  expiry_year: string;
  payment_method_id?: string;
};

type RouteParams = {
  jobData?: {
    title?: string;
    category?: string;
    shifts?: Array<{
      date: Date;
      startTime: Date;
      endTime: Date;
      guardsCount: number;
    }>;
    startDate?: Date;
    startTime?: Date;
    endDate?: Date;
    endTime?: Date;
    location?: string;
    description?: string;
    lat?: number;
    lng?: number;
    guardsCount?: number;
  };
  uploadedFileUrls?: string[];
  uploadedFileNames?: string[];
  selectedDocuments?: string[];
};
const COLORS = {
  primary: '#001F3F', // deep navy
  secondary: '#003566', // rich blue
  accent: '#0A7C6E', // teal
  accentLight: '#DFF7F3',
  success: '#16A34A',
  warning: '#F59E0B',

  background: '#F4F7FB',
  card: '#FFFFFF',

  text: '#0F172A',
  textSoft: '#64748B',

  border: '#D6E0EA',

  lightBlue: '#EEF5FF',
  softCard: '#F8FBFF',
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

  const PRIVACY_POLICY_TEXT = `Staffoo: Terms of Service & Privacy Policy
Effective Date: March 14, 2026

Operated by: Capital Services Pty Ltd
ABN: 48 613 317 838
Registered Office: 21 Tanglewood Bvd, Truganina VIC 3029, Australia

Part 1: Privacy Policy
1.1 Overview
Staffoo (operated by Capital Services Pty Ltd) is committed to protecting the privacy of our customers, contractors, and staff in accordance with the Privacy Act 1988 (Cth) and the Australian Privacy Principles (APPs).

1.2 Information Collection & GPS Tracking
Customer Data: We collect business details, site addresses, contact information, and service requirements.
Workforce Data: We collect identity documents, ABNs, State-specific Security Licenses, and certifications.
GPS Movement Tracking: To ensure site security, lone-worker safety, and proof-of-attendance, Staffoo tracks the GPS location of all staff and contractors. This tracking is active only while a user is "Clocked In" for a shift. By using the app, workforce users consent to real-time location monitoring for the duration of their work assignment.

1.3 Payment Security (Stripe)
Staffoo does not store sensitive financial or credit card data. All transactions are processed via Stripe, a secure third-party gateway. Stripe handles all data in compliance with PCI-DSS standards.

Part 2: Terms for Customers
2.1 Booking and Payment Holds
Authorization: Upon job acceptance by a staff member or contractor, a payment hold (pre-authorization) will be placed on the customer’s nominated card via Stripe.
Amount: The hold will be equal to the total value specified in the approved quotation or invoice.
Final Charge: Funds are captured upon shift completion or as determined by the cancellation policy.

2.2 Cancellation & Refund Policy
Standard Cancellation: Cancellations made more than 24 hours before the shift start time are eligible for a full release of the payment hold.
The "1-Hour Rule": In accordance with Australian security industry standards, if a customer cancels a job within one (1) hour of the scheduled start time, a minimum charge of four (4) hours will be deducted from the held funds to compensate the assigned personnel.

Part 3: Workforce Compliance (Staff & Contractors)
3.1 National Licensing & Credentials
Valid Credentials: All personnel must hold a current and valid Security License for the specific State or Territory in which they are performing services.
ABN Requirements: Independent contractors must maintain a valid ABN and hold any required Business or Master Licensing relevant to their jurisdiction.
Updates: It is the individual’s responsibility to ensure licenses and First Aid certifications are kept up to date within the Staffoo app.

3.2 Safety and Reporting
Personnel must comply with the Work Health and Safety (WHS) laws applicable to their location. Any incidents or hazards must be logged immediately via the Staffoo app for client transparency.

Part 4: Code of Conduct
Reliability: Arrive at least 10 minutes prior to shift start. Repeat lateness or "no-shows" will result in removal from the platform.
Professionalism: High-visibility vests or specified corporate attire must be worn at all times while on duty.
GPS Integrity: Personnel must ensure location services are enabled during shifts. Any attempt to spoof or block GPS location will result in immediate termination of the assignment.
Sobriety: A zero-tolerance policy applies to alcohol or illegal substances.
Confidentiality: Personnel must protect all customer site data, access codes, and internal floor plans.

Part 5: Contact Information
For support or administrative inquiries, please contact Capital Services Pty Ltd:
Admin Office: 21 Tanglewood Bvd, Truganina VIC 3029
Email: [admin@gmail.com]
Phone: [0478916034]`;

  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rates, setRates] = useState<RatesConfig | null>(null);
  const [ratesLoading, setRatesLoading] = useState(true);
  const [ratesError, setRatesError] = useState<string | null>(null);
  const BASE_URL = 'https://apis.staffoo.com.au/api';
  const [acceptedPolicy, setAcceptedPolicy] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PaymentPlan>('full');

  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [savedCards, setSavedCards] = useState<Card[]>([]);
  const [selectedSavedIndex, setSelectedSavedIndex] = useState(0);
  const [paymentTab, setPaymentTab] = useState<'saved' | 'new'>('saved');
  const [cardError, setCardError] = useState('');
  const [processing, setProcessing] = useState(false);
  const [cardComplete, setCardComplete] = useState(false);
  // const [cardHolder, setCardHolder] = useState('');

  const LOGO = require('../assets/staffoo.png');
  const SEGMENT_LABELS: Record<string, string> = {
    weekday_day: 'Mon–Fri Day (06:00–18:00)',
    weekday_night: 'Mon–Fri Night (18:00–06:00)',
    fri_day: 'Friday Day (06:00–18:00)',
    fri_night: 'Friday Night (18:00–06:00)',
    sat_day: 'Saturday Day (06:00–18:00)',
    sat_night: 'Saturday Night (18:00–06:00)',
    sun_day: 'Sunday Day (06:00–18:00)',
    sun_night: 'Sunday Night (18:00–06:00)',
    pub_holi_day: 'Public Holiday Day (06:00–18:00)',
    pub_holi_night: 'Public Holiday Night (18:00–06:00)',
  };

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

  const pad = (n: number) => String(n).padStart(2, '0');

  // FIXED: Reading from precise Dates directly supplied by updated CreateJobScreen
  const buildTimes = () => {
    const s = new Date(jobData.startTime as Date);
    const e = new Date(jobData.endTime as Date);
    const fmt = (d: Date, sec = false) =>
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
        d.getHours(),
      )}:${pad(d.getMinutes())}${sec ? ':00' : ''}`;
    return {
      startStr: fmt(s),
      endStr: fmt(e),
      startStrSec: fmt(s, true),
      endStrSec: fmt(e, true),
    };
  };

  const [cardHolderName, setCardHolderName] = useState('');
  const [nameError, setNameError] = useState('');

  const handleCardHolderName = (text: string) => {
    // Allow only letters, spaces, dot and hyphen
    const cleanedText = text.replace(/[^a-zA-Z\s.-]/g, '');

    setCardHolderName(cleanedText);

    // Don't show error while typing
    if (cleanedText.trim().length === 0) {
      setNameError('');
      return;
    }

    // Validate only when enough text entered
    if (cleanedText.trim().length < 3) {
      setNameError('Please enter valid name');
    } else {
      setNameError('');
    }
  };

  const getPaymentMethodId = async (): Promise<{
    id: string;
    holderName: string;
  } | null> => {
    setCardError('');
    if (paymentTab === 'saved') {
      const card = savedCards[selectedSavedIndex];
      if (!card?.payment_method_id) {
        setCardError('Selected card has no payment method ID.');
        return null;
      }
      return { id: card.payment_method_id, holderName: card.card_holder_name };
    }
    if (!cardHolderName.trim()) {
      setCardError('Card holder name is required.');
      return null;
    }
    if (!cardComplete) {
      setCardError('Please enter complete card details.');
      return null;
    }

    try {
      const { paymentMethod, error } = await createPaymentMethod({
        paymentMethodType: 'Card',
        paymentMethodData: { billingDetails: { name: cardHolderName.trim() } },
      });
      if (error) {
        setCardError(error.message || 'Failed to create payment method');
        return null;
      }
      if (!paymentMethod) {
        setCardError('No payment method returned.');
        return null;
      }
      return { id: paymentMethod.id, holderName: cardHolderName.trim() };
    } catch (err: any) {
      setCardError(err.message || 'Stripe error');
      return null;
    }
  };

  const getChargeAmount = (total: number): number => {
    if (selectedPlan === 'full') return parseFloat((total * 0.95).toFixed(2));
    return parseFloat((total * 0.5).toFixed(2));
  };

  const holdPayment = async (
    pmId: string,
    holderName: string,
  ): Promise<string> => {
    const user = JSON.parse((await AsyncStorage.getItem('user'))!);

    // Format shifts exactly like the successful payload
    const formattedShifts = (jobData.shifts || []).map((shift: any) => {
      const start = new Date(shift.startTime);
      const end = new Date(shift.endTime);

      return {
        start: `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(
          start.getDate(),
        )}T${pad(start.getHours())}:${pad(start.getMinutes())}`,
        end: `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(
          end.getDate(),
        )}T${pad(end.getHours())}:${pad(end.getMinutes())}`,
        numberOfGuards: Number(shift.guardsCount || jobData.guardsCount || 1),
      };
    });

    const chargeAmount = getChargeAmount(totalIncGST);

    const payload = {
      user_id: user.id,
      card_holder_name: holderName,
      payment_method_id: pmId,
      payment_option: selectedPlan, // 'full' or 'split'
      charge_amount: chargeAmount,
      shifts: formattedShifts, // ← This is the key addition
      // You can keep these if the backend still needs them as fallback:
      // start: formattedShifts[0]?.start,
      // end: formattedShifts[formattedShifts.length - 1]?.end,
      number_of_guards: jobData.guardsCount || 1,
      requires_110_buffer: true, // as seen in your log
    };

    console.log('[HOLD PAYMENT PAYLOAD]', JSON.stringify(payload, null, 2));

    const res = await holdPaymentAPI(payload);
    if (!res?.success) throw new Error(res?.message || 'Payment hold failed.');
    return res.payment.payment_intent_id;
  };

  const submitJob = async (intentId: string | null) => {
    const user = JSON.parse((await AsyncStorage.getItem('user'))!);

    // Format the shifts array exactly as the backend expects
    const formattedShifts = (jobData.shifts || []).map((shift: any) => {
      const start = new Date(shift.startTime);
      const end = new Date(shift.endTime);

      return {
        start: `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(
          start.getDate(),
        )}T${pad(start.getHours())}:${pad(start.getMinutes())}`,
        end: `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(
          end.getDate(),
        )}T${pad(end.getHours())}:${pad(end.getMinutes())}`,
        numberOfGuards: Number(shift.guardsCount || jobData.guardsCount || 1),
      };
    });

    // Also build legacy startTime / endTime for backward compatibility
    const { startStrSec, endStrSec } = buildTimes();

    return postJob({
      user_id: user.id,
      title: jobData.title || `${getCategoryDisplay(jobData.category)}`,
      description: jobData.description || 'No description provided',
      address: jobData.location || 'Not specified',
      coordinates: `${(jobData.lat ?? -33.8688).toFixed(8)},${(
        jobData.lng ?? 151.2093
      ).toFixed(8)}`,
      state: 'NSW',
      numberOfGuards: jobData.guardsCount || 1,
      financials: {
        base_total_inc_gst: parseFloat(totalIncGST.toFixed(2)),
        discount_applied: parseFloat((totalIncGST * 0.05).toFixed(2)), // 5% discount for full pay
        amount_to_charge_today: parseFloat(ctaAmount.toFixed(2)),
        balance_deferred:
          selectedPlan === 'split'
            ? parseFloat((totalIncGST * 0.5).toFixed(2))
            : 0,
      },
      // Legacy fields (keep these)
      startTime: startStrSec,
      endTime: endStrSec,

      // New field - this is what you want for multiple shifts
      shifts: formattedShifts,

      is_document: selectedDocuments.length > 0,
      document_list: uploadedFileUrls,
      document_types: selectedDocuments,
      job_instruction: jobData.description || '',
      payment_intent_id: intentId,
      payment_option: selectedPlan, // 'full' or 'split'
    } as any); // Temporary type assertion until you update the interface
  };
  const handlePayment = async () => {
    if (processing) return;
    setProcessing(true);
    setCardError('');
    try {
      const pm = await getPaymentMethodId();
      if (!pm) {
        setProcessing(false);
        return;
      }
      const intentId = await holdPayment(pm.id, pm.holderName);
      const response = await submitJob(intentId);
      Toast.show({
        type: 'success',
        text1: 'Job Posted!',
        text2: response?.message || 'Job posted successfully.',
        position: 'bottom',
      });
      setPaymentModalVisible(false);
      navigation.reset({
        index: 0,
        routes: [{ name: 'Applications' as never }],
      });
    } catch (err: any) {
      const msg =
        err?.response?.data?.message || err.message || 'Something went wrong.';
      setCardError(msg);
      Toast.show({
        type: 'error',
        text1: 'Payment Failed',
        text2: msg,
        position: 'bottom',
      });
    } finally {
      setProcessing(false);
    }
  };

  const isPaymentReady = () => {
    if (paymentTab === 'saved') return savedCards.length > 0;

    return !!(cardHolderName.trim().length >= 3 && cardComplete);
  };

  function getDayType(d: Date): string {
    const day = d.getDay();
    if (day === 0) return 'sun';
    if (day === 5) return 'fri';
    if (day === 6) return 'sat';
    return 'weekday';
  }

  function getSlot(h: number): 'day' | 'night' {
    return h >= 6 && h < 18 ? 'day' : 'night';
  }

  function nextBoundary(t: Date): Date {
    const h = t.getHours();
    const n = new Date(t);
    n.setSeconds(0, 0);
    if (h < 6) n.setHours(6, 0, 0, 0);
    else if (h < 18) n.setHours(18, 0, 0, 0);
    else {
      n.setDate(n.getDate() + 1);
      n.setHours(0, 0, 0, 0);
    }
    return n;
  }

  function calcBreakdown(
    shiftsInput: Array<{
      date: Date;
      startTime: Date;
      endTime: Date;
      guardsCount: number;
    }>,
    r: RatesConfig,
  ): CostBreakdown {
    if (!shiftsInput || shiftsInput.length === 0) {
      return {
        chargeTotal: 0,
        guardHours: 0,
        breakdown: [],
        totalShiftHours: 0,
      };
    }

    const hMap = new Map<string, number>();
    const order: string[] = [];
    let totalCharge = 0;
    let totalGuardHours = 0;
    let totalShiftHours = 0;
    const bd: ShiftSegment[] = [];

    shiftsInput.forEach(shift => {
      const guards = Math.max(1, shift.guardsCount || 1);
      const start = new Date(shift.startTime);
      const end = new Date(shift.endTime);

      let t = new Date(start);
      while (t < end) {
        const b = nextBoundary(t);
        const segmentEnd = b < end ? b : end;

        const hoursSeg =
          (segmentEnd.getTime() - t.getTime()) / (1000 * 60 * 60);
        if (hoursSeg <= 0) break;

        const key = `${getDayType(t)}_${getSlot(t.getHours())}`;

        if (!hMap.has(key)) {
          hMap.set(key, 0);
          order.push(key);
        }

        hMap.set(key, (hMap.get(key) || 0) + hoursSeg * guards);

        t = new Date(segmentEnd);
      }

      const shiftHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      totalShiftHours += shiftHours;
      totalGuardHours += shiftHours * guards;
    });

    // Build breakdown
    order.forEach(k => {
      const totalHrsForRate = hMap.get(k) || 0;
      const [dt, sl] = k.split('_');
      const rateSlot = r.charge[dt]?.[sl as 'day' | 'night'] || 0;

      totalCharge += totalHrsForRate * rateSlot;

      bd.push({
        label: SEGMENT_LABELS[k] || k,
        hours: totalHrsForRate,
        payRate: 0,
        chargeRate: rateSlot,
      });
    });

    return {
      chargeTotal: totalCharge,
      guardHours: totalGuardHours,
      breakdown: bd,
      totalShiftHours: totalShiftHours,
    };
  }

  useEffect(() => {
    (async () => {
      try {
        const token = await getAuthToken();
        if (!token) throw new Error('No auth token');
        const res = await axios.get(`${BASE_URL}/get-chargerates`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.data?.success || !res.data?.data?.length)
          throw new Error('Invalid rates response');
        const i = res.data.data[0];
        setRates({
          charge: {
            weekday: {
              day: Number(i.def_metro_mon_to_fri_day_rate || 0),
              night: Number(i.def_metro_mon_to_fri_night_rate || 0),
            },
            fri: {
              day: Number(i.def_metro_mon_to_fri_day_rate || 0),
              night: Number(i.def_metro_mon_to_fri_night_rate || 0),
            },
            sat: {
              day: Number(i.def_metro_sat_day_rate || 0),
              night: Number(i.def_metro_sat_night_rate || 0),
            },
            sun: {
              day: Number(i.def_metro_sun_day_rate || 0),
              night: Number(i.def_metro_sun_night_rate || 0),
            },
            pub_holi: {
              day: Number(i.def_metro_pub_holi_day_rate || 0),
              night: Number(i.def_metro_pub_holi_night_rate || 0),
            },
          },
        });
      } catch (e: any) {
        setRatesError(
          e.response?.data?.message || e.message || 'Failed to load rates',
        );
      } finally {
        setRatesLoading(false);
      }
    })();
  }, []);

  const costBreakdown = useMemo(() => {
    if (!rates || !jobData.shifts || jobData.shifts.length === 0)
      return {
        chargeTotal: 0,
        guardHours: 0,
        breakdown: [],
        totalShiftHours: 0,
      };
    return calcBreakdown(jobData.shifts, rates);
  }, [rates, jobData.shifts]);

  const subtotal = costBreakdown.chargeTotal;
  const gst = subtotal * 0.1;
  const totalIncGST = subtotal * 1.1;
  const fullPayAmount = parseFloat((totalIncGST * 0.95).toFixed(2));
  const splitUpfront = parseFloat((totalIncGST * 0.5).toFixed(2));

  const fmtDT = (date?: Date, time?: Date) => {
    if (!date || !time) return 'Not set';
    try {
      return new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
        time.getHours(),
        time.getMinutes(),
      ).toLocaleString('en-AU', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
    } catch {
      return 'Invalid date';
    }
  };

  const openPaymentModal = () => {
    if (!acceptedPolicy) {
      Alert.alert('Required', 'Please agree to the Terms & Conditions first.');
      return;
    }
    setPaymentModalVisible(true);
    setCardError('');
    setProcessing(false);
    setPaymentTab(savedCards.length > 0 ? 'saved' : 'new');
    (async () => {
      try {
        const u = await AsyncStorage.getItem('user');
        const userId = u ? JSON.parse(u).id : null;
        if (!userId) return;
        const profile = await getUserProfile(userId);
        if (profile?.success && profile?.data?.customer?.bank_details) {
          const parsed = JSON.parse(profile.data.customer.bank_details || '[]');
          if (Array.isArray(parsed)) {
            setSavedCards(parsed);
            setSelectedSavedIndex(0);
          }
        }
      } catch {}
    })();
  };

  if (ratesLoading)
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0A7C6E" />
        <Text style={styles.loadingText}>Loading current pricing...</Text>
      </View>
    );
  if (ratesError || !rates)
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>
          Cannot load rates:{'\n'}
          {ratesError}
        </Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );

  const ctaAmount = selectedPlan === 'full' ? fullPayAmount : splitUpfront;
  const ctaLabel =
    selectedPlan === 'full'
      ? `Pay $${fullPayAmount.toFixed(2)} (5% Off)`
      : `Pay $${splitUpfront.toFixed(2)} Upfront`;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ChevronLeft size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Review & Confirm</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          <View style={styles.cardSectionHeader}>
            {/* <FileText size={22} color="#0A7C6E" /> */}
            <Text style={styles.sectionTitle}>Job Details</Text>
          </View>
          {[
            {
              label: 'Job Title',
              value: jobData.title || `${getCategoryDisplay(jobData.category)}`,
            },
            // {
            //   label: 'Job Category',
            //   value: getCategoryDisplay(jobData.category),
            // },
            // FIXED: Displaying proper aggregate Maximum Guard Count
            // {
            //   label: 'Max Guards Req.',
            //   value: String(jobData.guardsCount || 1),
            // },
            // {
            //   label: 'Start',
            //   value: fmtDT(jobData.startDate, jobData.startTime),
            // },
            // { label: 'End', value: fmtDT(jobData.endDate, jobData.endTime) },
            { label: 'Location', value: jobData.location || 'Not specified' },
            {
              label: 'Description',
              value: jobData.description || 'No description provided',
            },
          ].map(({ label, value }) => (
            <View style={styles.detailRow} key={label}>
              <Text style={styles.label}>{label}:</Text>
              <View style={styles.inputCard}>
                <Text style={styles.inputCardText}>{value}</Text>
              </View>
            </View>
          ))}
          {uploadedFileUrls.length > 0 && (
            <View style={styles.detailRow}>
              <Text style={styles.label}>Attachments:</Text>
              <View style={styles.inputCard}>
                {uploadedFileUrls.map((url, i) => (
                  <View
                    key={i}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      marginTop: i === 0 ? 0 : 6,
                    }}
                  >
                    <Files size={18} color="#0A7C6E" />
                    <Text
                      style={{
                        marginLeft: 8,
                        color: '#0A7C6E',
                        flexShrink: 1,
                        fontSize: 14,
                      }}
                      numberOfLines={1}
                    >
                      {uploadedFileNames[i] ||
                        url.split('/').pop() ||
                        `File ${i + 1}`}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* Schedule Summary */}
        <View style={styles.card}>
          <View style={styles.cardSectionHeader}>
            <Text style={styles.sectionTitle}>Schedule Summary</Text>
          </View>

          <View style={styles.scheduleContainer}>
            {jobData.shifts && jobData.shifts.length > 0 ? (
              jobData.shifts.map((shift: any, index: number) => {
                const start = new Date(shift.startTime);
                const end = new Date(shift.endTime);
                const isNextDay =
                  end.getDate() !== start.getDate() ||
                  end.getMonth() !== start.getMonth();

                return (
                  <View key={index} style={styles.shiftChip}>
                    <Text style={styles.shiftDate}>
                      {start.toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                      })}
                    </Text>

                    <View style={styles.timeContainer}>
                      <Text style={styles.timeText}>
                        {start.toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: false,
                        })}
                      </Text>
                      <Text style={styles.arrow}>→</Text>
                      <Text style={styles.timeText}>
                        {end.toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: false,
                        })}
                      </Text>
                      {isNextDay && <Text style={styles.nextDayTag}>+1d</Text>}
                    </View>

                    <View style={styles.guardsBadge}>
                      <User size={14} color="#0A7C6E" />

                      <Text style={styles.guardsCount}>
                        {shift.guardsCount || 1}
                      </Text>
                    </View>
                  </View>
                );
              })
            ) : (
              <Text style={styles.noShiftsText}>No shifts added</Text>
            )}
          </View>
        </View>

        <View style={styles.rateCard}>
          <View style={styles.rateMainHeader}>
            <Text style={styles.rateMainTitle}>Rate Breakdown</Text>
            <Text
              style={styles.rateMainSubtitle}
            >{`${costBreakdown.totalShiftHours.toFixed(2)} total hrs`}</Text>
          </View>
          {costBreakdown.breakdown.length === 0 ? (
            <Text style={styles.noDataText}>
              No breakdown available – check shift dates
            </Text>
          ) : (
            <>
              {costBreakdown.breakdown.map((item, i) => (
                <View key={i} style={styles.rateSegmentCard}>
                  <Text style={styles.segmentPeriod}>{item.label}</Text>
                  <View style={styles.segmentDetails}>
                    <View style={styles.segmentItem}>
                      <Text style={styles.segmentLabel}>Hours (x Guards)</Text>
                      <Text style={styles.segmentValue}>
                        {item.hours.toFixed(2)} hrs
                      </Text>
                    </View>
                    <View style={styles.segmentItem}>
                      <Text style={styles.segmentLabel}>Charge/hr</Text>
                      <Text style={styles.segmentValue}>
                        ${item.chargeRate.toFixed(2)}
                      </Text>
                    </View>
                    <View style={styles.segmentItem}>
                      <Text style={styles.segmentLabel}>Total</Text>
                      <Text style={styles.segmentValue}>
                        ${(item.chargeRate * item.hours).toFixed(2)}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
              <View style={styles.totalsBlock}>
                <View style={styles.totalLine}>
                  <Text style={styles.totalLabel}>Subtotal (ex. GST)</Text>
                  <Text style={styles.subtotalValue}>
                    ${subtotal.toFixed(2)}
                  </Text>
                </View>
                <View style={styles.totalLine}>
                  <Text style={styles.totalLabel}>GST (10%)</Text>
                  <Text style={styles.gstValue}>${gst.toFixed(2)}</Text>
                </View>
                <View style={styles.finalTotalLine}>
                  <Text style={styles.finalTotalLabel}>Total (inc. GST)</Text>
                  <Text style={styles.finalTotalValue}>
                    ${totalIncGST.toFixed(2)}
                  </Text>
                </View>
              </View>
            </>
          )}
        </View>

        <View style={styles.paymentOptionsCard}>
          <View style={styles.paymentOptionsHeader}>
            {/* <DollarSign size={20} color="#0A7C6E" /> */}
            <Text style={styles.paymentOptionsTitle}>Payment Options</Text>
          </View>
          <View style={styles.paymentOptionsRow}>
            <TouchableOpacity
              style={[
                styles.planCard,
                selectedPlan === 'full' && styles.planCardSelected,
              ]}
              onPress={() => setSelectedPlan('full')}
              activeOpacity={0.85}
            >
              {selectedPlan === 'full' && (
                <View style={styles.planSelectedDot}>
                  <Check size={10} color="#fff" />
                </View>
              )}
              <View style={styles.planTitleRow}>
                <Text
                  style={[
                    styles.planName,
                    selectedPlan === 'full' && styles.planNameSelected,
                  ]}
                >
                  Pay in Full
                </Text>
                <View style={styles.saveBadge}>
                  <Text style={styles.saveBadgeText}>Save 5%</Text>
                </View>
              </View>
              <Text style={styles.planDesc}>
                Pay the total amount now and receive an instant 5% discount on
                your booking.
              </Text>
              <View style={styles.planAmountRow}>
                <Text
                  style={[
                    styles.planAmount,
                    selectedPlan === 'full' && styles.planAmountSelected,
                  ]}
                >
                  ${fullPayAmount.toFixed(2)}
                </Text>
                <Text style={styles.planAmountLabel}> total</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.planCard,
                selectedPlan === 'split' && styles.planCardSelected,
              ]}
              onPress={() => setSelectedPlan('split')}
              activeOpacity={0.85}
            >
              {selectedPlan === 'split' && (
                <View style={styles.planSelectedDot}>
                  <Check size={10} color="#fff" />
                </View>
              )}
              <View style={styles.planTitleRow}>
                <Text
                  style={[
                    styles.planName,
                    selectedPlan === 'split' && styles.planNameSelected,
                  ]}
                >
                  50/50 Split
                </Text>
              </View>
              <Text style={styles.planDesc}>
                Pay 50% upfront to secure guards. The remaining 50% is charged
                upon shift completion.
              </Text>
              <View style={styles.planAmountRow}>
                <Text
                  style={[
                    styles.planAmount,
                    selectedPlan === 'split' && styles.planAmountSelected,
                  ]}
                >
                  ${splitUpfront.toFixed(2)}
                </Text>
                <Text style={styles.planAmountLabel}> upfront</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* <View style={styles.card}>
          <View style={styles.cardSectionHeader}>
            <ShieldCheck size={22} color="#0A7C6E" />
            <Text style={styles.sectionTitle}>Terms & Conditions</Text>
          </View>
          <TouchableOpacity
            style={styles.policyContainer}
            onPress={() => setAcceptedPolicy(!acceptedPolicy)}
            activeOpacity={0.8}
          >
            <View
              style={[
                styles.checkbox,
                acceptedPolicy && styles.checkboxChecked,
              ]}
            >
              {acceptedPolicy && <Check size={16} color="#fff" />}
            </View>
            <Text style={styles.policyText}>
              I agree to the{' '}
              <Text
                style={styles.policyLink}
                onPress={e => {
                  e.stopPropagation();
                  setShowPolicyModal(true);
                }}
              >
                Terms & Conditions
              </Text>
            </Text>
          </TouchableOpacity>
        </View> */}

        <TouchableOpacity
          style={styles.policyContainer}
          onPress={() => setAcceptedPolicy(!acceptedPolicy)}
        >
          <View
            style={[styles.checkbox, acceptedPolicy && styles.checkboxChecked]}
          >
            {acceptedPolicy && <Check size={16} color="#fff" />}
          </View>
          <Text style={styles.policyText}>
            I accept the{' '}
            <Text
              style={styles.policyLink}
              onPress={e => {
                e.stopPropagation();
                setShowPolicyModal(true);
              }}
            >
              Privacy Policy & Terms
            </Text>
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.payNowButton,
            (!acceptedPolicy || isSubmitting) && styles.disabledButton,
          ]}
          onPress={openPaymentModal}
          disabled={!acceptedPolicy || isSubmitting}
        >
          <Lock size={20} color="#fff" style={{ marginRight: 10 }} />
          <Text style={styles.payNowText}>{ctaLabel} & Post Job</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => navigation.goBack()}
        >
          <ArrowLeft size={20} color="#0A7C6E" />
          <Text style={styles.editButtonText}>Edit Job</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal
        visible={showPolicyModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPolicyModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <View style={styles.headerLeft}>
              <Image
                source={LOGO}
                style={styles.modalLogo}
                resizeMode="contain"
              />
              <View>
                <Text style={styles.modalTitle}>Privacy Policy & Terms</Text>
                <Text style={styles.modalSubtitle}>
                  Staffoo • Legal Documents
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => setShowPolicyModal(false)}
              style={styles.closeBtn}
            >
              <X size={18} color="#b72f0d" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.modalScroll}
            contentContainerStyle={styles.modalScrollContent}
          >
            <View style={styles.policyCard}>
              <View style={styles.highlightedInfo}>
                <Text style={styles.highlightText}>
                  Effective Date: March 14, 2026
                </Text>
                <Text style={styles.highlightText}>
                  Operated by: Capital Services Pty Ltd
                </Text>
                <Text style={styles.highlightText}>ABN: 48 613 317 838</Text>
                <Text style={styles.highlightText}>
                  Registered Office: 21 Tanglewood Bvd, Truganina VIC 3029,
                  Australia
                </Text>
              </View>

              <Text style={styles.policyBodyText}>{PRIVACY_POLICY_TEXT}</Text>
            </View>

            <Text style={styles.lastUpdated}>
              Capital Services Pty Ltd • ABN 48 613 317 838
            </Text>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.acceptBtn}
              onPress={() => {
                setAcceptedPolicy(true);
                setShowPolicyModal(false);
              }}
            >
              <Check size={22} color="#fff" style={{ marginRight: 10 }} />
              <Text style={styles.acceptBtnText}>
                I Accept the Terms & Privacy Policy
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      <Modal
        visible={paymentModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => !processing && setPaymentModalVisible(false)}
      >
        <TouchableWithoutFeedback
          onPress={() => {
            if (!processing) setPaymentModalVisible(false);
          }}
        >
          <View style={styles.modalOverlay}>
            {/* Prevent modal close when clicking inside */}
            <TouchableWithoutFeedback>
              <View style={styles.paymentModalContainer}>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => !processing && setPaymentModalVisible(false)}
                  disabled={processing}
                >
                  <Text style={styles.closeText}>×</Text>
                </TouchableOpacity>

                <Text style={styles.pmTitle}>Stripe Payment</Text>

                <Text style={styles.pmSubtitle}>
                  {selectedPlan === 'full'
                    ? 'Pay in full with a 5% discount applied.'
                    : '50% now to secure guards. Balance due after completion.'}
                </Text>

                <View style={styles.amountBar}>
                  <Text style={styles.jobTitleText}>
                    {jobData.title || 'Job posting'}
                  </Text>

                  <Text style={styles.amountText}>${ctaAmount.toFixed(2)}</Text>
                </View>

                {/* SAVED CARDS */}
                {paymentTab === 'saved' && savedCards.length > 0 && (
                  <FlatList
                    data={savedCards}
                    keyExtractor={(_, i) => `card-${i}`}
                    style={styles.savedCardsList}
                    renderItem={({ item, index }) => (
                      <TouchableOpacity
                        style={[
                          styles.savedCardItem,
                          selectedSavedIndex === index &&
                            styles.savedCardSelected,
                        ]}
                        onPress={() => setSelectedSavedIndex(index)}
                        disabled={processing}
                      >
                        <CreditCard size={24} color="#6366F1" />

                        <View style={styles.cardInfo}>
                          <Text style={styles.cardHolder}>
                            {item.card_holder_name}
                          </Text>

                          <Text style={styles.cardLast4}>
                            •••• {item.card_number.slice(-4)}
                          </Text>
                        </View>

                        {selectedSavedIndex === index && (
                          <CheckCircle size={24} color="#22c55e" />
                        )}
                      </TouchableOpacity>
                    )}
                  />
                )}

                {/* NEW CARD */}
                {paymentTab === 'new' && (
                  <View style={styles.newCardForm}>
                    {/* <TextInput
                      style={styles.input}
                      placeholder="Card Holder Name"
                      placeholderTextColor="#9ba8c2"
                      value={cardHolder}
                      onChangeText={setCardHolder}
                      editable={!processing}
                    /> */}

                    <TextInput
                      placeholder="Card Holder Name"
                      value={cardHolderName}
                      onChangeText={handleCardHolderName}
                      autoCapitalize="words"
                      keyboardType="default"
                      style={[
                        styles.input,
                        nameError ? { borderColor: 'red' } : null,
                      ]}
                    />

                    {nameError ? (
                      <Text style={styles.errorText}>{nameError}</Text>
                    ) : null}

                    <CardField
                      postalCodeEnabled={false}
                      placeholders={{
                        number: '4242 4242 4242 4242',
                        expiration: 'MM/YY',
                        cvc: 'CVC',
                      }}
                      cardStyle={{
                        backgroundColor: '#FFFFFF',
                        textColor: '#111827',
                        borderColor: '#D1D5DB',
                        borderWidth: 1,
                        borderRadius: 10,
                        fontSize: 16,
                        placeholderColor: '#9CA3AF',
                      }}
                      style={{
                        width: '100%',
                        height: 50,
                        marginVertical: 12,
                      }}
                      onCardChange={(cardDetails: any) => {
                        setCardComplete(cardDetails.complete);

                        if (cardDetails?.error) {
                          setCardError(cardDetails.error?.message || '');
                        } else {
                          setCardError('');
                        }
                      }}
                    />
                  </View>
                )}

                {/* ERROR */}
                {cardError ? (
                  <Text style={styles.errorTextSmall}>{cardError}</Text>
                ) : null}

                {/* PAY BUTTON */}
                <TouchableOpacity
                  style={[
                    styles.payButton,
                    (!isPaymentReady() || processing) && styles.disabledButton,
                  ]}
                  onPress={handlePayment}
                  disabled={!isPaymentReady() || processing}
                >
                  {processing ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.payButtonText}>
                      Pay ${ctaAmount.toFixed(2)}
                    </Text>
                  )}
                </TouchableOpacity>

                {/* CANCEL BUTTON */}
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => !processing && setPaymentModalVisible(false)}
                  disabled={processing}
                >
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

// Ensure you retain your `styles` object correctly here at the bottom of ReviewConfirmScreen.tsx as in your original.
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#001F3F',
    paddingTop: 55,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 16,
    // paddingVertical: 25,
  
  },

  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.5,
  },
  scrollContent: { padding: 16, paddingBottom: 100 },
  card: {
    backgroundColor: 'rgba(255,255,255,0.08)',

    borderRadius: 24,
    padding: 18,
    marginBottom: 14,

    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',

    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
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
    fontWeight: '800',
    color: '#fff',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
    alignItems: 'flex-start',
  },
  label: {
    color: '#89E7D0',
    fontWeight: '700',
    fontSize: 13,
    marginBottom: 6,
  },
  inputCard: {
    flex: 2,
    backgroundColor: '#e4f1f9',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    // borderWidth: 1,
    // borderColor: '#ccd0e0',
    // shadowColor: '#506776',
    // shadowOffset: { width: 0, height: 8 },
    // shadowOpacity: 0.15,
    // shadowRadius: 25,
    // elevation: 12,
  },
  inputCardText: { fontSize: 12, color: '#030303', fontWeight: '700' },
  rateCard: {
    backgroundColor: 'rgba(255,255,255,0.08)',

    borderRadius: 24,
    padding: 18,
    marginBottom: 18,

    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  rateMainHeader: { marginBottom: 5, paddingBottom: 7 },
  rateMainTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 4,
  },
  rateMainSubtitle: { fontSize: 16, fontWeight: '600', color: '#76a4e0' },
  noDataText: {
    textAlign: 'center',
    paddingVertical: 30,
    fontSize: 15,
    color: '#6b7280',
    fontStyle: 'italic',
  },

  segmentDetails: { flexDirection: 'row', justifyContent: 'space-between' },
  segmentItem: { flex: 1 },

  scheduleContainer: {
    gap: 10,
    // marginTop: 8,
  },

  shiftChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e4f1f9',
    borderRadius: 30,
    padding: 5,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginLeft: 10,
    paddingLeft: 20,
    paddingRight: 10,
  },

  shiftDate: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E2937',
    width: 85,
  },

  timeContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  timeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },

  arrow: {
    fontSize: 16,
    color: '#64748B',
    fontWeight: '500',
  },

  nextDayTag: {
    fontSize: 11,
    color: '#F59E0B',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontWeight: '600',
    marginLeft: 4,
  },

  guardsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF4FF',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 14,
    gap: 4,
  },

  guardsCount: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0A7C6E',
  },

  guardsLabel: {
    fontSize: 10,
    color: '#64748B',
    marginTop: -2,
  },

  noShiftsText: {
    textAlign: 'center',
    color: '#94A3B8',
    fontSize: 15,
    padding: 20,
  },
  totalLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },

  finalTotalLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 16,
    paddingBottom: 8,
  },

  paymentOptionsCard: {
    backgroundColor: 'rgba(255,255,255,0.08)',

    borderRadius: 24,
    padding: 18,
    marginBottom: 18,

    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  paymentOptionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  paymentOptionsTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },
  paymentOptionsRow: { flexDirection: 'row', gap: 10 },

  planSelectedDot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#0A7C6E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  planTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },

  planNameSelected: { color: '#0A7C6E' },
  saveBadge: {
    backgroundColor: '#16a34a',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 20,
  },
  saveBadgeText: { fontSize: 11, color: '#fff', fontWeight: '700' },

  planAmountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 'auto',
  },

  planAmountLabel: { fontSize: 13, color: '#9ca3af' },

  disabledButton: { opacity: 0.55 },
  payNowButton: {
    backgroundColor: '#0047FF',

    borderRadius: 20,
    paddingVertical: 18,

    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',

    shadowColor: '#0047FF',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 12,
  },

  payNowText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: { marginTop: 16, fontSize: 16, color: '#4b5563' },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#f8fafc',
  },

  backButton: {
    backgroundColor: '#0A7C6E',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  backButtonText: { color: 'white', fontSize: 16, fontWeight: '600' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    padding: 16,
  },
  paymentModalContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
  },
  closeButton: { position: 'absolute', top: 14, right: 20, zIndex: 1 },
  closeText: { fontSize: 32, color: '#6B7280', fontWeight: '300' },
  pmTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  pmSubtitle: { fontSize: 13, color: '#6b7280', marginBottom: 16 },
  amountBar: {
    backgroundColor: '#F0F4FF',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  jobTitleText: { fontSize: 14, color: '#6B7280' },
  amountText: { fontSize: 22, fontWeight: '700', color: '#3B82F6' },
  tabsContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  tabActive: { backgroundColor: '#0A7C6E' },
  tabText: { fontSize: 15, color: '#9ba8c2', fontWeight: '600' },
  tabTextActive: { fontSize: 15, color: '#fff', fontWeight: '700' },
  savedCardsList: { maxHeight: 240, marginBottom: 16 },
  savedCardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  savedCardSelected: { borderColor: '#6366F1', backgroundColor: '#EFF6FF' },
  cardInfo: { marginLeft: 14, flex: 1 },
  cardHolder: { fontSize: 16, fontWeight: '600', color: '#1F2937' },
  cardLast4: { fontSize: 15, color: '#6B7280', marginTop: 2 },
  newCardForm: { marginBottom: 0 },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    padding: 14,
    color: '#111827',
    fontSize: 16,
    backgroundColor: '#fff',
    marginBottom: 0,
  },
  errorTextSmall: {
    color: '#EF4444',
    fontSize: 13,
    marginBottom: 12,
    textAlign: 'center',
  },
  payButton: {
    backgroundColor: '#16A34A',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  payButtonText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  cancelButton: { marginTop: 16, paddingVertical: 16, alignItems: 'center' },
  cancelText: { color: '#EF4444', fontSize: 16, fontWeight: '600' },

  policyText: { fontSize: 14, color: '#ffff', flex: 1 },
  policyLink: { color: '#0A7C6E', fontWeight: '700' },

  modalContainer: { flex: 1, backgroundColor: '#f8fafc' },
  modalHeader: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 5,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  modalLogo: { width: 70, height: 30 },
  modalTitle: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  modalSubtitle: { fontSize: 10, color: '#64748b', marginTop: 2 },
  closeBtn: { padding: 5, borderRadius: 30, backgroundColor: '#f1f5f9' },

  modalScroll: { flex: 1 },
  modalScrollContent: { padding: 20, paddingBottom: 40 },

  policyCard: {},
  highlightedInfo: {
    backgroundColor: '#e0f2fe',
    padding: 18,
    borderRadius: 16,
    marginBottom: 24,
    borderLeftWidth: 5,
    borderLeftColor: '#3b82f6',
  },
  highlightText: {
    fontSize: 15.5,
    color: '#1e40af',
    fontWeight: '600',
    lineHeight: 24,
    marginBottom: 6,
  },
  policyBodyText: {
    fontSize: 16,
    color: '#1e2937',
    lineHeight: 26,
    letterSpacing: 0.15,
  },
  lastUpdated: {
    textAlign: 'center',
    marginTop: 28,
    fontSize: 13.5,
    color: '#94a3b8',
    fontWeight: '500',
  },
  modalFooter: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  acceptBtn: {
    backgroundColor: '#001F3F',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    shadowColor: '#2e4b69',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 10,
  },
  acceptBtnText: { color: '#fff', fontSize: 17.5, fontWeight: '700' },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  rateSegmentCard: {
    backgroundColor: 'rgba(255,255,255,0.06)',

    borderRadius: 18,
    padding: 15,
    marginBottom: 12,

    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },

  segmentPeriod: {
    color: '#89E7D0',
    fontWeight: '800',
    fontSize: 15,
    marginBottom: 12,
  },

  segmentLabel: {
    color: '#94A3B8',
    fontSize: 12,
  },

  segmentValue: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },

  totalsBlock: {
    marginTop: 14,

    backgroundColor: 'rgba(255,255,255,0.05)',

    borderRadius: 20,
    padding: 16,

    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },

  totalLabel: {
    color: '#CBD5E1',
    fontSize: 15,
  },

  subtotalValue: {
    color: '#fff',
    fontWeight: '700',
  },

  gstValue: {
    color: '#89E7D0',
    fontWeight: '700',
  },

  finalTotalLabel: {
    color: '#89E7D0',
    fontSize: 19,
    fontWeight: '800',
  },

  finalTotalValue: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '900',
  },

  planCard: {
    flex: 1,

    backgroundColor: 'rgba(255,255,255,0.06)',

    borderRadius: 22,
    padding: 16,

    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',

    minHeight: 180,
  },

  planCardSelected: {
    borderColor: '#89E7D0',
    backgroundColor: 'rgba(137,231,208,0.08)',
  },

  planName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },

  planDesc: {
    color: '#CBD5E1',
    fontSize: 12,
    lineHeight: 18,
  },

  planAmount: {
    color: '#89E7D0',
    fontSize: 26,
    fontWeight: '900',
  },

  planAmountSelected: {
    color: '#89E7D0',
  },
  policyContainer: {
    flexDirection: 'row',
    alignItems: 'center',

    backgroundColor: 'rgba(255,255,255,0.06)',

    padding: 16,
    borderRadius: 18,

    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',

    marginBottom: 18,
  },

  checkbox: {
    width: 24,
    height: 24,

    borderRadius: 8,

    borderWidth: 2,
    borderColor: '#89E7D0',

    justifyContent: 'center',
    alignItems: 'center',

    marginRight: 12,
  },

  checkboxChecked: {
    backgroundColor: '#89E7D0',
  },
  editButton: {
    borderWidth: 1.5,
    borderColor: '#89E7D0',

    borderRadius: 18,

    paddingVertical: 16,

    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',

    backgroundColor: 'rgba(255,255,255,0.05)',
  },

  editButtonText: {
    color: '#89E7D0',
    fontWeight: '700',
    fontSize: 16,
  },
});
