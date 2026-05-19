import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Modal,
  Platform,
  Animated,
  Dimensions,
  Linking,
} from 'react-native';
import RNFS from 'react-native-fs';
import {
  ArrowLeft,
  ChevronDown,
  FileText,
  Building2,
  BadgeCheck,
  Send,
  X,
  Check,
  Download,
} from 'lucide-react-native';
import FileViewer from 'react-native-file-viewer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import { getUserProfile, uploadFile } from '../services/authApi';
import DateTimePicker from '@react-native-community/datetimepicker';
import SignatureScreen from 'react-native-signature-canvas';
import axios from 'axios';
import { generatePDF as pdfConvert } from 'react-native-html-to-pdf';

const BASE_URL = 'https://apis.staffoo.com.au';
const BRAND = '#0A7C6E'; // Primary
const BRAND_DARK = '#111827';
const BRAND_LIGHT = '#F1F5F9';
const ACCENT = '#3B82F6';
const SUCCESS = '#10B981';
const ERROR = '#EF4444';
const GRAY_BG = '#F8FAFC';
const CARD_BG = '#FFFFFF';

type StaffTab = 'tfn' | 'super' | 'onboarding';

// ─────────────────────────────────────────────────────────────────────────────
// PDF HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const pdfStyles = `
  <style>
    *{box-sizing:border-box;margin:0;padding:0;font-family:Helvetica,Arial,sans-serif;}
    body{padding:0;background:#fff;color:#111;font-size:13px;}
    .header{background:#0A7C6E;padding:16px 32px;}
    .header-title{color:#fff;font-size:22px;font-weight:bold;}
    .header-sub{color:#CBD5E1;font-size:11px;margin-top:2px;}
    .body{padding:24px 32px;}
    h2{font-size:16px;font-weight:bold;color:#111;margin-bottom:8px;
       border-bottom:1px solid #ddd;padding-bottom:6px;}
    .section-title{font-size:10px;font-weight:700;color:#0284C7;
       text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;
       border-bottom:1px solid #e2f4fb;padding-bottom:4px;margin-top:16px;}
    .row{display:flex;gap:12px;margin-bottom:12px;}
    .field{flex:1;}
    .field label{display:block;font-size:9px;color:#666;margin-bottom:3px;}
    .field .value{background:#f5f5f5;border:1px solid #ccc;border-radius:5px;
       padding:6px 8px;font-size:12px;min-height:28px;word-break:break-all;}
    .checkbox-row{display:flex;align-items:center;gap:8px;margin-bottom:8px;font-size:12px;}
    .cb{width:13px;height:13px;border:1px solid #999;border-radius:3px;
        display:inline-block;background:#fff;flex-shrink:0;}
    .cb.on{background:#2EB1E2;border-color:#2EB1E2;}
    .sig-box{border:1px solid #ccc;border-radius:6px;height:70px;background:#fafafa;}
    .sig-img{height:65px;border:1px solid #ccc;border-radius:6px;
             background:#fafafa;max-width:280px;object-fit:contain;}
    table{width:100%;border-collapse:collapse;font-size:12px;margin-bottom:16px;}
    th,td{border:1px solid #e2eef6;padding:7px 10px;text-align:left;}
    th{background:#f1f7fc;font-size:10px;color:#64748b;font-weight:700;}
    .footer{margin-top:32px;padding-top:10px;border-top:1px solid #ddd;
            font-size:9px;color:#888;text-align:center;}
  </style>
`;

/** Renders a filled / empty checkbox span */
const cb = (checked: boolean) =>
  `<span class="cb${checked ? ' on' : ''}"></span>`;

/** Renders a labelled value field with optional flex override */
const field = (label: string, value: string, flex = 1) => `
  <div class="field" style="flex:${flex}">
    <label>${label}</label>
    <div class="value">${value || '—'}</div>
  </div>`;

/** Renders a signature: image if URL available, else empty box */
const sigHtml = (signature?: string) =>
  signature
    ? `<img src="${signature}" class="sig-img" />`
    : `<div class="sig-box"></div>`;

const FOOTER = `<div class="footer">STAFFOO · Capital Services Pty Ltd · ABN: 48 613 317 838</div>`;
type FormUrls = {
  tfn?: string;
  super_form?: string;
  onboarding?: string;
};
// ─────────────────────────────────────────────────────────────────────────────

const StaffFormsScreen = ({ navigation }: any) => {
  const [activeStaffTab, setActiveStaffTab] = useState<StaffTab>('tfn');
  const [userId, setUserId] = useState<number | string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const tabAnim = useRef(new Animated.Value(0)).current;

  // ── TFN Fields ──────────────────────────────────────────────────────────────
  const [tfnNumber, setTfnNumber] = useState('');
  const [tfnTitle, setTfnTitle] = useState('');
  const [tfnFirstName, setTfnFirstName] = useState('');
  const [tfnSurname, setTfnSurname] = useState('');
  const [tfnPrevName, setTfnPrevName] = useState('');
  const [tfnDob, setTfnDob] = useState('');
  const [tfnDobBackend, setTfnDobBackend] = useState('');
  const [tfnAddress, setTfnAddress] = useState('');
  const [basisOfPayment, setBasisOfPayment] = useState<string | null>(null);
  const [australianResident, setAustralianResident] = useState<string | null>(
    null,
  );
  const [claimTaxFree, setClaimTaxFree] = useState<string | null>(null);
  const [hasDebt, setHasDebt] = useState<string | null>(null);
  const [signatureTfn, setSignatureTfn] = useState('');
  const [dateTfn, setDateTfn] = useState('');
  const [dateTfnBackend, setDateTfnBackend] = useState('');

  // ── Super Fields ────────────────────────────────────────────────────────────
  const [superEmployeeNumber, setSuperEmployeeNumber] = useState('');
  const [fundChoice, setFundChoice] = useState<'own' | 'employer'>('employer');
  const [superFundName, setSuperFundName] = useState('');
  const [superFundAbn, setSuperFundAbn] = useState('');
  const [superFundUsi, setSuperFundUsi] = useState('');
  const [superMemberNumber, setSuperMemberNumber] = useState('');
  const [signatureSuper, setSignatureSuper] = useState('');
  const [dateSuper, setDateSuper] = useState('');
  const [dateSuperBackend, setDateSuperBackend] = useState('');

  const [formUrls, setFormUrls] = useState<FormUrls>({});
  // ── Onboarding Fields ───────────────────────────────────────────────────────
  const [onboardMobile, setOnboardMobile] = useState('');
  const [onboardEmail, setOnboardEmail] = useState('');
  const [passportNumber, setPassportNumber] = useState('');
  const [passportCountry, setPassportCountry] = useState('Australia');
  const [passportExpiry, setPassportExpiry] = useState('');
  const [workRights, setWorkRights] = useState<string | null>(null);
  const [idChecks, setIdChecks] = useState({
    primary_id: false,
    drivers_license: false,
    security_license: false,
    medicare_or_utility: false,
  });
  const [bankName, setBankName] = useState('');
  const [bsb, setBsb] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [securityLicence, setSecurityLicence] = useState('');
  const [securityExpiry, setSecurityExpiry] = useState('');
  const [firstAidNumber, setFirstAidNumber] = useState('');
  const [firstAidExpiry, setFirstAidExpiry] = useState('');
  const [signatureOnboard, setSignatureOnboard] = useState('');
  const [dateOnboard, setDateOnboard] = useState('');
  const [dateOnboardBackend, setDateOnboardBackend] = useState('');

  // ── UI State ────────────────────────────────────────────────────────────────
  const [showTitleModal, setShowTitleModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDateField, setSelectedDateField] = useState<string | null>(
    null,
  );
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [currentSignatureField, setCurrentSignatureField] = useState<
    'tfn' | 'super' | 'onboard' | null
  >(null);

  const titleOptions = ['Mr', 'Mrs', 'Miss', 'Ms', 'Dr'];
  const autoFullName = [tfnTitle, tfnFirstName, tfnSurname]
    .filter(Boolean)
    .join(' ');

  // ── Init ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      try {
        const storedUser = await AsyncStorage.getItem('user');
        if (storedUser) {
          const parsed = JSON.parse(storedUser);
          setUserId(parsed.id);
          const profileResponse = await getUserProfile(parsed.id);
          const profile = profileResponse?.data || {};
          if (profile.name) {
            const names = profile.name.trim().split(' ');
            setTfnFirstName(names[0] || '');
            setTfnSurname(names.slice(1).join(' ') || '');
          }
          if (profile.email) setOnboardEmail(profile.email);
          if (profile.phone) setOnboardMobile(profile.phone);
        }
      } catch (_) {
      } finally {
        setFetching(false);
      }
    };
    init();
  }, []);

  const switchTab = (tab: StaffTab) => {
    setActiveStaffTab(tab);
    Animated.spring(tabAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start(() => tabAnim.setValue(0));
  };

  const openDatePicker = (field: string) => {
    setSelectedDateField(field);
    setShowDatePicker(true);
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (!selectedDate || !selectedDateField) return;
    const dd = ('0' + selectedDate.getDate()).slice(-2);
    const mm = ('0' + (selectedDate.getMonth() + 1)).slice(-2);
    const yyyy = selectedDate.getFullYear();
    const display = `${dd}/${mm}/${yyyy}`;
    const backend = selectedDate.toISOString().split('T')[0];
    switch (selectedDateField) {
      case 'tfnDob':
        setTfnDob(display);
        setTfnDobBackend(backend);
        break;
      case 'dateTfn':
        setDateTfn(display);
        setDateTfnBackend(backend);
        break;
      case 'dateSuper':
        setDateSuper(display);
        setDateSuperBackend(backend);
        break;
      case 'dateOnboard':
        setDateOnboard(display);
        setDateOnboardBackend(backend);
        break;
      case 'passportExp':
        setPassportExpiry(display);
        break;
      case 'secExp':
        setSecurityExpiry(display);
        break;
      case 'faExp':
        setFirstAidExpiry(display);
        break;
    }
  };

  const openSignature = (f: 'tfn' | 'super' | 'onboard') => {
    setCurrentSignatureField(f);
    setShowSignatureModal(true);
  };

  useEffect(() => {
    const init = async () => {
      try {
        const storedUser = await AsyncStorage.getItem('user');
        if (storedUser) {
          const parsed = JSON.parse(storedUser);
          setUserId(parsed.id);

          const profileResponse = await getUserProfile(parsed.id);
          const profile = profileResponse?.data || {};

          if (profile.name) {
            const names = profile.name.trim().split(' ');
            setTfnFirstName(names[0] || '');
            setTfnSurname(names.slice(1).join(' ') || '');
          }
          if (profile.email) setOnboardEmail(profile.email);
          if (profile.phone) setOnboardMobile(profile.phone);

          // Fetch saved form data
          await fetchFormData(parsed.id);
        }
      } catch (e) {
        console.log(e);
      } finally {
        setFetching(false);
      }
    };
    init();
  }, []);

  // Refetch when tab changes (optional but useful)
  useEffect(() => {
    if (userId && activeStaffTab) {
      fetchFormData(userId);
    }
  }, [activeStaffTab, userId]);

  const getFormUrl = (tab: StaffTab | null): string | undefined => {
    if (!tab) return undefined;
    if (tab === 'super') return formUrls.super_form;
    return formUrls[tab as keyof FormUrls];
  };
  const fetchExistingForms = async (id: number | string) => {
    try {
      const token = await getToken();
      if (!token) return;
      const res = await axios.post(
        `${BASE_URL}/api/form-data`,
        { user_id: id, type: 'all' },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const data = res.data?.data || {};
      setFormUrls({
        tfn: data.tfn_form ? `${BASE_URL}/storage/${data.tfn_form}` : undefined,
        super_form: data.super_form
          ? `${BASE_URL}/storage/${data.super_form}`
          : undefined,
        onboarding: data.onboarding_form
          ? `${BASE_URL}/storage/${data.onboarding_form}`
          : undefined,
      });
    } catch (e) {
      console.log('Failed to fetch existing forms', e);
    }
  };

  const handleSaveSignature = async (signature: string) => {
    try {
      if (!signature || signature.length < 100) {
        Toast.show({ type: 'error', text1: 'Invalid signature' });
        return;
      }
      setLoading(true);
      const base64Data = signature.replace('data:image/png;base64,', '');
      const filePath = `${
        RNFS.CachesDirectoryPath
      }/signature_${Date.now()}.png`;
      await RNFS.writeFile(filePath, base64Data, 'base64');
      const file = {
        uri: Platform.OS === 'ios' ? `file://${filePath}` : filePath,
        type: 'image/png',
        name: `signature_${Date.now()}.png`,
      };
      const uploadResponse = await uploadFile(file);
      const uploadedSignature =
        uploadResponse?.url || uploadResponse?.file || uploadResponse?.path;
      if (!uploadedSignature) throw new Error('Signature upload failed');
      if (currentSignatureField === 'tfn') setSignatureTfn(uploadedSignature);
      if (currentSignatureField === 'super')
        setSignatureSuper(uploadedSignature);
      if (currentSignatureField === 'onboard')
        setSignatureOnboard(uploadedSignature);
      setShowSignatureModal(false);
      Toast.show({
        type: 'success',
        text1: '✓ Signature uploaded successfully',
      });
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Upload failed',
        text2: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const getToken = async () =>
    (await AsyncStorage.getItem('@auth_token')) ||
    (await AsyncStorage.getItem('auth_token')) ||
    (await AsyncStorage.getItem('@token'));

  // ═══════════════════════════════════════════════════════════════════════════
  // PDF GENERATORS  (react-native-html-to-pdf)
  // ═══════════════════════════════════════════════════════════════════════════

  const generateTfnPdf = async (data: Record<string, any>): Promise<string> => {
    const formatDate = (dateStr?: string): string => {
      if (!dateStr) return '__ / __ / 2026';
      try {
        const date = new Date(dateStr);
        const dd = ('0' + date.getDate()).slice(-2);
        const mm = ('0' + (date.getMonth() + 1)).slice(-2);
        const yyyy = date.getFullYear();
        return `${dd} / ${mm} / ${yyyy}`;
      } catch {
        return '__ / __ / 2026';
      }
    };

    // Improved check function - handles 0, 1, "0", "1", "yes", "no", true, false
    const check = (value: any, expectedYes: boolean = true): string => {
      if (value === undefined || value === null) return '☐';

      const val = String(value).toLowerCase().trim();

      if (expectedYes) {
        return val === '1' || val === 'yes' || val === 'true' || val === 'on'
          ? '☑'
          : '☐';
      } else {
        return val === '0' || val === 'no' || val === 'false' || val === 'off'
          ? '☑'
          : '☐';
      }
    };

    const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  @page { margin: 0; size: A4; }
  body {
    margin: 0; padding: 0;
    font-family: Helvetica, Arial, sans-serif;
    color: #222;
    background: #fff;
    -webkit-print-color-adjust: exact !important;
  }
  .header {
    background-color: #06264d !important;
    color: #ffffff !important;
    text-align: center;
    padding: 22px 20px 18px;
  }
  .header-title { font-size: 30px; font-weight: bold; }
  .header-sub { font-size: 11px; }
  .content { padding: 25px 30px; }
  .title { color: #1d4ed8; font-size: 24px; font-weight: bold; margin-bottom: 8px; }
  .title-line { height: 3px; background: #2563eb; margin-bottom: 20px; }
  .form-box { border: 1px solid #d5d5d5; }
  .section { border-bottom: 1px solid #ddd; padding: 14px 16px; }
  .label { font-size: 11px; font-weight: bold; margin-bottom: 6px; color: #333; }
  .field { min-height: 20px; border-bottom: 1px solid #888; font-size: 13px; padding: 2px 0; }
  .checkbox-line { font-size: 12px; margin: 6px 0; }
</style>
</head>
<body>
<div class="header">
  <div class="header-title">STAFFOO</div>
  <div class="header-sub">Capital Services Pty Ltd | ABN: 48 613 317 838</div>
</div>

<div class="content">
  <div class="title">Tax File Number (TFN) Declaration</div>
  <div class="title-line"></div>

  <div class="form-box">

    <div class="section">
      <div class="label">1. Tax file number (TFN)</div>
      <div class="field">${data.tfn || '—'}</div>
    </div>

    <div class="section">
      <div class="label">2. Name</div>
      <div style="display:flex; gap:15px;">
        <div style="flex:0.6"><small>Title:</small><div class="field">${
          data.title || ''
        }</div></div>
        <div style="flex:1"><small>First Name:</small><div class="field">${
          data.first_name || ''
        }</div></div>
        <div style="flex:1"><small>Surname:</small><div class="field">${
          data.surname || ''
        }</div></div>
      </div>
    </div>

    <div class="section">
      <div class="label">3. Previous name (if applicable)</div>
      <div class="field">${data.previous_name || '—'}</div>
    </div>

    <div class="section">
      <div class="label">4. Date of birth</div>
      <div class="field">${data.dob || '—'}</div>
    </div>

    <div class="section">
      <div class="label">5. Residential address</div>
      <div class="field" style="min-height:45px;">${data.address || '—'}</div>
    </div>

    <div class="section">
      <div class="label">6. Basis of payment</div>
      <div class="checkbox-line">
        ${check(
          data.basis_of_payment === 'full-time',
        )} Full-time &nbsp;&nbsp;&nbsp;
        ${check(
          data.basis_of_payment === 'part-time',
        )} Part-time &nbsp;&nbsp;&nbsp;
        ${check(data.basis_of_payment === 'casual')} Casual
      </div>
    </div>

    <div class="section">
      <div class="label">7. Are you an Australian resident for tax purposes?</div>
      <div class="checkbox-line">
        ${check(data.australian_resident)} Yes &nbsp;&nbsp;&nbsp;
        ${check(data.australian_resident, false)} No
      </div>
    </div>

    <div class="section">
      <div class="label">8. Do you want to claim the tax-free threshold?</div>
      <div class="checkbox-line">
        ${check(data.claim_threshold)} Yes &nbsp;&nbsp;&nbsp;
        ${check(data.claim_threshold, false)} No
      </div>
    </div>

    <div class="section">
      <div class="label">9. Do you have a HELP, VSL, FS, SSL or TSL debt?</div>
      <div class="checkbox-line">
        ${check(data.help_debt)} Yes &nbsp;&nbsp;&nbsp;
        ${check(data.help_debt, false)} No
      </div>
    </div>

  </div>

  <!-- Signature -->
  <div style="margin-top:50px;">
    ${
      data.signature
        ? `<img src="${data.signature}" style="max-height:90px; max-width:320px; object-fit:contain;" />`
        : '<div style="border-bottom:2px solid #333; width:280px; height:70px;"></div>'
    }
    <div style="font-weight:bold; margin-top:8px;">Employee Signature</div>
    <div>Date: ${formatDate(data.signed_date || data.date)}</div>
  </div>
</div>
</body>
</html>`;

    const result = await pdfConvert({
      html,
      fileName: `TFN_Declaration_${Date.now()}`,
      directory: 'Cache',
      base64: false,
      width: 595,
      height: 842,
    });

    if (!result?.filePath) throw new Error('PDF generation failed');
    return result.filePath;
  };
  const generateSuperPdf = async (
    data: Record<string, any>,
  ): Promise<string> => {
    const formatDate = (dateStr?: string): string => {
      if (!dateStr) return '__ / __ / 2026';

      try {
        const date = new Date(dateStr);
        const dd = ('0' + date.getDate()).slice(-2);
        const mm = ('0' + (date.getMonth() + 1)).slice(-2);
        const yyyy = date.getFullYear();
        return `${dd} / ${mm} / ${yyyy}`;
      } catch {
        return '__ / __ / 2026';
      }
    };

    const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />

<style>
  @page {
    size: A4;
    margin: 0;
  }

  html, body {
    margin: 0;
    padding: 0;
    font-family: Helvetica, Arial, sans-serif;
    background: #fff;

    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
     .header {
  background-color: #06264d !important;
  color: #ffffff !important;
  text-align: center;
  padding: 22px 20px 18px;
}


  body {
    margin: 0;
    padding: 0;
    font-family: Helvetica, Arial, sans-serif;
    color: #222;
    background: #fff;
  }

  .page {
    width: 100%;
    padding: 0;
  }


  .header-title {
    font-size: 30px;
    font-weight: bold;
    letter-spacing: 1px;
    margin-bottom: 5px;
  }

  .header-sub {
    font-size: 11px;
    opacity: 0.95;
  }

  /* BODY */
  .content {
    padding: 22px 28px 30px;
  }

  .title {
    color: #2563eb;
    font-size: 17px;
    font-weight: bold;
    margin-bottom: 6px;
  }

  .title-line {
    height: 2px;
    background: #3b82f6;
    margin-bottom: 12px;
  }

  /* FORM */
  .form-box {
    border: 1px solid #d7d7d7;
  }

  .section {
    border-bottom: 1px solid #dcdcdc;
    padding: 10px 12px;
  }

  .section:last-child {
    border-bottom: none;
  }

  .label {
    font-size: 10px;
    font-weight: bold;
    margin-bottom: 5px;
    color: #222;
  }

  .field {
    border-bottom: 1px solid #888;
    min-height: 16px;
    font-size: 11px;
    padding-bottom: 2px;
    word-wrap: break-word;
  }

  .row {
    display: flex;
    gap: 12px;
  }

  .col {
    flex: 1;
  }

  .checkbox-line {
    font-size: 10px;
    margin-top: 4px;
    line-height: 1.7;
  }

  /* EMPLOYER BOX */
  .employer-box {
    border: 1px solid #dcdcdc;
    padding: 10px 12px;
    margin-top: 10px;
  }

  .employer-title {
    font-size: 10px;
    font-weight: bold;
    margin-bottom: 6px;
  }

  .small {
    font-size: 9px;
    line-height: 1.5;
  }

  /* SIGNATURE */
  .signature-area {
    margin-top: 18px;
  }

  .signature-line {
    width: 180px;
    height: 32px;
    border-bottom: 1px solid #666;
    position: relative;
  }

  .signature-img {
    position: absolute;
    width: 100%;
    height: 100%;
    object-fit: contain;
    left: 0;
    top: 0;
  }

  .signature-label {
    font-size: 9px;
    font-weight: bold;
    margin-top: 4px;
  }

  .date {
    font-size: 9px;
    margin-top: 2px;
  }
</style>
</head>

<body>

<div class="page">

  <!-- HEADER -->
  <div class="header">
    <div class="header-title">STAFFOO</div>

    <div class="header-sub">
      Capital Services Pty Ltd | ABN: 48 613 317 838
    </div>
  </div>

  <!-- CONTENT -->
  <div class="content">

    <div class="title">
      Superannuation Standard Choice Form
    </div>

    <div class="title-line"></div>

    <!-- FORM -->
    <div class="form-box">

      <!-- EMPLOYEE -->
      <div class="section">

        <div class="label">
          Employee Details
        </div>

        <div style="margin-bottom:10px;">
          <div class="small">Name:</div>
          <div class="field">${data.full_name || ''}</div>
        </div>

        <div>
          <div class="small">Employee Number (if known):</div>
          <div class="field">${data.employee_number || ''}</div>
        </div>

      </div>

      <!-- FUND -->
      <div class="section">

        <div class="label">
          Choice of Fund
        </div>

        <div class="checkbox-line">
          ${
            data.fund_choice === 'own' ? '☑' : '☐'
          } 1. I nominate my own individual fund:
        </div>

        <div style="margin-top:8px;">
          <div class="small">Fund Name:</div>
          <div class="field">${data.fund_name || ''}</div>
        </div>

        <div style="margin-top:8px;">
          <div class="small">Fund ABN:</div>
          <div class="field">${data.fund_abn || ''}</div>
        </div>

        <div style="margin-top:8px;">
          <div class="small">Fund USI:</div>
          <div class="field">${data.fund_usi || ''}</div>
        </div>

        <div style="margin-top:8px;">
          <div class="small">Member Account Number:</div>
          <div class="field">${data.member_account || ''}</div>
        </div>

        <div class="checkbox-line" style="margin-top:16px;">
          ${
            data.fund_choice === 'employer' ? '☑' : '☐'
          } 2. Employer-nominated fund (default)
        </div>

      </div>

    </div>

    <!-- EMPLOYER -->
    <div class="employer-box">

      <div class="employer-title">
        Employer Details (Pre-filled)
      </div>

      <div class="small">
        Employer Name: Capital Services Pty Ltd
      </div>

      <div class="small">
        ABN: 48 613 317 838
      </div>

      <div class="small">
        Address: 21 Tigriswood Blvd, Truganina VIC 3029
      </div>

    </div>

    <!-- SIGNATURE -->
    <div class="signature-area">

      <div class="signature-line">
        ${
          data.signature
            ? `<img src="${data.signature}" class="signature-img" />`
            : ''
        }
      </div>

      <div class="signature-label">
        Employee Signature
      </div>

      <div class="date">
         Date: ${formatDate(data.signed_date || data.date)}
      </div>

    </div>
 
  </div>

</div>

</body>
</html>
`;

    const result = await pdfConvert({
      html,
      fileName: `superannuation_${Date.now()}`,
      directory: 'Cache',
      base64: false,
    });
    if (!result.filePath) throw new Error('Super PDF generation failed');
    return result.filePath;
  };

  const generateOnboardingPdf = async (
    data: Record<string, any>,
  ): Promise<string> => {
    const idRows = [
      {
        label: 'Birth cert / Passport / Citizenship',
        pts: 70,
        key: 'primary_id',
      },
      {
        label: "Driver's licence / Govt photo ID",
        pts: 40,
        key: 'drivers_license',
      },
      {
        label: 'Security licence (mandatory)',
        pts: 40,
        key: 'security_license',
      },
      {
        label: 'Medicare / Utility bill / Bank stmt',
        pts: 25,
        key: 'medicare_or_utility',
      },
    ] as { label: string; pts: number; key: keyof typeof idChecks }[];
    const formatDate = (dateStr?: string): string => {
      if (!dateStr) return '__ / __ / 2026';

      try {
        const date = new Date(dateStr);
        const dd = ('0' + date.getDate()).slice(-2);
        const mm = ('0' + (date.getMonth() + 1)).slice(-2);
        const yyyy = date.getFullYear();
        return `${dd} / ${mm} / ${yyyy}`;
      } catch {
        return '__ / __ / 2026';
      }
    };
    const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />

<style>

@page {
  size: A4;
  margin: 0;
}

html, body {
  margin: 0;
  padding: 0;
  background: #fff;
  font-family: Helvetica, Arial, sans-serif;

  -webkit-print-color-adjust: exact !important;
  print-color-adjust: exact !important;
}

 body {
    margin: 0;
    padding: 0;
    font-family: Helvetica, Arial, sans-serif;
    color: #222;
    background: #fff;
  }

  .page {
    width: 100%;
    padding: 0;
  }

 
/* HEADER */

    .header {
  background-color: #06264d !important;
  color: #ffffff !important;
  text-align: center;
  padding: 22px 20px 18px;
}

.header-left {
  font-size: 24px;
  font-weight: bold;
  letter-spacing: 1px;
}

.header-right {
  text-align: right;
  font-size: 8px;
  line-height: 1.4;
}

/* CONTENT */

.content {
  padding: 10px 18px 14px;
}

.title {
  text-align: center;
  color: #1d4ed8;
  font-size: 16px;
  font-weight: bold;
  margin-bottom: 8px;
}

.notice {
  border: 1px dashed #2563eb;
  background: #eef4ff;
  color: #1e3a8a;
  font-size: 8px;
  text-align: center;
  padding: 5px;
  margin-bottom: 10px;
  font-weight: bold;
}

/* SECTIONS */

.section-title {
  background: #f1f5ff;
  color: #1d4ed8;
  font-size: 10px;
  font-weight: bold;
  padding: 4px 6px;
  margin-top: 8px;
  border-left: 3px solid #2563eb;
}

.row {
  display: flex;
  gap: 10px;
  margin-top: 4px;
}

.field {
  flex: 1;
}

.field-label {
  font-size: 8px;
  font-weight: bold;
  margin-bottom: 2px;
  color: #333;
}

.field-input {
  border: 1px solid #d8d8d8;
  min-height: 16px;
  padding: 2px 4px;
  font-size: 9px;
  background: #fff;
  box-sizing: border-box;
}

.checkbox-line {
  font-size: 8px;
  margin-top: 4px;
  line-height: 1.6;
}

/* TABLE */

table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 5px;
}

th {
  background: #f3f4f6;
  font-size: 8px;
  padding: 4px;
  border: 1px solid #dcdcdc;
  text-align: left;
}

td {
  border: 1px solid #e2e2e2;
  padding: 4px;
  font-size: 8px;
}

/* DECLARATION */

.declaration {
  margin-top: 10px;
  border: 1px solid #f2c46d;
  background: #fff8ea;
  padding: 6px;
  font-size: 7px;
  line-height: 1.5;
  color: #444;
}

/* SIGNATURE */

.signature-row {
  display: flex;
  justify-content: space-between;
  margin-top: 10px;
}

.signature-box {
  width: 220px;
}

.signature-line {
  border-bottom: 1px solid #666;
  height: 28px;
  position: relative;
}

.signature-img {
  position: absolute;
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.signature-label {
  font-size: 8px;
  font-weight: bold;
  margin-top: 3px;
}

.date-box {
  width: 120px;
}

.footer {
  margin-top: 10px;
  text-align: center;
  font-size: 7px;
  color: #888;
}

</style>
</head>

<body>

<div class="page">

  <!-- HEADER -->
  <div class="header">

    <div class="header-left">
      STAFFOO
    </div>

    <div class="header-right">
      Capital Services Pty Ltd<br/>
      ABN: 48 613 317 838<br/>
      21 Tigriswood Blvd, Truganina VIC 3029<br/>
      admin@staffoo.com.au
    </div>

  </div>

  <!-- CONTENT -->
  <div class="content">

    <div class="title">
      EMPLOYEE ONBOARDING & ID VERIFICATION FORM
    </div>

    <div class="notice">
      MANDATORY: ATTACH CLEAR COPIES OF ALL DOCUMENTS
      (PASSPORT, LICENSE, ID) WITH THIS FORM.
    </div>

    <!-- PERSONAL -->
    <div class="section-title">
      1. PERSONAL CONTACT DETAILS
    </div>

    <div class="row">
      <div class="field">
        <div class="field-label">Full Name (as per ID):</div>
        <div class="field-input">${data.full_name || ''}</div>
      </div>

      <div class="field">
        <div class="field-label">Date of Birth:</div>
        <div class="field-input">${data.dob || ''}</div>
      </div>
    </div>

    <div class="row">
      <div class="field">
        <div class="field-label">Residential Address:</div>
        <div class="field-input">${data.address || ''}</div>
      </div>
    </div>

    <div class="row">
      <div class="field">
        <div class="field-label">Mobile Phone Number:</div>
        <div class="field-input">${data.mobile || ''}</div>
      </div>

      <div class="field">
        <div class="field-label">Personal Email Address:</div>
        <div class="field-input">${data.email || ''}</div>
      </div>
    </div>

    <!-- PASSPORT -->
    <div class="section-title">
      2. PASSPORT & WORK RIGHTS
    </div>

    <div class="row">
      <div class="field">
        <div class="field-label">Passport Number:</div>
        <div class="field-input">${data.passport_number || ''}</div>
      </div>

      <div class="field">
        <div class="field-label">Country of Issue:</div>
        <div class="field-input">${data.passport_country || ''}</div>
      </div>

      <div class="field">
        <div class="field-label">Passport Expiry Date:</div>
        <div class="field-input">${data.passport_expiry || ''}</div>
      </div>
    </div>

    <div class="checkbox-line">
      Work Rights Status:
      ${data.work_rights === 'citizen_pr' ? '[✓]' : '[ ]'} Australian Citizen/PR
      ${
        data.work_rights === 'student_visa' ? '[✓]' : '[ ]'
      } Student Visa (24hr Cap)
      ${data.work_rights === 'other_visa' ? '[✓]' : '[ ]'} Other Visa: ________
    </div>

    <!-- ID CHECK -->
    <div class="section-title">
      3. 100-POINT IDENTIFICATION CHECK
    </div>

    <table>
      <tr>
        <th>Document Type</th>
        <th style="width:60px;">Points</th>
        <th style="width:70px;">Tick Attached</th>
      </tr>

      ${idRows
        .map(
          r => `
      <tr>
        <td>${r.label}</td>
        <td>${r.pts}</td>
        <td style="text-align:center;">
          ${data.id_checks?.[r.key] ? '[✓]' : '[ ]'}
        </td>
      </tr>
      `,
        )
        .join('')}

    </table>

    <!-- BANK -->
    <div class="section-title">
      4. BANKING, TAX & SUPERANNUATION
    </div>

    <div class="row">
      <div class="field">
        <div class="field-label">Bank Name:</div>
        <div class="field-input">${data.bank_name || ''}</div>
      </div>

      <div class="field">
        <div class="field-label">BSB Number:</div>
        <div class="field-input">${data.bsb || ''}</div>
      </div>

      <div class="field">
        <div class="field-label">Account Number:</div>
        <div class="field-input">${data.account_number || ''}</div>
      </div>
    </div>

    <div class="row">
      <div class="field">
        <div class="field-label">Tax File Number (TFN):</div>
        <div class="field-input">${data.tfn || ''}</div>
      </div>

      <div class="field">
        <div class="field-label">Superannuation Fund Name:</div>
        <div class="field-input">${data.super_fund || ''}</div>
      </div>
    </div>

    <div class="row">
      <div class="field">
        <div class="field-label">Super Fund USI / Member Number:</div>
        <div class="field-input">
          ${data.super_usi || ''} ${data.super_member || ''}
        </div>
      </div>
    </div>

    <!-- LICENSE -->
    <div class="section-title">
      5. PROFESSIONAL LICENSING
    </div>

    <div class="row">
      <div class="field">
        <div class="field-label">Security License No:</div>
        <div class="field-input">${data.security_license || ''}</div>
      </div>

      <div class="field">
        <div class="field-label">Security License Expiry:</div>
        <div class="field-input">${data.security_license_expiry || ''}</div>
      </div>
    </div>

    <div class="row">
      <div class="field">
        <div class="field-label">First Aid Certificate No:</div>
        <div class="field-input">${data.first_aid_cert || ''}</div>
      </div>

      <div class="field">
        <div class="field-label">First Aid Expiry:</div>
        <div class="field-input">${data.first_aid_expiry || ''}</div>
      </div>
    </div>

    <!-- DECLARATION -->
    <div class="declaration">
      <strong>DECLARATION:</strong>
      I confirm that all information and attached documents are authentic.
      I agree to the Staffoo App Handshake Protocol for shift verification
      and, if a student, will strictly adhere to the 24-hour weekly cap.
    </div>

    <!-- SIGNATURE -->
    <div class="signature-row">

      <div class="signature-box">

        <div class="signature-line">
          ${
            data.signature
              ? `<img src="${data.signature}" class="signature-img" />`
              : ''
          }
        </div>

        <div class="signature-label">
          Signature:
        </div>

      </div>

      <div class="date-box">

        <div class="signature-line"></div>

        <div class="signature-label">
           Date: ${formatDate(data.signed_date || data.date)}
        </div>

      </div>

    </div>

    <!-- FOOTER -->
    <div class="footer">
      Staffoo is a brand of Capital Services Pty Ltd.
      ABN: 48 613 317 838. Truganina, VIC 3029.
    </div>

  </div>

</div>

</body>
</html>
`;

    const result = await pdfConvert({
      html,
      fileName: `onboarding_${Date.now()}`,
      directory: 'Cache',
      base64: false,
    });
    if (!result.filePath) throw new Error('Onboarding PDF generation failed');
    return result.filePath;
  };
  const generateUploadAndOpenPdf = async (
    pdfType: 'tfn' | 'super_form' | 'onboarding',
  ) => {
    try {
      setLoading(true);
      const token = await getToken();
      if (!token) throw new Error('Auth token not found');

      console.log(`[PDF] Starting ${pdfType} process...`);

      const apiType = pdfType === 'super_form' ? 'superannuation' : pdfType;
      const formRes = await axios.post(
        `${BASE_URL}/api/form-data`,
        { user_id: userId, type: apiType },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      const formData = formRes.data?.data || formRes.data || {};

      let pdfFilePath = '';
      if (pdfType === 'tfn') {
        pdfFilePath = await generateTfnPdf(formData);
      } else if (pdfType === 'super_form') {
        pdfFilePath = await generateSuperPdf(formData);
      } else {
        pdfFilePath = await generateOnboardingPdf(formData);
      }

      console.log(`[PDF] PDF generated: ${pdfFilePath}`);

      const form = new FormData();
      form.append('user_id', String(userId));
      form.append('type', pdfType);
      form.append('folder', 'staff_documents');

      const fileName = `${pdfType}_${Date.now()}.pdf`;
      const fileUri = Platform.select({
        ios: pdfFilePath.replace(/^file:\/\//, ''),
        android: pdfFilePath,
        default: pdfFilePath,
      });

      form.append('file', {
        uri: fileUri,
        type: 'application/pdf',
        name: fileName,
      } as any);

      console.log('[PDF] Uploading file', { fileName, fileUri, pdfType });

      const uploadRes = await axios.post(
        `${BASE_URL}/api/upload-staff-file`,
        form,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
            Accept: 'application/json',
          },
          timeout: 60000,
        },
      );

      console.log(`[PDF] Upload Response:`, uploadRes.data);

      // === IMPORTANT: Update formUrls with returned URL ===
      if (uploadRes.data?.success && uploadRes.data?.url) {
        setFormUrls(prev => ({
          ...prev,
          [pdfType === 'super_form' ? 'super_form' : pdfType]:
            uploadRes.data.url,
        }));
      }

      Toast.show({
        type: 'success',
        text1: '✅ PDF Generated & Uploaded Successfully',
      });

      await FileViewer.open(pdfFilePath, { showOpenWithDialog: true });
    } catch (error: any) {
      console.error('=== FULL PDF ERROR ===', error?.response?.data || error);
      Toast.show({
        type: 'error',
        text1: 'PDF Upload Failed',
        text2:
          error?.response?.data?.message || error.message || 'Check console',
      });
    } finally {
      setLoading(false);
    }
  };
  // ═══════════════════════════════════════════════════════════════════════════
  // SAVE
  // ═══════════════════════════════════════════════════════════════════════════

  const openPdf = async (url?: string) => {
    if (!url) return;
    try {
      if (Platform.OS === 'ios') {
        await Linking.openURL(url);
      } else {
        await FileViewer.open(url);
      }
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Cannot open PDF' });
    }
  };

  const fetchFormData = async (id: number | string) => {
    if (!id) return;

    try {
      const token = await getToken();
      if (!token) return;

      const types = ['tfn', 'superannuation', 'onboarding'];

      for (const type of types) {
        const res = await axios.get(`${BASE_URL}/api/form-data`, {
          params: { user_id: id, type },
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = res.data?.data || res.data || {};

        if (type === 'tfn' && data.tfn) {
          setTfnNumber(data.tfn || '');
          setTfnTitle(data.title || '');
          setTfnFirstName(data.first_name || '');
          setTfnSurname(data.surname || '');
          setTfnPrevName(data.previous_name || '');
          setTfnAddress(data.address || '');
          setBasisOfPayment(data.basis_of_payment || null);

          // ✅ FIXED: Convert 0/1 to 'yes'/'no'
          setAustralianResident(convertToYesNo(data.australian_resident));
          setClaimTaxFree(convertToYesNo(data.claim_threshold));
          setHasDebt(convertToYesNo(data.help_debt));

          setSignatureTfn(data.signature || '');

          // DOB
          if (data.dob) {
            const d = new Date(data.dob);
            setTfnDob(
              `${('0' + d.getDate()).slice(-2)}/${(
                '0' +
                (d.getMonth() + 1)
              ).slice(-2)}/${d.getFullYear()}`,
            );
            setTfnDobBackend(data.dob);
          }

          // Signed Date
          if (data.signed_date) {
            const d = new Date(data.signed_date);
            setDateTfn(
              `${('0' + d.getDate()).slice(-2)}/${(
                '0' +
                (d.getMonth() + 1)
              ).slice(-2)}/${d.getFullYear()}`,
            );
            setDateTfnBackend(data.signed_date);
          }
        }

        if (type === 'superannuation' && data.full_name) {
          setSuperEmployeeNumber(data.employee_number || '');
          setFundChoice(data.fund_choice || 'employer');
          setSuperFundName(data.fund_name || '');
          setSuperFundAbn(data.fund_abn || '');
          setSuperFundUsi(data.fund_usi || '');
          setSuperMemberNumber(data.member_account || '');
          setSignatureSuper(data.signature || '');
          if (data.signed_date) {
            const d = new Date(data.signed_date);
            setDateSuper(
              `${('0' + d.getDate()).slice(-2)}/${(
                '0' +
                (d.getMonth() + 1)
              ).slice(-2)}/${d.getFullYear()}`,
            );
            setDateSuperBackend(data.signed_date);
          }
        }

        if (type === 'onboarding' && data.full_name) {
          setOnboardMobile(data.mobile || '');
          setOnboardEmail(data.email || '');
          setPassportNumber(data.passport_number || '');
          setPassportCountry(data.passport_country || 'Australia');
          setPassportExpiry(data.passport_expiry || '');
          setWorkRights(data.work_rights || null);
          setBankName(data.bank_name || '');
          setBsb(data.bsb || '');
          setAccountNumber(data.account_number || '');
          setSecurityLicence(data.security_license || '');
          setSecurityExpiry(data.security_license_expiry || '');
          setFirstAidNumber(data.first_aid_cert || '');
          setFirstAidExpiry(data.first_aid_expiry || '');
          setSignatureOnboard(data.signature || '');

          if (data.id_checks) {
            setIdChecks({
              primary_id: !!data.id_checks.primary_id,
              drivers_license: !!data.id_checks.drivers_license,
              security_license: !!data.id_checks.security_license,
              medicare_or_utility: !!data.id_checks.medicare_or_utility,
            });
          }

          if (data.signed_date) {
            const d = new Date(data.signed_date);
            setDateOnboard(
              `${('0' + d.getDate()).slice(-2)}/${(
                '0' +
                (d.getMonth() + 1)
              ).slice(-2)}/${d.getFullYear()}`,
            );
            setDateOnboardBackend(data.signed_date);
          }
        }

        // Store PDF URLs
        setFormUrls(prev => ({
          ...prev,
          [type === 'superannuation' ? 'super_form' : type]:
            data.form_url || data.url || undefined,
        }));
      }
    } catch (err) {
      console.log('Failed to fetch form data:', err);
      // Toast optional: Toast.show({ type: 'info', text1: 'No previous data found' });
    }
  };

  const convertToYesNo = (value: any): string | null => {
    if (value === 1 || value === '1' || value === true) return 'yes';
    if (value === 0 || value === '0' || value === false) return 'no';
    return null;
  };

  const handleSave = async () => {
    if (!userId || !activeStaffTab) return;
    setLoading(true);
    try {
      const token = await getToken();
      const headers = { Authorization: `Bearer ${token}` };

      if (activeStaffTab === 'tfn') {
        await axios.post(
          `${BASE_URL}/api/tfn-declaration`,
          {
            tfn: tfnNumber,
            title: tfnTitle,
            first_name: tfnFirstName,
            surname: tfnSurname,
            previous_name: tfnPrevName,
            dob: tfnDobBackend,
            address: tfnAddress,
            basis_of_payment: basisOfPayment,

            // ✅ Send as strings "yes" / "no"
            australian_resident: yesNoToString(australianResident),
            claim_threshold: yesNoToString(claimTaxFree),
            help_debt: yesNoToString(hasDebt),

            signature: signatureTfn,
            date: dateTfnBackend,
            user_id: userId,
          },
          { headers },
        );

        await generateUploadAndOpenPdf('tfn');
        Toast.show({ type: 'success', text1: '✓ TFN Declaration saved!' });
      } else if (activeStaffTab === 'super') {
        await axios.post(
          `${BASE_URL}/api/superannuation`,
          {
            full_name: autoFullName,
            employee_number: superEmployeeNumber,
            fund_choice: fundChoice,
            fund_name: fundChoice === 'own' ? superFundName : '',
            fund_abn: fundChoice === 'own' ? superFundAbn : '',
            fund_usi: fundChoice === 'own' ? superFundUsi : '',
            member_account: fundChoice === 'own' ? superMemberNumber : '',
            signature: signatureSuper,
            date: dateSuperBackend,
            user_id: userId,
          },
          { headers },
        );
        await generateUploadAndOpenPdf('super_form');
        Toast.show({ type: 'success', text1: '✓ Superannuation saved!' });
      } else if (activeStaffTab === 'onboarding') {
        await axios.post(
          `${BASE_URL}/api/onboarding`,
          {
            full_name: autoFullName,
            dob: tfnDobBackend,
            address: tfnAddress,
            mobile: onboardMobile,
            email: onboardEmail,
            passport_number: passportNumber,
            passport_country: passportCountry,
            passport_expiry: passportExpiry,
            work_rights: workRights,
            id_checks: idChecks,
            bank_name: bankName,
            bsb,
            account_number: accountNumber,
            tfn: tfnNumber,
            super_fund: superFundName,
            super_usi: superFundUsi,
            super_member: superMemberNumber,
            security_license: securityLicence,
            security_license_expiry: securityExpiry,
            first_aid_cert: firstAidNumber,
            first_aid_expiry: firstAidExpiry,
            signature: signatureOnboard,
            date: dateOnboardBackend,
            user_id: userId,
          },
          { headers },
        );
        await generateUploadAndOpenPdf('onboarding');
        Toast.show({ type: 'success', text1: '✓ Onboarding form saved!' });
      }
      Toast.show({
        type: 'success',
        text1: `✓ ${activeStaffTab.toUpperCase()} saved!`,
      });
      await fetchExistingForms(userId);
    } catch (err: any) {
      Toast.show({
        type: 'error',
        text1: 'Save failed',
        text2: err?.response?.data?.message || 'Please try again',
      });
    } finally {
      setLoading(false);
    }
  };

  // Add this function after your other helpers
  const isFormComplete = (tab: StaffTab): boolean => {
    if (tab === 'tfn') {
      return !!(
        tfnNumber &&
        tfnTitle &&
        tfnFirstName &&
        tfnSurname &&
        tfnDobBackend &&
        tfnAddress &&
        basisOfPayment &&
        australianResident &&
        claimTaxFree !== null &&
        hasDebt !== null &&
        signatureTfn
      );
    }

    if (tab === 'super') {
      return !!(
        autoFullName &&
        signatureSuper &&
        (fundChoice === 'employer' ||
          (fundChoice === 'own' && superFundName && superFundUsi))
      );
    }

    if (tab === 'onboarding') {
      return !!(
        autoFullName &&
        tfnDobBackend &&
        tfnAddress &&
        onboardMobile &&
        onboardEmail &&
        passportNumber &&
        passportExpiry &&
        workRights &&
        signatureOnboard &&
        bankName &&
        bsb &&
        accountNumber
      );
    }

    return false;
  };

  const yesNoToString = (value: string | null): string | null => {
    if (value === 'yes') return 'yes';
    if (value === 'no') return 'no';
    return null;
  };
  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  if (fetching) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.loadingWrap}>
          <ActivityIndicator size="large" color={BRAND} />
          <Text style={s.loadingText}>Loading your profile…</Text>
        </View>
      </SafeAreaView>
    );
  }

  const tabs: { key: StaffTab; label: string; Icon: any }[] = [
    { key: 'tfn', label: 'TFN Declaration', Icon: FileText },
    { key: 'super', label: 'Superannuation', Icon: Building2 },
    { key: 'onboarding', label: 'Employee Onboarding', Icon: BadgeCheck },
  ];

  return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8faff" />

      {/* ── Header ── */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <ArrowLeft size={22} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Staff Onboarding Forms</Text>
        </View>
      </View>

      {/* ── Tab Bar ── */}
      <View style={s.tabBar}>
        {[
          { key: 'tfn', label: 'TFN Declaration', Icon: FileText },
          { key: 'super', label: 'Superannuation', Icon: Building2 },
          { key: 'onboarding', label: 'Onboarding', Icon: BadgeCheck },
        ].map(tab => {
          const active = activeStaffTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[s.tabBtn, active && s.tabBtnActive]}
              onPress={() => setActiveStaffTab(tab.key as StaffTab)}
            >
              <tab.Icon size={18} color={active ? '#fff' : '#94A3B8'} />
              <Text style={[s.tabLabel, active && s.tabLabelActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ═══════════ TFN TAB ═══════════ */}
        {activeStaffTab === 'tfn' && (
          <View style={s.card}>
            <SectionLabel>Tax File Number</SectionLabel>
            <Field label="TFN">
              <StyledInput
                value={tfnNumber}
                onChangeText={setTfnNumber}
                placeholder="000 000 000"
                keyboardType="numeric"
                maxLength={11}
              />
            </Field>

            <SectionLabel>Personal Details</SectionLabel>
            <View style={s.row3}>
              <View style={{ flex: 2 }}>
                <Field label="Title">
                  <TouchableOpacity
                    style={s.selectBtn}
                    onPress={() => setShowTitleModal(true)}
                  >
                    <Text
                      style={[s.selectText, !tfnTitle && { color: '#9CA3AF' }]}
                    >
                      {tfnTitle || 'Mr/Ms'}
                    </Text>
                    <ChevronDown size={14} color="#94a3b8" />
                  </TouchableOpacity>
                </Field>
              </View>
              <View style={{ flex: 2 }}>
                <Field label="First name">
                  <StyledInput
                    value={tfnFirstName}
                    onChangeText={setTfnFirstName}
                    placeholder="Jane"
                  />
                </Field>
              </View>
              <View style={{ flex: 2 }}>
                <Field label="Surname">
                  <StyledInput
                    value={tfnSurname}
                    onChangeText={setTfnSurname}
                    placeholder="Smith"
                  />
                </Field>
              </View>
            </View>

            <View style={s.row2}>
              <View style={{ flex: 1 }}>
                <Field label="Previous name (if any)">
                  <StyledInput
                    value={tfnPrevName}
                    onChangeText={setTfnPrevName}
                    placeholder="—"
                  />
                </Field>
              </View>
              <View style={{ flex: 1 }}>
                <Field label="Date of birth">
                  <DateButton
                    value={tfnDob}
                    placeholder="dd/mm/yyyy"
                    onPress={() => openDatePicker('tfnDob')}
                  />
                </Field>
              </View>
            </View>

            <SectionLabel>Residential Address</SectionLabel>
            <Field label="Street address, suburb, state, postcode">
              <StyledInput
                value={tfnAddress}
                onChangeText={setTfnAddress}
                placeholder="Full address"
              />
            </Field>

            <SectionLabel>Employment</SectionLabel>
            <Field label="Basis of payment">
              <RadioGroup
                options={[
                  { label: 'Full-time', value: 'full-time' },
                  { label: 'Part-time', value: 'part-time' },
                  { label: 'Casual', value: 'casual' },
                ]}
                value={basisOfPayment}
                onChange={setBasisOfPayment}
              />
            </Field>

            <SectionLabel>Declarations</SectionLabel>
            <View style={s.row2}>
              <View style={{ flex: 1 }}>
                <Field label="Australian resident for tax?">
                  <YesNoGroup
                    value={australianResident}
                    onChange={setAustralianResident}
                  />
                </Field>
              </View>
              <View style={{ flex: 1 }}>
                <Field label="Claim tax-free threshold?">
                  <YesNoGroup value={claimTaxFree} onChange={setClaimTaxFree} />
                </Field>
              </View>
            </View>
            <Field label="HELP / VSL / FS / SSL / TSL debt?">
              <YesNoGroup value={hasDebt} onChange={setHasDebt} />
            </Field>

            <SectionLabel>Signature</SectionLabel>
            <View style={s.row2}>
              <View style={{ flex: 1 }}>
                <Field label="Employee signature">
                  <SignatureButton
                    value={signatureTfn}
                    onPress={() => openSignature('tfn')}
                    onClear={() => setSignatureTfn('')}
                  />
                </Field>
              </View>
              <View style={{ flex: 1 }}>
                <Field label="Date">
                  <DateButton
                    value={dateTfn}
                    placeholder="dd/mm/yyyy"
                    onPress={() => openDatePicker('dateTfn')}
                  />
                </Field>
              </View>
            </View>

            {/* Download PDF Button */}
            {isFormComplete(activeStaffTab) && (
              <TouchableOpacity
                style={s.downloadBtn}
                onPress={() => {
                  if (getFormUrl(activeStaffTab)) {
                    openPdf(getFormUrl(activeStaffTab));
                  } else {
                    // Auto generate if not exists
                    generateUploadAndOpenPdf('tfn');
                  }
                }}
              >
                <Download size={18} color="#fff" />
                <Text style={s.downloadBtnText}>
                  📄{' '}
                  {getFormUrl(activeStaffTab)
                    ? 'View Saved PDF'
                    : 'Generate & Download PDF'}
                </Text>
              </TouchableOpacity>
            )}

            <SaveButton
              label="Save TFN Declaration"
              loading={loading}
              onPress={handleSave}
            />
          </View>
        )}

        {/* ═══════════ SUPER TAB ═══════════ */}
        {activeStaffTab === 'super' && (
          <View style={s.card}>
            <SectionLabel>Employee Details</SectionLabel>
            <View style={s.row2}>
              <View style={{ flex: 1 }}>
                <Field label="Full name">
                  <AutoFilledInput
                    value={autoFullName}
                    placeholder="Synced from TFN form"
                  />
                </Field>
              </View>
              <View style={{ flex: 1 }}>
                <Field label="Employee number">
                  <StyledInput
                    value={superEmployeeNumber}
                    onChangeText={setSuperEmployeeNumber}
                    placeholder="Optional"
                  />
                </Field>
              </View>
            </View>

            <SectionLabel>Fund Choice</SectionLabel>
            <RadioGroup
              options={[
                { label: 'I nominate my own fund', value: 'own' },
                { label: 'Employer-nominated (default)', value: 'employer' },
              ]}
              value={fundChoice}
              onChange={(v: any) => setFundChoice(v)}
            />

            {fundChoice === 'own' ? (
              <View style={s.ownFundBox}>
                <View style={s.row2}>
                  <View style={{ flex: 1 }}>
                    <Field label="Fund name">
                      <StyledInput
                        value={superFundName}
                        onChangeText={setSuperFundName}
                        placeholder="e.g. AustralianSuper"
                      />
                    </Field>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Field label="Fund ABN">
                      <StyledInput
                        value={superFundAbn}
                        onChangeText={setSuperFundAbn}
                        placeholder="12 345 678 901"
                        keyboardType="numeric"
                      />
                    </Field>
                  </View>
                </View>
                <View style={s.row2}>
                  <View style={{ flex: 1 }}>
                    <Field label="Fund USI">
                      <StyledInput
                        value={superFundUsi}
                        onChangeText={setSuperFundUsi}
                        placeholder="USI code"
                      />
                    </Field>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Field label="Member number">
                      <StyledInput
                        value={superMemberNumber}
                        onChangeText={setSuperMemberNumber}
                        placeholder="Member no."
                      />
                    </Field>
                  </View>
                </View>
              </View>
            ) : (
              <View style={s.employerFundBox}>
                <Text style={s.employerFundTitle}>
                  Capital Services Pty Ltd
                </Text>
                <Text style={s.employerFundDesc}>
                  Default employer fund. Your contributions will be directed
                  here unless you nominate your own.
                </Text>
              </View>
            )}

            <SectionLabel>Signature</SectionLabel>
            <View style={s.row2}>
              <View style={{ flex: 1 }}>
                <Field label="Employee signature">
                  <SignatureButton
                    value={signatureSuper}
                    onPress={() => openSignature('super')}
                    onClear={() => setSignatureSuper('')}
                  />
                </Field>
              </View>
              <View style={{ flex: 1 }}>
                <Field label="Date">
                  <DateButton
                    value={dateSuper}
                    placeholder="dd/mm/yyyy"
                    onPress={() => openDatePicker('dateSuper')}
                  />
                </Field>
              </View>
            </View>

            {/* Download PDF Button */}
            {isFormComplete(activeStaffTab) && (
              <TouchableOpacity
                style={s.downloadBtn}
                onPress={() => {
                  if (getFormUrl(activeStaffTab)) {
                    openPdf(getFormUrl(activeStaffTab));
                  } else {
                    generateUploadAndOpenPdf('super_form');
                  }
                }}
              >
                <Download size={18} color="#fff" />
                <Text style={s.downloadBtnText}>
                  📄{' '}
                  {getFormUrl(activeStaffTab)
                    ? 'View Saved PDF'
                    : 'Generate & Download PDF'}
                </Text>
              </TouchableOpacity>
            )}

            <SaveButton
              label="Save Superannuation"
              loading={loading}
              onPress={handleSave}
            />
          </View>
        )}

        {/* ═══════════ ONBOARDING TAB ═══════════ */}
        {activeStaffTab === 'onboarding' && (
          <View style={s.card}>
            <SectionLabel>Personal Contact Details</SectionLabel>
            <Field label="Full name (as per ID)">
              <AutoFilledInput
                value={autoFullName}
                placeholder="Synced from TFN form"
              />
            </Field>

            <View style={s.row2}>
              <View style={{ flex: 1 }}>
                <Field label="Date of birth">
                  <AutoFilledInput
                    value={tfnDob}
                    placeholder="Synced from TFN form"
                  />
                </Field>
              </View>
              <View style={{ flex: 1 }}>
                <Field label="Residential address">
                  <AutoFilledInput
                    value={tfnAddress}
                    placeholder="Synced from TFN form"
                  />
                </Field>
              </View>
            </View>

            <View style={s.row2}>
              <View style={{ flex: 1 }}>
                <Field label="Mobile phone">
                  <StyledInput
                    value={onboardMobile}
                    onChangeText={setOnboardMobile}
                    placeholder="04xx xxx xxx"
                    keyboardType="phone-pad"
                  />
                </Field>
              </View>
              <View style={{ flex: 1 }}>
                <Field label="Personal email">
                  <StyledInput
                    value={onboardEmail}
                    onChangeText={setOnboardEmail}
                    placeholder="jane@email.com"
                    keyboardType="email-address"
                  />
                </Field>
              </View>
            </View>

            <SectionLabel>Passport & Work Rights</SectionLabel>
            <View style={s.row3}>
              <View style={{ flex: 1 }}>
                <Field label="Passport no.">
                  <StyledInput
                    value={passportNumber}
                    onChangeText={setPassportNumber}
                    placeholder="PA1234567"
                  />
                </Field>
              </View>
              <View style={{ flex: 1 }}>
                <Field label="Country">
                  <StyledInput
                    value={passportCountry}
                    onChangeText={setPassportCountry}
                    placeholder="Australia"
                  />
                </Field>
              </View>
            </View>
            <View style={{ flex: 2 }}>
              <Field label="Expiry">
                <DateButton
                  value={passportExpiry}
                  placeholder="dd/mm/yyyy"
                  onPress={() => openDatePicker('passportExp')}
                />
              </Field>
            </View>

            <Field label="Work rights status">
              <RadioGroup
                options={[
                  { label: 'Australian Citizen / PR', value: 'citizen' },
                  { label: 'Student Visa (24hr cap)', value: 'student' },
                  { label: 'Other visa', value: 'other' },
                ]}
                value={workRights}
                onChange={setWorkRights}
              />
            </Field>

            <SectionLabel>100-Point ID Check</SectionLabel>
            <View style={s.idTable}>
              <View style={s.idHeader}>
                <Text style={[s.idHeaderText, { flex: 1 }]}>Document</Text>
                <Text style={s.idHeaderText}>Pts</Text>
                <Text
                  style={[
                    s.idHeaderText,
                    { marginLeft: 12, width: 56, textAlign: 'center' },
                  ]}
                >
                  ✓
                </Text>
              </View>
              {(
                [
                  {
                    key: 'primary_id',
                    label: 'Birth cert / Passport / Citizenship',
                    points: 70,
                  },
                  {
                    key: 'drivers_license',
                    label: "Driver's licence / Govt photo ID",
                    points: 40,
                  },
                  {
                    key: 'security_license',
                    label: 'Security licence (mandatory)',
                    points: 40,
                  },
                  {
                    key: 'medicare_or_utility',
                    label: 'Medicare / Utility bill / Bank stmt',
                    points: 25,
                  },
                ] as {
                  key: keyof typeof idChecks;
                  label: string;
                  points: number;
                }[]
              ).map(item => (
                <View key={item.key} style={s.idRow}>
                  <Text style={[s.idLabel, { flex: 1 }]}>{item.label}</Text>
                  <View style={s.idPts}>
                    <Text style={s.idPtsText}>{item.points}</Text>
                  </View>
                  <TouchableOpacity
                    style={[s.checkbox, idChecks[item.key] && s.checkboxOn]}
                    onPress={() =>
                      setIdChecks(p => ({ ...p, [item.key]: !p[item.key] }))
                    }
                  >
                    {idChecks[item.key] && (
                      <Check size={12} color="#fff" strokeWidth={3} />
                    )}
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            <SectionLabel>Banking, Tax & Superannuation</SectionLabel>
            <View style={s.row3}>
              <View style={{ flex: 1.2 }}>
                <Field label="Bank name">
                  <StyledInput
                    value={bankName}
                    onChangeText={setBankName}
                    placeholder="Commonwealth Bank"
                  />
                </Field>
              </View>
              <View style={{ flex: 1 }}>
                <Field label="BSB">
                  <StyledInput
                    value={bsb}
                    onChangeText={setBsb}
                    placeholder="062-000"
                    keyboardType="numeric"
                  />
                </Field>
              </View>
              <View style={{ flex: 1 }}>
                <Field label="Account no.">
                  <StyledInput
                    value={accountNumber}
                    onChangeText={setAccountNumber}
                    placeholder="12345678"
                    keyboardType="numeric"
                  />
                </Field>
              </View>
            </View>

            <View style={s.row2}>
              <View style={{ flex: 1 }}>
                <Field label="TFN">
                  <AutoFilledInput
                    value={tfnNumber}
                    placeholder="Synced from TFN form"
                  />
                </Field>
              </View>
              <View style={{ flex: 1 }}>
                <Field label="Super fund name">
                  <AutoFilledInput
                    value={superFundName}
                    placeholder="Synced from Super form"
                  />
                </Field>
              </View>
            </View>
            <View style={s.row2}>
              <View style={{ flex: 1 }}>
                <Field label="Super USI">
                  <AutoFilledInput
                    value={superFundUsi}
                    placeholder="Synced from Super form"
                  />
                </Field>
              </View>
              <View style={{ flex: 1 }}>
                <Field label="Member number">
                  <AutoFilledInput
                    value={superMemberNumber}
                    placeholder="Synced from Super form"
                  />
                </Field>
              </View>
            </View>

            <SectionLabel>Professional Licensing</SectionLabel>
            <View style={s.row2}>
              <View style={{ flex: 1 }}>
                <Field label="Security licence no.">
                  <StyledInput
                    value={securityLicence}
                    onChangeText={setSecurityLicence}
                    placeholder="VIC 123456"
                  />
                </Field>
              </View>
              <View style={{ flex: 1 }}>
                <Field label="Licence expiry">
                  <DateButton
                    value={securityExpiry}
                    placeholder="dd/mm/yyyy"
                    onPress={() => openDatePicker('secExp')}
                  />
                </Field>
              </View>
            </View>
            <View style={s.row2}>
              <View style={{ flex: 1 }}>
                <Field label="First aid cert no.">
                  <StyledInput
                    value={firstAidNumber}
                    onChangeText={setFirstAidNumber}
                    placeholder="FA-001234"
                  />
                </Field>
              </View>
              <View style={{ flex: 1 }}>
                <Field label="First aid expiry">
                  <DateButton
                    value={firstAidExpiry}
                    placeholder="dd/mm/yyyy"
                    onPress={() => openDatePicker('faExp')}
                  />
                </Field>
              </View>
            </View>

            <SectionLabel>Declaration & Signature</SectionLabel>
            <View style={s.row2}>
              <View style={{ flex: 1 }}>
                <Field label="Employee signature">
                  <SignatureButton
                    value={signatureOnboard}
                    onPress={() => openSignature('onboard')}
                    onClear={() => setSignatureOnboard('')}
                  />
                </Field>
              </View>
              <View style={{ flex: 1 }}>
                <Field label="Date">
                  <DateButton
                    value={dateOnboard}
                    placeholder="dd/mm/yyyy"
                    onPress={() => openDatePicker('dateOnboard')}
                  />
                </Field>
              </View>
            </View>

            {/* Download PDF Button */}
            {isFormComplete(activeStaffTab) && (
              <TouchableOpacity
                style={s.downloadBtn}
                onPress={() => {
                  if (getFormUrl(activeStaffTab)) {
                    openPdf(getFormUrl(activeStaffTab));
                  } else {
                    generateUploadAndOpenPdf('onboarding');
                  }
                }}
              >
                <Download size={18} color="#fff" />
                <Text style={s.downloadBtnText}>
                  📄{' '}
                  {getFormUrl(activeStaffTab)
                    ? 'View Saved PDF'
                    : 'Generate & Download PDF'}
                </Text>
              </TouchableOpacity>
            )}

            <SaveButton
              label="Save Onboarding Form"
              loading={loading}
              onPress={handleSave}
            />
          </View>
        )}
      </ScrollView>

      {/* ── Date Picker ── */}
      {showDatePicker && (
        <DateTimePicker
          value={new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateChange}
        />
      )}

      {/* ── Signature Modal ── */}
      <Modal visible={showSignatureModal} animationType="slide">
        <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
          <View style={s.sigModalHeader}>
            <TouchableOpacity
              onPress={() => setShowSignatureModal(false)}
              style={s.sigCancelBtn}
            >
              <X size={18} color="#ef4444" />
              <Text style={s.sigCancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={s.sigModalTitle}>Draw Signature</Text>
            <View style={{ width: 80 }} />
          </View>
          <View style={s.sigHint}>
            <Text style={s.sigHintText}>
              Use your finger to draw your signature in the area below
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <SignatureScreen
              onOK={sig => handleSaveSignature(sig)}
              onEmpty={() =>
                Toast.show({ type: 'error', text1: 'Please draw a signature' })
              }
              autoClear={false}
              descriptionText=""
              clearText="Clear"
              confirmText="Save Signature"
              webStyle={`
                * { box-sizing: border-box; }
                html, body { width: 100%; height: 100%; margin: 0; padding: 0; overflow: hidden; background: #fafafa; }
                .m-signature-pad { position: absolute; inset: 0; box-shadow: none; border: none; background: #fafafa; }
                .m-signature-pad--body { position: absolute; top: 12px; left: 12px; right: 12px; bottom: 70px;
                  border: 2px dashed #CBD5E1; border-radius: 12px; background: #fff; }
                canvas { width: 100% !important; height: 100% !important; border-radius: 12px; }
                .m-signature-pad--footer { position: absolute; bottom: 0; left: 0; right: 0; height: 70px;
                  display: flex; justify-content: space-between; align-items: center;
                  padding: 10px 16px; background: #fff; border-top: 1px solid #e2e8f0; }
                .m-signature-pad--footer .button { border-radius: 10px; font-size: 15px;
                  font-weight: 600; cursor: pointer; border: none; }
                .m-signature-pad--footer .button.clear { background: #fef2f2; color: #ef4444; }
                .m-signature-pad--footer .button.save  { background: #2EB1E2; color: #fff;    }
              `}
            />
          </View>
        </SafeAreaView>
      </Modal>

      {/* ── Title Modal ── */}
      <Modal visible={showTitleModal} transparent animationType="fade">
        <TouchableOpacity
          style={s.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowTitleModal(false)}
        >
          <View style={s.modalSheet}>
            <View style={s.modalHandle} />
            <Text style={s.modalSheetTitle}>Select Title</Text>
            {titleOptions.map(t => (
              <TouchableOpacity
                key={t}
                style={[s.modalOption, tfnTitle === t && s.modalOptionActive]}
                onPress={() => {
                  setTfnTitle(t);
                  setShowTitleModal(false);
                }}
              >
                <Text
                  style={[
                    s.modalOptionText,
                    tfnTitle === t && s.modalOptionTextActive,
                  ]}
                >
                  {t}
                </Text>
                {tfnTitle === t && <Check size={16} color={BRAND_DARK} />}
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={s.modalCancelBtn}
              onPress={() => setShowTitleModal(false)}
            >
              <Text style={s.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

// ══════════════════ Sub-components ══════════════════

const SectionLabel = ({ children }: { children: string }) => (
  <View style={s.sectionLabelWrap}>
    <Text style={s.sectionLabelText}>{children}</Text>
  </View>
);

const Field = ({
  label,
  badge,
  children,
}: {
  label: string;
  badge?: string;
  children: React.ReactNode;
}) => (
  <View style={s.fieldWrap}>
    <View style={s.fieldLabelRow}>
      <Text style={s.fieldLabel}>{label}</Text>
      {badge && (
        <View style={s.fieldBadge}>
          <Text style={s.fieldBadgeText}>{badge}</Text>
        </View>
      )}
    </View>
    {children}
  </View>
);

const StyledInput = ({
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  maxLength,
  editable = true,
}: any) => (
  <TextInput
    style={s.textInput}
    value={value}
    onChangeText={onChangeText}
    placeholder={placeholder}
    placeholderTextColor="#9CA3AF"
    keyboardType={keyboardType}
    maxLength={maxLength}
    editable={editable}
  />
);

const AutoFilledInput = ({
  value,
  placeholder,
}: {
  value: string;
  placeholder: string;
}) => (
  <View style={[s.textInput, s.autoInput]}>
    <Text
      style={[s.autoText, !value && { color: '#9CA3AF' }]}
      numberOfLines={1}
    >
      {value || placeholder}
    </Text>
  </View>
);

const DateButton = ({
  value,
  placeholder,
  onPress,
}: {
  value: string;
  placeholder: string;
  onPress: () => void;
}) => (
  <TouchableOpacity
    style={[s.textInput, s.dateBtn]}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <Text style={[s.dateBtnText, !value && { color: '#9CA3AF' }]}>
      {value || placeholder}
    </Text>
    <Text style={s.dateIcon}>📅</Text>
  </TouchableOpacity>
);

const SignatureButton = ({
  value,
  onPress,
  onClear,
}: {
  value: string;
  onPress: () => void;
  onClear: () => void;
}) => (
  <View>
    <TouchableOpacity
      style={[s.sigBtn, value && s.sigBtnSigned]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {value ? (
        <>
          <Text style={s.sigBtnSignedText}>
            Signature added · tap to change
          </Text>
        </>
      ) : (
        <>
          <Text style={s.sigBtnIcon}>✍️</Text>
          <Text style={s.sigBtnText}>Tap to draw signature</Text>
        </>
      )}
    </TouchableOpacity>
    {value && (
      <TouchableOpacity style={s.sigClear} onPress={onClear}>
        <Text style={s.sigClearText}>Clear signature</Text>
      </TouchableOpacity>
    )}
  </View>
);

const RadioGroup = ({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: string }[];
  value: string | null;
  onChange: (v: string) => void;
}) => (
  <View style={s.radioGroup}>
    {options.map(opt => (
      <TouchableOpacity
        key={opt.value}
        style={s.radioOpt}
        onPress={() => onChange(opt.value)}
        activeOpacity={0.7}
      >
        <View style={[s.radioCircle, value === opt.value && s.radioCircleOn]}>
          {value === opt.value && <View style={s.radioDot} />}
        </View>
        <Text style={[s.radioLabel, value === opt.value && s.radioLabelOn]}>
          {opt.label}
        </Text>
      </TouchableOpacity>
    ))}
  </View>
);

const YesNoGroup = ({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (v: string) => void;
}) => (
  <View style={s.yesNoRow}>
    {(['yes', 'no'] as const).map(v => (
      <TouchableOpacity
        key={v}
        style={[s.yesNoBtn, value === v && s.yesNoBtnOn]}
        onPress={() => onChange(v)}
        activeOpacity={0.8}
      >
        <Text style={[s.yesNoText, value === v && s.yesNoTextOn]}>
          {v === 'yes' ? 'Yes' : 'No'}
        </Text>
      </TouchableOpacity>
    ))}
  </View>
);

const SaveButton = ({
  label,
  loading,
  onPress,
}: {
  label: string;
  loading: boolean;
  onPress: () => void;
}) => (
  <View style={s.saveRow}>
    <TouchableOpacity
      style={[s.saveBtn, loading && { opacity: 0.6 }]}
      onPress={onPress}
      disabled={loading}
      activeOpacity={0.85}
    >
      {loading ? (
        <ActivityIndicator color="#fff" size="small" />
      ) : (
        <>
          <Send size={14} color="#fff" />
          <Text style={s.saveBtnText}>{label}</Text>
        </>
      )}
    </TouchableOpacity>
  </View>
);

// ══════════════════ Styles ══════════════════
const s = StyleSheet.create({
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: { fontSize: 14, color: '#64748b' },

  tabDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: BRAND },

  emptyState: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    marginTop: 12,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: BRAND_LIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 6,
  },
  emptyDesc: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
  },
  downloadBtn: {
    backgroundColor: '#10b981',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 16,
  },
  downloadBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  emptySteps: { gap: 10, width: '100%' },
  emptyStep: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  emptyStepNum: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: BRAND_LIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyStepNumText: { fontSize: 12, fontWeight: '700', color: BRAND_DARK },
  emptyStepLabel: { fontSize: 13, color: '#334155', fontWeight: '500' },

  sectionLabelWrap: {
    borderBottomWidth: 1,
    borderBottomColor: '#e9f4fb',
    marginTop: 14,
    marginBottom: 12,
    paddingBottom: 6,
  },
  sectionLabelText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: BRAND_DARK,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
  },
  fieldWrap: { marginBottom: 14 },
  fieldLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: '#475569' },
  fieldBadge: {
    backgroundColor: '#f0fdf4',
    borderRadius: 20,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  fieldBadgeText: { fontSize: 9.5, color: SUCCESS, fontWeight: '600' },

  autoInput: {
    // backgroundColor: AUTO_BG,
    // borderColor: AUTO_BORDER,
    justifyContent: 'center',
  },
  autoText: { fontSize: 14, color: '#166534', fontWeight: '500' },
  dateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateBtnText: { fontSize: 14, color: '#1e293b' },
  dateIcon: { fontSize: 15 },
  selectBtn: {
    height: 44,
    borderWidth: 1,
    borderColor: '#d1e8f5',
    borderRadius: 10,
    paddingHorizontal: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
  },
  selectText: { fontSize: 14, color: '#1e293b', flex: 1 },
  row2: { flexDirection: 'row', gap: 10 },
  row3: { flexDirection: 'row', gap: 8 },
  sigBtn: {
    height: 52,
    borderWidth: 1.5,
    borderColor: '#d1e8f5',
    borderStyle: 'dashed',
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fafcff',
  },
  sigBtnSigned: {
    borderStyle: 'solid',
    // backgroundColor: AUTO_BG,
    // borderColor: AUTO_BORDER,
  },
  sigBtnText: { fontSize: 13, color: '#94a3b8', fontWeight: '500' },
  sigBtnIcon: { fontSize: 16 },
  sigBtnSignedText: {
    fontSize: 12,
    color: SUCCESS,
    fontWeight: '600',
    paddingLeft: 5,
  },
  sigClear: { marginTop: 4, alignItems: 'flex-end' },
  sigClearText: { fontSize: 11, color: '#ef4444', fontWeight: '600' },
  radioGroup: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  radioOpt: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioCircleOn: { borderColor: BRAND },
  radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: BRAND },
  radioLabel: { fontSize: 13, color: '#475569' },
  radioLabelOn: { color: BRAND_DARK, fontWeight: '600' },
  yesNoRow: { flexDirection: 'row', gap: 8 },
  yesNoBtn: {
    flex: 1,
    height: 38,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  yesNoBtnOn: { backgroundColor: BRAND_LIGHT, borderColor: BRAND },
  yesNoText: { fontSize: 13, color: '#64748b', fontWeight: '600' },
  yesNoTextOn: { color: BRAND_DARK },
  idTable: {
    borderWidth: 1,
    borderColor: '#e2eef6',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  idHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f7fc',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e2eef6',
  },
  idHeaderText: { fontSize: 11, fontWeight: '700', color: '#64748b' },
  idRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  idLabel: { fontSize: 12.5, color: '#334155', lineHeight: 17 },
  idPts: {
    backgroundColor: '#f0f7ff',
    borderRadius: 12,
    paddingHorizontal: 7,
    paddingVertical: 2,
    marginHorizontal: 8,
  },
  idPtsText: { fontSize: 11, fontWeight: '700', color: BRAND_DARK },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxOn: { backgroundColor: BRAND, borderColor: BRAND },
  ownFundBox: {
    backgroundColor: '#fafcff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#d1e8f5',
    marginBottom: 12,
  },
  employerFundBox: {
    backgroundColor: '#f8faff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2eef6',
    marginBottom: 16,
  },
  employerFundTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  employerFundDesc: { fontSize: 12, color: '#64748b', lineHeight: 17 },
  saveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 20,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#e9f4fb',
  },

  saveBtnText: { color: '#fff', fontSize: 13.5, fontWeight: '700' },
  sigModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  sigCancelBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  sigCancelText: { color: '#ef4444', fontSize: 15, fontWeight: '600' },
  sigModalTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  sigHint: {
    backgroundColor: '#f8faff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  sigHintText: { fontSize: 12, color: '#64748b', textAlign: 'center' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 16,
    paddingBottom: 32,
  },
  modalHandle: {
    width: 36,
    height: 4,
    backgroundColor: '#e2e8f0',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 14,
  },
  modalSheetTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 10,
    textAlign: 'center',
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 4,
  },
  modalOptionActive: { backgroundColor: BRAND_LIGHT },
  modalOptionText: { fontSize: 15, color: '#334155' },
  modalOptionTextActive: { color: BRAND_DARK, fontWeight: '700' },
  modalCancelBtn: {
    marginTop: 8,
    padding: 14,
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
  },
  modalCancelText: { color: '#475569', fontWeight: '600', fontSize: 14 },
  container: { flex: 1, backgroundColor: '#dfe6f9' },
  header: {
    // backgroundColor: BRAND,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,

    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#0A7C6E',

    marginHorizontal: 16,
    borderRadius: 16,
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  backBtn: { padding: 4 },

  tabBar: {
    flexDirection: 'row',
    // backgroundColor: '#fff',
    padding: 8,
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    marginRight: 12,
    marginLeft: 12,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
  },
  tabBtnActive: {
    backgroundColor: BRAND,
    shadowColor: BRAND,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 4,
  },
  tabLabelActive: { color: '#fff' },

  scroll: { padding: 16, paddingBottom: 100 },

  card: {
    backgroundColor: CARD_BG,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 8,
  },

  // Add more refined styles for inputs, buttons, etc.
  textInput: {
    height: 48,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    backgroundColor: '#fff',
  },

  saveBtn: {
    backgroundColor: BRAND,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    shadowColor: BRAND,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
    padding: 10,
  },
});

export default StaffFormsScreen;
