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
} from 'lucide-react-native';
import CheckBox from '@react-native-community/checkbox';
import { useNavigation, useRoute } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { postJob, getUserProfile } from '../services/authApi';
import { CardField, createPaymentMethod, useStripe } from '@stripe/stripe-react-native';
// ─── Types ─────────────────────────────────────────────────────────────────
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

// ─── Component ─────────────────────────────────────────────────────────────
export default function ReviewConfirmScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { jobData = {}, uploadedFileUrls = [], uploadedFileNames = [], selectedDocuments = [] } =
    (route.params || {}) as RouteParams;

  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rates, setRates] = useState<RatesConfig | null>(null);
  const [ratesLoading, setRatesLoading] = useState(true);
  const [ratesError, setRatesError] = useState<string | null>(null);
  const BASE_URL = 'https://apis.staffoo.com.au/api';

  // Payment Modal States
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [savedCards, setSavedCards] = useState<Card[]>([]);
  const [selectedSavedIndex, setSelectedSavedIndex] = useState(0);
  const [paymentTab, setPaymentTab] = useState<'saved' | 'new'>('saved');
  const [cardError, setCardError] = useState('');
  const [processing, setProcessing] = useState(false);
  const [cardComplete, setCardComplete] = useState(false);

  // New Card Fields
  const [cardHolder, setCardHolder] = useState('');


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

  const buildTimes = () => {
    const sd = jobData.startDate as Date;
    const st = jobData.startTime as Date;
    const ed = jobData.endDate as Date;
    const et = jobData.endTime as Date;

    const s = new Date(sd.getFullYear(), sd.getMonth(), sd.getDate(), st.getHours(), st.getMinutes());
    const e = new Date(ed.getFullYear(), ed.getMonth(), ed.getDate(), et.getHours(), et.getMinutes());

    const fmt = (d: Date, sec = false) =>
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}${sec ? ':00' : ''
      }`;

    return { startStr: fmt(s), endStr: fmt(e), startStrSec: fmt(s, true), endStrSec: fmt(e, true) };
  };
  const getPaymentMethodId = async (): Promise<{ id: string; holderName: string } | null> => {
    setCardError('');

    // Saved card flow
    if (paymentTab === 'saved') {
      const card = savedCards[selectedSavedIndex];
      if (!card?.payment_method_id) {
        setCardError('Selected card has no payment method ID.');
        return null;
      }
      return {
        id: card.payment_method_id,
        holderName: card.card_holder_name,
      };
    }

    // New card flow
    if (!cardHolder.trim()) {
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
        paymentMethodData: {
          billingDetails: {
            name: cardHolder.trim(),
          },
        },
      });

      if (error) {
        setCardError(error.message || 'Failed to create payment method');
        return null;
      }

      if (!paymentMethod) {
        setCardError('No payment method returned.');
        return null;
      }

      return {
        id: paymentMethod.id,
        holderName: cardHolder.trim(),
      };
    } catch (err: any) {
      setCardError(err.message || 'Stripe error');
      return null;
    }
  };


  const holdPayment = async (pmId: string, holderName: string): Promise<string> => {
    const user = JSON.parse((await AsyncStorage.getItem('user'))!);
    const { startStr, endStr } = buildTimes();

    const res = await axios.post(`${BASE_URL}/payment/hold`, {
      start: startStr,
      end: endStr,
      user_id: user.id,
      card_holder_name: holderName,
      payment_method_id: pmId,
    });

    console.log('💰 HOLD RESPONSE:', res.data);

    if (!res.data?.success) {
      throw new Error(res.data?.message || 'Payment hold failed.');
    }

    // ✅ FIXED PATH
    const intentId = res.data?.payment?.payment_intent_id;

    if (!intentId) {
      throw new Error('No payment_intent_id returned');
    }

    return intentId;
  };

  // Submit Job to Backend
  const submitJob = async (intentId: string | null) => {
    const user = JSON.parse((await AsyncStorage.getItem('user'))!);
    const { startStrSec, endStrSec } = buildTimes();

    return postJob({
      user_id: user.id,
      title: jobData.title || `${getCategoryDisplay(jobData.category)} Security Job`,
      description: jobData.description || 'No description provided',
      address: jobData.location || 'Not specified',
      coordinates: `${(jobData.lat ?? 31.5204).toFixed(8)},${(jobData.lng ?? 74.3587).toFixed(8)}`,
      state: 'Punjab',
      numberOfGuards: jobData.guardsCount || 1,
      startTime: startStrSec,
      endTime: endStrSec,
      is_document: selectedDocuments.length > 0,
      document_list: uploadedFileUrls,
      document_types: selectedDocuments,
      job_instruction: jobData.description || '',
      payment_intent_id: intentId,
    });
  };
  // ─── Main Payment Handler ───
  const handlePayment = async () => {
    if (processing) return;

    setProcessing(true);
    setCardError('');

    try {
      // Step 1: Get or create payment method
      const pm = await getPaymentMethodId();
      if (!pm) {
        setProcessing(false);
        return;
      }

      // Step 2: Hold payment on backend
      const intentId = await holdPayment(pm.id, pm.holderName);

      // Step 3: Submit job with payment intent
      const response = await submitJob(intentId);

      Toast.show({
        type: 'success',
        text1: 'Job Posted!',
        text2: response?.message || 'Job posted successfully.',
        position: 'bottom',
      });

      setPaymentModalVisible(false);
      navigation.reset({ index: 0, routes: [{ name: 'Applications' as never }] });
    } catch (err: any) {
      const msg = err?.response?.data?.message || err.message || 'Something went wrong.';
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
    return !!(cardHolder.trim() && cardComplete);
  };



  // Rate Calculation Functions
  function getDayType(d: Date): 'weekday' | 'fri' | 'sat' | 'sun' {
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
    sd: Date,
    st: Date,
    ed: Date,
    et: Date,
    guards: number,
    r: RatesConfig
  ): CostBreakdown {
    const start = new Date(sd);
    start.setHours(st.getHours(), st.getMinutes(), 0, 0);
    const end = new Date(ed);
    end.setHours(et.getHours(), et.getMinutes(), 0, 0);

    const hMap = new Map<string, number>();
    const order: string[] = [];
    let t = new Date(start);

    while (t < end) {
      const b = nextBoundary(t);
      const se = b < end ? b : end;
      const key = `${getDayType(t)}_${getSlot(t.getHours())}`;
      if (!hMap.has(key)) {
        hMap.set(key, 0);
        order.push(key);
      }
      hMap.set(key, (hMap.get(key) || 0) + (se.getTime() - t.getTime()) / 3_600_000);
      t = new Date(se);
    }

    let total = 0;
    const bd: ShiftSegment[] = [];
    order.forEach((k) => {
      const [dt, sl] = k.split('_');
      const hrs = hMap.get(k) || 0;
      const rate = r.charge[dt]?.[sl as 'day' | 'night'] || 0;
      total += hrs * rate * guards;
      bd.push({ label: SEGMENT_LABELS[k] || k, hours: hrs, payRate: 0, chargeRate: rate });
    });

    const totalHrs = Array.from(hMap.values()).reduce((a, b) => a + b, 0);
    return {
      chargeTotal: total,
      guardHours: totalHrs * guards,
      breakdown: bd,
      totalShiftHours: totalHrs,
    };
  }

  // Fetch Rates
  useEffect(() => {
    (async () => {
      try {
        const token = await AsyncStorage.getItem('@auth_token');
        if (!token) throw new Error('No auth token');

        const res = await axios.get(`${BASE_URL}/get-chargerates`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.data?.success || !res.data?.data?.length) throw new Error('Invalid rates response');

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
          },
        });
      } catch (e: any) {
        const msg = e.response?.data?.message || e.message || 'Failed to load rates';
        setRatesError(msg);
        Toast.show({ type: 'error', text1: 'Rates Error', text2: msg });
      } finally {
        setRatesLoading(false);
      }
    })();
  }, []);

  const costBreakdown = useMemo(() => {
    if (!rates || !jobData.startDate || !jobData.startTime || !jobData.endDate || !jobData.endTime) {
      return { chargeTotal: 0, guardHours: 0, breakdown: [], totalShiftHours: 0 };
    }
    return calcBreakdown(
      jobData.startDate,
      jobData.startTime,
      jobData.endDate,
      jobData.endTime,
      jobData.guardsCount || 1,
      rates
    );
  }, [rates, jobData]);

  const totalIncGST = costBreakdown.chargeTotal * 1.1;

  const fmtDT = (date?: Date, time?: Date) => {
    if (!date || !time) return 'Not set';
    try {
      return new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
        time.getHours(),
        time.getMinutes()
      ).toLocaleString('en-US', {
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

  const openPaymentModal = () => {
    if (!agreeToTerms) {
      Alert.alert('Required', 'Please agree to the Terms & Conditions first.');
      return;
    }

    setPaymentModalVisible(true);
    setCardError('');
    setProcessing(false);
    setPaymentTab(savedCards.length > 0 ? 'saved' : 'new');

    // Load saved cards
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
      } catch {
        Toast.show({ type: 'error', text1: 'Could not load saved cards' });
      }
    })();
  };

  if (ratesLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2EB1E2" />
        <Text style={styles.loadingText}>Loading current pricing...</Text>
      </View>
    );
  }

  if (ratesError || !rates) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>
          Cannot load rates:{'\n'}
          {ratesError || 'Unknown error'}
        </Text>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ChevronLeft size={28} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Review & Confirm</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Job Details */}
        <View style={styles.card}>
          <View style={styles.cardSectionHeader}>
            <FileText size={22} color="#2EB1E2" />
            <Text style={styles.sectionTitle}>Job Details</Text>
          </View>
          {[
            { label: 'Job Title', value: jobData.title || `${getCategoryDisplay(jobData.category)} Security Job` },
            { label: 'Job Category', value: getCategoryDisplay(jobData.category) },
            { label: 'Number of Guards', value: String(jobData.guardsCount || 1) },
            { label: 'Start', value: fmtDT(jobData.startDate, jobData.startTime) },
            { label: 'End', value: fmtDT(jobData.endDate, jobData.endTime) },
            { label: 'Location', value: jobData.location || 'Not specified' },
            { label: 'Description', value: jobData.description || 'No description provided' },
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
                  <View key={i} style={{ flexDirection: 'row', alignItems: 'center', marginTop: i === 0 ? 0 : 6 }}>
                    <Files size={18} color="#2EB1E2" />
                    <Text style={{ marginLeft: 8, color: '#2EB1E2', flexShrink: 1, fontSize: 14 }} numberOfLines={1}>
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
                  {selectedDocuments
                    .map((v) => v.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()))
                    .join(', ')}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Rate Breakdown */}
        <View style={styles.rateCard}>
          <View style={styles.rateMainHeader}>
            <Text style={styles.rateMainTitle}>Rate Breakdown</Text>
            <Text style={styles.rateMainSubtitle}>
              {`${costBreakdown.totalShiftHours.toFixed(2)} hrs · ${jobData.guardsCount || 1} guard${jobData.guardsCount !== 1 ? 's' : ''
                }`}
            </Text>
          </View>

          {costBreakdown.breakdown.length === 0 ? (
            <Text style={styles.noDataText}>No breakdown available – check shift dates</Text>
          ) : (
            <>
              {costBreakdown.breakdown.map((item, i) => (
                <View key={i} style={styles.rateSegmentCard}>
                  <Text style={styles.segmentPeriod}>{item.label}</Text>
                  <View style={styles.segmentDetails}>
                    <View style={styles.segmentItem}>
                      <Text style={styles.segmentLabel}>Hours</Text>
                      <Text style={styles.segmentValue}>{item.hours.toFixed(2)} hrs</Text>
                    </View>
                    <View style={styles.segmentItem}>
                      <Text style={styles.segmentLabel}>Charge/hr</Text>
                      <Text style={styles.segmentValue}>${item.chargeRate.toFixed(2)}</Text>
                    </View>
                    <View style={styles.segmentItem}>
                      <Text style={styles.segmentLabel}>Total</Text>
                      <Text style={styles.segmentValue}>
                        ${(item.chargeRate * item.hours * (jobData.guardsCount || 1)).toFixed(2)}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}

              <View style={styles.totalsBlock}>
                <View style={styles.totalLine}>
                  <Text style={styles.totalLabel}>Subtotal (ex. GST)</Text>
                  <Text style={styles.subtotalValue}>${costBreakdown.chargeTotal.toFixed(2)}</Text>
                </View>
                <View style={styles.totalLine}>
                  <Text style={styles.totalLabel}>GST (10%)</Text>
                  <Text style={styles.gstValue}>${(costBreakdown.chargeTotal * 0.1).toFixed(2)}</Text>
                </View>
                <View style={styles.finalTotalLine}>
                  <Text style={styles.finalTotalLabel}>Total (inc. GST)</Text>
                  <Text style={styles.finalTotalValue}>${totalIncGST.toFixed(2)}</Text>
                </View>
              </View>
            </>
          )}
        </View>

        {/* Amount Due */}
        <View style={styles.totalPayCard}>
          <Text style={styles.totalPayTitle}>Amount Due to Post Job</Text>
          <Text style={styles.totalPayAmount}>${totalIncGST.toFixed(2)}</Text>
          <Text style={styles.totalPayNote}>Secure hold via Stripe • Required to publish this job</Text>
        </View>

        {/* Terms */}
        <View style={styles.card}>
          <View style={styles.cardSectionHeader}>
            <ShieldCheck size={22} color="#2EB1E2" />
            <Text style={styles.sectionTitle}>Terms & Conditions</Text>
          </View>
          <View style={styles.agreeRow}>
            <CheckBox
              value={agreeToTerms}
              onValueChange={setAgreeToTerms}
              tintColors={{ true: '#2EB1E2', false: '#6b7280' }}
            />
            <Text style={styles.agreeText}>
              I agree to the <Text style={styles.termsLink}>Terms & Conditions</Text>.
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.payNowButton, (!agreeToTerms || isSubmitting) && styles.disabledButton]}
          onPress={openPaymentModal}
          disabled={!agreeToTerms || isSubmitting}
        >
          <Lock size={20} color="#fff" style={{ marginRight: 10 }} />
          <Text style={styles.payNowText}>Pay ${totalIncGST.toFixed(2)} & Post Job</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.editButton} onPress={() => navigation.goBack()}>
          <ArrowLeft size={20} color="#2EB1E2" />
          <Text style={styles.editButtonText}>Edit Job</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* ====================== PAYMENT MODAL ====================== */}
      <Modal
        visible={paymentModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => !processing && setPaymentModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.paymentModalContainer}>
            {/* Close Button */}
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => !processing && setPaymentModalVisible(false)}
              disabled={processing}
            >
              <Text style={styles.closeText}>×</Text>
            </TouchableOpacity>

            <Text style={styles.modalTitle}>Complete Payment</Text>
            <Text style={styles.modalSubtitle}>Direct payment to the service provider.</Text>

            {/* Amount Bar */}
            <View style={styles.amountBar}>
              <Text style={styles.jobTitleText}>{jobData.title || 'Job posting'}</Text>
              <Text style={styles.amountText}>${totalIncGST.toFixed(2)}</Text>
            </View>

            {/* Payment Tabs */}
            <View style={styles.tabsContainer}>
              <TouchableOpacity
                style={[styles.tabButton, paymentTab === 'saved' && styles.tabActive]}
                onPress={() => {
                  setPaymentTab('saved');
                  setCardError('');
                }}
                disabled={processing}
              >
                <Text style={paymentTab === 'saved' ? styles.tabTextActive : styles.tabText}>
                  Use Saved Card
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tabButton, paymentTab === 'new' && styles.tabActive]}
                onPress={() => {
                  setPaymentTab('new');
                  setCardError('');
                }}
                disabled={processing}
              >
                <Text style={paymentTab === 'new' ? styles.tabTextActive : styles.tabText}>
                  Enter New Card
                </Text>
              </TouchableOpacity>
            </View>

            {/* Saved Cards */}
            {paymentTab === 'saved' && savedCards.length > 0 && (
              <FlatList
                data={savedCards}
                keyExtractor={(_, i) => `card-${i}`}
                style={styles.savedCardsList}
                renderItem={({ item, index }) => (
                  <TouchableOpacity
                    style={[styles.savedCardItem, selectedSavedIndex === index && styles.savedCardSelected]}
                    onPress={() => setSelectedSavedIndex(index)}
                    disabled={processing}
                  >
                    <CreditCard size={24} color="#6366F1" />
                    <View style={styles.cardInfo}>
                      <Text style={styles.cardHolder}>{item.card_holder_name}</Text>
                      <Text style={styles.cardLast4}>•••• {item.card_number.slice(-4)}</Text>
                    </View>
                    {selectedSavedIndex === index && <CheckCircle size={24} color="#22c55e" />}
                  </TouchableOpacity>
                )}
              />
            )}

            {/* New Card Form */}
            {paymentTab === 'new' && (
              <View style={styles.newCardForm}>
                {/* Card Holder Name */}
                <TextInput
                  style={styles.input}
                  placeholder="Card Holder Name"
                  placeholderTextColor="#9ba8c2" // gray placeholder
                  value={cardHolder}
                  onChangeText={setCardHolder}
                  editable={!processing}
                />

                {/* Stripe Card Field */}
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
                  onCardChange={(cardDetails) => {
                    setCardComplete(cardDetails.complete);
                    if ((cardDetails as any)?.error) {
                      setCardError((cardDetails as any).error?.message || '');
                    } else {
                      setCardError('');
                    }
                  }}
                />
              </View>
            )}

            {paymentTab === 'saved' && savedCards.length === 0 && (
              <Text style={styles.noCardsText}>No saved cards found. Please add a new card.</Text>
            )}

            {cardError ? <Text style={styles.errorTextSmall}>{cardError}</Text> : null}

            {/* Submit Button */}
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
                <Text style={styles.payButtonText}>Pay ${totalIncGST.toFixed(2)}</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => !processing && setPaymentModalVisible(false)}
              disabled={processing}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', paddingTop: 20 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#121927' },
  scrollContent: { padding: 16, paddingBottom: 140 },
  card: { backgroundColor: '#fff', borderRadius: 20, marginBottom: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.12, shadowRadius: 30, elevation: 10 },
  cardSectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 10 },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: '#111827' },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, alignItems: 'flex-start' },
  label: { color: '#6b7280', fontWeight: '500', flex: 1, marginTop: 10, fontSize: 12 },
  inputCard: { flex: 2, backgroundColor: '#fff', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: '#d1d5db', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  inputCardText: { fontSize: 12, color: '#111827', fontWeight: '700' },
  agreeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, paddingVertical: 8 },
  agreeText: { flex: 1, marginLeft: 12, fontSize: 15, color: '#374151' },
  termsLink: { color: '#2EB1E2', textDecorationLine: 'underline' },
  editButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#2EB1E2', borderRadius: 12, paddingVertical: 18, marginTop: 12 },
  editButtonText: { color: '#2EB1E2', fontSize: 16, fontWeight: '600' },
  disabledButton: { opacity: 0.55 },
  rateCard: { backgroundColor: '#fff', borderRadius: 20, marginBottom: 20, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 25, elevation: 12 },
  rateMainHeader: { marginBottom: 15, paddingBottom: 12 },
  rateMainTitle: { fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 4 },
  rateMainSubtitle: { fontSize: 16, fontWeight: '600', color: '#4b5563' },
  noDataText: { textAlign: 'center', paddingVertical: 30, fontSize: 15, color: '#6b7280', fontStyle: 'italic' },
  rateSegmentCard: { backgroundColor: '#f8fafc', borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  segmentPeriod: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 8 },
  segmentDetails: { flexDirection: 'row', justifyContent: 'space-between' },
  segmentItem: { flex: 1 },
  segmentLabel: { fontSize: 12, color: '#6b7280', marginBottom: 4 },
  segmentValue: { fontSize: 14, fontWeight: '600', color: '#111827' },
  totalsBlock: { marginTop: 10, backgroundColor: '#fff', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#cbd5e1' },
  totalLine: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  totalLabel: { fontSize: 15, color: '#4b5563', fontWeight: '500' },
  subtotalValue: { fontSize: 16, fontWeight: '600', color: '#111827' },
  gstValue: { fontSize: 16, fontWeight: '500', color: '#6b7280' },
  finalTotalLine: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 16, paddingBottom: 8 },
  finalTotalLabel: { fontSize: 17, fontWeight: '700', color: '#111827' },
  finalTotalValue: { fontSize: 22, fontWeight: '800', color: '#2EB1E2' },
  totalPayCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20, alignItems: 'center', marginVertical: 16, borderWidth: 2, borderColor: '#bfdbfe' },
  totalPayTitle: { fontSize: 16, color: '#4b5563', marginBottom: 8 },
  totalPayAmount: { fontSize: 36, fontWeight: '800', color: '#1e40af' },
  totalPayNote: { fontSize: 13, color: '#6b7280', marginTop: 12, textAlign: 'center' },
  payNowButton: { backgroundColor: '#16a34a', borderRadius: 16, paddingVertical: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  payNowText: { color: '#fff', fontSize: 18, fontWeight: '700' },

  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' },
  loadingText: { marginTop: 16, fontSize: 16, color: '#4b5563' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, backgroundColor: '#f8fafc' },
  errorText: { color: '#ef4444', fontSize: 18, textAlign: 'center', marginBottom: 24 },
  backButton: { backgroundColor: '#2EB1E2', paddingVertical: 14, paddingHorizontal: 32, borderRadius: 12 },
  backButtonText: { color: 'white', fontSize: 16, fontWeight: '600' },

  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', padding: 16 },
  paymentModalContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 20,
  },
  closeButton: { position: 'absolute', top: 14, right: 20, zIndex: 1 },
  closeText: { fontSize: 32, color: '#6B7280', fontWeight: '300' },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#1A202C', marginBottom: 4 },
  modalSubtitle: { fontSize: 13, color: '#6B7280', marginBottom: 20 },

  amountBar: {
    backgroundColor: '#F0F4FF',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
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
  tabButton: { flex: 1, paddingVertical: 14, alignItems: 'center', backgroundColor: '#F9FAFB' },
  tabActive: { backgroundColor: '#2EB1E2' },
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

  newCardForm: { marginBottom: 16 },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    padding: 14,
    color: '#111827',
    fontSize: 16,
    backgroundColor: '#fff',
    marginBottom: 12,
  },
  errorTextSmall: { color: '#EF4444', fontSize: 13, marginBottom: 12, textAlign: 'center' },
  noCardsText: { textAlign: 'center', color: '#6B7280', marginVertical: 20, fontSize: 14 },

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
});